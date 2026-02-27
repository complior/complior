'use client';

import React, { useRef, useEffect } from 'react';

interface RegistrySearchProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function RegistrySearch({ value, onChange, placeholder = 'Search tools... (e.g. ChatGPT, Midjourney, HireVue)' }: RegistrySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const wrapStyle: React.CSSProperties = {
    position: 'relative',
    marginBottom: '1.5rem',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '.75rem 1rem .75rem 2.75rem',
    background: 'var(--card)',
    border: '1px solid var(--b2)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--f-body)',
    fontSize: '.9375rem',
    color: 'var(--dark)',
    outline: 'none',
    transition: '.3s',
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: '.875rem',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 18,
    height: 18,
    pointerEvents: 'none',
  };

  const kbdStyle: React.CSSProperties = {
    position: 'absolute',
    right: '.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    fontFamily: 'var(--f-mono)',
    fontSize: '.5625rem',
    color: 'var(--dark5)',
    background: 'var(--bg2)',
    border: '1px solid var(--b)',
    borderRadius: 4,
    padding: '.0625rem .3125rem',
  };

  return (
    <div style={wrapStyle}>
      <svg style={iconStyle} viewBox="0 0 24 24" fill="none" stroke="var(--dark5)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--teal)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--teal-dim)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--b2)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {!value && <span style={kbdStyle}>/</span>}
    </div>
  );
}
