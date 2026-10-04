import { describe, it, expect } from 'vitest';
import {
    formatMessage,
    messageParams,
    flattenMessages,
    getTranslator,
    registerMessages,
    canonicalLocale,
    parseAcceptLanguage,
    negotiateLocale,
    readLocaleCookie,
    resolveLocale,
    localeCookie,
    formatNumber,
    formatMoney,
    formatDate,
} from '../src/sdk/i18n';
import { cxMessages, CX_LOCALES } from '../src/sdk/cx-messages';

const NNBSP = ' '; // French group separator / space before "?" etc.

describe('formatMessage', () => {
    it('substitutes parameters and leaves unknown ones visible', () => {
        expect(formatMessage('Hello {name}', { name: 'Joey' })).toBe('Hello Joey');
        expect(formatMessage('Hello {name}')).toBe('Hello {name}');
    });

    it('keeps apostrophes as text (French needs them everywhere)', () => {
        expect(formatMessage("l'arbitre {name}", { name: 'Sally' }, 'fr')).toBe("l'arbitre Sally");
    });

    it('plurals follow the locale: 0 is "one" in French, "other" in English', () => {
        const m = '{n, plural, one {# escrow} other {# escrows}}';
        expect(formatMessage(m, { n: 0 }, 'en')).toBe('0 escrows');
        expect(formatMessage(m, { n: 1 }, 'en')).toBe('1 escrow');
        const fr = '{n, plural, one {# séquestre} other {# séquestres}}';
        expect(formatMessage(fr, { n: 0 }, 'fr')).toBe('0 séquestre');
        expect(formatMessage(fr, { n: 1500 }, 'fr')).toBe(`1${NNBSP}500 séquestres`);
    });

    it('exact plural cases win, and CJK falls to "other"', () => {
        const m = '{n, plural, =0 {none} one {one} other {#}}';
        expect(formatMessage(m, { n: 0 }, 'en')).toBe('none');
        expect(formatMessage('{n, plural, other {# 件}}', { n: 1 }, 'ja')).toBe('1 件');
    });

    it('select, with nested parameters', () => {
        const m = '{role, select, depositor {Depositor {name}} other {Party {name}}}';
        expect(formatMessage(m, { role: 'depositor', name: 'Joey' })).toBe('Depositor Joey');
        expect(formatMessage(m, { role: 'mediator', name: 'Sally' })).toBe('Party Sally');
    });

    it('formats numbers and dates in parameters by locale', () => {
        expect(formatMessage('{n} items', { n: 1234.5 }, 'fr')).toBe(`1${NNBSP}234,5 items`);
    });

    it('rejects malformed messages (caught by catalog tests, not in production)', () => {
        expect(() => formatMessage('{n, plural, one {x}}')).toThrow(/other/);
        expect(() => formatMessage('oops }')).toThrow();
        expect(() => formatMessage('{n, number}')).toThrow(/unsupported/);
    });

    it('lists the parameters a message uses', () => {
        expect(messageParams('{a} {n, plural, one {# {b}} other {#}}')).toEqual(['a', 'b', 'n']);
    });
});

describe('translators', () => {
    registerMessages({ en: { t1: { hello: 'Hello {name}' } }, fr: { t1: { hello: 'Bonjour {name}' } } });

    it('falls back fr-CA -> fr -> en -> the key', () => {
        registerMessages({ en: { t1: { onlyEn: 'English only' } } });
        const t = getTranslator('fr-CA');
        expect(t.locale).toBe('fr-CA');
        expect(t.t('t1.hello', { name: 'Joey' })).toBe('Bonjour Joey');
        expect(t.t('t1.onlyEn')).toBe('English only');
        expect(t.t('t1.missing')).toBe('t1.missing');
        expect(t.maybe('t1.missing')).toBeUndefined();
    });

    it('app catalogs override library defaults regardless of order', () => {
        registerMessages({ en: { cx: { dismiss: 'Close' } } });
        registerMessages(cxMessages, { layer: 'defaults' }); // a late library import must not win
        expect(getTranslator('en').t('cx.dismiss')).toBe('Close');
        registerMessages({ en: { cx: { dismiss: 'Dismiss' } } });
    });

    it('catalogs passed directly win over the registry', () => {
        expect(getTranslator('en', { catalogs: { en: { t1: { hello: 'Hi {name}' } } } }).t('t1.hello', { name: 'A' })).toBe('Hi A');
    });
});

describe('choosing the locale', () => {
    it('canonicalizes tags and survives junk', () => {
        expect(canonicalLocale('FR-ca')).toBe('fr-CA');
        expect(canonicalLocale('not a tag!')).toBe('en');
        expect(canonicalLocale(undefined)).toBe('en');
    });

    it('orders Accept-Language by quality', () => {
        expect(parseAcceptLanguage('en;q=0.5, fr-FR, fr;q=0.9, *;q=0.1, de;q=0')).toEqual(['fr-FR', 'fr', 'en']);
        expect(parseAcceptLanguage(null)).toEqual([]);
    });

    it('negotiates exact, then same language, then fallback', () => {
        expect(negotiateLocale(['fr-CA'], ['en', 'fr'])).toBe('fr');
        expect(negotiateLocale(['de', 'fr'], ['en', 'fr'])).toBe('fr');
        expect(negotiateLocale(['ja'], ['en', 'fr'])).toBe('en');
    });

    it('a remembered choice beats the browser; an unsupported one is skipped', () => {
        expect(resolveLocale({ cookie: 'a=1; locale=fr', acceptLanguage: 'en-US', supported: ['en', 'fr'] })).toBe('fr');
        expect(resolveLocale({ cookie: 'locale=xx', acceptLanguage: 'fr', supported: ['en', 'fr'] })).toBe('fr');
        expect(resolveLocale({ supported: ['en', 'fr'] })).toBe('en');
        expect(readLocaleCookie('locale=fr-CA')).toBe('fr-CA');
    });

    it('writes a year-long, path-wide cookie', () => {
        expect(localeCookie('FR')).toBe(`locale=fr; Path=/; Max-Age=${365 * 86400}; SameSite=Lax`);
    });
});

describe('numbers, money and dates', () => {
    it('formats numbers per locale, keeping ledger Decimal precision', () => {
        expect(formatNumber(1234567.891, 'en')).toBe('1,234,567.891');
        expect(formatNumber('12345678901234567.25', 'en', { maximumFractionDigits: 2 })).toBe('12,345,678,901,234,567.25');
    });

    it('money always shows the code; non-ISO instruments go after the amount', () => {
        expect(formatMoney(1234.5, 'USD', 'en')).toBe('USD 1,234.50');
        expect(formatMoney(1234.5, 'USD', 'fr')).toBe(`1${NNBSP}234,50 USD`);
        expect(formatMoney('1234.5', 'USDC', 'fr')).toBe(`1${NNBSP}234,50 USDC`);
        expect(formatMoney(1, 'usdc', 'en', { minimumFractionDigits: 4 })).toBe('1.0000 USDC');
    });

    it('formats dates per locale', () => {
        const d = new Date(Date.UTC(2026, 9, 4, 12));
        expect(formatDate(d, 'en', { dateStyle: 'medium', timeZone: 'UTC' })).toBe('Oct 4, 2026');
        expect(formatDate(d, 'fr', { dateStyle: 'medium', timeZone: 'UTC' })).toBe('4 oct. 2026');
    });
});

describe('cx-commons catalogs', () => {
    const en = flattenMessages(cxMessages.en);

    it('every locale has exactly the English keys', () => {
        for (const l of CX_LOCALES) expect(Object.keys(flattenMessages(cxMessages[l as keyof typeof cxMessages])).sort()).toEqual(Object.keys(en).sort());
    });

    it('every message parses and uses the same parameters as English', () => {
        for (const l of CX_LOCALES) {
            const m = flattenMessages(cxMessages[l as keyof typeof cxMessages]);
            for (const k of Object.keys(en)) expect([l, k, messageParams(m[k])]).toEqual([l, k, messageParams(en[k])]);
        }
    });

    it('uses the glossary: "Ledger ID", never "party ID" or "account" (D1)', () => {
        for (const v of Object.values(en)) expect(v).not.toMatch(/party id|account/i);
    });
});
