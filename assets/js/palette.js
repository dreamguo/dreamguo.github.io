/* ==========================================================================
   palette.js — terminal-styled command palette  (⌘K / Ctrl+K)

   Site.palette = { open(query?), close(), toggle(), isOpen() }
   Events emitted: 'paletteopen', 'paletteclose'
   Markup hook   : any element with [data-cmdk-open]  (value = optional prefilled query)

   Groups  : Navigate · Papers · Links · Actions  (+ Terminal easter eggs typed as commands:
             help · whoami · ls papers|links|nav|actions · sudo hire mengqi · clear)
   Search  : fuzzy subsequence (DP alignment, word-boundary + consecutive bonuses),
             matches title AND English/Chinese aliases, highlights matched characters.
   Keys    : ↑ ↓ Tab / Shift+Tab move · Home End (empty field or with ⌘/Ctrl) · Enter run
             Shift/⌘/Ctrl+Enter open the paper's primary link in a new tab · Esc close
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;

  var D = S.data || {};
  var doc = document;
  var root = doc.documentElement;
  var h = S.h;
  var raf = window.requestAnimationFrame.bind(window);

  S.addStrings({
    'cmdk.label': { en: 'Command palette', zh: '命令面板' },
    'cmdk.placeholder': { en: 'Type a command or search…', zh: '输入命令或搜索…' },
    // the hero ⌘K pill and the nav button share one accessible name (nav.js uses the same wording for its own button)
    'aria.palette': { en: 'Search (command palette)', zh: '搜索（命令面板）' },
    'cmdk.close': { en: 'Close command palette', zh: '关闭命令面板' },
    'cmdk.results.label': { en: 'Results', zh: '搜索结果' },

    'cmdk.g.navigate': { en: 'Navigate', zh: '导航' },
    'cmdk.g.papers': { en: 'Papers', zh: '论文' },
    'cmdk.g.links': { en: 'Links', zh: '链接' },
    'cmdk.g.actions': { en: 'Actions', zh: '操作' },
    'cmdk.g.terminal': { en: 'Terminal', zh: '终端' },

    'cmdk.hint.move': { en: 'Move', zh: '选择' },
    'cmdk.hint.select': { en: 'Select', zh: '执行' },
    'cmdk.hint.open': { en: 'Open link', zh: '新标签页打开' },
    'cmdk.hint.close': { en: 'Close', zh: '关闭' },
    'cmdk.results': { en: '{n} results', zh: '{n} 个结果' },
    'cmdk.result1': { en: '1 result', zh: '1 个结果' },
    'cmdk.tip': { en: 'type `help`', zh: '输入 `help`' },
    'cmdk.empty': { en: 'command not found: {q}', zh: '未找到命令：{q}' },
    'cmdk.empty.tip': { en: 'Try `help`, `ls papers` or `theme`', zh: '试试 `help`、`ls papers` 或 `theme`' },

    'cmdk.new': { en: 'New', zh: '最新' },
    'cmdk.etal': { en: 'et al.', zh: '等' },
    'cmdk.current': { en: 'current', zh: '当前' },

    'cmdk.a.theme.light': { en: 'Switch to light theme', zh: '切换到浅色主题' },
    'cmdk.a.theme.dark': { en: 'Switch to dark theme', zh: '切换到深色主题' },
    'cmdk.a.lang.zh': { en: 'Switch to 中文', zh: '切换到中文' },
    'cmdk.a.lang.en': { en: 'Switch to English', zh: '切换到 English' },
    'cmdk.a.copy': { en: 'Copy email address', zh: '复制邮箱地址' },
    'cmdk.a.replay': { en: 'Replay hero animation', zh: '重播首屏动画' },
    'cmdk.a.scene': { en: '3D scene: {name}', zh: '3D 场景：{name}' },
    'cmdk.a.shortcuts': { en: 'Keyboard shortcuts', zh: '键盘快捷键' },
    'cmdk.a.shortcuts.sub': { en: 'Single-key shortcuts: / and 1–4', zh: '单键快捷键：/ 与 1–4' },
    'cmdk.a.motion': { en: 'Pause / resume motion', zh: '暂停 / 恢复动效' },
    'cmdk.a.motion.sub': { en: '3D backdrop, typing and animations', zh: '3D 背景、打字效果与动画' },
    'cmdk.motion.paused': { en: 'paused', zh: '已暂停' },
    'cmdk.motion.running': { en: 'running', zh: '运行中' },
    'cmdk.motion.toast.paused': { en: 'Motion paused', zh: '动效已暂停' },
    'cmdk.motion.toast.running': { en: 'Motion resumed', zh: '动效已恢复' },
    'cmdk.on': { en: 'on', zh: '开' },
    'cmdk.off': { en: 'off', zh: '关' },
    'cmdk.shortcuts.toast.on': { en: 'Keyboard shortcuts: on', zh: '键盘快捷键：已开启' },
    'cmdk.shortcuts.toast.off': { en: 'Keyboard shortcuts: off', zh: '键盘快捷键：已关闭' },
    'cmdk.l.email': { en: 'Email', zh: '邮箱' },
    'cmdk.copied': { en: 'Email address copied', zh: '邮箱地址已复制' },
    'cmdk.copyfail': { en: 'Couldn’t copy. Please select the address manually.', zh: '复制失败，请手动选择邮箱地址' },

    'cmdk.t.help': { en: 'list all commands', zh: '列出所有命令' },
    'cmdk.t.whoami.out': {
      en: '{name} — Researcher @ Huawei Norbert Wiener Research Center (Singapore). Ph.D., NUS (2026). Spatial foundation models, embodied AI.',
      zh: '{name}，华为维纳研究所（新加坡）研究员。NUS 博士（2026）。空间基础模型、具身智能。',
    },
    'cmdk.t.whoami': { en: 'a one-line bio', zh: '一句话简介' },
    'cmdk.t.lspapers': { en: 'list every paper', zh: '列出全部论文' },
    'cmdk.t.lslinks': { en: 'list contact links', zh: '列出联系链接' },
    'cmdk.t.lsactions': { en: 'list every action', zh: '列出全部操作' },
    'cmdk.t.sudo': { en: 'give it a try ;)', zh: '试试看 ;)' },
    'cmdk.t.clear': { en: 'reset the prompt', zh: '清空输入' },
    'cmdk.t.help.out': {
      en: 'Available commands — press ↵ to run one, or just start typing to search.',
      zh: '可用命令——按 ↵ 运行，或直接输入进行搜索。',
    },
    'cmdk.t.total': { en: 'total {n}', zh: '共 {n} 项' },
    'cmdk.t.lsbad': {
      en: 'ls: {q}: no such directory (try: papers · links · nav · actions)',
      zh: 'ls：{q}：没有这样的目录（可用：papers · links · nav · actions）',
    },
    'cmdk.t.sudo1': { en: '[sudo] password for recruiter: ••••••••', zh: '[sudo] recruiter 的密码：••••••••' },
    'cmdk.t.sudo2': {
      en: 'Permission granted. Great taste — press ↵ to send an email.',
      zh: '权限已授予。好眼光——按 ↵ 发封邮件吧。',
    },
  });

  var GROUPS = ['navigate', 'papers', 'links', 'actions', 'terminal'];
  var NEG = -1e9;

  var state = { open: false, q: '', items: [], flat: [], active: 0, lastFocus: null, built: false, px: -1, py: -1 };
  var el = {};

  /* ======================================================================
     Fuzzy matching (pure functions)
     ====================================================================== */
  function isAscii(c) {
    return c.charCodeAt(0) < 128;
  }
  function boundary(s, i) {
    if (i === 0) return true;
    var p = s.charAt(i - 1);
    var c = s.charAt(i);
    if (/[\s\-_\/.:·,()\[\]]/.test(p)) return true;
    if (/[a-z]/.test(p) && /[A-Z]/.test(c)) return true;
    if (isAscii(p) !== isAscii(c)) return true;
    return false;
  }

  /* q: lower-case query token, so: original text. -> { score, pos[] } | null */
  function fuzzy(q, so) {
    var n = q.length;
    if (!n) return { score: 0, pos: [] };
    var sl = so.toLowerCase();
    if (sl.length !== so.length) sl = so;
    var m = Math.min(sl.length, 160);
    if (n > m) return null;

    var qi = 0;
    var k;
    for (k = 0; k < m && qi < n; k++) if (sl.charAt(k) === q.charAt(qi)) qi++;
    if (qi < n) return null;

    // short queries must read as a substring or as word starts: a scattered subsequence ("clear" in
    // "Comparative validation ...") is noise. A jump over skipped characters may only land on a word boundary.
    var strict = n <= 5;
    var from = new Int16Array(n * m);
    var prev = new Array(m);
    var cur = new Array(m);
    var i, j;
    for (j = 0; j < n; j++) {
      var qc = q.charAt(j);
      var runVal = NEG;
      var runIdx = -1;
      for (i = 0; i < m; i++) {
        cur[i] = NEG;
        if (j > 0 && i >= 2) {
          var pv = prev[i - 2];
          if (pv > NEG / 2 && pv + (i - 2) > runVal) {
            runVal = pv + (i - 2);
            runIdx = i - 2;
          }
        }
        if (sl.charAt(i) !== qc) continue;
        var base = 10 + (boundary(so, i) ? 8 : 0) + (i === 0 ? 6 : 0);
        if (j === 0) {
          cur[i] = base - Math.min(i, 8) * 0.6;
          from[j * m + i] = -1;
          continue;
        }
        var bv = NEG;
        var bk = -1;
        if (i >= 1 && prev[i - 1] > NEG / 2) {
          bv = prev[i - 1] + 12; // consecutive
          bk = i - 1;
        }
        if (runIdx >= 0 && (!strict || boundary(so, i))) {
          var gv = runVal - (i - 1); // gap penalty: 1 per skipped char
          if (gv > bv) {
            bv = gv;
            bk = runIdx;
          }
        }
        if (bk < 0) continue;
        cur[i] = bv + base;
        from[j * m + i] = bk;
      }
      var t = prev;
      prev = cur;
      cur = t;
    }

    var cands = [];
    for (i = 0; i < m; i++) if (prev[i] > NEG / 2) cands.push(i);
    cands.sort(function (a, b) { return prev[b] - prev[a]; });
    var maxSpan = Math.max(n * 3, n + 8);
    var minScore = n * 10 + (n >= 2 ? 10 : 0) + (n >= 3 ? 8 : 0); // scattered, bonus-less matches are noise
    for (var c = 0; c < cands.length && c < 4; c++) {
      var e = cands[c];
      if (prev[e] < minScore) break;
      var pos = new Array(n);
      pos[n - 1] = e;
      var ii = e;
      for (var jj = n - 1; jj > 0; jj--) {
        ii = from[jj * m + ii];
        pos[jj - 1] = ii;
      }
      if (strict && n >= 4) {
        // 4-5 letters: a substring, or word prefixes of at least two letters each ("neu ren"), never "c" + "lear"
        var runLen = 1;
        var shortRun = false;
        for (var rp = 1; rp <= n; rp++) {
          if (rp < n && pos[rp] === pos[rp - 1] + 1) runLen++;
          else {
            if (runLen < 2) shortRun = true;
            runLen = 1;
          }
        }
        if (shortRun) continue;
      }
      var span = pos[n - 1] - pos[0] + 1;
      if (m > 14 && span > maxSpan) continue;
      if (n === 1 && !boundary(so, pos[0])) continue;
      return { score: prev[e] - m * 0.08, pos: pos };
    }
    return null;
  }

  function matchItem(it, toks, low) {
    var total = 0;
    var hl = [];
    var via = null;
    for (var t = 0; t < toks.length; t++) {
      var tk = toks[t];
      var best = null;
      var mt = fuzzy(tk, it.title);
      if (mt) best = { score: mt.score + 30, pos: mt.pos, key: null };
      for (var k = 0; k < it.keys.length; k++) {
        var mk = fuzzy(tk, it.keys[k]);
        if (mk && (!best || mk.score > best.score)) best = { score: mk.score, pos: null, key: it.keys[k] };
      }
      if (!best) return null;
      total += best.score;
      if (best.pos) hl = hl.concat(best.pos);
      else if (!via) via = best.key;
    }
    if (it._tl === low) total += 200;
    else if (it._tl.indexOf(low) === 0) total += 80;
    else if (it._tl.indexOf(low) > 0) total += 25;
    hl.sort(function (a, b) { return a - b; });
    hl = hl.filter(function (v, i) { return i === 0 || v !== hl[i - 1]; });
    return { score: total, hl: hl, via: via };
  }

  /* ======================================================================
     Items
     ====================================================================== */
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }
  function tIn(v, lang) {
    return v == null ? '' : S.t(v, lang);
  }
  function uiBoth(key) {
    var v = D.ui && D.ui[key];
    return v ? [tIn(v, 'en'), tIn(v, 'zh')] : [];
  }
  function venueClass(p) {
    var v = String(p.venue || '').toLowerCase();
    if (v.indexOf('neurips') >= 0) return 'badge--neurips';
    if (v.indexOf('eccv') >= 0) return 'badge--eccv';
    if (v.indexOf('cvpr') >= 0) return 'badge--cvpr';
    if (p.kind === 'journal') return 'badge--journal';
    return 'badge--preprint';
  }
  function openExternal(href) {
    if (!href) return;
    if (/^mailto:/i.test(href)) {
      window.location.href = href;
      return;
    }
    // window.open(..., 'noopener') always returns null, so its result says nothing about success: never fall back to
    // navigating the site tab. A synthetic anchor click opens a new tab and keeps this one where it is.
    try {
      var a = doc.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
    } catch (e) {
      try { window.open(href, '_blank', 'noopener,noreferrer'); } catch (e2) { /* popup blocked: do nothing */ }
    }
  }
  // run fn once the jump to the top of the page has landed. Waiting for the real arrival (scrollY ~ 0), not just for a quiet
  // moment, matters: the hero pins a manual 3D scene to the section that is on screen when setScene runs, so a call made
  // mid-flight (slow device, long smooth scroll) would be un-pinned as soon as the hero section arrives.
  function afterScroll(fn) {
    var y0 = window.pageYOffset || 0;
    if (y0 < 4) {
      raf(fn);
      return;
    }
    var t;
    var done = false;
    var fin = function () {
      if (done) return;
      done = true;
      window.removeEventListener('scroll', onS);
      clearTimeout(t);
      clearTimeout(cap);
      // two frames: let the section observer report the hero before the scene is pinned
      raf(function () { raf(fn); });
    };
    var onS = function () {
      clearTimeout(t);
      // arrived: settle briefly; still moving: wait for a real pause (frames can be slow on weak GPUs)
      t = setTimeout(fin, (window.pageYOffset || 0) < 4 ? 60 : 700);
    };
    var cap = setTimeout(fin, 8000);
    window.addEventListener('scroll', onS, { passive: true });
    t = setTimeout(fin, 900);
  }
  function goSection(id) {
    if (S.nav && S.nav.go) S.nav.go(id);
    else {
      var t = id === 'hero' ? null : doc.getElementById(id);
      if (t) t.scrollIntoView({ behavior: S.reducedMotion ? 'auto' : 'smooth', block: 'start' });
      else window.scrollTo(0, 0);
    }
  }
  function focusPaper(id) {
    if (S.pubs && S.pubs.focus) S.pubs.focus(id);
    else window.location.hash = '#paper-' + id;
  }
  function copyEmail() {
    var email = D.meta && D.meta.email;
    if (!email) return;
    S.copyText(email).then(function (ok) {
      if (S.toast) S.toast(S.ui(ok ? 'cmdk.copied' : 'cmdk.copyfail'), { icon: ok ? 'check' : 'x' });
    });
  }
  function switchTheme() {
    if (S.nav && S.nav.toggleTheme) S.nav.toggleTheme(window.innerWidth / 2, window.innerHeight * 0.22);
    else S.toggleTheme();
  }

  var NAV_ALIASES = {
    about: ['bio', 'me', 'intro', 'profile', 'who', '简介', '关于我', '个人简介'],
    news: ['updates', 'latest', 'announcements', 'signals', '新闻', '最新', '消息'],
    research: ['papers', 'publications', 'pubs', 'projects', 'work', '论文', '成果', '科研'],
    journey: ['experience', 'education', 'career', 'timeline', 'cv', 'resume', '经历', '教育', '履历', '简历'],
    recognition: ['awards', 'honors', 'service', 'reviewer', 'prizes', '奖项', '荣誉', '审稿', '学术服务'],
    contact: ['email', 'reach', 'hire', 'social', 'get in touch', '联系方式', '邮箱', '联系我'],
  };
  var LS = {
    papers: 'papers', paper: 'papers', pubs: 'papers', publications: 'papers', research: 'papers',
    links: 'links', link: 'links', contact: 'links', social: 'links',
    nav: 'navigate', navigate: 'navigate', sections: 'navigate', section: 'navigate',
    actions: 'actions', action: 'actions', cmds: 'actions', commands: 'actions',
  };

  function buildItems() {
    var items = [];
    function add(it) {
      it.keys = (it.keys || []).filter(Boolean).map(String);
      it._tl = String(it.title).toLowerCase();
      items.push(it);
      return it;
    }

    /* ---- navigate ---- */
    add({
      id: 'nav:top', group: 'navigate', icon: 'chevron-up', title: S.ui('aria.home'), sub: '#top', idx: '00',
      keys: ['top', 'home', 'hero', 'start', 'back to top', 'cd ~', '回到顶部', '顶部', '首页'].concat(uiBoth('aria.home')),
      run: function () { goSection('hero'); },
    });
    (D.nav || []).forEach(function (id, i) {
      var key = 'nav.' + id;
      var kick = D.ui && D.ui['sec.' + id + '.kicker'];
      add({
        id: 'nav:' + id, group: 'navigate', icon: 'arrow-right',
        title: D.ui && D.ui[key] ? S.ui(key) : id,
        sub: kick ? S.t(kick) : '#' + id,
        idx: pad2(i + 1),
        keys: uiBoth(key).concat([id, 'cd ' + id, 'goto ' + id, 'section']).concat(NAV_ALIASES[id] || []),
        run: function () { goSection(id); },
      });
    });

    /* ---- papers ---- */
    var topicLabel = {};
    (D.topics || []).forEach(function (t) { topicLabel[t.id] = uiBothVal(t.label); });
    (D.papers || []).forEach(function (p) {
      var names = (p.authors || []).filter(function (a) { return !a.ellipsis; }).map(function (a) { return a.n; });
      var lk = p.links || {};
      var hasEllipsis = (p.authors || []).some(function (a) { return a.ellipsis; });
      var primary = lk.arxiv || lk.journal || lk.pdf || lk.project || lk.code || lk.openreview || '';
      var keys = [p.short, p.venue, String(p.year), p.badge, 'paper', 'open ' + String(p.short || p.id).toLowerCase()]
        .concat(p.tags || [])
        .concat(names);
      (p.topics || []).forEach(function (tid) { keys = keys.concat(topicLabel[tid] || []); });
      add({
        id: 'paper:' + p.id, group: 'papers', icon: 'file-text', title: p.title,
        sub: names.slice(0, 3).join(', ') + (names.length > 3 ? ' ' + S.ui('cmdk.etal') : hasEllipsis ? ', …' : ''),
        badge: { text: p.badge || p.venue + ' ' + p.year, cls: venueClass(p) },
        isNew: !!p.isNew,
        keys: keys,
        run: function () { focusPaper(p.id); },
        alt: primary ? function () { openExternal(primary); } : null,
      });
    });

    /* ---- links ---- */
    (D.links || []).forEach(function (l) {
      var mail = /^mailto:/i.test(l.href || '');
      add({
        id: 'link:' + l.id, group: 'links', icon: l.icon || 'link',
        title: l.id === 'email' ? S.ui('cmdk.l.email') : S.t(l.label), sub: S.t(l.handle),
        keys: [l.id, tIn(l.label, 'en'), tIn(l.label, 'zh'), tIn(l.handle, 'en'), tIn(l.handle, 'zh'), 'open ' + l.id, 'contact', mail ? 'mail' : 'profile', mail ? '联系' : '', mail ? '邮箱' : ''],
        run: function () { openExternal(l.href); },
      });
    });

    /* ---- actions ---- */
    var toLight = S.theme === 'dark';
    add({
      id: 'act:theme', group: 'actions', icon: toLight ? 'sun' : 'moon',
      title: S.ui(toLight ? 'cmdk.a.theme.light' : 'cmdk.a.theme.dark'),
      keys: ['theme', 'dark', 'light', 'mode', 'appearance', 'dark mode', 'light mode', 'toggle theme', 'night', 'day', 'color scheme', '主题', '深色', '浅色', '夜间', '日间', '外观', '暗色', '亮色'],
      run: switchTheme,
    });
    var toZh = S.lang === 'en';
    add({
      id: 'act:lang', group: 'actions', icon: 'globe',
      title: S.ui(toZh ? 'cmdk.a.lang.zh' : 'cmdk.a.lang.en'),
      keys: ['language', 'lang', 'locale', 'translate', 'english', 'chinese', 'zh', 'en', '中文', '英文', '语言', '切换语言', '简体'],
      run: function () { S.setLang(toZh ? 'zh' : 'en'); },
    });
    var scOn = !S.shortcuts || S.shortcuts.enabled();
    if (S.shortcuts) {
      add({
        id: 'act:shortcuts', group: 'actions', icon: 'terminal',
        title: S.ui('cmdk.a.shortcuts'), sub: S.ui('cmdk.a.shortcuts.sub'),
        state: S.ui(scOn ? 'cmdk.on' : 'cmdk.off'),
        keys: ['shortcuts', 'keyboard shortcuts', 'keyboard', 'keys', 'hotkeys', 'keybindings', 'single key', 'accessibility', 'a11y', '快捷键', '键盘', '按键', '无障碍'],
        run: function () {
          var next = !S.shortcuts.enabled();
          S.shortcuts.set(next);
          if (S.toast) S.toast(S.ui(next ? 'cmdk.shortcuts.toast.on' : 'cmdk.shortcuts.toast.off'), { icon: next ? 'check' : 'x' });
        },
      });
    }
    if (S.motion) {
      var mPaused = S.motion.paused();
      add({
        id: 'act:motion', group: 'actions', icon: mPaused ? 'play' : 'pause',
        title: S.ui('cmdk.a.motion'), sub: S.ui('cmdk.a.motion.sub'),
        state: S.ui(mPaused ? 'cmdk.motion.paused' : 'cmdk.motion.running'),
        keys: ['motion', 'pause', 'resume', 'play', 'stop', 'freeze', 'animation', 'animations', 'reduce motion', 'reduced motion', 'pause motion', 'accessibility', 'a11y', '动效', '动画', '暂停', '恢复', '继续', '减少动效', '无障碍'],
        run: function () {
          var next = !S.motion.paused();
          S.motion.set(next);
          if (S.toast) S.toast(S.ui(next ? 'cmdk.motion.toast.paused' : 'cmdk.motion.toast.running'), { icon: next ? 'pause' : 'play' });
        },
      });
    }
    if (D.meta && D.meta.email) {
      add({
        id: 'act:copy', group: 'actions', icon: 'copy', title: S.ui('cmdk.a.copy'), sub: D.meta.email,
        keys: ['copy email', 'copy mail', 'email', 'mail', 'clipboard', 'copy', 'address', '复制', '邮箱', '邮件', '复制邮箱'],
        run: copyEmail,
      });
    }
    var hero = S.hero;
    if (hero && typeof hero.replay === 'function') {
      add({
        id: 'act:replay', group: 'actions', icon: 'refresh', title: S.ui('cmdk.a.replay'),
        keys: ['replay', 'restart', 'hero', 'animation', 'intro', 'again', '重播', '重放', '动画', '首屏'],
        run: function () {
          goSection('hero');
          afterScroll(function () { if (S.hero && S.hero.replay) S.hero.replay(); });
        },
      });
    }
    if (hero && typeof hero.setScene === 'function' && Array.isArray(D.scenes)) {
      var curScene = typeof hero.current === 'function' ? hero.current() : null;
      D.scenes.forEach(function (sc) {
        var name = S.t(sc.label);
        add({
          id: 'act:scene:' + sc.id, group: 'actions', icon: 'cube',
          title: S.fmt(S.ui('cmdk.a.scene'), { name: name }), sub: sc.hint,
          state: curScene === sc.id ? S.ui('cmdk.current') : null,
          keys: ['scene', '3d', 'background', 'backdrop', 'scene ' + sc.id, sc.id, tIn(sc.label, 'en'), tIn(sc.label, 'zh'), sc.hint, '场景', '背景'],
          run: function () {
            goSection('hero');
            afterScroll(function () { if (S.hero && S.hero.setScene) S.hero.setScene(sc.id, { pin: true }); });
          },
        });
      });
    }
    /* ---- terminal easter eggs (only reachable by typing) ---- */
    [
      ['help', 'cmdk.t.help'],
      ['whoami', 'cmdk.t.whoami'],
      ['ls papers', 'cmdk.t.lspapers'],
      ['ls links', 'cmdk.t.lslinks'],
      ['ls actions', 'cmdk.t.lsactions'],
      ['sudo hire mengqi', 'cmdk.t.sudo'],
      ['clear', 'cmdk.t.clear'],
    ].forEach(function (c) {
      add({
        id: 'term:' + c[0], group: 'terminal', icon: 'terminal', title: c[0], mono: true, sub: S.ui(c[1]),
        cmd: c[0], keys: [c[0]], hidden: true, keep: true,
        run: function () { setQuery(c[0] === 'clear' ? '' : c[0]); },
      });
    });
    return items;
  }
  function uiBothVal(v) {
    return v ? [tIn(v, 'en'), tIn(v, 'zh')] : [];
  }
  function refreshItems() {
    state.items = buildItems();
  }
  function byId(id) {
    for (var i = 0; i < state.items.length; i++) if (state.items[i].id === id) return state.items[i];
    return null;
  }

  /* ======================================================================
     Search / terminal commands
     ====================================================================== */
  function bio() {
    return S.fmt(S.ui('cmdk.t.whoami.out'), { name: S.personName() || (D.meta && D.meta.name) || 'Mengqi Guo' });
  }

  function rowOf(it, extra) {
    var r = { item: it, hl: [], via: null, score: 0, order: 0 };
    if (extra) for (var k in extra) r[k] = extra[k];
    return r;
  }
  function groupRows(rows, byScore) {
    var map = {};
    rows.forEach(function (r) { (map[r.item.group] = map[r.item.group] || []).push(r); });
    var list = GROUPS.filter(function (g) { return map[g] && map[g].length; }).map(function (g, gi) {
      var arr = map[g];
      if (byScore) arr.sort(function (a, b) { return b.score - a.score || a.order - b.order; });
      return { id: g, rows: arr, best: arr.reduce(function (m, r) { return Math.max(m, r.score); }, -1e9), gi: gi };
    });
    if (byScore) list.sort(function (a, b) { return b.best - a.best || a.gi - b.gi; });
    return list;
  }

  function compute(q) {
    var low = q.trim().toLowerCase().replace(/\s+/g, ' ');
    var items = state.items;
    var visible = items.filter(function (i) { return !i.hidden; });
    var m;

    if (!low) return { groups: groupRows(visible.map(function (i) { return rowOf(i); }), false), out: null };

    /* --- terminal commands --- */
    if (low === 'help' || low === '?') {
      return {
        out: [{ cmd: q.trim() }, { text: S.ui('cmdk.t.help.out'), cls: 'hi' }],
        groups: groupRows(
          items.filter(function (i) { return i.group === 'terminal' && i.cmd !== 'help'; }).map(function (i) { return rowOf(i); }),
          false
        ),
      };
    }
    if (low === 'whoami') {
      var sug = [byId('nav:about'), byId('link:email')].filter(Boolean);
      return {
        out: [{ cmd: q.trim() }, { text: bio(), cls: 'hi' }],
        groups: groupRows(sug.map(function (i) { return rowOf(i); }), false),
      };
    }
    if (/^sudo hire (mengqi|me)$/.test(low)) {
      var sud = [byId('link:email'), byId('act:copy')].filter(Boolean);
      return {
        out: [{ cmd: q.trim() }, { text: S.ui('cmdk.t.sudo1') }, { text: S.ui('cmdk.t.sudo2'), cls: 'ok' }],
        groups: groupRows(sud.map(function (i) { return rowOf(i); }), false),
      };
    }
    if ((m = /^ls (\S+)$/.exec(low))) {
      var arg = m[1];
      var key = LS[arg];
      if (!key) {
        var ks = Object.keys(LS);
        for (var i = 0; i < ks.length; i++) {
          if (ks[i].indexOf(arg) === 0) {
            key = LS[ks[i]];
            break;
          }
        }
      }
      if (key) {
        var list = visible.filter(function (it) { return it.group === key; });
        return {
          out: [{ cmd: q.trim() }, { text: S.fmt(S.ui('cmdk.t.total'), { n: list.length }) }],
          groups: groupRows(list.map(function (it) { return rowOf(it); }), false),
        };
      }
      return {
        out: [{ cmd: q.trim() }, { text: S.fmt(S.ui('cmdk.t.lsbad'), { q: arg }), cls: 'err' }],
        groups: groupRows(visible.map(function (it) { return rowOf(it); }), false),
      };
    }

    /* --- fuzzy search --- */
    var toks = low.split(' ');
    var rows = [];
    items.forEach(function (it, order) {
      if (it.hidden) {
        if (low.length >= 2 && it.cmd.indexOf(low) === 0) {
          var range = [];
          for (var k = 0; k < low.length; k++) range.push(k);
          rows.push(rowOf(it, { hl: range, score: 500 - order, order: order }));
        }
        return;
      }
      var mm = matchItem(it, toks, low);
      if (mm) rows.push(rowOf(it, { hl: mm.hl, via: mm.via, score: mm.score, order: order }));
    });
    return { groups: groupRows(rows, true), out: null };
  }

  /* ======================================================================
     Rendering
     ====================================================================== */
  function highlight(text, pos) {
    if (!pos || !pos.length) return doc.createTextNode(text);
    var frag = doc.createDocumentFragment();
    var i = 0;
    var p = 0;
    while (p < pos.length) {
      var start = pos[p];
      var end = start;
      while (p + 1 < pos.length && pos[p + 1] === end + 1) {
        p++;
        end++;
      }
      if (start > i) frag.appendChild(doc.createTextNode(text.slice(i, start)));
      var mk = doc.createElement('mark');
      mk.className = 'cmdk__hl';
      mk.textContent = text.slice(start, end + 1);
      frag.appendChild(mk);
      i = end + 1;
      p++;
    }
    if (i < text.length) frag.appendChild(doc.createTextNode(text.slice(i)));
    return frag;
  }

  function renderRow(r, i) {
    var it = r.item;
    var row = h('div', { class: 'cmdk__item', role: 'option', id: 'cmdk-opt-' + i, 'aria-selected': 'false', dataset: { idx: String(i) } });
    row.style.setProperty('--i', String(Math.min(i, 14)));

    var title = h('span', { class: 'cmdk__title' + (it.mono ? ' cmdk__title--mono' : '') });
    title.appendChild(highlight(it.title, r.hl));
    var main = h('span', { class: 'cmdk__main' }, title);
    if (it.sub) main.appendChild(h('span', { class: 'cmdk__sub' }, it.sub));

    var meta = h('span', { class: 'cmdk__meta' });
    if (r.via) meta.appendChild(h('span', { class: 'cmdk__via' }, r.via));
    if (it.state) meta.appendChild(h('span', { class: 'cmdk__state' }, it.state));
    if (it.isNew) meta.appendChild(h('span', { class: 'badge badge--new' }, S.ui('cmdk.new')));
    if (it.badge) meta.appendChild(h('span', { class: 'badge ' + it.badge.cls }, it.badge.text));
    if (it.idx) meta.appendChild(h('span', { class: 'cmdk__idx', 'aria-hidden': 'true' }, it.idx));
    var enter = h('span', { class: 'cmdk__enter', 'aria-hidden': 'true' });
    if (it.alt) enter.appendChild(h('span', { class: 'kbd' }, '⇧↵'));
    enter.appendChild(h('span', { class: 'kbd' }, '↵'));
    meta.appendChild(enter);

    row.appendChild(h('span', { class: 'cmdk__ico', 'aria-hidden': 'true', html: S.icon(it.icon || 'terminal') }));
    row.appendChild(main);
    row.appendChild(meta);
    return row;
  }

  function renderOut(lines) {
    var box = h('div', { class: 'cmdk__out', role: 'note' });
    lines.forEach(function (ln, i) {
      var d = h('div', { class: 'cmdk__out-line' + (ln.cmd != null ? ' cmdk__out-cmd' : '') + (ln.cls ? ' cmdk__out-line--' + ln.cls : '') });
      d.style.setProperty('--i', String(i));
      if (ln.cmd != null) {
        d.appendChild(h('span', { class: 'cmdk__out-ps', 'aria-hidden': 'true' }, '$'));
        d.appendChild(doc.createTextNode(ln.cmd));
      } else d.appendChild(doc.createTextNode(ln.text));
      box.appendChild(d);
    });
    return box;
  }

  function renderEmpty(q) {
    return h(
      'div',
      { class: 'cmdk__empty' },
      h('div', { class: 'cmdk__empty-cmd' }, S.fmt(S.ui('cmdk.empty'), { q: q.trim() })),
      h('div', null, S.rich(S.ui('cmdk.empty.tip')))
    );
  }

  function setFooterCount(n) {
    var c = el.count;
    c.textContent = '';
    // touch keyboards do not need the "type help" tip: show the result count only
    if (!state.q.trim() && !S.coarse) c.appendChild(S.rich(S.ui('cmdk.tip')));
    else c.textContent = n === 1 ? S.ui('cmdk.result1') : S.fmt(S.ui('cmdk.results'), { n: n });
  }

  function render() {
    var prev = state.flat[state.active];
    var prevId = prev ? prev.id : null;
    var res = compute(state.q);

    var frag = doc.createDocumentFragment();
    var flat = [];
    var idx = 0;
    var lines = [];
    if (res.out) {
      frag.appendChild(renderOut(res.out));
      res.out.forEach(function (l) { lines.push(l.cmd != null ? '$ ' + l.cmd : l.text); });
    }
    res.groups.forEach(function (g) {
      var gid = 'cmdk-g-' + g.id;
      var gEl = h('div', { class: 'cmdk__group', role: 'group', 'aria-labelledby': gid });
      gEl.appendChild(
        h(
          'div',
          { class: 'cmdk__gl', id: gid },
          h('span', { class: 'cmdk__gl-mark', 'aria-hidden': 'true' }, '#'),
          S.ui('cmdk.g.' + g.id),
          h('span', { class: 'cmdk__gl-n', 'aria-hidden': 'true' }, pad2(g.rows.length))
        )
      );
      g.rows.forEach(function (r) {
        gEl.appendChild(renderRow(r, idx));
        flat.push(r.item);
        idx++;
      });
      frag.appendChild(gEl);
    });
    if (!flat.length && !res.out) frag.appendChild(renderEmpty(state.q));

    el.list.textContent = '';
    el.list.appendChild(frag);
    state.flat = flat;

    var next = 0;
    if (prevId) {
      for (var i = 0; i < flat.length; i++) {
        if (flat[i].id === prevId) {
          next = i;
          break;
        }
      }
    }
    setActive(next, { scroll: false });
    setFooterCount(flat.length);

    // strip a trailing full stop before joining, so a line that already ends in '.' / '。' is not double-punctuated
    var stop = function (t) { return String(t).replace(/[\s.。]+$/, ''); };
    var status = lines.map(stop).filter(Boolean).join('. ');
    var count = flat.length === 1 ? S.ui('cmdk.result1') : S.fmt(S.ui('cmdk.results'), { n: flat.length });
    el.status.textContent = (status ? status + '. ' : '') + (flat.length ? count : S.fmt(S.ui('cmdk.empty'), { q: state.q.trim() }));
  }

  function setActive(i, opts) {
    var rows = el.list.querySelectorAll('.cmdk__item');
    if (!rows.length) {
      state.active = 0;
      el.input.removeAttribute('aria-activedescendant');
      return;
    }
    i = Math.max(0, Math.min(rows.length - 1, i));
    var old = rows[state.active];
    if (old && old !== rows[i]) {
      old.classList.remove('is-active');
      old.setAttribute('aria-selected', 'false');
    }
    state.active = i;
    var row = rows[i];
    row.classList.add('is-active');
    row.setAttribute('aria-selected', 'true');
    el.input.setAttribute('aria-activedescendant', row.id);
    if (!opts || opts.scroll !== false) reveal(row);
  }

  function reveal(row) {
    var list = el.list;
    var first = row.previousElementSibling && row.previousElementSibling.classList.contains('cmdk__gl');
    var top = first ? row.parentNode.offsetTop : row.offsetTop - 34;
    var bottom = row.offsetTop + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = Math.max(0, top);
    else if (bottom > list.scrollTop + list.clientHeight - 8) list.scrollTop = bottom - list.clientHeight + 8;
  }

  function move(delta, wrap) {
    var n = state.flat.length;
    if (!n) return;
    var i = state.active + delta;
    if (wrap) i = (i + n) % n;
    setActive(i);
  }

  function setQuery(v) {
    el.input.value = v;
    state.q = v;
    el.field.classList.toggle('is-empty', !v);
    state.active = 0;
    render();
    el.list.scrollTop = 0;
  }

  /* ======================================================================
     Actions
     ====================================================================== */
  function exec(idx, alt) {
    var it = state.flat[idx];
    if (!it) return;
    var fn = alt && it.alt ? it.alt : it.run;
    if (it.keep) {
      fn();
      return;
    }
    close();
    try {
      fn();
    } catch (err) {
      if (window.console) console.warn('[palette] action failed', err);
    }
  }

  function open(q) {
    if (!state.built) return;
    if (state.open) {
      if (typeof q === 'string') setQuery(q);
      return;
    }
    state.open = true;
    state.lastFocus = doc.activeElement;
    // opened from inside the BibTeX popover (it closes behind the palette): return to the button that opened it
    if (state.lastFocus && state.lastFocus.closest && state.lastFocus.closest('.pubs-pop')) {
      state.lastFocus = doc.querySelector('.pub__btn--bib[aria-expanded="true"]') || state.lastFocus;
    }
    refreshItems();
    el.list.classList.add('is-entering');
    setTimeout(function () { el.list.classList.remove('is-entering'); }, 900);
    setQuery(typeof q === 'string' ? q : '');
    el.root.classList.add('is-open');
    el.root.removeAttribute('aria-hidden');
    el.root.removeAttribute('inert');
    if (S.fx) S.fx.lock('cmdk');
    else root.classList.add('is-locked');
    el.input.focus({ preventScroll: true });
    raf(function () {
      if (state.open && doc.activeElement !== el.input) el.input.focus({ preventScroll: true });
    });
    S.emit('paletteopen');
  }

  // can this element take focus right now? (a control inside the mobile menu is inert / hidden once the menu closes)
  function usable(n) {
    if (!n || n === doc.body || !n.focus || !doc.contains(n)) return false;
    if (n.closest && n.closest('[inert]')) return false;
    return !!(n.getClientRects && n.getClientRects().length);
  }
  function fallbackFocus() {
    var list = doc.querySelectorAll('.nav__burger, .nav__tools .nav__cmdk');
    for (var i = 0; i < list.length; i++) if (usable(list[i])) return list[i];
    return null;
  }

  function close(opts) {
    if (!state.open) return;
    state.open = false;
    el.root.classList.remove('is-open');
    el.root.setAttribute('aria-hidden', 'true');
    el.root.setAttribute('inert', '');
    if (S.fx) S.fx.unlock('cmdk');
    else root.classList.remove('is-locked');
    var lf = state.lastFocus;
    state.lastFocus = null;
    if (!opts || opts.restore !== false) {
      if (!usable(lf)) lf = fallbackFocus();
      if (lf) {
        try {
          lf.focus({ preventScroll: true });
        } catch (e) { /* ignore */ }
      }
    }
    S.emit('paletteclose');
  }
  function toggle() {
    if (state.open) close();
    else open();
  }

  /* ======================================================================
     DOM + events
     ====================================================================== */
  function hostName() {
    try {
      return new URL((D.meta && D.meta.url) || location.href).hostname || 'site';
    } catch (e) {
      return 'site';
    }
  }

  function hint(keys, textKey) {
    var s = h('span', { class: 'cmdk__hint' });
    keys.forEach(function (k) { s.appendChild(h('span', { class: 'kbd' }, k)); });
    s.appendChild(h('span', { class: 'cmdk__hint-t', 'data-k': textKey }, S.ui(textKey)));
    return s;
  }

  function build() {
    var host = doc.getElementById('cmdk-root');
    if (!host) {
      host = h('div', { id: 'cmdk-root' });
      doc.body.appendChild(host);
    }
    host.textContent = '';

    el.input = h('input', {
      class: 'cmdk__input', id: 'cmdk-input', type: 'text', role: 'combobox',
      'aria-expanded': 'true', 'aria-haspopup': 'listbox', 'aria-controls': 'cmdk-list', 'aria-autocomplete': 'list',
      autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', enterkeyhint: 'go',
    });
    el.field = h('div', { class: 'cmdk__field is-empty' }, el.input, h('span', { class: 'caret cmdk__caret', 'aria-hidden': 'true' }));

    el.esc = h('button', { type: 'button', class: 'cmdk__esc mono', tabindex: '-1' }, h('span', { class: 'kbd' }, 'esc'));
    el.esc.addEventListener('click', function () { close(); });

    var bar = h(
      'div',
      { class: 'cmdk__bar mono' },
      h('span', { class: 'cmdk__dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('span', { class: 'cmdk__host', 'aria-hidden': 'true' }, h('b', null, 'guest'), '@' + hostName() + ':~'),
      el.esc
    );
    var head = h('div', { class: 'cmdk__head' }, h('span', { class: 'cmdk__prompt', 'aria-hidden': 'true' }, '›'), el.field);

    el.list = h('div', { class: 'cmdk__list', id: 'cmdk-list', role: 'listbox' });
    el.count = h('span', { class: 'cmdk__count' });
    el.foot = h('div', { class: 'cmdk__foot' });
    el.status = h('div', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });

    el.panel = h('div', { class: 'cmdk__panel', role: 'dialog', 'aria-modal': 'true' }, bar, head, el.list, el.foot, el.status);
    el.backdrop = h('div', { class: 'cmdk__backdrop' });
    el.root = h('div', { class: 'cmdk', 'aria-hidden': 'true' }, el.backdrop, el.panel);
    el.root.setAttribute('inert', '');
    host.appendChild(el.root);

    /* events */
    el.backdrop.addEventListener('click', function () { close(); });
    el.input.addEventListener('input', function () {
      el.list.classList.remove('is-entering');
      state.q = el.input.value;
      el.field.classList.toggle('is-empty', !state.q);
      state.active = 0;
      render();
      el.list.scrollTop = 0;
    });
    el.input.addEventListener('keydown', onInputKey);
    el.panel.addEventListener('mousedown', function (e) {
      if (e.target.closest && e.target.closest('input')) return;
      e.preventDefault(); // keep the caret in the field
    });
    el.list.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.clientX === state.px && e.clientY === state.py) return;
      state.px = e.clientX;
      state.py = e.clientY;
      var row = e.target.closest ? e.target.closest('.cmdk__item') : null;
      if (row) {
        var i = parseInt(row.getAttribute('data-idx'), 10);
        if (i !== state.active) setActive(i, { scroll: false });
      }
    });
    el.list.addEventListener('click', function (e) {
      var row = e.target.closest ? e.target.closest('.cmdk__item') : null;
      if (!row) return;
      exec(parseInt(row.getAttribute('data-idx'), 10), e.shiftKey || e.metaKey || e.ctrlKey);
    });

    applyStatic();
    state.built = true;
  }

  function applyStatic() {
    if (!el.root) return;
    el.panel.setAttribute('aria-label', S.ui('cmdk.label'));
    el.input.setAttribute('placeholder', S.ui('cmdk.placeholder'));
    el.input.setAttribute('aria-label', S.ui('cmdk.label'));
    el.list.setAttribute('aria-label', S.ui('cmdk.results.label'));
    el.esc.setAttribute('aria-label', S.ui('cmdk.close'));
    el.foot.textContent = '';
    el.foot.appendChild(hint(['↑', '↓'], 'cmdk.hint.move'));
    el.foot.appendChild(hint(['↵'], 'cmdk.hint.select'));
    el.foot.appendChild(hint(['⇧↵'], 'cmdk.hint.open'));
    el.foot.appendChild(hint(['esc'], 'cmdk.hint.close'));
    el.foot.appendChild(el.count);
    setFooterCount(state.flat.length);
  }

  function onInputKey(e) {
    if (e.isComposing || e.keyCode === 229) return; // IME (pinyin) composition
    var k = e.key;
    if (k === 'ArrowDown') {
      e.preventDefault();
      move(1, true);
    } else if (k === 'ArrowUp') {
      e.preventDefault();
      move(-1, true);
    } else if (k === 'Tab') {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1, true);
    } else if (k === 'PageDown') {
      e.preventDefault();
      move(6, false);
    } else if (k === 'PageUp') {
      e.preventDefault();
      move(-6, false);
    } else if ((k === 'Home' || k === 'End') && (!el.input.value || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setActive(k === 'Home' ? 0 : state.flat.length - 1);
    } else if (k === 'Enter') {
      e.preventDefault();
      exec(state.active, e.shiftKey || e.metaKey || e.ctrlKey);
    }
  }

  function onDocKey(e) {
    if (e.isComposing) return;
    var k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k && k.length === 1 && k.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
      return;
    }
    if (state.open && k === 'Escape') {
      // the palette is the topmost overlay: nothing underneath (BibTeX popover, mobile menu, search field) may also react
      e.preventDefault();
      e.stopImmediatePropagation();
      close();
    }
  }

  function init() {
    build();

    doc.addEventListener('keydown', onDocKey, true);
    doc.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-cmdk-open]') : null;
      if (!t) return;
      e.preventDefault();
      open(t.getAttribute('data-cmdk-open') || '');
    });
    doc.addEventListener('focusin', function (e) {
      if (state.open && !el.panel.contains(e.target)) el.input.focus({ preventScroll: true });
    });

    // static ⌘K chips in the HTML: show "Ctrl K" off Apple platforms
    if (!S.isMac) {
      S.qsa('[data-cmdk-open] .kbd').forEach(function (k) {
        if (k.textContent.trim() === '⌘K') k.textContent = 'Ctrl K';
      });
    }

    S.on('langchange', function () {
      applyStatic();
      refreshItems();
      if (state.open) render();
    });
    S.on('themechange', function () {
      refreshItems();
      if (state.open) render();
    });
    S.on('motionchange', function () {
      refreshItems();
      if (state.open) render();
    });
    S.on('shortcutschange', function () {
      refreshItems();
      if (state.open) render();
    });
  }

  S.palette = {
    open: open,
    close: close,
    toggle: toggle,
    isOpen: function () { return state.open; },
  };

  S.register('palette', init);
})();
