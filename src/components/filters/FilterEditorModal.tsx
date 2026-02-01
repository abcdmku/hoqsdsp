import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import type { FilterConfig, BiquadParameters } from '../../types';
import { generateFrequencies, calculateBiquadResponse, formatFrequency } from '../../lib/dsp';
import type { ValidationResult } from '../../lib/filters/types';

interface FilterEditorModalProps<T extends FilterConfig> {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  filter: T;
  onSave: (config: T) => void;
  onApply?: (config: T) => void;
  validate: (config: unknown) => ValidationResult;
  children: React.ReactNode;
  showFrequencyResponse?: boolean;
  sampleRate?: number;
  contentClassName?: string;
  bodyScrollable?: boolean;
  bodyClassName?: string;
  /** If enabled, automatically calls onApply after edits (debounced). */
  autoApply?: boolean;
  autoApplyDebounceMs?: number;
}

export interface FilterEditorPanelProps<T extends FilterConfig> {
  onClose: () => void;
  title?: string;
  description?: string;
  filter: T;
  onSave: (config: T) => void;
  onApply?: (config: T) => void;
  validate: (config: unknown) => ValidationResult;
  children: React.ReactNode;
  showFrequencyResponse?: boolean;
  sampleRate?: number;
  className?: string;
  showHeader?: boolean;
  bodyScrollable?: boolean;
  bodyClassName?: string;
  /** If enabled, automatically calls onApply after edits (debounced). */
  autoApply?: boolean;
  autoApplyDebounceMs?: number;
}

// Frequency response graph for biquad filters
function FrequencyResponseGraph({
  params,
  sampleRate,
}: {
  params: BiquadParameters;
  sampleRate: number;
}) {
  const response = useMemo(() => {
    const frequencies = generateFrequencies(256);
    return frequencies.map((freq) => ({
      frequency: freq,
      magnitude: calculateBiquadResponse(params, freq, sampleRate),
    }));
  }, [params, sampleRate]);

  const width = 400;
  const height = 150;
  const padding = { left: 45, right: 10, top: 10, bottom: 25 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  // Scale frequency logarithmically
  const freqToX = (freq: number): number => {
    const logMin = Math.log10(20);
    const logMax = Math.log10(20000);
    const logFreq = Math.log10(freq);
    return padding.left + ((logFreq - logMin) / (logMax - logMin)) * graphWidth;
  };

  // Scale magnitude (-24 to +24 dB)
  const magToY = (mag: number): number => {
    const clampedMag = Math.max(-24, Math.min(24, mag));
    return padding.top + ((24 - clampedMag) / 48) * graphHeight;
  };

  // Generate path
  const pathD = response
    .map((point, i) => {
      const x = freqToX(point.frequency);
      const y = magToY(point.magnitude);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Grid lines
  const freqGridLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
  const gainGridLines = [-24, -18, -12, -6, 0, 6, 12, 18, 24];

  return (
    <svg
      width={width}
      height={height}
      className="bg-dsp-bg rounded"
      role="img"
      aria-label="Frequency response graph"
    >
      {/* Grid lines - frequencies */}
      {freqGridLines.map((freq) => (
        <line
          key={`freq-${freq}`}
          x1={freqToX(freq)}
          y1={padding.top}
          x2={freqToX(freq)}
          y2={height - padding.bottom}
          stroke="currentColor"
          className="text-dsp-primary/30"
          strokeWidth={freq === 1000 ? 1 : 0.5}
        />
      ))}

      {/* Grid lines - gain */}
      {gainGridLines.map((gain) => (
        <line
          key={`gain-${gain}`}
          x1={padding.left}
          y1={magToY(gain)}
          x2={width - padding.right}
          y2={magToY(gain)}
          stroke="currentColor"
          className={cn(
            gain === 0 ? 'text-dsp-text/50' : 'text-dsp-primary/30',
          )}
          strokeWidth={gain === 0 ? 1 : 0.5}
        />
      ))}

      {/* Axis labels - frequencies */}
      {[100, 1000, 10000].map((freq) => (
        <text
          key={`label-${freq}`}
          x={freqToX(freq)}
          y={height - 5}
          textAnchor="middle"
          className="fill-dsp-text-muted text-[9px]"
        >
          {formatFrequency(freq)}
        </text>
      ))}

      {/* Axis labels - gain */}
      {[-12, 0, 12].map((gain) => (
        <text
          key={`gain-label-${gain}`}
          x={padding.left - 5}
          y={magToY(gain) + 3}
          textAnchor="end"
          className="fill-dsp-text-muted text-[9px]"
        >
          {gain > 0 ? `+${gain}` : gain}
        </text>
      ))}

      {/* Response curve */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        className="text-filter-eq"
        strokeWidth={2}
      />
    </svg>
  );
}

function FilterEditorCore<T extends FilterConfig>({
  onClose,
  title,
  description,
  filter,
  onSave,
  onApply,
  validate,
  children,
  showFrequencyResponse = false,
  sampleRate = 48000,
  className,
  showHeader = true,
  bodyScrollable = true,
  bodyClassName,
  autoApply = false,
  autoApplyDebounceMs = 250,
}: Omit<FilterEditorPanelProps<T>, 'title'> & { title?: string }) {
  const [localFilter, setLocalFilter] = useState<T>(filter);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const autoApplyTimeoutRef = useRef<number | null>(null);

  // Reset local state when filter changes (modal opens with new filter)
  useEffect(() => {
    // Avoid clobbering in-progress edits if the parent refreshes the filter prop
    // (e.g., config polling / refetch). This was causing "flash/reset" behavior
    // for auto-apply editors when the upstream config hadn't yet reflected changes.
    if (isDirty) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalFilter(filter);
    setValidationErrors([]);
    setIsDirty(false);
    if (autoApplyTimeoutRef.current !== null) {
      window.clearTimeout(autoApplyTimeoutRef.current);
      autoApplyTimeoutRef.current = null;
    }
  }, [filter, isDirty]);

  const handleValidate = useCallback(
    (config: T): boolean => {
      const result = validate(config);
      if (!result.success && result.errors) {
        setValidationErrors(result.errors.map((e) => `${e.path.join('.')}: ${e.message}`));
        return false;
      }
      setValidationErrors([]);
      return true;
    },
    [validate],
  );

  const updateFilter = useCallback(
    (updates: Partial<T> | ((prev: T) => T)) => {
      setLocalFilter((prev) => {
        const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
        handleValidate(next);
        setIsDirty(true);
        return next;
      });
    },
    [handleValidate],
  );

  useEffect(() => {
    if (!autoApply || !onApply) return;
    if (!isDirty) return;
    if (validationErrors.length > 0) return;

    if (autoApplyTimeoutRef.current !== null) {
      window.clearTimeout(autoApplyTimeoutRef.current);
      autoApplyTimeoutRef.current = null;
    }

    autoApplyTimeoutRef.current = window.setTimeout(() => {
      autoApplyTimeoutRef.current = null;
      if (handleValidate(localFilter)) {
        onApply(localFilter);
      }
    }, autoApplyDebounceMs);

    return () => {
      if (autoApplyTimeoutRef.current !== null) {
        window.clearTimeout(autoApplyTimeoutRef.current);
        autoApplyTimeoutRef.current = null;
      }
    };
  }, [autoApply, autoApplyDebounceMs, handleValidate, isDirty, localFilter, onApply, validationErrors.length]);

  const handleApply = useCallback(() => {
    if (handleValidate(localFilter) && onApply) {
      onApply(localFilter);
    }
  }, [localFilter, handleValidate, onApply]);

  const handleSave = useCallback(() => {
    if (handleValidate(localFilter)) {
      if (autoApplyTimeoutRef.current !== null) {
        window.clearTimeout(autoApplyTimeoutRef.current);
        autoApplyTimeoutRef.current = null;
      }
      onSave(localFilter);
      onClose();
    }
  }, [localFilter, handleValidate, onSave, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  return (
    <div className={cn('flex flex-col', className)} onKeyDown={handleKeyDown}>
      {showHeader && title && (
        <DialogHeader className="pb-3">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
      )}

      {!showHeader && description && (
        <div className="pb-3 text-xs text-dsp-text-muted">{description}</div>
      )}

      {/* Frequency Response Graph (for biquad filters) */}
      {showFrequencyResponse && localFilter.type === 'Biquad' && (
        <div className="flex justify-center py-2 border-b border-dsp-primary/30">
          <FrequencyResponseGraph
            params={(localFilter as { type: 'Biquad'; parameters: BiquadParameters }).parameters}
            sampleRate={sampleRate}
          />
        </div>
      )}

      {/* Parameters Section */}
      <div className={cn('flex-1 py-4', bodyScrollable ? 'overflow-auto' : 'overflow-hidden', bodyClassName)}>
        <FilterEditorContext.Provider
          value={{
            filter: localFilter,
            updateFilter: updateFilter as (updates: Partial<FilterConfig> | ((prev: FilterConfig) => FilterConfig)) => void,
          }}
        >
          {children}
        </FilterEditorContext.Provider>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-meter-red/10 border border-meter-red/30 rounded p-3 space-y-1">
          {validationErrors.map((error, i) => (
            <p key={i} className="text-sm text-meter-red flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t border-dsp-primary/30">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        {onApply && (
          <Button
            variant="secondary"
            onClick={handleApply}
            disabled={validationErrors.length > 0}
          >
            Apply
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={validationErrors.length > 0 || !isDirty}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export function FilterEditorPanel<T extends FilterConfig>({
  onClose,
  title,
  description,
  filter,
  onSave,
  onApply,
  validate,
  children,
  showFrequencyResponse = false,
  sampleRate = 48000,
  className,
  showHeader = false,
  bodyScrollable = true,
  bodyClassName,
  autoApply,
  autoApplyDebounceMs,
}: FilterEditorPanelProps<T>) {
  return (
    <FilterEditorCore
      onClose={onClose}
      title={title}
      description={description}
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={validate}
      showFrequencyResponse={showFrequencyResponse}
      sampleRate={sampleRate}
      className={className}
      showHeader={showHeader}
      bodyScrollable={bodyScrollable}
      bodyClassName={bodyClassName}
      autoApply={autoApply}
      autoApplyDebounceMs={autoApplyDebounceMs}
    >
      {children}
    </FilterEditorCore>
  );
}

export function FilterEditorModal<T extends FilterConfig>({
  open,
  onClose,
  title,
  description,
  filter,
  onSave,
  onApply,
  validate,
  children,
  showFrequencyResponse = false,
  sampleRate = 48000,
  contentClassName,
  bodyScrollable = true,
  bodyClassName,
  autoApply,
  autoApplyDebounceMs,
}: FilterEditorModalProps<T>) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose();
    }}>
      <DialogContent className={cn('max-w-lg max-h-[85vh] flex flex-col', contentClassName)}>
        <FilterEditorCore
          onClose={onClose}
          title={title}
          description={description}
          filter={filter}
          onSave={onSave}
          onApply={onApply}
          validate={validate}
          showFrequencyResponse={showFrequencyResponse}
          sampleRate={sampleRate}
          showHeader={true}
          bodyScrollable={bodyScrollable}
          bodyClassName={bodyClassName}
          autoApply={autoApply}
          autoApplyDebounceMs={autoApplyDebounceMs}
        >
          {children}
        </FilterEditorCore>
      </DialogContent>
    </Dialog>
  );
}

// Context for sharing filter state with child editor components
import { createContext, useContext } from 'react';

interface FilterEditorContextValue<T extends FilterConfig = FilterConfig> {
  filter: T;
  updateFilter: (updates: Partial<T> | ((prev: T) => T)) => void;
}

const FilterEditorContext = createContext<FilterEditorContextValue | null>(null);

export function useFilterEditor<T extends FilterConfig>(): FilterEditorContextValue<T> {
  const context = useContext(FilterEditorContext);
  if (!context) {
    throw new Error('useFilterEditor must be used within a FilterEditorModal or FilterEditorPanel');
  }
  return context as unknown as FilterEditorContextValue<T>;
}

// Re-export for convenience
export type { FilterEditorModalProps };
