---
permalink: /note/alg_ml
---

# Algorithmic Aspects of Machine Learning

## Nonnegative Matrix Factorization

### SVD
$M = U \Sigma V^T = \sum_{i=1}^r \sigma_i u_i v_i^\top$, requires distinct non-zero singular values to have unique solution. Easy to establish rank-$k$ approximation.

Typical application is Latent Semantic Indexing, say there are $n$ documents $M_1, \cdots, M_n$ (each documents contain $m$ words), we use $\langle U_{1\dots k} M_i, U_{1\dots k}  M_j \rangle$ to compute similarity. Problem is the topics can be orthonormal but still have many words in common (like Finance and Politics), and the topics can contain words with negative values. This motivates us using nonnegative matrix factorization.

### Nonnegative Matrix Factorization

Goal: Decompose $M$ into $AW$, where $A: n \times r$, and $W: r \times n$ are both entrywise nonnegative. Define $\text{rank}^+ (M)$ to be the smallest $r$ to exist such factorization. We normalize $A$ and $W$ so their columns sum up to one respectively. 

This problem is **NP-hard**, although there exists heuristic methods to solve it (Iteratively alternating updates for $W^{(i)}$ and $A^{(i)}$).


Application: 


## Tensor Methods

## Sparse Recovery

## Dictionary Learning

## Gaussian Mixture Model

## Matrix Completion
