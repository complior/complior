/**
 * Build script for AI Registry — Wave 2.
 * Enriches Top 400 tools with passive scan evidence, OpenRouter LLM tests, and auto-scoring.
 *
 * Usage: npx tsx engine/src/domain/registry/build-wave2.ts [--limit N] [--force]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PQueue from 'p-queue';
import { RegistryFileSchema, DirectoryFileSchema } from '../../data/schemas-registry.js';
import { selectTop400 } from './collector.js';
import { scanTool } from './passive-scan/scan-tool.js';
import { fetchOpenRouterModels, matchToolsToModels, type ToolModelMatch } from './openrouter/model-matcher.js';
import { runTestsForModel } from './openrouter/run-tests.js';
import { applyPassiveScanToTool } from './score.js';
import type { RegistryTool, PassiveScanData, LlmTestResult, DirectoryEntry } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');
const SCANNED_DIR = join(REGISTRY_DIR, 'scanned');
const OPENROUTER_DIR = join(REGISTRY_DIR, 'openrouter');
const ASSESSMENTS_DIR = join(REGISTRY_DIR, 'assessments', 'eu-ai-act');

// --- .env loading (manual, no dotenv dep) ---

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
    // Strip surrounding quotes
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

// --- Detection patterns (static, no HTTP) ---

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
    // npm weekly downloads from separate endpoint
    let weekly = null;
    try {
      const dlRes = await fetch(`https://api.npmjs.org/downloads/point/last-week/${name}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (dlRes.ok) {
        const dlJson = (await dlRes.json()) as { downloads?: number };
        weekly = dlJson.downloads ?? null;
      }
    } catch { /* ignore */ }
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
    return { name, registry: 'pypi', exists: true, weekly_downloads: null, version: json.info?.version ?? null };
  } catch {
    return { name, registry: 'pypi', exists: false, weekly_downloads: null, version: null };
  }
}

interface DetectionEntry {
  readonly slug: string;
  readonly provider: string;
  readonly packages: readonly PackageInfo[];
  readonly saas_domains: readonly string[];
}

// --- CLI args ---

interface CliArgs {
  readonly limit: number;
  readonly force: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let limit = 400;
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

// --- Main ---

async function main(): Promise<void> {
  loadEnv();
  const { limit, force } = parseArgs();

  console.log('=== AI Registry Build — Wave 2 ===\n');
  console.log(`Options: limit=${limit}, force=${force}\n`);

  // 1. Load all_tools.json
  console.log('Loading all_tools.json...');
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  const allToolsRaw: RegistryTool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  console.log(`  Loaded ${allToolsRaw.length} tools\n`);

  // 2. Select top N
  const selected = selectTop400(allToolsRaw).slice(0, limit);
  console.log(`Selected ${selected.length} tools for enrichment\n`);

  // 3. Ensure output directories
  ensureDir(SCANNED_DIR);
  ensureDir(OPENROUTER_DIR);
  ensureDir(ASSESSMENTS_DIR);

  // 4. Stage 3: Passive scan
  console.log('--- Stage 3: Passive Scan ---');
  const scanQueue = new PQueue({ concurrency: 10 });
  let scanCount = 0;
  let scanSkipped = 0;

  const scanPromises = selected.map(tool =>
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
        if (scanCount % 20 === 0) {
          console.log(`  Scanned: ${scanCount}/${selected.length - scanSkipped}`);
        }
      } catch (err) {
        console.error(`  Error scanning ${tool.slug}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }),
  );

  await Promise.all(scanPromises);
  console.log(`  Passive scan complete: ${scanCount} scanned, ${scanSkipped} skipped\n`);

  // 5. Stage 5: OpenRouter LLM tests
  const openrouterKey = process.env['OPENROUTER_API_KEY'];
  let modelMatches: readonly ToolModelMatch[] = [];

  if (openrouterKey) {
    console.log('--- Stage 5: OpenRouter LLM Tests ---');
    try {
      const models = await fetchOpenRouterModels();
      console.log(`  OpenRouter models available: ${models.length}`);

      modelMatches = matchToolsToModels(selected, models);
      console.log(`  Matched tools to test: ${modelMatches.length}`);

      const testQueue = new PQueue({ concurrency: 2 });
      let testCount = 0;

      const testPromises = modelMatches.map(match =>
        testQueue.add(async () => {
          const outPath = join(OPENROUTER_DIR, `${match.tool.slug}.json`);
          if (!force && existsSync(outPath)) return;

          try {
            const results = await runTestsForModel({
              modelId: match.modelId,
              apiKey: openrouterKey,
            });
            writeFileSync(outPath, JSON.stringify(results, null, 2));
            testCount++;
            console.log(`  Tested: ${match.tool.name} → ${match.modelId} (${testCount}/${modelMatches.length})`);
          } catch (err) {
            console.error(`  Error testing ${match.tool.slug}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }),
      );

      await Promise.all(testPromises);
      console.log(`  LLM tests complete: ${testCount} tested\n`);
    } catch (err) {
      console.error(`  OpenRouter error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  } else {
    console.log('--- Stage 5: Skipped (no OPENROUTER_API_KEY) ---\n');
  }

  // 6. Stage 6: Detection patterns (npm/PyPI registry checks)
  console.log('--- Stage 6: Detection Patterns ---');
  const DETECTION_DIR = join(REGISTRY_DIR, 'detection');
  ensureDir(DETECTION_DIR);
  const detectionQueue = new PQueue({ concurrency: 10 });
  let detectionCount = 0;

  const detectionPromises = selected.map(tool =>
    detectionQueue.add(async () => {
      const outPath = join(DETECTION_DIR, `${tool.slug}.json`);
      if (!force && existsSync(outPath)) {
        detectionCount++;
        return;
      }

      const pkgNames = getDetectionPackages(tool.provider.name);
      if (pkgNames.length === 0) return;

      const packages: PackageInfo[] = [];
      for (const name of pkgNames) {
        // Check npm
        packages.push(await checkNpmPackage(name));
        // Check pypi equivalent (strip @ prefix for pypi)
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
    }),
  );

  await Promise.all(detectionPromises);
  console.log(`  Detection packages checked: ${detectionCount} tools\n`);

  // 7. Stage 7: Auto Score
  console.log('--- Stage 7: Auto Score ---');
  // Build index-based lookup to avoid losing duplicate slugs
  const slugToIndices = new Map<string, number[]>();
  for (let i = 0; i < allToolsRaw.length; i++) {
    const slug = allToolsRaw[i]!.slug;
    const indices = slugToIndices.get(slug) ?? [];
    indices.push(i);
    slugToIndices.set(slug, indices);
  }

  const finalTools: RegistryTool[] = [...allToolsRaw];
  let scored = 0;

  for (const tool of selected) {
    // Load scan data
    const scanPath = join(SCANNED_DIR, `${tool.slug}.json`);
    if (!existsSync(scanPath)) continue;

    const scanData: PassiveScanData = JSON.parse(readFileSync(scanPath, 'utf-8'));

    // Load LLM test results if available
    let llmTests: LlmTestResult[] | null = null;
    const testPath = join(OPENROUTER_DIR, `${tool.slug}.json`);
    if (existsSync(testPath)) {
      llmTests = JSON.parse(readFileSync(testPath, 'utf-8'));
    }

    // Apply scan + tests → updated tool (update all entries with this slug)
    const updated = applyPassiveScanToTool(tool, scanData, llmTests);
    const indices = slugToIndices.get(tool.slug) ?? [];
    for (const idx of indices) {
      finalTools[idx] = updated;
    }
    scored++;
  }

  console.log(`  Scored: ${scored} tools\n`);

  // 8. Write outputs
  console.log('--- Writing outputs ---');

  // Validate
  const validated = RegistryFileSchema.parse(finalTools);

  // all_tools.json
  writeFileSync(allToolsPath, JSON.stringify(validated, null, 2));
  console.log(`  Written: ${allToolsPath}`);

  // directory.json
  const directory: DirectoryEntry[] = finalTools.map(t => {
    const assessment = t.assessments['eu-ai-act'];
    return {
      slug: t.slug,
      name: t.name,
      provider: t.provider.name,
      categories: [...t.categories],
      level: t.level,
      risk_level: assessment?.risk_level ?? 'minimal',
      score: assessment?.score ?? null,
      confidence: assessment?.confidence ?? null,
      obligation_count: (assessment?.deployer_obligations.length ?? 0) +
        (assessment?.provider_obligations.length ?? 0),
      seo: t.seo,
    };
  });

  const validatedDir = DirectoryFileSchema.parse(directory);
  writeFileSync(join(REGISTRY_DIR, 'directory.json'), JSON.stringify(validatedDir, null, 2));
  console.log(`  Written: directory.json`);

  // assessments/eu-ai-act/directory.json
  const assessmentDir = finalTools.map(t => ({
    slug: t.slug,
    name: t.name,
    risk_level: t.assessments['eu-ai-act']?.risk_level ?? 'minimal',
    score: t.assessments['eu-ai-act']?.score ?? null,
    confidence: t.assessments['eu-ai-act']?.confidence ?? null,
    obligation_count: (t.assessments['eu-ai-act']?.deployer_obligations.length ?? 0) +
      (t.assessments['eu-ai-act']?.provider_obligations.length ?? 0),
  }));
  writeFileSync(join(ASSESSMENTS_DIR, 'directory.json'), JSON.stringify(assessmentDir, null, 2));
  console.log(`  Written: assessments/eu-ai-act/directory.json`);

  // Summary
  const scannedCount = finalTools.filter(t => t.level === 'scanned').length;
  const withScore = finalTools.filter(t => t.assessments['eu-ai-act']?.score !== null).length;
  const avgScore = finalTools
    .map(t => t.assessments['eu-ai-act']?.score)
    .filter((s): s is number => s !== null && s !== undefined);
  const avg = avgScore.length > 0 ? Math.round(avgScore.reduce((a, b) => a + b, 0) / avgScore.length) : 0;

  console.log(`\n=== Wave 2 Build Complete ===`);
  console.log(`Total tools: ${finalTools.length}`);
  console.log(`Scanned: ${scannedCount}`);
  console.log(`With score: ${withScore}`);
  console.log(`Average score: ${avg}`);
  console.log(`Detection packages checked: ${detectionCount}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
