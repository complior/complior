# Complior Scanner — Methodology & Pipeline

The Complior scanner is a **deterministic, 5-layer compliance analysis engine** that evaluates software projects against the EU AI Act (Regulation 2024/1689). It produces actionable findings with confidence scoring, obligation mapping, evidence collection, and fix suggestions.

**Design principle:** LLM never makes compliance determinations. Layers 1-4 are fully deterministic (AST + rules). Layer 5 (LLM) is opt-in and only clarifies findings in the UNCERTAIN zone (50-80% confidence). `complior eval` tests the running AI system dynamically (not code).

**Rules version:** `1.0.0` — EU AI Act Regulation 2024/1689
**Scan tiers:** 3 (Offline → Deep → Cloud Enrichment)
**Eval modes:** 4 (Basic → LLM-judged → Security → Full)
**Updated:** 2026-03-18
**Tests:** ~500+ scanner-specific tests (out of 1777 total)
**Eval catalog:** 550 tests (250 conformity + 300 security probes)

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        COMPLIOR SCAN & EVAL PIPELINE                            │
│                                                                                 │
│  16 modes · 5 layers · 3 tiers · 6 frameworks · 550+ tests                    │
└─────────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════
 complior scan — STATIC CODE ANALYSIS (offline, analyzes source code)
═══════════════════════════════════════════════════════════════════════════════════

complior scan                              complior scan --deep
│                                          │ (runs full scan first, then adds)
├─ FileCollector.collectFiles()            │
│  500 files max, 1MB each                 │
│                                          │
├─ 1.  L1: File Presence         w=1.00   │
├─ 2.  L2: Document Structure    w=0.95   │
├─ 3.  L3: Dependencies & Config w=0.90   │
├─ 3b. L3-ext: Lockfile Deep Scan         │
├─ 4.  Import Graph (E-109)      45 pkgs  │
├─ 4b. Multi-Language (E-111)    Go/Rust  │
├─ 5.  L4: Code Patterns (40+)  w=0.75   │
├─ 5a. Structural Analysis (E-110) AST    │
├─ 6.  NHI: Secrets Scan         37 pat.  │
├─ 6b. Git History (E-112)       21 docs  │
├─ 7.  GPAI Systemic Risk        Art.51   │
├─ 8.  Cross-Layer Verification  7 rules  │
├─ 9.  enrichFindings()                    │
├─ 10. applyAttestations()                │
├─ 11. explainFindings()                   │
├─ 12. calculateScore()         0-100     │
│                                          │
└─ ScanResult                              │
   Compliance Score + Security Score       │
   6 frameworks (offline)                  │
                                           │
                              --deep adds (uv auto-download):
                              ├─ Semgrep (LGPL-2.1)
                              │  L4: 20-30 YAML rules, multi-lang AST
                              │  Method: uv auto-download, subprocess
                              ├─ Bandit (Apache 2.0)
                              │  L4: Python security (pickle, eval, exec)
                              │  Method: uv auto-download, subprocess
                              ├─ ModelScan (Apache 2.0)
                              │  L3: model backdoor detection (.pt/.pkl/.safetensors)
                              │  Method: uv auto-download, subprocess
                              └─ ScanResult (deep)
                                 Coverage: 80-85%
                                 First run: ~150MB download, then cached

                              --llm adds (BYOK or Hosted LLM):
                              ├─ Targeted L5 (E-113)
                              │  Findings 50-80% confidence → LLM confirms/rejects
                              ├─ Doc Validation (E-114a)
                              │  LLM checks document quality, not just presence
                              └─ ScanResult (llm-enhanced)

complior scan --cloud                      Flags are combinable:
│ (adds server-side enrichment,            complior scan --deep --llm --cloud
│  scan.complior.dev, month 3-4+)          = maximum coverage (95%+)
│
├─ AI SBOM + CycloneDX (Apache 2.0)
│  Dep inventory + licenses + CVE
│  Against NVD + OSV databases
│  Method: server-side (our Docker)
│
├─ Presidio (MIT)
│  PII-in-Code: 50+ EU entity types
│  Method: server-side (our Docker)
│
├─ Vendor Assessment (our code)
│  AI provider Art. 25 check
│  Method: server-side (our KB)
│
├─ WeasyPrint (BSD)
│  PDF/DOCX audit-ready reports
│  Method: server-side (our Docker)
│
└─ ScanResult (cloud-enriched)
   Coverage: 90-95%

═══════════════════════════════════════════════════════════════════════════════════
 complior eval — DYNAMIC AI SYSTEM TESTING (needs live target endpoint)
═══════════════════════════════════════════════════════════════════════════════════

complior eval --target <url>            complior eval --target <url> --full
│                                       │ (runs all eval modes)
│  scan = analyzes CODE (static)        │
│  eval = tests RUNNING SYSTEM (live)   │
│                                       │
├─ BASIC (deterministic, no LLM)        │
│  118 conformity tests:                │
│  ├─ CT-1: Transparency (Art.50) 15    │
│  ├─ CT-2: Human Oversight (Art.14) 15 │
│  ├─ CT-4: Bias consistency 15         │
│  ├─ CT-5: Accuracy (Art.15(1)) 15     │
│  ├─ CT-6: Robustness (Art.15(3)) 35   │
│  ├─ CT-7: Prohibited (Art.5) 8        │
│  └─ CT-8: Logging (Art.12) 15         │
│  Time: ~1-2 min                       │
│                                       │
├─ + --llm (LLM-as-judge, BYOK)        │
│  +132 semantic tests:                │
│  ├─ CT-1: Transparency (deep) 25     │
│  ├─ CT-2: Escalation behavior 20     │
│  ├─ CT-3: Explanation quality 30     │
│  ├─ CT-4: Bias A/B pairs 30         │
│  ├─ CT-5: Accuracy (nuance) 15      │
│  └─ CT-7: Prohibited (semantic) 12  │
│  Total: 250 conformity tests          │
│  Time: ~3-5 min                       │
│                                       │
├─ + --security (attack probes)         │
│  +300 probes (Promptfoo + Garak):    │
│  injection, jailbreak, exfiltration,  │
│  bias, toxicity, content safety       │
│  Time: +5-10 min                      │
│                                       │
├─ conformityScore (per article)        │
├─ securityScore (per OWASP category)   │
├─ Guard config recommendation          │
│  (shown when Guard Service available, │
│   month 3-4+)                         │
├─ Evidence chain                       │
│                                       │
└─ EvalResult                           └─ EvalResult (full)
   Conformity Score 0-100 (A-F)           Conformity + Security Score
   criticalGaps[]                          550 total tests

  Aliases & Import:
  complior redteam --target <url>       = eval --target <url> --security
  complior import promptfoo <file>      = import external security results
                                          into eval scoring pipeline

  Target formats:
  --target http://localhost:3000/api     generic HTTP POST
  --target openai://api.openai.com       OpenAI-compatible API
  --target anthropic://api.anthropic.com Anthropic-compatible API
  --target ollama://localhost:11434      Ollama local model

═══════════════════════════════════════════════════════════════════════════════════
 complior audit — FULL COMPLIANCE PACKAGE (requires Cloud Services, month 3-4+)
═══════════════════════════════════════════════════════════════════════════════════

complior audit --scan . --target <url>
│
├─ 1. complior scan --deep --llm .           → Compliance Score (code)
├─ 2. complior eval --target <url> --full    → Conformity + Security Score (system)
├─ 3. Collect documents (FRIA, Risk Plan, Tech Docs, Passport...)
├─ 4. Build evidence chain (scan + eval + docs + timestamps + hashes)
├─ 5. Generate Audit Package (PDF/ZIP)
│
└─ AuditResult
   ├─ complianceScore (code)
   ├─ conformityScore (system)
   ├─ securityScore (probes)
   ├─ overallReadiness (weighted)
   ├─ documents[] (present/missing)
   ├─ evidenceChain (tamper-proof)
   └─ auditPackage (PDF/ZIP)

═══════════════════════════════════════════════════════════════════════════════════
 complior monitor — RUNTIME MONITORING (requires Cloud Services, month 3-4+)
═══════════════════════════════════════════════════════════════════════════════════

complior monitor --source <langfuse|sdk-logs|guard-api> --days 30
│
│  scan  = pre-deployment code analysis
│  eval  = pre-deployment system testing
│  monitor = post-deployment observation (production, continuous)
│
├─ Connect to data source:
│  ├─ Langfuse traces (if user has Langfuse, npm optional peer dep)
│  ├─ SDK action-log (if user uses @complior/sdk with logging)
│  └─ Guard Service logs (if Guard Service active)
│
├─ Analyze last N days:
│  ├─ Response distribution (answers getting more/less diverse?)
│  ├─ Error rate trend (growing? stable?)
│  ├─ Latency percentiles (p50, p95, p99 trend)
│  ├─ Guard block rate (more attacks or more false positives?)
│  ├─ Bias drift (bias metrics changing over time?)
│  ├─ Topic drift (system discussing unplanned topics?)
│  └─ Drift detection (Evidently metrics, future)
│
├─ Map anomalies to EU AI Act:
│  ├─ Accuracy drift → Art. 15(1) risk
│  ├─ Bias drift → Art. 10(2)(f) risk
│  ├─ Error spike → Art. 15(3) resilience
│  └─ Block rate spike → Art. 15(4) security
│
└─ MonitoringReport
   ├─ monitoringScore (0-100)
   ├─ anomalies[] (with article mapping)
   ├─ trends (latency, errors, blocks)
   ├─ driftDetected (boolean)
   └─ recommendations[]

  EU AI Act: Art. 72(1) post-market monitoring, Art. 9(2)(b) ongoing risk
  Status: PLANNED (Phase 5)

═══════════════════════════════════════════════════════════════════════════════════
 SPECIALIZED MODES — used alongside scan/eval for specific situations
═══════════════════════════════════════════════════════════════════════════════════

These are NOT separate pipelines. They are utility commands for specific
scenarios during development, CI/CD, and operations.

DEVELOPMENT-TIME (during coding):

  File Watcher — `complior daemon --watch`
  │  When: developer is coding, wants real-time score feedback
  │  What: watches project files, re-scans on every save (200ms debounce)
  │  Input: file system events (create/modify/delete)
  │  Output: SSE → TUI score update, toast notification on drift
  └─ Use case: "I saved bot.ts → score dropped 89→76 → I see why immediately"

  Per-Agent Scan — `complior scan --agent <name>`
  │  When: mono-repo with multiple AI systems, want to scan one
  │  What: standard scan filtered by agent passport scope
  │  Input: project directory + agent name from passport
  │  Output: filtered ScanResult (only findings relevant to that agent)
  └─ Use case: "Scan only HR-Scorer in our mono-repo, ignore CustomerBot"

  What-If Scenario — `complior whatif --add "human oversight" --add "logging"`
  │  When: CTO planning which fixes to prioritize
  │  What: predicts score impact WITHOUT making changes
  │  Input: existing ScanResult + hypothetical changes
  │  Output: predicted score, affected findings, effort estimate
  └─ Use case: "Is 2 days of HITL work worth +15 score? Yes → do it"

  Simulation — `complior simulate`
  │  When: roadmap planning, comparing fix strategies
  │  What: runs multiple what-if scenarios, compares in matrix
  │  Input: existing ScanResult + list of scenarios
  │  Output: scenario × score × effort → ROI ranking
  └─ Use case: "Add FRIA (+12) vs add logging (+8) vs fix deps (+5) — FRIA first"

CI/CD (in pipeline):

  Compliance Diff — `complior scan --diff <branch>`
  │  When: PR review, pre-merge gate
  │  What: compares current scan vs base branch
  │  Input: two project states (current + base)
  │  Output: new findings, resolved findings, score delta, drift severity
  └─ Use case: "PR blocked: score dropped 89→76, 3 new critical findings"

  SBOM Generation — `complior sbom --format cyclonedx`
  │  When: release pipeline, supply chain audit
  │  What: generates CycloneDX 1.5 AI Bill of Materials
  │  Input: dependency files (package.json, requirements.txt, etc.)
  │  Output: CycloneDX JSON with PURL, AI classifications, license data
  └─ Use case: "Export BOM for GRC platform import, Art. 11 tech docs"

  Supply Chain Analysis — `complior supply-chain`
  │  When: dependency audit, vendor review
  │  What: deep dependency analysis with AI Registry (5011+ tools)
  │  Input: L3 scan results + registry matching
  │  Output: risk scores, licenses, known vulnerabilities per dependency
  └─ Use case: "transformers 4.38 has CVE-2025-48312, upgrade to 4.42"

POST-DEPLOYMENT (live systems):

  External URL Scan — `complior scan-url <url>`
  │  When: after deployment, verify live site compliance
  │  What: Playwright browser checks deployed web app
  │  Input: live URL of deployed AI application
  │  Output: disclosure found?, headers present?, .well-known exists?
  └─ Use case: "Is our live chatbot showing AI disclosure? Art. 50(1)"

  MCP Proxy — `complior proxy connect` (PLANNED)
  │  When: observing black-box AI agent behavior
  │  What: MCP protocol interception, records tool calls
  │  Input: MCP agent traffic
  │  Output: auto-enriched passport (tools_used, data_access, autonomy)
  └─ Use case: "Cursor/Windsurf agent → MCP proxy → passport auto-fills"

═══════════════════════════════════════════════════════════════════════════════════
 MULTI-FRAMEWORK SCORING (applies to scan + eval + monitor results)
═══════════════════════════════════════════════════════════════════════════════════

GET /frameworks/scores
│
├─ EU AI Act Adapter    → 108 obligations → Compliance 0-100 (A-F)
├─ AIUC-1 Adapter       → 15 requirements → Levels 1-4
├─ OWASP LLM Top 10    → 10 categories   → Security 0-100 (A-F)
├─ MITRE ATLAS          → 6 tactics       → Security 0-100 (A-F)
│
└─ CLI: triple score output (compliance + conformity + security)
```

**Typical scan time:** <500ms (L1-L4), +2-5s with L5, +10-60s redteam
**Typical eval time:** ~1-2min (basic), ~3-5min (LLM), ~10-15min (full)

---

## Scanning Modes

Complior supports **16 distinct scanning/testing modes** — from standard deterministic scan to dynamic AI system evaluation. Modes 1-10 share the same 5-layer pipeline core. Modes 12-13 are security-specific (red team + import). Modes 14-16 are eval-specific (dynamic testing of running AI systems). All differ in trigger, scope, and output.

### Mode Summary

| # | Mode | Trigger | Layers | Endpoint / CLI | Output | Status |
|---|------|---------|--------|----------------|--------|--------|
| 1 | **Standard** | User / CI | L1-L4 + XL | `POST /scan`, `complior scan` | `ScanResult` | DONE |
| 2 | **Deep (tools)** | User | L1-L4 + Semgrep/Bandit/ModelScan | `complior scan --deep` | `ScanResult` (deep) | PLANNED |
| 3 | **Compliance Diff** | User | L1-L4 × 2 | `POST /scan/diff`, `complior scan --diff <branch>` | `ScanDiffResult` | DONE |
| 4 | **External URL** | User | Playwright headless | `POST /scan-url`, `complior scan-url <url>` | `ExternalScanResult` | DONE |
| 5 | **SBOM** | User | L3 only | `GET /sbom`, `complior sbom` | CycloneDX 1.5 JSON | DONE |
| 6 | **What-If** | User | Analytical (no scan) | `POST /whatif` | `WhatIfResult` | DONE |
| 7 | **Simulation** | User | Analytical (no scan) | `POST /simulate` | `SimulationResult` | DONE |
| 8 | **File Watcher** | File change | L1-L4 (full) | Automatic (daemon) | SSE `scan.completed` | DONE |
| 9 | **Per-Agent** | Agent event | Filter existing | `agent.scan.completed` event | Filtered `ScanResult` | DONE |
| 10 | **Supply Chain** | User | L3 + registry | `POST /supply-chain` | `SupplyChainReport` | DONE |
| 11 | **MCP Proxy** | MCP tool call | Runtime observation | MCP proxy bridge | Passport enrichment | PLANNED |
| 12 | **Red Team** | User | 300+ attack probes | `POST /redteam/run`, `complior redteam run` | `RedteamReport` | DONE |
| 13 | **Import (Promptfoo)** | User | External results | `POST /import/promptfoo`, `complior import promptfoo` | `PromptfooImportResult` | DONE |
| 14 | **Eval (Basic)** | User | 118 conformity tests | `POST /eval`, `complior eval --target <url>` | `EvalResult` | PLANNED |
| 15 | **Eval (LLM-judged)** | User | 250 conformity tests | `complior eval --target <url> --llm` | `EvalResult` + LLM costs | PLANNED |
| 16 | **Eval (Full)** | User | 550 tests (conformity + security) | `complior eval --target <url> --full` | `EvalResult` (complete) | PLANNED |

### Mode 1: Standard Scan

The primary scan mode. Runs all deterministic layers (L1-L4), cross-layer verification, post-processing, and scoring.

```
complior scan [--ci] [--json]
POST /scan { projectPath }
```

- **Layers:** L1 → L2 → L3 → L3-ext → ImportGraph → MultiLang → L4 → AST → NHI → GitHistory → GPAI → CrossLayer → PostProcessing → Score
- **Time:** <500ms
- **Output:** `ScanResult` with findings, score (0-100), grade (A-F), evidence

### Mode 2: Deep Scan (External Tools)

Extends standard scan with open-source SAST tools, auto-downloaded via uv.

```
complior scan --deep
```

- **Tools:** Semgrep (L4 AST), Bandit (L4 Python), ModelScan (L3 models), detect-secrets (L1 secrets)
- **Auto-download:** uv downloads tools to `~/.complior/tools/` (~150MB, one-time)
- **Excludes:** All external tools skip `node_modules/`, `dist/`, `.complior/` (vendor code is not actionable — dependency issues are caught at L3 import level)
- **Time:** +5-15s over standard (tool startup + analysis)
- **Output:** `ScanResult` with `deepTools: true`, additional findings from external tools

### Mode 2b: LLM Scan (opt-in, combinable)

Adds LLM analysis for uncertain findings and document validation. Can combine with --deep.

```
complior scan --llm                    # L1-L4 + L5 LLM (no tools)
complior scan --deep --llm             # L1-L4 + tools + L5 LLM (maximum local)
```

- **Requires:** BYOK API key or Hosted LLM (50 calls/month free, month 3-4+)
- **Layers:** Targeted L5 (E-113) + Doc Validation L5 (E-114a)
- **Time:** +2-5s over standard
- **Cost:** ~$0.01 per scan (targeted prompts only)
- **Output:** `ScanResult` with `llmAnalysis: true`, `l5Cost: number`

### Mode 3: Compliance Diff

Compares two scan states (current vs branch/previous) to show compliance delta.

```
complior scan --diff <branch>
POST /scan/diff { projectPath, baseBranch }
```

- **Process:** Runs standard scan on both states, computes diff
- **Output:** `ScanDiffResult` — new findings, resolved findings, score delta, drift severity (none/minor/major/critical)
- **Use case:** PR gate, pre-merge compliance check

### Mode 4: External URL Scan

Scans a deployed web application for AI disclosure compliance using headless browser.

```
complior scan-url <url>
POST /scan-url { url }
```

- **Engine:** Playwright (Chromium headless, lazy-loaded)
- **Checks:** AI disclosure in HTML, content marking, transparency notices, `.well-known/ai-compliance.json`
- **Output:** `ExternalScanResult` — findings from live page analysis
- **Use case:** Verify deployed app meets Art. 50 transparency requirements

### Mode 5: SBOM Generation

Generates Software Bill of Materials from dependency analysis (L3 only).

```
complior sbom [--json]
GET /sbom
```

- **Standard:** CycloneDX 1.5 JSON with PURL generation
- **Classification:** `complior:ai-sdk=true` for AI packages, `complior:banned=true` for prohibited
- **Ecosystems:** npm, pip, cargo, go, maven/gradle
- **Use case:** Supply chain transparency (Art. 11 technical documentation)

### Mode 6: What-If Scenario

Analytical mode — predicts score impact of hypothetical changes without actual scanning.

```
POST /whatif { projectPath, changes: [...] }
```

- **No scan executed** — uses existing scan results + change projection
- **Output:** `WhatIfResult` — predicted score, affected findings, effort estimate
- **Use case:** Prioritize compliance work ("What if we add FRIA?")

### Mode 7: Compliance Simulation

Runs a full compliance simulation across multiple scenarios.

```
POST /simulate { projectPath, scenarios: [...] }
```

- **No scan executed** — analytical projection from current state
- **Output:** `SimulationResult` — scenario comparison matrix
- **Use case:** Roadmap planning, deadline risk assessment

### Mode 8: File Watcher (Compliance Gate)

Event-driven continuous scanning. Daemon watches project files and re-scans on every change.

```
complior daemon --watch
COMPLIOR_WATCH=1 (env var for TS engine)
```

- **Trigger:** File change (create/modify/delete) with 200ms debounce
- **Scope:** Full L1-L4 standard scan
- **Output:** SSE event `scan.completed` → TUI score update, toast on drift
- **Excludes:** node_modules, .git, dist, build, .complior (via watcher ignore list)
- **Use case:** Real-time compliance feedback during development

### Mode 9: Per-Agent Scan

Filters scan results by agent identity (from Agent Passport).

```
Event: agent.scan.completed
```

- **Trigger:** Agent-specific scan event or passport-filtered standard scan
- **Process:** Standard scan → filter findings by agent's declared tools/permissions/scope
- **Output:** Filtered `ScanResult` relevant to specific agent
- **Use case:** Multi-agent systems — each agent sees only its compliance gaps

### Mode 10: Supply Chain Analysis

Deep dependency analysis combining L3 scanner data with external registry matching.

```
POST /supply-chain { projectPath }
```

- **Layers:** L3 (dependency parsing) + AI Registry matching (5,011+ tools)
- **Output:** `SupplyChainReport` — dependency risk scores, license compliance, known vulnerabilities
- **Use case:** Art. 11 technical documentation, Art. 15 cybersecurity due diligence

### Mode 11: MCP Proxy Scan (PLANNED)

Runtime behavioral observation of black-box AI agents via MCP protocol interception. **Passport Mode 2 (Runtime).**

```
Agent ──MCP──> Complior Proxy ──MCP──> Upstream MCP Server
                    │
               Records every tool call:
               - tool name, args, timing
               - success/error rates
               - data access patterns
```

- **Trigger:** Every MCP tool call passing through proxy
- **No code analysis** — runtime observation only
- **Output:** Auto-enriched passport fields: `tools_used`, `data_access`, `autonomy_level` (inferred)
- **Confidence:** 0.55 (vs Mode 1 Auto 0.85-0.95)
- **Use case:** SaaS customer deploying vendor's AI agent with no source code access
- **Implementation:** See [MCP-UNIFIED-PLAN.md](./MCP-UNIFIED-PLAN.md) for full specification
- **Status:** Proxy infrastructure 60% done (policy engine, interceptor, bridge, routes), passport enrichment TODO

### Mode 12: Red Team (Adversarial Security Testing)

Runs 300+ embedded attack probes against an LLM agent to evaluate security posture across OWASP LLM Top 10 categories.

```
complior redteam run [--agent <name>] [--categories LLM01,LLM02] [--max-probes 50] [--json]
POST /redteam/run { agentName, categories?, maxProbes? }
```

- **Probes:** 300+ embedded from Promptfoo (MIT) + Garak (Apache 2.0), zero runtime dependency
- **Categories:** OWASP LLM Top 10 (LLM01–LLM10): Prompt Injection, Sensitive Info Disclosure, Supply Chain, Data Poisoning, Improper Output Handling, Excessive Agency, System Prompt Leakage, Vector Weaknesses, Misinformation, Unbounded Consumption
- **Evaluation:** Deterministic regex evaluators (LLM is the subject, never the judge)
- **Scoring:** Per-category pass/fail rates → `SecurityScoreResult` (0-100, grade A-F)
- **Critical cap:** Any OWASP category with 0% pass rate → overall score capped at 49
- **Output:** `RedteamReport` — `securityScore`, `owaspMapping` (per-category), `probeResults[]`
- **Evidence:** Recorded in evidence chain with source `'redteam'`
- **Storage:** `.complior/reports/redteam-{agent}-{timestamp}.json`
- **Time:** 10-60s depending on probe count and LLM response time

**Data sources (embedded, static):**

| Source | License | What we extracted | Target file |
|--------|---------|-------------------|-------------|
| Promptfoo `src/redteam/constants/frameworks.ts` | MIT | OWASP LLM Top 10, MITRE ATLAS mappings | `data/security/owasp-llm-top10.ts`, `data/security/mitre-atlas.ts` |
| Promptfoo `src/redteam/constants/metadata.ts` | MIT | Severity map, plugin descriptions | Merged into OWASP/MITRE data files |
| Promptfoo `src/redteam/constants/plugins.ts` | MIT | HARM_PLUGINS, FOUNDATION_PLUGINS | `data/security/attack-probes.ts` |
| Garak probes | Apache 2.0 | LLM vulnerability probe patterns | `data/security/attack-probes.ts` |

### Mode 13: Import Promptfoo Results

Imports external Promptfoo red-team JSON output, maps results to OWASP categories, calculates security score.

```
complior import promptfoo [--file <path>] [--json]
POST /import/promptfoo { <Promptfoo JSON body> }
```

- **Input:** Standard Promptfoo JSON output (red-team results)
- **Validation:** Zod schema (`PromptfooResultSchema`) — rejects invalid format with `VALIDATION_ERROR`
- **Process:** Parse results → map plugin IDs to OWASP categories → `calculateSecurityScore()`
- **Output:** `PromptfooImportResult` — `securityScore`, `probesRun`, `testResults[]`, `timestamp`
- **Evidence:** Recorded in evidence chain with source `'security-import'`
- **Storage:** `.complior/imports/promptfoo-{timestamp}.json`
- **Use case:** Teams already running Promptfoo externally → feed results into Complior for unified scoring

### Mode 14: Eval — Basic Conformity (PLANNED)

Dynamic testing of a running AI system against EU AI Act requirements. **Deterministic probes only** — no LLM needed.

```
complior eval --target <url> [--ci] [--json]
POST /eval { target, mode: "basic" }
```

- **Target:** Live AI system API endpoint (HTTP)
- **Tests:** 118 deterministic conformity tests across 7 EU AI Act articles
- **No LLM required** — all evaluation via regex, HTTP status, header checks
- **Time:** ~1-2 min (118 API calls to target)
- **Output:** `EvalResult` — `conformityScore` (0-100, A-F), `conformityTests[]`, `criticalGaps[]`
- **Evidence:** Recorded in evidence chain with source `'eval-conformity'`
- **Use case:** Quick pre-deploy compliance check, CI/CD gate

**Test categories (118 deterministic):**

| Category | Article | Tests | What it checks |
|----------|---------|-------|---------------|
| Transparency | Art. 50 | 15 | AI disclosure in response, headers, .well-known, self-identification |
| Human Oversight | Art. 14 | 15 | Escalation on complaints, emergencies, out-of-scope, explicit requests |
| Bias (consistency) | Art. 10 | 15 | Same-input consistency, order independence, stereotype refusal |
| Accuracy | Art. 15(1) | 15 | Factual questions, hallucination check, self-contradiction, math |
| Robustness | Art. 15(3) | 35 | Empty/long/special/null input, SQL/HTML injection, timeout, encoding |
| Prohibited | Art. 5 | 8 | Social scoring, manipulation, exploitation refusal (deterministic) |
| Logging | Art. 12 | 15 | Request/response logged, timestamp, PII masked, error logged |

### Mode 15: Eval — LLM-judged Conformity (PLANNED)

Extends Mode 14 with LLM-as-judge for semantic evaluation of AI system responses.

```
complior eval --target <url> --llm [--ci] [--json]
POST /eval { target, mode: "llm" }
```

- **Requires:** BYOK API key (OpenAI/Anthropic/OpenRouter) for LLM judge
- **Tests:** 250 total (118 deterministic + 132 LLM-judged)
- **Time:** ~3-5 min
- **Cost:** ~$0.50-1.00 BYOK (132 LLM judge calls)
- **Output:** `EvalResult` with `llmJudged: true`, `llmCost: number`

**Additional LLM-judged categories (132 tests):**

| Category | Article | Tests | What LLM judges |
|----------|---------|-------|-----------------|
| Transparency (deep) | Art. 50 | 25 | "Would average user understand this is AI?", disclosure under pressure, in roleplay, age-appropriate |
| Human Oversight (behavior) | Art. 14 | 20 | "Does it escalate when unsure?", ambiguous query handling, life-impacting decisions |
| Explanation quality | Art. 13 | 30 | "Does it provide substantive reasoning?", factor ranking, data sources, confidence expression |
| Bias (A/B paired) | Art. 10 | 30 | Paired demographic queries (gender, age, nationality, religion, disability × 6 scenarios) |
| Accuracy (nuance) | Art. 15(1) | 15 | "Does response show appropriate nuance?", uncertainty expression |
| Prohibited (semantic) | Art. 5 | 12 | "Is this subliminal manipulation?", emotional exploitation, dark patterns |

### Mode 16: Eval — Full (Conformity + Security) (PLANNED)

Complete evaluation: all conformity tests + all security probes.

```
complior eval --target <url> --full [--ci] [--json]
complior eval --target <url> --llm --security
POST /eval { target, mode: "full" }
```

- **Tests:** 550 total (250 conformity + 300 security probes)
- **Time:** ~10-15 min
- **Cost:** ~$1-2 BYOK
- **Output:** `EvalResult` — `conformityScore` + `securityScore` + `criticalGaps[]` + `guardConfigSuggestion`
- **Alias:** `complior redteam --target <url>` = `complior eval --target <url> --security` (security probes only)

**Scoring:**

```
Conformity Score (0-100, A-F):
  Per-article: passed tests / total tests × 100
  Critical cap: Art. 50 all-fail → score ≤ 59
  Based on: 250 conformity tests (8 EU AI Act articles)

Security Score (0-100, A-F):
  Per-category: passed probes / total probes × 100
  Critical cap: any OWASP category 0% → score ≤ 49
  Based on: 300 security probes (6 OWASP categories)
```

**Difference from Mode 12 (Red Team):**
- Mode 12 = security probes only → Security Score
- Mode 16 = conformity tests + security probes → Conformity Score + Security Score
- Mode 16 includes EU AI Act behavioral tests (disclosure, escalation, bias, explanation) that Mode 12 does not

---

## Scan vs Eval vs Runtime

Three distinct tools for three distinct lifecycle phases:

| | `complior scan` | `complior eval` | SDK + Guard Service |
|---|----------------|-----------------|---------------------|
| **Type** | Static analysis | Dynamic testing | Continuous protection |
| **Analyzes** | Source code, files, deps | Running AI system | Real user requests |
| **Input** | Project directory | API endpoint URL | Every LLM call |
| **When** | Development, CI/CD | Pre-deploy, release gate | Production, 24/7 |
| **Frequency** | Every commit / file change | Per sprint / before release | Every request |
| **Output** | Compliance Score | Conformity Score + Security Score | Block/Allow + log |
| **EU AI Act** | Art. 11 docs, Art. 15 code | Art. 9(7) testing, Art. 15 robustness | Art. 72 monitoring |
| **Needs LLM** | Optional (L5 deep, BYOK) | Optional (LLM judge, BYOK) | Guard Service (cloud, month 3-4+) |
| **Needs target** | No (reads files) | Yes (live endpoint) | Yes (wraps SDK) |
| **Available** | Month 1 (launch) | Month 1 (launch) | Month 3-4 (cloud launch) |
| **Time** | <500ms - 30s | 1-15 min | 0-130ms per request |

**`complior audit`** = scan + eval + documents + evidence chain = complete compliance package for auditor. Requires cloud services (month 3-4+).

---

## Scan Tiers

All scanning modes operate within a **3-tier architecture** that determines which tools and analyses are available. Tiers are additive — each includes everything from the previous tier.

### Tier Overview

| Tier | Name | Where | Coverage | Cost | Available | CLI Flag |
|------|------|-------|----------|------|-----------|----------|
| **1** | Offline Scan | Local (CLI/TUI) | 60-70% | Free forever | Month 1 (launch) | `complior scan` |
| **1+** | LLM Scan | Local + BYOK LLM | 70-80% | Free (BYOK) | Month 1 (launch) | `complior scan --llm` |
| **2** | Deep Scan | Local + uv tools | 80-85% | Free forever | Month 1 (launch) | `complior scan --deep` |
| **2+** | Deep + LLM | Local + tools + LLM | 85-90% | Free (BYOK) | Month 1 (launch) | `complior scan --deep --llm` |
| **3** | Cloud Enrichment | Local + scan.complior.dev | 90-95% | Free limits → Paid | Month 3-4 (cloud launch) | `complior scan --cloud` |
| **3+** | Maximum | All combined | 95%+ | Free limits → Paid | Month 3-4+ | `complior scan --deep --llm --cloud` |

### Tier 1: Offline Scan (Free, No Dependencies)

Built-in scanner layers (L1-L4), cross-layer verification, scoring, red team, import. Zero external dependencies.

```
Engine (TypeScript, built-in)
├── L1: File Presence          19 doc types
├── L2: Document Structure     13 validators, section depth
├── L3: Dependencies           45 banned, 45 AI SDKs, 5 ecosystems
├── L4: Code Patterns          40+ regex rules, 14 categories
├── Import Graph               BFS AI-relevance propagation
├── Multi-Language             Go/Rust/Java adapters
├── NHI Secrets                37 patterns
├── Git History                21 doc types, freshness, bulk detection
├── GPAI Systemic Risk         Art. 51-52
├── Cross-Layer                7 rules
├── Red Team                   300+ attack probes (embedded Promptfoo+Garak data)
├── Import                     Promptfoo JSON → security score
├── Frameworks                 EU AI Act, AIUC-1, OWASP LLM Top 10, MITRE ATLAS
└── Score: Compliance (0-100) + Security (0-100)
```

**Output:** Compliance Score (0-100) + Security Score (0-100, via redteam/import), grades (A-F), findings with evidence.

### Tier 2: Deep Scan (Free, Auto-Downloaded Tools)

Adds external open-source tools for SAST, secrets, and model security. Tools are auto-downloaded via [uv](https://github.com/astral-sh/uv) to `~/.complior/tools/` (~150MB one-time).

```
Tier 1 (all built-in layers)
  +
├── Semgrep (SAST)             L4 extension — security patterns, custom rules
├── Bandit (Python SAST)       L4 extension — Python-specific security
├── ModelScan (Protect AI)     L3 extension — pickle/safetensors model scan
└── Score: Compliance + Security (dual score, enhanced)
```

**uv auto-download:** User installs nothing. On first `--deep`, Complior:
1. Checks `~/.complior/tools/` for cached tools
2. If missing: `uv tool install semgrep bandit modelscan`
3. uv downloads standalone Python + packages (~150MB, one-time)
4. Subsequent runs use cache (<1s startup)

**Excluded directories:** All external tools skip `node_modules/`, `dist/`, `.complior/` — vendor/build code is not actionable by the user. Dependency-level issues are already caught by L3 (banned packages, dep-scan). Per-tool excludes:

| Tool | Excludes |
|------|----------|
| Semgrep | `.complior`, `node_modules`, `dist` (via `--exclude`) |
| Bandit | `.complior`, `node_modules`, `dist` (via `--exclude`, comma-separated paths) |
| ModelScan | N/A (file extension guard: `.pkl`, `.pt`, `.h5`, etc.) |
| detect-secrets | `.complior/`, `node_modules/`, `dist/`, `.git/` (via `--exclude-files` regex) |

**LLM (--llm flag, combinable with --deep):** Adds L5 targeted analysis + doc validation. Requires BYOK API key or Hosted LLM (month 3-4+). Can run without --deep (L1-L4 + L5) or with --deep (tools + L5).

**Output:** Compliance Score + Security Score (0-100, OWASP LLM Top 10 mapping).

### Tier 3: Cloud Enrichment (Month 3-4+, Paid After Month 7)

Sends offline scan results to `scan.complior.dev` for AI-powered enrichment.

```
Tier 2 (all local tools + optional LLM)
  +
├── AI SBOM + CVE               CycloneDX → OSV/NVD vulnerability lookup
├── Presidio PII-in-Code        50+ EU PII types in source code
├── Vendor Assessment           AI SDK vendor DPA, model card, data residency
└── PDF/DOCX Report Export      Professional compliance report
```

**Output:** Enriched Compliance Score + Security Score + Framework Scores + Vendor Report.

**Launch strategy (aligned with free-vs-paid-v2.md):**
- Month 1: Open-source launch (Tier 1 + Tier 2 only, no cloud)
- Month 3-4: Cloud Services launch (Tier 3, free limits: 5 scans/month)
- Month 7+: Paid tiers (Growth: unlimited, Enterprise: unlimited + self-hosted)

### External Open-Source Modules — Full Integration Map

17 open-source modules integrated into Complior. 5 were evaluated and removed:
DeepTeam (duplicates Garak), python-docx (WeasyPrint covers PDF), Fairlearn
(Evidently covers), NeMo Guardrails (SDK hooks sufficient), Guardrails AI
(Guard Service covers).

| # | Module | License | Integration Method | User Dependency | Complior Component | Where Used | Tier |
|---|--------|---------|-------------------|----------------|-------------------|------------|------|
| | **EMBED — compiled into binary, zero dependency** | | | | | | |
| 1 | **detect-secrets** | Apache 2.0 | Rewritten in Rust (37 patterns) | ZERO | CLI binary (NHI scanner) | scan L1: secrets detection | 1 |
| 2 | **Promptfoo** scoring | MIT | Data extracted → our code | ZERO | Engine (TypeScript) | scan: OWASP/MITRE/NIST scoring | 1 |
| 3 | **Promptfoo** attacks | MIT | Data extracted → our code | ZERO | eval --security: 300+ probes | eval: security testing | 1 |
| 4 | **Garak** attacks | Apache 2.0 | Data extracted → our code | ZERO | eval --security: additional probes | eval: security testing + Guard training | 1 |
| | **WRAP — uv auto-download to ~/.complior/tools/** | | | | | | |
| 5 | **Semgrep** | LGPL-2.1 | uv auto-download, subprocess | ZERO (auto) | Engine L4 extension | scan --deep: 20-30 YAML compliance rules, multi-lang AST | 2 |
| 6 | **Bandit** | Apache 2.0 | uv auto-download, subprocess | ZERO (auto) | Engine L4 extension | scan --deep: Python security (pickle, eval, exec) | 2 |
| 7 | **ModelScan** | Apache 2.0 | uv auto-download, subprocess | ZERO (auto) | Engine L3 extension | scan --deep: model backdoors (.pt/.pkl/.safetensors) | 2 |
| | **WRAP — npm dependencies (automatic)** | | | | | | |
| 8 | **Instructor** | MIT | npm dependency | ZERO (auto) | Engine LLM module | scan --llm: structured LLM output (Zod validation) | 1 |
| 9 | **CycloneDX JS** | Apache 2.0 | npm dependency | ZERO (auto) | Engine L3 (SBOM) | scan: CycloneDX 1.5 JSON generation | 1 |
| | **WRAP — on our server (Guard Service Docker, Hetzner)** | | | | | | |
| 10 | **PromptGuard 2** | MIT (Meta) | pip in our Docker | ZERO | Guard Service | runtime: injection + jailbreak detection (30ms) | Cloud |
| 11 | **LLM Guard** | Apache 2.0 | pip in our Docker | ZERO | Guard Service | runtime: toxicity detection (20ms) | Cloud |
| 12 | **Presidio** | MIT (Microsoft) | pip in our Docker | ZERO | Guard Service + Cloud Scan | runtime: PII detection (10ms) + scan: PII-in-code | Cloud |
| | **WRAP — on our server (Cloud Scan, Hetzner)** | | | | | | |
| 13 | **AI SBOM Scanner** | Apache 2.0 | Server-side | ZERO | Cloud Scan | scan --cloud: dep inventory + CVE lookup (NVD/OSV) | 3 |
| 14 | **WeasyPrint** | BSD | Server-side Docker | ZERO | Cloud Scan + SaaS | scan --cloud: PDF report + SaaS wizard exports | 3 |
| | **CALL — optional services (user installs if wants)** | | | | | | |
| 15 | **Langfuse** | MIT | npm optional peer dep | `npm i langfuse` | SDK | monitor: Art. 12 logging, Art. 14 human review traces | 1 |
| 16 | **Evidently** | Apache 2.0 | Optional service | User runs own | SaaS Monitor | monitor: drift detection, anomaly alerts (Enterprise) | Cloud |
| | **INTERNAL — our development only** | | | | | | |
| 17 | **MLflow** | Apache 2.0 | Dev tool | ZERO (not shipped) | Guard model training | internal: experiment tracking for Guard fine-tuning | — |

### Integration Methods Summary

```
EMBED (zero dependency, part of binary):
  #1 detect-secrets → Rust-native 37 patterns (NHI scanner)
  #2 Promptfoo scoring → framework mapping data (OWASP/MITRE/NIST)
  #3 Promptfoo attacks → 300+ adversarial probes for eval
  #4 Garak attacks → additional probes for eval + Guard training
  User installs: NOTHING. Data baked into binary/engine.

UV AUTO-DOWNLOAD (first run: ~150MB, then cached):
  #5 Semgrep    → ~/.complior/tools/semgrep
  #6 Bandit     → ~/.complior/tools/bandit
  #7 ModelScan  → ~/.complior/tools/modelscan
  User installs: NOTHING. `uv` downloads on first `--deep`.

NPM DEPENDENCIES (automatic with engine install):
  #8 Instructor  → npm dependency in package.json
  #9 CycloneDX   → npm dependency in package.json
  User installs: NOTHING. Comes with `npm install`.

OUR SERVER (Guard Service + Cloud Scan, Hetzner):
  #10 PromptGuard 2  → pip in our Docker
  #11 LLM Guard      → pip in our Docker
  #12 Presidio       → pip in our Docker
  #13 AI SBOM        → server-side
  #14 WeasyPrint     → server-side Docker
  User installs: NOTHING. Our infrastructure.

OPTIONAL (user chooses):
  #15 Langfuse   → user installs `npm i langfuse` if wants tracing
  #16 Evidently  → user runs own Evidently instance (Enterprise)

INTERNAL:
  #17 MLflow     → our dev environment only, not shipped
```

### Module → Scan/Eval Mode Mapping

```
scan (offline):       [1 detect-secrets] [2 Promptfoo scoring]
                      [8 Instructor] [9 CycloneDX]
scan --deep:          + [5 Semgrep] [6 Bandit] [7 ModelScan]
scan --llm:           + [8 Instructor] (structured output)
scan --cloud:         + [12 Presidio PII] [13 AI SBOM] [14 WeasyPrint]

eval --security:      [3 Promptfoo attacks] [4 Garak attacks]
eval --conformity:    our 370 tests (no external dependency)

Guard Service:        [10 PromptGuard 2] [11 LLM Guard] [12 Presidio]
Monitor:              [15 Langfuse] [16 Evidently]
Internal:             [17 MLflow]
```

### Dual Scoring (Tier 2+)

Starting from Tier 2, scans produce two independent scores:

```
┌─────────────────────────────┬──────────────────────────────┐
│     Compliance Score        │     Security Score           │
│     (0-100, grade A-F)      │     (0-100, grade A-F)       │
├─────────────────────────────┼──────────────────────────────┤
│ EU AI Act (108 obligations) │ OWASP LLM Top 10             │
│ ISO 42001 (39 controls)     │ MITRE ATLAS                  │
│ AIUC-1 (15 requirements)    │ ISO 27090                    │
│ NIST AI RMF (4 functions)   │                              │
├─────────────────────────────┼──────────────────────────────┤
│ Sources: L1-L4 findings,    │ Sources: Red Team probes,    │
│ passport, documents         │ Promptfoo import, L4 rules,  │
│                             │ Semgrep, Bandit, ModelScan,  │
│                             │ NHI secrets, CVE data        │
└─────────────────────────────┴──────────────────────────────┘
```

Tier 1 produces Compliance Score + Security Score (via red team / import). Tier 2+ adds external tool results (Semgrep, Bandit, ModelScan) to security score sources.

---

## Layer 1 — File Presence

**Confidence:** 95-98% (deterministic) | **Weight:** 1.00

Scans for the existence of compliance artifacts — files, directories, code patterns.

### Checks

| Check ID | Article | What it detects |
|----------|---------|-----------------|
| `ai-disclosure` | Art. 50(1) | AI disclosure patterns in UI code (.tsx, .jsx, .html) |
| `content-marking` | Art. 50(2) | C2PA, watermarking, AI-generated content labels |
| `interaction-logging` | Art. 12 | Structured logging around AI API calls |
| `ai-literacy` | Art. 4 | AI-LITERACY.md or training policy documents |
| `gpai-transparency` | Art. 51-53 | MODEL_CARD.md or GPAI documentation |
| `compliance-metadata` | — | `.well-known/ai-compliance.json` or `.complior/` directory |
| `documentation` | — | COMPLIANCE.md or compliance documentation |
| `passport-presence` | Art. 49 | `.complior/agents/*.json` (when AI SDK detected) |

**Weakness:** Does not check file content quality. An empty file passes.

### Per-Agent vs Project-Level Document Checks

In multi-agent projects, document presence checks are scoped to the correct level:

| Scope | Check IDs | Reason |
|-------|-----------|--------|
| **Per-agent** | fria, risk-management, technical-documentation, declaration-of-conformity, art5-screening, instructions-for-use, data-governance | EU AI Act requires these per AI system |
| **Project-level** | qms, incident-report, worker-notification, monitoring-policy, ai-literacy | Organizational obligations |

When a per-agent document is missing and multiple agents exist, each agent receives its own finding (with `agentId` set to the agent's name). This provides a clear action plan: create the document for each agent separately.

**Passport update semantics:** `updatePassportsAfterScan()` filters findings by `agentId === passport.name` before computing `scan_summary` and doc-status fields. Project-level findings (no `agentId`) do NOT appear in individual agent passports — they are organizational obligations, not per-system requirements. Each passport carries dual scores: `complior_score` (per-agent: passed/total*100 from agent's findings) and `project_score` (project-level, same for all passports).

---

## Layer 2 — Document Structure

**Confidence:** 65-95% | **Weight:** 0.95

Validates that compliance documents contain mandatory sections with substantive content.

### Validators (13 total)

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
| + 5 more validators for compliance docs | | | |

### Section Depth Analysis

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

Status: **VALID** (95%), **PARTIAL** (75%), **SHALLOW** (65%), **EMPTY** (95%).

### Document Quality Classification

Each L2 check produces a `docQuality` level that tracks the 4-step quality progression:

| Level | Value | L2Status | Detection | Score Impact |
|-------|-------|----------|-----------|-------------|
| 0 | `none` | — | No file found (L1 fail) | L1 fail, no L2 |
| 1 | `scaffold` | EMPTY/SHALLOW/PARTIAL | File exists but has placeholders or thin content | L1 pass, L2 fail |
| 2 | `draft` | VALID | Real content, no placeholders | L1 pass, L2 pass |
| 3 | `reviewed` | any | `<!-- complior:reviewed TIMESTAMP -->` marker present | L1 pass, L2 pass + verified |

**Placeholder detection** reuses `PLACEHOLDER_BRACKET_REGEX` from `layer2-parsing.ts` — matches `[Name]`, `[TODO: ...]`, `[Company Name]` etc. (excludes markdown links and checkboxes). Documents with >50% shallow sections get `SHALLOW` status and `scaffold` quality.

**AI review marker:** When `complior fix --ai` enriches a document, it appends `<!-- complior:reviewed 2026-03-26T10:00:00.000Z -->`. The next scan detects this marker and classifies the doc as `reviewed`. The marker is detected by `AI_REVIEW_MARKER_REGEX` in `layer2-parsing.ts`.

**Score formula:** `complior_score = passed / (passed + failed) * 100`. Scaffold docs fail L2, so they contribute less to the score than drafts. The `doc_quality` field provides explicit tracking beyond the binary pass/fail.

### Passport Completeness Check

`passport-completeness` — validates required fields per `risk_class`. Output: "Passport Completeness: 72%".

---

## Layer 3 — Dependencies & Configuration

**Confidence:** 80-99% | **Weight:** 0.90

### 3.1 Banned Packages — 45 packages (severity: critical, confidence: 99%)

All 8 Art. 5 prohibited categories:

| Art. 5 | Category | Packages | Examples |
|--------|----------|----------|----------|
| (1)(a) | Subliminal/manipulative | 6 | subliminal-ai, dark-patterns, nudge-ai |
| (1)(b) | Exploitation of vulnerabilities | 1 | vulnerability-exploitation |
| (1)(c) | Social scoring | 7 | social-credit-score, behavior-score |
| (1)(d) | Criminal risk prediction | 5 | predpol, predictive-policing |
| (1)(e) | Untargeted facial scraping | 2 | clearview-ai, face-scraper |
| (1)(f) | Emotion recognition | 7 | deepface, fer, emotion-recognition |
| (1)(g) | Biometric categorization | 13 | face-api.js, insightface, arcface |
| (1)(h) | Real-time biometric ID | 5 | real-time-facial, surveillance-ai |

### 3.1b Prohibited Patterns — 10 regex fallbacks

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

### 3.2 AI SDK Detection — 45 packages across 5 ecosystems

**Centralized registry:** `data/ai-packages.ts`

| Ecosystem | Count | Examples |
|-----------|-------|---------|
| npm | 28 | openai, @anthropic-ai/sdk, ai (Vercel), langchain, llamaindex |
| pip | 7 | google-generativeai, cohere, transformers, torch |
| Go | 5 | go-openai, anthropic-sdk-go, google-generative-ai-go |
| Rust | 8 | async-openai, llm, candle, rust-bert |
| Java | 6 | langchain4j, semantic-kernel, spring-ai |

### 3.3-3.6 Other L3 Checks

- **Bias Testing** — fairlearn, aif360, aequitas detection
- **Log Retention** — docker-compose.yml >= 180 days
- **Environment Variables** — .env scan (API keys, LOG_LEVEL, monitoring)
- **CI/CD** — .github/workflows for compliance keywords

### Dependency File Parsing

| Ecosystem | Manifest | Lockfile |
|-----------|----------|---------|
| npm | `package.json` | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml` |
| Python | `requirements.txt` | `pip freeze` output |
| Rust | `Cargo.toml` | `Cargo.lock` |
| Go | `go.mod` | `go.sum` |
| Java | `pom.xml`, `build.gradle` | — |

---

## Import Graph (E-109)

**File:** `domain/scanner/import-graph.ts`

BFS-based import graph with AI-relevance propagation. Files importing AI SDK packages (directly or transitively) are marked as `aiRelevant`. This focuses L4 AST analysis and L5 LLM prompts on the most important files.

**Process:**
1. Parse `import/require` statements from all source files
2. Identify entry points (files importing from `AI_PACKAGES`)
3. BFS propagation: mark transitive importers as AI-relevant
4. Output: `importGraph.aiRelevantFiles` set

**Effect:** AI-relevance filtering reduces L4/L5 scope. Only AI-relevant files get structural analysis.

---

## Multi-Language Scanner (E-111)

**File:** `domain/scanner/languages/adapter.ts`

`LanguageAdapter` interface with Go, Rust, Java adapters. Detects AI SDKs and banned packages in non-JS/TS ecosystems.

| Language | Manifest | AI SDKs | Banned Detection |
|----------|----------|---------|-----------------|
| Go | `go.mod` | 5 packages | Pattern-based |
| Rust | `Cargo.toml` | 8 packages | Pattern-based |
| Java | `pom.xml`, `build.gradle` | 6 packages | Pattern-based |

---

## Layer 4 — Code Patterns

**Confidence:** 70-85% | **Weight:** 0.75

Scans source code with **40+ regex rules** across 14 categories. Comment-filtered (E-114b) to eliminate false positives from comments while preserving string literals.

### Scannable Files

**Extensions (unified):** `CODE_EXTENSIONS` (.ts .tsx .js .jsx .mjs .cjs .py .go .rs .java) + `DOC_EXTENSIONS` (.md .rst) + `CONFIG_EXTENSIONS` (.json .yaml .yml .toml)

**Excluded:** node_modules, dist, .git, vendor, build, __pycache__, .next, coverage, test files (*.test.*, *.spec.*, __tests__/)

### Negative Patterns — Bare LLM Calls (5 rules)

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `openai.chat.completions.create(` | Direct OpenAI call | Art. 50(1) |
| `anthropic.messages.create(` | Direct Anthropic call | Art. 50(1) |
| `google.generativeai` | Direct Google AI | Art. 50(1) |
| `cohere.chat(` | Direct Cohere call | Art. 50(1) |
| `mistral.chat.complete(` | Direct Mistral call | Art. 50(1) |

### Negative Patterns — Security Risk (4 rules)

| Pattern | What it catches | Article |
|---------|----------------|---------|
| `eval(.*user\|req.\|input)` | Code injection | Art. 15(4) |
| `pickle.load(` | Unsafe deserialization | Art. 15(4) |
| `torch.load(` (no map_location) | Unsafe model loading | Art. 15(4) |
| `exec(.*user\|os.system(.*input)` | Command injection | Art. 15(4) |

### Positive Patterns — 12 Categories (absence = warning when AI SDK detected)

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

### Comment Filter (E-114b)

**File:** `domain/scanner/rules/comment-filter.ts`

Two modes:
- `stripCommentsAndStrings()` — for import-graph (removes both)
- `stripCommentsOnly()` — for L4 patterns (preserves string literals like `className="AIDisclosure"`)

Supports C-style (TS/JS/Go/Rust/Java) and Python.

---

## Structural Analysis (E-110)

**File:** `domain/scanner/ast/swc-analyzer.ts`
**Status:** PARTIAL — regex-based approximation (no real SWC/tree-sitter)

Regex-based structural analysis of TS/JS: bare LLM calls, wrapped calls, safety config mutations, missing error handling, decorator patterns. Runs only on `importGraph.aiRelevantFiles`.

5 finding types: `l4-ast-bare-call`, `l4-ast-wrapped-call`, `l4-ast-safety-mutation`, `l4-ast-missing-error-handling`, `l4-ast-decorator-pattern`. Confidence 70-85%.

**Planned upgrade:** Real AST parsing via SWC or tree-sitter for semantic call analysis. Would boost accuracy from ~85% to ~95%.

---

## NHI: Secrets Scan

**File:** `domain/scanner/checks/nhi-scanner.ts`

37 regex patterns for API keys, tokens, and secrets:
- API keys: OpenAI (`sk-...`), Anthropic (`sk-ant-...`), Google, AWS, Azure
- Tokens: JWT, GitHub, GitLab, Slack, Discord
- Private keys: RSA, SSH, PGP
- Connection strings: PostgreSQL, MongoDB, Redis, MySQL

**Accuracy:** ~85%. Does not detect Base64-encoded or env-var referenced secrets.

---

## Git History Analysis (E-112)

**File:** `domain/scanner/checks/git-history.ts`
**Status:** DONE (module + tests), wired into create-scanner.ts

Analyzes `git log` for 21 compliance document types:
- **Freshness:** 90d/180d staleness thresholds
- **Bulk commits:** Detects compliance-theater (all docs committed at once)
- **Author diversity:** Single-author warnings

Uses `GitHistoryPort` (Clean Architecture) with `git-history-adapter.ts` in infra/.

---

## GPAI Systemic Risk Checks

**File:** `domain/scanner/checks/gpai-systemic-risk.ts`

Art. 51-52 checks for GPAI models with systemic risk:
- Model card completeness for GPAI
- Training data documentation
- Compute resource reporting
- Systemic risk assessment presence

---

## Cross-Layer Verification

6 rules combining signals from multiple layers:

| Rule ID | Layers | Severity | What it detects |
|---------|--------|----------|-----------------|
| `cross-doc-code-mismatch` | L2+L4 | medium | Policy exists but code doesn't implement |
| `cross-banned-with-wrapper` | L3+L4 | medium | Banned package + wrapper present |
| `cross-logging-no-retention` | L3+L4 | medium | Logging exists but no retention config |
| `cross-kill-switch-no-test` | L1+L4 | low | Kill switch found but no tests |
| `cross-passport-code-mismatch` | L1+L3+L4 | medium | AI SDK in deps + passport but no disclosure |
| `cross-permission-passport-mismatch` | L1 | high | Undeclared permissions in passport |

---

## Post-Processing

### enrichFindings() — Code Context + Fix Suggestions

For **top-20 findings** (by severity): adds `codeContext` (5 lines around issue) and `fixDiff` (before/after diff for auto-fix).

### applyAttestations() — User Overrides

`project.toml` `attest_*` records → corresponding findings become pass.

### explainFindings() — Article + Penalty + Deadline

From `finding-explanations.json` (19+ check_ids): article reference, penalty amount, enforcement deadline, business impact.

### calculateScore() — Weighted 0-100

**Categories with weights:**
- Prohibited Practices: 20%
- Risk Management: 15%
- Data Governance: 15%
- Human Oversight: 12%
- Transparency: 12%
- Technical Documentation: 10%
- Accuracy & Robustness: 8%
- Cybersecurity: 8%

**Critical cap:** Any critical finding → score capped at 49 (red zone).
**Zones:** Green (80-100), Yellow (50-79), Red (0-49).

---

## Layer 5 — LLM Analysis (opt-in via `complior scan --llm`)

**Weight:** 0.70 | **Endpoint:** `POST /scan/deep`

### Targeted L5 (E-113)

**File:** `domain/scanner/layers/layer5-targeted.ts`

LLM receives ONLY findings with confidence 50-80%. Structured prompt per obligation. Context from import-graph.

- `selectUncertainFindings()` → `buildTargetedPrompts()` → `estimateTargetedCost()`
- Cost: ~$0.01 per scan (vs $0.10 for full L5)
- 8 targeted prompt templates

### L5 Document Validation (E-114a)

**File:** `domain/scanner/layers/layer5-docs.ts`

LLM validates document CONTENT against regulation checklists:
- FRIA (Art. 27): 8 required elements
- Technical Documentation (Art. 11): 12 elements
- Transparency Notice (Art. 13): elements
- Risk Management (Art. 9): elements

Total: 4 doc types, 34 validation elements.

### L5 Output

LLM returns JSON: `{ verdict: pass|fail|uncertain, confidence: 0-100, reasoning, evidence[] }`.
ScanResult includes: `deepAnalysis: true`, `l5Cost: number`.

---

## Evidence Collection

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
| `eval-conformity` | Eval | Conformity test result (deterministic) |
| `eval-llm-judge` | Eval | LLM-judged conformity test result |
| `eval-security` | Eval | Security probe result (within eval) |

---

## Drift Detection

Compares current scan to previous, classifies compliance drift:

| Severity | Condition |
|----------|-----------|
| `critical` | New Art. 5 failure OR new critical finding |
| `major` | Score dropped >10 OR new high finding |
| `minor` | Score dropped 1-10 |
| `none` | Score stable or improved |

Emits `scan.drift` event on event bus (TUI subscribes for toast).

---

## SBOM Generation (CycloneDX 1.5)

**File:** `domain/scanner/sbom.ts` | **Endpoint:** `GET /sbom`

CycloneDX 1.5 JSON with PURL generation. Components classified as:
- `framework` + `complior:ai-sdk=true` for AI packages
- `library` + `complior:banned=true` for prohibited packages
- `complior:ecosystem=npm|pip|cargo|go` for all

---

## Confidence Model

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
L1 (File Presence):       1.00  — most deterministic
L2 (Document Structure):  0.95  — nearly deterministic
L3 (Config/Dependencies): 0.90  — medium-high
L4 (Pattern Matching):    0.75  — heuristic
L5 (LLM Analysis):        0.70  — probabilistic (lowest)
```

---

## Multi-Framework Scoring

Scan findings are framework-agnostic. **Framework Adapters** map the same findings to different compliance and security standards.

```
Scanner (5 layers, deterministic)
    ↓
Findings (check_id, severity, obligation_id)
    ↓
┌── Compliance Frameworks ──────────────────────────────┐
│                                                        │
│  EU AI Act Adapter    → 108 obligations → Score 0-100 │
│  AIUC-1 Adapter       → 15 requirements → Levels 1-4  │
│  ISO 42001 Adapter    → 39 controls     → Score 0-100 │  (PLANNED)
│  NIST AI RMF Adapter  → 4 functions     → Levels 1-5  │  (PLANNED)
│                                                        │
├── Security Frameworks ────────────────────────────────┤
│                                                        │
│  OWASP LLM Top 10     → 10 categories  → Score 0-100 │  DONE (S10)
│  MITRE ATLAS           → 6 tactics     → Score 0-100 │  DONE (S10)
│  ISO 27090             → 6 controls     → Score 0-100 │  (PLANNED)
│                                                        │
└────────────────────────────────────────────────────────┘
    ↓
Multi-Framework Score Result
    ├── complianceScore: 0-100 (weighted across selected frameworks)
    ├── securityScore: 0-100 (weighted across security frameworks)
    ├── frameworks[]: { id, score, grade, gaps }
    └── selectedFrameworkIds[] (from .complior/project.toml)
```

**Configuration:** `project.toml` sets `frameworks = ["eu-ai-act", "aiuc-1"]` to choose which frameworks contribute to the composite score.

---

## Planned Scanner Enhancements (6)

| # | Enhancement | CLI Flag | Tier | Article | Description |
|---|------------|----------|------|---------|-------------|
| 1 | Training Data Scan | `--data` | 2 | Art. 10 | Scan data directories for PII, bias markers, consent records |
| 2 | API Endpoint Check | `--endpoint <url>` | 2 | Art. 15, 50 | Probe live API for disclosure headers, rate limits, error handling |
| 3 | LLM Config Scan | (auto) | 1 | Art. 15 | Detect temperature, max_tokens, safety settings in LLM configs |
| 4 | Live Runtime Analysis | `--live` | 3 | Art. 72 | Observe running AI system via SDK hooks for compliance gaps |
| 5 | Vendor Assessment | `--vendors` | 3 | Art. 25 | Check AI SDK vendors for DPA, model cards, data residency |
| 6 | Python Code Support | (auto) | 2 | — | Extend L4 pattern rules to Python AST (via Bandit + Semgrep) |

### Enhancement 1: Training Data Scan (`--data`)

Scans data directories for compliance with Art. 10 (Data Governance):
- PII detection in training data files (CSV, JSON, Parquet)
- Bias marker analysis (demographic imbalance)
- Consent record presence (data provenance tracking)
- Data quality metrics (duplicates, missing values, outliers)

**Tool:** Presidio (Tier 3 cloud) or built-in regex patterns (Tier 2 local).

### Enhancement 2: API Endpoint Check (`--endpoint`)

Probes a live AI API endpoint:
- `X-AI-Disclosure` or `X-AI-Generated` headers present?
- Rate limiting configured?
- Error responses don't leak model internals?
- Content-Type and CORS properly set?

**Use case:** Verify deployed API meets Art. 50(1) transparency and Art. 15(4) security.

### Enhancement 3: LLM Config Scan

Extends L1/L4 to detect LLM configuration issues:
- Unsafe `temperature > 1.5`
- Missing `max_tokens` limit
- No `safety_settings` or content filter
- Hardcoded API keys in config files

**Already partially covered** by NHI scanner (secrets) and L4 patterns. This enhancement adds structured config file parsing.

### Enhancement 4: Live Runtime Analysis (`--live`)

Observes running AI system behavior via SDK hooks:
- Actual vs declared permissions mismatch
- Budget/rate limit usage patterns
- Anomalous response patterns (hallucination detection)
- Incident-triggering events

**Requires:** `@complior/sdk` integration in target application. Tier 3 (cloud analytics).

### Enhancement 5: Vendor Assessment (`--vendors`)

Checks AI SDK vendors against compliance requirements:
- Data Processing Agreement (DPA) availability
- Model card / transparency documentation
- Data residency (EU vs non-EU)
- Security certifications (SOC 2, ISO 27001)

**Data source:** AI Registry (5,011+ tools) + vendor public documentation.

### Enhancement 6: Python Code Support

Extends L4 AST analysis to Python code:
- Bare LLM calls (`openai.ChatCompletion.create`, `anthropic.messages.create`)
- Missing error handling around AI calls
- Unsafe pickle/torch usage patterns
- Data governance patterns in Python

**Tools:** Bandit (SAST) + Semgrep (custom rules), auto-downloaded via uv (Tier 2).

---

## Accuracy Roadmap

```
Before S08 (S07):
  L1: 98%  L2: 65%  L3: 95%  L4: 70%  → Overall: ~75%

Current (S08/S09 done):
  L1: 98%  L2: 65%  L3: 95%  L4: 85%  → Overall: ~82%
  + Import graph → AI-relevance filtering
  + Structural analysis → bare call / wrapper detection
  + Comment filtering → false positive elimination
  + Multi-language → Go/Rust/Java deps
  + Git history → compliance-theater detection
  + Targeted L5 → $0.01 deep scan cost

With Tier 2 external tools (planned):
  L1: 99%  L2: 65%  L3: 97%  L4: 92%  → Overall: ~87%
  + detect-secrets → expanded L1 coverage
  + ModelScan → L3 model vulnerability detection
  + Semgrep + Bandit → L4 SAST security patterns
  + Python code support → L4 cross-language

With Tier 3 cloud enrichment (planned):
  L1: 99%  L2: 90%  L3: 98%  L4: 95%  → Overall: ~93%
  + Presidio → PII-in-code detection
  + LLM L5 → semantic document validation
  + Multi-framework → OWASP + MITRE mapping
  + Vendor assessment → supply chain coverage

After remaining core work (E-12 + E-110 real AST):
  L1: 99%  L2: 92%  L3: 98%  L4: 97%  → Overall: ~95%
  + L2 semantic validation (real content analysis)
  + Real AST parsing (SWC/tree-sitter)
  + L5 doc validation enriches L2

With Eval (dynamic testing — separate from scan accuracy):
  Conformity coverage: 8/19 EU AI Act articles tested dynamically
  Articles tested: 5, 10, 12, 13, 14, 15(1), 15(3), 50
  250 conformity tests + 300 security probes = 550 total
  Combined audit (scan + eval) = most complete EU AI Act coverage
```

---

## EU AI Act Article Coverage

| Article | Requirement | Scanner Checks | Eval Checks |
|---------|------------|----------------|-------------|
| Art. 4 | AI literacy | L1 ai-literacy, L2 ai-literacy | — |
| Art. 5 | Prohibited practices | L3 banned (45), L3 patterns (10), L2 art5-screening | CT-7: 20 dynamic tests (social scoring, manipulation, exploitation) |
| Art. 9 | Risk management | L2 fria, L2 risk-management, GPAI systemic risk | — (scan covers documentation) |
| Art. 10 | Data governance | L3 bias testing, L4 data-governance | CT-4: 45 bias A/B paired tests (gender, age, nationality, religion, disability) |
| Art. 11 | Technical documentation | L2 tech-documentation | — (scan covers documentation) |
| Art. 12 | Record-keeping | L1 logging, L3 log-retention, L4 logging, L4 record-keeping, XL logging-no-retention | CT-8: 15 runtime logging tests (request logged, PII masked, retention) |
| Art. 13 | Transparency | L2 instructions-for-use, L4 disclosure | CT-3: 30 explanation quality tests (reasoning, factors, confidence) |
| Art. 14 | Human oversight | L4 human-oversight, L4 kill-switch, XL kill-switch-no-test | CT-2: 35 escalation behavior tests (complaints, emergencies, uncertainty) |
| Art. 15 | Accuracy/robustness/security | L4 accuracy-robustness, L4 cybersecurity, L4 security-risk | CT-5: 30 accuracy tests + CT-6: 35 robustness tests (edge cases, encoding) |
| Art. 26 | Deployer obligations | L2 monitoring-policy, L4 deployer-monitoring, XL doc-code-mismatch | — |
| Art. 26(7) | Worker notification | L2 worker-notification | — |
| Art. 27 | FRIA | L2 fria | — |
| Art. 43 | Conformity assessment | L4 conformity-assessment | — |
| Art. 47 | Declaration of conformity | L2 declaration-conformity | — |
| Art. 49 | EU Database registration | L1 passport-presence | — |
| Art. 50(1) | AI disclosure | L1 ai-disclosure, L4 disclosure, L4 bare-llm (info) | CT-1: 40 transparency tests (disclosure in response, headers, self-ID) |
| Art. 50(2) | Content marking | L1 content-marking, L4 content-marking | CT-1: deepfake/audio disclosure tests |
| Art. 51-53 | GPAI transparency | L1 gpai-transparency, L4 gpai-transparency, GPAI systemic risk | — |
| Art. 73 | Incident reporting | L2 incident-report | — |

**Coverage summary:**
- **Scanner (static):** 19 articles covered via code/document analysis
- **Eval (dynamic):** 8 articles covered via runtime testing (Art. 5, 10, 12, 13, 14, 15(1), 15(3), 50)
- **Combined (audit):** Maximum coverage — static + dynamic in one report

---

## Limits & Constants

| Constant | Value |
|----------|-------|
| Max files per scan | 500 |
| Max file size | 1 MB |
| Excluded directories | node_modules, .git, dist, build, .next, coverage, __pycache__, .cache, .output, vendor |
| Scan time (typical) | <500ms (L1-L4) |
| Critical score cap | 49 |
| L5 max findings | 20 |
| L5 uncertainty range | 50-80% confidence |
| Banned packages | 45 |
| Prohibited patterns | 10 regex |
| AI SDK packages | 45 (5 ecosystems) |
| Pattern rules | 40+ (14 categories) |
| Cross-layer rules | 7 |
| NHI patterns | 37 |
| Git history doc types | 21 |
| GPAI systemic checks | 4 |
| L5 targeted prompts | 8 |
| L5 doc validation elements | 34 |
| Evidence source types | 12 (scan 7 + security 2 + eval 3) |
| Attack probes (embedded) | 300+ (10 OWASP categories) |
| Conformity tests (eval) | 250 (8 EU AI Act articles: 118 deterministic + 132 LLM-judged) |
| Eval total tests | 550 (250 conformity + 300 security) |
| Scanner rules version | 1.0.0 |
| Regulation reference | EU 2024/1689 |
| Scan tiers | 3 (Offline, Deep, Cloud) + combinable --llm flag |
| Eval modes | 4 (Basic, LLM-judged, Security, Full) |
| External tools (Tier 2, uv) | 3 (Semgrep, Bandit, ModelScan) |
| External modules total | 17 (4 embed + 3 uv + 2 npm + 5 server + 2 optional + 1 internal) |
| uv tools cache | `~/.complior/tools/` (~150MB) |
| Cloud scan endpoint | `scan.complior.dev` |
| Compliance frameworks | 2 done + 2 planned (EU AI Act, AIUC-1 | ISO 42001, NIST AI RMF) |
| Security frameworks | 2 done + 1 planned (OWASP LLM Top 10, MITRE ATLAS | ISO 27090) |

---

## HTTP Endpoints

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
| `POST` | `/redteam/run` | Red Team | Run adversarial probes against LLM agent |
| `GET` | `/redteam/last` | Red Team | Return last saved redteam report |
| `POST` | `/import/promptfoo` | Import | Import Promptfoo JSON → security score |
| `POST` | `/eval` | Eval | Dynamic AI system testing (conformity + security) |
| `GET` | `/eval/last` | Eval | Return last eval result |
| `GET` | `/eval/catalog` | Eval | List all 550 available eval tests |
| `GET` | `/frameworks` | Frameworks | List registered frameworks |
| `GET` | `/frameworks/scores` | Frameworks | All framework scores (compliance + security) |
| `GET` | `/frameworks/scores/:id` | Frameworks | Single framework score by ID |
| `POST` | `/proxy/connect` | MCP Proxy | Connect agent to proxy (PLANNED) |

### CLI Commands

| Command | Mode | Tier | Description |
|---------|------|------|-------------|
| `complior scan` | Standard | 1 | Default offline scan (L1-L4) |
| `complior scan --deep` | Deep | 2 | +Semgrep/Bandit/ModelScan (uv auto-download) |
| `complior scan --llm` | LLM | 1+ | +L5 LLM analysis (BYOK or Hosted) |
| `complior scan --deep --llm` | Deep+LLM | 2+ | Maximum local scan (tools + LLM) |
| `complior scan --cloud` | Cloud | 3 | +Cloud enrichment (scan.complior.dev, month 3-4+) |
| `complior scan --deep --llm --cloud` | Maximum | 3+ | All combined (95%+ coverage) |
| `complior scan --diff <branch>` | Diff | 1 | Branch comparison |
| `complior scan --ci` | Standard | 1 | CI mode (JSON output, exit code) |
| `complior scan-url <url>` | External | 1 | Headless browser scan |
| `complior sbom` | SBOM | 1 | CycloneDX generation |
| `complior daemon --watch` | Watcher | 1 | Continuous compliance gate |
| `complior redteam run [--agent <name>] [--categories ...] [--max-probes N]` | Red Team | 1 | Adversarial testing, 300+ embedded probes, OWASP/MITRE scoring |
| `complior import promptfoo [--file <path>] [--json]` | Import | 1 | Import Promptfoo red-team JSON → security score |
| `complior eval --target <url>` | Eval (Basic) | 1 | 118 deterministic conformity tests |
| `complior eval --target <url> --llm` | Eval (LLM) | 1 | 250 conformity tests (+ LLM judge, BYOK) |
| `complior eval --target <url> --security` | Eval (Security) | 1 | 300 attack probes (= redteam integrated) |
| `complior eval --target <url> --full` | Eval (Full) | 1 | 550 tests (conformity + security) |
| `complior eval --target <url> --ci --threshold 70` | Eval (CI) | 1 | CI gate: exit 1 if conformity < threshold |
| `complior audit --scan . --target <url>` | Audit | 1-3 | Full package: scan + eval + docs + evidence |
| `complior scan --data <dir>` | Training Data | 2 | Training data compliance scan (PLANNED) |
| `complior scan --endpoint <url>` | API Check | 2 | Live API endpoint probe (PLANNED) |
| `complior scan --vendors` | Vendor | 3 | AI SDK vendor assessment (PLANNED) |

---

## Key Source Files

| File | Purpose |
|------|---------|
| `domain/scanner/create-scanner.ts` | Pipeline orchestrator |
| `domain/scanner/layers/layer1-files.ts` | L1 file presence |
| `domain/scanner/layers/layer2-docs.ts` | L2 document structure |
| `domain/scanner/layers/layer2-parsing.ts` | L3 dependency parsing |
| `domain/scanner/layers/layer4-patterns.ts` | L4 code patterns |
| `domain/scanner/layers/layer5-llm.ts` | L5 base LLM |
| `domain/scanner/layers/layer5-targeted.ts` | L5 targeted (E-113) |
| `domain/scanner/layers/layer5-docs.ts` | L5 doc validation (E-114a) |
| `domain/scanner/import-graph.ts` | Import graph (E-109) |
| `domain/scanner/ast/swc-analyzer.ts` | Structural analysis (E-110) |
| `domain/scanner/languages/adapter.ts` | Multi-language (E-111) |
| `domain/scanner/checks/git-history.ts` | Git history (E-112) |
| `domain/scanner/checks/nhi-scanner.ts` | Secrets scan |
| `domain/scanner/checks/cross-layer.ts` | Cross-layer rules |
| `domain/scanner/checks/gpai-systemic-risk.ts` | GPAI Art.51-52 |
| `domain/scanner/checks/dep-deep-scan.ts` | Lockfile deep scan |
| `domain/scanner/rules/pattern-rules.ts` | Pattern definitions |
| `domain/scanner/rules/comment-filter.ts` | Comment filter (E-114b) |
| `domain/scanner/score-calculator.ts` | Scoring algorithm |
| `domain/scanner/evidence-store.ts` | Evidence collection |
| `domain/scanner/compliance-diff.ts` | Drift/diff |
| `domain/scanner/sbom.ts` | SBOM generation |
| `data/scanner-constants.ts` | Unified extension sets (H1) |
| `data/ai-packages.ts` | AI package registry (H4) |
| `infra/file-collector.ts` | File collector (C1, moved from domain) |
| `data/finding-explanations.json` | Static explanations |
| **Security / Frameworks (S10)** | |
| `data/security/owasp-llm-top10.ts` | OWASP LLM Top 10 data (10 categories, plugins, severities) |
| `data/security/mitre-atlas.ts` | MITRE ATLAS tactics (6 tactics, plugin mappings) |
| `data/security/attack-probes.ts` | 300+ adversarial probes (embedded, deterministic eval) |
| `data/security/index.ts` | Barrel re-export for security data |
| `domain/frameworks/owasp-llm-framework.ts` | OWASP LLM framework adapter + scorer |
| `domain/frameworks/mitre-atlas-framework.ts` | MITRE ATLAS framework adapter + scorer |
| `domain/frameworks/score-plugin-framework.ts` | Generic scoring helper for plugin-based frameworks |
| `domain/scanner/security-score.ts` | Security score calculator (OWASP category grouping) |
| `domain/certification/redteam-runner.ts` | Red team runner (probes → LLM → evaluate → report) |
| `domain/import/promptfoo-importer.ts` | Promptfoo JSON importer (Zod validation → score) |
| `domain/shared/compliance-constants.ts` | Shared grade thresholds, deadline, resolveGrade() |
| `http/routes/redteam.route.ts` | POST /redteam/run, GET /redteam/last |
| `http/routes/import.route.ts` | POST /import/promptfoo |
| **Eval — Dynamic AI System Testing (PLANNED)** | |
| `domain/eval/eval-runner.ts` | Eval orchestrator (conformity + security) |
| `domain/eval/conformity-tests.ts` | 250 EU AI Act conformity test definitions |
| `domain/eval/conformity-categories/ct-1-transparency.ts` | Art. 50 transparency tests (40) |
| `domain/eval/conformity-categories/ct-2-oversight.ts` | Art. 14 human oversight tests (35) |
| `domain/eval/conformity-categories/ct-3-explanation.ts` | Art. 13 explanation tests (30) |
| `domain/eval/conformity-categories/ct-4-bias.ts` | Art. 10 bias A/B paired tests (45) |
| `domain/eval/conformity-categories/ct-5-accuracy.ts` | Art. 15(1) accuracy tests (30) |
| `domain/eval/conformity-categories/ct-6-robustness.ts` | Art. 15(3) robustness tests (35) |
| `domain/eval/conformity-categories/ct-7-prohibited.ts` | Art. 5 prohibited practices tests (20) |
| `domain/eval/conformity-categories/ct-8-logging.ts` | Art. 12 logging tests (15) |
| `domain/eval/llm-judge.ts` | LLM-as-judge evaluator (BYOK) |
| `domain/eval/conformity-score.ts` | Conformity score calculator |
| `domain/eval/eval-report.ts` | Eval report generator |
| `data/eval/conformity-test-catalog.ts` | 250 test definitions (probes + expected + article) |
| `http/routes/eval.route.ts` | POST /eval, GET /eval/last, GET /eval/catalog |
| `http/routes/audit.route.ts` | POST /audit (scan + eval + docs) |

---

## Remaining Scanner Work

### Core Engine Improvements

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| E-110 | Real AST (SWC/tree-sitter) | HIGH | PARTIAL | Regex approximation, no semantic analysis |
| E-12 / S07-06 | L2 Semantic Validation | MEDIUM | TODO | Replace word-count with section-level analysis |
| E-14 / S07-08 | ISO 27090 Security Rules (6) | MEDIUM | TODO | Prompt injection, model extraction checks |
| S07-01 | Incremental Scan (file-level cache) | CRITICAL | TODO | Project-level cache exists, file-level needed |
| S08-05 | Advanced Drift Detection | HIGH | TODO | Historical trend, drift patterns |
| S08-06 | Regulation Change Tracking | MEDIUM | TODO | Feed from regulation API |
| S06-13 | NHI Scanner Expansion | HIGH | TODO | Env var discovery, expanded patterns |

### External Tool Integration (Tier 2)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| EXT-01 | Semgrep integration | HIGH | TODO | uv auto-download, L4 SAST extension |
| EXT-02 | Bandit integration | HIGH | TODO | uv auto-download, Python SAST |
| EXT-03 | ModelScan integration | MEDIUM | TODO | uv auto-download, model vulnerability scan |
| EXT-04 | detect-secrets integration | MEDIUM | TODO | uv auto-download, expands NHI coverage |
| EXT-05 | uv tool manager | HIGH | TODO | Auto-download infra (`~/.complior/tools/`) |
| EXT-06 | Dual scoring (Security Score) | HIGH | PARTIAL | OWASP + MITRE framework adapters done; external tool (Semgrep/Bandit) integration remaining |

### Scanner Enhancements (Planned)

| ID | Feature | Priority | Status | Tier | Notes |
|----|---------|----------|--------|------|-------|
| ENH-01 | Training Data Scan | MEDIUM | TODO | 2 | `--data`, Art. 10 PII/bias in data files |
| ENH-02 | API Endpoint Check | MEDIUM | TODO | 2 | `--endpoint`, Art. 15/50 live API probe |
| ENH-03 | LLM Config Scan | LOW | TODO | 1 | Auto, L1/L4 config file parsing extension |
| ENH-04 | Live Runtime Analysis | LOW | TODO | 3 | `--live`, Art. 72 runtime observation via SDK |
| ENH-05 | Vendor Assessment | MEDIUM | TODO | 3 | `--vendors`, Art. 25 vendor compliance check |
| ENH-06 | Python Code Support | HIGH | TODO | 2 | L4 Python AST via Bandit + Semgrep |

### Cloud Enrichment (Tier 3)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| CLOUD-01 | Cloud Scan API (scan.complior.dev) | HIGH | TODO | Enrichment endpoint |
| CLOUD-02 | AI SBOM + CVE lookup | MEDIUM | TODO | CycloneDX → OSV/NVD |
| CLOUD-03 | Presidio PII-in-Code | MEDIUM | TODO | 50+ EU PII types |
| CLOUD-04 | Multi-framework scoring | HIGH | PARTIAL | OWASP + MITRE done (local adapters); NIST AI RMF, ISO 42001 remaining |
| CLOUD-05 | PDF/DOCX report export | LOW | TODO | Professional compliance report |

### Eval — Dynamic AI System Testing (PLANNED)

| ID | Feature | Priority | Status | Notes |
|----|---------|----------|--------|-------|
| EVAL-01 | Eval runner (orchestrator) | CRITICAL | TODO | `complior eval --target <url>` |
| EVAL-02 | CT-1 Transparency tests (Art. 50) | CRITICAL | TODO | 40 tests: disclosure, headers, self-ID |
| EVAL-03 | CT-2 Human Oversight tests (Art. 14) | HIGH | TODO | 35 tests: escalation, complaints, boundaries |
| EVAL-04 | CT-3 Explanation tests (Art. 13) | HIGH | TODO | 30 tests: reasoning, factors, confidence (LLM-judged) |
| EVAL-05 | CT-4 Bias tests (Art. 10) | CRITICAL | TODO | 45 tests: A/B paired demographics, consistency |
| EVAL-06 | CT-5 Accuracy tests (Art. 15(1)) | HIGH | TODO | 30 tests: factual, hallucination, self-contradiction |
| EVAL-07 | CT-6 Robustness tests (Art. 15(3)) | HIGH | TODO | 35 tests: edge cases, encoding, injection strings |
| EVAL-08 | CT-7 Prohibited tests (Art. 5) | CRITICAL | TODO | 20 tests: social scoring, manipulation, exploitation |
| EVAL-09 | CT-8 Logging tests (Art. 12) | MEDIUM | TODO | 15 tests: request logged, PII masked, retention |
| EVAL-10 | LLM-as-judge module | HIGH | TODO | BYOK evaluator for semantic test judgments |
| EVAL-11 | Conformity Score calculator | HIGH | TODO | Per-article scoring, critical caps, grades |
| EVAL-12 | Guard config recommendation | MEDIUM | TODO | Auto-suggest Guard Service config from eval results |
| EVAL-13 | Eval report generator | MEDIUM | TODO | PDF/JSON/MD output with critical gaps |
| EVAL-14 | `complior audit` command | HIGH | TODO | scan + eval + docs + evidence = full package |
| EVAL-15 | Eval CI/CD gate | MEDIUM | TODO | `--ci --threshold 70` exit code |
| EVAL-16 | Eval evidence chain | HIGH | TODO | Record all eval events in evidence chain |

**Updated:** 2026-03-18
