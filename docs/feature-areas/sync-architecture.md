# Feature Area: Sync Contract Architecture

> **Source:** `engine/core/src/types/sync.types.ts` (единый источник правды)
> **Version:** 1.0.0
> **Date:** 2026-04-10
> **Status (v1.0.0):** 🔵 CONTRACT ONLY — schema defined + pre-send validation; полная end-to-end проверка sync — **POST web/cloud release** (V2-M05/M06)

## 1. Purpose

Единый контрактный слой между complior CLI и PROJECT SaaS. Определяет формат данных для всех sync API endpoints. Контракт определяется на стороне **поставщика** (complior), не потребителя (PROJECT).

## 2. Architecture

```
engine/core/src/types/sync.types.ts     ← SOURCE OF TRUTH (Zod schemas)
    │
    ├─→ complior CLI: валидирует перед отправкой
    │     cli/src/types/sync.rs         ← Rust mirror (serde)
    │     cli/src/headless/publish.rs   ← maps AgentPassport → SyncPassportPayload
    │
    ├─→ PROJECT SaaS: валидирует при получении
    │     app/api/sync/passport.js      ← POST /api/sync/passport
    │     app/api/sync/scan.js          ← POST /api/sync/scan
    │     app/api/sync/documents.js     ← POST /api/sync/documents
    │     app/api/sync/fria.js          ← POST /api/sync/fria
    │     app/application/sync/mergePassport.js  ← adapter: SyncPayload → AITool + RiskClassification
    │
    └─→ Contract test: sync-contract.test.ts (10 tests, validates schemas)
```

## 3. Schemas

| Schema | Endpoint | Direction | Key Fields |
|---|---|---|---|
| **SyncPassportSchema** | POST /api/sync/passport | CLI → SaaS | All 36 passport fields (no data loss) |
| **SyncScanSchema** | POST /api/sync/scan | CLI → SaaS | score, securityScore, findings[], toolsDetected[] |
| **SyncDocumentsSchema** | POST /api/sync/documents | CLI → SaaS | documents[{type, title, content}] |
| **SyncFriaSchema** | POST /api/sync/fria | CLI → SaaS | 6 FRIA sections |

## 4. SyncPassport Field Groups

| Group | Fields | Merge Rule | Storage in PROJECT |
|---|---|---|---|
| A: Identity | name, slug, description, purpose, domain | SaaS wins if exists, else CLI | AITool columns |
| B: Tech Stack | vendorName, framework, modelProvider, modelId | CLI wins | AITool columns |
| C: Compliance | compliorScore, projectScore, riskLevel, scanSummary | Dual score preserved | AITool.complianceScore + AITool.projectScore |
| D: Autonomy | autonomyLevel, autonomyEvidence, agentType | CLI wins | AITool.autonomyLevel + AITool.autonomyEvidence (JSON) |
| E: Permissions | owner, permissions, constraints, oversight, disclosure, logging | CLI wins | AITool.passportData (JSON) |
| F: Metadata | manifestVersion, signature, detectionPatterns, versions | Merge | AITool.syncMetadata (JSON) |

## 5. Cross-Dependencies

| Depends on | How |
|---|---|
| **passport.types.ts** | SyncPassport maps from AgentPassport (36 fields) |
| **common.types.ts** | SyncScan uses Finding, Severity, ScoreBreakdown types |

| Used by | How |
|---|---|
| **PROJECT/mergePassport.js** | Consumes SyncPassportPayload → AITool + RiskClassification |
| **PROJECT/processScanUpload.js** | Consumes SyncScanPayload → AITool creation |
| **CLI publish command** | Maps AgentPassport → SyncPassportPayload |
| **Rust CLI** | cli/src/types/sync.rs mirrors schemas for serde |

## 6. Conflict Resolution

| Field type | Rule | Example |
|---|---|---|
| Technical (vendorName, framework, model) | **CLI wins** | CLI scanned code, knows better |
| Organizational (purpose, domain) | **SaaS wins** if exists | Deployer manually set context |
| Risk level | **SaaS wins** if classified | Human classification > auto |
| Score | **Both preserved** | compliorScore + projectScore |
| Autonomy evidence | **CLI wins** | Code analysis > manual |

Conflicts logged in SyncHistory.conflicts JSON array.

## 7. Test Coverage

10 tests in sync-contract.test.ts:
- SyncPassportSchema: minimal, full (40 fields), empty name, invalid risk/autonomy
- SyncScanSchema: valid, missing toolsDetected
- SyncDocumentsSchema: valid, empty array
- SyncFriaSchema: valid

## 8. What's Next

| Task | Status |
|---|---|
| sync.types.ts created | ✅ Done |
| sync-contract.test.ts (10/10 GREEN) | ✅ Done |
| cli/src/types/sync.rs (Rust mirror) | ✅ Done |
| PROJECT/AITool schema update | ⬜ Needs migration |
| PROJECT/mergePassport.js expansion | ⬜ Needs update for new fields |
| CLI publish command mapping | ⬜ Needs update |
| Bidirectional sync (SaaS → CLI) | ⬜ Future |
