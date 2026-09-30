/* ==========================================================================
   contact.js — CONTACT section (#contact-body) and FOOTER (#site-footer).
   Two modules are registered here: 'contact' and 'footer'.
   The contact DOM is built once (so the clock and copy-state survive language
   switches); translatable labels are refreshed through cached references.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var D = S.data || {};
  var h = S.h;

  S.addStrings({
    'contact.eyebrow': { en: 'Best way to reach me', zh: '联系我最快的方式' },
    'contact.send': { en: 'Send an email', zh: '发送邮件' },
    'contact.copied': { en: 'Email address copied', zh: '邮箱地址已复制' },
    'contact.copyfail': { en: 'Couldn’t copy. Please select the address manually.', zh: '复制失败，请手动选择邮箱地址' },
    'contact.time': { en: 'Singapore local time', zh: '新加坡当地时间' },
    'contact.links': { en: 'Elsewhere on the internet', zh: '其他渠道' },
    'footer.nav': { en: 'Footer navigation', zh: '页脚导航' },
    'footer.updated': { en: 'Last updated {date}', zh: '更新于 {date}' },
    'footer.source': { en: 'View source', zh: '查看源码' },
  });

  var SOURCE_URL = 'https://github.com/dreamguo/dreamguo.github.io';

  /* ==================================================================== */
  /* CONTACT                                                              */
  /* ==================================================================== */
  var c = {}; // cached refs
  var copyTimer = null;

  function isExternal(href) {
    return /^https?:/i.test(href || '');
  }

  function getEmail() {
    if (D.meta && D.meta.email) return D.meta.email;
    var links = D.links || [];
    for (var i = 0; i < links.length; i++) {
      if (links[i].id === 'email' && links[i].handle) return links[i].handle;
    }
    return '';
  }

  /* ------------------------------------------------------------ clock */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function sgNow() {
    var d = new Date();
    var out = { h: 0, m: 0, wd: '' };
    try {
      var parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Singapore',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(d);
      var got = 0;
      parts.forEach(function (p) {
        if (p.type === 'hour') {
          out.h = parseInt(p.value, 10) % 24;
          got++;
        } else if (p.type === 'minute') {
          out.m = parseInt(p.value, 10);
          got++;
        }
      });
      if (got < 2) throw new Error('parts');
      out.wd = new Intl.DateTimeFormat(S.lang === 'zh' ? 'zh-CN' : 'en-US', {
        timeZone: 'Asia/Singapore',
        weekday: 'short',
      }).format(d);
    } catch (e) {
      // Singapore is UTC+8 all year — safe fallback without Intl time zones
      var s = new Date(d.getTime() + 8 * 3600 * 1000);
      out.h = s.getUTCHours();
      out.m = s.getUTCMinutes();
      out.wd = '';
    }
    return out;
  }

  function tick() {
    if (!c.hh) return;
    var t = sgNow();
    var hh = pad2(t.h);
    var mm = pad2(t.m);
    if (c.hh.textContent !== hh) c.hh.textContent = hh;
    if (c.mm.textContent !== mm) c.mm.textContent = mm;
    c.sr.textContent = hh + ':' + mm + (t.wd ? ' ' + t.wd : '');
    c.wd.textContent = t.wd;
    c.wd.hidden = !t.wd;
  }

  // re-render aligned to the next minute boundary (a fixed interval can lag by up to its period)
  var tickTimer = null;
  function scheduleTick() {
    clearTimeout(tickTimer);
    tickTimer = setTimeout(function () {
      tick();
      scheduleTick();
    }, 60000 - (Date.now() % 60000) + 50);
  }

  /* ------------------------------------------------------------ copy */
  function setCopied(on) {
    c.copy.classList.toggle('is-copied', on);
    c.copyLabel.textContent = S.ui(on ? 'common.copied' : 'common.copy');
    c.copyOn = on;
  }

  function onCopy() {
    var email = getEmail();
    if (!email) return;
    S.copyText(email).then(function (ok) {
      if (ok) {
        setCopied(true);
        clearTimeout(copyTimer);
        copyTimer = setTimeout(function () {
          setCopied(false);
        }, 2200);
        if (typeof S.toast === 'function') S.toast(S.ui('contact.copied'), { icon: 'check' });
        else c.status.textContent = S.ui('contact.copied');
      } else if (typeof S.toast === 'function') {
        S.toast(S.ui('contact.copyfail'));
      } else {
        c.status.textContent = S.ui('contact.copyfail');
      }
    });
  }

  /* ---------------------------------------------------------- builders */
  function emailNode(email) {
    var at = email.indexOf('@');
    var local = at > 0 ? email.slice(0, at) : email;
    var domain = at > 0 ? email.slice(at + 1) : '';
    return h(
      'a',
      { class: 'contact__email', href: 'mailto:' + email },
      h('span', { class: 'contact__local' }, local),
      domain ? h('span', { class: 'contact__at' }, '@') : null,
      domain ? h('span', { class: 'contact__domain' }, domain) : null
    );
  }

  function buildDecor() {
    var decor = h(
      'div',
      { class: 'contact__decor', 'aria-hidden': 'true' },
      h('div', { class: 'contact__orb' })
    );
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            decor.classList.toggle('is-live', e.isIntersecting);
          });
        },
        { rootMargin: '120px' }
      ).observe(decor);
    } else {
      decor.classList.add('is-live');
    }
    return decor;
  }

  function buildCta(email) {
    c.eyebrow = h('span', null);
    c.copyLabel = h('span', null);
    c.status = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    c.sendLabel = h('span', null);

    c.copy = h(
      'button',
      { class: 'btn btn--ghost contact__copy', type: 'button', on: { click: onCopy } },
      h(
        'span',
        { class: 'contact__copy-icons', 'aria-hidden': 'true' },
        h('span', { class: 'contact__icon contact__icon--copy', html: S.icon('copy') }),
        h('span', { class: 'contact__icon contact__icon--check', html: S.icon('check') })
      ),
      c.copyLabel
    );

    c.hh = h('span', { class: 'contact__hh' }, '00');
    c.mm = h('span', { class: 'contact__mm' }, '00');
    c.wd = h('span', { class: 'contact__wd' });
    c.sr = h('span', { class: 'sr-only' });
    c.timeLabel = h('span', { class: 'contact__hud-label' });
    var hud = h(
      'div',
      { class: 'contact__hud mono' },
      h('span', { class: 'contact__hud-pin', html: S.icon('map-pin') }),
      h(
        'span',
        { class: 'contact__hud-text' },
        c.timeLabel,
        h(
          'span',
          { class: 'contact__hud-row' },
          c.sr,
          h('span', { class: 'contact__hud-time', 'aria-hidden': 'true' }, c.hh, h('span', { class: 'contact__colon' }, ':'), c.mm),
          h('span', { class: 'contact__hud-zone', 'aria-hidden': 'true' }, 'UTC+8'),
          c.wd
        )
      )
    );

    return h(
      'div',
      { class: 'contact__cta reveal' },
      h('p', { class: 'contact__eyebrow eyebrow' }, h('span', { class: 'dot-live', 'aria-hidden': 'true' }), c.eyebrow),
      email ? emailNode(email) : null,
      h(
        'div',
        { class: 'contact__actions' },
        email
          ? h('a', { class: 'btn btn--primary', href: 'mailto:' + email }, c.sendLabel, h('span', { html: S.icon('arrow-up-right') }))
          : null,
        email ? c.copy : null,
        hud,
        c.status
      )
    );
  }

  function buildLinks() {
    // the big e-mail line + Copy button above already covers e-mail, so it never gets a duplicate card
    var links = (D.links || []).filter(function (l) {
      return l && l.id !== 'email' && !/^mailto:/i.test(l.href || '');
    });
    if (!links.length) return null;
    c.linkRefs = [];
    var items = links.map(function (l, i) {
      var external = isExternal(l.href);
      var attrs = { class: 'contact__link panel', href: l.href || '#', 'data-magnetic': '4', 'data-link': l.id || '' };
      if (external) {
        attrs.target = '_blank';
        attrs.rel = 'noopener noreferrer';
      }
      var label = h('span', { class: 'contact__link-label eyebrow' });
      var handle = h('span', { class: 'contact__link-handle' });
      c.linkRefs.push({ item: l, label: label, handle: handle });
      return h(
        'li',
        { class: 'contact__link-item reveal', style: '--i:' + (i + 1) },
        h(
          'a',
          attrs,
          h('span', { class: 'contact__link-icon', html: S.icon(l.icon || 'link') }),
          h('span', { class: 'contact__link-body' }, label, handle),
          h('span', { class: 'contact__link-arrow', html: S.icon('arrow-up-right') })
        )
      );
    });
    c.linksEl = h('ul', { class: 'contact__links list-reset', role: 'list', 'aria-label': S.ui('contact.links') }, items);
    return c.linksEl;
  }

  function applyLang() {
    c.eyebrow.textContent = S.ui('contact.eyebrow');
    c.sendLabel.textContent = S.ui('contact.send');
    c.timeLabel.textContent = S.ui('contact.time');
    setCopied(!!c.copyOn);
    if (c.linksEl) c.linksEl.setAttribute('aria-label', S.ui('contact.links'));
    (c.linkRefs || []).forEach(function (r) {
      r.label.textContent = S.t(r.item.label);
      r.handle.textContent = S.t(r.item.handle);
      r.handle.setAttribute('title', S.t(r.item.handle));
    });
    tick();
  }

  function initContact() {
    var root = document.getElementById('contact-body');
    if (!root) {
      if (window.console && console.warn) console.warn('[contact] #contact-body not found');
      return;
    }
    var email = getEmail();
    root.appendChild(buildDecor());
    root.appendChild(buildCta(email));
    var links = buildLinks();
    if (links) root.appendChild(links);

    c.copyOn = false;
    applyLang();
    tick();
    scheduleTick();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) {
        tick();
        scheduleTick();
      }
    });

    if (S.fx && typeof S.fx.refresh === 'function') S.fx.refresh(root);

    S.on('langchange', function () {
      applyLang();
    });
  }

  /* ==================================================================== */
  /* FOOTER                                                               */
  /* ==================================================================== */
  function renderFooter(footer) {
    var meta = D.meta || {};
    var nav = D.nav || [];

    var links = nav.map(function (id) {
      return h('li', null, h('a', { class: 'footer__link', href: '#' + id }, S.ui('nav.' + id)));
    });

    var toTop = h(
      'button',
      {
        class: 'btn btn--ghost btn--sm footer__top',
        type: 'button',
        'aria-label': S.ui('aria.home'),
        on: {
          click: function () {
            // reuse the nav's scroll handling (also clears a stale #hash); plain scroll as fallback
            if (S.nav && typeof S.nav.go === 'function') {
              S.nav.go('hero');
              return;
            }
            window.scrollTo({ top: 0, behavior: S.reducedMotion ? 'auto' : 'smooth' });
            if (location.hash && window.history && history.replaceState) {
              history.replaceState(null, '', location.pathname + location.search);
            }
          },
        },
      },
      h('span', { class: 'footer__top-icon', html: S.icon('arrow-down') }),
      h('span', null, S.ui('aria.home'))
    );

    var place = [S.t(meta.location), meta.coords].filter(Boolean).join(' · ');

    var inner = h(
      'div',
      { class: 'container footer__inner' },
      h(
        'div',
        { class: 'footer__top-row' },
        h(
          'div',
          { class: 'footer__brand' },
          h('span', { class: 'footer__name' }, S.personName() || ''),
          place ? h('span', { class: 'footer__place mono' }, place) : null
        ),
        links.length ? h('nav', { class: 'footer__nav', 'aria-label': S.ui('footer.nav') }, h('ul', { class: 'footer__nav-list list-reset', role: 'list' }, links)) : null,
        toTop
      ),
      h('div', { class: 'footer__rule', 'aria-hidden': 'true' }),
      h(
        'div',
        { class: 'footer__legal mono' },
        h('span', { class: 'footer__copy' }, '© ' + (meta.year || new Date().getFullYear()) + ' ' + (S.personName() || '')),
        meta.updated ? h('span', { class: 'footer__updated' }, S.fmt(S.ui('footer.updated'), { date: S.t(meta.updated) })) : null,
        h(
          'a',
          { class: 'footer__source', href: SOURCE_URL, target: '_blank', rel: 'noopener noreferrer' },
          h('span', { html: S.icon('code') }),
          h('span', null, S.ui('footer.source'))
        )
      )
    );

    footer.textContent = '';
    footer.appendChild(inner);
  }

  function initFooter() {
    var footer = document.getElementById('site-footer');
    if (!footer) {
      if (window.console && console.warn) console.warn('[footer] #site-footer not found');
      return;
    }
    renderFooter(footer);
    S.on('langchange', function () {
      renderFooter(footer);
    });
  }

  S.register('contact', initContact);
  S.register('footer', initFooter);
})();
