/**
 * Spanish (ES) prohibited patterns — Art. 5 EU AI Act
 */
import type { ProhibitedPattern } from '../prohibited-patterns.js';

export const PROHIBITED_PATTERNS_ES: readonly ProhibitedPattern[] = Object.freeze([
  // Art. 5(1)(a) — Subliminal manipulation
  { pattern: /manipulación\s*subliminal/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Manipulación subliminal' },
  { pattern: /técnica\s*subliminal/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Técnica subliminal' },
  { pattern: /influencia\s*(?:subconsciente|inconsciente)/i, category: 'subliminal_manipulation', article: 'Art. 5(1)(a)', obligation: 'OBL-002', description: 'Influencia subconsciente' },

  // Art. 5(1)(b) — Exploitation of vulnerabilities
  { pattern: /explotación\s*(?:de\s*)?(?:vulnerabilidad|debilidad)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Explotación de vulnerabilidades' },
  { pattern: /(?:manipular|explotar)\s*(?:a\s*)?(?:personas?\s*)?(?:mayores|ancianos|menores|niños|discapacitad|vulnerables)/i, category: 'exploitation_of_vulnerabilities', article: 'Art. 5(1)(b)', obligation: 'OBL-002', description: 'Explotación de personas vulnerables' },

  // Art. 5(1)(c) — Social scoring
  { pattern: /(?:puntuación|calificación|crédito)\s*social/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Puntuación social' },
  { pattern: /(?:sistema\s*de\s*)?(?:puntuación|evaluación|calificación)\s*(?:de\s*)?ciudadano/i, category: 'social_scoring', article: 'Art. 5(1)(c)', obligation: 'OBL-002', description: 'Sistema de puntuación de ciudadanos' },

  // Art. 5(1)(d) — Biometric categorisation
  { pattern: /categorizaci[oó]n\s*biométrica/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Categorización biométrica' },
  { pattern: /(?:inferir|deducir|determinar)\s*(?:la\s*)?(?:raza|etnia|religión|orientación\s*sexual)\s*(?:a\s*partir|mediante|por)\s*(?:datos?\s*)?biométric/i, category: 'biometric_categorisation', article: 'Art. 5(1)(d)', obligation: 'OBL-002', description: 'Inferir características sensibles por biometría' },

  // Art. 5(1)(e) — Untargeted facial scraping
  { pattern: /(?:recopilación|recogida)\s*(?:no\s*dirigida\s*)?(?:de\s*)?(?:imágenes?\s*)?faciales/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Recopilación no dirigida de imágenes faciales' },
  { pattern: /(?:raspado|scraping)\s*(?:masivo\s*)?(?:de\s*)?(?:rostros|caras|imágenes\s*faciales)/i, category: 'untargeted_facial_scraping', article: 'Art. 5(1)(e)', obligation: 'OBL-002', description: 'Raspado masivo de rostros' },

  // Art. 5(1)(f) — Emotion recognition
  { pattern: /reconocimiento\s*(?:de\s*)?emociones\s*(?:en\s*(?:el\s*)?(?:trabajo|lugar\s*de\s*trabajo|escuela|educación|ámbito\s*(?:laboral|educativo)))/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Reconocimiento de emociones en el trabajo/escuela' },
  { pattern: /(?:vigilancia|detección|monitoreo)\s*(?:de\s*)?(?:emociones|sentimientos)\s*(?:de\s*)?(?:empleados|trabajadores|alumnos|estudiantes)/i, category: 'emotion_inference_workplace', article: 'Art. 5(1)(f)', obligation: 'OBL-002', description: 'Vigilancia de emociones de empleados/alumnos' },

  // Art. 5(1)(g) — Real-time biometric ID
  { pattern: /identificación\s*biométrica\s*(?:a\s*distancia|en\s*tiempo\s*real)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Identificación biométrica en tiempo real' },
  { pattern: /reconocimiento\s*facial\s*(?:en\s*tiempo\s*real|en\s*(?:el\s*)?espacio\s*público)/i, category: 'realtime_biometric_id', article: 'Art. 5(1)(g)', obligation: 'OBL-002', description: 'Reconocimiento facial en tiempo real' },

  // Art. 5(1)(h) — Predictive policing
  { pattern: /polic[ií]a\s*predictiva/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Policía predictiva' },
  { pattern: /(?:predicción|pronóstico)\s*(?:de\s*)?(?:la\s*)?(?:criminalidad|delincuencia)/i, category: 'predictive_policing', article: 'Art. 5(1)(h)', obligation: 'OBL-002', description: 'Predicción de la criminalidad' },
]);
