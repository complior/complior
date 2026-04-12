---
description: HARD scope boundaries — every agent may ONLY touch files in its ownership zone
globs: ["cli/**/*.rs", "engine/**/*.ts", "tests/**/*.{ts,js}", "docs/**/*.md", "scripts/**"]
---

# Scope Guard — MANDATORY for every agent

## File ownership

| Agent | ALLOWED files | FORBIDDEN (everything else) |
|---|---|---|
| architect | tests/test_*.ts (new specs only), docs/, CLAUDE.md, src/types/, src/interfaces/ | ALL implementation code |
| frontend-dev | src/components/*.tsx, src/hooks/*.ts, src/utils/*.ts, src/App.tsx | server/, src/types/, docs/, .claude/ |
| rust-dev | cli/, engine/core/src/ | engine/daemon, engine/sdk |
| nodejs-dev | engine/daemon/, engine/core/ | cli/, engine/sdk |
| ts-dev | engine/sdk/ | cli/, engine/daemon |
| test-runner | tests/*.ts, tests/*.tsx | ANY implementation code |
| reviewer | docs/project-state.md (update only) | ANY other file |

### src/types/ ownership: architect owns .ts interface/type files only.
### src/components/ ownership: frontend-dev owns .tsx files only.
### server/ ownership: backend-dev owns .ts files only.
### Shared types between frontend/backend: architect defines in src/types/, both use.

## УСТАВНЫЕ ДОКУМЕНТЫ — АБСОЛЮТНЫЙ ЗАПРЕТ для всех dev-агентов

Следующие файлы НЕ МОЖЕТ модифицировать НИКАКОЙ dev-агент.
Только architect или user. Нарушение = автоматический reject + откат ВСЕХ изменений.

- `.claude/agents/*.md` — определения агентов
- `.claude/rules/*.md` — правила проекта
- `.claude/skills/**` — skills
- `.claude/settings.json` — hooks и настройки
- `CLAUDE.md` — master rules
- `docs/project-state.md` — ТОЛЬКО reviewer обновляет после merge
- `docs/tech-debt.md` — только reviewer записывает
- `docs/sprints/*.md` — только architect меняет статусы
- `docs/feature-areas/*.md` — только architect меняет
- `docs/PRODUCT-VISION.md` — только user
- `docs/STRATEGY.md` — только architect

**Почему:** агент-LLM может "оптимизировать" правила убрав ограничения которые ему мешают.
Это не баг — это предсказуемое поведение. Поэтому запрет абсолютный.

## GIT & MERGE — АБСОЛЮТНЫЕ ПРАВИЛА

### Merge — ТОЛЬКО user
- **НИКАКОЙ агент НЕ мержит в main или dev.** Ни architect, ни dev, ни reviewer.
- Merge = решение user'а. Агенты ТОЛЬКО создают PR.
- `git push --force` к main/dev — ЗАПРЕЩЕНО для всех агентов.

### Branch model: feature/* → dev → main

```
feature/xxx  ──PR──►  dev  (рабочая интеграционная ветка)
                        │
                       PR
                        ▼
                      main  (релиз, tagged v*)
```

- **dev** — рабочая ветка. Сюда мержатся завершённые feature-ветки.
- **main** — релизная ветка. Merge в main = новая версия (tag + release).
- **feature/\*** — одна фича или milestone. Живёт до merge в dev.

### Branch workflow
1. **architect** создаёт `feature/*` branch от `dev`, коммитит milestones + RED тесты
2. **dev-агенты** коммитят реализацию на тот же feature branch
3. **test-runner** запускает тесты, даёт отчёт (НЕ коммитит)
4. **reviewer** проверяет, обновляет project-state.md
5. **architect** создаёт PR: `feature/*` → `dev`
6. **user** мержит PR в `dev` когда фича approved
7. Когда `dev` стабильна (несколько фич, version bump) → **user** мержит `dev` → `main` + tag

### Когда мержить feature → dev
- Все тесты GREEN (unit + E2E)
- Reviewer APPROVED
- project-state.md обновлён
- Нет blocker'ов в tech-debt

### Когда мержить dev → main
- Все фичи текущей фазы готовы (или осознанный partial release)
- CI зелёный на dev
- Version bump (Cargo.toml + package.json)
- CHANGELOG обновлён
- User принимает решение о релизе

### CI/CD pipeline (.github/workflows/)
- `ci.yml` — автозапуск на каждый PR и push в main/dev:
  - Rust: fmt → clippy → test → security audit (cargo-deny)
  - TS Engine: typecheck → vitest (без e2e) → npm audit
  - Version consistency: Cargo.toml = package.json
- `release.yml` — на git tag `v*`:
  - Build 5 targets (Linux x86/arm, macOS Intel/ARM, Windows)
  - Publish: crates.io + npm + GitHub Release + Docker (optional)
  - Smoke test: npm install + cargo install
- Все агенты ОБЯЗАНЫ убедиться что `cargo test` и `npx vitest run` проходят ПЕРЕД коммитом

## THREE HARD RULES:

### Rule 1: DO NOT touch other agents' code
You see a bug in src/components/DroneMarker.tsx but you are frontend-dev working on hooks?
**STOP.** You do NOT fix it. You report it.

### Rule 2: DO NOT touch code outside your current task
You are implementing your current milestone. You notice code from a previous milestone
could be "improved"? **STOP.** That code works and is tested. Leave it alone.
Only modify files that are DIRECTLY required by your current task description.

### Rule 3: If you MUST request a change outside your scope

Write this EXACT format in your response (the !!! markers are mandatory):

```
!!! SCOPE VIOLATION REQUEST !!!
Agent: [your agent type]
Current task: [your task description]
File I need to change: [full path]
Owner: [which agent owns this file]
What change: [exact description of change needed]
Why I cannot proceed without it: [concrete reason]
!!! END SCOPE VIOLATION REQUEST !!!
```

Then STOP and WAIT. Do NOT make the change.

## НЕТ СПЕЦИФИКАЦИИ = НЕТ РАБОТЫ

Ты реализуешь ТОЛЬКО то, на что architect написал спецификацию.
Спецификация — это ДВА источника (проверь ОБА):
- **Unit тесты** (tests/*.test.ts) — RED тесты = задачи Типа 1
- **Acceptance scripts** (scripts/verify_*.sh) — FAIL scripts = задачи Типа 2

Если нет НИ тестов НИ scripts — ты НЕ МОЖЕШЬ решить "я сам реализую это".

- Нет RED теста И нет FAIL script → НЕ РЕАЛИЗУЙ
- Есть RED тест, но нет script → реализуй по тесту (Тип 1)
- Есть и RED тест И FAIL script → реализуй ОБА
- Все тесты GREEN + все scripts PASS → ОСТАНОВИСЬ: "Жду milestone от architect"

## TESTS ARE SACRED

Test files written by the architect are SPECIFICATIONS, not suggestions.
- You MUST NOT modify test files to make your implementation pass
- You MUST NOT add, remove, or weaken assertions in existing tests
