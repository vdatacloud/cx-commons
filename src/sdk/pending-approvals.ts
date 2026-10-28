// One worklist for acts waiting on several people's approval (daml-escrow
// PLAN.md Phase 91.4, Technical Debt TD-1): whatever the act -- a mandate
// change, a signer change -- each pending request shows what it does, who
// proposed it, how far it has come (n of N) and who approved, with approve /
// reject / withdraw, each asking for a reason. Framework-free DOM; every
// value is set with textContent, so nothing an app passes as text can inject
// markup. An app that describes an act richly passes a Node it built itself.
//
// Who may decide follows the shared approval process: the proposer only
// withdraws; someone who has approved does nothing more; anyone else may
// approve or reject. Without `me` all three decisions show (operators,
// tests) and the server's refusal is the answer.
//
// An act that isn't a proposal (daml-escrow PLAN.md Phase 92.5: a staged
// release its approvers approve, a compliance review's outcome) names no
// proposer and brings its own actions instead: each with its label, tone and
// whether it asks for a reason. Someone who has approved is offered only the
// actions marked for them (revoking their approval, say).

import { confirmDialog, promptDialog } from './dialogs';
import { renderCantonId } from './canton-id-view';
import { getTranslator, type Translator } from './i18n';
import './cx-messages';

export type ApprovalDecision = 'approve' | 'reject' | 'withdraw';

export interface PendingApproval {
    /** The request's id (what the decision is sent for). */
    id: string;
    /** Who proposed it: also its first approval. Empty or absent: nobody did (not shown). */
    proposedBy?: string;
    /** Who approved so far, in order, the proposer (if any) first. */
    approvals: string[];
    /** How many approvals the act needs, the proposer's included. */
    required: number;
    /** What the act does: text, or a Node the app built. */
    what: string | Node;
    /** What sort of act it is, e.g. "signer-change" (shown as a tag when kindLabel is given). */
    kind?: string;
    kindLabel?: string;
    /** A warning under the act, e.g. that it can no longer take effect. */
    note?: string;
    /** Approve isn't offered: the act can't stand, or the viewer is its subject. */
    noApprove?: boolean;
    /** Its own actions in place of approve / reject / withdraw (sent through onAction). */
    actions?: ApprovalAction[];
}

/** An act's own action, e.g. "approve" a release or "cleared" a review. */
export interface ApprovalAction {
    /** What is sent (onAction's actionId). */
    id: string;
    /** The button's text. */
    label: string;
    /** "danger" asks with the danger confirmation (default "approve"). */
    tone?: 'approve' | 'danger';
    /** Whether a reason is asked: required (default), optional, or none (confirm only). */
    reason?: 'required' | 'optional' | 'none';
    /** The confirmation's question (default cx.approvals.confirm with the label). */
    confirm?: string;
    /** Offered only to someone who has approved (e.g. revoking their approval), and to nobody else. */
    approved?: boolean;
}

export interface PendingApprovalsOptions {
    /** The viewer's party; decides which decisions they're offered. */
    me?: string;
    /** Sends a decision, with the reason given; the list doesn't change itself (the app reloads). */
    onDecide: (item: PendingApproval, decision: ApprovalDecision, reason: string) => void | Promise<void>;
    /** Sends one of an item's own actions, with the reason given ('' when none was asked or given). */
    onAction?: (item: PendingApproval, actionId: string, reason: string) => void | Promise<void>;
    /** Shows a party (default: the shared Canton id display). */
    party?: (party: string) => Node;
    /** Text when nothing is pending (default cx.approvals.empty). */
    empty?: string;
    /** Locale (default: the page's <html lang>). */
    locale?: string;
}

const ITEM = 'py-3 flex flex-wrap items-start justify-between gap-3';
const WHAT = 'text-xs font-bold text-slate-700 dark:text-slate-300';
const META = 'text-xs text-slate-400 dark:text-slate-500 mt-1 flex flex-wrap items-center gap-1';
const NOTE = 'text-xs text-status-disputed mt-1';
const TAG = 'cx-caps inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:border-slate-700 dark:text-slate-400';
const BAR = 'mt-2 h-1 w-40 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800';
const FILL = 'h-full rounded-full bg-brand-600 dark:bg-brand-400';
const DETAILS = 'mt-2 text-xs text-slate-500 dark:text-slate-400';
const BUTTON = 'cx-caps rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-widest';
const BUTTON_TONE = {
    approve: 'border-brand-600/30 text-brand-600 hover:bg-brand-600/10 dark:border-brand-400/30 dark:text-brand-400 dark:hover:bg-brand-400/10',
    reject: 'border-status-disputed/30 text-status-disputed hover:bg-status-disputed/10',
    withdraw: 'border-status-disputed/30 text-status-disputed hover:bg-status-disputed/10',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text?: string): HTMLElementTagNameMap[K] {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text !== undefined) n.textContent = text;
    return n;
}

/** The decisions viewer `me` is offered on item (all three without `me`). */
export function decisionsFor(item: PendingApproval, me?: string): ApprovalDecision[] {
    if (!me) return item.noApprove ? ['reject', 'withdraw'] : ['approve', 'reject', 'withdraw'];
    if (item.proposedBy && me === item.proposedBy) return ['withdraw'];
    if (item.approvals.includes(me)) return [];
    return item.noApprove ? ['reject'] : ['approve', 'reject'];
}

/** The item's own actions viewer `me` is offered: once they have approved, only those marked `approved`. */
export function actionsFor(item: PendingApproval, me?: string): ApprovalAction[] {
    const done = !!me && item.approvals.includes(me);
    return (item.actions ?? []).filter((a) => !!a.approved === done);
}

// act confirms, asks for the reason the action wants, then hands it to the app.
async function act(t: Translator, item: PendingApproval, a: ApprovalAction, opts: PendingApprovalsOptions): Promise<void> {
    if (!(await confirmDialog(a.confirm ?? t.t('cx.approvals.confirm', { decision: a.label }), { confirmLabel: a.label, danger: a.tone === 'danger' }))) return;
    const mode = a.reason ?? 'required';
    let reason = '';
    if (mode !== 'none') {
        const given = await promptDialog(t.t('cx.approvals.reasonPrompt'), { label: t.t('cx.approvals.reason'), required: mode === 'required' });
        if (given === null || (mode === 'required' && !given)) return;
        reason = given;
    }
    await opts.onAction?.(item, a.id, reason);
}

// decide confirms, asks for the reason, then hands the decision to the app.
async function decide(t: Translator, item: PendingApproval, d: ApprovalDecision, opts: PendingApprovalsOptions): Promise<void> {
    const label = t.t(`cx.approvals.${d}`);
    if (!(await confirmDialog(t.t('cx.approvals.confirm', { decision: label }), { confirmLabel: label, danger: d !== 'approve' }))) return;
    const reason = await promptDialog(t.t('cx.approvals.reasonPrompt'), { label: t.t('cx.approvals.reason'), required: true });
    if (reason) await opts.onDecide(item, d, reason);
}

function renderItem(t: Translator, item: PendingApproval, opts: PendingApprovalsOptions): HTMLElement {
    const party = opts.party ?? ((p: string) => renderCantonId(p, { locale: t.locale }));
    const li = el('li', ITEM);
    li.dataset.approval = item.id;
    if (item.kind) li.dataset.approvalKind = item.kind;

    const body = el('div', 'min-w-0');
    const what = el('div', WHAT);
    what.append(typeof item.what === 'string' ? document.createTextNode(item.what) : item.what);
    body.append(what);
    if (item.note) body.append(el('div', NOTE, item.note));

    const count = Math.min(item.approvals.length, item.required);
    const meta = el('div', META);
    if (item.kindLabel) meta.append(el('span', TAG, item.kindLabel));
    const progress = t.t('cx.approvals.progress', { count, required: item.required });
    if (item.proposedBy) meta.append(t.t('cx.approvals.proposedBy') + ' ', party(item.proposedBy), ` · ${progress}`);
    else meta.append(progress);
    body.append(meta);

    const bar = el('div', BAR);
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(item.required));
    bar.setAttribute('aria-valuenow', String(count));
    const fill = el('div', FILL);
    fill.style.width = `${item.required > 0 ? Math.round((100 * count) / item.required) : 0}%`;
    bar.append(fill);
    body.append(bar);

    const details = el('details', DETAILS);
    details.append(el('summary', 'cursor-pointer', t.t('cx.approvals.approvedBy', { count })));
    const who = el('ol', 'list-decimal pl-5 mt-1 space-y-1');
    for (const p of item.approvals) {
        const row = el('li');
        row.append(party(p));
        who.append(row);
    }
    details.append(who);
    body.append(details);

    const actions = el('div', 'flex gap-2');
    if (item.actions) {
        for (const a of actionsFor(item, opts.me)) {
            const b = el('button', `${BUTTON} ${BUTTON_TONE[a.tone === 'danger' ? 'reject' : 'approve']}`, a.label);
            b.type = 'button';
            b.dataset.approvalAction = a.id;
            b.addEventListener('click', () => void act(t, item, a, opts));
            actions.append(b);
        }
    } else {
        for (const d of decisionsFor(item, opts.me)) {
            const b = el('button', `${BUTTON} ${BUTTON_TONE[d]}`, t.t(`cx.approvals.${d}`));
            b.type = 'button';
            b.dataset.approvalDecision = d;
            b.addEventListener('click', () => void decide(t, item, d, opts));
            actions.append(b);
        }
    }
    li.append(body, actions);
    return li;
}

/** Renders the pending requests, or the empty text. */
export function renderPendingApprovals(items: PendingApproval[], opts: PendingApprovalsOptions): HTMLElement {
    const t = getTranslator(opts.locale);
    if (!items.length) {
        const p = el('p', 'text-xs italic text-slate-400 dark:text-slate-600', opts.empty ?? t.t('cx.approvals.empty'));
        p.dataset.approvalsEmpty = '';
        return p;
    }
    const ul = el('ul', 'divide-y divide-slate-100 dark:divide-slate-800');
    ul.dataset.approvals = '';
    for (const item of items) ul.append(renderItem(t, item, opts));
    return ul;
}

/** Replaces host's content with the list. */
export function mountPendingApprovals(host: HTMLElement, items: PendingApproval[], opts: PendingApprovalsOptions): void {
    host.replaceChildren(renderPendingApprovals(items, opts));
}
