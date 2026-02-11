'use client';

import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

const DATA_TYPES = [
  { value: 'personal', label: 'Personenbezogen', desc: 'Name, E-Mail, Adresse' },
  { value: 'sensitive', label: 'Besonders sensibel', desc: 'Ethnie, Religion, Gewerkschaft' },
  { value: 'biometric', label: 'Biometrisch', desc: 'Gesicht, Fingerabdruck, Stimme' },
  { value: 'health', label: 'Gesundheit', desc: 'Medizinische Daten, Behinderung' },
  { value: 'financial', label: 'Finanziell', desc: 'Kreditdaten, Kontostand, Einkommen' },
];

const AFFECTED_PERSONS = [
  { value: 'employees', label: 'Mitarbeiter' },
  { value: 'customers', label: 'Kunden' },
  { value: 'applicants', label: 'Bewerber' },
  { value: 'patients', label: 'Patienten' },
  { value: 'students', label: 'Schüler/Studenten' },
  { value: 'public', label: 'Allgemeine Öffentlichkeit' },
];

interface Step3Data {
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
}

interface Step3DataProps {
  data: Step3Data;
  onChange: (data: Step3Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step3Data({ data, onChange, onNext, onBack, errors }: Step3DataProps) {
  const toggleItem = (field: 'dataTypes' | 'affectedPersons', value: string) => {
    const current = data[field] as string[];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...data, [field]: next });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schritt 3: Daten & Betroffene</h2>
      <p className="text-sm text-slate-500">Welche Daten verarbeitet das Tool und wer ist betroffen?</p>

      <div className="space-y-4">
        <div>
          <Label>Datentypen *</Label>
          {errors.dataTypes && <p className="mt-1 text-xs text-red-600">{errors.dataTypes[0]}</p>}
          <div className="mt-2 space-y-2">
            {DATA_TYPES.map((dt) => (
              <label
                key={dt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  data.dataTypes.includes(dt.value)
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.dataTypes.includes(dt.value)}
                  onChange={() => toggleItem('dataTypes', dt.value)}
                  className="mt-0.5 rounded border-slate-300"
                />
                <div>
                  <p className="font-medium">{dt.label}</p>
                  <p className="text-xs text-slate-500">{dt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Betroffene Personen *</Label>
          {errors.affectedPersons && <p className="mt-1 text-xs text-red-600">{errors.affectedPersons[0]}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {AFFECTED_PERSONS.map((ap) => (
              <label
                key={ap.value}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  data.affectedPersons.includes(ap.value)
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={data.affectedPersons.includes(ap.value)}
                  onChange={() => toggleItem('affectedPersons', ap.value)}
                  className="sr-only"
                />
                {ap.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={data.vulnerableGroups}
              onChange={(e) => onChange({ ...data, vulnerableGroups: e.target.checked })}
              className="mt-0.5 rounded border-slate-300"
            />
            <div>
              <p className="font-medium">Vulnerable Gruppen betroffen</p>
              <p className="text-xs text-slate-500">Kinder, ältere Menschen, Menschen mit Behinderung oder in wirtschaftlich schwieriger Lage</p>
            </div>
          </label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
        <Button onClick={onNext}>Weiter</Button>
      </div>
    </div>
  );
}
