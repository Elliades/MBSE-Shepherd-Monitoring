/* The diagrams of the demo tool, drawn in SVG. Nothing here is editable: each diagram is a fixed
   drawing whose shapes point back to model elements (data-el), and the simulation lights them
   up (data-sim for states, data-tr for transitions, data-node for activity nodes, data-sig for
   what carries a signal).

   window.ToolDiagrams.DEFS                   key -> { kind, title, frame, w, h, stage?, draw(api, ctx) }
   window.ToolDiagrams.render(key, ctx)       ctx = { built: Set of stage keys, born: stage key | null } -> <svg> */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const M = window.ToolModel;

  function E(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, lines, cls, anchor, lh) {
    const list = [].concat(lines).flatMap((l) => String(l).split('\n'));
    const t = E('text', { x, y, class: cls || '', 'text-anchor': anchor || 'middle' }, parent);
    list.forEach((line, i) => {
      const s = E('tspan', { x, dy: i ? (lh || 14) : 0 }, t);
      s.textContent = line;
    });
    return t;
  }
  /* The model element a shape stands for, found by name and type. */
  const refs = new Map();
  function ref(name, type) {
    const key = type + '|' + name;
    if (!refs.has(key)) {
      let found = null;
      M.walk((nd) => { if (!found && nd.name === name && nd.type === type) found = nd; });
      refs.set(key, found ? found.id : null);
    }
    return refs.get(key);
  }
  /* Arrowhead at the end of a polyline: 'open' (two strokes) or 'tri' (filled). */
  function head(g, pts, kind) {
    const [x2, y2] = pts[pts.length - 1];
    const [x1, y1] = pts[pts.length - 2];
    const a = Math.atan2(y2 - y1, x2 - x1);
    const L = 10;
    const p = (da) => [x2 - L * Math.cos(a + da), y2 - L * Math.sin(a + da)];
    const [l, r] = [p(0.45), p(-0.45)];
    if (kind === 'tri') E('path', { d: `M${x2} ${y2}L${l[0]} ${l[1]}L${r[0]} ${r[1]}Z`, class: 'ah-fill' }, g);
    else E('path', { d: `M${l[0]} ${l[1]}L${x2} ${y2}L${r[0]} ${r[1]}`, class: 'ah' }, g);
  }

  /* ───────── drawing API given to each diagram ───────── */
  function makeApi(svg, ctx) {
    function g(o, cls) {
      if (o.stage && !ctx.built.has(o.stage)) return null;
      if (o.until && ctx.built.has(o.until)) return null;
      const grp = E('g', {
        class: cls + (o.stage && o.stage === ctx.born ? ' born' : '') + (o.el ? ' pick' : ''),
        'data-el': o.el || undefined,
        'data-sim': o.sim || undefined,
        'data-tr': o.tr || undefined,
        'data-node': o.node || undefined,
        'data-sig': o.sig || undefined
      }, svg);
      return grp;
    }
    return {
      ref,
      svg,
      g,
      state(o) {
        const grp = g(o, 'st' + (o.comp ? ' comp' : ''));
        if (!grp) return;
        E('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 10, class: 'st-box' }, grp);
        if (o.comp) {
          txt(grp, o.x + o.w / 2, o.y + 17, o.name, 'st-name');
        } else if (o.does) {
          txt(grp, o.x + o.w / 2, o.y + 15, o.name, 'st-name');
          E('line', { x1: o.x, y1: o.y + 21, x2: o.x + o.w, y2: o.y + 21, class: 'st-sep' }, grp);
          txt(grp, o.x + 7, o.y + 36, 'do / ' + o.does, 'st-do' + (o.doStage && o.doStage === ctx.born ? ' born' : ''), 'start');
        } else {
          const lines = String(o.name).split('\n');
          txt(grp, o.x + o.w / 2, o.y + o.h / 2 + 4 - (lines.length - 1) * 7, lines, 'st-name');
        }
      },
      pseudo(o) {
        const grp = g(o, 'ps');
        if (!grp) return;
        if (o.kind === 'final') {
          E('circle', { cx: o.x, cy: o.y, r: 11, class: 'ps-ring' }, grp);
          E('circle', { cx: o.x, cy: o.y, r: 6.5, class: 'ps-dot' }, grp);
        } else if (o.kind === 'decision') {
          E('path', { d: `M${o.x} ${o.y - 16}L${o.x + 16} ${o.y}L${o.x} ${o.y + 16}L${o.x - 16} ${o.y}Z`, class: 'ps-dec' }, grp);
        } else {
          E('circle', { cx: o.x, cy: o.y, r: 9, class: 'ps-dot' }, grp);
        }
      },
      edge(o) {
        const grp = g(o, 'ed ' + (o.cls || ''));
        if (!grp) return;
        const d = o.pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join('');
        E('path', { d, class: 'ed-hit' }, grp);
        E('path', { d, class: 'ed-line' + (o.dashed ? ' dashed' : '') }, grp);
        if (o.head !== 'none') head(grp, o.pts, o.head || 'open');
        if (o.label) txt(grp, o.lx, o.ly, o.label, 'ed-lbl', o.anchor || 'middle', 13);
        if (o.flow) {
          const f = o.flow;
          const r = { r: 0, l: 180, d: 90, u: -90 }[f.dir || 'r'];
          E('path', { d: 'M-6 -5L6 0L-6 5Z', transform: `translate(${f.x} ${f.y}) rotate(${r})`, class: 'flow-ah' }, grp);
          if (f.label) txt(grp, f.lx !== undefined ? f.lx : f.x, f.ly !== undefined ? f.ly : f.y + 16, f.label, 'flow-lbl', f.anchor || 'middle', 13);
        }
        return grp;
      },
      part(o) {
        const grp = g(o, 'part');
        if (!grp) return;
        E('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 3, class: 'part-box' }, grp);
        if (o.glyph) GLYPHS[o.glyph](grp, o.x + o.w / 2, o.y + (o.h - 22) / 2 + 2, Math.min(o.w, o.h - 26) * (o.glyphScale || 0.8));
        txt(grp, o.x + o.w / 2, o.glyph ? o.y + o.h - 9 : o.y + o.h / 2 + 4, o.name, 'part-name');
      },
      /* a part shown as its image only, with its name under it: { x, y, w, h (the image box), glyph, name, hatch } */
      icon(o) {
        const grp = g(o, 'part icon');
        if (!grp) return;
        E('rect', { x: o.x, y: o.y, width: o.w, height: o.h, class: 'part-box bare', fill: o.hatch ? `url(#hatch-${svg.dataset.key})` : undefined }, grp);
        GLYPHS[o.glyph](grp, o.x + o.w / 2, o.y + o.h / 2, Math.min(o.w, o.h) * (o.glyphScale || 0.9));
        txt(grp, o.x + o.w / 2, o.y + o.h + 16, o.name, 'part-name');
      },
      port(o) {
        const grp = g(o, 'port');
        if (!grp) return;
        E('rect', { x: o.x - 6, y: o.y - 6, width: 12, height: 12, class: 'port-box' }, grp);
        const r = { r: 0, l: 180, d: 90, u: -90 }[o.dir || 'r'];
        E('path', { d: 'M-3.5 0H3.5M1 -2.5L3.5 0L1 2.5', transform: `translate(${o.x} ${o.y}) rotate(${r})`, class: 'port-dir' }, grp);
        if (o.label) txt(grp, o.lx, o.ly, o.label, 'port-lbl', o.anchor || 'start');
      },
      actor(o) {
        const grp = g(o, 'actor');
        if (!grp) return;
        const { x, y } = o;
        E('circle', { cx: x, cy: y - 34, r: 9, class: 'actor-line' }, grp);
        E('path', { d: `M${x} ${y - 25}V${y}M${x - 17} ${y - 16}H${x + 17}M${x} ${y}L${x - 13} ${y + 20}M${x} ${y}L${x + 13} ${y + 20}`, class: 'actor-line' }, grp);
        txt(grp, x, y + 38, o.name, 'actor-name');
      },
      uc(o) {
        const grp = g(o, 'uc');
        if (!grp) return;
        E('ellipse', { cx: o.x, cy: o.y, rx: o.rx || 92, ry: o.ry || 32, class: 'uc-box' }, grp);
        const lines = String(o.name).split('\n');
        txt(grp, o.x, o.y + 4 - (lines.length - 1) * 7, lines, 'uc-name');
      },
      boundary(o) {
        const grp = g(o, 'bnd');
        if (!grp) return;
        E('rect', { x: o.x, y: o.y, width: o.w, height: o.h, class: 'bnd-box' }, grp);
        txt(grp, o.x + 12, o.y + 22, o.name, 'bnd-name', 'start');
      },
      action(o) {
        const grp = g(o, 'act' + (o.send ? ' send' : ''));
        if (!grp) return;
        if (o.send) {
          const { x, y, w, h } = o;
          E('path', { d: `M${x} ${y}H${x + w - 16}L${x + w} ${y + h / 2}L${x + w - 16} ${y + h}H${x}Z`, class: 'act-box' }, grp);
          txt(grp, x + (w - 16) / 2, y + h / 2 + 4 - (String(o.name).split('\n').length - 1) * 7, o.name, 'act-name');
        } else {
          E('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 12, class: 'act-box' }, grp);
          txt(grp, o.x + o.w / 2, o.y + o.h / 2 + 4 - (String(o.name).split('\n').length - 1) * 7, o.name, 'act-name');
        }
      },
      note(o) {
        const grp = g(o, 'note');
        if (!grp) return;
        const { x, y, w, h } = o;
        E('path', { d: `M${x} ${y}H${x + w - 16}L${x + w} ${y + 16}V${y + h}H${x}Z M${x + w - 16} ${y}V${y + 16}H${x + w}`, class: 'note-box' }, grp);
        txt(grp, x + 14, y + 28, o.lines, 'note-txt', 'start', 19);
      },
      line(o) {
        const grp = g(o, 'sep');
        if (!grp) return;
        E('line', { x1: o.x1, y1: o.y1, x2: o.x2, y2: o.y2, class: 'sep-line' }, grp);
      },
      lifeline(o) {
        const grp = g(o, 'll');
        if (!grp) return;
        E('line', { x1: o.x, y1: o.y + 44, x2: o.x, y2: o.bottom, class: 'll-line' }, grp);
        E('rect', { x: o.x - 85, y: o.y, width: 170, height: 44, rx: 3, class: 'll-head' }, grp);
        txt(grp, o.x, o.y + 27 - (String(o.name).split('\n').length - 1) * 7, o.name, 'll-name');
        (o.bars || []).forEach((b) => E('rect', { x: o.x - 6, y: b[0], width: 12, height: b[1], class: 'll-bar' }, grp));
      },
      text(o) {
        const grp = g(o, 'tx');
        if (!grp) return;
        txt(grp, o.x, o.y, o.text, o.cls || 'tx-plain', o.anchor || 'start');
      }
    };
  }

  /* ───────── glyphs drawn inside the parts of the context diagram ───────── */
  const GLYPHS = {
    satellite(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100}) rotate(-35)` }, p);
      E('rect', { x: -16, y: -12, width: 32, height: 24, rx: 6, class: 'gl-accent' }, g);
      E('rect', { x: -52, y: -9, width: 30, height: 18, class: 'gl-panel' }, g);
      E('rect', { x: 22, y: -9, width: 30, height: 18, class: 'gl-panel' }, g);
      E('path', { d: 'M0 12V28M-6 34a8 8 0 0 1 12 0', class: 'gl-line' }, g);
    },
    cloud(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('circle', { cx: -14, cy: -14, r: 15, class: 'gl-sun' }, g);
      E('path', { d: 'M-24 24a16 16 0 0 1 2-31.8A21 21 0 0 1 18-14a17 17 0 0 1 6 38z', class: 'gl-cloud' }, g);
      E('path', { d: 'M-16 34l-5 12M-2 34l-5 12M12 34l-5 12', class: 'gl-rain' }, g);
    },
    console(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('rect', { x: -40, y: -38, width: 80, height: 76, rx: 6, class: 'gl-frame' }, g);
      [[-18, 10], [0, -12], [18, 4]].forEach(([x, k]) => {
        E('path', { d: `M${x} -24V24`, class: 'gl-line' }, g);
        E('rect', { x: x - 7, y: k - 5, width: 14, height: 10, rx: 3, class: 'gl-knob' }, g);
      });
    },
    person(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('path', { d: 'M-17 -10a17 17 0 0 1 34 0z', class: 'gl-accent' }, g);
      E('circle', { cx: 0, cy: -4, r: 14, class: 'gl-solid' }, g);
      E('path', { d: 'M-34 40c2-22 14-30 34-30s32 8 34 30z', class: 'gl-solid' }, g);
    },
    bear(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('path', {
        class: 'gl-solid',
        d: 'M-46 4C-50-14-40-28-22-30C-14-38 2-38 12-30C20-30 26-34 32-36L36-42L42-36C50-34 54-28 58-26L56-20C50-20 46-18 44-14C42-6 40 2 40 8L44 30H34L28 12C20 14 8 14 0 12L-4 30H-14L-12 10C-20 12-28 12-34 10L-30 30H-40L-42 12C-46 10-47 8-46 4Z'
      }, g);
    },
    sheep(p, cx, cy, s) {
      const g = E('g', { class: 'glyph', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('path', { d: 'M-22 14V36M-8 16V38M12 16V38M24 12V34', class: 'gl-leg' }, g);
      const wool = [[-26, -4, 16], [-12, -14, 17], [6, -14, 17], [20, -4, 15], [6, 8, 16], [-14, 8, 16]];
      wool.forEach(([x, y, r]) => E('circle', { cx: x, cy: y, r: r + 3, class: 'gl-solid' }, g));
      wool.forEach(([x, y, r]) => E('circle', { cx: x, cy: y, r, class: 'gl-wool' }, g));
      E('ellipse', { cx: 38, cy: -10, rx: 11, ry: 14, class: 'gl-solid' }, g);
      E('ellipse', { cx: 30, cy: -20, rx: 7, ry: 4, transform: 'rotate(-30 30 -20)', class: 'gl-solid' }, g);
    },
    drone(p, cx, cy, s) {
      const g = E('g', { class: 'glyph drone', transform: `translate(${cx} ${cy}) scale(${s / 100})` }, p);
      E('path', { d: 'M-30 -30L30 30M30 -30L-30 30', class: 'gl-arm' }, g);
      [[-30, -30], [30, -30], [-30, 30], [30, 30]].forEach(([x, y]) => {
        E('circle', { cx: x, cy: y, r: 17, class: 'gl-rotor' }, g);
        E('path', { d: `M${x - 11} ${y + 6}L${x + 11} ${y - 6}`, class: 'gl-prop' }, g);
      });
      E('rect', { x: -11, y: -11, width: 22, height: 22, rx: 5, class: 'gl-body' }, g);
    }
  };

  /* ───────── the diagrams ───────── */
  const STM_TODO = [
    'TO DO',
    '1. Create the state Configured',
    '2. Transitions from Configured to Unconfigured',
    '    and to Ready for Mission',
    '3. Give them their signals: FlightPlan,',
    '    FlightPlan Check Failed, Ready for mission',
    '4. Allocate Load Flight Plan as do activity',
    '5. Define Load Flight Plan, then run the simulation'
  ];

  const DEFS = {
    stm: {
      kind: 'stm', title: 'SOI - Pasture Sentinel', frame: ['stm', '[State Machine] SOI - Pasture Sentinel'], w: 1170, h: 860,
      draw(d) {
        const S = (o) => d.state(Object.assign({ el: o.sim && o.name ? d.ref(o.name.replace('\n', ' '), 'state') : undefined }, o));
        d.pseudo({ x: 247, y: 66 });
        d.edge({ pts: [[247, 75], [247, 146]] });
        S({ x: 188, y: 104, w: 378, h: 258, name: 'Undeployed', comp: true, sim: 's-undeployed' });
        S({ x: 195, y: 146, w: 104, h: 48, name: 'Off', sim: 's-off' });
        S({ x: 390, y: 150, w: 104, h: 28, name: 'Unconfigured', sim: 's-unconf' });
        S({ x: 392, y: 216, w: 124, h: 44, name: 'Configured', does: 'Load Flight Plan', sim: 's-conf', stage: 'C' });
        S({ x: 386, y: 294, w: 130, h: 54, name: 'Ready for Mission', does: 'Start subsystems', sim: 's-ready' });
        d.edge({ pts: [[299, 164], [390, 164]], label: 'Start SOI', lx: 344, ly: 156, tr: 't-start', sig: 'Start SOI' });
        d.edge({ pts: [[478, 178], [478, 216]], label: 'FlightPlan', lx: 486, ly: 201, anchor: 'start', tr: 't-fp', sig: 'FlightPlan', stage: 'C' });
        d.edge({ pts: [[420, 216], [420, 178]], label: 'FlightPlan Check Failed', lx: 412, ly: 201, anchor: 'end', tr: 't-fail', sig: 'FlightPlan Check Failed', stage: 'C' });
        d.edge({ pts: [[450, 260], [450, 294]], label: 'Ready for mission', lx: 458, ly: 282, anchor: 'start', tr: 't-ready', sig: 'Ready for mission', stage: 'C' });
        d.note({ x: 640, y: 40, w: 470, h: 196, lines: STM_TODO, until: 'C' });
        d.edge({ pts: [[425, 348], [425, 407]], label: 'Start Sheep Guard Mission', lx: 434, ly: 384, anchor: 'start', tr: 't-mission', sig: 'Start Sheep Guard Mission' });

        S({ x: 176, y: 407, w: 966, h: 420, name: 'Deployed', comp: true, sim: 's-deployed' });
        d.pseudo({ x: 194, y: 513 });
        d.edge({ pts: [[203, 513], [222, 513]] });
        S({ x: 222, y: 449, w: 140, h: 154, name: 'Going to Safe Area', does: 'Going to Safe Area', sim: 's-gsa' });
        d.edge({ pts: [[362, 488], [462, 488]], label: 'Start Patrolling', lx: 412, ly: 480, tr: 't-patrol', sig: 'Start Patrolling' });
        S({ x: 462, y: 449, w: 230, h: 280, name: 'Patrolling', comp: true, sim: 's-patrol' });
        d.line({ x1: 462, y1: 566, x2: 692, y2: 566 });
        d.line({ x1: 462, y1: 664, x2: 692, y2: 664 });
        d.pseudo({ x: 488, y: 520 });
        d.edge({ pts: [[497, 520], [526, 520]] });
        S({ x: 526, y: 494, w: 142, h: 48, name: 'Perimeter watch', does: 'Watch Perimeter', sim: 's-perim' });
        d.pseudo({ x: 488, y: 614 });
        d.edge({ pts: [[497, 614], [526, 614]] });
        S({ x: 526, y: 590, w: 142, h: 48, name: 'Sheep Monitoring', does: 'Sheep monitoring', sim: 's-sheep' });
        d.pseudo({ x: 488, y: 700 });
        d.edge({ pts: [[497, 700], [526, 700]] });
        S({ x: 526, y: 680, w: 142, h: 40, name: 'Predator\nMonitoring', sim: 's-predmon' });
        d.edge({ pts: [[692, 512], [834, 512]], label: ['Predator Detected inside', 'tracking perimeter'], lx: 763, ly: 486, tr: 't-predator', sig: 'Predator Detected inside tracking perimeter' });
        S({ x: 834, y: 449, w: 278, h: 250, name: 'Predator Detected', comp: true, sim: 's-pred' });
        d.pseudo({ x: 960, y: 494 });
        d.edge({ pts: [[960, 503], [960, 532]] });
        S({ x: 882, y: 532, w: 176, h: 46, name: 'Predator tracking', does: 'Start Predator Tracking', sim: 's-track' });
        S({ x: 864, y: 626, w: 220, h: 50, name: 'Predator counteraction', does: 'Trigger predator counter actions', sim: 's-counter' });
        d.edge({ pts: [[930, 578], [930, 626]], tr: 't-pc1' });
        d.edge({ pts: [[1012, 626], [1012, 578]], tr: 't-pc2' });
        d.line({ x1: 176, y1: 752, x2: 1142, y2: 752 });
        d.pseudo({ x: 240, y: 790 });
        d.edge({ pts: [[249, 790], [308, 790]] });
        S({ x: 308, y: 770, w: 112, h: 40, name: 'Mission\nMonitoring', sim: 's-mm' });
        d.edge({ pts: [[1025, 407], [1025, 366]], label: 'Crashed Detected', lx: 1033, ly: 392, anchor: 'start', tr: 't-crash', sig: 'Crashed Detected' });
        S({ x: 953, y: 322, w: 160, h: 44, name: 'Crashed', does: 'Start Emergency Mode', sim: 's-crashed' });
      }
    },

    'op-context': {
      kind: 'ibd', title: 'Operational Context', frame: ['ibd', '[Block] Operational Context [ Operational Context ]'], w: 1560, h: 870,
      draw(d) {
        const blk = (name) => d.ref(name, 'block');
        d.icon({ x: 350, y: 18, w: 160, h: 150, glyph: 'satellite', name: 'GNSS : GNSS', el: blk('GNSS') });
        d.icon({ x: 1110, y: 40, w: 170, h: 160, glyph: 'cloud', glyphScale: 1.05, name: 'weather : Weather', el: blk('Weather') });
        d.icon({ x: 60, y: 280, w: 190, h: 180, glyph: 'console', glyphScale: 1.15, name: 'groundStation : Ground Station', el: blk('Ground Station') });
        d.icon({ x: 85, y: 700, w: 130, h: 120, glyph: 'person', glyphScale: 1.15, name: 'uAV operator : UAV operator', el: blk('UAV operator') });
        d.icon({ x: 580, y: 270, w: 460, h: 460, glyph: 'drone', glyphScale: 0.95, hatch: true, name: 'UAV : SOI - Pasture Sentinel', el: blk('SOI - Pasture Sentinel') });
        d.icon({ x: 1310, y: 350, w: 160, h: 110, glyph: 'bear', glyphScale: 1.45, name: 'bear : Bear', el: blk('Bear') });
        d.icon({ x: 1320, y: 590, w: 140, h: 110, glyph: 'sheep', glyphScale: 1.25, name: 'sheep : Sheep', el: blk('Sheep') });

        /* environment */
        d.edge({ pts: [[430, 206], [430, 222], [692, 222], [692, 258]], head: 'none', cls: 'conn', flow: { x: 575, y: 222, dir: 'r', label: 'GPS_Position', ly: 238 } });
        d.port({ x: 430, y: 200, dir: 'd', label: 'signal_gnss : ~IF_GPS_Wave', lx: 440, ly: 214 });
        d.port({ x: 692, y: 264, dir: 'd', label: 'EW : IF_GPS_Wave', lx: 700, ly: 254 });
        d.edge({ pts: [[1056, 122], [858, 122], [858, 258]], head: 'none', cls: 'conn', flow: { x: 890, y: 122, dir: 'l', label: 'Wind', ly: 138 } });
        d.port({ x: 1062, y: 122, dir: 'l', label: 'wind : ~IF_Wind_Speed', lx: 1050, ly: 113, anchor: 'end' });
        d.port({ x: 858, y: 264, dir: 'd', label: 'wind : IF_Wind_Speed', lx: 866, ly: 254 });

        /* ground station */
        d.edge({ pts: [[278, 300], [568, 300]], head: 'none', cls: 'conn', flow: { x: 418, y: 300, dir: 'l', label: 'WiFi_NavData', ly: 315 } });
        d.port({ x: 272, y: 300, dir: 'l', label: 'data port : ~IF_WiFi_NavData', lx: 272, ly: 285 });
        d.port({ x: 574, y: 300, dir: 'l', label: 'wifi_navData : IF_WiFi_NavData', lx: 566, ly: 327, anchor: 'end' });
        d.edge({ pts: [[278, 358], [568, 358]], head: 'none', cls: 'conn', flow: { x: 418, y: 358, dir: 'r', label: 'WiFi_Control_Command', ly: 373 } });
        d.port({ x: 272, y: 358, dir: 'r', label: 'gb_wifi_cmd : ~IF_WiFi_Cmd', lx: 280, ly: 348 });
        d.port({ x: 574, y: 358, dir: 'r', label: 'wifi_cmd : IF_WiFi_Cmd', lx: 566, ly: 385, anchor: 'end' });
        d.edge({ pts: [[278, 423], [568, 423]], head: 'none', cls: 'conn', stage: 'IF', sig: 'FlightPlan', flow: { x: 418, y: 423, dir: 'r', label: 'FlightPlan', ly: 438 }, el: d.ref('IF_FlightPlan', 'iface') });
        d.port({ x: 272, y: 423, dir: 'r', label: 'wifi_fp : ~IF_FlightPlan', lx: 280, ly: 413, stage: 'IF', el: d.ref('IF_FlightPlan', 'iface') });
        d.port({ x: 574, y: 423, dir: 'r', label: 'wifi_fp : IF_FlightPlan', lx: 566, ly: 450, anchor: 'end', stage: 'IF', el: d.ref('IF_FlightPlan', 'iface') });

        /* operator */
        d.edge({ pts: [[155, 684], [155, 504]], head: 'none', cls: 'conn', sig: 'Start SOI', flow: { x: 155, y: 590, dir: 'u', label: ['Operator_Action_on_Start_Stop_Mission_Button,', 'Operator_Action_On_Send_FlightPlan_Button,', 'Operator_Action_on_Start_Stop_Button'], lx: 290, ly: 578 } });
        d.port({ x: 155, y: 498, dir: 'u', label: 'cmd : IF_Operator_Command_On_GS', lx: 168, ly: 503 });
        d.port({ x: 155, y: 690, dir: 'u', label: 'cmdGS : ~IF_Operator_Command_On_GS', lx: 168, ly: 686 });
        d.edge({ pts: [[242, 768], [434, 768], [434, 634], [568, 634]], head: 'none', cls: 'conn', flow: { x: 434, y: 706, dir: 'u', label: 'Operator_Action_on_Start_Stop_Button', lx: 442, ly: 752, anchor: 'start' } });
        d.port({ x: 236, y: 768, dir: 'r', label: 'cmd_drone : ~IF_Operator_Command_On_Drone', lx: 244, ly: 792 });
        d.port({ x: 574, y: 634, dir: 'r', label: 'cmd : IF_Operator_Command_On_Drone', lx: 566, ly: 624, anchor: 'end' });

        /* the flock and its predator */
        d.edge({ pts: [[1294, 368], [1052, 368]], head: 'none', cls: 'conn', sig: 'Predator Detected inside tracking perimeter', flow: { x: 1173, y: 368, dir: 'l', label: 'Bear Signature', ly: 383 } });
        d.port({ x: 1046, y: 368, dir: 'l', label: 'light : ~IF_Light', lx: 1056, ly: 359 });
        d.port({ x: 1300, y: 368, dir: 'l', label: 'light : IF_Light', lx: 1292, ly: 359, anchor: 'end' });
        d.edge({ pts: [[1052, 433], [1294, 433]], head: 'none', cls: 'conn', flow: { x: 1173, y: 433, dir: 'r', label: 'Light burst', ly: 448 } });
        d.port({ x: 1046, y: 433, dir: 'r', label: 'p1 : IF_StrongLight', lx: 1056, ly: 424 });
        d.port({ x: 1300, y: 433, dir: 'r', label: 'p1 : ~IF_StrongLight', lx: 1292, ly: 424, anchor: 'end' });
        d.edge({ pts: [[1052, 488], [1294, 488]], head: 'none', cls: 'conn', flow: { x: 1173, y: 488, dir: 'r', label: 'Sound burst', ly: 503 } });
        d.port({ x: 1046, y: 488, dir: 'r', label: 'p11 : IF_Loud_Sound', lx: 1056, ly: 479 });
        d.port({ x: 1300, y: 488, dir: 'r', label: 'p11 : ~IF_Loud_Sound', lx: 1292, ly: 479, anchor: 'end' });
        d.edge({ pts: [[1294, 640], [1052, 640]], head: 'none', cls: 'conn', sig: 'Start Patrolling', flow: { x: 1173, y: 640, dir: 'l', label: 'Sheep Signature', ly: 655 } });
        d.port({ x: 1046, y: 640, dir: 'l', label: 'flock : ~IF_Light', lx: 1056, ly: 631 });
        d.port({ x: 1300, y: 640, dir: 'l', label: 'light : IF_Light', lx: 1292, ly: 631, anchor: 'end' });
      }
    },

    uc: {
      kind: 'ucd', title: 'Use Cases and Scenarios', frame: ['uc', '[Package] C - Use Cases and Scenarios'], w: 1100, h: 640,
      draw(d) {
        d.boundary({ x: 300, y: 50, w: 600, h: 550, name: 'SOI - Pasture Sentinel', el: d.ref('SOI - Pasture Sentinel', 'block') });
        d.text({ x: 320, y: 100, text: '1. Preparation phase', cls: 'tx-group' });
        d.text({ x: 320, y: 300, text: '2. Mission phase', cls: 'tx-group' });
        d.uc({ x: 450, y: 170, name: 'Prepare Mission', el: d.ref('Prepare Mission', 'usecase') });
        d.uc({ x: 730, y: 170, name: 'Parameter Mission', el: d.ref('Parameter Mission', 'usecase') });
        d.uc({ x: 450, y: 390, name: 'Guard the Flock', el: d.ref('Guard the Flock', 'usecase') });
        d.uc({ x: 730, y: 350, name: 'Monitor the Flock', el: d.ref('Monitor the Flock', 'usecase') });
        d.uc({ x: 730, y: 500, name: 'Counter a Predator', el: d.ref('Counter a Predator', 'usecase') });
        d.edge({ pts: [[542, 170], [638, 170]], dashed: true, label: '«include»', lx: 590, ly: 160 });
        d.edge({ pts: [[530, 375], [645, 358]], dashed: true, label: '«include»', lx: 588, ly: 352 });
        d.edge({ pts: [[660, 482], [520, 410]], dashed: true, label: '«extend»', lx: 610, ly: 468, anchor: 'start' });
        d.actor({ x: 150, y: 200, name: 'Mission Operator', el: d.ref('Mission Operator', 'actor') });
        d.actor({ x: 150, y: 440, name: 'Shepherd', el: d.ref('Shepherd', 'actor') });
        d.actor({ x: 1010, y: 500, name: 'Predator', el: d.ref('Predator', 'actor') });
        d.edge({ pts: [[172, 180], [358, 170]], head: 'none' });
        d.edge({ pts: [[172, 196], [366, 375]], head: 'none' });
        d.edge({ pts: [[172, 430], [358, 395]], head: 'none' });
        d.edge({ pts: [[988, 490], [822, 500]], head: 'none' });
      }
    },

    sd1: {
      kind: 'sd', title: '[SD 1] Loading the flight plan', frame: ['sd', '[Interaction] [SD 1] Loading the flight plan'], w: 900, h: 720, stage: 'A',
      draw(d) {
        const X = { op: 140, gs: 400, soi: 640 };
        d.lifeline({ x: X.op, y: 50, name: 'Mission Operator', bottom: 690, bars: [[146, 92], [646, 30]], el: d.ref('Mission Operator', 'actor') });
        d.lifeline({ x: X.gs, y: 50, name: 'Ground station', bottom: 690, bars: [[146, 150], [574, 90]], el: d.ref('Ground Station', 'block') });
        d.lifeline({ x: X.soi, y: 50, name: 'SOI - Pasture\nSentinel', bottom: 690, bars: [[264, 300]], el: d.ref('SOI - Pasture Sentinel', 'block') });
        const msg = (from, to, y, label, sig) => {
          const a = X[from];
          const b = X[to];
          const dir = b > a ? 1 : -1;
          d.edge({ pts: [[a + 6 * dir, y], [b - 7 * dir, y]], head: 'tri', cls: 'msg', label, lx: (a + b) / 2, ly: y - 8 - ([].concat(label).length - 1) * 13, sig });
        };
        const self = (at, y, label) => {
          const x = X[at] + 6;
          d.edge({ pts: [[x, y], [x + 46, y], [x + 46, y + 32], [x + 2, y + 32]], head: 'tri', cls: 'msg', label, lx: x + 54, ly: y + 12 - ([].concat(label).length - 1) * 6, anchor: 'start' });
        };
        msg('op', 'gs', 160, '1: Start SOI', 'Start SOI');
        msg('op', 'gs', 222, '2: FlightPlan');
        msg('gs', 'soi', 284, '3: FlightPlan', 'FlightPlan');
        self('soi', 330, '4: Load FlightPlan');
        self('soi', 420, ['5: Check FlightPlan', 'Perimeter']);
        msg('soi', 'gs', 560, ['6: Success FlightPlan', 'Loading Notification'], 'Ready for mission');
        msg('gs', 'op', 650, ['7: Mission Ready', 'To Start Notification']);
      }
    },

    'ad-lfp': {
      kind: 'ad', title: 'Load Flight Plan', frame: ['act', '[Activity] Load Flight Plan'], w: 900, h: 640, stage: 'D',
      draw(d) {
        const fn = (name) => d.ref(name, 'activity');
        d.pseudo({ x: 450, y: 66, node: 'n-init' });
        d.edge({ pts: [[450, 76], [450, 104]], dashed: true, node: 'f-0' });
        d.action({ x: 365, y: 104, w: 170, h: 50, name: 'Read FlightPlan', node: 'n-read', el: fn('Read FlightPlan') });
        d.edge({ pts: [[450, 154], [450, 196]], node: 'f-1', label: 'FlightPlan', lx: 460, ly: 180, anchor: 'start' });
        d.action({ x: 365, y: 196, w: 170, h: 50, name: 'Check FlightPlan', node: 'n-check', el: fn('Check FlightPlan') });
        d.edge({ pts: [[450, 246], [450, 284]], dashed: true, node: 'f-2' });
        d.pseudo({ x: 450, y: 300, kind: 'decision', node: 'n-dec' });
        d.edge({ pts: [[466, 300], [640, 300], [640, 340]], dashed: true, node: 'f-ok', label: '[in range]', lx: 552, ly: 292 });
        d.action({ x: 555, y: 340, w: 170, h: 50, name: 'Send Mission Ready', node: 'n-smr', el: fn('Send Mission Ready') });
        d.edge({ pts: [[640, 390], [640, 430]], dashed: true, node: 'f-ok2' });
        d.action({ x: 548, y: 430, w: 200, h: 50, name: 'Ready for mission', send: true, node: 'n-send-ok', sig: 'Ready for mission', el: d.ref('Ready for mission', 'signal') });
        d.edge({ pts: [[640, 480], [640, 548]], dashed: true, node: 'f-ok3' });
        d.pseudo({ x: 640, y: 560, kind: 'final', node: 'n-end-ok' });
        d.edge({ pts: [[434, 300], [260, 300], [260, 430]], dashed: true, node: 'f-ko', label: '[out of range]', lx: 346, ly: 292 });
        d.action({ x: 150, y: 430, w: 236, h: 50, name: 'FlightPlan Check Failed', send: true, node: 'n-send-ko', sig: 'FlightPlan Check Failed', el: d.ref('FlightPlan Check Failed', 'signal') });
        d.edge({ pts: [[260, 480], [260, 548]], dashed: true, node: 'f-ko2' });
        d.pseudo({ x: 260, y: 560, kind: 'final', node: 'n-end-ko' });
        d.text({ x: 40, y: 610, text: 'Control flows dashed, object flows solid.', cls: 'tx-hint' });
      }
    },

    alloc: {
      kind: 'matrix', title: 'Function Allocation', w: 1000, h: 610,
      draw(d, ctx) {
        const COLS = ['Flight Controller', 'Mission Computer', 'Navigation System', 'WiFi System', 'Camera System', 'Power System'];
        const ROWS = [
          ['Going to Safe Area', 0], ['Start subsystems', 1], ['Watch Perimeter', 4], ['Sheep monitoring', 4],
          ['Start Predator Tracking', 1], ['Trigger predator counter actions', 0], ['Start Emergency Mode', 0],
          ['Load Flight Plan', 1, 'B'], ['Receive FlightPlan', 3, 'B'], ['Read FlightPlan', 2, 'B'],
          ['Check FlightPlan', 2, 'B'], ['Send Mission Ready', 1, 'B']
        ];
        const x0 = 40;
        const y0 = 70;
        const rw = 260;
        const cw = 110;
        const rh = 34;
        const hh = 74;
        const svg = d.svg;
        const T = (p, x, y, s, cls, anchor) => { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', x); t.setAttribute('y', y); t.setAttribute('class', cls); t.setAttribute('text-anchor', anchor || 'start'); t.textContent = s; p.appendChild(t); return t; };
        const head = E('g', { class: 'mx' }, svg);
        T(head, x0, 34, 'Function Allocation', 'mx-title');
        T(head, x0, 54, 'Rows: functions (Activity)  ·  Columns: subsystems (Block)  ·  Dependency: Allocate', 'mx-sub');
        const rows = ROWS.filter((r) => !r[2] || ctx.built.has(r[2]));
        E('rect', { x: x0, y: y0, width: rw + cw * COLS.length, height: hh + rh * rows.length, class: 'mx-grid' }, head);
        COLS.forEach((c, i) => {
          const cx = x0 + rw + cw * i;
          E('rect', { x: cx, y: y0, width: cw, height: hh, class: 'mx-colhead' }, head);
          const g = E('g', { class: 'pick', 'data-el': d.ref(c, 'block') }, head);
          const [a, b] = c.split(' ');
          T(g, cx + cw / 2, y0 + hh / 2 - 2, a, 'mx-col', 'middle');
          T(g, cx + cw / 2, y0 + hh / 2 + 14, b || '', 'mx-col', 'middle');
        });
        rows.forEach((r, j) => {
          const y = y0 + hh + rh * j;
          const isNew = !!r[2];
          const g = E('g', { class: 'mx-row pick' + (isNew && ctx.born === 'B' ? ' born' : ''), 'data-el': d.ref(r[0], 'activity') }, svg);
          E('rect', { x: x0, y, width: rw, height: rh, class: 'mx-rowhead' + (isNew ? ' new' : '') }, g);
          T(g, x0 + 12, y + 22, r[0], 'mx-rowname');
          COLS.forEach((c, i) => E('rect', { x: x0 + rw + cw * i, y, width: cw, height: rh, class: 'mx-cell' }, svg));
          const stage = isNew ? 'E' : null;
          if (stage && !ctx.built.has(stage)) return;
          const cx = x0 + rw + cw * r[1] + cw / 2;
          const m = E('g', { class: 'mx-mark' + (stage && ctx.born === 'E' ? ' born' : '') }, svg);
          E('rect', { x: cx - 11, y: y + 6, width: 22, height: 22, rx: 4, class: 'mx-mark-box' }, m);
          E('path', { d: `M${cx - 5} ${y + 23}L${cx + 5} ${y + 11}M${cx - 1} ${y + 11}H${cx + 5}V${y + 17}`, class: 'mx-mark-arrow' }, m);
        });
        const n = rows.filter((r) => !r[2] || ctx.built.has('E')).length;
        T(head, x0, y0 + hh + rh * rows.length + 28, `${n} of ${rows.length} functions allocated`, 'mx-sub');
      }
    },

    'uav-data': {
      kind: 'ibd', title: 'UAV Data', frame: ['ibd', '[Block] SOI - Pasture Sentinel [UAV Data]'], w: 1060, h: 600,
      draw(d) {
        const B = (x, y, w, h, name, type) => d.part({ x, y, w, h, name: name + ' : ' + type, el: d.ref(type, 'block') });
        B(70, 90, 250, 80, 'navigation', 'Navigation System');
        B(70, 400, 250, 80, 'wifi', 'WiFi System');
        B(410, 230, 260, 110, 'missionComputer', 'Mission Computer');
        B(760, 90, 240, 80, 'camera', 'Camera System');
        B(760, 400, 240, 80, 'flightController', 'Flight Controller');
        d.edge({ pts: [[195, 170], [195, 255], [410, 255]], head: 'none', cls: 'conn', flow: { x: 300, y: 255, dir: 'r', label: 'GPS_Position', ly: 247 } });
        d.edge({ pts: [[195, 400], [195, 315], [410, 315]], head: 'none', cls: 'conn', sig: 'FlightPlan', flow: { x: 300, y: 315, dir: 'r', label: 'FlightPlan', ly: 307 } });
        d.edge({ pts: [[320, 455], [540, 455], [540, 340]], head: 'none', cls: 'conn', sig: 'Ready for mission', flow: { x: 430, y: 455, dir: 'l', label: 'Mission Ready', ly: 447 } });
        d.edge({ pts: [[880, 170], [880, 255], [670, 255]], head: 'none', cls: 'conn', flow: { x: 770, y: 255, dir: 'l', label: 'Photo', ly: 247 } });
        d.edge({ pts: [[670, 315], [880, 315], [880, 400]], head: 'none', cls: 'conn', sig: 'Start Patrolling', flow: { x: 770, y: 315, dir: 'r', label: 'Navigation_Command', ly: 307 } });
      }
    },

    'uav-energy': {
      kind: 'ibd', title: 'UAV Energy', frame: ['ibd', '[Block] SOI - Pasture Sentinel [UAV Energy]'], w: 1060, h: 600,
      draw(d) {
        const B = (x, y, w, h, name, type) => d.part({ x, y, w, h, name: name + ' : ' + type, el: d.ref(type, 'block') });
        B(70, 250, 240, 100, 'power', 'Power System');
        const subs = [['flightController', 'Flight Controller'], ['missionComputer', 'Mission Computer'], ['navigation', 'Navigation System'], ['wifi', 'WiFi System'], ['camera', 'Camera System']];
        subs.forEach(([nm, type], i) => {
          const y = 50 + i * 104;
          B(700, y, 280, 70, nm, type);
          d.edge({ pts: [[310, 300], [500, 300], [500, y + 35], [700, y + 35]], head: 'none', cls: 'conn power', flow: { x: 610, y: y + 35, dir: 'r', label: i ? '' : '22.2 V DC', ly: y + 27 } });
        });
      }
    }
  };

  function render(key, ctx) {
    const def = DEFS[key];
    const svg = E('svg', { viewBox: `0 0 ${def.w} ${def.h}`, class: 'dg dg-' + def.kind, role: 'img', 'aria-label': `${def.kind} diagram ${def.title}`, 'data-key': key });
    const defs = E('defs', {}, svg);
    const pat = E('pattern', { id: 'hatch-' + key, width: 9, height: 9, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    E('line', { x1: 0, y1: 0, x2: 0, y2: 9, class: 'hatch-line' }, pat);
    E('rect', { x: 0, y: 0, width: def.w, height: def.h, class: 'dg-bg' }, svg);
    if (def.frame) {
      const [k, rest] = def.frame;
      const tw = 22 + (k.length + rest.length + 1) * 6.7;
      const f = E('g', { class: 'frame' }, svg);
      E('rect', { x: 6, y: 6, width: def.w - 12, height: def.h - 12, class: 'frame-box' }, f);
      E('path', { d: `M6 6H${6 + tw}V20L${tw - 2} 30H6Z`, class: 'frame-tab' }, f);
      const t = E('text', { x: 14, y: 23, class: 'frame-txt' }, f);
      E('tspan', { class: 'frame-kind' }, t).textContent = k + ' ';
      E('tspan', {}, t).textContent = rest;
    }
    def.draw(makeApi(svg, ctx), ctx);
    return svg;
  }

  window.ToolDiagrams = { DEFS, render };
})();
