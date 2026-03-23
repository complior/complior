/**
 * Media Tester — Generate and inspect AI-generated media content.
 *
 * For image/audio-generating tools:
 * 1. Generate test content via provider API
 * 2. Inspect binary for C2PA, EXIF AI tags, watermark patterns
 *
 * Pure JS binary inspection — no native dependencies.
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  // JUMBF box type for C2PA content credentials
  const JUMBF_MAGIC = [0x6A, 0x75, 0x6D, 0x62]; // 'jumb'
  const C2PA_MANIFEST = [0x63, 0x32, 0x70, 0x61]; // 'c2pa'

  // EXIF markers
  const EXIF_MARKER = [0xFF, 0xE1]; // APP1
  const DIGITAL_SOURCE_TYPE_TAG = 'digitalsourcetype';
  const TRAINED_ALGO_MEDIA = 'trainedalgorithmicmedia';

  // Known watermark patterns
  const DALL_E_SIGNATURE = [0x64, 0x61, 0x6C, 0x6C, 0x2D, 0x65]; // 'dall-e' in metadata

  // ── Binary Inspection ─────────────────────────────────────────────

  const findSequence = (buffer, sequence, startFrom) => {
    const start = startFrom || 0;
    for (let i = start; i <= buffer.length - sequence.length; i++) {
      let found = true;
      for (let j = 0; j < sequence.length; j++) {
        if (buffer[i + j] !== sequence[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  };

  const detectC2PA = (buffer) => {
    // Look for JUMBF box containing C2PA manifest
    const jumbfPos = findSequence(buffer, JUMBF_MAGIC);
    if (jumbfPos === -1) return false;

    // Check for c2pa identifier nearby (within 64 bytes)
    const c2paPos = findSequence(buffer, C2PA_MANIFEST, jumbfPos);
    return c2paPos !== -1 && (c2paPos - jumbfPos) < 64;
  };

  const detectExifAiTag = (buffer) => {
    // Look for EXIF APP1 marker and scan for DigitalSourceType
    const exifPos = findSequence(buffer, EXIF_MARKER);
    if (exifPos === -1) return false;

    // Convert a region around EXIF to lowercase string for tag search
    const searchEnd = Math.min(buffer.length, exifPos + 65536);
    const region = buffer.slice(exifPos, searchEnd);
    const asText = Array.from(region)
      .map((b) => (b >= 32 && b < 127) ? String.fromCharCode(b) : ' ')
      .join('')
      .toLowerCase();

    return asText.includes(DIGITAL_SOURCE_TYPE_TAG) && asText.includes(TRAINED_ALGO_MEDIA);
  };

  const detectWatermark = (buffer) => {
    // Check for known watermark signatures
    // 1. DALL-E signature bytes
    if (findSequence(buffer, DALL_E_SIGNATURE) !== -1) return true;

    // 2. PNG tEXt/iTXt chunk with AI metadata
    // tEXt chunk type: [0x74, 0x45, 0x58, 0x74]
    const pngTextChunk = [0x74, 0x45, 0x58, 0x74];
    let pos = findSequence(buffer, pngTextChunk);
    while (pos !== -1) {
      const chunkEnd = Math.min(buffer.length, pos + 1024);
      const chunkText = Array.from(buffer.slice(pos, chunkEnd))
        .map((b) => (b >= 32 && b < 127) ? String.fromCharCode(b) : '')
        .join('')
        .toLowerCase();
      if (chunkText.includes('ai-generated') || chunkText.includes('synthetic') || chunkText.includes('dall-e')) {
        return true;
      }
      pos = findSequence(buffer, pngTextChunk, pos + 4);
    }

    // 3. JPEG COM marker with AI info
    const jpegCom = [0xFF, 0xFE]; // COM marker
    const comPos = findSequence(buffer, jpegCom);
    if (comPos !== -1) {
      const comEnd = Math.min(buffer.length, comPos + 512);
      const comText = Array.from(buffer.slice(comPos, comEnd))
        .map((b) => (b >= 32 && b < 127) ? String.fromCharCode(b) : '')
        .join('')
        .toLowerCase();
      if (comText.includes('ai') || comText.includes('generated') || comText.includes('synthetic')) {
        return true;
      }
    }

    return false;
  };

  const inspectBuffer = (buffer) => ({
    c2pa_present: detectC2PA(buffer),
    exif_ai_tag: detectExifAiTag(buffer),
    watermark_present: detectWatermark(buffer),
  });

  // ── API Generators ────────────────────────────────────────────────

  const generateOpenAIImage = async (fetch, apiConfig, testPrompt, timeoutMs) => {
    const apiKey = process.env?.[apiConfig.apiKeyEnv] || '';
    if (!apiKey) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: apiConfig.model,
          prompt: testPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!response.ok) return null;

      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      if (!b64) return null;

      return Buffer.from(b64, 'base64');
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  const generateStabilityImage = async (fetch, apiConfig, testPrompt, timeoutMs) => {
    const apiKey = process.env?.[apiConfig.apiKeyEnv] || '';
    if (!apiKey) return null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(apiConfig.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          text_prompts: [{ text: testPrompt }],
          cfg_scale: 7,
          steps: 30,
          samples: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      if (!response.ok) return null;

      const data = await response.json();
      const b64 = data.artifacts?.[0]?.base64;
      if (!b64) return null;

      return Buffer.from(b64, 'base64');
    } catch {
      clearTimeout(timer);
      return null;
    }
  };

  // ── Main Factory ──────────────────────────────────────────────────

  return ({ fetch, config, console }) => {
    const mediaConfig = (config && config.enrichment && config.enrichment.mediaTester) || {};
    const timeoutMs = mediaConfig.timeoutMs || 60000;
    const testPrompt = mediaConfig.testPrompt || 'A simple red circle on white background, test image';

    return {
      async test(tool, mediaApiConfig) {
        if (!mediaApiConfig || mediaApiConfig.type === 'none') {
          return null;
        }

        const results = [];

        try {
          let imageBuffer = null;

          if (mediaApiConfig.type === 'openai-images') {
            imageBuffer = await generateOpenAIImage(fetch, mediaApiConfig, testPrompt, timeoutMs);
          } else if (mediaApiConfig.type === 'stability') {
            imageBuffer = await generateStabilityImage(
              fetch, mediaApiConfig, testPrompt, timeoutMs,
            );
          }

          if (!imageBuffer) {
            console.log(`  ⚠ No image generated for ${tool.slug} (API unavailable or key missing)`);
            return [];
          }

          const inspection = inspectBuffer(imageBuffer);

          results.push({
            test_type: 'image_generation',
            type: 'image',
            provider: tool.slug,
            prompt: testPrompt,
            ...inspection,
            buffer_size: imageBuffer.length,
            tested_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`  Media test error for ${tool.slug}: ${err.message}`);
          results.push({
            test_type: 'image_generation',
            type: 'image',
            provider: tool.slug,
            error: err.message,
            c2pa_present: false,
            exif_ai_tag: false,
            watermark_present: false,
          });
        }

        return results;
      },

      // Exposed for testing
      inspectBuffer,
    };
  };
})()
