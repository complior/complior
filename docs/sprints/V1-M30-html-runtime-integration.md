# V1-M30: HTML Runtime — Integration Tests Against Production Data

> **Status:** 🔴 RED — RED INTEGRATION tests written, awaiting implementation
> **Branch:** `feature/V1-M30-html-runtime-integration` (from dev post-V1-M29)
> **Created:** 2026-04-27
> **Author:** Architect
> **Triggered by:** /deep-e2e per-tab analysis 2026-04-27 — 5 issues persist despite V1-M29 unit tests GREEN
> **Predecessor:** V1-M29 html-runtime-fixes
> **Successor:** Final /deep-e2e → tag v1.0.0

---

## 1. Goal — fix the recurring pattern

V1-M27, V1-M29 attempted the same 5 HTML issues. **Both passed unit tests but runtime failed.**

**Root cause of repeated failures:** Unit tests used dev's hand-crafted mock data (e.g. obligations with `title` field, findings with `appliesToRole`, `fix` cmd as string). Production data has different shapes — V1-M27/M29 filter logic doesn't match real fields, so HTML render falls through default branches.

**V1-M30 fix:** Use **INTEGRATION tests** that:
1. Run actual production code path (composition-root → service → renderer)
2. Use REAL data files (`engine/core/data/regulations/eu-ai-act/obligations.json`, real scan output)
3. Assert against ACTUAL rendered HTML (not mock-driven render)

## 2. Five issues to fix

| # | Tab | Real bug observed in /deep-e2e (2026-04-27) |
|---|-----|----------------------------------------------|
| W-1 | Overview | "Score capped: Evidence chain missing or invalid" appears in ALL 3 profiles. `complior init --yes` flow does NOT create evidence chain genesis (V1-M29 added `runInitForProject` which is a separate path; production init route still doesn't call it). |
| W-2 | Findings | (a) Only 2 cards rendered from 53 findings. (b) No `complior fix` command in cards. (c) NOT profile-aware — same 53 in all 3 profiles. |
| W-3 | Laws | (a) Profile A (general) shows Transport/Law-Enforcement obligations. (b) Profile C (finance) shows Healthcare obligations. (c) Disclaimer present in A only. |
| W-4 | Documents | (a) Profile A (limited risk) shows FRIA. (b) Profile B disclaimer missing. |
| W-5 | Fixes | Sections "Applied" + "Available" present but **0 commands rendered** under either. |

## 3. Scope (INTEGRATION-test-driven)

| ID | Task | Owner | INTEGRATION RED test |
|----|------|-------|----------------------|
| W-1 | Production `complior init` flow creates evidence chain genesis | nodejs-dev | `init-route-creates-evidence.test.ts` — POST /onboarding/complete → check chain.json exists |
| W-2 | Findings render N>2 cards (or pagination), each with cmd, profile-aware | nodejs-dev | `report-findings-real-data.test.ts` — full reportService.generateReport with real scan fixture, render HTML, assert |
| W-3 | Laws filter strict against REAL obligations.json data | nodejs-dev | `report-laws-real-obligations.test.ts` — load real obligations.json, build report per profile, assert HTML |
| W-4 | Documents profile filter — FRIA only high-risk in REAL doc list | nodejs-dev | `report-documents-real-types.test.ts` — use production document inventory, assert HTML |
| W-5 | Fixes section renders commands from real findings | nodejs-dev | `report-fixes-real-findings.test.ts` — real scan with `fix` field findings, assert command in HTML |

## 4. INTEGRATION RED test architecture

**Key principle:** Tests must use the **same code path** as `complior report --format html` user invocation — no isolated mocks of intermediate functions.

### Pattern for each test
```typescript
// 1. Setup REAL fixture
const projectPath = createTempProject();  // tmpdir + sample files
runOnboarding(projectPath, { role, riskLevel, domain });  // writes real .complior/profile.json

// 2. Run REAL service flow
const composition = createComposition({ projectPath });
const scanResult = await composition.scanService.scan(projectPath);
const report = await composition.reportService.generateReport();
const html = await composition.reportService.generateOfflineHtml({ outputPath: tmpHtml });

// 3. Assert on ACTUAL HTML
const generated = readFileSync(tmpHtml, 'utf-8');
expect(generated).toContain('expected feature for this profile');
expect(generated).not.toContain('feature that should be filtered out');
```

### Data sources MUST be real
- `engine/core/data/regulations/eu-ai-act/obligations.json` (108 obligations)
- `engine/core/data/onboarding/risk-profile.json`
- Sample scan output from existing test fixtures
- Real `wizard.complete()` flow (not skipped)

## 5. Tasks Table

| # | Task | Owner | RED test target |
|---|------|-------|-----------------|
| W-1 | `complior init --yes` (or wizard.complete) ALWAYS creates evidence chain | nodejs-dev | scan post-init has NO `criticalCaps: ["Evidence chain missing or invalid"]` |
| W-2 | Findings tab: render N>2 cards, each with `complior fix --check-id X` cmd, profile filter applied | nodejs-dev | HTML count(`finding-card`) > 4; HTML matches `complior fix --check-id`; counts differ across profiles |
| W-3 | Laws tab: strict filter using `applies_to_role` + `applies_to_risk_level` + obligation_id industry-prefix from real obligations.json; disclaimer always when excludedCount > 0 | nodejs-dev | General profile HTML: NO Transport/LawEnforcement obligations rendered. Finance profile HTML: NO Healthcare. ALL profiles disclaimer present |
| W-4 | Documents tab: filter by riskLevel and role (FRIA only high-risk, declaration only provider); disclaimer always | nodejs-dev | Limited-risk HTML: NO `<div class="doc-card">` containing FRIA. Provider profile HTML: declaration-of-conformity present. ALL profiles disclaimer present |
| W-5 | Fixes tab: render `complior fix --check-id <id>` per fixable finding (use real `finding.fix` field or generate from checkId) | nodejs-dev | HTML matches `<code[^>]*>complior fix` ≥ 1 occurrence in fixes tab |

## 6. Acceptance Criteria

- [ ] All 5 INTEGRATION RED tests GREEN
- [ ] /deep-e2e re-run on 3 profiles shows ALL 9 tabs ✅ in per-tab analysis
- [ ] Specifically:
  - Overview HR-1: "Score capped: Evidence chain missing" → NO in all 3 profiles
  - Findings HR-2/3: Cards rendered > 4, has cmd, counts differ across profiles
  - Laws HR-4: No leaks, disclaimer in all profiles where exclusions
  - Documents HR-5: FRIA only high-risk, disclaimer consistent
  - Fixes HR-6: Commands rendered (>0)
- [ ] dev CI green after merge
- [ ] tsc + clippy + fmt clean
- [ ] No new regressions in 2616 existing tests

## 7. CRITICAL — anti-pattern to avoid

🚫 **DO NOT** write a unit test like:
```typescript
const html = generateReportHtml({ findings: [{ checkId: 'X', appliesToRole: 'deployer' }] });
```
This passed in V1-M29 but production findings don't have `appliesToRole` field.

✅ **DO** write integration test like:
```typescript
const result = await scanService.scan(realProjectPath);  // production scan
const report = buildComplianceReport(result);            // production builder
const html = generateReportHtml(report);                  // production renderer
expect(html).toMatch(...);                                // assert real HTML
```

## 8. Out of Scope

- New tab features (only existing 5 issues)
- PDF same UX rework
- Test infrastructure refactoring beyond fixture utilities

## 9. Handoff

After all 5 W GREEN → reviewer → architect /deep-e2e re-run → if per-tab analysis shows all 9 tabs ✅ for all 3 profiles → tag v1.0.0 🚀

If 5th iteration also fails — escalate decision to user (possibly accept v1.0.0 with known display gaps, fix in v1.0.1).
