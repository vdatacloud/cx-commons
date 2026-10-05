# Releasing

## Automated (default)

Every push to `main` runs `.github/workflows/tag-release.yml`. It works out the next version from the
Conventional Commits since the last `v*` tag (`scripts/next-version.sh`, shared with every other repo). If a
release is due, it builds and tests, pushes an annotated tag, moves the floating `latest` tag to it, and
publishes `@vdatacloud/cx-commons` to npm with trusted publishing (OIDC, provenance, no stored token).
**Merging a PR is releasing it**, so the PR's commit prefixes decide the bump:

| Commits since the last tag | Bump |
|---|---|
| `type!:` or a `BREAKING CHANGE:` footer (breaks a consumer: another repo, the website) | minor |
| `feat:` (a substantial feature) or a `Deprecated:` footer | minor |
| `fix:` / `perf:` / `refactor:` / `revert:` / `build:` / `chore(deps):` (small changes, bug fixes) | patch |
| only `chore`/`docs`/`test`/`ci`/`style` | **no release** |

Majors are never automatic -- see "Major releases" below.

- **Preview:** `scripts/next-version.sh <branch>` shows what merging would release (empty output means no release).
- **Rule tests:** `scripts/test-next-version.sh` runs in CI.
- **New tarballs:** they take a few minutes to reach npm's CDN.

**Breaking the website or daml-escrow counts as breaking.** Removing or renaming an export, component prop,
CSS token or `cx.*` message key needs `type!:` or a `BREAKING CHANGE:` footer. While cx-commons is at `v0.x`,
consumers' `^0.y.z` ranges take patch releases only, so a minor (breaking or feature) release reaches them only
when they bump the range themselves.

## Major releases

A major version is a **product release** (the website or the daml-escrow platform), decided deliberately, not
triggered by a commit prefix. Until the first one, every repo stays at `v0.x`, where a minor bump is semver's
signal for a breaking change. Mark breaks with `type!:` or a `BREAKING CHANGE:` footer anyway, so the release
notes say so. To cut a major:

```bash
git checkout main && git pull && npm ci && npm run build && npm test
git tag -s v1.0.0 -m v1.0.0 && git push origin v1.0.0
```

Then publish that version (re-run the Publish step, or `npm version 1.0.0 --no-git-tag-version && npm publish`
from a trusted-publishing context). Automation continues from that tag.
