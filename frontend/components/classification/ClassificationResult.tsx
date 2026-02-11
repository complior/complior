'use client';

import { RiskBadge } from '@/components/tools/RiskBadge';
import { Button } from '@/components/ui/Button';
import type { ClassifyResult } from '@/lib/api';

interface ClassificationResultProps {
  result: ClassifyResult;
  toolName: string;
  onViewTool: () => void;
  onBackToInventory: () => void;
}

export function ClassificationResult({ result, toolName, onViewTool, onBackToInventory }: ClassificationResultProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Klassifizierungsergebnis</h2>
        <p className="mt-1 text-slate-500">{toolName}</p>
      </div>

      {/* Risk Level Badge */}
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white p-6">
        <RiskBadge riskLevel={result.riskLevel} className="text-lg px-4 py-1.5" />

        {/* Confidence Bar */}
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Konfidenz</span>
            <span>{result.confidence}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </div>

        {result.annexCategory && (
          <p className="text-sm text-slate-600">{result.annexCategory}</p>
        )}
      </div>

      {/* Matched Rules / Reasoning */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">Begründung</h3>
        <ul className="space-y-1">
          {result.matchedRules.map((rule, i) => (
            <li key={i} className="text-sm text-slate-600">
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Article References */}
      {result.articleReferences.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Rechtsgrundlagen</h3>
          <ul className="space-y-1">
            {result.articleReferences.map((ref, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {ref.article}
                </span>
                <span className="text-slate-600">{ref.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Requirements Created */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-center">
        <p className="text-sm text-slate-600">
          <span className="font-semibold">{result.requirementsCreated}</span> Compliance-Anforderungen wurden automatisch zugeordnet.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={onBackToInventory}>Zum Inventar</Button>
        <Button onClick={onViewTool}>Tool-Details ansehen</Button>
      </div>
    </div>
  );
}
