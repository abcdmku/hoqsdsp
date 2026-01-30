import type { RouteEndpoint } from './model';

export type PortSide = 'input' | 'output';

export function portKey(side: PortSide, endpoint: RouteEndpoint): string {
  return `${side}:${endpoint.deviceId}:${endpoint.channelIndex}`;
}

export function portKeyFromParts(side: PortSide, deviceId: string, channelIndex: number): string {
  return `${side}:${deviceId}:${channelIndex}`;
}

export function sameEndpoint(a: RouteEndpoint, b: RouteEndpoint): boolean {
  return a.deviceId === b.deviceId && a.channelIndex === b.channelIndex;
}
