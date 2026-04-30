/**
 * V1-M30.6 / W-2: RED — TS engine user-facing strings still say `complior passport ...`
 *
 * V1-M30.5 W-5 fixed 6 such strings in the Rust CLI source. This test asserts
 * that 6 corresponding strings in the TS engine sources are also updated.
 *
 * Files audited:
 *   - engine/core/src/domain/reporter/priority-actions.ts:128
 *   - engine/core/src/domain/registry/compute-agent-score.ts:89, 93
 *   - engine/core/src/domain/scanner/checks/passport-presence.ts:68
 *   - engine/core/src/domain/scanner/checks/passport-completeness.ts:63, 75
 *
 * The deprecation alias `passport` still works at the CLI level (V1-M30.4 B.1),
 * so existing user scripts are unaffected. But the user-facing HINTS that the
 * engine emits (which surface in HTML reports + scanner findings) must
 * reference the new primary verb `agent`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENGINE_ROOT = resolve(__dirname, '..', '..', '..');
const TARGET_FILES = [
  'src/domain/reporter/priority-actions.ts',
  'src/domain/registry/compute-agent-score.ts',
  'src/domain/scanner/checks/passport-presence.ts',
  'src/domain/scanner/checks/passport-completeness.ts',
];

describe('V1-M30.6 W-2: TS engine user-facing hints use `complior agent`, not `complior passport`', () => {
  it.each(TARGET_FILES)('file %s contains no `complior passport` literals in user-facing strings', (relPath) => {
    const fullPath = resolve(ENGINE_ROOT, relPath);
    const content = readFileSync(fullPath, 'utf-8');

    const lines = content.split('\n');
    const offending: { line: number; text: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      // Skip pure comments
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

      // Skip lines that document the rename / deprecation
      if (/Deprecated|deprecated|alias|V1-M30\.[1-9]/i.test(line)) continue;

      // Skip filename references like `passport.route.ts`
      if (line.includes('passport.route.ts') || line.includes('passport-presence') || line.includes('passport-completeness') || line.includes('passport-service')) continue;

      // Skip type/identifier references (e.g. AgentPassport, passportRoute)
      // The literal we forbid is `complior passport <verb>` inside strings.
      if (line.includes('complior passport')) {
        offending.push({ line: i + 1, text: line.trim().slice(0, 200) });
      }
    }

    if (offending.length > 0) {
      const detail = offending.map((o) => `  line ${o.line}: ${o.text}`).join('\n');
      throw new Error(
        `V1-M30.6 W-2: ${relPath} still contains ${offending.length} user-facing string(s) ` +
          `with literal \`complior passport\`. Replace with \`complior agent\` (the alias still works at CLI level, ` +
          `but new user-facing hints should reference the new primary verb):\n${detail}`,
      );
    }

    expect(offending).toHaveLength(0);
  });
});
