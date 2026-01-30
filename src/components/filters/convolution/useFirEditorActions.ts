import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ConvolutionFilter, FirPhaseCorrectionUiSettingsV1 } from '../../../types';
import type { FirPreviewDesign } from './types';

interface FirEditorActionsOptions {
  filter: ConvolutionFilter;
  updateFilter: (updater: (prev: ConvolutionFilter) => ConvolutionFilter) => void;
  previewDesign: FirPreviewDesign;
  settingsToPersist: FirPhaseCorrectionUiSettingsV1;
  filterName?: string;
  onPersistFirPhaseCorrectionSettings?: (filterName: string, settings: FirPhaseCorrectionUiSettingsV1) => void;
  onDebouncedApply?: (config: ConvolutionFilter) => void;
}

export function useFirEditorActions({
  filter,
  updateFilter,
  previewDesign,
  settingsToPersist,
  filterName,
  onPersistFirPhaseCorrectionSettings,
  onDebouncedApply,
}: FirEditorActionsOptions) {
  const params = filter.parameters;
  const currentTaps = params.type === 'Values' ? params.values : [1];

  const undoStackRef = useRef<number[][]>([]);
  const baselineValuesRef = useRef<number[] | null>(null);
  const lastAppliedParamsRef = useRef<ConvolutionFilter['parameters'] | null>(null);
  const pendingPersistSettingsRef = useRef<FirPhaseCorrectionUiSettingsV1 | null>(null);

  const isIdentityFir = useMemo(() => {
    return params.type === 'Values' && params.values.length === 1 && Math.abs((params.values[0] ?? 0) - 1) < 1e-12;
  }, [params]);

  const canPreviewAppliedFirResponse = params.type === 'Values';

  const isIdentityValues = useCallback((values: number[] | null | undefined) => {
    if (!values) return true;
    return values.length === 1 && Math.abs((values[0] ?? 0) - 1) < 1e-12;
  }, []);

  useEffect(() => {
    if (params.type !== 'Values') return;
    if (baselineValuesRef.current) return;
    baselineValuesRef.current = params.values.slice();
  }, [params]);

  useEffect(() => {
    if (isIdentityFir) return;
    if (params.type === 'Values') {
      lastAppliedParamsRef.current = { type: 'Values', values: params.values.slice() };
    } else if (params.type === 'Raw') {
      lastAppliedParamsRef.current = { ...params };
    } else {
      lastAppliedParamsRef.current = { ...params };
    }
  }, [isIdentityFir, params]);

  useEffect(() => {
    if (!filterName) return;
    if (!onPersistFirPhaseCorrectionSettings) return;
    const pending = pendingPersistSettingsRef.current;
    if (!pending) return;
    onPersistFirPhaseCorrectionSettings(filterName, pending);
    pendingPersistSettingsRef.current = null;
  }, [filterName, onPersistFirPhaseCorrectionSettings]);

  const handleUndo = useCallback(() => {
    if (params.type !== 'Values') return;
    const previous = undoStackRef.current.pop();
    if (!previous) return;
    updateFilter((prev) => ({ ...prev, parameters: { type: 'Values', values: previous } }));
  }, [params.type, updateFilter]);

  const handleResetToBaseline = useCallback(() => {
    const baseline = baselineValuesRef.current;
    if (!baseline) return;
    updateFilter((prev) => ({ ...prev, parameters: { type: 'Values', values: baseline.slice() } }));
    undoStackRef.current = [];
  }, [updateFilter]);

  const canEnableFromIdentity = useMemo(() => {
    const last = lastAppliedParamsRef.current;
    if (last) {
      if (last.type === 'Values') return !isIdentityValues(last.values);
      return true;
    }
    return !isIdentityValues(previewDesign.taps);
  }, [isIdentityValues, previewDesign.taps]);

  const handleApplyFir = useCallback(() => {
    if (!previewDesign.taps) return;
    const previousValues = params.type === 'Values' ? params.values.slice() : null;
    const nextConfig: ConvolutionFilter = { ...filter, parameters: { type: 'Values', values: previewDesign.taps } };
    updateFilter(() => nextConfig);
    onDebouncedApply?.(nextConfig);
    if (previousValues) undoStackRef.current.push(previousValues);

    if (onPersistFirPhaseCorrectionSettings) {
      if (filterName) {
        onPersistFirPhaseCorrectionSettings(filterName, settingsToPersist);
      } else {
        pendingPersistSettingsRef.current = settingsToPersist;
      }
    }
  }, [
    filter,
    filterName,
    onDebouncedApply,
    onPersistFirPhaseCorrectionSettings,
    params,
    previewDesign.taps,
    settingsToPersist,
    updateFilter,
  ]);

  const handleToggleEnabled = useCallback(
    (enabled: boolean) => {
      if (!enabled) {
        if (!isIdentityFir) {
          lastAppliedParamsRef.current =
            params.type === 'Values' ? ({ type: 'Values', values: params.values.slice() } as const) : { ...params };
        }
        const nextConfig: ConvolutionFilter = { ...filter, parameters: { type: 'Values', values: [1] } };
        updateFilter(() => nextConfig);
        onDebouncedApply?.(nextConfig);
        if (params.type === 'Values') undoStackRef.current.push(params.values.slice());
        return;
      }

      const restoredFromPreview = !lastAppliedParamsRef.current && Boolean(previewDesign.taps);
      const restore = lastAppliedParamsRef.current ?? (previewDesign.taps ? ({ type: 'Values', values: previewDesign.taps.slice() } as const) : null);
      if (!restore) return;
      if (restore.type === 'Values' && isIdentityValues(restore.values)) return;
      const nextConfig: ConvolutionFilter = {
        ...filter,
        parameters: restore.type === 'Values' ? { type: 'Values', values: restore.values.slice() } : { ...restore },
      };
      updateFilter(() => nextConfig);
      onDebouncedApply?.(nextConfig);
      if (params.type === 'Values') undoStackRef.current.push(params.values.slice());

      if (restoredFromPreview && onPersistFirPhaseCorrectionSettings) {
        if (filterName) onPersistFirPhaseCorrectionSettings(filterName, settingsToPersist);
        else pendingPersistSettingsRef.current = settingsToPersist;
      }
    },
    [
      filter,
      filterName,
      isIdentityFir,
      isIdentityValues,
      onDebouncedApply,
      onPersistFirPhaseCorrectionSettings,
      params,
      previewDesign.taps,
      settingsToPersist,
      updateFilter,
    ],
  );

  return {
    params,
    currentTaps,
    isIdentityFir,
    canPreviewAppliedFirResponse,
    canEnableFromIdentity,
    canUndo: undoStackRef.current.length > 0,
    canReset: Boolean(baselineValuesRef.current),
    handleUndo,
    handleResetToBaseline,
    handleApplyFir,
    handleToggleEnabled,
  };
}
