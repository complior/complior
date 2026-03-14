import { describe, it, expect } from 'vitest';
import { createScanFile, createScanCtx } from '../../../test-helpers/factories.js';
import { DOCUMENT_VALIDATORS } from '../validators.js';
import {
  ALL_PRESENCE_CONFIGS,
  createPresenceCheck,
} from './presence-check-factory.js';

/**
 * Content keyword samples for each checkId — used in content-match tests.
 * Avoids fragile regex-to-text conversion by using known-good keywords.
 */
const CONTENT_SAMPLES: Record<string, string> = {
  'fria': 'fundamental rights impact assessment',
  'art5-screening': 'prohibited practices screening',
  'technical-documentation': 'technical documentation for the AI system',
  'incident-report': 'serious incident report',
  'declaration-of-conformity': 'declaration of conformity',
  'monitoring-policy': 'post-market monitoring policy',
  'worker-notification': 'worker notification about AI systems',
  'risk-management': 'risk management system for the AI application',
  'data-governance': 'data governance policy and quality metrics',
  'qms': 'quality management system for AI compliance',
  'instructions-for-use': 'instructions for use including capabilities and limitations',
};

/**
 * Map checkId → validator document name where they differ.
 */
const VALIDATOR_NAME: Record<string, string> = {
  'technical-documentation': 'tech-documentation',
  'declaration-of-conformity': 'declaration-conformity',
};

/**
 * Data-driven tests for all 7 EU AI Act document presence checks.
 * Each config is tested for: filename match, generated doc match,
 * content keyword match, and failure when nothing found.
 */
describe.each(ALL_PRESENCE_CONFIGS)(
  'presence check: $checkId',
  (config) => {
    const check = createPresenceCheck(config);

    it('passes when matching file exists by name', () => {
      // Get the first filename from validators.ts (single source of truth)
      const validatorName = VALIDATOR_NAME[config.checkId] ?? config.checkId;
      const validator = DOCUMENT_VALIDATORS.find((v) => v.document === validatorName);
      const filename = validator?.file_patterns[0] ?? `${config.checkId}.md`;

      const ctx = createScanCtx([
        createScanFile(filename, `# ${config.docLabel}`),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
      expect(results[0].checkId).toBe(config.checkId);
    });

    it('passes when generated doc found in .complior/documents/', () => {
      const ctx = createScanCtx([
        createScanFile(`.complior/documents/${config.checkId}-2026.md`, `# ${config.docLabel}`),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('passes when generated doc found in docs/compliance/', () => {
      const ctx = createScanCtx([
        createScanFile(`docs/compliance/${config.checkId}.md`, `# ${config.docLabel}`),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('passes when docs/ contains relevant content keyword', () => {
      const keyword = CONTENT_SAMPLES[config.checkId] ?? config.docLabel;
      const ctx = createScanCtx([
        createScanFile('docs/compliance-overview.md', `This document covers ${keyword}`),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('pass');
    });

    it('fails when no matching document found', () => {
      const ctx = createScanCtx([
        createScanFile('README.md', '# My Project\nA simple web app'),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('fail');
      if (results[0].type === 'fail') {
        expect(results[0].severity).toBe(config.severity);
        expect(results[0].obligationId).toBe(config.obligationId);
        expect(results[0].articleReference).toBe(config.articleRef);
        expect(results[0].fix).toBeDefined();
      }
    });

    it('fails when docs/ has unrelated content', () => {
      const ctx = createScanCtx([
        createScanFile('docs/setup.md', '# Setup Guide\nRun npm install'),
      ]);

      const results = check(ctx);

      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('fail');
    });
  },
);
