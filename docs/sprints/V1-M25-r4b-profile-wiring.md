# V1-M25: R-4b — Composition Wiring for HTML Profile Block

> **Status:** ✅ DONE — reviewer APPROVED, pending merge to dev
> **Branch:** `feature/V1-M25-r4b-profile-wiring` (from updated `dev` post-PR #21)
> **Created:** 2026-04-25
> **Author:** Architect
> **Triggered by:** V1-M24 final E2E (53/64) — R-4b HTML profile block missing despite builder fix
> **Predecessor:** V1-M24 final wiring
> **Successor:** V1-M21 final-final-final E2E → tag v1.0.0 🚀

---

## 1. Goal

Закрыть последний release blocker для v1.0.0: **profile block отсутствует в production HTML отчёте**, хотя V1-M24 R-4 builder fix добавил поддержку profile в `buildComplianceReport`. Композиция между data layer (project.toml profile) → reportService → buildComplianceReport не пробрасывает profile.

## 2. Root cause

Текущая цепочка:
```
project.toml (role/industry) → composition-root.getProjectProfile() ✅
                                            ↓
                              [WIRED to scanService] ✅
                              [NOT WIRED to reportService] ❌
                                            ↓
                              reportService.generateReport()
                                            ↓
                              buildComplianceReport(input)
                                input.profile = undefined  ❌
                                            ↓
                              renderer: report.profile ? <section> : null
                              → no profile section in HTML
```

**Wiring gap:**
1. `ReportServiceDeps` interface не содержит `getProjectProfile`
2. `composition-root.ts` строит reportService без передачи profile getter
3. `reportService.generateReport()` не вызывает getter и не передаёт `profile` в `buildComplianceReport(input)`

## 3. Scope

| ID | Задача | Owner | Файл |
|----|--------|-------|------|
| W-1 | Add `getProjectProfile` to ReportServiceDeps interface | nodejs-dev | `engine/core/src/services/report-service.ts` |
| W-2 | reportService.generateReport() calls getProjectProfile and passes profile to buildComplianceReport | nodejs-dev | `engine/core/src/services/report-service.ts` |
| W-3 | composition-root.ts wires getProjectProfile into reportService deps | nodejs-dev | `engine/core/src/composition-root.ts` |

## 4. RED Test

`engine/core/src/services/report-service-profile-wiring.test.ts`:
- Build reportService with mock `getProjectProfile` returning real profile
- Call `generateReport()`
- Assert returned ComplianceReport has non-null `profile` field
- Assert profile.role / riskLevel / domain match input

## 5. Predecessor verification — V1-M24 dev CI

- [ ] **NEW Phase 7 step (added in V1-M24):** dev CI must be GREEN after PR #21 merge before starting V1-M25
- Check: `gh run list --branch dev --limit 1` → status "completed", conclusion "success"
- If CI red → diagnose and hotfix BEFORE V1-M25

## 6. Acceptance Criteria

- [ ] RED runtime test GREEN
- [ ] V1-M21 E2E re-run: R-4b PASS (`grep -c "company-profile" generated.html` ≥ 1)
- [ ] All other V1-M24 fixes still working (no regressions)
- [ ] dev CI GREEN after merge

## 7. Out of Scope

- Test script bug cleanup (TS-6..TS-10) — non-blocker, can be done later
- ISO 42001 reintegration (V2-M04)

## 8. Handoff

После W-1..W-3 GREEN + V1-M21 R-4b GREEN → PR `feature/V1-M25-r4b-profile-wiring` → `dev` → user merge → tag v1.0.0 🚀
