'use client';

import { Button } from '@/components/ui/Button';

const DOMAIN_LABELS: Record<string, string> = {
  biometrics: 'Biometrie',
  critical_infrastructure: 'Kritische Infrastruktur',
  education: 'Bildung',
  employment: 'Beschäftigung',
  essential_services: 'Grundlegende Dienste',
  law_enforcement: 'Strafverfolgung',
  migration: 'Migration',
  justice: 'Justiz',
  customer_service: 'Kundenservice',
  marketing: 'Marketing',
  coding: 'Softwareentwicklung',
  analytics: 'Analytik',
  other: 'Sonstiges',
};

const DATA_TYPE_LABELS: Record<string, string> = {
  personal: 'Personenbezogen',
  sensitive: 'Besonders sensibel',
  biometric: 'Biometrisch',
  health: 'Gesundheit',
  financial: 'Finanziell',
};

const PERSON_LABELS: Record<string, string> = {
  employees: 'Mitarbeiter',
  customers: 'Kunden',
  applicants: 'Bewerber',
  patients: 'Patienten',
  students: 'Schüler/Studenten',
  public: 'Allgemeine Öffentlichkeit',
};

const AUTONOMY_LABELS: Record<string, string> = {
  advisory: 'Beratend',
  semi_autonomous: 'Teilautonom',
  autonomous: 'Autonom',
};

interface WizardData {
  name: string;
  vendorName: string;
  vendorCountry: string;
  vendorUrl: string;
  description: string;
  purpose: string;
  domain: string;
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
}

interface Step5ReviewProps {
  data: WizardData;
  onBack: () => void;
  onClassify: () => void;
  classifying: boolean;
}

export function Step5Review({ data, onBack, onClassify, classifying }: Step5ReviewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Schritt 5: Zusammenfassung</h2>
      <p className="text-sm text-slate-500">Prüfen Sie alle Angaben vor der Klassifizierung.</p>

      <div className="space-y-4">
        <Section title="Tool-Informationen">
          <Row label="Name" value={data.name} />
          <Row label="Anbieter" value={data.vendorName} />
          {data.vendorCountry && <Row label="Land" value={data.vendorCountry} />}
          {data.vendorUrl && <Row label="Website" value={data.vendorUrl} />}
          {data.description && <Row label="Beschreibung" value={data.description} />}
        </Section>

        <Section title="Verwendungszweck">
          <Row label="Zweck" value={data.purpose} />
          <Row label="Bereich" value={DOMAIN_LABELS[data.domain] || data.domain} />
        </Section>

        <Section title="Daten & Betroffene">
          <Row label="Datentypen" value={data.dataTypes.map((d) => DATA_TYPE_LABELS[d] || d).join(', ')} />
          <Row label="Betroffene" value={data.affectedPersons.map((p) => PERSON_LABELS[p] || p).join(', ')} />
          <Row label="Vulnerable Gruppen" value={data.vulnerableGroups ? 'Ja' : 'Nein'} />
        </Section>

        <Section title="Autonomie & Aufsicht">
          <Row label="Autonomiestufe" value={AUTONOMY_LABELS[data.autonomyLevel] || data.autonomyLevel} />
          <Row label="Menschliche Aufsicht" value={data.humanOversight ? 'Ja' : 'Nein'} />
          <Row label="Betrifft nat. Personen" value={data.affectsNaturalPersons ? 'Ja' : 'Nein'} />
        </Section>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="secondary" onClick={onBack}>Zurück</Button>
        <Button onClick={onClassify} disabled={classifying}>
          {classifying ? 'Klassifizierung...' : 'Jetzt klassifizieren'}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <dt className="w-40 shrink-0 text-slate-500">{label}</dt>
      <dd className="text-slate-900">{value || '—'}</dd>
    </div>
  );
}
