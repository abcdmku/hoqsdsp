import WebSocket from 'ws';

const ws = new WebSocket('ws://192.168.4.49:1234');

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
  process.exit(1);
});

ws.on('open', () => {
  console.log('Connected to CamillaDSP\n');
  console.log('Getting state...');
  ws.send(JSON.stringify('GetState'));
});

let step = 0;

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());

  if (response.GetState && step === 0) {
    const state = response.GetState.value || response.GetState.Ok;
    console.log('State:', state);

    console.log('\nGetting current config...');
    ws.send(JSON.stringify('GetConfigJson'));
    step = 1;
  } else if (response.GetConfigJson && step === 1) {
    const inner = response.GetConfigJson;
    const configStr = inner.value ?? inner.Ok;

    console.log('Config string:', configStr);

    // If no config, create a basic one for E2x2
    const config = configStr && configStr !== 'null' ? JSON.parse(configStr) : {
      devices: {
        samplerate: 48000,
        chunksize: 1024,
        capture: {
          type: 'Alsa',
          channels: 2,
          device: 'plughw:CARD=E2x2,DEV=0',
          format: 'S32LE'
        },
        playback: {
          type: 'Alsa',
          channels: 2,
          device: 'plughw:CARD=E2x2,DEV=0',
          format: 'S32LE'
        }
      },
      mixers: {
        routing: {
          channels: { in: 2, out: 2 },
          mapping: [
            { dest: 0, sources: [{ channel: 0, gain: 0, inverted: false, mute: false }] },
            { dest: 1, sources: [{ channel: 1, gain: 0, inverted: false, mute: false }] }
          ]
        }
      },
      filters: {},
      pipeline: [
        { type: 'Mixer', name: 'routing' }
      ]
    };

    if (configStr && configStr !== 'null') {
      console.log('Updating existing config...');
      config.devices.capture.device = 'plughw:CARD=E2x2,DEV=0';
    } else {
      console.log('Creating new config for E2x2...');
    }

    console.log('Capture device:', config.devices.capture.device);
    console.log('Playback device:', config.devices.playback.device);
    console.log('\nSending config...');

    ws.send(JSON.stringify({ SetConfigJson: JSON.stringify(config) }));
    step = 2;
  } else if (response.SetConfigJson && step === 2) {
    const result = response.SetConfigJson;
    if (result.Ok !== undefined || result.result === 'Ok') {
      console.log('Config set successfully!');

      // Wait for CamillaDSP to restart with new device
      setTimeout(() => {
        console.log('\nChecking state...');
        ws.send(JSON.stringify('GetState'));
        step = 3;
      }, 1000);
    } else {
      console.error('Failed to set config:', JSON.stringify(result, null, 2));
      ws.close();
    }
  } else if (response.GetState && step === 3) {
    const state = response.GetState.value || response.GetState.Ok;
    console.log('New state:', state);

    console.log('\nGetting signal levels...');
    ws.send(JSON.stringify('GetSignalLevelsSinceLast'));
    step = 4;
  } else if (response.GetSignalLevelsSinceLast && step === 4) {
    const levels = response.GetSignalLevelsSinceLast.value || response.GetSignalLevelsSinceLast.Ok;
    console.log('Signal levels:', JSON.stringify(levels, null, 2));
    console.log('\nDone! E2x2 should now be the capture device.');
    ws.close();
  } else {
    console.log('Response:', JSON.stringify(response, null, 2));
  }
});

ws.on('close', () => {
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
  process.exit(1);
}, 20000);
