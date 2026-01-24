export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  jitterFactor: number;
}

export const defaultReconnectionConfig: ReconnectionConfig = {
  maxAttempts: 10,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.25,
};

export function calculateDelay(
  attempt: number,
  config: ReconnectionConfig = defaultReconnectionConfig
): number {
  const exponentialDelay = Math.min(
    config.baseDelay * Math.pow(2, attempt - 1),
    config.maxDelay
  );
  const jitter = exponentialDelay * config.jitterFactor * (Math.random() * 2 - 1);
  return Math.floor(exponentialDelay + jitter);
}

export function shouldReconnect(
  attempt: number,
  config: ReconnectionConfig = defaultReconnectionConfig
): boolean {
  return attempt < config.maxAttempts;
}
