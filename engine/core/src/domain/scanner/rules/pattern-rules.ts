export type PatternCategory =
  | 'bare-llm'
  | 'disclosure'
  | 'human-oversight'
  | 'kill-switch'
  | 'content-marking'
  | 'logging'
  | 'data-governance'
  | 'record-keeping'
  | 'accuracy-robustness'
  | 'cybersecurity'
  | 'deployer-monitoring'
  | 'gpai-transparency'
  | 'conformity-assessment'
  | 'security-risk';

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

  // --- Data Governance (Art. 10) ---
  {
    category: 'data-governance',
    patternType: 'positive',
    regex: /data[_-]?validat(ion|e|or)|validateData|DataValidator|data[_-]?quality/gi,
    label: 'Data validation / quality check',
    obligationId: 'eu-ai-act-OBL-003',
    article: 'Art. 10',
    recommendation: 'Implement data validation and quality checks for training data (Art. 10)',
  },
  {
    category: 'data-governance',
    patternType: 'positive',
    regex: /training[_-]?data[_-]?quality|data[_-]?lineage|DataLineage|data[_-]?provenance/gi,
    label: 'Training data lineage / provenance',
    obligationId: 'eu-ai-act-OBL-004',
    article: 'Art. 10',
    recommendation: 'Track training data provenance and lineage (Art. 10)',
  },
  {
    category: 'data-governance',
    patternType: 'positive',
    regex: /consent[_-]?manag|userConsent|data[_-]?consent|gdpr[_-]?consent/gi,
    label: 'Data consent management',
    obligationId: 'eu-ai-act-OBL-003',
    article: 'Art. 10',
    recommendation: 'Implement consent management for personal data used in AI systems (Art. 10)',
  },

  // --- Record-Keeping (Art. 12) ---
  {
    category: 'record-keeping',
    patternType: 'positive',
    regex: /audit[_-]?trail|AuditTrail|event[_-]?log[_-]?persist|persistAudit/gi,
    label: 'Audit trail / persistent event logging',
    obligationId: 'eu-ai-act-OBL-013',
    article: 'Art. 12',
    recommendation: 'Implement persistent audit trails for AI system decisions (Art. 12)',
  },
  {
    category: 'record-keeping',
    patternType: 'positive',
    regex: /compliance[_-]?record|ComplianceRecord|retention[_-]?policy|log[_-]?retention/gi,
    label: 'Compliance record keeping',
    obligationId: 'eu-ai-act-OBL-014',
    article: 'Art. 12',
    recommendation: 'Maintain compliance records with defined retention policy (Art. 12)',
  },

  // --- Accuracy & Robustness (Art. 15) ---
  {
    category: 'accuracy-robustness',
    patternType: 'positive',
    regex: /model[_-]?validat(ion|e|or)|ModelValidator|accuracy[_-]?metric|accuracy[_-]?test/gi,
    label: 'Model validation / accuracy testing',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15',
    recommendation: 'Implement model validation and accuracy metrics (Art. 15)',
  },
  {
    category: 'accuracy-robustness',
    patternType: 'positive',
    regex: /robustness[_-]?test|adversarial[_-]?test|fuzz[_-]?test.*model|model[_-]?benchmark/gi,
    label: 'Robustness / adversarial testing',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15',
    recommendation: 'Conduct robustness and adversarial testing of AI models (Art. 15)',
  },

  // --- Cybersecurity (Art. 15(4)) ---
  {
    category: 'cybersecurity',
    patternType: 'positive',
    regex: /rate[_-]?limit|RateLimiter|throttle.*api|api[_-]?throttl/gi,
    label: 'API rate limiting',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Implement rate limiting for AI API endpoints (Art. 15(4))',
  },
  {
    category: 'cybersecurity',
    patternType: 'positive',
    regex: /input[_-]?sanitiz|sanitizeInput|prompt[_-]?sanitiz|injection[_-]?prevent/gi,
    label: 'Input sanitization / injection prevention',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Sanitize inputs to prevent prompt injection attacks (Art. 15(4))',
  },

  // --- Deployer Monitoring (Art. 26) ---
  {
    category: 'deployer-monitoring',
    patternType: 'positive',
    regex: /model[_-]?monitor|ModelMonitor|drift[_-]?detect|performance[_-]?track/gi,
    label: 'Model monitoring / drift detection',
    obligationId: 'eu-ai-act-OBL-011',
    article: 'Art. 26(5)',
    recommendation: 'Implement model monitoring and drift detection (Art. 26(5))',
  },
  {
    category: 'deployer-monitoring',
    patternType: 'positive',
    regex: /incident[_-]?report|IncidentReport|reportIncident|safety[_-]?report/gi,
    label: 'Incident reporting mechanism',
    obligationId: 'eu-ai-act-OBL-011',
    article: 'Art. 26(5)',
    recommendation: 'Implement incident reporting for AI system malfunctions (Art. 26(5))',
  },

  // --- GPAI Transparency (Art. 53) ---
  {
    category: 'gpai-transparency',
    patternType: 'positive',
    regex: /model[_-]?card|ModelCard|model[_-]?documentation|system[_-]?card/gi,
    label: 'Model card / documentation',
    obligationId: 'eu-ai-act-OBL-022',
    article: 'Art. 53',
    recommendation: 'Provide model card with capabilities, limitations, and intended use (Art. 53)',
  },
  {
    category: 'gpai-transparency',
    patternType: 'positive',
    regex: /training[_-]?data[_-]?summary|compute[_-]?report|TrainingReport/gi,
    label: 'Training data summary / compute report',
    obligationId: 'eu-ai-act-OBL-022',
    article: 'Art. 53',
    recommendation: 'Document training data summary and compute resources used (Art. 53)',
  },

  // --- Conformity Assessment (Art. 43) ---
  {
    category: 'conformity-assessment',
    patternType: 'positive',
    regex: /conformity[_-]?declar|ConformityDeclaration|ce[_-]?mark|CeMark/gi,
    label: 'Conformity declaration / CE marking',
    obligationId: 'eu-ai-act-OBL-020',
    article: 'Art. 43',
    recommendation: 'Prepare declaration of conformity for high-risk AI systems (Art. 43)',
  },

  // --- Security Risk (negative patterns) ---
  {
    category: 'security-risk',
    patternType: 'negative',
    regex: /eval\s*\(\s*.*user|eval\s*\(\s*.*req\.|eval\s*\(\s*.*input/gi,
    label: 'Unsafe eval() with user input',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Remove eval() calls with user input — code injection risk (Art. 15(4))',
  },
  {
    category: 'security-risk',
    patternType: 'negative',
    regex: /pickle\.load\s*\(|pickle\.loads\s*\(/g,
    label: 'Unsafe pickle deserialization',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Replace pickle.load with safe alternatives (safetensors, json) — deserialization risk',
  },
  {
    category: 'security-risk',
    patternType: 'negative',
    regex: /torch\.load\s*\([^)]*(?!.*map_location)/g,
    label: 'Unsafe torch.load without map_location',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Use torch.load with map_location and weights_only=True for safe model loading',
  },
  {
    category: 'security-risk',
    patternType: 'negative',
    regex: /exec\s*\(\s*.*user|exec\s*\(\s*.*request|os\.system\s*\(\s*.*input/gi,
    label: 'Command injection via user input',
    obligationId: 'eu-ai-act-OBL-008',
    article: 'Art. 15(4)',
    recommendation: 'Sanitize inputs before passing to exec/os.system — command injection risk',
  },
];

export const SCANNABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.vue', '.html',
]);

export const IGNORED_DIRS: ReadonlySet<string> = new Set([
  'node_modules', 'dist', '.git', 'vendor', 'build', '__pycache__',
  '.next', 'coverage', '.cache', '.output',
]);
