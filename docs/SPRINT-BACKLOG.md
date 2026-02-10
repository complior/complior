# SPRINT-BACKLOG — AI Act Compliance Platform

**Версия:** 3.0.0
**Дата:** 2026-02-10

---

## Как читать Sprint Backlogs

**Sprint Backlog** — это КАК реализуется конкретная фича (User Stories, Acceptance Criteria).

| | Product Backlog | Sprint Backlog |
|--|-----------------|----------------|
| **Уровень** | Фичи / Эпики | User Stories |
| **Вопрос** | ЧТО делает продукт? | КАК это реализовать? |
| **Формат** | Feature-NN | US-NNN → Feature-NN |

### Story Points

| SP | Объём | Пример |
|----|-------|--------|
| **1-2** | Несколько часов, 1-2 файла | Конфиг, подключение плагина |
| **3** | Полдня-день, 3-5 файлов | Error handling, CI pipeline |
| **5** | 1-2 дня, 5-10 файлов | Fastify сервер, Docker Compose |
| **8** | 2-3 дня, 10+ файлов | Все MetaSQL-схемы, дизайн-система |

---

## Sprints

| Sprint | Файл | Features | SP | Статус |
|--------|-------|----------|----|--------|
| 0 | [SPRINT-BACKLOG-000.md](SPRINT-BACKLOG-000.md) | Feature 01: Infrastructure | 47 | ✅ Done (PR #2, #3) |
| 1 | [SPRINT-BACKLOG-001.md](SPRINT-BACKLOG-001.md) | Feature 02: IAM + Feature 03 (start) | 50 | ✅ Done (PR #4) |
| 2 | SPRINT-BACKLOG-002.md | Feature 03 (end) + Feature 18: AI Literacy + Feature 04a: Rules | — | ⏳ Planning |

---

## Velocity

| Sprint | Planned SP | Delivered SP | Velocity |
|--------|-----------|-------------|----------|
| 0 | 47 | 47 | 100% |
| 1 | 50 | 50 | 100% |
| **Avg** | **48.5** | **48.5** | **100%** |

---

## Sprint 2 Preview (Feature 03 end + Feature 18: AI Literacy + Feature 04a: Rules)

> Подробный Sprint 2 Backlog будет создан на Sprint Planning.

**Ожидаемые User Stories:**
- AI Tool Inventory wizard (5-step deployer wizard + catalog search)
- AI Literacy Module — course management, employee enrollment, tracking
- AI Literacy — quiz system + certificate generation (Gotenberg PDF)
- Rule Engine — deployer classification rules (Art. 5, Annex III deployer domains)
- CSV import for AI tools and employees

> **Note:** Sprint 2 вводит AI Literacy Module — wedge product за €49/мес. Art. 4 обязателен с 02.02.2025, 70% компаний не соответствуют.
