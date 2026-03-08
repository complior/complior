import { describe, it, expect } from 'vitest';
import { generatePolicy } from './policy-generator.js';
import { createMockPassport } from '../../test-helpers/factories.js';
import type { IndustryId } from '../../data/industry-patterns.js';

const HR_TEMPLATE = `# AI Usage Policy — HR / Employment

| Field | Value |
|-------|-------|
| Organization | [Organization] |
| Date | [Date] |
| Version | [Version] |
| AI System Name | [AI System Name] |
| Risk Class | [Risk Class] |

## 3. AI System Description

- System name: [AI System Name]
- Description: [Description]
- Provider: [Provider]
- Model ID: [Model ID]
- Autonomy level: [Autonomy Level]

## 6. Human Oversight

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]

## 14. Approval and Sign-off

| Policy Owner | [Approver Name] | [Date] |
`;

const FINANCE_TEMPLATE = `# AI Usage Policy — Finance / Credit

| Risk Class | [Risk Class] |
| AI System Name | [AI System Name] |
| Date | [Date] |

## 4. Risk Classification

This AI system is classified as **[Risk Class]** under the EU AI Act.

## 14. Approval and Sign-off

| Policy Owner | [Approver Name] | [Date] |
`;

const HEALTHCARE_TEMPLATE = `# AI Usage Policy — Healthcare / Medical

| AI System Name | [AI System Name] |
| Autonomy level | [Autonomy Level] |

## 6. Human Oversight

- Autonomy level: [Autonomy Level]
- [Human Oversight Description]
`;

const EDUCATION_TEMPLATE = `# AI Usage Policy — Education / Academic

| AI System Name | [AI System Name] |
| Provider | [Provider] |
| Model ID | [Model ID] |
| Version | [Version] |
`;

const LEGAL_TEMPLATE = `# AI Usage Policy — Legal / Justice

| AI System Name | [AI System Name] |
| Organization | [Organization] |
| Date | [Date] |

## 14. Approval and Sign-off

| Policy Owner | [Approver Name] | [Date] |
`;

describe('generatePolicy', () => {
  it('pre-fills system name and organization for HR template', () => {
    const manifest = createMockPassport({
      display_name: 'HR Screening Bot',
      owner: { team: 'TalentCo', contact: 'hr@talent.co', responsible_person: 'Alice' },
    });

    const result = generatePolicy({
      manifest,
      template: HR_TEMPLATE,
      industry: 'hr',
      organization: 'TalentCo HR',
    });

    expect(result.markdown).toContain('HR Screening Bot');
    expect(result.markdown).toContain('TalentCo HR');
    expect(result.markdown).not.toContain('[AI System Name]');
    expect(result.markdown).not.toContain('[Organization]');
    expect(result.prefilledFields).toContain('AI System Name');
    expect(result.prefilledFields).toContain('Organization');
    expect(result.industry).toBe('hr');
  });

  it('pre-fills risk class for finance template', () => {
    const manifest = createMockPassport({
      compliance: {
        eu_ai_act: {
          risk_class: 'high',
          applicable_articles: ['Art. 6'],
          deployer_obligations_met: [],
          deployer_obligations_pending: [],
        },
        complior_score: 65,
        last_scan: '2026-01-01',
      },
    });

    const result = generatePolicy({
      manifest,
      template: FINANCE_TEMPLATE,
      industry: 'finance',
    });

    expect(result.markdown).toContain('**high**');
    expect(result.markdown).not.toContain('[Risk Class]');
    expect(result.prefilledFields).toContain('Risk Class');
  });

  it('pre-fills autonomy and oversight for healthcare template', () => {
    const manifest = createMockPassport({
      autonomy_level: 'L3',
      autonomy_evidence: {
        human_approval_gates: 2,
        unsupervised_actions: 1,
        no_logging_actions: 0,
        auto_rated: true,
      },
      constraints: {
        rate_limits: { max_actions_per_minute: 60 },
        budget: { max_cost_per_session_usd: 10 },
        human_approval_required: ['prescribe'],
        prohibited_actions: [],
      },
    });

    const result = generatePolicy({
      manifest,
      template: HEALTHCARE_TEMPLATE,
      industry: 'healthcare',
    });

    expect(result.markdown).toContain('L3');
    expect(result.markdown).toContain('semi-autonomously');
    expect(result.markdown).toContain('Human approval required for: prescribe');
    expect(result.markdown).toContain('2 human approval gate(s)');
    expect(result.prefilledFields).toContain('Autonomy Level');
    expect(result.prefilledFields).toContain('Human Oversight Description');
  });

  it('pre-fills provider info for education template', () => {
    const manifest = createMockPassport({
      model: { provider: 'Anthropic', model_id: 'claude-3', deployment: 'cloud', data_residency: 'EU' },
      version: '2.1.0',
    });

    const result = generatePolicy({
      manifest,
      template: EDUCATION_TEMPLATE,
      industry: 'education',
    });

    expect(result.markdown).toContain('Anthropic');
    expect(result.markdown).toContain('claude-3');
    expect(result.markdown).toContain('2.1.0');
    expect(result.prefilledFields).toContain('Provider');
    expect(result.prefilledFields).toContain('Model ID');
    expect(result.prefilledFields).toContain('Version');
  });

  it('tracks manual fields for legal template when approver not provided', () => {
    const manifest = createMockPassport();

    const result = generatePolicy({
      manifest,
      template: LEGAL_TEMPLATE,
      industry: 'legal',
    });

    expect(result.manualFields).toContain('Approver Name');
    expect(result.markdown).toContain('[Approver Name]');
  });

  it('returns frozen result', () => {
    const manifest = createMockPassport();

    const result = generatePolicy({
      manifest,
      template: HR_TEMPLATE,
      industry: 'hr',
    });

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.prefilledFields)).toBe(true);
    expect(Object.isFrozen(result.manualFields)).toBe(true);
  });

  it('custom organization overrides passport owner.team', () => {
    const manifest = createMockPassport({
      owner: { team: 'Default Corp', contact: 'info@default.com', responsible_person: 'Bob' },
    });

    const result = generatePolicy({
      manifest,
      template: HR_TEMPLATE,
      industry: 'hr',
      organization: 'Custom Org Ltd',
    });

    expect(result.markdown).toContain('Custom Org Ltd');
    expect(result.markdown).not.toContain('Default Corp');
    expect(result.prefilledFields).toContain('Organization');
  });

  it('falls back to passport owner.team when no organization provided', () => {
    const manifest = createMockPassport({
      owner: { team: 'Fallback Inc', contact: 'info@fallback.com', responsible_person: 'Carol' },
    });

    const result = generatePolicy({
      manifest,
      template: HR_TEMPLATE,
      industry: 'hr',
    });

    expect(result.markdown).toContain('Fallback Inc');
    expect(result.prefilledFields).toContain('Organization');
  });

  it('pre-fills approver when provided', () => {
    const manifest = createMockPassport();

    const result = generatePolicy({
      manifest,
      template: HR_TEMPLATE,
      industry: 'hr',
      approver: 'Jane Smith, CLO',
    });

    expect(result.markdown).toContain('Jane Smith, CLO');
    expect(result.markdown).not.toContain('[Approver Name]');
    expect(result.prefilledFields).toContain('Approver');
    expect(result.manualFields).not.toContain('Approver Name');
  });
});
