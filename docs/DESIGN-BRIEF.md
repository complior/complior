# Design Brief for Nina — Sprint 3+

**Version:** 2.6.0
**Date:** 2026-02-12
**From:** PO
**For:** Nina (Frontend+UX, Claude Opus 4.6)
**Sprint:** 2.5 (Invite + Team) + Sprint 3 (Requirements + Dashboard + Catalog APIs) + Sprint 4 (Eva)
**Ref:** PRODUCT-BACKLOG.md v3.3.0, wireframes/sprint-1-2-wireframes.md

> **v2.6.0 (2026-02-12):** Screen 08 Wizard: AITool = Use Case (Anwendungsfall). Step 2 расширен: `useCaseDetails`, `decisionImpact`, `deploymentDate`. Step 3: добавлено `employeesInformed` (Art. 26(7)). Screen 07: помечен DEPRECATED (заменён Screen 11). Tooltip на Step 2: "один продукт → несколько use cases".
>
> **v2.5.0 (2026-02-12):** Весь UI переведён на **английский** (немецкая версия — post-MVP через i18n). Описания в документе на русском. Sprint 2.5 — Screen 03 Register: Step 2 mandatory (удалён [Skip]). Screen 16 Settings: добавлен Team tab spec. Новая страница: Accept Invitation (`/invite/accept`). Backend API: `/api/team/*` endpoints. Design System: PlanLimitBar, InviteDialog, TeamMemberList.

---

## Контекст

Sprint 1-2 завершены. Весь фронтенд сделан как **wireframe-first** — функциональный, но без визуального дизайна. Sprint 3 добавляет новые экраны (Dashboard, Requirements). Нужен полный дизайн для всех страниц — и старых, и новых.

**Язык UI:** English-first MVP. Немецкая (DE) и французская (FR) версии добавляются post-MVP через next-intl (Feature 14). Все UI-тексты, кнопки, labels — на английском.

**Eva Pivot (v2.3.0):** Eva переосмыслена как **conversational onboarding** — альтернативный способ регистрации AI-инструментов через диалог. Eva-плейсхолдеры добавлены на Screen 08 (Wizard), Screen 11 (Dashboard) и Screen 14 (Eva Chat).

**Задача:** Получить от внешнего дизайнера (или LLM-дизайнера) высококачественные макеты для ВСЕХ экранов, чтобы Nina могла имплементировать их в Next.js + TailwindCSS + shadcn/ui.

---

## Полный список экранов (17 screens)

### Группа A — Публичные (до авторизации)

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 01 | **Landing Page** | `/` | 0 | wireframe | Hero + 6 feature cards + 4 pricing tiers + EU trust bar + CTA |
| 02 | **Login** | `/auth/login` | 1 | wireframe | Email + magic link (primary), password (secondary), "check your email" состояние |
| 03 | **Register** | `/auth/register` | 1 | wireframe | 2-step wizard: Step 1 (account), Step 2 (company + industry) |

### Группа B — App Shell (layout)

| # | Экран | Компонент | Sprint | Статус | Описание |
|---|-------|-----------|--------|--------|----------|
| 04 | **Header** | `Header.tsx` | 0 | wireframe | Логотип + nav links (desktop), hamburger (mobile) |
| 05 | **Sidebar** | `Sidebar.tsx` | 0 | wireframe | Desktop: сворачиваемая навигация. Items: Dashboard, Literacy, Documents, Eva, Settings |
| 06 | **Mobile Bottom Tab** | planned | 3 | NEW | 5 табов: Dashboard, Tools, Literacy, Docs, Eva |

### Группа C — Core App Pages (Sprint 1-2, wireframes)

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 07 | ~~**Dashboard**~~ | `/dashboard` | 1 | **DEPRECATED** | ~~Заглушка.~~ Заменён Screen 11 (Compliance Dashboard) в Sprint 3 |
| 08 | **5-Step Registration Wizard** | `/tools/new` | 2 | wireframe | 5 шагов: Tool → Usage → Data → Autonomy → Review. Левая панель: список добавленных tools. Catalog Modal в Step 1 |
| 09 | **Classification Result** | component in wizard | 2 | wireframe | Risk badge (large), confidence %, method, reasoning text, article refs, requirements list |
| 10 | **Tool Detail** | `/tools/[id]` | 2 | wireframe | Header + 3 metric cards (risk, status, confidence) + табы (Requirements → Screen 12, Classification → Screen 13) + блок Alternatives |

### Группа D — Sprint 3 NEW Screens

| # | Экран | Роут | Sprint | Статус | Описание |
|---|-------|------|--------|--------|----------|
| 11 | **Compliance Dashboard** (полный) | `/dashboard` | 3 | **NEW** | Заменяет заглушку. Центральный экран CEO/CTO |
| 12 | **Requirements Checklist** | tab on `/tools/[id]` | 3 | **NEW** | Таб на Tool Detail (Screen 10). Deployer obligations checklist с рекомендациями |
| 13 | **Classification Detail Tab** | tab on `/tools/[id]` | 3 | **NEW** | Таб на Tool Detail (Screen 10). Rule reasoning, classification history |

### Группа E — Planned (Sprint 4+, wireframes ready)

| # | Экран | Роут | Sprint | Описание |
|---|-------|------|--------|----------|
| 14 | **Eva Chat** | `/eva` (side panel) | 4 | Conversational onboarding + Q&A, quick actions, auto-fill wizard, disclaimer |
| 15 | **FRIA Wizard** | `/tools/[id]/fria` | 4-5 | 6-section assessment, AI drafts, rich text editor |
| 16 | **Settings** | `/settings` | 2.5 (Team tab) + 4 (rest) | Табы: Profile, Company, **Team (Sprint 2.5)**, Subscription, Security |
| 16b | **Accept Invitation** | `/invite/accept` | 2.5 | **NEW** — Проверка токена, показ org + role, регистрация/логин, присоединение к org |
| 17 | **AI Literacy Dashboard** | `/literacy` | 8+ | Progress bar, per-role breakdown, certificates |

---

## Детальные спецификации — Группа A (Публичные)

### Screen 01: Landing Page `/`

**Wireframe:** `wireframes/sprint-1-2-wireframes.md` → Section 1

**Секции (сверху вниз):**
1. **Navbar** — Логотип `[🛡] AI Act Compliance` + nav: Features, Pricing, Contact + [Sign In] [Get Started Free]
2. **Hero** — H1: "AI Act Compliance for Your Company", subtitle: "The self-service platform for EU AI Act compliance. For companies that USE AI — not build it.", 2 CTA кнопки + 3 trust bullets (Art. 4, 70% non-compliant, from €49)
3. **Features Grid** — 6 карточек (2x3): AI Tool Inventory, AI Literacy, Risk Classification, FRIA & Documentation, Eva AI Assistant, Compliance Dashboard
4. **Pricing** — 4 тарифа рядом: Free (€0), Starter (€49), Growth (€149, "most popular" badge), Scale (€399)
5. **EU Trust Bar** — 6 логотипов EU-сервисов с флагами: 🇩🇪 Hetzner, 🇫🇷 Brevo, 🇪🇪 Plausible, 🇩🇪 Ory, 🇫🇷 Mistral, 🇱🇹 Better Uptime + "Your data NEVER leaves the EU"
6. **Final CTA** — Большая центрированная кнопка
7. **Footer** — © + юридические ссылки

**Mobile:** Одноколоночный, карточки стопкой, hamburger-меню, pricing прокручивается горизонтально

---

### Screen 02: Login `/auth/login`

**Состояния:**
- **Default** — Email input + [Send Magic Link] primary кнопка + "Or sign in with password" toggle → раскрывает поле пароля + [Sign In]
- **Magic Link Sent** — Иконка + "Check your email" + показан email + [Resend] ссылка
- **Error** — Inline-валидация на email, API error баннер

**Layout:** Центрированная карточка (max-w-md), логотип сверху, "Don't have an account? Register" ссылка снизу

---

### Screen 03: Register `/auth/register`

**Step 1 — Account:**
- Поля: First Name, Last Name, Email, Password (with strength indicator)
- [Create Account] primary кнопка
- "Already have an account? Sign In" ссылка

**Step 2 — Company (MANDATORY — Sprint 2.5):**
- Поля: Company Name, Industry (dropdown: Technology, Healthcare, Finance, HR, Education, Legal, Manufacturing, Other), Company Size (dropdown: 1-10, 11-50, 51-200, 201-500, 500+), Country (dropdown)
- [Continue to Dashboard] primary кнопка
- ~~[Skip] — REMOVED (Sprint 2.5)~~: Step 2 обязателен, т.к. invite email показывает organizationName — placeholder неприемлем

**Progress:** Индикатор шагов (1/2, 2/2) сверху

---

## Детальные спецификации — Группа C (Sprint 1-2 Wireframes)

**Risk badges (CRITICAL — единообразно везде):**
- 🔴 Prohibited — `bg-red-100 text-red-800`
- 🟠 High Risk — `bg-orange-100 text-orange-800`
- 🔵 GPAI — `bg-blue-100 text-blue-800`
- 🟡 Limited — `bg-yellow-100 text-yellow-800`
- 🟢 Minimal — `bg-green-100 text-green-800`

---

### Screen 08: 5-Step Use Case Registration Wizard `/tools/new`

> Центральный экран для регистрации **use cases** AI-инструментов. AITool ≠ программный продукт — это конкретный use case (Anwendungsfall) применения AI-системы. Один продукт (напр. ChatGPT) может порождать несколько записей, если используется в разных контекстах. Вместо отдельной Inventory-страницы — левая панель со списком уже добавленных use cases прямо в визарде.

**Layout (desktop — split view):**

```
┌──────────────────────────┬───────────────────────────────┐
│  Your AI Tools (3)        │  Add New AI Tool              │
│                          │                               │
│  ✅ ChatGPT    🟢 Min    │  Step 1 ● ─ ─ ─ ● 5          │
│  ✅ Copilot    🟢 Min    │                               │
│  🔄 HireVue   🟠 High   │  [Choose from Catalog]        │
│                          │                               │
│  Click → Tool Detail     │  Name: ___________            │
│                          │  Vendor: ___________          │
│  [+ Add Another Tool]    │  ...                          │
└──────────────────────────┴───────────────────────────────┘
```

**Левая панель — Your AI Tools:**
- Список зарегистрированных инструментов: name + risk badge + status icon (✅ classified, 🔄 in progress)
- Клик по инструменту → переход на Tool Detail (Screen 10)
- Пустое состояние: "No AI tools yet. Add your first one."
- Mobile: сворачиваемая панель над визардом или bottom sheet

**Правая панель — Wizard form:**

**Progress bar:** 5 шагов с labels, текущий шаг выделен (primary-600), завершённые = checkmark

**Step 1 — AI Tool:**
- [Choose from Catalog] secondary кнопка → открывает **Catalog Modal (Dialog)**
- **Catalog Modal:**
  - Поле поиска (full-width, 🔍 icon, debounced 300ms)
  - Category filter chips (All, HR, Healthcare, Finance, Education, General...)
  - Risk Level dropdown filter
  - Сетка карточек: 3 колонки (desktop), 2 (tablet), 1 (mobile)
  - Карточка: tool name, vendor, risk badge, short description, [Select] кнопка
  - При выборе: auto-fill Name, Vendor, Description, Website + устанавливает defaultRiskLevel
  - Источник данных: 225 инструментов, API: `GET /api/tools/catalog/search`
- **ИЛИ** ручной ввод (поля остаются как есть)
- Поля: Name*, Vendor*, Description, Website
- Pre-fill из каталога если выбрано

**Step 2 — Use Case Context (Art. 26):**
- Поля: Purpose* (textarea, "Для какой цели ваша компания использует этот инструмент?"), Use Case Details (textarea, "Опишите конкретный процесс: какие решения принимаются, какой output"), Domain* (dropdown: biometrics, HR, education, law_enforcement, immigration, infrastructure, healthcare, finance, general), Decision Impact* (radio: no_impact / advisory / significant / sole_decision — "Насколько AI влияет на решения о людях?"), Deployment Date (date picker — "Когда инструмент начал использоваться?")
- Tooltip на Purpose: "Если вы используете один инструмент (напр. ChatGPT) для нескольких целей — создайте отдельную запись для каждого use case"

**Step 3 — Data & Affected Persons:**
- Поля: Data Types* (multi-select checkboxes: personal, biometric, health, financial, behavioral, location), Affected Persons* (multi-select: employees, customers, patients, students, citizens, applicants), Vulnerable Groups? (toggle), Employees Informed? (toggle + info icon: "Art. 26(7): Были ли сотрудники и представители работников уведомлены об использовании этой AI-системы?")

**Step 4 — Autonomy & Oversight:**
- Поля: Autonomy Level* (radio: advisory/semi-autonomous/fully-autonomous), Human Oversight? (toggle), Affects Natural Persons? (toggle)

**Step 5 — Summary:**
- Read-only summary всех полей в формате карточек
- [Classify Now] большая primary CTA
- [Back] ghost кнопка

**Все шаги:** [Back] + [Next] навигация, индикатор автосохранения ("Saved ✓")

**Eva-Placeholder (Sprint 4):**
- Кнопка "Register with Eva" рядом с [Choose from Catalog] в Step 1
- При нажатии: открывается side panel (или slide-over) с Eva-чатом
- Eva проактивно спрашивает: "What AI tools does your company use?"
- На основе диалога Eva auto-fills поля визарда → создаёт draft AI Tool
- Визуально: ghost кнопка с иконкой чат-пузыря, tooltip "AI assistant helps you register"
- Mobile: full-screen overlay поверх визарда

---

### Screen 09: Classification Result (показывается после Step 5)

**Layout (centered, max-w-2xl):**
- **Risk Badge (large):** Full-width colored banner — "🟠 High Risk" с confidence "87%"
- **Method:** "Rule-Based" / "LLM + Cross-Validation" badge
- **Reasoning:** Раскрываемый текстовый блок с matched rules
- **Article References:** Chips: "Art. 26", "Art. 27", "Annex III §4"
- **Deployer Requirements:** Группированный список по категориям (Literacy, Oversight, Documentation, Transparency)
  - Каждый requirement: checkbox (future), name, article ref, estimated effort badge
- **Actions:** [View Tool Detail] primary (→ Screen 10) + [Add Another AI Tool] secondary

---

### Screen 10: Tool Detail `/tools/[id]`

**Header section:**
- Tool name + vendor + risk badge + domain badge
- 3 metric cards: Risk Level (colored), Compliance Status, Confidence %
- Кнопки действий: [Reclassify] secondary + [Delete] destructive (ghost)

**Табы:**
- **Requirements** (active) — checklist со status icons (✅ done, 🔄 in progress, ⬜ pending). Подробная спецификация → Screen 12
- **Classification** (Sprint 3 — details, history). Подробная спецификация → Screen 13
- **Documents** (Sprint 4 — FRIA, policies)
- **Audit Trail** (Sprint 4 — лог изменений)

> **Note:** Screens 12 и 13 описывают содержимое табов этого экрана. Это не отдельные страницы, а контент внутри табов Tool Detail.

**Блок Alternatives (под табами):**
- Показывается для High Risk и Prohibited инструментов
- Заголовок: "EU-Compliant Alternatives"
- 2-3 карточки из каталога с более низким риском в том же домене
- Карточка: name, vendor, risk badge, short description, [View Details] ссылка
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

**Mobile:** Одноколоночный, карточки стопкой, summary cards прокручиваются горизонтально

**4 summary cards (верхний ряд):**
1. AI Tools — общее количество + [+ Add AI Tool] ссылка (→ Wizard, Screen 08)
2. Classified — X/Y ratio + mini donut (risk distribution)
3. Compliance Score — 0-100% circular progress, цвет по диапазону (red <40, yellow 40-70, green >70)
4. AI Literacy — % trained + progress bar

**Виджет Risk Distribution:**
- Donut chart ИЛИ horizontal stacked bar
- Цвета по уровням риска (использовать точные risk-* токены)
- Клик по сегменту → переход на Tool Detail (Screen 10) для каждого инструмента в этой категории
- Легенда с количествами

**Панель Requires Attention:**
- Сортировка по серьёзности: prohibited > high without FRIA > untrained employees > deadlines
- Каждый элемент: severity icon + текст + ссылка на действие
- Максимум 5 элементов, [View all] если больше

**Compliance Timeline:**
- Вертикальный timeline с 3 milestones
- Прошедшие milestones: приглушённые/с галочкой
- Следующий milestone: выделен с обратным отсчётом "X days remaining"

**Recent Activity:**
- Последние 5 действий из AuditLog
- Относительные timestamps (2h ago, 1d ago)

**Eva-Placeholder (Sprint 4):**
- Мини-виджет "Ask Eva" в правом нижнем углу Dashboard (или как карточка в grid)
- Quick actions (chips): "What's my compliance status?", "Which tools am I missing?", "What should I do next?"
- При клике: переход на Eva Chat (Screen 14) или slide-over panel
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

**Строка requirement:**
- Status icon: ✅ done / 🔄 in progress / ⬜ pending
- Название requirement (кликабельно для раскрытия)
- Estimated effort badge (~Xh)
- Status tag (Done/Doing/Todo)
- **Раскрытое:** Recommendation text, guidance, ссылка на релевантное действие (FRIA wizard, document generator)

**Группировка по Article** — сворачиваемые секции с sub-progress (X of Y)

---

### Screen 13: Classification Detail Tab (таб на Tool Detail, Screen 10)

> **Это не отдельная страница.** Контент отображается как таб "Classification" на экране Tool Detail (Screen 10, `/tools/[id]`). Заменяет "coming soon" placeholder.

**Содержимое:**
- **Current Classification:**
  - Risk Level badge (large) + confidence bar
  - Method badge: "Rule-Based" / "LLM" / "Cross-Validated"
  - Reasoning text (раскрываемый)
  - Matched Rules list (из RuleEngine)
  - Article References как chips
  - Annex III domain (если применимо)

- **Classification History:**
  - Таблица: Version | Date | Method | Risk Level | Confidence | Classified By
  - Клик по строке → показать детали этой версии

- **[Reclassify]** кнопка внизу

---

## Детальные спецификации — Группа E (Sprint 4, Eva)

### Screen 14: Eva Chat — Conversational Onboarding `/eva` (side panel)

**Ref:** PRODUCT-BACKLOG Feature 06 (v3.1.0 — Eva Pivot)

> **Eva — не просто Q&A чат.** Eva — это альтернативный способ регистрации AI-инструментов через conversational onboarding. Eva проактивно помогает обнаружить и зарегистрировать инструменты.

**Layout (desktop — slide-over panel, 400px):**

```
┌─────────────────────────────────────────────┐
│  Eva — AI Compliance Assistant        [✕]   │
├─────────────────────────────────────────────┤
│                                             │
│  🤖 Hi! I'm Eva, your AI Compliance        │
│     Assistant. I can help you discover      │
│     and register AI tools.                  │
│                                             │
│  🤖 What AI tools does your company use?   │
│     For example ChatGPT, Copilot,          │
│     HireVue...                             │
│                                             │
│  👤 We use ChatGPT for content and         │
│     HireVue in HR for interviews           │
│                                             │
│  🤖 Thanks! I found 2 tools:               │
│     ✅ ChatGPT — Content (General)          │
│     ⚠️ HireVue — HR (High Risk, Annex III) │
│                                             │
│     Should I add these as drafts to your   │
│     inventory?                             │
│                                             │
│     [Yes, add them] [Edit details]         │
│                                             │
├─────────────────────────────────────────────┤
│  Quick Actions:                             │
│  [Discover AI Tools] [Compliance Status]    │
│  [What should I do?]  [Need FRIA?]         │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────┐ [↑]   │
│  │ Type a message...              │        │
│  └─────────────────────────────────┘        │
│  ⚖️ Not legal advice. Always consult       │
│     experts.                               │
└─────────────────────────────────────────────┘
```

**Conversational Onboarding Flow:**
1. Eva начинает с приветствия и проактивного вопроса об AI-инструментах
2. Пользователь описывает инструменты в свободной форме
3. Eva распознаёт инструменты, матчит с каталогом, определяет домен
4. Eva показывает inline-карточки с предварительной классификацией
5. Пользователь подтверждает → Eva создаёт draft AI Tools в inventory
6. Eva предлагает классифицировать: "Should I start the risk classification?"

**Q&A Mode:**
- Deployer-focused ответы по Art. 4, 26, 27, 50
- RAG по EU AI Act knowledge base
- Цитирование статей: inline badges "Art. 26 §3"
- Контекстные ответы: видит AI-инструменты и compliance status организации

**UI Elements:**
- Chat bubbles: Eva (left, muted bg) / User (right, primary bg)
- Streaming text (SSE via Vercel AI SDK `useChat`)
- Inline action cards: tool recognition cards с кнопками [Add] / [Edit]
- Quick actions chips (над input): suggested prompts, меняются в зависимости от контекста
- Disclaimer footer: всегда виден, юридическое уведомление
- Typing indicator: "Eva is thinking..."

**Точки доступа:**
- Sidebar nav: "Eva" menu item
- Dashboard: "Ask Eva" виджет (Screen 11)
- Wizard: "Register with Eva" кнопка (Screen 08)
- Tool Detail: "Ask Eva" контекстная ссылка

**Mobile:** Full-screen chat view, quick actions прокручиваемая строка, FAB кнопка на других экранах

---

## Детальные спецификации — Sprint 2.5 NEW

### Screen 16: Settings > Team Tab `/settings/team`

**Ref:** PRODUCT-BACKLOG Feature 02 (Sprint 2.5)

> **Sprint 2.5 реализует ТОЛЬКО Team tab.** Остальные табы (Profile, Company, Subscription, Security) → Sprint 4.

**Layout (desktop):**

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                    │
├──────────┬──────────────────────────────────────────────────┤
│  Profile │  Team                                             │
│  Company │                                                   │
│  Team ←  │  Your Team                  3 of 5 users         │
│  Billing │  ┌───────────────────────────────────────────┐   │
│  Security│  │ ████████████████░░░░░░  60%              │   │
│          │  └───────────────────────────────────────────┘   │
│          │                                                   │
│          │  [+ Invite Member]                                │
│          │                                                   │
│          │  ┌──────────────────────────────────────────────┐│
│          │  │ Name          Email            Role   Status  ││
│          │  │───────────────────────────────────────────────││
│          │  │ Max Mueller   max@acme.de      Owner  Active  ││
│          │  │ Anna Schmidt  anna@acme.de     Admin  Active [▼]│
│          │  │ Tom Weber     tom@acme.de      Member Active [▼]│
│          │  └──────────────────────────────────────────────┘│
│          │                                                   │
│          │  Pending Invitations                              │
│          │  ┌──────────────────────────────────────────────┐│
│          │  │ lisa@acme.de  Member  Expires: Feb 19, 2026   ││
│          │  │              [Resend] [Revoke]                 ││
│          │  └──────────────────────────────────────────────┘│
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

**PlanLimitBar (сверху):**
- Progress bar: "X of Y users" (currentUsers + pendingInvites / maxUsers)
- Цвет: green (<60%), yellow (60-90%), red (>90%)
- При 100%: bar красный, [+ Invite Member] disabled, tooltip "Plan limit reached. Upgrade your plan."

**[+ Invite Member] → InviteDialog (Modal):**
- Поля: Email Address (email input), Role (dropdown: Admin, Member, Viewer)
- [Send Invite] primary кнопка + [Cancel] ghost
- Валидация: формат email, не member/pending уже
- Ошибка: "Plan limit reached" если maxUsers превышен
- Успех: toast "Invitation sent to lisa@acme.de"

**Members Table (TeamMemberList):**
- Колонки: Name, Email, Role, Status, Actions
- Строка Owner: нет actions (immutable)
- Строки Admin/Member/Viewer (для owner): [▼] dropdown → Change Role (Admin/Member/Viewer), Remove
- Строки Admin/Member/Viewer (для admin): [▼] dropdown → Change Role (Member/Viewer), Remove
  - Admin НЕ МОЖЕТ назначить другого admin'а (только owner может)
- Строка self: нет actions (badge "This is you")
- Status: Active (green), Deactivated (red)

**Pending Invitations:**
- Inline под таблицей members
- Для каждого invite: email, role, expiry date, [Resend] + [Revoke] actions
- Expired: приглушённый текст, только [Resend]

**Mobile:** Табы → горизонтально прокручиваемые pills. Members как карточки вместо таблицы.

---

### Screen 16b: Accept Invitation `/invite/accept?token={uuid}`

**Ref:** PRODUCT-BACKLOG Feature 02 (Sprint 2.5)

**Layout (centered card, max-w-md):**

```
┌─────────────────────────────────────────┐
│  [🛡] AI Act Compliance                  │
│                                          │
│  Invitation to ACME Corp                 │
│                                          │
│  You've been invited as a Member.        │
│                                          │
│  Organization: ACME Corp                 │
│  Role: Member                            │
│  Invited by: max@acme.de                 │
│                                          │
│  [Create Account & Join]                 │
│  or                                      │
│  [Sign In & Join]                        │
│                                          │
└─────────────────────────────────────────┘
```

**Состояния:**
- **Loading:** Skeleton пока проверяется токен
- **Valid token (не залогинен):**
  - Показывает org name, role, inviter email
  - [Create Account & Join] → Ory registration (с return URL `/invite/accept?token=...`)
  - [Sign In & Join] → Ory login (с return URL)
- **Valid token (залогинен, email совпадает):**
  - Показывает org name, role
  - Если user в другой org: "You will leave your current organization ({currentOrg})" warning
  - [Join] primary кнопка → POST accept
  - Успех → redirect на /dashboard
- **Valid token (залогинен, email не совпадает):**
  - "This invitation is for {inviteEmail}. You are signed in as {currentEmail}."
  - [Sign out and use the correct account] → logout + redirect
- **Expired token:**
  - "This invitation has expired."
  - "Please ask the administrator to send you a new invitation."
- **Already accepted:**
  - "This invitation has already been accepted."
  - [Go to Dashboard] ссылка

**Mobile:** Тот же layout, full-width карточка

---

## Design System

### Уже есть в коде (shadcn/ui)

Button, Card, Badge, RiskBadge, Input, Label, Dialog, Table, Skeleton, Toast

### Нужны новые компоненты

| Компонент | Экраны | Описание |
|-----------|--------|----------|
| **StatCard** | Dashboard (11) | Число + label + trend/icon, цветная border-left по типу |
| **DonutChart** | Dashboard (11) | Risk distribution, 5 цветов, легенда, click-to-filter |
| **CircularProgress** | Dashboard (11) | Compliance score 0-100%, цвет по диапазону |
| **ProgressBar** | Requirements (12), Literacy | Горизонтальный progress с % label |
| **Timeline** | Dashboard (11) | Вертикальный timeline, past/current/future milestones |
| **AlertItem** | Dashboard (11) | Severity icon + текст + ссылка на действие |
| **RequirementRow** | Requirements (12) | Раскрываемая строка: status + name + effort + recommendation |
| **ArticleGroup** | Requirements (12) | Сворачиваемый заголовок секции с sub-progress |
| **ChatBubble** | Eva Chat (14) | Chat message: Eva (left, muted) / User (right, primary) |
| **AlternativeCard** | Tool Detail (10) | EU-compliant alternative: name, vendor, risk badge, description |
| **ToolListItem** | Wizard (08) | Элемент левой панели: name + risk badge + status icon, кликабельный |
| **BottomTabBar** | Mobile layout (06) | 5-tab mobile навигация |
| **StepIndicator** | Register (03), Wizard (08) | Step dots/labels с current/completed состояниями |
| **PlanLimitBar** | Settings Team (16) | "X of Y users" progress bar, цвет по пороговым значениям |
| **InviteDialog** | Settings Team (16) | Модальное окно: email + role dropdown + send кнопка |
| **TeamMemberList** | Settings Team (16) | Таблица: name, email, role, status, actions dropdown |

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
- **Доверие и авторитет** — EU compliance продукт, не игровой
- **Насыщенная информация** — дашборды показывают много данных, чёткая иерархия
- **Чистое пространство** — щедрое, но не расточительное
- **WCAG 2.1 AA** — контраст, focus indicators, keyboard nav
- **Без эмодзи в UI** — иконки рисков = цветные точки/фигуры, не emoji

---

## Deliverables

Для каждого экрана (17 total):

1. **Desktop (1280px)** — primary viewport
2. **Mobile (375px)** — обязателен для всех экранов
3. **Состояния:** default, hover, loading (skeleton), empty, error
4. **Аннотации:** какие shadcn/ui компоненты, spacing values, TailwindCSS class hints

### Приоритет (Sprint 3 deadline)

**P0 — нужно для Sprint 3 реализации:**
1. Screen 11: Compliance Dashboard
2. Screen 12: Requirements Checklist (таб на Screen 10)
3. Screen 13: Classification Detail Tab (таб на Screen 10)

**P1 — рефактор существующих wireframes (Sprint 1-2 pages):**
4. Screen 01: Landing Page
5. Screen 02: Login
6. Screen 03: Register
7. Screen 08: 5-Step Wizard (все шаги + Catalog Modal + Tool List panel)
8. Screen 09: Classification Result
9. Screen 10: Tool Detail (+ Alternatives block)

**P2 — Sprint 4+ запланированные экраны:**
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

| Endpoint | Method | Назначение | Sprint |
|----------|--------|------------|--------|
| `/api/auth/webhook` | POST | Ory identity sync | 1 |
| `/api/auth/me` | GET | Текущий user + org | 1 |
| `/api/organizations/:id` | PATCH | Обновление профиля org | 1 |
| `/api/auth/audit` | GET | Audit log (пагинация) | 1 |
| `/api/tools/catalog/search` | GET | Поиск по каталогу 225+ инструментов | 1 |
| `/api/tools/catalog/:id` | GET | Один инструмент из каталога | 1 |
| `/api/tools` | GET | Список инструментов (фильтры, пагинация) | 2 |
| `/api/tools` | POST | Регистрация нового инструмента | 2 |
| `/api/tools/:id` | GET | Детали инструмента + classification + requirements | 2 |
| `/api/tools/:id` | PATCH | Обновление инструмента (wizard step) | 2 |
| `/api/tools/:id` | DELETE | Удаление инструмента | 2 |
| `/api/tools/:id/classify` | POST | Запуск классификации | 2 |
| `/api/dashboard/summary` | GET | Агрегированные данные дашборда | 3 |
| `/api/tools/:id/requirements` | GET | Requirements сгруппированные по статье | 3 |
| `/api/tools/:id/requirements/:reqId` | PATCH | Обновление статуса/прогресса requirement | 3 |
| `/api/tools/:id/classification-history` | GET | История классификации (все версии) | 3 |
| `/api/tools/catalog/search?domain=&maxRisk=` | GET | Каталог с фильтрами domain + maxRisk | 3 |
| `/api/team/invite` | POST | Создание приглашения (email + role) | 2.5 |
| `/api/team/invite/verify?token=` | GET | Проверка токена приглашения (public) | 2.5 |
| `/api/team/invite/accept` | POST | Принятие приглашения (authenticated) | 2.5 |
| `/api/team/members` | GET | Список members + pending invites + limits | 2.5 |
| `/api/team/members/:userId` | PATCH | Изменение роли member | 2.5 |
| `/api/team/members/:userId` | DELETE | Удаление member (деактивация) | 2.5 |
| `/api/team/invitations/:id` | DELETE | Отзыв pending invitation | 2.5 |
| `/api/team/invitations/:id/resend` | POST | Повторная отправка invitation email | 2.5 |

---

## References

- `docs/wireframes/sprint-1-2-wireframes.md` — ASCII wireframes (desktop + mobile)
- `docs/PRODUCT-VISION.md` — Product vision, features, pricing
- `docs/DATA-FLOWS.md` — User flows с sequence diagrams
- `docs/PRODUCT-BACKLOG.md` — Описания фич
- Mood board: Linear, Vercel Dashboard, Stripe Dashboard, Vanta
- Избегать: consumer apps, gamified UX, тяжёлые иллюстрации

---

## Что НЕ дизайнить

- Admin panel (внутренний)
- Email templates (Brevo обрабатывает)
- PDF certificate/document layout (Gotenberg server-side)
- Native mobile app (только responsive web)
- Marketing pages кроме landing
