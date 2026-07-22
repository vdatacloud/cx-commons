# Product CX Commons (`@vdatacloud/cx-commons`)

Shared Product CX Commons library providing the canonical Data Cloud LNF design system tokens, Tailwind CSS rules, reusable Astro components, and an Astro Integration plugin.

---

## Features

- **Design System Tokens:** Canonical `--color-brand-*` and `--color-status-*` scales, Plus Jakarta Sans font, and glassmorphism utilities (`.glass-card`, `.glass-nav`).
- **Astro Integration:** Zero-configuration CSS injection via `astro.config.mjs`.
- **Reusable UI Components:** Production components (`Nav`, `Footer`, `ConsentBanner`, `GoogleLogin`, `IdentityDiscovery`, `UploadZone`).

---

## Quick Start & Usage

### 1. Register the Astro Integration

In your project's `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import cxCommons from '@vdatacloud/cx-commons';

export default defineConfig({
  integrations: [
    cxCommons() // Automatically injects global.css into page-ssr
  ]
});
```

### 2. Import Shared Components

```astro
---
import Nav from '@vdatacloud/cx-commons/components/Nav.astro';
import Footer from '@vdatacloud/cx-commons/components/Footer.astro';
import ConsentBanner from '@vdatacloud/cx-commons/components/ConsentBanner.astro';
---

<Nav brandName="Data Cloud LLC" />
<main>
  <!-- Page content -->
</main>
<Footer />
<ConsentBanner />
```

### 3. Direct CSS Import (Optional)

If not using the Astro plugin, import global CSS directly:

```css
@import "@vdatacloud/cx-commons/styles/global.css";
```

---

## License

UNLICENSED — Proprietary to Data Cloud LLC.
