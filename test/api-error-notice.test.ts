// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderApiErrorNotice, mountApiErrorNotice, hydrateApiErrorNotices } from '../src/sdk/api-error-notice';
import { parseApiError, canonicalApiError, type ApiError } from '../src/sdk/api-error';

const full = readFileSync(join(__dirname, 'fixtures', 'api-error', 'canonical', 'full.full.json'), 'utf8').trim();
const signature = parseApiError(0, full);

describe('renderApiErrorNotice', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('shows message, code, stage, upstream, hint and short trace ids', () => {
        const n = renderApiErrorNotice(signature);
        const text = n.textContent ?? '';
        expect(n.getAttribute('role')).toBe('alert');
        expect(n.dataset.apiErrorCode).toBe('LEDGER_SIGNATURE_REJECTED');
        for (const s of ["the participant found no valid signature from the party's key", 'LEDGER_SIGNATURE_REJECTED', 'execute',
            'canton INVALID_ARGUMENT', signature.hint!, 'req-01HZX', '009fa53edf07ce7f', 'app-provider']) {
            expect(text).toContain(s);
        }
    });

    it('full level lists every detail at full length; summary level omits them', () => {
        const n = renderApiErrorNotice(signature);
        const fullText = n.textContent ?? '';
        const d = signature.details as Record<string, string>;
        // Ids show short, with the full value on hover and in copy.
        const full = [...n.querySelectorAll<HTMLElement>('[data-canton-id]')].map((e) => e.dataset.cantonId);
        expect(full).toEqual(expect.arrayContaining([d.party, d.signatureReceived, d.expectedHash]));
        expect(fullText).toContain('relaytest::1220ebb7…4288');
        expect(fullText).not.toContain(d.signatureReceived);
        expect(fullText).toContain(signature.upstream!.cause!);

        const sumText = renderApiErrorNotice(signature, { level: 'summary' }).textContent ?? '';
        expect(sumText).not.toContain(d.signatureReceived);
        expect(sumText).not.toContain(signature.upstream!.cause!);
        expect(sumText).toContain('LEDGER_SIGNATURE_REJECTED');
    });

    it('never interprets error text as markup', () => {
        const evil: ApiError = { error: '<img src=x onerror="alert(1)">', code: 'X', hint: '<script>bad()</script>', details: { k: '<b>v</b>' } };
        const n = renderApiErrorNotice(evil);
        expect(n.querySelector('img, script, b')).toBeNull();
        expect(n.textContent).toContain('<img src=x onerror="alert(1)">');
    });

    it('transient codes use the warning tone, others the error tone', () => {
        expect(renderApiErrorNotice({ error: 'x', code: 'LEDGER_UNAVAILABLE' }).className).toContain('status-proposed');
        expect(renderApiErrorNotice({ error: 'x', code: 'LEDGER_PERMISSION_DENIED' }).className).toContain('status-disputed');
    });

    it('copies the canonical JSON at the notice level', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const n = renderApiErrorNotice(signature, { level: 'summary' });
        const button = [...n.querySelectorAll('button')].find((b) => b.textContent === 'Copy error JSON')!;
        button.click();
        await Promise.resolve();
        expect(writeText).toHaveBeenCalledWith(canonicalApiError(signature, 'summary'));
    });

    it('dismiss calls back; mount replaces the container content', () => {
        const onDismiss = vi.fn();
        const host = document.createElement('div');
        host.append('old');
        const n = mountApiErrorNotice(host, { error: 'x', code: 'X' }, { onDismiss });
        expect(host.firstChild).toBe(n);
        [...n.querySelectorAll('button')].find((b) => b.textContent === 'Dismiss')!.click();
        expect(onDismiss).toHaveBeenCalled();
    });

    it('hydrates server-rendered hosts once, keeping the fallback on bad JSON', () => {
        document.body.innerHTML = `
          <div id="a" data-api-error='${full.replace(/'/g, '&#39;')}' data-api-error-level="summary"><p>fallback</p></div>
          <div id="b" data-api-error="not json"><p>fallback</p></div>`;
        hydrateApiErrorNotices();
        const a = document.getElementById('a')!;
        expect(a.querySelector('[role=alert]')?.textContent).toContain('LEDGER_SIGNATURE_REJECTED');
        expect(a.textContent).not.toContain((signature.details as any).signatureReceived);
        expect(document.getElementById('b')!.textContent).toContain('fallback');
        const first = a.firstChild;
        hydrateApiErrorNotices();
        expect(a.firstChild).toBe(first);
    });
});

describe('detail labels read as words (daml-escrow Phase 70 R2)', () => {
    it('known keys, camelCase fallbacks and list items', async () => {
        const { detailLabel } = await import('../src/sdk/api-error-notice');
        expect(detailLabel('publicKeyFingerprint')).toBe('Your key fingerprint');
        expect(detailLabel('ledgerUser')).toBe('Ledger user');
        expect(detailLabel('someNewField')).toBe('Some new field');
        expect(detailLabel('actAs[1]')).toBe('Acting as 2');
        expect(detailLabel('x')).toBe('X');
    });

    it('the notice shows readable labels, never raw keys', () => {
        const n = renderApiErrorNotice({ error: 'x', code: 'KEY_DOES_NOT_CONTROL_PARTY', details: { publicKeyFingerprint: '1220' + 'ab'.repeat(32) } });
        expect(n.textContent).toContain('Your key fingerprint');
        expect(n.textContent).not.toContain('publicKeyFingerprint');
    });
});
