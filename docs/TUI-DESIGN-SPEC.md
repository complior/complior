# TUI DESIGN SPEC — Complior v8

**Версия:** 1.0.0
**Дата:** 2026-02-26
**Статус:** Draft
**Основание:** Daemon architecture, EU AI Act pipeline, Agent Passport three-mode model

---

## 1. АРХИТЕКТУРНОЕ ИЗМЕНЕНИЕ: Wrapper → Daemon

### 1.1. Что меняется

```
БЫЛО (v1.0 — Wrapper):
  complior             ← один бинарник, всё внутри
  ├── TUI (ratatui)    ← UI
  ├── PTY host         ← запуск агентов внутри как subprocess
  ├── Engine (TS)      ← scanner, fixer, LLM
  └── MCP Server       ← для внешних агентов

ПРОБЛЕМЫ:
  • PTY rendering багов ∞ (размеры, цвета, input passthrough)
  • Агенты теряют свой UX внутри Complior
  • Wrapper = single point of failure (крашнулся Complior = умерли агенты)
  • Нельзя использовать Complior без TUI (headless daemon)
  • Нельзя подключить Cursor/VS Code (не PTY-based)

СТАЛО (v8 — Daemon + Dashboard):
  complior daemon      ← фоновый процесс (headless)
  ├── File watcher     ← chokidar: пересканирует при изменениях
  ├── Engine (TS)      ← scanner, fixer, passport manager
  ├── MCP server       ← tools для агентов (scan, fix, passport)
  ├── HTTP API         ← для TUI и CLI
  └── State store      ← score, findings, passports (in-memory + disk)

  complior tui         ← отдельная TUI (подключается к daemon через HTTP)
  complior scan        ← CLI команда (подключается к daemon или standalone)
  Claude Code          ← работает отдельно, подключает MCP server
  Codex CLI            ← работает отдельно, подключает MCP server
```

### 1.2. Три режима запуска

```bash
# Mode 1: Daemon + TUI (интерактивная работа)
$ complior                   # запускает daemon + открывает TUI
$ complior tui               # подключается к running daemon

# Mode 2: Daemon only (headless, для CI/CD или фонового мониторинга)
$ complior daemon            # запускает daemon без TUI
$ complior daemon --watch    # + file watcher (auto-rescan)

# Mode 3: Standalone CLI (без daemon, разовые команды)
$ complior scan              # scan without daemon (starts engine, scans, exits)
$ complior agent:init        # generate passports (starts engine, generates, exits)
$ complior scan --ci --json  # CI/CD mode
```

### 1.3. Как агенты подключаются

```jsonc
// Claude Code: ~/.claude/mcp.json
{
  "mcpServers": {
    "complior": {
      "command": "complior",
      "args": ["mcp"],
      "env": {}
    }
  }
}

// MCP Tools, которые агент получает:
// - complior_scan        → запустить scan, получить findings
// - complior_fix         → применить fix к конкретному finding
// - complior_score       → текущий score
// - complior_passport    → сгенерировать/прочитать passport
// - complior_explain     → объяснить OBL-xxx человеческим языком
// - complior_validate    → проверить passport completeness
```

---

## 2. СТРАНИЦЫ TUI

### 2.1. Навигация

```
Hotkeys (global):
  D — Dashboard       S — Scan          F — Fix
  P — Passport        O — Obligations   T — Timeline
  R — Report          L — Log           C — Chat
  
  /command — Command palette (slash commands)
  Ctrl+P   — Command palette (fuzzy search)
  ?        — Help
  q        — Quit TUI (daemon continues)

Status bar (bottom):
  [17] [1 Dashboard]  [ctx:21%]  [daemon: ●]
  NORMAL  D:dash S:scan F:fix P:passport O:oblig T:time R:report L:log C:chat ?:help
```

9 страниц. Было 8 (Dashboard, Agents, Scan, Fix×2, Report, Log, Orchestrator).
Убрано 2 (Agents/PTY wrapper, Orchestrator). Добавлено 4 (Passport, Obligations, Timeline, Chat).
Fix объединён в одну страницу с двумя панелями.
Log — readonly activity log (System events only). Chat — interactive LLM chat (all roles, input area, streaming).

---

### 2.2. PAGE 1: Dashboard [D]

> Первое что видит пользователь. Ответ на вопрос: "Как у меня дела?"

```
┌─── (o)(o) ──────────────────────────────────────────────────────────────┐
│ \__/  complior v8.0         daemon: ● running    last scan: 12s ago    │
├── Status Log ────────────────────────────────────┬── Info ─────────────┤
│ [20:01] Scan complete: 67/100 (YELLOW)           │ complior/           │
│ [20:01] 500 files, 45 checks (32 pass, 13 fail) │ Score: 67/100 🟡    │
│ [20:02] Passport: 3 agents discovered            │ 32✓ 13✗ 500 files  │
│ [20:02] Fix available: 8 auto-fixable items      │                    │
│ [20:03] File changed: src/agent.ts → rescan...   │ Checks ─────────── │
│ [20:03] Score: 67 → 69 (+2)                      │ ✓ prohibited_prac  │
│                                                   │ ✗ risk_management  │
│                                                   │ ✗ documentation    │
│                                                   │ ✗ transparency     │
│                                                   │ ✓ technical_safeg  │
├── Compliance Score ──────────────┬── EU AI Act Deadlines ──────────────┤
│                                  │                                      │
│  ██████████░░░░░░  67/100        │  389d overdue  Art. 5 — Prohibited   │
│                                  │  208d overdue  Art. 50 — Transparency│
│  🟡 YELLOW — Partially Compliant │  157d left     Art. 6 — High-risk ⚠ │
│                                  │                                      │
│  Trend: ▁▂▃▅▆▆▇ (17→67 in 14d)  │  Passport Completeness: 58% (21/36) │
│                                  │                                      │
├── Quick Actions ─────────────────┼── AI Systems ───────────────────────┤
│                                  │                                      │
│  [F] Fix 8 items (+12 points)    │  🔧 loan-assessor    L3  67  ✅     │
│  [P] 3 passports need attention  │  🔧 fraud-detector   L4  43  ⚠     │
│  [S] Rescan project              │  🔧 doc-generator    L2  89  ✅     │
│  [O] 23 obligations pending      │  🌐 Intercom Fin     L4  78  ✅ SaaS│
│                                  │  🌐 Stripe Radar     L5  85  ✅ SaaS│
│                                  │                                      │
├── Activity Log ──────────────────┼── Score History ────────────────────┤
│ [20:03] S 69/100 (+2)            │                                      │
│ [20:01] S 67/100                 │  ▁▂▃▅▆▆▇                            │
│ [19:45] F 14 fixes applied       │  Latest: 69/100 (15 scans)          │
│ [19:30] P passport generated ×3  │                                      │
│ [19:15] S 17/100 (initial)       │                                      │
└──────────────────────────────────┴──────────────────────────────────────┘
[fix] Score 69/100. 8 fixable items — press F for Fix view
[17] [1 Dashboard]  [ctx:43%] [daemon: ●]
NORMAL  D:dash S:scan F:fix P:passport O:oblig T:time R:report L:log C:chat
```

**Отличия от v1.0 Dashboard:**
- Убрана секция Files (не нужна — это не файловый менеджер)
- Добавлена Passport Completeness (58%, 21/36 fields)
- Добавлена секция AI Systems (из Passport — свои + SaaS)
- Quick Actions привязаны к конкретным действиям
- Daemon status indicator (● running)
- File watcher: auto-rescan при изменениях

---

### 2.3. PAGE 2: Scan [S]

> Детали последнего скана. Все findings по OBL-xxx.

```
┌─── Scan ────────────────────────────────────────────────────────────────┐
│ [X] L1 Files   [X] L2 Docs   [X] L3 Config   [X] L4 Patterns   [-] L5│
│ ██ 100%         ██ 100%        ██ 100%          ██ 100%          skip  │
├─────────────────────────────────────────────────────────────────────────┤
│ Scan complete: 69/100 (0.0s, 500 files)                                │
│                                                                         │
│ Findings (45)  [All]  c:Critical  h:High  m:Medium  l:Low  p:Passed    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  PASSED (32):                                                           │
│  ✓  ai-disclosure       Art. 50(1)  AI disclosure patterns found  INFO │
│  ✓  content-marking     Art. 50(2)  Content marking found         INFO │
│  ✓  interaction-logging Art. 12     Structured logging found      INFO │
│  ✓  ai-literacy         Art. 4      Policy file found             INFO │
│  ...                                                                    │
│                                                                         │
│  FAILED (13):                                                           │
│ >* OBL-019  Art. 47  declaration-conformity — empty      HIGH   [fixable]│
│  * OBL-021  Art. 73  incident-report — empty             HIGH   [fixable]│
│  * OBL-011  Art. 26  monitoring-policy — empty           HIGH   [fixable]│
│  * OBL-005  Art. 11  tech-documentation — empty          HIGH   [fixable]│
│  * OBL-012  Art.26(7) worker-notification — empty        HIGH   [fixable]│
│  - OBL-001  Art. 4   ai-literacy — missing sections      MED   [fixable]│
│  - OBL-002  Art. 5   art5-screening — missing sections   MED   [fixable]│
│  - OBL-013  Art. 27  fria — missing sections             MED   [fixable]│
│  - OBL-015  Art.50(1) bare API call ai.ts:16             MED   [fixable]│
│  - OBL-015  Art.50(1) bare API call confidence.test.ts   MED   [fixable]│
│  - OBL-008  Art.15(4) unsafe eval() layer4-patterns.ts   MED           │
│  - OBL-009  Art. 10  no bias testing library detected     LOW           │
│  - OBL-009  Art. 15(4) no compliance scan in CI/CD       LOW           │
│                                                                         │
├── Detail (OBL-019) ────────────────────────────────────────────────────┤
│                                                                         │
│  EU AI Act Obligation: OBL-019                                          │
│  Article: 47 — Declaration of Conformity                                │
│  Risk: HIGH-RISK systems must have declaration of conformity            │
│  Penalty: €15M / 3% turnover                                           │
│  Deadline: 2 Aug 2026 (157 days)                                        │
│                                                                         │
│  File: engine/core/data/templates/declaration-conformity.md                  │
│  Issue: Document is empty or has no headings (0/3 required sections)    │
│  Fix: complior fix --id OBL-019 (generates template with 3 sections)   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
NORMAL  a:All c:Crit h:High m:Med l:Low Enter:detail f:fix x:explain j/k
```

**Отличия от v1.0 Scan:**
- Detail panel показывает: OBL-xxx, Article, Penalty, Deadline
- `x` hotkey = explain obligation in human language
- `f` на finding = jump to Fix page with this item pre-selected
- Findings группируются по severity (не перемешаны)
- `p` hotkey = показать passed checks (сейчас скрыты по дефолту)

---

### 2.4. PAGE 3: Fix [F]

> Список исправимых items + diff preview. Одна страница, два панели.

```
┌─── Fix — Fixable (8) ───────────────────┬── Diff Preview ──────────────┐
│                                          │                              │
│  [x] OBL-001 Art. 4: ai-literacy        │ OBL-011: monitoring-policy   │
│        missing sections +3 APPLIED       │                              │
│  [x] OBL-005 Art. 11: tech-doc          │ Suggested fix:               │
│        empty document +5 APPLIED         │ Generate monitoring-policy   │
│  [x] OBL-011 Art. 26: monitoring        │ document with required       │
│        empty document +5 APPLIED         │ sections:                    │
│  [ ] OBL-012 Art.26(7): worker-notif    │                              │
│ >     empty document +5                  │ ## 1. Monitoring Scope       │
│  [ ] OBL-013 Art. 27: fria              │ ## 2. Responsible Persons    │
│        missing sections +3               │ ## 3. Monitoring Schedule    │
│  [x] OBL-015 Art.50(1): bare API ×5     │ ## 4. Escalation Procedures  │
│        disclosure injection +3 ea.       │ ## 5. Review Frequency       │
│  [ ] OBL-019 Art. 47: conformity        │                              │
│        empty document +5                 │ File: engine/core/data/templates/ │
│  [x] OBL-021 Art. 73: incident-report   │   monitoring-policy.md       │
│        empty document +5 APPLIED         │                              │
│                                          │                              │
├──────────────────────────────────────────┤                              │
│ Selected: 5  Impact: +31                 │                              │
│ Current: 69 → Predicted: 100             │                              │
│                                          │                              │
│ [Space] Toggle  [a] All  [n] None       │                              │
│ [d] Diff  [Enter] Apply                 │                              │
└──────────────────────────────────────────┴──────────────────────────────┘
[fix] 5 selected, predicted score: 100/100
NORMAL  Space:toggle a:all n:none d:diff </>:resize Enter:apply j/k:nav
```

**Без изменений по сравнению с v1.0** — эта страница уже хорошо работает. Единственное добавление: predicted score показывает 100 вместо 67, и OBL-xxx ID видны в списке.

---

### 2.5. PAGE 4: Passport [P] — 🆕 НОВАЯ

> Все Agent Passports в проекте. Центральный артефакт.

```
┌─── Passport — AI Systems (5) ──────────────┬── Detail ─────────────────┐
│                                             │                           │
│  Src │ Name           │ L │Score│Compl│Status│ loan-assessor             │
│  ────│────────────────│───│─────│─────│──────│                           │
│  🔧  │ loan-assessor  │L3 │ 67  │ 72% │ ⚠   │ Identity                  │
│ >🔧  │ fraud-detector │L4 │ 43  │ 44% │ ❌  │   ID: ag_7f3d8a2e...     │
│  🔧  │ doc-generator  │L2 │ 89  │ 91% │ ✅  │   Framework: LangChain   │
│  🌐  │ Intercom Fin   │L4 │ 78  │ 83% │ ✅  │   Model: claude-sonnet-4 │
│  🌐  │ Stripe Radar   │L5 │ 85  │ 86% │ ✅  │   Type: autonomous       │
│                                             │                           │
│  🔧 = CLI (auto)  🌐 = SaaS (manual)       │ Autonomy: L3 Supervised   │
│  Compl = Passport Completeness %            │   human_gates: 2          │
│                                             │   unsupervised: 5         │
│                                             │   no_logging: 0           │
│                                             │                           │
│                                             │ Risk: LIMITED (Art.50)    │
│                                             │                           │
│                                             │ Obligations ──────────── │
│                                             │   ✅ Art.50(1) disclosure │
│                                             │   ✅ Art.12 logging       │
│                                             │   ✅ Art.26(2) owner      │
│                                             │   ❌ Art.27 FRIA          │
│                                             │   ❌ Art.49 EU Database   │
│                                             │   ❌ Art.26(7) workers    │
│                                             │   ⚠ Art.14 human gate    │
│                                             │                           │
│                                             │ Completeness: 72%         │
│                                             │ ███████░░░ 26/36 fields  │
│                                             │                           │
│                                             │ Actions ────────────────  │
│                                             │ [g] Generate FRIA         │
│                                             │ [e] Export (A2A/AIUC-1)   │
│                                             │ [v] Validate              │
│                                             │ [d] Diff (manifest↔code)  │
└─────────────────────────────────────────────┴───────────────────────────┘
NORMAL  Enter:detail g:gen-fria e:export v:validate d:diff j/k:nav
```

**Что нового:**
- Список всех AI систем (CLI auto + SaaS manual)
- Per-system: Autonomy L1-L5, Score, Passport Completeness %, obligations status
- Detail panel: identity, risk class, per-obligation checklist
- Actions: generate FRIA, export to A2A/AIUC-1, validate, diff
- 🔧/🌐 icons показывают source (auto vs manual)
- Visibility toggle (SaaS): Private (default) / Public / Badge only
- Community Evidence hints для vendor tools (Mode 3): "89% received DPA"

---

### 2.6. PAGE 5: Obligations [O] — 🆕 НОВАЯ

> 108 obligations EU AI Act. Что выполнено, что нет, deadlines.

```
┌─── Obligations — EU AI Act (108) ───────────────────────────────────────┐
│                                                                          │
│  Filter: [All]  d:Deployer  p:Provider  b:Both                          │
│  Risk:   [All]  h:High  l:Limited  m:Minimal  u:Unacceptable            │
│  Status: [All]  ✅:Done  ⚠:Partial  ❌:Missing                          │
│                                                                          │
│  Summary: 38/108 done (35%)  47 partial  23 missing                     │
│  ████████░░░░░░░░░░░░░░░░░░  35%                                        │
│                                                                          │
├── Critical (overdue/upcoming) ──────────────────────────────────────────┤
│                                                                          │
│  ❌ OBL-013  Art.27    FRIA                      HIGH   157d left  €15M │
│  ❌ OBL-014  Art.49    EU Database Registration   HIGH   157d left  €15M │
│  ❌ OBL-012  Art.26(7) Worker Notification        HIGH   157d left  €15M │
│  ⚠ OBL-011  Art.26    Use Per Instructions       HIGH   157d left  €15M │
│  ⚠ OBL-005  Art.11    Technical Documentation    HIGH   157d left  €15M │
│                                                                          │
├── By Category ──────────────────────────────────────────────────────────┤
│                                                                          │
│  Technical (23)        ██████████████░░░░  65%  15/23 done              │
│  Organizational (28)   ████████░░░░░░░░░░  32%   9/28 done              │
│  Transparency (20)     ████████████████░░  80%  16/20 done              │
│  Assessment (17)       ████░░░░░░░░░░░░░░  18%   3/17 done              │
│  Documentation (10)    ██████░░░░░░░░░░░░  30%   3/10 done              │
│  Reporting (4)         ░░░░░░░░░░░░░░░░░░   0%   0/4  done              │
│  Monitoring (3)        ██████████░░░░░░░░  33%   1/3  done              │
│  Registration (2)      ░░░░░░░░░░░░░░░░░░   0%   0/2  done              │
│  Training (1)          ██████████████████ 100%   1/1  done              │
│                                                                          │
├── Detail (OBL-013) ────────────────────────────────────────────────────┤
│                                                                          │
│  Art.27 — Fundamental Rights Impact Assessment (FRIA)                   │
│  Role: Deployer          Risk: High-risk systems only                   │
│  Penalty: €15M / 3%      Deadline: 2 Aug 2026                           │
│                                                                          │
│  Status: ❌ NOT DONE                                                     │
│  Affected systems: loan-assessor (L3), fraud-detector (L4)              │
│                                                                          │
│  What to do:                                                             │
│    1. Generate FRIA from Passport: complior fria:generate                │
│    2. Legal review of generated document                                 │
│    3. Submit to market surveillance authority                            │
│                                                                          │
│  Complior coverage: 70% (template + pre-fill from Passport)             │
│  [g] Generate FRIA now                                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
NORMAL  d:deployer p:provider Enter:detail g:generate j/k:nav
```

---

### 2.7. PAGE 6: Timeline [T] — 🆕 НОВАЯ

> Визуальный таймлайн к дедлайну. Critical path.

```
┌─── Timeline — 157 days to EU AI Act enforcement ────────────────────────┐
│                                                                          │
│  TODAY                                                                   │
│  │    Feb 26                                                             │
│  ▼                                                                       │
│  ├──── Mar ───────────── Apr ──────────── May ─── Jun ─── Jul ─── Aug ──│
│  │                        │                                    │         │
│  │ NIST deadline ─────────┤                                    │  Aug 2  │
│  │ Apr 2                  │                                    │  EU AI  │
│  │                        │                                    │  Act    │
│  │                                                             │ ENFORCE │
│  │                                                                       │
│  ├── CRITICAL PATH ────────────────────────────────────────────────────  │
│  │                                                                       │
│  │  Week 1-2: [████░░] FRIA for 2 high-risk systems                     │
│  │  Week 2-3: [██░░░░] Worker Notification (HR + legal)                 │
│  │  Week 3:   [█░░░░░] EU Database Registration (2 systems)             │
│  │  Week 3-6: [██████] SDK integration (compliorAgent())                │
│  │  Week 6-8: [████░░] AIUC-1 cert readiness                            │
│  │  Week 8-10:[██░░░░] Adversarial testing                               │
│  │  Week 10+: [██░░░░] Audit Package preparation                        │
│  │                                                                       │
│  ├── STATUS ───────────────────────────────────────────────────────────  │
│  │                                                                       │
│  │  Obligations: 38/108 done ─── 47 partial ─── 23 missing              │
│  │  AI Systems:  5 registered, 2 high-risk                               │
│  │  Score:       69/100 (need 80+ for comfortable)                       │
│  │  Effort:      ~47 story points compliance debt                        │
│  │                                                                       │
│  │  ⚠ RISK: FRIA not started for 2 high-risk systems.                   │
│  │    FRIA takes 1-3 weeks with legal review.                            │
│  │    START NOW to meet Aug 2 deadline.                                  │
│  │                                                                       │
└──────────────────────────────────────────────────────────────────────────┘
NORMAL  j/k:scroll
```

---

### 2.8. PAGE 7: Report [R]

> Без изменений по сравнению с v1.0. Compliance Report с Category Scores и All Findings. Добавлен `e` hotkey для export в PDF/MD/JSON.

### 2.9. PAGE 8: Log [L]

> Без изменений по сравнению с v1.0. Activity log. Добавлен daemon log (agent connects, file changes, auto-rescans).

---

## 3. CLI COMMANDS

> CLI команды работают standalone (без daemon) или через daemon (если running).
> Каждая команда = одна атомарная операция. TUI = визуализация тех же данных.

### 3.1. Global Flags

```bash
complior [command] --engine-url <URL>    # Engine URL override (e.g. http://127.0.0.1:3099)
complior [command] --resume              # Resume previous session
complior [command] --theme <THEME>       # Color theme (dark, light, dracula, nord, solarized)
complior [command] --yes / -y            # Skip interactive onboarding, use defaults
complior [command] --no-color            # Disable colored output (same as NO_COLOR=1)
```

### 3.2. Core Commands

```bash
# TUI
complior                                 # start daemon + TUI dashboard (default)
complior -y                              # start TUI, skip onboarding wizard

# Project Setup
complior init                            # create .complior/ (like git init)
complior init ./path                     # init at specific path

# Scanning — 5-layer static analysis
complior scan [path]                     # scan project, output to stdout
complior scan --ci                       # CI mode: exit 0 if score >= threshold, exit 1 otherwise
complior scan --ci --threshold 80        # set score threshold (default: 50)
complior scan --json                     # JSON output for piping
complior scan --sarif                    # SARIF v2.1.0 output (IDE integration)
complior scan --no-tui                   # headless human-readable output
complior scan --quiet / -q               # show only critical findings and score
complior scan --fail-on <LEVEL>          # fail on severity level (critical, high, medium, low)
complior scan --agent <name>             # filter findings by agent (passport source_files)
complior scan --deep                     # Tier 2: external security tools (Semgrep, Bandit, etc.)
complior scan --llm                      # L5: AI-powered document quality analysis
complior scan --cloud                    # Tier 3: cloud-based analysis (planned)
complior scan --deep --llm --cloud       # Tier 3+: all analysis layers combined
complior scan --diff <branch>            # diff mode: compare against base branch
complior scan --diff main --fail-on-regression  # exit 1 if score regressed
complior scan --diff main --comment      # post diff as PR comment (requires gh CLI)

# Fixing — apply compliance fixes
complior fix [path]                      # preview fixes from scan findings
complior fix --dry-run                   # preview without modifying files
complior fix --json                      # JSON output
complior fix --ai                        # use LLM to enrich generated documents
complior fix --source scan               # fixes from scan findings (default)
complior fix --source eval               # fixes from eval failures

# Daemon — background compliance monitoring
complior daemon                          # start daemon (headless, default)
complior daemon --watch                  # daemon + file watcher (auto-rescan)
complior daemon start                    # start daemon (explicit)
complior daemon start --watch            # start with file watcher
complior daemon start --port 4000        # bind to specific port (default: auto)
complior daemon status                   # check if daemon running
complior daemon stop                     # stop running daemon

# Report
complior report [path]                   # generate compliance report (markdown)
complior report --format md              # markdown format (default)
complior report --format pdf             # PDF format
complior report --output report.md       # custom output path

# Utilities
complior version                         # show version and build info
complior doctor                          # diagnose system health (engine, config)
complior update                          # check for and install updates
```

> **Project root discovery:** Когда `.complior/` не найдена в CWD, TUI автоматически ищет корень проекта вверх по каталогам (до 10 уровней, стоп на `$HOME`). Маркеры: `.complior/`, `.git/`, `Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, `pom.xml`, `build.gradle`, `.project`. Если маркер не найден — fallback на CWD.
>
> `complior init` создаёт `.complior/` с `project.toml` (TUI config) и `profile.json` (engine config), затем автоматически обнаруживает AI-агентов и создаёт паспорта. Если не запускать `init` вручную — `.complior/` создаётся автоматически при завершении onboarding wizard.

### 3.3. Agent Passport Commands

```bash
# Generation
complior agent init [path]                        # (optional) manual agent discovery (init does this automatically)
complior agent init --force                       # overwrite existing passports
complior agent init --json                        # JSON output

# Management
complior agent list [path]                        # table of all passports
complior agent list --verbose / -v                # extended columns (framework, model, owner, files)
complior agent list --json                        # JSON output
complior agent show <name> [path] --json          # show specific passport (JSON)
complior agent show <name>                        # show specific passport (human)
complior agent rename <old> <new> [path]          # rename passport (file + name + re-sign)
complior agent rename <old> <new> --json          # JSON output

# Validation
complior agent validate [name] [path]             # validate all or specific passport
complior agent validate --ci                      # CI mode: exit 1 if validation fails
complior agent validate --strict                  # strict: warnings also cause failure
complior agent validate --verbose                 # show per-field breakdown (filled/empty)
complior agent validate --json                    # JSON output
complior agent completeness <name> [path]         # detailed completeness breakdown
complior agent completeness <name> --json         # JSON output
complior agent autonomy [path]                    # analyze project autonomy (L1-L5)
complior agent autonomy --json                    # JSON output
complior agent diff <name> [--path PATH]          # compare passport versions
complior agent diff <name> --json                 # JSON output

# Export / Import
complior agent export <name> --format a2a [path]   # export to A2A Agent Card
complior agent export <name> --format aiuc-1       # export for AIUC-1 evidence
complior agent export <name> --format nist         # export for NIST AI RMF
complior agent export <name> --format a2a --json   # JSON output
complior agent import --from a2a <file> [--path P] # import A2A Agent Card → passport
complior agent import --from a2a <file> --json     # JSON output

# Document Generation
complior agent fria <name> [path]                 # generate FRIA from passport (Art.27)
complior agent fria <name> --organization "Acme"  # organization name for header
complior agent fria <name> --impact "..."         # impact description (Section 4)
complior agent fria <name> --mitigation "..."     # mitigation measures (Section 4)
complior agent fria <name> --approval "Jane, CTO" # decision-maker sign-off (Section 10)
complior agent fria <name> --json                 # JSON output
complior agent notify <name> [path]               # worker notification (Art.26(7))
complior agent notify <name> --company-name "Acme"       # company name for header
complior agent notify <name> --contact-name "Jane Doe"   # contact person
complior agent notify <name> --contact-email "j@acme.com"# contact email
complior agent notify <name> --contact-phone "+1-555"    # contact phone
complior agent notify <name> --deployment-date "2026-08" # planned deployment date
complior agent notify <name> --affected-roles "Support"  # affected roles/departments
complior agent notify <name> --impact-description "..."  # how system affects workers
complior agent notify <name> --json                      # JSON output
complior agent policy <name> --industry hr [path]  # generate AI usage policy (Art.6)
complior agent policy <name> --industry finance    # industries: hr, finance, healthcare,
complior agent policy <name> --industry healthcare #   education, legal
complior agent policy <name> --organization "Acme" # organization name for header
complior agent policy <name> --approver "Jane, CTO"# approver name/title
complior agent policy <name> --json                # JSON output
complior agent test-gen <name> [--path P]          # generate compliance tests from constraints
complior agent test-gen <name> --json              # JSON output
complior agent audit-package [path]                # generate audit package (tar.gz)
complior agent audit-package --output audit.tar.gz # custom output path
complior agent audit-package --json                # JSON metadata output

# Governance
complior agent registry [path]                    # unified per-agent compliance scores
complior agent registry --json                    # JSON output
complior agent permissions [path]                 # cross-agent permissions matrix + conflicts
complior agent permissions --json                 # JSON output
complior agent evidence [path]                    # evidence chain summary
complior agent evidence --verify                  # verify chain integrity (hashes + signatures)
complior agent evidence --json                    # JSON output
complior agent audit [path]                       # audit trail (compliance event log)
complior agent audit --agent <name>               # filter by agent
complior agent audit --since 2026-01-01           # filter events since date (ISO)
complior agent audit --type scan.completed        # filter by event type
complior agent audit --limit 100                  # max entries (default: 50)
complior agent audit --json                       # JSON output
```

### 3.4. Eval Commands

```bash
# Dynamic AI system evaluation (688 tests: 168 det + 212 LLM + 300 security)
complior eval <url>                      # eval target (deterministic tests by default)
complior eval <url> --det                # deterministic tests only (168 tests)
complior eval <url> --llm                # LLM-judged tests (212 tests, requires API key)
complior eval <url> --security           # security probes (300, OWASP LLM Top 10)
complior eval <url> --full               # all: deterministic + LLM + security (688 tests)
complior eval <url> --det --llm          # combine tiers: det + LLM (380 tests)
complior eval <url> --llm --security     # combine tiers: LLM + security (512 tests)
complior eval <url> --agent <name>       # link results to passport (updates eval block)
complior eval <url> --categories transparency,bias,prohibited  # filter categories (comma-separated)

# Output
complior eval <url> --json               # JSON output
complior eval <url> --verbose            # show probe/response for all tests
complior eval <url> --ci                 # CI mode: exit 2 if score < threshold
complior eval <url> --ci --threshold 80  # score threshold (default: 60)

# Performance
complior eval <url> -j 10               # parallel execution (1-50, default: 5)
complior eval <url> --concurrency 1      # sequential execution

# Custom endpoint adapter
complior eval <url> --api-key sk-xxx                         # API key for target
complior eval <url> --request-template '{"prompt":"{{probe}}"}'  # custom request JSON
complior eval <url> --response-path "result.text"            # dot-path to response text
complior eval <url> --headers '{"Authorization":"Bearer x"}' # custom headers (JSON)

# LLM judge model
complior eval <url> --llm --model gpt-4o     # override judge model

# Remediation
complior eval <url> --remediation        # generate full remediation report (.complior/eval-fixes/)
complior eval <url> --no-remediation     # suppress inline remediation recommendations
complior eval <url> --fix                # auto-apply fixes from eval failures (interactive)
complior eval <url> --fix --dry-run      # preview fixes without applying

# Cached results
complior eval dummy --last               # show last eval result
complior eval dummy --last --failures    # show only failures from last eval

# Fix from eval
complior fix --source eval               # show eval-based fixes
complior fix --source all                # scan + eval combined
```

### 3.5. Audit, Certification, and Other Commands

```bash
# Comprehensive audit (static scan + dynamic eval + security)
complior audit <url>                     # run full audit pipeline
complior audit <url> --agent <name>      # link to passport
complior audit <url> --json              # JSON output
complior audit <url> [path]              # specify project path

# AIUC-1 certification
complior cert readiness <name> [path]    # AIUC-1 readiness score
complior cert readiness <name> --json    # JSON output
complior cert test <name> [path]         # run adversarial tests
complior cert test <name> --adversarial  # prompt injection, bias, safety suite
complior cert test <name> --categories prompt_injection,bias_detection  # filter categories
complior cert test <name> --json         # JSON output

# Chat with compliance assistant (LLM-powered)
complior chat "What is Article 5?"       # ask a question
complior chat "..." --json               # raw JSON events
complior chat "..." --model gpt-4o       # model override

# Supply chain audit
complior supply-chain [path]             # audit AI dependencies + model compliance cards
complior supply-chain --models           # show model compliance cards only
complior supply-chain --json             # JSON output

# Compliance cost estimator
complior cost                            # estimate remediation costs
complior cost --hourly-rate 200          # hourly rate in EUR (default: 150)
complior cost --agent <name>             # for specific agent
complior cost --json                     # JSON output

# Compliance debt
complior debt                            # compliance debt score
complior debt --trend                    # compare to previous (trend)
complior debt --json                     # JSON output

# What-if simulation
complior simulate --fix l1-risk          # simulate fixing a finding
complior simulate --fix l1-risk --fix l2-fria  # simulate multiple fixes
complior simulate --add-doc fria         # simulate adding a document
complior simulate --complete-passport description  # simulate completing a field
complior simulate --json                 # JSON output

# Document generation (EU AI Act templates)
complior doc generate <name> --type ai-literacy       # single document type
complior doc generate <name> --type technical-documentation
complior doc generate <name> --type incident-report
complior doc generate <name> --type declaration-of-conformity
complior doc generate <name> --type monitoring-policy
complior doc generate <name> --type art5-screening
complior doc generate <name> --all                    # ALL required docs (6 + FRIA + notification)
complior doc generate <name> --all --organization "Acme"  # org name for headers
complior doc generate <name> --json [path]            # JSON output

# Jurisdiction data
complior jurisdiction list               # list all 30 EU/EEA jurisdictions
complior jurisdiction list --json        # JSON output
complior jurisdiction show de            # show details for country (2-letter code)
complior jurisdiction show de --json     # JSON output

# MCP Compliance Proxy
complior proxy start <command> [args...] # start proxy to upstream MCP server
complior proxy stop                      # stop running proxy
complior proxy status                    # show proxy status and statistics

# Import external results
complior import promptfoo --file results.json  # import Promptfoo red-team JSON
complior import promptfoo --json               # JSON output (reads from stdin if no --file)

# Red-team security probes
complior redteam run                     # run probes against default agent
complior redteam run --agent <name>      # target specific agent
complior redteam run --categories LLM01,LLM06  # OWASP categories (comma-separated)
complior redteam run --max-probes 50     # limit number of probes
complior redteam run --json              # JSON output
complior redteam last                    # show last red-team report
complior redteam last --json             # JSON output
complior redteam target <url>            # run eval --security against URL
complior redteam target <url> --ci --threshold 70  # CI gate mode
complior redteam target <url> --json     # JSON output

# External security tools
complior tools status                    # show status of external tools (Semgrep, etc.)
complior tools update                    # install or update external tools

# SaaS integration
complior login                           # authenticate with SaaS dashboard
complior logout                          # clear SaaS tokens
complior sync                            # sync all data with SaaS
complior sync --passport                 # sync only passports
complior sync --scan                     # sync only scan results
complior sync --docs                     # sync only documents
complior sync --audit                    # sync only audit trail
complior sync --evidence                 # sync only evidence chain
complior sync --registry                 # sync only agent registry
complior sync --no-sync                  # skip auto-sync after scan
```

---

## 4. MCP SERVER TOOLS

> Агенты (Claude Code, Codex, Cursor) подключают Complior через MCP и получают:

| Tool | Описание | Пример использования агентом |
|------|---------|----------------------------|
| `complior_scan` | Запустить скан, получить findings | "Before I make changes, scan for compliance" |
| `complior_fix` | Применить fix к finding | "Fix the disclosure issue in ai.ts" |
| `complior_score` | Текущий score + breakdown | "What's our compliance score?" |
| `complior_explain` | Объяснить OBL-xxx | "What does Article 50(1) require?" |
| `complior_passport` | Прочитать/создать passport | "Generate passport for this agent" |
| `complior_validate` | Проверить passport completeness | "Is our loan-assessor compliant?" |
| `complior_deadline` | Показать deadlines | "When is the EU AI Act deadline?" |
| `complior_suggest` | Предложить next best action | "What should I fix next?" |

---

## 5. МАППИНГ: Страницы → Features → Obligations

| Страница | CLI Features | Obligations covered |
|----------|-------------|-------------------|
| Dashboard | C.015 Score, C.016 Display, C.S09 Completeness | ALL (aggregate view) |
| Scan | C.012 Scanner, C.013 AST, C.041 Risk Class | 65/108 (detection) |
| Fix | C.021-029 Fixers, C.D01 FRIA Gen, C.D02 Worker Gen | 20/108 (auto-fixable) |
| Passport | C.S01 Passport, C.S02 Autonomy, C.S07 Validate | ALL (data layer) |
| Obligations | C.030-039 Regulation DB, C.S09 Completeness | 108/108 (tracking) |
| Timeline | C.R22 Debt Score, C.F36 Pre-deploy Gate | ALL (planning) |
| Report | C.050-054 Reports | ALL (export) |
| Log | C.R04 Logger, C.R20 Evidence Chain | OBL-006,011d (Art.12,26(6)) |

---

## 6. ВИЗУАЛЬНЫЙ СТИЛЬ

Сохраняем текущий стиль (ratatui dark theme):
- Borders: single-line unicode
- Colors: green (pass), red (fail), yellow (warning), blue (info), white (text)
- Status bar: mode + page name + ctx% + daemon status
- Hotkeys: Vim-like navigation (j/k/Enter/Esc)
- Score colors: RED (<40), YELLOW (40-79), GREEN (80+)
- OBL-xxx всегда жёлтый цвет (obligation reference)

---

## 7. КОНФИГУРАЦИЯ: Global + Project Split

Конфигурация разделена на два уровня: **глобальный** (пользовательские предпочтения) и **проектный** (compliance-профиль).

### 7.1. Файлы

| Файл | Путь | Scope | Git |
|------|------|-------|-----|
| Global settings | `~/.config/complior/settings.toml` | Все проекты пользователя | Нет (домашняя директория) |
| Project config | `.complior/project.toml` | Конкретный проект | Да (safe to commit, no secrets) |
| Engine profile | `.complior/profile.json` | Конкретный проект | Да (jurisdiction, regulation) |
| Credentials | `~/.config/complior/credentials` | Все проекты пользователя | Нет (API keys, JWT tokens) |

**Merge rule:** Global загружается первым, затем Project overlay. Для полей с override — project побеждает если задан.

**Project root discovery (`find_project_root`):** `.complior/project.toml` ищется от CWD вверх по каталогам (до 10 уровней, стоп на `$HOME`). Маркеры (в порядке приоритета):
1. `.complior/` — родная конфигурация
2. `.git/`, `Cargo.toml`, `package.json`, `go.mod`, `pyproject.toml`, `pom.xml`, `build.gradle`, `.project` — общие маркеры корня проекта

Если маркер не найден — fallback на CWD.

**Инициализация:** `complior init` создаёт `.complior/` с `project.toml` + `profile.json` (аналог `git init`), затем автоматически обнаруживает AI-агентов и создаёт паспорта. Если `init` не запускался — `.complior/` автоматически создаётся при завершении onboarding wizard.

**Legacy migration:** При первом запуске, если `~/.config/complior/tui.toml` существует, а `settings.toml` нет — автоматический split в два файла, `tui.toml` → `tui.toml.bak`.

### 7.2. Global Settings — `~/.config/complior/settings.toml`

Пользовательские UX-настройки и инфраструктура. Одинаковые для всех проектов.

| Field | Type | Default | Category |
|-------|------|---------|----------|
| `theme` | String | `"dark"` | UX preference |
| `navigation` | String | `"standard"` | UX preference |
| `sidebar_visible` | bool | `true` | UX preference |
| `animations_enabled` | bool | `true` | UX preference |
| `scroll_acceleration` | f32 | `1.5` | UX preference |
| `tick_rate_ms` | u64 | `250` | UX preference |
| `engine_host` | String | `"127.0.0.1"` | Infrastructure |
| `engine_port` | u16 | `3099` | Infrastructure |
| `llm_provider` | Option\<String\> | `None` | LLM default |
| `llm_model` | Option\<String\> | `None` | LLM default |
| `project_api_url` | String | `""` | SaaS default |
| `offline_mode` | bool | `false` | SaaS default |
| `confirmations.batch_fix` | bool | `true` | UX preference |
| `confirmations.undo_multiple` | bool | `true` | UX preference |
| `confirmations.overwrite_docs` | bool | `false` | UX preference |

### 7.3. Project Config — `.complior/project.toml`

Compliance-профиль проекта. Можно коммитить в git (без секретов).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `onboarding_completed` | bool | `false` | Per-project onboarding status |
| `onboarding_last_step` | Option\<usize\> | `None` | Resume partial onboarding |
| `project_type` | String | `"existing"` | existing / demo |
| `requirements` | Vec\<String\> | `["eu-ai-act"]` | Compliance frameworks (eu-ai-act, iso-42001) |
| `role` | String | `"deployer"` | deployer / provider / both / auto |
| `industry` | String | `"general"` | general / hr / finance / healthcare / ... |
| `scan_scope` | Vec\<String\> | `["deps","env","source"]` | What to scan (default, not wizard-configurable) |
| `watch_on_start` | bool | `false` | Auto-start file watcher |
| `llm_provider` | Option\<String\> | `None` | Override global LLM |
| `llm_model` | Option\<String\> | `None` | Override global LLM |
| `project_api_url` | Option\<String\> | `None` | Override global SaaS URL |
| `offline_mode` | Option\<bool\> | `None` | Override global offline mode |

> **Legacy fields:** `jurisdiction` (String, default `"eu"`) kept for backward compatibility but no longer set by onboarding. Replaced by `requirements`.

### 7.4. Override-поля (Project → Global fallback)

Четыре поля существуют в обоих конфигах. Если задан project — используется project. Иначе — fallback на global.

```
llm_provider:    project.llm_provider    OR  global.llm_provider
llm_model:       project.llm_model       OR  global.llm_model
project_api_url: project.project_api_url OR  global.project_api_url
offline_mode:    project.offline_mode     OR  global.offline_mode
```

**Use case:** Консультант работает над проектами разных клиентов — каждый со своим SaaS-аккаунтом, LLM-провайдером и compliance-юрисдикцией.

### 7.5. Onboarding → куда что сохраняется

Wizard onboarding (8 steps) записывает в оба файла:

| Wizard Step | Target |
|-------------|--------|
| Welcome + Theme | Global (`theme`) |
| Project type | Project (`project_type`) |
| Workspace trust | — (gate only, not persisted) |
| Requirements frameworks | Project (`requirements`) |
| Role | Project (`role`) |
| Industry | Project (`industry`) |
| AI connection | Global (`llm_provider`, `offline_mode`) + Credentials |
| Summary | Project (`onboarding_completed = true`) |

> **Removed steps (v1.2):** Navigation style (always standard), Scan scope (always full), Jurisdiction (replaced by Requirements).

### 7.6. Env Overrides

| Env Variable | Overrides | Scope |
|--------------|-----------|-------|
| `PROJECT_API_URL` | `project_api_url` | Runtime |
| `OFFLINE_MODE=1` | `offline_mode` | Runtime |

---

**Обновлено:** 2026-03-13 v1.3 — §3.1 `complior init` + project root discovery, §7.1 find_project_root + profile.json, §7.3 project_type simplified (2 opts), jurisdiction→requirements, §7.5 onboarding 8 steps
