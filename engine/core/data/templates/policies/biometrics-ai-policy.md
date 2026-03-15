# AI Usage Policy — Biometrics / Identification

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Biometrics / Identification |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Biometric AI is always high-risk under Annex III §1. Clearly
distinguish between identification (one-to-many) and verification (one-to-one),
as Art. 5 prohibits certain real-time remote biometric identification uses.
Example: "Covers: employee access control (face verification, one-to-one),
visitor management (badge + face match), excludes real-time remote biometric
identification in publicly accessible spaces." -->

This policy governs the use of [AI System Name] within [Organization]'s biometric processing operations. It establishes requirements for lawful, fair and transparent use of AI in biometric identification, verification, and categorisation, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all personnel involved in deploying, operating, supervising, or being subject to biometric AI systems, including security staff, IT administrators, data protection officers, and all individuals whose biometric data is processed.

## 2. Applicable Legislation
<!-- GUIDANCE: Biometric AI sits at the intersection of AI Act high-risk
requirements, GDPR Art. 9 (biometric data as special category), and potentially
national law enforcement directives. Art. 5 prohibitions apply to certain uses.
Example: "Primary: AI Act Annex III §1 (high-risk biometric systems);
Art. 5(1)(d)-(h) prohibitions; GDPR Art. 9(1) and Art. 35 DPIA mandatory;
national implementations of Law Enforcement Directive 2016/680." -->

- **EU AI Act** — Annex III §1: Biometric identification and categorisation of natural persons
- **Art. 5(1)(d)** — Prohibition on untargeted scraping of facial images from internet or CCTV
- **Art. 5(1)(g)** — Prohibition on biometric categorisation inferring sensitive attributes (race, political opinion, religion, sexual orientation)
- **Art. 5(1)(h)** — Prohibition on real-time remote biometric identification in publicly accessible spaces (exceptions: targeted victim search, prevention of specific imminent threat, serious crime suspects)
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance (biometric data quality and representativeness)
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **GDPR** — Art. 9 (special categories), Art. 35 (DPIA mandatory), Art. 22 (automated decision-making)
- **EU Charter of Fundamental Rights** — Art. 7 (private life), Art. 8 (data protection), Art. 21 (non-discrimination)

## 3. AI System Description
<!-- GUIDANCE: Specify the biometric modality (face, fingerprint, iris, voice,
gait, keystroke). Distinguish identification (1:N) from verification (1:1).
State operating environment (indoor/outdoor, lighting, distance). Example:
"Face verification (1:1) for employee building access. Infrared camera at 0.5-1m
distance, controlled indoor lighting. Template stored on smart card, never in
central database. No emotion recognition, no categorisation." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Biometric modality: [face / fingerprint / iris / voice / gait / multimodal]
- Processing type: [identification (1:N) / verification (1:1) / categorisation]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: All biometric identification systems are high-risk under Annex III §1.
Verify Art. 5 prohibitions do not apply. Document why system does NOT constitute
prohibited real-time remote biometric identification. Example: "High-risk under
Annex III §1(a) (remote biometric identification, non-real-time, law enforcement
with prior judicial authorisation). Art. 5(1)(h) exception: targeted search for
missing child per court order DE-2026-BIO-0034." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. All biometric identification and categorisation systems are classified as high-risk under Annex III §1.

**Art. 5 Prohibition Assessment:**
- [ ] This system does NOT perform real-time remote biometric identification in publicly accessible spaces
- [ ] This system does NOT perform untargeted scraping of facial images
- [ ] This system does NOT perform biometric categorisation to infer sensitive attributes
- [ ] Art. 5 exception applies: [describe if applicable]

## 5. Data Governance
<!-- GUIDANCE: Biometric data is GDPR Art. 9 special category. Training datasets
must be representative across demographics (skin tone, age, gender) to prevent
discriminatory accuracy. Reference NIST FRVT demographic studies. Example:
"Training data: 500K face images, Fitzpatrick skin type distribution: I-II 20%,
III-IV 40%, V-VI 40%. Validated against NIST FRVT for demographic differentials.
False match rate variation <0.5% across all demographic groups." -->

- All biometric data must be processed in compliance with GDPR Art. 9 (special categories)
- Explicit consent or alternative legal basis (Art. 9(2)) must be documented before processing
- Training data must be representative across demographic groups (age, gender, ethnicity, skin tone)
- Accuracy metrics must be disaggregated by demographic group to detect discriminatory performance
- Biometric templates must be stored with appropriate encryption and access controls
- Data retention periods must be defined and enforced; biometric data must be deleted when no longer necessary
- Data provenance and bias audits must be documented

## 6. Human Oversight
<!-- GUIDANCE: Biometric decisions affecting fundamental rights (access denial,
law enforcement identification) MUST have human review before action. Define
escalation for low-confidence matches. Example: "All matches below 95% confidence
require human verification. All law enforcement identifications require two
independent human reviewers. Access denial automatically escalated to security
supervisor for manual override within 5 minutes." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- All biometric identification results must be verified by a qualified operator before any consequential action
- False match and false non-match scenarios must have defined human override procedures
- Low-confidence matches must be escalated for manual review
- The system must support a "stop" function allowing immediate suspension of biometric processing

## 7. Transparency and Disclosure
<!-- GUIDANCE: Data subjects must be informed of biometric processing BEFORE
entering the biometric capture zone. Signage must be prominent and multi-lingual.
Must explain purpose, data controller, retention period, and rights. Example:
"Signage at all building entrances in EN/DE/FR: 'Facial recognition in use for
access control. Controller: [Org]. Data retained 24h. Right to object: [contact].'
Alternative non-biometric access available at reception." -->

- Data subjects must be clearly informed before biometric data is captured
- Prominent signage must be displayed at all points of biometric data capture
- Information must include: purpose, data controller identity, retention period, rights to object
- Non-biometric alternatives must be available where feasible (especially for employees and public access)
- AI-assisted biometric decisions in records must be clearly identified as AI-processed

## 8. Bias and Fairness Assessment
<!-- GUIDANCE: Biometric AI has documented demographic bias risks (NIST FRVT 2019:
false match rates 10-100x higher for certain demographics). Mandatory to test
across Fitzpatrick skin types, age groups, gender. Example: "Quarterly bias audit:
FMR/FNMR by Fitzpatrick type, age bracket (18-30, 31-50, 51+), gender. Maximum
allowed differential: FNMR variance <2x across all groups. Last audit: Q1-2026,
variance 1.3x — PASS." -->

- Accuracy metrics (FMR, FNMR, FRR, FAR) must be measured and reported per demographic group
- Maximum acceptable accuracy differential between demographic groups: [define threshold]
- Bias audits must be conducted at least quarterly using representative test datasets
- Results must be documented and shared with the DPO and oversight committee
- Corrective actions must be implemented if discriminatory performance is detected

## 9. Art. 5 Compliance Checklist
<!-- GUIDANCE: This section is critical for biometric AI. Each Art. 5 prohibition
must be explicitly assessed and documented. Failure to comply = system must be
withdrawn immediately. Example: "Art. 5(1)(d) facial scraping: NOT APPLICABLE —
system uses only enrolled employee photos provided with consent. No internet or
CCTV scraping. Verified by: DPO audit 2026-01-15." -->

| Prohibition | Applies? | Assessment | Verified By | Date |
|-------------|----------|------------|-------------|------|
| Art. 5(1)(d) — Untargeted facial scraping | [ ] Yes / [ ] No | [Assessment] | _________________ | _________ |
| Art. 5(1)(g) — Biometric categorisation (sensitive attributes) | [ ] Yes / [ ] No | [Assessment] | _________________ | _________ |
| Art. 5(1)(h) — Real-time remote biometric ID (public spaces) | [ ] Yes / [ ] No | [Assessment] | _________________ | _________ |
| Art. 5(1)(f) — Emotion recognition (workplace/education) | [ ] Yes / [ ] No | [Assessment] | _________________ | _________ |

## 10. Monitoring and Logging
<!-- GUIDANCE: Biometric systems must log all match attempts (not biometric
templates themselves — those are special category data). Track accuracy metrics
in production. Retention must balance accountability vs. GDPR minimisation.
Example: "Log: timestamp, match result (Y/N), confidence score, camera ID,
decision (grant/deny/escalate). NO biometric template in logs. Retained 90 days.
Weekly accuracy dashboard reviewed by security manager." -->

- All biometric match attempts must be logged with: timestamp, result, confidence score, operator action
- Biometric templates and raw biometric data must NOT be included in operational logs
- System performance must be monitored for accuracy drift and anomalous patterns
- Monitoring frequency: [continuous/daily/weekly] with security team oversight
- Logs must be retained for [period] in compliance with GDPR data minimisation

## 11. Incident Response
<!-- GUIDANCE: Biometric incidents include false identification leading to wrongful
action, data breaches of biometric data (GDPR Art. 33/34 mandatory notification),
and system spoofing. Biometric data breaches are irrevocable — compromised
biometric data cannot be changed. Example: "Biometric data breach: immediate
containment, GDPR Art. 33 notification to DPA within 72h, Art. 34 notification
to data subjects if high risk. System suspension until forensic review complete.
Affected templates revoked and re-enrolled with new liveness detection." -->

- Biometric data breaches must be reported to the DPA within 72 hours (GDPR Art. 33)
- Data subjects must be notified without undue delay if the breach is likely to result in high risk (GDPR Art. 34)
- False identification leading to adverse action must trigger immediate investigation and remediation
- The AI system must be suspended if systematic accuracy degradation or spoofing is detected
- All incidents must be documented with root cause analysis and corrective measures

## 12. Training and Awareness
<!-- GUIDANCE: Operators must understand biometric accuracy limitations, false
match consequences, and escalation procedures. Include anti-bias training.
Example: "8-hour training: biometric fundamentals, system operation, false
match/non-match handling, demographic bias awareness, override procedures,
GDPR rights of data subjects. Annual recertification." -->

- All operators must receive training on biometric system operation and limitations
- Training must cover: accuracy metrics interpretation, false match handling, bias awareness, data subject rights
- Competency assessment must be completed before independent system operation
- Refresher training must be provided at least annually and upon significant system updates

## 13. Review Schedule
<!-- GUIDANCE: Biometric technology evolves rapidly (presentation attacks,
deepfakes). Frequent review needed. Include technology horizon scanning.
Example: "Quarterly: accuracy metrics + bias audit. Semi-annual: presentation
attack detection effectiveness. Annual: full system re-evaluation including
new attack vectors (deepfakes, 3D masks). Immediate: upon Art. 5 prohibition
scope changes or new EDPB guidance." -->

- This policy shall be reviewed at least semi-annually and upon any significant change to the AI system
- Review must incorporate accuracy data, bias audit results, incident reports, and regulatory updates
- Technology horizon scanning must assess new threats (deepfakes, presentation attacks)
- Updates must be approved by the DPO and Security Committee

## 14. Approval and Sign-off
<!-- GUIDANCE: Biometric AI policy requires sign-off from both security leadership
and data protection. DPO involvement is mandatory (GDPR Art. 9 + Art. 35 DPIA).
Example: "CISO confirms security adequacy; DPO confirms GDPR Art. 9 compliance
and DPIA completion; Legal confirms Art. 5 prohibition assessment." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Chief Information Security Officer | _________________ | _________ |
| DPO | _________________ | _________ |
| Legal / Compliance Lead | _________________ | _________ |
