'use strict';

/**
 * LLM Models — slug→OpenRouter model ID mapping
 *
 * Maps our registry tool slugs to OpenRouter model identifiers.
 * Only tools with an entry here will receive LLM behavioral tests.
 */

const MODEL_MAP = {
  // ─── Chatbot-category tools (slug matches RegistryTool.slug) ───

  // OpenAI
  'chatgpt': 'openai/gpt-4o',
  'microsoft-copilot': 'openai/gpt-4o', // Copilot uses GPT-4o

  // Anthropic
  'claude': 'anthropic/claude-sonnet-4.5',

  // Google
  'gemini': 'google/gemini-2.5-pro',

  // Meta
  'llama': 'meta-llama/llama-3.3-70b-instruct',

  // Mistral
  'le-chat-mistral': 'mistralai/mistral-large',
  'codestral': 'mistralai/codestral-2508',

  // Cohere
  'cohere-command': 'cohere/command-r-08-2024',
  'coral-cohere': 'cohere/command-r-08-2024',

  // xAI
  'grok': 'x-ai/grok-4',

  // DeepSeek
  'deepseek-chat': 'deepseek/deepseek-v3.2',

  // Qwen
  'qwen-chat': 'qwen/qwen-2.5-72b-instruct',

  // AI21
  'ai21-jamba': 'cohere/command-a', // fallback: AI21 removed from OpenRouter

  // Inflection
  'pi': 'anthropic/claude-haiku-4.5', // fallback: no Pi model on OpenRouter

  // Perplexity
  'perplexity-ai': 'perplexity/sonar-pro',

  // Other chatbots
  'falcon-chat': 'meta-llama/llama-3.1-70b-instruct', // fallback
  'ernie-bot': 'qwen/qwen-2.5-72b-instruct', // fallback: Chinese model
  'huggingchat': 'meta-llama/llama-3.3-70b-instruct', // fallback: HF default

  // ─── API platform tools (test with their flagship model) ───

  'openai-api': 'openai/gpt-4o',
  'anthropic-claude-api': 'anthropic/claude-sonnet-4.5',
  'mistral-ai-api-la-plateforme': 'mistralai/mistral-large',
  'cohere-api': 'cohere/command-r-08-2024',
  'groq-cloud': 'meta-llama/llama-3.3-70b-instruct',
  'together-ai': 'meta-llama/llama-3.3-70b-instruct',
  'deepinfra': 'meta-llama/llama-3.3-70b-instruct',
  'fireworks-ai': 'meta-llama/llama-3.3-70b-instruct',
  'perplexity-api-sonar': 'perplexity/sonar-pro',
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
