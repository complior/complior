/**
 * Maps registry tools → OpenRouter model IDs.
 * Primary: explicit slug→modelId map. Fallback: fuzzy matching.
 */

import type { RegistryTool } from '../types.js';

export interface OpenRouterModel {
  readonly id: string;
  readonly name: string;
}

interface OpenRouterModelsResponse {
  readonly data: readonly OpenRouterModel[];
}

const LLM_CATEGORIES = new Set([
  'foundation-model', 'llm', 'chatbot', 'text-generation',
]);

export async function fetchOpenRouterModels(): Promise<readonly OpenRouterModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const json = (await res.json()) as OpenRouterModelsResponse;
  return json.data;
}

export interface ToolModelMatch {
  readonly tool: RegistryTool;
  readonly modelId: string;
  readonly modelName: string;
}

/**
 * Explicit slug → OpenRouter model ID mapping.
 * This is the primary matching strategy — covers all known LLM tools.
 */
const SLUG_TO_MODEL: Record<string, string> = {
  // OpenAI foundation models
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4': 'openai/gpt-4.1',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'o1': 'openai/o1',
  'o3': 'openai/o3',
  // OpenAI chatbot
  'chatgpt': 'openai/chatgpt-4o-latest',

  // Anthropic
  'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'claude-4-5-sonnet': 'anthropic/claude-sonnet-4-5-20250929',
  'claude-4-6-opus': 'anthropic/claude-opus-4-6',
  'claude': 'anthropic/claude-sonnet-4-5-20250929',

  // Google
  'gemini-ultra': 'google/gemini-2.0-flash-001',
  'gemini-pro': 'google/gemini-pro',
  'gemini-2-0': 'google/gemini-2.5-pro-preview',
  'gemini': 'google/gemini-2.5-flash-preview',
  'palm-2': 'google/palm-2-chat-bison',
  'gemma-2': 'google/gemma-2-27b-it',

  // Meta
  'llama-3': 'meta-llama/llama-3.3-70b-instruct',
  'llama-3-1-405b': 'meta-llama/llama-3.1-405b-instruct',
  'llama-2': 'meta-llama/llama-2-70b-chat',

  // Mistral
  'mistral-large': 'mistralai/mistral-large-2411',
  'mixtral-8x22b': 'mistralai/mixtral-8x22b-instruct',
  'mistral-medium': 'mistralai/mistral-medium',
  'mistral-chat': 'mistralai/mistral-small-3.1-24b-instruct',

  // Cohere
  'command-r': 'cohere/command-r-plus-08-2024',
  'cohere-aya': 'cohere/command-r7b-12-2024',

  // DeepSeek
  'deepseek-v3': 'deepseek/deepseek-chat',
  'deepseek-r1': 'deepseek/deepseek-r1',
  'deepseek-chat': 'deepseek/deepseek-chat-v3-0324',

  // Alibaba / Qwen
  'qwen-2-5': 'qwen/qwen-2.5-72b-instruct',
  'tongyi-qianwen': 'qwen/qwen-2.5-72b-instruct',

  // 01.AI
  'yi-large': 'yi-01-ai/yi-large',
  'yi-chat': 'yi-01-ai/yi-large',

  // xAI
  'grok-2': 'x-ai/grok-2-1212',
  'grok': 'x-ai/grok-2-1212',

  // Microsoft
  'phi-3': 'microsoft/phi-4',
  'microsoft-copilot': 'microsoft/phi-4',

  // Inflection
  'pi': 'inflection/inflection-3-pi',
  'inflection-3-0': 'inflection/inflection-3-pi',

  // NVIDIA
  'nvidia-nemotron': 'nvidia/llama-3.1-nemotron-70b-instruct',

  // IBM
  'granite': 'ibm-granite/granite-3.1-8b-instruct',

  // AI21
  'jamba': 'ai21/jamba-1-5-large',

  // Perplexity
  'perplexity-ai': 'perplexity/sonar',

  // Amazon
  'nova': 'amazon/nova-pro-v1',

  // Databricks
  'dbrx': 'databricks/dbrx-instruct',

  // Hugging Face
  'huggingchat': 'meta-llama/llama-3.3-70b-instruct',

  // Stability
  'stablelm': 'stabilityai/stable-code-instruct-3b',

  // Moonshot / Kimi
  'kimi': 'moonshotai/kimi-vl-a3b-thinking',
  'kimi-k2-5': 'moonshotai/kimi-vl-a3b-thinking',

  // Zhipu
  'glm-4': 'thudm/glm-z1-32b',
  'chatglm': 'thudm/glm-z1-32b',
};

/**
 * Match tools to OpenRouter models.
 * Strategy: explicit map first, then fuzzy fallback.
 */
export function matchToolsToModels(
  tools: readonly RegistryTool[],
  models: readonly OpenRouterModel[],
): readonly ToolModelMatch[] {
  const llmTools = tools.filter(t =>
    t.categories.some(c => LLM_CATEGORIES.has(c)),
  );

  const modelIndex = new Map(models.map(m => [m.id, m]));
  const matches: ToolModelMatch[] = [];
  const usedModelIds = new Set<string>();

  for (const tool of llmTools) {
    // 1. Explicit map lookup
    const mappedId = SLUG_TO_MODEL[tool.slug];
    if (mappedId) {
      // Find exact or prefix match in available models
      let model = modelIndex.get(mappedId);
      if (!model) {
        // Try prefix: "openai/gpt-4" might be "openai/gpt-4.1" on OpenRouter
        model = models.find(m => m.id.startsWith(mappedId) && !usedModelIds.has(m.id));
      }
      if (model && !usedModelIds.has(model.id)) {
        usedModelIds.add(model.id);
        matches.push({ tool, modelId: model.id, modelName: model.name });
        continue;
      }
    }

    // 2. Fuzzy fallback: search for slug fragments in model IDs
    const slugParts = tool.slug.split('-').filter(p => p.length > 2);
    for (const model of models) {
      if (usedModelIds.has(model.id)) continue;
      const modelLower = model.id.toLowerCase();
      const matchCount = slugParts.filter(p => modelLower.includes(p)).length;
      if (matchCount >= 2 || (slugParts.length === 1 && matchCount === 1 && modelLower.includes(slugParts[0]!))) {
        usedModelIds.add(model.id);
        matches.push({ tool, modelId: model.id, modelName: model.name });
        break;
      }
    }
  }

  return matches;
}
