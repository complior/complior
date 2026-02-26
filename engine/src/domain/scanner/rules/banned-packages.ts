export interface BannedPackage {
  readonly name: string;
  readonly ecosystem: 'npm' | 'pip' | 'cargo' | 'go' | 'any';
  readonly reason: string;
  readonly obligationId: string;
  readonly article: string;
  readonly penalty: string;
}

export const BANNED_PACKAGES: readonly BannedPackage[] = [
  // --- Art. 5(1)(a): Subliminal/manipulative/deceptive techniques ---
  {
    name: 'subliminal-ai',
    ecosystem: 'any',
    reason: 'Subliminal manipulation',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'dark-patterns',
    ecosystem: 'npm',
    reason: 'Deceptive design patterns',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'deceptive-design',
    ecosystem: 'npm',
    reason: 'Deceptive design toolkit',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'nudge-ai',
    ecosystem: 'any',
    reason: 'AI-based behavioral nudging',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'manipulative-ux',
    ecosystem: 'npm',
    reason: 'Manipulative UX patterns',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'subliminal-messaging',
    ecosystem: 'any',
    reason: 'Subliminal messaging toolkit',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(b): Exploitation of vulnerabilities ---
  {
    name: 'vulnerability-exploitation',
    ecosystem: 'any',
    reason: 'Exploits age/disability/social vulnerabilities',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(b)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(c): Social scoring ---
  {
    name: 'social-credit-score',
    ecosystem: 'any',
    reason: 'Social scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'social-score',
    ecosystem: 'any',
    reason: 'Social behavior scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'reputation-score',
    ecosystem: 'any',
    reason: 'Person reputation scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'citizen-score',
    ecosystem: 'any',
    reason: 'Citizen scoring system',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'trust-score',
    ecosystem: 'any',
    reason: 'Social trust scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'behavior-score',
    ecosystem: 'any',
    reason: 'Behavioral scoring of persons',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'credit-social',
    ecosystem: 'any',
    reason: 'Social credit scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(d): Individual criminal risk prediction ---
  {
    name: 'predpol',
    ecosystem: 'any',
    reason: 'Predictive policing based on profiling',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(d)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'predictive-policing',
    ecosystem: 'any',
    reason: 'Predictive policing',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(d)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'crime-prediction',
    ecosystem: 'any',
    reason: 'Criminal risk prediction via profiling',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(d)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'precrime',
    ecosystem: 'any',
    reason: 'Pre-crime risk assessment',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(d)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'recidivism-predictor',
    ecosystem: 'any',
    reason: 'Recidivism prediction via profiling',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(d)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(e): Untargeted facial scraping ---
  {
    name: 'clearview-ai',
    ecosystem: 'any',
    reason: 'Untargeted facial scraping from internet/CCTV',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(e)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'face-scraper',
    ecosystem: 'any',
    reason: 'Facial image scraping toolkit',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(e)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(f): Emotion recognition in workplace/education ---
  {
    name: 'deepface',
    ecosystem: 'pip',
    reason: 'Emotion recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'fer',
    ecosystem: 'pip',
    reason: 'Facial Emotion Recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'emotion-recognition',
    ecosystem: 'npm',
    reason: 'Emotion recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'py-feat',
    ecosystem: 'pip',
    reason: 'Facial expression analysis (emotion recognition)',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'emopy',
    ecosystem: 'pip',
    reason: 'Emotion recognition from facial expressions',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'affectiva',
    ecosystem: 'any',
    reason: 'Emotion AI / affective computing',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'emotion-api',
    ecosystem: 'any',
    reason: 'Emotion detection API client',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(f)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(g): Biometric categorization by protected characteristics ---
  {
    name: 'face-api.js',
    ecosystem: 'npm',
    reason: 'Biometric identification / categorization',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'insightface',
    ecosystem: 'pip',
    reason: 'Biometric face analysis and categorization',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'arcface',
    ecosystem: 'pip',
    reason: 'Face recognition / biometric categorization',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'openface',
    ecosystem: 'any',
    reason: 'Open-source face recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'compreface',
    ecosystem: 'any',
    reason: 'Face recognition / biometric ID service',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'amazon-rekognition',
    ecosystem: 'any',
    reason: 'Cloud biometric identification',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: '@azure/cognitiveservices-face',
    ecosystem: 'npm',
    reason: 'Cloud biometric face API',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'azure-cognitiveservices-vision-face',
    ecosystem: 'pip',
    reason: 'Cloud biometric face API',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'google-cloud-vision',
    ecosystem: 'pip',
    reason: 'Cloud biometric identification',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'clarifai',
    ecosystem: 'any',
    reason: 'Visual biometric recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'kairos',
    ecosystem: 'any',
    reason: 'Face recognition API',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'luxand',
    ecosystem: 'any',
    reason: 'Face recognition SDK',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'facepp',
    ecosystem: 'any',
    reason: 'Face++ biometric recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'deepid',
    ecosystem: 'pip',
    reason: 'Deep face identification',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(g)',
    penalty: '€35M or 7% turnover',
  },

  // --- Art. 5(1)(h): Real-time remote biometric ID in public spaces ---
  {
    name: 'real-time-facial',
    ecosystem: 'any',
    reason: 'Real-time facial recognition in public spaces',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(h)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'crowd-face',
    ecosystem: 'any',
    reason: 'Crowd facial recognition',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(h)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'surveillance-ai',
    ecosystem: 'any',
    reason: 'AI surveillance system',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(h)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'mass-surveillance',
    ecosystem: 'any',
    reason: 'Mass surveillance toolkit',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(h)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'live-biometric',
    ecosystem: 'any',
    reason: 'Live biometric identification',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(h)',
    penalty: '€35M or 7% turnover',
  },
];

// Regex patterns for detecting prohibited use even without exact package names
export interface ProhibitedPattern {
  readonly regex: RegExp;
  readonly reason: string;
  readonly article: string;
}

export const PROHIBITED_PATTERNS: readonly ProhibitedPattern[] = [
  { regex: /emotion.*recogni(tion|ze|zer).*real.?time/i, reason: 'Real-time emotion recognition', article: 'Art. 5(1)(f)' },
  { regex: /social.*scor(e|ing)/i, reason: 'Social scoring system', article: 'Art. 5(1)(c)' },
  { regex: /subliminal.*messag/i, reason: 'Subliminal messaging', article: 'Art. 5(1)(a)' },
  { regex: /biometric.*categori[sz]/i, reason: 'Biometric categorization', article: 'Art. 5(1)(g)' },
  { regex: /facial.*scrap(e|ing)/i, reason: 'Facial image scraping', article: 'Art. 5(1)(e)' },
  { regex: /predictive.*polic/i, reason: 'Predictive policing', article: 'Art. 5(1)(d)' },
  { regex: /crime.*predict/i, reason: 'Criminal risk prediction', article: 'Art. 5(1)(d)' },
  { regex: /mass.*surveillance/i, reason: 'Mass surveillance', article: 'Art. 5(1)(h)' },
  { regex: /real.?time.*biometric.*identif/i, reason: 'Real-time biometric identification', article: 'Art. 5(1)(h)' },
  { regex: /manipulat(e|ive|ion).*behavio(r|ur)/i, reason: 'Behavioral manipulation', article: 'Art. 5(1)(a)' },
];

export const AI_SDK_PACKAGES: ReadonlyMap<string, string> = new Map([
  // npm
  ['openai', 'OpenAI'],
  ['@anthropic-ai/sdk', 'Anthropic'],
  ['anthropic', 'Anthropic'],
  ['@google/generative-ai', 'Google AI'],
  ['@google-cloud/aiplatform', 'Google Vertex AI'],
  ['cohere-ai', 'Cohere'],
  ['@mistralai/mistralai', 'Mistral'],
  ['ai', 'Vercel AI SDK'],
  ['@ai-sdk/openai', 'Vercel AI SDK (OpenAI)'],
  ['@ai-sdk/anthropic', 'Vercel AI SDK (Anthropic)'],
  ['langchain', 'LangChain'],
  ['llamaindex', 'LlamaIndex'],
  ['replicate', 'Replicate'],
  ['huggingface', 'Hugging Face'],
  ['@huggingface/inference', 'Hugging Face Inference'],
  // pip
  ['google-generativeai', 'Google AI'],
  ['cohere', 'Cohere'],
  ['mistralai', 'Mistral'],
  ['llama-index', 'LlamaIndex'],
  ['transformers', 'Hugging Face Transformers'],
  ['torch', 'PyTorch'],
  ['tensorflow', 'TensorFlow'],
  // cargo
  ['async-openai', 'OpenAI (Rust)'],
  ['llm', 'LLM (Rust)'],
  // go
  ['github.com/sashabaranov/go-openai', 'OpenAI (Go)'],
  ['github.com/anthropics/anthropic-sdk-go', 'Anthropic (Go)'],
]);

export const BIAS_TESTING_PACKAGES: ReadonlySet<string> = new Set([
  'fairlearn',
  'aif360',
  'aequitas',
  'responsibleai',
  '@responsible-ai/fairness',
]);

export const isBannedPackage = (name: string): BannedPackage | undefined =>
  BANNED_PACKAGES.find(
    (bp) => bp.name.toLowerCase() === name.toLowerCase(),
  );

export const isAiSdkPackage = (name: string): string | undefined =>
  AI_SDK_PACKAGES.get(name);

export const matchProhibitedPattern = (text: string): ProhibitedPattern | undefined =>
  PROHIBITED_PATTERNS.find((p) => p.regex.test(text));
