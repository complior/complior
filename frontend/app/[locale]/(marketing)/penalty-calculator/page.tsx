'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Format number with locale-aware thousand separators */
function fmtNum(n: number, locale: string): string {
  const sep = locale === 'de' ? '.' : ',';
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** Format as currency string */
function fmtCurrency(n: number, locale: string): string {
  const prefix = locale === 'de' ? '\u20AC' : '$';
  if (n >= 1e9) return prefix + fmtNum(Math.round(n / 1e6), locale) + 'M';
  return prefix + fmtNum(n, locale);
}

/** Strip non-digits from input string */
function stripNonDigits(s: string): string {
  return s.replace(/[^0-9]/g, '');
}

/* ------------------------------------------------------------------ */
/*  Preset amounts                                                    */
/* ------------------------------------------------------------------ */
const PRESETS = [
  { value: 1_000_000, label: '1M' },
  { value: 5_000_000, label: '5M' },
  { value: 10_000_000, label: '10M' },
  { value: 50_000_000, label: '50M' },
  { value: 100_000_000, label: '100M' },
  { value: 500_000_000, label: '500M' },
  { value: 1_000_000_000, label: '1B' },
];

/* ------------------------------------------------------------------ */
/*  Main component (inside Suspense)                                  */
/* ------------------------------------------------------------------ */
function PenaltyContent() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('penalty');
  const searchParams = useSearchParams();

  const isEur = locale === 'de';
  const currencyPrefix = isEur ? '\u20AC' : '$';

  const [rawValue, setRawValue] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [calcRevenue, setCalcRevenue] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Parse raw string to number */
  const parseRevenue = useCallback((): number => {
    const digits = stripNonDigits(rawValue);
    return digits ? parseInt(digits, 10) : 0;
  }, [rawValue]);

  /* On mount: read ?revenue= from URL */
  useEffect(() => {
    const paramRevenue = searchParams.get('revenue');
    if (paramRevenue) {
      const num = parseInt(paramRevenue, 10);
      if (!isNaN(num) && num > 0) {
        setRawValue(fmtNum(num, locale));
        setCalcRevenue(num);
        setShowResults(true);
      }
    }
  }, [searchParams, locale]);

  /* Format input on change */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = stripNonDigits(e.target.value);
      if (digits) {
        setRawValue(fmtNum(parseInt(digits, 10), locale));
      } else {
        setRawValue('');
      }
      if (showResults) setShowResults(false);
    },
    [locale, showResults],
  );

  /* Set preset */
  const handlePreset = useCallback(
    (val: number) => {
      setRawValue(fmtNum(val, locale));
      // Auto-calculate
      setCalcRevenue(val);
      setShowResults(true);
      router.replace(`/${locale}/penalty-calculator?revenue=${val}`, { scroll: false });
    },
    [locale, router],
  );

  /* Calculate */
  const handleCalculate = useCallback(() => {
    const rev = parseRevenue();
    if (rev <= 0) return;
    setCalcRevenue(rev);
    setShowResults(true);
    router.replace(`/${locale}/penalty-calculator?revenue=${rev}`, { scroll: false });
  }, [parseRevenue, router, locale]);

  /* Enter key */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleCalculate();
    },
    [handleCalculate],
  );

  /* Share */
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/${locale}/penalty-calculator?revenue=${calcRevenue}`;
    navigator.clipboard.writeText(url).then(() => {
      setToastVisible(true);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2500);
    });
  }, [locale, calcRevenue]);

  /* Penalty calculations */
  const t1Pct = calcRevenue * 0.07;
  const t1Min = 35_000_000;
  const t1 = Math.max(t1Pct, t1Min);

  const t2Pct = calcRevenue * 0.03;
  const t2Min = 15_000_000;
  const t2 = Math.max(t2Pct, t2Min);

  const t3Pct = calcRevenue * 0.015;
  const t3Min = 7_500_000;
  const t3 = Math.max(t3Pct, t3Min);

  /* Which-is-higher text */
  function whichText(pctVal: number, minVal: number, pctLabel: string, floorLabel: string): string {
    if (pctVal > minVal) {
      return `${pctLabel} TURNOVER APPLIES (${fmtCurrency(Math.round(pctVal), locale)} > ${floorLabel} FLOOR)`;
    }
    return `${floorLabel} MINIMUM FLOOR APPLIES (${pctLabel} = ${fmtCurrency(Math.round(pctVal), locale)})`;
  }

  const t1Which = whichText(t1Pct, t1Min, '7%', fmtCurrency(t1Min, locale));
  const t2Which = whichText(t2Pct, t2Min, '3%', fmtCurrency(t2Min, locale));
  const t3Which = whichText(t3Pct, t3Min, '1.5%', fmtCurrency(t3Min, locale));

  /* SME note */
  const showSmeNote = calcRevenue > 0 && calcRevenue <= 10_000_000;
  const showMidNote = calcRevenue > 10_000_000 && calcRevenue <= 50_000_000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 2rem 2rem' }}>
      {/* ---------- Page Header ---------- */}
      <div className="hd" style={{ textAlign: 'center', margin: '1.5rem 0 1.75rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.375rem',
            fontFamily: 'var(--f-mono)',
            fontSize: '.5rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.08em',
            color: 'var(--teal)',
            marginBottom: '.5rem',
          }}
        >
          <svg
            viewBox="0 0 24 24"
            style={{ width: 14, height: 14, fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          </svg>
          {t('badge')}
        </div>
        <h1
          style={{
            fontFamily: 'var(--f-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--dark)',
            marginBottom: '.25rem',
            letterSpacing: '-.02em',
          }}
        >
          {t('title')}
        </h1>
        <p style={{ fontSize: '.875rem', color: 'var(--dark4)' }}>{t('subtitle')}</p>
      </div>

      {/* ---------- Card ---------- */}
      <div
        className="crd"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--b2)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 16px 48px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.03)',
          overflow: 'hidden',
        }}
      >
        {/* ---------- Input Section ---------- */}
        <div className="inp-sec" style={{ padding: '2rem 2.5rem' }}>
          <label
            style={{
              fontFamily: 'var(--f-mono)',
              fontSize: '.5625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: 'var(--dark4)',
              marginBottom: '.5rem',
              display: 'block',
            }}
          >
            {t('revenueLabel')}
          </label>

          {/* Input wrapper */}
          <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
            <span
              style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontFamily: 'var(--f-mono)',
                fontSize: '.875rem',
                color: 'var(--dark5)',
                fontWeight: 600,
                pointerEvents: 'none',
              }}
            >
              {currencyPrefix}
            </span>
            <input
              className="penalty-inp"
              type="text"
              inputMode="numeric"
              placeholder={t('revenuePlaceholder')}
              value={rawValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                padding: '.875rem 1rem .875rem 2.25rem',
                border: '1.5px solid var(--b2)',
                borderRadius: 10,
                fontFamily: 'var(--f-mono)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--dark)',
                background: 'var(--bg)',
                outline: 'none',
                transition: '.25s',
              }}
            />
          </div>

          {/* Presets */}
          <div style={{ display: 'flex', gap: '.375rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {PRESETS.map((p) => (
              <span
                key={p.value}
                className="penalty-preset"
                onClick={() => handlePreset(p.value)}
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.5rem',
                  padding: '.25rem .5rem',
                  borderRadius: 5,
                  background: 'var(--bg2)',
                  border: '1px solid var(--b)',
                  color: 'var(--dark4)',
                  cursor: 'pointer',
                  transition: '.2s',
                  fontWeight: 600,
                }}
              >
                {currencyPrefix}
                {p.label}
              </span>
            ))}
          </div>

          {/* Calculate button */}
          <button
            onClick={handleCalculate}
            className="penalty-calc-btn"
            style={{
              width: '100%',
              padding: '.8125rem 1.25rem',
              borderRadius: 8,
              fontFamily: 'var(--f-body)',
              fontWeight: 700,
              fontSize: '.875rem',
              cursor: 'pointer',
              border: 'none',
              background: 'var(--teal)',
              color: '#fff',
              boxShadow: '0 2px 8px var(--teal-glow)',
              transition: '.25s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '.5rem',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              style={{
                width: 16,
                height: 16,
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: 2,
                strokeLinecap: 'round',
                strokeLinejoin: 'round',
              }}
            >
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="8" y1="10" x2="10" y2="10" />
              <line x1="14" y1="10" x2="16" y2="10" />
              <line x1="8" y1="14" x2="10" y2="14" />
              <line x1="14" y1="14" x2="16" y2="14" />
              <line x1="8" y1="18" x2="16" y2="18" />
            </svg>
            {t('calculateBtn')}
          </button>
        </div>

        {/* ---------- Divider ---------- */}
        <div style={{ height: 1, background: 'var(--b2)' }} />

        {/* ---------- Results Section ---------- */}
        {showResults && calcRevenue > 0 && (
          <div
            className="res-sec"
            style={{
              padding: '2rem 2.5rem',
              animation: 'penaltyFadeIn .4s ease both',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--f-mono)',
                fontSize: '.5625rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: 'var(--dark4)',
                marginBottom: '1.25rem',
              }}
            >
              {t('resultsTitle')}
            </div>

            {/* Tier 1 - Prohibited (RED) */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 10,
                marginBottom: '.75rem',
                border: '1px solid var(--b)',
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(231,76,60,.03)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: 'var(--coral)',
                  borderRadius: '2px 0 0 2px',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--coral)', flexShrink: 0 }} />
                <div style={{ fontFamily: 'var(--f-body)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {t('tier1Title')}
                </div>
              </div>
              <div
                className="tier-amount"
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--coral)',
                  marginBottom: '.25rem',
                  letterSpacing: '-.02em',
                }}
              >
                {fmtCurrency(t1, locale)}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--dark5)', lineHeight: 1.5 }}>
                <code
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.6875rem',
                    background: 'var(--bg2)',
                    padding: '.05em .3em',
                    borderRadius: 3,
                  }}
                >
                  {t('tier1Article')}
                </code>
                {' \u2014 '}
                {isEur ? t('tier1RuleEur') : t('tier1Rule')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.5rem',
                  color: 'var(--dark5)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  marginTop: '.25rem',
                }}
              >
                {t1Pct > t1Min ? (
                  <>
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>7% turnover</em>
                    {' applies (' + fmtCurrency(Math.round(t1Pct), locale) + ' > ' + fmtCurrency(t1Min, locale) + ' floor)'}
                  </>
                ) : (
                  <>
                    {fmtCurrency(t1Min, locale) + ' '}
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>minimum floor</em>
                    {' applies (7% = ' + fmtCurrency(Math.round(t1Pct), locale) + ')'}
                  </>
                )}
              </div>
            </div>

            {/* Tier 2 - High-Risk (AMBER) */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 10,
                marginBottom: '.75rem',
                border: '1px solid var(--b)',
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(217,119,6,.03)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: 'var(--amber)',
                  borderRadius: '2px 0 0 2px',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />
                <div style={{ fontFamily: 'var(--f-body)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {t('tier2Title')}
                </div>
              </div>
              <div
                className="tier-amount"
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--amber)',
                  marginBottom: '.25rem',
                  letterSpacing: '-.02em',
                }}
              >
                {fmtCurrency(t2, locale)}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--dark5)', lineHeight: 1.5 }}>
                <code
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.6875rem',
                    background: 'var(--bg2)',
                    padding: '.05em .3em',
                    borderRadius: 3,
                  }}
                >
                  {t('tier2Article')}
                </code>
                {' \u2014 '}
                {isEur ? t('tier2RuleEur') : t('tier2Rule')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.5rem',
                  color: 'var(--dark5)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  marginTop: '.25rem',
                }}
              >
                {t2Pct > t2Min ? (
                  <>
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>3% turnover</em>
                    {' applies (' + fmtCurrency(Math.round(t2Pct), locale) + ' > ' + fmtCurrency(t2Min, locale) + ' floor)'}
                  </>
                ) : (
                  <>
                    {fmtCurrency(t2Min, locale) + ' '}
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>minimum floor</em>
                    {' applies (3% = ' + fmtCurrency(Math.round(t2Pct), locale) + ')'}
                  </>
                )}
              </div>
            </div>

            {/* Tier 3 - Other (YELLOW) */}
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: 10,
                marginBottom: '.75rem',
                border: '1px solid var(--b)',
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(234,179,8,.03)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  background: '#eab308',
                  borderRadius: '2px 0 0 2px',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '.5rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308', flexShrink: 0 }} />
                <div style={{ fontFamily: 'var(--f-body)', fontSize: '.8125rem', fontWeight: 700, color: 'var(--dark)' }}>
                  {t('tier3Title')}
                </div>
              </div>
              <div
                className="tier-amount"
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: '#ca8a04',
                  marginBottom: '.25rem',
                  letterSpacing: '-.02em',
                }}
              >
                {fmtCurrency(t3, locale)}
              </div>
              <div style={{ fontSize: '.75rem', color: 'var(--dark5)', lineHeight: 1.5 }}>
                <code
                  style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.6875rem',
                    background: 'var(--bg2)',
                    padding: '.05em .3em',
                    borderRadius: 3,
                  }}
                >
                  {t('tier3Article')}
                </code>
                {' \u2014 '}
                {isEur ? t('tier3RuleEur') : t('tier3Rule')}
              </div>
              <div
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.5rem',
                  color: 'var(--dark5)',
                  textTransform: 'uppercase',
                  letterSpacing: '.04em',
                  marginTop: '.25rem',
                }}
              >
                {t3Pct > t3Min ? (
                  <>
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>1.5% turnover</em>
                    {' applies (' + fmtCurrency(Math.round(t3Pct), locale) + ' > ' + fmtCurrency(t3Min, locale) + ' floor)'}
                  </>
                ) : (
                  <>
                    {fmtCurrency(t3Min, locale) + ' '}
                    <em style={{ fontStyle: 'normal', fontWeight: 700, color: 'var(--dark3)' }}>minimum floor</em>
                    {' applies (1.5% = ' + fmtCurrency(Math.round(t3Pct), locale) + ')'}
                  </>
                )}
              </div>
            </div>

            {/* SME Note */}
            {showSmeNote && (
              <div
                style={{
                  background: 'var(--teal-dim)',
                  border: '1px solid var(--teal-glow)',
                  borderRadius: 8,
                  padding: '.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '.75rem',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '.5rem',
                  lineHeight: 1.5,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 16,
                    height: 16,
                    stroke: 'var(--teal)',
                    fill: 'none',
                    strokeWidth: 2,
                    flexShrink: 0,
                    marginTop: '.1rem',
                  }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>{isEur ? t('smeNoteEur') : t('smeNote')}</div>
              </div>
            )}

            {/* Mid-size Note */}
            {showMidNote && (
              <div
                style={{
                  background: 'var(--teal-dim)',
                  border: '1px solid var(--teal-glow)',
                  borderRadius: 8,
                  padding: '.75rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '.75rem',
                  color: 'var(--teal)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '.5rem',
                  lineHeight: 1.5,
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 16,
                    height: 16,
                    stroke: 'var(--teal)',
                    fill: 'none',
                    strokeWidth: 2,
                    flexShrink: 0,
                    marginTop: '.1rem',
                  }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <div>{t('midNote')}</div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="res-cta" style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
              <button
                onClick={handleShare}
                className="penalty-bn-o"
                style={{
                  flex: 1,
                  padding: '.6875rem 1rem',
                  borderRadius: 8,
                  fontFamily: 'var(--f-body)',
                  fontWeight: 700,
                  fontSize: '.8125rem',
                  cursor: 'pointer',
                  border: '1.5px solid var(--teal)',
                  transition: '.25s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '.5rem',
                  background: 'transparent',
                  color: 'var(--teal)',
                  textDecoration: 'none',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 14,
                    height: 14,
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                >
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                {t('shareResult')}
              </button>
              <a
                href={`/${locale}/auth/register?plan=free`}
                className="penalty-bn-p"
                style={{
                  flex: 1,
                  padding: '.6875rem 1rem',
                  borderRadius: 8,
                  fontFamily: 'var(--f-body)',
                  fontWeight: 700,
                  fontSize: '.8125rem',
                  cursor: 'pointer',
                  border: 'none',
                  transition: '.25s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '.5rem',
                  background: 'var(--teal)',
                  color: '#fff',
                  boxShadow: '0 2px 8px var(--teal-glow)',
                  textDecoration: 'none',
                }}
              >
                {t('createAccount')}
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: 14,
                    height: 14,
                    fill: 'none',
                    stroke: 'currentColor',
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                >
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
            </div>

            {/* Reference */}
            <div
              style={{
                textAlign: 'center',
                fontFamily: 'var(--f-mono)',
                fontSize: '.4375rem',
                color: 'var(--dark5)',
                letterSpacing: '.04em',
              }}
            >
              <code
                style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.6875rem',
                  background: 'var(--bg2)',
                  padding: '.05em .3em',
                  borderRadius: 3,
                }}
              >
                Art. 99
              </code>{' '}
              {t('refText')}{' '}
              <a
                href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}
              >
                {t('refLink')}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ---------- Footer ---------- */}
      <div
        style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontFamily: 'var(--f-mono)',
          fontSize: '.4375rem',
          color: 'var(--dark5)',
          letterSpacing: '.04em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '.375rem',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          style={{ width: 12, height: 12, stroke: 'var(--teal)', fill: 'none', strokeWidth: 2 }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        {t('footerText')} &middot;{' '}
        <a
          href={`/${locale}/quick-check`}
          style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}
        >
          {t('footerQuickCheck')}
        </a>{' '}
        &middot;{' '}
        <a href={`/${locale}`} style={{ color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>
          {t('footerHome')}
        </a>
      </div>

      {/* ---------- Toast ---------- */}
      <div
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: toastVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(80px)',
          background: 'var(--dark)',
          color: '#fff',
          padding: '.625rem 1.25rem',
          borderRadius: 8,
          fontSize: '.8125rem',
          fontWeight: 600,
          zIndex: 200,
          opacity: toastVisible ? 1 : 0,
          transition: '.35s',
          pointerEvents: 'none',
        }}
      >
        {t('linkCopied')}
      </div>

      {/* ---------- Style JSX for focus/hover/responsive ---------- */}
      {/* eslint-disable-next-line react/no-unknown-property */}
      <style jsx>{`
        @keyframes penaltyFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .penalty-inp:focus {
          border-color: var(--teal) !important;
          box-shadow: 0 0 0 3px var(--teal-dim) !important;
        }
        .penalty-preset:hover {
          border-color: var(--teal) !important;
          color: var(--teal) !important;
          background: var(--teal-dim) !important;
        }
        .penalty-calc-btn:hover {
          background: var(--teal2) !important;
          transform: translateY(-1px);
        }
        .penalty-bn-o:hover {
          background: var(--teal-dim) !important;
        }
        .penalty-bn-p:hover {
          background: var(--teal2) !important;
          transform: translateY(-1px);
        }
        @media (max-width: 520px) {
          .inp-sec {
            padding: 1.5rem 1.25rem !important;
          }
          .res-sec {
            padding: 1.5rem 1.25rem !important;
          }
          .crd {
            border-radius: 12px !important;
          }
          h1 {
            font-size: 1.25rem !important;
          }
          .tier-amount {
            font-size: 1.25rem !important;
          }
          .res-cta {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page wrapper with Suspense                                        */
/* ------------------------------------------------------------------ */
export default function PenaltyCalculatorPage() {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--dark5)' }}>Loading...</p>
        </div>
      }
    >
      <PenaltyContent />
    </Suspense>
  );
}
