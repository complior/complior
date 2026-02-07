# PRODUCT-BACKLOG.md — AI Act Compliance Platform

**Версия:** 1.0.0
**Дата:** 2026-02-07
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ⛔ Ожидает утверждения Product Owner
**Зависимости:** PRODUCT-VISION.md ✅, ARCHITECTURE.md ✅, DATABASE.md ✅

---

## Метаинформация

### Формат спринтов
- **Длительность спринта:** 2 недели
- **Story Points:** шкала Фибоначчи (1, 2, 3, 5, 8, 13)
- **Скорость (velocity):** ~20-25 SP/спринт (оценка для 2 разработчиков: Max + Nina)
- **Общий объём MVP (P0+P1):** ~140 SP → ~6 спринтов (12 недель)

### Приоритеты
| Приоритет | Значение | Когда |
|-----------|----------|-------|
| **P0** | Критично для MVP — без этого продукт не запустится | Sprint 0-4 |
| **P1** | Важно — значительно повышает ценность продукта | Sprint 4-6 |
| **P2** | Желательно — расширение функциональности | Post-MVP |
| **P3** | Отложено — на будущее | Backlog |

### Теги
`[BE]` — backend, `[FE]` — frontend, `[Full]` — fullstack, `[Legal]` — AI Act экспертиза, `[UX]` — дизайн, `[DevOps]` — инфраструктура

---

## Epic 1: Инфраструктура и настройка проекта

### US-001: Инициализация проекта и toolchain
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 0 | **Теги:** `[DevOps]` `[Full]`
**Исполнитель:** Max (backend) + Nina (frontend)

**Описание:**
Как разработчик, я хочу иметь настроенный monorepo с backend и frontend,
чтобы начать реализацию фич с работающим CI/CD pipeline.

**Acceptance Criteria:**
- [ ] Monorepo структура: `src/` (backend, Onion Architecture), `frontend/` (Next.js 14)
- [ ] Backend: Fastify + MetaSQL + VM Sandbox — из existing-code
- [ ] Frontend: Next.js 14 App Router + TypeScript strict + TailwindCSS + shadcn/ui
- [ ] ESLint + Prettier настроены согласно CODING-STANDARDS.md
- [ ] Vitest (unit + integration), Playwright (E2E) — конфигурация
- [ ] GitHub Actions CI: lint, type-check, tests, `npm audit`
- [ ] Docker Compose: app + PostgreSQL (dev environment)
- [ ] `.env.example` со всеми переменными окружения

**Зависимости:** нет

---

### US-002: Схема базы данных и миграции
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 0 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как разработчик, я хочу иметь все MetaSQL-схемы и начальные миграции,
чтобы работать с полной структурой данных с первого дня.

**Acceptance Criteria:**
- [ ] Все 22 таблицы из DATABASE.md реализованы как MetaSQL schemas
- [ ] `.database.js` и `.types.js` обновлены (riskLevel, complianceStatus)
- [ ] Миграция `001_initial_schema.sql` сгенерирована и применяется
- [ ] Seed data: AI Act requirements (~50 записей), pricing plans (5 тарифов)
- [ ] Seed миграции: `002_seed_requirements.sql`, `003_seed_plans.sql`
- [ ] Все indexes из DATABASE.md §5 созданы
- [ ] `lib/db.js` расширен: поддержка транзакций (Disposable pattern)
- [ ] Тесты: создание/чтение/обновление для ключевых таблиц

**Зависимости:** US-001

---

### US-003: Настройка pg-boss и JobQueue adapter
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 0 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как разработчик, я хочу иметь систему очередей задач через pg-boss с абстракцией JobQueue,
чтобы выполнять фоновые операции (classification, document generation) и легко мигрировать на BullMQ в будущем.

**Acceptance Criteria:**
- [ ] `pg-boss` установлен и настроен (подключение к PostgreSQL)
- [ ] `domain/ports/JobQueue.js` — порт (интерфейс: enqueue, schedule, work)
- [ ] `infrastructure/jobs/pg-boss-adapter.js` — реализация через pg-boss
- [ ] GUID idempotency: каждый job содержит jobId, worker проверяет дубликаты
- [ ] Error handling: системные ошибки → retry, бизнес-ошибки → complete с error
- [ ] Тесты: enqueue/process job, idempotency check, error handling
- [ ] Документация: комментарий как создать `bullmq-adapter.js` при миграции

**Зависимости:** US-001
**Архитектура:** см. ARCHITECTURE.md §6.10

---

### US-004: Библиотека ошибок и structured logging
**Приоритет:** P0 | **SP:** 2 | **Спринт:** 0 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как разработчик, я хочу иметь иерархию ошибок AppError и structured logger,
чтобы единообразно обрабатывать ошибки и иметь читаемые логи.

**Acceptance Criteria:**
- [ ] `lib/errors.js`: AppError, NotFoundError, ForbiddenError, ValidationError, ClassificationError
- [ ] Каждая ошибка содержит: message, code, statusCode, cause (опционально)
- [ ] Fastify error handler: AppError → правильный HTTP-ответ, прочие → 500
- [ ] Structured logger (pino): JSON-формат, уровни, correlation id
- [ ] Замена `console.log` на injected logger в VM sandbox context
- [ ] Тесты: каждый тип ошибки, error handler для Fastify

**Зависимости:** US-001

---

## Epic 2: IAM (Identity & Access Management)

### US-005: Регистрация пользователя и организации
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 1 | **Теги:** `[Full]`
**Исполнитель:** Max (API) + Nina (UI)

**Описание:**
Как CTO компании в DACH-регионе, я хочу зарегистрироваться с email и описать свою компанию,
чтобы начать оценку AI-систем на соответствие EU AI Act.

**Acceptance Criteria:**
- [ ] API: `POST /api/auth/register` — создаёт Organization + User + Role(owner) + Subscription(free)
- [ ] Валидация: email (уникальный), пароль (scrypt hash), fullName, company (name, industry, size, country)
- [ ] Транзакция: все операции в одной DB-транзакции
- [ ] JWT токен + httpOnly cookie (Secure, SameSite=Strict)
- [ ] Session записывается в таблицу Session (PostgreSQL)
- [ ] AuditLog: запись `action: 'register'`
- [ ] Frontend: форма регистрации, валидация (Zod + React Hook Form)
- [ ] Responsive: mobile-first, 320px → 1440px
- [ ] Тесты: happy path, duplicate email, валидация полей

**Зависимости:** US-001, US-002

---

### US-006: Аутентификация по email magic link
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 1 | **Теги:** `[Full]`
**Исполнитель:** Max (API) + Nina (UI)

**Описание:**
Как пользователь, я хочу входить в систему через magic link по email (без пароля),
чтобы иметь безопасный и удобный вход.

**Acceptance Criteria:**
- [ ] API: `POST /api/auth/magic-link` — генерирует токен, сохраняет в Session (type='magic_link', TTL 10 мин)
- [ ] Email: отправка magic link (шаблон DE/EN)
- [ ] API: `GET /api/auth/verify?token=...` — проверяет токен, создаёт auth-сессию
- [ ] One-time use: токен удаляется после верификации
- [ ] Защита: одинаковый ответ для существующих/несуществующих email (нет enumeration)
- [ ] Frontend: страница входа, ожидание email, deep link обработка
- [ ] Rate limiting: не более 3 magic link запросов в 10 минут на email
- [ ] Тесты: полный flow, expired token, invalid token, rate limit

**Зависимости:** US-005

---

### US-007: Защита API и multi-tenancy
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 1 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как платформа, я должна обеспечить изоляцию данных между организациями,
чтобы пользователь видел только данные своей организации.

**Acceptance Criteria:**
- [ ] Auth middleware: проверка JWT/session из httpOnly cookie на каждом API-запросе
- [ ] Контекст запроса: `{ userId, organizationId, roles }` доступен в каждом handler
- [ ] RBAC: проверка Permission (role + resource + action) перед выполнением
- [ ] Multi-tenancy: ВСЕ запросы к данным фильтруются по `organizationId`
- [ ] Тесты: доступ к чужим данным → 403, отсутствие токена → 401

**Зависимости:** US-005

---

## Epic 3: Регистрация AI-систем (5-step Wizard)

### US-008: CRUD для AI-систем
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 1 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как compliance officer, я хочу создавать, просматривать, обновлять и удалять AI-системы,
чтобы управлять реестром AI-систем компании.

**Acceptance Criteria:**
- [ ] API: `POST /api/systems` — создание AI-системы (начало wizard)
- [ ] API: `GET /api/systems` — список систем организации (с пагинацией, фильтрацией по riskLevel)
- [ ] API: `GET /api/systems/:id` — детали системы (с classification и requirements)
- [ ] API: `PATCH /api/systems/:id` — обновление полей (wizard step save)
- [ ] API: `DELETE /api/systems/:id` — мягкое удаление (soft delete)
- [ ] Multi-tenancy: organizationId фильтр на всех операциях
- [ ] AuditLog: запись каждой операции
- [ ] Тесты: CRUD операции, доступ к чужой системе → 403

**Зависимости:** US-002, US-007

---

### US-009: Wizard регистрации AI-системы (frontend)
**Приоритет:** P0 | **SP:** 8 | **Спринт:** 2 | **Теги:** `[FE]` `[UX]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу пройти 5-шаговый wizard для описания AI-системы,
чтобы платформа определила уровень риска и требования compliance.

**Acceptance Criteria:**
- [ ] XState state chart для 5-step wizard (переходы вперёд/назад, сохранение состояния)
- [ ] Step 1: Basic Info — название, описание (textarea)
- [ ] Step 2: Purpose & Context — цель, область (dropdown: biometrics, HR, education, etc.)
- [ ] Step 3: Technical Details — тип модели, автономность, влияние на людей, safety component
- [ ] Step 4: Data & Users — типы данных, количество пользователей, масштаб данных
- [ ] Step 5: Review & Classify — обзор введённых данных + кнопка «Классифицировать»
- [ ] Auto-save: каждый шаг сохраняется через `PATCH /api/systems/:id`
- [ ] Валидация: React Hook Form + Zod на каждом шаге
- [ ] Progress indicator (шаги 1-5 с текущим выделением)
- [ ] Responsive: полная ширина на mobile, центрированная карточка на desktop
- [ ] WCAG AA: keyboard navigation, aria-labels, фокус-менеджмент между шагами
- [ ] Wireframe: создать до начала кодирования

**Зависимости:** US-008

---

## Epic 4: Classification Engine

### US-010: Rule-based pre-filter (Step 1 движка)
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 2 | **Теги:** `[BE]` `[Legal]`
**Исполнитель:** Max (код) + Elena (правила)

**Описание:**
Как платформа, я должна мгновенно определять очевидные случаи классификации по правилам,
чтобы не тратить время и деньги на LLM для простых случаев.

**Acceptance Criteria:**
- [ ] `domain/classification/services/RuleEngine.js` — чистая функция (без зависимостей)
- [ ] Правила Art. 5: prohibited practices (social scoring, biometric mass surveillance, etc.)
- [ ] Правила Annex III: 8 доменов high-risk (biometrics, HR, education, etc.)
- [ ] Правила safety component + Annex I products
- [ ] Output: `{ riskLevel, confidence, matchedRules[], articleReferences[] }`
- [ ] Confidence >= 90% → результат достаточен без LLM
- [ ] Тесты: по минимум 2 тест-кейса на каждый домен Annex III + Art. 5
- [ ] Elena: валидация правил на соответствие тексту AI Act

**Зависимости:** US-008

---

### US-011: LLM-классификация и cross-validation (Steps 2-3 движка)
**Приоритет:** P0 | **SP:** 8 | **Спринт:** 3 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как платформа, я должна использовать LLM для сложных случаев и cross-validation для спорных,
чтобы обеспечить точность классификации > 90%.

**Acceptance Criteria:**
- [ ] `infrastructure/llm/mistral-client.js` — клиент Mistral API (EU endpoint)
- [ ] `infrastructure/llm/llm-adapter.js` — Adapter pattern (Strategy: Small/Medium/Large)
- [ ] Step 2: Mistral Small 3.1 API → JSON-ответ `{ riskLevel, article, reasoning }`
- [ ] Step 3: при расхождении rule/LLM → escalation на Mistral Large 3 API
- [ ] Prompt engineering: system prompt с контекстом AI Act, структурированный output
- [ ] Retry + timeout: AbortSignal (15 сек), retry при 5xx (3 попытки)
- [ ] Тесты: mock Mistral API, проверка flow (rule_only → rule_plus_llm → cross_validated)

**Зависимости:** US-010

---

### US-012: Requirements mapping и сохранение классификации (Step 4 движка)
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 3 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как платформа, я должна автоматически определить требования для классифицированной системы,
чтобы пользователь сразу увидел свой checklist для compliance.

**Acceptance Criteria:**
- [ ] Mapping: riskLevel + annexCategory → набор Requirement из справочника
- [ ] Создание SystemRequirement записей (status: 'pending') для каждого применимого требования
- [ ] Обновление AISystem: riskLevel, complianceStatus, wizardCompleted
- [ ] RiskClassification: сохранение полного результата (rule + llm + cross-validation)
- [ ] ClassificationLog: запись `action: 'initial'`
- [ ] AuditLog: запись `action: 'classify'`
- [ ] Domain event: emit `SystemClassified` → пересчёт complianceScore
- [ ] Тесты: mapping для каждого riskLevel, создание requirements

**Зависимости:** US-011

---

### US-013: Экран результата классификации
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 3 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу увидеть результат классификации с обоснованием и ссылками на статьи,
чтобы понимать почему моя система получила данный уровень риска.

**Acceptance Criteria:**
- [ ] Карточка результата: risk level (цветовая индикация), confidence, метод
- [ ] Обоснование (reasoning): текст от Classification Engine
- [ ] Ссылки на статьи AI Act (articleReferences)
- [ ] Список сгенерированных requirements (checklist preview)
- [ ] CTA: «Перейти к Dashboard» / «Классифицировать ещё систему»
- [ ] Анимация перехода от wizard к результату

**Зависимости:** US-009, US-012

---

## Epic 5: Compliance Dashboard

### US-014: Compliance Dashboard — обзорная страница
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 3 | **Теги:** `[FE]` `[UX]`
**Исполнитель:** Nina

**Описание:**
Как CEO / CTO, я хочу видеть обзор всех AI-систем и статус compliance на одной странице,
чтобы быстро оценить ситуацию и доложить руководству.

**Acceptance Criteria:**
- [ ] Compliance Score (aggregate): круговой прогресс-бар (0-100%)
- [ ] Распределение по risk levels: визуальная диаграмма (prohibited, high, gpai, limited, minimal)
- [ ] Список AI-систем: таблица/карточки с названием, risk level badge, compliance score, статус
- [ ] «Требует внимания»: системы с просроченными задачами (выделено)
- [ ] Ближайшие дедлайны: список из SystemRequirement с dueDate
- [ ] Responsive grid: 1 колонка mobile → 3 колонки desktop
- [ ] Wireframe: создать до начала кодирования
- [ ] Фильтры: по risk level, по compliance status

**Зависимости:** US-008

---

### US-015: Dashboard API endpoints
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 3 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как frontend, мне нужны API endpoints для получения данных dashboard,
чтобы отображать актуальную информацию об AI-системах.

**Acceptance Criteria:**
- [ ] API: `GET /api/dashboard/overview` — агрегированные данные (score, systems по risk, deadlines)
- [ ] API: `GET /api/dashboard/attention` — системы требующие внимания
- [ ] Multi-tenancy: все данные фильтрованы по organizationId
- [ ] CQS: только queries (read-only endpoints)
- [ ] Тесты: пустая организация, организация с данными, multi-tenancy

**Зависимости:** US-007, US-008

---

### US-016: Карточка AI-системы (детальная страница)
**Приоритет:** P0 | **SP:** 3 | **Спринт:** 4 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу видеть полную информацию о конкретной AI-системе,
чтобы управлять её compliance-процессом.

**Acceptance Criteria:**
- [ ] Основная информация: название, описание, risk level badge, compliance score
- [ ] Classification details: метод, confidence, обоснование, ссылки на статьи
- [ ] Requirements checklist: список требований с прогресс-баром по каждому
- [ ] Документы: список сгенерированных compliance-документов
- [ ] Actions: «Переклассифицировать», «Создать документ», «Спросить Еву»
- [ ] Tabs или accordion для группировки секций

**Зависимости:** US-014

---

## Epic 6: Консультант Ева (базовая версия)

### US-017: Eva backend — чат с контекстом
**Приоритет:** P0 | **SP:** 8 | **Спринт:** 4 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как платформа, я должна предоставить AI-консультанта Еву для ответов на вопросы об AI Act,
чтобы пользователь мог получить помощь в реальном времени.

**Acceptance Criteria:**
- [ ] WebSocket endpoint: `/ws/chat` (Fastify ws)
- [ ] `domain/consultation/services/EvaOrchestrator.js` — оркестрация чата
- [ ] Context injection: данные пользователя, организации, AI-систем → system prompt
- [ ] Mistral Large 3 API: streaming response (SSE через WebSocket)
- [ ] Conversation persistence: Conversation + ChatMessage таблицы
- [ ] History: загрузка последних 20 сообщений при подключении
- [ ] Disclaimer: автоматическое добавление «не является юридической консультацией»
- [ ] Rate limiting: ограничение по плану (Free: 10 сообщений/день, Starter+: без лимита)
- [ ] Тесты: mock WebSocket, mock Mistral API, persistence

**Зависимости:** US-007, US-011

---

### US-018: Eva frontend — чат-виджет
**Приоритет:** P0 | **SP:** 5 | **Спринт:** 4 | **Теги:** `[FE]` `[UX]`
**Исполнитель:** Nina

**Описание:**
Как CTO без юридического бэкграунда, я хочу задавать вопросы об AI Act простым языком,
чтобы понимать что нужно делать для моего конкретного случая.

**Acceptance Criteria:**
- [ ] Chat widget: плавающая кнопка в правом нижнем углу, раскрывается в панель
- [ ] Streaming: посимвольное отображение ответа Евы
- [ ] Quick actions: предопределённые вопросы-кнопки (5-7 популярных вопросов)
- [ ] Цитирование: ссылки на статьи AI Act в ответах (выделенные блоки)
- [ ] История: переключение между Conversations
- [ ] Feedback: thumbs up/down на каждое сообщение
- [ ] Markdown rendering в сообщениях Евы
- [ ] Responsive: на mobile — полноэкранный чат
- [ ] WCAG AA: keyboard navigation, aria-live для новых сообщений

**Зависимости:** US-017

---

## Epic 7: Генерация документов (P1)

### US-019: Template engine для Technical Documentation
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 4 | **Теги:** `[BE]` `[Legal]`
**Исполнитель:** Max (код) + Elena (шаблоны)

**Описание:**
Как платформа, я должна иметь структурированные шаблоны документов по Art. 11 AI Act,
чтобы генерировать черновики Technical Documentation.

**Acceptance Criteria:**
- [ ] Шаблоны секций для Technical Documentation (Art. 11): ~8-10 секций
- [ ] Каждый шаблон: structure (заголовки, подразделы), prompts для LLM, контекстные данные
- [ ] API: `POST /api/compliance/documents` — создание документа из шаблона
- [ ] API: `GET /api/compliance/documents/:id` — документ с секциями
- [ ] Создание DocumentSection записей (status: 'empty') для каждой секции шаблона
- [ ] Elena: валидация структуры шаблонов на соответствие Art. 11

**Зависимости:** US-012

---

### US-020: LLM-генерация секций документа
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 5 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как compliance officer, я хочу генерировать черновики секций документации через AI,
чтобы не писать каждый раздел с нуля.

**Acceptance Criteria:**
- [ ] API: `POST /api/compliance/documents/:docId/sections/:code/generate`
- [ ] Задача ставится в pg-boss queue (async, GUID idempotency)
- [ ] Worker: загрузка AISystem + Classification + Requirements → prompt для Mistral Medium 3
- [ ] Prompt: шаблон секции + данные системы + требования → структурированный черновик
- [ ] Сохранение: content (сгенерированный) + aiDraft (оригинал) в DocumentSection
- [ ] WebSocket уведомление: `{ type: 'section_ready', sectionCode }` при завершении
- [ ] Тесты: mock Mistral, проверка сохранения, idempotency

**Зависимости:** US-003, US-019

---

### US-021: Редактор документов и экспорт
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 5 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу редактировать сгенерированные черновики и экспортировать в PDF,
чтобы получить готовый документ для аудита.

**Acceptance Criteria:**
- [ ] Rich text editor (Tiptap) для редактирования секций
- [ ] Section-by-section workflow: Generate → Edit → Approve для каждой секции
- [ ] «Сбросить к AI-черновику»: возврат к aiDraft
- [ ] Прогресс документа: X из Y секций approved
- [ ] API: `PATCH /api/compliance/documents/:docId/sections/:code` — сохранение правок
- [ ] API: `POST /api/compliance/documents/:docId/sections/:code/approve` — утверждение секции
- [ ] Экспорт: `POST /api/compliance/documents/:docId/export` → PDF через pg-boss job
- [ ] Скачивание PDF по готовности (S3 link)

**Зависимости:** US-020

---

## Epic 8: Gap Analysis (P1)

### US-022: Gap Analysis — backend
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 5 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как compliance officer, я хочу видеть какие требования выполнены, какие нет, и что нужно сделать,
чтобы составить план действий для compliance.

**Acceptance Criteria:**
- [ ] API: `GET /api/compliance/gap-analysis/:aiSystemId`
- [ ] `domain/compliance/services/GapAnalyzer.js` — анализ gaps
- [ ] Для каждого requirement: статус (fulfilled/in_progress/gap), прогресс %
- [ ] Action plan: Mistral Medium 3 → рекомендации по закрытию gaps
- [ ] Estimated effort (часы) из справочника Requirement
- [ ] Приоритизация: risk level + proximity к deadline
- [ ] Тесты: система без requirements, частично выполненная, полностью compliant

**Зависимости:** US-012

---

### US-023: Gap Analysis — frontend
**Приоритет:** P1 | **SP:** 3 | **Спринт:** 5 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу видеть наглядный gap analysis с action plan,
чтобы понимать что именно нужно делать и в каком порядке.

**Acceptance Criteria:**
- [ ] Три секции: Fulfilled ✅, In Progress 🔄, Gaps ❌
- [ ] Каждый gap: требование, приоритет, рекомендованные шаги, estimated effort
- [ ] Progress bar по каждому требованию
- [ ] Overall compliance score
- [ ] CTA: «Начать работу» (переход к созданию документа для конкретного gap)

**Зависимости:** US-022

---

## Epic 9: Billing & подписки (P1)

### US-024: Stripe интеграция и управление подписками
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 5 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как пользователь, я хочу перейти с Free на платный план через Stripe,
чтобы получить доступ к полным возможностям платформы.

**Acceptance Criteria:**
- [ ] API: `POST /api/billing/checkout` — создание Stripe Checkout session
- [ ] API: `POST /api/webhooks/stripe` — обработка webhooks (checkout.completed, invoice.paid, payment_failed)
- [ ] Верификация Stripe webhook signature
- [ ] Обновление Subscription: plan, status, period
- [ ] Feature limits: проверка maxSystems, maxUsers из Plan при создании ресурсов
- [ ] Notification при payment failure
- [ ] AuditLog: все операции с подписками
- [ ] Тесты: webhook handling, feature limits, plan upgrade

**Зависимости:** US-002, US-007

---

### US-025: Pricing page и управление подпиской (frontend)
**Приоритет:** P1 | **SP:** 3 | **Спринт:** 6 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как пользователь, я хочу видеть тарифы и управлять подпиской,
чтобы выбрать подходящий план.

**Acceptance Criteria:**
- [ ] Pricing page: 5 тарифов (Free, Starter, Growth, Scale, Enterprise)
- [ ] Comparison table: лимиты, фичи, цены
- [ ] Текущий план: выделен, кнопка «Upgrade»
- [ ] Redirect на Stripe Checkout при нажатии «Upgrade»
- [ ] Settings → Billing: текущий план, следующий платёж, кнопка отмены
- [ ] Уведомления: payment failed, план изменён

**Зависимости:** US-024

---

## Epic 10: Eva полная версия (P1)

### US-026: Eva tool calling — classify, search, create_document
**Приоритет:** P1 | **SP:** 5 | **Спринт:** 6 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как пользователь, я хочу просить Еву выполнять действия (классифицировать систему, искать в AI Act, создать документ),
чтобы управлять compliance через чат.

**Acceptance Criteria:**
- [ ] Tool definitions для Mistral: `classify_system`, `search_regulation`, `create_document`
- [ ] `classify_system`: запуск ClassificationEngine через чат
- [ ] `search_regulation`: поиск по Requirement таблице (articleReference, description)
- [ ] `create_document`: создание ComplianceDocument для указанной системы
- [ ] Tool result → продолжение генерации ответа с результатом
- [ ] Сохранение toolCalls в ChatMessage
- [ ] Тесты: каждый tool, tool call → response flow

**Зависимости:** US-017, US-012, US-019

---

## Epic 11: Onboarding и polish (P1)

### US-027: Страница онбординга
**Приоритет:** P1 | **SP:** 3 | **Спринт:** 6 | **Теги:** `[Full]`
**Исполнитель:** Nina (UI) + Max (API)

**Описание:**
Как новый пользователь, я хочу пройти quick assessment после регистрации,
чтобы сразу понять масштаб работы по compliance.

**Acceptance Criteria:**
- [ ] Quick questionnaire: 5-7 вопросов о компании и использовании AI
- [ ] API: `POST /api/onboarding/quick-assessment` → Mistral Large 3 (оценка)
- [ ] Результат: «У вас ~X систем, Y потенциально high-risk»
- [ ] CTA: «Добавить первую систему» → переход к wizard
- [ ] Ева приветствует пользователя и предлагает помощь

**Зависимости:** US-005, US-017

---

### US-028: Notifications система
**Приоритет:** P1 | **SP:** 3 | **Спринт:** 6 | **Теги:** `[Full]`
**Исполнитель:** Max (API) + Nina (UI)

**Описание:**
Как пользователь, я хочу получать уведомления о важных событиях,
чтобы не пропустить дедлайны и изменения.

**Acceptance Criteria:**
- [ ] API: `GET /api/notifications` — список уведомлений (paginated, unread first)
- [ ] API: `PATCH /api/notifications/:id/read` — отметить прочитанным
- [ ] Типы: classification_complete, document_ready, deadline_approaching, compliance_change
- [ ] Notification bell в header с badge (count unread)
- [ ] Dropdown с последними уведомлениями
- [ ] Domain events → создание Notification (EventEmitter listeners)

**Зависимости:** US-007

---

## Epic 12: Regulatory Monitor (P2 — post-MVP)

### US-029: EUR-Lex scraper
**Приоритет:** P2 | **SP:** 5 | **Спринт:** 7 | **Теги:** `[BE]`
**Исполнитель:** Max

**Описание:**
Как платформа, я должна автоматически отслеживать изменения в AI Act и related документах,
чтобы уведомлять пользователей о regulatory updates.

**Acceptance Criteria:**
- [ ] `infrastructure/monitoring/eurlex-scraper.js` — scraping EUR-Lex API
- [ ] pg-boss scheduled job: ежедневно в 02:00 UTC
- [ ] Дедупликация: проверка URL перед вставкой
- [ ] LLM-анализ: Mistral Small → affected articles, impact level
- [ ] Impact assessment: определение затронутых AI-систем
- [ ] Notification создание для затронутых пользователей
- [ ] Тесты: mock EUR-Lex API, дедупликация, impact assessment

**Зависимости:** US-003, US-028

---

### US-030: Dashboard regulatory updates
**Приоритет:** P2 | **SP:** 3 | **Спринт:** 7 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как compliance officer, я хочу видеть regulatory updates и их влияние на мои системы,
чтобы вовремя реагировать на изменения в законодательстве.

**Acceptance Criteria:**
- [ ] Секция «Regulatory Updates» на dashboard
- [ ] Список обновлений: дата, источник, summary, impact level
- [ ] Impact per system: какие системы затронуты
- [ ] «Acknowledge» button: отметить что обновление обработано

**Зависимости:** US-029

---

## Epic 13: Дополнительные документы (P2)

### US-031: Risk Assessment генерация (Art. 9)
**Приоритет:** P2 | **SP:** 5 | **Спринт:** 7 | **Теги:** `[BE]` `[Legal]`
**Исполнитель:** Max (код) + Elena (шаблоны)

**Описание:**
Как compliance officer с high-risk системой, я хочу сгенерировать Risk Assessment,
чтобы выполнить требование Art. 9 AI Act.

**Acceptance Criteria:**
- [ ] Шаблон Risk Assessment: секции по Art. 9
- [ ] Генерация через pg-boss + Mistral Medium 3
- [ ] Workflow: generate → edit → approve → export (аналогично US-020/021)

**Зависимости:** US-020

---

### US-032: Conformity Declaration генерация (Art. 47)
**Приоритет:** P2 | **SP:** 3 | **Спринт:** 8 | **Теги:** `[BE]` `[Legal]`
**Исполнитель:** Max (код) + Elena (шаблон)

**Описание:**
Как compliance officer, я хочу сгенерировать EU Declaration of Conformity,
чтобы выполнить требование Art. 47 AI Act.

**Acceptance Criteria:**
- [ ] Шаблон Conformity Declaration по Art. 47
- [ ] Pre-fill из данных системы и классификации
- [ ] Export в PDF

**Зависимости:** US-020

---

## Epic 14: Multi-language (P2)

### US-033: Интернационализация DE/EN
**Приоритет:** P2 | **SP:** 5 | **Спринт:** 8 | **Теги:** `[FE]`
**Исполнитель:** Nina

**Описание:**
Как пользователь из Австрии/Швейцарии, я хочу использовать платформу на немецком или английском,
чтобы работать на привычном языке.

**Acceptance Criteria:**
- [ ] i18n библиотека (next-intl) настроена
- [ ] Все UI-тексты вынесены в translation files (DE, EN)
- [ ] User locale из профиля (default: DE)
- [ ] Language switcher в header
- [ ] Eva отвечает на языке пользователя (prompt engineering)

**Зависимости:** US-005

---

## Сводка по спринтам

| Спринт | Недели | User Stories | SP | Фокус |
|--------|--------|-------------|:---:|-------|
| **Sprint 0** | 1-2 | US-001, 002, 003, 004 | 15 | Инфраструктура, DB, toolchain |
| **Sprint 1** | 3-4 | US-005, 006, 007, 008 | 16 | IAM, auth, CRUD систем |
| **Sprint 2** | 5-6 | US-009, 010 | 13 | Wizard UI, rule engine |
| **Sprint 3** | 7-8 | US-011, 012, 013, 014, 015 | 22 | Classification, dashboard |
| **Sprint 4** | 9-10 | US-016, 017, 018, 019 | 21 | Детали системы, Eva, templates |
| **Sprint 5** | 11-12 | US-020, 021, 022, 023, 024 | 23 | Doc gen, gap analysis, billing |
| **Sprint 6** | 13-14 | US-025, 026, 027, 028 | 14 | Eva tools, onboarding, notifications |
| **Sprint 7** | 15-16 | US-029, 030, 031 | 13 | Regulatory monitor, risk assessment |
| **Sprint 8** | 17-18 | US-032, 033 | 8 | Conformity declaration, i18n |
| **Итого** | | **33 User Stories** | **145** | |

---

## Спринт-план: P0 vs P1 vs P2

```
Sprint 0-3 (8 недель):  ████████████ P0 — ядро MVP
Sprint 4-6 (6 недель):  ████████ P1 — полноценный продукт
Sprint 7-8 (4 недели):  ████ P2 — расширение
```

**MVP-ready (P0 завершены):** Sprint 3 (неделя 8) — классификация, dashboard, базовая Eva
**Product-ready (P0+P1):** Sprint 6 (неделя 14) — документы, gap analysis, billing, Eva tools
**Full scope:** Sprint 8 (неделя 18) — regulatory monitor, multi-language

---

## Архитектурные решения для backlog

| Решение | Обоснование |
|---------|-------------|
| **pg-boss** вместо BullMQ+Redis | PostgreSQL-only на MVP: -1 сервис, проще деплой. JobQueue adapter для миграции (ARCHITECTURE.md §6.10) |
| **Session в PostgreSQL** | Таблица Session с index — достаточно для 50 пользователей. Redis при масштабировании |
| **Без кэширования на MVP** | 50 пользователей — PostgreSQL справится с прямыми запросами. Кэш добавить при необходимости |
| **Rate limiting in-process** | Map + sliding window — достаточно для одного сервера. Redis при горизонтальном масштабировании |

---

⛔ **APPROVAL GATE:** Product Owner должен утвердить Product Backlog перед Sprint Planning.
