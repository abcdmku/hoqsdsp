#!/usr/bin/env node

/**
 * Simple script to test CamillaDSP WebSocket communication
 */

import WebSocket from 'ws';

const DSP_ADDRESS = '192.168.4.49';
const DSP_PORT = 1234;

async function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${DSP_ADDRESS}:${DSP_PORT}`);
    ws.on('open', () => {
      console.log('Connected to CamillaDSP');
      resolve(ws);
    });
    ws.on('error', (error) => {
      console.error('Connection error:', error);
      reject(error);
    });
    setTimeout(() => reject(new Error('Connection timeout')), 10000);
  });
}

async function send(ws, command) {
  return new Promise((resolve, reject) => {
    const listener = (data) => {
      ws.off('message', listener);
      try {
        const response = JSON.parse(data.toString());
        resolve(response);
      } catch (e) {
        resolve(data.toString());
      }
    };
    ws.on('message', listener);

    const msg = typeof command === 'string' ? `"${command}"` : JSON.stringify(command);
    console.log('Sending:', msg);
    ws.send(msg);

    setTimeout(() => {
      ws.off('message', listener);
      reject(new Error('Command timeout'));
    }, 5000);
  });
}

async function main() {
  let ws;
  let originalConfig;

  try {
    ws = await connect();

    // Get version
    console.log('\n1. Getting CamillaDSP version...');
    const version = await send(ws, 'GetVersion');
    console.log('Version:', version);

    // Get current config
    console.log('\n2. Getting current config...');
    const configResponse = await send(ws, 'GetConfigJson');
    console.log('Response structure:', Object.keys(configResponse));

    // Handle different response formats
    let configJson;
    if (configResponse.GetConfigJson?.value) {
      configJson = configResponse.GetConfigJson.value;
    } else if (configResponse.GetConfigJson?.result === 'Ok' && typeof configResponse.GetConfigJson.value === 'string') {
      configJson = configResponse.GetConfigJson.value;
    } else if (typeof configResponse.GetConfigJson === 'string') {
      configJson = configResponse.GetConfigJson;
    } else {
      console.log('Full response:', JSON.stringify(configResponse, null, 2));
      throw new Error('Unexpected response format');
    }

    if (configJson) {
      originalConfig = typeof configJson === 'string' ? JSON.parse(configJson) : configJson;
      console.log('Config loaded. Devices:', originalConfig.devices);
      console.log('Pipeline steps:', originalConfig.pipeline?.length ?? 0);
      console.log('Mixers:', Object.keys(originalConfig.mixers ?? {}));
      console.log('Filters:', Object.keys(originalConfig.filters ?? {}));

      // Check for null values in the config
      console.log('\n3. Checking for null values in config...');
      const nullPaths = findNulls(originalConfig);
      if (nullPaths.length > 0) {
        console.log('Found null values at:', nullPaths);
      } else {
        console.log('No null values found');
      }

      // Check routing mixer specifically
      if (originalConfig.mixers?.routing) {
        console.log('\n4. Routing mixer details:');
        const routing = originalConfig.mixers.routing;
        console.log('  Channels:', routing.channels);
        console.log('  Mappings:', routing.mapping?.length ?? 0);
        if (routing.mapping?.length > 0) {
          const firstMapping = routing.mapping[0];
          console.log('  First mapping dest:', firstMapping.dest);
          console.log('  First mapping sources:', firstMapping.sources);
          // Check for nulls in sources
          for (const src of firstMapping.sources ?? []) {
            console.log('    Source:', src);
            if (src.inverted === null) console.log('    WARNING: inverted is null!');
            if (src.mute === null) console.log('    WARNING: mute is null!');
          }
        }
      }

      // Test sending a modified config
      console.log('\n5. Testing config round-trip...');
      const testConfig = JSON.parse(JSON.stringify(originalConfig));

      // Clean null values
      const cleanedConfig = cleanNulls(testConfig);

      console.log('Sending cleaned config...');
      const setResult = await send(ws, { SetConfigJson: JSON.stringify(cleanedConfig) });
      console.log('SetConfigJson result:', setResult);

      if (setResult.SetConfigJson === 'Ok') {
        console.log('Config validated successfully!');

        // Reload to apply
        const reloadResult = await send(ws, { Reload: null });
        console.log('Reload result:', reloadResult);
      }
    } else {
      console.log('Unexpected response:', configJson);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (ws) {
      ws.close();
      console.log('\nConnection closed');
    }
  }
}

function findNulls(obj, path = '') {
  const results = [];

  if (obj === null) {
    results.push(path || 'root');
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      results.push(...findNulls(item, `${path}[${index}]`));
    });
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      results.push(...findNulls(value, path ? `${path}.${key}` : key));
    }
  }

  return results;
}

function cleanNulls(obj) {
  if (obj === null) {
    return undefined;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanNulls);
  }

  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = cleanNulls(value);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }

  return obj;
}

main();
