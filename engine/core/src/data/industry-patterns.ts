export type IndustryId = 'hr' | 'finance' | 'healthcare' | 'education' | 'legal' | 'biometrics' | 'critical-infra' | 'migration';

export interface IndustryPattern {
  readonly id: IndustryId;
  readonly label: string;
  readonly annexRef: string;
  readonly articleRef: string;
  readonly obligationId: string;
  readonly patterns: readonly RegExp[];
}

export const INDUSTRY_PATTERNS: readonly IndustryPattern[] = [
  {
    id: 'hr',
    label: 'HR / Employment',
    annexRef: 'Annex III §6(a)',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-006',
    patterns: [
      /resume[_.]parser/i,
      /cv[_.]screen/i,
      /candidate[_.]score/i,
      /hiring[_.]decision/i,
      /recruitment[_.]ai/i,
      /employee[_.]monitoring/i,
      /performance[_.]review/i,
      /applicant[_.]tracking/i,
    ],
  },
  {
    id: 'finance',
    label: 'Finance / Credit',
    annexRef: 'Annex III §5(b)',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-005',
    patterns: [
      /credit[_.]score/i,
      /loan[_.]approval/i,
      /insurance[_.]underwriting/i,
      /fraud[_.]detection/i,
      /aml[_.]check/i,
      /kyc[_.]verification/i,
      /creditworthiness/i,
      /trading[_.]algo/i,
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare / Medical',
    annexRef: 'Annex III §5(a)',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-005',
    patterns: [
      /medical[_.]device/i,
      /diagnosis[_.]ai/i,
      /patient[_.]data/i,
      /health[_.]record/i,
      /clinical[_.]decision/i,
      /drug[_.]discovery/i,
      /patient[_.]monitoring/i,
      /medical[_.]imaging/i,
    ],
  },
  {
    id: 'education',
    label: 'Education / Academic',
    annexRef: 'Annex III §3',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-006',
    patterns: [
      /admission[_.]ai/i,
      /grading[_.]system/i,
      /student[_.]monitoring/i,
      /learning[_.]analytics/i,
      /exam[_.]proctoring/i,
      /plagiarism[_.]detection/i,
      /enrollment[_.]decision/i,
    ],
  },
  {
    id: 'legal',
    label: 'Legal / Justice',
    annexRef: 'Annex III §8(a)',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-008',
    patterns: [
      /legal[_.]analysis/i,
      /case[_.]prediction/i,
      /contract[_.]review/i,
      /sentencing[_.]assist/i,
      /evidence[_.]analysis/i,
      /judicial[_.]decision/i,
      /legal[_.]research/i,
      /dispute[_.]resolution/i,
    ],
  },
  {
    id: 'biometrics',
    label: 'Biometrics / Identification',
    annexRef: 'Annex III §1',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-003',
    patterns: [
      /biometric[_.]identification/i,
      /facial[_.]recognition/i,
      /face[_.]detect/i,
      /fingerprint[_.]match/i,
      /iris[_.]scan/i,
      /voice[_.]biometric/i,
      /emotion[_.]recognition/i,
      /gait[_.]analysis/i,
      /remote[_.]biometric/i,
    ],
  },
  {
    id: 'critical-infra',
    label: 'Critical Infrastructure',
    annexRef: 'Annex III §2',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-003',
    patterns: [
      /scada[_.]control/i,
      /power[_.]grid/i,
      /water[_.]treatment/i,
      /traffic[_.]control/i,
      /infrastructure[_.]monitor/i,
      /smart[_.]grid/i,
      /energy[_.]management/i,
      /pipeline[_.]control/i,
      /network[_.]routing.*critical/i,
    ],
  },
  {
    id: 'migration',
    label: 'Migration / Border Control',
    annexRef: 'Annex III §7',
    articleRef: 'Art. 6(2)',
    obligationId: 'eu-ai-act-OBL-008',
    patterns: [
      /border[_.]control/i,
      /visa[_.]assessment/i,
      /asylum[_.]application/i,
      /immigration[_.]screening/i,
      /travel[_.]document/i,
      /migration[_.]risk/i,
      /entry[_.]exit[_.]system/i,
      /refugee[_.]screening/i,
    ],
  },
];

export const INDUSTRY_TEMPLATE_MAP: Record<IndustryId, string> = {
  hr: 'hr-ai-policy.md',
  finance: 'finance-ai-policy.md',
  healthcare: 'healthcare-ai-policy.md',
  education: 'education-ai-policy.md',
  legal: 'legal-ai-policy.md',
  biometrics: 'biometrics-ai-policy.md',
  'critical-infra': 'critical-infra-ai-policy.md',
  migration: 'migration-ai-policy.md',
};
