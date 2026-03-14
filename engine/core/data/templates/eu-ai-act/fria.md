# Template 3: Fundamental Rights Impact Assessment (FRIA)

**Obligation:** eu-ai-act-OBL-013
**Article:** Article 27
**For:** Deployers (public bodies + credit/insurance deployers)
**Format:** DOCX / PDF

## Document Structure:

### 1. Assessment Header
<!-- GUIDANCE: Complete all header fields to establish traceability. The Assessment ID
should follow your organization's document numbering scheme. DPO consultation is
mandatory per GDPR Art. 35 alignment. Example: "FRIA-2026-001" for the first
assessment of 2026. -->

| Field | Value |
|-------|-------|
| Document Title | Fundamental Rights Impact Assessment — [AI System Name] |
| Assessment ID | FRIA-[YYYY]-[NNN] |
| Date | [Date] |
| Assessor | [Name, Title] |
| DPO Consulted | [Name, Date] |

### 2. AI System Description
<!-- GUIDANCE: Describe the system comprehensively per Art. 27(3)(a). Include the
specific use case, not just the product name. "Categories of persons affected" must
list all groups — direct users, subjects of decisions, and bystanders.
Example: A CV screening tool affects applicants (decisions), HR staff (users),
and rejected candidates (indirect impact). -->

- System name: [Name]
- Provider: [Name]
- Version: [Number]
- Intended purpose: [Description]
- Deployment context: [Where and how the system is used]
- Categories of persons affected: [List]
- Geographic scope: [Member States where deployed]

### 3. Deployer Information
<!-- GUIDANCE: Art. 27 applies only to deployers that are public bodies, bodies
governed by public law, or private deployers in credit/insurance. Identify which
trigger applies. If none apply, document why FRIA is conducted voluntarily.
Example: A municipal government using AI for benefit eligibility is a "public body." -->

- Organisation: [Name]
- Type: [ ] Public body [ ] Body governed by public law [ ] Private deployer (credit/insurance)
- Article 27 trigger: [Which condition applies]

### 4. Fundamental Rights Risk Assessment
<!-- GUIDANCE: For each fundamental right (Charter Arts. 1,7,8,11,21,24,31,41,47),
assess risk level (High/Medium/Low/None) per Art. 27(3)(c). Describe the specific
mechanism by which the AI system could impact this right, not just generic risks.
Example: A credit scoring system may affect non-discrimination (Art. 21) through
biased training data that underrepresents minority applicants. -->

| Fundamental Right | Risk Level | Description of Risk | Affected Group | Mitigation Measures |
|-------------------|-----------|---------------------|----------------|---------------------|
| Non-discrimination (Charter Art. 21) | [H/M/L/N] | [e.g., AI may produce biased outcomes against certain ethnic groups in credit decisions] | [e.g., Loan applicants from minority backgrounds] | [e.g., Regular bias audits, human review of rejections, fairness metrics monitoring] |
| Privacy and data protection (Charter Art. 7-8) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Freedom of expression (Charter Art. 11) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Human dignity (Charter Art. 1) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Right to an effective remedy (Charter Art. 47) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Rights of the child (Charter Art. 24) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Workers' rights (Charter Art. 31) | [H/M/L/N] | [Description] | [Group] | [Measures] |
| Right to good administration (Charter Art. 41) | [H/M/L/N] | [Description] | [Group] | [Measures] |

### 5. Human Oversight Measures
<!-- GUIDANCE: Art. 14 requires human oversight proportionate to the risk. Specify
a named individual (not just a role), describe the technical override mechanism,
and define the escalation timeline. Example: "System pauses after 3 consecutive
low-confidence scores; oversight officer reviews within 2 hours." -->
- Assigned oversight person: [Name, Title, Training completed]
- Override mechanism: [Description of how human can intervene/stop the system]
- Escalation process: [When and how decisions are escalated to humans]
- Review frequency: [How often human reviews AI outputs]

### 6. Measures if Risks Materialize
<!-- GUIDANCE: Art. 27(3)(e) requires concrete measures, not aspirational statements.
Include specific suspension criteria (e.g., "if bias exceeds 5% differential across
protected groups") and remediation timelines. Example: "Affected persons notified
within 48 hours; alternative manual assessment offered within 5 business days." -->
- Incident response plan: [Summary]
- Communication to affected persons: [Process]
- System suspension criteria: [Under what conditions will the system be stopped]
- Remediation process: [How affected persons will be made whole]

### 7. Governance and Complaints
<!-- GUIDANCE: Art. 27(3)(f) requires a functioning complaint mechanism. Provide
actual contact details, expected response times, and the path to external remedies
(national MSA, judicial review). Example: "Complaints submitted via
complaints@org.eu, acknowledged within 3 business days, resolved within 30 days." -->
- Internal complaint mechanism: [Description, contact details]
- External complaint options: [Market surveillance authority, judicial remedies]
- Data protection officer involvement: [DPO name, consultation record]

### 8. GDPR Alignment
<!-- GUIDANCE: If a DPIA was conducted under GDPR Art. 35, reference it by document
ID. The FRIA should complement, not duplicate, the DPIA. Identify the Art. 6(1)
legal basis explicitly. Example: "DPIA-2025-012; legal basis: Art. 6(1)(e)
(public interest task) for public sector deployers." -->
- Has a DPIA been conducted under GDPR Art. 35? [Yes/No — reference]
- Legal basis for personal data processing: [Art. 6(1) basis]
- Data protection measures: [Summary]

### 9. Conclusion and Decision
<!-- GUIDANCE: Art. 27(4) requires notification to the MSA if risk is deemed
unacceptable. Use clear decision language — avoid "generally acceptable" or
"mostly compliant." If proceeding with conditions, list each condition with
a deadline and responsible person. Example: "Proceed with condition: bias audit
completed by 2026-06-01, assigned to Data Ethics Lead." -->
- Overall risk assessment: [Acceptable / Acceptable with mitigations / Unacceptable — do not deploy]
- Decision: [Proceed with deployment / Proceed with conditions / Do not proceed]
- Conditions for deployment (if applicable): [List]
- Next review date: [Date]

### 10. Sign-off
<!-- GUIDANCE: All three sign-offs are required: the person who conducted the
assessment, the DPO who was consulted (Art. 27(2)), and the organizational
decision-maker. If notifying the MSA, record the submission date and authority.
Example: MSA notification submitted to ACM (Netherlands) on 2026-03-15. -->
- Assessor: _________________ Date: _________
- DPO: _________________ Date: _________
- Decision-maker: _________________ Date: _________
- Notification to market surveillance authority: [Date submitted, authority name]

## Legal Formulation:
"This Fundamental Rights Impact Assessment is conducted pursuant to Article 27 of Regulation (EU) 2024/1689 (EU AI Act). The assessment evaluates the potential impact on fundamental rights of the deployment of the high-risk AI system identified herein, in accordance with the requirements of Article 27(3)(a)-(f)."
