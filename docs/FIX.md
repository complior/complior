# Complior Fixer — Methodology & Pipeline

The Complior fixer is a **deterministic, strategy-based auto-remediation engine** that generates and applies compliance fixes for findings discovered by the scanner. It produces structured fix plans with score-impact prediction, type-aware diffs, backup/undo, post-apply validation, and evidence recording.

**Design principle:** Fixer NEVER invents compliance logic. All fixes are deterministic (templates + strategies). LLM only enriches document content when explicitly opted-in (`--ai`). Fixes are always preview-first, reversible, and validated.

**Rules version:** `1.0.0` — EU AI Act Regulation 2024/1689
**Fix categories:** 5 (A: Code, B: Documentation, C: Config, D: Dependencies, E: Passport)
**Strategies:** 5 implemented, 13 planned
**Updated:** 2026-03-18
**Tests:** ~60 fixer-specific tests (out of 1777 total)

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          COMPLIOR FIX PIPELINE                                  │
│                                                                                 │
│  5 categories · 18 strategies · 14 templates · backup/undo · evidence chain    │
└─────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
 complior fix — AUTO-REMEDIATION (offline, modifies project files)
═══════════════════════════════════════════════════════════════════════════════════

PHASE 1: DISCOVERY                PHASE 2: PLANNING              PHASE 3: APPLY
│                                 │                               │
├─ Last ScanResult                ├─ For each fail finding:       ├─ Backup original
│  (from scan or cache)           │  findStrategy(finding, ctx)   │  .complior/backups/
│                                 │                               │
├─ Filter: type == 'fail'         ├─ Strategy returns FixPlan:    ├─ Apply actions:
│  (skip pass/skip findings)      │  ├─ obligationId              │  ├─ create: new file
│                                 │  ├─ article ref               │  ├─ edit: splice diff
├─ Build FixContext:              │  ├─ fix type (A-E)            │  └─ import injection
│  ├─ projectPath                 │  ├─ actions[]                 │
│  ├─ framework (React/Node/…)    │  ├─ diff (unified)            ├─ Template resolution:
│  └─ existingFiles[]             │  ├─ scoreImpact               │  [TEMPLATE:file] → content
│                                 │  └─ commitMessage             │  + passport pre-fill
                                  │                               │  + optional LLM enrich
                                  ├─ Preview:                     │
                                  │  CLI: table + diff             ├─ Re-scan project
                                  │  TUI: type-aware panel         │  (full L1-L4)
                                  │  API: GET /fix/preview         │
                                                                  ├─ Validate:
                                                                  │  finding fail → pass?
                                                                  │  score delta
                                                                  │
                                                                  ├─ Record evidence
                                                                  │  .complior/evidence/
                                                                  │
                                                                  ├─ Record undo history
                                                                  │  .complior/fixes-history.json
                                                                  │
                                                                  └─ Emit events:
                                                                     score.updated
                                                                     fix.validated

═══════════════════════════════════════════════════════════════════════════════════
 COMMANDS & ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════════

CLI:
  complior fix                           Apply all available fixes
  complior fix --dry-run                 Preview fixes without applying
  complior fix --ai                      Apply with LLM-enriched documents
  complior fix --json                    JSON output for CI/CD
  complior docs generate --missing       Generate missing compliance documents

TUI (page 3 — Fix):
  Space    toggle fix selection
  a        select all
  n        deselect all
  d        toggle diff preview
  Enter    apply selected fixes

HTTP API:
  GET  /fix/preview                      List all available fix plans
  POST /fix/preview                      Preview single finding fix
  POST /fix/apply                        Apply single fix
  POST /fix/apply-and-validate           Apply + validate + evidence
  POST /fix/apply-all                    Batch apply all fixes
  POST /fix/undo                         Undo last fix or by ID
  GET  /fix/history                      Fix history log

═══════════════════════════════════════════════════════════════════════════════════
 WHAT EACH SCAN LAYER PRODUCES → WHAT THE FIXER CAN REMEDIATE
═══════════════════════════════════════════════════════════════════════════════════

Scanner Layer          Finding Example            Fix Category    Fix Action
─────────────────────  ───────────────────────    ────────────    ──────────────────
L1 File Presence       ai-disclosure missing       A (Code)       Create component/middleware
L1 File Presence       documentation missing       B (Doc)        Generate from template
L1 File Presence       compliance-metadata missing C (Config)     Create .well-known/ai-compliance.json
L1 File Presence       passport-presence missing   E (Passport)   complior agent init

L2 Doc Structure       l2-fria incomplete          B (Doc)        Regenerate with passport data + LLM
L2 Doc Structure       l2-tech-documentation       B (Doc)        Generate from template

L3 Dependencies        l3-banned-deepface          —              ⚠ Manual (remove package)
L3 Dependencies        l3-dep-vuln                 D (Deps)       🔮 Planned: semver upgrade
L3 Dependencies        l3-missing-bias-testing     C (Config)     🔮 Planned: add fairlearn dep

L4 Code Patterns       l4-bare-llm                 A (Code)       SDK wrapper + import injection
L4 Code Patterns       l4-security-risk            A (Code)       🔮 Planned: safe alternative
L4 Code Patterns       l4-human-oversight          A (Code)       🔮 Planned: HITL gate template
L4 Code Patterns       l4-logging                  A (Code)       Create interaction logger
L4 Code Patterns       l4-kill-switch              A (Code)       🔮 Planned: feature flag

NHI Secrets            l4-nhi-openai-key           C (Config)     🔮 Planned: .gitignore + rotation
NHI Secrets            l4-nhi-aws-key              C (Config)     🔮 Planned: env var migration

Cross-Layer            cross-sdk-no-disclosure     A (Code)       Create disclosure (same as L1)
Cross-Layer            cross-doc-code-mismatch     B (Doc)        🔮 Planned: update doc from code

Deep (ext-semgrep)     ext-semgrep-bare-call       A (Code)       SDK wrapper (same strategy)
Deep (ext-bandit)      ext-bandit-B301             A (Code)       🔮 Planned: safe deserialization
Deep (ext-modelscan)   ext-modelscan-PickleUnsafe  —              ⚠ Manual (convert to safetensors)
Deep (ext-detect-sec)  ext-detect-secrets-AWS      C (Config)     🔮 Planned: .gitignore + rotation

L5 LLM Analysis        l5-* findings               varies         🔮 Planned: LLM-suggested fix
```

---

## Fix Categories

Complior classifies every fix into one of 5 categories. Each category has distinct apply mechanics, diff rendering, and validation logic.

### Category A — Code Fix

Modifies or creates source code files. Most complex category — requires understanding of the project's framework, language, and import system.

```
Fix Type:         code_injection
Apply Method:     Structured diff (before/after lines) + import injection
Diff Rendering:   Red/green unified diff with line numbers
Stale Protection: Validates before-lines match file before splice
Rollback:         File backup → restore on undo
```

**Implemented strategies:**

| Strategy | Check ID | Article | What it creates | Score Impact |
|----------|----------|---------|-----------------|--------------|
| Disclosure | `ai-disclosure` | Art. 50(1) | React component OR server middleware | +7 |
| Content Marking | `content-marking` | Art. 50(2) | C2PA/IPTC config JSON | +5 |
| Interaction Logging | `interaction-logging` | Art. 12 | Logger module with typed interface | +5 |

**Planned strategies (S06-S07):**

| Strategy | Check ID | Article | What it creates | Priority |
|----------|----------|---------|-----------------|----------|
| SDK Wrapper | `l4-bare-llm` | Art. 50(1) | `complior(client, config)` wrapping | HIGH |
| Permission Guard | `l4-human-oversight` | Art. 14 | HITL approval gate function | HIGH |
| Kill Switch | `l4-kill-switch` | Art. 14 | Feature flag with env var | MEDIUM |
| Error Handler | `l4-security-risk` | Art. 15(4) | try/catch with compliance logging | MEDIUM |
| Data Governance | `l4-data-governance` | Art. 10 | Validation middleware | LOW |
| Cybersecurity | `l4-cybersecurity` | Art. 15(4) | Rate limiter + input sanitizer | LOW |

**Framework-aware generation:**
- **React/Next.js:** TSX component (e.g., `AIDisclosure.tsx`)
- **Express/Fastify/Hono:** Middleware with typed request/response
- **Python (planned):** Decorator pattern (e.g., `@complior_disclosure`)
- **Generic:** Standalone module with explicit exports

### Category B — Documentation

Generates EU AI Act compliance documents from templates. Most impactful category — typical projects gain +30-50 points from documentation alone.

```
Fix Type:         template_generation
Apply Method:     Create file from template → passport pre-fill → optional LLM enrichment
Diff Rendering:   CREATE header + proposed content preview
Stale Protection: Skips if output file already exists
Rollback:         Delete created file on undo
```

**Template Registry (14 document types, single source of truth):**

| Doc Type | Article | Template File | Output File | Score Impact |
|----------|---------|---------------|-------------|--------------|
| `fria` | Art. 27 | `eu-ai-act/fria.md` | `.complior/docs/fria.md` | +8 |
| `technical-documentation` | Art. 11 | `eu-ai-act/tech-docs.md` | `.complior/docs/tech-docs.md` | +8 |
| `risk-management` | Art. 9 | `eu-ai-act/risk-management.md` | `.complior/docs/risk-management.md` | +8 |
| `data-governance` | Art. 10 | `eu-ai-act/data-governance.md` | `.complior/docs/data-governance.md` | +8 |
| `monitoring-policy` | Art. 72 | `eu-ai-act/monitoring.md` | `.complior/docs/monitoring.md` | +8 |
| `art5-screening` | Art. 5 | `eu-ai-act/art5-screening.md` | `.complior/docs/art5.md` | +8 |
| `incident-report` | Art. 73 | `eu-ai-act/incident-report.md` | `.complior/docs/incident-report.md` | +8 |
| `declaration-of-conformity` | Art. 47 | `eu-ai-act/declaration.md` | `.complior/docs/declaration.md` | +8 |
| `worker-notification` | Art. 26(7) | `eu-ai-act/worker-notification.md` | `.complior/docs/worker-notification.md` | +8 |
| `qms` | Art. 17 | `eu-ai-act/qms.md` | `.complior/docs/qms.md` | +8 |
| `instructions-for-use` | Art. 13 | `eu-ai-act/instructions-for-use.md` | `.complior/docs/instructions.md` | +8 |
| `ai-literacy` | Art. 4 | `eu-ai-act/ai-literacy.md` | `docs/ai-literacy.md` | +8 |
| `gpai-transparency` | Art. 53 | `eu-ai-act/model-card.md` | `MODEL_CARD.md` | +8 |
| `gpai-systemic-risk` | Art. 55 | `eu-ai-act/systemic-risk.md` | `.complior/docs/systemic-risk.md` | +8 |

**Three-stage document generation pipeline:**

```
Stage 1: Template Loading
  TEMPLATE_REGISTRY → file path → disk read

Stage 2: Passport Pre-fill (deterministic)
  22+ placeholders:
    [Company Name]     → passport.organization
    [AI System Name]   → passport.name
    [Provider]         → passport.provider
    [Risk Class]       → passport.risk_class
    [Model ID]         → passport.model_id
    [Date]             → today
    ... 16 more

  Tracking: prefilledFields[] vs manualFields[]
  Typical pre-fill: 25-70% (depends on passport completeness)

Stage 3: LLM Enrichment (opt-in, --ai flag)
  Input: base document + passport + manual fields list
  LLM: fills unfilled sections using project context
  Safety: [REVIEW REQUIRED] for legal assertions
  Fallback: deterministic result if LLM fails
  Tracking: aiEnriched flag, aiFieldsCount
```

### Category C — Config Change

Creates or modifies configuration files. Lightweight fixes that establish compliance metadata without touching application code.

```
Fix Type:         config_fix | metadata_generation
Apply Method:     Create JSON/TOML file or edit existing config
Diff Rendering:   MODIFY header + proposed changes
Stale Protection: Standard file validation
Rollback:         Restore from backup
```

**Implemented:**

| Strategy | Check ID | Article | What it creates | Score Impact |
|----------|----------|---------|-----------------|--------------|
| Compliance Metadata | `compliance-metadata` | Art. 50 | `.well-known/ai-compliance.json` | +4 |

**Planned (S07-S10):**

| Strategy | Check ID | What it creates | Priority |
|----------|----------|-----------------|----------|
| Secret Rotation | `l4-nhi-*` | `.gitignore` + `.env.example` + rotation guide | HIGH |
| Docker Security | `l4-cybersecurity` | Security-hardened Dockerfile | MEDIUM |
| CI Compliance | `l3-ci-compliance` | GitHub Actions compliance workflow | MEDIUM |
| Bias Testing Config | `l3-missing-bias-testing` | `fairlearn.yaml` or `aequitas.toml` | LOW |

### Category D — Dependencies (PLANNED)

Modifies dependency manifests. Requires ecosystem-specific knowledge (npm, pip, cargo, go, maven).

```
Fix Type:         dependency_fix (planned)
Apply Method:     Edit manifest file + lockfile regeneration
Diff Rendering:   Package version diff
Stale Protection: Lockfile hash validation
Rollback:         Restore manifest + lockfile from backup
```

**Planned (S07-S10):**

| Strategy | Check ID | What it does | Priority |
|----------|----------|-------------|----------|
| CVE Upgrade | `l3-dep-vuln` | Bump to patched version (semver-aware) | HIGH |
| License Fix | `l3-dep-license` | Suggest license-compatible alternative | MEDIUM |
| Model Format | `ext-modelscan-*` | Convert pickle → safetensors manifest | LOW |

### Category E — Passport

Updates Agent Passport fields. Operates through the passport service, not directly on files.

```
Fix Type:         passport_update
Apply Method:     PassportService.updatePassport() → .complior/agents/{name}.json
Diff Rendering:   Field-level before/after
Stale Protection: Passport version check
Rollback:         Restore passport JSON from backup
```

**Implemented:**
- `complior agent init` — auto-discovery (creates passport)
- `complior agent fria <name>` — generates FRIA report, sets `fria_completed: true`
- Passport completeness update after fix application

---

## Fix Diff Builder

Generates structured diffs for Category A (Code) fixes. Used when wrapping bare LLM calls with `@complior/sdk`.

**File:** `engine/core/src/domain/scanner/fix-diff-builder.ts`

```
Input:  Finding with bare LLM call (e.g., openai.chat.completions.create)
Output: FixDiff { file_path, start_line, before[], after[], import_line? }

Process:
1. Find call-site line in code_context
2. Search backward for constructor (new OpenAI, OpenAI())
3. Handle multi-line constructors (paren depth tracking)
4. Generate before/after with @complior/sdk wrapping
5. Set import_line: "import { complior } from '@complior/sdk'"
```

**Example diff:**

```diff
  // Before:
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // After:
  import { complior } from '@complior/sdk';
  const client = complior(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));
```

### Import Injection Logic (Rust CLI)

When `fix_diff.import_line` is set:
1. Scan file for existing `import ` lines
2. If `@complior/sdk` already imported → skip
3. Insert after last import line (or at line 1 if no imports)
4. Adjust line numbers for subsequent splices

---

## Fix Service Architecture

### Domain Layer (Pure Business Logic)

```
engine/core/src/domain/fixer/
├── types.ts           FixPlan, FixResult, FixValidation, FixHistory, FixStrategy
├── create-fixer.ts    Factory: createFixer(deps) → { generateFix, generateFixes, previewFix }
├── strategies.ts      5 strategy functions + STRATEGIES registry
├── diff.ts            generateUnifiedDiff(), generateCreateDiff()
└── fix-history.ts     FixHistoryEntry helpers
```

**Strategy Registry:** Ordered array. First matching strategy wins. `documentationStrategy` is catch-all for obligation-based template fixes.

```typescript
const STRATEGIES: readonly FixStrategy[] = [
  disclosureStrategy,        // ai-disclosure → component/middleware
  contentMarkingStrategy,    // content-marking → C2PA config
  loggingStrategy,           // interaction-logging → logger module
  metadataStrategy,          // compliance-metadata → .well-known/
  documentationStrategy,     // catch-all: obligation → template
];
```

### Service Layer (Orchestration)

```
engine/core/src/services/fix-service.ts
  FixServiceDeps:
    fixer           → domain fixer (strategy execution)
    scanService     → re-scan after apply
    events          → emit score.updated, fix.validated
    getProjectPath  → current project
    getLastScanResult → cached scan for preview
    loadTemplate    → disk template loader
    undoService?    → optional undo recording
    evidenceStore?  → optional evidence chain
    passportService? → optional passport for doc pre-fill
    llm?            → optional LLM for doc enrichment
```

### HTTP Layer (Thin Routes)

```
engine/core/src/http/routes/fix.route.ts
  7 endpoints, all delegate to FixService
  Request validation via Zod schemas
  Error handling returns structured error JSON
```

### CLI Layer (Rust — Headless)

```
cli/src/headless/fix.rs
  run_headless_fix(dry_run, json, path, config, use_ai) → exit code
  - Dry-run: GET /fix/preview → display table
  - Apply: POST /fix/apply-all → display results + score delta
  - JSON mode: structured output for CI/CD
```

### TUI Layer (Rust — Interactive)

```
cli/src/views/fix/
├── mod.rs            FixViewState, FixableItem, FixItemStatus
├── render.rs         Multi-fix checklist + single-fix detail
├── diff_preview.rs   Type-aware diff rendering (A/B/C)
├── apply.rs          Real filesystem modification + stale protection
└── tests.rs          8 snapshot tests
```

---

## Fix Application Flow

### Full Lifecycle (TUI)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. SCAN VIEW — user sees findings with fix indicators           │
│    "✖ CRITICAL Art.50 · AI Disclosure missing"                  │
│    User presses: f (fix this) or Tab → Fix page                │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 2. FIX VIEW — checklist of all fixable findings                 │
│                                                                 │
│    STAGED                                                       │
│    ☑ [A] ai-disclosure     Art. 50(1)   +7 pts                 │
│    ☑ [B] fria              Art. 27      +8 pts                 │
│                                                                 │
│    NOT STAGED                                                   │
│    ☐ [C] compliance-metadata Art. 50    +4 pts                 │
│                                                                 │
│    Score: 32 → 47 (+15) | 2/3 selected                        │
│                                                                 │
│    [Right panel: type-aware diff preview]                       │
│                                                                 │
│    User presses: Enter (apply selected)                         │
└────────────────────┬────────────────────────────────────────────┘
                     │ AppCommand::ApplyFixes
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. APPLY — per-finding execution                                │
│                                                                 │
│    For each selected finding:                                   │
│    a. Backup original file → .complior/backups/{ts}-{name}     │
│    b. apply_fix_to_file():                                      │
│       ├─ Type A/C: read → validate before-lines → splice       │
│       │            after-lines → inject import → write          │
│       └─ Type B: infer_doc_path() → create dirs → write        │
│    c. Update FixItemStatus (Applied | Failed)                   │
└────────────────────┬────────────────────────────────────────────┘
                     │ AppCommand::AutoScan (spawned)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. VALIDATE — automatic re-scan + score comparison              │
│                                                                 │
│    ScanService.scan(projectPath)                                │
│    Compare: pre_fix_score → post_fix_score                      │
│    Show toast: "Fix verified: 32 → 47 (+15)"                   │
│                                                                 │
│    Evidence chain: append fix.applied + fix.validated           │
│    Undo history: record in .complior/fixes-history.json         │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 5. RESULTS SCREEN — visual confirmation                         │
│                                                                 │
│    Before  [████░░░░░░░░░░░░] 32/100                           │
│    After   [██████████░░░░░░] 47/100  (+15 points)             │
│                                                                 │
│    Zone: YELLOW (partial compliance)                            │
│    Next: fix 2 remaining high-severity issues to reach 60+     │
└─────────────────────────────────────────────────────────────────┘
```

### Full Lifecycle (CLI — Headless)

```
$ complior fix --dry-run
  Scanning project...
  Found 5 fixable findings (9 total findings)

  CHECK ID              TYPE    ARTICLE    SCORE IMPACT
  ai-disclosure         [A]     Art. 50(1) +7
  fria                  [B]     Art. 27    +8
  risk-management       [B]     Art. 9     +8
  compliance-metadata   [C]     Art. 50    +4
  interaction-logging   [A]     Art. 12    +5

  Predicted: 32 → 64 (+32 points)

$ complior fix
  Applying 5 fixes...
  ✓ ai-disclosure         → src/components/AIDisclosure.tsx (created)
  ✓ fria                  → .complior/docs/fria.md (created)
  ✓ risk-management       → .complior/docs/risk-management.md (created)
  ✓ compliance-metadata   → .well-known/ai-compliance.json (created)
  ✓ interaction-logging   → src/logging/ai-interaction-logger.ts (created)

  Score: 32 → 61 (+29 actual)
  5/5 applied, 0 failed
```

### Full Lifecycle (HTTP API)

```
GET /fix/preview
→ { fixes: [...FixPlan], count: 5 }

POST /fix/apply { checkId: "ai-disclosure", useAi: false }
→ { plan: FixPlan, applied: true, scoreBefore: 32, scoreAfter: 39, backedUpFiles: [...] }

POST /fix/apply-all { useAi: true }
→ { results: [...FixResult], summary: { total: 5, applied: 5, failed: 0, scoreBefore: 32, scoreAfter: 61 } }

POST /fix/undo { id: 3 }
→ { validation: { checkId: "fria", before: "pass", after: "fail", scoreDelta: -8, totalScore: 53 } }
```

---

## Safety Mechanisms

### Stale Diff Protection

Before applying any code fix, validates that the file hasn't changed since the scan:

```rust
// cli/src/views/fix/apply.rs
let file_slice: Vec<&str> = lines[start..end].iter().map(|s| s.trim()).collect();
let expected: Vec<&str> = diff.before.iter().map(|s| s.trim()).collect();
if file_slice != expected {
    return ApplyResult { success: false, detail: "File content changed since scan — re-scan first" }
}
```

If validation fails, the fix is rejected and the user must re-scan to get fresh diffs.

### File Backup

Every file touched by a fix is backed up before modification:

```
.complior/backups/
  1710756234-src_components_AIDisclosure.tsx
  1710756234-well-known_ai-compliance.json
```

Backups are used by the undo service to restore files to their pre-fix state.

### Post-Apply Validation

After every fix, a full re-scan runs and compares:
- **Finding status:** `fail` → `pass` (expected), or still `fail` (fix insufficient)
- **Score delta:** `scoreAfter - scoreBefore` (should be positive)
- **Side effects:** no new findings introduced

Events emitted:
- `score.updated` — { before, after }
- `fix.validated` — { checkId, passed: bool, scoreDelta }

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
- **Created files:** Delete the file
- **Edited files:** Restore from backup
- Mark entry as `"status": "undone"`
- Re-scan and emit events

### Evidence Chain Integration (C.R20)

After successful fix, an evidence entry is appended:

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

This creates a tamper-proof audit trail that an EU AI Act auditor can verify.

---

## Type-Aware Diff Rendering (TUI)

The TUI Fix page renders diff previews differently based on finding type:

### Type A — Code Fix

```
┌─ Current Code ───────────────────────────────────────────┐
│  Line 15:                                                │
│    const client = new OpenAI({                           │
│      apiKey: process.env.OPENAI_API_KEY                  │
│    });                                                   │
├─ Suggested Fix ──────────────────────────────────────────┤
│  - const client = new OpenAI({                           │
│  + const client = complior(new OpenAI({                  │
│      apiKey: process.env.OPENAI_API_KEY                  │
│  - });                                                   │
│  + }));                                                  │
├─ Add Import ─────────────────────────────────────────────┤
│  + import { complior } from '@complior/sdk';             │
└──────────────────────────────────────────────────────────┘
```

### Type B — New Document

```
┌─ CREATE docs/fria.md ────────────────────────────────────┐
│  (file does not exist yet)                               │
├─ Proposed Content ───────────────────────────────────────┤
│  # Fundamental Rights Impact Assessment                  │
│                                                          │
│  ## 1. AI System Description                             │
│  **System Name:** My AI Chatbot                          │
│  **Provider:** Acme Corp                                 │
│  **Risk Class:** High-Risk                               │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Type C — Config Change

```
┌─ MODIFY .well-known/ai-compliance.json ──────────────────┐
├─ Proposed Changes ───────────────────────────────────────┤
│  {                                                       │
│    "version": "1.0",                                     │
│    "scanner": "complior/0.9.0",                          │
│    "ai_systems": [{                                      │
│      "name": "[TO BE SET]",                              │
│      "risk_level": "[TO BE SET]"                         │
│    }]                                                    │
│  }                                                       │
└──────────────────────────────────────────────────────────┘
```

---

## Score Impact Model

### Per-Strategy Impact (Implemented)

| Strategy | Score Impact | Typical Real Delta | Why Difference |
|----------|-------------|-------------------|----------------|
| Documentation (any) | +8 predicted | +6 to +10 actual | Depends on L2 validation result |
| Disclosure | +7 predicted | +5 to +9 actual | May resolve cross-layer findings too |
| Content Marking | +5 predicted | +3 to +7 actual | Variable based on AI SDK detection |
| Interaction Logging | +5 predicted | +4 to +6 actual | Consistent |
| Compliance Metadata | +4 predicted | +3 to +5 actual | Low-weight check |

### Cumulative Fix Scenario

```
Starting Score:          32/100 (RED zone)

Fix all docs (8 templates): +48 to +64 predicted
  + disclosure:            +7
  + logging:               +5
  + metadata:              +4

Realistic outcome:       72-85/100 (YELLOW → GREEN)
```

### Score Calculation After Fix

Score is NOT just `old + sum(impacts)`. After fix, a full re-scan runs:
1. The fixed finding typically becomes `pass`
2. This changes the pass/fail ratio in its category
3. Category score is recalculated with weights
4. Cross-layer findings may also resolve
5. Critical cap may be lifted (if all criticals resolved)

This means actual delta can be higher or lower than predicted `scoreImpact`.

---

## Fix Strategy Matrix — Full Roadmap

### By Scan Layer → Fix Strategy

```
                     IMPLEMENTED                    PLANNED
                     ───────────                    ───────
L1 File Presence ─── disclosure (A)                 ─── SDK wrapper patterns (A)
                     content-marking (C)                 permission guard (A)
                     logging (A)                         kill-switch template (A)
                     documentation × 14 (B)
                     metadata (C)

L2 Doc Structure ─── documentation regen (B)        ─── doc update from code (B)
                                                         LLM section enrichment (B)

L3 Dependencies  ─── (none)                         ─── CVE auto-upgrade (D)
                                                         license alternative (D)
                                                         bias testing config (C)

L4 Code Patterns ─── (via L1 strategies)            ─── safe deserialization (A)
                                                         error handler wrapper (A)
                                                         data governance middleware (A)
                                                         rate limiter template (A)

NHI Secrets      ─── (none)                         ─── .gitignore generation (C)
                                                         env var migration guide (C)
                                                         secret rotation helper (C)

Cross-Layer      ─── (resolved by fixing root)      ─── doc-code sync (B+A)
                                                         passport field update (E)

Deep (Tier 2)    ─── (via L1/L4 strategies)         ─── bandit-specific fixes (A)
                                                         model format conversion (D)

L5 LLM           ─── (none)                         ─── LLM-suggested custom fix (A)
```

### By EU AI Act Article → Fix Capability

| Article | Obligation | Fix Status | Strategy |
|---------|-----------|------------|----------|
| Art. 4 | AI Literacy | ✅ Template | documentation (ai-literacy) |
| Art. 5 | Prohibited Practices | ⚠ Manual | no auto-fix (banned package removal) |
| Art. 9 | Risk Management | ✅ Template | documentation (risk-management) |
| Art. 10 | Data Governance | ✅ Template + 🔮 Code | documentation + planned middleware |
| Art. 11 | Technical Documentation | ✅ Template | documentation (tech-docs) |
| Art. 12 | Logging | ✅ Code + Template | logging strategy + monitoring template |
| Art. 13 | Instructions for Use | ✅ Template | documentation (instructions-for-use) |
| Art. 14 | Human Oversight | 🔮 Planned | HITL gate template |
| Art. 15 | Accuracy/Robustness | 🔮 Planned | error handler + rate limiter |
| Art. 17 | Quality Management | ✅ Template | documentation (qms) |
| Art. 26 | Deployer Monitoring | ✅ Template | documentation (monitoring-policy) |
| Art. 26(7) | Worker Notification | ✅ Template | documentation (worker-notification) |
| Art. 27 | FRIA | ✅ Template + FRIA gen | documentation + agent fria command |
| Art. 43 | Conformity Assessment | 🔮 Planned | declaration template |
| Art. 47 | Declaration of Conformity | ✅ Template | documentation (declaration) |
| Art. 49 | Agent Passport | ✅ Passport | complior agent init |
| Art. 50 | Transparency | ✅ Code + Config | disclosure + metadata strategies |
| Art. 51-53 | GPAI Transparency | ✅ Template | documentation (model-card) |
| Art. 55 | GPAI Systemic Risk | ✅ Template | documentation (systemic-risk) |
| Art. 72 | Post-Market Monitoring | ✅ Template | documentation (monitoring) |
| Art. 73 | Incident Reporting | ✅ Template | documentation (incident-report) |

---

## Document Generation Pipeline (Detail)

The document generator is a three-stage pipeline that converts empty templates into project-specific compliance documents.

### Stage 1: Template Loading

**Source:** `engine/core/data/templates/eu-ai-act/`

14 markdown templates with standardized placeholder format:

```markdown
# Fundamental Rights Impact Assessment

## 1. AI System Description
**System Name:** [AI System Name]
**Provider:** [Company Name]
**Risk Classification:** [Risk Class]
**Date:** [Date]

## 2. Impact Analysis
[MANUAL: Describe potential impacts on fundamental rights]

## 3. Mitigation Measures
[MANUAL: List specific mitigation measures]
```

### Stage 2: Passport Pre-fill (Deterministic)

**File:** `engine/core/src/domain/documents/document-generator.ts`

22+ placeholder-to-passport-field mappings:

| Placeholder | Passport Field | Example |
|-------------|---------------|---------|
| `[Company Name]` | `organization` | "Acme Corp" |
| `[AI System Name]` | `name` | "Customer Support Bot" |
| `[Provider]` | `provider` | "OpenAI GPT-4" |
| `[Risk Class]` | `risk_class` | "High-Risk" |
| `[Model ID]` | `model_id` | "gpt-4-turbo-2024-04-09" |
| `[Version]` | `version` | "2.1.0" |
| `[Description]` | `description` | "AI-powered customer support..." |
| `[Date]` | (computed) | "2026-03-18" |

**Tracking:**
- `prefilledFields[]` — successfully replaced from passport
- `manualFields[]` — require human input (e.g., risk assessment details)

### Stage 3: LLM Enrichment (opt-in)

**File:** `engine/core/src/domain/documents/ai-enricher.ts`

When `--ai` flag is set:
1. Identify remaining `[MANUAL: ...]` and unfilled `[TO BE SET]` sections
2. Build prompt with passport context + document type requirements
3. LLM generates substantive content for unfilled sections
4. Safety: legal assertions marked `[REVIEW REQUIRED]`
5. Fallback: base document returned if LLM fails

**Cost:** ~$0.02-0.05 per document (one LLM call per document)

---

## Planned Enhancements (13)

### Phase 1 — Advanced Code Fixes (S06-S07)

| # | Enhancement | Category | Check ID | What it generates |
|---|------------|----------|----------|-------------------|
| 1 | SDK Wrapper | A | `l4-bare-llm` | `complior(client)` wrapping with `@complior/sdk` |
| 2 | Permission Guard | A | `l4-human-oversight` | `requireApproval()` gate function |
| 3 | Kill Switch | A | `l4-kill-switch` | `AI_ENABLED` env var + feature flag util |
| 4 | Error Handler | A | `l4-security-risk` | try/catch with compliance-aware error logging |
| 5 | HITL Gate | A | `l4-conformity-assessment` | Human-in-the-loop approval workflow template |

### Phase 2 — Config & Dependency Fixes (S07-S10)

| # | Enhancement | Category | Check ID | What it generates |
|---|------------|----------|----------|-------------------|
| 6 | Secret Rotation | C | `l4-nhi-*` | `.gitignore` + `.env.example` + rotation guide |
| 7 | CVE Upgrade | D | `l3-dep-vuln` | Version bump in manifest (semver-aware) |
| 8 | License Fix | D | `l3-dep-license` | Alternative package suggestion |
| 9 | CI Compliance | C | `l3-ci-compliance` | GitHub Actions workflow with compliance gates |
| 10 | Bias Config | C | `l3-missing-bias-testing` | Testing config for fairlearn/aequitas |

### Phase 3 — Intelligent Fixes (S10+)

| # | Enhancement | Category | Source | What it generates |
|---|------------|----------|--------|-------------------|
| 11 | Bandit-Specific | A | `ext-bandit-*` | Safe alternatives (e.g., pickle → json) |
| 12 | Doc-Code Sync | B+A | `cross-doc-code-mismatch` | Update doc sections from code analysis |
| 13 | LLM-Suggested | A | `l5-*` findings | Custom fix from LLM analysis of finding |

### Phase 4 — Multi-File Fixes (Future)

- **Refactoring patterns:** Split file + update imports
- **Test generation:** Create compliance test for each fix
- **Migration scripts:** Automated version upgrades with AST transformation

---

## File Locations

### TypeScript Engine

| File | Role | LOC |
|------|------|-----|
| `engine/core/src/domain/fixer/types.ts` | Core types (FixPlan, FixResult, etc.) | ~80 |
| `engine/core/src/domain/fixer/create-fixer.ts` | Fixer factory | ~40 |
| `engine/core/src/domain/fixer/strategies.ts` | 5 fix strategies + registry | ~290 |
| `engine/core/src/domain/fixer/diff.ts` | Diff generation utilities | ~50 |
| `engine/core/src/domain/fixer/fix-history.ts` | Fix history helpers | ~20 |
| `engine/core/src/domain/scanner/fix-diff-builder.ts` | SDK wrapping diff builder | ~120 |
| `engine/core/src/domain/documents/document-generator.ts` | Deterministic doc generation | ~200 |
| `engine/core/src/domain/documents/ai-enricher.ts` | LLM document enrichment | ~80 |
| `engine/core/src/data/template-registry.ts` | 14 template entries (SSoT) | ~100 |
| `engine/core/src/services/fix-service.ts` | Fix orchestration service | ~230 |
| `engine/core/src/services/undo-service.ts` | Fix undo with file restore | ~120 |
| `engine/core/src/http/routes/fix.route.ts` | 7 HTTP endpoints | ~100 |

### Rust CLI

| File | Role | LOC |
|------|------|-----|
| `cli/src/headless/fix.rs` | Headless fix (dry-run + apply) | ~180 |
| `cli/src/views/fix/mod.rs` | Fix view state + logic | ~200 |
| `cli/src/views/fix/render.rs` | Multi/single-fix rendering | ~300 |
| `cli/src/views/fix/diff_preview.rs` | Type-aware diff rendering | ~250 |
| `cli/src/views/fix/apply.rs` | Real filesystem modification | ~150 |
| `cli/src/views/fix/tests.rs` | 8 snapshot tests | ~200 |
| `cli/src/app/executor.rs` | AppCommand::ApplyFixes handler | ~50 |
| `cli/src/types/engine.rs` | FixDiff, FindingType types | ~30 |

---

## Testing

### Engine Tests

| File | Tests | What it covers |
|------|-------|---------------|
| `domain/fixer/fixer.test.ts` | ~20 | Strategy selection, plan generation, edge cases |
| `services/fix-service.test.ts` | ~15 | Apply, validate, undo, evidence recording |
| `domain/documents/document-generator.test.ts` | ~10 | Template pre-fill, manual field tracking |

### CLI Tests (Rust)

| File | Tests | What it covers |
|------|-------|---------------|
| `views/fix/tests.rs` | 8 | Snapshot tests: checklist, single-fix, diff preview |
| `headless/tests.rs` | ~5 | Headless fix output format |

### Missing Test Coverage (Planned)

- Stale diff protection edge cases
- Multi-file fix atomicity
- Undo with concurrent scan
- LLM enrichment fallback paths
- Import injection with various import styles
