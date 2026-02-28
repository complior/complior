// Registry SEO helpers — JSON-LD generators, FAQ templates, effort hours, use case risk data
import type { RegistryTool } from './registry';
import {
  getProviderName,
  getRiskLabel,
  getDeployerObligationCount,
  getPublicDocumentation,
  getToolAssessment,
  getApplicableArticles,
  isDeadlinePassed,
  computeWeightedGrade,
} from './registry';

// ── Effort hours by obligation category ──
export const EFFORT_HOURS: Record<string, string> = {
  'AI Literacy': '~8h',
  'Transparency': '~4h',
  'Content Marking': '~4h',
  'Record-Keeping': '~8h',
  'FRIA': '~24h',
  'Registration': '~2h',
  'Cooperation': '~2h',
  'Conformity Assessment': '~40h',
  'Human Oversight': '~16h',
  'Risk Management': '~24h',
  'Data Governance': '~16h',
  'Technical Documentation': '~20h',
};

// Helper to estimate effort from obligation title
export function getEffortForObligation(title: string): string {
  for (const [key, value] of Object.entries(EFFORT_HOURS)) {
    if (title.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return '~4h';
}

// ── Total effort for a tool ──
export function getTotalEffortHours(tool: RegistryTool): number {
  const assessment = getToolAssessment(tool);
  if (!assessment?.deployer_obligations?.length) {
    const risk = tool.riskLevel || '';
    if (risk === 'high') return 120;
    if (risk.startsWith('gpai')) return 32;
    if (risk === 'limited') return 20;
    return 12;
  }
  let total = 0;
  for (const obl of assessment.deployer_obligations) {
    const effort = getEffortForObligation(obl.title);
    total += parseInt(effort.replace(/[^0-9]/g, '')) || 4;
  }
  return total;
}

// ── Use Case Risk Data ──
export interface UseCaseRow {
  context: string;
  risk: string;
  riskColor: string;
  riskBg: string;
  obligations: string;
}

export function getUseCaseRiskRows(tool: RegistryTool): UseCaseRow[] {
  const risk = tool.riskLevel || 'minimal';
  if (risk === 'prohibited' || risk === 'unacceptable') {
    return [{ context: 'Any use in the EU', risk: 'PROHIBITED', riskColor: 'var(--coral)', riskBg: 'rgba(248,113,113,.08)', obligations: 'Banned — fines up to €35M' }];
  }
  // For GPAI/other tools, show context-dependent rows
  return [
    { context: 'Internal coding tool', risk: 'MINIMAL', riskColor: 'var(--teal)', riskBg: 'var(--teal-dim)', obligations: '3 obligations (~12h)' },
    { context: 'Customer support bot', risk: 'LIMITED', riskColor: 'var(--blue)', riskBg: 'rgba(96,165,250,.08)', obligations: '7 obligations (~32h)' },
    { context: 'HR screening / hiring', risk: 'HIGH', riskColor: 'var(--amber)', riskBg: 'rgba(251,191,36,.08)', obligations: '19 obligations (~120h)' },
    { context: 'Credit decisions', risk: 'HIGH', riskColor: 'var(--amber)', riskBg: 'rgba(251,191,36,.08)', obligations: '19 obligations (~120h)' },
    { context: 'Medical triage', risk: 'HIGH', riskColor: 'var(--amber)', riskBg: 'rgba(251,191,36,.08)', obligations: '19 obligations (~120h)' },
  ];
}

// ── Article info for accordion cards ──
export interface ArticleInfo {
  article: string;
  title: string;
  description: string;
  badges: Array<{ label: string; type: 'required' | 'passed' | 'provider' | 'upcoming' }>;
}

export function getArticleInfo(tool: RegistryTool): ArticleInfo[] {
  const assessment = getToolAssessment(tool);
  const provider = getProviderName(tool.provider);
  const obligations = assessment?.deployer_obligations || [];
  const providerObligations = assessment?.provider_obligations || [];

  const articles: ArticleInfo[] = [];
  const seen = new Set<string>();

  for (const obl of obligations) {
    const art = obl.article || obl.obligation_id;
    if (!art || seen.has(art)) continue;
    seen.add(art);

    const badges: ArticleInfo['badges'] = [{ label: 'REQUIRED', type: 'required' }];
    if (obl.deadline && isDeadlinePassed(obl.deadline)) {
      badges.push({ label: 'DEADLINE PASSED', type: 'passed' });
    } else if (obl.deadline) {
      const d = new Date(obl.deadline);
      if (!isNaN(d.getTime())) {
        const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
        badges.push({ label, type: 'upcoming' });
      }
    }

    articles.push({
      article: art,
      title: obl.title,
      description: obl.evidence_summary || `Obligation under ${art} for ${tool.name} deployers.`,
      badges,
    });
  }

  for (const obl of providerObligations) {
    const art = obl.article || obl.obligation_id;
    if (!art || seen.has(art)) continue;
    seen.add(art);
    articles.push({
      article: art,
      title: obl.title,
      description: obl.evidence_summary || `${provider}'s responsibility under ${art}.`,
      badges: [{ label: `PROVIDER: ${provider}`, type: 'provider' }],
    });
  }

  return articles;
}

// ── FAQ generation ──
export interface FAQItem {
  question: string;
  answer: string;
}

export function generateToolFAQs(tool: RegistryTool): FAQItem[] {
  const name = tool.name;
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const oblCount = getDeployerObligationCount(tool);
  const publicDoc = getPublicDocumentation(tool);
  const weighted = publicDoc ? computeWeightedGrade(publicDoc) : null;
  const grade = weighted?.grade || publicDoc?.grade || 'N/A';
  const found = publicDoc?.score ?? 0;
  const total = publicDoc?.total ?? 9;
  const provider = getProviderName(tool.provider);
  const hours = getTotalEffortHours(tool);
  const articles = getApplicableArticles(tool);
  const topArticles = articles.slice(0, 4).join(', ');
  const risk = tool.riskLevel || '';

  // Q1: Risk classification
  let a1 = `${name} is classified as ${riskLabel} under the EU AI Act.`;
  if (risk.startsWith('gpai')) {
    a1 += ` However, the risk level of your specific deployment depends on your use case: internal tools may be Minimal risk, while HR screening or credit decisions escalate to High Risk, which triggers additional obligations including a Fundamental Rights Impact Assessment (Art. 27).`;
  } else if (risk === 'high') {
    a1 += ` This means ${oblCount} mandatory obligations including conformity assessment, FRIA, and human oversight requirements.`;
  } else if (risk === 'prohibited' || risk === 'unacceptable') {
    a1 += ` This tool is prohibited under Art. 5. Any use in the EU results in fines up to €35M or 7% of global annual revenue.`;
  }

  // Q2: Obligations
  let a2 = `As a ${name} deployer, you have ${oblCount} base obligations (~${hours} hours estimated effort).`;
  if (topArticles) a2 += ` Key articles: ${topArticles}.`;
  if (risk.startsWith('gpai')) {
    a2 += ` If used for high-risk decisions like hiring or credit, additional obligations apply including a Fundamental Rights Impact Assessment.`;
  }

  // Q3: Transparency
  let a3 = '';
  if (grade.startsWith('A') || grade.startsWith('B')) {
    a3 = `${name} demonstrates strong documentation practices. `;
  } else if (grade.startsWith('C')) {
    a3 = `Partially. ${provider} provides some key documents, but gaps remain. `;
  } else {
    a3 = `${name} has significant documentation gaps. `;
  }
  a3 += `Documentation Grade: ${grade} (${found} out of ${total}).`;

  // Q4: Deadlines
  const assessment = getToolAssessment(tool);
  const deadlines: string[] = [];
  if (assessment?.deployer_obligations) {
    for (const obl of assessment.deployer_obligations) {
      if (obl.deadline) {
        const passed = isDeadlinePassed(obl.deadline);
        const prefix = passed ? 'Already passed' : 'Upcoming';
        deadlines.push(`${prefix}: ${obl.title} — ${obl.deadline}.`);
      }
    }
  }
  let a4 = deadlines.length > 0
    ? deadlines.join(' ')
    : 'Key deadlines: AI Literacy (Art. 4) was due February 2, 2025. Transparency (Art. 50) was due August 2, 2025. Content marking (Art. 52) is due August 2, 2026. Full high-risk compliance is required by August 2, 2027.';
  a4 += ' Fines for non-compliance: up to €35M or 7% of global annual revenue per violation.';

  return [
    { question: `What is ${name}'s EU AI Act risk classification?`, answer: a1 },
    { question: `What are my obligations if I deploy ${name}?`, answer: a2 },
    { question: `Does ${name} comply with EU AI Act transparency requirements?`, answer: a3 },
    { question: `What are the EU AI Act deadlines for ${name}?`, answer: a4 },
  ];
}

// ── JSON-LD generators ──

export function generateBreadcrumbJsonLd(tool: RegistryTool): object {
  const role = tool.aiActRole || 'deployer_product';
  const roleLabel = role === 'provider' ? 'Provider' : role === 'hybrid' ? 'Hybrid' : role === 'infrastructure' ? 'Infrastructure' : role === 'ai_feature' ? 'AI Feature' : 'AI Product';
  const category = tool.category?.split(',')[0]?.trim() || 'AI Tool';

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'AI Registry', item: 'https://complior.ai/tools' },
      { '@type': 'ListItem', position: 2, name: roleLabel, item: `https://complior.ai/tools?role=${encodeURIComponent(role)}` },
      { '@type': 'ListItem', position: 3, name: category, item: `https://complior.ai/tools?category=${encodeURIComponent(category.toLowerCase())}` },
      { '@type': 'ListItem', position: 4, name: tool.name, item: `https://complior.ai/tools/${tool.slug}` },
    ],
  };
}

export function generateSoftwareAppJsonLd(tool: RegistryTool): object {
  const provider = getProviderName(tool.provider);
  const providerUrl = typeof tool.provider === 'object' ? tool.provider?.website : undefined;
  const publicDoc = getPublicDocumentation(tool);
  const weighted = publicDoc ? computeWeightedGrade(publicDoc) : null;
  const grade = weighted?.grade || publicDoc?.grade || '';
  const wp = weighted?.weightedPercent ?? 0;
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const oblCount = getDeployerObligationCount(tool);
  const category = tool.category?.split(',')[0]?.trim() || 'AI Tool';

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    applicationCategory: category,
    operatingSystem: 'Web',
    ...(providerUrl ? { url: providerUrl } : {}),
    author: {
      '@type': 'Organization',
      name: provider,
      ...(providerUrl ? { url: providerUrl } : {}),
    },
    description: `${riskLabel} AI system under EU AI Act. Documentation Grade ${grade} (${wp}%). ${oblCount} deployer obligations.`,
  };
}

export function generateFAQJsonLd(faqs: FAQItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function generateIndexJsonLd(totalTools: number, topTools: Array<{ slug: string; name: string }>): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'AI Registry — Complior',
    description: `Open database of ${totalTools.toLocaleString()} AI tools classified by EU AI Act risk level, documentation availability, and deployer obligations.`,
    url: 'https://complior.ai/tools',
    isPartOf: { '@type': 'WebSite', name: 'Complior.ai', url: 'https://complior.ai' },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: totalTools,
      itemListElement: topTools.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: `https://complior.ai/tools/${t.slug}`,
        name: t.name,
      })),
    },
  };
}

// ── SEO meta helpers ──

export function generateToolMetaTitle(tool: RegistryTool): string {
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const oblCount = getDeployerObligationCount(tool);
  if (tool.riskLevel === 'prohibited' || tool.riskLevel === 'unacceptable') {
    return `${tool.name} EU AI Act: Prohibited — Banned Under Art. 5 | Complior`;
  }
  return `${tool.name} EU AI Act Compliance: ${riskLabel} Risk, ${oblCount} Obligations | Complior`;
}

export function generateToolMetaDescription(tool: RegistryTool): string {
  const riskLabel = getRiskLabel(tool.riskLevel || '');
  const oblCount = getDeployerObligationCount(tool);
  const publicDoc = getPublicDocumentation(tool);
  const weighted = publicDoc ? computeWeightedGrade(publicDoc) : null;
  const grade = weighted?.grade || publicDoc?.grade || '';
  const wp = weighted?.weightedPercent ?? 0;
  const hours = getTotalEffortHours(tool);
  const articles = getApplicableArticles(tool).slice(0, 4).join(', ');

  return `Is ${tool.name} compliant with the EU AI Act? ${riskLabel} classification, Documentation Grade ${grade} (${wp}%), ${oblCount} deployer obligations (~${hours} hours).${articles ? ` ${articles} breakdown.` : ''} Free compliance checklist.`;
}
