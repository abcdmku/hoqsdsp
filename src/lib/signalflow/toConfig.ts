import type { CamillaConfig, MixerConfig, MixerMapping, MixerSource, SignalFlowUiMetadata } from '../../types';
import type { RouteEdge, SignalFlowModel, SignalFlowWarning, ToConfigResult } from './model';
import { upsertDeqSettingsInStepDescription } from './deqStepMetadata';

const ROUTING_MIXER_NAME = 'routing';

function isSingleChannelFilterStep(step: CamillaConfig['pipeline'][number]): boolean {
  if (step.type !== 'Filter') return false;
  // CamillaDSP Filter steps use 'channels' (plural array)
  return Array.isArray(step.channels) && step.channels.length === 1;
}

function normalizeSingleChannel(step: CamillaConfig['pipeline'][number]): number | null {
  if (step.type !== 'Filter') return null;
  if (Array.isArray(step.channels) && step.channels.length === 1) return step.channels[0] ?? null;
  return null;
}

function buildRoutingMixer(
  routes: RouteEdge[],
  inputDeviceId: string,
  outputDeviceId: string,
  inputChannels: number,
  outputChannels: number,
  warnings: SignalFlowWarning[],
): MixerConfig {
  const mappingByDest = new Map<number, MixerSource[]>();

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]!;

    if (route.from.deviceId !== inputDeviceId || route.to.deviceId !== outputDeviceId) {
      warnings.push({
        code: 'route_wrong_device',
        message: 'Route references a non-active device group; it will be ignored.',
        path: `routes[${i}]`,
      });
      continue;
    }

    const inCh = route.from.channelIndex;
    const outCh = route.to.channelIndex;
    if (inCh < 0 || inCh >= inputChannels || outCh < 0 || outCh >= outputChannels) {
      warnings.push({
        code: 'route_out_of_range',
        message: `Route ${inCh} -> ${outCh} is outside current channel counts; it will be ignored.`,
        path: `routes[${i}]`,
      });
      continue;
    }

    // Route gain ONLY - input/output channel gains are handled by separate Gain filters in the pipeline
    // Only include optional fields if they differ from defaults
    const sources = mappingByDest.get(outCh) ?? [];
    const mixerSource: MixerSource = {
      channel: inCh,
      gain: route.gain,
      ...(route.inverted ? { inverted: true } : {}),
      ...(route.mute ? { mute: true } : {}),
    };
    sources.push(mixerSource);
    mappingByDest.set(outCh, sources);
  }

  const mapping: MixerMapping[] = [...mappingByDest.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dest, sources]) => ({ dest, sources }));

  return {
    channels: { in: inputChannels, out: outputChannels },
    mapping,
  };
}

function getCanonicalDeviceIds(model: SignalFlowModel): { inputDeviceId: string; outputDeviceId: string } {
  const inputDeviceId = model.inputGroups[0]?.id ?? 'in:default';
  const outputDeviceId = model.outputGroups[0]?.id ?? 'out:default';
  return { inputDeviceId, outputDeviceId };
}

export function toConfig(
  config: CamillaConfig,
  model: SignalFlowModel,
  uiMetadata?: SignalFlowUiMetadata,
): ToConfigResult {
  const warnings: SignalFlowWarning[] = [];

  const existingStepDescriptions = new Map<string, string>();
  for (const step of config.pipeline) {
    if (step.type !== 'Filter') continue;
    if (!step.description) continue;
    if (step.names.length !== 1) continue;
    const name = step.names[0];
    if (!name) continue;
    existingStepDescriptions.set(name, step.description);
  }

  // Debug logging for filter issues
  const inputChannels = config.devices.capture.channels;
  const outputChannels = config.devices.playback.channels;
  const { inputDeviceId, outputDeviceId } = getCanonicalDeviceIds(model);

  // Build routing mixer with route gains ONLY
  // Input/output channel gains are handled by separate Gain filters in the pipeline
  const routingMixer = buildRoutingMixer(
    model.routes,
    inputDeviceId,
    outputDeviceId,
    inputChannels,
    outputChannels,
    warnings,
  );

  const baseMixers = {
    ...(config.mixers ?? {}),
    [ROUTING_MIXER_NAME]: routingMixer,
  };

  const pipeline = [...config.pipeline];
  const hadRoutingStep = pipeline.some(
    (step) => step.type === 'Mixer' && step.name === ROUTING_MIXER_NAME,
  );

  let routingIndex = pipeline.findIndex(
    (step) => step.type === 'Mixer' && step.name === ROUTING_MIXER_NAME,
  );
  if (routingIndex < 0) {
    warnings.push({
      code: 'missing_routing_mixer_step',
      message: 'Routing mixer is not present in pipeline; Signal Flow added one at the end.',
      path: 'pipeline',
    });
    pipeline.push({ type: 'Mixer', name: ROUTING_MIXER_NAME });
    routingIndex = pipeline.length - 1;
  }

  const otherMixers = pipeline.some((step) => step.type === 'Mixer' && step.name !== ROUTING_MIXER_NAME);
  if (otherMixers) {
    warnings.push({
      code: 'non_canonical_mixers',
      message: 'Config contains additional mixers; Signal Flow may not fully represent its behavior.',
      path: 'pipeline',
    });
  }

  const inputRegion = pipeline.slice(0, routingIndex);
  const outputRegion = pipeline.slice(routingIndex + 1);

  const keptInputRegion = inputRegion.filter((step) => !(step.type === 'Filter' && isSingleChannelFilterStep(step)));
  const keptOutputRegion = outputRegion.filter((step) => !(step.type === 'Filter' && isSingleChannelFilterStep(step)));

  const nextFilters: NonNullable<CamillaConfig['filters']> = { ...(config.filters ?? {}) };

  // Add all channel filters to the pipeline, including Gain filters
  // Input channel filters (including Gain) run BEFORE the mixer
  // Output channel filters (including Gain) run AFTER the mixer
  // CamillaDSP expects: { type: 'Filter', names: ['filterName'], channels: [0] }
  const nextInputSteps: CamillaConfig['pipeline'] = [];
  for (const node of model.inputs) {
    for (const filter of node.processing.filters) {
      nextFilters[filter.name] = filter.config;

      const priorDescription = existingStepDescriptions.get(filter.name);
      const deqSettings = filter.config.type === 'DiffEq'
        ? (uiMetadata?.deq?.[filter.name] ?? null)
        : null;

      const description = deqSettings
        ? upsertDeqSettingsInStepDescription(priorDescription, deqSettings)
        : priorDescription;

      nextInputSteps.push({
        type: 'Filter',
        names: [filter.name],
        channels: [node.channelIndex],
        ...(description ? { description } : {}),
      });
    }
  }

  const nextOutputSteps: CamillaConfig['pipeline'] = [];
  for (const node of model.outputs) {
    for (const filter of node.processing.filters) {
      nextFilters[filter.name] = filter.config;

      const priorDescription = existingStepDescriptions.get(filter.name);
      const deqSettings = filter.config.type === 'DiffEq'
        ? (uiMetadata?.deq?.[filter.name] ?? null)
        : null;

      const description = deqSettings
        ? upsertDeqSettingsInStepDescription(priorDescription, deqSettings)
        : priorDescription;

      nextOutputSteps.push({
        type: 'Filter',
        names: [filter.name],
        channels: [node.channelIndex],
        ...(description ? { description } : {}),
      });
    }
  }

  const nextPipeline: CamillaConfig['pipeline'] = [
    ...keptInputRegion,
    ...nextInputSteps,
    pipeline[routingIndex]!,
    ...keptOutputRegion,
    ...nextOutputSteps,
  ];

  // Debug logging for pipeline
  // Drop filter definitions that are no longer referenced by any pipeline step.
  const usedFilters = new Set(
    nextPipeline
      .filter((step): step is { type: 'Filter'; names: string[]; channels: number[] } => step.type === 'Filter')
      .flatMap((step) => step.names),
  );
  for (const filterName of Object.keys(nextFilters)) {
    if (!usedFilters.has(filterName)) {
      delete nextFilters[filterName];
    }
  }

  // Merge UI metadata (channel gains are now stored as actual Gain filters in the pipeline)
  const baseMetadata = config.ui?.signalFlow ?? {};
  const mergedSignalFlowMetadata: SignalFlowUiMetadata = {
    ...baseMetadata,
    ...(uiMetadata ?? {}),
  };
  // Remove channelGains if it exists - no longer needed since gains are in pipeline filters
  delete mergedSignalFlowMetadata.channelGains;

  const nextConfig: CamillaConfig = {
    ...config,
    mixers: baseMixers,
    filters: Object.keys(nextFilters).length > 0 ? nextFilters : undefined,
    pipeline: nextPipeline,
    ui: { ...config.ui, signalFlow: mergedSignalFlowMetadata },
  };

  const representable = hadRoutingStep && !otherMixers;

  // Surface a warning if we stripped any single-channel filter steps that we couldn't map.
  const strippedSteps = [...inputRegion, ...outputRegion].filter((step) => {
    if (!isSingleChannelFilterStep(step)) return false;
    if (step.type !== 'Filter') return false;
    const channel = normalizeSingleChannel(step);
    if (channel === null) return false;
    const stageNodes = inputRegion.includes(step) ? model.inputs : model.outputs;
    const filterNames = step.names;
    return !stageNodes.some(
      (node) => node.channelIndex === channel && node.processing.filters.some((f) => filterNames.includes(f.name)),
    );
  });
  if (strippedSteps.length > 0) {
    warnings.push({
      code: 'unresolved_filter',
      message: 'Some single-channel filter steps were not mapped into Signal Flow and were removed.',
      path: 'pipeline',
    });
  }

  return { config: nextConfig, warnings, representable };
}
