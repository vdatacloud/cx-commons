# Contributing & Release Guide (`cx-platform`)

This document outlines git conventions, branching strategies, semantic versioning, and pre-push verification steps for `@vdatacloud/cx-commons`.

---

## 1. Branching & Commit Conventions

### Branch Strategy & Pull Request Policy

> [!IMPORTANT]
> **No Direct Pushes to `main`:** Pushing changes directly to the `main` branch is strictly prohibited. All updates must be made on feature or fix branches, pushed to remote, and merged exclusively through pull request reviews.

- `main`: Locked production-ready release code. All merges require PR review.
- `feat/<feature-name>`: New component or design token additions.
- `fix/<bug-name>`: Bug fixes and styling corrections.
- `docs/<doc-name>`: Documentation updates.

### Conventional Commits Format

All commit messages should adhere to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>
```

**Allowed Types:**
- `feat`: A new component or design token (e.g. `feat(components): add IdentityDiscovery modal`).
- `fix`: A bug fix (e.g. `fix(nav): fix theme toggle icon visibility in dark mode`).
- `docs`: Documentation updates (e.g. `docs(readme): expand architecture pointers`).
- `chore`: Maintenance, version bumps, or build script adjustments.

---

## 2. Pre-Commit / Pre-Push Checklist

Before pushing changes to `@vdatacloud/cx-commons`:

- [ ] **TypeScript Build:** Run `npm run build` to compile `index.ts` and generate declaration files without errors.
- [ ] **Lint & Format:** Ensure clean formatting across `.ts`, `.css`, and `.astro` files.
- [ ] **Downstream Smoke Test:** Verify that `daml-escrow/frontend` builds and runs cleanly against the updated package.
- [ ] **Documentation Sync:** Update `docs/COMPONENTS.md` or `docs/ARCHITECTURE.md` if props or token names were added/changed.

---

## 3. Initial Commit & Release Process

### Step 1: Initial Commit Preparation

Verify repository status:

```bash
cd /Users/dhushon/work/cx-commons
git status
```

Stage files for initial commit:

```bash
git add .
git commit -m "feat(platform): initial commit for @vdatacloud/cx-commons platform UI repository"
```

### Step 2: Semantic Versioning Policy

`@vdatacloud/cx-commons` follows [Semantic Versioning (SemVer)](https://semver.org/):

- **Patch (0.1.X):** Bug fixes, internal refactoring, non-breaking CSS tweaks.
- **Minor (0.X.0):** Backward-compatible additions of new components, design tokens, or utility classes.
- **Major (X.0.0):** Breaking changes to component prop signatures or token variable names.
