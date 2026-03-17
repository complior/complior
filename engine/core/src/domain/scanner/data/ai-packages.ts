/**
 * Central AI SDK package registry.
 * Single source of truth for AI package detection across all language ecosystems.
 * NOTE: banned-packages.ts stays separate — different purpose (Art. 5 prohibition patterns).
 */

export interface AiPackageEntry {
  readonly name: string;
  readonly ecosystem: 'npm' | 'pypi' | 'go' | 'rust' | 'java';
}

const AI_PACKAGE_REGISTRY: readonly AiPackageEntry[] = [
  // npm (JS/TS)
  { name: 'openai', ecosystem: 'npm' },
  { name: '@anthropic-ai/sdk', ecosystem: 'npm' },
  { name: '@google/generative-ai', ecosystem: 'npm' },
  { name: '@ai-sdk/openai', ecosystem: 'npm' },
  { name: '@ai-sdk/anthropic', ecosystem: 'npm' },
  { name: '@ai-sdk/google', ecosystem: 'npm' },
  { name: '@ai-sdk/core', ecosystem: 'npm' },
  { name: 'langchain', ecosystem: 'npm' },
  { name: '@langchain/core', ecosystem: 'npm' },
  { name: '@langchain/openai', ecosystem: 'npm' },
  { name: '@langchain/anthropic', ecosystem: 'npm' },
  { name: 'cohere-ai', ecosystem: 'npm' },
  { name: '@mistralai/mistralai', ecosystem: 'npm' },
  { name: '@huggingface/inference', ecosystem: 'npm' },
  { name: 'replicate', ecosystem: 'npm' },
  { name: 'together-ai', ecosystem: 'npm' },
  { name: '@complior/sdk', ecosystem: 'npm' },

  // PyPI (Python)
  { name: 'anthropic', ecosystem: 'pypi' },
  { name: 'google.generativeai', ecosystem: 'pypi' },
  { name: 'cohere', ecosystem: 'pypi' },
  { name: 'mistralai', ecosystem: 'pypi' },
  { name: 'huggingface_hub', ecosystem: 'pypi' },
  { name: 'transformers', ecosystem: 'pypi' },
  { name: 'torch', ecosystem: 'pypi' },
  { name: 'tensorflow', ecosystem: 'pypi' },
  { name: 'keras', ecosystem: 'pypi' },

  // Go
  { name: 'github.com/sashabaranov/go-openai', ecosystem: 'go' },
  { name: 'github.com/anthropics/anthropic-sdk-go', ecosystem: 'go' },
  { name: 'cloud.google.com/go/ai/generativelanguage', ecosystem: 'go' },
  { name: 'github.com/tmc/langchaingo', ecosystem: 'go' },
  { name: 'github.com/cohere-ai/cohere-go', ecosystem: 'go' },

  // Rust
  { name: 'async-openai', ecosystem: 'rust' },
  { name: 'anthropic', ecosystem: 'rust' },
  { name: 'google-generative-ai', ecosystem: 'rust' },
  { name: 'llm', ecosystem: 'rust' },
  { name: 'candle-core', ecosystem: 'rust' },
  { name: 'tch', ecosystem: 'rust' },
  { name: 'rust-bert', ecosystem: 'rust' },
  { name: 'langchain-rust', ecosystem: 'rust' },

  // Java
  { name: 'dev.langchain4j', ecosystem: 'java' },
  { name: 'com.theokanning.openai-gpt3-java', ecosystem: 'java' },
  { name: 'com.google.cloud.aiplatform', ecosystem: 'java' },
  { name: 'ai.djl', ecosystem: 'java' },
  { name: 'org.deeplearning4j', ecosystem: 'java' },
  { name: 'com.azure.ai.openai', ecosystem: 'java' },
];

const byEcosystem = (eco: AiPackageEntry['ecosystem']): ReadonlySet<string> =>
  new Set(AI_PACKAGE_REGISTRY.filter((p) => p.ecosystem === eco).map((p) => p.name));

/** npm + PyPI packages (used by import-graph for JS/TS/Python import detection). */
export const NPM_AI_PACKAGES: ReadonlySet<string> = byEcosystem('npm');
export const PIP_AI_PACKAGES: ReadonlySet<string> = byEcosystem('pypi');

/** Combined npm + PyPI set (backward-compatible with old AI_PACKAGES). */
export const AI_PACKAGES: ReadonlySet<string> = new Set([...NPM_AI_PACKAGES, ...PIP_AI_PACKAGES]);

/** Language-specific sets (used by language adapters). */
export const GO_AI_PACKAGES: ReadonlySet<string> = byEcosystem('go');
export const RUST_AI_PACKAGES: ReadonlySet<string> = byEcosystem('rust');
export const JAVA_AI_PACKAGES: ReadonlySet<string> = byEcosystem('java');
