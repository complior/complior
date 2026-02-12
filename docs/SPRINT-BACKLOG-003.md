# Sprint Backlog 003 — Requirements + Dashboard + Catalog APIs

**Sprint Goal:** Enable deployers to track compliance obligations per AI tool, view an organization-wide compliance dashboard, review classification history, and find EU-compliant alternatives.

**Capacity:** ~21 SP | **Duration:** 2 weeks
**Developer:** Max (Backend+QA)
**Baseline:** ~153 tests (Sprint 1-2 + Sprint 2.5) → **New: 32 tests (total: ~185)**

> **Prerequisite:** Sprint 2.5 (Invite Flow + Team Management + Enforcement) MUST be merged to develop before Sprint 3 starts. Sprint 2.5 provides: Invitation table, SubscriptionLimitChecker, PlanLimitError, getOrgLimits, updated plan limits, admin role upgrade. Baseline tests: ~153 (not 115).

**Контекст разработки:** Вся реализация ДОЛЖНА соответствовать правилам, описанным в `docs/CODING-STANDARDS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` и `docs/DATA-FLOWS.md`. В частности: DDD/Onion слои (domain → application → api), VM-sandbox (никаких `require()` в `app/`), CQS, factory functions вместо классов, Zod-валидация на всех API, explicit `resolveSession`/`checkPermission` в каждом handler, multi-tenancy через `organizationId`. Тарифные лимиты определены в `app/config/plans.js` (single source of truth).

---

## Граф зависимостей

```
US-025 (ComplianceScore) ──→ US-026 (GET requirements) ──→ US-027 (PATCH requirements)
US-025 ──→ US-029 (Dashboard)
US-028 (Classification History) — независимый
US-030 (Catalog Alternatives) — независимый
```

US-025 первым, затем US-026..030 можно параллелить.

---

## User Stories

### Phase 1: Domain Service (3 SP)

#### US-025: Compliance Score — расчёт прогресса выполнения требований (3 SP)

- **Feature:** 04c + 05 | **Developer:** Max

##### Описание
Как deployer, я хочу видеть числовой показатель compliance прогресса по каждому инструменту и по организации в целом, чтобы понимать насколько мы близки к полному соответствию AI Act.

##### Реализация
- Новый: `app/domain/classification/services/ComplianceScoreCalculator.js`
- Чистые функции (без I/O): `calculateToolScore`, `calculateOrgScore`, `groupByArticle`
- Формула: `(completed * 100 + inProgress * progress) / (total * 100) * 100`; `not_applicable` исключаются

##### Критерии приёмки
- [ ] Пустые requirements → score 0
- [ ] Все completed → score 100
- [ ] `not_applicable` исключены из знаменателя
- [ ] Requirements группируются по article reference с подсчётом completed/total
- [ ] Агрегация по всем инструментам организации даёт общий org score
- [ ] Чистые функции — без db, без побочных эффектов

- **Tests:** 6 (compliance-score.test.js)
- **Dependencies:** None

---

### Phase 2: Requirements API (6 SP)

#### US-026: Просмотр deployer requirements по AI-инструменту (3 SP)

- **Feature:** 04c | **Developer:** Max

##### Описание
Как deployer, я хочу видеть список всех compliance obligations для моего AI-инструмента, сгруппированных по статьям AI Act, чтобы понимать какие требования нужно выполнить и каков мой текущий прогресс.

##### Реализация
- Новый: `app/api/tools/requirements.js` — GET handler
- Новый: `app/application/classification/getRequirements.js` — application use case

##### Критерии приёмки
- [ ] Deployer видит requirements, сгруппированные по articleReference (Art. 4, Art. 26, Art. 27, Art. 50)
- [ ] Каждый requirement содержит: название, описание, guidance, оценку трудоёмкости, статус, прогресс, дедлайн, заметки
- [ ] Отображается общий compliance score инструмента (через ComplianceScoreCalculator)
- [ ] Deployer видит только инструменты своей организации (multi-tenancy)
- [ ] Доступ требует право `AITool.read`
- [ ] 404 если инструмент не найден или не принадлежит организации

- **Tests:** 5 (requirements-api.test.js)
- **Dependencies:** US-025

---

#### US-027: Обновление статуса compliance requirement (3 SP)

- **Feature:** 04c | **Developer:** Max

##### Описание
Как deployer, я хочу отмечать прогресс выполнения каждого compliance requirement (статус, процент, заметки, дедлайн), чтобы отслеживать путь к полному соответствию и видеть актуальный compliance score.

##### Реализация
- Изменён: `app/api/tools/requirements.js` — PATCH handler
- Новый: `app/application/classification/updateRequirement.js`
- Изменён: `server/lib/schemas.js` — `RequirementUpdateSchema`

##### Критерии приёмки
- [ ] Deployer может обновить: status, progress (0-100), notes, dueDate
- [ ] При status → 'completed' автоматически ставится `completedAt`
- [ ] При снятии completed — `completedAt` очищается
- [ ] После обновления пересчитывается `complianceScore` инструмента
- [ ] Multi-tenancy: deployer может обновлять только requirements своей организации
- [ ] Доступ требует право `AITool.update`
- [ ] Все изменения записываются в AuditLog (старый → новый status)
- [ ] 404 если инструмент или requirement не найден

- **Tests:** 6 (requirements-api.test.js, продолжение)
- **Dependencies:** US-025, US-026

---

### Phase 3: Classification History (3 SP)

#### US-028: Просмотр истории классификации AI-инструмента (3 SP)

- **Feature:** 04b | **Developer:** Max

##### Описание
Как deployer, я хочу видеть полную историю классификации моего AI-инструмента (текущий результат + все предыдущие версии), чтобы понимать как менялась оценка риска и почему.

##### Реализация
- Новый: `app/api/tools/classification-history.js` — GET handler
- Новый: `app/application/classification/getClassificationHistory.js` — application use case

##### Критерии приёмки
- [ ] Deployer видит текущую классификацию с полным reasoning: ruleResult, метод, обоснование, ссылки на статьи
- [ ] Deployer видит список всех предыдущих классификаций: версия, дата, метод, уровень риска, confidence, кто классифицировал
- [ ] History отсортирована от новых к старым (version DESC)
- [ ] Multi-tenancy: только инструменты своей организации
- [ ] Доступ требует право `AITool.read`
- [ ] 404 если инструмент не найден

- **Tests:** 4 (classification-history.test.js)
- **Dependencies:** None

---

### Phase 4: Dashboard API (5 SP)

#### US-029: Compliance dashboard — сводка по организации (6 SP)

- **Feature:** 05 | **Developer:** Max

##### Описание
Как deployer, я хочу видеть единый дашборд со сводкой по compliance моей организации — сколько инструментов зарегистрировано, как распределены по уровням риска, каков общий compliance score, какие инструменты требуют срочного внимания, и ближайшие дедлайны AI Act — чтобы иметь полную картину и приоритизировать действия.

##### Реализация
- Новый: `app/api/dashboard/summary.js` — GET handler
- Новый: `app/application/dashboard/getDashboardSummary.js` — application use case

##### Критерии приёмки
- [ ] Deployer видит: общее количество инструментов (всего / классифицированных / без классификации)
- [ ] Deployer видит распределение по уровням риска (prohibited, high, gpai, limited, minimal)
- [ ] Deployer видит общий compliance score организации (среднее по классифицированным)
- [ ] Блок AI Literacy возвращает нули — заглушка (Feature 18 в Sprint 8+)
- [ ] Deployer видит список «требуют внимания»: prohibited инструменты (critical), high-risk без FRIA (high), приближающиеся дедлайны (medium)
- [ ] Deployer видит timeline — 3 ключевые даты AI Act (Art. 113) с количеством дней до дедлайна
- [ ] Deployer видит последние 5 действий из AuditLog своей организации
- [ ] Один запрос к API возвращает все данные для дашборда
- [ ] Multi-tenancy на всех запросах
- [ ] **Role-differentiated data (Sprint 2.5 extension, +1 SP):**
  - Owner/Admin: все инструменты org, полный compliance view, team management доступ
  - Member: только инструменты где `createdById = user.id`, personal view
  - Response включает `planLimits` (из Sprint 2.5 getOrgLimits): `{ users: {current, max}, tools: {current, max} }`

- **Tests:** 7 (dashboard.test.js)
- **Dependencies:** US-025

---

### Phase 5: Catalog Alternatives (3 SP)

#### US-030: Поиск EU-compliant альтернатив в каталоге (3 SP)

- **Feature:** DESIGN-BRIEF v2.2.0 | **Developer:** Max

##### Описание
Как deployer, чей AI-инструмент классифицирован как high-risk или prohibited, я хочу найти альтернативные инструменты с более низким уровнем риска в той же предметной области, чтобы рассмотреть замену на более compliant вариант.

##### Реализация
- Изменён: `app/application/inventory/searchCatalog.js` — фильтрация по domain и maxRisk
- Изменён: `server/lib/schemas.js` — расширение `CatalogSearchSchema`
- Изменён: `app/api/tools/catalog.js` — передача новых параметров

##### Критерии приёмки
- [ ] Deployer может фильтровать каталог по domain (employment, healthcare и др.)
- [ ] Deployer может задать maxRisk — каталог покажет только инструменты с уровнем риска ≤ указанного
- [ ] Маппинг maxRisk: high → показывает high+gpai+limited+minimal, limited → limited+minimal, minimal → только minimal
- [ ] Оба фильтра опциональны и комбинируются с существующими поиском и фильтрами
- [ ] Обратная совместимость: существующие вызовы без новых параметров работают без изменений

- **Tests:** 4 (расширение существующих тестов каталога)
- **Dependencies:** None

---

## Summary

| Phase | Stories | SP |
|-------|---------|-----|
| Domain Service | US-025 | 3 |
| Requirements API | US-026, US-027 | 6 |
| Classification History | US-028 | 3 |
| Dashboard API | US-029 | 6 |
| Catalog Alternatives | US-030 | 3 |
| **Total** | **6 stories** | **21 SP** |

---

## New Files (8)

```
app/domain/classification/services/ComplianceScoreCalculator.js
app/application/classification/getRequirements.js
app/application/classification/updateRequirement.js
app/application/classification/getClassificationHistory.js
app/application/dashboard/getDashboardSummary.js
app/api/tools/requirements.js
app/api/tools/classification-history.js
app/api/dashboard/summary.js
```

## Modified Files (3)

```
server/lib/schemas.js — RequirementUpdateSchema, расширение CatalogSearchSchema
app/application/inventory/searchCatalog.js — фильтры domain + maxRisk
app/api/tools/catalog.js — передача новых параметров
```

## New Test Files

```
tests/compliance-score.test.js        (6 tests)
tests/requirements-api.test.js       (11 tests)
tests/classification-history.test.js  (4 tests)
tests/dashboard.test.js               (7 tests)
+ 4 tests в существующих тестах каталога
Total: 32 new tests (115 → ~147)
```

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run type-check` — 0 errors
- [ ] `npm test` — ~185 tests, 0 failures
- [ ] Requirements grouped by articles with guidance text
- [ ] complianceScore recalculated on requirement status change
- [ ] Dashboard aggregation: riskDistribution, complianceScore, requiresAttention, timeline
- [ ] Catalog: domain + maxRisk filters for alternatives block
- [ ] Multi-tenancy on all new endpoints
- [ ] AuditLog on mutations (PATCH requirement)
- [ ] Zod validation on all new APIs
