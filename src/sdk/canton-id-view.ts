// One display for every Canton id (party, fingerprint, hash): the short
// form (or a human label, e.g. the party's T1 display name), the full value
// on hover, and a copy button that copies the full value. Framework-free
// DOM; components/CantonId.astro hydrates through it and the error notice
// uses it, so ids look and behave the same everywhere. Values are set with
// textContent only.

import { shortCantonId, classifyCantonId, type CantonIdKind } from './canton-id';

export interface CantonIdOptions {
    /** A human label shown instead of the short id (e.g. "Joey Depositor"); hover then shows both. */
    label?: string;
    /** Adds a copy button (default true). */
    copy?: boolean;
}

export const CANTON_ID_CLASS = 'inline-flex max-w-full items-center gap-1.5 align-middle';
export const CANTON_ID_TEXT_CLASS = 'font-mono text-xs break-all text-slate-700 dark:text-slate-200';
export const CANTON_ID_LABEL_CLASS = 'text-xs font-semibold text-slate-800 dark:text-slate-100';
export const CANTON_ID_COPY_CLASS =
    'rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

/** The hover text: the full value, under the label and short form when labeled. */
export function cantonIdTitle(value: string, label?: string): string {
    return label ? `${label}\n${shortCantonId(value)}\n${value}` : value;
}

/** Renders value as a short id with full-value hover and copy. */
export function renderCantonId(value: string, opts: CantonIdOptions = {}): HTMLElement {
    const kind: CantonIdKind = classifyCantonId(value);
    const root = document.createElement('span');
    root.className = CANTON_ID_CLASS;
    root.dataset.cantonId = value;
    root.dataset.cantonIdKind = kind;

    const text = document.createElement('span');
    text.className = opts.label ? CANTON_ID_LABEL_CLASS : CANTON_ID_TEXT_CLASS;
    text.textContent = opts.label || shortCantonId(value);
    text.title = cantonIdTitle(value, opts.label);
    text.setAttribute('aria-label', opts.label ? `${opts.label} (${value})` : value);
    root.append(text);

    if (opts.copy !== false) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = CANTON_ID_COPY_CLASS;
        b.textContent = 'Copy';
        b.setAttribute('aria-label', `Copy ${kind === 'party' ? 'party id' : kind === 'fingerprint' ? 'fingerprint' : 'value'}`);
        b.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(value);
                b.textContent = 'Copied';
            } catch {
                b.textContent = 'Copy failed';
            }
            setTimeout(() => (b.textContent = 'Copy'), 1500);
        });
        root.append(b);
    }
    return root;
}

/**
 * Renders every [data-canton-id] element under root (CantonId.astro's
 * server output) that hasn't been rendered yet.
 */
export function hydrateCantonIds(root: ParentNode = document): void {
    root.querySelectorAll<HTMLElement>('[data-canton-id]:not([data-canton-id-rendered])').forEach((host) => {
        const value = host.dataset.cantonId ?? '';
        const rendered = renderCantonId(value, { label: host.dataset.cantonIdLabel || undefined, copy: host.dataset.cantonIdCopy !== 'false' });
        rendered.dataset.cantonIdRendered = '';
        host.replaceWith(rendered);
    });
}
