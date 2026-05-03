# V1-M21: Deep E2E Manual Testing — Pre-v1.0.0 Release

> **Status:** 🔵 PLANNED — starts after V1-M20 GREEN
> **Branch:** `feature/V1-M20-M21-roadmap-cleanup` (same as V1-M20)
> **Created:** 2026-04-24
> **Author:** Architect
> **Predecessor:** V1-M20 Tech Debt Cleanup
> **Successor:** Release v1.0.0 (tag) → V2-M01 SDK enrichment

---

## 1. Goal

Глубокое ручное E2E-тестирование всего, что было создано на ветке `dev`, в реальных условиях:
- `tmux` сессия с daemon + watcher
- `OPENROUTER_API_KEY` подключён (LLM-judged тесты + scan --llm + eval --llm + fix --ai)
- Тестовый проект из `~/test-projects/acme-ai-support/`
- Полный pipeline: scan (все флаги) → eval (все флаги) → fix → score → passport → report (все 5 форматов)

**Выходной артефакт:** `docs/E2E-DEEP-TEST-REPORT-2026-04-24.md` — отчёт architect'а с findings, regression-list, рекомендациями для финальной полировки.

## 2. Motivation

После V1-M19 на dev накопилось 6 milestones (C-M03, C-M04, V1-M12, V1-M12.1, V1-M18, V1-M19) с 3968 LOC новых изменений. Unit-тесты GREEN, но real-world поведение не верифицировано:
- HTML-отчёт (визуальное качество)
- Score consistency на реальных проектах с разными профилями
- Passport flows (init → completeness → fria → evidence → audit)
- `scan --llm` и `eval --llm` с настоящим OpenRouter ключом
- `fix --ai` на реальных fail findings
- `--quiet` mode на реальном проекте (TD-38 real-world re-verify)

Без этого этапа нельзя tag v1.0.0.

## 3. Предусловия среды

**Architect обеспечивает:**
- [x] `~/test-projects/acme-ai-support/` существует
- [x] `cli/target/release/complior` собран (`cargo build -p complior-cli --release`)
- [x] `engine/core/` зависимости установлены (`npm install`)
- [x] `scripts/verify_v1_deep_e2e.sh` создан и исполнимый

**User обеспечивает:**
- [ ] `OPENROUTER_API_KEY` в `~/.config/complior/settings.toml` или `.env`
- [ ] Свободный порт `4000` (engine HTTP API)
- [ ] `tmux` установлен
- [ ] `xdg-open` или другой способ открыть HTML в браузере для визуальной оценки

## 4. Pipeline (исполняется через `verify_v1_deep_e2e.sh`)

### 4.1 Bootstrap — `tmux` session + daemon

```
tmux new-session -d -s complior-e2e
tmux send-keys -t complior-e2e 'cd ~/test-projects/acme-ai-support && complior daemon start --watch' Enter
sleep 5
curl http://localhost:4000/health   # → 200 OK
```

### 4.2 Onboarding (V1-M09 Onboarding Enrichment)

```
complior init --yes
# Verify: .complior/project.toml created with role/risk/domain/9-question answers
# Verify: dynamic obligation list reflects profile
```

### 4.3 Scan — все флаги (V1-M01..V1-M18)

| # | Команда | Что проверяется |
|---|---------|-----------------|
| S-1 | `complior scan` | default L1-L4, human format |
| S-2 | `complior scan --json` | valid JSON, parseable |
| S-3 | `complior scan --sarif` | valid SARIF 2.1.0 schema |
| S-4 | `complior scan --ci --threshold 70 --fail-on critical` | exit code ≥ 1 если есть critical |
| S-5 | `complior scan --diff main` | diff vs main branch, regression detection |
| S-6 | `complior scan --comment` | github-comment markdown output |
| S-7 | `complior scan --deep` | + Semgrep/Bandit (auto-download via uv) |
| S-8 | `complior scan --llm` | + L5 LLM analysis (требует OPENROUTER_API_KEY) |
| S-9 | `complior scan --quiet` | **TD-38 re-verify**: ≤5 lines + critical findings |
| S-10 | `complior scan --agent acme-bot` | per-agent scoping (V1-M08) |
| S-11 | Industry domain filter (V1-M18) | findings filtered by `domain` from profile |

### 4.4 Eval — все флаги (V1-M02 + V1-M12 + V1-M12.1)

> **Eval target — оба варианта** (per user spec):
> - **Mock target:** `node test-projects/eval-target/server.js` на `localhost:8080`
> - **Real target:** `https://api.openai.com/v1` (OpenAI с user'овским ключом)

| # | Команда | Что проверяется |
|---|---------|-----------------|
| E-1 | `complior eval <mock> --det` | 168 deterministic tests, no LLM |
| E-2 | `complior eval <mock> --det --llm` | 168 + 212 = 380 conformity, judge LLM |
| E-3 | `complior eval <mock> --security` | 300 security probes (OWASP/MITRE) |
| E-4 | `complior eval <mock> --full` | All 680+ tests |
| E-5 | `complior eval <mock> --ci --threshold 60` | exit code gating |
| E-6 | `complior eval <mock> --categories Art5,Art10` | category filter |
| E-7 | `complior eval <mock> --last --failures` | re-run last failures only |
| E-8 | `complior eval <mock> --remediation --fix` | apply remediation |
| E-9 | `complior eval <mock> --dry-run` | no actual HTTP calls |
| E-10 | `complior eval <mock> --concurrency 10` | parallel execution |
| E-11 | `complior eval <mock> --agent acme-bot` | per-agent eval |
| E-12 | **Pre-filter verify (V1-M12.1)** | provider-only test on deployer profile → SKIPPED before HTTP |
| E-13 | `complior eval <real-openai> --security` | smoke test against real LLM |

### 4.5 Fix — все флаги (V1-M19)

| # | Команда | Что проверяется |
|---|---------|-----------------|
| F-1 | `complior fix --dry-run` | preview, no file mutations |
| F-2 | `complior fix --json` | structured plan output |
| F-3 | `complior fix --ai` | LLM-assisted fix (требует key) |
| F-4 | `complior fix --source scan` | only scan findings |
| F-5 | `complior fix --source eval` | only eval findings |
| F-6 | `complior fix --source all` | combined |
| F-7 | `complior fix --check-id L1-A001` | single finding |
| F-8 | `complior fix --doc fria` | FRIA generation |
| F-9 | `complior fix --doc soa` | SoA generation (V1-M07) |
| F-10 | `complior fix --doc risk-register` | Risk Register (V1-M07) |
| F-11 | `complior fix --doc all` | all 7 docs |
| F-12 | **Profile filter verify (V1-M19)** | skip findings → no fix plans for them |

### 4.6 Score — consistency (V1-M10)

- [ ] Compliance score = framework bar (M10 invariant)
- [ ] Severity weights: critical=4x, high=2x, medium=1x, low=0.5x
- [ ] Disclaimer present in JSON + human output
- [ ] Category breakdown sums to total

### 4.7 Passport — full flow (V1-M11, V1-M13)

| # | Команда | Что проверяется |
|---|---------|-----------------|
| P-1 | `complior passport init acme-bot` | manifest created + ed25519 signed |
| P-2 | `complior passport list` | shows acme-bot |
| P-3 | `complior passport show acme-bot` | 36 fields readable |
| P-4 | `complior passport validate acme-bot` | signature valid |
| P-5 | `complior passport completeness acme-bot` | % shown, color-coded |
| P-6 | `complior passport autonomy acme-bot` | L1-L5 rated |
| P-7 | `complior passport notify` | worker notification template |
| P-8 | `complior passport registry` | full registry view |
| P-9 | `complior passport permissions acme-bot` | tools allowlist/denylist |
| P-10 | `complior passport evidence` | hash chain + ed25519 verify |
| P-11 | `complior passport audit` | audit trail |
| P-12 | `complior passport export --format aiuc1` | AIUC-1 export |
| P-13 | `complior passport import` | round-trip test |

### 4.8 Report — все 5 форматов

| # | Команда | Что проверяется |
|---|---------|-----------------|
| R-1 | `complior report --format human` | TUI-style readable output |
| R-2 | `complior report --format json` | parseable JSON |
| R-3 | `complior report --format md` | valid markdown |
| R-4 | `complior report --format html --output /tmp/reports/v1-m21-report.html` | **HTML — user открывает в браузере, оценивает визуально** |
| R-5 | `complior report --format pdf --output /tmp/reports/v1-m21-report.pdf` | PDF generates |
| R-6 | `complior report --share` | shareable link/output |

## 5. Tasks

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|--------|-------|-------------------|--------------------------|-------|
| T-1 | Реализовать `verify_v1_deep_e2e.sh` (orchestration) | architect | acceptance: PASS на dev | bash strict mode, modular sections, color-coded output, summary table | `scripts/verify_v1_deep_e2e.sh` |
| T-2 | Запустить ВСЁ из §4 на чистой `~/test-projects/acme-ai-support/` копии | architect (manual) | manual checklist в отчёте | Каждая секция = пометка PASS/FAIL/REGRESSION в отчёте | `docs/E2E-DEEP-TEST-REPORT-2026-04-24.md` |
| T-3 | Открыть HTML отчёт (R-4) в браузере, ручная оценка | user | визуальная инспекция → feedback в отчёт architect'а | — | `/tmp/reports/v1-m21-report.html` |
| T-4 | Записать findings + рекомендации | architect | отчёт `E2E-DEEP-TEST-REPORT` опубликован | Структура: Bug list, Regression list, UX issues, Recommendations, Release blockers | `docs/E2E-DEEP-TEST-REPORT-2026-04-24.md` |

## 6. Acceptance Criteria

- [ ] `bash scripts/verify_v1_deep_e2e.sh` PASS (или явно задокументированы expected fails из секций требующих manual)
- [ ] `docs/E2E-DEEP-TEST-REPORT-2026-04-24.md` написан со структурой:
  - Summary table (sections × PASS/FAIL/SKIP)
  - Bug list (с repro steps + severity)
  - Regression list (что сломалось vs prior version)
  - UX issues (что неудобно, но работает)
  - **HTML report visual feedback** (от user'а)
  - Recommendations (что доработать перед v1.0.0)
  - **Release blockers** (если есть — нельзя релизить)
- [ ] User получил HTML на руки (`/tmp/reports/v1-m21-report.html`) и оставил visual feedback
- [ ] Если **0 release blockers** → v1.0.0 ready to tag

## 7. Out of Scope

- Любая правка кода (architect только тестирует и пишет отчёт)
- Bugfixes для найденных issues — будут отдельные follow-up milestones (V1-M22+)
- SDK / MCP / Guard — отдельный трек (V2-M01..M03)

## 8. Handoff

После публикации отчёта:
- Если нет blocker'ов → user мержит PR `feature/V1-M20-M21-roadmap-cleanup` → `dev` → `main`, tag `v1.0.0`
- Если есть blocker'ы → architect создаёт V1-M22 для каждого, dev фиксит, повторный E2E
