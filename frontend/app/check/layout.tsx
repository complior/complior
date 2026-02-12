import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Act Quick Check — Free Assessment',
  description:
    'Find out in 2 minutes if the EU AI Act applies to your organization. Free, no signup required.',
};

export default function QuickCheckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
