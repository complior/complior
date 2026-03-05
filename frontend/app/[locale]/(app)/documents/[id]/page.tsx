'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { SectionEditor } from '@/components/documents/SectionEditor';
import { RiskBadge } from '@/components/tools/RiskBadge';
import { api, type DocumentDetail, type DocumentSection } from '@/lib/api';

export default function DocumentEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('documents');

  const [data, setData] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [approvingSection, setApprovingSection] = useState<string | null>(null);
  const [approvingDocument, setApprovingDocument] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const documentId = Number(params.id);

  const fetchData = useCallback(async () => {
    try {
      const result = await api.documents.getById(documentId);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      return null;
    }
  }, [documentId]);

  // Initial load
  useEffect(() => {
    if (documentId) {
      setLoading(true);
      setError(null);
      fetchData().finally(() => setLoading(false));
    }
  }, [documentId, fetchData]);

  // Poll for async generation updates when any section is being generated
  useEffect(() => {
    if (generatingSection) {
      pollingRef.current = setInterval(async () => {
        const result = await fetchData();
        if (result) {
          const section = result.sections.find((s: DocumentSection) => s.sectionCode === generatingSection);
          if (section && section.status !== 'empty') {
            setGeneratingSection(null);
          }
        }
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [generatingSection, fetchData]);

  const handleSaveSection = useCallback(async (sectionCode: string, content: { text: string }) => {
    if (!data) return;
    setSavingSection(sectionCode);
    try {
      const updated = await api.documents.updateSection(documentId, sectionCode, { content });
      setData((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((s) =>
          s.sectionCode === sectionCode ? { ...s, ...updated } : s,
        );
        return { ...prev, sections: newSections };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingSection(null);
    }
  }, [data, documentId]);

  const handleGenerateDraft = useCallback(async (sectionCode: string) => {
    if (!data) return;
    setGeneratingSection(sectionCode);
    setError(null);
    try {
      await api.documents.generateDraft(documentId, sectionCode);
      // Polling will pick up the result — update local section to show generating state
      setData((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((s) =>
          s.sectionCode === sectionCode ? { ...s, status: 'empty' as const } : s,
        );
        return { ...prev, sections: newSections };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate draft');
      setGeneratingSection(null);
    }
  }, [data, documentId]);

  const handleApproveSection = useCallback(async (sectionCode: string) => {
    if (!data) return;
    setApprovingSection(sectionCode);
    setError(null);
    try {
      const updated = await api.documents.approveSection(documentId, sectionCode);
      setData((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((s) =>
          s.sectionCode === sectionCode ? { ...s, ...updated } : s,
        );
        return { ...prev, sections: newSections };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve section');
    } finally {
      setApprovingSection(null);
    }
  }, [data, documentId]);

  const handleRevokeSection = useCallback(async (sectionCode: string) => {
    if (!data) return;
    setApprovingSection(sectionCode);
    setError(null);
    try {
      const updated = await api.documents.revokeSection(documentId, sectionCode);
      setData((prev) => {
        if (!prev) return prev;
        const newSections = prev.sections.map((s) =>
          s.sectionCode === sectionCode ? { ...s, ...updated } : s,
        );
        return { ...prev, sections: newSections };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke approval');
    } finally {
      setApprovingSection(null);
    }
  }, [data, documentId]);

  const handleApproveDocument = async () => {
    setApprovingDocument(true);
    setError(null);
    try {
      await api.documents.approveDocument(documentId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve document');
    } finally {
      setApprovingDocument(false);
    }
  };

  const handleExportPdf = async () => {
    setExporting(true);
    setError(null);
    try {
      const result = await api.documents.exportPdf(documentId);
      window.open(result.fileUrl, '_blank');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg2)]" />
          <div className="h-8 w-96 animate-pulse rounded bg-[var(--bg2)]" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-[var(--bg2)]" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
        <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-4">
          <p className="text-sm text-[var(--coral)]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const completedCount = data.sections.filter((s) => s.status !== 'empty').length;
  const approvedCount = data.sections.filter((s) => s.status === 'approved').length;
  const totalCount = data.sections.length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const allSectionsApproved = approvedCount === totalCount && totalCount > 0;
  const canApproveDoc = allSectionsApproved && data.document.status !== 'approved' && data.document.status !== 'archived';

  return (
    <div className="max-w-[960px] mx-auto px-6 pt-20 pb-12">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/${locale}/tools/${data.document.aiToolId}`)}
          className="text-[0.75rem] text-[var(--dark5)] hover:text-[var(--dark3)] mb-3 flex items-center gap-1 transition-colors"
        >
          <span>&larr;</span> {t('backToTool')}
        </button>

        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-xl font-bold text-[var(--dark3)]">
                {data.document.title}
              </h1>
              {data.tool.riskLevel && <RiskBadge riskLevel={data.tool.riskLevel} />}
            </div>
            <p className="text-[0.8125rem] text-[var(--dark5)]">{data.tool.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {canApproveDoc && (
              <button
                onClick={handleApproveDocument}
                disabled={approvingDocument}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
              >
                {approvingDocument ? t('approving') : t('approveDocument')}
              </button>
            )}
            {data.document.fileUrl && (
              <button
                onClick={async () => {
                  const res = await api.documents.download(documentId);
                  window.open(res.fileUrl, '_blank');
                }}
                className="px-4 py-2 rounded-lg border border-[var(--b2)] text-[0.8125rem] font-medium text-[var(--dark4)] hover:bg-[var(--bg2)] transition-colors"
              >
                {t('downloadPdf')}
              </button>
            )}
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="px-5 py-2 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_var(--teal-glow)]"
            >
              {exporting ? t('exporting') : t('exportPdf')}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.75rem] text-[var(--dark5)]">
              {t('progress', { completed: completedCount, total: totalCount })}
              {approvedCount > 0 && ` · ${approvedCount} approved`}
            </span>
            <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">{percent}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg3)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--teal)] rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-3">
          <p className="text-[0.8125rem] text-[var(--coral)]">{error}</p>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {data.sections.map((section) => (
          <SectionEditor
            key={section.sectionCode}
            section={section}
            onSave={(content) => handleSaveSection(section.sectionCode, content)}
            onGenerate={() => handleGenerateDraft(section.sectionCode)}
            onApprove={() => handleApproveSection(section.sectionCode)}
            onRevoke={() => handleRevokeSection(section.sectionCode)}
            saving={savingSection === section.sectionCode}
            generating={generatingSection === section.sectionCode}
            approving={approvingSection === section.sectionCode}
            documentStatus={data.document.status}
          />
        ))}
      </div>
    </div>
  );
}
