// @vitest-environment happy-dom
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    PKCE_KEYS,
    base64UrlEncode,
    codeChallenge,
    exchangeCode,
    startAuthorization,
    tokenClaims,
    tokenExpirySeconds,
    tokenScopes,
    validateState,
} from '../src/sdk/oidc-pkce';

const b64url = (o: unknown) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(o)));
const jwt = (claims: unknown) => `${b64url({ alg: 'RS256' })}.${b64url(claims)}.sig`;

beforeEach(() => sessionStorage.clear());

describe('PKCE', () => {
    it('S256 is base64url(SHA-256(verifier)), as the issuer computes it', async () => {
        for (const v of ['dBjftJeZ4CVP-mJ92K9xmW8nQVWRXdG6Sx0QQ1A6bOU', 'verifier-1', 'x'.repeat(128)]) {
            expect(await codeChallenge(v)).toBe(createHash('sha256').update(v).digest('base64url'));
        }
    });

    it('startAuthorization stores verifier, state, issuer and client and builds the authorize URL', async () => {
        const url = new URL(await startAuthorization({
            issuer: 'http://localhost:8095', clientId: 'operator-console-dev', scope: 'openid platform:admin',
            redirectUri: 'http://localhost:4323/callback', extra: { login_hint: 'op@platform.devlocal' },
        }));
        expect(url.origin + url.pathname).toBe('http://localhost:8095/v1/authorize');
        const p = url.searchParams;
        expect(p.get('response_type')).toBe('code');
        expect(p.get('client_id')).toBe('operator-console-dev');
        expect(p.get('scope')).toBe('openid platform:admin');
        expect(p.get('login_hint')).toBe('op@platform.devlocal');
        expect(p.get('code_challenge_method')).toBe('S256');
        expect(p.get('state')).toBe(sessionStorage.getItem(PKCE_KEYS.state));
        expect(p.get('code_challenge')).toBe(await codeChallenge(sessionStorage.getItem(PKCE_KEYS.verifier)!));
        expect(sessionStorage.getItem(PKCE_KEYS.issuer)).toBe('http://localhost:8095');
        expect(sessionStorage.getItem(PKCE_KEYS.clientId)).toBe('operator-console-dev');
    });

    it('validateState is one use and refuses a mismatch or nothing', () => {
        sessionStorage.setItem(PKCE_KEYS.state, 's1');
        expect(validateState('s1')).toBe(true);
        expect(validateState('s1')).toBe(false);
        sessionStorage.setItem(PKCE_KEYS.state, 's2');
        expect(validateState('forged')).toBe(false);
        expect(sessionStorage.getItem(PKCE_KEYS.state)).toBeNull();
        expect(validateState(null)).toBe(false);
    });
});

describe('exchangeCode', () => {
    const stash = () => {
        sessionStorage.setItem(PKCE_KEYS.verifier, 'v1');
        sessionStorage.setItem(PKCE_KEYS.issuer, 'http://issuer.test');
        sessionStorage.setItem(PKCE_KEYS.clientId, 'c1');
    };

    it('posts the code with the verifier and returns the token', async () => {
        stash();
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600, scope: 'openid' })));
        const out = await exchangeCode('code1', { redirectUri: 'http://app.test/callback', fetchImpl });
        expect(out).toEqual({ accessToken: 'tok', expiresIn: 3600, scope: 'openid' });
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('http://issuer.test/v1/token');
        const body = new URLSearchParams(init.body as URLSearchParams);
        expect(Object.fromEntries(body)).toEqual({
            grant_type: 'authorization_code', code: 'code1', redirect_uri: 'http://app.test/callback', client_id: 'c1', code_verifier: 'v1',
        });
        expect(sessionStorage.getItem(PKCE_KEYS.verifier)).toBeNull();
    });

    it('defaults the lifetime and is tried once', async () => {
        stash();
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ access_token: 'tok' })));
        expect((await exchangeCode('c', { redirectUri: 'r', fetchImpl, defaultExpiresIn: 900 })).expiresIn).toBe(900);
        await expect(exchangeCode('c', { redirectUri: 'r', fetchImpl })).rejects.toThrow(/sign in again/);
    });

    it('refuses an issuer error', async () => {
        stash();
        const fetchImpl = vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 }));
        await expect(exchangeCode('c', { redirectUri: 'r', fetchImpl })).rejects.toThrow('Token exchange failed');
        expect(sessionStorage.getItem(PKCE_KEYS.verifier)).toBeNull();
    });
});

describe('token reading (display only)', () => {
    it('reads scp arrays and scope strings', () => {
        expect(tokenScopes(jwt({ scp: ['openid', 'platform:admin', 7] }))).toEqual(['openid', 'platform:admin']);
        expect(tokenScopes(jwt({ scope: 'a  b' }))).toEqual(['a', 'b']);
        expect(tokenScopes('not-a-jwt')).toEqual([]);
        expect(tokenScopes(undefined)).toEqual([]);
    });

    it('reads expiry', () => {
        const now = 1_800_000_000_000;
        expect(tokenExpirySeconds(jwt({ exp: now / 1000 + 90 }), now)).toBe(90);
        expect(tokenExpirySeconds(jwt({ exp: now / 1000 - 5 }), now)).toBe(0);
        expect(tokenExpirySeconds(jwt({}), now)).toBeUndefined();
        expect(tokenClaims('a.%%%.c')).toBeUndefined();
    });
});
