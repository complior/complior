/**
 * Strip comments and string literals from source code.
 * Replaces them with whitespace to preserve line numbers.
 */
export const stripCommentsAndStrings = (content: string, extension: string): string => {
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.go', '.java', '.rs'].includes(extension)) {
    return stripCStyleComments(content);
  }
  if (extension === '.py') {
    return stripPythonComments(content);
  }
  return content;
};

/**
 * Strip comments only (preserve string literals).
 * Use for pattern matching where compliance patterns may be in string values.
 */
export const stripCommentsOnly = (content: string, extension: string): string => {
  if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.go', '.java', '.rs'].includes(extension)) {
    return stripCStyleCommentsOnly(content);
  }
  if (extension === '.py') {
    return stripPythonCommentsOnly(content);
  }
  return content;
};

/** Strip C-style comments only — skip over string literals without removing them */
const stripCStyleCommentsOnly = (content: string): string => {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Line comment
    if (content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // Block comment
    if (content[i] === '/' && content[i + 1] === '*') {
      result += ' ';
      i += 2;
      while (i < content.length) {
        if (content[i] === '*' && content[i + 1] === '/') {
          result += '  ';
          i += 2;
          break;
        }
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    // Skip over strings without stripping them (to not enter comment-like chars inside strings)
    if (content[i] === '`' || content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += content[i];
      i++;
      if (quote === '`') {
        while (i < content.length && content[i] !== '`') {
          if (content[i] === '\\') {
            result += content[i] + (content[i + 1] ?? '');
            i += 2;
            continue;
          }
          result += content[i];
          i++;
        }
      } else {
        while (i < content.length && content[i] !== quote) {
          if (content[i] === '\\') {
            result += content[i] + (content[i + 1] ?? '');
            i += 2;
            continue;
          }
          result += content[i];
          i++;
        }
      }
      if (i < content.length) { result += content[i]; i++; }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
};

/** Strip Python comments only — preserve regular strings */
const stripPythonCommentsOnly = (content: string): string => {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Line comment
    if (content[i] === '#') {
      while (i < content.length && content[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // Skip over strings without stripping
    if (content[i] === '"' || content[i] === "'") {
      // Check triple-quote
      if (content[i + 1] === content[i] && content[i + 2] === content[i]) {
        const q = content.slice(i, i + 3);
        result += q;
        i += 3;
        while (i < content.length) {
          if (content[i] === q[0] && content[i + 1] === q[1] && content[i + 2] === q[2]) {
            result += q;
            i += 3;
            break;
          }
          result += content[i];
          i++;
        }
        continue;
      }
      // Single-line string
      const quote = content[i];
      result += content[i];
      i++;
      while (i < content.length && content[i] !== quote && content[i] !== '\n') {
        if (content[i] === '\\') {
          result += content[i] + (content[i + 1] ?? '');
          i += 2;
          continue;
        }
        result += content[i];
        i++;
      }
      if (i < content.length && content[i] === quote) { result += content[i]; i++; }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
};

/**
 * Strip C-style comments (// and /* *​/) and string literals.
 */
const stripCStyleComments = (content: string): string => {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Line comment
    if (content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // Block comment
    if (content[i] === '/' && content[i + 1] === '*') {
      result += ' ';
      i += 2;
      while (i < content.length) {
        if (content[i] === '*' && content[i + 1] === '/') {
          result += '  ';
          i += 2;
          break;
        }
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    // Template literal
    if (content[i] === '`') {
      result += ' ';
      i++;
      while (i < content.length && content[i] !== '`') {
        // Handle template literal expressions ${...}
        if (content[i] === '$' && content[i + 1] === '{') {
          result += '  ';
          i += 2;
          let depth = 1;
          while (i < content.length && depth > 0) {
            if (content[i] === '{') depth++;
            if (content[i] === '}') depth--;
            result += content[i] === '\n' ? '\n' : ' ';
            i++;
          }
          continue;
        }
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < content.length) { result += ' '; i++; }
      continue;
    }

    // String literals (single and double quotes)
    if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += ' ';
      i++;
      while (i < content.length && content[i] !== quote) {
        if (content[i] === '\\') {
          result += '  ';
          i += 2;
          continue;
        }
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < content.length) { result += ' '; i++; }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
};

/**
 * Strip Python comments (# and triple-quoted strings).
 */
const stripPythonComments = (content: string): string => {
  let result = '';
  let i = 0;

  while (i < content.length) {
    // Triple-quoted strings (""" or ''')
    if (
      (content[i] === '"' && content[i + 1] === '"' && content[i + 2] === '"') ||
      (content[i] === "'" && content[i + 1] === "'" && content[i + 2] === "'")
    ) {
      const quote = content.slice(i, i + 3);
      result += '   ';
      i += 3;
      while (i < content.length) {
        if (content[i] === quote[0] && content[i + 1] === quote[1] && content[i + 2] === quote[2]) {
          result += '   ';
          i += 3;
          break;
        }
        result += content[i] === '\n' ? '\n' : ' ';
        i++;
      }
      continue;
    }

    // Line comment
    if (content[i] === '#') {
      while (i < content.length && content[i] !== '\n') {
        result += ' ';
        i++;
      }
      continue;
    }

    // Regular strings
    if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      result += ' ';
      i++;
      while (i < content.length && content[i] !== quote && content[i] !== '\n') {
        if (content[i] === '\\') {
          result += '  ';
          i += 2;
          continue;
        }
        result += ' ';
        i++;
      }
      if (i < content.length && content[i] === quote) { result += ' '; i++; }
      continue;
    }

    result += content[i];
    i++;
  }

  return result;
};
