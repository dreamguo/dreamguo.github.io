---
layout: archive
title: "About Myself"
# permalink: /about/
permalink: /
author_profile: true
redirect_from:
  - /about/
  - /about.html
  # - /
---

I am currently a Ph.D. candidate in the Computer Vision and Robotic Perception (CVRP) laboratory at <strong>National University of Singapore (NUS)</strong>, supervised by [Prof. Gim Hee Lee](https://www.comp.nus.edu.sg/~leegh/). Before entering NUS, I was an research intern in Computational Cognition, Vision, and Learning (CCVL) laboratory at Johns Hopkins University under [Prof. Alan Yuille](https://www.cs.jhu.edu/~ayuille/). I recived my B.S. degree in Computer Science and Technology from [Shenyuan Honors School at Beihang University](https://hc.buaa.edu.cn/) in 2021, advised by [Prof. Si Liu](https://colalab.net/people). My research interests lie in 3D computer vision, especially in sequential 3D reconstruction and generation.


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
  <p>😎 [07.2024] Three papers <a href="https://dreamguo.github.io/">UNIKD</a> <a href="https://dreamguo.github.io/">TreeSBA</a> <a href="https://dreamguo.github.io/">URS-NeRF</a> are accepted at ECCV 2024!!</p>
  <p>😎 [03.2024] One paper <a href="https://arxiv.org/pdf/2310.15712.pdf">GNeSF</a> is accepted at NeurIPS 2023!</p>
  <p>😎 [06.2023] One paper <a href="https://www.sciencedirect.com/science/article/pii/S1361841523000312">HeiChole</a> is accepted at Medical Image Analysis!</p>
  <p>😎 [06.2022] One paper <a href="https://arxiv.org/pdf/2103.14098">CGPart</a> is accepted at CVPR 2022 (oral)!</p>
 
  <div id="hidden-news" style="display: none;">
  <p>👨‍🎓 [08.2021] Joined the <a href="https://www.comp.nus.edu.sg/~leegh/">CVRP lab</a> of SoC, NUS as a Ph.D. student!</p>
  <p>🚀 [07.2021] I am awarded the <a href="#">Outstanding Graduate/a> in Beihang University!</p>
  <p>🙇 [06.2020] Joined <a href="https://ccvl.jhu.edu/">CCVL</a> of JHU as a research intern!</p>
  <p>🙇 [10.2019] Joined <a href="https://en.megvii.com/megvii_research">MEGVII Research</a> as a 3D vision research intern!</p>
  <p>🙇 [06.2019] Joined <a href="http://www.vie.group/team">VIE</a> at PKU as a research intern!</p>
  <p>👨‍🎓 [09.2017] Entered <a href="https://hc.buaa.edu.cn/">Shenyuan Honors School</a> at Beihang University as a undergraduate student.</p>
  <p>👨‍🎓 [07.2017] Graduted from <a href="http://www.szsy.cn/">SZSY High School</a> in Shenzhen, China.</p>

  <!-- <p>🏆 [15.03.2024] Received the .</p> -->
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
  <img src="images/VCR-GauS.jpg" alt="VCR-GauS: View Consistent Depth-Normal Regularizer for Gaussian Surface Reconstruction" style="width: 350px; height: auto; margin-right: 20px;">
  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2406.05774" style="text-decoration: none;">VCR-GauS: View Consistent Depth-Normal Regularizer for Gaussian Surface Reconstruction</a></h3>
    <p style="margin: 5px 0;">
          <strong>Hanlin Chen</strong>,
          <a href="https://weify627.github.io/">Fangyin Wei</a>,
          <a href="https://chaneyddtt.github.io/">Chen Li</a>,
          <a href="https://tianxinhuang.github.io/">Tianxin Huang</a>,
          <a href="https://scholar.google.com/citations?user=vv1uLeUAAAAJ&hl=en">Yunsong Wang</a>,
          <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
          <br>
      arXiv, 2024<br>
      <!-- color: #0073e6; -->
      <a href="https://hlinchen.github.io/projects/VCR-GauS/" style="text-decoration: none; ">[Project Page]</a>
      <a href="https://arxiv.org/pdf/2406.05774" style="text-decoration: none;">[PDF]</a> 
      <a href="https://github.com/HLinChen/VCR-GauS" style="text-decoration: none;">[Code]</a>
      <!-- <a href="https://video.com" style="text-decoration: none;">Video</a> / -->
      <!-- <a class="more-link" href="https://github.com/HeliosZhao/Animate124" target="_blank"><img alt="GitHub stars" align="right"
        src="https://img.shields.io/github/stars/HeliosZhao/Animate124?style=social"></a> -->
    </p>
    <!-- <p style="margin: 5px 0;">
      The first work to animate a single in-the-wild image into 3D video through textual motion descriptions.
    </p> -->
    <div style="display: flex; align-items: center; margin-top: 10px;">
      <a href="https://github.com/yourrepo" style="display: flex; align-items: center; text-decoration: none; color: #000;">
      </a>
    </div>
  </div>
</div>


<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/GNeSF.jpg" alt="GNeSF: Generalizable Neural Semantic Fields" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2310.15712.pdf" style="text-decoration: none;">GNeSF: Generalizable Neural Semantic Fields</a></h3>
    <p style="margin: 5px 0;">
      <strong>Hanlin Chen</strong>,
      <a href="https://chaneyddtt.github.io/">Chen Li</a>,
      <a href="https://scholar.google.com/citations?user=Qa4BlOoAAAAJ&hl=en">Mengqi Guo</a>,
      <a href="https://jokeryan.github.io/about/">Zhiwen Yan</a>,
      <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
      <br>
      NeurIPS, 2023<br>
      <a href="https://arxiv.org/pdf/2310.15712.pdf" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/HLinChen/GNeSF" style="text-decoration: none;">[Code]</a>
    </p>
  </div>
</div>


Other Publications / Preprints
------

<!-- - Song Xue<sup>†</sup>, **Hanlin Chen**<sup>†</sup>(co-first), Chunyu Xie, Baochang Zhang, Xuan Gong, David Doermann. [Fast and Unsupervised Neural Architecture Evolution for Visual Representation Learning](https://ieeexplore.ieee.org/document/9492168). IEEE Computational Intelligence Magazine, 2021.

- **Hanlin Chen**, Xudong Zhang, et al. Efficient Facial Landmark Localization based on Binarized Neural Networks. Electronics, 2020.

- Sheng Xu, **Hanlin Chen**, Kexin Liu, Jinhu Lii, Baochang Zhang, [Efficient Block Pruning based on kernel and feature stabilization](https://ieeexplore.ieee.org/document/8946001). Neural Computing and Applications, 2020.

- Sheng Xu, **Hanlin Chen**, Kexin Liu, Jinhu Lii, Baochang Zhang. [Efficient Block Pruning based on kernel and feature stablization](https://ieeexplore.ieee.org/document/8946001). Proceedings of Digital Image Computing: Techniques and Applications, 2019. (DICTA 2019)

- Chunlei Liu, Wenrui Ding, Yu Hu, **Hanlin Chen**, Baochang Zhang, Shuo Liu. [Guided Convolutional Network](https://www.researchgate.net/publication/336051683_Guided_Convolutional_Network). 13th International Conference on Distributed Smart Cameras. (ICDSC 2019) -->

<!-- <script type="text/javascript" id="clstr_globe" src="//clustrmaps.com/globe.js?d=76q_kvp9C9IdUxxL6culGaZYcQGVaYsIH-LMQGUf1uU"></script> -->
