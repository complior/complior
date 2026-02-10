# Структура документации проекта

**Дата:** 2026-02-06
**Версия:** 1.0.0

---

## 📁 Структура проекта

### Принцип организации:

```
/home/openclaw/PROJECT/
├── docs/                       ← Документация проекта (артефакты)
│   ├── [Постоянные артефакты]  ← Ключевые документы проекта
│   ├── compliance/             ← Документация по compliance (Legal)
│   ├── design/                 ← Дизайн-файлы (Kai)
│   ├── infrastructure/         ← Инфраструктурная документация (Derek)
│   └── testing/                ← Тестовая документация (Quinn)
│
└── setup/                      ← Методология Phase 0 и настройки
    ├── Phase 0 процессы        ← Переиспользуемые на других проектах
    └── GitHub setup guides     ← Универсальные инструкции
```

---

## 📄 ПОСТОЯННЫЕ АРТЕФАКТЫ (корень docs/)

Эти документы — **основа проекта**, создаются в Phase 0 и поддерживаются на протяжении всего жизненного цикла.

### Phase 0 Artifacts (созданы Marcus):

| Файл | Владелец | Описание | Статус |
|------|----------|----------|--------|
| **PROJECT.md** | Marcus | Паспорт проекта (суть, фаза, tech stack, глоссарий) | Placeholder |
| **PRODUCT-VISION.md** | Product Owner | Product vision, MVP scope, use cases | Template |
| **ARCHITECTURE.md** | Marcus | DDD/Onion Architecture, module structure | Placeholder |
| **DATABASE.md** | Marcus | ER-диаграммы, schema, indexes, migrations | Placeholder |
| **DATA-FLOWS.md** | Marcus | Sequence diagrams (Mermaid) для key flows | Placeholder |
| **CODING-STANDARDS.md** | Marcus | Code style, SOLID, GRASP, Git workflow | Placeholder |
| **TECH-STACK.md** | Marcus | Полный список технологий и инструментов | Placeholder |

### Product & Sprint Management:

| Файл | Владелец | Описание |
|------|----------|----------|
| **PRODUCT-BACKLOG.md** | Marcus + Alex | User Stories с приоритетами и estimates |
| **SPRINT-BACKLOG.md** | Alex | Текущий sprint backlog с задачами |
| **SPRINT-BOARD.md** | Alex | Sprint board (TODO, In Progress, Done) |
| **BURNDOWN.md** | Alex | Burndown chart для текущего спринта |

### Knowledge Base:

| Файл | Владелец | Описание |
|------|----------|----------|
| **AI-ACT-KB.md** | Elena (Legal) | База знаний по EU AI Act (статьи, классификация, требования) |
| **RESEARCH-LOG.md** | Ava (Research) | Логи исследований (конкуренты, best practices) |
| **SECURITY-POLICY.md** | Leo (SecOps) | Security policy, vulnerability reporting |

---

## 🗂️ ПОДДИРЕКТОРИИ

### `compliance/`
**Владелец:** Elena (Legal)

Документы по соответствию AI Act:
- Risk assessment templates
- Compliance checklists
- Legal requirements по статьям AI Act

### `design/`
**Владелец:** Kai (UX)

Дизайн-система и UI/UX:
- Wireframes
- Prototypes
- Design tokens
- UI components specs

### `infrastructure/`
**Владелец:** Derek (DevOps)

Инфраструктурная документация:
- Deployment guides
- CI/CD pipelines
- Monitoring setup
- Infrastructure as Code docs

### `testing/`
**Владелец:** Quinn (QA)

Тестовая документация:
- Test plans
- Test cases
- E2E scenarios
- Bug reports

---

## 🔧 МЕТОДОЛОГИЯ И SETUP (`/setup/`)

**Расположение:** `/home/openclaw/PROJECT/setup/`

Методология Phase 0 и инструкции по настройке проекта — **переиспользуемые** на других проектах OpenClaw.

### Phase 0 Process:

| Файл | Описание | Переиспользуемость |
|------|----------|-------------------|
| **PHASE-0-ITERATIVE-PROCESS.md** | Пошаговый процесс создания Phase 0 артефактов | ✅ Универсальный |
| **PHASE-0-SEQUENCE.md** | Детальная спецификация артефактов Phase 0 | ✅ Универсальный (адаптируемый) |

### GitHub Setup:

| Файл | Описание | Переиспользуемость |
|------|----------|-------------------|
| **GITHUB-SETUP.md** | Полная инструкция по настройке GitHub | ✅ Универсальный |
| **MANUAL-SETUP-REQUIRED.md** | Checklist ручных задач | ✅ Универсальный (адаптируемый) |
| **GH-AUTH-LOGIN-INSTRUCTIONS.md** | Настройка gh CLI для ботов | ✅ Универсальный |
| **GITHUB-TOKEN-SECURITY.md** | Управление токенами, security | ✅ Универсальный |
| **GIT-VS-GH-CLI.md** | Разница Git SSH vs gh CLI | ✅ Универсальный (обучающий) |
| **USER-SETUP-DECISION.md** | Выбор между root и dedicated user | ✅ Универсальный |

**Зачем в отдельной директории:**
- ✅ Можно скопировать `/setup/` целиком в новый проект
- ✅ Документирует методологию работы OpenClaw системы
- ✅ Не смешивается с документацией конкретного проекта

---

## 📜 Правила работы с документацией:

### 1. Постоянные артефакты (корень docs/)
- ✅ Создаются в Phase 0 (Marcus)
- ✅ Обновляются на протяжении всего проекта
- ✅ Коммитятся в git
- ✅ Проходят review (Marcus или PO)
- ⛔ НЕ удаляются

### 2. Методология и setup (/setup/)
- ✅ Описывают процесс работы OpenClaw системы
- ✅ **Переиспользуемые** на других проектах
- ✅ Коммитятся в git
- ✅ Обновляются при улучшении процесса
- ⛔ НЕ удаляются

### 3. Поддиректории (compliance/, design/, etc.)
- ✅ Организованы по ролям/доменам
- ✅ Владелец следит за актуальностью
- ✅ Структура внутри — на усмотрение владельца

---

## 🔄 Процесс добавления новых документов:

### Если документ постоянный (key artifact):
1. Создать в **корне `docs/`**
2. Добавить в таблицу "Постоянные артефакты" выше
3. Указать владельца
4. Закоммитить

### Если документ временный (setup guide):
1. Создать в **`docs/temp/`**
2. Добавить в таблицу "Временные файлы" выше
3. Указать когда можно удалить
4. Закоммитить

### Если документ специализированный:
1. Создать в соответствующей поддиректории
2. Владелец поддерживает структуру

---

## 📊 Текущий статус документации:

### ✅ Готово к Phase 0:
- Структура директорий создана
- Временные файлы перенесены в `temp/`
- Placeholders для Phase 0 artifacts существуют

### ⏳ Ждёт выполнения:
- **PRODUCT-VISION.md** — Product Owner должен заполнить
- **Phase 0 artifacts** — Marcus создаст после PRODUCT-VISION

### 🔄 В процессе:
- Setup & onboarding (почти завершён)

---

## 🎯 После Phase 0:

Marcus создаст все постоянные артефакты:
1. PROJECT.md
2. ARCHITECTURE.md
3. DATABASE.md
4. DATA-FLOWS.md
5. CODING-STANDARDS.md
6. TECH-STACK.md
7. PRODUCT-BACKLOG.md

После этого временные файлы из `temp/` можно:
- Удалить (если больше не нужны)
- Оставить как справочные
- Перенести в wiki/knowledge base

---

## 📝 Обновления этого документа:

При изменении структуры docs/ — обновите DOCS-STRUCTURE.md.

**Последнее обновление:** 2026-02-06
**Автор:** Claude Code (EU AI Act Dev Team)
