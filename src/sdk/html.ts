// Escaping for markup built as strings. Prefer DOM nodes with textContent;
// when a template literal goes into innerHTML, every interpolated value that
// came from a server, a wallet or a person goes through esc() -- attribute
// values included. Shared by the escrow portal (its FRONTEND-PROCESS F11) and
// the operator console (daml-escrow PLAN.md Phase 104).

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** v as text safe inside markup and quoted attribute values. */
export function esc(v: unknown): string {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

/** html, markup built with esc(), as nodes: for a slot that takes a string
 *  only as text, such as a pending-approvals item's `what`. */
export function fragment(html: string): DocumentFragment {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    return tpl.content;
}
