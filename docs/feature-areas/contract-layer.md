# FA-10: Contract Layer Architecture

> **Status (v1.0.0):** ✅ IMPLEMENTED — `@complior/contracts` package extracted (C-M01), SaaS migrated (C-M02), CLI pre-send validation (C-M03). Real-world integration verification — **POST web/cloud release** (V2-M05).
> **Owner:** architect
> **Created:** 2026-04-18
> **Related:** FA-06 (SDK), FA-04 (Passport), sync.types.ts, ~/PROJECT

## 1. Problem Statement

Complior CLI и Complior SaaS обмениваются данными через Sync API (4 endpoints).
Контракт данных определяется Zod schemas.

**Текущее состояние: DRIFT.**

Sync schemas определены в ДВУХ местах:
- **CLI:** `engine/core/src/types/sync.types.ts` (TypeScript, 231 строка, полная версия)
- **SaaS:** `server/lib/schemas.js` (JavaScript, копия, упрощённая версия)

Проблемы:
1. **Поля потеряны при копировании:** autonomyEvidence, permissions, constraints, oversight, disclosure, logging, projectScore, scanSummary, multiFramework — все отсутствуют в SaaS версии
2. **Структура FRIA разошлась:** CLI использует flat generalInfo + Record<unknown>, SaaS использует sections-based (6 типизированных секций) — SaaS версия БОГАЧЕ
3. **Имена полей разошлись:** CLI Finding.checkId vs SaaS Finding.tool
4. **Нет contract tests на SaaS стороне** — SaaS не валидирует fixtures
5. **Нет механизма синхронизации** — каждое изменение требует ручного копирования

## 2. Solution: @complior/contracts Package

### Архитектура

```
~/complior/engine/contracts/          ← NEW npm workspace package
├── package.json                      (@complior/contracts)
├── tsconfig.json
├── src/
│   ├── index.ts                      ← re-exports всё
│   ├── sync/
│   │   ├── passport.schema.ts        ← SyncPassportSchema (canonical)
│   │   ├── scan.schema.ts            ← SyncScanSchema (canonical)
│   │   ├── documents.schema.ts       ← SyncDocumentsSchema (canonical)
│   │   ├── fria.schema.ts            ← SyncFriaSchema (canonical, reconciled)
│   │   └── index.ts                  ← re-exports sync schemas
│   └── shared/
│       ├── enums.ts                  ← Shared enums (risk levels, domains, etc.)
│       └── index.ts
├── fixtures/
│   ├── sync-passport-full.json       ← valid sample (all fields)
│   ├── sync-passport-minimal.json    ← valid sample (required only)
│   ├── sync-scan-valid.json
│   ├── sync-documents-valid.json
│   └── sync-fria-valid.json
├── src/__tests__/
│   └── contract.test.ts              ← validates fixtures against schemas
└── dist/                             ← compiled JS (ESM + CJS dual)
```

### Dependency Graph

```
@complior/contracts                    ← source of truth (Zod schemas + fixtures)
    ↑                   ↑
    │                   │
engine/core             ~/PROJECT/server
(workspace:*)           (file:../../complior/engine/contracts)
    │                   │
    ↓                   ↓
sync.types.ts           server/lib/schemas.js
(re-exports)            (imports from @complior/contracts)
                        │
                        ↓
                    app/ (sandbox)
                    (receives validated data, no import needed)
```

### Why Not Just Move sync.types.ts?

`sync.types.ts` сейчас содержит sync schemas + mapper helpers + type exports.
Package `@complior/contracts` содержит ТОЛЬКО:
- Zod schemas (validation)
- Inferred TypeScript types
- Shared enums/constants
- Contract fixtures

НЕ содержит:
- Mapper logic (остаётся в sync.route.ts)
- SaaS-specific schemas (ToolCreateSchema остаётся в schemas.js)
- Internal CLI types (ScanResult, Finding остаются в common.types.ts)

## 3. Schema Reconciliation

### 3.1 SyncPassportSchema — CLI wins (расширяется)

CLI версия полнее. SaaS `extendedFields` catch-all заменяется на типизированные поля.

```
Canonical = CLI sync.types.ts (Groups A-F, 36 fields)
  + SaaS field length limits (max: 255, 2000, 5000)
  + SaaS version field defaults (.default(''))

Changes for SaaS:
  - REMOVE: extendedFields catch-all
  - ADD: groups D-E fields as typed (autonomyEvidence, permissions, etc.)
  - ADD: projectScore, scanSummary, multiFramework, friaCompleted, etc.
  - mergePassport.js: update to read typed fields instead of extendedFields
```

### 3.2 SyncScanSchema — Reconcile field names

```
CLI: findings[].checkId
SaaS: findings[].tool

Canonical: checkId (CLI wins — more descriptive)
SaaS mergePassport: update to use checkId
```

### 3.3 SyncFriaSchema — SaaS wins (richer structure)

SaaS версия с sections (general_info, affected_persons, specific_risks, human_oversight, mitigation_measures, monitoring_plan) БОГАЧЕ чем CLI flat версия.

```
Canonical = SaaS sections-based schema
  - 6 typed sections with field-level defaults
  - Preserves all SaaS FRIA functionality

CLI adapter: sync.route.ts maps flat AgentPassport → sections format
```

### 3.4 SyncDocumentsSchema — Already aligned ✅

Both use same structure. Only difference: SaaS has max limits.
Canonical adds max limits from SaaS.

### 3.5 Shared Enums (extracted to shared/enums.ts)

```typescript
// Currently duplicated in both repos
export const RISK_LEVELS = ['prohibited', 'high', 'gpai', 'limited', 'minimal'] as const;
export const AUTONOMY_LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
export const LIFECYCLE_STATUSES = ['draft', 'review', 'active', 'suspended', 'retired'] as const;
export const AGENT_TYPES = ['autonomous', 'assistive', 'hybrid'] as const;
export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export const DOC_QUALITY = ['none', 'scaffold', 'draft', 'reviewed'] as const;
export const SYNC_DOC_TYPES = ['fria', 'monitoring_plan', 'usage_policy', ...] as const;
export const DOMAINS = ['biometrics', 'critical_infrastructure', ...] as const;
```

## 4. Package Configuration

### package.json

```json
{
  "name": "@complior/contracts",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./sync": { "import": "./dist/sync/index.js", "types": "./dist/sync/index.d.ts" },
    "./shared": { "import": "./dist/shared/index.js", "types": "./dist/shared/index.d.ts" },
    "./fixtures/*": "./fixtures/*"
  },
  "peerDependencies": { "zod": "^3.22.0" },
  "devDependencies": { "vitest": "^3.0.0", "typescript": "^5.7.0" }
}
```

### Workspace Wiring (~/complior/package.json)

```json
{
  "workspaces": ["engine/core", "engine/npm", "engine/contracts"]
}
```

### SaaS Wiring (~/PROJECT/package.json)

```json
{
  "dependencies": {
    "@complior/contracts": "file:../complior/engine/contracts"
  }
}
```

Note: `file:` protocol works for dev. For CI/deploy: publish to npm or use Git URL.

## 5. Migration Plan

### Phase 1: Create package + fixtures (architect)
1. Create `engine/contracts/` with package.json, tsconfig.json
2. Write reconciled schemas (sync + shared enums)
3. Create fixtures (valid JSON samples for each endpoint)
4. Write contract tests
5. Wire workspace

### Phase 2: CLI migration (dev)
1. `engine/core/src/types/sync.types.ts` → re-export from `@complior/contracts/sync`
2. Update imports in sync.route.ts, saas-client.ts
3. Run existing sync-contract.test.ts — must still pass
4. Remove duplicate schema definitions

### Phase 3: SaaS migration (dev)
1. Add `@complior/contracts` to ~/PROJECT/package.json
2. Replace Sync*Schema in `server/lib/schemas.js` with imports from @complior/contracts
3. Update `app/application/sync/mergePassport.js` to read typed fields (no more extendedFields)
4. Add contract test in `~/PROJECT/tests/contract.test.js` using shared fixtures
5. Keep SaaS-specific schemas (ToolCreateSchema, etc.) in schemas.js

### Phase 4: CI enforcement
1. Add `scripts/verify_contract_sync.sh` — validates fixtures in both repos
2. CI in both repos runs contract tests
3. Breaking change in contracts = RED in both repos

## 6. What Goes Where After Migration

```
@complior/contracts (new)           engine/core (existing)          ~/PROJECT server/ (existing)
─────────────────────               ──────────────────              ────────────────────────
SyncPassportSchema                  ScanResult (internal)           ToolCreateSchema (SaaS-only)
SyncScanSchema                      Finding (internal)              ToolUpdateSchema
SyncDocumentsSchema                 AgentPassport (internal)        RequirementUpdateSchema
SyncFriaSchema                      ScoreBreakdown (internal)       FRIACreateSchema
SyncFindingSchema                   FixDiff (internal)              DocumentCreateSchema
SyncToolDetectedSchema              Passport mappers                ... (all SaaS-specific)
Shared enums                        sync.route.ts (mappers)
Contract fixtures                   saas-client.ts (HTTP client)
Contract tests
```

## 7. Risk Analysis

| Risk | Mitigation |
|------|-----------|
| SaaS mergePassport.js breaks when extendedFields removed | Phase 3 updates merge logic BEFORE deploying |
| CLI FRIA sync breaks with new sections format | sync.route.ts mapper adapts AgentPassport → sections |
| CI/CD can't resolve file: dependency | Publish to npm, or use Git URL for CI |
| SaaS server/ can't import ESM | Package exports both ESM and CJS |
| Zod version mismatch | peerDependency on zod ^3.22.0 |

## 8. Contract Test Strategy

### Fixtures (shared, in package)
```
fixtures/sync-passport-full.json     ← all 36 fields, every group
fixtures/sync-passport-minimal.json  ← only required: { name: "x" }
fixtures/sync-scan-valid.json        ← projectPath + findings + toolsDetected
fixtures/sync-documents-valid.json   ← 2 documents, different types
fixtures/sync-fria-valid.json        ← all 6 sections with data
```

### Tests
```
@complior/contracts:  src/__tests__/contract.test.ts
  - Each fixture validates against its schema
  - Invalid payloads rejected (missing required, wrong enum)
  - Zod types match fixture shapes

engine/core:          src/types/sync-contract.test.ts
  - Import schemas from @complior/contracts
  - Validate same fixtures (regression)
  - Mapper tests: AgentPassport → SyncPassportPayload

~/PROJECT:            tests/contract.test.js
  - require('@complior/contracts')
  - Validate same fixtures
  - Merge logic tests with typed fields
```

## 9. Cross-Dependencies

| Dependency | Direction | Notes |
|-----------|-----------|-------|
| FA-04 (Passport) | contracts ← passport | Passport fields define Group A-F |
| FA-06 (SDK) | SDK → contracts (not yet) | SDK may use shared enums in future |
| FA-09 (Guard) | Guard → contracts (not yet) | Guard classification may use shared risk levels |
| CLI ↔ SaaS Sync | Both import @complior/contracts | Primary use case |

## 10. Success Criteria

1. **Single source of truth**: Both CLI and SaaS import Zod schemas from @complior/contracts
2. **No more extendedFields**: All passport fields are typed in schema
3. **Fixtures pass in both repos**: Same JSON validates in CLI contract tests AND SaaS contract tests
4. **Breaking change = RED**: Changing a schema field type fails tests in both repos
5. **Zero drift**: `scripts/verify_contract_sync.sh` checks consistency

---

*FA-10 | Contract Layer | @complior/contracts | April 2026*
