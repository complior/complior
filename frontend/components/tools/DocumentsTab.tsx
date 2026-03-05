'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { api, type FRIAAssessment, type FRIASection, type DocumentListItem } from '@/lib/api';

interface DocumentsTabProps {
  toolId: number;
  riskLevel: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[var(--bg3)] text-[var(--dark5)]',
  in_progress: 'bg-[rgba(52,152,219,0.1)] text-[#3498db]',
  review: 'bg-[rgba(241,196,15,0.1)] text-[#f1c40f]',
  completed: 'bg-[rgba(46,204,113,0.1)] text-[#2ecc71]',
};

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[var(--bg3)] text-[var(--dark5)]',
  generating: 'bg-[rgba(52,152,219,0.1)] text-[#3498db]',
  review: 'bg-[rgba(241,196,15,0.1)] text-[#f1c40f]',
  approved: 'bg-[rgba(46,204,113,0.1)] text-[#2ecc71]',
  archived: 'bg-[var(--bg3)] text-[var(--dark5)]',
};

const DOCUMENT_TYPES = [
  'usage_policy',
  'qms_template',
  'risk_assessment',
  'monitoring_plan',
  'employee_notification',
] as const;

const DOC_ICONS: Record<string, JSX.Element> = {
  usage_policy: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  ),
  qms_template: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4" />
      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  risk_assessment: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  monitoring_plan: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  employee_notification: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
};

export function DocumentsTab({ toolId, riskLevel }: DocumentsTabProps) {
  const tFria = useTranslations('fria');
  const tDoc = useTranslations('documents');
  const router = useRouter();
  const locale = useLocale();

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [assessment, setAssessment] = useState<FRIAAssessment | null>(null);
  const [sections, setSections] = useState<FRIASection[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [creatingDoc, setCreatingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isHighRisk = riskLevel === 'high' || riskLevel === 'prohibited';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [friaData, docData] = await Promise.all([
        api.fria.getByTool(toolId),
        api.documents.listByTool(toolId),
      ]);
      setAssessment(friaData.assessment);
      setSections(friaData.sections);
      setDocuments(docData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [toolId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStartFRIA = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await api.fria.create(toolId);
      const friaId = result.fRIAAssessmentId;
      router.push(`/${locale}/tools/${toolId}/fria/${friaId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      setCreating(false);
    }
  };

  const handleCreateDocument = async (documentType: string) => {
    setCreatingDoc(documentType);
    setError(null);
    try {
      const result = await api.documents.create(toolId, documentType);
      router.push(`/${locale}/documents/${result.complianceDocumentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
      setCreatingDoc(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-[var(--bg2)]" />
        <div className="h-24 animate-pulse rounded-xl bg-[var(--bg2)]" />
      </div>
    );
  }

  if (error && !assessment && documents.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-4">
        <p className="text-sm text-[var(--coral)]">{error}</p>
      </div>
    );
  }

  // Build a map of existing documents by type
  const docByType: Record<string, DocumentListItem> = {};
  for (const doc of documents) {
    docByType[doc.documentType] = doc;
  }

  const friaCompletedCount = sections.filter((s) => s.completed).length;
  const friaTotalCount = sections.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-3">
          <p className="text-[0.8125rem] text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* FRIA Section */}
      {isHighRisk && !assessment && (
        <div className="rounded-xl border border-[var(--b)] p-5 bg-[var(--bg)]">
          <div className="flex items-start gap-4 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--teal-dim)] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-[var(--dark3)] mb-1">{tFria('title')}</h3>
              <p className="text-[0.8125rem] text-[var(--dark4)] leading-relaxed">{tFria('onboarding.whatIsFria')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-[var(--b)]">
            <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">{tFria('onboarding.estimatedTime')}</span>
            <button
              onClick={handleStartFRIA}
              disabled={creating}
              className="px-5 py-2.5 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_var(--teal-glow)]"
            >
              {creating ? tFria('saving') : tFria('startButton')}
            </button>
          </div>
        </div>
      )}

      {assessment && (
        <div className="rounded-xl border border-[var(--b)] p-5 bg-[var(--bg)]">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--dark3)]">{tFria('title')}</h3>
              <p className="text-[0.75rem] text-[var(--dark5)] mt-0.5">{tFria('subtitle')}</p>
            </div>
            <span className={`text-[0.6875rem] font-mono font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[assessment.status] || STATUS_COLORS.draft}`}>
              {tFria(`status.${assessment.status}`)}
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[0.75rem] text-[var(--dark5)]">
                {tFria('progress', { completed: friaCompletedCount, total: friaTotalCount })}
              </span>
              <span className="text-[0.75rem] font-mono text-[var(--dark4)]">
                {friaTotalCount > 0 ? Math.round((friaCompletedCount / friaTotalCount) * 100) : 0}%
              </span>
            </div>
            <div className="h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--teal)] rounded-full transition-all duration-500"
                style={{ width: `${friaTotalCount > 0 ? (friaCompletedCount / friaTotalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          {assessment.status !== 'completed' && (
            <button
              onClick={() => router.push(`/${locale}/tools/${toolId}/fria/${assessment.fRIAAssessmentId}`)}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity"
            >
              {tFria('continueButton')}
            </button>
          )}
        </div>
      )}

      {!isHighRisk && !assessment && (
        <div className="text-center py-8 px-8">
          <p className="text-[0.8125rem] text-[var(--dark5)]">{tFria('notRequired')}</p>
        </div>
      )}

      {/* Compliance Documents Section */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-base font-bold text-[var(--dark3)]">{tDoc('title')}</h3>
          <p className="text-[0.75rem] text-[var(--dark5)] mt-0.5">{tDoc('subtitle')}</p>
        </div>

        <div className="grid gap-3">
          {DOCUMENT_TYPES.map((docType) => {
            const existing = docByType[docType];
            const isCreating = creatingDoc === docType;

            return (
              <div
                key={docType}
                className="flex items-center justify-between px-5 py-4 rounded-xl border border-[var(--b)] bg-[var(--bg)] hover:border-[var(--b3)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--teal-dim)] text-[var(--teal)] flex items-center justify-center">
                    {DOC_ICONS[docType]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.8125rem] font-semibold text-[var(--dark3)]">
                        {tDoc(`types.${docType}`)}
                      </span>
                      {existing && (
                        <span className={`text-[0.625rem] font-mono font-bold px-2 py-0.5 rounded-full ${DOC_STATUS_COLORS[existing.status] || DOC_STATUS_COLORS.draft}`}>
                          {tDoc(`docStatus.${existing.status}`)}
                        </span>
                      )}
                    </div>
                    <span className="text-[0.6875rem] text-[var(--dark5)]">
                      {tDoc(`legalRef.${docType}`)}
                      {existing && (
                        <span className="ml-2">&middot; {tDoc('progress', { completed: existing.completedSections, total: existing.totalSections })}</span>
                      )}
                      {!existing && (
                        <span className="ml-2">&middot; {tDoc('notStarted')}</span>
                      )}
                    </span>
                  </div>
                </div>

                {existing ? (
                  <button
                    onClick={() => router.push(`/${locale}/documents/${existing.complianceDocumentId}`)}
                    className="px-4 py-2 rounded-lg border border-[var(--b2)] text-[0.8125rem] font-medium text-[var(--dark4)] hover:bg-[var(--bg2)] transition-colors"
                  >
                    {existing.status === 'approved' ? tDoc('viewButton') : tDoc('continueButton')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCreateDocument(docType)}
                    disabled={isCreating}
                    className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_var(--teal-glow)]"
                  >
                    {isCreating ? tDoc('generating') : tDoc('generateButton')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
