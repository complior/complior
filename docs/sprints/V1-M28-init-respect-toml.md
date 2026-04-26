# V1-M28: `complior init --yes` Must Respect Existing project.toml

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M28-init-respect-toml` (from dev post-V1-M27)
> **Created:** 2026-04-26
> **Author:** Architect
> **Triggered by:** `/deep-e2e` cross-profile test failed — all 3 profiles tested as default deployer/limited/general because init --yes overwrote pre-set project.toml
> **Predecessor:** V1-M27 HTML report UX
> **Successor:** Final `/deep-e2e` verification → tag v1.0.0

---

## 1. Goal

Закрыть последний release blocker для tag v1.0.0: **`complior init --yes` ИГНОРИРУЕТ существующий profile в `.complior/project.toml`** и записывает auto-detected defaults.

### Демонстрация бага

```bash
# Step 1: User pre-sets profile via TOML
mkdir -p ~/myproject/.complior
cat > ~/myproject/.complior/project.toml << EOF
role = "provider"
industry = "healthcare"
[onboarding_answers]
org_role = "provider"
domain = "healthcare"
data_types = ["sensitive", "biometric"]
EOF

# Step 2: Run init --yes
cd ~/myproject && complior init --yes
# → "Role: deployer, Risk Level: limited, Obligations: 16 applicable"
#                                               ↑ default values used
#                                                 instead of user's TOML

# Step 3: Verify
cat .complior/profile.json | jq '.organization.role'
# → "deployer"  ← ДОЛЖНО быть "provider"
```

## 2. Root cause

`cli/src/headless/interactive.rs:229` — `build_default_answers(questions_json)` строит answers из `question.default` field (the question's hardcoded default), **не из существующего project.toml**.

Затем `commands.rs:425-428`:
```rust
interactive::build_default_answers(&questions_json)
let body = serde_json::json!({ "answers": answers });
client.post_json("/onboarding/complete", &body).await
```

Передаёт defaults в engine, который через `wizard.complete()` → `buildProfile()` строит профиль из этих defaults.

## 3. Scope

### W-1 (rust-dev): Read existing project.toml in `--yes` mode

`cli/src/headless/commands.rs::run_init`:
- Если `--yes` AND `.complior/project.toml` exists AND имеет `[onboarding_answers]` секцию:
  - Загрузить existing answers из TOML
  - Передать их в `/onboarding/complete` (вместо `build_default_answers`)
- Если TOML отсутствует ИЛИ нет `[onboarding_answers]` — fallback на defaults (текущее поведение)

### W-2 (rust-dev): Helper fn `load_existing_answers_from_toml`

Read `.complior/project.toml`, extract `[onboarding_answers]` table, convert to `serde_json::Value` for engine.

### W-3 (architect — script update)

`scripts/verify_truly_deep_e2e.sh::setup_profile_toml` — already writes `[onboarding_answers]` table (we did this in V1-M27 era). Verify format matches what V1-M28 expects.

## 4. RED Tests

### Rust integration test
`cli/src/headless/tests.rs::init_yes_respects_existing_toml_profile`:
- Setup: write project.toml with role=provider, industry=healthcare, [onboarding_answers]
- Action: simulate `init --yes` flow (via fn under test)
- Assert: returned answers contain provider/healthcare (not deployer/general defaults)

### TS integration test
`engine/core/src/onboarding/wizard-respects-toml.test.ts`:
- Verify wizard.complete() returns profile matching input answers
- (already covered by existing onboarding tests, but adds explicit assertion)

## 5. Tasks Table

| # | Task | Agent | RED Test |
|---|------|-------|----------|
| W-1 | `--yes` reads project.toml `[onboarding_answers]` | rust-dev | `init_yes_respects_existing_toml_profile` |
| W-2 | Helper `load_existing_answers_from_toml` in commands.rs | rust-dev | (covered by W-1 test) |
| W-3 | architect verify script TOML format matches | architect | `/deep-e2e` re-run shows distinct profiles |

## 6. Acceptance Criteria

- [ ] RED test GREEN
- [ ] `complior init --yes` in pre-configured project loads role/risk/domain from TOML
- [ ] `/deep-e2e` re-run produces 3 DISTINCT profile reports:
  - Profile A score/Obligations DIFFERENT from B (provider/high/healthcare ≠ deployer/limited/general)
  - Profile B applicableObligations > Profile C (high-risk has more obligations than minimal)
- [ ] dev CI green after merge
- [ ] tsc + clippy + fmt clean

## 7. Out of Scope

- Adding `complior profile set --role X --domain Y` CLI command (post-v1.0.0 nice-to-have)
- Interactive wizard changes (not affected — only --yes mode)

## 8. Handoff

После W-1 GREEN → reviewer → architect Section E (`/deep-e2e` re-run) → if 3 profiles show DIFFERENT filterContext → tag v1.0.0 🚀
