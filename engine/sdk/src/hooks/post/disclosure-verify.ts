import type { PostHook } from '../../types.js';
import { DISCLOSURE_PHRASES } from '../../data/disclosure-phrases.js';
import { DisclosureMissingError } from '../../errors.js';
import { extractResponseText } from './extract-response-text.js';

type DisclosureLanguage = 'EN' | 'DE' | 'FR' | 'ES';

/** OBL-015: Verify disclosure phrases present in LLM response text (Art.50(1)) */
export const disclosureVerifyHook: PostHook = (ctx, response) => {
  const text = extractResponseText(response);
  const config = ctx.config;

  const languages: readonly DisclosureLanguage[] =
    config.disclosureLanguages && config.disclosureLanguages.length > 0
      ? config.disclosureLanguages
      : (['EN', 'DE', 'FR', 'ES'] as const);

  const mode = config.disclosureMode ?? 'warn-only';

  // Group phrases by language
  const phrasesByLang = new Map<DisclosureLanguage, readonly RegExp[]>();
  for (const lang of languages) {
    phrasesByLang.set(
      lang,
      DISCLOSURE_PHRASES.filter((p) => p.language === lang).map((p) => p.pattern),
    );
  }

  // Check each language — FP-style filter instead of mutable push
  const hasMatch = (lang: DisclosureLanguage): boolean =>
    (phrasesByLang.get(lang) ?? []).some((p) => p.test(text));

  const languagesFound = [...languages].filter(hasMatch);
  const languagesMissing = [...languages].filter((lang) => !hasMatch(lang));

  // Check custom phrases
  const customPhrases = config.customDisclosurePhrases;
  const customMatch = customPhrases !== undefined && customPhrases.length > 0
    && customPhrases.some((p) => p.test(text));

  const verified = languagesFound.length > 0 || customMatch;

  // Block mode: throw if no disclosure found in any checked language
  if (mode === 'block' && !verified) {
    const expectedPatterns = languages
      .flatMap((lang) => DISCLOSURE_PHRASES.filter((p) => p.language === lang))
      .map((p) => p.description);
    throw new DisclosureMissingError(
      `AI disclosure missing in response. Checked languages: ${languages.join(', ')}. Art.50(1) requires disclosure.`,
      languages.join(','),
      expectedPatterns,
    );
  }

  return {
    response,
    metadata: {
      ...ctx.metadata,
      disclosureVerified: verified,
      disclosureLanguagesChecked: [...languages],
      disclosureLanguagesFound: [...languagesFound],
      disclosureMissingLanguages: [...languagesMissing],
    },
    headers: { 'X-AI-Disclosure': verified ? 'verified' : 'missing' },
  };
};
