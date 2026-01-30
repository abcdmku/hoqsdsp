import type { RouteEndpoint } from '../../lib/signalflow';
import type { PortSide } from '../../lib/signalflow/endpointUtils';
import { ensureUniqueName, replaceBiquadBlock } from '../../lib/signalflow/filterUtils';

export function endpointFromPortElement(
  element: Element | null,
): { side: PortSide; endpoint: RouteEndpoint } | null {
  if (!element) return null;
  const portElement = element.closest<HTMLElement>('[data-port-side][data-device-id][data-channel-index]');
  if (!portElement) return null;

  const side = portElement.getAttribute('data-port-side');
  const deviceId = portElement.getAttribute('data-device-id');
  const channelIndexRaw = portElement.getAttribute('data-channel-index');
  if (side !== 'input' && side !== 'output') return null;
  if (!deviceId || channelIndexRaw === null) return null;

  const channelIndex = Number(channelIndexRaw);
  if (!Number.isFinite(channelIndex)) return null;
  return { side, endpoint: { deviceId, channelIndex } };
}

export function endpointKey(endpoint: RouteEndpoint): string {
  return `${endpoint.deviceId}\u0000${String(endpoint.channelIndex)}`;
}

export { ensureUniqueName, replaceBiquadBlock };
