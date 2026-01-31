import type { FilterConfig, FilterType } from '../../types';
import type { ChannelProcessingFilter } from './model';

export function ensureUniqueName(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let attempt = 1;
  while (taken.has(`${base}-${String(attempt)}`)) {
    attempt += 1;
  }
  return `${base}-${String(attempt)}`;
}

export function getBiquadBlock(filters: { config: { type: string } }[]): { start: number; end: number } | null {
  const indices: number[] = [];
  for (let i = 0; i < filters.length; i++) {
    if (filters[i]?.config.type === 'Biquad') indices.push(i);
  }
  return indices.length > 0 ? { start: indices[0]!, end: indices[indices.length - 1]! } : null;
}

export function replaceBiquadBlock<T extends { config: { type: string } }>(
  filters: T[],
  biquads: T[],
): T[] {
  const block = getBiquadBlock(filters);
  if (!block) return [...filters, ...biquads];
  return [...filters.slice(0, block.start), ...biquads, ...filters.slice(block.end + 1)];
}

export function getDiffEqBlock(filters: { config: { type: string } }[]): { start: number; end: number } | null {
  const indices: number[] = [];
  for (let i = 0; i < filters.length; i++) {
    if (filters[i]?.config.type === 'DiffEq') indices.push(i);
  }
  return indices.length > 0 ? { start: indices[0]!, end: indices[indices.length - 1]! } : null;
}

export function replaceDiffEqBlock<T extends { config: { type: string } }>(
  filters: T[],
  diffeqs: T[],
): T[] {
  const block = getDiffEqBlock(filters);
  if (!block) return [...filters, ...diffeqs];
  return [...filters.slice(0, block.start), ...diffeqs, ...filters.slice(block.end + 1)];
}

export function upsertSingleFilterOfType(
  filters: ChannelProcessingFilter[],
  config: FilterConfig,
  nameBase: string,
): ChannelProcessingFilter[] {
  const index = filters.findIndex((filter) => filter.config.type === config.type);
  if (index >= 0) {
    return filters.map((filter, idx) => (idx === index ? { ...filter, config } : filter));
  }
  const takenNames = new Set(filters.map((f) => f.name));
  const name = ensureUniqueName(nameBase, takenNames);
  return [...filters, { name, config }];
}

export function removeFirstFilterOfType(
  filters: ChannelProcessingFilter[],
  type: FilterType,
): ChannelProcessingFilter[] {
  const index = filters.findIndex((filter) => filter.config.type === type);
  if (index < 0) return filters;
  return [...filters.slice(0, index), ...filters.slice(index + 1)];
}
