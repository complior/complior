'use client';

import React, { useState } from 'react';
import type { RegistryTool } from '@/lib/registry';
import type { ToolValidation } from './toolValidation';
import { OverviewTab } from './OverviewTab';
import { ObligationsTab } from './ObligationsTab';
import { DetectionTab } from './DetectionTab';

const TAB_NAMES = ['Overview', 'Obligations', 'Detection', 'Documents', 'History'];

interface ToolTabsProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

export function ToolTabs({ tool, validation }: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabStyle: React.CSSProperties = {
    fontFamily: 'var(--f-body)',
    fontSize: '.8125rem',
    fontWeight: 600,
    color: 'var(--dark4)',
    padding: '.625rem 1rem',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: '.2s',
    userSelect: 'none',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
  };

  const activeTabStyle: React.CSSProperties = {
    ...tabStyle,
    color: 'var(--teal)',
    borderBottomColor: 'var(--teal)',
  };

  return (
    <>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid var(--b)',
        marginBottom: '2rem',
        position: 'sticky',
        top: 49,
        zIndex: 50,
        background: 'var(--bg)',
        paddingTop: '.5rem',
        overflowX: 'auto',
      }}>
        {TAB_NAMES.map((name, idx) => (
          <button
            key={name}
            onClick={() => setActiveTab(idx)}
            style={idx === activeTab ? activeTabStyle : tabStyle}
            onMouseEnter={(e) => {
              if (idx !== activeTab) (e.currentTarget as HTMLElement).style.color = 'var(--dark2)';
            }}
            onMouseLeave={(e) => {
              if (idx !== activeTab) (e.currentTarget as HTMLElement).style.color = 'var(--dark4)';
            }}
          >
            {name}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 0 && <OverviewTab tool={tool} validation={validation} />}
      {activeTab === 1 && <ObligationsTab tool={tool} />}
      {activeTab === 2 && <DetectionTab tool={tool} />}
      {activeTab === 3 && <DocumentsTab tool={tool} />}
      {activeTab === 4 && <HistoryTab tool={tool} />}
    </>
  );
}

/* ---- Documents Tab (inline) ---- */
function DocumentsTab({ tool }: { tool: RegistryTool }) {
  const docs = [
    { icon: '\uD83D\uDCCB', name: 'AI Literacy Training Plan', desc: `Role-specific training plan pre-built for ${tool.name} users.` },
    { icon: '\uD83D\uDCC4', name: 'Transparency Notice (Art. 50)', desc: `Ready-to-deploy disclosure text for ${tool.name}.` },
    { icon: '\uD83D\uDDC2\uFE0F', name: 'AI System Registration Card', desc: `Internal registry entry for ${tool.name}. Audit-ready format.` },
    { icon: '\u2696\uFE0F', name: 'FRIA \u2014 Fundamental Rights Impact Assessment', desc: `Pre-scoped for ${tool.name}.` },
  ];

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dark5)', marginBottom: '1rem' }}>
        Generate Compliance Documents for {tool.name}
      </div>
      <p style={{ fontSize: '.8125rem', color: 'var(--dark4)', marginBottom: '1.25rem', maxWidth: 600 }}>
        These are not generic templates. Each document is pre-filled with {tool.name}-specific data &mdash; risk classification, applicable articles, provider details, and recommended mitigations.
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
              <div style={{ fontSize: '.625rem', color: 'var(--dark5)' }}>{doc.desc}</div>
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
    </div>
  );
}

/* ---- History Tab (inline) ---- */
function HistoryTab({ tool }: { tool: RegistryTool }) {
  const evidence = tool.evidence || [];

  if (evidence.length === 0) {
    return (
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dark5)', marginBottom: '1rem' }}>
          Compliance History
        </div>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--dark4)', fontSize: '.875rem' }}>
          No compliance history available yet.
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--dark5)', marginBottom: '1rem' }}>
        Compliance History
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
        {evidence.map((ev, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start',
              padding: '.75rem 0',
              borderBottom: idx < evidence.length - 1 ? '1px solid var(--b)' : 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--f-mono)', fontSize: '.625rem', color: 'var(--dark5)', minWidth: 80 }}>
              {ev.date}
            </div>
            <div>
              <div style={{ fontSize: '.8125rem', color: 'var(--dark)' }}>{ev.title}</div>
              {ev.description && (
                <div style={{ fontSize: '.6875rem', color: 'var(--dark4)' }}>{ev.description}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
