---
permalink: /blog_post/induction_deduction
title: "Inductive & Deductive Reasoning in Deep Learning Theory"
---

Inductive reasoning and deductive reasoning are two complementary ways of understanding complicated systems. A better grasp of these two modes of reasoning can help us understand the existing deep learning theory literature, and develop our own tools and methodologies for understanding LLMs and deep learning more broadly. The following are some informal reflections from my own research experience, and I'd love to hear other perspectives!

## Inductive Reasoning

Starting from empirical prior work or your own experiments, you consistently and robustly observe some phenomenon P in a complex system A. You then look for a simplified model A' (such as linear regression, kernel methods, or two-layer neural networks) that reproduces a similar phenomenon P', in the hope that analyzing A' offers insight into *why* P arises in the first place.

The main difficulty lies in identifying an interesting phenomenon together with a suitable simplified model. The model cannot be too simple, or it will no longer exhibit P; nor can it be too complex, or it becomes intractable to analyze. A further challenge is to argue, convincingly, that the insight gained from the simplified model actually transfers back to the real system.

That said, I've found that quite often this insight is something practitioners already hold intuitively, and it simply hasn't been formalized yet. The ideal case is when the insight is genuinely new and, better still, motivates a more effective algorithm A'.

## Deductive Reasoning

Starting from an existing theoretical model, you introduce a new factor, for instance by slightly modifying the setting or generalizing it, and then derive new conclusions, such as how the added factor changes the theoretical outcome. You then validate these predictions through toy or small-scale experiments, checking that the derivation holds in both synthetic and more realistic settings. Here the interesting questions are often whether the new setting introduces genuinely new technical difficulties, and how the added factor changes the underlying nature of the problem.

## Combining the two

From my actual research, theory and experiment often progress in an alternating fashion. Experimental results deepen our understanding of complex systems and inspire the development of more accurate models. Theoretical analysis, on the other hand, helps us abstract away details and focus on the most significant factors. By continually cycling between experimental observation and theoretical understanding, we can gradually bring the two into alignment.
