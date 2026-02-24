const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface AuthResult {
  success: boolean;
  created?: boolean;
  user?: { id: string; email: string };
  error?: { code: string; message?: string };
  emailVerificationRequired?: boolean;
  pendingAuthenticationToken?: string;
  email?: string;
}

export async function loginWithPassword(email: string, password: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/auth/login/password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function sendMagicLink(email: string): Promise<void> {
  await fetch(`${API_URL}/api/auth/login/magic`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function verifyMagicLink(email: string, code: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/auth/login/magic/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  });
  return res.json();
}

export async function registerWithPassword(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/auth/register/password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function sendPasswordReset(email: string): Promise<void> {
  await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });
  return res.json();
}

export async function verifyEmail(code: string, pendingAuthenticationToken: string): Promise<AuthResult> {
  const res = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, pendingAuthenticationToken }),
  });
  return res.json();
}

export function getSocialLoginUrl(provider: 'google' | 'github', opts?: { plan?: string; period?: string }): string {
  let url = `${API_URL}/api/auth/login?provider=${provider}`;
  if (opts?.plan) url += `&plan=${encodeURIComponent(opts.plan)}`;
  if (opts?.period) url += `&period=${encodeURIComponent(opts.period)}`;
  return url;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
  } catch {
    // Silent — cookie will be cleared server-side
  }
  // Clear any remaining client-side cookies
  document.cookie = 'wos-session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export async function getSession(): Promise<{ id: number; email: string; fullName: string; organizationId: number; roles: string[]; active: boolean } | null> {
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
