# Sprint S01 — TUI Overhaul: v6 → v8 Layout & UX

**Версия:** 1.0.0
**Дата:** 2026-02-27
**Статус:** Completed

---

## Обзор

Фундаментный спринт v8. Полная перестройка TUI из wrapper-модели (PTY host, Agents page, Orchestrator) в daemon-модель (dashboard-first, obligation-driven, passport-aware). Этот спринт НЕ реализует daemon backend или passport engine — он перестраивает визуальный слой и UX, чтобы S03+ могли добавлять функциональность в готовый каркас.

**Цель:** TUI v8 layout готов — навигация, status bar, 5 переработанных страниц, 3 stub-страницы, legacy удалён.

**Источник:** `docs/TUI-DESIGN-SPEC.md`

---

## User Stories

### US-S01-01: Remove Legacy Pages
**Приоритет:** CRITICAL

Как разработчик, я хочу чтобы Agents page (PTY wrapper) и Orchestrator page были удалены, чтобы TUI не содержал мёртвый код v6.

**Acceptance Criteria:**
- [x] Agents page удалена (PTY subprocess list, agent spawning, PTY rendering)
- [x] Orchestrator page удалена (agent selection, multi-agent routing)
- [x] Все PTY-related модули удалены из TUI: pty_manager, pty_renderer, agent_spawner, input_router
- [x] Hotkeys A и O (старые) освобождены
- [x] Компиляция без ошибок, `cargo test` проходит
- [x] Нет `#[allow(dead_code)]` маскировки — код реально удалён

---

### US-S01-02: Navigation System v8
**Приоритет:** CRITICAL

Как пользователь, я хочу навигацию по 8 страницам через hotkeys, чтобы быстро переключаться между видами.

**Acceptance Criteria:**
- [x] 8 глобальных hotkeys: D(Dashboard), S(Scan), F(Fix), P(Passport), O(Obligations), T(Timeline), R(Report), L(Log)
- [x] `q` — quit TUI (если daemon running, daemon продолжает работать)
- [x] `?` — Help overlay (список hotkeys + краткое описание страниц)
- [x] Page-local hotkeys показываются в bottom bar (per-page hint line)
- [x] Hotkeys работают из любой страницы (глобальные)

---

### US-S01-03: Status Bar v8
**Приоритет:** HIGH

Как пользователь, я хочу видеть score, текущую страницу, daemon status в status bar, чтобы всегда знать контекст.

**Acceptance Criteria:**
- [x] Верхний формат: `[score] [page_number page_name] [ctx:XX%] [daemon: ●/○]`
- [x] Нижний формат: `MODE  D:dash S:scan F:fix P:passport O:oblig T:time R:report L:log`
- [x] Daemon indicator: `●` (connected/running) / `○` (disconnected/standalone)
- [x] Score цвет: RED (<40), YELLOW (40-79), GREEN (80+)
- [x] Page-specific hotkey hints заменяют нижнюю строку при focus на элементе

---

### US-S01-04: Dashboard Overhaul
**Приоритет:** CRITICAL

Как пользователь, я хочу видеть обновлённый Dashboard с compliance overview, deadlines, AI systems, чтобы за 5 секунд понять состояние проекта.

**Acceptance Criteria:**
- [x] Убрана секция Files (TUI — не файловый менеджер)
- [x] Status Log: последние события (scan, fix, passport, file change)
- [x] Info panel: project name, score, check counts
- [x] Compliance Score: gauge bar + trend sparkline (▁▂▃▅▆)
- [x] EU AI Act Deadlines: 3 ближайших дедлайна с days left/overdue
- [x] Quick Actions: `[F] Fix N items (+X pts)`, `[P] N passports need attention`, `[S] Rescan`, `[O] N obligations pending`
- [x] AI Systems: список из passport (name, L-level, score, status) — заглушка "No passports yet — run `complior agent:init`" до S03
- [x] Score History: sparkline последних N скорингов
- [x] Daemon status indicator в header

---

### US-S01-05: Scan Page Overhaul
**Приоритет:** HIGH

Как пользователь, я хочу видеть findings с OBL-xxx, penalties и deadlines, чтобы понимать юридическое значение каждого finding.

**Acceptance Criteria:**
- [x] Findings показывают: OBL-xxx ID, Article, описание, severity, fixable badge
- [x] Findings группируются по severity (CRITICAL → HIGH → MEDIUM → LOW → PASSED)
- [x] Detail panel: OBL-xxx, Article, Risk description, Penalty (€XX M / X%), Deadline (days left)
- [x] `x` hotkey: explain obligation (текстовое описание, без LLM)
- [x] `f` hotkey на finding: jump to Fix page с этим item pre-selected
- [x] `p` hotkey: toggle show/hide passed checks
- [x] Filter hotkeys: `c`(Critical), `h`(High), `m`(Medium), `l`(Low), `a`(All)
- [x] Layer progress bars сохранены (L1-L5)

---

### US-S01-06: Fix Page Updates
**Приоритет:** MEDIUM

Как пользователь, я хочу видеть OBL-xxx IDs и predicted score в Fix page, чтобы приоритизировать фиксы.

**Acceptance Criteria:**
- [x] OBL-xxx ID виден в списке fixable items
- [x] Article reference виден (Art.XX)
- [x] Predicted score: "Current: 69 → Predicted: 100" с учётом выбранных items
- [x] Сохранён текущий layout (list + diff preview panels)

---

### US-S01-07: Report Page — Export Hotkey
**Приоритет:** LOW

Как пользователь, я хочу экспортировать report по hotkey, чтобы не переключаться в CLI.

**Acceptance Criteria:**
- [x] `e` hotkey → export menu (MD / JSON / SARIF)
- [x] Export сохраняет в `.complior/reports/`
- [x] Сообщение: "Report saved to .complior/reports/report-YYYY-MM-DD.{ext}"

---

### US-S01-08: Log Page — Activity Categories
**Приоритет:** LOW
**Статус:** Deferred → S02+

Как пользователь, я хочу видеть категоризированный activity log, чтобы различать типы событий.

**Acceptance Criteria:**
- [ ] Events категоризированы: `S`(scan), `F`(fix), `P`(passport), `D`(daemon), `W`(watcher)
- [ ] Prefix в каждой строке: `[20:03] S 69/100 (+2)`
- [ ] Daemon events: agent connect/disconnect, file change detected, auto-rescan
- [ ] До S03 (daemon): показывать только S/F events

---

### US-S01-09: Stub Pages — Passport, Obligations, Timeline
**Приоритет:** HIGH

Как пользователь, я хочу чтобы hotkeys P, O, T открывали страницы-заглушки, чтобы навигация была полной и UX не ломался.

**Acceptance Criteria:**
- [x] `P` → Passport page stub: "Agent Passport — Coming in Sprint S03. Run `complior agent:init` (CLI) to generate."
- [x] `O` → Obligations page stub: "108 EU AI Act Obligations — Coming in Sprint S03."
- [x] `T` → Timeline page stub: "Timeline to Aug 2, 2026 — Coming in Sprint S04."
- [x] Каждая stub-страница: header + one-liner + hotkey hints для возврата
- [x] Готовы для наполнения в S03/S04 (модульная структура, trait/component boundary)

---

### US-S01-10: Daemon Connection Scaffold
**Приоритет:** HIGH

Как разработчик, я хочу чтобы TUI имел абстракцию подключения к engine (direct / HTTP), чтобы S03 мог переключить на daemon без переписывания UI.

**Acceptance Criteria:**
- [x] Trait `EngineConnection` с методами: `scan()`, `fix()`, `status()`, `subscribe_events()`
- [x] `DirectConnection` — текущий режим (engine запускается in-process, как сейчас)
- [x] `HttpConnection` — stub (возвращает `Err("daemon not implemented")`)
- [x] TUI использует `EngineConnection` trait, не знает о конкретной реализации
- [x] В S03: `HttpConnection` реализуется, `DirectConnection` становится fallback для standalone CLI

---

## Зависимости

```
S01 (TUI Overhaul)
  └──→ S03 (Daemon + Passport MVP)
         └──→ S04 (Governance + Certification)
```

S01 НЕ зависит от daemon или passport engine. Работает поверх текущего engine (direct connection).

---

## Post-S01 Polish (2026-03-01)

Дополнительная работа поверх S01 scope, частично закрывающая S02 (Fixers):

### Type-Aware Fix Preview
- `render_diff_preview_single()` — 3 режима рендеринга по типу finding:
  - **Type A (Code Fix):** "Current Code" + "Suggested Fix" (structured diff) или "Recommendation" (текст)
  - **Type B (New Document):** "CREATE" + inferred path + "Proposed Content"
  - **Type C (Config Change):** "MODIFY" + "Proposed Changes"
- `infer_doc_path()` — маппинг check_id → target file path для Type B

### Production-Quality Fix Diffs (Engine)
- `buildFixDiff` переписан: ищет конструктор при обнаружении call-site паттерна
- Multi-line конструкторы: отслеживает `({})` depth для корректного wrapping
- `FixDiff.importLine` — новое поле (TS + Rust): `import { complior } from '@complior/sdk'`
- `hasCompliorImport()` — проверка дубликатов перед добавлением

### Real Fix Apply (S02 scope, done early)
- `apply_fix_to_file()` — реальная запись на диск:
  - Type A/C: читает файл → валидирует before-строки → заменяет на after → добавляет import → пишет
  - Type B: `mkdir -p` + создаёт файл с предложенным содержимым
  - Stale protection: отказ если файл изменился с момента скана
- `AppCommand::ApplyFixes` — Enter в Fix view запускает apply + auto re-scan с реальным score
- 3 unit-теста: apply diff, Type B create, stale rejection

### Тесты
- TUI: 298 tests (was 294)
- Engine: 394 tests (unchanged)
- Snapshots: 4 fix snapshots (single_mode, type_a_recommendation, type_b, diff_preview)

---

## Метрики спринта

| Метрика | Цель |
|---------|------|
| Legacy pages удалены (Agents, Orchestrator) | ✅ |
| 8 hotkeys работают | ✅ |
| Dashboard v8 layout | ✅ |
| Scan page: OBL-xxx + penalties | ✅ |
| Stub pages: P, O, T | ✅ |
| EngineConnection trait | ✅ |
| PTY модули удалены | ✅ |
| `cargo test` passing | ✅ 298 |
| `cargo clippy` clean | ✅ |
| Fix apply writes to disk | ✅ (S02 early) |
| Type-aware diff preview | ✅ |
