import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { getUseCaseRiskRows } from '@/lib/registry-seo';

interface UseCaseRiskTableProps {
  tool: RegistryTool;
}

export function UseCaseRiskTable({ tool }: UseCaseRiskTableProps) {
  const rows = getUseCaseRiskRows(tool);

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--b2)',
      borderRadius: 'var(--radius)',
      padding: '1.25rem 1.5rem',
      marginBottom: '2rem',
    }}>
      <h3 style={{
        fontFamily: 'var(--f-display)',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--dark)',
        marginBottom: '.75rem',
      }}>
        Your risk depends on how you use {tool.name}
      </h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Usage Context', 'Risk Level', 'Obligations'].map((h) => (
                <th key={h} style={{
                  fontFamily: 'var(--f-mono)',
                  fontSize: '.4375rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '.06em',
                  color: 'var(--dark5)',
                  textAlign: 'left',
                  padding: '.375rem 0',
                  borderBottom: '1px solid var(--b)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx}>
                <td style={{ fontSize: '.75rem', color: 'var(--dark3)', padding: '.5rem 0', borderBottom: '1px solid var(--b)' }}>
                  {row.context}
                </td>
                <td style={{ fontSize: '.75rem', color: 'var(--dark3)', padding: '.5rem 0', borderBottom: '1px solid var(--b)', minWidth: 100 }}>
                  <span style={{
                    fontFamily: 'var(--f-mono)',
                    fontSize: '.4375rem',
                    fontWeight: 700,
                    padding: '.0625rem .3125rem',
                    borderRadius: 3,
                    display: 'inline-block',
                    background: row.riskBg,
                    color: row.riskColor,
                  }}>
                    {row.risk}
                  </span>
                </td>
                <td style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark3)', padding: '.5rem 0', borderBottom: '1px solid var(--b)' }}>
                  {row.obligations}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
