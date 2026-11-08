// OpenID Connect sign-in for a browser app: Authorization Code + PKCE
// (RFC 7636) with state (RFC 6749 §10.12), against Okta or the dev issuer
// (daml-escrow-commons devoidc). No client secret: the code_verifier never
// leaves the browser, only its S256 hash goes in the authorize redirect.
//
// Shared by the escrow portal and the operator console (daml-escrow PLAN.md
// Phase 104). What each app keeps for itself -- which scopes to ask for, its
// session store, roles, signing sessions -- stays in the app.
//
//   const url = await startAuthorization({ issuer, clientId, scope, redirectUri });
//   window.location.href = url;
//   // …on /callback:
//   if (!validateState(params.get('state'))) throw …;
//   const { accessToken, expiresIn } = await exchangeCode(params.get('code')!, { redirectUri });
//
// Display only: tokenScopes and tokenExpirySeconds read a token without
// verifying it. Servers enforce from the verified token, never from these.

// sessionStorage keys, unchanged from the escrow portal so a sign-in already
// under way when an app moves onto this module still completes.
export const PKCE_KEYS = {
    verifier: 'pkce_code_verifier',
    state: 'pkce_state',
    issuer: 'pkce_issuer',
    clientId: 'pkce_client_id',
} as const;

export interface AuthorizationRequest {
    /** The issuer's base URL (Okta authorization server, or dev-oidc). */
    issuer: string;
    clientId: string;
    /** Space-separated scopes. */
    scope: string;
    /** Where the issuer returns the code; registered with the client. */
    redirectUri: string;
    /** More authorize parameters: login_hint, idp, acr_values, max_age… */
    extra?: Record<string, string>;
    /** Okta's path; override for another issuer. */
    authorizePath?: string;
}

/** Base64url without padding. */
export function base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A fresh PKCE code_verifier (32 random bytes, base64url). */
export function generateCodeVerifier(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
}

/** The S256 code_challenge for verifier. */
export async function codeChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Prepares a sign-in: stores a new verifier, state, issuer and client in
 * sessionStorage and returns the issuer's authorize URL to send the browser
 * to. The caller navigates (so it can stash its own state first).
 */
export async function startAuthorization(req: AuthorizationRequest): Promise<string> {
    const verifier = generateCodeVerifier();
    const challenge = await codeChallenge(verifier);
    const state = crypto.randomUUID();
    sessionStorage.setItem(PKCE_KEYS.verifier, verifier);
    sessionStorage.setItem(PKCE_KEYS.state, state);
    sessionStorage.setItem(PKCE_KEYS.issuer, req.issuer);
    sessionStorage.setItem(PKCE_KEYS.clientId, req.clientId);
    const params = new URLSearchParams({
        client_id: req.clientId,
        response_type: 'code',
        scope: req.scope,
        redirect_uri: req.redirectUri,
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        ...(req.extra ?? {}),
    });
    return `${req.issuer}${req.authorizePath ?? '/v1/authorize'}?${params.toString()}`;
}

/**
 * Checks the callback's state against the one stored at sign-in. One use:
 * the stored state is removed whether it matches or not. Call it, and stop
 * unless it returns true, before exchanging the code.
 */
export function validateState(returned: string | null): boolean {
    const expected = sessionStorage.getItem(PKCE_KEYS.state);
    sessionStorage.removeItem(PKCE_KEYS.state);
    return !!expected && !!returned && expected === returned;
}

export interface TokenResponse {
    accessToken: string;
    /** Seconds; defaultExpiresIn when the issuer didn't say. */
    expiresIn: number;
    /** Granted scopes, when the issuer says. */
    scope?: string;
}

export interface ExchangeOptions {
    /** The same redirect_uri the authorization used. */
    redirectUri: string;
    tokenPath?: string;
    defaultExpiresIn?: number;
    fetchImpl?: typeof fetch;
}

/**
 * Trades the authorization code and the stored verifier for an access token
 * at the issuer's token endpoint. The stored verifier, issuer and client are
 * removed first: a code is tried once.
 */
export async function exchangeCode(code: string, opts: ExchangeOptions): Promise<TokenResponse> {
    const verifier = sessionStorage.getItem(PKCE_KEYS.verifier);
    const issuer = sessionStorage.getItem(PKCE_KEYS.issuer);
    const clientId = sessionStorage.getItem(PKCE_KEYS.clientId);
    sessionStorage.removeItem(PKCE_KEYS.verifier);
    sessionStorage.removeItem(PKCE_KEYS.issuer);
    sessionStorage.removeItem(PKCE_KEYS.clientId);
    if (!verifier || !issuer || !clientId) {
        throw new Error('Missing PKCE state: sign in again');
    }
    const response = await (opts.fetchImpl ?? fetch)(`${issuer}${opts.tokenPath ?? '/v1/token'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: opts.redirectUri,
            client_id: clientId,
            code_verifier: verifier,
        }),
    });
    if (!response.ok) {
        throw new Error('Token exchange failed');
    }
    const data = await response.json();
    return {
        accessToken: data.access_token,
        expiresIn: Number(data.expires_in) || (opts.defaultExpiresIn ?? 600),
        scope: typeof data.scope === 'string' ? data.scope : undefined,
    };
}

/** A JWT's payload, unverified; undefined when it isn't one. */
export function tokenClaims(token: string | null | undefined): Record<string, unknown> | undefined {
    try {
        const part = (token ?? '').split('.')[1];
        if (!part) return undefined;
        const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
        const claims = JSON.parse(json);
        return claims && typeof claims === 'object' ? claims : undefined;
    } catch {
        return undefined;
    }
}

/** A token's scopes (Okta's `scp` array, or a `scope` string). Display only. */
export function tokenScopes(token: string | null | undefined): string[] {
    const claims = tokenClaims(token);
    const scp = claims?.scp ?? claims?.scope;
    if (Array.isArray(scp)) return scp.filter((s: unknown): s is string => typeof s === 'string');
    if (typeof scp === 'string') return scp.split(/\s+/).filter(Boolean);
    return [];
}

/** Seconds until the token's exp (0 once past), or undefined without one. */
export function tokenExpirySeconds(token: string | null | undefined, now = Date.now()): number | undefined {
    const exp = tokenClaims(token)?.exp;
    return typeof exp === 'number' ? Math.max(0, Math.floor(exp - now / 1000)) : undefined;
}
