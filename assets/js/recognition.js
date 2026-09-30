/* ==========================================================================
   recognition.js — awards, service, skills and the publication record chart
   (renders into #recognition-body).

   The chart is hand-built SVG (no libs): papers per year computed from
   SITE_DATA.papers, stacked by venue kind, colored through CSS classes that
   read the --venue-* tokens (so theme changes need no redraw). Each bar is
   keyboard-focusable with a descriptive aria-label and a hover/focus tooltip.

   Exposes Site.recognition = { buckets(papers), kindOf(paper) } (pure helpers,
   used for verification).
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;

  var D = S.data || {};
  var h = S.h;
  var SVGNS = 'http://www.w3.org/2000/svg';

  S.addStrings({
    'recog.awards': { en: 'Awards & scholarships', zh: '奖项与奖学金' },
    'recog.awards.n': { en: '{n} honors', zh: '{n} 项荣誉' },
    'recog.pubs': { en: 'Publication record', zh: '论文产出' },
    'recog.pubs.unit': { en: 'papers', zh: '篇论文' },
    'recog.pubs.all': { en: 'View all papers', zh: '查看全部论文' },
    'recog.pubs.hint': { en: 'Hover or focus a bar for details', zh: '悬停或聚焦柱形查看详情' },
    'recog.pubs.hint.tap': { en: 'Tap a bar for details', zh: '轻触柱形查看详情' },
    'recog.pubs.chart': { en: 'Papers per year', zh: '各年度论文数' },
    'recog.pubs.desc': { en: 'Papers per year, {from} to {to}: {n} in total.', zh: '{from} 至 {to} 年各年度论文数，共 {n} 篇。' },
    'recog.legend': { en: 'Venue legend — highlight a venue', zh: '会议 / 期刊图例，点击高亮' },
    'recog.paper.one': { en: '{n} paper', zh: '{n} 篇论文' },
    'recog.paper.many': { en: '{n} papers', zh: '{n} 篇论文' },
    'recog.aria.bar': { en: '{year}: {count} — {detail}', zh: '{year} 年：{count}，{detail}' },
    'recog.kind.neurips': { en: 'NeurIPS', zh: 'NeurIPS' },
    'recog.kind.eccv': { en: 'ECCV', zh: 'ECCV' },
    'recog.kind.cvpr': { en: 'CVPR', zh: 'CVPR' },
    'recog.kind.other': { en: 'Other', zh: '其他' },
    'recog.kind.journal': { en: 'Journal', zh: '期刊' },
    'recog.kind.preprint': { en: 'Preprint', zh: '预印本' },
    'recog.service.n': { en: '{n} venues', zh: '{n} 个会议与期刊' },
    'recog.skills': { en: 'Skills', zh: '技能' },
  });

  /* ------------------------------------------------------------ pure helpers */
  var KIND_ORDER = ['neurips', 'eccv', 'cvpr', 'other', 'journal', 'preprint'];
  var VENUE_KIND = { neurips: 'neurips', eccv: 'eccv', cvpr: 'cvpr' };

  function kindOf(p) {
    var v = String((p && p.venue) || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    if (VENUE_KIND[v]) return VENUE_KIND[v];
    if (p && p.kind === 'journal') return 'journal';
    if (p && p.kind === 'conference') return 'other';
    return 'preprint';
  }

  /* papers -> { list:[{year,total,kinds:{kind:n},papers:[{short,kind,venue}]}], total, kinds:{kind:n} }
     The list is a continuous year range (empty years included). */
  function buckets(papers) {
    var byYear = {};
    var minY = Infinity;
    var maxY = -Infinity;
    var kinds = {};
    var total = 0;
    (papers || []).forEach(function (p) {
      var y = +p.year;
      if (!y) return;
      var b = byYear[y] || (byYear[y] = { year: y, total: 0, kinds: {}, papers: [] });
      var k = kindOf(p);
      b.total++;
      b.kinds[k] = (b.kinds[k] || 0) + 1;
      b.papers.push({ short: p.short || p.title || '', kind: k, venue: p.venue || '' });
      kinds[k] = (kinds[k] || 0) + 1;
      total++;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    var list = [];
    if (isFinite(minY)) {
      for (var y2 = minY; y2 <= maxY; y2++) {
        var bb = byYear[y2] || { year: y2, total: 0, kinds: {}, papers: [] };
        bb.papers.sort(function (a, b) {
          return KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
        });
        list.push(bb);
      }
    }
    return { list: list, total: total, kinds: kinds };
  }

  S.recognition = { buckets: buckets, kindOf: kindOf };

  function kindLabel(k) {
    return S.ui('recog.kind.' + k);
  }
  function countLabel(n) {
    return S.fmt(S.ui(n === 1 ? 'recog.paper.one' : 'recog.paper.many'), { n: n });
  }
  function detailOf(b) {
    return KIND_ORDER.filter(function (k) {
      return b.kinds[k];
    })
      .map(function (k) {
        return kindLabel(k) + ' ×' + b.kinds[k];
      })
      .join(S.lang === 'zh' ? '、' : ', ');
  }
  function niceMax(max) {
    if (max <= 4) return { top: Math.max(max, 1), step: 1 };
    return { top: Math.ceil(max / 2) * 2, step: 2 };
  }

  /* --------------------------------------------------------------- state */
  var root = null;
  var chart = null; // { fig, plot, tip, data, ro, io, lastW, hl, locked, geo }

  /* ------------------------------------------------------------ svg helpers */
  function sv(tag, attrs, kids) {
    var el = document.createElementNS(SVGNS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'text') el.textContent = v;
        else el.setAttribute(k, v);
      });
    }
    (kids || []).forEach(function (c) {
      if (c) el.appendChild(c);
    });
    return el;
  }
  // rect with rounded top corners only
  function topRounded(x, y, w, hh, r) {
    r = Math.max(0, Math.min(r, hh, w / 2));
    if (!r) return 'M' + x + ' ' + y + 'h' + w + 'v' + hh + 'h' + -w + 'Z';
    return (
      'M' + x + ' ' + (y + hh) + 'V' + (y + r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y +
      'H' + (x + w - r) + 'A' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r) + 'V' + (y + hh) + 'Z'
    );
  }

  /* ------------------------------------------------------------ block frame */
  function block(id, icon, title, meta, body) {
    var tid = 'recog-' + id + '-title';
    return h(
      'div',
      { class: 'recog__cell reveal' },
      h(
        'section',
        { class: 'panel recog__block recog__block--' + id, 'aria-labelledby': tid },
        h(
          'header',
          { class: 'recog__head' },
          h('span', { class: 'recog__ico', 'aria-hidden': 'true', html: S.icon(icon, { size: 18 }) }),
          h('h3', { class: 'recog__title', id: tid }, title),
          meta ? h('span', { class: 'recog__meta mono' }, meta) : null
        ),
        body
      )
    );
  }

  /* ------------------------------------------------------------------ awards */
  function buildAwards() {
    var list = Array.isArray(D.awards) ? D.awards : [];
    if (!list.length) return null;
    var ol = h(
      'ol',
      { class: 'recog__plates list-reset', role: 'list' },
      list.map(function (a, i) {
        return h(
          'li',
          { class: 'recog__plate' + (i === 0 ? ' is-latest' : '') },
          h('span', { class: 'recog__year mono' }, String(a.year)),
          h('div', { class: 'recog__plate-body' }, h('p', { class: 'recog__plate-title' }, S.t(a.title)), h('p', { class: 'recog__plate-org' }, S.t(a.org))),
          h('span', { class: 'recog__plate-ico', 'aria-hidden': 'true', html: S.icon('award', { size: 18 }) })
        );
      })
    );
    return block('awards', 'award', S.ui('recog.awards'), S.fmt(S.ui('recog.awards.n'), { n: list.length }), ol);
  }

  /* ----------------------------------------------------------------- service */
  function venueClass(name) {
    var v = String(name).toLowerCase().replace(/[^a-z]/g, '');
    if (v === 'cvpr') return 'badge--cvpr';
    if (v === 'neurips' || v === 'nips') return 'badge--neurips';
    if (v === 'eccv') return 'badge--eccv';
    if (v === 'iccv') return 'badge--iccv';
    if (v === 'iclr') return 'badge--iclr';
    if (v === 'aaai') return 'badge--aaai';
    if (v === 'acmmm') return 'badge--acmmm';
    if (v === 'tvcg' || v === 'tpami' || v === 'ijcv' || v === 'tip') return 'badge--journal'; // journals
    return ''; // anything else: neutral badge
  }
  function buildService() {
    var sv0 = D.service;
    if (!sv0 || !Array.isArray(sv0.items) || !sv0.items.length) return null;
    var body = [
      h(
        'ul',
        { class: 'recog__venues list-reset', role: 'list' },
        sv0.items.map(function (name) {
          return h('li', { class: 'badge recog__venue ' + venueClass(name) }, name);
        })
      ),
      h('p', { class: 'recog__foot' }, S.fmt(S.ui('recog.service.n'), { n: sv0.items.length })),
    ];
    return block('service', 'eye', S.t(sv0.title), null, body);
  }

  /* ------------------------------------------------------------------ skills */
  function buildSkills() {
    var groups = Array.isArray(D.skills) ? D.skills : [];
    if (!groups.length) return null;
    var body = [
      groups.map(function (g) {
        return h(
          'div',
          { class: 'recog__skillgroup' },
          h('h4', { class: 'recog__skill-label' }, S.t(g.group)),
          h(
            'ul',
            { class: 'recog__pills list-reset', role: 'list' },
            (g.items || []).map(function (it) {
              return h('li', { class: 'recog__pill' }, it);
            })
          )
        );
      }),
    ];
    return block('skills', 'code', S.ui('recog.skills'), null, body);
  }

  /* ------------------------------------------------------------------- pubs */
  function buildPubs(animate) {
    var data = buckets(D.papers);
    if (!data.total) return null;
    var first = data.list[0].year;
    var last = data.list[data.list.length - 1].year;

    var plot = h('div', { class: 'recog__plot' });
    var tip = h('div', { class: 'recog__tip', 'aria-hidden': 'true' });
    plot.appendChild(tip);
    var fig = h(
      'figure',
      { class: 'recog__chart' + (animate ? ' is-armed' : '') },
      plot,
      h('figcaption', { class: 'sr-only' }, S.fmt(S.ui('recog.pubs.desc'), { from: first, to: last, n: data.total }))
    );

    var kindsPresent = KIND_ORDER.filter(function (k) {
      return data.kinds[k];
    });
    var legend = h(
      'ul',
      { class: 'recog__legend list-reset', role: 'list', 'aria-label': S.ui('recog.legend') },
      kindsPresent.map(function (k) {
        return h(
          'li',
          null,
          h(
            'button',
            {
              type: 'button',
              class: 'recog__lg',
              'aria-pressed': 'false',
              dataset: { kind: k },
              on: {
                pointerenter: function (e) {
                  if (e.pointerType === 'mouse') setHl(k, false);
                },
                pointerleave: function (e) {
                  if (e.pointerType === 'mouse') setHl(chart && chart.locked, false);
                },
                focus: function () {
                  setHl(k, false);
                },
                blur: function () {
                  setHl(chart && chart.locked, false);
                },
                click: function () {
                  setHl(chart && chart.locked === k ? null : k, true);
                },
              },
            },
            h('i', { class: 'recog__sw recog__sw--' + k, 'aria-hidden': 'true' }),
            h('span', null, kindLabel(k)),
            h('span', { class: 'recog__lg-n' }, '×' + data.kinds[k])
          )
        );
      })
    );

    var head = h(
      'div',
      { class: 'recog__headline' },
      h('span', { class: 'recog__total mono grad-text', 'data-count': animate ? String(data.total) : null }, String(data.total)),
      h('span', { class: 'recog__total-unit' }, S.ui('recog.pubs.unit')),
      h('span', { class: 'recog__span mono' }, first === last ? String(first) : first + ' — ' + last)
    );

    var foot = h(
      'div',
      { class: 'recog__chart-foot' },
      h('p', { class: 'recog__hint' }, S.ui(S.coarse ? 'recog.pubs.hint.tap' : 'recog.pubs.hint')),
      h(
        'a',
        { class: 'btn btn--ghost btn--sm', href: '#research' },
        h('span', null, S.ui('recog.pubs.all')),
        h('span', { 'aria-hidden': 'true', html: S.icon('arrow-right', { size: 14 }) })
      )
    );

    chart = { fig: fig, plot: plot, tip: tip, data: data, ro: null, io: null, lastW: 0, locked: null, hl: null, geo: [], armed: !!animate };
    return block('pubs', 'file-text', S.ui('recog.pubs'), null, [head, fig, legend, foot]);
  }

  /* highlight a venue kind (legend hover / lock) */
  function setHl(k, lock) {
    if (!chart) return;
    if (lock) {
      chart.locked = k || null;
      S.qsa('.recog__lg', chart.fig.parentNode).forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.kind === chart.locked));
      });
    }
    chart.hl = k || null;
    applyHl();
  }
  function applyHl() {
    if (!chart) return;
    var hl = chart.hl;
    S.qsa('.recog__seg', chart.plot).forEach(function (s) {
      s.classList.toggle('is-dim', !!hl && s.getAttribute('data-kind') !== hl);
    });
    S.qsa('.recog__lg', chart.fig.parentNode).forEach(function (b) {
      b.classList.toggle('is-hl', !!hl && b.dataset.kind === hl);
    });
  }

  /* ------------------------------------------------------------ chart draw */
  function drawChart() {
    var c = chart;
    if (!c || !c.plot.isConnected) return;
    var W = Math.round(c.plot.clientWidth) || 480;
    W = Math.max(240, W);
    c.lastW = W;
    var H = 250;
    var m = { t: 28, r: 6, b: 34, l: 28 };
    var list = c.data.list;
    var n = list.length;
    var maxCount = list.reduce(function (a, b) {
      return Math.max(a, b.total);
    }, 0);
    var sc = niceMax(maxCount);
    var pw = W - m.l - m.r;
    var ph = H - m.t - m.b;
    var band = pw / n;
    var bw = Math.max(16, Math.min(46, band * 0.5));
    function y(v) {
      return m.t + ph - (v / sc.top) * ph;
    }

    /* gradient defs (colors come from classes -> tokens) */
    var defs = sv('defs');
    KIND_ORDER.forEach(function (k) {
      if (!c.data.kinds[k]) return;
      defs.appendChild(
        sv('linearGradient', { id: 'recog-g-' + k, x1: '0', y1: '0', x2: '0', y2: '1' }, [
          sv('stop', { offset: '0', 'stop-opacity': '0.95', class: 'recog__stop recog__stop--' + k }),
          sv('stop', { offset: '1', 'stop-opacity': '0.5', class: 'recog__stop recog__stop--' + k }),
        ])
      );
    });

    var svg = sv(
      'svg',
      {
        class: 'recog__svg',
        width: W,
        height: H,
        viewBox: '0 0 ' + W + ' ' + H,
        role: 'group',
        'aria-label': S.ui('recog.pubs.chart'),
        focusable: 'false',
      },
      [defs]
    );

    /* grid + y axis */
    for (var v = 0; v <= sc.top; v += sc.step) {
      svg.appendChild(sv('line', { class: v === 0 ? 'recog__base' : 'recog__grid', x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }));
      svg.appendChild(sv('text', { class: 'recog__ylab', x: m.l - 8, y: y(v), dy: '0.34em', 'text-anchor': 'end', text: String(v) }));
    }

    /* bars */
    var geo = [];
    var bars = [];
    list.forEach(function (b, i) {
      var cx = m.l + band * (i + 0.5);
      var g = sv('g', { class: 'recog__bar' + (b.total ? '' : ' is-zero'), style: '--i:' + i });
      var top = y(0);
      if (b.total) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'img');
        g.setAttribute(
          'aria-label',
          S.fmt(S.ui('recog.aria.bar'), { year: b.year, count: countLabel(b.total), detail: detailOf(b) })
        );
        g.setAttribute('data-idx', String(i));
        g.appendChild(sv('rect', { class: 'recog__hit', x: cx - band / 2 + 2, y: m.t - 10, width: band - 4, height: ph + m.b - 2, rx: 10 }));
        var fill = sv('g', { class: 'recog__bar-fill' });
        var acc = 0;
        var ks = KIND_ORDER.filter(function (k) {
          return b.kinds[k];
        });
        ks.forEach(function (k, j) {
          var cnt = b.kinds[k];
          var y1 = y(acc + cnt);
          var y0 = y(acc);
          acc += cnt;
          var isTop = j === ks.length - 1;
          fill.appendChild(
            sv('path', {
              class: 'recog__seg recog__seg--' + k,
              'data-kind': k,
              fill: 'url(#recog-g-' + k + ')',
              d: topRounded(cx - bw / 2, y1, bw, y0 - y1, isTop ? 4 : 0),
            })
          );
        });
        g.appendChild(fill);
        top = y(b.total);
        g.appendChild(sv('text', { class: 'recog__cnt', x: cx, y: top - 8, 'text-anchor': 'middle', text: String(b.total) }));
        bars.push(g);
      } else {
        g.appendChild(sv('text', { class: 'recog__cnt is-zero', x: cx, y: y(0) - 8, 'text-anchor': 'middle', text: '0' }));
      }
      g.appendChild(sv('text', { class: 'recog__xlab', x: cx, y: H - 11, 'text-anchor': 'middle', text: String(b.year) }));
      geo.push({ cx: cx, top: top, bw: bw });
      svg.appendChild(g);
    });
    c.geo = geo;

    /* interaction */
    bars.forEach(function (g) {
      var idx = +g.getAttribute('data-idx');
      g.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'mouse') showTip(idx);
      });
      g.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'mouse') hideTip();
      });
      g.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse') showTip(idx);
      });
      g.addEventListener('focus', function () {
        showTip(idx);
      });
      g.addEventListener('blur', hideTip);
      g.addEventListener('keydown', function (e) {
        var k = e.key;
        var at = bars.indexOf(g);
        var to = -1;
        if (k === 'ArrowRight') to = Math.min(bars.length - 1, at + 1);
        else if (k === 'ArrowLeft') to = Math.max(0, at - 1);
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = bars.length - 1;
        else if (k === 'Escape') hideTip();
        if (to >= 0) {
          e.preventDefault();
          bars[to].focus();
        }
      });
    });

    var old = c.plot.querySelector('.recog__svg');
    if (old) c.plot.replaceChild(svg, old);
    else c.plot.insertBefore(svg, c.tip);
    hideTip();
    applyHl();
  }

  /* ---------------------------------------------------------------- tooltip */
  function showTip(idx) {
    var c = chart;
    if (!c || !c.geo[idx]) return;
    var b = c.data.list[idx];
    var g = c.geo[idx];
    var tip = c.tip;
    tip.textContent = '';
    tip.appendChild(
      h('div', { class: 'recog__tip-head mono' }, h('strong', null, String(b.year)), h('span', null, countLabel(b.total)))
    );
    b.papers.forEach(function (p) {
      tip.appendChild(
        h(
          'div',
          { class: 'recog__tip-row' },
          h('i', { class: 'recog__sw recog__sw--' + p.kind, 'aria-hidden': 'true' }),
          h('span', { class: 'recog__tip-name' }, p.short),
          h('span', { class: 'recog__tip-venue mono' }, kindLabel(p.kind))
        )
      );
    });
    var W = c.plot.clientWidth;
    var Hh = c.plot.clientHeight;
    var tw = tip.offsetWidth;
    var th = tip.offsetHeight;
    var left;
    var topY = g.top - 12 - th;
    var topPos;
    if (topY >= 0) {
      left = S.clamp(g.cx - tw / 2, 0, Math.max(0, W - tw));
      topPos = topY;
    } else {
      var right = g.cx + g.bw / 2 + 12;
      left = right + tw <= W ? right : g.cx - g.bw / 2 - 12 - tw;
      if (left < 0) left = S.clamp(g.cx - tw / 2, 0, Math.max(0, W - tw));
      topPos = S.clamp(g.top, 0, Math.max(0, Hh - th));
    }
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(topPos) + 'px';
    tip.classList.add('is-on');
  }
  function hideTip() {
    if (chart) chart.tip.classList.remove('is-on');
  }

  /* --------------------------------------------- reveal (bars animate up) */
  function arm(c) {
    if (!c.armed) return;
    var release = function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          c.fig.classList.remove('is-armed');
          c.armed = false;
        });
      });
    };
    if ('IntersectionObserver' in window) {
      c.io = new IntersectionObserver(
        function (list) {
          if (list.some(function (e) { return e.isIntersecting; })) {
            c.io.disconnect();
            release();
          }
        },
        { threshold: 0.35 }
      );
      c.io.observe(c.fig);
    } else {
      release();
    }
  }

  /* ----------------------------------------------------------------- render */
  function cleanup() {
    if (chart) {
      if (chart.ro) chart.ro.disconnect();
      if (chart.io) chart.io.disconnect();
    }
    chart = null;
  }

  function render(mode) {
    if (!root) return;
    var keepLock = chart && chart.locked; // a locked legend filter survives re-renders (e.g. language switch)
    cleanup();
    root.textContent = '';
    var animate = mode === 'init' && !S.reducedMotion;
    var built = { awards: buildAwards(), pubs: buildPubs(animate), service: buildService(), skills: buildSkills() };
    var order = ['awards', 'pubs', 'service', 'skills']; // reading order (mobile stack + stagger)
    order.forEach(function (k, i) {
      var cell = built[k];
      if (!cell) return;
      cell.style.setProperty('--i', String(i));
      cell.style.setProperty('--o', String(i));
      if (mode !== 'init') cell.classList.add('is-in');
    });
    // desktop: two independent columns (no row stretching) — awards + skills | publications + service
    [['awards', 'skills'], ['pubs', 'service']].forEach(function (keys) {
      var col = h('div', { class: 'recog__col' });
      keys.forEach(function (k) {
        if (built[k]) col.appendChild(built[k]);
      });
      if (col.firstChild) root.appendChild(col);
    });
    if (chart) {
      if (keepLock && chart.data.kinds[keepLock]) setHl(keepLock, true);
      drawChart();
      arm(chart);
      if ('ResizeObserver' in window) {
        var c = chart;
        c.ro = new ResizeObserver(function () {
          var w = Math.max(240, Math.round(c.plot.clientWidth));
          if (Math.abs(w - c.lastW) > 1 && c === chart) drawChart();
        });
        c.ro.observe(c.plot);
      }
    }
    if (S.fx && S.fx.refresh) S.fx.refresh(root);
    else S.qsa('.reveal', root).forEach(function (el) { el.classList.add('is-in'); });
  }

  S.register('recognition', function () {
    root = document.getElementById('recognition-body');
    if (!root) {
      console.warn('[recognition] #recognition-body not found');
      return;
    }
    render('init');
    S.on('langchange', function () {
      render('lang');
    });
    S.on('motionchange', function () {
      if (chart && S.reducedMotion && chart.armed) {
        chart.fig.classList.remove('is-armed');
        chart.armed = false;
      }
    });
    // touch: a tap outside the chart dismisses the tooltip
    document.addEventListener(
      'pointerdown',
      function (e) {
        if (e.pointerType !== 'mouse' && chart && !(e.target.closest && e.target.closest('.recog__plot'))) hideTip();
      },
      { passive: true }
    );
    window.addEventListener(
      'keydown',
      function (e) {
        if (e.key === 'Escape') hideTip();
      },
      { passive: true }
    );
  });
})();
