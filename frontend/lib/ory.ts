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

async function oryFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ORY_SDK_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers as Record<string, string> },
    ...options,
  });
  return res;
}

export async function getSession(): Promise<OrySession | null> {
  try {
    const res = await oryFetch('/sessions/whoami');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
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

export async function submitRegistration(flowId: string, body: Record<string, unknown>) {
  const res = await oryFetch(`/self-service/registration?flow=${flowId}`, {
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
