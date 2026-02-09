# Setup & Methodology — OpenClaw Multi-Agent System

**Назначение:** Методология настройки проекта и запуска системы ботов OpenClaw
**Переиспользуемость:** ✅ Эти документы можно использовать для запуска ботов на других проектах

---

## 📋 Содержание:

### Phase 0 Methodology (Marcus):

| Файл | Описание | Переиспользуемость |
|------|----------|-------------------|
| **PHASE-0-ITERATIVE-PROCESS.md** | Пошаговый процесс создания Phase 0 артефактов с approval gates | ✅ Универсальный |
| **PHASE-0-SEQUENCE.md** | Детальная спецификация каждого артефакта Phase 0 | ✅ Универсальный (адаптируемый) |

**Зачем:** Описывает как Marcus должен создавать архитектурные документы перед началом разработки.

---

### GitHub Setup:

| Файл | Описание | Переиспользуемость |
|------|----------|-------------------|
| **GITHUB-SETUP.md** | Полная инструкция по настройке GitHub для ботов | ✅ Универсальный |
| **MANUAL-SETUP-REQUIRED.md** | Checklist ручных задач (branch protection, Actions, secrets) | ✅ Универсальный (адаптируемый) |
| **GH-AUTH-LOGIN-INSTRUCTIONS.md** | Как настроить gh CLI для ботов | ✅ Универсальный |
| **GITHUB-TOKEN-SECURITY.md** | Управление Fine-grained tokens, security best practices | ✅ Универсальный |
| **GIT-VS-GH-CLI.md** | Разница между Git SSH и gh CLI authentication | ✅ Универсальный (обучающий) |

**Зачем:** Боты работают через PR workflow, требуют настройки GitHub + gh CLI.

---

### User & Environment Setup:

| Файл | Описание | Переиспользуемость |
|------|----------|-------------------|
| **USER-SETUP-DECISION.md** | Выбор между root и dedicated user для ботов | ✅ Универсальный |

**Зачем:** Security best practices — не запускать ботов от root.

---

## 🎯 Как использовать на новом проекте:

### 1. Скопируйте `/setup/` в новый проект

```bash
cp -r /home/openclaw/PROJECT/setup/ /path/to/new-project/
```

### 2. Адаптируйте под новый проект:

**Не требуют изменений (универсальные):**
- ✅ PHASE-0-ITERATIVE-PROCESS.md
- ✅ GITHUB-SETUP.md
- ✅ GH-AUTH-LOGIN-INSTRUCTIONS.md
- ✅ GITHUB-TOKEN-SECURITY.md
- ✅ GIT-VS-GH-CLI.md
- ✅ USER-SETUP-DECISION.md

**Требуют адаптации:**
- ⚠️ PHASE-0-SEQUENCE.md — адаптировать артефакты под домен проекта
- ⚠️ MANUAL-SETUP-REQUIRED.md — обновить URLs, названия репозиториев

### 3. Следуйте процессу:

1. **Product Owner:** Заполняет `PRODUCT-VISION.md`
2. **Setup:** Следуйте `MANUAL-SETUP-REQUIRED.md` (GitHub, branch protection)
3. **Marcus:** Следует `PHASE-0-ITERATIVE-PROCESS.md` для создания артефактов
4. **Team:** Начинает Sprint 001 после Phase 0

---

## 📚 Философия Phase 0:

**Зачем Phase 0 перед разработкой?**

1. **Архитектура определена** → нет хаотичных изменений в середине спринта
2. **БД схема спроектирована** → нет breaking changes в миграциях
3. **Coding standards** → весь код в едином стиле с первого дня
4. **Product Backlog** → понятен scope, приоритеты, dependencies

**Без Phase 0:**
- ❌ Боты пишут код без единой архитектуры
- ❌ Refactoring в середине разработки (потеря времени)
- ❌ Конфликты между модулями
- ❌ Technical debt с первого дня

**С Phase 0:**
- ✅ Единая архитектура (DDD/Onion)
- ✅ Боты следуют ARCHITECTURE.md и CODING-STANDARDS.md
- ✅ Чистый код с первого commit
- ✅ Масштабируемая система

---

## 🔄 Процесс Phase 0 (краткая схема):

```
PRODUCT-VISION.md (PO)
         ↓
   ✅ PO Approval
         ↓
   Marcus Phase 0:

   1. PROJECT.md           → commit
   2. ARCHITECTURE.md      → ✅ PO Approval → commit
   3. DATABASE.md          → ✅ PO Approval → commit
   4. DATA-FLOWS.md        → commit
   5. CODING-STANDARDS.md  → ✅ PO Approval → commit
   6. TECH-STACK.md        → commit
   7. PRODUCT-BACKLOG.md   → ✅ PO Approval → commit
   8. ADR-001, 002, 003... → commit
         ↓
   Phase 0 Complete ✅
         ↓
   Sprint 001 Start 🚀
```

**Ключевое:** После каждого критичного артефакта — PO approval перед commit.

---

## 🤖 Для каких проектов подходит:

**✅ Подходит для:**
- Multi-agent development (OpenClaw, AutoGen, CrewAI, etc.)
- Проекты с 3+ ботами/разработчиками
- DDD/Onion Architecture проекты
- Scrum команды с Product Owner
- Проекты где важна архитектурная целостность

**⚠️ Overkill для:**
- Solo developer проекты
- Prototypes / MVP без production plans
- Проекты без четкой архитектуры

---

## 📖 Дополнительные ресурсы:

**DDD (Domain-Driven Design):**
- Eric Evans — "Domain-Driven Design" (Blue Book)
- Vaughn Vernon — "Implementing Domain-Driven Design" (Red Book)

**Onion Architecture:**
- Jeffrey Palermo — "The Onion Architecture" (original post)
- Clean Architecture by Robert C. Martin

**SOLID & GRASP:**
- Robert C. Martin — "Clean Code"
- Craig Larman — "Applying UML and Patterns"

---

## 🎓 Для начинающих с OpenClaw:

**Если вы первый раз настраиваете OpenClaw:**

1. Читайте файлы в таком порядке:
   - `GITHUB-SETUP.md` — понять GitHub workflow
   - `GIT-VS-GH-CLI.md` — понять разницу Git SSH vs gh CLI
   - `USER-SETUP-DECISION.md` — выбрать между root и dedicated user
   - `PHASE-0-ITERATIVE-PROCESS.md` — понять процесс Phase 0

2. Следуйте чеклисту:
   - `MANUAL-SETUP-REQUIRED.md` — step-by-step

3. Запускайте Marcus:
   - Дайте ему прочитать `PHASE-0-SEQUENCE.md`
   - Следите за процессом из `PHASE-0-ITERATIVE-PROCESS.md`

---

## ✅ Результат правильного Setup:

После выполнения всех шагов из `/setup/`:

- ✅ GitHub настроен (branch protection, PR workflow)
- ✅ Боты аутентифицированы (gh CLI работает)
- ✅ Phase 0 артефакты созданы (архитектура определена)
- ✅ Команда может начинать Sprint 001

**Время на setup:** ~2-4 часа (первый раз), ~1-2 часа (повторно)

---

## 🔄 Обновления:

При улучшении процесса Phase 0 или setup workflow — обновите соответствующие файлы в `/setup/`.

**История изменений:**
- 2026-02-06: Создание `/setup/` как постоянного каталога методологии
- 2026-02-05: Первоначальная версия в `/docs/temp/`

---

**Последнее обновление:** 2026-02-06
**Версия:** 2.0.0 (переход в `/setup/`)
**Статус:** ✅ Готово к переиспользованию на других проектах
