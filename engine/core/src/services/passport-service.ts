import { writeFile, readFile, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { ScanResult } from '../types/common.types.js';
import type { AgentManifest } from '../types/passport.types.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import { parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod } from '../domain/scanner/layers/layer3-parsers.js';
import type { ParsedDependency } from '../domain/scanner/layers/layer3-parsers.js';
import { runLayer3 } from '../domain/scanner/layers/layer3-config.js';
import { runLayer4 } from '../domain/scanner/layers/layer4-patterns.js';
import { discoverAgents } from '../domain/passport/agent-discovery.js';
import { analyzeAutonomy } from '../domain/passport/autonomy-analyzer.js';
import { scanPermissions } from '../domain/passport/permission-scanner.js';
import { buildManifest } from '../domain/passport/manifest-builder.js';
import { loadOrCreateKeyPair, signManifest, verifyManifest } from '../domain/passport/crypto-signer.js';

// --- Types ---

export interface PassportServiceDeps {
  readonly collectFiles: (path: string) => Promise<ScanContext>;
  readonly scanner: Scanner;
  readonly events: EventBusPort;
  readonly getProjectPath: () => string;
  readonly getLastScanResult: () => ScanResult | null;
}

export interface InitPassportResult {
  readonly manifests: readonly AgentManifest[];
  readonly savedPaths: readonly string[];
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
  ): Promise<InitPassportResult> => {
    const path = projectPath ?? getProjectPath();

    // 1. Collect files
    const ctx = await collectFiles(path);

    // 2. Parse dependencies
    const parsedDeps = parseDepsFromContext(ctx);

    // 3. Discover agents
    const agents = discoverAgents(ctx, parsedDeps);

    if (agents.length === 0) {
      return { manifests: [], savedPaths: [] };
    }

    // 4. Run L3 + L4 for autonomy analysis
    const l3Results = runLayer3(ctx);
    const l4Results = runLayer4(ctx, l3Results);

    // 5. Get scan result for compliance score
    const scanResult = getLastScanResult();

    // 6. Generate manifests for each agent
    const manifests: AgentManifest[] = [];
    const savedPaths: string[] = [];

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
      await writeFile(filePath, JSON.stringify(signedManifest, null, 2));

      manifests.push(signedManifest);
      savedPaths.push(filePath);
    }

    // Emit event
    events.emit('scan.started', { projectPath: path });

    return { manifests, savedPaths };
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

  return Object.freeze({ initPassport, listPassports, showPassport, verifyPassport });
};

export type PassportService = ReturnType<typeof createPassportService>;
