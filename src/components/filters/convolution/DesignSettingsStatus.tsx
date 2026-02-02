import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button, Switch } from '../../ui';
import { cn } from '../../../lib/utils';
import type { FirMagnitudeStats, FirPreviewDesign } from './types';

interface DesignSettingsStatusProps {
  previewDesign: FirPreviewDesign;
  firMagnitudeStats: { preview: FirMagnitudeStats | null };
  onApplyFir: () => void;
  normalize: boolean;
  onNormalizeChange: (value: boolean) => void;
}

export function DesignSettingsStatus({
  previewDesign,
  firMagnitudeStats,
  onApplyFir,
  normalize,
  onNormalizeChange,
}: DesignSettingsStatusProps) {
  return (
    <>
      {previewDesign.error && (
        <div className="flex items-center gap-2 rounded-md border border-meter-red/30 bg-meter-red/10 px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-meter-red" aria-hidden="true" />
          <p className="text-xs text-meter-red">{previewDesign.error}</p>
        </div>
      )}

      {previewDesign.warnings.length > 0 && (
        <div className="rounded-md border border-meter-yellow/30 bg-meter-yellow/10 px-3 py-2 text-xs text-meter-yellow">
          {previewDesign.warnings.join(' ')}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Switch checked={normalize} onCheckedChange={(checked) => onNormalizeChange(Boolean(checked))} aria-label="Normalize FIR" />
          <span className="text-xs text-dsp-text-muted">Normalize</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onApplyFir} disabled={!previewDesign.taps}>
            Apply FIR
          </Button>
          {previewDesign.taps && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-status-online">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Ready ({previewDesign.taps.length.toLocaleString()} taps)
              </div>
              {firMagnitudeStats.preview && (
                <span
                  className={cn(
                    'text-[11px]',
                    firMagnitudeStats.preview.peakAbsDb > 12
                      ? 'text-meter-red'
                      : firMagnitudeStats.preview.peakAbsDb > 6
                        ? 'text-meter-yellow'
                        : 'text-dsp-text-muted',
                  )}
                  title="Peak FIR magnitude deviation from 0 dB across the preview frequencies. Large values indicate the phase-only approximation is struggling; try more taps/latency, narrower band, higher magnitude gate, or a different window."
                >
                  FIR mag: +/-{firMagnitudeStats.preview.peakAbsDb.toFixed(1)} dB
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
