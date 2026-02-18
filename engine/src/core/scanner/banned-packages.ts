export interface BannedPackage {
  readonly name: string;
  readonly ecosystem: 'npm' | 'pip' | 'cargo' | 'go' | 'any';
  readonly reason: string;
  readonly obligationId: string;
  readonly article: string;
  readonly penalty: string;
}

export const BANNED_PACKAGES: readonly BannedPackage[] = [
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
    name: 'face-api.js',
    ecosystem: 'npm',
    reason: 'Biometric identification',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'social-credit-score',
    ecosystem: 'any',
    reason: 'Social scoring',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(c)',
    penalty: '€35M or 7% turnover',
  },
  {
    name: 'subliminal-ai',
    ecosystem: 'any',
    reason: 'Subliminal manipulation',
    obligationId: 'eu-ai-act-OBL-002',
    article: 'Art. 5(1)(a)',
    penalty: '€35M or 7% turnover',
  },
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
  ['openai', 'OpenAI'],
  ['anthropic', 'Anthropic'],
  ['google-generativeai', 'Google AI'],
  ['cohere', 'Cohere'],
  ['mistralai', 'Mistral'],
  ['langchain', 'LangChain'],
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
