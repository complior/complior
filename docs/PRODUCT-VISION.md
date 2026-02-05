# Product Vision — AI Act Compliance Platform

**Статус:** 🚧 В РАБОТЕ — Product Owner заполняет
**Дата:** 2026-02-05
**Версия:** 0.1.0

---

## 1. Executive Summary

### Проблема (Problem Statement)
<!-- Опишите проблему, которую решает продукт -->

EU SMB (малый и средний бизнес) не может самостоятельно:
- Определить уровень риска своих AI-систем по EU AI Act
- Понять какие требования compliance применимы
- Подготовить техническую документацию для conformity assessment
- [ ] ДОПОЛНИТЕ: Какие ещё боли есть у целевой аудитории?

### Решение (Solution)
<!-- Опишите ваше решение -->

Self-service SaaS платформа, которая:
- Автоматически классифицирует AI-системы по уровням риска (AI Act Annex III)
- Даёт step-by-step guidance по compliance
- Генерирует compliance checklist и техническую документацию
- [ ] ДОПОЛНИТЕ: Какие ещё ключевые фичи должны быть?

### Ценностное предложение (Value Proposition)
<!-- Почему клиенты выберут вас? -->

**Для CTO:**
- Снижение legal risk
- Автоматизация compliance assessment
- [ ] ДОПОЛНИТЕ: Что ещё ценно для CTO?

**Для Compliance Officers:**
- Готовые чеклисты
- Документация под ключ
- [ ] ДОПОЛНИТЕ: Что ещё?

**Для Legal Teams:**
- Mapping AI систем на AI Act requirements
- Обоснования классификации
- [ ] ДОПОЛНИТЕ: Что ещё?

---

## 2. Целевая аудитория (Target Audience)

### Первичная аудитория
- **Кто:** B2B — CTO, compliance officers, legal teams
- **Размер компаний:** 10-250 сотрудников
- **География:** DACH region (Germany, Austria, Switzerland) → EU expansion
- [ ] ДОПОЛНИТЕ: Какие ещё характеристики важны?

### Вторичная аудитория
- [ ] ОПИШИТЕ: Кто ещё может использовать продукт?

### Антипаттерны (кто НЕ наша аудитория)
- [ ] ОПИШИТЕ: Кто точно не клиенты?

---

## 3. MVP Scope (что ОБЯЗАТЕЛЬНО должно быть в MVP)

### Must Have (P0)
- [ ] **User Registration & Auth**
  - Email/password registration
  - OAuth2 (Google, Microsoft)
  - JWT tokens
  - [ ] Что ещё критично для auth?

- [ ] **Risk Classification Engine**
  - POST /api/risk/classify endpoint
  - Mapping на AI Act Art. 6 risk categories
  - Input: AI system description, use case, data types
  - Output: Risk level (Unacceptable / High / Limited / Minimal)
  - [ ] Какой алгоритм классификации? (rule-based / ML / hybrid?)

- [ ] **Dashboard**
  - List of classified AI systems
  - Risk overview
  - [ ] Что ещё должно быть на dashboard?

- [ ] **ДОПОЛНИТЕ:** Какие ещё фичи обязательны для MVP?

### Should Have (P1)
- [ ] Compliance checklist generator
- [ ] Technical documentation templates
- [ ] [ ] ДОПОЛНИТЕ: Что ещё важно, но не критично?

### Could Have (P2)
- [ ] Интеграция с Jira/Linear
- [ ] Export в PDF
- [ ] [ ] ДОПОЛНИТЕ: Nice-to-have фичи?

### Won't Have (Out of Scope для MVP)
- [ ] ОПИШИТЕ: Что точно НЕ делаем в MVP?

---

## 4. Технические требования (Technical Requirements)

### Стек (Tech Stack)
**Обязательные технологии:**
- Backend: Next.js API routes ИЛИ FastAPI? [ ] ВЫБЕРИТЕ
- Frontend: Next.js 14 + React + TypeScript ✅
- Database: PostgreSQL + Prisma ORM ✅
- Auth: JWT + OAuth2 ✅
- Deployment: Docker + Kubernetes ИЛИ Vercel/Railway? [ ] ВЫБЕРИТЕ
- [ ] ДОПОЛНИТЕ: Что ещё обязательно?

**Предпочтительные (но можно заменить):**
- State management: Zustand / Jotai / Zustand? [ ] ВЫБЕРИТЕ
- UI: TailwindCSS + shadcn/ui ✅
- Testing: Vitest (BE) + Jest (FE) ✅
- [ ] ДОПОЛНИТЕ: Другие предпочтения?

### Нефункциональные требования
**Performance:**
- [ ] ОПИШИТЕ: Response time, throughput, concurrent users?

**Security:**
- [ ] ОБЯЗАТЕЛЬНО: EU data residency (GDPR)?
- [ ] Encryption at rest / in transit?
- [ ] [ ] Что ещё критично для security?

**Scalability:**
- [ ] ОПИШИТЕ: Сколько пользователей ожидаем? (10? 100? 1000?)

**Availability:**
- [ ] ОПИШИТЕ: Uptime SLA? (99%? 99.9%?)

---

## 5. Ключевые Use Cases (User Stories высокого уровня)

### Use Case 1: Регистрация и первый вход
```
As a CTO of SMB company
I want to register with my corporate email
So that I can start classifying our AI systems
```
[ ] ДЕТАЛИЗИРУЙТЕ: Какие шаги? Какие данные собираем при регистрации?

### Use Case 2: Классификация AI-системы
```
As a compliance officer
I want to describe our AI system (chatbot, recommendation engine, etc.)
So that the platform tells me the risk category
```
[ ] ДЕТАЛИЗИРУЙТЕ: Какие вопросы задаём? Сколько шагов в wizard?

### Use Case 3: [ ] ДОБАВЬТЕ ЕЩЁ USE CASES

---

## 6. Ограничения и Constraints

### Бюджетные ограничения
- [ ] ОПИШИТЕ: Бюджет на инфраструктуру? API costs (OpenAI, Mistral)?

### Временные ограничения
- [ ] ОПИШИТЕ: Дедлайн MVP? Дата запуска?

### Юридические ограничения
- [ ] ОБЯЗАТЕЛЬНО: EU data residency (хостинг только в EU?)
- [ ] GDPR compliance
- [ ] [ ] Что ещё?

### Технические ограничения
- [ ] ОПИШИТЕ: Есть ли legacy системы для интеграции?

---

## 7. Out of Scope (что НЕ делаем)

- [ ] ПЕРЕЧИСЛИТЕ: Что точно не входит в проект?
- [ ] Пример: Мы НЕ даём юридические консультации (только технический инструмент)
- [ ] Пример: Мы НЕ делаем mobile app в MVP

---

## 8. Success Metrics (как измеряем успех)

### MVP Success Criteria
- [ ] X зарегистрированных пользователей за Y месяцев?
- [ ] X классифицированных AI-систем?
- [ ] Что ещё?

### Key Metrics (после MVP)
- [ ] Monthly Active Users (MAU)?
- [ ] Conversion rate (free → paid)?
- [ ] [ ] Другие метрики?

---

## 9. Риски (Risks)

### Технические риски
- [ ] ОПИШИТЕ: Сложность алгоритма классификации?
- [ ] Изменения в AI Act после выхода MVP?

### Бизнес-риски
- [ ] ОПИШИТЕ: Конкуренты? Market fit?

### Юридические риски
- [ ] ОПИШИТЕ: Liability? Disclaimers?

---

## 10. Next Steps

После заполнения этого документа:

1. ✅ Product Owner (вы) заполняет все [ ] секции
2. ✅ Product Owner утверждает Product Vision
3. → Marcus создаёт технические артефакты Фазы 0 (на основе этого документа)
4. → Product Owner утверждает технические артефакты
5. → Sprint 001 начинается

---

## Approval Section

- [ ] **Product Owner Review:** ___________ (дата, подпись)
- [ ] **Ready for Phase 0 Technical Artifacts:** YES / NO

---

**Инструкция:** Заполните все секции с [ ], особенно:
- MVP Scope (что ОБЯЗАТЕЛЬНО)
- Use Cases (детальные сценарии)
- Tech Stack (финальный выбор технологий)
- Ограничения (бюджет, сроки, юридические)
