import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError, createApiClient, errorFromResponse } from '../src/sdk/api-client';

const envelope = { error: 'requires scope platform:admin', code: 'FORBIDDEN', status: 403 };

describe('errorFromResponse', () => {
    it('parses the envelope and fills the request id from the header', async () => {
        const r = new Response(JSON.stringify(envelope), { status: 403, headers: { 'X-Request-Id': 'req-1' } });
        const e = await errorFromResponse(r);
        expect(e).toBeInstanceOf(ApiRequestError);
        expect(e.apiError.code).toBe('FORBIDDEN');
        expect(e.apiError.requestId).toBe('req-1');
        expect(await r.text()).toContain('FORBIDDEN'); // the body is still readable
    });

    it('takes plain text and empty bodies', async () => {
        expect((await errorFromResponse(new Response('boom', { status: 500 }))).apiError.error).toBe('boom');
        expect((await errorFromResponse(new Response('', { status: 502 }), 'Upstream down')).apiError.error).toBe('Upstream down');
    });
});

describe('createApiClient', () => {
    const ok = (body: unknown, status = 200) => new Response(body === undefined ? null : JSON.stringify(body), { status });

    it('sends the bearer token and JSON, and parses JSON', async () => {
        const fetchImpl = vi.fn(async () => ok({ id: 'j1' }));
        const api = createApiClient({ baseUrl: 'https://ops.test/api/v1/', token: () => 'tok', fetchImpl });
        expect(await api.post('/jobs/run', { job: 'retention' })).toEqual({ id: 'j1' });
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://ops.test/api/v1/jobs/run');
        const h = new Headers(init.headers);
        expect(h.get('Authorization')).toBe('Bearer tok');
        expect(h.get('Content-Type')).toBe('application/json');
        expect(init.method).toBe('POST');
        expect(init.body).toBe('{"job":"retention"}');
    });

    it('sends no Authorization without a token, and 204 is undefined', async () => {
        const fetchImpl = vi.fn(async () => ok(undefined, 204));
        const api = createApiClient({ baseUrl: 'https://ops.test', token: () => null, fetchImpl });
        expect(await api.delete('x')).toBeUndefined();
        const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe('https://ops.test/x');
        expect(new Headers(init.headers).has('Authorization')).toBe(false);
    });

    it('runs onError, then throws the parsed refusal', async () => {
        const onError = vi.fn();
        const fetchImpl = vi.fn(async () => new Response(JSON.stringify(envelope), { status: 403 }));
        const api = createApiClient({ baseUrl: 'https://ops.test', token: () => 't', onError, fetchImpl });
        const err = await api.get('/jobs').catch((e) => e);
        expect(err).toBeInstanceOf(ApiRequestError);
        expect(err.apiError.status).toBe(403);
        expect(onError).toHaveBeenCalledOnce();
    });
});
