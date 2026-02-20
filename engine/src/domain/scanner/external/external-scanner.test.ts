import { describe, it, expect } from 'vitest';
import type { PageData, ExternalCheck } from './types.js';
import {
  checkAiDisclosure,
  checkWellKnown,
  checkMetaTags,
  checkPrivacyPolicy,
  checkApiHeaders,
  checkChatbotDetection,
  checkImageMetadata,
  checkHumanEscalation,
} from './checks.js';
import { calculateExternalScore, runL1Checks, buildExternalScanResult } from './external-scanner.js';

const makePageData = (overrides?: Partial<PageData>): PageData => ({
  url: 'https://example.com',
  html: '<html><body>Hello World</body></html>',
  title: 'Example',
  headers: {},
  metaTags: [],
  images: [],
  links: [],
  scripts: [],
  hasWebSocket: false,
  chatInputs: [],
  wellKnownAiCompliance: null,
  privacyPolicyUrl: null,
  privacyPolicyText: null,
  ...overrides,
});

describe('external scanner checks', () => {
  describe('checkAiDisclosure', () => {
    it('PASS when AI disclosure text is found', () => {
      const page = makePageData({ html: '<footer>Powered by AI</footer>' });
      const result = checkAiDisclosure(page);
      expect(result.status).toBe('PASS');
      expect(result.obligation).toBe('OBL-015');
    });

    it('FAIL when no AI disclosure', () => {
      const page = makePageData({ html: '<body>Regular website</body>' });
      const result = checkAiDisclosure(page);
      expect(result.status).toBe('FAIL');
    });
  });

  describe('checkWellKnown', () => {
    it('PASS when valid compliance JSON exists', () => {
      const page = makePageData({
        wellKnownAiCompliance: JSON.stringify({ aiProvider: 'OpenAI', complianceStatus: 'partial' }),
      });
      const result = checkWellKnown(page);
      expect(result.status).toBe('PASS');
    });

    it('FAIL when no .well-known file', () => {
      const result = checkWellKnown(makePageData());
      expect(result.status).toBe('FAIL');
    });

    it('PARTIAL when invalid JSON', () => {
      const page = makePageData({ wellKnownAiCompliance: 'not json' });
      const result = checkWellKnown(page);
      expect(result.status).toBe('PARTIAL');
    });
  });

  describe('checkMetaTags', () => {
    it('PASS when AI meta tags present', () => {
      const page = makePageData({
        metaTags: [{ name: 'ai-disclosure', content: 'true' }],
      });
      expect(checkMetaTags(page).status).toBe('PASS');
    });

    it('FAIL when no AI meta tags', () => {
      const page = makePageData({
        metaTags: [{ name: 'description', content: 'A website' }],
      });
      expect(checkMetaTags(page).status).toBe('FAIL');
    });
  });

  describe('checkPrivacyPolicy', () => {
    it('PASS when privacy policy has AI section', () => {
      const page = makePageData({
        privacyPolicyUrl: '/privacy',
        privacyPolicyText: 'We use artificial intelligence to process your data.',
      });
      expect(checkPrivacyPolicy(page).status).toBe('PASS');
    });

    it('FAIL when no privacy policy link', () => {
      expect(checkPrivacyPolicy(makePageData()).status).toBe('FAIL');
    });

    it('FAIL when privacy policy has no AI mention', () => {
      const page = makePageData({
        privacyPolicyUrl: '/privacy',
        privacyPolicyText: 'We collect your email and name.',
      });
      expect(checkPrivacyPolicy(page).status).toBe('FAIL');
    });
  });

  describe('checkApiHeaders', () => {
    it('PASS when AI headers present', () => {
      const page = makePageData({
        headers: { 'X-AI-Disclosure': 'true', 'Content-Type': 'text/html' },
      });
      expect(checkApiHeaders(page).status).toBe('PASS');
    });

    it('FAIL when no AI headers', () => {
      const page = makePageData({
        headers: { 'Content-Type': 'text/html' },
      });
      expect(checkApiHeaders(page).status).toBe('FAIL');
    });
  });

  describe('checkChatbotDetection', () => {
    it('PASS when WebSocket + chat input detected', () => {
      const page = makePageData({
        hasWebSocket: true,
        chatInputs: [{ placeholder: 'Ask me anything', type: 'textarea' }],
      });
      const result = checkChatbotDetection(page);
      expect(result.status).toBe('PASS');
      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('N_A when no chat interface detected', () => {
      const page = makePageData({ html: '<body>Static page</body>' });
      expect(checkChatbotDetection(page).status).toBe('N_A');
    });
  });

  describe('checkImageMetadata', () => {
    it('N_A when no images on page', () => {
      expect(checkImageMetadata(makePageData()).status).toBe('N_A');
    });

    it('PARTIAL when images exist but no AI indicators', () => {
      const page = makePageData({
        images: [{ src: '/logo.png', alt: 'Company logo' }],
      });
      expect(checkImageMetadata(page).status).toBe('PARTIAL');
    });

    it('FAIL when AI-generated images lack C2PA', () => {
      const page = makePageData({
        images: [{ src: '/hero.png', alt: 'AI-generated illustration' }],
      });
      expect(checkImageMetadata(page).status).toBe('FAIL');
    });
  });

  describe('checkHumanEscalation', () => {
    it('PASS when "Talk to a human" button found', () => {
      const page = makePageData({
        links: [{ href: '/support', text: 'Talk to a human' }],
      });
      expect(checkHumanEscalation(page).status).toBe('PASS');
    });

    it('FAIL when no escalation option', () => {
      const page = makePageData({
        links: [{ href: '/about', text: 'About us' }],
      });
      expect(checkHumanEscalation(page).status).toBe('FAIL');
    });
  });
});

describe('external scanner scoring', () => {
  it('calculates score excluding N_A checks', () => {
    const checks: ExternalCheck[] = [
      { name: 'A', status: 'PASS', obligation: '', article: '', evidence: '', confidence: 90 },
      { name: 'B', status: 'FAIL', obligation: '', article: '', evidence: '', confidence: 80 },
      { name: 'C', status: 'N_A', obligation: '', article: '', evidence: '', confidence: 100 },
    ];
    // 1 PASS + 1 FAIL out of 2 scorable → 50%
    expect(calculateExternalScore(checks)).toBe(50);
  });

  it('returns 100 when all checks are N_A', () => {
    const checks: ExternalCheck[] = [
      { name: 'A', status: 'N_A', obligation: '', article: '', evidence: '', confidence: 100 },
    ];
    expect(calculateExternalScore(checks)).toBe(100);
  });

  it('counts PARTIAL as 50%', () => {
    const checks: ExternalCheck[] = [
      { name: 'A', status: 'PARTIAL', obligation: '', article: '', evidence: '', confidence: 50 },
      { name: 'B', status: 'PARTIAL', obligation: '', article: '', evidence: '', confidence: 50 },
    ];
    expect(calculateExternalScore(checks)).toBe(50);
  });

  it('runL1Checks runs all 8 checks', () => {
    const page = makePageData();
    const results = runL1Checks(page);
    expect(results.length).toBe(8);
  });

  it('buildExternalScanResult assembles correctly', () => {
    const checks: ExternalCheck[] = [
      { name: 'A', status: 'PASS', obligation: 'OBL-001', article: 'Art. 50', evidence: 'found', confidence: 90 },
    ];
    const result = buildExternalScanResult('https://example.com', checks, ['/shot.png'], 1234);
    expect(result.url).toBe('https://example.com');
    expect(result.scanLevel).toBe('L1');
    expect(result.score).toBe(100);
    expect(result.screenshots).toEqual(['/shot.png']);
    expect(result.duration).toBe(1234);
    expect(result.timestamp).toBeTruthy();
  });
});
