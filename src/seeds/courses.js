'use strict';

const courses = [
  {
    title: 'AI Act für Geschäftsführer',
    slug: 'ai-act-ceo-executive',
    roleTarget: 'ceo_executive',
    durationMinutes: 30,
    contentType: 'interactive',
    language: 'de',
    version: 1,
    active: true,
    sortOrder: 0,
    description: 'Kompaktkurs für Geschäftsführer und Vorstände: AI Act Überblick, Haftungsrisiken, Budgetplanung und strategische Verantwortung beim KI-Einsatz.',
    modules: [
      {
        sortOrder: 0,
        title: 'AI Act im Überblick',
        durationMinutes: 10,
        contentMarkdown: '# AI Act im Überblick\n\nDer AI Act (Verordnung (EU) 2024/1689) ist das weltweit erste umfassende KI-Gesetz...',
        quizQuestions: [
          {
            question: 'Seit wann gilt die AI-Literacy-Pflicht (Art. 4)?',
            options: ['01.08.2024', '02.02.2025', '02.08.2025', '02.02.2026'],
            correctAnswer: 1,
            explanation: 'Art. 4 (KI-Kompetenz) gilt seit dem 2. Februar 2025.',
          },
          {
            question: 'Wer ist als "Betreiber" (Deployer) im Sinne des AI Act definiert?',
            options: [
              'Nur Entwickler von KI-Systemen',
              'Jede natürliche oder juristische Person, die ein KI-System unter ihrer Verantwortung einsetzt',
              'Nur öffentliche Einrichtungen',
              'Nur Unternehmen mit mehr als 250 Mitarbeitern',
            ],
            correctAnswer: 1,
            explanation: 'Art. 3(4): Betreiber ist jede Person, die ein KI-System unter eigener Verantwortung nutzt.',
          },
        ],
      },
      {
        sortOrder: 1,
        title: 'Haftung und Verantwortung',
        durationMinutes: 10,
        contentMarkdown: '# Haftung und Verantwortung\n\n## Bußgelder\n- Bis zu 35 Mio. EUR oder 7% des weltweiten Jahresumsatzes...',
        quizQuestions: [
          {
            question: 'Wie hoch kann die maximale Geldbuße bei Verstößen gegen verbotene KI-Praktiken sein?',
            options: ['10 Mio. EUR', '20 Mio. EUR', '35 Mio. EUR', '50 Mio. EUR'],
            correctAnswer: 2,
            explanation: 'Art. 99(3): Bis zu 35 Mio. EUR oder 7% des weltweiten Jahresumsatzes.',
          },
        ],
      },
      {
        sortOrder: 2,
        title: 'Strategische Maßnahmen',
        durationMinutes: 10,
        contentMarkdown: '# Strategische Maßnahmen\n\n## Sofortmaßnahmen für Geschäftsführer\n1. KI-Inventar erstellen...',
        quizQuestions: [
          {
            question: 'Was ist die wichtigste erste Maßnahme für Geschäftsführer?',
            options: [
              'Alle KI-Systeme sofort abschalten',
              'Ein vollständiges KI-Inventar erstellen',
              'Einen Anwalt beauftragen',
              'Abwarten bis weitere Guidance veröffentlicht wird',
            ],
            correctAnswer: 1,
            explanation: 'Ohne Inventar können Sie weder Risiken bewerten noch Compliance sicherstellen.',
          },
        ],
      },
    ],
  },
  {
    title: 'KI im Personalwesen',
    slug: 'ai-act-hr-manager',
    roleTarget: 'hr_manager',
    durationMinutes: 45,
    contentType: 'interactive',
    language: 'de',
    version: 1,
    active: true,
    sortOrder: 1,
    description: 'Spezialkurs für HR-Manager: Hochrisiko-KI im Recruiting und Personalwesen, Annex III Bereich 4, Bewerbermanagement, Leistungsbewertung.',
    modules: [
      {
        sortOrder: 0,
        title: 'KI im HR: Rechtlicher Rahmen',
        durationMinutes: 15,
        contentMarkdown: '# KI im HR: Rechtlicher Rahmen\n\n## Annex III, Bereich 4: Beschäftigung\nKI-Systeme im Bereich Beschäftigung gelten als Hochrisiko...',
        quizQuestions: [
          {
            question: 'Welche HR-Anwendung gilt IMMER als Hochrisiko?',
            options: [
              'Terminplanung mit KI',
              'KI-gestützte Bewerbervorauswahl',
              'Chatbot für FAQ im Intranet',
              'Automatische E-Mail-Weiterleitung',
            ],
            correctAnswer: 1,
            explanation: 'Annex III, Nr. 4(a): KI-Systeme zur Einstellung oder Vorauswahl von Bewerbern sind Hochrisiko.',
          },
        ],
      },
      {
        sortOrder: 1,
        title: 'Hochrisiko-Szenarien im HR',
        durationMinutes: 15,
        contentMarkdown: '# Hochrisiko-Szenarien im HR\n\n## Recruiting\n- CV-Screening, Interview-Analyse, Persönlichkeitstests...',
        quizQuestions: [
          {
            question: 'Was müssen Sie als HR-Verantwortlicher bei einer KI-gestützten Bewerbervorauswahl sicherstellen?',
            options: [
              'Nur den Anbieter informieren',
              'Menschliche Aufsicht und bestimmungsgemäße Verwendung',
              'Nichts, der Anbieter ist verantwortlich',
              'Nur die IT-Abteilung informieren',
            ],
            correctAnswer: 1,
            explanation: 'Art. 26: Betreiber müssen menschliche Aufsicht sicherstellen und das System bestimmungsgemäß verwenden.',
          },
        ],
      },
      {
        sortOrder: 2,
        title: 'Praktische Compliance-Schritte',
        durationMinutes: 15,
        contentMarkdown: '# Praktische Compliance-Schritte\n\n## Checkliste für HR-Manager\n1. KI-Inventar für HR-Tools erstellen...',
        quizQuestions: [
          {
            question: 'Müssen Bewerber informiert werden, wenn KI bei der Vorauswahl eingesetzt wird?',
            options: [
              'Nein, das ist Betriebsgeheimnis',
              'Ja, gemäß Art. 26(7) und Art. 50',
              'Nur auf Nachfrage',
              'Nur bei Absage',
            ],
            correctAnswer: 1,
            explanation: 'Art. 26(7) und Art. 50: Betroffene Personen müssen über den KI-Einsatz informiert werden.',
          },
        ],
      },
    ],
  },
  {
    title: 'AI Act für Entwickler',
    slug: 'ai-act-developer',
    roleTarget: 'developer',
    durationMinutes: 60,
    contentType: 'interactive',
    language: 'de',
    version: 1,
    active: true,
    sortOrder: 2,
    description: 'Technischer Kurs für Entwickler: Art. 26 Betreiberpflichten bei API-Integration, Monitoring, Logging, technische Dokumentation und Compliance-Automatisierung.',
    modules: [
      {
        sortOrder: 0,
        title: 'AI Act: Technische Grundlagen',
        durationMinutes: 15,
        contentMarkdown: '# AI Act: Technische Grundlagen\n\n## Risikoklassen und ihre technischen Implikationen\n- Prohibited: Social Scoring, Real-time Biometrics...',
        quizQuestions: [
          {
            question: 'Welche technische Maßnahme ist für Hochrisiko-KI-Systeme NICHT vorgeschrieben?',
            options: [
              'Automatische Protokollierung',
              'Open-Source-Veröffentlichung des Quellcodes',
              'Menschliche Aufsichtsmöglichkeit',
              'Eingabedaten-Validierung',
            ],
            correctAnswer: 1,
            explanation: 'Der AI Act verlangt keine Open-Source-Veröffentlichung. Protokollierung, Aufsicht und Datenvalidierung sind hingegen Pflicht.',
          },
        ],
      },
      {
        sortOrder: 1,
        title: 'API-Integration und Monitoring',
        durationMinutes: 15,
        contentMarkdown: '# API-Integration und Monitoring\n\n## Logging-Anforderungen\n- Art. 26(6): Automatische Protokolle min. 6 Monate aufbewahren...',
        quizQuestions: [
          {
            question: 'Wie lange müssen automatisch erzeugte Protokolle mindestens aufbewahrt werden?',
            options: ['1 Monat', '3 Monate', '6 Monate', '12 Monate'],
            correctAnswer: 2,
            explanation: 'Art. 26(6): Mindestens 6 Monate, sofern nicht anders gesetzlich vorgeschrieben.',
          },
        ],
      },
      {
        sortOrder: 2,
        title: 'Transparenz-Implementierung',
        durationMinutes: 15,
        contentMarkdown: '# Transparenz-Implementierung\n\n## Art. 50: Technische Umsetzung\n- Chatbot-Kennzeichnung (UI-Banner)...',
        quizQuestions: [
          {
            question: 'Wie muss ein KI-Chatbot gemäß Art. 50 gekennzeichnet werden?',
            options: [
              'Gar nicht, wenn er gut genug ist',
              'Nur im Impressum',
              'Der Nutzer muss VOR der Interaktion informiert werden',
              'Nur bei Beschwerden offenlegen',
            ],
            correctAnswer: 2,
            explanation: 'Art. 50(1): Natürliche Personen müssen darüber informiert werden, dass sie mit einem KI-System interagieren.',
          },
        ],
      },
      {
        sortOrder: 3,
        title: 'Compliance-Automatisierung',
        durationMinutes: 15,
        contentMarkdown: '# Compliance-Automatisierung\n\n## Technische Compliance-Tools\n- Automatische Klassifizierung (Rule Engine + LLM)...',
        quizQuestions: [
          {
            question: 'Was ist der Vorteil eines hybriden Klassifizierungsansatzes (Rules + LLM)?',
            options: [
              'Schnellere Verarbeitung',
              'Höhere Genauigkeit durch Cross-Validierung',
              'Geringere Kosten',
              'Einfachere Implementierung',
            ],
            correctAnswer: 1,
            explanation: 'Die Kombination aus regelbasierter Vorprüfung und LLM-Analyse mit Cross-Validierung erhöht die Zuverlässigkeit der Klassifizierung.',
          },
        ],
      },
    ],
  },
  {
    title: 'KI-Kompetenz am Arbeitsplatz',
    slug: 'ai-act-general-employee',
    roleTarget: 'general_employee',
    durationMinutes: 20,
    contentType: 'interactive',
    language: 'de',
    version: 1,
    active: true,
    sortOrder: 3,
    description: 'Basiskurs für alle Mitarbeiter: KI-Grundlagen, Dos & Don\'ts am Arbeitsplatz, Datenschutz bei KI-Nutzung, Meldepflichten.',
    modules: [
      {
        sortOrder: 0,
        title: 'Was ist KI?',
        durationMinutes: 7,
        contentMarkdown: '# Was ist KI?\n\n## KI im Alltag\n- Sprachassistenten (Siri, Alexa)\n- Chatbots (ChatGPT, Copilot)...',
        quizQuestions: [
          {
            question: 'Was bedeutet "KI-Kompetenz" laut AI Act?',
            options: [
              'Programmieren können',
              'Fähigkeiten und Wissen für informierte Nutzung von KI-Systemen',
              'Einen KI-Kurs an der Universität absolviert haben',
              'KI-Systeme entwickeln können',
            ],
            correctAnswer: 1,
            explanation: 'Art. 4: KI-Kompetenz bedeutet Fähigkeiten und Wissen, um KI-Systeme informiert und verantwortungsvoll nutzen zu können.',
          },
        ],
      },
      {
        sortOrder: 1,
        title: 'Dos & Don\'ts bei der KI-Nutzung',
        durationMinutes: 7,
        contentMarkdown: '# Dos & Don\'ts bei der KI-Nutzung\n\n## Do:\n- Unternehmensinterne Richtlinien beachten\n- Ergebnisse kritisch prüfen...',
        quizQuestions: [
          {
            question: 'Dürfen Sie vertrauliche Kundendaten in ein öffentliches KI-Tool wie ChatGPT eingeben?',
            options: [
              'Ja, wenn es die Arbeit erleichtert',
              'Nein, ohne explizite Freigabe durch die IT/Geschäftsleitung',
              'Ja, wenn Sie die Daten anonymisieren',
              'Ja, ChatGPT ist sicher',
            ],
            correctAnswer: 1,
            explanation: 'Vertrauliche Daten dürfen nur in freigegebene und geprüfte KI-Systeme eingegeben werden.',
          },
        ],
      },
      {
        sortOrder: 2,
        title: 'Meldepflichten und Verantwortung',
        durationMinutes: 6,
        contentMarkdown: '# Meldepflichten und Verantwortung\n\n## Wann melden?\n- Fehlerhafte KI-Ergebnisse\n- Diskriminierende Ausgaben...',
        quizQuestions: [
          {
            question: 'Was sollen Sie tun, wenn ein KI-System diskriminierende Ergebnisse liefert?',
            options: [
              'Ignorieren und manuell korrigieren',
              'Vorgesetzten und KI-Verantwortlichen melden',
              'Das KI-System selbst abschalten',
              'Den Hersteller direkt kontaktieren',
            ],
            correctAnswer: 1,
            explanation: 'Auffälligkeiten und Probleme immer intern melden. Die Meldekette ist: Vorgesetzte → KI-Verantwortliche → ggf. Behörden.',
          },
        ],
      },
    ],
  },
];

module.exports = courses;
