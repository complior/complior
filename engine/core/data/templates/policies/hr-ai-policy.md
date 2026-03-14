# AI Usage Policy — HR / Employment

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — HR / Employment |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Define the exact AI systems covered and their HR use cases.
Art. 26(1) requires deployers to use systems per provider instructions.
Scope must include ALL personnel affected — operators, subjects of decisions,
and supervisors. Example: "HireVue video interviews (recruitment), Workday
Peakon (engagement surveys), internal ML pipeline (attrition prediction)." -->

This policy governs the use of [AI System Name] within [Organization]'s human resources and employment processes. It establishes requirements for lawful, transparent and non-discriminatory use of AI in recruitment, performance evaluation, and workforce management, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all personnel involved in operating, supervising, or being affected by AI-assisted HR decisions.

## 2. Applicable Legislation
<!-- GUIDANCE: Annex III §6(a) makes HR AI high-risk. Cross-reference GDPR Art. 22
(automated decisions) and national employment law. Identify which national
transposition laws apply to your jurisdiction. Example: In Germany, also reference
§26 BDSG (employee data processing) and BetrVG §87(1)(6) (works council rights). -->

- **EU AI Act** — Annex III §6(a): AI systems intended to be used for recruitment or selection of natural persons, for making decisions affecting terms of work-related relationships
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 13** — Transparency and provision of information to deployers
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **Art. 27** — Fundamental rights impact assessment for high-risk AI
- **GDPR** — Art. 22 (automated individual decision-making), Art. 35 (DPIA)
- **EU Charter of Fundamental Rights** — Art. 21 (non-discrimination), Art. 31 (fair working conditions)

## 3. AI System Description
<!-- GUIDANCE: Be specific about what the AI system does — "assists with hiring"
is too vague. Describe the exact decision points where AI is involved and what
data it processes. Example: "Scores CVs on 12 criteria, generates shortlist of
top 20% candidates, provides interview question suggestions based on role profile." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: All HR AI for recruitment/selection is high-risk under Annex III §6(a).
If your system falls outside §6(a), document the exact reasoning. Consider whether
the system could be used for purposes that would make it high-risk even if the
primary use is not. Example: "High-risk per Annex III §6(a) — used for candidate
screening affecting access to employment." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. HR/employment AI systems used for recruitment, selection, or decisions affecting terms of work-related relationships are classified as high-risk under Annex III §6(a).

## 5. Data Governance
<!-- GUIDANCE: Art. 10 requires data governance for high-risk AI. Identify bias
risks in training data — historical hiring data often encodes past discrimination.
Prohibit use of protected characteristics as inputs, including proxy variables
(e.g., postcode correlating with ethnicity). Example: "Training data audited for
gender balance — 48% female representation vs. 52% in applicant pool." -->

- All training and input data must be assessed for bias and representativeness before use
- Personal data processing must comply with GDPR, with a lawful basis identified for each processing activity
- Data used for candidate screening or employee evaluation must be relevant, adequate, and not excessive
- Special category data (Art. 9 GDPR) must not be processed unless a specific exemption applies
- Data retention periods must be defined and enforced for all AI-processed HR data

## 6. Human Oversight
<!-- GUIDANCE: Art. 14 requires meaningful human oversight, not rubber-stamping.
The reviewer must have authority AND competence to override AI outputs. GDPR Art. 22
prohibits fully automated decisions with legal effects without safeguards.
Example: "HR manager reviews all AI-generated shortlists before candidate contact;
minimum 15-minute review per shortlist, documented in ATS." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- No fully automated decisions shall be made that produce legal effects or similarly significantly affect natural persons without meaningful human review
- All AI-generated shortlists, scores, or recommendations must be reviewed by qualified HR personnel before action
- Human reviewers must have the authority and ability to override or disregard AI outputs

## 7. Transparency and Disclosure
<!-- GUIDANCE: Art. 26(7) requires informing workers. GDPR Art. 13-14 requires
informing candidates about automated processing. Provide disclosure BEFORE the
AI-assisted process begins, not after. Example: "Candidate portal displays AI
disclosure at application start: 'Your application will be screened using AI.
You may request human-only review.'" -->

- Candidates and employees must be informed before any AI-assisted decision-making process begins
- Information provided must include: the fact that AI is used, its purpose, the logic involved, and potential consequences
- Worker representatives and works councils must be consulted where required by national law
- All AI-generated assessments must be clearly marked as AI-assisted

## 8. Anti-Discrimination and Worker Rights
<!-- GUIDANCE: Charter Art. 21 (non-discrimination) is paramount. Conduct bias
audits disaggregated by gender, ethnicity, age, and disability. Set quantitative
thresholds for acceptable differential impact. Example: "Quarterly bias audit:
selection rate ratio between demographic groups must exceed 0.8 (four-fifths rule).
If below, system suspended pending investigation." -->

- Regular bias audits must be conducted on AI system outputs, disaggregated by protected characteristics
- The system must not use proxy variables that correlate with protected characteristics (gender, ethnicity, age, disability)
- Impact assessments must evaluate differential treatment across demographic groups
- Remediation procedures must be in place for identified discriminatory outcomes
- Workers retain the right to contest AI-assisted decisions through established grievance procedures

## 9. Works Council and Employee Representation
<!-- GUIDANCE: Check national transposition of European Works Council Directive.
In many EU member states, AI deployment requires formal consultation or co-determination
with employee representatives. Document consultation process and outcomes.
Example: In France, CSE consultation required under Art. L2312-38 Code du travail. -->

- Works councils or employee representatives must be informed and consulted before AI system deployment, as required by national transposition of the European Works Council Directive
- Employee representatives must have access to relevant system documentation and audit results
- Consultation processes must be documented and their outcomes incorporated into deployment decisions

## 10. Monitoring and Logging
<!-- GUIDANCE: Art. 26(6) requires log retention for at least 6 months. HR-specific
retention should align with employment law (often 3+ years for discrimination claims).
Track both system metrics (accuracy, speed) and fairness metrics (demographic parity).
Example: "Logs retained 5 years per employment tribunal limitation period." -->

- All AI-assisted decisions must be logged with sufficient detail for auditability
- System performance must be monitored for accuracy, fairness, and bias on a [quarterly/monthly] basis
- Key performance indicators must include: accuracy, false positive/negative rates, demographic parity metrics
- Logs must be retained for the period required by applicable employment law (minimum 3 years)

## 11. Incident Response
<!-- GUIDANCE: Define what constitutes an "incident" in HR context: pattern of
discriminatory outcomes, candidate complaint of unfair treatment, system making
decisions outside its intended scope. Suspension criteria must be specific.
Example: "System suspended if: (a) bias audit fails four-fifths rule, (b) >3
candidate complaints in 30 days, (c) system scores >100 candidates without
human review." -->

- Any suspected discriminatory outcome or system malfunction must be reported immediately
- The AI system must be suspended if a pattern of discriminatory outcomes is detected
- Affected candidates or employees must be notified and offered alternative assessment
- Incidents must be reported to the relevant market surveillance authority where required

## 12. Training and Awareness
<!-- GUIDANCE: Art. 4 requires AI literacy. HR staff using AI need Level 2 training
(operator level) covering bias recognition and override procedures. Training must
be role-specific, not generic AI awareness. Example: "Recruiters complete 4-hour
Level 2 training including: interpreting AI scores, override procedure, bias
indicators, complaint handling. Annual refresh required." -->

- All HR personnel using the AI system must receive training on its operation, limitations, and oversight responsibilities
- Training must cover: bias recognition, override procedures, data protection obligations, and complaint handling
- Refresher training must be provided at least annually and when significant system updates occur

## 13. Review Schedule
<!-- GUIDANCE: Annual minimum review, but trigger-based review is equally important.
Triggers include: new AI system adoption, bias audit findings, regulatory updates,
significant system updates from provider. Example: "Annual review in Q1; ad-hoc
review triggered by provider updates, bias audit alerts, or >2 incidents." -->

- This policy shall be reviewed at least annually and upon any significant change to the AI system
- Review must include analysis of monitoring data, incident reports, and bias audit results
- Updates must be communicated to all affected personnel and worker representatives

## 14. Approval and Sign-off
<!-- GUIDANCE: Minimum sign-offs: Policy Owner, HR Director, DPO, and Works Council
Representative (where applicable). In jurisdictions with co-determination rights,
Works Council sign-off may be legally required. Example: "Works Council representative
signs to confirm Art. L2312-38 consultation was completed and outcomes incorporated." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| HR Director | _________________ | _________ |
| DPO | _________________ | _________ |
| Works Council Representative | _________________ | _________ |
