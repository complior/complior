'use strict';

const ORY = 'http://localhost:4433';
const APP = 'http://localhost:8000';

const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
};

const getJson = async (url, headers = {}) => {
  const res = await fetch(url, { headers });
  return { status: res.status, data: await res.json() };
};

const patchJson = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
};

(async () => {
  console.log('=== E2E Smoke Test ===\n');

  // 1. Health check
  const health = await getJson(APP + '/health');
  console.log('1. Health check:', health.status === 200 ? 'PASS' : 'FAIL');
  console.log('   Services:', JSON.stringify(health.data.services));

  // 2. Register via Ory (two-step)
  const email = 'smoke' + Date.now() + '@example.com';
  const traits = { email, name: { first: 'Smoke', last: 'Test' }, locale: 'en' };

  const flow = await getJson(ORY + '/self-service/registration/api');
  const flowId = flow.data.id;

  // Step 1: profile
  await postJson(ORY + '/self-service/registration?flow=' + flowId, {
    csrf_token: '', method: 'profile', traits,
  });

  // Step 2: password + traits
  const reg = await postJson(ORY + '/self-service/registration?flow=' + flowId, {
    csrf_token: '', method: 'password', password: 'AiActPl4tf0rm_Sm0k3!', traits,
  });

  const hasToken = Boolean(reg.data.session_token);
  console.log('2. Ory registration:', hasToken ? 'PASS' : 'FAIL');
  if (hasToken) {
    console.log('   Email:', reg.data.identity.traits.email);
    console.log('   Identity:', reg.data.identity.id);
  } else {
    console.log('   Error:', JSON.stringify(reg.data.ui?.messages));
    process.exit(1);
  }

  const token = reg.data.session_token;

  // 3. Ory whoami
  const whoami = await getJson(ORY + '/sessions/whoami', {
    'X-Session-Token': token,
  });
  console.log('3. Ory whoami:', whoami.status === 200 ? 'PASS' : 'FAIL');

  // 4. Webhook → user in DB (via /api/auth/me)
  // Small delay for webhook to complete
  await new Promise((r) => setTimeout(r, 500));
  const me = await getJson(APP + '/api/auth/me', {
    'X-Session-Token': token,
  });
  console.log('4. /api/auth/me:', me.status === 200 ? 'PASS' : 'FAIL (' + me.status + ')');
  if (me.status === 200) {
    console.log('   User:', me.data.email, '| Roles:', me.data.roles);
  } else {
    console.log('   Response:', JSON.stringify(me.data));
  }

  // 5. Catalog search
  const cat = await getJson(APP + '/api/tools/catalog/search?q=ChatGPT');
  const hasChatGPT = cat.data.data?.some((t) => t.name === 'ChatGPT');
  console.log('5. Catalog search:', hasChatGPT ? 'PASS' : 'FAIL');
  console.log('   Total tools:', cat.data.pagination?.total);

  // 6. Catalog by category
  const recruit = await getJson(APP + '/api/tools/catalog/search?category=recruitment');
  const allRecruit = recruit.data.data?.every((t) => t.category === 'recruitment');
  console.log('6. Category filter:', allRecruit ? 'PASS' : 'FAIL');
  console.log('   Recruitment tools:', recruit.data.pagination?.total);

  // 7. Catalog by id
  const detail = await getJson(APP + '/api/tools/catalog/1');
  console.log('7. Catalog detail:', detail.status === 200 ? 'PASS' : 'FAIL');
  if (detail.data.name) console.log('   Tool:', detail.data.name, '-', detail.data.vendor);

  // 8. 404 for non-existent catalog entry
  const notFound = await getJson(APP + '/api/tools/catalog/99999');
  console.log('8. Catalog 404:', notFound.status === 404 ? 'PASS' : 'FAIL');

  // 9. Org update (Step 2 registration — fill company details)
  const orgId = me.data.organizationId;
  const orgUpdate = await patchJson(
    APP + '/api/organizations/' + orgId,
    { name: 'Smoke Corp ' + Date.now(), industry: 'fintech', size: 'small_10_49', country: 'DE' },
    { 'X-Session-Token': token },
  );
  const orgOk = orgUpdate.status === 200 && orgUpdate.data.name?.startsWith('Smoke Corp');
  console.log('9. Org update:', orgOk ? 'PASS' : 'FAIL (' + orgUpdate.status + ')');
  if (orgOk) console.log('   Org:', orgUpdate.data.name, '| Industry:', orgUpdate.data.industry);

  // 10. Org update — cross-org denied
  const crossOrg = await patchJson(
    APP + '/api/organizations/99999',
    { name: 'Hacker Corp' },
    { 'X-Session-Token': token },
  );
  console.log('10. Cross-org denied:', crossOrg.status === 403 ? 'PASS' : 'FAIL (' + crossOrg.status + ')');

  // 11. Audit log
  const audit = await getJson(APP + '/api/auth/audit', {
    'X-Session-Token': token,
  });
  const auditOk = audit.status === 200 && Array.isArray(audit.data.data);
  console.log('11. Audit log:', auditOk ? 'PASS' : 'FAIL (' + audit.status + ')');
  if (auditOk) console.log('   Entries:', audit.data.pagination?.total);

  // 12. Audit log — unauthenticated
  const auditUnauth = await getJson(APP + '/api/auth/audit');
  console.log('12. Audit unauth:', auditUnauth.status === 401 ? 'PASS' : 'FAIL (' + auditUnauth.status + ')');

  // 13. Zod validation error — invalid industry
  const zodErr = await patchJson(
    APP + '/api/organizations/' + orgId,
    { industry: 'invalid_industry' },
    { 'X-Session-Token': token },
  );
  const zodOk = zodErr.status === 400 && zodErr.data.error?.code === 'VALIDATION_ERROR';
  console.log('13. Zod validation:', zodOk ? 'PASS' : 'FAIL (' + zodErr.status + ')');
  if (zodOk) console.log('   Details:', JSON.stringify(zodErr.data.error.details));

  // 14. Catalog riskLevel filter
  const highRisk = await getJson(APP + '/api/tools/catalog/search?riskLevel=high');
  const allHigh = highRisk.data.data?.length > 0
    && highRisk.data.data.every((t) => t.defaultRiskLevel === 'high');
  console.log('14. Risk filter:', allHigh ? 'PASS' : 'FAIL');
  if (highRisk.data.data) console.log('   High-risk tools:', highRisk.data.data.length);

  // Summary
  console.log('\n=== Done ===');
})();
