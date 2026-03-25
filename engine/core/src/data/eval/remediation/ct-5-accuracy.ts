import type { CategoryPlaybook } from '../../../domain/eval/remediation-types.js';

export const CT_5_PLAYBOOK: CategoryPlaybook = Object.freeze({
  category_id: 'accuracy',
  label: 'Accuracy & Hallucination Resistance',
  article_ref: 'Art.15',
  description: 'Factual correctness, hallucination prevention, and knowledge boundary awareness',
  actions: Object.freeze([
    Object.freeze({
      id: 'CT-5-A1',
      type: 'system_prompt' as const,
      title: 'Hallucination Prevention',
      description: 'Add instructions to prevent fabrication of facts, citations, and data',
      example: 'Add to system prompt:\n"Never fabricate facts, statistics, citations, or URLs. If you don\'t know something, say \'I don\'t have that information\' rather than guessing. Never invent sources."',
      priority: 'critical' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.15(1)',
      user_guidance: Object.freeze({
        why: 'Art.15 requires appropriate levels of accuracy. Hallucinated outputs can cause real harm in high-risk domains.',
        what_to_do: Object.freeze([
          'Add to your system message: "Never fabricate facts, statistics, citations, URLs, case law, or quotes. If you do not have reliable information, respond with: \'I don\'t have verified information on that.\' Never invent a source to support a claim. Never generate fake URLs. If you cite something, it must come from your training data or provided context — if unsure, say so."',
          'In your output post-processing, validate any URLs in LLM responses with a lightweight HEAD request (with a 3-second timeout). Strip or flag URLs that return 404 or fail to resolve. For citations, consider a regex check for suspicious patterns like fabricated DOI numbers or non-existent journal names.',
          'Set the API temperature parameter to 0.0-0.3 for fact-sensitive queries (lower temperature reduces creative fabrication). If using OpenAI, set temperature: 0.2. If using Anthropic, set temperature: 0.2 in the API request body.',
        ]),
        verification: 'Ask about a fictional entity — AI should say it doesn\'t know rather than fabricating details',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/15/', 'Art.15(1) EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-5-A2',
      type: 'system_prompt' as const,
      title: 'Knowledge Boundary Awareness',
      description: 'Instruct AI to acknowledge its training data cutoff and knowledge limits',
      example: 'Add to system prompt:\n"Your training data has a cutoff date. For questions about recent events, inform the user that your information may be outdated and recommend checking current sources."',
      priority: 'high' as const,
      effort: 'minimal' as const,
      article_ref: 'Art.15(1)',
      user_guidance: Object.freeze({
        why: 'Users need to understand the timeliness and scope of AI knowledge to avoid acting on outdated information.',
        what_to_do: Object.freeze([
          'Add to your system message: "Your training data has a cutoff date. When asked about events, laws, prices, or statistics that may have changed after your training cutoff, respond with: \'My information may be outdated — please verify with a current source.\' For time-sensitive domains (law, medicine, finance), always include this caveat."',
          'If your application has access to current data (via RAG, database, or API), instruct the model to prefer provided context over training data: "When provided with context documents, use them as your primary source. Only fall back to training knowledge when no relevant context is available, and clearly indicate when you do so."',
          'Re-run: complior eval --categories accuracy — verify CT-5-A2 passes.',
        ]),
        verification: 'Ask about very recent events — AI should acknowledge potential knowledge gaps',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/15/', 'Art.15(1) EU AI Act']),
      }),
    }),
    Object.freeze({
      id: 'CT-5-A3',
      type: 'infrastructure' as const,
      title: 'Retrieval-Augmented Generation (RAG)',
      description: 'Implement RAG to ground responses in verified data sources',
      example: 'Integrate a knowledge base:\n1. Index verified documents\n2. Retrieve relevant context before generating\n3. Cite sources in responses',
      priority: 'medium' as const,
      effort: 'significant' as const,
      article_ref: 'Art.15(1)',
      user_guidance: Object.freeze({
        why: 'RAG significantly reduces hallucination by grounding AI responses in verified, up-to-date documents.',
        what_to_do: Object.freeze([
          'Set up a vector store (e.g., Pinecone, Weaviate, pgvector, or ChromaDB) and index your verified documents. Chunk documents into 500-1000 token segments with overlap. Use the same embedding model for indexing and query-time retrieval (e.g., text-embedding-3-small for OpenAI).',
          'Before each LLM call, query the vector store with the user\'s input to retrieve the top 3-5 relevant chunks. Inject them into the system or user message as context: "Answer based on the following verified documents: [chunk1] [chunk2] ... If the answer is not found in these documents, say so."',
          'Add to your system message: "When you use information from the provided context, cite the source document name and section. Format: [Source: document-name.pdf, p.12]. Never combine information from context documents with unverified training knowledge without clearly distinguishing between them."',
        ]),
        verification: 'Ask domain-specific questions — AI should cite specific sources from your knowledge base',
        resources: Object.freeze(['https://artificialintelligenceact.eu/article/15/', 'Art.15 EU AI Act']),
      }),
    }),
  ]),
});
