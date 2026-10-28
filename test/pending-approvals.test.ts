// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decisionsFor, mountPendingApprovals, renderPendingApprovals, type ApprovalDecision, type PendingApproval } from '../src/sdk/pending-approvals';

// The Go rule's cases (daml-escrow-commons approval/testdata/decisions.json,
// copied by scripts/sync-api-error-fixtures.sh): the page offers exactly what
// the server allows. A stale request, or one about the viewer, is noApprove.
interface RuleCase {
    name: string;
    request: { proposedBy: string; approvals?: string[]; stale?: boolean; subject?: string };
    viewer: string;
    decisions: ApprovalDecision[];
}
const ruleCases: RuleCase[] = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'approval', 'decisions.json'), 'utf8'));

const dialog = () => document.querySelector<HTMLDialogElement>('dialog[data-app-dialog]')!;
const submit = () => dialog().querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
const tick = () => new Promise((r) => setTimeout(r, 0));

const grant: PendingApproval = {
    id: '00g', proposedBy: 'alice::1220aa', approvals: ['alice::1220aa'], required: 2,
    what: 'Appoint Sam for releases', kind: 'signer-change', kindLabel: 'Signers',
};

describe('pending approvals (daml-escrow PLAN.md Phase 91.4)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.lang = 'en';
    });

    it('shows what each act does, who proposed it and how far it has come', () => {
        const list = renderPendingApprovals([grant, { ...grant, id: '00m', approvals: ['alice::1220aa', 'bob::1220bb'], required: 3, kind: 'mandate-change' }], { onDecide: () => {} });
        const items = list.querySelectorAll('[data-approval]');
        expect(items).toHaveLength(2);
        expect(items[0].textContent).toContain('Appoint Sam for releases');
        expect(items[0].textContent).toContain('Signers');
        expect(items[0].textContent).toContain('1 of 2 approvals');
        expect(items[1].textContent).toContain('2 of 3 approvals');
        expect(items[1].querySelector('[role=progressbar]')!.getAttribute('aria-valuenow')).toBe('2');
        expect(items[1].querySelectorAll('details ol li')).toHaveLength(2);
        expect((items[0] as HTMLElement).dataset.approvalKind).toBe('signer-change');
    });

    it('never treats text as markup; a Node the app built is kept as is', () => {
        const rich = document.createElement('strong');
        rich.textContent = 'rich';
        const list = renderPendingApprovals([{ ...grant, what: '<img src=x onerror=alert(1)>' }, { ...grant, id: '00r', what: rich }], { onDecide: () => {} });
        expect(list.querySelector('img')).toBeNull();
        expect(list.textContent).toContain('<img src=x');
        expect(list.querySelector('strong')?.textContent).toBe('rich');
    });

    it('offers each person only the decisions the process allows', () => {
        expect(decisionsFor(grant, 'alice::1220aa')).toEqual(['withdraw']);
        expect(decisionsFor(grant, 'bob::1220bb')).toEqual(['approve', 'reject']);
        expect(decisionsFor({ ...grant, approvals: ['alice::1220aa', 'bob::1220bb'], required: 3 }, 'bob::1220bb')).toEqual([]);
        expect(decisionsFor({ ...grant, noApprove: true }, 'bob::1220bb')).toEqual(['reject']);
        expect(decisionsFor(grant)).toEqual(['approve', 'reject', 'withdraw']);
        const list = renderPendingApprovals([grant], { me: 'bob::1220bb', onDecide: () => {} });
        expect([...list.querySelectorAll<HTMLElement>('[data-approval-decision]')].map((b) => b.dataset.approvalDecision)).toEqual(['approve', 'reject']);
    });

    it.each(ruleCases)('follows the shared rule: $name', (c) => {
        const r = c.request;
        const item: PendingApproval = { id: 'x', proposedBy: r.proposedBy, approvals: r.approvals ?? [], required: 2, what: '',
            noApprove: !!r.stale || (!!r.subject && r.subject === c.viewer) };
        expect(decisionsFor(item, c.viewer || undefined)).toEqual(c.decisions);
    });

    it('confirms, asks for a reason, then hands the decision over', async () => {
        const onDecide = vi.fn();
        const host = document.createElement('div');
        document.body.append(host);
        mountPendingApprovals(host, [grant], { me: 'bob::1220bb', onDecide });
        host.querySelector<HTMLButtonElement>('[data-approval-decision=approve]')!.click();
        await tick();
        expect(dialog().textContent).toContain('Approve this request?');
        submit();
        await tick();
        dialog().querySelector('input')!.value = 'second pair of eyes';
        submit();
        await tick();
        expect(onDecide).toHaveBeenCalledWith(grant, 'approve', 'second pair of eyes');
    });

    it('a cancelled confirmation decides nothing', async () => {
        const onDecide = vi.fn();
        const host = document.createElement('div');
        document.body.append(host);
        mountPendingApprovals(host, [grant], { me: 'alice::1220aa', onDecide });
        host.querySelector<HTMLButtonElement>('[data-approval-decision=withdraw]')!.click();
        await tick();
        [...dialog().querySelectorAll('button')].find((b) => b.textContent === 'Cancel')!.click();
        await tick();
        expect(onDecide).not.toHaveBeenCalled();
    });

    it('says when nothing is pending, in the page language', () => {
        expect(renderPendingApprovals([], { onDecide: () => {} }).textContent).toBe('Nothing is waiting for approval.');
        expect(renderPendingApprovals([], { onDecide: () => {}, locale: 'fr' }).textContent).toBe('Rien n’attend d’approbation.');
        expect(renderPendingApprovals([grant], { onDecide: () => {}, locale: 'fr' }).textContent).toContain('Approbations : 1 sur 2');
    });
});
