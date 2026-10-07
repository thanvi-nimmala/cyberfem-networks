// Cyberfem Networks: network view, index view, and draggable windows.

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const byId = Object.fromEntries(WORKS.map(w => [w.id, w]));
  const narrow = window.matchMedia('(max-width: 820px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Positions on the network stage, in % of its width / height.
  const HUB_POS = { identity: [20, 42], resistance: [80, 42], bodies: [50, 74] };
  const NODE_POS = {
    'female-extension': [37, 13],
    'glitch-feminism': [63, 13],
    'old-boys-network': [90, 14],
    'my-boyfriend': [33, 58],
    'mouchette': [9, 72],
    'brandon': [24, 90],
    'all-new-gen': [67, 58],
    'subrosa': [91, 74],
    'she-who-sees': [76, 90],
  };
  // Links between works that aren't about a theme.
  const BONDS = [['female-extension', 'old-boys-network', 'Sollfrank co-founded OBN']];

  let activeTheme = null;

  const fileName = w => w.id + '/';
  const workIndex = id => WORKS.findIndex(w => w.id === id);
  let idleStatus = 'Document: Done';
  const setStatus = msg => { $('#status').textContent = msg || idleStatus; };

  /* ---------- Ticker ---------- */
  const tickerText = [...WORKS].sort((a, b) => a.start - b.start)
    .map(w => `${w.start} ${w.artist.toUpperCase()} :: ${w.title}`).join('  ◆  ');
  $('#ticker').textContent = `${tickerText}  ◆  ${tickerText}  ◆  `;

  /* ---------- Network ---------- */
  const svg = $('#wires');
  const NS = 'http://www.w3.org/2000/svg';
  const line = (a, b, cls, data) => {
    const l = document.createElementNS(NS, 'line');
    [l.x1.baseVal.value, l.y1.baseVal.value] = a;
    [l.x2.baseVal.value, l.y2.baseVal.value] = b;
    l.setAttribute('class', cls);
    l.setAttribute('vector-effect', 'non-scaling-stroke');
    Object.assign(l.dataset, data);
    svg.appendChild(l);
  };

  WORKS.forEach(w => w.themes.forEach(t =>
    line(NODE_POS[w.id], HUB_POS[t], `wire wire-${t}`, { work: w.id, theme: t })));
  BONDS.forEach(([a, b]) =>
    line(NODE_POS[a], NODE_POS[b], 'wire wire-bond', { work: a, work2: b }));

  Object.entries(THEMES).forEach(([key, t]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hub hub-${key}`;
    b.dataset.theme = key;
    b.style.left = HUB_POS[key][0] + '%';
    b.style.top = HUB_POS[key][1] + '%';
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="hub-label">[ ${t.label} ]</span><span class="hub-blurb">${t.blurb}</span>`;
    b.addEventListener('click', () => setTheme(activeTheme === key ? null : key));
    b.addEventListener('mouseenter', () => { setStatus(`Thread: ${t.label}. ${t.blurb}`); SFX.hoverThread(key); });
    b.addEventListener('mouseleave', () => setStatus());
    $('#hubs').appendChild(b);
  });

  WORKS.forEach(w => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'node';
    b.dataset.work = w.id;
    b.dataset.themes = w.themes.join(' ');
    b.style.left = NODE_POS[w.id][0] + '%';
    b.style.top = NODE_POS[w.id][1] + '%';
    b.innerHTML = `
      <span class="thumb"><img src="${w.img}" alt="" loading="lazy"></span>
      <span class="node-artist">${w.artist}</span>
      <span class="node-title">${w.title}</span>
      <span class="node-year">${w.year}</span>
      <span class="node-dots">${w.themes.map(t => `<i class="dot dot-${t}" title="${THEMES[t].label}"></i>`).join('')}</span>`;
    b.addEventListener('click', () => openWork(w.id));
    b.addEventListener('mouseenter', () => { hoverWork(w.id, true); SFX.hoverWork(workIndex(w.id)); });
    b.addEventListener('mouseleave', () => hoverWork(w.id, false));
    b.addEventListener('focus', () => { hoverWork(w.id, true); SFX.hoverWork(workIndex(w.id)); });
    b.addEventListener('blur', () => hoverWork(w.id, false));
    $('#nodes').appendChild(b);
  });

  function hoverWork(id, on) {
    svg.querySelectorAll(`[data-work="${id}"], [data-work2="${id}"]`)
      .forEach(l => l.classList.toggle('hot', on));
    document.querySelectorAll(`[data-tick="${id}"]`).forEach(t => t.classList.toggle('hot', on));
    setStatus(on ? `Connecting to ${new URL(byId[id].url).host}…` : '');
  }

  /* ---------- Theme filter (shared by both views) ---------- */
  function setTheme(key) {
    if (key) SFX.playThread(key, WORKS.filter(w => w.themes.includes(key)).map(w => workIndex(w.id)));
    else if (activeTheme) SFX.clearThread();
    activeTheme = key;
    document.body.dataset.theme = key || '';
    document.querySelectorAll('[data-theme]').forEach(el => {
      if (el.matches('button')) el.setAttribute('aria-pressed', String(el.dataset.theme === (key || '')));
    });
    document.querySelectorAll('.node, tr[data-work]').forEach(el => {
      const themes = byId[el.dataset.work].themes;
      el.classList.toggle('dim', !!key && !themes.includes(key));
    });
    svg.querySelectorAll('.wire').forEach(l =>
      l.classList.toggle('lit', !!key && l.dataset.theme === key));
    setStatus(key ? `Following thread: ${THEMES[key].label}` : '');
  }

  /* ---------- Timeline ---------- */
  const T0 = 1990, T1 = 2026;
  const axis = $('#timeline');
  for (let y = T0; y <= T1; y += 5) {
    const m = document.createElement('span');
    m.className = 'year-mark';
    m.style.left = ((y - T0) / (T1 - T0)) * 100 + '%';
    m.textContent = y;
    axis.appendChild(m);
  }
  const placed = {};
  [...WORKS].sort((a, b) => a.start - b.start).forEach(w => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'tick';
    t.dataset.tick = w.id;
    const stack = placed[w.start] = (placed[w.start] || 0) + 1;
    t.style.left = ((w.start - T0) / (T1 - T0)) * 100 + '%';
    t.style.setProperty('--stack', stack - 1);
    t.setAttribute('aria-label', `${w.year}: ${w.artist}, ${w.title}`);
    t.innerHTML = `<span>${w.start}</span>`;
    t.addEventListener('click', () => openWork(w.id));
    t.addEventListener('mouseenter', () => {
      hoverWork(w.id, true);
      SFX.year(w.start);
      document.querySelector(`.node[data-work="${w.id}"]`).classList.add('hot');
    });
    t.addEventListener('mouseleave', () => {
      hoverWork(w.id, false);
      document.querySelector(`.node[data-work="${w.id}"]`).classList.remove('hot');
    });
    axis.appendChild(t);
  });

  /* ---------- Index view ---------- */
  const filters = $('#filters');
  [['', 'ALL'], ...Object.entries(THEMES).map(([k, t]) => [k, t.label])].forEach(([k, label]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.theme = k;
    b.className = k ? `filter filter-${k}` : 'filter';
    b.setAttribute('aria-pressed', String(!k));
    b.textContent = `[${label}]`;
    b.addEventListener('click', () => setTheme(k || null));
    b.addEventListener('mouseenter', () => k ? SFX.hoverThread(k) : SFX.press());
    filters.appendChild(b);
  });

  const rows = $('#rows');
  rows.innerHTML = `<tr class="parent"><td colspan="4"><a href="#network" data-view-link="network">&uarr; Parent Directory</a></td></tr>`;
  rows.querySelector('.parent a').addEventListener('mouseenter', () => SFX.parent());
  [...WORKS].sort((a, b) => a.start - b.start).forEach(w => {
    const tr = document.createElement('tr');
    tr.dataset.work = w.id;
    tr.innerHTML = `
      <td><a href="#${w.id}" class="file">[DIR] ${fileName(w)}</a></td>
      <td>${w.year}</td>
      <td>${w.themes.map(t => `<i class="dot dot-${t}"></i>${THEMES[t].label.toLowerCase()}`).join('<br>')}</td>
      <td><strong>${w.artist}</strong> &mdash; <em>${w.title}</em></td>`;
    const link = tr.querySelector('a');
    link.addEventListener('click', e => { e.preventDefault(); openWork(w.id); });
    ['mouseenter', 'focus'].forEach(ev => link.addEventListener(ev, () => {
      SFX.hoverWork(workIndex(w.id));
      setStatus(`Connecting to ${new URL(w.url).host}\u2026`);
    }));
    link.addEventListener('mouseleave', () => setStatus());
    rows.appendChild(tr);
  });

  /* ---------- View switching ---------- */
  function setView(v) {
    if (document.body.dataset.view !== v) SFX.seek();
    document.body.dataset.view = v;
    document.querySelectorAll('[data-view-btn]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.viewBtn === v)));
    try { localStorage.setItem('cfn-view', v); } catch (e) { /* storage unavailable */ }
  }
  document.querySelectorAll('[data-view-btn]').forEach(b =>
    b.addEventListener('click', () => setView(b.dataset.viewBtn)));
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-view-link]');
    if (a) { e.preventDefault(); setView(a.dataset.viewLink); window.scrollTo({ top: 0 }); }
  });
  $('.skip').addEventListener('click', () => setView('index'));

  /* ---------- Windows ---------- */
  const desk = $('#windows');
  let z = 10, cascade = 0, lastFocus = null;

  function makeWindow({ key, title, body, cls = '' }) {
    const existing = desk.querySelector(`[data-key="${key}"]`);
    if (existing) { raise(existing); existing.querySelector('.win-close').focus(); return existing; }

    const win = document.createElement('div');
    win.className = `win ${cls}`;
    win.dataset.key = key;
    win.setAttribute('role', 'dialog');
    win.setAttribute('aria-labelledby', `wt-${key}`);
    win.innerHTML = `
      <div class="win-bar">
        <span class="win-title" id="wt-${key}">${title}</span>
        <span class="win-btns" aria-hidden="true"><i>_</i><i>&#9633;</i></span>
        <button type="button" class="win-close" aria-label="Close ${title}">&times;</button>
      </div>
      <div class="win-body">${body}</div>`;

    // Small screens override this with a full-screen sheet in CSS.
    const off = (cascade++ % 6) * 28;
    win.style.left = Math.max(16, Math.min(window.innerWidth - 560, window.innerWidth * 0.5 - 260 + off)) + 'px';
    win.style.top = (110 + off) + 'px';
    desk.appendChild(win);
    raise(win);
    SFX.open();
    win.addEventListener('pointerdown', () => raise(win));
    win.querySelector('.win-close').addEventListener('click', () => closeWindow(win));
    drag(win);
    return win;
  }

  function raise(win) { win.style.zIndex = ++z; }

  function closeWindow(win) {
    const key = win.dataset.key;
    win.remove();
    SFX.close();
    if (location.hash === `#${key}`) history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function drag(win) {
    const bar = win.querySelector('.win-bar');
    bar.addEventListener('pointerdown', e => {
      if (narrow.matches || e.target.closest('button')) return;
      const r = win.getBoundingClientRect();
      const dx = e.clientX - r.left, dy = e.clientY - r.top;
      bar.setPointerCapture(e.pointerId);
      win.classList.add('dragging');
      SFX.grab();
      const move = ev => {
        win.style.left = Math.min(window.innerWidth - 80, Math.max(-r.width + 120, ev.clientX - dx)) + 'px';
        win.style.top = Math.min(window.innerHeight - 40, Math.max(0, ev.clientY - dy)) + 'px';
      };
      const up = () => {
        win.classList.remove('dragging');
        SFX.drop();
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', up);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', up);
    });
  }

  function openWork(id) {
    const w = byId[id];
    if (!w) return;
    lastFocus = document.activeElement;
    const host = new URL(w.url).host;
    const win = makeWindow({
      key: w.id,
      cls: 'win-work',
      title: `${w.id}.html &mdash; ${w.artist}`,
      body: `
        <a class="win-img" href="${w.url}" target="_blank" rel="noopener">
          <img src="${w.img}" alt="Screenshot of ${w.title} by ${w.artist}">
        </a>
        <p class="win-meta"><span>${w.artist}</span> &mdash; <em>${w.title}</em> (${w.year})</p>
        <p class="win-dots">${w.themes.map(t => `<button type="button" class="chip chip-${t}" data-chip="${t}">${THEMES[t].label}</button>`).join('')}</p>
        <p>${w.text}</p>
        ${w.note ? `<p class="note">Content note: ${w.note}</p>` : ''}
        <p><a class="visit" href="${w.url}" target="_blank" rel="noopener">Visit the work at ${host} &nearr;</a></p>`,
    });
    win.querySelectorAll('[data-chip]').forEach(c =>
      c.addEventListener('click', () => setTheme(c.dataset.chip)));
    win.querySelector('.win-close').focus();
    if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
  }

  function openReadme() {
    lastFocus = document.activeElement;
    const fresh = !desk.querySelector('[data-key="readme"]');
    const win = makeWindow({
      key: 'readme',
      cls: 'win-readme',
      title: 'README.TXT &mdash; curatorial statement',
      body: $('#statement').innerHTML.replace(/<h2[^>]*>.*?<\/h2>/, ''),
    });
    if (fresh) { win.style.left = '24px'; win.style.top = '110px'; }
    win.querySelector('.win-close').focus();
  }
  $('#readme-btn').addEventListener('click', openReadme);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const wins = [...desk.children].sort((a, b) => b.style.zIndex - a.style.zIndex);
    if (wins[0]) closeWindow(wins[0]);
  });

  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (byId[id]) openWork(id);
  });

  /* ---------- Sound: on by default ----------
     Browsers only allow audio after a click, tap, or key press, so sound is
     "armed" on load and starts on the visitor's first interaction. Turning it
     off is remembered for next time. */
  const soundBtn = $('#sound-btn');
  let soundWanted = true;
  try { soundWanted = localStorage.getItem('cfn-sound') !== 'off'; } catch (e) { /* storage unavailable */ }

  const paintSound = () => {
    soundBtn.setAttribute('aria-pressed', String(soundWanted));
    soundBtn.dataset.live = String(SFX.on);
    soundBtn.querySelector('.sound-state').textContent = soundWanted ? 'ON' : 'OFF';
    idleStatus = soundWanted && !SFX.on ? 'Sound is on \u2014 click anywhere to dial in' : 'Document: Done';
  };
  paintSound();

  const unlock = e => {
    if (e.target.closest && e.target.closest('#sound-btn, #splash')) return;
    if (soundWanted && !SFX.on) { SFX.set(true); paintSound(); setStatus('Dialing in\u2026'); }
    else if (SFX.on) SFX.resume();
  };
  ['pointerdown', 'keydown', 'touchend', 'click'].forEach(ev =>
    document.addEventListener(ev, unlock, true));

  soundBtn.addEventListener('click', () => {
    soundWanted = !soundWanted;
    SFX.set(soundWanted);
    try { localStorage.setItem('cfn-sound', soundWanted ? 'on' : 'off'); } catch (e) { /* storage unavailable */ }
    paintSound();
    setStatus(soundWanted ? 'Dialing in\u2026 sound on' : 'Sound off');
  });
  setStatus();
  document.addEventListener('click', e => {
    if (e.target.closest('.views button, .filter, .chip, #readme-btn')) SFX.press();
  });

  /* ---------- Splash ---------- */
  const splash = $('#splash');
  let seen = false;
  try { seen = sessionStorage.getItem('cfn-entered') === '1'; } catch (e) { /* storage unavailable */ }

  if (seen) splash.remove();
  else {
    const behind = document.querySelectorAll('body > :not(#splash):not(script)');
    behind.forEach(el => el.inert = true);
    document.body.classList.add('locked');

    const leave = delay => {
      try { sessionStorage.setItem('cfn-entered', '1'); } catch (e) { /* storage unavailable */ }
      setTimeout(() => {
        splash.classList.add('gone');
        document.body.classList.remove('locked');
        behind.forEach(el => el.inert = false);
        setTimeout(() => splash.remove(), 600);
        setStatus();
      }, delay);
    };

    // A dial-up log, timed to the modem handshake in sound.js
    const LOG = [
      [0, 'ATDT 1-800-CYBERFEM'],
      [380, 'DIALING\u2026'],
      [760, 'CARRIER 28800'],
      [1100, 'CONNECT 56000'],
      [1450, 'WELCOME TO THE NETWORK_'],
    ];

    $('#splash-enter').addEventListener('click', () => {
      soundWanted = true;
      try { localStorage.setItem('cfn-sound', 'on'); } catch (e) { /* storage unavailable */ }
      if (!SFX.on) SFX.set(true);
      paintSound();
      splash.classList.add('dialing');
      const log = $('#splash-log');
      LOG.forEach(([t, line]) => setTimeout(() => { log.textContent += line + '\n'; }, reduceMotion.matches ? 0 : t));
      leave(reduceMotion.matches ? 300 : 2000);
    });

    $('#splash-quiet').addEventListener('click', () => {
      soundWanted = false;
      try { localStorage.setItem('cfn-sound', 'off'); } catch (e) { /* storage unavailable */ }
      SFX.set(false);
      paintSound();
      leave(0);
    });
  }

  /* ---------- Boot ---------- */
  const syncChrome = () => document.documentElement.style
    .setProperty('--chrome-h', $('.chrome').offsetHeight + 'px');
  syncChrome();
  window.addEventListener('resize', syncChrome);

  let saved = null;
  try { saved = localStorage.getItem('cfn-view'); } catch (e) { /* storage unavailable */ }
  setView(saved === 'index' ? 'index' : 'network');
  const initial = location.hash.slice(1);
  if (byId[initial]) openWork(initial);
  if (reduceMotion.matches) document.body.classList.add('still');
  if (document.body.classList.contains('locked')) $('#splash-enter').focus();
})();
