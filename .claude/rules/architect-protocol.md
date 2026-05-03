---
description: Architect scan protocol, milestone creation rules, and knowledge that MUST survive context compaction
globs: ["docs/**/*.md", "tests/**/*.{ts,js}", "engine/**/*.ts", "cli/**/*.rs", "scripts/**"]
---

# Architect Protocol — ОБЯЗАТЕЛЬНЫЙ при каждом планировании

Этот файл существует чтобы критические знания architect'а не терялись
при компакции контекста. Rules перезагружаются по glob — agent.md нет.

---

## ФАЗА 1: SCAN (понять текущее состояние)

### 1.1 — Tech-debt ПЕРВЫМ ДЕЛОМ
```bash
cat docs/tech-debt.md
```
- Найди 🔴 OPEN где "Тест на fix" пустая или "architect напишет"
- Для КАЖДОЙ — напиши падающий тест
- Обнови tech-debt.md: колонку "Тест на fix" → имя написанного теста
- Коммитни тесты
- ТОЛЬКО ПОСЛЕ ЭТОГО — milestone работа

Без тестов dev-агенты НЕ МОГУТ фиксить долг. Ты — бутылочное горлышко.

### 1.2 — Стратегия и vision
```bash
cat docs/PRODUCT-VISION.md    # ЧТО строим, ЗАЧЕМ
cat docs/STRATEGY.md          # КАКИЕ фичи, В КАКОМ порядке, фазы
```
Определи следующую задачу из текущей фазы Strategy.

### 1.3 — Текущее состояние
```bash
git log --oneline -10
cat docs/project-state.md     # что реализовано, что stub
ls docs/sprints/
grep -l "ВЫПОЛНЕН\|DONE\|COMPLETED" docs/sprints/*.md
```

### 1.4 — Feature Area подсистемы
```bash
ls docs/feature-areas/
cat docs/feature-areas/[relevant]-architecture.md
```
Feature Area = промежуточный слой между Strategy и Milestone.
Прочитай cross-dependencies и test coverage ПЕРЕД планированием.
НЕ создавай milestone пока не поймёшь подсистему глубоко.

### 1.5 — Типы и интерфейсы
```bash
cat engine/core/src/types/common.types.ts     # shared типы
cat engine/core/src/types/passport.types.ts   # passport контракт
cat engine/core/src/types/common.schemas.ts   # Zod schemas
ls engine/core/src/interfaces/                # контракты компонентов
```
Тесты ДОЛЖНЫ использовать РЕАЛЬНЫЕ типы.
Предполагаемые типы → тест не скомпилируется → спринт сломан.

### 1.6 — Что реализовано vs заглушки
```bash
grep -rn "STUB\|TODO\|FIXME\|not implemented\|throw new Error" engine/core/src/ cli/src/
```

### 1.7 — Существующие тесты (НЕ дублировать!)
```bash
grep -rn "describe\|it(\|test(" engine/core/src/ --include="*.test.ts" | head -30
grep -rn "#\[test\]" cli/src/ | head -20
```

---

## ФАЗА 2: PLAN (создать milestone)

### 2.1 — Определи задачу из Strategy
Milestone должен соответствовать текущей фазе.
- Нет Strategy → СТОП, спроси user'а
- Milestone не соответствует фазе → не создавай

### 2.2 — Создай milestone файл
```
docs/sprints/M0X-name.md
```
С задачами для каждого агента, зависимостями, предусловиями среды.

### 2.3 — Определи тип КАЖДОЙ задачи

**Тип 1 (логика):** unit test RED → GREEN
- vitest для TypeScript: engine/core/src/**/*.test.ts
- cargo test для Rust: cli/src/**/*.rs (#[test])

**Тип 2 (интеграция/инфраструктура):** acceptance script FAIL → PASS
- Напиши скрипт в scripts/verify_*.sh
- Примеры: build pipeline, docker compose, daemon health check

**Тип 3 (E2E с LLM):** eval/scan на реальной системе
- Требует OPENROUTER_API_KEY (judge model для eval)
- Требует target AI system (URL endpoint для eval)
- Тест: engine/core/src/e2e/*.test.ts или
  `complior eval <url> --full --ci --threshold N`

Если задача требует несколько типов — напиши ВСЕ спецификации.

### 2.4 — Обязательная таблица в конце milestone
```markdown
| # | Задача | Агент | Метод верификации | Архитектурные требования | Файлы |
|---|---|---|---|---|---|
| 1 | ... | rust-dev | unit test: TestX GREEN | Result<T,E>, no unwrap, exhaustive match | cli/... |
| 2 | ... | nodejs-dev | acceptance: scripts/verify_Y.sh | Factory fn, Object.freeze, pure fn | engine/... |
| 3 | ... | nodejs-dev | E2E: eval --threshold 70 PASS | DI via deps, data from JSON | engine/core/src/e2e/ |
```
Без таблицы user не знает кого запускать и что проверять.
Колонка "Архитектурные требования" — ключевая: dev видит ожидания по стилю ДО кода.

---

## ФАЗА 3: CONTRACTS (контрактный слой)

Единый источник правды: **engine/core/src/types/**

### 3.1 — Типы + Zod schemas
- Обновляй/создавай в engine/core/src/types/*.ts
- Каждый тип должен иметь парный Zod schema (*.schemas.ts)
- contract.test.ts проверяет что типы соответствуют JSON schema

### 3.2 — Интерфейсы компонентов
- engine/core/src/interfaces/*.ts — контракты сервисов и адаптеров

### 3.3 — Cross-language зеркало (Rust CLI)
- Если тип нужен в Rust CLI → зеркали в cli/src/types/engine.rs
- serde(rename_all = "camelCase") для совместимости с TS JSON
- Добавь десериализационный тест

---

## ФАЗА 4: SPECS (спецификации — ТЗ для dev'ов)

### 4.1 — RED unit тесты (Тип 1)
- TypeScript: engine/core/src/**/*.test.ts (vitest)
- Rust: cli/src/**/*.rs (#[test], cargo test)
- Используй РЕАЛЬНЫЕ типы из Phase 3

### 4.2 — Acceptance scripts (Тип 2)
- scripts/verify_*.sh — bash скрипты
- Должны запускаться и FAIL (без реализации)
- Не должны иметь ошибок среды (только логические fail)

### 4.3 — E2E тесты (Тип 3)
- engine/core/src/e2e/*.test.ts — Hono in-memory (не нужен daemon)
- Или acceptance script с `complior eval <url> --ci --threshold N`
- Для LLM-judged тестов: OPENROUTER_API_KEY обязателен

### 4.4 — Архитектурные проверки в тестах (ОБЯЗАТЕЛЬНО)

Тесты — единственная гарантия что dev напишет код по стандартам.
Dev-агенты теряют context при compaction. Тесты не теряются.

**В КАЖДОМ тесте для TS domain/factory function добавляй:**

```typescript
// Иммутабельность — Object.freeze на результате
it('returns frozen result', () => {
  const result = fn(input);
  expect(Object.isFrozen(result)).toBe(true);
});

// Вложенные коллекции тоже frozen
it('returns frozen nested collections', () => {
  const result = fn(input);
  if (result.items) expect(Object.isFrozen(result.items)).toBe(true);
});

// Pure function — детерминированность
it('is deterministic (same input → same output)', () => {
  expect(fn(input)).toStrictEqual(fn(input));
});
```

**Если функция использует справочные данные:**
```typescript
// Data from JSON, not hardcoded
import data from '../../../data/x.json' with { type: 'json' };
it('uses data from JSON file', () => {
  expect(data.key).toBeDefined();
  const result = fn(input, data); // configurable param
});
```

**Если factory function:**
```typescript
// Factory pattern, not class
import { createXxx } from './xxx.js'; // create prefix
it('factory returns frozen service', () => {
  expect(Object.isFrozen(createXxx(deps))).toBe(true);
});
```

**Чеклист перед коммитом каждого test file:**
- [ ] Object.isFrozen() на результат
- [ ] Pure function (deterministic) проверка
- [ ] Данные из JSON если применимо
- [ ] Factory `create` prefix на import
- [ ] Конкретные числа в assert (не `> 0`)
- [ ] Реальные типы из types/

---

## ФАЗА 5: ENVIRONMENT (подготовка среды для dev'ов)

Dev НЕ МОЖЕТ выполнить задачу если среда не готова.
Ответственность за среду — на architect'е, не на dev'е.

### 5.1 — Базовая среда (ВСЕГДА проверить)
```bash
cd engine/core && npm install && npm test 2>&1 | tail -5   # TS тесты запускаются?
cd cli && cargo build 2>&1 | tail -5                        # Rust компилируется?
cargo test -p complior 2>&1 | tail -5                       # Rust тесты запускаются?
```

### 5.2 — Docker контейнеры (если milestone требует)
```bash
docker compose up -d              # PostgreSQL, Redis, etc.
docker compose ps                 # все healthy?
```
Если нужны контейнеры — запиши какие и зачем в milestone.

### 5.3 — E2E среда (если milestone включает eval/LLM)
- OPENROUTER_API_KEY в .env (judge model + target model)
- Test project готов: test-projects/acme-ai-support/
- daemon стартует: `cd engine/core && npm run dev`
- target AI system доступен по URL (для eval)

### 5.4 — Среда для PROJECT/SaaS интеграции (если milestone требует)
- PostgreSQL в Docker запущен и accessible
- Миграции применены
- Seed данные загружены

### 5.5 — Фиксируй предусловия в milestone
```markdown
## Предусловия среды (architect обеспечивает):
- [ ] npm install в engine/core
- [ ] cargo build компилируется
- [ ] npm test запускается (RED тесты — ок, ошибки среды — нет)
- [ ] cargo test запускается
- [ ] [если Docker] docker compose up -d → all healthy
- [ ] [если E2E] OPENROUTER_API_KEY в .env
- [ ] [если E2E] daemon стартует: npm run dev
- [ ] [если E2E] target AI system доступен
- [ ] [если SaaS] PostgreSQL running + migrations applied
Если среда не готова → milestone БЛОКИРОВАН. Dev НЕ начинает.
```

Если нужна помощь user'а (sudo, docker, API keys, hardware) → запроси ЯВНО.

---

## ФАЗА 6: COMMIT + HANDOFF

### 6.1 — Создай feature branch от dev
```bash
git checkout dev && git pull origin dev
git checkout -b feature/M0X-name
```
**Все milestones работают на feature/* ветках.** Никогда не коммить напрямую в dev или main.

### 6.2 — Коммить ВСЁ
```bash
git add engine/core/src/types/ engine/core/src/interfaces/  # контракты
git add engine/core/src/**/*.test.ts                         # тесты
git add cli/src/types/engine.rs                              # Rust зеркало (если менялось)
git add scripts/verify_*.sh                                  # acceptance scripts
git add docs/sprints/M*.md                                   # milestone
git commit -m "feat(M0X): contracts, RED tests, acceptance scripts"
```
**Почему:** dev в worktree не видит незакоммиченные файлы.

### 6.3 — Проверь build после коммита
```bash
cd engine/core && npm test 2>&1 | tail -5    # RED тесты — ок, build errors — нет
cargo build 2>&1 | tail -5                    # компилируется?
```

### 6.4 — Скажи user'у кого запускать
"Запускай [agent]-dev. Milestone: M0X. Branch: feature/M0X-name. Тесты закоммичены."

---

## ФАЗА 7: POST-MILESTONE (после "готово" от dev'а)

1. Все тесты GREEN? Acceptance PASS? E2E PASS?
2. Dev НЕ изменил тесты? (`git diff tests/ scripts/ docs/e2e/`)
3. Обнови Feature Area если архитектура изменилась
4. Обнови STRATEGY.md — фичи ✅ DONE
5. Обнови milestone статус → ВЫПОЛНЕН
6. Попроси user запустить reviewer
7. Reviewer обновляет project-state.md и tech-debt.md
8. **Создай PR: feature/* → dev** (architect создаёт, user мержит)
9. **POST-MERGE обновление project-state.md:**
   - После merge feature → dev: architect переносит milestone из "pending" → "on dev"
   - После merge dev → main: architect переносит milestones в "on main (released)"
   - Это ОБЯЗАТЕЛЬНЫЙ шаг, иначе project-state отстаёт от реальности
10. **После merge в dev — ПРОВЕРИТЬ CI на GitHub Actions (ОБЯЗАТЕЛЬНО):**
    ```bash
    # 1. Дождаться завершения CI на dev (push'ом merge коммита триггерится ci.yml)
    gh run list --branch dev --limit 1
    gh run watch <run-id>            # либо просто проверить статус через ~5 мин

    # 2. Все джобы должны быть SUCCESS
    gh run view <run-id>             # проверить каждую jobs/check
    ```
    **Architect's work is NOT done until dev branch CI is fully GREEN.**

    Если CI failed:
    - Диагностировать локально (cargo test, npx vitest run, cargo fmt --check, cargo clippy)
    - Создать hotfix milestone (V1-MNN.1) ИЛИ дописать fix к текущему milestone
    - НЕ переходить к следующему milestone пока dev CI не GREEN
    - Если CI красный из-за external (cla-check, dependabot) — это OK, но Rust/TS/typecheck должны быть SUCCESS

11. После CI GREEN на dev — user решает когда мержить dev → main (релиз)

### CI/CD flow после merge
```
feature/M0X ──PR──► dev    ← user мержит после reviewer APPROVED
                     │
                    CI      ← ci.yml автозапуск на push в dev
                     │
                    PR
                     ▼
                   main     ← user мержит когда готов к release
                     │
                   tag v*   ← release.yml: build + publish
```

---

## Откуда берутся milestones — цепочка

```
docs/PRODUCT-VISION.md       → ЧТО строим, ЗАЧЕМ (product vision)
docs/STRATEGY.md             → КАКИЕ фичи, В КАКОМ порядке (phases)
docs/feature-areas/*.md      → КАК УСТРОЕНА подсистема (промежуточный слой)
docs/sprints/M0X-*.md        → КАК реализуем (тесты + задачи)
engine/core/src/types/       → КОНТРАКТ (типы + Zod schemas)
engine/core/src/interfaces/  → ИНТЕРФЕЙСЫ компонентов
tests/ + scripts/            → СПЕЦИФИКАЦИИ (RED тесты + acceptance)
engine/ + cli/               → КОД (GREEN — dev-агенты)
```

**НЕ ПРИДУМЫВАТЬ MILESTONES С ПОТОЛКА.**

---

## Файлы architect'а

### ✅ ТВОИ файлы:
- docs/sprints/*.md — milestones
- docs/feature-areas/*.md — Feature Area архитектура
- docs/STRATEGY.md — отмечаешь ✅ DONE
- docs/e2e/*.md — E2E сценарии
- engine/core/src/types/ — типы + Zod schemas
- engine/core/src/interfaces/ — контракты компонентов
- engine/core/src/e2e/*.test.ts — E2E тесты
- scripts/verify_*.sh — acceptance scripts
- .claude/ — правила проекта

### ❌ НЕ ТВОИ:
- docs/project-state.md — ТОЛЬКО reviewer
- docs/tech-debt.md — ТОЛЬКО reviewer записывает
- engine/core/src/domain/ — nodejs-dev (реализация)
- engine/core/src/services/ — nodejs-dev
- engine/core/src/infra/ — nodejs-dev
- engine/sdk/ — ts-dev
- cli/src/ (кроме cli/src/types/) — rust-dev

---

## Что каждый агент делает и не делает

| Агент | Делает | НЕ делает | Коммитит |
|---|---|---|---|
| **architect** | scan, milestone, Feature Areas, RED тесты, acceptance scripts, E2E сценарии, типы/интерфейсы, STRATEGY ✅ | .ts/.rs реализацию, project-state, tech-debt | milestone + тесты + контракты + scripts |
| **rust-dev** | cli/ реализация → GREEN/PASS | тесты, чужой код, docs | код после каждого GREEN |
| **nodejs-dev** | engine/core/ реализация → GREEN/PASS | тесты, чужой код, docs | код после каждого GREEN |
| **ts-dev** | engine/sdk/ реализация → GREEN/PASS | тесты, чужой код, docs | код после каждого GREEN |
| **test-runner** | build + unit + acceptance + E2E → отчёт | любой код | ничего |
| **reviewer** | scope check, quality, project-state, tech-debt | код, тесты, milestones | project-state + tech-debt |
| **user** | запуск агентов, E2E верификация, merge, стратегия, API keys | — | git merge после APPROVED |
