# Handoff: AI Registry + Regulation DB → PROJECT

**Дата:** 2026-02-23
**От:** complior TUI/Engine (`~/complior`)
**Кому:** внешний агент (`~/PROJECT`)

Ниже собраны все задачи из наших спринтов S03–S10, которые касаются **данных** AI Registry и Regulation DB. Эти задачи выполняются в `~/PROJECT` (PostgreSQL), не в `~/complior`.

Наш Engine получает все эти данные через `EngineDataProvider` → PROJECT API (уже реализовано в Sprint 1.5).

---

## API-контракт (что PROJECT должен отдавать)

```
GET /v1/registry/stats
→ { total: number, scored_count: number, by_risk: Record<string, number> }

GET /v1/registry/tools?limit=50&risk_level=high
→ { tools: RegistryTool[], total: number }

GET /v1/regulations/obligations?regulation=eu-ai-act
→ { obligations: Obligation[], total: number }
```

---

## Задача 1 — Colorado SB 205 (из Sprint S03 / US-S0304)

**Что нужно:** добавить Colorado SB 205 как вторую юрисдикцию в Regulation DB.

### Rule Set (5 checks)

| Check ID | SB 205 требование | Строже чем EU AI Act? |
|----------|-------------------|----------------------|
| `co_ai_notice` | Уведомление до взаимодействия с AI | Аналогично Art.50.1 |
| `co_opt_out` | Право отказаться от AI-решения | **Строже** — явный opt-out |
| `co_human_review` | Право на human review для consequential decisions | Аналогично Art.14 |
| `co_data_management` | Документирование training data | Аналогично Art.10 |
| `co_annual_report` | Годовой отчёт о high-risk AI uses | **Новое** — нет в EU AI Act |

### Структура данных (было в engine/core/src/data/regulation-db/colorado-sb205.json)

```json
{
  "id": "colorado-sb205",
  "name": "Colorado SB 205",
  "jurisdiction": "US-CO",
  "effective_date": "2026-02-01",
  "checks": [
    { "id": "co_ai_notice", "article": "§6-1-1703(1)", "severity": "high" },
    { "id": "co_opt_out", "article": "§6-1-1703(2)", "severity": "high" },
    { "id": "co_human_review", "article": "§6-1-1703(3)", "severity": "medium" },
    { "id": "co_data_management", "article": "§6-1-1703(4)", "severity": "medium" },
    { "id": "co_annual_report", "article": "§6-1-1703(5)", "severity": "low" }
  ]
}
```

---

## Задача 2 — Texas TRAIGA + California AB 2885 + South Korea (из Sprint S06 / US-S0602)

**Что нужно:** добавить 3 новые юрисдикции в Regulation DB.

### Texas TRAIGA

```json
{
  "id": "texas-traiga",
  "name": "Texas TRAIGA",
  "jurisdiction": "US-TX",
  "effective_date": "2025-09-01",
  "checks": [
    { "id": "tx_risk_assessment", "description": "Risk assessment before deployment" },
    { "id": "tx_human_oversight", "description": "Human oversight for consequential decisions" },
    { "id": "tx_algorithmic_impact", "description": "Annual algorithmic impact assessment" },
    { "id": "tx_right_to_explanation", "description": "Right to explanation for adverse AI decisions" }
  ]
}
```

### California AB 2885

```json
{
  "id": "california-ab2885",
  "name": "California AB 2885",
  "jurisdiction": "US-CA",
  "effective_date": "2025-01-01",
  "checks": [
    { "id": "ca_ai_disclosure", "description": "AI-generated content disclosure on online platforms" },
    { "id": "ca_deepfake_label", "description": "AI-generated media labelling" },
    { "id": "ca_opt_out_synthetic", "description": "Opt-out for synthetic media" }
  ]
}
```

### South Korea AI Basic Act

```json
{
  "id": "south-korea-ai",
  "name": "South Korea AI Basic Act",
  "jurisdiction": "KR",
  "effective_date": "2024-01-01",
  "checks": [
    { "id": "kr_transparency", "description": "Transparency — stronger than EU for some domains" },
    { "id": "kr_high_risk_classification", "description": "High-risk AI: same categories as EU Annex III" },
    { "id": "kr_data_localization", "description": "Strict data localization requirements" }
  ]
}
```

---

## Задача 3 — Regulation Change Monitoring (из Sprint S08 / US-S0802)

**Что нужно:** PROJECT ведёт версионированную историю изменений Regulation DB и предоставляет feed API.

### Feed API (нужен от PROJECT)

```
GET /v1/regulations/changes?since=2025-01-01&regulation=eu-ai-act
→ {
    changes: [{
      id: string,
      date: string,
      regulation: string,
      changeType: "amendment" | "clarification" | "new_guidance" | "enforcement",
      affectedArticles: string[],
      summary: string,
      impact: "critical" | "high" | "medium" | "low",
      affectedChecks: string[]
    }],
    total: number
  }

GET /v1/regulations/diff?regulation=eu-ai-act&from=2025-01-01&to=2026-02-22
→ { added: Change[], clarified: Change[], unchanged: string[] }
```

### Versioning

Regulation DB должна хранить версии по дате: `eu-ai-act@2025-01-01`, `eu-ai-act@2026-02-22` — чтобы поддерживать `complior diff --regulation eu-ai-act --from X --to Y`.

### Источники (рекомендуемые)

- EUR-Lex RSS: официальные поправки EU AI Act
- Federal Register: US jurisdictions
- Собственная кураторская редакция для интерпретаций

---

## Задача 4 — UK + Japan + Canada + Brazil (из Sprint S10 / US-S1001)

**Что нужно:** добавить 4 новые юрисдикции + EU AI Act Omnibus rules.

### UK AI Regulation Bill

```json
{
  "id": "uk-ai-regulation",
  "name": "UK AI Governance Framework",
  "jurisdiction": "UK",
  "checks": [
    { "id": "uk_safety", "description": "No unacceptable risk AI" },
    { "id": "uk_transparency", "description": "Appropriate disclosure" },
    { "id": "uk_contestability", "description": "Right to challenge AI decisions (no EU equivalent)" },
    { "id": "uk_accountability", "description": "Clear responsibility chain" },
    { "id": "uk_fairness", "description": "No discrimination" }
  ]
}
```

### Japan AI Governance

```json
{
  "id": "japan-ai-governance",
  "name": "Japan AI Governance Act",
  "jurisdiction": "JP",
  "checks": [
    { "id": "jp_transparency", "description": "Human-centric AI transparency" },
    { "id": "jp_ai_safety", "description": "Safety standards for critical infrastructure" },
    { "id": "jp_data_localization", "description": "Stronger data localization than EU" },
    { "id": "jp_healthcare_controls", "description": "Stricter controls for healthcare/justice" },
    { "id": "jp_human_centric", "description": "Human-centric AI principles" }
  ]
}
```

### Canada AIDA (Bill C-27)

```json
{
  "id": "canada-aida",
  "name": "Canada AIDA (Bill C-27)",
  "jurisdiction": "CA",
  "checks": [
    { "id": "ca_impact_assessment", "description": "Impact assessment for high-impact AI" },
    { "id": "ca_mitigation_measures", "description": "Mitigation measures" },
    { "id": "ca_explainability", "description": "Explainability right for consequential decisions" },
    { "id": "ca_incident_reporting", "description": "Incident reporting 72h" },
    { "id": "ca_bias_mitigation", "description": "Bias detection and mitigation" }
  ]
}
```

### Brazil AI Act

```json
{
  "id": "brazil-ai-act",
  "name": "Brazil AI Act (2025)",
  "jurisdiction": "BR",
  "checks": [
    { "id": "br_disclosure", "description": "AI disclosure required" },
    { "id": "br_risk_classification", "description": "Risk-based: minimal/limited/high/unacceptable" },
    { "id": "br_high_risk_domains", "description": "High-risk: employment, credit, education, justice" },
    { "id": "br_lgpd_integration", "description": "LGPD (Brazilian GDPR) integration required" },
    { "id": "br_dpa_reporting", "description": "ANPD reporting obligations" }
  ]
}
```

### EU AI Act Omnibus HIGH-RISK rules (conditional)

```json
{
  "id": "eu-ai-act-omnibus",
  "name": "EU AI Act — Digital Omnibus HIGH-RISK rules",
  "jurisdiction": "EU",
  "conditional": true,
  "activation": "Digital Omnibus Act passed",
  "checks": [
    { "id": "omnibus_high_risk_extended", "description": "Extended HIGH-RISK list per Omnibus" }
  ]
}
```

**Итого после Задачи 4:** 9 юрисдикций — EU + CO + TX + CA(US) + KR + UK + JP + CA(Canada) + BR

---

## Задача 5 — AI Registry 2000+ Tools (из Sprint S10 / US-S1002)

**Что нужно:** расширить AI Registry с текущих 5,011 до 2,000+ с полными detection patterns (сейчас у нас уже 5,011 — нужно верифицировать и дополнить категории).

### Категории для расширения/верификации

```
enterprise_llm:        50  — Azure OpenAI, AWS Bedrock, GCP Vertex, IBM WatsonX
specialized_models:   100  — медицина, право, финансы
embedding_models:      80  — Cohere, Voyage, Jina, etc.
autonomous_agents:     60  — мелкие agent frameworks
ml_platforms:         100  — MLflow, Kubeflow, SageMaker, Vertex AI
data_annotation:       50  — Scale AI, Labelbox, Roboflow
ai_testing:            30  — Arize, WhyLabs, Evidently
ai_governance:         40  — конкуренты (informational)
country_specific:     200  — Baidu, Alibaba, Samsung AI, Naver, etc.
research_models:      150  — академические модели (Llama, Mistral, etc.)
```

### Detection patterns (full, нужны для offline bundle)

Для каждого инструмента нужны:
```json
{
  "tool_id": "openai-gpt4",
  "detection_patterns": {
    "npm": ["openai"],
    "pip": ["openai"],
    "imports": ["from openai", "import openai"],
    "env_vars": ["OPENAI_API_KEY"],
    "api_calls": ["openai.chat.completions.create", "client.chat.completions.create"]
  },
  "risk_level": "limited",
  "compliance_requirements": ["disclosure", "logging", "content_marking"]
}
```

---

## Задача 6 — Regulation API (из Sprint S10 / US-S1002)

**Что нужно:** публичный REST API для enterprise/third-party (revenue stream). PROJECT владеет данными — PROJECT отдаёт API.

```
GET /api/v1/regulations                          → список всех юрисдикций
GET /api/v1/regulations/eu-ai-act               → full EU AI Act data
GET /api/v1/regulations/eu-ai-act/articles/50   → конкретная статья
GET /api/v1/regulations/eu-ai-act/checks        → все checks с правилами
GET /api/v1/tools                               → AI tool registry 2000+
GET /api/v1/tools/openai-gpt4                  → конкретный инструмент
GET /api/v1/diff?from=eu-ai-act&to=uk-ai       → diff между юрисдикциями
POST /api/v1/score                              → calculate score (batch)
```

Требования: API key auth, rate limiting, OpenAPI/Swagger документация.

---

## Что остаётся в ~/complior (не трогать)

| Компонент | Файл в ~/complior | Описание |
|-----------|-------------------|----------|
| Scoring logic | `engine/core/src/domain/regulation/jurisdiction.ts` | Алгоритм "strictest wins" |
| Score combiner | `engine/core/src/domain/regulation/strictest-wins.ts` | Формула комбинирования |
| Jurisdiction diff display | `engine/core/src/domain/regulation/jurisdiction-diff.ts` | Отображение дифа |
| Regulation feed consumer | `engine/core/src/domain/monitoring/regulation-feed.ts` | Читает feed из PROJECT API |
| Regulation diff display | `engine/core/src/domain/monitoring/regulation-diff.ts` | Показывает changelog |
| EngineDataProvider | `cli/src/data/engine_provider.rs` | HTTP клиент к PROJECT API ✅ |

---

## Приоритет выполнения

1. **Сейчас** — Colorado SB 205 (Задача 1) — нужна для S03
2. **Далее** — TX/CA/KR (Задача 2) — для S06
3. **Далее** — Regulation Change Feed API (Задача 3) — для S08
4. **Потом** — UK/JP/CA/BR (Задача 4) — для S10
5. **Потом** — AI Registry 2000+ (Задача 5) — для S10
6. **Потом** — Regulation API (Задача 6) — revenue stream S10
