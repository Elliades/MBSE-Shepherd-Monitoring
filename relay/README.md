# Relay

Pairs the MagicDraw / Cameo plugin with the guide of a student on another machine, then carries the
simulation signals from one to the other (see "Simulation panel" in the main README).

This folder is a copy of `relay/` of the MBSE Shepard monitoring project (`src/` and `package.json`
unchanged, the wire format is in its `PROTOCOL.md`). It is here so that one `docker compose up`
starts the guide and its relay together. Copy it again from the monitoring project when it changes.

In the compose stack the relay has no port of its own: nginx forwards `/relay/` to it (see
`nginx/default.conf`), so the guide and the relay share one address, and one `https`.

Run it alone, to try things by hand:

```bash
cd relay && npm ci && npm start     # ws://127.0.0.1:8787
```
