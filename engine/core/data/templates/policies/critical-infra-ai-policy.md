# AI Usage Policy — Critical Infrastructure

| Field | Value |
|-------|-------|
| Policy Title | AI Usage Policy — Critical Infrastructure |
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 1. Purpose and Scope
<!-- GUIDANCE: Critical infrastructure AI is high-risk under Annex III §2.
Covers: energy (electricity, gas, heating, oil), water supply & wastewater,
transport (road, rail, air, maritime), digital infrastructure, and any safety
component of critical infrastructure. Example: "Covers: AI-based load balancing
for national power grid (Annex III §2(a)), predictive maintenance for water
treatment (Annex III §2(b)), excludes non-safety administrative systems." -->

This policy governs the use of [AI System Name] within [Organization]'s critical infrastructure operations. It establishes requirements for safe, reliable and resilient use of AI in the management and operation of critical infrastructure, in accordance with the EU AI Act (Regulation 2024/1689) and the NIS2 Directive (EU 2022/2555).

This policy applies to all personnel involved in deploying, operating, supervising, or maintaining AI systems that serve as safety components of critical infrastructure, including control room operators, engineers, maintenance staff, and system administrators.

## 2. Applicable Legislation
<!-- GUIDANCE: Critical infrastructure AI is subject to AI Act, NIS2 Directive
(cybersecurity), sector-specific regulation (energy: Electricity Regulation;
transport: EASA; water: Drinking Water Directive), and potentially SEVESO III.
Example: "Primary: AI Act Annex III §2; NIS2 Directive Art. 21 (cybersecurity
measures); Electricity Regulation (EU 2019/943) for grid operations;
GDPR Art. 6(1)(d) vital interests for emergency systems." -->

- **EU AI Act** — Annex III §2: AI systems intended as safety components in the management and operation of critical digital infrastructure, road traffic, or supply of water, gas, heating or electricity
- **Art. 6(2)** — High-risk AI system classification
- **Art. 9** — Risk management system requirements
- **Art. 10** — Data governance and management practices
- **Art. 14** — Human oversight measures
- **Art. 15** — Accuracy, robustness and cybersecurity
- **Art. 26** — Obligations of deployers of high-risk AI systems
- **NIS2 Directive** (EU 2022/2555) — Art. 21 (cybersecurity risk management), Art. 23 (incident reporting)
- **Critical Entities Resilience Directive** (EU 2022/2557, CER) — resilience requirements
- **Sector-specific regulation** — [applicable sector regulation, e.g., Electricity Regulation, EASA, Drinking Water Directive]
- **GDPR** — Art. 6(1)(d) (vital interests) for emergency response systems

## 3. AI System Description
<!-- GUIDANCE: Specify the critical infrastructure sector, the safety function
the AI performs, and the consequences of failure. Include redundancy and
fallback architecture. Example: "AI-based predictive maintenance for high-voltage
transformers (400kV). Predicts failure probability from vibration, thermal, and
dissolved gas analysis. Failure to predict → transformer explosion risk. Triple
redundancy: AI + rule-based backup + manual inspection schedule." -->

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Infrastructure sector: [energy / water / transport / digital / gas / heating]
- Safety function: [monitoring / control / prediction / optimization / emergency response]
- Autonomy level: [Autonomy Level]

## 4. Risk Classification
<!-- GUIDANCE: All AI safety components in critical infrastructure are high-risk
under Annex III §2. Document the specific safety function and failure modes.
Example: "High-risk under Annex III §2(a): AI safety component for electricity
grid load balancing. Failure mode: incorrect demand prediction → load shedding
or cascade failure. Impact: potential blackout affecting [N] households." -->

This AI system is classified as **[Risk Class]** under the EU AI Act. AI systems used as safety components in critical infrastructure management are classified as high-risk under Annex III §2.

**Safety Function Assessment:**
- Safety-critical function: [describe]
- Failure modes identified: [describe]
- Maximum acceptable failure rate: [define]
- Impact of failure: [describe consequences for population, services, environment]

## 5. Data Governance
<!-- GUIDANCE: Critical infrastructure data includes SCADA/ICS telemetry,
sensor data, operational parameters. Data integrity is paramount — corrupted
input can cause physical damage. Include data validation, anomaly filtering,
and sensor calibration requirements. Example: "Input: 10,000 sensor readings/sec
from grid SCADA. Validation: range checks, temporal consistency, sensor health
status. Anomalous readings quarantined and flagged. Sensor calibration: quarterly
per ISO 17025. Training data: 5 years of grid operational data, cleaned for
sensor faults and extreme weather events." -->

- Data inputs must be validated for integrity, completeness and temporal consistency before AI processing
- Sensor data must be calibrated according to applicable industrial standards
- Anomalous readings must be flagged and quarantined rather than silently processed
- Training data must reflect operational conditions including extreme and failure scenarios
- Data provenance must be documented for all datasets used in training and operation
- Cybersecurity measures must protect data in transit and at rest (NIS2 Art. 21)

## 6. Human Oversight
<!-- GUIDANCE: Critical infrastructure AI must NEVER be fully autonomous for
safety-critical decisions. Human-in-the-loop for all actions that could affect
physical safety. Operators must be trained to recognize AI errors under stress.
Example: "Control room operator reviews all AI recommendations before execution.
Emergency actions (load shedding, valve closure): AI recommends, operator
confirms within 60 seconds, automatic safe-state if no response. Operator
can override any AI recommendation via physical control panel." -->

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
- Safety-critical actions must require human confirmation before execution
- Control room operators must have the ability to override any AI-generated recommendation
- Physical override mechanisms must exist independent of AI system operation
- Automatic safe-state fallback must activate if human oversight becomes unavailable
- Operators must receive decision support information including confidence levels and alternatives

## 7. Transparency and Disclosure
<!-- GUIDANCE: For critical infrastructure, transparency is toward operators,
regulators, and potentially affected populations. Public disclosure must balance
transparency with security (no vulnerability disclosure). Example: "Operators:
full AI decision reasoning displayed on SCADA HMI. Regulator: annual report
with system description, performance metrics, incident log. Public: general
description only — no operational parameters or system architecture." -->

- Control room operators must have access to AI decision reasoning and confidence levels
- Regulatory authorities must receive periodic reports on AI system performance and incidents
- Public disclosure must balance transparency requirements with critical infrastructure security
- AI-generated operational decisions in system logs must be clearly marked as AI-assisted

## 8. Resilience and Redundancy
<!-- GUIDANCE: Critical infrastructure AI must be fault-tolerant. Define N+1 or
N+2 redundancy. Specify degraded operation modes and manual fallback. Include
cyber-physical attack resilience. Example: "N+2 redundancy: primary AI + backup
AI (different vendor) + manual rule-based control. If primary AI unavailable:
automatic failover to backup within 5 seconds. If both AI unavailable: manual
mode with enhanced operator staffing. Recovery: AI restart within 15 minutes
or full manual operation maintained indefinitely." -->

- The AI system must have documented redundancy architecture (N+1 minimum for safety functions)
- Automatic failover to backup systems must occur within defined time limits
- Manual operation mode must be available and regularly tested
- System recovery procedures must be documented and tested at least quarterly
- Degraded operation modes must be defined for partial AI system availability
- Business continuity plan must cover extended AI system unavailability

## 9. Cybersecurity (Art. 15 + NIS2)
<!-- GUIDANCE: Critical infrastructure AI is a prime target for cyber-physical
attacks. Adversarial ML attacks (data poisoning, evasion) can cause physical
damage. NIS2 requires specific cybersecurity measures. Example: "Input validation:
sensor data range checks + temporal anomaly detection. Adversarial robustness:
tested against FGSM and PGD attacks on sensor inputs. Network: air-gapped OT
network, encrypted AI model updates via secure channel. NIS2 Art. 21 measures:
risk analysis, incident handling, business continuity, supply chain security." -->

- AI model and data pipelines must be protected against adversarial attacks (data poisoning, evasion, model extraction)
- Network segmentation must isolate AI systems from general IT networks
- AI model updates must follow secure deployment procedures with integrity verification
- Penetration testing must include AI-specific attack vectors
- NIS2 Art. 21 cybersecurity measures must be implemented and documented
- Supply chain security must be assessed for AI model components and dependencies

## 10. Monitoring and Logging
<!-- GUIDANCE: Continuous monitoring is essential for safety-critical AI.
Include both AI performance metrics and physical outcome monitoring.
Correlation between AI decisions and physical system state is critical.
Example: "Real-time: prediction accuracy vs. actual sensor readings. Daily:
drift detection on input data distribution. Weekly: performance metric review
by engineering team. Monthly: correlation analysis AI predictions vs. actual
failures. All decisions logged: timestamp, inputs, output, confidence, operator
action, physical outcome. Retained 10 years per sector regulation." -->

- All AI decisions must be logged with: timestamp, inputs, outputs, confidence, operator action, physical outcome
- System performance must be monitored continuously for accuracy drift and anomalous behaviour
- Correlation between AI predictions and actual infrastructure events must be tracked
- Monitoring frequency: continuous with engineering team review at least weekly
- Logs must be retained per sector-specific regulation (minimum 5 years for safety systems)
- Log integrity must be protected (append-only, tamper-evident)

## 11. Incident Response
<!-- GUIDANCE: Critical infrastructure AI incidents may have immediate physical
consequences. Incident response must integrate with existing operational emergency
procedures. NIS2 Art. 23 requires 24-hour early warning + 72-hour notification.
Example: "Physical safety incident: immediate AI system suspension, emergency
operating procedures activated, NIS2 notification within 24h. AI accuracy
degradation >5%: automatic alert, operator assessment within 1h, system
suspension if confirmed. EU AI Act Art. 73 reporting: 2 days (serious harm)
or 15 days (other)." -->

- AI system incidents affecting physical safety must trigger immediate emergency operating procedures
- NIS2 incident reporting: early warning within 24 hours, full notification within 72 hours
- EU AI Act Art. 73 reporting: 2 days (death/serious harm), 15 days (other serious incidents)
- The AI system must be immediately suspended if safety-critical performance degrades
- Root cause analysis must determine whether failure is AI-specific or infrastructure-related
- Sector-specific incident reporting obligations must be fulfilled concurrently

## 12. Training and Awareness
<!-- GUIDANCE: Operators must understand AI limitations in safety-critical
context. Include simulator-based training for AI failure scenarios. Stress
testing of human-AI teaming under emergency conditions. Example: "16-hour
training: system operation (4h), AI limitations and failure modes (4h),
emergency procedures with AI unavailable (4h), simulator exercises (4h).
Annual recertification with emergency scenario simulation. Operators must
demonstrate competence in manual fallback procedures." -->

- All operators must receive training on AI system operation, limitations, and failure modes
- Training must include: manual operation procedures, emergency response, AI override mechanisms
- Simulator-based exercises must test operator response to AI system failures
- Competency assessment must be completed before independent system operation
- Refresher training must be provided at least annually and upon significant system changes

## 13. Review Schedule
<!-- GUIDANCE: Critical infrastructure AI requires more frequent review than
other domains due to safety implications. Align with sector-specific audit
cycles and NIS2 requirements. Example: "Monthly: AI performance metrics review.
Quarterly: full safety assessment. Semi-annually: cybersecurity audit (NIS2).
Annually: complete system re-evaluation including adversarial testing.
Immediate: upon any safety incident or regulatory change." -->

- This policy shall be reviewed at least quarterly and upon any safety-related change
- Review must incorporate performance data, incident reports, regulatory updates, and threat intelligence
- Annual comprehensive safety assessment including adversarial testing
- Updates must be approved by the Chief Operations Officer and Safety Committee

## 14. Approval and Sign-off
<!-- GUIDANCE: Critical infrastructure AI policy requires sign-off from
operations leadership and safety authority. CISO involvement mandatory for
NIS2 compliance. Example: "COO confirms operational adequacy; Safety Director
confirms risk assessment; CISO confirms NIS2 cybersecurity measures;
Sector regulator notified per applicable regulation." -->

| Role | Name | Date |
|------|------|------|
| Policy Owner | [Approver Name] | [Date] |
| Chief Operations Officer | _________________ | _________ |
| Safety Director | _________________ | _________ |
| Chief Information Security Officer | _________________ | _________ |
