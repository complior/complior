'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { WizardProgress } from '@/components/tools/wizard/WizardProgress';
import { Step1Tool } from '@/components/tools/wizard/Step1Tool';
import { Step2Usage } from '@/components/tools/wizard/Step2Usage';
import { Step3Data } from '@/components/tools/wizard/Step3Data';
import { Step4Autonomy } from '@/components/tools/wizard/Step4Autonomy';
import { Step5Review } from '@/components/tools/wizard/Step5Review';
import { WizardSidebar } from '@/components/tools/wizard/WizardSidebar';
import { CatalogPickerModal } from '@/components/tools/wizard/CatalogPickerModal';
import { api, type ClassifyResult, type CatalogTool } from '@/lib/api';

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
  framework: string;
  modelProvider: string;
  modelId: string;
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
  name: '', vendorName: '', vendorCountry: '', vendorUrl: '', description: '',
  framework: '', modelProvider: '', modelId: '',
  purpose: '', domain: '',
  dataTypes: [], affectedPersons: [], vulnerableGroups: false, autonomyLevel: 'advisory',
  humanOversight: true, affectsNaturalPersons: false,
};

export default function NewToolPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('wizard');
  const searchParams = useSearchParams();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [catalogOpen, setCatalogOpen] = useState(false);

  // Pre-fill from catalog query params (e.g. from catalog detail "Register" button)
  useEffect(() => {
    const name = searchParams.get('name');
    if (name) {
      setState((prev) => ({
        ...prev,
        name: searchParams.get('name') || prev.name,
        vendorName: searchParams.get('vendor') || prev.vendorName,
        vendorCountry: searchParams.get('country') || prev.vendorCountry,
        vendorUrl: searchParams.get('website') || prev.vendorUrl,
        description: searchParams.get('description') || prev.description,
      }));
    }
  }, [searchParams]);

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
    saveStep(1, { name: state.name, vendorName: state.vendorName, vendorCountry: state.vendorCountry || undefined, vendorUrl: state.vendorUrl || undefined, description: state.description || undefined, framework: state.framework || undefined, modelProvider: state.modelProvider || undefined, modelId: state.modelId || undefined });
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
      await api.tools.classify(state.toolId);
      router.push(`/${locale}/tools/${state.toolId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Classification failed';
      setState((prev) => ({ ...prev, classifying: false, errors: { _form: [message] } }));
    }
  };

  const handleCatalogSelect = (tool: CatalogTool) => {
    setField({
      name: tool.name,
      vendorName: tool.vendor,
      vendorCountry: tool.vendorCountry || '',
      vendorUrl: tool.websiteUrl || '',
      description: tool.description || '',
    });
  };

  const goBack = () => { setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1), errors: {} })); };

  const completedSteps = [];
  if (state.toolId) completedSteps.push(1);
  if (state.step > 2) completedSteps.push(2);
  if (state.step > 3) completedSteps.push(3);
  if (state.step > 4) completedSteps.push(4);
  if (state.classifyResult) completedSteps.push(5);

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-[4.5rem] pb-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 min-h-screen">
      {/* Sidebar */}
      <WizardSidebar />

      {/* Main Panel */}
      <div className="bg-[var(--card)] border border-[var(--b2)] rounded-[14px] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
        {/* Progress */}
        <WizardProgress currentStep={state.step} completedSteps={completedSteps} />

        {/* Catalog buttons on Step 1 */}
        {state.step === 1 && (
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setCatalogOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body font-bold text-[0.8125rem] bg-[var(--bg2)] text-[var(--dark3)] border border-[var(--b2)] cursor-pointer transition-all hover:border-[var(--b3)] hover:text-[var(--dark)]"
            >
              <Search className="w-3.5 h-3.5" /> {t('browseCatalog')}
            </button>
          </div>
        )}

        {/* Error display */}
        {state.errors._form && (
          <div className="mb-4 rounded-lg border border-[var(--coral)] bg-[rgba(184,66,58,0.05)] p-3">
            <p className="text-sm text-[var(--coral)]">{state.errors._form[0]}</p>
          </div>
        )}

        {/* Steps */}
        {state.step === 1 && <Step1Tool data={{ name: state.name, vendorName: state.vendorName, vendorCountry: state.vendorCountry, vendorUrl: state.vendorUrl, description: state.description, framework: state.framework, modelProvider: state.modelProvider, modelId: state.modelId }} onChange={(d) => setField(d)} onNext={handleStep1Next} errors={state.errors} />}
        {state.step === 2 && <Step2Usage data={{ purpose: state.purpose, domain: state.domain }} onChange={(d) => setField(d)} onNext={handleStep2Next} onBack={goBack} errors={state.errors} />}
        {state.step === 3 && <Step3Data data={{ dataTypes: state.dataTypes, affectedPersons: state.affectedPersons, vulnerableGroups: state.vulnerableGroups }} onChange={(d) => setField(d)} onNext={handleStep3Next} onBack={goBack} errors={state.errors} />}
        {state.step === 4 && <Step4Autonomy data={{ autonomyLevel: state.autonomyLevel, humanOversight: state.humanOversight, affectsNaturalPersons: state.affectsNaturalPersons }} onChange={(d) => setField(d)} onNext={handleStep4Next} onBack={goBack} errors={state.errors} />}
        {state.step === 5 && <Step5Review data={state} onBack={goBack} onClassify={handleClassify} classifying={state.classifying} />}
      </div>

      {/* Catalog Picker Modal */}
      <CatalogPickerModal
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onSelect={handleCatalogSelect}
      />
    </div>
  );
}
