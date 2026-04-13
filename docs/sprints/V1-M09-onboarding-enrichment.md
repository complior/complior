# V1-M09: Onboarding Enrichment — Dynamic Obligation Filtering

**Status:** ✅ DONE (6/6 tasks, 2460 tests GREEN, reviewer APPROVED 2026-04-13)
**Branch:** `feature/V1-M09-onboarding-enrichment`
**Created:** 2026-04-13
**Depends on:** V1-M08 (Context-Aware Scan) ✅ DONE

## Problem

`complior init` asks 4 questions (role, domain, data_types, data_storage) and produces 15-25 applicable obligations via static `risk-profile.json` lookup. The real EU AI Act has **108 obligations** with rich metadata (`applies_to_role`, `applies_to_risk_level` array, GPAI flag). Static mapping covers only 26% of the regulation surface.

**Current state:**
- `questions.ts` — 3 blocks, 4 questions
- `profile.ts` — `computeApplicableObligations(domain, riskLevel)` reads from `risk-profile.json` (36 unique OBL-IDs)
- `risk-profile.json` — 15 base + 5 high-risk + 16 domain-specific = 36 max
- `obligations.json` — 108 obligations with `applies_to_role` (both/provider/deployer), `applies_to_risk_level` (array: all/gpai/high/limited/minimal/unacceptable)

**Real obligation counts (Python simulation on 108 obligations):**

| Profile | Current (static) | Expected (dynamic) |
|---------|-----------------|-------------------|
| deployer + limited + no GPAI | ~20 | 16 |
| deployer + high + GPAI | ~25 | 46 |
| provider + high + GPAI | ~20 | 77 |
| both + high + GPAI | ~25 | 92 |

**Root cause:** `computeApplicableObligations()` uses hardcoded lists in `risk-profile.json` instead of filtering the 108 obligations by their metadata fields.

---

## Solution

### 5 new questions (9 total)

| # | Block | Question ID | Type | Why needed |
|---|-------|------------|------|------------|
| 5 | system | `system_type` | single | Distinguish standalone/feature/platform/internal (affects risk level) |
| 6 | system | `gpai_model` | single | GPAI adds 14 extra obligations (Art. 52-56) |
| 7 | deployment | `user_facing` | single | Transparency obligations differ for user-facing vs backend AI |
| 8 | deployment | `autonomous_decisions` | single | High-risk indicator: AI makes decisions without human oversight |
| 9 | deployment | `biometric_data` | single | Biometric = unacceptable/high risk trigger (Art. 5, Annex III) |

### New algorithm: filter obligations.json directly

```
Input: role, riskLevel, gpaiModel, domain
For each of 108 obligations:
  1. Role match: obl.applies_to_role in (role, 'both')
  2. Risk match: riskLevel in obl.applies_to_risk_level OR 'all' in obl.applies_to_risk_level
  3. GPAI match: if !gpaiModel → skip obligations where applies_to_risk_level == ['gpai']
  4. Domain match: optional boost (domain-specific obligations always included if role+risk match)
Output: filtered OBL-ID[]
```

No more `risk-profile.json` lookup. The 108 obligations ARE the source of truth.

---

## Tasks

### T-1: 5 new QuestionBlocks in `questions.ts` (architect) ✅ DONE

**Files:** `engine/core/src/onboarding/questions.ts`

Add 2 new blocks:
- **system** block: `system_type` (single: standalone/feature/platform/internal), `gpai_model` (single: yes/no/unknown)
- **deployment** block: `user_facing` (single: yes/no), `autonomous_decisions` (single: yes/no), `biometric_data` (single: yes/no)

Total: 3 existing blocks (role, business, data) + 2 new (system, deployment) = **5 blocks, 9 questions**.

**Verification:** `npx vitest run src/onboarding/onboarding.test.ts` — question count tests updated

### T-2: New `computeApplicableObligations()` in `profile.ts` (architect types + nodejs-dev impl) ✅ DONE

**Files:** `engine/core/src/onboarding/profile.ts`

Replace static `risk-profile.json` lookup with dynamic filter on `obligations.json`:
1. Load 108 obligations from `engine/core/data/regulations/eu-ai-act/obligations.json`
2. Filter by role: `obl.applies_to_role === role || obl.applies_to_role === 'both'`
3. Filter by risk level: `riskLevel in obl.applies_to_risk_level || 'all' in obl.applies_to_risk_level`
4. Handle GPAI: if `gpaiModel !== true` → exclude obligations where `applies_to_risk_level === ['gpai']`
5. Return filtered `obligation_id[]`

Signature change:
```typescript
// OLD
computeApplicableObligations(domain: string, riskLevel: string): string[]

// NEW
computeApplicableObligations(params: {
  role: Role
  riskLevel: string
  gpaiModel: boolean
  domain?: string
}): string[]
```

**Verification:** RED tests in T-6 → GREEN after impl

### T-3: ProfileSchema: new fields (architect) ✅ DONE

**Files:** `engine/core/src/onboarding/profile.ts`

Extend `OnboardingProfile` and `ProjectProfileSchema`:
```typescript
// In computed:
computed: {
  riskLevel: string
  applicableObligations: string[]
  estimatedScore: number
  gpaiModel: boolean         // NEW
  autonomousDecisions: boolean  // NEW
  biometricData: boolean       // NEW
  userFacing: boolean          // NEW
}

// In aiSystem:
aiSystem: {
  type: 'feature' | 'standalone' | 'platform' | 'internal'
  outputTypes: string[]
  gpaiModel: boolean           // NEW: uses GPAI foundation model
  userFacing: boolean          // NEW: end-users interact directly
  autonomousDecisions: boolean // NEW: makes decisions without human
  biometricData: boolean       // NEW: processes biometric data
}
```

**Verification:** Zod schema validates, existing tests still pass

### T-4: `complior init --reconfigure` (nodejs-dev + rust-dev)

**Files:**
- `cli/src/cli.rs` — add `--reconfigure` flag to init command
- `cli/src/headless/commands.rs` — pass flag to engine
- `engine/core/src/onboarding/wizard.ts` — `complete()` overwrites existing profile when `reconfigure: true`
- `engine/core/src/http/routes/onboarding.route.ts` — `POST /onboarding/complete` accepts `reconfigure` body param

User runs `complior init --reconfigure` → re-answers questions → profile overwritten → next scan picks up new profile.

Without this, users who already ran `init` are stuck with the old 4-question profile.

**Verification:** E2E test: init → scan → init --reconfigure → scan shows different obligation count

### T-5: Auto-detect GPAI (nodejs-dev)

**Files:** `engine/core/src/onboarding/auto-detect.ts`

Extend `autoDetect()` to detect GPAI model usage:
- Check for foundation model imports: `openai`, `anthropic`, `@google/generative-ai`, `mistralai`, `cohere`
- Check for model name patterns: `gpt-4*`, `claude-*`, `gemini-*`, `mistral-*`
- If detected → `autoDetected.gpaiModelDetected = true`

Add to `AutoDetectResult`:
```typescript
gpaiModelDetected: boolean  // NEW: found GPAI model usage in code
```

**Verification:** Unit test: project with `openai` dependency → `gpaiModelDetected: true`

### T-6: RED tests (architect) ✅ DONE — 14 new tests (24 total), all GREEN

**Files:**
- `engine/core/src/onboarding/onboarding.test.ts` — extend with new question/profile tests
- `engine/core/src/e2e/onboarding-enrichment-e2e.test.ts` — NEW E2E test

**Unit tests (RED):**
1. `questions.ts has 5 blocks and 9 questions` — count validation
2. `computeApplicableObligations returns 16 for deployer+limited+noGPAI` — exact number
3. `computeApplicableObligations returns 46 for deployer+high+GPAI` — exact number
4. `computeApplicableObligations returns 77 for provider+high+GPAI` — exact number
5. `computeApplicableObligations returns 92 for both+high+GPAI` — exact number
6. `computeApplicableObligations excludes GPAI obligations when gpaiModel=false`
7. `ProfileSchema validates new fields (gpaiModel, autonomousDecisions, biometricData, userFacing)`
8. `autoDetect detects GPAI model from openai dependency`

**E2E tests (RED):**
1. `POST /onboarding/complete with 9 answers → profile has dynamic obligations`
2. `GET /onboarding/questions returns 5 blocks`
3. `scan after enriched init → filterContext.applicableObligationCount matches profile`

**Verification:** All RED initially. GREEN after T-1..T-5 implemented.

---

## Verification Table

| # | Task | Agent | Verification | Files |
|---|------|-------|-------------|-------|
| T-1 | 5 new QuestionBlocks | architect | ✅ unit: question count = 9 | `onboarding/questions.ts` |
| T-2 | Dynamic computeApplicableObligations | architect+nodejs-dev | ✅ unit: 4 profile scenarios with exact counts | `onboarding/profile.ts` |
| T-3 | ProfileSchema new fields | architect | ✅ unit: Zod validates, existing tests pass | `onboarding/profile.ts` |
| T-4 | `--reconfigure` flag | nodejs-dev+rust-dev | ✅ E2E: init → scan → reconfigure → scan different | `cli.rs`, `wizard.ts`, `onboarding.route.ts` |
| T-5 | Auto-detect GPAI | nodejs-dev | ✅ unit: openai dep → gpaiModelDetected=true | `auto-detect.ts` |
| T-6 | RED tests | architect | ✅ 14 new tests, 24 total, all GREEN | `onboarding.test.ts` |

---

## Предусловия среды (architect обеспечивает)

- [x] V1-M08 merged (context-scan pipeline works)
- [ ] `npm install` в engine/core
- [ ] `cargo build` компилируется
- [ ] `npx vitest run` запускается (RED тесты — ок)
- [ ] `cargo test` запускается
- [ ] НЕ нужен Docker
- [ ] НЕ нужен OPENROUTER_API_KEY
- [ ] НЕ нужен daemon

---

## UX Result

**Before (4 questions, static mapping):**
```
$ complior init
? Role: deployer
? Domain: healthcare
? Data types: health
? Storage: eu
→ Profile: 20 applicable obligations (from 36 static list)

$ complior scan
Score: 68/100  (20 obligations checked)
```

**After (9 questions, dynamic filtering):**
```
$ complior init
? Role: deployer
? Domain: healthcare
? Data types: health
? Storage: eu
? System type: feature (integrated AI)
? Uses GPAI model: yes (detected: openai in package.json)
? User-facing: yes
? Autonomous decisions: no
? Biometric data: no
→ Profile: 46 applicable obligations (from 108, filtered by metadata)

$ complior scan
Filtered for: deployer, high risk, healthcare, GPAI
46/108 obligations apply · 48 provider-only filtered · 14 risk-filtered
Score: 72/100
```

---

## Dependencies

```
V1-M08 (context-scan) ✅ → V1-M09 (enrichment) → V1-M10 (score transparency)
                                    ↓
                            V1-M07 (ISO 42001) — independent, can run in parallel
```
