import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185',
  '#fbbf24', '#a3e635', '#34d399', '#22d3ee', '#818cf8', '#c084fc',
];

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        className={cn(
          'h-5 w-5 shrink-0 rounded border border-dsp-primary/50 transition-colors',
          'hover:border-dsp-accent/60',
          'focus:outline-none focus:ring-2 focus:ring-dsp-accent/35 focus:ring-offset-2 focus:ring-offset-dsp-bg'
        )}
        style={{ backgroundColor: value }}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Choose color"
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-dsp-primary/60 bg-dsp-surface p-2 shadow-xl">
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'h-6 w-6 rounded outline-none',
                  'ring-1 ring-black/10',
                  'hover:ring-2 hover:ring-dsp-accent/35',
                  value.toLowerCase() === color.toLowerCase() &&
                    'ring-2 ring-dsp-text ring-offset-1 ring-offset-dsp-surface'
                )}
                style={{ backgroundColor: color }}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(color);
                  setIsOpen(false);
                }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
