---
layout: archive
title: "Random Note"
permalink: /random_note
author_profile: true
---

> Sep 5th 2025

About Random Matrix Theory, Jiaoyang Huang has a good course on that in spring.

Good classical paper to be refered to: Universal Laws for High dimensinal learning with random features

Song Mei's course

> Sep 8 2025

NNGP (slightly before NTK was born) https://berkan.xyz/digitalGarden/NNGP

Deep information propagation https://arxiv.org/pdf/1611.01232 worths reading

The long-range consistency condition (co-coercivities) in silver stepsize is sufficient and necessary to smooth and convex (Chat with Jinho). 

https://arxiv.org/pdf/1502.05666

> Sep 15

Stochastic Approximation

http://ndl.ethernet.edu.et/bitstream/123456789/23707/1/Harold%20J.%20Kushner.pdf

Interesting paper: https://arxiv.org/pdf/1606.05340.

Signal propagation: If we consider $q_l = \frac{1}{N_l} \| h^{(l)} (x) \|_2^2$ (norm of the activation), and study the plot $q_l$ against $q_{l-1}$, it looks like the concave curve. It is interesting to see the norm converges at some fixed point $q_*$ after $L=4$ iterations (4 layers, all the things we consider here are at initialization, Figure 1 of the paper).

We also study the change of correlation i.e. $c_l = \frac{1}{q_* N_l} h^l(x)^\top h^l(x')$. We plot the curve $c_l$ against $c_{l-1}$, if the curve looks like a concave curve, then it is stable and have vanishing gradient, which leads to bad NNGP performance. If it is convex, it would have exploding gradient and the correlations going to zero. This corresponds to the  Figure 2. **Maybe we can observe how $c_l$ changes during training, since this paper only studies at initialization**.

https://dkarkada.xyz/posts/critical-signalprop-nn/