import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
    parseApiError, canonicalApiError, summarizeApiError, fromCantonError, logFields, formatApiError,
    shortId, shortIds, codeForStatus, isValidCode, apiErrorFromResponse, apiErrorFromUnknown, expectedHash,
    grpcCodeName, MAX_CAUSE, type ApiError,
} from '../src/sdk/api-error';

// Copies of daml-escrow-commons apierror's golden fixtures (the Go source
// of truth) -- scripts/sync-api-error-fixtures.sh. Byte parity with Go is
// the contract.
const FIX = join(__dirname, 'fixtures', 'api-error');
const read = (...p: string[]) => readFileSync(join(FIX, ...p), 'utf8').replace(/\n$/, '');
const names = (dir: string, suffix: string) =>
    readdirSync(join(FIX, dir)).filter((f) => f.endsWith(suffix)).map((f) => f.slice(0, -suffix.length));

describe('canonical JSON (parity with Go)', () => {
    const cases = names('canonical', '.full.json');

    it('has the Go fixtures', () => {
        expect(cases).toEqual(expect.arrayContaining(['minimal', 'full', 'escaping', 'upstream-no-cause']));
    });

    for (const name of cases) {
        it(`${name}: parse + re-encode reproduces Go's bytes at both levels`, () => {
            const full = read('canonical', `${name}.full.json`);
            const summary = read('canonical', `${name}.summary.json`);
            const e = parseApiError(0, full);
            expect(canonicalApiError(e)).toBe(full);
            expect(canonicalApiError(e, 'summary')).toBe(summary);
            expect(canonicalApiError(summarizeApiError(e))).toBe(summary);
            expect(canonicalApiError(parseApiError(0, summary))).toBe(summary);
        });
    }

    it('sorts details keys at every level, whatever the insertion order', () => {
        const e: ApiError = { error: 'x', code: 'X', details: { z: 1, a: { y: true, b: null }, m: ['x', 2.5] } };
        expect(canonicalApiError(e)).toBe('{"error":"x","code":"X","details":{"a":{"b":null,"y":true},"m":["x",2.5],"z":1}}');
    });

    it('keeps a required empty upstream service and omits empty optionals', () => {
        expect(canonicalApiError({ error: 'x', code: 'X', status: 0, stage: '', upstream: { service: '', status: 0 } }))
            .toBe('{"error":"x","code":"X","upstream":{"service":""}}');
    });

    it('summary does not mutate the original', () => {
        const e = parseApiError(0, read('canonical', 'full.full.json'));
        summarizeApiError(e);
        expect(e.details).toBeDefined();
        expect(e.upstream?.cause).toBeDefined();
    });
});

describe('log fields (parity with Go)', () => {
    for (const name of names('logfields', '.json')) {
        it(`${name}: same order and short forms as Go's LogFields`, () => {
            const e = parseApiError(0, read('canonical', `${name}.full.json`));
            expect(JSON.stringify(logFields(e))).toBe(read('logfields', `${name}.json`));
        });
    }
});

describe('fromCantonError (parity with Go canton.FromLedgerError)', () => {
    for (const name of names('classify', '.input.json')) {
        it(name, () => {
            const input = JSON.parse(read('classify', `${name}.input.json`));
            const got = fromCantonError(input.status, input.body, input.stage);
            expect(canonicalApiError(got)).toBe(read('classify', `${name}.want.json`));
            // A raw string body classifies the same as the parsed object.
            const asText = typeof input.body === 'string' ? input.body : JSON.stringify(input.body);
            expect(canonicalApiError(fromCantonError(input.status, asText, input.stage))).toBe(read('classify', `${name}.want.json`));
        });
    }

    it('bounds the cause', () => {
        const e = fromCantonError(400, { cause: 'c'.repeat(5000), grpcCodeValue: 3 });
        expect(e.upstream?.cause?.length).toBe(MAX_CAUSE + 3);
    });
});

describe('parseApiError', () => {
    it.each([
        ['canonical', 409, '{"error":"no","code":"LEDGER_CONFLICT","status":409}', 'LEDGER_CONFLICT', 'no', 409],
        ['canonical without status', 418, '{"error":"no","code":"X_Y"}', 'X_Y', 'no', 418],
        ['legacy json', 400, '{"error":"invalid request body"}', 'INVALID_REQUEST', 'invalid request body', 400],
        ['plain text', 401, 'invalid or expired nonce\n', 'UNAUTHENTICATED', 'invalid or expired nonce', 401],
        ['empty', 503, '', 'UNAVAILABLE', 'Service Unavailable', 503],
        ['json without error', 500, '{"message":"x"}', 'INTERNAL', '{"message":"x"}', 500],
        ['mistyped field falls back to text, like Go', 409, '{"error":"no","status":"409"}', 'CONFLICT', '{"error":"no","status":"409"}', 409],
    ])('%s', (_n, status, body, code, msg, st) => {
        const e = parseApiError(status, body);
        expect([e.code, e.error, e.status]).toEqual([code, msg, st]);
    });

    it('drops unknown fields', () => {
        expect(canonicalApiError(parseApiError(400, '{"error":"x","code":"X","extra":1}'))).toBe('{"error":"x","code":"X","status":400}');
    });

    it('reads a fetch Response, taking the request id from the header', async () => {
        const res = new Response('not found', { status: 404, headers: { 'X-Request-Id': 'up-1' } });
        const e = await apiErrorFromResponse(res);
        expect([e.code, e.requestId]).toEqual(['NOT_FOUND', 'up-1']);
    });
});

describe('shortId', () => {
    const ns = '1220ebb7b95ec6e5cfa8dbf6aa11981e4e1645b1926e4a5afb2c46d7ef49f7ca4288';
    it.each([
        ['relaytest::' + ns, 'relaytest::1220ebb7…4288'],
        [ns, '1220ebb7…4288'],
        ['3f'.repeat(64), '3f3f3f3f…3f3f'],
        ['VXDrn/op6YbtZHuSH+xdWUR8kW7+xMrP9w47KgxPZSE=', 'VXDrn/op…ZSE='],
        ['Depositor', 'Depositor'],
        ['Depositor::1220ab', 'Depositor::1220ab'],
        ['', ''],
        ['🔑'.repeat(20), '🔑'.repeat(8) + '…' + '🔑'.repeat(4)],
    ])('%s', (input, want) => expect(shortId(input)).toBe(want));
    it('maps arrays', () => expect(shortIds(['a::' + ns, 'b'])).toEqual(['a::1220ebb7…4288', 'b']));
});

describe('formatting and helpers', () => {
    it('formats code, stage, upstream and a short trace id', () => {
        const e = parseApiError(0, read('canonical', 'full.full.json'));
        expect(formatApiError(e)).toBe("the participant found no valid signature from the party's key [LEDGER_SIGNATURE_REJECTED at execute, canton INVALID_ARGUMENT, trace 009fa53edf07ce7f]");
        expect(formatApiError({ error: 'gone', code: 'NOT_FOUND', requestId: 'abcdefabcdefabcdefabcdef' }))
            .toBe('gone [NOT_FOUND, request abcdefab…cdef]');
    });

    it('codes', () => {
        expect([400, 401, 403, 404, 409, 422, 429, 418, 500, 501, 502, 503, 504].map(codeForStatus)).toEqual([
            'INVALID_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'UNPROCESSABLE', 'RATE_LIMITED',
            'INVALID_REQUEST', 'INTERNAL', 'NOT_IMPLEMENTED', 'UPSTREAM_ERROR', 'UNAVAILABLE', 'TIMEOUT',
        ]);
        expect([isValidCode('A1_B'), isValidCode('lower'), isValidCode('')]).toEqual([true, false, false]);
        expect([grpcCodeName(7), grpcCodeName(99)]).toEqual(['PERMISSION_DENIED', 'CODE_99']);
        expect(expectedHash('Transaction hash to be signed: 1220ff. Ensure')).toBe('1220ff');
    });
});

describe('apiErrorFromUnknown (UI talking to Canton or a wallet directly)', () => {
    it('passes an ApiError through', () => {
        const e: ApiError = { error: 'x', code: 'X' };
        expect(apiErrorFromUnknown(e)).toBe(e);
    });

    it('classifies a {status, body} Canton refusal', () => {
        const e = apiErrorFromUnknown({ status: 403, body: { code: 'NA', grpcCodeValue: 7, traceId: 't' } }, { stage: 'execute' });
        expect([e.code, e.status, e.stage, e.upstream?.traceId]).toEqual(['LEDGER_PERMISSION_DENIED', 403, 'execute', 't']);
    });

    it('classifies a Canton body embedded in an Error message', () => {
        const err = new Error('execute failed: {"code":"FAILED_TO_EXECUTE_TRANSACTION","cause":"Received 0 valid signatures. Transaction hash to be signed: 1220ab.","grpcCodeValue":3}');
        const e = apiErrorFromUnknown(err, { stage: 'execute' });
        expect([e.code, (e.details as any)?.expectedHash]).toEqual(['LEDGER_SIGNATURE_REJECTED', '1220ab']);
    });

    it('anything else is an upstream error for the named service', () => {
        const e = apiErrorFromUnknown(new Error('popup blocked'), { stage: 'connect', service: 'wallet-gateway' });
        expect(canonicalApiError(e)).toBe('{"error":"popup blocked","code":"UPSTREAM_ERROR","status":502,"stage":"connect","upstream":{"service":"wallet-gateway"}}');
    });
});
