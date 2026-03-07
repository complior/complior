/**
 * Dutch (NL) prohibited patterns — Art. 5 EU AI Act
 */
import type { ProhibitedPattern } from '../prohibited-patterns.js';

export const PROHIBITED_PATTERNS_NL: readonly ProhibitedPattern[] = Object.freeze([
  // Art. 5(1)(a) — Subliminal manipulation
  { pattern: /subliminale\s*(?:manipulatie|beïnvloeding|techniek)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Subliminale manipulatie' },
  { pattern: /onbewuste\s*(?:beïnvloeding|manipulatie)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Onbewuste beïnvloeding' },

  // Art. 5(1)(b) — Exploitation of vulnerabilities
  { pattern: /(?:uitbuiting|misbruik)\s*(?:van\s*)?(?:kwetsbaarh|zwakh)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Uitbuiting van kwetsbaarheid' },
  { pattern: /(?:ouderen|gehandicapten|minderjarigen|kwetsbare)\s*(?:personen\s*)?(?:uitbuit|manipuler|misbruik)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Misbruik van kwetsbare personen' },

  // Art. 5(1)(c) — Social scoring
  { pattern: /(?:sociaal|burger)\s*(?:credit\s*)?(?:scor(?:e|ing)|punten(?:systeem)?|beoordelings(?:systeem)?)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Sociaal scoresysteem' },

  // Art. 5(1)(d) — Biometric categorisation
  { pattern: /biometrische\s*categori[sz](?:atie|ering)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Biometrische categorisatie' },

  // Art. 5(1)(e) — Untargeted facial scraping
  { pattern: /(?:ongericht|massaal)\s*(?:gezichts(?:herkenning|beelden)|biometrische\s*gegevens)\s*(?:verza|scrap)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Ongerichte verzameling gezichtsbeelden' },

  // Art. 5(1)(f) — Emotion recognition
  { pattern: /emotieherkenning\s*(?:op\s*(?:het\s*)?werk|op\s*school|in\s*(?:het\s*)?onderwijs)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Emotieherkenning op werk/school' },
  { pattern: /(?:medewerker|leerling|student|werknemer)\s*(?:emotie|stemming)\s*(?:herkenning|bewaking|analyse)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Medewerker emotie-analyse' },

  // Art. 5(1)(g) — Real-time biometric ID
  { pattern: /(?:realtime|real-time)\s*(?:biometrische\s*)?(?:gezichts|identificatie)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Realtime biometrische identificatie' },

  // Art. 5(1)(c) — Social scoring (additional)
  { pattern: /(?:betrouwbaarheid|vertrouwen)\s*(?:score|beoordeling|waardering)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Betrouwbaarheidsbeoordeling' },

  // Art. 5(1)(d) — Biometric categorisation (additional)
  { pattern: /(?:ras|etniciteit|religie|seksuele\s*geaardheid)\s*(?:afleiden|bepalen|herkennen)\s*(?:uit|van|door)\s*(?:biometrisch|gezicht)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Afleiden van gevoelige kenmerken uit biometrie' },

  // Art. 5(1)(e) — Untargeted facial scraping (additional)
  { pattern: /(?:gezichtsbeeld|biometrische\s*gegevens)\s*(?:uit|van)\s*(?:internet|web|openbaar|CCTV)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Gezichtsbeelden van internet/openbare bronnen' },

  // Art. 5(1)(g) — Real-time biometric ID (additional)
  { pattern: /biometrische\s*(?:identificatie\s*op\s*afstand|massabewaking)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Biometrische identificatie op afstand/massabewaking' },

  // Art. 5(1)(h) — Predictive policing
  { pattern: /(?:voorspellend|predictie)\s*(?:politiewerk|policing)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Voorspellend politiewerk' },
  { pattern: /(?:criminaliteit|misdaad)\s*(?:voorspell|predict|risicobeoordel)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Criminaliteitsvoorspelling' },
]);
