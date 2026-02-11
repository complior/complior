'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

interface Step1Data {
  name: string;
  vendorName: string;
  vendorCountry: string;
  vendorUrl: string;
  description: string;
}

interface Step1ToolProps {
  data: Step1Data;
  onChange: (data: Step1Data) => void;
  onNext: () => void;
  errors: Record<string, string[]>;
}

export function Step1Tool({ data, onChange, onNext, errors }: Step1ToolProps) {
  const update = (field: keyof Step1Data, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schritt 1: Tool-Informationen</h2>
      <p className="text-sm text-slate-500">Grundlegende Informationen zum AI Tool.</p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="z.B. ChatGPT, HireVue, Copilot..."
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name[0]}</p>}
        </div>

        <div>
          <Label htmlFor="vendorName">Anbieter *</Label>
          <Input
            id="vendorName"
            value={data.vendorName}
            onChange={(e) => update('vendorName', e.target.value)}
            placeholder="z.B. OpenAI, Microsoft, SAP..."
          />
          {errors.vendorName && <p className="mt-1 text-xs text-red-600">{errors.vendorName[0]}</p>}
        </div>

        <div>
          <Label htmlFor="vendorCountry">Land des Anbieters</Label>
          <Input
            id="vendorCountry"
            value={data.vendorCountry}
            onChange={(e) => update('vendorCountry', e.target.value.toUpperCase().slice(0, 2))}
            placeholder="z.B. US, DE, FR"
            maxLength={2}
          />
        </div>

        <div>
          <Label htmlFor="vendorUrl">Website des Anbieters</Label>
          <Input
            id="vendorUrl"
            value={data.vendorUrl}
            onChange={(e) => update('vendorUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div>
          <Label htmlFor="description">Beschreibung</Label>
          <textarea
            id="description"
            value={data.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Kurze Beschreibung des AI Tools..."
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onNext}>Weiter</Button>
      </div>
    </div>
  );
}
