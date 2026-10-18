# Relay over plain HTTP requests

Some networks (school proxies) let `https` requests through but not WebSocket frames: the WebSocket
opens, then nothing ever arrives. The relay therefore also accepts its two roles, **plugin** (Cameo) and
**viewer** (a guide), over plain HTTP requests. The frames are exactly those of the WebSocket protocol
(`PROTOCOL.md` of the monitoring project); only the way they travel changes. A room can mix both: a
Cameo over HTTP followed by guides on WebSocket, or the other way round.

Online, every path below is under `/relay` (nginx forwards it), for example
`https://shepherd.chaos-art.fr/relay/v1/http/open`.

## Session

| Request | Body | Answer |
| --- | --- | --- |
| `POST /v1/http/open` | `{"role":"plugin","code"?:"ABCDEF"}` or `{"role":"viewer","code":"ABCDEF","lastSeq"?:12}` | `{"session":"…","frames":["…"]}`: the first frames (the `hello`). Refused like the WebSocket would be: `{"session":null,"frames":[],"closed":{"code":4404,"reason":"unknown-code"}}` |
| `GET /v1/http/poll?s=SESSION&wait=MS` | | `{"frames":["…","…"]}` as soon as there is something, otherwise after `wait` ms (≤ 25 000, 0 = answer at once). `"closed":{code,reason}` when the relay ended the session. |
| `POST /v1/http/send?s=SESSION` | `{"frames":["…","…"]}` | `{"ok":true,"accepted":n}`. Each frame is handled as one WebSocket message, in order. |
| `POST /v1/http/close?s=SESSION` | `{}` | `{"ok":true}`: leaves the room (a plugin's room tells its viewers `plugin-offline`). |

- `frames` are **strings**, each one a JSON frame as it would travel on the WebSocket. A frame above
  64 KiB is dropped, at most 1000 frames per post.
- An unknown or expired session answers `410` with `{"error":"unknown-session","closed":{"code":1006,…}}`:
  open a new one (a viewer with `lastSeq` gets what it missed, as on the WebSocket).
- A newer poll of a session answers the older one with `{"frames":[]}`: keep one poll at a time.
- A session that has not polled for 40 s is gone (as a WebSocket that stops answering pings): its
  plugin goes offline, or its viewer leaves.
- Frames that arrive while a poll waits are gathered for 20 ms, then answered together.

## Pace

The clients post at once when their previous post is at least 100 ms old, and otherwise send what
piled up in the next one: **at most 10 posts a second**, however many signals the simulation emits
(the signals of a burst go as one `{"batch":[…]}` frame, see the plugin's `OutboundQueue`). With one
poll waiting at all times, a simulation running at 100 signals per second costs about 10 posts and a
few polls a second. Latency adds one request on top of the WebSocket: about 50 to 150 ms.

## Network check

`/v1/diag/*` tells which ways through a network allows; the page `diag/` of the site and the Cameo
menu *ISAE > Relay network check* run them and post a report.

| Request | What it shows |
| --- | --- |
| `GET /v1/diag/echo` | the address the relay sees (last number masked), `Via` / `X-Forwarded-For` (a proxy on the way) |
| `POST /v1/diag/echo` | that a POST body of that size gets through: `{"bytes":n}` |
| `GET /v1/diag/poll?wait=MS` | that a request held `MS` ms (≤ 55 000) is not cut by a proxy |
| `GET /v1/diag/sse?n=5&every=500` | server-sent events; a buffering proxy delivers them all at the end |
| WebSocket `/v1/diag/ws?n=5&every=500` | a `hello` at once, `n` ticks, an echo of anything sent: "opens but silent" is a proxy holding frames |
| `POST /v1/diag/report` | stores a report (JSON object ≤ 256 KiB) in `DIAG_DIR/reports.jsonl` (the volume `relay-data`) |
| `GET /v1/diag/reports?limit=N` | the last reports, newest first (page `diag/reports.html`) |
