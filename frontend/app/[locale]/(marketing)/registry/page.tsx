import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { searchToolsServer, getRegistryStats } from '@/lib/registry';
import { ToolGrid } from '@/components/registry/ToolGrid';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'AI Registry \u2014 5,000+ AI Tools Classified | Complior.ai',
    description: 'Browse 5,000+ AI tools classified by EU AI Act risk level. Find compliance scores, applicable articles, and deployer obligations for ChatGPT, Copilot, Midjourney, and more.',
    openGraph: {
      title: 'AI Registry \u2014 5,000+ AI Tools Classified | Complior.ai',
      description: 'Browse 5,000+ AI tools classified by EU AI Act risk level.',
    },
  };
}

export default async function ToolsPage() {
  const [stats, featured, initial] = await Promise.all([
    getRegistryStats(),
    searchToolsServer({ sort: 'score', limit: 5 }),
    searchToolsServer({ page: 1, limit: 20 }),
  ]);

  /* ---- Styles from HTML mockup ---- */
  const pageStyle: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '2.5rem 2rem',
  };

  const heroStyle: React.CSSProperties = {
    marginBottom: '2.5rem',
  };

  const h1Style: React.CSSProperties = {
    fontFamily: 'var(--f-display)',
    fontSize: 'clamp(2rem, 4vw, 3rem)',
    fontWeight: 800,
    color: 'var(--dark)',
    letterSpacing: '-.03em',
    marginBottom: '.375rem',
  };

  const emStyle: React.CSSProperties = {
    fontStyle: 'italic',
    color: 'var(--teal)',
    fontWeight: 500,
  };

  const subStyle: React.CSSProperties = {
    fontSize: '1rem',
    color: 'var(--dark4)',
    maxWidth: 540,
  };

  const statsBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
  };

  const statStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: '.375rem',
  };

  const statNumStyle: React.CSSProperties = {
    fontFamily: 'var(--f-display)',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
  };

  const statLabelStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.625rem',
    color: 'var(--dark5)',
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  };

  const totalTools = stats?.totalTools ?? 0;
  const jurisdictionCount = 12; // static for now

  return (
    <div style={pageStyle}>
      {/* Hero */}
      <div style={heroStyle}>
        <h1 style={h1Style}>
          AI <em style={emStyle}>Registry</em>
        </h1>
        <p style={subStyle}>
          Open database of AI tools classified by risk level, compliance score, and applicable regulations.
        </p>
      </div>

      {/* Stats bar */}
      <div style={statsBarStyle}>
        <div style={statStyle}>
          <span style={statNumStyle}>{totalTools.toLocaleString()}</span>
          <span style={statLabelStyle}>Tools</span>
        </div>
        <div style={statStyle}>
          <span style={statNumStyle}>5</span>
          <span style={statLabelStyle}>Risk Levels</span>
        </div>
        <div style={statStyle}>
          <span style={statNumStyle}>450+</span>
          <span style={statLabelStyle}>Articles Mapped</span>
        </div>
        <div style={statStyle}>
          <span style={statNumStyle}>{jurisdictionCount}</span>
          <span style={statLabelStyle}>Jurisdictions</span>
        </div>
      </div>

      {/* Interactive grid */}
      <Suspense fallback={<div style={{ color: 'var(--dark5)', fontFamily: 'var(--f-mono)', fontSize: '.75rem' }}>Loading tools...</div>}>
        <ToolGrid
          initialData={initial}
          featured={featured.data}
          stats={stats}
        />
      </Suspense>
    </div>
  );
}
