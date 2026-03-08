# Sprint S3.5 — United Sprint 1: CLI ↔ SaaS Integration Bridge

**Версия:** 1.2.0
**Дата:** 2026-03-04 — 2026-03-05 (completed)
**Статус:** DONE (8 US + 7 audit fixes)
**Cross-repo:** ~/complior (CLI, Rust + TS Engine) + ~/PROJECT (SaaS, Node.js + Next.js)
**SP:** 28 total (18 CLI-side + 10 SaaS-side)

---

## Обзор

Объединённый спринт, соединяющий два продукта — CLI (open-source TUI `npx complior`) и SaaS (Dashboard). До этого спринта CLI не имел ни одной строки кода для подключения к SaaS: не было `complior login`, не было sync API клиента, TUI показывал заглушку "Run `complior login` to sync".

**Цель:** *"CLI умеет аутентифицироваться в SaaS, синхронизировать passports/scans/документы в обе стороны, и TUI показывает реальный статус синхронизации."*

**Зависимости от SaaS (уже существовали до спринта):**
- Device Flow: POST /api/auth/device, POST /api/auth/token, POST /api/auth/device-confirm
- Sync API: POST /api/sync/passport, POST /api/sync/scan, GET /api/sync/status
- Data Bundle: GET /v1/data/bundle (ETag caching)

**Создано в SaaS в рамках этого спринта:**
- POST /api/sync/documents (US-U07)
- Obligation cross-mapping resolveObligations.js (US-U08)
- Extended SyncPassportSchema +8 полей (US-U09)
- CLI Score на Dashboard (US-U12)

---

## Dependency Graph

```
US-U01 (login 3SP) ─────┐
                         ├→ US-U04 (sync service 3SP) → US-U05 (passport push 3SP)
US-U02 (tokens 2SP) ────┘                             → US-U06 (scan push 2SP)
                                                       → US-U07* (doc sync 4SP)
US-U03 (logout 1SP) ─ после US-U02

US-U10 (data bundle 2SP) ─ после US-U04
US-U11 (TUI panel 2SP) ─ после US-U05
```

*US-U07 application logic на SaaS-стороне, Engine-клиент на CLI-стороне.

---

## User Stories (CLI-side)

### US-U01: Команда `complior login` — Device Flow Client (3 SP) ✅

Как разработчик, я хочу выполнить `complior login` в терминале, чтобы CLI автоматически получил JWT-токен от SaaS через Device Flow — безопасно, без ввода пароля в терминал.

**Acceptance Criteria:**
- [x] POST /api/auth/device → получить deviceCode + userCode
- [x] Показать userCode, открыть браузер (crate `open`)
- [x] Поллинг POST /api/auth/token каждые 5 сек (Pending → Success → Expired)
- [x] При Success: сохранить JWT в `~/.config/complior/credentials`
- [x] Корректная обработка Expired + Ctrl+C

**Файлы:**
- NEW: `cli/src/saas_client.rs` (~120 LOC) — `SaasClient` struct, `request_device_code()`, `poll_token()`
- NEW: `cli/src/headless/login.rs` (~80 LOC) — `run_login()` handler
- EDIT: `cli/src/cli.rs` — +`Login` command
- EDIT: `cli/src/headless/commands.rs` — +dispatch

---

### US-U02: Token Storage + Auto-Refresh (2 SP) ✅

Как разработчик, я хочу чтобы после `complior login` токены хранились безопасно и проверялись автоматически, чтобы мне не приходилось логиниться каждый раз.

**Acceptance Criteria:**
- [x] Tokens сохраняются в `~/.config/complior/credentials` (KEY=VALUE формат)
- [x] Поля: COMPLIOR_ACCESS_TOKEN, COMPLIOR_REFRESH_TOKEN, COMPLIOR_TOKEN_EXPIRES_AT, COMPLIOR_USER_EMAIL, COMPLIOR_ORG_NAME
- [x] `save_tokens()` — merge с существующими строками (сохраняет API_KEY и комментарии)
- [x] `load_tokens()` → `Option<StoredTokens>`
- [x] `is_authenticated()` — проверяет наличие + expiry
- [x] `chmod 0o600` на файл после записи (Unix)

**Файлы:**
- EDIT: `cli/src/config.rs` — +`StoredTokens` struct, +`save_tokens()`, +`load_tokens()`, +`clear_tokens()`, +`is_authenticated()`, +`credentials_path()`

**Примечание:** SaaS не имеет refresh endpoint. При протухшем токене — "Session expired, run `complior login` again".

---

### US-U03: Команда `complior logout` + Auth Status (1 SP) ✅

Как разработчик, я хочу выполнить `complior logout` для очистки токенов и видеть статус авторизации.

**Acceptance Criteria:**
- [x] `complior logout` → очистить все COMPLIOR_* ключи из credentials
- [x] Сообщение "Logged out. Tokens cleared"
- [x] Auth status в `complior doctor`: email, org, token expiry

**Файлы:**
- EDIT: `cli/src/headless/login.rs` — +`run_logout()`
- EDIT: `cli/src/cli.rs` — +`Logout` command
- EDIT: `cli/src/headless/commands.rs` — +dispatch

---

### US-U04: Engine SaaS Sync Service (3 SP) ✅

Как TS Engine, я хочу иметь сервис для синхронизации данных с SaaS, чтобы все sync-операции проходили через движок (который владеет данными).

**Архитектура:** CLI (Rust) → Engine (localhost:3099) → SaaS (app.complior.ai)

**Acceptance Criteria:**
- [x] `SaasClient` interface с 5 методами: syncPassport, syncScan, syncDocuments, syncStatus, fetchDataBundle
- [x] `createSaasClient(baseUrl)` factory → frozen object
- [x] Typed payload interfaces: `SyncPassportPayload` (18 полей), `SyncScanPayload`, `SyncDocPayload`
- [x] 4 Hono routes: POST /sync/passport, POST /sync/scan, POST /sync/documents, GET /sync/status
- [x] Token forwarded из CLI через request body
- [x] 30s timeout, structured error logging

**Файлы:**
- NEW: `engine/core/src/infra/saas-client.ts` (~113 LOC)
- NEW: `engine/core/src/http/routes/sync.route.ts` (~249 LOC)
- EDIT: `engine/core/src/http/create-router.ts` — +route registration

---

### US-U05: `complior sync` + Passport Push (3 SP) ✅

Как разработчик, я хочу выполнить `complior sync` для отправки всех Passports в SaaS, чтобы DPO видел все AI системы моего проекта в Dashboard.

**UX:**
```
$ complior sync
🔄 Syncing with SaaS (app.complior.ai)...

  Passports:
    ✅ claude-code-agent → created (ID: 42)
    ✅ copilot-assistant → updated (1 conflict: purpose → SaaS wins)
  📊 2 passports synced, 0 errors, 1 conflict
```

**Acceptance Criteria:**
- [x] `Sync { passport: bool, scan: bool, all: bool }` command в CLI
- [x] По умолчанию (без флагов) = `--all`
- [x] Проверка авторизации перед sync
- [x] Engine POST /sync/passport: read `.complior/passports/*.json` → map 36 полей → push
- [x] `mapPassport()`: AgentPassport → SyncPassportPayload (name, vendorName, description, purpose, domain, riskLevel, slug, autonomyLevel, etc.)
- [x] `mapDomain()`: manifest type + tools → SaaS domain enum
- [x] `mapRiskLevel()`: L1-L5 + text → minimal/limited/high/prohibited
- [x] `parseManifest()`: runtime validation (typeof + 'name' in parsed)
- [x] Null guard: skip invalid manifests with error in results

**Файлы:**
- NEW: `cli/src/headless/sync.rs` (~70 LOC)
- EDIT: `cli/src/cli.rs` — +`Sync` command
- EDIT: `cli/src/headless/commands.rs` — +dispatch
- EDIT: `engine/core/src/http/routes/sync.route.ts` — passport push logic

**Маппинг 36 → 18 полей:**

| AgentPassport | SaaS SyncPassportPayload |
|---------------|------------------------|
| name | name |
| owner.team | vendorName |
| owner.contact | vendorUrl |
| description | description |
| disclosure.disclosure_text | purpose |
| agent_id | slug |
| compliance.eu_ai_act.risk_class | riskLevel (mapped) |
| permissions.tools | detectionPatterns |
| version + manifest_version | versions |
| autonomy_level | autonomyLevel |
| framework | framework |
| model.provider | modelProvider |
| model.model_id | modelId |
| lifecycle.status | lifecycleStatus |
| compliance.complior_score | compliorScore |
| manifest_version | manifestVersion |
| signature | signature |
| owner + constraints + permissions + logging + interop + source + autonomy_evidence | extendedFields |

---

### US-U06: Scan Result Push (2 SP) ✅

Как разработчик, я хочу чтобы результаты `complior scan` автоматически пушились в SaaS (если авторизован).

**Два режима:**
1. **Explicit:** `complior sync --scan` — пушит последний скан
2. **Auto:** `complior scan` пушит автоматически, если authenticated (opt-out через `--no-sync`)

**Acceptance Criteria:**
- [x] Engine POST /sync/scan: read last scan → map projectPath, score, findings[], toolsDetected[]
- [x] Auto-sync: `scan.route.ts` extended с `saasToken` в Zod-схеме
- [x] Post-scan hook: если saasToken есть → вызвать syncScan (non-blocking, catch errors)
- [x] CLI: `--no-sync` flag

**Файлы:**
- EDIT: `engine/core/src/http/routes/scan.route.ts` — +auto-sync hook, +Zod fields
- EDIT: `engine/core/src/http/routes/sync.route.ts` — scan push logic
- EDIT: `cli/src/cli.rs` — +`--no-sync` flag
- EDIT: `cli/src/headless/commands.rs` — pass token to scan

---

### US-U10: Data Bundle Client — Pull Regulation Data (2 SP) ✅

Как CLI Engine, я хочу скачивать актуальные regulation data с SaaS API, чтобы использовать самые свежие данные вместо встроенных.

**Acceptance Criteria:**
- [x] `createBundleFetcher(saasUrl, cacheDir)` factory
- [x] `fetchIfUpdated()`: ETag из cache → GET /v1/data/bundle с If-None-Match → 304 skip / 200 save
- [x] `getBundle()`: online → cache → embedded fallback
- [x] Cache: `bundle.json` + `bundle.etag` в cacheDir
- [x] Background fetch при запуске daemon (5s delay)

**Файлы:**
- NEW: `engine/core/src/infra/bundle-fetcher.ts` (~77 LOC)

---

### US-U11: TUI Sync Panel — Real Status (2 SP) ✅

Как разработчик, я хочу видеть в TUI Dashboard реальный статус синхронизации с SaaS.

**Было:**
```
┌─ SaaS Sync ─────────────┐
│ Not connected            │
│ Run `complior login`     │
└──────────────────────────┘
```

**Стало:**
```
┌─ SaaS Sync ──────────────┐
│ ● Connected (Acme Corp)  │
│ Last sync: 2 min ago     │
│ Passports: 3 synced      │
│ Scans: 5 pushed          │
│ [S] Sync now  [L] Logout │
└───────────────────────────┘
```

**Acceptance Criteria:**
- [x] Если authenticated → зелёный индикатор, email, org, stats
- [x] Если не authenticated → текущая заглушка
- [x] Горячие клавиши: `S` = sync now, `L` = logout
- [x] Background poll: GET /sync/status через Engine каждые 30 сек

**Файлы:**
- EDIT: `cli/src/views/dashboard/panels.rs` — replace sync section (~50 LOC)

---

## Code Audit (Post-Sprint)

Полный аудит всех файлов Sprint S3.5 против coding standards. 11 проблем найдено и исправлено.

### PANIC — 4 locations

| # | Файл | Строка | Проблема | Исправление |
|---|------|--------|----------|-------------|
| 1 | `cli/src/views/dashboard/panels.rs` | 215 | `&msg[..w.saturating_sub(15)]` — byte-slicing crash на em-dash `—` (3 bytes) | `crate::views::truncate_str()` |
| 2 | `cli/src/views/obligations/render.rs` | 146 | `&obl.title[..title_w.saturating_sub(3)]` | `crate::views::truncate_str()` |
| 3 | `cli/src/views/passport/mod.rs` | 306 | `&name[..name_w.saturating_sub(3)]` | `crate::views::truncate_str()` |
| 4 | `cli/src/views/passport/mod.rs` | 609 | `&field.value[..w.saturating_sub(3)]` | `crate::views::truncate_str()` |

**Fix:** Создан `truncate_str()` helper в `cli/src/views/mod.rs`:
```rust
pub fn truncate_str(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars { return s.to_string(); }
    let truncated: String = s.chars().take(max_chars.saturating_sub(3)).collect();
    format!("{truncated}...")
}
```

### HIGH — 6 violations

| # | Файл | Проблема | Исправление |
|---|------|----------|-------------|
| 1 | `saas-client.ts:68,82,108` | `resp.json() as Promise<...>` — `as` type assertion | `const data: Record<...> = await resp.json()` |
| 2 | `scan.route.ts:26,32` | `(body as Record<...>)['saasToken']` | Extended Zod schema с `saasToken`, `saasUrl` |
| 3 | `sync.route.ts:54` | `manifest.lifecycle?.status as string` | `?? undefined` |
| 4 | `sync.route.ts:115,155` | `JSON.parse(content) as AgentPassport` | `parseManifest()` helper с `'name' in parsed` + null guard |
| 5 | `bundle-fetcher.ts:37` | `JSON.parse(content) as Record<...>` | Type annotation |
| 6 | `config.rs:296` | Credentials file world-readable (default 644) | `#[cfg(unix)] set_permissions(path, 0o600)` |

---

## E2E Verification

| # | Тест | Результат |
|---|------|-----------|
| 1 | `complior login` → браузер, user_code, поллинг, токен в credentials | PASS |
| 2 | `complior sync` → passports push → created/updated/conflicts | PASS |
| 3 | `complior scan` + auto-sync → scan results в SaaS | PASS |
| 4 | `complior sync --docs` → 8 документов в SaaS Documents | PASS |
| 5 | `complior logout` → токены очищены, TUI "Not connected" | PASS |
| 6 | TUI Sync panel → "● Connected (Org)", stats, hotkeys | PASS |
| 7 | TUI все 8 страниц без crash (включая UTF-8 em-dash) | PASS |
| 8 | Engine /sync/passport → SaaS API → 200 | PASS |
| 9 | Engine /sync/scan → SaaS API → 200 | PASS |
| 10 | Engine /sync/documents → SaaS API → 200 | PASS |
| 11 | Engine /sync/status → authenticated: true, stats | PASS |
| 12 | GET /v1/data/bundle → 4983 tools, 108 obligations | PASS |

---

## Metrics

| Metric | Value |
|--------|-------|
| User Stories | 8 (CLI-side) |
| Story Points | 18 (CLI) + 10 (SaaS) = 28 total |
| New files | 6 (3 Rust, 3 TypeScript) |
| Modified files | 9 |
| New LOC | ~709 |
| Audit fixes | 11 (4 PANIC + 6 HIGH + 1 HIGH permissions) |
| E2E tests | 12/12 PASS |
| Duration | 2 days |
