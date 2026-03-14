# GPAI Model Transparency Documentation

> **Regulation**: EU AI Act (Regulation (EU) 2024/1689), Articles 51-53 / Annex XI
> **Obligation**: OBL-022 — GPAI Transparency Obligations
> **For**: Providers of General-Purpose AI Models
> **Deadline**: August 2, 2025 (12 months after entry into force)
> **Document ID**: GPAI-[YYYY]-[NNN]

<!-- GUIDANCE: Art. 53(1) requires GPAI providers to draw up and keep up to date
     technical documentation of the model, including training and testing processes
     and results of evaluation, following Annex XI. This must be provided to the
     AI Office and downstream providers upon request. -->

---

## 1. Document Control

| Field | Value |
|-------|-------|
| Model Name | [AI System Name] |
| Provider | [Company Name] |
| Version | [X.Y] |
| Document ID | GPAI-[YYYY]-[NNN] |
| Created | [Date] |
| Last Review | [Date] |

---

## 2. Model Identification (Annex XI §1)

<!-- GUIDANCE: Annex XI(1)(a)-(c) requires identification of the model,
     including resources used for development and known limitations. -->

| Field | Value |
|-------|-------|
| Model name and version | |
| Date of release | |
| Modalities (text/image/code/multi) | |
| Architecture type | |
| Number of parameters | |
| Context window | |
| Input/output formats | |
| License | |

---

## 3. Training Description (Annex XI §2)

<!-- GUIDANCE: Annex XI(1)(d) requires description of relevant information
     about the data used for training, testing, and validation. -->

### 3.1 Training Data

| Aspect | Description |
|--------|-------------|
| Data sources | |
| Data volume (tokens/samples) | |
| Data cutoff date | |
| Languages covered | |
| Web crawling methodology (if used) | |
| Data filtering / cleaning process | |
| Copyrighted material policy | |

### 3.2 Training Process

| Aspect | Description |
|--------|-------------|
| Training methodology | |
| Compute used (FLOPs) | |
| Hardware | |
| Training duration | |
| Fine-tuning approach | |
| RLHF / alignment method | |

---

## 4. Evaluation and Testing (Annex XI §3)

<!-- GUIDANCE: Annex XI(1)(e) requires quantitative evaluation results,
     including benchmark performance across capabilities and limitations. -->

### 4.1 Benchmark Results

| Benchmark | Score | Date | Notes |
|-----------|-------|------|-------|
| | | | |

### 4.2 Safety Evaluations

| Test | Methodology | Result | Threshold |
|------|-------------|--------|-----------|
| Toxicity | | | |
| Bias / Fairness | | | |
| Hallucination rate | | | |
| Instruction following | | | |
| Refusal behavior | | | |

---

## 5. Known Limitations (Annex XI §1(c))

| # | Limitation | Circumstances | Impact |
|---|-----------|---------------|--------|
| 1 | | | |

---

## 6. Capabilities (Annex XI §1(b))

| Capability | Description | Evidence |
|-----------|-------------|---------|
| | | |

---

## 7. Copyright Compliance (Art. 53(1)(c))

<!-- GUIDANCE: Art. 53(1)(c) requires GPAI providers to put in place a policy to
     comply with Union copyright law, in particular to identify and comply with
     reservations of rights expressed pursuant to Art. 4(3) of Directive (EU) 2019/790. -->

| Aspect | Description |
|--------|-------------|
| Copyright compliance policy | |
| Opt-out mechanism (Art. 4(3) Dir. 2019/790) | |
| Training data rights verification | |
| Rights reservation identification method | |

---

## 8. Summary for Downstream Providers (Art. 53(1)(b))

<!-- GUIDANCE: Art. 53(1)(b) requires making available to downstream providers
     sufficiently detailed information about the model's capabilities and limitations
     to enable them to comply with their obligations under the AI Act. -->

| Field | Value |
|-------|-------|
| Model capabilities summary | |
| Known limitations for downstream use | |
| Intended downstream use cases | |
| Not suitable for | |
| Integration guidance | |
| Reporting mechanism for issues | |

---

## 9. Energy Consumption (Art. 53(1)(a))

<!-- GUIDANCE: Art. 53(1)(a) requires documenting energy consumption for
     training and inference. -->

| Phase | Energy (kWh) | Carbon Footprint (tCO2e) | Methodology |
|-------|-------------|-------------------------|-------------|
| Training | | | |
| Fine-tuning | | | |
| Inference (per 1M tokens) | | | |

---

## Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Model Lead | | | |
| Compliance Officer | | | |
