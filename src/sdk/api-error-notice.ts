// One rendering of an ApiError for every app (PLAN: platform-wide error
// UX). Framework-free DOM, so it serves both client-side errors (a failed
// fetch, a wallet or direct-Canton refusal) and server-rendered ones
// (ApiErrorNotice.astro hydrates through it). Every value is set with
// textContent -- error text can never inject markup.

import { canonicalApiError, atDetail, type ApiError, type ApiErrorDetail } from './api-error';
import { renderCantonId } from './canton-id-view';

export interface ApiErrorNoticeOptions {
    /** 'full' (default) shows details in a collapsed section; 'summary' omits them. */
    level?: ApiErrorDetail;
    /** Adds a dismiss button that calls this. */
    onDismiss?: () => void;
}

// Retryable/transient failures render in the warning tone, the rest in the
// error tone. Class strings are spelled out in full for Tailwind's scanner.
const TRANSIENT = new Set(['RATE_LIMITED', 'UNAVAILABLE', 'TIMEOUT', 'LEDGER_UNAVAILABLE', 'LEDGER_CONFLICT', 'CONFLICT']);
const TONE = {
    error: {
        box: 'border-status-disputed/30 bg-status-disputed/5 dark:border-status-disputed/20 dark:bg-status-disputed/10',
        dot: 'bg-status-disputed',
        chip: 'text-status-disputed bg-status-disputed/10 border-status-disputed/20 dark:bg-status-disputed/5 dark:border-status-disputed/10',
    },
    warning: {
        box: 'border-status-proposed/30 bg-status-proposed/5 dark:border-status-proposed/20 dark:bg-status-proposed/10',
        dot: 'bg-status-proposed',
        chip: 'text-status-proposed bg-status-proposed/10 border-status-proposed/20 dark:bg-status-proposed/5 dark:border-status-proposed/10',
    },
};
const CHIP_BASE = 'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-black tracking-widest uppercase';
const NEUTRAL_CHIP = 'text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700';
const MONO = 'font-mono text-xs break-all text-slate-700 dark:text-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-500 dark:text-slate-400';
const BUTTON = 'rounded-md border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
}

function copyButton(label: string, value: () => string): HTMLButtonElement {
    const b = el('button', BUTTON, label);
    b.type = 'button';
    b.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(value());
            b.textContent = 'Copied';
        } catch {
            b.textContent = 'Copy failed';
        }
        setTimeout(() => (b.textContent = label), 1500);
    });
    return b;
}

// row is a labeled value: ids through the shared CantonId display (short,
// full on hover, copy); plain values as-is with a copy button.
function row(label: string, value: string, asId = true): HTMLElement {
    const r = el('div', 'flex flex-wrap items-center gap-2');
    r.append(el('dt', LABEL, label));
    const dd = el('dd', 'min-w-0');
    if (asId) {
        dd.append(renderCantonId(value));
    } else {
        dd.append(el('span', MONO, value), document.createTextNode(' '), copyButton('Copy', () => value));
    }
    r.append(dd);
    return r;
}

// Known detail keys read as words a person recognizes; any other key is
// split from camelCase ("publicKeyFingerprint" -> "Public key fingerprint").
const DETAIL_LABELS: Record<string, string> = {
    party: 'Account (party)',
    partyFingerprint: 'Account key fingerprint',
    publicKeyFingerprint: 'Your key fingerprint',
    signatureReceived: 'Signature received',
    signedBy: 'Signed by key',
    signedMessage: 'What was signed',
    expectedHash: 'Expected transaction hash',
    computedHash: 'Computed transaction hash',
    ledgerUser: 'Ledger user',
    actAs: 'Acting as',
};

/** A readable label for a details key. */
export function detailLabel(key: string): string {
    const m = /^(.*)\[(\d+)\]$/.exec(key);
    const base = m ? m[1] : key;
    const label = DETAIL_LABELS[base] ??
        base.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase()).replace(/ ([A-Z])(?=[a-z])/g, (_, c) => ' ' + c.toLowerCase());
    return m ? `${label} ${Number(m[2]) + 1}` : label;
}

function detailValue(v: unknown): string {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(detailValue).join(', ');
    return JSON.stringify(v);
}

/** Renders e as a notice element (not attached). */
export function renderApiErrorNotice(e: ApiError, opts: ApiErrorNoticeOptions = {}): HTMLElement {
    const level = opts.level ?? 'full';
    const shown = atDetail(e, level);
    const tone = TRANSIENT.has(e.code) ? TONE.warning : TONE.error;

    const root = el('div', `rounded-2xl border p-4 text-sm text-slate-800 dark:text-slate-100 ${tone.box}`);
    root.setAttribute('role', 'alert');
    root.dataset.apiErrorCode = e.code;

    const layout = el('div', 'flex items-start gap-3');
    layout.append(el('span', `mt-1.5 inline-flex h-2 w-2 shrink-0 rounded-full ${tone.dot}`));
    const body = el('div', 'min-w-0 flex-1 space-y-2');
    layout.append(body);
    root.append(layout);

    const head = el('div', 'flex items-start justify-between gap-2');
    head.append(el('p', 'font-semibold', e.error));
    if (opts.onDismiss) {
        const close = el('button', BUTTON, 'Dismiss');
        close.type = 'button';
        close.addEventListener('click', () => opts.onDismiss?.());
        head.append(close);
    }
    body.append(head);

    const chips = el('div', 'flex flex-wrap gap-1.5');
    chips.append(el('span', `${CHIP_BASE} ${tone.chip}`, e.code));
    if (e.stage) chips.append(el('span', `${CHIP_BASE} ${NEUTRAL_CHIP}`, e.stage));
    if (e.upstream && (e.upstream.grpcCode || e.upstream.code)) {
        chips.append(el('span', `${CHIP_BASE} ${NEUTRAL_CHIP}`, `${e.upstream.service} ${e.upstream.grpcCode || e.upstream.code}`));
    }
    body.append(chips);

    if (e.hint) body.append(el('p', 'text-slate-600 dark:text-slate-300', e.hint));

    const meta = el('dl', 'space-y-1');
    if (e.requestId) meta.append(row('Request', e.requestId));
    if (e.upstream?.traceId) meta.append(row('Trace', e.upstream.traceId));
    if (e.upstream?.node) meta.append(row('Node', e.upstream.node, false));
    if (meta.childElementCount) body.append(meta);

    const hasDetails = shown.details && Object.keys(shown.details).length > 0;
    if (hasDetails || shown.upstream?.cause) {
        const det = el('details', 'rounded-lg border border-slate-200 p-2 dark:border-slate-700');
        det.append(el('summary', `${LABEL} cursor-pointer select-none`, 'Details'));
        const dl = el('dl', 'mt-2 space-y-1');
        if (shown.upstream?.cause) dl.append(row(`${shown.upstream.service.charAt(0).toUpperCase()}${shown.upstream.service.slice(1)} says`, shown.upstream.cause, false));
        for (const k of Object.keys(shown.details ?? {}).sort()) {
            const v = shown.details![k];
            if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
                v.forEach((x, i) => dl.append(row(detailLabel(v.length > 1 ? `${k}[${i}]` : k), x)));
            } else {
                dl.append(row(detailLabel(k), detailValue(v), typeof v === 'string'));
            }
        }
        det.append(dl);
        body.append(det);
    }

    const actions = el('div', 'flex gap-2');
    actions.append(copyButton('Copy error JSON', () => canonicalApiError(e, level)));
    body.append(actions);
    return root;
}

/** Replaces container's content with a notice for e. */
export function mountApiErrorNotice(container: HTMLElement, e: ApiError, opts: ApiErrorNoticeOptions = {}): HTMLElement {
    const notice = renderApiErrorNotice(e, opts);
    container.replaceChildren(notice);
    return notice;
}

/**
 * Renders every [data-api-error] element under root (ApiErrorNotice.astro's
 * server output): its attribute holds the canonical JSON, and
 * data-api-error-level the detail level. Already-rendered ones are skipped.
 */
export function hydrateApiErrorNotices(root: ParentNode = document): void {
    root.querySelectorAll<HTMLElement>('[data-api-error]:not([data-api-error-rendered])').forEach((host) => {
        try {
            const e = JSON.parse(host.dataset.apiError ?? '') as ApiError;
            const level = host.dataset.apiErrorLevel === 'summary' ? 'summary' : 'full';
            mountApiErrorNotice(host, e, { level });
            host.dataset.apiErrorRendered = '';
        } catch {
            // leave the server-rendered fallback text in place
        }
    });
}
