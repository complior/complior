'use strict';

/**
 * Sprint 2 — Real-time E2E Test Script
 * Tests all API endpoints against a running server.
 *
 * Usage: DATABASE_URL=... node tests/e2e-sprint2.js
 */

const BASE = process.env.BASE_URL || 'http://localhost:8000';
const ORY = process.env.ORY_SDK_URL || 'http://localhost:4433';

const EMAIL = `e2e-${Date.now()}@testcorp.eu`;
const PASSWORD = 'E2eTestPass_2026!';

let SESSION_TOKEN = '';
let createdToolId = null;
let passed = 0;
let failed = 0;

// ── Helpers ─────────────────────────────────────────────────────────────

const http = async (url, opts = {}) => {
  const headers = { ...opts.headers };
  if (opts.body) headers['Content-Type'] = 'application/json';
  if (SESSION_TOKEN) headers['X-Session-Token'] = SESSION_TOKEN;

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: res.status, json, text };
};

const assert = (cond, label, detail) => {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`);
    if (detail) console.log(`    → ${typeof detail === 'object' ? JSON.stringify(detail).slice(0, 300) : detail}`);
  }
};

const section = (title) => console.log(`\n── ${title} ${'─'.repeat(60 - title.length)}`);

// ── 0. Ory Registration + Login ─────────────────────────────────────────

const setupSession = async () => {
  section('Ory: Register + Login');

  // Step 1: init registration flow
  const flow = await http(`${ORY}/self-service/registration/api`);
  assert(flow.status === 200, 'Registration flow created', flow.json?.id);
  const flowId = flow.json.id;

  // Step 2: submit profile traits
  await http(`${ORY}/self-service/registration?flow=${flowId}`, {
    method: 'POST',
    body: {
      method: 'profile',
      traits: { email: EMAIL, name: { first: 'E2E', last: 'Tester' }, locale: 'en' },
    },
  });

  // Step 3: submit password
  const reg = await http(`${ORY}/self-service/registration?flow=${flowId}`, {
    method: 'POST',
    body: {
      method: 'password',
      password: PASSWORD,
      traits: { email: EMAIL, name: { first: 'E2E', last: 'Tester' }, locale: 'en' },
    },
  });
  assert(reg.status === 200 && reg.json?.session_token, 'User registered', reg.json?.session_token ? 'token received' : reg.text?.slice(0, 200));

  if (reg.json?.session_token) {
    SESSION_TOKEN = reg.json.session_token;
    return;
  }

  // Fallback: login if already registered
  const loginFlow = await http(`${ORY}/self-service/login/api`);
  const login = await http(`${ORY}/self-service/login?flow=${loginFlow.json.id}`, {
    method: 'POST',
    body: { method: 'password', identifier: EMAIL, password: PASSWORD },
  });
  assert(login.status === 200 && login.json?.session_token, 'Logged in', login.json?.session_token ? 'token received' : login.text?.slice(0, 200));
  SESSION_TOKEN = login.json?.session_token || '';
};

// ── 1. Auth/Me — verify session resolved ────────────────────────────────

const testAuthMe = async () => {
  section('GET /api/auth/me — Session Resolution');

  const res = await http(`${BASE}/api/auth/me`);
  assert(res.status === 200, `Status 200 (got ${res.status})`);
  assert(res.json?.email === EMAIL, `Email matches: ${res.json?.email}`);
  assert(Array.isArray(res.json?.roles) && res.json.roles.includes('owner'), `Has owner role: ${JSON.stringify(res.json?.roles)}`);
  assert(res.json?.organizationId > 0, `organizationId assigned: ${res.json?.organizationId}`);
};

// ── 2. POST /api/tools — Create AI Tool ─────────────────────────────────

const testCreateTool = async () => {
  section('POST /api/tools — Create AI Tool');

  // Should reject missing name
  const bad1 = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { vendorName: 'TestVendor' },
  });
  assert(bad1.status === 400, `Rejects missing name (${bad1.status})`);

  // Should reject missing vendorName
  const bad2 = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'TestTool' },
  });
  assert(bad2.status === 400, `Rejects missing vendorName (${bad2.status})`);

  // Should create tool
  const res = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'E2E ChatBot', vendorName: 'TestCorp' },
  });
  assert(res.status === 201, `Created tool (${res.status})`, res.json);
  assert(res.json?.id > 0, `Tool ID: ${res.json?.id}`);
  createdToolId = res.json?.id;
};

// ── 3. PATCH /api/tools/:id — Wizard Steps ──────────────────────────────

const testWizardSteps = async () => {
  section('PATCH /api/tools/:id — Wizard Steps 2-4');

  if (!createdToolId) { console.log('  SKIP: no tool created'); return; }

  // Step 2: Usage
  const s2 = await http(`${BASE}/api/tools/${createdToolId}`, {
    method: 'PATCH',
    body: { step: 2, purpose: 'Customer support chatbot for EU clients', domain: 'customer_service' },
  });
  assert(s2.status === 200, `Step 2 OK (${s2.status})`, s2.json);

  // Step 3: Data
  const s3 = await http(`${BASE}/api/tools/${createdToolId}`, {
    method: 'PATCH',
    body: {
      step: 3,
      dataTypes: ['personal'],
      affectedPersons: ['customers'],
      vulnerableGroups: false,
    },
  });
  assert(s3.status === 200, `Step 3 OK (${s3.status})`, s3.json);

  // Step 4: Autonomy
  const s4 = await http(`${BASE}/api/tools/${createdToolId}`, {
    method: 'PATCH',
    body: {
      step: 4,
      autonomyLevel: 'advisory',
      humanOversight: true,
      affectsNaturalPersons: true,
    },
  });
  assert(s4.status === 200, `Step 4 OK (${s4.status})`, s4.json);
  assert(s4.json?.wizardCompleted === true, `wizardCompleted=true (${s4.json?.wizardCompleted})`);

  // Should reject missing step
  const bad = await http(`${BASE}/api/tools/${createdToolId}`, {
    method: 'PATCH',
    body: { purpose: 'test' },
  });
  assert(bad.status === 400, `Rejects missing step (${bad.status})`);
};

// ── 4. POST /api/tools/:id/classify — Classification ────────────────────

const testClassify = async () => {
  section('POST /api/tools/:id/classify — Classification');

  if (!createdToolId) { console.log('  SKIP: no tool created'); return; }

  const res = await http(`${BASE}/api/tools/${createdToolId}/classify`, { method: 'POST' });
  assert(res.status === 200, `Classified (${res.status})`, res.json);
  assert(res.json?.riskLevel === 'limited', `Risk = limited (${res.json?.riskLevel})`);
  assert(res.json?.confidence > 0, `Confidence > 0 (${res.json?.confidence})`);
  assert(Array.isArray(res.json?.matchedRules) && res.json.matchedRules.length > 0, `matchedRules present`);
  assert(Array.isArray(res.json?.articleReferences), `articleReferences present`);
};

// ── 5. GET /api/tools/:id — Tool Detail ─────────────────────────────────

const testToolDetail = async () => {
  section('GET /api/tools/:id — Tool Detail');

  if (!createdToolId) { console.log('  SKIP: no tool created'); return; }

  const res = await http(`${BASE}/api/tools/${createdToolId}`);
  assert(res.status === 200, `Got detail (${res.status})`, res.json);
  const tool = res.json?.tool || res.json;
  assert(tool?.name === 'E2E ChatBot', `Name matches: ${tool?.name}`);
  assert(tool?.riskLevel === 'limited', `Risk level saved: ${tool?.riskLevel}`);
  assert(res.json?.classification?.riskLevel === 'limited', `Classification present`);
  assert(Array.isArray(res.json?.requirements) && res.json.requirements.length > 0,
    `Requirements mapped (${res.json?.requirements?.length})`);
};

// ── 6. GET /api/tools — Inventory List ──────────────────────────────────

const testToolList = async () => {
  section('GET /api/tools — Inventory List + Filters');

  const res = await http(`${BASE}/api/tools`);
  assert(res.status === 200, `List OK (${res.status})`);
  assert(Array.isArray(res.json?.data), `data is array`);
  assert(res.json?.data?.length >= 1, `Has ≥1 tool (${res.json?.data?.length})`);
  assert(res.json?.pagination?.total >= 1, `Pagination total ≥1 (${res.json?.pagination?.total})`);

  // Filter by riskLevel
  const filtered = await http(`${BASE}/api/tools?riskLevel=limited`);
  assert(filtered.status === 200, `Filter by riskLevel OK (${filtered.status})`);

  // Filter by domain
  const byDomain = await http(`${BASE}/api/tools?domain=customer_service`);
  assert(byDomain.status === 200, `Filter by domain OK (${byDomain.status})`);

  // Search
  const search = await http(`${BASE}/api/tools?q=ChatBot`);
  assert(search.status === 200, `Search OK (${search.status})`);
  assert(search.json?.data?.length >= 1, `Search found tool (${search.json?.data?.length})`);

  // Reject bad pageSize
  const bad = await http(`${BASE}/api/tools?pageSize=500`);
  assert(bad.status === 400, `Rejects pageSize=500 (${bad.status})`);
};

// ── 7. Create + Classify HIGH-RISK tool ─────────────────────────────────

let highRiskToolId = null;

const testHighRiskFlow = async () => {
  section('Full flow: HIGH-RISK employment tool');

  const create = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'HireBot AI', vendorName: 'RecruitCo' },
  });
  highRiskToolId = create.json?.id;
  assert(create.status === 201, `Created (${create.status})`);

  await http(`${BASE}/api/tools/${highRiskToolId}`, {
    method: 'PATCH',
    body: { step: 2, purpose: 'Automated candidate screening and profiling for recruitment', domain: 'employment' },
  });

  await http(`${BASE}/api/tools/${highRiskToolId}`, {
    method: 'PATCH',
    body: { step: 3, dataTypes: ['personal', 'sensitive'], affectedPersons: ['applicants'], vulnerableGroups: false },
  });

  await http(`${BASE}/api/tools/${highRiskToolId}`, {
    method: 'PATCH',
    body: { step: 4, autonomyLevel: 'semi_autonomous', humanOversight: true, affectsNaturalPersons: true },
  });

  const cls = await http(`${BASE}/api/tools/${highRiskToolId}/classify`, { method: 'POST' });
  assert(cls.status === 200, `Classified (${cls.status})`);
  assert(cls.json?.riskLevel === 'high', `Risk = high (${cls.json?.riskLevel})`);

  const detail = await http(`${BASE}/api/tools/${highRiskToolId}`);
  assert(detail.json?.requirements?.length >= 4, `High-risk: ≥4 requirements (${detail.json?.requirements?.length})`);
};

// ── 8. Create + Classify PROHIBITED tool ────────────────────────────────

const testProhibitedFlow = async () => {
  section('Full flow: PROHIBITED social scoring tool');

  const create = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'SocialRank', vendorName: 'DarkCorp' },
  });
  const toolId = create.json?.id;
  assert(create.status === 201, `Created (${create.status})`);

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 2, purpose: 'Social scoring system to rate citizen behavior', domain: 'other' },
  });

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 3, dataTypes: ['personal'], affectedPersons: ['public'], vulnerableGroups: false },
  });

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 4, autonomyLevel: 'autonomous', humanOversight: false, affectsNaturalPersons: true },
  });

  const cls = await http(`${BASE}/api/tools/${toolId}/classify`, { method: 'POST' });
  assert(cls.status === 200, `Classified (${cls.status})`);
  assert(cls.json?.riskLevel === 'prohibited', `Risk = prohibited (${cls.json?.riskLevel})`);
  assert(cls.json?.matchedRules?.[0]?.includes('Art. 5(1)(c)'), `Matched Art. 5(1)(c): ${cls.json?.matchedRules?.[0]?.slice(0, 60)}`);
};

// ── 9. Create + Classify MINIMAL tool ───────────────────────────────────

const testMinimalFlow = async () => {
  section('Full flow: MINIMAL internal coding tool');

  const create = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'Internal Linter', vendorName: 'InHouse' },
  });
  const toolId = create.json?.id;

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 2, purpose: 'Static code analysis for internal use', domain: 'coding' },
  });

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 3, dataTypes: ['personal'], affectedPersons: ['employees'], vulnerableGroups: false },
  });

  await http(`${BASE}/api/tools/${toolId}`, {
    method: 'PATCH',
    body: { step: 4, autonomyLevel: 'advisory', humanOversight: true, affectsNaturalPersons: false },
  });

  const cls = await http(`${BASE}/api/tools/${toolId}/classify`, { method: 'POST' });
  assert(cls.status === 200, `Classified (${cls.status})`);
  assert(cls.json?.riskLevel === 'minimal', `Risk = minimal (${cls.json?.riskLevel})`);
};

// ── 10. Classify incomplete wizard → error ──────────────────────────────

const testClassifyIncomplete = async () => {
  section('Classify incomplete wizard → 400');

  const create = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'Incomplete Tool', vendorName: 'TestCo' },
  });
  const toolId = create.json?.id;

  const cls = await http(`${BASE}/api/tools/${toolId}/classify`, { method: 'POST' });
  assert(cls.status === 400, `Rejects incomplete wizard (${cls.status})`, cls.json);
};

// ── 11. DELETE /api/tools/:id ───────────────────────────────────────────

const testDelete = async () => {
  section('DELETE /api/tools/:id');

  // Create a draft tool and delete it (hard delete)
  const create = await http(`${BASE}/api/tools`, {
    method: 'POST',
    body: { name: 'ToDelete Draft', vendorName: 'DelCo' },
  });
  const draftId = create.json?.id;
  assert(create.status === 201, `Created draft (${create.status})`);

  const del = await http(`${BASE}/api/tools/${draftId}`, { method: 'DELETE' });
  assert(del.status === 200, `Deleted draft (${del.status})`);
  assert(del.json?.success === true, `success=true`);

  // Verify it's gone
  const detail = await http(`${BASE}/api/tools/${draftId}`);
  assert(detail.status === 404, `Deleted tool returns 404 (${detail.status})`);

  // Delete a classified tool (soft delete)
  if (highRiskToolId) {
    const softDel = await http(`${BASE}/api/tools/${highRiskToolId}`, { method: 'DELETE' });
    assert(softDel.status === 200, `Soft-deleted classified tool (${softDel.status})`);
  }
};

// ── 12. Multi-tenancy isolation ─────────────────────────────────────────

const testMultiTenancy = async () => {
  section('Multi-tenancy: cross-org isolation');

  // Register second user via raw fetch (no session token to Ory)
  const email2 = `e2e-other-${Date.now()}@othercorp.eu`;
  const flowRes = await fetch(`${ORY}/self-service/registration/api`);
  const flow = await flowRes.json();
  const flowId = flow.id;

  // Profile step (may 400 on two-step flow, that's ok)
  await fetch(`${ORY}/self-service/registration?flow=${flowId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'profile',
      traits: { email: email2, name: { first: 'Other', last: 'User' }, locale: 'en' },
    }),
  });

  // Password step
  const regRes = await fetch(`${ORY}/self-service/registration?flow=${flowId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method: 'password',
      password: PASSWORD,
      traits: { email: email2, name: { first: 'Other', last: 'User' }, locale: 'en' },
    }),
  });
  const reg2 = await regRes.json();
  const otherToken = reg2.session_token;
  assert(!!otherToken, `Second user registered`);

  if (otherToken) {
    // Try to access first user's tool
    const res = await fetch(`${BASE}/api/tools/${createdToolId}`, {
      headers: { 'X-Session-Token': otherToken },
    });
    assert(res.status === 404, `Cross-org tool returns 404 (${res.status})`);

    // List should be empty for new org
    const listRes = await fetch(`${BASE}/api/tools`, {
      headers: { 'X-Session-Token': otherToken },
    });
    const listJson = await listRes.json();
    assert(listJson.data?.length === 0, `Other org sees 0 tools (${listJson.data?.length})`);
  }
};

// ── 13. Unauthenticated access → 401 ───────────────────────────────────

const testNoAuth = async () => {
  section('Unauthenticated access → 401');

  const saved = SESSION_TOKEN;
  SESSION_TOKEN = '';

  const res = await http(`${BASE}/api/tools`);
  assert(res.status === 401, `GET /api/tools without token → ${res.status}`);

  const res2 = await http(`${BASE}/api/tools`, { method: 'POST', body: { name: 'x', vendorName: 'y' } });
  assert(res2.status === 401, `POST /api/tools without token → ${res2.status}`);

  SESSION_TOKEN = saved;
};

// ── 14. Catalog still works ─────────────────────────────────────────────

const testCatalog = async () => {
  section('GET /api/tools/catalog — Sprint 1 regression');

  const res = await http(`${BASE}/api/tools/catalog/search`);
  assert(res.status === 200, `Catalog OK (${res.status})`);
  assert(res.json?.data?.length > 0, `Has catalog entries (${res.json?.data?.length})`);
};

// ── Run all ─────────────────────────────────────────────────────────────

(async () => {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Sprint 2 — Real-Time E2E Tests (Node.js)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Server: ${BASE}`);
  console.log(`Ory:    ${ORY}`);

  try {
    await setupSession();
    if (!SESSION_TOKEN) { console.log('\nFATAL: No session token. Aborting.'); process.exit(1); }

    await testAuthMe();
    await testNoAuth();
    await testCreateTool();
    await testWizardSteps();
    await testClassify();
    await testToolDetail();
    await testToolList();
    await testHighRiskFlow();
    await testProhibitedFlow();
    await testMinimalFlow();
    await testClassifyIncomplete();
    await testDelete();
    await testMultiTenancy();
    await testCatalog();

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(`  PASSED: ${passed}   FAILED: ${failed}   TOTAL: ${passed + failed}`);
    console.log('══════════════════════════════════════════════════════════════');
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\nFATAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
