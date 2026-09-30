/* ==========================================================================
   journey.js — education & experience timeline (renders into #journey-body).

   * Rail-left timeline: period · node tile (monogram + kind icon) · card.
   * A glowing progress line fills as the section scrolls through the viewport
     (rAF-throttled passive scroll, CSS-variable driven: --p on the track).
     Under reduced motion the rail is static and fully lit.
   * Chips filter All / Work / Education / Internships (aria-pressed).
   * Language switch re-renders without replaying the entrance animation.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;

  var D = S.data || {};
  var h = S.h;

  S.addStrings({
    'journey.list': { en: 'Education and experience timeline', zh: '教育与工作经历时间线' },
    'journey.filter': { en: 'Filter the timeline by type', zh: '按类型筛选经历' },
    'journey.f.all': { en: 'All', zh: '全部' },
    'journey.f.work': { en: 'Work', zh: '工作' },
    'journey.f.edu': { en: 'Education', zh: '教育' },
    'journey.f.intern': { en: 'Internships', zh: '实习' },
    'journey.k.work': { en: 'Work', zh: '工作' },
    'journey.k.edu': { en: 'Education', zh: '教育' },
    'journey.k.intern': { en: 'Internship', zh: '实习' },
    'journey.now': { en: 'Now', zh: '现在' },
    'journey.count': { en: '{n} of {total} entries', zh: '显示 {n} / {total} 项' },
    'journey.newtab': { en: 'opens in a new tab', zh: '在新标签页打开' },
  });

  var KINDS = ['work', 'edu', 'intern'];
  var ICONS = { work: 'briefcase', edu: 'graduation', intern: 'cube' };

  var state = { filter: 'all' };
  var root = null;
  var track = null;
  var chipsWrap = null;
  var readout = null;

  var nodes = [];
  var centers = [];
  var railTop = 0;
  var railH = 0;
  var lastP = -1;
  var litCount = -1;
  var inView = false;
  var raf = 0;
  var io = null;
  var ro = null;

  /* ------------------------------------------------------------ data helpers */
  function entries() {
    return Array.isArray(D.journey) ? D.journey : [];
  }
  function kindOf(it) {
    return KINDS.indexOf(it && it.kind) >= 0 ? it.kind : 'work';
  }
  function visibleItems() {
    var all = entries();
    if (state.filter === 'all') return all;
    return all.filter(function (it) {
      return kindOf(it) === state.filter;
    });
  }
  function yearSpan(items) {
    var ys = [];
    items.forEach(function (it) {
      var m = String(S.t(it.period, 'en') || '').match(/\d{4}/g) || []; // start-year-only periods ('2020') are fine
      m.forEach(function (y) {
        ys.push(+y);
      });
      if (it.current) ys.push((D.meta && D.meta.year) || new Date().getFullYear());
    });
    if (!ys.length) return '';
    var a = Math.min.apply(null, ys);
    var b = Math.max.apply(null, ys);
    return a === b ? String(a) : a + ' — ' + b; // spaced em dash, like every other range on the site
  }

  /* --------------------------------------------------------------- builders */
  function buildToolbar(items) {
    var counts = { all: items.length };
    KINDS.forEach(function (k) {
      counts[k] = 0;
    });
    items.forEach(function (it) {
      counts[kindOf(it)]++;
    });
    var filters = ['all'].concat(
      KINDS.filter(function (k) {
        return counts[k] > 0;
      })
    );
    if (filters.indexOf(state.filter) < 0) state.filter = 'all';

    chipsWrap = h(
      'div',
      { class: 'journey__filters', role: 'group', 'aria-label': S.ui('journey.filter') },
      filters.map(function (f) {
        return h(
          'button',
          {
            type: 'button',
            class: 'chip journey__chip',
            'aria-pressed': String(f === state.filter),
            dataset: { filter: f },
            on: {
              click: function () {
                setFilter(f);
              },
            },
          },
          f !== 'all' ? h('span', { class: 'journey__chip-ico', 'aria-hidden': 'true', html: S.icon(ICONS[f], { size: 14 }) }) : null,
          h('span', null, S.ui('journey.f.' + f)),
          h('span', { class: 'chip__count' }, String(counts[f]))
        );
      })
    );
    readout = h('p', { class: 'journey__readout mono', 'aria-live': 'polite' });
    updateReadout();
    return h('div', { class: 'journey__bar reveal' }, chipsWrap, readout, h('span', { id: 'journey-newtab', hidden: true }, S.ui('journey.newtab')));
  }

  function updateReadout() {
    if (!readout) return;
    var vis = visibleItems();
    readout.textContent = '';
    readout.appendChild(h('span', { class: 'journey__prompt', 'aria-hidden': 'true' }, '›'));
    readout.appendChild(h('span', null, S.fmt(S.ui('journey.count'), { n: vis.length, total: entries().length })));
    var span = yearSpan(vis);
    if (span) readout.appendChild(h('span', { class: 'journey__range' }, span));
  }

  function buildItem(it, i, mode) {
    var kind = kindOf(it);
    var orgText = S.t(it.org);
    var mono = String(it.mono || orgText.charAt(0) || '').slice(0, 4);
    var cls = 'jnode' + (it.current ? ' is-current' : '');
    if (mode === 'init') cls += ' reveal';
    else if (mode === 'lang') cls += ' reveal is-in';
    else cls += ' is-enter';

    // zh: keep each institution segment on one line ('约翰斯·霍普金斯大学 · CCVL' may only wrap at the ' · ')
    var orgPlain = orgText.replace(/\u00A0/g, ' ');
    var orgNode =
      S.lang === 'zh' && orgPlain.indexOf(' · ') > 0
        ? orgPlain.split(' · ').map(function (seg, k, all) {
            // the middle dot stays glued to the segment before it, so a line can never start with '·'
            return [k ? ' ' : null, h('span', { class: 'jnode__seg' }, k < all.length - 1 ? seg + '\u00A0·' : seg)];
          })
        : orgText;
    // the "opens in a new tab" note is the link's description, so it stays out of the heading's accessible name
    var org = it.orgUrl
      ? h(
          'a',
          { class: 'jnode__orglink', href: it.orgUrl, target: '_blank', rel: 'noopener noreferrer', 'aria-describedby': 'journey-newtab' },
          h('span', null, orgNode),
          h('span', { class: 'jnode__ext', 'aria-hidden': 'true', html: S.icon('arrow-up-right', { size: 16 }) })
        )
      : orgNode;

    var top = h(
      'div',
      { class: 'jnode__top' },
      h('span', { class: 'jnode__kindlabel eyebrow' }, S.ui('journey.k.' + kind)),
      it.current
        ? h('span', { class: 'badge badge--new jnode__now' }, h('span', { class: 'jnode__now-dot', 'aria-hidden': 'true' }), S.ui('journey.now'))
        : null
    );

    var main = h(
      'div',
      { class: 'jnode__main' },
      h('h3', { class: 'jnode__org' }, org),
      it.role ? h('p', { class: 'jnode__role' }, S.t(it.role)) : null,
      it.place
        ? h(
            'p',
            { class: 'jnode__place mono' },
            h('span', { 'aria-hidden': 'true', html: S.icon('map-pin', { size: 14 }) }),
            S.t(it.place)
          )
        : null
    );

    // a count like 'NeurIPS ×2' must not break between the sign and the digit (word joiner)
    var note = it.note ? h('div', { class: 'jnode__note' }, h('p', null, S.rich(S.t(it.note).replace(/×(?=\d)/g, '×\u2060')))) : null;

    var li = h(
      'li',
      { class: cls, dataset: { kind: kind } },
      h('p', { class: 'jnode__period mono' }, S.t(it.period)),
      h(
        'div',
        { class: 'jnode__node', 'aria-hidden': 'true' },
        h('span', { class: 'jnode__mono', dataset: { len: String(mono.length) } }, mono),
        h('span', { class: 'jnode__kind', html: S.icon(ICONS[kind], { size: 12 }) })
      ),
      h('span', { class: 'jnode__tie', 'aria-hidden': 'true' }),
      h('article', { class: 'jnode__card panel' + (it.current ? ' ticks' : '') + (note ? ' has-note' : '') }, top, main, note)
    );
    li.style.setProperty('--i', String(Math.min(i, 6)));
    return li;
  }

  function buildTrack(items, mode) {
    var rail = h(
      'div',
      { class: 'journey__rail', 'aria-hidden': 'true' },
      h('span', { class: 'journey__rail-fill' }),
      h('span', { class: 'journey__rail-head' })
    );
    var ol = h(
      'ol',
      { class: 'journey__list list-reset', role: 'list', 'aria-label': S.ui('journey.list') },
      items.map(function (it, i) {
        return buildItem(it, i, mode);
      })
    );
    return h('div', { class: 'journey__track is-settling' }, rail, ol);
  }

  /* ----------------------------------------------------- mount / measure / fx */
  function teardownObservers() {
    if (io) io.disconnect();
    if (ro) ro.disconnect();
    io = null;
    ro = null;
    inView = false;
  }

  function mount(newTrack, mode) {
    teardownObservers();
    if (track && track.parentNode) track.parentNode.replaceChild(newTrack, track);
    else root.appendChild(newTrack);
    track = newTrack;
    nodes = S.qsa('.jnode', track);
    lastP = -1;
    litCount = -1;
    measure();
    update();
    // let the first paint happen without lit-state transitions (language switch / filter)
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (track === newTrack) track.classList.remove('is-settling');
      });
    });
    observe();
    if (S.fx && S.fx.refresh) S.fx.refresh(root);
    else S.qsa('.reveal', root).forEach(function (el) { el.classList.add('is-in'); });
    return mode;
  }

  function measure() {
    if (!track) return;
    centers = nodes.map(function (li) {
      var n = li.querySelector('.jnode__node');
      return n ? li.offsetTop + n.offsetTop + n.offsetHeight / 2 : li.offsetTop;
    });
    railTop = centers.length ? centers[0] : 0;
    railH = centers.length > 1 ? centers[centers.length - 1] - railTop : 0;
    track.style.setProperty('--rail-top', railTop + 'px');
    track.style.setProperty('--rail-h', railH + 'px');
  }

  function update() {
    raf = 0;
    if (!track) return;
    var p, lit, i;
    if (S.reducedMotion) {
      p = 1;
      lit = nodes.length;
    } else {
      var fy = window.innerHeight * 0.55 - track.getBoundingClientRect().top; // reference line in track coords
      p = railH > 0 ? S.clamp((fy - railTop) / railH, 0, 1) : fy >= railTop ? 1 : 0;
      lit = 0;
      for (i = 0; i < centers.length; i++) if (centers[i] <= fy + 6) lit = i + 1;
    }
    if (Math.abs(p - lastP) > 0.0004) {
      lastP = p;
      track.style.setProperty('--p', p.toFixed(4));
      track.classList.toggle('is-started', p > 0.001);
    }
    if (lit !== litCount) {
      litCount = lit;
      for (i = 0; i < nodes.length; i++) nodes[i].classList.toggle('is-lit', i < lit);
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(update);
  }

  function remeasure() {
    if (!track) return;
    measure();
    lastP = -1;
    litCount = -1;
    schedule();
  }

  function observe() {
    if (!track) return;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        function (entriesIO) {
          inView = entriesIO[entriesIO.length - 1].isIntersecting;
          schedule();
        },
        { rootMargin: '15% 0px 15% 0px' }
      );
      io.observe(track);
    } else {
      inView = true;
    }
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(function () {
        window.requestAnimationFrame(remeasure);
      });
      ro.observe(track);
    }
  }

  /* --------------------------------------------------------------- rendering */
  function render(mode) {
    if (!root) return;
    var items = entries();
    if (!items.length) {
      console.warn('[journey] no journey data');
      return;
    }
    root.textContent = '';
    track = null;
    root.appendChild(buildToolbar(items));
    mount(buildTrack(visibleItems(), mode), mode);
    if (mode === 'lang' && S.fx && S.fx.refresh) S.qsa('.reveal', root).forEach(function (el) { el.classList.add('is-in'); });
  }

  function setFilter(f) {
    if (f === state.filter) return;
    state.filter = f;
    S.qsa('.journey__chip', chipsWrap).forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.filter === f));
    });
    updateReadout();
    mount(buildTrack(visibleItems(), 'filter'), 'filter');
    // phones: the chip row is a scroller, keep the chosen chip in view (after the track swap, so layout is settled)
    var on = chipsWrap.querySelector('[aria-pressed="true"]');
    if (on && on.scrollIntoView) on.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: S.reducedMotion ? 'instant' : 'smooth' });
  }

  function onScroll() {
    if (inView && !raf) raf = requestAnimationFrame(update);
  }

  S.register('journey', function () {
    root = document.getElementById('journey-body');
    if (!root) {
      console.warn('[journey] #journey-body not found');
      return;
    }
    render('init');
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', S.debounce(remeasure, 120), { passive: true });
    S.on('langchange', function () {
      render('lang');
    });
    S.on('motionchange', function () {
      lastP = -1;
      litCount = -1;
      schedule();
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
  });
})();
