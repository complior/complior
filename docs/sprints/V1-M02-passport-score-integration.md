# Milestone V1-M02: Passport & Score Integration

> **Status:** ⏳ PLANNED
> **Feature Areas:** FA-04 (Passport), FA-01 (Scanner), FA-03 (Fix)
> **Created:** 2026-04-10
> **Target:** Доказать что паспорта, скоры и фиксы корректно взаимодействуют
> **Blocked by:** V1-M01
> **Blocks:** V1-M03

---

## 1. Цель

Доказать полную интеграцию:
1. **Passport → Score**: passport completeness влияет на compliance score
2. **Fix → Rescan → Score**: после fix score увеличивается, passport обновляется
3. **Manual Edit → Score**: ручное редактирование scaffold docs → score растёт
4. **SDK Detection**: bare LLM call → finding, wrapped call → no finding
5. **FRIA → Passport**: fria_completed: true, score обновляется
6. **Contract Sync**: Rust↔TS типы для report синхронизированы

---

## 2. Контекст

### 2.1 Тестовый сценарий (из описания пользователя)

Полный flow на eval-target:
```
1. complior init → создаёт паспорт
2. complior scan → findings + score (низкий, нет документов)
3. Вручную отредактировать scaffold docs
4. complior scan → score вырос (L2 документы обнаружены)
5. complior fix → автофиксы применены
6. complior scan → score ещё вырос
7. complior eval --target → eval score
8. complior report → финальный отчёт со всеми данными
```

На каждом шаге проверяем:
- Паспорт обновился? (passport completeness, scores)
- Finding формат правильный? (checkId, severity, message, article)
- Скор растёт после каждого улучшения?
- SDK wrapper detection: рекомендации для bare LLM calls?

### 2.2 Что проверяем с API ключом и без

| Команда | С OPENROUTER_API_KEY | Без ключа |
|---------|---------------------|-----------|
| `scan` | L1-L4 work, L5 available | L1-L4 work, L5 skipped with warning |
| `scan --llm` | L5 deep analysis runs | Error: "API key required for --llm" |
| `eval --target` | Deterministic works | Deterministic works |
| `eval --llm` | LLM-judge runs | Error: "API key required for --llm" |
| `fix` | Deterministic fixes | Deterministic fixes |
| `fix --ai` | LLM-assisted fix | Error: "API key required for --ai" |

---

## 3. Test Specifications (RED → GREEN)

### 3.1 E2E Tests (Тип 1)

| Test ID | File | Description | Expected |
|---------|------|-------------|----------|
| `passport_init_creates_manifest` | passport-pipeline-e2e.test.ts | POST /agent/init → manifest.json created | File exists, 36 fields |
| `passport_completeness_affects_score` | passport-pipeline-e2e.test.ts | Scan with passport vs without → score differs | With passport: higher score |
| `scan_fix_rescan_score_improves` | score-integration-e2e.test.ts | scan → fix → rescan → score delta > 0 | newScore > oldScore |
| `manual_doc_edit_improves_score` | score-integration-e2e.test.ts | Write real doc content → rescan → L2 findings improve | Fewer L2 fail findings |
| `sdk_bare_call_detected` | score-integration-e2e.test.ts | Bare `new OpenAI()` → finding with fix recommendation | Finding with fixAvailable: true |
| `sdk_wrapped_call_no_finding` | score-integration-e2e.test.ts | `complior(openai)` → no SDK finding | No bare-llm findings |
| `fria_updates_passport` | passport-pipeline-e2e.test.ts | POST /agent/fria → passport.fria_completed: true | Field updated |
| `fria_evidence_recorded` | passport-pipeline-e2e.test.ts | After FRIA → evidence chain has fria entry | Evidence count increased |

### 3.2 Acceptance Scripts (Тип 2)

| Script | Описание | Критерий PASS |
|--------|----------|---------------|
| `scripts/verify_score_growth.sh` | init → scan → fix → scan → verify score > original | Score delta > 0 |
| `scripts/verify_manual_edit_score.sh` | scan → edit doc → rescan → score improved | Score delta > 0 |
| `scripts/verify_fria_flow.sh` | agent init → agent fria → verify fria_completed | passport.fria_completed = true |
| `scripts/verify_api_key_handling.sh` | Test with key and without → correct behavior | No crashes, correct warnings |

### 3.3 Contract Tests (Тип 1)

| Test ID | File | Description | Expected |
|---------|------|-------------|----------|
| `sync_report_types_match` | sync-contract.test.ts | Report TS type matches Rust struct | Roundtrip serialize/deserialize |
| `sync_scan_result_complete` | sync-contract.test.ts | ScanResult TS → Rust → TS roundtrip | All fields preserved |

---

## 4. Implementation Tasks

| # | Задача | Агент | Метод верификации | Файлы |
|---|--------|-------|-------------------|-------|
| 1 | E2E: passport pipeline tests (4 тесты) | nodejs-dev | passport-pipeline-e2e.test.ts GREEN | engine/core/src/e2e/passport-pipeline-e2e.test.ts |
| 2 | E2E: score integration tests (4 тесты) | nodejs-dev | score-integration-e2e.test.ts GREEN | engine/core/src/e2e/score-integration-e2e.test.ts |
| 3 | Acceptance: score growth verification | architect+dev | scripts/verify_score_growth.sh PASS | scripts/verify_score_growth.sh |
| 4 | Acceptance: manual edit score | architect+dev | scripts/verify_manual_edit_score.sh PASS | scripts/verify_manual_edit_score.sh |
| 5 | Acceptance: FRIA flow | architect+dev | scripts/verify_fria_flow.sh PASS | scripts/verify_fria_flow.sh |
| 6 | Acceptance: API key handling | architect+dev | scripts/verify_api_key_handling.sh PASS | scripts/verify_api_key_handling.sh |
| 7 | Contract: report types Rust↔TS sync | rust-dev + ts-dev | sync-contract.test.ts GREEN | engine/core/src/types/sync-contract.test.ts |

---

## 5. Предусловия среды

- [ ] V1-M01 DONE (pipeline acceptance scripts pass)
- [ ] Test project `test-projects/acme-ai-support/` with agent initialized
- [ ] OPENROUTER_API_KEY in test project .env
- [ ] Scaffold documents present for manual edit test

---

## 6. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| passport-pipeline-e2e.test.ts: 4 tests GREEN | vitest |
| score-integration-e2e.test.ts: 4 tests GREEN | vitest |
| scripts/verify_score_growth.sh PASS | bash |
| scripts/verify_api_key_handling.sh PASS | bash |
| Total tests: 2710+ GREEN, 0 RED | vitest + cargo test |
