# Milestone V1-M03: Documentation & Release Polish

> **Status:** ⏳ PLANNED
> **Feature Areas:** All (FA-01 through FA-08)
> **Created:** 2026-04-10
> **Target:** Синхронизировать документацию с реальностью, подготовить v1.0 release
> **Blocked by:** V1-M01, V1-M02
> **Blocks:** v1.0 Release

---

## 1. Цель

Код работает, тесты доказывают это. Осталось:
1. **Обновить project-state.md** — отразить реальный статус (2700+ тестов, все фичи реализованы)
2. **Обновить STRATEGY.md** — отметить реализованные фичи ✅ DONE
3. **Закрыть milestones** — M01-M04 → DONE, V1-M01/M02 → DONE
4. **CI verification** — все тесты проходят в CI
5. **Version bump** — 0.9.x → 1.0.0
6. **Архитектурный аудит** — проверить нет ли дублирования кода, нарушения правил
7. **Test-runner enhancement** — настройка для Complior-специфичного тестирования

---

## 2. Задачи

### 2.1 Документация (Агент: architect)

| # | Задача | Описание |
|---|--------|----------|
| 1 | Обновить `project-state.md` | Реальный статус: 2701+ тестов, все фичи, текущие scores |
| 2 | Обновить `STRATEGY.md` | Отметить реализованные фичи ✅ DONE в таблицах |
| 3 | Обновить M01 milestone | Статус → ВЫПОЛНЕН (код реализован до milestone) |
| 4 | Обновить Feature Areas если архитектура изменилась | Проверить FA-05 (Report), FA-01 (Scanner) |
| 5 | Обновить `CLAUDE.md` | Test counts, version, current status |

### 2.2 CI Verification (Агент: test-runner)

| # | Script | Описание |
|---|--------|----------|
| 1 | `scripts/verify_ci.sh` | cargo test + vitest + clippy + tsc → all pass |
| 2 | `scripts/verify_self_scan.sh` | `complior scan .` на самом Complior → score > 0 |
| 3 | `scripts/test_complior.sh` | Unified test runner: TS + Rust + SDK → summary table |

### 2.3 Architecture Audit (Агент: architect)

| # | Проверка | Описание |
|---|----------|----------|
| 1 | Code duplication | grep для повторяющихся паттернов в engine/ и cli/ |
| 2 | Coding standards | Проверить naming conventions, error handling |
| 3 | Data externalization | Нет ли hardcoded data в .ts/.rs файлах |
| 4 | Import cycles | Нет циклических зависимостей |
| 5 | HTML renderer quality | 1056+ строк — нужен ли рефакторинг? |

### 2.4 Test-Runner Enhancement (Агент: architect)

| # | Задача | Описание |
|---|--------|----------|
| 1 | Создать `.claude/agents/test-runner.md` (если нет) | Специализация под Complior |
| 2 | Acceptance script runner | Запуск всех scripts/verify_*.sh с отчётом |
| 3 | Contract drift detection | Автоматическая проверка Rust↔TS типов |
| 4 | Performance baseline | scan 500 files < 30s |

### 2.5 Release (Агент: user + architect)

| # | Задача | Описание |
|---|--------|----------|
| 1 | Commit все uncommitted changes | Clean working tree |
| 2 | Merge feature/reporter → main | PR с описанием |
| 3 | Version bump → 1.0.0 | Cargo.toml + package.json |
| 4 | Release notes | Changelog для v1.0 |

---

## 3. Test Specifications (RED → GREEN)

### 3.1 Acceptance Scripts

| Script | Описание | Критерий PASS |
|--------|----------|---------------|
| `scripts/verify_ci.sh` | Full CI: build + test + lint | Exit 0 |
| `scripts/verify_self_scan.sh` | Complior scans itself | Score > 0, no crash |
| `scripts/test_complior.sh` | All 3 test suites | Summary table, 0 failures |

### 3.2 Architecture Tests

| Test ID | File | Description | Expected |
|---------|------|-------------|----------|
| `no_hardcoded_data_in_ts` | architecture-audit.test.ts | No magic numbers in domain/ | Zero violations |
| `no_import_cycles` | architecture-audit.test.ts | No circular imports | Zero cycles |
| `version_matches_across_crates` | version.test.ts | Engine + CLI version = same | Versions match |

---

## 4. Task Table

| # | Задача | Агент | Метод верификации | Файлы |
|---|--------|-------|-------------------|-------|
| 1 | Update project-state.md | reviewer | Manual review | docs/project-state.md |
| 2 | Update STRATEGY.md | architect | Features marked ✅ | docs/STRATEGY.md |
| 3 | CI verification script | architect | scripts/verify_ci.sh PASS | scripts/verify_ci.sh |
| 4 | Self-scan script | architect | scripts/verify_self_scan.sh PASS | scripts/verify_self_scan.sh |
| 5 | Architecture audit | architect | No violations found | Report |
| 6 | Test-runner enhancement | architect | scripts/test_complior.sh PASS | scripts/test_complior.sh |
| 7 | Commit + PR | user | PR merged to main | — |
| 8 | Version bump 1.0.0 | user + dev | Version = 1.0.0 | Cargo.toml, package.json |

---

## 5. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| project-state.md reflects reality | Manual review |
| STRATEGY.md has ✅ on implemented features | Manual review |
| scripts/verify_ci.sh PASS | bash |
| scripts/verify_self_scan.sh PASS | bash |
| All tests GREEN (TS + Rust + SDK) | vitest + cargo test |
| PR merged to main | GitHub |
| Version = 1.0.0 | `complior --version` |

---

## 6. Dependencies

- **Blocked by:** V1-M01 (pipeline), V1-M02 (integration)
- **Blocks:** v1.0 Release, future milestones
