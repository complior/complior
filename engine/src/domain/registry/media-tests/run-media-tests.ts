/**
 * Stage 8 — Media API Tests.
 * Generates images (DALL-E, Stability) and audio (ElevenLabs),
 * then checks for C2PA / watermark / EXIF AI markers.
 *
 * Usage: npx tsx engine/src/domain/registry/media-tests/run-media-tests.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMediaMetadata, checkAudioMetadata } from './metadata-check.js';
import type { MediaTestResult } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', '..', '..', 'data');
const REGISTRY_DIR = join(DATA_DIR, 'registry');
const MEDIA_DIR = join(REGISTRY_DIR, 'media-tests');
const FILES_DIR = join(MEDIA_DIR, 'files');

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

// --- .env loading ---

function loadEnv(): void {
  const envPath = join(__dirname, '..', '..', '..', '..', '.env');
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

// --- Image prompts (from spec) ---

const IMAGE_PROMPTS = [
  'A red bicycle parked next to a wooden bench in a park with autumn leaves, photorealistic',
  'A corporate headshot of a person in a suit, studio lighting',
  'A news photograph of a crowd in a European city square',
];

const AUDIO_TEXT = 'Welcome to today\'s briefing. The weather in Berlin is cloudy with a chance of rain.';

// --- DALL-E (OpenAI) ---

interface DallEResponse {
  data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
}

async function testDallE(apiKey: string, prompt: string, outPath: string): Promise<MediaTestResult> {
  console.log(`  DALL-E: "${prompt.slice(0, 50)}..."`);
  try {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DALL-E API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const json = (await res.json()) as DallEResponse;
    const imageUrl = json.data[0]?.url;
    if (!imageUrl) throw new Error('No image URL in response');

    // Download image
    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(outPath, imgBuf);

    // Check metadata
    const meta = checkMediaMetadata(outPath);

    return {
      test_type: 'image',
      provider: 'OpenAI DALL-E 3',
      prompt,
      c2pa_present: meta.c2pa_present,
      watermark_present: meta.watermark_present,
      exif_ai_tag: meta.exif_ai_tag,
      file_path: outPath,
    };
  } catch (err) {
    console.error(`    Error: ${err instanceof Error ? err.message : String(err)}`);
    return {
      test_type: 'image',
      provider: 'OpenAI DALL-E 3',
      prompt,
      c2pa_present: false,
      watermark_present: false,
      exif_ai_tag: false,
      file_path: null,
    };
  }
}

// --- Stability AI ---

async function testStability(apiKey: string, prompt: string, outPath: string): Promise<MediaTestResult> {
  console.log(`  Stability: "${prompt.slice(0, 50)}..."`);
  try {
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('output_format', 'png');

    const res = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'image/*',
      },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Stability API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const imgBuf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, imgBuf);

    const meta = checkMediaMetadata(outPath);

    return {
      test_type: 'image',
      provider: 'Stability AI',
      prompt,
      c2pa_present: meta.c2pa_present,
      watermark_present: meta.watermark_present,
      exif_ai_tag: meta.exif_ai_tag,
      file_path: outPath,
    };
  } catch (err) {
    console.error(`    Error: ${err instanceof Error ? err.message : String(err)}`);
    return {
      test_type: 'image',
      provider: 'Stability AI',
      prompt,
      c2pa_present: false,
      watermark_present: false,
      exif_ai_tag: false,
      file_path: null,
    };
  }
}

// --- ElevenLabs TTS ---

async function testElevenLabs(apiKey: string, text: string, outPath: string): Promise<MediaTestResult> {
  console.log(`  ElevenLabs: "${text.slice(0, 50)}..."`);
  try {
    // Use Rachel voice (21m00Tcm4TlvDq8ikWAM) — default English voice
    const voiceId = '21m00Tcm4TlvDq8ikWAM';
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`ElevenLabs API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const audioBuf = Buffer.from(await res.arrayBuffer());
    writeFileSync(outPath, audioBuf);

    const meta = checkAudioMetadata(outPath);

    return {
      test_type: 'audio',
      provider: 'ElevenLabs',
      prompt: text,
      c2pa_present: meta.c2pa_present,
      watermark_present: meta.watermark_present,
      exif_ai_tag: meta.exif_ai_tag,
      file_path: outPath,
    };
  } catch (err) {
    console.error(`    Error: ${err instanceof Error ? err.message : String(err)}`);
    return {
      test_type: 'audio',
      provider: 'ElevenLabs',
      prompt: text,
      c2pa_present: false,
      watermark_present: false,
      exif_ai_tag: false,
      file_path: null,
    };
  }
}

// --- Replicate (FLUX) ---

async function testReplicate(apiKey: string, prompt: string, outPath: string): Promise<MediaTestResult> {
  console.log(`  Replicate FLUX: "${prompt.slice(0, 50)}..."`);
  try {
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell',
        input: { prompt, num_outputs: 1 },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Replicate API ${createRes.status}: ${errText.slice(0, 200)}`);
    }

    const prediction = (await createRes.json()) as { id: string; status: string; output?: string[] };
    let result = prediction;

    // Poll until completed
    for (let i = 0; i < 60; i++) {
      if (result.status === 'succeeded' || result.status === 'failed') break;
      await new Promise(r => setTimeout(r, 2000));
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      result = (await pollRes.json()) as typeof result;
    }

    if (result.status !== 'succeeded' || !result.output?.[0]) {
      throw new Error(`Replicate prediction failed: ${result.status}`);
    }

    // Download image
    const imgRes = await fetch(result.output[0]);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    writeFileSync(outPath, imgBuf);

    const meta = checkMediaMetadata(outPath);

    return {
      test_type: 'image',
      provider: 'Replicate FLUX',
      prompt,
      c2pa_present: meta.c2pa_present,
      watermark_present: meta.watermark_present,
      exif_ai_tag: meta.exif_ai_tag,
      file_path: outPath,
    };
  } catch (err) {
    console.error(`    Error: ${err instanceof Error ? err.message : String(err)}`);
    return {
      test_type: 'image',
      provider: 'Replicate FLUX',
      prompt,
      c2pa_present: false,
      watermark_present: false,
      exif_ai_tag: false,
      file_path: null,
    };
  }
}

// --- Main ---

async function main(): Promise<void> {
  loadEnv();
  ensureDir(MEDIA_DIR);
  ensureDir(FILES_DIR);

  console.log('=== Stage 8: Media API Tests ===\n');

  const results: MediaTestResult[] = [];
  const openaiKey = process.env['OPENAI_API_KEY'];
  const stabilityKey = process.env['STABILITY_API_KEY'];
  const elevenlabsKey = process.env['ELEVENLABS_API_KEY'];

  // --- DALL-E Tests ---
  if (openaiKey) {
    console.log('--- DALL-E 3 (OpenAI) ---');
    for (let i = 0; i < IMAGE_PROMPTS.length; i++) {
      const outPath = join(FILES_DIR, `dalle-${i + 1}.png`);
      const result = await testDallE(openaiKey, IMAGE_PROMPTS[i]!, outPath);
      results.push(result);
      console.log(`    C2PA: ${result.c2pa_present}, Watermark: ${result.watermark_present}, EXIF AI: ${result.exif_ai_tag}`);
    }
    console.log();
  } else {
    console.log('--- DALL-E: Skipped (no OPENAI_API_KEY) ---\n');
  }

  // --- Stability AI Tests ---
  if (stabilityKey) {
    console.log('--- Stability AI ---');
    for (let i = 0; i < IMAGE_PROMPTS.length; i++) {
      const outPath = join(FILES_DIR, `stability-${i + 1}.png`);
      const result = await testStability(stabilityKey, IMAGE_PROMPTS[i]!, outPath);
      results.push(result);
      console.log(`    C2PA: ${result.c2pa_present}, Watermark: ${result.watermark_present}, EXIF AI: ${result.exif_ai_tag}`);
    }
    console.log();
  } else {
    console.log('--- Stability AI: Skipped (no STABILITY_API_KEY) ---\n');
  }

  // --- ElevenLabs TTS Tests ---
  if (elevenlabsKey) {
    console.log('--- ElevenLabs TTS ---');
    const outPath = join(FILES_DIR, 'elevenlabs-1.mp3');
    const result = await testElevenLabs(elevenlabsKey, AUDIO_TEXT, outPath);
    results.push(result);
    console.log(`    C2PA: ${result.c2pa_present}, Watermark: ${result.watermark_present}, EXIF AI: ${result.exif_ai_tag}`);
    console.log();
  } else {
    console.log('--- ElevenLabs: Skipped (no ELEVENLABS_API_KEY) ---\n');
  }

  // --- Replicate FLUX Tests ---
  const replicateKey = process.env['REPLICATE_API_TOKEN'];
  if (replicateKey) {
    console.log('--- Replicate FLUX ---');
    for (let i = 0; i < IMAGE_PROMPTS.length; i++) {
      const outFile = join(FILES_DIR, `replicate-flux-${i + 1}.png`);
      const result = await testReplicate(replicateKey, IMAGE_PROMPTS[i]!, outFile);
      results.push(result);
      console.log(`    C2PA: ${result.c2pa_present}, Watermark: ${result.watermark_present}, EXIF AI: ${result.exif_ai_tag}`);
    }
    console.log();
  } else {
    console.log('--- Replicate FLUX: Skipped (no REPLICATE_API_TOKEN) ---\n');
  }

  // --- Save results ---
  const outPath = join(MEDIA_DIR, 'results.json');
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Written: ${outPath}`);

  // --- Summary ---
  const total = results.length;
  const withC2pa = results.filter(r => r.c2pa_present).length;
  const withWatermark = results.filter(r => r.watermark_present).length;
  const withExif = results.filter(r => r.exif_ai_tag).length;
  const failed = results.filter(r => r.file_path === null).length;

  console.log(`\n=== Media Tests Complete ===`);
  console.log(`Total tests: ${total}`);
  console.log(`  C2PA present: ${withC2pa}/${total}`);
  console.log(`  Watermark present: ${withWatermark}/${total}`);
  console.log(`  EXIF AI tag: ${withExif}/${total}`);
  console.log(`  Failed: ${failed}/${total}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
