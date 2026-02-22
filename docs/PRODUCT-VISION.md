# PRODUCT-VISION.md — Complior v6: Wrapper-Оркестратор для AI Compliance

**Версия:** 6.0.0
**Дата:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code
**Статус:** Phase 0 — Утверждено

---

## 1. Проблема

2 августа 2026 — enforcement EU AI Act для high-risk систем. **5.5 месяцев.**

- 108 обязательств deployer'а (Art. 4, 26, 27, 50)
- 144 страницы регуляции, без единого инструмента для разработчиков
- Каждый AI coding agent (Cursor, Claude Code, OpenCode, Odelix) работает изолированно — ни один не проверяет compliance
- Compliance = ручной процесс юристов, оторванный от кода
- Штрафы: до €35M или 7% оборота

**Разработчики пишут AI-код без compliance. Юристы проверяют compliance без кода.**

---

## 2. Решение: Complior v6

> **Complior = tmux для AI compliance.**
> Запускает ЛЮБОГО coding agent внутри себя.
> Compliance слой поверх каждого изменения файла.

### Было (v5): Compliance-First Coding Assistant
```
Complior v5 = сам пишет код + сканирует compliance
Проблема: конкурирует с Cursor/Claude Code на КОДИНГЕ — проигрывает.
```

### Стало (v6): Wrapper-Оркестратор
```
Complior v6 = хост-процесс, который ЗАПУСКАЕТ coding agents внутри себя.
Coding agent = гость-процесс (subprocess, PTY).
Complior наблюдает за файловой системой → compliance gate поверх ЛЮБОГО агента.

Пользователь работает в привычном агенте.
Complior добавляет: real-time скан, score, warnings, auto-fix, отчёты, бейджи.
```

### Как это работает
```bash
$ complior                              # запустить с дефолтным агентом
$ complior --agent claude-code          # запустить с Claude Code
$ complior --agent opencode             # запустить с OpenCode
$ complior --agent "aider --model opus" # любая CLI команда как agent
$ complior --agent bash                 # даже просто shell
$ complior --agents "odelix, claude-code"  # два агента рядом
$ complior --headless                   # CI/CD (без TUI)
```

---

## 3. Ключевые ценности

### 3.1 Wrapper-оркестратор
Единственный инструмент, который оборачивает ЛЮБОГО coding agent. Не конкурирует — дополняет. Пользователь продолжает работать в привычном агенте, Complior работает поверх.

### 3.2 Real-time Compliance Gate
Каждое изменение файла → фоновый ре-скан за 200мс → score update → toast при нарушении. Разработчик видит compliance impact в реальном времени, не покидая IDE/агента.

### 3.3 Мульти-агент
Несколько agents одновременно в tabs или splits. Odelix пишет код, Claude Code делает ревью — Complior контролирует compliance ОБОИХ.

### 3.4 Матрица решений
17 типов нарушений — для каждого конкретное решение с ссылкой на статью закона. Complior НЕ пишет код сам — формирует промпт и передаёт вложенному агенту.

### 3.5 Runtime Control
Не только статический скан кода, но и генерация middleware для runtime: `compliorWrap()`, логгер (Art.12), маркировка (Art.50.2), фильтр (PII, safety, bias).

### 3.6 Developer-First + Free
Free TUI = полный функционал для разработчика. Монетизация через Dashboard для CTO/DPO.

---

## 4. Целевая аудитория

### Первичная: Разработчики AI-приложений
- Используют AI SDK (OpenAI, Anthropic, Vercel AI SDK, LangChain)
- Работают в coding agents (Claude Code, Cursor, Odelix, OpenCode)
- Не знают про EU AI Act, не хотят знать — хотят чтобы работало
- **Ценность:** `npx complior` → score → fix → badge → done

### Вторичная: CTO / Tech Lead
- Ответственны за compliance всей организации
- Нужен обзор всех проектов и всех AI-систем
- **Ценность:** Dashboard → Cross-System Map → Score → Action Plan

### Третичная: DPO / Compliance Officer
- Нужны отчёты, сертификаты, audit trail
- Не кодят, но принимают решения
- **Ценность:** Compliance Only preset → reports → certificates

---

## 5. UI — 4 пресета

### Пресет 1: Dashboard (по умолчанию)
```
┌── Agent: Odelix ──────────────────────┐ ┌── Compliance ──────┐
│                                        │ │ Score: 72/100      │
│  (Odelix работает как обычно —         │ │ ████████░░ 72%     │
│   весь вывод рендерится 1:1)           │ │                    │
│                                        │ │ ✓ disclosure       │
│                                        │ │ ✗ logging    [Fix] │
│                                        │ │ ✗ docs       [Fix] │
│                                        │ │ ✓ metadata         │
│                                        │ │                    │
│                                        │ │ 163d Art.6 ⚠       │
│                                        │ │ [Scan] [Report]    │
└────────────────────────────────────────┘ └────────────────────┘
┌── Activity Log ─────────────┐ ┌── Score History ──────────────┐
│ 18:03 ✓ logging.ts fixed    │ │ ██▄█▆██▇█ 72                 │
└─────────────────────────────┘ └───────────────────────────────┘
```

### Пресет 2: Focus
Agent на весь экран, compliance только в statusbar. Ctrl+Shift+D раскрывает dashboard overlay.

### Пресет 3: Multi
2+ agents рядом + compliance panel. Odelix кодит, Claude Code ревьюит — compliance обоих.

### Пресет 4: Compliance Only
Dashboard без agent. Для DPO/CTO: score, findings, deadlines, reports.

---

## 6. Бизнес-модель: Free TUI → Paid Dashboard

### Free (TUI — open-source)
- Сканирование кодовой базы (local project)
- Compliance score 0-100 + 6 авто-фиксеров
- COMPLIANCE.md + badge (static SVG)
- MCP server для Claude/Cursor/Windsurf (7+ tools)
- Headless mode (CI/CD: --json, --ci, --sarif)
- Wrapper-оркестратор для ЛЮБОГО coding agent
- Agent discovery (local configs, workflows)
- Agent compliance manifest генерация
- Infrastructure scan (Dockerfile, k8s, terraform — local)
- Runtime middleware генерация (wrapper, logger, marker)
- Drift detection (session-to-session)
- 1 юрисдикция (EU AI Act)
- 200 top AI tools (offline бандл)

### Paid Dashboard (SaaS, €49-399/мес)
- Всё из Free +
- Cross-System Map: все TUI-ноды на одном дашборде
- Agent Registry UI + Governance (lifecycle, kill switch)
- SaaS/Shadow AI Discovery (IdP, CASB, API traffic)
- Continuous Monitoring + Anomaly Detection
- Scheduled Reports (weekly/monthly/quarterly)
- Compliance SLA + SLA tracking
- Multi-jurisdiction (EU + CO + KR + UK + JP + ...)
- 2,477+ AI tools (полный реестр через API)
- Audit PDF (clean, без watermark)
- Compliance Certificate (QR-verified)
- SSO (SAML/OIDC) + Team Management
- API доступ + API keys

### Тарифы

| Тариф | Цена | TUI | Dashboard | Tools | Users | Юрисдикции |
|-------|------|-----|-----------|-------|-------|------------|
| **Free** | €0 | ✓ | — | 200 (offline) | 1 | EU |
| **Starter** | €49/мес | ✓ | ✓ | 2,477 (API) | 2 | EU+1 |
| **Growth** | €149/мес | ✓ | ✓ | 2,477 | 10 | All |
| **Scale** | €399/мес | ✓ | ✓ | Unlimited | Unlimited | All |
| **Enterprise** | Custom | ✓ | ✓ | Unlimited | Unlimited | All + Custom |

Годовая подписка: 20% скидка.

---

## 7. Конкурентный анализ

| Конкурент | Тип | Для кого | Слабость |
|-----------|-----|----------|----------|
| Holistic AI | Enterprise SaaS | Юристы, GRC | Не для разработчиков, нет сканера кода |
| Credo AI | Enterprise SaaS | Risk/Compliance | Не для разработчиков, нет CLI |
| IBM OpenPages | Enterprise Suite | Large enterprise | Дорого, сложно, не для SMB |
| Monitaur | ML Monitoring | ML engineers | Только модели, не код |
| Arthur AI | ML Observability | ML teams | Runtime only, не статический скан |
| **Complior** | **TUI + SaaS** | **Разработчики → CTO** | — |

### Уникальные differentiators Complior

1. **Wrapper** — единственный tool который оборачивает ЛЮБОГО coding agent
2. **Real-time gate** — compliance на каждое изменение файла (200мс)
3. **Developer-first** — CLI/TUI, не web form для юристов
4. **Free TUI** — полноценный free tier (не trial)
5. **Dual-product** — TUI (разработчик) + Dashboard (CTO/DPO)
6. **Runtime control** — middleware генерация, не только статический скан
7. **Multi-agent** — контроль нескольких coding agents одновременно
8. **Timing** — 5.5 месяцев до enforcement, ноль конкурентов для разработчиков

---

## 8. Техническая архитектура (обзор)

```
┌──────────────────┐     HTTP/SSE      ┌──────────────────────────┐
│  RUST TUI        │ ◄───────────────► │  TS ENGINE (Hono)        │
│  (ratatui)       │                   │                          │
│  Wrapper host    │                   │  Scanner (5 layers)      │
│  PTY manager     │                   │  Fixer (6+ templates)    │
│  100+ themes     │                   │  Regulation DB (JSON)    │
│  ~5MB binary     │                   │  AI Registry (2K+)       │
└──────┬───────────┘                   │  LLM (Vercel AI SDK)     │
       │ PTY                           │  MCP Server (stdio)      │
       ▼                               │  DataProvider port       │
┌──────────────────┐                   └──────────────────────────┘
│  GUEST AGENT     │
│  (subprocess)    │
│  Any CLI agent   │
└──────────────────┘
```

Подробнее: см. ARCHITECTURE.md

---

## 9. Метрики успеха

### Запуск (S04, неделя 8)
- [ ] Wrapper запускает 5+ agents (Odelix, Claude Code, OpenCode, aider, bash)
- [ ] Compliance Gate: <200мс на rescan
- [ ] 7 P0 checks + 6 auto-fixers
- [ ] Score 0-100 + sparkline + deadlines
- [ ] MCP Server + GitHub Action + pre-commit
- [ ] Headless mode (CI/CD)
- [ ] Landing page + npm publish

### Рост (S05-S06, месяцы 1-3)
- [ ] Runtime middleware SDK (5 adapters)
- [ ] Agent governance basic
- [ ] VS Code extension
- [ ] 5 юрисдикций

### Масштаб (S07-S10, месяцы 3-6+)
- [ ] Org-wide scan
- [ ] Monitoring + drift detection
- [ ] Agent sandbox + kill switch
- [ ] 10+ юрисдикций
- [ ] 2,000+ AI tools

---

## 10. EU Sovereign AI Strategy

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

**Обновлено:** 2026-02-21
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
