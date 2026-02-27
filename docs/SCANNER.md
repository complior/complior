# Complior Scanner — Methodology & Pipeline

The Complior scanner is a **deterministic, 5-layer compliance analysis engine** that evaluates software projects against the EU AI Act (Regulation 2024/1689). It produces actionable findings with confidence scoring, obligation mapping, evidence collection, and fix suggestions.

**Design principle:** LLM never makes compliance determinations. Layers 1-4 are fully deterministic (AST + rules). Layer 5 (LLM) is opt-in and only clarifies findings in the UNCERTAIN zone (40-70% confidence).

**Rules version:** `1.0.0` — EU AI Act Regulation 2024/1689

---

## Pipeline Overview

```
:scan (TUI)                                    :scan-deep (TUI)
  │                                               │
  ▼                                               ▼
POST /scan { path } ──→ Engine HTTP     POST /scan/deep { path }
  │                                               │
  ▼                                               ▼
FileCollector.collectFiles(projectPath)
  │  Recursive traversal, max 500 files, max 1MB each
  │  Excludes: node_modules, .git, dist, build, __pycache__, .next, coverage
  │  Includes: .ts .tsx .js .jsx .json .md .yaml .yml .py .html .css
  ▼
Scanner.scan(ScanContext)                Scanner.scanDeep(ScanContext, fileContents)
  │                                               │
  ├─→ Layer 1: File Presence (7 checks)         weight: 1.00
  ├─→ Layer 2: Document Structure (8 validators) weight: 0.95
  ├─→ Layer 3: Config & Dependencies (6 checks)  weight: 0.85
  ├─→ Layer 4: AST Pattern Matching (31 rules)   weight: 0.70
  ├─→ Cross-Layer Verification (5 rules)          ──────────┐
  ├─→ Evidence Collection (7 source types)                   │
  │                                                          │
  │                              [scanDeep only] ────────────┤
  │                              Layer 5: LLM Analysis       │
  │                              weight: 0.90                │
  │                              Uncertain findings → LLM    │
  │                              ────────────────────────────┘
  ▼
ScoreCalculator.calculateScore(findings, scoringData)
  │  Category-weighted scoring → zone (red/yellow/green)
  │  + regulationVersion stamp
  │  + evidence attachment
  ▼
ScanResult { score, findings[], evidence[], regulationVersion, duration }
  │
  ├─→ TUI renders: score panel, findings list, toast notification
  ├─→ Drift detection (vs. previous scan → scan.drift event)
  └─→ Background watcher re-scans on file changes (Compliance Gate, ~200ms)
```

**Typical scan time:** <500ms (L1-L4), +2-5s with L5

---

## Layer 1 — File Presence

**Confidence:** 95-98% (deterministic) | **Weight:** 1.00

Scans for the existence of compliance artifacts — files, directories, code patterns that indicate compliance measures are in place.

### Checks

| Check ID | Article | Obligation | What it detects |
|----------|---------|------------|-----------------|
| `ai-disclosure` | Art. 50(1) | OBL-015 | AI disclosure patterns in UI code (.tsx, .jsx, .html) |
| `content-marking` | Art. 50(2) | OBL-016 | C2PA, watermarking, or AI-generated content labels |
| `interaction-logging` | Art. 12 | OBL-006 | Structured logging around AI API calls |
| `ai-literacy` | Art. 4 | OBL-001 | AI-LITERACY.md or training policy documents |
| `gpai-transparency` | Art. 51-53 | OBL-022 | MODEL_CARD.md or GPAI documentation |
| `compliance-metadata` | — | OBL-005 | `.well-known/ai-compliance.json` or `.complior/` directory |
| `documentation` | — | OBL-019 | COMPLIANCE.md or compliance documentation |

### How each check works

**ai-disclosure** — Looks for disclosure patterns (`/\bAI[- ]?powered\b/i`, `/\btransparency notice\b/i`, etc.) in UI files. If chat/bot code exists without disclosure → FAIL (severity: high). If no chat code → SKIP.

**content-marking** — Detects content provenance (`/\bc2pa\b/i`, `/\bwatermark/i`, `/X-AI-Generated/i`) alongside content generation indicators (`/\bgenerateImage\b/`, `/\bDALL[-.]?E\b/i`, `/\bstable[- ]?diffusion\b/i`). Generation without marking → FAIL.

**interaction-logging** — Checks for logging libraries (winston, pino, bunyan) AND structured log fields (timestamp, session_id, input/output) around AI API calls (openai, anthropic, chat.completions). AI calls without logging → FAIL (severity: critical).

**ai-literacy** — Searches for policy files (`AI-LITERACY.md`, `AI_COMPETENCY*`) or training records directories. Also checks markdown content for keywords (`/\bai literacy\b/i`, `/\bstaff training\b.*\bai\b/i`).

**gpai-transparency** — Looks for model cards and GPAI documentation when model training code is detected (fine-tuning, transformers, torch, tensorflow). Training code without model card → FAIL.

**compliance-metadata** — Checks for `.well-known/ai-compliance.json`, `.complior/` directory, or HTML meta tags with compliance references.

**documentation** — Searches for `COMPLIANCE.md`, `EU-AI-ACT*` files, or compliance content in existing docs.

---

## Layer 2 — Document Structure

**Confidence:** 65-95% (deterministic heading + content depth) | **Weight:** 0.95

Validates that required compliance documents contain mandatory sections and have substantive content. Uses YAML-defined validators that specify required and optional headings per document.

### Validators

| Validator | Document | Article | Obligation | Required Sections |
|-----------|----------|---------|------------|-------------------|
| `ai-literacy` | AI-LITERACY.md | Art. 4 | OBL-001 | Training Program, Training Levels, Assessment Methods |
| `tech-documentation` | TECH-DOCUMENTATION.md | Art. 11 | OBL-005 | System Description, Architecture, Data Sources |
| `fria` | FRIA.md | Art. 27 | OBL-013 | Risk Assessment, Impact Analysis, Mitigation Measures |
| `declaration-conformity` | DECLARATION-OF-CONFORMITY.md | Art. 47 | OBL-019 | Conformity Statement, Standards Applied, Evidence |
| `monitoring-policy` | MONITORING-POLICY.md | Art. 26 | OBL-011 | Monitoring Scope, Frequency, Escalation Procedures |
| `incident-report` | INCIDENT-REPORT.md | Art. 73 | OBL-021 | Incident Description, Root Cause, Corrective Actions |
| `art5-screening` | ART5-SCREENING.md | Art. 5 | OBL-002 | Prohibited Practices, Screening Results, Mitigations |
| `worker-notification` | WORKER-NOTIFICATION.md | Art. 26(7) | OBL-012 | Notification Scope, Affected Workers, Timeline |

### Validation logic

1. Find document by filename pattern (case-insensitive, supports `-` and `_` variants)
2. Extract headings via regex: `/^#{1,4}\s+(.+)$/gm` (H1-H4)
3. Normalize text: lowercase, collapse whitespace/dashes/underscores
4. Match against required sections (fuzzy match via normalized comparison)
5. **Content depth analysis** — for each found section, measure:
   - Word count, sentence count
   - Presence of lists (`-`, `*`, numbered) and tables (`|`)
   - Presence of specifics (dates, percentages, proper nouns, numbers)
6. Section classified as **shallow** if: word count < 50 AND no lists/tables AND no specifics
7. Return status:
   - **VALID** → all required sections present with substantive content (confidence: 95%)
   - **PARTIAL** → some sections present (confidence: 75%, severity: medium)
   - **SHALLOW** → all headings present but >50% sections lack depth (confidence: 65%, severity: medium)
   - **EMPTY** → document missing or no headings (confidence: 95%, severity: high)

Each validator also defines optional sections (e.g., Record Keeping, Roles and Responsibilities) which improve the score but don't trigger failures.

### Section Depth Measurement

```typescript
interface SectionDepth {
  readonly wordCount: number;
  readonly sentenceCount: number;
  readonly hasLists: boolean;      // markdown lists (-, *, 1.)
  readonly hasTables: boolean;     // markdown tables (|)
  readonly hasSpecifics: boolean;  // dates, %, proper nouns, numbers
  readonly isShallow: boolean;     // wordCount < 50 AND no lists/tables/specifics
}
```

---

## Layer 3 — Configuration & Dependencies

**Confidence:** 80-99% (depends on finding type) | **Weight:** 0.85

Scans project configuration files, dependency manifests, environment variables, Docker configs, and CI/CD pipelines.

### 3.1 Banned Packages — 51 packages (severity: critical, confidence: 99%)

Immediate prohibition under Art. 5. Detection triggers CRITICAL finding with €35M/7% turnover penalty reference.

All 8 prohibited categories of Art. 5 are covered:

| Article | Category | Packages | Examples |
|---------|----------|----------|----------|
| Art. 5(1)(a) | Subliminal/manipulative techniques | 6 | subliminal-ai, dark-patterns, nudge-ai, manipulative-ux |
| Art. 5(1)(b) | Exploitation of vulnerabilities | 1 | vulnerability-exploitation |
| Art. 5(1)(c) | Social scoring | 7 | social-credit-score, social-score, reputation-score, citizen-score, trust-score, behavior-score, credit-social |
| Art. 5(1)(d) | Criminal risk prediction | 5 | predpol, predictive-policing, crime-prediction, precrime, recidivism-predictor |
| Art. 5(1)(e) | Untargeted facial scraping | 2 | clearview-ai, face-scraper |
| Art. 5(1)(f) | Emotion recognition (workplace/education) | 7 | deepface, fer, emotion-recognition, py-feat, emopy, affectiva, emotion-api |
| Art. 5(1)(g) | Biometric categorization | 13 | face-api.js, insightface, arcface, amazon-rekognition, @azure/cognitiveservices-face, google-cloud-vision, clarifai, kairos, luxand, facepp, deepid |
| Art. 5(1)(h) | Real-time biometric ID (public spaces) | 5 | real-time-facial, crowd-face, surveillance-ai, mass-surveillance, live-biometric |

> Package matching is case-insensitive.

### 3.1b Prohibited Patterns — 10 regex fallbacks

When exact package name doesn't match, regex patterns detect prohibited usage in code/descriptions:

| Pattern | Violation | Article |
|---------|-----------|---------|
| `emotion.*recogni(tion\|ze).*real.?time` | Real-time emotion recognition | Art. 5(1)(f) |
| `social.*scor(e\|ing)` | Social scoring system | Art. 5(1)(c) |
| `subliminal.*messag` | Subliminal messaging | Art. 5(1)(a) |
| `biometric.*categori[sz]` | Biometric categorization | Art. 5(1)(g) |
| `facial.*scrap(e\|ing)` | Facial image scraping | Art. 5(1)(e) |
| `predictive.*polic` | Predictive policing | Art. 5(1)(d) |
| `crime.*predict` | Criminal risk prediction | Art. 5(1)(d) |
| `mass.*surveillance` | Mass surveillance | Art. 5(1)(h) |
| `real.?time.*biometric.*identif` | Real-time biometric ID | Art. 5(1)(h) |
| `manipulat(e\|ive\|ion).*behavio(r\|ur)` | Behavioral manipulation | Art. 5(1)(a) |

### 3.2 AI SDK Detection (26 packages across 4 ecosystems)

Detects usage of AI/LLM libraries. Not a failure — but triggers downstream checks (bias testing, logging, disclosure, cross-layer).

**npm (15):** openai, @anthropic-ai/sdk, anthropic, @google/generative-ai, @google-cloud/aiplatform, cohere-ai, @mistralai/mistralai, ai (Vercel), @ai-sdk/openai, @ai-sdk/anthropic, langchain, llamaindex, replicate, huggingface, @huggingface/inference

**pip (7):** google-generativeai, cohere, mistralai, llama-index, transformers, torch, tensorflow

**cargo (2):** async-openai, llm

**go (2):** github.com/sashabaranov/go-openai, github.com/anthropics/anthropic-sdk-go

### 3.3 Bias Testing Check (OBL-009, Art. 10)

If AI SDKs detected but no bias testing library found → WARNING (severity: low).

**Recognized bias testing libraries:** fairlearn, aif360, aequitas, responsibleai, @responsible-ai/fairness

### 3.4 Log Retention (OBL-006, Art. 12)

Scans `docker-compose.yml` for logging configuration with retention/rotation settings. Requirement: log retention >= 180 days.

### 3.5 Environment Variables

Scans `.env`, `.env.example`, `.env.local`:
- AI API keys present → OK
- No `LOG_LEVEL` → WARNING (Art. 12)
- No monitoring/observability (Sentry, Datadog, New Relic) → WARNING (Art. 26)

### 3.6 CI/CD Compliance

Scans `.github/workflows/*.yml` for compliance step keywords: `complior`, `compliance`, `audit`, `security-scan`, `ai-act`. Missing → WARNING.

### Dependency file parsing

| Ecosystem | Manifest | Parser |
|-----------|----------|--------|
| npm | `package.json` | JSON parse → dependencies + devDependencies |
| Python | `requirements.txt` | Line-by-line, strip version specifiers |
| Rust | `Cargo.toml` | Regex `[dependencies]` section |
| Go | `go.mod` | Regex `require` block |

---

## Layer 4 — AST Pattern Matching

**Confidence:** 70-80% (heuristic) | **Weight:** 0.70

Scans source code with 31 regex rules across 14 categories. Two types: **negative patterns** (presence = failure) and **positive patterns** (absence = warning when AI SDK is detected).

### Scannable files

**Extensions:** .ts, .tsx, .js, .jsx, .py, .go, .vue, .html

**Excluded directories:** node_modules, dist, .git, vendor, build, __pycache__, .next, coverage, .cache, .output

### Negative Patterns — Bare LLM Calls (5 rules)

Detect unencapsulated LLM API calls that lack compliance wrapping. Severity: medium.

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `openai.chat.completions.create(` | Direct OpenAI call | Art. 50(1) |
| `anthropic.messages.create(` | Direct Anthropic call | Art. 50(1) |
| `google.generativeai` | Direct Google AI usage | Art. 50(1) |
| `cohere.chat(` | Direct Cohere call | Art. 50(1) |
| `mistral.chat.complete(` | Direct Mistral call | Art. 50(1) |

**Obligation:** OBL-015
**Fix:** "Wrap LLM calls with complior.wrap() or add AI disclosure"

### Negative Patterns — Security Risk (4 rules)

Detect unsafe coding patterns that violate Art. 15(4) cybersecurity requirements. Severity: medium.

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `eval(.*user\|req.\|input)` | Code injection via eval() | Art. 15(4) |
| `pickle.load(\|pickle.loads(` | Unsafe deserialization | Art. 15(4) |
| `torch.load(` (no map_location) | Unsafe model loading | Art. 15(4) |
| `exec(.*user\|os.system(.*input)` | Command injection | Art. 15(4) |

### Positive Patterns — Compliance Signals (9 categories)

Detected only when AI SDK usage is confirmed (from L3). Absence → severity: low.

| Category | Article | Key patterns |
|----------|---------|-------------|
| **Disclosure** | Art. 50(1) | `AIDisclosure`, `ai-disclosure`, `ai_disclosure` |
| **Human Oversight** | Art. 14 | `humanReview`, `human_review`, `manual_approval`, `human_oversight` |
| **Kill Switch** | Art. 14 | `AI_ENABLED`, `DISABLE_AI`, `killSwitch`, `feature_flag.*ai` |
| **Content Marking** | Art. 50(2) | `ai-generated`, `AIGenerated`, `c2pa`, `content_credentials` |
| **Logging** | Art. 12 | `logAiCall`, `aiLogger`, `compliance.log`, `auditLog`, `ai_audit` |
| **Data Governance** | Art. 10 | `data_validation`, `data_quality`, `data_lineage`, `consent_manag` |
| **Record-Keeping** | Art. 12 | `audit_trail`, `compliance_record`, `retention_policy` |
| **Deployer Monitoring** | Art. 26(5) | `model_monitor`, `drift_detect`, `incident_report`, `safety_report` |
| **GPAI Transparency** | Art. 53 | `model_card`, `training_data_summary`, `compute_report` |

Additional positive categories (checked but not AI-SDK-gated):

| Category | Article | Key patterns |
|----------|---------|-------------|
| **Accuracy/Robustness** | Art. 15 | `model_validation`, `accuracy_metric`, `robustness_test`, `adversarial_test` |
| **Cybersecurity** | Art. 15(4) | `rate_limit`, `input_sanitiz`, `injection_prevent` |
| **Conformity Assessment** | Art. 43 | `conformity_declar`, `ce_mark` |

---

## Cross-Layer Verification

**New in v1.0** — Combines signals from multiple layers to detect contradictions and gaps.

5 cross-layer rules run after L1-L4, before scoring:

| Rule ID | Layers | Severity | What it detects |
|---------|--------|----------|-----------------|
| `cross-doc-code-mismatch` | L2 + L4 | medium | Monitoring policy exists but no monitoring code patterns found (Art. 26(5)) |
| `cross-sdk-no-disclosure` | L3 + L4 | high | AI SDK in dependencies but no disclosure component in code (Art. 50(1)) |
| `cross-banned-with-wrapper` | L3 + L4 | medium | Banned package + compliance controls present — may qualify for Art. 5 exception |
| `cross-logging-no-retention` | L3 + L4 | medium | Logging code exists but no log retention config (Art. 12) |
| `cross-kill-switch-no-test` | L1 + L4 | low | Kill switch found but no test files — untested safety mechanism (Art. 14) |

Cross-layer findings generate additional `CheckResult` entries with severity and obligation references.

---

## Layer 5 — LLM Analysis (opt-in via `/scan/deep`)

**Confidence:** variable (LLM-assigned) | **Weight:** 0.90

**Status:** Fully implemented, tested, and wired into the scanner via `POST /scan/deep`. Activated when LLM adapter is configured in composition root.

**Purpose:** Uses an LLM to analyze findings in the UNCERTAIN zone (40-70% confidence) where deterministic rules can't give a clear answer.

### Parameters

| Constant | Value |
|----------|-------|
| Max findings per scan | 20 |
| Max code snippet | 500 lines |
| Uncertainty range | 40-70% confidence |
| Model | Configured via `llm.routeModel('classify')` |

### Prompt types

| Type | Triggered by keywords in finding |
|------|----------------------------------|
| `code_pattern_check` | disclosure, logging, transparency, content-marking |
| `documentation_check` | documentation, literacy, policy, report, conformity |
| `config_check` | config, metadata, environment, deployment |
| `architecture_check` | monitoring, oversight, audit, kill-switch |
| `data_handling_check` | data, privacy, retention, biometric, consent |

### Output per finding

LLM returns JSON: `{ verdict: pass|fail|uncertain, confidence: 0-100, reasoning, evidence[] }`. If parsing fails, original verdict is preserved.

### Deep scan result

When L5 completes, the ScanResult includes:
- `deepAnalysis: true` — indicates L5 was used
- `l5Cost: number` — LLM token cost in USD
- Enhanced confidence values on affected findings

---

## Evidence Collection

**New in v1.0** — Each finding gets an evidence trail for audit compliance.

### Evidence structure

```typescript
interface Evidence {
  readonly findingId: string;
  readonly layer: string;         // L1, L2, L3, L4, L5, cross-layer
  readonly timestamp: string;     // ISO 8601
  readonly source: EvidenceSource;
  readonly snippet?: string;      // relevant code/text excerpt
  readonly file?: string;         // source file path
  readonly line?: number;         // line number in source
}
```

### Evidence sources

| Source | Layer | What it captures |
|--------|-------|-----------------|
| `file-presence` | L1 | File path that triggered the check |
| `heading-match` | L2 | Matched heading text in document |
| `content-analysis` | L2 | Section depth analysis result |
| `dependency` | L3 | Package name and version from manifest |
| `pattern-match` | L4 | Matched regex pattern with file:line |
| `llm-analysis` | L5 | LLM reasoning and confidence |
| `cross-layer` | XL | Combined signals from multiple layers |

Evidence is collected by `createEvidenceCollector()` during scanning and attached to findings. SARIF output includes evidence in `codeFlows`.

---

## Drift Detection

**New in v1.0** — Compares current scan to previous scan and classifies compliance drift.

### Drift severity classification

| Severity | Condition |
|----------|-----------|
| `critical` | New failure in Art. 5 prohibited practice OR critical severity finding |
| `major` | Score dropped >10 points OR new high-severity finding |
| `minor` | Score dropped 1-10 points |
| `none` | Score stable or improved |

### Drift result

```typescript
interface DriftResult {
  readonly hasDrift: boolean;
  readonly newFailures: readonly Finding[];
  readonly resolvedFailures: readonly Finding[];
  readonly scoreChange: number;              // positive = improved
  readonly affectedArticles: readonly string[];
  readonly severity: 'none' | 'minor' | 'major' | 'critical';
}
```

Drift is computed after each scan in the scan service. If drift is detected, a `scan.drift` event is emitted to the event bus (TUI subscribes for toast notifications).

---

## Regulation Versioning

**New in v1.0** — Each scan result is stamped with the regulation and rules version used.

```typescript
interface RegulationVersion {
  readonly regulation: string;       // "eu-ai-act"
  readonly version: string;          // "2024.1689"
  readonly rulesVersion: string;     // "1.0.0"
  readonly checkCount: number;       // total checks performed
  readonly lastUpdated: string;      // ISO date of rules update
}
```

This enables:
- Audit trail: which rules version was used for compliance assessment
- Version pinning: compare scans across rules updates
- Regulatory alignment: `2024.1689` maps to EU Regulation (EU) 2024/1689

---

## SBOM Generation (CycloneDX 1.5)

**New in v1.0** — Software Bill of Materials generation from dependency data.

**Endpoint:** `GET /sbom?path=<projectPath>`

Generates a CycloneDX 1.5 JSON document (no external dependencies — pure JSON structure conforming to spec).

### SBOM structure

```typescript
interface CycloneDxBom {
  readonly bomFormat: 'CycloneDX';
  readonly specVersion: '1.5';
  readonly serialNumber: string;       // urn:uuid:...
  readonly version: number;
  readonly metadata: {
    readonly timestamp: string;
    readonly tools: readonly { name: string; version: string }[];
  };
  readonly components: readonly CycloneDxComponent[];
}
```

### Component classification

| Condition | Type | Properties |
|-----------|------|------------|
| AI SDK package (from L3 list) | `framework` | `complior:ai-sdk = true` |
| Banned package (Art. 5) | `library` | `complior:banned = true` |
| Regular dependency | `library` | — |
| All components | — | `complior:ecosystem = npm\|pip\|cargo\|go` |

### PURL generation

Package URLs are generated per ecosystem:

| Ecosystem | PURL type | Example |
|-----------|-----------|---------|
| npm | `pkg:npm/` | `pkg:npm/express@4.18.0` |
| pip | `pkg:pypi/` | `pkg:pypi/requests@2.28.0` |
| cargo | `pkg:cargo/` | `pkg:cargo/tokio@1.28` |
| go | `pkg:golang/` | `pkg:golang/github.com/foo@1.0.0` |

Version prefixes (`^`, `~`, `>=`, `<`) are stripped in PURL and component version.

---

## Confidence Model

Each finding gets a confidence percentage and a 5-tier level.

### Confidence levels

| Level | Range | Meaning |
|-------|-------|---------|
| PASS | >= 95% | Definitely compliant |
| LIKELY_PASS | 70-94% | Probably compliant |
| UNCERTAIN | 40-69% | Can't determine (L5 target zone) |
| LIKELY_FAIL | 5-39% | Probably non-compliant |
| FAIL | < 5% | Definitely non-compliant |

### Per-layer confidence assignment

| Layer | Result | Confidence | Level |
|-------|--------|------------|-------|
| L1 | File found | 95% | PASS |
| L1 | File missing | 98% | FAIL |
| L2 | VALID (all sections, substantive) | 95% | PASS |
| L2 | PARTIAL (some sections) | 75% | LIKELY_PASS |
| L2 | SHALLOW (all headings, no depth) | 65% | UNCERTAIN |
| L2 | EMPTY (missing/no headings) | 95% | FAIL |
| L3 | OK | 80% | LIKELY_PASS |
| L3 | WARNING | 80% | LIKELY_FAIL |
| L3 | PROHIBITED | 99% | FAIL |
| L4 | Negative pattern found | 80% | LIKELY_FAIL |
| L4 | Positive pattern found | 75% | LIKELY_PASS |
| L4 | Positive pattern missing | 80% | LIKELY_FAIL |
| L4 | Negative pattern absent | 70% | LIKELY_PASS |
| L5 | LLM verdict | 0-100% | varies |

### Layer weights (for aggregation)

```
Layer 1 (File Presence):       1.00  — most deterministic
Layer 2 (Document Structure):  0.95  — nearly deterministic
Layer 5 (LLM Analysis):       0.90  — high (when active)
Layer 3 (Config/Dependencies): 0.85  — medium-high
Layer 4 (Pattern Matching):    0.70  — heuristic (lowest weight)
```

### Score impact multipliers

| Confidence Level | Multiplier |
|-----------------|------------|
| PASS | 1.0 |
| LIKELY_PASS | 0.75 |
| UNCERTAIN | 0.5 |
| LIKELY_FAIL | 0.25 |
| FAIL | 0.0 |

---

## Scoring Algorithm

### Zone thresholds

| Zone | Score | Meaning |
|------|-------|---------|
| Green | >= 80 | Compliant |
| Yellow | 50-79 | Partial compliance |
| Red | < 50 | Non-compliant |

### Calculation

1. **Group findings by obligation/category** using regulation data
2. **Per-category score:** `(passed / (passed + failed)) * 100`
3. **Weighted total:** `sum(categoryScore * categoryWeight) / sum(categoryWeights)`
4. **Critical cap:** If any critical obligation (from `ScoringData.critical_obligation_ids`) fails → score capped at 40

### Check-to-category fallback mapping

When `obligationId` mapping is unavailable:

| Check ID | Category |
|----------|----------|
| ai-disclosure | transparency |
| content-marking | transparency |
| interaction-logging | technical_safeguards |
| ai-literacy | organizational |
| gpai-transparency | documentation |
| compliance-metadata | documentation |
| documentation | documentation |

### Score output

```typescript
{
  totalScore: number,          // 0-100
  zone: 'red' | 'yellow' | 'green',
  totalChecks: number,
  passedChecks: number,
  failedChecks: number,
  skippedChecks: number,
  categoryScores: {
    category: string,
    weight: number,
    score: number,
    obligationCount: number,
    passedCount: number
  }[]
}
```

---

## HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/scan` | Standard scan (L1-L4 + cross-layer) |
| `POST` | `/scan/deep` | Deep scan (L1-L5 + cross-layer, requires LLM) |
| `GET` | `/sbom?path=` | Generate CycloneDX 1.5 SBOM |

Request body for `/scan` and `/scan/deep`:
```json
{ "path": "/absolute/path/to/project" }
```

---

## EU AI Act Article Coverage

| Article | What it requires | Scanner checks |
|---------|-----------------|----------------|
| Art. 4 | AI literacy for staff | L1 ai-literacy, L2 ai-literacy |
| Art. 5 | Prohibited AI practices (8 categories) | L2 art5-screening, L3 banned packages (51), L3 prohibited patterns (10), cross-layer |
| Art. 10 | Data quality and bias testing | L3 bias testing, L4 data-governance (3 rules) |
| Art. 11 | Technical documentation | L2 tech-documentation |
| Art. 12 | Record-keeping and logging | L1 interaction-logging, L3 log-retention, L3 env-config, L4 logging, L4 record-keeping (2 rules), cross-layer logging-no-retention |
| Art. 14 | Human oversight | L4 human-oversight, L4 kill-switch, cross-layer kill-switch-no-test |
| Art. 15 | Accuracy, robustness, cybersecurity | L4 accuracy-robustness (2 rules), L4 cybersecurity (2 rules), L4 security-risk (4 rules) |
| Art. 26 | Deployer obligations / monitoring | L2 monitoring-policy, L3 env monitoring, L4 deployer-monitoring (2 rules), cross-layer doc-code-mismatch |
| Art. 26(7) | Worker notification | L2 worker-notification |
| Art. 27 | Fundamental rights impact assessment | L2 fria |
| Art. 43 | Conformity assessment | L4 conformity-assessment (1 rule) |
| Art. 47 | Declaration of conformity | L2 declaration-conformity |
| Art. 50(1) | AI interaction disclosure | L1 ai-disclosure, L4 disclosure, L4 bare-llm, cross-layer sdk-no-disclosure |
| Art. 50(2) | AI content marking | L1 content-marking, L4 content-marking |
| Art. 51-53 | GPAI transparency | L1 gpai-transparency, L4 gpai-transparency (2 rules) |
| Art. 73 | Incident reporting | L2 incident-report |

---

## Limits & Constants

| Constant | Value |
|----------|-------|
| Max files per scan | 500 |
| Max file size | 1 MB |
| Excluded directories | node_modules, .git, dist, build, .next, coverage, __pycache__, .cache, .output |
| Scan time (typical) | <500ms (L1-L4) |
| Log retention requirement | >= 180 days |
| Critical score cap | 40 (if any critical obligation fails) |
| L5 max findings | 20 (when enabled) |
| L5 uncertainty range | 40-70% confidence |
| Banned packages | 51 |
| Prohibited patterns | 10 regex |
| AI SDK packages tracked | 26 |
| Pattern rules | 31 (14 categories) |
| Cross-layer rules | 5 |
| Evidence source types | 7 |
| Scanner rules version | 1.0.0 |
| Regulation reference | EU 2024/1689 |

---

## Planned Improvements (v8)

Based on AI Registry v4 addendum review (2026-02-27). Scanner rated 7.5/10 — production-quality MVP.

| # | Issue | Severity | Sprint | Description |
|---|-------|----------|--------|-------------|
| 1 | Banned packages without context | HIGH | S05 | Split into Category B (real packages, context-dependent → HIGH not CRITICAL) and Category C (preventive guards). Add domain context: emotion recognition in HR = CRITICAL, in medical = exception. |
| 2 | Bare LLM call false positives | MEDIUM | S04/S05 | Phase 1: exclude test files from L4 bare-llm checks. Phase 2: suppress if disclosure exists elsewhere (cross-layer). Phase 3: detect wrapper functions. |
| 3 | Scoring doesn't account for severity | HIGH | S04 | Severity-weighted scoring: CRITICAL -25, HIGH -8, MEDIUM -4, LOW -1 (penalty-based). Current ratio-based approach doesn't distinguish 1 CRITICAL fail from 1 LOW fail. |
| 4 | No Passport awareness | HIGH | S04 | New checks: L1 `passport-presence` (agent-manifest.json exists), L2 `passport-completeness` (validate required fields per risk_class), cross-layer `passport-code-mismatch` (declared vs actual permissions). |
| 5 | No industry/domain context | MEDIUM | S05 | Domain detection heuristic in L3: packages + code patterns → employment/finance/healthcare/education → adjusts severity, required checks, banned package context. |
| 6 | 500 files limit without prioritization | LOW | S05 | Two-pass prioritized scan: Pass 1 fast discovery (HOT/WARM/COLD classification), Pass 2 deep scan prioritizing AI-relevant files. |
| 7 | L5 weight > L3 weight | LOW | S04 | Fix layer weights: L1=1.00, L2=0.95, L3=0.90, L4=0.75, L5=0.70. Deterministic layers always weigh more than probabilistic. |

### Connection to AI Registry v4

- **Domain detection (#5)** → auto-determines `aiActRole` and risk context, feeds into Registry risk classification
- **Passport awareness (#4)** → validates passport completeness, data feeds Deployer Readiness metric
- **Severity-weighted scoring (#3)** → CLI score and SaaS Registry score use consistent formula
- **Context-aware banned packages (#1)** → industry context matches Registry `aiActRole` classification

---

## Test Coverage

439 tests across 43 test files, all passing.

### Scanner-specific tests

| Test file | Tests | Covers |
|-----------|-------|--------|
| scanner.test.ts | 7 | End-to-end scanning |
| layer2-docs.test.ts | 23 | YAML validators, section matching, SHALLOW detection, depth measurement |
| layer3-config.test.ts | 7 | Dependency parsing, banned packages |
| layer4-patterns.test.ts | 18 | Regex pattern rules (14 categories) |
| layer5-llm.test.ts | 11 | LLM prompt building, response parsing |
| ai-disclosure.test.ts | 7 | Disclosure pattern detection |
| interaction-logging.test.ts | 6 | Logging detection |
| documentation.test.ts | 7 | Documentation checks |
| confidence.test.ts | 24 | Confidence calculation, aggregation |
| score-calculator.test.ts | 16 | Scoring algorithm |
| external-scanner.test.ts | 24 | External URL scanning |
| banned-packages.test.ts | 26 | All 8 Art. 5 categories, 51 packages, prohibited patterns |
| cross-layer.test.ts | 21 | 5 cross-layer rules, edge cases |
| evidence.test.ts | 10 | Evidence collection, filtering |
| drift.test.ts | 13 | Drift detection, severity classification |
| regulation-version.test.ts | 7 | Version stamping, regulation info |
| sbom.test.ts | 15 | CycloneDX generation, PURL, classification |
