# DATA-FLOWS.md — Потоки данных Complior v8

**Версия:** 8.0.0
**Дата:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено

---

## 1. Обзор

12 основных потоков данных в daemon-архитектуре Complior v8 (DF-01 through DF-12).

```
                                    ┌──────────┐
              MCP (stdio)           │ Coding   │
         ┌─────────────────────────►│ Agents   │
         │                          └──────────┘
         │
┌────────┴────────────────────────────────────┐
│  DAEMON (background process)                 │
│                                              │
│  ┌────────────┐  ┌──────────┐  ┌──────────┐│       ┌──────────┐
│  │File Watcher │  │TS Engine │  │MCP Server││       │  SaaS    │
│  │(chokidar)  │  │(Hono)    │  │(stdio)   ││       │(PROJECT) │
│  └─────┬──────┘  └────┬─────┘  └──────────┘│       └────▲─────┘
│        │ inotify       │ HTTP API            │            │
│        ▼               ▼                     │            │
│  ┌──────────┐  ┌───────────────┐             │   Passport upload
│  │ ФАЙЛОВАЯ │  │ .complior/    │             │   Telemetry
│  │ СИСТЕМА  │  │ (state/data)  │─────────────┼───────────┘
│  └──────────┘  └───────────────┘             │
└────────▲─────────────────────────────────────┘
         │ HTTP/SSE              ▲ HTTP
    ┌────┴───────┐          ┌───┴──────┐
    │ TUI        │          │ CLI      │
    │ (Rust)     │          │ commands │
    └────────────┘          └──────────┘
```

---

## 2. Потоки

### DF-01: Запуск Daemon

```
Пользователь → `complior` или `complior daemon --watch`
  │
  ├─ 1.  Daemon process запускается
  ├─ 2.  TS Engine загружается (composition-root.ts → DI wiring)
  ├─ 3.  File watcher инициализируется (chokidar, наблюдает project root)
  ├─ 4.  MCP Server стартует (stdio transport, 8 tools registered)
  ├─ 5.  HTTP server запускается (Hono, динамический порт)
  ├─ 6.  Daemon пишет PID + port в .complior/daemon.pid
  ├─ 7.  Загружает state: .complior/config.yaml, agents/*.json, scans/latest.json
  ├─ 8.  Initial scan → score → сохраняет в .complior/scans/latest.json
  └─ 9.  Готов принимать соединения (TUI, CLI, MCP agents)

Данные:
  .complior/daemon.pid → {pid, port, started_at}
  .complior/config.yaml → compliance profile
  .complior/agents/*.json → loaded passports
  .complior/scans/latest.json → initial scan result
```

### DF-02: TUI Подключение

```
Пользователь → `complior` (с TUI) или `complior tui` (подключиться к daemon)
  │
  ├─ 1. TUI читает .complior/daemon.pid → получает port
  ├─ 2. TUI → GET /health → 200 OK (daemon работает)
  ├─ 3. TUI → GET /status → {score, findings, profile, agents}
  ├─ 3a. TUI: load_api_key() → читает ~/.config/complior/credentials
  ├─ 3b. TUI: create_data_provider() →
  │        OFFLINE_MODE=1 → MockDataProvider
  │        api_key present → EngineDataProvider::connect() (PROJECT API, 5s timeout)
  │        no key / timeout → MockDataProvider (12 demo findings)
  ├─ 4. TUI подписывается на SSE stream (score_update, drift, passport_updated)
  ├─ 5. TUI рендерит Dashboard (Score + Deadlines + Activity + Systems)
  └─ 6. Statusbar: ● Connected (green) / ○ Disconnected (grey)

Данные:
  .complior/daemon.pid → port
  ~/.config/complior/credentials → COMPLIOR_API_KEY
  ~/.config/complior/tui.toml → theme, layout, keybindings
  SSE stream → real-time updates
```

### DF-03: Real-time Compliance Gate

```
Любой инструмент (агент, IDE, вручную) изменяет файл
  │
  ├─ 1. File watcher (chokidar/inotify) детектирует изменение
  ├─ 2. Engine: инкрементальный скан (только изменённые файлы, кэш AST)
  ├─ 3. Engine: пересчёт score (deterministic, <200ms)
  ├─ 4. Engine: drift detection (сравнение с предыдущим scan)
  ├─ 5. Engine → SSE: {event: "score_update", score, delta, findings[]}
  ├─ 6. Engine → SSE: {event: "scan.drift", severity, changes[]} (если drift)
  ├─ 7. TUI обновляет: Score gauge, Findings list, Activity Log
  ├─ 8. Если delta < 0: Toast notification "Score dropped: 72→69 (-3)"
  └─ 9. Engine обновляет .complior/scans/latest.json

Данные:
  Файл → AST → checks[] → score → SSE
  Кэш: Map<filePath, {hash, ast, lastChecks}>
  SSE event: {score, delta, checks[], findings[], changedFile}
  Drift: {severity: none|minor|major|critical, changes[]}
```

### DF-04: Agent через MCP

```
Coding agent (Claude Code, Cursor, etc.) подключает Complior MCP
  │
  ├─ 1. Agent читает MCP config → запускает Complior MCP Server (stdio)
  ├─ 2. MCP: initialize → capabilities exchange
  ├─ 3. MCP: tools/list → 8 compliance tools
  ├─ 4. Agent вызывает tool:
  │     ├─ complior_scan → Engine API → scan result (score + findings)
  │     ├─ complior_fix → Engine API → diff applied → rescan
  │     ├─ complior_score → Engine API → current score
  │     ├─ complior_explain → Engine API → article explanation + code advice
  │     ├─ complior_passport → Engine API → get/update passport
  │     ├─ complior_validate → Engine API → completeness check
  │     ├─ complior_deadline → Engine API → deadlines + critical path
  │     └─ complior_suggest → Engine API → recommended next action
  └─ 5. Agent использует результат для принятия решений

Данные:
  MCP transport: stdio (JSON-RPC 2.0)
  Config: ~/.config/complior/mcp.json
  Tool results: structured JSON
```

### DF-05: CLI Standalone Scan

```
CI/CD или разработчик → `complior scan --ci --threshold 80 --json`
  │
  ├─ 1. CLI проверяет: daemon running? → если да, HTTP call; если нет, inline engine
  ├─ 2. Engine запускается inline (без daemon, без watcher, без MCP)
  ├─ 3. Engine: full scan (5 layers) → score
  ├─ 4. Output:
  │     ├─ --json → JSON stdout
  │     ├─ --sarif → SARIF файл (GitHub Code Scanning)
  │     ├─ --ci → exit 0 (pass) / exit 1 (fail)
  │     └─ --threshold N → fail если score < N
  ├─ 5. Процесс завершается (exit code)
  └─ 6. GitHub Action: comment на PR с findings + score + badge

Данные:
  Input: project directory
  Output: JSON | SARIF | exit code
  GH Action: PR comment via GitHub API
```

### DF-06: Passport Generation (Mode 1 — Auto)

```
Разработчик → `complior agent:init`
  │
  ├─ 1. Engine: AST discovery — сканирует проект на наличие AI frameworks
  │     ├─ LangChain (agent configs, tools, chains)
  │     ├─ CrewAI (crew definitions, tasks)
  │     ├─ Anthropic SDK (client, messages, tools)
  │     ├─ OpenAI SDK (chat, function calling)
  │     ├─ Vercel AI SDK (generateText, streamText, tools)
  │     └─ AutoGen, custom heuristics
  ├─ 2. Для каждого обнаруженного agent:
  │     ├─ Detect: framework, model, permissions, tools, human gates
  │     ├─ Auto-rate: Autonomy Level L1-L5
  │     ├─ Auto-fill: 85-95% of 36 passport fields
  │     └─ Confidence score: 0.7-0.95
  ├─ 3. Interactive wizard (CLI) для оставшихся полей:
  │     ├─ Owner (team, contact, responsible_person)
  │     ├─ Disclosure text
  │     ├─ Review frequency
  │     └─ Industry context
  ├─ 4. Engine: generate agent-manifest.json
  ├─ 5. Engine: Ed25519 sign (keypair from ~/.config/complior/keys/)
  ├─ 6. Engine: save to .complior/agents/{agent-id}-manifest.json
  └─ 7. Engine: validate → completeness score (e.g., "87% — 3 fields missing")

Данные:
  Input: project source code (AST analysis)
  Discovery: framework configs, SDK imports, tool definitions, human gate patterns
  Output: .complior/agents/*-manifest.json (signed, 36 fields)
  Keypair: ~/.config/complior/keys/complior.{pub,key}
```

### DF-07: Passport Validation

```
Разработчик → `complior agent:validate --verbose`
  │
  ├─ 1. Engine: загружает все passports из .complior/agents/*.json
  ├─ 2. Для каждого passport:
  │     ├─ Проверка 36 полей (required vs optional)
  │     ├─ Per-category completeness:
  │     │   ├─ Identity (5/5) ✅
  │     │   ├─ Ownership (3/3) ✅
  │     │   ├─ Autonomy (2/2) ✅
  │     │   ├─ Constraints (2/4) ⚠️ — budget OK, gates OK, prohibited missing
  │     │   └─ Compliance (4/8) ❌ — GAPS: fria, eu_database, worker_notification
  │     ├─ Completeness %: (filled / required) × 100
  │     ├─ Signature verification (ed25519)
  │     └─ Obligation gap analysis (which OBL-xxx not covered)
  ├─ 3. Output: completeness report + gap list + suggested actions
  └─ 4. --verbose: per-field detail + per-obligation mapping

Данные:
  Input: .complior/agents/*.json
  Output: completeness %, gaps[], suggested actions[]
  Verification: ed25519 signature check
```

### DF-08: Auto-Fix

```
Пользователь нажимает [Fix] в TUI или `complior fix`
  │
  ├─ 1. TUI/CLI → Engine: POST /fix/preview {checkId, filePath}
  ├─ 2. Engine: определяет тип нарушения → шаблон фикса
  │     ├─ Простой: template-based (disclosure, metadata, logging, privacy-policy)
  │     └─ Сложный: AI-based (генерирует промпт + контекст)
  ├─ 3. Engine → TUI/CLI: {diff, explanation, article, penalty, predicted_score}
  ├─ 4. TUI: показывает Diff Preview + predicted score
  ├─ 5. Пользователь подтверждает → Engine: POST /fix/apply
  ├─ 6. Engine: применяет diff к файлу
  ├─ 7. File watcher → rescan → score update (DF-03)
  └─ 8. Evidence: fix event → signed → added to evidence chain

Данные:
  Fix request: {checkId, filePath}
  Fix preview: {diff, explanation, article: {id, title, penalty}, predicted_score}
  Fix apply: diff → file write → rescan → evidence
```

### DF-09: Report Generation

```
Пользователь: `complior report:audit` или TUI Report page
  │
  ├─ 1. Engine: собирает данные:
  │     ├─ Scan results (latest + history)
  │     ├─ Agent Passports (all from .complior/agents/)
  │     ├─ Evidence chain (.complior/evidence/)
  │     ├─ Compliance profile (.complior/config.yaml)
  │     └─ FRIA status (if generated)
  ├─ 2. Engine: генерация по формату:
  │     ├─ COMPLIANCE.md → Markdown файл в репо
  │     ├─ Audit PDF → @react-pdf/renderer
  │     ├─ SARIF → для GitHub Code Scanning
  │     ├─ JSON → structured data
  │     └─ Audit Package ZIP → all passports + FRIA + evidence + summary
  ├─ 3. Engine → файл записан (.complior/reports/ или project root)
  └─ 4. Engine → TUI/CLI: {filePath, type, success}

Данные:
  Input: scan results, passports, evidence, profile
  Output: MD | PDF | SARIF | JSON | ZIP
  Audit Package: executive summary + passports + FRIA + evidence + training docs
```

### DF-10: FRIA Generation

```
Пользователь: `complior fria:generate` или SaaS FRIA wizard
  │
  ├─ 1. Engine: загружает passport(s) для high-risk AI-системы
  ├─ 2. Engine: FRIA template (Art. 27 requirements):
  │     ├─ Pre-fill 80% из passport:
  │     │   ├─ AI system identification (from passport.name, agent_id)
  │     │   ├─ Risk classification (from passport.compliance.risk_class)
  │     │   ├─ Permissions & data access (from passport.permissions)
  │     │   ├─ Autonomy level (from passport.autonomy_level)
  │     │   ├─ Human oversight measures (from passport.constraints)
  │     │   └─ Logging configuration (from passport.logging)
  │     └─ Manual completion needed:
  │         ├─ Specific impact assessment
  │         ├─ Mitigation measures (organization-specific)
  │         └─ Review and approval
  ├─ 3. Output: FRIA document (MD/PDF)
  ├─ 4. Engine: update passport → fria_completed: true, fria_date: ...
  └─ 5. Evidence: FRIA generation event → evidence chain

Данные:
  Input: passport(s), FRIA template (Art. 27)
  Pre-filled: 80% from passport fields
  Output: FRIA document → .complior/reports/fria-{agent-id}.md
  Passport update: fria_completed, fria_date
```

### DF-11: Evidence Chain

```
Каждое compliance-значимое событие → evidence chain
  │
  ├─ 1. Событие:
  │     ├─ Scan completed → {scan_id, score, findings_count, timestamp}
  │     ├─ Fix applied → {fix_id, check_id, file_path, timestamp}
  │     ├─ Passport created/updated → {passport_id, version, fields_changed}
  │     ├─ FRIA generated → {fria_id, agent_id, timestamp}
  │     └─ Report generated → {report_id, type, timestamp}
  ├─ 2. Engine: Ed25519 sign event
  ├─ 3. Engine: compute hash(previous_hash + event_hash) → chain
  ├─ 4. Engine: append to .complior/evidence/chain.json
  └─ 5. Export: `complior cert:evidence` → {chain[], signatures[], audit_package}

Данные:
  Chain: append-only ordered list of signed events
  Hash: SHA-256(previous_hash + event_hash)
  Signature: Ed25519 per-event
  Storage: .complior/evidence/chain.json
  Export: JSON or ZIP for auditor
```

### DF-12: Passport Export

```
Разработчик: `complior agent:export --format a2a|aiuc-1|nist`
  │
  ├─ 1. Engine: загружает passport из .complior/agents/
  ├─ 2. Engine: трансформирует в целевой формат:
  │     ├─ A2A (Google Agent-to-Agent):
  │     │   └─ agent-manifest.json → Agent Card JSON
  │     ├─ AIUC-1 (EU AI Profile):
  │     │   └─ agent-manifest.json → AIUC-1 compliance profile
  │     └─ NIST AI RMF:
  │         └─ agent-manifest.json → NIST AI Profile
  ├─ 3. Output: exported file
  └─ 4. Для SaaS sync: POST passport → SaaS API → F39 Agent Control Plane

Данные:
  Input: .complior/agents/*-manifest.json
  Output formats: A2A Agent Card, AIUC-1, NIST AI RMF
  SaaS sync: POST /v1/agents → F39 registry
```

### DF-13: Community Evidence Aggregation (SaaS, F49)

```
Passport Mode 3 (SaaS) содержит "Provider Documentation Received"
  │
  ├─ 1. Deployer отмечает: "DPA received from Anthropic ✅" (бинарный факт)
  ├─ 2. SaaS: nightly batch job → агрегация per tool, per document type:
  │     ├─ tool_id + document_type + deployer_count + received_count
  │     ├─ k-anonymity: показывать только при N≥10 deployer'ов
  │     └─ Opt-out: deployer может исключить свои данные
  ├─ 3. Registry Tool Card: отображает community evidence рядом с Grade
  │     ├─ "89% received Instructions for Use"
  │     ├─ "73% received DPA"
  │     └─ "0% received FRIA input data"
  ├─ 4. Passport wizard (Mode 3): подсказки на основе community evidence
  │     └─ "Request Instructions for Use from Anthropic [template email →]"
  └─ 5. Community evidence НЕ влияет на Grade (Grade = public scan + vendor upload)

Данные:
  Input: binary received/not-received flags from Passport Mode 3
  Aggregation: nightly batch, anonymous (no deployer identity stored)
  Privacy: k-anonymity (N≥10), opt-out available, GDPR compliant
  Output: community_evidence table (tool_id, document_type, counts)
  Display threshold: N≥10 (generic), N≥50 (percentages), N≥100 (confidence badge)
```

---

## 3. Форматы данных

### Scan Result

```typescript
interface ScanResult {
  score: number;           // 0-100
  level: 'RED' | 'AMBER' | 'YELLOW' | 'GREEN';
  checks: Check[];
  findings: Finding[];
  profile: ComplianceProfile;
  filesScanned: number;
  duration: number;        // ms
  timestamp: string;       // ISO 8601
  regulationVersion: string; // '1.0.0'
  drift?: DriftResult;     // comparison with previous scan
}
```

### Agent Passport (summary)

```typescript
interface AgentPassport {
  agent_id: string;
  name: string;
  version: string;
  type: 'autonomous' | 'assistive' | 'hybrid';
  autonomy_level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  compliance: {
    eu_ai_act: { risk_class: string; obligations_met: string[]; obligations_pending: string[] };
    complior_score: number;
    last_scan: string;
  };
  signature: { algorithm: 'ed25519'; hash: string; signed_at: string };
  source: { mode: 'auto' | 'semi-auto' | 'manual'; confidence: number };
}
```

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

---

**Обновлено:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
