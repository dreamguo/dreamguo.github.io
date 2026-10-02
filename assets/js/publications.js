/* ==========================================================================
   publications.js — the research section (renders into #research-body).

   Toolbar (search + venue/topic chips + results line) → default view
   (featured NEW paper, selected-paper cards, compact "other" list) or, when a
   filter / query is active, one flat card list in data order.

   Public API:  Site.pubs = { focus(id), filter(state), reset(), state() }
     focus(id)   clear filters, scroll to #paper-<id> and flash it (also runs for
                 location.hash === '#paper-<id>' on load and on hashchange)
     filter(s)   s = { q?: string, scope?: 'all'|'selected'|<venue key>, topics?: [ids] }
     reset()     clear search + all filters

   Also: '/' focuses the search field (unless single-key shortcuts are switched
   off), BibTeX popover (non-modal dialog). Star counts are the static
   `paper.stars` values from data.js (no network requests).
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var h = S.h;
  var D = S.data || {};
  var PAPERS = Array.isArray(D.papers) ? D.papers.filter(function (p) { return p && p.id; }) : [];
  var TOPICS = Array.isArray(D.topics) ? D.topics : [];

  /* ------------------------------------------------------------ UI strings */
  S.addStrings({
    'pubs.aria': { en: 'Publications', zh: '论文列表' },
    'pubs.search.placeholder': { en: 'Search title, author, venue, tag…', zh: '搜索标题、作者、会议、标签…' },
    'pubs.search.placeholder.s': { en: 'Search papers…', zh: '搜索论文…' },
    'pubs.search.label': { en: 'Search papers', zh: '搜索论文' },
    'pubs.search.clear': { en: 'Clear search', zh: '清除搜索' },
    'pubs.g.scope': { en: 'show', zh: '显示' },
    'pubs.g.scope.aria': { en: 'Filter by selection or venue', zh: '按代表作、会议或期刊筛选' },
    'pubs.g.topic': { en: 'topic', zh: '主题' },
    'pubs.g.topic.aria': { en: 'Filter by topic', zh: '按主题筛选' },
    'pubs.chip.all': { en: 'All', zh: '全部' },
    'pubs.chip.selected': { en: 'Selected', zh: '代表作' },
    'pubs.chip.journal': { en: 'Journal', zh: '期刊' },
    'pubs.chip.preprint': { en: 'Preprint', zh: '预印本' },
    'pubs.status': { en: 'Showing {n} of {total} papers', zh: '显示 {n} / {total} 篇论文' },
    'pubs.reset': { en: 'Reset', zh: '重置' },
    'pubs.empty.q': { en: 'No papers match “{q}”.', zh: '没有与“{q}”匹配的论文。' },
    'pubs.empty.f': { en: 'No papers match these filters.', zh: '没有符合当前筛选的论文。' },
    'pubs.empty.clear': { en: 'Clear filters', zh: '清除筛选' },
    'pubs.h.latest': { en: 'Latest paper', zh: '最新论文' },
    'pubs.h.selected': { en: 'Selected work', zh: '代表作' },
    'pubs.h.more': { en: 'More selected work', zh: '更多代表作' },
    'pubs.h.other': { en: 'Other publications & preprints', zh: '其他论文与预印本' },
    'pubs.group.count': { en: '{n} papers', zh: '{n} 篇' },
    'pubs.group.count.one': { en: '{n} paper', zh: '{n} 篇' },
    'pubs.new': { en: 'New', zh: '最新' },
    'pubs.eq': { en: 'Equal contribution', zh: '同等贡献' },
    'pubs.au.more': { en: 'Show {n} more authors', zh: '显示另外 {n} 位作者' },
    'pubs.au.less': { en: 'Show fewer authors', zh: '收起作者' },
    'pubs.btn.paper': { en: 'Paper', zh: '论文' },
    'pubs.btn.arxiv': { en: 'arXiv', zh: 'arXiv' },
    'pubs.btn.pdf': { en: 'PDF', zh: 'PDF' },
    'pubs.btn.code': { en: 'Code', zh: '代码' },
    'pubs.btn.project': { en: 'Project', zh: '项目页' },
    'pubs.btn.poster': { en: 'Poster', zh: '海报' },
    'pubs.btn.openreview': { en: 'OpenReview', zh: 'OpenReview' },
    'pubs.btn.dataset': { en: 'Dataset', zh: '数据集' },
    'pubs.btn.bibtex': { en: 'BibTeX', zh: 'BibTeX' },
    'pubs.stars': { en: 'GitHub stars', zh: 'GitHub 星标' },
    'pubs.newtab': { en: 'opens in a new tab', zh: '在新标签页打开' },
    'pubs.au.note': { en: ' ({t})', zh: '（{t}）' },
    'pubs.bib.aria': { en: 'BibTeX for {t}', zh: '{t} 的 BibTeX' },
    'pubs.bib.close': { en: 'Close', zh: '关闭' },
    'pubs.bib.copied': { en: 'BibTeX copied', zh: 'BibTeX 已复制' },
    'pubs.bib.manual': { en: 'Press Ctrl/⌘+C to copy', zh: '请按 Ctrl/⌘+C 复制' },
    'pubs.cap.illus': { en: 'Illustration', zh: '示意动画' },
    'pubs.cap.hover': { en: 'Preview', zh: '预览' },
    'pubs.canvas': { en: 'Animated illustration of a 3D scene', zh: '三维场景动画示意图' },
    'pubs.cap.touch': { en: 'Plays in view', zh: '滚动到此自动播放' },
    'pubs.tag.search': { en: 'Search “{t}”', zh: '搜索“{t}”' },
  });
  function ui(k) {
    return S.ui(k);
  }

  /* ==========================================================================
     BibTeX generation — pure functions (unit-tested outside the browser)
     ========================================================================== */
  /* @bib-begin */
  function fold(s) {
    s = String(s == null ? '' : s);
    if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return s;
  }
  function slug(s) {
    return fold(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
  }
  function splitName(n) {
    n = String(n).replace(/\s+/g, ' ').trim();
    var i = n.lastIndexOf(' ');
    return i < 0 ? { first: '', last: n } : { first: n.slice(0, i), last: n.slice(i + 1) };
  }
  function bibAuthors(p) {
    if (p.bib && p.bib.author) return p.bib.author;
    var out = [],
      gap = false;
    (p.authors || []).forEach(function (a) {
      if (!a) return;
      if (a.ellipsis) {
        gap = true;
        return;
      }
      var s = splitName(a.n);
      out.push(s.first ? s.last + ', ' + s.first : s.last);
    });
    if (gap) out.push('others');
    return out.join(' and ');
  }
  /* wrap acronyms / CamelCase / alphanumerics in {} so BibTeX styles keep their case */
  function protectTitle(title) {
    return String(title)
      .split(/(\s+)/)
      .map(function (tok) {
        if (!tok || /^\s+$/.test(tok)) return tok;
        var m = /^(\W*)(.*?)(\W*)$/.exec(tok);
        if (!m || !m[2]) return tok;
        var core = m[2];
        var camel = /[A-Z]/.test(core.slice(1)) && !/^[A-Z][a-z]+(-[A-Z][a-z]+)*$/.test(core);
        var mixed = /\d/.test(core) && /[A-Za-z]/.test(core);
        return camel || mixed ? m[1] + '{' + core + '}' + m[3] : tok;
      })
      .join('');
  }
  var STOP = { a: 1, an: 1, the: 1, on: 1, of: 1, for: 1, in: 1, to: 1, and: 1, via: 1, with: 1, from: 1 };
  function shortWord(title) {
    var words = String(title).split(/\s+/);
    for (var i = 0; i < words.length; i++) {
      var w = slug(words[i]);
      if (w && !STOP[w]) return w;
    }
    return 'paper';
  }
  function bibKey(p) {
    var first = null;
    (p.authors || []).some(function (a) {
      if (a && !a.ellipsis) {
        first = a;
        return true;
      }
      return false;
    });
    var last = first ? slug(splitName(first.n).last) : '';
    return (last || 'anon') + (p.year || '') + shortWord(p.title);
  }
  function bibEscape(s) {
    return String(s).replace(/[&%#]/g, function (c, off, str) {
      return str.charAt(off - 1) === '\\' ? c : '\\' + c;
    });
  }
  function makeBibtex(p) {
    var b = p.bib || {};
    var type = b.type || (p.kind === 'conference' ? 'inproceedings' : 'article');
    var f = [];
    function add(k, v) {
      if (v != null && v !== '') f.push('  ' + k + '={' + v + '}');
    }
    add('title', bibEscape(protectTitle(p.title)));
    add('author', bibEscape(bibAuthors(p)));
    add('booktitle', b.booktitle && bibEscape(b.booktitle));
    add('journal', b.journal && bibEscape(b.journal));
    add('volume', b.volume);
    add('number', b.number);
    add('pages', b.pages);
    add('publisher', b.publisher && bibEscape(b.publisher));
    add('organization', b.organization && bibEscape(b.organization));
    add('year', p.year);
    add('doi', b.doi);
    add('url', b.url);
    add('note', b.note && bibEscape(b.note));
    return '@' + type + '{' + bibKey(p) + ',\n' + f.join(',\n') + '\n}';
  }
  /* @bib-end */

  /* --------------------------------------------------------------- helpers */
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function hashStr(s) {
    var x = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      x ^= s.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  }
  function isExt(u) {
    return /^https?:\/\//i.test(u);
  }
  function linkProps(u, cls) {
    var o = { href: u, class: cls };
    if (isExt(u)) {
      o.target = '_blank';
      o.rel = 'noopener noreferrer';
      o['aria-describedby'] = NEWTAB_ID; /* one hidden hint per section, not a sr-only span in every name */
    }
    return o;
  }
  function ico(name, size, cls) {
    return h('span', { class: 'pub__ico' + (cls ? ' ' + cls : ''), 'aria-hidden': 'true', html: S.icon(name, { size: size || 16 }) });
  }
  var NEWTAB_ID = 'pubs-newtab';
  function syncNewTabHint() {
    var n = document.getElementById(NEWTAB_ID);
    if (n) n.textContent = ui('pubs.newtab');
  }
  function tpl(str, map) {
    var frag = document.createDocumentFragment();
    String(str)
      .split(/(\{\w+\})/)
      .forEach(function (part) {
        var m = /^\{(\w+)\}$/.exec(part);
        if (m && map && map[m[1]] != null) {
          var v = map[m[1]];
          frag.appendChild(v instanceof Node ? v : document.createTextNode(String(v)));
        } else if (part) frag.appendChild(document.createTextNode(part));
      });
    return frag;
  }
  function reduced() {
    return !!S.reducedMotion;
  }
  function primaryHref(p) {
    var l = p.links || {};
    return l.project || l.arxiv || l.journal || l.pdf || null;
  }
  function venueKey(p) {
    if (p.kind === 'journal') return 'journal';
    if (p.kind === 'preprint') return 'preprint';
    return slug(p.venue) || 'other';
  }
  var KNOWN_BADGE = { neurips: 1, eccv: 1, cvpr: 1, journal: 1, preprint: 1 };

  /* ----------------------------------------------------------------- state */
  var st = { q: '', scope: 'all', topics: [] };
  var V = { root: null, bar: null, stage: null, input: null, chips: [], status: null, reset: null, search: null, sig: '' };
  var E = {}; // id -> { p, card, li, body, media, row, rowLi, ... }
  var SCOPES = [];
  var HAY = {};
  var HERO = PAPERS.filter(function (p) { return p.isNew; })[0] || null;

  function tokensOf(q) {
    return fold(q).toLowerCase().split(/\s+/).filter(Boolean);
  }
  function isFiltered() {
    return !!(st.q.trim() || st.scope !== 'all' || st.topics.length);
  }
  function inScope(p, id) {
    return id === 'all' ? true : id === 'selected' ? !!p.selected : venueKey(p) === id;
  }
  function inTopics(p, ids) {
    if (!ids.length) return true;
    var pt = p.topics || [];
    for (var i = 0; i < ids.length; i++) if (pt.indexOf(ids[i]) >= 0) return true;
    return false;
  }
  function inQuery(p, tokens) {
    if (!tokens.length) return true;
    var hay = HAY[p.id] || '';
    for (var i = 0; i < tokens.length; i++) if (hay.indexOf(tokens[i]) < 0) return false;
    return true;
  }
  function matchesAll(p, tokens) {
    return inQuery(p, tokens) && inScope(p, st.scope) && inTopics(p, st.topics);
  }

  function buildIndex() {
    var topicLabel = {};
    TOPICS.forEach(function (t) {
      topicLabel[t.id] = S.t(t.label);
    });
    PAPERS.forEach(function (p) {
      var parts = [p.title, p.short, p.venue, p.badge, String(p.year || ''), S.t(p.venueLong), p.award, p.kind];
      if (p.kind === 'journal') parts.push(ui('pubs.chip.journal'));
      if (p.kind === 'preprint') parts.push(ui('pubs.chip.preprint'));
      (p.authors || []).forEach(function (a) {
        if (a && !a.ellipsis) parts.push(a.n);
      });
      (p.tags || []).forEach(function (t) {
        parts.push(t);
        parts.push(String(t).replace(/-/g, ' '));
      });
      (p.topics || []).forEach(function (id) {
        parts.push(topicLabel[id] || id);
      });
      HAY[p.id] = fold(parts.filter(Boolean).join(' • ')).toLowerCase();
    });
  }

  function buildScopes() {
    SCOPES = [{ id: 'all' }];
    if (PAPERS.some(function (p) { return p.selected; })) SCOPES.push({ id: 'selected' });
    var seen = {},
      hasJ = false,
      hasP = false;
    PAPERS.forEach(function (p) {
      var k = venueKey(p);
      if (k === 'journal') hasJ = true;
      else if (k === 'preprint') hasP = true;
      else if (!seen[k]) {
        seen[k] = 1;
        SCOPES.push({ id: k, label: p.venue });
      }
    });
    if (hasJ) SCOPES.push({ id: 'journal' });
    if (hasP) SCOPES.push({ id: 'preprint' });
  }
  function scopeLabel(s) {
    if (s.id === 'all') return ui('pubs.chip.all');
    if (s.id === 'selected') return ui('pubs.chip.selected');
    if (s.id === 'journal') return ui('pubs.chip.journal');
    if (s.id === 'preprint') return ui('pubs.chip.preprint');
    return s.label || s.id;
  }

  /* Stars are the static `paper.stars` numbers from data.js: no network requests for star counts.
     Drop the caches an earlier version of this page may have left in localStorage. */
  function purgeOldStarCache() {
    try {
      var ls = window.localStorage,
        dead = [];
      for (var i = 0; i < ls.length; i++) {
        var k = ls.key(i);
        if (k && k.indexOf('mq:stars:') === 0) dead.push(k);
      }
      dead.forEach(function (k) {
        ls.removeItem(k);
      });
    } catch (e) {
      /* private mode etc. */
    }
  }

  /* ==========================================================================
     Card building
     ========================================================================== */
  var touchIO = null;
  function getTouchIO() {
    if (touchIO || typeof IntersectionObserver !== 'function') return touchIO;
    touchIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          var ctl = en.target._pubVideo;
          if (!ctl) return;
          if (en.isIntersecting && S.coarse && !reduced()) ctl.play();
          else ctl.stop();
        });
      },
      { rootMargin: '-36% 0px -36% 0px', threshold: 0 }
    );
    return touchIO;
  }

  var clampRO = null;
  function isClamped(el) {
    return el.scrollHeight > el.clientHeight + 1;
  }
  function setClamp(el, on) {
    var wrap = el.parentNode;
    if (wrap && !wrap.classList.contains('is-open')) wrap.classList.toggle('is-clamped', on);
  }
  function checkClamp(el) {
    setClamp(el, isClamped(el));
  }
  /* Decide every attached TL;DR now (all measurements first, then the class changes: one layout, not one per card).
     The ResizeObserver only reports a size change after the frame's scripts have run, so after a rebuild the
     44px "Show more" rows would arrive a beat later and push the reading position down. */
  function settleClamps() {
    var tls = [];
    Object.keys(E).forEach(function (id) {
      var t = E[id].tldrEl;
      if (t && t.isConnected) tls.push(t);
    });
    var over = tls.map(isClamped);
    tls.forEach(function (t, i) {
      setClamp(t, over[i]);
    });
  }
  function watchClamp(el) {
    if (typeof ResizeObserver === 'function') {
      if (!clampRO) {
        clampRO = new ResizeObserver(function (entries) {
          entries.forEach(function (en) {
            checkClamp(en.target);
          });
        });
      }
      clampRO.observe(el);
    } else {
      requestAnimationFrame(function () {
        checkClamp(el);
      });
    }
  }
  function unwatchClamp(el) {
    if (clampRO && el) clampRO.unobserve(el);
  }

  function fallbackSceneFor(p) {
    return (p.topics || []).indexOf('dynamic') >= 0 ? 'spacetime' : 'splat';
  }
  function altOf(p) {
    return (p.teaser && S.t(p.teaser.alt)) || '';
  }
  function mountCanvas(p, scene, seedOffset, generic) {
    var cv = h('canvas', { class: 'pub__canvas', role: 'img', 'aria-label': generic ? ui('pubs.canvas') : altOf(p) || ui('pubs.canvas') });
    if (S.teasers && S.teasers.mount) {
      var inst = S.teasers.mount(cv, scene, { seed: hashStr(p.id) + (seedOffset || 0) });
      return { el: cv, inst: inst };
    }
    return { el: cv, inst: null };
  }
  /* alt text / aria-label follow the language (data.js gives {en, zh}) */
  function relabelMedia(e) {
    var p = e.p;
    if (e.imgEl) e.imgEl.setAttribute('alt', altOf(p));
    if (e.canvasEl) e.canvasEl.setAttribute('aria-label', e.canvasGeneric ? ui('pubs.canvas') : altOf(p) || ui('pubs.canvas'));
  }

  /* Teaser images get their src only when the card is within ~600px of the viewport
     (a <video poster> or an early lazy-load would fetch them at page load otherwise). */
  var mediaIO = null;
  function whenNear(frame, fn) {
    if (typeof IntersectionObserver !== 'function') {
      fn();
      return;
    }
    if (!mediaIO) {
      mediaIO = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            mediaIO.unobserve(en.target);
            var f = en.target._pubLoad;
            en.target._pubLoad = null;
            if (f) f();
          });
        },
        { rootMargin: '600px 0px 600px 0px', threshold: 0 }
      );
    }
    frame._pubLoad = fn;
    mediaIO.observe(frame);
  }

  function buildMedia(p, e) {
    var t = p.teaser;
    var href = primaryHref(p);
    var frame = h('div', { class: 'pub__frame' });
    var capKind = null;

    if (t && t.type === 'procedural') {
      var pc = mountCanvas(p, t.scene || fallbackSceneFor(p));
      frame.appendChild(pc.el);
      e.inst = pc.inst;
      e.canvasEl = pc.el;
      capKind = 'illus';
    } else if (t && t.src) {
      frame.className += ' pub__frame--img';
      var img = h('img', {
        class: 'pub__img',
        alt: altOf(p),
        width: 1280,
        height: 720,
        loading: 'lazy',
        decoding: 'async',
        draggable: 'false',
      });
      e.imgEl = img;
      img.addEventListener('error', function () {
        var fb = mountCanvas(p, fallbackSceneFor(p), 17, true);
        if (img.parentNode) img.parentNode.replaceChild(fb.el, img);
        frame.classList.remove('pub__frame--img');
        e.imgEl = null;
        e.inst = fb.inst;
        e.canvasEl = fb.el;
        e.canvasGeneric = true;
      });
      frame.appendChild(img);
      var vid = null;
      if (t.video) {
        vid = attachVideo(p, frame, e);
        capKind = 'video';
      }
      whenNear(frame, function () {
        img.src = t.src;
        if (vid) vid.poster = t.src;
      });
    } else {
      frame.className += ' pub__frame--type';
      frame.appendChild(h('span', { class: 'pub__glyph', 'aria-hidden': 'true' }, p.short || p.title));
      frame.appendChild(h('span', { class: 'pub__glyph-sub', 'aria-hidden': 'true' }, [p.venue, p.year].filter(Boolean).join(' · ')));
    }

    if (href) frame.appendChild(h('a', Object.assign(linkProps(href, 'pub__cover'), { tabindex: '-1', 'aria-hidden': 'true' })));
    if (capKind) {
      var cap = h('span', { class: 'pub__cap', 'data-kind': capKind, 'aria-hidden': 'true' }, capKind === 'video' ? ico('play', 10) : null, h('span', { class: 'pub__cap-t' }));
      frame.appendChild(cap);
    }
    return frame;
  }

  function setCaptions(e) {
    var cap = e.media && e.media.querySelector('.pub__cap');
    if (!cap) return;
    var kind = cap.getAttribute('data-kind');
    var txt = cap.querySelector('.pub__cap-t');
    if (!txt) return;
    txt.textContent = kind === 'illus' ? ui('pubs.cap.illus') : S.coarse ? ui('pubs.cap.touch') : ui('pubs.cap.hover');
    /* the video never plays under reduced motion / paused motion, so do not promise playback */
    cap.hidden = kind === 'video' && reduced();
  }

  function attachVideo(p, frame, e) {
    var t = p.teaser;
    var v = h('video', { class: 'pub__video', preload: 'none', 'aria-hidden': 'true', tabindex: '-1' });
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.disablePictureInPicture = true;
    v.src = t.video; // the poster is assigned together with the image src (see whenNear)
    v.addEventListener('playing', function () {
      v.classList.add('is-playing');
      frame.classList.add('is-playing');
    });
    v.addEventListener('pause', function () {
      v.classList.remove('is-playing');
      frame.classList.remove('is-playing');
    });
    v.addEventListener('error', function () {
      if (v.parentNode) v.parentNode.removeChild(v);
      var cap = frame.querySelector('.pub__cap[data-kind="video"]');
      if (cap && cap.parentNode) cap.parentNode.removeChild(cap);
      frame._pubVideo = null;
    });
    frame.appendChild(v);
    var ctl = {
      play: function () {
        if (reduced()) return;
        try {
          var pr = v.play();
          if (pr && pr.catch) pr.catch(function () {});
        } catch (err) {
          /* ignore */
        }
      },
      stop: function () {
        try {
          v.pause();
        } catch (err) {
          /* ignore */
        }
      },
    };
    frame._pubVideo = ctl;
    e.videoCtl = ctl;
    var io = getTouchIO();
    if (io) io.observe(frame);
    return v;
  }

  /* The ', ' separator is plain text inside .pub__au (which may wrap); only the name itself is
     nowrap, so lines can break between authors. The 'me' author is highlighted, never linked. */
  function authorNode(a, comma) {
    if (a.ellipsis) return h('span', { class: 'pub__au pub__au--gap', 'aria-hidden': 'true' }, '…' + (comma ? ', ' : ''));
    var name =
      a.url && !a.me
        ? h('a', { class: 'pub__au-name', href: a.url, target: '_blank', rel: 'noopener noreferrer', 'aria-describedby': NEWTAB_ID }, a.n)
        : h('span', { class: 'pub__au-name' }, a.n);
    return h(
      'span',
      { class: 'pub__au' + (a.me ? ' pub__au--me' : '') },
      name,
      a.eq ? h('sup', { class: 'pub__eq' }, h('span', { 'aria-hidden': 'true' }, '✱'), h('span', { class: 'sr-only' }, ' ' + ui('pubs.eq'))) : null,
      comma ? ', ' : ''
    );
  }

  function buildAuthors(p, cls) {
    var list = (p.authors || []).filter(Boolean);
    var real = list.filter(function (a) { return !a.ellipsis; }).length;
    var wrap = h('p', { class: 'pub__authors' + (cls ? ' ' + cls : '') });
    var keep = list.map(function (a, i) {
      return real <= 8 || i < 5 || !!a.me || i === list.length - 1;
    });
    var hidden = keep.filter(function (k) { return !k; }).length;
    var firstHidden = null;
    list.forEach(function (a, i) {
      var node = authorNode(a, i < list.length - 1);
      if (!keep[i]) {
        node.classList.add('pub__au--x');
        if (!firstHidden) firstHidden = node;
      }
      wrap.appendChild(node);
    });
    if (hidden && firstHidden) {
      var btn = h(
        'button',
        {
          type: 'button',
          class: 'pub__au-more',
          'aria-expanded': 'false',
          'aria-label': S.fmt(ui('pubs.au.more'), { n: hidden }),
        },
        '+' + hidden
      );
      /* expanded: the pill hides and a labeled 'Show fewer authors' link closes the list (after its last name) */
      var less = h('button', { type: 'button', class: 'pub__au-less' }, ui('pubs.au.less'));
      btn.addEventListener('click', function () {
        wrap.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        less.focus();
      });
      less.addEventListener('click', function () {
        wrap.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.focus();
      });
      wrap.insertBefore(btn, firstHidden);
      wrap.appendChild(less);
    }
    if (p.authorsNote) wrap.appendChild(h('span', { class: 'pub__au-note' }, S.fmt(ui('pubs.au.note'), { t: S.t(p.authorsNote) })));
    return wrap;
  }

  function venueBadge(p) {
    var k = venueKey(p);
    return h('span', { class: 'badge' + (KNOWN_BADGE[k] ? ' badge--' + k : ''), lang: 'en' }, p.badge || [p.venue, p.year].filter(Boolean).join(' '));
  }

  function actionList(p) {
    var l = p.links || {},
      out = [];
    if (l.journal) out.push({ k: 'paper', url: l.journal, icon: 'file-text', label: 'pubs.btn.paper', primary: true });
    if (l.arxiv)
      out.push({ k: l.journal ? 'arxiv' : 'paper', url: l.arxiv, icon: 'file-text', label: l.journal ? 'pubs.btn.arxiv' : 'pubs.btn.paper', primary: !l.journal });
    if (l.pdf) out.push({ k: 'pdf', url: l.pdf, icon: 'arrow-down', label: 'pubs.btn.pdf', primary: !l.journal && !l.arxiv });
    if (l.code) out.push({ k: 'code', url: l.code, icon: 'github', label: 'pubs.btn.code', text: S.t(p.codeLabel), stars: p.stars });
    if (l.project) out.push({ k: 'project', url: l.project, icon: 'globe', label: 'pubs.btn.project' });
    if (l.poster) out.push({ k: 'poster', url: l.poster, icon: 'layers', label: 'pubs.btn.poster' });
    if (l.openreview) out.push({ k: 'openreview', url: l.openreview, icon: 'external', label: 'pubs.btn.openreview' });
    if (l.dataset) out.push({ k: 'dataset', url: l.dataset, icon: 'database', label: 'pubs.btn.dataset' });
    return out;
  }

  function buildActions(p, mini) {
    var wrap = h('div', { class: 'pub__actions' + (mini ? ' pub__actions--mini' : '') });
    var acts = actionList(p);
    /* action count (links + BibTeX) lets the CSS lay the row out as a deliberate grid */
    wrap.setAttribute('data-n', String(acts.length + 1));
    acts.forEach(function (a) {
      var cls = 'btn btn--ghost btn--sm pub__btn pub__btn--' + a.k + (a.primary ? ' pub__btn--primary' : '');
      var kids = [ico(a.icon, 15), h('span', { class: 'pub__btn-t' }, a.text || ui(a.label))];
      if (typeof a.stars === 'number' && a.stars > 0) {
        kids.push(
          h(
            'span',
            { class: 'pub__stars' },
            h('span', { class: 'sr-only' }, ' · ' + ui('pubs.stars') + ' '),
            ico('star', 12, 'pub__star-ico'),
            h('span', { class: 'pub__starn' }, String(a.stars))
          )
        );
      }
      /* the same 'Paper / PDF / Code' labels repeat on every card: name the paper for screen readers */
      kids.push(h('span', { class: 'sr-only' }, ' — ' + (p.short || p.title)));
      var link = h('a', linkProps(a.url, cls), kids);
      wrap.appendChild(link);
    });
    var bib = h(
      'button',
      {
        type: 'button',
        class: 'btn btn--ghost btn--sm pub__btn pub__btn--bib',
        'aria-haspopup': 'dialog',
        'aria-expanded': 'false',
      },
      ico('quote', 15),
      h('span', { class: 'pub__btn-t' }, ui('pubs.btn.bibtex')),
      h('span', { class: 'sr-only' }, ' — ' + (p.short || p.title)) // nine "BibTeX" buttons: say which paper
    );
    bib.addEventListener('click', function () {
      openPop(p, bib);
    });
    wrap.appendChild(bib);
    return wrap;
  }

  function buildBody(p, e) {
    var href = primaryHref(p);
    var id = 'paper-' + p.id;
    var meta = h('div', { class: 'pub__meta' }, venueBadge(p));
    if (p.award)
      meta.appendChild(h('span', { class: 'badge badge--award pub__badge-award' }, ico('award', 12), p.award));
    if (p.isNew) meta.appendChild(h('span', { class: 'badge badge--new pub__badge-new' }, ui('pubs.new')));

    /* paper titles are English in every language: lang='en' keeps screen readers on the English voice in zh */
    var titleA = href ? h('a', Object.assign(linkProps(href, 'pub__title-a'), { lang: 'en' })) : h('span', { class: 'pub__title-a', lang: 'en' });
    e.titleA = titleA;
    var title = h('h4', { class: 'pub__title', id: id + '-t' }, titleA);

    var body = h('div', { class: 'pub__body' }, meta, title, buildAuthors(p));
    if (p.eqNote) body.appendChild(h('p', { class: 'pub__eqnote' }, h('sup', null, '✱'), ' ' + ui('pubs.eq')));
    if (p.venueLong) body.appendChild(h('p', { class: 'pub__venue' }, S.t(p.venueLong)));

    if (p.tldr) {
      unwatchClamp(e.tldrEl);
      var tl = h('p', { class: 'pub__tldr', id: id + '-d' }, S.t(p.tldr));
      var tg = h(
        'button',
        { type: 'button', class: 'pub__toggle', 'aria-expanded': 'false', 'aria-controls': id + '-d' },
        ui('common.more')
      );
      var wrap = h('div', { class: 'pub__tldrwrap' }, tl, tg);
      tg.addEventListener('click', function () {
        var open = wrap.classList.toggle('is-open');
        tg.setAttribute('aria-expanded', open ? 'true' : 'false');
        tg.textContent = open ? ui('common.less') : ui('common.more');
        if (!open) requestAnimationFrame(function () { checkClamp(tl); });
      });
      body.appendChild(wrap);
      e.tldrEl = tl;
      watchClamp(tl);
    }

    if (p.highlights && p.highlights.length) {
      var hl = h('ul', { class: 'pub__hl', role: 'list' });
      p.highlights.forEach(function (x) {
        hl.appendChild(h('li', { class: 'pub__pill' }, S.t(x)));
      });
      body.appendChild(hl);
    }
    if (p.tags && p.tags.length) {
      var tags = h('ul', { class: 'pub__tags', role: 'list' });
      p.tags.forEach(function (tg2) {
        var b = h(
          'button',
          { type: 'button', class: 'tag pub__tag', 'aria-label': S.fmt(ui('pubs.tag.search'), { t: tg2 }) },
          tg2
        );
        b.addEventListener('click', function () {
          setQuery(String(tg2).replace(/-/g, ' '), true);
          showBar();
        });
        tags.appendChild(h('li', null, b));
      });
      body.appendChild(tags);
    }
    body.appendChild(buildActions(p, false));
    return body;
  }

  function buildRow(p, e) {
    var href = primaryHref(p);
    var id = 'paper-' + p.id;
    var titleA = href ? h('a', Object.assign(linkProps(href, 'pub__title-a'), { lang: 'en' })) : h('span', { class: 'pub__title-a', lang: 'en' });
    e.rowTitleA = titleA;
    e.rowYear = h('span', { class: 'pub-row__year mono' }, String(p.year || ''));
    var row = h(
      'article',
      { class: 'pub pub-row', id: id, 'aria-labelledby': id + '-t' },
      e.rowYear,
      h(
        'div',
        { class: 'pub-row__main' },
        h('h4', { class: 'pub-row__title pub__title', id: id + '-t' }, titleA),
        buildAuthors(p, 'pub-row__authors'),
        h('p', { class: 'pub-row__venue' }, venueBadge(p), p.venueLong ? h('span', { class: 'pub__venue' }, S.t(p.venueLong)) : null)
      ),
      buildActions(p, true)
    );
    return row;
  }

  function buildEntry(p) {
    var e = { p: p };
    e.media = buildMedia(p, e);
    e.body = buildBody(p, e);
    e.card = h('article', { class: 'pub panel ticks', id: 'paper-' + p.id, 'aria-labelledby': 'paper-' + p.id + '-t' }, e.media, e.body);
    e.li = h('li', { class: 'pub-item reveal' }, e.card);
    if (!p.selected) {
      e.row = buildRow(p, e);
      e.rowLi = h('li', { class: 'pub-item pub-item--row reveal' }, e.row);
    }
    setCaptions(e);

    /* hover / focus previews */
    function kbFocusInside() {
      var a = document.activeElement;
      if (!a || !e.card.contains(a)) return false;
      try {
        return a.matches(':focus-visible');
      } catch (err) {
        return false;
      }
    }
    function preview(on) {
      if (e.inst && e.inst.boost) e.inst.boost(on);
      if (e.videoCtl) {
        if (on) e.videoCtl.play();
        else e.videoCtl.stop();
      }
    }
    /* listen on the static <li>, not the card: the card lifts on hover (see publications.css), so its own
       box moves away from a pointer resting on the bottom edge */
    e.li.addEventListener('pointerenter', function (ev) {
      if (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen') return;
      preview(true);
    });
    e.li.addEventListener('pointerleave', function () {
      if (!kbFocusInside()) preview(false);
    });
    e.card.addEventListener('focusin', function () {
      if (kbFocusInside()) preview(true);
    });
    e.card.addEventListener('focusout', function (ev) {
      if (ev.relatedTarget && e.card.contains(ev.relatedTarget)) return;
      var hovered = false;
      try {
        hovered = e.li.matches(':hover');
      } catch (err) {
        hovered = false;
      }
      if (!hovered) preview(false);
    });
    return e;
  }

  function rebuildText(e) {
    var p = e.p;
    unwatchClamp(e.tldrEl);
    var nb = buildBody(p, e);
    e.card.replaceChild(nb, e.body);
    e.body = nb;
    if (e.row) {
      var nr = buildRow(p, e);
      e.rowLi.replaceChild(nr, e.row);
      e.row = nr;
    }
    setCaptions(e);
  }

  /* ---------------------------------------------------- title highlighting */
  function setTitle(a, text, tokens) {
    if (!a) return;
    paintTitle(a, text, tokens);
  }
  function paintTitle(a, text, tokens) {
    clear(a);
    if (!tokens.length) {
      a.appendChild(document.createTextNode(text));
      return;
    }
    var low = text.toLowerCase();
    var marks = [];
    tokens.forEach(function (tk) {
      var from = 0,
        i;
      while ((i = low.indexOf(tk, from)) >= 0) {
        marks.push([i, i + tk.length]);
        from = i + tk.length;
      }
    });
    if (!marks.length) {
      a.appendChild(document.createTextNode(text));
      return;
    }
    marks.sort(function (x, y) { return x[0] - y[0]; });
    var merged = [marks[0]];
    for (var m = 1; m < marks.length; m++) {
      var last = merged[merged.length - 1];
      if (marks[m][0] <= last[1]) last[1] = Math.max(last[1], marks[m][1]);
      else merged.push(marks[m]);
    }
    var pos = 0;
    merged.forEach(function (r) {
      if (r[0] > pos) a.appendChild(document.createTextNode(text.slice(pos, r[0])));
      a.appendChild(h('mark', { class: 'pub__mark' }, text.slice(r[0], r[1])));
      pos = r[1];
    });
    if (pos < text.length) a.appendChild(document.createTextNode(text.slice(pos)));
  }
  function updateTitles() {
    var tokens = tokensOf(st.q);
    PAPERS.forEach(function (p) {
      var e = E[p.id];
      if (!e) return;
      setTitle(e.titleA, p.title, tokens);
      setTitle(e.rowTitleA, p.title, tokens);
    });
  }

  /* ==========================================================================
     Toolbar
     ========================================================================== */
  function buildInput() {
    var input = h('input', {
      type: 'search',
      class: 'pubs__input',
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      enterkeyhint: 'search',
      name: 'paper-search',
    });
    input.addEventListener('input', function () {
      st.q = input.value;
      syncSearchUI();
      schedule();
    });
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (input.value) {
          ev.preventDefault();
          setQuery('', true);
        } else input.blur();
      }
    });
    return input;
  }

  function syncSearchUI() {
    if (V.search) V.search.classList.toggle('has-value', !!(V.input && V.input.value));
  }

  function makeChip(kind, id, label) {
    var count = h('span', { class: 'chip__count' }, '0');
    var el = h(
      'button',
      { type: 'button', class: 'chip pubs__chip', 'aria-pressed': 'false', 'data-kind': kind, 'data-id': id },
      h('span', { class: 'chip__label' }, label),
      count
    );
    var c = { el: el, count: count, kind: kind, id: id };
    el.addEventListener('click', function () {
      if (el.classList.contains('is-empty') && el.getAttribute('aria-pressed') !== 'true') return;
      if (kind === 'scope') st.scope = id === 'all' || st.scope === id ? 'all' : id;
      else {
        var i = st.topics.indexOf(id);
        if (i >= 0) st.topics.splice(i, 1);
        else st.topics.push(id);
      }
      apply('filter');
    });
    V.chips.push(c);
    return c;
  }

  var narrowMQ = window.matchMedia ? window.matchMedia('(max-width: 520px)') : null;
  function setPlaceholder() {
    if (!V.input) return;
    V.input.placeholder = ui(narrowMQ && narrowMQ.matches ? 'pubs.search.placeholder.s' : 'pubs.search.placeholder');
  }
  function syncShortcuts() {
    if (V.root) V.root.setAttribute('data-shortcuts', !S.shortcuts || S.shortcuts.enabled() ? 'on' : 'off');
  }
  function buildBar() {
    var bar = V.bar;
    clear(bar);
    V.chips = [];
    if (!V.input) V.input = buildInput();
    setPlaceholder();
    V.input.setAttribute('aria-label', ui('pubs.search.label'));

    var clearBtn = h('button', { type: 'button', class: 'pubs__clear', 'aria-label': ui('pubs.search.clear') }, ico('x', 16));
    clearBtn.addEventListener('click', function () {
      setQuery('', true);
      V.input.focus();
    });
    V.search = h(
      'label',
      { class: 'pubs__search' },
      ico('search', 18, 'pubs__mag'),
      V.input,
      h('kbd', { class: 'kbd pubs__kbd', 'aria-hidden': 'true' }, '/'),
      clearBtn
    );
    syncSearchUI();

    var scopeChips = h('div', { class: 'pubs__chips' });
    SCOPES.forEach(function (s) {
      scopeChips.appendChild(makeChip('scope', s.id, scopeLabel(s)).el);
    });
    var groups = [
      h(
        'div',
        { class: 'pubs__group', role: 'group', 'aria-label': ui('pubs.g.scope.aria') },
        h('span', { class: 'pubs__glabel mono', 'aria-hidden': 'true' }, ui('pubs.g.scope')),
        scopeChips
      ),
    ];
    var usedTopics = TOPICS.filter(function (t) {
      return PAPERS.some(function (p) { return (p.topics || []).indexOf(t.id) >= 0; });
    });
    if (usedTopics.length) {
      var topicChips = h('div', { class: 'pubs__chips' });
      usedTopics.forEach(function (t) {
        topicChips.appendChild(makeChip('topic', t.id, S.t(t.label)).el);
      });
      groups.push(
        h(
          'div',
          { class: 'pubs__group', role: 'group', 'aria-label': ui('pubs.g.topic.aria') },
          h('span', { class: 'pubs__glabel mono', 'aria-hidden': 'true' }, ui('pubs.g.topic')),
          topicChips
        )
      );
    }

    V.status = h('p', { class: 'pubs__status', role: 'status', 'aria-live': 'polite' });
    V.reset = h('button', { type: 'button', class: 'pubs__reset' }, ui('pubs.reset'));
    V.reset.addEventListener('click', function () {
      reset();
    });

    bar.appendChild(V.search);
    bar.appendChild(h('div', { class: 'pubs__filters' }, groups));
    bar.appendChild(h('div', { class: 'pubs__meta' }, h('div', { class: 'pubs__meta-l' }, V.status, V.reset)));
  }

  function updateChips(tokens) {
    V.chips.forEach(function (c) {
      var n = 0;
      PAPERS.forEach(function (p) {
        if (!inQuery(p, tokens)) return;
        if (c.kind === 'scope') {
          if (inTopics(p, st.topics) && inScope(p, c.id)) n++;
        } else if (inScope(p, st.scope) && (p.topics || []).indexOf(c.id) >= 0) n++;
      });
      var active = c.kind === 'scope' ? st.scope === c.id : st.topics.indexOf(c.id) >= 0;
      c.el.setAttribute('aria-pressed', active ? 'true' : 'false');
      c.count.textContent = String(n);
      var empty = n === 0 && !active;
      c.el.classList.toggle('is-empty', empty);
      if (empty) c.el.setAttribute('aria-disabled', 'true');
      else c.el.removeAttribute('aria-disabled');
    });
  }

  function updateStatus(n) {
    if (!V.status) return;
    clear(V.status);
    V.status.appendChild(tpl(ui('pubs.status'), { n: h('b', null, n), total: PAPERS.length }));
    if (V.reset) V.reset.hidden = !isFiltered();
  }

  function emptyMsg() {
    var q = st.q.trim();
    return q ? S.fmt(ui('pubs.empty.q'), { q: q }) : ui('pubs.empty.f');
  }
  function buildEmpty() {
    var msg = emptyMsg();
    var btn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm' }, ui('pubs.empty.clear'));
    btn.addEventListener('click', function () {
      reset();
    });
    return h(
      'div',
      { class: 'pubs__empty', role: 'status' },
      h('span', { class: 'pubs__empty-glyph mono', 'aria-hidden': 'true' }, '∅'),
      h('p', { class: 'pubs__empty-t' }, msg),
      btn
    );
  }

  /* ==========================================================================
     Layout
     ========================================================================== */
  var rafId = 0;
  function schedule() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () {
      rafId = 0;
      layout('filter');
    });
  }
  function apply(mode) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    layout(mode || 'filter');
  }

  /* Phones: a card's action row is a justified flex row. If its last row would be ONE lone stretched button
     (long labels, narrow screen), publications.css turns that row into an even two-column grid instead
     (.is-grid; only defined at <=560px, so on wider screens the class is inert). */
  function tidyActions() {
    if (!V.root) return;
    S.qsa('.pub__actions:not(.pub__actions--mini)', V.root).forEach(function (a) {
      a.classList.remove('is-grid');
      var kids = a.children;
      if (kids.length < 3 || !a.offsetWidth) return;
      var last = kids[kids.length - 1].offsetTop;
      var prev = kids[kids.length - 2].offsetTop;
      if (last > prev + 2) a.classList.add('is-grid');
    });
  }
  var tidySoon = S.debounce(tidyActions, 120);

  function heading(text, n, extraCls) {
    return h(
      'h3',
      { class: 'pubs__h reveal' + (extraCls ? ' ' + extraCls : '') },
      h('span', { class: 'pubs__h-t' }, text),
      n != null ? h('span', { class: 'pubs__h-n mono' }, S.fmt(ui(n === 1 ? 'pubs.group.count.one' : 'pubs.group.count'), { n: n })) : null
    );
  }
  function list(cls) {
    return h('ul', { class: cls, role: 'list' });
  }
  function place(ul, e, i, opts) {
    opts = opts || {};
    var li = opts.row ? e.rowLi : e.li;
    li.style.setProperty('--i', String(Math.min(i, 4)));
    if (!opts.row) {
      e.card.classList.toggle('pub--feature', !!opts.hero);
      e.card.classList.toggle('pub--wide', !!opts.wide);
      li.classList.toggle('pub-item--hero', !!opts.hero);
      li.classList.toggle('pub-item--wide', !!opts.wide);
    }
    ul.appendChild(li);
  }

  function layout(mode) {
    if (!V.stage) return;
    var tokens = tokensOf(st.q);
    var filtered = isFiltered();
    var vis = PAPERS.filter(function (p) {
      return matchesAll(p, tokens);
    });
    updateChips(tokens);
    updateStatus(vis.length);
    updateTitles();

    var sig = (filtered ? 'F:' : 'D:') + vis.map(function (p) { return p.id; }).join(',');
    if (!vis.length && V.stage) {
      /* still empty, but the query changed: keep the message (and the live region) current */
      var et = V.stage.querySelector('.pubs__empty-t');
      if (et) {
        var m = emptyMsg();
        if (et.textContent !== m) et.textContent = m;
      }
    }
    if (mode === 'filter' && sig === V.sig) return;
    V.sig = sig;

    if (pop && pop.open && pop.trigger && !pop.trigger.isConnected) closePop(false);
    clear(V.stage);
    V.stage.className = 'pubs__stage ' + (filtered ? 'is-flat' : 'is-default');

    if (!vis.length) {
      V.stage.appendChild(buildEmpty());
    } else if (filtered) {
      V.stage.appendChild(h('h3', { class: 'sr-only' }, ui('pubs.aria')));
      var ul = list('pub-grid pub-grid--flat');
      vis.forEach(function (p, i) {
        place(ul, E[p.id], i, { wide: i === vis.length - 1 && vis.length % 2 === 1 });
      });
      V.stage.appendChild(ul);
    } else {
      var hero = HERO && E[HERO.id] ? HERO : null;
      var rest = PAPERS.filter(function (p) { return p.selected && p !== hero; });
      var others = PAPERS.filter(function (p) { return !p.selected && p !== hero; });
      if (hero) {
        V.stage.appendChild(h('h3', { class: 'sr-only' }, ui('pubs.h.latest')));
        var hl = list('pub-grid pub-grid--hero');
        place(hl, E[hero.id], 0, { hero: true });
        V.stage.appendChild(hl);
      }
      if (rest.length) {
        V.stage.appendChild(heading(hero ? ui('pubs.h.more') : ui('pubs.h.selected'), rest.length));
        var gl = list('pub-grid');
        rest.forEach(function (p, i) {
          place(gl, E[p.id], i % 2, { wide: i === rest.length - 1 && rest.length % 2 === 1 });
        });
        V.stage.appendChild(gl);
      }
      if (others.length) {
        V.stage.appendChild(heading(ui('pubs.h.other'), others.length));
        var rl = list('pub-list');
        var prev = null;
        others.forEach(function (p, i) {
          var e = E[p.id];
          e.rowYear.classList.toggle('is-dup', prev === p.year);
          prev = p.year;
          place(rl, e, i, { row: true });
        });
        V.stage.appendChild(rl);
      }
    }

    var items = S.qsa('.pub-item, .pubs__h', V.stage);
    if (mode !== 'init') {
      items.forEach(function (li) {
        li.classList.add('is-in');
      });
    } else if (!(S.fx && S.fx.refresh)) {
      items.forEach(function (li) {
        li.classList.add('is-in');
      });
    }
    if (mode === 'filter') {
      var pops = S.qsa('.pub-item', V.stage);
      pops.forEach(function (li, i) {
        li.classList.remove('pub-item--pop');
        li.style.setProperty('--k', String(Math.min(i, 8)));
      });
      requestAnimationFrame(function () {
        pops.forEach(function (li) {
          li.classList.add('pub-item--pop');
        });
      });
    }
    if (S.fx && S.fx.refresh) S.fx.refresh(V.stage);
    tidyActions();
  }

  /* ---------------------------------------------------------- state changes */
  function setQuery(q, run) {
    st.q = q;
    if (V.input) V.input.value = q;
    syncSearchUI();
    if (run) apply('filter');
  }
  // an element that has not faded in yet still carries its 12px reveal offset, which would shift a scroll landing:
  // show it (without the fade) before jumping to it, so the landing is the same 90px whether or not it was revealed
  function showNow(el) {
    if (!el || el.classList.contains('is-in')) return;
    el.style.transition = 'none';
    el.classList.add('is-in');
    void el.offsetWidth;
    el.style.transition = '';
  }
  // a filter started from inside a card (hashtag) shrinks the list below the reader: bring the search bar (query, count, Reset)
  // and the first results back under the nav instead of leaving them above the viewport
  function showBar() {
    if (!V.bar) return;
    requestAnimationFrame(function () {
      var r = V.bar.getBoundingClientRect();
      if (r.top < 76 || r.top > window.innerHeight * 0.45) {
        showNow(V.bar);
        V.bar.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
      }
    });
  }
  function reset() {
    st.q = '';
    st.scope = 'all';
    st.topics = [];
    if (V.input) V.input.value = '';
    syncSearchUI();
    apply('filter');
  }
  function validScope(id) {
    return SCOPES.some(function (s) { return s.id === id; });
  }
  function filter(s) {
    s = s || {};
    if ('q' in s) st.q = String(s.q == null ? '' : s.q);
    if ('scope' in s) st.scope = validScope(s.scope) ? s.scope : 'all';
    var tp = 'topics' in s ? s.topics : 'topic' in s ? [s.topic] : null;
    if (tp) {
      st.topics = (Array.isArray(tp) ? tp : [tp]).filter(function (id) {
        return TOPICS.some(function (t) { return t.id === id; });
      });
    }
    if (V.input) V.input.value = st.q;
    syncSearchUI();
    apply('filter');
  }

  /* ==========================================================================
     Deep-link: focus a paper
     ========================================================================== */
  var flashTimer = 0;
  /* move keyboard / screen-reader focus to the card (roving tabindex, removed on blur) */
  function focusCard(node) {
    if (!node.hasAttribute('tabindex')) {
      node.setAttribute('tabindex', '-1');
      node.addEventListener('blur', function onBlur() {
        node.removeEventListener('blur', onBlur);
        node.removeAttribute('tabindex');
      });
    }
    try {
      node.focus({ preventScroll: true });
    } catch (err) {
      node.focus();
    }
  }
  function focus(id, opts) {
    opts = opts || {};
    var e = E[id];
    if (!e || !V.stage) return false;
    if (isFiltered()) {
      st.q = '';
      st.scope = 'all';
      st.topics = [];
      if (V.input) V.input.value = '';
      syncSearchUI();
      apply('filter');
    }
    var go = function () {
      if (S.nav && typeof S.nav.hold === 'function') S.nav.hold(1800); // keep the nav bar shown during the jump (nav.js)
      var node = document.getElementById('paper-' + id);
      if (!node) return;
      var li = node.closest ? node.closest('.pub-item') : null;
      showNow(li);
      node.scrollIntoView({ behavior: reduced() ? 'auto' : opts.instant ? 'instant' : 'smooth', block: 'start' });
      focusCard(node);
      clearTimeout(flashTimer);
      S.qsa('.pub.is-flash').forEach(function (n) {
        n.classList.remove('is-flash');
      });
      void node.offsetWidth;
      node.classList.add('is-flash');
      flashTimer = setTimeout(function () {
        node.classList.remove('is-flash');
      }, 2800);
      if (!opts.fromHash) {
        try {
          history.replaceState(null, '', '#paper-' + id);
        } catch (err) {
          /* ignore */
        }
      }
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(go);
    });
    return true;
  }
  function idFromHash() {
    var m = /^#paper-(.+)$/.exec(location.hash || '');
    if (!m) return null;
    try {
      return decodeURIComponent(m[1]);
    } catch (err) {
      return m[1];
    }
  }

  /* ==========================================================================
     BibTeX popover (non-modal dialog)
     ========================================================================== */
  var pop = null;

  /* one block-level line per BibTeX line (so wrapped lines can hang-indent); each line keeps its own
     trailing "\n", so textContent (what Copy puts on the clipboard) is still the plain BibTeX */
  function bibNodes(text) {
    var frag = document.createDocumentFragment();
    text.split('\n').forEach(function (line, i, arr) {
      var m;
      var nl = i < arr.length - 1 ? '\n' : '';
      var row;
      if ((m = /^(@\w+)\{([^,]*),$/.exec(line))) {
        row = h('span', { class: 'bib-l bib-l--head' }, h('span', { class: 'bib-t' }, m[1]), document.createTextNode('{'), h('span', { class: 'bib-k' }, m[2]), document.createTextNode(','));
      } else if ((m = /^(\s*)(\w+)=\{(.*)\}(,?)$/.exec(line))) {
        row = h(
          'span',
          { class: 'bib-l bib-l--f' },
          document.createTextNode(m[1]),
          h('span', { class: 'bib-f' }, m[2]),
          document.createTextNode('={'),
          h('span', { class: 'bib-v' }, m[3]),
          document.createTextNode('}' + m[4])
        );
      } else row = h('span', { class: 'bib-l bib-l--end' }, document.createTextNode(line));
      if (nl) row.appendChild(document.createTextNode(nl));
      frag.appendChild(row);
    });
    return frag;
  }

  function ensurePop() {
    if (pop) return pop;
    var title = h('span', { class: 'pubs-pop__title mono' }, 'BibTeX');
    var key = h('span', { class: 'pubs-pop__key mono' });
    var closeBtn = h('button', { type: 'button', class: 'pubs-pop__x', 'aria-label': ui('pubs.bib.close') }, ico('x', 16));
    var code = h('code', { class: 'pubs-pop__code' });
    var pre = h('pre', { class: 'pubs-pop__pre', tabindex: '0' }, code);
    var copyLabel = h('span', { class: 'pubs-pop__copy-t', 'aria-live': 'polite' }, ui('common.copy'));
    var copyIco = h('span', { class: 'pubs-pop__copy-i', 'aria-hidden': 'true', html: S.icon('copy', { size: 15 }) });
    var copyBtn = h('button', { type: 'button', class: 'btn btn--primary btn--sm pubs-pop__copy' }, copyIco, copyLabel);
    var el = h(
      'div',
      { class: 'pubs-pop', role: 'dialog', 'aria-modal': 'false', tabindex: '-1', hidden: true },
      h('div', { class: 'pubs-pop__head' }, title, key, closeBtn),
      pre,
      h('div', { class: 'pubs-pop__foot' }, copyBtn)
    );
    pop = { el: el, code: code, pre: pre, key: key, closeBtn: closeBtn, copyBtn: copyBtn, copyLabel: copyLabel, copyIco: copyIco, title: title, open: false, trigger: null, paper: null, timer: 0 };

    closeBtn.addEventListener('click', function () {
      closePop(true);
    });
    copyBtn.addEventListener('click', function () {
      var text = pop.code.textContent;
      S.copyText(text).then(function (ok) {
        if (ok) {
          pop.copyLabel.textContent = ui('common.copied');
          pop.copyIco.innerHTML = S.icon('check', { size: 15 });
          pop.copyBtn.classList.add('is-done');
          if (S.toast) S.toast(ui('pubs.bib.copied'), { icon: 'check' });
        } else {
          selectPre();
          pop.copyLabel.textContent = ui('pubs.bib.manual');
        }
        clearTimeout(pop.timer);
        pop.timer = setTimeout(resetCopy, 2000);
      });
    });
    pre.addEventListener('focus', function () {
      selectPre();
    });
    /* Tab leaves the popover → close it and hand focus back to its trigger, so the tab order
       continues from the card instead of jumping to the end of the section */
    el.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Tab' || !pop.open) return;
      var list = [closeBtn, pre, copyBtn];
      var act = document.activeElement;
      var first = list[0],
        last = list[list.length - 1];
      var leaving = ev.shiftKey ? act === first || act === el : act === last;
      if (!leaving) return;
      ev.preventDefault();
      closePop(true);
    });
    el.addEventListener('focusout', function (ev) {
      var to = ev.relatedTarget;
      if (pop.open && to && !el.contains(to) && to !== pop.trigger) closePop(false);
    });
    /* phone sheet only: a scrim behind the sheet; a tap on it closes the sheet (and is swallowed, so it can
       never fall through to the card or link underneath) */
    var scrim = h('div', { class: 'pubs-pop-scrim', 'aria-hidden': 'true', hidden: true });
    /* no focus change on press: the sheet stays put until the click, which then closes it */
    scrim.addEventListener('mousedown', function (ev) {
      ev.preventDefault();
    });
    scrim.addEventListener('click', function () {
      closePop(true);
    });
    pop.scrim = scrim;
    V.root.appendChild(scrim);
    V.root.appendChild(el);
    return pop;
  }
  function resetCopy() {
    if (!pop) return;
    pop.copyLabel.textContent = ui('common.copy');
    pop.copyIco.innerHTML = S.icon('copy', { size: 15 });
    pop.copyBtn.classList.remove('is-done');
  }
  function selectPre() {
    try {
      var sel = window.getSelection();
      var r = document.createRange();
      r.selectNodeContents(pop.code);
      sel.removeAllRanges();
      sel.addRange(r);
    } catch (err) {
      /* ignore */
    }
  }

  function placePop() {
    if (!pop || !pop.open) return;
    var narrow = window.matchMedia && window.matchMedia('(max-width: 640px)').matches;
    pop.el.classList.toggle('is-sheet', !!narrow);
    if (pop.scrim) pop.scrim.hidden = !narrow;
    if (narrow) {
      pop.el.style.left = pop.el.style.top = pop.el.style.width = '';
      return;
    }
    var rr = V.root.getBoundingClientRect();
    var br = pop.trigger.getBoundingClientRect();
    var w = Math.min(580, rr.width);
    pop.el.style.width = w + 'px';
    var left = Math.max(0, Math.min(br.left - rr.left, rr.width - w));
    var ph = pop.el.offsetHeight;
    /* always below the trigger (never over the card's title); scroll it into view if needed */
    var top = br.bottom - rr.top + 8;
    pop.el.style.left = left + 'px';
    pop.el.style.top = Math.max(0, top) + 'px';
    var pb = pop.el.getBoundingClientRect().bottom;
    var over = pb - (window.innerHeight - 16);
    if (over > 0 && !pop.scrolled) {
      pop.scrolled = true;
      var room = pop.el.getBoundingClientRect().top - 84;
      window.scrollBy({ top: Math.max(0, Math.min(over, room)), behavior: reduced() ? 'auto' : 'smooth' });
    }
  }

  function onDocDown(ev) {
    if (!pop || !pop.open) return;
    var t = ev.target;
    if (pop.el.contains(t) || (pop.trigger && pop.trigger.contains(t))) return;
    if (t === pop.scrim) return; // the scrim closes on click (swallowing it)
    closePop(false);
  }
  function paletteOpen() {
    return !!(S.palette && typeof S.palette.isOpen === 'function' && S.palette.isOpen());
  }
  function visible(el) {
    return !!(el && el.isConnected && (el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)));
  }
  function onDocKey(ev) {
    if (paletteOpen()) return; // Esc belongs to the palette while it is open
    if (ev.key === 'Escape' && pop && pop.open) {
      ev.preventDefault();
      ev.stopPropagation();
      closePop(true);
    }
  }
  var onResizePop = S.debounce(function () {
    placePop();
  }, 80);

  function openPop(p, btn) {
    var P = ensurePop();
    if (P.open && P.trigger === btn) {
      closePop(true);
      return;
    }
    closePop(false);
    P.paper = p;
    P.trigger = btn;
    var text = makeBibtex(p);
    clear(P.code);
    P.code.appendChild(bibNodes(text));
    P.key.textContent = bibKey(p);
    P.el.setAttribute('aria-label', S.fmt(ui('pubs.bib.aria'), { t: p.short || p.title }));
    P.closeBtn.setAttribute('aria-label', ui('pubs.bib.close'));
    resetCopy();
    P.el.hidden = false;
    P.open = true;
    P.scrolled = false;
    btn.setAttribute('aria-expanded', 'true');
    placePop();
    try {
      P.el.focus({ preventScroll: true });
    } catch (err) {
      P.el.focus();
    }
    document.addEventListener('pointerdown', onDocDown, true);
    document.addEventListener('keydown', onDocKey, true);
    window.addEventListener('resize', onResizePop);
  }
  function closePop(restoreFocus) {
    if (!pop || !pop.open) return;
    var trig = pop.trigger;
    pop.open = false;
    pop.el.hidden = true;
    if (pop.scrim) pop.scrim.hidden = true;
    clearTimeout(pop.timer);
    if (trig) trig.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDocDown, true);
    document.removeEventListener('keydown', onDocKey, true);
    window.removeEventListener('resize', onResizePop);
    if (restoreFocus && visible(trig)) {
      try {
        trig.focus();
      } catch (err) {
        /* ignore */
      }
    }
    pop.trigger = null;
  }

  /* ==========================================================================
     Init
     ========================================================================== */
  function focusSearchKey(ev) {
    if (ev.key !== '/' || ev.ctrlKey || ev.metaKey || ev.altKey || ev.defaultPrevented) return;
    if (S.shortcuts && !S.shortcuts.enabled()) return; // WCAG 2.1.4: single-key shortcuts can be switched off
    var t = ev.target;
    if (t && ((t.closest && t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')) || t.isContentEditable)) return;
    if (document.documentElement.classList.contains('is-locked')) return;
    if (paletteOpen()) return;
    if (!V.input) return;
    ev.preventDefault();
    var r = V.bar.getBoundingClientRect();
    var navH = 76;
    if (r.top < navH || r.bottom > window.innerHeight - 20) {
      V.bar.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
    }
    try {
      V.input.focus({ preventScroll: true });
    } catch (err) {
      V.input.focus();
    }
    V.input.select();
  }

  function onLang() {
    closePop(false);
    buildIndex();
    buildBar();
    PAPERS.forEach(function (p) {
      if (E[p.id]) rebuildText(E[p.id]);
    });
    PAPERS.forEach(function (p) {
      if (E[p.id]) relabelMedia(E[p.id]);
    });
    V.sig = '';
    layout('lang');
    if (pop) pop.title.textContent = 'BibTeX';
  }

  function init() {
    var root = document.getElementById('research-body');
    if (!root) {
      if (window.console) console.warn('[pubs] #research-body not found');
      return;
    }
    if (!PAPERS.length) {
      if (window.console) console.warn('[pubs] no papers in SITE_DATA');
      return;
    }
    V.root = root;
    root.classList.add('pubs');
    clear(root);

    purgeOldStarCache();
    buildIndex();
    buildScopes();

    V.bar = h('div', { class: 'pubs__bar reveal', role: 'search' });
    V.stage = h('div', { class: 'pubs__stage', 'aria-label': ui('pubs.aria'), role: 'region' });
    V.stage.addEventListener('animationend', function (ev) {
      if (ev.target.classList && ev.target.classList.contains('pub-item--pop')) ev.target.classList.remove('pub-item--pop');
    });
    root.appendChild(h('span', { id: NEWTAB_ID, hidden: true }, ui('pubs.newtab')));
    root.appendChild(V.bar);
    root.appendChild(V.stage);

    buildBar();
    PAPERS.forEach(function (p) {
      try {
        E[p.id] = buildEntry(p);
      } catch (err) {
        if (window.console) console.warn('[pubs] failed to build ' + p.id, err);
      }
    });
    layout('init');

    S.on('langchange', function () {
      V.stage.setAttribute('aria-label', ui('pubs.aria'));
      syncNewTabHint();
      onLang();
    });
    // core.js re-phrases the zh prose (a different line wrap) in a langchange listener of its own, added once the modules
    // are up; a listener added on 'ready' runs after it, so the TL;DR toggles are decided on the final text
    S.on('ready', function () {
      S.on('langchange', settleClamps);
    });
    window.addEventListener('resize', tidySoon);
    if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
      document.fonts.ready.then(function () {
        tidySoon();
        // new font metrics can re-wrap a TL;DR without resizing its line-clamped box, so the observer would not report it
        settleClamps();
      });
    }
    document.addEventListener('keydown', focusSearchKey);
    syncShortcuts();
    S.on('shortcutschange', syncShortcuts);
    S.on('motionchange', function () {
      Object.keys(E).forEach(function (id) {
        setCaptions(E[id]);
      });
    });
    if (narrowMQ) {
      if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', setPlaceholder);
      else if (narrowMQ.addListener) narrowMQ.addListener(setPlaceholder);
    }
    window.addEventListener('hashchange', function () {
      var id = idFromHash();
      if (id && E[id]) focus(id, { fromHash: true });
    });

    /* deep link on load */
    var hid = idFromHash();
    if (hid && E[hid]) {
      var run = function () {
        focus(hid, { fromHash: true, instant: true });
      };
      setTimeout(run, 350);
      window.addEventListener('load', function () {
        if (idFromHash() !== hid) return;
        var n = document.getElementById('paper-' + hid);
        if (n && Math.abs(n.getBoundingClientRect().top - 90) > 120) setTimeout(run, 80);
      });
    }

  }

  S.register('pubs', init);

  S.pubs = {
    focus: function (id) {
      return focus(id);
    },
    filter: filter,
    reset: reset,
    state: function () {
      return { q: st.q, scope: st.scope, topics: st.topics.slice() };
    },
    bibtex: function (id) {
      for (var i = 0; i < PAPERS.length; i++) if (PAPERS[i].id === id) return makeBibtex(PAPERS[i]);
      return '';
    },
  };
})();
