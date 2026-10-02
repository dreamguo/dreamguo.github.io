/* ==========================================================================
   hero-gl.js — the WebGL backdrop (raw WebGL1, zero dependencies).

   A fixed full-viewport canvas (#gl) renders a morphing 3D point cloud that tells
   the story of the research: 3D reconstruction -> Gaussian splatting -> assembly
   -> 4D dynamic scenes. Scenes are generated once in JS (seeded PRNG, so the look is
   deterministic) and morphed in the vertex shader with a per-point staggered ease
   and a swirl. Everything else (drag-to-orbit with inertia, cursor lens, click
   shockwaves, scroll dolly + dimming, section-driven scene changes, keys 1-4,
   simulated "training" intro) lives here too.

   Public:   Site.hero = { scenes, setScene(id, {pin, instant}), replay(), current(), isWebGL, status,
                           onTelemetry(fn) -> off, getState() }
   Emits:    Site.emit('scenechange', id), Site.emit('herostatus', 'gl' | 'none')

   Framing: the camera is fitted to a "stage" rectangle measured from the DOM so scene
   geometry stays out of the hero copy: right of the text column on wide screens, and inside
   a dedicated band between the title block and the lede on stacked layouts. A screen-space
   mask in the vertex shader also fades any point that strays outside that stage.
   Stacked layouts: the band scrolls away with the copy and the cloud fades out with it (it never
   sits behind the lede / CTAs); a dim ambient cloud returns once the hero itself has scrolled off.
   Scene choice: the section mapper picks the scene per [data-section]; a manual choice
   (setScene(id, {pin:true}): HUD chips, keys 1-4, palette) is pinned until the dominant section changes.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) return;
  var D = S.data || {};
  var root = document.documentElement;

  var IDS = ['reconstruct', 'splat', 'bricks', 'spacetime'];
  var SCAN = [1.0, 0.3, 0.45, 0.0]; // lidar-sweep strength per scene
  var FOV = (40 * Math.PI) / 180;
  var TAU = Math.PI * 2;
  var TRAIN_DUR = 4.6; // seconds
  var MORPH_DUR = 2.0; // seconds
  var YAW0 = -0.62;
  var PITCH0 = 0.3;
  var INTERACTIVE = 'a, button, input, textarea, select, label, summary, .panel, [role="dialog"], [role="button"], [contenteditable]';

  /* ------------------------------------------------------------ public shell */
  var telemetryCbs = [];
  var hero = (S.hero = {
    scenes: IDS.slice(),
    isWebGL: false,
    status: 'pending', // 'pending' -> 'gl' | 'none' (emits 'herostatus')
    setScene: function (id, opts) { setScene(id, opts); },
    replay: function () { replay(); },
    current: function () { return IDS[wanted]; },
    onTelemetry: function (fn) {
      if (typeof fn !== 'function') return function () {};
      telemetryCbs.push(fn);
      try { fn(makeState()); } catch (e) { /* ignore */ }
      return function () {
        var i = telemetryCbs.indexOf(fn);
        if (i >= 0) telemetryCbs.splice(i, 1);
      };
    },
    getState: function () {
      return { fps: Math.round(fpsEma), n: N, dpr: dpr, w: W, h: H, scene: IDS[wanted], train: train, drawn: framesDrawn, yaw: yaw, pitch: pitch, shocks: shocks.length, opacity: canvasOpacity, morph: morph, pinned: pinnedSec };
    },
  });

  /* --------------------------------------------------------------- state */
  var canvas, heroEl, gl, prog, loc = {};
  var N = 70000;
  var W = 1, H = 1, dpr = 1, dprCap = 2, aspect = 1;
  var scenes = [null, null, null, null]; // {P,M} typed arrays (lazy)
  var bufs = [null, null, null, null]; // {P,M} GL buffers
  var bufR = null, rArr = null;
  var pal = { c0: [0.33, 0.9, 1], c1: [0.56, 0.48, 1], c2: [1, 0.7, 0.33], bg: [0.02, 0.03, 0.05], light: false };
  var maxPoint = 64;

  var fromIdx = 0, toIdx = 0, wanted = 0, morph = 1, morphing = false;
  var buildT0 = 0; // seconds (uTime clock) when bricks last started building
  var time = 0; // scene clock (frozen under reduced motion)
  var train = 0, trainT = 0, training = false;

  var yaw = YAW0, pitch = PITCH0, vyaw = 0, vpitch = 0, autoW = 1, idleFor = 0;
  var mx = 0, my = 0, mxs = 0, mys = 0, mouseNdc = [0, 0], mouseS = 0, mouseTarget = 0, mouseSeen = false;
  var shocks = []; // {x,y,t}
  var scrollY = 0, scrollP = 0, heroH = 800, heroVisible = true;
  var sx = 0, sy = 0, baseDist = 7.2, narrow = false, sizeK = 1;
  var canvasOpacity = 1, introK = 0;
  var cw = 1, ch = 1; // canvas CSS size
  var stage = null; // framing target measured from the DOM (see measureStage)
  var stageTimer = 0, lostTimer = 0, lastPointerT = 0;
  var brickInfo = { total: 62, levels: 11 };
  var pinnedSec = null; // section id a manual scene choice is pinned to
  var stackK = 1; // stacked layouts: 1 while the stage band is on screen -> 0 as it scrolls away
  var ambK = 0; // stacked layouts: 0 inside the hero -> 1 once the hero has scrolled off (dim ambient cloud)

  var dirty = true, rafId = 0, running = false, lastT = 0, lastDraw = 0, lastTel = 0, framesDrawn = 0;
  var fpsEma = 60, slowT = 0, dprSteps = 0, ctxLost = false, warned = false, relayoutPending = false;

  var view = new Float32Array(16), proj = new Float32Array(16);
  var shockU = new Float32Array(12);

  /* ------------------------------------------------------------- utilities */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function randn(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }
  function hash(n) {
    var s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function norm3(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function cross3(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

  /* ------------------------------------------------------ scene generators */
  function Writer(n) {
    this.n = n;
    this.P = new Float32Array(n * 4);
    this.M = new Float32Array(n * 4);
    this.i = 0;
  }
  // kind: 0 static, 1 brick, 2 ribbon, 3 object, 4 time-slice, 5 rotating (frusta), 6 splat
  Writer.prototype.put = function (x, y, z, kind, c, size, phase, bright) {
    if (this.i >= this.n) return false;
    var o = this.i * 4, P = this.P, M = this.M;
    P[o] = x; P[o + 1] = y; P[o + 2] = z; P[o + 3] = kind;
    M[o] = c; M[o + 1] = size; M[o + 2] = phase; M[o + 3] = bright;
    this.i++;
    return true;
  };
  Writer.prototype.fill = function (rnd) {
    // safety: never leave zero-initialized points at the origin
    while (this.i < this.n) {
      var a = rnd() * TAU, r = 2.6 * Math.sqrt(rnd());
      this.put(Math.cos(a) * r, -1 + rnd() * 2.2, Math.sin(a) * r, 0, rnd() * 0.6, 0.6, rnd(), 0.16);
    }
    return { P: this.P, M: this.M };
  };

  function groundGrid(w, rnd, n, y, half, step, size, bright) {
    var lines = Math.round((2 * half) / step) + 1, k = 0, guard = 0;
    while (k < n && guard++ < n * 6) {
      var li = Math.floor(rnd() * lines), t = (rnd() * 2 - 1) * half, a = -half + li * step, x, z;
      if (rnd() < 0.5) { x = a; z = t; } else { x = t; z = a; }
      var r = Math.sqrt(x * x + z * z);
      if (r > half * 1.02) continue;
      var fade = 1 - smooth(half * 0.5, half * 1.02, r);
      w.put(x + (rnd() - 0.5) * 0.006, y + (rnd() - 0.5) * 0.006, z + (rnd() - 0.5) * 0.006, 0, (1 - fade) * 0.45, size, rnd(), bright * (0.2 + 0.8 * fade));
      k++;
    }
  }

  var _p = [0, 0, 0];
  // random point on the surface (top + 4 sides) or an edge of an axis-aligned box
  function boxPt(rnd, cx, cy, cz, sx_, sy_, sz_, edgeFrac) {
    var hx = sx_ / 2, hy = sy_ / 2, hz = sz_ / 2;
    if (rnd() < edgeFrac) {
      var ax = Math.floor(rnd() * 3), sa = rnd() < 0.5 ? -1 : 1, sb = rnd() < 0.5 ? -1 : 1, t = (rnd() * 2 - 1);
      if (ax === 0) { _p[0] = cx + t * hx; _p[1] = cy + sa * hy; _p[2] = cz + sb * hz; }
      else if (ax === 1) { _p[0] = cx + sa * hx; _p[1] = cy + t * hy; _p[2] = cz + sb * hz; }
      else { _p[0] = cx + sa * hx; _p[1] = cy + sb * hy; _p[2] = cz + t * hz; }
      return _p;
    }
    var aTop = sx_ * sz_, aX = sy_ * sz_, aZ = sx_ * sy_, r = rnd() * (aTop + 2 * aX + 2 * aZ);
    if (r < aTop) { _p[0] = cx + (rnd() * 2 - 1) * hx; _p[1] = cy + hy; _p[2] = cz + (rnd() * 2 - 1) * hz; }
    else if (r < aTop + 2 * aX) { _p[0] = cx + (rnd() < 0.5 ? -hx : hx); _p[1] = cy + (rnd() * 2 - 1) * hy; _p[2] = cz + (rnd() * 2 - 1) * hz; }
    else { _p[0] = cx + (rnd() * 2 - 1) * hx; _p[1] = cy + (rnd() * 2 - 1) * hy; _p[2] = cz + (rnd() < 0.5 ? -hz : hz); }
    return _p;
  }

  /* ---- 1. reconstruct: a scanned city block with SfM cameras orbiting it ---- */
  function genReconstruct(n, rnd) {
    var w = new Writer(n), i, k;
    var G = Math.floor(n * 0.13);
    var nGrid = Math.floor(G * 0.88);
    groundGrid(w, rnd, nGrid, -1, 2.95, 0.37, 0.95, 0.6);
    for (i = 0; i < G - nGrid; i++) {
      var a0 = rnd() * TAU, r0 = 2.9 * Math.sqrt(rnd());
      w.put(Math.cos(a0) * r0, -1 + (rnd() - 0.5) * 0.01, Math.sin(a0) * r0, 0, 0.05, 0.7, rnd(), 0.2);
    }

    // buildings on a jittered grid, taller towards the center
    var boxes = [], gi, gj;
    for (gi = -3; gi <= 2; gi++) {
      for (gj = -3; gj <= 2; gj++) {
        if (rnd() < 0.22) continue;
        var bx = (gi + 0.5) * 0.9 + (rnd() - 0.5) * 0.14, bz = (gj + 0.5) * 0.9 + (rnd() - 0.5) * 0.14;
        var rr = Math.sqrt(bx * bx + bz * bz);
        if (rr > 2.55) continue;
        var bw = 0.3 + rnd() * 0.24, bd = 0.3 + rnd() * 0.24;
        var bh = (0.18 + Math.pow(rnd(), 1.8) * 1.25) * (1 + 1.0 * Math.exp(-(rr * rr) / 1.5));
        boxes.push({ x: bx, z: bz, w: bw, d: bd, h: bh });
      }
    }
    // a signature tower with an antenna
    var tall = boxes.reduce(function (m, b) { return b.h > m.h ? b : m; }, boxes[0]);
    boxes.push({ x: tall.x, z: tall.z, w: 0.05, d: 0.05, h: tall.h + 0.55, base: 0 });

    var nB = Math.floor(n * 0.72), total = 0;
    boxes.forEach(function (b) { b.area = 2 * b.h * (b.w + b.d) + b.w * b.d; total += b.area; });
    boxes.forEach(function (b, bi) {
      var cnt = Math.max(30, Math.floor((nB * b.area) / total));
      for (k = 0; k < cnt; k++) {
        var x, y, z, c = undefined, size = 0.85, bright = 0.38;
        var r = rnd();
        if (r < 0.1) {
          var p = boxPt(rnd, b.x, -1 + b.h / 2, b.z, b.w, b.h, b.d, 1);
          x = p[0]; y = p[1]; z = p[2]; bright = 0.85; size = 0.9;
        } else {
          var face = rnd() * (2 * b.h * (b.w + b.d) + b.w * b.d);
          var topA = b.w * b.d, sideA = b.h * b.w, sideB = b.h * b.d;
          if (face < topA) {
            x = b.x + (rnd() - 0.5) * b.w; z = b.z + (rnd() - 0.5) * b.d; y = -1 + b.h;
            bright = 0.62; size = 0.9;
          } else {
            var f = face - topA, fi, lh;
            if (f < 2 * sideA) { fi = f < sideA ? 0 : 1; lh = b.w; } else { fi = f < 2 * sideA + sideB ? 2 : 3; lh = b.d; }
            var u = rnd() * lh, v = rnd() * b.h;
            var iu = Math.floor(u / 0.085), iv = Math.floor(v / 0.1);
            var hv = hash(bi * 13.7 + fi * 7.3 + iu * 3.1 + iv * 5.7);
            if (hv > 0.5 && b.w > 0.06) {
              u = (iu + 0.5) * 0.085 + randn(rnd) * 0.007;
              v = (iv + 0.5) * 0.1 + randn(rnd) * 0.007;
              bright = 0.95; size = 1.25;
            }
            v = clamp(v, 0, b.h);
            y = -1 + v;
            if (fi === 0) { x = b.x - b.w / 2 + u; z = b.z - b.d / 2; }
            else if (fi === 1) { x = b.x - b.w / 2 + u; z = b.z + b.d / 2; }
            else if (fi === 2) { x = b.x - b.w / 2; z = b.z - b.d / 2 + u; }
            else { x = b.x + b.w / 2; z = b.z - b.d / 2 + u; }
            if (bright > 0.9 && hash(bi * 3.3 + iu * 9.1 + iv * 1.7) > 0.9) { c = 0.92; }
          }
        }
        if (c === undefined) c = clamp(((y + 1) / 2.4) * 0.6, 0, 0.6);
        w.put(x + randn(rnd) * 0.003, y, z + randn(rnd) * 0.003, 0, c, size, rnd(), bright);
        c = undefined;
      }
    });

    // SfM camera frusta orbiting the block
    var nCam = 9, perCam = Math.floor((n * 0.035) / nCam);
    for (i = 0; i < nCam; i++) {
      var th = (i / nCam) * TAU + (rnd() - 0.5) * 0.3, rad = 3.05 + rnd() * 0.25;
      var pos = [Math.cos(th) * rad, -0.55 + rnd() * 1.5, Math.sin(th) * rad];
      var f3 = norm3([-pos[0], 0.15 - pos[1], -pos[2]]);
      var right = norm3(cross3(f3, [0, 1, 0])), up = cross3(right, f3);
      var d = 0.42, hw = 0.27, hh = 0.18, cn = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (s) {
        cn.push([
          pos[0] + f3[0] * d + right[0] * s[0] * hw + up[0] * s[1] * hh,
          pos[1] + f3[1] * d + right[1] * s[0] * hw + up[1] * s[1] * hh,
          pos[2] + f3[2] * d + right[2] * s[0] * hw + up[2] * s[1] * hh,
        ]);
      });
      var edges = [[pos, cn[0]], [pos, cn[1]], [pos, cn[2]], [pos, cn[3]], [cn[0], cn[1]], [cn[1], cn[2]], [cn[2], cn[3]], [cn[3], cn[0]]];
      for (k = 0; k < perCam; k++) {
        if (rnd() < 0.14) {
          var a = rnd() * 2 - 1, b2 = rnd() * 2 - 1;
          w.put(
            pos[0] + f3[0] * d + right[0] * a * hw + up[0] * b2 * hh,
            pos[1] + f3[1] * d + right[1] * a * hw + up[1] * b2 * hh,
            pos[2] + f3[2] * d + right[2] * a * hw + up[2] * b2 * hh,
            5, 0.9, 0.8, rnd(), 0.35
          );
        } else {
          var e = edges[Math.floor(rnd() * 8)], t = rnd();
          w.put(e[0][0] + (e[1][0] - e[0][0]) * t, e[0][1] + (e[1][1] - e[0][1]) * t, e[0][2] + (e[1][2] - e[0][2]) * t, 5, 0.97, 1.5, rnd(), 1.1);
        }
      }
    }
    // camera path ring
    var nRing = Math.floor(n * 0.012);
    for (k = 0; k < nRing; k++) {
      var ar = rnd() * TAU;
      w.put(Math.cos(ar) * 3.15, 0.15 + Math.sin(ar * 3) * 0.06, Math.sin(ar) * 3.15, 5, 0.95, 0.8, rnd(), 0.3);
    }
    // sparse SfM haze hugging the geometry
    var nHaze = Math.floor(n * 0.06);
    for (k = 0; k < nHaze; k++) {
      var hb = boxes[Math.floor(rnd() * boxes.length)];
      w.put(hb.x + (rnd() - 0.5) * (hb.w + 0.3), -1 + rnd() * (hb.h + 0.25), hb.z + (rnd() - 0.5) * (hb.d + 0.3), 0, 0.12, 0.7, rnd(), 0.24);
    }
    return w.fill(rnd);
  }

  /* ---- 2. splat: ~50 anisotropic 3D Gaussians ------------------------------ */
  function genSplat(n, rnd) {
    var w = new Writer(n), i, k;
    var G = Math.floor(n * 0.13);
    // six flat, wide Gaussians = the ground (also keeps index pairing with other scenes)
    for (i = 0; i < 6; i++) {
      var ca = (i / 6) * TAU + rnd(), cr = 0.7 + rnd() * 1.2;
      var cx = Math.cos(ca) * cr, cz = Math.sin(ca) * cr;
      var sxg = 0.65 + rnd() * 0.5, szg = 0.65 + rnd() * 0.5, rot = rnd() * TAU;
      var cc = rnd() < 0.5 ? 0.05 : 0.5;
      var cnt = Math.floor(G / 6) + (i === 5 ? G - 6 * Math.floor(G / 6) : 0);
      for (k = 0; k < cnt; k++) {
        var gx = clamp(randn(rnd), -2.4, 2.4) * sxg * 0.6, gz = clamp(randn(rnd), -2.4, 2.4) * szg * 0.6;
        var rx = Math.cos(rot) * gx - Math.sin(rot) * gz, rz = Math.sin(rot) * gx + Math.cos(rot) * gz;
        w.put(cx + rx, -1 + randn(rnd) * 0.008, cz + rz, 6, cc + randn(rnd) * 0.03, 2.0, i / 6, 0.1);
      }
    }
    // a trefoil knot of Gaussians (44) — reads as a 3D object made of splats
    var K = 44, weights = [], wsum = 0;
    for (i = 0; i < K; i++) { weights[i] = 0.7 + rnd() * 0.7; wsum += weights[i]; }
    var remaining = n - G;
    for (i = 0; i < K; i++) {
      var t = ((i + rnd() * 0.6) / K) * TAU;
      var c3 = [
        0.5 * (Math.sin(t) + 2 * Math.sin(2 * t)) + randn(rnd) * 0.05,
        0.3 + 0.5 * (Math.cos(t) - 2 * Math.cos(2 * t)) + randn(rnd) * 0.05,
        0.5 * -Math.sin(3 * t) * 1.25 + randn(rnd) * 0.05,
      ];
      var tan = norm3([Math.cos(t) + 4 * Math.cos(2 * t), -Math.sin(t) + 4 * Math.sin(2 * t), -3 * Math.cos(3 * t)]);
      var e1, randomCov = rnd() < 0.35;
      e1 = randomCov ? norm3([randn(rnd), randn(rnd), randn(rnd)]) : tan;
      var rv = norm3([randn(rnd), randn(rnd), randn(rnd)]);
      var pr = dot3(rv, e1);
      var e2 = norm3([rv[0] - pr * e1[0], rv[1] - pr * e1[1], rv[2] - pr * e1[2]]);
      var e3 = cross3(e1, e2);
      var big = rnd() < 0.12 ? 1.8 : 1;
      var s1 = (0.1 + rnd() * 0.14) * big, s2 = (0.035 + rnd() * 0.06) * big, s3 = (0.02 + rnd() * 0.04) * big;
      var pick = rnd(), gc = pick < 0.5 ? rnd() * 0.12 : pick < 0.85 ? 0.5 + (rnd() - 0.5) * 0.14 : 0.94;
      var count = Math.floor((remaining * weights[i]) / wsum);
      var phase = rnd();
      for (k = 0; k < count; k++) {
        var l1 = clamp(randn(rnd), -2.5, 2.5) * s1, l2 = clamp(randn(rnd), -2.5, 2.5) * s2, l3 = clamp(randn(rnd), -2.5, 2.5) * s3;
        w.put(
          c3[0] + e1[0] * l1 + e2[0] * l2 + e3[0] * l3,
          c3[1] + e1[1] * l1 + e2[1] * l2 + e3[1] * l3,
          c3[2] + e1[2] * l1 + e2[2] * l2 + e3[2] * l3,
          6, clamp(gc + randn(rnd) * 0.03, 0, 1), 1.0, phase, 0.24
        );
      }
    }
    return w.fill(rnd);
  }

  /* ---- 3. bricks: a LEGO-like tree of 2x4 bricks, built brick by brick ------ */
  function genBricks(n, rnd) {
    var w = new Writer(n), i, k;
    var G = Math.floor(n * 0.13);
    var p = 0.2, BL = 4 * p, BS = 2 * p, BH = 0.24, SR = 0.062, SH = 0.052;
    var PLATE = 18; // studs per side -> 3.6 wide

    // baseplate (static): studs grid + slab
    var plateW = PLATE * p, plateH = 0.1;
    for (k = 0; k < G; k++) {
      var r = rnd();
      if (r < 0.55) {
        var si = Math.floor(rnd() * PLATE), sj = Math.floor(rnd() * PLATE);
        var sxp = (si + 0.5 - PLATE / 2) * p, szp = (sj + 0.5 - PLATE / 2) * p;
        if (rnd() < 0.4) {
          var ra = SR * Math.sqrt(rnd()), aa = rnd() * TAU;
          w.put(sxp + Math.cos(aa) * ra, -1 + SH, szp + Math.sin(aa) * ra, 0, 0.3, 0.8, rnd(), 0.75);
        } else {
          var ab = rnd() * TAU;
          w.put(sxp + Math.cos(ab) * SR, -1 + rnd() * SH, szp + Math.sin(ab) * SR, 0, 0.3, 0.8, rnd(), 0.6);
        }
      } else {
        var bp = boxPt(rnd, 0, -1 - plateH / 2, 0, plateW, plateH, plateW, 0.45);
        w.put(bp[0], bp[1], bp[2], 0, 0.28 + (rnd() - 0.5) * 0.06, 0.8, rnd(), 0.4);
      }
    }

    // the tree, on an integer stud grid (positions are multiples of p)
    var bricks = [];
    function add(x, lvl, z, ori) { bricks.push({ x: x, lvl: lvl, z: z, ori: ori }); }
    var TOP = 10, l;
    for (l = 0; l <= TOP; l++) add(0, l, 0, l % 2); // ori 0 = long axis along x
    function arm(x0, z0, l0, dx, dz, len, sub) {
      // first brick sits beside the trunk (same level, trunk brick is perpendicular there)
      var x = x0 + dx * 0.6, z = z0 + dz * 0.6, lv = l0, ori = dx !== 0 ? 0 : 1;
      add(x, lv, z, ori);
      for (var j = 2; j <= len; j++) {
        x += dx * 0.4; z += dz * 0.4; lv++;
        add(x, lv, z, ori);
        if (sub && j === 3) {
          subArm(x, z, lv, -dz, dx, 3);
          if (len >= 5) subArm(x, z, lv, dz, -dx, 2);
        }
      }
    }
    function subArm(x0, z0, l0, dx, dz, len) {
      var x = x0 + dx * 0.6, z = z0 + dz * 0.6, lv = l0, ori = dx !== 0 ? 0 : 1;
      add(x, lv, z, ori);
      for (var j = 2; j <= len; j++) { x += dx * 0.4; z += dz * 0.4; lv++; add(x, lv, z, ori); }
    }
    // one arm per level, turning 90 degrees each time (x arms on odd levels, z arms on even)
    arm(0, 0, 1, 1, 0, 4, false);
    arm(0, 0, 2, 0, -1, 5, true);
    arm(0, 0, 3, -1, 0, 4, false);
    arm(0, 0, 4, 0, 1, 5, true);
    arm(0, 0, 5, 1, 0, 3, false);
    arm(0, 0, 6, 0, -1, 3, false);
    arm(0, 0, 7, -1, 0, 3, false);
    arm(0, 0, 8, 0, 1, 2, false);

    bricks.forEach(function (b, bi) {
      b.order = b.lvl + 0.03 * Math.sqrt(b.x * b.x + b.z * b.z) + hash(bi) * 0.01;
      var hv = hash(bi * 5.1 + 2.3);
      b.c = clamp(1 - b.lvl / 11 + (hv - 0.5) * 0.28, 0, 1); // amber base -> violet -> cyan crown
      b.cx = b.x; b.cy = -1 + BH * (b.lvl + 0.5); b.cz = b.z;
      b.sx = b.ori === 0 ? BL : BS; b.sz = b.ori === 0 ? BS : BL;
    });
    bricks.sort(function (a, b) { return a.order - b.order; });
    brickInfo.total = bricks.length;
    brickInfo.levels = bricks.reduce(function (m, b) { return Math.max(m, b.lvl + 1); }, 1);
    // studs that are not covered by a brick sitting on top
    bricks.forEach(function (b) {
      b.studs = [];
      for (var a = 0; a < 4; a++) for (var c = 0; c < 2; c++) {
        var lx = (a - 1.5) * p, lz = (c - 0.5) * p;
        var stx = b.cx + (b.ori === 0 ? lx : lz), stz = b.cz + (b.ori === 0 ? lz : lx), covered = false;
        for (var q = 0; q < bricks.length; q++) {
          var o = bricks[q];
          if (o.lvl === b.lvl + 1 && Math.abs(stx - o.cx) < o.sx / 2 - 0.001 && Math.abs(stz - o.cz) < o.sz / 2 - 0.001) { covered = true; break; }
        }
        if (!covered) b.studs.push([stx, stz]);
      }
    });
    var nT = n - G, per = Math.floor(nT / bricks.length);
    bricks.forEach(function (b, bi) {
      var t01 = (bi / bricks.length) * 0.93 + 0.01;
      var cnt = per;
      var studFrac = b.studs.length ? 0.26 : 0;
      for (var q = 0; q < cnt; q++) {
        if (rnd() < studFrac) {
          var st = b.studs[Math.floor(rnd() * b.studs.length)], top = b.cy + BH / 2, rr = rnd();
          if (rr < 0.4) {
            var ra = SR * Math.sqrt(rnd()), aa = rnd() * TAU;
            w.put(st[0] + Math.cos(aa) * ra, top + SH, st[1] + Math.sin(aa) * ra, 1, b.c, 1.05, t01, 1.3);
          } else {
            var ab = rnd() * TAU;
            w.put(st[0] + Math.cos(ab) * SR, top + rnd() * SH, st[1] + Math.sin(ab) * SR, 1, b.c, 1.0, t01, 1.1);
          }
        } else {
          var bp = boxPt(rnd, b.cx, b.cy, b.cz, b.sx, BH, b.sz, 0.16);
          w.put(bp[0] + randn(rnd) * 0.002, bp[1], bp[2] + randn(rnd) * 0.002, 1, b.c, 0.95, t01, 0.95);
        }
      }
    });
    return w.fill(rnd);
  }

  /* ---- 4. spacetime: helical world-lines, a time-slice, an object in motion -- */
  var HELIX = [
    { R: 0.8, T: 2.0, s: 1, ph: 0, wt: 0.2 },
    { R: 1.25, T: 1.4, s: -1, ph: 1.7, wt: 0.16 },
    { R: 1.7, T: 1.0, s: 1, ph: 3.1, wt: 0.14 },
    { R: 0.5, T: 2.6, s: -1, ph: 0.6, wt: 0.14 },
    { R: 2.1, T: 0.8, s: 1, ph: 4.4, wt: 0.12 },
    { R: 1.5, T: 1.8, s: -1, ph: 5.2, wt: 0.14 },
  ];
  function genSpacetime(n, rnd) {
    var w = new Writer(n), i, k;
    var G = Math.floor(n * 0.13);
    groundGrid(w, rnd, G, -1, 2.95, 0.37, 0.95, 0.6);

    var nRib = Math.floor(n * 0.6);
    HELIX.forEach(function (h, id) {
      var cnt = Math.floor(nRib * h.wt);
      for (k = 0; k < cnt; k++) {
        var s = rnd(), a = h.s * TAU * h.T * s + h.ph;
        var wd = (rnd() - 0.5) * 0.05, ux = Math.cos(a), uz = Math.sin(a);
        w.put(
          (h.R + wd) * ux, -1 + 2.4 * s + (rnd() - 0.5) * 0.03, (h.R + wd) * uz,
          2, s, id === 0 ? 1.1 : 0.85, s, (id === 0 ? 1.0 : 0.7) + 10 * id
        );
      }
    });
    // the moving object: shell + spinning ring (local coords; the shader adds the world-line position)
    var nObj = Math.floor(n * 0.07);
    for (k = 0; k < nObj; k++) {
      var r = rnd();
      if (r < 0.5) {
        var v = norm3([randn(rnd), randn(rnd), randn(rnd)]);
        w.put(v[0] * 0.16, v[1] * 0.16, v[2] * 0.16, 3, 0.96, 1.3, rnd(), 1.25);
      } else if (r < 0.75) {
        w.put(randn(rnd) * 0.045, randn(rnd) * 0.045, randn(rnd) * 0.045, 3, 0.9, 1.6, rnd(), 1.0);
      } else {
        var ar = rnd() * TAU;
        w.put(Math.cos(ar) * 0.32, Math.sin(ar * 2) * 0.02, Math.sin(ar) * 0.32, 3, 0.9, 1.0, rnd(), 0.95);
      }
    }
    // the sweeping time slice
    var nSl = Math.floor(n * 0.05);
    for (k = 0; k < nSl; k++) {
      var as = rnd() * TAU, rs;
      if (rnd() < 0.35) rs = 2.45; else rs = (Math.floor(rnd() * 6) + 1) * 0.4 + (rnd() - 0.5) * 0.01;
      w.put(Math.cos(as) * rs, 0, Math.sin(as) * rs, 4, 0.52, 0.9, rnd(), 0.55);
    }
    // faint dust
    var nD = Math.floor(n * 0.06);
    for (k = 0; k < nD; k++) {
      var ad = rnd() * TAU, rd = 2.6 * Math.sqrt(rnd());
      w.put(Math.cos(ad) * rd, -1 + rnd() * 2.4, Math.sin(ad) * rd, 0, 0.1 + rnd() * 0.5, 0.65, rnd(), 0.16);
    }
    return w.fill(rnd);
  }

  var GENS = [genReconstruct, genSplat, genBricks, genSpacetime];
  function ensureScene(i) {
    if (!scenes[i]) scenes[i] = GENS[i](N, mulberry32(0x9e3779b1 + i * 7919));
    if (gl && !bufs[i]) uploadScene(i);
    return scenes[i];
  }
  function genRandAttr() {
    var r = mulberry32(0x51ed270b), a = new Float32Array(N * 4);
    for (var i = 0; i < N; i++) {
      var x = randn(r) * 0.75, y = randn(r) * 0.5, z = randn(r) * 0.75;
      var l = Math.sqrt(x * x + y * y + z * z);
      if (l > 2.0) { x *= 2.0 / l; y *= 2.0 / l; z *= 2.0 / l; }
      a[i * 4] = x; a[i * 4 + 1] = y; a[i * 4 + 2] = z; a[i * 4 + 3] = r();
    }
    return a;
  }

  /* ------------------------------------------------------------- shaders */
  var VS = [
    'precision highp float;',
    'attribute vec4 aP0; attribute vec4 aM0; attribute vec4 aP1; attribute vec4 aM1; attribute vec4 aR;',
    'uniform mat4 uView; uniform mat4 uProj;',
    'uniform float uTime, uMorph, uTrain, uBuild, uPx, uAspect, uSizeK, uAlphaK, uScanA, uScanB, uMouseS, uDist;',
    'uniform vec2 uMouse; uniform vec4 uShock[3];',
    'uniform vec4 uKeep; uniform vec3 uKeepF;', // legibility stage: keep box (NDC x0,x1,y0,y1), feather (x,y), floor alpha
    'uniform vec3 uC0, uC1, uC2;',
    'varying vec3 vCol; varying float vA; varying float vSoft;',
    'const float TAU = 6.2831853;',
    'float sObj() { return fract(uTime * 0.055 + 0.1); }',
    'vec3 helix0(float s) { float a = TAU * 2.0 * s; return vec3(0.8 * cos(a), -1.0 + 2.4 * s, 0.8 * sin(a)); }',
    'vec3 palette(float c) { return c < 0.5 ? mix(uC0, uC1, c * 2.0) : mix(uC1, uC2, (c - 0.5) * 2.0); }',
    'void animate(vec4 P, vec4 M, float scan, out vec3 pos, out float alpha, out float size, out float soft) {',
    '  pos = P.xyz; alpha = M.w; size = M.y; soft = 0.12;',
    '  float k = P.w;',
    '  if (k > 5.5) {',
    '    soft = 0.5;',
    '    pos += 0.045 * vec3(sin(uTime * 0.7 + M.z * 6.283), sin(uTime * 0.9 + M.z * 9.1), cos(uTime * 0.8 + M.z * 4.3));',
    '  } else if (k > 4.5) {',
    '    float a = uTime * 0.11; float cs = cos(a); float sn = sin(a);',
    '    pos.xz = vec2(cs * P.x - sn * P.z, sn * P.x + cs * P.z);',
    '  } else if (k > 3.5) {',
    '    float s = sObj(); pos.y = -1.0 + 2.4 * s; alpha *= sin(3.14159 * s);',
    '  } else if (k > 2.5) {',
    '    float s = sObj(); float a = uTime * 1.6; float cs = cos(a); float sn = sin(a);',
    '    vec3 l = vec3(cs * P.x - sn * P.z, P.y, sn * P.x + cs * P.z);',
    '    pos = l + helix0(s); alpha *= sin(3.14159 * s);',
    '  } else if (k > 1.5) {',
    '    float id = floor(M.w / 10.0 + 0.001); float base = M.w - 10.0 * id;',
    '    float head = fract(uTime * 0.055 + 0.1 + id * 0.17);',
    '    float d = fract(head - M.z); float pulse = exp(-d * 7.0);',
    '    alpha = base * (0.3 + 1.6 * pulse) * smoothstep(0.0, 0.05, M.z) * smoothstep(1.0, 0.95, M.z);',
    '    size *= 1.0 + 0.8 * pulse;',
    '  } else if (k > 0.5) {',
    '    float bd = uBuild - M.z; float vis = smoothstep(0.0, 0.035, bd);',
    '    pos.y += (1.0 - vis) * 0.9;',
    '    alpha *= vis * (1.0 + 1.4 * exp(-max(bd, 0.0) * 28.0)); size *= 0.35 + 0.65 * vis;',
    '  }',
    '  float sy = (pos.y - (-1.15 + fract(uTime * 0.1) * 3.2)) / 0.09;',
    '  float g = exp(-sy * sy);',
    '  alpha *= 1.0 + scan * g * 2.2; size *= 1.0 + scan * g * 0.5;',
    '}',
    'void main() {',
    '  vec3 pa; vec3 pb; float aa; float ab; float za; float zb; float fa; float fb;',
    '  animate(aP0, aM0, uScanA, pa, aa, za, fa);',
    '  animate(aP1, aM1, uScanB, pb, ab, zb, fb);',
    '  float delay = aR.w * 0.4;',
    '  float t = clamp((uMorph - delay) / 0.6, 0.0, 1.0);',
    '  float e = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);',
    '  float bump = sin(3.14159 * e);',
    '  vec3 p = mix(pa, pb, e);',
    '  float ang = bump * (1.4 + 2.4 * aR.w);',
    '  float cs = cos(ang); float sn = sin(ang);',
    '  p.xz = vec2(cs * p.x - sn * p.z, sn * p.x + cs * p.z);',
    '  p += aR.xyz * 0.32 * bump; p.y += bump * 0.35 * (aR.w - 0.5);',
    '  float a = mix(aa, ab, e); float size = mix(za, zb, e); float soft = mix(fa, fb, e);',
    '  float c = mix(aM0.x, aM1.x, e);',
    /* training: noisy cloud -> converged scene, coarse -> fine */
    '  float tr = smoothstep(0.0, 1.0, clamp(uTrain * 1.5 - aR.w * 0.5, 0.0, 1.0));',
    '  float ca = uTime * 0.12; vec3 cloud = aR.xyz * 1.55; cloud.xz = vec2(cos(ca) * cloud.x - sin(ca) * cloud.z, sin(ca) * cloud.x + cos(ca) * cloud.z);',
    '  float un = 1.0 - uTrain;',
    '  vec3 jit = un * un * 0.4 * vec3(sin(uTime * 2.3 + aR.x * 31.0), sin(uTime * 1.9 + aR.y * 27.0), sin(uTime * 2.7 + aR.z * 23.0));',
    '  p = mix(cloud, p, tr) + jit;',
    '  a *= mix(0.11, 1.0, uTrain * uTrain); size *= mix(2.0, 1.0, uTrain); soft = mix(1.0, soft, uTrain);',
    '  vec3 col = palette(c); float lum = dot(col, vec3(0.3, 0.55, 0.15));',
    '  col = mix(vec3(lum), col, mix(0.25, 1.0, uTrain));',
    '  vec4 vp = uView * vec4(p, 1.0); float depth = -vp.z; vec4 clip = uProj * vp;',
    '  vec2 nd = clip.xy / clip.w; vec2 asp = vec2(uAspect, 1.0);',
    '  float boost = 0.0; vec2 push = vec2(0.0);',
    '  vec2 dm = (nd - uMouse) * asp; float dl = length(dm) + 0.0001;',
    '  float f = exp(-dl * dl / 0.04) * uMouseS;',
    '  push += dm / dl * f * 0.11; boost += f * 0.9;',
    '  for (int i = 0; i < 3; i++) {',
    '    vec4 sh = uShock[i];',
    '    if (sh.w > 0.5) {',
    '      vec2 ds = (nd - sh.xy) * asp; float dd = length(ds) + 0.0001;',
    '      float q = (dd - sh.z * 1.4) / 0.085; float band = exp(-q * q); float fade = exp(-sh.z * 1.25);',
    '      push += ds / dd * band * 0.1 * fade; boost += band * 1.6 * fade;',
    '    }',
    '  }',
    '  clip.xy += (push / asp) * clip.w;',
    '  gl_Position = clip;',
    '  float px = size * uSizeK * uPx / max(depth, 0.5) * (1.0 + boost * 0.5);',
    '  float px1 = max(px, 1.6); float thin = clamp(px / 1.6, 0.18, 1.0);',
    '  gl_PointSize = min(px1, 120.0);',
    '  float df = clamp(1.0 - (depth - uDist) * 0.11, 0.3, 1.3);',
    '  float tw = 0.88 + 0.12 * sin(uTime * 2.1 + aR.w * 60.0);',
    '  vA = a * uAlphaK * df * thin * tw * (1.0 + boost);',
    '  float mk = smoothstep(uKeep.x - uKeepF.x, uKeep.x, nd.x) * (1.0 - smoothstep(uKeep.y, uKeep.y + uKeepF.x, nd.x));',
    '  mk *= smoothstep(uKeep.z - uKeepF.y, uKeep.z, nd.y) * (1.0 - smoothstep(uKeep.w, uKeep.w + uKeepF.y, nd.y));',
    '  vA *= mix(uKeepF.z, 1.0, mk);',
    '  vCol = col; vSoft = soft;',
    '}',
  ].join('\n');

  var FS = [
    'precision mediump float;',
    'uniform float uLight;',
    'varying vec3 vCol; varying float vA; varying float vSoft;',
    'void main() {',
    '  vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d);',
    '  if (r2 > 1.0) discard;',
    '  float k = mix(5.5, 2.0, vSoft);',
    '  float g = (exp(-r2 * k) - exp(-k)) / (1.0 - exp(-k));',
    '  float a = g * vA;',
    '  if (uLight > 0.5) gl_FragColor = vec4(vCol, min(a, 0.95));',
    '  else gl_FragColor = vec4(vCol * a, a);',
    '}',
  ].join('\n');

  /* ------------------------------------------------------------ GL setup */
  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('shader compile: ' + log);
    }
    return s;
  }
  function setupGL() {
    var vs = compile(gl.VERTEX_SHADER, VS), fs = compile(gl.FRAGMENT_SHADER, FS);
    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    ['aP0', 'aM0', 'aP1', 'aM1', 'aR'].forEach(function (n, i) { gl.bindAttribLocation(prog, i, n); });
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('program link: ' + gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    loc = {};
    ['uView', 'uProj', 'uTime', 'uMorph', 'uTrain', 'uBuild', 'uPx', 'uAspect', 'uSizeK', 'uAlphaK', 'uScanA', 'uScanB', 'uMouseS', 'uDist',
      'uMouse', 'uC0', 'uC1', 'uC2', 'uLight', 'uKeep', 'uKeepF'].forEach(function (n) { loc[n] = gl.getUniformLocation(prog, n); });
    loc.uShock = gl.getUniformLocation(prog, 'uShock[0]');
    for (var i = 0; i < 5; i++) gl.enableVertexAttribArray(i);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    var rng = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    maxPoint = rng && rng[1] ? rng[1] : 64;
    bufs = [null, null, null, null];
    bufR = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufR);
    gl.bufferData(gl.ARRAY_BUFFER, rArr, gl.STATIC_DRAW);
    for (var s = 0; s < 4; s++) if (scenes[s]) uploadScene(s);
  }
  function uploadScene(i) {
    var sc = scenes[i];
    var bp = gl.createBuffer(), bm = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bp);
    gl.bufferData(gl.ARRAY_BUFFER, sc.P, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bm);
    gl.bufferData(gl.ARRAY_BUFFER, sc.M, gl.STATIC_DRAW);
    bufs[i] = { P: bp, M: bm };
  }

  function setStatus(st) {
    if (hero.status === st) return;
    hero.status = st;
    S.emit('herostatus', st);
  }
  function fallback(why) {
    hero.isWebGL = false;
    root.classList.add('no-webgl');
    root.style.removeProperty('--hero-copy-r');
    root.style.removeProperty('--stage-x');
    root.style.removeProperty('--stage-y');
    setStatus('none');
    if (canvas) canvas.style.display = 'none';
    if (!warned && window.console && console.warn) {
      warned = true;
      console.warn('[hero] WebGL backdrop disabled (' + why + '); using the CSS fallback.');
    }
    gl = null;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    // keep the HUD honest: show the converged readout
    train = 1;
    training = false;
    pushTelemetry(true);
  }

  /* ------------------------------------------------------- theme / layout */
  function cssVar(name) { return getComputedStyle(root).getPropertyValue(name).trim(); }
  function parseRGB(str, fb) {
    var m;
    if (str && str.charAt(0) === '#') {
      var h = str.slice(1);
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      if (h.length >= 6) return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
    }
    m = str && str.match(/[\d.]+/g);
    if (m && m.length >= 3) return [m[0] / 255, m[1] / 255, m[2] / 255];
    return fb;
  }
  function readTheme() {
    var light = root.getAttribute('data-theme') === 'light';
    var c0 = parseRGB(cssVar('--accent-rgb'), [0.33, 0.9, 1]);
    var c1 = parseRGB(cssVar('--accent-2-rgb'), [0.56, 0.48, 1]);
    var c2 = parseRGB(cssVar('--accent-3-rgb'), [1, 0.7, 0.33]);
    var bg = parseRGB(cssVar('--bg'), light ? [0.96, 0.965, 0.98] : [0.024, 0.031, 0.047]);
    if (light) {
      // darker, slightly desaturated "ink" so points read on a light page
      var ink = [0.16, 0.22, 0.34];
      var f = function (c) { return [c[0] * 0.78 + ink[0] * 0.22, c[1] * 0.78 + ink[1] * 0.22, c[2] * 0.78 + ink[2] * 0.22]; };
      c0 = f(c0); c1 = f(c1); c2 = f(c2);
    } else {
      // calm dark: one accent hue plus neutrals. The ramp runs accent -> pale accent -> muted gray (from --text / --text-2), so
      // the height gradient and the SfM frusta (top of the ramp) stay readable without a second or third hue.
      var tx = parseRGB(cssVar('--text'), [0.91, 0.94, 0.97]), t2 = parseRGB(cssVar('--text-2'), [0.67, 0.72, 0.79]);
      var mixc = function (a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
      c1 = mixc(c0, tx, 0.5);
      c2 = mixc(t2, bg, 0.42);
    }
    pal = { c0: c0, c1: c1, c2: c2, bg: bg, light: light };
    wake();
  }

  /* ------------------------------------------------------------- stage
     The camera never frames "the whole viewport": it frames a stage rectangle that the
     hero copy leaves free. Measured from the DOM (so it follows fonts, zh copy, resize):
       side  (two-column hero): the area right of the widest text line, above the HUD
       stack (single column):   the empty band between the typed line and the lede (phones: the CTA row) */
  var RF = 2.35; // world radius that should fit the stage (frusta / ground rim may overhang and fade)
  function textBox(el) {
    try {
      var rg = document.createRange();
      rg.selectNodeContents(el);
      var b = rg.getBoundingClientRect();
      if (b && b.width > 0) return b;
    } catch (e) { /* ignore */ }
    return el.getBoundingClientRect();
  }
  function measureStage() {
    stage = null;
    if (!heroEl || !canvas || hero.status === 'none') return;
    var inner = heroEl.querySelector('.hero__inner');
    if (!inner) return;
    var sy0 = window.pageYOffset || 0;
    var cols = getComputedStyle(inner).gridTemplateColumns || '';
    var side = cols !== 'none' && cols.trim().split(/\s+/).length > 1;
    var navH = parseFloat(cssVar('--nav-h')) || 68;
    var q = function (sel) { return heroEl.querySelector(sel); };
    var st = null;
    if (side) {
      var right = 0;
      ['.hero__name', '.hero__role', '.hero__lede'].forEach(function (sel) {
        var el = q(sel);
        if (!el) return;
        var b = textBox(el);
        if (b && b.width > 0) right = Math.max(right, b.right);
      });
      // the CTA row can be the widest thing in the column: measure its last visible button, not the row box
      var cta = q('.hero__cta');
      if (cta) {
        Array.prototype.forEach.call(cta.children, function (el) {
          var cb = el.getBoundingClientRect();
          if (cb.width > 0 && cb.height > 0) right = Math.max(right, cb.right);
        });
      }
      // the hiring note is a bordered box: its outer edge is what the scene must clear
      var hire = q('.hero__hiring');
      if (hire) {
        var hb0 = hire.getBoundingClientRect();
        if (hb0.width > 0 && hb0.height > 0) right = Math.max(right, hb0.right);
      }
      if (right > 0 && right < cw * 0.9) {
        var fw = cw * 0.07;
        var L = right + Math.max(28, cw * 0.022), R = cw - Math.max(14, cw * 0.018); // >= ~32px between the copy and the stage
        var top = navH + 10, bot = ch - 22;
        var hud = document.getElementById('hero-hud'), hb = hud && hud.getBoundingClientRect();
        if (hb && hb.width > 0 && hb.left < R - 40) {
          var ht = hb.top + sy0;
          // the HUD is an occluder: the scene takes the strip above it (>= 200px, or >= 120px on short landscape screens
          // where the HUD is compact and the strip is all there is)
          if (ht < bot - 60) bot = Math.max(top + (ch < 520 ? 120 : 200), ht - 16);
        }
        var rw = Math.max(120, R - L), rh = Math.max(120, bot - top);
        var ppw = Math.min(rw / (2 * RF), rh / (ch < 520 ? 3.7 : 4.2)); // short landscape: the strip is all there is, let the rim overhang a little
        st = { mode: 'side', cx: (L + R) / 2, cy: (top + bot) / 2 + 0.2 * ppw, ppw: ppw, kx0: right + fw * 1.25, kfx: fw * 0.9, ky0: 0, ky1: 0, kfy: 1, right: right, bandH: 0 };
      }
    } else {
      var typed = q('.hero__typed'), lede = q('.hero__lede');
      var ctaRow = q('.hero__cta');
      // phones: the CTA row can sit between the stage band and the lede (order set in hero.css); the band ends at whichever comes first
      if (lede && ctaRow && ctaRow.getBoundingClientRect().top < lede.getBoundingClientRect().top) lede = ctaRow;
      if (typed && lede) {
        var tb = typed.getBoundingClientRect(), lb = lede.getBoundingClientRect();
        var bt = tb.bottom + sy0 + 4, bb = lb.top + sy0 - 12, bh = bb - bt;
        if (bh >= 80) {
          var ppw2 = Math.min((cw - 24) / (2 * RF), bh / 3.6);
          st = { mode: 'stack', cx: cw / 2, cy: (bt + bb) / 2 + 0.06 * ppw2, ppw: ppw2, kx0: 0, kfx: 0, ky0: bt - 0.1 * bh, ky1: bb - 0.3 * bh, kfy: 0.22 * bh, right: 0, bandH: bh, bandBot: bb, navH: navH, heroTop: heroEl.offsetTop || 0 };
        }
      }
    }
    stage = st;
    if (st) {
      baseDist = clamp(ch / (2 * Math.tan(FOV / 2) * st.ppw), 8.8, 40);
      var ref = ch / (2 * Math.tan(FOV / 2) * 8.8);
      sizeK = clamp(Math.sqrt(ref / st.ppw), 1, 2); // a smaller stage keeps its points from shrinking to specks
      if (st.mode === 'side') {
        root.style.setProperty('--hero-copy-r', Math.round(st.right) + 'px');
        root.style.setProperty('--stage-x', Math.round(st.cx) + 'px');
        root.style.setProperty('--stage-y', Math.round(st.cy) + 'px');
      } else {
        root.style.removeProperty('--hero-copy-r');
        root.style.removeProperty('--stage-x');
        root.style.removeProperty('--stage-y');
      }
    } else {
      var tanH = Math.tan(FOV / 2);
      baseDist = clamp(Math.max(8.8, 2.25 / (tanH * aspect)), 8.8, 13.5);
      sizeK = 1;
      root.style.removeProperty('--hero-copy-r');
      root.style.removeProperty('--stage-x');
      root.style.removeProperty('--stage-y');
    }
    wake();
  }
  function scheduleStage() {
    if (stageTimer) return;
    stageTimer = requestAnimationFrame(function () { stageTimer = 0; measureStage(); });
  }

  function layout() {
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    cw = Math.max(1, r.width);
    ch = Math.max(1, r.height);
    narrow = cw < 700;
    var budget = narrow || S.coarse ? 2e6 : 4.5e6; // total canvas pixels: soft points are fill-rate bound
    dpr = Math.max(0.5, Math.min(window.devicePixelRatio || 1, dprCap, Math.sqrt(budget / (cw * ch))));
    var nw = Math.max(1, Math.round(cw * dpr)), nh = Math.max(1, Math.round(ch * dpr));
    if (canvas.width !== nw || canvas.height !== nh) {
      canvas.width = nw;
      canvas.height = nh;
    }
    W = nw; H = nh;
    aspect = cw / ch;
    sx = clamp((aspect - 0.85) / 0.75, 0, 1) * 0.38;
    sy = clamp((aspect - 0.85) / 0.75, 0, 1) * 0.09;
    heroH = heroEl ? heroEl.offsetHeight || ch : ch;
    measureStage();
  }

  function perspective(out, fovy, asp, near, far, shx, shy) {
    var f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    out.fill ? out.fill(0) : 0;
    out[0] = f / asp; out[5] = f; out[8] = -shx; out[9] = -shy; out[10] = (far + near) * nf; out[11] = -1; out[14] = 2 * far * near * nf;
  }
  function lookAt(out, eye, tgt) {
    var z = norm3([eye[0] - tgt[0], eye[1] - tgt[1], eye[2] - tgt[2]]);
    var x = norm3(cross3([0, 1, 0], z)), y = cross3(z, x);
    out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
    out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
    out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
    out[12] = -dot3(x, eye); out[13] = -dot3(y, eye); out[14] = -dot3(z, eye); out[15] = 1;
  }

  /* ------------------------------------------------------------ scene API */
  function idxOf(id) { return IDS.indexOf(id); }

  // the [data-section] under the reading line (same line the section observer uses), measured synchronously
  function currentSection() {
    var line = window.innerHeight * 0.48, secs = S.qsa('[data-section]'), best = null;
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.top <= line && r.bottom > line) { best = secs[i].getAttribute('data-section'); break; }
    }
    return best;
  }

  function setScene(id, opts) {
    var idx = idxOf(id);
    if (idx < 0) return;
    if (opts && opts.pin) pinnedSec = currentSection() || '*'; // manual choice: sticks until the dominant section changes
    if (idx === wanted) return;
    wanted = idx;
    S.emit('scenechange', IDS[idx]);
    if (!gl) { fromIdx = toIdx = idx; return; }
    if (S.reducedMotion || (opts && opts.instant)) {
      ensureScene(idx);
      fromIdx = toIdx = idx;
      morph = 1; morphing = false;
      buildT0 = time;
      wake();
      return;
    }
    kick();
  }
  function kick() {
    if (morphing || wanted === toIdx || !gl) return;
    ensureScene(wanted);
    fromIdx = toIdx;
    toIdx = wanted;
    morph = 0;
    morphing = true;
    if (toIdx === 2) buildT0 = time;
    wake();
  }

  function startTraining() {
    trainT = 0;
    if (S.reducedMotion) {
      train = 1; training = false;
    } else {
      train = 0; training = true;
    }
    wake();
    pushTelemetry(true);
  }
  function replay() {
    pinnedSec = currentSection() || '*';
    if (!gl) { startTraining(); return; }
    if (wanted !== 0 || toIdx !== 0 || morphing) {
      ensureScene(0);
      wanted = 0; fromIdx = 0; toIdx = 0; morph = 1; morphing = false;
      S.emit('scenechange', IDS[0]);
    }
    startTraining();
    yaw = YAW0 - 0.5;
    vyaw = 0;
  }

  /* ------------------------------------------------------------ telemetry */
  function trainMetrics() {
    var p = clamp(trainT / TRAIN_DUR, 0, 1);
    if (!training && train >= 1) p = 1;
    var iter = Math.round(30000 * (0.5 - 0.5 * Math.cos(Math.PI * p)) * 1);
    var psnr = 11.8 + (31.42 - 11.8) * ((1 - Math.exp(-5 * p)) / (1 - Math.exp(-5)));
    var gs = Math.round(1240000 * (0.03 + 0.97 * Math.pow(p, 1.6)));
    return { iter: p >= 1 ? 30000 : iter, psnr: p >= 1 ? 31.42 : psnr, gaussians: p >= 1 ? 1240000 : gs, progress: p };
  }
  function makeState() {
    var m = trainMetrics();
    var tt = S.reducedMotion ? 4 : time;
    var sp = (tt * 0.055 + 0.1) % 1; // phase of the spacetime slice / moving object
    var bv = buildClock();
    return {
      iter: m.iter, psnr: m.psnr, gaussians: m.gaussians, progress: m.progress, training: training,
      yaw: ((((yaw * 180) / Math.PI) % 360) + 360) % 360, pitch: (pitch * 180) / Math.PI, scene: IDS[wanted],
      // per-scene readouts (all simulated: they only mirror what the backdrop is doing)
      build: bv, bphase: bphase, bricks: brickInfo.total, levels: brickInfo.levels,
      phase: sp, tick: tt,
    };
  }
  function pushTelemetry() {
    if (!telemetryCbs.length) return;
    var st = makeState();
    telemetryCbs.slice().forEach(function (fn) { try { fn(st); } catch (e) { /* ignore */ } });
  }

  /* ----------------------------------------------------------- frame loop */
  var bphase = 'hold'; // 'build' | 'hold' | 'unbuild' | 'gap'
  function buildClock() {
    if (S.reducedMotion) { bphase = 'hold'; return 1; }
    var t = time - buildT0; // seconds since the bricks started building
    var BUILD = 9, HOLD = 3.4, UNBUILD = 2.4, GAP = 0.6, cyc = BUILD + HOLD + UNBUILD + GAP;
    t = t % cyc;
    if (t < BUILD) { bphase = 'build'; return t / BUILD * 1.0; }
    if (t < BUILD + HOLD) { bphase = 'hold'; return 1.0; }
    if (t < BUILD + HOLD + UNBUILD) { bphase = 'unbuild'; var u = (t - BUILD - HOLD) / UNBUILD; return 1 - u * u * (3 - 2 * u); }
    bphase = 'gap';
    return 0.0;
  }

  var KEEP_FLOOR = 0.08; // alpha floor for points that leave the stage (they never vanish entirely)

  function wake() {
    dirty = true;
    if (running && !rafId && gl && !ctxLost && !document.hidden) rafId = requestAnimationFrame(frame);
  }

  function frame(now) {
    rafId = 0;
    var again = step(now);
    if (again !== false && running && !rafId) rafId = requestAnimationFrame(frame);
  }

  // returns false when the scene is fully static (loop parks itself until wake())
  function step(now) {
    if (!gl || ctxLost) return true;
    var t = now / 1000;
    // 60 fps cap on high-refresh screens; 30 fps below the hero; 15 fps once the backdrop is fully dimmed
    var minGap = heroVisible ? 1 / 60 - 0.002 : scrollP >= 1 ? 1 / 15 - 0.003 : 1 / 30 - 0.003;
    if (t - lastDraw < minGap) return true;
    var realDt = Math.min(0.5, t - (lastT || t));
    var dt = clamp(t - (lastT || t), 0, minGap > 0.05 ? 0.1 : 0.05);
    lastT = t;
    lastDraw = t;
    var rm = S.reducedMotion;
    // resize requested by the resolution governor: do it before drawing (resizing after the draw would present a cleared, black buffer)
    if (relayoutPending) { relayoutPending = false; layout(); }

    /* clocks */
    var moving = false;
    if (!rm) { time += dt; moving = true; }
    if (morphing) {
      morph += dt / MORPH_DUR;
      if (morph >= 1) { morph = 1; morphing = false; fromIdx = toIdx; kick(); }
      moving = true;
    }
    if (training) {
      trainT += dt;
      var p = clamp(trainT / TRAIN_DUR, 0, 1);
      train = 1 - Math.pow(1 - p, 2.4);
      if (p >= 1) { training = false; train = 1; pushTelemetry(true); }
      moving = true;
    }
    if (introK < 1) { introK = Math.min(1, introK + dt / 0.8); moving = true; }

    /* camera: inertia, auto-orbit, parallax */
    var dragging = !!(drag && drag.mode === 'orbit');
    if (!dragging) {
      if (Math.abs(vyaw) > 0.0004 || Math.abs(vpitch) > 0.0004) {
        yaw += vyaw * dt; pitch += vpitch * dt;
        var damp = Math.exp(-dt * 4.0);
        vyaw *= damp; vpitch *= damp;
        idleFor = 0; moving = true;
      } else { vyaw = vpitch = 0; idleFor += dt; }
      var wantAuto = idleFor > 1.2 ? 1 : 0;
      autoW += (wantAuto - autoW) * Math.min(1, dt * 1.2);
      if (!rm) yaw += 0.06 * autoW * dt;
      if (idleFor > 2.0) pitch += (PITCH0 - pitch) * Math.min(1, dt * 0.5);
    } else { autoW = 0; idleFor = 0; moving = true; }
    pitch = clamp(pitch, -0.12, 1.2);
    var k = 1 - Math.exp(-dt * 6);
    mxs += (mx - mxs) * k; mys += (my - mys) * k;
    // cursor lens only while the hero is on screen and the pointer has moved recently
    var mt = heroVisible && !S.coarse && now - lastPointerT < 2600 ? mouseTarget : 0;
    mouseS += (mt - mouseS) * (1 - Math.exp(-dt * 8));
    if (mt === 0 && mouseS < 0.01) mouseS = 0;
    if (Math.abs(mx - mxs) > 0.001 || Math.abs(my - mys) > 0.001 || mouseS > 0.01) moving = true;

    /* scroll */
    scrollP = clamp(scrollY / (heroH * 0.85), 0, 1);
    var sm = scrollP * scrollP * (3 - 2 * scrollP);
    var op = (1 - (1 - 0.22) * sm) * (introK * introK * (3 - 2 * introK));
    var stackMode = !!(stage && stage.mode === 'stack');
    if (stackMode) {
      // stacked hero: the band scrolls away with the copy and the cloud fades out with it (never behind the lede / CTAs);
      // once the hero itself is gone a dim ambient cloud returns for the sections (parked, as on wide layouts)
      stackK = smooth(stage.navH, stage.navH + stage.bandH * 0.8, stage.bandBot - scrollY);
      ambK = 1 - smooth(0, ch * 0.45, stage.heroTop + heroH - scrollY);
      op *= Math.max(stackK, ambK);
    } else { stackK = 1; ambK = 0; }
    if (Math.abs(op - canvasOpacity) > 0.004 || (op < 0.004 && canvasOpacity !== op)) {
      canvasOpacity = op;
      canvas.style.opacity = op.toFixed(3);
    }

    /* shocks */
    for (var i = shocks.length - 1; i >= 0; i--) {
      shocks[i].t += dt;
      if (shocks[i].t > 2.6) shocks.splice(i, 1);
    }
    if (shocks.length) moving = true;

    if (rm && !moving && !dirty) { lastT = 0; return false; } // fully static: park the loop until something wakes it
    dirty = false;
    if (stackMode && op < 0.004) { // invisible (band scrolled off, hero not yet gone): skip the draw, keep the HUD readout alive
      if (t - lastTel > 0.1) { lastTel = t; pushTelemetry(false); }
      return true;
    }

    /* matrices */
    var smC = stackMode ? sm * ambK : sm; // camera dolly / tilt: stacked layouts keep the band framing until the hero is gone
    var dist = baseDist * (1 + 0.18 * smC);
    var yawE = yaw + mxs * 0.1 + scrollY * 0.00032;
    var pitchE = clamp(pitch - mys * 0.05 + smC * 0.12, -0.12, 1.25);
    var ty = -0.05 - smC * 0.6;
    var eye = [
      Math.cos(pitchE) * Math.sin(yawE) * dist,
      ty + Math.sin(pitchE) * dist,
      Math.cos(pitchE) * Math.cos(yawE) * dist,
    ];
    lookAt(view, eye, [0, ty, 0]);

    /* stage framing (NDC shift of the look-at point) + legibility mask */
    var shx = sx * (1 - 0.6 * sm), shy = sy;
    var kx0 = -9, kx1 = 9, ky0 = -9, ky1 = 9, kfx = 1, kfy = 1, floorA = 1;
    if (stage) {
      var cyEff = stage.cy;
      if (stackMode) cyEff = (stage.cy - scrollY) * (1 - ambK) + ch * 0.32 * ambK; // rides with the copy; parks only once the hero is gone
      shx = ((stage.cx / cw) * 2 - 1) * (1 - 0.6 * smC);
      shy = 1 - (cyEff / ch) * 2;
      floorA = stackMode ? KEEP_FLOOR + (1 - KEEP_FLOOR) * ambK : 1 - (1 - KEEP_FLOOR) * (1 - sm);
      if (stage.mode === 'side') {
        kx0 = (stage.kx0 / cw) * 2 - 1;
        kfx = Math.max(0.02, (stage.kfx / cw) * 2);
      } else {
        var dy = cyEff - stage.cy;
        ky0 = 1 - (2 * (stage.ky1 + dy)) / ch;
        ky1 = 1 - (2 * (stage.ky0 + dy)) / ch;
        kfy = Math.max(0.02, (2 * stage.kfy) / ch);
      }
    }
    perspective(proj, FOV, aspect, 0.5, 60, shx, shy);

    /* draw */
    gl.viewport(0, 0, W, H);
    gl.clearColor(pal.bg[0], pal.bg[1], pal.bg[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (pal.light) gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    else gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(prog);
    gl.uniformMatrix4fv(loc.uView, false, view);
    gl.uniformMatrix4fv(loc.uProj, false, proj);
    gl.uniform1f(loc.uTime, S.reducedMotion ? 4.0 : time);
    gl.uniform1f(loc.uMorph, morph);
    gl.uniform1f(loc.uTrain, train);
    gl.uniform1f(loc.uBuild, buildClock());
    gl.uniform1f(loc.uPx, proj[5] * H * 0.5);
    gl.uniform1f(loc.uAspect, aspect);
    gl.uniform1f(loc.uSizeK, (pal.light ? 0.0195 : 0.0225) * sizeK);
    gl.uniform1f(loc.uAlphaK, (pal.light ? 1.5 : 0.8) * (narrow && !stage ? 0.6 : 1)); // dark: ~25% less luminous than before (calm dark)
    gl.uniform1f(loc.uScanA, rm ? 0 : SCAN[fromIdx]);
    gl.uniform1f(loc.uScanB, rm ? 0 : SCAN[toIdx]);
    gl.uniform1f(loc.uMouseS, mouseS);
    gl.uniform1f(loc.uDist, dist);
    gl.uniform2f(loc.uMouse, mouseNdc[0], mouseNdc[1]);
    gl.uniform3fv(loc.uC0, pal.c0);
    gl.uniform3fv(loc.uC1, pal.c1);
    gl.uniform3fv(loc.uC2, pal.c2);
    gl.uniform1f(loc.uLight, pal.light ? 1 : 0);
    gl.uniform4f(loc.uKeep, kx0, kx1, ky0, ky1);
    gl.uniform3f(loc.uKeepF, kfx, kfy, floorA);
    for (i = 0; i < 3; i++) {
      var sh = shocks[i];
      shockU[i * 4] = sh ? sh.x : 0; shockU[i * 4 + 1] = sh ? sh.y : 0; shockU[i * 4 + 2] = sh ? sh.t : 0; shockU[i * 4 + 3] = sh ? 1 : 0;
    }
    gl.uniform4fv(loc.uShock, shockU);

    var a = bufs[fromIdx], b = bufs[toIdx];
    if (!a || !b) return true;
    gl.bindBuffer(gl.ARRAY_BUFFER, a.P); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, a.M); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.P); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.M); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufR); gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, N);
    framesDrawn++;

    /* fps + adaptive resolution: very slow frames count too (clamped, not ignored) */
    if (realDt > 0) {
      var expect = Math.max(1 / 60, minGap);
      fpsEma += (1 / realDt - fpsEma) * 0.06;
      if (framesDrawn > 20 && !rm) {
        if (realDt > Math.max(1 / 26, expect * 1.5)) slowT += realDt;
        else slowT = Math.max(0, slowT - realDt * 2);
        if (slowT > 2.4 && dprSteps < 4) {
          slowT = 0; dprSteps++;
          dprCap = Math.max(0.6, Math.min(dpr, dprCap) - 0.4);
          fpsEma = 40;
          relayoutPending = true;
        }
      }
    }
    if (t - lastTel > 0.1) { lastTel = t; pushTelemetry(false); }
    return true;
  }

  function startLoop() {
    if (running || !gl) return;
    running = true;
    lastT = 0;
    if (!rafId) rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* --------------------------------------------------------- interaction */
  var drag = null;
  var lastMove = { x: 0, y: 0, t: 0 };

  function heroHit(y) {
    if (!heroEl) return false;
    var r = heroEl.getBoundingClientRect();
    return y >= r.top && y <= r.bottom;
  }
  // true when the press lands on actual glyphs of the hero copy: that gesture belongs to text selection
  function overCopyText(e) {
    var tg = e.target;
    if (!tg || !tg.closest || !tg.closest('.hero__copy')) return false;
    try {
      var rg = document.createRange();
      rg.selectNodeContents(tg);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) {
        var r = rs[i];
        if (e.clientX >= r.left - 3 && e.clientX <= r.right + 3 && e.clientY >= r.top - 3 && e.clientY <= r.bottom + 3) return true;
      }
    } catch (er) { /* ignore */ }
    return false;
  }
  function onPointerDown(e) {
    if (!gl) return;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    var tg = e.target;
    if (tg && tg.closest && tg.closest(INTERACTIVE)) return;
    if (e.pointerType === 'mouse' && overCopyText(e)) return;
    if (!heroHit(e.clientY)) return;
    drag = { id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, t0: performance.now(), mode: 'pending' };
    lastMove.x = e.clientX; lastMove.y = e.clientY; lastMove.t = performance.now();
  }
  function onPointerMove(e) {
    if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
      var w = window.innerWidth, h = window.innerHeight;
      mx = (e.clientX / w) * 2 - 1;
      my = (e.clientY / h) * 2 - 1;
      mouseNdc[0] = mx;
      mouseNdc[1] = -my;
      if (!mouseSeen) { mxs = mx; mys = my; mouseSeen = true; }
      mouseTarget = S.coarse ? 0 : 1;
      lastPointerT = performance.now();
      wake();
    }
    if (!drag || e.pointerId !== drag.id) return;
    var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (drag.mode === 'pending') {
      var need = drag.type === 'touch' ? 8 : 3;
      if (Math.abs(dx) < need && Math.abs(dy) < need) return;
      if (drag.type === 'touch' && Math.abs(dy) > Math.abs(dx) * 0.9) { drag = null; return; } // vertical = scroll
      drag.mode = 'orbit';
      root.classList.add('is-orbiting');
      vyaw = vpitch = 0;
    }
    if (drag.mode === 'orbit') {
      var now = performance.now(), ddx = e.clientX - lastMove.x, ddy = e.clientY - lastMove.y;
      var dts = Math.max(0.008, (now - lastMove.t) / 1000);
      var yv = (-ddx * 0.0055) / dts, pv = (ddy * 0.0042) / dts;
      vyaw += (clamp(yv, -3.2, 3.2) - vyaw) * 0.4;
      vpitch += (clamp(pv, -1.6, 1.6) - vpitch) * 0.4;
      yaw += -ddx * 0.0055;
      pitch += ddy * 0.0042;
      lastMove.x = e.clientX; lastMove.y = e.clientY; lastMove.t = now;
      wake();
      if (e.cancelable && drag.type !== 'touch') e.preventDefault();
    }
  }
  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    root.classList.remove('is-orbiting');
    if (d.mode === 'pending' && e.type === 'pointerup' && performance.now() - d.t0 < 500) {
      addShock(e.clientX, e.clientY);
    } else if (d.mode === 'orbit') {
      if (performance.now() - lastMove.t > 90) { vyaw = vpitch = 0; } // paused before release: no fling
    }
    wake();
  }
  function addShock(x, y) {
    if (!gl) return;
    var nx = (x / window.innerWidth) * 2 - 1, ny = -((y / window.innerHeight) * 2 - 1);
    shocks.push({ x: nx, y: ny, t: 0 });
    if (shocks.length > 3) shocks.shift();
    wake();
  }
  function onKey(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.key.length !== 1) return;
    if (S.shortcuts && !S.shortcuts.enabled()) return; // WCAG 2.1.4: single-key shortcuts are switchable
    var tg = e.target;
    if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
    if (root.classList.contains('is-locked')) return;
    if (S.palette && typeof S.palette.isOpen === 'function' && S.palette.isOpen()) return;
    var n = '1234'.indexOf(e.key);
    if (n < 0) return;
    var r = heroEl && heroEl.getBoundingClientRect(), vh = window.innerHeight;
    if (!r || r.bottom < vh * 0.4 || r.top > vh * 0.6) return;
    setScene(IDS[n], { pin: true });
  }
  function onScroll() {
    scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    wake();
  }

  function observeSections() {
    if (!('IntersectionObserver' in window)) return;
    var map = D.sceneBySection || {};
    var io = new IntersectionObserver(
      function (entries) {
        var pick = null, dom = null;
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var sec = en.target.getAttribute('data-section');
          dom = sec;
          if (map[sec]) pick = map[sec];
        });
        // a pinned (manual) scene holds until the dominant section changes; then the mapper takes over again
        if (pinnedSec && dom && dom !== pinnedSec) pinnedSec = null;
        if (pick && !pinnedSec) setScene(pick);
      },
      { rootMargin: '-46% 0px -50% 0px', threshold: 0 }
    );
    S.qsa('[data-section]').forEach(function (el) { io.observe(el); });
    if (heroEl) {
      new IntersectionObserver(
        function (entries) {
          heroVisible = entries[entries.length - 1].isIntersecting;
          wake();
        },
        { threshold: [0, 0.02] }
      ).observe(heroEl);
    }
  }

  /* ---------------------------------------------------------------- init */
  // Cheap, synchronous part: DOM refs, listeners, stage measurement. The heavy part (context,
  // 70k-point generation, shader compile) runs after first paint so the page never freezes on it.
  function init() {
    canvas = document.getElementById('gl');
    heroEl = document.getElementById('hero');
    if (!canvas) { console.warn('[hero-gl] #gl canvas missing'); return; }

    var small = window.innerWidth < 700 || S.coarse;
    N = small ? 28000 : 70000;
    dprCap = small ? 1.5 : 2;
    readTheme();
    scrollY = window.pageYOffset || 0;
    canvas.style.opacity = '0'; // faded in on the first frame

    S.on('themechange', readTheme);
    S.on('motionchange', function (rm) {
      if (rm) { time = 4; morph = 1; morphing = false; fromIdx = toIdx = wanted; train = 1; training = false; }
      wake();
    });
    S.on('langchange', scheduleStage);
    window.addEventListener('scroll', onScroll, { passive: true });
    var rz = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(rz);
      rz = requestAnimationFrame(function () {
        // resizing clears the canvas: while the loop is running, let step() resize right before it draws
        if (gl && running && !ctxLost) { relayoutPending = true; wake(); }
        else layout();
      });
    }, { passive: true });
    window.addEventListener('load', scheduleStage);
    // the copy / HUD rise in with a translate: re-measure once they have settled (rects include transforms)
    if (heroEl) heroEl.addEventListener('animationend', function (e) { if (e.animationName === 'hero-rise') scheduleStage(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleStage);
    if (window.ResizeObserver && heroEl) {
      var inner = heroEl.querySelector('.hero__inner');
      if (inner) new ResizeObserver(scheduleStage).observe(inner); // HUD fills in after init
    }
    document.addEventListener('keydown', onKey);
    observeSections();
    bindPointer();
    layout();

    var go = function () { setTimeout(boot, 0); };
    if (window.requestAnimationFrame) requestAnimationFrame(go); else go();
  }

  function boot() {
    if (gl || hero.status === 'none') return;
    var ctx = null;
    try {
      // powerPreference 'default': a decorative backdrop must not wake the discrete GPU (the resolution governor scales the load)
      var attrs = { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'default', preserveDrawingBuffer: false };
      ctx = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
    } catch (e) { ctx = null; }
    if (!ctx) { fallback('WebGL unavailable'); return; }
    gl = ctx;
    hero.isWebGL = true;

    try {
      rArr = genRandAttr();
      scenes[0] = GENS[0](N, mulberry32(0x9e3779b1));
      setupGL();
    } catch (err) {
      fallback(String(err && err.message ? err.message : err));
      return;
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      ctxLost = true;
      stopLoop();
      // if the browser never restores the context, degrade to the CSS backdrop instead of a blank canvas
      clearTimeout(lostTimer);
      lostTimer = setTimeout(function () {
        if (ctxLost) fallback('context lost');
      }, 3000);
    });
    canvas.addEventListener('webglcontextrestored', function () {
      clearTimeout(lostTimer);
      try {
        setupGL();
        ctxLost = false;
        startLoop();
        wake();
      } catch (err) {
        fallback(String(err && err.message ? err.message : err));
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (!gl) return;
      if (document.hidden) stopLoop();
      else if (!ctxLost) { startLoop(); wake(); }
    });

    layout();
    setStatus('gl');
    startTraining();
    startLoop();

    // build the remaining scenes off the critical path
    var q = [1, 2, 3];
    (function next() {
      if (!q.length || !gl) return;
      var i = q.shift();
      try { ensureScene(i); } catch (er) { /* generated on demand later */ }
      var cb = window.requestIdleCallback || function (f) { return setTimeout(f, 120); };
      cb(next, { timeout: 1500 });
    })();
  }

  var pointerBound = false;
  function bindPointer() {
    if (pointerBound) return;
    pointerBound = true;
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    document.documentElement.addEventListener('mouseleave', function () { mouseTarget = 0; });
    document.documentElement.addEventListener('mouseenter', function () { mouseTarget = S.coarse ? 0 : 1; });
  }

  S.register('hero-gl', init);
})();
