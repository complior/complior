'use client';

import { ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { RiskBadge } from './RiskBadge';
import { CATEGORY_LABELS } from './CatalogCard';
import type { CatalogTool } from '@/lib/api';

interface CatalogDetailDialogProps {
  tool: CatalogTool | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CatalogDetailDialog({ tool, open, onOpenChange }: CatalogDetailDialogProps) {
  if (!tool) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle>{tool.name}</DialogTitle>
              <DialogDescription>{tool.vendor}</DialogDescription>
            </div>
            <RiskBadge riskLevel={tool.defaultRiskLevel} />
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {tool.description && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-900">Beschreibung</h4>
              <p className="text-sm text-slate-600">{tool.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-900">Kategorie</h4>
              <p className="text-sm text-slate-600">{CATEGORY_LABELS[tool.category] || tool.category}</p>
            </div>
            {tool.vendorCountry && (
              <div>
                <h4 className="mb-1 text-sm font-medium text-slate-900">Herkunftsland</h4>
                <p className="text-sm text-slate-600">{tool.vendorCountry}</p>
              </div>
            )}
            {tool.dataResidency && (
              <div>
                <h4 className="mb-1 text-sm font-medium text-slate-900">Datenspeicherort</h4>
                <p className="text-sm text-slate-600">{tool.dataResidency}</p>
              </div>
            )}
          </div>

          {tool.domains && tool.domains.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium text-slate-900">Einsatzbereiche (Annex III)</h4>
              <div className="flex flex-wrap gap-1.5">
                {tool.domains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {domain.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tool.websiteUrl && (
            <div className="pt-2">
              <a
                href={tool.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Website besuchen
                </Button>
              </a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
