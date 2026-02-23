'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { getSession, registerWithPassword, getSocialLoginUrl } from '@/lib/auth';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/currency';

/* -- Plan data ------------------------------------------------------------ */
const PLAN_DATA: Record<string, { priceCentsMonthly: number; priceCentsAnnual: number; featureKeys: string[] }> = {
  free:    { priceCentsMonthly: 0,     priceCentsAnnual: 0,     featureKeys: ['1 AI tool', '1 user', 'Basic classification', 'AI tool catalog'] },
  starter: { priceCentsMonthly: 4900,  priceCentsAnnual: 49000,  featureKeys: ['5 AI tools, 2 users', '15 AI literacy seats', 'Eva AI (200 msg/mo)', '90-day audit trail'] },
  growth:  { priceCentsMonthly: 14900, priceCentsAnnual: 149000, featureKeys: ['20 AI tools, 5 users', '50 AI literacy seats', 'FRIA & doc generation', 'Gap analysis + compliance badge'] },
  scale:   { priceCentsMonthly: 39900, priceCentsAnnual: 399000, featureKeys: ['Unlimited tools & users', '250 AI literacy seats', 'API access', 'Priority support + onboarding'] },
};
const PAID_PLANS = ['starter', 'growth', 'scale'];

/* -- SVG Icons (inline) --------------------------------------------------- */
const InfoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ShieldCheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '0.1rem' }}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const CardIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%23888' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

/* ========================================================================= */
/*  REGISTER CONTENT                                                         */
/* ========================================================================= */
function RegisterContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const tCheckout = useTranslations('checkout');
  const searchParams = useSearchParams();

  const planParam = searchParams.get('plan') || 'free';
  const rawPeriod = searchParams.get('period') || 'monthly';
  const periodParam = (rawPeriod === 'annual' ? 'yearly' : rawPeriod) as 'monthly' | 'yearly';
  const plan = PLAN_DATA[planParam] ? planParam : 'free';
  const isPaid = PAID_PLANS.includes(plan);
  const planInfo = PLAN_DATA[plan];

  // step=2 comes from callback after WorkOS auth (user already created)
  const initialStep = searchParams.get('step') === '2' ? 2 : 1;
  const [step, setStep] = useState(initialStep);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [userProfile, setUserProfile] = useState<{ organizationId: number } | null>(null);

  /* -- Step 1 fields -- */
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  /* -- Step 2 fields -- */
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [country, setCountry] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const totalSteps = isPaid ? 3 : 2;

  /* -- Session check -- */
  useEffect(() => {
    getSession().then((user) => {
      if (user?.active) {
        setUserProfile({ organizationId: user.organizationId });
        // Already logged in, go to step 2
        setStep(2);
      }
      setCheckingSession(false);
    }).catch(() => {
      setCheckingSession(false);
    });
  }, [router, locale]);

  /* -- Plan badge text -- */
  const planBadgeText = useMemo(() => {
    const priceShow = periodParam === 'yearly'
      ? formatPrice(planInfo.priceCentsAnnual, locale, 'yearly')
      : formatPrice(planInfo.priceCentsMonthly, locale, 'monthly');
    const nameMap: Record<string, string> = {
      free: 'Free Plan',
      starter: tCheckout('starterName'),
      growth: tCheckout('growthName'),
      scale: tCheckout('scaleName'),
    };
    const label = nameMap[plan] || 'Free Plan';
    if (plan === 'free') return `${label} \u2014 ${formatPrice(0, locale)}`;
    const suffix = periodParam === 'yearly' ? ' \u00b7 Annual plan' : '';
    return `${label} \u2014 ${priceShow}${suffix}`;
  }, [plan, periodParam, locale, planInfo, tCheckout]);

  /* -- Price display for trial card -- */
  const priceDisplay = useMemo(() => {
    const cents = periodParam === 'yearly' ? planInfo.priceCentsAnnual : planInfo.priceCentsMonthly;
    return formatPrice(cents, locale, periodParam === 'yearly' ? 'yearly' : 'monthly');
  }, [periodParam, planInfo, locale]);

  /* -- Trial end date -- */
  const trialEndDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }, []);

  /* -- Password strength -- */
  const getPasswordStrength = (pw: string): { level: number; label: string; color: string } => {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: score, label: t('pwWeak'), color: 'var(--coral)' };
    if (score <= 2) return { level: score, label: t('pwMedium'), color: '#f0ad4e' };
    return { level: score, label: t('pwStrong'), color: 'var(--teal)' };
  };
  const pwStrength = getPasswordStrength(regPassword);

  /* -- Step 1 submit -- */
  const handleStep1 = async () => {
    const errs: Record<string, boolean> = {};
    if (!firstName.trim()) errs.firstName = true;
    if (!lastName.trim()) errs.lastName = true;
    if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) errs.regEmail = true;
    if (!regPassword || regPassword.length < 8) errs.regPassword = true;
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      const result = await registerWithPassword({
        firstName, lastName, email: regEmail, password: regPassword,
      });
      if (result.success) {
        // Fetch session to get org info
        const session = await getSession();
        if (session?.active) {
          setUserProfile({ organizationId: session.organizationId });
        }
        setStep(2);
      } else if (result.error?.code === 'CONFLICT') {
        setError(t('emailExists'));
      } else {
        setError(result.error?.message || 'Registration failed');
      }
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* -- Step 2 submit -- */
  const handleStep2 = async () => {
    const errors: Record<string, boolean> = {};
    if (!companyName.trim()) errors.companyName = true;
    if (!industry) errors.industry = true;
    if (!companySize) errors.companySize = true;
    if (!country) errors.country = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError(null);
    try {
      if (userProfile) {
        await api.auth.updateOrganization(userProfile.organizationId, {
          name: companyName, industry, size: companySize, country,
        });
      }
      if (isPaid) {
        setStep(3);
      } else {
        router.push(`/${locale}/dashboard`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  /* -- Step 3: start trial -- */
  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const checkout = await api.billing.createCheckout(plan, periodParam);
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  /* -- Clear field error on input -- */
  const clearError = (field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  /* -- Step labels -- */
  const stepLabels = isPaid
    ? [t('stepAccount'), t('stepCompany'), t('stepTrial')]
    : [t('stepAccount'), t('stepCompany')];

  /* -- Plan features for trial card -- */
  const planFeatureKeys: Record<string, string[]> = {
    starter: ['starterF1', 'starterF2', 'starterF3', 'starterF4', 'starterF5'],
    growth: ['growthF1', 'growthF2', 'growthF3', 'growthF4', 'growthF5', 'growthF6'],
    scale: ['scaleF1', 'scaleF2', 'scaleF3', 'scaleF4', 'scaleF5'],
  };

  /* -- Period text for trial card -- */
  const periodText = useMemo(() => {
    if (periodParam === 'yearly') {
      const symbol = locale === 'de' ? '\u20ac' : '$';
      const yearlyTotal = Math.round(planInfo.priceCentsAnnual / 100);
      return `${t('trialBilledAnnually')} \u2014 ${symbol}${yearlyTotal}/${locale === 'de' ? 'Jahr' : 'year'} (save 2 months)`;
    }
    return t('trialBilledMonthly');
  }, [periodParam, planInfo, locale, t]);

  /* -- Inline styles -- */
  const styles = {
    container: {
      minHeight: 'calc(100vh - 56px)',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progress: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '2rem',
      width: '100%',
      maxWidth: '420px',
    },
    step: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      flex: 1,
    },
    stepNum: (state: 'active' | 'done' | 'pending') => ({
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'grid',
      placeItems: 'center' as const,
      fontFamily: 'var(--f-mono)',
      fontSize: '0.625rem',
      fontWeight: 700,
      flexShrink: 0,
      transition: '0.35s',
      ...(state === 'active'
        ? { background: 'var(--teal)', borderColor: 'var(--teal)', color: '#fff', border: '2px solid var(--teal)' }
        : state === 'done'
        ? { background: 'var(--teal-dim)', borderColor: 'var(--teal)', color: 'var(--teal)', border: '2px solid var(--teal)' }
        : { border: '2px solid var(--b2)', color: 'var(--dark5)', background: 'transparent' }),
    }),
    stepLabel: (state: 'active' | 'done' | 'pending') => ({
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: state === 'pending' ? 'var(--dark5)' : 'var(--dark3)',
      transition: '0.35s',
    }),
    stepLine: (filled: boolean) => ({
      flex: '0 0 40px',
      height: '2px',
      background: filled ? 'var(--teal)' : 'var(--b2)',
      borderRadius: '1px',
      transition: '0.35s',
    }),
    card: {
      background: 'var(--card)',
      border: '1px solid var(--b2)',
      borderRadius: '14px',
      padding: '2.5rem',
      width: '100%',
      maxWidth: '420px',
      boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
      transition: 'background .35s, border-color .35s, box-shadow .35s',
      animation: 'cardIn .5s ease both',
    },
    title: {
      fontFamily: 'var(--f-display)',
      fontSize: '1.5rem',
      fontWeight: 700,
      color: 'var(--dark)',
      marginBottom: '0.375rem',
      letterSpacing: '-0.02em',
    },
    subtitle: {
      fontSize: '0.875rem',
      color: 'var(--dark4)',
      marginBottom: '2rem',
    },
    fieldRow: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.75rem',
    },
    field: {
      marginBottom: '1.25rem',
    },
    fieldLabel: {
      display: 'block',
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5625rem',
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.08em',
      color: 'var(--dark4)',
      marginBottom: '0.4375rem',
    },
    fieldInput: (hasError: boolean) => ({
      width: '100%',
      padding: '0.6875rem 0.875rem',
      border: `1.5px solid ${hasError ? 'var(--coral)' : 'var(--b2)'}`,
      borderRadius: '8px',
      fontFamily: 'var(--f-body)',
      fontSize: '0.875rem',
      color: 'var(--dark)',
      background: 'var(--bg)',
      outline: 'none',
      transition: 'border-color .25s, box-shadow .25s',
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const,
      ...(hasError ? { boxShadow: '0 0 0 3px rgba(231,76,60,.06)' } : {}),
    }),
    fieldSelect: (hasError: boolean) => ({
      width: '100%',
      padding: '0.6875rem 0.875rem',
      paddingRight: '2.5rem',
      border: `1.5px solid ${hasError ? 'var(--coral)' : 'var(--b2)'}`,
      borderRadius: '8px',
      fontFamily: 'var(--f-body)',
      fontSize: '0.875rem',
      color: 'var(--dark)',
      background: 'var(--bg)',
      backgroundImage: CHEVRON_SVG,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 0.875rem center',
      outline: 'none',
      transition: 'border-color .25s, box-shadow .25s',
      WebkitAppearance: 'none' as const,
      appearance: 'none' as const,
      cursor: 'pointer',
      ...(hasError ? { boxShadow: '0 0 0 3px rgba(231,76,60,.06)' } : {}),
    }),
    fieldError: {
      fontSize: '0.6875rem',
      color: 'var(--coral)',
      marginTop: '0.3125rem',
    },
    btnPrimary: {
      width: '100%',
      padding: '0.75rem 1.25rem',
      borderRadius: '8px',
      fontFamily: 'var(--f-body)',
      fontWeight: 700,
      fontSize: '0.875rem',
      cursor: 'pointer',
      border: 'none',
      transition: '0.25s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      background: 'var(--teal)',
      color: '#fff',
      boxShadow: '0 2px 8px var(--teal-glow)',
    },
    btnGhost: {
      width: '100%',
      background: 'none',
      color: 'var(--dark4)',
      border: 'none',
      fontSize: '0.8125rem',
      fontWeight: 500,
      cursor: 'pointer',
      marginTop: '0.75rem',
      transition: '0.2s',
      fontFamily: 'var(--f-body)',
      padding: '0.5rem',
    },
    errorBox: {
      marginBottom: '1rem',
      borderRadius: '8px',
      border: '1px solid var(--coral)',
      background: 'var(--coral-dim)',
      padding: '0.625rem 0.875rem',
    },
    errorText: {
      fontSize: '0.8125rem',
      color: 'var(--coral)',
      margin: 0,
    },
    step2Note: {
      background: 'var(--teal-dim)',
      border: '1px solid var(--teal-glow)',
      borderRadius: '8px',
      padding: '0.625rem 0.875rem',
      marginBottom: '1.5rem',
      fontSize: '0.75rem',
      color: 'var(--teal)',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      lineHeight: 1.5,
    },
    trialCard: {
      background: 'var(--bg2)',
      border: '1px solid var(--b2)',
      borderRadius: '10px',
      padding: '1.25rem',
      marginBottom: '1.5rem',
    },
    trialPlanRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '0.75rem',
    },
    trialPlanName: {
      fontFamily: 'var(--f-display)',
      fontSize: '1.125rem',
      fontWeight: 700,
      color: 'var(--dark)',
    },
    trialPlanPrice: {
      fontFamily: 'var(--f-display)',
      fontSize: '1.125rem',
      fontWeight: 800,
      color: 'var(--teal)',
    },
    trialPriceSmall: {
      fontSize: '0.75rem',
      fontWeight: 400,
      color: 'var(--dark5)',
    },
    trialPeriod: {
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      color: 'var(--dark5)',
      marginBottom: '0.875rem',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid var(--b)',
    },
    trialFeatureItem: {
      fontSize: '0.8125rem',
      color: 'var(--dark3)',
      padding: '0.25rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    },
    trialDetails: {
      background: 'var(--bg2)',
      border: '1px solid var(--b2)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.625rem',
      fontSize: '0.8125rem',
      color: 'var(--dark3)',
      lineHeight: 1.5,
    },
    cardReq: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.375rem',
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5rem',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      color: 'var(--dark5)',
      marginBottom: '1rem',
      justifyContent: 'center',
    },
    trustLine: {
      marginTop: '1.5rem',
      textAlign: 'center' as const,
      fontFamily: 'var(--f-mono)',
      fontSize: '0.5rem',
      color: 'var(--dark5)',
      letterSpacing: '0.04em',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.375rem',
    },
    footer: {
      marginTop: '1.75rem',
      fontSize: '0.8125rem',
      color: 'var(--dark4)',
      textAlign: 'center' as const,
    },
    footerLink: {
      color: 'var(--teal)',
      fontWeight: 600,
      textDecoration: 'none' as const,
    },
    req: {
      color: 'var(--coral)',
    },
  };

  /* -- Loading state -- */
  if (checkingSession) {
    return (
      <div style={styles.container}>
        <p style={{ color: 'var(--dark5)' }}>Loading...</p>
      </div>
    );
  }

  /* -- Step state helpers -- */
  const getStepState = (i: number): 'active' | 'done' | 'pending' => {
    if (i + 1 < step) return 'done';
    if (i + 1 === step) return 'active';
    return 'pending';
  };

  /* -- Plan name map -- */
  const planNameMap: Record<string, string> = {
    starter: tCheckout('starterName'),
    growth: tCheckout('growthName'),
    scale: tCheckout('scaleName'),
  };

  return (
    <>
      <style jsx>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-section {
          animation: fadeIn 0.35s ease both;
        }
        .field-input-r:focus,
        .field-select-r:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .field-input-r::placeholder {
          color: var(--dark5);
        }
        .btn-primary-r:hover {
          background: var(--teal2) !important;
          box-shadow: 0 4px 16px var(--teal-glow) !important;
          transform: translateY(-1px);
        }
        .btn-primary-r:active {
          transform: translateY(0);
        }
        .btn-primary-r:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none !important;
        }
        .btn-ghost-r:hover {
          color: var(--teal) !important;
        }
        .footer-link-r:hover {
          text-decoration: underline;
        }
        @media (max-width: 480px) {
          .auth-card-r {
            padding: 2rem 1.5rem !important;
            border-radius: 12px !important;
          }
          .auth-title-r {
            font-size: 1.25rem !important;
          }
          .field-row-r {
            grid-template-columns: 1fr !important;
          }
          .trial-plan-row-r {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.25rem !important;
          }
        }
      `}</style>

      <div style={styles.container}>
        {/* -- Progress stepper -- */}
        {step <= totalSteps && (
          <div style={styles.progress}>
            {stepLabels.map((label, i) => {
              const state = getStepState(i);
              return (
                <div key={i} style={{ display: 'contents' }}>
                  {i > 0 && <div style={styles.stepLine(i < step)} />}
                  <div style={styles.step}>
                    <div style={styles.stepNum(state)}>
                      {state === 'done' ? '\u2713' : i + 1}
                    </div>
                    <div style={styles.stepLabel(state)}>{label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* -- Auth card -- */}
        <div className="auth-card-r" style={styles.card}>

          {/* === STEP 1: Account === */}
          {step === 1 && (
            <div className="step-section">
              <h1 className="auth-title-r" style={styles.title}>
                {isPaid ? t('createAccountSubTrial') : t('createAccountSubFree')}
              </h1>
              <p style={styles.subtitle}>{t('createAccountSub')}</p>

              {error && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {/* Social OAuth */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button className="btn-primary-r" onClick={() => { window.location.href = getSocialLoginUrl('google'); }} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.6875rem', border: '1.5px solid var(--b2)', borderRadius: '8px',
                  background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--f-body)',
                  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--dark3)', transition: '0.25s',
                  boxShadow: 'none',
                }}>
                  Google
                </button>
                <button className="btn-primary-r" onClick={() => { window.location.href = getSocialLoginUrl('github'); }} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  padding: '0.6875rem', border: '1.5px solid var(--b2)', borderRadius: '8px',
                  background: 'var(--card)', cursor: 'pointer', fontFamily: 'var(--f-body)',
                  fontSize: '0.8125rem', fontWeight: 600, color: 'var(--dark3)', transition: '0.25s',
                  boxShadow: 'none',
                }}>
                  GitHub
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--b2)' }} />
                <span style={{ fontFamily: 'var(--f-mono)', fontSize: '0.5625rem', color: 'var(--dark5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--b2)' }} />
              </div>

              {/* Name row */}
              <div className="field-row-r" style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>
                    {t('firstName')} <span style={styles.req}>*</span>
                  </label>
                  <input
                    className="field-input-r"
                    type="text"
                    placeholder={t('firstNamePlaceholder')}
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }}
                    style={styles.fieldInput(!!fieldErrors.firstName)}
                  />
                  {fieldErrors.firstName && <div style={styles.fieldError}>{t('required')}</div>}
                </div>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>
                    {t('lastName')} <span style={styles.req}>*</span>
                  </label>
                  <input
                    className="field-input-r"
                    type="text"
                    placeholder={t('lastNamePlaceholder')}
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }}
                    style={styles.fieldInput(!!fieldErrors.lastName)}
                  />
                  {fieldErrors.lastName && <div style={styles.fieldError}>{t('required')}</div>}
                </div>
              </div>

              {/* Email */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>
                  {t('email')} <span style={styles.req}>*</span>
                </label>
                <input
                  className="field-input-r"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); clearError('regEmail'); }}
                  style={styles.fieldInput(!!fieldErrors.regEmail)}
                />
                {fieldErrors.regEmail && <div style={styles.fieldError}>{t('emailError')}</div>}
              </div>

              {/* Password */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>
                  {t('password')} <span style={styles.req}>*</span>
                </label>
                <input
                  className="field-input-r"
                  type="password"
                  placeholder={t('passwordMin')}
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => { setRegPassword(e.target.value); clearError('regPassword'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleStep1(); }}
                  style={styles.fieldInput(!!fieldErrors.regPassword)}
                />
                {fieldErrors.regPassword && <div style={styles.fieldError}>{t('pwMinError')}</div>}
                {/* Password strength meter */}
                {regPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '0.25rem' }}>
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i <= pwStrength.level ? pwStrength.color : 'var(--b2)',
                          transition: '0.3s',
                        }} />
                      ))}
                    </div>
                    <div style={{ fontFamily: 'var(--f-mono)', fontSize: '0.5rem', color: pwStrength.color, letterSpacing: '0.04em' }}>
                      {t('passwordStrength')}: {pwStrength.label}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA */}
              <button
                className="btn-primary-r"
                style={styles.btnPrimary}
                onClick={handleStep1}
                disabled={loading}
              >
                <span>{loading ? tc('loading') : t('createAccountBtn')}</span>
              </button>
            </div>
          )}

          {/* === STEP 2: Company === */}
          {step === 2 && (
            <div className="step-section">
              <h1 className="auth-title-r" style={styles.title}>{t('companyInfo')}</h1>
              <p style={{ ...styles.subtitle, marginBottom: '0.375rem' }}>&nbsp;</p>

              {/* Info note */}
              <div style={styles.step2Note}>
                <InfoIcon />
                <span>{t('companyInfoNote')}</span>
              </div>

              {error && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {/* Company Name */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>
                  {t('companyName')} <span style={styles.req}>*</span>
                </label>
                <input
                  className="field-input-r"
                  type="text"
                  placeholder={t('companyNamePlaceholder')}
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => { setCompanyName(e.target.value); clearError('companyName'); }}
                  style={styles.fieldInput(!!fieldErrors.companyName)}
                />
                {fieldErrors.companyName && <div style={styles.fieldError}>{t('required')}</div>}
              </div>

              {/* Industry + Size row */}
              <div className="field-row-r" style={styles.fieldRow}>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>
                    {t('industry')} <span style={styles.req}>*</span>
                  </label>
                  <select
                    className="field-select-r"
                    value={industry}
                    onChange={(e) => { setIndustry(e.target.value); clearError('industry'); }}
                    style={styles.fieldSelect(!!fieldErrors.industry)}
                  >
                    <option value="" disabled>{t('select')}</option>
                    <option value="fintech">{t('industryFinance')}</option>
                    <option value="healthtech">{t('industryHealthcare')}</option>
                    <option value="hrtech">{t('industryHR')}</option>
                    <option value="edtech">{t('industryEducation')}</option>
                    <option value="ecommerce">{t('industryTechnology')}</option>
                    <option value="manufacturing">{t('industryManufacturing')}</option>
                    <option value="legal">{t('industryLegal')}</option>
                    <option value="logistics">Logistics</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">{t('industryOther')}</option>
                  </select>
                  {fieldErrors.industry && <div style={styles.fieldError}>{t('required')}</div>}
                </div>
                <div style={styles.field}>
                  <label style={styles.fieldLabel}>
                    {t('companySize')} <span style={styles.req}>*</span>
                  </label>
                  <select
                    className="field-select-r"
                    value={companySize}
                    onChange={(e) => { setCompanySize(e.target.value); clearError('companySize'); }}
                    style={styles.fieldSelect(!!fieldErrors.companySize)}
                  >
                    <option value="" disabled>{t('select')}</option>
                    <option value="micro_1_9">{t('size1_10')}</option>
                    <option value="small_10_49">{t('size11_50')}</option>
                    <option value="medium_50_249">{t('size51_200')}</option>
                    <option value="large_250_plus">{t('size500plus')}</option>
                  </select>
                  {fieldErrors.companySize && <div style={styles.fieldError}>{t('required')}</div>}
                </div>
              </div>

              {/* Country */}
              <div style={styles.field}>
                <label style={styles.fieldLabel}>
                  {t('country')} <span style={styles.req}>*</span>
                </label>
                <select
                  className="field-select-r"
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); clearError('country'); }}
                  style={styles.fieldSelect(!!fieldErrors.country)}
                >
                  <option value="" disabled>{t('select')}</option>
                  <option value="DE">{t('countryGermany')}</option>
                  <option value="AT">{t('countryAustria')}</option>
                  <option value="CH">{t('countrySwitzerland')}</option>
                  <option value="NL">{t('countryNetherlands')}</option>
                  <option value="FR">{t('countryFrance')}</option>
                  <option value="ES">{t('countrySpain')}</option>
                  <option value="IT">{t('countryItaly')}</option>
                  <option value="GB">{t('countryUK')}</option>
                  <option value="US">{t('countryUS')}</option>
                  <option value="XX">{t('countryOther')}</option>
                </select>
                {fieldErrors.country && <div style={styles.fieldError}>{t('required')}</div>}
              </div>

              {/* CTA */}
              <button
                className="btn-primary-r"
                style={styles.btnPrimary}
                onClick={handleStep2}
                disabled={loading}
              >
                {isPaid ? (
                  <>
                    <ArrowIcon />
                    <span>{loading ? 'Saving...' : t('continueBtn')}</span>
                  </>
                ) : (
                  <span>{loading ? 'Saving...' : t('continueToDashboard')}</span>
                )}
              </button>
            </div>
          )}

          {/* === STEP 3: Trial Confirmation (paid only) === */}
          {step === 3 && isPaid && (
            <div className="step-section">
              <h1 className="auth-title-r" style={styles.title}>{t('trialTitle')}</h1>
              <p style={styles.subtitle}>{t('trialSub')}</p>

              {error && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{error}</p>
                </div>
              )}

              {/* Trial card */}
              <div style={styles.trialCard}>
                <div className="trial-plan-row-r" style={styles.trialPlanRow}>
                  <span style={styles.trialPlanName}>{planNameMap[plan] || plan}</span>
                  <span style={styles.trialPlanPrice}>
                    {priceDisplay.replace(/\/(mo|yr|Monat|Jahr)/, '')}
                    <small style={styles.trialPriceSmall}>
                      {periodParam === 'yearly' ? '/yr' : '/mo'}
                    </small>
                  </span>
                </div>
                <div style={styles.trialPeriod}>{periodText}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {(planFeatureKeys[plan] || []).map((key) => (
                    <li key={key} style={styles.trialFeatureItem}>
                      <CheckIcon />
                      <span>{tCheckout(key as Parameters<typeof tCheckout>[0])}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trial details */}
              <div style={styles.trialDetails}>
                <ClockIcon />
                <div>
                  {t('trialNoCharge')} <strong style={{ color: 'var(--dark)', fontWeight: 700 }}>{trialEndDate}</strong>. {t('trialCancelAnytime')}
                </div>
              </div>

              {/* Credit card note */}
              <div style={styles.cardReq}>
                <CardIcon />
                <span>{t('trialCreditCard')}</span>
              </div>

              {/* CTA */}
              <button
                className="btn-primary-r"
                style={styles.btnPrimary}
                onClick={handleStartTrial}
                disabled={loading}
              >
                <span>{loading ? 'Redirecting...' : t('startTrial')}</span>
                <ArrowIcon />
              </button>

              {/* Ghost: choose different plan */}
              <button
                className="btn-ghost-r"
                style={styles.btnGhost}
                onClick={() => router.push(`/${locale}/pricing`)}
              >
                {t('chooseDifferent')}
              </button>
            </div>
          )}
        </div>

        {/* -- Trust line -- */}
        <div style={styles.trustLine}>
          <ShieldCheckIcon />
          <span>
            {isPaid ? t('trustLineTrial') : t('trustLineNoCc')}
          </span>
        </div>

        {/* -- Footer -- */}
        {step <= 2 && (
          <div style={styles.footer}>
            {t('hasAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="footer-link-r" style={styles.footerLink}>
              {t('signInLink')}
            </Link>
          </div>
        )}
      </div>
    </>
  );
}

/* ========================================================================= */
/*  DEFAULT EXPORT -- Suspense wrapper for useSearchParams                   */
/* ========================================================================= */
export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: 'calc(100vh - 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <p style={{ color: 'var(--dark5)' }}>Loading...</p>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
