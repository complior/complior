# DATA-FLOWS.md — Потоки данных Complior v6

**Версия:** 6.0.0
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Утверждено

---

## 1. Обзор

10 основных потоков данных в open-source части Complior v6.

```
┌──────────┐     HTTP/SSE     ┌──────────────┐     Registry API     ┌──────────┐
│ RUST TUI │ ◄──────────────► │  TS ENGINE   │ ◄──────────────────► │  SaaS    │
│          │                  │              │                      │  (опц.)  │
└────┬─────┘                  └──────────────┘                      └──────────┘
     │ PTY                         │ inotify
     ▼                             ▼
┌──────────┐              ┌──────────────┐
│  GUEST   │              │  ФАЙЛОВАЯ    │
│  AGENT   │              │  СИСТЕМА     │
└──────────┘              └──────────────┘
```

---

## 2. Потоки

### DF-01: Запуск системы

```
Пользователь → `complior` или `complior --agent claude-code`
  │
  ├─ 1. Rust TUI запускается, парсит config.toml
  ├─ 2. TUI запускает TS Engine как child process (port авто)
  ├─ 3. TUI ожидает health check: GET /health → 200
  ├─ 4. TUI запускает Guest Agent как PTY subprocess
  ├─ 5. TUI отправляет POST /scan (initial scan)
  ├─ 6. Engine возвращает: {score, checks[], findings[], profile}
  ├─ 7. TUI рендерит: Agent Panel + Compliance Panel + Dashboard
  └─ 8. File watcher (Engine) начинает наблюдение

Данные:
  config.toml → TUI config
  .complior/config.yaml → compliance profile
  .complior/memory.json → project memory (Level 1)
```

### DF-02: Real-time Compliance Gate

```
Guest Agent (или пользователь) изменяет файл
  │
  ├─ 1. File watcher (chokidar/inotify) детектирует изменение
  ├─ 2. Engine: инкрементальный скан (только изменённые файлы, кэш AST)
  ├─ 3. Engine: пересчёт score (deterministic, <200мс)
  ├─ 4. Engine → TUI через SSE: {event: "score_update", score, delta, findings[]}
  ├─ 5. TUI обновляет: Score gauge, Checks list, Activity Log
  ├─ 6. Если delta < 0: Toast notification "Score dropped: 72→69 (-3)"
  └─ 7. Engine обновляет .complior/memory.json (проектная память)

Данные:
  Файл → AST → checks[] → score
  Кэш: Map<filePath, {hash, ast, lastChecks}>
  SSE event: {score, delta, checks[], findings[], changedFile}
```

### DF-03: Auto-Fix через вложенного агента

```
Пользователь нажимает [Fix] или вводит /fix
  │
  ├─ 1. TUI → Engine: POST /fix/preview {checkId, filePath}
  ├─ 2. Engine: определяет тип нарушения → шаблон фикса
  │     ├─ Простой: template-based (disclosure, metadata, logging)
  │     └─ Сложный: AI-фиксер (генерирует промпт + контекст)
  ├─ 3. Engine → TUI: {diff, explanation, article, penalty}
  ├─ 4. TUI: показывает Diff Preview пользователю
  ├─ 5. Пользователь подтверждает → TUI → Engine: POST /fix/apply
  ├─ 6. Engine: применяет diff к файлу
  ├─ 7. Если AI-фиксер: Engine формирует промпт → передаёт Guest Agent
  ├─ 8. File watcher → rescan → score update (DF-02)
  └─ 9. Опционально: git commit "fix: Art.50.1 disclosure — via Complior"

Данные:
  Fix request: {checkId, filePath, fixType}
  Fix preview: {diff: string, explanation, article: {id, title, penalty}}
  Fix apply: {diff} → file write → rescan
```

### DF-04: LLM Chat (Compliance Agent)

```
Пользователь вводит вопрос в compliance chat
  │
  ├─ 1. TUI → Engine: POST /chat {messages[], tools[]}
  ├─ 2. Engine: multi-model routing (cheap для Q&A, мощная для отчётов)
  ├─ 3. Engine: добавляет compliance context (score, findings, profile)
  ├─ 4. Engine → LLM API (Anthropic/OpenAI/Mistral/Ollama)
  ├─ 5. LLM: может вызывать tools (scan, fix, explain, report, ...)
  ├─ 6. Engine → TUI через SSE: streaming tokens
  ├─ 7. TUI рендерит: Markdown в chat panel
  └─ 8. Engine: legal disclaimer в каждый output

Данные:
  Chat request: {messages[], model?: string, tools[]}
  SSE stream: {event: "token", data: string} | {event: "tool_call", ...}
  Context injection: {score, findings[], profile, jurisdiction[]}
  Cost: tokens → $, отображается в statusbar
```

### DF-05: Отчёты и документация

```
Пользователь: /report, /fria, /docs, /badge
  │
  ├─ 1. TUI → Engine: POST /report {type, format}
  ├─ 2. Engine: собирает данные (scan results, profile, findings)
  ├─ 3. Engine: генерация по шаблону:
  │     ├─ Dev Report → terminal formatted output
  │     ├─ COMPLIANCE.md → Markdown файл в репо
  │     ├─ Audit PDF → @react-pdf/renderer (watermark для Free)
  │     ├─ FRIA → 80% пре-заполнено из профиля
  │     ├─ Tech Docs → Art.11 documentation
  │     └─ Badge SVG → static compliance badge
  ├─ 4. Engine → файл записан в проект (или /tmp для PDF)
  └─ 5. Engine → TUI: {filePath, type, success}

Данные:
  Report request: {type: "compliance_md" | "audit_pdf" | "fria" | ..., format}
  Report output: файл в проекте или /tmp
  Badge: SVG с score, status, юрисдикцией
```

### DF-06: MCP Server (GUI-агенты)

```
Cursor/Windsurf/Claude Code подключают Complior как MCP server
  │
  ├─ 1. MCP client → Complior MCP: stdio connection
  ├─ 2. MCP: list_tools → 7+ compliance tools
  │     ├─ complior_scan — скан проекта
  │     ├─ complior_fix — авто-фикс нарушения
  │     ├─ complior_explain — объяснение статьи
  │     ├─ complior_report — генерация отчёта
  │     ├─ complior_score — текущий score
  │     ├─ complior_classify — классификация AI-системы
  │     └─ complior_badge — генерация badge
  ├─ 3. MCP: call_tool → Engine API (тот же backend)
  └─ 4. Engine → MCP → GUI agent: результат

Данные:
  MCP stdio: JSON-RPC 2.0
  Tool calls → HTTP requests к Engine API
  Результат: structured data (JSON)
```

### DF-07: CI/CD (Headless mode)

```
GitHub Action / pre-commit hook / npm pre-publish
  │
  ├─ 1. complior scan --ci --threshold 80 --json
  ├─ 2. Engine запускается в headless mode (без TUI, без agent)
  ├─ 3. Engine: full scan → score
  ├─ 4. Output:
  │     ├─ --json → JSON stdout
  │     ├─ --sarif → SARIF файл (GitHub Code Scanning)
  │     ├─ --ci → exit 0 (pass) / exit 1 (fail)
  │     └─ --threshold N → fail если score < N
  └─ 5. GitHub Action: comment на PR с findings + score + badge

Данные:
  Input: project directory
  Output: JSON | SARIF | exit code
  GH Action: PR comment via GitHub API
```

### DF-08: DataProvider (Engine ↔ SaaS)

```
Engine загружает справочные данные (regulation DB, AI Registry)
  │
  ├─ OFFLINE MODE (Free, default):
  │   ├─ 1. Engine читает bundled JSON: data/regulations/, data/registry/
  │   ├─ 2. Бандл ~530KB: EU AI Act + 200 top AI tools
  │   └─ 3. Обновление: `complior update` → npm/GitHub Release
  │
  ├─ ONLINE MODE (Paid, опционально):
  │   ├─ 1. Engine → SaaS: GET /v1/registry/tools?search=openai
  │   ├─ 2. SaaS → Engine: {tools[], total, etag}
  │   ├─ 3. Engine кеширует: ETag + If-None-Match (304 Not Modified)
  │   ├─ 4. Полный реестр: 2,477+ tools с evidence + assessments
  │   └─ 5. API Key: из .complior/config.yaml или env COMPLIOR_API_KEY
  │
  └─ HYBRID MODE (автоматический):
      ├─ 1. Если API key есть → online обогащение
      ├─ 2. Если нет сети → offline fallback
      └─ 3. Кеш: .complior/cache/ (TTL 24h)

Данные:
  Offline бандл: data/regulations/eu-ai-act/*.json, data/registry/tools.json
  API: REST, JSON, API Key auth, ETag caching
  Cache: .complior/cache/{tools,regulations}.json
```

### DF-09: Agent Discovery + Governance

```
Complior обнаруживает AI-агентов в проекте
  │
  ├─ 1. Engine: scan конфигов (crewai.yaml, autogen, langgraph, n8n)
  ├─ 2. Engine: scan кода (agent definitions, system prompts)
  ├─ 3. Engine: scan инфраструктуры (Dockerfile, k8s, terraform)
  ├─ 4. Для каждого agent:
  │     ├─ Compliance Score: disclosure + logging + oversight + scope + docs + data
  │     ├─ Risk Level: auto-classified (Annex III)
  │     └─ Manifest: agent-compliance.yaml (generated или scanned)
  ├─ 5. Agent Registry: хранение в .complior/agents/
  ├─ 6. Audit Trail: .complior/audit.db (SQLite WAL, immutable)
  └─ 7. TUI: /agents list, /agents score, /agents kill

Данные:
  Input: конфиги, код, инфраструктурные файлы
  Agent record: {name, type, model, risk, score, owner, manifest}
  Registry: .complior/agents/*.yaml
  Audit: .complior/audit.db (SQLite)
```

### DF-10: Telemetry → SaaS (опционально, Paid)

```
TUI-инсталляция отправляет данные в SaaS Dashboard
  │
  ├─ 1. Engine: при скане → результат сохраняется локально
  ├─ 2. Если paid + opt-in → Engine: POST /v1/telemetry/scan
  │     {nodeId, projectHash, score, checksCount, agentCount, version}
  ├─ 3. SaaS: агрегирует → org-wide compliance score
  ├─ 4. SaaS: Dashboard показывает Cross-System Map
  └─ 5. Никакой PII: projectHash = SHA-256, нет имён файлов, нет кода

Данные:
  Telemetry: {nodeId, projectHash, score, checks, agents, timestamp}
  Privacy: SHA-256 hashing, no PII, opt-in only
  API: POST /v1/telemetry/scan, API Key auth
```

---

## 3. Форматы данных

### Scan Result

```typescript
interface ScanResult {
  score: number;           // 0-100
  level: 'RED' | 'AMBER' | 'YELLOW' | 'GREEN';
  checks: Check[];         // 19 checks
  findings: Finding[];     // нарушения
  profile: ComplianceProfile;
  filesScanned: number;
  duration: number;        // ms
  timestamp: string;       // ISO 8601
}
```

### Compliance Profile

```typescript
interface ComplianceProfile {
  jurisdiction: string[];  // ['eu-ai-act', 'colorado-sb205']
  riskLevel: 'HIGH' | 'LIMITED' | 'MINIMAL' | 'UNACCEPTABLE';
  role: 'DEPLOYER' | 'PROVIDER' | 'PROVIDER_LITE';
  industry: string;
  dataSensitivity: 'PERSONAL' | 'NON_PERSONAL' | 'SPECIAL_CATEGORY';
}
```

### SSE Events

```
event: score_update
data: {"score":72,"delta":-3,"changedFile":"src/auth.ts","checks":[...]}

event: token
data: {"content":"Art. 50.1 requires...","model":"claude-sonnet-4-5"}

event: fix_applied
data: {"checkId":"disclosure","filePath":"src/app/page.tsx","newScore":75}
```

---

**Обновлено:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
