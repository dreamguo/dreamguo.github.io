# 郭梦琦 (Mengqi Guo) — 个人主页 / Personal website

**中文在前，English below.** · [Jump to English](#english)

---

<a id="zh"></a>

## 中文

### 这是什么

郭梦琦（Mengqi Guo）的个人学术主页（<https://dreamguo.github.io/>）：暗色「研究实验室 / 终端」风格，配有可交互的 WebGL 3D 点云 / 高斯泼溅背景，中英文一键切换，深浅色主题，命令面板（⌘K）。

- 零构建：纯手写 HTML / CSS / 原生 JS，无框架、无 npm、无 CDN 脚本。唯一的第三方请求是 Google Fonts 样式表（`<link rel="preload" … onload>` 非阻塞加载，`display=swap`，样式表不可达时用系统字体）。没有统计脚本，也不会请求 GitHub API：论文仓库的星标数是 `data.js` 里的静态数字（`paper.stars`），只显示在论文卡片的 Code 按钮上（首屏不再有统计数字块），需要时手动更新。
- 全部内容集中在一个文件：`assets/js/data.js`（双语）。HTML 只是骨架。
- 经典脚本（无 `import` / `export`），因此 `file://` 直接打开也能用。
- 旧版 Jekyll 站点的 `/cv/`、`/resume/`、`/about/`、`/about.html`、`/publications/` 已做跳转；`projects/UNIKD`、`projects/TreeSBA` 两个旧项目页**原样保留、未做任何修改**（原因见下文「待确认事项」）。

### 本地运行

```bash
cd personal-website
tools/serve.sh            # 一个小型 python3 http.server，未知地址会返回 404.html
# 浏览器打开 http://localhost:8137/
```

也可以直接双击 `index.html`（`file://`）预览，但推荐用本地服务器，这样 `404.html`、`/cv/` 等绝对路径行为与线上一致。
URL 参数：`?lang=zh`、`?theme=light`（`404.html` 同样支持）；`#paper-4d3r` 会直接定位并高亮某篇论文。首次访问始终是英文 + 深色，不会根据浏览器语言自动切换；你的选择保存在 `localStorage`（键 `mq:lang`、`mq:theme`、`mq:shortcuts`）。`tools/serve.sh` 遇到不存在的地址会返回站点自己的 `404.html`（状态码 404），和 GitHub Pages 一致。

### 内容在哪里改（`assets/js/data.js`）

所有用户可见文字要么是普通字符串，要么是 `{ en: '…', zh: '…' }`。行内标记：`[文字](url)`、`**加粗**`、`*衬线斜体*`、`` `代码` ``。

**新增一篇论文**（放进 `papers` 数组，顺序即展示顺序）：

```js
{
  id: 'myPaper',                      // 唯一，用于 #paper-myPaper 与新闻/研究方向引用
  short: 'MyPaper',
  title: 'MyPaper: Full Title of the Paper',
  authors: [a(ME), LEE, a('Someone Else', 'https://example.com')],  // a(ME) 会自动标记为“我”；{eq:true} 表示共同一作
  venue: 'CVPR', year: 2027, kind: 'conference',   // kind: conference | journal | preprint
  venueLong: { en: 'CVPR 2027 · Poster', zh: 'CVPR 2027（Poster）' },
  badge: 'CVPR 2027',
  selected: true, isNew: true,        // selected：进入“代表性研究”；isNew：琥珀色 NEW 标记
  tldr: { en: 'One-sentence summary.', zh: '一句话概述。' },
  highlights: [{ en: '+1.2 dB PSNR', zh: 'PSNR 提升 1.2 dB' }],
  topics: ['gaussian'],               // 取自 topics 数组的 id
  tags: ['gaussian-splatting'],
  links: { arxiv: 'https://arxiv.org/abs/…', pdf: '…', code: '…', project: '…' },
  teaser: { type: 'image', src: 'assets/img/papers/mypaper.jpg', alt: 'Teaser description' },
  // 没有图片时：teaser: { type: 'procedural', scene: 'splat', alt: '…' }（scene 取 scenes[] 的 id）
  bib: { type: 'inproceedings', booktitle: 'Conference Name' },
}
```

把图片放到 `assets/img/papers/`（建议 ≤ 1400 px、≤ 250 KB：`sips -s format jpeg -s formatOptions 80 -Z 1400 in.png --out out.jpg`）。如需让它出现在某个研究方向卡片里，把 `id` 加入 `about.thrusts[i].papers`。

**新增一条新闻**（放进 `news` 数组，`sort` 只用于排序）：

```js
{
  type: 'paper',                      // paper | career | award
  date: '10.2026', sort: '2026-10', paper: 'myPaper',   // paper 可选，用于链接到论文卡片
  text: { en: 'One paper, [MyPaper](https://…), is accepted at **CVPR 2027**!', zh: '论文 [MyPaper](https://…) 被 **CVPR 2027** 接收！' },
},
```

**修改个人简介**：`about.paragraphs`（三段正文）、`about.specs`（头像旁的规格表）、`ui['hero.lede']`（首屏一句话）、`ui['hero.role']` / `ui['hero.org']`（职位与单位，中文单位名为 `华为维纳研究所（新加坡）`）、`hero.phrases`（首屏轮播词）、`journey`（经历时间线，当前职位设 `current: true`）、`meta.updated`（“更新于”）。

**首屏按钮行**：Explore research / Get in touch / Google Scholar / GitHub。后两个按钮直接写在 `index.html`（没有 JS 也能用），`hero.js` 会按 `data.js` 的 `links` 同步 `href`。旁边的 `⌘K` 小按钮只是给鼠标用户的快捷入口（`aria-hidden`、不进 Tab 顺序），键盘 / 读屏用户使用导航栏里的搜索按钮。首屏不再有统计数字块。

**新增一个语言字符串**：

```js
// 方式一：全站共享 —— 在 data.js 的 ui 里加一项
'my.key': { en: 'Hello', zh: '你好' },
// 方式二：某个模块私有 —— 在该模块的 JS 里
Site.addStrings({ 'my.key': { en: 'Hello', zh: '你好' } });
```

静态 HTML 用 `<span data-i18n="my.key">Hello</span>`（需要行内标记加 `data-i18n-rich`，属性用 `data-i18n-attr="aria-label:my.key"`）；JS 渲染的文字用 `Site.ui('my.key')`，并在 `langchange` 事件里重新渲染。

### 目录结构

```
personal-website/
├── index.html                 页面骨架、SEO / Open Graph / JSON-LD
├── 404.html                   终端风格 404（运行时判断站点根，任意深度、根站点与 /AI_website/ 子路径都可用；支持 ?theme= / ?lang= 与主题切换）
├── cv/ resume/ about/ publications/ about.html   旧 Jekyll 链接的跳转页（相对路径，根站点与子路径都可用）
├── robots.txt  sitemap.xml  favicon.ico
├── .nojekyll                  关闭 GitHub Pages 的 Jekyll 处理
├── assets/
│   ├── css/  tokens.css base.css  nav.css hero.css about.css news.css publications.css
│   │         journey.css recognition.css contact.css fx.css
│   ├── js/   data.js（内容）core.js（运行时 Site）icons.js  fx.js nav.js palette.js
│   │         hero-gl.js hero.js about.js news.js teasers.js publications.js
│   │         journey.js recognition.js contact.js  main.js（启动）
│   ├── img/  avatar-{480,960}.jpg  favicon.svg icon-192.png apple-touch-icon.png og-image.png  papers/*.jpg
│   └── video/ treesba-assembly.mp4
├── projects/                  旧项目页（UNIKD、TreeSBA），原样保留，请勿修改
└── tools/  serve.sh  jscheck.sh  check-data.js  check.py
```

脚本按 `index.html` 中的顺序加载；每个模块用 `Site.register(name, init)` 注册，由 `main.js` 统一启动。

### 设计令牌与换肤

所有颜色、字体、间距、动效、层级都在 `assets/css/tokens.css`，其他样式只引用变量，**不写死颜色**。

| 想改什么 | 改哪里 |
|---|---|
| 品牌色（默认电光青） | `--accent-rgb`（`r, g, b`），其余 `--accent`、发光、渐变自动跟随 |
| 辅助色 / “NOW”琥珀色 | `--accent-2-rgb` / `--accent-3-rgb` |
| 背景与面板 | `--bg` `--bg-elev` `--panel` `--veil` |
| 字体 | `--font-sans`（Geist）`--font-mono`（Geist Mono）`--font-serif`（Instrument Serif），并同步 `index.html` 与 `404.html` 里的 Google Fonts 链接（两处 URL 保持一致，可共用缓存） |
| 浅色主题 | `:root[data-theme="light"]` 块：同一批变量的另一套取值 |
| 版心 / 间距 / 圆角 | `--container` `--gutter` `--section-pad` `--r-*` `--s-*` |
| 动效节奏 | `--ease*` `--dur-1…4`（`prefers-reduced-motion` 下自动降级） |

### 快捷键与命令面板

| 按键 | 作用 |
|---|---|
| `⌘K` / `Ctrl+K` | 打开命令面板（始终可用） |
| `/` | 聚焦论文搜索框 |
| `1` `2` `3` `4` | 首屏可见时切换 3D 场景（Reconstruct / Gaussians / Assemble / 4D） |
| `Esc` | 关闭面板 / 菜单 |

在输入框中、或按住 Ctrl / ⌘ / Alt 时，单键快捷键不会触发。

**单键快捷键（`/`、`1`–`4`）可以关闭**（WCAG 2.1.4）：命令面板里的「键盘快捷键」命令一键开关，选择保存在 `localStorage`（`mq:shortcuts`），默认开启；关闭后首屏 HUD 里的“按 1–4”提示也会隐藏。`⌘K` 不受影响。代码里：`Site.shortcuts.enabled()` / `.set(bool)`，模块的单键处理必须先检查它。

**动效可以暂停**（WCAG 2.2.2）：首屏 3D 面板上的暂停按钮，或命令面板里的「暂停 / 恢复动效」命令，会停掉点云自转、打字机、光标特效与所有 CSS 动画；选择保存在 `localStorage`（`mq:motion`）。`Site.motion` 提供 `paused()` / `set(bool)` / `toggle()`，`Site.reducedMotion` 同时反映系统的“减少动态效果”设置与你的暂停选择，模块通过 `motionchange` 事件响应。

命令面板（`⌘K`）里可以输入并执行：跳转到各章节与每篇论文；打开邮箱 / Google Scholar / GitHub 链接；切换主题；切换语言；键盘快捷键 开 / 关；复制邮箱地址；重播首屏动画；切换 3D 场景。也支持中英文关键词搜索，以及几条终端彩蛋（如 `help`、`whoami`）。

### 部署到 GitHub Pages（现有仓库 `dreamguo/dreamguo.github.io`）

思路：**保留 `projects/`，删除 Jekyll 相关文件，换上新站点，`.nojekyll` 保证按纯静态发布。** 下面的命令只是步骤说明，请自己逐条执行并检查。

```bash
# 0) 先确认新站点自检通过
cd /Users/mengqi/workstation/personal-website
python3 tools/check.py

# 1) 克隆旧仓库并新建分支（回滚只需切回 master；注意该仓库的默认分支是 master，不是 main）
cd ~/workstation
git clone git@github.com:dreamguo/dreamguo.github.io.git dreamguo.github.io
cd dreamguo.github.io
git checkout -b redesign-2026

# 2) 删除旧 Jekyll 文件（保留 projects/、LICENSE、CNAME（如果有）、.gitignore）
git rm -r --ignore-unmatch \
  _config.yml _config.dev.yml Gemfile Gemfile.lock package.json \
  _data _drafts _includes _layouts _pages _portfolio _posts _publications _sass _talks _teaching \
  markdown_generator talkmap talkmap.ipynb talkmap.py CHANGELOG.md CONTRIBUTING.md \
  files images assets README.md

# 3) 复制新站点（不覆盖 projects/；不复制 .git/ —— 本目录的 origin 是 dreamguo/AI_website，绝不能覆盖部署仓库的 .git）
rsync -av --exclude='projects/' --exclude='.git/' --exclude='.claude/' --exclude='__pycache__/' --exclude='.DS_Store' \
  /Users/mengqi/workstation/personal-website/ ./

# 4) 本地验证
python3 tools/check.py && tools/serve.sh       # 打开 http://localhost:8137/ 检查

# 5) 提交并推送分支
git add -A
git commit -m "Redesign personal website: static dark-lab site, bilingual, WebGL hero"
git push -u origin redesign-2026

# 6) 满意后合并到 master（也可在 GitHub 上开 Pull Request 再合并；想一步到位也可以直接在 master 上提交并推送）
git checkout master
git merge --no-ff redesign-2026
git push origin master
```

然后在 GitHub：**Settings → Pages → Build and deployment → Source: “Deploy from a branch” → Branch: `master` / `(root)`**，等待一两分钟即可访问。

- **自定义域名**：如果仓库根目录有 `CNAME` 文件，请保留（上面的 `git rm` 没有删它）；新站点里所有资源都用相对路径或以 `/` 开头的根路径，域名迁移后无需修改。若以后换域名，需同步修改 `index.html` 中的 `canonical`、`og:*`、JSON-LD，以及 `robots.txt`、`sitemap.xml` 里的域名。
- **旧链接**：旧 Jekyll 站的 `/cv/`、`/resume/`（→ 经历）、`/about/`、`/about.html`（→ 主页）、`/publications/`（→ 研究）都有跳转页；`projects/UNIKD/`、`projects/TreeSBA/` 不变。
- **根路径**：这些跳转页一律用**相对路径**（`../#journey`），`404.html` 在运行时判断站点根（`/` 或 `/AI_website/`），所以同一份文件既能放在 `dreamguo.github.io` 根目录，也能作为 `dreamguo/AI_website` 的项目页（`/AI_website/…`）使用。若要放到别的子路径，请在 `404.html` 顶部脚本的正则里加上该路径。`robots.txt`、`sitemap.xml` 与 `canonical` 只在根站点有意义。
- **回滚**：`git revert -m 1 <merge-commit>` 后再推送即可。

### 工具

| 命令 | 作用 |
|---|---|
| `tools/serve.sh [端口]` | 本地静态服务器（默认 8137）；未知地址返回 `404.html` |
| `tools/jscheck.sh assets/js/*.js` | 用 macOS 自带 JavaScriptCore 做语法检查（无需 Node） |
| `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tools/check-data.js` | 校验 `data.js`：论文 id 唯一、每篇恰有一位“我”、中英文齐全、引用有效 |
| `python3 tools/check.py` | 检查 `index.html` / CSS `url()` / `data.js` 引用的文件是否都存在、JSON-LD 是否可解析，并列出最重的资源（> 300 KB 警告）；缺文件时返回非 0。同时守护以下约定：`assets/js` 里没有 `api.github.com`；`data.js` 里出现中文单位名 `华为维纳研究所（新加坡）`，且任何中文字符串都不再使用英文单位名；`data.js` 里的每个本地链接都存在；Google Fonts 样式表不阻塞渲染（`index.html`、`404.html`）；meta 描述 ≤ 160 字符；`favicon.ico`、`icon-192.png` 存在 |

### 浏览器支持

面向常青浏览器，最低版本：Chrome / Edge 111、Safari 16.2、Firefox 121（样式使用了 `color-mix()` 与 `:has()`）。更旧的浏览器会退回到备用颜色，内容仍可阅读。WebGL 背景是渐进增强，内容本身由 DOM 渲染；`index.html` 内置 `<noscript>` 摘要，并有 JSON-LD 与 meta 描述用于搜索引擎。全站尊重 `prefers-reduced-motion`。自定义光标（圆点 + 圆环，深浅色主题下都清晰可见）只在有鼠标 / 触控板的设备上启用（`(hover: hover) and (pointer: fine)`）：窗口失焦或指针离开页面时立即还回系统光标，减少动态效果、强制颜色 / 高对比度模式下不启用；若自检发现光标位置漂移会退回系统光标，并在之后的真实鼠标移动时重新尝试。所有会改变外观的 `:hover` 样式都放在 `@media (hover: hover) and (pointer: fine)` 里，所以触屏上点一下不会留下“粘住”的悬停效果；`:focus-visible` 样式不受影响。

### 待确认事项（来自 `assets/js/data.js` 顶部，以及需要你本人处理的事）

代码里的：

- **公司名与中文名已确认**：Huawei Norbert Wiener Research Center (Singapore) / 华为维纳研究所（新加坡）；职位 Researcher / 研究员。你的中文名郭梦琦（`meta.nameZh`）：中文模式下是首页大标题，英文模式下是大标题旁的小号标签，同时出现在信息表、页脚、网页标题、JSON-LD 与分享图。若有变动，在 `data.js` 里全局搜索替换，并同步修改 `tools/check.py` / `tools/check-data.js` 里的同名检查项。
- **分享图 `assets/img/og-image.png` 是位图，文字直接画在图里**：改公司名 / 姓名 / 职位后必须重新生成（1200×630，可用无头 Chrome 渲染一张卡片再截图），否则微信、LinkedIn、X 的链接预览会显示旧文字。
- **招募告示**：首页 CTA 下方的小告示由 `data.js` 里的 `hero.hiring.tag` / `hero.hiring.text` 控制（中英文各一条，含 mailto 链接）；不招人时，删掉 `index.html` 里的 `<div class="hero__hiring">` 即可。
- **字母 G 标识**：`assets/img/favicon.svg` 是矢量源文件；`favicon.ico`、`icon-192.png`、`apple-touch-icon.png`、`og-image.png` 是位图导出，改动标识后需要重新导出。顶栏与 404 页的 G 是文字渲染（渐变），不依赖图片。
- 华为入职时间：只有“2025”，显示为 `2025 — 至今`，请核对具体月份。
- 实习（JHU CCVL、MEGVII、PKU VIE）只显示起始年份，结束时间未知，因此不显示。
- 新闻日期：旧站有月份的条目显示 `MM.YYYY`，重建时新增的条目只显示 `YYYY`。GNeSF（NeurIPS 2023）旧站标注为 2024 年 3 月，这里显示为“2023”；HeiChole 的月份未核实，显示为“2023”。
- `vie.group`（PKU VIE 实验室链接）上次检查时无响应，请确认网址是否仍然有效。
- 论文仓库星标数是 `paper.stars` 的静态数字，请偶尔手动更新。

你本人要做的（不是代码）：

- **可选：自托管字体**。目前字体来自 Google Fonts（非阻塞，有系统字体兜底），但访客 IP 会发给 Google，且在部分网络下加载缓慢。自托管步骤：① 从各字体官网 / Google Fonts 下载 Geist、Geist Mono、Instrument Serif 的 Latin 子集 woff2 与 OFL 许可文件（约 70 KB），放到 `assets/fonts/`；② 在 `tokens.css` 里写 `@font-face`（`font-display: swap`，Geist 用可变字重 300–700，Geist Mono 400–600，Instrument Serif 常规 + 斜体）；③ 删除 `index.html` 与 `404.html` 里的两条 preconnect、preload 和 `<noscript>` 字体链接；④ 用 `<link rel="preload" as="font" type="font/woff2" crossorigin>` 预加载首屏用到的一两个字重；⑤ 运行 `python3 tools/check.py`（它会检查 `@font-face` 引用的文件都存在）。
- **旧项目页 `projects/UNIKD`、`projects/TreeSBA` 保持原样，没有修改**，因为它们是需要你本人决定的旧内容。已知问题：两页都带有 Nerfies 模板自带的 Google Analytics 标签（`G-PYVRSFMDRL`，访客会被上报给第三方，与本站“无统计”不一致）；从 ajax.googleapis.com 加载 jQuery；各自触发约 243 个失败请求（缺失的插帧图片与字体）；没有返回主页的入口；`<title>` 仅为 “UNIKD” / “TreeSBA” 且没有 `<html lang>`。如果你同意修改，建议：删掉 gtag 段、去掉插帧轮播初始化、写描述性标题与 `lang="en"`、加一个固定的“返回主页”链接。

### 致谢与许可

- 字体：[Geist](https://vercel.com/font)、Geist Mono、[Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif)，经 Google Fonts 加载（均为 SIL OFL；如需自托管见上文）。
- `projects/UNIKD`、`projects/TreeSBA` 沿用 [Nerfies](https://nerfies.github.io) 网站模板，遵循 [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/)（与其 README 一致）。
- 论文配图版权归各论文作者与会议所有。

---

<a id="english"></a>

## English

### What this is

The personal academic site of Mengqi Guo (郭梦琦) (<https://dreamguo.github.io/>): a dark "research lab / terminal" aesthetic with an interactive WebGL 3D point-cloud / Gaussian-splat backdrop, one-click 中 / EN language switch, light and dark themes and a command palette (⌘K).

- Zero build: hand-written HTML / CSS / vanilla JS. No frameworks, no npm, no CDN scripts. The only third-party request is the Google Fonts stylesheet, loaded without blocking rendering (`<link rel="preload" … onload>`, `display=swap`, system-font fallbacks if it is unreachable). There is no analytics, and the site never calls the GitHub API: star counts are static numbers in `data.js` (`paper.stars`), shown only on the paper cards' Code buttons (the hero no longer has stat tiles), that you update by hand.
- All content lives in one bilingual file: `assets/js/data.js`. The HTML is only a skeleton.
- Classic scripts (no `import` / `export`), so it even works from `file://`.
- The legacy Jekyll URLs `/cv/`, `/resume/`, `/about/`, `/about.html` and `/publications/` redirect to the new site; the two old project pages `projects/UNIKD` and `projects/TreeSBA` are kept verbatim and **deliberately untouched** (see the TODO list below for why).

### Run locally

```bash
cd personal-website
tools/serve.sh            # a small python3 http.server that also serves 404.html for unknown paths
# open http://localhost:8137/
```

Opening `index.html` directly (`file://`) works too, but a local server matches production for `404.html`, `/cv/` and other root-relative paths.
URL parameters: `?lang=zh`, `?theme=light` (`404.html` honors them too). `#paper-4d3r` scrolls to and highlights a paper. A first visit is always English + dark (no `navigator.language` sniffing); your choices are remembered in `localStorage` (`mq:lang`, `mq:theme`, `mq:shortcuts`). `tools/serve.sh` answers unknown URLs with the site's own `404.html` (status 404), like GitHub Pages does.

### Where content lives (`assets/js/data.js`)

Every user-visible string is either a plain string or `{ en: '…', zh: '…' }`. Inline markup: `[text](url)`, `**bold**`, `*serif italic*`, `` `code` ``.

**Add a paper** (append to `papers`; array order is display order):

```js
{
  id: 'myPaper',                      // unique; used by #paper-myPaper and news / thrust references
  short: 'MyPaper',
  title: 'MyPaper: Full Title of the Paper',
  authors: [a(ME), LEE, a('Someone Else', 'https://example.com')],  // a(ME) is flagged as "me"; pass {eq:true} for equal contribution
  venue: 'CVPR', year: 2027, kind: 'conference',   // kind: conference | journal | preprint
  venueLong: { en: 'CVPR 2027 · Poster', zh: 'CVPR 2027（Poster）' },
  badge: 'CVPR 2027',
  selected: true, isNew: true,        // selected → shown in "Selected research"; isNew → amber NEW tag
  tldr: { en: 'One-sentence summary.', zh: '一句话概述。' },
  highlights: [{ en: '+1.2 dB PSNR', zh: 'PSNR 提升 1.2 dB' }],
  topics: ['gaussian'],               // ids from the topics array
  tags: ['gaussian-splatting'],
  links: { arxiv: 'https://arxiv.org/abs/…', pdf: '…', code: '…', project: '…' },
  teaser: { type: 'image', src: 'assets/img/papers/mypaper.jpg', alt: 'Teaser description' },
  // no image? use: teaser: { type: 'procedural', scene: 'splat', alt: '…' }  (scene = an id from scenes[])
  bib: { type: 'inproceedings', booktitle: 'Conference Name' },
}
```

Drop the image into `assets/img/papers/` (aim for ≤ 1400 px and ≤ 250 KB: `sips -s format jpeg -s formatOptions 80 -Z 1400 in.png --out out.jpg`). To list it under a research thrust, add its `id` to `about.thrusts[i].papers`.

**Add a news item** (append to `news`; `sort` is only used for ordering):

```js
{
  type: 'paper',                      // paper | career | award
  date: '10.2026', sort: '2026-10', paper: 'myPaper',   // `paper` is optional and links to the paper card
  text: { en: 'One paper, [MyPaper](https://…), is accepted at **CVPR 2027**!', zh: '论文 [MyPaper](https://…) 被 **CVPR 2027** 接收！' },
},
```

**Change the bio:** `about.paragraphs` (three paragraphs), `about.specs` (spec sheet beside the portrait), `ui['hero.lede']` (hero sentence), `ui['hero.role']` / `ui['hero.org']` (title and employer; the Chinese org name is `华为维纳研究所（新加坡）`), `hero.phrases` (rotating hero phrases), `journey` (timeline; mark the current role with `current: true`), `meta.updated` ("last updated").

**Hero button row:** Explore research / Get in touch / Google Scholar / GitHub. The last two live in `index.html` (so they work without JS) and `hero.js` re-syncs their `href` from `links` in `data.js`. The small `⌘K` pill next to them is a mouse shortcut only (`aria-hidden`, not in the tab order); keyboard and screen-reader users use the search button in the nav. The hero has no stat tiles any more.

**Add a language string:**

```js
// A) shared by the whole site — add to `ui` in data.js
'my.key': { en: 'Hello', zh: '你好' },
// B) private to one module — in that module's JS
Site.addStrings({ 'my.key': { en: 'Hello', zh: '你好' } });
```

Static HTML uses `<span data-i18n="my.key">Hello</span>` (add `data-i18n-rich` for inline markup, `data-i18n-attr="aria-label:my.key"` for attributes). JS-rendered text uses `Site.ui('my.key')` and must re-render on the `langchange` event.

### Project structure

```
personal-website/
├── index.html                 page skeleton, SEO / Open Graph / JSON-LD
├── 404.html                   terminal-style 404 (decides the site root at run time; works at any depth, on the root site and under /AI_website/; honors ?theme= / ?lang=, has a theme toggle)
├── cv/ resume/ about/ publications/ about.html   redirect pages for the old Jekyll URLs (relative paths; work on the root site and under a sub-path)
├── robots.txt  sitemap.xml  favicon.ico
├── .nojekyll                  tells GitHub Pages to skip Jekyll
├── assets/
│   ├── css/  tokens.css base.css  nav.css hero.css about.css news.css publications.css
│   │         journey.css recognition.css contact.css fx.css
│   ├── js/   data.js (content) core.js (Site runtime) icons.js  fx.js nav.js palette.js
│   │         hero-gl.js hero.js about.js news.js teasers.js publications.js
│   │         journey.js recognition.js contact.js  main.js (boot)
│   ├── img/  avatar-{480,960}.jpg  favicon.svg icon-192.png apple-touch-icon.png og-image.png  papers/*.jpg
│   └── video/ treesba-assembly.mp4
├── projects/                  legacy project pages (UNIKD, TreeSBA) — keep verbatim, do not edit
└── tools/  serve.sh  jscheck.sh  check-data.js  check.py
```

Scripts load in the order listed in `index.html`; each module calls `Site.register(name, init)` and `main.js` starts them all.

### Design tokens & re-theming

All color, type, spacing, motion and z-index values live in `assets/css/tokens.css`. Every other stylesheet consumes variables and **never hard-codes colors**.

| To change | Edit |
|---|---|
| Brand color (default electric cyan) | `--accent-rgb` (`r, g, b`); `--accent`, glows and gradients follow |
| Secondary / "NOW" amber | `--accent-2-rgb` / `--accent-3-rgb` |
| Background and panels | `--bg` `--bg-elev` `--panel` `--veil` |
| Fonts | `--font-sans` (Geist), `--font-mono` (Geist Mono), `--font-serif` (Instrument Serif) — and the Google Fonts `<link>` in `index.html` and `404.html` (keep the two URLs identical so the cache is shared) |
| Light theme | the `:root[data-theme="light"]` block: the same variables with different values |
| Layout / spacing / radius | `--container` `--gutter` `--section-pad` `--r-*` `--s-*` |
| Motion | `--ease*` `--dur-1…4` (degrades automatically under `prefers-reduced-motion`) |

### Keyboard shortcuts & command palette

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open the command palette (always available) |
| `/` | Focus the paper search |
| `1` `2` `3` `4` | Switch the 3D scene while the hero is in view (Reconstruct / Gaussians / Assemble / 4D) |
| `Esc` | Close palette / menus |

Single-key shortcuts are ignored while typing in a field or when Ctrl / ⌘ / Alt is held.

**The single-key shortcuts (`/`, `1`–`4`) can be switched off** (WCAG 2.1.4): the palette command "Keyboard shortcuts" toggles them, the choice is stored in `localStorage` (`mq:shortcuts`), and the default is on. Turning them off also hides the "keys 1–4" hint in the hero HUD. `⌘K` is not affected. In code: `Site.shortcuts.enabled()` / `.set(bool)`; any module with a single-key handler must check it first.

**Motion can be paused** (WCAG 2.2.2): the pause button on the hero 3D panel, or the palette command "Pause / resume motion", stops the point-cloud rotation, the typewriter, cursor effects and every CSS animation; the choice is stored in `localStorage` (`mq:motion`). `Site.motion` exposes `paused()` / `set(bool)` / `toggle()`, and `Site.reducedMotion` reflects both the OS "reduce motion" setting and your pause; modules react to the `motionchange` event.

Things you can type and run in the palette (`⌘K`): jump to a section or a specific paper; open the email / Google Scholar / GitHub links; switch theme; switch language; keyboard shortcuts on / off; copy the email address; replay the hero animation; switch the 3D scene. Search works with English and Chinese keywords, and there are a few terminal easter eggs (`help`, `whoami`, …).

### Deploy to GitHub Pages (existing repo `dreamguo/dreamguo.github.io`)

Plan: **keep `projects/`, delete the Jekyll files, drop in the new site; `.nojekyll` makes Pages serve it as plain static files.** The commands below are instructions — run them yourself, one at a time, and check the output.

```bash
# 0) make sure the new site passes its self-check
cd /Users/mengqi/workstation/personal-website
python3 tools/check.py

# 1) clone the old repo and branch (rollback = go back to master; note this repo's default branch is master, not main)
cd ~/workstation
git clone git@github.com:dreamguo/dreamguo.github.io.git dreamguo.github.io
cd dreamguo.github.io
git checkout -b redesign-2026

# 2) remove the old Jekyll files (keeps projects/, LICENSE, CNAME if present, .gitignore)
git rm -r --ignore-unmatch \
  _config.yml _config.dev.yml Gemfile Gemfile.lock package.json \
  _data _drafts _includes _layouts _pages _portfolio _posts _publications _sass _talks _teaching \
  markdown_generator talkmap talkmap.ipynb talkmap.py CHANGELOG.md CONTRIBUTING.md \
  files images assets README.md

# 3) copy the new site (does not touch projects/; skips .git/ — this folder's origin is dreamguo/AI_website and must never overwrite the deploy repo's .git)
rsync -av --exclude='projects/' --exclude='.git/' --exclude='.claude/' --exclude='__pycache__/' --exclude='.DS_Store' \
  /Users/mengqi/workstation/personal-website/ ./

# 4) verify locally
python3 tools/check.py && tools/serve.sh       # open http://localhost:8137/

# 5) commit and push the branch
git add -A
git commit -m "Redesign personal website: static dark-lab site, bilingual, WebGL hero"
git push -u origin redesign-2026

# 6) when happy, merge into master (or open a Pull Request on GitHub and merge there; committing straight to master also works)
git checkout master
git merge --no-ff redesign-2026
git push origin master
```

Then on GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: `master` / `(root)`**. It is live a minute or two later.

- **Custom domain:** if the repo root has a `CNAME` file, keep it (step 2 does not delete it). All assets use relative or root-absolute paths, so a domain change needs no path edits — but update `canonical`, `og:*` and the JSON-LD in `index.html`, plus the domain in `robots.txt` and `sitemap.xml`.
- **Legacy URLs:** the old Jekyll site's `/cv/` and `/resume/` (→ journey), `/about/` and `/about.html` (→ home) and `/publications/` (→ research) have redirect pages; `projects/UNIKD/` and `projects/TreeSBA/` are unchanged.
- **Root paths:** these redirect pages use **relative** URLs (`../#journey`), and `404.html` decides the site root at run time (`/` or `/AI_website/`), so the same files work both at the root of `dreamguo.github.io` and as the `dreamguo/AI_website` project site (`/AI_website/…`). To serve it from another sub-path, add that path to the regex in the script at the top of `404.html`. `robots.txt`, `sitemap.xml` and `canonical` only make sense on the root site.
- **Rollback:** `git revert -m 1 <merge-commit>` and push.

### Tooling

| Command | Purpose |
|---|---|
| `tools/serve.sh [port]` | Local static server (default 8137); unknown URLs get `404.html` |
| `tools/jscheck.sh assets/js/*.js` | Syntax-check JS with macOS's built-in JavaScriptCore (no Node needed) |
| `/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc tools/check-data.js` | Validate `data.js`: unique paper ids, exactly one "me" author per paper, en + zh present, valid references |
| `python3 tools/check.py` | Verify every file referenced by `index.html`, CSS `url()` and `data.js` exists, that the JSON-LD parses, and list the heaviest assets (warns above 300 KB); exits non-zero on missing files. It also guards these invariants: no `api.github.com` in `assets/js`; the Chinese org name (`华为维纳研究所（新加坡）`) is present in `data.js` and no zh string uses the English org name; every local link in `data.js` exists; the Google Fonts stylesheet never blocks rendering (`index.html`, `404.html`); meta descriptions are ≤ 160 characters; `favicon.ico` and `icon-192.png` exist |

### Browser support

Evergreen browsers, minimum versions: Chrome / Edge 111, Safari 16.2, Firefox 121 (styles use `color-mix()` and `:has()`). Older browsers degrade to the fallback colors and the content stays readable. The WebGL backdrop is progressive enhancement and all content is rendered in the DOM; `index.html` ships a `<noscript>` summary plus JSON-LD and a meta description for crawlers. `prefers-reduced-motion` is respected everywhere. The custom cursor (dot + ring, legible on both themes) only runs on devices with a mouse or trackpad (`(hover: hover) and (pointer: fine)`): the system cursor comes back as soon as the window loses focus or the pointer leaves the page, and it stays off under reduced motion, forced colors and high contrast; if its self-check ever sees the dot drift from the pointer it hands the system cursor back and retries on a later real pointer move. Every look-changing `:hover` rule lives inside `@media (hover: hover) and (pointer: fine)`, so a tap on a touch screen never leaves a stuck hover state; `:focus-visible` styles are unaffected.

### TODO / please verify (from the top of `assets/js/data.js`, plus things only you can do)

In the content:

- **Company, title and Chinese name are confirmed:** Huawei Norbert Wiener Research Center (Singapore) / 华为维纳研究所（新加坡); title Researcher / 研究员. Your Chinese name 郭梦琦 (`meta.nameZh`) is the hero title in Chinese mode, a small tag beside the big name in English mode, and also appears in the spec sheet, footer, page title, JSON-LD and the share card. If any of these change, search and replace in `data.js` and update the matching checks in `tools/check.py` and `tools/check-data.js`.
- **The social card `assets/img/og-image.png` is a raster image with the text baked in.** After changing the company, name or title, regenerate it (1200×630; render a card in headless Chrome and screenshot it), otherwise link previews on WeChat, LinkedIn and X keep showing the old text.
- **Hiring notice:** the small notice under the hero CTAs is driven by `hero.hiring.tag` / `hero.hiring.text` in `data.js` (one string per language, with a mailto link); to switch it off, delete `<div class="hero__hiring">` in `index.html`.
- **The letter-G mark:** `assets/img/favicon.svg` is the vector source; `favicon.ico`, `icon-192.png`, `apple-touch-icon.png` and `og-image.png` are raster exports to regenerate after a change. The G in the top bar and on the 404 page is rendered text (gradient), so it does not depend on an image.
- Huawei start date: only "2025" is known; it is shown as `2025 — Present`. Check the exact month.
- Internships (JHU CCVL, MEGVII, PKU VIE) show only the start year; the end dates are unknown, so none are shown.
- News dates: entries from your old site keep their month (`MM.YYYY`); entries added in the rebuild show only `YYYY`. The NeurIPS 2023 (GNeSF) item was dated 03.2024 on the old site and is shown as "2023"; the HeiChole month is unverified and shown as "2023".
- `vie.group` (PKU VIE Lab link) did not respond when last checked; confirm the URL still works.
- Star counts are the static `paper.stars` numbers; refresh them by hand now and then.

For you to do (not code):

- **Optional: self-host the fonts.** Fonts currently come from Google Fonts (non-blocking, with system fallbacks), but visitor IPs are sent to Google and loading can be slow on some networks. Steps: (1) download the Latin-subset woff2 files for Geist, Geist Mono and Instrument Serif plus their OFL license texts (about 70 KB in total) from the font projects or Google Fonts and put them in `assets/fonts/`; (2) add `@font-face` rules to `tokens.css` (`font-display: swap`; Geist as a variable font 300–700, Geist Mono 400–600, Instrument Serif regular + italic); (3) delete the two preconnect links, the preload and the `<noscript>` font links from `index.html` and `404.html`; (4) preload the one or two above-the-fold weights with `<link rel="preload" as="font" type="font/woff2" crossorigin>`; (5) run `python3 tools/check.py` (it verifies that every file referenced by `@font-face` exists).
- **The legacy project pages `projects/UNIKD` and `projects/TreeSBA` are left untouched on purpose**, because they are old content that is your call. Known issues: both load the Google Analytics tag that ships with the Nerfies template (`G-PYVRSFMDRL`, so visitors are reported to a third-party property, which contradicts this site's "no analytics" stance); both load jQuery from ajax.googleapis.com; each triggers about 243 failed requests (missing interpolation frames and a font); there is no way back to the home page; the `<title>` is just "UNIKD" / "TreeSBA" and there is no `<html lang>`. If you approve edits: delete the gtag block, drop the interpolation-carousel init, add a descriptive title and `lang="en"`, and add one fixed "back to home" link.

### Credits & license

- Fonts: [Geist](https://vercel.com/font), Geist Mono and [Instrument Serif](https://fonts.google.com/specimen/Instrument+Serif) via Google Fonts (SIL OFL; see the self-hosting notes above if you would rather serve them yourself).
- The legacy project pages `projects/UNIKD` and `projects/TreeSBA` use the [Nerfies](https://nerfies.github.io) website template under [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/), as stated in their README.
- Paper figures belong to their respective authors and venues.
