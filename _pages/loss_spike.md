---
layout: archive
title: "Research on Loss Spikes"
permalink: /note/loss_spike
author_profile: true
---

Starting from 2023 April, PaLM paper (Chapter 5.1) already identifies the loss spike phenomenon during pretraining. Their strategy is to re-start training from the checkpoint.

In AI2's [OLMo 2 paper](https://arxiv.org/pdf/2501.00656) (in 2025 Jan.), the authors analyze pretraining stability issues. They observe that significant spikes in gradient norm frequently precede spikes in training loss. A particularly intriguing finding is that larger model sizes correlate with increased frequency of these spikes. (An interesting research direction would be replicating this phenomenon in a simplified experimental setup, similar to the approach in https://arxiv.org/pdf/2309.14322).

They investigate the reasons behind those spikes although still lacking theoretical explanations:
- Repeated n-grams (Why that causes gradient norm has spikes? Maybe we can replicate that with a small experiment)
- Initialization: Initialize with mean 0 and sd 0.02 is better than OLMo-0424 initialization which scaled input projection by $1/ \sqrt{\text{dmodel}}$ and output projection by $1/ \sqrt{2 \cdot \text{dmodel} \cdot \text{layer index}}$. 
> In the paper, they investigate gradient and activation growth by passing random documents and measure $\lambda = \frac{1}{n_{\text{layers}}} \log(\frac{\| v' \|}{\| v \|})$ where $v$ is computed in the initial layer, and $v'$ is collected in the final layer.

> They find that OLMo's activation and gradient norm at initialization better correlates with $\sqrt{d_\text{model}}$, which should show better hyperparameter transfer according to $\mu P$. (Why?)

## Small-scale proxies for TF (not relevant to loss spikes)

The training instability issues observed in large language models can be replicated in smaller models by using high learning rates. The authors measure training stability through learning rate sensitivity analysis. They identify two main causes of training instability:

1. Attention logit growth - This can be mitigated using QK-layer normalization
2. Output logit divergence - This can be addressed through z-regularization

Both QK-normalization and z-loss techniques have been successfully incorporated into OLMo2 to enhance training stability.

## Other papers


Signal Propagation papers I should read: https://arxiv.org/pdf/2403.02579, https://arxiv.org/pdf/1611.01232

Meta's Adam instability paper (2023) https://arxiv.org/pdf/2304.09871

Other posts: https://zhuanlan.zhihu.com/p/700042526, https://zhuanlan.zhihu.com/p/10927658580


Loss Spikes related to EoS?

Related: https://www.bilibili.com/video/BV1V7ZnYNEzM/ (WSD Learning Rate)