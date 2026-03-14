# AI Usage Policy — Education / Academic

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Education / Academic |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Annex III §6(b) makes AI for student assessment/admission high-risk.
Scope must include ALL AI tools used in education — even those used by students
themselves (e.g., AI tutors, plagiarism detectors). Include age ranges affected.
Example: "Covers: AI grading assistant (Gradescope), plagiarism detector (Turnitin),
learning analytics platform (Brightspace), AI tutor (Khan Academy). Ages 14-22." -->

This policy governs the use of [AI System Name] within [Organization]'s educational operations. It establishes requirements for fair, transparent and pedagogically sound use of AI in admissions, grading, student monitoring, learning analytics, and academic integrity processes, in accordance with the EU AI Act (Regulation 2024/1689).

This policy applies to all academic staff, administrative personnel, students, and parents/guardians affected by AI-assisted educational decisions.

## 2. Applicable Legislation
<!-- GUIDANCE: Education AI has special protections for children. GDPR Art. 8
(child consent, typically 16 in EU) and UN Convention on Rights of the Child
are critical. National education laws may impose additional requirements.
Example: In France, CNIL guidelines on children's data apply; in Germany,
Landesdatenschutzgesetze may set consent age at 16. -->

- **EU AI Act** — Annex III §6(b): AI systems intended to be used for the purpose of assessing students in educational and vocational training institutions and for assessing participants in tests commonly required for admission to educational institutions
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 14** — Human oversight measures
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **GDPR** — Art. 8 (conditions for child's consent), Art. 22, Art. 35
- **UN Convention on the Rights of the Child** — Art. 3 (best interests of the child)
- **EU Charter of Fundamental Rights** — Art. 14 (right to education), Art. 24 (rights of the child)

## 3. AI System Description
<!-- GUIDANCE: Describe how the AI interacts with the educational process.
Distinguish between formative assessment (learning support) and summative
assessment (grading/certification). Example: "AI grading assistant: analyzes
essay structure and grammar, provides suggested score (1-100) and feedback
comments; teacher reviews and may adjust before final grade is assigned." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: AI for student assessment/admission is high-risk per Annex III §6(b).
AI for administrative education tasks (scheduling, facilities) may be lower risk.
Document classification reasoning for each system. Example: "Grading AI: high-risk
(Annex III §6(b)); timetable optimization AI: minimal risk (no student assessment)." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. AI systems used for student assessment or admission decisions in educational institutions are classified as high-risk under Annex III §6(b).

## 5. Data Governance
<!-- GUIDANCE: Student data requires heightened protection, especially for minors.
GDPR Art. 8 requires parental consent for under-16s. Data minimisation is critical —
do not feed behavioral/surveillance data into academic AI. Example: "Only
submitted assignment text and rubric criteria provided to grading AI. No behavioral
data, attendance records, or personal demographics included in AI input." -->

- Student data must be processed in compliance with GDPR, with particular attention to data concerning minors
- Data minimisation: only educationally relevant data shall be provided to the AI system
- Behavioural and biometric data collection must have explicit legal basis and parental/guardian consent where required
- Data must not be used for purposes beyond the stated educational objective
- Data retention periods must comply with educational record-keeping requirements and be clearly communicated

## 6. Human Oversight
<!-- GUIDANCE: Art. 14 human oversight is especially important in education where
AI errors can affect life outcomes (university admission, qualifications). Teachers
must be able to override independently, not just accept/reject AI suggestions.
Example: "Teacher reviews all AI-suggested grades. For assessments affecting
progression/graduation, minimum 2 human reviewers required." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- The AI system must be used as a support tool; final academic decisions rest with qualified educators
- Academic staff must have the ability and authority to override AI-generated assessments or recommendations
- AI-assisted grades or evaluations must be reviewed by qualified academic personnel before finalization

## 7. Transparency and Disclosure
<!-- GUIDANCE: Age-appropriate transparency is essential. Students should understand
HOW AI is used in their education, not just THAT it is used. For minors,
communicate to both students AND parents/guardians. Example: "Student handbook
section (ages 14-16): 'Your essays may be reviewed by AI before your teacher reads
them. The AI suggests a score, but your teacher always makes the final decision.'" -->

- Students and parents/guardians must be informed when AI is used in assessment or educational processes
- Information must be provided in age-appropriate and accessible language
- The criteria used by the AI system for assessment or recommendation must be explainable
- AI-assisted academic records must clearly indicate the use of AI tools

## 8. Student Welfare and Academic Integrity
<!-- GUIDANCE: Balance academic integrity enforcement with student wellbeing.
AI plagiarism detection has known false positive rates that can cause unjust
accusations. Never penalize based solely on AI output. Example: "AI plagiarism
flags reviewed by Academic Integrity Officer. Student interviewed before any
determination. False positive rate documented (currently 3.2%) and communicated." -->

- AI systems must not be used in ways that create undue stress, surveillance pressure, or privacy invasion for students
- The use of AI for continuous behavioural monitoring must be proportionate and justified
- Academic integrity policies must clearly address permissible and impermissible uses of AI by students
- Students must not be penalised based solely on AI-generated plagiarism or cheating detection without human review
- The impact of AI systems on student wellbeing must be periodically assessed

## 9. Parental Consent and Minor Protection
<!-- GUIDANCE: GDPR Art. 8 sets default consent age at 16 (member states may
lower to 13). For students under the threshold, parental consent is required
before AI processes their personal data. Offer human-only alternative.
Example: "Consent form sent to parents at enrollment. Alternative offered:
'Your child's work will be assessed by teachers only (human-only assessment).'" -->

- For students under 16, parental/guardian consent must be obtained before processing personal data through AI systems (GDPR Art. 8)
- Age-appropriate information must be provided to minors about how AI affects their education
- Parents/guardians must have the right to request human-only assessment for their children
- Special safeguards must be in place for vulnerable students, including those with special educational needs

## 10. Monitoring and Logging
<!-- GUIDANCE: Track correlation between AI assessments and teacher assessments
to detect drift or bias. Monitor for demographic disparities in AI-suggested
grades. Log retention must comply with educational records legislation.
Example: "Monthly: AI-teacher grade correlation (target r>0.85). Quarterly:
demographic parity analysis across gender, ethnicity, SEN status. Logs retained
per Education Act requirements (typically 25 years for assessment records)." -->

- All AI-assisted academic decisions must be logged with sufficient detail for review and appeal
- System performance must be monitored for accuracy, fairness and pedagogical effectiveness
- Key metrics: assessment accuracy, consistency with human marking, demographic parity, student outcome correlation
- Monitoring frequency: [termly/semesterly] with academic governance review
- Logs must be retained for the duration required by educational regulations

## 11. Incident Response
<!-- GUIDANCE: In education, an "incident" includes unfair grading, discriminatory
admissions outcomes, and student welfare concerns from AI surveillance.
Reassessment must use traditional (non-AI) methods. Example: "Incident triggers:
student/parent complaint of unfair AI assessment, bias detected in demographic
analysis, AI-teacher correlation drops below 0.75 for any cohort." -->

- Any suspected unfair or inaccurate AI-assisted assessment must be reported and reviewed promptly
- The AI system must be suspended if systematic inaccuracy or bias is detected
- Affected students must be offered reassessment through traditional methods
- Serious incidents must be reported to relevant educational authorities and market surveillance bodies

## 12. Training and Awareness
<!-- GUIDANCE: Teachers need training on interpreting AI suggestions critically,
not just operating the software. Students need guidance on permissible AI use
(academic integrity). Example: "Teachers: 4-hour training on AI output
interpretation, override procedures, recognizing AI errors. Students: 1-hour
session on 'AI in your education' at term start." -->

- All academic and administrative staff using the AI system must receive training on its operation and limitations
- Training must cover: pedagogical implications, override procedures, data protection for minors, and complaint handling
- Students must receive guidance on how AI is used in their educational experience
- Refresher training must be provided at least annually and upon significant system updates

## 13. Review Schedule
<!-- GUIDANCE: Align with academic calendar — review at start of each academic
year. Include student feedback in review process. Example: "Annual review at
start of autumn term. Student survey on AI experience conducted in spring term.
Findings incorporated into next review cycle." -->

- This policy shall be reviewed at least annually and at the beginning of each academic year
- Review must incorporate monitoring data, student feedback, incident reports, and pedagogical outcome analysis
- Updates must be approved by the Academic Governance Board

## 14. Approval and Sign-off
<!-- GUIDANCE: Education AI policy should include student welfare representation.
Where students are of age, consider student representative sign-off for
transparency. Example: "Student Welfare Officer sign-off ensures safeguarding
considerations are addressed. Student union representative consulted for
university-level deployments." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Academic Director | _________________ | _________ |
| DPO | _________________ | _________ |
| Student Welfare Officer | _________________ | _________ |
