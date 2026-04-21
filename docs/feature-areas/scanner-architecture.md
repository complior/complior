# Feature Area: Scanner Architecture (FA-01)

> **Source:** `docs/SCANNER.md` (v1.0.0) -- fully absorbed into this document
> **Version:** 2.0.0
> **Date:** 2026-04-21
> **Purpose:** Deterministic 5-layer compliance analysis engine -- 500+ tests
> **Milestones:** V1-M08 Context-Aware Scan, V1-M18 Domain Filter (SS7)

---

## 1. Purpose

Scanner analyzes **source code** against EU AI Act (Regulation 2024/1689). Produces findings with confidence scoring, obligation mapping, evidence collection, and fix suggestions.

```
scan    = analyzes CODE        (static, offline, development)
eval    = tests SYSTEM         (dynamic, live endpoint, pre-deploy)
runtime = protects PRODUCTION  (continuous, every request, 24/7)
```

**Design principle:** LLM never makes compliance determinations. Layers 1-4 are fully deterministic (AST + rules). Layer 5 (LLM) is opt-in and only clarifies uncertain findings (50-80% confidence).

EU AI Act requirements:
- Art. 11 --> scan (technical documentation = code review)
- Art. 9(7) --> eval (testing against metrics and thresholds)
- Art. 72 --> runtime (post-market monitoring)

**Rules version:** `1.0.0` -- EU AI Act Regulation 2024/1689
**Scan tiers:** 3 (Offline --> Deep --> Cloud Enrichment)
**Updated:** 2026-04-21
**Tests:** ~500+ scanner-specific tests (out of 1691+ total)

---

## 2. Commands

### 2.1 Composable flags

```bash
complior scan                    # L1-L4 deterministic (default)
complior scan --deep             # + Semgrep/Bandit/ModelScan
complior scan --llm              # + L5 LLM analysis
complior scan --deep --llm       # Full offline (85-90%)
complior scan --cloud            # + server-side enrichment (90-95%)
complior scan --full             # All combined (95%+)

# CI/utility:
complior scan --ci --json --threshold 70   # CI gate
complior scan --diff <branch>              # Compliance diff
complior scan --agent <name>               # Per-agent scan
complior sbom --format cyclonedx           # SBOM generation
```

| Flag | Coverage | Cost |
|------|----------|------|
| (default) | 60-70% | Free |
| `--llm` | 70-80% | BYOK |
| `--deep` | 80-85% | Free |
| `--deep --llm` | 85-90% | BYOK |
| `--cloud` | 90-95% | Free-->Paid |
| `--full` | 95%+ | Free-->Paid |

### 2.2 Full CLI Commands

| Command | Mode | Tier | Description |
|---------|------|------|-------------|
| `complior scan` | Standard | 1 | Default offline scan (L1-L4) |
| `complior scan --deep` | Deep | 2 | +Semgrep/Bandit/ModelScan (uv auto-download) |
| `complior scan --llm` | LLM | 1+ | +L5 LLM analysis (BYOK or Hosted) |
| `complior scan --deep --llm` | Deep+LLM | 2+ | Maximum local scan (tools + LLM) |
| `complior scan --cloud` | Cloud | 3 | +Cloud enrichment (scan.complior.dev) |
| `complior scan --diff <branch>` | Diff | 1 | Branch comparison |
| `complior scan --ci` | Standard | 1 | CI mode (JSON output, exit code) |
| `complior scan-url <url>` | External | 1 | Headless browser scan |
| `complior sbom` | SBOM | 1 | CycloneDX generation |
| `complior daemon --watch` | Watcher | 1 | Continuous compliance gate |

---

## 3. Pipeline

```
complior scan
|-- FileCollector (500 files max, 1MB each)
|-- L1: File Presence (w=1.00)
|-- L2: Document Structure (w=0.95)
|-- L3: Dependencies & Config (w=0.90)
|-- L3-ext: Lockfile Deep Scan
|-- Import Graph (E-109): BFS AI-relevance propagation, 45 packages
|-- Multi-Language (E-111): Go/Rust/Java adapters
|-- L4: Code Patterns (40+) (w=0.75)
|-- L4-ext: Structural Analysis (AST regex approximation)
|-- L5: NHI Secrets Scan (37 patterns)
|-- L5-ext: Git History (21 docs, freshness, bulk detection)
|-- L6: GPAI Systemic Risk (Art.51)
|-- L7: Cross-Layer Verification (6 rules)
|-- L8: enrichFindings() -- code context + fix diff for top-20
|-- L9: applyAttestations() -- user overrides from project.toml
|-- L10: explainFindings() -- article + penalty + deadline
|-- L11: calculateScore() -- weighted 0-100 across 8 categories
+-- ScanResult { score, findings, filterContext, regulationVersion }
```

**Typical scan time:** <500ms (L1-L4), +2-5s with L5 LLM, +5-15s with --deep tools.

---

## 4. Layers

### 4.1 L1: File Presence (w=1.00, confidence 95-98%)

Scans for compliance artifacts: document types, code patterns, compliance configs.

| Check ID | Article | What it detects |
|----------|---------|-----------------|
| `ai-disclosure` | Art. 50(1) | AI disclosure patterns in UI code (.tsx, .jsx, .html) |
| `content-marking` | Art. 50(2) | C2PA, watermarking, AI-generated content labels |
| `interaction-logging` | Art. 12 | Structured logging around AI API calls |
| `ai-literacy` | Art. 4 | AI-LITERACY.md or training policy documents |
| `gpai-transparency` | Art. 51-53 | MODEL_CARD.md or GPAI documentation |
| `compliance-metadata` | -- | `.well-known/ai-compliance.json` or `.complior/` directory |
| `documentation` | -- | COMPLIANCE.md or compliance documentation |
| `passport-presence` | Art. 49 | `.complior/agents/*.json` (when AI SDK detected) |

**Weakness:** Does not check file content quality. An empty file passes L1.

**Per-agent vs project-level document checks:**

| Scope | Check IDs | Reason |
|-------|-----------|--------|
| **Per-agent** | fria, risk-management, technical-documentation, declaration-of-conformity, art5-screening, instructions-for-use, data-governance | EU AI Act requires these per AI system |
| **Project-level** | qms, incident-report, worker-notification, monitoring-policy, ai-literacy | Organizational obligations |

When a per-agent document is missing and multiple agents exist, each agent receives its own finding (with `agentId` set to the agent's name).

**Passport update semantics:** `updatePassportsAfterScan()` filters findings by `agentId === passport.name` before computing `scan_summary` and doc-status fields. Project-level findings (no `agentId`) do NOT appear in individual agent passports. Each passport carries dual scores: `complior_score` (per-agent: passed/total*100) and `project_score` (project-level, same for all passports).

### 4.2 L2: Document Structure (w=0.95, confidence 65-95%)

Validates document content: presence alone not enough, must have real structure. 13 validators with section depth analysis.

**Validators (13 total):**

| Validator | Document | Article | Required Sections |
|-----------|----------|---------|-------------------|
| `ai-literacy` | AI-LITERACY.md | Art. 4 | Training Program, Training Levels, Assessment Methods |
| `tech-documentation` | TECH-DOCUMENTATION.md | Art. 11 | System Description, Architecture, Data Sources |
| `fria` | FRIA.md | Art. 27 | Risk Assessment, Impact Analysis, Mitigation Measures |
| `declaration-conformity` | DECLARATION-OF-CONFORMITY.md | Art. 47 | Conformity Statement, Standards, Evidence |
| `monitoring-policy` | MONITORING-POLICY.md | Art. 26 | Monitoring Scope, Frequency, Escalation |
| `incident-report` | INCIDENT-REPORT.md | Art. 73 | Description, Root Cause, Corrective Actions |
| `art5-screening` | ART5-SCREENING.md | Art. 5 | Prohibited Practices, Screening Results |
| `worker-notification` | WORKER-NOTIFICATION.md | Art. 26(7) | Notification Scope, Affected Workers, Timeline |
| + 5 more | compliance docs | various | varies |

**Section Depth Analysis:**

```typescript
interface SectionDepth {
  wordCount: number;
  sentenceCount: number;
  hasLists: boolean;       // markdown lists (-, *, 1.)
  hasTables: boolean;      // markdown tables (|)
  hasSpecifics: boolean;   // dates, %, proper nouns, numbers
  isShallow: boolean;      // wordCount < 50 AND no lists/tables/specifics
}
```

**Document Quality Classification:**

| Level | Value | L2Status | Detection | Score Impact |
|-------|-------|----------|-----------|-------------|
| 0 | `none` | -- | No file found (L1 fail) | L1 fail, no L2 |
| 1 | `scaffold` | EMPTY/SHALLOW/PARTIAL | File exists but placeholders or thin content | L1 pass, L2 fail |
| 2 | `draft` | VALID | Real content, no placeholders | L1 pass, L2 pass |
| 3 | `reviewed` | any | `<!-- complior:reviewed TIMESTAMP -->` marker present | L1 pass, L2 pass + verified |

Placeholder detection reuses `PLACEHOLDER_BRACKET_REGEX` from `layer2-parsing.ts` -- matches `[Name]`, `[TODO: ...]`, `[Company Name]` etc. (excludes markdown links and checkboxes). Documents with >50% shallow sections get `SHALLOW` status and `scaffold` quality.

**AI review marker:** When `complior fix --ai` enriches a document, it appends `<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->`. The next scan detects this marker and classifies the doc as `reviewed`.

Status confidence: **VALID** (95%), **PARTIAL** (75%), **SHALLOW** (65%), **EMPTY** (95%).

### 4.3 L3: Dependencies & Config (w=0.90, confidence 80-99%)

#### 4.3.1 Banned Packages -- 45 packages (severity: critical, confidence: 99%)

All 8 Art. 5 prohibited categories:

| Art. 5 | Category | Count | Examples |
|--------|----------|-------|----------|
| (1)(a) | Subliminal/manipulative | 6 | subliminal-ai, dark-patterns, nudge-ai |
| (1)(b) | Exploitation of vulnerabilities | 1 | vulnerability-exploitation |
| (1)(c) | Social scoring | 7 | social-credit-score, behavior-score |
| (1)(d) | Criminal risk prediction | 5 | predpol, predictive-policing |
| (1)(e) | Untargeted facial scraping | 2 | clearview-ai, face-scraper |
| (1)(f) | Emotion recognition | 7 | deepface, fer, emotion-recognition |
| (1)(g) | Biometric categorization | 13 | face-api.js, insightface, arcface |
| (1)(h) | Real-time biometric ID | 5 | real-time-facial, surveillance-ai |

#### 4.3.2 Prohibited Patterns -- 10 regex fallbacks

| Pattern | Violation | Article |
|---------|-----------|---------|
| `emotion.*recogni(tion\|ze).*real.?time` | RT emotion recognition | Art. 5(1)(f) |
| `social.*scor(e\|ing)` | Social scoring | Art. 5(1)(c) |
| `subliminal.*messag` | Subliminal messaging | Art. 5(1)(a) |
| `biometric.*categori[sz]` | Biometric categorization | Art. 5(1)(g) |
| `facial.*scrap(e\|ing)` | Facial image scraping | Art. 5(1)(e) |
| `predictive.*polic` | Predictive policing | Art. 5(1)(d) |
| `mass.*surveillance` | Mass surveillance | Art. 5(1)(h) |
| + 3 more | | |

#### 4.3.3 AI SDK Detection -- 45 packages across 5 ecosystems

Centralized registry: `domain/scanner/data/ai-packages.ts`

| Ecosystem | Count | Examples |
|-----------|-------|---------|
| npm | 28 | openai, @anthropic-ai/sdk, ai (Vercel), langchain, llamaindex |
| pip | 7 | google-generativeai, cohere, transformers, torch |
| Go | 5 | go-openai, anthropic-sdk-go, google-generative-ai-go |
| Rust | 8 | async-openai, llm, candle, rust-bert |
| Java | 6 | langchain4j, semantic-kernel, spring-ai |

#### 4.3.4 Other L3 Checks

- **Bias Testing** -- fairlearn, aif360, aequitas detection
- **Log Retention** -- docker-compose.yml >= 180 days
- **Environment Variables** -- .env scan (API keys, LOG_LEVEL, monitoring)
- **CI/CD** -- .github/workflows for compliance keywords

#### 4.3.5 Dependency File Parsing

| Ecosystem | Manifest | Lockfile |
|-----------|----------|---------|
| npm | `package.json` | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| Python | `requirements.txt` | `pip freeze` output |
| Rust | `Cargo.toml` | `Cargo.lock` |
| Go | `go.mod` | `go.sum` |
| Java | `pom.xml`, `build.gradle` | -- |

### 4.4 Import Graph (E-109)

**File:** `domain/scanner/import-graph.ts`

BFS-based import graph with AI-relevance propagation. Files importing AI SDK packages (directly or transitively) are marked as `aiRelevant`. This focuses L4 AST analysis and L5 LLM prompts on the most important files.

**Process:**
1. Parse `import/require` statements from all source files
2. Identify entry points (files importing from `AI_PACKAGES`)
3. BFS propagation: mark transitive importers as AI-relevant
4. Output: `importGraph.aiRelevantFiles` set

**Effect:** AI-relevance filtering reduces L4/L5 scope. Only AI-relevant files get structural analysis.

### 4.5 Multi-Language Scanner (E-111)

**File:** `domain/scanner/languages/adapter.ts`

`LanguageAdapter` interface with Go, Rust, Java adapters. Detects AI SDKs and banned packages in non-JS/TS ecosystems.

| Language | Manifest | AI SDKs | Banned Detection |
|----------|----------|---------|-----------------|
| Go | `go.mod` | 5 packages | Pattern-based |
| Rust | `Cargo.toml` | 8 packages | Pattern-based |
| Java | `pom.xml`, `build.gradle` | 6 packages | Pattern-based |

### 4.6 L4: Code Patterns (w=0.75, confidence 70-85%)

Scans source code with **40+ regex rules** across 14 categories. Comment-filtered (E-114b) to eliminate false positives from comments while preserving string literals.

**Scannable files:**
- **Code:** `.ts .tsx .js .jsx .mjs .cjs .py .go .rs .java`
- **Docs:** `.md .rst`
- **Config:** `.json .yaml .yml .toml`
- **Excluded:** node_modules, dist, .git, vendor, build, __pycache__, .next, coverage, test files (`*.test.*`, `*.spec.*`, `__tests__/`)

#### Negative Patterns -- Bare LLM Calls (5 rules)

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `openai.chat.completions.create(` | Direct OpenAI call | Art. 50(1) |
| `anthropic.messages.create(` | Direct Anthropic call | Art. 50(1) |
| `google.generativeai` | Direct Google AI | Art. 50(1) |
| `cohere.chat(` | Direct Cohere call | Art. 50(1) |
| `mistral.chat.complete(` | Direct Mistral call | Art. 50(1) |

#### Negative Patterns -- Security Risk (4 rules)

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `eval(.*user\|req.\|input)` | Code injection | Art. 15(4) |
| `pickle.load(` | Unsafe deserialization | Art. 15(4) |
| `torch.load(` (no map_location) | Unsafe model loading | Art. 15(4) |
| `exec(.*user\|os.system(.*input)` | Command injection | Art. 15(4) |

#### Positive Patterns -- 12 Categories (absence = warning when AI SDK detected)

| Category | Article | Key patterns |
|----------|---------|-------------|
| Disclosure | Art. 50(1) | `AIDisclosure`, `ai-disclosure`, `transparency_notice` |
| Human Oversight | Art. 14 | `humanReview`, `manual_approval`, `human_oversight` |
| Kill Switch | Art. 14 | `AI_ENABLED`, `DISABLE_AI`, `killSwitch`, `emergencyStop` |
| Content Marking | Art. 50(2) | `ai-generated`, `c2pa`, `content_credentials` |
| Logging | Art. 12 | `logAiCall`, `aiLogger`, `compliance.log`, `auditLog` |
| Data Governance | Art. 10 | `data_validation`, `data_quality`, `consent_manag` |
| Record-Keeping | Art. 12 | `audit_trail`, `compliance_record`, `retention_policy` |
| Deployer Monitoring | Art. 26(5) | `model_monitor`, `drift_detect`, `incident_report` |
| GPAI Transparency | Art. 53 | `model_card`, `training_data_summary` |
| Accuracy/Robustness | Art. 15 | `model_validation`, `accuracy_metric`, `adversarial_test` |
| Cybersecurity | Art. 15(4) | `rate_limit`, `input_sanitiz`, `injection_prevent` |
| Conformity Assessment | Art. 43 | `conformity_declar`, `ce_mark` |

#### Comment Filter (E-114b)

**File:** `domain/scanner/rules/comment-filter.ts`

Two modes:
- `stripCommentsAndStrings()` -- for import-graph (removes both)
- `stripCommentsOnly()` -- for L4 patterns (preserves string literals like `className="AIDisclosure"`)

Supports C-style (TS/JS/Go/Rust/Java) and Python.

### 4.7 Structural Analysis (E-110)

**File:** `domain/scanner/ast/swc-analyzer.ts`
**Status:** PARTIAL -- regex-based approximation (no real SWC/tree-sitter)

Regex-based structural analysis of TS/JS: bare LLM calls, wrapped calls, safety config mutations, missing error handling, decorator patterns. Runs only on `importGraph.aiRelevantFiles`.

5 finding types: `l4-ast-bare-call`, `l4-ast-wrapped-call`, `l4-ast-safety-mutation`, `l4-ast-missing-error-handling`, `l4-ast-decorator-pattern`. Confidence 70-85%.

**Planned upgrade:** Real AST parsing via SWC or tree-sitter for semantic call analysis. Would boost accuracy from ~85% to ~95%.

### 4.8 NHI: Secrets Scan (37 patterns)

**File:** `domain/scanner/checks/nhi-scanner.ts`

37 regex patterns for API keys, tokens, and secrets:
- **API keys:** OpenAI (`sk-...`), Anthropic (`sk-ant-...`), Google, AWS, Azure
- **Tokens:** JWT, GitHub, GitLab, Slack, Discord
- **Private keys:** RSA, SSH, PGP
- **Connection strings:** PostgreSQL, MongoDB, Redis, MySQL

Accuracy: ~85%. Does not detect Base64-encoded or env-var referenced secrets.

### 4.9 Git History Analysis (E-112)

**File:** `domain/scanner/checks/git-history.ts`

Analyzes `git log` for 21 compliance document types:
- **Freshness:** 90d/180d staleness thresholds
- **Bulk commits:** Detects compliance-theater (all docs committed at once)
- **Author diversity:** Single-author warnings

Uses `GitHistoryPort` (Clean Architecture) with `git-history-adapter.ts` in infra/.

### 4.10 GPAI Systemic Risk (Art. 51-52)

**File:** `domain/scanner/checks/gpai-systemic-risk.ts`

Art. 51-52 checks for GPAI models with systemic risk:
- Model card completeness for GPAI
- Training data documentation
- Compute resource reporting
- Systemic risk assessment presence

### 4.11 L5: LLM Analysis (opt-in via `complior scan --llm`)

**Weight:** 0.70 | **Endpoint:** `POST /scan/deep`

#### Targeted L5 (E-113)

**File:** `domain/scanner/layers/layer5-targeted.ts`

LLM receives ONLY findings with confidence 50-80%. Structured prompt per obligation. Context from import-graph.

- `selectUncertainFindings()` --> `buildTargetedPrompts()` --> `estimateTargetedCost()`
- Cost: ~$0.01 per scan (vs $0.10 for full L5)
- 8 targeted prompt templates
- Max findings: 20

#### L5 Document Validation (E-114a)

**File:** `domain/scanner/layers/layer5-docs.ts`

LLM validates document CONTENT against regulation checklists:
- FRIA (Art. 27): 8 required elements
- Technical Documentation (Art. 11): 12 elements
- Transparency Notice (Art. 13): elements
- Risk Management (Art. 9): elements
- Total: 4 doc types, 34 validation elements

#### L5 Output

LLM returns JSON: `{ verdict: pass|fail|uncertain, confidence: 0-100, reasoning, evidence[] }`.
ScanResult includes: `deepAnalysis: true`, `l5Cost: number`.

### 4.12 Cross-Layer Verification (6 rules)

**File:** `domain/scanner/cross-layer.ts`

Combines signals from multiple layers:

| Rule ID | Layers | Severity | What it detects |
|---------|--------|----------|-----------------|
| `cross-doc-code-mismatch` | L2+L4 | medium | Policy exists but code doesn't implement |
| `cross-banned-with-wrapper` | L3+L4 | medium | Banned package + wrapper present (still prohibited) |
| `cross-logging-no-retention` | L3+L4 | medium | Logging exists but no retention config |
| `cross-kill-switch-no-test` | L1+L4 | low | Kill switch found but no tests |
| `cross-passport-code-mismatch` | L1+L3+L4 | medium | AI SDK in deps + passport but no disclosure |
| `cross-permission-passport-mismatch` | L1 | high | Undeclared permissions in passport |

---

## 5. Post-Processing

### 5.1 enrichFindings() -- Code Context + Fix Suggestions

For **top-20 findings** (by severity): adds `codeContext` (5 lines around issue) and `fixDiff` (before/after diff for auto-fix).

**Fix Diff types:** `FixDiff.importLine` field provides the import to add when wrapping SDK calls. `buildFixDiff()` finds constructor from call-site (backward search), handles multi-line constructors (paren depth), generates `importLine`.

### 5.2 applyAttestations() -- User Overrides

`project.toml` `attest_*` records --> corresponding findings become pass.

### 5.3 explainFindings() -- Article + Penalty + Deadline

From `finding-explanations.json` (19+ check_ids): article reference, penalty amount, enforcement deadline, business impact.

### 5.4 calculateScore() -- Weighted 0-100

**File:** `domain/scanner/score-calculator.ts`

Groups checks into 8 categories from `data/regulations/eu-ai-act/scoring.json`. Each category has obligations-based weights.

**Categories with weights:**

| Category | Weight | Obligations |
|----------|--------|-------------|
| prohibited_practices | 13 | OBL-002 |
| risk_management | 17 | OBL-003, OBL-009, OBL-010 |
| documentation | 13 | OBL-005, OBL-019, OBL-022 |
| transparency | 17 | OBL-007, OBL-015-018, OBL-024 |
| technical_safeguards | 9 | OBL-006, OBL-008 |
| organizational | 9 | OBL-001, OBL-010, OBL-011, OBL-025 |
| monitoring_and_reporting | 9 | OBL-012, OBL-014, OBL-020-021, OBL-023 |
| deployer_specific | 13 | 15 deployer obligations |

**Algorithm:**
1. For each check, find its category via `obligationId` or fallback `checkId` --> category map
2. Calculate per-category score: passed / (passed + failed) * weight
3. Sum weighted category scores
4. **Critical cap:** If any critical obligation (37 total) scores 0% --> overall capped at 40
5. **Zones:** Green (80-100), Yellow (50-79), Red (0-49)

**Domain-specific categories** (13 domains: HR, Finance, Healthcare, Education, Law Enforcement, Migration, Justice, Infrastructure, Biometric, Content Generation, Customer Service, Marketing, Transport) are scored ONLY when the company operates in that domain, as supplementary scores.

---

## 6. Scanning Modes (16 total)

| # | Mode | Trigger | Status |
|---|------|---------|--------|
| 1 | Standard (L1-L4) | `complior scan` | DONE |
| 2 | Deep (+ tools) | `complior scan --deep` | DONE |
| 2b | LLM | `complior scan --llm` | DONE |
| 3 | Compliance Diff | `complior scan --diff` | DONE |
| 4 | External URL | `complior scan-url <url>` | DONE |
| 5 | SBOM | `complior sbom` | DONE |
| 6 | What-If | `POST /whatif` | DONE |
| 7 | Simulation | `POST /simulate` | DONE |
| 8 | File Watcher | `complior daemon --watch` | DONE |
| 9 | Per-Agent | `--agent <name>` | DONE |
| 10 | Supply Chain | `POST /supply-chain` | DONE |
| 11 | MCP Proxy | proxy bridge | PLANNED |
| 12 | Red Team | `complior redteam run` | DONE |
| 13 | Import Promptfoo | `complior import promptfoo` | DONE |
| 14-16 | Eval modes | `complior eval` | See FA-02 |

### Mode Details

**Mode 1 -- Standard:** Runs all deterministic layers (L1-L4), cross-layer verification, post-processing, scoring. Time: <500ms. Output: `ScanResult`.

**Mode 2 -- Deep:** Extends standard with Semgrep (LGPL-2.1, multi-lang AST), Bandit (Apache 2.0, Python security), ModelScan (Apache 2.0, model backdoor detection). Auto-downloaded via uv to `~/.complior/tools/` (~150MB, one-time). Time: +5-15s. Excludes: node_modules/, dist/, .complior/.

**Mode 2b -- LLM:** Adds L5 targeted analysis + doc validation. Requires BYOK API key. Cost: ~$0.01 per scan. Combinable with --deep.

**Mode 3 -- Compliance Diff:** `complior scan --diff <branch>`. Runs standard scan on both states, computes diff. Output: `ScanDiffResult` -- new findings, resolved findings, score delta, drift severity.

**Mode 4 -- External URL:** `complior scan-url <url>`. Playwright (Chromium headless, lazy-loaded). Checks AI disclosure in HTML, content marking, transparency notices, `.well-known/ai-compliance.json`.

**Mode 5 -- SBOM:** CycloneDX 1.5 JSON. Components classified as `complior:ai-sdk=true` for AI packages, `complior:banned=true` for prohibited. Ecosystems: npm, pip, cargo, go, maven/gradle.

**Mode 6 -- What-If:** `POST /whatif`. Analytical (no scan) -- predicts score impact of hypothetical changes. Output: predicted score, affected findings, effort estimate.

**Mode 7 -- Simulation:** `POST /simulate`. Runs multiple what-if scenarios, compares in matrix. Output: scenario x score x effort --> ROI ranking.

**Mode 8 -- File Watcher:** `complior daemon --watch`. 200ms debounce. Full L1-L4 standard scan on file change. SSE event `scan.completed` --> TUI update.

**Mode 9 -- Per-Agent:** Standard scan filtered by agent passport scope. Output: Filtered `ScanResult` relevant to specific agent.

**Mode 10 -- Supply Chain:** L3 + AI Registry matching (5,011+ tools). Output: `SupplyChainReport` -- dependency risk scores, license compliance, known vulnerabilities.

**Mode 11 -- MCP Proxy (PLANNED):** Runtime behavioral observation of black-box AI agents via MCP protocol interception. Auto-enriches passport: `tools_used`, `data_access`, `autonomy_level` (confidence: 0.55).

**Mode 12 -- Red Team:** 300+ embedded probes from Promptfoo (MIT) + Garak (Apache 2.0). Zero runtime dependency. OWASP LLM Top 10 categories. Output: `RedteamReport` with `securityScore`. Critical cap: any category 0% pass rate --> score capped at 49.

**Mode 13 -- Import Promptfoo:** Imports external Promptfoo JSON output, maps results to OWASP categories, calculates security score. Zod validation (`PromptfooResultSchema`).

---

## 7. 3-Tier Economic Model

| Tier | Name | Coverage | Cost | CLI |
|------|------|----------|------|-----|
| 1 | Offline | 60-70% | Free | `complior scan` |
| 1+ | + LLM | 70-80% | BYOK | `--llm` |
| 2 | Deep | 80-85% | Free | `--deep` |
| 2+ | Deep+LLM | 85-90% | BYOK | `--deep --llm` |
| 3 | Cloud | 90-95% | Free-->Paid | `--cloud` |
| 3+ | Maximum | 95%+ | Free-->Paid | `--full` |

### External Tools Integration (17 modules)

| # | Module | License | Method | Tier |
|---|--------|---------|--------|------|
| 1 | detect-secrets | Apache 2.0 | Rewritten in Rust (37 patterns) | 1 |
| 2 | Promptfoo scoring | MIT | Data extracted | 1 |
| 3 | Promptfoo attacks | MIT | Data extracted (300+ probes) | 1 |
| 4 | Garak attacks | Apache 2.0 | Data extracted | 1 |
| 5 | Semgrep | LGPL-2.1 | uv auto-download, subprocess | 2 |
| 6 | Bandit | Apache 2.0 | uv auto-download, subprocess | 2 |
| 7 | ModelScan | Apache 2.0 | uv auto-download, subprocess | 2 |
| 8 | Instructor | MIT | npm dependency | 1 |
| 9 | CycloneDX JS | Apache 2.0 | npm dependency | 1 |
| 10 | PromptGuard 2 | MIT (Meta) | pip in our Docker | Cloud |
| 11 | LLM Guard | Apache 2.0 | pip in our Docker | Cloud |
| 12 | Presidio | MIT (Microsoft) | pip in our Docker | Cloud |
| 13 | AI SBOM Scanner | Apache 2.0 | Server-side | 3 |
| 14 | WeasyPrint | BSD | Server-side Docker | 3 |
| 15 | Langfuse | MIT | npm optional peer dep | 1 |
| 16 | Evidently | Apache 2.0 | Optional service | Cloud |
| 17 | MLflow | Apache 2.0 | Dev tool (not shipped) | -- |

### Dual Scoring (Tier 2+)

Starting from Tier 2, scans produce two independent scores:

```
+------------------------------+-------------------------------+
|     Compliance Score         |     Security Score            |
|     (0-100, grade A-F)       |     (0-100, grade A-F)        |
+------------------------------+-------------------------------+
| EU AI Act (108 obligations)  | OWASP LLM Top 10              |
| AIUC-1 (15 requirements)    | MITRE ATLAS                   |
+------------------------------+-------------------------------+
| Sources: L1-L4 findings,    | Sources: Red Team probes,     |
| passport, documents          | Promptfoo import, L4 rules,   |
|                              | Semgrep, Bandit, ModelScan,   |
|                              | NHI secrets, CVE data         |
+------------------------------+-------------------------------+
```

---

## 8. Multi-Framework Scoring

| Framework | Coverage | Output | Status |
|-----------|----------|--------|--------|
| EU AI Act | 108 obligations | Compliance 0-100 (A-F) | DONE |
| AIUC-1 | 15 requirements | Levels 1-4 | DONE |
| OWASP LLM Top 10 | 10 categories | Security 0-100 (A-F) | DONE |
| MITRE ATLAS | 6 tactics | Security 0-100 (A-F) | DONE |
| ISO 42001 | 39 controls | Score 0-100 | PLANNED |
| NIST AI RMF | 4 functions | Levels 1-5 | PLANNED |
| ISO 27090 | 6 controls | Score 0-100 | PLANNED |

Configuration: `project.toml` sets `frameworks = ["eu-ai-act", "aiuc-1"]` to choose which frameworks contribute to the composite score.

---

## 9. Confidence Model

### Per-Layer Confidence

| Layer | Result | Confidence |
|-------|--------|------------|
| L1 | File found | 95% |
| L1 | File missing | 98% |
| L2 | VALID | 95% |
| L2 | PARTIAL | 75% |
| L2 | SHALLOW | 65% |
| L2 | EMPTY | 95% |
| L3 | PROHIBITED | 99% |
| L3 | OK/WARNING | 80% |
| L4 | Pattern found | 75-80% |
| L4 | Pattern missing | 80% |
| L5 | LLM verdict | 0-100% |

### Layer Weights

```
L1 (File Presence):       1.00  -- most deterministic
L2 (Document Structure):  0.95  -- nearly deterministic
L3 (Config/Dependencies): 0.90  -- medium-high
L4 (Pattern Matching):    0.75  -- heuristic
L5 (LLM Analysis):        0.70  -- probabilistic (lowest)
```

---

## 10. Evidence Collection

Each finding gets an evidence trail:

```typescript
interface Evidence {
  findingId: string;
  layer: string;         // L1, L2, L3, L4, L5, cross-layer
  timestamp: string;
  source: EvidenceSource;
  snippet?: string;
  file?: string;
  line?: number;
}
```

| Source | Layer | What it captures |
|--------|-------|-----------------|
| `file-presence` | L1 | File path |
| `heading-match` | L2 | Matched heading text |
| `content-analysis` | L2 | Section depth result |
| `dependency` | L3 | Package name + version |
| `pattern-match` | L4 | Matched regex + file:line |
| `llm-analysis` | L5 | LLM reasoning |
| `cross-layer` | XL | Combined signals |
| `redteam` | Security | Adversarial probe result |
| `security-import` | Security | Imported Promptfoo finding |

**Evidence Store** (`domain/scanner/evidence-store.ts`): Disk-persistent hash chain with ed25519 signatures. `EvidenceStore.append()` creates entries with `chainPrev`, SHA-256 hash, ed25519 signature. `verify()` walks chain re-computing hashes + checking signatures. Storage: `.complior/evidence/chain.json`.

---

## 11. Drift Detection

**File:** `domain/scanner/drift.ts`

Compares current scan to previous, classifies compliance drift:

| Severity | Condition |
|----------|-----------|
| `critical` | New Art. 5 failure OR new critical finding |
| `major` | Score dropped >10 OR new high finding |
| `minor` | Score dropped 1-10 |
| `none` | Score stable or improved |

Emits `scan.drift` event on event bus (TUI subscribes for toast notification).

---

## 12. Profile-Based Filtering

### 12.1 Existing: Role + Risk Level (V1-M08)

Scanner findings are post-filtered by project profile:

1. **Role filter** (`domain/scanner/role-filter.ts`): `filterFindingsByRole()` -- findings for inapplicable roles become `type: 'skip'` (visible but not scored).
   - Provider-only checks: qms, gpai-transparency, gpai-systemic-risk, l3-missing-bias-testing, l4-data-governance, l4-content-marking, l4-gpai-transparency, l4-conformity-assessment, content-marking
   - Deployer-only checks: monitoring-policy, worker-notification, incident-report, fria, l4-deployer-monitoring, l4-record-keeping
   - If `projectRole === 'both'`: all findings pass through unchanged

2. **Risk level filter** (`domain/scanner/risk-level-filter.ts`): `filterFindingsByRiskLevel()` -- uses `check-to-obligations.json` --> `obligations.json` `applies_to_risk_level` to determine if obligation applies to project's risk level. If ALL obligations for a check require OTHER risk levels --> skip. Null risk = no filtering.

Post-filter (not pre-filter): scanner checks are cheap local filesystem ops.

### 12.2 V1-M18: Domain Filter (NEW)

Third filtering dimension: industry domain (healthcare, finance, HR, education, etc.).

**Data:** `data/scanner/check-applicability.json` -- sparse override format (mirrors `eval/test-applicability.json`).

Current overrides in `check-applicability.json`: 30+ entries covering role restrictions, risk level restrictions, and domain restrictions. Examples:
- `worker-notification` --> `roles: ["deployer"], domains: ["hr", "employment"]`
- `industry-hr-bias` --> `domains: ["hr", "employment"]`
- `industry-healthcare-clinical` --> `domains: ["healthcare", "medical"]`
- `industry-finance-credit` --> `domains: ["finance"]`
- `industry-education-assessment` --> `domains: ["education"]`

**Logic:** For each finding, if check has domain restriction in applicability map AND project domain doesn't match --> `type: 'skip'`.

**Fallback chain:** `check-applicability.json` overrides (primary) + `check-to-obligations.json` --> `obligations.json` domain field (secondary).

**ScanFilterContext:** Now includes `skippedByDomain: number`.

**Pipeline position:** Step 3 in `applyProfileFilters()`:
```
Step 1: filterFindingsByRole()       --> skippedByRole
Step 2: filterFindingsByRiskLevel()  --> skippedByRiskLevel
Step 3: filterFindingsByDomain()     --> skippedByDomain  (V1-M18)
```

---

## 13. EU AI Act Article Coverage

| Article | Requirement | Scanner Checks |
|---------|------------|----------------|
| Art. 4 | AI literacy | L1 ai-literacy, L2 ai-literacy |
| Art. 5 | Prohibited practices | L3 banned (45), L3 patterns (10), L2 art5-screening |
| Art. 9 | Risk management | L2 fria, L2 risk-management, GPAI systemic risk |
| Art. 10 | Data governance | L3 bias testing, L4 data-governance |
| Art. 11 | Technical documentation | L2 tech-documentation |
| Art. 12 | Record-keeping | L1 logging, L3 log-retention, L4 logging, L4 record-keeping, XL logging-no-retention |
| Art. 13 | Transparency | L2 instructions-for-use, L4 disclosure |
| Art. 14 | Human oversight | L4 human-oversight, L4 kill-switch, XL kill-switch-no-test |
| Art. 15 | Accuracy/robustness/security | L4 accuracy-robustness, L4 cybersecurity, L4 security-risk |
| Art. 26 | Deployer obligations | L2 monitoring-policy, L4 deployer-monitoring, XL doc-code-mismatch |
| Art. 26(7) | Worker notification | L2 worker-notification |
| Art. 27 | FRIA | L2 fria |
| Art. 43 | Conformity assessment | L4 conformity-assessment |
| Art. 47 | Declaration of conformity | L2 declaration-conformity |
| Art. 49 | EU Database registration | L1 passport-presence |
| Art. 50(1) | AI disclosure | L1 ai-disclosure, L4 disclosure, L4 bare-llm (info) |
| Art. 50(2) | Content marking | L1 content-marking, L4 content-marking |
| Art. 51-53 | GPAI transparency | L1 gpai-transparency, L4 gpai-transparency, GPAI systemic risk |
| Art. 73 | Incident reporting | L2 incident-report |

**Coverage summary:** Scanner (static) covers 19 articles via code/document analysis.

---

## 14. Limits & Constants

| Constant | Value |
|----------|-------|
| Max files per scan | 500 |
| Max file size | 1 MB (1,048,576 bytes) |
| Excluded directories | node_modules, .git, dist, build, .next, coverage, __pycache__, .cache, .output, vendor |
| Scan time (typical) | <500ms (L1-L4) |
| Critical score cap | 40 (from scoring.json) |
| L5 max findings | 20 |
| L5 uncertainty range | 50-80% confidence |
| Banned packages | 45 |
| Prohibited patterns | 10 regex |
| AI SDK packages | 45 (5 ecosystems) |
| Pattern rules | 40+ (14 categories) |
| Cross-layer rules | 6 |
| NHI patterns | 37 |
| Git history doc types | 21 |
| GPAI systemic checks | 4 |
| L5 targeted prompts | 8 |
| L5 doc validation elements | 34 |
| Evidence source types | 9 (scan 7 + security 2) |
| Attack probes (embedded) | 300+ (10 OWASP categories) |
| Scanner rules version | 1.0.0 |
| Regulation reference | EU 2024/1689 |
| External tools (Tier 2, uv) | 3 (Semgrep, Bandit, ModelScan) |
| External modules total | 17 |
| uv tools cache | `~/.complior/tools/` (~150MB) |

---

## 15. HTTP Endpoints

| Method | Path | Mode | Description |
|--------|------|------|-------------|
| `POST` | `/scan` | Standard | L1-L4 + cross-layer scan |
| `POST` | `/scan/deep` | Deep | +L5 targeted + doc validation |
| `POST` | `/scan/diff` | Diff | Compliance diff (before/after) |
| `POST` | `/scan-url` | External | Playwright headless browser scan |
| `GET` | `/sbom` | SBOM | CycloneDX 1.5 generation |
| `POST` | `/whatif` | What-If | Analytical scenario projection |
| `POST` | `/simulate` | Simulation | Multi-scenario comparison |
| `POST` | `/supply-chain` | Supply Chain | L3 + registry analysis |
| `GET` | `/status` | Watcher | Daemon scan status + last result |
| `GET` | `/status/posture` | Posture | CompliancePosture with ScanFilterContext |
| `POST` | `/redteam/run` | Red Team | Run adversarial probes |
| `GET` | `/redteam/last` | Red Team | Last redteam report |
| `POST` | `/import/promptfoo` | Import | Promptfoo JSON --> security score |
| `GET` | `/frameworks` | Frameworks | List registered frameworks |
| `GET` | `/frameworks/scores` | Frameworks | All framework scores |
| `GET` | `/frameworks/scores/:id` | Frameworks | Single framework score by ID |

---

## 16. Implementation Status

### Source Files

| File | LOC | Purpose |
|------|-----|---------|
| `domain/scanner/create-scanner.ts` | ~800 | Factory: L1-L7 pipeline orchestrator |
| `domain/scanner/score-calculator.ts` | ~250 | Weighted score calculation (8 categories) |
| `domain/scanner/security-score.ts` | ~150 | OWASP security scoring |
| `domain/scanner/role-filter.ts` | ~52 | Role-based filtering |
| `domain/scanner/risk-level-filter.ts` | ~102 | Risk level filtering |
| `domain/scanner/domain-filter.ts` | -- | **V1-M18: Domain filtering** |
| `domain/scanner/drift.ts` | ~60 | Drift detection |
| `domain/scanner/sbom.ts` | ~100 | CycloneDX SBOM |
| `domain/scanner/evidence-store.ts` | ~120 | Evidence chain (ed25519) |
| `domain/scanner/evidence.ts` | ~100 | Evidence collection per finding |
| `domain/scanner/fix-diff-builder.ts` | ~350 | 5-type inline diff builder |
| `domain/scanner/compliance-diff.ts` | ~80 | Compliance diff |
| `domain/scanner/scan-cache.ts` | ~80 | Per-file SHA cache |
| `domain/scanner/confidence.ts` | ~100 | Per-layer confidence model |
| `domain/scanner/finding-explainer.ts` | ~100 | Article + penalty mapping |
| `domain/scanner/finding-attribution.ts` | ~80 | Finding attribution |
| `domain/scanner/attestations.ts` | ~60 | User overrides |
| `domain/scanner/import-graph.ts` | ~150 | BFS AI-relevance propagation |
| `domain/scanner/category-breakdown.ts` | ~80 | Category breakdown for disclaimers |
| `domain/scanner/score-disclaimer.ts` | ~60 | Score disclaimer generation |
| `domain/scanner/profile-priority.ts` | ~40 | Profile priority resolution |
| `domain/scanner/regulation-version.ts` | ~30 | Regulation version tracking |
| `domain/scanner/debt-calculator.ts` | ~80 | Compliance debt calculation |
| `domain/scanner/source-filter.ts` | ~40 | Source filter utilities |
| `domain/scanner/validators.ts` | ~50 | Validation utilities |
| `domain/scanner/constants.ts` | ~30 | Scanner constants |
| `domain/scanner/checks/` | ~600 | 13 check modules |
| `domain/scanner/layers/` | ~1200 | 7 layer modules |
| `domain/scanner/external/` | ~500 | 7 external tool runners |
| `domain/scanner/rules/` | ~400 | Banned packages, NHI, comments, patterns |
| `domain/scanner/ast/` | ~200 | Structural analysis |
| `domain/scanner/languages/` | ~150 | Multi-language adapter |
| `services/scan-service.ts` | ~414 | Orchestration + caching + filtering |
| `http/routes/scan.route.ts` | ~100 | HTTP endpoints |
| `data/scanner/check-id-categories.json` | -- | CheckId --> category mapping |
| `data/scanner/limits.json` | -- | Max files (500), max size (1MB) |
| `data/scanner/confidence-params.json` | -- | Layer confidence parameters |
| `data/scanner/check-applicability.json` | -- | Sparse applicability matrix (role/risk/domain) |
| `data/regulations/eu-ai-act/scoring.json` | -- | 8 weighted categories, 37 critical obligations |
| `data/check-to-obligations.json` | -- | CheckId --> obligation ID mapping |
| `data/finding-explanations.json` | -- | Static explanations (19+ check IDs) |

### Test Coverage

500+ scanner-specific tests across:
- **Core:** scanner.test.ts, score-calculator.test.ts, security-score.test.ts
- **Checks (13):** ai-disclosure, behavioral-constraints, dep-deep-scan, documentation, git-history, gpai-systemic-risk, industry, interaction-logging, nhi-scanner, passport-completeness, passport-presence (via presence-check-factory), permission-scanner, presence-check-factory
- **Layers (7):** layer2-docs, layer3-config, layer4-patterns (via pattern rules), layer5-docs, layer5-llm, layer5-targeted, lockfile-parsers
- **External (7):** bandit-runner, dedup, detect-secrets-runner, external-scanner, finding-mapper, modelscan-runner, semgrep-runner
- **Rules (3):** banned-packages, comment-filter, nhi-patterns
- **Filters:** role-filter.test.ts, risk-level-filter.test.ts, **domain-filter.test.ts** (V1-M18)
- **Other:** ast/swc-analyzer, languages/adapter, confidence, compliance-diff, cross-layer, drift, evidence, evidence-store, finding-attribution, finding-explainer, fix-diff-builder, import-graph, profile-priority, regulation-version, sbom, scan-cache, score-disclaimer, category-breakdown, debt-calculator
- **Service integration:** scan-service-context.test.ts, context-scan-e2e.test.ts

---

## 17. Cross-Dependencies

| Depends on | How |
|---|---|
| **Passport** | L1 checks passport-presence; L2 checks passport-completeness |
| **Frameworks** | L11 calculateScore uses EU AI Act, OWASP-LLM, MITRE-ATLAS, AIUC-1 |
| **Evidence** | L8 enrichFindings collects evidence chains; evidence-store persists hash chain |
| **Onboarding** | Profile (role, riskLevel, domain) drives 3-step filtering pipeline |
| **Data files** | check-to-obligations.json, obligations.json, check-applicability.json, scoring.json |

| Used by | How |
|---|---|
| **Fix** | Reads ScanResult findings --> generates remediation (FixPlan) |
| **Eval** | Scanner findings for baseline context |
| **Report** | ScanService --> 35% of Readiness Score |
| **Passport** | Scanner --> Passport Mapping updates 5 compliance fields (scan_summary, complior_score, etc.) |
| **Status** | CompliancePosture includes ScanFilterContext |
| **Drift** | File watcher triggers rescan, drift detection compares to previous |

---

## 18. V1-M18: Scanner Domain Filter

**Goal:** Add domain filtering as 3rd filter dimension + externalize role mappings to JSON.

**Design:**
- Post-filter approach (consistent with existing role/risk filters)
- Sparse data file: `data/scanner/check-applicability.json` (already created with 30+ overrides)
- Domain lookup chain: check-applicability.json (primary) --> obligations.json domain (fallback)
- `ScanFilterContext.skippedByDomain` populated in scan results
- Findings for inapplicable domains become `type: 'skip'` with descriptive message

**Type change:** `skippedByDomain: number` added to `ScanFilterContext` in `types/common.types.ts`.

**Tests:** 8 domain-filter unit tests (domain-filter.test.ts):
- Returns findings unchanged when domain is null
- Skips HR-only checks when project domain is healthcare
- Preserves healthcare checks when project domain is healthcare
- Preserves checks with no domain mapping (conservative default)
- Skips finance-only checks for education domain
- Includes descriptive skip message with domain info
- Returns original array reference when no changes needed
- Is deterministic (same input produces same output)
- Returns frozen result when changes are made

**Tasks:** 7 tasks (3 architect, 4 nodejs-dev).

---

## 19. Accuracy Roadmap

```
Before S08 (S07):
  L1: 98%  L2: 65%  L3: 95%  L4: 70%  --> Overall: ~75%

Current (S08/S09 + V1 milestones done):
  L1: 98%  L2: 65%  L3: 95%  L4: 85%  --> Overall: ~82%
  + Import graph --> AI-relevance filtering
  + Structural analysis --> bare call / wrapper detection
  + Comment filtering --> false positive elimination
  + Multi-language --> Go/Rust/Java deps
  + Git history --> compliance-theater detection
  + Targeted L5 --> $0.01 deep scan cost

With Tier 2 external tools:
  L1: 99%  L2: 65%  L3: 97%  L4: 92%  --> Overall: ~87%
  + detect-secrets --> expanded L1 coverage
  + ModelScan --> L3 model vulnerability detection
  + Semgrep + Bandit --> L4 SAST security patterns

With Tier 3 cloud enrichment:
  L1: 99%  L2: 90%  L3: 98%  L4: 95%  --> Overall: ~93%
  + Presidio --> PII-in-code detection
  + LLM L5 --> semantic document validation
  + Vendor assessment --> supply chain coverage

After remaining core work (real AST):
  L1: 99%  L2: 92%  L3: 98%  L4: 97%  --> Overall: ~95%
  + Real AST parsing (SWC/tree-sitter)
  + L5 doc validation enriches L2
```

---

## 20. Planned Enhancements

### Scanner Enhancements

| ID | Feature | Priority | Tier | Article | Description |
|---|---------|----------|------|---------|-------------|
| ENH-01 | Training Data Scan | MEDIUM | 2 | Art. 10 | `--data`, PII/bias in data files |
| ENH-02 | API Endpoint Check | MEDIUM | 2 | Art. 15/50 | `--endpoint`, live API probe |
| ENH-03 | LLM Config Scan | LOW | 1 | Art. 15 | Auto, config file parsing |
| ENH-04 | Live Runtime Analysis | LOW | 3 | Art. 72 | `--live`, SDK observation |
| ENH-05 | Vendor Assessment | MEDIUM | 3 | Art. 25 | `--vendors`, DPA/model card check |
| ENH-06 | Python Code Support | HIGH | 2 | -- | L4 Python AST via Bandit + Semgrep |

### Core Engine Improvements

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| E-110 | Real AST (SWC/tree-sitter) | HIGH | PARTIAL (regex approximation) |
| E-12 | L2 Semantic Validation | MEDIUM | TODO |
| S07-01 | Incremental Scan (file-level cache) | CRITICAL | TODO |
| S08-05 | Advanced Drift Detection | HIGH | TODO |
