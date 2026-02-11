'use client';

import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';

const DOMAINS = [
  { value: 'biometrics', label: 'Biometrie', desc: 'Gesichtserkennung, Fingerabdruck, Stimmerkennung' },
  { value: 'critical_infrastructure', label: 'Kritische Infrastruktur', desc: 'Energie, Wasser, Verkehr, Telekommunikation' },
  { value: 'education', label: 'Bildung', desc: 'Schulen, Universitäten, Weiterbildung' },
  { value: 'employment', label: 'Beschäftigung', desc: 'Recruiting, Personalmanagement, Leistungsbewertung' },
  { value: 'essential_services', label: 'Grundlegende Dienste', desc: 'Kreditscoring, Versicherung, Sozialleistungen' },
  { value: 'law_enforcement', label: 'Strafverfolgung', desc: 'Polizei, Ermittlung, Überwachung' },
  { value: 'migration', label: 'Migration', desc: 'Grenzschutz, Visum, Asyl' },
  { value: 'justice', label: 'Justiz', desc: 'Gerichte, Wahlen, demokratische Prozesse' },
  { value: 'customer_service', label: 'Kundenservice', desc: 'Chatbots, Support, Beschwerdemanagement' },
  { value: 'marketing', label: 'Marketing', desc: 'Werbung, Personalisierung, Content' },
  { value: 'coding', label: 'Softwareentwicklung', desc: 'Code-Generierung, Testing, DevOps' },
  { value: 'analytics', label: 'Analytik', desc: 'Datenanalyse, Business Intelligence, Reporting' },
  { value: 'other', label: 'Sonstiges', desc: 'Andere Anwendungsbereiche' },
];

interface Step2Data {
  purpose: string;
  domain: string;
}

interface Step2UsageProps {
  data: Step2Data;
  onChange: (data: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
  errors: Record<string, string[]>;
}

export function Step2Usage({ data, onChange, onNext, onBack, errors }: Step2UsageProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schritt 2: Verwendungszweck</h2>
      <p className="text-sm text-slate-500">Wie wird das AI Tool in Ihrer Organisation eingesetzt?</p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="purpose">Verwendungszweck *</Label>
          <textarea
            id="purpose"
            value={data.purpose}
            onChange={(e) => onChange({ ...data, purpose: e.target.value })}
            placeholder="Beschreiben Sie, wofür Ihre Organisation dieses AI Tool einsetzt..."
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          />
          {errors.purpose && <p className="mt-1 text-xs text-red-600">{errors.purpose[0]}</p>}
        </div>

        <div>
          <Label>Anwendungsbereich *</Label>
          {errors.domain && <p className="mt-1 text-xs text-red-600">{errors.domain[0]}</p>}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DOMAINS.map((d) => (
              <label
                key={d.value}
                className={`flex cursor-pointer rounded-md border p-3 text-sm transition-colors ${
                  data.domain === d.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="domain"
                  value={d.value}
                  checked={data.domain === d.value}
                  onChange={(e) => onChange({ ...data, domain: e.target.value })}
                  className="sr-only"
                />
                <div>
                  <p className="font-medium">{d.label}</p>
                  <p className="text-xs text-slate-500">{d.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
        <Button onClick={onNext}>Weiter</Button>
      </div>
    </div>
  );
}
