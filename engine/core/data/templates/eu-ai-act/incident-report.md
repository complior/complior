# Template 6: Serious Incident Report

**Obligation:** eu-ai-act-OBL-021
**Article:** Article 73
**For:** Providers of High-Risk AI
**Format:** DOCX / PDF (for submission to market surveillance authority)

## Document Structure:

### 1. Report Header
<!-- GUIDANCE: Art. 73(1) requires initial notification within 15 days of the
provider becoming aware of a serious incident (or 2 days if death/serious harm).
Mark whether this is Initial/Follow-up/Final. Follow-ups are required within 15
days of initial. Example: "Initial report INC-2026-001 submitted within 2 days
of incident awareness per Art. 73(1) death/serious harm timeline." -->
- Report reference: [INC-YYYY-NNN]
- Submission date: [Date]
- Submitted to: [Market Surveillance Authority name, Member State]
- Report type: [Initial / Follow-up / Final]

### 2. Provider Information
<!-- GUIDANCE: If the provider is outside the EU, the authorised representative
(Art. 22) must be listed. Include direct contact details for the person who can
answer technical questions from the market surveillance authority.
Example: "Provider: AI Corp (USA); EU Authorised Representative: EU-Rep GmbH,
Berlin; Contact: Dr. Mueller, ai-safety@eurep.de, +49-30-1234567." -->
- Provider name, address
- Authorised representative (if applicable)
- Contact person: [Name, email, phone]

### 3. AI System Identification
<!-- GUIDANCE: The EU database registration number becomes mandatory once the
Art. 71 database is operational. Include the exact software version at the time
of the incident, not the current version. CE marking status is critical — if
absent, this is itself a separate compliance issue.
Example: "System: AI-Screen v3.1.2 (not v3.2.0 which was deployed after incident)." -->
- System name and version
- EU database registration number (if applicable)
- CE marking: [Yes/No]
- Unique identification number

### 4. Incident Details
<!-- GUIDANCE: Art. 73(4)(a) requires factual description. Be precise about timing
and location. Select ALL applicable serious incident types — multiple may apply.
The description should be objective and evidence-based, not speculative.
Example: "On 2026-02-15 at 14:32 CET, the AI triage system in Hospital X (Vienna)
assigned low priority to a patient presenting with stroke symptoms." -->
- Date and time of incident
- Location (Member State, specific location if relevant)
- Description of incident: [Detailed factual description]
- Type of serious incident:
  - [ ] Death of a person
  - [ ] Serious damage to health
  - [ ] Serious disruption to critical infrastructure
  - [ ] Serious breach of fundamental rights
  - [ ] Serious damage to property or environment

### 5. Affected Persons
<!-- GUIDANCE: Art. 73(4)(b) requires information on affected persons. Include
demographics relevant to understanding the incident (age, vulnerability factors)
without unnecessary personal data. If the system affected a specific group
disproportionately, note this. Example: "3 patients affected, ages 67-82, all
presenting with time-critical conditions in emergency department." -->
- Number of persons affected
- Categories of persons affected
- Nature of harm suffered

### 6. Causal Analysis
<!-- GUIDANCE: Establish whether the AI system's output was a direct cause,
contributing factor, or coincidental to the incident. If root cause is not yet
determined, state this explicitly — do not speculate. Indicate whether the issue
is systemic or isolated. Example: "Preliminary analysis: model training data
under-represented elderly stroke presentations; contributing factor, not sole cause." -->
- Causal link between AI system and incident
- Root cause (if determined)
- Contributing factors

### 7. Immediate Actions Taken
<!-- GUIDANCE: Art. 73(4)(d) requires description of corrective actions. If the
system was suspended, state when. If it remains operational, justify why continued
operation is safe. Include any interim measures to protect affected persons.
Example: "System suspended at 16:00 CET same day. Manual triage protocols
reinstated. All patients triaged by the system in prior 72 hours re-reviewed." -->
- Actions taken to address the incident
- Actions to prevent recurrence
- System status: [Operational / Suspended / Withdrawn]

### 8. Corrective Measures Planned
<!-- GUIDANCE: Planned measures must address root cause, not just symptoms.
Include timelines and verification methods. If a system update is planned,
indicate whether it constitutes a substantial modification requiring re-assessment.
Example: "Retraining with augmented elderly dataset — 6 weeks. Independent
clinical validation — 4 weeks. Total timeline: 10 weeks to redeployment." -->
- Planned corrective actions
- Timeline for implementation
- Expected effectiveness

### 9. Sign-off
<!-- GUIDANCE: The report must be approved by someone with authority to commit
the provider to corrective actions. Keep records of submission to the MSA
including date, method, and confirmation of receipt. Example: "Submitted to
AGES (Austrian MSA) via email on 2026-02-17, receipt confirmed ref# MSA-AT-2026-0042." -->
- Report prepared by: _________________ Date: _________
- Approved by: _________________ Date: _________
