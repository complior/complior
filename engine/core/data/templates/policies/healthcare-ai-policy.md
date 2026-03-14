# AI Usage Policy — Healthcare / Medical

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Healthcare / Medical |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Healthcare AI may be regulated as both a high-risk AI system AND
a medical device (MDR). Scope must clearly state which regulatory framework(s)
apply. Include ALL clinical and administrative AI systems.
Example: "Covers: diagnostic imaging AI (MDR Class IIa + AI Act high-risk),
patient scheduling AI (AI Act limited-risk), clinical NLP (AI Act high-risk)." -->

This policy governs the use of [AI System Name] within [Organization]'s healthcare operations. It establishes requirements for safe, effective and transparent use of AI in clinical decision support, diagnostic assistance, patient monitoring, and medical data processing, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all healthcare professionals, technical staff, and administrative personnel involved in operating, supervising, or being affected by AI-assisted medical decisions.

## 2. Applicable Legislation
<!-- GUIDANCE: Healthcare AI sits at the intersection of AI Act, MDR/IVDR, and
GDPR Art. 9 (health data). If the AI qualifies as a medical device, MDR takes
precedence for safety — AI Act adds transparency and monitoring requirements.
Example: "Primary: MDR (EU 2017/745) for device classification; supplementary:
AI Act Art. 6(1) high-risk obligations; GDPR Art. 9(2)(h) for health data." -->

- **EU AI Act** — Annex III §5(a): AI systems intended to be used as safety components in the management and operation of critical digital infrastructure, road traffic, or in the supply of water, gas, heating or electricity
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **Medical Devices Regulation** (EU 2017/745, MDR) — where AI qualifies as a medical device
- **In Vitro Diagnostic Regulation** (EU 2017/746, IVDR) — where applicable
- **GDPR** — Art. 9 (special categories of personal data), Art. 22, Art. 35
- **EU Charter of Fundamental Rights** — Art. 3 (right to integrity), Art. 35 (health care)

## 3. AI System Description
<!-- GUIDANCE: For clinical AI, describe the intended clinical pathway and where
the AI output fits in the decision process. Specify whether it's screening,
diagnostic, prognostic, or therapeutic. Example: "Chest X-ray AI (screening):
flags potential pneumothorax on emergency department X-rays, output: binary
flag + confidence score, radiologist reviews all flagged cases within 30 minutes." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: Healthcare AI is typically high-risk under AI Act. If it also
qualifies as a medical device, it has DUAL classification (MDR + AI Act).
Document both classifications. Example: "AI Act: high-risk (medical device AI);
MDR: Class IIa (decision support software, Rule 11); IVDR: not applicable." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. Healthcare AI systems that qualify as medical devices or are used in clinical decision-making are typically classified as high-risk.

## 5. Data Governance
<!-- GUIDANCE: Health data is GDPR Art. 9 special category requiring explicit
legal basis (typically Art. 9(2)(h) — healthcare provision). Training data must
represent the target patient population to avoid clinical bias. Example: "Legal
basis: Art. 9(2)(h); training data: 100K chest X-rays from 12 EU hospitals,
validated for demographic representation (age, sex, ethnicity distribution
matching EU population ±5%)." -->

- All patient data must be processed in compliance with GDPR Art. 9 (special categories)
- Data minimisation: only clinically necessary data shall be provided to the AI system
- Training data must be representative of the target patient population
- Data quality controls must ensure accuracy and completeness of clinical inputs
- De-identification or pseudonymisation must be applied where full identification is not clinically required
- Data provenance and lineage must be documented for all datasets used

## 6. Human Oversight
<!-- GUIDANCE: Clinical AI MUST be decision support only — never autonomous
clinical decisions. The clinician must have access to the underlying data,
not just the AI recommendation. Display confidence levels to support clinical
judgment. Example: "AI output displayed alongside original imaging; clinician
sees confidence score, similar historical cases, and known limitations for
the patient's demographics." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- The AI system must be used as a decision support tool only; final clinical decisions rest with qualified healthcare professionals
- Clinicians must have the ability to override, modify, or disregard any AI-generated recommendation
- AI outputs must be presented alongside confidence levels and relevant limitations

## 7. Transparency and Disclosure
<!-- GUIDANCE: Patient information must be appropriate to comprehension level
and clinical context. In emergency settings, disclosure may be post-hoc.
Clinical records must clearly distinguish AI-generated from clinician-generated
content. Example: "Pre-admission: patient informed via consent form; emergency:
post-hoc disclosure within 24 hours; clinical notes: AI outputs prefixed
with '[AI-ASSIST]' in EHR." -->

- Patients must be informed when AI is used in their care pathway
- Information provided must be clear, accessible and appropriate to the patient's comprehension level
- Healthcare professionals must have access to information about the AI system's intended use, limitations and performance characteristics
- AI-generated outputs in clinical records must be clearly identified as AI-assisted

## 8. Patient Safety and Clinical Validation
<!-- GUIDANCE: Clinical validation must follow established methodologies
(prospective studies, comparison with standard of care). Report adverse events
through pharmacovigilance systems. Define fail-safe mechanisms for system outage.
Example: "Validated in prospective study (n=5,000), sensitivity 94%, specificity
89% vs. standard of care (radiologist): sensitivity 92%, specificity 91%.
Fail-safe: automatic fallback to manual queue if system unavailable >5 min." -->

- The AI system must have undergone clinical validation appropriate to its intended use
- Clinical evidence must demonstrate safety and performance in the target patient population
- Adverse events potentially related to AI system outputs must be reported through pharmacovigilance/medical device vigilance systems
- Regular clinical performance reviews must assess diagnostic accuracy, sensitivity, specificity, and clinical outcome impact
- Fail-safe mechanisms must ensure patient care is not compromised if the AI system becomes unavailable

## 9. Medical Device Classification
<!-- GUIDANCE: Use MDR classification rules (esp. Rule 11 for software) to
determine device class. Software intended to provide diagnostic/prognostic
information is typically Class IIa or higher. CE marking is mandatory before
clinical use. Example: "Classified Class IIa per MDR Rule 11 (software providing
information used to make clinical decisions). CE marked, Notified Body: BSI
(NB 0086), Certificate: CE-2025-AI-0042." -->

- If the AI system qualifies as a medical device under MDR (EU 2017/745), it must bear a valid CE marking
- The system's risk class under MDR (Class I, IIa, IIb, or III) must be documented
- Post-market surveillance requirements under MDR must be followed
- Any software updates that affect the intended purpose must undergo conformity reassessment
- Current classification: [To be determined by qualified regulatory affairs personnel]

## 10. Monitoring and Logging
<!-- GUIDANCE: Clinical AI monitoring must track both technical metrics AND
clinical outcomes. Correlate AI recommendations with actual patient outcomes
over time. Medical record retention typically 10+ years.
Example: "Track: AI sensitivity/specificity monthly, patient outcomes at 30/90/365
days, false negative rate with clinical impact. Logs retained 15 years per
national medical records legislation." -->

- All AI-assisted clinical recommendations must be logged with timestamps, inputs, and outputs
- System performance must be monitored for clinical accuracy and safety signals
- Key metrics: diagnostic accuracy, sensitivity, specificity, positive/negative predictive values
- Monitoring frequency: [continuous/weekly/monthly] with clinical review committee oversight
- Logs must be retained in compliance with medical record retention requirements

## 11. Incident Response
<!-- GUIDANCE: Clinical AI incidents may be medical device vigilance events
requiring reporting to competent authority (e.g., under MDR Art. 87). 24-hour
reporting for death/serious health deterioration. Define clear suspension criteria.
Example: "Immediate suspension if: false negative leads to missed critical
diagnosis, or >3 clinician overrides in 24 hours for same error type.
MDR vigilance report within 24 hours for serious incidents." -->

- Any adverse event potentially related to AI system outputs must be reported within 24 hours
- The AI system must be immediately suspended if a patient safety concern is identified
- Affected patients must be identified, assessed, and managed according to clinical protocols
- Serious incidents must be reported to the competent authority for medical devices and market surveillance
- Root cause analysis must be conducted for all AI-related clinical incidents

## 12. Training and Awareness
<!-- GUIDANCE: Healthcare professionals need clinical application training,
not just generic AI training. Include when to trust vs. question AI output,
and how to document AI-assisted decisions in clinical records.
Example: "4-hour clinical training: AI output interpretation, override
procedure, adverse event reporting, EHR documentation standards.
Competency test required before independent use." -->

- All healthcare professionals using the AI system must receive clinical application training
- Training must cover: intended use, limitations, override procedures, adverse event reporting, and data protection
- Competency assessment must be completed before independent use of the system
- Refresher training must be provided at least annually and upon significant system updates

## 13. Review Schedule
<!-- GUIDANCE: Align with clinical governance review cycles. Consider patient
outcome data availability (30/90/365 day endpoints). Update when clinical
guidelines change or new evidence emerges. Example: "Quarterly Clinical
Governance Committee review; annual full re-validation with updated patient
outcome data; immediate review if clinical guidelines change." -->

- This policy shall be reviewed at least annually and upon any significant change to the AI system
- Review must incorporate clinical performance data, incident reports, and regulatory updates
- Updates must be approved by the Clinical Governance Committee

## 14. Approval and Sign-off
<!-- GUIDANCE: Clinical AI policy requires sign-off from clinical leadership.
CMO or equivalent takes clinical responsibility. Clinical Governance Lead
confirms alignment with clinical governance framework.
Example: "CMO sign-off confirms clinical safety; DPO confirms GDPR Art. 9
compliance; Clinical Governance Lead confirms alignment with Trust clinical
governance framework." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Chief Medical Officer | _________________ | _________ |
| DPO | _________________ | _________ |
| Clinical Governance Lead | _________________ | _________ |
