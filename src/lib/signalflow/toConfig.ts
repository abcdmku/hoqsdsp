import type { CamillaConfig, MixerConfig, MixerMapping, MixerSource } from '../../types';
import type { RouteEdge, SignalFlowModel, SignalFlowWarning, ToConfigResult } from './model';

const ROUTING_MIXER_NAME = 'routing';

function isSingleChannelFilterStep(step: CamillaConfig['pipeline'][number]): boolean {
  if (step.type !== 'Filter') return false;
  if (typeof step.channel === 'number') return true;
  return Array.isArray(step.channels) && step.channels.length === 1;
}

function normalizeSingleChannel(step: CamillaConfig['pipeline'][number]): number | null {
  if (typeof step.channel === 'number') return step.channel;
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

    const sources = mappingByDest.get(outCh) ?? [];
    sources.push({
      channel: inCh,
      gain: route.gain,
      inverted: route.inverted,
      mute: route.mute,
    });
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

export function toConfig(config: CamillaConfig, model: SignalFlowModel): ToConfigResult {
  const warnings: SignalFlowWarning[] = [];

  const inputChannels = config.devices.capture.channels;
  const outputChannels = config.devices.playback.channels;
  const { inputDeviceId, outputDeviceId } = getCanonicalDeviceIds(model);

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

  const nextInputSteps: CamillaConfig['pipeline'] = [];
  for (const node of model.inputs) {
    for (const filter of node.processing.filters) {
      nextFilters[filter.name] = filter.config;
      nextInputSteps.push({ type: 'Filter', name: filter.name, channel: node.channelIndex });
    }
  }

  const nextOutputSteps: CamillaConfig['pipeline'] = [];
  for (const node of model.outputs) {
    for (const filter of node.processing.filters) {
      nextFilters[filter.name] = filter.config;
      nextOutputSteps.push({ type: 'Filter', name: filter.name, channel: node.channelIndex });
    }
  }

  const nextPipeline: CamillaConfig['pipeline'] = [
    ...keptInputRegion,
    ...nextInputSteps,
    pipeline[routingIndex]!,
    ...keptOutputRegion,
    ...nextOutputSteps,
  ];

  // Drop filter definitions that are no longer referenced by any pipeline step.
  const usedFilters = new Set(
    nextPipeline.filter((step) => step.type === 'Filter').map((step) => step.name),
  );
  for (const filterName of Object.keys(nextFilters)) {
    if (!usedFilters.has(filterName)) {
      delete nextFilters[filterName];
    }
  }

  const nextConfig: CamillaConfig = {
    ...config,
    mixers: baseMixers,
    filters: Object.keys(nextFilters).length > 0 ? nextFilters : undefined,
    pipeline: nextPipeline,
  };

  const representable = hadRoutingStep && !otherMixers;

  // Surface a warning if we stripped any single-channel filter steps that we couldn't map.
  const strippedSteps = [...inputRegion, ...outputRegion].filter((step) => {
    if (!isSingleChannelFilterStep(step)) return false;
    const channel = normalizeSingleChannel(step);
    if (channel === null) return false;
    const stageNodes = inputRegion.includes(step) ? model.inputs : model.outputs;
    return !stageNodes.some(
      (node) => node.channelIndex === channel && node.processing.filters.some((f) => f.name === step.name),
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
