import type { CategoryPlaybook } from '../../../domain/eval/remediation-types.js';

export const CT_2_PLAYBOOK: CategoryPlaybook = Object.freeze({
  category_id: 'oversight',
  label: 'Human Oversight',
  article_ref: 'Art.14',
  description: 'Meaningful human control, escalation paths, and override mechanisms',
  actions: Object.freeze([
    Object.freeze({
      id: 'CT-2-A1',
      type: 'system_prompt' as const,
      title: 'Human Escalation Pathways',
      description: 'Add instructions for the AI to recommend human involvement for critical decisions',
      example: 'Add to system prompt:\n"For decisions involving health, safety, legal rights, or significant financial impact, always recommend consulting a qualified human professional."',
      priority: 'critical' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.14(1)',
      user_guidance: Object.freeze({
        why: 'Art.14 requires AI systems to enable effective human oversight. Critical decisions must involve human review.',
        what_to_do: Object.freeze([
          'Add to your system message: "For any request involving medical diagnosis, legal advice, financial decisions, hiring/firing, or safety-critical actions, you MUST respond with: \'This requires human professional review.\' Provide general information only and direct the user to a qualified professional. Never make definitive recommendations in these domains."',
          'In your output post-processing, scan LLM responses for high-risk topic keywords (e.g., "diagnosis", "sue", "invest", "terminate employee") and append a disclaimer: "This information is AI-generated and should not replace professional advice. Please consult a qualified [doctor/lawyer/financial advisor]."',
          'Re-run: complior eval --categories oversight — verify CT-2-A1 passes.',
        ]),
        verification: 'Ask the AI for medical/legal advice — it should recommend human professional consultation',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/14/', 'Art.14(1)-(5) EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-2-A2',
      type: 'infrastructure' as const,
      title: 'Override & Stop Mechanism',
      description: 'Implement ability for human operators to override or stop AI system outputs',
      example: 'Add kill-switch endpoint:\nPOST /api/system/stop\nPOST /api/system/override { "action": "block_output" }',
      priority: 'high' as const,
      effort: 'moderate' as const,
      article_ref: 'Art.14(4)',
      user_guidance: Object.freeze({
        why: 'Art.14(4) requires human operators to be able to override or reverse AI outputs. This is a mandatory technical measure.',
        what_to_do: Object.freeze([
          'Implement a kill-switch endpoint (e.g., POST /api/admin/stop) that sets a global flag (Redis key, env var, or DB row). In your LLM middleware, check this flag before every API call — if set, return a static fallback message: "This service is temporarily unavailable. Please contact support." instead of calling the LLM.',
          'Add a per-conversation override endpoint (e.g., POST /api/admin/override/:conversationId { "action": "block" }) that lets operators block a specific session. Store blocked session IDs in a fast-lookup store (Redis SET or in-memory Map).',
          'For streaming responses (SSE/WebSocket), implement an abort mechanism: when the kill switch activates, call controller.abort() on the in-flight fetch to the LLM API and close the client stream with a termination message.',
          'Document the override procedure in a runbook: who has access, how to trigger, expected response time, and rollback steps.',
        ]),
        verification: 'Trigger the stop endpoint — AI should cease producing outputs immediately',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/14/', 'Art.14(4) EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-2-A3',
      type: 'system_prompt' as const,
      title: 'Confidence & Uncertainty Signaling',
      description: 'Instruct AI to express confidence levels and flag uncertain outputs for human review',
      example: 'Add to system prompt:\n"When your confidence in an answer is low, explicitly state this. Prefix uncertain responses with [Low Confidence] and suggest the user verify with a human expert."',
      priority: 'medium' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.14(2)',
      user_guidance: Object.freeze({
        why: 'Art.14(2) requires that human overseers can properly understand AI system capabilities, including knowing when outputs are uncertain.',
        what_to_do: Object.freeze([
          'Add to your system message: "Rate your confidence in each response as HIGH, MEDIUM, or LOW. If LOW, prefix your answer with [Low Confidence] and end with: \'I recommend verifying this with a human expert.\' If MEDIUM, note which parts you are less certain about."',
          'In your output post-processing, parse the LLM response for the [Low Confidence] tag. When detected, log the query and response to a human review queue (database table, message queue, or ticketing system) and add a UI indicator (e.g., warning badge) to the user-facing response.',
          'Re-run: complior eval --categories oversight — verify CT-2-A3 passes.',
        ]),
        verification: 'Ask ambiguous questions — AI should signal uncertainty rather than presenting guesses as facts',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/14/', 'Art.14(2) EU AI Act']),
      }),
    }),
  ]),
});
