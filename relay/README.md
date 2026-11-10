# Relay

Pairs the MagicDraw / Cameo plugin with the guide of a student on another machine, then carries the
simulation signals from one to the other (see "Simulation panel" in the main README).

This folder started as a copy of `relay/` of the MBSE Shepard monitoring project (`src/` and `package.json`
unchanged, the wire format is in its `PROTOCOL.md`). It is here so that one `docker compose up`
starts the guide and its relay together. Copy it again from the monitoring project when it changes.

In the compose stack the relay has no port of its own: nginx forwards `/relay/` to it (see
`nginx/default.conf`), so the guide and the relay share one address, and one `https`.

The relay itself speaks plain `ws`. TLS (`wss`) is ended in front of it, by nginx in the stack and by the
Caddy proxy of the server; nothing to configure here.

Run it alone, to try things by hand:

```bash
cd relay && npm ci && npm start     # ws://127.0.0.1:8787
```

Since then it gained, here only: the HTTP transport (`src/http-peer.js`, `PROTOCOL-HTTP.md`) and the
network check (`src/diag.js`), and the frames a viewer shares with the other viewers (`{"peer":{...}}`, `sharePeer`). Bring them back to the monitoring project before copying it here again.
`npm test` runs `test/http.test.js`.

## Session timing

`src/track.js` (not in the monitoring project). The guides post `POST /v1/track`
`{ sentAt, events: [{ t, type: scene|ping|hide|show, code, part, v, fp, index, scene, title, total, done, steps }] }`;
the events are appended to `$TRACK_DIR/track.jsonl` (default `DIAG_DIR`, `/data` in the image) and folded
into runs (code + part + day, Europe/Paris). `GET /v1/track/days` and `GET /v1/track/runs?day=&part=`
feed `monitor/` of the site; with `TRACK_KEY` set they need `?key=`.

