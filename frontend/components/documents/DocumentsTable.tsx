'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import type { DocumentListItem } from '@/lib/api';

const DOC_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-[var(--bg3)] text-[var(--dark5)]',
  generating: 'bg-[rgba(52,152,219,0.1)] text-[#3498db]',
  review: 'bg-[rgba(241,196,15,0.1)] text-[#f1c40f]',
  approved: 'bg-[rgba(46,204,113,0.1)] text-[#2ecc71]',
  archived: 'bg-[var(--bg3)] text-[var(--dark5)]',
};

interface DocumentsTableProps {
  documents: DocumentListItem[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const locale = useLocale();
  const t = useTranslations('documents');

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--b2)] bg-[var(--card)] p-8 text-center">
        <p className="text-[var(--dark5)] text-sm">{t('noDocuments')}</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-[var(--b2)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg2)] text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">{t('colTitle')}</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">{t('colTool')}</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">{t('colType')}</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">{t('colStatus')}</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]">{t('colProgress')}</th>
              <th className="px-4 py-3 font-medium text-[var(--dark4)]" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--b)]">
            {documents.map((doc) => (
              <tr key={doc.complianceDocumentId} className="hover:bg-[var(--bg2)] transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/documents/${doc.complianceDocumentId}`}
                    className="font-medium text-[var(--teal)] hover:underline"
                  >
                    {doc.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--dark3)]">{doc.toolName}</td>
                <td className="px-4 py-3 text-[var(--dark3)]">{t(`types.${doc.documentType}`)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold uppercase tracking-wider ${DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.draft}`}>
                    {t(`docStatus.${doc.status}`)}
                  </span>
                </td>
                <td className="px-4 py-3 text-[var(--dark3)]">
                  {t('progress', { completed: String(doc.completedSections), total: String(doc.totalSections) })}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/${locale}/documents/${doc.complianceDocumentId}`}
                    className="font-mono text-[0.75rem] font-bold text-[var(--teal)] hover:underline"
                  >
                    View &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {documents.map((doc) => (
          <Link
            key={doc.complianceDocumentId}
            href={`/${locale}/documents/${doc.complianceDocumentId}`}
            className="block rounded-xl border border-[var(--b2)] bg-[var(--card)] p-4 hover:border-[var(--teal)] transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-[var(--dark)]">{doc.title}</p>
                <p className="text-sm text-[var(--dark5)]">{doc.toolName}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold uppercase tracking-wider ${DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.draft}`}>
                {t(`docStatus.${doc.status}`)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs text-[var(--dark5)]">
              <span>{t(`types.${doc.documentType}`)}</span>
              <span>{t('progress', { completed: String(doc.completedSections), total: String(doc.totalSections) })}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
