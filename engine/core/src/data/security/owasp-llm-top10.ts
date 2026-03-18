/**
 * OWASP LLM Top 10 (2025) — extracted from Promptfoo (MIT License).
 * Data source: promptfoo/src/redteam/constants/frameworks.ts + metadata.ts
 *
 * Zero runtime dependency on Promptfoo. Static data only.
 */

import type { Severity } from '../../types/common.types.js';

export interface OwaspLlmCategory {
  readonly id: string;
  readonly owaspId: string;
  readonly name: string;
  readonly description: string;
  readonly severity: Severity;
  readonly plugins: readonly string[];
  readonly strategies: readonly string[];
  readonly obligationIds: readonly string[];
}

/**
 * OWASP LLM Top 10 categories with Promptfoo plugin mappings,
 * severity ratings, and EU AI Act obligation cross-references.
 */
export const OWASP_LLM_TOP_10: readonly OwaspLlmCategory[] = Object.freeze([
  {
    id: 'LLM01',
    owaspId: 'owasp:llm:01',
    name: 'Prompt Injection',
    description: 'Tests vulnerability to Unicode tag-based instruction smuggling, indirect prompt injection, system prompt extraction, and harmful content generation via prompt manipulation.',
    severity: 'critical',
    plugins: ['ascii-smuggling', 'indirect-prompt-injection', 'prompt-extraction', 'harmful'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-22', 'OBL-23', 'OBL-67'],
  },
  {
    id: 'LLM02',
    owaspId: 'owasp:llm:02',
    name: 'Sensitive Information Disclosure',
    description: 'Tests for PII exposure via API/database, direct exposure, session data leaks, social engineering vectors, privacy violations, cross-session data leakage, and system prompt disclosure.',
    severity: 'high',
    plugins: ['pii:api-db', 'pii:direct', 'pii:session', 'pii:social', 'harmful:privacy', 'cross-session-leak', 'prompt-extraction'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-24', 'OBL-25', 'OBL-69'],
  },
  {
    id: 'LLM03',
    owaspId: 'owasp:llm:03',
    name: 'Supply Chain',
    description: 'Tests for supply chain vulnerabilities in AI model dependencies, training data, and third-party integrations.',
    severity: 'high',
    plugins: [],
    strategies: [],
    obligationIds: ['OBL-41', 'OBL-42'],
  },
  {
    id: 'LLM04',
    owaspId: 'owasp:llm:04',
    name: 'Data and Model Poisoning',
    description: 'Tests for misinformation/disinformation handling, hate speech, bias across age/disability/gender/race dimensions, radicalization content, and unauthorized professional advice.',
    severity: 'high',
    plugins: ['harmful:misinformation-disinformation', 'harmful:hate', 'bias:age', 'bias:disability', 'bias:gender', 'bias:race', 'harmful:radicalization', 'harmful:specialized-advice'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-10', 'OBL-11', 'OBL-61'],
  },
  {
    id: 'LLM05',
    owaspId: 'owasp:llm:05',
    name: 'Improper Output Handling',
    description: 'Tests for command injection, SQL injection, SSRF, and debug interface exposure vulnerabilities in LLM output processing.',
    severity: 'high',
    plugins: ['shell-injection', 'sql-injection', 'ssrf', 'debug-access'],
    strategies: ['jailbreak', 'jailbreak-templates'],
    obligationIds: ['OBL-22', 'OBL-67'],
  },
  {
    id: 'LLM06',
    owaspId: 'owasp:llm:06',
    name: 'Excessive Agency',
    description: 'Tests for unauthorized actions beyond system boundaries, role-based access control failures, broken function/object-level authorization, and injection attacks enabling privilege escalation.',
    severity: 'critical',
    plugins: ['excessive-agency', 'rbac', 'bfla', 'bola', 'shell-injection', 'sql-injection', 'ssrf'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-14', 'OBL-15', 'OBL-64'],
  },
  {
    id: 'LLM07',
    owaspId: 'owasp:llm:07',
    name: 'System Prompt Leakage',
    description: 'Tests for system prompt disclosure, role-based access bypass, privacy violations, and PII exposure through various attack vectors targeting system configuration.',
    severity: 'medium',
    plugins: ['prompt-extraction', 'rbac', 'harmful:privacy', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-22', 'OBL-24'],
  },
  {
    id: 'LLM08',
    owaspId: 'owasp:llm:08',
    name: 'Vector and Embedding Weaknesses',
    description: 'Tests for cross-session data leakage, privacy violations, and PII exposure through vector database and embedding system vulnerabilities.',
    severity: 'medium',
    plugins: ['cross-session-leak', 'harmful:privacy', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-24', 'OBL-25'],
  },
  {
    id: 'LLM09',
    owaspId: 'owasp:llm:09',
    name: 'Misinformation',
    description: 'Tests for hallucination, overreliance on model assumptions, misinformation/disinformation campaigns, and unauthorized professional advice generation.',
    severity: 'medium',
    plugins: ['hallucination', 'overreliance', 'harmful:misinformation-disinformation', 'harmful:specialized-advice'],
    strategies: ['jailbreak', 'jailbreak-templates', 'jailbreak:composite'],
    obligationIds: ['OBL-13', 'OBL-62'],
  },
  {
    id: 'LLM10',
    owaspId: 'owasp:llm:10',
    name: 'Unbounded Consumption',
    description: 'Tests for training data leaks through repetitive pattern exploitation and computational resource exhaustion through excessive reasoning patterns.',
    severity: 'low',
    plugins: ['divergent-repetition', 'reasoning-dos'],
    strategies: [],
    obligationIds: ['OBL-67'],
  },
]);

/** Lookup a category by its short ID (e.g. 'LLM01'). */
export const getOwaspCategory = (id: string): OwaspLlmCategory | undefined =>
  OWASP_LLM_TOP_10.find((c) => c.id === id);

/** Lookup a category by its owaspId (e.g. 'owasp:llm:01'). */
export const getOwaspCategoryByOwaspId = (owaspId: string): OwaspLlmCategory | undefined =>
  OWASP_LLM_TOP_10.find((c) => c.owaspId === owaspId);

/** Map a Promptfoo plugin name to the OWASP category(ies) it belongs to. */
export const getOwaspCategoriesForPlugin = (pluginId: string): readonly OwaspLlmCategory[] =>
  OWASP_LLM_TOP_10.filter((c) => c.plugins.includes(pluginId));
