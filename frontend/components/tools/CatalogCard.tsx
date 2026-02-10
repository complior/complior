import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RiskBadge } from './RiskBadge';
import type { CatalogTool } from '@/lib/api';

const CATEGORY_LABELS: Record<string, string> = {
  chatbot: 'Chatbot / LLM',
  recruitment: 'Recruiting',
  coding: 'Coding',
  analytics: 'Analytics',
  customer_service: 'Kundenservice',
  marketing: 'Marketing',
  writing: 'Schreiben',
  image_generation: 'Bildgenerierung',
  video: 'Video',
  translation: 'Übersetzung',
  medical: 'Medizin',
  legal: 'Recht',
  finance: 'Finanzen',
  education: 'Bildung',
  other: 'Sonstiges',
};

interface CatalogCardProps {
  tool: CatalogTool;
  onClick: () => void;
}

export function CatalogCard({ tool, onClick }: CatalogCardProps) {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{tool.name}</CardTitle>
          <RiskBadge riskLevel={tool.defaultRiskLevel} />
        </div>
        <p className="text-sm text-slate-500">{tool.vendor}</p>
      </CardHeader>
      <CardContent>
        {tool.description && (
          <p className="mb-3 line-clamp-2 text-sm text-slate-600">
            {tool.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            {CATEGORY_LABELS[tool.category] || tool.category}
          </span>
          {tool.vendorCountry && (
            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {tool.vendorCountry}
            </span>
          )}
          {tool.dataResidency && (
            <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              Daten: {tool.dataResidency}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export { CATEGORY_LABELS };
