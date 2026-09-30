/* main.js — boot. Loaded last; every module has already called Site.register(). */
(function () {
  'use strict';
  if (!window.Site || !window.SITE_DATA) {
    console.error('[Site] core.js / data.js failed to load');
    return;
  }

  /* Optional visit statistics (GoatCounter). Dormant unless meta.analytics.goatcounter holds a site code: then no request at
     all is made to anyone. It loads after the page is idle, skips local previews (GoatCounter itself also ignores them) and
     respects the browser's Do-Not-Track setting. Cookie-free, no personal data, nothing is shown on the page. */
  function loadStats() {
    try {
      var cfg = (window.SITE_DATA.meta || {}).analytics || {};
      var code = String(cfg.goatcounter || '');
      if (!/^[a-z0-9][a-z0-9-]{1,30}$/i.test(code)) return;
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
      if (location.protocol === 'file:' || /^(localhost$|127\.|0\.0\.0\.0$)/.test(location.hostname)) return;
      var inject = function () {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://gc.zgo.at/count.js';
        s.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
        document.head.appendChild(s);
      };
      var later = function () { setTimeout(inject, 1500); };
      if (document.readyState === 'complete') later();
      else window.addEventListener('load', later);
    } catch (e) {
      /* statistics must never affect the page */
    }
  }

  function go() {
    window.Site.start();
    loadStats();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
