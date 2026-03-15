# AI Usage Policy — Migration / Border Control

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Migration / Border Control |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Migration/border AI is high-risk under Annex III §7. Covers:
polygraphs/emotion detection at borders, asylum application assessment, visa
assessment, travel document verification, irregular migration detection.
These systems affect fundamental rights (asylum, non-refoulement). Example:
"Covers: AI-assisted visa risk assessment (Annex III §7(b)), automated travel
document verification (Annex III §7(d)), excludes passenger counting and
non-security queue management." -->

This policy governs the use of [AI System Name] within [Organization]'s migration, asylum, or border control operations. It establishes requirements for lawful, fair and rights-respecting use of AI in processing that affects the migration status, freedom of movement, or asylum rights of individuals, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all personnel involved in deploying, operating, supervising, or making decisions informed by AI systems in migration and border management contexts, including border officers, asylum caseworkers, visa processing staff, and supervisory authorities.

## 2. Applicable Legislation
<!-- GUIDANCE: Migration AI intersects with AI Act, GDPR/Law Enforcement
Directive, Asylum Procedures Directive, Schengen Borders Code, and the EU
Charter. Non-refoulement principle (Art. 19 Charter) is paramount.
Example: "Primary: AI Act Annex III §7; Asylum Procedures Directive
(2013/32/EU); Schengen Borders Code (EU 2016/399); GDPR Art. 22 (automated
decisions); Law Enforcement Directive 2016/680; EU Charter Art. 18 (asylum),
Art. 19 (non-refoulement), Art. 47 (effective remedy)." -->

- **EU AI Act** — Annex III §7: AI systems intended to be used by public authorities or on behalf of public authorities in migration, asylum and border control management
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance (representativeness across nationalities and demographics)
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **Schengen Borders Code** (EU 2016/399) — border check procedures
- **Asylum Procedures Directive** (2013/32/EU) — procedural guarantees
- **Qualification Directive** (2011/95/EU) — refugee status determination
- **GDPR** — Art. 22 (automated individual decision-making)
- **Law Enforcement Directive** (2016/680) — where processing for law enforcement
- **EU Charter of Fundamental Rights** — Art. 18 (right to asylum), Art. 19 (non-refoulement), Art. 21 (non-discrimination), Art. 47 (right to effective remedy)

## 3. AI System Description
<!-- GUIDANCE: Specify what migration decision the AI supports/automates.
State whether it's decision support only or has autonomous decision capability.
Clearly define the role: screening, assessment, verification, risk scoring.
Example: "AI-assisted visa application risk scoring. Input: application form
data, travel history, country-of-origin risk indicators. Output: risk score
(low/medium/high) + recommended action. Decision support only — final visa
decision by trained consular officer." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Migration function: [visa assessment / asylum processing / document verification / border screening / irregular migration detection]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: All migration/border AI systems listed in Annex III §7 are
high-risk. Sub-categories: (a) polygraphs/emotion detection at borders,
(b) visa/residence permit risk assessment, (c) asylum application assessment,
(d) irregular migration detection. Example: "High-risk under Annex III §7(b):
AI-assisted visa application risk assessment. Affects: right to enter EU
territory, family reunification, economic migration." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. AI systems used in migration, asylum, and border control are classified as high-risk under Annex III §7.

**Annex III §7 Sub-classification:**
- [ ] §7(a) — Polygraphs or similar tools (emotion detection at border)
- [ ] §7(b) — Risk assessment for visa or residence permit applications
- [ ] §7(c) — Examination of asylum applications (eligibility assessment)
- [ ] §7(d) — Detection of irregular migration (including document verification)

## 5. Data Governance
<!-- GUIDANCE: Migration data is inherently sensitive — nationality, ethnicity,
religion, political opinion may be inferred. GDPR Art. 9 special categories
likely processed. Training data must not encode discrimination against
specific nationalities. Country-of-origin information must be from authoritative
sources (EASO/EUAA COI reports). Example: "Training data: 500K historical visa
decisions, reviewed for nationality bias. Country-of-origin data: EUAA COI
reports only. Statistical parity checked across top-20 nationalities. Proxy
discrimination audit: verified name/nationality correlation not used as
predictive feature." -->

- Training data must be representative across nationalities, ethnicities, and demographic groups
- Historical decision data must be audited for systematic bias before use in training
- Country-of-origin information must be sourced from authoritative reports (EUAA/EASO COI)
- Proxy discrimination must be tested (names, nationalities, languages as proxy for protected characteristics)
- GDPR Art. 9 special category data (religion, ethnicity, political opinion) must not be used as direct features
- Data quality controls must ensure accuracy of identity documents and biographical data
- Data retention must comply with sector-specific requirements and GDPR minimisation

## 6. Human Oversight
<!-- GUIDANCE: Migration decisions affect fundamental rights. Art. 14 human
oversight is critical. No fully automated decision on asylum or visa that
produces legal effects (GDPR Art. 22). Caseworkers must have meaningful
review capability, not rubber-stamping. Example: "All AI risk assessments
reviewed by trained caseworker before decision. Caseworker sees: application
data, AI risk score, contributing factors, similar historical cases, COI
summary. Minimum review time: 15 minutes per case. Caseworker can override
in any direction with documented reasoning." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- No migration or asylum decision with legal effects may be made solely by AI (GDPR Art. 22)
- Trained caseworkers must review all AI-generated assessments before decisions
- Caseworkers must have access to the factors contributing to the AI assessment
- Override procedures must be documented; caseworkers must not be pressured to follow AI recommendations
- Processing time must allow for meaningful human review, not rubber-stamping

## 7. Transparency and Disclosure
<!-- GUIDANCE: Applicants have the right to know AI is used in their case
(Art. 50). For asylum seekers, information must be in a language they understand.
Right to explanation under GDPR Art. 22(3). Right to challenge under
Art. 47 Charter. Example: "All visa applicants informed via application form
in 24 EU languages + Arabic, Farsi, Dari, Tigrinya, Somali: 'AI-assisted risk
assessment is used. You have the right to human review of any decision and
to challenge the decision. Contact: [appeals office].' Asylum seekers: oral
explanation via interpreter at interview." -->

- Applicants must be informed that AI is used in processing their application
- Information must be provided in a language the applicant understands
- The right to human review and to challenge AI-informed decisions must be clearly communicated
- Asylum seekers must receive oral explanation during their interview if AI was used
- AI-generated risk assessments in case files must be clearly marked as AI-produced
- Annual public transparency report on AI system performance and decision statistics

## 8. Fundamental Rights Impact Assessment
<!-- GUIDANCE: Migration AI directly affects fundamental rights (asylum,
non-refoulement, non-discrimination, liberty, family life). Mandatory FRIA
per Art. 27. Must assess: discriminatory impact by nationality/ethnicity,
impact on right to asylum (Art. 18 Charter), risk of refoulement (Art. 19),
impact on children (best interests principle). Example: "FRIA conducted
2026-01-15. Key risks: (1) nationality bias in risk scoring — mitigated by
statistical parity constraints, (2) asylum application rejection bias —
mitigated by mandatory human review, (3) unaccompanied minors — separate
processing pathway without AI." -->

- Fundamental Rights Impact Assessment (FRIA) must be conducted before deployment (Art. 27)
- Assessment must cover: non-discrimination, right to asylum, non-refoulement, right to remedy, children's rights
- Discriminatory impact must be measured across nationalities, ethnicities, and vulnerable groups
- Special provisions must exist for vulnerable persons: unaccompanied minors, victims of trafficking, persons with disabilities
- FRIA must be reviewed annually and upon significant system changes

## 9. Non-Discrimination and Fairness
<!-- GUIDANCE: Migration AI has extreme bias risk — historical data may encode
institutional discrimination. Must test for both direct and proxy discrimination.
Key metrics: approval/denial rates by nationality, demographic parity, equalized
odds. Example: "Statistical parity: visa denial rate differential <5% between
comparable nationality groups (controlling for application quality metrics).
Quarterly audit of approval rates by nationality with disparity reporting
to equality body." -->

- AI system must be tested for discriminatory impact across nationalities and demographic groups
- Statistical parity must be monitored: decision rate differentials across comparable groups
- Proxy discrimination must be prevented: language, name, or nationality must not serve as proxy for protected characteristics
- Regular fairness audits must be conducted and results shared with oversight authority
- Corrective measures must be implemented immediately if discriminatory patterns are detected

## 10. Monitoring and Logging
<!-- GUIDANCE: All AI-informed migration decisions must be auditable for
potential legal challenge. Log completeness is critical for right to remedy.
Decision factors must be retained for appeal periods. Example: "Full decision
log: timestamp, applicant ID, input features, AI risk score, contributing
factors, caseworker decision, reasoning for override (if applicable). Retained
for appeal period + 5 years. Monthly: approval rate by nationality dashboard.
Quarterly: full bias audit. Accessible to: supervisory authority, judicial
review, EUAA audit." -->

- All AI-informed decisions must be logged with: timestamp, input data, AI assessment, contributing factors, human decision, reasoning
- Decision logs must be retained for the applicable appeal period plus 5 years minimum
- System performance must be monitored for decision quality and bias indicators
- Monitoring frequency: monthly statistical analysis, quarterly comprehensive audit
- Logs must be accessible to supervisory authorities, judicial review, and audit bodies

## 11. Incident Response
<!-- GUIDANCE: Migration AI incidents include: wrongful deportation/removal
informed by AI, asylum denial leading to refoulement, systematic nationality
bias discovery. These are fundamental rights violations requiring immediate
action. Example: "Wrongful removal informed by AI: immediate investigation,
case review for all similar decisions in last 6 months, notification to
affected individual, EU AI Act Art. 73 report within 2 days. Systematic
bias discovery: immediate system suspension, full audit, notification to
FRA and EUAA." -->

- Wrongful decisions informed by AI must trigger immediate case review and remediation
- Systematic bias or discrimination discovery must trigger immediate system suspension
- EU AI Act Art. 73 reporting: 2 days (serious harm to fundamental rights), 15 days (other)
- All similar decisions must be reviewed when systematic error is discovered (batch review)
- Affected individuals must be notified and provided with remedy
- Fundamental Rights Agency (FRA) and relevant supervisory authority must be informed

## 12. Training and Awareness
<!-- GUIDANCE: Border/migration officers must understand AI limitations in
cross-cultural context. Include: cultural bias awareness, asylum law, vulnerable
persons identification, override confidence. Example: "12-hour training:
AI system operation (3h), asylum law and non-refoulement (3h), cultural
bias and proxy discrimination (2h), vulnerable persons identification (2h),
override procedures and documentation (2h). Annual recertification with
case study exercises." -->

- All officers and caseworkers must receive training on AI system operation and limitations
- Training must cover: asylum law, non-refoulement, cultural bias awareness, vulnerable persons identification
- Officers must understand AI assessment factors and limitations for different nationalities
- Override procedures and documentation requirements must be practiced
- Refresher training must be provided at least annually and upon significant system changes

## 13. Review Schedule
<!-- GUIDANCE: Migration context changes rapidly (new conflicts, routes,
document types). Frequent review needed. Include geopolitical monitoring.
Example: "Monthly: decision statistics by nationality. Quarterly: bias
audit + geopolitical context review. Semi-annually: full system evaluation
with updated COI data. Annually: FRIA update. Immediate: upon new conflict,
mass displacement event, or relevant CJEU ruling." -->

- This policy shall be reviewed at least quarterly and upon significant geopolitical changes
- Review must incorporate decision statistics, bias audit results, incident reports, and updated COI data
- FRIA must be updated annually and upon new displacement events or conflicts
- Updates must be approved by the Head of Operations and Legal/Compliance Lead

## 14. Approval and Sign-off
<!-- GUIDANCE: Migration AI policy requires sign-off from operational leadership,
legal authority, and fundamental rights officer. Example: "Head of Border
Management confirms operational suitability; Legal Director confirms
compliance with asylum acquis; Fundamental Rights Officer confirms FRIA
completion and Art. 14 oversight adequacy." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Head of Operations | _________________ | _________ |
| Legal Director | _________________ | _________ |
| Fundamental Rights Officer | _________________ | _________ |
| DPO | _________________ | _________ |
