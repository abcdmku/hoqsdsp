import { useCallback, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import type { DiffEqFilter } from '../../types';
import { diffeqHandler } from '../../lib/filters/diffeq';
import { FilterEditorModal, useFilterEditor } from './FilterEditorModal';
import { NumericInput } from '../ui';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface DiffEqEditorProps {
  open: boolean;
  onClose: () => void;
  filter: DiffEqFilter;
  onSave: (config: DiffEqFilter) => void;
  onApply?: (config: DiffEqFilter) => void;
}

interface CoefficientArrayProps {
  label: string;
  description: string;
  values: number[];
  onChange: (values: number[]) => void;
}

function CoefficientArray({ label, description, values, onChange }: CoefficientArrayProps) {
  const [textMode, setTextMode] = useState(false);
  const [textValue, setTextValue] = useState('');

  const updateValue = useCallback(
    (index: number, value: number) => {
      const newValues = [...values];
      newValues[index] = value;
      onChange(newValues);
    },
    [values, onChange],
  );

  const addCoefficient = useCallback(() => {
    onChange([...values, 0]);
  }, [values, onChange]);

  const removeCoefficient = useCallback(
    (index: number) => {
      if (values.length <= 1) return;
      const newValues = values.filter((_, i) => i !== index);
      onChange(newValues);
    },
    [values, onChange],
  );

  const handleTextParse = useCallback(() => {
    const parsed = textValue
      .split(/[,\s]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n));

    if (parsed.length > 0) {
      onChange(parsed);
      setTextMode(false);
    }
  }, [textValue, onChange]);

  const switchToTextMode = useCallback(() => {
    setTextValue(values.join(', '));
    setTextMode(true);
  }, [values]);

  if (textMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-dsp-text">{label}</label>
          <Button variant="ghost" size="sm" onClick={() => { setTextMode(false); }}>
            Cancel
          </Button>
        </div>
        <textarea
          value={textValue}
          onChange={(e) => { setTextValue(e.target.value); }}
          placeholder="1.0, 0.5, -0.25..."
          rows={3}
          className={cn(
            'w-full px-3 py-2 bg-dsp-surface border border-dsp-primary rounded-md',
            'text-dsp-text text-sm font-mono placeholder:text-dsp-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-dsp-accent',
            'resize-none',
          )}
        />
        <Button size="sm" onClick={handleTextParse}>
          Apply
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-dsp-text">{label}</label>
          <p className="text-xs text-dsp-text-muted">{description}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={switchToTextMode}>
          Edit as text
        </Button>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="w-8 text-xs text-dsp-text-muted text-right">
              [{index}]
            </span>
            <NumericInput
              value={value}
              onChange={(v) => { updateValue(index, v); }}
              step={0.001}
              precision={6}
              showStepper={false}
              className="flex-1"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => { removeCoefficient(index); }}
              disabled={values.length <= 1}
              aria-label={`Remove coefficient ${index}`}
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addCoefficient} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Add Coefficient
      </Button>
    </div>
  );
}

function DiffEqEditorContent() {
  const { filter, updateFilter } = useFilterEditor<DiffEqFilter>();
  const params = filter.parameters;

  const updateA = useCallback(
    (a: number[]) => {
      updateFilter({
        ...filter,
        parameters: { ...params, a },
      });
    },
    [filter, params, updateFilter],
  );

  const updateB = useCallback(
    (b: number[]) => {
      updateFilter({
        ...filter,
        parameters: { ...params, b },
      });
    },
    [filter, params, updateFilter],
  );

  return (
    <div className="space-y-6">
      {/* Filter Order Info */}
      <div className="bg-dsp-bg/50 rounded-lg p-4 text-center">
        <div className="text-lg font-mono text-dsp-text">
          Order: {Math.max(params.a.length, params.b.length) - 1}
        </div>
        <div className="text-sm text-dsp-text-muted">
          {params.b.length} feedforward / {params.a.length} feedback coefficients
        </div>
      </div>

      {/* B Coefficients (feedforward/numerator) */}
      <CoefficientArray
        label="B Coefficients (Feedforward)"
        description="Numerator polynomial: b[0] + b[1]z^-1 + b[2]z^-2 + ..."
        values={params.b}
        onChange={updateB}
      />

      {/* A Coefficients (feedback/denominator) */}
      <CoefficientArray
        label="A Coefficients (Feedback)"
        description="Denominator polynomial: a[0] + a[1]z^-1 + a[2]z^-2 + ..."
        values={params.a}
        onChange={updateA}
      />

      {/* Transfer Function Display */}
      <div className="bg-dsp-bg rounded-md p-4 space-y-2">
        <p className="text-xs text-dsp-text-muted uppercase tracking-wide">
          Transfer Function
        </p>
        <div className="font-mono text-sm text-dsp-text text-center py-2">
          <div className="border-b border-dsp-text inline-block px-4 py-1">
            H(z) = {formatPolynomial(params.b)}
          </div>
          <div className="px-4 py-1">
            {formatPolynomial(params.a)}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-dsp-bg rounded-md p-3 text-xs text-dsp-text-muted space-y-2">
        <p>
          <strong>Difference equation filter</strong> implements a general IIR/FIR
          filter using the transfer function coefficients directly.
        </p>
        <p>
          The output is computed as:
          <br />
          <code className="font-mono">
            y[n] = (b[0]x[n] + b[1]x[n-1] + ... - a[1]y[n-1] - a[2]y[n-2] - ...) / a[0]
          </code>
        </p>
        <p>
          Note: a[0] is typically 1.0 for normalized coefficients.
        </p>
      </div>
    </div>
  );
}

// Helper to format polynomial for display
function formatPolynomial(coeffs: number[]): string {
  if (coeffs.length === 0) return '0';

  const terms = coeffs.map((c, i) => {
    if (Math.abs(c) < 1e-10) return null;

    const sign = c < 0 ? '-' : (i > 0 ? '+' : '');
    const absC = Math.abs(c);
    const coefStr = absC === 1 && i > 0 ? '' : absC.toPrecision(4);

    if (i === 0) return `${sign}${coefStr}`;
    if (i === 1) return `${sign}${coefStr}z^-1`;
    return `${sign}${coefStr}z^-${i}`;
  }).filter(Boolean);

  return terms.length > 0 ? terms.join(' ') : '0';
}

export function DiffEqEditor({
  open,
  onClose,
  filter,
  onSave,
  onApply,
}: DiffEqEditorProps) {
  return (
    <FilterEditorModal
      open={open}
      onClose={onClose}
      title="Difference Equation"
      description="Generic IIR/FIR filter by coefficients"
      filter={filter}
      onSave={onSave}
      onApply={onApply}
      validate={(config) => diffeqHandler.validate(config)}
    >
      <DiffEqEditorContent />
    </FilterEditorModal>
  );
}
