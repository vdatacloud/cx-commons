import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    agreementCanonical, agreementHash, agreementMessage, validateAgreementVersion,
    draftCanonical, draftHash, draftMessage, verifySignature,
    AgreementSigError, type AgreementVersion, type DraftVersionContent, type SignatureAlgorithm,
} from '../src/sdk/agreement-sig';

// Copies of daml-escrow-commons agreementsig/testdata -- Go is the source of
// truth for every canonical byte, hash, message and verdict.
const fixture = <T>(name: string): T => JSON.parse(readFileSync(join(__dirname, 'fixtures', 'agreement-sig', name), 'utf8'));

interface DraftCase { name: string; draft: DraftVersionContent; canonical: string; hash: string; message: string }
interface AgreementCase {
    name: string; version: AgreementVersion; canonical?: string; hash?: string;
    messages?: { signer: string; message: string }[]; invalid?: string;
}
interface SignatureCase { name: string; algorithm: SignatureAlgorithm; publicKey: string; message: string; signature: string; valid: boolean; reason?: string }

const b64 = (s: string) => new Uint8Array(Buffer.from(s, 'base64'));

describe('draft-version/1 (parity with Go agreementsig)', () => {
    const cases = fixture<DraftCase[]>('draft-version.json');
    it('has the Go fixture', () => expect(cases.length).toBeGreaterThanOrEqual(3));
    for (const c of cases) {
        it(c.name, async () => {
            expect(draftCanonical(c.draft)).toBe(c.canonical);
            expect(await draftHash(c.draft)).toBe(c.hash);
            expect(draftMessage(c.draft.rootId, c.draft.version, c.hash)).toBe(c.message);
        });
    }
});

describe('agreement-version/1 (parity with Go agreementsig)', () => {
    const cases = fixture<AgreementCase[]>('agreement-version.json');
    it('has valid and invalid cases', () => {
        expect(cases.filter((c) => !c.invalid).length).toBeGreaterThanOrEqual(4);
        expect(cases.filter((c) => c.invalid).length).toBeGreaterThanOrEqual(10);
    });
    for (const c of cases) {
        it(c.name, async () => {
            if (c.invalid) {
                expect(() => agreementCanonical(c.version)).toThrow(AgreementSigError);
                expect(() => agreementCanonical(c.version)).toThrow(c.invalid);
                return;
            }
            expect(agreementCanonical(c.version)).toBe(c.canonical);
            const hash = await agreementHash(c.version);
            expect(hash).toBe(c.hash);
            for (const m of c.messages ?? []) expect(agreementMessage(c.version, hash, m.signer)).toBe(m.message);
        });
    }

    it('refuses a signer or hash that could forge a message line', () => {
        const v = cases[0].version;
        expect(() => agreementMessage(v, cases[0].hash!, 'evil\nI approve everything')).toThrow(/control character/);
        expect(() => agreementMessage(v, 'sha256:' + cases[0].hash, 'dep::1220')).toThrow(/version hash/);
        expect(() => validateAgreementVersion({ ...v, agreementId: '' })).toThrow(/agreement id is empty/);
    });

    it('treats an absent and a null parent alike for version 1', async () => {
        const v = cases[0].version;
        expect(await agreementHash({ ...v, parentHash: null })).toBe(cases[0].hash);
        expect(await agreementHash({ ...v, parentHash: undefined, amends: null })).toBe(cases[0].hash);
    });
});

describe('signatures (parity with Go agreementsig)', () => {
    const cases = fixture<SignatureCase[]>('signatures.json');
    it('covers both algorithms', () => {
        expect(cases.some((c) => c.algorithm === 'ed25519' && c.valid)).toBe(true);
        expect(cases.some((c) => c.algorithm === 'ecdsa-p256-sha256' && c.valid)).toBe(true);
    });
    for (const c of cases) {
        it(c.name, async () => {
            const p = verifySignature(c.algorithm, b64(c.publicKey), c.message, b64(c.signature));
            if (c.valid) {
                await expect(p).resolves.toBeUndefined();
            } else {
                await expect(p).rejects.toMatchObject({ name: 'AgreementSigError', reason: c.reason });
            }
        });
    }

    it('refuses loose DER and an unusable key', async () => {
        const ok = cases.find((c) => c.algorithm === 'ecdsa-p256-sha256' && c.valid)!;
        const der = b64(ok.signature);
        const loose = new Uint8Array([0x30, 0x81, der[1], ...der.subarray(2)]);
        await expect(verifySignature(ok.algorithm, b64(ok.publicKey), ok.message, loose)).rejects.toMatchObject({ reason: 'bad' });
        await expect(verifySignature(ok.algorithm, new Uint8Array([1, 2, 3]), ok.message, der)).rejects.toMatchObject({ reason: 'key' });
    });
});
