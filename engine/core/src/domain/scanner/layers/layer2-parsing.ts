export interface SectionDepth {
  readonly wordCount: number;
  readonly sentenceCount: number;
  readonly hasLists: boolean;
  readonly hasTables: boolean;
  readonly hasSpecifics: boolean;
  readonly isShallow: boolean;
}

const HEADING_REGEX = /^#{1,4}\s+(.+)$/gm;

export const parseMarkdownHeadings = (content: string): readonly string[] => {
  const headings: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = HEADING_REGEX.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  return headings;
};

export const normalize = (text: string): string =>
  text.toLowerCase().replace(/[\s_-]+/g, ' ').trim();

export const headingMatches = (heading: string, sectionTitle: string): boolean =>
  normalize(heading).includes(normalize(sectionTitle));

const LIST_REGEX = /^[\s]*[-*•]\s+|^\s*\d+\.\s+/m;
const TABLE_REGEX = /\|.*\|.*\|/;
const SPECIFICS_REGEX = /\b\d{4}[-/]\d{2}[-/]\d{2}\b|\b\d+%|\b\d+\.\d+\b|€|Art\.\s*\d+/;

export const extractSectionContents = (content: string): ReadonlyMap<string, string> => {
  const sections = new Map<string, string>();
  const lines = content.split('\n');
  let currentHeading: string | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = /^#{1,4}\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (currentHeading !== null) {
        sections.set(currentHeading, currentContent.join('\n'));
      }
      currentHeading = headingMatch[1].trim();
      currentContent = [];
    } else if (currentHeading !== null) {
      currentContent.push(line);
    }
  }

  if (currentHeading !== null) {
    sections.set(currentHeading, currentContent.join('\n'));
  }

  return sections;
};

export const measureSectionDepth = (content: string): SectionDepth => {
  const trimmed = content.trim();
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const hasLists = LIST_REGEX.test(trimmed);
  const hasTables = TABLE_REGEX.test(trimmed);
  const hasSpecifics = SPECIFICS_REGEX.test(trimmed);

  const isShallow = words.length < 50 && !hasLists && !hasTables && !hasSpecifics;

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    hasLists,
    hasTables,
    hasSpecifics,
    isShallow,
  };
};
