/**
 * Art. 5 EU AI Act — Prohibited AI Practices
 * 8 categories, 50+ patterns with synonyms
 */

export type ProhibitedCategory =
  | 'subliminal_manipulation'
  | 'exploitation_of_vulnerabilities'
  | 'social_scoring'
  | 'predictive_policing'
  | 'untargeted_facial_scraping'
  | 'emotion_inference_workplace'
  | 'biometric_categorisation'
  | 'realtime_biometric_id';

export type Strictness = 'strict' | 'standard';

export interface ProhibitedPattern {
  readonly pattern: RegExp;
  readonly category: ProhibitedCategory;
  readonly article: string;
  readonly obligation: string;
  readonly description: string;
  /** If true, only matched in 'strict' mode (grey-area patterns) */
  readonly greyArea?: boolean;
}

// ── Art. 5(1)(a): Subliminal manipulation ───────────────────────────
const subliminal: ProhibitedPattern[] = [
  { pattern: /subliminal\s*(?:manipulation|technique|messaging|influence)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Subliminal manipulation techniques' },
  { pattern: /beyond\s*(?:a\s*)?(?:person(?:'s)?|human)\s*consciousness/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Techniques beyond consciousness' },
  { pattern: /subconscious\s*(?:persuasion|manipulation|influence|targeting)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Subconscious persuasion' },
  { pattern: /(?:hidden|covert|stealth)\s*(?:persuasion|manipulation|influence)\s*(?:pattern|technique|method)?/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Hidden persuasion techniques' },
  { pattern: /neuro(?:linguistic)?\s*(?:manipulation|exploit(?:ation)?|hack)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Neurolinguistic manipulation' },
  { pattern: /dark\s*pattern\s*(?:to\s*)?(?:manipulat|deceiv|trick)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'AI-driven dark patterns', greyArea: true },
  { pattern: /imperceptibl[ey]\s*(?:alter|modify|influenc|manipulat)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Imperceptible influence' },
];

// ── Art. 5(1)(b): Exploitation of vulnerabilities ───────────────────
const exploitation: ProhibitedPattern[] = [
  { pattern: /exploit(?:ing|ation\s*of)?\s*(?:vulnerabilit(?:y|ies)|weakness(?:es)?)\s*(?:of|due\s*to)\s*(?:age|elderly|children|minors|disabilit|mental)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Exploiting age/disability vulnerabilities' },
  { pattern: /target(?:ing)?\s*(?:elderly|seniors?|aged|children|minors?|disabled|vulnerable)\s*(?:users?|people|person|individual|group|population)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Targeting vulnerable groups' },
  { pattern: /(?:manipulat|exploit|deceiv)\w*\s*(?:elderly|seniors?|children|minors?|disabled|cognitively\s*impaired)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Manipulating vulnerable individuals' },
  { pattern: /(?:socio-?economic|financial|economic)\s*vulnerabilit\w*\s*(?:to\s*)?(?:exploit|manipulat|target)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Exploiting socioeconomic vulnerability' },
  { pattern: /(?:preys?|preying|capitaliz)\w*\s*(?:on|upon)\s*(?:vulnerab|disadvantag|impair|disabilit)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Preying on vulnerabilities' },
  { pattern: /(?:cognitive|mental|intellectual)\s*(?:impairment|disability|limitation)\s*(?:to\s*)?(?:target|exploit|influence)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Exploiting cognitive impairment', greyArea: true },
  { pattern: /(?:deceptive|misleading)\s*(?:AI|system|interface)\s*(?:targeting|aimed\s*at|designed\s*for)\s*(?:elderly|children|minors?|vulnerable)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Deceptive AI targeting vulnerable groups' },
];

// ── Art. 5(1)(c): Social scoring ────────────────────────────────────
const socialScoring: ProhibitedPattern[] = [
  { pattern: /social\s*(?:credit\s*)?scor(?:e|ing)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Social scoring system' },
  { pattern: /citizen(?:ship)?\s*(?:scor(?:e|ing)|rating|rank(?:ing)?)\s*(?:system|platform|based)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Citizen scoring/rating system' },
  { pattern: /trustworthiness\s*(?:scor(?:e|ing)|rating|rank)\s*(?:based\s*on|from)\s*(?:social|behavio)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Trustworthiness scoring from social behavior' },
  { pattern: /(?:public\s*authorit\w*|government|municipal|state)\s*(?:scor(?:e|ing)|rating|rank(?:ing)?)\s*(?:of\s*)?(?:citizen|individual|person|people)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Government scoring of citizens' },
  { pattern: /(?:social|civic|community)\s*(?:behavio(?:u?r)|conduct)\s*(?:scor(?:e|ing)|rating|assess(?:ment)?)\s*(?:system|platform)?/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Social behavior assessment' },
  { pattern: /(?:detrimental|unfavo(?:u)?rable)\s*treatment\s*(?:based\s*on|from)\s*(?:social|behavio(?:u?r)|personal(?:ity)?)\s*(?:scor|data|profil)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Detrimental treatment from social profiling' },
  { pattern: /(?:reward|punish|penali[sz]e)\s*(?:based\s*on|for)\s*(?:social|civic|public)\s*(?:behavio(?:u?r)|conduct|compliance)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Reward/punish for social behavior', greyArea: true },
];

// ── Art. 5(1)(d): Biometric categorisation ──────────────────────────
const biometricCategorisation: ProhibitedPattern[] = [
  { pattern: /biometric\s*categori[sz]ation/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Biometric categorisation system' },
  { pattern: /(?:infer|dedu[cs]|predict|classif|determin)\w*\s*(?:race|ethnic(?:ity)?|political\s*opinion|religion|sexual\s*orientation)\s*(?:from|using|via|through)\s*(?:biometric|facial|face|photo|image)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Inferring protected characteristics from biometrics' },
  { pattern: /(?:facial|face|biometric)\s*(?:analysis|recognition|scan(?:ning)?)\s*(?:to|for)\s*(?:categori[sz]|classif|determin|infer|dedu[cs])\w*\s*(?:race|ethnic|religion|politic|sexual)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Facial analysis for categorization' },
  { pattern: /physiognom(?:y|ic)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Physiognomy-based assessment' },
  { pattern: /(?:race|ethnic(?:ity)?)\s*(?:detection|classification|prediction)\s*(?:from|via|using)\s*(?:face|photo|image|biometric|camera)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Race detection from images' },
];

// ── Art. 5(1)(e): Untargeted facial recognition scraping ────────────
const facialScraping: ProhibitedPattern[] = [
  { pattern: /untargeted\s*(?:facial|face)\s*(?:recognition|scraping|image)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Untargeted facial scraping' },
  { pattern: /(?:scrap|harvest|collect|crawl)\w*\s*(?:facial|face)\s*(?:images?|photos?|data)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Scraping facial images' },
  { pattern: /(?:facial|face)\s*(?:image|photo|data)\s*(?:scraping|harvesting|collection|crawling)\s*(?:from|on|across)\s*(?:internet|web|social\s*media|cctv|public)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Facial data scraping from internet/CCTV' },
  { pattern: /(?:mass|bulk|indiscriminat)\w*\s*(?:facial|biometric|face)\s*(?:data(?:base)?|image|recognition)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Mass facial data collection' },
  { pattern: /(?:build|creat|compil)\w*\s*(?:facial|face)\s*(?:recognition\s*)?(?:database|dataset)\s*(?:from|using|via)\s*(?:internet|web|social|public|cctv)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Building facial DB from public sources' },
  { pattern: /(?:harvest|collect|gather)\w*\s*(?:facial|biometric)\s*(?:data|images?)\s*(?:without\s*consent|from\s*(?:public|social))/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Harvesting biometric data without consent' },
];

// ── Art. 5(1)(f): Emotion recognition in workplace/education ────────
const emotionInference: ProhibitedPattern[] = [
  { pattern: /emotion\s*(?:recognition|detection|inference|analysis|monitoring)\s*(?:in|at|for)\s*(?:the\s*)?(?:work(?:place|force)?|employ(?:ee|ment)|office|school|class(?:room)?|universit|educat|campus)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Emotion recognition in workplace/education' },
  { pattern: /(?:work(?:place|force)?|employ(?:ee|ment)|office|school|class(?:room)?|universit|educat)\s*(?:emotion|sentiment|mood|affect)\s*(?:recognition|detection|monitor|track|analys)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Workplace/education emotion monitoring' },
  { pattern: /(?:monitor|track|detect|analys)\w*\s*(?:employee|worker|student|pupil|staff)\s*(?:emotion|sentiment|mood|feeling|affect|stress|engagement)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Monitoring employee/student emotions' },
  { pattern: /(?:employee|worker|student|staff)\s*(?:emotion|mood|sentiment|affect|engagement)\s*(?:track|monitor|surveillance|detect)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Employee/student emotion surveillance' },
  { pattern: /(?:facial|voice|speech)\s*(?:emotion|affect|sentiment)\s*(?:recognition|analysis|detection)\s*(?:for|in|during)\s*(?:interview|hiring|recruit|performance\s*review|exam|test)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Emotion analysis during HR/education processes' },
  { pattern: /emotion\s*recognition/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'General emotion recognition' },
];

// ── Art. 5(1)(g): Real-time remote biometric identification ─────────
const realtimeBiometric: ProhibitedPattern[] = [
  { pattern: /real[- ]?time\s*(?:remote\s*)?biometric\s*identification/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Real-time remote biometric identification' },
  { pattern: /(?:live|real[- ]?time)\s*(?:facial|face|biometric)\s*(?:recognition|identification|matching)\s*(?:in|at)\s*(?:public|street|open|outdoor)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Live facial recognition in public spaces' },
  { pattern: /(?:cctv|surveillance|camera)\s*(?:facial|face|biometric)\s*(?:recognition|identification|matching)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'CCTV biometric identification' },
  { pattern: /(?:public\s*space|street|outdoor)\s*(?:facial|biometric)\s*(?:surveillance|recognition|identification|monitor)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Public space biometric surveillance' },
  { pattern: /(?:mass|population[- ]?wide|blanket)\s*(?:biometric|facial)\s*(?:surveillance|screening|identification)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Mass biometric surveillance' },
  { pattern: /(?:biometric|facial)\s*(?:recognition|identification)\s*(?:of|for)\s*(?:crowd|passerby|pedestrian|bystander)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Biometric identification of crowds', greyArea: true },
];

// ── Art. 5(1)(h): Predictive policing ───────────────────────────────
const predictivePolicing: ProhibitedPattern[] = [
  { pattern: /predictive\s*polic(?:e|ing)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Predictive policing' },
  { pattern: /(?:crime|criminal|offend)\w*\s*(?:risk|probability|likelihood)\s*(?:assess(?:ment)?|predict|scor|profil)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Crime risk assessment/prediction' },
  { pattern: /(?:individual|person|citizen)\s*(?:crime|criminal|offend)\w*\s*(?:risk|profil|predict|scor)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Individual crime risk profiling' },
  { pattern: /(?:profiling|profile)\s*(?:based|solely)\s*(?:on|upon)\s*(?:personal(?:ity)?|trait|characteristic|demographic)\s*(?:to\s*)?(?:predict|assess)\s*(?:crime|criminal|offend)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Profiling to predict crime' },
  { pattern: /(?:pre[- ]?crime|precrime|future\s*crime)\s*(?:detect|predict|system|algorithm)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Pre-crime detection system' },
  { pattern: /(?:recidivism|reoffend)\s*(?:predict|risk|scor|algorithm|model)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Recidivism prediction', greyArea: true },
];

/** All English patterns grouped by category */
export const PROHIBITED_PATTERNS_EN: readonly ProhibitedPattern[] = [
  ...subliminal,
  ...exploitation,
  ...socialScoring,
  ...biometricCategorisation,
  ...facialScraping,
  ...emotionInference,
  ...realtimeBiometric,
  ...predictivePolicing,
];

/** Category descriptions for error messages */
export const CATEGORY_DESCRIPTIONS: Record<ProhibitedCategory, string> = {
  subliminal_manipulation: 'Subliminal manipulation techniques (Art. 5(1)(a))',
  exploitation_of_vulnerabilities: 'Exploitation of vulnerabilities of specific groups (Art. 5(1)(b))',
  social_scoring: 'Social scoring by public authorities (Art. 5(1)(c))',
  biometric_categorisation: 'Biometric categorisation inferring sensitive attributes (Art. 5(1)(d))',
  untargeted_facial_scraping: 'Untargeted scraping of facial images (Art. 5(1)(e))',
  emotion_inference_workplace: 'Emotion recognition in workplace/education (Art. 5(1)(f))',
  realtime_biometric_id: 'Real-time remote biometric identification in public spaces (Art. 5(1)(g))',
  predictive_policing: 'Individual crime risk assessment based on profiling (Art. 5(1)(h))',
};

/** Maximum fine for Art. 5 violations */
export const ART5_MAX_PENALTY = '€35M or 7% of annual global turnover';
