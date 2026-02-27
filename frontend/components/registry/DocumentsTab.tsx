import React from 'react';
import type { RegistryTool } from '@/lib/registry';

interface DocumentsTabProps {
  tool: RegistryTool;
}

export function DocumentsTab({ tool }: DocumentsTabProps) {
  const docs = [
    { icon: '\uD83D\uDCCB', name: 'AI Literacy Training Plan', desc: `LLM-specific: hallucinations, data leakage, prompt injection.` },
    { icon: '\uD83D\uDCC4', name: 'Transparency Notice (Art. 50)', desc: `"This service uses ${tool.name}. Responses are AI-generated..."` },
    { icon: '\uD83D\uDDC2\uFE0F', name: 'AI System Registration Card', desc: `${tool.name}, ${typeof tool.provider === 'string' ? tool.provider : tool.provider?.name || 'Provider'}. Audit-ready.` },
    { icon: '\u2696\uFE0F', name: 'FRIA \u2014 Fundamental Rights Impact Assessment', desc: `Pre-scoped for ${tool.name}. Only if HR/credit/legal/medical.` },
  ];

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={secHStyle}>
        Generate Compliance Documents for {tool.name}
      </h2>
      <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', marginBottom: '1.25rem', maxWidth: 600 }}>
        Pre-filled with {tool.name}-specific data &mdash; risk classification, applicable articles, provider details, and recommended mitigations.
      </p>
      {docs.map((doc) => (
        <div
          key={doc.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            border: '1px solid var(--b)',
            borderRadius: 'var(--radius)',
            marginBottom: '.5rem',
            transition: '.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>{doc.icon}</span>
            <div>
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '.875rem', fontWeight: 700, color: 'var(--dark)' }}>{doc.name}</div>
              <div style={{ fontSize: '.5625rem', color: 'var(--dark5)' }}>{doc.desc}</div>
            </div>
          </div>
          <button style={{
            fontFamily: 'var(--f-mono)',
            fontSize: '.625rem',
            fontWeight: 700,
            color: 'var(--teal)',
            background: 'var(--teal-dim)',
            border: '1px solid rgba(52,211,153,.15)',
            borderRadius: 6,
            padding: '.375rem .75rem',
            cursor: 'pointer',
            transition: '.2s',
          }}>
            Generate &rarr;
          </button>
        </div>
      ))}
      {/* CLI command */}
      <div style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.75rem',
        color: 'var(--dark5)',
        background: '#0d1117',
        padding: '.75rem 1rem',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,.08)',
        marginTop: '.5rem',
      }}>
        <span style={{ color: 'var(--teal)' }}>$</span> complior fria:generate --tool {tool.slug}
      </div>
    </div>
  );
}

const secHStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.5625rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--dark5)',
  marginBottom: '1rem',
};
