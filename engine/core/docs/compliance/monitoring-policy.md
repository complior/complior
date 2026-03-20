# Template 8: Deployer AI Monitoring and Log Retention Policy

**Obligation:** eu-ai-act-OBL-011
**Article:** Article 26(1)-(6)
**For:** Deployers of High-Risk AI
**Format:** DOCX / PDF

## Document Structure:

### 1. Policy Overview
<!-- GUIDANCE: Art. 26(1) requires deployers to use high-risk AI systems in
accordance with instructions for use. This policy documents how you meet Art. 26
obligations systematically. Assign a named owner with authority to suspend systems.
Example: "Policy owner: Maria Schmidt, Head of AI Operations, with authority
to suspend any AI system pending investigation." -->
- Title: "High-Risk AI System Monitoring and Log Retention Policy"
- Version: [Number]
- Effective date: 2026-03-19
- Owner: [Name, Title]

### 2. AI Systems in Scope
<!-- GUIDANCE: List ALL high-risk AI systems deployed, including those from
third-party providers. For each system, confirm that provider Instructions for
Use have been received per Art. 13. Include systems in pilot/testing phases.
Example: Include "HireVue (pilot, 3 users, HR department)" alongside production systems. -->
- [Table of all high-risk AI systems deployed, with: system name, provider, risk level, deployment date, responsible person]

### 3. Use According to Instructions
<!-- GUIDANCE: Art. 26(1) makes using the system according to provider instructions
a legal obligation. Document any approved deviations and the risk assessment that
justified them. Unapproved deviations may shift liability from provider to deployer.
Example: "Provider recommends human review for all outputs; approved deviation:
auto-approve for confidence >0.95 (risk-assessed, documented in RA-2026-003)." -->
- For each system: confirmation that provider's Instructions for Use have been received and implemented
- Deviations from instructions: [None / Description of any approved deviations]

### 4. Human Oversight Assignments
<!-- GUIDANCE: Art. 26(2) requires natural persons assigned to human oversight to
have necessary competence, training, and authority. Document training completion
dates and override authority explicitly. Example: "Assigned: Jan Peters (trained
2025-12-01, cert #HO-2025-042), authority to suspend system independently." -->
- [Table: System name, Assigned oversight person, Training completed (Y/N), Authority to override (Y/N)]

### 5. Monitoring Procedures
<!-- GUIDANCE: Art. 26(5) requires monitoring for risks to health, safety, or
fundamental rights. Define specific anomaly thresholds that trigger action —
vague criteria are insufficient. Example: "Anomaly threshold: >2 standard
deviations from baseline accuracy over 7-day rolling window → alert.
>3 standard deviations → automatic suspension pending review." -->
- Monitoring frequency: [Real-time / Daily / Weekly]
- Metrics monitored: [Accuracy, fairness, output quality, error rate, etc.]
- Anomaly detection thresholds: Agent for E2E testing
- Escalation procedures: [When to inform provider, when to suspend]

### 6. Log Retention
<!-- GUIDANCE: Art. 26(6) requires automatic log retention for at least 6 months,
unless longer periods are required by sector regulations (e.g., financial services
may require 5+ years). Logs must be under the deployer's control. Example:
"Logs stored in encrypted S3 bucket (eu-west-1), retained 24 months per financial
services requirement, access restricted to AI Operations team." -->
- Log retention period: Minimum 6 months (or as required by sector regulation)
- Storage location: Agent for E2E testing
- Access controls: [Who can access logs]
- Destruction policy: [When and how logs are deleted after retention period]

### 7. Incident Reporting
<!-- GUIDANCE: Art. 26(5) requires deployers to inform providers and relevant
authorities of serious incidents. Define clear criteria for what constitutes a
"serious incident" (Art. 3(49)) and the timeline for each notification step.
Example: "Provider notified within 24 hours; MSA notified within 15 days for
non-death incidents, 2 days for death/serious harm per Art. 73." -->
- Internal escalation process for incidents
- Provider notification process
- Authority notification triggers (link to serious incident reporting)

### 8. Review Schedule
<!-- GUIDANCE: Review frequency should be proportionate to the risk level and
rate of change. At minimum, review annually and after every significant system
update from the provider. Document review findings and actions taken.
Example: "Annual full review (Q1), quarterly metric review, ad-hoc review
triggered by provider updates or incidents." -->
- Policy review: Annual
- System-specific monitoring review: [Frequency]
- Last review: 2026-03-19
- Next review: 2026-03-19

### Sign-off
<!-- GUIDANCE: The approver should have organizational authority to enforce the
policy, including the authority to suspend AI systems. Consider including IT
security and legal sign-off for comprehensive accountability.
Example: "Approved by CTO (system authority), CISO (security), DPO (data protection)." -->
- Policy owner: _________________ Date: _________
- Approved by: _________________ Date: _________
