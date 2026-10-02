/* ==========================================================================
   teasers.js — lightweight procedural paper illustrations (Canvas2D, no WebGL).

   Site.teasers.mount(canvas, sceneId, opts?) -> { destroy(), redraw(), boost(on) }
     sceneId : 'spacetime' | 'splat'   (unknown ids fall back to 'splat')
     opts    : { seed?: number, staticT?: number }

   • DPR-aware (capped), resized with ResizeObserver.
   • One shared requestAnimationFrame loop for every mounted canvas, throttled to
     ~30 fps, and only ticking canvases that are on screen (IntersectionObserver).
   • Reduced motion → a single static frame; colors are re-read on theme change.
   • Colors come from the CSS tokens (--accent, --accent-2, --accent-3, --text, --bg-*). Dark theme is calm: the soft
     accent plus neutral near-white only (no violet / amber) at about 78 % brightness; light keeps its token hues.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.Site;
  if (!S) {
    if (window.console) console.warn('[teasers] window.Site is missing');
    return;
  }

  var PI = Math.PI,
    TAU = PI * 2,
    sin = Math.sin,
    cos = Math.cos,
    sqrt = Math.sqrt,
    exp = Math.exp,
    pow = Math.pow,
    floor = Math.floor;

  /* ------------------------------------------------------------- utilities */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var x = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      x ^= s.charCodeAt(i);
      x = Math.imul(x, 16777619);
    }
    return x >>> 0;
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function frac(x) {
    return x - floor(x);
  }
  function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  var dim = 1; // overall brightness of the drawing (< 1 in the calm dark theme); set by readPalette()
  function rgba(c, a, full) {
    if (!full) a *= dim;
    return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')';
  }
  function rgb(c) {
    return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  }

  /* --------------------------------------------------------------- palette */
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim();
    var m = /^#([0-9a-f]{3,8})$/i.exec(str);
    if (m) {
      var hx = m[1];
      if (hx.length === 3 || hx.length === 4) hx = hx.replace(/./g, '$&$&');
      return [parseInt(hx.slice(0, 2), 16), parseInt(hx.slice(2, 4), 16), parseInt(hx.slice(4, 6), 16)];
    }
    m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(str);
    if (m) return [+m[1], +m[2], +m[3]];
    return null;
  }
  function triplet(str, fb) {
    var p = String(str || '')
      .split(',')
      .map(function (x) {
        return parseFloat(x);
      });
    return p.length >= 3 && p.every(isFinite) ? p.slice(0, 3) : fb;
  }

  var palVer = 0;
  var pal = null;
  var sprites = null;
  var SN = 9; // number of accent -> accent-2 sprites

  function readPalette() {
    var cs = window.getComputedStyle(document.documentElement);
    var g = function (n) {
      return cs.getPropertyValue(n);
    };
    var bg = parseColor(g('--bg')) || [6, 8, 12];
    var lum = (0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2]) / 255;
    var mono = String(g('--font-mono') || '').trim();
    var dark = lum < 0.5;
    var a = triplet(g('--accent-rgb'), [117, 188, 209]);
    var b = triplet(g('--accent-2-rgb'), [173, 162, 226]);
    var c = triplet(g('--accent-3-rgb'), [207, 168, 110]);
    if (dark) {
      /* calm dark: accent + neutral only. The second gradient stop and the moving object become cool near-white. */
      var ink = parseColor(g('--text')) || [233, 239, 248];
      b = mix(ink, a, 0.22);
      c = mix(ink, a, 0.08);
    }
    dim = dark ? 0.78 : 1;
    return {
      ver: ++palVer,
      dark: dark,
      a: a,
      b: b,
      c: c,
      bg0: parseColor(g('--bg-elev')) || bg,
      bg1: parseColor(g('--bg-sunk')) || bg,
      line: parseColor(g('--line-strong')) || [150, 185, 230],
      text3: parseColor(g('--text-3')) || [115, 133, 160],
      mono: mono || 'ui-monospace, Menlo, monospace',
    };
  }

  function makeSprite(c) {
    var size = 64;
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    var x = cv.getContext('2d');
    var gr = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    var stops = [0, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 1];
    for (var i = 0; i < stops.length; i++) {
      var r = stops[i];
      gr.addColorStop(r, rgba(c, r === 1 ? 0 : exp(-4.2 * r * r)));
    }
    x.fillStyle = gr;
    x.fillRect(0, 0, size, size);
    return cv;
  }

  function getPal() {
    if (!pal) {
      pal = readPalette();
      sprites = null;
    }
    return pal;
  }
  function getSprites() {
    var p = getPal();
    if (!sprites || sprites.ver !== p.ver) {
      var list = [];
      for (var i = 0; i < SN; i++) list.push(makeSprite(mix(p.a, p.b, i / (SN - 1))));
      sprites = { ver: p.ver, list: list, hot: makeSprite(p.c) };
    }
    return sprites;
  }

  function paintBg(ctx, w, h, p, gx, gy, rad) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, rgb(p.bg0));
    g.addColorStop(1, rgb(p.bg1));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var r = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
    r.addColorStop(0, rgba(p.a, p.dark ? 0.16 : 0.1));
    r.addColorStop(1, rgba(p.a, 0));
    ctx.fillStyle = r;
    ctx.fillRect(0, 0, w, h);
    var r2 = ctx.createRadialGradient(w * 0.88, h * 0.12, 0, w * 0.88, h * 0.12, rad * 0.8);
    r2.addColorStop(0, rgba(p.b, p.dark ? 0.05 : 0.08));
    r2.addColorStop(1, rgba(p.b, 0));
    ctx.fillStyle = r2;
    ctx.fillRect(0, 0, w, h);
  }

  function telemetry(ctx, w, p, text) {
    if (w < 260) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.font = '500 10px ' + p.mono;
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = rgba(p.text3, 0.95, true);
    ctx.fillText(text, 26, 28);
  }

  /* ========================================================================
     Scene: spacetime — a dynamic scene, drawn as time-colored point tracks
     over a perspective ground grid, with a highlighted object moving through it.
     ======================================================================== */
  var scenes = {};

  scenes.spacetime = function (rnd) {
    var L = 7.6; // length of the sweep along a track
    var GN = 17; // grid nodes per side (spacing 0.5 -> +-4)
    var NP = 30; // tracked points
    var TR = 11; // trail segments
    var DT = 0.16; // seconds between trail samples
    var B = 5; // grid alpha buckets

    var pts = [];
    for (var i = 0; i < NP; i++) {
      pts.push({
        dir: rnd() < 0.5 ? -1 : 1,
        off: rnd(),
        sp: 0.05 + rnd() * 0.05,
        y0: 0.25 + rnd() * 1.55,
        z0: (rnd() - 0.5) * 5.0,
        r: 0.12 + rnd() * 0.38,
        k: 2.0 + rnd() * 2.6,
        ph: rnd() * TAU,
        sz: 0.8 + rnd() * 0.9,
      });
    }

    var gsx = new Float32Array(GN * GN);
    var gsy = new Float32Array(GN * GN);
    var gal = new Float32Array(GN * GN);
    var gxw = new Float32Array(GN);
    for (var q = 0; q < GN; q++) gxw[q] = -4 + q * 0.5;
    var segs = [];
    for (var b = 0; b < B; b++) segs.push([]);

    var cam = { px: 0, py: 0, pz: 0, rx: 0, ry: 0, rz: 0, ux: 0, uy: 0, uz: 0, fx: 0, fy: 0, fz: 0, F: 1, cx: 0, cy: 0 };
    var out = [0, 0, 0, 0];
    var obj = { x: 0, y: 0, z: 0 };

    var CUBE = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
    ];
    var EDGES = [
      [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
    ];
    var cpx = new Float32Array(8);
    var cpy = new Float32Array(8);

    function setCam(t, w, h) {
      var a = 0.5 * sin(t * 0.11) + 0.35;
      var R = 5.9;
      cam.px = R * sin(a);
      cam.py = 2.55;
      cam.pz = -R * cos(a);
      var fx = -cam.px,
        fy = 0.6 - cam.py,
        fz = -cam.pz;
      var fl = sqrt(fx * fx + fy * fy + fz * fz);
      fx /= fl;
      fy /= fl;
      fz /= fl;
      var rl = sqrt(fz * fz + fx * fx) || 1;
      cam.rx = fz / rl;
      cam.ry = 0;
      cam.rz = -fx / rl;
      cam.ux = fy * cam.rz - fz * cam.ry;
      cam.uy = fz * cam.rx - fx * cam.rz;
      cam.uz = fx * cam.ry - fy * cam.rx;
      cam.fx = fx;
      cam.fy = fy;
      cam.fz = fz;
      cam.F = h * 1.12;
      cam.cx = w / 2;
      cam.cy = h * 0.52;
    }
    function proj(x, y, z) {
      var vx = x - cam.px,
        vy = y - cam.py,
        vz = z - cam.pz;
      var d = vx * cam.fx + vy * cam.fy + vz * cam.fz;
      if (d < 0.2) d = 0.2;
      var k = cam.F / d;
      out[0] = cam.cx + (vx * cam.rx + vy * cam.ry + vz * cam.rz) * k;
      out[1] = cam.cy - (vx * cam.ux + vy * cam.uy + vz * cam.uz) * k;
      out[2] = d;
      out[3] = k;
    }
    function objAt(t, o) {
      o.x = 2.4 * sin(t * 0.37 + 0.4);
      o.z = 1.7 * sin(t * 0.53 + 1.2);
      o.y = 0.62 + 0.16 * sin(t * 1.7);
    }

    function draw(ctx, w, h, t, p, spr) {
      paintBg(ctx, w, h, p, w * 0.5, h * 0.62, Math.max(w, h) * 0.7);
      setCam(t, w, h);
      objAt(t, obj);
      var dark = p.dark;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      /* ground grid (with a ripple traveling out from the moving object) */
      var gi, gj, x, z, d, idx, wave;
      for (gj = 0; gj < GN; gj++) {
        z = gxw[gj];
        for (gi = 0; gi < GN; gi++) {
          x = gxw[gi];
          d = sqrt((x - obj.x) * (x - obj.x) + (z - obj.z) * (z - obj.z));
          wave = 0.1 * sin(d * 3.0 - t * 2.4) * exp(-d * 0.5);
          proj(x, wave, z);
          idx = gj * GN + gi;
          gsx[idx] = out[0];
          gsy[idx] = out[1];
          var rr = sqrt(x * x + z * z) / 5;
          gal[idx] = rr >= 1 ? 0 : pow(1 - rr, 1.25);
        }
      }
      for (var bb = 0; bb < B; bb++) segs[bb].length = 0;
      var a0, a1, al, bk, s0, s1;
      for (gi = 0; gi < GN; gi += 2) {
        for (gj = 0; gj < GN - 1; gj++) {
          s0 = gj * GN + gi;
          s1 = (gj + 1) * GN + gi;
          al = (gal[s0] + gal[s1]) * 0.5;
          if (al < 0.02) continue;
          bk = Math.min(B - 1, (al * B) | 0);
          segs[bk].push(gsx[s0], gsy[s0], gsx[s1], gsy[s1]);
        }
      }
      for (gj = 0; gj < GN; gj += 2) {
        for (gi = 0; gi < GN - 1; gi++) {
          s0 = gj * GN + gi;
          s1 = gj * GN + gi + 1;
          al = (gal[s0] + gal[s1]) * 0.5;
          if (al < 0.02) continue;
          bk = Math.min(B - 1, (al * B) | 0);
          segs[bk].push(gsx[s0], gsy[s0], gsx[s1], gsy[s1]);
        }
      }
      var gc = mix(p.line, p.a, dark ? 0.5 : 0.35);
      ctx.lineWidth = 1;
      for (bb = 0; bb < B; bb++) {
        var arr = segs[bb];
        if (!arr.length) continue;
        ctx.strokeStyle = rgba(gc, (dark ? 0.62 : 0.5) * ((bb + 0.6) / B));
        ctx.beginPath();
        for (var k = 0; k < arr.length; k += 4) {
          ctx.moveTo(arr[k], arr[k + 1]);
          ctx.lineTo(arr[k + 2], arr[k + 3]);
        }
        ctx.stroke();
      }

      /* time-colored point tracks with fading motion trails */
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (var pi = 0; pi < NP; pi++) {
        var P = pts[pi];
        var qh = frac(P.off + P.sp * t);
        var env = pow(sin(PI * qh), 0.55);
        if (env < 0.03) continue;
        var px = 0,
          py = 0,
          prevq = 2,
          hx0 = 0,
          hy0 = 0,
          hk = 1;
        for (var j = 0; j <= TR; j++) {
          var qq = frac(P.off + P.sp * (t - j * DT));
          if (j > 0 && qq > prevq) break;
          prevq = qq;
          var s = (qq - 0.5) * L * P.dir;
          var hxx = P.k * qq * L + P.ph;
          proj(s, P.y0 + P.r * sin(hxx), P.z0 + P.r * cos(hxx));
          var sx = out[0],
            sy = out[1];
          if (j === 0) {
            hx0 = sx;
            hy0 = sy;
            hk = out[3];
          } else {
            var fade = pow(1 - j / (TR + 1), 1.6);
            ctx.strokeStyle = rgba(mix(p.a, p.b, qq), env * fade * 0.9);
            ctx.lineWidth = Math.max(0.5, (0.5 + 1.7 * fade) * clamp(hk / 60, 0.6, 1.3));
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(sx, sy);
            ctx.stroke();
          }
          px = sx;
          py = sy;
        }
        var hr = clamp(0.05 * P.sz * hk, 1.0, 5);
        ctx.globalAlpha = env * 0.85;
        ctx.drawImage(spr.list[Math.round(qh * (SN - 1))], hx0 - hr * 4, hy0 - hr * 4, hr * 8, hr * 8);
        ctx.globalAlpha = env;
        ctx.fillStyle = rgba(mix(p.a, p.b, qh), 1);
        ctx.beginPath();
        ctx.arc(hx0, hy0, hr * 0.55, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* the moving object (--accent-3 in light, near-white in dark): trail, ground shadow, drop line, wireframe cube */
      var ppx = 0,
        ppy = 0,
        o2 = { x: 0, y: 0, z: 0 };
      ctx.globalCompositeOperation = 'source-over';
      for (var m = 0; m <= 22; m++) {
        objAt(t - m * 0.1, o2);
        proj(o2.x, o2.y, o2.z);
        if (m > 0) {
          var f2 = pow(1 - m / 23, 1.5);
          ctx.strokeStyle = rgba(p.c, 0.7 * f2);
          ctx.lineWidth = 0.6 + 1.4 * f2;
          ctx.beginPath();
          ctx.moveTo(ppx, ppy);
          ctx.lineTo(out[0], out[1]);
          ctx.stroke();
        }
        ppx = out[0];
        ppy = out[1];
      }
      proj(obj.x, 0, obj.z);
      var shx = out[0],
        shy = out[1],
        shk = out[3];
      var sr = shk * 0.55;
      ctx.save();
      ctx.translate(shx, shy);
      ctx.scale(1, 0.34);
      ctx.globalAlpha = dark ? 0.55 : 0.4;
      ctx.drawImage(spr.hot, -sr, -sr, sr * 2, sr * 2);
      ctx.restore();
      ctx.globalAlpha = 1;

      var ry = t * 1.3,
        rx = 0.5 + 0.3 * sin(t * 0.9);
      var cy1 = cos(ry),
        sy1 = sin(ry),
        cx1 = cos(rx),
        sx1 = sin(rx);
      for (var v = 0; v < 8; v++) {
        var X = CUBE[v][0] * 0.22,
          Y = CUBE[v][1] * 0.22,
          Z = CUBE[v][2] * 0.22;
        var X1 = cy1 * X + sy1 * Z,
          Z1 = -sy1 * X + cy1 * Z;
        var Y2 = cx1 * Y - sx1 * Z1,
          Z2 = sx1 * Y + cx1 * Z1;
        proj(obj.x + X1, obj.y + Y2, obj.z + Z2);
        cpx[v] = out[0];
        cpy[v] = out[1];
      }
      proj(obj.x, obj.y, obj.z);
      var ocx = out[0],
        ocy = out[1],
        ok = out[3];
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = rgba(p.c, 0.4);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ocx, ocy);
      ctx.lineTo(shx, shy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      var gr = ok * 0.95;
      ctx.globalAlpha = dark ? 0.9 : 0.55;
      ctx.drawImage(spr.hot, ocx - gr, ocy - gr, gr * 2, gr * 2);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = rgba(p.c, 0.95);
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (var e = 0; e < EDGES.length; e++) {
        ctx.moveTo(cpx[EDGES[e][0]], cpy[EDGES[e][0]]);
        ctx.lineTo(cpx[EDGES[e][1]], cpy[EDGES[e][1]]);
      }
      ctx.stroke();

      var ph = t % 16;
      telemetry(ctx, w, p, 't = ' + (ph < 10 ? '0' : '') + ph.toFixed(2) + ' s');
      if (w >= 260) {
        var bx = 26,
          by = 36,
          bw = 64;
        var lg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
        lg.addColorStop(0, rgba(p.a, 0.9));
        lg.addColorStop(1, rgba(p.b, 0.9));
        ctx.fillStyle = lg;
        ctx.fillRect(bx, by, bw, 2);
        ctx.fillStyle = rgba(p.c, 1);
        ctx.fillRect(bx + (ph / 16) * bw - 1, by - 3, 2, 8);
      }
    }
    return { draw: draw };
  };

  /* ========================================================================
     Scene: splat — anisotropic 3D Gaussians projected to screen-space ellipses
     (the actual EWA maths: Sigma' = J W Sigma W^T J^T), depth-sorted and
     alpha-blended additively. A trefoil-knot tube, a soft floor.
     ======================================================================== */
  scenes.splat = function (rnd) {
    var GK = 170; // gaussians on the knot
    var GF = 56; // gaussians on the floor
    var N = GK + GF;
    var D = 4.6; // camera distance
    var KS = 0.34; // knot scale
    var RHO = 0.17; // tube radius

    var gx = new Float32Array(N),
      gy = new Float32Array(N),
      gz = new Float32Array(N);
    var sxx = new Float32Array(N),
      sxy = new Float32Array(N),
      sxz = new Float32Array(N),
      syy = new Float32Array(N),
      syz = new Float32Array(N),
      szz = new Float32Array(N);
    var col = new Float32Array(N),
      alp = new Float32Array(N),
      ph1 = new Float32Array(N),
      ph2 = new Float32Array(N),
      ph3 = new Float32Array(N),
      amb = new Uint8Array(N),
      flr = new Uint8Array(N);
    var zs = new Float32Array(N),
      ex = new Float32Array(N),
      ey = new Float32Array(N),
      ea = new Float32Array(N),
      eb = new Float32Array(N),
      eang = new Float32Array(N);
    var ord = [];
    for (var o = 0; o < N; o++) ord.push(o);

    function cross(a, b) {
      return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    }
    function norm(a) {
      var l = sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    }
    function setCov(i, e1, s1, e2, s2, e3, s3) {
      var a = s1 * s1,
        b = s2 * s2,
        c = s3 * s3;
      sxx[i] = a * e1[0] * e1[0] + b * e2[0] * e2[0] + c * e3[0] * e3[0];
      sxy[i] = a * e1[0] * e1[1] + b * e2[0] * e2[1] + c * e3[0] * e3[1];
      sxz[i] = a * e1[0] * e1[2] + b * e2[0] * e2[2] + c * e3[0] * e3[2];
      syy[i] = a * e1[1] * e1[1] + b * e2[1] * e2[1] + c * e3[1] * e3[1];
      syz[i] = a * e1[1] * e1[2] + b * e2[1] * e2[2] + c * e3[1] * e3[2];
      szz[i] = a * e1[2] * e1[2] + b * e2[2] * e2[2] + c * e3[2] * e3[2];
    }

    var LIGHT = norm([0.4, 0.8, -0.5]);
    for (var i = 0; i < GK; i++) {
      var u = ((i + rnd() * 0.9) / GK) * TAU;
      var C = [
        (sin(u) + 2 * sin(2 * u)) * KS,
        (cos(u) - 2 * cos(2 * u)) * KS,
        -sin(3 * u) * KS,
      ];
      var T = norm([cos(u) + 4 * cos(2 * u), -sin(u) + 4 * sin(2 * u), -3 * cos(3 * u)]);
      var ref = Math.abs(T[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
      var N0 = norm(cross(T, ref));
      var B0 = cross(T, N0);
      var v = rnd() * TAU;
      var nrm = [cos(v) * N0[0] + sin(v) * B0[0], cos(v) * N0[1] + sin(v) * B0[1], cos(v) * N0[2] + sin(v) * B0[2]];
      gx[i] = C[0] + RHO * nrm[0];
      gy[i] = C[1] + RHO * nrm[1];
      gz[i] = C[2] + RHO * nrm[2];
      var W = norm(cross(nrm, T));
      setCov(i, T, 0.072 + rnd() * 0.045, W, 0.05 + rnd() * 0.035, nrm, 0.014);
      col[i] = clamp(0.5 + 0.5 * sin(u + 0.6), 0, 1);
      var lit = Math.max(0, nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]);
      alp[i] = 0.3 + 0.32 * lit + rnd() * 0.08;
      amb[i] = rnd() < 0.06 ? 1 : 0;
      ph1[i] = rnd() * TAU;
      ph2[i] = rnd() * TAU;
      ph3[i] = rnd() * TAU;
    }
    for (var f = 0; f < GF; f++) {
      var j = GK + f;
      var rad = 2.7 * sqrt(rnd());
      var th = rnd() * TAU;
      gx[j] = rad * cos(th);
      gy[j] = -1.05 + (rnd() - 0.5) * 0.03;
      gz[j] = rad * sin(th);
      var ang = rnd() * TAU;
      setCov(j, [cos(ang), 0, sin(ang)], 0.16 + rnd() * 0.16, [-sin(ang), 0, cos(ang)], 0.1 + rnd() * 0.1, [0, 1, 0], 0.012);
      col[j] = 0.8 + rnd() * 0.2;
      alp[j] = 0.14 + rnd() * 0.12;
      ph1[j] = rnd() * TAU;
      ph2[j] = rnd() * TAU;
      ph3[j] = rnd() * TAU;
      flr[j] = 1;
    }

    var T9 = new Float64Array(9);

    function draw(ctx, w, h, t, p, spr, dpr) {
      paintBg(ctx, w, h, p, w * 0.5, h * 0.5, Math.max(w, h) * 0.6);
      var yaw = t * 0.22 + 0.4;
      var pitch = 0.3 + 0.05 * sin(t * 0.17);
      var c = cos(yaw),
        s = sin(yaw),
        cp = cos(pitch),
        sp = sin(pitch);
      var m00 = c, m01 = 0, m02 = s;
      var m10 = -sp * s, m11 = cp, m12 = sp * c;
      var m20 = -cp * s, m21 = -sp, m22 = cp * c;
      var F = h * 1.5;
      var cxs = w / 2,
        cys = h * 0.5;
      var dark = p.dark;

      var i;
      for (i = 0; i < N; i++) {
        var dr = flr[i] ? 0 : 0.03;
        var X = gx[i] + dr * sin(t * 0.7 + ph1[i]);
        var Y = gy[i] + dr * sin(t * 0.6 + ph2[i]);
        var Z = gz[i] + dr * sin(t * 0.5 + ph3[i]);
        var x = m00 * X + m01 * Y + m02 * Z;
        var y = m10 * X + m11 * Y + m12 * Z;
        var z = m20 * X + m21 * Y + m22 * Z + D;
        if (z < 1.2) {
          zs[i] = -1;
          continue;
        }
        zs[i] = z;
        /* T = M * Sigma */
        var a0 = sxx[i], a1 = sxy[i], a2 = sxz[i], a3 = syy[i], a4 = syz[i], a5 = szz[i];
        T9[0] = m00 * a0 + m01 * a1 + m02 * a2;
        T9[1] = m00 * a1 + m01 * a3 + m02 * a4;
        T9[2] = m00 * a2 + m01 * a4 + m02 * a5;
        T9[3] = m10 * a0 + m11 * a1 + m12 * a2;
        T9[4] = m10 * a1 + m11 * a3 + m12 * a4;
        T9[5] = m10 * a2 + m11 * a4 + m12 * a5;
        T9[6] = m20 * a0 + m21 * a1 + m22 * a2;
        T9[7] = m20 * a1 + m21 * a3 + m22 * a4;
        T9[8] = m20 * a2 + m21 * a4 + m22 * a5;
        /* C = T * M^T  (symmetric: need xx xy xz yy yz zz) */
        var Cxx = T9[0] * m00 + T9[1] * m01 + T9[2] * m02;
        var Cxy = T9[0] * m10 + T9[1] * m11 + T9[2] * m12;
        var Cxz = T9[0] * m20 + T9[1] * m21 + T9[2] * m22;
        var Cyy = T9[3] * m10 + T9[4] * m11 + T9[5] * m12;
        var Cyz = T9[3] * m20 + T9[4] * m21 + T9[5] * m22;
        var Czz = T9[6] * m20 + T9[7] * m21 + T9[8] * m22;
        /* perspective Jacobian (screen y is flipped) */
        var j00 = F / z,
          j02 = (-F * x) / (z * z),
          j11 = -F / z,
          j12 = (F * y) / (z * z);
        var ca = j00 * j00 * Cxx + 2 * j00 * j02 * Cxz + j02 * j02 * Czz + 0.5;
        var cb = j00 * j11 * Cxy + j00 * j12 * Cxz + j02 * j11 * Cyz + j02 * j12 * Czz;
        var cc = j11 * j11 * Cyy + 2 * j11 * j12 * Cyz + j12 * j12 * Czz + 0.5;
        var mid = (ca + cc) * 0.5,
          dd = sqrt(((ca - cc) * 0.5) * ((ca - cc) * 0.5) + cb * cb);
        var l1 = mid + dd,
          l2 = Math.max(mid - dd, 0.0001);
        var pulse = 1 + 0.12 * sin(t * 1.1 + ph1[i]);
        ex[i] = cxs + (F * x) / z;
        ey[i] = cys - (F * y) / z;
        ea[i] = Math.min(sqrt(l1) * pulse, 90);
        eb[i] = Math.min(sqrt(l2) * pulse, 90);
        eang[i] = 0.5 * Math.atan2(2 * cb, ca - cc);
      }

      ord.sort(function (a, b) {
        return zs[b] - zs[a];
      });

      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      var k = 0.5 * (dark ? 1 : 0.9);
      for (var oi = 0; oi < N; oi++) {
        i = ord[oi];
        if (zs[i] < 0) continue;
        var sx = ex[i],
          sy = ey[i];
        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;
        var cue = clamp((6.4 - zs[i]) / 2.6, 0.35, 1);
        var al = alp[i] * cue * (0.88 + 0.12 * sin(t * 1.3 + ph2[i])) * k * 1.9;
        if (al < 0.01) continue;
        var ang2 = eang[i],
          ca2 = cos(ang2),
          sa2 = sin(ang2);
        var r1 = 3 * ea[i],
          r2 = 3 * eb[i];
        ctx.setTransform(r1 * ca2 * dpr, r1 * sa2 * dpr, -r2 * sa2 * dpr, r2 * ca2 * dpr, sx * dpr, sy * dpr);
        ctx.globalAlpha = al > 1 ? 1 : al;
        ctx.drawImage(amb[i] ? spr.hot : spr.list[Math.round(col[i] * (SN - 1))], -1, -1, 2, 2);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      telemetry(ctx, w, p, 'N = ' + N + ' gaussians');
    }
    return { draw: draw };
  };

  /* ========================================================================
     Instance manager — one shared rAF loop, 30 fps, offscreen instances idle
     ======================================================================== */
  var instances = [];
  var raf = 0;
  var lastTick = 0;

  function animating(inst) {
    return inst.visible && !S.reducedMotion;
  }
  function anyAnimating() {
    for (var i = 0; i < instances.length; i++) if (animating(instances[i])) return true;
    return false;
  }
  function loop(now) {
    raf = 0;
    if (document.hidden || !anyAnimating()) return;
    raf = window.requestAnimationFrame(loop);
    if (now - lastTick < 30) return;
    lastTick = now;
    for (var i = 0; i < instances.length; i++) {
      var inst = instances[i];
      if (animating(inst)) inst.frame(now);
    }
  }
  function kick() {
    if (!raf && !document.hidden && anyAnimating()) raf = window.requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    instances.forEach(function (i) {
      i.lastNow = 0;
    });
    kick();
  });
  S.on('themechange', function () {
    pal = null;
    sprites = null;
    instances.forEach(function (i) {
      if (i.visible) i.redraw(); // off-screen canvases are drawn when the observer reports them in view
    });
  });
  S.on('motionchange', function () {
    instances.forEach(function (i) {
      i.lastNow = 0;
      if (i.visible) i.redraw();
    });
    kick();
  });

  var noop = { destroy: function () {}, redraw: function () {}, boost: function () {} };

  function mount(canvas, sceneId, opts) {
    opts = opts || {};
    if (!canvas || !canvas.getContext) return noop;
    var ctx = canvas.getContext('2d');
    if (!ctx) return noop;
    var factory = scenes[sceneId] || scenes.splat;
    var seed = opts.seed != null ? opts.seed >>> 0 : hash(sceneId);
    var r = rng(seed ^ 0x9e3779b9);
    var scene = factory(rng(seed));

    var inst = {
      w: 0,
      h: 0,
      dpr: 1,
      visible: typeof IntersectionObserver !== 'function',
      t: 1 + r() * 20,
      tStatic: opts.staticT != null ? opts.staticT : 6.2 + r() * 1.5,
      boostV: 0,
      boostTarget: 0,
      lastNow: 0,
      dead: false,
    };

    function draw() {
      if (inst.dead || inst.w < 2 || inst.h < 2) return;
      try {
        ctx.setTransform(inst.dpr, 0, 0, inst.dpr, 0, 0);
        scene.draw(ctx, inst.w, inst.h, S.reducedMotion ? inst.tStatic : inst.t, getPal(), getSprites(), inst.dpr);
      } catch (e) {
        inst.dead = true;
        if (window.console) console.warn('[teasers] draw failed', e);
      }
    }
    inst.redraw = draw;
    inst.frame = function (now) {
      var dt = inst.lastNow ? Math.min(0.1, (now - inst.lastNow) / 1000) : 0;
      inst.lastNow = now;
      inst.boostV += (inst.boostTarget - inst.boostV) * Math.min(1, dt * 4);
      inst.t += dt * (1 + inst.boostV * 1.2);
      draw();
    };

    function resize() {
      var w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (w < 2 || h < 2) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var bw = Math.round(w * dpr),
        bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
      inst.w = w;
      inst.h = h;
      inst.dpr = dpr;
      if (inst.visible) draw(); // off-screen: the IntersectionObserver callback draws on arrival
    }

    var ro = null,
      io = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener('resize', resize);
    }
    if (typeof IntersectionObserver === 'function') {
      io = new IntersectionObserver(
        function (entries) {
          var en = entries[entries.length - 1];
          inst.visible = !!en.isIntersecting;
          inst.lastNow = 0;
          if (inst.visible) {
            draw();
            kick();
          }
        },
        { rootMargin: '80px' }
      );
      io.observe(canvas);
    }

    instances.push(inst);
    resize();
    kick();

    return {
      destroy: function () {
        inst.dead = true;
        if (ro) ro.disconnect();
        else window.removeEventListener('resize', resize);
        if (io) io.disconnect();
        var i = instances.indexOf(inst);
        if (i >= 0) instances.splice(i, 1);
      },
      redraw: draw,
      boost: function (on) {
        inst.boostTarget = on ? 1 : 0;
        kick();
      },
    };
  }

  S.teasers = { mount: mount, scenes: Object.keys(scenes) };
})();
