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
  <p>😎 [07.2024] Our 3 paper <a href="https://dreamguo.github.io/">UNIKD</a> <a href="https://dreamguo.github.io/">TreeSBA</a> <a href="https://dreamguo.github.io/">URS-NeRF</a> are accepted at ECCV 2024!!</p>
  <p>😎 [03.2024] Our paper <a href="https://arxiv.org/pdf/2310.15712.pdf">GNeSF</a> is accepted at NeurIPS 2023!</p>
  <p>😎 [06.2023] Our paper <a href="https://www.sciencedirect.com/science/article/pii/S1361841523000312">HeiChole</a> is accepted at Medical Image Analysis!</p>
  <p>😎 [06.2022] Our paper <a href="https://arxiv.org/pdf/2103.14098">CGPart</a> is accepted at CVPR 2022 (oral)!</p>
 
  <div id="hidden-news" style="display: none;">
  <p>👨‍🎓 [08.2021] I joined the <a href="https://www.comp.nus.edu.sg/~leegh/">CVRP lab</a> of SoC, NUS as a phd student!</p>
  <p>🚀 [07.2021] I am awarded the <a href="#">Excellent Graduate</a> in Beihang University!</p>
  <p>👨‍🎓 [06.2021] I graduted from Beihang University supervised by Prof.  <a href="#">Excellent Graduate</a> in !</p>
  <p>🙇 [06.2020] I joined <a href="https://ccvl.jhu.edu/">CCVL</a> of JHU as a research intern!</p>
  <p>🙇 [10.2019] I joined <a href="https://en.megvii.com/megvii_research">MEGVII Research</a> as a 3D vision research intern!</p>
  <p>🙇 [06.2019] I joined <a href="http://www.vie.group/team">VIE</a> at PKU as a research intern!</p>
  <!-- <p>😎 [10.2023] Our paper <a href="https://link.springer.com/article/10.1007/s11263-023-01826-6">ABanditNAS</a> is accepted at IJCV!</p>
  <p>👨‍🎓 [08.2022] I joined the <b>CVRP lab</b> of SoC, NUS as a phd student!</p>
  <p>🙇 [03.2021] I joined <b>Alibaba DAMO Academy</b> to work as a computer vision algorithm engineer!</p>
  <p>🚀 [01.2021] I am awarded the <a href="#">Excellent Graduation Thesis</a> in Beihang University!</p>
  <p>🚀 [01.2021] I am awarded the <a href="#">Excellent Graduate</a> in Beihang University!</p>
  <p>🚀 [12.2020] I am awarded the <a href="#">National Scholarship in China</a>!</p>
  <p>😎 [09.2020] Our paper <a href="https://arxiv.org/pdf/2009.04247.pdf">BNAS</a> is accepted at IJCV!</p>
  <p>😎 [07.2020] Our paper <a href="https://arxiv.org/pdf/2008.00698.pdf">ABanditNAS</a> is accepted at ECCV 2020!</p>
  <p>🙇 [06.2020] I joined <b>Alibaba DAMO Academy</b> as a research intern!</p>
  <p>😎 [04.2020] Our paper <a href="https://www.ijcai.org/proceedings/2020/0144.pdf">CP-NAS</a> is accepted at IJCAI 2020!</p>
  <p>😎 [11.2019] Our paper <a href="https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhuo_Cogradient_Descent_for_Bilinear_Optimization_CVPR_2020_paper.pdf">CoGD</a> is accepted at CVPR 2020!</p>
  <p>😎 [10.2019] Our paper <a href="https://arxiv.org/pdf/1911.10862v1.pdf">BNAS</a> is accepted at AAAI 2020!</p> -->
  <!-- <p>✈️ [03.2021] I joined <b>Alibaba DAMO Academy</b> to work as a computer vision algorithm engineer!</p>
  <p>🏆 [15.03.2024] Received the .</p> -->
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
  <img src="images/FreeSplat.jpg" alt="FreeSplat: Generalizable 3D Gaussian Splatting Towards Free-View Synthesis of Indoor Scenes" style="width: 350px; height: auto; margin-right: 20px;">
  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2405.17958" style="text-decoration: none;">FreeSplat: Generalizable 3D Gaussian Splatting Towards Free-View Synthesis of Indoor Scenes</a></h3>
    <p style="margin: 5px 0;">
          <a href="https://scholar.google.com/citations?user=vv1uLeUAAAAJ&hl=en">Yunsong Wang</a>,
          <a href="https://tianxinhuang.github.io/">Tianxin Huang</a>,
          <strong>Hanlin Chen</strong>,
          <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
          <br>
      arXiv, 2024<br>
      <!-- color: #0073e6; -->
      <!-- <a href="https://hlinchen.github.io/projects/VCR-GauS/" style="text-decoration: none; ">[Project Page]</a> -->
      <a href="https://arxiv.org/pdf/2405.17958" style="text-decoration: none;">[PDF]</a> 
      <a href="https://github.com/wangys16/FreeSplat" style="text-decoration: none;">[Code]</a>
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
  <img src="images/GOV-NeSF.jpg" alt="GOV-NeSF: Generalizable Open-Vocabulary Neural Semantic Fields" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2404.00931" style="text-decoration: none;">GOV-NeSF: Generalizable Open-Vocabulary Neural Semantic Fields</a></h3>
    <p style="margin: 5px 0;">
          <a href="https://scholar.google.com/citations?user=vv1uLeUAAAAJ&hl=en">Yunsong Wang</a>,
          <strong>Hanlin Chen</strong>,
          <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
          <br>
      CVPR, 2024<br>
      <!-- color: #0073e6; -->
      <!-- <a href="https://projectpage.com" style="text-decoration: none; ">Project Page</a> / -->
      <a href="https://arxiv.org/pdf/2404.00931" style="text-decoration: none;">[PDF]</a> 
      <a href="https://github.com/wangys16/GOV-NeSF" style="text-decoration: none;">[Code]</a>
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
  <img src="images/NeuSG.jpg" alt="NeuSG: Neural implicit surface reconstruction with 3d gaussian splatting guidance" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2312.00846" style="text-decoration: none;">NeuSG: Neural implicit surface reconstruction with 3d gaussian splatting guidance</a></h3>
    <p style="margin: 5px 0;">
          <strong>Hanlin Chen</strong>,
          <a href="https://chaneyddtt.github.io/">Chen Li</a>,
          <a href="https://scholar.google.com/citations?user=vv1uLeUAAAAJ&hl=en">Yunsong Wang</a>,
          <a href="https://www.comp.nus.edu.sg/~leegh/">Gim Hee Lee</a>
          <br>
      arXiv, 2023<br>
      <!-- <a href="https://projectpage.com" style="text-decoration: none;">[Project Page]</a> -->
      <a href="https://arxiv.org/pdf/2312.00846" style="text-decoration: none;">[PDF]</a>
      <!-- <a href="https://github.com/wangys16/GOV-NeSF" style="text-decoration: none;">[Code]</a> -->
      <!-- <a href="https://video.com" style="text-decoration: none;">[Video]</a> -->
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

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/BNAS.jpg" alt="Binarized Neural Architecture Search for Efficient Object Recognition" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2009.04247.pdf" style="text-decoration: none;">Binarized Neural Architecture Search for Efficient Object Recognition</a></h3>
    <p style="margin: 5px 0;">
      <strong>Hanlin Chen</strong>, Li'an Zhuo, Baochang Zhang, Xiawu Zheng, Jianzhuang Liu, Rongrong Ji, David Doermann, Guodong Guo
      <br>
      IJCV, 2021<br>
      <a href="https://arxiv.org/pdf/2009.04247.pdf" style="text-decoration: none;">[PDF]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/ABanditNAS.jpg" alt="Anti-Bandit Neural Architecture Search for Model Defense" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/2008.00698.pdf" style="text-decoration: none;">Anti-Bandit Neural Architecture Search for Model Defense</a></h3>
    <p style="margin: 5px 0;">
      <strong>Hanlin Chen</strong>, Baochang Zhang, Song Xue, Xuan Gong, Hong Liu, Rongrong Ji, David Doermann
      <br>
      ECCV, 2020<br>
      <a href="https://arxiv.org/pdf/2008.00698.pdf" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/bczhangbczhang/ABanditNAS" style="text-decoration: none;">[CODE]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/BNAS_framework.jpg" alt="Binarized Neural Architecture Search" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://arxiv.org/pdf/1911.10862v1.pdf" style="text-decoration: none;">Binarized Neural Architecture Search</a></h3>
    <p style="margin: 5px 0;">
      <strong>Hanlin Chen</strong>, Li'an Zhuo, Baochang Zhang, Xiawu Zheng, Jianzhuang Liu, David Doermann, Rongrong Ji
      <br>
      AAAI, 2020<br>
      <a href="https://arxiv.org/pdf/1911.10862v1.pdf" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/bczhangbczhang/BNAS" style="text-decoration: none;">[CODE]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/CoGD.jpg" alt="Cogradient Descent for Bilinear Optimization" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhuo_Cogradient_Descent_for_Bilinear_Optimization_CVPR_2020_paper.pdf" style="text-decoration: none;">Cogradient Descent for Bilinear Optimization</a></h3>
    <p style="margin: 5px 0;">
      Li'an Zhuo, Baochang Zhang, Linlin Yang, <strong>Hanlin Chen</strong>, Qixiang Ye, David Doermann, Rongrong Ji, Guodong Guo
      <br>
      CVPR, 2020<br>
      <a href="https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhuo_Cogradient_Descent_for_Bilinear_Optimization_CVPR_2020_paper.pdf" style="text-decoration: none;">[PDF]</a>
      <a href="https://github.com/bczhangbczhang/CoGD" style="text-decoration: none;">[CODE]</a>
    </p>
  </div>
</div>

<div style="display: flex; align-items: center; margin-bottom: 40px;">
  <img src="images/CP-NAS.jpg" alt="CP-NAS: Child-Parent Neural Architecture Search for 1-bit CNNs" style="width: 350px; height: auto; margin-right: 20px;">

  <div>
    <h3 style="margin: 0;"><a href="https://www.ijcai.org/proceedings/2020/0144.pdf" style="text-decoration: none;">CP-NAS: Child-Parent Neural Architecture Search for 1-bit CNNs</a></h3>
    <p style="margin: 5px 0;">
      Li'an Zhuo, Baochang Zhang, <strong>Hanlin Chen</strong>, Linlin Yang, Chen Chen, Yanjun Zhu, David Doermann
      <br>
      IJCAI, 2020<br>
      <a href="https://www.ijcai.org/proceedings/2020/0144.pdf" style="text-decoration: none;">[PDF]</a>
    </p>
  </div>
</div>



Other Publications / Preprints
------

<!-- 
- **Hanlin Chen**, Li Chen, Mengqi Guo, Zhiwen Yan, Gim Hee Lee. [GNeSF: Generalizable Neural Semantic Fields](https://arxiv.org/pdf/2310.15712.pdf). NeurIPS, 2023.

- **Hanlin Chen**, Li'an Zhuo, Baochang Zhang, Xiawu Zheng, Jianzhuang Liu, Rongrong Ji, David Doermann, Guodong Guo. [Binarized Neural Architecture Search for Efficient Object Recognition](https://arxiv.org/pdf/2009.04247.pdf). IJCV, 2021.

- **Hanlin Chen**, Baochang Zhang, Song Xue, Xuan Gong, Hong Liu, Rongrong Ji, David Doermann. [Anti-Bandit Neural Architecture Search for Model Defense](https://arxiv.org/pdf/2008.00698.pdf). ECCV, 2020. [[CODES](https://github.com/bczhangbczhang/ABanditNAS)]

- **Hanlin Chen**, Li'an Zhuo, Baochang Zhang, Xiawu Zheng, Jianzhuang Liu, David Doermann, Rongrong Ji. [Binarized Neural Architecture Search](https://arxiv.org/pdf/1911.10862v1.pdf). AAAI, 2020. [[CODES](https://github.com/bczhangbczhang/BNAS)]

- Li'an Zhuo, Baochang Zhang, Linlin Yang, **Hanlin Chen**, Qixiang Ye, David Doermann, Rongrong Ji, Guodong Guo. [Cogradient Descent for Bilinear Optimization](https://openaccess.thecvf.com/content_CVPR_2020/papers/Zhuo_Cogradient_Descent_for_Bilinear_Optimization_CVPR_2020_paper.pdf). CVPR, 2020. [[CODES](https://github.com/bczhangbczhang/CoGD)]


- Li’an Zhuo, Baochang Zhang, **Hanlin Chen**, Linlin Yang, Chen Chen, Yanjun Zhu, David Doermann. [CP-NAS: Child-Parent Neural Achitecture Search for 1-bit CNNs](https://www.ijcai.org/proceedings/2020/0144.pdf). IJCAI 2020.
 -->


- Song Xue<sup>†</sup>, **Hanlin Chen**<sup>†</sup>(co-first), Chunyu Xie, Baochang Zhang, Xuan Gong, David Doermann. [Fast and Unsupervised Neural Architecture Evolution for Visual Representation Learning](https://ieeexplore.ieee.org/document/9492168). IEEE Computational Intelligence Magazine, 2021.

- **Hanlin Chen**, Xudong Zhang, et al. Efficient Facial Landmark Localization based on Binarized Neural Networks. Electronics, 2020.

- Sheng Xu, **Hanlin Chen**, Kexin Liu, Jinhu Lii, Baochang Zhang, [Efficient Block Pruning based on kernel and feature stabilization](https://ieeexplore.ieee.org/document/8946001). Neural Computing and Applications, 2020.

- Sheng Xu, **Hanlin Chen**, Kexin Liu, Jinhu Lii, Baochang Zhang. [Efficient Block Pruning based on kernel and feature stablization](https://ieeexplore.ieee.org/document/8946001). Proceedings of Digital Image Computing: Techniques and Applications, 2019. (DICTA 2019)

- Chunlei Liu, Wenrui Ding, Yu Hu, **Hanlin Chen**, Baochang Zhang, Shuo Liu. [Guided Convolutional Network](https://www.researchgate.net/publication/336051683_Guided_Convolutional_Network). 13th International Conference on Distributed Smart Cameras. (ICDSC 2019)

<script type="text/javascript" id="clstr_globe" src="//clustrmaps.com/globe.js?d=76q_kvp9C9IdUxxL6culGaZYcQGVaYsIH-LMQGUf1uU"></script>
