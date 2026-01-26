import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';

// 24 carefully selected colors for audio channel differentiation
const PRESET_COLORS = [
  // Row 1: Reds and Oranges
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  // Row 2: Greens and Cyans
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
  // Row 3: Blues and Purples
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#fb7185',
  // Row 4: Pastels and Neutrals
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        className="h-5 w-5 shrink-0 rounded border border-dsp-primary/40 transition-all hover:scale-110 hover:border-dsp-accent/60"
        style={{ backgroundColor: value }}
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label="Choose color"
      />

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-lg border border-dsp-primary/30 bg-dsp-surface p-2 shadow-lg">
          <div className="grid grid-cols-6 gap-1">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'h-6 w-6 rounded transition-all hover:scale-110',
                  value.toLowerCase() === color.toLowerCase() && 'ring-2 ring-white ring-offset-1 ring-offset-dsp-surface',
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
