import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-body',
  {
    variants: {
      variant: {
        default:
          'bg-teal text-white shadow-[0_2px_8px_var(--teal-glow)] hover:bg-teal-2 hover:shadow-[0_4px_16px_var(--teal-glow)] hover:-translate-y-px active:translate-y-0 dark:text-[var(--bg)]',
        outline:
          'bg-transparent text-teal border-[1.5px] border-teal hover:bg-teal-dim',
        ghost:
          'bg-transparent text-[var(--dark4)] hover:text-[var(--dark)]',
        white:
          'bg-[var(--card)] text-[var(--dark)] border-[1.5px] border-[var(--b2)] shadow-[0_1px_3px_rgba(0,0,0,.04)] hover:border-[var(--b3)] hover:shadow-[0_2px_8px_rgba(0,0,0,.06)]',
        secondary:
          'bg-[var(--bg2)] text-[var(--dark2)] hover:bg-[var(--bg3)]',
        destructive:
          'bg-coral text-white hover:opacity-90',
        link:
          'text-teal underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        default: 'h-10 px-[1.125rem] py-2 text-[0.8125rem] gap-[0.4375rem]',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'px-[1.375rem] py-[0.625rem] text-[0.875rem]',
        xl: 'px-7 py-3 text-[0.9375rem]',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
