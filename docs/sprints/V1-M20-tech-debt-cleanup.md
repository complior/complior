# V1-M20: Tech Debt Cleanup

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M20-M21-roadmap-cleanup`
> **Created:** 2026-04-24
> **Author:** Architect
> **Predecessor:** V1-M19 Fix Profile Filter (DONE on dev)
> **Successor:** V1-M21 Deep E2E Manual Testing → release v1.0.0

---

## 1. Goal

Закрыть весь актуальный tech debt из `docs/tech-debt.md` который имеет SHIP-impact на v1.0.0 release. Цель: чистая дев-ветка, никаких 🔴 OPEN tech-debt-записей с реальными side-эффектами на код.

## 2. Scope

| TD | Severity | Что фиксим | Тип задачи |
|----|----------|------------|------------|
| TD-44 | MEDIUM | Double `as unknown as` cast в `getSecurityProbes()` | Тип 1 (TS unit test) |
| TD-31 | LOW | 2 skipped passport-schemas тестов — стабилизировать через repo fixtures | Тип 1 (TS unit test) |
| TD-35 | LOW | 3x `TODO(T10) dead_code` markers — реализовать responsive widgets ИЛИ удалить | Тип 1 (Rust unit test) |
| TD-40 | LOW | Completions acceptance flaky в полном pipeline скрипте | Тип 2 (acceptance script) |
| TD-41 | LOW | `eval --det` grep `\d+ passed` fallback когда target пуст | Тип 2 (acceptance script) |

**НЕ в scope V1-M20 (явные исключения):**
- TD-30, TD-34 — Phase 2 by design
- TD-32 — просто переименование stale milestone файла (architect сделает в постмерж)
- TD-33 — by design, redteam = eval --security alias
- TD-36 — `PRODUCT-VISION.md` принадлежит user'у; диff будет предложен отдельным комментарием
- TD-37 — milestone files knowledge gap; будет восстановлено в постмерж
- TD-38 — verified GREEN (test `format_human_quiet_compact`); real-world re-verify в V1-M21
- TD-42, TD-43 — process violations, не код

## 3. Предусловия среды

- [ ] `cd engine/core && npm test` — RED тесты (TD-44, TD-31) красные, build green
- [ ] `cargo test -p complior-cli` — RED тесты (TD-35) красные, build green
- [ ] `bash scripts/verify_completions_isolated.sh` — FAIL (нет реализации)
- [ ] `bash scripts/verify_eval_det_grep.sh` — FAIL (нет реализации)

## 4. RED Tests Written

| Test | File | TD |
|------|------|----|
| `eval-service > getSecurityProbes returns SecurityProbe[] without double cast` | `engine/core/src/services/eval-service-no-unsafe-cast.test.ts` | TD-44 |
| `passport-schemas > validates fixtures from repo (not env-dependent)` | `engine/core/src/types/passport-schemas-fixtures.test.ts` | TD-31 |
| `app, layout, suggestions > no `dead_code` markers tagged TODO(T10)` | `cli/src/headless/tests.rs` (`no_dead_code_markers`) | TD-35 |
| Acceptance: completions test passes in isolation AND in full pipeline | `scripts/verify_completions_isolated.sh` | TD-40 |
| Acceptance: `eval --det` succeeds even when target returns N/A only | `scripts/verify_eval_det_grep.sh` | TD-41 |

## 5. Tasks

| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|--------|-------|-------------------|--------------------------|-------|
| T-1 | Добавить `SecurityProbe` поддержку в `filterTestsByProfile` ИЛИ создать `filterSecurityProbesByProfile`. Убрать `as unknown as` касты | nodejs-dev | unit: `eval-service-no-unsafe-cast.test.ts` GREEN + `tsc --noEmit` clean | Pure fn, без `unknown` cast, типы выровнены, Object.freeze результата | `engine/core/src/services/eval-service.ts`, `engine/core/src/domain/eval/eval-profile-filter.ts` |
| T-2 | Сохранить 2 fixture-passport JSON в `engine/core/data/fixtures/` и переключить тест на них (убрать `describe.skipIf`) | nodejs-dev | unit: `passport-schemas-fixtures.test.ts` GREEN, тесты не skipped | Fixtures под контролем git, путь через `import.meta.url`, не зависят от `process.env` | `engine/core/data/fixtures/passport-*.json`, `engine/core/src/types/passport-schemas.test.ts` |
| T-3 | Реализовать responsive widget selection (использовать `available_layouts` в `app::frame_layout`, `suggestions::should_show`, layout::responsive) ИЛИ удалить мёртвые поля и допущение `dead_code` | rust-dev | unit: `no_dead_code_markers` GREEN, `cargo clippy -- -D warnings` clean | Никаких `#[allow(dead_code)] // TODO(T10)` маркеров, exhaustive enum match | `cli/src/components/suggestions.rs`, `cli/src/layout.rs`, `cli/src/app/mod.rs` |
| T-4 | Изолировать completions тест (kill engine процесс перед началом, дождаться stop) | rust-dev | acceptance: `verify_completions_isolated.sh` PASS в clean env И после прогонки `verify_v1_pipeline_full.sh` | bash strict mode (`set -euo pipefail`), `trap` cleanup на EXIT | `scripts/verify_v1_pipeline_full.sh`, `scripts/verify_completions_isolated.sh` |
| T-5 | Добавить fallback в `verify_e2e_bugfix.sh` B-01: если `\d+ passed` нет, но `eval --det` exit-0 + summary present → PASS | rust-dev | acceptance: `verify_eval_det_grep.sh` PASS на пустом target | bash idempotent, no false positives на реальных failures | `scripts/verify_e2e_bugfix.sh`, `scripts/verify_eval_det_grep.sh` |

## 6. Acceptance Criteria

- [ ] Все 5 RED тестов GREEN
- [ ] `cargo test -p complior-cli` — 0 failures, 0 ignored из этого скоупа
- [ ] `npx vitest run` (engine/core) — 0 skipped из passport-schemas
- [ ] `cargo clippy --all-targets -- -D warnings` — clean
- [ ] `tsc --noEmit` — clean
- [ ] `tech-debt.md`: TD-31, TD-35, TD-40, TD-41, TD-44 → `✅ FIXED`
- [ ] Никаких `as unknown as` в `engine/core/src/services/eval-service.ts`
- [ ] Никаких `// TODO(T10)` маркеров в `cli/src/`

## 7. Out of Scope

- Удаление `M01-scanner-eval-core.md` (postmerge cleanup)
- Восстановление M01..M15 milestone files (postmerge index)
- Любые изменения в `PRODUCT-VISION.md` (только user)

## 8. Handoff

После GREEN — переход к **V1-M21 Deep E2E Manual Testing** (real-world verification на pre-release ветке `dev`).
