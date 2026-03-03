import { randomUUID } from 'node:crypto';
import type { ScanResult } from '../types/common.types.js';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import { detectDrift } from '../domain/scanner/drift.js';
import { generateSbom, type CycloneDxBom } from '../domain/scanner/sbom.js';
import {
  parsePackageJson, parseRequirementsTxt, parseCargoToml, parseGoMod,
} from '../domain/scanner/layers/layer3-parsers.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';

export interface ScanServiceDeps {
  readonly scanner: Scanner;
  readonly collectFiles: (projectPath: string) => Promise<ScanContext>;
  readonly events: EventBusPort;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (result: ScanResult) => void;
  readonly evidenceStore?: EvidenceStore;
}

export const createScanService = (deps: ScanServiceDeps) => {
  const { scanner, collectFiles, events, setLastScanResult } = deps;

  const scan = async (projectPath: string): Promise<ScanResult> => {
    events.emit('scan.started', { projectPath });

    const previousResult = deps.getLastScanResult();
    const ctx = await collectFiles(projectPath);
    const result = scanner.scan(ctx);

    setLastScanResult(result);
    events.emit('scan.completed', { result });

    // C.R20: Persist evidence to chain
    if (deps.evidenceStore) {
      const allEvidence = result.findings.flatMap(f => f.evidence ?? []);
      if (allEvidence.length > 0) {
        const scanId = randomUUID();
        await deps.evidenceStore.append(allEvidence, scanId);
      }
    }

    // Drift detection: compare with previous scan
    if (previousResult !== null) {
      const drift = detectDrift(result, previousResult);
      if (drift.hasDrift) {
        events.emit('scan.drift', { drift });
      }
    }

    return result;
  };

  const scanDeep = async (projectPath: string): Promise<ScanResult> => {
    if (scanner.scanDeep === undefined) {
      return scan(projectPath);
    }

    events.emit('scan.started', { projectPath });

    const ctx = await collectFiles(projectPath);

    // Build file contents map for L5 analysis
    const fileContents = new Map<string, string>();
    for (const file of ctx.files) {
      fileContents.set(file.relativePath, file.content);
    }

    const result = await scanner.scanDeep(ctx, fileContents);

    setLastScanResult(result);
    events.emit('scan.completed', { result });

    return result;
  };

  const getSbom = async (projectPath: string): Promise<CycloneDxBom> => {
    const ctx = await collectFiles(projectPath);
    const allDeps = [];

    for (const file of ctx.files) {
      const filename = file.relativePath.split('/').pop() ?? '';
      if (filename === 'package.json' && !file.relativePath.includes('node_modules')) {
        allDeps.push(...parsePackageJson(file.content));
      } else if (filename === 'requirements.txt') {
        allDeps.push(...parseRequirementsTxt(file.content));
      } else if (filename === 'Cargo.toml') {
        allDeps.push(...parseCargoToml(file.content));
      } else if (filename === 'go.mod') {
        allDeps.push(...parseGoMod(file.content));
      }
    }

    return generateSbom(allDeps);
  };

  return Object.freeze({ scan, scanDeep, getSbom });
};

export type ScanService = ReturnType<typeof createScanService>;
