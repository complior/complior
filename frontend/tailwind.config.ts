import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme-aware colors via CSS variables
        bg: {
          DEFAULT: 'var(--bg)',
          2: 'var(--bg2)',
          3: 'var(--bg3)',
          4: 'var(--bg4)',
        },
        dark: {
          DEFAULT: 'var(--dark)',
          2: 'var(--dark2)',
          3: 'var(--dark3)',
          4: 'var(--dark4)',
          5: 'var(--dark5)',
        },
        teal: {
          DEFAULT: 'var(--teal)',
          2: 'var(--teal2)',
          3: 'var(--teal3)',
          dim: 'var(--teal-dim)',
          glow: 'var(--teal-glow)',
        },
        coral: {
          DEFAULT: 'var(--coral)',
          dim: 'var(--coral-dim)',
        },
        'c-green': 'var(--green)',
        'c-amber': 'var(--amber)',
        border: {
          DEFAULT: 'var(--b)',
          2: 'var(--b2)',
          3: 'var(--b3)',
        },
        card: {
          DEFAULT: 'var(--card)',
        },
        // Keep risk colors (static, not theme-dependent)
        risk: {
          prohibited: '#dc2626',
          high: '#f97316',
          gpai: '#3b82f6',
          limited: '#eab308',
          minimal: '#22c55e',
        },
        // Legacy primary alias for existing code
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: 'var(--teal)',
          700: 'var(--teal2)',
          800: 'var(--teal3)',
          900: '#1e3a8a',
          950: '#172554',
        },
      },
      fontFamily: {
        display: ['var(--f-display)'],
        body: ['var(--f-body)'],
        mono: ['var(--f-mono)'],
        sans: ['var(--f-body)'],
      },
      maxWidth: {
        ctr: '1140px',
      },
      boxShadow: {
        'card-hover': 'var(--card-hover)',
      },
      animation: {
        'card-in': 'cardIn 0.5s ease both',
        pulse: 'pulse 2s infinite',
        blink: 'blink 1s step-end infinite',
        scanmove: 'scanmove 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

export default config;
