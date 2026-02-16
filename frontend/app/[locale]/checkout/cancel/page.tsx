'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

/* ─── Inline styles — matching checkout success design system ─── */

/* .crd */
const crdStyle: React.CSSProperties = {
  background: 'var(--card)',
  border: '1px solid var(--b2)',
  borderRadius: 14,
  padding: '2.5rem',
  width: '100%',
  maxWidth: 460,
  boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
  transition: '.35s',
  textAlign: 'center',
};

/* .ic base — warning/info style */
const icStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  display: 'grid',
  placeItems: 'center',
  margin: '0 auto 1.25rem',
  background: 'var(--bg2)',
  border: '1px solid var(--b2)',
};

/* .st-title */
const stTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontSize: '1.375rem',
  fontWeight: 700,
  color: 'var(--dark)',
  marginBottom: '.25rem',
  letterSpacing: '-.02em',
};

/* .st-sub */
const stSubStyle: React.CSSProperties = {
  fontSize: '.875rem',
  color: 'var(--dark4)',
  marginBottom: '1.5rem',
};

/* .bn base */
const bnBase: React.CSSProperties = {
  width: '100%',
  padding: '.8125rem 1.25rem',
  borderRadius: 8,
  fontFamily: 'var(--f-body)',
  fontWeight: 700,
  fontSize: '.875rem',
  cursor: 'pointer',
  border: 'none',
  transition: '.25s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '.5rem',
  textDecoration: 'none',
};

/* .bn-p (primary) */
const bnPrimaryStyle: React.CSSProperties = {
  ...bnBase,
  background: 'var(--teal)',
  color: '#fff',
  boxShadow: '0 2px 8px var(--teal-glow)',
};

/* .bn-g2 (secondary) */
const bnSecondaryStyle: React.CSSProperties = {
  ...bnBase,
  background: 'var(--bg2)',
  color: 'var(--dark3)',
  border: '1px solid var(--b2)',
  marginTop: '.5rem',
};

/* .fine */
const fineStyle: React.CSSProperties = {
  fontSize: '.75rem',
  color: 'var(--dark5)',
  marginTop: '1.25rem',
  lineHeight: 1.5,
};

/* SVG icon props */
const svgIconProps = {
  width: 28,
  height: 28,
  fill: 'none',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const svgBtnIcon = {
  width: 16,
  height: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/* ─── Content Component ─── */
function CancelContent() {
  const locale = useLocale();
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || '';
  const period = searchParams.get('period') || 'monthly';

  const retryUrl = plan
    ? `/${locale}/auth/register?plan=${plan}&period=${period}`
    : `/${locale}/pricing`;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 5rem)',
      padding: '2rem',
    }}>
      <div style={crdStyle} className="checkout-crd">
        <div style={{ animation: 'fi .4s ease both' }}>
          {/* Icon — info/warning (circle with info mark) */}
          <div style={icStyle}>
            <svg viewBox="0 0 24 24" {...svgIconProps} stroke="var(--dark5)">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div style={stTitleStyle}>{t('cancelTitle')}</div>
          <div style={stSubStyle}>{t('cancelDesc')}</div>

          {/* Try Again — primary */}
          <Link
            href={retryUrl}
            style={bnPrimaryStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--teal2)';
              el.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'var(--teal)';
              el.style.transform = 'translateY(0)';
            }}
          >
            {t('tryAgain')}
            <svg viewBox="0 0 24 24" style={svgBtnIcon}>
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </Link>

          {/* Browse Plans — secondary */}
          <Link
            href={`/${locale}/pricing`}
            style={bnSecondaryStyle}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--b3)';
              el.style.color = 'var(--dark)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.borderColor = 'var(--b2)';
              el.style.color = 'var(--dark3)';
            }}
          >
            {t('browsePlans')}
          </Link>

          {/* Fine print */}
          <div style={fineStyle}>
            {t('contactQuestion')}
          </div>
        </div>
      </div>

      {/* Keyframes + responsive */}
      <style jsx>{`
        @keyframes fi { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @media (max-width: 480px) {
          .checkout-crd { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Page Export with Suspense ─── */
export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 5rem)',
        padding: '2rem',
      }}>
        <div style={crdStyle}>
          <div style={icStyle}>
            <svg viewBox="0 0 24 24" {...svgIconProps} stroke="var(--dark5)">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div style={stTitleStyle}>Loading...</div>
        </div>
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
