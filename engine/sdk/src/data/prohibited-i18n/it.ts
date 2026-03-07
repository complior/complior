/**
 * Italian (IT) prohibited patterns — Art. 5 EU AI Act
 */
import type { ProhibitedPattern } from '../prohibited-patterns.js';

export const PROHIBITED_PATTERNS_IT: readonly ProhibitedPattern[] = Object.freeze([
  // Art. 5(1)(a) — Subliminal manipulation
  { pattern: /manipolazione\s*subliminale/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Manipolazione subliminale' },
  { pattern: /tecnica\s*subliminale/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Tecnica subliminale' },
  { pattern: /influenza\s*(?:subconscia|inconscia)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Influenza subconscia' },

  // Art. 5(1)(b) — Exploitation of vulnerabilities
  { pattern: /sfruttamento\s*(?:delle?\s*)?(?:vulnerabilità|debolezz)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Sfruttamento delle vulnerabilità' },
  { pattern: /(?:manipolare|sfruttare)\s*(?:le\s*)?(?:persone\s*)?(?:anzian[ei]|minorenni|bambin[ei]|disabil[ei]|vulnerabil[ei])/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Sfruttamento di persone vulnerabili' },

  // Art. 5(1)(c) — Social scoring
  { pattern: /(?:punteggio|credito|valutazione)\s*sociale/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Punteggio sociale' },
  { pattern: /(?:sistema\s*di\s*)?(?:punteggio|valutazione|classificazione)\s*(?:dei\s*)?cittadin/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Sistema di punteggio dei cittadini' },

  // Art. 5(1)(d) — Biometric categorisation
  { pattern: /categorizz?azione\s*biometrica/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Categorizzazione biometrica' },
  { pattern: /(?:inferire|dedurre|determinare)\s*(?:la\s*)?(?:razza|etnia|religione|orientamento\s*sessuale)\s*(?:da|mediante|tramite)\s*(?:dati\s*)?biometric/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Inferire caratteristiche sensibili dalla biometria' },

  // Art. 5(1)(e) — Untargeted facial scraping
  { pattern: /(?:raccolta|acquisizione)\s*(?:non\s*mirata\s*)?(?:di\s*)?(?:immagini\s*)?faccial/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Raccolta non mirata di immagini facciali' },
  { pattern: /(?:scraping|raccolta)\s*(?:massiv[ao]\s*)?(?:di\s*)?(?:volti|facce|immagini\s*facciali)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Scraping massivo di volti' },

  // Art. 5(1)(f) — Emotion recognition
  { pattern: /riconoscimento\s*(?:delle?\s*)?emozion[ei]\s*(?:sul|nel)\s*(?:luogo\s*di\s*)?(?:lavoro|scuola|istruzione|ambito\s*(?:lavorativo|educativo))/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Riconoscimento delle emozioni sul lavoro/scuola' },
  { pattern: /(?:sorveglianza|monitoraggio|rilevamento)\s*(?:delle?\s*)?(?:emozion[ei]|sentimenti)\s*(?:dei\s*)?(?:dipendenti|lavoratori|studenti|alunni)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Sorveglianza delle emozioni dei dipendenti/studenti' },

  // Art. 5(1)(g) — Real-time biometric ID
  { pattern: /identificazione\s*biometrica\s*(?:a\s*distanza|in\s*tempo\s*reale)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Identificazione biometrica in tempo reale' },
  { pattern: /riconoscimento\s*facciale\s*(?:in\s*tempo\s*reale|nello?\s*spazio\s*pubblico)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Riconoscimento facciale in tempo reale' },

  // Art. 5(1)(h) — Predictive policing
  { pattern: /polizia\s*predittiva/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Polizia predittiva' },
  { pattern: /(?:predizione|previsione)\s*(?:della?\s*)?(?:criminalità|delinquenza)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Predizione della criminalità' },
]);
