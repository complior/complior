/**
 * MITRE ATLAS Tactics — extracted from Promptfoo (MIT License).
 * Data source: promptfoo/src/redteam/constants/frameworks.ts
 *
 * Zero runtime dependency on Promptfoo. Static data only.
 */

import type { Severity } from '../../types/common.types.js';

export interface MitreAtlasTactic {
  readonly id: string;
  readonly mitreId: string;
  readonly name: string;
  readonly tactic: string;
  readonly description: string;
  readonly severity: Severity;
  readonly plugins: readonly string[];
  readonly obligationIds: readonly string[];
}

/**
 * MITRE ATLAS tactics with Promptfoo plugin mappings and EU AI Act obligation cross-references.
 */
export const MITRE_ATLAS_TACTICS: readonly MitreAtlasTactic[] = Object.freeze([
  {
    id: 'AML.TA0001',
    mitreId: 'mitre:atlas:reconnaissance',
    name: 'Reconnaissance',
    tactic: 'reconnaissance',
    description: 'Tests for enumeration of competitors, policy extraction, system prompt disclosure, and role-based access control bypass to gather intelligence about the target system.',
    severity: 'medium',
    plugins: ['competitors', 'policy', 'prompt-extraction', 'rbac'],
    obligationIds: ['OBL-22'],
  },
  {
    id: 'AML.TA0002',
    mitreId: 'mitre:atlas:resource-development',
    name: 'Resource Development',
    tactic: 'resource-development',
    description: 'Tests for cybercrime content, illegal drug information, and weapons-related content that could be used for attack resource development.',
    severity: 'high',
    plugins: ['harmful:cybercrime', 'harmful:illegal-drugs', 'harmful:indiscriminate-weapons'],
    obligationIds: ['OBL-1', 'OBL-2', 'OBL-3'],
  },
  {
    id: 'AML.TA0003',
    mitreId: 'mitre:atlas:initial-access',
    name: 'Initial Access',
    tactic: 'initial-access',
    description: 'Tests for debug interface exposure, cybercrime exploitation, command injection, SQL injection, and SSRF vulnerabilities as initial access vectors.',
    severity: 'critical',
    plugins: ['debug-access', 'harmful:cybercrime', 'shell-injection', 'sql-injection', 'ssrf'],
    obligationIds: ['OBL-22', 'OBL-67'],
  },
  {
    id: 'AML.TA0004',
    mitreId: 'mitre:atlas:ml-attack-staging',
    name: 'ML Attack Staging',
    tactic: 'ml-attack-staging',
    description: 'Tests for ASCII smuggling, excessive agency exploitation, hallucination induction, and indirect prompt injection for staging ML-specific attacks.',
    severity: 'high',
    plugins: ['ascii-smuggling', 'excessive-agency', 'hallucination', 'indirect-prompt-injection'],
    obligationIds: ['OBL-22', 'OBL-23'],
  },
  {
    id: 'AML.TA0005',
    mitreId: 'mitre:atlas:exfiltration',
    name: 'Exfiltration',
    tactic: 'exfiltration',
    description: 'Tests for data exfiltration via ASCII smuggling, privacy violations, indirect prompt injection, PII exposure through multiple vectors, and system prompt extraction.',
    severity: 'critical',
    plugins: ['ascii-smuggling', 'harmful:privacy', 'indirect-prompt-injection', 'pii:api-db', 'pii:direct', 'pii:session', 'pii:social', 'prompt-extraction'],
    obligationIds: ['OBL-24', 'OBL-25', 'OBL-69'],
  },
  {
    id: 'AML.TA0006',
    mitreId: 'mitre:atlas:impact',
    name: 'Impact',
    tactic: 'impact',
    description: 'Tests for excessive agency exploitation, malicious content generation, resource hijacking, and entity impersonation to measure potential impact of successful attacks.',
    severity: 'high',
    plugins: ['excessive-agency', 'harmful', 'hijacking', 'imitation'],
    obligationIds: ['OBL-14', 'OBL-15'],
  },
]);

/** Lookup a tactic by short ID (e.g. 'AML.TA0001'). */
export const getMitreAtlasTactic = (id: string): MitreAtlasTactic | undefined =>
  MITRE_ATLAS_TACTICS.find((t) => t.id === id);

/** Lookup by mitreId (e.g. 'mitre:atlas:reconnaissance'). */
export const getMitreAtlasByMitreId = (mitreId: string): MitreAtlasTactic | undefined =>
  MITRE_ATLAS_TACTICS.find((t) => t.mitreId === mitreId);
