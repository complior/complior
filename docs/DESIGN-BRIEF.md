# Design Brief for Nina — Sprint 3+

**Version:** 2.4.0
**Date:** 2026-02-12
**From:** PO
**For:** Nina (Frontend+UX, Claude Opus 4.6)
**Sprint:** 2.5 (Invite + Team) + Sprint 3 (Requirements + Dashboard + Catalog APIs) + Sprint 4 (Eva)
**Ref:** PRODUCT-BACKLOG.md v3.2.0, wireframes/sprint-1-2-wireframes.md

> **v2.4.0 (2026-02-12):** Sprint 2.5 — Screen 03 Register: Step 2 mandatory (удалён [Überspringen]). Screen 16 Settings: добавлен Team tab spec. Новая страница: Accept Invitation (`/invite/accept`). Backend API: `/api/team/*` endpoints. Design System: PlanLimitBar, InviteDialog, TeamMemberList.

---

## Контекст

Sprint 1-2 завершены. Весь фронтенд сделан как **wireframe-first** — функциональный, но без визуального дизайна. Sprint 3 добавляет новые экраны (Dashboard, Requirements). Нужен полный дизайн для всех страниц — и старых, и новых.

**Eva Pivot (v2.3.0):** Eva переосмыслена как **conversational onboarding** — альтернативный способ регистрации AI-инструментов через диалог. Eva-плейсхолдеры добавлены на Screen 08 (Wizard), Screen 11 (Dashboard) и Screen 14 (Eva Chat).

**Задача:** Получить от внешнего дизайнера (или LLM-дизайнера) высококачественные макеты для ВСЕХ экранов, чтобы Nina могла имплементировать их в Next.js + TailwindCSS + shadcn/ui.

---

## Полный список экранов (17 screens)

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
| 05 | **Sidebar** | `Sidebar.tsx` | 0 | wireframe | Desktop: collapsible nav. Items: Dashboard, Literacy, Dokumente, Eva, Settings |
| 06 | **Mobile Bottom Tab** | planned | 3 | NEW | 5 tabs: Dashboard, Tools, Literacy, Docs, Eva |

### Группа C — Core App Pages (Sprint 1-2, wireframes)

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 07 | **Dashboard** | `/dashboard` | 1 | wireframe (basic) | Заглушка. Sprint 3 полностью переделывает — см. экран 11 |
| 08 | **5-Step Registration Wizard** | `/tools/new` | 2 | wireframe | 5 steps: Tool → Usage → Data → Autonomy → Review. Левая панель: список добавленных tools. Catalog Modal in Step 1 |
| 09 | **Classification Result** | component in wizard | 2 | wireframe | Risk badge (large), confidence %, method, reasoning text, article refs, requirements list |
| 10 | **Tool Detail** | `/tools/[id]` | 2 | wireframe | Header + 3 metric cards (risk, status, confidence) + tabs (Requirements → Screen 12, Classification → Screen 13) + Alternatives block |

### Группа D — Sprint 3 NEW Screens

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 11 | **Compliance Dashboard** (полный) | `/dashboard` | 3 | **NEW** | Заменяет заглушку. Центральный экран CEO/CTO |
| 12 | **Requirements Checklist** | tab on `/tools/[id]` | 3 | **NEW** | Таб на Tool Detail (Screen 10). Deployer obligations checklist с рекомендациями |
| 13 | **Classification Detail Tab** | tab on `/tools/[id]` | 3 | **NEW** | Таб на Tool Detail (Screen 10). Rule reasoning, classification history (no LLM cross-validation) |

### Группа E — Planned (Sprint 4+, wireframes ready)

| # | Экран | Роут | Sprint | Описание |
|---|-------|------|--------|----------|
| 14 | **Eva Chat** | `/eva` (side panel) | 4 | Conversational onboarding + Q&A, quick actions, auto-fill wizard, disclaimer |
| 15 | **FRIA Wizard** | `/tools/[id]/fria` | 4-5 | 6-section assessment, AI drafts, rich text editor |
| 16 | **Settings** | `/settings` | 2.5 (Team tab) + 4 (rest) | Tabs: Profile, Company, **Team (Sprint 2.5)**, Subscription, Security |
| 16b | **Accept Invitation** | `/invite/accept` | 2.5 | **NEW** — Verify token, show org + role, register/login, join org |
| 17 | **AI Literacy Dashboard** | `/literacy` | 8+ | Progress bar, per-role breakdown, certificates |

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

**Step 2 — Company (MANDATORY — Sprint 2.5):**
- Fields: Firmenname, Branche (dropdown: Technology, Healthcare, Finance, HR, Education, Legal, Manufacturing, Other), Unternehmensgröße (dropdown: 1-10, 11-50, 51-200, 201-500, 500+), Land (dropdown)
- [Weiter zum Dashboard] primary button
- ~~[Überspringen] — REMOVED (Sprint 2.5)~~: Step 2 обязателен, т.к. invite email показывает organizationName — placeholder неприемлем

**Progress:** Step indicator (1/2, 2/2) at top

---

## Детальные спецификации — Группа C (Sprint 1-2 Wireframes)

**Risk badges (CRITICAL — consistent everywhere):**
- 🔴 Prohibited — `bg-red-100 text-red-800`
- 🟠 High Risk — `bg-orange-100 text-orange-800`
- 🔵 GPAI — `bg-blue-100 text-blue-800`
- 🟡 Limited — `bg-yellow-100 text-yellow-800`
- 🟢 Minimal — `bg-green-100 text-green-800`

---

### Screen 08: 5-Step Registration Wizard `/tools/new`

> Центральный экран для регистрации AI-инструментов. Вместо отдельной Inventory-страницы — левая панель со списком уже добавленных инструментов прямо в визарде.

**Layout (desktop — split view):**

```
┌──────────────────────────┬───────────────────────────────┐
│  Ihre AI-Tools (3)       │  Neues AI-Tool hinzufügen     │
│                          │                               │
│  ✅ ChatGPT    🟢 Min    │  Step 1 ● ─ ─ ─ ● 5          │
│  ✅ Copilot    🟢 Min    │                               │
│  🔄 HireVue   🟠 High   │  [Aus Katalog wählen]         │
│                          │                               │
│  Click → Tool Detail     │  Name: ___________            │
│                          │  Vendor: ___________          │
│  [+ Weiteres Tool]       │  ...                          │
└──────────────────────────┴───────────────────────────────┘
```

**Left panel — Ihre AI-Tools:**
- List of registered tools with name + risk badge + status icon (✅ classified, 🔄 in progress)
- Click tool → navigate to Tool Detail (Screen 10)
- Empty state: "Noch keine AI-Tools. Fügen Sie Ihr erstes hinzu."
- Mobile: collapsible panel above wizard, or bottom sheet

**Right panel — Wizard form:**

**Progress bar:** 5 steps with labels, current step highlighted (primary-600), completed = checkmark

**Step 1 — AI-Tool:**
- [Aus Katalog wählen] secondary button → opens **Catalog Modal (Dialog)**
- **Catalog Modal:**
  - Search input (full-width, 🔍 icon, debounced 300ms)
  - Category filter chips (All, HR, Healthcare, Finance, Education, General...)
  - Risk Level dropdown filter
  - Card grid: 3 columns (desktop), 2 (tablet), 1 (mobile)
  - Card: tool name, vendor, risk badge, short description, [Auswählen] button
  - On select: auto-fills Name, Vendor, Description, Website + sets defaultRiskLevel
  - Data source: 225 tools, API: `GET /api/tools/catalog/search`
- **OR** manual entry (fields remain as-is)
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

**Eva-Placeholder (Sprint 4):**
- Кнопка "Mit Eva registrieren" рядом с [Aus Katalog wählen] в Step 1
- При нажатии: открывается side panel (или slide-over) с Eva-чатом
- Eva проактивно спрашивает: "Welche AI-Tools nutzt Ihr Unternehmen?"
- На основе диалога Eva auto-fills поля визарда → создаёт draft AI Tool
- Визуально: ghost button с иконкой чат-пузыря, tooltip "KI-Assistentin hilft beim Registrieren"
- Mobile: full-screen overlay поверх визарда

---

### Screen 09: Classification Result (shown after Step 5)

**Layout (centered, max-w-2xl):**
- **Risk Badge (large):** Full-width colored banner — "🟠 High Risk" with confidence "87%"
- **Method:** "Rule-Based" / "LLM + Cross-Validation" badge
- **Reasoning:** Expandable text block with matched rules
- **Article References:** Chips: "Art. 26", "Art. 27", "Annex III §4"
- **Deployer Requirements:** Grouped list by category (Literacy, Oversight, Documentation, Transparency)
  - Each requirement: checkbox (future), name, article ref, estimated effort badge
- **Actions:** [Zum Tool-Detail] primary (→ Screen 10) + [Weitere AI-Tool hinzufügen] secondary

---

### Screen 10: Tool Detail `/tools/[id]`

**Header section:**
- Tool name + vendor + risk badge + domain badge
- 3 metric cards: Risk Level (colored), Compliance Status, Confidence %
- Action buttons: [Neu klassifizieren] secondary + [Löschen] destructive (ghost)

**Tabs:**
- **Requirements** (active) — checklist with status icons (✅ done, 🔄 in progress, ⬜ pending). Подробная спецификация → Screen 12
- **Classification** (Sprint 3 — LLM details, history). Подробная спецификация → Screen 13
- **Documents** (Sprint 4 — FRIA, policies)
- **Audit Trail** (Sprint 4 — log of changes)

> **Note:** Screens 12 и 13 описывают содержимое табов этого экрана. Это не отдельные страницы, а контент внутри табов Tool Detail.

**Alternatives block (below tabs):**
- Показывается для High Risk и Prohibited инструментов
- Заголовок: "EU-konforme Alternativen"
- 2-3 карточки из каталога с более низким риском в том же домене
- Карточка: name, vendor, risk badge, short description, [Details ansehen] link
- Данные: API `GET /api/tools/catalog/search?domain={domain}&maxRisk=limited`
- Для Minimal/Limited инструментов блок не показывается

---

## Детальные спецификации — Группа D (Sprint 3 NEW)

### Screen 11: Compliance Dashboard `/dashboard`

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
1. AI Tools — total count + [+ AI-Tool hinzufügen] link (→ Wizard, Screen 08)
2. Classified — X/Y ratio + mini donut (risk distribution)
3. Compliance Score — 0-100% circular progress, color by range (red <40, yellow 40-70, green >70)
4. AI Literacy — % trained + progress bar

**Risk Distribution widget:**
- Donut chart OR horizontal stacked bar
- Color-coded by risk level (use exact risk-* tokens)
- Click segment → navigate to Tool Detail (Screen 10) for each tool in that risk category
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

**Eva-Placeholder (Sprint 4):**
- Мини-виджет "Fragen Sie Eva" в правом нижнем углу Dashboard (или как карточка в grid)
- Quick actions (chips): "Wie ist mein Compliance-Status?", "Welche Tools fehlen?", "Was muss ich als nächstes tun?"
- При клике: navigate to Eva Chat (Screen 14) или slide-over panel
- Визуально: компактная карточка с иконкой Eva + 2-3 suggested questions

---

### Screen 12: Requirements Checklist (таб на Tool Detail, Screen 10)

**Ref:** PRODUCT-BACKLOG Feature 04c

> **Это не отдельная страница.** Контент отображается как активный таб "Requirements" на экране Tool Detail (Screen 10, `/tools/[id]`).

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

### Screen 13: Classification Detail Tab (таб на Tool Detail, Screen 10)

> **Это не отдельная страница.** Контент отображается как таб "Classification" на экране Tool Detail (Screen 10, `/tools/[id]`). Replaces "coming soon" placeholder.

**Content:**
- **Current Classification:**
  - Risk Level badge (large) + confidence bar
  - Method badge: "Rule-Based" / "LLM" / "Cross-Validated"
  - Reasoning text (expandable)
  - Matched Rules list (from RuleEngine)
  - Article References as chips
  - Annex III domain (if applicable)

- **Classification History:**
  - Table: Version | Date | Method | Risk Level | Confidence | Classified By
  - Click row → show that version's details

- **[Neu klassifizieren]** button at bottom

---

## Детальные спецификации — Группа E (Sprint 4, Eva)

### Screen 14: Eva Chat — Conversational Onboarding `/eva` (side panel)

**Ref:** PRODUCT-BACKLOG Feature 06 (v3.1.0 — Eva Pivot)

> **Eva — не просто Q&A чат.** Eva — это альтернативный способ регистрации AI-инструментов через conversational onboarding. Eva проактивно помогает обнаружить и зарегистрировать инструменты.

**Layout (desktop — slide-over panel, 400px):**

```
┌─────────────────────────────────────────────┐
│  Eva — KI-Compliance Assistentin      [✕]   │
├─────────────────────────────────────────────┤
│                                             │
│  🤖 Hallo! Ich bin Eva, Ihre KI-Compliance │
│     Assistentin. Ich kann Ihnen helfen,     │
│     AI-Tools zu entdecken und zu            │
│     registrieren.                           │
│                                             │
│  🤖 Welche AI-Tools nutzt Ihr Unternehmen? │
│     Zum Beispiel ChatGPT, Copilot,         │
│     HireVue...                             │
│                                             │
│  👤 Wir nutzen ChatGPT für Content und     │
│     HireVue im HR für Bewerbungsgespräche  │
│                                             │
│  🤖 Danke! Ich habe 2 Tools erkannt:       │
│     ✅ ChatGPT — Content (General)          │
│     ⚠️ HireVue — HR (High Risk, Annex III) │
│                                             │
│     Soll ich diese als Entwurf in Ihrem    │
│     Inventar anlegen?                      │
│                                             │
│     [Ja, anlegen] [Details bearbeiten]     │
│                                             │
├─────────────────────────────────────────────┤
│  Quick Actions:                             │
│  [AI-Tools entdecken] [Compliance-Status]   │
│  [Was muss ich tun?]  [FRIA nötig?]        │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐ [↑]   │
│  │ Nachricht eingeben...           │        │
│  └─────────────────────────────────┘        │
│  ⚖️ Keine Rechtsberatung. Immer Experten   │
│     konsultieren.                           │
└─────────────────────────────────────────────┘
```

**Conversational Onboarding Flow:**
1. Eva начинает с приветствия и проактивного вопроса об AI-инструментах
2. Пользователь описывает инструменты в свободной форме
3. Eva распознаёт инструменты, матчит с каталогом, определяет домен
4. Eva показывает inline-карточки с предварительной классификацией
5. Пользователь подтверждает → Eva создаёт draft AI Tools в inventory
6. Eva предлагает классифицировать: "Soll ich die Risiko-Klassifizierung starten?"

**Q&A Mode:**
- Deployer-focused ответы по Art. 4, 26, 27, 50
- RAG по EU AI Act knowledge base
- Цитирование статей: inline badges "Art. 26 §3"
- Контекстные ответы: видит AI-инструменты и compliance status организации

**UI Elements:**
- Chat bubbles: Eva (left, muted bg) / User (right, primary bg)
- Streaming text (SSE via Vercel AI SDK `useChat`)
- Inline action cards: tool recognition cards with [Anlegen] / [Bearbeiten] buttons
- Quick actions chips (above input): suggested prompts that change based on context
- Disclaimer footer: always visible, legal notice
- Typing indicator: "Eva denkt nach..."

**Access points:**
- Sidebar nav: "Eva" menu item
- Dashboard: "Fragen Sie Eva" widget (Screen 11)
- Wizard: "Mit Eva registrieren" button (Screen 08)
- Tool Detail: "Eva fragen" contextual link

**Mobile:** Full-screen chat view, quick actions scrollable row, FAB button on other screens

---

## Детальные спецификации — Sprint 2.5 NEW

### Screen 16: Settings > Team Tab `/settings/team`

**Ref:** PRODUCT-BACKLOG Feature 02 (Sprint 2.5)

> **Sprint 2.5 реализует ТОЛЬКО Team tab.** Остальные табы (Profile, Company, Subscription, Security) → Sprint 4.

**Layout (desktop):**

```
┌─────────────────────────────────────────────────────────────┐
│  Einstellungen                                               │
├──────────┬──────────────────────────────────────────────────┤
│  Profile │  Team                                             │
│  Company │                                                   │
│  Team ←  │  Ihr Team                    3 von 5 Benutzer    │
│  Billing │  ┌───────────────────────────────────────────┐   │
│  Security│  │ ████████████████░░░░░░  60%              │   │
│          │  └───────────────────────────────────────────┘   │
│          │                                                   │
│          │  [+ Mitglied einladen]                            │
│          │                                                   │
│          │  ┌──────────────────────────────────────────────┐│
│          │  │ Name          Email            Rolle  Status  ││
│          │  │───────────────────────────────────────────────││
│          │  │ Max Müller    max@acme.de      Owner  Active  ││
│          │  │ Anna Schmidt  anna@acme.de     Admin  Active [▼]│
│          │  │ Tom Weber     tom@acme.de      Member Active [▼]│
│          │  └──────────────────────────────────────────────┘│
│          │                                                   │
│          │  Ausstehende Einladungen                          │
│          │  ┌──────────────────────────────────────────────┐│
│          │  │ lisa@acme.de  Member  Läuft ab: 19.02.2026    ││
│          │  │              [Erneut senden] [Widerrufen]      ││
│          │  └──────────────────────────────────────────────┘│
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

**PlanLimitBar (top):**
- Progress bar: "X von Y Benutzer" (currentUsers + pendingInvites / maxUsers)
- Color: green (<60%), yellow (60-90%), red (>90%)
- When full (100%): bar red, [+ Mitglied einladen] disabled, tooltip "Plan-Limit erreicht. Upgraden Sie Ihren Plan."

**[+ Mitglied einladen] → InviteDialog (Modal):**
- Fields: E-Mail-Adresse (email input), Rolle (dropdown: Admin, Mitglied, Betrachter)
- [Einladen] primary button + [Abbrechen] ghost
- Validation: email format, not already member/pending
- Error: "Plan-Limit erreicht" if maxUsers exceeded
- Success: toast "Einladung an lisa@acme.de gesendet"

**Members Table (TeamMemberList):**
- Columns: Name, E-Mail, Rolle, Status, Aktionen
- Owner row: no actions (immutable)
- Admin/Member/Viewer rows (for owner): [▼] dropdown → Rolle ändern (Admin/Mitglied/Betrachter), Entfernen
- Admin/Member/Viewer rows (for admin): [▼] dropdown → Rolle ändern (Mitglied/Betrachter), Entfernen
  - Admin CANNOT assign another admin (only owner can)
- Self row: no actions ("Das sind Sie" badge)
- Status: Active (green), Deaktiviert (red)

**Pending Invitations:**
- Inline below members table
- Per invite: email, role, expiry date, [Erneut senden] + [Widerrufen] actions
- Expired: muted text, only [Erneut senden]

**Mobile:** Tabs → horizontal scrollable pills. Members as cards instead of table.

---

### Screen 16b: Accept Invitation `/invite/accept?token={uuid}`

**Ref:** PRODUCT-BACKLOG Feature 02 (Sprint 2.5)

**Layout (centered card, max-w-md):**

```
┌─────────────────────────────────────────┐
│  [🛡] AI Act Compliance                  │
│                                          │
│  Einladung zu ACME Corp                  │
│                                          │
│  Sie wurden als Mitglied eingeladen.     │
│                                          │
│  Organisation: ACME Corp                 │
│  Rolle: Mitglied                         │
│  Eingeladen von: max@acme.de             │
│                                          │
│  [Konto erstellen und beitreten]         │
│  oder                                    │
│  [Anmelden und beitreten]                │
│                                          │
└─────────────────────────────────────────┘
```

**States:**
- **Loading:** Skeleton while verifying token
- **Valid token (not logged in):**
  - Shows org name, role, inviter email
  - [Konto erstellen und beitreten] → Ory registration (with return URL `/invite/accept?token=...`)
  - [Anmelden und beitreten] → Ory login (with return URL)
- **Valid token (logged in, email matches):**
  - Shows org name, role
  - If user in another org: "Sie verlassen Ihre aktuelle Organisation ({currentOrg})" warning
  - [Beitreten] primary button → POST accept
  - Success → redirect to /dashboard
- **Valid token (logged in, email mismatch):**
  - "Diese Einladung ist für {inviteEmail}. Sie sind als {currentEmail} angemeldet."
  - [Abmelden und mit richtigem Konto anmelden] → logout + redirect
- **Expired token:**
  - "Diese Einladung ist abgelaufen."
  - "Bitten Sie den Administrator, Ihnen eine neue Einladung zu senden."
- **Already accepted:**
  - "Diese Einladung wurde bereits angenommen."
  - [Zum Dashboard] link

**Mobile:** Same layout, full-width card

---

## Design System

### Уже есть в коде (shadcn/ui)

Button, Card, Badge, RiskBadge, Input, Label, Dialog, Table, Skeleton, Toast

### Нужны новые компоненты

| Компонент | Экраны | Описание |
|-----------|--------|----------|
| **StatCard** | Dashboard (11) | Число + label + trend/icon, colored border-left по типу |
| **DonutChart** | Dashboard (11) | Risk distribution, 5 цветов, legend, click-to-filter |
| **CircularProgress** | Dashboard (11) | Compliance score 0-100%, colored by range |
| **ProgressBar** | Requirements (12), Literacy | Horizontal progress with % label |
| **Timeline** | Dashboard (11) | Vertical timeline, past/current/future milestones |
| **AlertItem** | Dashboard (11) | Severity icon + text + action link |
| **RequirementRow** | Requirements (12) | Expandable row: status + name + effort + recommendation |
| **ArticleGroup** | Requirements (12) | Collapsible section header with sub-progress |
| **ChatBubble** | Eva Chat (14) | Chat message: Eva (left, muted) / User (right, primary) |
| **AlternativeCard** | Tool Detail (10) | EU-compliant alternative: name, vendor, risk badge, description |
| **ToolListItem** | Wizard (08) | Left panel item: name + risk badge + status icon, clickable |
| **BottomTabBar** | Mobile layout (06) | 5-tab mobile navigation |
| **StepIndicator** | Register (03), Wizard (08) | Step dots/labels with current/completed states |
| **PlanLimitBar** | Settings Team (16) | "X von Y Benutzer" progress bar, color by threshold |
| **InviteDialog** | Settings Team (16) | Modal: email + role dropdown + send button |
| **TeamMemberList** | Settings Team (16) | Table: name, email, role, status, actions dropdown |

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

Для каждого экрана (17 total):

1. **Desktop (1280px)** — primary viewport
2. **Mobile (375px)** — required for all screens
3. **States:** default, hover, loading (skeleton), empty, error
4. **Annotations:** which shadcn/ui components, spacing values, TailwindCSS class hints

### Приоритет (Sprint 3 deadline)

**P0 — нужно для Sprint 3 реализации:**
1. Screen 11: Compliance Dashboard
2. Screen 12: Requirements Checklist (таб на Screen 10)
3. Screen 13: Classification Detail Tab (таб на Screen 10)

**P1 — refactor existing wireframes (Sprint 1-2 pages):**
4. Screen 01: Landing Page
5. Screen 02: Login
6. Screen 03: Register
7. Screen 08: 5-Step Wizard (all steps + Catalog Modal + Tool List panel)
8. Screen 09: Classification Result
9. Screen 10: Tool Detail (+ Alternatives block)

**P2 — Sprint 4+ planned screens:**
10. Screen 14: Eva Chat
11. Screen 15: FRIA Wizard
12. Screen 16: Settings

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
├── 08-wizard-desktop.png
├── 08-wizard-tool-list-panel.png
├── 08-wizard-catalog-modal.png
├── 08-wizard-step2.png
├── 08-wizard-step3.png
├── 08-wizard-step4.png
├── 08-wizard-step5.png
├── 08-wizard-mobile.png
├── 09-classification-result.png
├── 10-tool-detail-desktop.png
├── 10-tool-detail-alternatives.png
├── 10-tool-detail-mobile.png
├── 11-dashboard-desktop.png      ← Sprint 3 P0
├── 11-dashboard-mobile.png       ← Sprint 3 P0
├── 12-requirements-desktop.png   ← Sprint 3 P0
├── 12-requirements-mobile.png    ← Sprint 3 P0
├── 13-classification-tab.png     ← Sprint 3 P0
├── 14-eva-chat-desktop.png           ← Sprint 4 P0
├── 14-eva-chat-onboarding-flow.png   ← Sprint 4 P0
├── 14-eva-chat-mobile.png            ← Sprint 4 P0
├── 15-fria-wizard.png
├── 16-settings.png
└── 17-literacy-dashboard.png
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
| `/api/dashboard/summary` | GET | Dashboard aggregates | 3 |
| `/api/tools/:id/requirements` | GET | Requirements grouped by article | 3 |
| `/api/tools/:id/requirements/:reqId` | PATCH | Update requirement status/progress | 3 |
| `/api/tools/:id/classification-history` | GET | Classification history (all versions) | 3 |
| `/api/tools/catalog/search?domain=&maxRisk=` | GET | Catalog with domain + maxRisk filters | 3 |
| `/api/team/invite` | POST | Create invitation (email + role) | 2.5 |
| `/api/team/invite/verify?token=` | GET | Verify invitation token (public) | 2.5 |
| `/api/team/invite/accept` | POST | Accept invitation (authenticated) | 2.5 |
| `/api/team/members` | GET | List members + pending invites + limits | 2.5 |
| `/api/team/members/:userId` | PATCH | Change member role | 2.5 |
| `/api/team/members/:userId` | DELETE | Remove member (deactivate) | 2.5 |
| `/api/team/invitations/:id` | DELETE | Revoke pending invitation | 2.5 |
| `/api/team/invitations/:id/resend` | POST | Resend invitation email | 2.5 |

---

## References

- `docs/wireframes/sprint-1-2-wireframes.md` — ASCII wireframes (desktop + mobile)
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
