---
permalink: /note/alg_ml
---

# Algorithmic Aspects of Machine Learning

## Nonnegative Matrix Factorization

### SVD
$M = U \Sigma V^T = \sum_{i=1}^r \sigma_i u_i v_i^\top$, requires distinct non-zero singular values to have unique solution. Easy to establish rank-$k$ approximation.

Typical application in Topic Modelling is Latent Semantic Indexing, say there are $n$ documents $M_1, \cdots, M_n$ (each documents contain $m$ words), we use $\langle U_{1\dots k} M_i, U_{1\dots k}  M_j \rangle$ to compute similarity. Problem is the topics can be orthonormal but still have many words in common (like Finance and Politics), and the topics can contain words with negative values. This motivates us using nonnegative matrix factorization.

### Nonnegative Matrix Factorization

Goal: Decompose $M$ into $AW$, where $A: n \times r$, and $W: r \times n$ are both entrywise nonnegative. Define $\text{rank}^+ (M)$ to be the smallest $r$ to exist such factorization. We normalize $A$ and $W$ so their columns sum up to one respectively. Thus we can view columns of $A$ as a collection of $r$ topics, and $W$ as convex combination of $r$ topics.

This problem is **NP-hard**, although there exists heuristic methods to solve it (Iteratively alternating updates for $W^{(i)}$ and $A^{(i)}$).

We can reformulate the problem into systems of polynomial inequalities:


$$
\begin{align*}
M &= AW \\
A &\geq 0 \\
W &\geq 0
\end{align*}
$$


For solving systems of polynomial inequalities we refer to Renegar's algorithm (which is optimal by hardness result of reducing to 3-SAT), where running time has exponentials in number of variables $k = nr + mr$, so the runtime is exponential even when $r = O(1)$. 

However, there's way to reduce number of variables used, Arora et. al. and Moitra focus on the special case called simplicial factorization problem, where we suppose $\text{rank}(M) = r$, and we want to know whether $\text{rank}^{+}(M) = r$. They give a variable reduction technique to reduce $k = 2r^2$, which yields a polynomial time algorithm. This is optimal in the worst-case analysis.

### Geometry connections
The simplical factorization problem is connected to a purely geometric problem about fitting a simplex in between two given polytypes. Indeed they are equivalent up to polynomial-time reduction. It is shown that both three problems are NP-hard, by constructing certain geometric gadgets.

### Separability Assumption
The common features of the gadgets we constructed above is that they all are highly unstable and have multiple solutions. Here we move beyond worst-case analysis by imposing a new assumption, which better to be viewed in setting of text analysis. 

It is **Definition 2.3.11** in the book, which intuitively assumes that **for each tppic, there is an unknown anchor word that if it occurs in a document, then the document is about the given topic**. 

If $M = AW$ with separable $A$, and $W$ has full row rank, then the row of $W$ appears as rows of $M$, then the convex hull of rows of $W$ contain the rows of $M$. By iteratively deleting rows of $M$ that do not change the convex hull we obtain $W$. Then we solve for nonnegative $A$ that minimizes $\| M - AW \|_{F}$ (Convex opt. problem). The naive implementation would be prohibitively slow, luckily there exists algorithm that can implement this more efficiently.


### Topic Models
The **abstract topic model** consists of topic matrix $A: m \times r$, distribution $\mu$ on the simplex in $\mathbb{R}^r$. Then $n$ documents are generated, for each $W_i$ are sampled from $\mu$, then $L$ words are generated i.i.d. from distribution $AW_i$. 


We denote the observed term-by-document matrix as $\tilde{M}$, then $\mathbb{E}[\tilde{M} | W] = M = AW$, this problem is much harder since we only observe the empirical version $\tilde{M}$.

There are multiples types of topic models, e.g.: pure topic model ($\mu$ is distribution on vertices of simplex, and each column of $W$ has exactly one non-zero), Latent Dirichlet Allocation ($\mu$ is Dirichlet distribution). Each documents can have more than one topic, however, $W_i$ are sparse. 

The estimation algorithm is pretty simple, and there exists polynomial-time algorithm, given separability condition, and some extra conditions (In "Learning Topic Models - Beyond SVD", STOC 2012).

## Tensor Methods

## Sparse Recovery

## Dictionary Learning

## Gaussian Mixture Model

## Matrix Completion
