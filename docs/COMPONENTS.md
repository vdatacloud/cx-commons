# Shared Component Catalog & API Reference (`cx-platform`)

This document provides complete prop specifications, usage examples, and rendering details for all shared Astro components exported by `@vdatacloud/cx-commons`.

---

## 1. `Nav.astro`

A glassmorphic, responsive sticky header featuring brand logo branding, dynamic route highlighting, and an inline dark-mode toggle.

### Import Path

```astro
import Nav from '@vdatacloud/cx-commons/components/Nav.astro';
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
import Footer from '@vdatacloud/cx-commons/components/Footer.astro';
```

### Component Props

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `companyName` | `string` | `'Data Cloud LLC'` | Copyright holder name. |
| `year` | `number` | Current year (`new Date().getFullYear()`) | Copyright year indicator. |

### Usage Example

```astro
<Footer companyName="Data Cloud LLC" />
```

---

## 3. `ConsentBanner.astro`

An accessible, privacy-compliant cookie and analytics consent banner that persists user preference in `localStorage`.

### Import Path

```astro
import ConsentBanner from '@vdatacloud/cx-commons/components/ConsentBanner.astro';
```

### Usage Example

```astro
<ConsentBanner />
```

### Persistence Logic

- Stores consent status under `localStorage.getItem('cookieConsent')`.
- Options: `'granted'` | `'declined'`.
- Automatically hides banner on subsequent page visits once set.
