# Passport Data Fill Pipeline — Полная карта сбора данных паспорта по стадиям

> **Версия:** 2.0.0
> **Дата:** 2026-03-25
> **Назначение:** Описание всех стадий заполнения Agent Passport — от init до production monitoring.
> **Связанные документы:** [FEATURE-AGENT-PASSPORT.md](./FEATURE-AGENT-PASSPORT.md), [PRODUCT-BACKLOG.md](./PRODUCT-BACKLOG.md)

---

```
═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 0: INIT                                    Полнота: 0% → 65-70%
 complior init  ИЛИ  complior (TUI onboarding)      (creates .complior/ + passports)
═══════════════════════════════════════════════════════════════════════════

 Два пути входа:

 CLI:  complior init
       → Creates .complior/ + profile.json + project.toml
       → Auto-discovers AI agents → creates passports (idempotent)

 TUI:  complior (no args)
       → Onboarding wizard (8 steps: theme, project type, requirements,
         role, industry, AI provider)
       → Saves .complior/project.toml (richer config from wizard)
       → Auto-scan on completion → scan.completed event
       → Auto-discovers agents via scan.completed handler (idempotent)

 ┌─ PROJECT CONFIG ────────────────────────────────────────────────┐
 │  .complior/profile.json                                         │
 │  business.domain     → hr, finance, healthcare...               │
 │  data.types          → personal, medical, financial...          │
 │  data.storage        → eu, us, mixed                            │
 │  aiSystem.type       → feature, platform, internal              │
 │  computed.riskLevel  → high, limited, minimal                   │
 └─────────────────────────────────────────────────────────────────┘

 ┌─ IDENTITY (авто) ────────────────────────────────────────────────┐
 │  agent_id          ag_ + UUID                                    │
 │  name              из имени entry file / framework config        │
 │  display_name      Title Case от name                            │
 │  description       "Openai-based hybrid agent for langchain,     │
 │                     using gpt-4, with 3 files, at L3"            │
 │  version           "1.0.0"                                       │
 │  created/updated   ISO timestamp                                 │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ AUTONOMY (авто, из L4 patterns) ────────────────────────────────┐
 │  type               autonomous | assistive | hybrid              │
 │  autonomy_level     L1-L5 из AST-паттернов                      │
 │  autonomy_evidence  gates, unsupervised, no_logging counts       │
 │  killSwitchPresent  → используется для oversight                 │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ TECH STACK (авто, из L3 deps + SDK detection) ──────────────────┐
 │  framework          langchain | crewai | openai | anthropic      │
 │  model.provider     из detected SDKs                             │
 │  model.model_id     из detected models (gpt-4, claude-3...)      │
 │  model.deployment   "api" (default)                              │
 │  model.data_residency  inferDataResidency(profile, provider)     │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ PERMISSIONS (авто, из permission scanner) ──────────────────────┐
 │  permissions.tools         из tool definitions в коде            │
 │  permissions.data_access   read/write/delete из DB паттернов     │
 │  permissions.denied        из explicit deny lists                │
 │  permissions.data_boundaries.pii_handling  "redact" (default)    │
 │  interop.mcp_servers       из MCP config                         │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ CONSTRAINTS (авто + defaults) ──────────────────────────────────┐
 │  human_approval_required   из AST (confirm, approve gates)       │
 │  prohibited_actions        [] (default, заполняется вручную)     │
 │  escalation_rules          авто из human_approval_required       │
 │  rate_limits               100/min (default)                     │
 │  budget                    $5.00/session (default)               │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ COMPLIANCE (авто, вычисляется) ─────────────────────────────────┐
 │  risk_class            resolveRiskClass(autonomy, profile)       │
 │  applicable_articles   getApplicableArticles(risk_class)         │
 │  obligations_met       computeDeployerObligations(manifest)      │
 │  obligations_pending   computeDeployerObligations(manifest)      │
 │  complior_score        0 (если нет предыдущего скана)            │
 │  last_scan             "" (если нет предыдущего скана)           │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ LOGGING & LIFECYCLE (defaults) ─────────────────────────────────┐
 │  actions_logged        true/false из AST (logging patterns)      │
 │  retention_days        365 (default)                             │
 │  lifecycle.status      "draft"                                   │
 │  lifecycle.next_review computed: created + 90 дней               │
 │  review_frequency_days 90 (default)                              │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ SIGNATURE (авто) ───────────────────────────────────────────────┐
 │  algorithm, public_key, signed_at, hash, value                   │
 │  Ed25519 подпись всего манифеста                                 │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ SOURCE TRACKING (авто) ─────────────────────────────────────────┐
 │  source.mode             "auto"                                  │
 │  source.confidence       ~0.42 (auto_filled / ALL_FIELDS)       │
 │  source.fields_auto_filled  [список]                            │
 │  source.fields_manual       [список]                            │
 └──────────────────────────────────────────────────────────────────┘

 ❌ ПУСТО после init (заполняется позже):
    owner.team, owner.contact, owner.responsible_person
    disclosure.user_facing, disclosure.disclosure_text
    disclosure.ai_marking (responses_marked, method)
    lifecycle.deployed_since
    compliance.last_scan (если не было предыдущего скана)

 ℹ️  `complior agent init` остаётся как опциональная команда:
    - --force: перегенерация паспортов
    - Ручное добавление, когда init не обнаружил агентов

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 1: SCAN                                    Полнота: 65% → 70%
 complior scan (любой тир)                          (+2 поля)
═══════════════════════════════════════════════════════════════════════════

 scan.completed event → auto-discover new agents → updatePassportsAfterScan():

 Триггеры:
 • CLI: `complior scan` (explicit)
 • TUI: auto-scan после onboarding wizard completion
 • Daemon: file watcher (каждое сохранение файла)

 При каждом скане:
 1. initPassport() — обнаруживает НОВЫХ агентов (idempotent, пропускает существующих)
 2. updatePassportsAfterScan() — обновляет паспорта **per-agent**:
    - Фильтрует findings по `agentId === passport.name`
    - scan_summary и doc-status вычисляются из findings конкретного агента
    - Project-level findings (без agentId) НЕ попадают в индивидуальные паспорта
    - complior_score остаётся проектным (одинаковый для всех)

 ℹ️  Для TUI-пути: это первый момент, когда паспорта создаются
    (onboarding wizard не вызывает agent init напрямую).

 ┌─ ОБНОВЛЯЕТСЯ (per-agent) ────────────────────────────────────────┐
 │  compliance.complior_score   0 → per-agent score (passed/total) │
 │  compliance.project_score    0 → 74 (проектный, одинаковый)     │
 │  compliance.last_scan        "" → "2026-03-20T14:30:00Z"        │
 │  compliance.scan_summary     per-agent totals из agentFindings  │
 │  compliance.{doc_fields}     per-agent doc-status               │
 │  updated                     новый timestamp                     │
 │  signature                   переподписывается                   │
 └──────────────────────────────────────────────────────────────────┘

 Scan sub-tiers:
   Tier 1 (default):      L1-L4 deterministic,           coverage 60-70%
   Tier 1+ (--llm):       +L5 LLM analysis,              coverage 70-80%
   Tier 2 (--deep):       +Semgrep/Bandit/ModelScan,     coverage 80-85%
   Tier 2+ (--deep --llm): полный offline,                coverage 85-90%
   Tier 3 (--cloud):      +SBOM+Presidio PII+Vendor DPA, coverage 90-95%
   Tier 3+ (all combined): всё,                           coverage 95%+

 Score разный для разных тиров, но passport update одинаковый.

 ┌─ DOCUMENT QUALITY TRACKING (per-agent, 4-step) ───────────────────┐
 │                                                                    │
 │  Each doc sub-block tracks quality progression:                    │
 │                                                                    │
 │  Level │ Value     │ Detection                │ Score Impact       │
 │  ──────┼───────────┼──────────────────────────┼──────────────────  │
 │  0     │ none      │ No file                  │ L1 fail            │
 │  1     │ scaffold  │ SHALLOW/placeholders     │ L1 pass, L2 fail   │
 │  2     │ draft     │ Real content             │ L1 pass, L2 pass   │
 │  3     │ reviewed  │ complior:reviewed marker  │ L1+L2 pass+marker │
 │                                                                    │
 │  Example: risk_management.doc_quality: "scaffold"                  │
 │                                                                    │
 │  doc_quality_summary aggregates across all 6 doc fields:           │
 │  { none: 1, scaffold: 2, draft: 2, reviewed: 1 }                  │
 └────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 2: FIX                                     Полнота: (score↑)
 complior fix                                       (score increases via rescan)
═══════════════════════════════════════════════════════════════════════════

 Применяет рекомендованные исправления к коду.
 Triggers auto-rescan → passport score обновляется.
 Score может значительно вырасти (e.g., 60 → 85 после исправлений).
 --dry-run — preview без применения.

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 3: РУЧНОЕ ЗАПОЛНЕНИЕ                      Полнота: 70% → 93%
 TUI wizard / JSON edit / CLI                       (+6 полей)
═══════════════════════════════════════════════════════════════════════════

 ┌─ OWNER (ручное, обязательно для compliance) ─────────────────────┐
 │  owner.team                "Backend Engineering"                 │
 │  owner.contact             "eng-lead@company.com"                │
 │  owner.responsible_person  "Maria Schmidt"                       │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ DISCLOSURE (ручное, Art.50 обязывает) ──────────────────────────┐
 │  disclosure.user_facing         true                             │
 │  disclosure.disclosure_text     "This bot uses AI"               │
 │  disclosure.ai_marking.responses_marked  true                    │
 │  disclosure.ai_marking.method   "badge"                          │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ LIFECYCLE (ручное, при деплое) ─────────────────────────────────┐
 │  lifecycle.deployed_since  "2026-04-01"                          │
 │  lifecycle.status          "draft" → "active"                    │
 └──────────────────────────────────────────────────────────────────┘

 Где заполнять:
 • TUI Page 4 (Passport) → detail panel → edit fields
 • JSON edit: nano .complior/agents/my-bot-manifest.json
 • SaaS Dashboard wizard (Mode 3, Sprint S09)

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 4: ДОКУМЕНТЫ                               Полнота: 93% → 100%
 complior agent fria/notify/policy                   (+3 флага)
═══════════════════════════════════════════════════════════════════════════

 ℹ️ В multi-agent проектах каждый агент нуждается в своих документах.
 Scanner генерирует per-agent findings для: FRIA, Risk Management,
 Technical Documentation, Declaration of Conformity, Art. 5 Screening,
 Instructions for Use, Data Governance.

 ┌─ 4a: FRIA (Art.27, обязательно для high-risk) ──────────────────┐
 │  complior agent fria my-bot --organization "ACME Corp"           │
 │  → compliance.fria_completed: true                               │
 │  → compliance.fria_date: "2026-03-20"                            │
 │  → сохраняет .complior/fria/fria-my-bot.md                      │
 │  14+ полей pre-filled. --impact, --mitigation, --approval       │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ 4b: WORKER NOTIFICATION (Art.26(7)) ───────────────────────────┐
 │  complior agent notify my-bot --company-name "ACME"              │
 │  → compliance.worker_notification_sent: true                     │
 │  → compliance.worker_notification_date: "2026-03-20"             │
 │  9 полей pre-filled                                              │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ 4c: AI USAGE POLICY (Art.6) ───────────────────────────────────┐
 │  complior agent policy my-bot --industry hr                      │
 │  → compliance.policy_generated: true                             │
 │  → compliance.policy_date: "2026-03-20"                          │
 │  11 полей pre-filled. --industry hr|finance|healthcare          │
 └──────────────────────────────────────────────────────────────────┘

 ┌─ 4d: AUDIT PACKAGE ─────────────────────────────────────────────┐
 │  complior agent audit-package                                    │
 │  → ZIP bundle: passport + scan report + eval report + FRIA +    │
 │    evidence chain                                                │
 │  Не обновляет passport напрямую                                  │
 └──────────────────────────────────────────────────────────────────┘

 27/27 required полей заполнены = 100% completeness.
 Паспорт переподписывается ed25519 после каждого обновления.

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 5: EVAL                                    Полнота: 100% → 100%+
 complior eval --target <url>                       (+20 новых полей)
═══════════════════════════════════════════════════════════════════════════

 Тестирует РАБОТАЮЩУЮ AI-систему (не код):

 ┌─ ДОБАВЛЯЕТСЯ В ПАСПОРТ: compliance.eval ────────────────────────┐
 │                                                                  │
 │  eval_score            72/100 (weighted per-article)             │
 │  eval_grade            "C" (A-F)                                 │
 │  eval_tier             "full" | "det" | "llm" | "security"      │
 │  eval_security_score   85/100 (OWASP/MITRE)                     │
 │  eval_security_grade   "B" (A-F)                                 │
 │  eval_tests_total      670                                       │
 │  eval_tests_passed     487                                       │
 │  eval_tests_failed     183                                       │
 │  eval_critical_gaps    ["Art.50", "Art.14"]                      │
 │  last_eval             "2026-04-15T10:00:00Z"                    │
 │                                                                  │
 │  eval_category_pass_rates: {                                     │
 │    CT-1  Transparency:    0.82  (55 tests)                       │
 │    CT-2  Oversight:       0.74  (35 tests)                       │
 │    CT-3  Explanation:     0.67  (30 tests)                       │
 │    CT-4  Bias:            0.71  (75 tests)                       │
 │    CT-5  Accuracy:        0.83  (30 tests)                       │
 │    CT-6  Robustness:      0.91  (35 tests)                       │
 │    CT-7  Prohibited:      0.95  (40 tests)                       │
 │    CT-8  Logging:         0.80  (15 tests)                       │
 │    CT-9  Risk Awareness:  0.60  (15 tests)                       │
 │    CT-10 GPAI:            0.70  (10 tests)                       │
 │    CT-11 Industry:        0.75  (30 tests)                       │
 │  }                                                               │
 │                                                                  │
 │  bias_pairs_failed      3                                        │
 │  hallucination_rate     0.12                                     │
 │  avg_latency_ms         1200                                     │
 └──────────────────────────────────────────────────────────────────┘

 Eval tiers:
   --det:       168 deterministic tests     (conformity only)
   --llm:       +212 LLM-judged tests       (semantic quality)
   --security:  300 attack probes           (OWASP/MITRE)
   --full:      670+ all tests              (conformity + security)

 Scan проверяет КОД. Eval проверяет ПОВЕДЕНИЕ.
 Оба score в паспорте = полная картина.

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 6: ЖИВОЕ ОБНОВЛЕНИЕ                        Полнота: 100%
 Daemon file watcher + scan.completed                (score refresh)
═══════════════════════════════════════════════════════════════════════════

 Каждое сохранение файла → 200ms re-scan → score update в паспорте.
 Новые AI SDK imports → auto-discovery новых агентов.
 Паспорт всегда содержит актуальный complior_score и last_scan.

═══════════════════════════════════════════════════════════════════════════
═══════════════════════ PLANNED ═══════════════════════════════════════════
═══════════════════════════════════════════════════════════════════════════

 СТАДИЯ 7: LLM DOCS (E-94, S06)                   Полнота: ±
 complior fix --ai                                  (doc enrichment)
═══════════════════════════════════════════════════════════════════════════

 LLM auto-fills пустые секции FRIA/Policy/Notification.
 Маркеры [AI-DRAFT] для человеческого ревью.
 Pre-fill контекст: 9 полей из паспорта → LLM prompt.

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 8: EVAL REMEDIATION (E-143..147, S12-REM) Полнота: ±
 complior eval --fix                                (fix from eval)
═══════════════════════════════════════════════════════════════════════════

 Remediation Knowledge Base (11 category playbooks).
 Eval Fix Generator: system prompt patch, API config, guardrail config.
 Eval findings → FixDiff pipeline (new FindingSource: "eval").

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 9: MCP PROXY (E-81..84, S06)              Полнота: ±
 complior proxy connect                             (runtime enrichment)
═══════════════════════════════════════════════════════════════════════════

 Для black-box агентов (нет кода, только MCP traffic):

 ┌─ ОБОГАЩАЕТ СУЩЕСТВУЮЩИЙ ПАСПОРТ ────────────────────────────────┐
 │  permissions.tools          → реальные tools_used (runtime)     │
 │  permissions.data_access    → реальные data patterns            │
 │  autonomy_level             → inferred из поведения             │
 │  constraints.rate_limits    → observed request rate              │
 │  source.mode                → "runtime" (вместо "auto")         │
 │  source.confidence          → 0.55 (ниже чем AST ~0.85)        │
 └──────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 10: MONITOR (E-136..138, S12+)            Полнота: ±
 complior monitor --source <langfuse|sdk-logs>      (post-deploy)
═══════════════════════════════════════════════════════════════════════════

 ┌─ ДОБАВЛЯЕТСЯ В ПАСПОРТ: compliance.monitoring ─────────────────┐
 │  monitoring_score          runtime health score (0-100)         │
 │  drift_detected            true/false                           │
 │  last_monitoring           ISO timestamp                        │
 │  anomalies                 ["bias_drift", "error_spike"]        │
 └──────────────────────────────────────────────────────────────────┘

 Паспорт как baseline → monitor сравнивает runtime vs declared.

═══════════════════════════════════════════════════════════════════════════
 СТАДИЯ 11: SAAS (D-13, D-31, S9)                 Mode 3: Manual
 app.complior.dev                                   (100% полей)
═══════════════════════════════════════════════════════════════════════════

 ┌─ SAAS DASHBOARD ────────────────────────────────────────────────┐
 │  Wizard заполнения всех 78 полей вручную                        │
 │  Pre-fill из AI Registry (5,011+ tools):                        │
 │    → vendor DPA status                                          │
 │    → model risk score                                           │
 │    → data residency                                             │
 │    → known capabilities                                         │
 │  Синхронизация CLI ↔ SaaS: complior sync                       │
 │  Import: A2A → passport                                         │
 └──────────────────────────────────────────────────────────────────┘
```

---

## Резюме по стадиям

| # | Стадия | Команда | Полей | Полнота | Статус |
|---|--------|---------|-------|---------|--------|
| 0 | Init | `complior init` / TUI onboarding | ~44 авто + profile + defaults | 65-70% | Done |
| 1 | Scan | `complior scan` / TUI auto-scan | +2 (score, last_scan) + auto-discover | 70% | Done |
| 2 | Fix | `complior fix` | score↑ via rescan | varies | Done |
| 3 | Ручное | TUI / JSON edit | +6 (owner, disclosure, lifecycle) | 93% | Done |
| 4 | Документы | `agent fria/notify/policy/audit-package` | +3 flags + ZIP | 100% | Done |
| 5 | Eval | `complior eval --target` | +20 (conformity, security, categories) | 100%+ | Done |
| 6 | Live update | daemon watcher | score refresh + auto-discover | 100% | Done |
| 7 | LLM Docs | `complior fix --ai` | doc enrichment | varies | Planned (S06) |
| 8 | Eval Remediation | `complior eval --fix` | fix from eval findings | varies | Planned (S12) |
| 9 | MCP Proxy | `complior proxy` | runtime enrichment | varies | Planned (S06) |
| 10 | Monitor | `complior monitor` | +4 (drift, anomalies) | varies | Planned (S12+) |
| 11 | SaaS | `app.complior.dev` | все 78 полей | 100% | Planned (S09) |

---

## Связь со спецификациями

- **Stage 5 (Eval):** см. `docs/EVAL-SPEC.md` (v2.1, 670 тестов, 11 категорий CT-1..CT-11)
- **Stage 8 (Eval Remediation):** см. `docs/sprints/SPRINT-BACKLOG-S12.md`
- **Stage 9 (MCP Proxy):** см. `docs/FEATURE-AGENT-PASSPORT.md` §2.2 Mode 2
- **Stage 10 (Monitor):** см. `docs/PRODUCT-BACKLOG.md` E-F15, E-F20
- **Stage 11 (SaaS):** см. `docs/PRODUCT-BACKLOG-SaaS.md`
