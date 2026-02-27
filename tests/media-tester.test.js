'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const loadModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

describe('Media Tester', () => {
  let testerFactory;
  let mockConsole;

  beforeEach(() => {
    testerFactory = loadModule(
      path.join(__dirname, '../app/domain/registry/media-tester.js'),
    );
    mockConsole = { log: () => {}, error: () => {}, warn: () => {} };
  });

  // ── C2PA Detection ──────────────────────────────────────────────

  it('detects C2PA JUMBF magic bytes in image buffer', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });

    // Create buffer with JUMBF + C2PA signatures
    const buf = Buffer.alloc(128, 0);
    // 'jumb' at offset 20
    buf[20] = 0x6A; buf[21] = 0x75; buf[22] = 0x6D; buf[23] = 0x62;
    // 'c2pa' at offset 30
    buf[30] = 0x63; buf[31] = 0x32; buf[32] = 0x70; buf[33] = 0x61;

    const result = tester.inspectBuffer(buf);
    assert.strictEqual(result.c2pa_present, true);
  });

  it('returns c2pa_present=false when no JUMBF bytes', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const buf = Buffer.alloc(128, 0);
    const result = tester.inspectBuffer(buf);

    assert.strictEqual(result.c2pa_present, false);
  });

  // ── EXIF AI Tag Detection ──────────────────────────────────────

  it('detects EXIF AI tag (DigitalSourceType = trainedAlgorithmicMedia)', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });

    // Create buffer with EXIF APP1 marker and DigitalSourceType
    const textContent = 'DigitalSourceType trainedAlgorithmicMedia';
    const buf = Buffer.alloc(256, 0);
    // APP1 marker
    buf[0] = 0xFF; buf[1] = 0xE1;
    // Write the text content after the marker
    Buffer.from(textContent, 'ascii').copy(buf, 10);

    const result = tester.inspectBuffer(buf);
    assert.strictEqual(result.exif_ai_tag, true);
  });

  it('returns exif_ai_tag=false when no EXIF marker', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const buf = Buffer.alloc(128, 0x20); // spaces
    const result = tester.inspectBuffer(buf);

    assert.strictEqual(result.exif_ai_tag, false);
  });

  // ── Watermark Detection ────────────────────────────────────────

  it('detects DALL-E signature bytes', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const buf = Buffer.alloc(128, 0);
    // 'dall-e' signature
    const sig = Buffer.from('dall-e', 'ascii');
    sig.copy(buf, 50);

    const result = tester.inspectBuffer(buf);
    assert.strictEqual(result.watermark_present, true);
  });

  it('detects PNG tEXt chunk with AI metadata', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const buf = Buffer.alloc(256, 0);
    // tEXt chunk type
    buf[10] = 0x74; buf[11] = 0x45; buf[12] = 0x58; buf[13] = 0x74;
    // Write 'ai-generated' after chunk type
    Buffer.from('ai-generated', 'ascii').copy(buf, 20);

    const result = tester.inspectBuffer(buf);
    assert.strictEqual(result.watermark_present, true);
  });

  it('returns watermark_present=false for clean buffer', () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const buf = Buffer.alloc(128, 0);
    const result = tester.inspectBuffer(buf);

    assert.strictEqual(result.watermark_present, false);
  });

  // ── API Integration ────────────────────────────────────────────

  it('returns null for tools with type=none', async () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const result = await tester.test({ slug: 'midjourney' }, { type: 'none' });

    assert.strictEqual(result, null);
  });

  it('returns null when no API config provided', async () => {
    const tester = testerFactory({ fetch: async () => ({}), config: {}, console: mockConsole });
    const result = await tester.test({ slug: 'test' }, null);

    assert.strictEqual(result, null);
  });

  it('returns empty array when API key is missing for openai-images', async () => {
    // Save and clear env
    const saved = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.alloc(64).toString('base64') }] }),
    });
    const tester = testerFactory({ fetch: mockFetch, config: {}, console: mockConsole });
    const result = await tester.test(
      { slug: 'dall-e-3' },
      { type: 'openai-images', endpoint: 'https://api.openai.com/v1/images/generations', model: 'dall-e-3', apiKeyEnv: 'OPENAI_API_KEY' },
    );

    assert.deepStrictEqual(result, []);

    // Restore env
    if (saved !== undefined) process.env.OPENAI_API_KEY = saved;
  });
});
