import { randomUUID, createHash } from 'node:crypto';
import type { ScanResult, Finding, AgentSummary, Role, ScanMode } from '../types/common.types.js';
import type { ScanContext } from '../ports/scanner.port.js';
import type { EventBusPort } from '../ports/events.port.js';
import type { Scanner } from '../domain/scanner/create-scanner.js';
import { detectDrift } from '../domain/scanner/drift.js';
import { generateSbom, type CycloneDxBom } from '../domain/scanner/sbom.js';
import { parseDepsFromContext } from '../domain/shared/parse-dependencies.js';
import { discoverAgents } from '../domain/passport/discovery/agent-discovery.js';
import { attributeFindings, expandPerAgentFindings, type AgentInfo } from '../domain/scanner/finding-attribution.js';
import { buildImportGraph } from '../domain/scanner/import-graph.js';
import type { EvidenceStore } from '../domain/scanner/evidence-store.js';
import { createEvidence } from '../domain/scanner/evidence.js';
import type { AuditStore } from '../domain/audit/audit-trail.js';
import { computeComplianceDiff, formatDiffMarkdown, type ComplianceDiff } from '../domain/scanner/compliance-diff.js';
import { loadCustomBannedPackages } from '../domain/scanner/rules/banned-packages.js';
import { filterFindingsByRole } from '../domain/scanner/role-filter.js';
import type { ScanCache } from '../domain/scanner/scan-cache.js';

export interface ScanServiceDeps {
  readonly scanner: Scanner;
  readonly collectFiles: (projectPath: string) => Promise<ScanContext>;
  readonly events: EventBusPort;
  readonly getLastScanResult: () => ScanResult | null;
  readonly setLastScanResult: (result: ScanResult) => void;
  readonly evidenceStore?: EvidenceStore;
  readonly auditStore?: AuditStore;
  /** E-11: Per-file scan cache (SHA-256 + mtime). Persisted to .complior/cache/. */
  readonly scanCache?: ScanCache;
  /** Optional passport service for per-agent finding enrichment + post-scan update. */
  readonly passportService?: {
    readonly listPassports: (path?: string) => Promise<readonly { name: string; source_files?: readonly string[] }[]>;
    readonly updatePassportsAfterScan?: (result: ScanResult, projectPath?: string) => Promise<void>;
    readonly initPassport?: (projectPath?: string) => Promise<{ manifests: readonly unknown[]; savedPaths: readonly string[]; skipped: readonly string[] }>;
  };
  /** Project role from onboarding profile. Injected via composition-root. */
  readonly getProjectRole?: (projectPath: string) => Promise<Role>;
  /** Persist per-mode scan score to .complior/scan-scores.json. */
  readonly saveScanModeScore?: (mode: ScanMode, score: number, zone: string) => Promise<void>;
}

/** E-11: Compute a fast project-level hash from all file contents. */
const computeProjectHash = (ctx: ScanContext): string => {
  const hash = createHash('sha256');
  // Sort for determinism, then hash path + content
  const sorted = [...ctx.files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const f of sorted) {
    hash.update(f.relativePath);
    hash.update(f.content);
  }
  return hash.digest('hex');
};

/** US-S05-34: Result of a compliance diff scan. */
export interface ScanDiffResult extends ComplianceDiff {
  readonly markdown?: string;
}


/** Recalculate score after role filtering (some fails → skip). */
const recalcScore = (findings: readonly Finding[], original: ScanResult['score']): ScanResult['score'] => {
  const passed = findings.filter(f => f.type === 'pass').length;
  const failed = findings.filter(f => f.type === 'fail').length;
  const skipped = findings.filter(f => f.type === 'skip').length;
  const applicable = passed + failed;
  const totalScore = applicable === 0 ? 100 : Math.round((passed / applicable) * 100);
  return {
    ...original,
    totalScore,
    zone: totalScore >= 80 ? 'green' : totalScore >= 50 ? 'yellow' : 'red',
    passedChecks: passed,
    failedChecks: failed,
    skippedChecks: skipped,
    totalChecks: findings.length,
  };
};

/** Enrich scan findings with agentId from passport source_files mapping. */
const enrichWithAgentIds = async (
  result: ScanResult,
  projectPath: string,
  passportService?: ScanServiceDeps['passportService'],
  ctx?: ScanContext,
): Promise<ScanResult> => {
  if (!passportService && !ctx) return result;

  let passports: { name: string; source_files?: readonly string[] }[] = [];

  if (passportService) {
    try { passports = [...await passportService.listPassports(projectPath)]; }
    catch { /* continue to fallback */ }
  }

  // Fallback: no persisted passports → auto-discover from code patterns
  if (passports.length === 0 && ctx) {
    const discovered = discoverAgents(ctx, parseDepsFromContext(ctx));
    if (discovered.length === 0) return result;
    passports = discovered.map(a => ({ name: a.name, source_files: a.sourceFiles }));
  }

  if (passports.length === 0) return result;

  // Map passports to AgentInfo for attribution
  const agents: AgentInfo[] = passports.map(p => ({
    name: p.name,
    sourceFiles: p.source_files ?? [],
  }));

  // Build import graph from scan context for graph-based attribution
  const importGraph = ctx ? buildImportGraph(ctx.files) : null;

  const enrichedFindings: readonly Finding[] = importGraph
    ? attributeFindings(result.findings, agents, importGraph)
    : result.findings.map(f => agents.length === 1 ? { ...f, agentId: agents[0].name } : f);

  // Per-agent document requirements: each agent gets its own doc-presence findings
  const expandedFindings = expandPerAgentFindings(enrichedFindings, agents);

  // Per-agent summaries — include ALL passports (even those with 0 findings)
  const byAgent = new Map<string, Finding[]>();
  for (const f of expandedFindings) {
    if (!f.agentId) continue;
    if (!byAgent.has(f.agentId)) byAgent.set(f.agentId, []);
    byAgent.get(f.agentId)!.push(f);
  }

  const agentSummaries: AgentSummary[] = passports.map(p => {
    const findings = byAgent.get(p.name) ?? [];
    return {
      agentId: p.name,
      agentName: p.name,
      findingCount: findings.filter(f => f.type === 'fail').length,
      criticalCount: findings.filter(f => f.severity === 'critical').length,
      highCount: findings.filter(f => f.severity === 'high').length,
      fileCount: new Set(findings.map(f => f.file).filter(Boolean)).size,
    };
  });

  return {
    ...result,
    findings: expandedFindings,
    agentSummaries,
  };
};

export const createScanService = (deps: ScanServiceDeps) => {
  const { scanner, collectFiles, events, setLastScanResult } = deps;

  // E-11: In-memory project-level scan cache (hash of all files → ScanResult)
  let cachedProjectHash: string | null = null;
  let cachedResult: ScanResult | null = null;

  /** Synchronous post-scan: auto-discover agents + update passports before returning result. */
  const syncPassportUpdate = async (result: ScanResult, projectPath: string): Promise<void> => {
    if (!deps.passportService?.updatePassportsAfterScan) return;
    try {
      // 1. Auto-discover new agents (idempotent — skips existing)
      if (deps.passportService.initPassport) {
        await deps.passportService.initPassport(projectPath).catch(() => ({ manifests: [], savedPaths: [], skipped: [] }));
      }
      // 2. Update scores on ALL passports
      await deps.passportService.updatePassportsAfterScan(result, projectPath);
    } catch { /* non-fatal */ }
  };

  /** Apply role filtering to a scan result (pure, no caching side effects). */
  const applyRoleFilter = async (scanResult: ScanResult, projectPath: string): Promise<ScanResult> => {
    const projectRole = deps.getProjectRole
      ? await deps.getProjectRole(projectPath)
      : 'both' as Role;
    const filtered = filterFindingsByRole(scanResult.findings, projectRole);
    if (filtered === scanResult.findings) return scanResult;
    return { ...scanResult, findings: filtered, score: recalcScore(filtered, scanResult.score) };
  };

  const scan = async (projectPath: string): Promise<ScanResult> => {
    events.emit('scan.started', { projectPath });

    const previousResult = deps.getLastScanResult();
    await loadCustomBannedPackages(projectPath);
    const ctx = await collectFiles(projectPath);

    // E-11: Check if project content unchanged since last scan
    const projectHash = computeProjectHash(ctx);
    if (cachedProjectHash === projectHash && cachedResult !== null) {
      // Content identical — apply role filter (role may have changed) and return
      const result = await applyRoleFilter({
        ...cachedResult,
        scannedAt: new Date().toISOString(),
      }, projectPath);
      events.emit('scan.completed', { result });
      return result;
    }

    const rawResult = scanner.scan(ctx);
    const enriched = await enrichWithAgentIds(rawResult, projectPath, deps.passportService, ctx);

    // E-11: Update in-memory cache with pre-filter result (role-independent)
    cachedProjectHash = projectHash;
    cachedResult = enriched;

    // Apply role-based filtering after caching
    const result = await applyRoleFilter(enriched, projectPath);

    // E-11: Persist file-level cache to disk (survives daemon restarts)
    if (deps.scanCache) {
      for (const file of ctx.files) {
        deps.scanCache.set(file.relativePath, file.content, 0, [], 'L4');
      }
      deps.scanCache.save();
    }

    setLastScanResult(result);
    await deps.saveScanModeScore?.('basic', result.score.totalScore, result.score.zone);
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

    // Synchronous passport update (ensures passport is current before HTTP response)
    await syncPassportUpdate(result, projectPath);

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

    const rawResult = await scanner.scanDeep(ctx, fileContents);
    const enriched = await enrichWithAgentIds(rawResult, projectPath, deps.passportService, ctx);
    const result = await applyRoleFilter(enriched, projectPath);

    setLastScanResult(result);
    await deps.saveScanModeScore?.('llm', result.score.totalScore, result.score.zone);
    events.emit('scan.completed', { result });
    await syncPassportUpdate(result, projectPath);

    return result;
  };

  const getSbom = async (projectPath: string): Promise<CycloneDxBom> => {
    const ctx = await collectFiles(projectPath);
    return generateSbom(parseDepsFromContext(ctx));
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

  const scanTier2 = async (projectPath: string): Promise<ScanResult> => {
    if (scanner.scanTier2 === undefined) {
      return scan(projectPath);
    }

    events.emit('scan.started', { projectPath });

    await loadCustomBannedPackages(projectPath);
    const ctx = await collectFiles(projectPath);
    const rawResult = await scanner.scanTier2(ctx);
    const enriched = await enrichWithAgentIds(rawResult, projectPath, deps.passportService, ctx);
    const result = await applyRoleFilter(enriched, projectPath);

    setLastScanResult(result);
    await deps.saveScanModeScore?.('security', result.score.totalScore, result.score.zone);
    events.emit('scan.completed', { result });
    await syncPassportUpdate(result, projectPath);

    return result;
  };

  /** Alias for scanDeep — L5 LLM analysis. */
  const scanLlm = scanDeep;

  return Object.freeze({ scan, scanDeep, scanTier2, scanLlm, getSbom, scanDiff });
};

export type ScanService = ReturnType<typeof createScanService>;
