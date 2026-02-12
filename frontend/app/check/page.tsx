'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { QuickCheckWizard } from '@/components/check/QuickCheckWizard';
import { QuickCheckResult } from '@/components/check/QuickCheckResult';
import type { QuickCheckResponse } from '@/lib/api';

export default function QuickCheckPage() {
  const [result, setResult] = useState<QuickCheckResponse | null>(null);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="flex flex-col items-center">
        {!result && (
          <div className="text-center mb-10">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <Shield className="h-6 w-6 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
              AI Act Quick Check
            </h1>
            <p className="text-slate-600 max-w-md mx-auto">
              Answer 5 quick questions to find out if the EU AI Act applies to your organization and what you need to do.
            </p>
          </div>
        )}

        {result ? (
          <QuickCheckResult result={result} onRestart={() => setResult(null)} />
        ) : (
          <QuickCheckWizard onResult={setResult} />
        )}
      </div>
    </div>
  );
}
