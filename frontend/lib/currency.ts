/**
 * Format price in cents to locale-appropriate currency string.
 * EN → $49/mo, DE → €49/Monat
 * plans.js stores prices in EUR cents.
 * For EN we show equivalent USD (1:1 at MVP).
 */
export function formatPrice(
  cents: number,
  locale: string,
  period?: 'monthly' | 'yearly'
): string {
  if (cents === 0) return locale === 'de' ? '€0' : '$0';
  if (cents < 0) return locale === 'de' ? 'Individuell' : 'Custom';

  const amount = Math.round(cents / 100);
  const symbol = locale === 'de' ? '€' : '$';
  const suffix = period
    ? period === 'yearly'
      ? locale === 'de' ? '/Jahr' : '/yr'
      : locale === 'de' ? '/Monat' : '/mo'
    : '';

  return `${symbol}${amount}${suffix}`;
}

export function formatPricePerYear(cents: number, locale: string): string {
  if (cents <= 0) return '';
  const amount = Math.round(cents / 100);
  const symbol = locale === 'de' ? '€' : '$';
  const suffix = locale === 'de' ? '/Jahr' : '/yr';
  return `${symbol}${amount}${suffix}`;
}

export function getCurrencySymbol(locale: string): string {
  return locale === 'de' ? '€' : '$';
}
