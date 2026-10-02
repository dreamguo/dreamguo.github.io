/* ==========================================================================
   nav.js — owns #site-nav completely.

   Renders: fixed glass bar · logo · section links (mono index) with a sliding
   scrollspy pill + hover ghost · ⌘K button · EN|中 toggle · theme toggle ·
   scroll-progress hairline · mobile full-screen menu (focus trap, Esc, scroll lock).

   Public: Site.nav = { go(id), openMenu(), closeMenu(), toggleTheme(x, y), active(), hold(ms), moving() }
   Emits : 'sectionchange' (id)
   Listens: 'paletteopen' (closes the mobile menu), 'langchange', 'themechange'
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;

  var D = S.data || {};
  var doc = document;
  var root = doc.documentElement;
  var h = S.h;
  var clamp = S.clamp;
  var raf = window.requestAnimationFrame.bind(window);
  var wordEl = null; // logo wordmark (name follows the language)

  S.addStrings({
    'nav.menu.open': { en: 'Open menu', zh: '打开菜单' },
    'nav.menu.close': { en: 'Close menu', zh: '关闭菜单' },
    'nav.primary': { en: 'Primary', zh: '主导航' },
    'nav.menu.label': { en: 'Menu', zh: '菜单' },
    'nav.search': { en: 'Search', zh: '搜索' },
    'nav.search.label': { en: 'Search (command palette)', zh: '搜索（命令面板）' },
    'nav.home.label': { en: '{name} — back to top', zh: '{name} — 回到顶部' },
    'nav.lang.en': { en: 'English', zh: 'English' },
    'nav.lang.zh': { en: 'Chinese (中文)', zh: '中文' },
  });

  var NAV_IDS = Array.isArray(D.nav) ? D.nav.slice() : [];

  /* ------------------------------------------------------------------ state */
  var nav, bar, track, pill, ghost, progress, menu, burger;
  var sections = [];
  var linkEls = []; // every anchor (desktop + mobile) — { id, el, kind }
  var bindings = [];
  var menuOpen = false;
  var st = {
    lastY: 0,
    acc: 0,
    ticking: false,
    hidden: false,
    active: null,
    goActive: false,
    endT: 0,
    lastFocus: null,
    nearTop: false, // mouse recall: pointer at the top edge (armed < 8px, held while < 90px)
    py: 9999,
    pyQueued: false,
    rehideT: 0,
    holdUntil: 0, // hold() (Site.pubs.focus(), and go() when the jump started inside the bar) keeps the bar shown until this timestamp
    userScrolled: false, // the bar only auto-hides after a real scroll gesture (wheel, touch, keyboard, pointer)
    keepBar: false, // the running jump started inside the bar: hold the bar again once the page has settled
    goTo: 0, // scroll offset the last go() is travelling to, and the time until which that trip may still be under way
    goBy: 0,
  };

  function bind(fn) {
    bindings.push(fn);
    fn();
  }
  function runBindings() {
    for (var i = 0; i < bindings.length; i++) {
      try {
        bindings[i]();
      } catch (e) {
        if (window.console) console.warn('[nav] binding failed', e);
      }
    }
  }
  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }
  function paletteOpen() {
    return !!(S.palette && S.palette.isOpen && S.palette.isOpen());
  }

  /* ---------------------------------------------------------------- builders */
  function makeLinks(kind) {
    var ul = h('ul', { class: 'nav__list list-reset', role: 'list' });
    NAV_IDS.forEach(function (id, i) {
      var a = h(
        'a',
        { class: 'nav__link', href: '#' + id, dataset: { id: id } },
        h('span', { class: 'nav__idx mono', 'aria-hidden': 'true' }, pad(i + 1)),
        h('span', { class: 'nav__label' })
      );
      a.style.setProperty('--i', String(i));
      if (kind === 'menu') a.appendChild(h('span', { class: 'nav__arrow', html: S.icon('arrow-right'), 'aria-hidden': 'true' }));
      a.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        if (kind === 'menu') {
          closeMenu({ restore: false });
          raf(function () { go(id); });
        } else go(id);
      });
      ul.appendChild(h('li', { class: 'nav__item' }, a));
      linkEls.push({ id: id, el: a, kind: kind });
      bind(function () {
        a.querySelector('.nav__label').textContent = S.ui('nav.' + id);
      });
    });
    return ul;
  }

  function langGroup(cls) {
    var g = h('div', { class: 'nav__lang ' + cls, role: 'group' }, h('span', { class: 'nav__lang-thumb', 'aria-hidden': 'true' }));
    var btns = {};
    ['en', 'zh'].forEach(function (code) {
      var b = h(
        'button',
        {
          type: 'button',
          class: 'nav__lang-btn mono',
          lang: code === 'zh' ? 'zh-CN' : 'en',
          on: { click: function () { S.setLang(code); } },
        },
        code === 'zh' ? '中' : 'EN'
      );
      btns[code] = b;
      g.appendChild(b);
    });
    bind(function () {
      g.setAttribute('aria-label', S.ui('aria.lang'));
      g.setAttribute('data-active', S.lang);
      ['en', 'zh'].forEach(function (code) {
        btns[code].setAttribute('aria-pressed', S.lang === code ? 'true' : 'false');
        btns[code].setAttribute('aria-label', S.ui('nav.lang.' + code));
      });
    });
    return g;
  }

  function themeButton(cls) {
    var b = h(
      'button',
      { type: 'button', class: 'nav__theme ' + cls },
      h('span', { class: 'nav__theme-ico nav__theme-sun', html: S.icon('sun'), 'aria-hidden': 'true' }),
      h('span', { class: 'nav__theme-ico nav__theme-moon', html: S.icon('moon'), 'aria-hidden': 'true' })
    );
    b.addEventListener('click', function () {
      var r = b.getBoundingClientRect();
      toggleTheme(r.left + r.width / 2, r.top + r.height / 2);
    });
    bind(function () {
      var l = S.ui('aria.theme');
      b.setAttribute('aria-label', l);
      // constant label, no aria-pressed: the name never contradicts the state
    });
    return b;
  }

  function cmdkButton(cls) {
    var b = h(
      'button',
      { type: 'button', class: 'nav__cmdk ' + cls, 'data-cmdk-open': '' },
      h('span', { class: 'nav__cmdk-ico', html: S.icon('search'), 'aria-hidden': 'true' }),
      h('span', { class: 'nav__cmdk-text' }),
      h('span', { class: 'kbd nav__cmdk-kbd', 'aria-hidden': 'true' }, S.isMac ? '⌘K' : 'Ctrl K')
    );
    bind(function () {
      b.setAttribute('aria-label', S.ui('nav.search.label'));
      b.querySelector('.nav__cmdk-text').textContent = S.ui('nav.search');
    });
    return b;
  }

  function updateBurger() {
    if (burger) burger.setAttribute('aria-label', S.ui(menuOpen ? 'nav.menu.close' : 'nav.menu.open'));
  }

  function build(host) {
    nav = host;
    host.textContent = '';
    host.classList.add('nav');

    progress = h('div', { class: 'nav__progress', 'aria-hidden': 'true' }, h('span', { class: 'nav__progress-bar' }));

    /* logo */
    var logo = h(
      'a',
      { class: 'nav__logo', href: '#hero' },
      h('span', { class: 'nav__mark', 'aria-hidden': 'true' }, h('span', { class: 'nav__mark-txt' }, 'G')),
      (wordEl = h('span', { class: 'nav__word' }, S.personName() || 'Mengqi Guo'))
    );
    logo.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      go('hero');
    });
    bind(function () {
      // the accessible name starts with the visible text (WCAG 2.5.3 label in name)
      wordEl.textContent = S.personName() || 'Mengqi Guo';
      logo.setAttribute('aria-label', S.fmt(S.ui('nav.home.label'), { name: S.personName() || 'Mengqi Guo' }));
    });

    /* section links + sliding indicators */
    pill = h('span', { class: 'nav__pill', 'aria-hidden': 'true' });
    ghost = h('span', { class: 'nav__ghost', 'aria-hidden': 'true' });
    track = h('div', { class: 'nav__track' }, pill, ghost, makeLinks('bar'));
    var links = h('nav', { class: 'nav__links' }, track);
    bind(function () {
      links.setAttribute('aria-label', S.ui('nav.primary'));
    });

    /* right cluster */
    burger = h(
      'button',
      { type: 'button', class: 'nav__burger', 'aria-expanded': 'false', 'aria-controls': 'nav-menu' },
      h('span', { class: 'nav__burger-box', 'aria-hidden': 'true' }, h('i'), h('i'))
    );
    burger.addEventListener('click', function () {
      if (menuOpen) closeMenu();
      else openMenu();
    });
    bind(updateBurger);

    var tools = h(
      'div',
      { class: 'nav__tools' },
      cmdkButton('nav__tool'),
      langGroup('nav__tool'),
      themeButton('nav__tool'),
      burger
    );

    bar = h(
      'div',
      { class: 'nav__bar' },
      h('div', { class: 'nav__inner' }, logo, links, tools)
    );

    /* mobile full-screen menu (sibling of the bar so the bar's blur can't trap position:fixed) */
    var menuNav = h('nav', { class: 'nav__menu-nav' }, makeLinks('menu'));
    var meta = h('p', { class: 'nav__menu-meta mono' });
    menu = h(
      'div',
      { class: 'nav__menu', id: 'nav-menu' },
      menuNav,
      h('div', { class: 'nav__menu-tools' }, cmdkButton('nav__menu-cmdk'), langGroup('nav__menu-lang'), themeButton('nav__menu-theme')),
      meta
    );
    menu.setAttribute('inert', '');
    menu.addEventListener('scroll', updateMenuMore, { passive: true });
    bind(function () {
      menuNav.setAttribute('aria-label', S.ui('nav.menu.label'));
      if (menuOpen) menu.setAttribute('aria-label', S.ui('nav.menu.label'));
      var m = D.meta || {};
      var parts = [S.t(m.location), m.coords].filter(Boolean);
      meta.textContent = parts.join(' · ');
    });

    host.appendChild(progress);
    host.appendChild(bar);
    host.appendChild(menu);
    host.classList.add('is-mounted');
  }

  /* ------------------------------------------------------- sliding indicators */
  function place(el, link, instant) {
    if (!link) {
      el.classList.remove('is-on');
      return;
    }
    var lr = link.getBoundingClientRect();
    var tr = track.getBoundingClientRect();
    if (!lr.width) return;
    var wasOn = el.classList.contains('is-on');
    var snap = instant || !wasOn;
    if (snap) el.classList.add('no-anim');
    el.style.setProperty('--x', (lr.left - tr.left).toFixed(2) + 'px');
    el.style.setProperty('--w', lr.width.toFixed(2) + 'px');
    el.style.setProperty('--h', lr.height.toFixed(2) + 'px');
    el.classList.add('is-on');
    if (snap) {
      void el.offsetWidth; // commit without animation
      raf(function () { el.classList.remove('no-anim'); });
    }
  }
  function activeBarLink() {
    for (var i = 0; i < linkEls.length; i++) {
      if (linkEls[i].kind === 'bar' && linkEls[i].id === st.active) return linkEls[i].el;
    }
    return null;
  }
  function remeasure() {
    if (!track || !track.offsetWidth) return;
    place(pill, activeBarLink(), true);
    ghost.classList.remove('is-on');
  }
  var remeasureQueued = false;
  function queueRemeasure() {
    if (remeasureQueued) return;
    remeasureQueued = true;
    raf(function () {
      remeasureQueued = false;
      remeasure();
    });
  }

  /* --------------------------------------------------------------- scrollspy */
  function setActive(id) {
    if (id === st.active) return;
    st.active = id;
    linkEls.forEach(function (l) {
      var on = l.id === id;
      l.el.classList.toggle('is-active', on);
      if (on) l.el.setAttribute('aria-current', 'location');
      else l.el.removeAttribute('aria-current');
    });
    place(pill, activeBarLink(), false);
    S.emit('sectionchange', id);
  }

  function spy() {
    if (st.goActive || !sections.length) return;
    var vh = window.innerHeight;
    var anchor = vh * 0.38;
    var cur = null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].el.getBoundingClientRect().top <= anchor) cur = sections[i].id;
    }
    var y = window.pageYOffset || root.scrollTop || 0;
    if (y + vh >= root.scrollHeight - 6 && y > 0) cur = sections[sections.length - 1].id;
    setActive(cur);
  }

  /* --------------------------------------------------------- scroll handling */
  function focusInsideVisibly() {
    var a = doc.activeElement;
    if (!a || a === doc.body || !nav.contains(a)) return false;
    try {
      return a.matches(':focus-visible');
    } catch (e) {
      return true;
    }
  }
  function hoverInside() {
    try {
      return bar.matches(':hover');
    } catch (e) {
      return false;
    }
  }
  function setHidden(v) {
    if (v === st.hidden) return;
    st.hidden = v;
    nav.classList.toggle('is-hidden', v);
  }
  function autoHide(y) {
    var dy = y - st.lastY;
    st.lastY = y;
    if (
      S.reducedMotion || menuOpen || st.goActive || y < 480 || paletteOpen() ||
      focusInsideVisibly() || hoverInside() || st.nearTop || !st.userScrolled || Date.now() < st.holdUntil
    ) {
      st.acc = 0;
      setHidden(false);
      return;
    }
    if (dy === 0) return;
    // real scrolling hands control back to the scroll logic (cancels a pending re-hide after a mouse recall)
    clearTimeout(st.rehideT);
    if ((dy > 0) !== (st.acc > 0)) st.acc = 0;
    st.acc += dy;
    if (st.acc > 56) setHidden(true);
    else if (st.acc < -10) setHidden(false);
  }

  /* ---------------------------------------------- mouse recall (hover devices only)
     Once the bar has auto-hidden, a mouse user can bring it back by pushing the pointer to the top edge
     (< 8px arms it, it is held while the pointer stays within ~90px). When the pointer leaves, the normal
     scroll logic takes over again; if the user does not scroll the bar tucks away after a short pause. */
  var EDGE_ARM = 8;
  var EDGE_HOLD = 90;
  function canAutoHide() {
    var y = window.pageYOffset || root.scrollTop || 0;
    return !(S.reducedMotion || menuOpen || st.goActive || y < 480 || paletteOpen() || focusInsideVisibly() || hoverInside() || Date.now() < st.holdUntil);
  }
  function edgeStep() {
    st.pyQueued = false;
    if (!nav || menuOpen || paletteOpen()) return;
    var py = st.py;
    if (py < EDGE_ARM || (st.nearTop && py < EDGE_HOLD)) {
      clearTimeout(st.rehideT);
      st.nearTop = true;
      st.acc = 0;
      setHidden(false);
    } else if (st.nearTop) {
      st.nearTop = false;
      clearTimeout(st.rehideT);
      st.rehideT = setTimeout(function () {
        if (!st.nearTop && canAutoHide()) setHidden(true);
      }, 1100);
    }
  }
  function onEdgeMove(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    st.py = e.clientY;
    if (st.pyQueued) return;
    if (!st.nearTop && st.py >= EDGE_ARM) return; // nothing to do far from the edge
    st.pyQueued = true;
    raf(edgeStep);
  }
  function onEdgeLeave(e) {
    // pointer left the document: through the top edge (towards the browser chrome) it counts as being at the edge,
    // through any other side it is simply gone
    if (e.relatedTarget) return;
    st.py = e.clientY <= EDGE_ARM ? 0 : 9999;
    if (!st.pyQueued) {
      st.pyQueued = true;
      raf(edgeStep);
    }
  }

  function tick() {
    st.ticking = false;
    if (!nav) return;
    var y = window.pageYOffset || root.scrollTop || 0;
    var max = Math.max(1, root.scrollHeight - window.innerHeight);
    var p = clamp(y / max, 0, 1);
    progress.style.setProperty('--p', p.toFixed(4));
    progress.classList.toggle('is-on', p > 0.003);
    nav.classList.toggle('is-scrolled', y > 8);
    spy();
    autoHide(y);
  }
  function onResize() {
    // layout changed under a still scroll position: re-run the spy and re-place the pill
    if (!st.ticking) {
      st.ticking = true;
      raf(tick);
    }
    queueRemeasure();
    updateMenuMore();
  }
  function onScroll() {
    if (!st.ticking) {
      st.ticking = true;
      raf(tick);
    }
    // after a programmatic jump: when scrolling stops, hand control back to the spy
    if (st.goActive) armEnd(160);
  }
  function armEnd(ms) {
    clearTimeout(st.endT);
    st.endT = setTimeout(function () {
      st.goActive = false;
      if (st.keepBar) {
        st.keepBar = false;
        hold(1500);
      }
      onScroll();
    }, ms);
  }

  /* ------------------------------------------------------------- navigation */
  function go(id, opts) {
    var el = id && id !== 'hero' && id !== 'top' ? doc.getElementById(id) : null;
    var fromBar = !!nav && nav.contains(doc.activeElement); // read before the focus handoff below
    var smooth = !S.reducedMotion && !(opts && opts.instant);
    st.goActive = true;
    armEnd(650);
    setHidden(false);
    if (el && NAV_IDS.indexOf(id) >= 0) setActive(id);
    else if (!el) setActive(null);
    try {
      var top = 0;
      if (el) {
        // land the section heading just under the bar (not the section's empty top padding)
        var pad = parseFloat(window.getComputedStyle(el).paddingTop) || 0;
        var barH = nav ? nav.offsetHeight : 68;
        top = Math.max(0, el.getBoundingClientRect().top + (window.pageYOffset || 0) + pad - barH - 22);
      }
      st.goTo = Math.min(top, Math.max(0, root.scrollHeight - window.innerHeight));
      st.goBy = Date.now() + 4000;
      window.scrollTo({ top: top, behavior: smooth ? 'smooth' : opts && opts.instant ? 'instant' : 'auto' }); // 'auto' would follow html { scroll-behavior: smooth }
    } catch (e) {
      if (el) el.scrollIntoView();
      else window.scrollTo(0, 0);
    }
    // after an in-page jump move the sequential-focus starting point to the target (what a native #link does),
    // so the next Tab continues inside the section instead of returning to the control that was activated
    var ftgt = el ? el.querySelector('.section-head__title') : null;
    if (!ftgt && !el && !fromBar) ftgt = doc.getElementById('main');
    if (ftgt) {
      if (!ftgt.hasAttribute('tabindex')) {
        ftgt.setAttribute('tabindex', '-1');
        ftgt.addEventListener('blur', function () { ftgt.removeAttribute('tabindex'); }, { once: true });
      }
      try { ftgt.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
    // focus has just left the bar: a keyboard user who was using it should not lose it as soon as the page lands
    if (fromBar) {
      st.keepBar = true;
      hold(1500);
    }
    try {
      history.replaceState(null, '', el ? '#' + id : location.pathname + location.search);
    } catch (e) { /* file:// or sandboxed */ }
  }

  /* --------------------------------------------------------- theme transition */
  var pendingTheme = null;
  function toggleTheme(x, y) {
    var did = false;
    // decided at click time, from the latest click whose view-transition callback has not run yet
    var target = (pendingTheme || S.theme) === 'light' ? 'dark' : 'light';
    pendingTheme = target;
    function run() {
      if (did) return;
      did = true;
      if (pendingTheme === target) pendingTheme = null;
      S.setTheme(target);
    }
    var vt = doc.startViewTransition;
    if (!vt || S.reducedMotion || doc.hidden || typeof x !== 'number') {
      run();
      return;
    }
    try {
      root.classList.add('theme-vt');
      var r = Math.sqrt(Math.pow(Math.max(x, window.innerWidth - x), 2) + Math.pow(Math.max(y, window.innerHeight - y), 2));
      var t = doc.startViewTransition(run);
      var done = function () { root.classList.remove('theme-vt'); };
      t.ready
        .then(function () {
          root.animate(
            { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
            { duration: 700, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
          );
        })
        .catch(function () {});
      t.finished.then(done, done);
    } catch (e) {
      root.classList.remove('theme-vt');
      run();
    }
  }

  /* -------------------------------------------------------------- mobile menu */
  function menuFocusables() {
    var list = nav.querySelectorAll('a[href], button:not([disabled])');
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (el.closest('.nav__links')) continue; // desktop links are display:none on mobile anyway
      if (el.getClientRects().length) out.push(el);
    }
    return out;
  }
  var INERT_SEL = '#main, #site-footer';
  function setBackgroundInert(on) {
    var list = doc.querySelectorAll(INERT_SEL);
    for (var i = 0; i < list.length; i++) {
      if (on) list[i].setAttribute('inert', '');
      else list[i].removeAttribute('inert');
    }
  }
  function updateMenuMore() {
    if (!menu) return;
    var more = menuOpen && menu.scrollHeight - menu.clientHeight - menu.scrollTop > 6;
    menu.classList.toggle('has-more', more);
  }
  function openMenu() {
    if (menuOpen || !nav) return;
    menuOpen = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', S.ui('nav.menu.label'));
    setBackgroundInert(true);
    st.lastFocus = doc.activeElement;
    nav.classList.add('is-menu-open');
    burger.setAttribute('aria-expanded', 'true');
    menu.removeAttribute('inert');
    setHidden(false);
    spy(); // make sure the row for the current section is marked before the menu is shown
    if (S.fx) S.fx.lock('nav-menu');
    else root.classList.add('is-locked');
    updateBurger();
    raf(function () {
      var first = menu.querySelector('.nav__menu-nav a');
      if (menuOpen && first) first.focus({ preventScroll: true });
      updateMenuMore();
    });
  }
  function closeMenu(opts) {
    if (!menuOpen) return;
    var hadFocus = nav.contains(doc.activeElement);
    menuOpen = false;
    nav.classList.remove('is-menu-open');
    burger.setAttribute('aria-expanded', 'false');
    menu.setAttribute('inert', '');
    menu.removeAttribute('role');
    menu.removeAttribute('aria-modal');
    menu.removeAttribute('aria-label');
    menu.classList.remove('has-more');
    setBackgroundInert(false);
    if (S.fx) S.fx.unlock('nav-menu');
    else root.classList.remove('is-locked');
    updateBurger();
    if (hadFocus && (!opts || opts.restore !== false) && burger.getClientRects().length) burger.focus({ preventScroll: true });
  }
  function onKeydown(e) {
    if (!menuOpen || paletteOpen()) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key !== 'Tab') return;
    var f = menuFocusables();
    if (!f.length) return;
    var first = f[0];
    var last = f[f.length - 1];
    var a = doc.activeElement;
    if (!nav.contains(a)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && a === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && a === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function routable(id) {
    if (!id) return false;
    if (id === 'hero' || id === 'top') return true;
    return NAV_IDS.indexOf(id) >= 0 && !!doc.getElementById(id);
  }

  /* -------------------------------------------------------------------- init */
  function init() {
    var host = doc.getElementById('site-nav');
    if (!host) {
      if (window.console) console.warn('[nav] #site-nav not found');
      return;
    }
    build(host);

    sections = S.qsa('[data-section]').map(function (el) {
      return { id: el.getAttribute('data-section') || el.id, el: el };
    }).filter(function (s) { return s.id; });

    /* hover ghost + keyboard focus follow */
    track.addEventListener('pointerover', function (e) {
      if (e.pointerType === 'touch') return;
      var a = e.target.closest ? e.target.closest('.nav__link') : null;
      if (a) place(ghost, a, false);
    });
    track.addEventListener('pointerleave', function () {
      ghost.classList.remove('is-on');
    });
    track.addEventListener('focusin', function (e) {
      var a = e.target.closest ? e.target.closest('.nav__link') : null;
      var vis = false;
      try { vis = !!(a && a.matches(':focus-visible')); } catch (err) { vis = !!a; }
      if (vis) place(ghost, a, false);
    });
    track.addEventListener('focusout', function () {
      ghost.classList.remove('is-on');
    });
    nav.addEventListener('focusin', function () {
      if (focusInsideVisibly()) setHidden(false);
    });

    /* in-page anchors: one landing routine for the bar, the palette, hero CTAs, footer links and #hash deep links */
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.target || a.hasAttribute('download') || a.classList.contains('skip-link')) return;
      var id = decodeURIComponent(a.getAttribute('href').slice(1));
      if (!routable(id)) return;
      e.preventDefault();
      go(id);
    });
    window.addEventListener('hashchange', function () {
      var id = decodeURIComponent(location.hash.slice(1));
      if (routable(id)) go(id);
    });
    (function initialHash() {
      var id = decodeURIComponent(location.hash.slice(1));
      if (!routable(id) || id === 'hero' || id === 'top') return;
      var jump = function () { go(id, { instant: true }); };
      // the browser has already scrolled with its own offset; redo it with ours once layout is final
      if (doc.readyState === 'complete') raf(jump);
      else window.addEventListener('load', function () { raf(jump); });
    })();

    /* measurement triggers */
    window.addEventListener('resize', onResize, { passive: true });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(queueRemeasure);
      ro.observe(track);
      linkEls.forEach(function (l) { if (l.kind === 'bar') ro.observe(l.el); });
    }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(queueRemeasure);
    window.addEventListener('load', queueRemeasure);

    /* mouse recall of the auto-hidden bar: fine-pointer hover devices only, never touch */
    var hoverMq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    if (hoverMq && hoverMq.matches) {
      doc.addEventListener('pointermove', onEdgeMove, { passive: true });
      doc.documentElement.addEventListener('mouseleave', onEdgeLeave);
    }

    /* scrolling: auto-hide stays off until the first real scroll gesture, so deep links and programmatic landings keep the bar */
    var armHide = function () { st.userScrolled = true; };
    ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (ev) {
      window.addEventListener(ev, armHide, { passive: true, once: true });
    });
    // a wheel or touch gesture takes over from any jump still under way
    ['wheel', 'touchmove'].forEach(function (ev) {
      window.addEventListener(ev, function () { st.goBy = 0; }, { passive: true });
    });
    window.addEventListener('scroll', onScroll, { passive: true });
    doc.addEventListener('keydown', onKeydown);

    var mq = window.matchMedia ? window.matchMedia('(min-width: 60em)') : null;
    if (mq) {
      var onMq = function () { if (mq.matches && menuOpen) closeMenu({ restore: false }); queueRemeasure(); };
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    }

    S.on('langchange', function () {
      runBindings();
      queueRemeasure();
      setTimeout(queueRemeasure, 120);
    });
    S.on('themechange', runBindings);
    S.on('paletteopen', function () { closeMenu({ restore: false }); });

    st.lastY = window.pageYOffset || 0;
    tick();
    queueRemeasure();
  }

  // keep the bar shown while a programmatic jump lands (the downward travel is not the reader scrolling)
  function hold(ms) {
    st.holdUntil = Date.now() + (ms || 1500);
    st.acc = 0;
    setHidden(false);
  }
  // true while a programmatic jump is gliding or its hold window is open (core.js skips its scroll restore then). Frames
  // can be further apart than armEnd()'s quiet window, so a jump also counts as under way until it has reached its target.
  function moving() {
    var now = Date.now();
    return st.goActive || now < st.holdUntil || (now < st.goBy && Math.abs((window.pageYOffset || 0) - st.goTo) > 2);
  }

  S.nav = {
    go: go,
    openMenu: openMenu,
    closeMenu: closeMenu,
    toggleTheme: toggleTheme,
    active: function () { return st.active; },
    hold: hold,
    moving: moving,
  };

  S.register('nav', init);
})();
