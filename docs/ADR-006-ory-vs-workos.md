# ADR-006: Ory Kratos вместо WorkOS

**Статус:** Принято
**Дата:** 2026-02-09
**Автор:** Marcus (CTO) via Claude Code
**Контекст:** Подтверждение выбора auth-провайдера, оценка WorkOS как альтернативы

---

## Контекст

WorkOS предлагает managed auth с generous free tier (1M MAU), enterprise SSO ($125/connection), SCIM, Admin Portal. Вопрос: стоит ли заменить self-hosted Ory Kratos на WorkOS?

## Рассмотренные варианты

### Вариант A: WorkOS (managed)

**Плюсы:**
- 1M MAU бесплатно
- Enterprise SSO: $125/connection (vs Ory Enterprise License $3,000+/мес)
- Zero operational overhead (managed)
- Admin Portal (white-label, free)
- Fine-Grained Authorization (10M checks/month free)
- Bot protection (Radar)

**Минусы:**
- **US-only data residency** — все данные хранятся в AWS US
- **US company** — подпадает под CLOUD Act
- Subprocessors: AWS, Amplitude, Datadog, Google, HubSpot, Salesforce — все US
- Vendor lock-in: proprietary API, no self-hosting
- Полагается на Standard Contractual Clauses (SCCs) для GDPR

### Вариант B: Ory Kratos (self-hosted) — ТЕКУЩИЙ

**Плюсы:**
- **EU data residency** — Hetzner, Германия
- Open-source (Apache 2.0)
- Zero vendor lock-in
- Full control over data and infrastructure
- Webhook sync pattern уже реализован (Sprint 0-1)

**Минусы:**
- Operational overhead (self-hosted)
- SAML SSO requires Ory Enterprise License ($3,000+/мес)
- No built-in Admin Portal
- More complex setup (multiple services)

## Решение

**Оставить Ory Kratos (self-hosted, Hetzner EU).**

## Обоснование

| Критерий | Ory Kratos | WorkOS |
|----------|:---:|:---:|
| **EU Data Residency** | **Германия (Hetzner)** | ❌ US only |
| Cost at MVP (50 users) | ~€10-20/мес infra | $0 |
| Cost with 5 SSO connections | $3,000+/мес (OEL) | ~$625/мес |
| Open-source | Apache 2.0 | Proprietary |
| Vendor lock-in | None | Significant |
| CLOUD Act exposure | None | Yes |
| Operational overhead | Higher | Zero |
| Trust signal for EU clients | **Strong** (data in DE) | Weak (US hosting) |

**Решающий фактор: EU data residency.** Мы продаём EU AI Act compliance глобальным компаниям, работающим с EU-клиентами. "Мы помогаем соблюдать EU регуляции, но данные аутентификации уходят в US" — это contradiction. Ory на Hetzner = данные в Германии = конкурентное преимущество.

## Когда пересмотреть

- WorkOS запускает подтверждённый EU region
- Enterprise клиенты требуют SAML SSO и Ory Enterprise License ($3K+/мес) становится blocker
- В этом случае: hybrid — Ory для basic auth (EU) + WorkOS только для enterprise SSO connections

## Последствия

### Позитивные
- 100% EU data sovereignty для auth data
- Нет vendor lock-in
- Сильный trust signal для EU compliance market

### Негативные
- Higher operational burden (self-hosted)
- Enterprise SSO дороже при масштабировании
- No built-in Admin Portal (build ourselves when needed)

## Связанные решения
- ARCHITECTURE.md §4.1 IAM Context
- Sprint 0-1: Ory webhook integration already implemented
- Feature 02: IAM
