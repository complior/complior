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

### 3.1. Core Commands

```bash
# Scanning
complior scan                    # scan project, output to stdout
complior scan --ci               # exit code 0/1, minimal output
complior scan --json             # JSON output for piping
complior scan --watch            # continuous scan on file changes

# Fixing
complior fix                     # interactive fix (select items)
complior fix --all               # apply all fixes
complior fix --id OBL-013        # fix specific obligation
complior fix --dry-run           # show what would change

# Daemon
complior daemon                  # start daemon (headless)
complior daemon --watch          # daemon + file watcher
complior daemon status           # check if daemon running
complior daemon stop             # stop daemon

# TUI
complior                         # start daemon + TUI (default)
complior tui                     # connect to running daemon

# MCP
complior mcp                     # start as MCP server (stdio)
```

### 3.2. Passport Commands

```bash
# Generation
complior agent:init              # discover agents, generate passports (Mode 1: Auto)
complior agent:init --path ./    # specify path
complior agent:init --non-interactive --owner "team" --contact "email"

# Management
complior agent:list              # table of all passports
complior agent:validate          # check completeness
complior agent:validate --verbose # show per-field status
complior agent:diff              # manifest vs actual code
complior agent:verify            # verify cryptographic signature

# Export/Import
complior agent:export --format a2a       # export to A2A Agent Card
complior agent:export --format aiuc-1    # export for AIUC-1 evidence
complior agent:import --from a2a <url>   # import A2A Agent Card → pre-fill

# Document Generation
complior fria:generate <agent>   # generate FRIA from passport (Art.27)
complior notify:generate <agent> # generate worker notification (Art.26(7))
complior report:audit            # generate audit package ZIP
```

### 3.3. Certification Commands

```bash
complior cert:readiness --standard aiuc-1   # AIUC-1 readiness score
complior cert:readiness --standard iso42001  # ISO 42001 readiness
complior cert:test --adversarial            # run adversarial tests
complior cert:evidence --export             # export evidence package
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

**Обновлено:** 2026-02-26 v1.0
