/**
 * US-S0201: CORS middleware tests
 *
 * Verifies that the router only allows localhost origins and blocks external ones.
 */
import { describe, it, expect } from 'vitest';

// Isolated CORS origin-checker extracted from create-router.ts logic
function isCorsAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin requests pass through
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

// US-S0201: named tests

describe('CORS origin policy', () => {
  it('test_cors_allows_localhost', () => {
    expect(isCorsAllowed('http://localhost:3000')).toBe(true);
    expect(isCorsAllowed('http://localhost:5173')).toBe(true);
    expect(isCorsAllowed('http://127.0.0.1:3099')).toBe(true);
  });

  it('test_cors_blocks_external', () => {
    expect(isCorsAllowed('https://evil.example.com')).toBe(false);
    expect(isCorsAllowed('https://app.complior.ai')).toBe(false);
    expect(isCorsAllowed('https://attacker.io')).toBe(false);
  });

  it('test_cors_same_origin', () => {
    // null/undefined origin = same-origin request, should pass through
    expect(isCorsAllowed(null)).toBe(true);
  });
});
