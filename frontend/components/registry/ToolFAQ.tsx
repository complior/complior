import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import { generateToolFAQs } from '@/lib/registry-seo';

interface ToolFAQProps {
  tool: RegistryTool;
}

export function ToolFAQ({ tool }: ToolFAQProps) {
  const faqs = generateToolFAQs(tool);

  if (faqs.length === 0) return null;

  return (
    <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
      <h2 style={{
        fontFamily: 'var(--f-mono)',
        fontSize: '.5625rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        color: 'var(--dark5)',
        marginBottom: '1rem',
      }}>
        Frequently Asked Questions
      </h2>
      {faqs.map((faq, idx) => (
        <details
          key={idx}
          style={{
            borderBottom: '1px solid var(--b)',
            padding: '.75rem 0',
          }}
          {...(idx === faqs.length - 1 ? { open: true } : {})}
        >
          <summary style={{
            fontFamily: 'var(--f-display)',
            fontSize: '.875rem',
            fontWeight: 700,
            color: 'var(--dark)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '.375rem 0',
            listStyle: 'none',
          }}>
            <h3 style={{ fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', margin: 0 }}>
              {faq.question}
            </h3>
            <span style={{ color: 'var(--dark5)', fontSize: '1rem', flexShrink: 0, marginLeft: '.5rem' }}>+</span>
          </summary>
          <div style={{ padding: '.5rem 0 .25rem' }}>
            <p style={{ fontSize: '.8125rem', color: 'var(--dark3)', lineHeight: 1.7 }}>
              {faq.answer}
            </p>
          </div>
        </details>
      ))}
    </div>
  );
}
