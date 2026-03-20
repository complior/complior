import { describe, it, expect } from 'vitest';
import { buildFixDiff, buildCodeContext } from './fix-diff-builder.js';

describe('buildCodeContext', () => {
  it('extracts surrounding lines with highlight', () => {
    const content = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n');
    const ctx = buildCodeContext(content, 10);
    expect(ctx.highlightLine).toBe(10);
    expect(ctx.startLine).toBe(5);
    expect(ctx.lines.length).toBe(11);
  });
});

// --- Bare LLM ---

describe('buildFixDiff — bare LLM', () => {
  it('wraps constructor with complior()', () => {
    const content = "import OpenAI from 'openai';\nconst client = new OpenAI();";
    const diff = buildFixDiff(content, 2, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(new OpenAI(');
    expect(diff!.importLine).toBe("import { complior } from '@complior/sdk';");
  });

  it('wraps Groq constructor', () => {
    const content = "import Groq from 'groq-sdk';\nconst client = new Groq();";
    const diff = buildFixDiff(content, 2, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(new Groq(');
  });

  it('skips import line when already imported', () => {
    const content = "import { complior } from '@complior/sdk';\nconst client = new OpenAI();";
    const diff = buildFixDiff(content, 2, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.importLine).toBeUndefined();
  });

  it('wraps method call fallback', () => {
    const content = 'const r = await ai.messages.create({ model: "claude" });';
    const diff = buildFixDiff(content, 1, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(ai).');
  });

  it('wraps Ollama constructor', () => {
    const content = "import { Ollama } from 'ollama';\nconst ollama = new Ollama({ host: 'http://localhost:11434' });";
    const diff = buildFixDiff(content, 2, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(new Ollama(');
  });

  it('wraps BedrockRuntimeClient constructor', () => {
    const content = "const client = new BedrockRuntimeClient({ region: 'us-east-1' });";
    const diff = buildFixDiff(content, 1, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(new BedrockRuntimeClient(');
  });

  it('wraps images.generate call', () => {
    const content = 'const r = await openai.images.generate({ prompt: "cat" });';
    const diff = buildFixDiff(content, 1, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(openai).');
  });

  it('wraps ollama.chat call', () => {
    const content = "const ollama = new Ollama();\nconst r = await ollama.chat({ model: 'llama3' });";
    const diff = buildFixDiff(content, 2, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    // Should find constructor on line 1 and wrap there
    expect(diff!.after[0]).toContain('complior(new Ollama(');
  });

  it('wraps standalone generateText call', () => {
    const content = '  const result = await generateText({\n    model: openai("gpt-4"),\n  });';
    const diff = buildFixDiff(content, 1, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(generateText)');
  });

  it('wraps standalone streamText call', () => {
    const content = '  const result = await streamText({\n    model: openai("gpt-4"),\n  });';
    const diff = buildFixDiff(content, 1, 'src/ai.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(streamText)');
  });

  it('forward-scans from import to constructor', () => {
    const lines = [
      "import {",
      "  BedrockRuntimeClient,",
      "  InvokeModelCommand,",
      "} from '@aws-sdk/client-bedrock-runtime';",
      "",
      "const client = new BedrockRuntimeClient({",
      "  region: 'us-east-1',",
      "});",
    ];
    const content = lines.join('\n');
    // Scanner finds bare-llm at line 2 (import line)
    const diff = buildFixDiff(content, 2, 'src/bedrock.ts', 'l4-bare-llm');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('complior(new BedrockRuntimeClient(');
    expect(diff!.startLine).toBe(6); // Constructor is on line 6
  });
});

// --- NHI (secrets) ---

describe('buildFixDiff — NHI', () => {
  it('replaces TS secret with process.env', () => {
    const content = "const API_KEY = 'sk-1234567890abcdef';";
    const diff = buildFixDiff(content, 1, 'src/config.ts', 'l4-nhi-openai-key');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('process.env.API_KEY');
    expect(diff!.after[0]).not.toContain('sk-');
  });

  it('replaces Python secret with os.environ.get', () => {
    const content = 'API_KEY = "sk-1234567890abcdef"';
    const diff = buildFixDiff(content, 1, 'config.py', 'l4-nhi-generic-secret');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain("os.environ.get('API_KEY'");
    expect(diff!.importLine).toBe('import os');
  });

  it('replaces connection string with env var', () => {
    const content = "const db = 'postgresql://user:pass@localhost/mydb';";
    const diff = buildFixDiff(content, 1, 'src/db.ts', 'l4-nhi-connection-string');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('process.env.DATABASE_URL');
  });

  it('replaces single-line private key with env var (TS)', () => {
    const content = "const key = '-----BEGIN RSA PRIVATE KEY----- ...';";
    const diff = buildFixDiff(content, 1, 'src/auth.ts', 'l4-nhi-private-key');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('process.env.KEY');
  });

  it('replaces multi-line private key with env var (Python)', () => {
    const lines = [
      'PRIVATE_KEY = """-----BEGIN RSA PRIVATE KEY-----',
      'MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn',
      '-----END RSA PRIVATE KEY-----"""',
    ];
    const content = lines.join('\n');
    const diff = buildFixDiff(content, 1, 'src/auth.py', 'l4-nhi-private-key');
    expect(diff).toBeDefined();
    expect(diff!.before).toHaveLength(3);
    expect(diff!.after).toHaveLength(1);
    expect(diff!.after[0]).toContain("os.environ.get('PRIVATE_KEY'");
    expect(diff!.importLine).toBe('import os');
  });

  it('skips l4-nhi-clean', () => {
    const content = "const x = process.env.KEY ?? '';";
    const diff = buildFixDiff(content, 1, 'src/config.ts', 'l4-nhi-clean');
    expect(diff).toBeUndefined();
  });

  it('replaces object property secret with process.env', () => {
    const content = "  openai: 'sk-proj-aB3cD4eF5gH6iJ7kL8mN9oP0',";
    const diff = buildFixDiff(content, 1, 'src/config.ts', 'l4-nhi-api_key');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('process.env.OPENAI');
    expect(diff!.after[0]).not.toContain('sk-');
  });

  it('skips lines already using process.env', () => {
    const content = "  apiKey: process.env.ANTHROPIC_API_KEY,";
    const diff = buildFixDiff(content, 1, 'src/config.ts', 'l4-nhi-api_key');
    expect(diff).toBeUndefined();
  });
});

// --- Security risk ---

describe('buildFixDiff — security risk', () => {
  it('replaces pickle.load with json.load', () => {
    const content = 'model = pickle.load(f)';
    const diff = buildFixDiff(content, 1, 'ml/model.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('json.load(f)');
    expect(diff!.importLine).toBe('import json');
  });

  it('replaces hashlib.md5 with hashlib.sha256', () => {
    const content = 'h = hashlib.md5(data)';
    const diff = buildFixDiff(content, 1, 'utils.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('hashlib.sha256');
  });

  it('replaces verify=False with verify=True', () => {
    const content = 'r = requests.get(url, verify=False)';
    const diff = buildFixDiff(content, 1, 'api.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('verify=True');
  });

  it('replaces shell=True with shell=False', () => {
    const content = 'subprocess.run(cmd, shell=True)';
    const diff = buildFixDiff(content, 1, 'run.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('shell=False');
  });

  it('disables eval()', () => {
    const content = 'const result = eval(userInput);';
    const diff = buildFixDiff(content, 1, 'src/app.ts', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('COMPLIOR: eval() disabled');
    expect(diff!.after[0]).toContain('undefined');
  });

  it('replaces rejectUnauthorized: false', () => {
    const content = '  rejectUnauthorized: false,';
    const diff = buildFixDiff(content, 1, 'src/tls.ts', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('rejectUnauthorized: true');
  });

  it('adds weights_only to torch.load', () => {
    const content = 'model = torch.load(path)';
    const diff = buildFixDiff(content, 1, 'ml/train.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('weights_only=True');
  });

  it('disables new Function()', () => {
    const content = 'const fn = new Function("return 1")';
    const diff = buildFixDiff(content, 1, 'src/dyn.ts', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('COMPLIOR: new Function() disabled');
  });

  it('replaces os.system with subprocess.run', () => {
    const content = 'os.system(cmd)';
    const diff = buildFixDiff(content, 1, 'deploy.py', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('subprocess.run');
    expect(diff!.importLine).toBe('import subprocess');
  });

  it('falls back to NHI for hardcoded secret patterns', () => {
    const content = "  openai: 'sk-proj-aB3cD4eF5gH6iJ7kL8mN9oP0',";
    const diff = buildFixDiff(content, 1, 'src/config.ts', 'l4-security-risk');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('process.env.');
    expect(diff!.after[0]).not.toContain('sk-');
  });

  it('skips process.env references even for security-risk', () => {
    const content = "  apiKey: process.env.ANTHROPIC_API_KEY,";
    const diff = buildFixDiff(content, 1, 'src/chat.ts', 'l4-security-risk');
    expect(diff).toBeUndefined();
  });
});

// --- Error handling ---

describe('buildFixDiff — error handling', () => {
  it('wraps single-line TS LLM call in try/catch', () => {
    const content = '  const r = await client.messages.create({ model: "claude-3" });';
    const diff = buildFixDiff(content, 1, 'src/chat.ts', 'l4-ast-missing-error-handling');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('try {');
    expect(diff!.after.some(l => l.includes('catch (err)'))).toBe(true);
    expect(diff!.after.some(l => l.includes('throw err'))).toBe(true);
  });

  it('wraps multi-line TS LLM call', () => {
    const lines = [
      '  const r = await client.messages.create({',
      '    model: "claude-3",',
      '    messages: [{ role: "user", content: "hi" }],',
      '  });',
    ];
    const content = lines.join('\n');
    const diff = buildFixDiff(content, 1, 'src/chat.ts', 'l4-ast-missing-error-handling');
    expect(diff).toBeDefined();
    expect(diff!.before).toHaveLength(4);
    expect(diff!.after[0]).toContain('try {');
    expect(diff!.after[diff!.after.length - 1]).toContain('}');
  });

  it('wraps Python LLM call in try/except', () => {
    const content = '    response = client.chat.completions.create(model="gpt-4")';
    const diff = buildFixDiff(content, 1, 'src/agent.py', 'l4-ast-missing-error-handling');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('try:');
    expect(diff!.after.some(l => l.includes('except Exception'))).toBe(true);
    expect(diff!.after.some(l => l.includes('raise'))).toBe(true);
  });

  it('wraps images.generate in try/catch', () => {
    const content = '  const r = await openai.images.generate({ prompt: "cat" });';
    const diff = buildFixDiff(content, 1, 'src/gen.ts', 'l4-ast-missing-error-handling');
    expect(diff).toBeDefined();
    expect(diff!.after[0]).toContain('try {');
  });
});

// --- Banned dep ---

describe('buildFixDiff — banned dep', () => {
  it('removes banned dep from package.json (with trailing comma)', () => {
    const content = [
      '{',
      '  "dependencies": {',
      '    "emotion-recognition": "^1.0.0",',
      '    "express": "^4.18.0"',
      '  }',
      '}',
    ].join('\n');
    const diff = buildFixDiff(content, 0, 'package.json', 'l3-banned-emotion-recognition');
    expect(diff).toBeDefined();
    expect(diff!.before).toEqual(['    "emotion-recognition": "^1.0.0",']);
    expect(diff!.after).toEqual([]);
  });

  it('removes last entry and cleans trailing comma from previous line', () => {
    const content = [
      '{',
      '  "dependencies": {',
      '    "express": "^4.18.0",',
      '    "emotion-recognition": "^1.0.0"',
      '  }',
      '}',
    ].join('\n');
    const diff = buildFixDiff(content, 0, 'package.json', 'l3-banned-emotion-recognition');
    expect(diff).toBeDefined();
    expect(diff!.after.length).toBeLessThan(diff!.before.length);
  });

  it('removes banned dep from requirements.txt', () => {
    const content = 'flask==2.3.0\nemotion-recognition==1.0.0\nrequests==2.31.0';
    const diff = buildFixDiff(content, 0, 'requirements.txt', 'l3-banned-emotion-recognition');
    expect(diff).toBeDefined();
    expect(diff!.before).toEqual(['emotion-recognition==1.0.0']);
    expect(diff!.after).toEqual([]);
  });

  it('returns undefined when package not found in file', () => {
    const content = '{ "dependencies": { "express": "^4.0.0" } }';
    const diff = buildFixDiff(content, 0, 'package.json', 'l3-banned-nonexistent');
    expect(diff).toBeUndefined();
  });
});
