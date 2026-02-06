# Структура документации проекта

**Дата:** 2026-02-06
**Версия:** 1.0.0

---

## 📁 Структура `/home/openclaw/PROJECT/docs/`

### Принцип организации:

```
docs/
├── [Постоянные артефакты]     ← Ключевые документы проекта
├── temp/                       ← Временные setup guides, instructions
├── compliance/                 ← Документация по compliance (Legal)
├── design/                     ← Дизайн-файлы (Kai)
├── infrastructure/             ← Инфраструктурная документация (Derek)
└── testing/                    ← Тестовая документация (Quinn)
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

## 🕐 ВРЕМЕННЫЕ ФАЙЛЫ (`temp/`)

Файлы, созданные во время setup/onboarding, но не являющиеся постоянными артефактами проекта.

### Setup & Onboarding Guides:

| Файл | Назначение | Можно удалить после |
|------|------------|---------------------|
| **PHASE-0-ITERATIVE-PROCESS.md** | Инструкция для Marcus как создавать Phase 0 | Phase 0 завершена |
| **PHASE-0-SEQUENCE.md** | Детальная спецификация артефактов Phase 0 | Phase 0 завершена |
| **GITHUB-SETUP.md** | Инструкция по настройке GitHub | GitHub настроен |
| **MANUAL-SETUP-REQUIRED.md** | Checklist ручных задач для PO | Setup завершен |
| **GH-AUTH-LOGIN-INSTRUCTIONS.md** | Как сделать gh auth login | gh CLI настроен |
| **GITHUB-TOKEN-SECURITY.md** | Управление GitHub токеном | Справочный (можно оставить) |
| **GIT-VS-GH-CLI.md** | Разница между Git SSH и gh CLI | Обучающий (можно оставить) |
| **USER-SETUP-DECISION.md** | Выбор между root и openclaw | Setup завершен |
| **SETUP-PROGRESS.md** | Прогресс настройки GitHub | Setup завершен |

---

## 📜 Правила работы с документацией:

### 1. Постоянные артефакты (корень docs/)
- ✅ Создаются в Phase 0 (Marcus)
- ✅ Обновляются на протяжении всего проекта
- ✅ Коммитятся в git
- ✅ Проходят review (Marcus или PO)
- ⛔ НЕ удаляются

### 2. Временные файлы (docs/temp/)
- ✅ Создаются для setup/onboarding
- ✅ Коммитятся в git (для истории)
- ✅ Можно удалить после завершения setup
- ⚠️ Или оставить как справочные

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
