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
import { createEvidence } from '../domain/scanner/evidence.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import { computeComplianceDiff, formatDiffMarkdown, type ComplianceDiff } from '../domain/scanner/compliance-diff.js';
import { loadCustomBannedPackages } from '../domain/scanner/rules/banned-packages.js';

export interface ScanServiceDeps {
  readonly scanner: Scanner;
  readonly collectFiles: (projectPath: string) => Promise<ScanContext>;
  readonly events: EventBusPort;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (result: ScanResult) => void;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
}

/** US-S05-34: Result of a compliance diff scan. */
export interface ScanDiffResult extends ComplianceDiff {
  readonly markdown?: string;
}

export const createScanService = (deps: ScanServiceDeps) => {
  const { scanner, collectFiles, events, setLastScanResult } = deps;

  const scan = async (projectPath: string): Promise<ScanResult> => {
    events.emit('scan.started', { projectPath });

    const previousResult = deps.getLastScanResult();
    await loadCustomBannedPackages(projectPath);
    const ctx = await collectFiles(projectPath);
    const result = scanner.scan(ctx);

    setLastScanResult(result);
    events.emit('scan.completed', { result });

    // US-S05-14: Record scan completion in audit trail
    if (deps.auditStore) {
      await deps.auditStore.append('scan.completed', {
        score: result.score.totalScore,
        zone: result.score.zone,
        findings: result.findings.length,
      });
    }

    // C.R20: Persist scan summary evidence to chain (not individual findings)
    if (deps.evidenceStore) {
      const scanId = randomUUID();
      const uniqueCheckIds = [...new Set(result.findings.map(f => f.checkId))];
      const summaryEvidence = createEvidence(
        `scan-${scanId}`,
        'scan-summary',
        'pattern-match',
        {
          snippet: JSON.stringify({
            score: result.score.totalScore,
            zone: result.score.zone,
            findings: result.findings.length,
            checks: uniqueCheckIds.length,
          }),
        },
      );
      await deps.evidenceStore.append([summaryEvidence], scanId);
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

  /** US-S05-34: Compliance Diff — run scan and compare against baseline. */
  const scanDiff = async (
    projectPath: string,
    changedFiles?: readonly string[],
    options?: { readonly markdown?: boolean },
  ): Promise<ScanDiffResult> => {
    // 1. Get baseline (previous scan result, if any)
    const baseline = deps.getLastScanResult();

    // 2. Run fresh scan
    const current = await scan(projectPath);

    // 3. Compute diff using pure domain function
    const diff = computeComplianceDiff(baseline, current, changedFiles);

    // 4. Generate markdown if requested
    const markdown = options?.markdown ? formatDiffMarkdown(diff) : undefined;

    return Object.freeze({ ...diff, markdown });
  };

  return Object.freeze({ scan, scanDeep, getSbom, scanDiff });
};

export type ScanService = ReturnType<typeof createScanService>;
