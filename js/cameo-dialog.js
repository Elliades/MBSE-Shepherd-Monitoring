/* The "Connect to Cameo" dialog: where the student types the pairing code, sees why the link does
   not work, and sets the relay address without leaving the guide.

   window.CameoDialog.open(openOverlay)   show it (openOverlay is the overlay function of engine.js)
   window.CameoDialog.refresh(state)      the link changed (state of window.Bridge)
   The address that Cameo must use is shown here to be copied; it is still set in Cameo itself
   (Options > Environment > Relay bridge > Relay address). */
(function () {
  const B = window.Bridge;
  if (!B) return;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const PLUG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';

  let root = null;
  let pairKey = '';
  let relayTouched = false;

  /* The headline and the sentence under it, from the state of the link. */
  function describe(st) {
    if (st.status === 'connected') return { tone: 'ok', title: 'Following Cameo', detail: 'The simulation panel follows your simulation and "Open in Cameo" works.' };
    if (st.status === 'connecting') return { tone: 'warn', title: 'Connecting…', detail: '' };
    if (st.status === 'waiting') {
      if (st.problem === 'cameo') return { tone: 'warn', title: 'Waiting for Cameo', detail: 'You are on the relay, but Cameo is not. Is Cameo open, and does it use the same relay address? (see Relay below)' };
      return { tone: 'bad', title: 'Cannot reach the relay', detail: st.error || 'Retrying.' };
    }
    if (st.error) return { tone: 'bad', title: st.problem === 'config' ? 'Relay address problem' : 'Not connected', detail: st.error };
    return { tone: 'idle', title: 'Not connected', detail: 'Enter the code that Cameo shows.' };
  }

  function pairHTML(st, linked) {
    if (linked) {
      return `<div class="cd-linked"><span class="mono-label">Pairing code</span><strong class="cd-code">${esc(st.code)}</strong>
        <button type="button" class="btn ghost small" data-cameo-leave>Disconnect</button></div>`;
    }
    return `<ol class="cd-steps">
        <li>In Cameo, open the menu <span class="cd-menu">OMF &gt; Relay pairing code</span>.</li>
        <li>Type the 6 letters here.</li>
      </ol>
      <form class="cd-form" data-cd-pair novalidate>
        <input class="cd-input" name="code" maxlength="9" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" inputmode="text" placeholder="ABCDEF" aria-label="Pairing code" value="${esc(st.tried || '')}">
        <button type="submit" class="btn">${PLUG}Connect</button>
      </form>`;
  }

  function shell() {
    return `<div class="cd">
      <div class="cd-status" id="cd-status" role="status" aria-live="polite"><i class="cd-dot"></i><div><strong></strong><p></p></div></div>
      <div id="cd-pair"></div>
      <details class="cd-relay" id="cd-relay">
        <summary><span>Relay</span><code id="cd-relay-now"></code></summary>
        <div class="cd-relay-body">
          <p>The guide and Cameo meet in a <strong>relay</strong>. Both must use the <strong>same address</strong>.</p>
          <form class="cd-field" data-cd-relay novalidate>
            <label for="cd-relay-input">Address used by this guide</label>
            <div class="cd-row">
              <input id="cd-relay-input" class="cd-text" name="relay" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" inputmode="url">
              <button type="submit" class="btn small">Save</button>
              <button type="button" class="btn ghost small" data-cd-default>Use default</button>
            </div>
            <p class="cd-note" id="cd-relay-note"></p>
          </form>
          <div class="cd-field">
            <span class="cd-label">Address to set in Cameo</span>
            <div class="cd-row">
              <code class="cd-addr" id="cd-relay-copy"></code>
              <button type="button" class="btn ghost small" id="cd-copy-btn">Copy</button>
            </div>
            <p class="cd-note">In Cameo: <span class="cd-menu">Options &gt; Environment &gt; Relay bridge &gt; Relay address</span>. That option stays in Cameo; this is only the value to put there.</p>
          </div>
        </div>
      </details>
    </div>`;
  }

  function refresh(st) {
    if (!root || !root.isConnected) { root = null; return; }
    st = st || B.state();
    const d = describe(st);
    const status = root.querySelector('#cd-status');
    status.dataset.tone = d.tone;
    status.querySelector('strong').textContent = d.title;
    const p = status.querySelector('p');
    p.textContent = d.detail;
    p.hidden = !d.detail;

    /* The code form is drawn again only when the link appears or goes, so what is being typed stays. */
    const linked = st.status === 'connected' || st.status === 'waiting' || st.status === 'connecting';
    const key = linked ? `on:${st.code}` : 'off';
    if (key !== pairKey) {
      pairKey = key;
      root.querySelector('#cd-pair').innerHTML = pairHTML(st, linked);
      if (!linked) { const input = root.querySelector('.cd-input'); if (input && !input.value) input.focus({ preventScroll: true }); }
    }

    const details = root.querySelector('#cd-relay');
    root.querySelector('#cd-relay-now').textContent = st.relay || 'not set';
    root.querySelector('#cd-relay-copy').textContent = st.relay || '';
    root.querySelector('#cd-copy-btn').dataset.copy = st.relay || '';
    const input = root.querySelector('#cd-relay-input');
    input.placeholder = st.relayDefault || 'wss://host/relay';
    input.disabled = st.relayForced;
    if (document.activeElement !== input) input.value = st.relayCustom && !st.relayForced ? st.relay : '';
    root.querySelector('[data-cd-default]').hidden = !st.relayCustom || st.relayForced;
    root.querySelector('#cd-relay-note').textContent = st.relayForced
      ? 'Set by the address of this page (?relay=). Remove it from the address bar to change it here.'
      : (st.relayCustom ? 'Kept in this browser.' : `Empty = the default${st.relayDefault ? ` (${st.relayDefault})` : ''}.`);
    if (!relayTouched && (st.problem === 'relay' || st.problem === 'config' || st.problem === 'cameo')) details.open = true;
  }

  function open(openOverlay) {
    pairKey = '';
    relayTouched = false;
    openOverlay({
      kind: 'dialog',
      label: 'Cameo',
      title: 'Connect to Cameo',
      body: shell(),
      onMount(el) {
        root = el;
        el.addEventListener('submit', (e) => {
          const pair = e.target.closest('[data-cd-pair]');
          if (pair) { e.preventDefault(); B.connect(pair.elements.code.value); return; }
          const relay = e.target.closest('[data-cd-relay]');
          if (relay) {
            e.preventDefault();
            const done = B.setRelay(relay.elements.relay.value);
            const note = el.querySelector('#cd-relay-note');
            if (!done.ok) { note.textContent = done.error; note.classList.add('bad'); return; }
            note.classList.remove('bad');
            refresh();
          }
        });
        el.addEventListener('input', (e) => {
          if (e.target.matches('.cd-input')) e.target.value = e.target.value.replace(/[^a-z\s-]/gi, '').toUpperCase();
          if (e.target.matches('#cd-relay-input')) el.querySelector('#cd-relay-note').classList.remove('bad');
        });
        el.addEventListener('click', (e) => {
          if (e.target.closest('[data-cd-default]')) { B.setRelay(''); el.querySelector('#cd-relay-input').value = ''; refresh(); }
        });
        el.querySelector('#cd-relay').addEventListener('toggle', () => { relayTouched = true; });
        refresh(B.state());
      }
    });
  }

  window.CameoDialog = { open, refresh };
})();
