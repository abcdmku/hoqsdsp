import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, GitBranch } from 'lucide-react';
import { Page, PageBody, PageHeader } from '../components/layout';
import { EmptyState, SkeletonRoutingMatrix, showToast } from '../components/feedback';
import { Button } from '../components/ui';
import { RoutingMatrix } from '../components/routing/RoutingMatrix';
import { useConfigJson, useSetConfigJson } from '../features/configuration';
import { validateConfig } from '../lib/config';
import { fromConfig } from '../lib/signalflow';
import {
  createDefaultRoutingMixer,
  ensureRoutingMixerStep,
  normalizeRoutingMixer,
  patchConfigWithRoutingMixer,
} from '../lib/routing/routingMixer';
import { useConnectionStore, selectAllConnections } from '../stores/connectionStore';
import type { CamillaConfig, MixerConfig } from '../types';

export function RoutingPage() {
  const activeUnitId = useConnectionStore((state) => state.activeUnitId);
  const unitId = activeUnitId ?? '__no-unit__';
  const activeConnectionStatus = useConnectionStore((state) =>
    activeUnitId ? state.connections.get(activeUnitId)?.status : undefined,
  );

  const allConnections = useConnectionStore(selectAllConnections);
  const connectedUnits = useMemo(
    () => allConnections.filter((conn) => conn.status === 'connected'),
    [allConnections],
  );

  const { data: config, isLoading, error } = useConfigJson(unitId);
  const setConfigJson = useSetConfigJson(unitId);

  const configRef = useRef<CamillaConfig | null>(config ?? null);
  useEffect(() => {
    configRef.current = config ?? null;
  }, [config]);

  const mountedRef = useRef(true);
  const sendTimeoutRef = useRef<number | null>(null);
  const pendingSnapshotRef = useRef<MixerConfig | null>(null);
  const pendingVersionRef = useRef(0);
  const pendingChangesRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
    };
  }, []);

  const inChannels = config?.devices.capture.channels ?? 0;
  const outChannels = config?.devices.playback.channels ?? 0;
  const configRoutingMixer = config?.mixers?.routing ?? null;
  const hasRoutingStep = config?.pipeline.some((step) => step.type === 'Mixer' && step.name === 'routing') ?? false;

  const labels = useMemo(() => {
    if (!config) {
      return { inputs: [] as string[], outputs: [] as string[], inputDeviceLabel: undefined, outputDeviceLabel: undefined };
    }
    const flow = fromConfig(config);
    return {
      inputs: flow.model.inputs.map((node) => node.label),
      outputs: flow.model.outputs.map((node) => node.label),
      inputDeviceLabel: flow.model.inputGroups[0]?.label,
      outputDeviceLabel: flow.model.outputGroups[0]?.label,
    };
  }, [config]);

  const normalizedMixerFromConfig = useMemo<MixerConfig | null>(() => {
    if (!configRoutingMixer) return null;
    return normalizeRoutingMixer(configRoutingMixer, inChannels, outChannels);
  }, [configRoutingMixer, inChannels, outChannels]);

  const [mixer, setMixer] = useState<MixerConfig | null>(null);

  useEffect(() => {
    pendingSnapshotRef.current = null;
    pendingVersionRef.current = 0;
    pendingChangesRef.current = false;
    if (sendTimeoutRef.current !== null) {
      window.clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }
    setMixer(null);
  }, [activeUnitId]);

  useEffect(() => {
    if (pendingChangesRef.current) return;
    setMixer(normalizedMixerFromConfig);
  }, [normalizedMixerFromConfig]);

  const commitMixer = useCallback(
    (nextMixer: MixerConfig, options?: { debounce?: boolean }) => {
      const currentConfig = configRef.current;
      if (!currentConfig) {
        showToast.error('Cannot save routing', 'Connection lost or config not loaded');
        return;
      }

      pendingVersionRef.current += 1;
      const versionAtStart = pendingVersionRef.current;
      pendingSnapshotRef.current = nextMixer;
      pendingChangesRef.current = true;

      const send = async () => {
        if (!mountedRef.current) return;

        const snapshot = pendingSnapshotRef.current;
        const configAtSend = configRef.current;
        if (!snapshot || !configAtSend) {
          if (mountedRef.current && pendingVersionRef.current === versionAtStart) {
            pendingChangesRef.current = false;
            pendingSnapshotRef.current = null;
          }
          return;
        }

        const patched = patchConfigWithRoutingMixer(configAtSend, snapshot);
        const validation = validateConfig(patched);
        if (!validation.valid || !validation.config) {
          if (mountedRef.current && pendingVersionRef.current === versionAtStart) {
            pendingChangesRef.current = false;
            pendingSnapshotRef.current = null;
          }
          showToast.error('Invalid config', validation.errors[0]?.message);
          return;
        }

        try {
          await setConfigJson.mutateAsync(validation.config);
          if (mountedRef.current && pendingVersionRef.current === versionAtStart) {
            pendingChangesRef.current = false;
            pendingSnapshotRef.current = null;
          }
          setConfigJson.invalidate();
        } catch (err) {
          if (mountedRef.current && pendingVersionRef.current === versionAtStart) {
            pendingChangesRef.current = false;
            pendingSnapshotRef.current = null;
          }
          showToast.error('Failed to save routing', err instanceof Error ? err.message : String(err));
        }
      };

      if (sendTimeoutRef.current !== null) {
        window.clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }

      if (options?.debounce) {
        sendTimeoutRef.current = window.setTimeout(() => {
          sendTimeoutRef.current = null;
          void send();
        }, 150);
        return;
      }

      void send();
    },
    [setConfigJson],
  );

  const handleMixerChange = useCallback(
    (nextMixer: MixerConfig, options?: { debounce?: boolean }) => {
      setMixer(nextMixer);
      commitMixer(nextMixer, options);
    },
    [commitMixer],
  );

  const handleCreateRoutingMixer = useCallback(async () => {
    const currentConfig = configRef.current;
    if (!currentConfig) {
      showToast.error('Cannot create routing mixer', 'Config not loaded');
      return;
    }

    const routing = createDefaultRoutingMixer(
      currentConfig.devices.capture.channels,
      currentConfig.devices.playback.channels,
    );

    const withMixer = patchConfigWithRoutingMixer(currentConfig, routing);
    const next = ensureRoutingMixerStep(withMixer);
    const validation = validateConfig(next);
    if (!validation.valid || !validation.config) {
      showToast.error('Invalid config', validation.errors[0]?.message);
      return;
    }

    try {
      await setConfigJson.mutateAsync(validation.config);
      setConfigJson.invalidate();
      showToast.success('Routing mixer created');
    } catch (err) {
      showToast.error('Failed to create routing mixer', err instanceof Error ? err.message : String(err));
    }
  }, [setConfigJson]);

  const handleInsertRoutingStep = useCallback(async () => {
    const currentConfig = configRef.current;
    if (!currentConfig) {
      showToast.error('Cannot update pipeline', 'Config not loaded');
      return;
    }

    const next = ensureRoutingMixerStep(currentConfig);
    const validation = validateConfig(next);
    if (!validation.valid || !validation.config) {
      showToast.error('Invalid config', validation.errors[0]?.message);
      return;
    }

    try {
      await setConfigJson.mutateAsync(validation.config);
      setConfigJson.invalidate();
      showToast.success('Routing mixer inserted into pipeline');
    } catch (err) {
      showToast.error('Failed to update pipeline', err instanceof Error ? err.message : String(err));
    }
  }, [setConfigJson]);

  if (connectedUnits.length === 0) {
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
            title="No Units Connected"
            description="Connect to a CamillaDSP unit from System Overview to view and edit routing."
          />
        </PageBody>
      </Page>
    );
  }

  if (!activeUnitId) {
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
            title="No Unit Selected"
            description="Choose an active unit from the top bar or in System Overview."
          />
        </PageBody>
      </Page>
    );
  }

  if (activeConnectionStatus !== 'connected') {
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
            title="Unit not connected"
            description="Connect to the selected unit from System Overview to load and edit routing."
          />
        </PageBody>
      </Page>
    );
  }

  if (isLoading) {
    return (
      <Page>
        <PageHeader title="Routing" description="Loading routing..." />
        <PageBody>
          <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <SkeletonRoutingMatrix />
          </div>
        </PageBody>
      </Page>
    );
  }

  if (error) {
    const message = error instanceof Error ? error.message : String(error);
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<AlertTriangle className="h-6 w-6" aria-hidden="true" />}
            title="Failed to load config"
            description={message}
          />
        </PageBody>
      </Page>
    );
  }

  if (!config) {
    return (
      <Page>
        <PageHeader title="Routing" description="Select a unit to view and edit routing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
            title="No config available"
            description="Create or load a config on this unit to edit routing."
          />
        </PageBody>
      </Page>
    );
  }

  if (!configRoutingMixer) {
    return (
      <Page>
        <PageHeader title="Routing" description="Routing mixer is missing." />
        <PageBody className="flex items-center justify-center">
          <EmptyState
            icon={<GitBranch className="h-6 w-6" aria-hidden="true" />}
            title="Routing mixer not configured"
            description="This unit does not have a routing mixer. Create one to enable Routing and Signal Flow."
            action={{
              label: setConfigJson.isPending ? 'Creating…' : 'Create routing mixer',
              onClick: () => { void handleCreateRoutingMixer(); },
            }}
          />
        </PageBody>
      </Page>
    );
  }

  const effectiveMixer = mixer ?? normalizedMixerFromConfig;
  if (!effectiveMixer) {
    return (
      <Page>
        <PageHeader title="Routing" description="Loading routing..." />
        <PageBody>
          <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
            <SkeletonRoutingMatrix />
          </div>
        </PageBody>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="Routing"
        description={`${inChannels} input${inChannels === 1 ? '' : 's'} → ${outChannels} output${outChannels === 1 ? '' : 's'}`}
      />
      <PageBody>
        {!hasRoutingStep && (
          <div className="mb-4 flex flex-col gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-500" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-dsp-text">Routing mixer step missing from pipeline</p>
                <p className="mt-0.5 text-xs text-dsp-text-muted">
                  Routing changes won&apos;t apply until a <code className="font-mono">Mixer: routing</code> step is present.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { void handleInsertRoutingStep(); }}
              disabled={setConfigJson.isPending}
            >
              Insert mixer step
            </Button>
          </div>
        )}

        <div className="rounded-lg border border-dsp-primary/50 bg-dsp-surface/30 p-6">
          <RoutingMatrix
            mixer={effectiveMixer}
            onMixerChange={handleMixerChange}
            inputLabels={labels.inputs.length > 0 ? labels.inputs : undefined}
            outputLabels={labels.outputs.length > 0 ? labels.outputs : undefined}
            inputDeviceLabel={labels.inputDeviceLabel}
            outputDeviceLabel={labels.outputDeviceLabel}
          />
        </div>
      </PageBody>
    </Page>
  );
}
