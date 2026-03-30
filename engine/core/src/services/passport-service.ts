/**
 * Passport Service — facade over CRUD, document generation, and audit sub-modules.
 * CRUD operations live here; documents and audit are delegated to sub-modules.
 */
import { writeFile, readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { ScanResult } from '../types/common.types.js';
import type { AgentPassport } from '../types/passport.types.js';
import { parsePassport } from '../types/passport-schemas.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import { parseDepsFromContext } from '../domain/shared/parse-dependencies.js';
import { runLayer3 } from '../domain/scanner/layers/layer3-config.js';
import { runLayer4 } from '../domain/scanner/layers/layer4-patterns.js';
import { discoverAgents } from '../domain/passport/discovery/agent-discovery.js';
import { analyzeAutonomy } from '../domain/passport/discovery/autonomy-analyzer.js';
import type { AutonomyAnalysis } from '../domain/passport/discovery/autonomy-analyzer.js';
import { scanPermissions } from '../domain/passport/discovery/permission-scanner.js';
import { buildPassport } from '../domain/passport/builder/manifest-builder.js';
import type { ProjectProfile } from '../domain/passport/builder/manifest-builder.js';
import { deriveDocStatusFromFindings, buildScanSummary, buildDocQualitySummary } from '../domain/passport/scan-to-compliance.js';
import { loadOrCreateKeyPair, signPassport, verifyPassport as verifyPassportCrypto } from '../domain/passport/crypto-signer.js';
import { validatePassport, computeCompleteness } from '../domain/passport/passport-validator.js';
import type { ValidationResult, CompletenessResult } from '../domain/passport/passport-validator.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import { updatePassportCompliance } from './passport-service-utils.js';
import { createLogger } from '../infra/logger.js';

const log = createLogger('passport-service');
import { createPassportDocuments } from './passport-documents.js';
import { createPassportAudit } from './passport-audit.js';

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

/** Read .complior/profile.json — non-fatal if missing. */
const ProfileSchema = z.record(z.unknown());

const loadProjectProfile = async (projectPath: string): Promise<ProjectProfile | undefined> => {
  try {
    const raw = await readFile(join(projectPath, '.complior', 'profile.json'), 'utf-8');
    const parsed = ProfileSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) { log.warn('Invalid profile.json:', parsed.error.message); return undefined; }
    const profile = parsed.data;
    const business = profile.business as Record<string, unknown> | undefined;
    const data = profile.data as Record<string, unknown> | undefined;
    const aiSystem = profile.aiSystem as Record<string, unknown> | undefined;
    const computed = profile.computed as Record<string, unknown> | undefined;

    const domain = (business?.domain as string) ?? 'general';
    const dataTypes = Array.isArray(data?.types) ? (data.types as string[]) : [];
    const systemType = (aiSystem?.type as string) ?? 'feature';
    const riskLevel = (computed?.riskLevel as string) ?? 'limited';
    const dataStorage = (data?.storage as string) ?? undefined;

    return { domain, dataTypes, systemType, riskLevel, dataStorage };
  } catch (err) {
    log.debug('No project profile found:', err);
    return undefined;
  }
};

// --- Service factory ---

export const createPassportService = (deps: PassportServiceDeps) => {
  const { collectFiles, events, getProjectPath, getLastScanResult } = deps;

  // --- CRUD ---

  const initPassport = async (
    projectPath?: string,
    overrides?: Record<string, unknown>,
    force?: boolean,
  ): Promise<InitPassportResult> => {
    const path = projectPath ?? getProjectPath();
    const ctx = await collectFiles(path);
    const parsedDeps = parseDepsFromContext(ctx);
    const agents = discoverAgents(ctx, parsedDeps);

    if (agents.length === 0) return { manifests: [], savedPaths: [], skipped: [] };

    const l3Results = runLayer3(ctx);
    const l4Results = runLayer4(ctx, l3Results);
    const scanResult = getLastScanResult();

    // Load project profile for risk classification (non-fatal if missing)
    const projectProfile = await loadProjectProfile(path);

    const manifests: AgentPassport[] = [];
    const savedPaths: string[] = [];
    const skipped: string[] = [];

    for (const agent of agents) {
      const autonomy = analyzeAutonomy(l4Results);
      const permissions = scanPermissions(ctx);

      // Check for existing passport to preserve dates on --force
      const agentsDir = join(path, '.complior', 'agents');
      const filePath = join(agentsDir, `${agent.name}-manifest.json`);
      let existingPassport: { created: string; deployed_since: string } | undefined;

      if (force) {
        try {
          const raw = await readFile(filePath, 'utf-8');
          const existing = parsePassport(raw);
          if (existing) {
            existingPassport = {
              created: existing.created,
              deployed_since: existing.lifecycle.deployed_since,
            };
          }
        } catch (err) { log.debug(`No existing passport for ${agent.name}:`, err); }
      }

      const unsignedManifest = buildPassport({
        agent, autonomy, permissions,
        scanResult: scanResult ?? undefined,
        overrides,
        projectProfile,
        existingPassport,
      });

      const keyPair = await loadOrCreateKeyPair();
      const signature = signPassport(unsignedManifest, keyPair.privateKey);
      const signedManifest: AgentPassport = { ...unsignedManifest, signature };

      await mkdir(dirname(filePath), { recursive: true });

      if (!force) {
        try {
          const existing = await readFile(filePath, 'utf-8');
          if (existing.trim().length > 0) { skipped.push(agent.name); continue; }
          // Empty file — treat as non-existent, overwrite
        } catch { /* file doesn't exist — create it */ }
      }

      await writeFile(filePath, JSON.stringify(signedManifest, null, 2));
      manifests.push(signedManifest);
      savedPaths.push(filePath);

      if (deps.auditStore) {
        await deps.auditStore.append('passport.created', { name: agent.name, path: filePath }, agent.name);
      }
      if (deps.evidenceStore) {
        const evidence = createEvidence(agent.name, 'passport', 'passport', { file: filePath });
        await deps.evidenceStore.append([evidence], randomUUID());
      }
      if (scanResult) {
        events.emit('agent.scan.completed', { agentName: agent.name, result: scanResult });
        events.emit('agent.score.updated', { agentName: agent.name, before: 0, after: scanResult.score?.totalScore ?? 0 });
      }
    }

    events.emit('scan.started', { projectPath: path });
    return { manifests, savedPaths, skipped };
  };

  const listPassports = async (projectPath?: string): Promise<readonly AgentPassport[]> => {
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
    } catch (err) { log.debug('Failed to list passports:', err); return []; }
  };

  const showPassport = async (name: string, projectPath?: string): Promise<AgentPassport | null> => {
    const path = projectPath ?? getProjectPath();
    try {
      const content = await readFile(join(path, '.complior', 'agents', `${name}-manifest.json`), 'utf-8');
      return parsePassport(content);
    } catch (err) { log.debug(`Failed to read passport ${name}:`, err); return null; }
  };

  const verifyPassport = async (name: string, projectPath?: string): Promise<boolean> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return false;
    return verifyPassportCrypto(manifest);
  };

  const analyzeProjectAutonomy = async (projectPath?: string): Promise<AutonomyAnalysis> => {
    const path = projectPath ?? getProjectPath();
    const ctx = await collectFiles(path);
    return analyzeAutonomy(runLayer4(ctx, runLayer3(ctx)));
  };

  const validatePassportByName = async (name: string, projectPath?: string): Promise<ValidationResult | null> => {
    const manifest = await showPassport(name, projectPath);
    return manifest ? validatePassport(manifest) : null;
  };

  const getPassportCompleteness = async (name: string, projectPath?: string): Promise<CompletenessResult | null> => {
    const manifest = await showPassport(name, projectPath);
    return manifest ? computeCompleteness(manifest) : null;
  };

  const findAgentsForFile = async (changedPath: string): Promise<readonly { name: string; sourceFiles: readonly string[] }[]> => {
    const { relative } = await import('node:path');
    const projectPath = getProjectPath();
    const relChanged = relative(projectPath, changedPath);
    const passports = await listPassports(projectPath);
    return passports
      .filter((p) => (p.source_files ?? []).some((sf) => relChanged === sf || relChanged.startsWith(sf + '/')))
      .map((p) => ({ name: p.name, sourceFiles: p.source_files ?? [] }));
  };

  /** Step 10: Auto-update passports after scan — refreshes score, doc status, and scan_summary per-agent. */
  const updatePassportsAfterScan = async (scanResult: ScanResult, projectPath?: string): Promise<void> => {
    const path = projectPath ?? getProjectPath();
    const passports = await listPassports(path);

    // Global findings (no agentId) apply to ALL agents — they represent project-wide checks
    // (doc quality, config, dependencies, etc.) that affect every agent in the project.
    const globalFindings = scanResult.findings.filter(f => !f.agentId);

    for (const passport of passports) {
      // Agent-specific + global findings = full compliance picture for this agent
      const agentSpecificFindings = scanResult.findings.filter(f => f.agentId === passport.name);
      const allAgentFindings = [...agentSpecificFindings, ...globalFindings];

      const docStatus = deriveDocStatusFromFindings(allAgentFindings, scanResult.scannedAt);
      const scanSummary = buildScanSummary(allAgentFindings, scanResult.scannedAt);

      // complior_score: per-agent simple ratio (no category weights).
      // Contrast with project_score (weighted 8-category score from score-calculator.ts).
      const agentPassed = allAgentFindings.filter(f => f.type === 'pass').length;
      const agentFailed = allAgentFindings.filter(f => f.type === 'fail').length;
      const applicable = agentPassed + agentFailed;
      const agentScore = applicable > 0 ? Math.round((agentPassed / applicable) * 100) : 0;

      const docQualitySummary = buildDocQualitySummary(docStatus);

      await updatePassportCompliance(deps, passport.name, {
        complior_score: agentScore,
        project_score: scanResult.score.totalScore,
        last_scan: scanResult.scannedAt,
        scan_summary: scanSummary,
        doc_quality_summary: docQualitySummary,
        ...docStatus,
      }, path).catch((err) => { log.debug(`Failed to update passport ${passport.name}:`, err); });
    }
  };

  // --- Delegate to sub-modules ---

  const coreOps = { showPassport, listPassports };
  const docs = createPassportDocuments(deps, coreOps);
  const audit = createPassportAudit(deps, coreOps);

  /** Rename a passport: update file name, internal name field, re-sign. */
  const renamePassport = async (
    oldName: string,
    newName: string,
    projectPath?: string,
  ): Promise<{ oldPath: string; newPath: string }> => {
    const path = projectPath ?? getProjectPath();
    const agentsDir = join(path, '.complior', 'agents');
    const oldPath = join(agentsDir, `${oldName}-manifest.json`);
    const newPath = join(agentsDir, `${newName}-manifest.json`);

    // Read existing passport
    const raw = await readFile(oldPath, 'utf-8');
    const passport = parsePassport(raw);
    if (!passport) throw new Error(`Invalid passport: ${oldName}`);

    // Check target doesn't already exist
    try { await stat(newPath); throw new Error(`Passport '${newName}' already exists`); } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }

    // Update name + re-sign
    const updated: AgentPassport = { ...passport, name: newName, updated: new Date().toISOString() };
    const keyPair = await loadOrCreateKeyPair();
    const signature = signPassport(updated, keyPair.privateKey);
    const signed: AgentPassport = { ...updated, signature };

    // Write new file, remove old
    await writeFile(newPath, JSON.stringify(signed, null, 2));
    const { unlink } = await import('node:fs/promises');
    await unlink(oldPath);

    // Audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('passport.updated' as Parameters<typeof deps.auditStore.append>[0], {
        action: 'rename', oldName, newName, path: newPath,
      }, newName);
    }

    return { oldPath, newPath };
  };

  return Object.freeze({
    initPassport,
    listPassports,
    showPassport,
    verifyPassport,
    analyzeProjectAutonomy,
    validatePassportByName,
    getPassportCompleteness,
    findAgentsForFile,
    updatePassportsAfterScan,
    renamePassport,
    ...docs,
    ...audit,
  });
};

export type PassportService = ReturnType<typeof createPassportService>;
