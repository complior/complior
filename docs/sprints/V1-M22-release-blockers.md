# V1-M22: v1.0.0 Release Blockers

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M22-release-blockers` (chained from `feature/V1-M20-M21-roadmap-cleanup`)
> **Created:** 2026-04-24
> **Author:** Architect
> **Triggered by:** V1-M21 Deep E2E Test Report (2026-04-24)
> **Predecessor:** V1-M20 Tech Debt + V1-M21 manual E2E (blockers discovered)
> **Successor:** V1-M21 re-run → release v1.0.0

---

## 1. Goal

Закрыть все release blockers обнаруженные в V1-M21 Deep E2E manual test:
- 4 критичных бага (B-1..B-4)
- 8 HTML report issues (H-1..H-8)
- 3 UX issues (U-1..U-3)
- ISO 42001 — архивировать в отдельной ветке и удалить из scope (код сохранён в `archive/iso-42001`)
- 5 test-script багов (TS-1..TS-5)
- Переориентировать test orchestrator на правильный test project (`eval-target` с AI server)

**Критерий готовности:** V1-M21 re-run → 0 release blockers → tag v1.0.0.

## 2. Scope

### Секция A: HTML Report quality (8 задач)

| ID | Описание | Agent | Owner |
|----|----------|-------|-------|
| A-1 | **B-1**: `report --output <path>` игнорируется для md/html/pdf — honor флаг для всех форматов | nodejs-dev + rust-dev | Report route + CLI |
| A-2 | **B-2**: HTML `$1` placeholders в заголовках — template substitution fix | nodejs-dev | reporter domain |
| A-3 | **H-3**: Overview block — **company profile** (role/risk/domain из onboarding) + applicable EU AI Act articles (compact) | nodejs-dev | reporter domain |
| A-4 | **H-4**: LAWS tab — детализированный breakdown применимых статей с текстом + compliance status | nodejs-dev | reporter domain |
| A-5 | **H-5**: Documents — генерировать реальные IDs (`TDD-2026-001`, `INC-2026-001`, etc.) + clickable links на созданные docs | nodejs-dev | reporter + document-generator |
| A-6 | **H-6**: FIXES tab — показывать applied fixes (history) + remaining fix plans | nodejs-dev | reporter domain |
| A-7 | **H-8**: Actions tab — убрать `passport init` (deprecated), дедуплицировать `fix`, проработать suggestions логику | nodejs-dev | reporter domain |
| A-8 | **H-1**: "Score capped: Evidence chain missing" — auto-init evidence chain в `complior init` (Option A) | nodejs-dev | onboarding + passport |

### Секция B: Feature gaps (2 задачи)

| ID | Описание | Agent |
|----|----------|-------|
| B-1 | **B-3**: `complior passport notify <agent>` subcommand + route (per PRODUCT-VISION §11) | rust-dev + nodejs-dev |
| B-2 | **B-4**: `scan --json` включает `disclaimer` field (M10 completion) | nodejs-dev |

### Секция C: ISO 42001 removal (6 задач)

**ISO 42001 код сохранён в archive/iso-42001 ветке для восстановления в будущем.**

| ID | Описание | Agent |
|----|----------|-------|
| C-1 | Удалить iso42001-* doc types из `document-generator.ts`, `template-registry.ts` | nodejs-dev |
| C-2 | Удалить `engine/core/data/templates/iso-42001/` dir | nodejs-dev |
| C-3 | Убрать iso42001 из CLI `--doc` choices (`cli/src/headless/{fix,doc}.rs`) | rust-dev |
| C-4 | Обновить `composition-root.ts`, `passport-service.ts`, `passport-documents.ts` | nodejs-dev |
| C-5 | Убрать `iso42001-*` тесты из `doc-generation-e2e.test.ts` | architect |
| C-6 | Обновить FA (`fix-architecture.md`), scrub `iso42001-soa`/`iso42001-risk-register` из доков | architect |

**U-1 автоматически решается** — `soa`, `risk-register`, `ai-policy` удалены вместе с iso42001.

### Секция D: UX fixes (2 задачи)

| ID | Описание | Agent |
|----|----------|-------|
| D-1 | **U-2**: `passport export --format` нормализация (принимает `aiuc1` как alias для `aiuc-1`) | rust-dev |
| D-2 | **U-3**: `fix --check-id <unknown>` exit code semantics: exit 0 если "no fix available" (informational) vs exit 2 если fix failed | rust-dev |

### Секция E: Test infrastructure (architect)

| ID | Описание |
|----|----------|
| E-1 | Исправить 5 test-script багов в `verify_v1_deep_e2e.sh`:<br>TS-1: daemon port `3099` (was 4000)<br>TS-2: запустить `npm run dev` в eval-target (spawn AI server на :4000)<br>TS-3: passport name discovery через `passport list` (was `acme-bot`)<br>TS-4: `--format aiuc-1` (was `aiuc1`)<br>TS-5: `--check-id` через `jq` из scan --json (was hardcoded `L1-A001`) |
| E-2 | Переориентировать orchestrator на `~/test-projects/eval-target/` (has AI server + intentional compliance violations) |
| E-3 | Re-run после V1-M22 GREEN → `docs/E2E-DEEP-TEST-REPORT-{date}.md` обновлён |

## 3. Предусловия среды

- [x] `archive/iso-42001` branch создана и запушена (snapshot для восстановления)
- [ ] V1-M22 RED tests написаны (этот коммит)
- [ ] `cd engine/core && npm test` — RED тесты красные, build green
- [ ] `cargo test -p complior-cli` — RED тесты красные, build green
- [ ] `~/test-projects/eval-target/` — готов (server.ts + compliance violations)
- [ ] `OPENROUTER_API_KEY` в `~/.config/complior/credentials`

## 4. Actions Tab Logic (A-7 — детали для dev'а)

Suggestions должны следовать этим правилам:

**ВКЛЮЧАТЬ в suggestions:**
- "Run `complior scan` to refresh findings" — если последний scan > 30 минут назад OR findings stale
- "Run `complior fix <check-id>` for N fixable findings" — **один раз**, с перечислением topN_fixable_ids
- "Generate `<doc-type>` document" — только для missing doc types (не дублировать уже созданные)
- "Update passport for <agent>" — если completeness < 80%
- "Run `complior eval <your-endpoint>`" — если у проекта есть AI endpoint (из project.toml) И eval ещё не запускался

**НЕ ВКЛЮЧАТЬ:**
- `complior passport init` — deprecated, passports создаются через `complior init`
- Дубликаты одного и того же action (dedup по (verb, object))
- Actions на already-fixed findings

## 5. Tasks Table

Полный breakdown с RED тестами и архитектурными требованиями:

### Секция A tasks

| # | Задача | Agent | RED Test | Verification | Architecture |
|---|--------|-------|----------|--------------|--------------|
| A-1 | report --output honored for all formats | rust-dev + nodejs-dev | `report-output-path.test.ts` + `report_output_flag.rs` | File written to exact `--output` path; CLI message matches actual path | Path resolution in single place (route), not duplicated |
| A-2 | HTML template substitution no `$1` | nodejs-dev | `html-report-no-placeholders.test.ts` | Generated HTML has 0 instances of `$1`, `$2` etc. | Pure template fn, Object.freeze, deterministic |
| A-3 | Overview company profile block | nodejs-dev | `html-overview-profile-block.test.ts` | HTML contains `<section id="company-profile">` with role/risk/domain + 1+ EU AI Act article reference | Data from project.toml, not hardcoded |
| A-4 | LAWS tab detailed articles | nodejs-dev | `html-laws-tab-details.test.ts` | LAWS section has per-article breakdown with article text excerpt + compliance status | Data from regulation JSON, typed `ArticleBreakdown` |
| A-5 | Document IDs generated + linked | nodejs-dev | `document-id-generation.test.ts` + `html-document-links.test.ts` | `generateDocumentId('TDD')` returns `TDD-{YYYY}-{NNN}` with incrementing NNN. HTML has `<a href="...">` to actual files | Pure fn, deterministic for same input, uses counter from `.complior/doc-counter.json` |
| A-6 | FIXES tab populated | nodejs-dev | `html-fixes-tab.test.ts` | FIXES section shows: N applied fixes (from history.json) + M pending fix plans | Data from `.complior/fixes-history.json` + current scan |
| A-7 | Actions tab dedup + logic | nodejs-dev | `html-actions-suggestions.test.ts` | No `passport init`; `complior fix` appears ≤1 time; profile-aware suggestions | Pure fn `buildSuggestions(state)`, rules documented in spec |
| A-8 | Auto-init evidence chain | nodejs-dev | `init-auto-evidence-chain.test.ts` | After `complior init`, evidence chain is created and valid | Idempotent, survives re-init |

### Секция B tasks

| # | Задача | Agent | RED Test | Verification | Architecture |
|---|--------|-------|----------|--------------|--------------|
| B-1 | passport notify subcommand | rust-dev + nodejs-dev | `passport-notify-route.test.ts` + `passport_notify_cli.rs` | `complior passport notify <agent>` generates worker notification template, writes to `.complior/notifications/{agent}-{date}.md` | Route factory fn, CLI subcommand, Object.freeze result |
| B-2 | scan --json disclaimer | nodejs-dev | `scan-json-disclaimer.test.ts` | `scan --json \| jq '.disclaimer'` returns valid disclaimer object (not null) | Same disclaimer builder as eval, shared util |

### Секция C tasks (ISO 42001 removal)

| # | Задача | Agent | RED Test | Verification |
|---|--------|-------|----------|--------------|
| C-1 | Remove iso42001 doc types | nodejs-dev | `no-iso42001-doc-types.test.ts` | `document-generator.ts` has no `iso42001-*` entries |
| C-2 | Remove iso-42001/ templates | nodejs-dev | (filesystem test in C-1) | `data/templates/iso-42001/` dir absent |
| C-3 | Remove iso42001 from CLI | rust-dev | `cli_no_iso42001_flags.rs` | `cli/src/cli.rs` has no `Iso42001Soa`, `Iso42001RiskRegister`, `Iso42001AiPolicy` enum variants |
| C-4 | composition-root clean | nodejs-dev | `composition-root-no-iso42001.test.ts` | Grep returns 0 `iso42001` refs in composition-root.ts, passport-service.ts, passport-documents.ts |
| C-5 | Remove iso42001 e2e tests | architect | n/a (this commit) | `doc-generation-e2e.test.ts` has no `iso42001` describe blocks |
| C-6 | Scrub FA docs | architect | n/a (this commit) | `fix-architecture.md` + other FA files no `iso42001` mentions |

### Секция D tasks

| # | Задача | Agent | RED Test | Verification |
|---|--------|-------|----------|--------------|
| D-1 | Format alias `aiuc1` → `aiuc-1` | rust-dev | `passport_export_format_alias.rs` | `passport export --format aiuc1` accepted, same behavior as `--format aiuc-1` |
| D-2 | fix --check-id exit semantics | rust-dev | `fix_check_id_exit_codes.rs` | Exit 0 + info msg when "no fix available"; exit 2 only when fix actually failed |

### Секция E tasks (architect — после всех GREEN)

| # | Задача |
|---|--------|
| E-1 | Fix TS-1..TS-5 в `verify_v1_deep_e2e.sh` |
| E-2 | Reorient на `eval-target` + auto-spawn AI server |
| E-3 | Re-run + новый отчёт |

## 6. Acceptance Criteria

- [ ] Все 14 RED тестов из A+B+C+D GREEN
- [ ] `cargo clippy --all-targets -- -D warnings` — clean
- [ ] `tsc --noEmit` — clean
- [ ] 0 `iso42001` refs в engine + cli (grep clean)
- [ ] V1-M21 re-run — 0 release blockers
- [ ] HTML report визуально чистый (no `$1`, profile block present, document IDs real)
- [ ] PRODUCT-VISION §11 чеклист обновлён user'ом (ISO 42001 deferred)

## 7. Out of Scope

- Cloud services (Month 3-4)
- SDK enrichment (V2-M01)
- MCP enrichment (V2-M02)
- Guard integration (V2-M03)
- NIST AI RMF (post-v1.0.0)

## 8. ISO 42001 Archive

**Preserved in:** `archive/iso-42001` branch (snapshot от `dev` 2026-04-24)

**Contents of archive:**
- `engine/core/data/templates/iso-42001/` — all templates
- `engine/core/src/composition-root.ts` — ISO bindings
- `engine/core/src/domain/documents/document-generator.ts` — ISO generators
- `engine/core/src/data/template-registry.ts` — ISO registry entries
- `engine/core/src/services/passport-documents.ts` + `passport-service.ts` — ISO doc wiring
- `engine/core/src/e2e/doc-generation-e2e.test.ts` — ISO e2e tests
- `cli/src/headless/fix.rs` + `doc.rs` — ISO CLI choices

**To restore later:**
```bash
git checkout archive/iso-42001 -- <paths>
# cherry-pick specific files as needed
```

**Reference:** Будущий milestone V2-M04 (предварительно) — интеграция ISO 42001 после стабилизации EU AI Act core.

## 9. Handoff

После GREEN:
- architect запускает E-1, E-2, E-3 (fix scripts + re-run)
- если 0 blockers → PR `feature/V1-M22-release-blockers` → `dev` (или rebased onto dev после PR #19 merge)
- user → merge → tag v1.0.0
