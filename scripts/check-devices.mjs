import WebSocket from 'ws';

const ws = new WebSocket('ws://192.168.4.49:1234');

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});

ws.on('open', () => {
  console.log('Connected to CamillaDSP\n');

  // Get current config
  console.log('--- Current Config ---');
  ws.send(JSON.stringify('GetConfigJson'));
});

let step = 0;

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());

  // Debug: log raw response for device queries
  if (response.GetAvailableCaptureDevices || response.GetAvailablePlaybackDevices) {
    console.log('Raw response:', JSON.stringify(response, null, 2));
  }

  if (response.GetConfigJson) {
    const configStr = response.GetConfigJson.value || response.GetConfigJson.Ok;
    const config = JSON.parse(configStr);
    console.log('Capture device:', JSON.stringify(config.devices.capture, null, 2));
    console.log('\nPlayback device:', JSON.stringify(config.devices.playback, null, 2));

    // Get available ALSA capture devices
    console.log('\n--- Available ALSA Capture Devices ---');
    ws.send(JSON.stringify({ GetAvailableCaptureDevices: 'Alsa' }));
    step = 1;
  } else if (response.GetAvailableCaptureDevices && step === 1) {
    // Get available ALSA playback devices
    console.log('\n--- Available ALSA Playback Devices ---');
    ws.send(JSON.stringify({ GetAvailablePlaybackDevices: 'Alsa' }));
    step = 2;
  } else if (response.GetAvailablePlaybackDevices && step === 2) {
    // Get current state
    console.log('\n--- CamillaDSP State ---');
    ws.send(JSON.stringify('GetState'));
    step = 3;
  } else if (response.GetState && step === 3) {
    const state = response.GetState.value || response.GetState.Ok;
    console.log('State:', state);

    console.log('\n--- Done ---');
    ws.close();
  }
});

ws.on('close', () => {
  process.exit(0);
});

setTimeout(() => {
  console.log('Timeout');
  ws.close();
  process.exit(1);
}, 10000);
