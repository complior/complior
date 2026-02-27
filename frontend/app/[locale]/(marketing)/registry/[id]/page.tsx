import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getToolBySlug, searchToolsServer, getProviderName } from '@/lib/registry';
import { generateToolMetaTitle, generateToolMetaDescription } from '@/lib/registry-seo';
import { validateTool } from '@/components/registry/toolValidation';
import { ToolHero } from '@/components/registry/ToolHero';
import { ToolTabs } from '@/components/registry/ToolTabs';
import { UseCaseRiskTable } from '@/components/registry/UseCaseRiskTable';
import { SimilarTools } from '@/components/registry/SimilarTools';
import { ToolFAQ } from '@/components/registry/ToolFAQ';
import { ToolJsonLd } from '@/components/registry/ToolJsonLd';
import { CTABanner } from '@/components/registry/CTABanner';

export const revalidate = 86400; // daily

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateStaticParams() {
  const res = await searchToolsServer({ sort: 'score', limit: 100 });
  return res.data.map((t) => ({ id: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params).id;
  const tool = await getToolBySlug(slug);
  if (!tool) return { title: 'Tool Not Found' };

  const title = generateToolMetaTitle(tool);
  const description = generateToolMetaDescription(tool);

  return {
    title,
    description,
    alternates: { canonical: `https://complior.ai/tools/${tool.slug}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://complior.ai/tools/${tool.slug}`,
      siteName: 'Complior AI Registry',
      images: [`https://complior.ai/og/tools/${tool.slug}.png`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tool.name} EU AI Act Compliance | Complior`,
      description,
    },
  };
}

export default async function ToolDetailPage({ params }: PageProps) {
  const { locale, id: slug } = await params;
  const tool = await getToolBySlug(slug);
  if (!tool) notFound();

  const validation = validateTool(tool);

  // Fetch similar tools (same category, exclude current)
  const similarRes = tool.category
    ? await searchToolsServer({ category: tool.category, limit: 5 })
    : { data: [] };
  const similarTools = similarRes.data.filter((t) => t.slug !== tool.slug).slice(0, 4);

  // Breadcrumb data
  const role = tool.aiActRole || 'deployer_product';
  const roleLabel = role === 'provider' ? 'Provider' : role === 'hybrid' ? 'Hybrid' : role === 'infrastructure' ? 'Infrastructure' : role === 'ai_feature' ? 'AI Feature' : 'AI Product';
  const category = tool.category?.split(',')[0]?.trim() || null;

  const pageStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem',
  };

  const linkStyle: React.CSSProperties = {
    color: 'var(--dark4)',
    transition: 'color .2s',
    textDecoration: 'none',
  };

  const sepStyle: React.CSSProperties = {
    color: 'var(--dark5)',
    opacity: 0.4,
  };

  return (
    <article style={pageStyle}>
      {/* JSON-LD structured data */}
      <ToolJsonLd tool={tool} />

      {/* Breadcrumb: AI Registry > Role > Category > ToolName */}
      <nav style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.625rem',
        color: 'var(--dark5)',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '.375rem',
      }}>
        <Link href={`/${locale}/registry`} style={linkStyle}>AI Registry</Link>
        <span style={sepStyle}>&rsaquo;</span>
        <Link href={`/${locale}/registry?role=${encodeURIComponent(role)}`} style={linkStyle}>
          {roleLabel}
        </Link>
        <span style={sepStyle}>&rsaquo;</span>
        {category && (
          <>
            <Link href={`/${locale}/registry?category=${encodeURIComponent(category)}`} style={linkStyle}>
              {category}
            </Link>
            <span style={sepStyle}>&rsaquo;</span>
          </>
        )}
        <span style={{ color: 'var(--dark)' }}>{tool.name}</span>
      </nav>

      <ToolHero tool={tool} validation={validation} />
      <UseCaseRiskTable tool={tool} />
      <ToolTabs tool={tool} validation={validation} />
      <SimilarTools tools={similarTools} />
      <ToolFAQ tool={tool} />
      <CTABanner toolName={tool.name} slug={tool.slug} />
    </article>
  );
}
