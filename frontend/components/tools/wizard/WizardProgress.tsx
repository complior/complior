'use client';

import { useTranslations } from 'next-intl';

interface WizardProgressProps {
  currentStep: number;
  completedSteps: number[];
}

export function WizardProgress({ currentStep, completedSteps }: WizardProgressProps) {
  const t = useTranslations('wizard');

  const steps = [
    { label: t('step1') },
    { label: t('step2') },
    { label: t('step3') },
    { label: t('step4') },
    { label: t('step5') },
  ];

  const fillPercent = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="relative flex items-center mb-8">
      {/* Background line */}
      <div className="absolute left-0 right-0 top-[14px] h-[2px] bg-[var(--b2)] z-0" />
      {/* Filled line */}
      <div
        className="absolute left-0 top-[14px] h-[2px] bg-[var(--teal)] z-0 transition-all duration-400"
        style={{ width: `${fillPercent}%` }}
      />

      {steps.map((step, i) => {
        const stepNum = i + 1;
        const isCompleted = completedSteps.includes(stepNum);
        const isCurrent = currentStep === stepNum;

        return (
          <div key={stepNum} className="flex-1 flex flex-col items-center relative z-[1]">
            <div
              className={`
                w-7 h-7 rounded-full flex items-center justify-center
                font-mono text-[0.5625rem] font-bold border-2 transition-all duration-300 mb-1
                ${isCurrent
                  ? 'bg-[var(--teal)] border-[var(--teal)] text-white dark:text-[var(--bg)]'
                  : isCompleted
                    ? 'bg-[var(--teal-dim)] border-[var(--teal)] text-[var(--teal)]'
                    : 'bg-[var(--bg)] border-[var(--b2)] text-[var(--dark5)]'
                }
              `}
            >
              {isCompleted ? '\u2713' : stepNum}
            </div>
            <span
              className={`
                font-mono text-[0.375rem] uppercase tracking-[0.06em]
                ${isCurrent ? 'text-[var(--dark3)] font-bold' : 'text-[var(--dark5)]'}
              `}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
