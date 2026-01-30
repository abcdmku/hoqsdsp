import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/Select';
import { COMMON_CHUNK_SIZES, COMMON_SAMPLE_RATES } from './constants';

interface CommonSettingsSectionProps {
  sampleRate: number;
  chunkSize: number;
  onSampleRateChange: (value: number) => void;
  onChunkSizeChange: (value: number) => void;
}

export function CommonSettingsSection({
  sampleRate,
  chunkSize,
  onSampleRateChange,
  onChunkSizeChange,
}: CommonSettingsSectionProps) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-dsp-text">Common Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Sample Rate</label>
          <Select value={String(sampleRate)} onValueChange={(v) => onSampleRateChange(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_SAMPLE_RATES.map((rate) => (
                <SelectItem key={rate} value={String(rate)}>
                  {(rate / 1000).toFixed(1)} kHz
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-dsp-text-muted">Chunk Size</label>
          <Select value={String(chunkSize)} onValueChange={(v) => onChunkSizeChange(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMON_CHUNK_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} samples
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
