/**
 * Stage 10 — Final Assembly: Build VERIFIED-level tools.
 * Merges data from all stages:
 *   - all_tools.json (classified + scanned)
 *   - scanned/{slug}.json (passive scan evidence)
 *   - openrouter/{slug}.json (LLM test results)
 *   - detection/{slug}.json (npm/PyPI packages)
 *   - media-tests/results.json (image/audio/video metadata tests)
 *   - human-tests/results.json (manual UI + opt-out + memory tests)
 *
 * Promotes Top ~80-100 tools to VERIFIED level with full scoring.
 *
 * Usage: npx tsx engine/src/domain/registry/build-verified.ts [--limit N] [--dry-run]
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreFromObligations, determineConfidence } from './score.js';
import type {
  RegistryTool, PassiveScanData, LlmTestResult, MediaTestResult,
  HumanTestResult, JurisdictionAssessment, ObligationAssessment, DirectoryEntry,
} from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');

// --- Helpers ---

function loadJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function loadJsonDir<T>(dir: string): Map<string, T> {
  const map = new Map<string, T>();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const slug = basename(file, '.json');
    const data = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as T;
    map.set(slug, data);
  }
  return map;
}

// --- Grade from score ---

function gradeFromScore(score: number | null): string {
  if (score === null) return 'unknown';
  if (score >= 80) return 'compliant';
  if (score >= 60) return 'progressing';
  if (score >= 40) return 'needs_improvement';
  return 'non_compliant';
}

// --- Human test → HumanTestResult (typed) ---

interface RawHumanTest {
  slug: string;
  disclosure_visible: boolean;
  disclosure_text: string | null;
  disclosure_location: string | null;
  visible_watermark: boolean | null;
  screenshot_path: string | null;
  tested_at: string;
  opt_out?: {
    exists: boolean;
    path: string | null;
    clicks: number | null;
    default_state: string | null;
  };
  memory?: {
    feature_exists: boolean;
    disableable: boolean | null;
    path: string | null;
  };
  deepfake_test?: {
    politician_portrait_blocked: boolean;
    politician_portrait_notes: string;
    sexualized_content_blocked: boolean;
    sexualized_content_notes: string;
  };
  metadata_test?: {
    c2pa_present: boolean;
    exif_ai_tag: boolean;
    watermark_present: boolean;
  };
  consent_flow?: {
    avatar_consent_required: boolean;
  };
  notes: string;
}

// --- Media test results for specific providers ---

function getMediaTestsForProvider(
  allMedia: readonly MediaTestResult[],
  providerName: string,
): MediaTestResult[] {
  return allMedia.filter(m =>
    m.provider.toLowerCase().includes(providerName.toLowerCase()),
  );
}

// --- Enrich obligations from human tests ---

function enrichObligationsFromHumanTest(
  obligations: readonly ObligationAssessment[],
  human: RawHumanTest,
): ObligationAssessment[] {
  return obligations.map(obl => {
    // OBL-015: AI Disclosure — human-verified UI test
    if (obl.obligation_id === 'OBL-015' && human.disclosure_visible) {
      return {
        ...obl,
        status: 'met' as const,
        evidence_summary: [
          obl.evidence_summary,
          `Human verified: "${human.disclosure_text}" at ${human.disclosure_location}`,
        ].filter(Boolean).join('; '),
      };
    }

    // OBL-011: GDPR / data handling — opt-out info
    if (obl.obligation_id === 'OBL-011' && human.opt_out) {
      const optOutInfo = human.opt_out.exists
        ? `Opt-out exists: ${human.opt_out.path} (${human.opt_out.clicks} clicks, default: ${human.opt_out.default_state})`
        : 'No training opt-out toggle found';
      return {
        ...obl,
        status: human.opt_out.exists ? 'met' as const : obl.status,
        evidence_summary: [obl.evidence_summary, `Human verified: ${optOutInfo}`].filter(Boolean).join('; '),
      };
    }

    // OBL-018: Deep Fake Labeling — deepfake test
    if (obl.obligation_id === 'OBL-018' && human.deepfake_test) {
      const blocked = human.deepfake_test.politician_portrait_blocked;
      return {
        ...obl,
        status: blocked ? 'met' as const : 'not_met' as const,
        evidence_summary: [
          obl.evidence_summary,
          `Human verified: ${human.deepfake_test.politician_portrait_notes}`,
        ].filter(Boolean).join('; '),
      };
    }

    // OBL-016: Content Marking — metadata test from human results
    if (obl.obligation_id === 'OBL-016' && human.metadata_test) {
      const marks = [];
      if (human.metadata_test.c2pa_present) marks.push('C2PA');
      if (human.metadata_test.exif_ai_tag) marks.push('EXIF AI');
      if (human.metadata_test.watermark_present) marks.push('watermark');
      const status = human.metadata_test.c2pa_present
        ? 'met' as const
        : marks.length > 0 ? 'partially_met' as const : obl.status;
      return {
        ...obl,
        status,
        evidence_summary: [
          obl.evidence_summary,
          marks.length > 0 ? `Human verified: ${marks.join(', ')}` : null,
        ].filter(Boolean).join('; '),
      };
    }

    return obl;
  });
}

// --- Build VERIFIED entry ---

function buildVerifiedTool(
  tool: RegistryTool,
  scan: PassiveScanData | null,
  llmTests: readonly LlmTestResult[] | null,
  mediaTests: readonly MediaTestResult[],
  humanTest: RawHumanTest | null,
): RegistryTool {
  const euAssessment = tool.assessments['eu-ai-act'];
  if (!euAssessment) return tool;

  // Start with scan-enriched obligations (may already be done from wave2)
  let deployerObls = [...euAssessment.deployer_obligations];
  let providerObls = [...euAssessment.provider_obligations];

  // Enrich from human test
  if (humanTest) {
    deployerObls = enrichObligationsFromHumanTest(deployerObls, humanTest);
    providerObls = enrichObligationsFromHumanTest(providerObls, humanTest);
  }

  const allObligations = [...deployerObls, ...providerObls];
  const score = scoreFromObligations(allObligations);
  const hasHumanTests = humanTest !== null;
  const hasLlmTests = llmTests !== null && llmTests.length > 0;
  const hasPassiveScan = scan !== null;
  const confidence = determineConfidence(allObligations, hasPassiveScan, hasLlmTests, hasHumanTests);

  // Build human_tests field for RegistryTool
  const humanTestForEvidence: HumanTestResult | null = humanTest
    ? {
        slug: humanTest.slug,
        disclosure_visible: humanTest.disclosure_visible,
        disclosure_text: humanTest.disclosure_text,
        disclosure_location: humanTest.disclosure_location,
        visible_watermark: humanTest.visible_watermark ?? null,
        screenshot_path: humanTest.screenshot_path,
        tested_at: humanTest.tested_at,
      }
    : null;

  const updatedAssessment: JurisdictionAssessment = {
    ...euAssessment,
    deployer_obligations: deployerObls,
    provider_obligations: providerObls,
    score,
    confidence,
    assessed_at: new Date().toISOString(),
  };

  return {
    ...tool,
    level: hasHumanTests ? 'verified' : tool.level,
    evidence: {
      ...tool.evidence,
      passive_scan: scan ?? tool.evidence.passive_scan,
      llm_tests: llmTests ?? tool.evidence.llm_tests,
      media_tests: mediaTests.length > 0 ? mediaTests : tool.evidence.media_tests,
      human_tests: humanTestForEvidence ?? tool.evidence.human_tests,
    },
    assessments: {
      ...tool.assessments,
      'eu-ai-act': updatedAssessment,
    },
    updated_at: new Date().toISOString(),
  };
}

// --- Build directory entry ---

function toDirectoryEntry(tool: RegistryTool): DirectoryEntry {
  const eu = tool.assessments['eu-ai-act'];
  return {
    slug: tool.slug,
    name: tool.name,
    provider: tool.provider.name,
    categories: tool.categories,
    level: tool.level,
    risk_level: eu?.risk_level ?? 'minimal',
    score: eu?.score ?? null,
    confidence: eu?.confidence ?? null,
    obligation_count:
      (eu?.deployer_obligations.length ?? 0) + (eu?.provider_obligations.length ?? 0),
    seo: tool.seo,
  };
}

// --- VERIFIED output format matching the spec ---

interface VerifiedOutput {
  slug: string;
  name: string;
  level: string;
  provider: { name: string; website: string; jurisdiction?: string };
  website: string;
  categories: readonly string[];
  risk_classification: {
    level: string;
    reasoning: string;
    applicable_obligation_ids: readonly string[];
  };
  passive_scan: Record<string, unknown> | null;
  openrouter_test: {
    model: string;
    identity: { admits_ai: boolean; names_provider: boolean; admits_errors: boolean };
    safety: { all_refused: boolean };
    bias: { shows_diversity: boolean; warns_about_bias: boolean };
    factual: { mentions_articles: boolean };
  } | null;
  media_test: { images: readonly { prompt: string; c2pa: boolean; exif_ai_markers: readonly string[] }[] } | null;
  human_test: {
    ui_disclosure: { visible: boolean; text: string | null; prominence: string | null };
    opt_out: { exists: boolean; clicks: number | null; default: string | null } | null;
  } | null;
  obligations: readonly { id: string; title: string; role: string; met: boolean; score: number }[];
  compliance_score: { total: number | null; max: number; grade: string; confidence: string };
  detection: Record<string, unknown> | null;
  seo: { title: string; description?: string };
}

function buildVerifiedOutput(
  tool: RegistryTool,
  llmTests: readonly LlmTestResult[] | null,
  mediaTests: readonly MediaTestResult[],
  humanTest: RawHumanTest | null,
  detection: Record<string, unknown> | null,
): VerifiedOutput {
  const eu = tool.assessments['eu-ai-act'];
  const allObls = [
    ...(eu?.deployer_obligations ?? []),
    ...(eu?.provider_obligations ?? []),
  ];

  // Summarize LLM tests into spec format
  let openrouterTest: VerifiedOutput['openrouter_test'] = null;
  if (llmTests && llmTests.length > 0) {
    const byGroup = new Map<string, LlmTestResult[]>();
    for (const t of llmTests) {
      const arr = byGroup.get(t.group) ?? [];
      arr.push(t);
      byGroup.set(t.group, arr);
    }
    const identityTests = byGroup.get('identity') ?? [];
    const safetyTests = byGroup.get('safety') ?? [];
    const biasTests = byGroup.get('bias') ?? [];
    const factualTests = byGroup.get('factual') ?? [];

    openrouterTest = {
      model: 'openrouter/' + tool.slug,
      identity: {
        admits_ai: identityTests.some(t => t.prompt_id === 'identity-1' && t.passed),
        names_provider: identityTests.some(t => t.prompt_id === 'identity-2' && t.passed),
        admits_errors: identityTests.some(t => t.prompt_id === 'identity-3' && t.passed),
      },
      safety: {
        all_refused: safetyTests.every(t => t.passed),
      },
      bias: {
        shows_diversity: biasTests.some(t => t.prompt_id === 'bias-1' && t.passed),
        warns_about_bias: biasTests.some(t => t.prompt_id === 'bias-2' && t.passed),
      },
      factual: {
        mentions_articles: factualTests.some(t => t.prompt_id === 'factual-1' && t.passed),
      },
    };
  }

  // Media tests
  let mediaTestOutput: VerifiedOutput['media_test'] = null;
  if (mediaTests.length > 0) {
    mediaTestOutput = {
      images: mediaTests
        .filter(m => m.test_type === 'image')
        .map(m => ({
          prompt: m.prompt,
          c2pa: m.c2pa_present,
          exif_ai_markers: m.exif_ai_tag ? ['DigitalSourceType'] : [],
        })),
    };
  }

  // Human test
  let humanTestOutput: VerifiedOutput['human_test'] = null;
  if (humanTest) {
    humanTestOutput = {
      ui_disclosure: {
        visible: humanTest.disclosure_visible,
        text: humanTest.disclosure_text,
        prominence: humanTest.disclosure_location,
      },
      opt_out: humanTest.opt_out
        ? {
            exists: humanTest.opt_out.exists,
            clicks: humanTest.opt_out.clicks,
            default: humanTest.opt_out.default_state,
          }
        : null,
    };
  }

  return {
    slug: tool.slug,
    name: tool.name,
    level: tool.level,
    provider: {
      name: tool.provider.name,
      website: tool.provider.website,
    },
    website: tool.website,
    categories: tool.categories,
    risk_classification: {
      level: eu?.risk_level ?? 'minimal',
      reasoning: eu?.risk_reasoning ?? '',
      applicable_obligation_ids: eu?.applicable_obligation_ids ?? [],
    },
    passive_scan: tool.evidence.passive_scan
      ? {
          homepage: { mentions_ai: tool.evidence.passive_scan.disclosure.visible },
          privacy_policy: {
            mentions_ai: tool.evidence.passive_scan.privacy_policy.mentions_ai,
            mentions_eu: tool.evidence.passive_scan.privacy_policy.mentions_eu,
            training_opt_out: tool.evidence.passive_scan.privacy_policy.training_opt_out,
          },
          model_card: tool.evidence.passive_scan.model_card.has_model_card
            ? {
                exists: true,
                has_limitations: tool.evidence.passive_scan.model_card.has_limitations,
                has_bias_info: tool.evidence.passive_scan.model_card.has_bias_info,
              }
            : { exists: false },
          trust_certifications: tool.evidence.passive_scan.trust.certifications,
          cookie_consent: tool.evidence.passive_scan.infra.has_cookie_consent,
          blocks_ai_crawlers: tool.evidence.passive_scan.infra.blocks_ai_crawlers,
          has_public_api: tool.evidence.passive_scan.infra.has_public_api,
        }
      : null,
    openrouter_test: openrouterTest,
    media_test: mediaTestOutput,
    human_test: humanTestOutput,
    obligations: allObls.map(o => ({
      id: o.obligation_id,
      title: o.title,
      role: o.applies_to_role,
      met: o.status === 'met',
      score: o.status === 'met' ? 10 : o.status === 'partially_met' ? 5 : 0,
    })),
    compliance_score: {
      total: eu?.score ?? null,
      max: 100,
      grade: gradeFromScore(eu?.score ?? null),
      confidence: eu?.confidence ?? 'approximate',
    },
    detection,
    seo: {
      title: tool.seo.title,
      description: tool.seo.description,
    },
  };
}

// --- Main ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit')
    ? parseInt(args[args.indexOf('--limit') + 1]!, 10)
    : Infinity;
  const dryRun = args.includes('--dry-run');

  console.log('=== Stage 10: Build VERIFIED Registry ===\n');

  // 1. Load all tools
  const allToolsPath = join(REGISTRY_DIR, 'all_tools.json');
  const allToolsRaw: RegistryTool[] = JSON.parse(readFileSync(allToolsPath, 'utf-8'));
  console.log(`Loaded ${allToolsRaw.length} tools from all_tools.json`);

  // 2. Load data sources
  const scannedData = loadJsonDir<PassiveScanData>(join(REGISTRY_DIR, 'scanned'));
  console.log(`Loaded ${scannedData.size} scanned results`);

  const openrouterData = loadJsonDir<LlmTestResult[]>(join(REGISTRY_DIR, 'openrouter'));
  console.log(`Loaded ${openrouterData.size} OpenRouter test results`);

  const detectionData = loadJsonDir<Record<string, unknown>>(join(REGISTRY_DIR, 'detection'));
  console.log(`Loaded ${detectionData.size} detection results`);

  const mediaResultsPath = join(REGISTRY_DIR, 'media-tests', 'results.json');
  const allMediaTests: MediaTestResult[] = loadJson<MediaTestResult[]>(mediaResultsPath) ?? [];
  console.log(`Loaded ${allMediaTests.length} media test results`);

  const humanResultsPath = join(REGISTRY_DIR, 'human-tests', 'results.json');
  const allHumanTests: RawHumanTest[] = loadJson<RawHumanTest[]>(humanResultsPath) ?? [];
  const humanTestMap = new Map(allHumanTests.map(h => [h.slug, h]));
  console.log(`Loaded ${allHumanTests.length} human test results`);

  // 3. Build slug→index map (handles potential duplicates)
  const slugToIndices = new Map<string, number[]>();
  for (let i = 0; i < allToolsRaw.length; i++) {
    const slug = allToolsRaw[i]!.slug;
    const arr = slugToIndices.get(slug) ?? [];
    arr.push(i);
    slugToIndices.set(slug, arr);
  }

  // 4. Map media tests to tool slugs
  const providerToSlugs: Record<string, string[]> = {
    'OpenAI DALL-E 3': ['chatgpt', 'dall-e-3', 'gpt-4o', 'gpt-4', 'openai'],
    'Stability AI': ['stable-diffusion', 'stability-ai', 'dreamstudio', 'stablelm', 'stable-video', 'stable-audio'],
    'ElevenLabs': ['elevenlabs'],
    'Midjourney': ['midjourney'],
  };

  // 5. Process tools — enrich with all data sources
  let verifiedCount = 0;
  let scannedCount = 0;
  let processedCount = 0;

  // Collect VERIFIED-level outputs for the spec format
  const verifiedOutputs: VerifiedOutput[] = [];

  for (const [slug, indices] of slugToIndices) {
    if (processedCount >= limit) break;

    const scan = scannedData.get(slug) ?? null;
    const llmTests = openrouterData.get(slug) ?? null;
    const detection = detectionData.get(slug) ?? null;
    const humanTest = humanTestMap.get(slug) ?? null;

    // Collect media tests for this tool's provider
    let toolMediaTests: MediaTestResult[] = [];
    for (const [provider, slugs] of Object.entries(providerToSlugs)) {
      if (slugs.includes(slug)) {
        toolMediaTests = getMediaTestsForProvider(allMediaTests, provider);
        break;
      }
    }

    // Only promote to VERIFIED if we have human test data
    const hasHumanData = humanTest !== null;

    for (const idx of indices) {
      const tool = allToolsRaw[idx]!;
      const enriched = buildVerifiedTool(tool, scan, llmTests, toolMediaTests, humanTest);
      allToolsRaw[idx] = enriched;

      if (enriched.level === 'verified') verifiedCount++;
      else if (enriched.level === 'scanned') scannedCount++;
    }

    // Build spec-format output for VERIFIED tools
    if (hasHumanData && indices.length > 0) {
      const tool = allToolsRaw[indices[0]!]!;
      verifiedOutputs.push(buildVerifiedOutput(tool, llmTests, toolMediaTests, humanTest, detection));
    }

    processedCount++;
  }

  const classifiedCount = allToolsRaw.filter(t => t.level === 'classified').length;

  console.log(`\n=== Results ===`);
  console.log(`VERIFIED: ${verifiedCount}`);
  console.log(`SCANNED: ${scannedCount}`);
  console.log(`CLASSIFIED: ${classifiedCount}`);
  console.log(`Total: ${allToolsRaw.length}`);

  if (dryRun) {
    console.log('\n[DRY RUN] No files written.');
    console.log('\nSample VERIFIED output:');
    if (verifiedOutputs.length > 0) {
      console.log(JSON.stringify(verifiedOutputs[0], null, 2));
    }
    return;
  }

  // 6. Write outputs
  // a) Updated all_tools.json
  writeFileSync(allToolsPath, JSON.stringify(allToolsRaw, null, 2));
  console.log(`\nWritten: ${allToolsPath}`);

  // b) VERIFIED directory (spec format)
  const verifiedDir = join(REGISTRY_DIR, 'verified');
  if (!existsSync(verifiedDir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(verifiedDir, { recursive: true });
  }
  for (const v of verifiedOutputs) {
    const outPath = join(verifiedDir, `${v.slug}.json`);
    writeFileSync(outPath, JSON.stringify(v, null, 2));
  }
  console.log(`Written: ${verifiedOutputs.length} files to ${verifiedDir}/`);

  // c) Directory index
  const directory: DirectoryEntry[] = allToolsRaw.map(toDirectoryEntry);
  const directoryPath = join(REGISTRY_DIR, 'directory.json');
  writeFileSync(directoryPath, JSON.stringify(directory, null, 2));
  console.log(`Written: ${directoryPath}`);

  // d) EU AI Act assessment directory
  const assessmentDir = join(REGISTRY_DIR, 'assessments', 'eu-ai-act');
  if (!existsSync(assessmentDir)) {
    const { mkdirSync } = await import('node:fs');
    mkdirSync(assessmentDir, { recursive: true });
  }
  const assessmentDirectory = allToolsRaw
    .filter(t => t.assessments['eu-ai-act'])
    .map(t => ({
      slug: t.slug,
      name: t.name,
      level: t.level,
      risk_level: t.assessments['eu-ai-act']!.risk_level,
      score: t.assessments['eu-ai-act']!.score,
      confidence: t.assessments['eu-ai-act']!.confidence,
    }));
  const assessmentDirPath = join(assessmentDir, 'directory.json');
  writeFileSync(assessmentDirPath, JSON.stringify(assessmentDirectory, null, 2));
  console.log(`Written: ${assessmentDirPath}`);

  // e) Summary statistics
  const stats = {
    total_tools: allToolsRaw.length,
    verified: verifiedCount,
    scanned: scannedCount,
    classified: classifiedCount,
    media_tests: allMediaTests.length,
    human_tests: allHumanTests.length,
    openrouter_models_tested: openrouterData.size,
    detection_packages: detectionData.size,
    passive_scans: scannedData.size,
    built_at: new Date().toISOString(),
    score_distribution: {
      compliant: allToolsRaw.filter(t => {
        const s = t.assessments['eu-ai-act']?.score;
        return s !== null && s !== undefined && s >= 80;
      }).length,
      progressing: allToolsRaw.filter(t => {
        const s = t.assessments['eu-ai-act']?.score;
        return s !== null && s !== undefined && s >= 60 && s < 80;
      }).length,
      needs_improvement: allToolsRaw.filter(t => {
        const s = t.assessments['eu-ai-act']?.score;
        return s !== null && s !== undefined && s >= 40 && s < 60;
      }).length,
      non_compliant: allToolsRaw.filter(t => {
        const s = t.assessments['eu-ai-act']?.score;
        return s !== null && s !== undefined && s < 40;
      }).length,
      unscored: allToolsRaw.filter(t => {
        const s = t.assessments['eu-ai-act']?.score;
        return s === null || s === undefined;
      }).length,
    },
  };
  const statsPath = join(REGISTRY_DIR, 'stats.json');
  writeFileSync(statsPath, JSON.stringify(stats, null, 2));
  console.log(`Written: ${statsPath}`);

  console.log('\n=== Stage 10 Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
