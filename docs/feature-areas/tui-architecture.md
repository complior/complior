# Feature Area: TUI Architecture

> **Source:** `docs/TUI-DESIGN-SPEC.md`
> **Version:** 1.0.0
> **Date:** 2026-02-26
> **Purpose:** Terminal UI — 9 pages, daemon + TUI architecture
> **Status (v1.0.0):** 🟡 OPEN QUESTION — нужно решение: оставлять как отдельную сущность или схлопнуть с CLI/Daemon. Решение перед V2.

---

## 1. Architecture Change: Wrapper → Daemon

### Old (v1.0 — Wrapper)
```
complior (single binary)
├── TUI (ratatui) ← UI
├── PTY host ← agents as subprocess
├── Engine (TS) ← scanner, fixer, LLM
└── MCP Server ← for external agents
```
Problems: PTY rendering bugs, agents lose UX, single point of failure, no headless mode.

### New (v8 — Daemon + Dashboard)
```
complior daemon (background process)
├── File watcher (chokidar: rescan on changes)
├── Engine (TS) ← scanner, fixer, passport manager
├── MCP server ← tools for agents
├── HTTP API ← for TUI and CLI
└── State store ← in-memory + disk

complior tui ← separate TUI (connects to daemon via HTTP)
complior scan ← CLI command (connects or standalone)
Claude Code ← works separately, connects MCP server
```

---

## 2. Three Run Modes

```bash
# Mode 1: Daemon + TUI (interactive)
$ complior                   # daemon + TUI
$ complior tui                # connect to running daemon

# Mode 2: Daemon only (headless, CI/CD)
$ complior daemon             # no TUI
$ complior daemon --watch     # + file watcher (auto-rescan)

# Mode 3: Standalone CLI (single commands)
$ complior scan              # scan without daemon
$ complior passport init     # generate passports, exit
$ complior scan --ci --json  # CI/CD mode
```

---

## 3. TUI Pages (9 pages)

### Navigation

| Key | Page | Purpose |
|-----|------|---------|
| `D` | Dashboard | First view, overall status |
| `S` | Scan | Last scan details |
| `F` | Fix | Apply fixes (single page, two panels) |
| `P` | Passport | Agent passport management |
| `O` | Obligations | 108 EU AI Act obligations |
| `T` | Timeline | Activity timeline |
| `R` | Report | Full compliance report |
| `L` | Log | Readonly activity log |
| `C` | Chat | Interactive LLM chat |

**Global hotkeys:**
- `/` or `Ctrl+P` — Command palette
- `?` — Help
- `q` — Quit TUI (daemon continues)

**Status bar:** `[N] [1 Dashboard] [ctx:N%] [daemon: ●]`

---

## 4. Page Details

### Page 1: Dashboard [D]

First view. Answers: "How am I doing?"

```
┌─── (o)(o) ──────────────────────────────────────────────────────────────┐
│ \__/  complior v8.0         daemon: ● running    last scan: 12s ago    │
├── Status Log ────────────────────────────────────┬── Info ─────────────┤
│ [20:01] Scan complete: 67/100 (YELLOW)           │ complior/           │
│ [20:01] 500 files, 45 checks (32 pass, 13 fail) │ Score: 67/100 🟡    │
│ [20:02] Passport: 3 agents discovered           │ 32✓ 13✗ 500 files  │
├── Compliance Score ──────────────┬── EU AI Act Deadlines ──────────────┤
│  ██████████░░░░░░  67/100        │  389d  Art. 5 — Prohibited         │
│  🟡 YELLOW — Partially Compliant │  208d  Art. 50 — Transparency     │
│  Trend: ▁▂▃▅▆▆▇ (17→67 in 14d) │  157d  Art. 6 — High-risk ⚠        │
├── Quick Actions ─────────────────┼── AI Systems ───────────────────────┤
│  [F] Fix 8 items (+12 points)   │  🔧 loan-assessor    L3  67  ✅     │
│  [P] 3 passports need attention  │  🔧 fraud-detector   L4  43  ⚠     │
│  [S] Rescan project             │  🌐 Intercom Fin     L4  78  ✅ SaaS│
└──────────────────────────────────┴──────────────────────────────────────┘
```

**Sections:**
- Status Log (recent events)
- Compliance Score (gauge + zone + trend)
- EU AI Act Deadlines (countdown to key dates)
- Quick Actions (contextual buttons)
- AI Systems (from Passport — own + SaaS)
- Activity Log (recent operations)
- Score History (sparkline)

---

### Page 2: Scan [S]

Last scan details. All findings by OBL-xxx.

```
┌─── Scan ────────────────────────────────────────────────────────────────┐
│ [X] L1 Files   [X] L2 Docs   [X] L3 Config   [X] L4 Patterns   [-] L5│
│ ██ 100%         ██ 100%        ██ 100%          ██ 100%          skip  │
├─────────────────────────────────────────────────────────────────────────┤
│ Scan complete: 69/100 (0.0s, 500 files)                                │
│                                                                         │
│ Findings (45)  [All]  c:Critical  h:High  m:Medium  l:Low  p:Passed    │
├─────────────────────────────────────────────────────────────────────────┤
│  PASSED (32):                                                           │
│  ✓  ai-disclosure       Art. 50(1)  AI disclosure patterns found       │
│                                                                         │
│  FAILED (13):                                                           │
│  >* OBL-019  Art. 47  declaration-conformity — empty      HIGH        │
│  * OBL-021  Art. 73  incident-report — empty             HIGH           │
│  * OBL-011  Art. 26  monitoring-policy — empty           HIGH          │
```

---

### Page 3: Fix [F]

Single page with two panels: available fixes (left) + diff preview (right).

**Keys:** `Space` toggle, `a` select all, `n` deselect all, `d` diff, `Enter` apply.

---

### Page 4: Passport [P]

Per-agent compliance records. Shows completeness, missing fields, FRIA status.

---

### Page 5: Obligations [O]

108 EU AI Act obligations. Filterable by article, status, category.

---

### Page 6: Timeline [T]

Activity timeline. Shows scan, fix, passport events with timestamps.

---

### Page 7: Report [R]

Full compliance status report. Export to Markdown/PDF. Share link generation.

---

### Page 8: Log [L]

Readonly activity log. System events only. Cannot be modified.

---

### Page 9: Chat [C]

Interactive LLM chat. All roles (user/assistant/system). Input area, streaming responses.

---

## 5. MCP Server Connection

```jsonc
// Claude Code: ~/.claude/mcp.json
{
  "mcpServers": {
    "complior": {
      "command": "complior",
      "args": ["mcp"]
    }
  }
}
```

**Tools available:**
- `complior_scan` — run scan, get findings
- `complior_fix` — apply fix to finding
- `complior_score` — current score
- `complior_passport` — generate/read passport
- `complior_explain` — OBL-xxx in human language
- `complior_validate` — passport completeness check

## 8. Cross-Dependencies

| Depends on | How |
|---|---|
| **All Features** | TUI pages display Scanner, Fix, Passport, Report, Eval results |
| **SDK** | MCP Guard tools call SDK hooks internally |
| **Report** | Page 7 exports to PDF, Markdown via Report service |

| Used by | How |
|---|---|
| End user | Primary CLI/TUI interface for developers |

## 9. Test Coverage

51 Rust tests in cli/src/: app/tests.rs, headless/tests.rs, views/dashboard/ (11 files), views/fix, views/obligations, views/onboarding, views/passport, views/report, views/scan
