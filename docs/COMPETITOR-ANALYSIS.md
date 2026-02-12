# COMPETITOR-ANALYSIS.md — AI Act Compliance Market

**Версия:** 1.1.0
**Дата:** 2026-02-12
**Автор:** Ava (Research) + Marcus (CTO) via Claude Code
**Статус:** Информационный

---

## 1. Ключевой вывод

**Рынок deployer'ов (компании, которые ИСПОЛЬЗУЮТ AI) в 120 раз больше рынка provider'ов (компании, которые СТРОЯТ AI), но не имеет dedicated self-service платформы.**

| Сегмент | Количество в Германии | Обслуживается? |
|---------|:---:|:---:|
| AI Provider (строят AI) | ~1,100 | ✅ Kertos, Credo AI, Holistic AI и др. |
| AI Deployer (используют AI) | ~125,000+ | ❌ Нет dedicated платформы |

---

## 2. Главный конкурент: Kertos

### Профиль

| Параметр | Значение |
|----------|----------|
| **Штаб-квартира** | Мюнхен, Германия |
| **Основана** | 2021 |
| **Финансирование** | €20M total (€14M Series A, Balderton Capital) |
| **Выручка** | ~$6.2M ARR |
| **Сотрудники** | ~56 |
| **G2 рейтинг** | 4.9/5 (25+ отзывов) |
| **Рынок** | Multi-framework compliance (AI Act, GDPR, ISO 27001 — 8 фреймворков) |

### Ценообразование

| Канал | Цена |
|-------|------|
| AWS Marketplace | $10,000/год per framework |
| Direct Sales | Demo required, business email only |
| Self-service | ❌ Нет (sales-gated) |
| Бесплатный tier | ❌ Нет |

### AI Act покрытие

| Возможность | Kertos | Наша платформа |
|-------------|:---:|:---:|
| Risk classification | ✅ (broad) | ✅ (deep, deployer-specific) |
| Documentation templates | ✅ (generic) | ✅ (deployer-specific: FRIA, Monitoring Plan) |
| FRIA (Art. 27) guided wizard | ❌ | ✅ |
| AI Literacy (Art. 4) training | ❌ | ✅ (wedge product) |
| Shadow AI Discovery | ❌ | ✅ (manual MVP, EU-sovereign auto later) |
| CE Declaration (Art. 47) | ❌ | P3 Future |
| Art. 11 Annex IV generation | ❌ | P3 Future |
| KI-Compliance Siegel | ❌ | ✅ |
| Multi-language content | ❌ (English-only) | ✅ (EN default + DE, FR post-MVP) |
| Self-service signup | ❌ (demo call required) | ✅ |

### Вывод по Kertos

**Kertos — horizontal compliance platform** (8 фреймворков, broad-not-deep).
**Мы — vertical AI Act deployer platform** (один регламент, deep, self-service).

Не конкуренты в прямом смысле. Разные сегменты:
- Kertos: 20-500 сотрудников, $10K+/год, enterprise sales
- Мы: 5-250 сотрудников, €49-399/мес, self-service

---

## 3. Competitive Landscape (5 уровней)

### Tier 1: Прямые конкуренты AI Act

| Платформа | Страна | Фокус | Цена | Deployer? |
|-----------|--------|-------|------|:---------:|
| Kertos | DE 🇩🇪 | Multi-framework | $10K+/yr | Частично |
| Credo AI | US 🇺🇸 | AI Governance | Enterprise | ❌ Provider |
| Holistic AI | UK 🇬🇧 | AI Risk Mgmt | Enterprise | Частично |
| Fairly AI | US 🇺🇸 | AI Auditing | Enterprise | ❌ Provider |
| TrailBlazer AI | EU | AI Act SaaS | Unknown | ❌ Provider |

### Tier 2: GRC / Compliance платформы с AI Act модулем

| Платформа | Страна | AI Act? | Deployer? |
|-----------|--------|---------|:---------:|
| OneTrust | US 🇺🇸 | Module добавлен | Нет |
| TrustArc | US 🇺🇸 | Planned | Нет |
| BigID | US 🇺🇸 | Data-focused | Нет |
| Securiti | US 🇺🇸 | DSPM + AI | Нет |

### Tier 3: AI Governance Tools

| Платформа | Страна | Фокус | Deployer? |
|-----------|--------|-------|:---------:|
| IBM OpenPages | US 🇺🇸 | Enterprise GRC | Нет |
| SAS Model Mgmt | US 🇺🇸 | Model governance | Нет |
| Arthur AI | US 🇺🇸 | Model monitoring | Нет |
| Fiddler AI | US 🇺🇸 | Explainability | Нет |

### Tier 4: Consulting / Manual

| Подход | Цена | Deployer? |
|--------|------|:---------:|
| Big 4 (KPMG, EY, PwC, Deloitte) | €50-200K | Проектная работа |
| Boutique AI Act consultants | €20-50K | Manual |
| Law firms (GDPR → AI Act add-on) | €200-500/hr | Advisory only |
| DIY (read the regulation) | Free | Нет помощи |

### Tier 5: Потенциальные entrants

| Кто | Когда | Риск |
|-----|-------|------|
| Personio (HR + AI) | 2026-2027 | AI Act HR compliance module |
| Datev (accounting DE) | 2027+ | SMB client base |
| SAP | 2026 | Enterprise only |
| Compliance.ai | 2026 | US-first |

---

## 4. Market Gap Analysis

### Что никто не предлагает (наши killing features)

| Feature | Конкуренты | Мы |
|---------|:---------:|:--:|
| **AI Literacy Module (Art. 4)** — курсы + tracking + сертификаты | ❌ 0 из 30+ | ✅ |
| **Shadow AI Discovery** — найти все AI-инструменты в компании | ❌ 0 из 30+ | ✅ (manual MVP, EU-sovereign auto) |
| **FRIA Guided Wizard (Art. 27)** — пошаговая оценка | ❌ 0 из 30+ | ✅ |
| **KI-Compliance Siegel** — знак соответствия для сайта | ❌ 0 из 30+ | ✅ |
| **Deployer-First UX** — "Какой AI вы используете?" (не "Какой AI вы строите?") | ❌ 0 из 30+ | ✅ |
| **Multi-language self-service** — EN + DE + FR, от €49/мес | ❌ 0 из 30+ | ✅ |
| **AI Tool Catalog** — 200+ pre-populated инструментов с risk hints | ❌ 0 из 30+ | ✅ |

### Ценовой gap

```
Consulting:     ████████████████████████████ €50-200K
Kertos:         ██████████ €10K+/yr
Наша платформа: ██ €588-4,788/yr  ← SWEET SPOT
DIY:            Free (но 70% ошибок)
```

---

## 5. Deployer Market Data

### Размер рынка (Германия — DACH)

- **36%** немецких компаний уже используют AI (Bitkom 2025)
- **47%** планируют внедрение
- **125,000+** потенциальных deployer-клиентов в Германии
- **~1,100** AI provider-компаний (для сравнения: 120:1 ratio)

### Global TAM (Art. 2 — экстерриториальное действие)

Art. 2 AI Act действует аналогично GDPR Art. 3 — распространяется на **любую компанию, чьи AI-системы используются в EU**, независимо от регистрации:

| Сегмент | Оценка | Примеры |
|---------|:---:|---|
| DACH deployers | 125,000+ | Немецкие SMB, использующие AI |
| EU-wide deployers | 500,000+ | Франция, Нидерланды, Скандинавия |
| Non-EU companies serving EU | 300,000+ | US SaaS с EU-клиентами, UK рекрутинг, Indian аутсорс |
| Bootstrapped AI startups (Provider-Lite) | 50,000+ | AI-стартапы <50 чел, строящие для EU рынка |
| **Total addressable market** | **~1,000,000+** | Глобально |

**Юридическое основание:** Art. 2(1)(a): "providers placing on the market or putting into service AI systems in the Union, irrespective of whether those providers are established within or outside the Union". Art. 2(1)(c): same for deployers.

**GDPR аналогия:** GDPR Art. 3 создал $3B+ compliance software рынок (OneTrust, Cookiebot, TrustArc). AI Act Art. 2 создаёт аналогичную возможность для AI compliance.

### Provider-Lite Market

**50,000+ bootstrapped AI startups** (< 50 сотрудников) строят AI-продукты для EU-рынка:
- Pain points: не могут позволить себе Kertos ($10K+), не знают provider obligations (Art. 6/9/11/16)
- Отличие от full providers: не строят foundation models, не подпадают под GPAI (Art. 51-56)
- Наш messaging: "Building AI for the EU market? Start compliance from $49/mo"
- Timing: P2 (Sprint 7-8), после deployer PMF

### AI Literacy Gap (Art. 4, обязателен с 02.02.2025)

- **70%** сотрудников в Германии не прошли AI-обучение
- **0** dedicated платформ для Art. 4 compliance
- Штраф за нарушение: до €7.5M / 1.5% оборота

### Shadow AI Problem

- **71%** сотрудников используют AI без одобрения IT (Microsoft 2024)
- **80%** bring-your-own-AI
- Риски: утечка данных, non-compliance, отсутствие audit trail

---

## 6. Наша стратегия (A+B)

### Phase 1: Vertical AI Act Deployer (MVP → Product Market Fit)

**Целевой клиент:** CTO/CEO компании с 5-250 сотрудниками, которая ИСПОЛЬЗУЕТ AI-инструменты и работает с EU-клиентами (глобально, не только DACH).

**Wedge product:** AI Literacy Module (€49/мес)
- Art. 4 уже обязателен
- 70% non-compliance = immediate demand
- Standalone value без других фич

**Full product:** AI Tool Inventory + Classification + Compliance (€149/мес)

### Phase 2: Multi-framework Expansion (после PMF)

- GDPR integration (overlap with FRIA)
- ISO 27001 AI addendum
- NIS2 compliance (where AI is used)
- Industry-specific: MedTech (MDR), FinTech (DORA)

### Дифференциация от Kertos

| Dimension | Kertos | Мы |
|-----------|--------|-----|
| **Подход** | Horizontal (8 frameworks) | Vertical (AI Act deep → expand) |
| **Сегмент** | Mid-market (20-500) | SMB (5-250) |
| **Цена** | $10K+/yr per framework | €49-399/мес (5-50x дешевле) |
| **Sales** | Demo call required | Self-service (no demo needed) |
| **Язык** | English only | English-first + DE, FR post-MVP |
| **AI Act depth** | Broad-not-deep | Deep (FRIA, AI Literacy, Shadow AI, Siegel) |
| **Deployer focus** | Partial | 100% deployer-first |

---

**Последнее обновление:** 2026-02-12 (v1.1.0: Global TAM + Provider-Lite market)
