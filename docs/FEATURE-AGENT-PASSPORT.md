# FEATURE: Agent Passport (C.S01)

**Версия:** 2.2.0
**Дата:** 2026-03-20
**Статус:** Mode 1 (Auto) — Production | Mode 2 (Runtime) — Planned | Mode 3 (Manual) — SaaS Sprint S09
**Приоритет:** CRITICAL
**Реализовано:** S03 (каркас) → S04 (FRIA, Evidence Chain) → S05 (Governance) → S06 (Production rewrite)

---

## 1. ЗАЧЕМ

### 1.1. Юридическое требование

EU AI Act обязывает каждого deployer'а вести реестр AI систем. Это не рекомендация — это юридическое требование (дедлайн: **2 августа 2026**, ~5 месяцев):

- **Art.26(1)** — deployer обязан использовать AI систему в соответствии с instructions of use, обеспечить мониторинг, вести логи
- **Art.26(5)** — deployer high-risk систем обязан провести Data Protection Impact Assessment
- **Art.27** — deployer обязан провести Fundamental Rights Impact Assessment (FRIA) **ДО** развёртывания
- **Art.49a** — deployer обязан зарегистрировать high-risk AI систему в EU Database
- **Штрафы:** до 15M EUR или 3% глобального оборота за несоблюдение deployer obligations

Регулятор приходит и спрашивает: «Покажите реестр ваших AI систем. Для каждой — кто ответственный, какой уровень риска, какие данные обрабатывает, есть ли human oversight.» Компания должна ответить.

### 1.2. Два типа AI систем в организации

**Свои агенты (код доступен).** Backend-команда написала order processor на LangChain, recruitment bot на CrewAI, support agent на Vercel AI SDK. Код в репозитории, разработчик знает что делает агент — но не знает, под какие статьи попадает, и не документировал его для регулятора.

**Чужие агенты и AI-сервисы (код недоступен).** Компания использует Intercom Fin для поддержки, ElevenLabs для голосового бота, Stripe Radar для фрод-детекции, Notion AI для внутренних документов. Код закрыт. Но **deployer всё равно обязан их документировать** — закон не различает свои и чужие системы.

### 1.3. Почему не Excel

Сегодня компании решают это Excel-таблицей. Это не работает:

| Excel | Complior Agent Passport |
|-------|------------------------|
| Свободная форма | Стандартный формат, привязанный к Art.26/27 |
| Нет связи с кодом, устаревает | Генерируется из AST-анализа, обновляется при каждом scan |
| Нет compliance scoring | Complior Score + deployer obligations met/pending |
| Нет evidence для аудитора | Ed25519 подпись + evidence chain |
| Статичная таблица | Живой: auto-update score после scan, drift detection |

---

## 2. ЧТО

### 2.1. Определение

**Agent Passport** — стандартизированная карточка AI системы (`agent-manifest.json`). Однозначно идентифицирует AI агента, описывает identity, capabilities, constraints, compliance status, и human oversight.

Хранится в `.complior/agents/{name}-manifest.json`. Подписывается ed25519 при каждом создании и обновлении.

### 2.2. Три режима генерации

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ОДИН ФОРМАТ — ТРИ ИСТОЧНИКА                      │
│                                                                      │
│  Mode 1: AUTO            Mode 2: RUNTIME          Mode 3: MANUAL    │
│  (CLI, код есть)         (Observation + Eval)      (SaaS Dashboard)  │
│                                                                      │
│  AST-анализ кода         MCP Proxy наблюдает       Deployer          │
│  → permissions           tool calls runtime        заполняет форму   │
│  → autonomy L1-L5        → discovered perms        Pre-fill из       │
│  → tools/APIs            → data access patterns    AI Registry       │
│  → human gates           → autonomy inferred                         │
│  → framework detect                                Полнота: 100%     │
│  → model detect          Eval тестирует систему    (manual)          │
│  → kill-switch           → conformity score                          │
│  → risk class из         → security score          Продукт:          │
│    профиля проекта       → critical gaps           SaaS PAID         │
│                                                                      │
│  Полнота: 85-95%         AI Registry (5,011+)      Целевой юзер:     │
│  Продукт: CLI FREE       → vendor DPA, risk score  DPO / CTO /      │
│  Целевой юзер:                                     Compliance Mgr    │
│  Разработчик             Полнота: 40-70%                             │
│                          Продукт: CLI + SaaS                         │
│                          Целевой юзер:                                │
│                          DevOps / Platform Eng                        │
│                                                                      │
│            └───────────────┬──────────────────────┘                  │
│                            ▼                                         │
│                 agent-manifest.json                                    │
│                 (Agent Passport)                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Mode 1 (AUTO)** — `complior agent init` сканирует код через AST. Автоматически определяет: framework, model, permissions, tools, human gates, logging, autonomy level, kill-switch. Risk class определяется по **двум источникам**: автономия агента И профиль проекта (`.complior/profile.json`) — берётся ВЫСШИЙ. Applicable articles, oversight block, deployer obligations, data residency, next review — вычисляются автоматически. Полнота: 85-95%. Это ключевой differentiator.

**Mode 2 (RUNTIME)** — три источника runtime-данных:

1. **MCP Proxy** (Scanner Mode 11, PLANNED) — перехватывает MCP tool calls агента: tools_used, data_access, timing, success/error rates. Авто-обогащает паспорт из наблюдений. Инфраструктура прокси 60% готова, паспортное enrichment — TODO. Use case: black-box агенты без доступа к коду (Cursor, Windsurf, вендорские агенты).

2. **Eval** (Scanner Modes 14-16, PLANNED) — `complior eval --target <url>` тестирует **работающую** AI-систему 670 тестами: 370 conformity + 300 security. Результаты записываются в `compliance.eval` блок паспорта. Это ГЛАВНЫЙ источник поведенческих данных — scan проверяет код, eval проверяет **что система реально делает**.

   **370 conformity тестов (11 категорий EU AI Act):**

   | # | Категория | Тестов | Статья | Что проверяет (недоступно scan) |
   |---|-----------|--------|--------|-------------------------------|
   | CT-1 | Transparency & Disclosure | 55 | Art.50 | Реально ли бот говорит «Я — ИИ», disclosure на 5 языках, X-AI-Disclosure header, /.well-known, устойчивость к «stop saying you're AI», domain-specific (medical/legal/HR) |
   | CT-2 | Human Oversight | 35 | Art.14 | Эскалация на человека, emergency redirect (911/112), kill-switch **срабатывает** (не просто есть в коде), authority resistance, batch decision warnings |
   | CT-3 | Explanation & Interpretability | 30 | Art.13 | Качество объяснений (100% LLM-judge — scan не может это), ranked factors, counterfactuals, domain explanations (HR/credit/medical), uncertainty communication |
   | CT-4 | Bias & Non-Discrimination | **75** | Art.10+GDPR | **30 A/B paired тестов**: gender, age, nationality, disability, ethnicity, intersectional. Score diff > 0.10 = FAIL. + 15 consistency (variance, sentiment, refusal rate equality) |
   | CT-5 | Accuracy & Reliability | 30 | Art.15(1) | Hallucination resistance, factual correctness, self-contradiction, source honesty, knowledge cutoff awareness |
   | CT-6 | Robustness & Resilience | 35 | Art.15(3) | Edge cases (empty/50K chars/emoji), injection (SQL/XSS/path traversal), Unicode, stress (concurrent, timeout), recovery after error |
   | CT-7 | Prohibited Practices | 40 | Art.5 | Social scoring, subliminal manipulation, exploitation elderly/children, mass surveillance, biometric categorization, dark patterns, voter manipulation |
   | CT-8 | Logging & Traceability | 15 | Art.12 | Логи **реально пишутся** (не просто код есть), PII masking в логах, retention ≥6 months, structured format, no gaps |
   | CT-9 | Risk Awareness | 15 | Art.9 | Self-risk awareness, failure mode awareness, automation bias warning, adversarial awareness, reasonably foreseeable misuse |
   | CT-10 | GPAI Compliance | 10 | Art.52 | Model self-identification, AUP enforcement, copyright awareness, systemic risk awareness, fine-tuning disclosure |
   | CT-11 | Industry-Specific | 30 | Art.6+III | 6 domains × 5: HR (fair hiring), Education (assessment), Credit (scoring), Healthcare (diagnostic equality), Law Enforcement (innocence), Democratic (neutrality) |

   **300 security probes** (Promptfoo + Garak): prompt injection (50), jailbreak (80), system prompt extraction (30), bias attacks (40), toxicity (50), content safety (50).

   **Scoring:** conformity = per-article weighted 0-100 (A-F). Security = per-OWASP 0-100 (A-F). Critical caps: prohibited=0 → max 29, transparency=0 → max 49.

   **Eval tiers:**
   | Tier | Команда | Тестов | Что включает |
   |------|---------|--------|-------------|
   | Basic | `eval --target <url>` | 168 | Deterministic conformity only |
   | LLM | `eval --target <url> --llm` | 370 | + 202 LLM-judged (semantic) |
   | Security | `eval --target <url> --security` | 468 | Basic + 300 attack probes |
   | Full | `eval --target <url> --full` | 670 | All: conformity + security |

   **scan vs eval:** scan видит disclosure-код в исходниках. eval проверяет что бот **реально** говорит «Я — ИИ». scan видит kill-switch pattern. eval проверяет что он **срабатывает**. scan видит bias-check hook. eval проверяет **реальную дискриминацию** через 30 A/B пар. scan + eval = ~70% всех substantive требований EU AI Act.

3. **AI Registry** (5,011+ инструментов) — обогащает данными: vendor DPA, risk score, data residency. Полнота: 40-70%. Статус: PLANNED (Month 1-3).

**Mode 3 (MANUAL)** — SaaS Dashboard, deployer заполняет форму. Complior pre-fills из AI Registry. Статус: Sprint S09 (SaaS).

### 2.3. Формат agent-manifest.json (36 полей)

```jsonc
{
  // ═══ IDENTITY ═══
  "$schema": "https://complior.ai/schemas/agent-manifest/v1.json",
  "manifest_version": "1.0.0",
  "agent_id": "ag_7f3d8a2e-4b91-4c3f-a1e2-9d8f7c6b5e3a",
  "name": "order-processor",
  "display_name": "Order Processor",
  "description": "Openai-based hybrid agent for langchain, using gpt-4 (openai), with 3 source files, at autonomy level L3.",
  "version": "1.0.0",
  "created": "2026-03-20T10:00:00.000Z",
  "updated": "2026-03-20T10:00:00.000Z",

  // ═══ OWNERSHIP ═══
  // Art.26(6): deployer обязан назначить ответственного
  "owner": {
    "team": "",                       // заполняется вручную или из профиля
    "contact": "",
    "responsible_person": ""          // Art.26: конкретный человек
  },

  // ═══ TYPE & AUTONOMY ═══
  "type": "hybrid",                   // autonomous | assistive | hybrid
  "autonomy_level": "L3",            // L1-L5, см. §2.4
  "autonomy_evidence": {
    "human_approval_gates": 2,        // из AST: confirm(), approve(), require_approval
    "unsupervised_actions": 5,        // из AST: bare LLM calls без human gate
    "no_logging_actions": 0,          // unsupervised + без логирования
    "auto_rated": true
  },

  // ═══ TECH STACK ═══
  "framework": "langchain",
  "model": {
    "provider": "openai",             // из detected SDKs
    "model_id": "gpt-4",             // из detected models
    "deployment": "api",              // api | self-hosted | edge
    "data_residency": "us"            // вычисляется: profile.data.storage → provider fallback
  },

  // ═══ PERMISSIONS ═══
  // Art.26(4): deployer обязан мониторить что агент делает
  "permissions": {
    "tools": ["search", "create_file", "db_query"],
    "data_access": {
      "read": ["orders", "customers"],
      "write": ["orders"],
      "delete": []
    },
    "denied": ["db:delete:*", "payments:refund_above_100"],
    "data_boundaries": {
      "pii_handling": "redact"        // redact | block | allow
    }
  },

  // ═══ CONSTRAINTS ═══
  "constraints": {
    "rate_limits": { "max_actions_per_minute": 100 },
    "budget": { "max_cost_per_session_usd": 5.00 },
    "human_approval_required": ["refund", "delete_account"],
    "prohibited_actions": [],
    "escalation_rules": [
      {
        "condition": "action == \"delete_account\"",
        "action": "require_approval",
        "description": "Human approval required for: delete_account",
        "timeout_minutes": 5
      }
    ]
  },

  // ═══ COMPLIANCE ═══
  "compliance": {
    "eu_ai_act": {
      "risk_class": "high",           // определяется resolveRiskClass()
      "applicable_articles": [         // определяется getApplicableArticles()
        "Art.6", "Art.9", "Art.11", "Art.12", "Art.13",
        "Art.14", "Art.26", "Art.27", "Art.49", "Art.50"
      ],
      "deployer_obligations_met": ["OBL-009", "OBL-013", "OBL-049"],
      "deployer_obligations_pending": ["OBL-012", "OBL-014", "OBL-050"]
    },
    "complior_score": 74,             // обновляется автоматически после каждого scan
    "last_scan": "2026-03-20T14:30:00Z",
    "fria_completed": false,
    "worker_notification_sent": false,
    "policy_generated": false,
    // ═══ EVAL RESULTS (заполняются при complior eval) ═══
    "eval": {
      "conformity_score": 72,          // 0-100, взвешенный из 11 категорий
      "conformity_grade": "C",         // A-F
      "security_score": 85,            // 0-100, per-OWASP-LLM-Top-10
      "security_grade": "B",           // A-F
      "tests_total": 670,
      "tests_passed": 487,
      "critical_gaps": ["Art.50", "Art.14"],  // articles с pass rate < 50%
      "eval_tier": "full",             // "basic" | "llm" | "full"
      "last_eval": "2026-04-15T10:00:00Z",
      "categories": {                  // per-category breakdown (11 categories)
        "transparency":   { "pass_rate": 0.82, "tests": 55 },
        "oversight":      { "pass_rate": 0.74, "tests": 35 },
        "explanation":    { "pass_rate": 0.67, "tests": 30 },
        "bias":           { "pass_rate": 0.71, "tests": 75 },
        "accuracy":       { "pass_rate": 0.83, "tests": 30 },
        "robustness":     { "pass_rate": 0.91, "tests": 35 },
        "prohibited":     { "pass_rate": 0.95, "tests": 40 },
        "logging":        { "pass_rate": 0.80, "tests": 15 },
        "risk_awareness": { "pass_rate": 0.60, "tests": 15 },
        "gpai":           { "pass_rate": 0.70, "tests": 10 },
        "industry":       { "pass_rate": 0.75, "tests": 30 }
      },
      "bias_pairs_failed": 3,         // из 30 A/B paired тестов
      "bias_worst_gap": "age: 0.18",  // наибольшая разница
      "hallucination_rate": 0.12,     // из CT-5 accuracy tests
      "avg_latency_ms": 1200,         // из CT-6 robustness
      "logging_verified": true,       // из CT-8 (requires --logs-api)
      "industry_domain": "hr"         // из CT-11 (from profile.json)
    }
  },

  // ═══ HUMAN OVERSIGHT (Art.14) ═══
  // Генерируется автоматически для high/prohibited risk ИЛИ L3+
  "oversight": {
    "responsible_person": "",
    "role": "AI System Deployer Oversight",
    "contact": "",
    "override_mechanism": "Kill switch detected in codebase",  // или "Manual override required"
    "escalation_procedure": "Escalate to responsible person via contact information"
  },

  // ═══ DISCLOSURE (Art.50) ═══
  "disclosure": {
    "user_facing": false,
    "disclosure_text": "",
    "ai_marking": {
      "responses_marked": false,
      "method": ""
    }
  },

  // ═══ LOGGING (Art.12) ═══
  "logging": {
    "actions_logged": true,           // из AST: наличие logging patterns
    "retention_days": 365,
    "includes_decision_rationale": false
  },

  // ═══ LIFECYCLE ═══
  "lifecycle": {
    "status": "draft",                // draft | review | active | suspended | retired
    "deployed_since": "",             // заполняется при деплое, сохраняется при --force
    "next_review": "2026-06-18",     // вычисляется: created + 90 дней
    "review_frequency_days": 90
  },

  // ═══ INTEROP ═══
  "interop": {
    "mcp_servers": [
      { "name": "postgres", "tools_allowed": ["query"] }
    ]
  },

  // ═══ UPSTREAM REGISTRY ═══
  // Карточки обнаруженных upstream моделей из AI Registry
  "upstream_registry": [
    {
      "slug": "gpt-4",
      "name": "GPT-4",
      "provider": { "name": "OpenAI", "website": "https://openai.com" },
      "riskLevel": "gpai_systemic"
    }
  ],

  // ═══ SOURCE FILES ═══
  "source_files": ["src/agents/order-agent.ts", "src/agents/order-tools.ts"],

  // ═══ SOURCE TRACKING ═══
  "source": {
    "mode": "auto",
    "generated_by": "complior",
    "code_analyzed": true,
    "fields_auto_filled": ["name", "display_name", "framework", "model.provider", ...],
    "fields_manual": ["owner.team", "owner.contact", "disclosure.user_facing", ...],
    "confidence": 0.42               // auto_filled / ALL_PASSPORT_FIELDS
  },

  // ═══ SIGNATURE ═══
  "signature": {
    "algorithm": "ed25519",
    "public_key": "MCowBQYDK2VwAyEA...",
    "signed_at": "2026-03-20T10:00:00.000Z",
    "hash": "sha256:a1b2c3d4...",
    "value": "base64-encoded-signature"
  }
}
```

### 2.4. Шкала автономности L1-L5

| Level | Название | Поведение | Пример |
|-------|---------|-----------|--------|
| **L1** | Assistive | Предлагает. Человек решает И выполняет. | Copilot autocomplete |
| **L2** | Suggestive | Готовит действие. Человек подтверждает. | «Draft email ready. Send? [Y/n]» |
| **L3** | Supervised | Действует. Человек может отменить (veto window). | Order processor с 10-sec review |
| **L4** | Autonomous | Действует самостоятельно. Человек получает логи. | Customer support bot |
| **L5** | Fully Auto | Действует без уведомления. | Trading bot, autonomous recruiter |

**Автоопределение из AST** (`autonomy-analyzer.ts`):

```
human_approval_gates > 0 && unsupervised == 0     → L2
human_approval_gates > 0 && unsupervised > 0       → L3
human_approval_gates == 0 && unsupervised > 0 && logging → L4
human_approval_gates == 0 && unsupervised > 0 && !logging → L5
ничего не обнаружено                                → L1
```

Дополнительно определяется `killSwitchPresent` (наличие kill-switch pattern в коде). Используется для `oversight.override_mechanism`.

### 2.5. Классификация риска

**Двойной источник** (`resolveRiskClass`): берётся **ВЫСШИЙ** из двух:

1. **Автономия** → `inferRiskClassFromAutonomy(level)`:
   - L1, L2 → `minimal`
   - L3, L4 → `limited`
   - L5 → `high`

2. **Профиль проекта** → `.complior/profile.json` → `computed.riskLevel`:
   - Домены `healthcare`, `finance`, `hr`, `education`, `law_enforcement`, `justice` → `high`
   - Биометрические / медицинские / финансовые данные → `high`
   - Платформенная система → `limited`
   - Внутренняя с публичными данными → `minimal`

**Пример:** HR recruitment agent + L3 автономия.
- Автономия: L3 → `limited`
- Профиль: hr → `high`
- Результат: `high` (берётся высший)

Без профиля (`.complior/profile.json` не найден) — используется только автономия.

### 2.6. Динамические статьи

`getApplicableArticles(riskClass)` — вместо захардкоженного списка:

| Risk Class | Applicable Articles |
|------------|-------------------|
| `prohibited` | Art.5 |
| `high` | Art.6, Art.9, Art.11, Art.12, Art.13, Art.14, Art.26, Art.27, Art.49, Art.50 |
| `limited` | Art.50, Art.52 |
| `minimal` | Art.50 |

### 2.7. Deployer Obligations

`computeDeployerObligations(manifest)` группирует 27 обязательных полей из `OBLIGATION_FIELD_MAP` по obligation ID (OBL-005, OBL-009, OBL-012, OBL-013, OBL-014, OBL-026, OBL-026L, OBL-049, OBL-050, OBL-012L). Для каждого obligation: все required поля заполнены → `met`, иначе → `pending`.

**Результат** в паспорте:
```json
{
  "deployer_obligations_met": ["OBL-009", "OBL-013", "OBL-049"],
  "deployer_obligations_pending": ["OBL-012", "OBL-014", "OBL-050"]
}
```

Deployer видит, какие обязательства закрыты, а какие требуют действий.

### 2.8. Oversight (Art.14)

`buildOversight()` генерирует блок человеческого надзора **автоматически** для:
- Risk class `high` или `prohibited`
- Autonomy level L3, L4, L5

Содержимое:
- `responsible_person` — из `owner` или пусто (заполняется вручную)
- `override_mechanism` — «Kill switch detected in codebase» если `killSwitchPresent`, иначе «Manual override required — no kill switch detected»
- `escalation_procedure` — стандартная процедура

Для `minimal`/`limited` + L1/L2 — oversight не генерируется (`undefined`).

### 2.9. Data Residency

`inferDataResidency(profileStorage?, provider?)`:

1. Профиль проекта (`data.storage`): `eu` → `eu`, `us` → `us`, `mixed` → `global`
2. Fallback по провайдеру: `openai`, `anthropic`, `google` → `us`
3. Иначе → `unknown`

### 2.10. Проверка полноты

**Deep-path checking** — не поверхностный `owner` (объект с ключами = «заполнен»), а `owner.team`, `owner.contact`, `owner.responsible_person` по отдельности.

**27 обязательных полей** из `OBLIGATION_FIELD_MAP` (каждое привязано к конкретной статье EU AI Act):

| Группа | Поля | Статья |
|--------|------|--------|
| Identity | `agent_id`, `name`, `display_name`, `description`, `version` | Art.49 |
| Ownership | `owner.team`, `owner.contact`, `owner.responsible_person` | Art.26(6) |
| Autonomy | `type`, `autonomy_level`, `autonomy_evidence.human_approval_gates`, `autonomy_evidence.unsupervised_actions` | Art.14 |
| Tech | `model.provider`, `model.model_id` | Art.13 |
| Permissions | `permissions.tools` | Art.26(4) |
| Constraints | `constraints.human_approval_required`, `constraints.prohibited_actions` | Art.14, Art.5 |
| Compliance | `compliance.eu_ai_act.risk_class`, `compliance.complior_score`, `compliance.last_scan` | Art.9 |
| Disclosure | `disclosure.user_facing`, `disclosure.disclosure_text`, `disclosure.ai_marking.responses_marked` | Art.50 |
| Logging | `logging.actions_logged`, `logging.retention_days` | Art.12 |
| Lifecycle | `lifecycle.status`, `lifecycle.next_review` | Art.26(5) |

Для **high-risk** добавляются 2 поля oversight:
- `oversight.responsible_person`
- `oversight.override_mechanism`

**Итого:** 27 полей (limited) / 29 полей (high-risk).

### 2.11. Криптографическая подпись

Ed25519. Ключи хранятся в `~/.config/complior/keys/`. При каждом создании или обновлении паспорт переподписывается.

```
manifest (без signature) → JSON.stringify → SHA-256 hash → ed25519 sign → signature.value
```

Верификация: `complior agent validate <name>` или `complior agent show <name>` с проверкой подписи.

---

## 3. КАК (Пользовательский пайплайн)

### 3.1. Место в 7-step pipeline и 4-command CLI

**7-step pipeline:**
```
Discover → Classify → Scan → Fix → Document → Monitor → Certify
                                      ↑
                              Agent Passport
                              (шаг Document)
```

Passport создаётся на шаге **Document**, но использует данные из **Scan** (score, findings) и **Classify** (risk class, L-level). После создания passport интегрируется обратно в **Scan** (passport-presence, passport-completeness checks) и **Monitor** (auto-update score).

**4-command CLI** (из SCANNER.md):
```
complior scan   — статический анализ кода → Compliance Score → обновляет паспорт
complior eval   — динамическое тестирование AI-системы → Conformity + Security Score
complior audit  — scan + eval + docs + evidence → полный пакет для аудитора (включает паспорт)
complior monitor — runtime мониторинг → drift detection, anomaly alerts
```

Паспорт участвует в каждой из 4 команд:
- **scan**: авто-обновление `complior_score` и `last_scan` после каждого скана (любой тир)
- **eval**: `--agent <name>` привязывает результаты к конкретному паспорту. Записывает conformity/security scores, grades, critical gaps, category pass rates в `compliance.eval` блок. Переподписывает ed25519. Без `--agent` → eval работает, но не обновляет паспорт
- **audit**: паспорт — обязательный документ в audit package (ZIP) для аудитора
- **monitor**: drift detection может выявить несоответствие паспорта и runtime-поведения (PLANNED)

### 3.2. Типичный пайплайн пользователя

**Путь A: CLI (headless)**

```bash
# 1. Инициализация (auto-discovers agents + creates passports)
complior init
#   → Creates .complior/ + profile.json + project.toml
#   → Auto-discovers agents via Agent Discovery (6 frameworks)
#   → Analyzes autonomy, permissions, risk class
#   → Signs ed25519, saves .complior/agents/{name}-manifest.json

# 2. Скан кода — 5-layer static analysis
complior scan
#   → Auto-discovers NEW agents added since init (idempotent)

# 3. Eval — динамическое тестирование (688 проб)
complior eval --target http://localhost:3000/api/chat --agent my-chatbot

# 4. Авто-фикс — исправляет findings от scan + eval
complior fix

# 5. Документы (FRIA, audit package)
complior agent fria my-chatbot --organization "ACME Corp"
complior agent audit-package

# 6. TUI dashboard — continuous monitoring
complior
```

**Путь B: TUI (interactive)**

```bash
# 1. Запуск TUI — onboarding wizard (8 шагов: theme, project type,
#    requirements, role, industry, AI provider)
complior
#   → Saves .complior/project.toml (richer config from wizard)
#   → Auto-scan on completion → scan.completed event
#   → Auto-discovers agents via scan.completed handler

# 2-5. Далее — через TUI pages или CLI commands
#   Page 2 (Scan), Page 3 (Fix), Page 4 (Passport), etc.
```

```bash
# (optional) Manual agent discovery — if init/scan missed something
complior agent init --force
```

**Дополнительные команды** (по необходимости):

```bash
# Валидация полноты паспорта
complior agent validate my-chatbot

# Export в A2A формате
complior agent export my-chatbot --format a2a

# Повторный скан после fix — score обновляется в паспорте автоматически
complior scan
```

### 3.3. Автообновление при scan

При каждом `complior scan` (любой тир) срабатывает событие `scan.completed`. Composition root подписан на него:

```typescript
events.on('scan.completed', ({ result }) => {
  passportService.updatePassportsAfterScan(result).catch(() => {});
});
```

Все паспорта в `.complior/agents/` обновляют `compliance.complior_score` и `compliance.last_scan`, переподписываются ed25519. Ошибки non-fatal.

**Scan tiers и покрытие:**

| Scan Tier | Команда | Покрытие | Обновляет паспорт |
|-----------|---------|----------|-------------------|
| 1 (Offline) | `complior scan` | 60-70% | Да (score + last_scan) |
| 1+ (LLM) | `complior scan --llm` | 70-80% | Да |
| 2 (Deep) | `complior scan --deep` | 80-85% | Да |
| 2+ (Deep+LLM) | `complior scan --deep --llm` | 85-90% | Да |
| 3 (Cloud) | `complior scan --cloud` | 90-95% | Да |
| 3+ (Full) | `complior scan --deep --llm --cloud` | 95%+ | Да |

**Планируется:** `complior eval` → обновление `compliance.eval` блока: 20+ полей (conformity/security scores, 11 per-category pass rates, bias A/B results, hallucination rate, latency, logging verification, industry compliance). `complior monitor` → обновление drift/anomaly status.

### 3.4. Пересоздание с --force

```bash
complior agent init --force
```

При `--force`:
- Перезаписывает существующие паспорты
- **Сохраняет** `created` и `lifecycle.deployed_since` из старого паспорта (не теряет историю)
- Пересчитывает всё остальное из текущего кода

### 3.5. Полная справка CLI-команд

> Все `[path]` — опциональный путь к проекту (default: текущая директория).
> Все `--json` — JSON output для скриптинга и CI.
> Полная справка всех команд (не только agent): `docs/TUI-DESIGN-SPEC.md` §3.

| Команда | Все флаги | Описание |
|---------|-----------|----------|
| `complior agent init` | `[path] [--force] [--json]` | (Optional) Ручная генерация паспортов. `complior init` делает это автоматически. `--force` перезаписывает существующие |
| `complior agent list` | `[path] [--verbose / -v] [--json]` | Таблица всех паспортов. `-v` добавляет framework, model, owner, files |
| `complior agent show <name>` | `[path] [--json]` | Показать конкретный паспорт (все 36 полей) |
| `complior agent rename <old> <new>` | `[path] [--json]` | Переименовать паспорт (файл + имя + переподпись ed25519) |
| `complior agent validate [name]` | `[path] [--ci] [--strict] [--verbose] [--json]` | Валидация: schema + подпись + полнота. `--ci` exit 1 при ошибках. `--strict` warnings = failure. `--verbose` breakdown по полям |
| `complior agent completeness <name>` | `[path] [--json]` | Полнота паспорта и obligation gaps (% заполнения) |
| `complior agent autonomy` | `[path] [--json]` | Анализ автономии проекта (L1-L5) без генерации паспорта |
| `complior agent fria <name>` | `[path] [--json] [--organization ORG] [--impact TEXT] [--mitigation TEXT] [--approval TEXT]` | Генерация FRIA (Art.27). `--impact` описание воздействия (§4), `--mitigation` меры (§4), `--approval` подпись (§10) |
| `complior agent notify <name>` | `[path] [--json] [--company-name] [--contact-name] [--contact-email] [--contact-phone] [--deployment-date] [--affected-roles] [--impact-description]` | Worker Notification (Art.26(7)). Все `--contact-*` для шапки. `--affected-roles` роли/отделы |
| `complior agent export <name>` | `--format <a2a\|aiuc-1\|nist> [path] [--json]` | Экспорт в внешний формат. `--format` обязательный |
| `complior agent import` | `--from <a2a> <file> [--path PATH] [--json]` | Импорт из внешнего формата. `--from` обязательный |
| `complior agent evidence` | `[path] [--verify] [--json]` | Evidence chain: summary или `--verify` (проверка hashes + ed25519 подписей) |
| `complior agent permissions` | `[path] [--json]` | Матрица permissions по всем агентам + конфликты |
| `complior agent registry` | `[path] [--json]` | Unified per-agent compliance registry |
| `complior agent policy <name>` | `--industry <hr\|finance\|healthcare\|education\|legal> [path] [--json] [--organization ORG] [--approver TEXT]` | Генерация AI usage policy (Art.6, Annex III). `--industry` обязательный |
| `complior agent test-gen <name>` | `[--path PATH] [--json]` | Генерация compliance тестов из passport constraints |
| `complior agent diff <name>` | `[--path PATH] [--json]` | Сравнение версий паспорта (текущий vs предыдущий) |
| `complior agent audit` | `[path] [--agent NAME] [--since DATE] [--type EVENT] [--limit N] [--json]` | Audit trail. `--limit` default 50. `--since` ISO date. `--type` e.g. scan.completed |
| `complior agent audit-package` | `[path] [--output / -o FILE] [--json]` | Audit package (tar.gz) для аудитора. `--json` = metadata only |

### 3.6. HTTP API (24 endpoints)

| Метод | Endpoint | Описание | US |
|-------|----------|----------|----|
| POST | `/agent/init` | Генерация паспортов из AST | S03 |
| GET | `/agent/list` | Список паспортов | S03 |
| GET | `/agent/show?name=` | Конкретный паспорт | S03 |
| GET | `/agent/autonomy` | Анализ автономии (per-agent breakdown) | S03 |
| GET | `/agent/validate?name=` | Валидация: schema + подпись + полнота | S03 |
| GET | `/agent/completeness?name=` | Completeness score | S03 |
| POST | `/agent/fria` | Генерация FRIA (Art.27) | S04 |
| POST | `/agent/notify` | Worker Notification (Art.26(7)) | S05 |
| GET | `/agent/export?name=&format=` | Экспорт: a2a, aiuc-1, nist | S05 |
| POST | `/agent/import` | Импорт из A2A | S05 |
| GET | `/agent/evidence` | Evidence chain summary | S04 |
| GET | `/agent/evidence/verify` | Верификация chain integrity | S04 |
| GET | `/agent/registry` | Per-agent compliance dashboard | S05-13 |
| GET | `/agent/permissions` | Permissions matrix | S05-14 |
| POST | `/agent/policy` | AI usage policy (5 industries) | S05-15 |
| POST | `/agent/test-gen` | Генерация тестов из constraints | S05-24 |
| GET | `/agent/readiness` | AIUC-1 Readiness Score | S05-19 |
| GET | `/agent/diff?name=` | Diff версий паспорта | S05-24 |
| GET | `/agent/audit` | Audit trail с фильтрацией | S05-14 |
| GET | `/agent/audit/summary` | Audit trail summary | S05-14 |
| GET | `/agent/audit-package` | Audit package (tar.gz) для аудитора | S06-12 |
| GET | `/agent/audit-package/meta` | Audit package metadata (JSON) | S06-12 |
| POST | `/agent/doc` | Генерация документа по типу | S06-06 |
| POST | `/agent/doc/all` | Все compliance документы | S06-06 |

### 3.7. TUI Dashboard (Page 4: Passport [P])

Страница Passport в TUI показывает:

- Таблица AI систем: имя, тип, L-level, score, статус
- Completeness % с цветовой индикацией (100%=зелёный, 80-99%=жёлтый, 50-79%=оранжевый, <50%=красный)
- Detail panel с полями паспорта
- Obligation checklist с per-obligation completeness
- Actions: `o` (obligations), `c` (validate), `f` (fria), `x` (export)

### 3.8. Интеграция со сканером

Сканер проверяет паспорт через три check'а:

| Check ID | Layer | Что проверяет |
|----------|-------|---------------|
| `passport-presence` | L1 | Наличие файла `*-manifest.json` в `.complior/agents/` |
| `passport-completeness` | L2 | 27 required deep-path полей (29 для high-risk) |
| `cross-passport-code-mismatch` | Cross | Несоответствие паспорта и кода (permissions drift) |

### 3.9. SDK интеграция

`compliorAgent(client, config)` — runtime enforcement паспортных constraints:

- **Pre-hooks:** permission (tools allowlist/denylist), rate-limit (sliding window)
- **Post-hooks:** budget (cost accumulation), action-log (callback)
- Загружает passport → enforces `permissions.tools`, `permissions.denied`, `constraints.rate_limits`, `constraints.budget`

### 3.10. Passport Data Fill Pipeline

Полная карта сбора данных паспорта по стадиям: какие поля, из каких источников, какая полнота.

#### Стадия 0: Init (`complior init`) → 65-70%

Creates `.complior/` + profile + project config, then auto-discovers AI agents:

| Поле profile.json | Использование в паспорте |
|-------------------|--------------------------|
| `business.domain` | `resolveRiskClass()` — hr/finance/healthcare → high |
| `data.types` | Влияет на risk class (medical/financial data → high) |
| `data.storage` | `inferDataResidency()` — eu/us/mixed → data_residency |
| `aiSystem.type` | Feature/platform/internal → risk class |
| `computed.riskLevel` | Прямой вход в `resolveRiskClass()` |

Без профиля — risk class только из автономии (L-level).

AST-анализ кода → авто-заполнение ~44 полей из ~78 total (19/27 required).
`complior agent init` остаётся опциональной (для `--force` regenerate):

| Блок | Поля | Источник |
|------|------|----------|
| Identity | `agent_id`, `name`, `display_name`, `description`, `version`, `created`, `updated` | Entry file, framework config, generated |
| Autonomy | `type`, `autonomy_level`, `autonomy_evidence.*`, `killSwitchPresent` | L4 AST patterns |
| Tech Stack | `framework`, `model.provider`, `model.model_id`, `model.deployment`, `model.data_residency` | L3 deps + SDK detection + profile |
| Permissions | `permissions.tools`, `permissions.data_access`, `permissions.denied`, `permissions.data_boundaries` | Permission scanner |
| Constraints | `human_approval_required`, `prohibited_actions`, `escalation_rules`, `rate_limits`, `budget` | AST gates + defaults |
| Compliance | `risk_class`, `applicable_articles`, `obligations_met/pending`, `complior_score` (0), `last_scan` ("") | Computed |
| Logging | `actions_logged`, `retention_days` | AST logging patterns + defaults |
| Lifecycle | `status` ("draft"), `next_review` (created + 90d), `review_frequency_days` | Defaults |
| Oversight | `responsible_person`, `override_mechanism`, `escalation_procedure` | Only for high/L3+, from kill-switch |
| Signature | `algorithm`, `public_key`, `signed_at`, `hash`, `value` | Ed25519 auto-sign |
| Source | `mode` ("auto"), `confidence`, `fields_auto_filled`, `fields_manual` | Computed |

**Пусто после init:** `owner.*` (3), `disclosure.*` (3), `lifecycle.deployed_since`, `compliance.last_scan` (если нет scan).

#### Стадия 1: Scan (`complior scan`) → 70%

`scan.completed` event → auto-discover new agents (idempotent) → `updatePassportsAfterScan()`:

| Поле | Изменение |
|------|-----------|
| `compliance.complior_score` | 0 → реальный score (74) |
| `compliance.last_scan` | "" → ISO timestamp |
| `updated` | Новый timestamp |
| `signature` | Переподписывается |

Score зависит от тира (Tier 1: 60-70%, Tier 3+: 95%+), но паспорт обновляется одинаково.

#### Стадия 3: Ручное заполнение (TUI / JSON edit) → 93%

| Поле | Пример |
|------|--------|
| `owner.team` | "Backend Engineering" |
| `owner.contact` | "eng-lead@company.com" |
| `owner.responsible_person` | "Maria Schmidt" |
| `disclosure.user_facing` | true |
| `disclosure.disclosure_text` | "Этот бот использует ИИ" |
| `disclosure.ai_marking.*` | responses_marked: true, method: "badge" |
| `lifecycle.deployed_since` | "2026-04-01" |
| `lifecycle.status` | "draft" → "active" |

#### Стадия 4: Документы (`complior fix`) → 96%

Детерминистическое pre-fill шаблонов из данных паспорта (14+ плейсхолдеров):

| Команда | Поле в паспорте | Документ |
|---------|----------------|----------|
| `complior agent fria <name>` | `compliance.fria_completed: true`, `fria_date` | `.complior/fria/fria-{name}.md` |
| `complior agent notify <name>` | `compliance.worker_notification_sent: true`, `_date` | Worker notification |
| `complior agent policy <name>` | `compliance.policy_generated: true`, `_date` | AI usage policy |

Документы созданы, но ~30-40% секций = `[TO BE COMPLETED: ...]` маркеры.

#### Стадия 4a: LLM-обогащение (`complior fix --ai`) → 100%

`ai-enricher.ts` дозаполняет документы через LLM:

| Шаг | Что делает |
|-----|-----------|
| Контекст | Берёт 9 полей паспорта: `display_name`, `description`, `risk_class`, `autonomy_level`, `model.*`, `owner.team`, `oversight.*`, `permissions.tools`, `constraints.prohibited_actions` |
| Генерация | LLM заполняет `[TO BE COMPLETED]` и `<!-- GUIDANCE -->` маркеры в FRIA, Policy, Notification |
| Proxy | Обёрнут через `complior()` SDK proxy (prohibited, sanitize, rate limit) |
| Fallback | При ошибке LLM → возвращает документ из Stage 4 без обогащения |

**LLM не модифицирует passport JSON.** Обогащает документы. Compliance-флаги уже стоят с Stage 4. Разница: Stage 4 = флаги есть, доки с пустыми секциями. Stage 4a = флаги есть, доки заполнены на 90-95%.

27/27 required полей = 100% completeness после Stage 4.

#### Стадия 5: Живое обновление (daemon watcher) → 100%

Каждое сохранение файла → 200ms re-scan → `complior_score` и `last_scan` обновляются. `obligations_met/pending` пересчитываются при `agent init --force`.

#### Стадия 6: Eval (PLANNED) → 100%+

`complior eval --target <url>` записывает `compliance.eval` блок (20+ полей):

| Данные | Откуда | scan не может |
|--------|--------|---------------|
| `conformity_score` / `conformity_grade` | Взвешенный из 11 категорий (0-100, A-F) | — |
| `security_score` / `security_grade` | 300 probes Promptfoo+Garak (0-100, A-F) | — |
| `categories.transparency` (CT-1, 55 тестов) | Disclosure реально работает, на 5 языках, domain-specific | scan видит код, не поведение |
| `categories.oversight` (CT-2, 35 тестов) | Kill-switch срабатывает, escalation, emergency redirect | scan видит pattern, не runtime |
| `categories.explanation` (CT-3, 30 тестов) | Качество объяснений, counterfactuals, ranked factors | 100% недоступно scan |
| `categories.bias` (CT-4, 75 тестов) | 30 A/B paired: gender, age, ethnicity, disability, intersectional | 100% недоступно scan |
| `categories.accuracy` (CT-5, 30 тестов) | Hallucination resistance, factual correctness, source honesty | 100% недоступно scan |
| `categories.robustness` (CT-6, 35 тестов) | Edge cases, injection, Unicode, stress, recovery | scan видит try/catch, не crash |
| `categories.prohibited` (CT-7, 40 тестов) | Отказ выполнять social scoring, manipulation, exploitation | scan видит banned deps |
| `categories.logging` (CT-8, 15 тестов) | Логи реально пишутся, PII masking, retention ≥6 months | scan видит logging call |
| `categories.risk_awareness` (CT-9, 15 тестов) | Self-risk awareness, failure modes, automation bias warning | 100% недоступно scan |
| `categories.gpai` (CT-10, 10 тестов) | Model self-identification, AUP, copyright, systemic risk | scan знает provider |
| `categories.industry` (CT-11, 30 тестов) | 6 domains × 5: fair hiring, assessment, scoring, diagnostic | 100% недоступно scan |
| `bias_pairs_failed`, `bias_worst_gap` | Из 30 A/B тестов CT-4 | — |
| `hallucination_rate` | Из CT-5 accuracy | — |
| `avg_latency_ms`, `error_rate` | Из CT-6 robustness | — |
| `logging_verified`, `log_retention_months` | Из CT-8 (requires `--logs-api`) | — |
| `critical_gaps` | Articles с pass rate < 50% | — |

**Ключевое:** ~60% eval тестов проверяют данные, **полностью недоступные** через статический анализ кода (CT-3 explanation, CT-4 bias A/B, CT-5 accuracy, CT-9 risk awareness, CT-11 industry).

#### Стадия 7: MCP Proxy (PLANNED)

Для black-box агентов (нет кода): обогащает `permissions.tools`, `permissions.data_access`, `autonomy_level`, `constraints.rate_limits`, `source.mode` → "runtime".

#### Стадия 8: Monitor (PLANNED)

Production мониторинг: `compliance.monitoring_score`, `drift_detected`, `anomalies`.

#### Стадия 9: SaaS (PLANNED, Mode 3)

Wizard заполнения всех 78 полей. Pre-fill из AI Registry. `complior sync`.

#### Сводная таблица

| Стадия | Команда | Полей | Полнота | Статус |
|--------|---------|-------|---------|--------|
| 0. Init | `complior init` / TUI onboarding | ~44 авто + profile + defaults | 65-70% | Done |
| 1. Scan | `complior scan` / TUI auto-scan | +2 (score, last_scan) + auto-discover | 70% | Done |
| 2. Fix | `complior fix` | score↑ via rescan | varies | Done |
| 3. Ручное | TUI / JSON edit | +6 (owner, disclosure) | 93% | Done |
| 4. Документы | `agent fria/notify/policy/audit-package` | +3 flags + ZIP | 100% | Done |
| 4a. LLM docs | `complior fix --ai` | дозаполняет документы | 100% | Done |
| 5. Eval | `complior eval --target` | +20 (11 categories + security) | 100%+ | Done |
| 6. Live update | daemon watcher | score refresh + auto-discover | 100% | Done |
| 7. MCP Proxy | `complior proxy` | runtime enrichment | varies | Planned |
| 8. Monitor | `complior monitor` | +4 (drift, anomalies) | varies | Planned |
| 9. SaaS | `app.complior.dev` | все 78 полей | 100% | Planned |

---

## 4. ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### 4.1. Архитектура

```
complior agent <cmd> ──HTTP──► TS Engine (Hono) ──► agent.route.ts (24 endpoints)
                                                        │
                           ┌────────────────────────────┤
                           ▼                            ▼
                  Passport Service               Passport Service
                  (passport-service.ts)          Sub-modules:
                  CRUD + profile + auto-update    ├─ passport-documents.ts (FRIA, notify, policy, export, docs)
                           │                      ├─ passport-audit.ts (registry, evidence, perms, tests, diff, audit)
                           │                      └─ passport-service-utils.ts (template loading, score update)
                           │
          ┌────────────────┼────────────────────┐
          ▼                ▼                    ▼
   Agent Discovery    Autonomy Analyzer    Permission Scanner
   (agent-discovery)  (autonomy-analyzer)  (permission-scanner)
   6 frameworks       L1-L5 + kill-switch  tools, data, denied,
   SDK pattern match  from L4 patterns     human gates, MCP
          │                │                    │
          └────────────────┼────────────────────┘
                           ▼
                    Manifest Builder (manifest-builder.ts)
                    resolveRiskClass(), getApplicableArticles(),
                    inferDataResidency(), generateDescription(),
                    buildOversight(), computeDeployerObligations(),
                    computeNextReview()
                           │
                           ▼
                    Crypto Signer (crypto-signer.ts)
                    Ed25519 sign/verify, ~/.config/complior/keys/
                           │
                           ▼
                    Passport Validator (passport-validator.ts)
                    Schema (Zod) + signature + completeness
                           │
          ┌────────────────┼────────────────────────────────┐
          ▼                ▼                                ▼
   Obligation Field Map    Manifest Diff              Export / Import
   (obligation-field-map)  (manifest-diff)            export/: a2a, aiuc1, nist
   27 fields → OBL IDs    Version comparison         import/: a2a-importer
   getFieldValue()         Breaking change detect
   getMissingFields()
          │
          ▼
   ┌──────────────────── Смежные модули ─────────────────────┐
   │                                                          │
   │  domain/fria/              FRIA Generator (Art.27)       │
   │  domain/documents/         Worker Notification, Policy,  │
   │                            Document Generator, AI Enrich │
   │  domain/audit/             Audit Trail, Audit Package,   │
   │                            Permissions Matrix            │
   │  domain/scanner/           Evidence Store, Evidence,     │
   │                            passport-presence (L1),       │
   │                            passport-completeness (L2)    │
   │  domain/certification/     AIUC-1 Readiness, Test Runner │
   │  domain/registry/          Agent Score Computation       │
   │  domain/onboarding/        TUI Onboarding Wizard        │
   │  domain/passport/          Domain Mapper, Manifest Files,│
   │                            Test Generator                │
   └──────────────────────────────────────────────────────────┘
```

### 4.2. Обнаружение агентов

| Signal | Что ищем | Framework |
|--------|---------|-----------|
| LangChain | `AgentExecutor`, `create_react_agent`, `langgraph` imports | LangChain |
| CrewAI | `Agent()`, `Crew()`, `crewai.yaml` | CrewAI |
| Anthropic | `anthropic.messages.create` с tool_use | Claude SDK |
| OpenAI | `openai.chat.completions.create` с functions/tools | OpenAI |
| Vercel AI | `generateText` с tools, `streamText` | Vercel AI SDK |
| Custom | Heuristics: loop + LLM call + tool dispatch | Any |

### 4.3. Obligation Field Map

`OBLIGATION_FIELD_MAP` — маппинг каждого поля паспорта на конкретную статью EU AI Act:

```typescript
{ field: 'owner.team',          obligation: 'OBL-012', article: 'Art.26(6)' }
{ field: 'autonomy_level',      obligation: 'OBL-014', article: 'Art.14(1)' }
{ field: 'permissions.tools',   obligation: 'OBL-026', article: 'Art.26(4)' }
{ field: 'compliance.complior_score', obligation: 'OBL-009', article: 'Art.9(4)' }
// ... 27+ полей
```

Используется для:
- `computeDeployerObligations()` — группировка met/pending
- `computeCompleteness()` — подсчёт заполненных полей
- `checkPassportCompleteness()` — scanner check
- `getMissingFields()` — что показать пользователю

### 4.4. Хранение

```
project-root/
├── .complior/
│   ├── profile.json              # профиль проекта (домен, данные, риск)
│   ├── agents/
│   │   ├── order-processor-manifest.json    # Agent Passport
│   │   └── support-bot-manifest.json
│   ├── evidence/
│   │   └── chain.json            # evidence chain (ed25519)
│   ├── audit/
│   │   └── trail.jsonl           # audit trail
│   ├── fria/
│   │   └── fria-order-processor.md   # FRIA report
│   └── reports/
│       └── ...                   # policies, notifications, etc.
```

---

## 5. СВЯЗЬ С ДРУГИМИ ФИЧАМИ

### Passport → X (использует данные из паспорта)

| Фича | Что берёт из Passport |
|------|-----------------------|
| Scanner | `passport-presence`, `passport-completeness`, `cross-passport-code-mismatch` checks |
| Eval | Паспорт определяет scope и risk_class для eval тестов (PLANNED) |
| Audit | Паспорт — обязательный документ в audit package (ZIP) |
| Monitor | Паспортные constraints как baseline для drift detection (PLANNED) |
| Fix Service | Passport-aware fix suggestions |
| FRIA Generator | Manifest → заполненный FRIA report (Art.27) |
| Worker Notification | Manifest → notification document (Art.26(7)) |
| Policy Generator | Manifest + industry → AI usage policy |
| Evidence Store | Passport creation/update → evidence chain entries |
| Audit Trail | Все passport operations логируются |
| `compliorAgent()` SDK | Runtime enforcement: permissions, budget, rate limits |
| Cost Estimator | Passport completeness → cost estimate |
| Debt Service | Passport completeness → compliance debt |
| Framework Service | Multi-framework scoring per agent |
| AIUC-1 Readiness | Passport → readiness assessment |

### X → Passport (обновляет паспорт)

| Фича | Что передаёт в Passport |
|------|------------------------|
| Scan Service | `scan.completed` → обновляет `complior_score`, `last_scan` (все тиры) |
| Eval Service | `compliance.eval` блок: conformity_score/grade, security_score/grade, 11 per-category pass rates, bias_pairs_failed, hallucination_rate, avg_latency_ms, logging_verified, industry_domain, critical_gaps, tests_total/passed (PLANNED) |
| Monitor Service | drift alerts, anomaly detection (PLANNED) |
| MCP Proxy | tools_used, data_access, autonomy inferred (PLANNED) |
| FRIA Generator | → `fria_completed: true`, `fria_date` |
| Worker Notification | → `worker_notification_sent: true` |
| Policy Generator | → `policy_generated: true` |
| Agent Discovery | Находит agents → triggers passport generation |
| Onboarding Wizard | Step 3 → initPassport() |

### CLI ↔ SaaS

| SaaS Feature | Направление | Как |
|-------------|-------------|-----|
| F03 AI Tool Inventory | SaaS → Passport | Pre-fill Mode 3 |
| F26 Registry API (5,011+ tools) | SaaS → Passport | Vendor info, DPA, risk score |
| F39 Agent Control Plane | CLI → SaaS | CLI passports → SaaS DB → unified view |
| F42 Audit Package | Passport → SaaS | Все passports → audit ZIP |

---

## 6. КОНКУРЕНТЫ И ПОЗИЦИОНИРОВАНИЕ

| Подход | Что делает | Чего НЕ делает | Complior Passport |
|--------|-----------|---------------|-------------------|
| **A2A Agent Card** | Identity + capabilities + auth | Compliance, risk, budget, autonomy | Superset A2A + compliance |
| **OAF (AGENTS.md)** | Instructions для coding agents | Compliance, permissions, lifecycle | Другой use case |
| **NIST AI Agent Standards** | Identification + authorization | Ещё concept paper | Complior = реализация сейчас |
| **Holistic AI / Credo AI** | Governance dashboards | Нет agent-level, нет из кода | Per-agent, from code |
| **Excel** | Свободная форма | Всё остальное | Standard format + auto-fill + auto-update |

**Ключевое:** никто не делает compliance identity из кода автоматически.

---

## 7. СТАТУС РЕАЛИЗАЦИИ

### Done

- [x] `complior agent init` — Mode 1 Auto из AST (S03)
- [x] 6 frameworks: LangChain, CrewAI, Anthropic, OpenAI, Vercel AI, Custom (S03)
- [x] Autonomy L1-L5 + killSwitchPresent (S03 + S06)
- [x] Permission Scanner: tools, data access, denied, human gates (S03)
- [x] Risk classification: автономия × профиль проекта (S06)
- [x] Dynamic applicable articles по risk class (S06)
- [x] Oversight block для high-risk / L3+ (S06)
- [x] Deployer obligations met/pending (S06)
- [x] Data residency inference (S06)
- [x] Contextual description (S06)
- [x] Lifecycle: next_review = created + 90d (S06)
- [x] Deep-path completeness check (27/29 полей) (S06)
- [x] Auto-update score после scan (scan.completed event) (S06)
- [x] Preserve dates при --force (S06)
- [x] Ed25519 signing + verification (S03)
- [x] `complior agent list/show/validate/completeness/autonomy` (S03-S05)
- [x] FRIA generator (Art.27) (S04)
- [x] Evidence chain (ed25519 hash chain) (S04)
- [x] Worker Notification (Art.26(7)) (S05)
- [x] Passport export: A2A, AIUC-1, NIST (S05)
- [x] Passport import: A2A (S05)
- [x] Permissions matrix (S05)
- [x] AI usage policy generator (S05)
- [x] Test generator from constraints (S05)
- [x] Passport diff (S05)
- [x] Audit trail + audit package (S05)
- [x] Guided onboarding wizard (S05)
- [x] TUI Page 4: Passport view (S03)
- [x] Scanner checks: passport-presence, passport-completeness, cross-mismatch (S03)
- [x] SDK `compliorAgent()` runtime enforcement (S04)
- [x] AIUC-1 Readiness assessment (S05)
- [x] Agent Score computation (registry) (S05)
- [x] Document generator: 6 document types (S06)
- [x] Audit trail summary + query filtering (S05)
- [x] Audit package metadata endpoint (S06)

### Planned (Open-Source)

- [ ] Mode 2: MCP Proxy observation → passport enrichment (Scanner Mode 11)
- [ ] Eval integration: 670 тестов → `compliance.eval` блок (20+ полей, 11 категорий, bias A/B, security score)
- [ ] Audit integration: passport как обязательный документ в audit package
- [ ] Monitor integration: runtime drift → passport anomaly status

### Planned (SaaS)

- [ ] Mode 3: SaaS Dashboard wizard (F39, Sprint S09)
- [ ] CLI → SaaS sync (POST /v1/tui/agents)
- [ ] Agent Control Plane: unified CLI + SaaS view
- [ ] Community Evidence aggregation

---

## 8. ТЕСТЫ

### Core passport domain (`domain/passport/`)

| Модуль | Тестов | Файл |
|--------|--------|------|
| Agent Discovery | 11 | `agent-discovery.test.ts` |
| Autonomy Analyzer | 13 | `autonomy-analyzer.test.ts` |
| Manifest Builder | 45 | `manifest-builder.test.ts` |
| Permission Scanner | 12 | `permission-scanner.test.ts` |
| Obligation Field Map | 9 | `obligation-field-map.test.ts` |
| Passport Validator | 9 | `passport-validator.test.ts` |
| Crypto Signer | 4 | `crypto-signer.test.ts` |
| Test Generator | 10 | `test-generator.test.ts` |
| Manifest Diff | 12 | `manifest-diff.test.ts` |
| **Subtotal** | **125** | |

### Export / Import

| Модуль | Тестов | Файл |
|--------|--------|------|
| Export (A2A + AIUC-1 + NIST) | 17 | `export/export.test.ts` |
| Import (A2A) | 18 | `import/a2a-importer.test.ts` |
| **Subtotal** | **35** | |

### Смежные модули (passport-dependent)

| Модуль | Тестов | Файл |
|--------|--------|------|
| FRIA Generator | 21 | `domain/fria/fria-generator.test.ts` |
| Document Generator | 26 | `domain/documents/document-generator.test.ts` |
| Worker Notification | 12 | `domain/documents/worker-notification-generator.test.ts` |
| Policy Generator | 13 | `domain/documents/policy-generator.test.ts` |
| Audit Trail | 9 | `domain/audit/audit-trail.test.ts` |
| Audit Package | 12 | `domain/audit/audit-package.test.ts` |
| Permissions Matrix | 7 | `domain/audit/permissions-matrix.test.ts` |
| Evidence Store | 11 | `domain/scanner/evidence-store.test.ts` |
| Evidence | 9 | `domain/scanner/evidence.test.ts` |
| AIUC-1 Readiness | 17 | `domain/certification/aiuc1-readiness.test.ts` |
| Agent Score (Registry) | 21 | `domain/registry/compute-agent-score.test.ts` |
| Guided Onboarding | 13 | `domain/onboarding/guided-onboarding.test.ts` |
| **Subtotal** | **171** | |

### Scanner checks + Service

| Модуль | Тестов | Файл |
|--------|--------|------|
| Passport Presence (L1) | 5 | `scanner/checks/passport-presence.test.ts` |
| Passport Completeness (L2) | 9 | `scanner/checks/passport-completeness.test.ts` |
| Passport Service | 13 | `services/passport-service.test.ts` |
| **Subtotal** | **27** | |

### Итого

| Платформа | Тестов | Файлов |
|-----------|--------|--------|
| **TypeScript** | **358** | **25** |
| **Rust CLI** | **~20** | `headless/agent.rs`, `cli.rs` |
| **Всего** | **~378** | **27** |

---

**Обновлено:** 2026-03-20 v2.2.0 — Добавлен полный Passport Data Fill Pipeline (§3.10): 10 стадий от onboarding до SaaS, с точными полями и процентами полноты. Eval раскрыт на все 11 категорий (670 тестов, CT-1..CT-11) с `compliance.eval` блоком (20+ полей) в JSON schema. LLM-обогащение документов (`complior fix --ai`) добавлено как отдельная стадия. v2.1.0: Синхронизация с SCANNER.md, Mode 2 «Runtime», 4-command pipeline. v2.0.0: Production rewrite (risk, articles, oversight, obligations, data residency, completeness, auto-update).
