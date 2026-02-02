import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../lib/utils';

const Slider = React.forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, value, defaultValue, ...props }, ref) => {
  const thumbCount = Math.max(
    1,
    Array.isArray(value) ? value.length : Array.isArray(defaultValue) ? defaultValue.length : 1,
  );

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      value={value}
      defaultValue={defaultValue}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-dsp-primary/70">
        <SliderPrimitive.Range className="absolute h-full bg-dsp-accent" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, index) => (
        <SliderPrimitive.Thumb
          // Radix manages order; we just need stable keys for thumb count.
          key={index}
          className={cn(
            'block h-5 w-5 rounded-full border-2 border-dsp-accent bg-dsp-surface shadow-sm',
            'ring-offset-dsp-bg transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dsp-accent/40 focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
});
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
