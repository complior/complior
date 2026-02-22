#!/usr/bin/env tsx
/**
 * Scrape AI tools using official APIs
 * - Product Hunt GraphQL API
 * - GitHub Search API
 * - Hugging Face Models API
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

function loadExistingTools(): Set<string> {
  const allToolsPath = join(DATA_DIR, 'all_tools.json');
  if (!existsSync(allToolsPath)) return new Set();
  const tools = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  return new Set(tools.map((t: any) => normalizeUrl(t.website)));
}

function normalizeUrl(url: string): string {
  return url.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

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
 * Hugging Face Models API
 */
async function scrapeHuggingFace(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping Hugging Face Models ===');
  const tools: ScrapedTool[] = [];

  try {
    // Get most downloaded models
    const res = await fetch('https://huggingface.co/api/models?sort=downloads&limit=500', {
      headers: { 'User-Agent': 'CompliorBot/1.0' },
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const models = await res.json() as any[];
    console.log(`  Found ${models.length} models`);

    // Filter for major model types
    const filtered = models.filter(m => {
      const tags = m.tags || [];
      return tags.some((t: string) =>
        ['text-generation', 'text2text-generation', 'image-generation',
         'text-to-image', 'automatic-speech-recognition', 'conversational'].includes(t)
      );
    });

    console.log(`  Filtered to ${filtered.length} AI models`);

    for (const model of filtered.slice(0, 1000)) {
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
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Collected: ${tools.length} models`);
  return tools;
}

/**
 * GitHub AI repositories
 */
async function scrapeGitHub(): Promise<ScrapedTool[]> {
  console.log('\n=== Scraping GitHub AI Projects ===');
  const tools: ScrapedTool[] = [];

  try {
    // Search for AI/ML projects
    const queries = [
      'artificial-intelligence stars:>1000',
      'machine-learning stars:>1000',
      'llm stars:>500',
      'ai-assistant stars:>500',
    ];

    for (const query of queries) {
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
        console.log(`  ⚠️  GitHub API: ${res.status} (rate limited?)`);
        continue;
      }

      const data = await res.json() as any;
      const repos = data.items || [];

      for (const repo of repos) {
        // Only include repos with homepage (indicates it's a product/tool)
        if (!repo.homepage) continue;

        const domain = normalizeUrl(repo.homepage);
        const name = repo.name || extractProvider(domain);

        tools.push({
          slug: generateSlug(name),
          name: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          provider: {
            name: repo.owner?.login || extractProvider(domain),
            website: `https://${domain}`,
          },
          website: `https://${domain}`,
          categories: repo.topics?.slice(0, 5) || ['ai-tool'],
          description: repo.description || `AI tool: ${name}`,
          source: 'github',
          rank_on_source: repo.stargazers_count || 0,
        });
      }

      // Rate limit: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (err) {
    console.error(`  ❌ Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  console.log(`  Collected: ${tools.length} projects`);
  return tools;
}

/**
 * Alternative sources without API - use simple list
 */
async function manualCuration(): Promise<ScrapedTool[]> {
  console.log('\n=== Adding manually curated popular tools ===');

  // Top 100 AI tools that might not be in registry yet
  const popularTools = [
    { name: 'Runway ML', url: 'https://runwayml.com', cat: 'video-generation' },
    { name: 'Descript', url: 'https://descript.com', cat: 'audio-editing' },
    { name: 'Luma AI', url: 'https://lumalabs.ai', cat: '3d-generation' },
    { name: 'Sora', url: 'https://openai.com/sora', cat: 'video-generation' },
    { name: 'Pika', url: 'https://pika.art', cat: 'video-generation' },
    { name: 'Eleven Labs', url: 'https://elevenlabs.io', cat: 'text-to-speech' },
    { name: 'Kling AI', url: 'https://klingai.com', cat: 'video-generation' },
    { name: 'Suno', url: 'https://suno.ai', cat: 'music-generation' },
    { name: 'Udio', url: 'https://udio.com', cat: 'music-generation' },
    { name: 'Synthesia', url: 'https://synthesia.io', cat: 'video-generation' },
    { name: 'HeyGen', url: 'https://heygen.com', cat: 'avatar-generation' },
    { name: 'D-ID', url: 'https://d-id.com', cat: 'video-generation' },
    { name: 'Resemble AI', url: 'https://resemble.ai', cat: 'voice-cloning' },
    { name: 'Murf AI', url: 'https://murf.ai', cat: 'text-to-speech' },
    { name: 'WellSaid Labs', url: 'https://wellsaidlabs.com', cat: 'text-to-speech' },
    { name: 'Pictory', url: 'https://pictory.ai', cat: 'video-generation' },
    { name: 'Fliki', url: 'https://fliki.ai', cat: 'video-generation' },
    { name: 'Loom', url: 'https://loom.com', cat: 'screen-recording' },
    { name: 'Fireflies.ai', url: 'https://fireflies.ai', cat: 'meeting-assistant' },
    { name: 'Otter.ai', url: 'https://otter.ai', cat: 'transcription' },
    { name: 'Fathom', url: 'https://fathom.video', cat: 'meeting-assistant' },
    { name: 'Mem', url: 'https://mem.ai', cat: 'note-taking' },
    { name: 'Reflect', url: 'https://reflect.app', cat: 'note-taking' },
    { name: 'Taskade', url: 'https://taskade.com', cat: 'productivity' },
    { name: 'ClickUp AI', url: 'https://clickup.com', cat: 'project-management' },
    { name: 'Motion', url: 'https://usemotion.com', cat: 'calendar' },
    { name: 'Reclaim AI', url: 'https://reclaim.ai', cat: 'calendar' },
    { name: 'Magical', url: 'https://magical.so', cat: 'automation' },
    { name: 'Bardeen', url: 'https://bardeen.ai', cat: 'automation' },
    { name: 'Browse AI', url: 'https://browse.ai', cat: 'web-scraping' },
    // Add more...
  ];

  const tools: ScrapedTool[] = [];

  for (const item of popularTools) {
    const domain = normalizeUrl(item.url);
    tools.push({
      slug: generateSlug(item.name),
      name: item.name,
      provider: {
        name: extractProvider(domain),
        website: `https://${domain}`,
      },
      website: `https://${domain}`,
      categories: [item.cat],
      description: `AI tool: ${item.name}`,
      source: 'manual-curation',
      rank_on_source: tools.length + 1,
    });
  }

  console.log(`  Added: ${tools.length} curated tools`);
  return tools;
}

/**
 * Main
 */
async function main() {
  console.log('=== AI Tool Scraper (API-based) ===');
  console.log('Target: 3,000+ new tools\n');

  const existingWebsites = loadExistingTools();
  console.log(`Existing tools: ${existingWebsites.size}`);

  // Collect from all sources
  const allTools: ScrapedTool[] = [];

  const hfTools = await scrapeHuggingFace();
  const ghTools = await scrapeGitHub();
  const manualTools = await manualCuration();

  allTools.push(...hfTools, ...ghTools, ...manualTools);

  console.log(`\n=== Deduplication ===`);
  console.log(`Total collected: ${allTools.length}`);

  // Deduplicate
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

  // Save
  writeFileSync(OUTPUT_PATH, JSON.stringify(uniqueTools, null, 2));

  console.log(`\n✅ Saved to: ${OUTPUT_PATH}`);
  console.log(`\nNext: Import into registry`);
  console.log(`  npx tsx scripts/import-scraped-tools.ts`);
}

main().catch(console.error);
