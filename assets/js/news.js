/* ==========================================================================
   news.js — NEWS section (#news-body): a terminal-style log.
   The shell (window chrome, prompt line, chips, list containers, more button)
   is built once; only the filter chips / rows / labels are re-rendered, so the
   typed prompt never replays and filter + expanded state survive a language
   switch.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var D = S.data || {};
  var h = S.h;

  S.addStrings({
    'news.filter': { en: 'Filter news by type', zh: '按类型筛选动态' },
    'news.all': { en: 'All', zh: '全部' },
    'news.paper': { en: 'Papers', zh: '论文' },
    'news.career': { en: 'Career', zh: '经历' },
    'news.award': { en: 'Awards', zh: '荣誉' },
    'news.tag.paper': { en: 'Paper', zh: '论文' },
    'news.tag.career': { en: 'Career', zh: '经历' },
    'news.tag.award': { en: 'Award', zh: '荣誉' },
    'news.new': { en: 'New', zh: '最新' },
    'news.view': { en: 'view paper', zh: '查看论文' },
    'news.lines': { en: '{n} entries', zh: '共 {n} 条' },
    'news.showing': { en: 'Showing {n} entries', zh: '当前显示 {n} 条' },
  });

  var TYPES = ['paper', 'career', 'award'];
  var state = { filter: 'all', expanded: false };
  var els = {};
  var hasFold = false;
  var typing = null; // timer id while the prompt is being typed

  /* ------------------------------------------------------------- helpers */
  function goPaper(id) {
    if (S.pubs && typeof S.pubs.focus === 'function') S.pubs.focus(id);
    else location.hash = '#paper-' + id;
  }

  function paperById(id) {
    var list = D.papers || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function allItems() {
    var list = (D.news || []).slice();
    // newest first; Array#sort is stable so items without .sort keep their order
    list.sort(function (a, b) {
      return String(b.sort || '').localeCompare(String(a.sort || ''));
    });
    return list;
  }

  function visibleCount() {
    var n = parseInt(D.newsVisible, 10);
    return n > 0 ? n : 6;
  }

  function filtered() {
    var all = allItems();
    if (state.filter === 'all') return all;
    return all.filter(function (it) {
      return it.type === state.filter;
    });
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  /* ------------------------------------------------------- prompt / typing */
  function cmdString() {
    var s = state.expanded && hasFold ? 'cat news.log' : 'head -n ' + visibleCount() + ' news.log';
    if (state.filter !== 'all') s += ' | grep -i ' + state.filter;
    return s;
  }

  function setCmd() {
    if (typing) {
      clearTimeout(typing);
      typing = null;
    }
    els.cmd.textContent = cmdString();
  }

  // reserve the prompt's final width so the toolbar never re-wraps (layout shift) while it types
  function reservePrompt(full) {
    els.cmd.textContent = full;
    var w = els.prompt.offsetWidth;
    els.prompt.style.minWidth = Math.min(w, els.term.clientWidth - 36) + 'px';
  }

  function typeCmd() {
    var full = cmdString();
    var i = 0;
    reservePrompt(full);
    els.cmd.textContent = '';
    (function step() {
      i++;
      els.cmd.textContent = full.slice(0, i);
      if (i < full.length) typing = setTimeout(step, 34 + Math.random() * 42);
      else {
        typing = null;
        els.prompt.style.minWidth = '';
      }
    })();
  }

  /* ---------------------------------------------------------------- rows */
  function row(it, i, mode, isLast) {
    var type = it.type || 'career';
    var paper = it.paper ? paperById(it.paper) : null;
    var cls = 'news__item';
    if (mode === 'first') cls += ' reveal';
    else if (mode === 'filter') cls += ' is-enter';
    if (isLast) cls += ' is-last';

    var dateAttrs = { class: 'news__date mono' };
    if (/^\d{4}(-\d{2})?$/.test(String(it.sort || ''))) dateAttrs.datetime = it.sort;

    return h(
      'li',
      { class: cls, 'data-type': type, style: '--i:' + Math.min(i, 8) },
      h('span', { class: 'news__node', 'aria-hidden': 'true' }),
      h('div', { class: 'news__meta' }, h('time', dateAttrs, S.t(it.date)), h('span', { class: 'badge news__tag' }, S.ui('news.tag.' + type))),
      h(
        'p',
        { class: 'news__text' },
        paper && paper.isNew ? h('span', { class: 'badge badge--new news__new' }, S.ui('news.new')) : null,
        S.rich(it.text)
      ),
      paper
        ? h(
            'a',
            {
              class: 'news__view mono',
              href: '#paper-' + paper.id,
              on: {
                click: function (e) {
                  // plain click -> Site.pubs.focus; modified / middle clicks keep native link behavior
                  if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  goPaper(paper.id);
                },
              },
            },
            // accessible name starts with the visible text ("view paper — 4D3R")
            h('span', null, S.ui('news.view')),
            h('span', { class: 'sr-only' }, ' — ' + (paper.short || paper.id)),
            h('span', { class: 'news__view-arrow', html: S.icon('arrow-right') })
          )
        : null
    );
  }

  function renderList(mode) {
    var items = filtered();
    var n = visibleCount();
    var head = items.slice(0, n);
    var tail = items.slice(n);
    hasFold = tail.length > 0;

    clear(els.head);
    clear(els.tail);
    head.forEach(function (it, i) {
      els.head.appendChild(row(it, i, mode, !hasFold && i === head.length - 1));
    });
    tail.forEach(function (it, i) {
      els.tail.appendChild(row(it, n + i, mode === 'first' ? 'lang' : mode, i === tail.length - 1));
    });

    els.fold.hidden = !hasFold;
    els.moreWrap.hidden = !hasFold;
    els.moreCount.textContent = String(tail.length);
    els.lines.textContent = S.fmt(S.ui('news.lines'), { n: items.length });
    syncFold();
    setCmd();
    return items.length;
  }

  function syncFold() {
    var open = state.expanded && hasFold;
    els.fold.classList.toggle('is-open', open);
    els.more.setAttribute('aria-expanded', open ? 'true' : 'false');
    els.moreLabel.textContent = S.ui(open ? 'common.less' : 'common.more');
    els.moreIcon.classList.toggle('is-flipped', open);
    var lastHead = els.head.lastElementChild;
    if (lastHead) lastHead.classList.toggle('is-fade', hasFold && !open);
  }

  /* ------------------------------------------------------------- filters */
  function renderFilters() {
    var all = allItems();
    var counts = { all: all.length };
    TYPES.forEach(function (t) {
      counts[t] = all.filter(function (it) {
        return it.type === t;
      }).length;
    });
    clear(els.filters);
    ['all'].concat(TYPES).forEach(function (k) {
      if (k !== 'all' && !counts[k]) return;
      els.filters.appendChild(
        h(
          'button',
          {
            class: 'chip',
            type: 'button',
            'data-filter': k,
            'aria-pressed': state.filter === k ? 'true' : 'false',
            on: {
              click: function () {
                setFilter(k);
              },
            },
          },
          S.ui('news.' + k),
          h('span', { class: 'chip__count' }, String(counts[k]))
        )
      );
    });
  }

  function syncFilters() {
    S.qsa('.chip', els.filters).forEach(function (b) {
      var on = b.getAttribute('data-filter') === state.filter;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      // phones: the chip row is a scroller, keep the chosen chip in view
      if (on && b.scrollIntoView) b.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: S.reducedMotion ? 'instant' : 'smooth' });
    });
  }

  function setFilter(k) {
    if (k === state.filter) return;
    state.filter = k;
    syncFilters();
    var total = renderList('filter');
    els.live.textContent = S.fmt(S.ui('news.showing'), { n: total });
  }

  function toggleMore() {
    state.expanded = !state.expanded;
    syncFold();
    setCmd();
    if (!state.expanded && els.term.getBoundingClientRect().top < 0) {
      // collapsing from far down: bring the terminal back into view instead of stranding the reader
      els.term.scrollIntoView({ block: 'start', behavior: S.reducedMotion ? 'auto' : 'smooth' });
    }
  }

  /* --------------------------------------------------------------- shell */
  function buildShell(root) {
    els.cmd = h('span', { class: 'news__cmd-text' });
    els.filters = h('div', { class: 'news__filters', role: 'group', 'aria-label': S.ui('news.filter') });
    els.lines = h('span', { class: 'news__lines' });
    els.live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
    els.head = h('ol', { class: 'news__list list-reset', role: 'list' });
    els.tail = h('ol', { class: 'news__list list-reset', role: 'list' });
    els.fold = h('div', { class: 'news__fold', id: 'news-fold' }, h('div', { class: 'news__fold-inner' }, els.tail));

    els.moreLabel = h('span', null);
    els.moreCount = h('span', { class: 'news__more-count mono' });
    els.moreIcon = h('span', { class: 'news__more-icon', html: S.icon('chevron-down') });
    els.more = h(
      'button',
      {
        class: 'btn btn--ghost btn--sm news__more',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': 'news-fold',
        on: { click: toggleMore },
      },
      els.moreLabel,
      els.moreCount,
      els.moreIcon
    );
    els.moreWrap = h('div', { class: 'news__more-wrap' }, els.more);

    els.prompt = h('p', { class: 'news__prompt mono', 'aria-hidden': 'true' }, h('span', { class: 'news__ps1' }, '$'), els.cmd, h('span', { class: 'caret' }));

    els.term = h(
      'div',
      { class: 'news__term panel' },
      h(
        'div',
        { class: 'news__chrome', 'aria-hidden': 'true' },
        h('span', { class: 'news__lights' }, h('i'), h('i'), h('i')),
        h('span', { class: 'news__file mono' }, 'news.log'),
        els.lines
      ),
      h('div', { class: 'news__toolbar' }, els.prompt, els.filters),
      h('div', { class: 'news__log' }, els.head, els.fold),
      els.moreWrap,
      els.live
    );

    root.appendChild(els.term);
  }

  function init() {
    var root = document.getElementById('news-body');
    if (!root) {
      if (window.console && console.warn) console.warn('[news] #news-body not found');
      return;
    }
    if (!(D.news || []).length) return;

    buildShell(root);
    renderFilters();
    renderList('first');

    // type the prompt once, the first time the terminal scrolls into view
    if (!S.reducedMotion && 'IntersectionObserver' in window) {
      reservePrompt(cmdString());
      els.cmd.textContent = '';
      var io = new IntersectionObserver(
        function (entries) {
          if (!entries.some(function (e) { return e.isIntersecting; })) return;
          io.disconnect();
          typeCmd();
        },
        { threshold: 0.35 }
      );
      io.observe(els.term);
    }

    if (S.fx && typeof S.fx.refresh === 'function') S.fx.refresh(root);

    S.on('langchange', function () {
      els.filters.setAttribute('aria-label', S.ui('news.filter'));
      renderFilters();
      renderList('lang');
    });
  }

  S.register('news', init);
})();
