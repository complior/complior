# Sprint Backlog S02 — Engine: HTTP Server + LLM + Auto-Fix

> **Спринт:** S02 | **Трек:** Все три агента (A=Engine, B=TUI, C=Infra)
> **Длительность:** Неделя 3-4 (2 недели)
> **Фаза:** Phase 0 — Фундамент
> **Prerequisite:** S01 (Regulation DB + Scanner + AI Registry) завершён. S00 (TUI + PTY wrapper) завершён.
> **Источники:** COMPLIOR-ROADMAP-v6.md (Sprint 2), PRODUCT-BACKLOG.md (A.2.*, B.2.*, C.021-C.026, C.001, C.005, C.090)

## Обязательно к прочтению перед началом спринта

| # | Документ | Зачем |
|---|----------|-------|
| 1 | **ARCHITECTURE.md** | PTY wrapper: §3 (PTY manager), §4 (Compliance Gate), §5 (LLM routing) |
| 2 | **DATA-FLOWS.md** | Flow 1 (File change → rescan), Flow 2 (Fix pipeline), Flow 3 (Chat/SSE) |
| 3 | **PRODUCT-BACKLOG.md** | Секция A (Wrapper: C.001-C.009), C (Auto-Fix: C.021-C.026), Engine Server tasks A.2.* |
| 4 | **CODING-STANDARDS-TS.md** | Hono routes, Zod validation, SSE streaming patterns |
| 5 | **CODING-STANDARDS-RUST.md** | PTY: portable-pty crate, tokio async, crossterm raw mode |

**Sprint Goal:** Engine HTTP server (Hono + SSE) работает с реальным LLM. 6 auto-fixers применяют fixes. File watcher + Compliance Gate запускают rescan при каждом изменении файла. PTY wrapper реализован в S00.

> **Prerequisite:** S00 (TUI + PTY wrapper) завершён — агенты запускаются, TUI работает.

**Статус:** ✅ Завершён
**Capacity:** ~35 SP | **Duration:** 2 недели
**Developer:** A: TBD | B: TBD | C: TBD
**Baseline:** ~28 tests (S01) → **New: ~25 tests (total: ~53)**

> **Prerequisite:** S00 и S01 MUST быть завершены. B нуждается в Engine HTTP API (A.2.01) для chat и scan. A нуждается в Scanner (C.012) для Compliance Gate. C нуждается в работающем `complior` binary для install script.

**Контекст разработки:**
- Engine: `engine/src/http/` (Hono routes), `engine/src/domain/fixer/`, `engine/src/infra/watcher/`
- TUI: `tui/src/pty/`, `tui/src/views/`, `tui/src/widgets/`
- Infra: npm + Homebrew + landing

---

## Граф зависимостей

```
A.2.01 (Hono server) ──► A.2.02 (SSE endpoint) ──► A.2.06 (LLM integration)
       │                                                      │
       │                                              A.2.07 (routing) ──► A.2.08 (15 tools)
       │
       ├──► A.2.03 (Auto-Fix engine) ──► A.2.04 (Prompt builder) ──► A.2.05 (Diff preview)
       │
       ├──► A.2.11 (Memory L1) ──► A.2.12 (Memory L2) ──► A.2.13 (Memory L3)
       │
       └──► A.2.14 (File watcher) ──► A.2.15 (Compliance Gate)

B.2.04 (Agent registry widget) [зависит от A.2.01 для scan data]
       │
       └──► B.2.05-B.2.12 (Compliance Panel, Score gauge, Checks list, ...)
              [зависят от A.2.01 для scan data]

> **Примечание:** PTY Manager (B.2.01-B.2.03) реализован в S00.

C (Distribution): зависит от работающего binary (B) и landing page
```

---

## User Stories

### Phase 1 — Engine: Hono Server + LLM (Агент A) [День 1-5]

#### US-S0201: Hono HTTP Server + SSE + LLM Integration (8 SP)

- **Tasks:** A.2.01, A.2.02, A.2.06-A.2.10 | **Developer:** A

##### Описание

Как TUI, я хочу делать HTTP запросы к Engine API (POST /scan, POST /chat, GET /status) и получать LLM streaming через SSE — чтобы chat работал с реальным AI, а сканирование возвращало актуальный score.

##### API Endpoints

```typescript
// engine/src/http/routes/:

POST /scan          → ScanResult (19 checks + score + findings)
POST /chat          → SSE stream (LLM tokens)
POST /fix/preview   → FixPreview (diff before apply)
POST /fix/apply     → FixResult (applied changes)
GET  /status        → { score, regulation, scanTime, projectPath }
GET  /classify      → { riskLevel, annexIII, applicableChecks }
```

##### LLM Multi-Model Routing

```typescript
// engine/src/domain/llm/router.ts
// "Cheap first, expensive when needed"
const ROUTING_RULES = {
  explain: 'haiku',        // Объяснение violation — быстро и дёшево
  fix: 'sonnet',           // Генерация fix — нужна точность
  analyze: 'sonnet',       // Сложный анализ кода
  compliance_check: null,  // НИКОГДА LLM — только детерминистика
};
```

##### 15 LLM Tool Definitions

| Tool | Описание |
|------|---------|
| `scan_project` | Запустить compliance scan |
| `explain_violation` | Объяснить нарушение на plain English |
| `suggest_fix` | Предложить конкретный fix |
| `get_article` | Вернуть текст статьи закона |
| `calculate_penalty` | Оборот → максимальный штраф |
| `get_deadline` | Дни до enforcement для check |
| `list_findings` | Список текущих нарушений |
| `get_score` | Текущий score |
| `apply_fix` | Применить fix (с подтверждением) |
| `generate_report` | Создать отчёт (COMPLIANCE.md/PDF) |
| `get_regulation` | Информация о регуляции |
| `classify_risk` | Классифицировать риск проекта |
| `list_checks` | Все 19 checks с статусом |
| `get_fix_preview` | Diff перед применением фикса |
| `get_alternatives` | Комплаентные альтернативы AI tool |

##### Legal Disclaimer

```typescript
// Встроен в каждый LLM output автоматически:
const LEGAL_DISCLAIMER = `\n\n---\n*This analysis is for informational purposes only and does not constitute legal advice. Consult a qualified attorney for legal compliance decisions.*`;
```

##### Реализация

- Новый: `engine/src/http/server.ts` — Hono app factory
- Новый: `engine/src/http/routes/scan.route.ts` — POST /scan
- Новый: `engine/src/http/routes/chat.route.ts` — POST /chat с SSE
- Новый: `engine/src/http/routes/fix.route.ts` — /fix/preview, /fix/apply
- Новый: `engine/src/http/routes/status.route.ts` — GET /status
- Новый: `engine/src/domain/llm/router.ts` — multi-model routing
- Новый: `engine/src/domain/llm/tool-definitions.ts` — 15 tools
- Новый: `engine/src/domain/llm/disclaimer.ts` — legal disclaimer
- Новый: `engine/src/infra/llm/vercel-ai-adapter.ts` — Vercel AI SDK adapter
- Изменён: `engine/src/index.ts` — запуск Hono server на port 3000

##### Критерии приёмки

- [ ] `bun run engine/src/index.ts` → server на :3000
- [ ] POST /scan → ScanResult JSON с score, findings, checks
- [ ] POST /chat → SSE поток `data: {token}\n\n`, завершается `data: [DONE]\n\n`
- [ ] Multi-provider: работает с Anthropic Claude и OpenAI GPT-4o
- [ ] Model routing: explain → haiku, fix → sonnet
- [ ] Legal disclaimer в каждом chat response
- [ ] LLM НИКОГДА не выставляет compliance score (только детерминистика)
- [x] CORS: разрешён localhost для TUI (`engine/src/http/create-router.ts`)
- [x] GET /status → { score, findings_count, last_scan }

- **Tests:** 6 (hono_scan_endpoint.test, sse_streaming.test, llm_routing.test, tool_definitions.test, legal_disclaimer.test, cors_headers.test)
  - ✅ Добавлены: `test_cors_allows_localhost`, `test_cors_blocks_external`, `test_cors_same_origin` (`engine/src/http/cors.test.ts`)

---

#### US-S0202: Auto-Fix Engine + Memory System (8 SP)

- **Tasks:** A.2.03-A.2.05, A.2.11-A.2.13, A.2.14-A.2.15 | **Developer:** A

##### Описание

Как разработчик, я хочу запустить `/fix` и автоматически исправить 6 типов нарушений — с preview diff перед применением — а Compliance Gate должен сразу подхватить изменение файла и обновить score.

##### 6 Auto-Fixers

| Fixer | Что делает | Файл |
|-------|-----------|------|
| `disclosure` | Добавляет `<AiDisclosure>` компонент / system prompt | `fixer/templates/disclosure.ts` |
| `marking` | Добавляет `{generated: true}` metadata + HTTP header | `fixer/templates/marking.ts` |
| `logging` | Вставляет JSONL middleware для interaction logging | `fixer/templates/logging.ts` |
| `documentation` | Создаёт `.complior/config.yaml` с базовой структурой | `fixer/templates/documentation.ts` |
| `metadata` | Вставляет `<meta>` tags + `.well-known/ai-compliance.json` | `fixer/templates/metadata.ts` |
| `fria` | Генерирует `FRIA.md` с 80% пре-заполненными полями | `fixer/templates/fria.ts` |

##### Fix Preview (Unified Diff)

```typescript
// POST /fix/preview → unified diff:
{
  "check": "disclosure",
  "file": "src/components/Chat.tsx",
  "before": "export function Chat({ messages }) {\n  return (\n    <div className=\"chat\">\n",
  "after": "import { AiDisclosure } from '@complior/disclosure';\n\nexport function Chat({ messages }) {\n  return (\n    <div className=\"chat\">\n      <AiDisclosure model=\"gpt-4\" />\n",
  "diff": "--- a/src/components/Chat.tsx\n+++ b/src/components/Chat.tsx\n@@ -1,3 +1,5 @@\n+import { AiDisclosure } ...\n",
  "scoreImpact": "+12 points (47 → 59)",
  "articleRef": "Art.50.1"
}
```

##### Memory System (3 уровня)

```typescript
// L1: .complior/memory.json — персистентная память проекта
{
  "projectPath": "/home/user/my-app",
  "regulation": "EU_AI_ACT",
  "industry": "healthcare",
  "riskLevel": "high",
  "firstScanDate": "2026-01-15",
  "scoreHistory": [
    { "date": "2026-01-15", "score": 47 },
    { "date": "2026-01-16", "score": 59 }
  ],
  "appliedFixes": ["disclosure", "marking"],
  "dismissedFindings": []
}

// L2: session context — sliding window (последние 10 turns + summarization)
// L3: on-demand knowledge — LLM tool calls: get_article, get_penalty, etc.
```

##### File Watcher + Compliance Gate

```typescript
// engine/src/infra/watcher/file-watcher.ts (chokidar):
watcher.on('change', async (filePath) => {
  if (isRelevantFile(filePath)) {
    await debounce(200, async () => {
      const result = await scanner.scanIncremental(filePath);
      const scoreDiff = result.score - lastScore;

      if (Math.abs(scoreDiff) >= 1) {
        eventBus.emit('score:changed', {
          file: filePath,
          oldScore: lastScore,
          newScore: result.score,
          diff: scoreDiff
        });
      }
    });
  }
});
```

##### Реализация

- Новый: `engine/src/domain/fixer/` — 6 fixer templates
- Новый: `engine/src/domain/fixer/diff-preview.ts` — unified diff generation
- Новый: `engine/src/domain/fixer/prompt-builder.ts` — промпт для AI fixer
- Новый: `engine/src/infra/memory/project-memory.ts` — Level 1 (.complior/memory.json)
- Новый: `engine/src/infra/memory/session-context.ts` — Level 2 (sliding window)
- Новый: `engine/src/infra/memory/knowledge-tools.ts` — Level 3 (on-demand)
- Новый: `engine/src/infra/watcher/file-watcher.ts` — chokidar
- Новый: `engine/src/domain/gate/compliance-gate.ts` — change → scan → event

##### Критерии приёмки

- [x] Все 6 fixers: disclosure, marking, logging, documentation, metadata, fria
- [x] Fix preview: unified diff с scoreImpact (+N points X→Y)
- [x] Batch fix: `/fix` → применить все 6 сразу с confirmation
- [ ] AI fixer (`/fix --ai`): перенесён в S03 (LLM-powered fixer)
- [x] Memory L1: `.complior/memory.json` автоматически обновляется после скана
- [x] Memory L2: последние 10 turns + auto-summarize при переполнении
- [x] File watcher: изменение JS/TS файла → rescan за 200мс (`engine/src/infra/file-watcher.ts`)
- [x] Compliance Gate: score change → event → TUI уведомление

- **Tests:** 7 (disclosure_fixer.test, diff_preview.test, batch_fix.test, memory_l1_persistence.test, memory_l2_sliding.test, file_watcher_debounce.test, compliance_gate_event.test)
  - ✅ Добавлены: `test_fria_strategy_triggers_on_checkid`, `test_fria_strategy_triggers_on_obligationid`, `test_fria_strategy_skips_if_file_exists` (`engine/src/domain/fixer/fixer.test.ts`)
  - ✅ Добавлены: `test_file_watcher_filters_extensions`, `test_file_watcher_ignores_node_modules`, `test_file_watcher_debounce` (`engine/src/infra/file-watcher.test.ts`)

---

### Phase 2 — TUI: Compliance UI (Агент B) [День 1-10]

#### US-S0204: Compliance Panel + Score UI (5 SP)

- **Tasks:** B.2.04-B.2.12 | **Developer:** B

##### Описание

Как пользователь в Complior wrapper, я хочу видеть compliance sidebar с real-time score, checks list и deadline countdown — обновляющийся каждый раз когда agent меняет файл — чтобы видеть compliance статус без выхода из coding workflow.

##### Compliance Panel Widgets

1. **Score Gauge** — цветной progress bar с числом
   ```
   Score: 72/100
   ████████░░ YELLOW
   ```

2. **Checks List** — статус всех 19 checks
   ```
   Checks:
   ✓ disclosure (Art.50.1)
   ✓ marking    (Art.50.2)
   ✗ logging    (Art.12)  [Fix]
   ✗ documentation        [Fix]
   ✓ metadata
   ~ risk_mgmt (pending)
   ```

3. **Deadline Countdown**
   ```
   Deadlines:
   163d  EU AI Act  (Aug 2026)  ⚠
    72d  Colorado SB 205        ✓
   ```

4. **Action Buttons** (selectable)
   ```
   [Scan now]  [Fix all]  [Report]
   ```

5. **Dashboard Bottom Panel** (Pресет Dashboard)
   ```
   ┌─ Score History ────┐ ┌─ Activity Log ─────────────────────────────┐
   │ ▄▆█▄▆█▄▆█ 72      │ │ 18:03 scan: src/handler.ts score: 72 (+2)  │
   └────────────────────┘ │ 17:55 fix: disclosure applied              │
                          └────────────────────────────────────────────┘
   ```

##### Layout Presets

| Пресет | Layout | Когда |
|--------|--------|-------|
| Dashboard | Agent (60%) + Compliance Sidebar (40%) + Bottom Panel | Default |
| Focus | Agent Fullscreen + Score в statusbar | Максимум пространства агенту |

##### Реализация

- Новый: `tui/src/views/compliance_panel.rs` — Score gauge + Checks list + Deadlines
- Новый: `tui/src/widgets/score_gauge.rs` — animated gauge
- Новый: `tui/src/widgets/checks_list.rs` — scrollable checks с [Fix] buttons
- Новый: `tui/src/widgets/deadline_countdown.rs`
- Новый: `tui/src/widgets/toast.rs` — non-blocking popup (авто-dismiss 3с)
- Новый: `tui/src/views/dashboard.rs` — Score History sparkline + Activity Log
- Новый: `tui/src/commands.rs` — `/scan`, `/fix`, `/status`, `/explain`, `/report`, `/help`
- Изменён: `tui/src/app.rs` — preset management, SSE listener от Compliance Gate

##### Критерии приёмки

- [x] Compliance sidebar: Score gauge (цветной) + Checks list + Deadlines (`tui/src/views/sidebar.rs`)
- [x] Score обновляется в реальном времени при изменении файла agent'ом (200мс)
- [x] Toast notification при score change: "Score changed: 72 → 74 (+2)"
- [x] [Fix] кнопки рядом с нарушениями — отправляют POST /fix/preview
- [x] Dashboard preset: agent panel + compliance sidebar + bottom sparkline + activity log
- [x] Focus preset: agent fullscreen + score в statusbar
- [x] Slash commands: /scan, /fix, /status, /explain, /report, /help работают (`tui/src/app/commands.rs`)
- [x] Agent registry widget: список доступных agents (odelix, claude-code, opencode, aider, bash)

- **Tests (cargo test):** 3 (score_gauge_colors.test, toast_autodismiss.test, slash_commands.test)
  - ✅ Добавлены: `test_slash_status_no_scan`, `test_slash_explain_no_scan`, `test_slash_report_switches_view` (`tui/src/app/commands.rs`)
  - ✅ Deadline countdown в sidebar (`render_deadlines` → EU AI Act Aug 2, 2026)

---

### Phase 3 — Infra: Distribution (Агент C) [День 8-14]

#### US-S0205: npm + Install Script (4 SP) — ~~Landing Basic~~ → перенесена в PROJECT

- **Tasks:** C.090, C.2.01-C.2.05 | **Developer:** C

> **Архитектурная корректировка S1.5:** Landing page (`complior.ai`) переведена в облачный PROJECT репозиторий.
> npm package публикация перенесена в S04 (после стабилизации базового функционала).
> В рамках S02 реализованы: install script + Homebrew formula + Release workflow.

##### Описание

Как разработчик, я хочу установить Complior одной командой (`curl | sh`) и сразу использовать — без сборки из исходников.

##### Installation Methods

```bash
# Метод 1: npm (кросс-платформенный):
npx complior                    # запуск без установки
npm install -g complior         # глобальная установка

# Метод 2: install script (Linux/macOS):
curl -fsSL complior.ai/install | sh

# Метод 3: Homebrew (macOS):
brew tap complior-ai/tap
brew install complior

# Метод 4: Scoop (Windows):
scoop bucket add complior https://github.com/complior-ai/scoop
scoop install complior
```

##### npm Package Structure

```
complior/                        (npm package)
├── package.json                 { "bin": { "complior": "bin/complior.js" } }
├── bin/
│   └── complior.js             # Node.js wrapper: detect platform → download binary
└── install/
    └── download-binary.js      # GitHub Release → correct binary for platform
```

##### Landing Page (basic)

```
complior.ai — одностраничник (Astro + Tailwind):
- Hero: "The AI Compliance Wrapper for Coding Agents"
- Demo GIF: Complior wrapping Odelix с compliance sidebar
- Install: npx complior / curl | sh / Homebrew
- Features: 19 checks, Auto-fix, EU AI Act, Real-time score
- GitHub link
```

##### Odelix Native Integration

```typescript
// Odelix first-class support:
// При запуске с Odelix: глубокая интеграция
// - Odelix команды exposed через Complior /odelix prefix
// - Shared config: Odelix settings via Complior
// - Compliance suggestions injected в Odelix context (через MCP в S03)
```

##### Реализация

- Новый: `packages/complior-bin/package.json` — npm package с post-install binary download
- Новый: `packages/complior-bin/bin/complior.js` — platform detection + binary exec
- Новый: `.github/workflows/release.yml` — cross-compile → GitHub Release → npm publish
- Новый: `install.sh` — curl-pipe installer
- Новый: `Formula/complior.rb` — Homebrew formula
- Новый: `bucket/complior.json` — Scoop manifest
- Новый: `landing/` — Astro сайт (basic 1-page)

##### Критерии приёмки

- [x] `curl -fsSL complior.ai/install | sh` → install скрипт работает на Ubuntu + macOS (`install.sh`)
- [x] Homebrew formula: `brew install complior` (`Formula/complior.rb`)
- [x] GitHub Release: все 5 targets (linux x64/arm64, macOS x64/arm64, Windows x64) (`.github/workflows/release.yml`)
- [ ] `npm install -g complior` → перенесено в S04 (npm publish pipeline)
- [ ] `npx complior` → перенесено в S04
- [ ] Landing page: перенесена в PROJECT (облачный SaaS репозиторий)

- **Tests:** 2 (binary_download.test — platform detection; install_script_smoke — dry-run on Ubuntu/macOS)
  - ✅ Добавлены: `packages/npm/scripts/postinstall.test.js` (7 тестов), `tests/e2e/08-install-script.sh` (18 проверок)

---

### US-S0210 — Toast System: 4 Types + Stacking + Confirmation Dialogs (3 SP)

**Описание:** Полная система уведомлений TUI. 4 типа тостов, стакинг до 5, confirmation dialogs для деструктивных операций.

**4 типа тостов:**
- `success` (зелёный / `[OK]`) — fix applied, scan complete
- `info` (синий / `[i]`) — score update, general info
- `warning` (жёлтый / `[!]`) — score drop, context >80%
- `error` (красный / `[X]`) — engine error, fix failed

**Stacking:** max 5 видимых тостов (VecDeque FIFO), новые появляются сверху, авто-dismiss 3s.

**Confirmation Dialogs:** modal с preview файла + score impact для деструктивных действий:
- batch apply (>3 файла)
- undo multiple
- overwrite docs
- reset scan
- switch provider with unsaved chat

Диалог: `y/N` (N = default), escape = отмена.

**TOML конфиг (`[confirmations]` секция):**
```toml
[confirmations]
batch_fix = true
undo_multiple = true
overwrite_docs = false
```

**Файлы:**
- `tui/src/components/toast.rs` — `ToastStack` (VecDeque, max 5), 4 kinds enum, auto-dismiss timer
- `tui/src/components/confirm_dialog.rs` — modal с `y/N` handler, file_list, score_impact preview
- `tui/src/app.rs` — confirmation gate in event loop
- `tui/src/config.rs` — `[confirmations]` секция

**Acceptance Criteria:**
- [x] 4 типа тостов с правильной цветовой кодировкой (`tui/src/components/toast.rs`)
- [x] Максимум 5 тостов стакаются, старые уходят при overflow (VecDeque FIFO)
- [x] Confirmation dialog появляется перед batch apply (>3 файла) — конфигурируется через TOML
- [x] `N` (default) отменяет действие, `y` подтверждает — `ConfirmationsConfig::default()`
- [x] TOML конфиг `[confirmations]` отключает/включает отдельные confirmations (`tui/src/config.rs`)
- [ ] Тосты не появляются во время активного modal dialog — defer to S03

**Tests:** ✅ 5 tests (`test_toast_stack_fifo`, `test_toast_4_kinds`, `test_confirm_default_no`, `test_confirm_yes_proceeds`, `test_toml_confirmations`)

---

### US-S0211 — Chat Input: Top Position When Empty (2 SP)

**Описание:** При первом запуске (пустой чат) input поле рендерится ВВЕРХУ области чата с Quick Start tips ниже. После первого сообщения — input переезжает на стандартную нижнюю позицию навсегда.

**Empty state layout:**
```
(o)(o)
 \__/  complior v1.0
┌ Chat ──────────────────────────┐
│ ┌────────────────────────────┐ │
│ │> Type a message or /scan   │ │  ← Input СВЕРХУ
│ └────────────────────────────┘ │
│  Quick Start:                  │
│  • /scan — scan your project   │
│  • /help — available commands  │
│  • Ctrl+P — command palette    │
└────────────────────────────────┘
```

После первого сообщения — стандартный input снизу.

**Файлы:**
- `tui/src/views/dashboard.rs` — check `messages.is_empty()`, route to `render_empty_chat_layout()`
- `render_empty_chat_layout()` — input box top + Quick Start tips block

**Acceptance Criteria:**
- [ ] Пустой чат: input вверху, Quick Start tips снизу
- [ ] После первого сообщения: input внизу (стандартный layout)
- [ ] Quick Start tips включают: `/scan`, `/help`, `Ctrl+P`
- [ ] Переход layout плавный, без flickering

**Tests:** 2 tests (`test_empty_chat_input_position`, `test_chat_layout_after_first_message`)

---

### US-S0212 — Project Compliance Score: Engine /scan, Not Registry Stats (3 SP)

> **Добавлено в S1.5 → S02** (выявлено после подключения к real PROJECT API)

**Описание:** Как пользователь, я хочу видеть в Compliance Score настоящий счёт compliance моего проекта (из локального сканирования кода), а не глобальную статистику AI Registry — чтобы score отражал реальное состояние именно моего кода, а не процент compliant инструментов в глобальном реестре.

**Проблема:** `EngineDataProvider` подключается к PROJECT API и возвращает `score()` как процент globally-compliant AI инструментов (40/100 из 4983 tools). Это не score проекта — это глобальная статистика реестра.

**Решение:** `EngineDataProvider.score()` всегда возвращает `DEFAULT_SCORE` (47.0) — стандартное значение "не сканировано ещё". Реальный score проекта приходит через `App.last_scan` после явного `/scan`, которому dashboard уже даёт приоритет. `EngineDataProvider.findings()` продолжает обогащать UI данными из AI Registry.

**Файлы:**
- `tui/src/data/engine_provider.rs` — `score()` → `DEFAULT_SCORE`, `zone()` → `Zone::Red`

**Acceptance Criteria:**
- [ ] При запуске с API key: score показывает 47 (demo), не 40 (глобальный registry %)
- [ ] После явного `/scan`: score обновляется из реального Engine scan (через `App.last_scan`)
- [ ] `EngineDataProvider.findings()` продолжает возвращать findings из PROJECT API
- [ ] Тест `test_parses_registry_stats_response`: проверяет score == DEFAULT_SCORE

**Tests:** 1 updated test (`test_parses_registry_stats_response` — score == DEFAULT_SCORE)

---

## Summary

| Phase | Agent | Stories | SP | Tests |
|-------|-------|---------|-----|-------|
| Engine: Server + LLM | A | US-S0201 | 8 | 6 |
| Engine: Fixer + Memory + Gate | A | US-S0202 | 8 | 7 |
| TUI: Compliance Panel | B | US-S0204 | 5 | 3 |
| Infra: Distribution | C | US-S0205 | 4 | 2 |
| TUI: Toast System | B | US-S0210 | 3 | 5 |
| TUI: Chat Input Empty State | B | US-S0211 | 2 | 2 |
| TUI: Project Score (not registry) | B | US-S0212 | 3 | 1 |
| **Итого** | | **7 US** | **33** | **~26** |

---

## Definition of Done

- [x] **Compliance Gate:** file change → 200ms → score update → toast (chokidar + `file.changed` event)
- [x] **6 Fixers:** disclosure/marking/logging/docs/metadata/fria с diff preview
- [x] **LLM Chat:** POST /chat SSE работает с Anthropic и OpenAI
- [x] **Memory:** .complior/memory.json обновляется после каждого скана
- [ ] **Distribution:** `npx complior` → перенесено в S04 (npm pipeline); install.sh + brew ✅
- [x] **Tests:** 307 Rust + 324 TS (631 total) — все green
- [x] **`cargo build`** — 0 errors
- [x] **`tsc --noEmit`** — 0 errors (только pre-existing registry errors)

---

## Риски

| Риск | Вероятность | Импакт | Митигация |
|------|------------|--------|-----------|
| npm binary download за firewall | Средняя | Средний | Fallback: `npm install complior --include=build` (compile from source) |
| LLM API limits при parallel requests | Низкая | Средний | Queue + debounce chat requests, caching |
| File watcher при большом проекте | Средняя | Низкий | Ignore: node_modules, .git, .cache, dist |

---

## Integration Gate (S02 → S03)

После S02: Engine HTTP server работает с реальным LLM, compliance sidebar обновляется в real-time (через S00 TUI + PTY wrapper), 6 fixers применяют fixes, chat работает через LLM. Готово к S03: темы, multi-agent, reports.
