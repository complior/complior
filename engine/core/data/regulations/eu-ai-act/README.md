# EU AI Act Compliance Framework — README

> **Version:** 4.0-full-coverage
> **Дата:** 2026-02-18
> **Закон:** EU AI Act (Regulation (EU) 2024/1689)
> **Покрытие:** ~95% actionable obligations
> **Next review:** 2026-03-01

---

## Что это

11 файлов, 421 KB — полная машиночитаемая база знаний по EU AI Act для платформы Complior.ai.

Обработаны: 34 статьи закона, 5 Annexes (II, III, IV, XI, XII), Codes of Practice (по декабрь 2025), Commission Guidelines (февраль 2025). Obligations decomposed по 13 industry domains.

Это **data layer**, не документация. Загружается в engine и используется scanner'ом, fixer'ом, scoring engine, onboarding wizard, SEO generator и knowledge loader.

---

## Числа

| Метрика | Значение |
|---------|----------|
| Obligations (обязательств) | **108** |
| — critical severity | 37 |
| — high severity | 57 |
| — medium severity | 12 |
| — low severity | 2 |
| — applies to provider | 48 |
| — applies to deployer | 17 |
| — applies to both | 43 |
| — CLI-checkable (scanner может проверить) | 85 (79%) |
| — SDK feature needed | 33 (31%) |
| — document template needed | 40 (37%) |
| — has what_not_to_do (антипаттерны) | **108 (100%)** |
| Tech specs for scanner | **89** |
| — CLI coverage | **85/85 (100%)** |
| Scoring categories (base) | 8 |
| Scoring categories (domain) | 13 |
| Risk levels | 5 |
| Classification questions | 8 |
| Roles defined | 8 |
| Key definitions | 20 |
| Applicability tree questions | 7 |
| Cross-regulation mappings | 8 |
| Timeline events (2024–2030) | 18 |
| Localization terms × 7 languages | 8 × 7 = 56 |
| Document templates (audit-ready) | 8 |
| Marketing assets | 7 |
| Industry domains covered | **13** |

---

## Структура файлов

```
complior/engine/data/regulations/eu-ai-act/
│
├── README.md                        ← этот файл
│
│   ── ЯДРО (engine загружает при старте) ──
├── obligations.json                 ← 108 обязательств (191 KB)
├── technical-requirements.json       ← 89 tech specs для scanner (111 KB)
├── scoring.json                     ← алгоритм скоринга (14 KB)
├── regulation-meta.json             ← метаданные + роли + риски (34 KB)
│
│   ── ВСПОМОГАТЕЛЬНЫЕ ──
├── applicability-tree.json           ← decision tree Quick Check (9 KB)
├── cross-mapping.json               ← маппинг на другие законы (8 KB)
├── timeline.json                    ← 18 дедлайнов 2024–2030 (9 KB)
├── localization.json                ← термины на 7 языках (7 KB)
│
│   ── ДОКУМЕНТЫ И КОНТЕНТ ──
├── templates-part1.md               ← шаблоны 1–2: AI Literacy + Art. 5 Screening (14 KB)
├── templates-part2.md               ← шаблоны 3–8: FRIA, Worker, TechDoc, Incident, CE, Monitoring (12 KB)
└── marketing-content.md             ← Quick Check, Penalty Calc, Blog, FAQ, LinkedIn, SEO pages (12 KB)
```

При переименовании убрать `-v3-production` суффикс.

---

## 13 Industry Domains

Каждое domain obligation содержит специфику для отрасли: какие запрещённые практики актуальны, какие bias-тесты нужны, какие смежные законы пересекаются.

| # | Domain | Obl | Annex | Ключевая специфика |
|---|--------|-----|-------|-------------------|
| 1 | **HR / Employment** | 3 | III.4 | Recruitment bias, workplace emotion recognition PROHIBITED (Art. 5(1)(f)), works council notification (DE/NL/AT), GDPR employee data |
| 2 | **Finance / Credit / Insurance** | 4 | III.5 | Credit scoring FRIA mandatory (Art. 27), insurance pricing fairness, proxy discrimination, MiFID II intersection |
| 3 | **Healthcare / Medical** | 3 | II+III | Dual AI Act + MDR conformity, clinical validation, health advice disclaimers, GDPR Art. 9, demographic accuracy |
| 4 | **Education** | 3 | III.3 | Admissions bias, proctoring emotion recognition PROHIBITED, tutoring minors protection |
| 5 | **Law Enforcement** | 2 | III.6 | Real-time biometric ID PROHIBITED (Art. 5(1)(h)), predictive policing bias, maximum penalties (€35M) |
| 6 | **Justice / Legal** | 2 | III.8 | Advisory-only judicial AI, highest explainability, legal practice client disclosure |
| 7 | **Migration / Border** | 2 | III.7 | Refugee Convention intersection, asylum human review, AFSJ extended deadline (2030) |
| 8 | **Critical Infrastructure** | 1 | III.2 | Failsafe mechanisms, NIS2 intersection, redundancy, public safety at scale |
| 9 | **Biometric** | 1 | III.1 | 4 Art. 5 prohibitions, double human verification (Art. 14(5)), GDPR Art. 9 special category |
| 10 | **Content Generation** | 2 | Art.50 | C2PA machine-readable marking, deepfake visible labeling, watermark robustness |
| 11 | **Customer Service** | 1 | Art.50 | Chatbot AI disclosure, human escalation option |
| 12 | **Marketing / Advertising** | 1 | Art.5 | AI manipulation = prohibited (max penalty), user opt-out, DSA intersection |
| 13 | **Transport / Autonomous** | 1 | II+III | Fail-safe behavior, type-approval dual framework, diverse condition testing |

Plus **82 generic (cross-domain) obligations** applying to all AI systems regardless of industry.

---

## Что означает каждый файл

### 1. obligations.json — ЯДРО (191 KB, 108 obligations)

Каждое обязательство: 27 полей. Ключевые:

- `obligation_id` — уникальный ID (`eu-ai-act-OBL-HR-001`)
- `applies_to_role` — `deployer` / `provider` / `both`
- `applies_to_risk_level` — фильтр по уровню риска
- `what_to_do` — конкретные действия (5–8 пунктов)
- `what_not_to_do` — антипаттерны (3–5 пунктов)
- `evidence_required` — что показать аудитору
- `cli_check_possible` — может ли scanner проверить в коде
- `severity` — critical / high / medium / low
- `automation_approach` — как scanner автоматизирует (конкретные файлы и паттерны)

### 2. technical-requirements.json — SCANNER DATA (111 KB, 89 specs)

100% coverage всех CLI-checkable obligations. Каждый spec:

- `positive_signals` — паттерны кода = compliance
- `negative_signals` — паттерны кода = нарушение
- `warning_message` — сообщение разработчику
- `fix_suggestion` — как исправить
- `severity` — error / warning / info

### 3. scoring.json — COMPLIANCE SCORE (14 KB)

8 base categories (always applied) + 13 domain categories (applied when company operates in domain). Critical cap: any critical = 0% → total max 40%. Thresholds: Red 0–49%, Yellow 50–79%, Green 80–100%. Certificate: 85% + all criticals 100%.

### 4. regulation-meta.json — LAW METADATA (34 KB)

ID, name, jurisdiction, 6 enforcement dates, penalties, 20 definitions, 8 roles, 5 risk levels, 8 classification questions.

### 5. applicability-tree.json — QUICK CHECK (9 KB)

7 questions: does EU AI Act apply to this company? Results: applies / does-not-apply / partially-applies.

### 6. cross-mapping.json — MULTI-JURISDICTION (8 KB)

8 cross-regulation mappings + strictest_rule_wins_matrix. Framework — fills when new jurisdictions processed.

### 7. timeline.json — DEADLINES (9 KB)

18 dates (2024–2030). Amendments. Codes of Practice. 7 monitoring URLs.

### 8. localization.json — 7 LANGUAGES (7 KB)

8 terms in DE, FR, ES, IT, NL, PT, PL. Cultural notes per market.

### 9–10. templates — 8 AUDIT-READY DOCUMENTS (26 KB)

Templates 1–2 (AI Literacy + Art. 5 Screening) **already required since Feb 2025**. Templates 3–8 (FRIA, Worker Notification, Tech Documentation, Incident Report, Declaration, Monitoring Policy) due Aug 2026.

### 11. marketing-content.md — 7 MARKETING ASSETS (12 KB)

Quick Check tool, Penalty Calculator, Blog outline, Comparison table, FAQ, LinkedIn post, Programmatic SEO template.

---

## Как файлы связаны

```
regulation-meta.json
    ├── roles ──────── filter obligations by role
    ├── risk_levels ── filter by risk level
    └── questions ──── onboarding quiz
            │
            ▼
obligations.json (108)
    ├── cli_check=true ──► technical-requirements.json (89) ──► SCANNER
    ├── sdk_needed=true ──► SDK middleware
    ├── template_needed=true ──► templates-*.md ──► FIXER
    ├── severity + category ──► scoring.json ──► SCORE
    ├── cross_mapping ──► cross-mapping.json ──► STRICTEST RULE WINS
    ├── deadline ──► timeline.json ──► COUNTDOWN
    └── what_to_do + what_not_to_do ──► FINDINGS + FIX ACTIONS

applicability-tree.json ──► Quick Check
localization.json ──► UI labels (7 languages)
marketing-content.md ──► Website SEO + blog + tools
```

---

## Использование по компонентам

| Component | Files used | How |
|-----------|-----------|-----|
| **Scanner** | obligations.json + technical-requirements.json | Load CLI-checkable obligations → match positive/negative signals → output findings |
| **Fixer** | obligations.json + templates-*.md | what_to_do actions → generate documents + code fixes |
| **Score Calculator** | scoring.json + obligations.json | Map results to categories → weighted score → threshold |
| **Onboarding** | applicability-tree.json + regulation-meta.json | Quick Check → risk classification → role → personalized obligation list |
| **SEO Generator** | marketing-content.md + obligations.json | Programmatic pages, per-obligation pages, FAQ, comparisons |
| **Knowledge Loader** | obligations.json + timeline.json + regulation-meta.json | On-demand context for LLM agents |

---

## Добавление новой юрисдикции

1. Use same 12-stage prompt + text of new law
2. Receive 11 files → `engine/data/regulations/[jurisdiction-id]/`
3. Fill `cross_regulation_mapping` per obligation
4. Strictest-rule-wins engine picks stricter requirement automatically

| # | Jurisdiction | Status |
|---|-------------|--------|
| 1 | EU AI Act | ✅ Done |
| 2 | Colorado SB 205 | ⏳ Next |
| 3 | NYC LL 144 | 📋 Planned |
| 4 | California SB 1001 | 📋 Planned |
| 5 | WCAG 2.2 AA (EAA) | 📋 Planned |
| 6 | EU Cyber Resilience Act | 📋 Planned |

---

## Что осталось

| Item | Priority |
|------|----------|
| Colorado SB 205 processing | P0 |
| Templates 9–15 (Inventory, Model Card, Copyright, Data Gov, Corrective, Training Summary, Checklist) | P1 |
| GPAI Code of Practice decomposition | P1 |
| Commission guidelines on high-risk classification (expected Feb 2026) | P0 |
| Content marking Code of Practice update | P1 |
| National authority directory per Member State | P1 |
| Harmonised standards (CEN/CENELEC, expected 2027) | P2 |

---

## Version history

| Version | Date | Obligations | Tech specs | Change |
|---------|------|------------|-----------|--------|
| 1.0 | 2026-02-17 | 25 | 6 | Initial framework |
| 2.0 | 2026-02-17 | 64 | 14 | Sub-decomposition |
| 3.0 | 2026-02-17 | 69 | 53 | Deployer expansion, 100% CLI coverage, what_not_to_do |
| **4.0** | **2026-02-18** | **108** | **89** | **13 domains, ~95% law coverage, full production** |
