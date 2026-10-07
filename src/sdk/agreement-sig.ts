// Signing one version of an agreement -- the TypeScript mirror of
// daml-escrow-commons `agreementsig` (Go), held to it byte for byte by
// test/fixtures/agreement-sig (daml-escrow PLAN.md Phase 81).
//
// A browser recomputes the version hash from the content it shows -- never
// trusting a server's copy -- before asking a wallet to sign the message,
// and can check any recorded signature offline.
//
//   tripart.draft-version/1      one off-chain escrow draft version (Phase 77)
//   tripart.agreement-version/1  one version of an agreement or amendment
//
// Both schemas are frozen: a change is a new schema, never an edit.
// Signatures name their algorithm: 'ed25519' (wallets) or
// 'ecdsa-p256-sha256' (KMS-held keys such as the custodian's; strict DER,
// low s).

export const DRAFT_SCHEMA = 'tripart.draft-version/1';
export const AGREEMENT_SCHEMA = 'tripart.agreement-version/1';

export type SignatureAlgorithm = 'ed25519' | 'ecdsa-p256-sha256';

/** Why something was refused: matches the Go errors (ErrInvalid, ErrBadSignature, ...). */
export type AgreementSigReason = 'invalid' | 'bad' | 'noncanonical' | 'unsupported' | 'key';

export class AgreementSigError extends Error {
    constructor(readonly reason: AgreementSigReason, message: string) {
        super(message);
        this.name = 'AgreementSigError';
    }
}

const invalid = (msg: string) => new AgreementSigError('invalid', `agreementsig: invalid agreement version: ${msg}`);

// --- canonical JSON ---

type NumberMode = 'any' | 'integers';

// Keys sorted by UTF-16 code units (JavaScript's default sort, as Go sorts);
// strings and numbers as JSON.stringify writes them; no whitespace.
function canon(v: unknown, mode: NumberMode): string {
    if (v === null || v === undefined) return 'null';
    if (typeof v === 'number') {
        if (!Number.isFinite(v)) throw invalid('number out of range');
        if (mode === 'integers' && !Number.isSafeInteger(v)) throw invalid(`${v} is not a safe integer (write decimals as strings)`);
        return JSON.stringify(v);
    }
    if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map((e) => canon(e, mode)).join(',') + ']';
    if (typeof v === 'object') {
        const o = v as Record<string, unknown>;
        return '{' + Object.keys(o).sort().map((k) => JSON.stringify(k) + ':' + canon(o[k], mode)).join(',') + '}';
    }
    throw invalid(`unsupported value ${typeof v}`);
}

async function sha256Hex(text: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- tripart.draft-version/1 ---

/** The draft fields a version hash covers, as the API serves them. */
export interface DraftVersionContent {
    rootId: string;
    version: number;
    contractType: string;
    amount: number;
    currency: string;
    depositorId?: string;
    beneficiaryEmail?: string;
    mediatorId?: string;
    terms?: unknown;
    metadata?: unknown;
}

/** The canonical document for a draft version. */
export function draftCanonical(d: DraftVersionContent): string {
    return canon({
        schema: DRAFT_SCHEMA,
        rootId: d.rootId,
        version: d.version,
        contractType: d.contractType ?? '',
        amount: d.amount,
        currency: d.currency ?? '',
        depositorId: d.depositorId ?? '',
        beneficiaryEmail: d.beneficiaryEmail ?? '',
        mediatorId: d.mediatorId ?? '',
        terms: d.terms ?? null,
        metadata: d.metadata ?? null,
    }, 'any');
}

/** Lowercase hex SHA-256 of the draft's canonical document. */
export function draftHash(d: DraftVersionContent): Promise<string> {
    return sha256Hex(draftCanonical(d));
}

/** The exact text a wallet signs to approve a draft version. */
export function draftMessage(rootId: string, version: number, versionHash: string): string {
    return `Tripart\nI approve version ${version} of escrow draft ${rootId}.\nVersion hash: sha256:${versionHash}`;
}

// --- tripart.agreement-version/1 ---

export type AgreementKind = 'agreement' | 'amendment';

/** One version of an agreement or amendment, in its JSON wire form. */
export interface AgreementVersion {
    agreementId: string;
    /** Counts from 1; each later version names its parent's hash. */
    version: number;
    parentHash?: string | null;
    kind: AgreementKind;
    /** Set for an amendment: the original's id and every ratified hash, oldest first. */
    amends?: { agreementId: string; ratifiedHashes: string[] } | null;
    /** The rendered document, by content only -- never where it is stored. */
    document: { sha256: string; mediaType: string; sourceSha256: string; sourceMediaType: string };
    termsSchema: string;
    /** A JSON object; numbers must be safe integers, money a decimal string. */
    terms: Record<string, unknown>;
}

const HEX_SHA256 = /^[0-9a-f]{64}$/;
const MAX_ID_BYTES = 256;
// Control characters (as Go's unicode.IsControl) and the line/paragraph
// separators: identifiers appear verbatim in signed messages.
const CONTROL = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f\\u2028\\u2029]");

function checkId(what: string, s: unknown): void {
    if (typeof s !== 'string' || s === '') throw invalid(`${what} is empty`);
    if (new TextEncoder().encode(s).length > MAX_ID_BYTES) throw invalid(`${what} is longer than ${MAX_ID_BYTES} bytes`);
    if (CONTROL.test(s)) throw invalid(`${what} contains a control character`);
}

/** Throws AgreementSigError('invalid') unless v is well formed. */
export function validateAgreementVersion(v: AgreementVersion): void {
    checkId('agreement id', v.agreementId);
    if (!Number.isSafeInteger(v.version) || v.version < 1) throw invalid('version must be 1 or more');
    const parent = v.parentHash ?? '';
    if (v.version === 1 && parent !== '') throw invalid('version 1 has no parent');
    if (v.version > 1 && !HEX_SHA256.test(parent)) throw invalid(`version ${v.version} needs its parent's hash (64 lowercase hex)`);
    if (v.kind === 'agreement') {
        if (v.amends) throw invalid('an agreement amends nothing');
    } else if (v.kind === 'amendment') {
        if (!v.amends) throw invalid('an amendment names what it amends');
        checkId('amended agreement id', v.amends.agreementId);
        if (v.amends.agreementId === v.agreementId) throw invalid("an amendment has its own id, not the agreement's");
        if (!v.amends.ratifiedHashes?.length) throw invalid("an amendment names at least the ratified agreement's hash");
        for (const h of v.amends.ratifiedHashes) if (!HEX_SHA256.test(h)) throw invalid(`ratified hash ${JSON.stringify(h)} is not 64 lowercase hex`);
    } else {
        throw invalid('kind must be "agreement" or "amendment"');
    }
    const d = v.document;
    if (!d || !HEX_SHA256.test(d.sha256) || !HEX_SHA256.test(d.sourceSha256)) throw invalid('document hashes must be 64 lowercase hex');
    checkId('document media type', d.mediaType);
    checkId('source media type', d.sourceMediaType);
    checkId('terms schema', v.termsSchema);
    if (v.terms === null || typeof v.terms !== 'object' || Array.isArray(v.terms)) throw invalid('terms must be a JSON object');
}

/** The canonical document for an agreement version (validates first). */
export function agreementCanonical(v: AgreementVersion): string {
    validateAgreementVersion(v);
    return canon({
        schema: AGREEMENT_SCHEMA,
        agreementId: v.agreementId,
        version: v.version,
        parentHash: v.parentHash || null,
        kind: v.kind,
        amends: v.amends ? { agreementId: v.amends.agreementId, ratifiedHashes: v.amends.ratifiedHashes } : null,
        document: {
            sha256: v.document.sha256,
            mediaType: v.document.mediaType,
            sourceSha256: v.document.sourceSha256,
            sourceMediaType: v.document.sourceMediaType,
        },
        termsSchema: v.termsSchema,
        terms: v.terms,
    }, 'integers');
}

/** Lowercase hex SHA-256 of the version's canonical document. */
export function agreementHash(v: AgreementVersion): Promise<string> {
    return sha256Hex(agreementCanonical(v));
}

/**
 * The exact text `signer` (their own ledger identity) signs to approve
 * version v with hash versionHash. Fixed English; the page explains it.
 */
export function agreementMessage(v: AgreementVersion, versionHash: string, signer: string): string {
    checkId('signer', signer);
    if (!HEX_SHA256.test(versionHash)) throw invalid('version hash must be 64 lowercase hex');
    validateAgreementVersion(v);
    const what = v.kind === 'amendment'
        ? `amendment ${v.agreementId} to agreement ${v.amends!.agreementId}`
        : `agreement ${v.agreementId}`;
    return `Tripart\nI, ${signer}, approve version ${v.version} of ${what}.\nVersion hash: sha256:${versionHash}`;
}

// --- signatures ---

// P-256 group order n, and n/2: a canonical signature has s <= n/2.
const P256_N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551n;
const P256_HALF_N = P256_N >> 1n;

function bytesToBigInt(b: Uint8Array): bigint {
    let n = 0n;
    for (const x of b) n = (n << 8n) | BigInt(x);
    return n;
}

// Reads one strictly-DER INTEGER at off: short-form length, minimal,
// positive. Returns its value bytes (without the sign pad) and the next
// offset.
function derInteger(der: Uint8Array, off: number): [Uint8Array, number] {
    if (der[off] !== 0x02) throw new AgreementSigError('bad', 'not a DER (r, s) sequence');
    const len = der[off + 1];
    if (len === undefined || len === 0 || len > 0x7f || off + 2 + len > der.length) throw new AgreementSigError('bad', 'not a DER (r, s) sequence');
    let v = der.subarray(off + 2, off + 2 + len);
    if (v[0] & 0x80) throw new AgreementSigError('bad', 'negative ECDSA component');
    if (v[0] === 0 && (len === 1 || !(v[1] & 0x80))) throw new AgreementSigError('bad', 'non-minimal DER integer');
    if (v[0] === 0) v = v.subarray(1);
    return [v, off + 2 + len];
}

// Strict DER (r, s) with low s -> the 64-byte r||s WebCrypto verifies.
function p256RawFromDER(der: Uint8Array): Uint8Array {
    if (der.length < 8 || der[0] !== 0x30) throw new AgreementSigError('bad', 'not a DER (r, s) sequence');
    // A P-256 signature is under 128 bytes: the long length form is loose DER.
    if (der[1] & 0x80 || der[1] !== der.length - 2) throw new AgreementSigError('bad', 'not a DER (r, s) sequence');
    const [r, next] = derInteger(der, 2);
    const [s, end] = derInteger(der, next);
    if (end !== der.length) throw new AgreementSigError('bad', 'not a DER (r, s) sequence');
    if (r.length > 32 || s.length > 32) throw new AgreementSigError('bad', 'ECDSA component too long for P-256');
    const sv = bytesToBigInt(s);
    if (bytesToBigInt(r) === 0n || sv === 0n) throw new AgreementSigError('bad', 'zero ECDSA component');
    if (sv > P256_HALF_N) throw new AgreementSigError('noncanonical', 'ECDSA signature is not in canonical low-s DER form');
    const raw = new Uint8Array(64);
    raw.set(r, 32 - r.length);
    raw.set(s, 64 - s.length);
    return raw;
}

async function importKey(format: 'raw' | 'spki', key: Uint8Array, algorithm: AlgorithmIdentifier | EcKeyImportParams): Promise<CryptoKey> {
    try {
        return await crypto.subtle.importKey(format, key as BufferSource, algorithm, false, ['verify']);
    } catch (err) {
        throw new AgreementSigError('key', `agreementsig: unusable public key: ${(err as Error).message}`);
    }
}

/**
 * Checks that signature is publicKey's signature over message under alg.
 * Resolves on success; rejects with an AgreementSigError ('bad',
 * 'noncanonical', 'unsupported' or 'key') otherwise.
 *
 * Ed25519 keys: raw 32 bytes or DER SubjectPublicKeyInfo; signature 64
 * bytes. P-256 keys: DER SubjectPublicKeyInfo; signature strict DER, low s,
 * over SHA-256 of the message.
 */
export async function verifySignature(alg: SignatureAlgorithm, publicKey: Uint8Array, message: string, signature: Uint8Array): Promise<void> {
    const data = new TextEncoder().encode(message);
    let ok: boolean;
    if (alg === 'ed25519') {
        const key = await importKey(publicKey.length === 32 ? 'raw' : 'spki', publicKey, { name: 'Ed25519' });
        if (signature.length !== 64) throw new AgreementSigError('bad', 'agreementsig: the signature does not match this message and key');
        ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, signature as BufferSource, data);
    } else if (alg === 'ecdsa-p256-sha256') {
        const key = await importKey('spki', publicKey, { name: 'ECDSA', namedCurve: 'P-256' });
        const raw = p256RawFromDER(signature);
        ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, raw as BufferSource, data);
    } else {
        throw new AgreementSigError('unsupported', `agreementsig: unsupported signature algorithm ${JSON.stringify(alg)}`);
    }
    if (!ok) throw new AgreementSigError('bad', 'agreementsig: the signature does not match this message and key');
}
