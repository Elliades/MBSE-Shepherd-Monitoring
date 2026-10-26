/* Part 4 lab (POC): what travels on the connectors, drawn at once on the diagram and on the x-ray drone.
   Background chatter: each live connector (both ends powered) sends its item flow at the rate of its
   interface block. Events: a chain of item flows, one after the other, each hop waiting for the previous one. */
(function () {
  'use strict';
  const L = window.LAB;
  const NS = 'http://www.w3.org/2000/svg';
  const MAX = 70;

  function create(opts) {
    const { ibd, d3, onHop } = opts;
    const packets = [];
    const acc = new Map();   /* key -> accumulated packets to send */
    let flip = 0;

    function mk(layer, fam, label) {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `pk fam-${fam}${label ? ' pk-ev' : ''}`);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', label ? 6 : 3.6);
      g.appendChild(c);
      if (label) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('y', -10); t.setAttribute('text-anchor', 'middle');
        t.textContent = label; g.appendChild(t);
      }
      layer.appendChild(g);
      return g;
    }

    /* Send one item flow on a connector. dir 1: source to target, -1: back (inout). */
    function send(key, dir, label, dur) {
      const [a, b] = key.split('>');
      const fam = L.IF[L.IBD.portDef(a.split('.')[0], a.split('.')[1]).iface].fam;
      return new Promise((resolve) => {
        if (packets.length > MAX && !label) { resolve(); return; }
        packets.push({
          key, dir, t: 0, dur: dur || (label ? 1.1 : 0.85), fam, label, resolve,
          g1: mk(ibd.packetLayer, fam, label), g2: mk(d3.packetLayer, fam, label),
          to: (dir > 0 ? b : a).split('.')[0], from: (dir > 0 ? a : b).split('.')[0]
        });
      });
    }

    function place(g, path, t) {
      if (!path || !path.isConnected) { g.style.display = 'none'; return; }
      const len = path.getTotalLength();
      if (!len) { g.style.display = 'none'; return; }
      const p = path.getPointAtLength(len * t);
      g.style.display = '';
      g.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
    }

    function tick(dt, st) {
      /* background chatter */
      if (st.running) {
        st.live.forEach((k) => {
          const def = L.IBD.portDef(...k.split('>')[0].split('.'));
          const f = L.IF[def.iface];
          if (!f.rate) return;
          const v = (acc.get(k) || Math.random()) + f.rate * dt;
          if (v >= 1) {
            acc.set(k, v - 1);
            const back = f.back && (flip++ % 2 === 1);
            send(k, back ? -1 : 1);
          } else acc.set(k, v);
        });
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += dt / p.dur;
        const known = st.wireSet.has(p.key);
        if (p.t >= 1 || !known) {
          p.g1.remove(); p.g2.remove(); packets.splice(i, 1);
          if (known && p.label) { ibd.pulse(p.to); onHop && onHop(p); }
          p.resolve(known);
          continue;
        }
        const tt = p.dir > 0 ? p.t : 1 - p.t;
        const e = tt < 0 ? 0 : tt;
        place(p.g1, ibd.wireEls.get(p.key), e);
        place(p.g2, d3.mode === 'xray' ? d3.linkEls.get(p.key) : null, e);
      }
    }

    /* A chain of hops: { wire, dir, label } for an item flow, { at, label, act, wait } for a part at work. */
    async function chain(steps, st, log) {
      for (const s of steps) {
        if (s.wire) {
          if (!st().wireSet.has(s.wire)) { log && log({ broken: true, text: `Stopped: no connector for ${s.label}` }); return false; }
          log && log({ text: s.label, from: s.from, to: s.to, fam: L.IF[L.IBD.portDef(...s.wire.split('>')[0].split('.')).iface].fam });
          const ok = await send(s.wire, s.dir || 1, s.label);
          if (!ok) return false;
        } else {
          if (s.at) { ibd.pulse(s.at); d3.act(s.at, s.act); }
          if (s.fx) s.fx();
          if (s.note) log && log({ note: true, text: s.note, at: s.at });
          await new Promise((r) => setTimeout(r, s.wait || 450));
        }
      }
      return true;
    }

    function clear() { packets.splice(0).forEach((p) => { p.g1.remove(); p.g2.remove(); p.resolve(false); }); }

    return { tick, send, chain, clear };
  }

  Object.assign(L, { Traffic: { create } });
})();
