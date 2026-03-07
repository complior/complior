import { describe, it, expect } from 'vitest';
import { sanitizeHook } from '../hooks/pre/sanitize.js';
import { PIIDetectedError } from '../errors.js';
import { validateIBAN } from '../data/pii-validators/iban.js';
import { validateBSN } from '../data/pii-validators/bsn.js';
import { validateNIR } from '../data/pii-validators/nir.js';
import { validatePESEL } from '../data/pii-validators/pesel.js';
import { validateCodiceFiscale } from '../data/pii-validators/codice-fiscale.js';
import type { MiddlewareContext, MiddlewareConfig } from '../types.js';

const makeCtx = (
  messages: { role: string; content: string }[],
  config: MiddlewareConfig = { jurisdictions: ['EU'] },
): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config,
  params: { messages },
  metadata: {},
});

const getContent = (ctx: MiddlewareContext, idx = 0): string => {
  const messages = ctx.params['messages'] as { role: string; content: string }[];
  return messages[idx]!.content;
};

// ── Checksum Validators ─────────────────────────────────────────

describe('IBAN validator', () => {
  it('validates DE IBAN', () => {
    expect(validateIBAN('DE89370400440532013000')).toBe(true);
  });

  it('validates FR IBAN', () => {
    expect(validateIBAN('FR7630006000011234567890189')).toBe(true);
  });

  it('validates NL IBAN', () => {
    expect(validateIBAN('NL91ABNA0417164300')).toBe(true);
  });

  it('validates PL IBAN', () => {
    expect(validateIBAN('PL61109010140000071219812874')).toBe(true);
  });

  it('validates IT IBAN', () => {
    expect(validateIBAN('IT60X0542811101000000123456')).toBe(true);
  });

  it('rejects invalid checksum', () => {
    expect(validateIBAN('DE00370400440532013000')).toBe(false);
  });

  it('rejects wrong country length', () => {
    expect(validateIBAN('DE893704004405320130001')).toBe(false);
  });
});

describe('BSN validator', () => {
  it('validates correct BSN', () => {
    // 111222333: 9*1+8*1+7*1+6*2+5*2+4*2+3*3+2*3-1*3 = 9+8+7+12+10+8+9+6-3 = 66, 66%11=0
    expect(validateBSN('111222333')).toBe(true);
  });

  it('rejects invalid BSN', () => {
    expect(validateBSN('123456789')).toBe(false);
  });

  it('rejects non-9-digit input', () => {
    expect(validateBSN('12345678')).toBe(false);
  });
});

describe('NIR validator', () => {
  it('validates correct NIR', () => {
    // NIR: 1 85 05 78 006 084 key=97-(1850578006084 mod 97)
    const num = 1850578006084n;
    const key = 97 - Number(num % 97n);
    const keyStr = key.toString().padStart(2, '0');
    expect(validateNIR(`1850578006084${keyStr}`)).toBe(true);
  });

  it('rejects invalid NIR key', () => {
    expect(validateNIR('185057800608400')).toBe(false);
  });

  it('rejects non-15-digit input', () => {
    expect(validateNIR('12345')).toBe(false);
  });
});

describe('PESEL validator', () => {
  it('validates correct PESEL', () => {
    // 44051401359: known valid PESEL
    expect(validatePESEL('44051401359')).toBe(true);
  });

  it('rejects invalid PESEL', () => {
    expect(validatePESEL('44051401350')).toBe(false);
  });

  it('rejects non-11-digit input', () => {
    expect(validatePESEL('1234567890')).toBe(false);
  });
});

describe('Codice Fiscale validator', () => {
  it('validates correct Codice Fiscale', () => {
    // RSSMRA85M01H501Q — check char Q computed from standard algorithm
    expect(validateCodiceFiscale('RSSMRA85M01H501Q')).toBe(true);
  });

  it('rejects invalid check character', () => {
    expect(validateCodiceFiscale('RSSMRA85M01H501A')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(validateCodiceFiscale('INVALID')).toBe(false);
  });
});

// ── Sanitize Hook — Replace Mode ────────────────────────────────

describe('sanitize hook — replace mode', () => {
  it('redacts SSN', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'My SSN is 123-45-6789' }]));
    expect(getContent(result)).toContain('[PII:SSN]');
    expect(getContent(result)).not.toContain('123-45-6789');
  });

  it('redacts email addresses', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Email: john@example.com' }]));
    expect(getContent(result)).toContain('[PII:EMAIL]');
    expect(getContent(result)).not.toContain('john@example.com');
  });

  it('redacts credit card (spaced)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Card: 4111-1111-1111-1111' }]));
    expect(getContent(result)).toContain('[PII:CREDIT_CARD]');
  });

  it('redacts credit card (contiguous)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Card: 4111111111111111' }]));
    expect(getContent(result)).toContain('[PII:CREDIT_CARD]');
  });

  it('redacts valid IBAN', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Pay to DE89370400440532013000' }]));
    expect(getContent(result)).toContain('[PII:IBAN]');
    expect(getContent(result)).not.toContain('DE89370400440532013000');
  });

  it('does NOT redact invalid IBAN (checksum fails)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Number DE00370400440532013000' }]));
    expect(getContent(result)).not.toContain('[PII:IBAN]');
  });

  it('redacts valid BSN', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'BSN: 111222333' }]));
    expect(getContent(result)).toContain('[PII:BSN]');
  });

  it('does NOT redact invalid BSN', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Number 123456789' }]));
    // BSN validator rejects 123456789
    expect(getContent(result)).not.toContain('[PII:BSN]');
  });

  it('redacts valid Codice Fiscale', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'CF: RSSMRA85M01H501Q' }]));
    expect(getContent(result)).toContain('[PII:CODICE_FISCALE]');
  });

  it('does NOT redact invalid Codice Fiscale', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'CF: RSSMRA85M01H501A' }]));
    expect(getContent(result)).not.toContain('[PII:CODICE_FISCALE]');
  });

  it('redacts international phone numbers', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Call +49 30 123456' }]));
    expect(getContent(result)).toContain('[PII:PHONE]');
  });

  it('redacts IPv4 addresses', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Server at 192.168.1.100' }]));
    expect(getContent(result)).toContain('[PII:IP_ADDRESS]');
  });

  it('redacts IPv6 addresses', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334' }]));
    expect(getContent(result)).toContain('[PII:IP_ADDRESS]');
  });

  it('redacts date of birth', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Born 15/03/1990' }]));
    expect(getContent(result)).toContain('[PII:DATE_OF_BIRTH]');
  });

  it('redacts MAC addresses', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'MAC: 00:1A:2B:3C:4D:5E' }]));
    expect(getContent(result)).toContain('[PII:MAC_ADDRESS]');
  });
});

// ── Passport Formats ────────────────────────────────────────────

describe('sanitize hook — passport formats', () => {
  it('redacts German passport format', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Passport: C01X00T47' }]));
    expect(getContent(result)).toContain('[PII:');
  });

  it('redacts French passport format', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Passport: 12AB34567' }]));
    expect(getContent(result)).toContain('[PII:');
  });

  it('redacts Polish/Italian passport format', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Passport: AB1234567' }]));
    expect(getContent(result)).toContain('[PII:');
  });
});

// ── GDPR Art.9 Special Categories ───────────────────────────────

describe('sanitize hook — GDPR Art.9 special categories', () => {
  it('detects racial/ethnic origin data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Record the racial origin of applicants' }]));
    expect(getContent(result)).toContain('[PII:ART9_RACIAL]');
    expect(result.metadata['piiCategories']).toContain('gdpr_art9');
  });

  it('detects political opinions data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Store their political opinion for profiling' }]));
    expect(getContent(result)).toContain('[PII:ART9_POLITICAL]');
  });

  it('detects religious beliefs data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Log their religious belief and denomination' }]));
    expect(getContent(result)).toContain('[PII:ART9_RELIGIOUS]');
  });

  it('detects trade union membership data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Check trade union membership status' }]));
    expect(getContent(result)).toContain('[PII:ART9_TRADE_UNION]');
  });

  it('detects genetic data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Upload genetic data from the lab' }]));
    expect(getContent(result)).toContain('[PII:ART9_GENETIC]');
  });

  it('detects biometric data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Collect biometric data for identification' }]));
    expect(getContent(result)).toContain('[PII:ART9_BIOMETRIC]');
  });

  it('detects health data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Access the health condition records' }]));
    expect(getContent(result)).toContain('[PII:ART9_HEALTH]');
  });

  it('detects sexual orientation data', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'Classify by sexual orientation for hiring' }]));
    expect(getContent(result)).toContain('[PII:ART9_SEXUAL]');
  });
});

// ── Modes ───────────────────────────────────────────────────────

describe('sanitize hook — modes', () => {
  it('replace mode redacts and returns modified content (default)', () => {
    const result = sanitizeHook(makeCtx(
      [{ role: 'user', content: 'SSN: 123-45-6789' }],
      { jurisdictions: ['EU'] },
    ));
    expect(getContent(result)).toContain('[PII:SSN]');
    expect(result.metadata['piiRedacted']).toBe(1);
  });

  it('block mode throws PIIDetectedError on first match', () => {
    expect(() => sanitizeHook(makeCtx(
      [{ role: 'user', content: 'SSN: 123-45-6789' }],
      { jurisdictions: ['EU'], sanitizeMode: 'block' },
    ))).toThrow(PIIDetectedError);
  });

  it('block mode includes PII type and category in error', () => {
    try {
      sanitizeHook(makeCtx(
        [{ role: 'user', content: 'SSN: 123-45-6789' }],
        { jurisdictions: ['EU'], sanitizeMode: 'block' },
      ));
      expect.fail('Should have thrown');
    } catch (err) {
      const e = err as PIIDetectedError;
      expect(e.piiType).toBe('SSN');
      expect(e.category).toBe('identity_national');
      expect(e.article).toBe('GDPR Art.87');
      expect(e.code).toBe('PII_DETECTED');
    }
  });

  it('warn mode does NOT modify content but reports in metadata', () => {
    const result = sanitizeHook(makeCtx(
      [{ role: 'user', content: 'SSN: 123-45-6789' }],
      { jurisdictions: ['EU'], sanitizeMode: 'warn' },
    ));
    // Content unchanged
    expect(getContent(result)).toContain('123-45-6789');
    // But metadata reports PII
    expect(result.metadata['piiRedacted']).toBe(1);
    expect(result.metadata['piiCategories']).toContain('identity_national');
  });
});

// ── Edge Cases ──────────────────────────────────────────────────

describe('sanitize hook — edge cases', () => {
  it('passes through when no messages present', () => {
    const ctx: MiddlewareContext = {
      provider: 'openai',
      method: 'create',
      config: { jurisdictions: ['EU'] },
      params: {},
      metadata: {},
    };
    const result = sanitizeHook(ctx);
    expect(result).toEqual(ctx);
  });

  it('sets piiRedacted to 0 when no PII found', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'No sensitive data here' }]));
    expect(result.metadata['piiRedacted']).toBe(0);
  });

  it('handles multiple PII types in one message', () => {
    const result = sanitizeHook(makeCtx([{
      role: 'user',
      content: 'SSN: 123-45-6789, email: test@example.com, card: 4111-1111-1111-1111',
    }]));
    expect(result.metadata['piiRedacted']).toBe(3);
    const details = result.metadata['piiDetails'] as { id: string }[];
    const ids = details.map((d) => d.id);
    expect(ids).toContain('SSN');
    expect(ids).toContain('EMAIL');
    expect(ids).toContain('CC_SPACED');
  });

  it('counts PII across multiple messages', () => {
    const result = sanitizeHook(makeCtx([
      { role: 'user', content: 'SSN: 123-45-6789' },
      { role: 'user', content: 'Email: a@b.com' },
    ]));
    expect(result.metadata['piiRedacted']).toBe(2);
  });

  it('reports piiCategories as array of unique categories', () => {
    const result = sanitizeHook(makeCtx([{
      role: 'user',
      content: 'SSN: 123-45-6789, email: test@example.com',
    }]));
    const categories = result.metadata['piiCategories'] as string[];
    expect(categories).toContain('identity_national');
    expect(categories).toContain('contact');
  });
});

// ── Validator Rejection ─────────────────────────────────────────

describe('sanitize hook — validator rejection', () => {
  it('does not redact invalid IBAN (wrong checksum)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'IBAN: DE00370400440532013000' }]));
    expect(getContent(result)).not.toContain('[PII:IBAN]');
    expect(getContent(result)).toContain('DE00370400440532013000');
  });

  it('does not redact invalid BSN (fails 11-check)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'BSN: 123456780' }]));
    expect(getContent(result)).not.toContain('[PII:BSN]');
  });

  it('does not redact invalid Codice Fiscale (wrong check char)', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'CF: ABCDEF12G34H567X' }]));
    expect(getContent(result)).not.toContain('[PII:CODICE_FISCALE]');
  });
});

// ── Context-Dependent Matching ──────────────────────────────────

describe('sanitize hook — context-dependent matching', () => {
  it('postal code only matched with address context', () => {
    // Without context keyword — should NOT be redacted as postal code
    const result1 = sanitizeHook(makeCtx([{ role: 'user', content: 'The number is 12345' }]));
    expect(getContent(result1)).not.toContain('[PII:POSTAL_CODE]');

    // With context keyword — should be redacted
    const result2 = sanitizeHook(makeCtx([{ role: 'user', content: 'The address has postal code 12345' }]));
    expect(getContent(result2)).toContain('[PII:POSTAL_CODE]');
  });
});

// ── Medical IDs ─────────────────────────────────────────────────

describe('sanitize hook — medical IDs', () => {
  it('redacts EHIC-like pattern', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'EHIC: 80 04 12345678 12345678' }]));
    expect(getContent(result)).toContain('[PII:');
  });
});

// ── Financial — SWIFT/BIC ───────────────────────────────────────

describe('sanitize hook — financial', () => {
  it('redacts SWIFT/BIC code', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'SWIFT: DEUTDEFF' }]));
    expect(getContent(result)).toContain('[PII:');
  });

  it('redacts SWIFT/BIC with branch code', () => {
    const result = sanitizeHook(makeCtx([{ role: 'user', content: 'BIC: DEUTDEFF500' }]));
    expect(getContent(result)).toContain('[PII:');
  });
});
