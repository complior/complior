#!/usr/bin/env tsx
/**
 * Classify newly added tools (level='classified', empty assessments)
 * Uses LLM to determine EU AI Act risk level and applicable obligations
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import PQueue from 'p-queue';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');

// Load .env
function loadEnv(): void {
  const envPath = join(__dirname, '..', '..', '..', '.env');
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
    if (!process.env[key]) process.env[key] = val;
  }
}

interface Tool {
  slug: string;
  name: string;
  description: string;
  categories: string[];
  website: string;
  assessments: any;
}

/**
 * Classify single tool using OpenAI
 */
async function classifyTool(tool: Tool, apiKey: string): Promise<any> {
  const prompt = `You are an EU AI Act compliance expert. Classify this AI tool.

Tool: ${tool.name}
Description: ${tool.description}
Categories: ${tool.categories.join(', ')}
Website: ${tool.website}

Determine:
1. EU AI Act risk level: unacceptable, high, limited, minimal, gpai, or not_ai
2. Risk reasoning (1-2 sentences)
3. Applicable obligation IDs (from: OBL-001, OBL-015, OBL-016, OBL-016a, OBL-017, OBL-018, OBL-022, OBL-023, OBL-024, OBL-025, OBL-CS-001, OBL-CS-002, OBL-CS-003, OBL-CS-004, OBL-CS-005)

Respond in JSON:
{
  "risk_level": "limited",
  "risk_reasoning": "...",
  "applicable_obligation_ids": ["OBL-001", "OBL-015"]
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) throw new Error(`OpenAI API: ${res.status}`);

  const data = await res.json() as any;
  const content = data.choices[0]?.message?.content || '{}';

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  return JSON.parse(jsonMatch[0]);
}

async function main() {
  loadEnv();

  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in .env');
    process.exit(1);
  }

  console.log('=== Classify New Tools ===\n');

  // Load all tools
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  const allTools: Tool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));

  // Filter tools that need classification
  const needsClassification = allTools.filter(t =>
    !t.assessments || Object.keys(t.assessments).length === 0
  );

  console.log(`Total tools: ${allTools.length}`);
  console.log(`Need classification: ${needsClassification.length}\n`);

  if (needsClassification.length === 0) {
    console.log('✅ All tools already classified!');
    return;
  }

  // Classify with rate limiting
  const queue = new PQueue({ concurrency: 10 });
  let classified = 0;
  let failed = 0;

  const promises = needsClassification.map(tool =>
    queue.add(async () => {
      try {
        const assessment = await classifyTool(tool, apiKey);

        // Update tool
        tool.assessments = {
          'eu-ai-act': {
            risk_level: assessment.risk_level,
            risk_reasoning: assessment.risk_reasoning,
            applicable_obligation_ids: assessment.applicable_obligation_ids || [],
            confidence: 'approximate',
            score: null,
          },
        };

        classified++;
        if (classified % 50 === 0) {
          console.log(`  Progress: ${classified}/${needsClassification.length}`);
        }
      } catch (err) {
        console.error(`  ❌ ${tool.slug}: ${err instanceof Error ? err.message : String(err)}`);
        failed++;
      }
    })
  );

  await Promise.all(promises);

  console.log(`\n✅ Classified: ${classified}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);

  // Save
  writeFileSync(allToolsPath, JSON.stringify(allTools, null, 2));
  console.log(`\nSaved to: ${allToolsPath}`);
  console.log(`\nNext: Run Wave 2 enrichment`);
  console.log(`  npx tsx src/domain/registry/build-classified.ts`);
}

main().catch(console.error);
