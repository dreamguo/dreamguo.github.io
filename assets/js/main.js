/* main.js — boot. Loaded last; every module has already called Site.register(). */
(function () {
  'use strict';
  if (!window.Site || !window.SITE_DATA) {
    console.error('[Site] core.js / data.js failed to load');
    return;
  }
  function go() {
    window.Site.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
})();
