(function () {
  'use strict';

  /* ---- tiny helpers to keep the papers list readable ------------------- */
  var ME = 'Mengqi Guo';
  function a(name, url, opt) {
    var o = { n: name };
    if (url) o.url = url;
    if (name === ME) o.me = true;
    if (opt && opt.eq) o.eq = true;
    return o;
  }
  var LEE = a('Gim Hee Lee', 'https://www.comp.nus.edu.sg/~leegh/');
  var CHEN_LI = a('Chen Li', 'https://chaneyddtt.github.io/');
  var HANLIN = a('Hanlin Chen', 'https://hlinchen.github.io/');
  var BOXU = a('Bo Xu', 'https://boxuLibrary.github.io/');
  var YUILLE = a('Alan Yuille', 'https://www.cs.jhu.edu/~ayuille1/');
  var ELLIPSIS = { n: '…', ellipsis: true };
  /* bilingual value that still stringifies to English (String(v) / text nodes) for code that has not been made
     language-aware yet; Site.t(v) and v.en / v.zh work as usual */
  function bi(en, zh) {
    var o = { en: en, zh: zh };
    Object.defineProperty(o, 'toString', { value: function () { return o.en; } });
    return o;
  }

  window.SITE_DATA = {
    /* ==================================================================== */
    meta: {
      name: 'Mengqi Guo',
      nameZh: '郭梦琦',
      handle: 'dreamguo',
      analytics: { goatcounter: 'dreamguo' },
      url: 'https://dreamguo.github.io/',
      email: 'im.guomengqi@gmail.com',
      location: { en: 'Singapore', zh: '新加坡' },
      coords: '1.3521°N 103.8198°E',
      updated: { en: 'Sep 2026', zh: '2026 年 9 月' },
      year: 2026,
    },

    links: [
      { id: 'email', icon: 'mail', label: 'Email', handle: 'im.guomengqi@gmail.com', href: 'mailto:im.guomengqi@gmail.com' },
      { id: 'scholar', icon: 'scholar', label: 'Google Scholar', handle: bi('Citations profile', '论文与引用主页'), href: 'https://scholar.google.com/citations?user=Qa4BlOoAAAAJ&hl=en' },
      { id: 'github', icon: 'github', label: 'GitHub', handle: '@dreamguo', href: 'https://github.com/dreamguo' },
    ],

    /* ==================================================================== */
    nav: ['about', 'news', 'research', 'journey', 'recognition', 'contact'],

    /* hero rotator (typed phrases) */
    hero: {
      phrases: [
        { en: 'multimodal foundation models', zh: '多模态基础模型' },
        { en: 'spatial intelligence', zh: '空间智能' },
        { en: 'embodied AI', zh: '具身智能' },
        { en: '3D reconstruction & generation', zh: '3D 重建与生成' },
        { en: '4D scene understanding', zh: '4D 场景理解' },
      ],
    },

    /* WebGL hero scenes (ids are used by the HUD, the palette and hero-gl.js) */
    scenes: [
      { id: 'reconstruct', label: { en: 'Reconstruct', zh: '重建' }, hint: 'NeRF · SfM' },
      { id: 'splat', label: { en: 'Gaussians', zh: '高斯泼溅' }, hint: '3DGS' },
      { id: 'bricks', label: { en: 'Assemble', zh: '拼装' }, hint: 'TreeSBA' },
      { id: 'spacetime', label: { en: '4D', zh: '4D' }, hint: '4D3R' },
    ],
    sceneBySection: {
      hero: 'reconstruct',
      about: 'splat',
      news: 'spacetime',
      research: 'bricks',
      journey: 'reconstruct',
      recognition: 'splat',
      contact: 'spacetime',
    },

    /* ==================================================================== */
    about: {
      photo: {
        src: 'assets/img/avatar-960.jpg',
        small: 'assets/img/avatar-480.jpg',
        alt: { en: 'Portrait of Mengqi Guo holding a camera, taken in Athens', zh: '郭梦琦在雅典手持相机的肖像照' },
        place: { en: 'Athens', zh: '雅典' }, // where the photo was taken
        coords: '37.9838°N 23.7275°E',
      },
      paragraphs: [
        {
          en: "I’m a **Researcher at Huawei Norbert Wiener Research Center (Singapore)**, working on multimodal and spatial foundation models and embodied AI.",
          zh: '我是**华为维纳研究所（新加坡）的研究员**，专注于多模态与空间基础模型、具身智能。',
        },
        {
          en: 'I received my **Ph.D. from the [National University of Singapore](https://www.nus.edu.sg/) in 2026**, in the Computer Vision and Robotic Perception (CVRP) Lab, advised by [Prof. Gim Hee Lee](https://www.comp.nus.edu.sg/~leegh/). My research centered on 3D computer vision — sequential 3D reconstruction, understanding and generation.',
          zh: '我于 **2026 年在[新加坡国立大学](https://www.nus.edu.sg/)获得博士学位**，在计算机视觉与机器人感知（CVRP）实验室师从 [Gim Hee Lee 教授](https://www.comp.nus.edu.sg/~leegh/)。博士期间的研究聚焦 3D 计算机视觉，尤其是序列化的 3D 重建、理解与生成。',
        },
        {
          en: "Before NUS, I was a research intern in the [CCVL Lab](https://ccvl.jhu.edu/) at Johns Hopkins University under [Prof. Alan Yuille](https://www.cs.jhu.edu/~ayuille1/), and earned my B.S. in Computer Science and Technology from the ShenYuan Honors College at [Beihang University](https://ev.buaa.edu.cn/) in 2021, advised by [Prof. Si Liu](https://colalab.net/team/).",
          zh: '读博之前，我曾在约翰斯·霍普金斯大学 [CCVL 实验室](https://ccvl.jhu.edu/)跟随 [Alan Yuille 教授](https://www.cs.jhu.edu/~ayuille1/)担任研究实习生；2021 年毕业于[北京航空航天大学](https://ev.buaa.edu.cn/)沈元学院，获计算机科学与技术学士学位，导师为[刘偲教授](https://colalab.net/team/)。',
        },
      ],
      /* small "spec sheet" next to the portrait */
      specs: [
        { k: { en: 'Name', zh: '姓名' }, v: { en: 'Mengqi Guo · 郭梦琦', zh: '郭梦琦 · Mengqi Guo' } },
        { k: { en: 'Now', zh: '现在' }, v: { en: 'Huawei Norbert Wiener Research Center (Singapore)', zh: '华为维纳研究所（新加坡）' }, accent: true },
        { k: { en: 'Focus', zh: '方向' }, v: { en: 'Spatial foundation models · Embodied AI', zh: '空间基础模型 · 具身智能' } },
        { k: { en: 'Ph.D.', zh: '博士' }, v: { en: 'NUS ’26 · CVRP Lab', zh: 'NUS 2026 · CVRP 实验室' } },
        { k: { en: 'Base', zh: '所在地' }, v: { en: 'Singapore', zh: '新加坡' } },
      ],
      /* research thrusts (cards). `papers` are ids from the list below */
      thrusts: [
        {
          id: 'reconstruct',
          icon: 'cube',
          title: { en: 'Reconstruct', zh: '重建' },
          text: {
            en: 'Neural implicit fields, NeRF and Gaussian splatting — incremental and sequential reconstruction, from rolling-shutter captures to pose-free monocular dynamic video.',
            zh: '神经隐式场、NeRF 与高斯泼溅⁠——从卷帘⁠快门数据到免位姿的单目动态视频，涵盖增量与序列式重建。',
          },
          papers: ['4d3r', 'mvgsr', 'ursnerf', 'unikd'],
        },
        {
          id: 'understand',
          icon: 'eye',
          title: { en: 'Understand', zh: '理解' },
          text: {
            en: 'Semantic fields and part-level understanding that generalize across scenes and from synthetic to real domains.',
            zh: '可跨场景、跨合成到真实域泛化的语义场与部件级理解。',
          },
          papers: ['gnesf', 'udapart', 'partdisc'],
        },
        {
          id: 'generate',
          icon: 'layers',
          title: { en: 'Generate & assemble', zh: '生成与拼装' },
          text: {
            en: 'Sequential structure generation: learning how to build 3D objects step by step, brick by brick.',
            zh: '序列化的结构生成：学习如何一步一步、一块一块地搭建 3D 物体。',
          },
          papers: ['treesba'],
        },
        {
          id: 'now',
          icon: 'sparkle',
          now: true,
          title: { en: 'Now', zh: '当下' },
          text: {
            en: 'Multimodal and spatial foundation models, and embodied AI.',
            zh: '多模态与空间基础模型，以及具身智能。',
          },
          papers: [],
        },
      ],
    },

    /* ==================================================================== */
    /* type: paper | career | award      sort: 'YYYY-MM' (ordering only)     */
    news: [
      {
        type: 'career', date: '2026', sort: '2026-06',
        text: { en: 'Graduated from the **National University of Singapore** with a Ph.D. in Computer Science.', zh: '从**新加坡国立大学**毕业，获计算机科学博士学位。' },
      },
      {
        type: 'career', date: '2025', sort: '2025-08',
        text: { en: 'Joined **Huawei Norbert Wiener Research Center (Singapore)** as a Researcher.', zh: '加入**华为维纳研究所（新加坡）**，担任研究员。' },
      },
      {
        type: 'paper', date: '2025', sort: '2025-09', paper: '4d3r',
        text: { en: '[4D3R](https://arxiv.org/abs/2511.05229) is accepted at **NeurIPS 2025**!', zh: '论文 [4D3R](https://arxiv.org/abs/2511.05229) 被 **NeurIPS 2025** 接收！' },
      },
      {
        type: 'paper', date: '03.2025', sort: '2025-03', paper: 'mvgsr',
        text: { en: 'Released [MVGSR](https://mvgsr.github.io), multi-view consistent Gaussian splatting for robust surface reconstruction, on arXiv.', zh: '在 arXiv 发布 [MVGSR](https://mvgsr.github.io)：面向鲁棒表面重建的多视角一致高斯泼溅。' },
      },
      {
        type: 'paper', date: '07.2024', sort: '2024-07',
        text: { en: 'Three papers — [UNIKD](projects/UNIKD/), [TreeSBA](projects/TreeSBA/) and [URS-NeRF](https://boxuLibrary.github.io/projects/URS-NeRF/) — are accepted at **ECCV 2024**!', zh: '三篇论文 [UNIKD](projects/UNIKD/)、[TreeSBA](projects/TreeSBA/) 与 [URS-NeRF](https://boxuLibrary.github.io/projects/URS-NeRF/) 被 **ECCV 2024** 接收！' },
      },
      {
        type: 'award', date: '2024', sort: '2024-01',
        text: { en: 'Received the **Research Achievement Award** from NUS.', zh: '获得 NUS **研究成就奖**。' },
      },
      {
        type: 'paper', date: '2023', sort: '2023-09', paper: 'gnesf',
        text: { en: '[GNeSF](https://arxiv.org/abs/2310.15712) is accepted at **NeurIPS 2023**!', zh: '论文 [GNeSF](https://arxiv.org/abs/2310.15712) 被 **NeurIPS 2023** 接收！' },
      },
      {
        type: 'paper', date: '2023', sort: '2023-06', paper: 'heichole',
        text: { en: '[HeiChole](https://www.sciencedirect.com/science/article/pii/S1361841523000312) is published in **Medical Image Analysis**!', zh: '论文 [HeiChole](https://www.sciencedirect.com/science/article/pii/S1361841523000312) 发表于 **Medical Image Analysis**！' },
      },
      {
        type: 'paper', date: '06.2022', sort: '2022-06', paper: 'udapart',
        text: { en: '[UDA-Part](https://arxiv.org/abs/2103.14098) is accepted at **CVPR 2022 (Oral)**!', zh: '论文 [UDA-Part](https://arxiv.org/abs/2103.14098) 被 **CVPR 2022（Oral）** 接收！' },
      },
      {
        type: 'career', date: '08.2021', sort: '2021-08',
        text: { en: 'Joined the [CVRP Lab](https://www.comp.nus.edu.sg/~leegh/) at NUS as a Ph.D. student.', zh: '加入 NUS [CVRP 实验室](https://www.comp.nus.edu.sg/~leegh/)，开始博士学习。' },
      },
      {
        type: 'award', date: '07.2021', sort: '2021-07',
        text: { en: 'Awarded **Outstanding Graduate** at [Beihang University](https://ev.buaa.edu.cn/).', zh: '获[北京航空航天大学](https://ev.buaa.edu.cn/)**优秀毕业生**称号。' },
      },
      {
        type: 'career', date: '06.2020', sort: '2020-06',
        text: { en: 'Joined the [CCVL Lab](https://ccvl.jhu.edu/) at Johns Hopkins University as a research intern.', zh: '加入约翰斯·霍普金斯大学 [CCVL 实验室](https://ccvl.jhu.edu/)担任研究实习生。' },
      },
      {
        type: 'career', date: '10.2019', sort: '2019-10',
        text: { en: 'Joined [MEGVII Research](https://en.megvii.com/megvii_research) as a 3D vision research intern.', zh: '加入[旷视研究院（MEGVII Research）](https://en.megvii.com/megvii_research)担任 3D 视觉研究实习生。' },
      },
      {
        type: 'career', date: '06.2019', sort: '2019-06',
        text: { en: 'Joined the [VIE Lab](http://www.vie.group/team) at Peking University as a research intern.', zh: '加入北京大学 [VIE 实验室](http://www.vie.group/team)担任研究实习生。' },
      },
      {
        type: 'career', date: '09.2017', sort: '2017-09',
        text: { en: 'Joined the [ShenYuan Honors College](https://hc.buaa.edu.cn/) at Beihang University as an undergraduate.', zh: '进入北京航空航天大学[沈元学院](https://hc.buaa.edu.cn/)开始本科学习。' },
      },
      {
        type: 'award', date: '07.2017', sort: '2017-07',
        text: { en: 'Awarded **Outstanding Graduate** at [Shenzhen Experimental School (SZSY)](https://www.szsy.cn/).', zh: '获[深圳实验学校](https://www.szsy.cn/)**优秀毕业生**称号。' },
      },
    ],
    newsVisible: 6, // how many items before "show more"

    /* ==================================================================== */
    /* kind: conference | journal | preprint     display order = array order  */
    topics: [
      { id: 'gaussian', label: { en: 'Gaussian Splatting', zh: '高斯泼溅' } },
      { id: 'nerf', label: { en: 'NeRF / Implicit', zh: 'NeRF / 隐式表示' } },
      { id: 'dynamic', label: { en: 'Dynamic 4D', zh: '动态 4D' } },
      { id: 'semantic', label: { en: 'Semantics & Parts', zh: '语义与部件' } },
      { id: 'assembly', label: { en: 'Assembly', zh: '结构拼装' } },
    ],

    papers: [
      {
        id: '4d3r',
        short: '4D3R',
        title: '4D3R: Motion-Aware Neural Reconstruction and Rendering of Dynamic Scenes from Monocular Videos',
        authors: [a(ME), BOXU, a('Yanyan Li'), LEE],
        venue: 'NeurIPS', year: 2025, kind: 'conference',
        venueLong: { en: 'Advances in Neural Information Processing Systems 38 (NeurIPS 2025) · Poster', zh: '神经信息处理系统大会 NeurIPS 2025（Poster）' },
        badge: 'NeurIPS 2025',
        selected: true, isNew: true,
        tldr: {
          en: 'Pose-free novel-view synthesis for dynamic scenes from a single monocular video: motion-aware bundle adjustment refines camera poses, then a compact control-point Gaussian splatting model renders the motion efficiently.',
          zh: '面向单目视频动态场景的免位姿新视角合成：先用运动感知的 Bundle Adjustment 优化相机位姿，再以紧凑的控制点高斯泼溅高效建模并渲染运动。',
        },
        highlights: [
          { en: 'up to +1.8 dB PSNR', zh: 'PSNR 最高提升 1.8 dB' },
          { en: '5× lower compute', zh: '计算开销降至 1/5' },
        ],
        topics: ['gaussian', 'dynamic'],
        tags: ['gaussian-splatting', 'dynamic-scenes', 'novel-view-synthesis'],
        links: {
          arxiv: 'https://arxiv.org/abs/2511.05229',
          pdf: 'https://arxiv.org/pdf/2511.05229',
          code: 'https://github.com/dreamguo/4D3R',
          openreview: 'https://openreview.net/forum?id=FDX7EB9CDv',
          poster: 'https://neurips.cc/virtual/2025/loc/san-diego/poster/119055',
        },
        repo: 'dreamguo/4D3R', stars: 2,
        teaser: { type: 'procedural', scene: 'spacetime', alt: { en: 'Animated point-cloud illustration of a dynamic scene', zh: '动态场景的点云动画示意图' } },
        bib: { type: 'inproceedings', booktitle: 'Advances in Neural Information Processing Systems (NeurIPS)' },
      },
      {
        id: 'mvgsr',
        short: 'MVGSR',
        title: 'MVGSR: Multi-View Consistency Gaussian Splatting for Robust Surface Reconstruction',
        authors: [a('Chenfeng Hou'), a('Qi Xun Yeo'), a(ME), a('Yongxin Su'), a('Yanyan Li'), LEE],
        venue: 'arXiv', year: 2025, kind: 'preprint',
        venueLong: { en: 'arXiv preprint arXiv:2503.08093', zh: 'arXiv 预印本 arXiv:2503.08093' },
        badge: 'arXiv 2025',
        selected: false,
        tldr: {
          en: 'A Gaussian-splatting surface reconstruction method that uses multi-view feature consistency to mask distractors and prune floaters, giving cleaner meshes and renderings in scenes with dynamic objects.',
          zh: '基于高斯泼溅的表面重建方法：利用多视角特征一致性屏蔽干扰物并抑制漂浮伪影，在含动态物体的场景中得到更干净的网格与渲染。',
        },
        topics: ['gaussian'],
        tags: ['gaussian-splatting', 'surface-reconstruction', 'distractors'],
        links: { arxiv: 'https://arxiv.org/abs/2503.08093', pdf: 'https://arxiv.org/pdf/2503.08093', project: 'https://mvgsr.github.io' },
        teaser: { type: 'procedural', scene: 'splat', alt: { en: 'Animated Gaussian-splat illustration', zh: '高斯泼溅动画示意图' } },
        bib: { type: 'article', journal: 'arXiv preprint arXiv:2503.08093' },
      },
      {
        id: 'treesba',
        short: 'TreeSBA',
        title: 'TreeSBA: Tree-Transformer for Self-Supervised Sequential Brick Assembly',
        authors: [a(ME, 'https://dreamguo.github.io/', { eq: true }), a('Chen Li', 'https://chaneyddtt.github.io/', { eq: true }), a('Yuyang Zhao', 'https://yuyangzhao.com/'), LEE],
        eqNote: true,
        venue: 'ECCV', year: 2024, kind: 'conference',
        venueLong: { en: 'European Conference on Computer Vision (ECCV 2024)', zh: '欧洲计算机视觉大会 ECCV 2024' },
        badge: 'ECCV 2024',
        selected: true,
        tldr: {
          en: 'A class-agnostic tree-transformer predicts step-by-step LEGO assembly actions from multi-view images, learning from real images without action labels via silhouette-projection self-supervision.',
          zh: '一种类别无关的树状 Transformer，从多视角图像预测逐步的乐高拼装动作；借助轮廓投影的自监督，无需真实动作标注即可在真实图像上学习。',
        },
        topics: ['assembly'],
        tags: ['sequential-assembly', 'transformer', 'self-supervised'],
        links: {
          project: 'projects/TreeSBA/',
          arxiv: 'https://arxiv.org/abs/2407.15648',
          pdf: 'https://arxiv.org/pdf/2407.15648',
          code: 'https://github.com/dreamguo/TreeSBA',
        },
        repo: 'dreamguo/TreeSBA', stars: 7,
        teaser: { type: 'image', src: 'assets/img/papers/treesba.jpg', video: 'assets/video/treesba-assembly.mp4', alt: { en: 'TreeSBA teaser: multi-view images and predicted LEGO assembly sequence', zh: 'TreeSBA 概览图：多视角图像与预测的乐高拼装序列' } },
        bib: { type: 'inproceedings', booktitle: 'European Conference on Computer Vision (ECCV)' },
      },
      {
        id: 'unikd',
        short: 'UNIKD',
        title: 'UNIKD: UNcertainty-filtered Incremental Knowledge Distillation for Neural Implicit Representation',
        authors: [a(ME, 'https://dreamguo.github.io/'), CHEN_LI, HANLIN, LEE],
        venue: 'ECCV', year: 2024, kind: 'conference',
        venueLong: { en: 'European Conference on Computer Vision (ECCV 2024)', zh: '欧洲计算机视觉大会 ECCV 2024' },
        badge: 'ECCV 2024',
        selected: true,
        tldr: {
          en: 'Keeps NeRF and neural SDF models learning from streaming views without forgetting: it distills from the previous model while an uncertainty branch filters that model’s unreliable predictions.',
          zh: '让 NeRF / 神经 SDF 在流式输入的新视角上持续学习而不遗忘：以旧模型为教师做知识蒸馏，并用不确定性分支过滤其不可靠的预测。',
        },
        topics: ['nerf'],
        tags: ['neural-implicit', 'continual-learning', 'distillation'],
        links: {
          project: 'projects/UNIKD/',
          arxiv: 'https://arxiv.org/abs/2212.10950',
          pdf: 'https://arxiv.org/pdf/2212.10950',
          code: 'https://github.com/dreamguo/UNIKD',
        },
        repo: 'dreamguo/UNIKD', stars: 3,
        teaser: { type: 'image', src: 'assets/img/papers/unikd.jpg', alt: { en: 'UNIKD teaser: incremental neural implicit reconstruction', zh: 'UNIKD 概览图：增量式神经隐式重建' } },
        bib: { type: 'inproceedings', booktitle: 'European Conference on Computer Vision (ECCV)' },
      },
      {
        id: 'ursnerf',
        short: 'URS-NeRF',
        title: 'URS-NeRF: Unordered Rolling Shutter Bundle Adjustment for Neural Radiance Fields',
        authors: [BOXU, a('Ziao Liu'), a(ME, 'https://dreamguo.github.io/'), a('Jiancheng Li'), LEE],
        venue: 'ECCV', year: 2024, kind: 'conference',
        venueLong: { en: 'European Conference on Computer Vision (ECCV 2024)', zh: '欧洲计算机视觉大会 ECCV 2024' },
        badge: 'ECCV 2024',
        selected: true,
        tldr: {
          en: 'Trains NeRF on unordered rolling-shutter photos by jointly estimating camera poses and velocities, then repairs bad poses with epipolar checks in a coarse-to-fine pipeline.',
          zh: '面向无序卷帘⁠快门图像训练 NeRF：联合估计相机位姿与运动速度，并通过对极几何检验以由粗到精的方式修正不良位姿。',
        },
        topics: ['nerf'],
        tags: ['rolling-shutter', 'bundle-adjustment', 'nerf'],
        links: {
          project: 'https://boxuLibrary.github.io/projects/URS-NeRF/',
          arxiv: 'https://arxiv.org/abs/2403.10119',
          pdf: 'https://arxiv.org/pdf/2403.10119',
          code: 'https://github.com/ZiaoLiuS/URS-NERF',
        },
        teaser: { type: 'image', src: 'assets/img/papers/urs-nerf.jpg', alt: { en: 'URS-NeRF teaser: rolling-shutter neural radiance field reconstruction', zh: 'URS-NeRF 概览图：卷帘⁠快门神经辐射场重建' } },
        bib: { type: 'inproceedings', booktitle: 'European Conference on Computer Vision (ECCV)' },
      },
      {
        id: 'gnesf',
        short: 'GNeSF',
        title: 'GNeSF: Generalizable Neural Semantic Fields',
        authors: [HANLIN, CHEN_LI, a(ME), a('Zhiwen Yan', 'https://jokeryan.github.io/about/'), LEE],
        venue: 'NeurIPS', year: 2023, kind: 'conference',
        venueLong: { en: 'Advances in Neural Information Processing Systems 36 (NeurIPS 2023)', zh: '神经信息处理系统大会 NeurIPS 2023' },
        badge: 'NeurIPS 2023',
        selected: true,
        tldr: {
          en: 'A generalizable 3D segmentation framework that labels unseen scenes without per-scene optimization, using soft voting over multi-view 2D semantics and a visibility module that discounts occluded views.',
          zh: '可泛化的 3D 语义分割框架：无需逐场景优化即可分割未见场景，方法是对多视角 2D 语义做软投票，并用可见性模块降低被遮挡视角的权重。',
        },
        topics: ['nerf', 'semantic'],
        tags: ['semantic-fields', 'generalizable-nerf', '3d-segmentation'],
        links: { arxiv: 'https://arxiv.org/abs/2310.15712', pdf: 'https://arxiv.org/pdf/2310.15712', code: 'https://github.com/HLinChen/GNeSF' },
        teaser: { type: 'image', src: 'assets/img/papers/gnesf.jpg', alt: { en: 'GNeSF teaser: generalizable neural semantic fields', zh: 'GNeSF 概览图：可泛化的神经语义场' } },
        bib: { type: 'inproceedings', booktitle: 'Advances in Neural Information Processing Systems (NeurIPS)' },
      },
      {
        id: 'udapart',
        short: 'UDA-Part',
        title: 'Learning Part Segmentation Through Unsupervised Domain Adaptation from Synthetic Vehicles',
        authors: [
          a('Qing Liu', 'https://qliu24.github.io/'), a('Adam Kortylewski', 'https://genintel.de/'),
          a('Zhishuai Zhang', 'https://scholar.google.com/citations?user=8gRM3xMAAAAJ&hl=en'), a('Zizhang Li', 'https://kyleleey.github.io/'),
          a(ME), a('Qihao Liu', 'https://qihao067.github.io/'), a('Xiaoding Yuan', 'https://scholar.google.com/citations?user=p7QTY-cAAAAJ&hl=en'),
          a('Jiteng Mu', 'https://jitengmu.github.io/'), a('Weichao Qiu', 'https://scholar.google.com.hk/citations?user=9_AUwFUAAAAJ&hl=zh-TW'), YUILLE,
        ],
        venue: 'CVPR', year: 2022, kind: 'conference', award: 'Oral',
        venueLong: { en: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR 2022) · Oral', zh: 'IEEE/CVF 计算机视觉与模式识别大会 CVPR 2022（Oral）' },
        badge: 'CVPR 2022',
        selected: true,
        tldr: {
          en: 'Introduces UDA-Part, a synthetic-to-real vehicle part-segmentation benchmark built on labeled 3D CAD models, plus a geometric-matching method that uses object structure to guide domain adaptation.',
          zh: '提出 UDA-Part：基于带标注 3D CAD 模型的合成到真实车辆部件分割基准，并给出利用物体空间结构引导域适应的几何匹配方法。',
        },
        topics: ['semantic'],
        tags: ['part-segmentation', 'domain-adaptation', 'synthetic-data'],
        links: {
          project: 'https://qliu24.github.io/udapart/',
          arxiv: 'https://arxiv.org/abs/2103.14098',
          pdf: 'https://openaccess.thecvf.com/content/CVPR2022/papers/Liu_Learning_Part_Segmentation_Through_Unsupervised_Domain_Adaptation_From_Synthetic_Vehicles_CVPR_2022_paper.pdf',
          code: 'https://github.com/qliu24/render-3d-segmentation',
        },
        codeLabel: { en: 'Dataset code', zh: '数据集代码' }, // the repo is the benchmark / data-rendering code
        teaser: { type: 'image', src: 'assets/img/papers/cgpart.jpg', alt: { en: 'UDA-Part teaser: synthetic vehicle part segmentation', zh: 'UDA-Part 概览图：合成车辆的部件分割' } },
        bib: { type: 'inproceedings', booktitle: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)' },
      },
      {
        id: 'heichole',
        short: 'HeiChole',
        title: 'Comparative validation of machine learning algorithms for surgical workflow and skill analysis with the HeiChole benchmark',
        authors: [a('Martin Wagner'), ELLIPSIS, a(ME), ELLIPSIS, a('Sebastian Bodenstedt')],
        authorsNote: { en: '49 authors', zh: '共 49 位作者' },
        venue: 'Medical Image Analysis', year: 2023, kind: 'journal',
        venueLong: { en: 'Medical Image Analysis, vol. 86, 102770', zh: 'Medical Image Analysis，第 86 卷，102770' },
        badge: 'MedIA 2023',
        selected: false,
        tldr: {
          en: 'A large collaborative benchmark comparing machine-learning methods for surgical workflow and skill analysis (EndoVis sub-challenge).',
          zh: '大型合作基准研究：比较各类机器学习方法在手术流程与技能分析上的表现（EndoVis 子挑战赛）。',
        },
        topics: [],
        tags: ['medical', 'surgical-workflow', 'benchmark'],
        links: {
          journal: 'https://www.sciencedirect.com/science/article/pii/S1361841523000312',
          dataset: 'https://endovissub-workflowandskill.grand-challenge.org/',
        },
        bib: { type: 'article', journal: 'Medical Image Analysis', volume: '86', pages: '102770', author: 'Wagner, Martin and others' },
      },
      {
        id: 'partdisc',
        short: 'Part Discovery',
        title: 'Unsupervised Part Discovery via Feature Alignment',
        authors: [a(ME), a('Yutong Bai'), a('Zhishuai Zhang'), a('Adam Kortylewski'), YUILLE],
        venue: 'arXiv', year: 2020, kind: 'preprint',
        venueLong: { en: 'arXiv preprint arXiv:2012.00313', zh: 'arXiv 预印本 arXiv:2012.00313' },
        badge: 'arXiv 2020',
        selected: false,
        tldr: {
          en: 'Learns object parts without annotations by aligning feature maps across similar-pose images of a category and using the averaged alignment as training targets.',
          zh: '无需标注地发现物体部件：对同类别相似姿态图像的特征图做对齐，并把平均对齐结果作为训练目标。',
        },
        topics: ['semantic'],
        tags: ['unsupervised', 'part-discovery'],
        links: { arxiv: 'https://arxiv.org/abs/2012.00313', pdf: 'https://arxiv.org/pdf/2012.00313' },
        bib: { type: 'article', journal: 'arXiv preprint arXiv:2012.00313' },
      },
    ],

    /* ==================================================================== */
    /* kind: work | edu | intern     mono: 1–3 char monogram for the tile     */
    journey: [
      {
        kind: 'work', current: true, mono: 'H',
        period: { en: '2025 — Present', zh: '2025 — 至今' },
        org: { en: 'Huawei Norbert Wiener Research Center (Singapore)', zh: '华为维纳研究所（新加坡）' },
        role: { en: 'Researcher', zh: '研究员' },
        place: { en: 'Singapore', zh: '新加坡' },
        note: {
          en: 'Working on multimodal and spatial foundation models and embodied AI.',
          zh: '从事多模态与空间基础模型、具身智能方向的研究与开发。',
        },
      },
      {
        kind: 'edu', mono: 'NUS',
        period: { en: '2021 — 2026', zh: '2021 — 2026' },
        org: { en: 'National University of Singapore\u00A0· CVRP Lab', zh: '新加坡国立大学 · CVRP 实验室' }, orgUrl: 'https://www.nus.edu.sg/',
        role: { en: 'Ph.D. in Computer Science', zh: '计算机科学博士' },
        place: { en: 'Singapore', zh: '新加坡' },
        note: {
          en: 'Advised by [Prof. Gim Hee Lee](https://www.comp.nus.edu.sg/~leegh/). 3D reconstruction, understanding and generation; NeurIPS ×2, ECCV ×3. Research Achievement Award 2024.',
          zh: '导师为 [Gim Hee Lee 教授](https://www.comp.nus.edu.sg/~leegh/)。研究 3D 重建、理解与生成；NeurIPS ×2、ECCV ×3。2024 年获研究成就奖。',
        },
      },
      {
        kind: 'intern', mono: 'JHU',
        period: { en: '2020', zh: '2020' },
        org: { en: 'Johns Hopkins University\u00A0· CCVL', zh: '约翰斯·霍普金斯大学 · CCVL' }, orgUrl: 'https://ccvl.jhu.edu/',
        role: { en: 'Research Intern', zh: '研究实习生' },
        note: {
          en: 'Part discovery and part segmentation with [Prof. Alan Yuille](https://www.cs.jhu.edu/~ayuille1/) — including the CVPR 2022 Oral paper.',
          zh: '在 [Alan Yuille 教授](https://www.cs.jhu.edu/~ayuille1/)指导下研究部件发现与部件分割，成果包括 CVPR 2022 Oral 论文。',
        },
      },
      {
        kind: 'intern', mono: 'MV',
        period: { en: '2019', zh: '2019' },
        org: { en: 'MEGVII Research', zh: '旷视研究院' }, orgUrl: 'https://en.megvii.com/megvii_research',
        role: { en: '3D Vision Research Intern', zh: '3D 视觉研究实习生' },
      },
      {
        kind: 'intern', mono: 'PKU',
        period: { en: '2019', zh: '2019' },
        org: { en: 'Peking University\u00A0· VIE Lab', zh: '北京大学 · VIE 实验室' }, orgUrl: 'http://www.vie.group/team',
        role: { en: 'Research Intern', zh: '研究实习生' },
      },
      {
        kind: 'edu', mono: 'BUAA',
        period: { en: '2017 — 2021', zh: '2017 — 2021' },
        org: { en: 'Beihang University\u00A0· ShenYuan Honors College', zh: '北京航空航天大学 · 沈元学院' }, orgUrl: 'https://ev.buaa.edu.cn/',
        role: { en: 'B.S. in Computer Science and Technology', zh: '计算机科学与技术学士' },
        place: { en: 'Beijing', zh: '北京' },
        note: {
          en: 'Advised by [Prof. Si Liu](https://colalab.net/team/). Outstanding Graduate, 2021.',
          zh: '导师为[刘偲教授](https://colalab.net/team/)。2021 年获优秀毕业生称号。',
        },
      },
    ],

    /* ==================================================================== */
    awards: [
      { year: '2024', title: { en: 'Research Achievement Award', zh: '研究成就奖' }, org: { en: 'National University of Singapore', zh: '新加坡国立大学' } },
      { year: '2021', title: { en: 'Research Scholarship', zh: '研究奖学金' }, org: { en: 'National University of Singapore', zh: '新加坡国立大学' } },
      { year: '2021', title: { en: 'Outstanding Graduate', zh: '优秀毕业生' }, org: { en: 'Beihang University', zh: '北京航空航天大学' } },
      { year: '2017', title: { en: 'Outstanding Graduate', zh: '优秀毕业生' }, org: { en: 'Shenzhen Experimental School (SZSY)', zh: '深圳实验学校' } },
    ],
    service: {
      title: { en: 'Reviewer', zh: '审稿人' },
      items: ['CVPR', 'ICCV', 'NeurIPS', 'ICLR', 'AAAI', 'ACM MM', 'TVCG'],
    },
    skills: [
      { group: { en: 'Languages', zh: '编程语言' }, items: ['Python', 'C/C++', 'Java', 'MATLAB'] },
      { group: { en: 'Frameworks & tools', zh: '框架与工具' }, items: ['PyTorch', 'TensorFlow', 'Linux'] },
    ],

    /* ==================================================================== */
    /* Shared UI strings. Modules add their own with Site.addStrings().      */
    ui: {
      'meta.title': { en: 'Mengqi Guo 郭梦琦 — Spatial AI & 3D Vision', zh: '郭梦琦（Mengqi Guo）— 空间智能与 3D 视觉' },
      'meta.description': {
        en: 'Mengqi Guo, Researcher at Huawei Norbert Wiener Research Center (Singapore). NUS Ph.D. (2026). Spatial foundation models, embodied AI, 3D/4D vision.',
        zh: '郭梦琦（Mengqi Guo），华为维纳研究所（新加坡）研究员，2026 年博士毕业于新加坡国立大学。研究多模态与空间基础模型、具身智能与 3D 视觉。',
      },

      'nav.about': { en: 'About', zh: '关于' },
      'nav.news': { en: 'News', zh: '动态' },
      'nav.research': { en: 'Research', zh: '研究' },
      'nav.journey': { en: 'Journey', zh: '经历' },
      'nav.recognition': { en: 'Recognition', zh: '荣誉' },
      'nav.contact': { en: 'Contact', zh: '联系' },

      'sec.about.title': { en: 'Seeing the world in *3D*', zh: '用 *3D* 看世界' },
      'sec.about.kicker': { en: 'From 3D vision research to spatial foundation models.', zh: '从 3D 视觉研究走向空间基础模型。' },
      'sec.news.title': { en: 'Latest *signals*', zh: '最新*动态*' },
      'sec.news.kicker': { en: 'Papers, career and awards, newest first.', zh: '论文、经历与荣誉，按时间倒序。' },
      'sec.research.title': { en: 'Selected *research*', zh: '代表性*研究*' },
      'sec.research.kicker': { en: 'Reconstruction, understanding and generation of the 3D world — from NeRF to Gaussian splatting to 4D.', zh: '3D 世界的重建、理解与生成⁠——从 NeRF、高斯泼溅到 4D。' },
      'sec.journey.title': { en: 'The *path* so far', zh: '一路走来的*足迹*' },
      'sec.journey.kicker': { en: 'Where I’ve studied and worked.', zh: '求学与工作的每一站。' },
      'sec.recognition.title': { en: 'Recognition & *service*', zh: '荣誉与学术*服务*' },
      'sec.recognition.kicker': { en: 'Awards, scholarships and academic service.', zh: '奖项、奖学金与学术服务。' },
      'sec.contact.title': { en: "Let’s *talk*", zh: '来*聊聊*吧' },
      'sec.contact.kicker': { en: 'Always happy to chat about 3D vision, spatial foundation models and embodied AI.', zh: '欢迎交流 3D 视觉、空间基础模型与具身智能。' },

      'hero.eyebrow': { en: 'Singapore · 1.3521°N 103.8198°E', zh: '新加坡 · 1.3521°N 103.8198°E' },
      'hero.role': { en: 'Researcher', zh: '研究员' },
      'hero.org': { en: 'Huawei Norbert Wiener Research Center (Singapore)', zh: '华为维纳研究所（新加坡）' },
      'hero.lede': {
        en: 'I work on multimodal and spatial foundation models and embodied AI. I earned my Ph.D. at NUS in 2026, teaching machines to reconstruct, understand and generate the 3D world.',
        zh: '我从事多模态与空间基础模型、具身智能的研究与开发。2026 年博士毕业于 NUS，读博期间教会了机器重建、理解并生成 3D 世界。',
      },
      'hero.hiring.tag': { en: 'Hiring', zh: '招募中' },
      'hero.hiring.text': {
        en: 'I am looking for prospective interns\u00A0/ PhD students to work on 3D\u00A0/ 4D\u00A0/ embodied AI. Feel free to [drop an email](mailto:im.guomengqi@gmail.com) if you are interested in working with me.',
        zh: '我正在招募实习生\u00A0/ 博士生，研究方向为 3D\u00A0/ 4D\u00A0/ 具身智能。如果你有兴趣和我一起工作，欢迎[发邮件](mailto:im.guomengqi@gmail.com)联系我。',
      },
      'hero.cta.research': { en: 'Explore research', zh: '浏览研究' },
      'hero.cta.contact': { en: 'Get in touch', zh: '联系我' },
      'hero.hint': { en: 'Drag to orbit · scroll to explore', zh: '拖动旋转 · 滚动探索' },
      'hero.scroll': { en: 'Scroll', zh: '向下滚动' },
      'hero.scroll.aria': { en: 'Scroll to About', zh: '向下滚动到“关于”' },
      'hero.aria.intro': { en: 'Introduction', zh: '个人简介' },
      'hero.aria.hud': { en: '3D scene controls', zh: '3D 场景控制' },

      'common.copy': { en: 'Copy', zh: '复制' },
      'common.copied': { en: 'Copied', zh: '已复制' },
      'common.more': { en: 'Show more', zh: '展开更多' },
      'common.less': { en: 'Show less', zh: '收起' },
      'common.newtab': { en: ' (opens in a new tab)', zh: '（在新标签页打开）' },
      'aria.theme': { en: 'Toggle light / dark theme', zh: '切换浅色 / 深色主题' },
      'aria.lang': { en: 'Switch language', zh: '切换语言' },
      'aria.skip': { en: 'Skip to content', zh: '跳到正文' },
      'aria.home': { en: 'Back to top', zh: '回到顶部' },
    },
  };
})();
