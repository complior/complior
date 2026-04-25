# V1-M24: Final Wiring — v1.0.0 Tag-ready

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M24-final-wiring` (from updated `dev` post-PR #20 merge)
> **Created:** 2026-04-25
> **Author:** Architect
> **Triggered by:** V1-M23 final E2E (51/64 PASS) — 5 wiring gaps remain
> **Predecessor:** V1-M23 wiring fixes (W-3/W-4 done, W-1/W-2 partial)
> **Successor:** V1-M21 final-final re-run → tag v1.0.0

---

## 1. Goal

Закрыть последние 5 wiring gaps выявленные V1-M23 final E2E. После этого — 0 release blockers, tag v1.0.0.

**Critical lesson из V1-M22→V1-M23:** unit tests против mock data могут проходить, пока production rendering path всё ещё битый. V1-M24 RED тесты — **end-to-end через реальный production path** (HTML output генерируется как user видит, не через builder fn в изоляции).

## 2. Scope

**УТОЧНЕНИЕ после анализа реального HTML output:**
- ~~R-3 `$N` placeholders~~ — **FALSE POSITIVE** в E2E grep, ловило `$500,000` в security probes prompt'ах. **Удалено из scope.**

| ID | Issue | Текущее поведение | Ожидаемое | Owner |
|----|-------|-------------------|-----------|-------|
| **R-1** | scan --json missing `disclaimer` | TS engine эмитит disclaimer корректно, но Rust `ScanResult` struct в `cli/src/types/engine.rs:351` НЕ содержит поля — serde молча отбрасывает при десериализации | `complior scan --json \| jq '.disclaimer'` returns object | rust-dev |
| **R-2** | PDF endpoint игнорирует `outputPath` | `PdfReportSchema` в `engine/core/src/http/routes/report.route.ts:5` содержит `organization/jurisdiction/isFree` — **БЕЗ outputPath**. Zod silently strips → service receives `{}` → fallback path | PDF endpoint honors outputPath, файл создаётся точно на запрошенном пути | nodejs-dev |
| **R-4** | HTML Overview без company profile block | `generateReportHtml` в `html-renderer.ts` НЕ рендерит секцию для `report.profile` (даже когда профиль есть) | блок присутствует с role/risk/domain + EU AI Act articles | nodejs-dev |
| **R-5** | HTML embedded doc markdown содержит `[YYYY]/[NNN]` placeholders | scaffold templates для WRK, DGP, etc. содержат `Document ID: WRK-[YYYY]-[NNN]` без подстановки. Эти markdown'ы embed'аются в HTML без фильтрации | scaffold templates рендерятся либо с substituted IDs либо placeholder фильтруется | nodejs-dev |

## 3. Предусловия среды

- [x] PR #20 merged → dev contains V1-M20+M21+M22+M23 work
- [x] eval-target ready
- [ ] V1-M24 RED tests written (этот коммит)
- [ ] `cd engine/core && npm test` — RED тесты красные, build green
- [ ] V1-M21 E2E baseline established (51/64 PASS)

## 4. RED Tests (this commit)

**Architecture principle:** все RED тесты используют **PRODUCTION rendering path** — invoke реальные сервисы с реальными deps, читают сгенерённый файл с диска, проверяют его содержимое. НЕ unit-тесты builder функций.

### R-1: HTTP /scan route surfaces disclaimer
`engine/core/src/http/routes/scan-route-disclaimer.test.ts`:
- POST `/scan` with project path
- Parse JSON response body
- Assert `disclaimer` key present at top level

### R-2: PDF generation honors outputPath
`engine/core/src/services/report-pdf-output-path.test.ts`:
- Call `reportService.generatePdf({ outputPath: '/tmp/m24-test.pdf' })`
- Assert file exists at `/tmp/m24-test.pdf`
- Assert NOT written to `.complior/reports/`

### R-3, R-4, R-5: HTML production output integration test
`engine/core/src/domain/reporter/html-production-output.test.ts`:
- Build full reportData (with profile, documents, etc.)
- Call `generateOfflineHtml(reportData)` — same path user invocation uses
- Assert: 0 `$N` matches, 0 `[YYYY]/[NNN]` matches, profile section present, real doc IDs present

## 5. Tasks Table

| # | Задача | Agent | RED Test | Verification | Architecture |
|---|--------|-------|----------|--------------|--------------|
| R-1 | HTTP /scan route includes disclaimer in response body | nodejs-dev | `scan-route-disclaimer.test.ts` GREEN | `curl -X POST localhost:3099/scan -d '{"path":"/tmp"}' \| jq '.disclaimer'` ≠ null | Route formatter must emit ALL fields from ScanResult; no field stripping |
| R-2 | PDF endpoint honors outputPath option | nodejs-dev | `report-pdf-output-path.test.ts` GREEN | `complior report --format pdf --output /tmp/x.pdf` creates `/tmp/x.pdf` | Mirror md/html pattern; same fallback logic |
| R-3 | HTML production has 0 `$N` placeholders | nodejs-dev | `html-production-output.test.ts::no-placeholders` GREEN | `complior report --format html --output /tmp/x.html && grep -c '\$[0-9]' /tmp/x.html == 0` | Hunt down all `sed`/template variables in real codepath; ensure substitution |
| R-4 | HTML Overview includes company profile block | nodejs-dev | `html-production-output.test.ts::profile-block` GREEN | `complior report --format html --output /tmp/x.html && grep -c 'company-profile' /tmp/x.html ≥ 1` | Add section in real HTML template (not just builder fn) |
| R-5 | HTML substitutes real document IDs | nodejs-dev | `html-production-output.test.ts::real-doc-ids` GREEN | `grep -c '[A-Z]\{3,4\}-20[0-9]\{2\}-[0-9]\{3\}' /tmp/x.html ≥ 1 && grep -c '\[YYYY\]' /tmp/x.html == 0` | Pass generated IDs through to real HTML render path |

## 6. Acceptance Criteria

- [ ] All 3 new RED test files GREEN (~12 tests)
- [ ] V1-M21 E2E re-run: 0 release blockers (all R-* checks GREEN)
- [ ] `complior scan --json | jq '.disclaimer'` returns object
- [ ] `complior report --format pdf --output /tmp/x.pdf` creates file
- [ ] HTML report has 0 `$N` and 0 `[YYYY]`/`[NNN]` placeholders
- [ ] HTML report has company-profile section
- [ ] HTML report shows real doc IDs (TDD-2026-001 format)
- [ ] Full unit suite GREEN: 2536+ tests
- [ ] tsc --noEmit clean
- [ ] cargo clippy --all-targets -D warnings clean

## 7. Out of Scope

- New features
- Test script polish (E2E orchestrator quirks documented as known)
- ISO 42001 reintegration
- SDK / MCP / Guard

## 8. Handoff

После всех R-* GREEN:
- architect Section E: final V1-M21 E2E re-run на eval-target
- Если 0 release blockers → PR `feature/V1-M24-final-wiring` → `dev`
- user merge → tag `v1.0.0` 🚀
- Затем PR `dev` → `main` для release pipeline (build + crates.io + npm publish)
