#!/usr/bin/env tsx
/**
 * Scrape AI tool directories to collect 3,000+ new tools
 * Sources: There's An AI For That, Futurepedia
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');
const OUTPUT_PATH = join(DATA_DIR, 'scraped-tools.json');

interface ScrapedTool {
  slug: string;
  name: string;
  provider: { name: string; website: string };
  website: string;
  categories: string[];
  description: string;
  source: string;
  rank_on_source: number;
}

// Load existing tools to avoid duplicates
function loadExistingTools(): Set<string> {
  const allToolsPath = join(DATA_DIR, 'all_tools.json');
  if (!existsSync(allToolsPath)) return new Set();

  const tools = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  return new Set(tools.map((t: any) => t.website.toLowerCase().replace(/\/+$/, '')));
}

// Normalize website URL
function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Extract provider name from domain
function extractProvider(domain: string): string {
  return domain
    .replace(/^www\./, '')
    .replace(/\.(com|io|ai|net|org|co)$/, '')
    .split('.')[0]!
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Scrape There's An AI For That (TAAFT)
 * Strategy: Check for public API or JSON endpoint
 */
async function scrapeTAAFT(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping There\'s An AI For That ===');

  const tools: ScrapedTool[] = [];
  const baseUrl = 'https://theresanaiforthat.com';

  try {
    // Try to find JSON API endpoint
    // Most modern sites have /api/tools or similar
    const apiUrls = [
      `${baseUrl}/api/tools`,
      `${baseUrl}/api/ai-tools`,
      `${baseUrl}/tools.json`,
    ];

    for (const url of apiUrls) {
      try {
        console.log(`  Trying: ${url}`);
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; CompliorBot/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) continue;

        const data = await res.json() as any;
        console.log(`  ✅ Found API endpoint with ${Array.isArray(data) ? data.length : 'unknown'} tools`);

        // Parse response (adapt to actual API structure)
        const items = Array.isArray(data) ? data : data.tools || data.data || [];

        for (const item of items.slice(0, 3000)) {
          const website = item.url || item.website || item.link;
          if (!website) continue;

          const domain = normalizeUrl(website);
          const name = item.name || item.title || extractProvider(domain);

          tools.push({
            slug: generateSlug(name),
            name,
            provider: {
              name: item.company || item.provider || extractProvider(domain),
              website: `https://${domain}`,
            },
            website: `https://${domain}`,
            categories: item.categories || item.tags || ['ai-tool'],
            description: item.description || item.summary || `AI tool: ${name}`,
            source: 'theresanaiforthat',
            rank_on_source: tools.length + 1,
          });
        }

        break;
      } catch (err) {
        continue;
      }
    }

    if (tools.length === 0) {
      console.log('  ⚠️  No API found, trying HTML scraping...');
      // Fallback: scrape homepage
      const res = await fetch(baseUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const html = await res.text();
        // Look for tool links in HTML
        const urlPattern = /https?:\/\/[a-z0-9\-\.]+\.(com|io|ai|net|org)/gi;
        const matches = html.match(urlPattern) || [];
        const uniqueUrls = [...new Set(matches)];

        console.log(`  Found ${uniqueUrls.length} potential tool URLs in HTML`);

        for (const url of uniqueUrls.slice(0, 1000)) {
          const domain = normalizeUrl(url);
          const name = extractProvider(domain);

          tools.push({
            slug: generateSlug(name),
            name,
            provider: { name, website: `https://${domain}` },
            website: `https://${domain}`,
            categories: ['ai-tool'],
            description: `AI tool: ${name}`,
            source: 'theresanaiforthat-html',
            rank_on_source: tools.length + 1,
          });
        }
      }
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Collected: ${tools.length} tools`);
  return tools;
}

/**
 * Scrape Futurepedia
 */
async function scrapeFuturepedia(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping Futurepedia ===');

  const tools: ScrapedTool[] = [];
  const baseUrl = 'https://www.futurepedia.io';

  try {
    const apiUrls = [
      `${baseUrl}/api/tools`,
      `${baseUrl}/api/ai-tools`,
      `${baseUrl}/tools.json`,
    ];

    for (const url of apiUrls) {
      try {
        console.log(`  Trying: ${url}`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) continue;

        const data = await res.json() as any;
        console.log(`  ✅ Found API with data`);

        const items = Array.isArray(data) ? data : data.tools || data.data || [];

        for (const item of items.slice(0, 3000)) {
          const website = item.url || item.website || item.link;
          if (!website) continue;

          const domain = normalizeUrl(website);
          const name = item.name || item.title || extractProvider(domain);

          tools.push({
            slug: generateSlug(name),
            name,
            provider: {
              name: item.company || extractProvider(domain),
              website: `https://${domain}`,
            },
            website: `https://${domain}`,
            categories: item.categories || item.tags || ['ai-tool'],
            description: item.description || `AI tool: ${name}`,
            source: 'futurepedia',
            rank_on_source: tools.length + 1,
          });
        }

        break;
      } catch (err) {
        continue;
      }
    }

    if (tools.length === 0) {
      console.log('  ⚠️  No API found, skipping HTML scraping (too complex)');
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Collected: ${tools.length} tools`);
  return tools;
}

/**
 * Scrape OpenRouter models as tools
 */
async function scrapeOpenRouterModels(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping OpenRouter Models ===');

  const tools: ScrapedTool[] = [];

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as any;
    const models = data.data || [];

    console.log(`  Found ${models.length} models`);

    for (const model of models) {
      const id = model.id || '';
      const parts = id.split('/');
      const provider = parts[0] || 'unknown';
      const modelName = parts[1] || id;

      // Only include major providers
      if (!['openai', 'anthropic', 'google', 'meta', 'mistral', 'cohere'].includes(provider)) {
        continue;
      }

      tools.push({
        slug: generateSlug(`${provider}-${modelName}`),
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} ${modelName}`,
        provider: {
          name: provider.charAt(0).toUpperCase() + provider.slice(1),
          website: `https://${provider}.com`,
        },
        website: `https://${provider}.com`,
        categories: ['language-model', 'api'],
        description: model.description || `LLM: ${modelName}`,
        source: 'openrouter',
        rank_on_source: tools.length + 1,
      });
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Collected: ${tools.length} models as tools`);
  return tools;
}

/**
 * Main
 */
async function main() {
  console.log('=== AI Tool Directory Scraper ===');
  console.log('Target: 3,000-5,000 new tools\n');

  // Load existing tools
  const existingWebsites = loadExistingTools();
  console.log(`Existing tools: ${existingWebsites.size}`);

  // Scrape all sources
  const allTools: ScrapedTool[] = [];

  const taaftTools = await scrapeTAAFT();
  const futurepediaTools = await scrapeFuturepedia();
  const openrouterTools = await scrapeOpenRouterModels();

  allTools.push(...taaftTools, ...futurepediaTools, ...openrouterTools);

  console.log(`\n=== Deduplication ===`);
  console.log(`Total collected: ${allTools.length}`);

  // Deduplicate by website
  const seen = new Set<string>();
  const uniqueTools: ScrapedTool[] = [];

  for (const tool of allTools) {
    const normalized = normalizeUrl(tool.website);

    // Skip if already in registry
    if (existingWebsites.has(normalized)) continue;

    // Skip if duplicate in scraped data
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    uniqueTools.push(tool);
  }

  console.log(`After deduplication: ${uniqueTools.length}`);
  console.log(`New tools (not in registry): ${uniqueTools.length}`);

  // Save results
  writeFileSync(OUTPUT_PATH, JSON.stringify(uniqueTools, null, 2));

  console.log(`\n✅ Saved to: ${OUTPUT_PATH}`);
  console.log(`\nNext step: Run Wave 1 classification`);
  console.log(`  npx tsx scripts/import-scraped-tools.ts`);
}

main().catch(console.error);
