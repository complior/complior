/**
 * NIST AI RMF (Risk Management Framework) — extracted from Promptfoo (MIT License).
 * Data source: promptfoo/src/redteam/constants/frameworks.ts
 *
 * 21 subcategories under the MEASURE function.
 * Zero runtime dependency on Promptfoo.
 */

import type { Severity } from '../../types/common.types.js';

export interface NistAiRmfSubcategory {
  readonly id: string;
  readonly nistId: string;
  readonly name: string;
  readonly description: string;
  readonly severity: Severity;
  readonly plugins: readonly string[];
  readonly strategies: readonly string[];
}

export const NIST_AI_RMF_SUBCATEGORIES: readonly NistAiRmfSubcategory[] = Object.freeze([
  { id: 'MEASURE-1.1', nistId: 'nist:ai:measure:1.1', name: 'Appropriate methods & metrics', description: 'Tests excessive agency and misinformation handling.', severity: 'medium', plugins: ['excessive-agency', 'harmful:misinformation-disinformation'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'MEASURE-1.2', nistId: 'nist:ai:measure:1.2', name: 'Computational evaluation of AI system', description: 'Tests excessive agency and misinformation handling.', severity: 'medium', plugins: ['excessive-agency', 'harmful:misinformation-disinformation'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'MEASURE-2.1', nistId: 'nist:ai:measure:2.1', name: 'Privacy risk', description: 'Tests for PII exposure and privacy violations.', severity: 'high', plugins: ['harmful:privacy', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social'], strategies: [] },
  { id: 'MEASURE-2.2', nistId: 'nist:ai:measure:2.2', name: 'Privacy values', description: 'Tests for PII exposure and privacy violations.', severity: 'high', plugins: ['harmful:privacy', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social'], strategies: [] },
  { id: 'MEASURE-2.3', nistId: 'nist:ai:measure:2.3', name: 'AI system performance', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-2.4', nistId: 'nist:ai:measure:2.4', name: 'Bias, equity, and fairness', description: 'Tests excessive agency and misinformation handling.', severity: 'medium', plugins: ['excessive-agency', 'harmful:misinformation-disinformation'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'MEASURE-2.5', nistId: 'nist:ai:measure:2.5', name: 'AI system trustworthiness', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-2.6', nistId: 'nist:ai:measure:2.6', name: 'Safety measurement', description: 'Tests for WMD content, weapons, and unsafe practices.', severity: 'high', plugins: ['harmful:chemical-biological-weapons', 'harmful:indiscriminate-weapons', 'harmful:unsafe-practices'], strategies: [] },
  { id: 'MEASURE-2.7', nistId: 'nist:ai:measure:2.7', name: 'Cybersecurity', description: 'Tests for cybercrime, command injection, and SQL injection.', severity: 'high', plugins: ['harmful:cybercrime', 'shell-injection', 'sql-injection'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'MEASURE-2.8', nistId: 'nist:ai:measure:2.8', name: 'Access control', description: 'Tests BFLA, BOLA, and RBAC implementations.', severity: 'high', plugins: ['bfla', 'bola', 'rbac'], strategies: [] },
  { id: 'MEASURE-2.9', nistId: 'nist:ai:measure:2.9', name: 'Human oversight', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-2.10', nistId: 'nist:ai:measure:2.10', name: 'Privacy measurement', description: 'Tests for PII exposure and privacy violations.', severity: 'high', plugins: ['harmful:privacy', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social'], strategies: [] },
  { id: 'MEASURE-2.11', nistId: 'nist:ai:measure:2.11', name: 'Fairness in AI', description: 'Tests for harassment, hate speech, and insults.', severity: 'medium', plugins: ['harmful:harassment-bullying', 'harmful:hate', 'harmful:insults'], strategies: [] },
  { id: 'MEASURE-2.12', nistId: 'nist:ai:measure:2.12', name: 'Environmental impact', description: 'Environmental impact measurement (no automated tests).', severity: 'low', plugins: [], strategies: [] },
  { id: 'MEASURE-2.13', nistId: 'nist:ai:measure:2.13', name: 'Explainability', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-3.1', nistId: 'nist:ai:measure:3.1', name: 'Risk monitoring', description: 'Tests excessive agency and misinformation handling.', severity: 'medium', plugins: ['excessive-agency', 'harmful:misinformation-disinformation'], strategies: ['jailbreak', 'jailbreak-templates'] },
  { id: 'MEASURE-3.2', nistId: 'nist:ai:measure:3.2', name: 'Stakeholder feedback', description: 'Tests for excessive agency.', severity: 'low', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-3.3', nistId: 'nist:ai:measure:3.3', name: 'Risk documentation', description: 'Tests for excessive agency.', severity: 'low', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-4.1', nistId: 'nist:ai:measure:4.1', name: 'Post-deployment monitoring', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
  { id: 'MEASURE-4.2', nistId: 'nist:ai:measure:4.2', name: 'Deployment assessment', description: 'Tests excessive agency and misinformation handling.', severity: 'medium', plugins: ['excessive-agency', 'harmful:misinformation-disinformation'], strategies: [] },
  { id: 'MEASURE-4.3', nistId: 'nist:ai:measure:4.3', name: 'Impact assessment', description: 'Tests for excessive agency.', severity: 'medium', plugins: ['excessive-agency'], strategies: [] },
]);
