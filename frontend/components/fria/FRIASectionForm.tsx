'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FRIASection } from '@/lib/api';

interface FRIASectionFormProps {
  section: FRIASection;
  onSave: (content: Record<string, unknown>, completed: boolean) => void;
  saving: boolean;
  readOnly?: boolean;
  sectionIndex?: number;
  totalSections?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

// --- Internal Helpers ---

function GuidanceCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border border-[var(--teal)] bg-[var(--teal-dim)]">
      <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p className="text-[0.8125rem] text-[var(--dark3)] leading-relaxed">{children}</p>
    </div>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[0.8125rem] text-[var(--dark4)] leading-relaxed">{children}</p>
  );
}

// --- Field Components ---

function TextField({ label, value, onChange, readOnly, multiline, description, placeholder, required, preFilled }: {
  label: string; value: string; onChange: (v: string) => void; readOnly?: boolean; multiline?: boolean;
  description?: string; placeholder?: string; required?: boolean; preFilled?: boolean;
}) {
  return (
    <div>
      <label className="block mb-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-[var(--dark5)]">
          {label}
          {required && <span className="text-[var(--coral)] ml-0.5">*</span>}
        </span>
        {preFilled && (
          <span className="ml-2 text-[0.5rem] font-mono uppercase tracking-[0.08em] text-[var(--teal)] bg-[var(--teal-dim)] px-1.5 py-0.5 rounded">
            Pre-filled
          </span>
        )}
      </label>
      {description && (
        <p className="text-[0.6875rem] text-[var(--dark5)] mb-1.5">{description}</p>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg)] text-[0.8125rem] text-[var(--dark3)] resize-y focus:outline-none focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] read-only:bg-[var(--bg2)] read-only:text-[var(--dark5)] placeholder:text-[var(--dark6)]"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg)] text-[0.8125rem] text-[var(--dark3)] focus:outline-none focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)] read-only:bg-[var(--bg2)] read-only:text-[var(--dark5)] placeholder:text-[var(--dark6)]"
        />
      )}
    </div>
  );
}

function CheckboxField({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 mt-0.5 rounded border-[var(--b2)] text-[var(--teal)] focus:ring-[var(--teal)]"
        />
        <div>
          <span className="text-[0.8125rem] text-[var(--dark3)] font-medium">{label}</span>
          {description && (
            <p className="text-[0.6875rem] text-[var(--dark5)] mt-0.5">{description}</p>
          )}
        </div>
      </label>
    </div>
  );
}

function SelectField({ label, value, onChange, options, description }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  description?: string;
}) {
  return (
    <div>
      <label className="block mb-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-[var(--dark5)]">{label}</span>
      </label>
      {description && (
        <p className="text-[0.6875rem] text-[var(--dark5)] mb-1.5">{description}</p>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg)] text-[0.8125rem] text-[var(--dark3)] focus:outline-none focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)]"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function OptionCards({ label, description, options, selected, onChange }: {
  label: string; description?: string;
  options: { value: string; label: string; description: string }[];
  selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter((s) => s !== val) : [...selected, val]);
  };
  return (
    <div>
      <label className="block mb-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-[var(--dark5)]">{label}</span>
      </label>
      {description && (
        <p className="text-[0.6875rem] text-[var(--dark5)] mb-2">{description}</p>
      )}
      <div className="grid gap-2">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border-[1.5px] text-left transition-all ${
                isSelected
                  ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
                  : 'border-[var(--b2)] bg-[var(--bg)] hover:border-[var(--b3)]'
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border-[1.5px] flex items-center justify-center text-[0.5rem] ${
                isSelected
                  ? 'bg-[var(--teal)] border-[var(--teal)] text-white'
                  : 'border-[var(--b2)] bg-[var(--bg)]'
              }`}>
                {isSelected && '\u2713'}
              </span>
              <div>
                <span className="block text-[0.8125rem] font-medium text-[var(--dark3)]">{opt.label}</span>
                <span className="block text-[0.6875rem] text-[var(--dark5)] mt-0.5">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RadioCards({ label, description, options, value, onChange }: {
  label: string; description?: string;
  options: { value: string; label: string; description: string }[];
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block mb-1">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-[var(--dark5)]">{label}</span>
      </label>
      {description && (
        <p className="text-[0.6875rem] text-[var(--dark5)] mb-2">{description}</p>
      )}
      <div className="grid gap-2">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg border-[1.5px] text-left transition-all ${
                isSelected
                  ? 'border-[var(--teal)] bg-[var(--teal-dim)]'
                  : 'border-[var(--b2)] bg-[var(--bg)] hover:border-[var(--b3)]'
              }`}
            >
              <span className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded-full border-[1.5px] flex items-center justify-center ${
                isSelected
                  ? 'border-[var(--teal)]'
                  : 'border-[var(--b2)]'
              }`}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-[var(--teal)]" />}
              </span>
              <div>
                <span className="block text-[0.8125rem] font-medium text-[var(--dark3)]">{opt.label}</span>
                <span className="block text-[0.6875rem] text-[var(--dark5)] mt-0.5">{opt.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Risk/Measure Array Editor ---

interface RiskItem {
  category: string;
  description: string;
  severity: string;
  likelihood: string;
}

function RisksEditor({ risks, onChange, t }: { risks: RiskItem[]; onChange: (v: RiskItem[]) => void; t: ReturnType<typeof useTranslations> }) {
  const addRisk = () => onChange([...risks, { category: '', description: '', severity: 'medium', likelihood: 'medium' }]);
  const removeRisk = (i: number) => onChange(risks.filter((_, idx) => idx !== i));
  const updateRisk = (i: number, field: keyof RiskItem, value: string) => {
    const updated = [...risks];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  const severityOpts = [
    { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' },
  ];

  return (
    <div className="space-y-3">
      {risks.map((risk, i) => (
        <div key={i} className="p-4 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg2)] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">Risk #{i + 1}</span>
            <button onClick={() => removeRisk(i)} className="text-[0.6875rem] text-[var(--coral)] hover:underline">Remove</button>
          </div>
          <TextField
            label={t('fields.specific_risks.category.label')}
            description={t('fields.specific_risks.category.description')}
            placeholder={t('fields.specific_risks.category.placeholder')}
            value={risk.category}
            onChange={(v) => updateRisk(i, 'category', v)}
          />
          <TextField
            label={t('fields.specific_risks.riskDescription.label')}
            description={t('fields.specific_risks.riskDescription.description')}
            placeholder={t('fields.specific_risks.riskDescription.placeholder')}
            value={risk.description}
            onChange={(v) => updateRisk(i, 'description', v)}
            multiline
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label={t('fields.specific_risks.severity.label')}
              description={t('fields.specific_risks.severity.description')}
              value={risk.severity}
              onChange={(v) => updateRisk(i, 'severity', v)}
              options={severityOpts}
            />
            <SelectField
              label={t('fields.specific_risks.likelihood.label')}
              description={t('fields.specific_risks.likelihood.description')}
              value={risk.likelihood}
              onChange={(v) => updateRisk(i, 'likelihood', v)}
              options={severityOpts}
            />
          </div>
        </div>
      ))}
      <button onClick={addRisk} className="text-[0.8125rem] text-[var(--teal)] font-semibold hover:underline">
        {t('fields.specific_risks.addRisk')}
      </button>
    </div>
  );
}

interface MeasureItem {
  risk: string;
  measure: string;
  responsible: string;
  deadline: string;
}

function MeasuresEditor({ measures, onChange, t }: { measures: MeasureItem[]; onChange: (v: MeasureItem[]) => void; t: ReturnType<typeof useTranslations> }) {
  const addMeasure = () => onChange([...measures, { risk: '', measure: '', responsible: '', deadline: '' }]);
  const removeMeasure = (i: number) => onChange(measures.filter((_, idx) => idx !== i));
  const updateMeasure = (i: number, field: keyof MeasureItem, value: string) => {
    const updated = [...measures];
    updated[i] = { ...updated[i], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {measures.map((m, i) => (
        <div key={i} className="p-4 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg2)] space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[0.6875rem] font-mono text-[var(--dark5)]">Measure #{i + 1}</span>
            <button onClick={() => removeMeasure(i)} className="text-[0.6875rem] text-[var(--coral)] hover:underline">Remove</button>
          </div>
          <TextField
            label={t('fields.mitigation_measures.risk.label')}
            description={t('fields.mitigation_measures.risk.description')}
            placeholder={t('fields.mitigation_measures.risk.placeholder')}
            value={m.risk}
            onChange={(v) => updateMeasure(i, 'risk', v)}
          />
          <TextField
            label={t('fields.mitigation_measures.measure.label')}
            description={t('fields.mitigation_measures.measure.description')}
            placeholder={t('fields.mitigation_measures.measure.placeholder')}
            value={m.measure}
            onChange={(v) => updateMeasure(i, 'measure', v)}
            multiline
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t('fields.mitigation_measures.responsible.label')}
              description={t('fields.mitigation_measures.responsible.description')}
              placeholder={t('fields.mitigation_measures.responsible.placeholder')}
              value={m.responsible}
              onChange={(v) => updateMeasure(i, 'responsible', v)}
            />
            <div>
              <label className="block mb-1">
                <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-[var(--dark5)]">
                  {t('fields.mitigation_measures.deadline.label')}
                </span>
              </label>
              <p className="text-[0.6875rem] text-[var(--dark5)] mb-1.5">{t('fields.mitigation_measures.deadline.description')}</p>
              <input
                type="date"
                value={m.deadline}
                onChange={(e) => updateMeasure(i, 'deadline', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-[1.5px] border-[var(--b2)] bg-[var(--bg)] text-[0.8125rem] focus:outline-none focus:border-[var(--teal)] focus:shadow-[0_0_0_3px_var(--teal-dim)]"
              />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addMeasure} className="text-[0.8125rem] text-[var(--teal)] font-semibold hover:underline">
        {t('fields.mitigation_measures.addMeasure')}
      </button>
    </div>
  );
}

// --- Section Forms ---

function GeneralInfoForm({ content, onChange, readOnly, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; readOnly?: boolean; t: ReturnType<typeof useTranslations> }) {
  const c = content as { toolName?: string; vendor?: string; purpose?: string; domain?: string; deploymentDate?: string; riskLevel?: string };
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.general_info.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.general_info.guidance')}</GuidanceCallout>
      <TextField
        label={t('fields.general_info.toolName.label')}
        description={t('fields.general_info.toolName.description')}
        value={String(c.toolName || '')}
        onChange={(v) => onChange({ ...content, toolName: v })}
        readOnly
        preFilled
      />
      <TextField
        label={t('fields.general_info.vendor.label')}
        description={t('fields.general_info.vendor.description')}
        value={String(c.vendor || '')}
        onChange={(v) => onChange({ ...content, vendor: v })}
        readOnly={readOnly}
        preFilled={!!c.vendor}
      />
      <TextField
        label={t('fields.general_info.purpose.label')}
        description={t('fields.general_info.purpose.description')}
        placeholder={t('fields.general_info.purpose.placeholder')}
        value={String(c.purpose || '')}
        onChange={(v) => onChange({ ...content, purpose: v })}
        readOnly={readOnly}
        multiline
        required
      />
      <TextField
        label={t('fields.general_info.domain.label')}
        description={t('fields.general_info.domain.description')}
        value={String(c.domain || '')}
        onChange={(v) => onChange({ ...content, domain: v })}
        readOnly
        preFilled
      />
      <TextField
        label={t('fields.general_info.deploymentDate.label')}
        description={t('fields.general_info.deploymentDate.description')}
        placeholder={t('fields.general_info.deploymentDate.placeholder')}
        value={String(c.deploymentDate || '')}
        onChange={(v) => onChange({ ...content, deploymentDate: v })}
        readOnly={readOnly}
      />
      <TextField
        label={t('fields.general_info.riskLevel.label')}
        description={t('fields.general_info.riskLevel.description')}
        value={String(c.riskLevel || '')}
        onChange={(v) => onChange({ ...content, riskLevel: v })}
        readOnly
        preFilled
      />
    </div>
  );
}

function AffectedPersonsForm({ content, onChange, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const c = content as { categories?: string[]; vulnerableGroups?: boolean; estimatedCount?: string; description?: string };
  const personOptions = [
    { value: 'employees', label: t('fields.affected_persons.categories.employees'), description: t('fields.affected_persons.categories.employeesDesc') },
    { value: 'customers', label: t('fields.affected_persons.categories.customers'), description: t('fields.affected_persons.categories.customersDesc') },
    { value: 'applicants', label: t('fields.affected_persons.categories.applicants'), description: t('fields.affected_persons.categories.applicantsDesc') },
    { value: 'patients', label: t('fields.affected_persons.categories.patients'), description: t('fields.affected_persons.categories.patientsDesc') },
    { value: 'students', label: t('fields.affected_persons.categories.students'), description: t('fields.affected_persons.categories.studentsDesc') },
    { value: 'public', label: t('fields.affected_persons.categories.public'), description: t('fields.affected_persons.categories.publicDesc') },
  ];
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.affected_persons.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.affected_persons.guidance')}</GuidanceCallout>
      <OptionCards
        label={t('fields.affected_persons.categories.label')}
        description={t('fields.affected_persons.categories.description')}
        options={personOptions}
        selected={c.categories || []}
        onChange={(v) => onChange({ ...content, categories: v })}
      />
      <CheckboxField
        label={t('fields.affected_persons.vulnerableGroups.label')}
        description={t('fields.affected_persons.vulnerableGroups.description')}
        checked={c.vulnerableGroups || false}
        onChange={(v) => onChange({ ...content, vulnerableGroups: v })}
      />
      <TextField
        label={t('fields.affected_persons.estimatedCount.label')}
        description={t('fields.affected_persons.estimatedCount.description')}
        placeholder={t('fields.affected_persons.estimatedCount.placeholder')}
        value={String(c.estimatedCount || '')}
        onChange={(v) => onChange({ ...content, estimatedCount: v })}
      />
      <TextField
        label={t('fields.affected_persons.description.label')}
        description={t('fields.affected_persons.description.description')}
        placeholder={t('fields.affected_persons.description.placeholder')}
        value={String(c.description || '')}
        onChange={(v) => onChange({ ...content, description: v })}
        multiline
      />
    </div>
  );
}

function SpecificRisksForm({ content, onChange, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const c = content as { risks?: RiskItem[] };
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.specific_risks.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.specific_risks.guidance')}</GuidanceCallout>
      <RisksEditor risks={c.risks || []} onChange={(v) => onChange({ ...content, risks: v })} t={t} />
    </div>
  );
}

function HumanOversightForm({ content, onChange, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const c = content as { hasHumanOversight?: boolean; oversightType?: string; responsibleRole?: string; escalationProcess?: string };
  const oversightOptions = [
    {
      value: 'pre_decision',
      label: t('fields.human_oversight.oversightType.pre_decision.label'),
      description: t('fields.human_oversight.oversightType.pre_decision.description'),
    },
    {
      value: 'concurrent',
      label: t('fields.human_oversight.oversightType.concurrent.label'),
      description: t('fields.human_oversight.oversightType.concurrent.description'),
    },
    {
      value: 'post_hoc',
      label: t('fields.human_oversight.oversightType.post_hoc.label'),
      description: t('fields.human_oversight.oversightType.post_hoc.description'),
    },
  ];
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.human_oversight.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.human_oversight.guidance')}</GuidanceCallout>
      <CheckboxField
        label={t('fields.human_oversight.hasOversight.label')}
        description={t('fields.human_oversight.hasOversight.description')}
        checked={c.hasHumanOversight || false}
        onChange={(v) => onChange({ ...content, hasHumanOversight: v })}
      />
      <RadioCards
        label={t('fields.human_oversight.oversightType.label')}
        description={t('fields.human_oversight.oversightType.description')}
        options={oversightOptions}
        value={c.oversightType || ''}
        onChange={(v) => onChange({ ...content, oversightType: v })}
      />
      <TextField
        label={t('fields.human_oversight.responsibleRole.label')}
        description={t('fields.human_oversight.responsibleRole.description')}
        placeholder={t('fields.human_oversight.responsibleRole.placeholder')}
        value={String(c.responsibleRole || '')}
        onChange={(v) => onChange({ ...content, responsibleRole: v })}
      />
      <TextField
        label={t('fields.human_oversight.escalationProcess.label')}
        description={t('fields.human_oversight.escalationProcess.description')}
        placeholder={t('fields.human_oversight.escalationProcess.placeholder')}
        value={String(c.escalationProcess || '')}
        onChange={(v) => onChange({ ...content, escalationProcess: v })}
        multiline
      />
    </div>
  );
}

function MitigationMeasuresForm({ content, onChange, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const c = content as { measures?: MeasureItem[] };
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.mitigation_measures.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.mitigation_measures.guidance')}</GuidanceCallout>
      <MeasuresEditor measures={c.measures || []} onChange={(v) => onChange({ ...content, measures: v })} t={t} />
    </div>
  );
}

function MonitoringPlanForm({ content, onChange, t }: { content: Record<string, unknown>; onChange: (c: Record<string, unknown>) => void; t: ReturnType<typeof useTranslations> }) {
  const c = content as { frequency?: string; metrics?: string[]; responsibleTeam?: string; reviewProcess?: string };
  const freqOpts = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'annually', label: 'Annually' },
  ];
  return (
    <div className="space-y-4">
      <SectionIntro>{t('sectionMeta.monitoring_plan.intro')}</SectionIntro>
      <GuidanceCallout>{t('sectionMeta.monitoring_plan.guidance')}</GuidanceCallout>
      <SelectField
        label={t('fields.monitoring_plan.frequency.label')}
        description={t('fields.monitoring_plan.frequency.description')}
        value={c.frequency || ''}
        onChange={(v) => onChange({ ...content, frequency: v })}
        options={freqOpts}
      />
      <TextField
        label={t('fields.monitoring_plan.metrics.label')}
        description={t('fields.monitoring_plan.metrics.description')}
        placeholder={t('fields.monitoring_plan.metrics.placeholder')}
        value={(c.metrics || []).join(', ')}
        onChange={(v) => onChange({ ...content, metrics: v.split(',').map((s) => s.trim()).filter(Boolean) })}
      />
      <TextField
        label={t('fields.monitoring_plan.responsibleTeam.label')}
        description={t('fields.monitoring_plan.responsibleTeam.description')}
        placeholder={t('fields.monitoring_plan.responsibleTeam.placeholder')}
        value={String(c.responsibleTeam || '')}
        onChange={(v) => onChange({ ...content, responsibleTeam: v })}
      />
      <TextField
        label={t('fields.monitoring_plan.reviewProcess.label')}
        description={t('fields.monitoring_plan.reviewProcess.description')}
        placeholder={t('fields.monitoring_plan.reviewProcess.placeholder')}
        value={String(c.reviewProcess || '')}
        onChange={(v) => onChange({ ...content, reviewProcess: v })}
        multiline
      />
    </div>
  );
}

type SectionFormComponent = React.ComponentType<{
  content: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  readOnly?: boolean;
  t: ReturnType<typeof useTranslations>;
}>;

const FORM_MAP: Record<string, SectionFormComponent> = {
  general_info: GeneralInfoForm,
  affected_persons: AffectedPersonsForm,
  specific_risks: SpecificRisksForm,
  human_oversight: HumanOversightForm,
  mitigation_measures: MitigationMeasuresForm,
  monitoring_plan: MonitoringPlanForm,
};

export function FRIASectionForm({ section, onSave, saving, readOnly, sectionIndex, totalSections, onNext, onPrevious }: FRIASectionFormProps) {
  const t = useTranslations('fria');
  const [content, setContent] = useState<Record<string, unknown>>(section.content || {});
  const [completed, setCompleted] = useState(section.completed);

  // Reset when section changes
  useEffect(() => {
    setContent(section.content || {});
    setCompleted(section.completed);
  }, [section.sectionType, section.content, section.completed]);

  const handleSave = useCallback(() => {
    onSave(content, completed);
  }, [content, completed, onSave]);

  const handleSaveAndContinue = useCallback(() => {
    onSave(content, completed);
    if (onNext) onNext();
  }, [content, completed, onSave, onNext]);

  const FormComponent = FORM_MAP[section.sectionType];
  const isFirst = sectionIndex === 0;
  const isLast = sectionIndex !== undefined && totalSections !== undefined && sectionIndex >= totalSections - 1;

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-[var(--dark3)] mb-1">
        {t(`sections.${section.sectionType}`)}
      </h2>
      <p className="text-[0.75rem] text-[var(--dark5)] mb-5">{t('subtitle')}</p>

      <div className="space-y-4 mb-6">
        {FormComponent && <FormComponent content={content} onChange={setContent} readOnly={readOnly} t={t} />}
      </div>

      {!readOnly && (
        <div className="pt-4 border-t border-[var(--b)]">
          <div className="flex items-center justify-between">
            {/* Left side: Previous + Mark complete */}
            <div className="flex items-center gap-4">
              {onPrevious && !isFirst && (
                <button
                  onClick={onPrevious}
                  className="flex items-center gap-1.5 text-[0.8125rem] text-[var(--dark4)] hover:text-[var(--dark3)] transition-colors"
                >
                  <span>&larr;</span> {t('wizard.previousSection')}
                </button>
              )}
              <CheckboxField
                label={t('markComplete')}
                checked={completed}
                onChange={setCompleted}
              />
            </div>

            {/* Right side: Save Draft + Save & Continue */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-[var(--b2)] text-[0.8125rem] font-medium text-[var(--dark4)] hover:bg-[var(--bg2)] transition-colors disabled:opacity-50"
              >
                {saving ? t('saving') : t('wizard.saveDraft')}
              </button>
              <button
                onClick={isLast ? handleSave : handleSaveAndContinue}
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[var(--teal)] text-white text-[0.8125rem] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shadow-[0_0_12px_var(--teal-glow)]"
              >
                {saving ? t('saving') : isLast ? t('save') : t('wizard.saveAndContinue')}
                {!isLast && <span className="ml-1">&rarr;</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
