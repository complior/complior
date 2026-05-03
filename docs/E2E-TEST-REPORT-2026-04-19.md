# E2E Test Report — Complior v0.9.9 / v0.10.0

> **Date**: 2026-04-19
> **Target project**: `/home/openclaw/test-projects/eval-target`
> **Engine version**: 0.10.0 (port 3099)
> **CLI version**: 0.9.9 (release binary)
> **Tested by**: architect agent

---

## Executive Summary

Tested **25+ commands/flag combinations** against a real eval-target project (intentionally non-compliant AI chatbot). Found **19 issues**: 3 critical bugs, 7 bugs, 5 UX issues, 4 inconsistencies.

**Verdict**: Core scan/fix/report pipeline is solid. Eval pipeline is broken for real targets. Passport subsystem has rough edges. Score display has inconsistencies.

---

## Test Results by Command

### `complior scan` — PASS (with issues)

| Test | Result | Notes |
|------|--------|-------|
| `scan` (no flags) | PASS | Score 85/100, 7 findings, 40ms |
| `scan --json` | PASS | Valid JSON output |
| `scan --sarif` | PASS | SARIF 2.1.0, 1 run |
| `scan --ci --threshold 80` | PASS | Exit 0, correct |
| `scan --ci --threshold 90` | PASS | Exit 2, "CI FAIL: Score 85 is below threshold 90" |
| `scan --deep` | PASS | L4+ Semgrep/Bandit + NHI+ detect-secrets. Found prompt injection + secrets |
| `scan --quiet` | PASS | Minimal output |
| `scan --fail-on medium` | **FAIL** | **BUG #1**: Exit 0 despite 2 medium findings |
| `scan --fail-on low` | **FAIL** | **BUG #1**: Exit 0 despite 5 low findings |
| `scan --agent <name>` | PASS (UX) | Shows 0 findings but project-wide score — confusing |
| `scan --diff <ref>` | PASS | Requires commit ref argument (correct) |

### `complior eval` — FAIL (critical)

| Test | Result | Notes |
|------|--------|-------|
| `eval <url> --det` | **FAIL** | **BUG #2 (CRITICAL)**: All 176 tests = errors. Auto-detect falls back to HTTP adapter which sends `{message}` not `{messages}` |
| `eval <url>/v1/chat/completions --det` | **FAIL** | **BUG #2**: Same — target has no `/v1/models` so auto-detect fails to OpenAI adapter |
| `eval <url> --det --request-template --response-path` | **PASS** | Workaround with custom template works! Tests run correctly |
| `eval openai://<url> --det` | **FAIL** | **BUG #3**: CLI rejects `openai://` protocol prefix with "must be HTTP(S) URL" |

**Root cause**: Auto-detect probes `/v1/models` → 404 → falls back to HTTP adapter → sends `{message: probe}` instead of OpenAI `{messages: [...]}` format. Target responds 400 "messages is required".

### `complior fix` — PASS (with issues)

| Test | Result | Notes |
|------|--------|-------|
| `fix --dry-run` | PASS | Shows 4 planned doc fixes |
| `fix --dry-run --json` | PASS | Returns `{changes, predictedScore, totalImpact}` |
| `fix --json` | PASS | Applies fixes |
| `fix --doc fria --agent <name>` | PASS | Generates FRIA, 7 fields prefilled, 6 remaining |
| `fix --doc worker-notification --agent <name>` | PASS | Generates worker notification doc |
| `fix --doc all --agent <name>` | **FAIL** | **BUG #4**: "Invalid document type: all" but `--help` shows `--doc all my-bot` as example |
| `fix --doc fria <name>` (no --agent) | **FAIL** | **BUG #5**: `<name>` parsed as `[PATH]`, uses "default" passport |

### `complior passport` — Mixed

| Test | Result | Notes |
|------|--------|-------|
| `passport list` | PASS | Shows 2 agents |
| `passport show <name>` | PASS | Shows agent details |
| `passport init` (no args) | PASS | Discovers agents, shows existing |
| `passport init <name>` | **FAIL** | **BUG #6**: Treats name as directory, scans `{cwd}/<name>` |
| `passport validate <name>` | **FAIL** | **BUG #7**: Shows "Completeness: 0%" then "Completeness score 74% is below 80%" — contradictory |
| `passport completeness <name>` | PASS | Great output: 74%, shows 7 missing fields with obligations |
| `passport export --format a2a <name>` | PASS | Exports to `.complior/exports/` |
| `passport export --format json <name>` | PASS | Correctly rejects: "must be a2a, aiuc-1, or nist" |
| `passport autonomy <name>` | **FAIL** | **BUG #8**: Internal server error |
| `passport permissions <name>` | **FAIL** | **BUG #9**: "No agents found" (but they exist!) |
| `passport evidence` | PASS | 385 entries, shows summary |
| `passport evidence --verify` | PASS | "BROKEN at entry 283" — chain corruption detected |
| `passport audit <name>` | PASS | Full audit trail, 50 entries |
| `passport registry <name>` | **FAIL** | **BUG #10**: "No Agent Passports found" (but they exist!) |

### `complior report` — PASS

| Test | Result | Notes |
|------|--------|-------|
| `report` (human) | PASS | 55/100 ORANGE, 14/17 docs, comprehensive |
| `report --format json` | PASS | Full JSON with all sections |
| `report --format md` | PASS | Saves to `.complior/reports/compliance.md` |
| `report --format html` | PASS | Saves with timestamp |

### `complior doctor` — PASS

| Test | Result | Notes |
|------|--------|-------|
| `doctor` | PASS | 6/8 passed (MCP WARN, SaaS WARN expected) |

### `complior status` — PASS (with issues)

| Test | Result | Notes |
|------|--------|-------|
| `status` (human) | PASS (UX) | **UX #1**: Shows "weight 900%", "weight 1300%" — should be 9%, 13% |
| `status --json` | PASS | Valid JSON |

---

## Bugs Found

### CRITICAL (3)

| # | Bug | Impact | Severity |
|---|-----|--------|----------|
| B-01 | `eval --det` ALL tests fail — auto-detect adapter fallback sends wrong request format | **eval is unusable** for targets without `/v1/models` endpoint | CRITICAL |
| B-02 | `--fail-on medium/low` returns exit 0 despite matching findings | **CI pipeline cannot gate on severity** | CRITICAL |
| B-03 | Score inconsistency: `COMPLIANCE SCORE 85/100` vs `EU AI Act 82/100` in same output | **User gets two different scores**, undermines trust | HIGH |

### BUGS (7)

| # | Bug | Impact |
|---|-----|--------|
| B-04 | `fix --doc all` — "Invalid document type: all" but shown in `--help` examples | Help misleads users |
| B-05 | `fix --doc fria <name>` without `--agent` — name parsed as PATH | Confusing UX, generates for "default" passport |
| B-06 | `passport init <name>` — treats name as subdirectory | Scans wrong path, finds nothing |
| B-07 | `passport validate` — shows "Completeness: 0%" then "74%" | Contradictory output |
| B-08 | `passport autonomy <name>` — Internal server error (500) | Feature broken |
| B-09 | `passport permissions <name>` — "No agents found" | Feature broken |
| B-10 | `passport registry <name>` — "No Agent Passports found" | Feature broken |

### UX ISSUES (5)

| # | Issue | Suggestion |
|---|-------|------------|
| U-01 | `status` shows "weight 900%", "weight 1300%" | Display as 9%, 13% (divide by 100) |
| U-02 | Quick Actions reference non-existent commands: `complior docs generate --missing`, `complior tui` | Remove or update to valid commands |
| U-03 | `fix --dry-run` shows "SCORE 0 → ~30" but actual score is 85 | Fix estimated score calculation |
| U-04 | `scan --quiet` still shows 5+ lines | Consider single-line mode for `--quiet` |
| U-05 | `eval` protocol hints (`openai://`) rejected by CLI but supported by engine | Allow protocol hints in CLI URL validation |

### INCONSISTENCIES (4)

| # | Issue | Notes |
|---|-------|-------|
| I-01 | Score 85 (human) vs 84.57 (JSON) vs 82 (framework breakdown) | Three different numbers for same scan |
| I-02 | `status` shows "0 of 47 obligations covered" but scan shows "33/42 passed" | Obligation vs check count confusion |
| I-03 | Version mismatch: CLI says 0.9.9, engine says 0.10.0 | Should match after version bump |
| I-04 | `scan --agent <name>` shows 0 findings but project-wide score | Agent-scoped findings but global score — confusing |

---

## What Works Well

1. **Core scan pipeline** — fast (40ms), deterministic, accurate layered analysis
2. **Deep scan** — Semgrep, Bandit, ModelScan, detect-secrets integration works
3. **Fix --doc** — FRIA generation with passport prefill is excellent UX
4. **Passport completeness** — beautiful output, maps missing fields to articles
5. **Evidence chain** — 385 entries, audit trail with timestamps
6. **Report generation** — JSON, MD, HTML all work, comprehensive content
7. **SARIF output** — standard format for CI integration
8. **CI mode** — `--ci --threshold` with correct exit codes
9. **Passport export (A2A)** — cross-system interop ready
10. **Doctor** — useful health check

---

## Priority Fix Order

1. **B-01** (eval adapter) — makes entire eval pipeline work
2. **B-02** (--fail-on) — critical for CI pipelines
3. **B-03** (score inconsistency) — trust issue
4. **B-08/09/10** (passport commands) — 3 broken commands
5. **U-01/02/03** (display bugs) — user confusion
6. **B-04/05/06/07** (minor bugs) — polish

---

## Test Environment

- **Machine**: Hetzner GX11 (24GB VRAM, 64GB RAM)
- **OS**: Linux (Ubuntu)
- **Engine**: TypeScript, Bun/Node, port 3099
- **CLI**: Rust release binary, v0.9.9
- **Target**: Hono server on port 4000, OpenRouter proxy to Llama 3.1 8B
- **tmux**: Session `e2e`, socket `-L e2e`

---

## Appendix: Eval Adapter Auto-Detection Flow

```
URL → Check protocol hints (openai://, anthropic://, ollama://)
   → Probe GET {url}/v1/models → 200 → OpenAI adapter
   → Probe GET {url}/api/tags → 200 → Ollama adapter
   → Fallback → HTTP adapter (sends {message: probe})  ← BUG: wrong format
```

**Fix suggestion**: Add URL path heuristic:
- If URL contains `/v1/chat/completions` → use OpenAI adapter directly
- Or: try POST to endpoint with OpenAI format as detection step
- Or: add `--adapter openai|anthropic|ollama|http` CLI flag
