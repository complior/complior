# Regulation Database — Design Specification

> **Status:** Draft
> **Date:** 2026-03-29
> **Author:** Marcus (CTO/Architect)
> **Route:** `/regulations`
> **Access:** Public (no auth required)

---

## 1. Purpose

Public reference page for EU AI Act — all 108 obligations, enforcement timeline, penalty structure, and key definitions. Primary goals:

1. **SEO magnet** — target queries: "EU AI Act obligations", "AI Act timeline 2026", "AI Act penalties", "AI Act deployer requirements"
2. **Trust & authority** — position Complior as the definitive structured source for AI Act data
3. **Lead funnel** — every section ends with a soft CTA toward `/check` or signup

---

## 2. Target Audience

| Audience | What they look for |
|----------|--------------------|
| Compliance officers | Full obligation list, deadlines, penalty amounts |
| CTOs / Engineering leads | Which obligations are automatable, what evidence is needed |
| Legal counsel | Article references, exact penalty tiers, key definitions |
| Consultants | Structured data they can reference with clients |
| Journalists / Researchers | Timeline, key numbers, Digital Omnibus status |

---

## 3. Data Sources (Backend API)

All data is fetched from public REST endpoints. No authentication required.

| Endpoint | Returns | Key Fields |
|----------|---------|------------|
| `GET /v1/regulations/meta` | Regulation metadata | officialName, status, enactedDate, entryIntoForceDate, maxPenalty, riskLevels[], keyDefinitions{}, roles[] |
| `GET /v1/regulations/timeline` | 18 timeline events | phase, date, whatApplies, status (upcoming/in-force/completed) |
| `GET /v1/regulations/obligations?regulation=eu-ai-act` | 108 obligations (paginated) | title, articleReference, description, appliesToRole, appliesToRiskLevel[], severity, category, whatToDo[], whatNotToDo[], evidenceRequired, deadline, penaltyForNonCompliance, automatable |
| `GET /v1/regulations/scoring` | Scoring rules by risk level | checkId, weight, maxScore, riskLevel, description |

---

## 4. Page Sections

### 4.1 Hero

**Layout:** Full-width, dark background (consistent with landing page style)

**Content:**
- **Tagline:** "EU AI Act — Fully Structured"
- **Headline:** "108 obligations. Every deadline. Every penalty."
- **Subtitle:** "The EU AI Act decoded into actionable data — filterable, searchable, and machine-readable."

**Key metrics (4 stat cards):**

| Metric | Value | Source |
|--------|-------|--------|
| Obligations | 108 | `obligations.pagination.total` |
| Max Penalty | €35M / 7% | `meta.maxPenalty` |
| Enforcement Date | Aug 2, 2026* | `timeline` (high-risk phase) |
| Risk Levels | 5 | `meta.riskLevels.length` |

*Note: Display "Aug 2, 2026" with an asterisk and tooltip: "Digital Omnibus proposes delay to Dec 2, 2027 for Annex III. Not yet law." See section 4.6.

**CTA:** "Check your compliance →" → `/check`

---

### 4.2 Interactive Timeline

**Layout:** Horizontal scrollable timeline (desktop), vertical list (mobile)

**Data:** 18 events from `GET /v1/regulations/timeline`

**Visual design:**
- Horizontal axis = time (Feb 2025 → Aug 2027)
- Each event = a node on the timeline with:
  - **Date** (bold)
  - **Phase name** (e.g., "Stage 1: Prohibited Practices")
  - **What applies** (short description)
  - **Status badge:** `In Force` (green), `Upcoming` (amber), `Completed` (gray)
- Color coding: past events = solid, future = outline/dashed
- Current date marker (vertical line: "You are here")

**Key milestones to highlight (larger nodes):**
1. Feb 2, 2025 — AI Literacy + Prohibited Practices (In Force)
2. Aug 2, 2025 — GPAI + Transparency (In Force)
3. **Aug 2, 2026** — High-risk Annex III (Upcoming) — **STAR THIS: main compliance deadline**
4. Aug 2, 2027 — High-risk Annex I (Upcoming)

**Digital Omnibus overlay:** For events affected by the proposed delay, show a dashed alternative marker at the proposed date with label "Proposed: Dec 2, 2027" in amber.

**Interaction:**
- Click/tap a node → expand details panel below timeline
- Details show: full `whatApplies` text, link to relevant articles, `monitoringUrl` if available

---

### 4.3 Obligations Explorer

**Layout:** Table view (desktop) / Card view (mobile), with filter sidebar

**This is the main section — should dominate the page.**

**Filters (sidebar or top bar):**

| Filter | Type | Values |
|--------|------|--------|
| Role | Multi-select chips | Provider, Deployer, Both |
| Risk Level | Multi-select chips | Prohibited, High, GPAI, Limited, Minimal |
| Category | Dropdown or pills | 11 categories: ai_literacy, deployer_obligations, fria, transparency, human_oversight, monitoring, risk_management, data_governance, record_keeping, registration, post_market_monitoring |
| Severity | Multi-select chips | Critical, High, Medium, Low |
| Automatable | Toggle | Yes / Partial / No |
| Search | Text input | Free-text search across title, description, articleReference |

**Table columns (desktop):**

| Column | Width | Content |
|--------|-------|---------|
| Article | 80px | `articleReference` (e.g., "Art. 26(1)") |
| Obligation | flex | `title` — clickable, expands row |
| Role | 100px | Badge: Provider / Deployer / Both |
| Risk Level | 120px | Color-coded badges |
| Severity | 90px | Critical (red), High (orange), Medium (yellow), Low (gray) |
| Category | 120px | Human-readable label |
| Automatable | 80px | Icon: checkmark (yes), half (partial), cross (no) |

**Expanded row (on click) shows:**
- Full `description`
- **What to do:** bullet list from `whatToDo[]`
- **What NOT to do:** bullet list from `whatNotToDo[]` (if present)
- **Evidence required:** `evidenceRequired`
- **Deadline:** `deadline`
- **Frequency:** `frequency`
- **Penalty:** `penaltyForNonCompliance`
- **Automation approach:** `automationApproach` (if automatable)
- CTA: "Check this obligation →" → `/check`

**Card view (mobile):**
- Severity color band on left edge
- Title, article reference, role badge, risk badges
- Tap to expand full details

**Pagination:** 20 items per page (matches API default), load more button or infinite scroll

**Empty state:** "No obligations match your filters. Try adjusting your criteria."

---

### 4.4 Penalty Summary

**Layout:** 3-column card layout

**Content (from `meta.maxPenalty` + hardcoded structure):**

| Tier | Penalty | Applies To |
|------|---------|------------|
| Tier 1 — Prohibited Practices | €35M or 7% of annual global turnover | Art. 5 violations: social scoring, exploitation of vulnerabilities, real-time biometric identification (with exceptions) |
| Tier 2 — Non-compliance | €15M or 3% of annual global turnover | Non-compliance with requirements for high-risk AI, GPAI model obligations |
| Tier 3 — Incorrect Information | €7.5M or 1% of annual global turnover | Supplying incorrect, incomplete, or misleading information to authorities |

**Visual:**
- Cards with ascending severity: green border (Tier 3) → amber (Tier 2) → red (Tier 1)
- Large penalty numbers as hero text in each card
- "whichever is higher" note below each amount
- SME note: "For SMEs and startups, lower caps apply (Art. 99(5))"

---

### 4.5 Key Definitions

**Layout:** Accordion or 2-column grid of definition cards

**Data:** From `meta.keyDefinitions` object

**Must include (at minimum):**
- AI System
- Provider
- Deployer
- High-risk AI System
- General-Purpose AI (GPAI)
- Putting into Service
- Placing on the Market
- Reasonably Foreseeable Misuse
- Intended Purpose
- Serious Incident

**Each definition shows:**
- Term (bold)
- Definition text (from API)
- Article reference (e.g., "Art. 3(1)")

**CTA:** "See all definitions in our glossary →" (future link)

---

### 4.6 Digital Omnibus Banner

**Layout:** Info banner, amber/yellow background, placed between Hero and Timeline (or as a sticky notice)

**Content:**

```
⚠️ Digital Omnibus Proposal (November 2025)

The European Commission has proposed delaying certain deadlines:
• High-risk Annex III (HR, credit scoring, biometrics): Aug 2026 → Dec 2027
• High-risk Annex I (products, medical devices): Aug 2027 → Aug 2028

Status: IMCO/LIBE committee voted 101-9 in favor. Trilogue negotiations not yet started.
Until trilogue completes, the legally binding date remains August 2, 2026.

We recommend preparing for the original deadline.
```

**Visual:**
- Dismissible (but reappears on next visit until trilogue concludes)
- Amber warning icon
- "Last updated: [date]" in footer of banner
- Link to monitoring source if available

---

### 4.7 CTA Section (Bottom)

**Layout:** Full-width, teal/accent background

**Content:**
- **Headline:** "Know your obligations. Now act on them."
- **Subtitle:** "Run a free compliance check on your AI tools in 30 seconds."
- **Primary CTA:** "Check your compliance →" → `/check`
- **Secondary CTA:** "npx complior" (copy-to-clipboard, monospace style)

---

## 5. Technical Requirements

### 5.1 Data Fetching
- **SSR/ISR:** Page should be statically generated with ISR (revalidate every 24h)
- All 4 API calls can be parallelized on the server
- Obligations: fetch all pages server-side for SSR (full 108), client-side filtering with no additional API calls
- Timeline: 18 events, fetch once

### 5.2 SEO
- **Title:** "EU AI Act Obligations Database — 108 Requirements Explained | Complior"
- **Description:** "Complete structured database of EU AI Act obligations. Filter by role, risk level, and category. Timeline, penalties, and key definitions."
- **Structured data:** FAQ schema for definitions, Article schema for obligations
- **H1:** Single, contains "EU AI Act"
- **Canonical:** `https://complior.ai/regulations`

### 5.3 Performance
- Obligations table: virtualized if >50 rows visible (react-window or similar)
- Timeline: lazy-load on scroll into viewport
- Target: LCP < 2.5s, CLS < 0.1

### 5.4 Responsive Breakpoints
- Desktop: ≥1024px — table view, horizontal timeline
- Tablet: 768-1023px — compact table, horizontal timeline with scroll
- Mobile: <768px — card view, vertical timeline

### 5.5 Accessibility
- All filters keyboard-navigable
- Table sortable via keyboard
- Color is never the only indicator (always paired with text/icon)
- ARIA labels on all interactive elements

---

## 6. Design References

- **Style:** Match existing landing page aesthetic (dark/light theme toggle, teal accent, Inter + mono fonts)
- **Registry page** (`/registry`): Similar card/table pattern — reuse components where possible
- **Inspiration:** stripe.com/docs (clean tables), timeline components from shadcn/ui

---

## 7. Out of Scope (for v1)

- Multi-jurisdiction support (only EU AI Act for now)
- Obligation comparison tool
- PDF export of obligations
- User annotations or bookmarks
- Localization (English only for v1)
- Real-time Digital Omnibus status tracking (manual updates via seed data)

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Organic traffic (3 months) | 500 unique visitors/month from AI Act queries |
| Avg. time on page | >3 minutes |
| Click-through to `/check` | >5% of visitors |
| Bounce rate | <60% |
