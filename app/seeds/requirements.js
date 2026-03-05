'use strict';

// ~35 deployer requirements mapped from AI Act Articles 4, 5, 26-27, 50
const requirements = [
  // === Art. 4 — AI Literacy (ALL risk levels, mandatory since 02.02.2025) ===
  {
    code: 'ART_4_LITERACY',
    name: 'AI Literacy (Art. 4)',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 1,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-001'],
    description: 'Providers and deployers of AI systems shall take measures' +
      ' to ensure, to their best extent, a sufficient level of AI' +
      ' literacy of their staff and other persons dealing with the' +
      ' operation and use of AI systems on their behalf.',
    guidance: 'Establish a training programme for all employees who use' +
      ' AI systems. Minimum: AI fundamentals, risks,' +
      ' company-specific usage guidelines.',
    translations: {
      de: {
        name: 'KI-Kompetenz (Art. 4)',
        description: 'Anbieter und Betreiber von KI-Systemen ergreifen' +
          ' Ma\u00dfnahmen, um nach besten Kr\u00e4ften ein ausreichendes' +
          ' Ma\u00df an KI-Kompetenz ihrer Mitarbeiter und anderer Personen' +
          ' sicherzustellen, die in ihrem Auftrag mit dem Betrieb und der' +
          ' Nutzung von KI-Systemen befasst sind.',
        guidance: 'Schulungsprogramm f\u00fcr alle Mitarbeitenden einrichten,' +
          ' die KI-Systeme nutzen. Mindestinhalt: KI-Grundlagen, Risiken,' +
          ' unternehmensspezifische Nutzungsrichtlinien.',
      },
    },
  },
  {
    code: 'ART_4_TRAINING_CEO',
    name: 'AI Literacy: Executive Management',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 2,
    estimatedEffortHours: 1,
    obligationIds: ['eu-ai-act-OBL-001a'],
    description: 'CEOs and board members must have sufficient AI literacy' +
      ' to make strategic decisions regarding AI deployment.',
    guidance: 'Executive course: AI Act overview, risks, liability,' +
      ' budget, responsibilities (30 min).',
    translations: {
      de: {
        name: 'KI-Kompetenz: Gesch\u00e4ftsf\u00fchrung',
        description: 'Gesch\u00e4ftsf\u00fchrer und Vorstandsmitglieder' +
          ' m\u00fcssen \u00fcber ausreichende KI-Kompetenz verf\u00fcgen,' +
          ' um strategische Entscheidungen \u00fcber den KI-Einsatz zu' +
          ' treffen.',
        guidance: 'F\u00fchrungskr\u00e4fte-Kurs: AI Act \u00dcberblick,' +
          ' Risiken, Haftung, Budget, Verantwortlichkeiten (30 Min.).',
      },
    },
  },
  {
    code: 'ART_4_TRAINING_HR',
    name: 'AI Literacy: HR Department',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 3,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-001a'],
    description: 'HR staff must understand AI-specific risks in human' +
      ' resources, especially for high-risk applications' +
      ' (Annex III, Area 4).',
    guidance: 'HR course: High-risk AI in recruiting, applicant management,' +
      ' performance evaluation (45 min).',
    translations: {
      de: {
        name: 'KI-Kompetenz: Personalabteilung',
        description: 'HR-Mitarbeitende m\u00fcssen KI-spezifische Risiken' +
          ' im Personalwesen verstehen, insbesondere bei' +
          ' Hochrisiko-Anwendungen (Anhang III, Bereich 4).',
        guidance: 'HR-Kurs: Hochrisiko-KI in Recruiting,' +
          ' Bewerbermanagement, Leistungsbewertung (45 Min.).',
      },
    },
  },
  {
    code: 'ART_4_TRAINING_DEV',
    name: 'AI Literacy: Developers',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 4,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-001a'],
    description: 'Developers must understand the technical requirements' +
      ' of the AI Act, particularly Art. 26 deployer obligations' +
      ' when integrating AI systems.',
    guidance: 'Developer course: Technical requirements, API integration,' +
      ' monitoring, logging (60 min).',
    translations: {
      de: {
        name: 'KI-Kompetenz: Entwickler',
        description: 'Entwickler m\u00fcssen die technischen Anforderungen' +
          ' des AI Act verstehen, insbesondere die Betreiberpflichten' +
          ' nach Art. 26 bei der Integration von KI-Systemen.',
        guidance: 'Entwickler-Kurs: Technische Anforderungen,' +
          ' API-Integration, Monitoring, Logging (60 Min.).',
      },
    },
  },
  {
    code: 'ART_4_TRAINING_GENERAL',
    name: 'AI Literacy: General Staff',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 5,
    estimatedEffortHours: 1,
    obligationIds: ['eu-ai-act-OBL-001a'],
    description: 'All employees who use AI systems must be able to' +
      ' demonstrate basic AI literacy.',
    guidance: 'General course: AI basics, dos & don\'ts, data protection,' +
      ' reporting obligations (20 min).',
    translations: {
      de: {
        name: 'KI-Kompetenz: Allgemeine Mitarbeitende',
        description: 'Alle Mitarbeitenden, die KI-Systeme nutzen,' +
          ' m\u00fcssen grundlegende KI-Kompetenz nachweisen k\u00f6nnen.',
        guidance: 'Allgemeiner Kurs: KI-Grundlagen, Dos & Don\'ts,' +
          ' Datenschutz, Meldepflichten (20 Min.).',
      },
    },
  },

  // === Art. 5 — Prohibited Practices ===
  {
    code: 'ART_5_PROHIBITED',
    name: 'Review Prohibited AI Practices',
    articleReference: 'Art. 5',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 10,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-002'],
    description: 'Verify that the deployed AI system does not use prohibited' +
      ' practices: social scoring, real-time biometrics (without' +
      ' exception), manipulative/deceptive techniques, exploitation' +
      ' of vulnerabilities.',
    guidance: 'Checklist: No social scoring, no real-time biometrics' +
      ' without authorisation, no manipulative techniques, no' +
      ' exploitation of vulnerable groups.',
    translations: {
      de: {
        name: '\u00dcberpr\u00fcfung verbotener KI-Praktiken',
        description: '\u00dcberpr\u00fcfen Sie, dass das eingesetzte' +
          ' KI-System keine verbotenen Praktiken anwendet: Social Scoring,' +
          ' Echtzeit-Biometrie (ohne Ausnahme), manipulative/t\u00e4uschende' +
          ' Techniken, Ausnutzung von Schwachstellen.',
        guidance: 'Checkliste: Kein Social Scoring, keine' +
          ' Echtzeit-Biometrie ohne Genehmigung, keine manipulativen' +
          ' Techniken, keine Ausnutzung vulnerabler Gruppen.',
      },
    },
  },
  {
    code: 'ART_5_SOCIAL_SCORING',
    name: 'No Social Scoring',
    articleReference: 'Art. 5(1)(c)',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 11,
    estimatedEffortHours: 1,
    obligationIds: ['eu-ai-act-OBL-002c'],
    description: 'Ensure that no AI system is used for the evaluation or' +
      ' classification of natural persons based on their social' +
      ' behaviour.',
    translations: {
      de: {
        name: 'Kein Social Scoring',
        description: 'Stellen Sie sicher, dass kein KI-System zur' +
          ' Bewertung oder Klassifizierung nat\u00fcrlicher Personen auf' +
          ' Grundlage ihres sozialen Verhaltens eingesetzt wird.',
      },
    },
  },
  {
    code: 'ART_5_BIOMETRIC',
    name: 'No Real-Time Biometric Identification',
    articleReference: 'Art. 5(1)(h)',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 12,
    estimatedEffortHours: 1,
    obligationIds: ['eu-ai-act-OBL-002e'],
    description: 'Do not deploy real-time remote biometric identification' +
      ' systems in publicly accessible spaces unless a statutory' +
      ' exception applies.',
    translations: {
      de: {
        name: 'Keine biometrische Echtzeit-Identifizierung',
        description: 'Setzen Sie keine biometrischen' +
          ' Echtzeit-Fernidentifizierungssysteme in \u00f6ffentlich' +
          ' zug\u00e4nglichen R\u00e4umen ein, es sei denn, es liegt eine' +
          ' gesetzliche Ausnahme vor.',
      },
    },
  },

  // === Art. 26 — Deployer Obligations (HIGH RISK) ===
  {
    code: 'ART_26_USAGE',
    name: 'Intended Use Compliance',
    articleReference: 'Art. 26(1)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 20,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-011'],
    description: 'Use high-risk AI systems in accordance with the' +
      ' instructions of use. Take technical and organisational' +
      ' measures to ensure use in line with the intended purpose.',
    guidance: 'Obtain and document the provider\'s instructions of use.' +
      ' Create an internal usage policy.',
    translations: {
      de: {
        name: 'Bestimmungsgem\u00e4\u00dfe Verwendung',
        description: 'Hochrisiko-KI-Systeme gem\u00e4\u00df der' +
          ' Gebrauchsanweisung verwenden. Technische und organisatorische' +
          ' Ma\u00dfnahmen ergreifen, um die bestimmungsgem\u00e4\u00dfe' +
          ' Nutzung sicherzustellen.',
        guidance: 'Gebrauchsanweisung des Anbieters beschaffen und' +
          ' dokumentieren. Interne Nutzungsrichtlinie erstellen.',
      },
    },
  },
  {
    code: 'ART_26_OVERSIGHT',
    name: 'Ensure Human Oversight',
    articleReference: 'Art. 26(2)',
    riskLevel: 'high',
    category: 'human_oversight',
    sortOrder: 21,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-008'],
    description: 'Assign natural persons with the necessary competence,' +
      ' training, and authority for human oversight.',
    guidance: 'Designate responsible person(s). Document training.' +
      ' Document authority to intervene/shut down.',
    translations: {
      de: {
        name: 'Menschliche Aufsicht sicherstellen',
        description: 'Nat\u00fcrliche Personen mit der erforderlichen' +
          ' Kompetenz, Ausbildung und Befugnis f\u00fcr die menschliche' +
          ' Aufsicht benennen.',
        guidance: 'Verantwortliche Person(en) benennen. Schulung' +
          ' dokumentieren. Befugnis zum Eingreifen/Abschalten' +
          ' dokumentieren.',
      },
    },
  },
  {
    code: 'ART_26_INPUT_DATA',
    name: 'Ensure Input Data Relevance',
    articleReference: 'Art. 26(4)',
    riskLevel: 'high',
    category: 'data_governance',
    sortOrder: 22,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-011b'],
    description: 'Ensure that input data is relevant and sufficiently' +
      ' representative with regard to the intended purpose of' +
      ' the high-risk AI system.',
    guidance: 'Document input data. Establish quality checks.' +
      ' Perform bias assessments.',
    translations: {
      de: {
        name: 'Relevanz der Eingabedaten sicherstellen',
        description: 'Sicherstellen, dass die Eingabedaten in Bezug auf' +
          ' den Verwendungszweck des Hochrisiko-KI-Systems relevant und' +
          ' hinreichend repr\u00e4sentativ sind.',
        guidance: 'Eingabedaten dokumentieren. Qualit\u00e4tspr\u00fcfungen' +
          ' einrichten. Bias-Bewertungen durchf\u00fchren.',
      },
    },
  },
  {
    code: 'ART_26_MONITORING',
    name: 'Operational Monitoring',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'monitoring',
    sortOrder: 23,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-009'],
    description: 'Monitor the operation of the high-risk AI system based' +
      ' on the instructions of use. When a risk is identified,' +
      ' inform the provider and the competent authority.',
    guidance: 'Create a monitoring plan. Define KPIs.' +
      ' Document the escalation process.',
    translations: {
      de: {
        name: 'Betriebs\u00fcberwachung',
        description: 'Den Betrieb des Hochrisiko-KI-Systems auf Grundlage' +
          ' der Gebrauchsanweisung \u00fcberwachen. Bei erkanntem Risiko' +
          ' den Anbieter und die zust\u00e4ndige Beh\u00f6rde informieren.',
        guidance: '\u00dcberwachungsplan erstellen. KPIs definieren.' +
          ' Eskalationsprozess dokumentieren.',
      },
    },
  },
  {
    code: 'ART_26_LOGS',
    name: 'Retain Automatic Logs',
    articleReference: 'Art. 26(6)',
    riskLevel: 'high',
    category: 'record_keeping',
    sortOrder: 24,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-006', 'eu-ai-act-OBL-011d'],
    description: 'Retain the automatically generated logs of the' +
      ' high-risk AI system for at least six months, unless' +
      ' applicable law provides otherwise.',
    guidance: 'Configure log retention (min. 6 months).' +
      ' Set up access protection for logs.',
    translations: {
      de: {
        name: 'Automatische Protokolle aufbewahren',
        description: 'Die automatisch erzeugten Protokolle des' +
          ' Hochrisiko-KI-Systems mindestens sechs Monate aufbewahren,' +
          ' sofern das geltende Recht nichts anderes vorsieht.',
        guidance: 'Protokollaufbewahrung konfigurieren (mind. 6 Monate).' +
          ' Zugriffsschutz f\u00fcr Protokolle einrichten.',
      },
    },
  },
  {
    code: 'ART_26_INFORM_WORKERS',
    name: 'Inform Worker Representatives',
    articleReference: 'Art. 26(7)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 25,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-012'],
    description: 'Inform worker representatives and affected workers that' +
      ' they will be subject to the use of a high-risk AI system.',
    guidance: 'Inform works council / worker representatives in writing.' +
      ' Notify employees before deployment.',
    translations: {
      de: {
        name: 'Arbeitnehmervertreter informieren',
        description: 'Arbeitnehmervertreter und betroffene Arbeitnehmer' +
          ' dar\u00fcber informieren, dass sie der Nutzung eines' +
          ' Hochrisiko-KI-Systems ausgesetzt sein werden.',
        guidance: 'Betriebsrat/Arbeitnehmervertreter schriftlich' +
          ' informieren. Mitarbeitende vor dem Einsatz benachrichtigen.',
      },
    },
  },
  {
    code: 'ART_26_DPIA',
    name: 'Data Protection Impact Assessment',
    articleReference: 'Art. 26(9)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 26,
    estimatedEffortHours: 16,
    description: 'Where applicable, carry out a data protection impact' +
      ' assessment pursuant to Art. 35 GDPR, using the' +
      ' information provided by the AI provider.',
    guidance: 'Conduct DPIA (if personal data is processed).' +
      ' Document the result.',
    translations: {
      de: {
        name: 'Datenschutz-Folgenabsch\u00e4tzung',
        description: 'Gegebenenfalls eine' +
          ' Datenschutz-Folgenabsch\u00e4tzung gem\u00e4\u00df Art. 35' +
          ' DSGVO durchf\u00fchren, unter Verwendung der vom KI-Anbieter' +
          ' bereitgestellten Informationen.',
        guidance: 'DSFA durchf\u00fchren (bei Verarbeitung' +
          ' personenbezogener Daten). Ergebnis dokumentieren.',
      },
    },
  },
  {
    code: 'ART_26_REGISTRATION',
    name: 'EU Database Registration',
    articleReference: 'Art. 26(8)',
    riskLevel: 'high',
    category: 'registration',
    sortOrder: 27,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-014'],
    description: 'Before putting the high-risk AI system into use,' +
      ' register yourself and the system in the EU database' +
      ' pursuant to Art. 71.',
    guidance: 'Complete registration in the EU AI database.' +
      ' Document the registration number.',
    translations: {
      de: {
        name: 'EU-Datenbankregistrierung',
        description: 'Sich und das System vor Inbetriebnahme des' +
          ' Hochrisiko-KI-Systems in der EU-Datenbank gem\u00e4\u00df' +
          ' Art. 71 registrieren.',
        guidance: 'Registrierung in der EU-KI-Datenbank abschlie\u00dfen.' +
          ' Registrierungsnummer dokumentieren.',
      },
    },
  },
  {
    code: 'ART_26_COOPERATION',
    name: 'Authority Cooperation',
    articleReference: 'Art. 26(11)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 28,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-025'],
    description: 'Cooperate with the competent national authorities on' +
      ' any action taken by those authorities in connection with' +
      ' the high-risk AI system.',
    guidance: 'Designate a contact person for authority requests.' +
      ' Define a process for information provision.',
    translations: {
      de: {
        name: 'Beh\u00f6rdenkooperation',
        description: 'Mit den zust\u00e4ndigen nationalen Beh\u00f6rden' +
          ' bei allen Ma\u00dfnahmen im Zusammenhang mit dem' +
          ' Hochrisiko-KI-System kooperieren.',
        guidance: 'Ansprechperson f\u00fcr Beh\u00f6rdenanfragen benennen.' +
          ' Verfahren zur Informationsbereitstellung definieren.',
      },
    },
  },
  {
    code: 'ART_26_INCIDENT',
    name: 'Incident Reporting',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'monitoring',
    sortOrder: 29,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-031'],
    description: 'In the event of a serious incident, immediately inform' +
      ' the provider and the competent market surveillance' +
      ' authority.',
    guidance: 'Establish an incident response process.' +
      ' Define reporting channels to the provider and authority.',
    translations: {
      de: {
        name: 'Vorfallmeldung',
        description: 'Bei einem schwerwiegenden Vorfall unverz\u00fcglich' +
          ' den Anbieter und die zust\u00e4ndige' +
          ' Markt\u00fcberwachungsbeh\u00f6rde informieren.',
        guidance: 'Incident-Response-Prozess einrichten. Meldekan\u00e4le' +
          ' zum Anbieter und zur Beh\u00f6rde definieren.',
      },
    },
  },
  {
    code: 'ART_26_CEASE',
    name: 'Cease Use When Risk Identified',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 30,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-011c'],
    description: 'Cease use of the AI system if the deployer has reason to' +
      ' believe that the use presents a risk.',
    guidance: 'Define an emergency process for immediate shutdown.' +
      ' Designate a responsible person.',
    translations: {
      de: {
        name: 'Nutzung bei erkanntem Risiko einstellen',
        description: 'Die Nutzung des KI-Systems einstellen, wenn der' +
          ' Betreiber Grund zur Annahme hat, dass die Nutzung ein' +
          ' Risiko darstellt.',
        guidance: 'Notfallprozess f\u00fcr sofortige Abschaltung' +
          ' definieren. Verantwortliche Person benennen.',
      },
    },
  },

  // === Art. 27 — FRIA (HIGH RISK) ===
  {
    code: 'ART_27_FRIA',
    name: 'Fundamental Rights Impact Assessment (FRIA)',
    articleReference: 'Art. 27',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 40,
    estimatedEffortHours: 24,
    obligationIds: ['eu-ai-act-OBL-013'],
    description: 'Before putting the system into use, carry out an' +
      ' assessment of the impact on fundamental rights.' +
      ' Applies to: public bodies, operators of private services' +
      ' (credit scoring, insurance).',
    guidance: 'Create a FRIA with 6 sections: General, Affected Persons,' +
      ' Specific Risks, Human Oversight,' +
      ' Mitigation Measures, Monitoring Plan.',
    translations: {
      de: {
        name: 'Grundrechte-Folgenabsch\u00e4tzung (FRIA)',
        description: 'Vor Inbetriebnahme des Systems eine Bewertung der' +
          ' Auswirkungen auf die Grundrechte durchf\u00fchren. Gilt' +
          ' f\u00fcr: \u00f6ffentliche Stellen, Betreiber privater' +
          ' Dienste (Kreditscoring, Versicherung).',
        guidance: 'FRIA mit 6 Abschnitten erstellen: Allgemeines,' +
          ' Betroffene Personen, Spezifische Risiken, Menschliche' +
          ' Aufsicht, Abhilfema\u00dfnahmen, \u00dcberwachungsplan.',
      },
    },
  },
  {
    code: 'ART_27_AFFECTED_PERSONS',
    name: 'FRIA: Identify Affected Persons',
    articleReference: 'Art. 27(1)(a)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 41,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-013a'],
    description: 'Identify the groups of natural persons and groups of' +
      ' persons likely to be affected by the use of the AI system.',
    translations: {
      de: {
        name: 'FRIA: Betroffene Personen identifizieren',
        description: 'Die Gruppen nat\u00fcrlicher Personen und' +
          ' Personengruppen identifizieren, die von der Nutzung des' +
          ' KI-Systems voraussichtlich betroffen sind.',
      },
    },
  },
  {
    code: 'ART_27_SPECIFIC_RISKS',
    name: 'FRIA: Assess Specific Risks',
    articleReference: 'Art. 27(1)(b)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 42,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-013b'],
    description: 'Assess the specific risks to the fundamental rights of' +
      ' the affected persons, including the risk of discrimination.',
    translations: {
      de: {
        name: 'FRIA: Spezifische Risiken bewerten',
        description: 'Die spezifischen Risiken f\u00fcr die Grundrechte' +
          ' der betroffenen Personen bewerten, einschlie\u00dflich des' +
          ' Diskriminierungsrisikos.',
      },
    },
  },
  {
    code: 'ART_27_OVERSIGHT_MEASURES',
    name: 'FRIA: Describe Oversight Measures',
    articleReference: 'Art. 27(1)(c)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 43,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-013c'],
    description: 'Describe the human oversight measures taken to mitigate' +
      ' the identified risks.',
    translations: {
      de: {
        name: 'FRIA: Aufsichtsma\u00dfnahmen beschreiben',
        description: 'Die menschlichen Aufsichtsma\u00dfnahmen beschreiben,' +
          ' die zur Minderung der identifizierten Risiken ergriffen werden.',
      },
    },
  },
  {
    code: 'ART_27_MITIGATION',
    name: 'FRIA: Risk Mitigation Measures',
    articleReference: 'Art. 27(1)(d)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 44,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-013d'],
    description: 'Take appropriate measures to mitigate the identified' +
      ' risks. Define responsibilities and timelines.',
    translations: {
      de: {
        name: 'FRIA: Risikominderungsma\u00dfnahmen',
        description: 'Geeignete Ma\u00dfnahmen zur Minderung der' +
          ' identifizierten Risiken ergreifen. Verantwortlichkeiten und' +
          ' Zeitpl\u00e4ne festlegen.',
      },
    },
  },
  {
    code: 'ART_27_NOTIFY_AUTHORITY',
    name: 'FRIA: Notify Market Surveillance Authority',
    articleReference: 'Art. 27(3)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 45,
    estimatedEffortHours: 2,
    description: 'Inform the competent market surveillance authority of' +
      ' the FRIA results and submit the completed form via the' +
      ' EU database.',
    translations: {
      de: {
        name: 'FRIA: Markt\u00fcberwachungsbeh\u00f6rde benachrichtigen',
        description: 'Die zust\u00e4ndige' +
          ' Markt\u00fcberwachungsbeh\u00f6rde \u00fcber die' +
          ' FRIA-Ergebnisse informieren und das ausgef\u00fcllte Formular' +
          ' \u00fcber die EU-Datenbank einreichen.',
      },
    },
  },

  // === Art. 50 — Transparency (LIMITED + HIGH) ===
  {
    code: 'ART_50_TRANSPARENCY',
    name: 'Transparency Obligations',
    articleReference: 'Art. 50',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 50,
    estimatedEffortHours: 4,
    obligationIds: ['eu-ai-act-OBL-024'],
    description: 'Inform users that they are interacting with an AI system' +
      ' (chatbots, deepfakes, emotion recognition, biometric' +
      ' categorisation).',
    guidance: 'Implement AI labelling. Inform users before interaction.' +
      ' Place transparency notices visibly.',
    translations: {
      de: {
        name: 'Transparenzpflichten',
        description: 'Nutzer dar\u00fcber informieren, dass sie mit einem' +
          ' KI-System interagieren (Chatbots, Deepfakes,' +
          ' Emotionserkennung, biometrische Kategorisierung).',
        guidance: 'KI-Kennzeichnung implementieren. Nutzer vor der' +
          ' Interaktion informieren. Transparenzhinweise sichtbar' +
          ' platzieren.',
      },
    },
  },
  {
    code: 'ART_50_CHATBOT',
    name: 'Chatbot Disclosure',
    articleReference: 'Art. 50(1)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 51,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-015'],
    description: 'Ensure that natural persons are informed that they are' +
      ' interacting with an AI system, unless this is obvious' +
      ' from the circumstances.',
    translations: {
      de: {
        name: 'Chatbot-Offenlegung',
        description: 'Sicherstellen, dass nat\u00fcrliche Personen' +
          ' dar\u00fcber informiert werden, dass sie mit einem KI-System' +
          ' interagieren, es sei denn, dies ergibt sich offensichtlich' +
          ' aus den Umst\u00e4nden.',
      },
    },
  },
  {
    code: 'ART_50_DEEPFAKE',
    name: 'Deepfake Labelling',
    articleReference: 'Art. 50(4)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 52,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-016', 'eu-ai-act-OBL-018'],
    description: 'Label AI-generated or manipulated image, audio, or video' +
      ' content as such (machine-readable and user-recognisable).',
    translations: {
      de: {
        name: 'Deepfake-Kennzeichnung',
        description: 'KI-generierte oder manipulierte Bild-, Audio- oder' +
          ' Videoinhalte als solche kennzeichnen (maschinenlesbar und' +
          ' f\u00fcr den Nutzer erkennbar).',
      },
    },
  },
  {
    code: 'ART_50_EMOTION',
    name: 'Emotion Recognition Disclosure',
    articleReference: 'Art. 50(3)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 53,
    estimatedEffortHours: 2,
    obligationIds: ['eu-ai-act-OBL-017'],
    description: 'Inform affected persons about the use of an emotion' +
      ' recognition system or biometric categorisation system.',
    translations: {
      de: {
        name: 'Offenlegung Emotionserkennung',
        description: 'Betroffene Personen \u00fcber die Nutzung eines' +
          ' Emotionserkennungssystems oder biometrischen' +
          ' Kategorisierungssystems informieren.',
      },
    },
  },
  {
    code: 'ART_50_AI_GENERATED_TEXT',
    name: 'AI-Generated Text Labelling',
    articleReference: 'Art. 50(2)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 54,
    estimatedEffortHours: 2,
    description: 'Label text generated by AI systems that is published for' +
      ' informational purposes as machine-generated.',
    translations: {
      de: {
        name: 'Kennzeichnung KI-generierter Texte',
        description: 'Von KI-Systemen erzeugte Texte, die zu' +
          ' Informationszwecken ver\u00f6ffentlicht werden, als' +
          ' maschinell erzeugt kennzeichnen.',
      },
    },
  },

  // === Additional Deployer Obligations ===
  {
    code: 'ART_26_RISK_MGMT_SUPPORT',
    name: 'Support Risk Management',
    articleReference: 'Art. 26(1)',
    riskLevel: 'high',
    category: 'risk_management',
    sortOrder: 60,
    estimatedEffortHours: 8,
    obligationIds: ['eu-ai-act-OBL-029'],
    description: 'Complement and support the risk management system' +
      ' established by the provider with your own measures.',
    guidance: 'Conduct your own risk assessment. Plan regular reviews.' +
      ' Maintain documentation.',
    translations: {
      de: {
        name: 'Risikomanagement unterst\u00fctzen',
        description: 'Das vom Anbieter eingerichtete' +
          ' Risikomanagementsystem mit eigenen Ma\u00dfnahmen' +
          ' erg\u00e4nzen und unterst\u00fctzen.',
        guidance: 'Eigene Risikobewertung durchf\u00fchren.' +
          ' Regelm\u00e4\u00dfige \u00dcberpr\u00fcfungen planen.' +
          ' Dokumentation pflegen.',
      },
    },
  },
  {
    code: 'ART_26_POST_MARKET',
    name: 'Support Post-Market Monitoring',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'post_market_monitoring',
    sortOrder: 61,
    estimatedEffortHours: 4,
    description: 'Support the provider in post-market monitoring,' +
      ' particularly by providing information about any' +
      ' issues encountered.',
    guidance: 'Establish a feedback process with the provider.' +
      ' Systematically report anomalies.',
    translations: {
      de: {
        name: 'Post-Market-Monitoring unterst\u00fctzen',
        description: 'Den Anbieter bei der Markt\u00fcberwachung nach dem' +
          ' Inverkehrbringen unterst\u00fctzen, insbesondere durch' +
          ' Bereitstellung von Informationen \u00fcber aufgetretene' +
          ' Probleme.',
        guidance: 'Feedbackprozess mit dem Anbieter einrichten. Anomalien' +
          ' systematisch melden.',
      },
    },
  },
];

module.exports = requirements;
