# Milestone V1-M01: Pipeline Acceptance

> **Status:** ⏳ IN PROGRESS
> **Feature Areas:** FA-01 (Scanner), FA-02 (Eval), FA-03 (Fix), FA-05 (Report)
> **Created:** 2026-04-10
> **Target:** Доказать что полный пайплайн `init → scan → eval → fix → report` работает E2E
> **Blocked by:** None
> **Blocks:** V1-M02, V1-M03

---

## 1. Цель

Код реализован (2701 тест GREEN), но нет **acceptance-уровня доказательств** что пайплайн работает как единое целое. Этот milestone создаёт:

1. Acceptance scripts — bash-скрипты проверяющие CLI команды end-to-end
2. E2E тесты — pipeline-e2e.test.ts (через Hono in-memory)
3. HTML renderer тесты — report-html.test.ts (1000+ строк без покрытия)
4. Fix 4 E2E failures — gaps-e2e.test.ts (среда)

---

## 2. Контекст

### 2.1 Что уже работает (2701 тест)
- Scanner: 5 layers, multi-framework scoring, 600+ тестов
- Eval: deterministic + LLM-judge + security, 300+ тестов
- Fix: 6 strategies, apply + undo, 80+ тестов
- Report: 6-section builder + HTML renderer + per-mode scores
- Passport: 36 fields, 3 modes, evidence chain
- SDK: 14 hooks, 414 тестов (отдельно)

### 2.2 Что НЕ доказано
- CLI `complior scan .` → `complior fix` → `complior report` как pipeline
- Graceful degradation без API key
- `--llm`/`--ai` флаги с OPENROUTER_API_KEY
- HTML export открывается и содержит данные
- Score растёт после fix + rescan

---

## 3. Test Specifications (RED → GREEN)

### 3.1 Acceptance Scripts (Тип 2)

| Script | Описание | Критерий PASS |
|--------|----------|---------------|
| `scripts/verify_pipeline.sh` | init → scan → eval → fix → report (без LLM) | Exit 0, all commands succeed |
| `scripts/verify_pipeline_llm.sh` | Тот же flow с --llm/--ai (OPENROUTER_API_KEY) | Exit 0, LLM results present |
| `scripts/verify_pipeline_no_key.sh` | Pipeline без API key → graceful degradation | Exit 0, no crash, warning messages |
| `scripts/verify_report_export.sh` | report --json, --format markdown, --format html | Exit 0, files created, HTML valid |

### 3.2 E2E Unit Tests (Тип 1)

| Test ID | File | Description | Expected |
|---------|------|-------------|----------|
| `pipeline_scan_produces_score` | pipeline-e2e.test.ts | POST /scan → score 0-100 | `score.totalScore` in 0-100 |
| `pipeline_scan_then_fix_improves_score` | pipeline-e2e.test.ts | scan → fix → rescan → delta > 0 | `newScore > oldScore` |
| `pipeline_report_contains_all_sections` | pipeline-e2e.test.ts | GET /report → 6 sections present | All sections non-empty |
| `pipeline_report_html_valid` | pipeline-e2e.test.ts | GET /report?format=html → valid HTML | Contains `<html>`, sections |
| `pipeline_eval_deterministic` | pipeline-e2e.test.ts | POST /eval (det mode) → results | `testResults.length > 0` |
| `html_renderer_produces_valid_html` | report-html.test.ts | renderHtml(report) → valid HTML | `<!DOCTYPE html>`, 6 sections |
| `html_renderer_score_badge` | report-html.test.ts | Score 75 → green badge | Contains score value + zone |
| `html_renderer_findings_table` | report-html.test.ts | Findings → HTML table rows | `<tr>` per finding |
| `html_renderer_passport_section` | report-html.test.ts | Passport data → section | Passport fields rendered |
| `html_renderer_empty_report` | report-html.test.ts | Empty report → graceful | No crash, shows "no data" |

### 3.3 Fix E2E Failures (Тип 1)

| Test | File | Root Cause | Fix |
|------|------|-----------|-----|
| `generates FRIA and saves` | gaps-e2e.test.ts | No agent initialized in test project | Setup step: init agent before FRIA |
| `FRIA creates evidence` | gaps-e2e.test.ts | Cascade from above | Will fix with setup |
| `passport updated after FRIA` | gaps-e2e.test.ts | AGENT_NAME undefined → bad path | Will fix with setup |
| `passport signature valid` | gaps-e2e.test.ts | Cascade from above | Will fix with setup |

---

## 4. Implementation Tasks

### 4.1 Acceptance Scripts (Агент: architect → dev запускает)

| # | Script | Что проверяет |
|---|--------|---------------|
| 1 | `scripts/verify_pipeline.sh` | Full pipeline: compile → start engine → init → scan → fix → report → stop |
| 2 | `scripts/verify_pipeline_llm.sh` | LLM pipeline: scan --llm → eval --llm → fix --ai → report (needs API key) |
| 3 | `scripts/verify_pipeline_no_key.sh` | No-key pipeline: scan --llm → graceful error, scan (basic) → works |
| 4 | `scripts/verify_report_export.sh` | Report formats: --json → valid JSON, --format markdown → .md, --format html → .html |

### 4.2 E2E Tests (Агент: architect пишет RED, dev делает GREEN)

| # | File | Tests | Агент для GREEN |
|---|------|-------|-----------------|
| 1 | `engine/core/src/e2e/pipeline-e2e.test.ts` | 5 pipeline tests | nodejs-dev |
| 2 | `engine/core/src/domain/reporter/report-html.test.ts` | 5 HTML renderer tests | nodejs-dev |
| 3 | Fix `engine/core/src/e2e/gaps-e2e.test.ts` setup | 4 tests → GREEN | nodejs-dev |

---

## 5. Предусловия среды (architect обеспечивает)

- [x] npm install в engine/core (работает)
- [x] cargo build компилируется (работает)
- [x] npm test запускается — 2088 GREEN + 4 RED (E2E)
- [x] cargo test запускается — 195 GREEN
- [ ] scripts/ directory создан
- [ ] Test project `test-projects/acme-ai-support/` доступен
- [ ] OPENROUTER_API_KEY для LLM-тестов (в .env тестового проекта)

---

## 6. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| `scripts/verify_pipeline.sh` exits 0 | Bash run |
| `scripts/verify_report_export.sh` exits 0 | Bash run |
| pipeline-e2e.test.ts: 5 tests GREEN | `npx vitest run src/e2e/pipeline-e2e.test.ts` |
| report-html.test.ts: 5 tests GREEN | `npx vitest run src/domain/reporter/report-html.test.ts` |
| gaps-e2e.test.ts: 4 failures → GREEN | `npx vitest run src/e2e/gaps-e2e.test.ts` |
| Total tests: 2701+ GREEN, 0 RED | `npx vitest run && cargo test` |

---

## 7. Task Table

| # | Задача | Агент | Метод верификации | Файлы |
|---|--------|-------|-------------------|-------|
| 1 | Acceptance script: pipeline | architect | scripts/verify_pipeline.sh PASS | scripts/verify_pipeline.sh |
| 2 | Acceptance script: LLM pipeline | architect | scripts/verify_pipeline_llm.sh PASS | scripts/verify_pipeline_llm.sh |
| 3 | Acceptance script: no-key | architect | scripts/verify_pipeline_no_key.sh PASS | scripts/verify_pipeline_no_key.sh |
| 4 | Acceptance script: report export | architect | scripts/verify_report_export.sh PASS | scripts/verify_report_export.sh |
| 5 | E2E: pipeline tests | nodejs-dev | pipeline-e2e.test.ts GREEN | engine/core/src/e2e/pipeline-e2e.test.ts |
| 6 | E2E: HTML renderer tests | nodejs-dev | report-html.test.ts GREEN | engine/core/src/domain/reporter/report-html.test.ts |
| 7 | Fix gaps-e2e.test.ts setup | nodejs-dev | 4 tests GREEN | engine/core/src/e2e/gaps-e2e.test.ts |

---

## 8. Dependencies

- **Blocked by:** None (first v1 milestone)
- **Blocks:** V1-M02 (Passport & Score), V1-M03 (Release)
