/**
 * Build script for CLASSIFIED tools (1,966)
 * Enriches with passive scan, LLM scoring, and detection data
 *
 * Usage: npx tsx engine/src/domain/registry/build-classified.ts [--limit N] [--force]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PQueue from 'p-queue';
import { scanTool } from './passive-scan/scan-tool.js';
import { applyPassiveScanToTool, scoreTool } from './score.js';
import type { RegistryTool, PassiveScanData } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');
const SCANNED_DIR = join(REGISTRY_DIR, 'scanned');
const DETECTION_DIR = join(REGISTRY_DIR, 'detection');

// --- .env loading ---

function loadEnv(): void {
  const envPath = join(__dirname, '..', '..', '..', '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

interface CliArgs {
  limit: number;
  force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let limit = 99999; // No limit by default
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1]!, 10);
      i++;
    }
    if (args[i] === '--force') force = true;
  }

  return { limit, force };
}

// --- Detection patterns ---

const DETECTION_PACKAGES: Record<string, readonly string[]> = {
  openai: ['openai', '@azure/openai'],
  anthropic: ['@anthropic-ai/sdk'],
  google: ['@google/generative-ai', '@google-cloud/aiplatform'],
  meta: ['transformers', 'llama-cpp-python'],
  mistral: ['@mistralai/mistralai', 'mistralai'],
  cohere: ['cohere-ai', 'cohere'],
  'stability-ai': ['stability-sdk'],
  'hugging face': ['transformers', 'huggingface-hub', '@huggingface/inference'],
  deepseek: ['openai'],
  microsoft: ['semantic-kernel', '@microsoft/ai'],
  amazon: ['@aws-sdk/client-bedrock-runtime'],
  nvidia: ['openai'],
  replicate: ['replicate'],
  together: ['together-ai'],
  groq: ['groq-sdk'],
  fireworks: ['@fireworks-ai/sdk'],
  perplexity: ['openai'],
};

function getDetectionPackages(providerName: string): readonly string[] {
  const key = providerName.toLowerCase();
  return DETECTION_PACKAGES[key] ?? [];
}

interface PackageInfo {
  readonly name: string;
  readonly registry: 'npm' | 'pypi';
  readonly exists: boolean;
  readonly weekly_downloads: number | null;
  readonly version: string | null;
}

async function checkNpmPackage(name: string): Promise<PackageInfo> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { name, registry: 'npm', exists: false, weekly_downloads: null, version: null };
    const json = (await res.json()) as Record<string, unknown>;
    const version = (json['dist-tags'] as Record<string, string>)?.['latest'] ?? null;
    let weekly = null;
    try {
      const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`, {
        signal: AbortSignal.timeout(3000),
      });
      if (dlRes.ok) {
        const dlJson = (await dlRes.json()) as { downloads?: number };
        weekly = dlJson.downloads ?? null;
      }
    } catch {}
    return { name, registry: 'npm', exists: true, weekly_downloads: weekly, version };
  } catch {
    return { name, registry: 'npm', exists: false, weekly_downloads: null, version: null };
  }
}

async function checkPypiPackage(name: string): Promise<PackageInfo> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${name}/json`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { name, registry: 'pypi', exists: false, weekly_downloads: null, version: null };
    const json = (await res.json()) as { info?: { version?: string } };
    const version = json.info?.version ?? null;
    return { name, registry: 'pypi', exists: true, weekly_downloads: null, version };
  } catch {
    return { name, registry: 'pypi', exists: false, weekly_downloads: null, version: null };
  }
}

interface DetectionEntry {
  slug: string;
  provider: string;
  packages: readonly PackageInfo[];
  saas_domains: readonly string[];
}

// --- Main ---

async function main(): Promise<void> {
  loadEnv();
  const { limit, force } = parseArgs();

  console.log('=== Build CLASSIFIED Tools — Hybrid Enrichment ===\n');
  console.log(`Options: limit=${limit}, force=${force}\n`);

  // 1. Load all CLASSIFIED tools
  console.log('Loading CLASSIFIED tools...');
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  const allToolsRaw: RegistryTool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));

  const classified = allToolsRaw
    .filter(t => t.level === 'classified')
    .slice(0, limit);

  console.log(`  Total tools: ${allToolsRaw.length}`);
  console.log(`  CLASSIFIED: ${allToolsRaw.filter(t => t.level === 'classified').length}`);
  console.log(`  Selected for enrichment: ${classified.length}\n`);

  // 2. Ensure output directories
  ensureDir(SCANNED_DIR);
  ensureDir(DETECTION_DIR);

  // 3. Stage 1: Passive Scan
  console.log('=== Stage 1/3: Passive Scan ===');
  console.log('Collecting evidence: robots.txt, privacy policy, terms, cookies...\n');

  const scanQueue = new PQueue({ concurrency: 10 });
  let scanCount = 0;
  let scanSkipped = 0;

  const scanPromises = classified.map(tool =>
    scanQueue.add(async () => {
      const outPath = join(SCANNED_DIR, `${tool.slug}.json`);
      if (!force && existsSync(outPath)) {
        scanSkipped++;
        return;
      }

      try {
        const scanData = await scanTool(tool);
        writeFileSync(outPath, JSON.stringify(scanData, null, 2));
        scanCount++;
        if (scanCount % 50 === 0) {
          console.log(`  Progress: ${scanCount}/${classified.length - scanSkipped} scanned`);
        }
      } catch (err) {
        console.error(`  ❌ ${tool.slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(scanPromises);
  console.log(`\n✅ Passive scan complete: ${scanCount} scanned, ${scanSkipped} already exists\n`);

  // 4. Stage 2: Deterministic Scoring
  console.log('=== Stage 2/3: Deterministic Scoring ===');
  console.log('Calculating compliance scores from passive scan evidence...\n');

  let scoreCount = 0;

  for (const tool of classified) {
    try {
      // Load passive scan data
      const scanPath = join(SCANNED_DIR, `${tool.slug}.json`);
      if (!existsSync(scanPath)) continue;

      const scanData: PassiveScanData = JSON.parse(readFileSync(scanPath, 'utf-8'));

      // Apply scan data to tool (updates score automatically)
      const enrichedTool = applyPassiveScanToTool(tool, scanData);

      // Update tool in all_tools.json
      const idx = allToolsRaw.findIndex(t => t.slug === tool.slug);
      if (idx >= 0) {
        allToolsRaw[idx] = enrichedTool;
      }

      scoreCount++;
      if (scoreCount % 50 === 0) {
        console.log(`  Progress: ${scoreCount}/${classified.length} scored`);
      }
    } catch (err) {
      console.error(`  ❌ ${tool.slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n✅ Scoring complete: ${scoreCount} scored\n`);

  // Save updated all_tools.json
  writeFileSync(allToolsPath, JSON.stringify(allToolsRaw, null, 2));
  console.log('Updated all_tools.json with scores\n');

  // 5. Stage 3: Detection (npm/PyPI)
  console.log('=== Stage 3/3: Detection Patterns ===');
  console.log('Checking npm and PyPI registries for SDK packages...\n');

  const detectionQueue = new PQueue({ concurrency: 10 });
  let detectionCount = 0;

  const detectionPromises = classified.map(tool =>
    detectionQueue.add(async () => {
      const outPath = join(DETECTION_DIR, `${tool.slug}.json`);
      if (!force && existsSync(outPath)) {
        detectionCount++;
        return;
      }

      const pkgNames = getDetectionPackages(tool.provider.name);
      if (!pkgNames || pkgNames.length === 0) return;

      const packages: PackageInfo[] = [];
      for (const name of pkgNames) {
        packages.push(await checkNpmPackage(name));
        const pypiName = name.replace(/^@/, '').replace(/\//g, '-');
        packages.push(await checkPypiPackage(pypiName));
      }

      const entry: DetectionEntry = {
        slug: tool.slug,
        provider: tool.provider.name,
        packages: packages.filter(p => p.exists),
        saas_domains: [new URL(tool.website).hostname],
      };

      writeFileSync(outPath, JSON.stringify(entry, null, 2));
      detectionCount++;

      if (detectionCount % 50 === 0) {
        console.log(`  Progress: ${detectionCount}/${classified.length} checked`);
      }
    }),
  );

  await Promise.all(detectionPromises);
  console.log(`\n✅ Detection complete: ${detectionCount} tools checked\n`);

  // 6. Summary
  console.log('=== Summary ===');
  console.log(`Tools processed: ${classified.length}`);
  console.log(`  Passive scans: ${scanCount}`);
  console.log(`  LLM scores: ${scoreCount || 0}`);
  console.log(`  Detection data: ${detectionCount}`);
  console.log('\n✅ CLASSIFIED enrichment complete!');
  console.log('\nNext step: Generate API JSONs with scripts/generate-all-apis.ts');
}

main().catch(console.error);
