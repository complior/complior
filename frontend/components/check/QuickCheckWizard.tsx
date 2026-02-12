'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { cn } from '@/lib/utils';
import { api, type QuickCheckResponse } from '@/lib/api';

const DOMAINS = [
  { value: 'biometrics', label: 'Biometrics' },
  { value: 'critical_infrastructure', label: 'Critical Infrastructure' },
  { value: 'education', label: 'Education & Training' },
  { value: 'employment', label: 'Employment & HR' },
  { value: 'essential_services', label: 'Essential Services' },
  { value: 'law_enforcement', label: 'Law Enforcement' },
  { value: 'migration', label: 'Migration & Border Control' },
  { value: 'justice', label: 'Justice & Democracy' },
  { value: 'customer_service', label: 'Customer Service' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'coding', label: 'Software Development' },
  { value: 'analytics', label: 'Analytics & BI' },
  { value: 'other', label: 'Other' },
];

interface WizardData {
  deploysAi: boolean | null;
  affectsNaturalPersons: boolean | null;
  domain: string;
  makesDecisions: boolean | null;
  email: string;
  consent: boolean;
}

interface QuickCheckWizardProps {
  onResult: (result: QuickCheckResponse) => void;
}

function YesNoRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean | null;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex gap-4 mt-4">
      {[
        { label: 'Yes', val: true },
        { label: 'No', val: false },
      ].map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.val)}
          className={cn(
            'flex-1 rounded-lg border-2 py-4 text-center text-sm font-medium transition-colors',
            value === option.val
              ? 'border-primary-600 bg-primary-50 text-primary-700'
              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const STEP_QUESTIONS = [
  'Do you deploy or use AI systems in your business?',
  'Does the AI system affect natural persons (customers, employees, public)?',
  'In which domain does your AI system operate?',
  'Does the AI system make or influence decisions about natural persons?',
  'Get your personalized assessment',
];

export function QuickCheckWizard({ onResult }: QuickCheckWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>({
    deploysAi: null,
    affectsNaturalPersons: null,
    domain: '',
    makesDecisions: null,
    email: '',
    consent: false,
  });

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return data.deploysAi !== null;
      case 1: return data.affectsNaturalPersons !== null;
      case 2: return data.domain !== '';
      case 3: return data.makesDecisions !== null;
      case 4: return data.email !== '' && data.consent;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    if (!canAdvance()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.public.quickCheck({
        deploysAi: data.deploysAi!,
        affectsNaturalPersons: data.affectsNaturalPersons!,
        domain: data.domain,
        makesDecisions: data.makesDecisions!,
        email: data.email,
      });
      onResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assessment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectClassName = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span>Step {step + 1} of {totalSteps}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <CardTitle className="text-lg">{STEP_QUESTIONS[step]}</CardTitle>
        {step === 4 && (
          <CardDescription>
            Enter your email to receive a detailed compliance report.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {/* Step 1: deploysAi */}
        {step === 0 && (
          <YesNoRadio
            name="deploysAi"
            value={data.deploysAi}
            onChange={(val) => setData({ ...data, deploysAi: val })}
          />
        )}

        {/* Step 2: affectsNaturalPersons */}
        {step === 1 && (
          <YesNoRadio
            name="affectsNaturalPersons"
            value={data.affectsNaturalPersons}
            onChange={(val) => setData({ ...data, affectsNaturalPersons: val })}
          />
        )}

        {/* Step 3: domain */}
        {step === 2 && (
          <div className="mt-4">
            <select
              value={data.domain}
              onChange={(e) => setData({ ...data, domain: e.target.value })}
              className={selectClassName}
            >
              <option value="">Select a domain...</option>
              {DOMAINS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Step 4: makesDecisions */}
        {step === 3 && (
          <YesNoRadio
            name="makesDecisions"
            value={data.makesDecisions}
            onChange={(val) => setData({ ...data, makesDecisions: val })}
          />
        )}

        {/* Step 5: email + consent */}
        {step === 4 && (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                required
              />
            </div>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.consent}
                onChange={(e) => setData({ ...data, consent: e.target.checked })}
                className="mt-1 rounded border-slate-300"
              />
              <span className="text-xs text-slate-600">
                I agree to receive my AI Act compliance assessment by email and accept the{' '}
                <a href="/privacy" className="text-primary-600 hover:underline">privacy policy</a>.
              </span>
            </label>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 0 && (
            <Button
              variant="secondary"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          {step < totalSteps - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canAdvance()}
              className="flex-1"
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canAdvance() || loading}
              className="flex-1"
            >
              {loading ? 'Analyzing...' : (
                <>Get Assessment <Send className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
