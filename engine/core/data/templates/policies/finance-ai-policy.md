# AI Usage Policy — Finance / Credit

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Finance / Credit |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Annex III §5(b) makes credit scoring AI high-risk. Scope must
cover all AI-assisted financial decisions, including fraud detection and insurance
underwriting. Include third-party models (e.g., bureau scores enhanced with AI).
Example: "Covers: credit scoring (FICO AI), fraud detection (Featurespace),
AML screening (Comply Advantage), insurance pricing (in-house ML model)." -->

This policy governs the use of [AI System Name] within [Organization]'s financial services operations. It establishes requirements for fair, transparent and accountable use of AI in creditworthiness assessment, insurance underwriting, fraud detection, and other financial decision-making processes, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all personnel and systems involved in operating, supervising, or relying on AI-assisted financial decisions.

## 2. Applicable Legislation
<!-- GUIDANCE: Financial AI has multiple overlapping regulatory frameworks.
Cross-reference Consumer Credit Directive, MiFID II (investment advice), IDD
(insurance), and PSD2 (payment fraud). National financial regulators may have
additional AI-specific guidance. Example: In Netherlands, reference DNB guidance
on AI in financial services (2019) alongside EU AI Act requirements. -->

- **EU AI Act** — Annex III §5(b): AI systems intended to be used for the evaluation of creditworthiness of natural persons or for establishing their credit score
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 13** — Transparency and provision of information to deployers
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **GDPR** — Art. 22 (automated individual decision-making), Art. 35 (DPIA)
- **Consumer Credit Directive** (2008/48/EC) — creditworthiness assessment obligations
- **MiFID II** / **IDD** — where applicable to investment/insurance AI
- **EU Charter of Fundamental Rights** — Art. 21 (non-discrimination)

## 3. AI System Description
<!-- GUIDANCE: For credit scoring, describe the model type, key features used,
score range, and decision boundaries. Specify whether the model makes or
recommends decisions. Example: "Gradient boosted model using 45 features
(income, employment history, credit utilization — no protected characteristics),
output: risk score 0-1000, threshold 450 for auto-approval, 300-449 for
manual review, <300 auto-decline." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: Credit scoring/assessment AI is explicitly high-risk per Annex III
§5(b). Insurance underwriting AI may also be high-risk if it affects access to
essential services. Fraud detection may be limited-risk unless it affects individual
rights. Example: "Credit scoring: high-risk (Annex III §5(b)); fraud detection:
limited risk (flagging only, human reviews all blocks)." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. AI systems used for creditworthiness assessment or credit scoring of natural persons are classified as high-risk under Annex III §5(b).

## 5. Data Governance
<!-- GUIDANCE: Art. 10 data governance is critical for financial AI. Historical
data often encodes redlining and other discriminatory patterns. Validate data
sources periodically. Prohibit use of protected characteristics as proxies.
Example: "Postcode removed as feature in v2.0 after analysis showed correlation
with ethnicity (r=0.72). Alternative: distance-to-branch feature (r=0.12)." -->

- Input data must be verified for accuracy, completeness and relevance before model consumption
- Historical data used for training must be assessed for embedded societal biases
- Data sources must be documented and their reliability periodically validated
- Special category data must not be used as direct or proxy inputs without explicit legal basis
- Data lineage must be maintained for all model inputs and outputs

## 6. Human Oversight
<!-- GUIDANCE: GDPR Art. 22 gives individuals the right not to be subject to
fully automated decisions with legal effects. Credit decisions have legal effects.
Ensure meaningful human review — not just clicking 'approve.' Define competency
requirements for reviewers. Example: "Credit officers must hold CFA Level 1+
and complete 8-hour AI oversight training. Manual review required for all
scores within 50 points of threshold." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- No credit decision with legal effects shall be made solely by the AI system without human review
- Credit officers must have the competence and authority to override AI-generated scores and recommendations
- Override decisions must be documented with rationale

## 7. Transparency and Disclosure
<!-- GUIDANCE: Consumer Credit Directive requires explanation of credit decisions.
Art. 86 EU AI Act adds right to explanation for AI-affected decisions. Provide
both the decision and the top contributing factors in plain language.
Example: "Rejection letter includes: 'Primary factors: insufficient credit history
(weighted 35%), high credit utilization (weighted 25%), short employment tenure
(weighted 20%).'" -->

- Applicants must be informed that AI is used in the assessment process before or at the time of application
- Rejected applicants must receive meaningful explanation of the principal factors affecting the decision
- The methodology for credit scoring must be explainable in terms understandable to the consumer
- Regulatory authorities must have access to model documentation upon request

## 8. Model Validation and Fairness Metrics
<!-- GUIDANCE: Financial regulators expect independent model validation (ECB Guide).
Use multiple fairness metrics — they can conflict, so document trade-offs explicitly.
Include stress testing under adverse scenarios. Example: "Annual independent
validation by Risk Model Validation team. Metrics: demographic parity (target >0.8),
equal opportunity (target >0.85), predictive parity (target >0.8). Gini >0.40
required for production deployment." -->

- The AI model must undergo independent validation before deployment and after significant changes
- Validation must include: back-testing, sensitivity analysis, and stress testing
- Fairness metrics must be computed across protected characteristics: demographic parity, equal opportunity, predictive parity
- Model performance must be benchmarked against established statistical methods
- Model drift monitoring must be in place with defined thresholds for re-validation triggers

## 9. Regulatory Reporting
<!-- GUIDANCE: National financial regulators may require model risk reports.
ECB/EBA expect documented model governance. Material model changes should be
reported through established channels. Example: "Annual Model Risk Report
submitted to BaFin (Germany) per MaRisk AT 4.3.5. Material model changes
reported within 30 days via standard regulatory template." -->

- All AI-assisted credit decisions must be traceable and reportable to regulatory authorities
- Model risk management documentation must comply with supervisory expectations (e.g., ECB Guide on internal models)
- Material model changes must be reported through established regulatory channels
- Annual model performance reports must be prepared for internal governance and regulatory review

## 10. Monitoring and Logging
<!-- GUIDANCE: Financial record-keeping typically requires 5+ year retention.
Monitor both model performance (Gini, KS) and fairness metrics continuously.
Alert on drift before it impacts decisions. Example: "Real-time monitoring:
Population Stability Index (PSI) threshold 0.2, Gini monitoring weekly,
fairness metrics monthly. Logs retained 7 years per MiFID II requirements." -->

- All AI-assisted financial decisions must be logged with complete audit trails
- System performance must be monitored continuously for accuracy, stability and fairness
- Key metrics: approval rates, default prediction accuracy, Gini coefficient, KS statistic, fairness ratios
- Anomaly detection must be in place for unusual patterns in AI outputs
- Logs must be retained in compliance with financial record-keeping requirements (minimum 5 years)

## 11. Incident Response
<!-- GUIDANCE: Financial AI incidents can trigger immediate regulatory notification.
Define "material model failure" with quantitative criteria. Customer remediation
must include reassessment and correction of affected decisions.
Example: "Material failure: >5% unexpected default rate deviation, or fairness
ratio <0.7 for any demographic group. Affected customers reassessed within
5 business days using alternative methodology." -->

- Any suspected unfair lending outcome or model malfunction must be escalated immediately
- The AI system must be suspended if systematic bias or material accuracy degradation is detected
- Affected customers must be notified and offered reassessment through alternative means
- Incidents must be reported to relevant financial regulators and market surveillance authorities

## 12. Training and Awareness
<!-- GUIDANCE: Credit officers need domain-specific AI training beyond general
AI literacy. Cover model interpretability, how to question AI recommendations,
and when to override. Example: "Credit officers: 8-hour domain training covering
feature importance interpretation, SHAP values reading, override justification
documentation, regulatory obligations. Annual refresh." -->

- All credit officers and risk analysts using the AI system must receive training on its operation, limitations and override procedures
- Training must cover: model interpretability, fairness assessment, regulatory obligations, and escalation procedures
- Refresher training must be provided at least annually and upon model updates

## 13. Review Schedule
<!-- GUIDANCE: Financial model governance typically requires annual full review
and quarterly performance monitoring. Align with existing model risk management
frameworks (MRM). Example: "Annual full review by Model Risk Committee. Quarterly
performance review by Risk Analytics. Ad-hoc review triggered by PSI >0.2
or fairness ratio <0.8." -->

- This policy shall be reviewed at least annually and upon any material model change
- Review must incorporate monitoring data, validation results, incident reports, and regulatory feedback
- Updates must be approved by the Model Risk Management Committee

## 14. Approval and Sign-off
<!-- GUIDANCE: Financial AI policy requires sign-off from risk management.
Consider including Head of Credit/Lending and Head of Compliance. Regulatory
expectation: senior management ownership of AI model risk.
Example: "CRO sign-off demonstrates senior management ownership per ECB
expectations. Compliance Officer confirms regulatory alignment." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Chief Risk Officer | _________________ | _________ |
| DPO | _________________ | _________ |
| Compliance Officer | _________________ | _________ |
