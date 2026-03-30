/**
 * Tests for detectWeakSections() and buildL2Feedback() pure functions.
 */
import { describe, it, expect } from 'vitest';
import { detectWeakSections, buildL2Feedback } from './ai-enricher.js';

const STRONG_DOC = `## Risk Identification

We have identified 15 key risks through our systematic risk assessment process conducted in Q1 2026.
Each risk was evaluated using the ISO 31000:2018 framework, with probability scores assigned on a 1-5 scale.
The top 3 risks relate to bias (P=0.4, I=High), data quality (P=0.3, I=Medium), and model drift (P=0.25, I=High).
Under Art. 9 of the EU AI Act (Regulation 2024/1689), providers must maintain a risk management system.

## Mitigation Measures

For each identified risk, we implement specific mitigation controls:
- Bias: Monthly fairness audits using Aequitas toolkit, targeting <2% demographic parity gap
- Data quality: Automated data validation pipeline with 99.5% accuracy threshold
- Model drift: Weekly model monitoring with KL-divergence alerts at >0.05

## Monitoring Plan

Continuous monitoring via Prometheus dashboards with the following KPIs:
1. False positive rate: target <5% (current: 3.2%)
2. Latency p99: target <200ms (current: 145ms)
3. Drift score: target <0.05 (current: 0.02)
Reviews conducted quarterly per Art. 9(8) requirements.
`;

const WEAK_DOC = `## Risk Identification

We assess risks.

## Mitigation Measures

[TODO: Add mitigation measures]

## Monitoring Plan

Monitoring will be done.
`;

const MIXED_DOC = `## System Description

Our AI system processes customer support tickets using a fine-tuned GPT-4 model.
It classifies tickets into 12 categories with 94.2% accuracy (validated on 10,000 test samples).
The system handles approximately 50,000 tickets per day with p99 latency of 180ms.
Deployed on AWS eu-west-1 region per Art. 11 requirements.

## Intended Purpose

This system helps with customer support.

## Performance Metrics

[TODO: Fill in performance benchmarks]
`;

describe('detectWeakSections', () => {
  it('returns empty array for fully-populated document', () => {
    const weak = detectWeakSections(STRONG_DOC);
    expect(weak).toEqual([]);
  });

  it('detects weak sections in placeholder-heavy document', () => {
    const weak = detectWeakSections(WEAK_DOC);
    expect(weak.length).toBeGreaterThan(0);
    // Should detect sections with placeholders or very short content
    expect(weak.some(s => s.toLowerCase().includes('mitigation'))).toBe(true);
  });

  it('detects mix of strong and weak sections', () => {
    const weak = detectWeakSections(MIXED_DOC);
    // System Description is strong, others are weak
    expect(weak.some(s => s.toLowerCase().includes('intended purpose') || s.toLowerCase().includes('performance'))).toBe(true);
    // System Description should NOT be in weak list
    expect(weak.some(s => s.toLowerCase() === 'system description')).toBe(false);
  });

  it('returns empty for empty content', () => {
    const weak = detectWeakSections('');
    expect(weak).toEqual([]);
  });

  it('returns empty for content with no headings', () => {
    const weak = detectWeakSections('Just a paragraph with no markdown headings at all.');
    expect(weak).toEqual([]);
  });
});

describe('buildL2Feedback', () => {
  it('returns "All sections appear adequate" for strong document', () => {
    const feedback = buildL2Feedback(STRONG_DOC);
    expect(feedback).toBe('All sections appear adequate.');
  });

  it('lists specific issues for weak document', () => {
    const feedback = buildL2Feedback(WEAK_DOC);
    expect(feedback).not.toBe('All sections appear adequate.');
    // Should contain bullet points with section names
    expect(feedback).toContain('-');
    expect(feedback).toContain('"');
  });

  it('mentions placeholder count for sections with TODOs', () => {
    const feedback = buildL2Feedback(WEAK_DOC);
    expect(feedback).toMatch(/placeholder/i);
  });

  it('mentions word count for very short sections', () => {
    const feedback = buildL2Feedback(WEAK_DOC);
    expect(feedback).toMatch(/words/i);
  });

  it('returns feedback only for weak sections in mixed doc', () => {
    const feedback = buildL2Feedback(MIXED_DOC);
    // Should have feedback for weak sections but not System Description
    expect(feedback).not.toBe('All sections appear adequate.');
  });
});
