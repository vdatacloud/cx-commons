// Typed Canton identifiers -- the TypeScript mirror of daml-escrow-commons
// `cantonid` (Go), held to it by test/fixtures/canton-id/parse.json.
//
//   fingerprint  1220<64 hex>            a key ("1220" = multihash sha-256, 32 bytes)
//   party        <hint>::<fingerprint>   the namespace IS a fingerprint: the controlling
//                                        key's for an external party, the hosting
//                                        participant's (shared by its parties) otherwise
//   hash         1220<64 hex>            a transaction or topology hash (same format)
//
// The short form ("relaytest::1220ebb7…4288") is for humans only -- lossy,
// never parsed back or used to look anything up. Show it with the full
// value on hover (sdk/canton-id-view, components/CantonId).

export type CantonIdKind = 'party' | 'fingerprint' | 'other';

export interface PartyId {
    hint: string;
    /** The party's namespace: a key fingerprint. */
    namespace: string;
    /** hint::namespace, full length. */
    full: string;
    short: string;
}

const MULTIHASH = /^1220[0-9a-f]{64}$/;
// Canton's party-hint alphabet: letters, digits, '-', '_', ':' and ' ',
// never the "::" delimiter, up to 185 characters.
const HINT = /^[A-Za-z0-9_\- :]{1,185}$/;
const SHORT_HEAD = 8; // includes the 1220 prefix
const SHORT_TAIL = 4;

function shortHex(s: string): string {
    return s.length <= SHORT_HEAD + SHORT_TAIL ? s : s.slice(0, SHORT_HEAD) + '…' + s.slice(-SHORT_TAIL);
}

function shortRunes(s: string): string {
    const cps = Array.from(s); // code points, like Go runes
    if (cps.length <= SHORT_HEAD + SHORT_TAIL + 4) return s;
    return cps.slice(0, SHORT_HEAD).join('') + '…' + cps.slice(cps.length - SHORT_TAIL).join('');
}

/** True if s is a key fingerprint (or hash): 1220 + 64 lowercase hex. */
export function isFingerprint(s: string): boolean {
    return MULTIHASH.test(s);
}

/** Parses hint::fingerprint, or null. */
export function parsePartyId(s: string): PartyId | null {
    const i = s.indexOf('::');
    if (i < 0) return null;
    const hint = s.slice(0, i);
    const namespace = s.slice(i + 2);
    if (!HINT.test(hint) || hint.includes('::') || !MULTIHASH.test(namespace)) return null;
    return { hint, namespace, full: s, short: hint + '::' + shortHex(namespace) };
}

/** What s is: a party id, a fingerprint/hash, or something else. */
export function classifyCantonId(s: string): CantonIdKind {
    if (parsePartyId(s)) return 'party';
    if (MULTIHASH.test(s)) return 'fingerprint';
    return 'other';
}

/**
 * The one short form of any string (Go: cantonid.Short): a party keeps its
 * hint and shortens its namespace; a fingerprint or hash keeps 8…4; an
 * unparseable "x::y" keeps x; any other long value keeps 8…4 characters.
 */
export function shortCantonId(s: string): string {
    const party = parsePartyId(s);
    if (party) return party.short;
    if (MULTIHASH.test(s)) return shortHex(s);
    const i = s.indexOf('::');
    if (i >= 0) return s.slice(0, i) + '::' + shortRunes(s.slice(i + 2));
    return shortRunes(s);
}

/** True if key fingerprint fp alone controls party (an external party whose namespace is fp). */
export function partyControlledBy(party: PartyId, fp: string): boolean {
    return fp !== '' && party.namespace === fp;
}
