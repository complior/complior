export interface IndustryPattern {
  readonly id: string;
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
    annexRef: 'Annex III §6(b)',
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
];
