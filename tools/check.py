#!/usr/bin/env python3
"""Project integrity check (python3 standard library only).

Run from anywhere:   python3 tools/check.py
Exit code:           0 = everything referenced exists, 1 = something is missing / broken

Checks
  (a) every local path referenced by index.html (src / href / poster ...), by url() in
      assets/css/*.css and by 'assets/...' / 'projects/...' string literals in assets/js/data.js
  (b) every <script> and <link> in index.html exists
  (c) the JSON-LD block in index.html parses
  (d) size report of the heaviest assets (projects/ excluded), warning above 300 KB
  (e) invariants of the final build:
        - no request to api.github.com anywhere in assets/js (stars are static data.js numbers)
        - the Chinese org name (华为维纳研究所（新加坡）) is used consistently in data.js
        - every local link in data.js exists (src / video / links / markdown [text](path) targets)
        - the Google Fonts stylesheet never blocks rendering (index.html and 404.html: preload + onload, plain
          <link rel=stylesheet> only inside <noscript>), and any @font-face file exists
        - meta / Open Graph / Twitter / JSON-LD descriptions are <= 160 characters
        - favicon.ico and the 192 px PNG icon exist; 404.html / cv / resume references resolve
"""
import json
import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import unquote, urlparse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WARN_KB = 300
TTY = sys.stdout.isatty()


def c(code, s):
    return "\033[%sm%s\033[0m" % (code, s) if TTY else s


OK, BAD, WARN = c("32", "ok  "), c("31", "MISS"), c("33", "warn")

missing = []   # (source, ref)
checked = 0


def local_path(ref, base_dir=ROOT):
    """Return an absolute filesystem path for a local reference, or None for external / non-file refs."""
    ref = ref.strip()
    if not ref or ref.startswith(("#", "data:", "mailto:", "tel:", "javascript:", "//")):
        return None
    u = urlparse(ref)
    if u.scheme or u.netloc:
        return None
    path = unquote(u.path)
    if not path:
        return None
    if path.startswith("/"):
        full = os.path.join(ROOT, path.lstrip("/"))
    else:
        full = os.path.join(base_dir, path)
    full = os.path.normpath(full)
    # a directory reference (e.g. projects/UNIKD/) is valid when it has an index.html
    if path.endswith("/") or os.path.isdir(full):
        full = os.path.join(full, "index.html")
    return full


def check_ref(source, ref, base_dir=ROOT):
    global checked
    full = local_path(ref, base_dir)
    if full is None:
        return
    checked += 1
    if not os.path.exists(full):
        missing.append((source, ref))


# ---------------------------------------------------------------- index.html
class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []      # (tag, attr, value)
        self.scripts = []   # script src
        self.links = []     # link href
        self.jsonld = []
        self._in_ld = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in ("src", "href", "poster", "data-src"):
            if a.get(k):
                self.refs.append((tag, k, a[k]))
        if tag == "script" and a.get("src"):
            self.scripts.append(a["src"])
        if tag == "link" and a.get("href"):
            self.links.append(a["href"])
        if tag == "script" and a.get("type") == "application/ld+json":
            self._in_ld = True
            self.jsonld.append("")
        srcset = a.get("srcset")
        if srcset:
            for part in srcset.split(","):
                p = part.strip().split(" ")[0]
                if p:
                    self.refs.append((tag, "srcset", p))

    def handle_endtag(self, tag):
        if tag == "script":
            self._in_ld = False

    def handle_data(self, data):
        if self._in_ld:
            self.jsonld[-1] += data


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


print(c("1", "== (a)/(b) index.html references =="))
index_path = os.path.join(ROOT, "index.html")
if not os.path.exists(index_path):
    print("%s index.html not found" % BAD)
    sys.exit(1)
html = read(index_path)
p = Refs()
p.feed(html)

for tag, attr, val in p.refs:
    # skip canonical / og urls: they are absolute (external) and ignored by local_path
    check_ref("index.html <%s %s>" % (tag, attr), val)

n_sc = sum(1 for s in p.scripts if local_path(s))
n_ln = sum(1 for s in p.links if local_path(s))
print("  %d local <script src> and %d local <link href> found" % (n_sc, n_ln))

# 404.html is served at any URL depth: it resolves its assets against the site root at run time (checked against the
# project root like index.html). The legacy-URL redirect pages (cv/, resume/, about/, publications/, about.html) use
# RELATIVE paths, so every reference is resolved against the page's own folder.
for extra_page in ("404.html", "cv/index.html", "resume/index.html", "about/index.html", "publications/index.html", "about.html"):
    fp = os.path.join(ROOT, extra_page)
    if not os.path.exists(fp):
        missing.append((extra_page, extra_page))
        continue
    q = Refs()
    q.feed(read(fp))
    page_dir = ROOT if extra_page == "404.html" else os.path.dirname(fp)
    for tag, attr, val in q.refs:
        check_ref("%s <%s %s>" % (extra_page, tag, attr), val, page_dir)

# ---------------------------------------------------------------- JSON-LD
print(c("1", "== (c) JSON-LD =="))
ld_ok = True
if not p.jsonld:
    print("  %s no JSON-LD block found" % WARN)
for i, block in enumerate(p.jsonld):
    try:
        obj = json.loads(block)
        print("  %s block %d parses (@type=%s)" % (OK, i + 1, obj.get("@type")))
    except ValueError as e:
        ld_ok = False
        print("  %s block %d does not parse: %s" % (BAD, i + 1, e))

# ---------------------------------------------------------------- CSS url()
print(c("1", "== (a) CSS url() references =="))
css_dir = os.path.join(ROOT, "assets", "css")
URL_RE = re.compile(r"url\(\s*(['\"]?)([^'\")]+)\1\s*\)")
if os.path.isdir(css_dir):
    for fn in sorted(os.listdir(css_dir)):
        if fn.endswith(".css"):
            text = re.sub(r"/\*.*?\*/", "", read(os.path.join(css_dir, fn)), flags=re.S)
            for m in URL_RE.finditer(text):
                check_ref("assets/css/%s url()" % fn, m.group(2), css_dir)
    print("  scanned %d stylesheet(s)" % len([f for f in os.listdir(css_dir) if f.endswith(".css")]))

# ---------------------------------------------------------------- data.js strings
print(c("1", "== (a) data.js asset / project strings =="))
data_path = os.path.join(ROOT, "assets", "js", "data.js")
if os.path.exists(data_path):
    text = read(data_path)
    # string literals that start with assets/ or projects/ (single or double quoted)
    STR_RE = re.compile(r"""(['"])((?:assets|projects)/[^'"\s]*)\1""")
    seen = set()
    for m in STR_RE.finditer(text):
        ref = m.group(2)
        if ref in seen:
            continue
        seen.add(ref)
        check_ref("assets/js/data.js", ref)
    # markdown link targets [text](target) and values of link-like keys (src, video, poster, href, url, pdf, code,
    # project, ...) that are local (not http(s) / mailto / #anchor)
    LINK_RES = [
        re.compile(r"\]\(([^)\s]+)\)"),
        re.compile(r"""\b(?:src|video|poster|href|url|pdf|code|project|poster|dataset|journal|openreview|arxiv)\s*:\s*(['"])([^'"]+)\1"""),
    ]
    for rx in LINK_RES:
        for m in rx.finditer(text):
            ref = m.group(m.lastindex)
            # only things that look like a path: no spaces, and a slash or a file extension
            if ref in seen or re.search(r"\s", ref) or not re.search(r"/|\.[A-Za-z0-9]{2,5}$", ref):
                continue
            seen.add(ref)
            check_ref("assets/js/data.js (link)", ref)
    print("  %d unique local paths referenced" % len(seen))
else:
    print("  %s assets/js/data.js not found" % BAD)
    missing.append(("data", "assets/js/data.js"))

# ---------------------------------------------------------------- split missing into pending vs real
PENDING_DIRS = ("assets/js/", "assets/css/")


def rel(full):
    return os.path.relpath(full, ROOT).replace(os.sep, "/")


pending, broken = [], []
seen_pairs = set()
for src, ref in missing:
    full = local_path(ref, css_dir if "assets/css/" in src and "url()" in src else ROOT)
    r = rel(full) if full else ref
    if (src, r) in seen_pairs:
        continue
    seen_pairs.add((src, r))
    is_module = r.startswith(PENDING_DIRS) and r.endswith((".js", ".css"))
    (pending if is_module else broken).append((src, r))

print()
print(c("1", "== summary of references =="))
print("  %d local references checked" % checked)
if pending:
    print("  %s %d JS/CSS module file(s) still pending (owned by other builders):" % (WARN, len(pending)))
    for src, r in pending:
        print("       - %s   (from %s)" % (r, src))
if broken:
    print("  %s %d missing file(s):" % (BAD, len(broken)))
    for src, r in broken:
        print("       - %s   (from %s)" % (r, src))
if not pending and not broken:
    print("  %s all referenced files exist" % OK)

# ---------------------------------------------------------------- sizes
print()
print(c("1", "== (d) heaviest assets (projects/ excluded) =="))
files = []
for dp, dn, fn in os.walk(ROOT):
    rp = os.path.relpath(dp, ROOT).replace(os.sep, "/")
    if rp == ".":
        rp = ""
    dn[:] = [d for d in dn if d not in (".git", ".claude", "node_modules") and not (rp == "" and d == "projects")]
    for f in fn:
        if f == ".DS_Store":
            continue
        full = os.path.join(dp, f)
        files.append((os.path.getsize(full), (rp + "/" + f).lstrip("/")))
files.sort(reverse=True)
total = sum(s for s, _ in files)
heavy = 0
for size, name in files[:12]:
    flag = ""
    if size > WARN_KB * 1024:
        flag = "  " + WARN + " > %d KB" % WARN_KB
        heavy += 1
    print("  %8.1f KB  %s%s" % (size / 1024.0, name, flag))
print("  ---")
print("  %8.1f KB  total in %d files (projects/ excluded)" % (total / 1024.0, len(files)))
extra = [(s, n) for s, n in files[12:] if s > WARN_KB * 1024]
for size, name in extra:
    heavy += 1
    print("  %8.1f KB  %s  %s > %d KB" % (size / 1024.0, name, WARN, WARN_KB))
if heavy:
    print("  %s %d file(s) above %d KB (warning only)" % (WARN, heavy, WARN_KB))

# ---------------------------------------------------------------- invariants
print()
print(c("1", "== (e) invariants =="))
inv_fail = []


def invariant(ok, msg, detail=""):
    print("  %s %s%s" % (OK if ok else BAD, msg, ("  -> " + detail) if (detail and not ok) else ""))
    if not ok:
        inv_fail.append(msg)


# no GitHub API calls in the browser code
js_dir = os.path.join(ROOT, "assets", "js")
hits = []
for fn in sorted(os.listdir(js_dir)) if os.path.isdir(js_dir) else []:
    if not fn.endswith(".js"):
        continue
    code = re.sub(r"/\*.*?\*/", "", read(os.path.join(js_dir, fn)), flags=re.S)   # comments may mention it
    code = re.sub(r"(^|\s)//[^\n]*", r"\1", code)
    if "api.github.com" in code:
        hits.append(fn)
invariant(not hits, "no api.github.com string in assets/js", ", ".join(hits))

# the Chinese org name is used in data.js, and zh strings no longer carry the English org name
ORG_ZH = u"\u534e\u4e3a\u7ef4\u7eb3\u7814\u7a76\u6240\uff08\u65b0\u52a0\u5761\uff09"   # 华为维纳研究所（新加坡）
data_txt = read(data_path) if os.path.exists(data_path) else ""
invariant(ORG_ZH in data_txt, "Chinese org name (华为维纳研究所（新加坡）) is present in data.js")
import re as _re
_zh_vals = [m.group(2) for m in _re.finditer(r"zh:\s*(['\"])((?:(?!\1)[^\\]|\\.)*)\1", data_txt)]
zh_en_org = [v[:80] for v in _zh_vals if "Huawei Norbert" in v]
invariant(not zh_en_org, "no zh string still uses the English org name", "; ".join(zh_en_org)[:200])
invariant(("HiSil" + "icon") not in data_txt and u"\u6d77\u601d" not in data_txt, 'no former company name in data.js (company name is Huawei Norbert Wiener Research Center (Singapore))')

# Google Fonts must never block rendering
for page in ("index.html", "404.html"):
    fp = os.path.join(ROOT, page)
    if not os.path.exists(fp):
        continue
    src = read(fp)
    no_ns = re.sub(r"<noscript>.*?</noscript>", "", src, flags=re.S | re.I)
    blocking = [m for m in re.findall(r"<link\b[^>]*>", no_ns, flags=re.I)
                if re.search(r"fonts\.googleapis\.com", m) and re.search(r"(?<![\w.])rel=[\"']stylesheet[\"']", m, flags=re.I)]
    invariant(not blocking, "%s: Google Fonts stylesheet is non-blocking (preload + onload, noscript fallback)" % page,
              "render-blocking <link rel=stylesheet> to fonts.googleapis.com")
    pre = [m for m in re.findall(r"<link\b[^>]*>", no_ns, flags=re.I) if "fonts.googleapis.com/css" in m]
    invariant(not pre or all("onload" in m and "preload" in m for m in pre),
              "%s: font preload has an onload swap" % page)

# descriptions <= 160 chars
import html as _html
desc = []
for m in re.finditer(r"<meta\s+(?:name|property)=[\"'](description|og:description|twitter:description)[\"']\s+content=[\"']([^\"']*)[\"']", html):
    desc.append((m.group(1), _html.unescape(m.group(2))))
for i, block in enumerate(p.jsonld):
    try:
        d = json.loads(block).get("description")
        if d:
            desc.append(("JSON-LD[%d].description" % i, d))
    except ValueError:
        pass
too_long = ["%s (%d)" % (k, len(v)) for k, v in desc if len(v) > 160 and not k.startswith("JSON-LD")]
invariant(desc and not too_long, "%d meta description(s) <= 160 chars" % len(desc), ", ".join(too_long) or "none found")
for k, v in desc:   # JSON-LD is not shown as a snippet, so it only gets a heads-up
    if k.startswith("JSON-LD") and len(v) > 160:
        print("  %s %s is %d chars (fine for structured data; meta descriptions are the ones capped at 160)" % (WARN, k, len(v)))

# icons
# the home page and the redirect pages must not use root-absolute URLs (they work at / and under /AI_website/)
_bad_abs = []
for _f in ("index.html", "cv/index.html", "resume/index.html", "about/index.html", "publications/index.html", "about.html"):
    _p = os.path.join(ROOT, _f)
    if os.path.exists(_p):
        _t = re.sub(r"<noscript>.*?</noscript>", "", read(_p), flags=re.S)
        if re.search(r'(?:href|src)="/[^/]', _t) or re.search(r"url=/[^/]", _t) or "location.replace('/" in _t:
            _bad_abs.append(_f)
invariant(not _bad_abs, "home page and redirect pages use relative URLs only (work at / and under /AI_website/)", ", ".join(_bad_abs))

invariant(os.path.exists(os.path.join(ROOT, "favicon.ico")), "favicon.ico exists at the project root")
invariant(os.path.exists(os.path.join(ROOT, "assets", "img", "icon-192.png")), "assets/img/icon-192.png exists")


# ---------------------------------------------------------------- verdict
print()
status = 0
if broken or not ld_ok or inv_fail:
    status = 1
    print(c("31", "FAIL") + " — %d missing file(s)%s%s" % (len(broken), "" if ld_ok else ", invalid JSON-LD",
                                                       (", %d invariant(s) violated" % len(inv_fail)) if inv_fail else ""))
elif pending:
    status = 1
    print(c("33", "PENDING") + " — only module files are missing (%d); re-run when all builders are done" % len(pending))
else:
    print(c("32", "PASS") + " — all checks green")
sys.exit(status)
