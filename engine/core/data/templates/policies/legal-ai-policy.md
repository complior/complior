# AI Usage Policy — Legal / Justice

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Legal / Justice |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Annex III §8(a) makes judicial/legal AI high-risk. Scope must
address professional privilege implications — use of AI in legal work creates
novel confidentiality risks. Include ALL AI tools used by legal staff.
Example: "Covers: Harvey (contract review), Lexis+ AI (legal research),
in-house NLP (case analysis), Copilot (general drafting)." -->

This policy governs the use of [AI System Name] within [Organization]'s legal operations. It establishes requirements for ethical, confidential and accountable use of AI in legal research, case analysis, contract review, and legal decision support, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all legal professionals, support staff, and personnel involved in operating, supervising, or relying on AI-assisted legal analysis and decisions.

## 2. Applicable Legislation
<!-- GUIDANCE: Legal AI intersects EU AI Act with professional conduct rules
(bar association regulations, solicitor regulation). ECHR Art. 6 (fair trial)
is relevant when AI assists judicial decisions. Check national bar rules on
AI use. Example: In Germany, reference BRAO §43a (duty of care) and BDSG
§22 (processing of special categories). -->

- **EU AI Act** — Annex III §8(a): AI systems intended to be used by a judicial authority or on their behalf to assist in researching and interpreting facts and the law and in applying the law to a concrete set of facts
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **GDPR** — Art. 22 (automated individual decision-making), Art. 35 (DPIA)
- **EU Charter of Fundamental Rights** — Art. 47 (right to effective remedy and fair trial), Art. 48 (presumption of innocence)
- **European Convention on Human Rights** — Art. 6 (right to a fair trial)
- **Professional conduct rules** — applicable bar association and law society regulations

## 3. AI System Description
<!-- GUIDANCE: Describe the specific legal tasks the AI performs. Distinguish
between research assistance (finding cases) and analytical assistance (predicting
outcomes, drafting arguments). Example: "AI legal research: searches case law
database, returns relevant cases with relevance scores. Does NOT provide legal
analysis or outcome prediction. All results verified by qualified lawyer." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: AI assisting judicial authorities is high-risk per Annex III §8(a).
AI used for internal law firm operations (billing, scheduling) may be lower risk.
Document classification per system. Example: "Case analysis AI: high-risk
(Annex III §8(a)); time recording AI: minimal risk (administrative)." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. AI systems intended for use by judicial authorities or in legal proceedings are classified as high-risk under Annex III §8(a).

## 5. Data Governance
<!-- GUIDANCE: Legal privilege creates unique data governance challenges. Client
data must NEVER be used for AI model training or shared with providers. Verify
provider's data handling (does the model learn from inputs?). Example: "Provider
contractual guarantee: zero data retention, no model training on inputs.
Client matters segregated by matter ID. No cross-matter data leakage possible." -->

- Client data must be processed in compliance with professional privilege and confidentiality obligations
- Data minimisation: only legally relevant information shall be provided to the AI system
- Case data must be segregated to prevent cross-contamination between client matters
- Third-party AI providers must not retain or use client data for training or other purposes
- Data residency requirements must comply with applicable legal professional regulations
- Document retention and destruction policies must account for AI-processed materials

## 6. Human Oversight
<!-- GUIDANCE: Professional duty of competence requires lawyers to understand
AI limitations. AI outputs are tools, not substitutes for professional judgment.
Every AI-generated citation must be independently verified — LLMs hallucinate
legal citations. Example: "Mandatory verification checklist before any
AI-assisted document is filed: (1) all citations verified in primary source,
(2) all statutory references current, (3) jurisdictional applicability confirmed." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- The AI system must be used as a research and analysis tool only; legal judgments and advice must be provided by qualified legal professionals
- Legal professionals must independently verify all AI-generated legal citations, case references, and statutory interpretations
- AI outputs must not be presented to clients or courts without professional review and validation

## 7. Transparency and Disclosure
<!-- GUIDANCE: Professional conduct rules may require disclosure of AI use to
clients and courts. Check applicable bar rules. Some jurisdictions require
informing opposing counsel. Example: "Client engagement letter updated to
include: 'We may use AI tools to assist with legal research and document
review. All AI-assisted work is reviewed by qualified lawyers.'" -->

- Clients must be informed when AI tools are used in the handling of their matter
- The extent and nature of AI involvement must be disclosed as required by professional conduct rules
- Courts and tribunals must be informed of AI assistance where required by procedural rules
- AI-assisted legal documents must be reviewed and adopted as the professional's own work product

## 8. Professional Confidentiality and Ethics
<!-- GUIDANCE: Attorney-client privilege may be waived if confidential data is
shared with third-party AI providers without adequate safeguards. Conduct privilege
impact assessment for each AI tool. Example: "Privilege risk assessment: Harvey
(API deployment, no data retention — LOW risk); ChatGPT (shared model —
HIGH risk, restricted to non-privileged research only)." -->

- Attorney-client privilege and legal professional privilege must be maintained when using AI systems
- Data processed by the AI system must not be accessible to third parties, including the AI provider, in a manner that could waive privilege
- Conflict of interest checks must account for information processed by the AI system
- AI use must comply with the professional duty of competence — lawyers must understand the AI tool's capabilities and limitations
- The duty of independent professional judgment must not be delegated to AI systems

## 9. Unauthorized Practice Prevention
<!-- GUIDANCE: AI outputs that reach clients without lawyer review may constitute
unauthorized practice of law. Implement technical controls (access restrictions)
and procedural controls (review requirements). Example: "AI legal research tool
restricted to lawyer login only. Output watermarked: 'AI-generated — requires
lawyer review. Not legal advice.' Client portal has no AI-direct access." -->

- AI system outputs must not constitute legal advice to the public without professional intermediation
- Access controls must ensure that only qualified legal professionals can generate and interpret AI legal analysis
- AI-generated legal documents must not be filed or distributed without professional review and approval
- The system must include appropriate disclaimers indicating that AI outputs do not constitute legal advice
- Procedures must be in place to prevent clients or unqualified staff from directly relying on raw AI outputs

## 10. Monitoring and Logging
<!-- GUIDANCE: Track hallucination rate (fabricated citations) as a critical KPI.
Legal AI accuracy has direct professional liability implications. Jurisdictional
correctness is essential for multi-jurisdiction practices. Example: "Monthly
audit: 50 random AI citations verified. Current hallucination rate: 2.3%
(target <1%). Jurisdictional accuracy: 97.5% (target >99%)." -->

- All AI-assisted legal analyses must be logged with sufficient detail for professional accountability
- System performance must be monitored for accuracy of legal citations, case law currency, and analytical reliability
- Key metrics: citation accuracy, hallucination rate, jurisdictional correctness, analytical consistency
- Monitoring frequency: [monthly/quarterly] with professional oversight committee review
- Logs must be retained in compliance with legal record-keeping and professional indemnity requirements

## 11. Incident Response
<!-- GUIDANCE: Legal AI incidents may trigger professional indemnity insurance
notification, regulatory reporting, and duties to the court. If inaccurate
AI analysis was relied upon in filed documents, the duty of candor may require
correction. Example: "If AI-hallucinated citation is discovered after filing:
(1) correct with court immediately, (2) notify client, (3) notify PI insurer
within policy terms (typically 48 hours)." -->

- Any discovered inaccuracy in AI-generated legal analysis that was relied upon must be reported immediately
- If inaccurate AI analysis was submitted to a court or relied upon in advice, corrective action must be taken promptly
- Professional indemnity insurers must be notified as required by policy terms
- Affected clients must be informed if AI-related errors materially affect their matter
- Root cause analysis must be conducted and remediation measures implemented

## 12. Training and Awareness
<!-- GUIDANCE: Legal professionals need training specific to AI verification —
LLM-generated legal text can be highly convincing but factually wrong. Include
practical exercises with known AI errors. Example: "Training exercise: review
AI-generated memo containing 3 deliberate errors (hallucinated case, wrong
jurisdiction, outdated statute). Trainees must identify all 3 to pass." -->

- All legal professionals using the AI system must receive training on its operation, limitations, and ethical obligations
- Training must cover: verification procedures, confidentiality safeguards, professional responsibility, and error reporting
- Competency assessment must be completed before independent use for client matters
- Refresher training must be provided at least annually and upon significant system updates

## 13. Review Schedule
<!-- GUIDANCE: Legal AI policy must be updated when professional conduct rules
change. Bar associations are actively developing AI guidance — monitor updates.
Example: "Review triggers: new SRA/BSB guidance on AI, bar association updates,
new AI tool adoption, incident requiring corrective action." -->

- This policy shall be reviewed at least annually and upon relevant changes to professional conduct rules or legislation
- Review must incorporate accuracy monitoring data, incident reports, and regulatory guidance updates
- Updates must be approved by the firm's Managing Partner / General Counsel and Ethics Committee

## 14. Approval and Sign-off
<!-- GUIDANCE: Managing Partner/General Counsel sign-off represents the firm's
commitment to responsible AI use. Ethics Committee ensures professional conduct
compliance. Consider external review by professional indemnity insurer.
Example: "Ethics Committee confirms compliance with SRA Principles (UK) /
CCBE guidance. PI insurer notified of AI tool adoption." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Managing Partner / General Counsel | _________________ | _________ |
| DPO | _________________ | _________ |
| Ethics Committee Chair | _________________ | _________ |
