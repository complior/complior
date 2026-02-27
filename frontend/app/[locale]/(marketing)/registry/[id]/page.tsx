import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getToolBySlug, searchToolsServer, getProviderName } from '@/lib/registry';
import { validateTool } from '@/components/registry/toolValidation';
import { ToolHero } from '@/components/registry/ToolHero';
import { ToolTabs } from '@/components/registry/ToolTabs';
import { SimilarTools } from '@/components/registry/SimilarTools';
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

  return {
    title: tool.seo?.title || `${tool.name} \u2014 AI Compliance Guide | Complior.ai`,
    description: tool.seo?.description || tool.description || `EU AI Act compliance analysis for ${tool.name}.`,
    openGraph: {
      title: tool.seo?.title || `${tool.name} \u2014 AI Compliance Guide`,
      description: tool.seo?.description || tool.description || `EU AI Act compliance analysis for ${tool.name}.`,
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

  const pageStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '2rem',
  };

  const breadcrumbStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    color: 'var(--dark5)',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '.375rem',
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
    <div style={pageStyle}>
      {/* Breadcrumb */}
      <nav style={breadcrumbStyle}>
        <Link href={`/${locale}/registry`} style={linkStyle}>AI Registry</Link>
        <span style={sepStyle}>&rsaquo;</span>
        {tool.category && (
          <>
            <Link href={`/${locale}/tools?category=${encodeURIComponent(tool.category)}`} style={linkStyle}>
              {tool.category}
            </Link>
            <span style={sepStyle}>&rsaquo;</span>
          </>
        )}
        <span style={{ color: 'var(--dark)' }}>{tool.name}</span>
      </nav>

      <ToolHero tool={tool} validation={validation} />
      <ToolTabs tool={tool} validation={validation} />
      <SimilarTools tools={similarTools} />
      <CTABanner toolName={tool.name} />
    </div>
  );
}
