import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { searchToolsServer, getRegistryStats } from '@/lib/registry';
import { generateIndexJsonLd } from '@/lib/registry-seo';
import { ToolGrid } from '@/components/registry/ToolGrid';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getRegistryStats();
  const total = stats?.totalTools ?? 0;
  return {
    title: `AI Registry: ${total.toLocaleString()} AI Tools Classified by EU AI Act Risk Level | Complior`,
    description: `Open database of ${total.toLocaleString()} AI tools with EU AI Act risk classification, documentation grades (A-F), and deployer obligation counts. Search ChatGPT, Midjourney, Claude, HireVue compliance.`,
    alternates: { canonical: 'https://complior.ai/tools' },
    openGraph: {
      title: `AI Registry: ${total.toLocaleString()} AI Tools Classified by EU AI Act | Complior`,
      description: 'Open database of AI tools with risk classification, documentation grades, and deployer obligations. Free.',
      type: 'website',
      url: 'https://complior.ai/tools',
      siteName: 'Complior AI Registry',
    },
    twitter: { card: 'summary_large_image' },
  };
}

export default async function ToolsPage() {
  const [stats, featured, initial] = await Promise.all([
    getRegistryStats(),
    searchToolsServer({ sort: 'score', limit: 5 }),
    searchToolsServer({ page: 1, limit: 20 }),
  ]);

  const totalTools = stats?.totalTools ?? 0;
  const topTools = featured.data.slice(0, 5).map((t) => ({ slug: t.slug, name: t.name }));
  const jsonLd = generateIndexJsonLd(totalTools, topTools);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 2rem' }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{
          fontFamily: 'var(--f-display)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 800,
          color: 'var(--dark)',
          letterSpacing: '-.03em',
          marginBottom: '.375rem',
        }}>
          AI <em style={{ fontStyle: 'italic', color: 'var(--teal)', fontWeight: 500 }}>Registry</em>
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--dark4)', maxWidth: 600 }}>
          Open database of AI tools classified by EU AI Act risk level, public documentation availability, and deployer obligations.
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <Stat value={totalTools.toLocaleString()} label="Tools" />
        <Stat value="5" label="Risk Levels" />
        <Stat value="108" label="Obligations Mapped" />
        <Stat value="247" label="Companies Tracking" />
      </div>

      {/* Interactive grid */}
      <Suspense fallback={<div style={{ color: 'var(--dark5)', fontFamily: 'var(--f-mono)', fontSize: '.75rem' }}>Loading tools...</div>}>
        <ToolGrid
          initialData={initial}
          featured={featured.data}
          stats={stats}
        />
      </Suspense>

      {/* SEO bottom text */}
      <article style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--b)' }}>
        <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.125rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '.75rem' }}>
          About the AI Registry
        </h2>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '1rem' }}>
          The Complior AI Registry is an open database of AI tools classified under the EU AI Act and other global AI regulations. Each tool is assessed for risk level (Prohibited, High Risk, GPAI, Limited, or Minimal), public documentation availability (graded A through F), and deployer obligations.
        </p>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '1rem' }}>
          For every tool, we map the applicable EU AI Act articles, estimate the compliance effort in hours, and track deadlines. 247 companies currently use Complior to track their AI tool compliance across 108 mapped obligations.
        </p>
        <h3 style={{ fontFamily: 'var(--f-display)', fontSize: '.9375rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '.5rem' }}>
          Risk Classifications Explained
        </h3>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '.5rem' }}>
          <strong style={{ color: 'var(--dark3)' }}>Prohibited</strong> — Tools banned under Article 5, including untargeted facial scraping and social scoring. Usage results in fines up to €35M.
        </p>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '.5rem' }}>
          <strong style={{ color: 'var(--dark3)' }}>High Risk</strong> — Tools used in critical domains: HR, credit, law enforcement, education, healthcare. Up to 19 deployer obligations including FRIA and conformity assessment.
        </p>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '.5rem' }}>
          <strong style={{ color: 'var(--dark3)' }}>GPAI</strong> — General-Purpose AI systems like ChatGPT, Claude, and Gemini. 7 base obligations. Risk escalates based on deployment context.
        </p>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700, marginBottom: '.5rem' }}>
          <strong style={{ color: 'var(--dark3)' }}>Limited Risk</strong> — Tools with transparency obligations only (Art. 50). Includes chatbots, emotion recognition, and deepfake generators.
        </p>
        <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', lineHeight: 1.8, maxWidth: 700 }}>
          <strong style={{ color: 'var(--dark3)' }}>Minimal Risk</strong> — Most AI tools. No specific obligations, but voluntary codes of practice encouraged.
        </p>
      </article>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '.375rem' }}>
      <span style={{ fontFamily: 'var(--f-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' }}>{value}</span>
      <span style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</span>
    </div>
  );
}
