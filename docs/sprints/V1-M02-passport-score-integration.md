# Milestone V1-M02: Full CLI Flag Coverage (E2E)

> **Status:** ✅ DONE
> **Feature Areas:** All (FA-01..FA-08) — каждая CLI команда со всеми флагами
> **Created:** 2026-04-10, **Updated:** 2026-04-11, **Completed:** 2026-04-11
> **Target:** Доказать что ВСЕ флаги каждой v1.0 CLI команды работают E2E
> **Blocked by:** V1-M01 ✅
> **Blocks:** V1-M03

---

## 1. Скоуп v1.0

v1.0 = ТОЛЬКО pipeline команды + Agent Passport:
- `complior init` (--yes, --force)
- `complior scan` (--json, --sarif, --ci, --threshold, --fail-on, --diff, --deep, --llm, --quiet, --agent)
- `complior eval` (--det, --llm, --security, --full, --json, --ci, --categories, --last, --remediation, etc.)
- `complior fix` (--dry-run, --json, --ai, --source, --check-id)
- `complior report` (--format human/json/md/html/pdf, --json, --share, --output)
- `complior passport` (init, list, show, validate, completeness, evidence, export, rename, autonomy, notify, registry, permissions)
- `complior fix --doc` (fria, soa, risk-register, policy, notify)

НЕ входит в v1.0: daemon, chat, supply-chain, cost, debt, simulate, jurisdiction, proxy, doc, import, redteam, tools, login/logout, sync.

---

## 2. Контекст

### 2.1 Что доказано в V1-M01
- Happy path: init → scan → fix → report работает
- Graceful degradation без API key
- HTML/JSON/MD export formats
- Pipeline E2E через Hono

### 2.2 Что НЕ доказано (цель M02)
- Продвинутые флаги scan: --diff, --fail-on, --sarif, --agent, SBOM
- Все режимы eval: --det, --security, --categories, --last, --remediation
- Fix: --check-id (точечный fix), --source eval, undo/history
- Report: --share (offline HTML), --pdf, все 7 readiness dimensions
- Agent: validate, completeness, autonomy, export, rename, notify, registry, permissions
- Интеграция: passport → score, fix → rescan → score grows, FRIA → passport

---

## 3. Test Specifications (RED → GREEN)

### 3.1 Scan Flags E2E (6 тестов)
| File: `engine/core/src/e2e/scan-flags-e2e.test.ts` |
| Test | Endpoint | Expected |
|------|----------|----------|
| scan diff returns scoreBefore/scoreAfter/delta | POST /scan/diff | scoreBefore, scoreAfter, scoreDelta numbers |
| scan diff markdown flag | POST /scan/diff {markdown:true} | markdown string in response |
| findings have severity for --fail-on | POST /scan | All findings have valid severity |
| SBOM generates CycloneDX 1.5 | GET /sbom | bomFormat=CycloneDX, components array |
| scan includes agentSummaries | POST /scan (after agent init) | agentSummaries array |
| scan includes regulationVersion | POST /scan | regulationVersion with version/checkCount |

### 3.2 Eval Flags E2E (9 тестов)
| File: `engine/core/src/e2e/eval-flags-e2e.test.ts` |
| Test | Endpoint | Expected |
|------|----------|----------|
| eval --det deterministic only | POST /eval/run {det:true} | All results method=deterministic |
| eval --security OWASP probes | POST /eval/run {security:true} | securityScore, owaspCategory |
| eval --categories filter | POST /eval/run {categories:[...]} | Only filtered categories |
| eval --last returns previous | GET /eval/last | overallScore, grade |
| eval --last 404 when empty | GET /eval/last | 404 with NOT_FOUND |
| eval findings as scanner format | GET /eval/findings | checkId, type, message |
| eval --remediation report | POST /eval/remediation-report | score, grade, actions, markdown |
| eval list results | GET /eval/list | results array, judgeConfigured |
| eval validation (no target) | POST /eval/run {} | 400 error |

### 3.3 Fix & Report Flags E2E (10 тестов)
| File: `engine/core/src/e2e/fix-report-flags-e2e.test.ts` |
| Test | Endpoint | Expected |
|------|----------|----------|
| fix preview list | GET /fix/preview | count, fixes array |
| fix preview specific checkId | POST /fix/preview {checkId} | checkId, fixType, actions |
| fix apply single --check-id | POST /fix/apply {checkId} | applied, scoreBefore/After |
| fix history | GET /fix/history | fixes array with id/status |
| fix undo | POST /fix/undo | validation result |
| report status JSON | GET /report/status | readinessScore 0-100 |
| report --share offline HTML | POST /report/share | path to HTML file |
| report --format markdown | POST /report/status/markdown | path to MD file |
| report --format pdf | POST /report/status/pdf | path to PDF file |
| report 7 readiness dimensions | GET /report/status | All 7 dimensions present |

### 3.4 Passport Flags E2E (11 тестов)
| File: `engine/core/src/e2e/agent-flags-e2e.test.ts` |
| Test | Endpoint | Expected |
|------|----------|----------|
| passport validate | GET /passport/validate | valid, issues, signatureValid, completeness |
| passport completeness | GET /passport/completeness | completeness, completed_fields, total_fields |
| passport autonomy L1-L5 | GET /passport/autonomy | agents with level 1-5 |
| passport export A2A | GET /passport/export?format=a2a | format=a2a, data object |
| passport export AIUC-1 | GET /passport/export?format=aiuc-1 | format=aiuc-1 |
| passport export invalid format | GET /passport/export?format=bad | 400 error |
| passport rename | POST /passport/rename | success, newName |
| passport notify (worker notification) | POST /fix/doc/notify | path, content, timestamp |
| passport registry | GET /passport/registry | agents array |
| passport permissions matrix | GET /passport/permissions | matrix array |
| passport evidence verify | GET /passport/evidence/verify | verified, entries, issues |
| passport audit summary | GET /passport/audit/summary | total_events, by_type |
| passport init --force | POST /passport/init {force:true} | Re-creates passport |

### 3.5 Existing E2E Tests (уже написаны)
| File | Tests | Status |
|------|-------|--------|
| passport-pipeline-e2e.test.ts | 4 (init, score, fria, evidence) | ❌ RED |
| score-integration-e2e.test.ts | 4 (fix→rescan, doc edit, SDK, report) | ❌ RED |

### 3.6 Acceptance Scripts
| Script | Описание | Критерий PASS |
|--------|----------|---------------|
| `scripts/verify_score_growth.sh` | init → scan → fix → rescan → score grew | Score delta ≥ 0 |
| `scripts/verify_manual_edit_score.sh` | scan → write doc → rescan → improved | Score delta ≥ 0 |
| `scripts/verify_fria_flow.sh` | passport init → fix --doc fria → fria_completed → evidence | passport updated |
| `scripts/verify_api_key_handling.sh` | with/without key → graceful | No crash |
| `scripts/verify_agent_cli.sh` | passport init→list→show→validate→completeness→evidence→export→autonomy | 10/10 PASS |

### 3.7 Contract Tests
| Test ID | File | Expected |
|---------|------|----------|
| sync_report_types_match | sync-contract.test.ts | TS↔Rust roundtrip |
| sync_scan_result_complete | sync-contract.test.ts | All fields preserved |

---

## 4. Implementation Tasks

| # | Задача | Агент | Метод верификации | Файлы |
|---|--------|-------|-------------------|-------|
| 1 | Scan flags E2E (6 тестов) | nodejs-dev | scan-flags-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 2 | Eval flags E2E (9 тестов) | nodejs-dev | eval-flags-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 3 | Fix+Report flags E2E (10 тестов) | nodejs-dev | fix-report-flags-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 4 | Agent flags E2E (11 тестов) | nodejs-dev | agent-flags-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 5 | Passport pipeline E2E (4 теста) | nodejs-dev | passport-pipeline-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 6 | Score integration E2E (4 теста) | nodejs-dev | score-integration-e2e.test.ts GREEN | engine/core/src/e2e/ |
| 7 | All acceptance scripts PASS | nodejs-dev | scripts/verify_*.sh | scripts/ |
| 8 | Contract sync Rust↔TS | rust-dev | sync-contract.test.ts GREEN | types/ |

---

## 5. Предусловия среды

- [x] V1-M01 DONE
- [ ] Test project `test-projects/acme-ai-support/` with passports
- [ ] OPENROUTER_API_KEY for LLM tests
- [ ] COMPLIOR_EVAL_TARGET for eval tests (e.g. http://localhost:4000/api/chat)

---

## 6. Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| scan-flags-e2e.test.ts: 6 GREEN | vitest |
| eval-flags-e2e.test.ts: 9 GREEN (non-target tests always, target tests with env) | vitest |
| fix-report-flags-e2e.test.ts: 10 GREEN | vitest |
| agent-flags-e2e.test.ts: 11 GREEN | vitest |
| passport-pipeline-e2e.test.ts: 4 GREEN | vitest |
| score-integration-e2e.test.ts: 4 GREEN | vitest |
| scripts/verify_agent_cli.sh PASS | bash |
| scripts/verify_score_growth.sh PASS | bash |
| scripts/verify_fria_flow.sh PASS | bash |
| scripts/verify_api_key_handling.sh PASS | bash |
| Total E2E: 44 tests GREEN, 0 RED | vitest |
