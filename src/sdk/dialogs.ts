// In-page replacements for window.confirm / prompt / alert (promoted from
// daml-escrow's frontend, PLAN.md Phase 71). The browser's own dialogs block the page, can't be
// styled, ignore the page's language for their buttons, and lose an error's
// code and request id. These render a <dialog> (or, for errors, the
// cx-commons error notice) in the page's language.
//
// Built with DOM APIs and textContent only -- messages often carry values
// from the server or other parties and must never become markup.

// Button labels are cx.dialog.* (sdk/cx-messages); an app overrides them by
// registering the same keys. Styling uses the design system's tokens
// (brand-*, status-*), so it follows white-labeling.

import { mountApiErrorNotice } from './api-error-notice';
import { apiErrorFromUnknown, isApiError, type ApiError } from './api-error';
import { getTranslator } from './i18n';
import './cx-messages';

const BUTTON = 'rounded-lg px-4 py-2 text-sm font-bold cursor-pointer';
const SECONDARY = `${BUTTON} border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800`;
const PRIMARY = `${BUTTON} bg-brand-600 text-white hover:bg-brand-700 border-none`;
const DANGER = `${BUTTON} bg-status-disputed text-white hover:opacity-90 border-none`;
const INPUT = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
}

export interface Field {
    name: string;
    label: string;
    defaultValue?: string;
    placeholder?: string;
    required?: boolean;
    type?: 'text' | 'number';
}

interface DialogSpec {
    title?: string;
    message: string;
    fields?: Field[];
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}

// open renders a modal and resolves with the field values on confirm, or
// null on cancel / Escape / close. The safe choice (Cancel) has focus unless
// there are fields to fill.
function open(spec: DialogSpec): Promise<Record<string, string> | null> {
    const { t } = getTranslator();
    return new Promise((resolve) => {
        const dialog = el('dialog', 'm-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-900/50 dark:border-slate-700 dark:bg-slate-900');
        dialog.dataset.appDialog = '';
        const form = el('form', 'space-y-4');
        form.method = 'dialog';
        if (spec.title) form.append(el('h2', 'text-lg font-bold text-slate-900 dark:text-white', spec.title));
        form.append(el('p', 'text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line', spec.message));
        const inputs: HTMLInputElement[] = [];
        for (const f of spec.fields ?? []) {
            const label = el('label', 'block space-y-1');
            label.append(el('span', 'text-xs font-semibold text-slate-500 dark:text-slate-400', f.label));
            const input = el('input', INPUT);
            input.name = f.name;
            input.type = f.type ?? 'text';
            if (f.type === 'number') input.step = 'any';
            input.value = f.defaultValue ?? '';
            if (f.placeholder) input.placeholder = f.placeholder;
            input.required = !!f.required;
            label.append(input);
            form.append(label);
            inputs.push(input);
        }
        const actions = el('div', 'flex justify-end gap-2 pt-2');
        const cancel = el('button', SECONDARY, spec.cancelLabel || t('cx.dialog.cancel'));
        cancel.type = 'button';
        // An empty cancelLabel means a single-button (acknowledge) dialog.
        if (spec.cancelLabel === '') cancel.hidden = true;
        const ok = el('button', spec.danger ? DANGER : PRIMARY, spec.confirmLabel ?? t('cx.dialog.confirm'));
        ok.type = 'submit';
        actions.append(cancel, ok);
        form.append(actions);
        dialog.append(form);

        let settled = false;
        const finish = (value: Record<string, string> | null) => {
            if (settled) return;
            settled = true;
            dialog.close();
            dialog.remove();
            resolve(value);
        };
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!form.reportValidity()) return;
            finish(Object.fromEntries(inputs.map((i) => [i.name, i.value.trim()])));
        });
        cancel.addEventListener('click', () => finish(null));
        dialog.addEventListener('close', () => finish(null));
        document.body.append(dialog);
        dialog.showModal();
        (inputs[0] ?? (cancel.hidden ? ok : cancel)).focus();
    });
}

/** Asks a yes/no question; resolves true only on an explicit confirm. */
export async function confirmDialog(message: string, opts: Omit<DialogSpec, 'message' | 'fields'> = {}): Promise<boolean> {
    return (await open({ ...opts, message })) !== null;
}

/** Shows a message that needs reading before the page moves on (e.g. before a reload). */
export async function acknowledge(message: string, opts: { title?: string } = {}): Promise<void> {
    const { t } = getTranslator();
    await open({ ...opts, message, confirmLabel: t('cx.dialog.ok'), cancelLabel: '' });
}

/** Asks for one value; resolves the trimmed value, or null when cancelled. */
export async function promptDialog(message: string, field: Omit<Field, 'name'> & { name?: string }, opts: Omit<DialogSpec, 'message' | 'fields'> = {}): Promise<string | null> {
    const name = field.name ?? 'value';
    const values = await open({ ...opts, message, fields: [{ ...field, name }] });
    return values ? values[name] : null;
}

/** Asks for several values; resolves them by field name, or null when cancelled. */
export function formDialog(message: string, fields: Field[], opts: Omit<DialogSpec, 'message' | 'fields'> = {}): Promise<Record<string, string> | null> {
    return open({ ...opts, message, fields });
}

// Notices stack in one fixed region, top right, newest first.
function region(): HTMLElement {
    let r = document.getElementById('app-notices');
    if (!r) {
        r = el('div', 'fixed right-4 top-20 z-[200] flex w-full max-w-md flex-col gap-3');
        r.id = 'app-notices';
        r.setAttribute('aria-live', 'polite');
        document.body.append(r);
    }
    return r;
}

/**
 * Shows a failure with the platform error notice (code, stage, hint, request
 * id, details), in the page's language. Anything carrying the error envelope
 * (ApiRequestError, wallet errors) shows as-is; anything else is normalized.
 */
export function notifyError(err: unknown, stage?: string): ApiError {
    const carried = (err as { apiError?: unknown } | null)?.apiError;
    const e = isApiError(carried) ? carried : apiErrorFromUnknown(err, { stage });
    const host = el('div', 'shadow-xl rounded-2xl bg-white dark:bg-slate-900');
    region().prepend(host);
    mountApiErrorNotice(host, e, { onDismiss: () => host.remove() });
    return e;
}

/** Renders a failure into host (e.g. a modal's status area) with the platform error notice. */
export function showErrorIn(host: HTMLElement | null, err: unknown, stage?: string): void {
    if (!host) return;
    const carried = (err as { apiError?: unknown } | null)?.apiError;
    mountApiErrorNotice(host, isApiError(carried) ? carried : apiErrorFromUnknown(err, { stage }));
}

/** Shows a short confirmation that dismisses itself. */
export function notifyInfo(message: string, ms = 6000): HTMLElement {
    const { t } = getTranslator();
    const host = el('div', 'flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100');
    host.setAttribute('role', 'status');
    host.append(el('p', 'flex-1', message));
    const close = el('button', 'text-xs font-bold text-slate-400 hover:text-slate-600 border-none bg-transparent cursor-pointer', t('cx.dialog.close'));
    close.type = 'button';
    close.addEventListener('click', () => host.remove());
    host.append(close);
    region().prepend(host);
    if (ms > 0) setTimeout(() => host.remove(), ms);
    return host;
}
