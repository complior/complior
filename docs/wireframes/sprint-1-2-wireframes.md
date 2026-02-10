# Sprint 1-2 UX Wireframes (Deployer-First)

**Version:** 1.0.0
**Date:** 2026-02-09
**Author:** Nina (Frontend+UX)
**Design System:** US-006 tokens (Inter, risk-level colors, 4px grid)

---

## Design Tokens Reference

| Token | Value | Usage |
|-------|-------|-------|
| `primary-600` | `#2563eb` | Buttons, links, active states |
| `risk-prohibited` | `#dc2626` | Prohibited risk badge |
| `risk-high` | `#f97316` | High risk badge |
| `risk-gpai` | `#3b82f6` | GPAI risk badge |
| `risk-limited` | `#eab308` | Limited risk badge |
| `risk-minimal` | `#22c55e` | Minimal risk badge |
| Font | Inter | Body text |
| Font (code) | JetBrains Mono | Code, IDs |
| Grid | 4px | Spacing base unit |

---

## 1. Main Page (Landing / Marketing)

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                    Funktionen  Preise  Kontakt  │
│                                                 [Anmelden] [Kostenlos]  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                                                                          │
│         AI Act Compliance                                                │
│         für Ihr Unternehmen                                              │
│                                                                          │
│         Die Self-Service-Plattform für EU AI Act                        │
│         Compliance. Für Unternehmen, die AI nutzen —                    │
│         nicht bauen.                                                     │
│                                                                          │
│         [  Kostenlos starten  ]   [  Demo ansehen  ]                    │
│              ↑ primary-600             ↑ secondary                       │
│                                                                          │
│         ✓ Art. 4 AI Literacy Pflicht seit 02.02.2025                    │
│         ✓ 70% der Unternehmen noch nicht compliant                      │
│         ✓ Ab €49/Monat — keine Beratungskosten                          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Warum AI Act Compliance Platform?                                       │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ [📋]             │  │ [🎓]             │  │ [🛡]             │      │
│  │ AI-Tool Inventar │  │ AI Literacy      │  │ Risiko-          │      │
│  │                  │  │                  │  │ Klassifizierung  │      │
│  │ Erfassen Sie     │  │ Art. 4 Pflicht:  │  │                  │      │
│  │ alle AI-Tools    │  │ Schulen Sie Ihre │  │ Ermitteln Sie    │      │
│  │ Ihres Unter-     │  │ Mitarbeiter mit  │  │ das Risikoniveau │      │
│  │ nehmens. Katalog │  │ rollenbasierten  │  │ Ihrer AI-        │      │
│  │ mit 200+ Tools.  │  │ Kursen. Zerti-   │  │ Nutzung. Art. 5, │      │
│  │                  │  │ fikate inklusive.│  │ Annex III.       │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ [📄]             │  │ [💬]             │  │ [📊]             │      │
│  │ FRIA &           │  │ Eva —            │  │ Compliance       │      │
│  │ Dokumentation    │  │ AI-Assistentin   │  │ Dashboard        │      │
│  │                  │  │                  │  │                  │      │
│  │ FRIA (Art. 27),  │  │ "Ist Slack AI    │  │ Compliance Score,│      │
│  │ Monitoring Plan, │  │ high-risk?"      │  │ Fristen, Fort-   │      │
│  │ AI Usage Policy  │  │ Fragen Sie Eva   │  │ schritt — alles  │      │
│  │ automatisch.     │  │ auf Deutsch.     │  │ auf einen Blick. │      │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘      │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Preise                                                                  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Free         │  │ Starter      │  │ Growth       │  │ Scale      │  │
│  │              │  │              │  │              │  │            │  │
│  │ €0/Monat     │  │ €49/Monat    │  │ €149/Monat   │  │ €399/Monat │  │
│  │              │  │              │  │              │  │            │  │
│  │ Quick Check  │  │ AI Literacy  │  │ Full         │  │ Alles in   │  │
│  │ 1 AI-Tool    │  │ Art. 4       │  │ Compliance   │  │ Growth +   │  │
│  │ Basis-       │  │ Starter +    │  │ Starter +    │  │ Unbegrenzte│  │
│  │ klassifi-    │  │ 4 Kurse      │  │ Risiko-      │  │ Tools      │  │
│  │ zierung      │  │ Zertifikate  │  │ klassifi-    │  │ API-Zugang │  │
│  │              │  │ Bis 50 MA    │  │ zierung      │  │ Bis 500 MA │  │
│  │              │  │              │  │ FRIA         │  │ Priority   │  │
│  │              │  │              │  │ Bis 200 MA   │  │ Support    │  │
│  │              │  │              │  │              │  │            │  │
│  │ [Starten]    │  │ [Starten ◆]  │  │ [Starten]    │  │ [Starten]  │  │
│  │              │  │  beliebteste │  │              │  │            │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Vertrauen Sie auf EU-Datensouveränität                                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │  🇩🇪 Hetzner (DE)    🇫🇷 Brevo (FR)    🇪🇪 Plausible (EE)     │     │
│  │  Hosting & Storage    E-Mail            Analytics              │     │
│  │                                                                │     │
│  │  🇩🇪 Ory (DE)        🇫🇷 Mistral (FR)  🇱🇹 Better Uptime (LT) │     │
│  │  Authentifizierung    AI/LLM            Monitoring             │     │
│  │                                                                │     │
│  │  ⛔ Ihre Daten verlassen NIEMALS die EU                        │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│         [     Jetzt kostenlos starten     ]                              │
│                   ↑ primary-600, large                                   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform   Impressum  Datenschutz  AGB        │
│                                                              v0.1.0      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ AI Act Compliance       │
│ für Ihr Unternehmen     │
│                         │
│ Self-Service-Plattform  │
│ für Unternehmen, die    │
│ AI nutzen.              │
│                         │
│ [ Kostenlos starten   ] │
│ [ Demo ansehen        ] │
│                         │
│ ✓ Art. 4 Pflicht seit   │
│   02.02.2025            │
│ ✓ 70% nicht compliant   │
│ ✓ Ab €49/Monat          │
│                         │
│ ─────────────────────── │
│                         │
│ ┌─────────────────────┐ │
│ │ [📋] AI-Tool        │ │
│ │ Inventar            │ │
│ │ 200+ Tools im       │ │
│ │ Katalog             │ │
│ ├─────────────────────┤ │
│ │ [🎓] AI Literacy    │ │
│ │ Art. 4 Schulungen   │ │
│ │ + Zertifikate       │ │
│ ├─────────────────────┤ │
│ │ [🛡] Risiko-        │ │
│ │ Klassifizierung     │ │
│ │ Art. 5, Annex III   │ │
│ └─────────────────────┘ │
│                         │
│ ─────────────────────── │
│                         │
│ Preise                  │
│                         │
│ ┌─────────────────────┐ │
│ │ Free     €0         │ │
│ │ Quick Check, 1 Tool │ │
│ │ [Starten]           │ │
│ ├─────────────────────┤ │
│ │ Starter  €49  ◆     │ │
│ │ AI Literacy, 50 MA  │ │
│ │ [Starten]           │ │
│ ├─────────────────────┤ │
│ │ Growth   €149       │ │
│ │ Full Compliance     │ │
│ │ [Starten]           │ │
│ ├─────────────────────┤ │
│ │ Scale    €399       │ │
│ │ Unbegrenzt + API    │ │
│ │ [Starten]           │ │
│ └─────────────────────┘ │
│                         │
│ ─────────────────────── │
│                         │
│ 🇩🇪🇫🇷🇪🇪🇱🇹               │
│ EU-Datensouveränität    │
│ Daten verlassen nie EU  │
│                         │
│ [ Jetzt starten       ] │
│                         │
├─────────────────────────┤
│ © 2026  Impressum       │
│ Datenschutz  AGB v0.1.0│
└─────────────────────────┘
```

---

## 2. Login Page (Ory Magic Link Flow)

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    ┌────────────────────────┐                    │
│                    │                        │                    │
│                    │    [🛡] AI Act          │                    │
│                    │    Compliance           │                    │
│                    │                        │                    │
│                    │  Anmeldung             │                    │
│                    │                        │                    │
│                    │  E-Mail-Adresse        │                    │
│                    │  ┌──────────────────┐  │                    │
│                    │  │ email@firma.de   │  │                    │
│                    │  └──────────────────┘  │                    │
│                    │                        │                    │
│                    │  [  Magic Link senden ]│  ← primary-600    │
│                    │                        │                    │
│                    │  ─── oder ───          │                    │
│                    │                        │                    │
│                    │  Passwort              │                    │
│                    │  ┌──────────────────┐  │                    │
│                    │  │ ••••••••         │  │                    │
│                    │  └──────────────────┘  │                    │
│                    │                        │                    │
│                    │  [    Anmelden       ] │  ← secondary      │
│                    │                        │                    │
│                    │  Kein Konto?           │                    │
│                    │  Jetzt registrieren →  │  ← link variant   │
│                    │                        │                    │
│                    └────────────────────────┘                    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform              v0.1.0           │
└──────────────────────────────────────────────────────────────────┘
```

### State: "Check Your Email"

```
┌────────────────────────┐
│                        │
│    [📧] Prüfen Sie     │
│    Ihre E-Mails        │
│                        │
│  Wir haben einen       │
│  Magic Link an         │
│  email@firma.de        │
│  gesendet.             │
│                        │
│  [  Erneut senden  ]   │  ← ghost variant (disabled 60s)
│                        │
│  ← Zurück zur          │
│    Anmeldung           │
│                        │
└────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────┐
│ [🛡] AI Act         │
├─────────────────────┤
│                     │
│  Anmeldung          │
│                     │
│  E-Mail-Adresse     │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  [ Magic Link     ] │
│  [    senden      ] │
│                     │
│  ─── oder ───       │
│                     │
│  Passwort           │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  [  Anmelden     ]  │
│                     │
│  Kein Konto?        │
│  Registrieren →     │
│                     │
├─────────────────────┤
│ © 2026    v0.1.0    │
└─────────────────────┘
```

---

## 3. Register Page (Deployer Onboarding)

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│         ┌──────────────────────────────────────────┐             │
│         │                                          │             │
│         │  Konto erstellen                         │             │
│         │  Starten Sie Ihre AI Act Compliance      │             │
│         │                                          │             │
│         │  ┌─ Schritt 1 von 2 ─────────────────┐  │             │
│         │  │ ● Unternehmen   ○ AI-Nutzung       │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  Vollständiger Name *                    │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ Max Mustermann                     │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  E-Mail-Adresse *                        │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ max@firma.de                       │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  Firmenname *                            │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ Muster GmbH                        │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  Branche *                               │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ Gesundheitswesen                 ▼ │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │  (Technologie / Finanzen / Gesundheit /  │             │
│         │   Bildung / Personalwesen / Recht /      │             │
│         │   Fertigung / Sonstiges)                 │             │
│         │                                          │             │
│         │  Unternehmensgröße *                     │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ 50-249 Mitarbeiter              ▼  │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │  (1-9 / 10-49 / 50-249 / 250-999 /      │             │
│         │   1000+)                                 │             │
│         │                                          │             │
│         │  [      Weiter →      ]                  │  ← primary │
│         │                                          │             │
│         └──────────────────────────────────────────┘             │
│                                                                  │
│         ┌──────────────────────────────────────────┐             │
│         │  Schritt 2 von 2: AI-Nutzung             │             │
│         │  ┌─────────────────────────────────────┐ │             │
│         │  │ ○ Unternehmen   ● AI-Nutzung        │ │             │
│         │  └─────────────────────────────────────┘ │             │
│         │                                          │             │
│         │  Welche AI-Instrumente nutzt Ihr         │             │
│         │  Unternehmen? *                          │             │
│         │                                          │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ 🔍 AI-Tool suchen...               │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  Häufige Tools:                          │             │
│         │  [ChatGPT] [GitHub Copilot] [Copilot365] │             │
│         │  [Midjourney] [DeepL] [Grammarly]        │             │
│         │                                          │             │
│         │  Ausgewählt: (3)                         │             │
│         │  ┌────────────────────────────────────┐  │             │
│         │  │ ChatGPT          [×]               │  │             │
│         │  │ GitHub Copilot   [×]               │  │             │
│         │  │ DeepL            [×]               │  │             │
│         │  └────────────────────────────────────┘  │             │
│         │                                          │             │
│         │  ☑ Ich stimme den Datenschutz-           │             │
│         │    bestimmungen und AGB zu.              │             │
│         │    (DSGVO Art. 6(1)(a))                  │             │
│         │                                          │             │
│         │  [← Zurück]   [  Registrieren  ]         │             │
│         │                                          │             │
│         │  Bereits registriert? Anmelden →         │             │
│         │                                          │             │
│         └──────────────────────────────────────────┘             │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform              v0.1.0           │
└──────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────┐
│ [🛡] AI Act         │
├─────────────────────┤
│                     │
│ Konto erstellen     │
│                     │
│ ● 1  ── ○ 2        │
│                     │
│ Name *              │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ E-Mail *            │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ Firmenname *        │
│ ┌─────────────────┐ │
│ │                 │ │
│ └─────────────────┘ │
│                     │
│ Branche *           │
│ ┌─────────────────┐ │
│ │              ▼  │ │
│ └─────────────────┘ │
│                     │
│ Größe *             │
│ ┌─────────────────┐ │
│ │              ▼  │ │
│ └─────────────────┘ │
│                     │
│ [    Weiter →     ] │
│                     │
├─────────────────────┤
│ © 2026    v0.1.0    │
└─────────────────────┘
```

---

## 4. Deployer Dashboard

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
│                                                        [Max M.] [⚙]    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Willkommen, Max!                                            Muster GmbH│
│                                                                          │
│  ┌────────────────────┐  ┌────────────────────┐  ┌──────────────────┐   │
│  │ AI-Tool Inventar   │  │ AI Literacy        │  │ Compliance Score │   │
│  │                    │  │                    │  │                  │   │
│  │  12 Tools          │  │  ████████░░  78%   │  │    ┌──────┐     │   │
│  │                    │  │                    │  │    │  64  │     │   │
│  │  [██] 2 High       │  │  14/18 geschult    │  │    │  /100│     │   │
│  │  [██] 1 GPAI       │  │                    │  │    └──────┘     │   │
│  │  [██] 3 Limited    │  │  Frist: 02.08.2026 │  │                  │   │
│  │  [██] 6 Minimal    │  │                    │  │  ████████░░░░░   │   │
│  │                    │  │  [Status ansehen →]│  │                  │   │
│  │  [Alle ansehen →]  │  │                    │  │  [Details →]     │   │
│  └────────────────────┘  └────────────────────┘  └──────────────────┘   │
│                                                                          │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ Nächste Fristen               │  │ Letzte Aktivitäten           │  │
│  │                                │  │                               │  │
│  │  ⚠  AI Literacy Frist         │  │  ✅ ChatGPT klassifiziert    │  │
│  │     02.08.2026 (174 Tage)     │  │     vor 2 Stunden            │  │
│  │                                │  │                               │  │
│  │  ⚠  FRIA: HireVue             │  │  📋 FRIA erstellt: HireVue  │  │
│  │     Sofort erforderlich        │  │     vor 1 Tag                │  │
│  │                                │  │                               │  │
│  │  📋 Monitoring Plan: Copilot  │  │  👤 3 Mitarbeiter für       │  │
│  │     15.03.2026                 │  │     Schulung angemeldet      │  │
│  │                                │  │     vor 3 Tagen              │  │
│  └────────────────────────────────┘  └───────────────────────────────┘  │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Color legend for risk badges in widgets:
- `risk-high` (#f97316) — orange badge "High"
- `risk-gpai` (#3b82f6) — blue badge "GPAI"
- `risk-limited` (#eab308) — yellow badge "Limited"
- `risk-minimal` (#22c55e) — green badge "Minimal"

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ Willkommen, Max!        │
│ Muster GmbH             │
│                         │
│ ┌─────────────────────┐ │
│ │ AI-Tool Inventar    │ │
│ │ 12 Tools            │ │
│ │ [██] 2 High         │ │
│ │ [██] 1 GPAI         │ │
│ │ [██] 3 Limited      │ │
│ │ [██] 6 Minimal      │ │
│ │ [Alle ansehen →]    │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ AI Literacy         │ │
│ │ ████████░░  78%     │ │
│ │ 14/18 geschult      │ │
│ │ Frist: 02.08.2026   │ │
│ │ [Status ansehen →]  │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Compliance Score    │ │
│ │    64/100           │ │
│ │ ████████░░░░░       │ │
│ │ [Details →]         │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Nächste Fristen     │ │
│ │ ⚠ Literacy 02.08.  │ │
│ │ ⚠ FRIA: HireVue    │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │  ← bottom nav
└─────────────────────────┘
```

---

## 5. AI Tool Inventory

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AI-Tool Inventar                                                        │
│  Verwalten Sie die AI-Tools Ihres Unternehmens                          │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ 🔍 Tool suchen...              [Risiko ▼] [Status ▼] [Domain ▼]│    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  [ + AI-Tool hinzufügen ]  [ 📥 CSV Import ]  [ 🔍 Katalog durchsuchen]│
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Name          │ Anbieter  │ Risiko    │ Compliance │ Literacy│ ⋮ │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ HireVue       │ HireVue   │ [HIGH]    │ ██░░░ 35%  │ ⚠ 2/5  │ ⋮ │   │
│  │               │ Inc.      │           │            │         │   │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ ChatGPT       │ OpenAI    │ [GPAI]    │ ████░ 72%  │ ✅ 8/8 │ ⋮ │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ GitHub        │ Microsoft │ [LIMITED] │ █████ 90%  │ ✅ 3/3 │ ⋮ │   │
│  │ Copilot       │           │           │            │         │   │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ DeepL         │ DeepL SE  │ [MINIMAL] │ █████ 100% │ ✅ 18  │ ⋮ │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ Grammarly     │ Grammarly │ [MINIMAL] │ █████ 95%  │ ✅ 18  │ ⋮ │   │
│  │               │ Inc.      │           │            │         │   │   │
│  ├───────────────┼───────────┼───────────┼────────────┼─────────┼───┤   │
│  │ Personio AI   │ Personio  │ [HIGH]    │ ███░░ 55%  │ ⚠ 1/5  │ ⋮ │   │
│  │ Recruiting    │ SE        │           │            │         │   │   │
│  └───────────────┴───────────┴───────────┴────────────┴─────────┴───┘   │
│                                                                          │
│  Zeigt 1-6 von 12 Tools            [ ← ] Seite 1 von 2 [ → ]           │
│                                                                          │
│  ⋮ Menü: Klassifizieren | FRIA erstellen | Monitoring Plan | Löschen   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Risk Badge Colors:
- `[HIGH]` → Badge variant="high" (#f97316, white text)
- `[GPAI]` → Badge variant="gpai" (#3b82f6, white text)
- `[LIMITED]` → Badge variant="limited" (#eab308, dark text)
- `[MINIMAL]` → Badge variant="minimal" (#22c55e, white text)
- `[PROHIBITED]` → Badge variant="prohibited" (#dc2626, white text)

### Catalog Search Modal

```
┌────────────────────────────────────────────────┐
│  AI-Tool aus Katalog hinzufügen           [×]  │
│                                                │
│  🔍 Suchen...                                  │
│  ┌────────────────────────────────────────┐    │
│  │ ChatGPT                                │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Ergebnisse (200+ Tools):                      │
│                                                │
│  ┌────────────────────────────────────────┐    │
│  │ ChatGPT          OpenAI    [GPAI]      │    │
│  │ Chatbot, Text Generation               │    │
│  │                        [Hinzufügen →]  │    │
│  ├────────────────────────────────────────┤    │
│  │ ChatGPT Enterprise  OpenAI  [GPAI]     │    │
│  │ Enterprise Chatbot                      │    │
│  │                        [Hinzufügen →]  │    │
│  ├────────────────────────────────────────┤    │
│  │ ChatGPT Team       OpenAI   [GPAI]     │    │
│  │ Team Chatbot                            │    │
│  │                        [Hinzufügen →]  │    │
│  └────────────────────────────────────────┘    │
│                                                │
│  Tool nicht gefunden?                          │
│  [Manuell hinzufügen →]                       │
│                                                │
└────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ AI-Tool Inventar        │
│                         │
│ 🔍 Suchen...            │
│ ┌─────────────────────┐ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ [+ Hinzufügen]          │
│ [📥 CSV] [🔍 Katalog]  │
│                         │
│ ┌─────────────────────┐ │
│ │ HireVue             │ │
│ │ HireVue Inc.        │ │
│ │ [HIGH]  Comp: 35%   │ │
│ │ Literacy: ⚠ 2/5     │ │
│ │              [ ⋮ ]  │ │
│ ├─────────────────────┤ │
│ │ ChatGPT             │ │
│ │ OpenAI              │ │
│ │ [GPAI]  Comp: 72%   │ │
│ │ Literacy: ✅ 8/8    │ │
│ │              [ ⋮ ]  │ │
│ ├─────────────────────┤ │
│ │ GitHub Copilot      │ │
│ │ Microsoft           │ │
│ │ [LIMITED] Comp: 90% │ │
│ │ Literacy: ✅ 3/3    │ │
│ │              [ ⋮ ]  │ │
│ └─────────────────────┘ │
│                         │
│ [ ← ] 1/2 [ → ]        │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 6. AI Literacy Dashboard

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AI Literacy — Art. 4 AI Act                                             │
│  Schulungspflicht für alle Mitarbeiter, die AI-Systeme nutzen           │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │   Schulungsfortschritt                                           │   │
│  │                                                                  │   │
│  │   ████████████████████████████░░░░░░░░░░  14/18 geschult (78%)  │   │
│  │                                                                  │   │
│  │   Frist: 02.08.2026 (174 Tage verbleibend)                      │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [ + Mitarbeiter anmelden ]  [ 📥 CSV Import ]                          │
│                                                                          │
│  Fortschritt nach Rolle                                                  │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                                                                │     │
│  │  Rolle          Kurs            Status   Fortschritt  Frist   │     │
│  │  ─────────────────────────────────────────────────────────────│     │
│  │                                                                │     │
│  │  CEO (1)        CEO-Schulung    ✅       █████ 100%   --      │     │
│  │  Max M.         (30 Min)        Bestanden                      │     │
│  │                                  Score: 92%                    │     │
│  │  ─────────────────────────────────────────────────────────────│     │
│  │                                                                │     │
│  │  HR (5)         HR-Schulung     ⏳       ███░░  60%  02.08.   │     │
│  │  Anna K.        (45 Min)        ✅ Bestanden                   │     │
│  │  Lisa M.                        ✅ Bestanden                   │     │
│  │  Tom S.                         ⏳ Modul 3/4                   │     │
│  │  Sara W.                        ⏳ Modul 2/4                   │     │
│  │  Jan R.                         ❌ Nicht begonnen              │     │
│  │  ─────────────────────────────────────────────────────────────│     │
│  │                                                                │     │
│  │  Developer (5)  Dev-Schulung    ⏳       ███░░  60%  02.08.   │     │
│  │  Peter H.       (60 Min)        ✅ Bestanden                   │     │
│  │  Maria L.                       ✅ Bestanden                   │     │
│  │  Klaus F.                       ✅ Bestanden                   │     │
│  │  Eva S.                         ⏳ Modul 4/5                   │     │
│  │  Tim K.                         ❌ Nicht begonnen              │     │
│  │  ─────────────────────────────────────────────────────────────│     │
│  │                                                                │     │
│  │  General (7)    Basis-Schulung  ❌       ███░░  57%  02.08.   │     │
│  │                 (20 Min)                                       │     │
│  │  4 geschult / 3 ausstehend                                    │     │
│  │  [Details anzeigen →]                                          │     │
│  │                                                                │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌───────────────────────────┐  ┌────────────────────────────────┐     │
│  │ Frist-Widget              │  │ Zertifikate                    │     │
│  │                           │  │                                │     │
│  │ Art. 4 AI Literacy        │  │ 14 Zertifikate ausgestellt     │     │
│  │ Pflicht seit: 02.02.2025  │  │                                │     │
│  │                           │  │ Letztes: Anna K. (HR)          │     │
│  │ Ihre Frist: 02.08.2026   │  │ am 07.02.2026                  │     │
│  │                           │  │                                │     │
│  │ ⚠ 4 Mitarbeiter          │  │ [📥 Alle herunterladen]        │     │
│  │   noch nicht geschult     │  │                                │     │
│  │                           │  │                                │     │
│  │ [Erinnerung senden]      │  │                                │     │
│  └───────────────────────────┘  └────────────────────────────────┘     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Status Icons Legend:
- ✅ = `risk-minimal` green — completed/passed
- ⏳ = `risk-limited` yellow — in progress
- ❌ = `risk-prohibited` red — not started / overdue

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ AI Literacy             │
│ Art. 4 AI Act           │
│                         │
│ ┌─────────────────────┐ │
│ │ Fortschritt         │ │
│ │ ████████░░░  78%    │ │
│ │ 14/18 geschult      │ │
│ │ Frist: 02.08.2026   │ │
│ └─────────────────────┘ │
│                         │
│ [+ Anmelden] [📥 CSV]  │
│                         │
│ ┌─────────────────────┐ │
│ │ CEO (1)          ✅ │ │
│ │ CEO-Schulung 30m    │ │
│ │ █████ 100%          │ │
│ ├─────────────────────┤ │
│ │ HR (5)           ⏳ │ │
│ │ HR-Schulung 45m     │ │
│ │ ███░░  60%          │ │
│ │ 3/5 geschult        │ │
│ ├─────────────────────┤ │
│ │ Developer (5)    ⏳ │ │
│ │ Dev-Schulung 60m    │ │
│ │ ███░░  60%          │ │
│ │ 3/5 geschult        │ │
│ ├─────────────────────┤ │
│ │ General (7)      ❌ │ │
│ │ Basis-Schulung 20m  │ │
│ │ ███░░  57%          │ │
│ │ 4/7 geschult        │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ Frist-Widget        │ │
│ │ Pflicht: 02.02.2025 │ │
│ │ Ihre Frist: 02.08.  │ │
│ │ ⚠ 4 ausstehend     │ │
│ │ [Erinnerung senden] │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 7. AI Tool Registration Wizard (5-Step Deployer)

> Ref: DATA-FLOWS.md Flow 2 — `GET /tools/new`

### Desktop (1280px) — Step 1: Tool Selection

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AI-Tool registrieren                                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  ● 1 Tool    ○ 2 Nutzung   ○ 3 Daten   ○ 4 Autonomie   ○ 5 ✓  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Schritt 1: Welches AI-Tool?                                             │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │ 🔍 Tool im Katalog suchen (200+ bekannte AI-Tools)...         │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Häufig verwendete Tools:                                                │
│  [ChatGPT]  [GitHub Copilot]  [Microsoft 365 Copilot]  [DeepL]         │
│  [Midjourney]  [HireVue]  [Grammarly]  [Personio AI]                   │
│                                                                          │
│  ── oder ──                                                              │
│                                                                          │
│  Tool manuell eingeben:                                                  │
│                                                                          │
│  Toolname *                        Anbieter *                            │
│  ┌───────────────────────────┐     ┌───────────────────────────┐        │
│  │                           │     │                           │        │
│  └───────────────────────────┘     └───────────────────────────┘        │
│                                                                          │
│  Herkunftsland                     Website                               │
│  ┌───────────────────────────┐     ┌───────────────────────────┐        │
│  │ USA                    ▼  │     │ https://...               │        │
│  └───────────────────────────┘     └───────────────────────────┘        │
│                                                                          │
│                                                   [   Weiter →   ]      │
│                                                    ↑ primary-600        │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Step 1 — Catalog Pre-fill (after selecting from catalog)

```
┌────────────────────────────────────────────────────────────────┐
│  ✅ Aus Katalog ausgewählt:                                    │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  ChatGPT                              [GPAI]           │   │
│  │  OpenAI · USA · chatbot, text_generation               │   │
│  │                                                        │   │
│  │  Vorausgefüllte Daten:                                 │   │
│  │  • Anbieter: OpenAI                                    │   │
│  │  • Land: USA                                           │   │
│  │  • Standard-Risiko: GPAI                               │   │
│  │  • Kategorie: Chatbot, Text Generation                 │   │
│  │                                                        │   │
│  │  ℹ Sie können alle Felder in den nächsten              │   │
│  │    Schritten anpassen.                                 │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│                                           [   Weiter →   ]    │
└────────────────────────────────────────────────────────────────┘
```

### Step 2: Usage Context

```
┌────────────────────────────────────────────────────────────────┐
│  ● 1 Tool    ● 2 Nutzung   ○ 3 Daten   ○ 4 Autonomie   ○ 5  │
│                                                                │
│  Schritt 2: Wie nutzen Sie dieses Tool?                        │
│                                                                │
│  Einsatzzweck *                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ Wofür setzt Ihre Firma ChatGPT ein?                    │   │
│  │ z.B. Texterstellung, Kundenservice, Code-Reviews       │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Einsatzbereich (Annex III Domain) *                           │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☐ Personalwesen / Recruitment                          │   │
│  │ ☐ Kundenservice                                        │   │
│  │ ☐ Finanzdienstleistungen / Kreditwürdigkeit            │   │
│  │ ☐ Bildung / Bewertung                                  │   │
│  │ ☐ Strafverfolgung                                      │   │
│  │ ☐ Kritische Infrastruktur                              │   │
│  │ ☐ Allgemein / Produktivität                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Häufigkeit der Nutzung *                                      │
│  ○ Täglich   ○ Wöchentlich   ○ Gelegentlich   ○ Einmalig     │
│                                                                │
│  [← Zurück]                              [   Weiter →   ]     │
└────────────────────────────────────────────────────────────────┘
```

### Step 3: Data & Users

```
┌────────────────────────────────────────────────────────────────┐
│  ● 1 Tool    ● 2 Nutzung   ● 3 Daten   ○ 4 Autonomie   ○ 5  │
│                                                                │
│  Schritt 3: Welche Daten und wer ist betroffen?                │
│                                                                │
│  Welche Datentypen verarbeitet das Tool? *                     │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ Texteingaben / Prompts                               │   │
│  │ ☐ Personenbezogene Daten (Name, E-Mail)                │   │
│  │ ☐ Biometrische Daten                                   │   │
│  │ ☐ Gesundheitsdaten                                     │   │
│  │ ☐ Finanz-/Kreditdaten                                  │   │
│  │ ☐ Bewerbungsunterlagen / CVs                           │   │
│  │ ☐ Geschäftsinterne Dokumente                           │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Wer ist von den Ergebnissen betroffen? *                      │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ ☑ Eigene Mitarbeiter                                   │   │
│  │ ☐ Kunden / Endverbraucher                              │   │
│  │ ☐ Bewerber / Kandidaten                                │   │
│  │ ☐ Schüler / Studierende                                │   │
│  │ ☐ Patienten                                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Sind schutzbedürftige Gruppen betroffen? *                    │
│  ○ Ja (Kinder, Behinderte, ältere Menschen)                   │
│  ○ Nein                                                       │
│  ○ Unklar — Eva fragen                                        │
│                                                                │
│  [← Zurück]                              [   Weiter →   ]     │
└────────────────────────────────────────────────────────────────┘
```

### Step 4: Autonomy & Oversight

```
┌────────────────────────────────────────────────────────────────┐
│  ● 1 Tool    ● 2 Nutzung   ● 3 Daten   ● 4 Autonomie   ○ 5  │
│                                                                │
│  Schritt 4: Autonomie und menschliche Kontrolle                │
│                                                                │
│  Wie autonom trifft das Tool Entscheidungen? *                 │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  ○  Beratend                                           │   │
│  │     Das Tool gibt Empfehlungen, ein Mensch              │   │
│  │     entscheidet.                                        │   │
│  │                                                        │   │
│  │  ○  Teilautonom                                        │   │
│  │     Das Tool trifft Vorentscheidungen, die ein          │   │
│  │     Mensch überprüft und bestätigt.                     │   │
│  │                                                        │   │
│  │  ○  Autonom                                            │   │
│  │     Das Tool trifft Entscheidungen ohne                 │   │
│  │     menschliches Eingreifen.                            │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  Gibt es menschliche Kontrollmechanismen? *                    │
│  ○ Ja — Ergebnisse werden immer geprüft                       │
│  ○ Teilweise — nur bei bestimmten Fällen                      │
│  ○ Nein — vollautomatischer Prozess                           │
│                                                                │
│  Beeinflusst das Tool Entscheidungen über                      │
│  natürliche Personen? *                                        │
│  ○ Ja (z.B. Einstellung, Kreditvergabe, Bewertung)           │
│  ○ Nein (nur interne Produktivität)                           │
│                                                                │
│  [← Zurück]                              [   Weiter →   ]     │
└────────────────────────────────────────────────────────────────┘
```

### Step 5: Review & Classify

```
┌────────────────────────────────────────────────────────────────┐
│  ● 1 Tool    ● 2 Nutzung   ● 3 Daten   ● 4 Autonomie   ● 5  │
│                                                                │
│  Schritt 5: Zusammenfassung prüfen & klassifizieren            │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  ChatGPT (OpenAI, USA)                                  │   │
│  │                                                        │   │
│  │  Einsatzzweck:  Texterstellung, Code-Reviews           │   │
│  │  Bereich:       Allgemein / Produktivität               │   │
│  │  Datentypen:    Texteingaben, Geschäftsdokumente       │   │
│  │  Betroffene:    Eigene Mitarbeiter                     │   │
│  │  Vulnerable:    Nein                                    │   │
│  │  Autonomie:     Beratend                               │   │
│  │  Kontrolle:     Ja — immer geprüft                     │   │
│  │  Personen:      Nein                                    │   │
│  │                                                [✏ Edit]│   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                │
│  ⚡ Die Klassifizierung basiert auf:                           │
│  • Rule Engine (Art. 5 verboten, Annex III)                    │
│  • LLM-Analyse (bei Unsicherheit)                              │
│  • Cross-Validation (bei Widerspruch)                          │
│                                                                │
│  [← Zurück]                         [ 🔍 Jetzt klassifizieren]│
│                                       ↑ primary-600, large    │
└────────────────────────────────────────────────────────────────┘
```

### Mobile (375px) — Wizard Steps

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ AI-Tool registrieren    │
│                         │
│ [1]─[2]─[3]─[4]─[5]   │
│  ●   ○   ○   ○   ○     │
│                         │
│ Welches AI-Tool?        │
│                         │
│ 🔍 Suchen...            │
│ ┌─────────────────────┐ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ Häufig:                 │
│ [ChatGPT] [Copilot]    │
│ [DeepL] [HireVue]      │
│                         │
│ ── oder ──              │
│                         │
│ Toolname *              │
│ ┌─────────────────────┐ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ Anbieter *              │
│ ┌─────────────────────┐ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ [       Weiter →      ] │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 8. AI Tool Classification Result

> Ref: DATA-FLOWS.md Flow 3 — after `POST /api/tools/:id/classify`

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Klassifizierungsergebnis                                                │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ChatGPT                                             [GPAI]     │   │
│  │  OpenAI · USA                                                    │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │  Risikoniveau: General Purpose AI (GPAI)                   │ │   │
│  │  │  Konfidenz: 95%  ████████████████████░                     │ │   │
│  │  │  Methode: Rule Engine (Annex III Match)                    │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  Begründung:                                                     │   │
│  │  ChatGPT ist ein GPAI-Modell (Art. 51). Ihre Nutzung im        │   │
│  │  Bereich "Allgemein / Produktivität" ohne Entscheidungen über   │   │
│  │  natürliche Personen fällt NICHT unter Annex III High-Risk.     │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Ihre Pflichten als Deployer                                             │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ☑  Art. 4 — AI Literacy                              [PFLICHT] │   │
│  │     Alle Mitarbeiter, die ChatGPT nutzen, müssen                │   │
│  │     geschult werden.                                            │   │
│  │     → Status: 8/12 geschult                                     │   │
│  │     [ Schulung verwalten → ]                                    │   │
│  │                                                                  │   │
│  │  ☑  Art. 50 — Transparenzpflicht                      [PFLICHT] │   │
│  │     Mitarbeiter müssen informiert werden, dass sie              │   │
│  │     mit einem AI-System interagieren.                           │   │
│  │     → Status: ❌ Noch nicht erfüllt                              │   │
│  │     [ Richtlinie erstellen → ]                                  │   │
│  │                                                                  │   │
│  │  ☐  Art. 26 — Deployer-Pflichten                   [EMPFOHLEN]  │   │
│  │     AI Usage Policy erstellen, Monitoring einrichten            │   │
│  │     → Status: ❌ Noch nicht begonnen                             │   │
│  │     [ AI Usage Policy erstellen → ]                             │   │
│  │                                                                  │   │
│  │  ☐  Art. 27 — FRIA                                [NICHT NÖTIG] │   │
│  │     Fundamental Rights Impact Assessment ist nur für            │   │
│  │     High-Risk AI-Nutzung erforderlich.                          │   │
│  │     ✅ Nicht erforderlich bei GPAI-Einstufung                    │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [← Zurück zu Tools]           [ Tool-Details anzeigen → ]              │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ Ergebnis                │
│                         │
│ ┌─────────────────────┐ │
│ │ ChatGPT      [GPAI] │ │
│ │ OpenAI · USA        │ │
│ │                     │ │
│ │ Konfidenz: 95%      │ │
│ │ ████████████████░   │ │
│ │                     │ │
│ │ GPAI-Modell, keine  │ │
│ │ High-Risk Nutzung.  │ │
│ └─────────────────────┘ │
│                         │
│ Ihre Pflichten          │
│                         │
│ ┌─────────────────────┐ │
│ │ ☑ Art. 4 Literacy   │ │
│ │   [PFLICHT]         │ │
│ │   8/12 geschult     │ │
│ │   [Verwalten →]     │ │
│ ├─────────────────────┤ │
│ │ ☑ Art. 50 Transpar. │ │
│ │   [PFLICHT]         │ │
│ │   ❌ Nicht erfüllt   │ │
│ │   [Erstellen →]     │ │
│ ├─────────────────────┤ │
│ │ ☐ Art. 26 Deployer  │ │
│ │   [EMPFOHLEN]       │ │
│ │   [Policy →]        │ │
│ ├─────────────────────┤ │
│ │ ☐ Art. 27 FRIA      │ │
│ │   ✅ Nicht nötig     │ │
│ └─────────────────────┘ │
│                         │
│ [← Tools] [Details →]  │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 9. AI Tool Detail Page

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ← Zurück zu AI Tools                                                    │
│                                                                          │
│  HireVue                                                    [HIGH]      │
│  HireVue Inc. · USA · Personalwesen / Recruitment                       │
│  Registriert am 05.02.2026                                              │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐          │
│  │ Compliance     │  │ AI Literacy    │  │ FRIA             │          │
│  │                │  │                │  │                  │          │
│  │    35%         │  │  2/5 geschult  │  │  ⚠ Erforderlich  │          │
│  │  ███░░░░░░░   │  │  ██░░░  40%   │  │  Nicht begonnen  │          │
│  │                │  │                │  │                  │          │
│  └────────────────┘  └────────────────┘  └──────────────────┘          │
│                                                                          │
│  ─── Tabs ───────────────────────────────────────────────────           │
│  [Anforderungen]  [Dokumente]  [Schulung]  [Audit-Trail]               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Deployer-Anforderungen (Art. 26 High-Risk)                      │   │
│  │                                                                  │   │
│  │  ☑  Art. 4 — AI Literacy                              8/10 ✅   │   │
│  │     2 HR-Mitarbeiter noch nicht geschult                         │   │
│  │     Frist: 02.08.2026                                           │   │
│  │                                                                  │   │
│  │  ☐  Art. 26(1) — Bestimmungsgemäße Verwendung          0%  ❌   │   │
│  │     Sicherstellen, dass HireVue gemäß                           │   │
│  │     Gebrauchsanweisung des Anbieters eingesetzt wird            │   │
│  │                                                                  │   │
│  │  ☐  Art. 26(2) — Menschliche Aufsicht                  0%  ❌   │   │
│  │     HR-Verantwortliche als Human Oversight benennen             │   │
│  │                                                                  │   │
│  │  ☑  Art. 26(5) — FRIA durchführen                       0%  ⚠   │   │
│  │     Fundamental Rights Impact Assessment erforderlich           │   │
│  │     [ FRIA starten → ]                                          │   │
│  │                                                                  │   │
│  │  ☐  Art. 50 — Transparenzpflicht                        0%  ❌   │   │
│  │     Bewerber müssen informiert werden                           │   │
│  │     [ Richtlinie erstellen → ]                                  │   │
│  │                                                                  │   │
│  │  ☐  Art. 26(7) — Vorfallmeldung                        --  ⏸   │   │
│  │     Bei Vorfall: Meldung an Marktüberwachungsbehörde            │   │
│  │     Noch kein Vorfall gemeldet                                  │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [✏ Tool bearbeiten]   [🔄 Neu klassifizieren]   [🗑 Löschen]          │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ ← Zurück                │
│                         │
│ HireVue         [HIGH]  │
│ HireVue Inc. · USA      │
│                         │
│ ┌───┐ ┌───┐ ┌───┐      │
│ │35%│ │2/5│ │⚠  │      │
│ │   │ │   │ │FRI│      │
│ └───┘ └───┘ └───┘      │
│                         │
│ [Anforderungen ▼]       │
│                         │
│ ┌─────────────────────┐ │
│ │ ☑ Art. 4 Literacy   │ │
│ │   8/10 ✅            │ │
│ ├─────────────────────┤ │
│ │ ☐ Art. 26(1) Nutzung│ │
│ │   ❌ 0%              │ │
│ ├─────────────────────┤ │
│ │ ☐ Art. 26(2) Aufsich│ │
│ │   ❌ 0%              │ │
│ ├─────────────────────┤ │
│ │ ☑ Art. 26(5) FRIA   │ │
│ │   ⚠ [Starten →]     │ │
│ ├─────────────────────┤ │
│ │ ☐ Art. 50 Transparenz│ │
│ │   ❌ [Erstellen →]   │ │
│ └─────────────────────┘ │
│                         │
│ [✏ Edit] [🔄] [🗑]     │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 10. AI Literacy — Course View (Employee)

> Ref: DATA-FLOWS.md Flow 11 — `GET /api/literacy/courses/:courseId`
> This is what the **employee** sees when they start a training course.

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                              Max Mustermann [⚙]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  AI Literacy Schulung                                                    │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  🎓  Developer-Schulung: AI Act für Entwickler                   │   │
│  │                                                                  │   │
│  │  Dauer: 60 Minuten  ·  5 Module  ·  Sprache: Deutsch            │   │
│  │                                                                  │   │
│  │  Ihr Fortschritt:  ████████████░░░░░░░░  3/5 Module (60%)       │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Module                                                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ✅  Modul 1: Was ist der AI Act?                    15 Min      │   │
│  │      Grundlagen der EU-Regulierung für AI                       │   │
│  │      Score: 90%                            [Wiederholen →]      │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ✅  Modul 2: Risikoklassen verstehen                12 Min      │   │
│  │      Prohibited, High-Risk, GPAI, Limited, Minimal              │   │
│  │      Score: 85%                            [Wiederholen →]      │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ✅  Modul 3: AI im Entwickleralltag                 10 Min      │   │
│  │      Copilot, ChatGPT, Code-Generierung                        │   │
│  │      Score: 95%                            [Wiederholen →]      │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ⏳  Modul 4: Deployer-Pflichten für Entwickler       12 Min     │   │
│  │      Art. 26, 50 — was müssen Sie beachten?                     │   │
│  │                                              [ Starten → ]      │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  🔒  Modul 5: Quiz — Abschlusstest                   11 Min     │   │
│  │      10 Fragen · ≥70% zum Bestehen                             │   │
│  │      Erst nach Modul 4 verfügbar                                │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ 🎓 Developer-Schulung   │
│ 60 Min · 5 Module       │
│                         │
│ ████████░░░  3/5 (60%)  │
│                         │
│ ┌─────────────────────┐ │
│ │ ✅ 1. Was ist der    │ │
│ │    AI Act?  15m      │ │
│ │    Score: 90%        │ │
│ ├─────────────────────┤ │
│ │ ✅ 2. Risikoklassen  │ │
│ │    12m · Score: 85%  │ │
│ ├─────────────────────┤ │
│ │ ✅ 3. AI im Alltag   │ │
│ │    10m · Score: 95%  │ │
│ ├─────────────────────┤ │
│ │ ⏳ 4. Deployer-      │ │
│ │    Pflichten  12m    │ │
│ │    [Starten →]       │ │
│ ├─────────────────────┤ │
│ │ 🔒 5. Abschlusstest  │ │
│ │    11m · 10 Fragen   │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 11. AI Literacy — Module Content + Quiz (Employee)

> Ref: DATA-FLOWS.md Flow 11 — `GET /api/literacy/courses/:courseId/modules/:moduleId`

### Desktop (1280px) — Content View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                              Max Mustermann [⚙]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ← Developer-Schulung  ·  Modul 4 von 5                                 │
│                                                                          │
│  Deployer-Pflichten für Entwickler                           12 Min     │
│  ████████████████████████░░░░░░░░░░  Seite 2 von 4                      │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ## Art. 26: Pflichten der Betreiber von Hochrisiko-AI          │   │
│  │                                                                  │   │
│  │  Als Entwickler, der AI-Tools im Unternehmen einsetzt, sind     │   │
│  │  Sie Teil der Compliance-Kette. Art. 26 definiert:              │   │
│  │                                                                  │   │
│  │  1. **Bestimmungsgemäße Verwendung**                             │   │
│  │     AI-Systeme nur gemäß der Gebrauchsanweisung des             │   │
│  │     Anbieters einsetzen.                                        │   │
│  │                                                                  │   │
│  │  2. **Menschliche Aufsicht**                                     │   │
│  │     Ergebnisse von AI-Systemen immer kritisch prüfen.           │   │
│  │     Nie blind auf AI-Output vertrauen.                           │   │
│  │                                                                  │   │
│  │  > 💡 **Praxisbeispiel:**                                       │   │
│  │  > GitHub Copilot schlägt Code vor → Sie MÜSSEN den Code        │   │
│  │  > reviewen, bevor er in Produktion geht. Das ist Art. 26(2)    │   │
│  │  > in Aktion.                                                   │   │
│  │                                                                  │   │
│  │  3. **Protokollierung**                                          │   │
│  │     Logs der AI-Nutzung aufbewahren (mind. 6 Monate)           │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [← Vorherige Seite]                              [Nächste Seite →]    │
│                                                                          │
│  Seite: [1] [2] [3] [4 Quiz]                                            │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Desktop (1280px) — Quiz View

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                              Max Mustermann [⚙]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ← Developer-Schulung  ·  Modul 4  ·  Quiz                              │
│                                                                          │
│  Quiz: Deployer-Pflichten                         Frage 2 von 5         │
│  ██████████░░░░░░░░░░░░░░░                                               │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  Frage 2:                                                        │   │
│  │  GitHub Copilot schlägt eine Funktion vor. Was müssen            │   │
│  │  Sie als Deployer gemäß Art. 26(2) tun?                         │   │
│  │                                                                  │   │
│  │  ○  A) Den Code direkt in Produktion übernehmen                 │   │
│  │                                                                  │   │
│  │  ●  B) Den Code reviewen und vor Deployment prüfen              │   │
│  │                                                                  │   │
│  │  ○  C) Den Code löschen und manuell schreiben                   │   │
│  │                                                                  │   │
│  │  ○  D) Nur bei Security-relevantem Code prüfen                  │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [← Vorherige]                                   [Nächste Frage →]     │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Quiz Result + Certificate

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance                              Max Mustermann [⚙]│
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │         🎉  Herzlichen Glückwunsch!                              │   │
│  │                                                                  │   │
│  │  Sie haben die Developer-Schulung bestanden.                    │   │
│  │                                                                  │   │
│  │  Score: 90% (18/20 richtig)                                     │   │
│  │  ████████████████████████████████████░░░░                        │   │
│  │                                                                  │   │
│  │  Mindestanforderung: 70%  ✅                                     │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────────┐ │   │
│  │  │                                                            │ │   │
│  │  │           ZERTIFIKAT                                       │ │   │
│  │  │                                                            │ │   │
│  │  │   AI Act Literacy — Developer                              │ │   │
│  │  │                                                            │ │   │
│  │  │   Max Mustermann                                           │ │   │
│  │  │   Muster GmbH                                              │ │   │
│  │  │                                                            │ │   │
│  │  │   Datum: 09.02.2026                                        │ │   │
│  │  │   Score: 90%                                               │ │   │
│  │  │   ID: CERT-2026-00142                                      │ │   │
│  │  │                                                            │ │   │
│  │  └────────────────────────────────────────────────────────────┘ │   │
│  │                                                                  │   │
│  │  [ 📥 Zertifikat herunterladen (PDF) ]    [ ← Zur Übersicht ]  │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Ergebnisse nach Modul:                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Modul 1: Was ist der AI Act?            ✅  90%                 │   │
│  │  Modul 2: Risikoklassen verstehen        ✅  85%                 │   │
│  │  Modul 3: AI im Entwickleralltag         ✅  95%                 │   │
│  │  Modul 4: Deployer-Pflichten             ✅  90%                 │   │
│  │  Modul 5: Abschlusstest                  ✅  90%                 │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px) — Quiz + Result

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ ← Modul 4 · Quiz       │
│                         │
│ Frage 2/5               │
│ ██████░░░░░░            │
│                         │
│ GitHub Copilot schlägt  │
│ eine Funktion vor. Was  │
│ müssen Sie tun?         │
│                         │
│ ○ A) Direkt übernehmen  │
│ ● B) Reviewen + prüfen  │
│ ○ C) Löschen + manuell  │
│ ○ D) Nur bei Security   │
│                         │
│ [← Zurück] [Weiter →]  │
│                         │
│ ═══════════════════════ │
│                         │
│ 🎉 Bestanden!           │
│ Score: 90% (18/20)      │
│ █████████████████░      │
│                         │
│ [📥 Zertifikat PDF]     │
│ [← Übersicht]           │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 12. FRIA Assessment Wizard (Art. 27)

> Ref: DATA-FLOWS.md Flow 13 — 6 sections per Art. 27

### Desktop (1280px) — Overview + Section

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRIA — Fundamental Rights Impact Assessment                             │
│  HireVue (High-Risk · Personalwesen)                        Art. 27     │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Fortschritt: ████████████░░░░░░░░░░  2/6 Abschnitte (33%)      │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  ✅  1. Allgemeine Informationen                    [Bearbeiten] │   │
│  │      Einsatzzweck, Häufigkeit, betroffene Prozesse              │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ✅  2. Betroffene Personen                         [Bearbeiten] │   │
│  │      Kategorien, Umfang, besonders schutzbedürftige             │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ⏳  3. Spezifische Risiken für Grundrechte         [Fortsetzen]│   │
│  │      Diskriminierung, Privatsphäre, Meinungsfreiheit            │   │
│  │      AI-Entwurf verfügbar                                       │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ○   4. Menschliche Aufsichtsmaßnahmen              [Starten]  │   │
│  │      Kontrollmechanismen, Eskalationsprozesse                   │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ○   5. Risikominderungsmaßnahmen                    [Starten]  │   │
│  │      Technische + organisatorische Maßnahmen                    │   │
│  │  ────────────────────────────────────────────────────────────── │   │
│  │                                                                  │   │
│  │  ○   6. Monitoring-Plan                              [Starten]  │   │
│  │      Überwachung, Kennzahlen, Überprüfungsintervalle            │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [← Zurück zu HireVue]               [ 📥 Als PDF exportieren ]        │
│                                       (erst nach Abschluss aller)       │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### FRIA Section Editor (with AI Draft)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  FRIA · HireVue · Abschnitt 3: Spezifische Risiken                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ [AI-Entwurf]  Dieser Text wurde von Mistral AI vorgeschlagen.   │   │
│  │ Bitte prüfen und anpassen Sie den Inhalt.                       │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  B  I  U  H1  H2  •  1.  ""  ─────────────────────────────     │   │
│  │ ────────────────────────────────────────────────────────────    │   │
│  │                                                                  │   │
│  │  ## 3. Spezifische Risiken für Grundrechte                      │   │
│  │                                                                  │   │
│  │  ### 3.1 Recht auf Nichtdiskriminierung (Art. 21 GRC)          │   │
│  │                                                                  │   │
│  │  HireVue analysiert Video-Interviews mittels AI. Dabei          │   │
│  │  bestehen folgende Risiken:                                     │   │
│  │                                                                  │   │
│  │  - **Algorithmische Voreingenommenheit:** Das System könnte     │   │
│  │    bestimmte Akzente, Gesichtsausdrücke oder kulturelle         │   │
│  │    Verhaltensweisen benachteiligen.                              │   │
│  │                                                                  │   │
│  │  - **Indirekte Diskriminierung:** Korrelation zwischen          │   │
│  │    geschützten Merkmalen (Geschlecht, Alter, ethnische          │   │
│  │    Herkunft) und AI-Bewertung.                                  │   │
│  │                                                                  │   │
│  │  ### 3.2 Recht auf Privatsphäre (Art. 7 GRC)                   │   │
│  │  ...                                                             │   │
│  │                                                                  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  [🤖 Neu generieren]  [↩ Original wiederherstellen]                     │
│                                                                          │
│  [← Vorheriger Abschnitt]                          [Speichern & Weiter]│
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ FRIA · HireVue          │
│ Art. 27                 │
│                         │
│ ████████░░░  2/6 (33%)  │
│                         │
│ ┌─────────────────────┐ │
│ │ ✅ 1. Allgemein      │ │
│ │    [Bearbeiten]      │ │
│ ├─────────────────────┤ │
│ │ ✅ 2. Betroffene     │ │
│ │    [Bearbeiten]      │ │
│ ├─────────────────────┤ │
│ │ ⏳ 3. Risiken        │ │
│ │    AI-Entwurf ✨      │ │
│ │    [Fortsetzen →]    │ │
│ ├─────────────────────┤ │
│ │ ○ 4. Aufsicht       │ │
│ ├─────────────────────┤ │
│ │ ○ 5. Minderung      │ │
│ ├─────────────────────┤ │
│ │ ○ 6. Monitoring     │ │
│ └─────────────────────┘ │
│                         │
│ [← HireVue] [📥 PDF]   │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 13. Eva AI Chat

> Ref: DATA-FLOWS.md Flow 4 — WebSocket chat, deployer-focused

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐   │
│  │ Gespräche        │  │                                            │   │
│  │                  │  │  🤖 Eva — AI Act Beraterin                │   │
│  │ ● HireVue FRIA   │  │                                            │   │
│  │   vor 2 Std.     │  │  ┌────────────────────────────────────┐   │   │
│  │                  │  │  │ 🤖 Eva:                            │   │   │
│  │ ○ Slack AI risk?  │  │  │ Hallo Max! Ich bin Eva, Ihre AI    │   │   │
│  │   vor 1 Tag      │  │  │ Act Beraterin. Wie kann ich Ihnen  │   │   │
│  │                  │  │  │ helfen?                             │   │   │
│  │ ○ GPAI Pflichten  │  │  └────────────────────────────────────┘   │   │
│  │   vor 3 Tagen    │  │                                            │   │
│  │                  │  │  ┌────────────────────────────────────┐   │   │
│  │                  │  │  │ 👤 Sie:                            │   │   │
│  │                  │  │  │ Ist Slack AI für uns high-risk?     │   │   │
│  │                  │  │  └────────────────────────────────────┘   │   │
│  │                  │  │                                            │   │
│  │                  │  │  ┌────────────────────────────────────┐   │   │
│  │                  │  │  │ 🤖 Eva:                            │   │   │
│  │                  │  │  │ Basierend auf Ihren Angaben:        │   │   │
│  │                  │  │  │                                     │   │   │
│  │                  │  │  │ Slack AI wird als **Limited Risk**   │   │   │
│  │                  │  │  │ eingestuft (Art. 50). Es handelt   │   │   │
│  │                  │  │  │ sich um ein Chatbot-System, das     │   │   │
│  │                  │  │  │ keine Entscheidungen über           │   │   │
│  │                  │  │  │ natürliche Personen trifft.         │   │   │
│  │                  │  │  │                                     │   │   │
│  │                  │  │  │ **Ihre Pflichten:**                  │   │   │
│  │                  │  │  │ 1. Art. 4: AI Literacy ☑            │   │   │
│  │                  │  │  │ 2. Art. 50: Transparenz ☐           │   │   │
│  │                  │  │  │                                     │   │   │
│  │                  │  │  │ [ 🔍 Jetzt klassifizieren ]         │   │   │
│  │                  │  │  │ [ 📋 Tool registrieren ]            │   │   │
│  │                  │  │  └────────────────────────────────────┘   │   │
│  │                  │  │                                            │   │
│  │ [+ Neues         │  │  Schnellaktionen:                         │   │
│  │  Gespräch]       │  │  [Tool klassifizieren] [FRIA starten]     │   │
│  │                  │  │  [Schulung verwalten]  [Pflichten prüfen] │   │
│  │                  │  │                                            │   │
│  │                  │  │  ┌────────────────────────────────────┐   │   │
│  │                  │  │  │ Ihre Frage...                  [→] │   │   │
│  │                  │  │  └────────────────────────────────────┘   │   │
│  └──────────────────┘  └────────────────────────────────────────────┘   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] Eva          [≡]   │
├─────────────────────────┤
│                         │
│ 🤖 Eva:                 │
│ Hallo Max! Wie kann     │
│ ich Ihnen helfen?       │
│                         │
│ 👤 Sie:                 │
│ Ist Slack AI high-risk? │
│                         │
│ 🤖 Eva:                 │
│ **Limited Risk** (Art.  │
│ 50). Chatbot, keine     │
│ Entscheidungen über     │
│ natürliche Personen.    │
│                         │
│ Pflichten:              │
│ 1. Art. 4 Literacy ☑    │
│ 2. Art. 50 Transp. ☐    │
│                         │
│ [🔍 Klassifizieren]     │
│ [📋 Registrieren]       │
│                         │
│ ─────────────────────── │
│ [Tool klassifiz.] [FRIA]│
│                         │
│ ┌─────────────────────┐ │
│ │ Ihre Frage...   [→] │ │
│ └─────────────────────┘ │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## 14. Settings Page

### Desktop (1280px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  [🛡] AI Act Compliance    Dashboard  AI Tools  AI Literacy  Docs  Eva  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Einstellungen                                                           │
│                                                                          │
│  ┌──────────────┐  ┌──────────────────────────────────────────────────┐ │
│  │              │  │                                                  │ │
│  │  Profil      │  │  Unternehmen                                     │ │
│  │  ● aktiv     │  │                                                  │ │
│  │              │  │  Firmenname *                                     │ │
│  │  Unternehmen │  │  ┌──────────────────────────────────────────┐   │ │
│  │              │  │  │ Muster GmbH                              │   │ │
│  │  Team        │  │  └──────────────────────────────────────────┘   │ │
│  │              │  │                                                  │ │
│  │  Abo & Plan  │  │  Branche                  Unternehmensgröße     │ │
│  │              │  │  ┌──────────────────┐     ┌──────────────────┐  │ │
│  │  Sicherheit  │  │  │ Technologie   ▼  │     │ 50-249 MA     ▼  │  │ │
│  │              │  │  └──────────────────┘     └──────────────────┘  │ │
│  │              │  │                                                  │ │
│  │              │  │  Land                      USt-IdNr.             │ │
│  │              │  │  ┌──────────────────┐     ┌──────────────────┐  │ │
│  │              │  │  │ Deutschland   ▼  │     │ DE123456789      │  │ │
│  │              │  │  └──────────────────┘     └──────────────────┘  │ │
│  │              │  │                                                  │ │
│  │              │  │  Website                                         │ │
│  │              │  │  ┌──────────────────────────────────────────┐   │ │
│  │              │  │  │ https://muster-gmbh.de                   │   │ │
│  │              │  │  └──────────────────────────────────────────┘   │ │
│  │              │  │                                                  │ │
│  │              │  │  [       Speichern       ]                       │ │
│  │              │  │                                                  │ │
│  └──────────────┘  └──────────────────────────────────────────────────┘ │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  © 2026 AI Act Compliance Platform                          v0.1.0       │
└──────────────────────────────────────────────────────────────────────────┘
```

### Settings Tabs (not all wireframed in detail):

| Tab | Content | Sprint |
|-----|---------|--------|
| **Profil** | Name, E-Mail (read-only from Ory), Sprache (DE/EN) | Sprint 1 |
| **Unternehmen** | Firmenname, Branche, Größe, Land, USt-IdNr. | Sprint 1 |
| **Team** | Mitglieder einladen, Rollen (Owner/Member), entfernen | Sprint 1 |
| **Abo & Plan** | Aktueller Plan, Upgrade, Nutzungslimits, Stripe Portal | Sprint 5 |
| **Sicherheit** | MFA aktivieren (Ory), Sitzungen verwalten, API-Keys | Sprint 5 |

### Mobile (375px)

```
┌─────────────────────────┐
│ [🛡] AI Act      [≡]    │
├─────────────────────────┤
│                         │
│ Einstellungen           │
│                         │
│ [Profil][Firma][Team]   │
│ [Abo][Sicherheit]       │
│                         │
│ Unternehmen             │
│                         │
│ Firmenname *            │
│ ┌─────────────────────┐ │
│ │ Muster GmbH         │ │
│ └─────────────────────┘ │
│                         │
│ Branche                 │
│ ┌─────────────────────┐ │
│ │ Technologie      ▼  │ │
│ └─────────────────────┘ │
│                         │
│ Größe                   │
│ ┌─────────────────────┐ │
│ │ 50-249 MA        ▼  │ │
│ └─────────────────────┘ │
│                         │
│ Land                    │
│ ┌─────────────────────┐ │
│ │ Deutschland      ▼  │ │
│ └─────────────────────┘ │
│                         │
│ [    Speichern        ] │
│                         │
├─────────────────────────┤
│ [Dashboard][Tools]      │
│ [Literacy][Docs][Eva]   │
└─────────────────────────┘
```

---

## Interaction Notes

### Navigation Pattern
- **Desktop:** Horizontal top nav with text links
- **Mobile:** Hamburger menu + bottom tab bar for primary sections
- Bottom nav icons: Dashboard (grid), AI Tools (cpu), AI Literacy (graduation-cap), Documents (file-text), Eva (message-circle)

### Form Validation
- Required fields marked with `*`
- Inline validation errors below fields in `risk-prohibited` red
- Submit button disabled until all required fields valid

### Loading States
- All data-fetching pages show `<Skeleton />` components
- Tables show skeleton rows (3 rows of animated placeholders)
- Progress bars show skeleton animation before data loads

### Responsive Breakpoints
- `xs` (0-639px): Single column, bottom nav, card-based tables
- `sm` (640px): Slight padding increase
- `md` (768px): Two-column widget grid
- `lg` (1024px): Full table view, sidebar option
- `xl` (1280px): Full desktop layout with max-width container
