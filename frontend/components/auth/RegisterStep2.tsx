'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

const INDUSTRIES = [
  { value: 'fintech', label: 'FinTech' },
  { value: 'hrtech', label: 'HR Tech' },
  { value: 'healthtech', label: 'HealthTech' },
  { value: 'edtech', label: 'EdTech' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'manufacturing', label: 'Fertigung' },
  { value: 'logistics', label: 'Logistik' },
  { value: 'legal', label: 'Recht' },
  { value: 'insurance', label: 'Versicherung' },
  { value: 'other', label: 'Sonstiges' },
];

const SIZES = [
  { value: 'micro_1_9', label: '1-9 Mitarbeiter' },
  { value: 'small_10_49', label: '10-49 Mitarbeiter' },
  { value: 'medium_50_249', label: '50-249 Mitarbeiter' },
  { value: 'large_250_plus', label: '250+ Mitarbeiter' },
];

const COUNTRIES = [
  { value: 'DE', label: 'Deutschland' },
  { value: 'AT', label: 'Österreich' },
  { value: 'CH', label: 'Schweiz' },
];

interface RegisterStep2Props {
  onSubmit: (data: {
    companyName: string;
    industry: string;
    size: string;
    country: string;
  }) => Promise<void>;
  onSkip: () => void;
  error: string | null;
  loading: boolean;
}

export function RegisterStep2({ onSubmit, onSkip, error, loading }: RegisterStep2Props) {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('other');
  const [size, setSize] = useState('micro_1_9');
  const [country, setCountry] = useState('DE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ companyName, industry, size, country });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Unternehmen</Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          placeholder="Mein Unternehmen GmbH"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Branche</Label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="size">Unternehmensgröße</Label>
        <select
          id="size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Land</Label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Wird gespeichert...' : 'Unternehmen einrichten'}
      </Button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
      >
        Später einrichten
      </button>
    </form>
  );
}
