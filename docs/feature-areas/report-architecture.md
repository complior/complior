# Feature Area: Report Architecture

> **Source:** `docs/REPORT.md`
> **Version:** 1.0.0
> **Date:** 2026-04-05
> **Purpose:** Aggregated compliance status report — 6 sections, 5 data sources
> **Status (v1.0.0):** ⚠️ FUNCTIONAL — manual E2E verification needed (HTML render quality) — V1-M21 deep test

---

## 1. Purpose

**Report** aggregates status from all pipelines (scan, eval, fix, passport, evidence) and answers: "What do I need to do?" and "What's my documentation package status?"

**Principle:** Report NEVER collects data itself — only aggregates results from scan, eval, passport, evidence services. All metrics are deterministic.

---

## 2. Architecture

```
DATA SOURCES → AGGREGATION → REPORT

Phase 1: DATA COLLECTION
├─ ScanService → ScanResult (score, findings)
├─ EvalService → EvalResult (conformity, security)
├─ PassportService → AgentPassport[] (completeness)
├─ EvidenceStore → EvidenceChain (entries, verified)
└─ ObligationsData → 108 obligations

Phase 2: AGGREGATION
├─ Readiness Score (weighted 5-dim)
├─ Document Inventory (14 docs × status)
├─ Obligation Coverage (108 × covered/uncovered)
├─ Passport Status (per-agent completeness)
├─ Priority Action Plan (top 20 by severity × deadline × impact)
└─ Summary (totals + days until Aug 2, 2026)

Phase 3: OUTPUT
├─ CLI human output (colored terminal)
├─ JSON (--json, CI/CD, API)
├─ Markdown (--format markdown)
├─ PDF (--format pdf)
├─ Share link (--share --upload)
└─ Offline HTML (--share --local)
```

---

## 3. Readiness Score Formula

Composite metric (0-100) based on 5 dimensions with weights:

| Dimension | Weight | Source |
|-----------|--------|--------|
| Scan Score | 35% | ScanService → totalScore |
| Documents | 25% | Document Inventory → reviewed ratio |
| Passports | 20% | PassportService → avg completeness |
| Eval Score | 15% | EvalService → conformityScore |
| Evidence Chain | 5% | EvidenceStore → verified + length |

### Weight redistribution

When dimension is unavailable (null), its weight redistributes proportionally:

```
Example: eval not run (evalScore = null)
  Scan:       35% / 85% × 100 = 41.2%
  Documents:  25% / 85% × 100 = 29.4%
  Passports:  20% / 85% × 100 = 23.5%
  Evidence:    5% / 85% × 100 =  5.9%
```

### Zones

| Score | Zone | Meaning |
|-------|------|---------|
| 90-100 | GREEN | Ready for audit |
| 70-89 | YELLOW | Partial compliance |
| 50-69 | ORANGE | Substantial gaps |
| 0-49 | RED | Critical non-compliance |

### Critical Caps

| Condition | Max Score |
|-----------|-----------|
| scan score = 0 | ≤ 29 (RED forced) |
| 0 docs reviewed | ≤ 49 (RED forced) |
| 0 passports (with AI agents) | ≤ 59 (ORANGE forced) |
| Evidence chain missing/invalid | ≤ 79 (YELLOW forced) |
| Art.5 violation in eval | ≤ 29 (RED forced) |

---

## 4. Sections

### Section 1: Readiness Dashboard
- Composite score with trend
- Zone indicator with color
- Score history sparkline

### Section 2: Document Inventory
14 compliance documents × status:
- `none` — file missing
- `scaffold` — placeholder content
- `draft` — real content, not reviewed
- `reviewed` — marked as reviewed

### Section 3: Obligation Coverage
108 EU AI Act obligations × covered/uncovered status.

### Section 4: Passport Status
Per-agent: completeness %, missing fields, FRIA status.

### Section 5: Priority Action Plan
Top 20 actions sorted by: `severity × deadline × score impact`.

### Section 6: Summary
Totals + days remaining until August 2, 2026 enforcement.

---

## 5. Commands

```bash
complior report                         Full status report (human)
complior report --json                   JSON for CI/CD
complior report --format markdown        Markdown file
complior report --format pdf            PDF → .complior/reports/
complior report --share --upload         Upload to complior.ai (7 days)
```

---

## 6. Data Sources

| Source | Data |
|--------|------|
| ScanService | totalScore, categoryScores[], findings[], zone |
| EvalService | conformityScore, securityScore, testResults[] |
| PassportService | completeness %, missing fields, fria_completed |
| EvidenceStore | entries[], verified: bool, chain length |
| ObligationsData | 108 obligations, covered/uncovered mapping |

## 8. Cross-Dependencies

| Depends on | How |
|---|---|
| **Scanner** | ScanService → 35% of Readiness Score |
| **Eval** | EvalService → 15% of Readiness Score |
| **Passport** | PassportService → 20% of Readiness Score |
| **Evidence** | EvidenceStore → 5% of Readiness Score |
| **Frameworks** | 108 EU AI Act obligations for coverage section |

| Used by | How |
|---|---|
| **TUI** | Page 7 exports to PDF, Markdown |

## 9. Test Coverage

4 tests: audit-report.test.ts, badge-generator.test.ts, report-builder.test.ts, share.test.ts
