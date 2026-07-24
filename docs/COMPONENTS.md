# Shared Component Catalog & API Reference (`cx-platform`)

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

## 3. `ConsentBanner.astro`

An accessible, privacy-compliant cookie and analytics consent banner that persists user preference in `localStorage`.

### Import Path

```astro
import ConsentBanner from '@vdatacloud/cx-commons/components/ConsentBanner';
```

### Usage Example

```astro
<ConsentBanner />
```

### Persistence Logic

- Stores consent status under `localStorage.getItem('cookie_consent')`.
- Format: JSON object string representing `{ analytics: boolean, advertising: boolean }`.
- Automatically hides banner on subsequent page visits once set.

---

## 4. `StatusBadge.astro`

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

### Usage Example

```astro
<StatusBadge status="ACTIVE" />
<StatusBadge status="FIAT_PENDING" size="md" />
<StatusBadge status="CUSTOM" colorClass="text-pink-600 bg-pink-100 border-pink-200" />
```

---

## 5. `EyebrowLabel.astro`

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
