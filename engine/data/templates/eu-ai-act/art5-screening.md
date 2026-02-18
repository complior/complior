# Template 2: Article 5 Prohibited Practices Screening Report

**Obligation:** eu-ai-act-OBL-002 (and sub-obligations OBL-002a through OBL-002g)
**Article:** Article 5
**For:** Both Deployers and Providers
**Format:** DOCX / PDF
**Status:** REQUIRED SINCE FEBRUARY 2, 2025
**Penalty for violation:** UP TO €35M / 7% GLOBAL TURNOVER

## Document Structure:

### 1. Report Header

| Field | Value |
|-------|-------|
| Document Title | Article 5 Prohibited Practices Screening Report — [Company Name] |
| Report ID | ART5-[YYYY]-[NNN] |
| Date of Screening | [Date] |
| Conducted By | [Name, Title] |
| Reviewed By | [Name, Title] |
| Regulation Reference | EU AI Act (Regulation (EU) 2024/1689), Article 5 |
| Commission Guidelines Reference | Guidelines on Prohibited AI Practices (Feb 2025) |

### 2. AI System Inventory

| # | System Name | Provider | Description | Domain | Deployed Since | Risk Level |
|---|-------------|----------|-------------|--------|----------------|------------|
| 1 | [e.g., Salesforce Einstein] | [Salesforce] | [Lead scoring] | [Sales] | [2024-03] | [Minimal] |
| 2 | [e.g., Textio] | [Textio] | [Job posting optimization] | [HR] | [2024-06] | [Limited] |
| 3 | [e.g., Custom NLP Pipeline] | [In-house] | [Customer sentiment] | [Support] | [2025-01] | [Limited] |

### 3. Screening Matrix — Per System

**For EACH AI system, complete the following assessment:**

---

**System: [System Name]**

| # | Prohibited Practice (Article 5(1)) | Applicable? | Analysis | Conclusion |
|---|-------------------------------------|-------------|----------|------------|
| a | **Subliminal/Manipulative/Deceptive Techniques** — Does this AI deploy techniques beyond a person's consciousness, or purposefully manipulative or deceptive techniques, that materially distort behavior causing significant harm? | Yes / No / N/A | [Detailed analysis. Consider: Does the AI personalize content in ways that could manipulate? Does it use dark patterns? Does it target decision-making vulnerabilities? Cite specific features or capabilities.] | PASS / FAIL / REVIEW |
| b | **Exploitation of Vulnerabilities** — Does this AI exploit vulnerabilities related to age, disability, or social/economic situation to distort behavior causing significant harm? | Yes / No / N/A | [Analysis: Does the system interact with vulnerable populations? Could it exploit their specific vulnerabilities? Is content/behavior adapted based on vulnerability indicators?] | PASS / FAIL / REVIEW |
| c | **Social Scoring** — Does this AI evaluate or classify persons based on social behavior or personal characteristics, leading to detrimental or disproportionate treatment in unrelated contexts? | Yes / No / N/A | [Analysis: Does the system score individuals? Are scores used to determine access to services/rights? Is scoring context-appropriate or does it leak into unrelated decisions?] | PASS / FAIL / REVIEW |
| d | **Criminal Risk Profiling** — Does this AI assess criminal risk of individuals based solely on profiling or personality traits? | Yes / No / N/A | [Analysis: Does the system predict criminal behavior? If yes, is it based on objective verifiable facts (allowed) or personality/demographic profiling (prohibited)?] | PASS / FAIL / REVIEW |
| e | **Untargeted Facial Image Scraping** — Does this AI create or expand facial recognition databases through untargeted scraping from internet or CCTV? | Yes / No / N/A | [Analysis: Does the system collect/process facial images? If yes, what is the source? Is collection targeted and lawful, or untargeted mass scraping?] | PASS / FAIL / REVIEW |
| f | **Emotion Recognition in Workplace/Education** — Does this AI infer emotions of persons in workplace or educational institution settings? | Yes / No / N/A | [Analysis: Does the system detect or infer emotions (facial expression, voice tone, body language, text sentiment)? Is it used in workplace or education context? Medical/safety exception documentation if claimed.] | PASS / FAIL / REVIEW |
| g | **Biometric Categorization by Sensitive Characteristics** — Does this AI use biometric data to categorize persons by race, political opinions, trade union membership, religion, sex life, or sexual orientation? | Yes / No / N/A | [Analysis: Does the system process biometric data? Does it infer any sensitive characteristics from biometric inputs?] | PASS / FAIL / REVIEW |
| h | **Real-Time Remote Biometric ID in Public Spaces** — Does this AI perform real-time remote biometric identification in publicly accessible spaces for law enforcement purposes? | Yes / No / N/A | [Analysis: Does the system perform real-time biometric identification? Is it in publicly accessible spaces? For law enforcement? If yes, do any narrow exceptions (Art. 5(2)-(3)) apply?] | PASS / FAIL / REVIEW |

---

[Repeat screening matrix for each AI system in inventory]

### 4. Summary Results

| Total Systems Screened | PASS (All Clear) | REVIEW (Needs Further Analysis) | FAIL (Prohibited Use Detected) |
|------------------------|------------------|---------------------------------|-------------------------------|
| [Number] | [Number] | [Number] | [Number] |

### 5. Systems Requiring Action

| System | Issue | Prohibited Practice | Required Action | Deadline | Responsible |
|--------|-------|---------------------|-----------------|----------|-------------|
| [Name] | [Description] | Art. 5(1)([x]) | [Cease use / Modify / Remove feature] | [Date] | [Name] |

### 6. Methodology Notes

- This screening was conducted by reviewing: system documentation, provider disclosures, system functionality testing, code review (where applicable), and interviews with system operators.
- Classification criteria follow the European Commission's Guidelines on Prohibited AI Practices published February 2025.
- Where uncertainty exists, the precautionary principle is applied: the system is flagged for REVIEW and further expert analysis is required before continued use.

### 7. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Assessor | _________________ | _________________ | _________ |
| Reviewer (Legal/Compliance) | _________________ | _________________ | _________ |
| Decision Maker | _________________ | _________________ | _________ |

**Next Screening Due:** [Date — recommend annually or upon adoption of any new AI system]

## Example Completed Entry:

**System: Salesforce Einstein Lead Scoring**

| # | Prohibited Practice | Applicable? | Analysis | Conclusion |
|---|---------------------|-------------|----------|------------|
| a | Subliminal/Manipulative | No | System scores inbound leads based on explicit company data (company size, industry, engagement history). Does not interact with or attempt to influence lead behavior. No dark patterns. | PASS |
| b | Exploitation of Vulnerable | No | B2B context only. No individual vulnerability indicators processed. | PASS |
| c | Social Scoring | No | Scores are business leads, not individuals' social behavior. Score is used only for sales prioritization, not access to services. | PASS |
| d | Criminal Risk Profiling | No | N/A — not used for criminal risk assessment. | PASS |
| e | Facial Scraping | No | No facial/biometric data processed. | PASS |
| f | Workplace Emotion Recognition | No | No emotion detection capability. | PASS |
| g | Biometric Categorization | No | No biometric data processed. | PASS |
| h | Real-Time Biometric ID | No | N/A — not a biometric system. | PASS |

**Overall: PASS — No prohibited practices identified.**
