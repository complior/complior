import { describe, it, expect } from 'vitest';
import {
  BANNED_PACKAGES,
  PROHIBITED_PATTERNS,
  AI_SDK_PACKAGES,
  BIAS_TESTING_PACKAGES,
  isBannedPackage,
  isAiSdkPackage,
  matchProhibitedPattern,
} from './banned-packages.js';

describe('BANNED_PACKAGES', () => {
  it('contains 40+ prohibited packages', () => {
    expect(BANNED_PACKAGES.length).toBeGreaterThanOrEqual(40);
  });

  it('covers all 8 Art. 5 prohibition categories', () => {
    const articles = new Set(BANNED_PACKAGES.map((bp) => bp.article));
    expect(articles).toContain('Art. 5(1)(a)'); // Subliminal/manipulative
    expect(articles).toContain('Art. 5(1)(b)'); // Vulnerability exploitation
    expect(articles).toContain('Art. 5(1)(c)'); // Social scoring
    expect(articles).toContain('Art. 5(1)(d)'); // Criminal prediction
    expect(articles).toContain('Art. 5(1)(e)'); // Facial scraping
    expect(articles).toContain('Art. 5(1)(f)'); // Emotion recognition
    expect(articles).toContain('Art. 5(1)(g)'); // Biometric categorization
    expect(articles).toContain('Art. 5(1)(h)'); // Real-time biometric ID
  });

  it('has correct penalty on all entries', () => {
    for (const bp of BANNED_PACKAGES) {
      expect(bp.penalty).toBe('€35M or 7% turnover');
    }
  });

  it('has obligationId on all entries', () => {
    for (const bp of BANNED_PACKAGES) {
      expect(bp.obligationId).toBe('eu-ai-act-OBL-002');
    }
  });

  it('has no duplicate package names', () => {
    const names = BANNED_PACKAGES.map((bp) => bp.name.toLowerCase());
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it('has non-empty prohibitedWhen for every package', () => {
    for (const bp of BANNED_PACKAGES) {
      expect(bp.prohibitedWhen.length).toBeGreaterThan(0);
    }
  });

  it('has verifyMessage containing a question for every package', () => {
    for (const bp of BANNED_PACKAGES) {
      expect(bp.verifyMessage).toMatch(/\?/);
    }
  });

  it('has consistent prohibitedWhen within each article group', () => {
    const byArticle = new Map<string, Set<string>>();
    for (const bp of BANNED_PACKAGES) {
      if (!byArticle.has(bp.article)) byArticle.set(bp.article, new Set());
      byArticle.get(bp.article)!.add(bp.prohibitedWhen);
    }
    for (const [article, texts] of byArticle) {
      expect(texts.size, `${article} should have one prohibitedWhen text`).toBe(1);
    }
  });
});

describe('isBannedPackage', () => {
  it('finds exact match', () => {
    expect(isBannedPackage('deepface')).toBeDefined();
    expect(isBannedPackage('deepface')?.article).toBe('Art. 5(1)(f)');
  });

  it('case-insensitive match', () => {
    expect(isBannedPackage('DeepFace')).toBeDefined();
    expect(isBannedPackage('SUBLIMINAL-AI')).toBeDefined();
  });

  it('returns undefined for non-banned package', () => {
    expect(isBannedPackage('react')).toBeUndefined();
    expect(isBannedPackage('express')).toBeUndefined();
  });

  // Art. 5(1)(a) subliminal/manipulative
  it('detects subliminal manipulation packages', () => {
    expect(isBannedPackage('subliminal-ai')?.article).toBe('Art. 5(1)(a)');
    expect(isBannedPackage('dark-patterns')?.article).toBe('Art. 5(1)(a)');
    expect(isBannedPackage('manipulative-ux')?.article).toBe('Art. 5(1)(a)');
  });

  // Art. 5(1)(c) social scoring
  it('detects social scoring packages', () => {
    expect(isBannedPackage('social-credit-score')?.article).toBe('Art. 5(1)(c)');
    expect(isBannedPackage('trust-score')?.article).toBe('Art. 5(1)(c)');
    expect(isBannedPackage('behavior-score')?.article).toBe('Art. 5(1)(c)');
  });

  // Art. 5(1)(d) predictive policing
  it('detects predictive policing packages', () => {
    expect(isBannedPackage('predpol')?.article).toBe('Art. 5(1)(d)');
    expect(isBannedPackage('crime-prediction')?.article).toBe('Art. 5(1)(d)');
  });

  // Art. 5(1)(e) facial scraping
  it('detects facial scraping packages', () => {
    expect(isBannedPackage('clearview-ai')?.article).toBe('Art. 5(1)(e)');
    expect(isBannedPackage('face-scraper')?.article).toBe('Art. 5(1)(e)');
  });

  // Art. 5(1)(g) biometric categorization
  it('detects biometric categorization packages', () => {
    expect(isBannedPackage('insightface')?.article).toBe('Art. 5(1)(g)');
    expect(isBannedPackage('arcface')?.article).toBe('Art. 5(1)(g)');
    expect(isBannedPackage('face-api.js')?.article).toBe('Art. 5(1)(g)');
    expect(isBannedPackage('clarifai')?.article).toBe('Art. 5(1)(g)');
  });

  // Art. 5(1)(h) real-time biometric
  it('detects real-time biometric packages', () => {
    expect(isBannedPackage('surveillance-ai')?.article).toBe('Art. 5(1)(h)');
    expect(isBannedPackage('mass-surveillance')?.article).toBe('Art. 5(1)(h)');
    expect(isBannedPackage('live-biometric')?.article).toBe('Art. 5(1)(h)');
  });
});

describe('PROHIBITED_PATTERNS', () => {
  it('contains 10 regex patterns', () => {
    expect(PROHIBITED_PATTERNS.length).toBe(10);
  });

  it('all patterns have article references', () => {
    for (const p of PROHIBITED_PATTERNS) {
      expect(p.article).toMatch(/^Art\. 5\(1\)/);
    }
  });
});

describe('matchProhibitedPattern', () => {
  it('detects emotion recognition in real-time context', () => {
    const result = matchProhibitedPattern('uses emotion recognition in real-time');
    expect(result).toBeDefined();
    expect(result?.article).toBe('Art. 5(1)(f)');
  });

  it('detects social scoring', () => {
    const result = matchProhibitedPattern('implements social scoring algorithm');
    expect(result).toBeDefined();
    expect(result?.article).toBe('Art. 5(1)(c)');
  });

  it('detects predictive policing', () => {
    const result = matchProhibitedPattern('predictive policing model');
    expect(result).toBeDefined();
    expect(result?.article).toBe('Art. 5(1)(d)');
  });

  it('detects mass surveillance', () => {
    const result = matchProhibitedPattern('mass surveillance system');
    expect(result).toBeDefined();
    expect(result?.article).toBe('Art. 5(1)(h)');
  });

  it('detects biometric categorization', () => {
    const result = matchProhibitedPattern('biometric categorization by race');
    expect(result).toBeDefined();
    expect(result?.article).toBe('Art. 5(1)(g)');
  });

  it('returns undefined for benign text', () => {
    expect(matchProhibitedPattern('hello world')).toBeUndefined();
    expect(matchProhibitedPattern('user authentication')).toBeUndefined();
  });
});

describe('AI_SDK_PACKAGES', () => {
  it('contains 51 AI SDK entries', () => {
    expect(AI_SDK_PACKAGES.size).toBe(51);
  });

  it('isAiSdkPackage finds known SDKs', () => {
    expect(isAiSdkPackage('openai')).toBe('OpenAI');
    expect(isAiSdkPackage('@anthropic-ai/sdk')).toBe('Anthropic');
    expect(isAiSdkPackage('transformers')).toBe('Hugging Face Transformers');
  });

  it('isAiSdkPackage finds new SDK entries', () => {
    // npm
    expect(isAiSdkPackage('@openclaw/sdk')).toBe('OpenClaw');
    expect(isAiSdkPackage('groq-sdk')).toBe('Groq');
    expect(isAiSdkPackage('ollama')).toBe('Ollama');
    expect(isAiSdkPackage('@aws-sdk/client-bedrock-runtime')).toBe('Amazon Bedrock');
    expect(isAiSdkPackage('@azure/openai')).toBe('Azure OpenAI');
    expect(isAiSdkPackage('@ai-sdk/google')).toBe('Vercel AI SDK (Google)');
    expect(isAiSdkPackage('@ai-sdk/mistral')).toBe('Vercel AI SDK (Mistral)');
    expect(isAiSdkPackage('@ai-sdk/amazon-bedrock')).toBe('Vercel AI SDK (Bedrock)');
    expect(isAiSdkPackage('@langchain/core')).toBe('LangChain Core');
    expect(isAiSdkPackage('@langchain/openai')).toBe('LangChain (OpenAI)');
    expect(isAiSdkPackage('@langchain/anthropic')).toBe('LangChain (Anthropic)');
    expect(isAiSdkPackage('@langchain/community')).toBe('LangChain (Community)');
    // pip
    expect(isAiSdkPackage('crewai')).toBe('CrewAI');
    expect(isAiSdkPackage('pyautogen')).toBe('AutoGen');
    expect(isAiSdkPackage('groq')).toBe('Groq');
    expect(isAiSdkPackage('together')).toBe('Together AI');
    expect(isAiSdkPackage('fireworks-ai')).toBe('Fireworks AI');
    expect(isAiSdkPackage('litellm')).toBe('LiteLLM');
    expect(isAiSdkPackage('semantic-kernel')).toBe('Semantic Kernel');
    expect(isAiSdkPackage('haystack-ai')).toBe('Haystack');
    expect(isAiSdkPackage('instructor')).toBe('Instructor');
    expect(isAiSdkPackage('dspy-ai')).toBe('DSPy');
    expect(isAiSdkPackage('phidata')).toBe('Phidata');
    expect(isAiSdkPackage('boto3')).toBe('AWS SDK (Bedrock)');
    expect(isAiSdkPackage('deepseek-sdk')).toBe('DeepSeek');
  });

  it('isAiSdkPackage returns undefined for non-SDK', () => {
    expect(isAiSdkPackage('express')).toBeUndefined();
  });
});

describe('BIAS_TESTING_PACKAGES', () => {
  it('contains bias testing libraries', () => {
    expect(BIAS_TESTING_PACKAGES.has('fairlearn')).toBe(true);
    expect(BIAS_TESTING_PACKAGES.has('aif360')).toBe(true);
  });
});
