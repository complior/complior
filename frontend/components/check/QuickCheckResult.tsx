import Link from 'next/link';
import { Shield, AlertTriangle, BookOpen, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { QuickCheckResponse } from '@/lib/api';

interface QuickCheckResultProps {
  result: QuickCheckResponse;
  onRestart: () => void;
}

const severityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  info: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function QuickCheckResult({ result, onRestart }: QuickCheckResultProps) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                result.applies ? 'bg-amber-100' : 'bg-green-100'
              )}
            >
              {result.applies ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <Shield className="h-5 w-5 text-green-600" />
              )}
            </div>
            <div>
              <CardTitle className="text-xl">
                {result.applies
                  ? 'The EU AI Act applies to your organization'
                  : 'The EU AI Act may not apply to your use case'}
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Risk level: <Badge variant={result.riskLevel === 'high' ? 'high' : 'secondary'}>
                  {result.riskLevel}
                </Badge>
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Obligations */}
      {result.obligations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.obligations.map((obligation, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant="outline" className="shrink-0 mt-0.5 text-xs">
                    {obligation.article}
                  </Badge>
                  <span className="text-sm text-slate-700">{obligation.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {result.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Findings</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 mt-0.5',
                      severityColors[finding.severity] || severityColors.info
                    )}
                  >
                    {finding.severity}
                  </span>
                  <span className="text-sm text-slate-700">{finding.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Literacy */}
      {result.literacyRequired && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BookOpen className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">AI Literacy Requirement (Art. 4)</p>
                <p className="text-sm text-blue-700 mt-1">
                  All organizations deploying AI must ensure sufficient AI literacy among staff. This applies regardless of risk level.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Start your compliance journey
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            Classify all your AI tools, track compliance requirements, and demonstrate readiness.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/pricing">
              <Button>
                View Plans <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="secondary" onClick={onRestart}>
              Start Over
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
