'use client';

import { useTranslations } from 'next-intl';
import { SectionHeader } from '@/components/ui/SectionHeader';

type IconType = 'check' | 'x' | 'minus';

interface CellIcon {
  icon: IconType;
  text: string;
}

function IconCell({ icon, text }: CellIcon) {
  if (icon === 'check') {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold" style={{ color: 'var(--green)' }}>
        <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {text && <strong>{text}</strong>}
      </span>
    );
  }
  if (icon === 'x') {
    return (
      <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold" style={{ color: 'var(--coral)' }}>
        <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        {text}
      </span>
    );
  }
  // minus
  return (
    <span className="inline-flex items-center gap-1 text-[0.6875rem] font-semibold" style={{ color: 'var(--amber)' }}>
      <svg className="h-3 w-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
      {text}
    </span>
  );
}

interface RowData {
  label: string;
  consult: string | CellIcon;
  ent: string | CellIcon;
  comp: string | CellIcon;
}

export function ComparisonTable() {
  const t = useTranslations('comparison');

  const rows: RowData[] = [
    {
      label: t('rowSetup'),
      consult: t('consultSetup'),
      ent: t('entSetup'),
      comp: t('compSetup'),
    },
    {
      label: t('rowMonthly'),
      consult: t('consultMonthly'),
      ent: t('entMonthly'),
      comp: t('compMonthly'),
    },
    {
      label: t('rowTime'),
      consult: t('consultTime'),
      ent: t('entTime'),
      comp: t('compTime'),
    },
    {
      label: t('rowTarget'),
      consult: t('consultTarget'),
      ent: t('entTarget'),
      comp: t('compTarget'),
    },
    {
      label: t('rowCatalog'),
      consult: { icon: 'x', text: t('consultCatalog') },
      ent: { icon: 'x', text: t('entCatalog') },
      comp: { icon: 'check', text: t('compCatalog') },
    },
    {
      label: t('rowClassification'),
      consult: { icon: 'x', text: t('consultClassification') },
      ent: { icon: 'minus', text: t('entClassification') },
      comp: { icon: 'check', text: t('compClassification') },
    },
    {
      label: t('rowDeployer'),
      consult: { icon: 'minus', text: t('consultDeployer') },
      ent: { icon: 'x', text: t('entDeployer') },
      comp: { icon: 'check', text: t('compDeployer') },
    },
    {
      label: t('rowTrial'),
      consult: { icon: 'x', text: t('consultTrial') },
      ent: { icon: 'minus', text: t('entTrial') },
      comp: { icon: 'check', text: t('compTrial') },
    },
  ];

  function renderCell(cell: string | CellIcon, isHighlight: boolean) {
    if (typeof cell === 'object' && 'icon' in cell) {
      return <IconCell icon={cell.icon} text={cell.text} />;
    }
    if (isHighlight) {
      return <strong>{cell}</strong>;
    }
    return cell || '\u2014';
  }

  return (
    <section
      className="relative z-[1]"
      style={{ padding: '5rem 0', background: 'var(--bg2)' }}
    >
      <div className="mx-auto max-w-ctr px-8">
        <SectionHeader label={t('label')} title={t('title')} titleEm={t('titleEm')} />

        {/* Scrollable table wrapper */}
        <div className="overflow-x-auto">
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--b2)',
              borderRadius: '10px',
            }}
          >
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '34%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="text-left font-mono text-[0.5rem] font-semibold uppercase text-[var(--dark4)]"
                    style={{
                      background: 'var(--bg2)',
                      padding: '0.75rem 1rem',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid var(--b)',
                    }}
                  />
                  <th
                    className="text-left font-mono text-[0.5rem] font-semibold uppercase text-[var(--dark4)]"
                    style={{
                      background: 'var(--bg2)',
                      padding: '0.75rem 1rem',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid var(--b)',
                    }}
                  >
                    {t('colConsultants')}
                  </th>
                  <th
                    className="text-left font-mono text-[0.5rem] font-semibold uppercase text-[var(--dark4)]"
                    style={{
                      background: 'var(--bg2)',
                      padding: '0.75rem 1rem',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid var(--b)',
                    }}
                  >
                    {t('colEnterprise')}
                  </th>
                  <th
                    className="text-left font-mono text-[0.5rem] font-semibold uppercase"
                    style={{
                      background: 'var(--teal)',
                      color: '#fff',
                      fontWeight: 600,
                      padding: '0.75rem 1rem',
                      letterSpacing: '0.1em',
                      borderBottom: '1px solid var(--b)',
                    }}
                  >
                    {t('colComplior')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    <td
                      className="text-[0.75rem] text-[var(--dark3)]"
                      style={{
                        padding: '0.625rem 1rem',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--b)' : 'none',
                        background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : undefined,
                      }}
                    >
                      <strong>{row.label}</strong>
                    </td>
                    <td
                      className="text-[0.75rem] text-[var(--dark3)]"
                      style={{
                        padding: '0.625rem 1rem',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--b)' : 'none',
                        background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : undefined,
                      }}
                    >
                      {renderCell(row.consult, false)}
                    </td>
                    <td
                      className="text-[0.75rem] text-[var(--dark3)]"
                      style={{
                        padding: '0.625rem 1rem',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--b)' : 'none',
                        background: i % 2 === 1 ? 'rgba(0,0,0,0.015)' : undefined,
                      }}
                    >
                      {renderCell(row.ent, false)}
                    </td>
                    <td
                      className="text-[0.75rem]"
                      style={{
                        padding: '0.625rem 1rem',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--b)' : 'none',
                        background: 'rgba(13,148,136,0.03)',
                      }}
                    >
                      {renderCell(row.comp, true)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Savings cards */}
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="text-center"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--b2)',
              padding: '1.75rem',
              borderRadius: '10px',
            }}
          >
            <div
              className="font-display font-extrabold text-teal"
              style={{ fontSize: '2.5rem' }}
            >
              {t('savedAmount')}
            </div>
            <div className="text-[0.75rem] text-[var(--dark5)]">
              {t('savedLabel')}
            </div>
          </div>
          <div
            className="text-center"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--b2)',
              padding: '1.75rem',
              borderRadius: '10px',
            }}
          >
            <div
              className="font-display font-extrabold text-teal"
              style={{ fontSize: '2.5rem' }}
            >
              {t('savedHours')}
            </div>
            <div className="text-[0.75rem] text-[var(--dark5)]">
              {t('savedHoursLabel')}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
