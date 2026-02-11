'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ToolDetailHeader } from '@/components/tools/ToolDetailHeader';
import { ToolRequirements } from '@/components/tools/ToolRequirements';
import { api, type AIToolDetail } from '@/lib/api';

type Tab = 'requirements' | 'classification' | 'history';

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
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
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTool();
  }, [id, fetchTool]);

  const handleDelete = async () => {
    if (!tool || !confirm('Möchten Sie dieses Tool wirklich löschen?')) return;
    setDeleting(true);
    try {
      await api.tools.delete(tool.id);
      router.push('/tools/inventory');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
          <div className="h-32 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
          <div className="h-64 animate-pulse rounded-md border border-slate-200 bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error || 'Tool nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; available: boolean }[] = [
    { key: 'requirements', label: 'Anforderungen', available: true },
    { key: 'classification', label: 'Klassifizierung', available: false },
    { key: 'history', label: 'Verlauf', available: false },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <ToolDetailHeader tool={tool} onDelete={handleDelete} deleting={deleting} />

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => tab.available && setActiveTab(tab.key)}
              disabled={!tab.available}
              className={`border-b-2 pb-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : tab.available
                    ? 'border-transparent text-slate-500 hover:text-slate-700'
                    : 'border-transparent text-slate-300 cursor-not-allowed'
              }`}
            >
              {tab.label}
              {!tab.available && <span className="ml-1 text-xs">(Coming soon)</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'requirements' && (
          <ToolRequirements requirements={tool.requirements} />
        )}
      </div>
    </div>
  );
}
