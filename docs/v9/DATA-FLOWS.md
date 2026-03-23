# DATA-FLOWS.md -- Потоки данных SaaS Dashboard Complior v9

**Версия:** 9.0.0
**Дата:** 2026-03-06
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено
**Зависимости:** PRODUCT-BACKLOG-SaaS.md v9, DATABASE.md v9, ARCHITECTURE.md v9

> **Этот документ** описывает потоки данных SaaS-платформы Complior (проприетарный Dashboard). Потоки ВНУТРИ SaaS (фронтенд, бэкенд, БД, внешние сервисы), МЕЖДУ CLI и SaaS (протокол синхронизации), SaaS-специфичные workflow (FRIA wizard, Audit Package, Gap Analysis, Registry).
>
> **Полные потоки данных платформы** (open-source Engine + CLI + SDK + MCP + SaaS): см. `~/complior/docs/v9/DATA-FLOWS.md`

---

## Содержание

1. [Обзор потоков данных SaaS](#1-обзор-потоков-данных-saas)
2. [Аутентификация и авторизация (DF-S01..S05)](#2-аутентификация-и-авторизация-df-s01s05)
3. [AI Tool Management (DF-S10..S13)](#3-ai-tool-management-df-s10s13)
4. [Compliance Workflows (DF-S20..S24)](#4-compliance-workflows-df-s20s24)
5. [CLI Sync (DF-S30..S34)](#5-cli-sync-df-s30s34)
6. [Биллинг (DF-S40..S42)](#6-биллинг-df-s40s42)
7. [Мониторинг и отчёты (DF-S50..S52)](#7-мониторинг-и-отчёты-df-s50s52)

---

## 1. Обзор потоков данных SaaS

### 1.1 Мастер-диаграмма SaaS

```
+============================================================================+
|                     SaaS Dashboard (ai-act-compliance-platform)             |
|                                                                            |
|  +-----------------+    +------------------+    +------------------------+ |
|  |  Next.js 14     |    |  Fastify 5 API   |    |  PostgreSQL 16         | |
|  |  (App Router)   |--->|  (REST, 80+      |--->|  Hetzner EU            | |
|  |  TailwindCSS    |    |   эндпоинтов)    |    |  39 таблиц             | |
|  |  shadcn/ui      |    |                  |    |  10 Bounded Contexts   | |
|  |  Recharts       |    |  Zod валидация   |    |  pg-boss (очереди)     | |
|  +---------+-------+    +----+--------+----+    +----------+-------------+ |
|            |                 |        |                     |               |
|            |     +-----------+        +----------+          |               |
|            |     |                               |          |               |
|     +------+-----+------+              +---------+--------+ |               |
|     |                    |              |                  | |               |
|  +--v---------+  +-------v------+   +--v-----------+  +---v---------+      |
|  | WorkOS     |  | Mistral LLMs |   | Stripe       |  | Gotenberg   |      |
|  | (SSO/Auth) |  | small/medium |   | (Billing)    |  | (PDF gen)   |      |
|  +------------+  +--------------+   +--------------+  +-------------+      |
|                                                                            |
|  +-------------------------------+    +-------------------------------+    |
|  | Brevo (Transactional email)   |    | S3 / Hetzner Object Storage  |    |
|  | Приглашения, уведомления      |    | Audit Package ZIP, PDF, data |    |
|  +-------------------------------+    +-------------------------------+    |
+====================================+=======================================+
                                      |
                   HTTPS (JWT Bearer) | DF-S30..S34 (Sync Protocol)
                                      |
+=====================================v=======================================+
|                    Open-Source CLI (complior)                                |
|                                                                             |
|  .complior/                ~/.config/complior/                              |
|    passports/*.json          credentials (JWT)                              |
|    evidence/chain.json       keys/ (ed25519)                                |
|    fria/*.md                                                                |
|    scans/latest.json                                                        |
+=============================================================================+
```

### 1.2 Индекс потоков данных SaaS

| Домен | ID | Поток | Компоненты |
|-------|----|-------|------------|
| **Аутентификация** | DF-S01 | Регистрация пользователя | WorkOS, webhook, User + Org |
| | DF-S02 | Вход пользователя (SSO/email) | WorkOS, JWT, session |
| | DF-S03 | Device Flow для CLI | API, user_code, browser, JWT |
| | DF-S04 | Обновление токена | refresh_token, JWT |
| | DF-S05 | Приглашение в команду | Brevo, Invitation, OrganizationMember |
| **AI Tool Management** | DF-S10 | Добавление AI tool вручную | Wizard, AITool, RiskClassification |
| | DF-S11 | Импорт из CLI | Passport push, AITool, cli_passport_id |
| | DF-S12 | Классификация рисков | Rule Engine, AESIA, risk_level |
| | DF-S13 | Registry API поиск | APIKey, rate limit, RegistryTool |
| **Compliance Workflows** | DF-S20 | FRIA wizard | 6 секций, LLM, Gotenberg PDF |
| | DF-S21 | Генерация документов | Шаблон, LLM, approval, PDF |
| | DF-S22 | Gap Analysis | ScanResult, 12 AESIA категорий |
| | DF-S23 | Audit Package | ZIP, S3, все артефакты |
| | DF-S24 | ISO 42001 Readiness | 39 контролей, маппинг, score |
| **CLI Sync** | DF-S30 | Passport sync | POST /api/sync/passports, upsert |
| | DF-S31 | Scan sync | POST /api/sync/scans, score update |
| | DF-S32 | Document sync | POST /api/sync/documents, batch |
| | DF-S33 | Data bundle | GET /api/bundle, ETag, S3 |
| | DF-S34 | Score sync | dual display, dashboard |
| **Биллинг** | DF-S40 | Stripe Checkout | session, redirect, webhook |
| | DF-S41 | Stripe Webhook | invoice.paid, Subscription |
| | DF-S42 | Проверка лимитов плана | tool count, plan.limits |
| **Мониторинг** | DF-S50 | Рендеринг Dashboard | 12 виджетов, агрегация |
| | DF-S51 | Compliance Report | tool, scan, docs, FRIA, PDF |
| | DF-S52 | Timeline обязательств | 108 obligations, critical path |

---

## 2. Аутентификация и авторизация (DF-S01..S05)

### DF-S01: Регистрация пользователя

Новый пользователь регистрируется через WorkOS AuthKit. Webhook создает
внутренние записи User и Organization.

```
Пользователь
     |
     |  1. Открывает /signup в браузере
     v
+-----------+     2. Redirect на AuthKit     +-----------+
| Next.js   |------------------------------->| WorkOS    |
| Frontend  |                                | AuthKit   |
+-----------+                                +-----+-----+
                                                   |
                                    3. Пользователь заполняет:
                                       email, пароль, имя, организация
                                                   |
                              4. WorkOS создает User + Organization
                                                   |
     +---------------------------------------------+
     |  5. Webhook POST /api/webhooks/workos
     v
+-----------+     6. Валидация подписи webhook (svix)
| Fastify   |
| API       |
+-----+-----+
      |
      |  7. Транзакция:
      |     BEGIN
      |       INSERT User {workos_id, email, name, avatar_url}
      |       INSERT Organization {workos_org_id, name, plan: 'starter'}
      |       INSERT OrganizationMember {user_id, org_id, role: 'admin'}
      |     COMMIT
      v
+-----------+
| PostgreSQL|
+-----------+
      |
      |  8. Redirect обратно в приложение с session cookie
      v
+-----------+
| Next.js   |  9. Dashboard загружается (план Starter, 3 AI tool, 1 пользователь)
| Frontend  |
+-----------+

Данные:
  Вход: email, имя, название организации
  WorkOS: User ID, Organization ID
  БД: User + Organization + OrganizationMember (role: admin)
  Сессия: JWT (access_token, 1ч) + refresh_token (30д)
  Лимиты Starter: max_tools=3, max_users=1, max_scans_per_month=100
```

---

### DF-S02: Вход пользователя (SSO/email)

Аутентификация через WorkOS AuthKit -- SSO (Enterprise EUR 499/мес) или email/пароль.

```
Пользователь
     |
     |  1. Открывает /login
     v
+-----------+     2. Redirect на WorkOS AuthKit     +-----------+
| Next.js   |-------------------------------------->| WorkOS    |
| Frontend  |                                       | AuthKit   |
+-----------+                                       +-----+-----+
                                                          |
                                          3. SSO / Email+Password / Google
                                                          |
                                  4. Успешная аутентификация
                                     WorkOS выдает authorization code
                                                          |
     +----------------------------------------------------+
     |  5. Callback GET /api/auth/callback?code=xxx
     v
+-----------+
| Fastify   |  6. POST https://api.workos.com/user_management/authenticate
| API       |     {code, client_id, client_secret}
+-----+-----+
      |
      |  7. WorkOS возвращает: {user, organizationId, accessToken, refreshToken}
      |
      |  8. SELECT User WHERE workos_id = $workos_id
      |     -> Обновить last_login_at
      |
      |  9. Генерация внутреннего JWT:
      |     payload: {userId, orgId, role, email}
      |     access_token: 1ч, refresh_token: 30д
      |
      |  10. Set-Cookie: complior_session (httpOnly, secure, sameSite=strict)
      v
+-----------+
| Next.js   |  11. Redirect на /dashboard
| Frontend  |      RSC загружает данные с JWT в cookie
+-----------+

Данные:
  Вход: email/пароль или SSO credentials
  WorkOS: authorization code -> tokens
  JWT claims: {userId, orgId, role, email, exp}
  Cookie: httpOnly, secure, sameSite=strict, maxAge=30d
  Enterprise (EUR 499/мес) SSO: SAML/OIDC через WorkOS Directory Sync
```

---

### DF-S03: Device Flow для CLI

OAuth 2.0 Device Authorization Grant (RFC 8628) -- CLI авторизуется через браузер.
Аналогично `gh auth login`.

```
CLI (complior login)                  SaaS API                         Браузер
     |                                   |                                |
     |  1. POST /api/auth/device {}      |                                |
     |---------------------------------->|                                |
     |                                   |                                |
     |                          2. Генерация:                             |
     |                             deviceCode = crypto.randomUUID()       |
     |                             userCode = random 8 символов (A-Z0-9)  |
     |                             expiresAt = now() + 15 мин             |
     |                                   |                                |
     |                          3. INSERT DeviceCode                      |
     |                             {device_code, user_code,               |
     |                              status: 'pending',                    |
     |                              expires_at, interval: 5}              |
     |                                   |                                |
     |  4. Response:                     |                                |
     |  {deviceCode, userCode,           |                                |
     |   verificationUri:                |                                |
     |   "https://app.complior.dev       |                                |
     |    /device",                      |                                |
     |   expiresIn: 900,                 |                                |
     |   interval: 5}                    |                                |
     |<----------------------------------|                                |
     |                                   |                                |
     |  5. CLI выводит:                  |                                |
     |  "Откройте https://app.           |                                |
     |   complior.dev/device             |                                |
     |   и введите код: ABCD-1234"       |                                |
     |                                   |                                |
     |                                   |     6. Пользователь открывает  |
     |                                   |        /device в браузере      |
     |                                   |                                |
     |                                   |     7. Вводит userCode         |
     |                                   |                                |
     |                                   |  8. POST /api/auth/device-     |
     |                                   |     confirm {userCode}         |
     |                                   |     (с session cookie)         |
     |                                   |<-------------------------------|
     |                                   |                                |
     |                          9. Валидация:                             |
     |                             SELECT DeviceCode                      |
     |                               WHERE user_code = $userCode          |
     |                               AND status = 'pending'               |
     |                               AND expires_at > NOW()               |
     |                                   |                                |
     |                          10. UPDATE DeviceCode SET                  |
     |                              status = 'authorized',                |
     |                              user_id = session.userId,             |
     |                              organization_id = session.orgId       |
     |                                   |                                |
     |                                   |  11. "Устройство авторизовано" |
     |                                   |------------------------------->|
     |                                   |                                |
     |  12. Poll POST /api/auth/token    |                                |
     |      {deviceCode} каждые 5с       |                                |
     |---------------------------------->|                                |
     |                                   |                                |
     |                          13. SELECT DeviceCode                     |
     |                              WHERE device_code = $deviceCode       |
     |                                   |                                |
     |                              pending -> {error:                    |
     |                                "authorization_pending"}            |
     |                                   |                                |
     |                              authorized ->                         |
     |                                UPDATE status = 'used'              |
     |                                Генерация JWT:                      |
     |                                {accessToken (1ч),                  |
     |                                 refreshToken (30д)}                |
     |                                   |                                |
     |  14. Response:                    |                                |
     |  {accessToken, refreshToken,      |                                |
     |   expiresAt, email, orgName}      |                                |
     |<----------------------------------|                                |
     |                                   |                                |
     |  15. CLI сохраняет в              |                                |
     |  ~/.config/complior/credentials:  |                                |
     |  COMPLIOR_ACCESS_TOKEN=eyJ...     |                                |
     |  COMPLIOR_REFRESH_TOKEN=dGh...    |                                |
     |  COMPLIOR_TOKEN_EXPIRES_AT=...    |                                |
     |  COMPLIOR_USER_EMAIL=...          |                                |
     |  COMPLIOR_ORG_NAME=...            |                                |
     |                                   |                                |
     |  16. "Вы вошли как user@co.com    |                                |
     |       (My Organization)"          |                                |

Данные:
  DeviceCode: {device_code, user_code, expires_at, interval, status}
  Статусы: pending -> authorized -> used | expired
  Токены: accessToken (JWT, 1ч), refreshToken (opaque, 30д)
  Credentials: ~/.config/complior/credentials (chmod 0600)
  Таймауты: deviceCode 15 мин, polling 5с, max attempts 180
```

---

### DF-S04: Обновление токена (Token Refresh)

Автоматическое обновление истекшего access token через refresh token.

```
CLI или Frontend
     |
     |  1. Запрос к API с Bearer token
     |     Authorization: Bearer <accessToken>
     v
+-----------+
| Fastify   |  2. Middleware: verifyJWT(accessToken)
| API       |     -> JWT expired (exp < now)
+-----+-----+
      |
      |  3. Response: 401 Unauthorized
      |     {error: "token_expired"}
      v
CLI или Frontend
     |
     |  4. POST /api/auth/refresh
     |     {refreshToken}
     v
+-----------+
| Fastify   |  5. Валидация refreshToken:
| API       |     SELECT RefreshToken WHERE token_hash = SHA256($refreshToken)
|           |     AND expires_at > NOW()
|           |     AND revoked = false
+-----+-----+
      |
      |  6. Генерация новой пары:
      |     newAccessToken (JWT, 1ч)
      |     newRefreshToken (opaque, 30д)
      |
      |  7. Ротация: старый refreshToken помечается revoked = true
      |     INSERT новый refreshToken
      |
      |  8. Response:
      |     {accessToken, refreshToken, expiresAt}
      v
CLI или Frontend
     |
     |  9. CLI: обновляет ~/.config/complior/credentials
     |     Frontend: обновляет cookie
     |
     |  10. Повтор исходного запроса с новым accessToken

Данные:
  Вход: refreshToken (opaque string)
  Ротация: старый token revoked, новый token создан
  accessToken: JWT, 1ч, claims: {userId, orgId, role}
  refreshToken: opaque, 30д, хранится как SHA-256 hash в БД
  Безопасность: one-time use (rotation), revocation при утечке
```

---

### DF-S05: Приглашение в команду

Admin приглашает участника в организацию. Email через Brevo.

```
Admin (Dashboard)
     |
     |  1. POST /api/organizations/{orgId}/invite
     |     {email: "colleague@company.com", role: "member"}
     v
+-----------+
| Fastify   |  2. Проверки:
| API       |     - Пользователь с таким email ещё не в организации
|           |     - Лимит плана: Organization.plan.limits.max_users
|           |     - Role: admin | member | viewer
+-----+-----+
      |
      |  3. INSERT Invitation {
      |       email, organization_id, role,
      |       token: crypto.randomBytes(32).toString('hex'),
      |       expires_at: now() + 7 дней,
      |       status: 'pending'
      |     }
      |
      |  4. INSERT AuditLog {action: 'invite_sent', resource_type: 'invitation'}
      v
+-----------+
| Brevo     |  5. Transactional email:
| (email)   |     "Вас пригласили в {orgName} на Complior.
|           |      Нажмите для принятия: https://app.complior.dev/invite/{token}"
+-----------+
      |
      v
Приглашённый
     |
     |  6. Переход по ссылке /invite/{token}
     v
+-----------+
| Next.js   |  7. GET /api/invitations/{token}
| Frontend  |     -> Проверка: token существует, не expired, status = 'pending'
+-----------+
     |
     |  8. Если пользователь не зарегистрирован:
     |     Redirect на WorkOS signup (pre-filled email)
     |     Если зарегистрирован: показать "Принять приглашение?"
     |
     |  9. POST /api/invitations/{token}/accept
     v
+-----------+
| Fastify   |  10. Транзакция:
| API       |      BEGIN
|           |        UPDATE Invitation SET status = 'accepted'
|           |        INSERT OrganizationMember {user_id, org_id, role}
|           |        INSERT AuditLog {action: 'invitation_accepted'}
|           |      COMMIT
+-----+-----+
      |
      |  11. Redirect на /dashboard организации
      v
+-----------+
| Next.js   |  12. Участник видит Dashboard организации
+-----------+

Данные:
  Invitation: {id, email, org_id, role, token, expires_at, status}
  Статусы: pending -> accepted | expired
  Email: Brevo transactional API (шаблон invite_team_member)
  Лимиты: Starter=1 user, Growth=10, Enterprise=unlimited
  AuditLog: invite_sent + invitation_accepted
  Безопасность: token одноразовый, expires через 7 дней
```

---

## 3. AI Tool Management (DF-S10..S13)

### DF-S10: Добавление AI tool вручную (Wizard)

Пользователь добавляет AI-систему через пошаговый wizard в Dashboard.

```
Пользователь (Dashboard)
     |
     |  1. Нажимает "Add AI System"
     |     Wizard шаг 1: Базовая информация
     v
+-----------+
| Next.js   |  Форма:
| (Wizard)  |    name: "HireVue AI Screening"
|           |    description: "..."
| Шаг 1/5   |    provider: "HireVue"    <--- Автозаполнение из Registry
|           |    model: "proprietary"
|           |    domain: "HR"
+-----------+
     |
     |  2. Wizard шаг 2: Классификация
     v
+-----------+
| Next.js   |  Выбор:
| (Wizard)  |    Категория использования (employment, credit, law, ...)
| Шаг 2/5   |    Пользовательская оценка рисков
+-----------+
     |
     |  3. POST /api/tools
     |     {name, description, provider, model, domain, category}
     v
+-----------+
| Fastify   |  4. Валидация (Zod: CreateToolSchema)
| API       |
+-----+-----+
      |
      |  5. Проверка лимита плана:
      |     SELECT COUNT(*) FROM AITool WHERE organization_id = $orgId
      |     -> count >= plan.limits.max_tools ? -> 403 Plan Limit Exceeded
      |
      |  6. INSERT AITool {
      |       organization_id, name, description, provider, model,
      |       risk_level: 'pending',
      |       status: 'active',
      |       passport_data: {},
      |       scan_data: {},
      |       wizard_step: 2
      |     }
      |
      |  7. Автоматическая классификация (Rule Engine):
      |     -> mapCategoryToRisk(category, description)
      v
+-----------+
| Rule      |  8. Движок классификации:
| Engine    |     - Категория "employment" -> Annex III, п.4 -> high_risk
|           |     - Confidence: 85%
|           |     - Метод: 'rule_engine'
+-----+-----+
      |
      |  9. INSERT RiskClassification {
      |       tool_id, risk_level: 'high',
      |       method: 'rule_engine', confidence: 85,
      |       article_references: ['Annex III, 4(a)']
      |     }
      |
      |  10. mapRequirements(toolId, 'high'):
      |      INSERT ToolRequirement для каждого applicable обязательства
      |
      |  11. INSERT AuditLog {action: 'tool_created'}
      v
+-----------+
| Next.js   |  12. Redirect на /tools/{toolId}
| Dashboard |      Показать: risk_level, obligations, gap status
+-----------+

Данные:
  Вход: name, description, provider, model, domain, category
  AITool: 13 полей (см. DATABASE.md)
  RiskClassification: risk_level + confidence + method + articles
  ToolRequirement: маппинг обязательств EU AI Act для данного risk_level
  AuditLog: tool_created, classification_completed
  Wizard: 5 шагов (1-2 реализованы, 3-5 запланированы в F46)
```

---

### DF-S11: Импорт из CLI (Passport Push)

CLI отправляет Agent Passport в SaaS. Создает или обновляет AITool.
Детальная диаграмма протокола -- см. DF-S30.

```
CLI (complior sync)
     |
     |  1. POST /api/sync/passports
     |     Authorization: Bearer <JWT>
     |     Body: {passport: AgentManifest (36 полей)}
     v
+-----------+
| Fastify   |  2. resolveApiAuth(headers) -> {userId, organizationId}
| API       |  3. validateSync(body, SyncPassportSchema)
+-----+-----+
      |
      |  4. Маппинг 36 CLI полей -> 21 SaaS полей:
      |     name, vendorName, vendorUrl, description, purpose, domain,
      |     riskLevel, autonomyLevel, framework, modelProvider, modelId,
      |     dataResidency, compliorScore, lifecycleStatus,
      |     detectionPatterns, versions, manifestVersion, signature
      |     -> syncMetadata (агрегация остальных)
      |
      |  5. SELECT AITool
      |     WHERE LOWER(name) = LOWER($name) AND organization_id = $orgId
      |
      |     EXISTS -> UPDATE (merge, см. DF-S30 для правил конфликтов)
      |     NOT EXISTS -> INSERT AITool {21 полей + cli_passport_id}
      |
      |  6. Если riskLevel новый:
      |     INSERT RiskClassification {method: 'cli_import', confidence: 50}
      |     mapRequirements(toolId, riskLevel)
      |
      |  7. INSERT SyncHistory {syncType: 'passport', status, conflicts[]}
      v
+-----------+
| Response  |  8. {action: 'created' | 'updated', toolId, conflicts[], fieldsUpdated}
+-----------+

Данные:
  Вход: AgentManifest (36 полей, ed25519 подписан)
  Маппинг: 36 -> 21 поле (автономность L1-L5, lifecycle status)
  Конфликты: CLI wins technical, SaaS wins organizational
  Выход: AITool record + SyncHistory + optional RiskClassification
```

---

### DF-S12: Классификация рисков (Rule Engine)

Детерминистический движок классификации AI-системы по EU AI Act.
4 уровня: Prohibited, High, Limited, Minimal.

```
Триггер: создание AITool (DF-S10) или обновление описания
     |
     v
+-----------+
| Fastify   |  1. POST /api/tools/{toolId}/classify
| API       |     или автоматически при создании
+-----+-----+
      |
      |  2. Загрузка данных:
      |     SELECT AITool {name, description, domain, category, provider}
      |     SELECT Obligation[] (108 обязательств)
      v
+-----------+
| Rule      |  3. Этап 1: Проверка на Prohibited (ст. 5)
| Engine    |     - Social scoring? -> prohibited
|           |     - Emotion recognition (workplace/education)? -> prohibited
|           |     - Biometric categorization (race, religion)? -> prohibited
|           |     - Predictive policing? -> prohibited
|           |     - Facial recognition DB? -> prohibited
|           |     -> Если совпадение: risk_level = 'prohibited', confidence 95%
+-----+-----+
      |
      |  4. Этап 2: Проверка на High-Risk (Annex III)
      |     8 категорий AESIA:
      |       1. Биометрия (удалённая идентификация)
      |       2. Критическая инфраструктура
      |       3. Образование и обучение
      |       4. Трудоустройство и управление персоналом
      |       5. Доступ к услугам (кредит, страхование)
      |       6. Правоохранительная деятельность
      |       7. Миграция и пограничный контроль
      |       8. Правосудие и демократия
      |     -> Если совпадение: risk_level = 'high', confidence 70-95%
      |
      |  5. Этап 3: Проверка на Limited Risk (ст. 50)
      |     - Chatbot / conversational AI? -> limited
      |     - Генерация контента (deepfakes)? -> limited
      |     - Emotion recognition (разрешённые)? -> limited
      |     -> risk_level = 'limited', confidence 80%
      |
      |  6. Этап 4: Default -> Minimal Risk
      |     risk_level = 'minimal', confidence 60%
      |
      |  7. Опциональная LLM верификация (Mistral Small):
      |     Промпт: "Classify this AI system: {description}"
      |     -> cross-validation с rule engine результатом
      |     -> Если расхождение: confidence -= 20%
      v
+-----------+
| PostgreSQL|  8. INSERT RiskClassification {
|           |       tool_id, risk_level, confidence,
|           |       method: 'rule_engine' | 'llm_assisted',
|           |       article_references, aesia_categories,
|           |       is_current: true
|           |     }
|           |
|           |  9. UPDATE AITool SET risk_level = $risk_level
|           |
|           |  10. INSERT ToolRequirement[]
|           |      для каждого applicable обязательства
|           |
|           |  11. INSERT AuditLog {action: 'classification_completed'}
+-----------+

Данные:
  Вход: AITool (name, description, domain, category)
  Rule Engine: 4 этапа (prohibited -> high -> limited -> minimal)
  AESIA: 8 категорий Annex III (12 подкатегорий)
  Confidence: 60-95% (снижается при LLM-расхождении)
  Выход: RiskClassification + ToolRequirement[] + AITool.risk_level
  LLM: Mistral Small (опционально, для cross-validation)
```

---

### DF-S13: Registry API поиск

Публичный API поиска AI-инструментов в реестре (5,011+ tools).
Используется как Dashboard'ом, так и внешними клиентами.

```
Клиент (Dashboard / внешний)
     |
     |  1. GET /api/registry/search?q=chatgpt&category=chatbot&limit=20
     |     Authorization: Bearer <API_KEY> (для внешних клиентов)
     |     или Cookie (для Dashboard)
     v
+-----------+
| Fastify   |  2. Rate limiting:
| API       |     - Dashboard: 100 req/min
|           |     - API Key (Growth): 1,000 req/day
|           |     - API Key (Enterprise): 10,000 req/day
+-----+-----+
      |
      |  3. Если API Key:
      |     SELECT APIKey WHERE key_hash = SHA256($apiKey)
      |     UPDATE APIKey SET last_used_at = NOW()
      |     INSERT APIUsage {api_key_id, endpoint, method, timestamp}
      |
      |  4. Full-text поиск:
      |     SELECT * FROM RegistryTool
      |     WHERE to_tsvector('english', name || ' ' || description)
      |           @@ plainto_tsquery('english', $q)
      |     AND ($category IS NULL OR category = $category)
      |     ORDER BY ts_rank(...) DESC
      |     LIMIT $limit
      v
+-----------+
| PostgreSQL|  5. Результат:
|           |     [{
|           |       id, name, provider, category,
|           |       risk_rating: "B",    // A+, A, B, C, D, F
|           |       description,
|           |       metadata: {pricing, features, compliance_notes}
|           |     }, ...]
+-----------+
      |
      |  6. Response:
      |     {results: [...], total: 47, page: 1, limit: 20}
      v
Клиент
     |
     |  7. Dashboard: показать в автозаполнении wizard'а (DF-S10, шаг 1)
     |     Внешний: использовать в procurement pipeline

Данные:
  Вход: query string (q, category, risk_rating, limit, offset)
  Индекс: GIN (to_tsvector) на RegistryTool.name
  Rate limit: по API Key или session, sliding window
  APIUsage: каждый вызов логируется (endpoint, response_time)
  Выход: массив RegistryTool + пагинация
  Каталог: 5,011+ инструментов, рейтинг A+ -- F
```

---

## 4. Compliance Workflows (DF-S20..S24)

### DF-S20: FRIA Wizard (6 секций + LLM + PDF)

Wizard для создания Fundamental Rights Impact Assessment (ст. 27 EU AI Act).
6 секций, 80% предзаполнение из Passport, LLM-черновик, рецензирование, PDF.

```
Пользователь (Dashboard)
     |
     |  1. Открывает /tools/{toolId}/fria -> "Start FRIA"
     v
+-----------+
| Next.js   |  2. GET /api/tools/{toolId}/fria/prefill
| (Wizard)  |
+-----------+
     |
     v
+-----------+
| Fastify   |  3. Загрузка данных для предзаполнения:
| API       |     SELECT AITool {name, description, risk_level, passport_data}
|           |     SELECT RiskClassification {aesia_categories, articles}
|           |     SELECT ToolRequirement[] {обязательства}
+-----+-----+
      |
      |  4. Предзаполнение 80% полей из Passport:
      |     Секция 1 (General Info):
      |       system_name <- passport.name
      |       description <- passport.description
      |       provider <- passport.vendorName
      |       risk_class <- classification.risk_level
      |       deployment_date <- passport.lifecycle.deployed_at
      |
      |     Секция 2 (Affected Persons):
      |       data_subjects <- passport.permissions.data_access
      |       autonomy_level <- passport.autonomy_level
      |
      |     Секция 3 (Specific Risks):
      |       identified_risks <- classification.aesia_categories
      |
      |     Секция 4 (Human Oversight):
      |       oversight_measures <- passport.constraints.human_approval_required
      |       kill_switch <- passport.constraints (наличие)
      |
      |  5. Для каждой секции -- LLM-черновик:
      v
+-----------+
| Mistral   |  6. POST /v1/chat/completions (mistral-medium)
| Medium    |     Промпт: "На основе данных AI-системы {name} с risk class
|           |     {risk_level} создайте черновик секции '{section_name}' FRIA
|           |     по ст. 27 EU AI Act. Данные: {prefilled_data}"
|           |     -> Черновик текста секции (300-500 слов)
+-----------+
      |
      v
+-----------+
| Next.js   |  7. Wizard отображает 6 секций:
| (Wizard)  |
|           |  Секция 1: Общая информация        [предзаполнено] [LLM-черновик]
|           |  Секция 2: Затронутые лица          [предзаполнено] [LLM-черновик]
|           |  Секция 3: Специфические риски      [LLM-черновик]  [ручной ввод]
|           |  Секция 4: Человеческий надзор      [предзаполнено] [LLM-черновик]
|           |  Секция 5: Меры по смягчению        [ручной ввод]
|           |  Секция 6: План мониторинга         [LLM-черновик]  [ручной ввод]
|           |
|           |  8. Пользователь редактирует каждую секцию
|           |     (WYSIWYG-редактор с markdown)
+-----------+
     |
     |  9. POST /api/tools/{toolId}/fria
     |     {sections: [{section_number, content, status}, ...6]}
     v
+-----------+
| Fastify   |  10. Транзакция:
| API       |      BEGIN
|           |        UPSERT FRIAAssessment {tool_id, status: 'draft'}
|           |        UPSERT FRIASection x6 {fria_id, section_number, content}
|           |      COMMIT
+-----+-----+
      |
      |  11. Workflow одобрения:
      |      Автор -> Рецензент (DPO/Legal) -> Approve / Reject
      |
      |      POST /api/fria/{friaId}/submit -> status: 'in_review'
      |      POST /api/fria/{friaId}/approve -> status: 'approved'
      |      POST /api/fria/{friaId}/reject -> status: 'draft' (с комментариями)
      |
      |  12. После approve -> генерация PDF:
      v
+-----------+
| Gotenberg |  13. POST /forms/chromium/convert/html
| (PDF gen) |     Body: HTML из markdown-секций + header/footer/logo
|           |     -> PDF документ (10-30 страниц)
+-----------+
      |
      |  14. Upload PDF в S3 / Hetzner Object Storage
      |      UPDATE FRIAAssessment SET pdf_url = $url
      |
      |  15. INSERT AuditLog {action: 'fria_completed'}
      v
+-----------+
| Dashboard |  16. FRIA доступен для скачивания (PDF + markdown)
|           |      Включен в Audit Package (DF-S23)
+-----------+

Данные:
  FRIAAssessment: {id, tool_id, sections (JSONB), status, pdf_url}
  FRIASection: 6 секций (general_info, affected_persons, specific_risks,
    human_oversight, mitigation_measures, monitoring_plan)
  Статусы: draft -> in_review -> approved | rejected
  LLM: Mistral Medium (~$0.019/запрос, 6 запросов на FRIA = ~$0.12)
  PDF: Gotenberg (Chromium headless, self-hosted)
  Предзаполнение: ~80% из Passport + RiskClassification
```

---

### DF-S21: Генерация compliance-документов

Генерация 5 типов compliance-документов с LLM-дозаполнением, approval workflow и PDF.

```
Пользователь (Dashboard)
     |
     |  1. POST /api/tools/{toolId}/documents/generate
     |     {type: 'AI_POLICY' | 'QMS' | 'RISK_PLAN' | 'MONITORING' | 'WORKER_NOTIFICATION'}
     v
+-----------+
| Fastify   |  2. Загрузка контекста:
| API       |     SELECT AITool + passport_data + scan_data
|           |     SELECT RiskClassification + ToolRequirement[]
|           |     SELECT existing ComplianceDocument (если есть)
+-----+-----+
      |
      |  3. Выбор шаблона по типу:
      |     AI_POLICY           -> art4-ai-policy-template.md
      |     QMS                 -> art17-qms-template.md
      |     RISK_PLAN           -> art9-risk-plan-template.md
      |     MONITORING          -> art72-monitoring-template.md
      |     WORKER_NOTIFICATION -> art26-7-worker-notification-template.md
      |
      |  4. Предзаполнение шаблона данными из Passport:
      |     {{system_name}} <- AITool.name
      |     {{provider}} <- AITool.provider
      |     {{risk_level}} <- AITool.risk_level
      |     {{obligations}} <- ToolRequirement[].description
      |     {{owner}} <- passport_data.owner
      |     ...
      v
+-----------+
| Mistral   |  5. POST /v1/chat/completions (mistral-medium)
| Medium    |     Промпт: "Заполните секции документа {type} для AI-системы
|           |     {name}. Контекст: {prefilled_template}. Требования EU AI Act:
|           |     {applicable_articles}. Секции для заполнения: {empty_sections}"
|           |     -> Заполненные секции (1,000-5,000 слов)
+-----------+
      |
      v
+-----------+
| Fastify   |  6. Парсинг ответа LLM в секции:
| API       |     sections: [{title, content, order}, ...]
+-----+-----+
      |
      |  7. INSERT ComplianceDocument {
      |       tool_id, organization_id, type,
      |       content: full_markdown,
      |       sections: JSONB (структурированные секции),
      |       status: 'draft',
      |       metadata: {source: 'llm_generated', model: 'mistral-medium'}
      |     }
      |
      |  8. Approval workflow (аналогично FRIA):
      |     draft -> review -> approved (с approvedBy, approvedAt)
      |
      |  9. PDF генерация (Gotenberg) после approve
      |     UPDATE ComplianceDocument SET file_url = $pdfUrl
      |
      |  10. INSERT AuditLog {action: 'document_generated'}
      v
+-----------+
| Dashboard |  11. Документ в списке:
|           |     /tools/{toolId}/documents
|           |     Статус, автор, версия, PDF download
+-----------+

Данные:
  ComplianceDocument: {id, tool_id, org_id, type, content, sections, status}
  8 типов: FRIA, AI_POLICY, QMS, RISK_PLAN, WORKER_NOTIFICATION,
           TECH_DOCS, MONITORING, DECLARATION
  Approval: draft -> review -> approved | rejected
  Версионирование: version++ при каждом обновлении
  LLM: Mistral Medium, ~$0.019/запрос
  Лимиты: Starter=3 документа, Growth/Enterprise=unlimited
```

---

### DF-S22: Gap Analysis (12 категорий AESIA)

Анализ пробелов в compliance для AI-системы. 12 категорий AESIA, процент покрытия,
оценка трудозатрат.

```
Пользователь (Dashboard)
     |
     |  1. Открывает /tools/{toolId}/gap-analysis
     v
+-----------+
| Next.js   |  2. GET /api/tools/{toolId}/gap-analysis
+-----------+
     |
     v
+-----------+
| Fastify   |  3. Сбор данных:
| API       |     SELECT AITool {risk_level, scan_data, passport_data}
|           |     SELECT ScanResult[] (последние, из CLI sync)
|           |     SELECT ComplianceDocument[] WHERE tool_id
|           |     SELECT FRIAAssessment WHERE tool_id
|           |     SELECT ToolRequirement[] WHERE tool_id
+-----+-----+
      |
      |  4. Анализ по 12 категориям AESIA:
      |
      |     Для каждой категории:
      |       covered = (документы + scan findings pass + passport fields)
      |       total = (обязательства для данного risk_level)
      |       coverage_pct = covered / total * 100
      |       effort_hours = (total - covered) * weight_per_category
      |
      |     Категории:
      |     +----+-------------------------------+----------+--------+--------+
      |     | #  | Категория AESIA               | Покрытие | Статус | Effort |
      |     +----+-------------------------------+----------+--------+--------+
      |     |  1 | Quality Management System     |    40%   | RED    |  40ч   |
      |     |  2 | Risk Management               |    75%   | YELLOW |  16ч   |
      |     |  3 | Human Oversight               |    90%   | GREEN  |   4ч   |
      |     |  4 | Data Governance               |    20%   | RED    |  32ч   |
      |     |  5 | Transparency                  |    85%   | GREEN  |   8ч   |
      |     |  6 | Accuracy & Robustness         |    50%   | YELLOW |  24ч   |
      |     |  7 | Cybersecurity                 |    60%   | YELLOW |  16ч   |
      |     |  8 | Logging & Traceability        |    95%   | GREEN  |   2ч   |
      |     |  9 | Technical Documentation       |    30%   | RED    |  48ч   |
      |     | 10 | Post-Market Monitoring        |    10%   | RED    |  24ч   |
      |     | 11 | Incident Reporting            |     0%   | RED    |  16ч   |
      |     | 12 | Conformity Assessment         |     0%   | RED    |  40ч   |
      |     +----+-------------------------------+----------+--------+--------+
      |
      |  5. Агрегация:
      |     total_coverage = weighted_avg(category_coverages)
      |     total_effort = sum(category_efforts)
      |     critical_gaps = categories WHERE coverage < 30%
      |
      |  6. UPSERT GapAnalysis {
      |       tool_id,
      |       categories: JSONB (12 категорий с деталями),
      |       coverage_pct: 46.25,
      |       effort_estimate: '270 hours (~7 weeks)'
      |     }
      v
+-----------+
| Next.js   |  7. Визуализация:
| Dashboard |
|           |  +---------------------------------------------+
|           |  |  Gap Analysis: HireVue AI Screening          |
|           |  |  Overall: 46% covered | Est. effort: 7 weeks |
|           |  |                                              |
|           |  |  [=====     ] QMS           40%  RED     40ч |
|           |  |  [=======   ] Risk Mgmt    75%  YELLOW  16ч |
|           |  |  [========= ] Human Ovrsgt 90%  GREEN    4ч |
|           |  |  [==        ] Data Gov     20%  RED     32ч |
|           |  |  [========  ] Transparency 85%  GREEN    8ч |
|           |  |  ...                                         |
|           |  +---------------------------------------------+
+-----------+

Данные:
  GapAnalysis: {id, tool_id, categories (JSONB), coverage_pct, effort_estimate}
  12 категорий AESIA: QMS, Risk, Human Oversight, Data, Transparency,
    Accuracy, Cybersecurity, Logging, Tech Docs, Monitoring, Incidents, Conformity
  Цвета: GREEN (>=80%), YELLOW (50-79%), RED (<50%)
  Effort: часы на закрытие пробелов (по весам категорий)
  Источники: ScanResult (CLI), ComplianceDocument (SaaS), FRIAAssessment, Passport
```

---

### DF-S23: Audit Package (ZIP-генерация)

One-click генерация аудиторского пакета: ZIP с Executive Summary, паспортами,
FRIA, документами, evidence chain, training records.

```
Пользователь (Dashboard)
     |
     |  1. POST /api/tools/{toolId}/audit-package
     |     {format: 'zip', include: ['summary', 'passport', 'fria',
     |      'documents', 'evidence', 'training']}
     v
+-----------+
| Fastify   |  2. Создание фонового задания (pg-boss):
| API       |     INSERT INTO pgboss.job {
|           |       name: 'generate-audit-package',
|           |       data: {toolId, orgId, userId, include, format}
|           |     }
|           |
|           |  3. Response: {jobId, status: 'processing'}
+-----+-----+
      |
      |  (фоновое выполнение через pg-boss worker)
      v
+-----------+
| pg-boss   |  4. Worker берет задание:
| Worker    |
+-----+-----+
      |
      |  5. Сбор артефактов:
      |
      |  a) Executive Summary (PDF):
      |     SELECT AITool + RiskClassification + GapAnalysis
      |     -> Markdown шаблон -> Gotenberg -> PDF (2-3 стр.)
      |
      |  b) Agent Passport (JSON + PDF):
      |     SELECT AITool.passport_data
      |     -> JSON файл + human-readable PDF
      |
      |  c) FRIA (PDF):
      |     SELECT FRIAAssessment + FRIASection[]
      |     -> Если approved: использовать существующий pdf_url
      |     -> Если draft: генерировать preview PDF
      |
      |  d) Compliance Documents (PDF):
      |     SELECT ComplianceDocument[] WHERE tool_id AND status = 'approved'
      |     -> Каждый документ как отдельный PDF
      |
      |  e) Evidence Chain (JSON):
      |     SELECT из AITool.scan_data (синхронизировано из CLI)
      |     -> evidence_chain_summary.json
      |
      |  f) Scan History (JSON + PDF):
      |     SELECT ScanResult[] WHERE tool_id ORDER BY synced_at DESC
      |     -> scan_history.json + визуальный отчет (PDF)
      |
      |  g) Training Records (PDF):
      |     SELECT LiteracyCompletion[] для org members
      |     -> training_report.pdf
      |
      |  6. Сборка ZIP:
      |     audit-package-{toolName}-{date}/
      |       00-executive-summary.pdf
      |       01-agent-passport.json
      |       01-agent-passport.pdf
      |       02-fria-assessment.pdf
      |       03-compliance-documents/
      |         ai-policy.pdf
      |         risk-plan.pdf
      |         monitoring-plan.pdf
      |         worker-notification.pdf
      |       04-evidence-chain.json
      |       05-scan-history.json
      |       05-scan-report.pdf
      |       06-training-records.pdf
      |       manifest.json (содержимое + хэши + timestamp)
      |
      |  7. Upload ZIP в S3 / Hetzner Object Storage
      |     Signed URL с TTL = 24 часа
      v
+-----------+
| PostgreSQL|  8. INSERT AuditPackage {
|           |       tool_id,
|           |       contents: JSONB {passport, scan, fria, docs, evidence, training},
|           |       generated_at: NOW(),
|           |       pdf_url: signed_s3_url
|           |     }
|           |
|           |  9. INSERT AuditLog {action: 'audit_package_generated'}
+-----------+
      |
      |  10. Уведомление пользователю (SSE или polling):
      |      {jobId, status: 'completed', downloadUrl}
      v
+-----------+
| Dashboard |  11. Кнопка "Download Audit Package" (ZIP, 5-50 МБ)
|           |      Signed URL, действует 24 часа
+-----------+

Данные:
  AuditPackage: {id, tool_id, contents (JSONB), generated_at, pdf_url}
  Contents: executive_summary + passport + fria + documents + evidence + training
  Фоновая задача: pg-boss (макс. время 5 мин)
  Хранение: S3 / Hetzner Object Storage (EU)
  Signed URL: TTL 24 часа
  Размер: 5-50 МБ (зависит от количества документов)
  Тариф: Growth+ (Starter -- недоступен)
```

---

### DF-S24: ISO 42001 Readiness

Оценка готовности к сертификации ISO 42001. 39 контролей Annex A,
маппинг на EU AI Act obligations, score по каждому clause.

```
Пользователь (Dashboard)
     |
     |  1. Открывает /tools/{toolId}/iso-42001
     v
+-----------+
| Next.js   |  2. GET /api/tools/{toolId}/iso-readiness
+-----------+
     |
     v
+-----------+
| Fastify   |  3. Сбор данных:
| API       |     SELECT AITool + passport_data + scan_data
|           |     SELECT ComplianceDocument[] WHERE tool_id
|           |     SELECT FRIAAssessment WHERE tool_id
|           |     SELECT GapAnalysis WHERE tool_id
+-----+-----+
      |
      |  4. Маппинг на ISO 42001 структуру:
      |
      |     Clauses 4-10 (обязательные):
      |     +--------+------------------------------+-------+---------+
      |     | Clause | Название                     | Score | Статус  |
      |     +--------+------------------------------+-------+---------+
      |     |   4    | Context of the Organization  |  60%  | PARTIAL |
      |     |   5    | Leadership                   |  40%  | GAP     |
      |     |   6    | Planning                     |  75%  | PARTIAL |
      |     |   7    | Support                      |  50%  | PARTIAL |
      |     |   8    | Operation                    |  80%  | MEETS   |
      |     |   9    | Performance Evaluation       |  30%  | GAP     |
      |     |  10    | Improvement                  |  20%  | GAP     |
      |     +--------+------------------------------+-------+---------+
      |
      |     Annex A (39 контролей):
      |     Для каждого контроля:
      |       - Маппинг на EU AI Act obligation (если есть)
      |       - Проверка наличия: документ? scan finding? passport field?
      |       - Score: 0 (not started) | 50 (partial) | 100 (implemented)
      |
      |     Маппинг ISO 42001 -> EU AI Act:
      |       A.5.4 (AI risk assessment) -> Art.9 (Risk Management)
      |       A.6.2 (AI system impact assessment) -> Art.27 (FRIA)
      |       A.7.2 (AI system lifecycle) -> Art.72 (Post-Market Monitoring)
      |       A.8.4 (Human oversight) -> Art.14 (Human Oversight)
      |       A.9.3 (Transparency) -> Art.13 (Transparency)
      |       A.10.2 (Data management) -> Art.10 (Data Governance)
      |       ...
      |
      |  5. Расчет общего score:
      |     clause_scores = avg(clause_4..clause_10)
      |     annex_a_scores = avg(39 контролей)
      |     overall = 0.6 * clause_scores + 0.4 * annex_a_scores
      |
      |  6. Идентификация gaps:
      |     critical_gaps = контроли WHERE score < 30%
      |     recommended_actions = для каждого gap -> конкретное действие
      v
+-----------+
| Next.js   |  7. Визуализация:
| Dashboard |
|           |  +------------------------------------------------+
|           |  |  ISO 42001 Readiness: HireVue AI Screening      |
|           |  |  Overall: 52% | Clauses: 51% | Controls: 54%   |
|           |  |                                                  |
|           |  |  Clause 4  [======    ] 60%  PARTIAL             |
|           |  |  Clause 5  [====      ] 40%  GAP                 |
|           |  |  ...                                             |
|           |  |                                                  |
|           |  |  Critical Gaps (score < 30%):                    |
|           |  |  - A.9.3: Internal audit (-> Art.72 Monitoring)  |
|           |  |  - A.10.2: Corrective action (-> Art.20)         |
|           |  |                                                  |
|           |  |  [Generate Remediation Plan]  [Export PDF]        |
|           |  +------------------------------------------------+
+-----------+

Данные:
  ISO 42001: 7 обязательных clauses (4-10) + 39 контролей Annex A
  Маппинг: ISO control -> EU AI Act obligation (1:N)
  Score: per-clause + per-control + overall (weighted)
  Статусы: MEETS (>=80%), PARTIAL (30-79%), GAP (<30%)
  Источники: ScanResult, ComplianceDocument, FRIA, Passport, GapAnalysis
  Тариф: Growth+ (базовый), Enterprise (полный с рекомендациями)
```

---

## 5. CLI Sync (DF-S30..S34)

### DF-S30: Passport Sync (CLI -> SaaS)

CLI отправляет Agent Passport. SaaS выполняет upsert AITool с правилами
разрешения конфликтов.

```
CLI (complior sync)
     |
     |  1. Чтение .complior/agents/*-manifest.json
     |     (все passports проекта)
     |
     |  2. Чтение ~/.config/complior/credentials
     |     -> COMPLIOR_ACCESS_TOKEN (JWT)
     |     -> Если истек -> refresh (DF-S04)
     |
     |  3. Маппинг 36 CLI полей -> 21 SaaS полей:
     |
     |     CLI поле                    SaaS поле
     |     -------------------------   --------------------------
     |     agent_id                 -> cli_passport_id
     |     name                     -> name
     |     display_name             -> (в passport_data)
     |     description              -> description
     |     owner.team               -> (в passport_data)
     |     owner.contact            -> (в passport_data)
     |     type                     -> (в passport_data)
     |     autonomy_level           -> (маппинг L1-L3 -> 'advisory',
     |                                  L4 -> 'semi_autonomous',
     |                                  L5 -> 'autonomous')
     |     framework                -> framework
     |     model.provider           -> provider
     |     model.model_id           -> model
     |     model.data_residency     -> (в passport_data)
     |     compliance.complior_score-> (в scan_data)
     |     compliance.risk_class    -> risk_level
     |     lifecycle.status         -> status (draft->not_started,
     |                                  active->compliant,
     |                                  suspended->under_review)
     |     signature                -> (в syncMetadata)
     |     ... остальные            -> passport_data JSONB (агрегация)
     |
     |  4. POST /api/sync/passports
     |     Authorization: Bearer <JWT>
     |     Body: {
     |       passports: [{
     |         name, description, provider, model, risk_level,
     |         autonomy_level, framework, passport_data: {...},
     |         signature: {...}, manifest_version
     |       }]
     |     }
     v
+-----------+
| Fastify   |  5. resolveApiAuth(headers):
| API       |     JWT -> decode -> {userId, organizationId}
|           |     Проверка: user is member of organization
+-----+-----+
      |
      |  6. validateSync(body, SyncPassportSchema):
      |     Zod: массив passports, каждый с обязательными полями
      |
      |  7. Для каждого passport:
      |
      |     a) Поиск существующего:
      |        SELECT AITool
      |        WHERE LOWER(name) = LOWER($name)
      |        AND organization_id = $orgId
      |
      |     b) EXISTS -> MERGE (конфликты):
      |
      |        Правила разрешения конфликтов:
      |        +----------------------------+----------+---------+
      |        | Поле                       | Приоритет| Причина |
      |        +----------------------------+----------+---------+
      |        | provider, framework,       | CLI wins | Техн.   |
      |        | model, score, findings,    |          | данные  |
      |        | capabilities, permissions, |          | точнее  |
      |        | data_access, evidence,     |          | из кода |
      |        | signature                  |          |         |
      |        +----------------------------+----------+---------+
      |        | purpose, owner (DPO/CTO),  | SaaS wins| Орг.    |
      |        | department, business_ctx,  |          | данные  |
      |        | lifecycle_status,          |          | ведутся |
      |        | fria_approval              |          | в SaaS  |
      |        +----------------------------+----------+---------+
      |        | risk_level                 | SaaS wins| Если уже|
      |        |                            | (если    | класси- |
      |        |                            |  другой) | фициро- |
      |        |                            |          | ван     |
      |        +----------------------------+----------+---------+
      |        | wizard_step                | Max()    | Никогда |
      |        |                            |          | вниз    |
      |        +----------------------------+----------+---------+
      |
      |        UPDATE AITool SET ... WHERE id = $existingId
      |        conflicts[] = [{field, cli_value, saas_value, winner}]
      |
      |     c) NOT EXISTS -> INSERT AITool:
      |        {organization_id, name, description, provider, model,
      |         risk_level, status, passport_data, cli_passport_id,
      |         wizard_step: 1}
      |
      |  8. Если risk_level новый:
      |     INSERT RiskClassification {method: 'cli_import', confidence: 50}
      |     mapRequirements(toolId, riskLevel)
      |
      |  9. Дедупликация:
      |     payload_hash = SHA256(JSON.stringify(passport))
      |     SELECT SyncHistory WHERE tool_id AND type = 'passport'
      |       AND payload_hash = $hash
      |     EXISTS -> skip (данные не изменились)
      |
      |  10. INSERT SyncHistory {
      |        tool_id, type: 'passport',
      |        payload_hash, status: 'success' | 'conflict',
      |        synced_at: NOW()
      |      }
      v
+-----------+
| Response  |  11. {
|           |        processed: 2,
|           |        results: [
|           |          {name, toolId, action: 'created', fieldsUpdated: 21},
|           |          {name, toolId, action: 'updated', fieldsUpdated: 8,
|           |           conflicts: [{field: 'purpose', winner: 'saas'}]}
|           |        ]
|           |      }
+-----------+

Данные:
  Вход: AgentManifest[] (36 полей, ed25519)
  Маппинг: 36 -> 21 поле + passport_data JSONB (остаток)
  Дедупликация: SHA-256 payload_hash
  Конфликты: CLI wins technical, SaaS wins organizational
  Выход: AITool + SyncHistory + optional RiskClassification
  Исходный код: НИКОГДА не передается
```

---

### DF-S31: Scan Sync (CLI -> SaaS)

CLI отправляет результаты сканирования. SaaS обновляет Dashboard score.

```
CLI (после complior scan)
     |
     |  1. Scan завершен: score, findings[], toolsDetected[]
     |     Чтение из .complior/scans/latest.json
     |
     |  2. POST /api/sync/scans
     |     Authorization: Bearer <JWT>
     |     Body: {
     |       projectPath: "/home/user/my-project",
     |       score: 72,
     |       findings: [
     |         {check_id, type, message, severity, obligation_id,
     |          file, line, layer, priority, confidence}
     |         // БЕЗ code_context и fix_diff (исходный код не передается)
     |       ],
     |       toolsDetected: [
     |         {name: "OpenAI GPT-4", vendor: "OpenAI", domain: "LLM"}
     |       ],
     |       layers: {L1: 95, L2: 80, L3: 70, L4: 60, L5: null},
     |       regulation_version: "1.0.0",
     |       duration: 1250,
     |       files_scanned: 147,
     |       scanned_at: "2026-03-06T10:00:00Z"
     |     }
     v
+-----------+
| Fastify   |  3. resolveApiAuth -> {userId, organizationId}
| API       |  4. validateSync(body, SyncScanSchema)
+-----+-----+
      |
      |  5. Обработка toolsDetected:
      |     Для каждого tool:
      |       SELECT AITool WHERE LOWER(name) = LOWER($name)
      |         AND organization_id = $orgId
      |       EXISTS -> action: 'found', return toolId
      |       NOT EXISTS -> INSERT AITool {name, vendor, domain, wizard_step: 1}
      |         -> action: 'created', return toolId
      |
      |  6. INSERT ScanResult {
      |       tool_id, findings (JSONB), score,
      |       layers (JSONB), synced_at: NOW()
      |     }
      |
      |  7. UPDATE AITool SET scan_data = {
      |       latest_score: 72,
      |       latest_scan_at: "2026-03-06T10:00:00Z",
      |       findings_count: 23,
      |       findings_by_severity: {critical: 2, high: 5, medium: 10, low: 6}
      |     }
      |
      |  8. Пересчет Gap Analysis (если существует):
      |     UPDATE GapAnalysis с новыми данными scan
      |
      |  9. Дедупликация (SHA-256 payload_hash)
      |
      |  10. INSERT SyncHistory {type: 'scan', status: 'success'}
      v
+-----------+
| Response  |  11. {
|           |        processed: 1,
|           |        tools: [
|           |          {name: "OpenAI GPT-4", toolId: "uuid", action: 'found'},
|           |          {name: "Custom Agent", toolId: "uuid", action: 'created'}
|           |        ]
|           |      }
+-----------+

Данные:
  Вход: ScanResult (score, findings без кода, layers, toolsDetected)
  Findings: метаданные only (check_id, severity, file, line -- БЕЗ snippets)
  ScanResult (таблица): findings JSONB, score, layers JSONB
  AITool.scan_data: агрегированные метрики последнего скана
  Дедупликация: SHA-256 payload_hash
  Безопасность: исходный код НИКОГДА не покидает машину разработчика
```

---

### DF-S32: Document Sync (CLI -> SaaS)

CLI отправляет сгенерированные compliance-документы. Batch до 20 документов.

```
CLI (после complior doc:generate)
     |
     |  1. Сбор документов из .complior/reports/ и .complior/fria/
     |     Максимум 20 документов в batch
     |
     |  2. POST /api/sync/documents
     |     Authorization: Bearer <JWT>
     |     Body: {
     |       documents: [
     |         {
     |           type: 'FRIA',
     |           title: 'FRIA - My Agent - 2026-03-06',
     |           content: '# Fundamental Rights Impact Assessment\n...',
     |           toolSlug: 'my-agent'
     |         },
     |         {
     |           type: 'AI_POLICY',
     |           title: 'AI Usage Policy v1.0',
     |           content: '# AI Usage Policy\n...',
     |           toolSlug: 'my-agent'
     |         }
     |       ]
     |     }
     v
+-----------+
| Fastify   |  3. resolveApiAuth -> {userId, organizationId}
| API       |  4. validateSync(body, SyncDocumentsSchema)
|           |     Zod: documents[] max 20, каждый с type + title + content
+-----+-----+
      |
      |  5. Для каждого document:
      |
      |     a) findToolBySlug(orgId, toolSlug):
      |        SELECT AITool WHERE LOWER(name) = slugify($toolSlug)
      |          AND organization_id = $orgId
      |
      |     b) Tool найден:
      |        SELECT ComplianceDocument
      |          WHERE ai_tool_id = $toolId AND type = $type
      |
      |        EXISTS -> UPDATE:
      |          SET title = $title, content = $content,
      |              version = version + 1,
      |              metadata = metadata || {source: 'cli', synced_at: NOW()}
      |          action: 'updated'
      |
      |        NOT EXISTS -> INSERT:
      |          ComplianceDocument {tool_id, org_id, type, title,
      |            content, status: 'draft',
      |            metadata: {source: 'cli'}}
      |          action: 'created'
      |
      |     c) Tool не найден:
      |        action: 'skipped' (документ без привязки к tool)
      |
      |  6. INSERT SyncHistory {type: 'document'}
      v
+-----------+
| Response  |  7. {
|           |        synced: 2,
|           |        created: 1,
|           |        updated: 1,
|           |        skipped: 0,
|           |        results: [
|           |          {title, type, toolSlug, action: 'created'},
|           |          {title, type, toolSlug, action: 'updated', version: 3}
|           |        ]
|           |      }
+-----------+

Данные:
  Вход: documents[] (type, title, content (markdown), toolSlug)
  Batch: максимум 20 документов за запрос
  ComplianceDocument: version++ при обновлении, metadata.source = 'cli'
  Статус: всегда 'draft' при создании из CLI (требует review в SaaS)
  Связь: toolSlug -> AITool (case-insensitive match)
```

---

### DF-S33: Data Bundle (SaaS -> CLI)

CLI загружает регуляторные данные из SaaS. ETag для кэширования.
Redirect на S3 для больших файлов.

```
CLI (при запуске или complior sync --pull)
     |
     |  1. GET /api/bundle
     |     Authorization: Bearer <JWT>
     |     If-None-Match: "etag-abc123"  (кэшированная версия)
     v
+-----------+
| Fastify   |  2. Вычисление ETag:
| API       |     etag = SHA256(
|           |       regulations_version +
|           |       obligations_updated_at +
|           |       scoring_rules_version
|           |     )
+-----+-----+
      |
      |  3. Если ETag совпадает:
      |     Response: 304 Not Modified
      |     (CLI использует кэш)
      |
      |  4. Если ETag не совпадает:
      |     Генерация bundle:
      |
      |     a) Regulations:
      |        SELECT Obligation[] (108 обязательств)
      |        SELECT ScoringRule[] (правила скоринга)
      |        SELECT Requirement[] (requirements per risk level)
      |
      |     b) AI Tool Catalog (top 1000):
      |        SELECT RegistryTool[]
      |        ORDER BY risk_rating, indexed_at DESC
      |        LIMIT 1000
      |
      |     c) Метаданные:
      |        regulation_version, last_updated, bundle_version
      |
      |  5. Response:
      |     Content-Type: application/json
      |     ETag: "etag-def456"
      |     Body: {
      |       regulations: {obligations, scoring_rules, requirements},
      |       catalog: [{name, provider, risk_rating}, ...],
      |       metadata: {version, updated_at}
      |     }
      |
      |     Или для больших файлов:
      |     302 Redirect -> S3 signed URL
      v
CLI
     |
     |  6. Сохранение в кэш:
     |     ~/.local/share/complior/bundle-cache.json
     |     + ETag для следующего запроса

Данные:
  Bundle: regulations + catalog (top 1000) + metadata
  Кэширование: ETag (SHA-256), 304 Not Modified
  Размер: ~2-5 МБ JSON (compact)
  Большие файлы: S3 redirect (signed URL, TTL 1ч)
  Обновление: regulations -- при изменении, catalog -- еженедельно
```

---

### DF-S34: Score Sync (двойное отображение)

Compliance score из CLI отображается рядом с SaaS-данными на Dashboard.

```
Dashboard (страница AI Tool)
     |
     |  1. GET /api/tools/{toolId}
     v
+-----------+
| Fastify   |  2. SELECT AITool {
| API       |       scan_data: {latest_score, latest_scan_at, findings_by_severity},
|           |       passport_data: {compliance: {complior_score}},
|           |       risk_level,
|           |       status
|           |     }
|           |
|           |     SELECT ScanResult[] WHERE tool_id
|           |       ORDER BY synced_at DESC LIMIT 10
|           |     (история скоринга)
+-----+-----+
      |
      v
+-----------+
| Next.js   |  3. Двойное отображение:
| Dashboard |
|           |  +-----------------------------------------+
|           |  |  HireVue AI Screening                    |
|           |  |                                          |
|           |  |  CLI Score:  72/100  (скан: 06.03.2026)  |
|           |  |  [=======   ] GREEN                      |
|           |  |                                          |
|           |  |  SaaS Score: 46%  (Gap Analysis)         |
|           |  |  [=====     ] YELLOW                     |
|           |  |                                          |
|           |  |  Combined:  59%  (CLI 60% + SaaS 40%)    |
|           |  |                                          |
|           |  |  Источник данных:                        |
|           |  |  [CLI] Score, Findings      (06.03.2026) |
|           |  |  [SaaS] FRIA, Documents     (05.03.2026) |
|           |  |  [SaaS] Gap Analysis        (04.03.2026) |
|           |  |                                          |
|           |  |  Score History:                          |
|           |  |  72 ─ 70 ─ 65 ─ 68 ─ 72  (last 5 scans)|
|           |  +-----------------------------------------+
+-----------+

Данные:
  CLI Score: из scan_data.latest_score (определистический, 5-layer scanner)
  SaaS Score: из GapAnalysis.coverage_pct (12 AESIA категорий)
  Combined: weighted(CLI=0.6, SaaS=0.4) -- CLI scanner точнее
  История: ScanResult[] (до 10 последних скоринговых точек)
  Индикатор источника: [CLI] / [SaaS] рядом с каждым значением (F63)
```

---

## 6. Биллинг (DF-S40..S42)

### DF-S40: Stripe Checkout

Пользователь выбирает план и оплачивает через Stripe Checkout.

```
Admin (Dashboard)
     |
     |  1. Открывает /settings/billing
     |     Нажимает "Upgrade to Growth (EUR 149/мес)" или "Upgrade to Enterprise (EUR 499/мес)"
     |
     |  2. POST /api/billing/checkout
     |     {planId: 'growth'}
     v
+-----------+
| Fastify   |  3. SELECT Plan WHERE name = 'growth'
| API       |     -> stripe_price_id = 'price_xxx'
|           |
|           |  4. SELECT Organization WHERE id = $orgId
|           |     -> stripe_customer_id (или создать нового)
+-----+-----+
      |
      |  5. Если нет stripe_customer_id:
      |     POST https://api.stripe.com/v1/customers
      |     {email: admin.email, name: org.name, metadata: {orgId}}
      |     UPDATE Organization SET stripe_customer_id = $customerId
      |
      |  6. POST https://api.stripe.com/v1/checkout/sessions
      |     {
      |       customer: stripe_customer_id,
      |       line_items: [{price: 'price_xxx', quantity: 1}],
      |       mode: 'subscription',
      |       success_url: '/settings/billing?success=true',
      |       cancel_url: '/settings/billing?canceled=true',
      |       metadata: {orgId, planId}
      |     }
      |
      |  7. Response: {checkoutUrl: 'https://checkout.stripe.com/...'}
      v
+-----------+
| Browser   |  8. Redirect на Stripe Checkout
|           |     Пользователь вводит карту
|           |     Stripe обрабатывает платеж
+-----------+
      |
      |  9. Успешная оплата -> redirect на success_url
      |
      |  10. Webhook (см. DF-S41) активирует подписку
      v
+-----------+
| Dashboard |  11. "Plan upgraded to Growth"
|           |      Лимиты расширены: unlimited tools, 10 users
+-----------+

Данные:
  План: Starter (EUR 0) / Growth (EUR 149) / Enterprise (EUR 499)
  Stripe: Customer, Checkout Session, Subscription, Price
  metadata: {orgId, planId} -- для webhook обработки
  Success/Cancel URLs: redirect обратно в Dashboard
```

---

### DF-S41: Stripe Webhook (оплата подписки)

Обработка webhook'ов от Stripe: активация, продление, отмена подписки.

```
Stripe
     |
     |  1. Event: checkout.session.completed
     |     или invoice.paid
     |     или customer.subscription.updated
     |     или customer.subscription.deleted
     |
     |  2. POST /api/webhooks/stripe
     |     Stripe-Signature: t=...,v1=...
     v
+-----------+
| Fastify   |  3. Верификация подписи:
| API       |     stripe.webhooks.constructEvent(body, sig, webhookSecret)
|           |     -> Если невалидна: 400 Bad Request
+-----+-----+
      |
      |  4. Обработка по типу события:
      |
      |  checkout.session.completed:
      |     metadata -> {orgId, planId}
      |     INSERT Subscription {
      |       organization_id, plan_id,
      |       stripe_sub_id: session.subscription,
      |       status: 'active',
      |       current_period_end: subscription.current_period_end
      |     }
      |     UPDATE Organization SET plan = $planName
      |
      |  invoice.paid:
      |     SELECT Subscription WHERE stripe_sub_id = $subId
      |     UPDATE Subscription SET
      |       status = 'active',
      |       current_period_end = invoice.period_end
      |     (продление периода)
      |
      |  customer.subscription.updated:
      |     SELECT Subscription WHERE stripe_sub_id = $subId
      |     UPDATE Subscription SET status = $newStatus
      |     Если downgrade: проверить лимиты нового плана
      |       -> Если tools > new_plan.max_tools: уведомление admin
      |
      |  customer.subscription.deleted:
      |     UPDATE Subscription SET status = 'canceled'
      |     UPDATE Organization SET plan = 'starter'
      |     (данные сохраняются, лимиты снижаются)
      |
      |  5. INSERT AuditLog {
      |       action: 'subscription_' + event_type,
      |       metadata: {stripe_event_id, plan, amount}
      |     }
      v
+-----------+
| PostgreSQL|  6. Подписка обновлена
|           |     Organization.plan отражает текущий тариф
+-----------+

Данные:
  Stripe Events: checkout.session.completed, invoice.paid,
    customer.subscription.updated, customer.subscription.deleted
  Подпись: HMAC SHA-256 (webhook secret)
  Subscription: {id, org_id, plan_id, stripe_sub_id, status, current_period_end}
  Статусы: active | past_due | canceled
  AuditLog: все billing-события логируются
  Безопасность: idempotency по stripe_event_id
```

---

### DF-S42: Проверка лимитов плана

Middleware проверяет лимиты плана перед каждой операцией создания ресурса.

```
Любой запрос на создание ресурса
     |
     |  Например: POST /api/tools (создание AI tool)
     v
+-----------+
| Fastify   |  1. Middleware: checkPlanLimits(orgId, resourceType)
| Middleware |
+-----+-----+
      |
      |  2. SELECT Organization {plan} WHERE id = $orgId
      |     SELECT Plan {limits} WHERE name = $plan
      |
      |     limits: {
      |       max_tools: 3,           // Starter
      |       max_scans_per_month: 100,
      |       max_users: 1,
      |       deep_analysis: false,
      |       api_access: false,
      |       audit_packages: false,
      |       sso: false
      |     }
      |
      |  3. Проверка по типу ресурса:
      |
      |     'tool': SELECT COUNT(*) FROM AITool WHERE org_id = $orgId
      |       -> count >= limits.max_tools ? BLOCK
      |
      |     'user': SELECT COUNT(*) FROM OrganizationMember WHERE org_id
      |       -> count >= limits.max_users ? BLOCK
      |
      |     'scan': SELECT COUNT(*) FROM ScanResult
      |       WHERE tool_id IN (SELECT id FROM AITool WHERE org_id)
      |       AND synced_at >= date_trunc('month', NOW())
      |       -> count >= limits.max_scans_per_month ? BLOCK
      |
      |     'audit_package': limits.audit_packages ? ALLOW : BLOCK
      |
      |     'api_key': limits.api_access ? ALLOW : BLOCK
      |
      |  4. Если BLOCK:
      |     Response: 403 {
      |       error: 'plan_limit_exceeded',
      |       limit: 'max_tools',
      |       current: 3,
      |       max: 3,
      |       upgrade_url: '/settings/billing'
      |     }
      |
      |  5. Если ALLOW:
      |     next() -> продолжить обработку запроса
      v
+-----------+
| Handler   |  6. Операция выполняется
+-----------+

Данные:
  Лимиты по планам:
  +-------------------+---------+--------+------------+
  | Лимит             | Starter | Growth | Enterprise |
  +-------------------+---------+--------+------------+
  | max_tools         |       3 |    inf |        inf |
  | max_users         |       1 |     10 |        inf |
  | max_scans/month   |     100 |  1,000 |        inf |
  | deep_analysis     |      no |    yes |        yes |
  | api_access        |      no |     no |        yes |
  | audit_packages    |      no |    yes |        yes |
  | sso               |      no |     no |        yes |
  | multi_workspace   |      no |     no |        yes |
  +-------------------+---------+--------+------------+
  Middleware: выполняется перед каждым создающим endpoint'ом
  Error: 403 с upgrade_url для upsell
```

---

## 7. Мониторинг и отчёты (DF-S50..S52)

### DF-S50: Dashboard Render (12 виджетов)

Главная страница Dashboard агрегирует данные из множества таблиц.

```
Пользователь (Dashboard)
     |
     |  1. GET /dashboard
     v
+-----------+
| Next.js   |  2. React Server Component:
| RSC       |     Параллельные запросы к API (Promise.all):
+-----------+
     |
     +----> GET /api/dashboard/summary
     |        |
     |        v
     |      SELECT org tools, scores, risks
     |      -> {total_tools, avg_score, risk_distribution, penalty_exposure}
     |
     +----> GET /api/dashboard/timeline
     |        |
     |        v
     |      SELECT Obligation[] WHERE deadline > NOW()
     |      ORDER BY deadline ASC
     |      -> {upcoming_deadlines, critical_path, days_remaining}
     |
     +----> GET /api/dashboard/recent-activity
     |        |
     |        v
     |      SELECT AuditLog[] WHERE org members
     |      ORDER BY created_at DESC LIMIT 20
     |      -> {recent_actions[]}
     |
     +----> GET /api/dashboard/gap-overview
     |        |
     |        v
     |      SELECT GapAnalysis[] для всех tools
     |      -> {avg_coverage, worst_categories[], effort_total}
     |
     +----> GET /api/dashboard/compliance-trend
     |        |
     |        v
     |      SELECT ScanResult[] за 30 дней
     |      GROUP BY date
     |      -> {dates[], scores[]} (для графика)
     |
     +----> GET /api/dashboard/team-progress
              |
              v
            SELECT LiteracyCompletion[] для org members
            -> {completion_rate, pending_courses[]}
     |
     v
+-----------+
| Next.js   |  3. Рендеринг 12 виджетов:
| Dashboard |
|           |  +----------------------------------------------------------+
|           |  |                    COMPLIOR DASHBOARD                      |
|           |  |                                                           |
|           |  |  [1. Score Card]     [2. Risk Donut]    [3. Penalty]       |
|           |  |   Avg: 72/100        H:3 L:5 M:4        EUR 45M exposure  |
|           |  |                                                           |
|           |  |  [4. Timeline]       [5. Gap Overview]  [6. Quick Actions] |
|           |  |   149 дней осталось  46% coverage       + Add Tool         |
|           |  |   7 critical oblig.  270ч effort        Run Scan           |
|           |  |                                                           |
|           |  |  [7. Compliance Trend (Recharts)]                          |
|           |  |   72--70--65--68--72  (30 дней)                            |
|           |  |                                                           |
|           |  |  [8. AI Systems]     [9. Recent Activity]                  |
|           |  |   12 tools listed    "Marcus: created FRIA for HireVue"   |
|           |  |   3 need attention   "Anna: approved Risk Plan"            |
|           |  |                                                           |
|           |  |  [10. Training]      [11. Documents]    [12. Team]         |
|           |  |   60% completion     14 approved        8 members          |
|           |  |   2 overdue          3 in review        2 pending invite   |
|           |  +----------------------------------------------------------+
+-----------+

Данные:
  12 виджетов: score, risk donut, penalty, timeline, gap, quick actions,
    compliance trend, AI systems, recent activity, training, documents, team
  Агрегация: AITool, ScanResult, GapAnalysis, Obligation, AuditLog,
    ComplianceDocument, LiteracyCompletion, OrganizationMember
  Кэширование: RSC с revalidation каждые 60с
  Role-based views (F28): CTO, DPO, Developer видят разные виджеты
```

---

### DF-S51: Compliance Report (per-tool)

Полный compliance отчёт для конкретной AI-системы. Markdown + PDF.

```
Пользователь (Dashboard)
     |
     |  1. POST /api/tools/{toolId}/report
     |     {format: 'pdf' | 'markdown', sections: ['all']}
     v
+-----------+
| Fastify   |  2. Сбор данных (6 источников):
| API       |
+-----+-----+
      |
      |  a) AI Tool + Passport:
      |     SELECT AITool {name, provider, model, risk_level,
      |       passport_data, scan_data, status}
      |
      |  b) Risk Classification:
      |     SELECT RiskClassification WHERE tool_id AND is_current = true
      |     -> {risk_level, confidence, method, article_references}
      |
      |  c) Scan History:
      |     SELECT ScanResult[] WHERE tool_id ORDER BY synced_at DESC
      |     -> findings[], scores[], trends
      |
      |  d) Compliance Documents:
      |     SELECT ComplianceDocument[] WHERE tool_id AND status = 'approved'
      |     -> [{type, title, approved_at, approved_by}]
      |
      |  e) FRIA:
      |     SELECT FRIAAssessment WHERE tool_id
      |     -> {status, sections, completed_at}
      |
      |  f) Gap Analysis:
      |     SELECT GapAnalysis WHERE tool_id
      |     -> {categories, coverage_pct, effort_estimate}
      |
      |  3. Генерация Markdown-отчёта:
      |     # Compliance Report: {tool_name}
      |     ## 1. Executive Summary
      |       Score: 72/100 | Risk: HIGH | Status: In Progress
      |     ## 2. System Identification
      |       Provider, model, domain, autonomy level
      |     ## 3. Risk Classification
      |       Method, confidence, AESIA categories, articles
      |     ## 4. Compliance Status (12 AESIA categories)
      |       Table: category | status | coverage | gaps
      |     ## 5. Scan Findings
      |       Critical: 2 | High: 5 | Medium: 10 | Low: 6
      |       Top findings with recommendations
      |     ## 6. Documents
      |       FRIA: approved | AI Policy: approved | QMS: draft
      |     ## 7. Recommendations
      |       Prioritized action list
      |     ## 8. Timeline
      |       Critical deadlines and milestones
      |
      |  4. Если format = 'pdf':
      v
+-----------+
| Gotenberg |  5. HTML -> PDF (Chromium headless)
|           |     Header: Complior logo + date
|           |     Footer: page numbers + confidentiality
+-----------+
      |
      |  6. Upload в S3 (signed URL, TTL 24ч)
      |
      |  7. INSERT AuditLog {action: 'report_generated'}
      v
+-----------+
| Response  |  8. {
|           |        report_url: signed_url (PDF),
|           |        markdown: '# Compliance Report...' (если markdown)
|           |      }
+-----------+

Данные:
  Источники: AITool, RiskClassification, ScanResult[], ComplianceDocument[],
    FRIAAssessment, GapAnalysis
  Формат: Markdown (inline) или PDF (Gotenberg -> S3)
  PDF: 10-30 страниц, брендированный
  TTL: signed URL 24ч
  AuditLog: report_generated
```

---

### DF-S52: Timeline обязательств (критический путь)

Визуальная временная шкала 108 обязательств EU AI Act с критическим путём.

```
Пользователь (Dashboard)
     |
     |  1. GET /api/dashboard/timeline
     |     ?orgId=xxx&riskLevel=high
     v
+-----------+
| Fastify   |  2. Загрузка данных:
| API       |
+-----+-----+
      |
      |  a) SELECT Obligation[] (108 обязательств)
      |     WHERE ($riskLevel IS NULL OR risk_level = $riskLevel)
      |     ORDER BY deadline ASC
      |
      |  b) SELECT AITool[] WHERE organization_id = $orgId
      |     + ToolRequirement[] (маппинг tool -> obligation)
      |
      |  c) SELECT ComplianceDocument[] WHERE org tools
      |     (какие обязательства уже покрыты документами)
      |
      |  d) SELECT FRIAAssessment[] WHERE org tools
      |     (покрытие FRIA обязательств)
      |
      |  3. Вычисление:
      |
      |     Для каждого obligation:
      |       status = 'covered' | 'in_progress' | 'not_started'
      |       affected_tools = tools с данным risk_level
      |       days_until_deadline = deadline - today
      |       is_critical = (status != 'covered') AND (days_until_deadline < 90)
      |
      |     Критический путь:
      |       critical = obligations WHERE is_critical
      |       ORDER BY deadline ASC, penalty DESC
      |
      |     Группировка по дедлайнам:
      |       2025-02-02: Art.5 Prohibited (ALREADY ACTIVE)
      |       2025-08-02: Art.4 AI Literacy (ALREADY ACTIVE)
      |       2026-08-02: Art.6-49 High-Risk (149 дней)
      |       2027-08-02: Art.6 GPAI (518 дней)
      |
      |  4. Агрегация:
      |     total_obligations = 108
      |     covered = 30
      |     in_progress = 15
      |     not_started = 63
      |     critical_count = 23
      |     total_penalty_exposure = EUR 45,000,000
      v
+-----------+
| Next.js   |  5. Визуализация (Recharts + custom):
| Dashboard |
|           |  +-----------------------------------------------------------+
|           |  |  COMPLIANCE TIMELINE                                       |
|           |  |                                                            |
|           |  |  149 дней до 2 августа 2026                                |
|           |  |  7 AI-систем | 23 открытых обязательства                   |
|           |  |  Штрафы: до EUR 45M                                        |
|           |  |                                                            |
|           |  |  TODAY                                   2 Aug 2026         |
|           |  |  |                                       |                 |
|           |  |  |====[FRIA x2]=====[EU DB x2]=====[Worker x3]===|         |
|           |  |  |    Mar           Apr-May         Jun-Jul      |         |
|           |  |  |                                               |         |
|           |  |  |  CRITICAL PATH:                               |         |
|           |  |  |  1. Complete FRIA for 2 systems (2 weeks)     |         |
|           |  |  |  2. EU Database registration (4 weeks)        |         |
|           |  |  |  3. Worker notification (1 week)              |         |
|           |  |  |  4. Technical documentation (6 weeks)         |         |
|           |  |  |  5. Post-market monitoring plan (3 weeks)     |         |
|           |  |  |                                               |         |
|           |  |  |  [30 covered] [15 in progress] [63 remaining] |         |
|           |  +-----------------------------------------------------------+
+-----------+

Данные:
  Obligation: 108 записей (article, title, deadline, risk_level, penalty)
  Группировка: по deadline (4 волны: Feb 2025, Aug 2025, Aug 2026, Aug 2027)
  Критический путь: uncovered + deadline < 90 дней
  Penalty exposure: sum(max_penalty) для uncovered obligations
  Визуализация: горизонтальная timeline + вертикальный список critical path
  Тариф: Growth+ (Starter -- базовый countdown только)
```

---

## Приложение: Сводка технологий

| Компонент | Технология | Назначение |
|-----------|-----------|-----------|
| Frontend | Next.js 14 (App Router), TailwindCSS, shadcn/ui | Dashboard UI |
| API | Fastify 5, Zod валидация | REST API, 80+ эндпоинтов |
| БД | PostgreSQL 16 (Hetzner EU) | 39 таблиц, 10 Bounded Contexts |
| Очереди | pg-boss | Фоновые задачи (PDF, ZIP, email) |
| Auth | WorkOS AuthKit | SSO, email/password, Directory Sync |
| Billing | Stripe | Подписки, webhook, checkout |
| LLM | Mistral (small/medium) | Классификация, документы, Eva |
| PDF | Gotenberg (Chromium headless) | FRIA, документы, отчёты |
| Email | Brevo | Приглашения, уведомления |
| Storage | Hetzner Object Storage / S3 | Audit Package ZIP, PDF |

---

**Полные потоки данных платформы** (open-source Engine + CLI + SDK + MCP + SaaS): см. `~/complior/docs/v9/DATA-FLOWS.md`

---

**Обновлено:** 2026-03-06 v9.0 -- SaaS-специфичные потоки данных (24 диаграммы: 5 auth, 4 tools, 5 compliance, 5 sync, 3 billing, 3 monitoring)
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
