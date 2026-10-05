// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { confirmDialog, promptDialog, formDialog, acknowledge, notifyError, notifyInfo, showErrorIn } from '../src/sdk/dialogs';
import { registerMessages } from '../src/sdk/i18n';

const dialog = () => document.querySelector<HTMLDialogElement>('dialog[data-app-dialog]')!;
const buttons = () => [...dialog().querySelectorAll('button')];
const submit = () => dialog().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

describe('in-page dialogs (replace confirm/prompt/alert)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.lang = 'en';
    });

    it('confirmDialog resolves true only on confirm, and the safe choice has focus', async () => {
        const yes = confirmDialog('Release milestone M-1?', { confirmLabel: 'Release' });
        expect(dialog().textContent).toContain('Release milestone M-1?');
        expect(document.activeElement?.textContent).toBe('Cancel');
        submit();
        expect(await yes).toBe(true);
        expect(dialog()).toBeNull();

        const no = confirmDialog('Sure?');
        buttons().find((b) => b.textContent === 'Cancel')!.click();
        expect(await no).toBe(false);
    });

    it('promptDialog and formDialog return trimmed values, or null when cancelled', async () => {
        const reason = promptDialog('Why?', { label: 'Reason' });
        dialog().querySelector('input')!.value = '  wrong file  ';
        submit();
        expect(await reason).toBe('wrong file');

        const form = formDialog('Open a period', [{ name: 'periodId', label: 'Period ID' }, { name: 'amount', label: 'Amount', type: 'number', defaultValue: '5' }]);
        const inputs = dialog().querySelectorAll('input');
        inputs[0].value = 'P-1';
        submit();
        expect(await form).toEqual({ periodId: 'P-1', amount: '5' });

        const cancelled = promptDialog('Why?', { label: 'Reason' });
        dialog().dispatchEvent(new Event('close'));
        expect(await cancelled).toBeNull();
    });

    it('acknowledge shows one button', async () => {
        const done = acknowledge('Disbursement staged.');
        expect(buttons().filter((b) => !b.hidden).map((b) => b.textContent)).toEqual(['OK']);
        submit();
        await done;
    });

    it('buttons follow the page language', async () => {
        document.documentElement.lang = 'fr';
        const p = confirmDialog('Sûr ?');
        expect(buttons().map((b) => b.textContent)).toEqual(['Annuler', 'Confirmer']);
        submit();
        await p;
    });

    it('never turns a message into markup', async () => {
        const p = confirmDialog('<img src=x onerror=alert(1)>');
        expect(dialog().querySelector('img')).toBeNull();
        expect(dialog().textContent).toContain('<img src=x onerror=alert(1)>');
        submit();
        await p;
    });

    it('notifyError keeps the error envelope (code, request id) and can be dismissed', () => {
        const e = notifyError({ apiError: { error: 'escrow not found', code: 'NOT_FOUND', status: 404, requestId: 'req-1' } });
        expect(e.code).toBe('NOT_FOUND');
        const region = document.getElementById('app-notices')!;
        expect(region.textContent).toContain('NOT_FOUND');
        expect(region.textContent).toContain('req-1');
        [...region.querySelectorAll('button')].find((b) => b.textContent === 'Dismiss')!.click();
        expect(region.textContent).toBe('');

        notifyError(new Error('plain failure'), 'fund');
        expect(region.textContent).toContain('plain failure');
    });

    it('notifyInfo shows a status message', () => {
        const n = notifyInfo('Saved', 0);
        expect(n.getAttribute('role')).toBe('status');
        expect(n.textContent).toContain('Saved');
    });
});

describe('app overrides', () => {
    it('an app catalog can relabel the buttons', async () => {
        document.body.innerHTML = '';
        document.documentElement.lang = 'en';
        registerMessages({ en: { cx: { dialog: { cancel: 'Keep editing' } } } });
        const p = confirmDialog('Discard?');
        expect(buttons().map((b) => b.textContent)).toEqual(['Keep editing', 'Confirm']);
        submit();
        await p;
        registerMessages({ en: { cx: { dialog: { cancel: 'Cancel' } } } });
    });

    it('showErrorIn renders into a given host', () => {
        const host = document.createElement('div');
        showErrorIn(host, new Error('modal failure'), 'fund');
        expect(host.textContent).toContain('modal failure');
        showErrorIn(null, new Error('ignored'));
    });
});
