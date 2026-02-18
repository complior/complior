# EU AI Act — Marketing Content for Complior.ai

---

## 1. Quick Check Questions (Free Website Tool)

**Title: "Is the EU AI Act relevant to your company? Find out in 2 minutes."**

1. Does your company develop, sell, or use AI-powered tools or software?
   - Yes → Continue
   - No → The EU AI Act likely doesn't apply to you.

2. Do you have customers, users, or any business activity in the EU?
   - Yes → Continue
   - No, but our AI outputs might reach EU users → Continue
   - No EU connection whatsoever → The Act likely doesn't apply to you.

3. What is your role with AI?
   - We BUILD AI products (Provider)
   - We USE AI tools built by others (Deployer)
   - Both

4. Is any of your AI used for: hiring, credit scoring, healthcare, education grading, law enforcement, or critical infrastructure?
   - Yes → You likely have HIGH-RISK obligations
   - No → Continue

5. Does your AI directly chat with users or generate images/text/audio/video?
   - Yes → You have TRANSPARENCY obligations
   - No → You have minimal obligations (but AI literacy is still required!)

6. How many employees does your company have?
   - <250 (SME — reduced fines apply)
   - 250+ (Standard fines apply)

7. What is your approximate global annual revenue?
   - [Input field] → Used for penalty calculation

**CTA: "Get your full compliance roadmap → Sign up for Complior.ai"**

---

## 2. Penalty Calculator Formula

```
Input: global_annual_revenue (EUR)

Tier 1 — Prohibited Practices (Art. 5 violations):
  max_fine = MAX(35,000,000, global_annual_revenue * 0.07)

Tier 2 — High-Risk / Operator Obligations:
  max_fine = MAX(15,000,000, global_annual_revenue * 0.03)

Tier 3 — Incorrect Information to Authorities:
  max_fine = MAX(7,500,000, global_annual_revenue * 0.01)

Tier GPAI — General-Purpose AI Provider:
  max_fine = MAX(15,000,000, global_annual_revenue * 0.03)

SME Adjustment (if employees < 250 OR revenue < €50M):
  max_fine = MIN(percentage_amount, fixed_amount)  // Lower of the two, not higher

Output: {
  tier_1_max: formatted_amount,
  tier_2_max: formatted_amount,
  tier_3_max: formatted_amount,
  sme_applies: boolean,
  note: "Actual fines depend on severity, duration, cooperation, and other factors per Art. 99(7)."
}
```

**Example outputs:**
- Company with €100M revenue: Tier 1 = €7M (7%), Tier 2 = €15M (fixed higher), Tier 3 = €7.5M (fixed higher)
- Company with €1B revenue: Tier 1 = €70M, Tier 2 = €30M, Tier 3 = €10M
- SME with €5M revenue: Tier 1 = €350K (lower of 7% vs €35M), Tier 2 = €150K, Tier 3 = €50K

---

## 3. Blog Post Outline

### "EU AI Act: What AI Deployers Need to Know in 2026"

**Target audience:** CTOs, Heads of Compliance, GCs at companies using AI tools
**Word count:** 2,000-2,500 words
**SEO keywords:** EU AI Act compliance, AI Act deployer obligations, AI regulation 2026, EU AI Act penalties

**Outline:**

1. **Introduction: August 2026 Is Closer Than You Think**
   - The majority of EU AI Act obligations kick in on August 2, 2026
   - If you USE AI in your business (even ChatGPT or Copilot), you are a "deployer" and you have obligations
   - This is not just about AI companies — it's about EVERY company using AI

2. **Are You a "Deployer"? (Probably Yes)**
   - Definition of deployer under Art. 3(4)
   - Common examples: HR using AI screening, marketing using AI content generation, customer service chatbots, AI-powered analytics
   - Extraterritorial reach: if you're outside the EU but serve EU customers, the Act applies

3. **What's Already in Force (As of Feb 2025)**
   - Prohibited practices: what you can't do with AI
   - AI literacy: training requirement for all staff

4. **The Big Deadline: August 2, 2026**
   - High-risk AI deployer obligations (use per instructions, human oversight, monitoring, log retention)
   - Transparency: disclose AI interaction, label AI content
   - Worker notification for workplace AI
   - FRIA for public entities and credit/insurance deployers

5. **Risk Classification: How to Know Your Obligations**
   - The 4-level pyramid explained
   - Quick self-assessment: 5 questions to determine your risk level
   - Most companies using AI tools will have Limited Risk or Minimal Risk obligations
   - Some will have High-Risk obligations (HR, finance, healthcare)

6. **The Penalty Reality**
   - Up to €35M or 7% global turnover for prohibited practices
   - Up to €15M or 3% for other violations
   - SME protections
   - Comparison to GDPR fines to establish seriousness

7. **Your 6-Step Compliance Action Plan**
   - Step 1: Inventory all AI systems
   - Step 2: Classify risk levels
   - Step 3: Screen against prohibited practices
   - Step 4: Implement role-specific obligations
   - Step 5: Document everything
   - Step 6: Monitor and review

8. **How Complior.ai Helps** (soft CTA)
   - Automated compliance assessment
   - Document templates
   - Monitoring dashboards
   - Multi-jurisdiction support

---

## 4. Comparison Table: EU AI Act vs Other Regulations

| Feature | EU AI Act | Colorado SB 205 | NYC LL 144 | Canada AIDA (proposed) |
|---------|-----------|-----------------|------------|----------------------|
| **Status** | In force (phased) | Enacted (eff. Feb 2026) | In force | Proposed (stalled) |
| **Scope** | All AI systems | High-risk automated decisions | Automated employment decisions only | High-impact AI systems |
| **Risk-based approach** | Yes (4 levels + GPAI) | Yes (consequential decisions) | No (single scope) | Yes (high-impact) |
| **Prohibited practices** | Yes (8 categories) | No explicit prohibitions | No | Limited |
| **Impact assessment** | FRIA (Art. 27) | Required for deployers | Bias audit required | Required |
| **Transparency / disclosure** | AI interaction + content marking | Notice before adverse decision | Notice + published results | TBD |
| **Worker notification** | Yes (Art. 26(7)) | No specific requirement | No | TBD |
| **GPAI-specific rules** | Yes (Chapter V) | No | No | No |
| **Max penalty** | €35M / 7% global turnover | $20K per violation | $500-$1,500/day | TBD |
| **Extraterritorial** | Yes | Yes (if CO residents affected) | Yes (NYC residents) | Yes (Canadian market) |
| **AI literacy requirement** | Yes (Art. 4) | No | No | No |
| **Content marking (AI-generated)** | Yes (machine-readable) | No | No | No |

---

## 5. FAQ — 10 Questions Companies Ask About the EU AI Act

**Q1: "We're a US company. Does the EU AI Act apply to us?"**
A: Yes, if you sell, deploy, or provide AI systems to EU customers, or if your AI's output is used by anyone in the EU. The Act has extraterritorial reach similar to GDPR.

**Q2: "We don't build AI — we just use ChatGPT and some AI SaaS tools. Do we still have obligations?"**
A: Yes. Under the EU AI Act, you are a "deployer" and have obligations including: AI literacy training (already in force), using AI per provider instructions, transparency disclosures, monitoring, and potentially impact assessments depending on your use case.

**Q3: "What's the biggest fine we could face?"**
A: Up to €35 million or 7% of global annual turnover (whichever is higher) for prohibited practices. Up to €15 million or 3% for other violations. SMEs get reduced caps.

**Q4: "When do we need to comply?"**
A: Key dates: Prohibited practices + AI literacy: already in force (Feb 2025). GPAI rules: in force (Aug 2025). High-risk + transparency + most obligations: August 2, 2026. Full enforcement: August 2, 2027.

**Q5: "How do we know if our AI is 'high-risk'?"**
A: Check if it's used in: hiring/recruitment, credit/lending, insurance underwriting, education grading, healthcare diagnostics, critical infrastructure management, law enforcement, border control, or judicial decisions. Also high-risk if it's a safety component of an EU-regulated product (medical devices, machinery, etc.).

**Q6: "Do we need to tell people they're talking to a chatbot?"**
A: Yes. Article 50(1) requires that any AI system directly interacting with people must inform them they're interacting with AI. This applies from August 2, 2026.

**Q7: "What about open-source AI models?"**
A: Open-source GPAI models have reduced documentation requirements (Art. 53(2)). However, if an open-source model is classified as having systemic risk, additional obligations apply. Deployers of open-source AI still have full deployer obligations.

**Q8: "We use AI for internal processes only. Does the Act still apply?"**
A: Yes, if the AI affects people in the EU (employees, applicants, customers). Internal HR AI tools used for recruitment or performance management are explicitly high-risk under Annex III.

**Q9: "What's the difference between the EU AI Act and GDPR for AI?"**
A: GDPR regulates personal data processing. The EU AI Act regulates the AI systems themselves — their design, deployment, transparency, and risk management. They complement each other: AI systems processing personal data must comply with both.

**Q10: "How should we prepare right now?"**
A: Start with: (1) inventory all AI systems, (2) classify their risk level, (3) verify no prohibited practices, (4) implement AI literacy training, (5) assess high-risk system obligations, (6) use a compliance platform like Complior.ai to automate and track compliance.

---

## 6. LinkedIn Post Draft

**Title:** The EU AI Act isn't coming — it's here. And it applies to you.

Most companies think the EU AI Act is about AI companies. It's not.

If you USE ChatGPT in your team, AI tools in your HR department, or AI-powered analytics — you are a "deployer" under the EU AI Act, and you have legal obligations.

Here's what's already required:
→ AI literacy training for your team (since February 2025)
→ Screening all AI tools against prohibited practices

Here's what's coming August 2, 2026:
→ Human oversight of high-risk AI decisions
→ Transparency: tell users when they're talking to AI
→ Impact assessments for AI in HR, finance, healthcare
→ Log retention: keep AI interaction records for 6+ months

The fines? Up to €35M or 7% of global revenue. This is GDPR-level serious.

The good news: most obligations are manageable if you start now. The bad news: August 2026 is 6 months away.

Three things to do this week:
1. List every AI tool your company uses
2. Check if any are used for high-risk decisions (hiring, lending, grading)
3. Start AI literacy training

Complior.ai helps companies go from "we have no idea" to "fully compliant" in weeks, not months. Free compliance check at complior.ai.

#EUAIAct #AICompliance #AIRegulation #ArtificialIntelligence #GRC #Compliance

---

## 7. Programmatic Page Template

**URL Pattern:** `/compliance/eu-ai-act/[tool-name]`
**Example:** `/compliance/eu-ai-act/chatgpt`

### Page Title:
"Is [Tool Name] Compliant with the EU AI Act?"

### Page Structure:

**Hero Section:**
- H1: "EU AI Act Compliance Guide for [Tool Name] Users"
- Subtitle: "Everything deployers of [Tool Name] need to know about EU AI Act obligations"
- CTA: "Check your compliance status → Free assessment"

**Section 1: [Tool Name] and the EU AI Act**
- What [Tool Name] is (brief)
- Your role: as a user, you are a "deployer" under the EU AI Act
- [Tool Name]'s provider obligations vs. YOUR deployer obligations
- Risk classification of typical [Tool Name] use cases

**Section 2: Your Obligations When Using [Tool Name]**
- AI literacy (Art. 4): Train your team on responsible [Tool Name] use
- Transparency (Art. 50): If using [Tool Name] in customer-facing interactions, disclose AI use
- Content marking: AI-generated content from [Tool Name] must be identifiable
- If used for high-risk decisions (HR, finance): Full high-risk deployer obligations apply
- Log retention: Keep records of [Tool Name] use for compliance purposes

**Section 3: Risk Level Quick Check**
- Interactive questionnaire (5 questions) determining risk level for this specific tool
- Results: Minimal / Limited / High risk with specific obligation list

**Section 4: What [Tool Name]'s Provider Does vs. What YOU Must Do**
- Two-column comparison: Provider obligations (their responsibility) vs. Deployer obligations (your responsibility)

**Section 5: Compliance Checklist for [Tool Name] Deployers**
- [ ] AI literacy training completed for all [Tool Name] users
- [ ] Prohibited practices screening done
- [ ] AI disclosure implemented (if user-facing)
- [ ] Human oversight assigned (if high-risk use)
- [ ] Monitoring process established
- [ ] Logs retention configured (6+ months)
- [ ] Worker notification sent (if workplace AI)

**CTA Section:**
- "Automate your [Tool Name] compliance with Complior.ai"
- Free compliance score
- See all your obligations in one dashboard

**SEO Data:**
- Title tag: "Is [Tool Name] Compliant with the EU AI Act? | Compliance Guide 2026"
- Meta description: "Using [Tool Name] in the EU? Learn your deployer obligations under the EU AI Act, risk classification, and compliance checklist. Free assessment."
- Target keywords: "[Tool Name] EU AI Act", "[Tool Name] compliance", "EU AI Act [Tool Name]"
