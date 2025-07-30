---
layout: archive
title: ""
# permalink: /about/
permalink: /
author_profile: true
redirect_from:
  - /about/
  - /about.html
  # - /
---

I am currently a Ph.D. candidate in the Computer Vision and Robotic Perception (CVRP) laboratory at <strong>National University of Singapore (NUS)</strong>, supervised by [Prof. Gim Hee Lee](https://www.comp.nus.edu.sg/~leegh/).  My research interests lie in 3D computer vision, especially in sequential 3D reconstruction, understanding and generation.
Before entering NUS, I was a research intern in Computational Cognition, Vision, and Learning (CCVL) laboratory at Johns Hopkins University under [Prof. Alan Yuille](https://www.cs.jhu.edu/~ayuille/). I recived my B.S. degree in Computer Science and Technology from ShenYuan Honors College at [Beihang University](https://ev.buaa.edu.cn/) in 2021, advised by [Prof. Si Liu](https://colalab.net/people).


News
======
<style>
  .news-container p {
    margin: 5px 0; /* 调整段落间距 */
    line-height: 1.2; /* 调整行高 */
  }

  .show-more-link {
    text-align: center;
    display: block;
    margin-top: 10px;
  }
</style>

<div class="news-container">
  <p>🚀 [07.2024] Three papers <a href="projects/UNIKD/">UNIKD</a> <a href="projects/TreeSBA/">TreeSBA</a> <a href="https://boxuLibrary.github.io/projects/URS-NeRF/">URS-NeRF</a> are accepted at ECCV 2024!!</p>
  <p>🚀 [03.2024] One paper <a href="https://arxiv.org/pdf/2310.15712.pdf">GNeSF</a> is accepted at NeurIPS 2023!</p>
  <p>🚀 [06.2023] One paper <a href="https://www.sciencedirect.com/science/article/pii/S1361841523000312">HeiChole</a> is accepted at Medical Image Analysis 2023!</p>
  <p>🚀 [06.2022] One paper <a href="https://arxiv.org/pdf/2103.14098">CGPart</a> is accepted at CVPR 2022 (oral)!</p>

  <div id="hidden-news" style="display: none;">
  <p>😎 [08.2021] Joined <a href="https://www.comp.nus.edu.sg/~leegh/">CVRP Lab</a> at NUS as a Ph.D. student!</p>
  <p>👨‍🎓 [07.2021] Awarded Outstanding Graduate in <a href="https://ev.buaa.edu.cn/">Beihang University</a>!</p>
  <p>🙇 [06.2020] Joined <a href="https://ccvl.jhu.edu/">CCVL Lab</a> at JHU as a research intern!</p>
  <p>🙇 [10.2019] Joined <a href="https://en.megvii.com/megvii_research">MEGVII Research</a> as a 3D vision research intern!</p>
  <p>🙇 [06.2019] Joined <a href="http://www.vie.group/team">VIE Lab</a> at PKU as a research intern!</p>
  <p>😎 [09.2017] Joined <a href="https://hc.buaa.edu.cn/">ShenYuan Honors College</a> at Beihang University as an undergraduate!</p>
  <p>👨‍🎓 [07.2017] Awarded Outstanding Graduate in <a href="http://www.szsy.cn/">SZSY High School</a>!</p>
    <!-- <p>🏆 [15.03.2024] Received the .</p> -->
    <!-- 你可以在这里添加更多隐藏的新闻项 -->
  </div>
</div>

<a href="#" class="show-more-link" id="show-more-link">⬇ SHOW MORE ⬇</a>

<script>
  document.getElementById('show-more-link').addEventListener('click', function(event) {
    event.preventDefault();
    var hiddenNews = document.getElementById('hidden-news');
    if (hiddenNews.style.display === 'none') {
      hiddenNews.style.display = 'block';
      this.textContent = '⬆ SHOW LESS ⬆';
    } else {
      hiddenNews.style.display = 'none';
      this.textContent = '⬇ SHOW MORE ⬇';
    }
  });
</script>



Featured Works
======


<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/UNIKD.gif" alt="UNIKD: UNcertainty-Filtered Incremental Knowledge Distillation for Neural Implicit Representation" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="projects/UNIKD/" style="text-decoration: none;">UNIKD: UNcertainty-Filtered Incremental Knowledge Distillation for Neural Implicit Representation</a></h3>
    <p style="margin: 5px 0;">
      <strong>Mengqi Guo</strong>,
      <a href="https://chaneyddtt.github.io/">Chen Li</a>,
      <a href="https://hlinchen.github.io/">Hanlin Chen</a>,
      <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
      <br>
      ECCV, 2024
      <!-- <span style="color: red;">ECCV, 2024</span> -->
      <br>
      <a href="projects/UNIKD/" style="text-decoration: none;">[Project Page]</a>
      <a href="https://arxiv.org/pdf/2212.10950" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/dreamguo/UNIKD" style="text-decoration: none;">[Code]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/TreeSBA.gif" alt="TreeSBA: Tree-Transformer for Self-Supervised Sequential Brick Assembly" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="projects/TreeSBA/" style="text-decoration: none;">TreeSBA: Tree-Transformer for Self-Supervised Sequential Brick Assembly</a></h3>
    <p style="margin: 5px 0;">
      <strong>Mengqi Guo*</strong>,
      <a href="https://chaneyddtt.github.io/">Chen Li*</a>,
      <a href="https://yuyangzhao.com/">Yuyang Zhao</a>,
      <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
      <br>
      ECCV, 2024
      <!-- <span style="color: red;">ECCV, 2024</span> -->
      <br>
      <a href="projects/TreeSBA/" style="text-decoration: none;">[Project Page]</a>
      <a href="https://arxiv.org/pdf/2407.15648" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/dreamguo/TreeSBA/" style="text-decoration: none;">[Code]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/URS-NeRF2.gif" alt="URS-NeRF: Unordered Rolling Shutter Bundle Adjustment for Neural Radiance Fields" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://boxuLibrary.github.io/projects/URS-NeRF/" style="text-decoration: none;">URS-NeRF: Unordered Rolling Shutter Bundle Adjustment for Neural Radiance Fields</a></h3>
    <p style="margin: 10px 0;">
      <a href="https://boxuLibrary.github.io/">Bo Xu</a>,
      <a href="">Ziao Liu</a>,
      <strong>Mengqi Guo</strong>,
      <a href="">Jiancheng Li</a>,
      <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
      <br>
      ECCV, 2024
      <!-- <span style="color: red;">ECCV, 2024</span> -->
      <br>
      <a href="https://boxuLibrary.github.io/projects/URS-NeRF/" style="text-decoration: none;">[Project Page]</a>
      <a href="https://arxiv.org/pdf/2403.10119" style="text-decoration: none;">[PDF]</a>
      <a href="https://boxuLibrary.github.io/projects/URS-NeRF/" style="text-decoration: none;">[Code]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/GNeSF.jpg" alt="GNeSF: Generalizable Neural Semantic Fields" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2310.15712.pdf" style="text-decoration: none;">GNeSF: Generalizable Neural Semantic Fields</a></h3>
    <p style="margin: 5px 0;">
      <a href="https://hlinchen.github.io/">Hanlin Chen</a>,
      <a href="https://chaneyddtt.github.io/">Chen Li</a>,
      <strong>Mengqi Guo</strong>,
      <a href="https://jokeryan.github.io/about/">Zhiwen Yan</a>,
      <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
      <br>
      NeurIPS, 2023<br>
      <a href="https://hlinchen.github.io/projects/VCR-GauS/" style="text-decoration: none;">[Project Page]</a>
      <a href="https://arxiv.org/pdf/2310.15712.pdf" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/HLinChen/GNeSF" style="text-decoration: none;">[Code]</a>
    </p>
  </div>
</div>


<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/cgpart.jpg" alt="Learning Part Segmentation Through Unsupervised Domain Adaptation from Synthetic Vehicles." style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://openaccess.thecvf.com/content/CVPR2022/papers/Liu_Learning_Part_Segmentation_Through_Unsupervised_Domain_Adaptation_From_Synthetic_Vehicles_CVPR_2022_paper.pdf" style="text-decoration: none;">Learning Part Segmentation Through Unsupervised Domain Adaptation from Synthetic Vehicles</a></h3>
    <p style="margin: 5px 0;">
      <a href="https://qliu24.github.io/">Qing Liu</a>,
      <a href="https://gvrl.mpi-inf.mpg.de/">Adam Kortylewski</a>,
      <a href="https://scholar.google.com/citations?user=8gRM3xMAAAAJ&hl=en">Zhishuai Zhang</a>,
      <a href="https://kyleleey.github.io/">Zizhang Li</a>,
      <strong>Mengqi Guo</strong>,
      <a href="https://qihao067.github.io/">Qihao Liu</a>,
      <a href="https://scholar.google.com/citations?user=p7QTY-cAAAAJ&hl=en">Xiaoding Yuan</a>,
      <a href="https://jitengmu.github.io/">Jiteng Mu</a>,
      <a href="https://scholar.google.com.hk/citations?user=9_AUwFUAAAAJ&hl=zh-TW">Weichao Qiu</a>,
      <a href="https://www.cs.jhu.edu/~ayuille/">Alan Yuille</a>,
      <br>
      CVPR, 2022 (Oral)<br>
      <a href="https://qliu24.github.io/udapart/" style="text-decoration: none;">[Project Page]</a>
      <a href="https://openaccess.thecvf.com/content/CVPR2022/papers/Liu_Learning_Part_Segmentation_Through_Unsupervised_Domain_Adaptation_From_Synthetic_Vehicles_CVPR_2022_paper.pdf" style="text-decoration: none;">[PDF]</a>
    </p>
  </div>
</div>


Other Publications / Preprints
------

- **Mengqi Guo**, Yutong Bai, Zhishuai Zhang, Adam Kortylewski, Alan Yuille. [Unsupervised Part Discovery via Feature Alignment](https://arxiv.org/pdf/2012.00313). ArXiv.

- Martin Wagner, …, **Mengqi Guo**, …, Sebastian Bodenstedt. [Comparative validation of machine learning algorithms for surgical workflow and skill analysis with the heichole benchmark](https://www.sciencedirect.com/science/article/pii/S1361841523000312). Medical Image Analysis (MedIA), 2023 [[Dataset](https://endovissub-workflowandskill.grand-challenge.org/)]

Awards
------
- Research Achievement Award, National University of Singapore, 2024

- Research Scholarship, National University of Singapore, 2021

- Awarded Outstanding Graduate, Beihang University, 2021

Professional Service
------
Conference Reviewer: CVPR, ICCV, NeurIPS, ACM MM

<div style="width: 100px; height: 100px; display: block; align-items: center; margin-top: 40px; margin-bottom: 40px;">
  <script type="text/javascript" id="clstr_globe" src="//clustrmaps.com/globe.js?d=76q_kvp9C9IdUxxL6culGaZYcQGVaYsIH-LMQGUf1uU =10x10"></script>
</div>
