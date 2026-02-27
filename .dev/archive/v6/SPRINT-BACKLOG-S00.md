# Sprint Backlog S00 — PTY Wrapper + Agent Integrations + Multi-Agent UI

> **Спринт:** S00 | **Трек:** TUI (Rust)
> **Длительность:** Неделя 1-2 (2 недели)
> **Фаза:** Phase 1 — Wrapper-оркестратор: proof-of-concept

## Обязательно к прочтению перед началом спринта

| # | Документ | Зачем |
|---|----------|-------|
| 1 | **PRODUCT-VISION.md** | Complior = хост-оркестратор. Coding agents = гости. |
| 2 | **ARCHITECTURE.md** | §3 PTY manager, §1 3-процессная архитектура |
| 3 | **CODING-STANDARDS-RUST.md** | portable-pty, tokio async, стиль |

**Sprint Goal:** Полностью реализовать внешний дизайн инструмента — каждый view выглядит финально. Запускать Claude Code и Codex CLI как PTY subprocesses, управлять ими через детерминированное меню/кнопки. Все views (Agent Grid, Dashboard, Scan, Fix, Chat, Timeline, Report, Orchestrator) доступны с mock данными с первого дня. При подключении Engine в S01+ mock бесшовно заменяется реальными данными. N агентов — столько, сколько помещается на экране.

**Статус:** Запланирован
**Capacity:** ~41 SP | **Duration:** 2-3 недели
**Baseline:** Существующий TUI (59 файлов, 6 views, 8 тем, 10-step onboarding)

> **Prerequisite:** Нет. Работаем поверх существующей кодовой базы `tui/`.

---

## Что уже готово — НЕ реализуем повторно

> Изучение кодовой базы показало следующее. Эти задачи удалены из S00 и отмечены как выполненные во всех спринтах.

| Было запланировано | Где реализовано | Статус |
|--------------------|-----------------|--------|
| Cargo workspace + CI | `Cargo.toml`, `.github/workflows/` | ✅ Готово |
| Ratatui event loop | `tui/src/main.rs:259-403` | ✅ Готово |
| 2 темы | `tui/src/theme.rs` — **8 тем** (Complior Dark/Light, Solarized, Dracula, Nord, Monokai, Gruvbox) | ✅ Готово |
| Responsive layout | `tui/src/ui/layout.rs` — Small/Medium/Large breakpoints | ✅ Готово |
| Engine process mgmt | `tui/src/engine_process.rs` — auto-launch, health check, restart | ✅ Готово |
| Config system | `tui/src/config.rs` — TOML, 21 поле, merge-friendly | ✅ Готово |
| Toast notifications | `tui/src/components/toast.rs` — 4 типа, auto-dismiss, stacking | ✅ Готово |
| Undo history overlay | `tui/src/components/undo_history.rs` | ✅ Готово |
| What-if analysis | `tui/src/components/whatif_analysis.rs` | ✅ Готово |
| Idle suggestions | `tui/src/components/suggestions.rs` | ✅ Готово |
| Mouse support | `tui/src/input.rs:313-376` | ✅ Готово |
| Colon command mode | `tui/src/app/commands.rs` | ✅ Готово |
| Dry-run fix | `tui/src/app/mod.rs` — `FixDryRun` command | ✅ Готово |
| Animations (splash, counter, checkmark) | `tui/src/animation.rs` | ✅ Готово |
| Quick actions | `tui/src/components/quick_actions.rs` | ✅ Готово |
| Diff overlay | `tui/src/views/diff.rs` | ✅ Готово |

---

## UX/UI Design

### Концепция: динамическая сетка агентов

Complior не ограничен двумя агентами. Панели автоматически компонуются в сетку в зависимости от количества активных агентов и размера терминала.

---

### Layouts: 1-6 агентов

**1 агент — Full screen:**
```
┌─ complior ────────────────────────────────────────────────────────────────┐
│  Agents: [1] Claude Code ●                  Ctrl+A: add  K: kill  O: orch │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│   ▌ Claude Code                                          ● running        │
│  ─────────────────────────────────────────────────────────────────────── │
│   ✻ Claude Code (claude-3.7-sonnet-20250219)                              │
│   ✓ Logged in · /help for shortcuts                                       │
│   > What would you like to do?                                            │
│   ▌                                                                       │
│                                                                           │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│  wrapper> _                                                               │
└───────────────────────────────────────────────────────────────────────────┘
```

**2 агента — Horizontal 50/50:**
```
┌─ complior ────────────────────────────────────────────────────────────────┐
│  Agents: [1] Claude Code ●  [2] Codex CLI ○       Ctrl+A: add  O: orch   │
├─────────────────────────────────────┬─────────────────────────────────────┤
│  ▌ Claude Code        ● running    │  ○ Codex CLI           ● idle       │
│ ─────────────────────────────────  │ ──────────────────────────────────  │
│  > What would you like to do?       │  > codex v0.1.0                    │
│  ▌                                  │  > Waiting for task...             │
│                                     │                                    │
│                                     │                                    │
├─────────────────────────────────────┴─────────────────────────────────────┤
│  wrapper> send 1: "add AI disclosure to page.tsx"                         │
└───────────────────────────────────────────────────────────────────────────┘
```

**3 агента — Main + 2 stacked:**
```
┌─────────────────────────────────────┬─────────────────────────────────────┐
│  ▌ Claude Code        ● running    │  ○ Codex CLI           ● idle       │
│                                     ├─────────────────────────────────────┤
│  > Working on page.tsx...           │  ○ Aider               ● idle       │
│                                     │                                    │
│                                     │                                    │
└─────────────────────────────────────┴─────────────────────────────────────┘
```

**4 агента — 2×2 grid:**
```
┌──────────────────────┬──────────────────────┐
│  ▌ Claude Code  ●   │  ○ Codex CLI    ●    │
│  > Working...        │  > Waiting...        │
├──────────────────────┼──────────────────────┤
│  ○ Aider        ●   │  ○ OpenCode     ○    │
│  > Idle              │  > Idle              │
└──────────────────────┴──────────────────────┘
```

**6 агентов — 3×2 grid (максимум по умолчанию):**
```
┌─────────────┬─────────────┬─────────────┐
│  ▌ CC   ●  │  ○ CX   ○  │  ○ Aid  ○   │
│  > Working  │  > Waiting  │  > Idle     │
├─────────────┼─────────────┼─────────────┤
│  ○ OC   ○  │  ○ Ag5  ○  │  ○ Ag6  ○   │
│  > Idle     │  > Idle     │  > Idle     │
└─────────────┴─────────────┴─────────────┘
```

---

### Orchestrator View (`O` key)

```
┌─ Orchestrator ───────────────────────────────────────────────────────────┐
│  Active agents: 2/6  │  Tasks completed: 3  │  Handoffs: 1              │
├─────────────────────────────────────────────────────────────────────────│
│  Agents                     │  Handoff Log                               │
│  ───────────────────────    │  ─────────────────────────────────────     │
│  [1] ● Claude Code          │  14:32:01  wrapper → [1]                  │
│      claude-3.7-sonnet      │            "Add AI disclosure to page.tsx" │
│      status: working        │  14:32:45  [1] → wrapper                  │
│                             │            "Done. Modified 2 files."       │
│  [2] ○ Codex CLI            │  14:32:46  wrapper → [2]                  │
│      gpt-4o                 │            "Review [1]'s changes"          │
│      status: idle           │  14:33:10  [2] → wrapper                  │
│                             │            "LGTM. One suggestion..."       │
│  [Ctrl+A] Add agent         │                                            │
│  [K]      Kill agent        │                                            │
│  [H]      Handoff           │                                            │
└─────────────────────────────┴────────────────────────────────────────────┘
```

---

### Динамический лимит агентов

**Формула:**
```
min_panel_width  = 45 cols  (минимум для читаемого агента)
min_panel_height = 10 rows  (минимум включая header + content)
overhead         = 6 rows   (tabs + wrapper input + statusbar)

max_cols = floor((terminal_width - 2) / min_panel_width)  → 1..3
max_rows = floor((terminal_height - overhead) / min_panel_height)
hard_cap = 6

max_agents = min(max_cols * max_rows, hard_cap)
```

**Справочная таблица:**

| Терминал | max_agents | Раскладка |
|----------|-----------|-----------|
| 80×24   | 1 | Full screen |
| 100×24  | 2 | 50/50 horizontal |
| 140×24  | 2 | 50/50 horizontal |
| 160×40  | 3-4 | 2×2 grid |
| 200×40  | 4-6 | 2×2 или 3×2 grid |
| 240×50  | 6 | 3×2 grid |

**Override:** `complior --max-agents 4` или в TOML:
```toml
[agents]
max_visible = 4    # hard override
min_panel_width = 45
min_panel_height = 10
```

**При overflow** (пользователь добавляет больше агентов чем влезает):
- Лишние агенты уходят в фоновый режим (`bg`)
- Индикатор в tabs: `[1] CC ●  [2] CX ○  [+2 bg]`
- `Ctrl+A` → показывает picker: какого агента вывести на экран (заменяет текущий)

---

### Keybindings для агентов

| Клавиша | Действие |
|---------|----------|
| `1..6` | Фокус на агента N |
| `Tab` | Следующий агент |
| `Shift+Tab` | Предыдущий агент |
| `Ctrl+A` | Добавить агента (picker) |
| `K` | Kill текущего агента |
| `Ctrl+R` | Restart текущего агента |
| `Ctrl+B` | Переключить split/single view |
| `O` | Orchestrator view |
| `Esc` | Вернуться в normal режим |

**Wrapper input:**
```
wrapper> send 2 "review changes in page.tsx"
wrapper> send all "what's the status?"
wrapper> handoff 1 to 2
wrapper> kill 3
wrapper> add codex
wrapper> status
```

---

## Онбординг: предлагаемые корректировки

### Что менять и что оставить

| Шаг | Текущий контент | Действие |
|-----|-----------------|----------|
| 1. Тема | 8 тем + live preview | ✅ Оставить |
| 2. Navigation Mode | Standard vs Vim | ✅ Оставить |
| 3. AI Provider | OpenRouter / Anthropic / OpenAI / Offline | 🔄 Заменить на "Agent Setup" |
| 4. Project Type | Existing / New / Exploring | ✅ Оставить |
| 5. Workspace Trust | Yes / No | ✅ Оставить |
| 6. Jurisdiction | EU / UK / US / Global | ⏸ Отложить до S01 (compliance) |
| 7. Role | Deployer / Provider / Both | ⏸ Отложить до S01 |
| 8. Industry | General / HR / Finance / … | ⏸ Отложить до S01 |
| 9. Scan Scope | Dependencies / Env / Code / … | ⏸ Отложить до S01 |
| 10. Summary | Review + launch | ✅ Оставить |

### Новый шаг 3: Agent Setup (заменяет AI Provider)

**Шаг 3а — Какие агенты запустить?** (Checkbox, multi-select)
```
  Which coding agents do you want to use?

  [✓] Claude Code    (requires: claude CLI + Anthropic account)
  [ ] Codex CLI      (requires: codex CLI + OpenAI API key)
  [ ] Aider          (requires: aider CLI + API key)
  [ ] Custom agent   (any CLI tool)

  You can add/remove agents later with Ctrl+A inside the TUI.
```

**Шаг 3б — Claude Code setup** (если выбран):
```
  Claude Code setup

  Checking: claude binary... ✅ found at /usr/local/bin/claude
  Checking: auth status...   ✅ logged in as user@example.com

  Claude Code is ready to go!

  [Enter] Continue
```

или если не установлен:
```
  Claude Code setup

  Checking: claude binary... ❌ not found

  Install Claude Code:
  > npm install -g @anthropic-ai/claude-code
  > claude auth login

  [R] Retry check   [S] Skip (add later)
```

**Шаг 3в — Codex CLI setup** (если выбран):
```
  Codex CLI setup

  Checking: codex binary...    ✅ found at /usr/local/bin/codex
  Checking: OPENAI_API_KEY...  ⚠ not set

  Enter your OpenAI API key (or press S to skip):
  > sk-****************************   [Enter: validate]

  [S] Skip (use OPENAI_API_KEY env var later)
```

**Шаг 3г — Layout preference** (Radio):
```
  Default layout when multiple agents are running:

  ◉ Auto (smart grid based on terminal size)    ← recommended
  ○ Single (one agent, switch with 1-6 keys)
  ○ Split (always show two agents side by side)
  ○ Grid (always use grid layout)
```

### Шаги 6-9 — Отложить до первого scan

Шаги Jurisdiction, Role, Industry, Scan Scope относятся к compliance и не нужны для запуска агентов. Предлагается:

- При первом запуске `/scan` → показать mini-onboarding (только шаги 6-9)
- Или при явном запуске: `complior setup compliance`
- Шаги можно заполнить позже через Command Palette: `Ctrl+P → "Compliance Setup"`

### Итоговый порядок шагов онбординга для S00

```
1. Theme (8 вариантов, live preview) — существует, не меняем
2. Navigation Mode — существует, не меняем
3a. Agent Selection (checkbox: Claude Code / Codex / Aider / Custom) — НОВЫЙ
3b. Claude Code setup (conditional) — НОВЫЙ
3c. Codex CLI setup (conditional) — НОВЫЙ
3d. Layout Preference — НОВЫЙ
4. Project Type — существует, не меняем
5. Workspace Trust — существует, не меняем
6. Summary — существует, не меняем

Итого: 6 шагов (было 10, compliance-шаги отложены)
```

---

## Спринт: User Stories

### Phase 1 — PTY Guest Agent Support [День 1-5]

#### US-S0001: PTY Manager для Guest Agents (6 SP)

**Описание:** Расширить `engine_process.rs` для запуска произвольных CLI агентов как PTY subprocesses (используя `portable-pty` crate). Текущий код запускает только Engine через `std::process::Command` — без TTY, без interactive mode.

**Проблема:** Claude Code и Codex CLI ожидают интерактивный TTY. `std::process::Command` не создаёт PTY — агент получает stdin pipe вместо терминала, что ломает interactive mode.

**Решение:** `portable-pty` crate создаёт полноценную PTY пару (master/slave). Агент запускается в slave-end, TUI читает/пишет через master-end.

**Новые файлы:**
- `tui/src/pty/mod.rs` — re-exports
- `tui/src/pty/session.rs` — `AgentSession` struct

**Изменённые файлы:**
- `tui/Cargo.toml` — добавить `portable-pty = "0.8"`
- `tui/src/app/mod.rs` — добавить `agents: Vec<AgentSession>` в `App`

```rust
// tui/src/pty/session.rs
pub struct AgentSession {
    pub id: usize,
    pub name: String,
    pub config: AgentConfig,
    pub state: AgentState,        // Starting | Ready | Working | Dead
    pub output: Arc<Mutex<RingBuffer>>,
    pub scroll_offset: usize,
    pty_master: Box<dyn MasterPty>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child>,
}

pub enum AgentState { Starting, Ready, Working, Dead }

impl AgentSession {
    pub fn spawn(id: usize, config: AgentConfig) -> Result<Self>
    pub fn write_str(&mut self, msg: &str) -> Result<()>
    pub fn resize(&self, cols: u16, rows: u16) -> Result<()>
    pub fn kill(&mut self) -> Result<()>
    pub fn is_ready(&self) -> bool  // check output against ready_pattern
}
```

**RingBuffer:** `VecDeque<u8>`, max 50_000 байт.

**Async stdout drain** (tokio task per session):
```rust
tokio::spawn(async move {
    let mut buf = [0u8; 1024];
    loop {
        match reader.read(&mut buf) {
            Ok(0) => { state.store(Dead); break; }
            Ok(n) => output.lock().extend(&buf[..n]),
            Err(_) => break,
        }
    }
});
```

**Acceptance Criteria:**
- [ ] `AgentSession::spawn("bash", &[])` запускает bash в PTY
- [ ] `session.write_str("echo hello\n")` → stdout содержит "hello"
- [ ] `session.resize(100, 40)` → PTY размер обновлён (SIGWINCH)
- [ ] Падение процесса → `state = Dead`, событие отправлено в App
- [ ] RingBuffer ограничен 50_000 байт (FIFO)
- [ ] Async drain не блокирует UI render loop

**Tests:** 6

---

#### US-S0002: Agent Registry + agents.toml (2 SP)

**Описание:** Конфигурационный файл агентов. Расширение существующего `config.rs`.

**Файл конфигурации** (`~/.config/complior/agents.toml` или `.complior/agents.toml`):
```toml
[[agents]]
id = "claude-code"
display_name = "Claude Code"
binary = "claude"
args = []
ready_pattern = '> $'
working_patterns = ["\\.\\.\\.", "Reading", "Writing"]
auto_start = true

[[agents]]
id = "codex"
display_name = "Codex CLI"
binary = "codex"
args = []
env = { OPENAI_API_KEY = "${OPENAI_API_KEY}" }
ready_pattern = 'codex>'
auto_start = false

[[agents]]
id = "aider"
display_name = "Aider"
binary = "aider"
args = ["--no-auto-commits"]
ready_pattern = 'aider>'
auto_start = false
```

**Дефолтная конфигурация** (встроена в бинарь — работает без файла).

**CLI флаги:**
```
complior                          → agents.toml (auto_start)
complior --agent claude-code      → только этот агент
complior --agent claude-code,codex → несколько
complior --max-agents 4           → override лимита
```

**Изменённые файлы:**
- `tui/src/config.rs` — добавить `AgentConfig` struct, `load_agents()`
- `tui/src/main.rs` — добавить clap args `--agent`, `--max-agents`

**Acceptance Criteria:**
- [ ] `.complior/agents.toml` загружается при старте
- [ ] Дефолтные агенты (Claude Code + Codex) работают без файла
- [ ] `--agent claude-code` запускает только этот агент
- [ ] `--agent claude-code,codex` запускает оба
- [ ] `${OPENAI_API_KEY}` раскрывается из environment
- [ ] Неизвестный агент → friendly error с hint как установить

**Tests:** 4

---

#### US-S0003: Claude Code Integration (4 SP)

**Описание:** Запуск `claude` CLI как PTY subprocess с детекцией готовности и корректной передачей промптов.

**Особенности Claude Code:**
- Стартует интерактивно, показывает splash, затем `> ` prompt
- `ready_pattern = "> $"` (трейлинг пробел + конец строки)
- Поддерживает non-interactive через `--print` флаг — но для wrapper используем interactive mode
- Требует Anthropic auth (Claude.ai account или API key)

**Startup flow:**
```
1. spawn("claude", [])
2. state = Starting
3. monitor stdout → найден ready_pattern?
4. Yes → state = Ready, notify App
5. Timeout 30s → state = Dead (not installed or auth failed)
```

**Prompt injection:**
```rust
session.write_str(&format!("{}\n", user_message))?;
session.state = AgentState::Working;
// monitor for ready_pattern → Working → Ready
```

**ANSI handling:** Claude Code выводит ANSI escape codes. Используем простой ANSI stripper для определения ready_pattern; оригинальный поток (с ANSI) рендерится в panel widget как-есть.

**Файлы:**
- `tui/src/agents/claude_code.rs` — `ClaudeCodeAgent`, config defaults, startup validation
- `tui/src/agents/mod.rs` — `AgentKind` enum, `detect_agent_binary()`

**Acceptance Criteria:**
- [ ] `complior --agent claude-code` запускает `claude` в PTY
- [ ] Splash screen Claude Code виден в TUI панели
- [ ] State переходит в `Ready` при появлении prompt
- [ ] `wrapper> send 1 "hello"` → Claude получает и отвечает
- [ ] Ответ виден в панели (с цветами ANSI)
- [ ] Если `claude` не установлен → toast с install hint

**Tests:** 3

---

#### US-S0004: Codex CLI Integration (3 SP)

**Описание:** Запуск `codex` CLI (OpenAI) как PTY subprocess.

**Особенности Codex CLI:**
- `OPENAI_API_KEY` из env или `.complior/agents.toml`
- Интерактивный mode: `codex> ` prompt
- `ready_pattern = "codex>"`

**Файлы:**
- `tui/src/agents/codex.rs` — `CodexAgent`, config defaults

**Acceptance Criteria:**
- [ ] `complior --agent codex` запускает `codex` в PTY
- [ ] `OPENAI_API_KEY` передаётся через env
- [ ] Codex prompt виден в TUI панели
- [ ] `wrapper> send 2 "review page.tsx"` → Codex отвечает
- [ ] Если ключ не найден → guided setup через Provider Setup overlay (уже есть в `components/provider_setup.rs`)

**Tests:** 3

---

### Phase 2 — Multi-Agent Layout [День 6-10]

#### US-S0005: Dynamic Agent Grid Layout (5 SP)

**Описание:** Система динамической компоновки панелей агентов. 1-6 агентов автоматически раскладываются в сетку по формуле.

**Grid layout engine:**
```rust
pub struct AgentGrid {
    agents: Vec<AgentSession>,
    max_agents: usize,          // из config или auto-calc
    background: Vec<AgentSession>, // агенты за пределами экрана
}

impl AgentGrid {
    pub fn calculate_max(terminal_width: u16, terminal_height: u16) -> usize {
        let min_w = 45u16;
        let min_h = 10u16;
        let overhead = 6u16;
        let cols = (terminal_width.saturating_sub(2)) / min_w;
        let rows = terminal_height.saturating_sub(overhead) / min_h;
        (cols * rows).min(6).max(1) as usize
    }

    pub fn grid_dimensions(count: usize) -> (usize, usize) {
        // cols × rows
        match count {
            1 => (1, 1),
            2 => (2, 1),
            3 => (2, 2),  // 2 слева, 1 справа стакнут
            4 => (2, 2),
            5 => (3, 2),  // 3+2
            6 => (3, 2),
            _ => (3, 2),
        }
    }

    pub fn render(&self, frame: &mut Frame, area: Rect)
    pub fn add_agent(&mut self, config: AgentConfig) -> Result<()>
    pub fn remove_agent(&mut self, id: usize)
    pub fn rotate_background(&mut self, id: usize) // вывести bg агента на экран
}
```

**Таблица раскладок:**

| N агентов | Раскладка | Мин. терминал |
|-----------|-----------|---------------|
| 1 | Full screen | 47×16 |
| 2 | 2×1 horizontal | 92×16 |
| 3 | 2×1 + right stacked | 92×26 |
| 4 | 2×2 grid | 92×26 |
| 5 | 3×2 (пятый растянут) | 137×26 |
| 6 | 3×2 grid | 137×26 |

**Background agents:** при overflow агенты уходят в фон с индикатором в табах: `[+2 bg]`. `Ctrl+A` → picker: выбрать агента из фона.

**Файлы:**
- `tui/src/pty/grid.rs` — `AgentGrid`, layout engine
- `tui/src/ui/panels/agent_panel.rs` — single agent widget (header + PTY output + state indicator)
- `tui/src/app/mod.rs` — заменить один `agent` state на `AgentGrid`

**Acceptance Criteria:**
- [ ] 1 агент → full screen panel
- [ ] 2 агента → 50/50 horizontal split
- [ ] 4 агента → 2×2 grid
- [ ] `calculate_max(80, 24)` → 1
- [ ] `calculate_max(120, 24)` → 2
- [ ] `calculate_max(200, 40)` → 4-6
- [ ] Превышение лимита → агент уходит в фон, `[+N bg]` индикатор в tabs
- [ ] `Ctrl+A` на 5-м агенте (при max=4) → picker: кого вывести на экран
- [ ] При terminal resize → grid пересчитывается, layout обновляется

**Tests:** 5

---

#### US-S0006: Agent Focus + Navigation (3 SP)

**Описание:** Keybindings для работы с несколькими агентами. Фокус, переключение, PTY input routing.

**Логика фокуса:**
- Только один агент в фокусе одновременно
- Клавиши попадают либо в focused PTY (insert mode), либо в orchestrator (normal mode)
- `wrapper> ` — всегда доступен, не зависит от фокуса

**Input routing:**
```
Нажатие клавиши
  │
  ├─ wrapper input focused? → обрабатывается оркестратором
  │
  ├─ Normal mode?           → App keybindings (1-6, Tab, O, K, ...)
  │
  └─ Insert mode?           → forward bytes to focused PTY stdin
```

**Новые keybindings:**
| Клавиша | Действие |
|---------|----------|
| `1..6` | Фокус на агента N (если существует) |
| `Tab` | Следующий агент |
| `Shift+Tab` | Предыдущий агент |
| `Ctrl+A` | Add agent picker |
| `K` | Kill focused агента (с confirm dialog) |
| `Ctrl+R` | Restart focused агента |
| `Ctrl+B` | Toggle single/split/grid view |
| `O` | Orchestrator view |
| `PgUp/PgDn` | Scroll в панели focused агента |
| `g/G` | Top/bottom scroll в панели |

**Файлы:**
- `tui/src/input.rs` — расширить routing для agent keybindings
- `tui/src/app/mod.rs` — `focused_agent_id: Option<usize>`

**Acceptance Criteria:**
- [ ] `1` фокусирует агента 1 (border highlight)
- [ ] `i` → insert mode, все keys идут в PTY stdin агента
- [ ] `Esc` → normal mode, keys идут в App
- [ ] `Tab` циклически переключает агентов
- [ ] `K` + confirm → агент убит, панель убрана
- [ ] Wrapper input всегда принимает команды независимо от фокуса

**Tests:** 4

---

### Phase 3 — Wrapper Orchestration [День 9-14]

#### US-S0007: Wrapper Command Parser + Orchestrator (5 SP)

**Описание:** Wrapper input field с командами для управления агентами. Handoff log. Auto-handoff.

**Wrapper команды:**
```
send <id|name|all> "<message>"  → inject в PTY stdin
handoff <from_id> to <to_id>   → auto-route: after from готов → send next msg to to
kill <id>                       → SIGKILL агента
restart <id>                    → kill + respawn
add <agent_name>                → запустить новый агент из registry
status                          → overlay с состоянием агентов
```

**Auto-handoff mechanism:**
```rust
// После команды: wrapper> handoff 1 to 2
// PendingHandoff { from: 1, to: 2, pending_message: следующий wrapper send }

// Мониторинг stdout агента 1 на ready_pattern:
if session_1.is_ready() && pending_handoff.exists() {
    session_2.write_str(&pending_message)?;
    handoff_log.push(HandoffEntry { from: 1, to: 2, message: ... });
}
```

**Handoff Log** (в Orchestrator View):
- До 200 записей
- Формат: `HH:MM:SS  wrapper → [1]  "message"` или `[1] → wrapper  "response"`

**Env var support в send:**
```
wrapper> send 1 "fix the AI disclosure in $FILE"
```
→ `$FILE` раскрывается из App state (current open file).

**Файлы:**
- `tui/src/orchestrator/mod.rs` — `Orchestrator` struct
- `tui/src/orchestrator/commands.rs` — `WrapperCommand` enum, parser
- `tui/src/orchestrator/handoff.rs` — `HandoffManager`, `PendingHandoff`
- `tui/src/orchestrator/log.rs` — `HandoffLog`, `HandoffEntry`
- `tui/src/ui/panels/wrapper_input.rs` — wrapper input widget (внизу экрана)
- `tui/src/ui/views/orchestrator.rs` — Orchestrator View с handoff log

**Acceptance Criteria:**
- [ ] `send 1 "add AI disclosure"` → сообщение уходит в агент 1 PTY
- [ ] `send all "status?"` → сообщение идёт во все запущенные агенты
- [ ] `handoff 1 to 2` → после ready_pattern у агента 1, следующий send идёт агенту 2
- [ ] `status` → overlay с состоянием, SP агентов
- [ ] Handoff Log в Orchestrator View показывает все wrapper↔agent сообщения
- [ ] `$FILE` раскрывается из App state
- [ ] `O` открывает Orchestrator View, `Esc` закрывает

**Tests:** 5

---

### Phase 4 — TUI View Restructuring + Mock Data [День 10-13]

#### US-S0009: DataProvider Abstraction — Mock → Real (3 SP)

**Описание:** Ввести `DataProvider` trait чтобы все compliance views работали прозрачно с любым
источником данных. `MockDataProvider` (offline demo) → `EngineDataProvider` (real Engine HTTP).

```rust
// tui/src/data/provider.rs
pub trait DataProvider: Send + Sync {
    fn score(&self) -> ComplianceScore;
    fn findings(&self) -> Vec<Finding>;
    fn fix_items(&self) -> Vec<FixItem>;
    fn timeline(&self) -> Vec<TimelineItem>;
    fn activity_log(&self) -> Vec<ActivityEntry>;
    fn last_scan_time(&self) -> Option<DateTime<Utc>>;
}

pub struct MockDataProvider;   // встроенные демо-данные
pub struct EngineDataProvider { client: EngineClient }  // реальные данные из Engine (S01+)

// App держит:
pub data: Arc<dyn DataProvider>

// При старте:      Arc::new(MockDataProvider)
// Engine connect:  Arc::new(EngineDataProvider::new(client))
```

**Mock данные (реалистичные, не пустые):**
```rust
impl MockDataProvider {
    // Имитирует реальный проект с нарушениями
    // score: 47/100 (Orange zone)
    // 12 findings: 2 critical, 4 high, 4 medium, 2 low
    // jurisdiction: EU/EEA
    // deadline: Aug 2, 2026
}
```

**Файлы:**
- `tui/src/data/provider.rs` — `DataProvider` trait + `MockDataProvider`
- `tui/src/data/mock.rs` — реалистичные mock данные (12 findings, score 47)
- `tui/src/app/mod.rs` — заменить прямые Engine вызовы в views на `self.data.*`

**Acceptance Criteria:**
- [ ] Все compliance views рендерятся без запущенного Engine
- [ ] Mock данные: score 47/100, 12 findings (2 critical), 3 milestone items
- [ ] При подключении Engine: `app.data = Arc::new(EngineDataProvider)`, views обновляются
- [ ] Views не знают про источник данных (trait abstraction)

**Tests:** 3 (mock provider returns data, engine provider delegates, swap is seamless)

---

#### US-S0010: View Restructuring — Wrapper-First Layout (4 SP)

**Описание:** Переработать структуру views и keybindings. Главный экран — сетка агентов. Все compliance views доступны сразу (с mock данными), включая Chat (placeholder в S00, живой в S02).

**Новая структура views:**
```
Primary:
  [Agents]       — PTY grid, всегда виден, основной экран
  [O]rch         — Orchestrator view (handoff log, task status)

Secondary (всегда доступны — mock в S00, real в S01+):
  [D]ash         — agent cards + compliance summary + activity log
  [S]can         — findings list
  [F]ix          — fix selection + diff preview
  [C]hat         — compliance LLM chat (placeholder в S00, live в S02)
  [T]imeline     — EU AI Act deadline + milestones
  [R]eport       — markdown/PDF export
```

**Chat view в S00 — placeholder state:**
```
┌─ Chat ──────────────────────────────────────────────────────────────────┐
│                                                                         │
│              🔌  Compliance Chat                                        │
│                                                                         │
│   Ask questions about EU AI Act obligations, get explanations           │
│   for findings, and request guided fixes.                               │
│                                                                         │
│   Available after Engine setup (Sprint 02).                             │
│   Run `complior setup engine` to get started.                           │
│                                                                         │
│   ──────────────────────────────────────────────────────────────        │
│   > _                           [Engine: disconnected]                  │
└─────────────────────────────────────────────────────────────────────────┘
```
Input поле видно и стилизовано, но при отправке показывает toast: *"Engine not connected. Run `complior setup engine`."*

**Keybindings — полная карта:**
```
БЫЛО:  1=Dashboard, 2=Scan, 3=Fix, 4=Chat, 5=Timeline, 6=Report
СТАЛО:
  1-6  = фокус агента N в Agent Grid
  O    = Orchestrator view
  D    = Dashboard
  S    = Scan
  F    = Fix
  C    = Chat (placeholder → live в S02)
  T    = Timeline
  R    = Report
  Esc  = вернуться в Agent Grid
```

**Tab bar:**
```
┌─ complior ────────────────────────────────────────────────────────────────┐
│ [Agents] [O]  [D]  [S]  [F]  [C]  [T]  [R]  [?]                        │
```
Активный tab подсвечен акцентным цветом темы. `[C]` в S00 показывает `●` серый (disconnected).

**Dashboard redesign** — теперь командный центр:
```
┌─ Dashboard ───────────────────────────────────────┬───────────────────────┐
│  Agents                                           │  Compliance           │
│  ─────────────────────────────────────────────    │  ─────────────────    │
│  [1] ● Claude Code    claude-3.7   working        │  Score: 47/100 🟠     │
│      Last: "Reading src/app/page.tsx..."          │  ████░░░░░░ 47%       │
│  [2] ○ Codex CLI      gpt-4o       idle           │                       │
│      Last: "Waiting for task"                     │  2 critical           │
│                                                   │  4 high               │
│  [Ctrl+A] Add agent                               │  4 medium             │
│                                                   │                       │
├───────────────────────────────────────────────────│  Next deadline:       │
│  Activity Log                                     │  Aug 2, 2026          │
│  ──────────────────────────────────────────────   │  163 days             │
│  14:32  CC started                                │                       │
│  14:33  wrapper → CC "Add disclosure..."          │  [S] Scan now         │
│  14:34  CC → done (Modified page.tsx)             │  [F] Fix findings     │
└───────────────────────────────────────────────────┴───────────────────────┘
```

**Chat view в S00:** виден в навигации, но показывает placeholder когда Engine не подключён. Полный live режим — в S02.

**Файлы:**
- `tui/src/app/mod.rs` — `AppView` enum: добавить `AgentGrid`, `Orchestrator`; `Chat` остаётся
- `tui/src/input.rs` — keybindings: `1-6→FocusAgent`, `O/D/S/F/C/T/R` → view switch
- `tui/src/ui/mod.rs` — render routing: `AgentGrid` как default view
- `tui/src/views/dashboard.rs` — переработать: agent cards слева + compliance summary справа + activity log снизу
- `tui/src/views/chat.rs` — добавить placeholder state (Engine disconnected)
- `tui/src/ui/tabs.rs` (новый) — tab bar `[Agents][O][D][S][F][C][T][R][?]`

**Acceptance Criteria:**
- [ ] При старте — виден Agent Grid
- [ ] `O/D/S/F/C/T/R` открывают соответствующие views
- [ ] `1-6` → фокус агента N (не view switch)
- [ ] Все compliance views рендерятся с mock данными (score 47, 12 findings)
- [ ] Dashboard: agent cards слева, compliance summary справа, activity log снизу
- [ ] Chat показывает placeholder с описанием и grayed input поле
- [ ] Отправка в Chat без Engine → toast: *"Engine not connected"*
- [ ] Tab bar всегда виден, active tab выделен акцентным цветом
- [ ] `Esc` из secondary view → возврат в Agent Grid

**Tests:** 5

---

### Phase 5 — Onboarding Update [День 12-14]

#### US-S0008: Онбординг v2 — Полный (4 SP)

**Описание:** Все настройки при первом запуске — в одном онбординге. Шаги 1-10 сохраняются, шаг 3 расширяется: вместо одного AI Provider появляются 4 подшага Agent Setup. Итого ~13 шагов (часть conditional). Compliance-шаги (Jurisdiction, Role, Industry, Scan Scope) ОСТАЮТСЯ в онбординге — они не требуют Engine, это просто конфигурация которая сохраняется и используется когда Engine подключится.

**Полный порядок шагов:**

```
1.  Тема              (ThemeSelect)   — 8 тем + live preview         [EXISTS]
2.  Navigation Mode   (Radio)         — Standard / Vim               [EXISTS]
3а. Agent Selection   (Checkbox)      — Claude Code / Codex / Aider  [NEW]
3б. Claude Code Setup (Conditional)   — проверка бинаря + auth       [NEW]
3в. Codex CLI Setup   (Conditional)   — OPENAI_API_KEY               [NEW]
3г. Layout Preference (Radio)         — Auto / Single / Split / Grid [NEW]
4.  Project Type      (Radio)         — Existing / New / Exploring   [EXISTS]
5.  Workspace Trust   (Radio)         — Yes / No                     [EXISTS]
6.  Jurisdiction      (Radio)         — EU / UK / US / Global        [EXISTS]
7.  Role              (Radio)         — Deployer / Provider / Both   [EXISTS]
8.  Industry          (Radio)         — General / HR / Finance / …   [EXISTS]
9.  Scan Scope        (Checkbox)      — Deps / Env / Code / Infra    [EXISTS, skip for new/demo]
10. Summary           (Summary)       — всё вместе + запуск          [EXISTS]
```

**Новые шаги — детали:**

**Шаг 3а — Agent Selection:**
```
  Which coding agents do you want to use?

  [✓] Claude Code    claude CLI      (recommended)
  [ ] Codex CLI      codex CLI
  [ ] Aider          aider CLI
  [ ] Add later      skip agent setup

  You can add/remove agents at any time with Ctrl+A.
```

**Шаг 3б — Claude Code Setup (если выбран):**
```
  Claude Code setup

  ✅  claude binary found at /usr/local/bin/claude
  ✅  Logged in as user@example.com

  ─── or if not installed ───────────────────────
  ❌  claude binary not found

  To install:  npm install -g @anthropic-ai/claude-code
  Then:        claude auth login

  [R] Retry    [S] Skip (set up later)
```

**Шаг 3в — Codex CLI Setup (если выбран):**
```
  Codex CLI setup

  ✅  codex binary found
  ⚠   OPENAI_API_KEY not set

  Enter API key (or S to skip):
  > sk-________________________   [Enter: save]

  [S] Skip — set OPENAI_API_KEY env var later
```

**Шаг 3г — Layout Preference:**
```
  Default layout for multiple agents:

  ◉ Auto     — smart grid based on terminal size   (recommended)
  ○ Single   — one agent fullscreen, Tab to switch
  ○ Split    — always 2 agents side by side
  ○ Grid     — always use grid layout
```

**Шаг 6 — Jurisdiction** (показывает контекст что Engine нужен позже):
```
  Your primary jurisdiction for AI Act compliance

  ◉ EU / EEA    (enforcement: Aug 2, 2026)
  ○ UK
  ○ EU + UK
  ○ US (state laws)
  ○ Global
  ○ Not sure    → defaults to EU

  ℹ  This configures the compliance scanner. Connect
     Engine in Sprint 02 to activate scanning.
```

**Post-completion action:**
- Если агенты выбраны → запустить их (не auto-scan)
- Если "Add later" → показать пустой Agent Grid с подсказкой `Ctrl+A to add agent`

**Файлы:**
- `tui/src/views/onboarding.rs` — добавить `AgentSelection`, `AgentSetup`, `LayoutPreference` шаги в `OnboardingStep` enum; добавить `binary_check()` utility
- `tui/src/config.rs` — добавить `default_layout: LayoutMode`, `selected_agents: Vec<String>`

**Acceptance Criteria:**
- [ ] Онбординг показывается при первом запуске
- [ ] Все 10 оригинальных шагов сохранены
- [ ] Шаг 3а: checkbox выбора агентов
- [ ] Шаг 3б: проверяет `which claude` и `claude auth status`
- [ ] Шаг 3в: принимает OPENAI_API_KEY с masked input
- [ ] Шаг 3г: layout preference сохраняется в config
- [ ] Шаги Jurisdiction / Role / Industry / Scan Scope присутствуют (не убраны)
- [ ] Post-completion: если агенты выбраны → запускаются, если нет → пустой Agent Grid
- [ ] Весь онбординг работает без Engine (Engine-зависимые шаги — только конфигурация)
- [ ] `config.onboarding_complete = true` → при следующем старте онбординг не показывается

**Tests:** 4

---

## Итого S00

| Story | SP | Файлы |
|-------|----|-------|
| US-S0001 PTY Manager (portable-pty) | 6 | `pty/session.rs`, `pty/buffer.rs` |
| US-S0002 Agent Registry + agents.toml | 2 | `config.rs`, `agents/mod.rs` |
| US-S0003 Claude Code Integration | 4 | `agents/claude_code.rs` |
| US-S0004 Codex CLI Integration | 3 | `agents/codex.rs` |
| US-S0005 Dynamic Agent Grid Layout | 5 | `pty/grid.rs`, `ui/panels/agent_panel.rs` |
| US-S0006 Agent Focus + Navigation | 3 | `input.rs`, `app/mod.rs` |
| US-S0007 Wrapper Orchestration Layer | 5 | `orchestrator/` (4 файла) |
| US-S0009 DataProvider (mock → real) | 3 | `data/provider.rs`, `data/mock.rs` |
| US-S0010 View Restructuring (wrapper-first) | 4 | `app/mod.rs`, `input.rs`, `views/dashboard.rs` |
| US-S0008 Онбординг v2 (полный) | 4 | `views/onboarding.rs`, `config.rs` |
| **Итого** | **39 SP** | **~15 файлов (новых/изменённых)** |

**Target tests after S00:** существующие + ~40 новых

---

## Definition of Done S00

**Wrapper:**
- [ ] `complior --agent claude-code` → Claude Code запускается в TUI, виден его splash
- [ ] `complior --agent claude-code,codex` → 2 агента в split-view
- [ ] `wrapper> send 1 "add AI disclosure to page.tsx"` → Claude получает и отвечает
- [ ] `wrapper> handoff 1 to 2` → после ответа CC, следующий send идёт Codex
- [ ] 4 агента → 2×2 grid на терминале ≥160 cols
- [ ] Превышение лимита → `[+N bg]` + `Ctrl+A` picker

**Views:**
- [ ] При старте главный экран — Agent Grid (не Dashboard)
- [ ] `D/S/F/T/R` открывают соответствующие views с mock данными
- [ ] Dashboard: agent cards + compliance summary (score 47) + activity log
- [ ] Scan view: 12 mock findings, фильтрация по severity
- [ ] `1-6` фокусирует агента N, не переключает view
- [ ] Chat виден в навигации, показывает placeholder (Engine disconnected)
- [ ] При подключении Engine — mock данные заменяются реальными (без перезапуска)

**Онбординг:**
- [ ] Показывается при первом запуске
- [ ] Все 10 оригинальных шагов сохранены
- [ ] Шаг 3 расширен: Agent Selection + Claude Code setup + Codex setup + Layout preference
- [ ] Jurisdiction / Role / Industry / Scan Scope — присутствуют, сохраняются в config
- [ ] Post-completion запускает выбранных агентов

**Качество:**
- [ ] `cargo test` — все тесты проходят
- [ ] `cargo clippy -- -D warnings` — без предупреждений
- [ ] Терминал восстанавливается при `Ctrl+C` и панике

---

## Риски

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Claude Code меняет prompt format | Средняя | Средний | `ready_pattern` configurable в TOML |
| Codex CLI auth flow в PTY | Высокая | Высокий | Pre-check: `codex auth status` до spawn |
| ANSI escape sequences в ready_pattern matching | Высокая | Средний | Strip ANSI перед pattern matching; рендер raw |
| portable-pty несовместим с Windows | Средняя | Средний | Условная компиляция, fallback на pipe |
| PTY resize race | Низкая | Низкий | Debounce 50ms |

---

## После S00

`complior` — рабочий оркестратор. Claude Code и Codex CLI запускаются внутри TUI, получают задачи, делают handoff. Онбординг настраивает агентов.

S01 (Engine: Regulation DB + Scanner) подключается следующим. После S01 + S02 — compliance sidebar появляется в панели рядом с агентами, дополняя wrapper функцией мониторинга.
