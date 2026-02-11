(() => {
  const mkResult = (riskLevel, confidence, rule, reasoning, articleReferences, annexCategory) => ({
    riskLevel,
    confidence,
    matchedRules: [rule + ': ' + reasoning],
    articleReferences,
    annexCategory,
  });

  const ANNEX_III_DOMAINS = new Set([
    'biometrics', 'critical_infrastructure', 'education', 'employment',
    'essential_services', 'law_enforcement', 'migration', 'justice',
  ]);

  /* eslint-disable camelcase */
  const ANNEX_CATEGORIES = {
    biometrics: 'Annex III, 1: Biometrics',
    critical_infrastructure: 'Annex III, 2: Critical Infrastructure',
    education: 'Annex III, 3: Education & Vocational Training',
    employment: 'Annex III, 4: Employment & Workers Management',
    essential_services: 'Annex III, 5: Essential Services',
    law_enforcement: 'Annex III, 6: Law Enforcement',
    migration: 'Annex III, 7: Migration, Asylum & Border Control',
    justice: 'Annex III, 8: Administration of Justice & Democracy',
  };
  /* eslint-enable camelcase */

  const classify = (input) => {
    const {
      name = '', domain = 'other', purpose = '', dataTypes = [],
      vulnerableGroups = false,
      autonomyLevel = 'advisory', humanOversight = true,
      affectsNaturalPersons = false, catalogDefaultRisk = null,
    } = input;

    const purposeLower = (purpose || '').toLowerCase();
    const nameLower = (name || '').toLowerCase();
    const dataTypesArr = Array.isArray(dataTypes) ? dataTypes : [];
    const hasBiometric = dataTypesArr.includes('biometric');

    // ─── STEP 1: Art. 5 Prohibited Practices ─────────────────────────

    // 5(1)(a): Subliminal/manipulative/deceptive techniques
    if (affectsNaturalPersons && (
      purposeLower.includes('subliminal') ||
      purposeLower.includes('manipulative') ||
      purposeLower.includes('deceptive') ||
      purposeLower.includes('dark pattern')
    )) {
      return mkResult('prohibited', 95, 'Art. 5(1)(a)',
        'Subliminal, manipulative, or deceptive AI techniques that materially distort behavior',
        [{ article: 'Art. 5(1)(a)', text: 'Prohibited: subliminal/manipulative techniques', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(b): Exploitation of vulnerabilities
    if (vulnerableGroups && affectsNaturalPersons && (
      purposeLower.includes('exploit') ||
      purposeLower.includes('target vulnerable') ||
      purposeLower.includes('vulnerability exploitation')
    )) {
      return mkResult('prohibited', 95, 'Art. 5(1)(b)',
        'AI exploiting vulnerabilities of specific groups (age, disability, social situation)',
        [{ article: 'Art. 5(1)(b)', text: 'Prohibited: exploitation of vulnerabilities', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(c): Social scoring
    if (affectsNaturalPersons && (
      purposeLower.includes('social scoring') ||
      purposeLower.includes('social credit') ||
      purposeLower.includes('social behavior evaluation') ||
      purposeLower.includes('social behaviour evaluation')
    )) {
      return mkResult('prohibited', 95, 'Art. 5(1)(c)',
        'Social scoring: evaluating persons based on social behavior leading to detrimental treatment',
        [{ article: 'Art. 5(1)(c)', text: 'Prohibited: social scoring', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(d): Individual criminal risk prediction (sole profiling)
    if (affectsNaturalPersons && (
      purposeLower.includes('criminal prediction') ||
      purposeLower.includes('predict criminal') ||
      purposeLower.includes('crime prediction')
    ) && !purposeLower.includes('objective facts') && !purposeLower.includes('human assessment')) {
      return mkResult('prohibited', 95, 'Art. 5(1)(d)',
        'Predicting individual criminal risk based solely on profiling or personality traits',
        [{ article: 'Art. 5(1)(d)', text: 'Prohibited: sole-profiling criminal prediction', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(e): Untargeted facial scraping
    if (
      purposeLower.includes('facial scraping') ||
      purposeLower.includes('face scraping') ||
      purposeLower.includes('untargeted biometric collection') ||
      purposeLower.includes('face database')
    ) {
      return mkResult('prohibited', 95, 'Art. 5(1)(e)',
        'Untargeted scraping of facial images from internet or CCTV for facial recognition databases',
        [{ article: 'Art. 5(1)(e)', text: 'Prohibited: untargeted facial scraping', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(f): Emotion recognition in workplace/education
    if (hasBiometric && (
      purposeLower.includes('emotion recognition') ||
      purposeLower.includes('emotion detection') ||
      purposeLower.includes('emotion inference')
    ) && (domain === 'employment' || domain === 'education') &&
      !purposeLower.includes('medical') && !purposeLower.includes('safety')
    ) {
      return mkResult('prohibited', 95, 'Art. 5(1)(f)',
        'Emotion recognition in workplace or educational institution (no medical/safety exception)',
        [{ article: 'Art. 5(1)(f)', text: 'Prohibited: workplace/education emotion recognition', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(g): Biometric categorization by protected characteristics
    if (hasBiometric && purposeLower.includes('categoriz') && (
      purposeLower.includes('race') || purposeLower.includes('religion') ||
      purposeLower.includes('political') || purposeLower.includes('sexual orientation') ||
      purposeLower.includes('protected characteristic')
    )) {
      return mkResult('prohibited', 95, 'Art. 5(1)(g)',
        'Biometric categorization deducing race, religion, political opinions, or sexual orientation',
        [{ article: 'Art. 5(1)(g)', text: 'Prohibited: biometric categorization by protected characteristics', relevance: 'direct' }],
        null,
      );
    }

    // 5(1)(h): Real-time remote biometric ID in public spaces
    if (hasBiometric && (
      purposeLower.includes('real-time') || purposeLower.includes('realtime')
    ) && (
      purposeLower.includes('identification') || purposeLower.includes('biometric id')
    ) && (
      purposeLower.includes('public') || purposeLower.includes('publicly accessible')
    )) {
      return mkResult('prohibited', 95, 'Art. 5(1)(h)',
        'Real-time remote biometric identification in publicly accessible spaces',
        [{ article: 'Art. 5(1)(h)', text: 'Prohibited: real-time remote biometric ID in public spaces', relevance: 'direct' }],
        null,
      );
    }

    // ─── STEP 2: Annex III High-Risk ─────────────────────────────────

    if (ANNEX_III_DOMAINS.has(domain)) {
      const annexCat = ANNEX_CATEGORIES[domain];

      // Profiling override: ALWAYS high-risk, no exceptions
      if (affectsNaturalPersons && (
        purposeLower.includes('profiling') ||
        purposeLower.includes('profile') ||
        purposeLower.includes('scoring') ||
        purposeLower.includes('screening') ||
        purposeLower.includes('evaluation of person') ||
        purposeLower.includes('assess person')
      )) {
        return mkResult('high', 95, 'Art. 6(2) + Profiling Override',
          'High-risk: AI profiling natural persons in ' + annexCat + ' (no Art. 6(3) exceptions apply)',
          [
            { article: 'Art. 6(2)', text: 'High-risk: Annex III use case', relevance: 'direct' },
            { article: 'Art. 6(3)', text: 'Profiling override: exceptions do not apply', relevance: 'direct' },
          ],
          annexCat,
        );
      }

      // Art. 6(3) exceptions check
      const isNarrowProcedural = purposeLower.includes('narrow procedural') ||
        purposeLower.includes('simple lookup') || purposeLower.includes('data entry');
      const isImprovement = purposeLower.includes('improve') &&
        purposeLower.includes('human');
      const isPatternDetection = purposeLower.includes('pattern detection') ||
        purposeLower.includes('anomaly detection');
      const isPreparatory = purposeLower.includes('preparatory') ||
        purposeLower.includes('preparation') || purposeLower.includes('draft');

      if (isNarrowProcedural || isImprovement || isPatternDetection || isPreparatory) {
        if (autonomyLevel === 'advisory' && humanOversight) {
          return mkResult('limited', 75, 'Art. 6(3) Exception',
            'Annex III domain (' + annexCat + ') but Art. 6(3) exception applies: narrow/improvement/pattern/preparatory task with human oversight',
            [
              { article: 'Art. 6(2)', text: 'Annex III listed domain', relevance: 'context' },
              { article: 'Art. 6(3)', text: 'Exception: not high-risk due to limited scope', relevance: 'direct' },
            ],
            annexCat,
          );
        }
      }

      // Default Annex III → high-risk
      return mkResult('high', 90, 'Art. 6(2)',
        'High-risk: falls within ' + annexCat,
        [{ article: 'Art. 6(2)', text: 'High-risk: Annex III domain — ' + annexCat, relevance: 'direct' }],
        annexCat,
      );
    }

    // ─── STEP 3: Catalog default risk (safety component pathway) ─────

    if (catalogDefaultRisk === 'high') {
      return mkResult('high', 85, 'Art. 6(1)',
        'High-risk: catalog indicates safety component or known high-risk system',
        [{ article: 'Art. 6(1)', text: 'High-risk: safety component (Annex I) or catalog default', relevance: 'direct' }],
        null,
      );
    }

    // ─── STEP 4: GPAI Detection ──────────────────────────────────────

    if (catalogDefaultRisk === 'gpai') {
      return mkResult('gpai', 85, 'Art. 51-56',
        'General-Purpose AI (GPAI) model: subject to GPAI-specific obligations',
        [{ article: 'Art. 51', text: 'GPAI model obligations', relevance: 'direct' }],
        null,
      );
    }

    // ─── STEP 5: Art. 50 Transparency (Limited Risk) ─────────────────

    // Chatbot detection
    if (purposeLower.includes('chatbot') || purposeLower.includes('conversational ai') ||
        purposeLower.includes('virtual assistant') || nameLower.includes('chat')) {
      return mkResult('limited', 85, 'Art. 50(1)',
        'Limited risk: AI system interacting with natural persons must disclose AI nature',
        [{ article: 'Art. 50(1)', text: 'Transparency: inform users of AI interaction', relevance: 'direct' }],
        null,
      );
    }

    // Synthetic content / text generation
    if (purposeLower.includes('content generation') || purposeLower.includes('text generation') ||
        purposeLower.includes('synthetic content') || purposeLower.includes('generate text')) {
      return mkResult('limited', 85, 'Art. 50(2)',
        'Limited risk: AI-generated content must be marked as such',
        [{ article: 'Art. 50(2)', text: 'Transparency: mark AI-generated content', relevance: 'direct' }],
        null,
      );
    }

    // Deepfake detection
    if (purposeLower.includes('deepfake') || purposeLower.includes('image generation') ||
        purposeLower.includes('video generation') || purposeLower.includes('voice cloning')) {
      return mkResult('limited', 85, 'Art. 50(4)',
        'Limited risk: deepfakes and AI-generated media must be disclosed',
        [{ article: 'Art. 50(4)', text: 'Transparency: disclose AI-generated/manipulated content', relevance: 'direct' }],
        null,
      );
    }

    // Emotion recognition (not in prohibited domains)
    if (hasBiometric && (
      purposeLower.includes('emotion') || purposeLower.includes('sentiment')
    )) {
      return mkResult('limited', 85, 'Art. 50(3)',
        'Limited risk: emotion recognition system must inform affected persons',
        [{ article: 'Art. 50(3)', text: 'Transparency: inform about emotion recognition', relevance: 'direct' }],
        null,
      );
    }

    // Catalog default limited
    if (catalogDefaultRisk === 'limited') {
      return mkResult('limited', 85, 'Art. 50',
        'Limited risk: catalog indicates transparency obligations apply',
        [{ article: 'Art. 50', text: 'Transparency obligations apply', relevance: 'direct' }],
        null,
      );
    }

    // ─── STEP 6: Context Modifiers ───────────────────────────────────

    let riskLevel = 'minimal';
    let confidence = 60;
    const matchedRules = [];
    const refs = [];

    // Vulnerable groups escalation
    if (vulnerableGroups && affectsNaturalPersons) {
      riskLevel = 'limited';
      confidence = 75;
      matchedRules.push('Context: vulnerable groups involved — escalated to limited');
      refs.push({ article: 'Art. 5(1)(b)', text: 'Vulnerable groups present — increased scrutiny', relevance: 'context' });
    }

    // Autonomous + no oversight escalation
    if (autonomyLevel === 'autonomous' && !humanOversight && affectsNaturalPersons) {
      riskLevel = riskLevel === 'minimal' ? 'limited' : 'high';
      confidence = 75;
      matchedRules.push('Context: autonomous operation without human oversight — escalated');
      refs.push({ article: 'Art. 14', text: 'Human oversight requirements', relevance: 'context' });
    }

    if (matchedRules.length > 0) {
      return {
        riskLevel,
        confidence,
        matchedRules,
        articleReferences: refs,
        annexCategory: null,
      };
    }

    // ─── STEP 7: Default Minimal ─────────────────────────────────────

    return mkResult('minimal', 60, 'Default',
      'Minimal risk: no specific high-risk, prohibited, or transparency rules matched',
      [{ article: 'Art. 69', text: 'Minimal risk: voluntary codes of conduct', relevance: 'context' }],
      null,
    );
  };

  return { classify };
})()
