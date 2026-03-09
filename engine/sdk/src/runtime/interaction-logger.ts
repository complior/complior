import { createHash } from 'node:crypto';
import { appendFile, stat, rename, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { MiddlewareConfig, PostHook } from '../types.js';
import { extractResponseText } from '../hooks/post/extract-response-text.js';
import { extractResponseMeta } from './response-wrapper.js';

export interface InteractionLogEntry {
  readonly timestamp: string;
  readonly provider: string;
  readonly method: string;
  readonly model: string;
  readonly promptHash: string;
  readonly responseHash: string;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly complianceChecks: {
    readonly disclosureVerified: boolean;
    readonly biasCheckPassed: boolean;
    readonly piiRedacted: number;
    readonly escalationDetected: boolean;
  };
}

const DEFAULT_LOG_PATH = '.complior/logs/interactions.jsonl';
const DEFAULT_MAX_BYTES = 100 * 1024 * 1024; // 100MB

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

const readMetaNumber = (metadata: Record<string, unknown>, key: string): number => {
  const val = metadata[key];
  return typeof val === 'number' ? val : 0;
};

/** OBL-006 Art.12: Structured interaction logging */
export const createInteractionLoggerHook = (config: MiddlewareConfig): PostHook => {
  const logPath = config.interactionLogPath ?? DEFAULT_LOG_PATH;
  let dirCreated = false;

  return (ctx, response) => {
    if (config.interactionLogger !== true) {
      return { response, metadata: ctx.metadata, headers: {} };
    }

    const meta = extractResponseMeta(response);
    const responseText = extractResponseText(response);
    const loggedAtMs = readMetaNumber(ctx.metadata, 'loggedAtMs') || Date.now();

    const entry: InteractionLogEntry = {
      timestamp: new Date().toISOString(),
      provider: ctx.provider,
      method: ctx.method,
      model: meta.model,
      promptHash: sha256(JSON.stringify(ctx.params)),
      responseHash: sha256(responseText),
      latencyMs: Date.now() - loggedAtMs,
      inputTokens: meta.inputTokens,
      outputTokens: meta.outputTokens,
      complianceChecks: {
        disclosureVerified: ctx.metadata['disclosureVerified'] === true,
        biasCheckPassed: ctx.metadata['biasCheckPassed'] !== false,
        piiRedacted: readMetaNumber(ctx.metadata, 'piiRedactedCount'),
        escalationDetected: ctx.metadata['escalationDetected'] === true,
      },
    };

    // Fire-and-forget: I/O must not block the response pipeline.
    // Errors are intentionally suppressed — log failures are non-critical
    // and must never propagate to the LLM caller.
    const writeLog = async (): Promise<void> => {
      if (!dirCreated) {
        await mkdir(dirname(logPath), { recursive: true });
        dirCreated = true;
      }

      // Auto-rotate when file exceeds max size
      try {
        const stats = await stat(logPath);
        if (stats.size >= DEFAULT_MAX_BYTES) {
          const ts = new Date().toISOString().replace(/[:.]/g, '-');
          await rename(logPath, logPath.replace('.jsonl', `-${ts}.jsonl`));
        }
      } catch {
        // File doesn't exist yet — first write will create it
      }

      await appendFile(logPath, JSON.stringify(entry) + '\n');
    };

    writeLog().catch(() => { /* non-critical I/O — see comment above */ });

    return {
      response,
      metadata: {
        ...ctx.metadata,
        interactionLogged: true,
      },
      headers: {},
    };
  };
};
