import type { CategoryPlaybook } from '../../../domain/eval/remediation-types.js';

export const CT_3_PLAYBOOK: CategoryPlaybook = Object.freeze({
  category_id: 'explanation',
  label: 'Explanation Quality',
  article_ref: 'Art.13',
  description: 'Clear reasoning and decision explanation to enable user understanding',
  actions: Object.freeze([
    Object.freeze({
      id: 'CT-3-A1',
      type: 'system_prompt' as const,
      title: 'Structured Reasoning',
      description: 'Instruct AI to provide step-by-step reasoning for its conclusions',
      example: 'Add to system prompt:\n"Always explain your reasoning step by step. Show how you arrived at your conclusion. If multiple factors influenced your answer, list them."',
      priority: 'high' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.13(1)',
      user_guidance: Object.freeze({
        why: 'Art.13(1) requires AI systems to be designed to enable users to interpret outputs and use them appropriately.',
        what_to_do: Object.freeze([
          'Add to your system message: "For every recommendation or conclusion, explain your reasoning step by step. Use this format: 1) State what you understood from the question, 2) List the key facts or assumptions, 3) Explain your reasoning process, 4) State your conclusion. Never give a bare conclusion without explanation."',
          'If your application makes decisions (e.g., content moderation, scoring, classification), instruct the model to return structured output: { "decision": "...", "reasoning": ["step1", "step2"], "confidence": "high|medium|low" } and display the reasoning array to the user.',
          'Re-run: complior eval --categories explanation — verify CT-3-A1 passes.',
        ]),
        verification: 'Ask the AI to make a recommendation — it should provide clear reasoning, not just a conclusion',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/13/', 'Art.13(1) EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-3-A2',
      type: 'system_prompt' as const,
      title: 'Decision Factor Transparency',
      description: 'Instruct AI to list the key factors that influenced its decision or recommendation',
      example: 'Add to system prompt:\n"When making recommendations, list the key factors considered. Format: \'Key factors: 1) ... 2) ... 3) ...\'"',
      priority: 'medium' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.86',
      user_guidance: Object.freeze({
        why: 'Art.86 gives affected persons the right to obtain meaningful explanations of AI-assisted decisions.',
        what_to_do: Object.freeze([
          'Add to your system message: "When making any recommendation or assessment, always list the specific factors that influenced your answer under a \'Key factors\' heading. Each factor must be concrete and verifiable — never use vague phrases like \'various considerations\' or \'multiple factors.\' Example: \'Key factors: 1) The contract expires in 30 days, 2) Market rates have increased 12% since signing, 3) The renewal clause requires 60-day notice.\'"',
          'For decision-support applications, use structured output (JSON mode or function calling) to separate the decision from the factors: { "recommendation": "...", "factors": [{ "factor": "...", "weight": "high|medium|low" }] }. Display factors alongside the recommendation in your UI.',
          'Write the explanations for a non-technical audience: add to system prompt: "Explain your reasoning in plain language that someone without domain expertise can understand. Avoid jargon; if you must use a technical term, define it inline."',
        ]),
        verification: 'Request a decision — the AI should list the factors that influenced it',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/86/', 'Art.86 EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-3-A3',
      type: 'system_prompt' as const,
      title: 'Source Attribution',
      description: 'Instruct AI to cite sources and distinguish between factual claims and opinions',
      example: 'Add to system prompt:\n"When stating facts, indicate your source if known. Clearly distinguish between established facts, your analysis, and speculation."',
      priority: 'medium' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.13(1)',
      user_guidance: Object.freeze({
        why: 'Users need to distinguish between verified information and AI-generated analysis to make informed decisions.',
        what_to_do: Object.freeze([
          'Add to your system message: "Classify every claim you make as one of: [Fact] — established, widely accepted information; [Analysis] — your interpretation based on the provided context; [Speculation] — your best guess where data is incomplete. Prefix each paragraph or bullet point with the appropriate tag."',
          'If using RAG, instruct the model to cite retrieved documents by name or ID: "When referencing information from provided context, cite the source in brackets, e.g., [Source: company-policy-v2.pdf, Section 3.1]. Never paraphrase a source without attribution."',
          'In output post-processing, validate that responses containing factual claims include at least one [Fact] or [Source:] tag. If none found, append a warning: "Note: This response has not been verified against authoritative sources."',
        ]),
        verification: 'Ask for factual information — AI should indicate source reliability',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/13/', 'Art.13(1) EU AI Act']),
      }),
    }),
  ]),
});
