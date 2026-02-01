export interface SystemMetrics {
  timestamp: number;
  memory: {
    totalBytes: number;
    availableBytes: number;
    usedBytes: number;
    usedPercent: number;
  };
  temperature: {
    cpuCelsius: number | null;
  };
  source: 'json' | 'prometheus';
}

interface PrometheusSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeMemory(params: {
  totalBytes: number | null;
  availableBytes: number | null;
  usedBytes: number | null;
}): SystemMetrics['memory'] {
  const total = params.totalBytes ?? 0;
  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Missing or invalid total memory');
  }

  const available =
    params.availableBytes ??
    (params.usedBytes != null ? total - params.usedBytes : null) ??
    0;

  const used =
    params.usedBytes ??
    (params.availableBytes != null ? total - params.availableBytes : null) ??
    Math.max(0, total - available);

  const clampedAvailable = Math.max(0, Math.min(total, available));
  const clampedUsed = Math.max(0, Math.min(total, used));
  const usedPercent = total > 0 ? (clampedUsed / total) * 100 : 0;

  return {
    totalBytes: total,
    availableBytes: clampedAvailable,
    usedBytes: clampedUsed,
    usedPercent,
  };
}

export function parseSystemMetricsJson(data: unknown): Omit<SystemMetrics, 'source'> {
  if (!isRecord(data)) {
    throw new Error('Invalid system metrics JSON');
  }

  const memory = isRecord(data.memory) ? data.memory : null;
  const temperature = isRecord(data.temperature) ? data.temperature : null;

  const timestamp = asFiniteNumber(data.timestamp) ?? Date.now();

  const totalBytes =
    asFiniteNumber(memory?.totalBytes) ??
    asFiniteNumber(data.memoryTotalBytes) ??
    asFiniteNumber(data.totalMemoryBytes);

  const availableBytes =
    asFiniteNumber(memory?.availableBytes) ??
    asFiniteNumber(data.memoryAvailableBytes) ??
    asFiniteNumber(data.availableMemoryBytes);

  const usedBytes =
    asFiniteNumber(memory?.usedBytes) ??
    asFiniteNumber(data.memoryUsedBytes) ??
    asFiniteNumber(data.usedMemoryBytes);

  const cpuCelsius =
    asFiniteNumber(temperature?.cpuCelsius) ??
    asFiniteNumber(data.cpuTempCelsius) ??
    asFiniteNumber(data.temperatureCelsius);

  return {
    timestamp,
    memory: normalizeMemory({ totalBytes, availableBytes, usedBytes }),
    temperature: { cpuCelsius },
  };
}

function parsePrometheusLabels(input: string): Record<string, string> {
  // Very small/forgiving parser for Prometheus label blocks.
  // Example: zone="thermal_zone0",type="cpu-thermal"
  const labels: Record<string, string> = {};
  const regex = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:\\.|[^"\\])*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    const key = match[1];
    if (!key) continue;
    const rawValue = match[2] ?? '';
    labels[key] = rawValue.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return labels;
}

export function parsePrometheusText(text: string): PrometheusSample[] {
  const lines = text.split('\n');
  const samples: PrometheusSample[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // NAME{labels} VALUE [TIMESTAMP]
    const match = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{([^}]*)\})?\s+([-+]?(?:\d+\.?\d*|\d*\.?\d+)(?:[eE][-+]?\d+)?)(?:\s+\d+)?$/.exec(trimmed);
    if (!match) continue;

    const [, name, labelBlock, rawValue] = match;
    if (!name || rawValue == null) continue;

    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;

    samples.push({
      name,
      labels: labelBlock ? parsePrometheusLabels(labelBlock) : {},
      value,
    });
  }

  return samples;
}

function pickBestTemperatureSample(samples: PrometheusSample[]): PrometheusSample | null {
  if (samples.length === 0) return null;

  // Prefer anything that looks like CPU temperature
  const cpuLike = samples.find((s) => {
    const type = s.labels.type?.toLowerCase() ?? '';
    const sensor = s.labels.sensor?.toLowerCase() ?? '';
    const name = s.labels.name?.toLowerCase() ?? '';
    return (
      type.includes('cpu') ||
      sensor.includes('cpu') ||
      name.includes('cpu') ||
      type.includes('cpu-thermal')
    );
  });

  return cpuLike ?? samples[0] ?? null;
}

function coerceCelsius(value: number): number {
  // Some exporters report millidegrees (e.g. 49000 for 49°C).
  if (value > 200) return value / 1000;
  return value;
}

export function parseSystemMetricsPrometheus(text: string, now: number = Date.now()): Omit<SystemMetrics, 'source'> {
  const samples = parsePrometheusText(text);

  const getFirstValue = (metricName: string): number | null => {
    const sample = samples.find((s) => s.name === metricName);
    return sample ? sample.value : null;
  };

  const totalBytes = getFirstValue('node_memory_MemTotal_bytes');
  const availableBytes =
    getFirstValue('node_memory_MemAvailable_bytes') ??
    getFirstValue('node_memory_MemFree_bytes');

  const temperatureMetricCandidates = [
    'node_thermal_zone_temp',
    'node_thermal_zone_temp_celsius',
    'node_hwmon_temp_celsius',
    'rpi_cpu_temp_celsius',
    'raspberrypi_cpu_temp_celsius',
    'cpu_temperature_celsius',
  ] as const;

  let cpuCelsius: number | null = null;
  for (const metricName of temperatureMetricCandidates) {
    const metricSamples = samples.filter((s) => s.name === metricName);
    const best = pickBestTemperatureSample(metricSamples);
    if (!best) continue;
    cpuCelsius = coerceCelsius(best.value);
    break;
  }

  return {
    timestamp: now,
    memory: normalizeMemory({ totalBytes, availableBytes, usedBytes: null }),
    temperature: { cpuCelsius },
  };
}

export function parseSystemMetricsResponse(params: {
  contentType: string;
  text: string;
  now?: number;
}): SystemMetrics {
  const trimmed = params.text.trim();
  const looksJson =
    params.contentType.toLowerCase().includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[');

  if (looksJson) {
    try {
      const json = JSON.parse(trimmed) as unknown;
      return { ...parseSystemMetricsJson(json), source: 'json' };
    } catch {
      // fall through to Prometheus parsing
    }
  }

  return {
    ...parseSystemMetricsPrometheus(params.text, params.now ?? Date.now()),
    source: 'prometheus',
  };
}

export async function fetchSystemMetrics(
  url: string,
  options: { timeoutMs?: number } = {},
): Promise<SystemMetrics> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs ?? 2500);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`System metrics request failed: HTTP ${response.status}`);
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type') ?? '';

    return parseSystemMetricsResponse({ contentType, text });
  } finally {
    clearTimeout(timeout);
  }
}
