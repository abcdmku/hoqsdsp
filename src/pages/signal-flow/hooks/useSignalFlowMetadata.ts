import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ChannelNode, ChannelSide, RouteEndpoint } from '../../../lib/signalflow';
import { normalizeHexColor } from '../../../lib/signalflow/colorUtils';
import { portKey, sameEndpoint } from '../../../lib/signalflow/endpointUtils';
import type { SignalFlowMirrorGroups } from '../../../stores/signalFlowUiStore';
import type { DeqBandUiSettingsV1, FirPhaseCorrectionUiSettingsV1 } from '../../../types';

interface MetadataParams {
  commitModel: (next: { uiMetadata?: Partial<{ channelColors: Record<string, string>; channelNames: Record<string, string>; mirrorGroups: SignalFlowMirrorGroups; firPhaseCorrection: Record<string, FirPhaseCorrectionUiSettingsV1>; deq: Record<string, DeqBandUiSettingsV1>; }> }, options?: { debounce?: boolean }) => void;
  setChannelColors: Dispatch<SetStateAction<Record<string, string>>>;
  setChannelNames: Dispatch<SetStateAction<Record<string, string>>>;
  setMirrorGroups: Dispatch<SetStateAction<SignalFlowMirrorGroups>>;
  setFirPhaseCorrection: Dispatch<SetStateAction<Record<string, FirPhaseCorrectionUiSettingsV1>>>;
  setDeq: Dispatch<SetStateAction<Record<string, DeqBandUiSettingsV1>>>;
  setInputs: Dispatch<SetStateAction<ChannelNode[]>>;
  setOutputs: Dispatch<SetStateAction<ChannelNode[]>>;
}

export function useSignalFlowMetadata({
  commitModel,
  setChannelColors,
  setChannelNames,
  setMirrorGroups,
  setFirPhaseCorrection,
  setDeq,
  setInputs,
  setOutputs,
}: MetadataParams) {
  const handleSetChannelColor = useCallback(
    (key: string, color: string) => {
      const normalized = normalizeHexColor(color);
      setChannelColors((prev) => {
        const next = { ...prev, [key]: normalized };
        commitModel({ uiMetadata: { channelColors: next } }, { debounce: true });
        return next;
      });
    },
    [commitModel, setChannelColors],
  );

  const handleSetChannelName = useCallback(
    (side: ChannelSide, endpoint: RouteEndpoint, name: string) => {
      const key = portKey(side, endpoint);
      const trimmed = name.trim();

      if (!trimmed) {
        setChannelNames((prev) => {
          const next = { ...prev };
          delete next[key];
          commitModel({ uiMetadata: { channelNames: next } });
          return next;
        });

        const defaultLabel = side === 'input'
          ? `In ${endpoint.channelIndex + 1}`
          : `Out ${endpoint.channelIndex + 1}`;

        if (side === 'input') {
          setInputs((prev) => prev.map((node) =>
            node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
              ? { ...node, label: defaultLabel }
              : node,
          ));
        } else {
          setOutputs((prev) => prev.map((node) =>
            node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
              ? { ...node, label: defaultLabel }
              : node,
          ));
        }
        return;
      }

      setChannelNames((prev) => {
        const next = { ...prev, [key]: trimmed };
        commitModel({ uiMetadata: { channelNames: next } });
        return next;
      });

      if (side === 'input') {
        setInputs((prev) => prev.map((node) =>
          node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
            ? { ...node, label: trimmed }
            : node,
        ));
      } else {
        setOutputs((prev) => prev.map((node) =>
          node.deviceId === endpoint.deviceId && node.channelIndex === endpoint.channelIndex
            ? { ...node, label: trimmed }
            : node,
        ));
      }
    },
    [commitModel, setChannelNames, setInputs, setOutputs],
  );

  const handleSetMirrorGroup = useCallback(
    (side: ChannelSide, members: RouteEndpoint[]) => {
      const uniqueMembers = members.filter(
        (candidate, idx) => members.findIndex((m) => sameEndpoint(m, candidate)) === idx,
      );

      setMirrorGroups((prev) => {
        const existingGroups = prev[side] ?? [];
        const nextGroups: RouteEndpoint[][] = [];

        for (const group of existingGroups) {
          const remaining = group.filter(
            (member) => !uniqueMembers.some((m) => sameEndpoint(m, member)),
          );
          if (remaining.length >= 2) nextGroups.push(remaining);
        }

        if (uniqueMembers.length >= 2) {
          nextGroups.push(uniqueMembers);
        }

        const next = { ...prev, [side]: nextGroups };
        commitModel({ uiMetadata: { mirrorGroups: next } });
        return next;
      });
    },
    [commitModel, setMirrorGroups],
  );

  const handlePersistFirPhaseCorrectionSettings = useCallback(
    (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => {
      setFirPhaseCorrection((prev) => {
        const next = { ...prev, [filterName]: settings };
        commitModel({ uiMetadata: { firPhaseCorrection: next } }, { debounce: true });
        return next;
      });
    },
    [commitModel, setFirPhaseCorrection],
  );

  const handlePersistDeqSettings = useCallback(
    (filterName: string, settings: DeqBandUiSettingsV1 | null) => {
      setDeq((prev) => {
        const next = { ...prev };
        if (settings) {
          next[filterName] = settings;
        } else {
          delete next[filterName];
        }
        commitModel({ uiMetadata: { deq: next } }, { debounce: true });
        return next;
      });
    },
    [commitModel, setDeq],
  );

  return {
    handlePersistDeqSettings,
    handlePersistFirPhaseCorrectionSettings,
    handleSetChannelColor,
    handleSetChannelName,
    handleSetMirrorGroup,
  };
}
