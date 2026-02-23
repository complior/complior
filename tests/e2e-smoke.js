'use strict';

const APP = 'http://localhost:8000';

const postJson = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
};

const getJson = async (url, headers = {}) => {
  const res = await fetch(url, { headers });
  return { status: res.status, data: await res.json().catch(() => null), headers: res.headers };
};

const patchJson = async (url, body, headers = {}) => {
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
};

(async () => {
  console.log('=== E2E Smoke Test (WorkOS) ===\n');

  // 1. Health check
  const health = await getJson(APP + '/health');
  console.log('1. Health check:', health.status === 200 ? 'PASS' : 'FAIL');
  console.log('   Services:', JSON.stringify(health.data.services));

  // 2. Auth login redirect
  const loginRes = await fetch(APP + '/api/auth/login?screen_hint=sign-in', {
    redirect: 'manual',
  });
  const redirectsToWorkOS = loginRes.status === 302 || loginRes.status === 301
    || (loginRes.headers.get('location') || '').includes('workos');
  console.log('2. Login redirect:', redirectsToWorkOS ? 'PASS' : 'FAIL');
  if (loginRes.headers.get('location')) {
    console.log('   Redirects to:', loginRes.headers.get('location').substring(0, 80) + '...');
  }

  // NOTE: Steps 3-4 (registration + session) require browser-based WorkOS AuthKit flow.
  // For full E2E, use Playwright. Below tests use API endpoints that work without auth session.

  // 3. Catalog search (public)
  const cat = await getJson(APP + '/api/tools/catalog/search?q=ChatGPT');
  const hasChatGPT = cat.data?.data?.some((t) => t.name === 'ChatGPT');
  console.log('3. Catalog search:', hasChatGPT ? 'PASS' : 'FAIL');
  console.log('   Total tools:', cat.data?.pagination?.total);

  // 4. Catalog by category
  const recruit = await getJson(APP + '/api/tools/catalog/search?category=recruitment');
  const allRecruit = recruit.data?.data?.every((t) => t.category === 'recruitment');
  console.log('4. Category filter:', allRecruit ? 'PASS' : 'FAIL');
  console.log('   Recruitment tools:', recruit.data?.pagination?.total);

  // 5. Catalog by id
  const detail = await getJson(APP + '/api/tools/catalog/1');
  console.log('5. Catalog detail:', detail.status === 200 ? 'PASS' : 'FAIL');
  if (detail.data?.name) console.log('   Tool:', detail.data.name, '-', detail.data.vendor);

  // 6. 404 for non-existent catalog entry
  const notFound = await getJson(APP + '/api/tools/catalog/99999');
  console.log('6. Catalog 404:', notFound.status === 404 ? 'PASS' : 'FAIL');

  // 7. Catalog riskLevel filter
  const highRisk = await getJson(APP + '/api/tools/catalog/search?riskLevel=high');
  const allHigh = highRisk.data?.data?.length > 0
    && highRisk.data.data.every((t) => t.defaultRiskLevel === 'high');
  console.log('7. Risk filter:', allHigh ? 'PASS' : 'FAIL');
  if (highRisk.data?.data) console.log('   High-risk tools:', highRisk.data.data.length);

  // 8. Unauthenticated API returns 401
  const auditUnauth = await getJson(APP + '/api/auth/audit');
  console.log('8. Audit unauth:', auditUnauth.status === 401 ? 'PASS' : 'FAIL');

  // Summary
  console.log('\n=== Done ===');
})();
