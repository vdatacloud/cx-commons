# Graph Report - cx-commons  (2026-10-28)

## Corpus Check
- 39 files · ~23,484 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 2, .css 1)

## Summary
- 383 nodes · 724 edges · 18 communities (13 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 50 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9216f960`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- api-error.ts
- i18n.ts
- Product CX Commons Platform (`@vdatacloud/cx-commons`)
- package.json
- agreement-sig.ts
- canton-id-view.ts
- Shared Component Catalog & API Reference (`cx-platform`)
- dialogs.ts
- compilerOptions
- Parser
- cx-commons color list
- test-next-version.sh
- Releasing
- EyebrowLabel.astro
- status-colors.ts
- next-version.sh
- sync-api-error-fixtures.sh
- pending-approvals.ts

## God Nodes (most connected - your core abstractions)
1. `getTranslator()` - 21 edges
2. `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` - 17 edges
3. `renderApiErrorNotice()` - 15 edges
4. `shortCantonId()` - 13 edges
5. `renderCantonId()` - 12 edges
6. `Parser` - 11 edges
7. `shortId()` - 10 edges
8. `canonicalApiError()` - 10 edges
9. `compilerOptions` - 10 edges
10. `Shared Component Catalog & API Reference (`cx-platform`)` - 10 edges

## Surprising Connections (you probably didn't know these)
- `5. Shared SDK Contracts (errors and ids)` --references--> `fromCantonError()`  [INFERRED]
  docs/ARCHITECTURE.md → src/sdk/api-error.ts
- `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` --references--> `renderApiErrorNotice()`  [INFERRED]
  README.md → src/sdk/api-error-notice.ts
- `Component Props` --references--> `ApiError`  [INFERRED]
  docs/COMPONENTS.md → src/sdk/api-error.ts
- `SDK: in-page dialogs (`sdk/dialogs`)` --references--> `ApiError`  [INFERRED]
  docs/COMPONENTS.md → src/sdk/api-error.ts
- `Canonical API errors (`sdk/api-error`, `sdk/api-error-notice`, `components/ApiErrorNotice`)` --references--> `shortId()`  [INFERRED]
  README.md → src/sdk/api-error.ts

## Import Cycles
- None detected.

## Communities (18 total, 5 thin omitted)

### Community 0 - "api-error.ts"
Cohesion: 0.07
Nodes (47): SDK: in-page dialogs (`sdk/dialogs`), Props, ApiError, ApiErrorCodes, ApiErrorDetail, apiErrorFromResponse(), ApiErrorUpstream, atDetail() (+39 more)

### Community 1 - "i18n.ts"
Cohesion: 0.08
Nodes (42): Props, t, year, Props, { t }, NavItem, Props, t (+34 more)

### Community 2 - "Product CX Commons Platform (`@vdatacloud/cx-commons`)"
Cohesion: 0.05
Nodes (39): 1. Design System Tokens (Data Cloud LNF Scale), 2. Utility Classes & Glassmorphism, 3. Astro Integration Plugin Mechanics, 4. Zero JS Policy & Theme Persistence, 5. Shared SDK Contracts (errors and ids), Architecture & Design System Specification (`cx-platform`), Brand Color Palette (`--color-brand-*`), Plugin Lifecycle Flow (+31 more)

### Community 3 - "package.json"
Cohesion: 0.05
Nodes (40): author, description, devDependencies, astro, happy-dom, @tailwindcss/typography, typescript, vitest (+32 more)

### Community 4 - "agreement-sig.ts"
Cohesion: 0.13
Nodes (30): Agreement signing (`sdk/agreement-sig`), AGREEMENT_SCHEMA, agreementCanonical(), agreementHash(), AgreementKind, agreementMessage(), AgreementSigError, AgreementSigReason (+22 more)

### Community 5 - "canton-id-view.ts"
Cohesion: 0.12
Nodes (30): 6. `CantonId.astro`, Component Props, Import Path, Usage Example, 4. Architecture & Package Exports, Canonical API errors (`sdk/api-error`, `sdk/api-error-notice`, `components/ApiErrorNotice`), Canton ids (`sdk/canton-id`, `sdk/canton-id-view`, `components/CantonId`), Pending approvals (`sdk/pending-approvals`) (+22 more)

### Community 6 - "Shared Component Catalog & API Reference (`cx-platform`)"
Cohesion: 0.08
Nodes (26): 1. `Nav.astro`, 2. `Footer.astro`, 3. `StatusBadge.astro`, 4. `EyebrowLabel.astro`, 5. `ApiErrorNotice.astro`, 7. `LanguageSwitcher.astro`, Component Props, Component Props (+18 more)

### Community 7 - "dialogs.ts"
Cohesion: 0.20
Nodes (21): Internationalization (`sdk/i18n`, `sdk/cx-messages`), apiErrorFromUnknown(), isApiError(), mountApiErrorNotice(), acknowledge(), confirmDialog(), DialogSpec, el() (+13 more)

### Community 8 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, declaration, isolatedModules, module, moduleResolution, outDir, skipLibCheck (+3 more)

### Community 10 - "cx-commons color list"
Cohesion: 0.25
Nodes (7): Action tiers (warm = dangerous, cool = safe), Brand scale (500 = logo blue), cx-commons color list, Implementation checklist, Navigation (same in both modes), Status badges, Surfaces and text

### Community 11 - "test-next-version.sh"
Cohesion: 0.70
Nodes (4): c(), expect(), test-next-version.sh script, tg()

### Community 12 - "Releasing"
Cohesion: 0.50
Nodes (3): Automated (default), Major releases, Releasing

### Community 17 - "pending-approvals.ts"
Cohesion: 0.20
Nodes (14): vitest, ApprovalDecision, BUTTON_TONE, decide(), decisionsFor(), el(), mountPendingApprovals(), PendingApproval (+6 more)

## Knowledge Gaps
- **154 isolated node(s):** `CxCommonsOptions`, `name`, `version`, `description`, `type` (+149 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `pending-approvals.ts` to `api-error.ts`, `i18n.ts`, `package.json`, `agreement-sig.ts`, `canton-id-view.ts`, `dialogs.ts`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` (e.g. with `renderApiErrorNotice()` and `acknowledge()`) actually correct?**
  _`Internationalization (`sdk/i18n`, `sdk/cx-messages`)` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CxCommonsOptions`, `name`, `version` to the rest of the system?**
  _154 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api-error.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06663141195134849 - nodes in this community are weakly interconnected._
- **Why does `Shared Component Catalog & API Reference (`cx-platform`)` connect `Shared Component Catalog & API Reference (`cx-platform`)` to `api-error.ts`, `i18n.ts`, `Product CX Commons Platform (`@vdatacloud/cx-commons`)`, `canton-id-view.ts`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `renderApiErrorNotice()` (e.g. with `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` and `.maybe()`) actually correct?**
  _`renderApiErrorNotice()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `i18n.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07918367346938776 - nodes in this community are weakly interconnected._