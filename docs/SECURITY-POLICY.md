# SECURITY-POLICY.md — AI Act Compliance Platform

**Version:** 3.1.0
**Дата:** 2026-02-24
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Утверждён
**Зависимости:** ARCHITECTURE.md v3.2.0

> **v3.1.0 (2026-02-24):** Audit — corrected OWASP statuses (A06: npm audit not in CI, A08: signed commits not configured, A09: Sentry not yet deployed). Added "Known Security Gaps" section. Standardized severity levels to P0–P3 (aligned with RUNBOOK.md). Confirmed GDPR deleteAccount + exportData = IMPLEMENTED.
>
> **v3.0.0 (2026-02-21):** TUI+SaaS Dual-Product. Auth: Ory → WorkOS. Добавлены: Registry API security, TUI ↔ SaaS communication security, telemetry data privacy.
>
> **v0.1.0 (2026-02-04):** Placeholder.

---

## 1. Модель безопасности

### Authentication

| Компонент | Механизм | Провайдер |
|-----------|----------|-----------|
| **Dashboard (SaaS)** | WorkOS AuthKit (hosted login/registration) | WorkOS (managed) |
| **SSO (Enterprise)** | SAML/OIDC через WorkOS | WorkOS + IdP клиента |
| **MFA** | TOTP, SMS | WorkOS |
| **Sessions** | httpOnly cookies + WorkOS session tokens | WorkOS |
| **Registry API** | API Key (HMAC-SHA256) | Наша реализация |
| **TUI ↔ SaaS** | API Key (тот же что Registry API) | Наша реализация |

### Authorization

| Уровень | Механизм |
|---------|----------|
| **RBAC** | Permission(role, resource, action) — наша таблица поверх WorkOS identity |
| **System roles** | owner, admin, member, viewer, platform_admin |
| **Multi-tenancy** | Row-level isolation via organizationId в каждом запросе |
| **Platform Admin** | Double gate: RBAC (`PlatformAdmin:manage`) + env whitelist (`PLATFORM_ADMIN_EMAILS`) |
| **API rate limits** | Per-plan limits: Free 100/day → Starter 1K → Growth 10K → Scale 100K |

---

## 2. OWASP Top 10 — Наши меры

| # | Угроза | Мера | Статус |
|---|--------|------|--------|
| A01 | Broken Access Control | RBAC, multi-tenancy (organizationId filter), `checkPermission()` на каждом endpoint | ✅ Реализовано (Sprint 1) |
| A02 | Cryptographic Failures | TLS 1.3 (Caddy auto-TLS), AES-256 at rest (Hetzner), API keys HMAC-SHA256 | ✅ Реализовано |
| A03 | Injection (SQL, XSS, Command) | Parameterized queries (pg pool), React auto-escaping, Zod validation, CSP headers | ✅ Реализовано |
| A04 | Insecure Design | DDD с Bounded Contexts, VM Sandbox isolation, threat modeling в architecture docs | ✅ Design-level |
| A05 | Security Misconfiguration | Docker non-root, security headers (Caddy), env-only secrets, no default credentials | ✅ Реализовано (Sprint 4) |
| A06 | Vulnerable Components | `npm audit` local only (CI/CD not configured yet), Dependabot (planned), minimal dependencies | ⚠️ Частично (npm audit local, not in CI) |
| A07 | Auth Failures | WorkOS (managed auth, MFA, brute-force protection, Radar bot detection) | ✅ WorkOS handles |
| A08 | Software & Data Integrity | Docker image pinning, Caddy binary verification. Signed commits NOT configured yet | ⚠️ Частично (signed commits outstanding) |
| A09 | Security Logging | AuditLog на все data access (7 лет retention). Sentry NOT deployed yet (planned) | ⚠️ Частично (AuditLog ✅, Sentry not deployed) |
| A10 | SSRF | Нет user-controlled URL fetching в backend. EUR-Lex scraper → whitelist domains only | ✅ N/A |

---

## 3. Data Security

### Классификация данных

| Категория | Примеры | Хранение | Шифрование |
|-----------|---------|----------|------------|
| **Auth credentials** | Пароли, sessions, MFA | WorkOS (managed, US, SCC) | WorkOS manages |
| **Compliance data** (sensitive) | AI tool classifications, FRIA, compliance docs | PostgreSQL (Hetzner DE) | AES-256 at rest |
| **PII** | Email, fullName, company | PostgreSQL (Hetzner DE) | AES-256 at rest |
| **Telemetry** (TUI) | Scan scores, violations, tool IDs | PostgreSQL (Hetzner DE) | AES-256 at rest |
| **API keys** | Registry API / TUI keys | PostgreSQL (hash only) | HMAC-SHA256 |
| **PDFs** | FRIA reports, certificates | Hetzner Object Storage (DE) | TLS in transit, S3 at rest |

### GDPR Compliance

- **Art. 17 Right to Erasure:** User anonymization + WorkOS user deletion + Stripe customer deletion
- **Art. 20 Data Portability:** JSON export of all user data
- **Data Residency:** Compliance data = EU only (Hetzner DE). Auth tokens = WorkOS (US, SCC-compliant)
- **PII Stripping:** TUI telemetry anonymizes project paths before sending to SaaS
- **Retention:** Classifications 7 лет, chat 2 года, notifications 90 дней, audit logs 7 лет

---

## 4. Registry API Security

| Мера | Реализация |
|------|------------|
| **API Key auth** | HMAC-SHA256 hash stored, key shown once on creation |
| **Rate limiting** | Per-plan daily limits, tracked in APIUsage table |
| **ETag caching** | Reduces unnecessary data transfer, 304 Not Modified |
| **Input validation** | Zod schemas on all query parameters |
| **Response filtering** | Free tier: limited fields. Paid: full evidence/assessments |
| **Abuse detection** | Anomalous request patterns → alert + temporary block |
| **Key rotation** | Create new → grace period → revoke old |

---

## 5. TUI ↔ SaaS Communication

| Мера | Реализация |
|------|------------|
| **Transport** | TLS 1.3 (HTTPS only) |
| **Authentication** | API Key в `X-API-Key` header |
| **Idempotency** | HMAC-based dedup keys для scan results |
| **PII stripping** | Project paths anonymized, no source code transmitted |
| **Data minimization** | TUI отправляет только: scores, violation IDs, tool IDs, agent types |
| **Payload size** | Max 1MB per request, gzip compression |
| **Node identity** | HMAC(hostname + install_id) — стабильный, не содержит PII |

---

## 6. Infrastructure Security

| Компонент | Мера |
|-----------|------|
| **Docker** | Non-root containers, read-only filesystem where possible, no `--privileged` |
| **Network** | PostgreSQL not exposed externally, internal Docker network only |
| **Caddy** | Auto-TLS (Let's Encrypt), HTTP/3, HSTS, security headers |
| **Secrets** | Environment variables only, Docker secrets for DB password |
| **Backups** | Automated PostgreSQL backups, encrypted, stored in Hetzner S3 (EU) |
| **Monitoring** | Better Uptime (Литва) for uptime, Sentry for errors (PII filtered) |
| **CI/CD** | `npm audit` on every PR, lint + type-check, test suite (229 tests) |

---

## 7. Incident Response Protocol

### Уровни инцидентов

| Уровень | Описание | Время реакции |
|---------|----------|---------------|
| **P0 Critical** | Data breach, auth bypass, data loss, service down | Immediate |
| **P1 High** | Key feature broken, significant vulnerability | < 1 hour |
| **P2 Medium** | Degraded performance, minor vulnerability | < 4 hours |
| **P3 Low** | Cosmetic issue, non-sensitive info exposure | Next sprint |

### Процедура

1. **Detect:** Monitoring alerts (Better Uptime), Sentry errors, user reports
2. **Triage:** Определить уровень (P0-P3), назначить ответственного
3. **Contain:** Изолировать затронутый компонент (revoke keys, block IP, disable feature)
4. **Fix:** Разработать и deploy fix
5. **Notify:** Уведомить затронутых пользователей (GDPR Art. 33: 72 часа для DPA при data breach)
6. **Post-mortem:** Документировать причину, fix, preventive measures

---

## 8. Known Security Gaps

| # | Gap | Risk | Mitigation Plan | Target Sprint |
|---|-----|------|-----------------|---------------|
| 1 | Sentry not deployed | No real-time error alerting in production | Deploy Sentry with PII filtering | S8 |
| 2 | `npm audit` not in CI/CD | Vulnerable dependencies may ship to production | Add `npm audit --audit-level=high` to GitHub Actions | S8 |
| 3 | Signed commits not enforced | No verification of commit authorship | Enable GPG signing + branch protection rule | S8 |
| 4 | CSP headers not verified | Potential XSS vector via permissive CSP | Audit and tighten Caddy CSP configuration | S8 |

---

## 9. Known CVEs

Обновляется при обнаружении уязвимостей в dependencies. `npm audit` запускается в CI/CD на каждый PR.

| Дата | CVE | Компонент | Severity | Статус |
|------|-----|-----------|----------|--------|
| — | — | — | — | Нет известных CVE на момент v3.0.0 |

---

**Maintenance:** Leo (SecOps) обновляет этот файл при обнаружении уязвимостей и изменениях в security architecture.
