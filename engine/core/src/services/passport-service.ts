import { writeFile, readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { ScanResult } from '../types/common.types.js';
import type { AgentManifest } from '../types/passport.types.js';
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
import { buildManifest } from '../domain/passport/manifest-builder.js';
import { loadOrCreateKeyPair, signManifest, verifyManifest } from '../domain/passport/crypto-signer.js';
import { validatePassport, computeCompleteness } from '../domain/passport/passport-validator.js';
import type { ValidationResult, CompletenessResult } from '../domain/passport/passport-validator.js';
import { generateFria } from '../domain/fria/fria-generator.js';
import type { FriaResult } from '../domain/fria/fria-generator.js';
import type { EvidenceStore, EvidenceChainSummary } from '../domain/scanner/evidence-store.js';

// --- Types ---

export interface PassportServiceDeps {
  readonly collectFiles: (path: string) => Promise<ScanContext>;
  readonly scanner: Scanner;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
  readonly loadTemplate?: (file: string) => Promise<string>;
  readonly evidenceStore?: EvidenceStore;
}

export interface InitPassportResult {
  readonly manifests: readonly AgentManifest[];
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
    const manifests: AgentManifest[] = [];
    const savedPaths: string[] = [];
    const skipped: string[] = [];

    for (const agent of agents) {
      // Analyze autonomy
      const autonomy = analyzeAutonomy(l4Results);

      // Scan permissions
      const permissions = scanPermissions(ctx);

      // Build manifest
      const unsignedManifest = buildManifest({
        agent,
        autonomy,
        permissions,
        scanResult: scanResult ?? undefined,
        overrides,
      });

      // Sign manifest
      const keyPair = await loadOrCreateKeyPair();
      const signature = signManifest(unsignedManifest, keyPair.privateKey);

      const signedManifest: AgentManifest = {
        ...unsignedManifest,
        signature,
      };

      // Save to .complior/agents/
      const agentsDir = join(path, '.complior', 'agents');
      await mkdir(agentsDir, { recursive: true });
      const fileName = `${agent.name}-manifest.json`;
      const filePath = join(agentsDir, fileName);

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
    }

    // Emit event
    events.emit('scan.started', { projectPath: path });

    return { manifests, savedPaths, skipped };
  };

  const listPassports = async (
    projectPath?: string,
  ): Promise<readonly AgentManifest[]> => {
    const path = projectPath ?? getProjectPath();
    const agentsDir = join(path, '.complior', 'agents');

    try {
      const files = await readdir(agentsDir);
      const manifests: AgentManifest[] = [];

      for (const file of files) {
        if (!file.endsWith('-manifest.json')) continue;
        const content = await readFile(join(agentsDir, file), 'utf-8');
        manifests.push(JSON.parse(content) as AgentManifest);
      }

      return manifests;
    } catch {
      return [];
    }
  };

  const showPassport = async (
    name: string,
    projectPath?: string,
  ): Promise<AgentManifest | null> => {
    const path = projectPath ?? getProjectPath();
    const filePath = join(path, '.complior', 'agents', `${name}-manifest.json`);

    try {
      const content = await readFile(filePath, 'utf-8');
      return JSON.parse(content) as AgentManifest;
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
    return verifyManifest(manifest);
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

  // C.D01: FRIA generation from passport data
  const generateFriaReport = async (
    name: string,
    projectPath?: string,
    options?: { organization?: string; assessor?: string; impact?: string; mitigation?: string; approval?: string },
  ): Promise<(FriaResult & { savedPath: string }) | null> => {
    const manifest = await showPassport(name, projectPath);
    if (manifest === null) return null;

    if (!deps.loadTemplate) {
      throw new Error('loadTemplate dependency not provided');
    }

    const template = await deps.loadTemplate('fria.md');
    const result = generateFria({
      manifest,
      template,
      organization: options?.organization,
      assessor: options?.assessor,
      impact: options?.impact,
      mitigation: options?.mitigation,
      approval: options?.approval,
    });

    // Save FRIA report to .complior/reports/ (markdown + structured JSON)
    const path = projectPath ?? getProjectPath();
    const reportsDir = join(path, '.complior', 'reports');
    await mkdir(reportsDir, { recursive: true });
    const savedPath = join(reportsDir, `fria-${name}.md`);
    await writeFile(savedPath, result.markdown);
    const jsonPath = join(reportsDir, `fria-${name}.json`);
    await writeFile(jsonPath, JSON.stringify(result.structured, null, 2));

    // C.R20: Record FRIA generation in evidence chain
    if (deps.evidenceStore) {
      const evidence = createEvidence(
        name,
        'fria',
        'fria',
        { file: savedPath },
      );
      await deps.evidenceStore.append([evidence], randomUUID());
    }

    // Gap 4: Update passport with fria_completed and fria_date
    const manifestPath = join(path, '.complior', 'agents', `${name}-manifest.json`);
    try {
      const rawManifest = await readFile(manifestPath, 'utf-8');
      const currentManifest = JSON.parse(rawManifest) as AgentManifest;

      const updatedManifest: AgentManifest = {
        ...currentManifest,
        compliance: {
          ...currentManifest.compliance,
          fria_completed: true,
          fria_date: new Date().toISOString().slice(0, 10),
        },
        updated: new Date().toISOString(),
      };

      // Re-sign the updated manifest
      const keyPair = await loadOrCreateKeyPair();
      const newSignature = signManifest(updatedManifest, keyPair.privateKey);
      const resignedManifest: AgentManifest = {
        ...updatedManifest,
        signature: newSignature,
      };

      await writeFile(manifestPath, JSON.stringify(resignedManifest, null, 2));
    } catch {
      // Passport file doesn't exist or can't be updated — non-fatal
    }

    return { ...result, savedPath };
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

  return Object.freeze({
    initPassport,
    listPassports,
    showPassport,
    verifyPassport,
    analyzeProjectAutonomy,
    validatePassportByName,
    getPassportCompleteness,
    generateFriaReport,
    getEvidenceChainSummary,
    verifyEvidenceChain,
  });
};

export type PassportService = ReturnType<typeof createPassportService>;
