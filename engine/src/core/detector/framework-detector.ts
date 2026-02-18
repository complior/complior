import type { DetectedFramework, DetectedAiTool } from '../../types/common.types.js';

// --- Framework detection (PURE — no I/O) ---

const FRAMEWORK_MAP: ReadonlyMap<string, string> = new Map([
  ['next', 'Next.js'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['@angular/core', 'Angular'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['hono', 'Hono'],
  ['@nestjs/core', 'NestJS'],
]);

const AI_TOOL_MAP: ReadonlyMap<string, { readonly name: string; readonly type: 'sdk' | 'api' | 'library' }> = new Map([
  ['openai', { name: 'OpenAI', type: 'sdk' }],
  ['@anthropic-ai/sdk', { name: 'Anthropic', type: 'sdk' }],
  ['ai', { name: 'Vercel AI SDK', type: 'library' }],
  ['@langchain/core', { name: 'LangChain', type: 'library' }],
  ['@huggingface/inference', { name: 'Hugging Face', type: 'sdk' }],
  ['replicate', { name: 'Replicate', type: 'sdk' }],
  ['cohere-ai', { name: 'Cohere', type: 'sdk' }],
  ['@mistralai/mistralai', { name: 'Mistral', type: 'sdk' }],
  ['@google/generative-ai', { name: 'Google Generative AI', type: 'sdk' }],
  ['ollama', { name: 'Ollama', type: 'sdk' }],
]);

const MODEL_PATTERNS: readonly RegExp[] = [
  /\bgpt-4[a-z0-9-]*/g,
  /\bgpt-3\.5[a-z0-9-]*/g,
  /\bclaude-[a-z0-9.-]*/g,
  /\bgemini-[a-z0-9.-]*/g,
  /\bllama-[a-z0-9.-]*/g,
  /\bmistral-[a-z0-9.-]*/g,
  /\bcommand-r[a-z0-9-]*/g,
];

export const detectFrameworks = (dependencies: Readonly<Record<string, string>>): readonly DetectedFramework[] => {
  const results: DetectedFramework[] = [];

  for (const [pkg, displayName] of FRAMEWORK_MAP) {
    const version = dependencies[pkg];
    if (version !== undefined) {
      results.push({ name: displayName, version, confidence: 1.0 });
    }
  }

  return results;
};

export const detectAiTools = (dependencies: Readonly<Record<string, string>>): readonly DetectedAiTool[] => {
  const results: DetectedAiTool[] = [];

  for (const [pkg, meta] of AI_TOOL_MAP) {
    const version = dependencies[pkg];
    if (version !== undefined) {
      results.push({ name: meta.name, version, type: meta.type });
    }
  }

  return results;
};

export const detectModelsInSource = (fileContents: readonly string[]): readonly string[] => {
  const models = new Set<string>();

  for (const content of fileContents) {
    for (const pattern of MODEL_PATTERNS) {
      // Reset lastIndex since we reuse the regex
      pattern.lastIndex = 0;
      let match = pattern.exec(content);
      while (match !== null) {
        models.add(match[0]);
        match = pattern.exec(content);
      }
    }
  }

  return [...models].sort();
};
