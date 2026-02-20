import { describe, it, expect } from 'vitest';
import { generateBadgeSvg } from './badge-generator.js';
import { generateComplianceMd } from './compliance-md.js';
import { createMockScanResult, createMockFinding } from '../../test-helpers/factories.js';
import { ENGINE_VERSION } from '../../version.js';

describe('badge-generator', () => {
  it('generates SVG with correct color per zone', () => {
    const red = generateBadgeSvg(30, 'red', 'EU', '2026-02-19');
    const yellow = generateBadgeSvg(65, 'yellow', 'EU', '2026-02-19');
    const green = generateBadgeSvg(95, 'green', 'EU', '2026-02-19');

    expect(red).toContain('#e05d44');
    expect(red).toContain('30%');
    expect(yellow).toContain('#dfb317');
    expect(yellow).toContain('65%');
    expect(green).toContain('#97ca00');
    expect(green).toContain('95%');
  });

  it('produces different SVGs for different scores', () => {
    const a = generateBadgeSvg(40, 'red', 'EU', '2026-02-19');
    const b = generateBadgeSvg(85, 'green', 'EU', '2026-02-19');

    expect(a).not.toBe(b);
    expect(a).toContain('40%');
    expect(b).toContain('85%');
  });
});

describe('compliance-md', () => {
  it('generates markdown with findings summary and top issues', () => {
    const result = createMockScanResult({
      findings: [
        createMockFinding({ checkId: 'ai-disclosure', severity: 'high', message: 'Missing AI disclosure' }),
        createMockFinding({ checkId: 'data-governance', severity: 'critical', message: 'No data governance policy' }),
        createMockFinding({ checkId: 'logging', severity: 'medium', message: 'Interaction logging missing' }),
      ],
    });

    const md = generateComplianceMd(result, ENGINE_VERSION);

    expect(md).toContain('# Compliance Report');
    expect(md).toContain('75%');
    expect(md).toContain('ai-disclosure');
    expect(md).toContain('data-governance');
    expect(md).toContain('**[CRITICAL]**');
    expect(md).toContain('**[HIGH]**');
    // Top issues are sorted by severity (critical first)
    const criticalIdx = md.indexOf('CRITICAL');
    const highIdx = md.indexOf('HIGH', criticalIdx + 1);
    expect(criticalIdx).toBeLessThan(highIdx);
  });
});
