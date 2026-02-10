const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions extends RequestInit {
  params?: Record<string, string>;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  let url = `${API_URL}${path}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, value);
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers as Record<string, string>,
    },
    ...fetchOptions,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message || `API error: ${res.status}`);
  }

  return res.json();
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  organizationId: number;
  locale: string;
  roles: string[];
  active: boolean;
}

export interface CatalogTool {
  id: number;
  name: string;
  vendor: string;
  vendorCountry: string | null;
  category: string;
  defaultRiskLevel: string | null;
  domains: string[];
  description: string | null;
  websiteUrl: string | null;
  dataResidency: string | null;
  active: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export const api = {
  auth: {
    me: () => apiFetch<UserProfile>('/api/auth/me'),
    updateOrganization: (id: number, data: Record<string, unknown>) =>
      apiFetch(`/api/organizations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  catalog: {
    search: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<CatalogTool>>('/api/tools/catalog/search', { params }),
    getById: (id: number) =>
      apiFetch<CatalogTool>(`/api/tools/catalog/${id}`),
  },
};
