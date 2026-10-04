// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderCantonId, hydrateCantonIds, cantonIdTitle } from '../src/sdk/canton-id-view';
import { renderApiErrorNotice } from '../src/sdk/api-error-notice';

const party = 'relaytest::1220ebb7b95ec6e5cfa8dbf6aa11981e4e1645b1926e4a5afb2c46d7ef49f7ca4288';

describe('CantonId display', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('shows the short form, the full value on hover, and copies the full value', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
        const el = renderCantonId(party);
        const text = el.querySelector('span')!;
        expect(text.textContent).toBe('relaytest::1220ebb7…4288');
        expect(text.title).toBe(party);
        expect(el.dataset.cantonIdKind).toBe('party');
        el.querySelector('button')!.click();
        await Promise.resolve();
        expect(writeText).toHaveBeenCalledWith(party);
    });

    it('a label (T1 display name) replaces the short id; hover shows both', () => {
        const el = renderCantonId(party, { label: 'Joey Depositor' });
        const text = el.querySelector('span')!;
        expect(text.textContent).toBe('Joey Depositor');
        expect(text.title).toBe(cantonIdTitle(party, 'Joey Depositor'));
        expect(text.title).toBe(`Joey Depositor\nrelaytest::1220ebb7…4288\n${party}`);
    });

    it('copy can be turned off; values never become markup', () => {
        expect(renderCantonId(party, { copy: false }).querySelector('button')).toBeNull();
        const el = renderCantonId('<img src=x onerror=alert(1)>');
        expect(el.querySelector('img')).toBeNull();
        expect(el.dataset.cantonIdKind).toBe('other');
    });

    it('hydrates server-rendered ids once', () => {
        document.body.innerHTML = `<p><span data-canton-id="${party}" data-canton-id-label="Joey" data-canton-id-copy="true"><span>x</span></span></p>`;
        hydrateCantonIds();
        const el = document.querySelector('[data-canton-id]') as HTMLElement;
        expect(el.querySelector('button')).not.toBeNull();
        expect(el.textContent).toContain('Joey');
        hydrateCantonIds();
        expect(document.querySelectorAll('[data-canton-id] button').length).toBe(1);
    });

    it('the error notice shows ids through the same display', () => {
        const n = renderApiErrorNotice({ error: 'x', code: 'LEDGER_PERMISSION_DENIED', details: { party, actAs: [party, 'raw-input'] } });
        const ids = [...n.querySelectorAll<HTMLElement>('[data-canton-id]')].map((e) => e.dataset.cantonId);
        expect(ids).toEqual(expect.arrayContaining([party, 'raw-input']));
        const shown = [...n.querySelectorAll<HTMLElement>('[data-canton-id-kind="party"] > span')].map((s) => [s.textContent, s.title]);
        expect(shown).toContainEqual(['relaytest::1220ebb7…4288', party]);
    });
});

describe('CantonId display in another language', () => {
    it('button text and accessible name follow the locale', () => {
        const el = renderCantonId(party, { locale: 'fr' });
        const b = el.querySelector('button')!;
        expect(b.textContent).toBe('Copier');
        expect(b.getAttribute('aria-label')).toBe('Copier l’identifiant sur le registre');
        expect(renderCantonId(party).querySelector('button')!.getAttribute('aria-label')).toBe('Copy ledger ID');
    });
});
