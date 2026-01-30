import { useCallback, useState } from 'react';

interface InlineNumberFieldProps {
  value: number;
  precision: number;
  min?: number;
  max?: number;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  onCommit: (value: number) => void;
  onFocus?: () => void;
}

export function InlineNumberField({
  value,
  precision,
  min = -Infinity,
  max = Infinity,
  ariaLabel,
  className,
  disabled,
  onCommit,
  onFocus,
}: InlineNumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = useCallback(
    (next: number) => Math.min(max, Math.max(min, next)),
    [max, min],
  );

  const commit = useCallback(() => {
    if (draft === null) return;
    const parsed = Number.parseFloat(draft);
    if (Number.isFinite(parsed)) {
      onCommit(clamp(parsed));
    }
    setDraft(null);
  }, [clamp, draft, onCommit]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft ?? value.toFixed(precision)}
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onFocus={(e) => {
        onFocus?.();
        setDraft(value.toFixed(precision));
        e.currentTarget.select();
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          commit();
          e.currentTarget.blur();
          return;
        }
        if (e.key === 'Escape') {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
      disabled={disabled}
      className={className}
      aria-label={ariaLabel}
    />
  );
}
