import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — AI Act Compliance Platform',
  description:
    'Choose your AI Act compliance plan. Free, Starter, Growth, Scale, or Enterprise — all with EU data residency and GDPR compliance.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
