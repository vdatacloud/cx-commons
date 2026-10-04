// Internationalization for every app on the platform (daml-escrow PLAN.md
// Phase 71). Zero dependencies: messages use a subset of ICU MessageFormat
// over the platform's Intl, which is all French and the CJK languages need
// (CJK has no plural forms; French needs one/many/other).
//
// Rules this module exists to enforce (see daml-escrow docs/i18n/GLOSSARY.md):
//   - Whole messages with placeholders -- never concatenate fragments. Word
//     order differs between English, French, Japanese, Chinese and Korean.
//   - Plurals through {n, plural, ...}, never `n === 1 ? 'x' : 'xs'`.
//   - Numbers, money and dates only through the format* helpers below.
//
// Message syntax (ICU subset):
//   {name}                                    a parameter
//   {n, plural, =0 {none} one {# item} other {# items}}   # = the number, locale-formatted
//   {kind, select, party {a party} other {a value}}
// Apostrophes are plain text (French needs them everywhere), so -- unlike
// full ICU -- there is no quoting and literal braces are not supported.

/** A catalog: nested keys to messages. `{ errors: { NOT_FOUND: { hint: '...' } } }` is key `errors.NOT_FOUND.hint`. */
export interface Messages {
    [key: string]: string | Messages;
}

/** Catalogs by locale: `{ en: {...}, fr: {...} }`. */
export type Catalogs = Record<string, Messages>;

export type Params = Record<string, string | number | Date | null | undefined>;

export const DEFAULT_LOCALE = 'en';
/** The cookie that remembers the person's language choice (read server-side too, so SSR matches). */
export const LOCALE_COOKIE = 'locale';

// ---------------------------------------------------------------------------
// Message formatting

type Node =
    | string
    | { arg: string }
    | { arg: string; kind: 'plural'; offset: number; cases: Record<string, Node[]> }
    | { arg: string; kind: 'select'; cases: Record<string, Node[]> }
    | { pound: true };

class Parser {
    private i = 0;
    constructor(private readonly src: string) {}

    parse(): Node[] {
        const nodes = this.nodes(false, false);
        if (this.i < this.src.length) throw this.error('unexpected "}"');
        return nodes;
    }

    private error(msg: string): Error {
        return new Error(`i18n: ${msg} at ${this.i} in "${this.src}"`);
    }

    // nodes reads until end of input or an unmatched "}" (inside a case).
    private nodes(inCase: boolean, inPlural: boolean): Node[] {
        const out: Node[] = [];
        let text = '';
        while (this.i < this.src.length) {
            const c = this.src[this.i];
            if (c === '}') {
                if (!inCase) throw this.error('unexpected "}"');
                break;
            }
            if (c === '#' && inPlural) {
                if (text) out.push(text), (text = '');
                out.push({ pound: true });
                this.i++;
                continue;
            }
            if (c === '{') {
                if (text) out.push(text), (text = '');
                out.push(this.argument());
                continue;
            }
            text += c;
            this.i++;
        }
        if (text) out.push(text);
        return out;
    }

    private ws() {
        while (this.i < this.src.length && /\s/.test(this.src[this.i])) this.i++;
    }

    private word(): string {
        this.ws();
        const m = /^[^\s,{}]+/.exec(this.src.slice(this.i));
        if (!m) throw this.error('expected a name');
        this.i += m[0].length;
        return m[0];
    }

    private expect(ch: string) {
        this.ws();
        if (this.src[this.i] !== ch) throw this.error(`expected "${ch}"`);
        this.i++;
    }

    private argument(): Node {
        this.expect('{');
        const arg = this.word();
        this.ws();
        if (this.src[this.i] === '}') {
            this.i++;
            return { arg };
        }
        this.expect(',');
        const kind = this.word();
        if (kind !== 'plural' && kind !== 'select') throw this.error(`unsupported argument type "${kind}"`);
        this.expect(',');
        let offset = 0;
        const cases: Record<string, Node[]> = {};
        for (;;) {
            this.ws();
            if (this.src[this.i] === '}') {
                this.i++;
                break;
            }
            const key = this.word();
            if (kind === 'plural' && key.startsWith('offset:')) {
                offset = Number(key.slice(7));
                continue;
            }
            this.expect('{');
            cases[key] = this.nodes(true, kind === 'plural');
            this.expect('}');
        }
        if (!cases.other) throw this.error(`"${arg}" needs an "other" case`);
        return kind === 'plural' ? { arg, kind, offset, cases } : { arg, kind, cases };
    }
}

const parsed = new Map<string, Node[]>();
const pluralRules = new Map<string, Intl.PluralRules>();

function rulesFor(locale: string): Intl.PluralRules {
    let r = pluralRules.get(locale);
    if (!r) pluralRules.set(locale, (r = new Intl.PluralRules(locale)));
    return r;
}

function show(v: Params[string], locale: string): string {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return formatNumber(v, locale);
    if (v instanceof Date) return formatDate(v, locale);
    return v;
}

function render(nodes: Node[], params: Params, locale: string, pound?: number): string {
    let out = '';
    for (const n of nodes) {
        if (typeof n === 'string') out += n;
        else if ('pound' in n) out += pound === undefined ? '#' : formatNumber(pound, locale);
        else if (!('kind' in n)) out += n.arg in params ? show(params[n.arg], locale) : `{${n.arg}}`;
        else if (n.kind === 'plural') {
            const value = Number(params[n.arg] ?? 0) - n.offset;
            const exact = n.cases[`=${value + n.offset}`];
            const branch = exact ?? n.cases[rulesFor(locale).select(value)] ?? n.cases.other;
            out += render(branch, params, locale, value);
        } else {
            const branch = n.cases[String(params[n.arg] ?? 'other')] ?? n.cases.other;
            out += render(branch, params, locale, pound);
        }
    }
    return out;
}

/** Formats one message. Throws on malformed syntax (catalog tests catch that before release). */
export function formatMessage(message: string, params: Params = {}, locale: string = DEFAULT_LOCALE): string {
    let nodes = parsed.get(message);
    if (!nodes) parsed.set(message, (nodes = new Parser(message).parse()));
    return render(nodes, params, locale);
}

/** The parameter names a message uses (for catalog parity tests: every locale must use the same ones). */
export function messageParams(message: string): string[] {
    const names = new Set<string>();
    const walk = (nodes: Node[]) => {
        for (const n of nodes) {
            if (typeof n === 'string' || 'pound' in n) continue;
            names.add(n.arg);
            if ('kind' in n) Object.values(n.cases).forEach(walk);
        }
    };
    walk(new Parser(message).parse());
    return [...names].sort();
}

// ---------------------------------------------------------------------------
// Catalogs and translators

/** Flattens a catalog to dotted keys. */
export function flattenMessages(m: Messages, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(m)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (typeof v === 'string') out[key] = v;
        else Object.assign(out, flattenMessages(v, key));
    }
    return out;
}

// Two layers: a library's own defaults (cx-commons registers its strings on
// import) and the app's, which win. Order of registration doesn't matter.
const layers: { defaults: Record<string, Record<string, string>>; app: Record<string, Record<string, string>> } = {
    defaults: {},
    app: {},
};

/**
 * Adds catalogs to the shared registry that translators read. Libraries pass
 * `{ layer: 'defaults' }`; an app's own catalogs (the default layer) override
 * any library string with the same key.
 */
export function registerMessages(catalogs: Catalogs, opts: { layer?: 'defaults' | 'app' } = {}): void {
    const layer = layers[opts.layer ?? 'app'];
    for (const [locale, messages] of Object.entries(catalogs)) {
        layer[locale] = { ...layer[locale], ...flattenMessages(messages) };
    }
}

/** The locales any registered catalog covers. */
export function registeredLocales(): string[] {
    return [...new Set([...Object.keys(layers.defaults), ...Object.keys(layers.app)])].sort();
}

export interface Translator {
    readonly locale: string;
    /** The message for key, formatted; falls back to the base language, then English, then the key itself. */
    t(key: string, params?: Params): string;
    /** The message for key if one exists in this locale's chain, else undefined. */
    maybe(key: string, params?: Params): string | undefined;
    has(key: string): boolean;
}

/** fr-CA -> [fr-CA, fr, en]. */
function chain(locale: string, fallback: string): string[] {
    const out = [locale];
    const base = locale.split('-')[0];
    if (base !== locale) out.push(base);
    if (!out.includes(fallback)) out.push(fallback);
    return out;
}

/**
 * A translator over the registry (plus any catalogs passed here, which win).
 * The locale defaults to the page's `<html lang>` in the browser.
 */
export function getTranslator(locale?: string, opts: { catalogs?: Catalogs; fallback?: string } = {}): Translator {
    const loc = canonicalLocale(locale ?? documentLocale());
    const fallback = opts.fallback ?? DEFAULT_LOCALE;
    const local: Record<string, Record<string, string>> = {};
    for (const [l, m] of Object.entries(opts.catalogs ?? {})) local[l] = flattenMessages(m);
    const locales = chain(loc, fallback);
    const lookup = (key: string): { message: string; locale: string } | undefined => {
        for (const l of locales) {
            const m = local[l]?.[key] ?? layers.app[l]?.[key] ?? layers.defaults[l]?.[key];
            if (m !== undefined) return { message: m, locale: l };
        }
        return undefined;
    };
    return {
        locale: loc,
        t(key, params) {
            const hit = lookup(key);
            return hit ? formatMessage(hit.message, params, loc) : key;
        },
        maybe(key, params) {
            const hit = lookup(key);
            return hit ? formatMessage(hit.message, params, loc) : undefined;
        },
        has: (key) => lookup(key) !== undefined,
    };
}

// ---------------------------------------------------------------------------
// Choosing the locale (D11: a remembered choice, else the browser's language, else English)

/** "FR-ca" -> "fr-CA"; anything unparseable -> DEFAULT_LOCALE. */
export function canonicalLocale(tag: string | null | undefined): string {
    if (!tag) return DEFAULT_LOCALE;
    try {
        return Intl.getCanonicalLocales(tag.trim())[0] ?? DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
}

/** Accept-Language -> tags, highest quality first ("*" and q=0 dropped). */
export function parseAcceptLanguage(header: string | null | undefined): string[] {
    if (!header) return [];
    return header
        .split(',')
        .map((part, idx) => {
            const [tag, ...ps] = part.trim().split(';');
            const q = ps.map((p) => p.trim()).find((p) => p.startsWith('q='));
            return { tag: tag.trim(), q: q ? Number(q.slice(2)) : 1, idx };
        })
        .filter((x) => x.tag && x.tag !== '*' && x.q > 0 && !Number.isNaN(x.q))
        .sort((a, b) => b.q - a.q || a.idx - b.idx)
        .map((x) => x.tag);
}

/** The best supported locale for the requested ones (exact, then same language), else fallback. */
export function negotiateLocale(requested: readonly string[], supported: readonly string[], fallback = DEFAULT_LOCALE): string {
    const sup = supported.map(canonicalLocale);
    for (const r of requested) {
        const want = canonicalLocale(r);
        const exact = sup.find((s) => s.toLowerCase() === want.toLowerCase());
        if (exact) return exact;
        const lang = want.split('-')[0].toLowerCase();
        const same = sup.find((s) => s.split('-')[0].toLowerCase() === lang);
        if (same) return same;
    }
    return canonicalLocale(fallback);
}

/** The value of the locale cookie in a Cookie header, if any. */
export function readLocaleCookie(cookieHeader: string | null | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    for (const part of cookieHeader.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (k === LOCALE_COOKIE) return decodeURIComponent(v.join('='));
    }
    return undefined;
}

/** Resolves a request's locale: the remembered choice if supported, else Accept-Language, else fallback. */
export function resolveLocale(input: {
    cookie?: string | null;
    acceptLanguage?: string | null;
    supported: readonly string[];
    fallback?: string;
}): string {
    const chosen = readLocaleCookie(input.cookie);
    const requested = [...(chosen ? [chosen] : []), ...parseAcceptLanguage(input.acceptLanguage)];
    return negotiateLocale(requested, input.supported, input.fallback ?? DEFAULT_LOCALE);
}

/** A Set-Cookie / document.cookie value remembering the choice for a year. */
export function localeCookie(locale: string, maxAgeDays = 365): string {
    return `${LOCALE_COOKIE}=${encodeURIComponent(canonicalLocale(locale))}; Path=/; Max-Age=${maxAgeDays * 86400}; SameSite=Lax`;
}

/** The page's language (`<html lang>`), or DEFAULT_LOCALE outside a browser. */
export function documentLocale(): string {
    if (typeof document === 'undefined') return DEFAULT_LOCALE;
    return canonicalLocale(document.documentElement.lang || DEFAULT_LOCALE);
}

/** Remembers a choice and reloads so server-rendered text follows (browser only). */
export function chooseLocale(locale: string): void {
    document.cookie = localeCookie(locale);
    location.reload();
}

// ---------------------------------------------------------------------------
// Numbers, money and dates -- always through these, never toLocaleString()

const ISO_CURRENCY = /^[A-Z]{3}$/;

/** A number in the locale's notation. Decimal strings ("1234.5600000000", from the ledger) keep their precision. */
export function formatNumber(value: number | string, locale: string = documentLocale(), opts: Intl.NumberFormatOptions = {}): string {
    // Intl formats numeric strings as exact decimals (ES2023), so ledger Decimals don't round-trip through float.
    return new Intl.NumberFormat(locale, opts).format(value as unknown as number);
}

/**
 * An amount with its currency or instrument, always with the code (never a
 * bare "$", which is ambiguous across markets): ISO 4217 codes use the
 * locale's currency layout ("USD 1,234.56" in en, "1 234,56 USD" in fr);
 * anything else -- USDC, a deposit token -- goes after the amount
 * ("1 234,56 USDC").
 */
export function formatMoney(
    amount: number | string,
    currency: string,
    locale: string = documentLocale(),
    opts: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {},
): string {
    const digits = { minimumFractionDigits: opts.minimumFractionDigits ?? 2, maximumFractionDigits: opts.maximumFractionDigits ?? Math.max(2, opts.minimumFractionDigits ?? 2) };
    const code = currency.trim().toUpperCase();
    if (ISO_CURRENCY.test(code)) {
        try {
            return formatNumber(amount, locale, { style: 'currency', currency: code, currencyDisplay: 'code', ...digits });
        } catch {
            // fall through to the plain form
        }
    }
    return formatMessage('{amount} {code}', { amount: formatNumber(amount, locale, digits), code }, locale);
}

/** A date (default: medium date, no time). */
export function formatDate(value: Date | string | number, locale: string = documentLocale(), opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }): string {
    return new Intl.DateTimeFormat(locale, opts).format(new Date(value));
}

/** A date and time (default: medium date, short time). */
export function formatDateTime(value: Date | string | number, locale: string = documentLocale(), opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' }): string {
    return new Intl.DateTimeFormat(locale, opts).format(new Date(value));
}

/** "in 3 days", "il y a 2 heures". */
export function formatRelativeTime(value: number, unit: Intl.RelativeTimeFormatUnit, locale: string = documentLocale()): string {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
}
