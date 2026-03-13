# PRODUCT-VISION.md — Complior v8: Daemon-Оркестратор для AI Compliance

**Версия:** 8.0.0
**Дата:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Утверждено

---

## 1. Проблема

2 августа 2026 — enforcement EU AI Act для high-risk систем. **~5 месяцев.**

- 108 обязательств deployer'а (Art. 4, 5, 6, 9, 12, 14, 19, 21, 26, 27, 49, 50)
- 144 страницы регуляции, без единого инструмента для разработчиков
- Каждая организация использует 5-15 AI-систем (собственные + вендорские), и ни одна не зарегистрирована
- Compliance = ручной процесс юристов в Excel, оторванный от кода
- Штрафы: до €35M или 7% оборота (Art. 99)

**Разработчики пишут AI-код без compliance. DPO не знает какие AI-системы используются. Юристы проверяют compliance без кода.**

---

## 2. Решение: Complior v8

> **Complior = background compliance daemon для AI-систем.**
> Фоновый процесс наблюдает за файловой системой, сканирует compliance, предоставляет MCP tools для любого агента.
> TUI dashboard показывает статус. CLI даёт одноразовые команды.

### Было (v6): Wrapper-Оркестратор
```
Complior v6 = PTY host, запускающий coding agent внутри себя.
Проблемы: PTY rendering bugs, SPOF (crash = agent тоже), не работает с Cursor/VS Code.
```

### Стало (v8): Daemon-Оркестратор
```
Complior v8 = background daemon (file watcher + engine + MCP server + HTTP API)
            + TUI dashboard (подключается к daemon через HTTP/SSE)
            + CLI commands (standalone или через daemon)

Агенты работают НЕЗАВИСИМО — Complior не управляет их процессами.
Агенты подключаются через MCP (8 tools) или пользуются CLI.
```

### Три режима запуска
```bash
$ complior                     # daemon + TUI (по умолчанию)
$ complior daemon --watch      # headless daemon (CI/CD, server)
$ complior scan --ci           # standalone CLI (одноразовый скан)
```

---

## 3. Что изменилось v6 → v8

| Аспект | v6 (Wrapper) | v8 (Daemon) |
|--------|-------------|-------------|
| Модель | PTY subprocess хост | Background daemon + отдельный TUI |
| Агенты | Запускаются ВНУТРИ Complior | Работают НЕЗАВИСИМО, подключаются через MCP |
| Отказ | Crash Complior = crash агента | Daemon падает — агент продолжает работать |
| IDE | Только CLI-агенты | Любые: Cursor, VS Code, CLI, SaaS |
| Центр | Score + Findings | **Agent Passport** (identity card AI-системы) |
| Pipeline | Scan → Fix → Report | **7 шагов**: Discover → Classify → Scan → Fix → Document → Monitor → Certify |
| Обязательства | Неявно через checks | **108 obligations** явно привязаны к фичам |
| TUI | 8 views (с Agent/Orchestrator) | **9 pages** (с Passport/Obligations/Timeline/Chat) |

---

## 4. Ключевые ценности

### 4.1 Daemon — без SPOF
Background процесс, не привязанный к агенту. Daemon может работать headless (CI/CD, сервер). TUI подключается/отключается без потери состояния. Агент падает — daemon продолжает наблюдение.

### 4.2 Real-time Compliance Gate
Каждое изменение файла → фоновый ре-скан за 200мс → score update → SSE уведомление. Разработчик видит compliance impact в реальном времени — неважно какой инструмент изменил файл.

### 4.3 Agent Passport — центральная сущность
Каждая AI-система получает `agent-manifest.json` — 36 полей, формализующих identity, permissions, constraints, compliance status. Три режима создания:
- **Mode 1 (Auto)**: CLI анализирует AST → auto-fill 85-95% полей
- **Mode 2 (Semi-Auto)**: MCP Compliance Proxy наблюдает runtime → 40-60%
- **Mode 3 (Manual)**: SaaS wizard + AI Registry pre-fill → 100%

### 4.4 7-Step Pipeline
```
DISCOVER → CLASSIFY → SCAN → FIX → DOCUMENT → MONITOR → CERTIFY
```
Каждое из 108 обязательств проходит через этот pipeline. Agent Passport — центральный data layer, в который стекаются результаты каждого шага.

### 4.5 Runtime SDK
`compliorAgent()` — proxy-based middleware для LLM API calls. Загружает passport, enforces permissions + budget + constraints в runtime. 5 provider adapters (OpenAI, Anthropic, Google, Vercel AI, custom).

### 4.6 Developer-First + Free
Free daemon + TUI = полный функционал для разработчика. Монетизация через SaaS Dashboard для CTO/DPO.

---

## 5. TUI — 9 страниц

| Hotkey | Страница | Назначение |
|--------|---------|-----------|
| `D` | **Dashboard** | Score, deadlines, AI systems, compliance status, activity log, trend sparkline |
| `S` | **Scan** | Layer status (L1-5), findings by severity, per-OBL detail panel, explanation (x) |
| `F` | **Fix** | Fixable items list + diff preview, batch apply, predicted score |
| `P` | **Passport** | Все AI-системы (CLI + SaaS), L-level, Completeness %, per-obligation checklist |
| `O` | **Obligations** | 108 obligations, filter by role/risk/status, critical path, action links |
| `T` | **Timeline** | Visual timeline до Aug 2, critical path, effort estimates |
| `R` | **Report** | Compliance report с export (PDF/MD/JSON/SARIF) |
| `L` | **Log** | Readonly activity log — daemon events, system messages |
| `C` | **Chat** | Interactive LLM chat — all roles (SYS/YOU/AI), input area, streaming, /cost /mode |

Подробнее: `docs/TUI-DESIGN-SPEC.md`

---

## 6. CLI Commands (~25)

### Core
```bash
complior scan [path]           # сканирование проекта
complior fix [--all]           # применить авто-фиксы
complior daemon [--watch]      # запустить daemon (headless)
complior tui                   # подключить TUI к daemon
complior mcp                   # запустить MCP server (stdio)
```

### Agent Passport
```bash
complior agent:init            # обнаружить AI-системы → сгенерировать passports
complior agent:list            # список всех passports
complior agent:validate        # проверить completeness
complior agent:export --format a2a|aiuc-1|nist
complior agent:import          # импортировать passport
```

### Document Generation
```bash
complior fria:generate         # генерация FRIA (80% pre-filled из passport)
complior notify:generate       # генерация Worker Notification (Art.26(7))
complior report:audit          # Audit Package (ZIP: passports + evidence + FRIA)
```

### Certification
```bash
complior cert:readiness        # AIUC-1 readiness check
complior cert:test             # adversarial testing
complior cert:evidence         # export evidence chain
```

Подробнее: `docs/TUI-DESIGN-SPEC.md`

---

## 7. MCP Server — 8 tools для агентов

Любой MCP-совместимый агент (Claude Code, Cursor, Windsurf, OpenCode) подключает Complior через stdio:

| Tool | Назначение |
|------|-----------|
| `complior_scan` | Сканирование проекта → score + findings |
| `complior_fix` | Авто-фикс нарушения |
| `complior_score` | Текущий compliance score |
| `complior_explain` | Объяснение статьи/обязательства |
| `complior_passport` | Получить/обновить Agent Passport |
| `complior_validate` | Проверить passport completeness |
| `complior_deadline` | Дедлайны и critical path |
| `complior_suggest` | Рекомендация следующего действия |

---

## 8. Бизнес-модель: Free Daemon → Paid Dashboard

**Open-source boundary:** всё что deployer запускает локально и что кодифицирует публичный закон = open. Proprietary data, агрегация, SaaS workflows = closed. Подробнее: `docs/UNIFIED-ARCHITECTURE.md` Section 9.

### Free (Daemon + TUI + CLI — open-source, MIT)
- Background daemon с file watcher
- Compliance scan (5 layers, 19+ checks) + score 0-100
- Auto-fix (6+ templates)
- Agent Passport Mode 1 (Auto, AST-based)
- Passport Schema (open standard, JSON Schema)
- RuleEngine Classification (Art.5, Annex III, Art.50 — public law = open)
- MCP Server (8 tools)
- CLI commands (scan, fix, passport, report)
- TUI dashboard (9 pages)
- CI/CD headless mode (--json, --sarif, --ci)
- Reports (MD, SARIF, badge SVG)
- Drift detection
- 1 юрисдикция (EU AI Act)

### Paid Dashboard (SaaS, €49-399/мес)
- Всё из Free +
- Agent Passport Mode 3 (Manual wizard + AI Registry pre-fill)
- AI System Registry (F39) — unified view всех passports (CLI + SaaS)
- FRIA Generator (F19) — 80% pre-filled из passport
- Audit Package (F42) — ZIP: all passports, FRIA, evidence, training, monitoring
- Worker Notification Generator
- EU Database Registration Helper
- AI Registry Community Evidence (F49) — анонимная агрегация "document received" из Passport'ов (network effect)
- Passport Visibility controls (private by default, opt-in public badge)
- Cross-System Map: все TUI-ноды организации
- Continuous Monitoring + Anomaly Detection
- Multi-jurisdiction (EU + CO + KR + UK + JP)
- Audit PDF (clean) + Compliance Certificate
- SSO (SAML/OIDC) + Team Management

### Тарифы

| Тариф | Цена | Daemon | Dashboard | AI Registry | Audit Package |
|-------|------|--------|-----------|------------|--------------|
| **Free** | €0 | Full | — | Offline (200 tools) | — |
| **Starter** | €49/мес | Full | Basic | 5,011+ tools | — |
| **Growth** | €149/мес | Full | Full | 5,011+ | Basic |
| **Scale** | €399/мес | Full | Full | Unlimited | Full (€2-5K value) |
| **Enterprise** | Custom | Full | Full | Unlimited | Custom |

---

## 9. Конкурентный анализ

| Конкурент | Тип | Для кого | Слабость |
|-----------|-----|----------|----------|
| Holistic AI | Enterprise SaaS | Юристы, GRC | Не для разработчиков, нет сканера кода |
| Credo AI | Enterprise SaaS | Risk/Compliance | Нет CLI, нет real-time |
| IBM OpenPages | Enterprise Suite | Large enterprise | Дорого, сложно, не для SMB |
| A2A Agent Card | Google spec | Agent interop | Только identity, нет compliance |
| AGENTS.md | Community | Agent description | Нет compliance, нет scoring |
| NIST AI RMF | US government | Risk management | Framework, не tool |
| Excel/Google Sheets | Manual | Compliance officers | Устаревает мгновенно, нет связи с кодом |

### Уникальные differentiators Complior

1. **Daemon** — единственный tool с background file watching + real-time compliance
2. **Agent Passport** — стандартизированный формат identity card AI-системы (36 полей, ed25519 signed)
3. **108 obligations** — полное покрытие EU AI Act, привязанное к конкретным фичам
4. **Developer-first** — CLI/TUI/MCP, не web form для юристов
5. **Free tier** — полноценный daemon + TUI + CLI (не trial)
6. **7-step pipeline** — от discovery до certification
7. **Dual-product** — Free daemon (разработчик) + Paid dashboard (CTO/DPO)
8. **Timing** — ~5 месяцев до enforcement, ноль конкурентов для разработчиков

---

## 10. Метрики успеха

### S04 (Passport MVP + Daemon Foundation)
- [ ] Daemon запускается (watcher + engine + MCP + HTTP)
- [ ] TUI подключается к daemon через HTTP/SSE
- [ ] Agent Passport Mode 1 (auto): 3+ frameworks detected
- [ ] Autonomy Level L1-L5 auto-rating
- [ ] `agent:init` → `agent-manifest.json` generated + ed25519 signed
- [ ] MCP Server: 8 tools functional

### S05-S06 (Document Generation + Certification)
- [ ] FRIA Generator (80% pre-filled)
- [ ] Worker Notification template
- [ ] Passport Export (A2A, AIUC-1, NIST)
- [ ] Adversarial Test Runner
- [ ] Industry-Specific Scanner Checks

### 3-month targets
- 500 CLI Mode 1 passports generated
- 50 SaaS Mode 3 passports
- 1,000/week npm downloads

### 6-month targets
- 5,000 CLI passports
- 500 SaaS passports
- 50 organizations with both CLI + SaaS
- NIST AI Profile submission

---

## 11. EU Sovereign AI Strategy

Все данные и инфраструктура — EU:

| Компонент | Провайдер | Страна |
|-----------|----------|--------|
| Hosting | Hetzner | Германия |
| Auth (SaaS) | WorkOS | Managed (SCC) |
| LLM | Mistral | Франция |
| Email | Brevo | Франция |
| PDF | Gotenberg | Self-hosted (Hetzner) |
| Storage | Hetzner Object Storage | Германия |
| Analytics | Plausible | Эстония |
| Monitoring | Better Uptime | Литва |

---

**Обновлено:** 2026-02-27
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
