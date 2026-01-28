import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-dsp-bg',
    'disabled:pointer-events-none disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-dsp-accent text-dsp-bg hover:bg-dsp-accent/90',
        secondary: 'bg-dsp-primary/70 text-dsp-text hover:bg-dsp-primary/90 border border-dsp-primary/80',
        outline: 'border border-dsp-primary/60 bg-transparent text-dsp-text hover:bg-dsp-primary/35',
        ghost: 'text-dsp-text hover:bg-dsp-primary/35',
        destructive: 'bg-meter-red text-white hover:bg-meter-red/90',
        danger: 'bg-status-error text-white hover:bg-status-error/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-6',
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
