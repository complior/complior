# Compliance Metadata Spec (Agent Passport) — Design Specification

> **Status:** Draft
> **Date:** 2026-03-29
> **Author:** Marcus (CTO/Architect)
> **Route:** `/compliance-spec`
> **Access:** Public (no auth required)

---

## 1. Purpose

Promotional page for the **Agent Passport** — an open JSON Schema standard for AI compliance metadata. Goals:

1. **Developer adoption** — get teams to add `complior.json` to their AI projects
2. **Community building** — drive GitHub stars, contributions, and RFC discussions
3. **Authority positioning** — Complior as the creator of an open compliance standard
4. **SEO** — target: "AI compliance metadata", "AI Act machine-readable", "agent passport schema"

---

## 2. Target Audience

| Audience | Motivation |
|----------|-----------|
| AI/ML engineers | Embed compliance metadata in their projects (like package.json for compliance) |
| DevOps / Platform teams | Automate compliance checks in CI/CD pipelines |
| AI tool vendors | Self-assess and publish compliance status |
| Compliance consultants | Use structured data for audits instead of spreadsheets |
| Open-source maintainers | Add compliance metadata to their AI libraries |

---

## 3. The Standard: Agent Passport Schema

The Agent Passport is a JSON file (`complior.json`) that lives in the root of an AI project. It describes the AI tool's compliance posture in a machine-readable format.

### 3.1 Schema Fields (36 fields)

Based on `SyncPassportSchema` from the backend (`server/lib/schemas.js`):

**Core Identity:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | AI tool/agent name (1-255 chars) |
| `vendorName` | string | No | Organization that built the tool |
| `vendorUrl` | URL | No | Vendor website |
| `slug` | string | No | URL-friendly identifier |
| `description` | string | No | What the tool does (max 5000 chars) |
| `purpose` | string | No | Intended use case (max 2000 chars) |
| `domain` | string | No | Industry domain (e.g., "healthcare", "finance") |

**Risk Classification:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `riskLevel` | enum | No | prohibited, high, gpai, limited, minimal |

**Detection & Versioning:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `detectionPatterns` | string[] | No | Patterns for automatic discovery (package names, import paths) |
| `versions` | object | No | Version map (e.g., `{"sdk": "2.1.0", "model": "v3"}`) |

**Technical Stack:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `autonomyLevel` | enum | No | L1 (human-in-loop) → L5 (fully autonomous) |
| `framework` | string | No | ML framework (e.g., "pytorch", "langchain") |
| `modelProvider` | string | No | LLM provider (e.g., "openai", "mistral") |
| `modelId` | string | No | Specific model identifier |
| `dataResidency` | string | No | Where data is processed (e.g., "EU", "US") |

**Lifecycle & Compliance:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `lifecycleStatus` | enum | No | draft, review, active, suspended, retired |
| `compliorScore` | number | No | Compliance score 0-100 (computed by Complior) |

**Metadata:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `manifestVersion` | string | No | Schema version (e.g., "1.0") |
| `signature` | object | No | Cryptographic signature for verification |
| `extendedFields` | object | No | Custom fields for organization-specific needs |

---

## 4. Page Sections

### 4.1 Hero

**Layout:** Clean, developer-focused. Dark background with code-style accent.

**Content:**
- **Tagline:** "Open Standard"
- **Headline:** "Machine-readable AI compliance metadata"
- **Subtitle:** "Agent Passport is an open JSON Schema that makes AI compliance data portable, verifiable, and automatable. Like `package.json` — but for regulatory compliance."

**Two CTAs side by side:**
1. **Primary:** "View on GitHub →" → `https://github.com/complior/compliance-spec`
2. **Secondary:** "Install CLI →" (copy: `npx complior agent:init`)

**Badge row:**
- "Open Source" (AGPLv3 badge)
- "JSON Schema" (format badge)
- "v1.0" (version badge)

---

### 4.2 Schema Preview

**Layout:** Split view — JSON example on left, field descriptions on right

**Interactive JSON example (syntax-highlighted):**

```json
{
  "name": "Customer Support AI",
  "vendorName": "Acme Corp",
  "description": "AI-powered customer service chatbot for EU market",
  "purpose": "Automated customer query resolution",
  "domain": "customer-service",
  "riskLevel": "limited",
  "autonomyLevel": "L2",
  "framework": "langchain",
  "modelProvider": "openai",
  "modelId": "gpt-4o",
  "dataResidency": "EU",
  "lifecycleStatus": "active",
  "detectionPatterns": [
    "langchain",
    "@langchain/openai"
  ],
  "versions": {
    "sdk": "0.2.1",
    "model": "gpt-4o-2024-08-06"
  },
  "manifestVersion": "1.0",
  "extendedFields": {
    "gdprDpia": true,
    "humanOversightContact": "compliance@acme.com"
  }
}
```

**Interaction:**
- Hover/click on a JSON field → highlight corresponding description on the right
- Copy button for the full JSON
- "Try it" button → runs `npx complior agent:init` (shows terminal animation)

---

### 4.3 How It Works

**Layout:** 3-step horizontal flow (desktop), vertical (mobile)

**Steps:**

```
1. INIT                    2. SCAN                     3. SYNC
npx complior agent:init    npx complior                complior sync

Creates complior.json      CLI reads your passport,    Push compliance data
in your project root       scans your codebase,        to Complior dashboard
with guided prompts        and fills in detected        for monitoring and
                           metadata automatically       reporting
```

**Each step shows:**
- Terminal mockup with command + output
- Brief description (1-2 sentences)
- Time estimate: "~30 seconds" / "~2 minutes" / "~10 seconds"

---

### 4.4 Use Cases

**Layout:** 3-4 cards in a grid

| Use Case | Title | Description | Icon |
|----------|-------|-------------|------|
| CLI → SaaS Sync | "Dev to Dashboard" | Developers commit `complior.json` to their repo. CI/CD syncs it to the Complior dashboard. Compliance team sees real-time status without bothering developers. |  |
| Vendor Self-Assessment | "Vendor Transparency" | AI vendors publish their compliance passport alongside their product. Customers can verify compliance claims before procurement. |  |
| Auditor Verification | "Audit-Ready" | Auditors use the structured passport data instead of reviewing hundreds of pages. Machine-readable = faster, cheaper audits. |  |
| Multi-Tool Governance | "Portfolio View" | Organizations with 10+ AI tools track all compliance passports in one dashboard. Spot gaps across your entire AI portfolio. |  |

---

### 4.5 Conflict Resolution (Technical Detail)

**Layout:** Expandable section or tab — "How sync works under the hood"

**Show the merge strategy:**

| Field Category | Sync Winner | Reason |
|---------------|-------------|--------|
| Technical (vendorName, framework, modelProvider, modelId, dataResidency) | CLI wins | Developers know their tech stack best |
| Organizational (purpose, domain, riskLevel if already classified) | SaaS wins | Compliance team sets organizational context |
| Score (compliorScore) | Computed | Always recalculated after sync |

**Note:** "Conflicts are logged in sync history. Both CLI and dashboard users can review and resolve conflicts."

---

### 4.6 Getting Started

**Layout:** Terminal-style block with copy buttons

**Quick start:**

```bash
# Initialize a new passport in your project
npx complior agent:init

# Scan and auto-fill detected metadata
npx complior

# Sync passport to Complior dashboard (requires API key)
npx complior sync --token YOUR_API_KEY
```

**Validation:**

```bash
# Validate your complior.json against the schema
npx complior agent:validate

# Output:
# ✓ complior.json is valid
# ✓ 12/36 fields populated
# ⚠ Recommended: add riskLevel, autonomyLevel, dataResidency
```

**CI/CD Integration:**

```yaml
# .github/workflows/compliance.yml
name: Compliance Check
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx complior agent:validate
      - run: npx complior sync --token ${{ secrets.COMPLIOR_TOKEN }}
```

---

### 4.7 Community & Contribution

**Layout:** Contribution guidelines section

**Content:**
- "Agent Passport is an open RFC. We welcome contributions."
- Link to GitHub Issues for feature requests
- Link to Discussions for RFC process
- Contributor count + recent activity badges

**Contribution types:**
1. **New fields** — propose via RFC issue
2. **Industry extensions** — domain-specific `extendedFields` schemas (healthcare, finance, etc.)
3. **Tool integrations** — parsers for other compliance tools
4. **Translations** — schema descriptions in other languages

---

### 4.8 CTA Section (Bottom)

**Layout:** Full-width, accent background

**Content:**
- **Headline:** "Add compliance metadata to your AI project"
- **Subtitle:** "One file. One command. Full EU AI Act compliance tracking."
- **Primary CTA:** Copy block: `npx complior agent:init`
- **Secondary CTA:** "View on GitHub →" → repo link
- **Tertiary:** "Read the full spec →" → link to JSON Schema file in repo

---

## 5. Technical Requirements

### 5.1 Data
- **No API calls needed** — this is a static/content page
- JSON example is hardcoded (represents the schema, not live data)
- GitHub stats (stars, contributors) can be fetched via GitHub API at build time (ISR)

### 5.2 SEO
- **Title:** "Agent Passport — Open Standard for AI Compliance Metadata | Complior"
- **Description:** "Machine-readable AI compliance metadata. Open JSON Schema for tracking EU AI Act obligations across your AI tools. Free, open-source."
- **H1:** Contains "compliance metadata" or "Agent Passport"
- **Canonical:** `https://complior.ai/compliance-spec`

### 5.3 Code Blocks
- Syntax highlighting for JSON and bash (use Shiki or Prism)
- Copy-to-clipboard on all code blocks
- Terminal-style rendering for CLI commands (dark background, monospace)

### 5.4 Responsive
- Desktop: ≥1024px — split view for schema preview, horizontal flow for steps
- Tablet: 768-1023px — stacked layout
- Mobile: <768px — single column, collapsible JSON preview

### 5.5 Accessibility
- Code blocks have proper ARIA labels
- Copy buttons announce "Copied" to screen readers
- All interactive elements keyboard-navigable

---

## 6. Design References

- **Style:** Developer-focused, similar to stripe.com/docs or vercel.com/docs
- **Match landing page:** dark/light theme toggle, teal accent color, Inter + monospace fonts
- **Inspiration:** JSON Schema website, OpenAPI spec pages, npm package pages

---

## 7. Out of Scope (for v1)

- Interactive schema editor/playground
- Schema version comparison tool
- Community-submitted extensions gallery
- Automated passport generation from the web (CLI only for now)
- Multi-regulation support (EU AI Act only)

---

## 8. Dependencies

Before this page can go live:
1. **GitHub repo** `complior/compliance-spec` must exist with:
   - JSON Schema file (`schema/v1.0/agent-passport.json`)
   - README with full spec documentation
   - Example passports for different use cases
   - Contributing guidelines
2. **CLI commands** must be implemented:
   - `npx complior agent:init` — passport initialization wizard
   - `npx complior agent:validate` — schema validation
   - `npx complior sync` — push to dashboard (already exists)

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| GitHub stars (3 months) | 200+ |
| `npx complior agent:init` runs / month | 100+ |
| Page visits / month (organic) | 300+ |
| Conversion to dashboard signup | >3% |
