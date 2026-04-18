import { describe, it, expect } from 'vitest';
import { generateDocument, ALL_DOC_TYPES, TEMPLATE_FILE_MAP } from './document-generator.js';
import type { DocType } from './document-generator.js';
import type { AgentPassport } from '../../types/passport.types.js';

const createMockPassport = (overrides?: Partial<AgentPassport>): AgentPassport =>
  ({
    agent_id: 'test-agent-001',
    name: 'test-agent',
    display_name: 'Test AI Agent',
    version: '1.0.0',
    description: 'A test AI agent for compliance scanning',
    type: 'assistant',
    framework: 'openai',
    autonomy_level: 'L2',
    model: {
      provider: 'OpenAI',
      model_id: 'gpt-4o',
    },
    owner: {
      team: 'Acme Corp',
      responsible_person: 'Jane Doe',
    },
    compliance: {
      eu_ai_act: {
        risk_class: 'high',
      },
      complior_score: 72,
    },
    constraints: {
      human_approval_required: ['deploy', 'delete'],
      escalation_rules: [],
    },
    autonomy_evidence: {
      human_approval_gates: 3,
      unsupervised_actions: 1,
      no_logging_actions: 0,
      auto_rated: false,
    },
    permissions: {
      tools: ['read_file', 'write_file'],
      denied: ['execute_shell'],
    },
    source_files: [],
    signature: { value: '', publicKey: '', algorithm: 'ed25519' },
    created: '2026-01-01T00:00:00Z',
    updated: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as unknown as AgentPassport;

const SIMPLE_TEMPLATE = `# Test Document
| Company | [Company Name] |
| Date | [Date] |
| System | [AI System Name] |
| Provider | [Provider] |
| Version | [X.Y] |
| Risk | [Risk Class] |
`;

describe('document-generator', () => {
  describe('ALL_DOC_TYPES', () => {
    it('contains exactly 17 document types', () => {
      expect(ALL_DOC_TYPES).toHaveLength(17);
    });

    it('maps each type to a template file', () => {
      for (const dt of ALL_DOC_TYPES) {
        expect(TEMPLATE_FILE_MAP[dt]).toBeDefined();
        expect(TEMPLATE_FILE_MAP[dt]).toMatch(/\.md$/);
      }
    });
  });

  describe('generateDocument — common placeholders', () => {
    it('replaces [Company Name] with organization override', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
        organization: 'Override Corp',
      });
      expect(result.markdown).toContain('Override Corp');
      expect(result.markdown).not.toContain('[Company Name]');
      expect(result.prefilledFields).toContain('Company Name');
    });

    it('replaces [Company Name] with manifest.owner.team when no organization', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('Acme Corp');
    });

    it('marks Company Name as manual when missing', () => {
      const passport = createMockPassport({ owner: { team: '' } } as any);
      const result = generateDocument({
        manifest: passport,
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.manualFields).toContain('Company Name');
    });

    it('replaces [Date] with today ISO', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      const today = new Date().toISOString().slice(0, 10);
      expect(result.markdown).toContain(today);
      expect(result.markdown).not.toContain('[Date]');
    });

    it('replaces [AI System Name]', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('Test AI Agent');
    });

    it('replaces [Provider]', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('OpenAI');
      expect(result.markdown).not.toContain('| Provider | [Provider] |');
    });

    it('replaces [X.Y] with version', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('1.0.0');
    });

    it('replaces [Risk Class]', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('high');
      expect(result.markdown).not.toContain('[Risk Class]');
    });
  });

  describe('generateDocument — document ID replacement', () => {
    it('replaces ALP-[YYYY]-[NNN] for ai-literacy', () => {
      const template = '| Document ID | ALP-[YYYY]-[NNN] |';
      const result = generateDocument({
        manifest: createMockPassport(),
        template,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toMatch(/ALP-\d{4}-\d{3}/);
      expect(result.markdown).not.toContain('[YYYY]');
      expect(result.prefilledFields).toContain('Document ID');
    });

    it('replaces ART5-[YYYY]-[NNN] for art5-screening', () => {
      const template = '| Report ID | ART5-[YYYY]-[NNN] |';
      const result = generateDocument({
        manifest: createMockPassport(),
        template,
        docType: 'art5-screening',
      });
      expect(result.markdown).toMatch(/ART5-\d{4}-\d{3}/);
    });

    it('does not add Document ID to prefilled if pattern not in template', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'technical-documentation',
      });
      expect(result.prefilledFields).not.toContain('Document ID');
    });
  });

  describe('generateDocument — type-specific manual fields', () => {
    it('ai-literacy has training-related manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.manualFields).toContain('Training levels configuration');
      expect(result.manualFields).toContain('Sign-off signatures');
    });

    it('art5-screening has prohibited practice manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'art5-screening',
      });
      expect(result.manualFields).toContain('Prohibited practice details');
      expect(result.manualFields).toContain('Decision and justification');
    });

    it('technical-documentation has architecture manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'technical-documentation',
      });
      expect(result.manualFields).toContain('System architecture details');
      expect(result.manualFields).toContain('Performance metrics');
    });

    it('incident-report has incident manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'incident-report',
      });
      expect(result.manualFields).toContain('Incident description');
      expect(result.manualFields).toContain('Root cause analysis');
    });

    it('declaration-of-conformity has conformity manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'declaration-of-conformity',
      });
      expect(result.manualFields).toContain('Harmonised standards used');
      expect(result.manualFields).toContain('Signatory');
    });

    it('monitoring-policy has monitoring manual fields', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'monitoring-policy',
      });
      expect(result.manualFields).toContain('Human oversight assignments');
      expect(result.manualFields).toContain('Log retention schedule');
    });
  });

  describe('generateDocument — all 6 types produce valid results', () => {
    for (const docType of ALL_DOC_TYPES) {
      it(`generates valid result for ${docType}`, () => {
        const result = generateDocument({
          manifest: createMockPassport(),
          template: SIMPLE_TEMPLATE,
          docType,
          organization: 'Test Corp',
        });
        expect(result.docType).toBe(docType);
        expect(result.markdown).toBeTruthy();
        expect(result.prefilledFields.length).toBeGreaterThan(0);
        expect(result.manualFields.length).toBeGreaterThan(0);
      });
    }
  });

  describe('generateDocument — result is frozen', () => {
    it('returns a frozen object', () => {
      const result = generateDocument({
        manifest: createMockPassport(),
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.prefilledFields)).toBe(true);
      expect(Object.isFrozen(result.manualFields)).toBe(true);
    });
  });

  describe('generateDocument — edge cases', () => {
    it('handles passport with minimal fields gracefully', () => {
      const minimal = createMockPassport({
        model: { provider: '', model_id: '' } as any,
        compliance: { eu_ai_act: { risk_class: '' } } as any,
      });
      const result = generateDocument({
        manifest: minimal,
        template: SIMPLE_TEMPLATE,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toBeTruthy();
      expect(result.manualFields).toContain('Provider');
      expect(result.manualFields).toContain('Risk Class');
    });

    it('replaces multiple occurrences of same placeholder', () => {
      const template = '[Company Name] is great. [Company Name] is the best.';
      const result = generateDocument({
        manifest: createMockPassport(),
        template,
        docType: 'ai-literacy',
        organization: 'Multi Corp',
      });
      expect(result.markdown).toBe('Multi Corp is great. Multi Corp is the best.');
    });

    it('preserves GUIDANCE comments in output', () => {
      const template = '<!-- GUIDANCE: This is guidance -->\n[Company Name]';
      const result = generateDocument({
        manifest: createMockPassport(),
        template,
        docType: 'ai-literacy',
      });
      expect(result.markdown).toContain('<!-- GUIDANCE:');
    });
  });
});
