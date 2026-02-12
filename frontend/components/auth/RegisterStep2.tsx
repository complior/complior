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
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'legal', label: 'Legal' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
];

const SIZES = [
  { value: 'micro_1_9', label: '1–9 employees' },
  { value: 'small_10_49', label: '10–49 employees' },
  { value: 'medium_50_249', label: '50–249 employees' },
  { value: 'large_250_plus', label: '250+ employees' },
];

const COUNTRIES = [
  { value: 'DE', label: 'Germany' },
  { value: 'AT', label: 'Austria' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'PL', label: 'Poland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'IE', label: 'Ireland' },
  { value: 'PT', label: 'Portugal' },
  { value: 'CZ', label: 'Czech Republic' },
  { value: 'RO', label: 'Romania' },
  { value: 'LU', label: 'Luxembourg' },
  { value: 'OTHER', label: 'Other' },
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

  const selectClassName = 'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="companyName">Company Name</Label>
        <Input
          id="companyName"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          required
          placeholder="Acme Corp"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className={selectClassName}
        >
          {INDUSTRIES.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="size">Company Size</Label>
        <select
          id="size"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          className={selectClassName}
        >
          {SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <select
          id="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className={selectClassName}
        >
          {COUNTRIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Set Up Company'}
      </Button>

      <button
        type="button"
        onClick={onSkip}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
      >
        Set up later
      </button>
    </form>
  );
}
