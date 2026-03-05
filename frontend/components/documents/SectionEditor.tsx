'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DocumentSection } from '@/lib/api';

interface SectionEditorProps {
  section: DocumentSection;
  onSave: (content: { text: string }) => void;
  onGenerate: () => void;
  onApprove?: () => void;
  onRevoke?: () => void;
  saving: boolean;
  generating: boolean;
  approving?: boolean;
  documentStatus?: string;
}

const STATUS_COLORS: Record<string, string> = {
  empty: 'bg-[var(--bg2)] text-[var(--dark5)]',
  ai_generated: 'bg-[var(--teal-dim)] text-[var(--teal)]',
  editing: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-blue-50 text-blue-700',
  approved: 'bg-emerald-50 text-emerald-700',
};

export function SectionEditor({
  section, onSave, onGenerate, onApprove, onRevoke,
  saving, generating, approving, documentStatus,
}: SectionEditorProps) {
  const t = useTranslations('documents');
  const [text, setText] = useState(section.content?.text || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset when section content changes externally (e.g. after AI generation)
  useEffect(() => {
    setText(section.content?.text || '');
  }, [section.content?.text]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 128) + 'px';
  }, [text]);

  const handleSave = useCallback(() => {
    onSave({ text });
  }, [text, onSave]);

  const isDirty = text !== (section.content?.text || '');
  const isApproved = section.status === 'approved';
  const isReadOnly = isApproved || documentStatus === 'approved' || documentStatus === 'archived';
  const canApprove = !isApproved && section.status !== 'empty' && documentStatus !== 'approved' && documentStatus !== 'archived';

  return (
    <div className="rounded-xl border-[1.5px] border-[var(--b2)] bg-[var(--bg)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--b)]">
        <div className="flex items-center gap-3">
          <h3 className="text-[0.875rem] font-semibold text-[var(--dark3)]">
            {section.title}
          </h3>
          <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-mono uppercase tracking-wider ${STATUS_COLORS[section.status] || STATUS_COLORS.empty}`}>
            {t(`sectionStatus.${section.status}`)}
          </span>
          {section.aiDraft && (
            <span className="px-2 py-0.5 rounded-full text-[0.625rem] font-mono uppercase tracking-wider bg-[var(--teal-dim)] text-[var(--teal)]">
              {t('aiGenerated')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isApproved && onRevoke && documentStatus !== 'approved' && (
            <button
              onClick={onRevoke}
              disabled={approving}
              className="px-3 py-1.5 rounded-lg border border-amber-400 text-amber-600 text-[0.75rem] font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('revokeApproval')}
            </button>
          )}
          {canApprove && onApprove && (
            <button
              onClick={onApprove}
              disabled={approving || isDirty}
              className="px-3 py-1.5 rounded-lg border border-emerald-400 text-emerald-600 text-[0.75rem] font-semibold hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {approving ? t('approving') : t('approveSection')}
            </button>
          )}
          <button
            onClick={onGenerate}
            disabled={generating || isApproved}
            className="px-3 py-1.5 rounded-lg border border-[var(--teal)] text-[var(--teal)] text-[0.75rem] font-semibold hover:bg-[var(--teal-dim)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('generating')}
              </span>
            ) : (
              t('generateDraft')
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          readOnly={isReadOnly}
          className={`w-full px-3 py-2.5 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg)] text-[0.8125rem] text-[var(--dark3)] leading-relaxed resize-y focus:outline-none focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] placeholder:text-[var(--dark6)] ${isReadOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
          style={{ minHeight: '8rem' }}
          placeholder="Enter section content..."
        />
      </div>

      {/* Footer */}
      {!isReadOnly && (
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--b)] bg-[var(--bg2)]">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="px-4 py-2 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_var(--teal-glow)]"
          >
            {saving ? t('saving') : isDirty ? t('save') : t('saved')}
          </button>
        </div>
      )}
    </div>
  );
}
