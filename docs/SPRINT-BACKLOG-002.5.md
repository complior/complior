# Sprint Backlog 002.5 — Invite Flow + Team Management + Subscription Enforcement

**Sprint Goal:** Обеспечить org-centric регистрацию с invite flow, team management и enforcement тарифных лимитов (maxUsers, maxTools).

**Capacity:** ~24 SP | **Duration:** 2 weeks
**Developer:** Max (Backend+QA, US-031..036) + Nina (Frontend+UX, US-037)
**Baseline:** 115 tests (Sprint 1-2) → **New: 38 tests (total: ~153)**

**Контекст разработки:** Вся реализация ДОЛЖНА соответствовать правилам, описанным в `docs/CODING-STANDARDS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md` и `docs/DATA-FLOWS.md`. В частности: DDD/Onion слои (domain → application → api), VM-sandbox (никаких `require()` в `app/`), CQS, factory functions вместо классов, Zod-валидация на всех API, explicit `resolveSession`/`checkPermission` в каждом handler, multi-tenancy через `organizationId`. Тарифные лимиты определены в `app/config/plans.js` (single source of truth).

**Prerequisite:** Sprint 2 merged to develop.

---

## Контекст

PO решил: регистрация должна быть org-centric с полноценным invite flow. Текущая архитектура (БД, роли, permissions, multi-tenancy) **уже поддерживает** org-модель, но **отсутствует реализация**:
- Каждая регистрация создаёт НОВУЮ организацию — нет способа присоединиться к существующей
- Нет API для приглашения сотрудников
- Нет enforcement `maxUsers`/`maxTools` из тарифа
- Нет team management
- Нет дифференцированного dashboard для member vs owner

Sprint 2.5 = hotfix-спринт перед Sprint 3.

---

## Обновлённые тарифные лимиты (seed data)

| Plan | maxTools | maxUsers | maxEmployees | features.eva |
|------|---------|---------|-------------|-------------|
| free | 5 | 1 | 0 | -1 (unlimited) |
| starter | 15 | 3 | 0 | -1 (unlimited) |
| growth | 25 | 10 | 0 | -1 (unlimited) |
| scale | 100 | 50 | 0 | -1 (unlimited) |
| enterprise | -1 | -1 | -1 | all |

**Изменения vs текущие seed data:**
- Free: maxTools 0→5 (щедрее для конверсии)
- Starter: maxTools 1→15, maxUsers 2→3
- Growth: maxTools 10→25, maxUsers 5→10
- Scale: maxTools 50→100, maxUsers 20→50
- Eva: -1 (unlimited) на всех тарифах
- maxEmployees: 0 везде (AI Literacy в Sprint 8+)

**Enforcement Sprint 2.5:** maxUsers (invite), maxTools (tool registration)

---

## Граф зависимостей

```
US-031 (SubscriptionLimitChecker) ──→ US-032 (Create Invite) ──→ US-033 (Accept Invite)
US-031 ──→ US-036 (maxTools enforcement)
US-034 (List Members) — независимый
US-035 (Change Role + Remove) — после US-034
US-037 (Frontend: Team page) — после US-032..035
```

---

## User Stories

### Phase 1: Domain Service (2 SP)

#### US-031: Subscription Limit Checker (2 SP)

- **Feature:** 02 + 09 | **Developer:** Max

##### Описание
Как платформа, я должна проверять лимиты тарифа перед созданием приглашений и регистрацией инструментов.

##### Реализация
- Новый: `app/domain/iam/services/SubscriptionLimitChecker.js` — чистые функции:
  - `checkUserLimit({ currentUsers, pendingInvites, maxUsers })` → `{ allowed, current, limit }`
  - `checkToolLimit({ currentTools, maxTools })` → `{ allowed, current, limit }`
  - `-1` = unlimited (всегда allowed), `0` = none allowed
- Новый: `app/application/billing/getOrgLimits.js` — application use case:
  - Fetches: Subscription→Plan (limits) + User count + Invitation count (pending) + AITool count
  - Вызывает domain service, возвращает `{ users: {..., allowed}, tools: {..., allowed} }`
- Изменён: `server/lib/errors.js` — новый `PlanLimitError`:
  ```javascript
  class PlanLimitError extends AppError {
    constructor(limitType, current, max) {
      super(`Plan limit exceeded: ${limitType} (${current}/${max})`, 403, 'PLAN_LIMIT_EXCEEDED');
      this.limitType = limitType; this.current = current; this.max = max;
    }
  }
  ```
- Изменён: `app/seeds/plans.js` — новые лимиты (free=5, starter=15, growth=25, scale=100, eva=-1 everywhere)

##### Критерии приёмки
- [ ] currentUsers + pendingInvites >= maxUsers → `{ allowed: false }`
- [ ] currentTools >= maxTools → `{ allowed: false }`
- [ ] `-1` = unlimited, `0` = blocked
- [ ] Чистые функции — без db, без побочных эффектов
- [ ] Application use case с multi-tenancy

- **Tests:** 8 (subscription-limits.test.js)
- **Dependencies:** None

---

### Phase 2: Invite API (3 SP)

#### US-032: Create Invitation API (3 SP)

- **Feature:** 02 | **Developer:** Max

##### Описание
Как owner/admin, я хочу пригласить сотрудника по email в мою организацию.

##### Реализация
- Новый: `app/schemas/Invitation.js` — MetaSQL Entity schema
- Новый: `app/api/team/invite.js` — POST handler
- Новый: `app/application/iam/createInvitation.js`:
  1. checkPermission `User.manage` (owner/admin)
  2. Validate: email not already member, no pending invite
  3. Check subscription limit (US-031)
  4. Generate `crypto.randomUUID()` token
  5. INSERT Invitation (expiresAt: +7 days)
  6. Send email via Brevo (`sendTransactional`)
  7. AuditLog
- Изменён: `app/lib/tenant.js` — add `'Invitation'` to `TENANT_TABLES`
- Изменён: `app/seeds/roles.js`:
  - add `{ role: 'owner', resource: 'Invitation', action: 'manage' }`
  - add `{ role: 'admin', resource: 'Invitation', action: 'manage' }`
  - UPGRADE admin: `User.read` → `User.manage`
  - add `{ role: 'admin', resource: 'Organization', action: 'read' }`
- Изменён: `server/lib/schemas.js` — `InviteCreateSchema = z.object({ email: z.string().email(), role: z.enum(['admin', 'member', 'viewer']) })`

##### Критерии приёмки
- [ ] POST `/api/team/invite` создаёт pending invitation
- [ ] 403 `PLAN_LIMIT_EXCEEDED` если maxUsers превышен
- [ ] 409 `CONFLICT` если email уже member или pending invite
- [ ] Только owner/admin (User.manage)
- [ ] Email через Brevo с accept-ссылкой `{APP_URL}/invite/accept?token={uuid}`
- [ ] Token UUID, expires 7 дней
- [ ] AuditLog

- **Tests:** 6 (invite-api.test.js)
- **Dependencies:** US-031

---

### Phase 3: Accept Invite + Modified Webhook (5 SP)

#### US-033: Accept Invitation — присоединение к существующей организации (5 SP)

- **Feature:** 02 | **Developer:** Max

##### Описание
Как приглашённый пользователь, я хочу по ссылке из email зарегистрироваться и сразу попасть в организацию с правильной ролью.

##### Реализация
- Новый: `app/api/team/acceptInvite.js`:
  - `GET /api/team/invite/verify?token=xxx` — public, проверяет token (not expired, status=pending), возвращает `{ valid, organizationName, role }`
  - `POST /api/team/invite/accept` — authenticated, для уже зарегистрированных пользователей (org transfer)
- **КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ `app/application/iam/syncUserFromOry.js`** (строки 26-73):
  ```
  BEFORE creating new Organization:
  1. Check: SELECT Invitation WHERE email=$1 AND status='pending' AND expiresAt > NOW()
  2. IF invitation found:
     - USE invitation.organizationId (не создавать новую org)
     - ASSIGN invitation.role (не owner)
     - UPDATE invitation: status='accepted', acceptedAt, acceptedBy
     - НЕ создавать Subscription (org уже имеет)
  3. ELSE:
     - Existing flow: create org + owner + free subscription
  ```
- Новый: `app/application/iam/acceptInvitation.js` — для случая когда user уже зарегистрирован:
  1. Verify token
  2. Verify session email === invitation email
  3. Update user: organizationId → invitation.organizationId
  4. Update role: delete old UserRole, insert new (invitation.role)
  5. Mark invitation accepted

**Edge case — user уже в другой org:**
- MVP: single-org per user. Accept invite = transfer to new org. Старая org остаётся (если там были другие users). Если user был единственным — показываем warning "You'll leave your current organization."

##### Критерии приёмки
- [ ] GET verify: valid/expired/already_accepted
- [ ] New user registers → joins existing org (не новая)
- [ ] Assigned role из invitation (не owner)
- [ ] Invitation status → 'accepted'
- [ ] Existing user: POST accept переводит в новую org
- [ ] AuditLog: `{ source: 'invitation' }`

- **Tests:** 8 (invite-accept.test.js)
- **Dependencies:** US-031, US-032

---

### Phase 4: Team Management API (5 SP)

#### US-034: List Team Members (2 SP)

- **Feature:** 02 | **Developer:** Max

##### Описание
Как owner/admin, я хочу видеть всех участников моей организации и pending приглашения.

##### Реализация
- Новый: `app/api/team/list.js` — GET /api/team/members
- Новый: `app/application/iam/listTeamMembers.js`:
  - Query Users + JOIN UserRole + Role (WHERE organizationId)
  - Query Invitations (WHERE organizationId AND status='pending')
  - Plan limit info из getOrgLimits

**Response:**
```json
{
  "members": [{ "id", "email", "fullName", "role": "owner", "active", "lastLoginAt" }],
  "invitations": [{ "invitationId", "email", "role", "status", "invitedBy", "expiresAt" }],
  "limits": { "current": 3, "pending": 1, "max": 5 }
}
```

##### Критерии приёмки
- [ ] Members с ролями, sorted: owner first
- [ ] Pending invitations inline
- [ ] Plan limits
- [ ] Multi-tenancy, requires User.read

- **Tests:** 4 (team-api.test.js)
- **Dependencies:** None

---

#### US-035: Change Role + Remove Member (3 SP)

- **Feature:** 02 | **Developer:** Max

##### Описание
Как owner, я хочу менять роли участников и удалять их из организации.

##### Реализация
- Новый: `app/api/team/manage.js`:
  - PATCH `/api/team/members/:userId` — change role
  - DELETE `/api/team/members/:userId` — remove (active=false)
  - DELETE `/api/team/invitations/:invitationId` — revoke invite
  - POST `/api/team/invitations/:invitationId/resend` — resend email
- Новый: `app/application/iam/changeRole.js`
- Новый: `app/application/iam/removeMember.js`
- Изменён: `server/lib/schemas.js` — `ChangeRoleSchema = z.object({ role: z.enum(['admin', 'member', 'viewer']) })`

##### Критерии приёмки
- [ ] Owner и Admin могут менять роль (admin/member/viewer) — `User.manage`
- [ ] Нельзя менять свою роль
- [ ] Нельзя удалить/изменить роль owner'а
- [ ] Нельзя назначить owner через API
- [ ] Admin не может назначить другого admin'а (только owner может)
- [ ] Remove = active:false
- [ ] Revoke/resend для pending invites
- [ ] AuditLog на все мутации

- **Tests:** 8 (team-manage.test.js)
- **Dependencies:** US-034

---

### Phase 5: Enforcement (2 SP)

#### US-036: Enforce maxTools on Tool Registration (2 SP)

- **Feature:** 03 + 09 | **Developer:** Max

##### Описание
Как платформа, я должна блокировать регистрацию AI-инструментов сверх тарифного лимита.

##### Реализация
- Изменён: `app/application/inventory/registerTool.js` (перед `tq.create`):
  ```javascript
  const limits = await application.billing.getOrgLimits.checkTools(organizationId);
  if (!limits.allowed) {
    throw new errors.PlanLimitError('maxTools', limits.current, limits.limit);
  }
  ```

##### Критерии приёмки
- [ ] 403 `PLAN_LIMIT_EXCEEDED` при maxTools exceeded
- [ ] Error содержит limitType, current, max
- [ ] Free (maxTools:5) блокирует после 5 инструментов
- [ ] Enterprise (-1) без лимита
- [ ] Существующие тесты проходят (обновить fixtures)

- **Tests:** 4 (добавить в tool-crud.test.js)
- **Dependencies:** US-031

---

### Phase 6: Frontend (7 SP)

#### US-037: Team Settings Page + Accept Invite Page (7 SP)

- **Feature:** 02 | **Developer:** Nina

##### Описание
Как owner/admin, я хочу страницу управления командой, а как приглашённый — страницу принятия приглашения.

##### Реализация
- Новый: `frontend/app/settings/team/page.tsx` — Team tab в Settings:
  - Members table + pending invites
  - [Mitglied einladen] → InviteDialog (email + role dropdown)
  - PlanLimitBar: "3 von 5 Benutzer"
  - Role change dropdown (owner only)
  - Remove + Revoke/Resend actions
- Новый: `frontend/app/invite/accept/page.tsx` — Accept invitation:
  - Verify token → show org name + role
  - If not registered → redirect to Ory registration with return URL
  - If logged in → POST accept, redirect to dashboard
- Новый: `frontend/components/team/TeamMemberList.tsx` — members table
- Новый: `frontend/components/team/InviteDialog.tsx` — invite modal
- Новый: `frontend/components/team/PlanLimitBar.tsx` — "3 of 5 users" progress bar
- Изменён: `frontend/components/auth/RegisterStep2.tsx` — **удалить кнопку [Überspringen]** (Step 2 mandatory)

##### Критерии приёмки
- [ ] Members table с name, email, role, status, actions
- [ ] Invite dialog с validation
- [ ] Plan limit indicator + disabled invite when full
- [ ] Accept page: verify → register/login → join org
- [ ] Step 2 mandatory (no skip)
- [ ] Responsive, WCAG AA

- **Tests:** 4 (frontend component tests)
- **Dependencies:** US-032, US-033, US-034, US-035

---

## Summary

| Phase | Stories | SP |
|-------|---------|-----|
| Domain Service | US-031 | 2 |
| Invite API | US-032 | 3 |
| Accept Flow | US-033 | 5 |
| Team List | US-034 | 2 |
| Team Manage | US-035 | 3 |
| maxTools | US-036 | 2 |
| Frontend | US-037 | 7 |
| **Total** | **7 stories** | **24 SP** |

---

## New Files (17 backend + 5 frontend)

```
# Backend
app/schemas/Invitation.js
app/domain/iam/services/SubscriptionLimitChecker.js
app/application/billing/getOrgLimits.js
app/application/iam/createInvitation.js
app/application/iam/acceptInvitation.js
app/application/iam/listTeamMembers.js
app/application/iam/changeRole.js
app/application/iam/removeMember.js
app/api/team/invite.js
app/api/team/acceptInvite.js
app/api/team/list.js
app/api/team/manage.js

# Frontend
frontend/app/invite/accept/page.tsx
frontend/app/settings/team/page.tsx
frontend/components/team/TeamMemberList.tsx
frontend/components/team/InviteDialog.tsx
frontend/components/team/PlanLimitBar.tsx
```

## Modified Files (7)

```
app/application/iam/syncUserFromOry.js     — check pending invitation before creating org
app/application/inventory/registerTool.js  — add maxTools enforcement
app/lib/tenant.js                          — add 'Invitation' to TENANT_TABLES
app/seeds/roles.js                         — add Invitation permissions + UPGRADE admin
app/seeds/plans.js                         — новые лимиты
server/lib/schemas.js                      — InviteCreateSchema, ChangeRoleSchema, InviteTokenSchema
server/lib/errors.js                       — add PlanLimitError class
frontend/components/auth/RegisterStep2.tsx — удалить кнопку [Überspringen]
```

## New Test Files

```
tests/subscription-limits.test.js      (8 tests)
tests/invite-api.test.js              (6 tests)
tests/invite-accept.test.js           (8 tests)
tests/team-api.test.js                (4 tests)
tests/team-manage.test.js             (8 tests)
+ 4 tests в существующем tool-crud.test.js (maxTools enforcement)
Total: 38 new tests (115 → ~153)
```

---

## Admin Role Upgrade

**Текущие permissions admin:**
- `User.read` (только чтение)
- `AITool.manage`, `RiskClassification.manage`, etc.

**Обновлённые permissions admin (Sprint 2.5):**
```
+ { role: 'admin', resource: 'User', action: 'manage' }       // было: read → теперь: manage
+ { role: 'admin', resource: 'Invitation', action: 'manage' }  // новый ресурс
+ { role: 'admin', resource: 'Organization', action: 'read' }  // может видеть, но НЕ удалять/менять
```

**Что admin МОЖЕТ:** Приглашать/удалять members, менять роли, управлять invitations, всё то же что сейчас (manage AITool, Classification, etc.), видеть org info, видеть полный dashboard.

**Что admin НЕ МОЖЕТ:** Удалять/переименовывать организацию, управлять billing, менять/удалять owner'а.

---

## Subscription Limits — полная стратегия

| Лимит | Поле | Enforcement Sprint | Где проверяется |
|-------|------|-------------------|-----------------|
| **maxUsers** | Plan.maxUsers | **2.5** | POST /api/team/invite |
| **maxTools** | Plan.maxTools | **2.5** | POST /api/tools (registerTool) |
| **maxEvaMessages** | Plan.features.eva | 4 (Eva ships) | POST /api/chat |
| **maxEmployees** | Plan.maxEmployees | 8+ (AI Literacy) | POST /api/literacy/enroll |
| **maxDocuments** | Plan.features.documents | 4-5 (Doc gen) | POST /api/compliance/documents |

---

## Verification Checklist

- [ ] `npm run lint` — 0 errors
- [ ] `npm run type-check` — 0 errors
- [ ] `npm test` — ~153 tests, 0 failures
- [ ] Invite flow E2E: create invite → verify token → register → joins correct org with correct role
- [ ] maxUsers: invite blocked at plan limit (403 PLAN_LIMIT_EXCEEDED)
- [ ] maxTools: tool registration blocked at plan limit (403 PLAN_LIMIT_EXCEEDED)
- [ ] Team management: list members, change role, remove member, revoke invite
- [ ] Modified webhook: invitation email → join existing org (not new)
- [ ] Registration Step 2: mandatory (no skip button)
- [ ] Multi-tenancy on all new endpoints
- [ ] AuditLog on all mutations
- [ ] Zod validation on all new APIs
