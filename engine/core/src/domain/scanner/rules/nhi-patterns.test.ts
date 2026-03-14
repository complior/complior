import { describe, it, expect } from 'vitest';
import { NHI_PATTERNS, shouldScanFile } from './nhi-patterns.js';

describe('NHI_PATTERNS', () => {
  it('has at least 20 patterns', () => {
    expect(NHI_PATTERNS.length).toBeGreaterThanOrEqual(20);
  });

  it('detects OpenAI key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-openai-key')!;
    expect(p.pattern.test(fake('sk-', 'abcdefghijklmnopqrstuvwx'))).toBe(true);
    expect(p.pattern.test('sk-short')).toBe(false);
  });

  it('detects Anthropic key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-anthropic-key')!;
    expect(p.pattern.test(fake('sk-ant-api03-', 'abcdefghijklmnopqrst'))).toBe(true);
    expect(p.pattern.test('sk-ant-short')).toBe(false);
  });

  it('detects AWS access key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-aws-access-key')!;
    expect(p.pattern.test(fake('AKIA', 'IOSFODNN7EXAMPLE'))).toBe(true);
    expect(p.pattern.test('AKIA12345')).toBe(false);
  });

  it('detects GitHub PAT', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-github-pat')!;
    expect(p.pattern.test(fake('ghp_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij'))).toBe(true);
  });

  it('detects Google API key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-google-api-key')!;
    expect(p.pattern.test(fake('AIzaSy', 'A1234567890abcdefghijklmnopqrstuvw'))).toBe(true);
  });

  it('detects Slack bot token', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-slack-bot')!;
    expect(p.pattern.test(fake('xoxb-', '0000000000-0000000000-TESTFAKETESTFAKETESTFAKE'))).toBe(true);
  });

  it('detects Stripe live key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-stripe-key')!;
    expect(p.pattern.test(fake('sk_live_', 'TESTFAKETESTFAKETESTFAKE'))).toBe(true);
  });

  it('detects private key header', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-private-key')!;
    expect(p.pattern.test('-----BEGIN RSA PRIVATE KEY-----')).toBe(true);
    expect(p.pattern.test('-----BEGIN EC PRIVATE KEY-----')).toBe(true);
    expect(p.pattern.test('-----BEGIN PRIVATE KEY-----')).toBe(true);
  });

  it('detects GCP service account', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-gcp-service-account')!;
    expect(p.pattern.test('"type": "service_account"')).toBe(true);
    expect(p.pattern.test('"type" : "service_account"')).toBe(true);
  });

  it('detects AWS secret key assignment', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-aws-secret')!;
    expect(p.pattern.test('aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"')).toBe(true);
  });

  it('detects hardcoded password', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-password-assign')!;
    expect(p.pattern.test('password = "my-secret-password-123"')).toBe(true);
    expect(p.pattern.test("password = 'short'")).toBe(false); // too short
  });

  it('detects connection string', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-connection-string')!;
    expect(p.pattern.test('mongodb://admin:secret@localhost:27017')).toBe(true);
    expect(p.pattern.test('postgres://user:pass@db.example.com/mydb')).toBe(true);
  });

  it('detects JWT token', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-jwt')!;
    expect(p.pattern.test('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123def456')).toBe(true);
  });

  it('detects NPM token', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-npm-token')!;
    expect(p.pattern.test(fake('npm_', 'abcdefghijklmnopqrstuvwxyz1234567890'))).toBe(true);
  });

  it('detects SendGrid API key', () => {
    const p = NHI_PATTERNS.find(p => p.id === 'nhi-sendgrid-key')!;
    expect(p.pattern.test(fake('SG.', 'TESTFAKETESTFAKETESTFA.TESTFAKETESTFAKETESTFAKETESTFAKETESTFA12TEST'))).toBe(true);
  });

  it('all patterns have required fields', () => {
    for (const p of NHI_PATTERNS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.category).toMatch(/^(api_key|service_account|secret|token)$/);
      expect(p.severity).toMatch(/^(critical|high|medium)$/);
      expect(p.pattern).toBeInstanceOf(RegExp);
      expect(p.description).toBeTruthy();
    }
  });
});

describe('shouldScanFile', () => {
  it('excludes .env.example files', () => {
    expect(shouldScanFile('.env.example')).toBe(false);
  });

  it('excludes test files', () => {
    expect(shouldScanFile('src/scanner.test.ts')).toBe(false);
    expect(shouldScanFile('src/scanner.spec.ts')).toBe(false);
    expect(shouldScanFile('__tests__/foo.ts')).toBe(false);
  });

  it('excludes snapshots', () => {
    expect(shouldScanFile('src/__snapshots__/foo.snap')).toBe(false);
  });

  it('includes regular source files', () => {
    expect(shouldScanFile('src/config.ts')).toBe(true);
    expect(shouldScanFile('lib/app.js')).toBe(true);
    expect(shouldScanFile('.env')).toBe(true);
  });
});
