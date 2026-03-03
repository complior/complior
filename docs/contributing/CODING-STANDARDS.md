# Complior — Стандарты кодирования (общие)

**Версия:** 3.0.0
**Дата:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено
**Зависимости:** ARCHITECTURE.md, DATABASE.md

**Специализированные стандарты:**
- [CODING-STANDARDS-TS.md](CODING-STANDARDS-TS.md) — TypeScript Engine
- [CODING-STANDARDS-RUST.md](CODING-STANDARDS-RUST.md) — Rust TUI

---

## 1. Общие принципы

- **Детерминистичное ядро, AI-интерфейс** — LLM НИКОГДА не принимает решения о комплаенсе. Все проверки — AST + правила.
- **CQS** — команды возвращают void/id, запросы возвращают данные.
- **Слабая связанность, высокая связность** — модули движка тестируются независимо.
- **Ошибки вслух** — никакого молчаливого проглатывания ошибок. Логировать + пробрасывать.
- **Без преждевременных абстракций** — 3 похожие строки > вспомогательная функция, которую никто не читает.
- **Single responsibility** — одна функция = одна задача, файлы < 300 строк.
- **Consistent returns** — функция всегда возвращает одну и ту же структуру.
- **Закон Деметры** — «Не разговаривай с незнакомцами». Модуль использует только прямые зависимости.

---

## 2. HTTP/SSE коммуникация (IPC)

TUI (Rust) ↔ Daemon Engine (TypeScript) общаются по HTTP/SSE через localhost.

### Эндпоинты

| Метод | Путь | Назначение | Ответ |
|-------|------|-----------|-------|
| GET | `/health` | Daemon health check | JSON: status + uptime |
| POST | `/scan` | Запуск проверки комплаенса | JSON: score + findings |
| GET | `/status` | Текущий score + profile | JSON: ready + score + profile |
| POST | `/fix/preview` | Предпросмотр diff фикса | JSON: diff + article |
| POST | `/fix/apply` | Применить фикс к файлу | JSON: result + new score |
| POST | `/classify` | Классификация рисков AI | JSON: risk level + obligations |
| POST | `/agent/init` | Обнаружить AI-системы + сгенерировать passports | JSON: agents[] |
| GET | `/agent/list` | Список всех Agent Passports | JSON: passports[] |
| GET | `/agent/:id` | Passport по ID | JSON: passport |
| POST | `/agent/validate` | Проверить completeness | JSON: completeness + gaps[] |
| GET | `/passport/export` | Экспорт passport (A2A, AIUC-1, NIST) | JSON: exported |
| GET | `/obligations` | 108 obligations + coverage status | JSON: obligations[] |
| POST | `/report` | Генерация отчёта | JSON: filePath + type |
| GET | `/sbom` | SBOM (CycloneDX 1.5) | JSON: sbom |
| GET | `/deadlines` | Дедлайны регуляций | JSON: deadlines[] |
| POST | `/file` | Файловые операции | JSON: result |

### SSE Events

```
event: score_update
data: {"score":72,"delta":-3,"changedFile":"src/auth.ts","checks":[...]}

event: scan.drift
data: {"severity":"major","changes":[{"check":"logging","from":"pass","to":"fail"}]}

event: fix_applied
data: {"checkId":"disclosure","filePath":"src/app/page.tsx","newScore":75}

event: passport_updated
data: {"agent_id":"xxx","completeness":87,"fields_changed":["disclosure"]}
```

### Формат ответа об ошибке

```json
{
  "error": "SCAN_ERROR",
  "message": "Не удалось распарсить файл: app/chat/page.tsx",
  "details": { "line": 42, "column": 8 }
}
```

---

## 3. Daemon Conventions

### Lifecycle
- Daemon записывает `{pid, port, started_at}` в `.complior/daemon.pid` при старте
- Daemon удаляет `.complior/daemon.pid` при корректном завершении (SIGTERM handler)
- TUI/CLI читают `.complior/daemon.pid` для подключения
- Если PID из файла мёртв — перезапуск (stale PID cleanup)

### State Management
- Состояние daemon'а (scan cache, passport cache) — in-memory
- Персистентное хранение — `.complior/` directory (JSON files)
- File watcher events → queue → debounce (200ms) → process
- SSE connections — keep-alive, reconnect-aware

### MCP Tool Naming
- Все tools имеют префикс `complior_` (underscore, не dash)
- Naming: `complior_{verb}` — scan, fix, score, explain, passport, validate, deadline, suggest
- Tool descriptions — на английском, содержат EU AI Act article references

---

## 4. Agent Passport Conventions

### Manifest Format
- Файл: `.complior/agents/{agent-name}-manifest.json`
- JSON Schema: `https://complior.ai/schemas/agent-manifest/v1.json`
- 36 полей, категории: identity, ownership, autonomy, permissions, constraints, compliance, disclosure, logging, lifecycle, interop, signature, source
- Все timestamps — ISO 8601 (UTC)
- Все IDs — UUID v4

### Validation Rules
- `agent_id` — required, UUID
- `name` — required, kebab-case
- `autonomy_level` — enum L1-L5
- `type` — enum: autonomous | assistive | hybrid
- `signature` — required for Mode 1 (auto), optional for Mode 3 (manual)
- `source.mode` — enum: auto | semi-auto | manual
- `source.confidence` — float 0.0-1.0

### Signing
- Algorithm: Ed25519
- Payload: `agent_id + permissions_hash + constraints_hash + compliance_hash + timestamp`
- Keypair location: `~/.config/complior/keys/complior.{pub,key}`
- Key permissions: 600 (owner read/write only)

---

## 5. Open-Source Boundary

**Принцип:** Open-source = всё что deployer запускает локально + кодификация публичного закона. Proprietary = данные, агрегация, SaaS workflows.

**В open-source коде:**
- RuleEngine classification logic (Art.5, Annex III, Art.50) — public law = open
- Passport Schema, validation, generation Mode 1 — open standard
- Scanner checks (all 5 layers) — transparency creates trust
- SDK (compliorAgent()) — runs in deployer's code

**НЕ в open-source коде:**
- `calculatePublicDocGrade()` — scoring formula is competitive advantage
- `aggregateCommunityEvidence()` — algorithm + data = network effect moat
- AI Registry dataset — proprietary
- Vendor Self-Service Portal, FRIA Generator (SaaS), Audit Package Generator — revenue features

Подробная таблица: `docs/UNIFIED-ARCHITECTURE.md` Section 9.

---

## 6. Безопасность

### OWASP Top 10

| Угроза | Защита |
|--------|--------|
| **Injection (SQL)** | Parameterized queries ONLY (better-sqlite3). Нет конкатенации строк в SQL. |
| **Broken Auth** | WorkOS AuthKit (device auth flow). Сессии управляются WorkOS. |
| **Sensitive Data** | API-ключи только в env. `~/.config/complior/credentials` с 600 permissions. Ed25519 keys с 600. |
| **XXE** | JSON only (нет XML-парсинга) |
| **Broken Access Control** | IPC только localhost. MCP только stdio. runCommand — whitelist. |
| **Security Misconfiguration** | Валидация конфига при старте (Zod). Нет debug в production. |
| **XSS** | Нет HTML-рендеринга (TUI). Terminal escape sequences санитизированы. |
| **Insecure Deserialization** | Zod validation на всех входных данных |
| **Known Vulnerabilities** | `bun audit` / `npm audit` в CI. `cargo audit` для Rust. |
| **Insufficient Logging** | Structured logging (pino). Evidence chain для scan/fix/passport. |

### Правила безопасности

- **Никаких API-ключей в коде** — только переменные окружения, валидация при запуске.
- **runCommand** — выполнение в песочнице (без `rm -rf`, без `sudo`, whitelist безопасных команд).
- **Валидация входных данных** — Zod на каждой внешней границе (HTTP, MCP, конфиг-файлы).
- **Никакого eval()** — никогда.
- **Зависимости** — ревью перед добавлением. Предпочитать встроенное над сторонним.
- **IPC** — только localhost, без внешнего сетевого доступа.
- **Ed25519 keys** — generated at first use, permission 600, never committed to git.

### runCommand — whitelist

```typescript
const ALLOWED_COMMANDS = new Set([
  'bun', 'npm', 'npx', 'node', 'tsc', 'eslint', 'prettier',
  'git', 'cargo', 'rustc', 'rustfmt', 'clippy',
  'ls', 'cat', 'head', 'tail', 'wc', 'find', 'grep',
]);
// ЗАПРЕЩЕНЫ: rm -rf, sudo, curl (произвольные URL), wget, chmod 777, eval
```

---

## 7. Git-конвенции

### Conventional Commits (ОБЯЗАТЕЛЬНО)

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding/fixing tests |
| `docs` | Documentation |
| `refactor` | Code change without feature/bug |
| `chore` | Build, CI, tooling |
| `style` | Formatting (no logic change) |
| `perf` | Performance improvement |

**Scopes:** `scanner`, `fixer`, `tui`, `engine`, `daemon`, `mcp`, `passport`, `config`, `ci`, `sdk`

```
feat(passport): add Mode 1 auto-discovery for LangChain agents
fix(tui): fix score gauge rendering at 0%
feat(daemon): implement file watcher with 200ms debounce
refactor(engine): extract ManifestBuilder service
test(passport): add ed25519 signing verification tests
chore(ci): add cargo audit to pipeline
```

### Стратегия ветвления

```
main              ← только стабильные релизы
  └── develop     ← интеграционная ветка
       ├── feat/daemon-foundation
       ├── feat/agent-passport
       ├── fix/score-calculation
       └── refactor/remove-pty
```

### Процесс PR

```
Developer creates PR → develop
  ↓
Code review (architecture + security)
  ↓
cargo test + vitest pass
  ↓
Merge to develop
  ↓ (release gate)
develop → main (PO approves)
```

---

## 8. Code Review Checklist

### Architecture + Quality

- [ ] Следует архитектуре слоёв (нет нарушений import rules)
- [ ] Core logic чистая (нет I/O, нет LLM-вызовов в scanner checks)
- [ ] Input validated with Zod (все внешние границы)
- [ ] Error handling через AppError (TS) / thiserror (Rust)
- [ ] Нет `any`, нет type assertions (`as`), нет `@ts-ignore` (TS)
- [ ] Нет `unwrap()` в продакшн-коде (Rust)
- [ ] Функции маленькие (< 50 lines), single responsibility
- [ ] Consistent return types
- [ ] Async: proper error handling, нет swallowed errors
- [ ] Тесты покрывают happy path + error cases
- [ ] Conventional Commit format
- [ ] Passport operations — ed25519 signed, validated
- [ ] Daemon lifecycle — proper startup/shutdown, PID file management

### Security

- [ ] Нет SQL injection (parameterized queries only)
- [ ] IPC только localhost, MCP только stdio
- [ ] API ключи не в коде (env variables / credentials file)
- [ ] runCommand — только whitelisted команды
- [ ] Нет `eval()`, `Function()`, `new Function()`
- [ ] Input length limits (DoS prevention)
- [ ] Zod validation на каждой внешней границе
- [ ] Нет PII в логах
- [ ] Terminal escape sequences санитизированы (TUI)
- [ ] Ed25519 keys — proper permissions (600)
- [ ] `cargo audit` + `bun audit` — нет known vulnerabilities

---

## 9. CI

```yaml
# .github/workflows/ci.yml
jobs:
  lint-ts:
    steps:
      - bun run lint          # ESLint
      - bun run type-check    # TypeScript strict
      - bun run test          # Vitest
      - bun audit             # Known vulnerabilities

  lint-rust:
    steps:
      - cargo fmt -- --check  # Rustfmt
      - cargo clippy -- -D warnings  # Clippy strict
      - cargo test            # Cargo test + insta
      - cargo audit           # Known vulnerabilities
```

---

**Последнее обновление:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
