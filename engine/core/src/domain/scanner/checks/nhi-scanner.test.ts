import { describe, it, expect } from 'vitest';
import { runNhiScan, nhiToCheckResults } from './nhi-scanner.js';
import type { ScanContext } from '../../../ports/scanner.port.js';

const makeCtx = (files: { relativePath: string; content: string }[]): ScanContext => ({
  projectPath: '/test',
  files: files.map(f => ({
    path: `/test/${f.relativePath}`,
    relativePath: f.relativePath,
    content: f.content,
    extension: f.relativePath.split('.').pop() ?? '',
  })),
});

describe('runNhiScan', () => {
  it('detects OpenAI key in source', () => {
    const ctx = makeCtx([{
      relativePath: 'src/config.ts',
      content: 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456";',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('api_key');
    expect(results[0].file).toBe('src/config.ts');
    expect(results[0].line).toBe(1);
  });

  it('detects multiple secrets in same file', () => {
    const ctx = makeCtx([{
      relativePath: 'src/config.ts',
      content: 'const openai = "sk-abcdefghijklmnopqrstuvwxyz123456";\nconst aws = "AKIAIOSFODNN7EXAMPLE";',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(2);
  });

  it('skips test files', () => {
    const ctx = makeCtx([{
      relativePath: 'src/config.test.ts',
      content: 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456";',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(0);
  });

  it('skips .env.example files', () => {
    const ctx = makeCtx([{
      relativePath: '.env.example',
      content: 'OPENAI_KEY=sk-abcdefghijklmnopqrstuvwxyz123456',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(0);
  });

  it('detects private key', () => {
    const ctx = makeCtx([{
      relativePath: 'certs/key.pem',
      content: '-----BEGIN RSA PRIVATE KEY-----\nMIIBogIBAAJBALRiMLAH...',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('secret');
  });

  it('detects GCP service account', () => {
    const ctx = makeCtx([{
      relativePath: 'gcp-creds.json',
      content: '{\n"type": "service_account",\n"project_id": "test"\n}',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('service_account');
  });

  it('detects JWT token', () => {
    const ctx = makeCtx([{
      relativePath: 'src/auth.ts',
      content: 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456";',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('token');
  });

  it('masks detected secrets', () => {
    const ctx = makeCtx([{
      relativePath: 'src/config.ts',
      content: 'const key = "sk-abcdefghijklmnopqrstuvwxyz123456";',
    }]);
    const results = runNhiScan(ctx);
    expect(results[0].match).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(results[0].match).toMatch(/^sk-a\.\.\.3456$/);
  });

  it('returns empty for clean codebase', () => {
    const ctx = makeCtx([{
      relativePath: 'src/app.ts',
      content: 'const app = express();\napp.listen(3000);',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(0);
  });

  it('detects connection strings', () => {
    const ctx = makeCtx([{
      relativePath: 'src/db.ts',
      content: 'const url = "mongodb://admin:secretpass@cluster.mongodb.net/db";',
    }]);
    const results = runNhiScan(ctx);
    expect(results.length).toBe(1);
    expect(results[0].category).toBe('secret');
  });
});

describe('nhiToCheckResults', () => {
  it('returns pass when no findings', () => {
    const results = nhiToCheckResults([]);
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('pass');
    expect(results[0].checkId).toBe('l4-nhi-clean');
  });

  it('converts findings to fail check results', () => {
    const findings = [{
      patternId: 'nhi-openai-key',
      patternName: 'OpenAI API Key',
      category: 'api_key' as const,
      severity: 'critical' as const,
      file: 'src/config.ts',
      line: 5,
      match: 'sk-a...3456',
      description: 'OpenAI API key detected',
    }];
    const results = nhiToCheckResults(findings);
    expect(results.length).toBe(1);
    expect(results[0].type).toBe('fail');
    expect(results[0].checkId).toBe('l4-nhi-api_key');
    if (results[0].type === 'fail') {
      expect(results[0].severity).toBe('critical');
      expect(results[0].articleReference).toBe('Art. 15(4)');
      expect(results[0].file).toBe('src/config.ts');
      expect(results[0].line).toBe(5);
    }
  });

  it('maps severity correctly', () => {
    const makeFinding = (severity: 'critical' | 'high' | 'medium') => [{
      patternId: 'test', patternName: 'Test', category: 'secret' as const,
      severity, file: 'f.ts', line: 1, match: '***', description: 'test',
    }];
    const critical = nhiToCheckResults(makeFinding('critical'));
    if (critical[0].type === 'fail') expect(critical[0].severity).toBe('critical');
    const high = nhiToCheckResults(makeFinding('high'));
    if (high[0].type === 'fail') expect(high[0].severity).toBe('high');
    const medium = nhiToCheckResults(makeFinding('medium'));
    if (medium[0].type === 'fail') expect(medium[0].severity).toBe('medium');
  });
});
