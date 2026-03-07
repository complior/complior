/**
 * French (FR) prohibited patterns — Art. 5 EU AI Act
 */
import type { ProhibitedPattern } from '../prohibited-patterns.js';

export const PROHIBITED_PATTERNS_FR: readonly ProhibitedPattern[] = [
  // Art. 5(1)(a) — Subliminal manipulation
  { pattern: /manipulation\s*subliminale/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Manipulation subliminale' },
  { pattern: /technique\s*subliminale/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Technique subliminale' },
  { pattern: /influence\s*(?:subconsciente|inconsciente)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Influence subconsciente' },

  // Art. 5(1)(b) — Exploitation of vulnerabilities
  { pattern: /exploitation\s*(?:des?\s*)?(?:vulnérabilités?|faiblesses?)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Exploitation des vulnérabilités' },
  { pattern: /(?:manipuler|exploiter)\s*(?:les?\s*)?(?:personnes?\s*)?(?:âgées?|handicapées?|mineures?|vulnérables?)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Exploitation de personnes vulnérables' },

  // Art. 5(1)(c) — Social scoring
  { pattern: /(?:notation|score|crédit)\s*social/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Notation sociale' },
  { pattern: /(?:système\s*de\s*)?(?:notation|évaluation)\s*(?:des?\s*)?citoyen/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Système de notation des citoyens' },

  // Art. 5(1)(d) — Biometric categorisation
  { pattern: /catégorisation\s*biométrique/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Catégorisation biométrique' },
  { pattern: /(?:déduire|inférer|déterminer)\s*(?:la\s*)?(?:race|ethnie|religion|orientation\s*sexuelle)\s*(?:à\s*partir|par)\s*(?:de\s*)?(?:biométr|facial|visage)/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Déduction de caractéristiques sensibles par biométrie' },

  // Art. 5(1)(e) — Untargeted facial scraping
  { pattern: /(?:collecte|moissonnage)\s*(?:non\s*ciblée?\s*)?(?:d'?images?\s*)?faciale/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Collecte non ciblée d\'images faciales' },

  // Art. 5(1)(f) — Emotion recognition
  { pattern: /reconnaissance\s*(?:des?\s*)?émotions?\s*(?:au\s*travail|à\s*l['']école|en\s*(?:milieu\s*)?(?:scolaire|professionnel))/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Reconnaissance des émotions au travail/école' },
  { pattern: /(?:surveillance|détection)\s*(?:des?\s*)?(?:émotions?|sentiments?)\s*(?:des?\s*)?(?:employés?|élèves?|étudiants?|salariés?)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Surveillance des émotions des employés/élèves' },

  // Art. 5(1)(g) — Real-time biometric ID
  { pattern: /identification\s*biométrique\s*(?:à\s*distance|en\s*temps\s*réel)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Identification biométrique en temps réel' },
  { pattern: /(?:reconnaissance|surveillance)\s*faciale\s*(?:en\s*temps\s*réel|dans\s*l['']espace\s*public)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Reconnaissance faciale en temps réel' },

  // Art. 5(1)(h) — Predictive policing
  { pattern: /police\s*prédictive/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Police prédictive' },
  { pattern: /(?:prédiction|prévision)\s*(?:de\s*)?(?:la\s*)?(?:criminalité|délinquance)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Prédiction de la criminalité' },
];
