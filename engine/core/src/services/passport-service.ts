import { writeFile, readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { ScanResult } from '../types/common.types.js';
import type { AgentPassport } from '../types/passport.types.js';
import { parsePassport } from '../types/passport.types.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import { parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod } from '../domain/scanner/layers/layer3-parsers.js';
import type { ParsedDependency } from '../domain/scanner/layers/layer3-parsers.js';
import { runLayer3 } from '../domain/scanner/layers/layer3-config.js';
import { runLayer4 } from '../domain/scanner/layers/layer4-patterns.js';
import { discoverAgents } from '../domain/passport/agent-discovery.js';
import { analyzeAutonomy } from '../domain/passport/autonomy-analyzer.js';
import type { AutonomyAnalysis } from '../domain/passport/autonomy-analyzer.js';
import { scanPermissions } from '../domain/passport/permission-scanner.js';
import { buildPassport } from '../domain/passport/manifest-builder.js';
import { loadOrCreateKeyPair, signPassport, verifyPassport as verifyPassportCrypto } from '../domain/passport/crypto-signer.js';
import { validatePassport, computeCompleteness } from '../domain/passport/passport-validator.js';
import type { ValidationResult, CompletenessResult } from '../domain/passport/passport-validator.js';
import { generateFria } from '../domain/fria/fria-generator.js';
import type { FriaResult } from '../domain/fria/fria-generator.js';
import { exportPassport as exportPassportFn } from '../domain/passport/export/index.js';
import type { ExportFormat, ExportResult } from '../domain/passport/export/index.js';
import { computeAgentScore } from '../domain/registry/compute-agent-score.js';
import type { AgentRegistryEntry } from '../domain/registry/compute-agent-score.js';
import { generateWorkerNotification as generateWorkerNotificationDoc } from '../domain/documents/worker-notification-generator.js';
import type { WorkerNotificationResult } from '../domain/documents/worker-notification-generator.js';
import { generatePolicy as generatePolicyDoc } from '../domain/documents/policy-generator.js';
import type { PolicyResult } from '../domain/documents/policy-generator.js';
import type { IndustryId } from '../data/industry-patterns.js';
import { INDUSTRY_TEMPLATE_MAP } from '../data/industry-patterns.js';
import type { EvidenceStore, EvidenceChainSummary } from '../domain/scanner/evidence-store.js';
import { computeReadiness } from '../domain/certification/aiuc1-readiness.js';
import type { ReadinessResult } from '../domain/certification/aiuc1-readiness.js';
import { buildPermissionsMatrix } from '../domain/audit/permissions-matrix.js';
import type { PermissionsMatrix } from '../domain/audit/permissions-matrix.js';
import type { AuditStore, AuditFilter, AuditEntry, AuditTrailSummary } from '../domain/audit/audit-trail.js';

// --- Types ---

export interface PassportServiceDeps {
  readonly collectFiles: (path: string) => Promise<ScanContext>;
  readonly scanner: Scanner;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly loadTemplate?: (file: string) => Promise<string>;
  readonly loadPolicyTemplate?: (file: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
}

export interface InitPassportResult {
  readonly manifests: readonly AgentPassport[];
  readonly savedPaths: readonly string[];
  readonly skipped: readonly string[];
}

// --- Helpers ---

const parseDepsFromContext = (ctx: ScanContext): readonly ParsedDependency[] => {
  const allDeps: ParsedDependency[] = [];

  for (const file of ctx.files) {
    const filename = file.relativePath.split('/').pop() ?? '';
    if (filename === 'package.json') {
      allDeps.push(...parsePackageJson(file.content));
    } else if (filename === 'requirements.txt') {
      allDeps.push(...parseRequirementsTxt(file.content));
    } else if (filename === 'Cargo.toml') {
      allDeps.push(...parseCargoToml(file.content));
    } else if (filename === 'go.mod') {
      allDeps.push(...parseGoMod(file.content));
    }
  }

  return allDeps;
};

// --- Service factory ---

export const createPassportService = (deps: PassportServiceDeps) => {
  const { collectFiles, events, getProjectPath, getLastScanResult } = deps;

  const initPassport = async (
    projectPath?: string,
    overrides?: Record<string, unknown>,
    force?: boolean,
  ): Promise<InitPassportResult> => {
    const path = projectPath ?? getProjectPath();

    // 1. Collect files
    const ctx = await collectFiles(path);

    // 2. Parse dependencies
    const parsedDeps = parseDepsFromContext(ctx);

    // 3. Discover agents
    const agents = discoverAgents(ctx, parsedDeps);

    if (agents.length === 0) {
      return { manifests: [], savedPaths: [], skipped: [] };
    }

    // 4. Run L3 + L4 for autonomy analysis
    const l3Results = runLayer3(ctx);
    const l4Results = runLayer4(ctx, l3Results);

    // 5. Get scan result for compliance score
    const scanResult = getLastScanResult();

    // 6. Generate manifests for each agent
    const manifests: AgentPassport[] = [];
    const savedPaths: string[] = [];
    const skipped: string[] = [];

    for (const agent of agents) {
      // Analyze autonomy
      const autonomy = analyzeAutonomy(l4Results);

      // Scan permissions
      const permissions = scanPermissions(ctx);

      // Build manifest
      const unsignedManifest = buildPassport({
        agent,
        autonomy,
        permissions,
        scanResult: scanResult ?? undefined,
        overrides,
      });

      // Sign manifest
      const keyPair = await loadOrCreateKeyPair();
      const signature = signPassport(unsignedManifest, keyPair.privateKey);

      const signedManifest: AgentPassport = {
        ...unsignedManifest,
        signature,
      };

      // Save to .complior/agents/ (dirname handles scoped names like @scope/name)
      const agentsDir = join(path, '.complior', 'agents');
      const fileName = `${agent.name}-manifest.json`;
      const filePath = join(agentsDir, fileName);
      await mkdir(dirname(filePath), { recursive: true });

      // Skip existing passports unless --force
      if (!force) {
        try {
          await stat(filePath);
          skipped.push(agent.name);
          continue;
        } catch {
          // File doesn't exist — proceed with creation
        }
      }

      await writeFile(filePath, JSON.stringify(signedManifest, null, 2));

      manifests.push(signedManifest);
      savedPaths.push(filePath);

      // US-S05-14: Record passport creation in audit trail
      if (deps.auditStore) {
        await deps.auditStore.append('passport.created', { name: agent.name, path: filePath }, agent.name);
      }

      // C.R20: Record passport creation in evidence chain
      if (deps.evidenceStore) {
        const evidence = createEvidence(
          agent.name,
          'passport',
          'passport',
          { file: filePath },
        );
        await deps.evidenceStore.append([evidence], randomUUID());
      }

      // US-S05-26: Emit agent-scoped events
      if (scanResult) {
        events.emit('agent.scan.completed', { agentName: agent.name, result: scanResult });
        const score = scanResult.score?.totalScore ?? 0;
        events.emit('agent.score.updated', { agentName: agent.name, before: 0, after: score });
      }
    }

    // Emit event
    events.emit('scan.started', { projectPath: path });

    return { manifests, savedPaths, skipped };
  };

  const listPassports = async (
    projectPath?: string,
  ): Promise<readonly AgentPassport[]> => {
    const path = projectPath ?? getProjectPath();
    const agentsDir = join(path, '.complior', 'agents');

    try {
      const files = await readdir(agentsDir);
      const manifests: AgentPassport[] = [];

      for (const file of files) {
        if (!file.endsWith('-manifest.json')) continue;
        const content = await readFile(join(agentsDir, file), 'utf-8');
        const passport = parsePassport(content);
        if (passport) manifests.push(passport);
      }

      return manifests;
    } catch {
      return [];
    }
  };

  const showPassport = async (
    name: string,
    projectPath?: string,
  ): Promise<AgentPassport | null> => {
    const path = projectPath ?? getProjectPath();
    const filePath = join(path, '.complior', 'agents', `${name}-manifest.json`);

    try {
      const content = await readFile(filePath, 'utf-8');
      return parsePassport(content);
    } catch {
      return null;
    }
  };

  const verifyPassport = async (
    name: string,
    projectPath?: string,
  ): Promise<boolean> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return false;
    return verifyPassportCrypto(manifest);
  };

  // C.S02: Standalone autonomy analysis (without full passport generation)
  const analyzeProjectAutonomy = async (
    projectPath?: string,
  ): Promise<AutonomyAnalysis> => {
    const path = projectPath ?? getProjectPath();
    const ctx = await collectFiles(path);
    const l3Results = runLayer3(ctx);
    const l4Results = runLayer4(ctx, l3Results);
    return analyzeAutonomy(l4Results);
  };

  // C.S07: Full validation of existing passport
  const validatePassportByName = async (
    name: string,
    projectPath?: string,
  ): Promise<ValidationResult | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;
    return validatePassport(manifest);
  };

  // C.S09: Completeness score for existing passport
  const getPassportCompleteness = async (
    name: string,
    projectPath?: string,
  ): Promise<CompletenessResult | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;
    return computeCompleteness(manifest);
  };

  // --- Shared document generation helpers ---

  const ensureTemplate = async (file: string): Promise<string> => {
    if (!deps.loadTemplate) {
      throw new Error('loadTemplate dependency not provided');
    }
    return deps.loadTemplate(file);
  };

  const saveDocumentReport = async (
    name: string,
    filePrefix: string,
    markdown: string,
    evidenceType: string,
    projectPath?: string,
    subDir: string = 'reports',
    evidenceMeta?: Record<string, unknown>,
  ): Promise<string> => {
    const path = projectPath ?? getProjectPath();
    const outDir = join(path, '.complior', subDir);
    await mkdir(outDir, { recursive: true });
    const savedPath = join(outDir, `${filePrefix}-${name}.md`);
    await writeFile(savedPath, markdown);

    if (deps.evidenceStore) {
      const evidence = createEvidence(name, evidenceType, evidenceType, { file: savedPath, ...evidenceMeta });
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    return savedPath;
  };

  const updatePassportCompliance = async (
    name: string,
    complianceUpdate: Partial<AgentPassport['compliance']>,
    projectPath?: string,
  ): Promise<void> => {
    const path = projectPath ?? getProjectPath();
    const manifestPath = join(path, '.complior', 'agents', `${name}-manifest.json`);
    try {
      const rawManifest = await readFile(manifestPath, 'utf-8');
      const currentManifest = JSON.parse(rawManifest) as AgentPassport;

      const updatedManifest: AgentPassport = {
        ...currentManifest,
        compliance: { ...currentManifest.compliance, ...complianceUpdate },
        updated: new Date().toISOString(),
      };

      const keyPair = await loadOrCreateKeyPair();
      const newSignature = signPassport(updatedManifest, keyPair.privateKey);
      const resignedManifest: AgentPassport = { ...updatedManifest, signature: newSignature };

      await writeFile(manifestPath, JSON.stringify(resignedManifest, null, 2));
    } catch {
      // Passport file doesn't exist or can't be updated — non-fatal
    }
  };

  // C.D01: FRIA generation from passport data
  const generateFriaReport = async (
    name: string,
    projectPath?: string,
    options?: { organization?: string; assessor?: string; impact?: string; mitigation?: string; approval?: string },
  ): Promise<(FriaResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const template = await ensureTemplate('fria.md');
    const result = generateFria({
      manifest,
      template,
      organization: options?.organization,
      assessor: options?.assessor,
      impact: options?.impact,
      mitigation: options?.mitigation,
      approval: options?.approval,
    });

    const savedPath = await saveDocumentReport(name, 'fria', result.markdown, 'fria', projectPath);

    // Save structured JSON alongside markdown
    const path = projectPath ?? getProjectPath();
    const jsonPath = join(path, '.complior', 'reports', `fria-${name}.json`);
    await writeFile(jsonPath, JSON.stringify(result.structured, null, 2));

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(name, { fria_completed: true, fria_date: today }, projectPath);

    // US-S05-14: Record FRIA generation in audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('fria.generated', { name, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  // C.D02: Worker Notification generation from passport data (Art.26(7))
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

    const template = await ensureTemplate('worker-notification.md');
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
      name, 'worker-notification', result.markdown, 'worker-notification', projectPath,
    );

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(
      name,
      { worker_notification_sent: true, worker_notification_date: today },
      projectPath,
    );

    // US-S05-14: Record worker notification in audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('worker_notification.generated', { name, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  // C.S08: Export passport to external format (A2A, AIUC-1, NIST)
  const exportPassportToFormat = async (
    name: string,
    format: ExportFormat,
    projectPath?: string,
  ): Promise<(ExportResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const result = exportPassportFn(manifest, format);

    // Save to .complior/exports/
    const path = projectPath ?? getProjectPath();
    const exportsDir = join(path, '.complior', 'exports');
    await mkdir(exportsDir, { recursive: true });
    const savedPath = join(exportsDir, `${name}-${format}.json`);
    await writeFile(savedPath, JSON.stringify(result.data, null, 2));

    // Record in evidence chain
    if (deps.evidenceStore) {
      const evidence = createEvidence(name, 'export', 'export', { file: savedPath, format });
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    // US-S05-14: Record export in audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('passport.exported', { name, format, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  // US-S05-13: Agent Registry — per-agent compliance dashboard
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

  // C.R20: Evidence chain summary
  const getEvidenceChainSummary = async (
    projectPath?: string,
  ): Promise<EvidenceChainSummary> => {
    if (!deps.evidenceStore) {
      return {
        totalEntries: 0,
        scanCount: 0,
        firstEntry: '',
        lastEntry: '',
        chainValid: true,
        uniqueFindings: 0,
      };
    }
    return deps.evidenceStore.getSummary();
  };

  // C.R20: Evidence chain verification
  const verifyEvidenceChain = async (
    projectPath?: string,
  ): Promise<{ valid: boolean; brokenAt?: number }> => {
    if (!deps.evidenceStore) {
      return { valid: true };
    }
    return deps.evidenceStore.verify();
  };

  // US-S05-14: Cross-agent permissions matrix
  const getPermissionsMatrix = async (projectPath?: string): Promise<PermissionsMatrix> => {
    const passports = await listPassports(projectPath);
    return buildPermissionsMatrix(passports);
  };

  // US-S05-15: Industry-specific AI usage policy generation
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
      timestamp, `${industry}-ai-policy`, result.markdown, 'policy',
      projectPath, 'policies', { industry },
    );

    const today = new Date().toISOString().slice(0, 10);
    await updatePassportCompliance(name, { policy_generated: true, policy_date: today }, projectPath);

    if (deps.auditStore) {
      await deps.auditStore.append('policy.generated', { name, industry, savedPath }, name);
    }

    return { ...result, savedPath };
  };

  // US-S05-19: AIUC-1 Readiness Score
  const getReadiness = async (
    name: string,
    projectPath?: string,
  ): Promise<ReadinessResult | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    const scanResult = getLastScanResult();
    const evidenceSummary = await getEvidenceChainSummary(projectPath);

    // Detect which documents have been generated by checking passport compliance fields
    const documents = new Set<string>();
    const compliance = manifest.compliance;
    if (compliance?.fria_completed) documents.add('fria');
    if (compliance && 'policy_generated' in compliance && compliance.policy_generated) documents.add('policy');
    if (compliance?.worker_notification_sent) documents.add('worker-notification');

    const result = computeReadiness({ passport: manifest, scanResult, documents, evidenceSummary });

    if (deps.auditStore) {
      await deps.auditStore.append('readiness.computed', {
        name,
        overallScore: result.overallScore,
        readinessLevel: result.readinessLevel,
      }, name);
    }

    return result;
  };

  // US-S05-14: Audit trail query
  const getAuditTrail = async (filter: AuditFilter): Promise<readonly AuditEntry[]> => {
    if (!deps.auditStore) return [];
    return deps.auditStore.query(filter);
  };

  // US-S05-14: Audit trail summary
  const getAuditSummary = async (): Promise<AuditTrailSummary> => {
    if (!deps.auditStore) return { totalEntries: 0, eventCounts: {}, agentNames: [], firstEntry: '', lastEntry: '' };
    return deps.auditStore.getSummary();
  };

  // US-S05-26: Find agents whose source_files match a given file path
  const findAgentsForFile = async (changedPath: string): Promise<readonly { name: string; sourceFiles: readonly string[] }[]> => {
    const { relative } = await import('node:path');
    const projectPath = deps.getProjectPath();
    const agentsDir = join(projectPath, '.complior', 'agents');
    const relChanged = relative(projectPath, changedPath);
    const matched: { name: string; sourceFiles: readonly string[] }[] = [];

    let files: string[];
    try {
      files = await readdir(agentsDir);
    } catch {
      return [];
    }

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(agentsDir, file), 'utf-8');
        const passport = parsePassport(raw);
        if (!passport) continue;
        const sourceFiles = passport.source_files ?? [];
        if (sourceFiles.some((sf) => relChanged === sf || relChanged.startsWith(sf + '/'))) {
          matched.push({ name: passport.name, sourceFiles });
        }
      } catch { /* skip malformed passport */ }
    }

    return matched;
  };

  return Object.freeze({
    initPassport,
    listPassports,
    showPassport,
    verifyPassport,
    analyzeProjectAutonomy,
    validatePassportByName,
    getPassportCompleteness,
    generateFriaReport,
    generateWorkerNotification,
    exportPassportToFormat,
    getAgentRegistry,
    getEvidenceChainSummary,
    verifyEvidenceChain,
    generatePolicy,
    getPermissionsMatrix,
    getReadiness,
    getAuditTrail,
    getAuditSummary,
    findAgentsForFile,
  });
};

export type PassportService = ReturnType<typeof createPassportService>;
