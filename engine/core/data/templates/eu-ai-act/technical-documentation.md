# Template 5: AI System Technical Documentation (Annex IV Summary)

**Obligation:** eu-ai-act-OBL-005
**Article:** Article 11 / Annex IV
**For:** Providers of High-Risk AI
**Format:** DOCX / PDF

## Document Structure:

### 1. General Description
<!-- GUIDANCE: Annex IV(1) requires a complete system identification. The "intended
purpose" must match the provider's declaration — any deviation requires re-assessment.
Include ALL hardware/software dependencies, not just primary components.
Example: "AI-CV-Screener v2.3, requires CUDA 12.0, Python 3.11, deployed on AWS
eu-west-1, interacts with ATS via REST API." -->
- System name, version, unique identifier
- Provider: [Name, address, contact]
- Intended purpose
- Hardware/software requirements
- System interactions with other systems
- Versions of relevant software/firmware

### 2. Detailed Description of System Elements
<!-- GUIDANCE: Annex IV(2) requires sufficient detail for a third party to understand
how the system works. Document architecture decisions and their rationale — not just
what was built, but WHY. Include training data characteristics (size, sources,
demographics, known limitations). Example: "Random Forest chosen over neural network
for interpretability; trained on 50K labeled samples from 2020-2024 EU labor data." -->
- Development process: methods, design specifications, architecture decisions
- Data requirements: input data specifications, training data characteristics
- Training methodology: algorithms used, optimization techniques, training procedures
- Key design choices and rationale
- Computational resources used

### 3. Monitoring, Functioning and Control
<!-- GUIDANCE: Annex IV(3) requires documentation of capabilities AND limitations.
Be specific about what the system cannot do. Define accuracy metrics with confidence
intervals, not single numbers. Art. 14 human oversight measures belong here.
Example: "Accuracy 92% (±3% CI) on EU population; drops to 78% for under-represented
demographics. Human review required for all scores below 0.6 confidence." -->
- System capabilities and limitations
- Performance metrics and accuracy levels
- Foreseeable unintended outcomes and risks
- Human oversight measures
- Input data specifications

### 4. Risk Management System
<!-- GUIDANCE: Art. 9 requires a continuous, iterative risk management process.
Reference your Art. 9 risk management documentation by ID. List residual risks
that cannot be fully mitigated and explain why they are acceptable.
Example: "Risk RM-007: model drift under distribution shift — mitigated by monthly
retraining trigger when accuracy drops >5% from baseline." -->
- Reference to Art. 9 risk management documentation
- Known risks and mitigation measures
- Residual risk assessment

### 5. Changes Throughout Lifecycle
<!-- GUIDANCE: Annex IV(6) requires a version history with rationale for each change.
Assess whether each change requires a new conformity assessment. Substantial
modifications (Art. 6(1)(b)) trigger re-assessment.
Example: "v2.3→v2.4: added gender debiasing layer — not a substantial modification
as it improves compliance without changing intended purpose." -->
- Version history
- Changes made and rationale
- Impact of changes on conformity

### 6. Standards and Conformity
<!-- GUIDANCE: List specific harmonised standards (e.g., ISO/IEC 42001, ISO/IEC 23894)
or common specifications. If no harmonised standards exist yet for your AI category,
document which standards you follow and why. State the conformity assessment route
(Annex VI internal control or Annex VII with notified body).
Example: "Following ISO/IEC 42001:2023 for AIMS; Annex VI internal control applied." -->
- Harmonised standards applied
- Common specifications applied
- EU Declaration of Conformity reference
- Conformity assessment route and results

### 7. Post-Market Monitoring Plan
<!-- GUIDANCE: Art. 72 requires proportionate post-market monitoring. Define specific
KPIs, monitoring frequency, and thresholds that trigger corrective action. Include
how user feedback and incident reports feed back into the risk management system.
Example: "Monthly accuracy review, quarterly fairness audit, annual full re-validation.
Corrective action triggered if any metric degrades >10% from baseline." -->
- Reference to Art. 72 monitoring plan
- Key monitoring metrics
- Update schedule
