import type { ScanResult } from '../types/common.types.js';

const escapeCSV = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const toJiraCsv = (result: ScanResult): string => {
  const headers = ['Summary', 'Description', 'Priority', 'Labels', 'Component'];
  const rows: string[][] = [headers];

  const failFindings = result.findings.filter((f) => f.type === 'fail');

  for (const f of failFindings) {
    const summary = `[Compliance] ${f.checkId}: ${f.message}`;
    const description = [
      f.message,
      f.articleReference ? `Article: ${f.articleReference}` : '',
      f.obligationId ? `Obligation: ${f.obligationId}` : '',
      f.file ? `File: ${f.file}` : '',
      f.fix ? `Suggested fix: ${f.fix}` : '',
    ].filter(Boolean).join('\n');

    const priority = f.severity === 'critical' ? 'Highest' :
      f.severity === 'high' ? 'High' :
      f.severity === 'medium' ? 'Medium' : 'Low';

    rows.push([
      escapeCSV(summary),
      escapeCSV(description),
      priority,
      'compliance,eu-ai-act',
      'Compliance',
    ]);
  }

  return rows.map((r) => r.join(',')).join('\n');
};
