# SCORING-ARCHITECTURE.md — Multi-Framework Compliance Scoring

**Версия:** 1.0.0
**Дата:** 2026-03-11
**Статус:** Draft — требует утверждения PO

---

## 1. Принцип: один проект — N фреймворков — N скоров

Complior поддерживает множество compliance-фреймворков одновременно. Пользователь выбирает применимые фреймворки в конфигурации или onboarding wizard. Каждый фреймворк — независимый scorer со своими проверками, весами и грейдами.

- Dashboard показывает **только выбранные** фреймворки
- SaaS получает per-framework scores через `POST /sync/registry`
- Default: `["eu-ai-act"]` — backward compatible с существующим scan score

---

## 2. Три уровня метрик

### Layer 1: Foundation Metrics

Базовые метрики, вычисляемые независимо. Используются как входные данные для framework scores.

| Метрика | Тип | Источник |
|---------|-----|----------|
| **Scan Score** | 0–100 | Код: 5-layer scanner (L1–L5), weighted findings |
| **Passport Completeness** | 0–100 | Agent Passport: 36 полей, % заполнения |
| **Evidence Chain** | valid/invalid + count | `.complior/evidence/chain.json`: hash chain + ed25519 |
| **Document Status** | per-document | FRIA, policy docs, notification docs — наличие и полнота |
| **Adversarial Results** | pass/fail/inconclusive | Per-test results (planned S05) |

### Layer 2: Framework Scores

Per-framework scores, вычисляемые из foundation metrics + framework-specific проверок.

| Фреймворк | Диапазон | Checks | Категории | Статус |
|------------|----------|--------|-----------|--------|
| **EU AI Act** | 0–100, Grade A–F | 108 obligations, 5 категорий | risk-mgmt, data-governance, transparency, human-oversight, accuracy | ✅ S05 |
| **AIUC-1** | 0–100, Level 1–4 | 15 requirements, 7 категорий | governance, risk, data, transparency, fairness, security, accountability | ✅ S05 |
| **ISO 42001** | 0–100, % conformity | 39 controls, 7 clauses | context, leadership, planning, support, operation, evaluation, improvement | 🟡 S07 |
| **Custom** | user-defined | user-defined requirements | user-defined | 🟡 S08+ |

### Layer 3: Economic Indicators

Бизнес-метрики, помогающие принять решения о приоритетах remediation.

| Индикатор | Тип | Описание |
|-----------|-----|----------|
| **Compliance Debt** | low/med/high/critical | Накопленный технический долг по compliance |
| **Remediation Cost** | EUR + ROI | Оценка стоимости исправления + return on investment |
| **Days to Deadline** | число | Дней до enforcement date фреймворка |

---

## 2b. Complior Score Formula & Document Quality Impact

The base `complior_score` is computed as:

```
complior_score = passed / (passed + failed) * 100
```

This formula is applied at both project level (all findings) and per-agent level (agent-attributed + shared findings).

### How Document Quality Affects Score

Documents progress through 4 quality levels, each affecting scanner findings differently:

| Quality Level | L1 Finding | L2 Finding | Net Score Impact |
|--------------|-----------|-----------|-----------------|
| `none` — no file | fail | (skipped) | -1 passed |
| `scaffold` — placeholders/shallow | pass | fail | +1 passed, +1 failed (net lower) |
| `draft` — real content | pass | pass | +2 passed |
| `reviewed` — AI-enriched with marker | pass | pass | +2 passed (same as draft) |

**Example:** A project with 6 doc types:
- 2 none + 2 scaffold + 2 draft → passed=6, failed=4 → score impact from docs: 60%
- 0 none + 0 scaffold + 6 draft → passed=12, failed=0 → score impact from docs: 100%

The `doc_quality_summary` field on the passport provides at-a-glance visibility:
```jsonc
{ "none": 0, "scaffold": 2, "draft": 3, "reviewed": 1 }
```

**AI review marker:** `complior fix --ai` appends `<!-- complior:reviewed TIMESTAMP -->` to enriched docs. The next scan detects this and classifies the document as `reviewed` quality. While `reviewed` and `draft` have the same score impact today, the `reviewed` level provides auditability — the marker proves the document was AI-processed at a specific timestamp.

---

## 3. Framework Interface

Каждый фреймворк реализует единый интерфейс:

```typescript
interface ComplianceFramework {
  id: string;              // "eu-ai-act", "aiuc-1", "iso-42001"
  name: string;            // "EU AI Act", "AIUC-1"
  version: string;         // "2024/1689", "1.0"
  deadline?: string;       // "2026-08-02" (ISO date, if applicable)

  checks: FrameworkCheck[];     // что проверять
  categories: Category[];       // группировка с весами
  gradeMapping: GradeMapping;   // пороги для грейдов/уровней
}

interface FrameworkCheck {
  id: string;              // "OBL-003", "AIUC-REQ-01"
  source: CheckSource;     // "scan_check" | "passport_field" | "document" | "evidence"
  sourceRef: string;       // ссылка на конкретную проверку/поле
  weight: number;          // 0.0–1.0
  category: string;        // к какой категории относится
}

interface Category {
  id: string;
  name: string;
  weight: number;          // вес категории в итоговом score
}

interface GradeMapping {
  type: "letter" | "level" | "percentage";
  thresholds: { min: number; label: string }[];
  // Пример EU AI Act: [{min: 90, label: "A"}, {min: 75, label: "B"}, ...]
  // Пример AIUC-1: [{min: 90, label: "Level 4"}, {min: 70, label: "Level 3"}, ...]
}
```

---

## 4. Dashboard Integration

### Per-Framework Score Cards

Dashboard показывает карточку для каждого выбранного фреймворка:

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   EU AI Act         │  │      AIUC-1         │  │    ISO 42001        │
│                     │  │                     │  │                     │
│   Grade: B (78/100) │  │   Level 3 (72/100)  │  │   — not selected —  │
│   ████████░░ 78%    │  │   ███████░░░ 72%    │  │                     │
│   12 gaps remaining │  │   4 gaps remaining  │  │                     │
│   ⏰ 144d to Aug 2  │  │   No deadline       │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

- Только выбранные фреймворки отображаются
- Каждая карточка: грейд/уровень + progress bar + количество gaps + deadline
- Adversarial results отображаются внутри фреймворков, которые их требуют

### Optional Aggregate

Опциональный агрегированный скор — weighted average по выбранным фреймворкам. Используется для quick overview, не заменяет per-framework детали.

---

## 5. SaaS Sync

```
CLI daemon                              SaaS API
──────────                              ──────────
POST /sync/registry                ────► Store per-framework scores
  Body: {
    projectHash,
    frameworks: [
      { id: "eu-ai-act", score: 78, grade: "B", gaps: 12 },
      { id: "aiuc-1", score: 72, level: "Level 3", gaps: 4 }
    ]
  }
```

- SaaS показывает cross-organization per-framework сравнение
- Multi-jurisdiction: EU AI Act + Korean AI Act side-by-side
- Aggregate views: "72% наших AI-систем Grade B+ по EU AI Act"

---

## 6. Configuration

### `.complior/config.toml`

```toml
[project]
name = "my-ai-system"

[compliance]
frameworks = ["eu-ai-act", "aiuc-1"]
# Default: ["eu-ai-act"]
```

### Onboarding Wizard

Framework selection — шаг в onboarding wizard:

```
Which compliance frameworks apply to your project?
  [x] EU AI Act (mandatory for EU-deployed AI)
  [ ] AIUC-1 (voluntary certification)
  [ ] ISO 42001 (AI management system)
  [ ] Custom framework...
```

### Backward Compatibility

- Без конфига: `frameworks = ["eu-ai-act"]` по умолчанию
- Существующий `scan score` становится EU AI Act score (Layer 2)
- Никаких breaking changes для текущих пользователей

---

## 7. Implementation Roadmap

| Спринт | Что реализуется | Статус |
|--------|----------------|--------|
| **S05** | EU AI Act score + AIUC-1 readiness как отдельные scorers | ✅ DONE |
| **S06** | Framework abstraction: interface + registry + config (E-105..E-107) | 🟠 |
| **S07** | ISO 42001 scorer (E-79) + Multi-Standard Gap UI (E-80) + SaaS sync (E-108) | 🟡 |
| **S08+** | Korean AI Act, NIST AI RMF, custom frameworks | 🟡 |

---

**Связанные документы:**
- `docs/ARCHITECTURE.md` — общая архитектура системы
- `docs/UNIFIED-ARCHITECTURE.md` § 4 — Scoring Engine (cross-reference)
- `docs/PRODUCT-BACKLOG.md` § E-F16 — Multi-Framework Scoring features
- `docs/EU-AI-ACT-PIPELINE.md` — 108 obligations mapping
