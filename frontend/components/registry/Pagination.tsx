'use client';

import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnStyle: React.CSSProperties = {
    fontFamily: 'var(--f-mono)',
    fontSize: '.6875rem',
    padding: '.375rem .625rem',
    borderRadius: 6,
    border: '1px solid var(--b)',
    background: 'var(--card)',
    color: 'var(--dark4)',
    cursor: 'pointer',
    transition: '.2s',
  };

  const activeStyle: React.CSSProperties = {
    ...btnStyle,
    background: 'var(--teal)',
    color: '#fff',
    borderColor: 'var(--teal)',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '.25rem', marginTop: '2rem' }}>
      {pages.map((p, i) =>
        typeof p === 'string' ? (
          <span key={`ellipsis-${i}`} style={{ ...btnStyle, cursor: 'default', border: 'none', background: 'none' }}>
            {p}
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            style={p === page ? activeStyle : btnStyle}
            onMouseEnter={(e) => {
              if (p !== page) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)';
                (e.currentTarget as HTMLElement).style.color = 'var(--dark)';
              }
            }}
            onMouseLeave={(e) => {
              if (p !== page) {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b)';
                (e.currentTarget as HTMLElement).style.color = 'var(--dark4)';
              }
            }}
          >
            {p}
          </button>
        ),
      )}
    </div>
  );
}
