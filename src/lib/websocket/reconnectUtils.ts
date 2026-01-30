export function calculateReconnectDelay(
  attempt: number,
  baseReconnectDelay: number,
  maxReconnectDelay: number,
): number {
  const exponentialDelay = Math.min(
    baseReconnectDelay * Math.pow(2, attempt - 1),
    maxReconnectDelay,
  );
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}
