'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface RevenueInputProps {
  value: number;
  onChange: (value: number) => void;
}

const formatter = new Intl.NumberFormat('de-DE');

export function RevenueInput({ value, onChange }: RevenueInputProps) {
  const [display, setDisplay] = useState(value > 0 ? formatter.format(value) : '');

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, '');
      if (raw === '') {
        setDisplay('');
        onChange(0);
        return;
      }
      const num = parseInt(raw, 10);
      if (!isNaN(num)) {
        setDisplay(formatter.format(num));
        onChange(num);
      }
    },
    [onChange]
  );

  return (
    <div>
      <Label htmlFor="revenue" className="text-sm font-medium text-slate-700">
        Annual Global Revenue
      </Label>
      <div className="relative mt-1.5">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
          €
        </span>
        <Input
          id="revenue"
          type="text"
          inputMode="numeric"
          placeholder="e.g. 10,000,000"
          value={display}
          onChange={handleChange}
          className="pl-8"
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-500">
        Enter your company&apos;s annual global turnover in euros
      </p>
    </div>
  );
}
