# AI System Technical Documentation

> **Regulation**: EU AI Act (Regulation (EU) 2024/1689), Article 11 / Annex IV
> **Obligation**: OBL-005 — Technical Documentation
> **For**: Providers of High-Risk AI Systems
> **Deadline**: August 2, 2026
> **Document ID**: TDD-[YYYY]-[NNN]

<!-- GUIDANCE: Art. 11 requires technical documentation to be drawn up BEFORE the system
     is placed on the market or put into service. It must be kept up to date. The
     documentation shall follow Annex IV structure (sections 1-8). -->

---

## 1. General Description (Annex IV §1)

<!-- GUIDANCE: Annex IV(1) requires a complete system identification. The "intended
purpose" must match the provider's declaration — any deviation requires re-assessment.
Include ALL hardware/software dependencies, not just primary components.
Example: "AI-CV-Screener v2.3, requires CUDA 12.0, Python 3.11, deployed on AWS
eu-west-1, interacts with ATS via REST API." -->

| Field | Value |
|-------|-------|
| AI System | [AI System Name] |
| Provider | [Company Name] |
| Version | [X.Y] |
| Risk Class | [Risk Class] |
| Document ID | TDD-[YYYY]-[NNN] |
| Created | [Date] |
| Last Review | [Date] |

### 1.1 System Identification

- **System name**: [AI System Name]
- **Version / unique identifier**: [X.Y]
- **Provider**: [Company Name], [Address], [Contact]
- **Intended purpose**: [Description]
- **Date of first placing on market / putting into service**: [Date]
- **EU database registration reference** (Art. 71): [Reference]

### 1.2 Hardware and Software Environment

| Component | Name | Version | Role |
|-----------|------|---------|------|
| Operating system | | | |
| Runtime | | | |
| GPU / Accelerator | | | |
| Framework / SDK | | | |

### 1.3 System Interactions

| External System | Interface | Data Exchanged | Direction |
|----------------|-----------|---------------|-----------|
| | API / File / Stream | | In / Out / Both |

---

## 2. Detailed Description of System Elements (Annex IV §2)

<!-- GUIDANCE: Annex IV(2) requires sufficient detail for a third party to understand
how the system works. Document architecture decisions and their rationale — not just
what was built, but WHY. Include training data characteristics (size, sources,
demographics, known limitations). -->

### 2.1 Development Process

| Aspect | Description |
|--------|-------------|
| Development methodology | |
| Design specifications | |
| Architecture decisions | |
| Key design rationale | |

### 2.2 Data Requirements

| Dataset | Purpose | Size | Sources | Demographics | Known Limitations |
|---------|---------|------|---------|-------------|-------------------|
| Training | | | | | |
| Validation | | | | | |
| Test | | | | | |

### 2.3 Training Methodology

| Aspect | Description |
|--------|-------------|
| Algorithm(s) used | |
| Optimization technique | |
| Hyperparameters | |
| Training procedure | |
| Computational resources | |
| Training duration | |

---

## 3. Monitoring, Functioning and Control (Annex IV §3)

<!-- GUIDANCE: Annex IV(3) requires documentation of capabilities AND limitations.
Be specific about what the system cannot do. Define accuracy metrics with confidence
intervals, not single numbers. Art. 14 human oversight measures belong here. -->

### 3.1 System Capabilities

| Capability | Description | Confidence Level |
|-----------|-------------|------------------|
| | | |

### 3.2 Known Limitations

| # | Limitation | Impact | Conditions | Workaround |
|---|-----------|--------|------------|------------|
| 1 | | | | |

### 3.3 Human Oversight Measures (Art. 14)

| Measure | Description | Responsible |
|---------|-------------|-------------|
| Output review | | |
| Override mechanism | | |
| Intervention procedure | | |
| Stop/disable capability | | |

### 3.4 Input Data Specifications

| Input | Format | Constraints | Validation |
|-------|--------|------------|-----------|
| | | | |

---

## 4. Validation and Testing (Annex IV §4)

<!-- GUIDANCE: Annex IV(4) requires information about the validation and testing
procedures used, including information about the validation and testing data used
and their main characteristics; metrics used to measure accuracy, robustness, and
compliance; potentially discriminatory impacts; test logs and test reports. -->

### 4.1 Testing Strategy

| Test Phase | Scope | Methodology | Tools |
|-----------|-------|-------------|-------|
| Pre-market (Art. 9(7)) | | | |
| Real-world conditions (Art. 9(8)) | | | |
| Post-deployment | | | |

### 4.2 Test Datasets

| Dataset | Purpose | Size | Source | Representativeness | Known Biases |
|---------|---------|------|--------|-------------------|-------------|
| | Validation | | | | |
| | Test | | | | |
| | Adversarial | | | | |

### 4.3 Accuracy Metrics

| Metric | Target | Result | Confidence Interval | Dataset | Date |
|--------|--------|--------|--------------------|---------|----- |
| Accuracy | | | | | |
| Precision | | | | | |
| Recall | | | | | |
| F1 Score | | | | | |
| AUC-ROC | | | | | |

### 4.4 Discriminatory Impact Testing

<!-- GUIDANCE: Annex IV(4) specifically requires testing for potentially discriminatory
impacts. Test across protected characteristics (age, gender, ethnicity, disability). -->

| Protected Group | Metric | Group Result | Overall Result | Disparity | Acceptable? |
|----------------|--------|-------------|---------------|-----------|-------------|
| | | | | | |

### 4.5 Test Logs and Reports

| Test Run | Date | Tester | Config | Pass/Fail | Report Location |
|----------|------|--------|--------|-----------|----------------|
| | | | | | |

---

## 5. Accuracy, Robustness and Cybersecurity (Annex IV §5)

<!-- GUIDANCE: Annex IV(5) requires a description of the measures put in place for
accuracy (Art. 15(1)), robustness (Art. 15(4)), and cybersecurity (Art. 15(5)).
Include technical and organisational measures. -->

### 5.1 Accuracy Measures (Art. 15(1))

| Measure | Description | Status |
|---------|-------------|--------|
| Accuracy targets | | |
| Measurement methodology | | |
| Performance baselines | | |
| Degradation detection | | |

### 5.2 Robustness Measures (Art. 15(4))

| Measure | Description | Status |
|---------|-------------|--------|
| Error handling | | |
| Fallback mechanisms | | |
| Redundancy | | |
| Adversarial resilience | | |
| Input perturbation tolerance | | |

### 5.3 Cybersecurity Measures (Art. 15(5))

| Measure | Description | Status |
|---------|-------------|--------|
| Data poisoning prevention | | |
| Model manipulation protection | | |
| Adversarial input detection | | |
| Confidentiality safeguards | | |
| Access control | | |
| Audit logging | | |

---

## 6. Risk Management System (Annex IV §2(e))

<!-- GUIDANCE: Art. 9 requires a continuous, iterative risk management process.
Reference your Art. 9 risk management documentation by ID. List residual risks
that cannot be fully mitigated and explain why they are acceptable. -->

- **Risk management document reference**: [RMS-YYYY-NNN]
- **Known risks and mitigation measures**: see Risk Management System document
- **Residual risk assessment**: see Risk Management System document

---

## 7. Changes Throughout Lifecycle (Annex IV §6)

<!-- GUIDANCE: Annex IV(6) requires a version history with rationale for each change.
Assess whether each change requires a new conformity assessment. Substantial
modifications (Art. 6(1)(b)) trigger re-assessment. -->

| Version | Date | Change Description | Rationale | Substantial Modification? | Re-assessment? |
|---------|------|-------------------|-----------|--------------------------|---------------|
| | | Initial version | N/A | N/A | N/A |

---

## 8. Standards and Conformity (Annex IV §7-8)

<!-- GUIDANCE: List specific harmonised standards (e.g., ISO/IEC 42001, ISO/IEC 23894)
or common specifications. State the conformity assessment route (Annex VI internal
control or Annex VII with notified body). -->

### 8.1 Applied Standards

| Standard | Scope | Status | Certification Date |
|----------|-------|--------|--------------------|
| ISO/IEC 42001 | AI Management System | | |
| ISO/IEC 23894 | AI Risk Management | | |

### 8.2 Conformity Assessment

| Aspect | Value |
|--------|-------|
| Assessment route | Annex VI (internal) / Annex VII (notified body) |
| Notified body (if applicable) | |
| Assessment date | |
| EU Declaration of Conformity ref | [DOC-YYYY-NNN] |

---

## 9. Post-Market Monitoring Plan (Art. 72)

<!-- GUIDANCE: Art. 72 requires proportionate post-market monitoring. Define specific
KPIs, monitoring frequency, and thresholds that trigger corrective action. -->

| Activity | Frequency | KPI | Threshold | Owner |
|----------|-----------|-----|-----------|-------|
| Accuracy review | | | | |
| Fairness audit | | | | |
| Incident review | | | | |
| Full re-validation | | | | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Technical Lead | | | |
| Quality Manager | | | |
| Compliance Officer | | | |
