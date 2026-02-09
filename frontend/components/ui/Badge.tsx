import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary-600 text-white',
        secondary: 'border-transparent bg-slate-100 text-slate-900',
        outline: 'text-slate-900 border-slate-200',
        prohibited: 'border-transparent bg-risk-prohibited text-white',
        high: 'border-transparent bg-risk-high text-white',
        gpai: 'border-transparent bg-risk-gpai text-white',
        limited: 'border-transparent bg-risk-limited text-slate-900',
        minimal: 'border-transparent bg-risk-minimal text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
