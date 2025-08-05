---
permalink: /note/phys_of_llm
---

# Physics of LLM


## Architecture design 

For real life pretraining, benchmark performance varies a lot across random seeds, which makes it statistically inefficient to compare architectures. We need to design useful  synthetic tasks.

### Four design principles
- Task must not be shallow: Associative recall or copying is easily solvable by small and shallow models, which cannot meaningfully test architectural strength.
- Emphasis on mental thinking: Without applying CoT, testing architecture's "system 1" reasoning.
- Avoid emphasis on length generalization. Unstable across random seeds.
- Relevance to real-world skills.

### Depo: Mental Reasoning Depth (Token-level)
k-hop traversal over directed permutations problem, is to find k-th sucessor for each query $q$ entirely internally.
Controlled by $N$ (Max. Number of permutations), $k$ (Maximum Reasoning Depth).


`<bos> x1 y1 x2 y2 ... xn yn <query_k1> q1 a1 <query_k2> q2 a2 ... <eos>`


### Brevo: Meantal Reasoning Breadth (Generative)
Tree-like traversal, $m$ edges, query $q$ return all vertices recusively reachable from $q$, **sorted in topological order**.

`<bos> x1 y1 x2 y2 ... xm ym <query> q <ans> a1 a2 ... ap <eos>`

Sorted in topological order requires the model to preprocess order of DAG mentally before generating first token.


### Capo: Knowledge Capacity (Distributional)


Synthetic datasets of fake biographies, each include several attributes (e.g., birthdate, university etc.), and is presented in diverse paraphrased formats to reduce surface-level memorization. In undertrained regime where each biblography is exposed only 100 times (no apparent architectural differences for more exposure). Capacity is measured using the next-token prediction distribution, accounting
for both exact correctness and partial accuracy. Results are visualized via “bit vs. model size” plots.


### Mano: Knowledge Manipulation (Token-level)

Comparison to reasoning: Knowledge manipulation requires retrieval of factual knowledge embedded in their parameters and perform hierarchical computation entirely mentally. Consider modular computation tasks:

`<bos> + * a b - c d <ans> `


### Lano: Hierarchical language structure (Generative, Distributional)

This challenges model to infer implicit recursive structures across sequences and resolve global ambiguities within them.
`<bos> 3 3 2 2 1 ... 3 3 1 2 <bos> 1 2 3 3 1 ... 1 2 2 1 <bos> ..`

This is generated using context-free grammar (CFG). Resolving this requires dynamic programming to globally map the entire sequence to a valid recursive application of CFG rules, which must also be learned during training.