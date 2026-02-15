const ORY_SDK_URL = process.env.NEXT_PUBLIC_ORY_SDK_URL || 'http://localhost:4433';

export interface OrySession {
  id: string;
  active: boolean;
  identity: {
    id: string;
    traits: {
      email: string;
      name?: { first?: string; last?: string };
      locale?: string;
    };
  };
}

async function oryFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${ORY_SDK_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    },
    ...options,
  }).catch(() => new Response('{}', { status: 503 }));
}

export async function getSession(): Promise<OrySession | null> {
  const res = await oryFetch('/sessions/whoami');
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

export async function createLoginFlow() {
  const res = await oryFetch('/self-service/login/browser');
  if (!res.ok) throw new Error('Failed to create login flow');
  return res.json();
}

export async function submitLogin(flowId: string, body: Record<string, unknown>) {
  const res = await oryFetch(`/self-service/login?flow=${flowId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function createRegistrationFlow() {
  const res = await oryFetch('/self-service/registration/browser');
  if (!res.ok) throw new Error('Failed to create registration flow');
  return res.json();
}

export function extractCsrfToken(flow: { ui?: { nodes?: Array<{ attributes: { name?: string; value?: string } }> } }): string {
  const node = flow.ui?.nodes?.find((n: { attributes: { name?: string } }) => n.attributes.name === 'csrf_token');
  return node?.attributes?.value || '';
}

export async function submitRegistration(flowId: string, body: Record<string, unknown>) {
  const res = await oryFetch(`/self-service/registration?flow=${flowId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) console.error('[ory] submitRegistration error:', JSON.stringify(data, null, 2));
  return data;
}

export async function createRecoveryFlow() {
  const res = await oryFetch('/self-service/recovery/browser');
  if (!res.ok) throw new Error('Failed to create recovery flow');
  return res.json();
}

export async function submitRecovery(flowId: string, body: Record<string, unknown>) {
  const res = await oryFetch(`/self-service/recovery?flow=${flowId}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function logout() {
  const res = await oryFetch('/self-service/logout/browser');
  if (!res.ok) return;
  const { logout_url } = await res.json();
  if (logout_url) window.location.href = logout_url;
}
