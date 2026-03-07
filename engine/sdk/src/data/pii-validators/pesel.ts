/** Polish PESEL — 11 digits, weighted checksum */

export const validatePESEL = (raw: string): boolean => {
  const digits = raw.replace(/\s/g, '');
  if (!/^\d{11}$/.test(digits)) return false;

  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += weights[i]! * Number(digits[i]);
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(digits[10]);
};
