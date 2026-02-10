'use strict';

// ~35 deployer requirements mapped from AI Act Articles 4, 5, 26-27, 50
// Descriptions in German — English translations planned for Feature 14 (i18n)
const requirements = [
  // === Art. 4 — AI Literacy (ALL risk levels, mandatory since 02.02.2025) ===
  {
    code: 'ART_4_LITERACY',
    name: 'KI-Kompetenz (AI Literacy)',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 1,
    estimatedEffortHours: 8,
    description: 'Anbieter und Betreiber von KI-Systemen ergreifen' +
      ' Maßnahmen, um nach besten Kräften ein ausreichendes Maß' +
      ' an KI-Kompetenz ihres Personals und anderer Personen' +
      ' sicherzustellen, die in ihrem Auftrag mit dem Betrieb und' +
      ' der Nutzung von KI-Systemen befasst sind.',
    guidance: 'Schulungsprogramm für alle Mitarbeiter einrichten, die' +
      ' KI-Systeme nutzen. Mindestens: Grundlagen der KI, Risiken,' +
      ' unternehmensspezifische Nutzungsrichtlinien.',
  },
  {
    code: 'ART_4_TRAINING_CEO',
    name: 'KI-Kompetenz: Geschäftsführung',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 2,
    estimatedEffortHours: 1,
    description: 'Geschäftsführer und Vorstände müssen über ausreichende' +
      ' KI-Kompetenz verfügen, um strategische Entscheidungen zum' +
      ' KI-Einsatz treffen zu können.',
    guidance: 'CEO/Executive-Kurs: AI Act Überblick, Risiken, Haftung,' +
      ' Budget, Verantwortlichkeiten (30 Min).',
  },
  {
    code: 'ART_4_TRAINING_HR',
    name: 'KI-Kompetenz: HR-Abteilung',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 3,
    estimatedEffortHours: 2,
    description: 'HR-Mitarbeiter müssen KI-spezifische Risiken im' +
      ' Personalwesen kennen, insbesondere bei' +
      ' Hochrisiko-Anwendungen (Annex III, Bereich 4).',
    guidance: 'HR-Kurs: Hochrisiko-KI im Recruiting, Bewerbermanagement,' +
      ' Leistungsbewertung (45 Min).',
  },
  {
    code: 'ART_4_TRAINING_DEV',
    name: 'KI-Kompetenz: Entwickler',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 4,
    estimatedEffortHours: 2,
    description: 'Entwickler müssen technische Anforderungen des AI Act' +
      ' verstehen, insbesondere Art. 26 Betreiberplichten bei der' +
      ' Integration von KI-Systemen.',
    guidance: 'Developer-Kurs: Technische Anforderungen, API-Integration,' +
      ' Monitoring, Logging (60 Min).',
  },
  {
    code: 'ART_4_TRAINING_GENERAL',
    name: 'KI-Kompetenz: Allgemeine Mitarbeiter',
    articleReference: 'Art. 4',
    riskLevel: 'minimal',
    category: 'ai_literacy',
    sortOrder: 5,
    estimatedEffortHours: 1,
    description: 'Alle Mitarbeiter, die KI-Systeme nutzen, müssen' +
      ' grundlegende KI-Kompetenz nachweisen können.',
    guidance: 'Allgemeiner Kurs: KI-Grundlagen, Dos & Don\'ts, Datenschutz,' +
      ' Meldepflichten (20 Min).',
  },

  // === Art. 5 — Prohibited Practices ===
  {
    code: 'ART_5_PROHIBITED',
    name: 'Verbotene KI-Praktiken prüfen',
    articleReference: 'Art. 5',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 10,
    estimatedEffortHours: 2,
    description: 'Prüfen, ob das eingesetzte KI-System verbotene Praktiken' +
      ' nutzt: Social Scoring, Echtzeit-Biometrie (ohne' +
      ' Ausnahme), manipulative/täuschende Techniken, Ausnutzung' +
      ' von Schwächen.',
    guidance: 'Checkliste: Kein Social Scoring, keine Echtzeit-Biometrie' +
      ' ohne Genehmigung, keine manipulativen Techniken, keine' +
      ' Ausnutzung vulnerabler Gruppen.',
  },
  {
    code: 'ART_5_SOCIAL_SCORING',
    name: 'Kein Social Scoring',
    articleReference: 'Art. 5(1)(c)',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 11,
    estimatedEffortHours: 1,
    description: 'Sicherstellen, dass kein KI-System zur Bewertung oder' +
      ' Klassifizierung natürlicher Personen auf Grundlage ihres' +
      ' Sozialverhaltens eingesetzt wird.',
  },
  {
    code: 'ART_5_BIOMETRIC',
    name: 'Keine biometrische Echtzeit-Identifikation',
    articleReference: 'Art. 5(1)(h)',
    riskLevel: 'prohibited',
    category: 'deployer_obligations',
    sortOrder: 12,
    estimatedEffortHours: 1,
    description: 'Keine biometrische Echtzeit-Fernidentifizierung in' +
      ' öffentlich zugänglichen Räumen einsetzen, es sei denn, es' +
      ' liegt eine gesetzliche Ausnahme vor.',
  },

  // === Art. 26 — Deployer Obligations (HIGH RISK) ===
  {
    code: 'ART_26_USAGE',
    name: 'Bestimmungsgemäße Verwendung',
    articleReference: 'Art. 26(1)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 20,
    estimatedEffortHours: 4,
    description: 'Hochrisiko-KI-Systeme gemäß der beigefügten' +
      ' Gebrauchsanweisung verwenden. Technische und' +
      ' organisatorische Maßnahmen treffen, um die' +
      ' bestimmungsgemäße Verwendung sicherzustellen.',
    guidance: 'Gebrauchsanweisung des Anbieters beschaffen und' +
      ' dokumentieren. Interne Nutzungsrichtlinie erstellen.',
  },
  {
    code: 'ART_26_OVERSIGHT',
    name: 'Menschliche Aufsicht sicherstellen',
    articleReference: 'Art. 26(2)',
    riskLevel: 'high',
    category: 'human_oversight',
    sortOrder: 21,
    estimatedEffortHours: 8,
    description: 'Natürliche Personen mit der menschlichen Aufsicht' +
      ' betrauen, die über die erforderliche Kompetenz,' +
      ' Ausbildung und Befugnis verfügen.',
    guidance: 'Verantwortliche Person(en) benennen. Schulung nachweisen.' +
      ' Befugnis zum Eingreifen/Abschalten dokumentieren.',
  },
  {
    code: 'ART_26_INPUT_DATA',
    name: 'Eingabedaten-Relevanz sicherstellen',
    articleReference: 'Art. 26(4)',
    riskLevel: 'high',
    category: 'data_governance',
    sortOrder: 22,
    estimatedEffortHours: 4,
    description: 'Sicherstellen, dass die Eingabedaten im Hinblick auf die' +
      ' Zweckbestimmung des Hochrisiko-KI-Systems relevant und' +
      ' hinreichend repräsentativ sind.',
    guidance: 'Eingabedaten dokumentieren. Qualitätsprüfung einrichten.' +
      ' Bias-Checks durchführen.',
  },
  {
    code: 'ART_26_MONITORING',
    name: 'Betriebsüberwachung',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'monitoring',
    sortOrder: 23,
    estimatedEffortHours: 8,
    description: 'Den Betrieb des Hochrisiko-KI-Systems auf Grundlage der' +
      ' Gebrauchsanweisung überwachen. Bei Feststellung eines' +
      ' Risikos den Anbieter und die zuständige Behörde' +
      ' informieren.',
    guidance: 'Monitoring-Plan erstellen. KPIs definieren.' +
      ' Eskalationsprozess dokumentieren.',
  },
  {
    code: 'ART_26_LOGS',
    name: 'Automatische Protokolle aufbewahren',
    articleReference: 'Art. 26(6)',
    riskLevel: 'high',
    category: 'record_keeping',
    sortOrder: 24,
    estimatedEffortHours: 4,
    description: 'Die automatisch erzeugten Protokolle des' +
      ' Hochrisiko-KI-Systems mindestens sechs Monate lang' +
      ' aufbewahren, sofern nach geltendem Recht nichts anderes' +
      ' vorgesehen ist.',
    guidance: 'Log-Aufbewahrung konfigurieren (min. 6 Monate).' +
      ' Zugriffsschutz für Protokolle einrichten.',
  },
  {
    code: 'ART_26_INFORM_WORKERS',
    name: 'Arbeitnehmervertretung informieren',
    articleReference: 'Art. 26(7)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 25,
    estimatedEffortHours: 2,
    description: 'Arbeitnehmervertreter und betroffene Arbeitnehmer darüber' +
      ' informieren, dass sie dem Einsatz eines' +
      ' Hochrisiko-KI-Systems unterliegen werden.',
    guidance: 'Betriebsrat / Arbeitnehmervertretung schriftlich' +
      ' informieren. Mitarbeiter vor Einsatz benachrichtigen.',
  },
  {
    code: 'ART_26_DPIA',
    name: 'Datenschutz-Folgenabschätzung',
    articleReference: 'Art. 26(9)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 26,
    estimatedEffortHours: 16,
    description: 'Gegebenenfalls eine Datenschutz-Folgenabschätzung gemäß' +
      ' Art. 35 DSGVO durchführen, wobei die vom Anbieter' +
      ' bereitgestellten Informationen zu nutzen sind.',
    guidance: 'DSFA durchführen (falls personenbezogene Daten verarbeitet' +
      ' werden). Ergebnis dokumentieren.',
  },
  {
    code: 'ART_26_REGISTRATION',
    name: 'EU-Datenbank-Registrierung',
    articleReference: 'Art. 26(8)',
    riskLevel: 'high',
    category: 'registration',
    sortOrder: 27,
    estimatedEffortHours: 2,
    description: 'Vor Inbetriebnahme des Hochrisiko-KI-Systems sich und das' +
      ' System in der EU-Datenbank gemäß Art. 71 registrieren.',
    guidance: 'Registrierung in der EU-KI-Datenbank vornehmen.' +
      ' Registrierungsnummer dokumentieren.',
  },
  {
    code: 'ART_26_COOPERATION',
    name: 'Behördenkooperation',
    articleReference: 'Art. 26(11)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 28,
    estimatedEffortHours: 2,
    description: 'Mit den zuständigen nationalen Behörden bei allen' +
      ' Maßnahmen kooperieren, die diese Behörden im Zusammenhang' +
      ' mit dem Hochrisiko-KI-System ergreifen.',
    guidance: 'Ansprechpartner für Behördenanfragen benennen. Prozess für' +
      ' Informationsbereitstellung definieren.',
  },
  {
    code: 'ART_26_INCIDENT',
    name: 'Vorfallmeldung',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'monitoring',
    sortOrder: 29,
    estimatedEffortHours: 4,
    description: 'Bei Feststellung eines schwerwiegenden Vorfalls den' +
      ' Anbieter und die zuständige Marktüberwachungsbehörde' +
      ' unverzüglich informieren.',
    guidance: 'Incident-Response-Prozess einrichten. Meldewege an Anbieter' +
      ' und Behörde definieren.',
  },
  {
    code: 'ART_26_CEASE',
    name: 'Nutzung einstellen bei Risiko',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'deployer_obligations',
    sortOrder: 30,
    estimatedEffortHours: 2,
    description: 'Den Einsatz des KI-Systems einstellen, wenn der Betreiber' +
      ' Grund zu der Annahme hat, dass der Einsatz ein Risiko' +
      ' darstellt.',
    guidance: 'Notfallprozess für sofortiges Abschalten definieren.' +
      ' Verantwortliche Person benennen.',
  },

  // === Art. 27 — FRIA (HIGH RISK) ===
  {
    code: 'ART_27_FRIA',
    name: 'Grundrechte-Folgenabschätzung (FRIA)',
    articleReference: 'Art. 27',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 40,
    estimatedEffortHours: 24,
    description: 'Vor der Inbetriebnahme eine Folgenabschätzung' +
      ' hinsichtlich der Auswirkungen auf die Grundrechte' +
      ' durchführen. Betrifft: öffentliche Einrichtungen,' +
      ' Betreiber privater Dienste (Kreditbewertung,' +
      ' Versicherung).',
    guidance: 'FRIA mit 6 Abschnitten erstellen: Allgemein, Betroffene' +
      ' Personen, Spezifische Risiken, Menschliche Aufsicht,' +
      ' Minderungsmaßnahmen, Überwachungsplan.',
  },
  {
    code: 'ART_27_AFFECTED_PERSONS',
    name: 'FRIA: Betroffene Personen identifizieren',
    articleReference: 'Art. 27(1)(a)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 41,
    estimatedEffortHours: 4,
    description: 'Die Gruppen natürlicher Personen und Personengruppen' +
      ' identifizieren, die von der Nutzung des KI-Systems' +
      ' betroffen sein können.',
  },
  {
    code: 'ART_27_SPECIFIC_RISKS',
    name: 'FRIA: Spezifische Risiken bewerten',
    articleReference: 'Art. 27(1)(b)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 42,
    estimatedEffortHours: 8,
    description: 'Die spezifischen Risiken für die Grundrechte der' +
      ' betroffenen Personen bewerten, einschließlich des Risikos' +
      ' der Diskriminierung.',
  },
  {
    code: 'ART_27_OVERSIGHT_MEASURES',
    name: 'FRIA: Aufsichtsmaßnahmen beschreiben',
    articleReference: 'Art. 27(1)(c)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 43,
    estimatedEffortHours: 4,
    description: 'Die Maßnahmen zur menschlichen Aufsicht beschreiben, die' +
      ' zur Minderung der identifizierten Risiken ergriffen' +
      ' werden.',
  },
  {
    code: 'ART_27_MITIGATION',
    name: 'FRIA: Risikominderungsmaßnahmen',
    articleReference: 'Art. 27(1)(d)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 44,
    estimatedEffortHours: 8,
    description: 'Geeignete Maßnahmen ergreifen, um die identifizierten' +
      ' Risiken zu mindern. Verantwortlichkeiten und Fristen' +
      ' festlegen.',
  },
  {
    code: 'ART_27_NOTIFY_AUTHORITY',
    name: 'FRIA: Marktüberwachungsbehörde benachrichtigen',
    articleReference: 'Art. 27(3)',
    riskLevel: 'high',
    category: 'fria',
    sortOrder: 45,
    estimatedEffortHours: 2,
    description: 'Die zuständige Marktüberwachungsbehörde über die' +
      ' Ergebnisse der FRIA informieren und das ausgefüllte' +
      ' Formular über die EU-Datenbank übermitteln.',
  },

  // === Art. 50 — Transparency (LIMITED + HIGH) ===
  {
    code: 'ART_50_TRANSPARENCY',
    name: 'Transparenzpflichten',
    articleReference: 'Art. 50',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 50,
    estimatedEffortHours: 4,
    description: 'Nutzer darüber informieren, dass sie mit einem KI-System' +
      ' interagieren (Chatbots, Deepfakes, Emotionserkennung,' +
      ' biometrische Kategorisierung).',
    guidance: 'KI-Kennzeichnung implementieren. Nutzer vor Interaktion' +
      ' informieren. Transparenzhinweise sichtbar platzieren.',
  },
  {
    code: 'ART_50_CHATBOT',
    name: 'Chatbot-Kennzeichnung',
    articleReference: 'Art. 50(1)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 51,
    estimatedEffortHours: 2,
    description: 'Sicherstellen, dass natürliche Personen darüber' +
      ' informiert werden, dass sie mit einem KI-System' +
      ' interagieren, es sei denn, dies ergibt sich aus den' +
      ' Umständen.',
  },
  {
    code: 'ART_50_DEEPFAKE',
    name: 'Deepfake-Kennzeichnung',
    articleReference: 'Art. 50(4)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 52,
    estimatedEffortHours: 2,
    description: 'KI-generierte oder manipulierte Bild-, Audio- oder' +
      ' Videoinhalte als solche kennzeichnen (maschinenlesbar und' +
      ' für Nutzer erkennbar).',
  },
  {
    code: 'ART_50_EMOTION',
    name: 'Emotionserkennung offenlegen',
    articleReference: 'Art. 50(3)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 53,
    estimatedEffortHours: 2,
    description: 'Betroffene Personen über den Einsatz eines' +
      ' Emotionserkennungssystems oder eines Systems zur' +
      ' biometrischen Kategorisierung informieren.',
  },
  {
    code: 'ART_50_AI_GENERATED_TEXT',
    name: 'KI-generierte Texte kennzeichnen',
    articleReference: 'Art. 50(2)',
    riskLevel: 'limited',
    category: 'transparency',
    sortOrder: 54,
    estimatedEffortHours: 2,
    description: 'Texte, die von KI-Systemen generiert wurden und zu' +
      ' Informationszwecken veröffentlicht werden, als maschinell' +
      ' erstellt kennzeichnen.',
  },

  // === Additional Deployer Obligations ===
  {
    code: 'ART_26_RISK_MGMT_SUPPORT',
    name: 'Risikomanagement unterstützen',
    articleReference: 'Art. 26(1)',
    riskLevel: 'high',
    category: 'risk_management',
    sortOrder: 60,
    estimatedEffortHours: 8,
    description: 'Das vom Anbieter eingerichtete Risikomanagementsystem' +
      ' durch eigene Maßnahmen ergänzen und unterstützen.',
    guidance: 'Eigene Risikobewertung durchführen. Regelmäßige Reviews' +
      ' planen. Dokumentation pflegen.',
  },
  {
    code: 'ART_26_POST_MARKET',
    name: 'Nachmarktüberwachung unterstützen',
    articleReference: 'Art. 26(5)',
    riskLevel: 'high',
    category: 'post_market_monitoring',
    sortOrder: 61,
    estimatedEffortHours: 4,
    description: 'Den Anbieter bei der Nachmarktüberwachung unterstützen,' +
      ' insbesondere durch Bereitstellung von Informationen über' +
      ' aufgetretene Probleme.',
    guidance: 'Feedback-Prozess zum Anbieter einrichten. Auffälligkeiten' +
      ' systematisch melden.',
  },
];

module.exports = requirements;
