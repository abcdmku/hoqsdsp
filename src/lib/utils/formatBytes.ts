const KB = 1024;
const MB = 1024 * KB;
const GB = 1024 * MB;
const TB = 1024 * GB;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';

  const abs = Math.abs(bytes);
  const fixed = (value: number) => value.toFixed(decimals);

  if (abs >= TB) return `${fixed(bytes / TB)} TB`;
  if (abs >= GB) return `${fixed(bytes / GB)} GB`;
  if (abs >= MB) return `${fixed(bytes / MB)} MB`;
  if (abs >= KB) return `${fixed(bytes / KB)} KB`;
  return `${Math.round(bytes)} B`;
}
