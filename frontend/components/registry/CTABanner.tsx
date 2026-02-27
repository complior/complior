import React from 'react';

interface CTABannerProps {
  toolName: string;
  slug?: string;
}

export function CTABanner({ toolName, slug }: CTABannerProps) {
  return (
    <div style={{
      background: 'var(--card2)',
      border: '1px solid var(--b2)',
      borderRadius: 14,
      padding: '2rem',
      textAlign: 'center',
      marginBottom: '2rem',
    }}>
      <h3 style={{
        fontFamily: 'var(--f-display)',
        fontSize: '1.25rem',
        fontWeight: 700,
        color: 'var(--dark)',
        marginBottom: '.5rem',
      }}>
        Track {toolName} compliance in your organization
      </h3>
      <p style={{
        fontSize: '.8125rem',
        color: 'var(--dark4)',
        marginBottom: '1rem',
      }}>
        One command to scan. Full dashboard to track.
      </p>
      <div style={{
        display: 'flex',
        gap: '.75rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: 'var(--f-mono)',
          fontSize: '.75rem',
          background: '#0d1117',
          color: 'var(--teal)',
          padding: '.5rem 1rem',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,.08)',
        }}>
          <span style={{ color: 'var(--teal)' }}>$</span> complior scan
        </div>
        <button style={{
          fontFamily: 'var(--f-body)',
          fontSize: '.75rem',
          fontWeight: 700,
          color: '#fff',
          background: 'var(--teal)',
          border: 'none',
          borderRadius: 6,
          padding: '.5rem 1rem',
          cursor: 'pointer',
          transition: '.2s',
        }}>
          Start tracking →
        </button>
      </div>
    </div>
  );
}
