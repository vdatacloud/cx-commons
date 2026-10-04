# Shared Component Catalog & API Reference (`cx-platform`)

> **Locale:** every component below accepts an optional `locale` prop (default: `Astro.locals.locale`, then
> `Astro.currentLocale`, then `en`) and takes its built-in text from the `cx.*` catalog in `sdk/cx-messages`;
> apps override any of it with `registerMessages`. See the README's Internationalization section.

This document provides complete prop specifications, usage examples, and rendering details for all shared Astro components exported by `@vdatacloud/cx-commons`.

---

## 1. `Nav.astro`

A glassmorphic, responsive sticky header featuring brand logo branding, dynamic route highlighting, and an inline dark-mode toggle.

### Import Path

```astro
import Nav from '@vdatacloud/cx-commons/components/Nav';
```

### Component Props (`Props` Interface)

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `navLinks` | `NavItem[]` | `[ { href: '/', label: 'Home' }, ... ]` | List of navigation links with `href` and `label`. |
| `brandName` | `string` | `'Data Cloud LLC'` | Display title for the brand header. |
| `logoSrc` | `string` | `'/favicon.svg'` | Path to brand logo image asset. |

### Data Structures

```typescript
export interface NavItem {
  href: string;
  label: string;
}
```

### Usage Example

```astro
<Nav
  brandName="Data Cloud Escrow Platform"
  logoSrc="/assets/logo.svg"
  navLinks={[
    { href: '/', label: 'Dashboard' },
    { href: '/escrows', label: 'Escrow Contracts' },
    { href: '/metrics', label: 'Velocity Metrics' },
    { href: '/docs', label: 'Documentation' }
  ]}
/>
```

---

## 2. `Footer.astro`

Standard Data Cloud footer providing legal notices, operational indicators, and navigation links.

### Import Path

```astro
import Footer from '@vdatacloud/cx-commons/components/Footer';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `showTelemetry` | `boolean` | `false` | Renders telemetry visual state parameters. |

### Usage Example

```astro
<Footer showTelemetry={false} />
```

---

## 3. `StatusBadge.astro`

A standardized status badge component that resolves state tags to design tokens from `global.css`.

### Import Path

```astro
import StatusBadge from '@vdatacloud/cx-commons/components/StatusBadge';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | N/A | Status key (e.g. `DRAFT`, `FUNDED`, `ACTIVE`, `PROPOSED`, `DISPUTED`, `SETTLED`, `FIAT_PENDING`). |
| `size` | `'sm' \| 'md'` | `'sm'` | Visual sizing variation of the badge container. |
| `colorClass` | `string` | N/A | Custom badge style class escape hatch (overrides default status style mappings). |
| `label` | `string` | N/A | Overrides the translated label (`cx.status.<STATUS>`, e.g. `FUNDED` -> "Funds committed"). |

### Usage Example

```astro
<StatusBadge status="ACTIVE" />
<StatusBadge status="FIAT_PENDING" size="md" />
<StatusBadge status="CUSTOM" colorClass="text-pink-600 bg-pink-100 border-pink-200" />
```

---

## 4. `EyebrowLabel.astro`

A small, high-emphasis label placed above primary headings or categories.

### Import Path

```astro
import EyebrowLabel from '@vdatacloud/cx-commons/components/EyebrowLabel';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `text` | `string` | N/A | Text content of the eyebrow label. Optional if slot is supplied. |
| `color` | `'brand' \| 'slate' \| 'muted'` | `'brand'` | Theme color definition. |
| `colorClass` | `string` | N/A | Custom text-color class escape hatch (overrides default color prop styles). |
| `class` | `string` | N/A | Custom layout/utility classes merged onto the root element. |

### Usage Example

```astro
<EyebrowLabel text="Escrow Milestone 1" />
<EyebrowLabel colorClass="text-status-disputed">The Problem</EyebrowLabel>
<EyebrowLabel class="px-6 py-4 text-left" text="Dimension" />
```

---

## 5. `ApiErrorNotice.astro`

The platform-wide notice for a canonical API error (the envelope defined in `daml-escrow-commons/apierror`, mirrored
by `sdk/api-error`): message, code, stage, hint, copyable request and trace ids, and collapsible details with each id
short and its full value on hover. Server-renders a plain line, then hydrates through `sdk/api-error-notice` -- the
same renderer client code uses for errors it catches (`mountApiErrorNotice(el, err)`), so both look identical.

### Import Path

```astro
import ApiErrorNotice from '@vdatacloud/cx-commons/components/ApiErrorNotice';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `error` | `ApiError` | N/A | The error -- from `parseApiError(body, status)`, or `fromCantonError(...)` for a direct Canton/wallet-gateway call. |
| `level` | `'full' \| 'summary'` | `'full'` | `summary` hides `details` and the upstream cause. |
| `class` | `string` | N/A | Classes merged onto the root element. |

### Usage Example

```astro
<ApiErrorNotice error={parseApiError(await res.text(), res.status)} level="summary" />
```

```ts
import { apiErrorFromUnknown } from '@vdatacloud/cx-commons/sdk/api-error';
import { mountApiErrorNotice } from '@vdatacloud/cx-commons/sdk/api-error-notice';
try { await act(); } catch (e) { mountApiErrorNotice(el, apiErrorFromUnknown(e)); }
```

Never fall back to `alert()` -- it blocks the page and loses the request id.

---

## 6. `CantonId.astro`

A Canton id (party, key fingerprint, transaction hash) shown the one platform way: the short form
(`relaytest::1220ebb7…4288`, identical to Go `cantonid`/`apierror.ShortID`) -- or a `label` such as the party's
display name, which UX should prefer -- with the full value on hover and a copy button. Works without JS; hydrates
through `sdk/canton-id-view` (`renderCantonId` for client-built markup, `shortCantonId` for plain text).

### Import Path

```astro
import CantonId from '@vdatacloud/cx-commons/components/CantonId';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `value` | `string` | N/A | The full id. |
| `label` | `string` | N/A | Text to show instead of the short form (e.g. the T1 name); the full id stays on hover. |
| `copy` | `boolean` | `true` | Show the copy button. |

### Usage Example

```astro
<CantonId value={escrow.beneficiary} label={names[escrow.beneficiary]} />
<CantonId value={tx.hash} copy={false} />
```
