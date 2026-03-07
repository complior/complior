/** Dutch BSN (Burgerservicenummer) — 11-proof check, 9 digits */

export const validateBSN = (raw: string): boolean => {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{9}$/.test(digits)) return false;

  // 11-proof: sum of (9*d1 + 8*d2 + ... + 2*d8 - 1*d9) must be divisible by 11 and != 0
  const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += weights[i]! * Number(digits[i]);
  }

  return sum % 11 === 0 && sum !== 0;
};
