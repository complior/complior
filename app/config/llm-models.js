'use strict';

/**
 * LLM Models — slug→OpenRouter model ID mapping (v2)
 *
 * Maps our registry tool slugs to OpenRouter model identifiers.
 * Only tools with an entry here will receive LLM behavioral tests
 * during the scheduled refresh pipeline.
 *
 * Expanded from ~30 → ~200+ mappings to cover:
 * - All major chatbot/assistant products
 * - API platforms (test with flagship model)
 * - Open-source model families
 * - EU-relevant deployer tools
 * - Coding assistants
 * - Specialized AI tools with chat interfaces
 */

const MODEL_MAP = {
  // ═══════════════════════════════════════════════════════════════
  // TIER 1: Major Chatbot Products (highest traffic)
  // ═══════════════════════════════════════════════════════════════

  // OpenAI
  'chatgpt': 'openai/gpt-4o',
  'chatgpt-plus': 'openai/gpt-4o',
  'chatgpt-enterprise': 'openai/gpt-4o',
  'chatgpt-edu': 'openai/gpt-4o',
  'chatgpt-team': 'openai/gpt-4o',

  // Microsoft
  'microsoft-copilot': 'openai/gpt-4o',
  'copilot-365': 'openai/gpt-4o',
  'bing-chat': 'openai/gpt-4o',

  // Anthropic
  'claude': 'anthropic/claude-sonnet-4.5',
  'claude-pro': 'anthropic/claude-sonnet-4.5',

  // Google
  'gemini': 'google/gemini-2.5-pro',
  'google-bard': 'google/gemini-2.5-pro',
  'gemini-pro': 'google/gemini-2.5-pro',
  'gemini-ultra': 'google/gemini-2.5-pro',
  'google-ai-studio': 'google/gemini-2.5-pro',

  // Meta
  'llama': 'meta-llama/llama-3.3-70b-instruct',
  'meta-ai': 'meta-llama/llama-3.3-70b-instruct',

  // Mistral
  'le-chat-mistral': 'mistralai/mistral-large',
  'mistral-chat': 'mistralai/mistral-large',

  // xAI
  'grok': 'x-ai/grok-4',

  // Perplexity
  'perplexity-ai': 'perplexity/sonar-pro',
  'perplexity-pro': 'perplexity/sonar-pro',

  // DeepSeek
  'deepseek-chat': 'deepseek/deepseek-v3.2',
  'deepseek': 'deepseek/deepseek-v3.2',

  // Inflection
  'pi': 'anthropic/claude-haiku-4.5',

  // ═══════════════════════════════════════════════════════════════
  // TIER 2: API Platforms (test with their flagship model)
  // ═══════════════════════════════════════════════════════════════

  'openai-api': 'openai/gpt-4o',
  'openai-gpt-4o': 'openai/gpt-4o',
  'openai-gpt-4o-mini': 'openai/gpt-4o-mini',
  'openai-gpt-4-turbo': 'openai/gpt-4-turbo',
  'openai-o1': 'openai/o1',
  'openai-o1-mini': 'openai/o1-mini',
  'openai-o3-mini': 'openai/o3-mini',

  'anthropic-claude-api': 'anthropic/claude-sonnet-4.5',
  'anthropic-claude-opus': 'anthropic/claude-opus-4',
  'anthropic-claude-sonnet': 'anthropic/claude-sonnet-4.5',
  'anthropic-claude-haiku': 'anthropic/claude-haiku-4.5',

  'google-gemini-api': 'google/gemini-2.5-pro',
  'google-gemini-flash': 'google/gemini-2.5-flash',
  'google-palm-api': 'google/gemini-2.5-pro',

  'mistral-ai-api-la-plateforme': 'mistralai/mistral-large',
  'mistral-large': 'mistralai/mistral-large',
  'mistral-medium': 'mistralai/mistral-medium',
  'mistral-small': 'mistralai/mistral-small-2503',
  'mistral-nemo': 'mistralai/mistral-nemo',
  'codestral': 'mistralai/codestral-2508',
  'pixtral': 'mistralai/pixtral-large-latest',

  'cohere-api': 'cohere/command-r-08-2024',
  'cohere-command': 'cohere/command-r-08-2024',
  'cohere-command-r-plus': 'cohere/command-r-plus-08-2024',
  'coral-cohere': 'cohere/command-r-08-2024',
  'cohere-command-a': 'cohere/command-a',

  'deepseek-api': 'deepseek/deepseek-v3.2',
  'deepseek-coder': 'deepseek/deepseek-coder',
  'deepseek-r1': 'deepseek/deepseek-r1',

  // ═══════════════════════════════════════════════════════════════
  // TIER 3: Inference Platforms (use hosted open-source models)
  // ═══════════════════════════════════════════════════════════════

  'groq-cloud': 'meta-llama/llama-3.3-70b-instruct',
  'together-ai': 'meta-llama/llama-3.3-70b-instruct',
  'deepinfra': 'meta-llama/llama-3.3-70b-instruct',
  'fireworks-ai': 'meta-llama/llama-3.3-70b-instruct',
  'anyscale': 'meta-llama/llama-3.3-70b-instruct',
  'replicate': 'meta-llama/llama-3.3-70b-instruct',
  'lepton-ai': 'meta-llama/llama-3.3-70b-instruct',
  'modal': 'meta-llama/llama-3.3-70b-instruct',
  'baseten': 'meta-llama/llama-3.3-70b-instruct',
  'cerebras-cloud': 'meta-llama/llama-3.3-70b-instruct',
  'lambda-cloud': 'meta-llama/llama-3.3-70b-instruct',
  'ovhcloud-ai': 'mistralai/mistral-large',
  'scaleway-ai': 'mistralai/mistral-large',
  'nebius-ai': 'meta-llama/llama-3.3-70b-instruct',

  // Perplexity API
  'perplexity-api-sonar': 'perplexity/sonar-pro',
  'perplexity-sonar': 'perplexity/sonar-pro',
  'perplexity-sonar-small': 'perplexity/sonar',

  // ═══════════════════════════════════════════════════════════════
  // TIER 4: Open-Source Model Families
  // ═══════════════════════════════════════════════════════════════

  // Meta LLaMA family
  'llama-3-3-70b': 'meta-llama/llama-3.3-70b-instruct',
  'llama-3-1-405b': 'meta-llama/llama-3.1-405b-instruct',
  'llama-3-1-70b': 'meta-llama/llama-3.1-70b-instruct',
  'llama-3-1-8b': 'meta-llama/llama-3.1-8b-instruct',
  'llama-3-70b': 'meta-llama/llama-3-70b-instruct',
  'llama-3-8b': 'meta-llama/llama-3-8b-instruct',
  'llama-2-70b': 'meta-llama/llama-2-70b-chat',
  'codellama': 'meta-llama/codellama-70b-instruct',

  // Mistral open-source
  'mixtral-8x7b': 'mistralai/mixtral-8x7b-instruct',
  'mixtral-8x22b': 'mistralai/mixtral-8x22b-instruct',
  'mistral-7b': 'mistralai/mistral-7b-instruct',

  // Qwen (Alibaba)
  'qwen-chat': 'qwen/qwen-2.5-72b-instruct',
  'qwen-2-5-72b': 'qwen/qwen-2.5-72b-instruct',
  'qwen-2-5-32b': 'qwen/qwen-2.5-32b-instruct',
  'qwen-2-5-7b': 'qwen/qwen-2.5-7b-instruct',
  'qwen-coder': 'qwen/qwen-2.5-coder-32b-instruct',
  'qwq': 'qwen/qwq-32b',

  // Microsoft Phi
  'phi-3-medium': 'microsoft/phi-3-medium-128k-instruct',
  'phi-3-mini': 'microsoft/phi-3-mini-128k-instruct',
  'phi-4': 'microsoft/phi-4',

  // Google open-source
  'gemma-2-27b': 'google/gemma-2-27b-it',
  'gemma-2-9b': 'google/gemma-2-9b-it',

  // Databricks
  'dbrx': 'databricks/dbrx-instruct',

  // Nous Research
  'nous-hermes': 'nousresearch/nous-hermes-2-mixtral-8x7b-dpo',

  // Yi (01.AI)
  'yi-large': 'zero-one-ai/yi-34b-chat',
  'yi-chat': 'zero-one-ai/yi-34b-chat',

  // Nvidia
  'nvidia-nemotron': 'nvidia/llama-3.1-nemotron-70b-instruct',

  // Amazon
  'amazon-nova': 'meta-llama/llama-3.3-70b-instruct', // fallback

  // ═══════════════════════════════════════════════════════════════
  // TIER 5: Coding Assistants
  // ═══════════════════════════════════════════════════════════════

  'github-copilot': 'openai/gpt-4o',
  'cursor-ai': 'anthropic/claude-sonnet-4.5',
  'codeium': 'meta-llama/llama-3.3-70b-instruct',
  'tabnine': 'meta-llama/llama-3.3-70b-instruct',
  'sourcegraph-cody': 'anthropic/claude-sonnet-4.5',
  'replit-ai': 'anthropic/claude-sonnet-4.5',
  'amazon-codewhisperer': 'anthropic/claude-sonnet-4.5',
  'amazon-q-developer': 'anthropic/claude-sonnet-4.5',
  'jetbrains-ai': 'openai/gpt-4o',
  'supermaven': 'meta-llama/llama-3.3-70b-instruct',
  'continue-dev': 'meta-llama/llama-3.3-70b-instruct',
  'aider': 'anthropic/claude-sonnet-4.5',
  'windsurf': 'anthropic/claude-sonnet-4.5',

  // ═══════════════════════════════════════════════════════════════
  // TIER 6: Writing & Productivity
  // ═══════════════════════════════════════════════════════════════

  'grammarly': 'openai/gpt-4o-mini',
  'jasper-ai': 'openai/gpt-4o',
  'copy-ai': 'openai/gpt-4o',
  'writesonic': 'openai/gpt-4o-mini',
  'rytr': 'openai/gpt-4o-mini',
  'quillbot': 'openai/gpt-4o-mini',
  'wordtune': 'openai/gpt-4o-mini',
  'notion-ai': 'anthropic/claude-sonnet-4.5',
  'otter-ai': 'openai/gpt-4o-mini',
  'mem-ai': 'openai/gpt-4o-mini',
  'hyperwrite': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 7: Translation & Language
  // ═══════════════════════════════════════════════════════════════

  'deepl': 'mistralai/mistral-large', // fallback: no DeepL on OpenRouter
  'deepl-translator': 'mistralai/mistral-large',
  'google-translate': 'google/gemini-2.5-flash',

  // ═══════════════════════════════════════════════════════════════
  // TIER 8: Customer Service & Business
  // ═══════════════════════════════════════════════════════════════

  'intercom-fin': 'openai/gpt-4o',
  'zendesk-ai': 'openai/gpt-4o',
  'drift-ai': 'openai/gpt-4o-mini',
  'ada-support': 'openai/gpt-4o-mini',
  'freshdesk-freddy': 'openai/gpt-4o-mini',
  'tidio': 'openai/gpt-4o-mini',
  'kommunicate': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 9: HR/Recruitment (High-Risk per EU AI Act)
  // ═══════════════════════════════════════════════════════════════

  'hirevue': 'openai/gpt-4o',
  'pymetrics': 'openai/gpt-4o-mini',
  'textio': 'openai/gpt-4o-mini',
  'eightfold-ai': 'openai/gpt-4o-mini',
  'beamery': 'openai/gpt-4o-mini',
  'paradox-olivia': 'openai/gpt-4o-mini',
  'phenom': 'openai/gpt-4o-mini',
  'hirelogic': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 10: Education
  // ═══════════════════════════════════════════════════════════════

  'khanmigo': 'openai/gpt-4o',
  'duolingo-max': 'openai/gpt-4o',
  'quizlet-ai': 'openai/gpt-4o-mini',
  'photomath': 'openai/gpt-4o-mini',
  'socratic-google': 'google/gemini-2.5-flash',

  // ═══════════════════════════════════════════════════════════════
  // TIER 11: Analytics & Data
  // ═══════════════════════════════════════════════════════════════

  'julius-ai': 'openai/gpt-4o',
  'obviously-ai': 'openai/gpt-4o-mini',
  'akkio': 'openai/gpt-4o-mini',
  'polymer-ai': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 12: Healthcare (High-Risk per EU AI Act)
  // ═══════════════════════════════════════════════════════════════

  'google-med-palm': 'google/gemini-2.5-pro',
  'hippocratic-ai': 'openai/gpt-4o',
  'elicit': 'openai/gpt-4o',
  'consensus-ai': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 13: Legal & Finance (High-Risk per EU AI Act)
  // ═══════════════════════════════════════════════════════════════

  'harvey-ai': 'openai/gpt-4o',
  'casetext': 'openai/gpt-4o',
  'robin-ai': 'openai/gpt-4o-mini',
  'spellbook-ai': 'openai/gpt-4o',
  'bloomberg-gpt': 'openai/gpt-4o',

  // ═══════════════════════════════════════════════════════════════
  // TIER 14: Search & Research
  // ═══════════════════════════════════════════════════════════════

  'you-com': 'openai/gpt-4o',
  'phind': 'openai/gpt-4o',
  'exa-ai': 'openai/gpt-4o-mini',
  'consensus': 'openai/gpt-4o-mini',
  'scite-ai': 'openai/gpt-4o-mini',

  // ═══════════════════════════════════════════════════════════════
  // TIER 15: Other Chatbot Products
  // ═══════════════════════════════════════════════════════════════

  'falcon-chat': 'meta-llama/llama-3.1-70b-instruct',
  'ernie-bot': 'qwen/qwen-2.5-72b-instruct',
  'huggingchat': 'meta-llama/llama-3.3-70b-instruct',
  'character-ai': 'meta-llama/llama-3.3-70b-instruct',
  'poe': 'openai/gpt-4o',
  'venice-ai': 'meta-llama/llama-3.3-70b-instruct',
  'forefront-ai': 'meta-llama/llama-3.3-70b-instruct',
  'chatbot-ui': 'openai/gpt-4o',
  'open-webui': 'meta-llama/llama-3.3-70b-instruct',
  'lmsys-chat': 'meta-llama/llama-3.3-70b-instruct',

  // AI21
  'ai21-jamba': 'cohere/command-a',

  // ═══════════════════════════════════════════════════════════════
  // TIER 16: Autonomous Agents & Workflows
  // ═══════════════════════════════════════════════════════════════

  'autogpt': 'openai/gpt-4o',
  'langchain': 'openai/gpt-4o',
  'crewai': 'openai/gpt-4o',
  'zapier-ai': 'openai/gpt-4o-mini',
  'make-ai': 'openai/gpt-4o-mini',
  'relevance-ai': 'openai/gpt-4o-mini',
};

/**
 * Media-generating tool categories
 * Tools with these categories may receive media tests
 */
const MEDIA_CATEGORIES = [
  'image-generation',
  'video-generation',
  'audio-generation',
  'voice-clone',
  'voice-tts',
  'deepfake',
  'music-generation',
];

/**
 * Media API configuration for tools that support image generation
 * Maps tool slug → API config for generating test images
 */
const MEDIA_API_MAP = {
  'dall-e-3': {
    type: 'openai-images',
    endpoint: 'https://api.openai.com/v1/images/generations',
    model: 'dall-e-3',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  'dall-e-2': {
    type: 'openai-images',
    endpoint: 'https://api.openai.com/v1/images/generations',
    model: 'dall-e-2',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  'stable-diffusion': {
    type: 'stability',
    endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    apiKeyEnv: 'STABILITY_API_KEY',
  },
  'stabilityai-stable-diffusion-xl-base-1-0': {
    type: 'stability',
    endpoint: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    apiKeyEnv: 'STABILITY_API_KEY',
  },
  'stabilityai-stable-diffusion-3-5-medium': {
    type: 'stability-v2',
    endpoint: 'https://api.stability.ai/v2beta/stable-image/generate/sd3',
    apiKeyEnv: 'STABILITY_API_KEY',
  },
  'midjourney': {
    type: 'none', // No public API — skip
  },
};

module.exports = { MODEL_MAP, MEDIA_CATEGORIES, MEDIA_API_MAP };
