'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { ToolDetailHeader } from '@/components/tools/ToolDetailHeader';
import { ToolRequirements } from '@/components/tools/ToolRequirements';
import { api, type AIToolDetail } from '@/lib/api';

type Tab = 'requirements' | 'classification' | 'history';

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const locale = useLocale();
  const [tool, setTool] = useState<AIToolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('requirements');
  const [deleting, setDeleting] = useState(false);

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
    if (!tool || !confirm('Are you sure you want to delete this tool?')) return;
    setDeleting(true);
    try {
      await api.tools.delete(tool.id);
      router.push(`/${locale}/tools/inventory`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--bg2)]" />
          <div className="h-32 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
          <div className="h-64 animate-pulse rounded-xl border border-[var(--b2)] bg-[var(--bg2)]" />
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="mx-auto max-w-ctr px-8 py-8">
        <div className="rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-4">
          <p className="text-sm text-[var(--coral)]">{error || 'Tool not found'}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: 'requirements', label: 'Requirements', available: true },
    { key: 'classification', label: 'Classification', available: false },
    { key: 'history', label: 'History', available: false },
  ];

  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <ToolDetailHeader tool={tool} onDelete={handleDelete} deleting={deleting} />
      <div className="mt-6 border-b border-[var(--b2)]">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button key={tab.key} onClick={() => tab.available && setActiveTab(tab.key)} disabled={!tab.available}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'border-teal text-teal' : tab.available ? 'border-transparent text-[var(--dark5)] hover:text-[var(--dark3)]' : 'border-transparent text-[var(--dark5)] opacity-50 cursor-not-allowed'}`}>
              {tab.label}
              {!tab.available && <span className="ml-1 text-xs">(Soon)</span>}
            </button>
          ))}
        </nav>
      </div>
      <div className="mt-6">
        {activeTab === 'requirements' && <ToolRequirements requirements={tool.requirements} />}
      </div>
    </div>
  );
}
