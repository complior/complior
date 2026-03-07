import type { PIIPattern } from './types.js';

/** Contact PII patterns (5): email, phone, IP addresses */
export const CONTACT_PATTERNS: readonly PIIPattern[] = [
  {
    id: 'EMAIL',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    category: 'contact',
    label: 'EMAIL',
    description: 'Email address',
    article: 'GDPR Art.6',
  },
  {
    id: 'PHONE_INTL',
    pattern: /(?<!\w)\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}\b/g,
    category: 'contact',
    label: 'PHONE',
    description: 'International phone number',
    article: 'GDPR Art.6',
  },
  {
    id: 'PHONE_EU',
    pattern: /\b0\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g,
    category: 'contact',
    label: 'PHONE',
    description: 'EU domestic phone number',
    article: 'GDPR Art.6',
  },
  {
    id: 'IPV4',
    pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
    category: 'contact',
    label: 'IP_ADDRESS',
    description: 'IPv4 address',
    article: 'GDPR Recital 30',
  },
  {
    id: 'IPV6',
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    category: 'contact',
    label: 'IP_ADDRESS',
    description: 'IPv6 address',
    article: 'GDPR Recital 30',
  },
];
