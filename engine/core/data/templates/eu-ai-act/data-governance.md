# Data Governance Policy

> **Regulation**: EU AI Act (Regulation (EU) 2024/1689), Article 10
> **Obligation**: OBL-004 — Data and Data Governance
> **For**: Providers of High-Risk AI Systems
> **Deadline**: August 2, 2026
> **Document ID**: DGP-[YYYY]-[NNN]

<!-- GUIDANCE: Art. 10 requires high-risk AI systems to be developed using training, validation,
     and testing data sets that meet specific quality criteria. This document establishes
     the data governance framework. -->

---

## 1. Document Control

| Field | Value |
|-------|-------|
| AI System | [AI System Name] |
| Provider | [Company Name] |
| Version | [X.Y] |
| Risk Class | [Risk Class] |
| Created | [Date] |
| Last Review | [Date] |
| Next Review | |
| Approved By | [Name, Title] |

---

## 2. Data Sources

<!-- GUIDANCE: Art. 10(2)(a) — Describe design choices, data collection processes,
     the origin of data, and in the case of personal data, the original purpose of collection. -->

| # | Source Name | Type | Origin | Personal Data? | Legal Basis | Volume |
|---|-----------|------|--------|----------------|-------------|--------|
| 1 | | Training / Validation / Test | | Yes/No | | |

---

## 3. Collection Methods

<!-- GUIDANCE: Art. 10(2)(a)-(b) — Document data collection processes and data preparation
     operations such as annotation, labelling, cleaning, updating, enrichment, aggregation. -->

### 3.1 Data Collection

| Method | Description | Frequency | Responsible |
|--------|-------------|-----------|-------------|
| | | | |

### 3.2 Data Preparation

| Step | Description | Tools Used | QA Check |
|------|-------------|-----------|----------|
| Annotation | | | |
| Labelling | | | |
| Cleaning | | | |
| Enrichment | | | |
| Aggregation | | | |

---

## 4. Quality Metrics

<!-- GUIDANCE: Art. 10(2)(f) — Examination in view of possible biases that are likely
     to affect health, safety, or fundamental rights. Art. 10(3) — Data sets shall be
     relevant, sufficiently representative, and to the best extent possible, free of errors
     and complete in view of the intended purpose. -->

| Metric | Target | Current | Measurement Method | Last Measured |
|--------|--------|---------|-------------------|---------------|
| Completeness | | | | |
| Accuracy | | | | |
| Representativeness | | | | |
| Timeliness | | | | |
| Consistency | | | | |

---

## 5. Bias Analysis

<!-- GUIDANCE: Art. 10(2)(f)-(g) — Identify possible biases and describe measures
     to detect, prevent, and mitigate them. Identify relevant data gaps or shortcomings
     and how they can be addressed. -->

### 5.1 Identified Biases

| # | Bias Type | Affected Group | Detection Method | Severity | Status |
|---|-----------|----------------|-----------------|----------|--------|
| 1 | | | | Low/Medium/High | Identified/Mitigated/Monitored |

### 5.2 Mitigation Measures

| Bias | Mitigation | Implementation Status | Responsible |
|------|-----------|----------------------|-------------|
| | | Planned/Implemented/Verified | |

---

## 6. Representativeness

<!-- GUIDANCE: Art. 10(3) — Data sets shall take into account the specific geographical,
     contextual, behavioural, or functional setting within which the AI system is intended
     to be used. Art. 10(4) — Where special categories of personal data are strictly
     necessary for bias detection and correction, additional safeguards apply. -->

### 6.1 Population Coverage

| Demographic | Representation in Data | Target Population | Gap |
|-------------|----------------------|-------------------|-----|
| Geographic | | | |
| Age groups | | | |
| Gender | | | |

### 6.2 Special Categories of Personal Data (Art. 10(5))

| Category | Used? | Justification | Safeguards |
|----------|-------|--------------|------------|
| Racial/ethnic origin | No | | |
| Political opinions | No | | |
| Religious beliefs | No | | |
| Health data | No | | |
| Biometric data | No | | |

---

## 7. Data Retention and Access Control

<!-- GUIDANCE: Ensure compliance with GDPR for personal data and document access controls
     for training/validation/test datasets. -->

| Dataset | Retention Period | Access Level | Encryption | Deletion Policy |
|---------|-----------------|-------------|------------|----------------|
| | | | | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Data Officer | | | |
| Technical Lead | | | |
| DPO / Privacy Officer | | | |
