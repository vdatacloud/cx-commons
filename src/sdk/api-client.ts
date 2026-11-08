// Calling a platform service from a browser app: the bearer token on every
// request, JSON in and out, and every refusal as an ApiRequestError carrying
// the parsed error envelope (./api-error, the mirror of daml-escrow-commons
// apierror) for ApiErrorNotice to render.
//
// Shared by the escrow portal (its ApiRequestError) and the operator console
// (daml-escrow PLAN.md Phase 104). An app's own reactions to particular
// refusals (a step-up sign-in, a signing session) go in onError.

import { formatApiError, parseApiError, type ApiError } from './api-error';

/** A refused request: the parsed envelope, and a message for plain display. */
export class ApiRequestError extends Error {
    constructor(readonly apiError: ApiError, message = formatApiError(apiError)) {
        super(message);
        this.name = 'ApiRequestError';
    }
}

/**
 * The ApiRequestError for a non-2xx response: any body (the envelope, a
 * legacy {"error"} or plain text) parses; the X-Request-Id header fills in a
 * missing request id. Reads a clone, so the caller can still read the body.
 */
export async function errorFromResponse(response: Response, fallback = 'Request failed'): Promise<ApiRequestError> {
    const text = await response.clone().text().catch(() => '');
    const e = parseApiError(response.status, text || fallback);
    const id = response.headers.get('X-Request-Id');
    if (!e.requestId && id) e.requestId = id;
    return new ApiRequestError(e);
}

export interface ApiClientOptions {
    /** The service's base URL, e.g. https://ops.example/api/v1. */
    baseUrl: string;
    /** The current access token; null sends no Authorization header. */
    token: () => string | null;
    /** Runs before a refusal is thrown (e.g. offer a new sign-in on 401). */
    onError?: (response: Response) => void | Promise<void>;
    fetchImpl?: typeof fetch;
}

export interface ApiClient {
    get<T>(path: string, init?: RequestInit): Promise<T>;
    post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
    patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
    put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
    delete<T>(path: string, init?: RequestInit): Promise<T>;
    /** The raw response for anything else (downloads, uploads); throws on refusal. */
    request(path: string, init?: RequestInit): Promise<Response>;
}

/** A client for one service. Path segments that carry ids must be encodeURIComponent'ed by the caller. */
export function createApiClient(opts: ApiClientOptions): ApiClient {
    const doFetch = opts.fetchImpl ?? fetch;
    const base = opts.baseUrl.replace(/\/+$/, '');

    async function request(path: string, init: RequestInit = {}): Promise<Response> {
        const headers = new Headers(init.headers);
        const token = opts.token();
        if (token) headers.set('Authorization', `Bearer ${token}`);
        if (!headers.has('Accept')) headers.set('Accept', 'application/json');
        const response = await doFetch(base + (path.startsWith('/') ? path : '/' + path), { ...init, headers });
        if (!response.ok) {
            await opts.onError?.(response);
            throw await errorFromResponse(response);
        }
        return response;
    }

    async function json<T>(path: string, init: RequestInit): Promise<T> {
        const response = await request(path, init);
        if (response.status === 204) return undefined as T;
        const text = await response.text();
        return (text ? JSON.parse(text) : undefined) as T;
    }

    const withBody = (method: string) => <T>(path: string, body?: unknown, init: RequestInit = {}) => {
        const headers = new Headers(init.headers);
        if (body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
        return json<T>(path, { ...init, method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    };

    return {
        get: <T>(path: string, init: RequestInit = {}) => json<T>(path, { ...init, method: 'GET' }),
        post: withBody('POST'),
        patch: withBody('PATCH'),
        put: withBody('PUT'),
        delete: <T>(path: string, init: RequestInit = {}) => json<T>(path, { ...init, method: 'DELETE' }),
        request,
    };
}
