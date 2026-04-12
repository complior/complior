import type { Finding } from '../../types/common.types.js';
import type { DocumentInventory, DocumentStatus, DocumentStatusLevel } from './types.js';
import { TEMPLATE_REGISTRY } from '../../data/template-registry.js';
import reporterConfig from '../../../data/reporter-config.json' with { type: 'json' };

const STATUS_SCORE = reporterConfig.documents.statusScore as Record<DocumentStatusLevel, number>;
const DOC_SCORE_IMPACT = reporterConfig.documents.scoreImpact;

/**
 * Determine document status from scan findings.
 *
 * - L1 check (file presence): pass → exists, fail → missing
 * - L2 check (structure depth): SHALLOW → scaffold, DETAILED → draft
 * - docQuality field on finding: 'reviewed' → reviewed
 */
const resolveStatus = (docType: string, findings: readonly Finding[]): DocumentStatusLevel => {
  // Find L1 finding for this doc type
  const l1 = findings.find(
    (f) => f.checkId === docType || f.checkId === `l1-${docType}`,
  );

  if (!l1 || l1.type === 'fail') return 'missing';

  // Check for docQuality annotation (set by L2 scanner)
  if (l1.docQuality === 'reviewed') return 'reviewed';

  // Check L2 finding for structure depth
  const l2 = findings.find(
    (f) => f.checkId === `l2-${docType}` || f.checkId.startsWith(`l2-${docType}`),
  );

  if (l2) {
    if (l2.type === 'fail' && l2.message.toLowerCase().includes('shallow')) return 'scaffold';
    if (l2.type === 'pass') return 'draft';
  }

  // File exists (L1 pass) but no L2 data — assume draft
  return 'draft';
};

const findLastModified = (docType: string, findings: readonly Finding[]): string | null => {
  const f = findings.find(
    (f) => (f.checkId === docType || f.checkId === `l1-${docType}`) && f.type === 'pass',
  );
  return f?.evidence?.[0]?.timestamp ?? null;
};

export const buildDocumentInventory = (findings: readonly Finding[]): DocumentInventory => {
  const documents: DocumentStatus[] = TEMPLATE_REGISTRY.map((entry) => ({
    docType: entry.docType,
    article: entry.article,
    description: entry.description,
    outputFile: entry.outputFile,
    status: resolveStatus(entry.docType, findings),
    scoreImpact: DOC_SCORE_IMPACT,
    prefilledPercent: null,
    lastModified: findLastModified(entry.docType, findings),
    templateFile: entry.templateFile ?? null,
  }));

  const byStatus = {
    missing: documents.filter((d) => d.status === 'missing').length,
    scaffold: documents.filter((d) => d.status === 'scaffold').length,
    draft: documents.filter((d) => d.status === 'draft').length,
    reviewed: documents.filter((d) => d.status === 'reviewed').length,
  };

  const total = documents.length;
  const weightedSum = documents.reduce((sum, d) => sum + STATUS_SCORE[d.status], 0);
  const score = total > 0 ? Math.round((weightedSum / total) * 100) : 0;

  return { total, byStatus, score, documents };
};
