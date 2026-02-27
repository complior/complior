'use strict';

/**
 * LLM Models — slug→OpenRouter model ID mapping
 *
 * Maps our registry tool slugs to OpenRouter model identifiers.
 * Only tools with an entry here will receive LLM behavioral tests.
 */

const MODEL_MAP = {
  // OpenAI — verified on OpenRouter 2026-02-25
  'chatgpt': 'openai/gpt-4o',
  'gpt-4': 'openai/gpt-4',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'o1': 'openai/o1',

  // Anthropic
  'claude': 'anthropic/claude-sonnet-4.5',
  'claude-3-opus': 'anthropic/claude-opus-4',

  // Google
  'gemini': 'google/gemini-2.5-pro',
  'gemini-pro': 'google/gemini-2.5-pro',

  // Meta
  'llama-3': 'meta-llama/llama-3-70b-instruct',

  // Mistral
  'mistral-large': 'mistralai/mistral-large',
  'mistral-medium': 'mistralai/mistral-medium-3',
  'mixtral-8x22b': 'mistralai/mixtral-8x22b-instruct',
  'codestral': 'mistralai/codestral-2508',
  'pixtral': 'mistralai/pixtral-large-2411',

  // Cohere
  'command-r': 'cohere/command-r-08-2024',

  // xAI
  'grok': 'x-ai/grok-4',
  'grok-2': 'x-ai/grok-3',
  'grok-3': 'x-ai/grok-4',

  // DeepSeek
  'deepseek-chat': 'deepseek/deepseek-v3.2',
  'deepseek-r1': 'deepseek/deepseek-r1',

  // Microsoft
  'phi-3': 'microsoft/phi-4',

  // Qwen — no matching slug in DB, skip for now

  // AI21 — removed from OpenRouter
  'jamba': 'cohere/command-a', // fallback: test on similar model

  // Databricks — removed from OpenRouter
  // 'dbrx': removed

  // Other
  'gemma-2': 'google/gemma-2-27b-it',
  'openchat': 'mistralai/mistral-7b-instruct', // fallback
  'glm-4': 'qwen/qwen-2.5-72b-instruct', // fallback: Chinese model → Qwen
  'falcon-180b': 'meta-llama/llama-3.1-70b-instruct', // fallback
  'solar': 'mistralai/mistral-7b-instruct', // fallback
  'yi-large': 'qwen/qwen-2.5-72b-instruct', // fallback: Chinese model → Qwen
  'pi': 'anthropic/claude-haiku-4.5', // fallback: conversational model
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
