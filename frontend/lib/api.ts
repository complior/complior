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
    // Defensive: parse error JSON for message, fallback if body is not valid JSON
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

export interface AITool {
  id: number;
  organizationId: number;
  createdById: number;
  catalogEntryId: number | null;
  name: string;
  description: string;
  vendorName: string;
  vendorCountry: string | null;
  vendorUrl: string | null;
  purpose: string;
  domain: string;
  dataTypes: string[];
  affectedPersons: string[];
  vulnerableGroups: boolean;
  dataResidency: string | null;
  autonomyLevel: string;
  humanOversight: boolean;
  affectsNaturalPersons: boolean;
  riskLevel: string | null;
  annexCategory: string | null;
  classificationConfidence: number | null;
  complianceStatus: string;
  complianceScore: number;
  wizardStep: number;
  wizardCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiskClassification {
  riskClassificationId: number;
  aiToolId: number;
  riskLevel: string;
  annexCategory: string | null;
  confidence: number;
  reasoning: string;
  ruleResult: {
    riskLevel: string;
    confidence: number;
    matchedRules: string[];
    articleReferences: ArticleReference[];
    annexCategory: string | null;
  };
  method: string;
  articleReferences: ArticleReference[];
  version: number;
  isCurrent: boolean;
}

export interface ArticleReference {
  article: string;
  text: string;
  relevance: string;
}

export interface ToolRequirement {
  toolRequirementId: number;
  aiToolId: number;
  requirementId: number;
  status: string;
  progress: number;
  dueDate: string | null;
  notes: string | null;
  completedAt: string | null;
  code: string;
  name: string;
  description: string;
  articleReference: string;
  requirementLevel: string;
  category: string;
  guidance: string | null;
  estimatedEffortHours: number | null;
}

export interface AIToolDetail extends AITool {
  classification: RiskClassification | null;
  requirements: ToolRequirement[];
}

export interface ClassifyResult {
  classification: RiskClassification;
  riskLevel: string;
  confidence: number;
  matchedRules: string[];
  articleReferences: ArticleReference[];
  annexCategory: string | null;
  requirementsCreated: number;
}

export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

export interface CheckoutStatusResponse {
  status: string;
  planName: string;
}

export interface QuickCheckRequest {
  deploysAi: boolean;
  affectsNaturalPersons: boolean;
  domain: string;
  makesDecisions: boolean;
  email: string;
}

export interface QuickCheckResponse {
  applies: boolean;
  riskLevel: string;
  obligations: { article: string; text: string }[];
  findings: { severity: string; text: string }[];
  literacyRequired: boolean;
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
  tools: {
    list: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<AITool>>('/api/tools', { params }),
    getById: (id: number) =>
      apiFetch<AIToolDetail>(`/api/tools/${id}`),
    create: (data: Record<string, unknown>) =>
      apiFetch<AITool>('/api/tools', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      apiFetch<AITool>(`/api/tools/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/tools/${id}`, { method: 'DELETE' }),
    classify: (id: number) =>
      apiFetch<ClassifyResult>(`/api/tools/${id}/classify`, { method: 'POST' }),
  },
  billing: {
    createCheckout: (planName: string, period: string) =>
      apiFetch<CheckoutResponse>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ planName, period }),
      }),
    checkoutStatus: (sessionId: string) =>
      apiFetch<CheckoutStatusResponse>('/api/billing/checkout-status', {
        params: { session_id: sessionId },
      }),
  },
  public: {
    quickCheck: (data: QuickCheckRequest) =>
      apiFetch<QuickCheckResponse>('/api/public/quick-check', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
