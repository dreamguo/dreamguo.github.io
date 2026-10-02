/* ==========================================================================
   fx.js — global effects layer (loaded BEFORE every other module).

   Site.fx     = { refresh(root), observe(el), lock(key), unlock(key) }
   Site.toast(message, { icon })
   Site.isMac  — true on Apple platforms (used for the ⌘K / Ctrl K label)

   Declarative hooks (just add the attribute / class, then call
   Site.fx && Site.fx.refresh(container) after injecting DOM):
     .reveal                  fade/slide in when scrolled into view  (a screenful cascades as one wave, see onReveal)
     [data-count="8"]         count-up 0 → 8  (data-count-suffix / -prefix / -decimals)
     [data-magnetic="8"]      pointer-follow translate (max px, default 8), fine pointers only;
                              active within ~48px of the box, never closes more than half the gap to a sibling
   Delegated (no registration needed):
     .panel, [data-spotlight] --mx / --my under the pointer
     [data-tilt="6"]          3D tilt (max deg, default 6) + soft glare (--gx --gy)
                              NB: while hovered the element's own `transform` is replaced.
     [data-cursor="Label"]    custom cursor shows a mono label over this element
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) {
    if (window.console) console.warn('[fx] window.Site is missing — core.js must load first');
    return;
  }

  var doc = document;
  var root = doc.documentElement;
  var hasIO = 'IntersectionObserver' in window;
  var raf = window.requestAnimationFrame
    ? window.requestAnimationFrame.bind(window)
    : function (fn) { return setTimeout(function () { fn(Date.now()); }, 16); };
  var clamp = S.clamp;

  /* ------------------------------------------------------------- platform */
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '';
  S.isMac = /Mac|iPhone|iPad|iPod/i.test(plat);

  /* ------------------------------------------------- scroll lock (ref-counted) */
  var locks = Object.create(null);
  function lock(key) {
    locks[key || '_'] = 1;
    root.classList.add('is-locked');
  }
  function unlock(key) {
    delete locks[key || '_'];
    if (!Object.keys(locks).length) root.classList.remove('is-locked');
  }

  /* ================================================================ REVEAL */
  var revealIO = null;
  var countIO = null;

  // A wave, not a queue: items that become visible in the same observer pass cascade top to bottom (--rv = 0..4, read by
  // base.css with a fallback to --i); a lone item that scrolls in gets no delay. Items already scrolled past get none either.
  function onReveal(entries) {
    var wave = [];
    entries.forEach(function (en) {
      var above = en.boundingClientRect.bottom <= 0; // already scrolled past (hash jump, restored scroll)
      var big = en.rootBounds && en.intersectionRect.height >= en.rootBounds.height * 0.3;
      var seen = en.isIntersecting && (en.intersectionRatio >= 0.12 || big);
      if (seen || above) wave.push({ el: en.target, above: above, top: en.boundingClientRect.top });
    });
    wave.sort(function (a, b) { return a.top - b.top; });
    var n = 0; // position among the items that are actually on screen (the ones above do not push the cascade back)
    wave.forEach(function (w) {
      w.el.style.setProperty('--rv', String(w.above ? 0 : Math.min(n++, 4)));
      w.el.classList.add('is-in');
      revealIO.unobserve(w.el);
    });
  }
  function onCount(entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      countIO.unobserve(en.target);
      startCount(en.target);
    });
  }

  function ensureIO() {
    if (!hasIO || revealIO) return;
    try {
      revealIO = new IntersectionObserver(onReveal, { threshold: [0, 0.12, 0.3], rootMargin: '0px 0px -8% 0px' });
      countIO = new IntersectionObserver(onCount, { threshold: 0.35, rootMargin: '0px 0px -6% 0px' });
    } catch (e) {
      revealIO = countIO = null;
    }
  }

  function register(el) {
    if (!el || el.nodeType !== 1) return;
    var f = el.__fx || (el.__fx = {});
    if (el.classList.contains('reveal') && !f.reveal && !el.classList.contains('is-in')) {
      f.reveal = 1;
      if (revealIO) revealIO.observe(el);
      else el.classList.add('is-in');
    }
    if (el.hasAttribute('data-count') && !f.count) {
      f.count = 1;
      if (countIO) countIO.observe(el);
    }
    if (el.hasAttribute('data-magnetic') && !f.magnet) {
      f.magnet = 1;
      f.mag = { el: el, x: 0, y: 0, tx: 0, ty: 0 };
      magnets.push(f.mag);
    }
  }

  function refresh(scope) {
    scope = scope || doc;
    ensureIO();
    if (scope.nodeType === 1) register(scope);
    if (!scope.querySelectorAll) return;
    var list = scope.querySelectorAll('.reveal, [data-count], [data-magnetic]');
    for (var i = 0; i < list.length; i++) register(list[i]);
  }

  /* ================================================================ COUNT-UP */
  function startCount(el) {
    if (S.reducedMotion || doc.hidden || !el.isConnected) return;
    var target = parseFloat(el.getAttribute('data-count'));
    if (!isFinite(target)) return;
    var suffix = el.getAttribute('data-count-suffix') || '';
    var prefix = el.getAttribute('data-count-prefix') || '';
    var orig = el.textContent;
    var decAttr = el.getAttribute('data-count-decimals');
    var dec = decAttr != null ? parseInt(decAttr, 10) || 0 : (String(target).split('.')[1] || '').length;
    var group = /\d,\d{3}/.test(orig);

    function fmt(v) {
      var s = v.toFixed(dec);
      if (group) {
        s = Number(s).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      }
      return prefix + s + suffix;
    }

    var last = fmt(0);
    el.textContent = last;
    var t0 = 0;
    var DUR = 1200;

    function step(now) {
      if (!t0) t0 = now;
      if (!el.isConnected || el.textContent !== last) return; // someone else took over the text
      var p = clamp((now - t0) / DUR, 0, 1);
      var e = 1 - Math.pow(1 - p, 4); // ease-out quart
      if (p >= 1 || S.reducedMotion) { // motion paused mid-count: jump straight to the final value
        var digits = parseFloat(orig.replace(/[^0-9.\-]/g, ''));
        el.textContent = orig.trim() && digits === target ? orig : fmt(target);
        return;
      }
      last = fmt(target * e);
      el.textContent = last;
      raf(step);
    }
    raf(step);
  }

  /* ================================================================ POINTER HUB
     One delegated pointermove → spotlight, tilt, magnetic. rAF-throttled. */
  var ptr = { x: -9999, y: -9999, target: null, dirty: false };
  var loopId = 0;
  var tilts = [];
  var magnets = [];

  function kick() {
    if (!loopId) loopId = raf(loop);
  }
  function onPointerMove(e) {
    if (e.pointerType === 'touch') return;
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.target = e.target;
    ptr.dirty = true;
    kick();
  }
  function onPointerAway() {
    ptr.target = null;
    ptr.x = ptr.y = -9999;
    ptr.dirty = true;
    kick();
  }

  function loop() {
    loopId = 0;
    if (ptr.dirty) {
      ptr.dirty = false;
      updateSpotlight();
      updateTiltTargets();
      updateMagnetTargets();
    }
    var again = stepTilts();
    if (stepMagnets()) again = true;
    if (again) kick();
  }

  /* ---- spotlight ------------------------------------------------------- */
  var SPOT = '.panel, [data-spotlight], .cmdk__panel';
  function updateSpotlight() {
    var t = ptr.target;
    if (!t || !t.closest) return;
    var el = t.closest(SPOT);
    var guard = 0;
    while (el && guard++ < 4) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (ptr.x - r.left).toFixed(1) + 'px');
      el.style.setProperty('--my', (ptr.y - r.top).toFixed(1) + 'px');
      el = el.parentElement ? el.parentElement.closest(SPOT) : null;
    }
  }

  /* ---- tilt ------------------------------------------------------------ */
  function ensureGlare(st) {
    if (st.glare && st.glare.parentNode === st.el) return;
    var g = doc.createElement('span');
    g.className = 'fx-glare';
    g.setAttribute('aria-hidden', 'true');
    st.el.appendChild(g);
    st.glare = g;
  }
  function tiltState(el) {
    for (var i = 0; i < tilts.length; i++) if (tilts[i].el === el) return tilts[i];
    var st = { el: el, x: 0, y: 0, tx: 0, ty: 0, gx: 50, gy: 50, tgx: 50, tgy: 50, g: 0, tg: 0, glare: null, pos: false };
    try {
      if (getComputedStyle(el).position === 'static') {
        el.style.position = 'relative';
        st.pos = true;
      }
    } catch (e) { /* ignore */ }
    el.classList.add('is-tilting');
    ensureGlare(st);
    tilts.push(st);
    return st;
  }
  function releaseTilt(st) {
    var el = st.el;
    el.classList.remove('is-tilting');
    el.style.removeProperty('--tilt-x');
    el.style.removeProperty('--tilt-y');
    el.style.removeProperty('--gx');
    el.style.removeProperty('--gy');
    el.style.removeProperty('--gl');
    if (st.pos) el.style.position = '';
    if (st.glare && st.glare.parentNode) st.glare.parentNode.removeChild(st.glare);
  }
  function updateTiltTargets() {
    var i, st;
    var off = S.reducedMotion || S.coarse;
    var el = !off && ptr.target && ptr.target.closest ? ptr.target.closest('[data-tilt]') : null;
    if (el && el.classList.contains('reveal') && !el.classList.contains('is-in')) el = null;
    for (i = 0; i < tilts.length; i++) {
      st = tilts[i];
      if (st.el !== el) {
        st.tx = st.ty = 0;
        st.tg = 0;
      }
    }
    if (!el) return;
    st = tiltState(el);
    ensureGlare(st);
    var max = parseFloat(el.getAttribute('data-tilt'));
    if (!isFinite(max)) max = 6;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var nx = clamp(((ptr.x - r.left) / r.width - 0.5) * 2, -1, 1);
    var ny = clamp(((ptr.y - r.top) / r.height - 0.5) * 2, -1, 1);
    st.ty = nx * max;
    st.tx = -ny * max;
    st.tgx = (nx + 1) * 50;
    st.tgy = (ny + 1) * 50;
    st.tg = 1;
  }
  function stepTilts() {
    var again = false;
    for (var i = tilts.length - 1; i >= 0; i--) {
      var s = tilts[i];
      s.x += (s.tx - s.x) * 0.14;
      s.y += (s.ty - s.y) * 0.14;
      s.gx += (s.tgx - s.gx) * 0.2;
      s.gy += (s.tgy - s.gy) * 0.2;
      s.g += (s.tg - s.g) * 0.12;
      var settled =
        Math.abs(s.tx - s.x) < 0.01 && Math.abs(s.ty - s.y) < 0.01 &&
        Math.abs(s.tgx - s.gx) < 0.1 && Math.abs(s.tgy - s.gy) < 0.1 && Math.abs(s.tg - s.g) < 0.01;
      if (settled && s.tx === 0 && s.ty === 0 && s.tg === 0) {
        releaseTilt(s);
        tilts.splice(i, 1);
        continue;
      }
      var el = s.el;
      el.style.setProperty('--tilt-x', s.x.toFixed(2) + 'deg');
      el.style.setProperty('--tilt-y', s.y.toFixed(2) + 'deg');
      el.style.setProperty('--gx', s.gx.toFixed(1) + '%');
      el.style.setProperty('--gy', s.gy.toFixed(1) + '%');
      el.style.setProperty('--gl', s.g.toFixed(3));
      if (!settled) again = true;
    }
    return again;
  }

  /* ---- magnetic -------------------------------------------------------- */
  var MAGNET_REACH = 48; // px beyond the element's own box in which the pull is active
  // element box without its own magnetic offset (so the effect never feeds back into itself)
  function magnetBox(el, m) {
    var r = el.getBoundingClientRect();
    var ox = m ? m.x : 0;
    var oy = m ? m.y : 0;
    return { l: r.left - ox, t: r.top - oy, r: r.right - ox, b: r.bottom - oy, w: r.width, h: r.height };
  }
  // room the element may travel toward its neighbors: at most half the free gap, so siblings never touch
  function magnetRoom(el, box) {
    var room = { l: Infinity, r: Infinity, t: Infinity, b: Infinity };
    var sibs = [el.previousElementSibling, el.nextElementSibling];
    for (var i = 0; i < sibs.length; i++) {
      var s = sibs[i];
      if (!s) continue;
      var o = magnetBox(s, s.__fx && s.__fx.mag);
      if (!o.w || !o.h) continue;
      var overlapY = o.t < box.b && o.b > box.t;
      var overlapX = o.l < box.r && o.r > box.l;
      var g;
      if (overlapY && o.l >= box.r - 0.5) {
        g = Math.max(0, o.l - box.r) / 2;
        if (g < room.r) room.r = g;
      } else if (overlapY && o.r <= box.l + 0.5) {
        g = Math.max(0, box.l - o.r) / 2;
        if (g < room.l) room.l = g;
      } else if (overlapX && o.t >= box.b - 0.5) {
        g = Math.max(0, o.t - box.b) / 2;
        if (g < room.b) room.b = g;
      } else if (overlapX && o.b <= box.t + 0.5) {
        g = Math.max(0, box.t - o.b) / 2;
        if (g < room.t) room.t = g;
      }
    }
    return room;
  }
  function updateMagnetTargets() {
    var off = S.reducedMotion || S.coarse || !ptr.target;
    var vh = window.innerHeight;
    for (var i = magnets.length - 1; i >= 0; i--) {
      var m = magnets[i];
      if (!m.el.isConnected) {
        m.el.style.translate = '';
        if (m.el.__fx) { m.el.__fx.magnet = 0; m.el.__fx.mag = null; }
        magnets.splice(i, 1);
        continue;
      }
      if (off) {
        m.tx = m.ty = 0;
        continue;
      }
      var r = m.el.getBoundingClientRect();
      if (r.bottom < -40 || r.top > vh + 40) {
        m.tx = m.ty = 0;
        continue;
      }
      var max = parseFloat(m.el.getAttribute('data-magnetic'));
      if (!isFinite(max) || max <= 0) max = 8;
      max = Math.min(max, 16);
      var box = magnetBox(m.el, m);
      // distance from the pointer to the (offset-free) box: 0 while inside it
      var ex = Math.max(box.l - ptr.x, 0, ptr.x - box.r);
      var ey = Math.max(box.t - ptr.y, 0, ptr.y - box.b);
      if (Math.sqrt(ex * ex + ey * ey) <= MAGNET_REACH) {
        var dx = ptr.x - (box.l + box.w / 2);
        var dy = ptr.y - (box.t + box.h / 2);
        var room = magnetRoom(m.el, box);
        m.tx = clamp(dx * 0.26, -Math.min(max, room.l), Math.min(max, room.r));
        m.ty = clamp(dy * 0.26, -Math.min(max, room.t), Math.min(max, room.b));
      } else {
        m.tx = m.ty = 0;
      }
    }
  }
  function stepMagnets() {
    var again = false;
    for (var i = 0; i < magnets.length; i++) {
      var m = magnets[i];
      if (m.x === m.tx && m.y === m.ty) continue;
      m.x += (m.tx - m.x) * 0.18;
      m.y += (m.ty - m.y) * 0.18;
      if (Math.abs(m.tx - m.x) < 0.05 && Math.abs(m.ty - m.y) < 0.05) {
        m.x = m.tx;
        m.y = m.ty;
      } else again = true;
      m.el.style.translate = m.x === 0 && m.y === 0 ? '' : m.x.toFixed(2) + 'px ' + m.y.toFixed(2) + 'px';
    }
    return again;
  }

  /* ================================================================ CURSOR */
  var cur = {
    on: false,       // currently rendering
    ready: false,    // DOM built
    host: null, dot: null, ring: null, label: null,
    x: -100, y: -100, rx: -100, ry: -100,      // where the pointer / the trailing ring should be
    px: -100, py: -100, prx: -100, pry: -100,  // what was actually painted (the self-check compares against these)
    raf: 0, last: 0, target: null, labelText: '',
    broken: false,   // the self-check gave up (recoverable: re-arms on a real pointer move after REARM_MS)
    brokenAt: 0,
    bad: 0,          // consecutive idle mismatches
    warned: false,
    fatal: false,    // an exception: stays off for the page life
    vt: 0, reclassRaf: 0,
  };
  var VERIFY_MS = 90;      // idle time (after the last paint) before the self-check samples
  var VERIFY_TOLERANCE = 3; // px
  var VERIFY_STRIKES = 3;  // consecutive idle mismatches before the custom cursor is dropped
  var REARM_MS = 2000;
  var mqFine = window.matchMedia ? window.matchMedia('(pointer: fine)') : null;
  var mqHover = window.matchMedia ? window.matchMedia('(hover: hover)') : null;
  // never replace the OS pointer for people who asked for more visibility from it
  var mqForced = window.matchMedia ? window.matchMedia('(forced-colors: active)') : null;
  var mqContrast = window.matchMedia ? window.matchMedia('(prefers-contrast: more)') : null;

  var HOVER_SEL =
    'a[href], button, [role="button"], [role="option"], [role="tab"], summary, select, .chip, .btn, label[for], [data-cmdk-open], [data-magnetic], [data-cursor], .recog__bar:not(.is-zero)';
  var TEXT_SEL =
    'textarea, [contenteditable=""], [contenteditable="true"], input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"])';

  function cursorWanted() {
    return !cur.broken && !cur.fatal && !S.reducedMotion && !!(mqFine && mqFine.matches) && !!(mqHover && mqHover.matches) &&
      !(mqForced && mqForced.matches) && !(mqContrast && mqContrast.matches);
  }
  function buildCursor() {
    if (cur.ready) return true;
    var host = doc.getElementById('cursor-root');
    if (!host) {
      host = doc.createElement('div');
      host.id = 'cursor-root';
      host.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(host);
    }
    cur.host = host;
    cur.dot = doc.createElement('div');
    cur.dot.className = 'cursor__dot';
    cur.ring = doc.createElement('div');
    cur.ring.className = 'cursor__ring';
    cur.label = doc.createElement('div');
    cur.label.className = 'cursor__label mono';
    host.appendChild(cur.ring);
    host.appendChild(cur.label);
    host.appendChild(cur.dot);
    cur.ready = true;
    return true;
  }
  function cursorOn() {
    if (cur.on) return;
    buildCursor();
    cur.on = true;
    cur.rx = cur.x;
    cur.ry = cur.y;
    cur.target = null; // classify again under the pointer
    root.classList.add('has-cursor');
    cur.host.classList.add('is-on');
    cur.host.classList.remove('is-away');
    cursorPaint();
  }
  function cursorOff() {
    if (!cur.on && !root.classList.contains('has-cursor')) return;
    cur.on = false;
    cur.target = null;
    cur.last = 0;
    clearTimeout(cur.vt);
    root.classList.remove('has-cursor');
    if (cur.host) cur.host.className = '';
  }
  function cursorPaint() {
    // Position with the individual `translate` property, NOT `transform`: the CSS `scale` property (hover states)
    // is applied before `transform`, so a translate inside `transform` would be multiplied by the scale factor and
    // dot / ring would drift apart from the real pointer. `translate` is applied first, so scaling stays about the
    // element's own center.
    cur.px = cur.x;
    cur.py = cur.y;
    cur.prx = cur.rx;
    cur.pry = cur.ry;
    cur.dot.style.translate = cur.x.toFixed(1) + 'px ' + cur.y.toFixed(1) + 'px';
    cur.ring.style.translate = cur.rx.toFixed(1) + 'px ' + cur.ry.toFixed(1) + 'px';
    cur.label.style.transform = 'translate3d(' + cur.rx.toFixed(1) + 'px,' + cur.ry.toFixed(1) + 'px,0) translate(-50%,-50%)';
  }
  // Self-check: the dot / ring rects must sit where cursorPaint() put them. If anything (a future CSS change, a browser
  // quirk) makes them drift, give the real cursor back instead of leaving the user without a visible pointer.
  // It compares against the PAINTED position (never the live pointer, which moves ahead of the paint), only samples while
  // the pointer is idle, and needs several consecutive misses; a dropped cursor re-arms on a later pointer move.
  function cursorVerify() {
    if (!cur.on || !cur.dot || !cur.ring) return;
    if (cur.raf || cur.px !== cur.x || cur.py !== cur.y) return; // still moving: cursorLoop reschedules once it settles
    var d = cur.dot.getBoundingClientRect();
    var r = cur.ring.getBoundingClientRect();
    var bad = false;
    if (d.width > 0.5) {
      bad = Math.abs(d.left + d.width / 2 - cur.px) > VERIFY_TOLERANCE || Math.abs(d.top + d.height / 2 - cur.py) > VERIFY_TOLERANCE;
    }
    if (!bad && r.width > 0.5) {
      bad = Math.abs(r.left + r.width / 2 - cur.prx) > VERIFY_TOLERANCE || Math.abs(r.top + r.height / 2 - cur.pry) > VERIFY_TOLERANCE;
    }
    if (!bad) {
      cur.bad = 0;
      return;
    }
    cur.bad++;
    if (cur.bad < VERIFY_STRIKES) {
      clearTimeout(cur.vt);
      cur.vt = setTimeout(cursorVerify, VERIFY_MS);
      return;
    }
    cur.bad = 0;
    cur.broken = true;
    cur.brokenAt = Date.now();
    cursorOff();
    if (!cur.warned && window.console) {
      cur.warned = true;
      console.warn('[fx] custom cursor drifted from the pointer; falling back to the system cursor');
    }
  }
  function cursorLoop(now) {
    cur.raf = 0;
    if (!cur.on) return;
    var dt = cur.last ? Math.min(48, now - cur.last) : 16;
    cur.last = now;
    var k = 1 - Math.exp(-dt / 55);
    cur.rx += (cur.x - cur.rx) * k;
    cur.ry += (cur.y - cur.ry) * k;
    cursorPaint();
    if (Math.abs(cur.x - cur.rx) > 0.1 || Math.abs(cur.y - cur.ry) > 0.1) cur.raf = raf(cursorLoop);
    else {
      cur.last = 0;
      clearTimeout(cur.vt);
      cur.vt = setTimeout(cursorVerify, VERIFY_MS);
    }
  }
  function cursorClassify(t) {
    if (!cur.host) return;
    var el = t && t.closest ? t : null;
    var text = !!(el && el.closest(TEXT_SEL));
    var labelEl = el && !text ? el.closest('[data-cursor]') : null;
    var label = labelEl ? labelEl.getAttribute('data-cursor') : '';
    var hover = !text && !!(el && el.closest(HOVER_SEL));
    var c = cur.host.classList;
    c.toggle('is-text', text);
    c.toggle('is-hover', hover);
    c.toggle('is-label', !!label);
    if (label !== cur.labelText) {
      cur.labelText = label;
      cur.label.textContent = label;
    }
  }
  // Re-read what is under a stationary pointer: scrolling, a closed dialog or a re-rendered block change the element
  // without any pointermove.
  function cursorReclassify() {
    cur.reclassRaf = 0;
    if (!cur.on || cur.x < 0 || cur.y < 0) return;
    var el = doc.elementFromPoint(cur.x, cur.y);
    if (el === cur.target) return;
    cur.target = el;
    cursorClassify(el);
  }
  function scheduleReclassify(delay) {
    if (!cur.on) return;
    if (delay) {
      setTimeout(scheduleReclassify, delay);
      return;
    }
    if (!cur.reclassRaf) cur.reclassRaf = raf(cursorReclassify);
  }
  function onCursorMove(e) {
    try {
      if (e.pointerType === 'touch') {
        cursorOff();
        return;
      }
      if (cur.broken && Date.now() - cur.brokenAt > REARM_MS) {
        cur.broken = false; // try again: a transient glitch must not cost the whole page life
        cur.bad = 0;
      }
      if (!cursorWanted()) {
        if (cur.on) cursorOff();
        return;
      }
      cur.x = e.clientX;
      cur.y = e.clientY;
      if (!cur.on) cursorOn();
      else if (cur.host.classList.contains('is-away')) cur.host.classList.remove('is-away');
      if (e.target !== cur.target) {
        cur.target = e.target;
        cursorClassify(e.target);
      }
      if (!cur.raf) cur.raf = raf(cursorLoop);
    } catch (err) {
      cur.fatal = true;
      cursorOff();
      if (window.console) console.warn('[fx] custom cursor disabled:', err);
    }
  }
  function initCursor() {
    var move = function (e) { onCursorMove(e); };
    doc.addEventListener('pointermove', move, { passive: true });
    // Chrome sends pointerover (no pointermove) when scrolling moves another element under a still pointer
    doc.addEventListener('pointerover', function (e) {
      if (!cur.on || e.pointerType === 'touch' || e.target === cur.target) return;
      cur.target = e.target;
      cursorClassify(e.target);
    }, { passive: true });
    doc.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return cursorOff();
      if (cur.on) cur.host.classList.add('is-down');
    }, { passive: true });
    var up = function () { if (cur.on) cur.host.classList.remove('is-down'); };
    doc.addEventListener('pointerup', up, { passive: true });
    doc.addEventListener('pointercancel', up, { passive: true });
    // the page under a resting pointer changes: scroll, click results, keyboard actions, dialogs, language switch
    window.addEventListener('scroll', function () { scheduleReclassify(0); }, { passive: true });
    doc.addEventListener('click', function () { scheduleReclassify(0); scheduleReclassify(160); }, { passive: true });
    doc.addEventListener('keyup', function () { scheduleReclassify(0); }, { passive: true });
    ['paletteopen', 'paletteclose', 'langchange', 'themechange'].forEach(function (evt) {
      S.on(evt, function () { scheduleReclassify(0); scheduleReclassify(120); scheduleReclassify(480); });
    });
    // pointer left the window / window lost focus: hand the OS cursor back; the next pointermove takes over again
    root.addEventListener('mouseleave', cursorOff);
    window.addEventListener('blur', cursorOff);
    S.on('motionchange', function () {
      if (!cursorWanted()) cursorOff();
    });
    [mqFine, mqHover, mqForced, mqContrast].forEach(function (mq) {
      if (!mq) return;
      var h = function () { if (!cursorWanted()) cursorOff(); };
      if (mq.addEventListener) mq.addEventListener('change', h);
      else if (mq.addListener) mq.addListener(h);
    });
  }

  /* ================================================================ TOAST */
  var toasts = [];
  var TOAST_MS = 2400;

  function dismissToast(t, instant) {
    if (t.gone) return;
    t.gone = true;
    clearTimeout(t.timer);
    var i = toasts.indexOf(t);
    if (i >= 0) toasts.splice(i, 1);
    var remove = function () {
      if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
    };
    if (instant || S.reducedMotion) return remove();
    t.el.classList.remove('is-in');
    t.el.classList.add('is-out');
    setTimeout(remove, 380);
  }

  function toast(message, opts) {
    opts = opts || {};
    var host = doc.getElementById('toast-root');
    if (!host) {
      host = doc.createElement('div');
      host.id = 'toast-root';
      host.className = 'toast-root';
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      doc.body.appendChild(host);
    }
    var name = opts.icon && S.icons && S.icons.indexOf(opts.icon) >= 0 ? opts.icon : 'check';

    var el = doc.createElement('div');
    el.className = 'toast';
    el.style.setProperty('--toast-ms', TOAST_MS + 'ms');
    var ic = doc.createElement('span');
    ic.className = 'toast__icon';
    ic.setAttribute('aria-hidden', 'true');
    ic.innerHTML = S.icon(name); // trusted: inline SVG from icons.js
    var tx = doc.createElement('span');
    tx.className = 'toast__text';
    tx.textContent = String(message == null ? '' : message);
    var bar = doc.createElement('span');
    bar.className = 'toast__bar';
    bar.setAttribute('aria-hidden', 'true');
    el.appendChild(ic);
    el.appendChild(tx);
    el.appendChild(bar);

    var t = { el: el, timer: 0, left: TOAST_MS, started: 0, gone: false };
    function arm(ms) {
      clearTimeout(t.timer);
      t.started = Date.now();
      t.left = ms;
      t.timer = setTimeout(function () { dismissToast(t); }, ms);
    }
    el.addEventListener('pointerenter', function () {
      if (t.gone) return;
      clearTimeout(t.timer);
      t.left = Math.max(700, t.left - (Date.now() - t.started));
      el.classList.add('is-paused');
    });
    el.addEventListener('pointerleave', function () {
      if (t.gone) return;
      el.classList.remove('is-paused');
      arm(t.left);
    });

    host.appendChild(el);
    toasts.push(t);
    while (toasts.length > 3) dismissToast(toasts[0], true);
    void el.offsetWidth; // commit the start state
    el.classList.add('is-in');
    arm(TOAST_MS);
    return el;
  }

  /* ================================================================ INIT */
  function init() {
    ensureIO();
    refresh(doc);

    doc.addEventListener('pointermove', onPointerMove, { passive: true });
    root.addEventListener('mouseleave', onPointerAway);
    window.addEventListener('blur', onPointerAway);
    S.on('motionchange', function () {
      ptr.dirty = true;
      kick();
    });

    // late safety net: pick up anything a module injected without calling refresh()
    S.on('ready', function () { refresh(doc); });


    try {
      initCursor();
    } catch (e) {
      cur.fatal = true;
      cursorOff();
      if (window.console) console.warn('[fx] cursor init failed', e);
    }

    // last line of a successful init: base.css only hides .reveal once this class exists (a failed init leaves content visible)
    root.classList.add('fx-ready');
  }

  /* ================================================================ EXPORT */
  S.fx = {
    refresh: refresh,
    observe: function (el) {
      ensureIO();
      register(el);
    },
    lock: lock,
    unlock: unlock,
  };
  S.toast = toast;

  S.register('fx', init);
})();
