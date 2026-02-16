'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { api } from '@/lib/api';

/* ─── Plan data helper ─── */
type PlanKey = 'starter' | 'growth' | 'scale';

function usePlanData(t: ReturnType<typeof useTranslations>) {
  return useMemo(() => ({
    starter: {
      name: t('starterName'),
      price: t('starterPrice'),
      annual: t('starterAnnual'),
      per: '/mo',
      features: [t('starterF1'), t('starterF2'), t('starterF3'), t('starterF4'), t('starterF5')],
    },
    growth: {
      name: t('growthName'),
      price: t('growthPrice'),
      annual: t('growthAnnual'),
      per: '/mo',
      features: [t('growthF1'), t('growthF2'), t('growthF3'), t('growthF4'), t('growthF5'), t('growthF6')],
    },
    scale: {
      name: t('scaleName'),
      price: t('scalePrice'),
      annual: t('scaleAnnual'),
      per: '/mo',
      features: [t('scaleF1'), t('scaleF2'), t('scaleF3'), t('scaleF4'), t('scaleF5')],
    },
  }), [t]);
}

/* ─── Trial date helper ─── */
function getTrialEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/* ─── Inline styles — exact from HTML design ─── */

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

/* .ic base */
const icBase: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 16,
  display: 'grid',
  placeItems: 'center',
  margin: '0 auto 1.25rem',
};

/* .ic-load */
const icLoadStyle: React.CSSProperties = {
  ...icBase,
  background: 'var(--bg2)',
  border: '1px solid var(--b2)',
};

/* .ic-ok */
const icOkStyle: React.CSSProperties = {
  ...icBase,
  background: 'var(--teal-dim)',
  border: '1px solid var(--teal-glow)',
};

/* .ic-err */
const icErrStyle: React.CSSProperties = {
  ...icBase,
  background: 'rgba(231,76,60,.06)',
  border: '1px solid rgba(231,76,60,.1)',
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

/* poll status */
const pollStatusStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.4375rem',
  color: 'var(--dark5)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
};

/* .plan-box */
const planBoxStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--b2)',
  borderRadius: 10,
  padding: '1rem 1.25rem',
  marginBottom: '1.5rem',
  textAlign: 'left',
};

/* .plan-row */
const planRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '.375rem',
};

/* .plan-name */
const planNameStyle: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--dark)',
};

/* .plan-price */
const planPriceStyle: React.CSSProperties = {
  fontFamily: 'var(--f-display)',
  fontSize: '1rem',
  fontWeight: 800,
  color: 'var(--teal)',
};

/* .plan-price small */
const planPriceSmallStyle: React.CSSProperties = {
  fontSize: '.75rem',
  fontWeight: 400,
  color: 'var(--dark5)',
};

/* .plan-tag */
const planTagStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '.25rem',
  fontFamily: 'var(--f-mono)',
  fontSize: '.4375rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  padding: '.2rem .5rem',
  borderRadius: 4,
  background: 'var(--teal-dim)',
  color: 'var(--teal)',
  border: '1px solid var(--teal-glow)',
  marginBottom: '.25rem',
};

/* .plan-detail */
const planDetailStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.4375rem',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: 'var(--dark5)',
};

/* .feats */
const featsStyle: React.CSSProperties = {
  textAlign: 'left',
  marginBottom: '1.5rem',
};

/* .feats-title */
const featsTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.5rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--dark4)',
  marginBottom: '.625rem',
};

/* .feat */
const featStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '.5rem',
  padding: '.3rem 0',
  fontSize: '.8125rem',
  color: 'var(--dark2)',
};

/* .bn (button base) */
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

/* .bn-p (primary teal) */
const bnPrimaryStyle: React.CSSProperties = {
  ...bnBase,
  background: 'var(--teal)',
  color: '#fff',
  boxShadow: '0 2px 8px var(--teal-glow)',
};

/* .bn-g2 (secondary ghost) */
const bnSecondaryStyle: React.CSSProperties = {
  ...bnBase,
  background: 'var(--bg2)',
  color: 'var(--dark3)',
  border: '1px solid var(--b2)',
  marginTop: '.5rem',
};

/* .redirect */
const redirectStyle: React.CSSProperties = {
  fontFamily: 'var(--f-mono)',
  fontSize: '.4375rem',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: 'var(--dark5)',
  marginTop: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '.375rem',
};

/* .redirect-bar */
const redirectBarStyle: React.CSSProperties = {
  width: 40,
  height: 3,
  background: 'var(--bg3)',
  borderRadius: 2,
  overflow: 'hidden',
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

const svgCheckSmall = {
  width: 14,
  height: 14,
  fill: 'none',
  stroke: 'var(--teal)',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  flexShrink: 0,
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

/* ─── Fade in animation style ─── */
const fadeInStyle: React.CSSProperties = {
  animation: 'fi .4s ease both',
};

/* ─── Main Content Component ─── */
function SuccessContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const plans = usePlanData(t);

  const sessionId = searchParams.get('session_id');
  const planKey = (searchParams.get('plan') || 'growth') as PlanKey;
  const period = searchParams.get('period') || 'monthly';

  const [status, setStatus] = useState<'polling' | 'confirmed' | 'error'>('polling');
  const [pollCount, setPollCount] = useState(1);
  const [countdown, setCountdown] = useState(5);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const retriesRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const plan = plans[planKey] || plans.growth;
  const priceShow = period === 'annual' ? plan.annual : plan.price;
  const trialEndDate = useMemo(() => getTrialEndDate(), []);
  const displayName = plan.name.replace(' Plan', '');

  /* ─── Polling logic ─── */
  const startPolling = useCallback(() => {
    retriesRef.current = 0;
    setPollCount(1);
    setStatus('polling');

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const poll = async () => {
      retriesRef.current += 1;
      setPollCount(retriesRef.current);

      if (!sessionId || retriesRef.current > 10) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setStatus(retriesRef.current > 10 ? 'error' : 'confirmed');
        return;
      }

      try {
        const result = await api.billing.checkoutStatus(sessionId);
        if (result.status === 'paid') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus('confirmed');
        }
      } catch {
        // Keep polling until max retries
      }
    };

    poll();
    pollTimerRef.current = setInterval(poll, 2000);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      // Still simulate for demo purposes
    }
    startPolling();
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [sessionId, startPolling]);

  /* ─── Redirect countdown ─── */
  useEffect(() => {
    if (status !== 'confirmed') return;
    let sec = 5;
    setCountdown(5);
    setRedirectProgress(0);

    const timer = setInterval(() => {
      sec -= 1;
      setCountdown(sec);
      setRedirectProgress(((5 - sec) / 5) * 100);
      if (sec <= 0) {
        clearInterval(timer);
        router.push(`/${locale}/dashboard`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router, locale]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 5rem)',
      padding: '2rem',
    }}>
      <div style={crdStyle} className="checkout-crd">
        {/* ═══ LOADING STATE ═══ */}
        {status === 'polling' && (
          <div style={fadeInStyle}>
            {/* .ic .ic-load */}
            <div style={icLoadStyle}>
              <svg
                viewBox="0 0 24 24"
                {...svgIconProps}
                stroke="var(--dark5)"
                style={{ animation: 'spin 1.2s linear infinite', transformOrigin: 'center' }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <div style={stTitleStyle}>{t('loadingTitle')}</div>
            <div style={stSubStyle}>{t('loadingSub')}</div>
            <div style={pollStatusStyle}>
              {t('pollStatus', { attempt: pollCount, max: 10 })}
            </div>
          </div>
        )}

        {/* ═══ SUCCESS STATE ═══ */}
        {status === 'confirmed' && (
          <div style={fadeInStyle}>
            {/* .ic .ic-ok */}
            <div style={icOkStyle}>
              <svg viewBox="0 0 24 24" {...svgIconProps} stroke="var(--teal)">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div style={stTitleStyle}>
              {t('successWelcome', { plan: displayName })}
            </div>
            <div style={stSubStyle}>{t('successSub')}</div>

            {/* .plan-box */}
            <div style={planBoxStyle} className="checkout-plan-box">
              <div style={planRowStyle}>
                <span style={planNameStyle}>{plan.name}</span>
                <span style={planPriceStyle}>
                  {priceShow}<span style={planPriceSmallStyle}>{plan.per}</span>
                </span>
              </div>
              <div style={planTagStyle}>
                <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t('trialStarted')}
              </div>
              <div style={planDetailStyle}>
                {t('trialEnds', { date: trialEndDate })}
              </div>
            </div>

            {/* .feats */}
            <div style={featsStyle}>
              <div style={featsTitleStyle}>{t('trialIncludes')}</div>
              {plan.features.map((feat, i) => (
                <div key={i} style={featStyle}>
                  <svg viewBox="0 0 24 24" style={svgCheckSmall}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {feat}
                </div>
              ))}
            </div>

            {/* CTA — Go to Dashboard */}
            <Link
              href={`/${locale}/dashboard`}
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
              {t('goToDashboard')}
              <svg viewBox="0 0 24 24" style={svgBtnIcon}>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            {/* Fine print */}
            <div style={fineStyle}>
              {t('noBillingUntil', { date: trialEndDate })}
            </div>

            {/* Redirect notice */}
            <div style={redirectStyle}>
              {t('redirecting', { seconds: countdown })}
              <div style={redirectBarStyle}>
                <div style={{
                  height: '100%',
                  background: 'var(--teal)',
                  borderRadius: 2,
                  transition: 'width .3s linear',
                  width: `${redirectProgress}%`,
                }} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ ERROR STATE ═══ */}
        {status === 'error' && (
          <div style={fadeInStyle}>
            {/* .ic .ic-err */}
            <div style={icErrStyle}>
              <svg viewBox="0 0 24 24" {...svgIconProps} stroke="var(--coral)">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div style={stTitleStyle}>{t('errorTitle')}</div>
            <div style={stSubStyle}>{t('errorDesc')}</div>

            {/* Try Again */}
            <button
              style={bnPrimaryStyle}
              onClick={startPolling}
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
              <svg viewBox="0 0 24 24" style={svgBtnIcon}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {t('tryAgain')}
            </button>

            {/* Go to Dashboard (secondary) */}
            <Link
              href={`/${locale}/dashboard`}
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
              {t('goToDashboard')}
            </Link>

            {/* Fine print */}
            <div style={{ ...fineStyle, marginTop: '1rem' }}>
              {t('contactSupport')}
            </div>
          </div>
        )}
      </div>

      {/* Keyframes + responsive */}
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fi { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @media (max-width: 480px) {
          .checkout-crd { padding: 2rem 1.5rem !important; border-radius: 12px !important; }
          .checkout-crd .st-title { font-size: 1.125rem !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── Page Export with Suspense ─── */
export default function CheckoutSuccessPage() {
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
          <div style={icLoadStyle}>
            <svg
              viewBox="0 0 24 24"
              {...svgIconProps}
              stroke="var(--dark5)"
              style={{ animation: 'spin 1.2s linear infinite', transformOrigin: 'center' }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          </div>
          <div style={stTitleStyle}>Loading...</div>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
