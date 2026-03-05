'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ToolDetailHeader } from '@/components/tools/ToolDetailHeader';
import { ToolRequirements } from '@/components/tools/ToolRequirements';
import { ClassificationTab } from '@/components/tools/ClassificationTab';
import { DocumentsTab } from '@/components/tools/DocumentsTab';
import { AuditTrailTab } from '@/components/tools/AuditTrailTab';
import { AlternativesSection } from '@/components/tools/AlternativesSection';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { api, type AIToolDetail } from '@/lib/api';

type Tab = 'requirements' | 'classification' | 'documents' | 'audit';

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('toolDetail');
  const [tool, setTool] = useState<AIToolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('requirements');
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  const fetchTool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.tools.getById(Number(id));
      setTool(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTool();
  }, [id, fetchTool]);

  const handleDelete = async () => {
    if (!tool) return;
    setDeleting(true);
    try {
      await api.tools.delete(tool.id);
      router.push(`/${locale}/tools/inventory`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleReclassify = async () => {
    if (!tool) return;
    setReclassifying(true);
    try {
      await api.tools.classify(tool.id);
      await fetchTool();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to classify');
    } finally {
      setReclassifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-6 pt-20 pb-12">
        <div className="space-y-4">
          <div className="h-4 w-48 animate-pulse rounded bg-[var(--bg2)]" />
          <div className="h-16 animate-pulse rounded-xl bg-[var(--bg2)]" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-24 animate-pulse rounded-[10px] bg-[var(--bg2)]" />
            <div className="h-24 animate-pulse rounded-[10px] bg-[var(--bg2)]" />
            <div className="h-24 animate-pulse rounded-[10px] bg-[var(--bg2)]" />
          </div>
          <div className="h-64 animate-pulse rounded-xl bg-[var(--bg2)]" />
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="max-w-[800px] mx-auto px-6 pt-20 pb-12">
        <div className="rounded-lg border border-[var(--coral)] bg-[rgba(231,76,60,0.06)] p-4">
          <p className="text-sm text-[var(--coral)]">{error || 'Tool not found'}</p>
        </div>
      </div>
    );
  }

  const completed = tool.requirements?.filter((r) => r.status === 'completed').length ?? 0;
  const total = tool.requirements?.length ?? 0;

  const tabs: { key: Tab; label: string; badge?: string; locked?: boolean }[] = [
    { key: 'requirements', label: t('tabRequirements'), badge: total > 0 ? `${completed}/${total}` : undefined },
    { key: 'classification', label: t('tabClassification') },
    { key: 'documents', label: t('tabDocuments') },
    { key: 'audit', label: t('tabAuditTrail'), locked: true },
  ];

  return (
    <div className="max-w-[800px] mx-auto px-6 pt-20 pb-12">
      <ToolDetailHeader
        tool={tool}
        onDelete={() => setDeleteOpen(true)}
        onReclassify={handleReclassify}
        onOpenFria={tool.riskLevel === 'high' || tool.riskLevel === 'prohibited' ? () => setActiveTab('documents') : undefined}
        deleting={deleting}
        reclassifying={reclassifying}
      />

      {/* Tabs — design: tabs */}
      <div className="flex gap-0 border-b-2 border-[var(--b)]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => !tab.locked && setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[0.8125rem] font-semibold relative transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? 'text-[var(--teal)]'
                : 'text-[var(--dark5)] hover:text-[var(--dark3)]'
            } ${tab.locked ? 'cursor-default' : 'cursor-pointer'}`}
          >
            {tab.label}
            {tab.badge && (
              <span className={`font-mono text-[0.375rem] px-1 py-px rounded ${
                activeTab === tab.key
                  ? 'bg-[var(--teal-dim)] text-[var(--teal)]'
                  : 'bg-[var(--bg3)] text-[var(--dark5)]'
              }`}>
                {tab.badge}
              </span>
            )}
            {tab.locked && (
              <span className="text-[0.5rem] opacity-40">&#x1f512;</span>
            )}
            {activeTab === tab.key && (
              <span className="absolute bottom-[-2px] left-0 right-0 h-0.5 bg-[var(--teal)] rounded-sm" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-6">
        {activeTab === 'requirements' && <ToolRequirements requirements={tool.requirements} />}
        {activeTab === 'classification' && (
          <ClassificationTab
            classification={tool.classification}
            onClassify={handleReclassify}
            classifying={reclassifying}
          />
        )}
        {activeTab === 'documents' && <DocumentsTab toolId={tool.id} riskLevel={tool.riskLevel} />}
        {activeTab === 'audit' && <AuditTrailTab />}
      </div>

      {/* Alternatives (only for high/prohibited) */}
      {tool.riskLevel && (
        <AlternativesSection
          riskLevel={tool.riskLevel}
          domain={tool.domain}
          currentToolName={tool.name}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-[var(--card)] border-[var(--b2)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--dark)]">{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription className="text-[var(--dark5)]">
              {t('deleteConfirmDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1 rounded-lg bg-[var(--bg2)] px-3 py-2">
            <p className="text-sm font-medium text-[var(--dark3)]">{tool.name}</p>
            {tool.vendorName && <p className="text-xs text-[var(--dark5)]">{tool.vendorName}</p>}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <button
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--dark4)] hover:bg-[var(--bg2)] transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white bg-[var(--coral)] hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {deleting ? t('deleting') : t('deleteConfirmButton')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
