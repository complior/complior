'use client';

import { Check } from 'lucide-react';

const STEPS = [
  { label: 'Tool-Info', description: 'Name & Anbieter' },
  { label: 'Verwendung', description: 'Zweck & Bereich' },
  { label: 'Daten', description: 'Datentypen & Betroffene' },
  { label: 'Autonomie', description: 'Autonomie & Aufsicht' },
  { label: 'Prüfung', description: 'Zusammenfassung' },
];

interface WizardProgressProps {
  currentStep: number;
  completedSteps: number[];
}

export function WizardProgress({ currentStep, completedSteps }: WizardProgressProps) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {STEPS.map((step, i) => {
          const stepNum = i + 1;
          const isCompleted = completedSteps.includes(stepNum);
          const isCurrent = currentStep === stepNum;

          return (
            <li key={stepNum} className="flex items-center flex-1">
              <div className="flex flex-col items-center w-full">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isCompleted
                      ? 'bg-primary-600 text-white'
                      : isCurrent
                        ? 'border-2 border-primary-600 text-primary-600'
                        : 'border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                </div>
                <div className="mt-1 text-center">
                  <p className={`text-xs font-medium ${isCurrent ? 'text-primary-600' : 'text-slate-500'}`}>
                    {step.label}
                  </p>
                  <p className="hidden sm:block text-xs text-slate-400">{step.description}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? 'bg-primary-600' : 'bg-slate-200'}`} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
