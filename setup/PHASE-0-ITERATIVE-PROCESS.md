# Phase 0 — Iterative Process (пошаговое создание с approval)

**Для:** Marcus (CTO) — ОБЯЗАТЕЛЬНАЯ инструкция
**Дата:** 2026-02-05
**Версия:** 1.0

---

## ⚠️ КРИТИЧНО: Пошаговый процесс с approval после КАЖДОГО документа

Marcus, ты создаёшь артефакты Фазы 0 **НЕ ВСЕ СРАЗУ**, а **ПООЧЕРЁДНО** с approval Product Owner после каждого документа.

---

## 🔄 Правильный итеративный процесс:

### ЭТАП 0: Подготовка (до начала)

**Marcus делает:**
1. Читает `/home/openclaw/PROJECT/docs/PRODUCT-VISION.md`
2. Читает `/home/openclaw/PROJECT/docs/PHASE-0-SEQUENCE.md`
3. **⭐ АНАЛИЗИРУЕТ существующий backend код** в `/home/openclaw/PROJECT/existing-code/`
   - Изучает архитектуру существующего кода
   - Извлекает паттерны проектирования
   - Определяет что можно переиспользовать
   - Определяет что нужно рефакторить
4. Пишет в группу: "📋 Начинаю Фазу 0. Анализирую Product Vision и существующий код."

---

### ЭТАП 1: PROJECT.md (паспорт проекта)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/PROJECT.md`

**Содержание:**
- Суть проекта (из PRODUCT-VISION.md)
- Текущая фаза
- Ключевые решения (tech stack из PRODUCT-VISION.md)
- Глоссарий терминов
- Контакты и роли

**После создания Marcus пишет:**
```
@founder PROJECT.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/PROJECT.md

Содержит:
- Суть проекта: AI Act Compliance Platform
- Tech stack: [список]
- Глоссарий: [ключевые термины]

Пожалуйста, проверь и утверди. Если нужны правки — скажи что исправить.

Утвердить? ✅ / Доработать 📝
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 2
- **Вариант B:** "📝 Доработать: [замечания]" → Marcus правит → повторный approval
- **Вариант C:** "Давай обсудим [детали]" → обсуждение → правки → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/PROJECT.md
git commit -m "docs: add PROJECT.md (паспорт проекта)

- Описание проекта и целевой аудитории
- Tech stack и ключевые решения
- Глоссарий терминов

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 2**

---

### ЭТАП 2: ARCHITECTURE.md (DDD/Onion Architecture)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/ARCHITECTURE.md`

**⭐ ВАЖНО:** Marcus **АНАЛИЗИРУЕТ существующий backend код** в `/home/openclaw/PROJECT/existing-code/` и строит архитектуру НА ЕГО ОСНОВЕ:
- Какие паттерны уже используются?
- Какая структура модулей?
- Что можно переиспользовать?
- Что нужно рефакторить под DDD/Onion?

**Содержание:**
- High-level architecture diagram (Mermaid)
- DDD / Onion Architecture layers
- Bounded Contexts
- Module structure
- Dependency direction rules
- Key design patterns
- **Секция: "Migration from existing code"** — как мигрировать существующий код в новую архитектуру
- Trade-offs и compromises

**После создания Marcus пишет:**
```
@founder ARCHITECTURE.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/ARCHITECTURE.md

Ключевые решения:
- DDD/Onion Architecture с 5 слоями
- Bounded Contexts: [список]
- Модульный монолит (не микросервисы для MVP)
- Migration plan от существующего кода

⚠️ На основе анализа существующего кода в /existing-code/
   Выявлено: [что нашёл в существующем коде]
   Предлагаю: [как адаптировать под DDD]

Mermaid диаграмма: [показывает]

⛔ APPROVAL GATE: Требуется утверждение архитектуры.

Утвердить? ✅ / Доработать 📝
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 3
- **Вариант B:** "📝 Доработать: [замечания]" → Marcus правит → повторный approval
- **Вариант C:** "Давай обсудим [детали]" → обсуждение → правки → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/ARCHITECTURE.md
git commit -m "docs: add ARCHITECTURE.md (DDD/Onion Architecture)

- High-level architecture diagram (Mermaid)
- 5 layers: Domain → Domain Services → Application → Presentation → Infrastructure
- Bounded Contexts with clear boundaries
- Migration plan from existing code

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 3**

---

### ЭТАП 3: DATABASE.md (ER-диаграммы, схема БД)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/DATABASE.md`

**⭐ ВАЖНО:** Marcus **АНАЛИЗИРУЕТ существующую БД схему** (если есть в existing-code) или Prisma schema:
- Какие таблицы уже есть?
- Какие связи используются?
- Что нужно добавить для новых фич?
- Что нужно рефакторить?

**Содержание:**
- ER-диаграмма (Mermaid) — **включая existing tables**
- Все таблицы с описанием
- Indexes, constraints
- Migration strategy (как добавить новые таблицы к существующим)
- Data retention policy

**После создания Marcus пишет:**
```
@founder DATABASE.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/DATABASE.md

Структура БД:
- Таблицы: [список]
- ER-диаграмма: [Mermaid]
- Новые таблицы vs существующие: [что добавляем]
- Migration plan: [как мигрировать]

⚠️ На основе анализа существующей БД схемы
   Найдено: [существующие таблицы]
   Добавляем: [новые таблицы]

Утвердить? ✅ / Обсудить 💬
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 4
- **Вариант B:** "💬 Давай обсудим [детали]" → обсуждение → правки → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/DATABASE.md
git commit -m "docs: add DATABASE.md (ER diagrams, schema)

- ER-диаграмма всех таблиц (Mermaid)
- Детальное описание схемы
- Migration plan от существующей БД

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 4**

---

### ЭТАП 4: DATA-FLOWS.md (Sequence diagrams)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/DATA-FLOWS.md`

**Содержание:**
- Sequence diagrams (Mermaid) для КАЖДОГО ключевого use case:
  - User Registration Flow
  - Risk Classification Flow
  - OAuth2 Login Flow
  - Compliance Checklist Generation Flow
  - [ ] Другие flows из PRODUCT-VISION.md

**После создания Marcus пишет:**
```
@founder DATA-FLOWS.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/DATA-FLOWS.md

Sequence diagrams для:
- User Registration Flow
- Risk Classification Flow
- OAuth2 Login Flow
- [ ] Другие flows

Каждый flow показывает: Frontend → API → Services → DB

Утвердить? ✅ / Обсудить 💬
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 5
- **Вариант B:** "💬 Добавь ещё flow X" → Marcus добавляет → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/DATA-FLOWS.md
git commit -m "docs: add DATA-FLOWS.md (sequence diagrams)

- Sequence diagrams для всех key use cases
- Полные flows от UI до DB

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 5**

---

### ЭТАП 5: CODING-STANDARDS.md (правила кода)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/CODING-STANDARDS.md`

**⭐ ВАЖНО:** Marcus **АНАЛИЗИРУЕТ code style существующего кода**:
- Какие паттерны уже используются?
- Какой style (functional / OOP)?
- Какие naming conventions?
- Есть ли ESLint/Prettier config?
- **Адаптирует CODING-STANDARDS под существующий код** (или предлагает рефакторинг)

**Содержание:**
- Парадигма (functional / OOP)
- TypeScript правила
- Backend patterns (DDD/Onion)
- Frontend patterns (React)
- Naming conventions
- Git commits (Conventional Commits)
- Testing requirements
- **Секция: "Code style migration"** — если нужен рефакторинг существующего кода

**После создания Marcus пишет:**
```
@founder CODING-STANDARDS.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/CODING-STANDARDS.md

Ключевые стандарты:
- Парадигма: [functional / OOP]
- TypeScript strict mode
- DDD/Onion patterns для backend
- React functional components для frontend
- Conventional Commits
- Test coverage: 80%+

⚠️ На основе анализа существующего кода:
   Текущий style: [что нашёл]
   Предлагаю: [рекомендации]
   Migration plan: [если нужен рефакторинг]

⛔ APPROVAL GATE: Я буду проверять соблюдение при code review.

Утвердить? ✅ / Доработать 📝
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 6
- **Вариант B:** "📝 Доработать: [замечания]" → Marcus правит → повторный approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/CODING-STANDARDS.md
git commit -m "docs: add CODING-STANDARDS.md (coding standards)

- Полные правила написания кода
- TypeScript strict mode, DDD patterns
- Testing requirements (80%+ coverage)

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 6**

---

### ЭТАП 6: PRODUCT-BACKLOG.md (Фичи продукта)

#### Marcus создаёт:
**Файл:** `/home/openclaw/PROJECT/docs/PRODUCT-BACKLOG.md`

**⚠️ PRODUCT-BACKLOG ≠ SPRINT-BACKLOG:**
| | Product Backlog | Sprint Backlog |
|--|----------------|----------------|
| **Что** | ЧТО делает продукт | КАК реализовать |
| **Уровень** | Фичи / Эпики (бизнес) | User Stories (техника) |
| **Когда** | Phase 0 (один раз, потом дополняется) | Sprint Planning (каждый спринт) |
| **Кто** | Marcus → PO approval | Marcus декомпозирует фичи → US |
| **Связь** | 1 фича → N user stories | N user stories ← 1 фича |

**Содержание PRODUCT-BACKLOG.md:**
- ВСЕ фичи (эпики) из PRODUCT-VISION.md на бизнес-уровне
- Приоритет каждой фичи (P0 / P1 / P2)
- Бизнес-ценность и описание
- Грубый размер (S / M / L / XL)
- Зависимости между фичами
- MVP scope: какие фичи в MVP, какие — пост-MVP

**SPRINT-BACKLOG.md (отдельный документ, НЕ Phase 0):**
- Создаётся Marcus перед КАЖДЫМ спринтом при Sprint Planning
- Берёт P0-фичи из Product Backlog → декомпозирует в User Stories
- Каждая US: Story Points, acceptance criteria, assignee, теги, техконтекст
- Одна фича может породить 5-10 User Stories
- Формат US описан в Marcus SKILL.md → Sprint Task Template

**После создания Marcus пишет:**
```
@founder PRODUCT-BACKLOG.md готов к утверждению:

Файл: /home/openclaw/PROJECT/docs/PRODUCT-BACKLOG.md

Итого:
- Фичи (эпики): [количество]
- P0 (MVP Must Have): [список]
- P1 (Should Have): [список]
- P2 (Could Have / Future): [список]

⛔ APPROVAL GATE: Требуется приоритизация и утверждение MVP scope.

Пожалуйста:
1. Проверь что все фичи из PRODUCT-VISION покрыты
2. Согласуй приоритеты (P0 / P1 / P2)
3. Утверди MVP scope

💡 User Stories для Sprint 001 будут в отдельном SPRINT-BACKLOG.md

Утвердить? ✅ / Изменить приоритеты 📝
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю" → Marcus делает commit и переходит к ЭТАП 7
- **Вариант B:** "📝 Изменить приоритет Feature X на P0" → Marcus правит → approval
- **Вариант C:** "Добавь ещё фичу Y" → Marcus добавляет → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add docs/PRODUCT-BACKLOG.md
git commit -m "docs: add PRODUCT-BACKLOG.md (Product Features)

- Все фичи из PRODUCT-VISION описаны как эпики
- Приоритеты (P0/P1/P2) и MVP scope утверждены Product Owner

✅ Approved by Product Owner"

git push origin develop
```

**⛔ ТОЛЬКО ПОСЛЕ УТВЕРЖДЕНИЯ → переход к ЭТАП 7**

---

### ЭТАП 7: ADR-001, ADR-002, ADR-003, ADR-004 (Architecture Decision Records)

#### Marcus создаёт:
**Файлы:** `/home/openclaw/PROJECT/adr/ADR-00X-название.md`

**Минимум ADR:**
- ADR-001: Выбор backend фреймворка (Next.js API routes vs FastAPI)
- ADR-002: Выбор БД (PostgreSQL vs MongoDB)
- ADR-003: Монолит vs Microservices
- ADR-004: Deployment strategy (Vercel / Railway / self-hosted)
- [ ] Другие критичные решения

**После создания Marcus пишет:**
```
@founder ADR (Architecture Decision Records) готовы к утверждению:

Файлы:
- /home/openclaw/PROJECT/adr/ADR-001-nextjs-backend.md
- /home/openclaw/PROJECT/adr/ADR-002-postgresql.md
- /home/openclaw/PROJECT/adr/ADR-003-modular-monolith.md
- /home/openclaw/PROJECT/adr/ADR-004-deployment-strategy.md

Ключевые решения:
- Backend: Next.js API routes (обоснование: [краткое])
- БД: PostgreSQL (обоснование: [краткое])
- Architecture: Модульный монолит (обоснование: [краткое])
- Deployment: [Vercel/Railway/self-hosted] (обоснование: [краткое])

Утвердить все ADR? ✅ / Обсудить 💬
```

#### Product Owner отвечает:
- **Вариант A:** "✅ Утверждаю все ADR" → Marcus делает commit → **ФАЗА 0 ЗАВЕРШЕНА**
- **Вариант B:** "💬 Давай обсудим ADR-003 (монолит vs микросервисы)" → обсуждение → правки → approval

#### Marcus делает commit:
```bash
cd /home/openclaw/PROJECT
git add adr/
git commit -m "docs: add ADR-001 to ADR-004 (architecture decisions)

- ADR-001: Next.js backend framework
- ADR-002: PostgreSQL database
- ADR-003: Modular monolith architecture
- ADR-004: Deployment strategy

✅ Approved by Product Owner"

git push origin develop
```

---

### 🎉 ЭТАП 8: Фаза 0 завершена

#### Marcus пишет:
```
@alex_orchestrator_bot Фаза 0 завершена.

Все артефакты созданы и утверждены Product Owner:
✅ PROJECT.md
✅ ARCHITECTURE.md (APPROVED ⛔)
✅ DATABASE.md
✅ DATA-FLOWS.md
✅ CODING-STANDARDS.md (APPROVED ⛔)
✅ PRODUCT-BACKLOG.md (APPROVED ⛔)
✅ ADR-001, ADR-002, ADR-003, ADR-004

Все commits в develop branch.

Готов к планированию Sprint 001.
```

#### Alex отвечает:
```
Принято. Начинаю Sprint Planning для Sprint 001.

@founder Фаза 0 завершена ✅
Переходим к Sprint 001 Planning.
```

---

## 📊 Статистика Фазы 0:

После завершения Фазы 0, у вас будет:
- **7 ключевых документов Phase 0** (PROJECT, ARCHITECTURE, DATABASE, DATA-FLOWS, CODING-STANDARDS, PRODUCT-BACKLOG, ADR)
- **+ SPRINT-BACKLOG.md** — создаётся при Sprint Planning (НЕ Phase 0 артефакт)
- **7+ commits** в develop branch (по одному после каждого approval)
- **3 approval gates** пройдены (ARCHITECTURE, CODING-STANDARDS, PRODUCT-BACKLOG)
- **Полная документация** для старта Sprint 001

---

## ⚠️ ВАЖНЫЕ ПРАВИЛА для Marcus:

### 1. НЕ создавай все документы сразу
❌ **НЕПРАВИЛЬНО:**
```
Создаю все документы Фазы 0...
[через час]
Все готово, вот 7 файлов.
```

✅ **ПРАВИЛЬНО:**
```
Создаю PROJECT.md...
[через 20 минут]
@founder PROJECT.md готов. Утвердить?
[ждёт approval]
[получил approval]
Commit PROJECT.md.
Создаю ARCHITECTURE.md...
```

### 2. ВСЕГДА делай commit после approval
После каждого approval от Product Owner → `git add` + `git commit` + `git push`

### 3. АНАЛИЗИРУЙ существующий код
Перед созданием артефактов **ОБЯЗАТЕЛЬНО** изучи существующий backend код в `/home/openclaw/PROJECT/existing-code/`

### 4. ПИШИ в группу, НЕ в DM
Все статусы Фазы 0 пиши в группу «🦞 Dev Team», НЕ в DM Product Owner.
Так вся команда видит прогресс.

### 5. ОЖИДАЙ approval перед переходом к следующему
⛔ НЕ переходи к следующему документу пока НЕ получил "✅ Утверждаю"

---

## 🔄 Если Product Owner просит доработки:

**Product Owner:** "📝 Доработать: добавь секцию X в ARCHITECTURE.md"

**Marcus делает:**
1. Правит ARCHITECTURE.md
2. Пишет: "@founder Доработал ARCHITECTURE.md: добавил секцию X. Утвердить?"
3. Ждёт повторного approval
4. После approval → commit + push
5. Переход к следующему этапу

---

**Marcus, следуй этой инструкции строго. Пошаговый процесс критически важен для качества артефактов.**
