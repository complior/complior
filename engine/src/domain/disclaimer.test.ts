import { describe, it, expect } from 'vitest';
import { getDisclaimer, appendDisclaimer, getReportFooter, containsBannedPhrase } from './disclaimer.js';

describe('Disclaimer Framework', () => {
  it('system prompt contains legal advisor warning', () => {
    const disclaimer = getDisclaimer('system_prompt');
    expect(disclaimer).toContain('not a legal advisor');
    expect(disclaimer).toContain('NEVER');
    expect(disclaimer).toContain('automated scanning');
  });

  it('report footer contains disclaimer', () => {
    const footer = getDisclaimer('report_footer');
    expect(footer).toContain('does NOT constitute legal advice');
  });

  it('compliance_md contains disclaimer', () => {
    const md = getDisclaimer('compliance_md');
    expect(md).toContain('NOT a legal certification');
  });

  it('commit message contains review warning', () => {
    const msg = getDisclaimer('commit_message');
    expect(msg).toContain('Review before merging');
  });

  it('appendDisclaimer adds footer', () => {
    const result = appendDisclaimer('Report content', 'report_footer');
    expect(result).toContain('Report content');
    expect(result).toContain('does NOT constitute');
  });

  it('getReportFooter includes version and date', () => {
    const footer = getReportFooter('0.1.0');
    expect(footer).toContain('complior v0.1.0');
    expect(footer).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('Banned Phrases', () => {
  it('detects banned phrases', () => {
    expect(containsBannedPhrase('You are compliant')).toBe(true);
    expect(containsBannedPhrase('Your project is compliant with EU AI Act')).toBe(true);
    expect(containsBannedPhrase('I guarantee compliance')).toBe(true);
  });

  it('allows safe phrases', () => {
    expect(containsBannedPhrase('Based on automated scanning: score 72/100')).toBe(false);
    expect(containsBannedPhrase('Scanner detected 8 violations')).toBe(false);
  });
});
