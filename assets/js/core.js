/* ==========================================================================
   core.js — shared runtime. Exposes window.Site.
   Classic script (no ES modules) so the site also works when opened from file://.

   Public API:
     Site.data                    window.SITE_DATA
     Site.lang / Site.theme       'en'|'zh'  /  'dark'|'light'  (first visit: browser language + OS light/dark setting)
     Site.t(v)                    resolve a string or {en, zh} for the current language
     Site.ui(key)                 UI string by key   (Site.addStrings({key:{en,zh}}) to add more)
     Site.fmt(str, vars)          "{n} papers" -> "8 papers"
     Site.rich(str)               [text](url) **bold** `code` -> DocumentFragment (no innerHTML)
     Site.h(tag, attrs, ...kids)  tiny hyperscript
     Site.icon(name, opts)        SVG string   (icons.js)   Site.hydrateIcons(root)
     Site.on / off / emit         event bus:  'langchange' 'themechange' 'motionchange' 'shortcutschange' 'ready'
     Site.register(name, init)    module registry; Site.start() calls each init in order
     Site.setLang / toggleLang / setTheme / toggleTheme
     Site.store.get/set           safe localStorage (namespaced "mq:")
     Site.copyText(text)          Promise<boolean>
     Site.reducedMotion, Site.coarse   live booleans. reducedMotion is the EFFECTIVE value:
                                  (OS prefers-reduced-motion) OR (visitor paused motion via Site.motion).
     Site.motion                  { paused(), set(bool), toggle() } — in-page pause control (WCAG 2.2.2); persisted as store
                                  key "motion" ('paused'|'running'); toggles html.motion-off (base.css kills all CSS
                                  animation/transition); emits 'motionchange' (bool: the new effective Site.reducedMotion)
                                  only when that effective value actually changes.
     Site.shortcuts               { enabled(), set(bool) } — single-key shortcuts ('/', '1'-'4') on/off (WCAG 2.1.4);
                                  persisted as store key "shortcuts" ('on'|'off'); emits 'shortcutschange' (bool).
                                  Modules with single-key handlers must early-return when !Site.shortcuts.enabled().
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var listeners = Object.create(null);
  var modules = [];

  /* ---------------------------------------------------------------- storage */
  var store = {
    get: function (k, d) {
      try {
        var v = window.localStorage.getItem('mq:' + k);
        return v === null ? d : v;
      } catch (e) {
        return d;
      }
    },
    set: function (k, v) {
      try {
        window.localStorage.setItem('mq:' + k, v);
      } catch (e) {
        /* private mode etc. */
      }
    },
  };

  /* -------------------------------------------------------------- utilities */
  function clamp(v, a, b) {
    return Math.min(b, Math.max(a, v));
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function debounce(fn, ms) {
    var t;
    return function () {
      var self = this,
        args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, ms);
    };
  }
  function qs(sel, el) {
    return (el || document).querySelector(sel);
  }
  function qsa(sel, el) {
    return Array.prototype.slice.call((el || document).querySelectorAll(sel));
  }

  /* ---------------------------------------------------------------- events */
  function on(evt, fn) {
    (listeners[evt] = listeners[evt] || []).push(fn);
    return function () {
      off(evt, fn);
    };
  }
  function off(evt, fn) {
    var a = listeners[evt];
    if (!a) return;
    var i = a.indexOf(fn);
    if (i >= 0) a.splice(i, 1);
  }
  function emit(evt, detail) {
    var a = listeners[evt];
    if (!a) return;
    a.slice().forEach(function (fn) {
      try {
        fn(detail);
      } catch (e) {
        console.error('[Site] listener for "' + evt + '" failed', e);
      }
    });
  }

  /* ------------------------------------------------------------------ h() */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class' || k === 'className') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === 'on') Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
        else if (k === 'html') el.innerHTML = v; // trusted strings only (icons)
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { append(el, x); });
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }

  /* ------------------------------------------------------------------ i18n */
  var data = window.SITE_DATA || {};
  data.ui = data.ui || {};

  function t(v, lang) {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    var l = lang || Site.lang;
    return v[l] != null ? v[l] : v.en != null ? v.en : '';
  }
  function ui(key) {
    var v = data.ui[key];
    if (v == null) {
      if (window.console && console.warn) console.warn('[Site] missing ui string:', key);
      return key;
    }
    return t(v);
  }
  function addStrings(map) {
    Object.keys(map).forEach(function (k) { data.ui[k] = map[k]; });
  }
  function fmt(str, vars) {
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return vars && vars[k] != null ? vars[k] : m;
    });
  }

  // groups: 1 link text, 2 url, 3 **bold**, 4 *serif italic*, 5 `code`
  var RICH_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  // only http(s), mailto, hash and relative URLs become anchors (never javascript:, data:, vbscript: ...)
  var SAFE_URL_RE = /^(https?:|mailto:|#|\/|\.{0,2}\/|[\w-]+\/)/i;
  function rich(str) {
    var frag = document.createDocumentFragment();
    str = t(str);
    var last = 0,
      m;
    RICH_RE.lastIndex = 0;
    while ((m = RICH_RE.exec(str))) {
      if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
      if (m[1]) {
        if (SAFE_URL_RE.test(m[2])) {
          var a = h('a', { href: m[2], class: 'link' }, m[1]);
          if (/^https?:/i.test(m[2])) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          frag.appendChild(a);
        } else frag.appendChild(document.createTextNode(m[1]));
      } else if (m[3]) frag.appendChild(h('strong', null, m[3]));
      else if (m[4]) frag.appendChild(h('em', { class: 'serif-em' }, m[4]));
      else if (m[5]) frag.appendChild(h('code', { class: 'mono' }, m[5]));
      last = m.index + m[0].length;
    }
    if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
    return frag;
  }

  function i18nStatic(scope) {
    scope = scope || document;
    qsa('[data-i18n]', scope).forEach(function (el) {
      var s = ui(el.getAttribute('data-i18n'));
      if (el.hasAttribute('data-i18n-rich')) {
        el.textContent = '';
        el.appendChild(rich(s));
      } else el.textContent = s;
    });
    qsa('[data-i18n-attr]', scope).forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split(':');
        if (p.length === 2) el.setAttribute(p[0].trim(), ui(p[1].trim()));
      });
    });
  }

  // The person's name in the current language: "Mengqi Guo" (en) / "郭梦琦" (zh); *Both* = "Mengqi Guo 郭梦琦".
  function personName(lang) {
    var m = data.meta || {};
    return (lang || Site.lang) === 'zh' && m.nameZh ? m.nameZh : m.name || '';
  }
  function personNameBoth() {
    var m = data.meta || {};
    return m.nameZh ? (m.name || '') + ' ' + m.nameZh : m.name || '';
  }

  function applyLangToDocument() {
    root.setAttribute('lang', Site.lang === 'zh' ? 'zh-CN' : 'en');
    root.setAttribute('data-lang', Site.lang);
    if (data.ui['meta.title']) document.title = ui('meta.title');
    var md = qs('meta[name="description"]');
    if (md && data.ui['meta.description']) md.setAttribute('content', ui('meta.description'));
  }

  function setLang(l, opts) {
    l = l === 'zh' ? 'zh' : 'en';
    var changed = l !== Site.lang;
    Site.lang = l;
    if (!opts || opts.persist !== false) store.set('lang', l);
    applyLangToDocument();
    i18nStatic(document);
    if (changed || (opts && opts.force)) emit('langchange', l);
  }
  function toggleLang() {
    setLang(Site.lang === 'zh' ? 'en' : 'zh');
  }

  /* ----------------------------------------------------------------- theme */
  // First visit (no ?theme=, nothing saved): follow the OS light/dark setting, live. Any explicit choice
  // (the toggle, the palette, or a saved one) stops that. Same rules as the inline <head> script in index.html.
  var followSystemTheme = false;
  function pickValue(v, a, b) {
    v = String(v || '').toLowerCase();
    return v === a || v === b ? v : '';
  }
  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  // Browser language: the first Chinese (zh*) or English (en*) entry of navigator.languages decides; default English.
  function browserLang() {
    var ls = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (var i = 0; i < ls.length; i++) {
      var c = String(ls[i] || '').toLowerCase();
      if (/^zh([-_]|$)/.test(c)) return 'zh';
      if (/^en([-_]|$)/.test(c)) return 'en';
    }
    return 'en';
  }
  function watchSystemTheme() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var onChange = function () {
      if (!followSystemTheme) return;
      if (pickValue(store.get('theme', ''), 'light', 'dark')) {
        followSystemTheme = false; // a choice was saved meanwhile (another tab): it wins
        return;
      }
      setTheme(mq.matches ? 'light' : 'dark', { persist: false });
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  function setTheme(th, opts) {
    th = th === 'light' ? 'light' : 'dark';
    var changed = th !== Site.theme;
    Site.theme = th;
    root.setAttribute('data-theme', th);
    if (!opts || opts.persist !== false) {
      store.set('theme', th);
      followSystemTheme = false; // an explicit choice wins over the OS setting from now on
    }
    var mt = qs('meta[name="theme-color"]');
    if (mt) mt.setAttribute('content', th === 'light' ? '#f4f6f9' : '#06080c');
    if (changed) emit('themechange', th);
  }
  function toggleTheme() {
    setTheme(Site.theme === 'light' ? 'dark' : 'light');
  }

  /* ----------------------------------------------------------- misc helpers */
  function copyText(text) {
    function fallback() {
      try {
        var ta = h('textarea', { 'aria-hidden': 'true', style: { position: 'fixed', top: '-1000px', opacity: '0' } });
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch (e) {
        return false;
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  /* ------------------------------------------------------------- shortcuts */
  // Single-character shortcuts must be switchable (WCAG 2.1.4). Default ON; Cmd/Ctrl+K is not affected.
  var shortcutsOn = store.get('shortcuts', 'on') !== 'off';
  var shortcuts = {
    enabled: function () {
      return shortcutsOn;
    },
    set: function (on) {
      on = !!on;
      if (on === shortcutsOn) return;
      shortcutsOn = on;
      store.set('shortcuts', on ? 'on' : 'off');
      emit('shortcutschange', on);
    },
  };

  /* ---------------------------------------------------------------- motion */
  // Site.reducedMotion is the effective preference: the OS setting OR the visitor's in-page pause.
  // Every module that honors Site.reducedMotion + 'motionchange' therefore obeys the pause control automatically;
  // CSS is covered by html.motion-off (base.css). The inline <head> script sets the class before first paint.
  var motionMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var osReduce = !!(motionMq && motionMq.matches);
  var userPaused = store.get('motion', 'running') === 'paused';
  var motionReady = false;

  function applyMotion() {
    var eff = osReduce || userPaused;
    var changed = eff !== !!Site.reducedMotion;
    root.classList.toggle('motion-off', userPaused);
    Site.reducedMotion = eff;
    if (changed && motionReady) emit('motionchange', eff);
  }
  var motion = {
    paused: function () {
      return userPaused;
    },
    set: function (paused) {
      paused = !!paused;
      if (paused === userPaused) return;
      userPaused = paused;
      store.set('motion', paused ? 'paused' : 'running');
      applyMotion();
    },
    toggle: function () {
      motion.set(!userPaused);
    },
  };
  function initMotion() {
    motionReady = true;
    Site.reducedMotion = osReduce || userPaused; // silent: modules have not initialized yet
    root.classList.toggle('motion-off', userPaused);
    if (motionMq) {
      var onOs = function (e) {
        osReduce = e.matches;
        applyMotion();
      };
      if (motionMq.addEventListener) motionMq.addEventListener('change', onOs);
      else if (motionMq.addListener) motionMq.addListener(onOs);
    }
    // keep several open tabs in sync
    window.addEventListener('storage', function (e) {
      if (e.key !== 'mq:motion') return;
      userPaused = e.newValue === 'paused';
      applyMotion();
    });
  }

  /* --------------------------------------------------- zh phrasing (prose) */
  // CSS word-break: auto-phrase only knows Japanese, so Chinese prose still breaks inside words (博士学|位, 工|程师).
  // Where Intl.Segmenter exists, put a <wbr> in front of every word of the prose text nodes below and let CSS
  // (keep-all on .is-phrased) break only there. textContent, copy / paste and screen readers see the same string.
  // zh only; a MutationObserver re-phrases text the modules (re)render. The hero lede is phrased by hero.js, the hero
  // is not observed at all. Engines without Intl.Segmenter keep the plain CSS behavior (line-break: strict).
  var phrasing = (function () {
    var ROOTS = '#about-body, #news-body, #research-body, #journey-body, #recognition-body, #contact-body, #site-footer, .section-head, .hero__hiring-text';
    var PROSE = 'p, li, dd, figcaption, .section-head__kicker';
    var SKIP = 'code, pre, textarea, [data-nophrase], .hero__lede';
    var CJK = /[\u3400-\u9fff\uf900-\ufaff]{2}/;
    var OPENER = /[（「『“‘《〈【〔［(]+$/;
    var SINGLE = /[\u3400-\u9fff\uf900-\ufaff]/;
    // names and terms the dictionary would split apart: never break inside these
    var KEEP = /北京航空航天大学|新加坡国立大学|华为维纳研究所（新加坡）|约翰斯·霍普金斯大学|北京大学|沈元学院|深圳实验学校|旷视研究院|计算机科学与技术|研究员|实习生|研究实习生|博士学位|学士学位|优秀毕业生|研究成就奖|研究奖学金|高斯泼溅|多模态|具身智能|空间智能|基础模型/g;
    var seg = null, obs = null, roots = [];

    function isWbr(n) {
      return !!n && n.nodeType === 1 && n.nodeName === 'WBR';
    }
    function phraseNode(tn) {
      var txt = tn.nodeValue, par = tn.parentNode;
      if (!txt || !par || par.nodeType !== 1 || !CJK.test(txt) || isWbr(tn.previousSibling) || isWbr(tn.nextSibling)) return;
      var host = par.closest(PROSE);
      if (!host || par.closest(SKIP)) return;
      var keep = [];
      txt.replace(KEEP, function (m, off) {
        keep.push([off, off + m.length]);
        return m;
      });
      function insideKeep(i) {
        for (var k = 0; k < keep.length; k++) if (i > keep[k][0] && i < keep[k][1]) return true;
        return false;
      }
      var frag = document.createDocumentFragment(), buf = '', cuts = 0;
      // a text node that follows an element (link, bold) starts a new word: allow a break at the seam
      if (tn.previousSibling) buf = '\u200B';
      try {
        var it = seg.segment(txt)[Symbol.iterator](), r;
        while (!(r = it.next()).done) {
          var sg = r.value.segment;
          // the dictionary leaves stray single characters (工程|师, 学|位): they stay with the word before them
          if (r.value.isWordLike && buf && !(sg.length === 1 && SINGLE.test(sg)) && !insideKeep(r.value.index)) {
            buf = buf.replace('\u200B', '');
            var opener = OPENER.exec(buf); // an opening bracket belongs to the word after it
            if (opener) buf = buf.slice(0, opener.index);
            if (buf) frag.appendChild(document.createTextNode(buf));
            frag.appendChild(document.createElement('wbr'));
            cuts++;
            buf = opener ? opener[0] : '';
          }
          buf += sg;
        }
      } catch (e) {
        return;
      }
      if (!cuts) return;
      if (buf) frag.appendChild(document.createTextNode(buf));
      par.replaceChild(frag, tn);
      host.classList.add('is-phrased');
    }
    function textNodes(node, out) {
      if (node.nodeType === 3) return out.push(node);
      if (node.nodeType !== 1) return;
      var w = document.createTreeWalker(node, 4, null, false), n;
      while ((n = w.nextNode())) out.push(n);
    }
    function run(nodes) {
      var list = [];
      nodes.forEach(function (n) {
        textNodes(n, list);
      });
      list.forEach(phraseNode);
      if (obs) obs.takeRecords(); // drop the mutations made by phrasing itself
    }
    function onMutations(records) {
      var added = [];
      records.forEach(function (r) {
        for (var i = 0; i < r.addedNodes.length; i++) added.push(r.addedNodes[i]);
      });
      if (added.length) run(added);
    }
    function sync() {
      if (obs) obs.disconnect();
      if (Site.lang !== 'zh' || !window.Intl || typeof Intl.Segmenter !== 'function' || !window.MutationObserver) return;
      try {
        seg = seg || new Intl.Segmenter('zh-CN', { granularity: 'word' });
      } catch (e) {
        return;
      }
      roots = qsa(ROOTS);
      obs = obs || new MutationObserver(onMutations);
      run(roots);
      roots.forEach(function (el) {
        obs.observe(el, { childList: true, subtree: true });
      });
    }
    return { sync: sync };
  })();

  /* -------------------------------------------------------------- registry */
  function register(name, init) {
    modules.push({ name: name, init: init });
  }

  var started = false;
  function start() {
    if (started) return;
    started = true;

    // motion preference (live): OS setting + in-page pause, see the motion block above
    initMotion();
    // pointer preference (live)
    var cq = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
    Site.coarse = !!(cq && cq.matches);

    // initial theme + language (the inline <head> script already set the attributes)
    // priority: ?theme= / ?lang= (this visit only) > saved choice > OS light/dark setting and browser language
    var q = new URLSearchParams(location.search);
    var urlTheme = pickValue(q.get('theme'), 'light', 'dark');
    var savedTheme = pickValue(store.get('theme', ''), 'light', 'dark');
    followSystemTheme = !urlTheme && !savedTheme;
    setTheme(urlTheme || savedTheme || systemTheme(), { persist: false });
    if (followSystemTheme) watchSystemTheme();
    setLang(pickValue(q.get('lang'), 'zh', 'en') || pickValue(store.get('lang', ''), 'zh', 'en') || browserLang(), {
      persist: false,
      force: false,
    });
    hydrateIcons(document);

    modules.forEach(function (m) {
      try {
        m.init();
      } catch (e) {
        console.error('[Site] module "' + m.name + '" failed to init', e);
      }
    });

    root.classList.add('is-ready');
    on('langchange', phrasing.sync);
    phrasing.sync();
    emit('ready');
  }

  function hydrateIcons(scope) {
    qsa('[data-icon]', scope || document).forEach(function (el) {
      if (el.firstChild && el.firstChild.nodeType === 1 && el.firstChild.tagName.toLowerCase() === 'svg') return;
      el.innerHTML = Site.icon(el.getAttribute('data-icon'), { cls: el.getAttribute('data-icon-class') || '' });
      el.setAttribute('aria-hidden', 'true');
    });
  }

  /* ---------------------------------------------------------------- export */
  var Site = (window.Site = {
    data: data,
    lang: 'en',
    theme: 'dark',
    reducedMotion: osReduce || userPaused,
    motion: motion,
    coarse: false,
    store: store,
    clamp: clamp,
    lerp: lerp,
    debounce: debounce,
    qs: qs,
    qsa: qsa,
    on: on,
    off: off,
    emit: emit,
    h: h,
    t: t,
    ui: ui,
    addStrings: addStrings,
    fmt: fmt,
    rich: rich,
    i18nStatic: i18nStatic,
    hydrateIcons: hydrateIcons,
    setLang: setLang,
    toggleLang: toggleLang,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    personName: personName,
    personNameBoth: personNameBoth,
    copyText: copyText,
    shortcuts: shortcuts,
    register: register,
    start: start,
    icon: function () { return ''; }, // replaced by icons.js
  });
})();
