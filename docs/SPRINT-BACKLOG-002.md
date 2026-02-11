# Sprint Backlog 002 — AI Tool Registration + Rule-Based Classification

**Sprint Goal:** Enable deployers to register AI tools, classify risk level via rule engine, and see compliance requirements.

**Capacity:** ~55 SP | **Duration:** 2 weeks
**Baseline:** 64 unit tests, 14 E2E (Sprint 1) → **New: 51 tests (total: 115)**

---

## User Stories

### Phase 0: Specification

#### US-015: EU AI Act Classification Rules Reference (5 SP) ✅
- **File:** `docs/EU-AI-ACT-CLASSIFICATION-RULES.md`
- **AC:** All 8 Art. 5 prohibitions, 23 Annex III use cases, decision tree, domain→Annex mapping
- **Status:** Complete

---

### Phase 1: Backend

#### US-016: AI Tool CRUD API (5 SP) ✅
- **Files:** `app/api/tools/register.js`, `update.js`, `list.js`, `detail.js`, `delete.js`
- **AC:**
  - POST /api/tools — creates AITool with organizationId, wizardStep=1
  - PATCH /api/tools/:id — updates by wizard step (Zod per step)
  - GET /api/tools — paginated, filters: ?riskLevel=&domain=&status=&q=
  - GET /api/tools/:id — tool + classification + requirements[]
  - DELETE /api/tools/:id — hard-delete drafts, soft-delete classified
  - Multi-tenancy on all endpoints
  - AuditLog on all mutations
- **Tests:** 10 (tool-crud.test.js)

#### US-017: Wizard Backend — Step Validation + Auto-Save (5 SP) ✅
- **Files:** `app/application/inventory/registerTool.js`, `updateToolStep.js`
- **AC:**
  - Step 1: name required, vendorName required; catalogEntryId → pre-fill
  - Step 2: purpose required, domain required (enum)
  - Step 3: dataTypes[] required, affectedPersons[] required, vulnerableGroups boolean
  - Step 4: autonomyLevel required, humanOversight boolean, affectsNaturalPersons boolean
  - wizardStep incremented on each PATCH; wizardCompleted=true after Step 4
- **Tests:** Covered in tool-crud.test.js

#### US-018: RuleEngine Domain Service (10 SP) ✅
- **File:** `app/application/classification/services/RuleEngine.js`
- **AC:**
  - Pure function: `classify(input) → { riskLevel, confidence, matchedRules[], articleReferences[], annexCategory }`
  - All 8 Art. 5 prohibited practices with conditions and exceptions
  - All 8 Annex III domains → high-risk
  - Profiling override: affectsNaturalPersons + profiling → ALWAYS high-risk
  - Art. 6(3) exceptions: narrow procedural / improvement / pattern / preparatory
  - GPAI detection via catalogDefaultRisk
  - Art. 50 transparency: chatbot, synthetic content, deepfake, emotion
  - Context modifiers: vulnerableGroups escalation, autonomous+no-oversight escalation
  - Default minimal path
- **Tests:** 34 (rule-engine.test.js)

#### US-019: Classification Endpoint + Persistence (5 SP) ✅
- **Files:** `app/api/tools/classify.js`, `app/application/classification/classifyTool.js`
- **AC:**
  - POST /api/tools/:id/classify
  - Verifies wizardCompleted=true
  - Calls RuleEngine.classify()
  - INSERT RiskClassification, marks previous isCurrent=false
  - Updates AITool: riskLevel, complianceStatus='in_progress'
  - Maps requirements (US-020)
  - AuditLog
- **Tests:** 7 (classification.test.js)

#### US-020: Auto-Generate Deployer Requirements (3 SP) ✅
- **File:** `app/application/classification/mapRequirements.js`
- **AC:**
  - MINIMAL → Art. 4 literacy requirements
  - LIMITED/GPAI → + Art. 50 transparency
  - HIGH → + Art. 26 deployer + Art. 27 FRIA
  - PROHIBITED → Art. 5 checks only
  - Idempotent (skips existing ToolRequirements)
- **Tests:** Covered in classification.test.js

---

### Phase 2: Frontend (Wireframe-first)

#### US-021: AI Tool Inventory Page + Filters (8 SP) ✅
- **Files:**
  - `frontend/app/tools/inventory/page.tsx`
  - `frontend/components/tools/InventoryTable.tsx`
  - `frontend/components/tools/InventoryFilters.tsx`
- **AC:**
  - Search + dropdown filters (Risk, Status, Domain)
  - Buttons [+ AI-Tool hinzufügen] [Katalog durchsuchen]
  - Desktop: data table; Mobile: cards
  - Pagination, empty state, loading skeletons
  - Click row → /tools/:id

#### US-022: 5-Step Wizard UI (8 SP) ✅
- **Files:**
  - `frontend/app/tools/new/page.tsx`
  - `frontend/components/tools/wizard/WizardProgress.tsx`
  - `frontend/components/tools/wizard/Step1Tool.tsx`
  - `frontend/components/tools/wizard/Step2Usage.tsx`
  - `frontend/components/tools/wizard/Step3Data.tsx`
  - `frontend/components/tools/wizard/Step4Autonomy.tsx`
  - `frontend/components/tools/wizard/Step5Review.tsx`
- **AC:**
  - 5 states: step1..step5 + loading + classified + error
  - Client-side validation before API calls
  - Auto-save (PATCH) on each "Next"
  - POST /api/tools on Step 1 submit
  - Step 5 shows summary + [Jetzt klassifizieren] CTA

#### US-023: Classification Result Display (3 SP) ✅
- **Files:**
  - `frontend/components/classification/ClassificationResult.tsx`
  - `frontend/components/classification/RequirementsList.tsx`
- **AC:**
  - Risk badge, confidence bar, reasoning, article references
  - Deployer obligations grouped by category with status tags

#### US-024: AI Tool Detail Page (3 SP) ✅
- **Files:**
  - `frontend/app/tools/[id]/page.tsx`
  - `frontend/components/tools/ToolDetailHeader.tsx`
  - `frontend/components/tools/ToolRequirements.tsx`
- **AC:**
  - Header + 3 metric cards (risk, status, confidence)
  - Requirements tab (active), Classification + History tabs (coming soon)
  - Actions: Edit (disabled), Delete

---

## Modified Files
- `server/lib/schemas.js` — Added 10 new Zod schemas for tool validation
- `frontend/lib/api.ts` — Added tools.* API methods + TypeScript interfaces
- `frontend/components/Header.tsx` — Added Inventar navigation link

---

## New Files Summary

**Documentation (1):** `docs/EU-AI-ACT-CLASSIFICATION-RULES.md`

**Backend (9):**
```
app/api/tools/register.js
app/api/tools/update.js
app/api/tools/list.js
app/api/tools/detail.js
app/api/tools/delete.js
app/api/tools/classify.js
app/application/inventory/registerTool.js
app/application/inventory/updateToolStep.js
app/application/classification/classifyTool.js
app/application/classification/mapRequirements.js
app/application/classification/services/RuleEngine.js
```

**Frontend (15):**
```
frontend/app/tools/inventory/page.tsx
frontend/app/tools/new/page.tsx
frontend/app/tools/[id]/page.tsx
frontend/components/tools/InventoryTable.tsx
frontend/components/tools/InventoryFilters.tsx
frontend/components/tools/wizard/WizardProgress.tsx
frontend/components/tools/wizard/Step1Tool.tsx
frontend/components/tools/wizard/Step2Usage.tsx
frontend/components/tools/wizard/Step3Data.tsx
frontend/components/tools/wizard/Step4Autonomy.tsx
frontend/components/tools/wizard/Step5Review.tsx
frontend/components/classification/ClassificationResult.tsx
frontend/components/classification/RequirementsList.tsx
frontend/components/tools/ToolDetailHeader.tsx
frontend/components/tools/ToolRequirements.tsx
```

**Tests (3):**
```
tests/rule-engine.test.js     (34 tests)
tests/tool-crud.test.js       (10 tests)
tests/classification.test.js  (7 tests)
```

---

## Verification Checklist

- [x] `npm run lint` — 0 errors
- [x] `npm run type-check` — 0 errors
- [x] `npm test` — 115 tests, 0 failures (64 Sprint 1 + 51 new)
- [x] All 5 risk paths tested: prohibited, high, gpai, limited, minimal
- [x] RuleEngine: 34 tests covering all Art. 5, Annex III, Art. 50, modifiers, defaults
- [x] Multi-tenancy: organizationId enforced on all endpoints
- [x] AuditLog: on create, update, classify, delete
- [x] Frontend wireframe-only: functional UI without visual design
