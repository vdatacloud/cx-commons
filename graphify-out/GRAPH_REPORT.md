# Graph Report - cx-commons  (2026-11-08)

## Corpus Check
- 48 files · ~27,508 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .woff2 2, .css 1)

## Summary
- 436 nodes · 832 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 64 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c8fff9b`
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
- pending-approvals.ts
- compilerOptions
- Parser
- cx-commons color list
- test-next-version.sh
- Releasing
- EyebrowLabel.astro
- status-colors.ts
- next-version.sh
- sync-api-error-fixtures.sh
- oidc-pkce.ts
- api-client.ts

## God Nodes (most connected - your core abstractions)
1. `getTranslator()` - 21 edges
2. `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` - 17 edges
3. `renderApiErrorNotice()` - 15 edges
4. `vitest` - 13 edges
5. `shortCantonId()` - 13 edges
6. `renderCantonId()` - 12 edges
7. `Parser` - 11 edges
8. `Sign-in, API calls and markup (`sdk/oidc-pkce`, `sdk/api-client`, `sdk/html`)` - 11 edges
9. `ApiError` - 10 edges
10. `shortId()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `SDK: in-page dialogs (`sdk/dialogs`)` --references--> `ApiError`  [INFERRED]
  docs/COMPONENTS.md → src/sdk/api-error.ts
- `5. Shared SDK Contracts (errors and ids)` --references--> `fromCantonError()`  [INFERRED]
  docs/ARCHITECTURE.md → src/sdk/api-error.ts
- `Sign-in, API calls and markup (`sdk/oidc-pkce`, `sdk/api-client`, `sdk/html`)` --references--> `ApiRequestError`  [INFERRED]
  README.md → src/sdk/api-client.ts
- `Sign-in, API calls and markup (`sdk/oidc-pkce`, `sdk/api-client`, `sdk/html`)` --references--> `errorFromResponse()`  [INFERRED]
  README.md → src/sdk/api-client.ts
- `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` --references--> `renderApiErrorNotice()`  [INFERRED]
  README.md → src/sdk/api-error-notice.ts

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "api-error.ts"
Cohesion: 0.07
Nodes (45): Props, ApiError, ApiErrorCodes, ApiErrorDetail, apiErrorFromResponse(), ApiErrorUpstream, atDetail(), bounded() (+37 more)

### Community 1 - "i18n.ts"
Cohesion: 0.06
Nodes (65): 7. `LanguageSwitcher.astro`, Component Props, Import Path, Usage Example, Internationalization (`sdk/i18n`, `sdk/cx-messages`), Props, t, year (+57 more)

### Community 2 - "Product CX Commons Platform (`@vdatacloud/cx-commons`)"
Cohesion: 0.05
Nodes (38): 1. Design System Tokens (Data Cloud LNF Scale), 2. Utility Classes & Glassmorphism, 3. Astro Integration Plugin Mechanics, 4. Zero JS Policy & Theme Persistence, 5. Shared SDK Contracts (errors and ids), Architecture & Design System Specification (`cx-platform`), Brand Color Palette (`--color-brand-*`), Plugin Lifecycle Flow (+30 more)

### Community 3 - "package.json"
Cohesion: 0.04
Nodes (44): author, description, devDependencies, astro, happy-dom, @tailwindcss/typography, typescript, vitest (+36 more)

### Community 4 - "agreement-sig.ts"
Cohesion: 0.13
Nodes (30): Agreement signing (`sdk/agreement-sig`), AGREEMENT_SCHEMA, agreementCanonical(), agreementHash(), AgreementKind, agreementMessage(), AgreementSigError, AgreementSigReason (+22 more)

### Community 5 - "canton-id-view.ts"
Cohesion: 0.13
Nodes (28): 6. `CantonId.astro`, Component Props, Import Path, Usage Example, 4. Architecture & Package Exports, Canonical API errors (`sdk/api-error`, `sdk/api-error-notice`, `components/ApiErrorNotice`), Canton ids (`sdk/canton-id`, `sdk/canton-id-view`, `components/CantonId`), Props (+20 more)

### Community 6 - "Shared Component Catalog & API Reference (`cx-platform`)"
Cohesion: 0.09
Nodes (23): 1. `Nav.astro`, 2. `Footer.astro`, 3. `StatusBadge.astro`, 4. `EyebrowLabel.astro`, 5. `ApiErrorNotice.astro`, Component Props, Component Props, Component Props (+15 more)

### Community 7 - "pending-approvals.ts"
Cohesion: 0.16
Nodes (21): Pending approvals (`sdk/pending-approvals`), confirmDialog(), promptDialog(), act(), actionsFor(), ApprovalAction, ApprovalDecision, BUTTON_TONE (+13 more)

### Community 8 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, declaration, isolatedModules, module, moduleResolution, outDir, skipLibCheck (+3 more)

### Community 9 - "Parser"
Cohesion: 0.44
Nodes (3): formatMessage(), messageParams(), Parser

### Community 10 - "cx-commons color list"
Cohesion: 0.25
Nodes (7): Action tiers (warm = dangerous, cool = safe), Brand scale (500 = logo blue), cx-commons color list, Implementation checklist, Navigation (same in both modes), Status badges, Surfaces and text

### Community 11 - "test-next-version.sh"
Cohesion: 0.70
Nodes (4): c(), expect(), test-next-version.sh script, tg()

### Community 12 - "Releasing"
Cohesion: 0.50
Nodes (3): Automated (default), Major releases, Releasing

### Community 19 - "oidc-pkce.ts"
Cohesion: 0.15
Nodes (21): RFC-6749, RFC-7636, Sign-in, API calls and markup (`sdk/oidc-pkce`, `sdk/api-client`, `sdk/html`), ENTITIES, esc(), fragment(), AuthorizationRequest, base64UrlEncode() (+13 more)

### Community 20 - "api-client.ts"
Cohesion: 0.16
Nodes (9): ApiClient, ApiClientOptions, ApiRequestError, createApiClient(), json(), request(), errorFromResponse(), formatApiError() (+1 more)

## Knowledge Gaps
- **165 isolated node(s):** `CxCommonsOptions`, `name`, `version`, `description`, `type` (+160 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 189 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `package.json` to `api-error.ts`, `i18n.ts`, `agreement-sig.ts`, `canton-id-view.ts`, `pending-approvals.ts`, `oidc-pkce.ts`, `api-client.ts`?**
  _High betweenness centrality (0.307) - this node is a cross-community bridge._
- **Are the 16 inferred relationships involving `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` (e.g. with `renderApiErrorNotice()` and `acknowledge()`) actually correct?**
  _`Internationalization (`sdk/i18n`, `sdk/cx-messages`)` has 16 INFERRED edges - model-reasoned connections that need verification._
- **What connects `CxCommonsOptions`, `name`, `version` to the rest of the system?**
  _165 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api-error.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06892655367231638 - nodes in this community are weakly interconnected._
- **Why does `Shared Component Catalog & API Reference (`cx-platform`)` connect `Shared Component Catalog & API Reference (`cx-platform`)` to `i18n.ts`, `Product CX Commons Platform (`@vdatacloud/cx-commons`)`, `canton-id-view.ts`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `renderApiErrorNotice()` (e.g. with `Internationalization (`sdk/i18n`, `sdk/cx-messages`)` and `.maybe()`) actually correct?**
  _`renderApiErrorNotice()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `i18n.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05693693693693694 - nodes in this community are weakly interconnected._