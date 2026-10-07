# Product CX Commons Platform (`@vdatacloud/cx-commons`)

Welcome to the **`cx-platform`** shared UI foundation and developer repository for Data Cloud web applications.

---

## 1. Problem Statement

Across Data Cloud's ecosystem of products—such as the **Stablecoin Escrow Platform (`daml-escrow`)**, administrative portals, and public-facing services—frontend implementations historically faced three major operational challenges:

1. **Fragmented UI & Styling Drift:** Custom CSS resets, ad-hoc color scales, and inconsistent typography diluted brand identity and generated maintenance overhead across repositories.
2. **Duplicated Boilerplate:** Common application shells (navigation bars, footers, dark-mode toggles, cookie consent banners, identity discovery popups) were re-implemented across independent frontend codebases.
3. **Integration Overhead:** Downstream applications had to manually configure complex post-processing pipelines and font loading, increasing setup time for new product frontends.

---

## 2. Strategy

The **`cx-platform`** strategy establishes a decoupled **Design-System-as-a-Package** and **Astro Integration Engine** housed in this standalone repository (`@vdatacloud/cx-commons`).

- **Centralized Design System Tokens:** Enforces the canonical **Data Cloud Look-and-Feel (LNF)** palette (`--color-brand-*`, `--color-status-*`), typography scale (*Plus Jakarta Sans*), micro-animations, and glassmorphism utilities.
- **Zero-Configuration Astro Integration:** Exposes a custom Astro Integration plugin (`cxCommons()`) that automatically injects global stylesheets and font declarations into page Server-Side Rendering (SSR) without requiring repetitive manual imports in downstream apps.
- **Framework-Agnostic UI Foundation:** Combines Tailwind CSS utility scales with native Astro components to ship **Zero JS by default**, injecting script tags only when user interaction (e.g. dark-mode toggle, consent state persistence) is required.

---

## 3. Goals

- **Single Source of Truth:** Provide an immutable design and component reference for all Data Cloud web applications.
- **Rapid Onboarding:** Enable new applications to establish a brand-compliant layout in under 5 minutes using `astro.config.mjs`.
- **Performance & Accessibility:** Guarantee sub-second Largest Contentful Paint (LCP) performance, WCAG AA accessibility compliance, and built-in dark mode support.
- **Modular Maintainability:** Maintain clear architectural separation between domain application code (e.g., DAML contract state cards in `daml-escrow`) and platform UI code (in `cx-platform`).

---

## 4. Architecture & Package Exports

This repository publishes `@vdatacloud/cx-commons` with modular export entry points defined in `package.json`:

```
@vdatacloud/cx-commons
 ├── (default)                 --> exports index.ts (Astro integration plugin `cxCommons()`)
 ├── /styles/global.css        --> exports canonical LNF design system tokens & Tailwind rules
 ├── /components/*             --> exports shared Astro UI components (Nav, Footer, StatusBadge, EyebrowLabel, ApiErrorNotice, CantonId, LanguageSwitcher)
 ├── /sdk/*                    --> exports browser SDK helpers (i18n, cx-messages, dialogs, api-error, api-error-notice, canton-id, canton-id-view, agreement-sig, status-colors)
 └── /schema/api-error.json    --> the canonical API error JSON Schema
```

### Canonical API errors (`sdk/api-error`, `sdk/api-error-notice`, `components/ApiErrorNotice`)

Every platform service answers a refusal with one envelope, defined in Go by
[`daml-escrow-commons/apierror`](https://github.com/vdatacloud/daml-escrow-commons/tree/main/apierror)
and mirrored here byte for byte:

```json
{"error":"…","code":"LEDGER_SIGNATURE_REJECTED","status":422,"stage":"execute","hint":"…","requestId":"…",
 "upstream":{"service":"canton","grpcCode":"INVALID_ARGUMENT","cause":"…","traceId":"…","node":"…"},
 "details":{"expectedHash":"…full value…"}}
```

- **Parse anything:** `parseApiError(status, body)` / `apiErrorFromResponse(res)` read the envelope, legacy `{"error"}` bodies or plain text.
- **Canonical JSON:** `canonicalApiError(e, 'full' | 'summary')` gives the same bytes as Go. `summary` drops `details` and `upstream.cause`.
- **Display and logs:** `formatApiError(e)` gives a one-line message, `logFields(e)` gives log pairs with short ids only, and `shortId` is the shared short form (`relaytest::1220ebb7…4288`).
- **Direct Canton calls:** `fromCantonError(status, body, stage)` classifies a JSON Ledger API refusal exactly as Go's `canton.FromLedgerError` does. `apiErrorFromUnknown(err, {stage, service})` normalizes whatever a wallet SDK or direct call throws.
- **UI:**
  - `renderApiErrorNotice(e)` / `mountApiErrorNotice(el, e)` are framework-free DOM renderers. Text is set via `textContent` only, with `dark:` coverage and copy buttons.
  - `<ApiErrorNotice error={e} level="summary" />` renders the same thing server-side.

### Canton ids (`sdk/canton-id`, `sdk/canton-id-view`, `components/CantonId`)

There are three kinds of Canton id. Each has one parser and one short form, mirroring daml-escrow-commons `cantonid`:

| Kind | Format | Short form |
|---|---|---|
| fingerprint (a key) | `1220`+64 hex | `1220ebb7…4288` |
| party | `hint::fingerprint` | `relaytest::1220ebb7…4288`; the namespace is the controlling key for an external party, or the hosting participant's (shared) otherwise |
| hash | same as fingerprint | same as fingerprint |

- `parsePartyId`, `classifyCantonId`, `shortCantonId`, `isFingerprint` and `partyControlledBy` are the helpers. `api-error`'s `shortId` is `shortCantonId`.
- `renderCantonId(value, {label, copy})` / `<CantonId value={…} label="Joey Depositor" />` give one display everywhere: the short form or a label, the full value on hover, and a copy button that copies the full value. Prefer a T1 `label` over a raw party id in UX. The error notice shows every id this way.

### Agreement signing (`sdk/agreement-sig`)

How a party signs one version of an agreement, mirroring daml-escrow-commons `agreementsig` byte for byte (daml-escrow PLAN.md Phase 81). A page recomputes the hash of the content it shows, never trusting a server's copy, before a wallet signs.

- `agreementHash(version)` / `agreementCanonical` / `validateAgreementVersion`: `tripart.agreement-version/1`. Terms are a JSON object with safe-integer numbers only; money is a decimal string.
- `agreementMessage(version, hash, signer)`: the exact text a signer signs, naming their own ledger identity.
- `verifySignature(alg, publicKey, message, signature)`: `ed25519` (wallets) or `ecdsa-p256-sha256` (KMS keys such as the custodian's; strict DER, low s), through WebCrypto.
- `draftHash` / `draftMessage`: the frozen `tripart.draft-version/1` (Phase 77 drafts).

`test/fixtures/api-error`, `test/fixtures/canton-id` and `test/fixtures/agreement-sig` hold copies of the Go goldens, from the commit in `SOURCE`. After changing the Go package, run `npm run sync:api-error-fixtures`; CI fails if the copies drift.

---

### Internationalization (`sdk/i18n`, `sdk/cx-messages`)

Zero-dependency i18n for every app on the platform (English and French today; built so Japanese, Chinese and
Korean are catalog work, not a rewrite). Vocabulary follows daml-escrow's `docs/i18n/GLOSSARY.md`.

- **Messages:** an ICU MessageFormat subset -- `{name}`, `{n, plural, one {# item} other {# items}}`,
  `{kind, select, ...}` -- over `Intl.PluralRules`. Apostrophes are plain text (French), so literal braces aren't
  supported. Never concatenate fragments; word order differs between languages.
- **Catalogs:** `registerMessages({ en: {...}, fr: {...} })` -- an app's catalogs override the library defaults
  (cx-commons registers its own `cx.*` strings on import). `getTranslator(locale)` -> `t(key, params)`, falling
  back `fr-CA` -> `fr` -> `en` -> the key; `maybe(key)` returns `undefined` instead.
- **Choosing the language:** `resolveLocale({ cookie, acceptLanguage, supported })` -- the remembered choice
  (`locale` cookie, `localeCookie()` / `chooseLocale()`), else `Accept-Language`, else English. No URL prefix.
  Set `<html lang>`; client code reads it via `documentLocale()`.
- **Formatting:** `formatNumber`, `formatMoney` (always with the code; non-ISO instruments such as USDC after the
  amount; ledger Decimal strings keep their precision), `formatDate`, `formatDateTime`, `formatRelativeTime` --
  use these, never `toLocaleString()`.
- **Components** take an optional `locale` prop (else `Astro.locals.locale`, else `Astro.currentLocale`, else
  `en`). `StatusBadge` shows `cx.status.<STATUS>` (e.g. `FUNDED` -> "Funds committed"); `ApiErrorNotice` /
  `renderApiErrorNotice` translate `errors.<CODE>.message|hint` and `stages.<stage>` when the app registers them,
  keeping the server's original message in the details.
- **Language switcher:** `components/LanguageSwitcher` -- sets the `locale` cookie and reloads; pass the app's
  `locales`.
- **Dialogs:** `sdk/dialogs` -- `confirmDialog`, `promptDialog`, `formDialog`, `acknowledge`, `notifyError`,
  `showErrorIn`, `notifyInfo` replace `window.confirm`/`prompt`/`alert` in the page's language (see
  `docs/COMPONENTS.md`).
- **CJK:** elements that uppercase/letter-space carry `.cx-caps`, switched off under `:lang(ja|zh|ko)`.

## 5. Quick Start & Integration Guide

### Step 1: Install or Link Package

In your project's `package.json` (e.g. `daml-escrow/frontend/package.json`):

```json
{
  "dependencies": {
    "@vdatacloud/cx-commons": "file:../../cx-commons"
  }
}
```

### Step 2: Register the Astro Plugin

In your application's `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import cxCommons from '@vdatacloud/cx-commons';

export default defineConfig({
  integrations: [
    cxCommons() // Automatically injects global LNF CSS & font scales into SSR
  ]
});
```

### Step 3: Consume Shared Layout Components

In your Astro page layout (e.g. `src/layouts/Layout.astro`):

```astro
---
import Nav from '@vdatacloud/cx-commons/components/Nav';
import Footer from '@vdatacloud/cx-commons/components/Footer';

interface Props {
  title: string;
}
const { title } = Astro.props;
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{title}</title>
  </head>
  <body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
    <Nav brandName="Data Cloud Escrow" />
    <main class="flex-grow">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

---

## 6. Developer Documentation Index

Detailed guides for building, extending, and testing the platform are housed in the [`docs/`](./docs) directory:

- 🛠️ **[Developer Setup & Workflow Guide](./docs/DEVELOPMENT.md):** Local setup, TypeScript building, linking with downstream projects, and testing commands.
- 🏗️ **[Architecture & Design System Specification](./docs/ARCHITECTURE.md):** Deep-dive into design tokens, Astro plugin mechanics, CSS variables, and Tailwind setup.
- 🧩 **[Component Catalog & API Reference](./docs/COMPONENTS.md):** Comprehensive prop specifications, code snippets, and interactivity guidelines for all shared components.
- 🤝 **[Contributing & Release Guide](./docs/CONTRIBUTING.md):** Branching strategies, conventional commits, versioning policy, and initial commit checklists.

---

## 7. License

UNLICENSED — Proprietary to Data Cloud LLC.
