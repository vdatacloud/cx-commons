import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parsePartyId, classifyCantonId, shortCantonId, isFingerprint, partyControlledBy } from '../src/sdk/canton-id';
import { shortId } from '../src/sdk/api-error';

// Copy of daml-escrow-commons cantonid/testdata/parse.json -- Go is the
// source of truth for how each id classifies, splits and shortens.
interface Case { input: string; kind: string; hint?: string; namespace?: string; short: string }
const cases: Case[] = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'canton-id', 'parse.json'), 'utf8'));

describe('canton ids (parity with Go cantonid)', () => {
    it('has the Go fixture', () => expect(cases.length).toBeGreaterThanOrEqual(17));

    for (const c of cases) {
        it(`${JSON.stringify(c.input).slice(0, 60)} -> ${c.kind}`, () => {
            expect(classifyCantonId(c.input)).toBe(c.kind);
            expect(shortCantonId(c.input)).toBe(c.short);
            expect(shortId(c.input)).toBe(c.short); // the error SDK uses the same rule
            const p = parsePartyId(c.input);
            if (c.kind === 'party') {
                expect(p).toEqual({ hint: c.hint, namespace: c.namespace, full: c.input, short: c.short });
            } else {
                expect(p).toBeNull();
            }
        });
    }

    it('external party control is namespace == key fingerprint', () => {
        const fp = '1220' + 'ab'.repeat(32);
        const p = parsePartyId('wallet::' + fp)!;
        expect([partyControlledBy(p, fp), partyControlledBy(p, '1220' + 'cd'.repeat(32)), partyControlledBy(p, '')]).toEqual([true, false, false]);
        expect([isFingerprint(fp), isFingerprint(fp.toUpperCase()), isFingerprint('1220ab')]).toEqual([true, false, false]);
    });
});
