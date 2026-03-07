/** French NIR (Numéro d'Inscription au Répertoire) — Sécurité sociale, 13+2 digits */

export const validateNIR = (raw: string): boolean => {
  const cleaned = raw.replace(/[\s.]/g, '');
  if (!/^\d{15}$/.test(cleaned)) return false;

  // First 13 digits are the number, last 2 are the key
  const numberPart = cleaned.slice(0, 13);
  const key = Number(cleaned.slice(13));

  // Key = 97 - (number mod 97)
  // Use BigInt for precision with 13-digit numbers
  const num = BigInt(numberPart);
  const expectedKey = 97 - Number(num % 97n);

  return key === expectedKey;
};
