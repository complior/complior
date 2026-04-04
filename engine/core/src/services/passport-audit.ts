/**
 * Passport audit & analysis sub-module.
 * Handles: registry, evidence, permissions, readiness, audit trail, test gen, diff, import, audit pkg.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../types/errors.js';
import type { AgentPassport } from '../types/passport.types.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import { computeCompleteness } from '../domain/passport/passport-validator.js';
import { loadOrCreateKeyPair, signPassport } from '../domain/passport/crypto-signer.js';
import { computeAgentScore } from '../domain/registry/compute-agent-score.js';
import type { AgentRegistryEntry } from '../domain/registry/compute-agent-score.js';
import type { EvidenceChainSummary } from '../domain/scanner/evidence-store.js';
import { computeReadiness } from '../domain/certification/aiuc1-readiness.js';
import type { ReadinessResult } from '../domain/certification/aiuc1-readiness.js';
import { buildPermissionsMatrix } from '../domain/audit/permissions-matrix.js';
import type { PermissionsMatrix } from '../domain/audit/permissions-matrix.js';
import { createAuditPackage } from '../domain/audit/audit-package.js';
import type { AuditPackageResult } from '../domain/audit/audit-package.js';
import type { AuditFilter, AuditEntry, AuditTrailSummary } from '../domain/audit/audit-trail.js';
import { generateComplianceTests } from '../domain/passport/test-generator.js';
import type { GeneratedTestSuite } from '../domain/passport/test-generator.js';
import { computeManifestDiff } from '../domain/passport/builder/manifest-diff.js';
import type { ManifestDiffResult } from '../domain/passport/builder/manifest-diff.js';
import type { PassportServiceDeps } from './passport-service.js';

export interface PassportAuditOps {
  readonly showPassport: (name: string, projectPath?: string) => Promise<AgentPassport | null>;
  readonly listPassports: (projectPath?: string) => Promise<readonly AgentPassport[]>;
}

export const createPassportAudit = (deps: PassportServiceDeps, ops: PassportAuditOps) => {
  const { showPassport, listPassports } = ops;
  const { getProjectPath, getLastScanResult, events } = deps;

  const getEvidenceChainSummary = async (
    _projectPath?: string,
  ): Promise<EvidenceChainSummary> => {
    if (!deps.evidenceStore) {
      return { totalEntries: 0, scanCount: 0, firstEntry: '', lastEntry: '', chainValid: true, uniqueFindings: 0 };
    }
    return deps.evidenceStore.getSummary();
  };

  const verifyEvidenceChain = async (
    _projectPath?: string,
  ): Promise<{ valid: boolean; brokenAt?: number }> => {
    if (!deps.evidenceStore) return { valid: true };
    return deps.evidenceStore.verify();
  };

  const getAgentRegistry = async (projectPath?: string): Promise<readonly AgentRegistryEntry[]> => {
    const path = projectPath ?? getProjectPath();
    const passports = await listPassports(path);
    if (passports.length === 0) return [];

    const scanResult = getLastScanResult();
    const evidenceSummary = await getEvidenceChainSummary();

    const entries: AgentRegistryEntry[] = [];
    for (const passport of passports) {
      const completeness = computeCompleteness(passport);
      entries.push(computeAgentScore({ passport, completeness, scanResult, evidenceSummary }));
    }
    return entries;
  };

  const getPermissionsMatrix = async (projectPath?: string): Promise<PermissionsMatrix> => {
    const passports = await listPassports(projectPath);
    return buildPermissionsMatrix(passports);
  };

  const getReadiness = async (
    name: string,
    projectPath?: string,
  ): Promise<ReadinessResult | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const scanResult = getLastScanResult();
    const evidenceSummary = await getEvidenceChainSummary(projectPath);

    const documents = new Set<string>();
    const compliance = manifest.compliance;
    if (compliance?.fria_completed) documents.add('fria');
    if (compliance && 'policy_generated' in compliance && compliance.policy_generated) documents.add('policy');
    if (compliance?.worker_notification_sent) documents.add('worker-notification');

    const result = computeReadiness({ passport: manifest, scanResult, documents, evidenceSummary });

    if (deps.auditStore) {
      await deps.auditStore.append('readiness.computed', {
        name, overallScore: result.overallScore, readinessLevel: result.readinessLevel,
      }, name);
    }

    return result;
  };

  const getAuditTrail = async (filter: AuditFilter): Promise<readonly AuditEntry[]> => {
    if (!deps.auditStore) return [];
    return deps.auditStore.query(filter);
  };

  const getAuditSummary = async (): Promise<AuditTrailSummary> => {
    if (!deps.auditStore) return { totalEntries: 0, eventCounts: {}, agentNames: [], firstEntry: '', lastEntry: '' };
    return deps.auditStore.getSummary();
  };

  const generateTestSuite = async (
    name: string,
    projectPath?: string,
  ): Promise<GeneratedTestSuite> => {
    const pp = projectPath ?? getProjectPath();
    const passport = await showPassport(name, pp);
    if (!passport) throw new Error(`Passport not found: ${name}`);

    const suite = generateComplianceTests({
      name: passport.name,
      permissions: passport.permissions ? {
        tools: passport.permissions.tools as readonly string[],
        denied: passport.permissions.denied as readonly string[],
      } : undefined,
      constraints: passport.constraints ? {
        rate_limits: passport.constraints.rate_limits
          ? [{ action: 'actions_per_minute', limit: passport.constraints.rate_limits.max_actions_per_minute, window: '1m' }]
          : undefined,
        prohibited_actions: passport.constraints.prohibited_actions as readonly string[],
        escalation_rules: passport.constraints.escalation_rules?.map(r => ({
          condition: r.condition,
          escalate_to: r.description,
        })),
        budget: passport.constraints.budget
          ? { max_cost: passport.constraints.budget.max_cost_per_session_usd, currency: 'USD' }
          : undefined,
      } : undefined,
    });

    const testDir = join(pp, '.complior', 'tests');
    await mkdir(testDir, { recursive: true });
    const testPath = join(testDir, suite.filename);
    await writeFile(testPath, suite.content);

    if (deps.auditStore) {
      await deps.auditStore.append('test_suite.generated', { name, path: testPath, testCount: suite.testCount }, name);
    }

    return Object.freeze({ ...suite, filename: testPath });
  };

  const diffPassport = async (
    name: string,
    projectPath?: string,
  ): Promise<ManifestDiffResult> => {
    const pp = projectPath ?? getProjectPath();
    const current = await showPassport(name, pp);
    if (!current) throw new Error(`Passport not found: ${name}`);

    let previous: Record<string, unknown> = {};
    try {
      const historyPath = join(pp, '.complior', 'agents', `${name}-history.json`);
      const raw = await readFile(historyPath, 'utf-8');
      const parsed = z.array(z.record(z.unknown())).safeParse(JSON.parse(raw));
      if (parsed.success && parsed.data.length > 0) {
        previous = parsed.data[parsed.data.length - 1]!;
      }
    } catch {
      // No history — diff against empty
    }

    return computeManifestDiff(name, previous, current as unknown as Record<string, unknown>);
  };

  const importPassport = async (
    format: string,
    data: unknown,
    projectPath?: string,
  ): Promise<{ passport: AgentPassport; fieldsImported: string[]; fieldsMissing: string[] }> => {
    const path = projectPath ?? getProjectPath();

    if (format !== 'a2a') {
      throw new AppError(`Unsupported import format: ${format}. Supported: a2a`, 'VALIDATION_ERROR', 400);
    }

    const { importFromA2A } = await import('../domain/passport/import/a2a-importer.js');
    const result = importFromA2A(data);
    const passport = result.passport as AgentPassport;

    const agentsDir = join(path, '.complior', 'agents');
    await mkdir(agentsDir, { recursive: true });

    const keyPair = await loadOrCreateKeyPair();
    const signature = signPassport(passport, keyPair.privateKey);
    const signedPassport: AgentPassport = { ...passport, signature };

    const filePath = join(agentsDir, `${signedPassport.name}-manifest.json`);
    await writeFile(filePath, JSON.stringify(signedPassport, null, 2));

    if (deps.evidenceStore) {
      const evidence = createEvidence(signedPassport.name, 'passport', 'passport-import', { file: filePath, snippet: `format: ${format}` });
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    if (deps.auditStore) {
      await deps.auditStore.append('passport.imported', {
        name: signedPassport.name, format, fieldsImported: result.fieldsImported.length,
      }, signedPassport.name);
    }

    events.emit('passport.imported', {
      name: signedPassport.name, format, fieldsImported: result.fieldsImported.length,
    });

    return {
      passport: signedPassport,
      fieldsImported: [...result.fieldsImported],
      fieldsMissing: [...result.fieldsMissing],
    };
  };

  const generateAuditPackage = async (
    projectPath?: string,
  ): Promise<AuditPackageResult> => {
    const path = projectPath ?? getProjectPath();
    return createAuditPackage({ getProjectPath: () => path });
  };

  return Object.freeze({
    getAgentRegistry,
    getEvidenceChainSummary,
    verifyEvidenceChain,
    getPermissionsMatrix,
    getReadiness,
    getAuditTrail,
    getAuditSummary,
    generateTestSuite,
    diffPassport,
    importPassport,
    generateAuditPackage,
  });
};
