# Design Brief for Nina — Sprint 3

**Version:** 2.0.0
**Date:** 2026-02-11
**From:** PO
**For:** Nina (Frontend+UX, Claude Opus 4.6)
**Sprint:** 3 (LLM Classification + Requirements Mapping + Dashboard)
**Ref:** PRODUCT-BACKLOG.md, wireframes/sprint-1-2-wireframes.md

---

## Контекст

Sprint 1-2 завершены. Весь фронтенд сделан как **wireframe-first** — функциональный, но без визуального дизайна. Sprint 3 добавляет новые экраны (Dashboard, Requirements). Нужен полный дизайн для всех страниц — и старых, и новых.

**Задача:** Получить от внешнего дизайнера (или LLM-дизайнера) высококачественные макеты для ВСЕХ экранов, чтобы Nina могла имплементировать их в Next.js + TailwindCSS + shadcn/ui.

---

## Полный список экранов (19 screens)

### Группа A — Публичные (до авторизации)

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 01 | **Landing Page** | `/` | 0 | wireframe | Hero + 6 feature cards + 4 pricing tiers + EU trust bar + CTA |
| 02 | **Login** | `/auth/login` | 1 | wireframe | Email + magic link (primary), password (secondary), "check your email" state |
| 03 | **Register** | `/auth/register` | 1 | wireframe | 2-step wizard: Step 1 (account), Step 2 (company + industry) |

### Группа B — App Shell (layout)

| # | Экран | Компонент | Sprint | Статус | Описание |
|---|-------|-----------|--------|--------|----------|
| 04 | **Header** | `Header.tsx` | 0 | wireframe | Logo + nav links (desktop), hamburger (mobile) |
| 05 | **Sidebar** | `Sidebar.tsx` | 0 | wireframe | Desktop: collapsible nav. Items: Dashboard, Inventar, Katalog, Literacy, Dokumente, Eva, Settings |
| 06 | **Mobile Bottom Tab** | planned | 3 | NEW | 5 tabs: Dashboard, Tools, Literacy, Docs, Eva |

### Группа C — Core App Pages (Sprint 1-2, wireframes)

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 07 | **Dashboard** | `/dashboard` | 1 | wireframe (basic) | Заглушка. Sprint 3 полностью переделывает — см. экран 15 |
| 08 | **AI Tool Inventory** | `/tools/inventory` | 2 | wireframe | Table + search + dropdown filters (Risk, Status, Domain) + pagination + empty state |
| 09 | **Catalog Search** | `/tools/catalog` | 1 | wireframe | Card grid (1/2/3 cols responsive) + search + category/risk filters + detail dialog |
| 10 | **5-Step Registration Wizard** | `/tools/new` | 2 | wireframe | 5 steps: Tool → Usage → Data → Autonomy → Review. Progress bar, auto-save, validation |
| 11 | **Classification Result** | component in wizard | 2 | wireframe | Risk badge (large), confidence %, method, reasoning text, article refs, requirements list |
| 12 | **Tool Detail** | `/tools/[id]` | 2 | wireframe | Header + 3 metric cards (risk, status, confidence) + requirements tab + actions |

### Группа D — Sprint 3 NEW Screens

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 13 | **Compliance Dashboard** (полный) | `/dashboard` | 3 | **NEW** | Заменяет заглушку. Центральный экран CEO/CTO |
| 14 | **Requirements Checklist** | `/tools/[id]/requirements` | 3 | **NEW** | Deployer obligations checklist с рекомендациями |
| 15 | **Classification Detail Tab** | tab on `/tools/[id]` | 3 | **NEW** | LLM reasoning, cross-validation, classification history |

### Группа E — Planned (Sprint 4+, wireframes ready)

| # | Экран | Роут | Sprint | Описание |
|---|-------|------|--------|----------|
| 16 | **Eva Chat** | `/eva` (side panel) | 4 | Chat bubbles, quick actions, tool-calling UI, disclaimer |
| 17 | **FRIA Wizard** | `/tools/[id]/fria` | 4-5 | 6-section assessment, AI drafts, rich text editor |
| 18 | **Settings** | `/settings` | 4 | Tabs: Profile, Company, Team, Subscription, Security |
| 19 | **AI Literacy Dashboard** | `/literacy` | 8+ | Progress bar, per-role breakdown, certificates |

---

## Детальные спецификации — Группа A (Публичные)

### Screen 01: Landing Page `/`

**Wireframe:** `wireframes/sprint-1-2-wireframes.md` → Section 1

**Секции (сверху вниз):**
1. **Navbar** — Logo `[🛡] AI Act Compliance` + nav: Funktionen, Preise, Kontakt + [Anmelden] [Kostenlos starten]
2. **Hero** — H1: "AI Act Compliance für Ihr Unternehmen", subtitle: "Die Self-Service-Plattform... Für Unternehmen, die AI nutzen — nicht bauen.", 2 CTA buttons + 3 trust bullets (Art. 4, 70% non-compliant, ab €49)
3. **Features Grid** — 6 cards (2x3): AI-Tool Inventar, AI Literacy, Risiko-Klassifizierung, FRIA & Dokumentation, Eva AI-Assistentin, Compliance Dashboard
4. **Pricing** — 4 tiers side-by-side: Free (€0), Starter (€49), Growth (€149, "beliebteste" badge), Scale (€399)
5. **EU Trust Bar** — 6 EU service logos with flags: 🇩🇪 Hetzner, 🇫🇷 Brevo, 🇪🇪 Plausible, 🇩🇪 Ory, 🇫🇷 Mistral, 🇱🇹 Better Uptime + "Ihre Daten verlassen NIEMALS die EU"
6. **Final CTA** — Large centered button
7. **Footer** — © + legal links

**Mobile:** Single-column, stacked cards, hamburger menu, pricing scrolls horizontally

---

### Screen 02: Login `/auth/login`

**States:**
- **Default** — Email input + [Magic Link senden] primary button + "Oder mit Passwort" toggle → reveals password field + [Anmelden]
- **Magic Link Sent** — Icon + "Prüfen Sie Ihre E-Mail" + email shown + [Erneut senden] link
- **Error** — Inline validation on email, API error banner

**Layout:** Centered card (max-w-md), logo above, "Noch kein Konto? Registrieren" link below

---

### Screen 03: Register `/auth/register`

**Step 1 — Account:**
- Fields: Vorname, Nachname, E-Mail, Passwort (with strength indicator)
- [Konto erstellen] primary button
- "Bereits ein Konto? Anmelden" link

**Step 2 — Company:**
- Fields: Firmenname, Branche (dropdown: Technology, Healthcare, Finance, HR, Education, Legal, Manufacturing, Other), Unternehmensgröße (dropdown: 1-10, 11-50, 51-200, 201-500, 500+), Land (dropdown)
- [Weiter zum Dashboard] primary button + [Überspringen] ghost link

**Progress:** Step indicator (1/2, 2/2) at top

---

## Детальные спецификации — Группа C (Sprint 1-2 Wireframes)

### Screen 08: AI Tool Inventory `/tools/inventory`

**Layout:**
- **Header row:** H1 "AI-Tool Inventar" + [+ AI-Tool hinzufügen] primary + [Katalog durchsuchen] secondary
- **Filters row:** Search input + 3 dropdown filters (Risk Level, Compliance Status, Domain)
- **Table (desktop):**

| Name | Vendor | Domain | Risk Level | Status | Compliance | Actions |
|------|--------|--------|------------|--------|------------|---------|
| ChatGPT | OpenAI | General | 🟢 Minimal | Classified | 45% | [View] |
| HireVue | HireVue | HR | 🟠 High | In Progress | 20% | [View] |

- **Cards (mobile):** Stacked cards with risk badge, name, vendor, status
- **Pagination:** "Showing 1-10 of 23" + Previous/Next
- **Empty state:** Illustration + "Noch keine AI-Tools. Beginnen Sie mit dem Katalog."

**Risk badges (CRITICAL — consistent everywhere):**
- 🔴 Prohibited — `bg-red-100 text-red-800`
- 🟠 High Risk — `bg-orange-100 text-orange-800`
- 🔵 GPAI — `bg-blue-100 text-blue-800`
- 🟡 Limited — `bg-yellow-100 text-yellow-800`
- 🟢 Minimal — `bg-green-100 text-green-800`

---

### Screen 09: Catalog Search `/tools/catalog`

**Layout:**
- **Search:** Full-width input with 🔍 icon, debounced 300ms
- **Filters:** Category chips (All, HR, Healthcare, Finance, Education, General...) + Risk Level dropdown
- **Grid:** 3 columns (desktop), 2 (tablet), 1 (mobile)
- **Card:** Tool name, vendor, risk badge, short description, [+ Hinzufügen] button
- **Detail Dialog:** Modal with full description, default risk, data types, Annex III domain, [Zum Inventar hinzufügen] CTA

---

### Screen 10: 5-Step Wizard `/tools/new`

**Progress bar:** 5 steps with labels, current step highlighted (primary-600), completed = checkmark

**Step 1 — AI-Tool:**
- "Aus Katalog wählen" button (opens catalog dialog) OR manual entry
- Fields: Name*, Vendor*, Description, Website
- Pre-fill from catalog if selected

**Step 2 — Nutzungskontext:**
- Fields: Purpose* (textarea), Domain* (dropdown: biometrics, HR, education, law_enforcement, immigration, infrastructure, healthcare, finance, general), Additional notes

**Step 3 — Daten & Betroffene:**
- Fields: Data Types* (multi-select checkboxes: personal, biometric, health, financial, behavioral, location), Affected Persons* (multi-select: employees, customers, patients, students, citizens, applicants), Vulnerable Groups? (toggle)

**Step 4 — Autonomie & Kontrolle:**
- Fields: Autonomy Level* (radio: advisory/semi-autonomous/fully-autonomous), Human Oversight? (toggle), Affects Natural Persons? (toggle)

**Step 5 — Zusammenfassung:**
- Read-only summary of all fields in card format
- [Jetzt klassifizieren] large primary CTA
- [Zurück] ghost button

**All steps:** [Zurück] + [Weiter] navigation, auto-save indicator ("Gespeichert ✓")

---

### Screen 11: Classification Result (shown after Step 5)

**Layout (centered, max-w-2xl):**
- **Risk Badge (large):** Full-width colored banner — "🟠 High Risk" with confidence "87%"
- **Method:** "Rule-Based" / "LLM + Cross-Validation" badge
- **Reasoning:** Expandable text block with matched rules
- **Article References:** Chips: "Art. 26", "Art. 27", "Annex III §4"
- **Deployer Requirements:** Grouped list by category (Literacy, Oversight, Documentation, Transparency)
  - Each requirement: checkbox (future), name, article ref, estimated effort badge
- **Actions:** [Zum Tool-Detail] primary + [Weitere AI-Tool hinzufügen] secondary

---

### Screen 12: Tool Detail `/tools/[id]`

**Header section:**
- Tool name + vendor + risk badge + domain badge
- 3 metric cards: Risk Level (colored), Compliance Status, Confidence %
- Action buttons: [Neu klassifizieren] secondary + [Löschen] destructive (ghost)

**Tabs:**
- **Requirements** (active) — checklist with status icons (✅ done, 🔄 in progress, ⬜ pending)
- **Classification** (Sprint 3 — LLM details, history)
- **Documents** (Sprint 4 — FRIA, policies)
- **Audit Trail** (Sprint 4 — log of changes)

---

## Детальные спецификации — Группа D (Sprint 3 NEW)

### Screen 13: Compliance Dashboard `/dashboard`

**Ref:** PRODUCT-BACKLOG Feature 05

**Layout (responsive grid):**

```
Desktop (1280px):
┌─────────────────────────────────────────────────────────────┐
│  Welcome back, {userName}              Feb 11, 2026         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  AI Tools    │  Classified  │  Compliance  │  AI Literacy   │
│  12 total    │  8 / 12      │  Score: 64%  │  45% trained   │
│  (summary    │  (donut:     │  (circular   │  (progress     │
│   card)      │   risk dist) │   progress)  │   bar)         │
├──────────────┴──────────────┼──────────────┴────────────────┤
│                             │                               │
│  Risk Distribution          │  Requires Attention           │
│  ┌───────────────────────┐  │  🔴 Prohibited tool found:    │
│  │ Donut/bar chart       │  │     "Social Scoring AI"       │
│  │ 🔴 1 Prohibited       │  │  🟠 3 tools need FRIA         │
│  │ 🟠 3 High Risk        │  │  📚 12 employees untrained    │
│  │ 🟡 2 Limited          │  │  ⏰ Art. 26 deadline:         │
│  │ 🟢 6 Minimal          │  │     Aug 2, 2026 (172 days)   │
│  └───────────────────────┘  │                               │
│                             │  [View all alerts →]          │
├─────────────────────────────┼───────────────────────────────┤
│                             │                               │
│  Compliance Timeline        │  Recent Activity              │
│  ──●── Feb 2025: Literacy   │  • ChatGPT classified (2h)   │
│  ──●── Aug 2025: Art. 5     │  • HireVue FRIA started (1d) │
│  ──◉── Aug 2026: Art. 26 ←  │  • 3 employees trained (3d)  │
│       172 days remaining    │  • New tool: Copilot (5d)    │
│                             │                               │
└─────────────────────────────┴───────────────────────────────┘
```

**Mobile:** Single column, cards stack vertically, summary cards scroll horizontally

**4 summary cards (top row):**
1. AI Tools — total count + link to inventory
2. Classified — X/Y ratio + mini donut (risk distribution)
3. Compliance Score — 0-100% circular progress, color by range (red <40, yellow 40-70, green >70)
4. AI Literacy — % trained + progress bar

**Risk Distribution widget:**
- Donut chart OR horizontal stacked bar
- Color-coded by risk level (use exact risk-* tokens)
- Click segment → navigate to `/tools/inventory?riskLevel=high`
- Legend with counts

**Requires Attention panel:**
- Sorted by severity: prohibited > high without FRIA > untrained employees > deadlines
- Each item: severity icon + text + action link
- Max 5 items, [View all] if more

**Compliance Timeline:**
- Vertical timeline with 3 milestones
- Past milestones: muted/checked
- Next milestone: highlighted with countdown "X days remaining"

**Recent Activity:**
- Last 5 actions from AuditLog
- Relative timestamps (2h ago, 1d ago)

---

### Screen 14: Requirements Checklist `/tools/[id]/requirements`

**Ref:** PRODUCT-BACKLOG Feature 04c

**Could be a tab on Tool Detail or separate page.**

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  HireVue — Deployer Requirements          🟠 High Risk      │
│  8 of 17 requirements fulfilled              47% complete   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ████████████░░░░░░░░░░░░░░░  47%                       ││
│  └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Art. 4 — AI Literacy                              2 of 2  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅  AI Literacy training completed         ~2h  Done    ││
│  │     All affected employees must be trained              ││
│  │ ✅  Document AI literacy measures          ~1h  Done    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Art. 26 — Deployer Obligations                    4 of 11 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅  Use according to instructions          ~1h  Done    ││
│  │ 🔄  Assign human oversight persons         ~4h  Doing   ││
│  │     → Recommendation: Designate a responsible           ││
│  │       person per AI tool. Document in policy.           ││
│  │ ⬜  Ensure input data quality              ~8h  Todo    ││
│  │     → Recommendation: Create data quality               ││
│  │       checklist for each AI tool input.                 ││
│  │ ⬜  Monitor AI tool operation              ~4h  Todo    ││
│  │ ⬜  Keep logs for 6+ months                ~2h  Todo    ││
│  │ ✅  Inform employees about AI use          ~1h  Done    ││
│  │ ⬜  Conduct DPIA if personal data          ~16h Todo    ││
│  │ ⬜  Inform affected persons                ~2h  Todo    ││
│  │ ⬜  Suspend if risks arise                 ~1h  Todo    ││
│  │ ✅  Report serious incidents               ~2h  Done    ││
│  │ ⬜  Cooperate with authorities             ~1h  Todo    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Art. 27 — FRIA                                    1 of 2  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔄  Complete FRIA assessment              ~16h  Doing   ││
│  │     [Open FRIA Wizard →]                                ││
│  │ ⬜  Submit FRIA to authority               ~2h  Todo    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  Art. 50 — Transparency                            1 of 2  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ✅  Inform users of AI interaction         ~1h  Done    ││
│  │ ⬜  Document transparency measures         ~2h  Todo    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Per requirement row:**
- Status icon: ✅ done / 🔄 in progress / ⬜ pending
- Requirement name (clickable to expand)
- Estimated effort badge (~Xh)
- Status tag (Done/Doing/Todo)
- **Expanded:** Recommendation text, guidance, link to relevant action (FRIA wizard, document generator)

**Grouped by Article** — collapsible sections with sub-progress (X of Y)

---

### Screen 15: Classification Detail Tab (on Tool Detail)

**New tab on `/tools/[id]` — replaces "coming soon" placeholder.**

**Content:**
- **Current Classification:**
  - Risk Level badge (large) + confidence bar
  - Method badge: "Rule-Based" / "LLM" / "Cross-Validated"
  - Reasoning text (expandable)
  - Matched Rules list (from RuleEngine)
  - Article References as chips
  - Annex III domain (if applicable)

- **LLM Analysis (Sprint 3 — when LLM classification added):**
  - LLM reasoning (separate from rules)
  - Cross-validation result: "Rule ↔ LLM: Agree ✅" or "Disagree ⚠ → Escalated to Large model"
  - Confidence comparison bar (rule confidence vs LLM confidence)

- **Classification History:**
  - Table: Version | Date | Method | Risk Level | Confidence | Classified By
  - Click row → show that version's details

- **[Neu klassifizieren]** button at bottom

---

## Design System

### Уже есть в коде (shadcn/ui)

Button, Card, Badge, RiskBadge, Input, Label, Dialog, Table, Skeleton, Toast

### Нужны новые компоненты

| Компонент | Экраны | Описание |
|-----------|--------|----------|
| **StatCard** | Dashboard (13) | Число + label + trend/icon, colored border-left по типу |
| **DonutChart** | Dashboard (13) | Risk distribution, 5 цветов, legend, click-to-filter |
| **CircularProgress** | Dashboard (13) | Compliance score 0-100%, colored by range |
| **ProgressBar** | Requirements (14), Literacy | Horizontal progress with % label |
| **Timeline** | Dashboard (13) | Vertical timeline, past/current/future milestones |
| **AlertItem** | Dashboard (13) | Severity icon + text + action link |
| **RequirementRow** | Requirements (14) | Expandable row: status + name + effort + recommendation |
| **ArticleGroup** | Requirements (14) | Collapsible section header with sub-progress |
| **ConfidenceBar** | Classification (15) | Horizontal bar comparing rule vs LLM confidence |
| **BottomTabBar** | Mobile layout (06) | 5-tab mobile navigation |
| **StepIndicator** | Register (03), Wizard (10) | Step dots/labels with current/completed states |

### Design Tokens (existing)

```
Primary:      #3b82f6 (brand), #2563eb (buttons/links/active)
Risk colors:  red #dc2626, orange #f97316, blue #3b82f6, yellow #eab308, green #22c55e
Font:         Inter (body), JetBrains Mono (code/IDs)
Spacing:      4px grid
Radius:       6px (cards), 4px (buttons), 9999px (badges)
Shadows:      sm (cards), md (dialogs), lg (dropdowns)
```

### Tone & Style

- **Professional B2B SaaS** — Linear, Vercel, Stripe feel
- **Trust & authority** — EU compliance product, not playful
- **Information-dense** — dashboards show lots of data, clear hierarchy
- **Clean white space** — generous but not wasteful
- **WCAG 2.1 AA** — contrast, focus indicators, keyboard nav
- **No emojis in UI** — risk icons are colored dots/shapes, not emoji

---

## Deliverables

Для каждого экрана (19 total):

1. **Desktop (1280px)** — primary viewport
2. **Mobile (375px)** — required for all screens
3. **States:** default, hover, loading (skeleton), empty, error
4. **Annotations:** which shadcn/ui components, spacing values, TailwindCSS class hints

### Приоритет (Sprint 3 deadline)

**P0 — нужно для Sprint 3 реализации:**
1. Screen 13: Compliance Dashboard
2. Screen 14: Requirements Checklist
3. Screen 15: Classification Detail Tab

**P1 — refactor existing wireframes (Sprint 1-2 pages):**
4. Screen 01: Landing Page
5. Screen 02: Login
6. Screen 03: Register
7. Screen 08: AI Tool Inventory
8. Screen 09: Catalog Search
9. Screen 10: 5-Step Wizard (all steps)
10. Screen 11: Classification Result
11. Screen 12: Tool Detail

**P2 — Sprint 4+ planned screens:**
12. Screen 16: Eva Chat
13. Screen 17: FRIA Wizard
14. Screen 18: Settings

### Формат файлов

```
designs/
├── 01-landing-desktop.png
├── 01-landing-mobile.png
├── 02-login-desktop.png
├── 02-login-magic-link-sent.png
├── 02-login-mobile.png
├── 03-register-step1.png
├── 03-register-step2.png
├── 03-register-mobile.png
├── 04-header-desktop.png
├── 05-sidebar.png
├── 06-mobile-bottom-tabs.png
├── 08-inventory-desktop.png
├── 08-inventory-mobile.png
├── 08-inventory-empty.png
├── 09-catalog-desktop.png
├── 09-catalog-detail-dialog.png
├── 09-catalog-mobile.png
├── 10-wizard-step1.png
├── 10-wizard-step2.png
├── 10-wizard-step3.png
├── 10-wizard-step4.png
├── 10-wizard-step5.png
├── 10-wizard-mobile.png
├── 11-classification-result.png
├── 12-tool-detail-desktop.png
├── 12-tool-detail-mobile.png
├── 13-dashboard-desktop.png      ← Sprint 3 P0
├── 13-dashboard-mobile.png       ← Sprint 3 P0
├── 14-requirements-desktop.png   ← Sprint 3 P0
├── 14-requirements-mobile.png    ← Sprint 3 P0
├── 15-classification-tab.png     ← Sprint 3 P0
├── 16-eva-chat-desktop.png
├── 16-eva-chat-mobile.png
├── 17-fria-wizard.png
└── 18-settings.png
```

---

## Backend API (для контекста дизайнера)

| Endpoint | Method | Purpose | Sprint |
|----------|--------|---------|--------|
| `/api/auth/webhook` | POST | Ory identity sync | 1 |
| `/api/auth/me` | GET | Current user + org | 1 |
| `/api/organizations/:id` | PATCH | Update org profile | 1 |
| `/api/auth/audit` | GET | Audit log (paginated) | 1 |
| `/api/tools/catalog/search` | GET | Search 225+ tool catalog | 1 |
| `/api/tools/catalog/:id` | GET | Single catalog tool | 1 |
| `/api/tools` | GET | List tools (filters, pagination) | 2 |
| `/api/tools` | POST | Register new tool | 2 |
| `/api/tools/:id` | GET | Tool detail + classification + requirements | 2 |
| `/api/tools/:id` | PATCH | Update tool (wizard step) | 2 |
| `/api/tools/:id` | DELETE | Delete tool | 2 |
| `/api/tools/:id/classify` | POST | Trigger classification | 2 |
| `/api/dashboard/summary` | GET | Dashboard aggregates | 3 (planned) |
| `/api/tools/:id/requirements` | GET | Requirements with status | 3 (planned) |

---

## References

- `docs/wireframes/sprint-1-2-wireframes.md` — ASCII wireframes (14 screens, desktop + mobile)
- `docs/PRODUCT-VISION.md` — Product vision, features, pricing
- `docs/DATA-FLOWS.md` — User flows with sequence diagrams
- `docs/PRODUCT-BACKLOG.md` — Feature descriptions
- Mood board: Linear, Vercel Dashboard, Stripe Dashboard, Vanta
- Avoid: consumer apps, gamified UX, heavy illustrations

---

## What NOT to Design

- Admin panel (internal)
- Email templates (Brevo handles)
- PDF certificate/document layout (Gotenberg server-side)
- Native mobile app (responsive web only)
- Marketing pages beyond landing
