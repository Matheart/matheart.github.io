---
layout: archive
title: "Research on Loss Spikes"
permalink: /note/loss_spike
author_profile: true
---

In AI2's [OLMo 2 paper](https://arxiv.org/pdf/2501.00656), the authors analyze pretraining stability issues and identify the phenomenon of loss spikes. They observe that significant spikes in gradient norm frequently precede spikes in training loss. A particularly intriguing finding is that larger model sizes correlate with increased frequency of these spikes. (An interesting research direction would be replicating this phenomenon in a simplified experimental setup, similar to the approach in https://arxiv.org/pdf/2309.14322).

They investigate the reasons behind those spikes although still lacking theoretical explanations:
- Repeated n-grams (Why that causes gradient norm has spikes? Maybe we can replicate that with a small experiment)
- Initialization: Initialize with mean 0 and sd 0.02 is better than OLMo-0424 initialization which scaled input projection by $1/ \sqrt{\text{dmodel}}$ and output projection by $1/ \sqrt{2 \cdot \text{dmodel} \cdot \text{layer index}}$. 
> In the paper, they investigate gradient and activation growth by passing random documents and measure $\lambda = \frac{1}{n_{\text{layers}}} \log(\frac{\| v' \|}{\| v \|})$ where $v$ is computed in the initial layer, and $v'$ is collected in the final layer.

> They find that OLMo's activation and gradient norm at initialization better correlates with $\sqrt{d_\text{model}}$, which should show better hyperparameter transfer according to $\mu P$. (Why?)

## Small-scale proxies


## Other papers


Signal Propagation papers I should read: https://arxiv.org/pdf/2403.02579