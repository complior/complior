'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const toastVariants = cva(
  'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all',
  {
    variants: {
      variant: {
        success: 'border-green-200 bg-green-50 text-green-900',
        error: 'border-red-200 bg-red-50 text-red-900',
        warning: 'border-yellow-200 bg-yellow-50 text-yellow-900',
        info: 'border-blue-200 bg-blue-50 text-blue-900',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  onClose?: () => void;
  duration?: number;
}

function Toast({ className, variant, onClose, duration = 5000, children, ...props }: ToastProps) {
  React.useEffect(() => {
    if (!onClose || duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={cn(toastVariants({ variant }), className)} role="alert" {...props}>
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="shrink-0 rounded-md p-1 opacity-70 hover:opacity-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ToastContainer({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2', className)}
      {...props}
    />
  );
}

export { Toast, ToastContainer, toastVariants };
