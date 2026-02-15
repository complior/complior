'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { WizardProgress } from '@/components/tools/wizard/WizardProgress';
import { Step1Tool } from '@/components/tools/wizard/Step1Tool';
import { Step2Usage } from '@/components/tools/wizard/Step2Usage';
import { Step3Data } from '@/components/tools/wizard/Step3Data';
import { Step4Autonomy } from '@/components/tools/wizard/Step4Autonomy';
import { Step5Review } from '@/components/tools/wizard/Step5Review';
import { ClassificationResult } from '@/components/classification/ClassificationResult';
import { api, type ClassifyResult } from '@/lib/api';

interface WizardState {
  step: number;
  toolId: number | null;
  classifyResult: ClassifyResult | null;
  errors: Record<string, string[]>;
  saving: boolean;
  classifying: boolean;
  name: string;
  vendorName: string;
  vendorCountry: string;
  vendorUrl: string;
  description: string;
  purpose: string;
  domain: string;
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
}

const INITIAL_STATE: WizardState = {
  step: 1, toolId: null, classifyResult: null, errors: {}, saving: false, classifying: false,
  name: '', vendorName: '', vendorCountry: '', vendorUrl: '', description: '', purpose: '', domain: '',
  dataTypes: [], affectedPersons: [], vulnerableGroups: false, autonomyLevel: 'advisory',
  humanOversight: true, affectsNaturalPersons: false,
};

export default function NewToolPage() {
  const router = useRouter();
  const locale = useLocale();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  const setField = useCallback(<K extends keyof WizardState>(updates: Pick<WizardState, K>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveStep = async (step: number, data: Record<string, unknown>) => {
    setState((prev) => ({ ...prev, saving: true, errors: {} }));
    try {
      if (step === 1 && !state.toolId) {
        const tool = await api.tools.create(data);
        setState((prev) => ({ ...prev, toolId: tool.id, saving: false, step: 2 }));
      } else if (state.toolId) {
        await api.tools.update(state.toolId, { ...data, step });
        setState((prev) => ({ ...prev, saving: false, step: step + 1 > 5 ? 5 : step + 1 }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      setState((prev) => ({ ...prev, saving: false, errors: { _form: [message] } }));
    }
  };

  const handleStep1Next = () => {
    if (!state.name.trim() || !state.vendorName.trim()) {
      const errs: Record<string, string[]> = {};
      if (!state.name.trim()) errs.name = ['Name is required'];
      if (!state.vendorName.trim()) errs.vendorName = ['Vendor is required'];
      setField({ errors: errs });
      return;
    }
    saveStep(1, { name: state.name, vendorName: state.vendorName, vendorCountry: state.vendorCountry || undefined, vendorUrl: state.vendorUrl || undefined, description: state.description || undefined });
  };

  const handleStep2Next = () => {
    if (!state.purpose.trim() || !state.domain) {
      const errs: Record<string, string[]> = {};
      if (!state.purpose.trim()) errs.purpose = ['Purpose is required'];
      if (!state.domain) errs.domain = ['Domain is required'];
      setField({ errors: errs });
      return;
    }
    saveStep(2, { purpose: state.purpose, domain: state.domain });
  };

  const handleStep3Next = () => {
    if (state.dataTypes.length === 0 || state.affectedPersons.length === 0) {
      const errs: Record<string, string[]> = {};
      if (state.dataTypes.length === 0) errs.dataTypes = ['At least one data type required'];
      if (state.affectedPersons.length === 0) errs.affectedPersons = ['At least one person group required'];
      setField({ errors: errs });
      return;
    }
    saveStep(3, { dataTypes: state.dataTypes, affectedPersons: state.affectedPersons, vulnerableGroups: state.vulnerableGroups });
  };

  const handleStep4Next = () => {
    if (!state.autonomyLevel) {
      setField({ errors: { autonomyLevel: ['Autonomy level is required'] } });
      return;
    }
    saveStep(4, { autonomyLevel: state.autonomyLevel, humanOversight: state.humanOversight, affectsNaturalPersons: state.affectsNaturalPersons });
  };

  const handleClassify = async () => {
    if (!state.toolId) return;
    setState((prev) => ({ ...prev, classifying: true, errors: {} }));
    try {
      const result = await api.tools.classify(state.toolId);
      setState((prev) => ({ ...prev, classifying: false, classifyResult: result }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Classification failed';
      setState((prev) => ({ ...prev, classifying: false, errors: { _form: [message] } }));
    }
  };

  const goBack = () => { setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1), errors: {} })); };

  const completedSteps = [];
  if (state.toolId) completedSteps.push(1);
  if (state.step > 2) completedSteps.push(2);
  if (state.step > 3) completedSteps.push(3);
  if (state.step > 4) completedSteps.push(4);
  if (state.classifyResult) completedSteps.push(5);

  if (state.classifyResult) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <ClassificationResult result={state.classifyResult} toolName={state.name}
          onViewTool={() => router.push(`/${locale}/tools/${state.toolId}`)}
          onBackToInventory={() => router.push(`/${locale}/tools/inventory`)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="mb-2 text-2xl font-bold tracking-tight text-[var(--dark)]">Register AI Tool</h1>
      <p className="mb-6 text-sm text-[var(--dark5)]">Register an AI tool and classify it under the EU AI Act.</p>
      <WizardProgress currentStep={state.step} completedSteps={completedSteps} />
      {state.errors._form && (
        <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[var(--coral-dim)] p-3">
          <p className="text-sm text-[var(--coral)]">{state.errors._form[0]}</p>
        </div>
      )}
      {state.step === 1 && <Step1Tool data={{ name: state.name, vendorName: state.vendorName, vendorCountry: state.vendorCountry, vendorUrl: state.vendorUrl, description: state.description }} onChange={(d) => setField(d)} onNext={handleStep1Next} errors={state.errors} />}
      {state.step === 2 && <Step2Usage data={{ purpose: state.purpose, domain: state.domain }} onChange={(d) => setField(d)} onNext={handleStep2Next} onBack={goBack} errors={state.errors} />}
      {state.step === 3 && <Step3Data data={{ dataTypes: state.dataTypes, affectedPersons: state.affectedPersons, vulnerableGroups: state.vulnerableGroups }} onChange={(d) => setField(d)} onNext={handleStep3Next} onBack={goBack} errors={state.errors} />}
      {state.step === 4 && <Step4Autonomy data={{ autonomyLevel: state.autonomyLevel, humanOversight: state.humanOversight, affectsNaturalPersons: state.affectsNaturalPersons }} onChange={(d) => setField(d)} onNext={handleStep4Next} onBack={goBack} errors={state.errors} />}
      {state.step === 5 && <Step5Review data={state} onBack={goBack} onClassify={handleClassify} classifying={state.classifying} />}
    </div>
  );
}
