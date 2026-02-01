import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/setup';
import userEvent from '@testing-library/user-event';
import type { CamillaConfig } from '../../types';
import type { ChannelNode } from '../../lib/signalflow';
import { emptyProcessingSummary } from '../../lib/signalflow';
import { SignalFlowFilterWindowContent } from './SignalFlowFilterWindowContent';

function createBaseConfig(overrides?: Partial<CamillaConfig>): CamillaConfig {
  return {
    devices: {
      samplerate: 48000,
      chunksize: 1024,
      capture: { type: 'Alsa', channels: 2, device: 'hw:0' },
      playback: { type: 'Alsa', channels: 2, device: 'hw:1' },
    },
    pipeline: [],
    ...overrides,
  };
}

function createOutputNode(channelIndex: number): ChannelNode {
  return {
    side: 'output',
    deviceId: 'out:hw1',
    channelIndex,
    label: `Out ${String(channelIndex + 1)}`,
    processing: { filters: [] },
    processingSummary: emptyProcessingSummary(),
  };
}

describe('SignalFlowFilterWindowContent', () => {
  it('does not throw when switching filterType from Loudness to Biquad', () => {
    const node = createOutputNode(0);
    const onChange = vi.fn();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(
      <SignalFlowFilterWindowContent
        node={node}
        camillaConfig={createBaseConfig()}
        sampleRate={48000}
        filterType="Loudness"
        onClose={() => {}}
        onChange={onChange}
      />,
    );

    expect(() => {
      rerender(
        <SignalFlowFilterWindowContent
          node={node}
          camillaConfig={createBaseConfig()}
          sampleRate={48000}
          filterType="Biquad"
          onClose={() => {}}
          onChange={onChange}
        />,
      );
    }).not.toThrow();

    const logged = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(logged).not.toMatch(/Rendered (fewer|more) hooks than expected/i);

    consoleErrorSpy.mockRestore();
  });

  it('edits an existing global Loudness filter definition (no channels field)', async () => {
    const camillaConfig = createBaseConfig({
      mixers: { routing: { channels: { in: 2, out: 2 }, mapping: [] } },
      filters: {
        globalLoudness: {
          type: 'Loudness',
          parameters: { reference_level: -30, high_boost: 6, low_boost: 8 },
        },
      },
      pipeline: [
        { type: 'Mixer', name: 'routing' },
        { type: 'Filter', names: ['globalLoudness'] }, // global output-stage step
      ],
    });

    const node = createOutputNode(0);
    const onChange = vi.fn();
    const onUpdateFilterDefinition = vi.fn();

    render(
      <SignalFlowFilterWindowContent
        node={node}
        camillaConfig={camillaConfig}
        sampleRate={48000}
        filterType="Loudness"
        onClose={() => {}}
        onChange={onChange}
        onUpdateFilterDefinition={onUpdateFilterDefinition}
      />,
    );

    expect(screen.getByText(/Ref: -30 dB/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onUpdateFilterDefinition).toHaveBeenCalledWith(
      'globalLoudness',
      expect.objectContaining({ type: 'Loudness' }),
      { debounce: true },
    );
  });

  it('edits an existing multi-channel Loudness filter definition (channels: [0, 1])', async () => {
    const camillaConfig = createBaseConfig({
      mixers: { routing: { channels: { in: 2, out: 2 }, mapping: [] } },
      filters: {
        stereoLoudness: {
          type: 'Loudness',
          parameters: { reference_level: -25, high_boost: 5, low_boost: 10 },
        },
      },
      pipeline: [
        { type: 'Mixer', name: 'routing' },
        { type: 'Filter', names: ['stereoLoudness'], channels: [0, 1] },
      ],
    });

    const node = createOutputNode(1);
    const onChange = vi.fn();
    const onUpdateFilterDefinition = vi.fn();

    render(
      <SignalFlowFilterWindowContent
        node={node}
        camillaConfig={camillaConfig}
        sampleRate={48000}
        filterType="Loudness"
        onClose={() => {}}
        onChange={onChange}
        onUpdateFilterDefinition={onUpdateFilterDefinition}
      />,
    );

    expect(screen.getByText(/Ref: -25 dB/)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(onUpdateFilterDefinition).toHaveBeenCalledWith(
      'stereoLoudness',
      expect.objectContaining({ type: 'Loudness' }),
      { debounce: true },
    );
  });
});
