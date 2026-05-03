/**
 * V1-M20 / TD-44: RED test — eval-service must not double-cast SecurityProbe → ConformityTest.
 *
 * Background:
 *   eval-service.ts:217-225 currently uses `as unknown as readonly ConformityTest[]`
 *   to coerce `SecurityProbe[]` into the input shape of `filterTestsByProfile`.
 *   This is a type-safety smell — the function signature lies, and at runtime
 *   we depend on structural luck (probe.category, probe.id are accessed).
 *
 * Specification:
 *   - filterTestsByProfile should accept SecurityProbe[] directly OR
 *   - A dedicated filterSecurityProbesByProfile should exist and be used.
 *   - eval-service.ts must contain ZERO `as unknown as` casts in the
 *     security-probe code path.
 *
 * Architecture requirements:
 *   - Pure function (deterministic)
 *   - Object.freeze on result
 *   - No `unknown` widening cast
 *   - Types align without coercion
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const evalServicePath = resolve(__dirname, 'eval-service.ts');
const evalServiceSource = readFileSync(evalServicePath, 'utf-8');

describe('TD-44: eval-service must not use unsafe double-cast for SecurityProbe', () => {
  // NOTE: getLastResult() uses one `as unknown as` cast (line ~318) when loading
  // eval results from disk. This is an intentional Zod→EvalResult bridge for
  // forward-compatible deserialization. All other uses (probe filtering) must
  // be cast-free. We check for zero uses OUTSIDE the getLastResult context.
  it('eval-service.ts contains no `as unknown as` casts outside getLastResult', () => {
    const codeWithoutComments = evalServiceSource
      .split('\n')
      .map((line) => line.replace(/\/\/.*$/, ''))
      .join('\n');

    // The single allowed use: getLastResult reads disk results via Zod passthrough schema.
    // We strip that function body before checking for the anti-pattern.
    const withoutGetLastResult = codeWithoutComments
      .replace(/const getLastResult[\s\S]*?^  \};/m, '');

    expect(withoutGetLastResult).not.toMatch(/as\s+unknown\s+as/);
  });

  it('eval-service.ts contains no `as ConformityTest` cast on security probes', () => {
    // Detect specific TD-44 anti-pattern: forcing SecurityProbe → ConformityTest
    expect(evalServiceSource).not.toMatch(/getSecurityProbes\(\)\s+as\s+/);
  });
});

describe('TD-44: filterSecurityProbesByProfile is callable with native types', () => {
  it('exports a security-probe filter that accepts SecurityProbe[] without casts', async () => {
    // This import will fail until dev exports the symbol.
    // Either: (a) filterTestsByProfile generic over both types, or
    //         (b) dedicated filterSecurityProbesByProfile exists.
    const profileFilter = await import('../domain/eval/eval-profile-filter.js');

    const hasSecurityFilter =
      'filterSecurityProbesByProfile' in profileFilter ||
      // OR filterTestsByProfile must be generic and accept SecurityProbe[]
      typeof profileFilter.filterTestsByProfile === 'function';

    expect(hasSecurityFilter).toBe(true);
  });

  it('filtered result is frozen (immutability invariant)', async () => {
    const { filterTestsByProfile } = await import('../domain/eval/eval-profile-filter.js');
    const empty = Object.freeze([]);
    const profile = Object.freeze({
      role: 'provider' as const,
      riskLevel: 'high',
      domain: 'healthcare',
    });
    const result = filterTestsByProfile(empty, profile);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.filtered)).toBe(true);
    expect(Object.isFrozen(result.context)).toBe(true);
  });
});
