'use client';

import React, { useState } from 'react';
import type { RegistryTool } from '@/lib/registry';
import type { ToolValidation } from './toolValidation';
import { OverviewTab } from './OverviewTab';
import { DocumentationChecklistTab } from './DocumentationChecklistTab';
import { ObligationsTab } from './ObligationsTab';
import { DetectionTab } from './DetectionTab';
import { DocumentsTab } from './DocumentsTab';
import { HistoryTab } from './HistoryTab';

const TAB_NAMES = ['Overview', 'Documentation', 'Obligations', 'Detection', 'Documents', 'History'];

interface ToolTabsProps {
  tool: RegistryTool;
  validation: ToolValidation;
}

export function ToolTabs({ tool, validation }: ToolTabsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const tabStyle: React.CSSProperties = {
    fontFamily: 'var(--f-body)',
    fontSize: '.75rem',
    fontWeight: 600,
    color: 'var(--dark4)',
    padding: '.625rem .875rem',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: '.2s',
    userSelect: 'none',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: 'transparent',
    whiteSpace: 'nowrap',
  };

  const activeTabStyle: React.CSSProperties = {
    ...tabStyle,
    color: 'var(--teal)',
    borderBottomColor: 'var(--teal)',
  };

  return (
    <>
      {/* Tab bar */}
      <nav style={{
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
      </nav>

      {/* All tab content in DOM — hidden via display:none for SEO */}
      <section id="overview" style={{ display: activeTab === 0 ? 'block' : 'none' }}>
        <OverviewTab tool={tool} validation={validation} />
      </section>
      <section id="documentation" style={{ display: activeTab === 1 ? 'block' : 'none' }}>
        <DocumentationChecklistTab tool={tool} />
      </section>
      <section id="obligations" style={{ display: activeTab === 2 ? 'block' : 'none' }}>
        <ObligationsTab tool={tool} />
      </section>
      <section id="detection" style={{ display: activeTab === 3 ? 'block' : 'none' }}>
        <DetectionTab tool={tool} />
      </section>
      <section id="documents" style={{ display: activeTab === 4 ? 'block' : 'none' }}>
        <DocumentsTab tool={tool} />
      </section>
      <section id="history" style={{ display: activeTab === 5 ? 'block' : 'none' }}>
        <HistoryTab tool={tool} />
      </section>
    </>
  );
}
