'use strict';

/**
 * E2E manual tests for Registry v4 — run against live backend.
 *
 * Usage: node tests/e2e-v4-manual.js
 */

const BASE = process.env.BACKEND_URL || 'http://localhost:8000';

const fetchJSON = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return res.json();
};

const assert = (condition, msg) => {
  if (!condition) {
    console.log(`  FAIL: ${msg}`);
    return false;
  }
  console.log(`  OK: ${msg}`);
  return true;
};

const run = async () => {
  let allPassed = true;
  const fail = (msg) => { allPassed = false; console.log(`  FAIL: ${msg}`); };

  // ── Test 1: publicDocumentation structure ──
  console.log('\n=== TEST 1: publicDocumentation structure ===');
  const res1 = await fetchJSON('/v1/registry/tools?limit=5&sort=grade');
  for (const t of res1.data) {
    const pd = t.assessments?.['eu-ai-act']?.publicDocumentation;
    if (!pd) { fail(`${t.slug} — no publicDocumentation`); continue; }
    const ok = pd.grade && typeof pd.score === 'number' && pd.total === 9
      && typeof pd.percent === 'number' && Array.isArray(pd.items)
      && pd.items.length === 9 && pd.checklist && pd.gradedAt;
    if (!ok) fail(`${t.slug} — missing fields`);
    else assert(true, `${t.slug} — grade=${pd.grade} score=${pd.score}/9 checklist=${pd.checklist}`);
  }

  // ── Test 2: Spot-check Claude (provider) ──
  console.log('\n=== TEST 2: Spot-check Claude ===');
  const claude = await fetchJSON('/v1/registry/tools/by-slug/claude');
  const claudePd = claude.assessments?.['eu-ai-act']?.publicDocumentation;
  allPassed &= assert(claude.aiActRole === 'provider', `aiActRole = ${claude.aiActRole} (expected: provider)`);
  allPassed &= assert(claudePd && claudePd.checklist === 'provider', `checklist = ${claudePd?.checklist} (expected: provider)`);
  allPassed &= assert(claudePd && claudePd.grade, `grade = ${claudePd?.grade}`);
  allPassed &= assert(claudePd && claudePd.score >= 0, `score = ${claudePd?.score}/9`);
  const claudeLegacy = claude.assessments?.['eu-ai-act']?.legacyScore;
  allPassed &= assert(claudeLegacy !== undefined, `legacyScore = ${claudeLegacy}`);
  console.log(`  Items: ${claudePd?.items?.map(i => `${i.id}:${i.found ? 'Y' : 'N'}`).join(', ')}`);

  // ── Test 3: Spot-check HeyGen (deployer_product) ──
  console.log('\n=== TEST 3: Spot-check HeyGen ===');
  const heygen = await fetchJSON('/v1/registry/tools/by-slug/heygen');
  const heygenPd = heygen.assessments?.['eu-ai-act']?.publicDocumentation;
  allPassed &= assert(heygen.aiActRole === 'deployer_product', `aiActRole = ${heygen.aiActRole} (expected: deployer_product)`);
  allPassed &= assert(heygenPd && heygenPd.checklist === 'deployer_product', `checklist = ${heygenPd?.checklist} (expected: deployer_product)`);
  allPassed &= assert(heygenPd && heygenPd.grade, `grade = ${heygenPd?.grade}`);
  const heygenLegacy = heygen.assessments?.['eu-ai-act']?.legacyScore;
  allPassed &= assert(heygenLegacy !== undefined, `legacyScore = ${heygenLegacy}`);
  console.log(`  Items: ${heygenPd?.items?.map(i => `${i.id}:${i.found ? 'Y' : 'N'}`).join(', ')}`);

  // ── Test 4: aiActRole filter ──
  console.log('\n=== TEST 4: aiActRole filter ===');
  const provRes = await fetchJSON('/v1/registry/tools?aiActRole=provider&limit=10');
  const allProvider = provRes.data.every(t => t.aiActRole === 'provider');
  allPassed &= assert(allProvider, `All ${provRes.data.length} results have aiActRole=provider`);
  allPassed &= assert(provRes.pagination.total > 0, `Total provider tools: ${provRes.pagination.total}`);

  const deplRes = await fetchJSON('/v1/registry/tools?aiActRole=deployer_product&limit=10');
  const allDeployer = deplRes.data.every(t => t.aiActRole === 'deployer_product');
  allPassed &= assert(allDeployer, `All ${deplRes.data.length} results have aiActRole=deployer_product`);
  allPassed &= assert(deplRes.pagination.total > 0, `Total deployer_product tools: ${deplRes.pagination.total}`);

  const infraRes = await fetchJSON('/v1/registry/tools?aiActRole=infrastructure&limit=5');
  allPassed &= assert(infraRes.pagination.total > 0, `Total infrastructure tools: ${infraRes.pagination.total}`);

  // ── Test 5: grade sort ──
  console.log('\n=== TEST 5: sort=grade ===');
  const gradeRes = await fetchJSON('/v1/registry/tools?sort=grade&limit=10');
  const grades = gradeRes.data.map(t => t.assessments?.['eu-ai-act']?.publicDocumentation?.grade || 'Z');
  const isSorted = grades.every((g, i) => i === 0 || g >= grades[i - 1]);
  allPassed &= assert(isSorted, `Grades sorted: [${grades.join(', ')}]`);

  // ── Test 6: legacyScore preserved for scored tools ──
  console.log('\n=== TEST 6: legacyScore preserved ===');
  const scoredRes = await fetchJSON('/v1/registry/tools?sort=score&limit=5');
  let legacyCount = 0;
  for (const t of scoredRes.data) {
    const legacy = t.assessments?.['eu-ai-act']?.legacyScore;
    if (legacy !== null && legacy !== undefined) legacyCount++;
  }
  allPassed &= assert(legacyCount > 0, `${legacyCount}/${scoredRes.data.length} tools have legacyScore`);

  // ── Test 7: by-slug returns all v4 fields ──
  console.log('\n=== TEST 7: by-slug v4 fields ===');
  const chatgpt = await fetchJSON('/v1/registry/tools/by-slug/chatgpt');
  allPassed &= assert('aiActRole' in chatgpt, `aiActRole field present: ${chatgpt.aiActRole}`);
  const cgPd = chatgpt.assessments?.['eu-ai-act']?.publicDocumentation;
  allPassed &= assert(cgPd, `publicDocumentation present`);
  allPassed &= assert(cgPd?.grade, `grade: ${cgPd?.grade}`);
  allPassed &= assert(cgPd?.items?.length === 9, `9 checklist items`);
  allPassed &= assert('legacyScore' in (chatgpt.assessments?.['eu-ai-act'] || {}), `legacyScore field present`);

  // ── Test 8: search + aiActRole combo ──
  console.log('\n=== TEST 8: search + aiActRole combo ===');
  const comboRes = await fetchJSON('/v1/registry/tools?q=claude&aiActRole=provider&limit=5');
  allPassed &= assert(comboRes.data.length > 0, `Found ${comboRes.data.length} results for q=claude&aiActRole=provider`);
  const comboAllProv = comboRes.data.every(t => t.aiActRole === 'provider');
  allPassed &= assert(comboAllProv, `All combo results are provider`);

  // ── Test 9: Invalid aiActRole rejected ──
  console.log('\n=== TEST 9: Invalid aiActRole rejected ===');
  try {
    const badRes = await fetch(`${BASE}/v1/registry/tools?aiActRole=invalid`);
    allPassed &= assert(badRes.status === 400, `Invalid aiActRole returns 400 (got ${badRes.status})`);
  } catch (e) {
    fail(`Request failed: ${e.message}`);
  }

  // ── Test 10: DB column exists and has data ──
  console.log('\n=== TEST 10: Check grade distribution sanity ===');
  const allGrades = await fetchJSON('/v1/registry/tools?sort=grade&limit=100');
  const gradeDist = {};
  for (const t of allGrades.data) {
    const g = t.assessments?.['eu-ai-act']?.publicDocumentation?.grade || 'none';
    gradeDist[g] = (gradeDist[g] || 0) + 1;
  }
  console.log(`  Grade distribution (top 100):`, JSON.stringify(gradeDist));
  allPassed &= assert(Object.keys(gradeDist).length > 1, `Multiple grades present`);

  // ── Summary ──
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('ALL TESTS PASSED');
  } else {
    console.log('SOME TESTS FAILED — see FAIL lines above');
  }
  console.log('='.repeat(50));

  process.exit(allPassed ? 0 : 1);
};

run().catch((err) => {
  console.error('E2E test error:', err);
  process.exit(1);
});
