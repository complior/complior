#!/usr/bin/env tsx
/**
 * Massive AI tool scraping - target 2,500+ new tools
 * Focus on Hugging Face models (they have the most tools)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data', 'registry');

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

function normalizeUrl(url: string): string {
  return url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function loadExistingTools(): Set<string> {
  const allToolsPath = join(DATA_DIR, 'all_tools.json');
  if (!existsSync(allToolsPath)) return new Set();
  const tools = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  return new Set(tools.map((t: any) => normalizeUrl(t.website)));
}

/**
 * Scrape Hugging Face - get TOP 2000 models
 */
async function scrapeHuggingFaceMassive(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping Hugging Face (2000 models) ===');
  const tools: ScrapedTool[] = [];

  try {
    // Fetch in batches of 500
    for (let offset = 0; offset < 2000; offset += 500) {
      console.log(`  Fetching models ${offset}-${offset + 500}...`);

      const res = await fetch(
        `https://huggingface.co/api/models?sort=downloads&limit=500&skip=${offset}`,
        {
          headers: { 'User-Agent': 'CompliorBot/1.0' },
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!res.ok) {
        console.log(`  ⚠️  HTTP ${res.status}, stopping`);
        break;
      }

      const models = await res.json() as any[];
      console.log(`    Got ${models.length} models`);

      for (const model of models) {
        const modelId = model.id || model.modelId;
        const [author, ...nameParts] = modelId.split('/');
        const modelName = nameParts.join('/') || author;

        tools.push({
          slug: generateSlug(modelId),
          name: modelName,
          provider: {
            name: author || 'Hugging Face',
            website: `https://huggingface.co/${author}`,
          },
          website: `https://huggingface.co/${modelId}`,
          categories: model.tags?.slice(0, 5) || ['language-model'],
          description: model.description || `AI model: ${modelName}`,
          source: 'huggingface',
          rank_on_source: model.downloads || tools.length + 1,
        });
      }

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Total collected: ${tools.length} models`);
  return tools;
}

/**
 * Scrape GitHub with more queries
 */
async function scrapeGitHubMassive(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping GitHub AI Projects (expanded) ===');
  const tools: ScrapedTool[] = [];

  const queries = [
    'artificial-intelligence stars:>500',
    'machine-learning stars:>500',
    'llm stars:>100',
    'ai-assistant stars:>100',
    'chatbot stars:>100',
    'text-generation stars:>100',
    'image-generation stars:>100',
    'voice-assistant stars:>50',
    'ai-agent stars:>50',
    'langchain stars:>50',
  ];

  for (const query of queries) {
    try {
      console.log(`  Query: ${query}`);
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&per_page=100`,
        {
          headers: {
            'User-Agent': 'CompliorBot/1.0',
            'Accept': 'application/vnd.github+json',
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) {
        console.log(`    ⚠️  HTTP ${res.status}`);
        continue;
      }

      const data = await res.json() as any;
      const repos = data.items || [];
      console.log(`    Found ${repos.length} repos`);

      for (const repo of repos) {
        if (!repo.homepage) continue;

        const domain = normalizeUrl(repo.homepage);
        const name = repo.name;

        tools.push({
          slug: generateSlug(name),
          name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          provider: {
            name: repo.owner?.login || name,
            website: `https://${domain}`,
          },
          website: `https://${domain}`,
          categories: repo.topics?.slice(0, 5) || ['ai-tool'],
          description: repo.description || `AI tool: ${name}`,
          source: 'github',
          rank_on_source: repo.stargazers_count || 0,
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log(`    ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`  Total collected: ${tools.length} projects`);
  return tools;
}

async function main() {
  console.log('=== Massive AI Tool Scraper ===');
  console.log('Target: 2,500+ new tools\n');

  const existingWebsites = loadExistingTools();
  console.log(`Existing tools: ${existingWebsites.size}`);

  // Load previously scraped
  const scrapedPath = join(DATA_DIR, 'scraped-tools.json');
  let previouslyScraped: ScrapedTool[] = [];
  if (existsSync(scrapedPath)) {
    previouslyScraped = JSON.parse(readFileSync(scrapedPath, 'utf-8'));
    console.log(`Previously scraped: ${previouslyScraped.length}\n`);
  }

  // Scrape
  const hfTools = await scrapeHuggingFaceMassive();
  const ghTools = await scrapeGitHubMassive();

  const allTools = [...previouslyScraped, ...hfTools, ...ghTools];

  console.log(`\n=== Deduplication ===`);
  console.log(`Total collected: ${allTools.length}`);

  const seen = new Set<string>();
  const uniqueTools: ScrapedTool[] = [];

  for (const tool of allTools) {
    const normalized = normalizeUrl(tool.website);
    if (existingWebsites.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    uniqueTools.push(tool);
  }

  console.log(`After deduplication: ${uniqueTools.length}`);

  writeFileSync(scrapedPath, JSON.stringify(uniqueTools, null, 2));

  console.log(`\n✅ Saved to: ${scrapedPath}`);
  console.log(`\nTotal new tools: ${uniqueTools.length}`);
  console.log(`Expected registry size: ${existingWebsites.size + uniqueTools.length}`);
}

main().catch(console.error);
