/**
 * Regex pattern matchers → evidence fields.
 * Each parser takes fetched page text and returns a typed evidence sub-object.
 */

import type {
  DisclosureEvidence,
  PrivacyPolicyEvidence,
  TosEvidence,
  TrustEvidence,
  ModelCardEvidence,
  ContentMarkingEvidence,
  InfraEvidence,
  SocialEvidence,
  WebSearchEvidence,
} from '../types.js';
import type { FetchedPages } from './fetcher.js';

// --- Helpers ---

function has(text: string | null | undefined, pattern: RegExp): boolean {
  return text != null && pattern.test(text);
}

function findAll(text: string, pattern: RegExp): string[] {
  const matches: string[] = [];
  let m: RegExpExecArray | null;
  const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  while ((m = global.exec(text)) !== null) {
    matches.push(m[0]);
  }
  return matches;
}

// --- Disclosure ---

const AI_PATTERNS = [
  /\bai[- ]powered\b/i,
  /\bartificial intelligence\b/i,
  /\bmachine learning\b/i,
  /\bgenerat(?:ed|ive)\s+ai\b/i,
  /\blarge language model\b/i,
  /\bllm\b/i,
  /\bneural network\b/i,
  /\bdeep learning\b/i,
  /\bpowered by ai\b/i,
  /\bai assistant\b/i,
  /\bai chatbot\b/i,
];

export function parseDisclosure(pages: FetchedPages): DisclosureEvidence {
  const homepage = pages.homepage?.text ?? '';

  for (const pattern of AI_PATTERNS) {
    const match = pattern.exec(homepage);
    if (match) {
      // Determine location heuristically
      const pos = match.index / homepage.length;
      const location = pos < 0.2 ? 'hero' : pos < 0.5 ? 'description' : 'footer';
      const start = Math.max(0, match.index - 40);
      const end = Math.min(homepage.length, match.index + match[0].length + 40);
      const snippet = homepage.slice(start, end).trim();

      return {
        visible: true,
        text: snippet,
        location: location as DisclosureEvidence['location'],
      };
    }
  }

  // Check meta tags in raw HTML
  const raw = pages.homepage?.raw ?? '';
  if (has(raw, /<meta[^>]*(?:ai|artificial.intelligence|machine.learning)[^>]*>/i)) {
    return { visible: true, text: null, location: 'meta' };
  }

  return { visible: false, text: null, location: 'none' };
}

// --- Privacy Policy ---

export function parsePrivacyPolicy(pages: FetchedPages): PrivacyPolicyEvidence {
  const text = pages.privacy?.text ?? '';

  if (!text) {
    return {
      mentions_ai: false,
      mentions_eu: false,
      gdpr_compliant: false,
      uses_data_for_training: false,
      training_opt_out: false,
      opt_out_mechanism: 'none',
      retention_specified: false,
      retention_period: null,
      deletion_right: false,
      last_updated: null,
    };
  }

  const mentionsAi = AI_PATTERNS.some(p => p.test(text));
  const mentionsEu = has(text, /\b(?:eu|european union|eea|gdpr|general data protection)\b/i);
  const gdprCompliant = has(text, /\bgdpr\b/i) && has(text, /\bcomplian(?:t|ce)\b/i);
  const usesDataForTraining = has(text, /\b(?:train(?:ing)?|improv(?:e|ing))\s+(?:our|the)?\s*(?:model|ai|service|algorithm)/i);
  const trainingOptOut = has(text, /\bopt[- ]?out\b/i) && (mentionsAi || usesDataForTraining);

  let optOutMechanism: PrivacyPolicyEvidence['opt_out_mechanism'] = 'none';
  if (trainingOptOut) {
    if (has(text, /\bsetting/i)) optOutMechanism = 'settings';
    else if (has(text, /\bemail\b/i)) optOutMechanism = 'email';
    else if (has(text, /\bform\b/i) || has(text, /\brequest\b/i)) optOutMechanism = 'form';
  }

  const retentionSpecified = has(text, /\bretention\b/i) || has(text, /\bretain(?:ed)?\b/i);
  let retentionPeriod: string | null = null;
  const retMatch = /\bretain(?:ed)?.*?(\d+\s*(?:days?|months?|years?))/i.exec(text)
    ?? /\bretention.*?(\d+\s*(?:days?|months?|years?))/i.exec(text);
  if (retMatch) retentionPeriod = retMatch[1]!;

  const deletionRight = has(text, /\b(?:right to (?:delet|eras)|delete your|erasure)\b/i);

  // Extract last-updated date
  let lastUpdated: string | null = null;
  const dateMatch = /(?:last (?:updated|modified|revised)|effective[: ]*date)[:\s]*([A-Za-z]+\s+\d{1,2},?\s*\d{4}|\d{4}-\d{2}-\d{2})/i.exec(text);
  if (dateMatch) lastUpdated = dateMatch[1]!.trim();

  return {
    mentions_ai: mentionsAi,
    mentions_eu: mentionsEu,
    gdpr_compliant: gdprCompliant,
    uses_data_for_training: usesDataForTraining,
    training_opt_out: trainingOptOut,
    opt_out_mechanism: optOutMechanism,
    retention_specified: retentionSpecified,
    retention_period: retentionPeriod,
    deletion_right: deletionRight,
    last_updated: lastUpdated,
  };
}

// --- Terms of Service ---

export function parseTos(pages: FetchedPages): TosEvidence {
  const text = pages.terms?.text ?? '';

  if (!text) {
    return { ai_disclaimer: false, prohibited_uses: false, prohibited_list: [], liability_disclaimer: false };
  }

  const aiDisclaimer = has(text, /\b(?:ai|artificial intelligence|automated)\b/i) &&
    has(text, /\b(?:disclaimer|not guarantee|no warranty|as[- ]is)\b/i);

  const prohibitedUses = has(text, /\bprohibited\b/i) || has(text, /\brestricted use/i) || has(text, /\bmay not\b/i);

  const PROHIBITED_PATTERNS = [
    /\billegal\b/i, /\bharmful\b/i, /\bviolent\b/i, /\bharassment\b/i,
    /\bhate speech\b/i, /\bmisinformation\b/i, /\bfraud\b/i,
    /\bmalware\b/i, /\bweapon/i, /\bchild\s+(?:abuse|exploitation)\b/i,
  ];
  const prohibitedList = PROHIBITED_PATTERNS
    .filter(p => p.test(text))
    .map(p => {
      const m = p.exec(text);
      return m ? m[0].toLowerCase() : '';
    })
    .filter(Boolean);

  const liabilityDisclaimer = has(text, /\bliabilit(?:y|ies)\b/i) &&
    has(text, /\b(?:limit|disclaim|exclud|waiv)/i);

  return { ai_disclaimer: aiDisclaimer, prohibited_uses: prohibitedUses, prohibited_list: prohibitedList, liability_disclaimer: liabilityDisclaimer };
}

// --- Trust / Security ---

const CERT_PATTERNS: readonly [RegExp, string][] = [
  [/\bsoc\s*2\b/i, 'SOC2'],
  [/\biso\s*27001\b/i, 'ISO27001'],
  [/\biso\s*42001\b/i, 'ISO42001'],
  [/\biso\s*27701\b/i, 'ISO27701'],
  [/\bhipaa\b/i, 'HIPAA'],
  [/\bfedramp\b/i, 'FedRAMP'],
  [/\bpci[- ]dss\b/i, 'PCI-DSS'],
  [/\bcsa\s*star\b/i, 'CSA-STAR'],
];

export function parseTrust(pages: FetchedPages): TrustEvidence {
  const trustText = pages.trust?.text ?? '';
  const complianceText = pages.compliance?.text ?? '';
  const combined = `${trustText} ${complianceText}`;

  const certifications = CERT_PATTERNS
    .filter(([pattern]) => pattern.test(combined))
    .map(([, name]) => name);

  const mentionsAiAct = has(combined, /\b(?:eu\s+)?ai\s+act\b/i) ||
    has(combined, /\bartificial intelligence act\b/i) ||
    has(combined, /\bregulation.*2024\/1689\b/i);

  const hasResponsibleAiPage = pages.responsibleAi !== null;

  const responsibleAiTopics: string[] = [];
  const raiText = pages.responsibleAi?.text ?? '';
  if (has(raiText, /\bfairness\b/i)) responsibleAiTopics.push('fairness');
  if (has(raiText, /\btransparenc/i)) responsibleAiTopics.push('transparency');
  if (has(raiText, /\baccountabilit/i)) responsibleAiTopics.push('accountability');
  if (has(raiText, /\bsafety\b/i)) responsibleAiTopics.push('safety');
  if (has(raiText, /\bprivacy\b/i)) responsibleAiTopics.push('privacy');
  if (has(raiText, /\bbias\b/i)) responsibleAiTopics.push('bias');

  const hasEuAiActPage = pages.compliance !== null && mentionsAiAct;

  return {
    certifications,
    mentions_ai_act: mentionsAiAct,
    has_responsible_ai_page: hasResponsibleAiPage,
    responsible_ai_topics: responsibleAiTopics,
    has_eu_ai_act_page: hasEuAiActPage,
  };
}

// --- Model Card ---

export function parseModelCard(pages: FetchedPages): ModelCardEvidence {
  const raw = pages.homepage?.raw ?? '';
  const text = pages.homepage?.text ?? '';
  const aboutText = pages.about?.text ?? '';
  const combined = `${text} ${aboutText}`;

  // Check for model card links in raw HTML
  const modelCardLink = /href=["']([^"']*model[- _]?card[^"']*)/i.exec(raw);
  const hasModelCard = modelCardLink !== null ||
    has(combined, /\bmodel\s+card\b/i) ||
    has(combined, /\bsystem\s+card\b/i);

  let modelCardUrl: string | null = null;
  if (modelCardLink) {
    const href = modelCardLink[1]!;
    modelCardUrl = href.startsWith('http') ? href : null;
  }

  return {
    has_model_card: hasModelCard,
    model_card_url: modelCardUrl,
    has_limitations: has(combined, /\blimitation/i),
    has_bias_info: has(combined, /\bbias\b/i),
    has_training_data: has(combined, /\btraining\s+data\b/i),
    has_evaluation: has(combined, /\bevaluation\b/i) || has(combined, /\bbenchmark\b/i),
  };
}

// --- Content Marking ---

export function parseContentMarking(pages: FetchedPages): ContentMarkingEvidence {
  const allText = [
    pages.homepage?.text,
    pages.trust?.text,
    pages.responsibleAi?.text,
    pages.about?.text,
  ].filter(Boolean).join(' ');

  return {
    c2pa: has(allText, /\bc2pa\b/i) || has(allText, /\bcontent\s+credentials\b/i) || has(allText, /\bcontent\s+authenticity\b/i),
    watermark: has(allText, /\bwatermark/i) || has(allText, /\bsynthid\b/i),
    exif_ai_tag: has(allText, /\bexif\b/i) || has(allText, /\biptc\b/i) || has(allText, /\bmetadata.*ai\b/i),
  };
}

// --- Infra ---

const AI_BOTS = ['GPTBot', 'ChatGPT-User', 'CCBot', 'Google-Extended', 'anthropic-ai', 'ClaudeBot', 'Bytespider'];

export function parseInfra(pages: FetchedPages): InfraEvidence {
  const robotsText = pages.robots?.text ?? '';
  const homepageRaw = pages.homepage?.raw ?? '';

  const blockedBots = AI_BOTS.filter(bot =>
    has(robotsText, new RegExp(`User-agent:\\s*${bot}[\\s\\S]*?Disallow:\\s*/`, 'i')),
  );

  const hasCookieConsent = has(homepageRaw, /\bcookie(?:bot|consent|yes|law|pro|notice)\b/i) ||
    has(homepageRaw, /\bonetrust\b/i) ||
    has(homepageRaw, /\bquantcast\b/i) ||
    has(homepageRaw, /\btrust(?:arc|e)\b/i);

  let consentPlatform: string | null = null;
  if (has(homepageRaw, /\bcookiebot\b/i)) consentPlatform = 'Cookiebot';
  else if (has(homepageRaw, /\bonetrust\b/i)) consentPlatform = 'OneTrust';
  else if (has(homepageRaw, /\bquantcast\b/i)) consentPlatform = 'Quantcast';
  else if (has(homepageRaw, /\btrust(?:arc|e)\b/i)) consentPlatform = 'TrustArc';
  else if (hasCookieConsent) consentPlatform = 'unknown';

  const allText = [pages.homepage?.text, pages.about?.text].filter(Boolean).join(' ');

  return {
    blocks_ai_crawlers: blockedBots.length > 0,
    blocked_bots: blockedBots,
    has_cookie_consent: hasCookieConsent,
    consent_platform: consentPlatform,
    has_public_api: has(allText, /\bapi\b/i) && (has(allText, /\bdocumentation\b/i) || has(allText, /\bdeveloper/i)),
    has_pricing_page: has(pages.homepage?.raw ?? '', /href=["'][^"']*pric/i),
    offers_free_tier: has(allText, /\bfree\s+(?:tier|plan|trial)\b/i) || has(allText, /\bfreemium\b/i),
    has_ai_plugin: pages.aiPlugin !== null,
  };
}

// --- Social (static company size map, no API calls) ---

const COMPANY_SIZE_MAP: Record<string, SocialEvidence['estimated_company_size']> = {
  openai: 'enterprise',
  google: 'enterprise',
  microsoft: 'enterprise',
  meta: 'enterprise',
  amazon: 'enterprise',
  apple: 'enterprise',
  nvidia: 'enterprise',
  ibm: 'enterprise',
  salesforce: 'enterprise',
  adobe: 'enterprise',
  anthropic: 'midsize',
  mistral: 'midsize',
  cohere: 'midsize',
  stability: 'midsize',
  'stability-ai': 'midsize',
  midjourney: 'midsize',
  inflection: 'midsize',
  xai: 'midsize',
  deepseek: 'midsize',
  perplexity: 'midsize',
  jasper: 'midsize',
  grammarly: 'midsize',
  runway: 'midsize',
  huggingface: 'midsize',
  'hugging face': 'midsize',
  notion: 'midsize',
  canva: 'midsize',
  figma: 'midsize',
};

export interface SocialOverrides {
  readonly estimated_mau?: number | null;
  readonly github_stars?: number | null;
  readonly github_last_commit?: string | null;
}

export function parseSocial(providerName: string, overrides?: SocialOverrides): SocialEvidence {
  const key = providerName.toLowerCase().replace(/\s+/g, '-');
  const size = COMPANY_SIZE_MAP[key] ?? null;

  return {
    estimated_mau: overrides?.estimated_mau ?? null,
    estimated_company_size: size,
    github_stars: overrides?.github_stars ?? null,
    github_last_commit: overrides?.github_last_commit ?? null,
  };
}

// --- Web Search (accepts real data or returns defaults) ---

export interface WebSearchOverrides {
  readonly eu_ai_act_media_mentions?: number;
  readonly has_public_bias_audit?: boolean;
  readonly bias_audit_url?: string | null;
  readonly gdpr_enforcement_history?: readonly string[];
  readonly security_incidents?: readonly string[];
  readonly has_transparency_report?: boolean;
}

export function parseWebSearch(overrides?: WebSearchOverrides): WebSearchEvidence {
  return {
    eu_ai_act_media_mentions: overrides?.eu_ai_act_media_mentions ?? 0,
    has_public_bias_audit: overrides?.has_public_bias_audit ?? false,
    bias_audit_url: overrides?.bias_audit_url ?? null,
    gdpr_enforcement_history: overrides?.gdpr_enforcement_history ? [...overrides.gdpr_enforcement_history] : [],
    security_incidents: overrides?.security_incidents ? [...overrides.security_incidents] : [],
    has_transparency_report: overrides?.has_transparency_report ?? false,
  };
}

export { findAll };
