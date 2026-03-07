/** ISO 13616 IBAN validation — mod-97 checksum for 34 EU/EEA countries */

const IBAN_LENGTHS: Record<string, number> = {
  AT: 20, BE: 18, BG: 22, HR: 21, CY: 28,
  CZ: 24, DK: 18, EE: 20, FI: 18, FR: 27,
  DE: 22, GR: 27, HU: 28, IE: 22, IT: 27,
  LV: 21, LT: 20, LU: 20, MT: 31, NL: 18,
  PL: 28, PT: 25, RO: 24, SK: 24, SI: 19,
  ES: 24, SE: 24, IS: 26, LI: 21, NO: 15,
  CH: 21, GB: 22, MC: 27, SM: 27,
};

const mod97 = (digits: string): number => {
  let remainder = 0;
  for (let i = 0; i < digits.length; i++) {
    remainder = (remainder * 10 + Number(digits[i])) % 97;
  }
  return remainder;
};

export const validateIBAN = (raw: string): boolean => {
  const iban = raw.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;

  const country = iban.slice(0, 2);
  const expectedLen = IBAN_LENGTHS[country];
  if (!expectedLen || iban.length !== expectedLen) return false;

  // Move first 4 chars to end, convert letters to digits (A=10..Z=35)
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));

  return mod97(digits) === 1;
};
