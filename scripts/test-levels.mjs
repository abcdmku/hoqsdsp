import WebSocket from 'ws';

const ws = new WebSocket('ws://192.168.4.49:1234');

ws.on('error', (error) => {
  console.error('WebSocket error:', error.message);
});

ws.on('open', () => {
  console.log('Connected to CamillaDSP');

  // First, get config to see channel count
  console.log('\n--- Getting config ---');
  ws.send(JSON.stringify('GetConfigJson'));
});

ws.on('message', (data) => {
  const response = JSON.parse(data.toString());
  console.log('Response:', JSON.stringify(response, null, 2));

  // If this is the config response, now get signal levels
  if (response.GetConfigJson) {
    console.log('\n--- Getting signal levels ---');
    ws.send(JSON.stringify('GetSignalLevelsSinceLast'));
  } else if (response.GetSignalLevelsSinceLast) {
    // Got levels, let's poll a few more times
    let pollCount = 0;
    const interval = setInterval(() => {
      ws.send(JSON.stringify('GetSignalLevelsSinceLast'));
      pollCount++;
      if (pollCount >= 5) {
        clearInterval(interval);
        console.log('\n--- Done ---');
        ws.close();
      }
    }, 200);
  }
});

ws.on('close', () => {
  console.log('Disconnected');
  process.exit(0);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('Timeout');
  ws.close();
  process.exit(1);
}, 10000);
