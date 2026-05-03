/**
 * Passport document generation sub-module.
 * Handles: FRIA, worker notification, policy, doc-by-type, all-docs, export.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AgentPassport } from '../types/passport.types.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import type { EvidenceSource } from '../domain/scanner/evidence.js';
import { generateFria } from '../domain/fria/fria-generator.js';
import type { FriaResult } from '../domain/fria/fria-generator.js';
import { exportPassport as exportPassportFn } from '../domain/passport/export/index.js';
import type { ExportFormat, ExportResult } from '../domain/passport/export/index.js';
import { generateWorkerNotification as generateWorkerNotificationDoc } from '../domain/documents/worker-notification-generator.js';
import type { WorkerNotificationResult } from '../domain/documents/worker-notification-generator.js';
import { generatePolicy as generatePolicyDoc } from '../domain/documents/policy-generator.js';
import type { PolicyResult } from '../domain/documents/policy-generator.js';
import { generateDocument, ALL_DOC_TYPES, TEMPLATE_FILE_MAP } from '../domain/documents/document-generator.js';
import type { DocType, DocResult } from '../domain/documents/document-generator.js';
import type { IndustryId } from '../data/industry-patterns.js';
import { INDUSTRY_TEMPLATE_MAP } from '../data/industry-patterns.js';
import type { PassportServiceDeps } from './passport-service.js';
import { ensureTemplate, saveDocumentReport, updatePassportCompliance } from './passport-service-utils.js';
import { generateComplianceTests } from '../domain/passport/test-generator.js';
import type { GeneratedTestSuite } from '../domain/passport/test-generator.js';

export interface PassportDocumentOps {
  readonly showPassport: (name: string, projectPath?: string) => Promise<AgentPassport | null>;
}

export const createPassportDocuments = (deps: PassportServiceDeps, ops: PassportDocumentOps) => {
  const { showPassport } = ops;

  const generateFriaReport = async (
    name: string,
    projectPath?: string,
    options?: { organization?: string; assessor?: string; impact?: string; mitigation?: string; approval?: string },
  ): Promise<(FriaResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const template = await ensureTemplate(deps, 'fria.md');
    const result = generateFria({
      manifest,
      template,
      organization: options?.organization,
      assessor: options?.assessor,
      impact: options?.impact,
      mitigation: options?.mitigation,
      approval: options?.approval,
    });

    const savedPath = await saveDocumentReport(deps, name, 'fria', result.markdown, 'fria', projectPath);

    const path = projectPath ?? deps.getProjectPath();
    const jsonPath = join(path, '.complior', 'reports', `fria-${name}.json`);
    await writeFile(jsonPath, JSON.stringify(result.structured, null, 2));

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(deps, name, { fria_completed: true, fria_date: today }, projectPath);

    if (deps.auditStore) {
      await deps.auditStore.append('fria.generated', { name, savedPath }, name);
    }

    // Record FRIA evidence in the evidence chain (source='fria' for test compatibility)
    if (deps.evidenceStore) {
      const evidence = createEvidence(name, 'document', 'fria' as EvidenceSource, { file: savedPath });
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    return { ...result, savedPath };
  };

  const generateWorkerNotification = async (
    name: string,
    projectPath?: string,
    options?: {
      companyName?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      deploymentDate?: string;
      affectedRoles?: string;
      impactDescription?: string;
    },
  ): Promise<(WorkerNotificationResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const template = await ensureTemplate(deps, 'worker-notification.md');
    const result = generateWorkerNotificationDoc({
      manifest,
      template,
      companyName: options?.companyName,
      contactName: options?.contactName,
      contactEmail: options?.contactEmail,
      contactPhone: options?.contactPhone,
      deploymentDate: options?.deploymentDate,
      affectedRoles: options?.affectedRoles,
      impactDescription: options?.impactDescription,
    });

    const savedPath = await saveDocumentReport(
      deps, name, 'worker-notification', result.markdown, 'worker-notification', projectPath,
    );

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(
      deps, name,
      { worker_notification_sent: true, worker_notification_date: today },
      projectPath,
    );

    if (deps.auditStore) {
      await deps.auditStore.append('worker_notification.generated', { name, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  const exportPassportToFormat = async (
    name: string,
    format: ExportFormat,
    projectPath?: string,
  ): Promise<(ExportResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const result = exportPassportFn(manifest, format);

    const path = projectPath ?? deps.getProjectPath();
    const exportsDir = join(path, '.complior', 'exports');
    await mkdir(exportsDir, { recursive: true });
    const savedPath = join(exportsDir, `${name}-${format}.json`);
    await writeFile(savedPath, JSON.stringify(result.data, null, 2));

    if (deps.evidenceStore) {
      const evidence = createEvidence(name, 'export', 'export', { file: savedPath, snippet: `format: ${format}` });
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    if (deps.auditStore) {
      await deps.auditStore.append('passport.exported', { name, format, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  const generatePolicy = async (
    name: string,
    industry: IndustryId,
    projectPath?: string,
    options?: { organization?: string; approver?: string },
  ): Promise<(PolicyResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    if (!deps.loadPolicyTemplate) {
      throw new Error('loadPolicyTemplate dependency not provided');
    }
    const templateFile = INDUSTRY_TEMPLATE_MAP[industry];
    const template = await deps.loadPolicyTemplate(templateFile);

    const result = generatePolicyDoc({
      manifest,
      template,
      industry,
      organization: options?.organization,
      approver: options?.approver,
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const savedPath = await saveDocumentReport(
      deps, timestamp, `${industry}-ai-policy`, result.markdown, 'policy',
      projectPath, 'policies', { industry },
    );

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(deps, name, { policy_generated: true, policy_date: today }, projectPath);

    if (deps.auditStore) {
      await deps.auditStore.append('policy.generated', { name, industry, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  const generateDocByType = async (
    name: string,
    docType: DocType,
    projectPath?: string,
    options?: { organization?: string },
  ): Promise<(DocResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const templateFile = TEMPLATE_FILE_MAP[docType];
    const template = await ensureTemplate(deps, templateFile);

    const result = generateDocument({
      manifest,
      template,
      docType,
      organization: options?.organization,
    });

    const savedPath = await saveDocumentReport(
      deps, name, docType, result.markdown, 'document', projectPath,
      'documents', { docType },
    );

    if (deps.auditStore) {
      await deps.auditStore.append('document.generated', { name, docType, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  const generateAllDocs = async (
    name: string,
    projectPath?: string,
    options?: { organization?: string },
  ): Promise<{ generated: { docType: string; savedPath: string }[]; errors: string[] }> => {
    const generated: { docType: string; savedPath: string }[] = [];
    const errors: string[] = [];

    for (const docType of ALL_DOC_TYPES) {
      try {
        const result = await generateDocByType(name, docType, projectPath, options);
        if (result) {
          generated.push({ docType, savedPath: result.savedPath });
        } else {
          errors.push(`${docType}: passport not found`);
        }
      } catch (e) {
        errors.push(`${docType}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    try {
      const fria = await generateFriaReport(name, projectPath, { organization: options?.organization });
      if (fria) generated.push({ docType: 'fria', savedPath: fria.savedPath });
    } catch (e) {
      errors.push(`fria: ${e instanceof Error ? e.message : String(e)}`);
    }

    try {
      const wn = await generateWorkerNotification(name, projectPath, { companyName: options?.organization });
      if (wn) generated.push({ docType: 'worker-notification', savedPath: wn.savedPath });
    } catch (e) {
      errors.push(`worker-notification: ${e instanceof Error ? e.message : String(e)}`);
    }

    return { generated, errors };
  };

  /** US-S05-24: Generate compliance test suite from passport constraints */
  const generateTestGenReport = async (
    name: string,
    projectPath?: string,
  ): Promise<GeneratedTestSuite | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const result = generateComplianceTests({
      name: manifest.name,
      permissions: {
        tools: manifest.permissions.tools,
        denied: manifest.permissions.denied,
      },
      constraints: {
        rate_limits: manifest.constraints.rate_limits
          ? [{ action: 'rate_limit', limit: manifest.constraints.rate_limits.max_actions_per_minute, window: 'minute' }]
          : undefined,
        prohibited_actions: manifest.constraints.prohibited_actions,
        budget: manifest.constraints.budget ? {
          max_cost: manifest.constraints.budget.max_cost_per_session_usd,
          currency: 'USD',
        } : undefined,
      },
    });

    return result;
  };

  return Object.freeze({
    generateFriaReport,
    generateWorkerNotification,
    exportPassportToFormat,
    generatePolicy,
    generateDocByType,
    generateAllDocs,
    generateTestGenReport,
  });
};
