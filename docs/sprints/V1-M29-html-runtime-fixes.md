# V1-M29: HTML Runtime Fixes — Cross-Profile Visual Quality

> **Status:** 🔴 RED — RED tests written, awaiting implementation
> **Branch:** `feature/V1-M29-html-runtime-fixes` (from dev post-V1-M28)
> **Created:** 2026-04-27
> **Author:** Architect
> **Triggered by:** /deep-e2e per-tab analysis on 3 profiles — 5 partial issues found
> **Predecessor:** V1-M28 init --yes respects project.toml
> **Successor:** Final /deep-e2e with tab analysis → tag v1.0.0

---

## 1. Goal

Закрыть 5 partial UX issues выявленных детальным анализом каждой вкладки HTML report для 3 профилей.

V1-M27 attempted these but unit tests passed against mocks — production rendering has gaps.

## 2. Bugs found per tab

| Tab | Bug | Severity | RED test target |
|-----|-----|----------|-----------------|
| **Overview** | "Score capped: Evidence chain missing" still shows in all 3 profiles (V1-M22 A-8 / V1-M27 HR-1 didn't reach runtime init flow) | MEDIUM (user confusion) | `init` actually creates evidence chain on production code path |
| **Findings** | (a) Only 2 cards shown despite 53 findings — truncation. (b) No `complior fix` command in cards. (c) NOT profile-aware — same 53 findings for all 3 profiles | MEDIUM | All 53 findings rendered (or expand-on-demand). Each card has remediation command. Findings filtered by profile |
| **Laws** | (a) Filter has leaks: A (general) shows Transport/LawEnforcement, C (finance) shows Healthcare. (b) Disclaimer present in A+C but missing in B | MEDIUM | Strict role+risk+domain filter. Disclaimer always present when N>0 obligations excluded |
| **Documents** | All 14 doc types shown for all profiles. FRIA visible for Profile A (limited risk — not required). Disclaimer inconsistent | MEDIUM | Profile-required filter (FRIA only high-risk). Disclaimer always shown |
| **Actions** | Deprecated `complior passport init` still in suggestions (HR-8 dedup didn't remove it) | LOW | Suggestions exclude any `passport init` command |

## 3. Scope

| ID | Task | Owner | RED test |
|----|------|-------|----------|
| W-1 | `complior init` actually creates evidence chain in production (not just unit test) | nodejs-dev | `init-evidence-chain-production.test.ts` |
| W-2 | Findings tab: render ALL findings (or paginate w/ expand), include `complior fix` command, profile-aware filter | nodejs-dev | `html-findings-completeness.test.ts` |
| W-3 | Laws tab: strict profile filter (role + risk + domain), consistent disclaimer | nodejs-dev | `html-laws-strict-filter.test.ts` |
| W-4 | Documents tab: profile-required filter, FRIA only for high-risk, consistent disclaimer | nodejs-dev | `html-documents-strict-filter.test.ts` |
| W-5 | Actions: remove `passport init` from suggestion list (deprecated command) | nodejs-dev | `actions-no-deprecated-passport-init.test.ts` |
| W-6 | (architect) Add per-tab Python analysis to `verify_truly_deep_e2e.sh` | architect | n/a (script enhancement) |

## 4. Acceptance Criteria

- [ ] All 5 RED test files GREEN
- [ ] /deep-e2e tab analysis script passes for all 3 profiles
- [ ] No "Score capped: Evidence chain missing" in any HTML
- [ ] Findings tab shows >2 cards (all relevant for profile)
- [ ] Each Findings card has complior fix command
- [ ] Laws tab profile filter strict (verified by sample articles per profile)
- [ ] Laws/Documents disclaimer always present when N>0 excluded
- [ ] FRIA NOT visible for limited-risk profile
- [ ] No `passport init` in Actions tab
- [ ] dev CI green after merge
- [ ] tsc + clippy + fmt clean

## 5. Out of Scope

- HR-2, HR-6, HR-7 (already working)
- PDF/MD same UX rework
- Cross-profile comparison report enhancements (already detailed)

## 6. Handoff

After all GREEN → reviewer → architect Section E (final /deep-e2e with tab analysis) → if 0 blockers → tag v1.0.0 🚀
