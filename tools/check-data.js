// Run with: jsc tools/check-data.js   (from the project root)
var window = {};
load('assets/js/data.js');
var D = window.SITE_DATA, errs = [];
function need(c, m) { if (!c) errs.push(m); }
var ids = {};
D.papers.forEach(function (p) {
  need(p.id && !ids[p.id], 'duplicate/missing paper id: ' + p.id); ids[p.id] = 1;
  ['title','authors','venue','year','kind','tldr','badge'].forEach(function (k) { need(p[k] != null, p.id + ' missing ' + k); });
  need(p.tldr && p.tldr.en && p.tldr.zh, p.id + ' tldr needs en+zh');
  need(p.authors.filter(function (a) { return a.me; }).length === 1, p.id + ' should contain exactly one "me" author');
});
D.about.thrusts.forEach(function (t) { t.papers.forEach(function (id) { need(ids[id], 'thrust ' + t.id + ' refs unknown paper ' + id); }); });
D.news.forEach(function (n, i) { need(n.text && n.text.en && n.text.zh, 'news[' + i + '] needs en+zh'); if (n.paper) need(ids[n.paper], 'news[' + i + '] unknown paper ' + n.paper); });
// bilingual accessible names / labels
D.papers.forEach(function (p) {
  if (p.teaser) need(p.teaser.alt && p.teaser.alt.en && p.teaser.alt.zh, p.id + ' teaser.alt needs en+zh');
  if (p.codeLabel) need(p.codeLabel.en && p.codeLabel.zh, p.id + ' codeLabel needs en+zh');
});
need(D.about.photo.alt && D.about.photo.alt.en && D.about.photo.alt.zh, 'about.photo.alt needs en+zh');
D.links.forEach(function (l) { need(l.label && l.handle && l.href, 'link ' + l.id + ' needs label/handle/href'); });
// news date display: MM.YYYY when a month is known, else YYYY; 'sort' is YYYY-MM
D.news.forEach(function (n, i) {
  need(/^(\d{2}\.)?\d{4}$/.test(n.date), 'news[' + i + '] date must be YYYY or MM.YYYY, got ' + n.date);
  need(/^\d{4}-\d{2}$/.test(n.sort), 'news[' + i + '] sort must be YYYY-MM');
});
// the English meta description is shown as a search snippet: keep it within 160 characters
need(D.ui['meta.description'].en.length <= 160, 'meta.description (en) must be <= 160 characters, got ' + D.ui['meta.description'].en.length);
// company name confirmed by the owner: Huawei Norbert Wiener Research Center (Singapore) / 华为维纳研究所（新加坡）
need(D.ui['hero.org'] && D.ui['hero.org'].zh === '华为维纳研究所（新加坡）' && D.ui['hero.org'].en === 'Huawei Norbert Wiener Research Center (Singapore)', 'hero.org must be Huawei Norbert Wiener Research Center (Singapore) / 华为维纳研究所（新加坡）');
need(JSON.stringify(D).indexOf('HiSil' + 'icon') < 0 && JSON.stringify(D).indexOf('\u6d77\u601d') < 0, 'the former company name must not appear (owner corrected it)');
need(D.meta.nameZh === '郭梦琦', 'meta.nameZh must be 郭梦琦');
(function walk(o, path) {
  if (o && typeof o === 'object') Object.keys(o).forEach(function (k) {
    var v = o[k];
    if (k === 'zh' && typeof v === 'string' && v.indexOf('Huawei Norbert') >= 0) errs.push('zh string still uses the English org name at ' + path);
    else walk(v, path + '.' + k);
  });
})(D, 'SITE_DATA');
// typographic apostrophes in user-facing EN copy (I’m, What’s), never the straight ASCII one between letters
(function walk(o, path) {
  if (typeof o === 'string') { if (/[A-Za-z]'[A-Za-z]/.test(o) && !/^(https?:|mailto:)/.test(o)) errs.push('straight apostrophe in ' + path + ': ' + o.slice(0, 50)); return; }
  if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { if (k !== 'zh') walk(o[k], path + '.' + k); });
})(D, 'D');
// no http:// links except the unverified vie.group one
(JSON.stringify(D).match(/http:\/\/[^\s"')\]]+/g) || []).forEach(function (u) { need(/vie\.group/.test(u), 'insecure link: ' + u); });
Object.keys(D.ui).forEach(function (k) { var v = D.ui[k]; need(v.en && v.zh, 'ui ' + k + ' needs en+zh'); });
print(errs.length ? 'DATA ERRORS:\n - ' + errs.join('\n - ') : 'data OK: ' + D.papers.length + ' papers, ' + D.news.length + ' news, ' + Object.keys(D.ui).length + ' ui strings');
