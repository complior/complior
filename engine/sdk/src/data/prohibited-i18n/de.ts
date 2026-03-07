/**
 * German (DE) prohibited patterns — Art. 5 EU AI Act
 */
import type { ProhibitedPattern } from '../prohibited-patterns.js';

export const PROHIBITED_PATTERNS_DE: readonly ProhibitedPattern[] = Object.freeze([
  // Art. 5(1)(a) — Subliminal manipulation
  { pattern: /unterschwellige\s*(?:Manipulation|Beeinflussung|Technik)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Unterschwellige Manipulation' },
  { pattern: /unterbewusste\s*(?:Beeinflussung|Manipulation)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Unterbewusste Beeinflussung' },

  // Art. 5(1)(b) — Exploitation of vulnerabilities
  { pattern: /Ausnutzung\s*(?:von\s*)?(?:Schwächen|Schutzbedürftigkeit|Verwundbarkeit)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Ausnutzung von Schwächen' },
  { pattern: /(?:ältere|behinderte|minderjährige)\s*(?:Menschen|Personen)\s*(?:ausnutz|manipulier|täusch)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Ausnutzung schutzbedürftiger Gruppen' },

  // Art. 5(1)(c) — Social scoring
  { pattern: /(?:Sozial(?:kredit)?|Bürger)[\s-]*(?:Bewertung(?:ssystem)?|Punktesystem|Scoring)/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Sozialkreditsystem' },
  { pattern: /Vertrauenswürdigkeit(?:s(?:bewertung|score))?/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Vertrauenswürdigkeitsbewertung' },

  // Art. 5(1)(d) — Biometric categorisation
  { pattern: /biometrische\s*Kategori[sz]ierung/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Biometrische Kategorisierung' },
  { pattern: /(?:Rasse|Ethnie|Religion|sexuelle\s*Orientierung)\s*(?:aus|von|durch)\s*(?:biometrisch|Gesicht)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Ableitung sensibler Daten aus Biometrie' },

  // Art. 5(1)(e) — Untargeted facial scraping
  { pattern: /(?:ungerichtete|massenhafte)\s*(?:Gesichtserkennung|Gesichtsbildersammlung)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Ungerichtete Gesichtsbildersammlung' },
  { pattern: /Gesichtsbild(?:er)?\s*(?:aus|vom)\s*(?:Internet|Web|CCTV|öffentlich)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Gesichtsbilder aus dem Internet' },

  // Art. 5(1)(f) — Emotion recognition
  { pattern: /Emotions?erkennung\s*(?:am\s*Arbeitsplatz|in\s*(?:der\s*)?(?:Schule|Bildung|Ausbildung))/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Emotionserkennung am Arbeitsplatz/Schule' },
  { pattern: /(?:Mitarbeiter|Schüler|Studenten)\s*(?:Emotions?|Stimmungs?|Gefühls?)\s*(?:erkennung|überwachung|analyse)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Mitarbeiter-Emotionsüberwachung' },

  // Art. 5(1)(g) — Real-time biometric ID
  { pattern: /(?:Echtzeit|Live)\s*(?:biometrische\s*)?(?:Gesichts|Fernidentifi[zk])/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Echtzeit-Gesichtserkennung' },
  { pattern: /biometrische\s*(?:Fernidentifi[zk]ierung|Massenüberwachung)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Biometrische Massenüberwachung' },

  // Art. 5(1)(a) — Subliminal manipulation (additional)
  { pattern: /(?:verdeckte|versteckte|heimliche)\s*(?:Beeinflussung|Manipulation|Überzeugung)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Verdeckte Beeinflussung' },

  // Art. 5(1)(b) — Exploitation (additional)
  { pattern: /(?:täuschende|irreführende)\s*(?:KI|System|Schnittstelle)\s*(?:für|gegen|gerichtet\s*auf)\s*(?:ältere|Kinder|Minderjährige|behinderte|schutzbedürftige)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Täuschende KI gegen Schutzbedürftige' },

  // Art. 5(1)(e) — Untargeted facial scraping (additional)
  { pattern: /(?:sammeln|ernten|crawlen)\s*(?:von\s*)?(?:Gesichts|biometrische)\s*(?:bild|daten|aufnahm)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Sammeln von Gesichtsdaten' },

  // Art. 5(1)(h) — Predictive policing
  { pattern: /(?:vorausschauende|prädiktive)\s*Polizeiarbeit/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Vorausschauende Polizeiarbeit' },
  { pattern: /(?:Kriminalitäts|Straftaten?)\s*(?:vorhersage|prognose|risikobewertung)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Kriminalitätsprognose' },
]);
