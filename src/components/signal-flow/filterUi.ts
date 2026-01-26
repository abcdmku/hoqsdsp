import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  Clock,
  Ear,
  Gauge,
  Shield,
  Sigma,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Waves,
} from 'lucide-react';
import type { FilterType } from '../../types';

export interface FilterUiMeta {
  type: FilterType;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  color: 'eq' | 'dynamics' | 'fir' | 'delay' | 'gain' | 'dither' | 'inactive';
}

export const FILTER_UI: Record<FilterType, FilterUiMeta> = {
  Biquad: {
    type: 'Biquad',
    label: 'Parametric EQ',
    shortLabel: 'EQ',
    icon: SlidersHorizontal,
    color: 'eq',
  },
  Delay: {
    type: 'Delay',
    label: 'Delay',
    shortLabel: 'DLY',
    icon: Clock,
    color: 'delay',
  },
  Gain: {
    type: 'Gain',
    label: 'Gain',
    shortLabel: 'GAIN',
    icon: AudioLines,
    color: 'gain',
  },
  Volume: {
    type: 'Volume',
    label: 'Volume',
    shortLabel: 'VOL',
    icon: Volume2,
    color: 'gain',
  },
  DiffEq: {
    type: 'DiffEq',
    label: 'Difference Eq',
    shortLabel: 'DEQ',
    icon: Sigma,
    color: 'inactive',
  },
  Conv: {
    type: 'Conv',
    label: 'Convolution (FIR)',
    shortLabel: 'FIR',
    icon: Waves,
    color: 'fir',
  },
  Compressor: {
    type: 'Compressor',
    label: 'Compressor',
    shortLabel: 'CMP',
    icon: Gauge,
    color: 'dynamics',
  },
  NoiseGate: {
    type: 'NoiseGate',
    label: 'Noise Gate',
    shortLabel: 'GATE',
    icon: Shield,
    color: 'dynamics',
  },
  Loudness: {
    type: 'Loudness',
    label: 'Loudness',
    shortLabel: 'LOUD',
    icon: Ear,
    color: 'dynamics',
  },
  Dither: {
    type: 'Dither',
    label: 'Dither',
    shortLabel: 'DTH',
    icon: Sparkles,
    color: 'dither',
  },
};

export const INPUT_FILTER_TYPES: FilterType[] = [
  'Biquad',
  'Delay',
  'Gain',
  'Volume',
  'DiffEq',
];

export const OUTPUT_FILTER_TYPES: FilterType[] = [
  'Biquad',
  'Delay',
  'Gain',
  'Volume',
  'DiffEq',
  'Conv',
  'Compressor',
  'NoiseGate',
  'Loudness',
  'Dither',
];

export function filterColorClasses(color: FilterUiMeta['color']): {
  active: string;
  inactive: string;
} {
  switch (color) {
    case 'eq':
      return { active: 'bg-filter-eq/20 border-filter-eq/50 text-filter-eq', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'dynamics':
      return { active: 'bg-filter-dynamics/20 border-filter-dynamics/50 text-filter-dynamics', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'fir':
      return { active: 'bg-filter-fir/20 border-filter-fir/50 text-filter-fir', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'delay':
      return { active: 'bg-filter-delay/20 border-filter-delay/50 text-filter-delay', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'gain':
      return { active: 'bg-filter-gain/20 border-filter-gain/50 text-filter-gain', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'dither':
      return { active: 'bg-filter-dither/20 border-filter-dither/50 text-filter-dither', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
    case 'inactive':
    default:
      return { active: 'bg-filter-inactive/20 border-filter-inactive/50 text-filter-inactive', inactive: 'bg-dsp-bg border-dsp-primary/30 text-dsp-text-muted' };
  }
}
