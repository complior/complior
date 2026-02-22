# Complior v6 Walkthrough — Wrapper Mode Demo

> VulnerAI: от 25/100 до 85/100 за 2 минуты.
> Complior оборачивает Claude Code и мониторит compliance в реальном времени.

---

## Предусловия

```bash
# Установка Complior
curl -fsSL https://complior.ai/install.sh | sh
# Или: npx complior / brew install complior / cargo install complior
```

## Шаг 1: Запуск с Claude Code

```bash
cd vulnerai-demo
complior --agent claude-code
```

Complior запускается как wrapper:

```
┌── Agent: Claude Code ────────────────┐ ┌── Compliance ──────┐
│                                       │ │ ● Score: 25/100    │
│  claude> Ready. Working directory:   │ │ █████░░░░░░░░ 25%  │
│  /home/user/vulnerai-demo            │ │ RED                │
│                                       │ │                    │
│                                       │ │ ── Checks ──────  │
│                                       │ │ ✗ disclosure       │
│                                       │ │ ✗ marking          │
│                                       │ │ ✗ logging          │
│                                       │ │ ✗ literacy         │
│                                       │ │ ✗ documentation    │
│                                       │ │ ✗ metadata         │
│                                       │ │ ~ GPAI_basic       │
│                                       │ │                    │
│                                       │ │ ── Deadlines ───  │
│                                       │ │ 🔴 163d Art.6      │
│                                       │ │                    │
│                                       │ │ [Scan] [Fix all]   │
└───────────────────────────────────────┘ └────────────────────┘
┌── Activity Log ────────────────────┐ ┌── Score History ─────┐
│ 18:00 ★ Initial scan: 25/100 RED  │ │ 25 ████             │
│ 18:00 ⚙ Engine started            │ │                      │
└────────────────────────────────────┘ └──────────────────────┘
```

## Шаг 2: Первый Fix — AI Disclosure

Нажимаем [Fix] рядом с `✗ disclosure` или вводим `/fix disclosure`.

Complior формирует промпт и передаёт Claude Code:

```
┌── Agent: Claude Code ────────────────┐ ┌── Compliance ──────┐
│                                       │ │ ● Score: 33/100    │
│  claude> Creating AI disclosure      │ │ ██████░░░░░░░ 33%  │
│  component for Art. 50.1...          │ │ RED                │
│                                       │ │                    │
│  ✓ Created src/components/           │ │ ✓ disclosure  NEW  │
│    AiDisclosure.tsx                  │ │ ✗ marking          │
│  ✓ Updated src/app/chat/page.tsx     │ │ ✗ logging     [F]  │
│                                       │ │ ✗ literacy    [F]  │
│                                       │ │                    │
└───────────────────────────────────────┘ └────────────────────┘

┌─────────────────────────────────────┐
│ ✓ Score increased: 25 → 33 (+8)    │
│ disclosure check PASSED             │
│ [View Diff] [Dismiss]       3s     │
└─────────────────────────────────────┘
```

## Шаг 3: Batch Fix

Нажимаем [Fix all] или `/fix`:

```
Complior → Claude Code (серия промптов):

  1. ✓ Interaction Logging (Art.12)    +7  → 40/100
     Created lib/compliance-logger.ts

  2. ✓ Content Marking (Art.50.2)      +5  → 45/100
     Created lib/ai-output-wrapper.ts

  3. ✓ Compliance Metadata (Art.50.4)  +5  → 50/100
     Created .well-known/ai-compliance.json

  4. ✓ Documentation (Art.11)          +8  → 58/100
     Generated COMPLIANCE.md

  5. ✓ AI Literacy (Art.4)             +5  → 63/100
     Generated docs/ai-literacy.md
```

## Шаг 4: Генерация документов

```
claude> /fria
```

FRIA Generator запускается — 80% пре-заполнено из профиля:

```
✓ FRIA generated: docs/fria.md         +8  → 71/100
  Art. 27: Fundamental Rights Impact Assessment
  80% pre-filled from compliance profile
```

```
claude> /docs tech
```

```
✓ Technical docs: docs/technical.md     +7  → 78/100
  Art. 11: Technical Documentation
```

## Шаг 5: Runtime Middleware

```
claude> /runtime
```

Complior генерирует middleware для production:

```
✓ Runtime middleware generated:
  lib/complior-wrap.ts    — AI Response Wrapper (compliorWrap())
  lib/compliance-marker.ts — Content Marking Engine
  Updated: src/lib/ai.ts  — wrapped AI calls with compliorWrap()

  Score: 78 → 85/100 (+7) 🟢 GREEN
```

## Результат

```
┌── Agent: Claude Code ────────────────┐ ┌── Compliance ──────┐
│                                       │ │ ● Score: 85/100    │
│  claude> All fixes applied!          │ │ █████████████░ 85%  │
│  Score improved from 25 to 85.       │ │ GREEN              │
│                                       │ │                    │
│  Remaining improvements:             │ │ ✓ disclosure       │
│  - Risk Management Plan (Art.9)      │ │ ✓ marking          │
│  - Post-Market Plan (Art.72)         │ │ ✓ logging          │
│  - Incident Response (Art.73)        │ │ ✓ literacy         │
│                                       │ │ ✓ documentation    │
│  These require manual input.         │ │ ✓ metadata         │
│                                       │ │ ✓ GPAI_basic       │
│                                       │ │ ✓ FRIA             │
│                                       │ │ ~ risk_management  │
│                                       │ │ ~ post_market      │
│                                       │ │                    │
└───────────────────────────────────────┘ └────────────────────┘
┌── Score History ─────────────────────────────────────────────┐
│  85┤                                              ████       │
│  70┤                                    ████████████         │
│  55┤                          ██████████                     │
│  40┤                ██████████                               │
│  25┤████████████████                                         │
│    └─ scan ── disc ── batch ── fria ── docs ── runtime ──   │
└──────────────────────────────────────────────────────────────┘
```

## Шаг 6: Badge + Report

```bash
# Генерация badge
complior badge
# → Created: compliance-badge.svg (Score: 85/100, EU AI Act)

# Генерация отчёта
complior report --pdf
# → Created: compliance-report.pdf (with Complior watermark — Free tier)

# CI/CD проверка
complior scan --ci --threshold 80
# → ✓ PASS (score 85 >= threshold 80)
```

## Альтернативные сценарии

### Multi-Agent Mode

```bash
complior --agents "odelix, claude-code"
# Odelix пишет код, Claude Code ревьюит — Complior мониторит ОБОИХ
```

### Headless (CI/CD)

```bash
# GitHub Action
complior scan --ci --threshold 80 --sarif report.sarif
# → SARIF file for GitHub Code Scanning

# Pre-commit hook
complior scan --threshold 70
# → exit 0 (pass) / exit 1 (fail)
```

### MCP (Cursor/Windsurf)

```
Cursor: "Scan this file for compliance"
→ MCP tool: complior_scan → {score: 72, findings: [...]}

Cursor: "Fix Art.50.1 violation"
→ MCP tool: complior_fix → {diff: "...", explanation: "..."}
```

---

**Время:** ~2 минуты от 25/100 RED до 85/100 GREEN.
**Автор:** Marcus (CTO) via Claude Code (Opus 4.6)
