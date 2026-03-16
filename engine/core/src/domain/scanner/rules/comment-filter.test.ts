import { describe, it, expect } from 'vitest';
import { stripCommentsAndStrings, stripCommentsOnly } from './comment-filter.js';

describe('stripCommentsAndStrings', () => {
  describe('TypeScript/JavaScript', () => {
    it('strips line comments', () => {
      const code = `const x = 1; // killSwitch\nconst y = 2;`;
      const stripped = stripCommentsAndStrings(code, '.ts');
      expect(stripped).not.toContain('killSwitch');
      expect(stripped).toContain('const x = 1;');
      expect(stripped).toContain('const y = 2;');
    });

    it('strips block comments', () => {
      const code = `const x = /* killSwitch */ 1;`;
      const stripped = stripCommentsAndStrings(code, '.ts');
      expect(stripped).not.toContain('killSwitch');
      expect(stripped).toContain('const x =');
    });

    it('strips string literals', () => {
      const code = `const msg = "killSwitch";\nconst actual_killSwitch = true;`;
      const stripped = stripCommentsAndStrings(code, '.ts');
      // killSwitch in string should be stripped
      // killSwitch as variable name should remain
      expect(stripped).toContain('actual_killSwitch');
    });

    it('strips template literals', () => {
      const code = 'const msg = `The killSwitch is ${status}`;';
      const stripped = stripCommentsAndStrings(code, '.ts');
      expect(stripped).not.toContain('killSwitch');
    });

    it('preserves line numbers', () => {
      const code = `line1\n// comment\nline3`;
      const stripped = stripCommentsAndStrings(code, '.ts');
      const lines = stripped.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain('line1');
      expect(lines[2]).toContain('line3');
    });

    it('handles escaped quotes in strings', () => {
      const code = `const s = "she said \\"killSwitch\\"";`;
      const stripped = stripCommentsAndStrings(code, '.ts');
      expect(stripped).not.toContain('killSwitch');
    });
  });

  describe('Python', () => {
    it('strips hash comments', () => {
      const code = `x = 1  # killSwitch\ny = 2`;
      const stripped = stripCommentsAndStrings(code, '.py');
      expect(stripped).not.toContain('killSwitch');
      expect(stripped).toContain('x = 1');
    });

    it('strips triple-quoted strings', () => {
      const code = `x = 1\n"""killSwitch docs"""\ny = 2`;
      const stripped = stripCommentsAndStrings(code, '.py');
      expect(stripped).not.toContain('killSwitch');
    });

    it('strips regular Python strings', () => {
      const code = `msg = 'killSwitch'\nreal_kill = True`;
      const stripped = stripCommentsAndStrings(code, '.py');
      expect(stripped).toContain('real_kill');
    });

    it('preserves line numbers in multiline docstrings', () => {
      const code = `line1\n"""\nline3\nline4\n"""\nline6`;
      const stripped = stripCommentsAndStrings(code, '.py');
      const lines = stripped.split('\n');
      expect(lines.length).toBe(6);
    });
  });

  it('returns content unchanged for unknown extensions', () => {
    const code = `killSwitch = true`;
    const stripped = stripCommentsAndStrings(code, '.md');
    expect(stripped).toBe(code);
  });
});

describe('stripCommentsOnly', () => {
  it('strips comments but preserves string literals', () => {
    const code = `const label = "AIDisclosure"; // TODO: rename\nconst x = 1;`;
    const stripped = stripCommentsOnly(code, '.ts');
    expect(stripped).toContain('AIDisclosure');
    expect(stripped).not.toContain('TODO');
    expect(stripped).toContain('const x = 1;');
  });

  it('preserves JSX attribute strings', () => {
    const code = `<div className="AIDisclosure">Powered by AI</div>`;
    const stripped = stripCommentsOnly(code, '.tsx');
    expect(stripped).toContain('AIDisclosure');
    expect(stripped).toContain('Powered by AI');
  });

  it('strips block comments while preserving strings', () => {
    const code = `const x = "keepThis"; /* removeThis */ const y = 1;`;
    const stripped = stripCommentsOnly(code, '.js');
    expect(stripped).toContain('keepThis');
    expect(stripped).not.toContain('removeThis');
  });

  it('strips Python comments but preserves strings', () => {
    const code = `msg = "AIDisclosure"  # remove this comment\nx = 1`;
    const stripped = stripCommentsOnly(code, '.py');
    expect(stripped).toContain('AIDisclosure');
    expect(stripped).not.toContain('remove this');
  });
});
