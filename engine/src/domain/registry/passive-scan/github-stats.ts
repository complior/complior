/**
 * GitHub Stats Collector — §3.7.5
 * Maps known open-source AI tools to their GitHub repos
 * and fetches stars + last commit date via the GitHub API.
 */

export interface GitHubStats {
  readonly stars: number;
  readonly lastCommit: string;
  readonly repo: string;
}

/**
 * Static mapping: tool slug → GitHub owner/repo.
 * Covers ~80 known open-source AI tools and models.
 */
export const SLUG_TO_GITHUB: Record<string, string> = {
  // Meta / Llama
  'llama-3': 'meta-llama/llama3',
  'llama-3-1-405b': 'meta-llama/llama3',
  'llama-2': 'meta-llama/llama',
  'codellama': 'meta-llama/codellama',

  // OpenAI
  'whisper': 'openai/whisper',
  'tiktoken': 'openai/tiktoken',
  'triton': 'openai/triton',
  'openai-cookbook': 'openai/openai-cookbook',

  // Google / DeepMind
  'gemma-2': 'google/gemma_pytorch',
  'palm-2': 'google/generative-ai-python',
  'bert': 'google-research/bert',
  't5': 'google-research/text-to-text-transfer-transformer',

  // Stability AI
  'stable-diffusion': 'Stability-AI/stablediffusion',
  'stablelm': 'Stability-AI/StableLM',
  'stable-video': 'Stability-AI/generative-models',
  'stable-audio': 'Stability-AI/stable-audio-tools',

  // Mistral
  'mistral-large': 'mistralai/mistral-src',
  'mistral-7b': 'mistralai/mistral-src',
  'mixtral-8x22b': 'mistralai/mistral-src',
  'mistral-chat': 'mistralai/mistral-src',

  // Hugging Face ecosystem
  'huggingchat': 'huggingface/chat-ui',
  'transformers': 'huggingface/transformers',
  'diffusers': 'huggingface/diffusers',

  // Microsoft
  'phi-2': 'microsoft/phi-2',
  'orca-2': 'microsoft/Orca-2',
  'deepspeed': 'microsoft/DeepSpeed',
  'autogen': 'microsoft/autogen',

  // Other major open-source
  'deepseek-chat': 'deepseek-ai/DeepSeek-LLM',
  'deepseek-coder': 'deepseek-ai/DeepSeek-Coder',
  'yi-chat': '01-ai/Yi',
  'chatglm': 'THUDM/ChatGLM3',
  'qwen': 'QwenLM/Qwen',
  'tongyi-qianwen': 'QwenLM/Qwen',
  'falcon': 'tiiuae/falcon-40b',
  'vicuna': 'lm-sys/FastChat',

  // Tools / frameworks
  'langchain': 'langchain-ai/langchain',
  'llamaindex': 'run-llama/llama_index',
  'ollama': 'ollama/ollama',
  'vllm': 'vllm-project/vllm',
  'lmstudio': 'lmstudio-ai/lmstudio',
  'gpt4all': 'nomic-ai/gpt4all',
  'jan': 'janhq/jan',
  'oobabooga': 'oobabooga/text-generation-webui',
  'koboldcpp': 'LostRuins/koboldcpp',

  // Image generation
  'comfyui': 'comfyanonymous/ComfyUI',
  'automatic1111': 'AUTOMATIC1111/stable-diffusion-webui',
  'invoke-ai': 'invoke-ai/InvokeAI',
  'fooocus': 'lllyasviel/Fooocus',

  // Audio
  'bark': 'suno-ai/bark',
  'tortoise-tts': 'neonbjb/tortoise-tts',
  'coqui-tts': 'coqui-ai/TTS',
  'audiocraft': 'facebookresearch/audiocraft',

  // Video
  'animatediff': 'guoyww/AnimateDiff',

  // Coding
  'tabby': 'TabbyML/tabby',
  'continue': 'continuedev/continue',
  'aider': 'paul-gauthier/aider',

  // RAG / Search
  'privategpt': 'zylon-ai/private-gpt',
  'localai': 'mudler/LocalAI',

  // Agents
  'autogpt': 'Significant-Gravitas/AutoGPT',
  'babyagi': 'yoheinakajima/babyagi',
  'crewai': 'crewAIInc/crewAI',
  'metagpt': 'geekan/MetaGPT',

  // Data / MLOps
  'mlflow': 'mlflow/mlflow',
  'wandb': 'wandb/wandb',
  'dvc': 'iterative/dvc',
  'label-studio': 'HumanSignal/label-studio',

  // NVIDIA
  'nvidia-nemo': 'NVIDIA/NeMo',
  'nvidia-tensorrt-llm': 'NVIDIA/TensorRT-LLM',

  // Cohere
  'coral': 'cohere-ai/cohere-python',

  // xAI
  'grok': 'xai-org/grok-1',
};

/**
 * Fetch GitHub stats for a single repo via GitHub API.
 * Uses `gh api` if available, falls back to public fetch.
 */
export async function fetchGitHubStats(repo: string): Promise<GitHubStats | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Complior/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      stargazers_count?: number;
      pushed_at?: string;
      full_name?: string;
    };

    return {
      stars: data.stargazers_count ?? 0,
      lastCommit: data.pushed_at ?? new Date().toISOString(),
      repo: data.full_name ?? repo,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch GitHub stats for all known open-source tools.
 * Returns a map of slug → GitHubStats.
 */
export async function fetchAllGitHubStats(
  slugs: readonly string[],
  concurrency = 5,
): Promise<Map<string, GitHubStats>> {
  const results = new Map<string, GitHubStats>();
  const queue = slugs
    .filter(slug => SLUG_TO_GITHUB[slug])
    .map(slug => ({ slug, repo: SLUG_TO_GITHUB[slug]! }));

  // Simple concurrency limiter
  const batches: typeof queue[] = [];
  for (let i = 0; i < queue.length; i += concurrency) {
    batches.push(queue.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const promises = batch.map(async ({ slug, repo }) => {
      const stats = await fetchGitHubStats(repo);
      if (stats) results.set(slug, stats);
    });
    await Promise.all(promises);
  }

  return results;
}
