# ADR-007: Миграция с Ory Kratos на WorkOS

**Статус:** Принято
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Контекст:** Пересмотр решения ADR-006 (Ory Kratos vs WorkOS) в контексте TUI+SaaS Dual-Product Model
**Supersedes:** ADR-006 (Ory Kratos вместо WorkOS)

---

## Контекст

ADR-006 (2026-02-09) выбрал Ory Kratos (self-hosted EU) из-за EU data residency. С тех пор:

1. **Complior стал dual-product** (TUI + SaaS): TUI = open-source (no auth), SaaS = paid dashboard. SaaS теперь нуждается в Enterprise SSO для конверсии Growth → Scale/Enterprise.
2. **WorkOS добавил SCC-compliant transfer mechanisms** для EU клиентов (Standard Contractual Clauses).
3. **Operational burden Ory** оказался выше ожидаемого: Kratos config, migration scripts, debug sessions, Caddy proxy routes, Docker service.
4. **Enterprise SSO** — ключевой blocker для Scale/Enterprise тарифов. Ory Enterprise License ($3,000+/мес) vs WorkOS SSO (бесплатно до 1M MAU).
5. **Auth data ≠ compliance data**: пользовательские credentials ≠ AI tool classifications. EU clients заботятся о том, где хранятся их compliance данные (PostgreSQL on Hetzner = EU), а не auth tokens.

## Рассмотренные варианты

### Вариант A: Оставить Ory Kratos (ADR-006)

**Плюсы:**
- EU data residency для auth data (Hetzner DE)
- Open-source, нет vendor lock-in

**Минусы:**
- Self-hosting burden: Docker service, config, migrations, monitoring
- SAML SSO = Ory Enterprise License ($3,000+/мес) → блокирует Enterprise тариф
- Нет hosted login → нужно строить UI самим
- Caddy proxy routes, webhook sync complexity
- Нет org management из коробки

### Вариант B: WorkOS (managed) — ВЫБРАН

**Плюсы:**
- **SSO бесплатно до 1M MAU** (SAML/OIDC) — критично для Enterprise тарифа
- **AuthKit** — hosted login/registration UI (не нужно строить самим)
- **Organization management** — native API, не нужно реализовывать отдельно
- **Zero operational overhead** — нет Docker service, нет config, нет migrations
- **MFA** из коробки (TOTP, SMS)
- **Bot protection** (Radar) — бесплатно
- **SCC-compliant** — Standard Contractual Clauses для EU transfer

**Минусы:**
- US data center (auth tokens хранятся в AWS US)
- Vendor lock-in (proprietary API)
- Зависимость от внешнего сервиса

## Решение

**Мигрировать с Ory Kratos на WorkOS.**

## Обоснование

| Критерий | Ory Kratos (ADR-006) | WorkOS (ADR-007) |
|----------|:---:|:---:|
| **SSO (SAML/OIDC)** | $3,000+/мес (OEL) | **Бесплатно до 1M MAU** |
| Operational overhead | Docker + config + monitoring | **Zero (managed)** |
| Hosted login UI | Нет (строим сами) | **AuthKit (hosted)** |
| Org management | Строим сами | **Native API** |
| MFA | Ory config | **Из коробки** |
| EU data residency | ✅ Hetzner DE | ❌ US (SCC-compliant) |
| Open-source | Apache 2.0 | Proprietary |
| Cost at MVP (50 users) | ~€10-20/мес infra | $0 |
| Cost at 5 SSO connections | $3,000+/мес | $0 |

**Решающие факторы:**

1. **Enterprise SSO** — без WorkOS мы не можем предложить SSO на Scale/Enterprise тарифах без $3K+/мес расходов на Ory Enterprise License.
2. **Compliance data ≠ Auth data** — наши клиенты заботятся о том, где хранятся их AI tool classifications, FRIA assessments и compliance documents (PostgreSQL on Hetzner = EU). Auth tokens — менее чувствительные данные.
3. **Operational simplification** — убираем Kratos Docker service, Caddy `.ory/*` routes, webhook sync, identity migration scripts. Docker stack: 7 → 6 сервисов.
4. **Time to market** — WorkOS AuthKit = ready-to-use login/registration UI. Не тратим спринт на auth UI.

## Миграция

### Что убираем
- `docker-compose.production.yml`: Kratos service, volumes, networks
- `caddy/Caddyfile`: `.ory/*` reverse proxy routes
- `server/infrastructure/auth/ory-client.js` → заменяем на `workos-client.js`
- `app/application/iam/syncUserFromOry.js` → `syncUserFromWorkOS.js`
- `app/api/auth/webhook.js` → `app/api/auth/callback.js`
- `app/config/ory.js` → `app/config/workos.js`

### Что добавляем
- WorkOS SDK: `@workos-inc/node`
- Environment variables: `WORKOS_CLIENT_ID`, `WORKOS_API_KEY`, `WORKOS_REDIRECT_URI`, `WORKOS_COOKIE_PASSWORD`
- AuthKit callback endpoint: `GET /api/auth/callback`
- Session middleware: WorkOS session cookie verification

### Схема данных
- `User.oryId` → `User.workosUserId`
- `Organization` += `workosOrgId`

### User ID mapping
Для существующих пользователей (если есть при миграции):
1. Экспорт Ory identities
2. Bulk import в WorkOS
3. Маппинг: `oryId` → `workosUserId` в нашей БД
4. Проверка: все sessions инвалидированы, пользователи re-login через WorkOS AuthKit

## Последствия

### Позитивные
- Enterprise SSO бесплатно (SAML/OIDC) → разблокирует Scale/Enterprise тарифы
- Минус один Docker service → упрощение infrastructure
- AuthKit → не нужно строить auth UI
- Org management native → упрощение invite flow

### Негативные
- Auth data в US (SCC-compliant, но не EU-hosted)
- Vendor lock-in на WorkOS API
- Потерян "100% EU data sovereignty" messaging → заменяем на "Compliance data in EU, auth via SCC-compliant provider"

## Связанные решения
- ARCHITECTURE.md v3.0.0 §4.1 IAM Context
- DATABASE.md v3.0.0 (User.workosUserId, Organization.workosOrgId)
- PRODUCTION-STACK.md v3.0.0 (Docker stack 7→6, WorkOS env vars)
- TECH-STACK.md v3.0.0 (Auth section)
- Sprint 7 (SaaS): WorkOS migration implementation
