#!/usr/bin/env tsx
/**
 * Run detection (npm/PyPI) for all SCANNED tools
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PQueue from 'p-queue';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');
const DETECTION_DIR = join(REGISTRY_DIR, 'detection');

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
  name: string;
  registry: 'npm' | 'pypi';
  exists: boolean;
  weekly_downloads: number | null;
  version: string | null;
}

async function checkNpmPackage(name: string): Promise<PackageInfo> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${name}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { name, registry: 'npm', exists: false, weekly_downloads: null, version: null };
    const json = await res.json() as any;
    const version = json['dist-tags']?.['latest'] ?? null;
    return { name, registry: 'npm', exists: true, weekly_downloads: null, version };
  } catch {
    return { name, registry: 'npm', exists: false, weekly_downloads: null, version: null };
  }
}

async function checkPypiPackage(name: string): Promise<PackageInfo> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${name}/json`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { name, registry: 'pypi', exists: false, weekly_downloads: null, version: null };
    const json = await res.json() as any;
    const version = json.info?.version ?? null;
    return { name, registry: 'pypi', exists: true, weekly_downloads: null, version };
  } catch {
    return { name, registry: 'pypi', exists: false, weekly_downloads: null, version: null };
  }
}

async function main() {
  console.log('=== Running Detection for all SCANNED tools ===\n');

  mkdirSync(DETECTION_DIR, { recursive: true });

  const allTools = JSON.parse(readFileSync(join(REGISTRY_DIR, 'all_tools.json'), 'utf-8'));
  const scanned = allTools.filter((t: any) => t.level === 'scanned');

  console.log(`SCANNED tools: ${scanned.length}`);
  console.log(`Checking npm and PyPI registries...\n`);

  const queue = new PQueue({ concurrency: 10 });
  let count = 0;
  let skipped = 0;

  await Promise.all(scanned.map((tool: any) =>
    queue.add(async () => {
      try {
        const outPath = join(DETECTION_DIR, `${tool.slug}.json`);
        if (existsSync(outPath)) {
          skipped++;
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

        const filtered = packages.filter(p => p.exists);
        if (filtered.length === 0) return;

        writeFileSync(outPath, JSON.stringify({
          slug: tool.slug,
          provider: tool.provider.name,
          packages: filtered,
          saas_domains: [new URL(tool.website).hostname],
        }, null, 2));

        count++;
        if (count % 50 === 0) {
          console.log(`  Progress: ${count}/${scanned.length - skipped}`);
        }
      } catch (err) {
        // Silently skip errors
      }
    })
  ));

  console.log(`\n✅ Detection complete: ${count} checked, ${skipped} skipped`);
}

main().catch(console.error);
