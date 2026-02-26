# EU AI Act Classification Rules — RuleEngine Specification

> Version 1.0 | Sprint 2 | Source: Regulation (EU) 2024/1689
> This document codifies the EU AI Act classification rules in a format suitable for programmatic implementation in the RuleEngine domain service.

---

## 1. Art. 5 — Prohibited AI Practices (8 Prohibitions)

All 8 prohibitions apply regardless of the AI system's domain. If any match → `riskLevel: 'prohibited'`.

| Ref | Practice | Trigger Conditions | Exceptions | Detection Keywords |
|-----|----------|-------------------|------------|-------------------|
| 5(1)(a) | Subliminal/manipulative/deceptive techniques | Purpose or effect: materially distort behavior of a person or group + causes or is reasonably likely to cause significant harm | None | `subliminal`, `manipulative`, `deceptive`, `dark_pattern` |
| 5(1)(b) | Exploitation of vulnerabilities | Targets age, disability, or social/economic situation + materially distorts behavior + significant harm | None | `vulnerability_exploitation`, `vulnerableGroups=true` + `purpose` targeting vulnerable |
| 5(1)(c) | Social scoring | Evaluates/classifies natural persons based on social behavior or personal characteristics → detrimental or unfavorable treatment unrelated to context or disproportionate | None | `social_scoring`, `social_behavior_evaluation` |
| 5(1)(d) | Individual criminal risk prediction | Predicts risk of committing criminal offense based SOLELY on profiling or personality traits assessment | Exception: AI supporting human assessment based on objective, verifiable facts directly linked to criminal activity | `criminal_prediction`, `profiling` + `sole_basis` |
| 5(1)(e) | Untargeted facial scraping | Creates or expands facial recognition databases via untargeted scraping from internet or CCTV | None | `facial_scraping`, `untargeted_biometric_collection` |
| 5(1)(f) | Emotion recognition in workplace/education | Infers emotions of natural persons in workplace or educational institution | Exception: medical reasons or safety reasons (e.g., driver drowsiness) | `emotion_recognition` + domain `employment` or `education` |
| 5(1)(g) | Biometric categorization by protected characteristics | Categorizes natural persons individually based on biometric data to deduce race, political opinions, trade union membership, religious beliefs, sex life, or sexual orientation | Exception: labeling/filtering of lawfully acquired biometric datasets (law enforcement) | `biometric_categorization`, `protected_characteristics` |
| 5(1)(h) | Real-time remote biometric identification in public spaces | Real-time remote biometric identification in publicly accessible spaces for law enforcement purposes | Strictly limited exceptions for law enforcement only (targeted search for victims, prevention of specific threats, specific criminal offenses) | `realtime_biometric`, `public_spaces`, `remote_identification` |

### Prohibited Practice Detection Logic

```
function checkProhibited(tool):
  // 5(1)(a): Subliminal/manipulative techniques
  if purpose contains "subliminal" OR "manipulative" OR "deceptive"
     AND affectsNaturalPersons = true
     → PROHIBITED, ref: "Art. 5(1)(a)"

  // 5(1)(b): Vulnerability exploitation
  if vulnerableGroups = true
     AND purpose implies targeting vulnerable group's decision-making
     → PROHIBITED, ref: "Art. 5(1)(b)"

  // 5(1)(c): Social scoring
  if purpose contains "social scoring" OR "social behavior evaluation"
     AND affectsNaturalPersons = true
     → PROHIBITED, ref: "Art. 5(1)(c)"

  // 5(1)(d): Criminal prediction by profiling
  if purpose contains "criminal prediction" OR "recidivism prediction"
     AND dataTypes excludes "objective_criminal_facts"
     → PROHIBITED, ref: "Art. 5(1)(d)"

  // 5(1)(e): Untargeted facial scraping
  if purpose contains "facial scraping" OR "face database building"
     → PROHIBITED, ref: "Art. 5(1)(e)"

  // 5(1)(f): Emotion recognition in workplace/education
  if dataTypes includes "biometric"
     AND purpose contains "emotion recognition"
     AND domain in ["employment", "education"]
     AND purpose does NOT contain "medical" or "safety"
     → PROHIBITED, ref: "Art. 5(1)(f)"

  // 5(1)(g): Biometric categorization by protected chars
  if dataTypes includes "biometric"
     AND purpose contains "categorization by race/religion/politics/sexual orientation"
     → PROHIBITED, ref: "Art. 5(1)(g)"

  // 5(1)(h): Real-time remote biometric ID in public
  if dataTypes includes "biometric"
     AND purpose contains "real-time identification" AND "public spaces"
     → PROHIBITED, ref: "Art. 5(1)(h)"
```

---

## 2. Art. 6 — High-Risk Classification Rules

### Pathway 1: Safety Component (Annex I)
If the AI system is a safety component of a product listed in Annex I (e.g., medical devices, machinery, toys, vehicles, aviation) AND subject to third-party conformity assessment → **HIGH-RISK**.

> Note: For deployer-focused MVP, Pathway 1 is detected via `catalogDefaultRisk` being set to 'high' by catalog seed data, since deployers typically don't manufacture these products.

### Pathway 2: Annex III Use Cases
If the AI system falls within one of the 8 domains and specific use cases in Annex III → **HIGH-RISK** (subject to Art. 6(3) exceptions).

### Art. 6(3) — Exceptions to High-Risk (DOES NOT APPLY if profiling)
A system listed in Annex III is NOT high-risk if it does NOT pose a significant risk of harm and ALL of the following apply:
- **(a)** Performs a narrow procedural task
- **(b)** Improves the result of a previously completed human activity
- **(c)** Detects decision patterns without replacing human assessment
- **(d)** Performs only a preparatory task for a relevant assessment

**CRITICAL OVERRIDE:** If the AI system profiles natural persons (Art. 6(3) final paragraph) → **ALWAYS HIGH-RISK**, no exceptions apply.

---

## 3. Annex III — 8 High-Risk Domains (23 Use Cases)

### Domain 1: Biometrics
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 1(a) | Remote biometric identification | Identify natural persons at a distance (excluding verification) | Using facial recognition for access control |
| 1(b) | Biometric categorization | Assign persons to categories based on biometric data (gender, age, ethnicity) | Using demographic classification tools |
| 1(c) | Emotion recognition | Infer emotional state from biometric signals | Using sentiment/emotion analysis on employees/customers |

### Domain 2: Critical Infrastructure
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 2(a) | Safety components | AI as safety component in digital infrastructure management, road/water/gas/heating/electricity | Operating AI for infrastructure monitoring |
| 2(b) | Critical infrastructure mgmt | AI managing critical infrastructure operations | Using AI to manage utility/transport systems |

### Domain 3: Education & Vocational Training
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 3(a) | Admission/assignment | Determine access to or admission to educational institutions | Using AI for student selection |
| 3(b) | Learning outcome evaluation | Evaluate learning outcomes including for steering learning process | AI-powered grading or assessment tools |
| 3(c) | Level assessment | Assess appropriate level of education for an individual | AI placement testing |
| 3(d) | Exam proctoring | Monitor/detect prohibited behavior during tests | AI proctoring software |

### Domain 4: Employment, Workers Management, Self-Employment
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 4(a) | Recruitment & screening | Placing vacancy notices, screening/filtering applications, evaluating candidates | Using AI in hiring (CV screening, interviews) |
| 4(b) | Work-related decisions | Decisions on promotion, termination, task allocation, performance monitoring | Using AI for performance reviews, work assignment |

### Domain 5: Access to Essential Services
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 5(a) | Public benefits eligibility | Evaluate eligibility for public assistance benefits and services | Government/social services using AI for benefit decisions |
| 5(b) | Credit scoring | Evaluate creditworthiness of natural persons (except fraud detection) | Banks/fintechs using AI credit scoring |
| 5(c) | Life/health insurance risk | Risk assessment and pricing for life and health insurance | Insurance companies using AI underwriting |
| 5(d) | Emergency dispatch | Evaluate and classify emergency calls (priority, dispatch) | Emergency services using AI triage |

### Domain 6: Law Enforcement
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 6(a) | Victim risk assessment | Individual risk assessment of potential victims of criminal offenses | Police using predictive victim protection |
| 6(b) | Polygraphs/truthfulness | AI polygraph or similar tools to detect deception | Law enforcement using AI deception detection |
| 6(c) | Evidence reliability | Assess reliability of evidence in criminal investigations | Forensic AI analysis tools |
| 6(d) | Recidivism assessment | Assess risk of re-offending (with human assessment base) | Corrections using AI risk scores |
| 6(e) | Profiling in law enforcement | Profiling of natural persons in detection, investigation, prosecution | Police using predictive policing |

### Domain 7: Migration, Asylum, Border Control
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 7(a) | Polygraphs at borders | AI polygraph at border control | Border agencies |
| 7(b) | Risk assessment | Assess security, irregular migration, health risk | Immigration authorities |
| 7(c) | Application examination | Examine asylum, visa, residence permit applications | Immigration processing |
| 7(d) | Border biometrics | Identify persons in migration context via biometrics | Border agencies |

### Domain 8: Administration of Justice & Democratic Processes
| Ref | Use Case | Description | Deployer Relevance |
|-----|----------|-------------|--------------------|
| 8(a) | Judicial AI | AI assisting judicial authorities in researching/interpreting facts and law | Courts using AI for legal research with case impact |
| 8(b) | Election influence | AI intended to influence outcome of elections or referendums | Political campaign AI tools |

---

## 4. Domain Enum → Annex III Mapping

This table maps the `AITool.domain` enum values (from the database schema) to Annex III categories:

| domain enum | Annex III Domain | Annex Ref | Always High-Risk? |
|-------------|-----------------|-----------|-------------------|
| `biometrics` | 1: Biometrics | 1(a-c) | Yes (check prohibited first) |
| `critical_infrastructure` | 2: Critical Infrastructure | 2(a-b) | Yes |
| `education` | 3: Education | 3(a-d) | Yes |
| `employment` | 4: Employment | 4(a-b) | Yes |
| `essential_services` | 5: Essential Services | 5(a-d) | Yes |
| `law_enforcement` | 6: Law Enforcement | 6(a-e) | Yes |
| `migration` | 7: Migration | 7(a-d) | Yes |
| `justice` | 8: Justice & Democracy | 8(a-b) | Yes |
| `customer_service` | — | — | No (check Art. 50) |
| `marketing` | — | — | No (check Art. 50) |
| `coding` | — | — | No (minimal) |
| `analytics` | — | — | No (check context) |
| `other` | — | — | No (minimal) |

---

## 5. Art. 50 — Transparency Obligations (Limited Risk)

These obligations apply to specific types of AI systems regardless of risk level:

| Ref | Type | Obligation | Detection |
|-----|------|------------|-----------|
| 50(1) | AI interacting with humans | Deployer must inform natural persons they are interacting with AI (unless obvious from circumstances) | `domain='customer_service'` + chatbot/conversational purpose |
| 50(2) | Synthetic content generation | Mark AI-generated content in machine-readable format | Purpose involves content generation |
| 50(3) | Emotion recognition / biometric categorization | Inform affected persons about operation and processing of data | `dataTypes` includes 'biometric' + emotion/categorization purpose |
| 50(4) | AI-generated text on public interest | Disclose that text was AI-generated (except editorially reviewed) | AI-generated text published for public information |
| 50(5) | Deepfakes | Disclose content has been artificially generated or manipulated | Purpose involves image/audio/video manipulation |

### Transparency Risk Detection
```
function checkTransparency(tool):
  if domain = 'customer_service' AND purpose contains "chatbot"
     → LIMITED, ref: "Art. 50(1)"

  if purpose contains "content generation" OR "synthetic"
     → LIMITED, ref: "Art. 50(2)"

  if dataTypes includes "biometric" AND purpose contains "emotion" or "categorization"
     AND NOT prohibited (checked earlier)
     → LIMITED, ref: "Art. 50(3)"

  if purpose contains "deepfake" OR "image generation" OR "video generation"
     → LIMITED, ref: "Art. 50(5)"

  if catalogDefaultRisk = 'limited'
     → LIMITED, ref: "Art. 50"
```

---

## 6. Art. 26 — Deployer Obligations for High-Risk (12 Obligations)

When a tool is classified HIGH-RISK, the deployer must fulfill:

| # | Art. | Obligation | Code | Effort |
|---|------|------------|------|--------|
| 1 | 26(1) | Use in accordance with instructions | ART_26_USAGE | 4h |
| 2 | 26(2) | Assign human oversight with competence | ART_26_OVERSIGHT | 8h |
| 3 | 26(4) | Ensure input data relevance | ART_26_INPUT_DATA | 4h |
| 4 | 26(5) | Monitor operation | ART_26_MONITORING | 8h |
| 5 | 26(5) | Report incidents | ART_26_INCIDENT | 4h |
| 6 | 26(5) | Cease use if risk detected | ART_26_CEASE | 2h |
| 7 | 26(6) | Retain automatic logs (6+ months) | ART_26_LOGS | 4h |
| 8 | 26(7) | Inform workers' representatives | ART_26_INFORM_WORKERS | 2h |
| 9 | 26(8) | Register in EU database | ART_26_REGISTRATION | 2h |
| 10 | 26(9) | Conduct DPIA if applicable | ART_26_DPIA | 16h |
| 11 | 26(11) | Cooperate with authorities | ART_26_COOPERATION | 2h |
| 12 | 26(1) | Support risk management | ART_26_RISK_MGMT_SUPPORT | 8h |
| 13 | 26(5) | Support post-market monitoring | ART_26_POST_MARKET | 4h |

---

## 7. Art. 27 — FRIA Requirements

### Who Must Conduct FRIA
- Public bodies (all high-risk)
- Private operators of public services
- Credit scoring (Annex III 5b)
- Life/health insurance (Annex III 5c)

### 6 Required Sections
| # | Section | Code | Effort |
|---|---------|------|--------|
| 1 | General description & processes | ART_27_FRIA | 24h |
| 2 | Affected persons identification | ART_27_AFFECTED_PERSONS | 4h |
| 3 | Specific risks assessment | ART_27_SPECIFIC_RISKS | 8h |
| 4 | Human oversight measures | ART_27_OVERSIGHT_MEASURES | 4h |
| 5 | Risk mitigation measures | ART_27_MITIGATION | 8h |
| 6 | Notify market surveillance authority | ART_27_NOTIFY_AUTHORITY | 2h |

---

## 8. Decision Tree — Classification Algorithm (Deployer Perspective)

```
classify(tool) → { riskLevel, confidence, matchedRules[], articleReferences[], annexCategory }

STEP 1: PROHIBITED CHECK (Art. 5)
  For each of 8 prohibited practices:
    if trigger conditions match AND no exception applies
      → return { riskLevel: 'prohibited', confidence: 95, ... }

STEP 2: HIGH-RISK — Annex I Safety Component
  if catalogDefaultRisk = 'high' AND domain NOT in Annex III
    → (likely safety component pathway)
    → return { riskLevel: 'high', confidence: 85, ... }

STEP 3: HIGH-RISK — Annex III
  if domain IN [biometrics, critical_infrastructure, education, employment,
                essential_services, law_enforcement, migration, justice]
    → Check profiling override: if affectsNaturalPersons AND purpose implies profiling
      → return { riskLevel: 'high', confidence: 95, ... }  // No exceptions
    → Check Art. 6(3) exceptions:
      if ALL of: narrow procedural, improvement only, pattern detection, preparatory
      AND NOT profiling
        → return { riskLevel: 'limited' or 'minimal', confidence: 75, ... }
    → else
      → return { riskLevel: 'high', confidence: 90, ... }

STEP 4: GPAI DETECTION
  if catalogDefaultRisk = 'gpai'
    → return { riskLevel: 'gpai', confidence: 85, ... }

STEP 5: TRANSPARENCY / LIMITED RISK (Art. 50)
  if chatbot/synthetic content/deepfake/emotion detection triggers match
    → return { riskLevel: 'limited', confidence: 85, ... }

STEP 6: CONTEXT MODIFIERS
  if vulnerableGroups = true → escalate one level (minimal→limited, limited→high)
  if autonomyLevel = 'autonomous' AND humanOversight = false → escalate one level
  if autonomyLevel = 'advisory' AND humanOversight = true → de-escalate candidate

STEP 7: DEFAULT
  → return { riskLevel: 'minimal', confidence: 60, ... }
```

---

## 9. Requirement Mapping by Risk Level

| Risk Level | Requirement Codes Applied |
|------------|--------------------------|
| MINIMAL | ART_4_LITERACY, ART_4_TRAINING_CEO, ART_4_TRAINING_HR, ART_4_TRAINING_DEV, ART_4_TRAINING_GENERAL |
| LIMITED | All MINIMAL + ART_50_TRANSPARENCY, ART_50_CHATBOT, ART_50_DEEPFAKE, ART_50_EMOTION, ART_50_AI_GENERATED_TEXT |
| GPAI | Same as LIMITED |
| HIGH | All LIMITED + ART_26_* (13 deployer obligations) + ART_27_* (6 FRIA sections) |
| PROHIBITED | ART_5_PROHIBITED, ART_5_SOCIAL_SCORING, ART_5_BIOMETRIC |

---

## 10. Confidence Scoring

| Scenario | Confidence |
|----------|------------|
| Exact prohibited practice match | 95% |
| Exact Annex III domain + profiling override | 95% |
| Annex III domain match (clear) | 90% |
| Catalog default risk confirms | 85% |
| Art. 50 transparency match | 85% |
| Art. 6(3) exception applied | 75% |
| Context modifier changed level | 75% |
| Default (no rules matched) | 60% |

---

## 11. Compliance Scoring Methodology v3 — Hybrid Observable Score

### Philosophy

**"Score only what you can observe."**

Scoring Engine v2 penalized tools for obligations that are fundamentally unverifiable externally (e.g., risk management systems, human oversight procedures, FRIA documentation, record-keeping). Since evidence-analyzer covers ~12 obligations out of ~108 applicable, the remaining ~70% of weight defaulted to `unknown = 15/100`, producing meaninglessly low scores (87% of tools = grade F).

v3 introduces a **Hybrid Observable Score** — 3 complementary metrics instead of 1 inflated/deflated number.

### Three Metrics

| Metric | Range | What It Measures |
|--------|-------|------------------|
| **Compliance Score** | 0–100 (or `null`) | Weighted score across **assessed obligations only** — unknowns excluded from denominator |
| **Coverage** | 0–100% | `assessed / total_applicable × 100` — how much of the compliance surface was actually evaluated |
| **Transparency Grade** | A–F | Provider's observable transparency signals (9 indicators, max 100 points → letter grade) |

### Transparency Grade Signals

| # | Signal | Points | Source |
|---|--------|--------|--------|
| 1 | AI disclosure visible on website | 15 | passive_scan.disclosure |
| 2 | Privacy policy mentions AI + EU | 10 | passive_scan.privacy_policy |
| 3 | Model card with ≥3/4 sections | 15 | passive_scan.model_card |
| 4 | Responsible AI page | 10 | passive_scan.trust |
| 5 | EU AI Act dedicated page | 15 | passive_scan.trust |
| 6 | Published transparency report | 10 | passive_scan.web_search |
| 7 | C2PA / watermark on content | 10 | passive_scan.content_marking |
| 8 | Public bias audit | 10 | passive_scan.web_search |
| 9 | ISO 42001 certification | 5 | passive_scan.trust |
| | **Maximum** | **100** | |

### Externally Verifiable Obligations

| Category | Example Obligations | Verifiable? | Method |
|----------|-------------------|-------------|--------|
| Transparency (Art. 50) | OBL-015, OBL-016, OBL-018 | Yes | Passive scan, LLM tests, media tests |
| AI Literacy (Art. 4) | OBL-001 | Partial | Responsible AI page presence |
| Data Governance (Art. 10) | OBL-003, OBL-004 | Partial | Privacy policy analysis |
| Safety (Art. 9) | OBL-002a | Partial | LLM safety tests |
| GPAI Documentation (Art. 53) | OBL-022–022c | Yes (for GPAI) | Model card analysis |
| Risk Management (Art. 9) | OBL-005–008 | **No** | Internal process |
| Human Oversight (Art. 14) | OBL-009–012 | **No** | Internal process |
| Record Keeping (Art. 12) | OBL-013–014 | **No** | Internal process |
| FRIA (Art. 27) | OBL-019–021 | **No** | Internal document |
| Monitoring (Art. 72) | OBL-023–025 | **No** | Internal process |

### Insufficient Data Gate

When `assessed === 0` (zero obligations have a known status), the scorer returns:
- `score: null` (not 0, not 15)
- `reason: 'insufficient_data'`
- `coverage: 0`
- `transparencyScore` and `transparencyGrade` are still computed (always available)

### Key Differences from v2

| Aspect | v2 | v3 |
|--------|----|----|
| Unknown obligations | Scored as 15/100, included in denominator | Excluded from score denominator |
| All-unknown tools | Cap at 15, `allUnknown` penalty | `score: null`, `reason: 'insufficient_data'` |
| Score meaning | "How compliant overall (with heavy guessing)" | "How compliant on assessed obligations only" |
| Coverage | Not tracked | Explicit 0–100% metric |
| Transparency | Bonuses only (+3, +2, etc.) | Dedicated grade (A–F) with 9 signals |
| Algorithm label | `deterministic-v2` | `deterministic-v3` |
