#!/usr/bin/env node
/**
 * Minimal system-metrics HTTP server for Raspberry Pi / Linux.
 *
 * Exposes:
 * - GET /api/system -> JSON with RAM + CPU temperature
 *
 * Notes:
 * - Adds permissive CORS headers so the frontend can fetch across origins/ports.
 * - Intended to run on the same host as CamillaDSP.
 */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';

const DEFAULT_PORT = 9925;
const port = Number(process.env.PORT ?? DEFAULT_PORT);
const host = process.env.HOST ?? '0.0.0.0';

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(JSON.stringify(body));
}

async function readMemInfo() {
  try {
    const text = await fs.readFile('/proc/meminfo', 'utf8');
    const lines = text.split('\n');
    const values = {};
    for (const line of lines) {
      const match = /^([A-Za-z0-9_()]+):\s+(\d+)\s+kB\s*$/.exec(line.trim());
      if (!match) continue;
      const [, key, rawKb] = match;
      values[key] = Number(rawKb) * 1024;
    }

    const totalBytes = values.MemTotal ?? os.totalmem();
    const availableBytes = values.MemAvailable ?? os.freemem();
    return { totalBytes, availableBytes };
  } catch {
    return { totalBytes: os.totalmem(), availableBytes: os.freemem() };
  }
}

async function readCpuTempCelsius() {
  const thermalCandidates = [
    '/sys/class/thermal/thermal_zone0/temp',
    '/sys/class/thermal/thermal_zone1/temp',
  ];

  for (const path of thermalCandidates) {
    try {
      const raw = await fs.readFile(path, 'utf8');
      const value = Number(raw.trim());
      if (!Number.isFinite(value)) continue;
      // Linux thermal_zone temps are usually millidegrees
      return value > 200 ? value / 1000 : value;
    } catch {
      // try next
    }
  }

  return null;
}

function normalizeMemory({ totalBytes, availableBytes }) {
  const total = Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0;
  const available = Number.isFinite(availableBytes) && availableBytes > 0 ? availableBytes : 0;
  const usedBytes = Math.max(0, total - Math.min(total, available));
  const usedPercent = total > 0 ? (usedBytes / total) * 100 : 0;
  return { totalBytes: total, availableBytes: Math.min(total, available), usedBytes, usedPercent };
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    json(res, 400, { error: 'Missing URL' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '86400',
    });
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (req.url === '/health') {
    json(res, 200, { ok: true });
    return;
  }

  if (req.url === '/api/system') {
    const [mem, cpuCelsius] = await Promise.all([
      readMemInfo(),
      readCpuTempCelsius(),
    ]);

    json(res, 200, {
      timestamp: Date.now(),
      memory: normalizeMemory(mem),
      temperature: { cpuCelsius },
    });
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(port, host, () => {
  console.log(`pi-system-metrics listening on http://${host}:${port}`);
});
