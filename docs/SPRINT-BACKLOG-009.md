# Sprint Backlog 009 — Unified Registry + Compliance Outputs + Regulator Integration

**Sprint Goal:** Дать deployer'у возможность доказать compliance третьим сторонам: единый реестр AI систем с lifecycle, embeddable compliance badge, vendor document request с юридическими ссылками, EU Database helper, remediation playbooks, регулятор-справочник, мониторинг изменений в законодательстве.
**Статус:** Planned (post-overlap audit v4.0)

**Capacity:** 48 SP (40 новых + 8 carry-over из S8) | **Duration:** 4 недели
**Developers:** Max (Backend), Nina (Frontend), Leo (Infra)
**Baseline:** 546 tests (Sprint 8) → **New: ~39 tests (total: ~585)**

> **Prerequisite:** Sprint 8 merged + audited (12 P0 fixes applied). FRIA generator, Audit Package, CLI Sync + Device Flow auth, Gap Analysis — всё работает.

> **Overlap audit (v4.0):** Проверка S9 против реализованных S0-S8 выявила ~8 SP дублирующего scope. Четыре US переоценены: US-091 (5→3, расширяем `/api/tools` вместо параллельной системы), US-092 (4→2, wizard steps 3-5 уже существуют в S2), US-094 (5→2, document workflow уже в S8), US-086 (3→2, TimelineWidget уже есть). Четыре схемы (Notification, RegulatoryUpdate, ImpactAssessment, AIToolDiscovery) убраны из scope создания — уже существуют.

**Контекст разработки:** Вся реализация ДОЛЖНА соответствовать правилам, описанным в `docs/CODING-STANDARDS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` и `docs/DATA-FLOWS.md`. В частности: DDD/Onion слои (domain → application → api), VM-sandbox (никаких `require()` в `app/`), CQS, factory functions вместо классов, Zod-валидация на всех API, explicit `resolveSession`/`checkPermission` в каждом handler, multi-tenancy через `organizationId`. Тарифные лимиты определены в `app/config/plans.js` (single source of truth).

---

## Граф зависимостей

```
US-091 (Registry ext) ──┬──► US-092 (Wizard ext)
                         ├──► US-093 (Passport) ──┬──► US-097 (EU DB)
                         │                         └──► US-102 (Data Source)
                         ├──► US-099 (Cert Dashboard)
                         └──► US-103 (Remediation)

US-098 (Regulator Dir) ──► US-097 (EU DB)
US-100 (Notifications) ──► US-104 (Regulatory Monitoring)

US-086, US-089, US-090, US-094, US-095, US-096, US-101 — независимые
```

---

## User Stories

### Phase 1: Foundation + Carry-over (10 SP)

#### US-091: Расширение Inventory → Unified Registry View (3 SP)

- **Feature:** F39 | **Developer:** Max (backend) + Nina (frontend)

##### Описание

Как compliance officer, я хочу видеть единый реестр ВСЕХ AI систем организации — добавленных вручную через wizard, найденных CLI-сканером, обнаруженных через IdP Discovery — с управлением жизненным циклом и возможностью приостановить систему одной кнопкой. Мне нужны фильтры по источнику, уровню риска и lifecycle-статусу, чтобы в любой момент понимать полную картину.

> **Overlap audit:** `/api/tools` уже предоставляет полный CRUD + категоризацию + riskLevel (S1-S2). Создание параллельного `/api/registry/systems` — архитектурная ошибка. Вместо этого расширяем существующий Inventory тремя полями и строим unified view поверх него.

##### Реализация

**Модифицированные файлы:**
- `app/schemas/AITool.js` — добавить поля: `lifecycle` (enum: active/suspended/decommissioned), `source` (enum: manual/cli_scan/discovery/registry_autofill), `autonomyLevel` (enum: L1-L5)
- `app/api/tools/list.js` — добавить query params: `?source=cli&lifecycle=active&autonomyLevel=L3`
- `app/api/tools/detail.js` — вернуть новые поля в ответе

**Новые файлы:**
- `app/api/tools/lifecycle.js` — PATCH `/api/tools/:id/lifecycle`
- `app/api/tools/stats.js` — GET `/api/tools/stats` (aggregate по risk, source, lifecycle)
- `frontend/app/[locale]/(app)/registry/page.tsx` — unified registry UI поверх `/api/tools`
- `frontend/components/registry/LifecycleControl.tsx` — toggle active/suspended/decommissioned

##### Критерии приёмки

- [ ] Существующий `/api/tools` расширен полями lifecycle, source, autonomyLevel
- [ ] Unified view объединяет CLI + Manual + Discovery через существующую таблицу AITool
- [ ] Per-system: name, vendor, risk, autonomy level (L1-L5), score, passport %, lifecycle
- [ ] Kill switch: Suspend → система помечена, исключена из active compliance
- [ ] Source indicator: "CLI scan, Feb 27" или "Manual entry"
- [ ] Lifecycle transitions: active → suspended → decommissioned
- [ ] Фильтрация: по risk, source, lifecycle, owner
- [ ] НЕ создаёт параллельный API — расширяет `/api/tools`

- **Tests:** 3 (lifecycle_transitions.test, source_filter.test, stats_aggregation.test)
- **Dependencies:** None
- **Разблокирует:** US-092, US-093, US-099, US-103

---

#### US-086: Compliance Timeline — расширение виджета (2 SP) — carry-over

- **Feature:** F48 | **Developer:** Nina

##### Описание

Как deployer, я хочу видеть визуальную шкалу с реальными дедлайнами EU AI Act — сколько дней осталось до каждого, что на критическом пути, какие обязательства просрочены — чтобы планировать работу по compliance и не пропустить ни один дедлайн.

> **Overlap audit:** `TimelineWidget.tsx` и `getDashboardSummary` с базовыми timeline-данными уже существуют (S8). Нужен backend endpoint для расширенных данных + доработка виджета.

##### Реализация

**Новые файлы:**
- `app/api/dashboard/timeline.js` — GET `/api/dashboard/timeline` (дедлайны + days remaining + critical path)
- `app/application/dashboard/buildTimeline.js` — application use case

**Модифицированные файлы:**
- `frontend/components/dashboard/TimelineWidget.tsx` — расширить существующий виджет

##### Критерии приёмки

- [ ] Визуальная шкала с ключевыми датами EU AI Act (Art. 113)
- [ ] Days remaining для каждого дедлайна
- [ ] Critical path: какие обязательства блокируют compliance
- [ ] Overdue items подсвечены красным
- [ ] Данные из backend, не hardcoded на фронте

- **Tests:** 2 (timeline_deadlines.test, overdue_detection.test)
- **Dependencies:** None (S8 carry-over)

---

#### US-089: TUI Daemon Push — SSE real-time (2 SP) — carry-over

- **Feature:** F27 | **Developer:** Leo

##### Описание

Как deployer, после запуска CLI sync я хочу видеть обновления на Dashboard в реальном времени — без перезагрузки страницы — чтобы сразу убедиться, что данные синхронизировались.

##### Реализация

**Новые файлы:**
- `app/api/events/stream.js` — GET `/api/events/stream` (SSE endpoint)
- `server/src/event-bus.js` — in-process EventEmitter

**Модифицированные файлы:**
- `app/api/sync/passport.js` — emit event после sync
- `app/api/sync/scan.js` — emit event после scan

##### Критерии приёмки

- [ ] SSE endpoint `GET /api/events/stream` с reconnect logic
- [ ] Dashboard обновляется в реальном времени после CLI sync
- [ ] In-process EventEmitter (без Redis, без отдельного процесса)
- [ ] Graceful disconnect при закрытии вкладки

- **Tests:** 2 (sse_connection.test, event_emission.test)
- **Dependencies:** CLI Sync (S8)

---

#### US-098: Справочник регуляторов (3 SP)

- **Feature:** F53 | **Developer:** Leo

##### Описание

Как deployer, я хочу знать, какой регулятор (Market Surveillance Authority) отвечает за мою страну и сектор — и какие документы они запросят при проверке — чтобы заранее подготовить всё необходимое.

##### Реализация

**Новые файлы:**
- `app/seeds/seed-regulators.js` — 30 MSA записей (27 EU + 3 EEA)
- `app/schemas/Regulator.js` — MetaSQL (country, sector, msaName, contact, requirements)
- `app/api/regulators/directory.js` — GET `/api/regulators?country=DE&sector=financial`
- `frontend/app/[locale]/(app)/regulators/page.tsx` — directory UI с селекторами страна/сектор
- `frontend/components/regulators/RegulatorCard.tsx` — карточка регулятора

##### Критерии приёмки

- [ ] 30 MSA записей (27 EU + 3 EEA стран)
- [ ] Фильтрация по стране и сектору
- [ ] Per-MSA: контакт, сайт, требуемые документы, национальные требования
- [ ] Auto-link на `Passport.regulatoryContext.msaName`

- **Tests:** 2 (regulator_directory_query.test, country_sector_filter.test)
- **Dependencies:** None
- **Разблокирует:** US-097 (MSA data)

---

### Phase 2: Core Extensions (11 SP)

#### US-093: Расширенные поля Passport (3 SP)

- **Feature:** F56 | **Developer:** Max

##### Описание

Как compliance officer, я хочу чтобы Passport AI системы содержал все поля, нужные для Audit Package и взаимодействия с регулятором: regulatory context (страна, сектор, MSA), инциденты, post-market monitoring, conformity assessment, compliance records и история обращений в MSA — чтобы иметь полную compliance-картину в одном месте.

##### Реализация

**Модифицированные файлы:**
- `app/schemas/AITool.js` — расширить passport JSON: 6 новых блоков (regulatoryContext, incidents, postMarketMonitoring, conformityAssessment, complianceRecords, msaSubmissions)
- `app/api/tools/passport.js` — PATCH endpoint для новых полей
- `app/application/tool/updatePassport.js` — валидация новых блоков

##### Критерии приёмки

- [ ] 6 новых блоков в Passport schema
- [ ] PATCH endpoint: partial update любого блока
- [ ] Валидация: regulatoryContext требует country
- [ ] Backward compatible: существующие инструменты не ломаются
- [ ] msaSubmissions с lifecycle статусов: submitted → acknowledged → completed

- **Tests:** 2 (passport_extended_fields.test, passport_backward_compat.test)
- **Dependencies:** US-091
- **Разблокирует:** US-097, US-102

---

#### US-094: Wizard-страницы для документов — QMS, Risk Plan, Monitoring Plan (2 SP)

- **Feature:** F57, F58, F59 | **Developer:** Max (pre-fill) + Nina (UI)

##### Описание

Как compliance officer, я хочу удобные wizard-страницы для создания QMS, Risk Management Plan и Monitoring Plan — с автоматическим pre-fill из данных организации, Gap Analysis и Passport — чтобы не начинать документ с чистого листа, а получить 60% заполненный черновик.

> **Overlap audit:** Весь document workflow УЖЕ работает из S8: ComplianceDocument schema с типами `qms_template`/`risk_assessment`/`monitoring_plan`, templates.js с секциями, `generateDraft.js` → LLM, `approveSection.js`, `exportPdf.js`. Здесь создаём только entry point страницы и pre-fill logic.

##### Реализация

**Новые файлы:**
- `frontend/app/[locale]/(app)/documents/qms/page.tsx` — QMS wizard (~50 строк)
- `frontend/app/[locale]/(app)/documents/risk-plan/page.tsx` — Risk Plan wizard (~50 строк)
- `frontend/app/[locale]/(app)/documents/monitoring-plan/page.tsx` — Monitoring Plan wizard (~50 строк)
- `app/application/documents/prefillFromPassport.js` — pre-fill helper

**Модифицированные файлы:**
- `frontend/messages/en.json` + `de.json` — i18n для wizard pages

##### Критерии приёмки

- [ ] QMS wizard: org data pre-fill → create document → переход в S8 workflow
- [ ] Risk Plan wizard: выбор инструмента + pre-fill из Gap Analysis → S8 workflow
- [ ] Monitoring Plan wizard: выбор инструмента + pre-fill из Passport → S8 workflow
- [ ] Pre-fill сокращает ручной ввод на ~60%
- [ ] Growth+ план (enforcement уже в S8 middleware)
- [ ] НЕ дублирует S8 workflow — только wizard entry points + pre-fill

- **Tests:** 2 (qms_prefill_from_org.test, risk_plan_prefill_from_gap.test)
- **Dependencies:** F07 (S8)

---

#### US-092: Расширение Wizard шагов 3-5 (2 SP)

- **Feature:** F46 | **Developer:** Nina

##### Описание

Как deployer, я хочу при регистрации AI инструмента указать географию развёртывания (EU / конкретные страны / глобально), увидеть подробные описания уровней автономности L1-L5 со ссылками на Art. 14, получить предупреждение при L4/L5 + high-risk, и одной кнопкой перейти к FRIA для high-risk систем — чтобы wizard провёл меня через все нужные шаги.

> **Overlap audit:** Шаги 3, 4, 5 полностью реализованы в S2 (`Step3Data.tsx` 168 строк, `Step4Autonomy.tsx` 140 строк, `Step5Review.tsx` 163 строки). Здесь только расширяем существующие компоненты.

##### Реализация

**Модифицированные файлы:**
- `frontend/components/wizard/Step3Data.tsx` — добавить поле geography
- `frontend/components/wizard/Step4Autonomy.tsx` — L1-L5 подробные описания, Art. 14 inline hints, escalation warning
- `frontend/components/wizard/Step5Review.tsx` — кнопка "Save & Generate FRIA" для high-risk
- `frontend/messages/en.json` + `de.json` — i18n для новых полей

##### Критерии приёмки

- [ ] Step 3: поле geography (EU / конкретные страны / глобально)
- [ ] Step 4: L1-L5 с расширенными описаниями и Art. 14 inline guidance
- [ ] Step 4: auto-escalation warning при L4/L5 + high-risk домен
- [ ] Step 5: "Save & Generate FRIA" shortcut для high-risk инструментов
- [ ] НЕ создаёт новые компоненты — расширяет существующие Step3/4/5

- **Tests:** 2 (wizard_geography_field.test, fria_shortcut.test)
- **Dependencies:** US-091

---

#### US-100: Онбординг + Система уведомлений (4 SP)

- **Feature:** F11 | **Developer:** Nina (frontend) + Leo (backend)

##### Описание

Как новый пользователь, я хочу при первом входе пройти 4-step onboarding (роль, количество AI инструментов, главная проблема) и получить персонализированный dashboard. Как действующий пользователь, я хочу получать уведомления о приближающихся дедлайнах, просроченном AI Literacy, отсутствующем FRIA, новых обнаруженных инструментах — в bell-иконке и по email (instant / daily / weekly digest).

> **Примечание:** Схема `Notification.js` уже существует (S3). Используем её, не создаём новую.

##### Реализация

**Новые файлы:**
- `app/api/notifications/list.js` — GET `/api/notifications` (paginated)
- `app/api/notifications/preferences.js` — PATCH email frequency setting
- `app/application/notifications/checkDeadlines.js` — логика проверки дедлайнов
- `app/jobs/notification-checker.js` — pg-boss daily cron
- `frontend/app/[locale]/(app)/onboarding/page.tsx` — 4-step wizard
- `frontend/components/notifications/NotificationBell.tsx` — bell icon + dropdown
- `frontend/components/notifications/NotificationCenter.tsx` — полный список

**Модифицированные файлы:**
- `server/main.js` — регистрация pg-boss cron job

##### Критерии приёмки

- [ ] Onboarding wizard: 4 шага → персонализированный dashboard
- [ ] Уведомления: deadline, AI Literacy, FRIA, new tool, requirements
- [ ] In-app bell с badge-счётчиком непрочитанных
- [ ] Email: instant / daily / weekly digest (user preference)
- [ ] pg-boss cron: ежедневная проверка дедлайнов
- [ ] Использует существующую схему `Notification.js` (S3)

- **Tests:** 3 (deadline_notification.test, onboarding_flow.test, notification_preferences.test)
- **Dependencies:** None
- **Разблокирует:** US-104 (notification channel)

---

### Phase 3: External Outputs (17 SP)

#### US-090: Vendor Verification + Procurement API (4 SP) — carry-over

- **Feature:** F38 | **Developer:** Max (backend) + Nina (frontend)

##### Описание

Как вендор AI инструмента, я хочу подтвердить данные о своём продукте в Registry (vendor claim) и получить значок "Verified". Как deployer, я хочу использовать Procurement API для получения верифицированных данных о вендоре при закупке.

##### Реализация

**Новые файлы:**
- `app/schemas/VendorClaim.js` — MetaSQL (vendor, tool, status, verifiedAt)
- `app/api/registry/vendor-claim.js` — POST submit + GET status + PATCH admin review
- `app/api/v1/registry/procurement.js` — GET `/v1/registry/procurement/:slug` (single + batch)
- `frontend/components/registry/VendorClaimForm.tsx` — форма подачи claim

##### Критерии приёмки

- [ ] Vendor claim submission + admin review workflow
- [ ] "Verified" badge на инструменте после одобрения
- [ ] Procurement API: single slug + batch запросы
- [ ] Passport auto-fill из верифицированных Registry данных

- **Tests:** 4 (vendor_claim_submit.test, admin_review.test, procurement_api.test, passport_autofill.test)
- **Dependencies:** Registry API (S7)

---

#### US-103: Remediation Cloud — playbooks для устранения gaps (3 SP)

- **Feature:** F31 | **Developer:** Max

##### Описание

Как compliance officer, после Gap Analysis я хочу получить пошаговые remediation playbooks: "У системы X нет human oversight → вот конкретные шаги → нажмите → генерируем документ." Каждый шаг с action-кнопкой, чтобы от анализа проблемы до её решения было минимум кликов.

##### Реализация

**Новые файлы:**
- `app/schemas/RemediationPlaybook.js` — MetaSQL (toolId, category, steps, status, progress)
- `app/domain/compliance/services/RemediationEngine.js` — pure: `generatePlaybook(gapResult) → Playbook[]`
- `app/application/compliance/generatePlaybooks.js` — application use case
- `app/api/remediation/playbooks.js` — POST generate + GET by tool + POST complete step
- `app/seeds/remediation-templates.js` — 12 AESIA playbook templates
- `frontend/components/compliance/RemediationPanel.tsx` — UI panel

**Модифицированные файлы:**
- `frontend/app/[locale]/(app)/gap-analysis/[toolId]/page.tsx` — embed RemediationPanel

##### Критерии приёмки

- [ ] Playbooks генерируются из Gap Analysis результатов (12 AESIA категорий)
- [ ] Каждый шаг имеет тип действия: generate document, manual action, configure
- [ ] Шаги можно отмечать выполненными с tracking прогресса
- [ ] "Generate Document" ведёт к Doc Generators (F07)
- [ ] Сортировка по приоритету: критические gaps первыми
- [ ] Оценка трудозатрат по каждой категории

- **Tests:** 2 (playbook_generation.test, step_completion.test)
- **Dependencies:** US-091, Gap Analysis (S8)

---

#### US-095: Compliance Badge — embeddable виджет (3 SP)

- **Feature:** F50 | **Developer:** Nina

##### Описание

Как CEO, я хочу разместить на нашем сайте embeddable badge "AI Act Compliant" с уровнем (Bronze / Silver / Gold) — чтобы клиенты и партнёры видели нашу compliance. По клику на badge открывается публичная страница верификации. Если score падает ниже порога — badge автоматически переходит в "Under Review".

##### Реализация

**Новые файлы:**
- `app/api/badge/[orgSlug].js` — GET public badge data (no auth)
- `app/api/badge/my/stats.js` — GET badge views/clicks
- `app/application/badge/evaluateBadgeCriteria.js` — чистая функция оценки уровня
- `frontend/app/[locale]/(app)/badge/page.tsx` — управление badge
- `frontend/app/[locale]/(public)/verify/[orgSlug]/page.tsx` — публичная верификация
- `public/badge.js` — embeddable script для внешних сайтов

##### Критерии приёмки

- [ ] 3 уровня: Bronze (70+), Silver (85+), Gold (95+ + AI Literacy 100% + FRIA done)
- [ ] Embeddable script работает на внешних сайтах (CORS)
- [ ] Публичная страница верификации без авторизации
- [ ] Статистика: views + clicks tracked
- [ ] При падении score ниже порога → badge "Under Review"
- [ ] Growth+ план required

- **Tests:** 2 (badge_criteria.test, badge_public_endpoint.test)
- **Dependencies:** None

---

#### US-096: Vendor Documentation Request — запрос документов у вендора (4 SP)

- **Feature:** F51 | **Developer:** Nina (frontend) + Max (backend)

##### Описание

Как deployer, я хочу запросить у вендора недостающую документацию по Art. 13 и Art. 26 — с готовым email-шаблоном, юридическими ссылками, списком конкретных недостающих документов — и отслеживать статус: отправлено → ожидание → получено → прикреплено к Passport. Полученные документы обогащают Community Evidence в Registry.

> Уникальная фича — нет у конкурентов.

##### Реализация

**Новые файлы:**
- `app/schemas/VendorRequest.js` — MetaSQL (vendor, tool, status, documents requested)
- `app/api/vendor-requests/create.js` — POST создать запрос + сгенерировать email
- `app/api/vendor-requests/list.js` — GET список по организации
- `app/api/vendor-requests/update.js` — PATCH обновить статус + прикрепить документы
- `app/application/vendor/generateRequestEmail.js` — шаблон с Art. 13 §1, Art. 26 §3
- `frontend/app/[locale]/(app)/vendor-requests/page.tsx` — список + создание
- `frontend/components/vendor/RequestEmailPreview.tsx` — предпросмотр email

##### Критерии приёмки

- [ ] Недостающие документы определяются из Passport + Registry данных
- [ ] Email-шаблон с юридическими ссылками (Art. 13, Art. 26)
- [ ] Отправка через Brevo или copy-paste
- [ ] Tracking статусов: sent → waiting → received
- [ ] Полученные документы прикрепляются к Passport
- [ ] Community Evidence: полученные документы улучшают Registry scoring

- **Tests:** 3 (vendor_request_email.test, request_status_tracking.test, document_attachment.test)
- **Dependencies:** None

---

#### US-097: EU Database Helper — помощь с регистрацией (3 SP)

- **Feature:** F47 | **Developer:** Leo

##### Описание

Как deployer high-risk AI системы, я хочу получить помощь с регистрацией в EU Database (Art. 49, ~40 полей) — система предзаполняет 60-90% из Passport, показывает checklist готовности по каждому полю, и даёт copy-paste friendly экспорт для вставки в EU Database.

##### Реализация

**Новые файлы:**
- `app/domain/eu-database/EUDatabaseFields.js` — 40 field definitions (pure)
- `app/api/eu-database/prefill.js` — GET pre-filled form из Passport
- `app/api/eu-database/checklist.js` — GET readiness check
- `frontend/app/[locale]/(app)/eu-database/[toolId]/page.tsx` — EU DB helper UI

##### Критерии приёмки

- [ ] 40 полей EU DB с pre-fill из Passport (60-90%)
- [ ] Readiness checklist: ready/missing по каждому полю
- [ ] Copy-paste export для EU Database
- [ ] После регистрации: EU DB number → `Passport.regulatoryContext.euDbNumber`
- [ ] Только для high-risk AI инструментов

- **Tests:** 2 (eu_db_prefill.test, readiness_checklist.test)
- **Dependencies:** US-093, US-098

---

### Phase 4: Polish + Should (10 SP)

#### US-099: Certification Dashboard — готовность к ISO 42001 (3 SP)

- **Feature:** F40 | **Developer:** Nina

##### Описание

Как compliance officer, я хочу видеть готовность организации к сертификации ISO 42001 (AI Management System) и AIUC-1 (AI Use Case) — per-system и org-wide процент, управление evidence по каждому критерию, ссылки на партнёрские сертификационные органы.

##### Реализация

**Новые файлы:**
- `app/domain/certification/ISO42001Criteria.js` — criteria definitions (pure)
- `app/api/certification/readiness.js` — GET per-tool + org-wide readiness
- `frontend/app/[locale]/(app)/certification/page.tsx` — readiness dashboard
- `frontend/components/certification/ReadinessBar.tsx` — прогресс по стандарту

##### Критерии приёмки

- [ ] ISO 42001 readiness: per-system + org-wide процент
- [ ] AIUC-1 readiness: per-system + org-wide процент
- [ ] Evidence upload по каждому критерию
- [ ] Ссылки на партнёрские сертификационные органы

- **Tests:** 2 (iso42001_readiness.test, evidence_upload.test)
- **Dependencies:** US-091

---

#### US-102: Data Source Indicator — источник данных в Passport (2 SP)

- **Feature:** F63 | **Developer:** Nina

##### Описание

Как DPO, я хочу видеть рядом с каждым полем Passport источник данных ("CLI scan, 27 фев" или "введено вручную, 25 фев") — чтобы отличать автоматические данные (более надёжные) от ручных и понимать актуальность каждого поля.

##### Реализация

**Новые файлы:**
- `frontend/components/shared/DataSourceBadge.tsx` — reusable badge компонент
- `app/domain/inventory/services/FieldMetadata.js` — metadata helpers

**Модифицированные файлы:**
- `app/schemas/AITool.js` — добавить `fieldMetadata` JSON column
- `frontend/components/tools/PassportView.tsx` — отрисовка DataSourceBadge по каждому полю

##### Критерии приёмки

- [ ] DataSourceBadge рендерит тип источника + дату для каждого поля Passport
- [ ] CLI Sync записывает source='cli_scan' с timestamp скана
- [ ] Ручной ввод записывает source='manual' с user ID
- [ ] Визуальное различие: зелёная точка (automated) vs жёлтая (manual)

- **Tests:** 2 (data_source_badge_render.test, field_metadata_merge.test)
- **Dependencies:** US-093

---

#### US-101: SaaS Discovery — Shadow AI через IdP (2 SP)

- **Feature:** F29 | **Developer:** Leo

##### Описание

Как CTO, я хочу обнаруживать Shadow AI: AI инструменты, которые сотрудники используют через SSO (IdP), но которые не зарегистрированы в реестре — чтобы знать реальную картину использования AI в организации и вовремя зарегистрировать пропущенные инструменты.

> **Примечание:** Схема `AIToolDiscovery.js` уже существует (S2). Используем её, не создаём новую.

##### Реализация

**Новые файлы:**
- `app/api/discovery/idp-scan.js` — POST trigger WorkOS connected apps scan
- `app/api/discovery/shadow-ai.js` — GET diff: IdP apps vs registered tools
- `app/application/discovery/scanIdPApps.js` — WorkOS API + AI Registry match
- `frontend/app/[locale]/(app)/discovery/page.tsx` — Shadow AI UI

##### Критерии приёмки

- [ ] IdP scan: AI инструменты из SSO-авторизованных приложений обнаружены
- [ ] Shadow AI diff: инструменты в IdP, которых нет в AITool registry
- [ ] Human-in-the-loop: предлагаем добавить, не добавляем автоматически
- [ ] Фильтрация только AI-related apps (не все OAuth apps)
- [ ] Использует существующую схему `AIToolDiscovery.js` (S2)

- **Tests:** 2 (idp_scan_pattern_match.test, shadow_ai_diff.test)
- **Dependencies:** None

---

#### US-104: Regulatory Monitoring — мониторинг изменений AI Act (3 SP)

- **Feature:** F12 | **Developer:** Leo

##### Описание

Как compliance officer, я хочу получать уведомления об изменениях в законодательстве EU AI Act — чтобы вовремя обновлять compliance документы. Система еженедельно проверяет EUR-Lex, фильтрует deployer-relevant статьи, анализирует impact через LLM и уведомляет, если изменения затрагивают мои AI системы.

> **Примечание:** Схемы `RegulatoryUpdate.js` и `ImpactAssessment.js` уже существуют (S3). Используем их, не создаём новые.

##### Реализация

**Новые файлы:**
- `app/domain/monitoring/services/RegulatoryScanner.js` — EUR-Lex parser (pure)
- `app/domain/monitoring/services/ImpactAnalyzer.js` — LLM impact assessment (Mistral Small)
- `app/application/monitoring/scanRegulatory.js` — application use case
- `app/api/monitoring/regulatory.js` — POST manual scan + GET updates + GET impact
- `frontend/app/[locale]/(app)/monitoring/regulatory/page.tsx` — UI

**Модифицированные файлы:**
- `server/main.js` — регистрация pg-boss weekly cron
- `app/application/notifications/checkDeadlines.js` — добавить тип "regulatory update"

##### Критерии приёмки

- [ ] Weekly EUR-Lex scraping через pg-boss cron job
- [ ] Фильтр: только deployer-relevant статьи AI Act (Art. 4, 5, 6, 9, 26, 27, 49, 50, 72, 73)
- [ ] LLM impact analysis per AI tool в организации
- [ ] Уведомления: in-app + email при обнаружении релевантных изменений
- [ ] Manual scan trigger для админов
- [ ] Историческая лента всех regulatory updates
- [ ] Использует существующие схемы `RegulatoryUpdate.js` + `ImpactAssessment.js` (S3)

- **Tests:** 2 (eurlex_parser.test, impact_analysis.test)
- **Dependencies:** US-100 (notification channel)

---

## Summary

| Phase | Stories | SP |
|-------|---------|-----|
| Foundation + Carry-over | US-091, US-086, US-089, US-098 | 10 |
| Core Extensions | US-093, US-094, US-092, US-100 | 11 |
| External Outputs | US-090, US-103, US-095, US-096, US-097 | 17 |
| Polish + Should | US-099, US-102, US-101, US-104 | 10 |
| **Total** | **17 stories** | **48 SP** |

> **Carry-over из S8:** US-086 (2 SP), US-089 (2 SP), US-090 (4 SP) = 8 SP
>
> **Overlap audit savings:** US-091 (5→3), US-092 (4→2), US-094 (5→2), US-086 (3→2) = −8 SP vs original scope
>
> **Prioritization:**
> - **Must (Phase 1-3):** 38 SP
> - **Should (Phase 4):** 10 SP
> - **Defer candidate → S10:** US-101 (Discovery, 2 SP), если capacity tight

---

## New Files (~45)

```
# Phase 1
app/api/tools/lifecycle.js
app/api/tools/stats.js
frontend/app/[locale]/(app)/registry/page.tsx
frontend/components/registry/LifecycleControl.tsx
app/api/dashboard/timeline.js
app/application/dashboard/buildTimeline.js
app/api/events/stream.js
server/src/event-bus.js
app/seeds/seed-regulators.js
app/schemas/Regulator.js
app/api/regulators/directory.js
frontend/app/[locale]/(app)/regulators/page.tsx
frontend/components/regulators/RegulatorCard.tsx

# Phase 2
app/application/documents/prefillFromPassport.js
frontend/app/[locale]/(app)/documents/qms/page.tsx
frontend/app/[locale]/(app)/documents/risk-plan/page.tsx
frontend/app/[locale]/(app)/documents/monitoring-plan/page.tsx
app/api/notifications/list.js
app/api/notifications/preferences.js
app/application/notifications/checkDeadlines.js
app/jobs/notification-checker.js
frontend/app/[locale]/(app)/onboarding/page.tsx
frontend/components/notifications/NotificationBell.tsx
frontend/components/notifications/NotificationCenter.tsx

# Phase 3
app/schemas/VendorClaim.js
app/api/registry/vendor-claim.js
app/api/v1/registry/procurement.js
frontend/components/registry/VendorClaimForm.tsx
app/schemas/RemediationPlaybook.js
app/domain/compliance/services/RemediationEngine.js
app/application/compliance/generatePlaybooks.js
app/api/remediation/playbooks.js
app/seeds/remediation-templates.js
frontend/components/compliance/RemediationPanel.tsx
app/application/badge/evaluateBadgeCriteria.js
app/api/badge/[orgSlug].js
app/api/badge/my/stats.js
frontend/app/[locale]/(app)/badge/page.tsx
frontend/app/[locale]/(public)/verify/[orgSlug]/page.tsx
public/badge.js
app/schemas/VendorRequest.js
app/api/vendor-requests/create.js
app/api/vendor-requests/list.js
app/api/vendor-requests/update.js
app/application/vendor/generateRequestEmail.js
frontend/app/[locale]/(app)/vendor-requests/page.tsx
frontend/components/vendor/RequestEmailPreview.tsx
app/domain/eu-database/EUDatabaseFields.js
app/api/eu-database/prefill.js
app/api/eu-database/checklist.js
frontend/app/[locale]/(app)/eu-database/[toolId]/page.tsx

# Phase 4
app/domain/certification/ISO42001Criteria.js
app/api/certification/readiness.js
frontend/app/[locale]/(app)/certification/page.tsx
frontend/components/certification/ReadinessBar.tsx
frontend/components/shared/DataSourceBadge.tsx
app/domain/inventory/services/FieldMetadata.js
app/api/discovery/idp-scan.js
app/api/discovery/shadow-ai.js
app/application/discovery/scanIdPApps.js
frontend/app/[locale]/(app)/discovery/page.tsx
app/domain/monitoring/services/RegulatoryScanner.js
app/domain/monitoring/services/ImpactAnalyzer.js
app/application/monitoring/scanRegulatory.js
app/api/monitoring/regulatory.js
frontend/app/[locale]/(app)/monitoring/regulatory/page.tsx
```

## Modified Files (~15)

```
app/schemas/AITool.js — lifecycle, source, autonomyLevel, fieldMetadata, passport extensions
app/api/tools/list.js — source/lifecycle/autonomyLevel filters
app/api/tools/detail.js — new fields in response
app/api/tools/passport.js — PATCH new passport blocks
app/application/tool/updatePassport.js — validation for 6 new blocks
app/api/sync/passport.js — emit SSE event after sync
app/api/sync/scan.js — emit SSE event after scan
frontend/components/dashboard/TimelineWidget.tsx — extended timeline
frontend/components/wizard/Step3Data.tsx — geography field
frontend/components/wizard/Step4Autonomy.tsx — L1-L5, Art. 14, escalation
frontend/components/wizard/Step5Review.tsx — FRIA shortcut
frontend/components/tools/PassportView.tsx — DataSourceBadge
frontend/app/[locale]/(app)/gap-analysis/[toolId]/page.tsx — RemediationPanel
frontend/messages/en.json + de.json — i18n additions
server/main.js — pg-boss cron jobs
```

## New Test Files

```
tests/lifecycle_transitions.test.js          (3 tests)
tests/source_filter.test.js                  (included above)
tests/stats_aggregation.test.js              (included above)
tests/timeline_deadlines.test.js             (2 tests)
tests/sse_connection.test.js                 (2 tests)
tests/regulator_directory_query.test.js      (2 tests)
tests/passport_extended_fields.test.js       (2 tests)
tests/qms_prefill_from_org.test.js           (2 tests)
tests/wizard_geography_field.test.js         (2 tests)
tests/deadline_notification.test.js          (3 tests)
tests/vendor_claim_submit.test.js            (4 tests)
tests/playbook_generation.test.js            (2 tests)
tests/badge_criteria.test.js                 (2 tests)
tests/vendor_request_email.test.js           (3 tests)
tests/eu_db_prefill.test.js                  (2 tests)
tests/iso42001_readiness.test.js             (2 tests)
tests/data_source_badge_render.test.js       (2 tests)
tests/idp_scan_pattern_match.test.js         (2 tests)
tests/eurlex_parser.test.js                  (2 tests)
Total: ~39 new tests (546 → ~585)
```

---

## Existing Schemas (NOT to create)

Эти схемы уже существуют в кодовой базе — **не создавать повторно:**

| Схема | Файл | Создана в | Используется в |
|-------|------|-----------|---------------|
| Notification | `app/schemas/Notification.js` | S3 | US-100 |
| AIToolDiscovery | `app/schemas/AIToolDiscovery.js` | S2 | US-101 |
| RegulatoryUpdate | `app/schemas/RegulatoryUpdate.js` | S3 | US-104 |
| ImpactAssessment | `app/schemas/ImpactAssessment.js` | S3 | US-104 |

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm test` — ~585 tests, 0 failures
- [ ] Registry: unified view поверх `/api/tools`, lifecycle transitions работают
- [ ] Timeline: real deadlines + days remaining + overdue alerts
- [ ] SSE: Dashboard обновляется в реальном времени после CLI sync
- [ ] Badge: embeddable script на внешнем сайте, public verification page
- [ ] Vendor Request: email с Art. 13/26 ссылками, status tracking
- [ ] EU Database: 40 полей pre-filled из Passport
- [ ] Remediation: playbooks генерируются из Gap Analysis
- [ ] Notifications: bell icon + email digest
- [ ] Multi-tenancy на всех новых endpoints
- [ ] Zod validation на всех новых API
- [ ] AuditLog на всех mutations

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| Sprint capacity (48 SP, 4 недели) | Средняя | Низкий | 4 phases, Phase 4 = should/defer buffer |
| Carry-over integration (3 US из S8) | Низкая | Низкий | Все 3 независимые, S8 prerequisites audited |
| Vendor Request email deliverability | Средняя | Низкий | Brevo SPF/DKIM, copy-paste fallback |
| EU Database format changes | Средняя | Средний | Manual field mapping, copy-paste fallback |
| Badge CORS на внешних сайтах | Низкая | Средний | Proper CORS headers, CDN caching |
| EUR-Lex scraping stability | Средняя | Низкий | Fallback to manual, pg-boss retry |
| Remediation playbook accuracy | Средняя | Средний | Elena review, user-editable steps |
