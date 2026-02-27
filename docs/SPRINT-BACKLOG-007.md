# SPRINT-BACKLOG-007.md — WorkOS Migration + Registry API

**Версия:** 1.1.0
**Дата:** 2026-02-24
**Автор:** Marcus (CTO) via Claude Code
**Статус:** ✅ Completed
**Зависимости:** Sprint 6 merged to develop

---

## Sprint Goal

Мигрировать авторизацию с Ory Kratos → WorkOS (managed auth, SSO из коробки). Запустить Registry API — публичные эндпоинты для TUI Engine DataProvider (2477+ tools, 108 obligations, offline bundle).

**Capacity:** ~39 SP (actual) | **Duration:** 2-3 недели
**Developers:** Max (Backend — WorkOS + Registry API), Nina (Frontend — auth flow + public pages), Leo (Infra — Docker cleanup)
**Baseline:** ~227 tests → **Final: 343 tests (+116)**

> **Prerequisite:** Sprint 6 merged to develop. Admin Panel работает. Stripe Test Mode настроен. Kratos dev-интеграция работает (будет заменена).

> **ADR-007:** Переход с Ory Kratos → WorkOS. Причины: managed service (нет self-hosting), SSO (SAML/OIDC) бесплатно до 1M MAU, AuthKit (hosted login UI). См. `docs/ADR-007-workos-migration.md`.

---

## Граф зависимостей

```
US-071 (WorkOS Backend) ──→ US-072 (WorkOS Frontend)
US-071                  ──→ US-073 (Kratos Cleanup)
US-074 (Registry API)   ──→ US-075 (API Key Management)
US-074                  ──→ US-076 (Data Migration) ──→ US-077 (Quality Fixes)
US-074                  ──→ US-078 (findBySlug + filters) ──→ US-079 (Public Pages)

Порядок:
1. US-071 (WorkOS Backend) — блокирует auth
2. US-072 + US-074 параллельно (после US-071)
3. US-073 + US-075 + US-076 параллельно (после 072 и 074)
4. US-077 + US-078 (после US-076)
5. US-079 (после US-078, Nina frontend)
```

---

## User Stories

### US-071: WorkOS Backend Integration (8 SP)

- **Feature:** F25 (WorkOS Migration) | **Developer:** Max

#### Описание
Как разработчик платформы, я хочу заменить Ory Kratos на WorkOS для управления идентификацией, чтобы не поддерживать self-hosted сервис и получить Enterprise SSO из коробки без дополнительных затрат.

#### Ключевые решения

**Auth flow:** WorkOS AuthKit (hosted UI) → POST /api/auth/callback → verifyAccessToken → sync user → session cookie.

**Session management:** WorkOS session token в httpOnly cookie. `resolveSession` использует WorkOS SDK для верификации.

**User sync:** `syncUserFromWorkOS(workosUser)` — create/update User с `workosUserId`. Заменяет `syncUserFromOry` (Ory webhook).

**Organization:** WorkOS Organizations для Enterprise SSO. `Organization.workosOrgId` синхронизируется при SSO setup.

#### Реализация

**Новые файлы:**
- `infrastructure/auth/workos-client.js` — WorkOS SDK init (`new WorkOS(process.env.WORKOS_API_KEY)`)
- `app/api/auth/callback.js` — `GET /api/auth/callback` — получает code, verifyAccessToken, синхронизирует user, устанавливает session cookie
- `app/api/auth/logout.js` — `POST /api/auth/logout` — clear session cookie
- `app/application/iam/syncUserFromWorkOS.js` — создаёт/обновляет User из WorkOS user object
- `app/application/iam/resolveWorkOSSession.js` — session token → User record
- `app/config/workos.js` — env vars: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`

**Модифицированные файлы:**
- `schemas/User.js` — `oryId` → `workosUserId` (UNIQUE, INDEX)
- `schemas/Organization.js` — добавить `workosOrgId` (UNIQUE, nullable)
- `server/middleware/auth.js` — использует `resolveWorkOSSession` вместо Ory
- `app/api/auth/me.js` — возвращает user из WorkOS session
- `server/config.js` — добавить workos config

**Удалённые файлы:**
- `infrastructure/auth/ory-client.js`
- `app/api/auth/webhook.js` (Ory webhook endpoint)
- `app/application/iam/syncUserFromOry.js`
- `app/config/ory.js`

**DB Migration:**
```sql
ALTER TABLE users RENAME COLUMN ory_id TO workos_user_id;
ALTER TABLE organizations ADD COLUMN workos_org_id VARCHAR UNIQUE;
```

#### Критерии приёмки
- [ ] `npm install @workos-inc/node` добавлен в dependencies
- [ ] `/api/auth/callback` принимает WorkOS callback, создаёт session
- [ ] `User.workosUserId` заполняется при первом login
- [ ] `resolveWorkOSSession` возвращает User для валидного session token
- [ ] `GET /api/auth/me` возвращает текущего User
- [ ] Logout очищает session cookie
- [ ] Unit tests: syncUserFromWorkOS (новый пользователь, существующий пользователь)
- [ ] Unit tests: resolveWorkOSSession (valid token, expired token, invalid token)

---

### US-072: WorkOS Frontend (3 SP)

- **Feature:** F25 (WorkOS Migration) | **Developer:** Nina

#### Описание
Как пользователь, я хочу входить и регистрироваться через WorkOS AuthKit (hosted login UI), чтобы иметь безопасный enterprise-grade auth с поддержкой SSO.

#### Реализация

**Модифицированные файлы:**
- `app/(auth)/login/page.tsx` → redirect на WorkOS AuthKit URL (`workos.userManagement.getAuthorizationUrl(...)`)
- `app/(auth)/register/page.tsx` → redirect на WorkOS AuthKit signup URL
- `app/(auth)/callback/page.tsx` → обрабатывает redirect от WorkOS, передаёт code в `/api/auth/callback`
- `app/(dashboard)/settings/page.tsx` → добавить SSO Configuration tab (WorkOS SSO setup link)
- `components/auth/` → убрать кастомные login/register формы (WorkOS показывает собственный UI)

**Новые файлы:**
- `app/(auth)/callback/page.tsx` — loading state пока callback обрабатывается

#### Критерии приёмки
- [ ] `/login` redirects на WorkOS hosted login (не наша кастомная форма)
- [ ] `/register` redirects на WorkOS hosted signup
- [ ] После успешного login → redirect на `/dashboard`
- [ ] После logout → redirect на `/login`
- [ ] Settings → SSO tab показывает WorkOS SSO configuration link
- [ ] Email magic link работает через WorkOS

---

### US-073: Remove Kratos from Infrastructure (2 SP)

- **Feature:** F25 (WorkOS Migration) | **Developer:** Leo

#### Описание
Как DevOps, я хочу убрать Ory Kratos из Docker stack, чтобы упростить инфраструктуру и сэкономить на ресурсах.

#### Реализация

**Модифицированные файлы:**
- `docker-compose.yml` — убрать services: `kratos`, `kratos-migrate`. Убрать volumes: `kratos-sqlite`, `kratos-config`. Убрать networks: `kratos`
- `docker-compose.yml` — убрать depends_on: kratos в app service
- `infrastructure/caddy/Caddyfile` — убрать `.ory/*` reverse proxy routes
- `.env.example` — убрать `KRATOS_*` vars, добавить `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`
- `infrastructure/caddy/Caddyfile` — убрать kratos upstream

#### Критерии приёмки
- [ ] `docker-compose up` запускается без ошибок (без Kratos)
- [ ] Нет `.ory/*` routes в Caddyfile
- [ ] `.env.example` содержит WorkOS vars, не содержит Kratos vars
- [ ] `docker-compose ps` показывает 6 сервисов (было 7)
- [ ] Health check script проходит без Kratos endpoint

---

### US-074: Registry API — Core Endpoints (5 SP)

- **Feature:** F26 (Registry API) | **Developer:** Max

#### Описание
Как разработчик, использующий open-source Complior Engine, я хочу получить доступ к полному реестру AI tools (2477+) и compliance obligations через REST API, чтобы обогатить данные локального сканера без необходимости хранить всё локально.

#### Ключевые решения

**Версионирование:** Все эндпоинты под `/v1/` prefix. Backward-compatible changes only.

**Data tiering:**
- Free (no key): `/v1/data/bundle` — offline bundle ~530KB (200 tools)
- Free API key: 2477 tools, 100 req/day
- Starter+: полный доступ с evidence/assessments, 1K-100K req/day

**ETag caching:** Bundle endpoint возвращает ETag. TUI кешируется `If-None-Match` → 304 Not Modified если не изменился.

#### Реализация

**Новые схемы:**
- `schemas/RegistryTool.js` — полная запись AI tool (name, provider, category, riskLevel, capabilities, jurisdictions, evidence, detectionPatterns)
- `schemas/Obligation.js` — compliance obligations (code, regulation, riskLevel, articleReference, checkCriteria)
- `schemas/ScoringRule.js` — правила расчёта score (regulation, checkId, weight, maxScore)

**Новые API файлы:**
- `app/api/registry/tools.js` — `GET /v1/registry/tools` — поиск с фильтрами: `?q=`, `?risk=`, `?category=`, `?jurisdiction=`, `?page=`, `?limit=`
- `app/api/registry/tools/[id].js` — `GET /v1/registry/tools/:id` — полная запись с evidence
- `app/api/registry/search.js` — `GET /v1/registry/search?q=` — fulltext поиск
- `app/api/regulations/obligations.js` — `GET /v1/regulations/obligations?regulation=&risk=`
- `app/api/data/bundle.js` — `GET /v1/data/bundle` — offline bundle JSON (ETag + gzip)

**Новые application файлы:**
- `app/application/registry/searchTools.js` — поиск с ILIKE + filters
- `app/application/registry/getBundle.js` — генерация/кеширование bundle
- `app/application/registry/apiKeyMiddleware.js` — X-API-Key → resolve org + plan + rate check

**Seeds:**
- `app/seeds/registry-tools.js` — начальный seed (200 tools из Engine offline bundle)
- `app/seeds/obligations.js` — 108 obligations из Engine regulation DB

#### Критерии приёмки
- [ ] `GET /v1/registry/tools` возвращает paginated список с фильтрами (без key — 200 tools)
- [ ] `GET /v1/registry/tools` с API key (Starter+) — 2477 tools
- [ ] `GET /v1/registry/tools/:id` возвращает полную запись
- [ ] `GET /v1/regulations/obligations` возвращает 108 obligations
- [ ] `GET /v1/data/bundle` возвращает ~530KB JSON
- [ ] ETag header присутствует, 304 возвращается при повторном запросе
- [ ] Rate limit 429 при превышении дневной квоты
- [ ] Response time < 200ms для tools list (indexed queries)

---

### US-075: API Key Management (2 SP)

- **Feature:** F26 (Registry API) | **Developer:** Max

#### Описание
Как владелец организации, я хочу создавать и управлять API ключами для TUI DataProvider, чтобы подключить Complior Engine к нашим данным с контролем доступа.

#### Реализация

**Новые схемы:**
- `schemas/APIKey.js` — (org FK, keyHash UNIQUE, keyPrefix, name, plan, rateLimit, lastUsedAt, expiresAt, active)
- `schemas/APIUsage.js` — (apiKey FK, usageDate, requestCount, bytesTransferred — UNIQUE(apiKey, usageDate))

**Новые API файлы:**
- `app/api/settings/api-keys.js` — `GET/POST /api/settings/api-keys` — список + создание
- `app/api/settings/api-keys/[id].js` — `DELETE /api/settings/api-keys/:id` — отзыв ключа

**Новые application файлы:**
- `app/application/registry/createApiKey.js` — генерация ключа, HMAC-SHA256 hash, возврат полного ключа ОДИН РАЗ
- `app/application/registry/revokeApiKey.js`
- `app/application/registry/trackUsage.js` — increment APIUsage.requestCount (pg-boss job или inline)

#### Критерии приёмки
- [ ] Owner/Admin создаёт API key в Settings → API Keys tab
- [ ] Полный ключ (`ck_live_...`) показывается ОДИН РАЗ после создания (не хранится plaintext)
- [ ] В таблице ключей виден только prefix (первые 8 символов)
- [ ] API запрос с `X-API-Key: ck_live_...` аутентифицируется
- [ ] Revoke key → ключ немедленно перестаёт работать
- [ ] Unit tests: createApiKey, trackUsage, rate limit enforcement

---

### US-076: AI Registry + Regulation DB — Data Migration to PostgreSQL (7 SP) ✅ COMPLETED 2026-02-23

- **Feature:** F26 (Registry API data layer) | **Developer:** Max via Claude Code
- **Источник:** `~/complior` engine/data/ → ~/PROJECT PostgreSQL

#### Описание

Перенос всей Regulation DB и AI Registry из JSON-файлов `~/complior/engine/data/` в PostgreSQL `~/PROJECT`. Создание 6 новых таблиц, миграция 4,983 инструментов и 108 obligations. Экспортные скрипты для offline bundle. Документация архитектуры.

#### Что было сделано

**Новые DB-таблицы (6):**
- `RegulationMeta` — метаданные юрисдикций (1 запись: EU AI Act)
- `TechnicalRequirement` — технические требования (89 записей)
- `TimelineEvent` — ключевые даты enforcement (18 записей)
- `CrossMapping` — маппинг между юрисдикциями (для будущих US)
- `LocalizationTerm` — переводы (для US-102)
- `ApplicabilityNode` — дерево применимости (для классификатора)

**Данные перенесены:**
- **4,983 AI tools** → `RegistryTool` (уровни: 85 verified, 2,380 scanned, 2,518 classified)
- **108 obligations** → `Obligation` (82 core OBL-001…025 + sub, 26 domain-specific)
- **89 TechnicalRequirement** — технические требования по статьям
- **18 TimelineEvent** — даты EU AI Act phases (2024→2030)
- **1 RegulationMeta** — EU AI Act (Regulation EU 2024/1689)

**Новые файлы:**
- `scripts/export-registry.js` — экспорт всех инструментов в `data/registry/all_tools.json`
- `scripts/export-regulation-db.js` — экспорт Obligation/RegulationMeta/TechReq/Timeline в `data/regulations/`
- `app/seeds/migrate-regulation-db.js` — seed обязательств из JSON
- `app/seeds/migrate-ai-registry.js` — seed реестра из JSON

**npm scripts добавлены в package.json:**
```
migrate:regulations, migrate:registry, export:registry, export:regulation, export:all
```

**Документация:**
- `docs/ARCHITECTURE.md` → version bump 3.0.0 → 3.1.0, добавлена секция 4.11 Data Migration Context
- `README.md` — полностью переписан (устаревший контент Prisma/JWT/Kubernetes удалён)
- `~/complior/README.md` — добавлена секция Cloud API Configuration с инструкцией по `COMPLIOR_API_KEY`

**TUI Integration (уже существовало, верифицировано):**
- `~/complior/tui/src/data/engine_provider.rs` — EngineDataProvider с 30s cache, background refresh, fallback → MockDataProvider
- `~/complior/tui/src/config.rs` — `load_api_key()` из `~/.config/complior/credentials`

#### Критерии приёмки

- [x] 6 новых таблиц созданы в PostgreSQL
- [x] 4,983 AI tools в `RegistryTool` с evidence/assessments JSON
- [x] 108 obligations в `Obligation` (82 core + 26 domain)
- [x] 89 TechnicalRequirement, 18 TimelineEvent, 1 RegulationMeta
- [x] `npm run export:all` генерирует JSON файлы в `data/`
- [x] `docs/ARCHITECTURE.md` v3.1.0 с секцией Data Migration Context
- [x] `README.md` точно описывает текущий стек
- [x] TUI `EngineDataProvider` подтверждён рабочим

---

### US-077: Post-Migration Data Quality Fixes (2 SP) ✅ COMPLETED 2026-02-23

- **Feature:** F26 (Registry API data integrity) | **Developer:** Max via Claude Code

#### Описание

Устранение несоответствий между spec `COMPLIOR-AI-REGISTRY-SPEC-v3.md` и фактическим состоянием DB после миграции. Три критических фикса для консистентности данных.

#### Что было сделано

**Фикс 1: OBL-CS-001 → OBL-CSR-001 (150 инструментов)**
- Spec использует `OBL-CS-001`, DB хранит `eu-ai-act-OBL-CSR-001`
- `assessments['eu-ai-act']['applicable_obligation_ids']` и `deployer_obligations` содержали неверный ID
- UPDATE: `REPLACE(assessments::text, 'OBL-CS-001', 'OBL-CSR-001')::jsonb` для всех 150 tools

**Фикс 2: `riskLevel` колонка (4,983 инструментов)**
- Колонка `riskLevel` в RegistryTool была NULL для всех 4,983 tools
- Риск хранился только в `assessments['eu-ai-act']['risk_level']` JSON
- UPDATE: заполнена из assessments JSON для всех инструментов
- Итоговое распределение: limited=2,633 | minimal=1,761 | high=490 | gpai=65 | gpai_systemic=17 | unacceptable=17

**Фикс 3: `RegistryTool.riskLevel` enum расширен**
- Старый enum: `['prohibited', 'high', 'gpai', 'limited', 'minimal']` — не покрывал реальные данные
- Новый enum: `['unacceptable', 'high', 'gpai_systemic', 'gpai', 'limited', 'minimal']`
- Обновлены: `app/schemas/RegistryTool.js` и `app/schemas/RegistryTool.js.backup`

#### Критерии приёмки

- [x] Ноль ссылок на `OBL-CS-001` в assessments JSON (было 150, стало 0)
- [x] `riskLevel` колонка заполнена для всех 4,983 tools
- [x] `RegistryTool.riskLevel` enum соответствует реальным значениям в DB
- [x] `GET /v1/registry/tools?risk=gpai_systemic` возвращает 17 инструментов

---

### US-078: Registry API — findBySlug, Level Filter, Sort (2 SP) ✅ COMPLETED 2026-02-24

- **Feature:** F37 (AI Registry Public Pages) + F26 (Registry API) | **Developer:** Max via Claude Code

#### Описание

Как разработчик фронтенда, я хочу получать данные инструмента по slug и фильтровать/сортировать список, чтобы построить SEO-оптимизированные публичные страницы реестра.

#### Что было сделано

**Модифицированные файлы (3):**
- `app/application/registry/searchTools.js` — добавлен метод `findBySlug` (SELECT по slug), параметр `level` в фильтры, параметр `sort` (name/score/risk) с ORDER BY mapping
- `app/api/registry/tools.js` — добавлен маршрут `GET /v1/registry/tools/by-slug/:slug` (public, API key optional)
- `server/lib/schemas.js` — расширен `RegistryToolSearchSchema`: `level` enum (verified/scanned/classified), `sort` enum (name/score/risk)

#### Критерии приёмки

- [x] `GET /v1/registry/tools/by-slug/chatgpt` возвращает полную запись ChatGPT
- [x] `GET /v1/registry/tools?level=verified` фильтрует по уровню
- [x] `GET /v1/registry/tools?sort=score` сортирует по priorityScore DESC
- [x] 343 tests pass, 0 failures, tsc --noEmit clean

---

### US-079: AI Registry Public Pages — Index + Detail (8 SP) ✅ COMPLETED 2026-02-24

- **Feature:** F37 (AI Registry Public Pages) | **Developer:** Nina via Claude Code

#### Описание

Как посетитель сайта, я хочу просматривать публичный реестр AI инструментов с поиском, фильтрами и детальными страницами, чтобы оценить compliance-риски до регистрации на платформе.

#### Что было сделано

**Новые файлы (24):**

*Frontend API Layer (2):*
- `frontend/lib/registry.ts` — TypeScript типы (RegistryTool, RegistryStats, etc.) + fetch функции (client/server SSR) + вспомогательные helpers
- `frontend/components/registry/toolValidation.ts` — per-level validation logic (verified/scanned/classified)

*Shared Components (5):*
- `frontend/components/registry/ToolLogo.tsx` — gradient initial-letter logo (deterministic из name hash)
- `frontend/components/registry/ScoreBar.tsx` — score progress bar с цветовыми порогами
- `frontend/components/registry/LevelBadge.tsx` — verified/scanned/classified pill badge
- `frontend/components/registry/RiskBadge.tsx` — risk level badge (prohibited/high/gpai/limited/minimal)
- `frontend/components/registry/Pagination.tsx` — page number buttons с ellipsis

*Index Page `/tools` (6):*
- `frontend/app/(marketing)/tools/page.tsx` — server component с ISR (1 hour), SEO metadata, stats bar
- `frontend/components/registry/ToolGrid.tsx` — client component: search/filter/sort/pagination с URL sync
- `frontend/components/registry/RegistrySearch.tsx` — search bar с `/` keyboard shortcut
- `frontend/components/registry/RiskPillFilter.tsx` — toggleable risk level pills с counts
- `frontend/components/registry/FeaturedRow.tsx` — 5 featured tool cards
- `frontend/components/registry/ToolRow.tsx` — tool row для list view

*Detail Page `/tools/[slug]` (8):*
- `frontend/app/(marketing)/tools/[slug]/page.tsx` — ISR (daily), generateStaticParams (top 100), SEO metadata
- `frontend/components/registry/ToolHero.tsx` — 2-column hero: info + risk card + score sidebar
- `frontend/components/registry/ToolTabs.tsx` — 5-tab switcher (Overview, Obligations, Detection, Documents, History)
- `frontend/components/registry/OverviewTab.tsx` — description + article cards + compliance breakdown bars
- `frontend/components/registry/ObligationsTab.tsx` — deployer vs provider obligation checklists
- `frontend/components/registry/DetectionTab.tsx` — code/SaaS detection patterns (dark panels)
- `frontend/components/registry/SimilarTools.tsx` — 4 similar tool cards
- `frontend/components/registry/CTABanner.tsx` — bottom CTA с CLI command

**Модифицированные файлы (3):**
- `frontend/components/Header.tsx` — добавлена "AI Registry" nav link в marketing mode
- `frontend/messages/en.json` — добавлена секция `nav.registry` + `registry.*` (~45 ключей)
- `frontend/messages/de.json` — немецкие переводы для тех же ключей

#### Критерии приёмки

- [x] `/tools` рендерит SSR страницу с 2477+ инструментов (paginated, 20/page)
- [x] Search, risk filter, level filter, sort — все работают с URL sync
- [x] `/tools/chatgpt` рендерит detail page с 5 tabs
- [x] ISR: index = 1h revalidation, detail = daily
- [x] Top 100 tools статически сгенерированы (generateStaticParams)
- [x] TypeScript: 0 errors (tsc --noEmit clean)
- [x] Все стили = inline React.CSSProperties (matching codebase pattern)
- [x] EN + DE translations complete (~45 keys each)
- [x] 343 tests pass, 0 failures

---

## Кросс-проектные зависимости

| Зависимость | Тип | Описание |
|------------|-----|---------|
| Engine C.040 (AI Registry types) | **Жёсткая** | Shared types для RegistryTool должны быть зафиксированы ДО разработки US-074. Day 1: синхронизация типов |
| Engine C.012 (19 checks) → scoring rules | Мягкая | ScoringRule seed data берётся из Engine regulation DB. Можно начать с placeholder |

---

## Итоговые метрики

| US | Описание | Developer | SP | Статус |
|----|---------|-----------|-----|--------|
| US-071 | WorkOS Backend Integration | Max | 8 | ✅ |
| US-072 | WorkOS Frontend | Nina | 3 | ✅ |
| US-073 | Remove Kratos from Infrastructure | Leo | 2 | ✅ |
| US-074 | Registry API — Core Endpoints | Max | 5 | ✅ |
| US-075 | API Key Management | Max | 2 | ✅ |
| US-076 | AI Registry + Regulation DB Data Migration | Max | 7 | ✅ |
| US-077 | Post-Migration Data Quality Fixes | Max | 2 | ✅ |
| US-078 | Registry API — findBySlug, Level Filter, Sort | Max | 2 | ✅ |
| US-079 | AI Registry Public Pages — Index + Detail | Nina | 8 | ✅ |
| **Итого** | | | **39** | **9 US** |

**Новые таблицы:** RegistryTool, Obligation, ScoringRule, APIKey, APIUsage, RegulationMeta, TechnicalRequirement, TimelineEvent, CrossMapping, LocalizationTerm, ApplicabilityNode (+11)
**Удалённые сервисы:** Ory Kratos
**Новые env vars:** WORKOS_CLIENT_ID, WORKOS_API_KEY, WORKOS_REDIRECT_URI
**DB данные:** 4,983 AI tools + 108 obligations + 89 TechReq + 18 TimelineEvents
**Новые npm scripts:** migrate:regulations, migrate:registry, export:registry, export:regulation, export:all
**Frontend:** 24 новых файлов (components + pages), ~45 i18n ключей EN+DE
**Tests:** 227 → 343 (+116 новых тестов)
