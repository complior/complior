'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';

/* ────────────────────────────── TYPES ────────────────────────────── */

type AnswerMap = Record<string, string | string[]>;

interface Finding { t: 'd' | 'w' | 'n'; s: string }

interface ScoreResult {
  obligations: number;
  hrCount: number;
  gaps: number;
  score: number;
  applies: boolean;
  urgency: 'Low' | 'Medium' | 'High';
  findings: Finding[];
}

type OptType = 'radio' | 'multi';

interface Option {
  value: string;
  tKey: string;          // translation key for label
  descKey?: string;      // translation key for description
  exclusive?: boolean;   // for "none" options in multi-select
}

interface Question {
  key: string;
  type: OptType;
  qKey: string;          // translation key for question text
  helpHtml?: string;     // help text with HTML (for code refs)
  options: Option[];
  block: number;         // 1-4
}

/* ────────────────────── BLOCKS & QUESTIONS ────────────────────── */

const BLOCKS = [
  { id: 1, nameKey: 'block1', range: [1, 4] },
  { id: 2, nameKey: 'block2', range: [5, 8] },
  { id: 3, nameKey: 'block3', range: [9, 11] },
  { id: 4, nameKey: 'block4', range: [12, 13] },
];

const QUESTIONS: Question[] = [
  /* Q1 — usesAI */ {
    key: 'usesAI', type: 'radio', qKey: 'q1', block: 1,
    helpHtml: 'Including ChatGPT, Copilot, Jasper, AI analytics, automated recommendations, chatbots, etc.',
    options: [
      { value: 'active', tKey: 'q1o1' },
      { value: 'planning', tKey: 'q1o2' },
      { value: 'unsure', tKey: 'q1o3', descKey: 'q1o3d' },
      { value: 'no', tKey: 'q1o4' },
    ],
  },
  /* Q2 — size */ {
    key: 'size', type: 'radio', qKey: 'q2', block: 1,
    helpHtml: 'Total headcount including full-time, part-time, and regular contractors.',
    options: [
      { value: '1-10', tKey: 'q2o1' },
      { value: '11-50', tKey: 'q2o2' },
      { value: '51-200', tKey: 'q2o3' },
      { value: '201-500', tKey: 'q2o4' },
      { value: '500+', tKey: 'q2o5' },
    ],
  },
  /* Q3 — euScope */ {
    key: 'euScope', type: 'radio', qKey: 'q3', block: 1,
    helpHtml: 'The AI Act applies to companies placing or using AI in the EU market, regardless of where you\'re based <code>Art. 2</code>.',
    options: [
      { value: 'eu_based', tKey: 'q3o1' },
      { value: 'eu_clients', tKey: 'q3o2' },
      { value: 'no_eu', tKey: 'q3o4' },
      { value: 'unsure', tKey: 'q3o5' },
    ],
  },
  /* Q4 — role */ {
    key: 'role', type: 'radio', qKey: 'q4', block: 1,
    helpHtml: 'This determines which obligations apply: <code>Art. 3(4)</code> deployer vs <code>Art. 3(3)</code> provider.',
    options: [
      { value: 'deployer', tKey: 'q4o1', descKey: 'q4o1d' },
      { value: 'provider', tKey: 'q4o2', descKey: 'q4o2d' },
      { value: 'both', tKey: 'q4o3' },
      { value: 'unsure', tKey: 'q4o4' },
    ],
  },
  /* Q5 — toolTypes (multi) */ {
    key: 'toolTypes', type: 'multi', qKey: 'q5', block: 2,
    helpHtml: 'Select all that apply.',
    options: [
      { value: 'llm', tKey: 'q5o1', descKey: 'q5o1d' },
      { value: 'analytics', tKey: 'q5o2', descKey: 'q5o2d' },
      { value: 'content', tKey: 'q5o3', descKey: 'q5o3d' },
      { value: 'code', tKey: 'q5o4', descKey: 'q5o4d' },
      { value: 'process', tKey: 'q5o5', descKey: 'q5o5d' },
      { value: 'custom', tKey: 'q5o6', descKey: 'q5o6d' },
    ],
  },
  /* Q6 — decisionRole */ {
    key: 'decisionRole', type: 'radio', qKey: 'q6', block: 2,
    helpHtml: 'Affects risk level and obligations under <code>Art. 6</code> and <code>Art. 14</code>.',
    options: [
      { value: 'info', tKey: 'q6o1', descKey: 'q6o1d' },
      { value: 'assist', tKey: 'q6o2', descKey: 'q6o2d' },
      { value: 'auto', tKey: 'q6o3', descKey: 'q6o3d' },
      { value: 'customer', tKey: 'q6o4', descKey: 'q6o4d' },
    ],
  },
  /* Q7 — transparency */ {
    key: 'transparency', type: 'radio', qKey: 'q7', block: 2,
    helpHtml: '<code>Art. 50</code> requires transparency \u2014 people must know when they interact with AI or see AI-generated content.',
    options: [
      { value: 'yes', tKey: 'q7o1' },
      { value: 'partial', tKey: 'q7o2' },
      { value: 'no', tKey: 'q7o3' },
      { value: 'na', tKey: 'q7o4' },
    ],
  },
  /* Q8 — policy */ {
    key: 'policy', type: 'radio', qKey: 'q8', block: 2,
    helpHtml: 'A documented policy covering approved tools, permitted uses, and data handling rules.',
    options: [
      { value: 'yes', tKey: 'q8o1' },
      { value: 'wip', tKey: 'q8o2' },
      { value: 'no', tKey: 'q8o3' },
    ],
  },
  /* Q9 — hrAreas (multi) */ {
    key: 'hrAreas', type: 'multi', qKey: 'q9', block: 3,
    helpHtml: 'Listed in <code>Annex III</code> as potentially high-risk. Select all that apply.',
    options: [
      { value: 'hr', tKey: 'q9o1', descKey: 'q9o1d' },
      { value: 'credit', tKey: 'q9o2', descKey: 'q9o2d' },
      { value: 'education', tKey: 'q9o3', descKey: 'q9o3d' },
      { value: 'health', tKey: 'q9o4', descKey: 'q9o4d' },
      { value: 'legal', tKey: 'q9o5', descKey: 'q9o5d' },
      { value: 'infra', tKey: 'q9o6', descKey: 'q9o6d' },
      { value: 'biometric', tKey: 'q9o7', descKey: 'q9o7d' },
      { value: 'none', tKey: 'q9o8', exclusive: true },
    ],
  },
  /* Q10 — affectsRights */ {
    key: 'affectsRights', type: 'radio', qKey: 'q10', block: 3,
    helpHtml: 'Employment, access to services, financial assessments, eligibility. <code>Art. 6(2)</code>',
    options: [
      { value: 'yes', tKey: 'q10o1' },
      { value: 'indirect', tKey: 'q10o2' },
      { value: 'no', tKey: 'q10o3' },
    ],
  },
  /* Q11 — oversight */ {
    key: 'oversight', type: 'radio', qKey: 'q11', block: 3,
    helpHtml: '<code>Art. 14</code> requires human oversight for high-risk AI \u2014 a person must understand, monitor, and be able to override AI.',
    options: [
      { value: 'formal', tKey: 'q11o1', descKey: 'q11o1d' },
      { value: 'informal', tKey: 'q11o2', descKey: 'q11o2d' },
      { value: 'no', tKey: 'q11o3' },
      { value: 'na', tKey: 'q11o4' },
    ],
  },
  /* Q12 — inventory */ {
    key: 'inventory', type: 'radio', qKey: 'q12', block: 4,
    helpHtml: '<code>Art. 26(1)</code> requires deployers to keep records of AI systems, their purpose, and risk classification.',
    options: [
      { value: 'yes', tKey: 'q12o1' },
      { value: 'partial', tKey: 'q12o2' },
      { value: 'no', tKey: 'q12o3' },
    ],
  },
  /* Q13 — litTraining */ {
    key: 'litTraining', type: 'radio', qKey: 'q13', block: 4,
    helpHtml: '<code>Art. 4</code> mandates sufficient AI literacy for all staff using or overseeing AI. This obligation is <strong>already in force since Feb 2, 2025</strong>.',
    options: [
      { value: 'yes', tKey: 'q13o1' },
      { value: 'partial', tKey: 'q13o2' },
      { value: 'planned', tKey: 'q13o3' },
      { value: 'no', tKey: 'q13o4' },
    ],
  },
];

const TOTAL_QUESTIONS = 13;
const TOTAL_STEPS = 14; // 13 questions + email step

/* ────────────────── BLOCK HEADER SVG ICONS ────────────────── */

const blockIcons: Record<number, JSX.Element> = {
  1: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  2: <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  3: <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  4: <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

/* First question number for each block */
const blockFirstQ: Record<number, number> = { 1: 1, 2: 5, 3: 9, 4: 12 };

/* ────────────────── SCORING FUNCTION ────────────────── */

function computeScore(A: AnswerMap): ScoreResult {
  let obligations = 0, hrCount = 0, gaps = 0;
  let applies = true;
  const F: Finding[] = [];

  // Q1: usesAI
  if (A.usesAI === 'active') {
    obligations += 2;
    F.push({ t: 'n', s: 'Your company actively uses AI \u2014 <code>Art. 4</code> AI Literacy obligation applies immediately (since Feb 2, 2025)' });
    F.push({ t: 'n', s: '<code>Art. 26</code> deployer obligations apply: monitoring, record-keeping, incident reporting' });
  } else if (A.usesAI === 'planning') {
    obligations += 1;
    F.push({ t: 'w', s: 'AI evaluation phase \u2014 obligations will apply once tools are deployed. Start preparing now' });
  } else if (A.usesAI === 'unsure') {
    obligations += 1; gaps++;
    F.push({ t: 'w', s: 'Unclear AI usage \u2014 many SaaS tools embed AI features. Conduct an AI tool inventory to identify hidden AI' });
  } else {
    applies = false;
    F.push({ t: 'n', s: 'No AI usage reported \u2014 most obligations don\'t apply yet, but <code>Art. 4</code> literacy requirements apply broadly' });
  }

  // Q3: euScope
  if (A.euScope === 'eu_based') {
    obligations += 1;
    F.push({ t: 'n', s: 'EU-based company \u2014 full AI Act scope applies under <code>Art. 2(1)</code>' });
  } else if (A.euScope === 'eu_clients') {
    obligations += 1;
    F.push({ t: 'w', s: 'Non-EU company serving EU \u2014 AI Act applies to you if AI output reaches EU users <code>Art. 2(1)(c)</code>' });
  } else if (A.euScope === 'no_eu') {
    if (applies) F.push({ t: 'n', s: 'No EU nexus \u2014 AI Act may not apply currently, but monitor expansion of EU customer base' });
  } else {
    gaps++;
    F.push({ t: 'w', s: 'Unclear EU connection \u2014 verify if any AI outputs reach EU-based users or customers' });
  }

  // Q4: role
  if (A.role === 'provider' || A.role === 'both') {
    obligations += 3;
    F.push({ t: 'd', s: 'As an AI provider, you face the strictest obligations: conformity assessment, technical documentation, CE marking <code>Art. 16</code>' });
  }
  if (A.role === 'deployer' || A.role === 'both') {
    obligations += 1;
    F.push({ t: 'n', s: 'As a deployer: ensure proper use, monitor performance, maintain logs <code>Art. 26</code>' });
  }
  if (A.role === 'unsure') {
    gaps++;
    F.push({ t: 'w', s: 'Role unclear \u2014 provider vs deployer classification significantly changes your obligations' });
  }

  // Q5: toolTypes
  const tools = Array.isArray(A.toolTypes) ? A.toolTypes : [];
  if (tools.includes('custom')) {
    obligations += 1;
    F.push({ t: 'w', s: 'Custom/in-house AI may classify you as a provider under <code>Art. 3(3)</code> \u2014 stricter obligations apply' });
  }
  if (tools.length > 3) {
    F.push({ t: 'n', s: `Multiple AI tool categories detected (${tools.length}) \u2014 comprehensive inventory and classification needed` });
  }

  // Q6: decisionRole
  if (A.decisionRole === 'auto') {
    obligations += 2;
    F.push({ t: 'd', s: 'Autonomous AI decisions require risk assessment, human oversight measures, and may trigger <code>Art. 6</code> high-risk classification' });
  } else if (A.decisionRole === 'customer') {
    obligations += 1;
    F.push({ t: 'w', s: 'Customer-facing AI must comply with <code>Art. 50</code> transparency obligations \u2014 users must know they\'re interacting with AI' });
  } else if (A.decisionRole === 'assist') {
    F.push({ t: 'n', s: 'AI-assisted decisions \u2014 ensure human reviewers have adequate training and override capability' });
  }

  // Q7: transparency
  if (A.transparency === 'no') {
    obligations += 1; gaps++;
    F.push({ t: 'd', s: '<code>Art. 50</code> violation risk \u2014 AI interactions must be transparently disclosed to affected persons' });
  } else if (A.transparency === 'partial') {
    gaps++;
    F.push({ t: 'w', s: 'Inconsistent transparency \u2014 <code>Art. 50</code> requires systematic disclosure, not case-by-case' });
  }

  // Q8: policy
  if (A.policy === 'no') {
    gaps++;
    F.push({ t: 'w', s: 'No AI policy \u2014 critical governance gap. Needed for <code>Art. 26</code> compliance and internal accountability' });
  } else if (A.policy === 'wip') {
    F.push({ t: 'n', s: 'AI policy in progress \u2014 ensure it covers approved tools, data handling, human oversight, and incident response' });
  }

  // Q9: hrAreas
  const areas = Array.isArray(A.hrAreas) ? A.hrAreas.filter(a => a !== 'none') : [];
  const areaNames: Record<string, string> = {
    hr: 'HR & Recruitment', credit: 'Creditworthiness & Insurance',
    education: 'Education & Training', health: 'Healthcare',
    legal: 'Legal & Judicial', infra: 'Critical Infrastructure',
    biometric: 'Biometric Identification',
  };
  const areaAnnex: Record<string, string> = {
    hr: 'Annex III \u00a74', credit: 'Annex III \u00a75(b)',
    education: 'Annex III \u00a73', health: 'Annex III \u00a71(b)',
    legal: 'Annex III \u00a76', infra: 'Annex III \u00a72',
    biometric: 'Annex III \u00a71(a)',
  };
  areas.forEach(a => {
    hrCount++; obligations += 2;
    F.push({ t: 'd', s: `${areaNames[a]} \u2192 high-risk under <code>${areaAnnex[a]}</code>. Requires FRIA, conformity assessment, and registration in EU database` });
  });

  // Q10: affectsRights
  if (A.affectsRights === 'yes') {
    obligations += 1;
    F.push({ t: 'd', s: 'AI affecting individual rights likely triggers high-risk classification <code>Art. 6(2)</code> \u2014 requires Fundamental Rights Impact Assessment' });
  } else if (A.affectsRights === 'indirect') {
    F.push({ t: 'w', s: 'Indirect influence on individuals \u2014 monitor for scope creep into high-risk territory' });
  }

  // Q11: oversight
  if (A.oversight === 'no' && (hrCount > 0 || A.decisionRole === 'auto')) {
    obligations += 1; gaps++;
    F.push({ t: 'd', s: 'No human oversight for AI decisions \u2014 <code>Art. 14</code> violation risk. High-risk systems require documented oversight measures' });
  } else if (A.oversight === 'informal' && hrCount > 0) {
    gaps++;
    F.push({ t: 'w', s: 'Informal oversight insufficient for high-risk AI \u2014 <code>Art. 14</code> requires documented, assigned review process' });
  }

  // Q12: inventory
  if (A.inventory === 'no') {
    gaps++;
    F.push({ t: 'w', s: 'No AI inventory \u2014 <code>Art. 26(1)</code> requires deployers to maintain records of all AI systems in use' });
  } else if (A.inventory === 'partial') {
    gaps++;
    F.push({ t: 'w', s: 'Partial inventory \u2014 untracked AI tools create blind spots. Complete inventory needed for <code>Art. 26</code> compliance' });
  }

  // Q13: litTraining
  if (A.litTraining === 'no') {
    obligations += 1; gaps++;
    F.push({ t: 'd', s: 'No AI literacy training \u2014 <code>Art. 4</code> is already in force. All staff using or overseeing AI must have sufficient AI literacy' });
  } else if (A.litTraining === 'partial') {
    gaps++;
    F.push({ t: 'w', s: 'Partial training \u2014 <code>Art. 4</code> requires ALL relevant staff to have AI literacy, not just some' });
  } else if (A.litTraining === 'planned') {
    gaps++;
    F.push({ t: 'w', s: 'Training planned but not delivered \u2014 <code>Art. 4</code> deadline was Feb 2, 2025. Action needed immediately' });
  }

  const score = obligations + (hrCount * 3) + (gaps * 2);
  let urgency: 'Low' | 'Medium' | 'High' = 'Low';
  if (score <= 3 || !applies) urgency = 'Low';
  else if (score <= 10) urgency = 'Medium';
  else urgency = 'High';

  return { obligations: Math.max(obligations, 1), hrCount, gaps, score, applies, urgency, findings: F };
}

/* ───────────────── FINDING SVG PATHS ───────────────── */

const findingSvgs: Record<string, string> = {
  d: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  w: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  n: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

const findingClass: Record<string, string> = { d: 'rd', w: 'rw', n: 'rn' };

/* ════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════ */

export default function QuickCheckPage() {
  const t = useTranslations('quickCheck');
  const locale = useLocale();

  const [step, setStep] = useState(1);          // 1..14
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [animKey, setAnimKey] = useState(0);     // re-trigger step animation

  /* ──── Derived ──── */

  const currentQ = step <= TOTAL_QUESTIONS ? QUESTIONS[step - 1] : null;

  const currentBlock = useMemo(() => {
    for (const b of BLOCKS) {
      if (step >= b.range[0] && step <= b.range[1]) return b;
    }
    if (step === 14) return BLOCKS[3];
    return BLOCKS[0];
  }, [step]);

  const isFirstOfBlock = currentQ ? blockFirstQ[currentQ.block] === step : false;

  const progress = (step / TOTAL_STEPS) * 100;

  const hasAnswer = useMemo(() => {
    if (step === 14) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && consent;
    }
    if (!currentQ) return false;
    const val = answers[currentQ.key];
    if (currentQ.type === 'multi') {
      return Array.isArray(val) && val.length > 0;
    }
    return typeof val === 'string' && val !== '';
  }, [step, answers, currentQ, email, consent]);

  /* ──── Handlers ──── */

  const selectOption = useCallback((qKey: string, type: OptType, value: string, exclusive?: boolean) => {
    setAnswers(prev => {
      const next = { ...prev };
      if (type === 'radio') {
        next[qKey] = value;
      } else {
        const current = Array.isArray(prev[qKey]) ? [...(prev[qKey] as string[])] : [];
        if (exclusive) {
          next[qKey] = ['none'];
        } else {
          const filtered = current.filter(v => v !== 'none');
          const idx = filtered.indexOf(value);
          if (idx >= 0) filtered.splice(idx, 1);
          else filtered.push(value);
          next[qKey] = filtered;
        }
      }
      return next;
    });
  }, []);

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS) {
      setStep(s => s + 1);
      setAnimKey(k => k + 1);
    }
  }, [step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep(s => s - 1);
      setAnimKey(k => k + 1);
    }
  }, [step]);

  const handleSubmit = useCallback(() => {
    setShowResult(true);
  }, []);

  const result = useMemo(() => {
    if (!showResult) return null;
    return computeScore(answers);
  }, [showResult, answers]);

  const isSelected = (qKey: string, type: OptType, value: string) => {
    const val = answers[qKey];
    if (type === 'radio') return val === value;
    if (Array.isArray(val)) return val.includes(value);
    return false;
  };

  /* ════════════════ RENDER ════════════════ */

  return (
    <>
      <style jsx>{`
        @keyframes fi {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .qc-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 2rem 2rem;
          min-height: 60vh;
        }

        /* ── Header ── */
        .hd { text-align: center; margin-bottom: 1.5rem; }
        .hd-badge {
          display: inline-flex; align-items: center; gap: .375rem;
          font-family: var(--f-mono); font-size: .5rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .08em; color: var(--teal);
          margin-bottom: .5rem;
        }
        .hd-badge svg {
          width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2;
        }
        .hd h1 {
          font-family: var(--f-display); font-size: 1.375rem; font-weight: 700;
          color: var(--dark); margin-bottom: .25rem; letter-spacing: -.02em;
        }
        .hd p { font-size: .875rem; color: var(--dark4); }

        /* ── Progress ── */
        .prg {
          display: flex; align-items: center; gap: .75rem;
          margin-bottom: 1.5rem; width: 100%; max-width: 520px;
        }
        .prg-info {
          font-family: var(--f-mono); font-size: .5rem; font-weight: 600;
          color: var(--dark5); text-transform: uppercase; letter-spacing: .06em;
          white-space: nowrap; min-width: 60px;
        }
        .prg-bar {
          flex: 1; height: 4px; background: var(--bg3);
          border-radius: 2px; overflow: hidden;
        }
        .prg-fill {
          height: 100%; background: var(--teal);
          border-radius: 2px; transition: width .4s ease;
        }
        .prg-blk {
          font-family: var(--f-mono); font-size: .4375rem; color: var(--dark5);
          white-space: nowrap; text-transform: uppercase; letter-spacing: .04em;
        }
        .prg-blk em {
          font-style: normal; color: var(--teal); font-weight: 700;
        }

        /* ── Card ── */
        .crd {
          background: var(--card); border: 1px solid var(--b2); border-radius: 14px;
          padding: 2.5rem; width: 100%; max-width: 520px;
          box-shadow: 0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03);
          transition: .35s;
        }

        /* ── Block header ── */
        .bh {
          font-family: var(--f-mono); font-size: .5rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .1em; color: var(--teal);
          margin-bottom: 1.25rem; display: flex; align-items: center; gap: .375rem;
        }
        .bh svg {
          width: 14px; height: 14px; fill: none; stroke: currentColor;
          stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
        }

        /* ── Step animation ── */
        .stp { animation: fi .3s ease both; }

        /* ── Question ── */
        .stp-q {
          font-family: var(--f-display); font-size: 1.0625rem; font-weight: 700;
          color: var(--dark); margin-bottom: .25rem;
        }
        .stp-h {
          font-size: .8125rem; color: var(--dark5);
          margin-bottom: 1.125rem; line-height: 1.5;
        }
        .stp-h :global(code) {
          font-family: var(--f-mono); font-size: .6875rem;
          background: var(--bg2); padding: .1em .35em;
          border-radius: 4px; color: var(--dark3);
        }
        .stp-h :global(strong) { font-weight: 700; color: var(--dark); }

        /* ── Options ── */
        .opts {
          display: flex; flex-direction: column; gap: .4375rem;
          margin-bottom: 1.375rem;
        }
        .opt {
          display: flex; align-items: center; gap: .75rem;
          padding: .6875rem 1rem; border: 1.5px solid var(--b2);
          border-radius: 10px; cursor: pointer; transition: .2s;
          user-select: none;
        }
        .opt:hover { border-color: var(--teal); background: var(--teal-dim); }
        .opt.sel {
          border-color: var(--teal); background: var(--teal-dim);
          box-shadow: 0 0 0 3px rgba(13,148,136,.06);
        }

        /* ── Radio dot ── */
        .rd {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid var(--b3); flex-shrink: 0;
          display: grid; place-items: center; transition: .2s;
        }
        .opt.sel .rd {
          border-color: var(--teal); background: var(--teal);
        }
        .rd-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #fff;
          display: none;
        }
        .opt.sel .rd-dot { display: block; }

        /* ── Checkbox ── */
        .ck {
          width: 18px; height: 18px; border-radius: 5px;
          border: 2px solid var(--b3); flex-shrink: 0;
          display: grid; place-items: center; transition: .2s;
          font-size: .625rem; color: transparent; font-weight: 700; line-height: 1;
        }
        .opt.sel .ck {
          border-color: var(--teal); background: var(--teal);
          color: #fff;
        }

        /* ── Option text ── */
        .opt-t { font-size: .8125rem; color: var(--dark2); font-weight: 500; }
        .opt-desc { font-size: .6875rem; color: var(--dark5); margin-top: .125rem; }

        /* ── Buttons ── */
        .btns { display: flex; gap: .5rem; }
        .bn {
          padding: .6875rem 1.25rem; border-radius: 8px;
          font-family: var(--f-body); font-weight: 700; font-size: .8125rem;
          cursor: pointer; border: none; transition: .25s;
          display: inline-flex; align-items: center; gap: .5rem;
          justify-content: center; text-decoration: none;
        }
        .bn svg {
          width: 14px; height: 14px; fill: none; stroke: currentColor;
          stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
        }
        .bn-p {
          background: var(--teal); color: #fff;
          box-shadow: 0 2px 8px var(--teal-glow); flex: 1;
        }
        .bn-p:hover:not(:disabled) { background: var(--teal2); transform: translateY(-1px); }
        .bn-p:disabled { opacity: .35; cursor: not-allowed; transform: none; }
        .bn-g {
          background: transparent; color: var(--dark4);
          flex: 0; padding: .6875rem .75rem;
        }
        .bn-g:hover { color: var(--dark2); }
        .bn-o {
          background: transparent; color: var(--teal);
          border: 1.5px solid var(--teal); flex: 1;
        }
        .bn-o:hover { background: var(--teal-dim); }

        /* ── Email step ── */
        .em-l {
          font-family: var(--f-mono); font-size: .5625rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: .08em; color: var(--dark4);
          margin-bottom: .4375rem; display: block;
        }
        .em-i {
          width: 100%; padding: .75rem 1rem;
          border: 1.5px solid var(--b2); border-radius: 8px;
          font-family: var(--f-body); font-size: .875rem;
          color: var(--dark); background: var(--bg);
          outline: none; transition: .25s; margin-bottom: .75rem;
        }
        .em-i:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-dim); }
        .consent-row {
          display: flex; align-items: flex-start; gap: .5rem;
          margin-bottom: 1.25rem; cursor: pointer; user-select: none;
        }
        .cbx {
          width: 16px; height: 16px; border-radius: 4px;
          border: 2px solid var(--b3); flex-shrink: 0;
          display: grid; place-items: center; transition: .2s;
          margin-top: .15rem; font-size: .5rem; color: transparent;
          font-weight: 700;
        }
        .cbx.on { background: var(--teal); border-color: var(--teal); color: #fff; }
        .consent-txt { font-size: .6875rem; color: var(--dark5); line-height: 1.5; }

        /* ── Result ── */
        .res { animation: fi .5s ease both; }

        .rv-hd { text-align: center; padding: 1rem 0 1.25rem; border-bottom: 1px solid var(--b); }
        .rv-ic {
          width: 48px; height: 48px; border-radius: 12px;
          display: grid; place-items: center; margin: 0 auto .75rem;
        }
        .rv-ic svg {
          width: 24px; height: 24px; fill: none; stroke-width: 2;
          stroke-linecap: round; stroke-linejoin: round;
        }
        .rv-ic.w { background: rgba(217,119,6,.1); border: 1px solid rgba(217,119,6,.15); }
        .rv-ic.w svg { stroke: var(--amber); }
        .rv-ic.g { background: var(--teal-dim); border: 1px solid var(--teal-glow); }
        .rv-ic.g svg { stroke: var(--teal); }
        .rv-ic.d { background: rgba(231,76,60,.08); border: 1px solid rgba(231,76,60,.12); }
        .rv-ic.d svg { stroke: var(--coral); }
        .rv-hd h2 {
          font-family: var(--f-display); font-size: 1.25rem; font-weight: 700;
          color: var(--dark); margin-bottom: .25rem;
        }
        .rv-hd p { font-size: .8125rem; color: var(--dark4); }

        .rs {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem;
          padding: 1rem 0; border-bottom: 1px solid var(--b);
        }
        .rs-i { text-align: center; }
        .rs-n {
          font-family: var(--f-display); font-size: 1.25rem; font-weight: 800;
          color: var(--dark);
        }
        .rs-n.w { color: var(--amber); }
        .rs-n.d { color: var(--coral); }
        .rs-n.gr { color: var(--green); }
        .rs-l {
          font-family: var(--f-mono); font-size: .375rem; text-transform: uppercase;
          letter-spacing: .06em; color: var(--dark5);
        }

        .rf { padding: 1rem 0; border-bottom: 1px solid var(--b); }
        .rf-t {
          font-family: var(--f-mono); font-size: .5rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: .08em; color: var(--dark4);
          margin-bottom: .75rem;
        }
        .ri {
          display: flex; align-items: flex-start; gap: .5rem;
          padding: .375rem 0; font-size: .8125rem; color: var(--dark2); line-height: 1.5;
        }
        .ri svg {
          width: 14px; height: 14px; flex-shrink: 0; margin-top: .2rem;
          fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
        }
        .ri.rw svg { stroke: var(--amber); }
        .ri.rd svg { stroke: var(--coral); }
        .ri.rn svg { stroke: var(--teal); }
        .ri :global(code) {
          font-family: var(--f-mono); font-size: .6875rem;
          background: var(--bg2); padding: .05em .3em;
          border-radius: 3px; white-space: nowrap; color: var(--dark3);
        }

        .rc { padding-top: 1.25rem; display: flex; flex-direction: column; gap: .5rem; }
        .rc .bn { width: 100%; }
        .rref {
          text-align: center; margin-top: .75rem;
          font-family: var(--f-mono); font-size: .375rem;
          color: var(--dark5); letter-spacing: .04em;
        }

        /* ── Footer ── */
        .ft {
          margin-top: 1.5rem; text-align: center;
          font-family: var(--f-mono); font-size: .4375rem;
          color: var(--dark5); letter-spacing: .04em;
          display: flex; align-items: center; justify-content: center; gap: .375rem;
        }
        .ft svg {
          width: 12px; height: 12px; stroke: var(--teal);
          fill: none; stroke-width: 2;
        }
        .ft a { color: var(--teal); text-decoration: none; font-weight: 600; }

        /* ── Responsive 520px ── */
        @media (max-width: 520px) {
          .crd { padding: 1.75rem 1.25rem; border-radius: 12px; }
          .hd h1 { font-size: 1.125rem; }
          .stp-q { font-size: 1rem; }
          .btns { flex-direction: column; }
          .bn-g { order: -1; }
          .rs { grid-template-columns: 1fr 1fr; gap: .75rem; }
        }
      `}</style>

      <div className="qc-wrap">
        {/* ════════ PAGE HEADER ════════ */}
        {!showResult && (
          <div className="hd">
            <div className="hd-badge">
              <svg viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
              </svg>
              {t('title')}
            </div>
            <h1>{t('subtitle')}</h1>
            <p>{t('tagline')}</p>
          </div>
        )}

        {/* ════════ PROGRESS BAR ════════ */}
        {!showResult && (
          <div className="prg">
            <span className="prg-info">
              Q {Math.min(step, 13)} / 13
            </span>
            <div className="prg-bar">
              <div className="prg-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="prg-blk">
              <em>{currentBlock.id}</em>/4{' '}
              {step === 14 ? 'Email' : t(currentBlock.nameKey).split(' ')[0]}
            </span>
          </div>
        )}

        {/* ════════ CARD ════════ */}
        <div className="crd">
          {showResult && result ? (
            /* ──────── RESULT VIEW ──────── */
            <div className="res" key="result">
              <div className="rv-hd">
                <div className={`rv-ic ${result.urgency === 'Low' ? 'g' : result.urgency === 'Medium' ? 'w' : 'd'}`}>
                  {result.urgency === 'Low' && (
                    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  )}
                  {result.urgency === 'Medium' && (
                    <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  )}
                  {result.urgency === 'High' && (
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  )}
                </div>
                <h2>
                  {result.urgency === 'Low' && t('resultLowTitle')}
                  {result.urgency === 'Medium' && t('resultMediumTitle')}
                  {result.urgency === 'High' && t('resultHighTitle')}
                </h2>
                <p>
                  {result.urgency === 'Low' && t('resultLowDesc')}
                  {result.urgency === 'Medium' && t('resultMediumDesc')}
                  {result.urgency === 'High' && t('resultHighDesc')}
                </p>
              </div>

              {/* Stats grid */}
              <div className="rs">
                <div className="rs-i">
                  <div className="rs-n">{result.obligations}</div>
                  <div className="rs-l">Obligations</div>
                </div>
                <div className="rs-i">
                  <div className={`rs-n${result.hrCount > 0 ? ' d' : ''}`}>{result.hrCount}</div>
                  <div className="rs-l">High-risk areas</div>
                </div>
                <div className="rs-i">
                  <div className={`rs-n${result.gaps > 2 ? ' d' : result.gaps > 0 ? ' w' : ''}`}>{result.gaps}</div>
                  <div className="rs-l">Readiness gaps</div>
                </div>
                <div className="rs-i">
                  <div className={`rs-n${result.urgency === 'High' ? ' d' : result.urgency === 'Medium' ? ' w' : ' gr'}`}>{result.urgency}</div>
                  <div className="rs-l">Urgency</div>
                </div>
              </div>

              {/* Findings */}
              <div className="rf">
                <div className="rf-t">{t('keyFindings')}</div>
                {result.findings.map((f, i) => (
                  <div key={i} className={`ri ${findingClass[f.t]}`}>
                    <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: findingSvgs[f.t] }} />
                    <span dangerouslySetInnerHTML={{ __html: f.s }} />
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="rc">
                <a href={`/${locale}/auth/register?plan=free`} className="bn bn-p">
                  {t('createFreeAccount')}
                  <svg viewBox="0 0 24 24"><polyline points="12 5 19 12 12 19"/></svg>
                </a>
                <a href={`/${locale}/auth/register?plan=growth&period=monthly`} className="bn bn-o">
                  {t('startTrial')}
                </a>
              </div>
              <div className="rref">Based on Regulation (EU) 2024/1689 — EU Artificial Intelligence Act</div>
            </div>
          ) : step <= TOTAL_QUESTIONS && currentQ ? (
            /* ──────── QUESTION STEP ──────── */
            <div className="stp" key={`step-${step}-${animKey}`}>
              {/* Block header — first question of each block */}
              {isFirstOfBlock && (
                <div className="bh">
                  {blockIcons[currentQ.block]}
                  {` Block ${currentQ.block} / 4 \u2014 ${t(BLOCKS[currentQ.block - 1].nameKey)}`}
                </div>
              )}

              <div className="stp-q">{t(currentQ.qKey)}</div>

              {currentQ.helpHtml && (
                <div className="stp-h" dangerouslySetInnerHTML={{ __html: currentQ.helpHtml }} />
              )}

              <div className="opts">
                {currentQ.options.map(opt => {
                  const sel = isSelected(currentQ.key, currentQ.type, opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`opt${sel ? ' sel' : ''}`}
                      onClick={() => selectOption(currentQ.key, currentQ.type, opt.value, opt.exclusive)}
                    >
                      {currentQ.type === 'radio' ? (
                        <div className="rd"><div className="rd-dot" /></div>
                      ) : (
                        <div className="ck">{sel ? '\u2713' : ''}</div>
                      )}
                      <div>
                        <div className="opt-t">{t(opt.tKey)}</div>
                        {opt.descKey && <div className="opt-desc">{t(opt.descKey)}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="btns">
                {step > 1 && (
                  <button className="bn bn-g" onClick={goBack} type="button">
                    <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                )}
                <button
                  className="bn bn-p"
                  disabled={!hasAnswer}
                  onClick={goNext}
                  type="button"
                >
                  Next
                  <svg viewBox="0 0 24 24"><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>
            </div>
          ) : step === 14 && !showResult ? (
            /* ──────── EMAIL STEP ──────── */
            <div className="stp" key={`step-14-${animKey}`}>
              <div className="stp-q">{t('emailCapture')}</div>
              <div className="stp-h">{t('emailCaptureDesc')}</div>

              <label className="em-l">Work Email</label>
              <input
                className="em-i"
                type="email"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <div
                className="consent-row"
                onClick={() => setConsent(c => !c)}
              >
                <div className={`cbx${consent ? ' on' : ''}`}>
                  {consent ? '\u2713' : ''}
                </div>
                <span className="consent-txt">
                  I agree to receive my assessment and occasional compliance updates. Unsubscribe anytime.
                </span>
              </div>

              <div className="btns">
                <button className="bn bn-g" onClick={goBack} type="button">
                  <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <button
                  className="bn bn-p"
                  disabled={!hasAnswer}
                  onClick={handleSubmit}
                  type="button"
                >
                  See My Assessment
                  <svg viewBox="0 0 24 24"><polyline points="12 5 19 12 12 19"/></svg>
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {/* ════════ FOOTER ════════ */}
        <div className="ft">
          <svg viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
          No account required &middot; Your data is not stored &middot;{' '}
          <a href={`/${locale}`}>complior.ai</a>
        </div>
      </div>
    </>
  );
}
