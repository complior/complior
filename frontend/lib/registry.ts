// Registry API types and fetch functions

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export interface Obligation {
  obligation_id: string;
  title: string;
  article?: string;
  applies_to_role?: string;
  deadline?: string;
  severity?: string;
  status?: string;
  evidence_summary?: string | null;
}

export interface PublicDocumentation {
  grade: string;
  score: number;
  total: number;
  percent: number;
  items: Array<{ id: string; label: string; found: boolean; signal: string }>;
  checklist: string;
  gradedAt: string;
}

export interface EuAiActAssessment {
  jurisdiction_id?: string;
  risk_level?: string;
  risk_reasoning?: string;
  applicable_obligation_ids?: string[];
  deployer_obligations?: Obligation[];
  provider_obligations?: Obligation[];
  publicDocumentation?: PublicDocumentation;
  legacyScore?: number | null;
  score?: number | null;
  coverage?: number;
  transparencyScore?: number;
  transparencyGrade?: string;
  confidence?: string;
  assessed_at?: string;
}

export interface RegistryTool {
  registryToolId: number;
  slug: string;
  name: string;
  provider: string | { name: string; website?: string; description?: string };
  description: string | null;
  category: string | null;
  riskLevel: string | null;
  aiActRole: string | null;
  level: 'classified' | 'scanned' | 'verified';
  assessments: {
    'eu-ai-act'?: EuAiActAssessment;
  } | null;
  detectionPatterns: {
    code?: Record<string, string | string[]>;
    saas?: Record<string, string | string[]>;
  } | null;
  evidence: Array<{
    date: string;
    title: string;
    description?: string;
    type?: string;
  }> | null;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
  } | null;
  jurisdictions: string[] | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegistryStats {
  totalTools: number;
  byRiskLevel: Record<string, number>;
  byLevel: Record<string, number>;
  withDetectionPatterns: number;
  topCategories: Array<{ category: string; count: number }>;
}

export interface RegistrySearchParams {
  q?: string;
  category?: string;
  risk?: string;
  aiActRole?: string;
  level?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface RegistrySearchResult {
  data: RegistryTool[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function buildQueryString(params: RegistrySearchParams): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// Client-side fetch (uses Next.js rewrite /v1/... → backend)
export async function searchTools(params: RegistrySearchParams): Promise<RegistrySearchResult> {
  const qs = buildQueryString(params);
  const res = await fetch(`/v1/registry/tools${qs}`);
  if (!res.ok) throw new Error(`Registry search failed: ${res.status}`);
  return res.json();
}

// Server-side fetch (direct to backend)
export async function searchToolsServer(
  params: RegistrySearchParams,
  revalidate = 3600,
): Promise<RegistrySearchResult> {
  const qs = buildQueryString(params);
  const res = await fetch(`${BACKEND_URL}/v1/registry/tools${qs}`, {
    next: { revalidate },
  });
  if (!res.ok) {
    console.error(`Registry search failed: ${res.status}`);
    return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
  return res.json();
}

export async function getToolBySlug(slug: string, revalidate = 86400): Promise<RegistryTool | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/registry/tools/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getRegistryStats(revalidate = 3600): Promise<RegistryStats | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/registry/stats`, {
      next: { revalidate },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Helper: extract score from eu-ai-act assessment (legacy — deprecated)
export function getToolScore(tool: RegistryTool): number | null {
  return tool.assessments?.['eu-ai-act']?.legacyScore ?? tool.assessments?.['eu-ai-act']?.score ?? null;
}

// Helper: extract public documentation grade (v4)
export function getToolGrade(tool: RegistryTool): string | null {
  return tool.assessments?.['eu-ai-act']?.publicDocumentation?.grade ?? null;
}

// Helper: extract public documentation object (v4)
export function getPublicDocumentation(tool: RegistryTool): PublicDocumentation | null {
  return tool.assessments?.['eu-ai-act']?.publicDocumentation ?? null;
}

// Helper: get grade color CSS variable
export function getGradeColor(grade: string | null): string {
  if (!grade) return 'var(--dark5)';
  if (grade.startsWith('A')) return 'var(--teal)';
  if (grade.startsWith('B')) return 'var(--blue)';
  if (grade.startsWith('C')) return 'var(--amber)';
  return 'var(--coral)';
}

// Helper: get AI Act role label for display
export function getAiActRoleLabel(role: string | null): string {
  const labels: Record<string, string> = {
    provider: 'AI Provider',
    deployer_product: 'Deployer Product',
    hybrid: 'Hybrid',
    infrastructure: 'Infrastructure',
    ai_feature: 'AI Feature',
  };
  return labels[role || ''] || 'Unclassified';
}

// Helper: extract assessment object
export function getToolAssessment(tool: RegistryTool): EuAiActAssessment | null {
  return tool.assessments?.['eu-ai-act'] ?? null;
}

// Helper: get provider name from string or object
export function getProviderName(provider: RegistryTool['provider']): string {
  if (!provider) return 'Unknown';
  if (typeof provider === 'string') return provider;
  return provider.name || 'Unknown';
}

// Helper: get score color CSS variable
export function getScoreColor(score: number | null): string {
  if (score === null) return 'var(--dark5)';
  if (score < 30) return 'var(--coral)';
  if (score < 50) return 'var(--amber)';
  if (score < 70) return 'var(--blue)';
  return 'var(--teal)';
}

// Helper: get score verbal label
export function getScoreLabel(score: number | null): string {
  if (score === null) return 'Insufficient Data';
  if (score < 30) return 'Critical';
  if (score < 50) return 'Needs improvement';
  if (score < 70) return 'Moderate';
  if (score < 85) return 'Good';
  return 'Excellent';
}

// Helper: get coverage from tool
export function getToolCoverage(tool: RegistryTool): number | null {
  return tool.assessments?.['eu-ai-act']?.coverage ?? null;
}

// Helper: get transparency grade from tool
export function getTransparencyGrade(tool: RegistryTool): string | null {
  return tool.assessments?.['eu-ai-act']?.transparencyGrade ?? null;
}

// Helper: get coverage label
export function getCoverageLabel(coverage: number | null): string {
  if (coverage === null) return 'N/A';
  if (coverage === 0) return 'No data';
  if (coverage < 20) return 'Very low';
  if (coverage < 50) return 'Low';
  if (coverage < 80) return 'Moderate';
  return 'High';
}

// Helper: get transparency grade color
export function getTransparencyColor(grade: string | null): string {
  if (!grade) return 'var(--dark5)';
  if (grade.startsWith('A')) return 'var(--teal)';
  if (grade.startsWith('B')) return 'var(--blue)';
  if (grade.startsWith('C')) return 'var(--amber)';
  return 'var(--coral)';
}

// Helper: get risk badge styles
export function getRiskStyles(risk: string): { bg: string; color: string; border: string } {
  const styles: Record<string, { bg: string; color: string; border: string }> = {
    prohibited: { bg: 'rgba(248,113,113,.1)', color: 'var(--coral)', border: '1px solid rgba(248,113,113,.15)' },
    unacceptable: { bg: 'rgba(248,113,113,.1)', color: 'var(--coral)', border: '1px solid rgba(248,113,113,.15)' },
    high: { bg: 'rgba(251,191,36,.1)', color: 'var(--amber)', border: '1px solid rgba(251,191,36,.15)' },
    gpai_systemic: { bg: 'rgba(167,139,250,.1)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,.15)' },
    gpai: { bg: 'rgba(167,139,250,.1)', color: 'var(--purple)', border: '1px solid rgba(167,139,250,.15)' },
    limited: { bg: 'rgba(96,165,250,.1)', color: 'var(--blue)', border: '1px solid rgba(96,165,250,.15)' },
    minimal: { bg: 'rgba(52,211,153,.08)', color: 'var(--teal)', border: '1px solid rgba(52,211,153,.15)' },
  };
  return styles[risk] || styles.minimal;
}

// Helper: format risk label for display
export function getRiskLabel(risk: string): string {
  const labels: Record<string, string> = {
    prohibited: 'PROHIBITED',
    unacceptable: 'PROHIBITED',
    high: 'HIGH RISK',
    gpai_systemic: 'GPAI SYSTEMIC',
    gpai: 'GPAI',
    limited: 'LIMITED RISK',
    minimal: 'MINIMAL',
  };
  return labels[risk] || risk?.toUpperCase() || 'UNKNOWN';
}

// Helper: get deployer obligation count
export function getDeployerObligationCount(tool: RegistryTool): number {
  const assessment = tool.assessments?.['eu-ai-act'];
  if (!assessment) return 0;
  return assessment.deployer_obligations?.length ?? assessment.applicable_obligation_ids?.length ?? 0;
}

// Helper: get applicable article numbers from obligations
export function getApplicableArticles(tool: RegistryTool): string[] {
  const assessment = tool.assessments?.['eu-ai-act'];
  if (!assessment?.deployer_obligations) return [];
  const articles = new Set<string>();
  for (const obl of assessment.deployer_obligations) {
    if (obl.article) articles.add(obl.article);
  }
  return Array.from(articles);
}

// Helper: check if a deadline string has passed
export function isDeadlinePassed(deadline: string | undefined): boolean {
  if (!deadline) return false;
  const now = new Date();
  const parsed = new Date(deadline);
  return !isNaN(parsed.getTime()) && parsed < now;
}

// Helper: format assessed_at date for display
export function formatAssessedDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
