---
description: TRULY Deep E2E test — multi-profile coverage of complior pipeline (init/scan/eval/fix/passport/report) with 3 distinct profiles
allowed-tools: Bash, Read, Edit, Write, Monitor
---

# TRULY Deep E2E Test

Run the multi-profile end-to-end verification script and analyze the results.

## What this command does

1. Build release binary if missing: `cargo build -p complior-cli --release`
2. Start AI server (eval-target on `:4000`) if not already running
3. Run `scripts/verify_truly_deep_e2e.sh` which exercises **3 distinct profiles**:
   - **Profile A:** `deployer / limited / general` (baseline)
   - **Profile B:** `provider / high / healthcare` (high-risk medical AI)
   - **Profile C:** `deployer / minimal / finance` (low-risk fintech)
4. For each profile run **full coverage**:
   - `complior init` (with profile-specific onboarding answers)
   - **scan** ALL flag combos (`--json --sarif --quiet --ci --diff --comment --agent --deep --llm --deep --llm`)
   - **eval** ALL flag combos (`--det --security --categories --dry-run --concurrency --remediation --last --failures --ci --threshold` and optionally `--full`)
   - **fix** ALL flags (`--dry-run --json --source scan/eval/all --check-id --doc fria --doc all --ai`)
   - **passport** all 13 flows (init/list/show/validate/completeness/autonomy/notify/registry/permissions/evidence/audit/export a2a/aiuc-1/aiuc1/nist)
   - **report** 5 formats (`human/json/md/html/pdf` + `--share`)
5. Save snapshots to `tests/e2e-snapshots/profile-{A,B,C}/` (~ 40 files per profile)
6. Generate cross-profile comparison report at `docs/E2E-TRULY-DEEP-REPORT-{date}.md`
7. After script finishes:
   - Summarize the cross-profile comparison table (filterContext deltas)
   - Identify any profile-aware filtering gaps (e.g. Profile B should have MORE applicable obligations than Profile C)
   - Report any release blockers found vs UX nice-to-haves
   - Provide paths to HTML reports for visual inspection

## Arguments

Optional environment overrides (set BEFORE the slash command):
- `PROFILES="A B"` — run subset only (default: all 3)
- `SKIP_FULL_EVAL=1` — skip slow `eval --full` (default: run it)
- `SKIP_LLM=1` — skip all LLM-using flags (default: use OpenRouter)
- `AI_TARGET="http://..."` — alternative eval target

## Usage

```
/deep-e2e
```

## Steps you (the agent) should perform

1. Verify pre-flight:
   ```bash
   ls -la target/release/complior 2>&1 | head -1   # binary exists?
   curl -sf http://localhost:4000/health -m 3       # AI server up?
   echo "OPENROUTER key: ${OPENROUTER_API_KEY:+set}${OPENROUTER_API_KEY:-MISSING}"
   ```

2. If binary missing: `cargo build -p complior-cli --release`

3. If AI server down: spawn it from `~/test-projects/eval-target` via `npm run dev`

4. If OPENROUTER key missing: load from `~/.config/complior/credentials`

5. Run the script in **background with Monitor** (it takes 20-40 minutes):
   ```bash
   bash scripts/verify_truly_deep_e2e.sh > /tmp/deep-e2e-run.log 2>&1
   ```
   Use `run_in_background: true` and arm a Monitor that watches for `═══ TRULY Deep E2E complete ═══`.

6. After completion, read the generated report:
   ```
   docs/E2E-TRULY-DEEP-REPORT-{date}.md
   ```

7. Analyze cross-profile filterContext deltas:
   - Profile B (provider/high/healthcare) should have MORE `applicableObligations` than Profile C (deployer/minimal/finance)
   - Profile A baseline should fall in between
   - If filterContext is identical across profiles → profile-aware filtering broken

8. Inspect HTML reports for visual quality:
   ```bash
   for p in A B C; do
     echo "Profile $p HTML profile block:"
     awk '/<section id="company-profile"/,/<\/section>/' tests/e2e-snapshots/profile-$p/report.html | head -25
   done
   ```

9. Summarize findings:
   - ✅ What works
   - 🐛 Bugs found (categorize as release blocker vs UX polish)
   - 📊 Cross-profile comparison table
   - 📁 Artifact paths for user visual review (`/tmp/reports/` symlinks if needed)

10. If 0 release blockers → recommend tag v1.0.0; else create V1-MNN milestone.

## Output expected from you

A concise final report covering:
- Pass/fail counts per profile
- Cross-profile comparison (filterContext deltas)
- Bug list with severity classification
- Recommended next steps (tag v1.0.0, fix milestone, or investigate)
- Paths to HTML/PDF/MD/JSON reports for user inspection
