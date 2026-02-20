# Sprint: Onboarding Rewrite

> Based on: `tmp/COMPLIOR-ONBOARDING-SPEC.md` v1.0
> Scope: TUI onboarding wizard — full rewrite to match spec
> Branch: `dev`

---

## Problem

Current onboarding is a stub: 6 irrelevant hardcoded steps (industry, company_size, ai_use_cases, risk_level, deployment, timeline), never auto-triggered, doesn't save config properly, doesn't match the spec at all.

## Goal

10-step interactive onboarding wizard per spec, triggered on first launch, saves to `~/.complior/config.json` + `~/.complior/credentials`, runs first scan on completion.

---

## User Stories

### US-1: Auto-trigger onboarding on first launch (2 SP)

**As** a new user, **I want** the onboarding wizard to start automatically when I run `complior` for the first time, **so that** I'm guided through setup.

**AC:**
- If `~/.complior/config.json` does not exist OR `onboarding_complete: false` → show onboarding overlay
- If config exists with `onboarding_complete: true` → skip, show "Welcome back!" in chat
- Replace current `GettingStarted` overlay with the onboarding wizard
- `complior init` CLI command also triggers onboarding (re-run)

**Files:** `main.rs`, `app/mod.rs`, `config.rs`

---

### US-2: Step 1 — Welcome + Theme Selection (3 SP)

**As** a user, **I want** to pick a theme on the first step with a live diff preview, **so that** the TUI looks right in my terminal.

**AC:**
- Show ASCII owl mascot + "Welcome to Complior v1.0.0"
- 4 theme options: Dark, Light, Dark (colorblind), Light (colorblind)
- Arrow keys switch theme; diff preview updates in real-time
- Enter confirms, saves `config.theme`
- Map to existing themes: dark→"dark", light→"light", dark-cb→"nord", light-cb→"solarized"

**Files:** `views/onboarding.rs` (new step type: `ThemeSelect`)

---

### US-3: Step 2 — Navigation Mode (1 SP)

**As** a user, **I want** to choose between Standard (arrow keys) and Vim-style navigation, **so that** the TUI matches my workflow.

**AC:**
- 2 options with multi-line descriptions
- This step always uses Standard mode (arrows) since user hasn't chosen yet
- After choosing Vim → remaining onboarding steps use Vim keys
- Saves `config.navigation = "standard" | "vim"`

**Files:** `views/onboarding.rs`, `config.rs` (add `navigation` field)

---

### US-4: Step 3 — AI Provider Connection (5 SP)

**As** a user, **I want** to choose my AI provider and enter an API key, **so that** Complior can use AI-powered analysis.

**AC:**
- 4 options: OpenRouter, Anthropic, OpenAI, Offline
- Selecting 1-3 shows a text input for API key (masked with `████`)
- Key validation via engine `/provider/validate` endpoint (or simple format check)
- On valid: show "Valid. X models available."
- On invalid: show "Invalid key. Try again? (Y/n)"
- Offline: show info message about limited features
- Save provider choice to `config.auth.method`
- Save API key to `~/.complior/credentials` (separate file, not in config)
- New step type: `TextInput` with masked input

**Files:** `views/onboarding.rs` (new `TextInput` step type), `config.rs` (add `auth` section)

---

### US-5: Step 4 — Project Type (2 SP)

**As** a user, **I want** to specify if this is an existing, new, or demo project, **so that** Complior knows what to do on completion.

**AC:**
- 3 options: Existing (scan on complete), New (scaffold compliance files), Just exploring (demo data)
- Selection determines Step 10 behavior
- Saves `config.project_type = "existing" | "new" | "demo"`

**Files:** `views/onboarding.rs`

---

### US-6: Step 5 — Workspace Trust (1 SP)

**As** a user, **I want** to confirm workspace access before scanning, **so that** I don't accidentally scan the wrong folder.

**AC:**
- Show current project path
- "Yes, I trust this folder" / "No, exit"
- "No" → exit with message "Run complior in a trusted folder."
- Skip this step for `project_type = "demo"`
- Saves `config.workspace`

**Files:** `views/onboarding.rs`, `app/mod.rs` (exit handling)

---

### US-7: Step 6 — Jurisdiction (1 SP)

**As** a user, **I want** to select my jurisdiction, **so that** the right regulations are applied.

**AC:**
- 6 options: EU/EEA, UK, EU+UK, US, Global, Not sure
- UK/US/Global show "coming soon, EU AI Act applied" info
- Saves `config.jurisdiction`

**Files:** `views/onboarding.rs`

---

### US-8: Step 7 — Role in AI Value Chain (1 SP)

**As** a user, **I want** to specify my company's role (deployer/provider/both), **so that** the right obligations apply.

**AC:**
- 4 options: Deployer, Provider, Both, Not sure (auto-detect)
- Show obligation counts: "Providers: ~30. Deployers: ~10."
- Saves `config.role`

**Files:** `views/onboarding.rs`

---

### US-9: Step 8 — Industry/Domain (2 SP)

**As** a user, **I want** to select my industry, **so that** high-risk classification is detected.

**AC:**
- 10 options with HIGH RISK warnings on applicable domains
- HIGH RISK selection shows confirmation dialog
- Saves `config.industry`

**Files:** `views/onboarding.rs`

---

### US-10: Step 9 — Scan Scope (2 SP)

**As** a user, **I want** to choose what Complior scans, **so that** I control the scan depth.

**AC:**
- Multi-select checkboxes: Dependencies, Env vars, Source code (default ON), Infrastructure, Documentation (default OFF)
- Shortcuts: `a` = select all, `n` = minimum
- Skip for `project_type != "existing"`
- Saves `config.scan_scope`

**Files:** `views/onboarding.rs`

---

### US-11: Step 10 — First Scan + Summary (3 SP)

**As** a user, **I want** to see a summary and first scan results on completing onboarding, **so that** I immediately see my compliance status.

**AC:**
- Show config summary (jurisdiction, role, industry, scope)
- Variant A (existing): run `/scan`, show results table + "What's next" commands
- Variant B (new): create compliance scaffold files, show created files list
- Variant C (demo): show fake sample scan with 3 AI tools
- Close wizard, mark `onboarding_complete: true`
- Auto-trigger scan command after wizard closes (for existing projects)

**Files:** `views/onboarding.rs`, `app/mod.rs` (post-onboarding actions), `engine_client.rs` (scan trigger)

---

### US-12: Config persistence + credentials (2 SP)

**As** a user, **I want** my onboarding answers saved to `~/.complior/config.json` and API keys in `~/.complior/credentials`, **so that** I don't have to repeat setup.

**AC:**
- New config format: JSON (not TOML) at `~/.complior/config.json`
- Keep backward compat: still read `tui.toml` if it exists, migrate on save
- Credentials file: `~/.complior/credentials` (KEY=value format)
- Auto-add `.complior/credentials` to `.gitignore` if project has one
- `complior config --reset` deletes config, next launch re-triggers onboarding

**Files:** `config.rs` (major rewrite), new `credentials.rs`

---

### US-13: Conditional step skipping (1 SP)

**As** a user, **I want** irrelevant steps to be skipped based on my choices, **so that** onboarding is fast.

**AC:**
- `project_type = "demo"` → skip Step 5 (workspace trust) and Step 9 (scan scope)
- `project_type = "new"` → skip Step 9 (scan scope)
- Step counter adjusts: "Step N of M" where M = actual steps shown

**Files:** `views/onboarding.rs` (step skip logic)

---

### US-14: Edge cases (2 SP)

**As** a user, **I want** onboarding to handle interruptions gracefully.

**AC:**
- Ctrl+C during onboarding → save completed steps, resume from last step on next launch
- `CI=true` env var → skip onboarding entirely, use defaults
- `--yes` / `-y` flag → skip interactive, use all defaults (EU, deployer, general, deps+env+source)
- Empty folder + "Existing project" → "No files found. Did you mean 'New project'?" prompt

**Files:** `views/onboarding.rs`, `config.rs` (partial save), `cli.rs` (add `-y` flag)

---

## Summary

| US | Title | SP |
|----|-------|-----|
| US-1 | Auto-trigger | 2 |
| US-2 | Welcome + Theme | 3 |
| US-3 | Navigation Mode | 1 |
| US-4 | AI Provider Connection | 5 |
| US-5 | Project Type | 2 |
| US-6 | Workspace Trust | 1 |
| US-7 | Jurisdiction | 1 |
| US-8 | Role | 1 |
| US-9 | Industry/Domain | 2 |
| US-10 | Scan Scope | 2 |
| US-11 | First Scan + Summary | 3 |
| US-12 | Config + Credentials | 2 |
| US-13 | Conditional Skipping | 1 |
| US-14 | Edge Cases | 2 |
| **Total** | | **28 SP** |

## Key Files to Modify

| File | Change |
|------|--------|
| `tui/src/views/onboarding.rs` | Full rewrite — 10 steps, new types (ThemeSelect, TextInput, Checkbox), conditional skipping, 3 completion variants |
| `tui/src/config.rs` | New JSON config format, migration from TOML, new fields (navigation, auth, project_type, workspace, jurisdiction, role, industry, scan_scope) |
| `tui/src/app/mod.rs` | Auto-trigger onboarding, post-completion actions (scan, scaffold, demo) |
| `tui/src/main.rs` | Replace GettingStarted with onboarding trigger, `-y` flag |
| `tui/src/cli.rs` | Add `-y`/`--yes` flag |
| `tui/src/credentials.rs` | NEW — credential file read/write |
| `tui/src/input.rs` | TextInput handling in onboarding overlay |

## Dependencies

- Engine must be running for Step 10 scan (already handled)
- Engine `/provider/validate` endpoint needed for Step 4 key validation (or client-side format check)
