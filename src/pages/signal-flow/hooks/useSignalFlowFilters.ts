import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { processingSummaryFromFilters } from '../../../lib/signalflow';
import { sameEndpoint } from '../../../lib/signalflow/endpointUtils';
import { endpointKey, ensureUniqueName } from '../utils';
import type { SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';

interface FiltersParams {
  inputs: ChannelNode[];
  outputs: ChannelNode[];
  mirrorGroups: SignalFlowMirrorGroups;
  commitModel: (next: { inputs?: ChannelNode[]; outputs?: ChannelNode[] }, options?: { debounce?: boolean }) => void;
  setInputs: Dispatch<SetStateAction<ChannelNode[]>>;
  setOutputs: Dispatch<SetStateAction<ChannelNode[]>>;
}

function getMirrorTargets(
  mirrorGroups: SignalFlowMirrorGroups,
  side: ChannelSide,
  endpoint: RouteEndpoint,
) {
  const groups = mirrorGroups[side] ?? [];
  const mirroredGroup = groups.find((group) => group.some((member) => sameEndpoint(member, endpoint))) ?? null;
  return mirroredGroup ?? [endpoint];
}

function collectTakenNames(
  inputs: ChannelNode[],
  outputs: ChannelNode[],
  side: ChannelSide,
  excluded: Set<string>,
) {
  const takenNames = new Set<string>();
  for (const node of [...inputs, ...outputs]) {
    if (node.side !== side) {
      for (const filter of node.processing.filters) takenNames.add(filter.name);
      continue;
    }
    const key = endpointKey({ deviceId: node.deviceId, channelIndex: node.channelIndex });
    if (excluded.has(key)) continue;
    for (const filter of node.processing.filters) takenNames.add(filter.name);
  }
  return takenNames;
}

function sortTargets(targets: RouteEndpoint[], sourceKey: string) {
  return [...targets].sort((a, b) => {
    if (endpointKey(a) === sourceKey) return -1;
    if (endpointKey(b) === sourceKey) return 1;
    return 0;
  });
}

function dedupeNames(
  target: RouteEndpoint,
  nextFilters: ChannelNode['processing']['filters'],
  takenNames: Set<string>,
  side: ChannelSide,
) {
  const localTaken = new Set<string>();
  return nextFilters.map((filter, index) => {
    const candidate = filter.name;
    if (!takenNames.has(candidate) && !localTaken.has(candidate)) {
      localTaken.add(candidate);
      takenNames.add(candidate);
      return filter;
    }

    const baseName = `sf-${side}-ch${String(target.channelIndex + 1)}-${filter.config.type.toLowerCase()}-${String(Date.now())}-${String(index)}`;
    const name = ensureUniqueName(baseName, new Set([...takenNames, ...localTaken]));
    localTaken.add(name);
    takenNames.add(name);
    return { ...filter, name };
  });
}

function canReuseFilters(node: ChannelNode, filters: ChannelNode['processing']['filters']) {
  return (
    node.processing.filters.length === filters.length &&
    node.processing.filters.every((filter, index) => filter.config.type === filters[index]?.config.type)
  );
}

function applyFiltersToNodes(
  nodes: ChannelNode[],
  nextByEndpoint: Map<string, ChannelNode['processing']['filters']>,
) {
  return nodes.map((node) => {
    const key = endpointKey({ deviceId: node.deviceId, channelIndex: node.channelIndex });
    const nextFilters = nextByEndpoint.get(key);
    if (!nextFilters) return node;
    return {
      ...node,
      processing: { filters: nextFilters },
      processingSummary: processingSummaryFromFilters(nextFilters),
    };
  });
}

export function useSignalFlowFilters({
  inputs,
  outputs,
  mirrorGroups,
  commitModel,
  setInputs,
  setOutputs,
}: FiltersParams) {
  const updateChannelFilters = useCallback(
    (
      side: ChannelSide,
      endpoint: RouteEndpoint,
      filters: ChannelNode['processing']['filters'],
      options?: { debounce?: boolean },
    ) => {
      const targets = getMirrorTargets(mirrorGroups, side, endpoint);
      const excluded = new Set(targets.map(endpointKey));
      const takenNames = collectTakenNames(inputs, outputs, side, excluded);

      const sourceKey = endpointKey(endpoint);
      const orderedTargets = sortTargets(targets, sourceKey);
      const sideNodes = side === 'input' ? inputs : outputs;
      const nextByEndpoint = new Map<string, ChannelNode['processing']['filters']>();

      for (const target of orderedTargets) {
        const key = endpointKey(target);
        if (key === sourceKey) {
          nextByEndpoint.set(key, dedupeNames(target, filters, takenNames, side));
          continue;
        }

        const node = sideNodes.find(
          (candidate) => candidate.deviceId === target.deviceId && candidate.channelIndex === target.channelIndex,
        );
        if (!node) continue;

        if (canReuseFilters(node, filters)) {
          const updated = node.processing.filters.map((filter, index) => ({
            ...filter,
            config: filters[index]!.config,
          }));
          nextByEndpoint.set(key, dedupeNames(target, updated, takenNames, side));
          continue;
        }

        const generated = filters.map((filter, index) => {
          const baseName = `sf-${side}-ch${String(target.channelIndex + 1)}-${filter.config.type.toLowerCase()}-${String(Date.now())}-${String(index)}`;
          const name = ensureUniqueName(baseName, takenNames);
          takenNames.add(name);
          return { name, config: filter.config };
        });
        nextByEndpoint.set(key, generated);
      }

      if (side === 'input') {
        setInputs((prev) => {
          const next = applyFiltersToNodes(prev, nextByEndpoint);
          commitModel({ inputs: next }, options);
          return next;
        });
        return;
      }

      setOutputs((prev) => {
        const next = applyFiltersToNodes(prev, nextByEndpoint);
        commitModel({ outputs: next }, options);
        return next;
      });
    },
    [commitModel, inputs, mirrorGroups, outputs, setInputs, setOutputs],
  );

  const labelFor = useCallback(
    (side: ChannelSide, endpoint: RouteEndpoint): string => {
      const nodes = side === 'input' ? inputs : outputs;
      const node = nodes.find(
        (candidate) => candidate.deviceId === endpoint.deviceId && candidate.channelIndex === endpoint.channelIndex,
      );
      return node?.label ?? `${endpoint.deviceId}:${endpoint.channelIndex + 1}`;
    },
    [inputs, outputs],
  );

  return { labelFor, updateChannelFilters };
}
