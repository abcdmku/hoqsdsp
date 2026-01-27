import { describe, it, expect } from 'vitest';
import {
  parseYamlConfig,
  parseJsonConfig,
  parseConfigAuto,
  stringifyConfig,
  stringifyConfigJson,
  detectFormat,
} from './yaml';
import type { CamillaConfig } from '../../types';

// Helper to create a minimal valid config
function createValidConfig(
  overrides?: Partial<CamillaConfig>,
): CamillaConfig {
  return {
    devices: {
      samplerate: 48000,
      chunksize: 1024,
      capture: {
        type: 'Alsa',
        channels: 2,
        device: 'hw:0',
      },
      playback: {
        type: 'Alsa',
        channels: 2,
        device: 'hw:1',
      },
    },
    pipeline: [],
    ...overrides,
  };
}

describe('detectFormat', () => {
  it('detects JSON format', () => {
    expect(detectFormat('{"devices": {}}')).toBe('json');
    expect(detectFormat('  { "devices": {} }')).toBe('json');
    expect(detectFormat('[1, 2, 3]')).toBe('json');
  });

  it('detects YAML format', () => {
    expect(detectFormat('devices:\n  samplerate: 48000')).toBe('yaml');
    expect(detectFormat('---\ndevices:\n  samplerate: 48000')).toBe('yaml');
    expect(detectFormat('key: value')).toBe('yaml');
  });

  it('returns unknown for ambiguous content', () => {
    expect(detectFormat('')).toBe('unknown');
    expect(detectFormat('   ')).toBe('unknown');
    expect(detectFormat('just some text')).toBe('unknown');
  });
});

describe('parseYamlConfig', () => {
  it('parses valid YAML configuration', () => {
    const yaml = `
devices:
  samplerate: 48000
  chunksize: 1024
  capture:
    type: Alsa
    channels: 2
    device: hw:0
  playback:
    type: Alsa
    channels: 2
    device: hw:1
pipeline: []
`;
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.devices.samplerate).toBe(48000);
  });

  it('returns error for invalid YAML syntax', () => {
    const yaml = `
devices:
  samplerate: 48000
  - invalid yaml structure
`;
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(false);
    expect(result.yamlError).toBeDefined();
  });

  it('returns validation errors for invalid config structure', () => {
    const yaml = `
devices:
  samplerate: 100
  chunksize: 1024
  capture:
    type: Alsa
    channels: 0
  playback:
    type: Alsa
    channels: 2
pipeline: []
`;
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(false);
    expect(result.validation?.errors.length).toBeGreaterThan(0);
  });

  it('returns error for non-config-like objects', () => {
    const yaml = 'just: some data';
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(false);
    expect(result.yamlError).toContain('missing required fields');
  });

  it('parses configuration with filters and mixers', () => {
    const yaml = `
devices:
  samplerate: 48000
  chunksize: 1024
  capture:
    type: Alsa
    channels: 2
  playback:
    type: Alsa
    channels: 2
filters:
  eq:
    type: Biquad
    parameters:
      type: Peaking
      freq: 1000
      gain: 3
      q: 1.5
mixers:
  main:
    channels:
      in: 2
      out: 2
    mapping:
      - dest: 0
        sources:
          - channel: 0
            gain: 0
      - dest: 1
        sources:
          - channel: 1
            gain: 0
pipeline:
  - type: Filter
    names: [eq]
    channels: [0, 1]
  - type: Mixer
    name: main
`;
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(true);
    expect(result.config?.filters?.eq).toBeDefined();
    expect(result.config?.mixers?.main).toBeDefined();
    expect(result.config?.pipeline).toHaveLength(2);
  });
});

describe('parseJsonConfig', () => {
  it('parses valid JSON configuration', () => {
    const config = createValidConfig();
    const json = JSON.stringify(config);
    const result = parseJsonConfig(json);
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.config?.devices.samplerate).toBe(48000);
  });

  it('returns error for invalid JSON syntax', () => {
    const result = parseJsonConfig('{ invalid json }');
    expect(result.success).toBe(false);
    expect(result.yamlError).toBeDefined();
  });

  it('returns validation errors for invalid config', () => {
    const config = {
      devices: {
        samplerate: 100, // Too low
        chunksize: 1024,
        capture: { type: 'Alsa', channels: 2 },
        playback: { type: 'Alsa', channels: 2 },
      },
      pipeline: [],
    };
    const result = parseJsonConfig(JSON.stringify(config));
    expect(result.success).toBe(false);
    expect(result.validation?.errors.length).toBeGreaterThan(0);
  });

  it('returns error for non-config-like objects', () => {
    const result = parseJsonConfig('{"key": "value"}');
    expect(result.success).toBe(false);
    expect(result.yamlError).toContain('missing required fields');
  });
});

describe('parseConfigAuto', () => {
  it('auto-detects and parses JSON', () => {
    const config = createValidConfig();
    const json = JSON.stringify(config);
    const result = parseConfigAuto(json);
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  it('auto-detects and parses YAML', () => {
    const yaml = `
devices:
  samplerate: 48000
  chunksize: 1024
  capture:
    type: Alsa
    channels: 2
  playback:
    type: Alsa
    channels: 2
pipeline: []
`;
    const result = parseConfigAuto(yaml);
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
  });

  it('defaults to YAML for unknown format', () => {
    // Empty string defaults to YAML parser
    const result = parseConfigAuto('');
    expect(result.success).toBe(false);
  });
});

describe('stringifyConfig', () => {
  it('converts config to YAML string', () => {
    const config = createValidConfig({ title: 'Test Config' });
    const yaml = stringifyConfig(config);
    expect(yaml).toContain('samplerate: 48000');
    expect(yaml).toContain('title:');
    expect(yaml).toContain('Test Config');
  });

  it('produces valid YAML that can be parsed back', () => {
    const config = createValidConfig({
      title: 'Roundtrip Test',
      filters: {
        eq: { type: 'Gain', parameters: { gain: -6 } },
      },
    });
    const yaml = stringifyConfig(config);
    const result = parseYamlConfig(yaml);
    expect(result.success).toBe(true);
    expect(result.config?.title).toBe('Roundtrip Test');
    expect(result.config?.filters?.eq).toBeDefined();
  });

  it('respects indent option', () => {
    const config = createValidConfig();
    const yaml2 = stringifyConfig(config, { indent: 2 });
    const yaml4 = stringifyConfig(config, { indent: 4 });
    expect(yaml4.length).toBeGreaterThan(yaml2.length);
  });
});

describe('stringifyConfigJson', () => {
  it('converts config to JSON string', () => {
    const config = createValidConfig({ title: 'Test Config' });
    const json = stringifyConfigJson(config);
    expect(json).toContain('"samplerate": 48000');
    expect(json).toContain('"title": "Test Config"');
  });

  it('produces valid JSON that can be parsed back', () => {
    const config = createValidConfig({
      title: 'Roundtrip Test',
      description: 'Testing JSON roundtrip',
    });
    const json = stringifyConfigJson(config);
    const result = parseJsonConfig(json);
    expect(result.success).toBe(true);
    expect(result.config?.title).toBe('Roundtrip Test');
    expect(result.config?.description).toBe('Testing JSON roundtrip');
  });

  it('respects pretty option', () => {
    const config = createValidConfig();
    const pretty = stringifyConfigJson(config, true);
    const minified = stringifyConfigJson(config, false);
    expect(pretty.length).toBeGreaterThan(minified.length);
    expect(minified).not.toContain('\n');
  });
});

describe('roundtrip conversions', () => {
  it('YAML to JSON and back', () => {
    const yaml = `
devices:
  samplerate: 96000
  chunksize: 2048
  capture:
    type: Alsa
    channels: 4
    device: hw:0
  playback:
    type: Alsa
    channels: 4
    device: hw:1
filters:
  delay:
    type: Delay
    parameters:
      delay: 10
      unit: ms
      subsample: true
pipeline:
  - type: Filter
    names: [delay]
    channels: [0]
title: Roundtrip Test
`;
    const yamlResult = parseYamlConfig(yaml);
    expect(yamlResult.success).toBe(true);

    const json = stringifyConfigJson(yamlResult.config!);
    const jsonResult = parseJsonConfig(json);
    expect(jsonResult.success).toBe(true);

    expect(jsonResult.config?.devices.samplerate).toBe(96000);
    expect(jsonResult.config?.title).toBe('Roundtrip Test');
    expect(jsonResult.config?.filters?.delay).toBeDefined();
  });

  it('JSON to YAML and back', () => {
    const config = createValidConfig({
      title: 'JSON Origin',
      description: 'Started as JSON',
      filters: {
        gain: {
          type: 'Gain',
          parameters: { gain: -10, inverted: true, scale: 'dB' },
        },
      },
      pipeline: [{ type: 'Filter', names: ['gain'], channels: [0, 1] }],
    });

    const json = JSON.stringify(config);
    const jsonResult = parseJsonConfig(json);
    expect(jsonResult.success).toBe(true);

    const yaml = stringifyConfig(jsonResult.config!);
    const yamlResult = parseYamlConfig(yaml);
    expect(yamlResult.success).toBe(true);

    expect(yamlResult.config?.title).toBe('JSON Origin');
    expect(yamlResult.config?.filters?.gain).toBeDefined();
  });
});
