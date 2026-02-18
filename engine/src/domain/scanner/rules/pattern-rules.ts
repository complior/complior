export type PatternCategory =
  | 'bare-llm'
  | 'disclosure'
  | 'human-oversight'
  | 'kill-switch'
  | 'content-marking'
  | 'logging';

export type PatternType = 'positive' | 'negative';

export interface PatternRule {
  readonly category: PatternCategory;
  readonly patternType: PatternType;
  readonly regex: RegExp;
  readonly label: string;
  readonly obligationId: string;
  readonly article: string;
  readonly recommendation: string;
}

export const PATTERN_RULES: readonly PatternRule[] = [
  // --- Bare LLM Calls (negative: presence = bad) ---
  {
    category: 'bare-llm',
    patternType: 'negative',
    regex: /openai\.chat\.completions\.create\(/g,
    label: 'OpenAI bare API call',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Wrap LLM calls with complior.wrap() or add AI disclosure',
  },
  {
    category: 'bare-llm',
    patternType: 'negative',
    regex: /anthropic\.messages\.create\(/g,
    label: 'Anthropic bare API call',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Wrap LLM calls with complior.wrap() or add AI disclosure',
  },
  {
    category: 'bare-llm',
    patternType: 'negative',
    regex: /google\.generativeai/gi,
    label: 'Google Generative AI usage',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Wrap LLM calls with complior.wrap() or add AI disclosure',
  },
  {
    category: 'bare-llm',
    patternType: 'negative',
    regex: /cohere\.chat\(/g,
    label: 'Cohere bare API call',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Wrap LLM calls with complior.wrap() or add AI disclosure',
  },
  {
    category: 'bare-llm',
    patternType: 'negative',
    regex: /mistral\.chat\.complete\(/g,
    label: 'Mistral bare API call',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Wrap LLM calls with complior.wrap() or add AI disclosure',
  },

  // --- Disclosure (positive: presence = good) ---
  {
    category: 'disclosure',
    patternType: 'positive',
    regex: /AIDisclosure|ai-disclosure|ai_disclosure/gi,
    label: 'AI disclosure component/attribute',
    obligationId: 'eu-ai-act-OBL-015',
    article: 'Art. 50(1)',
    recommendation: 'Add AI disclosure notice to user-facing interfaces',
  },

  // --- Human Oversight (positive: presence = good) ---
  {
    category: 'human-oversight',
    patternType: 'positive',
    regex: /humanReview|human_review|manual_approval|human[_-]?oversight|require[_-]?approval/gi,
    label: 'Human oversight mechanism',
    obligationId: 'eu-ai-act-OBL-010',
    article: 'Art. 14',
    recommendation: 'Implement human oversight for AI decisions (Art. 14)',
  },

  // --- Kill Switch (positive: presence = good) ---
  {
    category: 'kill-switch',
    patternType: 'positive',
    regex: /AI_ENABLED|DISABLE_AI|ai\.enabled|killSwitch|kill[_-]?switch|feature[_-]?flag.*ai/gi,
    label: 'AI kill switch / feature flag',
    obligationId: 'eu-ai-act-OBL-010',
    article: 'Art. 14',
    recommendation: 'Add an AI kill switch or feature flag to disable AI functionality',
  },

  // --- Content Marking (positive: presence = good) ---
  {
    category: 'content-marking',
    patternType: 'positive',
    regex: /ai-generated|generated-by-ai|AIGenerated|ai_generated|c2pa|content[_-]?credentials/gi,
    label: 'AI content marking / watermarking',
    obligationId: 'eu-ai-act-OBL-016',
    article: 'Art. 50(2)',
    recommendation: 'Mark AI-generated content with appropriate labels or C2PA metadata',
  },

  // --- Logging (positive: presence = good) ---
  {
    category: 'logging',
    patternType: 'positive',
    regex: /logAiCall|aiLogger|compliance\.log|auditLog|audit[_-]?log|ai[_-]?audit/gi,
    label: 'AI interaction logging',
    obligationId: 'eu-ai-act-OBL-006',
    article: 'Art. 12',
    recommendation: 'Add structured logging for AI interactions (Art. 12)',
  },
];

export const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.vue', '.html',
]);

export const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'dist', '.git', 'vendor', 'build', '__pycache__',
  '.next', 'coverage', '.cache', '.output',
]);
