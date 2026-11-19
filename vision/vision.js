/* The scroll demo: each .scene plays its own little film when it reaches the middle of the window.
   An element with data-at="n" turns on at step n (data-off="m" turns it off at step m),
   data-from="x,y" + data-path="n:x,y;m:x,y" moves it, .type types its data-text, and SMIL
   <animate*> with begin="indefinite" inside it restart. A scene's data-tick is the time of a step,
   data-hold="n:ms,m:ms" gives some steps more time. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scenes = Array.prototype.slice.call(document.querySelectorAll('.scene'));
  var current = null;

  function num(v) { return v == null || v === '' ? null : parseInt(v, 10); }

  function parsePath(el) {
    var out = {};
    (el.getAttribute('data-path') || '').split(';').forEach(function (p) {
      var m = p.split(':');
      if (m.length === 2) out[parseInt(m[0], 10)] = m[1];
    });
    return out;
  }

  function move(el, xy) {
    var v = xy.split(',');
    el.style.transform = 'translate(' + v[0] + 'px,' + v[1] + 'px)';
  }

  function prepare(scene) {
    var els = Array.prototype.slice.call(scene.querySelectorAll('[data-at],[data-off],[data-path],[data-from]'));
    var max = 0;
    els.forEach(function (el) {
      var a = num(el.getAttribute('data-at')), o = num(el.getAttribute('data-off'));
      if (a) max = Math.max(max, a);
      if (o) max = Math.max(max, o);
      el._path = parsePath(el);
      Object.keys(el._path).forEach(function (k) { max = Math.max(max, +k); });
    });
    scene._els = els;
    scene._max = max;
    scene._tick = num(scene.getAttribute('data-tick')) || 900;
    var hold = {};
    (scene.getAttribute('data-hold') || '').split(',').forEach(function (p) {
      var m = p.split(':');
      if (m.length === 2) hold[parseInt(m[0], 10)] = parseInt(m[1], 10);
    });
    scene._hold = hold;
  }

  function typeIn(el, instant) {
    var text = el.getAttribute('data-text') || '';
    clearInterval(el._typing);
    if (instant) { el.textContent = text; return; }
    var i = 0;
    el.textContent = '';
    el._typing = setInterval(function () {
      i += 2;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(el._typing);
    }, 22);
  }

  function turnOn(el, instant) {
    el.classList.add('on');
    if (el.classList.contains('type')) typeIn(el, instant);
    Array.prototype.forEach.call(el.querySelectorAll('animate, animateMotion, animateTransform'), function (a) {
      if (a.getAttribute('begin') === 'indefinite' && a.beginElement) { try { a.beginElement(); } catch (e) { /* no SMIL */ } }
    });
  }

  function reset(scene) {
    scene._els.forEach(function (el) {
      el.classList.remove('on');
      clearInterval(el._typing);
      if (el.classList.contains('type')) el.textContent = '';
      var f = el.getAttribute('data-from');
      if (f) move(el, f); else if (el.hasAttribute('data-path')) el.style.transform = '';
    });
  }

  function apply(scene, s, instant) {
    scene._els.forEach(function (el) {
      if (num(el.getAttribute('data-at')) === s) turnOn(el, instant);
      if (num(el.getAttribute('data-off')) === s) el.classList.remove('on');
      if (el._path[s]) move(el, el._path[s]);
    });
    scene.setAttribute('data-step', s);
  }

  function stop(scene) { clearTimeout(scene._timer); }

  function play(scene) {
    stop(scene);
    scene.classList.add('instant');
    reset(scene);
    // the reset positions without transition, then the film runs with them
    void scene.offsetWidth;
    scene.classList.remove('instant');
    if (reduce) { for (var k = 1; k <= scene._max; k++) apply(scene, k, true); return; }
    var s = 0;
    (function next() {
      s++;
      if (s > scene._max) { scene.classList.add('done'); return; }
      apply(scene, s, false);
      scene._timer = setTimeout(next, scene._hold[s] || scene._tick);
    })();
    scene.classList.remove('done');
  }

  /* -------- the rail and the bar -------- */
  var rail = document.getElementById('rail');
  var phaseLabel = document.getElementById('bar-phase');
  scenes.forEach(function (scene, i) {
    prepare(scene);
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', (i + 1) + '. ' + (scene.getAttribute('data-title') || ''));
    b.title = scene.getAttribute('data-title') || '';
    b.setAttribute('data-phase', scene.getAttribute('data-phase') || '');
    b.addEventListener('click', function () { scene.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });
    rail.appendChild(b);
    scene._dot = b;
    var replay = scene.querySelector('.replay');
    if (replay) replay.addEventListener('click', function () { play(scene); });
  });

  function enter(scene) {
    if (current === scene) return;
    if (current) { stop(current); current._dot.classList.remove('on'); }
    current = scene;
    scene._dot.classList.add('on');
    phaseLabel.textContent = scene.getAttribute('data-phase-label') || '';
    document.documentElement.setAttribute('data-phase', scene.getAttribute('data-phase') || '');
    try { history.replaceState(null, '', '#' + scene.id); } catch (e) { /* file:// */ }
    play(scene);
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) enter(e.target); });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
  scenes.forEach(function (s) { io.observe(s); });

  // while a scroll is under way, the next step counts from where it is going, not from where it is
  var aim = null, aimAt = 0;
  function go(d) {
    var from = (aim !== null && Date.now() - aimAt < 900) ? aim : scenes.indexOf(current);
    var i = Math.max(0, Math.min(scenes.length - 1, from + d));
    aim = i; aimAt = Date.now();
    scenes[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) { e.preventDefault(); go(-1); }
    else if (e.key === 'r' || e.key === 'R') { if (current) play(current); }
  });

  /* On a wide screen a turn of the wheel (or a trackpad swipe) goes to the next or previous scene.
     The gesture is ignored until the wheel has been still for a moment, so one swipe is one scene. */
  var wide = window.matchMedia('(min-width: 901px)');
  var wheelLock = false, wheelQuiet = null;
  window.addEventListener('wheel', function (e) {
    if (!wide.matches || e.ctrlKey || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    clearTimeout(wheelQuiet);
    wheelQuiet = setTimeout(function () { wheelLock = false; }, 220);
    if (wheelLock || Math.abs(e.deltaY) < 4) return;
    wheelLock = true;
    go(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });
})();
