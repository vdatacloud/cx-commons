# Developer Setup & Workflow Guide (`cx-platform`)

This guide details the local setup, build process, workspace linking strategy, and verification steps for developers working on **`@vdatacloud/cx-commons`**.

---

## 1. Prerequisites

Ensure your local system meets the following requirements:

- **Node.js:** `>= 18.0.0` (LTS recommended)
- **NPM:** `>= 9.0.0`
- **TypeScript:** `^5.7.0` (managed via local devDependencies)
- **Astro:** `^5.0.0` or `^7.0.0` (in host application)

---

## 2. Directory Structure

```
cx-commons/
 ├── index.ts               # Astro plugin export entry point
 ├── package.json           # Package definition & export mappings
 ├── tsconfig.json          # TypeScript compiler configuration
 ├── README.md              # Root overview & architecture pointer
 ├── docs/                  # Developer documentation
 │   ├── DEVELOPMENT.md     # Setup & workflow guide (this document)
 │   ├── ARCHITECTURE.md    # Design system & plugin architecture
 │   ├── COMPONENTS.md      # Component catalog & prop reference
 │   └── CONTRIBUTING.md    # Release & git conventions
 └── src/
     ├── components/        # Shared Astro components (.astro)
     │   ├── ConsentBanner.astro
     │   ├── Footer.astro
     │   └── Nav.astro
     └── styles/            # Canonical design system & CSS
         └── global.css
```

---

## 3. Installation & Local Building

Clone the repository and install dependencies:

```bash
cd /Users/dhushon/work/cx-commons
npm install
```

To compile the TypeScript bundle (`index.ts` -> `dist/`):

```bash
npm run build
```

---

## 4. Downstream Application Integration Workflow

During active local development, downstream applications (such as `daml-escrow/frontend`) consume `cx-commons` via local file references or NPM linking.

### Option A: Local File Reference (Recommended for Mono-repo / Workspaces)

In the downstream application's `package.json` (e.g., `/Users/dhushon/work/daml-escrow/frontend/package.json`):

```json
{
  "dependencies": {
    "@vdatacloud/cx-commons": "file:../../cx-commons"
  }
}
```

Run `npm install` inside the downstream application folder to create the symlink:

```bash
cd /Users/dhushon/work/daml-escrow/frontend
npm install
```

### Option B: NPM Link

1. Register `cx-commons` globally:
   ```bash
   cd /Users/dhushon/work/cx-commons
   npm link
   ```
2. Link inside downstream application:
   ```bash
   cd /Users/dhushon/work/daml-escrow/frontend
   npm link @vdatacloud/cx-commons
   ```

---

## 5. Verification & Testing Checklist

Before committing changes to `@vdatacloud/cx-commons`:

1. **TypeScript Build Verification:**
   ```bash
   npm run build
   ```
   Ensure no type errors are raised by `tsc`.

2. **Downstream Dev Server Smoke Test:**
   ```bash
   cd /Users/dhushon/work/daml-escrow/frontend
   npm run dev
   ```
   Verify that:
   - Global LNF styles (`--color-brand-*`) apply properly.
   - Navigation header and footer render cleanly.
   - Dark mode toggle operates without console errors.

3. **Production Build Smoke Test:**
   ```bash
   cd /Users/dhushon/work/daml-escrow/frontend
   npm run build
   ```
   Verify that the Astro static build succeeds with injected CSS.
