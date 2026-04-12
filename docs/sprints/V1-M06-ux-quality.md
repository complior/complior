# V1-M06: UX Quality Sprint (Engine Output Polish)

**Status:** IN PROGRESS
**Created:** 2026-04-12
**Deadline:** 2026-04-19 (1 week)
**Agent:** nodejs-dev

---

## Context

After testing the live engine on `acme-ai-support`, 8 quality gaps were identified.
These are NOT new features -- they are **polish of existing features** that make the
engine genuinely useful to a real user. The core pipeline works (scan, fix, passport,
report), but the output quality doesn't match what the code already supports internally.

**Why now:** V1-M05 brought type fixes and release prep (v0.9.5). Before moving to
Phase 2 (S06: FRIA LLM + ISO 42001 templates), the existing output must be
production-quality. These fixes are low-risk, high-impact, and most already have
partial implementations.

**Intended outcome:** A user running `complior scan` -> `complior fix` -> `complior report`
gets actionable, prioritized, filtered, prefilled results -- not raw dumps.

---

## ОБЯЗАТЕЛЬНО: Design Consistency (Output Styling)

Все пользовательские выводы, сообщения и HTTP-ответы ДОЛЖНЫ сохранять единый
дизайнерский стиль, уже реализованный в scan (`cli/src/headless/format/human.rs`)
и report (`cli/src/headless/format/report.rs`). Эти файлы — эталон визуального
языка проекта.

### Дизайн-система Complior (источник: `docs/SCANNER.md`, `docs/EVAL.md`, `docs/REPORT.md`)

**Визуальные элементы:**
- Box-drawing символы: `╔═╗ ║ ╠═╣ ╚═╝ ─ ├ └` для заголовков и секций
- Progress bars: `render_bar(percent, width)` — заполненные/пустые символы, цвет по %
- Score coloring: 0-50 bold_red, 50-70 bold_yellow, 70-80 green, 80-90 green, 90-100 bold_green
- Severity icons: Critical=✖ red, High=▲ yellow, Medium=● cyan, Low/Info=· dim
- Zone colors: green/yellow/orange(bold)/red(bold) по readiness zone

**Информационная иерархия:**
- Заголовок с версией и mode (scan/eval/report)
- Score block с визуальным баром и delta
- Findings сгруппированы по agent > layer > severity
- Quick actions с impact score и командой
- Priority actions таблица с severity color, days-left urgency, command hints
- Summary footer с ключевыми метриками

**Адаптивность:**
- Определение ширины терминала (`display_width()`)
- Unicode fallback: ◆→\*, █→#, ✓→+, ⚠→!
- NO_COLOR / TERM=dumb поддержка
- Word wrapping по ширине минус margin

**Стиль сообщений (применять к КАЖДОЙ задаче V1-M06):**
- T-1 (Fix preview): rendered шаблоны в preview ДОЛЖНЫ сохранять markdown formatting
  с тем же уровнем качества, что и в `format_report_human()` rendered sections
- T-2 (Action plan): top-5 actions ДОЛЖНЫ использовать severity coloring, impact scores,
  effort badges и command hints как в `render_actions_section()` / `render_quick_wins()`
- T-3 (Obligations filter): отфильтрованный список ДОЛЖЕН сохранять role tags,
  coverage bars и critical highlighting как в `render_two_column()` obligations column
- T-4 (Finding aggregation): grouped findings ДОЛЖНЫ иметь count badge и affected files
  list в стиле `render_findings_section()` с severity icons
- T-5 (Report documentContents): document excerpts ДОЛЖНЫ показывать docType badge,
  status indicator (✓/~/□/✗) и completeness как в documents column
- T-6/T-7 (Passport discovery): исправленные данные будут отображаться в passport view
  с теми же completeness bars и field labels
- T-8 (projectedScore): projected score ДОЛЖЕН отображаться с delta arrow (↑N.N) и
  score_bar_color() как в existing score displays

**Эталонные файлы (обязательное чтение для nodejs-dev):**
- `cli/src/headless/format/human.rs` — scan output design (808 строк)
- `cli/src/headless/format/report.rs` — report output design (1084 строки)
- `cli/src/headless/format/colors.rs` — color system (184 строки)
- `docs/SCANNER.md` — scanner output specification
- `docs/EVAL.md` — eval output specification
- `docs/REPORT.md` — report output specification

**Правило:** если HTTP endpoint возвращает данные, которые Rust CLI потом форматирует —
JSON структура ДОЛЖНА содержать все поля, необходимые для полноценного rendering.
Не должно быть ситуации, когда CLI получает данные, но не может красиво их показать
из-за отсутствующих полей.

---

## Предусловия среды (architect обеспечивает):

- [x] npm install в engine/core
- [x] cargo build компилируется
- [x] npm test запускается (RED тесты -- ок, ошибки среды -- нет)
- [x] cargo test запускается
- [ ] RED тесты закоммичены: `engine/core/src/e2e/ux-quality.test.ts`
- [ ] Acceptance script закоммичен: `scripts/verify_ux_quality.sh`

---

## Tasks

### T-1: Fix preview renders templates (not `[TEMPLATE:xxx]` markers)

**Problem:** `GET /fix/preview` returns raw `[TEMPLATE:ai-literacy.md]` markers instead
of rendered markdown content. The `applyAction()` in `fix-service.ts` already handles
template resolution during *apply*, but `previewAll()` returns the raw plan from fixer
which still contains markers.

**What dev must do:** In the fix preview flow (`fix.route.ts` GET `/fix/preview`), for
each plan that contains `[TEMPLATE:xxx]` in action content, call `loadTemplate()` +
`generateDocument()` to render the template. Return rendered content in the preview.

**Existing code to reuse:**
- `resolvePassportPlaceholders()` in `fix-service.ts` (lines 18-37)
- `generateDocument()` in `document-generator.ts`
- `loadTemplate()` from FixServiceDeps
- `TEMPLATE_FILE_MAP` from `template-registry.ts`

**Key files:**
- `engine/core/src/services/fix-service.ts` -- add `previewAllRendered()` method
- `engine/core/src/http/routes/fix.route.ts` -- call rendered preview

**Verification:** Unit test in `ux-quality.test.ts` -- T1

---

### T-2: Action plan returns top-5 with `priority` + `projectedScore`

**Problem:** `buildPriorityActions()` returns up to 20 actions (MAX_ACTIONS=20). HTTP
endpoint should limit to 5 for concise display. Each action needs `projectedScore`
(what score would be after fixing this item) and `effort` estimate.

**What dev must do:**
1. Add `maxActionsHttp: 5` to `reporter-config.json` (architect does this)
2. In `priority-actions.ts`, accept optional `maxOverride` param
3. Add `effort` heuristic per action source: document=30min, code=2h, config=5min
4. In report/status route, call with limit=5 and compute per-action `projectedScore`
   using `simulateActions()` with single-action arrays

**Existing code to reuse:**
- `collectPriorityActions()` in `priority-actions.ts`
- `simulateActions()` in `simulate-actions.ts`
- `reporter-config.json` configuration

**Key files:**
- `engine/core/src/domain/reporter/priority-actions.ts`
- `engine/core/data/reporter-config.json`

**Verification:** Unit test in `ux-quality.test.ts` -- T2

---

### T-3: Obligations endpoint filters by project role + risk_class

**Problem:** `GET /obligations` returns all 108 obligations regardless of the project's
configured role (provider/deployer) or risk class. This overwhelms deployers with
provider-only obligations and limited-risk projects with high-risk-only obligations.

**What dev must do:** In `obligations.route.ts`:
1. Accept optional `path` query parameter for project path
2. Load project profile from `.complior/profile.json` (using profile loading logic)
3. Filter obligations by `applies_to_role` matching project role
4. Filter by `applies_to_risk_level` matching project risk class
5. Keep full list as fallback when no profile exists

**Existing code to reuse:**
- `buildObligationCoverage()` in `obligation-coverage.ts` -- already has `roleApplies()`
- Profile loading logic in `onboarding/` services
- `ObligationRecord.applies_to_role` field

**Key files:**
- `engine/core/src/http/routes/obligations.route.ts`

**Verification:** Unit test in `ux-quality.test.ts` -- T3

---

### T-4: L4 findings grouped by checkId (aggregation)

**Problem:** When 5 source files each have a bare OpenAI call, the scanner produces 5
separate `l4-bare-llm` findings. This creates noise in the scan output. Same-checkId
findings should be grouped into a single finding with `affectedFiles` and `count`.

**What dev must do:** After `layer4ToCheckResults()` converts L4 results to CheckResults,
add an aggregation step:
1. Group fail findings by `checkId + article`
2. For each group with count > 1: merge into single finding with:
   - `affectedFiles: string[]` -- all affected file paths
   - `count: number` -- total occurrences
   - Original `file` set to first occurrence
   - Message updated to include count (e.g., "Bare LLM API call detected in 5 files")
3. Pass/info findings remain ungrouped

**Existing code to reuse:**
- `layer4ToCheckResults()` in `layer4-patterns.ts`
- `Finding` type has optional `file` field

**Key files:**
- `engine/core/src/domain/scanner/layers/layer4-patterns.ts`
- Potentially `engine/core/src/domain/scanner/create-scanner.ts` for post-processing

**Verification:** Unit test in `ux-quality.test.ts` -- T4

---

### T-5: Report builder populates `documentContents`

**Problem:** `ComplianceReport.documentContents` is always `[]` because no code populates
it. The report should include content snippets from generated compliance documents found
in the project directory.

**What dev must do:** In `ReportService` or `report-builder.ts`:
1. Scan project for generated compliance docs in `.complior/docs/` and `docs/compliance/`
2. For each found document: extract first 500 chars as excerpt
3. Build `DocumentContent[]` array: `{ docType, path, content }` per the type definition
4. Pass to `buildComplianceReport()` via `ReportBuildInput.documentContents`

**Existing code to reuse:**
- `DocumentContent` type in `reporter/types.ts`
- `buildDocumentInventory()` already knows document paths
- `ALL_DOC_TYPES` from `template-registry.ts`

**Key files:**
- `engine/core/src/domain/reporter/report-builder.ts`
- `engine/core/src/services/report-service.ts`

**Verification:** Unit test in `ux-quality.test.ts` -- T5

---

### T-6: Passport discovery: fix model detection regex

**Problem:** `detectModels()` in `agent-discovery.ts` matches model names in comments,
env var names, and other non-assignment contexts. E.g., `// Using gpt-4o for testing`
produces a false positive.

**What dev must do:** Tighten `MODEL_PATTERNS` regexes to:
1. Require assignment context: `model:`, `model=`, `model_id:`, `new OpenAI({model:`
2. Exclude comment lines: `//`, `#`, `/*`
3. Exclude env var key names (match value side, not key side)
4. Process content line-by-line to enable comment detection

**Existing code to reuse:**
- `MODEL_PATTERNS` in `agent-discovery.ts` (lines 23-30)
- `stripCommentsOnly()` from scanner comment filter (can reuse for preprocessing)

**Key files:**
- `engine/core/src/domain/passport/discovery/agent-discovery.ts`

**Verification:** Unit test in `ux-quality.test.ts` -- T6

---

### T-7: Passport discovery: fix endpoint URL construction

**Problem:** `detectEndpoints()` constructs endpoint URLs by joining port with detected
routes. However, when routes include non-path strings (env var identifiers, arbitrary
tokens), the URL becomes garbage like `http://localhost:3000OPENAI_API_KEY`.

**What dev must do:** In `detectEndpoints()`:
1. Filter routes to only include strings starting with `/`
2. Validate that extracted route matches URL path pattern
3. Skip routes that look like env vars, identifiers, or non-URL strings

**Existing code to reuse:**
- `ROUTE_PATTERN` regex in `agent-discovery.ts` (line 137)
- `detectEndpoints()` function (lines 139-201)

**Key files:**
- `engine/core/src/domain/passport/discovery/agent-discovery.ts`

**Verification:** Unit test in `ux-quality.test.ts` -- T7

---

### T-8: Fix preview includes `projectedScore` (what-if)

**Problem:** `GET /fix/preview` returns fix plans without projected score information.
Users need to know what their score will be after applying each fix to prioritize.

**What dev must do:** In `fix.route.ts`:
1. After getting fix plans from `fixService.previewAll()`, compute projected score
2. Call `simulateActions()` for each fix plan with the current scan state
3. Add `projectedScore` to each fix plan in the response
4. Also add to `POST /fix/preview` single-fix endpoint

**Existing code to reuse:**
- `simulateActions()` in `simulate-actions.ts`
- `getCurrentScore()` on FixService
- `getLastScanResult()` for current findings

**Key files:**
- `engine/core/src/http/routes/fix.route.ts`
- `engine/core/src/domain/whatif/simulate-actions.ts`

**Verification:** Unit test in `ux-quality.test.ts` -- T8

---

## Verification Plan

1. **Unit tests:** `npx vitest run src/e2e/ux-quality.test.ts` -- all GREEN
2. **Regression:** `npx vitest run` -- 2165+ tests still pass
3. **Acceptance script:** `scripts/verify_ux_quality.sh` PASS
4. **Manual smoke test (optional):**
   - `curl localhost:9876/fix/preview?path=...` -> rendered markdown, not `[TEMPLATE:xxx]`
   - `curl localhost:9876/report/status?path=...` -> actionPlan has 5 items with priority
   - `curl localhost:9876/obligations?path=...` -> filtered by project role
   - `curl localhost:9876/scan -d '{"path":"..."}'` -> L4 findings grouped

---

## Task Summary

| # | Task | Agent | Method | Key Files |
|---|------|-------|--------|-----------|
| T-1 | Fix preview renders templates | nodejs-dev | unit test: T1 GREEN | `fix-service.ts`, `fix.route.ts` |
| T-2 | Action plan top-5 with priority | nodejs-dev | unit test: T2 GREEN | `priority-actions.ts`, `reporter-config.json` |
| T-3 | Obligations filter by project config | nodejs-dev | unit test: T3 GREEN | `obligations.route.ts` |
| T-4 | L4 findings grouped by checkId | nodejs-dev | unit test: T4 GREEN | `layer4-patterns.ts` |
| T-5 | Report populates documentContents | nodejs-dev | unit test: T5 GREEN | `report-builder.ts`, `report-service.ts` |
| T-6 | Fix model detection regex | nodejs-dev | unit test: T6 GREEN | `agent-discovery.ts` |
| T-7 | Fix endpoint URL construction | nodejs-dev | unit test: T7 GREEN | `agent-discovery.ts` |
| T-8 | Fix preview includes projectedScore | nodejs-dev | unit test: T8 GREEN | `fix.route.ts`, `simulate-actions.ts` |
