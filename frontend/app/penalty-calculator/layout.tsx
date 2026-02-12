import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Act Penalty Calculator — Know Your Risk',
  description:
    'Calculate the maximum fines your organization could face under the EU AI Act. Penalties up to 7% of global turnover or €35M for prohibited practices.',
};

export default function PenaltyCalculatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
