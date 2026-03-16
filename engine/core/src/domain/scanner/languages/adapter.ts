/**
 * LanguageAdapter interface for multi-language scanner support.
 * Each adapter provides language-specific dependency detection, import parsing, and patterns.
 */

export interface DepInfo {
  readonly name: string;
  readonly version: string;
  readonly isAiSdk: boolean;
  readonly isBanned: boolean;
  readonly bannedReason?: string;
}

export interface LanguageAdapter {
  readonly id: string;
  readonly name: string;
  readonly extensions: readonly string[];
  readonly depFiles: readonly string[];

  /** Parse dependency file and return detected deps */
  readonly detectDeps: (content: string) => readonly DepInfo[];

  /** Extract import statements from a source file */
  readonly extractImports: (content: string) => readonly string[];

  /** Get AI SDK package names for this language */
  readonly aiPackages: ReadonlySet<string>;
}

// --- Go Adapter ---

const GO_AI_PACKAGES = new Set([
  'github.com/sashabaranov/go-openai',
  'github.com/anthropics/anthropic-sdk-go',
  'cloud.google.com/go/ai/generativelanguage',
  'github.com/tmc/langchaingo',
  'github.com/cohere-ai/cohere-go',
]);

const GO_IMPORT_REGEX = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
const GO_SINGLE_IMPORT = /"([^"]+)"/g;

const goAdapter: LanguageAdapter = Object.freeze({
  id: 'go',
  name: 'Go',
  extensions: ['.go'],
  depFiles: ['go.mod', 'go.sum'],

  detectDeps: (content: string): readonly DepInfo[] => {
    const deps: DepInfo[] = [];
    // Parse go.mod require block
    const requireMatch = content.match(/require\s*\(([\s\S]*?)\)/);
    if (requireMatch) {
      const lines = requireMatch[1].split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const match = line.trim().match(/^(\S+)\s+(\S+)/);
        if (match) {
          const [, name = '', version = ''] = match;
          deps.push({
            name,
            version: version.replace(/^v/, ''),
            isAiSdk: GO_AI_PACKAGES.has(name),
            isBanned: false,
          });
        }
      }
    }
    // Single-line require (not followed by opening paren — those are block requires)
    const singleReqs = content.matchAll(/require\s+(?!\()(\S+)\s+(\S+)/g);
    for (const m of singleReqs) {
      const name = m[1] ?? '';
      deps.push({
        name,
        version: (m[2] ?? '').replace(/^v/, ''),
        isAiSdk: GO_AI_PACKAGES.has(name),
        isBanned: false,
      });
    }
    return deps;
  },

  extractImports: (content: string): readonly string[] => {
    const imports: string[] = [];
    let match: RegExpExecArray | null;
    const regex = new RegExp(GO_IMPORT_REGEX.source, 'g');
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        // Multi-line import block
        const innerRegex = new RegExp(GO_SINGLE_IMPORT.source, 'g');
        let inner: RegExpExecArray | null;
        while ((inner = innerRegex.exec(match[1])) !== null) {
          if (inner[1]) imports.push(inner[1]);
        }
      } else if (match[2]) {
        imports.push(match[2]);
      }
    }
    return imports;
  },

  aiPackages: GO_AI_PACKAGES,
});

// --- Rust Adapter ---

const RUST_AI_PACKAGES = new Set([
  'async-openai',
  'anthropic',
  'google-generative-ai',
  'llm',
  'candle-core',
  'tch',
  'rust-bert',
  'langchain-rust',
]);

const RUST_USE_REGEX = /use\s+([\w:]+(?:::\{[^}]+\})?)/g;

const rustAdapter: LanguageAdapter = Object.freeze({
  id: 'rust',
  name: 'Rust',
  extensions: ['.rs'],
  depFiles: ['Cargo.toml', 'Cargo.lock'],

  detectDeps: (content: string): readonly DepInfo[] => {
    const deps: DepInfo[] = [];
    // Parse [dependencies] section in Cargo.toml
    const depSection = content.match(/\[dependencies\]([\s\S]*?)(?:\[|$)/);
    if (depSection) {
      const lines = depSection[1].split('\n');
      for (const line of lines) {
        const match = line.match(/^(\S+)\s*=\s*(?:"([^"]+)"|{[^}]*version\s*=\s*"([^"]+)")/);
        if (match) {
          const name = match[1] ?? '';
          const version = match[2] ?? match[3] ?? '';
          deps.push({
            name,
            version,
            isAiSdk: RUST_AI_PACKAGES.has(name),
            isBanned: false,
          });
        }
      }
    }
    return deps;
  },

  extractImports: (content: string): readonly string[] => {
    const imports: string[] = [];
    const regex = new RegExp(RUST_USE_REGEX.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) imports.push(match[1]);
    }
    return imports;
  },

  aiPackages: RUST_AI_PACKAGES,
});

// --- Java Adapter ---

const JAVA_AI_PACKAGES = new Set([
  'dev.langchain4j',
  'com.theokanning.openai-gpt3-java',
  'com.google.cloud.aiplatform',
  'ai.djl',
  'org.deeplearning4j',
  'com.azure.ai.openai',
]);

const JAVA_IMPORT_REGEX = /import\s+([\w.]+(?:\.\*)?)\s*;/g;

const javaAdapter: LanguageAdapter = Object.freeze({
  id: 'java',
  name: 'Java',
  extensions: ['.java'],
  depFiles: ['pom.xml', 'build.gradle', 'build.gradle.kts'],

  detectDeps: (content: string): readonly DepInfo[] => {
    const deps: DepInfo[] = [];
    // Parse Maven pom.xml <dependency> blocks
    const depRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>(?:\s*<version>([^<]+)<\/version>)?/g;
    let match: RegExpExecArray | null;
    while ((match = depRegex.exec(content)) !== null) {
      const groupId = match[1] ?? '';
      const artifactId = match[2] ?? '';
      const version = match[3] ?? '';
      const name = `${groupId}:${artifactId}`;
      deps.push({
        name,
        version,
        isAiSdk: JAVA_AI_PACKAGES.has(groupId),
        isBanned: false,
      });
    }
    // Parse Gradle dependencies
    const gradleRegex = /(?:implementation|api|compile)\s+['"]([^'"]+)['"]/g;
    while ((match = gradleRegex.exec(content)) !== null) {
      const coord = match[1] ?? '';
      const parts = coord.split(':');
      const groupId = parts[0] ?? '';
      deps.push({
        name: coord,
        version: parts[2] ?? '',
        isAiSdk: JAVA_AI_PACKAGES.has(groupId),
        isBanned: false,
      });
    }
    return deps;
  },

  extractImports: (content: string): readonly string[] => {
    const imports: string[] = [];
    const regex = new RegExp(JAVA_IMPORT_REGEX.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      if (match[1]) imports.push(match[1]);
    }
    return imports;
  },

  aiPackages: JAVA_AI_PACKAGES,
});

// --- Registry ---

export const LANGUAGE_ADAPTERS: readonly LanguageAdapter[] = Object.freeze([goAdapter, rustAdapter, javaAdapter]);

export const getAdapterForExtension = (ext: string): LanguageAdapter | undefined =>
  LANGUAGE_ADAPTERS.find((a) => a.extensions.includes(ext));

export const getAdapterById = (id: string): LanguageAdapter | undefined =>
  LANGUAGE_ADAPTERS.find((a) => a.id === id);

export const detectProjectLanguages = (
  files: readonly { relativePath: string }[],
): readonly LanguageAdapter[] => {
  const found = new Set<string>();
  const adapters: LanguageAdapter[] = [];

  for (const file of files) {
    const ext = '.' + (file.relativePath.split('.').pop() ?? '');
    for (const adapter of LANGUAGE_ADAPTERS) {
      if (!found.has(adapter.id) && adapter.extensions.includes(ext)) {
        found.add(adapter.id);
        adapters.push(adapter);
      }
    }
    // Also check for dep files
    const filename = file.relativePath.split('/').pop() ?? '';
    for (const adapter of LANGUAGE_ADAPTERS) {
      if (!found.has(adapter.id) && adapter.depFiles.includes(filename)) {
        found.add(adapter.id);
        adapters.push(adapter);
      }
    }
  }

  return adapters;
};
