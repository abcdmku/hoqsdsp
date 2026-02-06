// CrosspointCell is now rendered inline within RoutingMatrix.
// This file kept for backwards-compatible type export only.

export type CrosspointToolPreview =
  | { kind: 'gain'; gain: number }
  | { kind: 'phase'; inverted: boolean }
  | { kind: 'mute'; mute: boolean }
  | { kind: 'disconnect' }
  | null;
