import { describe, expect, it } from 'vitest';
import { parseSystemMetricsJson, parseSystemMetricsPrometheus, parseSystemMetricsResponse } from './systemMetrics';

describe('systemMetrics', () => {
  describe('parseSystemMetricsJson', () => {
    it('parses memory and temperature from JSON shape', () => {
      const totalBytes = 4 * 1024 * 1024 * 1024;
      const availableBytes = 1 * 1024 * 1024 * 1024;

      const parsed = parseSystemMetricsJson({
        timestamp: 123,
        memory: { totalBytes, availableBytes },
        temperature: { cpuCelsius: 55.2 },
      });

      expect(parsed.timestamp).toBe(123);
      expect(parsed.memory.totalBytes).toBe(totalBytes);
      expect(parsed.memory.availableBytes).toBe(availableBytes);
      expect(parsed.memory.usedBytes).toBe(totalBytes - availableBytes);
      expect(parsed.memory.usedPercent).toBeCloseTo(75, 5);
      expect(parsed.temperature.cpuCelsius).toBeCloseTo(55.2, 5);
    });
  });

  describe('parseSystemMetricsPrometheus', () => {
    it('parses node_exporter memory metrics and thermal temperature', () => {
      const totalBytes = 8 * 1024 * 1024 * 1024;
      const availableBytes = 2 * 1024 * 1024 * 1024;

      const text = `
# HELP node_memory_MemTotal_bytes Memory information field MemTotal_bytes.
node_memory_MemTotal_bytes ${String(totalBytes)}
node_memory_MemAvailable_bytes ${String(availableBytes)}
node_thermal_zone_temp{zone="thermal_zone0",type="cpu-thermal"} 55
`;

      const parsed = parseSystemMetricsPrometheus(text, 1000);

      expect(parsed.timestamp).toBe(1000);
      expect(parsed.memory.totalBytes).toBe(totalBytes);
      expect(parsed.memory.availableBytes).toBe(availableBytes);
      expect(parsed.memory.usedPercent).toBeCloseTo(75, 5);
      expect(parsed.temperature.cpuCelsius).toBe(55);
    });

    it('coerces millidegree temperature values', () => {
      const text = `
node_memory_MemTotal_bytes 100
node_memory_MemAvailable_bytes 50
node_thermal_zone_temp{zone="thermal_zone0",type="cpu-thermal"} 55000
`;

      const parsed = parseSystemMetricsPrometheus(text, 1000);
      expect(parsed.temperature.cpuCelsius).toBeCloseTo(55, 5);
    });
  });

  describe('parseSystemMetricsResponse', () => {
    it('prefers JSON when content-type is application/json', () => {
      const result = parseSystemMetricsResponse({
        contentType: 'application/json; charset=utf-8',
        text: JSON.stringify({
          timestamp: 123,
          memory: { totalBytes: 100, availableBytes: 50 },
          temperature: { cpuCelsius: 60 },
        }),
      });

      expect(result.source).toBe('json');
      expect(result.timestamp).toBe(123);
      expect(result.memory.usedPercent).toBeCloseTo(50, 5);
      expect(result.temperature.cpuCelsius).toBe(60);
    });

    it('falls back to Prometheus parsing when JSON is invalid', () => {
      const result = parseSystemMetricsResponse({
        contentType: 'application/json',
        text: 'node_memory_MemTotal_bytes 100\nnode_memory_MemAvailable_bytes 50\n',
        now: 999,
      });

      expect(result.source).toBe('prometheus');
      expect(result.timestamp).toBe(999);
    });
  });
});
