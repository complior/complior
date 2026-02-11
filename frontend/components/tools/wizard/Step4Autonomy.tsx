'use client';

import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

const AUTONOMY_LEVELS = [
  {
    value: 'advisory',
    label: 'Beratend',
    desc: 'AI gibt Empfehlungen, Menschen treffen die endgültige Entscheidung',
  },
  {
    value: 'semi_autonomous',
    label: 'Teilautonom',
    desc: 'AI trifft Entscheidungen mit menschlicher Überprüfung/Genehmigung',
  },
  {
    value: 'autonomous',
    label: 'Autonom',
    desc: 'AI trifft und führt Entscheidungen ohne menschliche Freigabe aus',
  },
];

interface Step4Data {
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
}

interface Step4AutonomyProps {
  data: Step4Data;
  onChange: (data: Step4Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step4Autonomy({ data, onChange, onNext, onBack, errors }: Step4AutonomyProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schritt 4: Autonomie & Aufsicht</h2>
      <p className="text-sm text-slate-500">Wie autonom arbeitet das AI Tool und welche Aufsicht besteht?</p>

      <div className="space-y-4">
        <div>
          <Label>Autonomiestufe *</Label>
          {errors.autonomyLevel && <p className="mt-1 text-xs text-red-600">{errors.autonomyLevel[0]}</p>}
          <div className="mt-2 space-y-2">
            {AUTONOMY_LEVELS.map((al) => (
              <label
                key={al.value}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm transition-colors ${
                  data.autonomyLevel === al.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="autonomyLevel"
                  value={al.value}
                  checked={data.autonomyLevel === al.value}
                  onChange={(e) => onChange({ ...data, autonomyLevel: e.target.value })}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium">{al.label}</p>
                  <p className="text-xs text-slate-500">{al.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={data.humanOversight}
              onChange={(e) => onChange({ ...data, humanOversight: e.target.checked })}
              className="mt-0.5 rounded border-slate-300"
            />
            <div>
              <p className="font-medium">Menschliche Aufsicht vorhanden</p>
              <p className="text-xs text-slate-500">Es gibt benannte Personen, die die AI-Ergebnisse prüfen und bei Bedarf eingreifen können</p>
            </div>
          </label>
        </div>

        <div>
          <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm cursor-pointer hover:border-slate-300">
            <input
              type="checkbox"
              checked={data.affectsNaturalPersons}
              onChange={(e) => onChange({ ...data, affectsNaturalPersons: e.target.checked })}
              className="mt-0.5 rounded border-slate-300"
            />
            <div>
              <p className="font-medium">Betrifft natürliche Personen</p>
              <p className="text-xs text-slate-500">Die Ergebnisse des AI Tools haben direkte Auswirkungen auf einzelne Personen</p>
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
