import React from 'react';
import type { RegistryTool } from '@/lib/registry';

interface DetectionTabProps {
  tool: RegistryTool;
}

export function DetectionTab({ tool }: DetectionTabProps) {
  const patterns = tool.detectionPatterns;
  const hasCode = patterns?.code && Object.keys(patterns.code).length > 0;
  const hasSaas = patterns?.saas && Object.keys(patterns.saas).length > 0;

  if (!hasCode && !hasSaas) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={secHStyle}>
          How Complior detects {tool.name} in your stack
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark4)', fontSize: '.875rem' }}>
          No detection patterns available for this tool yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={secHStyle}>
        How Complior detects {tool.name} in your stack
      </div>

      {hasCode && (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>Code Detection</div>
          {Object.entries(patterns!.code!).map(([key, value]) => (
            <div key={key} style={rowStyle}>
              <span style={keyStyle}>{key}</span>
              <span style={valStyle}>
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {hasSaas && (
        <div style={panelStyle}>
          <div style={panelHeaderStyle}>SaaS Detection</div>
          {Object.entries(patterns!.saas!).map(([key, value]) => (
            <div key={key} style={rowStyle}>
              <span style={keyStyle}>{key}</span>
              <span style={valStyle}>
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}
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

const panelStyle: React.CSSProperties = {
  background: '#0d1117',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: 'var(--radius)',
  padding: '1.25rem 1.5rem',
  marginBottom: '1rem',
  overflowX: 'auto',
};

const panelHeaderStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.5rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color: 'rgba(255,255,255,.35)',
  marginBottom: '.75rem',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '.75rem',
  marginBottom: '.375rem',
  fontFamily: 'var(--f-mono)',
  fontSize: '.6875rem',
  lineHeight: 1.7,
};

const keyStyle: React.CSSProperties = {
  color: 'var(--teal)',
  minWidth: 120,
  flexShrink: 0,
};

const valStyle: React.CSSProperties = {
  color: 'rgba(255,255,255,.65)',
};
