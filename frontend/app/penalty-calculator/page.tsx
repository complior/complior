'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RevenueInput } from '@/components/calculator/RevenueInput';
import { PenaltyResult } from '@/components/calculator/PenaltyResult';

export default function PenaltyCalculatorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [revenue, setRevenue] = useState(0);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const paramRevenue = searchParams.get('revenue');
    if (paramRevenue) {
      const num = parseInt(paramRevenue, 10);
      if (!isNaN(num) && num > 0) {
        setRevenue(num);
        setShowResults(true);
      }
    }
  }, [searchParams]);

  const handleCalculate = useCallback(() => {
    if (revenue <= 0) return;
    setShowResults(true);
    router.replace(`/penalty-calculator?revenue=${revenue}`, { scroll: false });
  }, [revenue, router]);

  const handleRevenueChange = useCallback((val: number) => {
    setRevenue(val);
    if (showResults) {
      setShowResults(false);
    }
  }, [showResults]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
            <Calculator className="h-6 w-6 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
            AI Act Penalty Calculator
          </h1>
          <p className="text-slate-600">
            Calculate the maximum fines your organization could face under the EU AI Act based on your annual global turnover.
          </p>
        </div>

        {/* Input */}
        <div className="mb-6">
          <RevenueInput value={revenue} onChange={handleRevenueChange} />
        </div>
        <Button
          onClick={handleCalculate}
          disabled={revenue <= 0}
          className="w-full mb-10"
          size="lg"
        >
          Calculate Penalties
        </Button>

        {/* Results */}
        {showResults && revenue > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Maximum Penalty Exposure
            </h2>
            <PenaltyResult revenue={revenue} />
            <p className="mt-4 text-xs text-slate-500 text-center">
              Penalties are &ldquo;up to&rdquo; amounts. Actual fines depend on severity, intent, and cooperation with authorities.
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Ensure compliance before penalties apply
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Classify your AI tools, track requirements, and demonstrate compliance with our platform.
          </p>
          <Link href="/pricing">
            <Button>
              View Plans <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
