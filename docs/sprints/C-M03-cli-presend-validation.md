# C-M03: CLI Pre-Send Validation

**Status:** RED
**Created:** 2026-04-18
**Depends on:** C-M02 ✅ DONE
**Feature Areas:** FA-06 (SDK), FA-10 (Contracts)
**Goal:** All 4 sync endpoints validate payloads via `safeParse()` before sending to SaaS. Invalid data is logged and skipped, never sent.

## Context

C-M02 established `@complior/contracts` as the single source of truth for sync schemas. Both repos import the same Zod schemas. However, an **asymmetry** exists:

- **SaaS** validates ALL 4 incoming sync endpoints via `validateSync(body, schema)` — passport, scan, documents, FRIA
- **CLI** validates only **FRIA** before sending (line 287 of `sync.route.ts`). Passport, scan, and documents are sent **without validation**.

This means malformed data from a corrupt manifest or broken scan result silently reaches SaaS, where it either fails with a cryptic 400 error or (worse) gets accepted with missing fields.

**Fix:** Apply the same `safeParse()` pattern (already used for FRIA) to the remaining 3 endpoints: passport, scan, and documents.

## Scope: 1 file, ~25 lines of code

**File:** `engine/core/src/http/routes/sync.route.ts`

### Change 1: Import (line 5)
```typescript
// BEFORE:
import { SyncFriaSchema } from '@complior/contracts/sync';
// AFTER:
import { SyncPassportSchema, SyncScanSchema, SyncDocumentsSchema, SyncFriaSchema } from '@complior/contracts/sync';
```

### Change 2: Passport endpoint (line 198)
Add `SyncPassportSchema.safeParse(payload)` after `mapPassport()`. On failure: log warning, push `{ action: 'skipped' }`, `continue`.

### Change 3: Scan endpoint (line 260)
Add `SyncScanSchema.safeParse(payload)` after building the payload. On failure: log warning, return error JSON (not in a loop, so `return` not `continue`).

### Change 4: Documents endpoint (line 344)
Add `SyncDocumentsSchema.safeParse({ documents })` before `client.syncDocuments()`. On failure: log warning, return error JSON.

### Existing pattern (FRIA, lines 287-292 — keep as-is):
```typescript
const friaParseResult = SyncFriaSchema.safeParse(payload);
if (!friaParseResult.success) {
  log.warn(`FRIA ${file} validation failed, skipping: ${friaParseResult.error.message}`);
  results.push({ name: file, action: 'skipped', error: `Validation failed: ...` });
  continue;
}
const result = await client.syncFria(token, friaParseResult.data);
```

## Prerequisites

- [x] @complior/contracts@0.10.0 with all 4 schemas (SyncPassportSchema, SyncScanSchema, SyncDocumentsSchema, SyncFriaSchema)
- [x] C-M02 DONE — CLI imports from @complior/contracts
- [x] FRIA validation pattern exists as reference implementation
- [x] npm install in engine/core
- [x] npm test runs (RED schema tests OK, env errors NO)

## RED Test Specs

**File:** `engine/core/src/http/routes/__tests__/sync-route-contracts.test.ts`

### Block 1: CLI pre-send validation: passport (3 tests)
| Test | What it verifies |
|------|-----------------|
| `valid passport passes SyncPassportSchema.safeParse()` | Minimal valid payload from `mapPassport()` validates |
| `passport without name is rejected by safeParse()` | `name` is required (`.min(1)`) |
| `passport with name exceeding 255 chars is rejected` | `name` has `.max(255)` constraint |

### Block 2: CLI pre-send validation: scan (4 tests)
| Test | What it verifies |
|------|-----------------|
| `valid scan payload passes SyncScanSchema.safeParse()` | Standard scan output validates |
| `scan without toolsDetected is rejected` | `toolsDetected` is required, not optional |
| `scan with empty toolsDetected is rejected (min 1)` | `toolsDetected` has `.min(1)` |
| `scan with score > 100 is rejected` | `score` has `.max(100)` constraint |

### Block 3: CLI pre-send validation: documents (4 tests)
| Test | What it verifies |
|------|-----------------|
| `valid documents payload passes SyncDocumentsSchema.safeParse()` | Valid doc payload validates |
| `documents with empty array is rejected (min 1)` | `documents` has `.min(1)` |
| `document with invalid type is rejected` | `type` uses `z.enum(SYNC_DOC_TYPES)` |
| `document with empty content is rejected` | `content` has `.min(1)` |

**Note:** These tests validate schema behavior (safeParse boundaries), so they are GREEN immediately. The acceptance script validates that `sync.route.ts` actually USES these schemas (FAIL until implementation).

## Acceptance Script

**File:** `scripts/verify_presend_validation.sh`

Verifies:
1. All 4 schemas imported in sync.route.ts
2. All 4 endpoints use `.safeParse()` before sending
3. Contract tests pass

## Verification Table

| # | Task | Agent | Verification | Files |
|---|------|-------|-------------|-------|
| 1 | Write RED tests (3 describe blocks, 11 tests) | architect | Schema tests GREEN | `engine/core/src/http/routes/__tests__/sync-route-contracts.test.ts` |
| 2 | Write acceptance script | architect | Script FAILs (schemas not imported yet) | `scripts/verify_presend_validation.sh` |
| 3 | Add safeParse to passport endpoint | nodejs-dev | Tests GREEN + acceptance step 1+2 | `engine/core/src/http/routes/sync.route.ts` |
| 4 | Add safeParse to scan endpoint | nodejs-dev | Tests GREEN + acceptance step 1+2 | `engine/core/src/http/routes/sync.route.ts` |
| 5 | Add safeParse to documents endpoint | nodejs-dev | Tests GREEN + acceptance step 1+2 | `engine/core/src/http/routes/sync.route.ts` |
| 6 | Verify all tests + acceptance | test-runner | `verify_presend_validation.sh` PASS | -- |

## Verification Commands

```bash
# Schema tests (GREEN immediately — they test schema behavior):
cd engine/core && npx vitest run src/http/routes/__tests__/sync-route-contracts.test.ts

# Acceptance (FAIL until implementation):
bash scripts/verify_presend_validation.sh

# Full suite (after implementation):
cd engine/core && npx vitest run
```

## Out of Scope
- SaaS-side changes (already validates all endpoints)
- Audit/evidence/registry endpoints (no contracts schema yet)
- Error response format changes (keep existing JSON shape)
