#!/usr/bin/env tsx
/**
 * Generate comprehensive API JSON for a single tool
 * Combines data from: all_tools.json, human-tests/results.json, obligations.json
 *
 * Usage: npx tsx scripts/generate-tool-api.ts <slug>
 * Example: npx tsx scripts/generate-tool-api.ts chatgpt
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');

interface RegistryTool {
  slug: string;
  name: string;
  provider: { name: string; website: string };
  website: string;
  categories: string[];
  description: string;
  level: string;
  assessments: {
    'eu-ai-act'?: {
      risk_level: string;
      risk_reasoning: string;
      score: number | null;
      confidence: string;
      applicable_obligation_ids: string[];
    };
  };
  evidence?: {
    passive_scan?: any;
    llm_tests?: any;
  };
  seo?: {
    title: string;
    description: string;
    h1: string;
  };
}

interface HumanTestResult {
  slug: string;
  disclosure_visible?: boolean;
  disclosure_text?: string;
  disclosure_location?: string;
  screenshot_path?: string | null;
  opt_out?: any;
  memory?: any;
  notes?: string;
}

interface Obligation {
  obligation_id: string;
  article_reference: string;
  title: string;
  description: string;
  applies_to_role: string;
  severity: string;
  deadline: string;
}

async function generateToolAPI(slug: string) {
  console.log(`Generating API JSON for: ${slug}\n`);

  // Load all_tools.json
  const allTools: RegistryTool[] = JSON.parse(
    readFileSync(join(REGISTRY_DIR, 'all_tools.json'), 'utf-8')
  );

  const tool = allTools.find(t => t.slug === slug);
  if (!tool) {
    console.error(`❌ Tool not found: ${slug}`);
    process.exit(1);
  }

  // Load human test results
  const humanTests: HumanTestResult[] = JSON.parse(
    readFileSync(join(REGISTRY_DIR, 'human-tests', 'results.json'), 'utf-8')
  );
  const humanTest = humanTests.find(h => h.slug === slug);

  // Load obligations
  const obligationsFile = JSON.parse(
    readFileSync(join(DATA_DIR, 'regulations', 'eu-ai-act', 'obligations.json'), 'utf-8')
  );
  const obligations: Obligation[] = obligationsFile.obligations;

  // Build API response
  const assessment = tool.assessments['eu-ai-act'];
  const applicableObligations = assessment?.applicable_obligation_ids || [];

  const apiResponse = {
    api_version: '1.0',
    generated_at: new Date().toISOString(),

    tool: {
      slug: tool.slug,
      name: tool.name,
      tagline: tool.description,
      level: tool.level,

      provider: {
        name: tool.provider.name,
        website: tool.provider.website,
      },

      product: {
        website: tool.website,
        categories: tool.categories,
      },

      usage_metrics: {
        estimated_mau: tool.evidence?.passive_scan?.social?.estimated_mau || null,
        company_size: tool.evidence?.passive_scan?.social?.estimated_company_size || null,
      },

      eu_ai_act_compliance: {
        assessment: {
          risk_level: assessment?.risk_level || 'not_classified',
          reasoning: assessment?.risk_reasoning || '',
          confidence: assessment?.confidence || 'low',
          assessed_at: tool.updated_at,
        },

        compliance_score: {
          total: assessment?.score ?? null,
          max: 100,
          percentage: assessment?.score ?? null,
          grade: getGrade(assessment?.score ?? null),
        },

        applicable_obligations: applicableObligations.map(oblId => {
          const obl = obligations.find(o =>
            o.obligation_id === oblId || o.obligation_id === `eu-ai-act-${oblId}`
          );

          return obl ? {
            id: obl.obligation_id,
            article: obl.article_reference,
            title: obl.title,
            description: obl.description,
            applies_to: obl.applies_to_role,
            severity: obl.severity,
            deadline: obl.deadline,
          } : {
            id: oblId,
            title: oblId,
            note: 'Obligation details not found',
          };
        }),

        obligations_summary: {
          total: applicableObligations.length,
        },
      },

      evidence: {
        disclosure: humanTest ? {
          visible_in_ui: humanTest.disclosure_visible ?? false,
          text: humanTest.disclosure_text || null,
          location: humanTest.disclosure_location || null,
          screenshot: humanTest.screenshot_path || null,
          verified_at: humanTest.tested_at,
        } : null,

        privacy_policy: tool.evidence?.passive_scan?.privacy_policy || null,

        terms_of_service: tool.evidence?.passive_scan?.tos || null,

        content_marking: tool.evidence?.passive_scan?.content_marking || null,

        user_controls: humanTest ? {
          memory: humanTest.memory || null,
          opt_out: humanTest.opt_out || null,
        } : null,

        infrastructure: tool.evidence?.passive_scan?.infra || null,
      },

      compliance_history: {
        gdpr_enforcement: tool.evidence?.passive_scan?.web_search?.gdpr_enforcement_history || [],
        security_incidents: tool.evidence?.passive_scan?.web_search?.security_incidents || [],
        media_coverage: {
          eu_ai_act_mentions: tool.evidence?.passive_scan?.web_search?.eu_ai_act_media_mentions || 0,
        },
      },

      testing_results: {
        llm_tests: tool.evidence?.llm_tests || null,
      },

      resources: {
        official: [
          { type: 'homepage', url: tool.website, label: `${tool.name} Homepage` },
        ],
      },

      seo: tool.seo || {
        meta_title: `${tool.name} — EU AI Act Compliance`,
        meta_description: `${tool.name} by ${tool.provider.name}`,
      },

      last_updated: tool.updated_at,
    },
  };

  // Write to file
  const outputPath = join(REGISTRY_DIR, 'api', `${slug}.json`);
  writeFileSync(outputPath, JSON.stringify(apiResponse, null, 2));

  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   Risk level: ${assessment?.risk_level || 'not_classified'}`);
  console.log(`   Score: ${assessment?.score ?? 'not scored'}/100`);
  console.log(`   Obligations: ${applicableObligations.length}`);
  console.log(`   Evidence: ${humanTest ? 'Human tests ✓' : 'No human tests'}`);
}

function getGrade(score: number | null): string {
  if (score === null) return 'unscored';
  if (score >= 80) return 'compliant';
  if (score >= 60) return 'progressing';
  if (score >= 40) return 'needs_improvement';
  return 'non_compliant';
}

// Main
const slug = process.argv[2];
if (!slug) {
  console.error('Usage: npx tsx scripts/generate-tool-api.ts <slug>');
  console.error('Example: npx tsx scripts/generate-tool-api.ts chatgpt');
  process.exit(1);
}

generateToolAPI(slug).catch(console.error);
