import type { ChannelNode, ChannelProcessingFilter } from '../../lib/signalflow';
import { ensureUniqueName, replaceBiquadBlock } from '../../lib/signalflow/filterUtils';
import type { EQBand } from '../eq-editor/types';

export function buildEqBands(filters: ChannelProcessingFilter[]): EQBand[] {
  return filters.flatMap((filter) =>
    filter.config.type === 'Biquad'
      ? [{ id: filter.name, enabled: true, parameters: filter.config.parameters }]
      : [],
  );
}

function makeBiquadName(node: ChannelNode, index: number, taken: Set<string>): string {
  const baseName = `sf-${node.side}-ch${String(node.channelIndex + 1)}-biquad-${String(Date.now())}-${String(index)}`;
  return ensureUniqueName(baseName, taken);
}

function normalizeEqBands(node: ChannelNode, takenNames: Set<string>, nextBands: EQBand[]): EQBand[] {
  const usedNames = new Set<string>();
  return nextBands.map((band, index) => {
    if (takenNames.has(band.id)) {
      usedNames.add(band.id);
      return band;
    }
    const nextName = makeBiquadName(node, index, new Set([...takenNames, ...usedNames]));
    usedNames.add(nextName);
    return { ...band, id: nextName };
  });
}

export function mergeEqBandsIntoFilters(
  node: ChannelNode,
  nextBands: EQBand[],
): ChannelProcessingFilter[] {
  const processingFilters = node.processing.filters;
  const takenNames = new Set(processingFilters.map((f) => f.name));
  const normalizedBands = normalizeEqBands(node, takenNames, nextBands);
  const nextBiquadFilters: ChannelProcessingFilter[] = normalizedBands.map((band) => ({
    name: band.id,
    config: { type: 'Biquad', parameters: band.parameters },
  }));
  return replaceBiquadBlock(processingFilters, nextBiquadFilters);
}
