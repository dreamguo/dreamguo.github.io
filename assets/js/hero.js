/* ==========================================================================
   hero.js — hero HUD, hero link buttons, typewriter rotator, viewfinder reticle.
   The WebGL backdrop itself lives in hero-gl.js (Site.hero); this module is the
   DOM half: it only talks to it through Site.hero + the 'scenechange' event.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var D = S.data || {};
  var h = S.h;

  S.addStrings({
    'hud.title': { en: '3D viewport', zh: '3D 视口' },
    'hud.sim': { en: 'sim', zh: '模拟' },
    'hud.simnote': {
      en: 'Simulated readout: a visual metaphor, not a real run or measurement.',
      zh: '模拟读数：仅为视觉隐喻，并非真实运行或测量结果。',
    },
    'hud.replay': { en: 'Replay training sequence', zh: '重播训练过程' },
    'hud.motion': { en: 'Pause motion', zh: '暂停动效' },
    'hud.motion.resume': { en: 'Resume motion', zh: '恢复动效' },
    'hud.scenes': { en: 'Choose a 3D scene', zh: '选择 3D 场景' },
    'hud.iter': { en: 'iter', zh: '迭代' },
    'hud.psnr': { en: 'PSNR', zh: 'PSNR' },
    'hud.gauss': { en: 'gaussians', zh: '高斯数' },
    'hud.opacity': { en: 'opacity', zh: '不透明度' },
    'hud.sh': { en: 'SH order', zh: '球谐阶数' },
    'hud.step': { en: 'step', zh: '步骤' },
    'hud.brick': { en: 'brick type', zh: '积木型号' },
    'hud.depth': { en: 'depth', zh: '层数' },
    'hud.t': { en: 't', zh: 't' },
    'hud.traj': { en: 'traj', zh: '轨迹' },
    'hud.frames': { en: 'frames', zh: '帧' },
    'hud.yaw': { en: 'yaw', zh: '偏航' },
    'hud.pitch': { en: 'pitch', zh: '俯仰' },
    'hud.training': { en: 'training…', zh: '训练中…' },
    'hud.converged': { en: 'converged', zh: '已收敛' },
    'hud.rendering': { en: 'rendering', zh: '渲染中' },
    'hud.stacking': { en: 'stacking…', zh: '堆叠中…' },
    'hud.stacked': { en: 'stacked', zh: '已堆叠' },
    'hud.unstacking': { en: 'unstacking…', zh: '拆解中…' },
    'hud.resetting': { en: 'resetting', zh: '重置中' },
    'hud.playing': { en: 'playing', zh: '播放中' },
    'hud.keys': { en: 'keys 1–4', zh: '按键 1–4' },
    'hud.hint.touch': { en: 'Swipe sideways to orbit', zh: '横向滑动旋转视角' },
    'hud.tel': { en: 'Simulated readout', zh: '模拟读数' },
  });

  var heroEl, hud, hudEls = {}, reticle;
  var sceneMeta = {};
  var lastTel = {};
  var coarseQ = window.matchMedia ? window.matchMedia('(hover: none)') : null;
  function isTouch() { return !!(S.coarse || (coarseQ && coarseQ.matches)); }

  /* Per-scene readouts (all simulated, see 'sim'): each scene shows numbers that mean something for it. */
  function fmtG(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(n);
  }
  var TEL = {
    reconstruct: {
      keys: ['hud.iter', 'hud.psnr', 'hud.gauss'],
      read: function (st) {
        return {
          v: [st.iter.toLocaleString('en-US'), st.psnr.toFixed(2) + ' dB', fmtG(st.gaussians)],
          p: st.progress, active: st.training, state: st.training ? 'hud.training' : 'hud.converged',
        };
      },
    },
    splat: {
      keys: ['hud.gauss', 'hud.opacity', 'hud.sh'],
      read: function (st) {
        return { v: ['1.24M', (0.46 + 0.03 * Math.sin(st.tick * 0.5)).toFixed(2), '3'], p: 1, active: false, state: 'hud.rendering' };
      },
    },
    bricks: {
      keys: ['hud.step', 'hud.brick', 'hud.depth'],
      read: function (st) {
        var n = Math.round(st.build * st.bricks), lv = Math.round(st.build * st.levels);
        var ph = st.bphase;
        return {
          v: [n + ' / ' + st.bricks, '2×4', lv + ' / ' + st.levels],
          p: st.build, active: ph === 'build' || ph === 'unbuild',
          state: ph === 'build' ? 'hud.stacking' : ph === 'hold' ? 'hud.stacked' : ph === 'unbuild' ? 'hud.unstacking' : 'hud.resetting',
        };
      },
    },
    spacetime: {
      keys: ['hud.t', 'hud.traj', 'hud.frames'],
      read: function (st) {
        return { v: [st.phase.toFixed(2), '6', Math.round(st.phase * 120) + ' / 120'], p: st.phase, active: false, state: 'hud.playing' };
      },
    },
  };

  /* ------------------------------------------------------------------ HUD */
  function buildHud() {
    hud = document.getElementById('hero-hud');
    if (!hud) { console.warn('[hero] #hero-hud missing'); return; }
    if (!S.hero) { hud.hidden = true; return; }
    hud.classList.add('hud', 'panel', 'ticks');
    hud.textContent = '';

    (D.scenes || []).forEach(function (sc) { sceneMeta[sc.id] = sc; });
    var ids = S.hero.scenes || [];

    hudEls.title = h('span', { class: 'hud__title-text' });
    hudEls.sim = h('button', {
      class: 'hud__sim mono', type: 'button', 'aria-expanded': 'false', 'aria-controls': 'hud-simnote',
      on: { click: function () { toggleNote(); } },
    });
    hudEls.note = h('p', { class: 'hud__note', id: 'hud-simnote' });
    hudEls.note.hidden = true;
    hudEls.replay = h('button', {
      class: 'hud__replay', type: 'button',
      html: S.icon('refresh', { size: 16 }),
      on: { click: function () { S.hero.replay(); } },
    });
    // pause / resume all motion (WCAG 2.2.2): the shared switch lives in Site.motion (DECISIONS 21)
    hudEls.motion = null;
    if (S.motion && typeof S.motion.set === 'function') {
      hudEls.motion = h('button', {
        class: 'hud__motion', type: 'button', 'aria-pressed': 'false',
        on: { click: function () { S.motion.set(!S.motion.paused()); syncMotion(); } },
      });
      hudEls.motionIcon = h('span', { class: 'hud__motion-icon', 'aria-hidden': 'true' });
      hudEls.motion.appendChild(hudEls.motionIcon);
    }
    var head = h('div', { class: 'hud__head' },
      h('span', { class: 'hud__title mono' }, h('span', { class: 'dot-live', 'aria-hidden': 'true' }), hudEls.title),
      hudEls.sim,
      hudEls.motion,
      hudEls.replay
    );

    hudEls.chips = {};
    var chipWrap = h('div', { class: 'hud__scenes', role: 'group' });
    hudEls.chipWrap = chipWrap;
    ids.forEach(function (id, i) {
      var label = h('span', { class: 'hud__chip-label' });
      var hint = h('span', { class: 'hud__chip-hint mono' });
      var btn = h('button', {
        class: 'chip hud__chip', type: 'button', 'aria-pressed': 'false', dataset: { scene: id },
        on: { click: function () { S.hero.setScene(id, { pin: true }); revealStage(); } }, // manual choice sticks (DECISIONS 22)
      }, h('span', { class: 'hud__chip-key mono', 'aria-hidden': 'true' }, String(i + 1)), label, hint);
      hudEls.chips[id] = { btn: btn, label: label, hint: hint };
      chipWrap.appendChild(btn);
    });

    function tel(key) {
      var dd = h('dd', { class: 'mono' }, '0');
      var dt = h('dt', { class: 'mono' });
      hudEls['dt_' + key] = dt;
      hudEls[key] = dd;
      return h('div', { class: 'hud__cell' }, dt, dd);
    }
    hudEls.telWrap = h('dl', { class: 'hud__tel', 'aria-hidden': 'true' }, tel('c0'), tel('c1'), tel('c2'));

    hudEls.barFill = h('span');
    hudEls.bar = h('div', { class: 'hud__bar', 'aria-hidden': 'true' }, hudEls.barFill);

    hudEls.state = h('span', { class: 'hud__state' });
    hudEls.hint = h('span', { class: 'hud__hint' });
    hudEls.keys = h('span', { class: 'hud__keys' });
    hudEls.dt_yaw = h('span', { class: 'hud__aux-k' });
    hudEls.dt_pitch = h('span', { class: 'hud__aux-k' });
    hudEls.yaw = h('span', { class: 'hud__aux-v' }, '0°');
    hudEls.pitch = h('span', { class: 'hud__aux-v' }, '0°');
    var foot = h('p', { class: 'hud__foot mono' },
      h('span', { class: 'hud__foot-icon', html: S.icon('move', { size: 14 }) }),
      hudEls.hint
    );
    var meta = h('p', { class: 'hud__meta mono' },
      hudEls.keys,
      h('span', { class: 'hud__aux', 'aria-hidden': 'true' }, hudEls.dt_yaw, hudEls.yaw, hudEls.dt_pitch, hudEls.pitch),
      h('span', { class: 'hud__state-wrap' }, hudEls.state)
    );

    hud.appendChild(head);
    hud.appendChild(hudEls.note);
    hud.appendChild(chipWrap);
    hud.appendChild(hudEls.telWrap);
    hud.appendChild(hudEls.bar);
    hud.appendChild(foot);
    hud.appendChild(meta);
    hud.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !hudEls.note.hidden) { toggleNote(false); hudEls.sim.focus(); }
    });
    renderHudText();
    syncScene(S.hero.current());
    syncKeys();
  }

  // Stacked hero (phones / small tablets): the 3D stage is a band between the typed line and the lede, far above the HUD.
  // After a chip tap, bring that band back into view when it has scrolled away (same measure as hero-gl.js).
  function revealStage() {
    if (!window.matchMedia || !heroEl || !window.scrollTo) return;
    if (!window.matchMedia('(max-width: 899px)').matches) return;
    if (window.matchMedia('(max-height: 500px) and (orientation: landscape)').matches) return;
    if (S.hero && S.hero.status === 'none') return; // no backdrop, nothing to show
    var typed = heroEl.querySelector('.hero__typed'), lede = heroEl.querySelector('.hero__lede');
    if (!typed || !lede) return;
    var nav = document.getElementById('site-nav');
    var navH = (nav && nav.getBoundingClientRect().bottom) || 64;
    var top = typed.getBoundingClientRect().bottom + 4, bot = lede.getBoundingClientRect().top - 12;
    var bh = bot - top, vh = window.innerHeight || document.documentElement.clientHeight;
    if (bh < 80) return;
    var seen = Math.min(bot, vh) - Math.max(top, navH);
    if (seen >= bh * 0.6) return;
    var y = Math.max(0, top + (window.pageYOffset || 0) - (navH + 8));
    window.scrollTo({ top: y, behavior: S.reducedMotion ? 'auto' : 'smooth' });
  }

  function toggleNote(force) {
    var show = typeof force === 'boolean' ? force : hudEls.note.hidden;
    hudEls.note.hidden = !show;
    hudEls.sim.setAttribute('aria-expanded', show ? 'true' : 'false');
  }

  function renderTelLabels() {
    var def = TEL[lastTel.scene] || TEL.reconstruct;
    ['c0', 'c1', 'c2'].forEach(function (k, i) { hudEls['dt_' + k].textContent = S.ui(def.keys[i]); });
  }

  function renderHudText() {
    if (!hud || !hudEls.title) return;
    hudEls.title.textContent = S.ui('hud.title');
    hudEls.sim.textContent = S.ui('hud.sim');
    hudEls.sim.removeAttribute('title');
    hudEls.sim.setAttribute('aria-label', S.ui('hud.simnote'));
    hudEls.note.textContent = S.ui('hud.simnote');
    hudEls.replay.setAttribute('aria-label', S.ui('hud.replay'));
    hudEls.replay.setAttribute('title', S.ui('hud.replay'));
    if (hudEls.motion) {
      hudEls.motion.setAttribute('aria-label', S.ui('hud.motion')); // constant; aria-pressed carries the state
      syncMotion();
    }
    hudEls.chipWrap.setAttribute('aria-label', S.ui('hud.scenes'));
    Object.keys(hudEls.chips).forEach(function (id) {
      var m = sceneMeta[id] || {}, c = hudEls.chips[id];
      c.label.textContent = S.t(m.label) || id;
      c.hint.textContent = m.hint || '';
    });
    renderTelLabels();
    hudEls.dt_yaw.textContent = S.ui('hud.yaw');
    hudEls.dt_pitch.textContent = S.ui('hud.pitch');
    hudEls.hint.textContent = S.ui(isTouch() ? 'hud.hint.touch' : 'hero.hint');
    hudEls.keys.textContent = S.ui('hud.keys');
    hudEls.telWrap.setAttribute('data-label', S.ui('hud.tel'));
    updateState(lastTel.stateKey || 'hud.training', !!lastTel.active);
  }

  function updateState(key, active) {
    if (!hudEls.state) return;
    hudEls.state.textContent = S.ui(key);
    hud.classList.toggle('is-training', !!active);
  }

  // the button mirrors the visitor's own pause choice (not the OS setting): pressed = paused, icon shows what a press does
  var motionIconOn = null;
  function syncMotion() {
    if (!hudEls.motion || !S.motion) return;
    var paused = !!S.motion.paused();
    hudEls.motion.setAttribute('aria-pressed', paused ? 'true' : 'false');
    hudEls.motion.setAttribute('title', S.ui(paused ? 'hud.motion.resume' : 'hud.motion')); // the tooltip names the next action
    var want = paused ? 'play' : 'pause';
    if (motionIconOn !== want) {
      motionIconOn = want;
      hudEls.motionIcon.innerHTML = S.icon(want, { size: 16 });
    }
  }

  // WCAG 2.1.4: the "keys 1-4" hint only exists while the shortcuts are on
  function syncKeys() {
    if (!hudEls.keys) return;
    hudEls.keys.hidden = !!(S.shortcuts && !S.shortcuts.enabled());
  }

  function syncScene(id) {
    if (!hud || !hudEls.chips) return;
    Object.keys(hudEls.chips).forEach(function (k) {
      hudEls.chips[k].btn.setAttribute('aria-pressed', k === id ? 'true' : 'false');
    });
    if (heroEl) heroEl.setAttribute('data-scene', id);
    if (lastTel.scene !== id) {
      lastTel.scene = id;
      Object.keys(lastTel).forEach(function (k) { if (k.indexOf('t_') === 0) delete lastTel[k]; });
      renderTelLabels(); // values follow with the next telemetry tick (10 Hz)
    }
  }

  function setText(el, key, val) {
    if (!el || lastTel['t_' + key] === val) return;
    lastTel['t_' + key] = val;
    el.textContent = val;
  }
  function onTelemetry(st) {
    if (!hud || !hudEls.c0) return;
    lastTel.last = st;
    if (st.scene !== lastTel.scene) syncScene(st.scene);
    var def = TEL[st.scene] || TEL.reconstruct;
    var m = def.read(st);
    setText(hudEls.c0, 'c0', m.v[0]);
    setText(hudEls.c1, 'c1', m.v[1]);
    setText(hudEls.c2, 'c2', m.v[2]);
    setText(hudEls.yaw, 'yaw', Math.round(st.yaw) + '°');
    setText(hudEls.pitch, 'pitch', Math.round(st.pitch) + '°');
    var p = Math.round(m.p * 200) / 200;
    if (lastTel.p !== p) {
      lastTel.p = p;
      hudEls.barFill.style.transform = 'scaleX(' + p + ')';
    }
    if (lastTel.stateKey !== m.state || lastTel.active !== m.active) {
      lastTel.stateKey = m.state;
      lastTel.active = m.active;
      updateState(m.state, m.active);
    }
  }

  /* --------------------------------------------- hero link buttons (data.js) */
  // The Google Scholar / GitHub buttons ship in index.html (so they work without JS); hrefs are re-synced from data.js.
  function hydrateLinks() {
    (D.links || []).forEach(function (l) {
      var a = document.querySelector('.hero__cta [data-link="' + l.id + '"]');
      if (a && l.href) a.setAttribute('href', l.href);
    });
  }

  /* ------------------------------------------------------------ zh lede phrasing */
  // CSS word-break: auto-phrase only knows Japanese; Chinese still breaks inside words (研|究, 期|间). Where
  // Intl.Segmenter exists, put a <wbr> before every word and let CSS (keep-all) break only there. The text itself
  // is unchanged (textContent, copy / paste and screen readers see the same string). Punctuation stays glued to
  // the word before it, so no line starts with 。 or ，.
  function phraseLede() {
    var el = document.querySelector('.hero__lede');
    if (!el) return;
    el.classList.remove('is-phrased');
    if (S.lang !== 'zh' || !window.Intl || typeof Intl.Segmenter !== 'function') return;
    var txt = el.textContent, frag = document.createDocumentFragment(), buf = '', prevLen = 0;
    try {
      var it = new Intl.Segmenter('zh-CN', { granularity: 'word' }).segment(txt)[Symbol.iterator](), r;
      while (!(r = it.next()).done) {
        var sg = r.value.segment, len = sg.length;
        // the dictionary splits unknown words (多|模|态) into single characters: two singles in a row stay together
        if (r.value.isWordLike && buf && !(prevLen === 1 && len === 1)) {
          frag.appendChild(document.createTextNode(buf));
          frag.appendChild(document.createElement('wbr'));
          buf = '';
        }
        buf += sg;
        prevLen = r.value.isWordLike ? len : prevLen;
      }
    } catch (e) { return; }
    if (buf) frag.appendChild(document.createTextNode(buf));
    el.textContent = '';
    el.appendChild(frag);
    el.classList.add('is-phrased');
  }

  /* ------------------------------------------------------------ typewriter */
  var tw = { el: null, i: 0, n: 0, timer: 0, mode: 'type', visible: true };
  function phrases() {
    return ((D.hero && D.hero.phrases) || []).map(function (p) { return S.t(p); }).filter(Boolean);
  }
  function twClear() { clearTimeout(tw.timer); tw.timer = 0; }
  function twSchedule(ms) { twClear(); tw.timer = setTimeout(twTick, ms); }
  function twActive() { return tw.visible && !document.hidden; }
  function twTick() {
    var list = phrases();
    if (!tw.el || !list.length) return;
    if (!twActive()) return twSchedule(500);
    var cur = list[tw.i % list.length];
    if (S.reducedMotion) { // one static phrase, no rotation
      tw.el.textContent = list[0];
      return;
    }
    if (tw.mode === 'type') {
      tw.n++;
      tw.el.textContent = cur.slice(0, tw.n);
      if (tw.n >= cur.length) { tw.mode = 'hold'; return twSchedule(1900); }
      return twSchedule(48 + Math.random() * 52);
    }
    if (tw.mode === 'hold') { tw.mode = 'erase'; return twSchedule(0); }
    // erase
    tw.n--;
    tw.el.textContent = cur.slice(0, Math.max(0, tw.n));
    if (tw.n <= 0) { tw.i = (tw.i + 1) % list.length; tw.mode = 'type'; return twSchedule(260); }
    return twSchedule(24);
  }
  function twStart(showFull) {
    var list = phrases();
    if (!tw.el || !list.length) return;
    twClear();
    var cur = list[tw.i % list.length];
    if (S.reducedMotion) {
      tw.i = 0;
      tw.el.textContent = list[0];
    } else if (showFull) {
      tw.el.textContent = cur;
      tw.n = cur.length;
      tw.mode = 'hold';
      twSchedule(1900);
    } else {
      tw.n = 0;
      tw.mode = 'type';
      twSchedule(200);
    }
  }
  function buildTyper() {
    tw.el = document.getElementById('hero-phrase');
    if (!tw.el) return;
    tw.i = 0;
    twStart(true);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && tw.timer === 0) twSchedule(200); });
    if ('IntersectionObserver' in window && heroEl) {
      new IntersectionObserver(function (es) {
        tw.visible = es[es.length - 1].isIntersecting;
        if (tw.visible && !tw.timer) twSchedule(200);
      }, { threshold: 0 }).observe(heroEl);
    }
  }

  /* --------------------------------------------------------------- reticle */
  var reticleRaf = 0;
  function buildReticle() {
    if (!heroEl) return;
    reticle = h('div', { class: 'hero__reticle', 'aria-hidden': 'true' },
      h('span', { class: 'hero__reticle-h' }),
      h('span', { class: 'hero__reticle-v' }),
      h('span', { class: 'hero__reticle-label mono' })
    );
    reticle.lastChild.textContent = 'X 0.00 · Y 0.00 · Z 0.00';
    heroEl.appendChild(reticle);
    var upd = function () {
      reticleRaf = 0;
      var p = Math.min(1, (window.pageYOffset || 0) / (window.innerHeight * 0.55));
      reticle.style.opacity = String(Math.max(0, 1 - p * 1.4).toFixed(3));
    };
    window.addEventListener('scroll', function () { if (!reticleRaf) reticleRaf = requestAnimationFrame(upd); }, { passive: true });
    upd();
  }

  /* ------------------------------------------------------------------ init */
  /* ------------------------------------------------------------ name (en / 中文) */
  // English: "Mengqi Guo" (static markup in index.html). Chinese: 郭梦琦 (surname white, given name gradient)
  // with the Latin name as a small mono tag; the h1's accessible name carries both.
  var nameEl = null, nameEnHtml = '';
  function renderName() {
    if (!nameEl) return;
    var m = D.meta || {};
    if (S.lang === 'zh' && m.nameZh) {
      nameEl.textContent = '';
      nameEl.appendChild(h('span', { class: 'hero__name-a' }, m.nameZh.charAt(0)));
      nameEl.appendChild(h('span', { class: 'hero__name-b' }, m.nameZh.slice(1)));
      nameEl.appendChild(h('span', { class: 'hero__latin mono', 'aria-hidden': 'true', lang: 'en' }, m.name || ''));
      nameEl.setAttribute('aria-label', m.nameZh + '（' + (m.name || '') + '）');
    } else {
      nameEl.innerHTML = nameEnHtml; // trusted static markup captured from index.html
      nameEl.removeAttribute('aria-label'); // named by its content: "Mengqi Guo" + the small 郭梦琦 tag (lang="zh-CN")
    }
  }

  function onLang() {
    renderName();
    phraseLede();
    renderHudText();
    twStart(true);
  }

  function init() {
    heroEl = document.getElementById('hero');
    if (!heroEl) { console.warn('[hero] #hero missing'); return; }
    nameEl = heroEl.querySelector('.hero__name');
    if (nameEl) nameEnHtml = nameEl.innerHTML;
    renderName();
    buildHud();
    hydrateLinks();
    phraseLede();
    buildTyper();
    buildReticle();
    S.hydrateIcons(heroEl);

    S.on('langchange', onLang);
    S.on('scenechange', syncScene);
    S.on('motionchange', function () { twStart(true); syncMotion(); });
    S.on('shortcutschange', syncKeys);
    if (coarseQ && coarseQ.addEventListener) coarseQ.addEventListener('change', renderHudText);
    if (S.hero && S.hero.onTelemetry) S.hero.onTelemetry(onTelemetry);
    // WebGL boots after first paint: only flag the hero as static once we know it has no backdrop
    var setStatic = function (st) { heroEl.classList.toggle('hero--static', st === 'none'); };
    setStatic(S.hero ? S.hero.status : 'none');
    S.on('herostatus', setStatic);
  }

  S.register('hero', init);
})();
