# V1-M26: Applicable Articles — Map OBL-IDs to EU AI Act Article Numbers

> **Status:** 🔴 RED — RED test written, awaiting implementation
> **Branch:** `feature/V1-M26-applicable-articles` (from updated `dev` post-PR #23)
> **Created:** 2026-04-25
> **Author:** Architect
> **Triggered by:** Original user requirement (V1-M21 review): "Профиль компании выдать с **статьями и подстатьями закона EU AI Act**, а не obligation IDs"
> **Predecessor:** V1-M25 R-4b composition wiring
> **Successor:** Final E2E with full coverage → tag v1.0.0

---

## 1. Goal

Закрыть UX gap U-G1 + U-G2 (выявлены в deep verification после V1-M25):

| Текущее поведение | Ожидаемое |
|-------------------|-----------|
| `applicableArticles: ["eu-ai-act-OBL-001", "eu-ai-act-OBL-001a", ...]` | `applicableArticles: ["Article 4", "Article 5", "Article 50", ...]` (deduplicated, sorted) |
| Для domain=general показываются OBL-FIN/MED/EDU/JUS/MKT obligations | Domain-specific obligations filtered out для общего домена |

User original requirement (V1-M21 review):
> «Профиль компании, который сформирован ответами на вопросы, надо выдать на главной странице, **с статьями и подстатьями закона EU AI Act под какие компания подпадает (очень коротко и компактно)**»

Сейчас выдаются `OBL-001` etc. — это obligation IDs, не статьи. Нужна mapping и domain filter.

## 2. Root cause

```
composition-root.ts:564:
  applicableArticles: (p.applicableObligations ?? []) as readonly string[]
                       ↑ это obligationIds, не article numbers
```

`obligations.json` содержит `obligation_id` + `article_reference` ("Article 4" etc.) — нужна mapping fn + domain filter.

## 3. Scope

| ID | Задача | Owner | Файл |
|----|--------|-------|------|
| W-1 | Создать pure fn `obligationsToArticles(obligationIds, options)` — maps OBL-IDs to unique sorted article references, optional `excludeOtherIndustries` | nodejs-dev | `engine/core/src/domain/profile/applicable-articles.ts` (новый) |
| W-2 | Update composition-root.ts:564 — call `obligationsToArticles` to convert obligationIds before return | nodejs-dev | `engine/core/src/composition-root.ts` |

## 4. RED Tests

`engine/core/src/domain/profile/applicable-articles.test.ts`:
- `obligationsToArticles(['eu-ai-act-OBL-001'])` → `['Article 4']` (mapping works)
- Multiple OBLs same article → deduplicated (`['OBL-001', 'OBL-001A']` → `['Article 4']`)
- Sorted ascending (`OBL-014` first then `OBL-005`)
- Unknown OBL ID → silently filtered out (forward-compat)
- Domain filter: `obligationsToArticles([..., 'OBL-FIN-001'], { domain: 'general', excludeOtherIndustries: true })` → FIN excluded
- Result is frozen array

Integration check (composition-root):
- After build: profile.applicableArticles contains "Article 4" not "eu-ai-act-OBL-001"

## 5. Predecessor verification — dev CI green

Verified ✅ — V1-M25 dev CI conclusion=success (Phase 7 Step 10 satisfied).

## 6. Acceptance Criteria

- [ ] All RED tests GREEN
- [ ] `complior report --format json | jq '.profile.applicableArticles'` returns `["Article 4", ...]` not `["eu-ai-act-OBL-001", ...]`
- [ ] HTML profile block shows "Art. 4, Art. 5, Art. 50" instead of OBL IDs
- [ ] For domain=general: OBL-FIN/MED/EDU/JUS/MKT/CSR excluded
- [ ] tsc + clippy + fmt clean
- [ ] dev CI GREEN after merge

## 7. Out of Scope

- Other UX gaps (fix-filterContext transparency)
- Test infrastructure script bugs

## 8. Handoff

После W-1, W-2 GREEN → reviewer → architect Section E (TRULY deep E2E на eval-target — все commands, все flags, все 5 report формат visually) → если 0 blockers → PR → merge → CI verify → tag v1.0.0 🚀
