/**
 * Binary metadata checks for AI-generated media.
 * Checks C2PA, EXIF AI markers, and watermark indicators
 * without external tools (pure JS parsing).
 */

import { readFileSync } from 'node:fs';

export interface MetadataResult {
  readonly c2pa_present: boolean;
  readonly c2pa_details: string | null;
  readonly watermark_present: boolean;
  readonly watermark_details: string | null;
  readonly exif_ai_tag: boolean;
  readonly exif_details: string | null;
  readonly raw_markers: readonly string[];
}

/**
 * Check a binary file for C2PA, watermark, and EXIF AI markers.
 * Uses byte-level pattern matching — no external tools needed.
 */
export function checkMediaMetadata(filePath: string): MetadataResult {
  const buf = readFileSync(filePath);
  const text = buf.toString('latin1');
  const markers: string[] = [];

  // --- C2PA / Content Credentials ---
  // C2PA manifests contain JUMBF boxes with "c2pa" UUID or "c2pa" string
  const c2paPatterns = [
    'c2pa',
    'content_credentials',
    'C2PA_Manifest',
    'c2pa.actions',
    'c2pa.hash',
    'contentauth',
    'cai:', // Content Authenticity Initiative prefix
  ];
  let c2pa = false;
  let c2paDetail: string | null = null;
  for (const p of c2paPatterns) {
    if (text.includes(p)) {
      c2pa = true;
      markers.push(`C2PA: found '${p}'`);
      c2paDetail = `C2PA marker '${p}' found in binary`;
      break;
    }
  }

  // Also check for JUMBF box (JP2 universal metadata box format used by C2PA)
  // JUMBF signature: 'jumb' or 'jumd'
  if (!c2pa && (text.includes('jumb') || text.includes('jumd'))) {
    c2pa = true;
    c2paDetail = 'JUMBF box detected (C2PA container)';
    markers.push('C2PA: JUMBF box');
  }

  // --- EXIF AI Markers ---
  // IPTC DigitalSourceType: trainedAlgorithmicMedia / compositeWithTrainedAlgorithmicMedia
  const exifAiPatterns = [
    'trainedAlgorithmicMedia',
    'compositeWithTrainedAlgorithmicMedia',
    'DigitalSourceType',
    'AI Generated',
    'ai_generated',
    'Made with AI',
    'artificial_intelligence',
    'DALL-E',
    'dall-e',
    'stable-diffusion',
    'StableDiffusion',
    'midjourney',
  ];
  let exifAi = false;
  let exifDetail: string | null = null;
  for (const p of exifAiPatterns) {
    if (text.includes(p)) {
      exifAi = true;
      markers.push(`EXIF: found '${p}'`);
      exifDetail = `EXIF AI marker '${p}' found`;
      break;
    }
  }

  // Check XMP metadata (XML embedded in image)
  const xmpMatch = text.match(/<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/);
  if (xmpMatch) {
    const xmp = xmpMatch[0];
    if (/digital[Ss]ource[Tt]ype/i.test(xmp) || /trained[Aa]lgorithmic/i.test(xmp)) {
      exifAi = true;
      exifDetail = 'XMP DigitalSourceType found';
      markers.push('EXIF: XMP DigitalSourceType');
    }
    if (/\bai\b/i.test(xmp) && /generat/i.test(xmp)) {
      exifAi = true;
      exifDetail = exifDetail ?? 'XMP AI generation marker found';
      markers.push('EXIF: XMP AI generation');
    }
  }

  // --- Watermark indicators ---
  // SynthID (Google) — not detectable from binary, but check for metadata
  // OpenAI watermark — statistical, not in metadata
  const watermarkPatterns = [
    'SynthID',
    'synthid',
    'watermark',
    'Watermark',
    'invisible_watermark',
    'stegano',
  ];
  let watermark = false;
  let watermarkDetail: string | null = null;
  for (const p of watermarkPatterns) {
    if (text.includes(p)) {
      watermark = true;
      markers.push(`Watermark: found '${p}'`);
      watermarkDetail = `Watermark indicator '${p}' found`;
      break;
    }
  }

  return {
    c2pa_present: c2pa,
    c2pa_details: c2paDetail,
    watermark_present: watermark,
    watermark_details: watermarkDetail,
    exif_ai_tag: exifAi,
    exif_details: exifDetail,
    raw_markers: markers,
  };
}

/**
 * Check audio file metadata for AI markers.
 */
export function checkAudioMetadata(filePath: string): MetadataResult {
  const buf = readFileSync(filePath);
  const text = buf.toString('latin1');
  const markers: string[] = [];

  // Check for ID3 tags or other metadata containing AI markers
  const aiPatterns = [
    'elevenlabs', 'ElevenLabs', 'synthetic', 'Synthetic',
    'ai_generated', 'AI Generated', 'text-to-speech', 'TTS',
    'artificial', 'generated_by',
  ];

  let exifAi = false;
  let exifDetail: string | null = null;
  for (const p of aiPatterns) {
    if (text.includes(p)) {
      exifAi = true;
      markers.push(`Audio: found '${p}'`);
      exifDetail = `Audio AI marker '${p}' found`;
      break;
    }
  }

  return {
    c2pa_present: false,
    c2pa_details: null,
    watermark_present: false,
    watermark_details: null,
    exif_ai_tag: exifAi,
    exif_details: exifDetail,
    raw_markers: markers,
  };
}
