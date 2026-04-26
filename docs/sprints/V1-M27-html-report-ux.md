# V1-M27: HTML Report UX Rework

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M27-html-report-ux` (from dev post-V1-M26)
> **Created:** 2026-04-26
> **Author:** Architect
> **Triggered by:** User HTML review after V1-M26 — 8 distinct UX gaps in report tabs
> **Predecessor:** V1-M26 applicable articles
> **Successor:** TRULY deep E2E re-run via `/deep-e2e` → tag v1.0.0

---

## 1. Goal

Закрыть 8 UX gaps в HTML compliance report выявленные user'ом после V1-M26:

| # | Tab | Issue (user feedback) |
|---|-----|------------------------|
| HR-1 | Overview | "Score capped: Evidence chain missing or invalid" — **mystic message**, не понятно что делать |
| HR-2 | Tests | LLM01/LLM02 raw codes — пользователь не понимает что тестируется и каким флагом |
| HR-3 | Findings | Сухой формат — "как с компьютером, не с человеком" |
| HR-4 | Laws | Все obligations или только применимые к профилю? |
| HR-5 | Documents | Только нужные docs для профиля или все? |
| HR-6 | Fixes | **Пусто** — V1-M22 A-6 не дошёл до prod renderer |
| HR-7 | Passports | Collapsed — нужны expandable details со всеми 36 полями |
| HR-8 | Actions/Timeline | **Не понятно** что эти tabs показывают |

## 2. Scope

### HR-1: Auto-init evidence chain
- **Bug:** "Score capped: Evidence chain missing or invalid" в Overview — V1-M22 A-8 не дошёл до runtime
- **Fix:** `complior init` автоматически создаёт evidence chain seed (idempotent)
- **Files:** `engine/core/src/services/init-service.ts` или composition + scan-service
- **RED test:** `engine/core/src/services/init-evidence-chain.test.ts` (5 tests)

### HR-2: Tests tab — group by source command
- **Bug:** Raw OWASP codes (LLM01, LLM02, ART5) непонятны
- **Fix:** Group в HTML by source:
  - **Scan tests** (deterministic, AST/rules) — N tests, X passed
  - **Eval --det** (conformity, no LLM) — N tests
  - **Eval --llm** (LLM-judged conformity) — N tests
  - **Eval --security** (OWASP LLM Top 10 + MITRE ATLAS attack probes) — N probes
  - **Scan --deep** (Semgrep/Bandit/ModelScan) — N findings
- Per-category: human description ("Tests checking AI literacy training documentation in your repo")
- **Files:** `engine/core/src/domain/reporter/html-renderer.ts` `renderTabTests()`
- **RED test:** `engine/core/src/domain/reporter/html-tests-tab-grouping.test.ts` (4 tests)

### HR-3: Findings tab — human-friendly cards
- **Bug:** Сухой технический формат
- **Fix:** Per-finding card layout:
  ```
  📋 Missing FRIA document for high-risk AI system
  ──────────────────────────────────────────────
  WHAT HAPPENED: We checked your project for FRIA.md and didn't find it.
  WHY THIS MATTERS: EU AI Act Art. 27 requires Fundamental Rights Impact
    Assessment before deploying high-risk AI. Penalty: €15M / 3% turnover.
  WHAT TO DO: Run `complior fix --doc fria` to generate a scaffold, then
    fill in your specific use case details. Estimated effort: 30 minutes.
  ──────────────────────────────────────────────
  Severity: HIGH | Article: 27 | Auto-fixable: ✓
  ```
- **Files:** html-renderer.ts `renderFindingCard()`, finding-explanations.ts
- **RED test:** `engine/core/src/domain/reporter/html-findings-human-format.test.ts` (5 tests)

### HR-4: Laws tab — profile-filtered + disclaimer
- **Spec:** Show ONLY obligations applicable to profile + disclaimer "+N more for other profiles (X for providers, Y for high-risk, ...)"
- **Files:** html-renderer.ts `renderTabLaws()`, обогатить ObligationCoverage с filtered/excluded counts
- **RED test:** `engine/core/src/domain/reporter/html-laws-profile-filter.test.ts` (4 tests)

### HR-5: Documents tab — profile-filtered + disclaimer
- **Spec:** Show ONLY docs required for profile (e.g. FRIA only for high-risk, ISO docs only if requested). Disclaimer about excluded.
- **Files:** html-renderer.ts `renderTabDocuments()`, DocumentInventory с profile-aware filtering
- **RED test:** `engine/core/src/domain/reporter/html-documents-profile-filter.test.ts` (3 tests)

### HR-6: Fixes tab — populate
- **Bug:** Пусто (V1-M22 A-6 RED test проходил unit, но prod renderer не показывает)
- **Fix:** 2 sections в Fixes tab:
  - **Applied fixes** (from `.complior/fixes-history.json`)
  - **Available fix plans** (from current scan, sorted by impact)
- Если вообще нет fixes (зелёный score) — показать "✓ No fixes needed — your project is compliant"
- **Files:** html-renderer.ts `renderTabFixes()`, ReportService getFixHistory wired through
- **RED test:** `engine/core/src/domain/reporter/html-fixes-tab-populated.test.ts` (4 tests)

### HR-7: Passports tab — expandable
- **Spec:** HTML `<details><summary>` for each passport. Summary = name + completeness %. Expanded = sections:
  - Identity (name, kind, autonomy_level, lifecycle_stage, etc.)
  - Compliance (article 5 screening, FRIA, complior_score, deployer_obligations_*)
  - Endpoints + Capabilities
  - Evidence + Audit
- **Files:** html-renderer.ts `renderTabPassports()`, expand layout
- **RED test:** `engine/core/src/domain/reporter/html-passports-expandable.test.ts` (3 tests)

### HR-8: Actions/Timeline — explanatory + simplified
- **Bug:** Tabs неинтуитивны
- **Spec:**
  - Actions tab — header: "**Suggested next commands** for your current state". Show 3-5 smart suggestions only (already deduplicated post-V1-M22 A-7)
  - Timeline tab — header: "**EU AI Act enforcement deadlines** for your profile". Show:
    - Past deadlines (red) — что просрочено
    - Active period — что нужно делать сейчас
    - Upcoming deadlines (color-coded by urgency)
- **Files:** html-renderer.ts `renderTabActions()`, `renderTabTimeline()`
- **RED test:** `engine/core/src/domain/reporter/html-actions-timeline-headers.test.ts` (4 tests)

## 3. Tasks Table

| # | Task | Agent | RED Test | Architecture |
|---|------|-------|----------|--------------|
| HR-1 | Auto-init evidence chain | nodejs-dev | `init-evidence-chain.test.ts` GREEN | Idempotent on re-init, ed25519 signed seed |
| HR-2 | Tests tab grouping | nodejs-dev | `html-tests-tab-grouping.test.ts` GREEN | Pure render fn, group-by-source pure data transform |
| HR-3 | Findings human format | nodejs-dev | `html-findings-human-format.test.ts` GREEN | Reuse finding-explanations.ts (V1-M10 work) |
| HR-4 | Laws profile filter | nodejs-dev | `html-laws-profile-filter.test.ts` GREEN | Use ObligationCoverage + filter by `applies_to_role/risk_level` |
| HR-5 | Documents profile filter | nodejs-dev | `html-documents-profile-filter.test.ts` GREEN | DocumentInventory обогащённый исходным applicableDocTypes |
| HR-6 | Fixes tab populate | nodejs-dev | `html-fixes-tab-populated.test.ts` GREEN | Use existing report.fixHistory + scan.findings.filter(fixable) |
| HR-7 | Passports expandable | nodejs-dev | `html-passports-expandable.test.ts` GREEN | `<details>` wrapper, escape HTML, sections by passport schema |
| HR-8 | Actions/Timeline UX | nodejs-dev | `html-actions-timeline-headers.test.ts` GREEN | Explanatory `<header>` element per tab, dedupe logic from V1-M22 A-7 |

## 4. Acceptance Criteria

- [ ] All 8 HR RED test files GREEN (~32 tests total)
- [ ] HTML report at `/tmp/reports/v1-m27-test.html` passes ALL UX checks:
  - [ ] Overview: NO "Score capped: Evidence chain missing" message
  - [ ] Tests: grouped by source command with descriptions
  - [ ] Findings: human cards with "What/Why/What to do" format
  - [ ] Laws: profile-filtered with disclaimer
  - [ ] Documents: profile-filtered with disclaimer
  - [ ] Fixes: populated (or "No fixes needed" message if green)
  - [ ] Passports: each row expandable with full detail
  - [ ] Actions/Timeline: explanatory headers visible
- [ ] tsc + clippy + fmt clean
- [ ] dev CI GREEN after merge
- [ ] `/deep-e2e` re-run on 3 profiles — all visual checks pass

## 5. Out of Scope

- PDF format same UX rework (V1-M28 candidate if needed)
- Markdown format detail (md is intentionally compact)
- New report tabs (only existing 8 tabs reworked)

## 6. Handoff

После всех HR-* GREEN → reviewer → architect Section E (`/deep-e2e` на 3 профилях) → если 0 release blockers → PR → merge → CI verify → tag v1.0.0 🚀
