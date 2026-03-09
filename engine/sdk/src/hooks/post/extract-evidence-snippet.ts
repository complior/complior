/** Extract ~80 chars around a regex match for evidence context. */
export const extractEvidenceSnippet = (text: string, match: RegExpExecArray, description: string): string => {
  const start = Math.max(0, match.index - 20);
  const end = Math.min(text.length, match.index + match[0].length + 20);
  const snippet = text.slice(start, end).trim();
  return `[${description}] "...${snippet}..."`;
};
