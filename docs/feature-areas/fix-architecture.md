# Feature Area: Fix Architecture (FA-03)

> **Source:** `docs/FIX.md` (v1.0.0) -- fully absorbed into this document
> **Version:** 2.0.0
> **Date:** 2026-04-21
> **Purpose:** Deterministic auto-remediation -- 5 categories, 20 strategies, 17 templates
> **Milestones:** V1-M19 Fix Profile Filter (section 9)

---

## 1. Purpose

Fixer -- deterministic remediation engine generating and applying compliance fixes for scanner findings. Each fix: structured plan, impact prediction, type-aware diff, backup/undo, validation, evidence chain.

**Principle:** Fixer NEVER invents compliance logic. All fixes are deterministic (templates + strategies). LLM only enriches document content with `--ai` opt-in. Fixes are always: preview-first, reversible, validated.

**Regulation basis:** EU AI Act Regulation 2024/1689.
**Fix categories:** 5 (A: Code, B: Documentation, C: Config, D: Dependencies, E: Passport).
**Strategies:** 20 scaffold strategies + 5 inline fix types (splice).

---

## 2. Pipeline

```
PHASE 1: DISCOVERY                PHASE 2: PLANNING              PHASE 3: APPLY
|                                 |                               |
+-- Last ScanResult               +-- For each fail finding:      +-- Backup original
|   (from scan or cache)          |   findStrategy(finding, ctx)  |   .complior/backups/
|                                 |                               |
+-- Filter: type == 'fail'        +-- Priority 1: fixDiff present?+-- Apply actions:
|   (skip pass/skip findings)     |   -> buildInlineFixPlan()     |   +-- create: new file
|                                 |   -> splice action            |   +-- edit: string replace
+-- Build FixContext:             |                               |   +-- splice: inline before/after
|   +-- projectPath               +-- Priority 2: findStrategy()  |   |   + stale diff protection
|   +-- framework (React/Node/..)|   -> scaffold action (create)  |   +-- import injection
|   +-- existingFiles[]           |                               |
|                                 +-- Returns FixPlan:            +-- Template resolution:
|                                 |   +-- obligationId            |   [TEMPLATE:file] -> content
|                                 |   +-- actions[] (splice/create)|   + passport pre-fill
|                                 |                               |   + optional LLM enrich
|                                 +-- Preview:                    |
|                                 |   CLI: table + diff           +-- Re-scan project
|                                 |   TUI: type-aware panel       |   (full L1-L4)
|                                 |   API: GET /fix/preview       |
|                                                                 +-- Validate:
|                                                                 |   finding fail -> pass?
|                                                                 |   score delta
|                                                                 |
|                                                                 +-- Record evidence
|                                                                 |   .complior/evidence/
|                                                                 |
|                                                                 +-- Record undo history
|                                                                 |   .complior/fixes-history.json
|                                                                 |
|                                                                 +-- Emit events:
|                                                                     score.updated
|                                                                     fix.validated
```

**Iterative cascade:** After applying all fixes, `applyAll()` runs up to 3 scan passes. Each pass discovers new fixable findings previously shadowed by the original failures. This handles cascading fixes (e.g., fixing a security risk reveals an NHI finding on the same file).

---

## 3. Commands & HTTP API

### 3.1 CLI

```bash
complior fix                              # Apply all available fixes
complior fix --dry-run                    # Preview without applying
complior fix --ai                         # LLM-enriched documents
complior fix --json                       # JSON output for CI/CD
complior fix --source scan                # Fix only scan findings
complior fix --source eval                # Fix only eval findings
complior fix --source all                 # Fix both scan + eval findings
complior fix --check-id <id>              # Fix specific check
complior fix --doc fria                   # Generate FRIA document
complior fix --doc notify                 # Generate worker notification
complior fix --doc policy                 # Generate AI usage policy
complior fix --doc soa                    # Generate ISO 42001 SoA
complior fix --doc risk-register          # Generate ISO 42001 Risk Register
complior fix --doc test-gen               # Generate compliance test suite
complior fix --doc all                    # Generate all compliance documents
```

### 3.2 HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/fix/preview` | List all available fix plans (rendered templates) |
| POST | `/fix/preview` | Preview single finding fix |
| POST | `/fix/apply` | Apply single fix |
| POST | `/fix/apply-and-validate` | Apply + re-scan + validate + evidence |
| POST | `/fix/apply-all` | Batch apply all fixes |
| POST | `/fix/apply-all/stream` | Batch apply with SSE streaming progress |
| POST | `/fix/undo` | Undo last fix or by ID |
| GET | `/fix/history` | Fix history log |
| POST | `/fix/doc/fria` | Generate FRIA report |
| POST | `/fix/doc/notify` | Generate worker notification |
| POST | `/fix/doc/policy` | Generate industry-specific AI usage policy |
| POST | `/fix/doc/generate` | Generate single compliance document by type |
| POST | `/fix/doc/soa` | Generate ISO 42001 Statement of Applicability |
| POST | `/fix/doc/risk-register` | Generate ISO 42001 Risk Register |
| POST | `/fix/doc/test-gen` | Generate compliance test suite |
| POST | `/fix/doc/all` | Generate all compliance documents |

### 3.3 TUI (page 3 -- Fix)

```
Keys:
  Space    toggle fix selection
  a        select all
  n        deselect all
  d        toggle diff preview
  Enter    apply selected fixes
```

Two-panel layout: left = fix checklist (staged/not staged), right = type-aware diff preview. After Enter, `AppCommand::ApplyFixes` triggers real filesystem modification via `apply_fix_to_file()`, followed by `AppCommand::AutoScan` for score update.

---

## 4. Fix Categories (5)

### Category A -- Code (9 strategies)

Creates or modifies source files. Most complex category -- accounts for framework, language, and import system.

```
Fix Type:         code_injection
Application:      Structured diff (before/after lines) + import injection
Diff rendering:   Red/green unified diff with line numbers
Stale protection: Validates before-lines prior to splice
Undo:             File backup -> restore on undo
```

| Strategy | Check ID | Article | What it creates | Score |
|----------|----------|---------|-----------------|-------|
| Disclosure | `ai-disclosure` | Art. 50(1) | React component OR server middleware | +7 |
| Interaction Logging | `interaction-logging` | Art. 12 | Logger with typed API | +5 |
| Permission Guard | `l4-human-oversight` | Art. 14 | Human approval gate with queue, timeouts, risk-level | +5 |
| Kill Switch | `l4-kill-switch` | Art. 14(4) | `AI_KILL_SWITCH` env var + `isAiEnabled()` + `emergencyShutdown()` | +5 |
| Kill Switch Test | `l4-kill-switch-test` | Art. 14(4) | Kill switch integration test scaffold | +4 |
| Error Handler | `l4-security-risk` / `l4-ast-missing-error-handling` | Art. 15(4) | try-catch wrapper + compliance-aware error log + fallback | +4 |
| HITL Gate | `l4-conformity-assessment` | Art. 19 | 8-point conformity checklist (Art.9-15 + sign-off) | +5 |
| Data Governance | `l4-data-governance` | Art. 10 | Validation middleware + PII detection + audit log | +5 |
| Bandit Fix | `ext-bandit-*` | Art. 15(4) | B301->json, B603->subprocess.run(list), B608->parameterized, B105->env var | +4 |

**Framework-aware generation (disclosure):**
- **React/Next.js:** TSX component (`AIDisclosure.tsx`) or React hook
- **Express/Fastify/Hono:** Middleware with typed request/response
- **Generic:** Standalone module with explicit exports

### Category B -- Documentation (17 templates)

Generates compliance documents from markdown templates. Most impactful category -- a typical project gains +30-50 points from documentation alone.

```
Fix Type:         template_generation
Application:      Create file from template -> pre-fill from passport -> optional LLM enrichment
Diff rendering:   CREATE header + content preview
Stale protection: Skips if output file already exists (unless --ai for re-enrichment)
Undo:             Delete created file on undo
```

**Template Registry (17 types, single source of truth in `data/template-registry.ts`):**

| Doc Type | Article | Template File | Output File | Score |
|----------|---------|---------------|-------------|-------|
| `ai-literacy` | Art. 4 | `ai-literacy.md` | `docs/compliance/ai-literacy-policy.md` | +8 |
| `art5-screening` | Art. 5 | `art5-screening.md` | `docs/compliance/art5-screening-report.md` | +8 |
| `technical-documentation` | Art. 11 | `technical-documentation.md` | `docs/compliance/technical-documentation.md` | +8 |
| `risk-management` | Art. 9 | `risk-management-system.md` | `docs/compliance/risk-management-system.md` | +8 |
| `data-governance` | Art. 10 | `data-governance.md` | `docs/compliance/data-governance.md` | +8 |
| `monitoring-policy` | Art. 26 | `monitoring-policy.md` | `docs/compliance/monitoring-policy.md` | +8 |
| `fria` | Art. 27 | `fria.md` | `docs/compliance/fria.md` | +8 |
| `worker-notification` | Art. 26(7) | `worker-notification.md` | `docs/compliance/worker-notification.md` | +8 |
| `qms` | Art. 17 | `qms.md` | `docs/compliance/qms.md` | +8 |
| `instructions-for-use` | Art. 13 | `instructions-for-use.md` | `docs/compliance/instructions-for-use.md` | +8 |
| `declaration-of-conformity` | Art. 47 | `declaration-of-conformity.md` | `docs/compliance/declaration-of-conformity.md` | +8 |
| `incident-report` | Art. 73 | `incident-report.md` | `docs/compliance/incident-report.md` | +8 |
| `gpai-transparency` | Art. 53 | `gpai-transparency.md` | `docs/compliance/gpai-transparency.md` | +8 |
| `gpai-systemic-risk` | Art. 55 | `gpai-systemic-risk.md` | `docs/compliance/gpai-systemic-risk.md` | +8 |
| `iso42001-ai-policy` | ISO 42001 Cl. 5.2 | `iso-42001-ai-policy.md` | `docs/compliance/iso42001-ai-policy.md` | +8 |
| `iso42001-soa` | ISO 42001 Cl. 6.1.3 | `iso-42001-soa.md` | `docs/compliance/iso42001-soa.md` | +8 |
| `iso42001-risk-register` | ISO 42001 Cl. 6.1.2 | `iso-42001-risk-register.md` | `docs/compliance/iso42001-risk-register.md` | +8 |

**Additional strategy:**

| Strategy | Check ID | Article | What it creates | Score |
|----------|----------|---------|-----------------|-------|
| Doc-Code Sync | `cross-doc-code-mismatch` | Art. 11 | Sync report with mismatch details + checklist | +5 |

### Category C -- Configuration (5 strategies)

Creates or modifies configuration files. Lightweight fixes that establish compliance metadata without changing application code.

```
Fix Type:         config_fix | metadata_generation
Application:      Create JSON/TOML/YAML file or modify existing config
Diff rendering:   MODIFY header + preview of changes
Stale protection: Standard file validation
Undo:             Restore from backup
```

| Strategy | Check ID | Article | What it creates | Score |
|----------|----------|---------|-----------------|-------|
| Compliance Metadata | `compliance-metadata` | Art. 50 | `.well-known/ai-compliance.json` | +4 |
| Content Marking | `content-marking` | Art. 50(2) | C2PA/IPTC config JSON | +5 |
| Secret Rotation | `l4-nhi-*` (except `l4-nhi-clean`) | Art. 15(4) | `.gitignore` + `.env.example` with vault references. Auto-extracts env var name: `l4-nhi-openai-key` -> `OPENAI_API_KEY` | +6 |
| CI Compliance | `l3-ci-compliance` | Art. 17 | `.github/workflows/compliance-check.yml` -- checkout -> setup-node -> `npx complior scan --ci --threshold 70` -> upload SARIF | +4 |
| Bias Testing | `l3-missing-bias-testing` | Art. 10 | `bias-testing.config.json` -- protected attributes, fairness metrics (equalized_odds, demographic_parity), thresholds | +4 |

### Category D -- Dependencies (2 strategies)

Creates update plans for vulnerable or non-compliant dependencies. Handles npm, pip, and cargo ecosystems.

```
Fix Type:         dependency_fix
Application:      Create markdown plan with ecosystem-specific update commands
Diff rendering:   CREATE header + plan content
Stale protection: Standard
Undo:             Delete created file on undo
```

| Strategy | Check ID | Article | What it creates | Score |
|----------|----------|---------|-----------------|-------|
| CVE Upgrade | `l3-dep-vuln` | Art. 15 | `complior-upgrade-plan.md` -- vulnerability summary, commands for npm/pip/cargo, verification checklist | +5 |
| License Fix | `l3-dep-license` | Art. 5 | `complior-license-review.md` -- compatibility matrix (MIT/Apache/GPL/AGPL/SSPL), action items, audit commands | +4 |

### Category E -- Passport (1 strategy)

Updates Agent Passport fields. Works through passport service, not direct file manipulation.

```
Fix Type:         passport_update
Application:      PassportService -> .complior/agents/{name}.json
Diff rendering:   Field-level before/after
Stale protection: Passport version check
Undo:             Restore passport JSON from backup
```

- `complior passport init` -- auto-discovery (creates passport)
- `complior fix --doc fria` -- generates FRIA report, sets `fria_completed: true`
- Updates completeness after fix application

---

## 5. Fix Diff Builder (5 types)

**File:** `domain/scanner/fix-diff-builder.ts` (477 LOC)
**Tests:** `domain/scanner/fix-diff-builder.test.ts` (30 test cases)

Generates structured inline diffs for 5 finding types. Routes by `checkId` to a specialized builder function. When no builder can produce a diff, the finding falls back to a scaffold strategy.

```
Input:  fileContent, line, filePath, checkId
Output: FixDiff { filePath, startLine, before[], after[], importLine? } | undefined

Dispatch:
  checkId contains 'bare'              -> undefined (info, no fix)
  checkId starts 'l4-nhi-'             -> buildNhiDiff()           Secret externalization
  checkId == 'l4-security-risk'        -> buildSecurityRiskDiff()  -> fallback -> buildNhiDiff()
  checkId == 'l4-ast-missing-...'      -> buildErrorHandlingDiff() try/catch wrap
  checkId starts 'l3-banned-'          -> buildBannedDepDiff()     Remove dep line
  checkId starts 'ext-semgrep-...'     -> routed to security/error/NHI builders
  checkId starts 'ext-detect-secrets-' -> buildNhiDiff()
  checkId starts 'ext-bandit-'         -> buildSecurityRiskDiff() -> fallback -> buildNhiDiff()
```

### Builder 1: NHI Secrets (`buildNhiDiff`)

Replaces hardcoded secrets with environment variables. Determines language by file extension.

**Patterns recognized:** `const X = 'secret'` (TS_ASSIGN), `X = "secret"` (PY_ASSIGN), `key: 'secret'` (OBJ_PROP), connection strings (mongodb/postgres/mysql/redis), multi-line private keys (PEM blocks).

```diff
- const API_KEY = 'sk-1234567890abcdef';
+ const API_KEY = process.env.API_KEY ?? '';
```
```diff
- API_KEY = "sk-1234567890abcdef"
+ API_KEY = os.environ.get('API_KEY', '')
+ import os
```

Skips: private keys (`-----BEGIN PRIVATE KEY-----` handled via `buildPrivateKeyDiff`), lines already using `process.env` / `os.environ`.

### Builder 2: Security Risk (`buildSecurityRiskDiff`)

12 pattern-specific replacements with fallback to NHI builder for hardcoded secrets:

| Pattern | Replacement | Import |
|---------|-------------|--------|
| `eval(expr)` | `/* COMPLIOR: eval() disabled */ undefined` | -- |
| `new Function(...)` | `/* COMPLIOR: new Function() disabled */ undefined` | -- |
| `vm.runInNewContext(...)` | `/* COMPLIOR: vm execution disabled */ undefined` | -- |
| `pickle.load(f)` | `json.load(f)` | `import json` |
| `pickle.loads(d)` | `json.loads(d)` | `import json` |
| `hashlib.md5()` | `hashlib.sha256()` | -- |
| `hashlib.sha1()` | `hashlib.sha256()` | -- |
| `verify=False` | `verify=True` | -- |
| `rejectUnauthorized: false` | `rejectUnauthorized: true` | -- |
| `shell=True` | `shell=False` | -- |
| `os.system(cmd)` | `subprocess.run(cmd.split(), check=True)` | `import subprocess` |
| `torch.load(x)` | `torch.load(x, weights_only=True)` | -- |

### Builder 3: Error Handling (`buildErrorHandlingDiff`)

Wraps LLM calls in try/catch (TS) or try/except (Python). Supports multi-line statements via `findStatementEnd()` which tracks paren/brace depth up to 30 lines ahead.

**LLM call patterns recognized:** `.messages.create`, `.chat.completions.create`, `.chat.complete`, `.chat`, `.generateContent`, `.invoke`, `.images.generate`, `.embeddings.create`, `.send`, `generateText(`, `streamText(`, `generateObject(`.

```diff
- const r = await client.messages.create({ model: "claude-3" });
+ try {
+   const r = await client.messages.create({ model: "claude-3" });
+ } catch (err) {
+   console.error('LLM call failed:', err);
+   throw err;
+ }
```

### Builder 4: Banned Dependencies (`buildBannedDepDiff`)

Removes prohibited dependencies from `package.json` or `requirements.txt`. Handles trailing comma cleanup for JSON manifests.

```diff
-     "emotion-recognition": "^1.0.0",
```

Extracts package name from checkId: `l3-banned-emotion-recognition` -> `emotion-recognition`.

### Builder 5: Bare LLM (informational -- no diff)

Bare LLM calls (`new OpenAI()`, etc.) are classified as `info` severity, not `fail`. The SDK wrapper is a recommendation, not a compliance fix. `buildFixDiff()` returns `undefined` for bare-related checkIds.

### Import Injection Logic

When `fix_diff.importLine` is set (implemented in both TS engine and Rust CLI):

1. Scan file for existing `import ` / `from ` lines
2. If import already present -> skip
3. Insert after last import line (or at line 1 if no imports)
4. Bottom-up splice sorting in `fix-service.ts` prevents line-shift corruption when multiple splices affect the same file

---

## 6. Strategy Registry (20 strategies)

**File:** `domain/fixer/strategies/index.ts` (61 LOC)
**Strategy files:** 20 individual files in `domain/fixer/strategies/` (1259 LOC total)

Ordered array, chain-of-responsibility pattern. First match wins. `documentationStrategy` is catch-all last.

```
 1. permissionGuardStrategy      l4-human-oversight          -> human approval gate
 2. killSwitchStrategy           l4-kill-switch              -> env var + emergency shutdown
 3. killSwitchTestStrategy       l4-kill-switch-test         -> integration test scaffold
 4. errorHandlerStrategy         l4-security-risk | missing  -> error handler
 5. hitlGateStrategy             l4-conformity-assessment    -> conformity checklist
 6. dataGovernanceStrategy       l4-data-governance          -> validation + PII detection
 7. secretRotationStrategy       l4-nhi-*                    -> .gitignore + .env.example
 8. banditFixStrategy            ext-bandit-*                -> security remediation plan
 9. cveUpgradeStrategy           l3-dep-vuln                 -> upgrade plan
10. licenseFixStrategy           l3-dep-license              -> license review
11. ciComplianceStrategy         l3-ci-compliance            -> GitHub Actions workflow
12. biasTestingStrategy          l3-missing-bias-testing     -> fairness config
13. docCodeSyncStrategy          cross-doc-code-mismatch     -> sync report
14. disclosureStrategy           ai-disclosure               -> component/middleware
15. contentMarkingStrategy       content-marking             -> C2PA config
16. loggingStrategy              interaction-logging         -> logger module
17. recordKeepingStrategy        l4-record-keeping           -> record-keeping module
18. logRetentionStrategy         l4-log-retention            -> log retention config
19. metadataStrategy             compliance-metadata         -> .well-known/
20. documentationStrategy        (catch-all)                 -> obligation -> template (17 types)
```

**Deduplication:** Splice actions dedup by `${path}:${startLine}`. Scaffold actions dedup by output `path`. Two findings on the same file at different lines produce 2 plans. Same file, same line produces 1 plan.

---

## 7. Document Generation Pipeline

Three-stage pipeline transforming empty templates into project-specific compliance documents.

### Stage 1: Template Loading

**Source:** `engine/core/data/templates/eu-ai-act/` (14 markdown files)
**Registry:** `engine/core/src/data/template-registry.ts` (17 entries: 14 EU AI Act + 3 ISO 42001)

Templates use standardized placeholder format:

```markdown
# Fundamental Rights Impact Assessment

## 1. AI System Description
**System Name:** [AI System Name]
**Provider:** [Company Name]
**Risk Classification:** [Risk Class]
**Date:** [Date]
**Document ID:** FRIA-[YYYY]-[NNN]

## 2. Impact Analysis
[MANUAL: Describe potential impacts on fundamental rights]
```

### Stage 2: Passport Pre-fill (Deterministic)

**File:** `domain/documents/document-generator.ts` (258 LOC)

Common placeholders resolved from Agent Passport fields:

| Placeholder | Passport Field | Example |
|-------------|---------------|---------|
| `[Company Name]` | `owner.team` | "Acme Corp" |
| `[Organization]` | `owner.team` | "Acme Corp" |
| `[AI System Name]` | `display_name` | "Customer Support Bot" |
| `[Provider]` | `model.provider` | "OpenAI" |
| `[Provider name]` | `model.provider` | "OpenAI" |
| `[Risk Class]` | `compliance.eu_ai_act.risk_class` | "High-Risk" |
| `[Model ID]` | `model.model_id` | "gpt-4-turbo-2024-04-09" |
| `[X.Y]` | `version` | "2.1.0" |
| `[Description]` | `description` | "AI-powered customer support..." |
| `[Date]` | (computed) | "2026-04-21" |
| `[Autonomy Level]` | `autonomy_level` | "supervised" |
| `[Human Oversight Description]` | (derived via `deriveOversightDescription()`) | "Human-in-the-loop with..." |
| `FRIA-[YYYY]-[NNN]` | (auto-generated) | "FRIA-2026-042" |

**Tracking:**
- `prefilledFields[]` -- successfully replaced from passport
- `manualFields[]` -- require human input (type-specific lists per docType, 3-5 fields each)

Typical pre-fill rate: 25-70% depending on passport completeness.

Additional passport-token resolution (`[PASSPORT:field]` syntax) in `fix-service.ts` handles 11 passport fields: `display_name`, `name`, `description`, `owner.team`, `owner.contact`, `owner.responsible_person`, `model.provider`, `model.model_id`, `risk_class`, `autonomy_level`, `disclosure_text`.

### Stage 3: LLM Enrichment (opt-in `--ai`)

**File:** `domain/documents/ai-enricher.ts` (159 LOC)

When `--ai` flag is set:
1. Identify remaining `[MANUAL: ...]` and unfilled `[TO BE SET]` sections via `detectWeakSections()`
2. Build prompt with passport context + document type requirements
3. LLM generates substantive content for unfilled sections (model selected via `llm.routeModel('document-generation')`)
4. **Two-pass enrichment:** After first LLM pass, re-check for remaining weak sections. If found, run second pass.
5. Safety: legal assertions marked `[REVIEW REQUIRED]`
6. On success: `<!-- COMPLIOR:SCAFFOLD -->` marker removed (scanner upgrades status to 'draft')
7. Fallback: deterministic result if LLM fails

**Cost:** ~$0.02-0.05 per document (one LLM call per pass, up to 2 passes per document).

**Existing file handling:** If a document already exists on disk:
- Without `--ai`: Keep existing content, never overwrite. Return `detectWeakSections()` as `manualFields`.
- With `--ai`: Detect weak sections in existing content, LLM enriches only weak parts, preserves user edits.

---

## 8. Safety Mechanisms

### Stale Diff Protection

Before applying any code fix (splice), validates that the file has not changed since scan. Implemented in **both** runtimes:

**Rust CLI** (`cli/src/views/fix/apply.rs`):
```rust
let file_slice: Vec<&str> = lines[start..end].iter().map(|s| s.trim()).collect();
let expected: Vec<&str> = diff.before.iter().map(|s| s.trim()).collect();
if file_slice != expected {
    return ApplyResult { success: false, detail: "File content changed since scan" }
}
```

**TS Engine** (`services/fix-service.ts`, splice branch):
```typescript
for (let i = 0; i < beforeLines.length; i++) {
  if ((lines[startIdx + i] ?? '').trim() !== (beforeLines[i] ?? '').trim()) {
    throw new Error(`Stale diff at line ${(action.startLine ?? 1) + i} -- re-scan first`);
  }
}
```

On validation failure the fix is rejected -- a re-scan is required for fresh diffs.

### File Backup

Every file modified by a fix is backed up before modification:

```
.complior/backups/
  1710756234-src_components_AIDisclosure.tsx
  1710756234-well-known_ai-compliance.json
```

Backup is created via `backupFile()` from `services/shared/backup.js`. Backups are used by the undo service to restore files to their pre-fix state.

### Post-Fix Validation

After each fix (or batch), a full re-scan runs and compares:
- **Finding status:** `fail` -> `pass` (expected), or still `fail` (fix insufficient)
- **Score delta:** `scoreAfter - scoreBefore` (should be positive)
- **Side effects:** no new findings introduced

Emitted events:
- `score.updated` -- `{ before, after }`
- `fix.validated` -- `{ checkId, passed: boolean, scoreDelta }`

### Undo Stack

All fixes are recorded in `.complior/fixes-history.json`:

```json
{
  "fixes": [
    {
      "id": 1,
      "checkId": "ai-disclosure",
      "obligationId": "eu-ai-act-OBL-015",
      "fixType": "code_injection",
      "status": "applied",
      "timestamp": "2026-03-18T12:00:00Z",
      "files": [
        { "path": "src/components/AIDisclosure.tsx", "action": "create", "backupPath": "..." }
      ],
      "scoreBefore": 32,
      "scoreAfter": 39
    }
  ]
}
```

Undo logic:
- **Created files (`create`):** Delete the file
- **Edited files (`edit` / `splice`):** Restore from backup
- Mark entry as `"status": "undone"`
- Re-scan and emit events

### Evidence Chain (C.R20)

After each successful fix, an ed25519-signed entry is appended to `.complior/evidence/chain.json`:

```json
{
  "event_type": "fix",
  "check_id": "ai-disclosure",
  "source": "fix",
  "detail": { "file": "src/components/AIDisclosure.tsx" },
  "timestamp": "2026-03-18T12:00:00.000Z",
  "hash": "sha256:...",
  "chain_prev": "sha256:...",
  "signature": "ed25519:..."
}
```

This creates a tamper-proof audit trail verifiable by EU AI Act auditors.

### Scaffold Marker

Documents generated without `--ai` include a `<!-- COMPLIOR:SCAFFOLD -->` comment on the first line. The L2 scanner detects this marker and classifies the document as 'scaffold' (incomplete) rather than 'draft'. After LLM enrichment with `--ai`, the marker is removed and the scanner upgrades the classification.

---

## 9. Profile-Based Fix Filtering (V1-M19)

### Design Decision

Post-generation filter -- filter fix plan AFTER fixer generates it, not inside strategies. Strategies remain profile-unaware. Minimal change to 20+ strategy files.

### Primary Mechanism

Since scan findings are already role/risk/domain-filtered (findings get `type: 'skip'` from V1-M08/M09), the fix filter simply excludes plans whose associated finding is `skip`.

### Secondary Mechanism

For direct fix calls without prior scan, use `check-applicability.json` to validate checkId applicability by domain.

### Type: FixFilterContext

Defined in `types/common.types.ts`:

```typescript
/** V1-M19: Context about how fix plans were filtered based on project profile. */
export interface FixFilterContext {
  readonly role: Role;
  readonly riskLevel: string | null;
  readonly domain: string | null;
  readonly profileFound: boolean;
  readonly totalPlans: number;
  readonly applicablePlans: number;
  /** Plans excluded because their associated finding was already type: 'skip'. */
  readonly excludedBySkip: number;
  /** Plans excluded via direct domain check against check-applicability.json. */
  readonly excludedByDomain: number;
}
```

### Type: FixFilterProfile

```typescript
export interface FixFilterProfile {
  role: Role;
  riskLevel: string | null;
  domain: string | null;
}
```

### Function: filterFixPlansByProfile

```typescript
export const filterFixPlansByProfile = (
  plans: readonly FixPlan[],
  findings: readonly Finding[],
  profile: FixFilterProfile | null,
): { filtered: readonly FixPlan[]; context: FixFilterContext }
```

Conservative: plans without a matching finding in the findings array pass through unchanged. No profile -> all plans pass through (backward compatible).

### Dependency

V1-M18 (Scan Profile Filter) must be DONE first -- it provides domain-filtered findings with `type: 'skip'` and `check-applicability.json`.

### Test Spec (V1-M19)

8 tests in `fix-profile-filter.test.ts`:

| Test | What it verifies |
|------|------------------|
| returns all plans when profile is null | Backward compatibility |
| excludes plans for skip findings (role-skipped) | Provider-only checks excluded for deployer |
| excludes plans for skip findings (domain-skipped) | HR checks excluded for healthcare domain |
| preserves plans for applicable fail findings | All universal checks remain |
| context reports correct counts | totalPlans, applicablePlans, excludedBySkip accuracy |
| handles empty plans array | Edge case: no plans |
| is deterministic (same input -> same output) | Pure function guarantee |
| returns frozen filtered array | Immutability contract |

---

## 10. Batch Apply Flow (applyAll)

The `applyAll()` method in `fix-service.ts` (714 LOC total) implements a sophisticated batch application strategy:

### Phase 1a: Non-splice plans

Apply scaffold plans (create/edit) individually. Each plan gets its own backup, applyAction call, and progress callback.

### Phase 1b: Batched splice plans

Group splice plans by file path. For each file:
1. Sort plans bottom-up by `startLine` (descending) -- prevents line-shift corruption
2. Single `readFile` call
3. For each plan: validate before-lines against in-memory state, splice in-memory
4. Collect unique imports across all plans for the same file
5. Single `writeFile` call

This batched approach means N fixes on the same file result in 1 disk read + 1 disk write instead of N reads + N writes.

### Phase 2: Iterative cascade (up to 3 passes)

After initial apply:
1. Re-scan project
2. Check for new fixable findings (splice + cascading create/edit)
3. If new findings found: apply them using same batched approach
4. Track applied keys (`Set<string>`) to avoid re-applying same fix
5. Repeat up to 2 additional passes (3 total)

This handles: fixing security risk on line 10 reveals NHI finding on line 15; fixing a banned dep reveals a previously shadowed error-handling finding.

### Phase 3: Record undo + evidence

For all applied results:
- Patch final `scoreAfter` into result objects
- Record in undo service
- Append to evidence chain

---

## 11. Type-Aware Diff Rendering (TUI)

TUI Fix page renders diff preview differently based on finding type:

### Type A -- Code Fix

```
+-- Current Code ------------------------------------+
|  Line 15:                                          |
|    const client = new OpenAI({                     |
|      apiKey: process.env.OPENAI_API_KEY            |
|    });                                             |
+-- Suggested Fix -----------------------------------+
|  - const client = new OpenAI({                     |
|  + const client = complior(new OpenAI({            |
|      apiKey: process.env.OPENAI_API_KEY            |
|  - });                                             |
|  + }));                                            |
+-- Add Import --------------------------------------+
|  + import { complior } from '@complior/sdk';       |
+----------------------------------------------------+
```

### Type B -- New Document

```
+-- CREATE docs/fria.md -----------------------------+
|  (file does not exist yet)                         |
+-- Proposed Content --------------------------------+
|  # Fundamental Rights Impact Assessment            |
|                                                    |
|  ## 1. AI System Description                       |
|  **System Name:** My AI Chatbot                    |
|  **Provider:** Acme Corp                           |
|  **Risk Class:** High-Risk                         |
|  ...                                               |
+----------------------------------------------------+
```

### Type C -- Config Change

```
+-- MODIFY .well-known/ai-compliance.json -----------+
+-- Proposed Changes --------------------------------+
|  {                                                 |
|    "version": "1.0",                               |
|    "scanner": "complior/0.9.0",                    |
|    "ai_systems": [{                                |
|      "name": "[TO BE SET]",                        |
|      "risk_level": "[TO BE SET]"                   |
|    }]                                              |
|  }                                                 |
+----------------------------------------------------+
```

---

## 12. Scanner -> Fix Mapping

Complete mapping of every scanner check to fix action, category, and status:

```
Scanner Layer         Finding (checkId)           Category    Fix Action                          Status
-----------------     ----------------------      ---------   ---------------------------------   ------
L1 File Presence      ai-disclosure               A (Code)    Create component/middleware          done
L1 File Presence      content-marking             C (Config)  Create C2PA/IPTC config JSON        done
L1 File Presence      interaction-logging         A (Code)    Create logger with typed API         done
L1 File Presence      compliance-metadata         C (Config)  Create .well-known/ai-compliance     done
L1 File Presence      documents (17 types)        B (Docs)    Generate from template               done
L1 File Presence      passport-presence           E (Passport) complior passport init              done

L2 Doc Structure      l2-fria-incomplete          B (Docs)    Regenerate with passport data        done
L2 Doc Structure      l2-tech-documentation       B (Docs)    Generate from template               done

L3 Dependencies       l3-banned-*                 A (Code)    Inline: remove line from manifest    done
L3 Dependencies       l3-dep-vuln                 D (Deps)    Create update plan                   done
L3 Dependencies       l3-dep-license              D (Deps)    Create license review                done
L3 Dependencies       l3-ci-compliance            C (Config)  Create GitHub Actions workflow       done
L3 Dependencies       l3-missing-bias-testing     C (Config)  Create bias-testing.config.json      done

L4 Code Patterns      l4-bare-llm                 -- (Info)   Informational: SDK recommendation    --
L4 Code Patterns      l4-human-oversight          A (Code)    Scaffold: human approval gate        done
L4 Code Patterns      l4-kill-switch              A (Code)    Scaffold: kill switch (env var)      done
L4 Code Patterns      l4-kill-switch-test         A (Code)    Scaffold: kill switch test           done
L4 Code Patterns      l4-security-risk            A (Code)    Inline: pattern-specific replacement done
L4 Code Patterns      l4-ast-missing-error-handling A (Code)  Inline: try/catch wrapper            done
L4 Code Patterns      l4-conformity-assessment    A (Code)    Create conformity checklist          done
L4 Code Patterns      l4-data-governance          A (Code)    Create validation middleware         done
L4 Code Patterns      l4-logging                  A (Code)    Create interaction logger            done
L4 Code Patterns      l4-record-keeping           A (Code)    Create record-keeping module         done
L4 Code Patterns      l4-log-retention            C (Config)  Create log retention config          done

NHI Secrets           l4-nhi-* (any)              A (Code)    Inline: process.env / os.environ     done
NHI Secrets           l4-nhi-* (no file/line)     C (Config)  Scaffold: .gitignore + .env.example  done
NHI Secrets           l4-nhi-clean                --          No fix (all clean)                   --

Cross-Layer           cross-doc-code-mismatch     B (Docs)    Create sync report                   done

Deep (ext-semgrep)    ext-semgrep-bare-call       -- (Info)   Informational: SDK recommendation    --
Deep (ext-semgrep)    ext-semgrep-unsafe-deser    A (Code)    Security pattern replacement          done
Deep (ext-semgrep)    ext-semgrep-injection       A (Code)    Security pattern replacement          done
Deep (ext-semgrep)    ext-semgrep-missing-error-* A (Code)    Error handling wrapper                done

Deep (ext-bandit)     ext-bandit-B301             A (Code)    Safe deserialization (json.load)      done
Deep (ext-bandit)     ext-bandit-B603             A (Code)    subprocess without shell=True         done
Deep (ext-bandit)     ext-bandit-B608             A (Code)    Parameterized SQL queries             done
Deep (ext-bandit)     ext-bandit-B105             A (Code)    Password in env var                   done
Deep (ext-bandit)     ext-bandit-* (any)          A (Code)    Generic remediation + checklist       done

Deep (ext-modelscan)  ext-modelscan-PickleUnsafe  --          Manual: convert to safetensors        --
Deep (ext-detect-sec) ext-detect-secrets-AWS      C (Config)  .gitignore + rotation (as NHI)       done

L5 LLM Analysis       l5-* findings               varies      Planned: LLM-suggested fix           future
```

---

## 13. Score Impact Model

### Impact by Strategy

| Strategy | Predicted | Typical Actual | Notes |
|----------|-----------|----------------|-------|
| Documentation (any) | +8 | +6 to +10 | Depends on L2 validation |
| Disclosure | +7 | +5 to +9 | May resolve cross-layer findings |
| Permission Guard / Kill Switch / HITL | +5 | +3 to +7 | Depends on risk level |
| Secret Rotation | +6 | +5 to +7 | Depends on secret type |
| Error Handler | +4 | +3 to +5 | Stable |
| CVE Upgrade | +5 | +3 to +7 | Depends on CVE severity |
| Content Marking | +5 | +3 to +7 | Variable based on AI SDK detection |
| Interaction Logging | +5 | +4 to +6 | Stable |
| Compliance Metadata | +4 | +3 to +5 | Low-weight check |
| CI / Bias / License | +4 | +3 to +5 | Stable |

### Cumulative Scenario

```
Starting Score:          ~15/100 (RED zone, critical cap active)

Fix all docs (17 templates): +48 to +80 predicted
  + disclosure:               +7
  + logging:                  +5
  + metadata:                 +4
  + inline fixes (NHI, security, error-handling, banned-dep): lifts critical cap

Realistic outcome:       80-85/100 (RED -> GREEN)
```

### Score Calculation After Fix

Score is NOT simply `old + sum(impacts)`. After each fix a full re-scan runs:
1. The fixed finding typically becomes `pass`
2. This changes the pass/fail ratio in its category
3. Category score is recalculated with weights
4. Cross-layer findings may also resolve
5. Critical cap may be lifted (if all criticals resolved -- cap excludes L2, cross-layer, ext-*, low/info severity, and passport-presence findings)

This means the actual delta may be higher or lower than the predicted `scoreImpact`.

---

## 14. EU AI Act Article Coverage

| Article | Obligation | Fix Status | Strategy |
|---------|------------|------------|----------|
| Art. 4 | AI Literacy | Template | documentation (ai-literacy) |
| Art. 5 | Prohibited Practices | Inline + License | `l3-banned-*` removal + `l3-dep-license` review |
| Art. 9 | Risk Management | Template | documentation (risk-management) |
| Art. 10 | Data Governance | Template + Code + Config | documentation + dataGovernanceStrategy + biasTestingStrategy |
| Art. 11 | Technical Documentation | Template + Sync | documentation + docCodeSyncStrategy |
| Art. 12 | Logging | Code + Template | loggingStrategy + recordKeepingStrategy + logRetentionStrategy + monitoring template |
| Art. 13 | Instructions for Use | Template | documentation (instructions-for-use) |
| Art. 14 | Human Oversight | Code | permissionGuardStrategy + killSwitchStrategy + killSwitchTestStrategy |
| Art. 15 | Accuracy/Robustness | Inline + Deps | security-risk (12 patterns) + error-handling + NHI + cveUpgradeStrategy |
| Art. 17 | Quality Management | Template + CI | documentation (qms) + ciComplianceStrategy |
| Art. 19 | Conformity Assessment | Code | hitlGateStrategy (8-point checklist) |
| Art. 26 | Deployment Monitoring | Template | documentation (monitoring-policy) |
| Art. 26(7) | Worker Notification | Template | documentation (worker-notification) |
| Art. 27 | FRIA | Template + FRIA gen | documentation + fix --doc fria |
| Art. 47 | Declaration of Conformity | Template | documentation (declaration) |
| Art. 49 | Agent Passport | Passport | complior passport init |
| Art. 50 | Transparency | Code + Config | disclosure + metadata + contentMarking |
| Art. 53 | GPAI Transparency | Template | documentation (gpai-transparency) |
| Art. 55 | GPAI Systemic Risk | Template | documentation (gpai-systemic-risk) |
| Art. 73 | Incident Reporting | Template | documentation (incident-report) |
| ISO 42001 Cl. 5.2 | AI Policy | Template | documentation (iso42001-ai-policy) |
| ISO 42001 Cl. 6.1.2 | Risk Register | Template | documentation (iso42001-risk-register) |
| ISO 42001 Cl. 6.1.3 | Statement of Applicability | Template | documentation (iso42001-soa) |

---

## 15. Implementation Status

### Source Files -- TypeScript Engine

| File | LOC | Purpose |
|------|-----|---------|
| `domain/fixer/types.ts` | 88 | FixPlan, FixResult, FixValidation, FixHistory, FixStrategy, FixType, TemplateMapping |
| `domain/fixer/create-fixer.ts` | 101 | Factory: `createFixer(deps)` -> `{ generateFix, generateFixes, previewFix }` |
| `domain/fixer/strategies/index.ts` | 61 | Strategy registry: 20 strategies, chain-of-responsibility dispatch |
| `domain/fixer/strategies/*.ts` (20 files) | 1259 | Individual strategy functions |
| `domain/fixer/diff.ts` | 70 | `generateUnifiedDiff()`, `generateCreateDiff()` |
| `domain/fixer/fix-history.ts` | 23 | `createEmptyHistory`, `addEntry`, `markUndone`, `getLastApplied`, `getById` |
| `domain/fixer/template-engine.ts` | 38 | `fillTemplate()`, `getTemplateForObligation()`, `getAvailableTemplates()` |
| `domain/scanner/fix-diff-builder.ts` | 477 | 5-type inline diff builder |
| `domain/documents/document-generator.ts` | 258 | 3-stage doc generation, 17 docTypes |
| `domain/documents/ai-enricher.ts` | 159 | LLM document enrichment (2-pass) |
| `domain/documents/passport-helpers.ts` | -- | `deriveOversightDescription()` |
| `data/template-registry.ts` | 57 | 17 template entries (single source of truth) |
| `services/fix-service.ts` | 714 | Orchestration: batch apply, iterative cascade, undo, evidence |
| `services/undo-service.ts` | 144 | Fix undo with file restore |
| `http/routes/fix.route.ts` | 463 | 16 HTTP endpoints (fix + doc generation) |
| **fix-profile-filter.ts** | -- | **V1-M19: Profile filtering (not yet implemented)** |

### Source Files -- Rust CLI

| File | LOC | Purpose |
|------|-----|---------|
| `cli/src/headless/fix.rs` | ~180 | Headless fix (dry-run + apply) |
| `cli/src/views/fix/mod.rs` | ~200 | Fix view state + logic |
| `cli/src/views/fix/render.rs` | ~300 | Multi/single-fix rendering |
| `cli/src/views/fix/diff_preview.rs` | ~250 | Type-aware diff rendering |
| `cli/src/views/fix/apply.rs` | ~150 | Real filesystem modification |
| `cli/src/views/fix/tests.rs` | ~200 | Snapshot tests |
| `cli/src/types/engine.rs` | ~30 | FixDiff, FindingType types |

### Test Coverage

148 test cases across 10 test files:

| File | Tests | Coverage |
|------|-------|----------|
| `domain/fixer/fixer.test.ts` | 17 | Strategy selection (all 20), plan generation, inline fix, edge cases |
| `domain/fixer/strategies.test.ts` | 37 | Individual strategy functions, output format, score impacts |
| `domain/scanner/fix-diff-builder.test.ts` | 30 | 5 builder functions: NHI, security (12 patterns), error-handling, banned-dep, dispatch |
| `domain/documents/document-generator.test.ts` | 24 | Template pre-fill, manual field tracking, 17 docTypes |
| `services/fix-service.test.ts` | 10 | Apply, validate, batch, undo, evidence recording |
| `domain/fixer/fix-profile-filter.test.ts` | 8 | Profile filtering: null, role-skip, domain-skip, counts, determinism, frozen |
| `http/routes/fix.route.test.ts` | 9 | HTTP endpoint responses |
| `domain/fixer/template-engine.test.ts` | 8 | Template fill, obligation lookup |
| `services/undo-service.test.ts` | 3 | Undo history load/save, dependency_fix FixType |
| `http/routes/fix-filter-context.test.ts` | 2 | Filter context in API response |
| **CLI snapshot tests** | 8+ | Snapshot: checklist, single-fix, diff preview |

---

## 16. Cross-Dependencies

### Depends On

| Dependency | How |
|---|---|
| **Scanner** | Reads `ScanResult.findings`; `fix-diff-builder` attaches `FixDiff` to findings during scan; scanner check IDs drive strategy dispatch |
| **Passport** | Category E: passport init; Stage 2: pre-fill templates with 11+ passport fields; `[PASSPORT:field]` token resolution |
| **Templates** | 14 markdown templates in `data/templates/eu-ai-act/`; 3 ISO 42001 templates |
| **Template Registry** | `data/template-registry.ts` (17 entries) -- single source of truth for doc types, output paths, obligation mappings |
| **Evidence** | C.R20: Records fix events as ed25519-signed entries in evidence chain |
| **LLM** | Optional: `--ai` flag for Stage 3 enrichment; model selected via `llm.routeModel('document-generation')` |
| **Applicability** | V1-M19: `check-applicability.json` for domain filtering (secondary mechanism) |
| **What-If** | `simulateActions()` from `domain/whatif/` used in preview routes for projected score |
| **Backup Service** | `services/shared/backup.js` for pre-modification file backup |

### Used By

| Consumer | How |
|---|---|
| **TUI** | Fix page (page 3) displays and applies remediation with type-aware diff preview |
| **CLI** | `complior fix` headless mode with dry-run, apply, JSON output |
| **HTTP** | 16 fix + doc generation endpoints |
| **Scan** | Post-fix re-scan validates fixes; iterative cascade discovers new findings |
| **SSE** | `fix:start`, `fix:progress`, `fix:applied`, `fix:failed`, `fix:done` events during streaming apply |

---

## 17. Architecture Layers

### Domain Layer (Pure business logic)

```
engine/core/src/domain/fixer/
+-- types.ts              FixPlan, FixResult, FixValidation, FixHistory, FixStrategy, FixType
+-- create-fixer.ts       Factory: createFixer(deps) -> { generateFix, generateFixes, previewFix }
+-- strategies/
|   +-- index.ts           Registry: 20 strategies, findStrategy()
|   +-- *.ts               Individual strategy files (20)
+-- diff.ts               generateUnifiedDiff(), generateCreateDiff()
+-- fix-history.ts        createEmptyHistory, addEntry, markUndone, getLastApplied, getById
+-- template-engine.ts    fillTemplate, getTemplateForObligation, getAvailableTemplates

engine/core/src/domain/documents/
+-- document-generator.ts  3-stage doc generation
+-- ai-enricher.ts         LLM enrichment (2-pass)
+-- passport-helpers.ts    deriveOversightDescription()

engine/core/src/domain/scanner/
+-- fix-diff-builder.ts    5-type inline diff builder
```

### Service Layer (Orchestration)

```
engine/core/src/services/fix-service.ts
  FixServiceDeps:
    fixer           -> domain fixer (strategy execution)
    scanService     -> re-scan after apply
    events          -> emit score.updated, fix.validated
    getProjectPath  -> current project
    getLastScanResult -> cached scan for preview
    loadTemplate    -> disk template loader
    undoService?    -> optional undo recording
    evidenceStore?  -> optional evidence chain (C.R20)
    passportService? -> optional passport for doc pre-fill
    llm?            -> optional LLM for doc enrichment

engine/core/src/services/undo-service.ts
  UndoService: recordFix, undoLast, undoById, getHistory
```

### HTTP Layer (Thin routes)

```
engine/core/src/http/routes/fix.route.ts
  FixRouteDeps: { fixService, undoService, passportService? }
  16 endpoints, all delegate to FixService or PassportService
  Request validation via Zod schemas (FixApplySchema, FixApplyAllSchema, FixUndoSchema)
  SSE streaming via Hono streamSSE for /fix/apply-all/stream
  Error handling returns structured error JSON
```

### CLI Layer (Rust -- Headless)

```
cli/src/headless/fix.rs
  run_headless_fix(dry_run, json, path, config, use_ai) -> exit code
  - Dry-run: GET /fix/preview -> display table
  - Apply: POST /fix/apply-all -> display results + score delta
  - JSON mode: structured output for CI/CD

cli/src/views/fix/
  mod.rs            FixViewState, FixableItem, FixItemStatus
  render.rs         Multi-fix checklist + single-fix detail
  diff_preview.rs   Type-aware diff rendering (A/B/C)
  apply.rs          Real filesystem modification + stale protection
  tests.rs          Snapshot tests
```

---

## 18. Strategy Matrix by Scanner Layer

```
                       IMPLEMENTED                                  PLANNED
                       -----------                                  -------
L1 File Presence ---   disclosure (A), content-marking (C),         ---
                       logging (A), documentation x17 (B),
                       metadata (C), passport (E)

L2 Doc Structure ---   documentation regen (B)                      --- LLM section enrichment (B)

L3 Dependencies  ---   Inline: banned dep removal (A),              ---
                       CVE upgrade plan (D), license review (D),
                       CI compliance workflow (C),
                       bias testing config (C)

L4 Code Patterns ---   Inline: security-risk (A), error-handling    --- rate limiter template (A)
                       try/catch (A)                                    cybersecurity hardening (A)
                       Scaffold: permission guard (A), kill switch (A),
                       kill switch test (A), HITL gate (A),
                       data governance (A), record-keeping (A),
                       log retention (C)

NHI Secrets      ---   Inline: process.env / os.environ (A)        ---
                       Scaffold fallback: .gitignore + .env.example (C)

Cross-Layer      ---   doc-code sync report (B)                     --- passport field update (E)

Deep (Tier 2)    ---   bandit-specific fixes (A)                    --- model format conversion (D)
                       (B301/B603/B608/B105 + generic fallback)
                       semgrep: unsafe-deser, injection,
                       missing-error-handling (A)
                       detect-secrets: NHI env var (A/C)

L5 LLM           ---   (none)                                      --- LLM-suggested custom fix (A)
```

---

## 19. Apply Flow -- Full Cycle

### TUI Flow

```
1. SCAN VIEW -- user sees findings with fix indicators
   "X CRITICAL Art.50 - AI Disclosure missing"
   User presses: f (fix this) or Tab -> Fix page

2. FIX VIEW -- checklist of all fixable findings

   STAGED
   [x] [A] ai-disclosure     Art. 50(1)   +7 pts
   [x] [B] fria              Art. 27      +8 pts

   NOT STAGED
   [ ] [C] compliance-metadata Art. 50    +4 pts

   Score: 32 -> 47 (+15) | 2/3 selected

   [Right panel: type-aware diff preview]

   User presses: Enter (apply selected)

3. APPLY -- per-finding execution via AppCommand::ApplyFixes

   For each selected finding:
   a. Backup original file -> .complior/backups/{ts}-{name}
   b. apply_fix_to_file():
      Type A/C: read -> validate before-lines -> splice after-lines -> inject import -> write
      Type B: infer_doc_path() -> create dirs -> write
   c. Update FixItemStatus (Applied | Failed)

4. VALIDATE -- automatic re-scan + score comparison (AppCommand::AutoScan)

   ScanService.scan(projectPath)
   Compare: pre_fix_score -> post_fix_score
   Show toast: "Fix verified: 32 -> 47 (+15)"
   Evidence chain: append fix.applied + fix.validated
   Undo history: record in .complior/fixes-history.json
```

### CLI Flow

```bash
$ complior fix --dry-run
  Scanning project...
  Found 5 fixable findings (9 total findings)

  CHECK ID              TYPE    ARTICLE    SCORE IMPACT
  ai-disclosure         [A]     Art. 50(1) +7
  fria                  [B]     Art. 27    +8
  risk-management       [B]     Art. 9     +8
  compliance-metadata   [C]     Art. 50    +4
  interaction-logging   [A]     Art. 12    +5

  Predicted: 32 -> 64 (+32 points)

$ complior fix
  Applying 5 fixes...
  ok ai-disclosure         -> src/components/AIDisclosure.tsx (created)
  ok fria                  -> .complior/docs/fria.md (created)
  ok risk-management       -> .complior/docs/risk-management.md (created)
  ok compliance-metadata   -> .well-known/ai-compliance.json (created)
  ok interaction-logging   -> src/logging/ai-interaction-logger.ts (created)

  Score: 32 -> 61 (+29 actual)
  5/5 applied, 0 failed
```

### HTTP API Flow

```
GET /fix/preview
-> { fixes: [...FixPlan], count: 5, currentScore: 32 }

POST /fix/apply { checkId: "ai-disclosure", useAi: false }
-> { plan: FixPlan, applied: true, scoreBefore: 32, scoreAfter: 39, backedUpFiles: [...] }

POST /fix/apply-all { useAi: true }
-> { results: [...], summary: { total: 5, applied: 5, failed: 0, scoreBefore: 32, scoreAfter: 61 },
     unfixedFindings: [...], filterContext: {...} }

POST /fix/undo { id: 3 }
-> { validation: { checkId: "fria", before: "pass", after: "fail", scoreDelta: -8, totalScore: 53 } }
```

---

## 20. Missing Coverage & Future Work

### Planned Strategies (Future)

| Strategy | Category | Description |
|----------|----------|-------------|
| LLM-Suggested | A | Custom fix from L5 LLM analysis findings |
| Rate Limiter | A | Rate limiter template for cybersecurity |
| Model Format | D | Conversion plan: pickle -> safetensors |
| Multi-File Refactoring | A | Split file + update imports |
| Test Generation | A | Compliance test for each fix |

### Missing Test Coverage

- Stale diff protection edge cases (concurrent modification)
- Multi-file fix atomicity
- Undo with concurrent scan
- LLM enrichment fallback paths (network timeout, rate limit)
- Import injection with various import styles (dynamic import, require)
- Batch apply with mixed success/failure across files
