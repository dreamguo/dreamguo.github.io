/* ==========================================================================
   about.js — ABOUT section (#about-body).
   Left : viewfinder portrait + terminal-style "spec sheet".
   Right: bio paragraphs + the four research-thrust cards (with paper chips).
   The portrait element is built once and re-used across language switches so
   the image never re-downloads or flickers.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var D = S.data || {};
  var h = S.h;

  S.addStrings({
    'about.spec': { en: 'profile.spec', zh: '个人档案' },
    'about.thrusts': { en: 'Research thrusts', zh: '研究方向' },
    'about.now': { en: 'Current', zh: '现在' },
    'about.papers': { en: 'Papers', zh: '相关论文' },
    'about.since': { en: 'Period', zh: '时间' },
    'about.viewpaper': { en: 'view paper', zh: '查看论文' },
  });

  var root = null;
  var portrait = null; // cached { wrap, photo, img, tagLoc, tagCoords }

  /* ------------------------------------------------------------- helpers */
  function goPaper(id) {
    if (S.pubs && typeof S.pubs.focus === 'function') S.pubs.focus(id);
    else location.hash = '#paper-' + id;
  }

  // Plain left-click jumps via Site.pubs.focus; modified / middle clicks keep the native #paper-<id> link behavior.
  function onPaperClick(id) {
    return function (e) {
      if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      goPaper(id);
    };
  }

  function paperById(id) {
    var list = D.papers || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '·';
    return (parts[0].charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '')).toUpperCase();
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  /* ------------------------------------------------------------ portrait */
  function buildPortrait(about) {
    var photo = about.photo || null;
    var meta = D.meta || {};
    var wrap = h('div', { class: 'about__portrait reveal' });
    var box = h('figure', { class: 'about__tilt', 'data-tilt': '' });
    var frame = h('div', { class: 'about__photo ticks' });

    var mono = h('div', { class: 'about__mono', 'aria-hidden': 'true' }, h('span', null, initials(meta.name)));
    frame.appendChild(mono);

    var img = null;
    if (photo && photo.src) {
      img = h('img', {
        class: 'about__img',
        width: 960,
        height: 1200,
        decoding: 'async',
        loading: 'lazy',
        sizes: '(min-width: 960px) 420px, (min-width: 640px) 300px, 92vw',
        alt: S.t(photo.alt),
      });
      if (photo.small) img.setAttribute('srcset', photo.small + ' 480w, ' + photo.src + ' 960w');
      img.addEventListener('load', function () {
        frame.classList.add('is-loaded');
      });
      img.addEventListener('error', function () {
        frame.classList.add('is-fallback');
        img.hidden = true;
      });
      img.setAttribute('src', photo.src);
      if (img.complete && img.naturalWidth > 0) frame.classList.add('is-loaded');
      frame.appendChild(img);
    } else {
      frame.classList.add('is-fallback');
    }

    var tagLoc = h('span', { class: 'about__tag about__tag--tr' });
    var tagCoords = h('span', { class: 'about__tag about__tag--bl' });
    frame.appendChild(h('div', { class: 'about__tone', 'aria-hidden': 'true' }));
    frame.appendChild(h('div', { class: 'about__scan', 'aria-hidden': 'true' }));
    frame.appendChild(h('div', { class: 'about__focus', 'aria-hidden': 'true' }));
    frame.appendChild(
      h('span', { class: 'about__tag about__tag--tl', 'aria-hidden': 'true' }, h('i', { class: 'about__rec' }), 'REC')
    );
    frame.appendChild(tagLoc);
    frame.appendChild(tagCoords);

    box.appendChild(frame);
    wrap.appendChild(box);

    // run the scan-line only while the portrait is on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            wrap.classList.toggle('is-live', e.isIntersecting);
          });
        },
        { rootMargin: '80px' }
      ).observe(wrap);
    } else {
      wrap.classList.add('is-live');
    }

    portrait = { wrap: wrap, photo: frame, img: img, tagLoc: tagLoc, tagCoords: tagCoords };
  }

  function refreshPortrait(about) {
    if (!portrait) return;
    var meta = D.meta || {};
    var photo = about.photo || {};
    if (portrait.img) portrait.img.setAttribute('alt', S.t(photo.alt));
    // the caption describes where the PHOTO was taken (Athens), not where the owner lives
    portrait.tagLoc.textContent = S.t(photo.place);
    portrait.tagLoc.hidden = !photo.place;
    portrait.tagCoords.textContent = photo.coords || '';
    portrait.tagCoords.hidden = !photo.coords;
    portrait.tagLoc.setAttribute('aria-hidden', 'true');
    portrait.tagCoords.setAttribute('aria-hidden', 'true');
  }

  /* --------------------------------------------------------------- specs */
  function specsBlock(about) {
    var specs = about.specs || [];
    if (!specs.length) return null;
    var rows = specs.map(function (r) {
      return h(
        'div',
        { class: 'about__spec' + (r.accent ? ' is-accent' : '') },
        h('dt', null, S.t(r.k)),
        h('dd', null, r.accent ? h('span', { class: 'dot-live', 'aria-hidden': 'true' }) : null, h('span', null, S.t(r.v)))
      );
    });
    return h(
      'div',
      { class: 'about__specs-wrap reveal', style: '--i:1' },
      h(
        'div',
        { class: 'about__specs panel' },
        h(
          'div',
          { class: 'about__specs-head' },
          h('span', { class: 'about__lights', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
          h('span', { class: 'about__specs-title mono' }, h('span', { class: 'about__prompt', 'aria-hidden': 'true' }, '›'), S.ui('about.spec'))
        ),
        h('dl', { class: 'about__specs-list' }, rows)
      )
    );
  }

  /* ----------------------------------------------------------------- bio */
  // Site.rich() does not nest markup, but the bio has links inside **bold** — handle that here:
  // split on **…**, render each side with Site.rich, wrap the inner part in <strong>.
  function richNested(value) {
    var str = S.t(value);
    var re = /\*\*(.+?)\*\*/g;
    var frag = document.createDocumentFragment();
    var last = 0;
    var m;
    while ((m = re.exec(str))) {
      if (m.index > last) frag.appendChild(S.rich(str.slice(last, m.index)));
      frag.appendChild(h('strong', null, S.rich(m[1])));
      last = m.index + m[0].length;
    }
    if (last < str.length) frag.appendChild(S.rich(str.slice(last)));
    keepNamesTogether(frag);
    return frag;
  }

  // short link labels (a person's name, "刘偲教授") must never break across the link boundary
  function keepNamesTogether(root) {
    var links = root.querySelectorAll ? root.querySelectorAll('a') : [];
    for (var i = 0; i < links.length; i++) {
      if ((links[i].textContent || '').length <= 16) links[i].classList.add('about__nw');
    }
  }

  function bioBlock(about) {
    var paras = about.paragraphs || [];
    if (!paras.length) return null;
    return h(
      'div',
      { class: 'about__bio' },
      paras.map(function (p, i) {
        return h('p', { class: 'about__p reveal' + (i === 0 ? ' about__p--lead' : ''), style: '--i:' + i }, richNested(p));
      })
    );
  }

  /* ------------------------------------------------------------- thrusts */
  function thrustCard(t, i) {
    var papers = (t.papers || []).map(paperById).filter(Boolean);
    var cls = 'about__thrust panel' + (t.now ? ' about__thrust--now' : '');

    var head = h(
      'div',
      { class: 'about__thrust-head' },
      h('span', { class: 'about__thrust-icon', html: S.icon(t.icon || 'sparkle') }),
      t.now
        ? h('span', { class: 'about__now mono' }, h('span', { class: 'dot-live', 'aria-hidden': 'true' }), S.ui('about.now'))
        : h('span', { class: 'about__thrust-idx mono', 'aria-hidden': 'true' }, pad2(i + 1))
    );

    var chips = null;
    if (papers.length) {
      chips = h(
        'div',
        { class: 'about__thrust-papers' },
        h('span', { class: 'about__thrust-label mono' }, S.ui('about.papers')),
        papers.map(function (p) {
          var yr = p.year ? '’' + String(p.year).slice(-2) : '';
          return h(
            'a',
            {
              class: 'about__paper',
              href: '#paper-' + p.id,
              'data-paper': p.id,
              on: { click: onPaperClick(p.id) },
            },
            h('span', { class: 'about__paper-name' }, p.short || p.id),
            yr ? h('span', { class: 'about__paper-yr mono' }, yr) : null,
            // accessible name starts with the visible text ("X ’25 — jump to paper")
            h('span', { class: 'sr-only' }, ' — ' + S.ui('about.viewpaper')),
            h('span', { class: 'about__paper-arrow', html: S.icon('arrow-up-right') })
          );
        })
      );
    }

    // the Now card has no paper chips: its bottom row (same slot) shows since when, read from the current journey entry
    var since = null;
    if (!chips && t.now) {
      var cur = D.journey && D.journey[0];
      var period = cur && cur.current ? S.t(cur.period) : '';
      if (period) {
        since = h(
          'div',
          { class: 'about__thrust-since' },
          h('span', { class: 'about__thrust-label about__since-label mono' }, S.ui('about.since')),
          h('span', { class: 'about__since-period mono' }, period),
          h('span', { class: 'caret', 'aria-hidden': 'true' })
        );
      }
    }

    return h(
      'li',
      { class: 'about__thrust-item reveal', style: '--i:' + (i + 1) },
      h('article', { class: cls, 'data-thrust': t.id || '' }, head, h('h4', { class: 'about__thrust-title' }, S.t(t.title)), h('p', { class: 'about__thrust-text' }, S.t(t.text)), chips || since)
    );
  }

  function thrustsBlock(about) {
    var list = about.thrusts || [];
    if (!list.length) return null;
    return h(
      'section',
      { class: 'about__thrusts', 'aria-labelledby': 'about-thrusts-title' },
      h('h3', { class: 'about__thrusts-title eyebrow', id: 'about-thrusts-title' }, S.ui('about.thrusts')),
      h('ul', { class: 'about__thrust-grid list-reset', role: 'list' }, list.map(thrustCard))
    );
  }

  /* -------------------------------------------------------------- render */
  function render(isLangSwitch) {
    var about = D.about || {};
    if (!portrait) buildPortrait(about);
    refreshPortrait(about);

    var aside = h('div', { class: 'about__aside' }, portrait.wrap, specsBlock(about));
    var main = h('div', { class: 'about__main' }, bioBlock(about), thrustsBlock(about));

    root.textContent = '';
    root.appendChild(aside);
    root.appendChild(main);

    if (isLangSwitch) {
      // language switch must never replay entrance animations
      S.qsa('.reveal', root).forEach(function (el) {
        el.classList.add('is-in');
      });
    }
    if (S.fx && typeof S.fx.refresh === 'function') S.fx.refresh(root);
  }

  S.register('about', function () {
    root = document.getElementById('about-body');
    if (!root) {
      if (window.console && console.warn) console.warn('[about] #about-body not found');
      return;
    }
    render(false);
    S.on('langchange', function () {
      render(true);
    });
  });
})();
