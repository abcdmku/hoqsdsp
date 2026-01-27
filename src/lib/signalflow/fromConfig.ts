import type { CamillaConfig, PipelineStep, SignalFlowUiMetadata } from '../../types';
import {
  emptyChannelProcessing,
  emptyProcessingSummary,
  type ChannelNode,
  type FromConfigResult,
  type ProcessingSummary,
  type RouteEdge,
  type SignalFlowWarning,
} from './model';

const ROUTING_MIXER_NAME = 'routing';

function stableDeviceId(prefix: string, label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.]/g, '');
  return `${prefix}:${normalized || 'default'}`;
}

function deviceLabelFromConfig(side: 'input' | 'output', config: CamillaConfig): string {
  if (side === 'input') {
    return config.devices.capture.device ?? config.devices.capture.type ?? 'Capture';
  }
  return config.devices.playback.device ?? config.devices.playback.type ?? 'Playback';
}

function isMixerStep(step: PipelineStep): boolean {
  return step.type === 'Mixer';
}

function getStepChannels(step: PipelineStep): number[] | null {
  if (typeof step.channel === 'number') return [step.channel];
  if (Array.isArray(step.channels) && step.channels.length > 0) return step.channels;
  return null;
}

function applyFilterToSummary(summary: ProcessingSummary, filterType: string): void {
  switch (filterType) {
    case 'Biquad':
      summary.biquadCount += 1;
      break;
    case 'Delay':
      summary.hasDelay = true;
      break;
    case 'Gain':
      summary.hasGain = true;
      break;
    case 'Conv':
      summary.hasConv = true;
      break;
    case 'Compressor':
      summary.hasCompressor = true;
      break;
    case 'Dither':
      summary.hasDither = true;
      break;
    case 'NoiseGate':
      summary.hasNoiseGate = true;
      break;
    case 'Loudness':
      summary.hasLoudness = true;
      break;
    default:
      break;
  }
}

function channelLabel(side: 'input' | 'output', channelIndex: number): string {
  return side === 'input' ? `In ${channelIndex + 1}` : `Out ${channelIndex + 1}`;
}

function portKey(side: 'input' | 'output', deviceId: string, channelIndex: number): string {
  return `${side}:${deviceId}:${channelIndex}`;
}

export function fromConfig(config: CamillaConfig): FromConfigResult {
  const warnings: SignalFlowWarning[] = [];

  const inputLabel = deviceLabelFromConfig('input', config);
  const outputLabel = deviceLabelFromConfig('output', config);
  const inputDeviceId = stableDeviceId('in', inputLabel);
  const outputDeviceId = stableDeviceId('out', outputLabel);

  const inputGroups = [{ id: inputDeviceId, label: inputLabel }];
  const outputGroups = [{ id: outputDeviceId, label: outputLabel }];

  const inputChannels = config.devices.capture.channels;
  const outputChannels = config.devices.playback.channels;

  // Read UI metadata from config
  const uiMetadata: SignalFlowUiMetadata | undefined = config.ui?.signalFlow;
  const channelNames = uiMetadata?.channelNames ?? {};

  const inputs: ChannelNode[] = Array.from({ length: inputChannels }, (_, idx) => {
    const key = portKey('input', inputDeviceId, idx);
    const customName = channelNames[key];
    return {
      side: 'input' as const,
      deviceId: inputDeviceId,
      channelIndex: idx,
      label: customName ?? channelLabel('input', idx),
      processing: emptyChannelProcessing(),
      processingSummary: emptyProcessingSummary(),
    };
  });

  const outputs: ChannelNode[] = Array.from({ length: outputChannels }, (_, idx) => {
    const key = portKey('output', outputDeviceId, idx);
    const customName = channelNames[key];
    return {
      side: 'output' as const,
      deviceId: outputDeviceId,
      channelIndex: idx,
      label: customName ?? channelLabel('output', idx),
      processing: emptyChannelProcessing(),
      processingSummary: emptyProcessingSummary(),
    };
  });

  const routingMixerStepIndex = config.pipeline.findIndex(
    (step) => step.type === 'Mixer' && step.name === ROUTING_MIXER_NAME,
  );

  const mixerSteps = config.pipeline.filter(isMixerStep);
  const hasOtherMixers = mixerSteps.some((s) => s.name !== ROUTING_MIXER_NAME);
  if (hasOtherMixers) {
    warnings.push({
      code: 'non_canonical_mixers',
      message: 'Signal Flow currently only supports a single canonical routing mixer.',
      path: 'pipeline',
    });
  }

  const representable = routingMixerStepIndex >= 0 && !hasOtherMixers;
  if (routingMixerStepIndex < 0) {
    warnings.push({
      code: 'missing_routing_mixer_step',
      message: 'No routing mixer step found in pipeline; routes may be incomplete.',
      path: 'pipeline',
    });
  }

  const routingMixerConfig = config.mixers?.[ROUTING_MIXER_NAME];
  if (!routingMixerConfig) {
    warnings.push({
      code: 'missing_routing_mixer_config',
      message: 'No routing mixer config found; routes will be empty until created.',
      path: `mixers.${ROUTING_MIXER_NAME}`,
    });
  }

  // Determine channel gains - either from UI metadata or extracted from mixer sources (legacy)
  const channelGainsRaw = uiMetadata?.channelGains;
  const inputChannelGains = new Map<number, { gain: number; inverted: boolean }>();
  const outputChannelGains = new Map<number, { gain: number; inverted: boolean }>();

  if (channelGainsRaw) {
    // Restore channel gains from UI metadata
    for (const [key, { gain, inverted }] of Object.entries(channelGainsRaw)) {
      const [side, indexStr] = key.split(':');
      const channelIndex = Number(indexStr);
      if (!Number.isFinite(channelIndex)) continue;

      if (side === 'input') {
        inputChannelGains.set(channelIndex, { gain, inverted });
      } else if (side === 'output') {
        outputChannelGains.set(channelIndex, { gain, inverted });
      }
    }
  } else if (routingMixerConfig) {
    // Legacy config: Extract channel gains from mixer sources
    // For each input channel, use the first route's gain as the channel gain
    // This ensures existing gains show up in the UI and don't get added to new user inputs
    for (const mapping of routingMixerConfig.mapping) {
      for (const source of mapping.sources) {
        if (source.channel < 0 || source.channel >= inputChannels) continue;
        if (!inputChannelGains.has(source.channel)) {
          // Use the first encountered gain for this input channel as the channel gain
          if (source.gain !== 0 || source.inverted) {
            inputChannelGains.set(source.channel, {
              gain: source.gain,
              inverted: source.inverted ?? false,
            });
          }
        }
      }
    }
    // Note: For legacy configs, we put all gain on the input channel side
    // Output channel gains remain 0 (user can adjust via route gains if needed)
  }

  // Create Gain filters for channels with non-zero gains
  for (const [channelIndex, { gain, inverted }] of inputChannelGains) {
    const node = inputs[channelIndex];
    if (!node) continue;
    if (gain !== 0 || inverted) {
      node.processing.filters.push({
        name: `sf-input-ch${channelIndex + 1}-gain-restored`,
        config: {
          type: 'Gain',
          parameters: { gain, scale: 'dB', inverted },
        },
      });
      node.processingSummary.hasGain = true;
    }
  }

  for (const [channelIndex, { gain, inverted }] of outputChannelGains) {
    const node = outputs[channelIndex];
    if (!node) continue;
    if (gain !== 0 || inverted) {
      node.processing.filters.push({
        name: `sf-output-ch${channelIndex + 1}-gain-restored`,
        config: {
          type: 'Gain',
          parameters: { gain, scale: 'dB', inverted },
        },
      });
      node.processingSummary.hasGain = true;
    }
  }

  // Build routes, subtracting channel gains from mixer source gains
  const routes: RouteEdge[] = [];
  if (routingMixerConfig) {
    for (let mappingIndex = 0; mappingIndex < routingMixerConfig.mapping.length; mappingIndex++) {
      const mapping = routingMixerConfig.mapping[mappingIndex]!;
      const dest = mapping.dest;
      for (let sourceIndex = 0; sourceIndex < mapping.sources.length; sourceIndex++) {
        const source = mapping.sources[sourceIndex]!;
        if (source.channel < 0 || source.channel >= inputChannels || dest < 0 || dest >= outputChannels) {
          warnings.push({
            code: 'route_out_of_range',
            message: `Route ${source.channel} -> ${dest} is outside current channel counts.`,
            path: `mixers.${ROUTING_MIXER_NAME}.mapping[${mappingIndex}].sources[${sourceIndex}]`,
          });
          continue;
        }

        // Subtract channel gains from mixer source gain to get the route-specific gain
        // (toConfig combines route.gain + inputChannelGain + outputChannelGain into mixer source)
        const inputGain = inputChannelGains.get(source.channel);
        const outputGain = outputChannelGains.get(dest);
        const routeGain = source.gain - (inputGain?.gain ?? 0) - (outputGain?.gain ?? 0);

        // Compute the route-specific inversion by XORing out the channel inversions
        // (toConfig XORs route.inverted ^ inputInverted ^ outputInverted)
        const sourceInverted = source.inverted ?? false;
        const routeInverted = (sourceInverted !== (inputGain?.inverted ?? false)) !== (outputGain?.inverted ?? false);

        routes.push({
          from: { deviceId: inputDeviceId, channelIndex: source.channel },
          to: { deviceId: outputDeviceId, channelIndex: dest },
          gain: routeGain,
          inverted: routeInverted,
          mute: source.mute ?? false,
        });
      }
    }
  }

  // Derive per-channel processing summaries.
  if (routingMixerStepIndex >= 0) {
    for (let i = 0; i < config.pipeline.length; i++) {
      const step = config.pipeline[i]!;
      if (step.type !== 'Filter') continue;

      const filter = config.filters?.[step.name];
      if (!filter) {
        warnings.push({
          code: 'unresolved_filter',
          message: `Filter "${step.name}" is referenced in pipeline but not defined.`,
          path: `pipeline[${i}]`,
        });
        continue;
      }

      const stage = i < routingMixerStepIndex ? 'input' : i > routingMixerStepIndex ? 'output' : null;
      if (!stage) continue;

      const explicitChannels = getStepChannels(step);
      const stageChannelCount = stage === 'input' ? inputChannels : outputChannels;
      const targetChannels = explicitChannels ?? Array.from({ length: stageChannelCount }, (_, idx) => idx);

      const isExplicitSingleChannel =
        typeof step.channel === 'number' ||
        (Array.isArray(step.channels) && step.channels.length === 1);

      if (!explicitChannels) {
        warnings.push({
          code: 'global_filter_step',
          message: `Filter step "${step.name}" applies to all ${stage} channels.`,
          path: `pipeline[${i}]`,
        });
      }

      for (const ch of targetChannels) {
        if (ch < 0 || ch >= stageChannelCount) {
          warnings.push({
            code: 'filter_out_of_range',
            message: `Filter step "${step.name}" targets channel ${ch} outside range.`,
            path: `pipeline[${i}]`,
          });
          continue;
        }

        const summary = stage === 'input' ? inputs[ch]!.processingSummary : outputs[ch]!.processingSummary;
        applyFilterToSummary(summary, filter.type);

        if (isExplicitSingleChannel && explicitChannels) {
          const node = stage === 'input' ? inputs[ch]! : outputs[ch]!;
          node.processing.filters.push({ name: step.name, config: filter });
        }
      }
    }
  }

  return {
    model: {
      inputGroups,
      outputGroups,
      inputs,
      outputs,
      routes,
    },
    warnings,
    representable,
    uiMetadata,
  };
}
