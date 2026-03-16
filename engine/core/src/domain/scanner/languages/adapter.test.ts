import { describe, it, expect } from 'vitest';
import { LANGUAGE_ADAPTERS, getAdapterForExtension, detectProjectLanguages } from './adapter.js';

describe('LanguageAdapters', () => {
  it('has Go, Rust, and Java adapters', () => {
    expect(LANGUAGE_ADAPTERS.length).toBe(3);
    expect(LANGUAGE_ADAPTERS.map((a) => a.id)).toEqual(['go', 'rust', 'java']);
  });

  it('getAdapterForExtension returns correct adapter', () => {
    expect(getAdapterForExtension('.go')?.id).toBe('go');
    expect(getAdapterForExtension('.rs')?.id).toBe('rust');
    expect(getAdapterForExtension('.java')?.id).toBe('java');
    expect(getAdapterForExtension('.ts')).toBeUndefined();
  });

  describe('Go adapter', () => {
    const go = LANGUAGE_ADAPTERS.find((a) => a.id === 'go')!;

    it('parses go.mod require block', () => {
      const gomod = `module example.com/myapp\n\ngo 1.21\n\nrequire (\n\tgithub.com/sashabaranov/go-openai v1.20.0\n\tgithub.com/gin-gonic/gin v1.9.1\n)`;
      const deps = go.detectDeps(gomod);
      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.name.includes('go-openai'))?.isAiSdk).toBe(true);
      expect(deps.find((d) => d.name.includes('gin'))?.isAiSdk).toBe(false);
    });

    it('extracts Go imports', () => {
      const code = `import (\n\t"fmt"\n\t"github.com/sashabaranov/go-openai"\n)`;
      const imports = go.extractImports(code);
      expect(imports).toContain('fmt');
      expect(imports).toContain('github.com/sashabaranov/go-openai');
    });
  });

  describe('Rust adapter', () => {
    const rust = LANGUAGE_ADAPTERS.find((a) => a.id === 'rust')!;

    it('parses Cargo.toml dependencies', () => {
      const toml = `[dependencies]\nasync-openai = "0.18"\ntokio = { version = "1.0", features = ["full"] }`;
      const deps = rust.detectDeps(toml);
      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.name === 'async-openai')?.isAiSdk).toBe(true);
      expect(deps.find((d) => d.name === 'tokio')?.isAiSdk).toBe(false);
    });

    it('extracts Rust use statements', () => {
      const code = `use async_openai::Client;\nuse tokio::runtime::Runtime;`;
      const imports = rust.extractImports(code);
      expect(imports).toContain('async_openai::Client');
      expect(imports).toContain('tokio::runtime::Runtime');
    });
  });

  describe('Java adapter', () => {
    const java = LANGUAGE_ADAPTERS.find((a) => a.id === 'java')!;

    it('parses Maven pom.xml dependencies', () => {
      const pom = `<dependency>\n  <groupId>dev.langchain4j</groupId>\n  <artifactId>langchain4j</artifactId>\n  <version>0.24.0</version>\n</dependency>`;
      const deps = java.detectDeps(pom);
      expect(deps.length).toBe(1);
      expect(deps[0]?.isAiSdk).toBe(true);
    });

    it('parses Gradle dependencies', () => {
      const gradle = `implementation 'dev.langchain4j:langchain4j:0.24.0'\nimplementation 'org.springframework:spring-core:6.0'`;
      const deps = java.detectDeps(gradle);
      expect(deps.length).toBe(2);
      expect(deps.find((d) => d.name.includes('langchain4j'))?.isAiSdk).toBe(true);
    });

    it('extracts Java imports', () => {
      const code = `import dev.langchain4j.model.openai.OpenAiChatModel;\nimport java.util.List;`;
      const imports = java.extractImports(code);
      expect(imports).toContain('dev.langchain4j.model.openai.OpenAiChatModel');
      expect(imports).toContain('java.util.List');
    });
  });

  describe('detectProjectLanguages', () => {
    it('detects Go by .go extension', () => {
      const files = [{ relativePath: 'main.go' }, { relativePath: 'src/utils.ts' }];
      const adapters = detectProjectLanguages(files);
      expect(adapters.map((a) => a.id)).toContain('go');
    });

    it('detects Rust by Cargo.toml', () => {
      const files = [{ relativePath: 'Cargo.toml' }, { relativePath: 'src/main.rs' }];
      const adapters = detectProjectLanguages(files);
      expect(adapters.map((a) => a.id)).toContain('rust');
    });

    it('detects Java by pom.xml', () => {
      const files = [{ relativePath: 'pom.xml' }];
      const adapters = detectProjectLanguages(files);
      expect(adapters.map((a) => a.id)).toContain('java');
    });

    it('returns empty for TS-only projects', () => {
      const files = [{ relativePath: 'src/app.ts' }, { relativePath: 'package.json' }];
      const adapters = detectProjectLanguages(files);
      expect(adapters.length).toBe(0);
    });
  });
});
