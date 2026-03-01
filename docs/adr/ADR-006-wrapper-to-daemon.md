# ADR-006: Переход от Wrapper к Daemon архитектуре

**Статус**: Принято
**Дата**: 2026-02-27
**Автор**: Marcus (CTO)

## Контекст

Complior v6 использовал wrapper-модель: Rust TUI запускал coding agent как PTY subprocess внутри себя ("tmux для compliance"). После реализации S00-S02 стали очевидны фундаментальные проблемы этого подхода.

### Проблемы PTY Wrapper

1. **PTY rendering bugs** — Coding agents (Claude Code, OpenCode, Odelix) используют сложные terminal escape sequences (ANSI, 256-color, cursor movement). Рендеринг через промежуточный PTY ломал вывод: артефакты, мерцание, некорректное позиционирование курсора.

2. **Single Point of Failure** — Crash Complior = crash агента. Вся работа агента теряется. Пользователь привыкает ctrl+c из Complior — но это убивает и агента.

3. **Нет IDE-агентов** — Cursor, VS Code Copilot, Windsurf — GUI-приложения, не CLI. Невозможно запустить их как PTY subprocess. Wrapper-модель работает только с CLI-агентами.

4. **Input routing сложность** — Разделение keystroke между Complior (Ctrl+Shift+*) и агентом — источник постоянных конфликтов. Agенты перехватывают те же комбинации.

5. **Multi-agent overhead** — Каждый агент = отдельный PTY, отдельный resize handler, отдельный parsing pipeline. Масштабирование кода O(n) от числа агентов.

## Решение

Переход на daemon-архитектуру:

```
v6 (Wrapper):
  Complior TUI [PTY → Agent subprocess]

v8 (Daemon):
  Complior Daemon (background) ← HTTP/SSE → TUI (отдельный процесс)
                                ← MCP (stdio) → Agents (независимые)
                                ← HTTP → CLI (одноразовые команды)
```

### Три режима запуска

1. **`complior`** — daemon + TUI (по умолчанию)
2. **`complior daemon --watch`** — headless daemon (CI/CD, server)
3. **`complior scan --ci`** — standalone CLI (одноразовый скан)

### Ключевые изменения

- **TUI подключается к daemon через HTTP/SSE** — вместо управления PTY
- **Агенты работают независимо** — подключаются через MCP (8 tools)
- **Daemon = file watcher + engine + MCP server + HTTP API** — единый background process
- **Нет PTY management** — устранён весь код PTY, input routing, agent subprocess lifecycle

## Обоснование

- **Reliability** — daemon и TUI — отдельные процессы. Crash одного не влияет на другие.
- **Universality** — MCP работает с ЛЮБЫМ агентом (CLI, IDE, SaaS). Не только CLI.
- **Simplicity** — устранён PTY layer (~2K LOC), input routing, resize handling, agent registry.
- **CI/CD** — headless daemon естественно работает в CI без TUI.
- **Agent Passport** — daemon может наблюдать файловую систему постоянно, обновляя passports в фоне.

## Последствия

### Позитивные
- Устранены все PTY rendering bugs
- Агенты сохраняют свой native UX
- Поддержка IDE-агентов (Cursor, VS Code) через MCP
- Daemon может работать headless (CI/CD, сервер)
- TUI может подключаться/отключаться без потери state

### Негативные
- Потеря integrated experience — агент и compliance больше не в одном окне
- Необходимость MCP configuration на стороне агента
- Daemon process management (PID файл, port, lifecycle)

### Митигация
- TUI остаётся rich dashboard с 8 страницами — compliance experience в одном окне
- MCP configuration — одноразовый setup, документация + `complior mcp` helper
- Daemon lifecycle — стандартный PID file, graceful shutdown, stale PID detection

## Удалённые модули (v6 → v8)

| Модуль | Причина |
|--------|---------|
| `tui/src/pty/` | PTY management больше не нужен |
| `tui/src/agents/` | Agent subprocess registry |
| `tui/src/orchestrator/` | Multi-agent orchestrator |
| `tui/src/acp/` | Agent Compliance Protocol (PTY-based) |
| `engine/core/src/llm/` (chat) | LLM chat removed |
| `engine/core/src/memory/` | Session memory removed |
| Input routing (Ctrl+Shift+*) | Нет PTY → нет input splitting |
