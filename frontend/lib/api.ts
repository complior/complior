const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

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
  }).catch(() => new Response(JSON.stringify({ error: { message: 'Service unavailable' } }), { status: 503 }));

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
  translations: Record<string, { name?: string; description?: string; guidance?: string }> | null;
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
  checkoutUrl: string;
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

export interface AdminOverview {
  totalUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  mrr: number;
  planDistribution: { planName: string; displayName: string; count: number }[];
}

export interface AnalyticsDay {
  day: string;
  count: number;
}

export interface RevenueByPlan {
  planName: string;
  displayName: string;
  activeCount: number;
  mrrCents: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface RecentSignup {
  id: number;
  email: string;
  fullName: string;
  organizationName: string;
  planName: string;
  createdAt: string;
}

export interface AdminAnalytics {
  usersByDay: AnalyticsDay[];
  subscriptionsByDay: AnalyticsDay[];
  revenueByPlan: RevenueByPlan[];
  statusDistribution: StatusCount[];
  kpis: {
    totalMrrCents: number;
    activeTrials: number;
    activePaid: number;
    arpu: number;
    trialConversionRate: number;
  };
  recentSignups: RecentSignup[];
}

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  organizationName: string;
  role: string;
  planName: string;
  subscriptionStatus: string;
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminOrganization {
  id: number;
  name: string;
  industry: string | null;
  size: string | null;
  country: string | null;
  userCount: number;
  toolCount: number;
  planName: string;
  subscriptionStatus: string;
}

export interface AdminSubscription {
  subscriptionId: number;
  organizationName: string;
  planName: string;
  displayName: string;
  status: string;
  billingPeriod: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

// --- FRIA ---

export interface FRIASection {
  fRIASectionId: number;
  sectionType: string;
  content: Record<string, unknown>;
  aiDraft: Record<string, unknown> | null;
  completed: boolean;
  sortOrder: number;
}

export interface FRIAAssessment {
  fRIAAssessmentId: number;
  aiToolId: number;
  createdById: number;
  status: 'draft' | 'in_progress' | 'review' | 'completed';
  completedAt: string | null;
  approvedById: number | null;
}

export interface FRIADetail {
  assessment: FRIAAssessment;
  sections: FRIASection[];
  tool: { name: string; riskLevel: string };
}

export interface FRIAByToolResponse {
  assessment: FRIAAssessment | null;
  sections: FRIASection[];
}

export interface FRIACreateResponse {
  assessment: FRIAAssessment;
  sections: FRIASection[];
  fRIAAssessmentId: number;
  existing?: boolean;
}

// --- Dashboard ---

export interface DashboardSummary {
  tools: {
    total: number;
    classified: number;
    unclassified: number;
  };
  riskDistribution: {
    prohibited: number;
    high: number;
    gpai: number;
    limited: number;
    minimal: number;
  };
  complianceScore: {
    overall: number;
    toolCount: number;
  };
  aiLiteracy: {
    totalEmployees: number;
    trained: number;
    completionRate: number;
    message: string;
  };
  requiresAttention: {
    toolId: number;
    toolName: string;
    severity: 'critical' | 'high' | 'medium';
    reason: string;
  }[];
  timeline: {
    date: string;
    title: string;
    description: string;
    daysUntil: number;
  }[];
  recentActivity: {
    auditLogId: number;
    userId: number;
    action: string;
    entity: string;
    entityId: number | null;
    details: string | null;
    email: string;
    fullName: string;
    createdAt: string;
  }[];
  planLimits: {
    users: { allowed: boolean; current: number; limit: number };
    tools: { allowed: boolean; current: number; limit: number };
  };
}

// --- Team ---

export interface TeamMember {
  id: number;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  lastLoginAt: string | null;
}

export interface TeamInvitation {
  invitationId: number;
  email: string;
  role: string;
  status: string;
  invitedBy: string;
  expiresAt: string;
}

export interface TeamListResponse {
  members: TeamMember[];
  invitations: TeamInvitation[];
  limits: {
    current: number;
    pending: number;
    max: number;
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
  tools: {
    list: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<AITool>>('/api/tools', { params }),
    getById: async (id: number): Promise<AIToolDetail> => {
      const res = await apiFetch<{ tool: AITool; classification: RiskClassification | null; requirements: ToolRequirement[] }>(`/api/tools/${id}`);
      return { ...res.tool, classification: res.classification, requirements: res.requirements };
    },
    create: (data: Record<string, unknown>) =>
      apiFetch<AITool>('/api/tools', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Record<string, unknown>) =>
      apiFetch<AITool>(`/api/tools/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) =>
      apiFetch<{ success: boolean }>(`/api/tools/${id}`, { method: 'DELETE' }),
    classify: (id: number) =>
      apiFetch<ClassifyResult>(`/api/tools/${id}/classify`, { method: 'POST', body: '{}' }),
  },
  billing: {
    createCheckout: (planName: string, period: string) =>
      apiFetch<CheckoutResponse>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ planName, period, returnUrl: window.location.origin }),
      }),
    checkoutStatus: (sessionId: string) =>
      apiFetch<CheckoutStatusResponse>('/api/billing/checkout-status', {
        params: { sessionId },
      }),
  },
  public: {
    quickCheck: (data: QuickCheckRequest) =>
      apiFetch<QuickCheckResponse>('/api/public/quick-check', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
  dashboard: {
    summary: () => apiFetch<DashboardSummary>('/api/dashboard/summary'),
  },
  team: {
    list: () => apiFetch<TeamListResponse>('/api/team/members'),
    invite: (data: { email: string; role: string }) =>
      apiFetch<TeamInvitation>('/api/team/invite', { method: 'POST', body: JSON.stringify(data) }),
    updateRole: (userId: number, role: string) =>
      apiFetch(`/api/team/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
    remove: (userId: number) =>
      apiFetch<{ success: boolean }>(`/api/team/members/${userId}`, { method: 'DELETE' }),
    revokeInvitation: (invitationId: number) =>
      apiFetch<{ success: boolean }>(`/api/team/invitations/${invitationId}`, { method: 'DELETE' }),
    resendInvitation: (invitationId: number) =>
      apiFetch<{ success: boolean }>(`/api/team/invitations/${invitationId}/resend`, { method: 'POST' }),
  },
  fria: {
    create: (toolId: number) =>
      apiFetch<FRIACreateResponse>('/api/fria', { method: 'POST', body: JSON.stringify({ toolId }) }),
    getById: (id: number) =>
      apiFetch<FRIADetail>(`/api/fria/${id}`),
    getByTool: (toolId: number) =>
      apiFetch<FRIAByToolResponse>(`/api/fria/by-tool/${toolId}`),
    updateSection: (id: number, sectionType: string, data: { content: Record<string, unknown>; completed?: boolean }) =>
      apiFetch<FRIASection>(`/api/fria/${id}/sections/${sectionType}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) =>
      apiFetch<{ status: string }>(`/api/fria/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  },
  admin: {
    overview: () => apiFetch<AdminOverview>('/api/admin/overview'),
    analytics: () => apiFetch<AdminAnalytics>('/api/admin/analytics'),
    users: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<AdminUser>>('/api/admin/users', { params }),
    organizations: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<AdminOrganization>>('/api/admin/organizations', { params }),
    subscriptions: (params: Record<string, string>) =>
      apiFetch<PaginatedResponse<AdminSubscription>>('/api/admin/subscriptions', { params }),
  },
};
