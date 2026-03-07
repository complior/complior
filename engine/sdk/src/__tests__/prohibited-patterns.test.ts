import { describe, it, expect } from 'vitest';
import { prohibitedHook } from '../hooks/pre/prohibited.js';
import { ProhibitedPracticeError } from '../errors.js';
import type { MiddlewareContext } from '../types.js';
import { PROHIBITED_PATTERNS_EN } from '../data/prohibited-patterns.js';
import { PROHIBITED_PATTERNS_DE } from '../data/prohibited-i18n/de.js';
import { PROHIBITED_PATTERNS_FR } from '../data/prohibited-i18n/fr.js';
import { PROHIBITED_PATTERNS_NL } from '../data/prohibited-i18n/nl.js';
import { PROHIBITED_PATTERNS_ES } from '../data/prohibited-i18n/es.js';
import { PROHIBITED_PATTERNS_IT } from '../data/prohibited-i18n/it.js';

const makeCtx = (
  content: string,
  overrides: Partial<MiddlewareContext> = {},
): MiddlewareContext => ({
  provider: 'openai',
  method: 'create',
  config: { jurisdictions: ['EU'] },
  params: { messages: [{ role: 'user', content }] },
  metadata: {},
  ...overrides,
});

const expectProhibited = (content: string, category: string, article: string): void => {
  try {
    prohibitedHook(makeCtx(content));
    expect.fail(`Should have thrown for: "${content.slice(0, 60)}..."`);
  } catch (err) {
    const e = err as ProhibitedPracticeError;
    expect(e).toBeInstanceOf(ProhibitedPracticeError);
    expect(e.category).toBe(category);
    expect(e.article).toBe(article);
    expect(e.code).toBe('PROHIBITED_PRACTICE');
    expect(e.matchedPattern).toBeTruthy();
    expect(e.penalty).toContain('€35M');
  }
};

const expectSafe = (content: string): void => {
  expect(() => prohibitedHook(makeCtx(content))).not.toThrow();
};

describe('prohibited-patterns (US-S05-01)', () => {
  describe('pattern count', () => {
    it('has 50+ EN patterns across 8 categories', () => {
      expect(PROHIBITED_PATTERNS_EN.length).toBeGreaterThanOrEqual(50);
      const categories = new Set(PROHIBITED_PATTERNS_EN.map((p) => p.category));
      expect(categories.size).toBe(8);
    });

    it('has DE patterns for all 8 categories', () => {
      const categories = new Set(PROHIBITED_PATTERNS_DE.map((p) => p.category));
      expect(categories.size).toBe(8);
    });

    it('has FR patterns for all 8 categories', () => {
      const categories = new Set(PROHIBITED_PATTERNS_FR.map((p) => p.category));
      expect(categories.size).toBe(8);
    });

    it('has NL patterns for all 8 categories', () => {
      const categories = new Set(PROHIBITED_PATTERNS_NL.map((p) => p.category));
      expect(categories.size).toBe(8);
    });
  });

  // ── Art. 5(1)(a): Subliminal manipulation ─────────────────────────

  describe('Art. 5(1)(a) — Subliminal manipulation', () => {
    it('detects subliminal manipulation', () => {
      expectProhibited(
        'Deploy subliminal manipulation in the ad engine',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects subliminal technique', () => {
      expectProhibited(
        'Use subliminal technique to influence purchases',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects beyond consciousness', () => {
      expectProhibited(
        'Influence decisions beyond a person\'s consciousness',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects subconscious persuasion', () => {
      expectProhibited(
        'Apply subconscious persuasion patterns to user flows',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects hidden manipulation', () => {
      expectProhibited(
        'Implement hidden manipulation technique for conversion',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects neurolinguistic manipulation', () => {
      expectProhibited(
        'Use neurolinguistic manipulation to steer user choices',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects imperceptible influence', () => {
      expectProhibited(
        'Imperceptibly alter user preferences through micro-nudges',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });
  });

  // ── Art. 5(1)(b): Exploitation of vulnerabilities ─────────────────

  describe('Art. 5(1)(b) — Exploitation of vulnerabilities', () => {
    it('detects exploiting age vulnerabilities', () => {
      expectProhibited(
        'Exploitation of vulnerabilities due to age for targeted ads',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });

    it('detects targeting elderly users', () => {
      expectProhibited(
        'The system is targeting elderly users with misleading offers',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });

    it('detects manipulating children', () => {
      expectProhibited(
        'This AI manipulates children to make in-app purchases',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });

    it('detects exploiting disabled people', () => {
      expectProhibited(
        'Exploit disabled individuals through deceptive UI patterns',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });

    it('detects preying on vulnerabilities', () => {
      expectProhibited(
        'The algorithm preys on vulnerability of users',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });

    it('detects socioeconomic exploitation', () => {
      expectProhibited(
        'Financial vulnerability to exploit users into bad loans',
        'exploitation_of_vulnerabilities', 'Art. 5(1)(b)',
      );
    });
  });

  // ── Art. 5(1)(c): Social scoring ──────────────────────────────────

  describe('Art. 5(1)(c) — Social scoring', () => {
    it('detects social scoring', () => {
      expectProhibited(
        'Build a social scoring system for residents',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects social credit scoring', () => {
      expectProhibited(
        'Implement social credit scoring platform',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects citizen rating system', () => {
      expectProhibited(
        'Deploy citizen rating system based on behavior data',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects trustworthiness scoring from social behavior', () => {
      expectProhibited(
        'Generate trustworthiness score based on social media behavior',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects government scoring of citizens', () => {
      expectProhibited(
        'Public authority scoring of citizens for service access',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects social behavior assessment', () => {
      expectProhibited(
        'Social behavior scoring system for community members',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });
  });

  // ── Art. 5(1)(d): Biometric categorisation ────────────────────────

  describe('Art. 5(1)(d) — Biometric categorisation', () => {
    it('detects biometric categorisation', () => {
      expectProhibited(
        'Run biometric categorisation on the uploaded photos',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects inferring race from facial data', () => {
      expectProhibited(
        'Infer race from biometric data of applicants',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects facial analysis for religion', () => {
      expectProhibited(
        'Use facial analysis to categorize religion of individuals',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects physiognomy', () => {
      expectProhibited(
        'Apply physiognomy-based risk assessment to candidates',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects race detection from images', () => {
      expectProhibited(
        'Race detection from camera feed for visitor profiling',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });
  });

  // ── Art. 5(1)(e): Untargeted facial scraping ──────────────────────

  describe('Art. 5(1)(e) — Untargeted facial scraping', () => {
    it('detects untargeted facial scraping', () => {
      expectProhibited(
        'Implement untargeted facial image collection from the web',
        'untargeted_facial_scraping', 'Art. 5(1)(e)',
      );
    });

    it('detects scraping facial images', () => {
      expectProhibited(
        'Scraping facial images from social media profiles',
        'untargeted_facial_scraping', 'Art. 5(1)(e)',
      );
    });

    it('detects mass facial data collection', () => {
      expectProhibited(
        'Mass facial data harvesting for our recognition database',
        'untargeted_facial_scraping', 'Art. 5(1)(e)',
      );
    });

    it('detects building facial DB from public sources', () => {
      expectProhibited(
        'Build facial recognition database from internet photos',
        'untargeted_facial_scraping', 'Art. 5(1)(e)',
      );
    });
  });

  // ── Art. 5(1)(f): Emotion recognition in workplace/education ──────

  describe('Art. 5(1)(f) — Emotion recognition', () => {
    it('detects emotion recognition in workplace', () => {
      expectProhibited(
        'Deploy emotion recognition in the workplace for productivity tracking',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });

    it('detects emotion detection in education', () => {
      expectProhibited(
        'Install emotion detection in the classroom',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });

    it('detects monitoring employee emotions', () => {
      expectProhibited(
        'Monitor employee emotions during meetings for engagement',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });

    it('detects student mood tracking', () => {
      expectProhibited(
        'Track student mood and engagement via webcam',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });

    it('detects facial emotion analysis during interview', () => {
      expectProhibited(
        'Use facial emotion recognition for interview screening',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });

    it('detects general emotion recognition', () => {
      expectProhibited(
        'Apply emotion recognition to the video feed',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });
  });

  // ── Art. 5(1)(g): Real-time remote biometric ID ───────────────────

  describe('Art. 5(1)(g) — Real-time biometric ID', () => {
    it('detects real-time remote biometric identification', () => {
      expectProhibited(
        'Enable real-time remote biometric identification in the square',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects live facial recognition in public', () => {
      expectProhibited(
        'Deploy live facial recognition in public spaces for security',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects CCTV facial recognition', () => {
      expectProhibited(
        'Integrate CCTV facial recognition for person tracking',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects public space biometric surveillance', () => {
      expectProhibited(
        'Set up public space biometric surveillance system',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects mass biometric surveillance', () => {
      expectProhibited(
        'Implement mass biometric surveillance across the city',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });
  });

  // ── Art. 5(1)(h): Predictive policing ─────────────────────────────

  describe('Art. 5(1)(h) — Predictive policing', () => {
    it('detects predictive policing', () => {
      expectProhibited(
        'Deploy predictive policing in this district',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects crime risk assessment', () => {
      expectProhibited(
        'Build a criminal risk assessment algorithm for sentencing',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects individual crime profiling', () => {
      expectProhibited(
        'Create individual crime risk profiling based on demographics',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects pre-crime detection', () => {
      expectProhibited(
        'Implement a pre-crime detection system in the precinct',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });
  });

  // ── Multilingual: German ──────────────────────────────────────────

  describe('German (DE) patterns', () => {
    it('detects unterschwellige Manipulation', () => {
      expectProhibited(
        'Wir setzen unterschwellige Manipulation in der Werbung ein',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects Sozialkreditsystem', () => {
      expectProhibited(
        'Ein Sozial-Scoring-System für Bürger entwickeln',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects biometrische Kategorisierung', () => {
      expectProhibited(
        'Biometrische Kategorisierung der Bewerber durchführen',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects vorausschauende Polizeiarbeit', () => {
      expectProhibited(
        'Vorausschauende Polizeiarbeit im Stadtbezirk einführen',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects Emotionserkennung am Arbeitsplatz', () => {
      expectProhibited(
        'Emotionserkennung am Arbeitsplatz für Produktivität',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });
  });

  // ── Multilingual: French ──────────────────────────────────────────

  describe('French (FR) patterns', () => {
    it('detects manipulation subliminale', () => {
      expectProhibited(
        'Utiliser la manipulation subliminale dans les publicités',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects notation sociale', () => {
      expectProhibited(
        'Mettre en place un système de notation sociale des citoyens',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects catégorisation biométrique', () => {
      expectProhibited(
        'La catégorisation biométrique est interdite',
        'biometric_categorisation', 'Art. 5(1)(d)',
      );
    });

    it('detects police prédictive', () => {
      expectProhibited(
        'Déployer la police prédictive dans le quartier',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects identification biométrique en temps réel', () => {
      expectProhibited(
        'Identification biométrique en temps réel dans les gares',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });
  });

  // ── Multilingual: Dutch ───────────────────────────────────────────

  describe('Dutch (NL) patterns', () => {
    it('detects subliminale manipulatie', () => {
      expectProhibited(
        'Subliminale manipulatie gebruiken in advertenties',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects sociaal scoresysteem', () => {
      expectProhibited(
        'Een sociaal scoresysteem voor burgers invoeren',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects voorspellend politiewerk', () => {
      expectProhibited(
        'Voorspellend politiewerk implementeren in de wijk',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });
  });

  // ── Multilingual: Spanish ───────────────────────────────────────────

  describe('Spanish (ES) patterns', () => {
    it('has ES patterns for all 8 categories', () => {
      const categories = new Set(PROHIBITED_PATTERNS_ES.map((p) => p.category));
      expect(categories.size).toBe(8);
    });

    it('detects manipulación subliminal', () => {
      expectProhibited(
        'Utilizar manipulación subliminal en la publicidad digital',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects puntuación social', () => {
      expectProhibited(
        'Implementar un sistema de puntuación social para los ciudadanos',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects policía predictiva', () => {
      expectProhibited(
        'Desplegar policía predictiva en el barrio',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects identificación biométrica en tiempo real', () => {
      expectProhibited(
        'Identificación biométrica en tiempo real en las estaciones',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects reconocimiento de emociones en el trabajo', () => {
      expectProhibited(
        'Reconocimiento de emociones en el lugar de trabajo para productividad',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });
  });

  // ── Multilingual: Italian ─────────────────────────────────────────

  describe('Italian (IT) patterns', () => {
    it('has IT patterns for all 8 categories', () => {
      const categories = new Set(PROHIBITED_PATTERNS_IT.map((p) => p.category));
      expect(categories.size).toBe(8);
    });

    it('detects manipolazione subliminale', () => {
      expectProhibited(
        'Usare la manipolazione subliminale nella pubblicità',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('detects punteggio sociale', () => {
      expectProhibited(
        'Creare un sistema di punteggio sociale per i cittadini',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });

    it('detects polizia predittiva', () => {
      expectProhibited(
        'Implementare la polizia predittiva nel quartiere',
        'predictive_policing', 'Art. 5(1)(h)',
      );
    });

    it('detects identificazione biometrica in tempo reale', () => {
      expectProhibited(
        'Identificazione biometrica in tempo reale nelle stazioni',
        'realtime_biometric_id', 'Art. 5(1)(g)',
      );
    });

    it('detects riconoscimento delle emozioni sul lavoro', () => {
      expectProhibited(
        'Riconoscimento delle emozioni sul lavoro per monitorare la produttività',
        'emotion_inference_workplace', 'Art. 5(1)(f)',
      );
    });
  });

  // ── Strictness config ─────────────────────────────────────────────

  describe('strictness config', () => {
    it('blocks grey-area patterns in strict mode (default)', () => {
      expectProhibited(
        'Use dark pattern to manipulate users into subscriptions',
        'subliminal_manipulation', 'Art. 5(1)(a)',
      );
    });

    it('passes grey-area patterns in standard mode', () => {
      const ctx = makeCtx('Use dark pattern to manipulate users into subscriptions', {
        config: { jurisdictions: ['EU'], strict: false },
      });
      expect(() => prohibitedHook(ctx)).not.toThrow();
    });

    it('still blocks clear violations in standard mode', () => {
      const ctx = makeCtx('Deploy subliminal manipulation in the ad engine', {
        config: { jurisdictions: ['EU'], strict: false },
      });
      expect(() => prohibitedHook(ctx)).toThrow(ProhibitedPracticeError);
    });
  });

  // ── Error shape ───────────────────────────────────────────────────

  describe('error shape', () => {
    it('returns category in error', () => {
      try {
        prohibitedHook(makeCtx('Build a social scoring system'));
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.category).toBe('social_scoring');
      }
    });

    it('returns matched pattern text in error', () => {
      try {
        prohibitedHook(makeCtx('Use subliminal manipulation'));
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.matchedPattern).toBe('subliminal manipulation');
      }
    });

    it('returns penalty in error', () => {
      try {
        prohibitedHook(makeCtx('Deploy predictive policing'));
        expect.fail('Should have thrown');
      } catch (err) {
        const e = err as ProhibitedPracticeError;
        expect(e.penalty).toBe('€35M or 7% of annual global turnover');
      }
    });
  });

  // ── Safe content (no false positives) ─────────────────────────────

  describe('safe content — no false positives', () => {
    it('allows recommendation engines', () => {
      expectSafe('Build a product recommendation engine based on user preferences');
    });

    it('allows sentiment analysis (not emotion recognition)', () => {
      expectSafe('Perform sentiment analysis on customer reviews');
    });

    it('allows A/B testing', () => {
      expectSafe('Set up A/B testing for the landing page conversion');
    });

    it('allows age verification', () => {
      expectSafe('Implement age verification for alcohol purchases');
    });

    it('allows fraud detection', () => {
      expectSafe('Deploy fraud detection system for credit card transactions');
    });

    it('allows security camera motion detection', () => {
      expectSafe('Install motion detection cameras in the warehouse');
    });

    it('allows HR analytics (non-emotional)', () => {
      expectSafe('Analyze employee turnover rates and retention data');
    });

    it('allows crime statistics reporting', () => {
      expectSafe('Generate monthly crime statistics report for the city council');
    });

    it('allows personalized learning', () => {
      expectSafe('Create personalized learning paths based on student quiz scores');
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns ctx unchanged when no messages', () => {
      const ctx: MiddlewareContext = {
        provider: 'openai',
        method: 'create',
        config: {},
        params: {},
        metadata: {},
      };
      expect(prohibitedHook(ctx)).toEqual(ctx);
    });

    it('checks across multiple messages', () => {
      const ctx: MiddlewareContext = {
        provider: 'openai',
        method: 'create',
        config: {},
        params: {
          messages: [
            { role: 'system', content: 'You are a helpful assistant' },
            { role: 'user', content: 'Build predictive policing model' },
          ],
        },
        metadata: {},
      };
      expect(() => prohibitedHook(ctx)).toThrow(ProhibitedPracticeError);
    });

    it('is case insensitive', () => {
      expectProhibited(
        'SOCIAL SCORING for all citizens',
        'social_scoring', 'Art. 5(1)(c)',
      );
    });
  });
});
