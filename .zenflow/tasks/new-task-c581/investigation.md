# Investigation: Mute/Volume WebSocket response parsing

## Bug summary

When toggling mute or changing volume in the network dashboard, the UI logs errors like:

- `Unexpected response format: {"SetMute":{"result":"Ok"}}`
- `Unexpected response format: {"SetVolume":{"result":"Ok"}}`

Even though the payload indicates `result: "Ok"` (i.e., the command likely succeeded), the frontend rejects the response and surfaces an error.

## Root cause analysis

The response shape returned by CamillaDSP does not match what the frontend WebSocket client expects.

### What CamillaDSP returns

CamillaDSP responses are keyed by the command name, for example:

```json
{"SetMute":{"result":"Ok"}}
```

For “setter” commands, CamillaDSP commonly omits a `value` field entirely.

### What the current client code expects

The client-side types and request tracking are built around an `id`-based response format:

- `src/types/websocket.types.ts` defines `WSResponse` as:
  - `{ result: 'Ok' | 'Error'; value: T }` (note: `value` required)
- `src/lib/websocket/WebSocketManager.ts` tracks pending requests by `id` and only resolves when an incoming message contains a matching `response.id`.

Because CamillaDSP’s response:

- does not include `id`, and
- nests the response under the command name (`SetMute`, `SetVolume`), and
- may omit `value` for `Ok` results,

the response cannot be matched to the pending request (and in some versions of the code, may be treated as an “unexpected format” and rejected).

Additionally, `WebSocketManager.formatMessage()` currently includes an `id` field in outgoing messages; CamillaDSP appears to ignore it (it still replies `Ok`), but it does not echo it back.

## Affected components

- `src/lib/websocket/WebSocketManager.ts` (message formatting + response handling + pending request correlation)
- `src/types/websocket.types.ts` (`WSResponse` does not reflect CamillaDSP’s command-keyed wrapper and optional `value`)
- Any UI code that uses `wsManager.send()` for setter commands (mute/volume) will see failures even when CamillaDSP replies `Ok`.

## Proposed solution

Update the WebSocket client implementation to speak CamillaDSP’s native protocol.

1. **Support CamillaDSP’s command-keyed response wrapper**
   - Parse incoming JSON messages as `Record<string, { result: 'Ok' | 'Error'; value?: unknown }>`.
   - Extract the single command key (e.g., `SetMute`) and its inner response.

2. **Handle missing `value` for `Ok` responses**
   - Treat absent `value` as `undefined` (or `null`) and resolve the request successfully.

3. **Replace `id`-based correlation with command-based correlation**
   - Since CamillaDSP does not echo request IDs, store pending requests in per-command FIFO queues.
   - On response `{ [commandName]: { result, value? } }`, resolve/reject the oldest pending request waiting for `commandName`.

4. **Align outgoing message format with CamillaDSP**
   - For string commands: send `JSON.stringify(command)` (e.g., `"GetVersion"`).
   - For object commands: send `JSON.stringify(command)` (e.g., `{ "SetMute": true }`) without extra fields.

5. **Tests / regression coverage (for implementation step)**
   - Add/adjust `src/lib/websocket/WebSocketManager.test.ts` cases to simulate CamillaDSP-style responses:
     - `{"GetVersion":{"result":"Ok","value":"1.0.0"}}`
     - `{"SetMute":{"result":"Ok"}}` (no `value`)
   - Ensure `send()` resolves for setters (no timeout) and rejects on `result: "Error"`.

