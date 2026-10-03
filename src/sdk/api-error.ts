// The platform's canonical API error -- the TypeScript mirror of
// daml-escrow-commons `apierror` (Go). Same envelope, same canonical JSON
// bytes, same Canton classification: test/fixtures/api-error holds copies
// of the Go package's golden fixtures, and this module is tested against
// them (scripts/sync-api-error-fixtures.sh re-syncs them).
//
//   {"error":"human message","code":"LEDGER_SIGNATURE_REJECTED","status":422,
//    "stage":"execute","hint":"what to do next","requestId":"…",
//    "upstream":{"service":"canton","status":400,"code":"…","grpcCode":"…","cause":"…","traceId":"…","node":"…"},
//    "details":{…full values…}}
//
// Long ids are shortened (shortId) in error, hint and logs; full values
// live in details. Two detail levels: 'full', and 'summary' (no details,
// no upstream cause). Use fromCantonError when the UI talks to a Canton
// participant or wallet gateway directly, so those refusals look exactly
// like ones relayed through a platform service.

import { shortCantonId, isFingerprint } from './canton-id';

export type ApiErrorDetail = 'full' | 'summary';

export interface ApiErrorUpstream {
    service: string;
    status?: number;
    code?: string;
    grpcCode?: string;
    cause?: string;
    traceId?: string;
    node?: string;
}

export interface ApiError {
    /** Human-readable message. */
    error: string;
    /** Stable machine-readable reason, UPPER_SNAKE_CASE. */
    code: string;
    status?: number;
    stage?: string;
    hint?: string;
    requestId?: string;
    upstream?: ApiErrorUpstream;
    /** Full values behind shortened ids; shape per code (e.g. SigningDetails). */
    details?: Record<string, unknown>;
}

/** Canton signing/authorization details (apierror/canton.SigningDetails). */
export interface SigningDetails {
    party?: string;
    partyFingerprint?: string;
    publicKeyFingerprint?: string;
    signatureReceived?: string;
    signedBy?: string;
    signedMessage?: string;
    expectedHash?: string;
    actAs?: string[];
    ledgerUser?: string;
}

export const MAX_CAUSE = 600;

export const ApiErrorCodes = {
    INVALID_REQUEST: 'INVALID_REQUEST',
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    UNPROCESSABLE: 'UNPROCESSABLE',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL: 'INTERNAL',
    NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
    UPSTREAM_ERROR: 'UPSTREAM_ERROR',
    UNAVAILABLE: 'UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',
} as const;

export const CantonCodes = {
    LEDGER_PERMISSION_DENIED: 'LEDGER_PERMISSION_DENIED',
    LEDGER_UNAUTHENTICATED: 'LEDGER_UNAUTHENTICATED',
    LEDGER_SIGNATURE_REJECTED: 'LEDGER_SIGNATURE_REJECTED',
    LEDGER_INVALID_ARGUMENT: 'LEDGER_INVALID_ARGUMENT',
    LEDGER_NOT_FOUND: 'LEDGER_NOT_FOUND',
    LEDGER_CONFLICT: 'LEDGER_CONFLICT',
    LEDGER_REJECTED: 'LEDGER_REJECTED',
    LEDGER_UNAVAILABLE: 'LEDGER_UNAVAILABLE',
    LEDGER_UNREACHABLE: 'LEDGER_UNREACHABLE',
    KEY_DOES_NOT_CONTROL_PARTY: 'KEY_DOES_NOT_CONTROL_PARTY',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    INVALID_PUBLIC_KEY: 'INVALID_PUBLIC_KEY',
} as const;

/** The generic code for an HTTP status (Go: CodeForStatus). */
export function codeForStatus(status: number): string {
    switch (status) {
        case 400: return ApiErrorCodes.INVALID_REQUEST;
        case 401: return ApiErrorCodes.UNAUTHENTICATED;
        case 403: return ApiErrorCodes.FORBIDDEN;
        case 404: return ApiErrorCodes.NOT_FOUND;
        case 409: return ApiErrorCodes.CONFLICT;
        case 422: return ApiErrorCodes.UNPROCESSABLE;
        case 429: return ApiErrorCodes.RATE_LIMITED;
        case 501: return ApiErrorCodes.NOT_IMPLEMENTED;
        case 502: return ApiErrorCodes.UPSTREAM_ERROR;
        case 503: return ApiErrorCodes.UNAVAILABLE;
        case 504: return ApiErrorCodes.TIMEOUT;
    }
    return status >= 400 && status < 500 ? ApiErrorCodes.INVALID_REQUEST : ApiErrorCodes.INTERNAL;
}

export function isValidCode(code: string): boolean {
    return /^[A-Z][A-Z0-9_]*$/.test(code);
}

// ---- short ids ------------------------------------------------------------

/**
 * The one short form for long ids in messages, hints and logs
 * (sdk/canton-id shortCantonId; Go: apierror.ShortID / cantonid.Short).
 */
export function shortId(s: string): string {
    return shortCantonId(s);
}

export function shortIds(ids: string[]): string[] {
    return ids.map(shortId);
}

// ---- canonical JSON -------------------------------------------------------

// Go's string encoding (SetEscapeHTML(false)): JSON.stringify plus
// escaping U+2028/U+2029, which Go always escapes.
const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

function quote(s: string): string {
    return JSON.stringify(s).split(LINE_SEPARATOR).join('\\u2028').split(PARAGRAPH_SEPARATOR).join('\\u2029');
}

// Generic JSON value with object keys sorted at every level (Go encodes
// maps sorted).
function encodeSorted(v: unknown): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'string') return quote(v);
    if (typeof v === 'number' || typeof v === 'boolean') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(encodeSorted).join(',') + ']';
    if (typeof v === 'object') {
        const obj = v as Record<string, unknown>;
        return '{' + Object.keys(obj).sort().filter((k) => obj[k] !== undefined)
            .map((k) => quote(k) + ':' + encodeSorted(obj[k])).join(',') + '}';
    }
    return 'null';
}

// An already-encoded JSON value, written as-is.
class Raw {
    constructor(readonly json: string) {}
}

// Ordered fields, omitting absent ones as Go's omitempty does ("", 0,
// null/undefined) unless the field is required (always written).
function encodeFields(fields: [key: string, value: string | number | Raw | undefined, required?: boolean][]): string {
    const out: string[] = [];
    for (const [k, v, required] of fields) {
        if (!required && (v === undefined || v === '' || v === 0)) continue;
        const val = v instanceof Raw ? v.json : typeof v === 'number' ? JSON.stringify(v) : quote(v ?? '');
        out.push(quote(k) + ':' + val);
    }
    return '{' + out.join(',') + '}';
}

/** A copy of e at detail level `level` (summary drops details and upstream cause). */
export function atDetail(e: ApiError, level: ApiErrorDetail): ApiError {
    if (level === 'full') return e;
    const { details: _details, ...rest } = e;
    if (rest.upstream) {
        const { cause: _cause, ...up } = rest.upstream;
        rest.upstream = up;
    }
    return rest;
}

/** Summary-level copy: no details, no upstream cause. */
export function summarizeApiError(e: ApiError): ApiError {
    return atDetail(e, 'summary');
}

/**
 * e's canonical JSON -- byte-identical to Go's apierror Canonical: compact,
 * envelope fields in order, details keys sorted, absent fields omitted.
 */
export function canonicalApiError(e: ApiError, level: ApiErrorDetail = 'full'): string {
    const x = atDetail(e, level);
    const up = x.upstream
        ? new Raw(encodeFields([
            ['service', x.upstream.service, true], ['status', x.upstream.status], ['code', x.upstream.code],
            ['grpcCode', x.upstream.grpcCode], ['cause', x.upstream.cause], ['traceId', x.upstream.traceId], ['node', x.upstream.node],
        ]))
        : undefined;
    const details = x.details === undefined || x.details === null ? undefined : new Raw(encodeSorted(x.details));
    return encodeFields([
        ['error', x.error, true], ['code', x.code, true], ['status', x.status], ['stage', x.stage], ['hint', x.hint],
        ['requestId', x.requestId], ['upstream', up], ['details', details],
    ]);
}

// ---- parsing --------------------------------------------------------------

const STATUS_TEXT: Record<number, string> = {
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed',
    408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 413: 'Request Entity Too Large', 415: 'Unsupported Media Type',
    418: "I'm a teapot", 422: 'Unprocessable Entity', 429: 'Too Many Requests', 500: 'Internal Server Error',
    501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};

function str(v: unknown): string | undefined {
    return typeof v === 'string' && v !== '' ? v : undefined;
}
function int(v: unknown): number | undefined {
    return typeof v === 'number' && Number.isInteger(v) && v !== 0 ? v : undefined;
}

// wellTyped: every known field present has the type Go's decoder needs --
// otherwise Go's Parse falls back to plain text, and so does this.
function wellTyped(p: Record<string, any>): boolean {
    const isStr = (v: unknown) => v === undefined || v === null || typeof v === 'string';
    const isInt = (v: unknown) => v === undefined || v === null || (typeof v === 'number' && Number.isInteger(v));
    if (![p.code, p.stage, p.hint, p.requestId].every(isStr) || !isInt(p.status)) return false;
    const u = p.upstream;
    if (u === undefined || u === null) return true;
    if (typeof u !== 'object' || Array.isArray(u)) return false;
    return [u.service, u.code, u.grpcCode, u.cause, u.traceId, u.node].every(isStr) && isInt(u.status);
}

/**
 * Reads any error body: the canonical envelope, a legacy {"error":"..."}
 * body, or plain text (the last two get codeForStatus). Unknown fields are
 * dropped. Never throws. (Go: Parse.)
 */
export function parseApiError(status: number, body: string): ApiError {
    const text = body.trim();
    try {
        const p = JSON.parse(text);
        if (p && typeof p === 'object' && !Array.isArray(p) && typeof p.error === 'string' && p.error !== '' && wellTyped(p)) {
            const e: ApiError = { error: p.error, code: str(p.code) ?? codeForStatus(status) };
            const st = int(p.status) ?? status;
            if (st) e.status = st;
            if (str(p.stage)) e.stage = p.stage;
            if (str(p.hint)) e.hint = p.hint;
            if (str(p.requestId)) e.requestId = p.requestId;
            if (p.upstream && typeof p.upstream === 'object') {
                const u = p.upstream;
                const up: ApiErrorUpstream = { service: typeof u.service === 'string' ? u.service : '' };
                if (int(u.status)) up.status = u.status;
                for (const k of ['code', 'grpcCode', 'cause', 'traceId', 'node'] as const) {
                    if (str(u[k])) up[k] = u[k];
                }
                e.upstream = up;
            }
            if (p.details !== undefined && p.details !== null) e.details = p.details;
            return e;
        }
    } catch {
        // not JSON -- plain text below
    }
    return { error: text || STATUS_TEXT[status] || 'Error', code: codeForStatus(status), status };
}

/** Reads a failed fetch Response into an ApiError (request id from the header if the body has none). */
export async function apiErrorFromResponse(res: Response): Promise<ApiError> {
    const text = await res.text().catch(() => '');
    const e = parseApiError(res.status, text);
    const id = res.headers.get('X-Request-Id');
    if (!e.requestId && id && /^[A-Za-z0-9._:-]{1,128}$/.test(id)) e.requestId = id;
    return e;
}

/** True if v looks like a canonical ApiError. */
export function isApiError(v: unknown): v is ApiError {
    return !!v && typeof v === 'object' && typeof (v as ApiError).error === 'string' && typeof (v as ApiError).code === 'string';
}

// ---- display & logging ----------------------------------------------------

/** "message [CODE at stage, canton PERMISSION_DENIED, trace 201bbde3…aa7f]" */
export function formatApiError(e: ApiError): string {
    const tags = [e.stage ? `${e.code} at ${e.stage}` : e.code];
    const u = e.upstream;
    if (u && (u.grpcCode || u.code)) tags.push(`${u.service} ${u.grpcCode || u.code}`);
    if (u?.traceId) tags.push(`trace ${shortId(u.traceId)}`);
    else if (e.requestId) tags.push(`request ${shortId(e.requestId)}`);
    return `${e.error} [${tags.join(', ')}]`;
}

function shortValue(v: unknown): string {
    if (typeof v === 'string') return shortId(v);
    if (Array.isArray(v)) return v.map(shortValue).join(',');
    if (v === null || v === undefined) return '';
    return shortId(encodeSorted(v));
}

/**
 * e's fields for a log line, short forms only (Go: LogFields): code,
 * status, stage, requestId, upstream.*, then details.<key> sorted.
 */
export function logFields(e: ApiError): [string, string][] {
    const f: [string, string][] = [['code', e.code]];
    const add = (k: string, v: string | undefined) => {
        if (v) f.push([k, v]);
    };
    if (e.status) add('status', String(e.status));
    add('stage', e.stage);
    add('requestId', e.requestId);
    if (e.upstream) {
        add('upstream.service', e.upstream.service);
        add('upstream.code', e.upstream.code);
        add('upstream.grpcCode', e.upstream.grpcCode);
        add('upstream.traceId', e.upstream.traceId);
        add('upstream.node', e.upstream.node);
    }
    if (e.details && typeof e.details === 'object') {
        for (const k of Object.keys(e.details).sort()) add('details.' + k, shortValue(e.details[k]));
    }
    return f;
}

// ---- Canton ---------------------------------------------------------------

const GRPC_CODE_NAMES = [
    'OK', 'CANCELLED', 'UNKNOWN', 'INVALID_ARGUMENT', 'DEADLINE_EXCEEDED', 'NOT_FOUND', 'ALREADY_EXISTS',
    'PERMISSION_DENIED', 'RESOURCE_EXHAUSTED', 'FAILED_PRECONDITION', 'ABORTED', 'OUT_OF_RANGE',
    'UNIMPLEMENTED', 'INTERNAL', 'UNAVAILABLE', 'DATA_LOSS', 'UNAUTHENTICATED',
];

export function grpcCodeName(code: number): string {
    return code >= 0 && code < GRPC_CODE_NAMES.length ? GRPC_CODE_NAMES[code] : `CODE_${code}`;
}

/** The transaction hash a Canton signature refusal names (well-formed only), or ''. */
export function expectedHash(cause: string): string {
    const m = /hash to be signed: ([0-9a-fA-F]+)/.exec(cause);
    if (!m) return '';
    const h = m[1].toLowerCase();
    return isFingerprint(h) ? h : ''; // only a well-formed hash, as in Go
}

function bounded(cause: string): string {
    const cps = Array.from(cause);
    return cps.length > MAX_CAUSE ? cps.slice(0, MAX_CAUSE).join('') + '...' : cause;
}

/**
 * Classifies a Canton JSON Ledger API refusal (status + body) at `stage`
 * into an ApiError -- identical to Go's canton.FromLedgerError, for a UI
 * that talks to a participant or wallet gateway directly.
 */
export function fromCantonError(status: number, body: string | Record<string, unknown>, stage = ''): ApiError {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    let b: Record<string, any> = {};
    try {
        const p = typeof body === 'string' ? JSON.parse(body) : body;
        if (p && typeof p === 'object' && !Array.isArray(p)) b = p;
    } catch {
        // non-JSON body
    }
    const code = typeof b.code === 'string' ? b.code : '';
    const cause = typeof b.cause === 'string' ? b.cause : '';
    const grpc = typeof b.grpcCodeValue === 'number' ? b.grpcCodeValue : 0;
    const up: ApiErrorUpstream = { service: 'canton' };
    if (status) up.status = status;
    if (code) up.code = code;
    if (grpc) up.grpcCode = grpcCodeName(grpc);
    if (cause) up.cause = bounded(cause);
    if (typeof b.traceId === 'string' && b.traceId) up.traceId = b.traceId;
    const participant = b.context && typeof b.context === 'object' ? b.context.participant : undefined;
    if (typeof participant === 'string' && participant) up.node = participant;

    const make = (st: number, c: string, msg: string, hint: string): ApiError => {
        const e: ApiError = { error: msg, code: c, status: st };
        if (stage) e.stage = stage;
        e.hint = hint;
        e.upstream = up;
        return e;
    };

    if (!code && !grpc) {
        const c = raw.trim();
        if (c) up.cause = bounded(c);
        return make(502, CantonCodes.LEDGER_REJECTED, 'the ledger endpoint answered with a non-Canton error',
            'check the JSON Ledger API URL and version, and any proxy in front of it -- see upstream.cause');
    }
    const expected = expectedHash(cause);
    let e: ApiError;
    if (grpc === 7 || status === 403) {
        e = make(403, CantonCodes.LEDGER_PERMISSION_DENIED, 'the ledger denied the submitting ledger user',
            'the ledger user needs the right this command requires (CanActAs, CanExecuteAs or CanReadAs) on the acting party');
    } else if (grpc === 16 || status === 401) {
        e = make(502, CantonCodes.LEDGER_UNAUTHENTICATED, 'the ledger rejected the submitting token',
            "ledger auth is misconfigured (token issuer, audience or secret) -- an operator problem, not the user's");
    } else if (expected || cause.includes('valid signature')) {
        let hint = "sign the prepared transaction's hash, recomputed from the unmodified prepared transaction, with the party's key";
        if (expected) hint += `; the participant expected hash ${shortId(expected)} (details.expectedHash)`;
        e = make(422, CantonCodes.LEDGER_SIGNATURE_REJECTED, "the participant found no valid signature from the party's key", hint);
    } else if (grpc === 3) {
        e = make(400, CantonCodes.LEDGER_INVALID_ARGUMENT, "the ledger rejected the request's arguments",
            "see upstream.cause for the field; a command may reference a package or template this participant doesn't have");
    } else if (grpc === 5) {
        e = make(409, CantonCodes.LEDGER_NOT_FOUND, "the ledger couldn't find something the request needs",
            'a referenced contract may already be archived (stale contract id) or not visible to the acting party -- refresh and retry');
    } else if (grpc === 6 || grpc === 10) {
        e = make(409, CantonCodes.LEDGER_CONFLICT, "the request conflicts with the ledger's current state",
            'a duplicate or concurrent submission -- refresh and retry');
    } else if (grpc === 9) {
        e = make(422, CantonCodes.LEDGER_REJECTED, 'the ledger rejected the command (a contract precondition failed)',
            'see upstream.cause: usually a Daml assertion in the choice');
    } else if (grpc === 14 || grpc === 4 || status === 503) {
        e = make(503, CantonCodes.LEDGER_UNAVAILABLE, 'the ledger is unavailable or timed out',
            'retry shortly; if it persists, check the participant and synchronizer');
    } else {
        e = make(502, CantonCodes.LEDGER_REJECTED, 'the ledger refused the request', 'see upstream.cause');
    }
    if (expected) e.details = { expectedHash: expected } satisfies SigningDetails;
    return e;
}

/**
 * Normalizes anything thrown by a call the UI made itself -- a wallet SDK,
 * a direct ledger call, fetch -- into an ApiError: an ApiError passes
 * through; an error carrying a Canton error body (as JSON in its message,
 * or a {status, body} pair) goes through fromCantonError; anything else
 * becomes `fallbackCode` (UPSTREAM_ERROR) for `service`.
 */
export function apiErrorFromUnknown(err: unknown, opts: { stage?: string; service?: string; fallbackCode?: string } = {}): ApiError {
    if (isApiError(err)) return err;
    const o = (err && typeof err === 'object' ? err : {}) as Record<string, any>;
    if (typeof o.status === 'number' && (typeof o.body === 'string' || (o.body && typeof o.body === 'object'))) {
        return fromCantonError(o.status, o.body, opts.stage);
    }
    const message = err instanceof Error ? err.message : typeof err === 'string' ? err : String(o.message ?? 'unknown error');
    const brace = message.indexOf('{');
    if (brace >= 0) {
        try {
            const body = JSON.parse(message.slice(brace));
            if (body && typeof body === 'object' && ('grpcCodeValue' in body || 'cause' in body)) {
                return fromCantonError(typeof o.status === 'number' ? o.status : 0, body, opts.stage);
            }
        } catch {
            // not an embedded Canton body
        }
    }
    const e: ApiError = { error: message, code: opts.fallbackCode ?? ApiErrorCodes.UPSTREAM_ERROR, status: 502 };
    if (opts.stage) e.stage = opts.stage;
    if (opts.service) e.upstream = { service: opts.service };
    return e;
}
