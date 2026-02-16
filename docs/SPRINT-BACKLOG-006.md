# SPRINT-BACKLOG-006.md — Admin Panel, Stripe Test, Production Deploy

**Версия:** 1.0.0
**Дата:** 2026-02-15
**Автор:** Marcus (CTO) via Claude Code
**Статус:** In Progress
**Зависимости:** Sprint 5 merged to develop

---

## Sprint Goal

Дать владельцу SaaS полный обзор платформы (пользователи, организации, подписки), подключить тестовый Stripe для оплаты платных тарифов, и вывести фронтенд в production.

**Capacity:** ~15 SP | **Duration:** 1 неделя
**Developers:** Nina (Admin Backend+Frontend, US-065..066), Max (Stripe+Deploy, US-063..064)
**Baseline:** 221 tests → **New: ~6 tests (total: ~227)**

> **Prerequisite:** Sprint 5 merged to develop (4 коммита). Frontend полностью переработан: лендинг (15 секций), auth (login/register/forgot-password), pricing, quick check, penalty calculator, checkout success. i18n EN/DE, тёмная/светлая темы. Ory Kratos dev-интеграция работает.

> **Carry-over из Sprint 5:** US-063 (External Services, 3 SP) и US-064 (Build & Deploy, 2 SP) не были реализованы.

---

## Граф зависимостей

```
US-065 (Admin Backend) ──→ US-066 (Admin Frontend)
US-063 (Stripe Test)   ──→ US-064 (Deploy)
US-065 + US-063        ──→ US-064 (деплой после всех компонентов)
```

**Порядок выполнения:**
1. Phase 0: обновить все доки (этот документ)
2. US-065 + US-063 параллельно
3. US-066 (после US-065)
4. US-064 (после всех)

---

## User Stories

### US-065: Platform Admin — Backend API (5 SP)

- **Feature:** 24 (Platform Admin) | **Developer:** Nina

#### Описание
Как владелец SaaS-платформы Complior, я хочу иметь защищённый API для получения данных обо всех пользователях, организациях и подписках на платформе, чтобы я мог контролировать состояние бизнеса.

#### Ключевые решения

**Идентификация admin:** Используем существующую RBAC-систему. Добавляем роль `platform_admin` + ресурс `PlatformAdmin`. Двойная проверка: RBAC + env whitelist `PLATFORM_ADMIN_EMAILS`.

**Read-only:** v1 только чтение.

#### Реализация

**Новые файлы:**
- `app/application/admin/requirePlatformAdmin.js` — guard
- `app/application/admin/getOverviewStats.js` — aggregate stats
- `app/application/admin/listAllUsers.js` — cross-org user list
- `app/application/admin/listAllOrganizations.js` — cross-org org list
- `app/application/admin/listAllSubscriptions.js` — cross-org subscription list
- `app/api/admin/overview.js` — GET `/api/admin/overview`
- `app/api/admin/users.js` — GET `/api/admin/users`
- `app/api/admin/organizations.js` — GET `/api/admin/organizations`
- `app/api/admin/subscriptions.js` — GET `/api/admin/subscriptions`
- `scripts/assign-admin.js` — assign role script

**Модифицированные файлы:**
- `app/seeds/roles.js` — role `platform_admin` + permission `PlatformAdmin:manage`
- `app/config/server.js` — `platformAdminEmails` from env
- `server/lib/schemas.js` — `AdminListSchema`, `AdminSubscriptionSchema`

#### Критерии приёмки
- [x] Роль `platform_admin` создаётся при seed
- [x] GET `/api/admin/overview` — totalUsers, totalOrganizations, activeSubscriptions, mrr, planDistribution
- [x] GET `/api/admin/users` — paginated cross-org user list with search
- [x] GET `/api/admin/organizations` — all orgs with counts
- [x] GET `/api/admin/subscriptions` — all subscriptions with filters
- [x] Двойной gate: RBAC + env whitelist
- [x] Параметризованные SQL
- [x] AuditLog для admin запросов
- [x] `scripts/assign-admin.js`

- **Тесты:** 3
- **Зависимости:** Нет

---

### US-066: Platform Admin — Frontend UI (5 SP)

- **Feature:** 24 (Platform Admin) | **Developer:** Nina

#### Описание
Admin-панель с обзором статистики, таблицами пользователей, организаций и подписок.

#### Реализация

**Новый route group:**
```
frontend/app/[locale]/(admin)/
  layout.tsx              — Admin layout: Header mode="admin"
  page.tsx                — redirect на dashboard
  dashboard/page.tsx      — 4 stat-карточки + plan distribution
  users/page.tsx          — таблица пользователей
  organizations/page.tsx  — таблица организаций
  subscriptions/page.tsx  — таблица подписок
```

**Модифицированные файлы:**
- `frontend/lib/api.ts` — admin API methods + types
- `frontend/components/Header.tsx` — mode="admin"
- `frontend/messages/en.json` — admin i18n keys
- `frontend/messages/de.json` — German admin translations

#### Критерии приёмки
- [ ] Admin layout с Header mode="admin"
- [ ] Dashboard: 4 stat cards + plan distribution table
- [ ] Users: search + pagination
- [ ] Organizations: filter by plan
- [ ] Subscriptions: status badges (color-coded)
- [ ] Access control: redirect non-admin
- [ ] Dark theme support
- [ ] EN/DE i18n
- [ ] Responsive tables

- **Тесты:** 0 (визуальная верификация)
- **Зависимости:** US-065

---

### US-063: Stripe Test Mode (3 SP) [carry-over]

- **Feature:** Infrastructure | **Developer:** Max

#### Описание
Подключить Stripe в тестовом режиме для полного checkout flow на платных тарифах.

#### Реализация
- `.env.stripe.example` с placeholder keys
- `docs/STRIPE-SETUP.md` — setup guide
- Verify existing Stripe code (checkout, webhook, status polling)
- Docker + Caddy updates for production deploy
- Suspense boundaries for pages with useSearchParams

#### Критерии приёмки
- [x] Stripe env var documentation
- [x] Setup guide created
- [x] Production docker-compose updated
- [x] Caddy updated for frontend proxy
- [x] `.env.production` created
- [x] Suspense boundaries added

- **Тесты:** 0 (E2E верификация)
- **Зависимости:** Stripe test API keys от PO

---

### US-064: Build & Deploy Frontend (2 SP) [carry-over]

- **Feature:** DevOps | **Developer:** Max

#### Описание
Собрать фронтенд в Docker-контейнер и подключить через Caddy.

#### Критерии приёмки
- [ ] `npm run build` — 0 ошибок
- [ ] `npm run lint` — 0 ошибок
- [ ] Docker build successful
- [ ] Caddy proxies to frontend:3001
- [ ] Caddy proxies /.ory/* to kratos:4433
- [ ] All pages load without errors

- **Тесты:** 0 (деплой верификация)
- **Зависимости:** US-065, US-063

---

## Summary

| US | Название | SP | Developer | Status |
|----|----------|-----|-----------|--------|
| US-065 | Platform Admin — Backend API | 5 | Nina | In Progress |
| US-066 | Platform Admin — Frontend UI | 5 | Nina | Blocked by US-065 |
| US-063 | External Services — Stripe Test | 3 | Max | In Progress |
| US-064 | Build & Deploy Frontend | 2 | Max | Blocked by US-065, US-063 |
| **Total** | **4 stories** | **15 SP** | **2 devs** | |
