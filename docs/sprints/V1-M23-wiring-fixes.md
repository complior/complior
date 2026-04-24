# V1-M23: Runtime Wiring Fixes — v1.0.0 Release Final

> **Status:** 🔴 RED — RED runtime integration tests written, awaiting implementation
> **Branch:** `feature/V1-M23-wiring-fixes` (chained from `feature/V1-M22-release-blockers`)
> **Created:** 2026-04-24
> **Author:** Architect
> **Triggered by:** V1-M21 re-run on eval-target (47/61 PASS) — 4 release blockers remain
> **Predecessor:** V1-M22 release-blockers (unit tests GREEN, runtime broken)
> **Successor:** V1-M21 final re-run → merge V1-M23 → tag v1.0.0

---

## 1. Goal

Закрыть 4 runtime wiring gaps от V1-M22, выявленные на eval-target в V1-M21 re-run. Unit tests V1-M22 проверяли наличие функций, но не проверяли что они подключены к user-facing CLI/HTTP вызовам.

**Critical insight:** unit tests ≠ integration tests. V1-M23 RED тесты — RUNTIME integration tests, проверяющие конкретный CLI invocation path.

## 2. Scope

### Wiring tasks (4) — release blockers

| ID | Issue | Текущее поведение | Ожидаемое | Owner |
|----|-------|-------------------|-----------|-------|
| W-1 | scan --json missing `disclaimer` field | JSON top-level keys: `[..., filterContext, ...]` без `disclaimer` | `disclaimer` присутствует, как в eval JSON | nodejs-dev |
| W-2 | report --output ignored for md/html/pdf | CLI прёт "Report saved to: /tmp/foo.html" но файл попадает в `.complior/reports/compliance-report-{ts}.html` | Файл создаётся по точному пути из `--output` | nodejs-dev (engine) + rust-dev (CLI flag forwarding) |
| W-3 | passport notify route returns 404 | `complior passport notify <agent>` → CLI зовёт `POST /passport/notify` → engine 404 | Route registered, returns notification template, persists to `.complior/notifications/` | nodejs-dev (route + service) |
| W-4 | aiuc1 alias rejected at runtime | `complior passport export <name> --format aiuc1` → "Invalid format" | Принимает `aiuc1` как алиас `aiuc-1` | rust-dev (clap value_parser config) |

### Test infrastructure (5) — architect

| ID | Issue | Fix |
|----|-------|-----|
| TS-6 | `passport list --json` parsing returns empty (jq path wrong) | Discover actual JSON structure, fix jq filter |
| TS-7 | E-12 pre-filter check looks at eval log, но filterContext в scan JSON | Move check to scan output |
| TS-8 | F-9/F-10 (iso42001-soa, risk-register) marked FAIL — но это expected (C-3 removal) | Mark as expected failures or remove from script (use only EU AI Act doc types) |
| TS-9 | F-7 `--check-id <real-id>` exit ≠ 0 — was D-2 supposed to make it exit 0 for "no auto-fix"? | Verify D-2 implementation: only exit 2 for actual fix failure, exit 0 for "no fix available" |
| TS-10 | Bash error `passport: command not found` on line 310 (variable expansion issue) | Quote variables properly |

## 3. Предусловия среды

- [x] V1-M22 ветка merged into V1-M23 base ✅
- [x] eval-target ready (`~/test-projects/eval-target/`)
- [x] OPENROUTER_API_KEY in `~/.config/complior/credentials`
- [ ] V1-M23 RED tests written (этот коммит)
- [ ] `cd engine/core && npm test` — RED runtime tests красные, build green
- [ ] `cargo test -p complior-cli` — RED runtime tests красные, build green

## 4. RED Tests (this commit)

**Architecture principle:** все RED тесты должны проверять **runtime behavior через user invocation path**, не только наличие функций.

### W-1 RED: scan --json output integration test

`engine/core/src/services/scan-service-disclaimer-wiring.test.ts`:
```typescript
// Calls actual scanService.scan() and checks returned ScanResult has disclaimer
const result = await scanService.scan(testProjectPath);
expect(result.disclaimer).toBeDefined();
expect(result.disclaimer.summary).toBeTruthy();
```

### W-2 RED: report --output integration test

`engine/core/src/services/report-output-path-wiring.test.ts`:
```typescript
// Call reportService with explicit --output path
const tmpPath = '/tmp/m23-test-report.html';
await reportService.generate({ format: 'html', output: tmpPath });
expect(existsSync(tmpPath)).toBe(true);
```

### W-3 RED: passport notify route registration test

`engine/core/src/http/routes/passport-notify-route.test.ts`:
```typescript
// In-memory Hono app, fetch POST /passport/notify
const app = createApp(deps);
const res = await app.request('/passport/notify', {
  method: 'POST',
  body: JSON.stringify({ name: 'test-agent' }),
});
expect(res.status).toBe(200); // Currently 404
```

### W-4 RED: CLI aiuc1 alias acceptance test

`cli/src/headless/tests.rs::passport_export_format_aiuc1_actually_accepted`:
```rust
// Invoke clap parser, verify aiuc1 is accepted (not just defined in source)
let cli = Cli::try_parse_from(vec![
    "complior", "passport", "export", "test", "--format", "aiuc1"
]);
assert!(cli.is_ok(), "aiuc1 must be accepted at runtime: {:?}", cli.err());
```

## 5. Tasks Table

| # | Задача | Agent | RED Test | Verification | Architecture |
|---|--------|-------|----------|--------------|--------------|
| W-1 | Wire `buildScanDisclaimer` в scan-service output (mirror eval-service pattern) | nodejs-dev | `scan-service-disclaimer-wiring.test.ts` GREEN | `complior scan --json \| jq '.disclaimer'` ≠ null | Object.freeze, reuse buildEvalDisclaimer pattern, no duplication |
| W-2 | Honor `--output` в report для md/html/pdf | nodejs-dev | `report-output-path-wiring.test.ts` GREEN | `complior report --format html --output /tmp/x.html` создаёт `/tmp/x.html` | Pure path resolution, no implicit fallback to .complior/reports/ |
| W-3 | Register `POST /passport/notify` route in engine | nodejs-dev | `passport-notify-route.test.ts` GREEN (status 200) | `curl -X POST http://localhost:3099/passport/notify -d '{"name":"x"}'` returns 200 + content | Route factory fn, validate body via Zod |
| W-4 | clap value_parser реально принимает `aiuc1` | rust-dev | `passport_export_format_aiuc1_actually_accepted` GREEN | `complior passport export <name> --format aiuc1` exit 0 | clap value_parser list includes both forms |
| TS-6..TS-10 | Test script polish | architect | Re-run shows N PASS / 0 real-bug FAIL | architect after W-1..W-4 GREEN | bash strict mode, proper quoting |

## 6. Acceptance Criteria

- [ ] All 4 RED runtime tests GREEN
- [ ] V1-M21 re-run after V1-M23: 0 real release blockers
- [ ] `complior scan --json | jq '.disclaimer'` returns non-null
- [ ] `complior report --format html --output /tmp/foo.html` creates `/tmp/foo.html`
- [ ] `complior passport notify <agent>` returns success (no 404)
- [ ] `complior passport export <name> --format aiuc1` exit 0
- [ ] Full unit suite GREEN: 2517+ tests
- [ ] tsc --noEmit clean

## 7. Out of Scope

- New features
- Architectural refactoring
- ISO 42001 reintegration (V2-M04 tentative)
- SDK / MCP / Guard (V2-M01..M03)

## 8. Handoff

После W-1..W-4 GREEN:
- architect (Section E): TS-6..TS-10 test script fixes, re-run E2E
- Если 0 real release blockers → PR `feature/V1-M23-wiring-fixes` → `dev` (с merge V1-M22 + V1-M21 + V1-M20 commits chained)
- user мержит → tag v1.0.0
