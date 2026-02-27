# Sprint S01 — TUI Overhaul: v6 → v8 Layout & UX

**Версия:** 1.0.0
**Дата:** 2026-02-27
**Статус:** Planning

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
- [ ] Agents page удалена (PTY subprocess list, agent spawning, PTY rendering)
- [ ] Orchestrator page удалена (agent selection, multi-agent routing)
- [ ] Все PTY-related модули удалены из TUI: pty_manager, pty_renderer, agent_spawner, input_router
- [ ] Hotkeys A и O (старые) освобождены
- [ ] Компиляция без ошибок, `cargo test` проходит
- [ ] Нет `#[allow(dead_code)]` маскировки — код реально удалён

---

### US-S01-02: Navigation System v8
**Приоритет:** CRITICAL

Как пользователь, я хочу навигацию по 8 страницам через hotkeys, чтобы быстро переключаться между видами.

**Acceptance Criteria:**
- [ ] 8 глобальных hotkeys: D(Dashboard), S(Scan), F(Fix), P(Passport), O(Obligations), T(Timeline), R(Report), L(Log)
- [ ] `q` — quit TUI (если daemon running, daemon продолжает работать)
- [ ] `?` — Help overlay (список hotkeys + краткое описание страниц)
- [ ] Page-local hotkeys показываются в bottom bar (per-page hint line)
- [ ] Hotkeys работают из любой страницы (глобальные)

---

### US-S01-03: Status Bar v8
**Приоритет:** HIGH

Как пользователь, я хочу видеть score, текущую страницу, daemon status в status bar, чтобы всегда знать контекст.

**Acceptance Criteria:**
- [ ] Верхний формат: `[score] [page_number page_name] [ctx:XX%] [daemon: ●/○]`
- [ ] Нижний формат: `MODE  D:dash S:scan F:fix P:passport O:oblig T:time R:report L:log`
- [ ] Daemon indicator: `●` (connected/running) / `○` (disconnected/standalone)
- [ ] Score цвет: RED (<40), YELLOW (40-79), GREEN (80+)
- [ ] Page-specific hotkey hints заменяют нижнюю строку при focus на элементе

---

### US-S01-04: Dashboard Overhaul
**Приоритет:** CRITICAL

Как пользователь, я хочу видеть обновлённый Dashboard с compliance overview, deadlines, AI systems, чтобы за 5 секунд понять состояние проекта.

**Acceptance Criteria:**
- [ ] Убрана секция Files (TUI — не файловый менеджер)
- [ ] Status Log: последние события (scan, fix, passport, file change)
- [ ] Info panel: project name, score, check counts
- [ ] Compliance Score: gauge bar + trend sparkline (▁▂▃▅▆)
- [ ] EU AI Act Deadlines: 3 ближайших дедлайна с days left/overdue
- [ ] Quick Actions: `[F] Fix N items (+X pts)`, `[P] N passports need attention`, `[S] Rescan`, `[O] N obligations pending`
- [ ] AI Systems: список из passport (name, L-level, score, status) — заглушка "No passports yet — run `complior agent:init`" до S03
- [ ] Score History: sparkline последних N скорингов
- [ ] Daemon status indicator в header

---

### US-S01-05: Scan Page Overhaul
**Приоритет:** HIGH

Как пользователь, я хочу видеть findings с OBL-xxx, penalties и deadlines, чтобы понимать юридическое значение каждого finding.

**Acceptance Criteria:**
- [ ] Findings показывают: OBL-xxx ID, Article, описание, severity, fixable badge
- [ ] Findings группируются по severity (CRITICAL → HIGH → MEDIUM → LOW → PASSED)
- [ ] Detail panel: OBL-xxx, Article, Risk description, Penalty (€XX M / X%), Deadline (days left)
- [ ] `x` hotkey: explain obligation (текстовое описание, без LLM)
- [ ] `f` hotkey на finding: jump to Fix page с этим item pre-selected
- [ ] `p` hotkey: toggle show/hide passed checks
- [ ] Filter hotkeys: `c`(Critical), `h`(High), `m`(Medium), `l`(Low), `a`(All)
- [ ] Layer progress bars сохранены (L1-L5)

---

### US-S01-06: Fix Page Updates
**Приоритет:** MEDIUM

Как пользователь, я хочу видеть OBL-xxx IDs и predicted score в Fix page, чтобы приоритизировать фиксы.

**Acceptance Criteria:**
- [ ] OBL-xxx ID виден в списке fixable items
- [ ] Article reference виден (Art.XX)
- [ ] Predicted score: "Current: 69 → Predicted: 100" с учётом выбранных items
- [ ] Сохранён текущий layout (list + diff preview panels)

---

### US-S01-07: Report Page — Export Hotkey
**Приоритет:** LOW

Как пользователь, я хочу экспортировать report по hotkey, чтобы не переключаться в CLI.

**Acceptance Criteria:**
- [ ] `e` hotkey → export menu (MD / JSON / SARIF)
- [ ] Export сохраняет в `.complior/reports/`
- [ ] Сообщение: "Report saved to .complior/reports/report-YYYY-MM-DD.{ext}"

---

### US-S01-08: Log Page — Activity Categories
**Приоритет:** LOW

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
- [ ] `P` → Passport page stub: "Agent Passport — Coming in Sprint S03. Run `complior agent:init` (CLI) to generate."
- [ ] `O` → Obligations page stub: "108 EU AI Act Obligations — Coming in Sprint S03."
- [ ] `T` → Timeline page stub: "Timeline to Aug 2, 2026 — Coming in Sprint S04."
- [ ] Каждая stub-страница: header + one-liner + hotkey hints для возврата
- [ ] Готовы для наполнения в S03/S04 (модульная структура, trait/component boundary)

---

### US-S01-10: Daemon Connection Scaffold
**Приоритет:** HIGH

Как разработчик, я хочу чтобы TUI имел абстракцию подключения к engine (direct / HTTP), чтобы S03 мог переключить на daemon без переписывания UI.

**Acceptance Criteria:**
- [ ] Trait `EngineConnection` с методами: `scan()`, `fix()`, `status()`, `subscribe_events()`
- [ ] `DirectConnection` — текущий режим (engine запускается in-process, как сейчас)
- [ ] `HttpConnection` — stub (возвращает `Err("daemon not implemented")`)
- [ ] TUI использует `EngineConnection` trait, не знает о конкретной реализации
- [ ] В S03: `HttpConnection` реализуется, `DirectConnection` становится fallback для standalone CLI

---

## Зависимости

```
S01 (TUI Overhaul)
  └──→ S03 (Daemon + Passport MVP)
         └──→ S04 (Governance + Certification)
```

S01 НЕ зависит от daemon или passport engine. Работает поверх текущего engine (direct connection).

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
| `cargo test` passing | ✅ |
| `cargo clippy` clean | ✅ |
