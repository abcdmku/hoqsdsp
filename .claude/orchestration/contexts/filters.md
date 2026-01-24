# Agent Context: Filter Configuration Handlers

## Your Role
You are implementing filter configuration handlers for all CamillaDSP filter types. Each handler converts between TypeScript objects and CamillaDSP YAML format.

## Filter Types Overview

CamillaDSP supports these filter types:
1. **Biquad** - IIR filters (Highpass, Lowpass, Peaking, Notch, Bandpass, Allpass, Highshelf, Lowshelf, etc.)
2. **Conv** - Convolution/FIR filters
3. **Delay** - Time delay
4. **Gain** - Amplitude adjustment
5. **Volume** - Volume control linked to faders
6. **Dither** - Noise-shaped dither
7. **DiffEq** - Generic difference equation
8. **Compressor** - Dynamic range compressor
9. **Loudness** - Loudness compensation
10. **NoiseGate** - Noise gate

## Common Handler Interface

Each filter handler should implement:

```typescript
// src/lib/dsp/filters/types.ts
export interface FilterHandler<T extends FilterConfig> {
  // Parse from YAML object to typed config
  parse(yaml: unknown): T;

  // Serialize to YAML-compatible object
  serialize(config: T): Record<string, unknown>;

  // Validate configuration
  validate(config: T): ValidationResult;

  // Get default configuration
  getDefault(): T;

  // Get display name for condensed view
  getDisplayName(config: T): string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}
```

## Task 3.2.1: Biquad Filter Handler

Create `src/lib/dsp/filters/biquad.ts`:

```typescript
import { z } from 'zod';
import type { BiquadFilter, BiquadType, BiquadParameters } from '@/types/filters.types';

// Zod schema for validation
const biquadSchema = z.object({
  type: z.literal('Biquad'),
  parameters: z.discriminatedUnion('type', [
    // Standard filters with freq and optional q/gain
    z.object({
      type: z.enum(['Highpass', 'Lowpass', 'HighpassFO', 'LowpassFO']),
      freq: z.number().min(1).max(24000),
      q: z.number().min(0.1).max(100).optional(),
    }),
    z.object({
      type: z.enum(['Peaking', 'Highshelf', 'Lowshelf']),
      freq: z.number().min(1).max(24000),
      gain: z.number().min(-40).max(40),
      q: z.number().min(0.1).max(100).optional(),
      slope: z.number().optional(),
    }),
    z.object({
      type: z.enum(['Notch', 'Bandpass', 'Allpass']),
      freq: z.number().min(1).max(24000),
      q: z.number().min(0.1).max(100),
    }),
    z.object({
      type: z.enum(['LinkwitzRileyHighpass', 'LinkwitzRileyLowpass', 'ButterworthHighpass', 'ButterworthLowpass']),
      freq: z.number().min(1).max(24000),
      order: z.number().min(1).max(8),
    }),
    z.object({
      type: z.literal('Free'),
      a1: z.number(),
      a2: z.number(),
      b0: z.number(),
      b1: z.number(),
      b2: z.number(),
    }),
  ]),
});

export const biquadHandler: FilterHandler<BiquadFilter> = {
  parse(yaml: unknown): BiquadFilter {
    return biquadSchema.parse(yaml);
  },

  serialize(config: BiquadFilter): Record<string, unknown> {
    return {
      type: 'Biquad',
      parameters: config.parameters,
    };
  },

  validate(config: BiquadFilter): ValidationResult {
    const result = biquadSchema.safeParse(config);
    if (result.success) {
      return { valid: true, errors: [] };
    }
    return {
      valid: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  },

  getDefault(): BiquadFilter {
    return {
      type: 'Biquad',
      parameters: {
        type: 'Peaking',
        freq: 1000,
        gain: 0,
        q: 1.0,
      },
    };
  },

  getDisplayName(config: BiquadFilter): string {
    const { type, freq, gain, q } = config.parameters;
    if (gain !== undefined) {
      return `${type} ${freq}Hz ${gain > 0 ? '+' : ''}${gain}dB`;
    }
    if (q !== undefined) {
      return `${type} ${freq}Hz Q=${q}`;
    }
    return `${type} ${freq}Hz`;
  },
};
```

## Task 3.2.2: Convolution Filter Handler

Create `src/lib/dsp/filters/convolution.ts`:

```typescript
export interface ConvolutionFilter {
  type: 'Conv';
  parameters: {
    type: 'Raw' | 'Wav' | 'Values';
    filename?: string;
    values?: number[];
    format?: 'TEXT' | 'FLOAT32LE' | 'FLOAT64LE' | 'S16LE' | 'S24LE' | 'S24LE3' | 'S32LE';
    skip_bytes_lines?: number;
    read_bytes_lines?: number;
    channel?: number;
  };
}

export const convolutionHandler: FilterHandler<ConvolutionFilter> = {
  // Implementation similar to biquad
  getDisplayName(config: ConvolutionFilter): string {
    if (config.parameters.filename) {
      const filename = config.parameters.filename.split('/').pop() || 'file';
      return `Conv: ${filename}`;
    }
    if (config.parameters.values) {
      return `Conv: ${config.parameters.values.length} taps`;
    }
    return 'Convolution';
  },
};
```

## Task 3.2.3-3.2.11: Other Filter Handlers

Follow the same pattern for:
- **Delay**: Handle ms, samples, mm units with subsample precision
- **Gain**: Handle dB/linear scale and inversion
- **Volume**: Handle fader linking
- **Dither**: Handle all dither types
- **DiffEq**: Handle coefficient arrays
- **Compressor**: Handle threshold, ratio, attack, release
- **Loudness**: Handle reference level
- **NoiseGate**: Handle threshold and timing

## YAML Format Reference

### Biquad Example
```yaml
filters:
  lowpass:
    type: Biquad
    parameters:
      type: Lowpass
      freq: 2000
      q: 0.707
```

### Convolution Example
```yaml
filters:
  roomcorrection:
    type: Conv
    parameters:
      type: Wav
      filename: /path/to/impulse.wav
      channel: 0
```

### Delay Example
```yaml
filters:
  delay_left:
    type: Delay
    parameters:
      delay: 2.5
      unit: ms
      subsample: true
```

## Quality Requirements
- Full Zod schema validation
- Type-safe parsing and serialization
- Helpful error messages
- 100% test coverage for parsing edge cases
