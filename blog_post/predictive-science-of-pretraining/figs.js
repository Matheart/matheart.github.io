// Interactive figures for the blog post. Data: window.BLOG_DATA from data/blog_data.js (built by code/cl_blog_data.py).
(function () {
  const D = window.BLOG_DATA;
  const root = document.documentElement;
  const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const CFG = { displayModeBar: false, responsive: true };
  const $ = (id) => document.getElementById(id);
  const HAS_OPT = !!document.getElementById("fig-optgap"); // optimizer figures are optional
  const HAS_EFF = !!document.getElementById("fig-effects"); // the averaged partial-dependence figure is optional
  const HAS_PAIRS = !!document.getElementById("fig-pairs") && D.effects; // pair maps (moved to the companion page)
  const HAS_RFM = !!document.getElementById("fig-rfm") && D.effects; // RFM metric figure (removed from the post)
  const HAS_FRONTIER = !!document.getElementById("fig-frontier"); // frontier by interpretability group (removed from the post)
  const KEEP = new Set(["mlp", "trees", "rfm", "spline add_k"]); // student families shown in the distillation figure
  const TASKS = [
    { corpus: "marin", metric: "curve", label: "Marin, whole curve" },
    { corpus: "marin", metric: "final", label: "Marin, final loss" },
    { corpus: "steplaw", metric: "curve", label: "StepLaw, whole curve" },
    { corpus: "steplaw", metric: "final", label: "StepLaw, final loss" },
  ];
  const CORPORA = [{ key: "marin", label: "Marin" }, { key: "steplaw", label: "StepLaw" }];
  const GROUP = {
    "spline shape": "interp", "spline add_k": "interp", "boost depth 1": "interp", "boost depth 2": "interp",
    "gam final": "interp", "ga2m final": "interp", "rfm": "partly", "rfm final": "partly", "boost depth 3": "partly",
    "mlp": "black", "trees": "black",
  };
  const GROUP_LABEL = { interp: "interpretable", partly: "partly interpretable", black: "black box" };
  const GROUP_COLOR = { interp: "#1b9e77", partly: "#d95f02", black: "#c51b7d" };
  const FAM = {
    "mlp": ["MLP", "#c51b7d", "circle"], "trees": ["boosted trees", "#a6761d", "circle"],
    "rfm": ["RFM", "#d95f02", "circle"], "rfm final": ["RFM, final loss only", "#e64b35", "diamond"],
    "boost depth 3": ["boosting, depth 3", "#7570b3", "triangle-up"],
    "spline add_k": ["splines that change with training fraction", "#1b9e77", "circle"],
    "gam final": ["additive splines, final loss only", "#00a087", "diamond"],
    "ga2m final": ["pairwise splines, final loss only", "#3c5488", "diamond"],
    "boost depth 1": ["boosting, depth 1", "#66a61e", "triangle-up"],
    "boost depth 2": ["boosting, depth 2", "#2c7fb8", "triangle-up"],
    "spline shape": ["mean curve plus additive splines", "#99d8c9", "square"],
  };
  const TABPFN_NAME = { 11100000: "TabPFN v2", 10200000: "TabPFN v2.5", 58300000: "TabPFN v3", 83500000: "TabPFN v3.5 fast", 219000000: "TabPFN v3.5" };

  function layout(xTitle, yTitle) {
    const grid = css("--rule"), fg = css("--fg");
    return {
      margin: { l: 64, r: 16, t: 8, b: 56 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: css("--font-small"), size: 12, color: fg },
      xaxis: { title: { text: xTitle }, gridcolor: grid, linecolor: grid, zeroline: false },
      yaxis: { title: { text: yTitle }, gridcolor: grid, linecolor: grid, zeroline: false },
      legend: { orientation: "h", x: 0, y: -0.22, font: { size: 11 } },
      hovermode: "closest",
      hoverlabel: { font: { family: css("--font-small") } },
    };
  }
  function buttons(el, opts, init, onChange) {
    el.innerHTML = "";
    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = o.label;
      b.setAttribute("aria-pressed", i === init ? "true" : "false");
      b.onclick = () => {
        el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false"));
        b.setAttribute("aria-pressed", "true");
        onChange(i);
      };
      el.appendChild(b);
    });
  }
  function select(el, opts, init, onChange) {
    el.innerHTML = "";
    opts.forEach((o, i) => {
      const op = document.createElement("option");
      op.value = i; op.textContent = o.label; if (i === init) op.selected = true;
      el.appendChild(op);
    });
    el.onchange = () => onChange(+el.value);
  }
  const fmt = (v, d) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(d === undefined ? 3 : d);
  const logX = { type: "log", title: { text: "number of parameters" }, tickvals: [10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8], ticktext: ["10", "100", "1k", "10k", "100k", "1M", "10M", "100M"] };
  const YT = [0.01, 0.015, 0.02, 0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3];
  const logY = { type: "log", title: { text: "OOD MAE (nats)" }, tickvals: YT, ticktext: YT.map(String), minor: { showgrid: false } };
  const tabpfnTrace = (pts, metric) => {
    const t = pts.filter((p) => p.family === "tabpfn" && p[metric] != null).sort((a, b) => a.n_params - b.n_params);
    return {
      x: t.map((p) => p.n_params), y: t.map((p) => p[metric]), mode: "markers", type: "scatter",
      name: "TabPFN checkpoints", marker: { symbol: "square", size: 9, color: css("--fg") },
      text: t.map((p) => TABPFN_NAME[p.n_params] || "TabPFN"),
      hovertemplate: "%{text}<br>%{x:.3s} weights<br>MAE %{y:.4f} nats<extra></extra>",
    };
  };

  // ---------------------------------------------------------------- Figure 1: animated meta-model sizes
  const SIZE_BARS = [
    { name: "NCPL", date: "Feb 2026", n: 1.7e9, top: "Qwen3-1.7B, fine-tuned", sub: "1.7B weights", color: "#6a51a3" },
    { name: "Meta Models", date: "Oct 2026", n: 5.83e7, top: "TabPFN v3, frozen", sub: "58M weights", color: "#3f3f3f" },
    { name: "next", date: "", n: null, top: "smallest model that", sub: "still predicts well", color: "none" },
  ];
  function drawSize(animate) {
    const el = $("fig-size");
    const W = 700, H = 330, x0 = 70, y0 = 270, yTop = 30, lo = 2, hi = 10; // log10 weights from 100 to 1e10
    const y = (n) => y0 - (Math.log10(n) - lo) / (hi - lo) * (y0 - yTop);
    const fg = css("--fg"), muted = css("--muted"), rule = css("--rule");
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Prediction-model size: NCPL 1.7 billion weights, Meta Models 58 million weights, next unknown">`;
    for (let k = lo; k <= hi; k += 2) {
      const yy = y(10 ** k), lab = ["100", "10k", "1M", "100M", "10B"][(k - lo) / 2];
      s += `<line x1="${x0}" x2="${W - 10}" y1="${yy}" y2="${yy}" stroke="${rule}" stroke-width="1"/><text x="${x0 - 8}" y="${yy + 4}" text-anchor="end" font-size="12" fill="${muted}">${lab}</text>`;
    }
    s += `<text x="16" y="${(y0 + yTop) / 2}" transform="rotate(-90 16 ${(y0 + yTop) / 2})" text-anchor="middle" font-size="12" fill="${muted}">weights in the prediction model</text>`;
    const bw = 130, gap = (W - x0 - 3 * bw) / 3;
    SIZE_BARS.forEach((b, i) => {
      const cx = x0 + gap / 2 + i * (bw + gap), target = b.n ? y(b.n) : y(3000);
      const lab = b.n ? target - 30 : target - 30;
      if (b.n) {
        s += `<rect class="sb" data-target="${target}" x="${cx}" y="${animate ? y0 : target}" width="${bw}" height="${animate ? 0 : y0 - target}" fill="${b.color}"/>`;
      } else {
        s += `<rect class="sq" x="${cx}" y="${target}" width="${bw}" height="${y0 - target}" fill="none" stroke="${muted}" stroke-dasharray="6 4" stroke-width="1.5" opacity="${animate ? 0 : 1}"/>`;
        s += `<text class="sq" x="${cx + bw / 2}" y="${target + (y0 - target) / 2 + 12}" text-anchor="middle" font-size="34" font-weight="700" fill="${fg}" opacity="${animate ? 0 : 1}">?</text>`;
      }
      s += `<text class="sl" x="${cx + bw / 2}" y="${lab}" text-anchor="middle" font-size="12" fill="${fg}" opacity="${animate ? 0 : 1}">${b.top}</text>`;
      s += `<text class="sl" x="${cx + bw / 2}" y="${lab + 15}" text-anchor="middle" font-size="12" fill="${fg}" opacity="${animate ? 0 : 1}">${b.sub}</text>`;
      s += `<text x="${cx + bw / 2}" y="${y0 + 20}" text-anchor="middle" font-size="12" fill="${fg}">${b.name}</text>`;
      s += `<text x="${cx + bw / 2}" y="${y0 + 36}" text-anchor="middle" font-size="11" fill="${muted}">${b.date}</text>`;
    });
    s += `<line x1="${x0}" x2="${W - 10}" y1="${y0}" y2="${y0}" stroke="${fg}" stroke-width="1"/></svg>`;
    el.innerHTML = s;
    if (!animate) return;
    const bars = el.querySelectorAll("rect.sb"), labs = el.querySelectorAll(".sl"), qs = el.querySelectorAll(".sq");
    const t0 = performance.now(), dur = 900, stagger = 700;
    function frame(t) {
      let done = true;
      bars.forEach((r, i) => {
        const p = Math.min(1, Math.max(0, (t - t0 - i * stagger) / dur)), e = 1 - Math.pow(1 - p, 3);
        const tg = +r.dataset.target, h = (y0 - tg) * e;
        r.setAttribute("y", y0 - h); r.setAttribute("height", h);
        if (p < 1) done = false;
      });
      const pl = Math.min(1, Math.max(0, (t - t0 - 2 * stagger) / 500));
      labs.forEach((l) => l.setAttribute("opacity", Math.min(1, (t - t0) / 600)));
      qs.forEach((q) => q.setAttribute("opacity", pl));
      if (!done || pl < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- Figure 2: frontier with the search arrow
  const frontier = { task: 0 };
  function drawFrontier() {
    const T = TASKS[frontier.task];
    const pts = D.points.filter((p) => p.corpus === T.corpus && p[T.metric] != null);
    const traces = [];
    ["interp", "partly", "black"].forEach((g) => {
      const q = pts.filter((p) => GROUP[p.family] === g).sort((a, b) => a.n_params - b.n_params);
      const xs = [], ys = [], tx = [];
      let best = Infinity;
      q.forEach((p) => {
        if (p[T.metric] < best) {
          best = p[T.metric];
          xs.push(p.n_params); ys.push(best);
          tx.push(FAM[p.family][0] + (p.source === "distill" ? ", TabPFN labels" : ", true losses"));
        }
      });
      traces.push({
        x: xs, y: ys, text: tx, type: "scatter", mode: "lines+markers", line: { shape: "hv", width: 2.5, color: GROUP_COLOR[g] },
        marker: { size: 7, color: GROUP_COLOR[g] }, name: GROUP_LABEL[g],
        hovertemplate: "%{text}<br>%{x:,} parameters<br>MAE %{y:.4f} nats<extra></extra>",
      });
    });
    traces.push(tabpfnTrace(pts, T.metric));
    const L = layout("", "");
    Object.assign(L.xaxis, logX); Object.assign(L.yaxis, logY);
    L.margin.b = 150; L.legend.y = -0.5;
    L.annotations = [
      { xref: "paper", yref: "paper", x: 0.06, y: -0.34, ax: 0.98, ay: -0.34, axref: "paper", ayref: "paper", showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 2, arrowcolor: css("--muted"), text: "" },
      { xref: "paper", yref: "paper", x: 0.02, y: -0.34, showarrow: false, text: "<b>?</b>", font: { size: 20, color: css("--fg") } },
      { xref: "paper", yref: "paper", x: 0.52, y: -0.285, showarrow: false, text: "fewer parameters, low OOD error, interpretable", font: { size: 11, color: css("--muted") } },
    ];
    Plotly.react("fig-frontier", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 3: distilled students
  const distilled = { task: 0 };
  function drawDistilled() {
    const T = TASKS[distilled.task];
    const pts = D.points.filter((p) => p.corpus === T.corpus && p[T.metric] != null);
    const traces = [];
    ["black", "partly", "interp"].forEach((g) => {
      Object.keys(FAM).filter((f) => GROUP[f] === g && KEEP.has(f)).forEach((f) => {
        const q = pts.filter((p) => p.family === f && p.source === "distill").sort((a, b) => a.n_params - b.n_params);
        if (!q.length) return;
        const [lab, col, sym] = FAM[f];
        traces.push({
          x: q.map((p) => p.n_params), y: q.map((p) => p[T.metric]), type: "scatter", mode: "lines+markers",
          name: lab, legendgroup: g, legendgrouptitle: { text: GROUP_LABEL[g] },
          line: { color: col, width: 1.5, dash: g === "black" ? "dot" : g === "partly" ? "dash" : "solid" },
          marker: { color: col, size: 8, symbol: sym },
          hovertemplate: lab + "<br>%{x:,} parameters<br>MAE %{y:.4f} nats<extra></extra>",
        });
      });
    });
    const tp = tabpfnTrace(pts, T.metric);
    tp.legendgroup = "ref"; tp.legendgrouptitle = { text: "reference" };
    traces.push(tp);
    const v3 = pts.find((p) => p.family === "tabpfn" && p.n_params === 58300000);
    const L = layout("", "");
    Object.assign(L.xaxis, logX); Object.assign(L.yaxis, logY);
    L.legend = { orientation: "v", x: 1.02, y: 1, font: { size: 11 }, groupclick: "toggleitem" };
    L.margin.r = 230;
    if (v3) {
      L.shapes = [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: v3[T.metric], y1: v3[T.metric], line: { color: css("--muted"), width: 1, dash: "dash" } }];
      L.annotations = [{ xref: "paper", x: 0.01, y: Math.log10(v3[T.metric]), yref: "y", text: "teacher (TabPFN v3)", showarrow: false, yshift: 9, xanchor: "left", font: { size: 10, color: css("--muted") } }];
    }
    if (window.innerWidth < 700) { L.legend = { orientation: "h", x: 0, y: -0.25, font: { size: 10 } }; L.margin.r = 16; L.margin.b = 200; }
    else {  // the search from right to left: toward fewer parameters, low OOD error and an interpretable model
      L.margin.b = 110;
      // an annotation's tail is set in pixels, so the arrow length comes from the width of the plotting area
      const pw = Math.max(200, $("fig-distilled").clientWidth - L.margin.l - L.margin.r);
      L.annotations = (L.annotations || []).concat([
        { xref: "paper", yref: "paper", x: 0.06, y: -0.3, ax: 0.92 * pw, ay: 0, showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 2, arrowcolor: css("--muted"), text: "" },
        { xref: "paper", yref: "paper", x: 0.02, y: -0.3, showarrow: false, text: "<b>?</b>", font: { size: 20, color: css("--fg") } },
        { xref: "paper", yref: "paper", x: 0.52, y: -0.245, showarrow: false, text: "fewer parameters, low OOD error, interpretable", font: { size: 11, color: css("--muted") } },
      ]);
    }
    Plotly.react("fig-distilled", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 4: partial dependence (fit to measured losses)
  const NAMES = {
    lr: "peak learning rate", lr2: "second learning rate", wd: "weight decay", batch_tokens: "batch size in tokens",
    decay_frac: "fraction of training in LR decay", eps: "Adam epsilon", D: "training tokens", sched_code: "schedule (0 or 1)",
    min_lr_ratio: "final to peak LR ratio", warmup_frac: "warmup fraction", beta1: "Adam beta1", beta2: "Adam beta2",
    N_body: "non-embedding parameters", grad_clip: "gradient clipping", d_lr: "learning rate relative to reference",
    d_batch: "batch size relative to reference", N_active: "active parameters",
  };
  const LOG = new Set(["lr", "lr2", "wd", "batch_tokens", "eps", "D", "N_body", "d_lr", "d_batch", "N_active"]);
  const axisName = (k) => (NAMES[k] || k) + (LOG.has(k) ? " (log10)" : "");
  const eff = { corpus: 0, input: 0 };
  const pdList = () => D.effects[CORPORA[eff.corpus].key].pd.slice().sort((a, b) => (Math.max(...b.true) - Math.min(...b.true)) - (Math.max(...a.true) - Math.min(...a.true)));
  function fillEffectSelect() {
    select($("sel-effects"), pdList().map((e) => ({ label: NAMES[e.input] || e.input })), eff.input, (i) => { eff.input = i; drawEffects(); });
  }
  function drawEffects() {
    const e = pdList()[eff.input];
    const traces = [{ x: e.x, y: e.true, type: "scatter", mode: e.categorical ? "lines+markers" : "lines", name: "fitted to measured losses", line: { color: "#1b9e77", width: 2.5 }, hovertemplate: "%{x:.3f}: %{y:+.4f} nats<extra></extra>" }];
    const L = layout(axisName(e.input), "change in final loss (nats)");
    L.yaxis.zeroline = true; L.yaxis.zerolinecolor = css("--muted");
    L.showlegend = false;
    Plotly.react("fig-effects", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 5: pair maps with the lowest-loss line and run locations
  const PAIR_CAPTION = {
    "marin|lr|wd": "<b>On Marin the best learning rate falls as weight decay rises, with a slope close to −1 on log axes, so their product stays roughly fixed.</b> This agrees with the view that AdamW weight decay acts through a timescale set by the product of learning rate and weight decay <a href=\"#ref13\">[13]</a>.",
    "marin|lr|D": "<b>On Marin the best learning rate falls as the number of training tokens grows.</b> This agrees with Bjorck et al. <a href=\"#ref12\">[12]</a>, who find that longer training needs a smaller learning rate.",
    "marin|warmup_frac|D": "<b>On Marin the best warmup fraction shows no clear trend with the number of tokens.</b> Few warmup values were run, so this map rests on sparse data, and the high best value is an extrapolation between the dots.",
    "steplaw|lr|batch_tokens": "<b>On StepLaw the best learning rate rises with batch size, by about two thirds of a decade per decade of batch.</b> This lies between square-root scaling and the linear scaling rule of Goyal et al. <a href=\"#ref3\">[3]</a>.",
    "steplaw|lr|N_body": "<b>On StepLaw the best learning rate falls with model size, with a slope of about −0.6 on log axes.</b> The StepLaw paper fits −0.71 <a href=\"#ref10\">[10]</a>.",
    "steplaw|lr|D": "<b>On StepLaw, at a fixed batch size, the best learning rate falls slightly as data grows.</b> The StepLaw paper fits a rise with data, D<sup>0.307</sup>, at the best batch size <a href=\"#ref10\">[10]</a>. The two agree once the batch is tuned: the best batch grows with data and the best learning rate grows with batch, and the slopes from these maps combine to about +0.33.",
    "steplaw|batch_tokens|D": "<b>On StepLaw the best batch size grows with the number of training tokens.</b> The StepLaw paper fits D<sup>0.571</sup> <a href=\"#ref10\">[10]</a>. This map is steeper, about 0.9. McCandlish et al. <a href=\"#ref4\">[4]</a> relate the largest useful batch to a gradient noise scale that grows as the loss falls.",
    "steplaw|d_lr|d_batch": "<b>On StepLaw the best learning rate sits at its reference value for large batches and below it for small batches.</b> The reference values come from the best runs at each model size, so this map shows what is left after that scaling.",
  };
  const PAIR_COMMON = " Colour and contour lines: final loss above the minimum of the map, in nats, predicted by the pairwise spline model fitted to the measured final losses. White line: the lowest-loss value of the horizontal input for each value of the vertical input. Dots: training runs, larger for more runs. The map is a model fit, so regions far from the dots are extrapolation.";
  const pr = { corpus: 0, pair: 0 };
  function fillPairSelect() {
    const P = D.effects[CORPORA[pr.corpus].key].pairs;
    select($("sel-pairs"), P.map((p) => ({ label: (NAMES[p.x] || p.x) + " by " + (NAMES[p.y] || p.y) })), pr.pair, (i) => { pr.pair = i; drawPairs(); });
  }
  function drawPairs() {
    const key = CORPORA[pr.corpus].key, p = D.effects[key].pairs[pr.pair];
    const Z = p.z_true;
    // lowest-loss x for each y, refined between grid points with a parabola through the three nearest values
    const bx = Z.map((row) => {
      const i = row.indexOf(Math.min(...row));
      if (i <= 0 || i >= row.length - 1) return p.gx[i];
      const a = row[i - 1], b = row[i], c = row[i + 1], den = a - 2 * b + c;
      const off = den > 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
      return p.gx[i] + off * (p.gx[i + 1] - p.gx[i]);
    });
    const maxn = Math.max(...p.pn);
    const traces = [
      { x: p.gx, y: p.gy, z: Z, type: "contour", colorscale: "Viridis", ncontours: 12, contours: { coloring: "heatmap", showlines: true },
        line: { color: "rgba(255,255,255,0.35)", width: 0.6 },
        colorbar: { title: { text: "nats above<br>minimum", side: "right" }, thickness: 12 },
        hovertemplate: "x %{x:.2f}, y %{y:.2f}<br>%{z:.4f} nats above minimum<extra></extra>" },
      { x: bx, y: p.gy, type: "scatter", mode: "lines", line: { color: "#ffffff", width: 2.5 }, name: "lowest loss", hovertemplate: "best %{x:.2f} at y %{y:.2f}<extra></extra>" },
      { x: p.px, y: p.py, type: "scatter", mode: "markers", name: "training runs",
        marker: { size: p.pn.map((n) => 4 + 8 * Math.sqrt(n / maxn)), color: "rgba(0,0,0,0)", line: { color: "#ffffff", width: 1 } },
        customdata: p.pn, hovertemplate: "%{customdata} training runs<extra></extra>" },
    ];
    const L = layout(axisName(p.x), axisName(p.y));
    L.showlegend = false;
    L.xaxis.range = [Math.min(...p.gx), Math.max(...p.gx)];
    L.yaxis.range = [Math.min(...p.gy), Math.max(...p.gy)];
    Plotly.react("fig-pairs", traces, L, CFG);
    $("cap-pairs").innerHTML = "Figure 5. " + (PAIR_CAPTION[key + "|" + p.x + "|" + p.y] || "") + PAIR_COMMON;
  }

  // ---------------------------------------------------------------- RFM metric
  const rfm = { corpus: 1, labels: 0, dir: 0 };
  const RFM_LABELS = [{ key: "true", label: "fitted to measured losses" }, { key: "teacher", label: "fitted to TabPFN labels" }];
  function drawRFM() {
    const R = D.effects[CORPORA[rfm.corpus].key].rfm[RFM_LABELS[rfm.labels].key];
    const names = R.inputs.map((k) => NAMES[k] || k);
    const M = R.M, n = names.length;
    const mx = Math.max(...M.flat().map(Math.abs));
    const L = layout("", "");
    L.margin = { l: 240, r: 16, t: 8, b: 190 };
    L.xaxis = Object.assign(L.xaxis, { tickangle: -50, showgrid: false });
    L.yaxis = Object.assign(L.yaxis, { autorange: "reversed", showgrid: false });
    // red outline on each diagonal entry (the importance of one input on its own)
    L.shapes = names.map((_, i) => ({ type: "rect", xref: "x", yref: "y", x0: i - 0.5, x1: i + 0.5, y0: i - 0.5, y1: i + 0.5, line: { color: "#e41a1c", width: 2 }, fillcolor: "rgba(0,0,0,0)" }));
    Plotly.react("fig-rfm", [{ z: M, x: names, y: names, type: "heatmap", colorscale: "RdBu", reversescale: true, zmin: -mx, zmax: mx,
      colorbar: { thickness: 12, title: { text: "metric<br>entry", side: "right" } }, hovertemplate: "%{y} with %{x}: %{z:.3f}<extra></extra>" }], L, CFG);
    const v = R.vecs[rfm.dir], keys = R.inputs.slice().sort((a, b) => Math.abs(v[b]) - Math.abs(v[a]));
    const Lb = layout("weight in this direction", "");
    Lb.margin = { l: 240, r: 16, t: 28, b: 50 };
    Lb.yaxis = Object.assign(Lb.yaxis, { autorange: "reversed" });
    Lb.xaxis.zeroline = true; Lb.xaxis.zerolinecolor = css("--muted");
    Lb.title = { text: "direction " + (rfm.dir + 1) + ": " + (100 * R.eig[rfm.dir]).toFixed(0) + "% of the metric", font: { size: 12 }, x: 0.02, xanchor: "left" };
    Plotly.react("fig-rfm-vec", [{ x: keys.map((k) => v[k]), y: keys.map((k) => NAMES[k] || k), type: "bar", orientation: "h",
      marker: { color: keys.map((k) => (v[k] >= 0 ? "#2166ac" : "#b2182b")) }, hovertemplate: "%{y}: %{x:.3f}<extra></extra>" }], Lb, CFG);
  }

  // ---------------------------------------------------------------- Figure 6: optimizer advantage against model size
  const OPT_COLOR = { muon: "#7570b3", scion: "#9e9ac8", muonh: "#54278f", soap: "#d95f02", kron: "#e6ab02", nadamw: "#1b9e77", mars: "#66a61e", cautious: "#a6d854", lion: "#e7298a", sophia: "#a6761d", adam: "#666666" };
  const OPT_LABEL = { muon: "Muon", scion: "Scion", muonh: "MuonH", soap: "SOAP", kron: "Kron", nadamw: "NAdamW", mars: "MARS", cautious: "Cautious", lion: "Lion", sophia: "Sophia", adam: "Adam", adamw: "AdamW" };
  const SHOWN = ["muon", "soap", "kron"];
  const og = { chin: 0 };
  const CHIN = [{ v: 1, label: "1x Chinchilla tokens" }, { v: 8, label: "8x Chinchilla tokens" }];
  function drawOptGap() {
    const c = CHIN[og.chin].v;
    const G = D.optimizer.gaps.filter((g) => g.chin === c && g.opt !== "adamw");
    const traces = [];
    Object.keys(OPT_COLOR).forEach((o) => {
      const q = G.filter((g) => g.opt === o).sort((a, b) => a.N - b.N);
      if (!q.length) return;
      const vis = SHOWN.includes(o) ? true : "legendonly";
      traces.push({
        x: q.map((g) => g.N), y: q.map((g) => g.gap_actual), type: "scatter", mode: "lines+markers", name: OPT_LABEL[o],
        legendgroup: o, visible: vis, line: { color: OPT_COLOR[o], width: 2 }, marker: { color: OPT_COLOR[o], size: 8 },
        customdata: q.map((g) => g.n_runs),
        hovertemplate: OPT_LABEL[o] + ", measured<br>%{x}M parameters<br>advantage %{y:+.3f} nats (best of %{customdata} runs)<extra></extra>",
      });
      const p = q.filter((g) => g.gap_tabpfn != null);
      if (p.length) {
        traces.push({
          x: p.map((g) => g.N), y: p.map((g) => g.gap_tabpfn), type: "scatter", mode: "markers", name: OPT_LABEL[o] + ", TabPFN",
          legendgroup: o, showlegend: false, visible: vis, marker: { color: OPT_COLOR[o], size: 12, symbol: "circle-open", line: { width: 2 } },
          hovertemplate: OPT_LABEL[o] + ", TabPFN prediction<br>%{x}M parameters<br>advantage %{y:+.3f} nats<extra></extra>",
        });
        traces.push({
          x: p.map((g) => g.N), y: p.map((g) => g.gap_gam), type: "scatter", mode: "markers", name: OPT_LABEL[o] + ", additive splines",
          legendgroup: o, showlegend: false, visible: vis, marker: { color: OPT_COLOR[o], size: 10, symbol: "x-thin-open", line: { width: 2, color: OPT_COLOR[o] } },
          hovertemplate: OPT_LABEL[o] + ", 72-number additive spline prediction<br>%{x}M parameters<br>advantage %{y:+.3f} nats<extra></extra>",
        });
      }
    });
    const L = layout("model size (millions of non-embedding parameters)", "final-loss advantage over AdamW (nats)");
    L.xaxis = Object.assign(L.xaxis, { type: "log", tickvals: [134, 302, 537, 1208], ticktext: ["134", "302", "537", "1208"], range: [Math.log10(110), Math.log10(1500)] });
    L.yaxis.zeroline = true; L.yaxis.zerolinecolor = css("--muted");
    L.shapes = [{ type: "rect", xref: "x", yref: "paper", x0: 430, x1: 1500, y0: 0, y1: 1, fillcolor: css("--rule"), opacity: 0.45, line: { width: 0 }, layer: "below" }];
    L.annotations = [
      { xref: "x", yref: "paper", x: Math.log10(800), y: 0.98, text: "held out: predictions", showarrow: false, font: { size: 11, color: css("--muted") } },
      { xref: "x", yref: "paper", x: Math.log10(200), y: 0.98, text: "seen by the prediction model", showarrow: false, font: { size: 11, color: css("--muted") } },
    ];
    Plotly.react("fig-optgap", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 7: advantage over training, with a caption that follows the selection
  const cells = [], seen = new Set();
  const OPT_CURVES = D.optimizer ? D.optimizer.curves : []; // the optimizer figures are not on the page now
  OPT_CURVES.forEach((r) => { const k = r.N + "|" + r.chin; if (!seen.has(k)) { seen.add(k); cells.push({ N: r.N, chin: r.chin }); } });
  const cellsA = cells.filter((c) => OPT_CURVES.some((r) => r.N === c.N && r.chin === c.chin && r.opt === "adamw")).sort((a, b) => a.N - b.N || a.chin - b.chin);
  const cg = { cell: Math.max(0, cellsA.findIndex((c) => c.N === 537 && c.chin === 4)), opt: 0, opts: [] };
  function fillCurveOpt(prefer) {
    const c = cellsA[cg.cell];
    cg.opts = [...new Set(D.optimizer.curves.filter((r) => r.N === c.N && r.chin === c.chin && r.opt !== "adamw").map((r) => r.opt))].sort();
    const want = cg.opts.indexOf(prefer);
    cg.opt = want >= 0 ? want : 0;
    select($("sel-curveopt"), cg.opts.map((o) => ({ label: OPT_LABEL[o] || o })), cg.opt, (i) => { cg.opt = i; drawCurveGap(); });
  }
  const crossings = (v) => v.slice(1).filter((x, i) => Math.sign(x) !== Math.sign(v[i]) && x !== 0 && v[i] !== 0).length;
  function drawCurveGap() {
    const c = cellsA[cg.cell], o = cg.opts[cg.opt];
    const rows = D.optimizer.curves.filter((r) => r.N === c.N && r.chin === c.chin);
    const a = new Map(rows.filter((r) => r.opt === "adamw").map((r) => [r.frac, r]));
    const b = rows.filter((r) => r.opt === o && a.has(r.frac)).sort((x, y) => x.frac - y.frac);
    const f = b.map((r) => r.frac);
    const act = b.map((r) => a.get(r.frac).loss - r.loss), pre = b.map((r) => a.get(r.frac).pred_tabpfn - r.pred_tabpfn);
    const keep = f.map((x) => x >= 0.25);
    const va = act.filter((_, i) => keep[i]), vp = pre.filter((_, i) => keep[i]);
    const lo = Math.min(0, ...va, ...vp), hi = Math.max(0, ...va, ...vp), pad = 0.12 * (hi - lo || 0.01);
    const lab = OPT_LABEL[o] || o;
    const traces = [
      { x: f, y: act, type: "scatter", mode: "lines+markers", name: "measured", line: { color: OPT_COLOR[o] || "#444", width: 2.5 }, marker: { size: 6 }, hovertemplate: "fraction %{x}<br>measured advantage %{y:+.3f} nats<extra></extra>" },
      { x: f, y: pre, type: "scatter", mode: "lines+markers", name: "TabPFN prediction", line: { color: OPT_COLOR[o] || "#444", width: 2, dash: "dash" }, marker: { size: 7, symbol: "circle-open" }, hovertemplate: "fraction %{x}<br>predicted advantage %{y:+.3f} nats<extra></extra>" },
    ];
    const L = layout("fraction of training", "loss advantage of " + lab + " over AdamW (nats)");
    L.xaxis.range = [0.22, 1.02];
    L.yaxis.range = [lo - pad, hi + pad];
    L.yaxis.zeroline = true; L.yaxis.zerolinecolor = css("--muted");
    Plotly.react("fig-curvegap", traces, L, CFG);
    // caption
    const err = va.reduce((s, x, i) => s + Math.abs(x - vp[i]), 0) / va.length;
    const rough = va.slice(1).reduce((s, x, i) => s + Math.abs(x - va[i]), 0) / Math.max(1, va.length - 1);
    const ca = crossings(va), cp = crossings(vp), nTrain = D.optimizer.train_runs[o] || 0;
    const fa = va[va.length - 1], fp = vp[vp.length - 1];
    const lead = (v) => (v >= 0 ? lab + " ahead by " + Math.abs(v).toFixed(3) : "AdamW ahead by " + Math.abs(v).toFixed(3));
    let head;
    if (c.chin > D.optimizer.max_train_chin) head = `This setting uses ${c.chin}x Chinchilla tokens, more than any training run (at most ${D.optimizer.max_train_chin}x), and the prediction is far off.`;
    else if (nTrain === 0) head = `No training run uses ${lab}, so the prediction model has never seen this optimizer, and the prediction is off.`;
    else if (err > 0.02 && nTrain < 50) head = `Only ${nTrain} training runs use ${lab}, and the prediction is off by ${err.toFixed(3)} nats on average.`;
    else if (err > 0.02 && rough > 0.02) head = `The measured curve is noisy from one point to the next, so part of the difference from the prediction is noise.`;
    else if (err <= 0.015) head = `The prediction follows the measured curve closely, within ${err.toFixed(3)} nats on average.`;
    else head = `The prediction has the right overall pattern and is off by ${err.toFixed(3)} nats on average.`;
    const cross = `Measured, the curves cross ${ca} time${ca === 1 ? "" : "s"} after 25% of training. Predicted, they cross ${cp} time${cp === 1 ? "" : "s"}.`;
    $("cap-curvegap").innerHTML = `Figure 8. <b>${lab} against AdamW at ${c.N}M parameters and ${c.chin}x Chinchilla tokens. ${head}</b> ${cross} At the end of training, measured: ${lead(fa)} nats. Predicted: ${lead(fp)} nats. ` +
      `The plot shows the loss advantage over AdamW of the best run of each optimizer, measured (solid) and predicted by TabPFN (dashed); above zero means ${lab} is ahead. Only held-out settings are listed. The plot starts at 22% of training; double-click it to show the start.`;
  }

  // ---------------------------------------------------------------- Figures 7 and 8: downstream accuracy
  const HAS_ACC = !!document.getElementById("fig-accloss") && D.targets;
  const HAS_ACCRESID = !!document.getElementById("fig-accresid") && D.targets;
  function drawAccLoss() {
    const A = D.targets.acc_vs_loss, r = A.runs;
    const groups = [
      { name: "training runs (134M, 302M)", f: (i) => r.split[i] !== "ood", color: css("--muted"), size: 5 },
      { name: "held out, 537M", f: (i) => r.split[i] === "ood" && r.N[i] < 1000, color: "#d95f02", size: 7 },
      { name: "held out, 1.2B", f: (i) => r.split[i] === "ood" && r.N[i] >= 1000, color: "#7570b3", size: 8 },
    ];
    const traces = groups.map((g) => {
      const idx = r.loss.map((_, i) => i).filter(g.f);
      return { x: idx.map((i) => r.loss[i]), y: idx.map((i) => r.acc[i]), type: "scatter", mode: "markers", name: g.name,
        marker: { color: g.color, size: g.size, opacity: 0.7 }, hovertemplate: "loss %{x:.3f}<br>accuracy %{y:.1f}%<extra>" + g.name + "</extra>" };
    });
    traces.push({ x: A.grid, y: A.h, type: "scatter", mode: "lines", name: "8-number curve fitted on training runs", line: { color: css("--fg"), width: 2.5 },
      hovertemplate: "loss %{x:.3f}<br>curve %{y:.1f}%<extra></extra>" });
    const L = layout("final training loss (nats)", "downstream accuracy, lm_eval macro average (%)");
    // arrows that mark the better direction on each axis: lower loss to the left, higher accuracy upward
    L.margin = { l: 104, r: 16, t: 8, b: 92 };
    L.legend = { orientation: "v", x: 0.99, y: 0.99, xanchor: "right", yanchor: "top", font: { size: 11 }, bgcolor: "rgba(0,0,0,0)" };
    const ac = css("--muted");
    L.annotations = [
      { xref: "paper", yref: "paper", x: 0.60, y: -0.235, ax: 0.98, ay: -0.235, axref: "paper", ayref: "paper", showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 2, arrowcolor: ac, text: "" },
      { xref: "paper", yref: "paper", x: 0.79, y: -0.235, yshift: 11, showarrow: false, text: "lower loss", font: { size: 11, color: ac } },
      { xref: "paper", yref: "paper", x: -0.125, y: 0.92, ax: -0.125, ay: 0.50, axref: "paper", ayref: "paper", showarrow: true, arrowhead: 2, arrowsize: 1.2, arrowwidth: 2, arrowcolor: ac, text: "" },
      { xref: "paper", yref: "paper", x: -0.125, y: 0.71, xshift: -15, showarrow: false, text: "higher accuracy", textangle: -90, font: { size: 11, color: ac } },
    ];
    L.yaxis.title.standoff = 6;
    Plotly.react("fig-accloss", traces, L, CFG);
  }
  const OPT_BY_CODE = ["Adam", "AdamW", "Cautious", "Kron", "Lion", "MARS", "Muon", "MuonH", "NAdamW", "other", "Scion", "SOAP", "Sophia"];
  const ar = { input: 0 };
  function fillAccResid() {
    select($("sel-accresid"), D.targets.acc_resid.pd.map((e) => ({ label: e.input === "opt_code" ? "optimizer" : (NAMES[e.input] || e.input) })), ar.input, (i) => { ar.input = i; drawAccResid(); });
  }
  function drawAccResid() {
    const e = D.targets.acc_resid.pd[ar.input];
    let traces, L;
    if (e.input === "opt_code") {
      traces = [{ x: e.x.map((c) => OPT_BY_CODE[c] || c), y: e.y, type: "bar", marker: { color: "#1b9e77" }, hovertemplate: "%{x}: %{y:+.2f} points<extra></extra>" }];
      L = layout("optimizer", "change in accuracy at equal loss (points)");
    } else {
      traces = [{ x: e.x, y: e.y, type: "scatter", mode: e.categorical ? "lines+markers" : "lines", line: { color: "#1b9e77", width: 2.5 }, hovertemplate: "%{x:.3f}: %{y:+.2f} points<extra></extra>" }];
      L = layout(axisName(e.input), "change in accuracy at equal loss (points)");
    }
    L.showlegend = false; L.yaxis.zeroline = true; L.yaxis.zerolinecolor = css("--muted");
    Plotly.react("fig-accresid", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 4: effects inside strata (measured slices, no model)
  const HAS_STRATA = !!document.getElementById("fig-strata") && D.strata;
  const SIZE_COL = { 60: "#c6dbef", 120: "#9ecae1", 134: "#9ecae1", 215: "#6baed6", 268: "#4292c6", 302: "#4292c6", 429: "#08519c", 537: "#f16913", 1074: "#a63603", 1208: "#a63603" };
  const sizeColor = (n) => SIZE_COL[n] || (n > 430 ? "#d94801" : "#6baed6");
  const STRATA_KNOBS = [
    { key: "steplaw|lr", label: "StepLaw: learning rate" },
    { key: "marin|decay_frac", label: "Marin: decay length" },
    { key: "marin|beta2", label: "Marin: Adam beta2" },
    { key: "marin|eps", label: "Marin: Adam epsilon" },
    { key: "marin|grad_clip", label: "Marin: gradient clipping" },
    { key: "marin|beta1", label: "Marin: Adam beta1" },
    { key: "marin|wd", label: "Marin: weight decay" },
    { key: "marin|lr", label: "Marin: learning rate" },
    { key: "marin|batch_tokens", label: "Marin: batch size at fixed tokens" },
  ];
  const STRATA_AXIS = { lr: "peak learning rate (log10)", decay_frac: "fraction of training in learning-rate decay", beta2: "Adam beta2", eps: "Adam epsilon (log10)",
    grad_clip: "gradient clipping threshold (0 means none)", beta1: "Adam beta1", wd: "weight decay (log10)", batch_tokens: "batch size in tokens (log10)" };
  const median = (v) => { const a = v.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const STRATA_TEXT = {
    "steplaw|lr": (st) => `<b>Inside a single cell, the final loss has a bowl in the learning rate, and the bowl widens as the model grows (Figure 7).</b> Lines are the ${st.n} StepLaw cells at their best batch size.`,
    "marin|decay_frac": (st) => `<b>Decaying the learning rate over most of training is best in almost every cell.</b> The best decay covers 80% of training or more in ${st.count((r) => r.best >= 0.79)} of ${st.n} cells, and a decay over 22% of training is worse than the best in every cell that tried it.`,
    "marin|beta2": (st) => `<b>Adam beta2 moves the final loss by about ${st.med.toFixed(2)} nats across 0.9 to 0.995 in a typical cell, and 0.98 or 0.99 is best in ${st.count((r) => r.best >= 0.975 && r.best <= 0.995)} of ${st.n} cells.</b>`,
    "marin|eps": (st) => `<b>Adam epsilon barely matters: from 10<sup>-25</sup> to 10<sup>-7</sup> it moves the final loss by about ${st.med.toFixed(3)} nats in a typical cell, and no value is consistently best.</b>`,
    "marin|grad_clip": (st) => `<b>Clipping the gradient norm at 1, at 2 or not at all moves the final loss by about ${st.med.toFixed(3)} nats in a typical cell.</b> Only ${st.n} cells vary it.`,
    "marin|beta1": (st) => `<b>Adam beta1 moves the final loss by about ${st.med.toFixed(2)} nats across 0.8 to 0.99, and the best value differs from cell to cell.</b>`,
    "marin|wd": (st) => `<b>Weight decay moves the final loss by about ${st.med.toFixed(2)} nats across the tested values, and the best value depends on the cell, from 0.1 to 0.9.</b>`,
    "marin|lr": (st) => `<b>Inside a cell, the learning rate moves the final loss by about ${st.med.toFixed(2)} nats across the tested values, and the best value depends on the optimizer.</b> An average over optimizers, as in a partial-dependence plot, mixes these different curves.`,
    "marin|batch_tokens": (st) => `<b>At a fixed token budget, batch size is the largest one-knob effect, about ${st.med.toFixed(2)} nats in a typical cell, and the smallest tested batch is best in ${st.count((r) => Math.abs(r.best - Math.min(...r.x)) < 1e-6)} of ${st.n} cells.</b>`,
  };
  const STRATA_COMMON = " Each line is one stratum: the measured final losses of runs in one cell (one model size and token budget, and for Marin one optimizer) that differ only in this knob, shown as the loss above the best run of the line. Blue lines are model sizes the prediction models were fitted on, orange lines held-out sizes. The knob was changed one at a time from a configuration tuned at the other values, so a value that needs the others retuned may look worse than it is. Hover a line for its cell.";
  const strataState = { knob: 0 };
  function strataSlices(key) {
    const [corpus, knob] = key.split("|");
    if (corpus === "steplaw") return D.strata.steplaw.slices.filter((r) => r.at_best_batch).map((r) => ({ x: r.lr, loss: r.loss, N: r.N, best: r.best_lr, ood: r.ood, label: `${r.N}M parameters, ${r.D}B tokens` }));
    return D.strata.marin.slices.filter((r) => r.knob === knob).map((r) => ({ x: r.x, loss: r.loss, N: r.N, best: r.best, ood: r.ood, label: `${r.opt}, ${r.N}M parameters, ${r.D}B tokens` }));
  }
  function drawStrata() {
    const key = STRATA_KNOBS[strataState.knob].key, knob = key.split("|")[1];
    const sl = strataSlices(key);
    const shown = new Set();
    const traces = sl.sort((a, b) => a.N - b.N).map((r) => {
      const m = Math.min(...r.loss), grp = r.N + "M" + (r.ood ? " (held out)" : "");
      const first = !shown.has(grp); shown.add(grp);
      return { x: r.x, y: r.loss.map((v) => v - m), type: "scatter", mode: "lines+markers", name: grp, legendgroup: grp, showlegend: first,
        line: { color: sizeColor(r.N), width: r.ood ? 2.2 : 1.4 }, marker: { size: 5, color: sizeColor(r.N) }, opacity: 0.85,
        hovertemplate: r.label + "<br>%{x:.3f}: %{y:.3f} nats above the line's best<extra></extra>" };
    });
    const ymax = Math.min(0.2, Math.max(0.02, ...sl.map((r) => { const v = r.loss.map((q) => q - Math.min(...r.loss)); return median(v) * 3; })));
    const L = layout(STRATA_AXIS[knob], "final loss above the stratum's best run (nats)");
    L.yaxis.range = [-0.004, ymax];
    L.legend = { orientation: "h", x: 0, y: -0.24, font: { size: 11 } };
    L.margin.b = 90;
    Plotly.react("fig-strata", traces, L, CFG);
    const st = { n: sl.length, med: median(sl.map((r) => Math.max(...r.loss) - Math.min(...r.loss))), count: (f) => sl.filter(f).length };
    $("cap-strata").innerHTML = "Figure 4. " + STRATA_TEXT[key](st) + STRATA_COMMON;
  }

  // ---------------------------------------------------------------- Figure 6: learning rate during training, inside strata
  function drawProgress() {
    const P = D.strata.steplaw.progress, M = D.strata.marin_progress;
    const tr = (rows, field, name, color, dash) => ({ x: rows.map((r) => r.frac), y: rows.map((r) => 100 * r[field]), type: "scatter", mode: "lines+markers", name,
      line: { color, width: 2.4, dash }, marker: { size: 5 }, customdata: rows.map((r) => r.n), hovertemplate: name + "<br>fraction %{x}: %{y:.0f}% of %{customdata} strata<extra></extra>" });
    const traces = [tr(P, "lower", "StepLaw, a smaller learning rate is ahead", "#08519c", "solid"), tr(M, "lower", "Marin, a smaller learning rate is ahead", "#d95f02", "solid"),
      tr(P, "higher", "StepLaw, a larger learning rate is ahead", "#08519c", "dot"), tr(M, "higher", "Marin, a larger learning rate is ahead", "#d95f02", "dot")];
    const L = layout("fraction of training", "strata where it is ahead of the final-best learning rate (%)");
    L.yaxis.range = [-3, 103];
    L.legend = { orientation: "h", x: 0, y: -0.24, font: { size: 11 } };
    L.margin.b = 100;
    Plotly.react("fig-progress", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 7: width of the near-best learning-rate range
  function drawTolerance() {
    const S = D.strata.steplaw.slices.filter((r) => !r.censored);
    const jit = (r, i) => r.N * Math.pow(10, ((i % 7) - 3) * 0.006);
    const grp = (f) => S.map((r, i) => ({ r, i })).filter(({ r }) => f(r));
    const fit = grp((r) => !r.ood), ho = grp((r) => r.ood);
    const pts = (g, name, color, sym, field, size) => ({ x: g.map(({ r, i }) => jit(r, i)), y: g.map(({ r }) => (field ? r[field] : r.tol)), type: "scatter", mode: "markers", name,
      marker: { color, size, symbol: sym, line: { color, width: sym.includes("open") ? 2 : 0 } },
      text: g.map(({ r }) => `${r.N}M parameters, ${r.D}B tokens, batch 10^${r.batch.toFixed(2)}`), hovertemplate: name + "<br>%{text}<br>%{y:.2f} decades<extra></extra>" });
    const sizes = [...new Set(S.map((r) => r.N))].sort((a, b) => a - b);
    const med = sizes.map((n) => median(S.filter((r) => r.N === n).map((r) => r.tol)));
    const traces = [pts(fit, "measured, fitted sizes", "#4292c6", "circle", null, 7), pts(ho, "measured, held-out sizes", "#d94801", "circle", null, 8),
      pts(ho.filter(({ r }) => r.pred_rfm_tol != null), "RFM prediction (about 1,100 numbers)", "#1b9e77", "diamond-open", "pred_rfm_tol", 9),
      pts(ho.filter(({ r }) => r.pred_tabpfn_tol != null), "TabPFN prediction", css("--fg"), "x-thin-open", "pred_tabpfn_tol", 8),
      { x: sizes, y: med, type: "scatter", mode: "lines", name: "median of measured strata", line: { color: css("--muted"), width: 2, dash: "dash" }, hovertemplate: "%{x}M: median %{y:.2f} decades<extra></extra>" }];
    const L = layout("model size (millions of non-embedding parameters)", "near-best learning-rate range (decades)");
    L.xaxis = Object.assign(L.xaxis, { type: "log", tickvals: sizes, ticktext: sizes.map(String) });
    L.legend = { orientation: "h", x: 0, y: -0.24, font: { size: 11 } };
    L.margin.b = 100;
    Plotly.react("fig-tolerance", traces, L, CFG);
  }

  // ---------------------------------------------------------------- Figure 9: the small MLP's AGOP against the RFM metric
  const HAS_MLP = !!document.getElementById("fig-mlp-agop") && D.mlp;
  function drawMLP() {
    const J = D.mlp;
    const ins = J.raw.map((k) => ({ N: "model size", D: "tokens", lr: "learning rate", batch: "batch", warmup: "warmup", min_lr: "final LR fraction", frac: "training fraction" })[k]);
    const R = J.rfm_metric, n = R.length, xs = [], cols = { 0: "#1b9e77", 1: "#d95f02", 2: "#7570b3" };
    const tr = Object.keys(J.seeds).map((k) => {
      const A = J.seeds[k].agop_unit, x = [], y = [], t = [];
      for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { x.push(R[i][j]); y.push(A[i][j]); t.push(i === j ? ins[i] : ins[i] + " with " + ins[j]); }
      xs.push(...x);
      return { x, y, text: t, type: "scatter", mode: "markers", name: "seed " + k, marker: { color: cols[k], size: 8, opacity: 0.75 }, hovertemplate: "%{text}<br>RFM %{x:.3f}, MLP %{y:.3f}<extra>seed " + k + "</extra>" };
    });
    const lo = Math.min(...xs, 0), hi = Math.max(...xs);
    tr.push({ x: [lo, hi], y: [lo, hi], type: "scatter", mode: "lines", name: "equal", line: { color: css("--muted"), dash: "dash", width: 1 }, hoverinfo: "skip" });
    const L2 = layout("RFM metric entry", "MLP gradient outer product entry");
    L2.legend = { orientation: "h", x: 0, y: -0.24, font: { size: 11 } };
    L2.margin.b = 90;
    Plotly.react("fig-mlp-agop", tr, L2, CFG);
  }

  // ---------------------------------------------------------------- AGOP landscape map (section removed from the post; draws only if #fig-land exists)
  const LAND = D.landscape;
  const HAS_LAND = !!document.getElementById("fig-land") && !!LAND;
  const LAND_CAP = 0.25; // nats above the lowest point of the map at the top of the colour scale
  const land = { frame: LAND ? LAND.frames.length - 1 : 0, view: 0, timer: null };
  const LAND_KNOBS = [
    { key: "lr", label: "learning rate" }, { key: "batch_tokens", label: "batch size", off: [0.12, 0.17] }, { key: "D", label: "tokens", off: [0.12, -0.2] },
    { key: "N_body", label: "model size", lead: [0.3, 0.78] }, { key: "steps", label: "steps", muted: true },
  ];
  const landText = LAND ? LAND.runs.x.map((_, i) => `${LAND.runs.N[i]}M parameters, ${LAND.runs.D[i]}B tokens<br>batch ${LAND.runs.B[i]}k tokens, learning rate ${LAND.runs.lr[i].toExponential(1)}`) : [];
  function landDots(f) {
    const r = LAND.runs, v = r.resid[String(f.k)];
    return [["training run", "circle", (s) => s === "train"], ["held-out run", "diamond", (s) => s !== "train"]].map(([name, sym, keep]) => {
      const I = r.split.map((s, i) => (keep(s) && v[i] != null ? i : -1)).filter((i) => i >= 0);
      const val = I.map((i) => v[i] - f.min);
      return { x: I.map((i) => r.x[i]), y: I.map((i) => r.y[i]), type: "scatter", mode: "markers", name, text: I.map((i) => landText[i]), customdata: val,
        hovertemplate: name + "<br>%{text}<br>measured: %{customdata:.3f} nats above the lowest point<extra></extra>",
        marker: { size: sym === "circle" ? 5 : 6, symbol: sym, color: val, colorscale: "Viridis", cmin: 0, cmax: LAND_CAP,
          line: { color: sym === "circle" ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)", width: sym === "circle" ? 0.5 : 0.6 } } };
    });
  }
  function drawLand() {
    const f = LAND.frames[land.frame], el = $("fig-land");
    el.style.height = Math.round(Math.min(480, Math.max(330, el.clientWidth * 0.95))) + "px";  // about square on narrow screens
    const Z = f.z.map((row) => row.map((q) => (q == null ? null : q - f.min)));
    const sh = LAND.agop.shares;
    const cbar = { title: { text: "nats above<br>lowest point", side: "right" }, thickness: 12, len: 0.9 };
    const hov = "direction 1 %{x:.2f}, direction 2 %{y:.2f}<br>predicted: %{z:.3f} nats above the lowest point<extra></extra>";
    if (land.view === 0) {
      const traces = [
        { x: LAND.x, y: LAND.y, z: Z, type: "contour", colorscale: "Viridis", zmin: 0, zmax: LAND_CAP, connectgaps: false,
          contours: { coloring: "heatmap", showlines: true, start: 0.025, end: LAND_CAP, size: 0.025 },
          line: { color: "rgba(255,255,255,0.4)", width: 0.6 }, colorbar: cbar, hovertemplate: hov },
        ...landDots(f),
        { x: [f.argmin[0]], y: [f.argmin[1]], type: "scatter", mode: "markers", name: "lowest point",
          marker: { symbol: "star", size: 17, color: "#ffffff", line: { color: "#000000", width: 1 } }, hovertemplate: "lowest point of the map<extra></extra>" },
      ];
      const L = layout(`AGOP direction 1 (${Math.round(100 * sh[0])}% of the trace)`, `AGOP direction 2 (${Math.round(100 * sh[1])}%)`);
      L.showlegend = false;
      L.xaxis.range = [LAND.x[0], LAND.x[LAND.x.length - 1]];
      L.yaxis.range = [LAND.y[0], LAND.y[LAND.y.length - 1]];
      L.yaxis.scaleanchor = "x"; L.yaxis.scaleratio = 1;
      L.xaxis.constrain = "domain"; L.yaxis.constrain = "domain";  // keep the ranges and shrink the plot area instead
      L.uirevision = "land2d";
      Plotly.react("fig-land", traces, L, CFG);
    } else {
      const zc = Z.map((row) => row.map((q) => (q == null ? null : Math.min(q, LAND_CAP))));
      const ax = (title) => ({ title: { text: title }, gridcolor: css("--rule"), color: css("--fg"), showbackground: false, zeroline: false });
      const traces = [
        { x: LAND.x, y: LAND.y, z: zc, type: "surface", colorscale: "Viridis", cmin: 0, cmax: LAND_CAP, colorbar: cbar, opacity: 0.92,
          contours: { z: { show: true, usecolormap: true, project: { z: true }, start: 0.025, end: LAND_CAP, size: 0.025 } }, hovertemplate: hov },
      ];
      const L = { margin: { l: 0, r: 0, t: 0, b: 0 }, paper_bgcolor: "rgba(0,0,0,0)", font: { family: css("--font-small"), size: 11, color: css("--fg") },
        showlegend: false, uirevision: "land3d", hoverlabel: { font: { family: css("--font-small") } },
        scene: { xaxis: ax("direction 1"), yaxis: ax("direction 2"), zaxis: { ...ax("nats above lowest point"), range: [0, LAND_CAP] },
          aspectmode: "manual", aspectratio: { x: 1, y: 1.05, z: 0.6 }, camera: { eye: { x: 1.35, y: -1.55, z: 0.95 } } } };
      Plotly.react("fig-land", traces, L, CFG);
    }
    $("land-frac").value = land.frame;
    $("land-frac-label").textContent = `${Math.round(100 * f.frac)}% of training, map explains ${Math.round(100 * f.r2)}% of the MLP's variance`;
  }
  function drawLandCompass() {
    const A = LAND.arrows, fg = css("--fg"), mu = css("--muted");
    const ann = [];
    LAND_KNOBS.forEach((k) => {
      const [vx, vy] = A[k.key], col = k.muted ? mu : fg, n = Math.hypot(vx, vy) || 1;
      ann.push({ x: vx, y: vy, ax: 0, ay: 0, xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 2, arrowsize: 1.1, arrowwidth: 1.8, arrowcolor: col, text: "" });
      if (k.lead) {  // a short arrow among others: label placed apart, with a thin leader line to its head
        ann.push({ x: vx, y: vy, ax: k.lead[0], ay: k.lead[1], xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 0,
          arrowwidth: 0.8, arrowcolor: mu, text: k.label, font: { size: 11, color: col } });
        return;
      }
      const [ox, oy] = k.off || [0.22 * vx / n, 0.14 * vy / n];  // labels beyond the head, or beside it for crowded arrows
      ann.push({ x: vx + ox, y: vy + oy, xref: "x", yref: "y", showarrow: false, text: k.label, font: { size: 11, color: col } });
    });
    const L = layout("", "");
    L.margin = { l: 4, r: 4, t: 4, b: 4 };
    L.xaxis = { range: [-1.45, 1.45], visible: false, fixedrange: true };
    L.yaxis = { range: [-1.45, 1.45], visible: false, scaleanchor: "x", scaleratio: 1, fixedrange: true };
    L.showlegend = false;
    L.annotations = ann;
    L.shapes = [{ type: "circle", xref: "x", yref: "y", x0: -1, y0: -1, x1: 1, y1: 1, line: { color: css("--rule"), width: 1, dash: "dot" } }];
    Plotly.react("fig-land-compass", [{ x: [0], y: [0], type: "scatter", mode: "markers", marker: { size: 5, color: fg }, hoverinfo: "skip" }], L, CFG);
  }
  function stopLand() {
    if (land.timer) clearInterval(land.timer);
    land.timer = null;
    const b = $("land-play"); if (b) b.textContent = "Play";
  }

  // ---------------------------------------------------------------- Figure 10: norms over training and downstream accuracy, one run at a time
  const HAS_DYN = !!document.getElementById("fig-dyn-p") && D.dynamics && D.small;
  const DYN_MODELS = [
    { key: "MLP_s0", acc: "acc_vialoss_mlp_s0", accKey: "vialoss_mlp_s0", label: "MLP", color: "#c51b7d", dash: "dash" },
    { key: "RFM", acc: "acc_vialoss_rfm", accKey: "vialoss_rfm", label: "RFM", color: "#d95f02", dash: "dash" },
    { key: "spline", acc: "acc_vialoss_spline", accKey: "vialoss_spline", label: "spline", color: "#1b9e77", dash: "dash" },
    { key: "TabPFN", acc: "acc_vialoss_tabpfn", accKey: "vialoss_tabpfn", label: "TabPFN v3", color: "#7570b3", dash: "dot" },
  ];
  const dyn = { run: 0, runs: [] };
  function dynRuns() {
    const P = D.dynamics.targets.P.curves, G = D.dynamics.targets.G.curves;
    const gIdx = new Map(G.map((c, i) => [c.split + "|" + c.run, i]));
    const both = P.map((c, i) => ({ p: i, g: gIdx.get(c.split + "|" + c.run), c })).filter((r) => r.g != null);
    const lists = { id_test: [], ood: [] };
    both.forEach((r) => lists[r.c.split] && lists[r.c.split].push(r));
    const runs = [];
    [["id_test", "in distribution"], ["ood", "held out"]].forEach(([sp, name]) => lists[sp].forEach((r, i) => {
      r.label = `${name}: ${r.c.N}M ${r.c.opt}, ${r.c.D}B tokens (#${i + 1})`;
      r.err = (r.c.err_mlp + G[r.g].err_mlp) / 2;
      runs.push(r);
    }));
    dyn.runs = runs;
    // a typical held-out run among those whose gradient norm ends above its minimum, the pattern the text describes
    const rises = (r) => { const y = G[r.g].obs; return y[y.length - 1] > 1.05 * Math.min(...y); };
    const ho = runs.map((r, i) => [r, i]).filter(([r]) => r.c.split === "ood" && rises(r)).sort((x, y) => x[0].err - y[0].err);
    dyn.run = ho.length ? ho[Math.floor(ho.length / 2)][1] : 0;  // a typical held-out run
  }
  function dynPanel(div, target, yTitle) {
    const r = dyn.runs[dyn.run], F = D.dynamics.fractions;
    const c = D.dynamics.targets[target].curves[target === "P" ? r.p : r.g], x = c.k.map((k) => 100 * F[k]);
    const traces = [{ x, y: c.obs.map((v) => 10 ** v), type: "scatter", mode: "lines+markers", name: "measured", line: { color: css("--fg"), width: 2.2 },
      marker: { size: 4, color: css("--fg") }, hovertemplate: "measured<br>%{x:.0f}%: %{y:.3g}<extra></extra>" }];
    DYN_MODELS.forEach((m) => traces.push({ x, y: c[m.key].map((v) => 10 ** v), type: "scatter", mode: "lines", name: m.label,
      line: { color: m.color, width: 2.2, dash: m.dash }, hovertemplate: m.label + "<br>%{x:.0f}%: %{y:.3g}<extra></extra>" }));
    const L = layout("training fraction (%)", yTitle);
    L.yaxis.type = "log"; L.xaxis.range = [0, 102];
    L.margin = { l: 58, r: 8, t: 6, b: 46 }; L.showlegend = false;
    Plotly.react(div, traces, L, CFG);
  }
  function drawDynamics() {
    dynPanel("fig-dyn-p", "P", "parameter norm");
    dynPanel("fig-dyn-g", "G", "gradient norm");
    const H = D.small.heldout.filter((r) => r.acc != null);
    const traces = DYN_MODELS.map((m) => {
      const q = H.filter((r) => r[m.acc] != null);
      return { x: q.map((r) => r.acc), y: q.map((r) => r[m.acc]), type: "scatter", mode: "markers", name: `${m.label}, ${D.small.acc[m.accKey].mae.toFixed(2)} pp`,
        marker: { color: m.color, size: 6, opacity: 0.55, symbol: q.map((r) => (r.N > 1000 ? "diamond" : "circle")) },
        text: q.map((r) => (r.N > 1000 ? "1.2B" : "537M")), hovertemplate: m.label + ", %{text}<br>observed %{x:.1f}%, predicted %{y:.1f}%<extra></extra>" };
    });
    const all = H.flatMap((r) => [r.acc].concat(DYN_MODELS.map((m) => r[m.acc]).filter((v) => v != null)));
    const lo = Math.floor(Math.min(...all)) - 0.5, hi = Math.ceil(Math.max(...all)) + 0.5;
    traces.push({ x: [lo, hi], y: [lo, hi], type: "scatter", mode: "lines", line: { color: css("--muted"), dash: "dot", width: 1.2 }, hoverinfo: "skip", showlegend: false });
    const L = layout("observed accuracy (%)", "predicted accuracy (%)");
    L.xaxis.range = [lo, hi]; L.yaxis.range = [lo, hi];
    L.margin = { l: 52, r: 8, t: 6, b: 46 };
    L.showlegend = false;  // the MAE of each model is in the shared legend below the panels
    Plotly.react("fig-dyn-acc", traces, L, CFG);
    const sw = (col, dash) => `<svg width="26" height="10" aria-hidden="true"><line x1="1" y1="5" x2="25" y2="5" stroke="${col}" stroke-width="2.5" ${dash === "dash" ? 'stroke-dasharray="5 3"' : dash === "dot" ? 'stroke-dasharray="2 3"' : ""}/></svg>`;
    $("dyn-legend").innerHTML = `<span>${sw(css("--fg"))} measured</span>` + DYN_MODELS.map((m) => `<span>${sw(m.color, m.dash)} ${m.label}${D.small.acc[m.accKey] ? ` (accuracy MAE ${D.small.acc[m.accKey].mae.toFixed(2)} pp)` : ""}</span>`).join("") +
      `<span class="note">(c): circles 537M, diamonds 1.2B</span>`;
  }

  // ---------------------------------------------------------------- Figure 11: held-out error of each method over the norm curves
  const HAS_ERR = !!document.getElementById("fig-err-norm") && D.errors;
  const ERR_MODELS = [
    { key: "MLP", label: "MLP (mean of 3 seeds)", color: "#c51b7d" }, { key: "RFM", label: "RFM", color: "#d95f02" },
    { key: "spline", label: "spline", color: "#1b9e77" }, { key: "TabPFN", label: "TabPFN v3", color: "#7570b3" },
  ];
  function errBars(div, obj, yTitle, refLine) {
    const cats = Object.keys(obj);
    const traces = ERR_MODELS.map((m) => ({
      x: cats, y: cats.map((c) => obj[c][m.key]), type: "bar", name: m.label, marker: { color: m.color },
      error_y: m.key === "MLP" ? { type: "data", symmetric: false, array: cats.map((c) => obj[c].MLP_max - obj[c].MLP),
        arrayminus: cats.map((c) => obj[c].MLP - obj[c].MLP_min), color: css("--fg"), thickness: 1.2, width: 4 } : { visible: false },
      hovertemplate: m.label + "<br>%{x}: %{y:.3f}<extra></extra>",
    }));
    const L = layout("", yTitle);
    L.barmode = "group"; L.bargap = 0.25;
    L.legend = { orientation: "h", x: 0, y: -0.22, font: { size: 11 } };
    L.margin.b = 80;
    if (refLine != null) {
      L.shapes = [{ type: "line", xref: "x", yref: "y", x0: -0.45, x1: 0.45, y0: refLine, y1: refLine, line: { color: css("--fg"), width: 1.5, dash: "dash" } }];
      L.annotations = [{ xref: "x", yref: "y", x: 0, y: refLine, yshift: 10, showarrow: false, text: "measured loss: " + refLine.toFixed(2), font: { size: 10, color: css("--muted") } }];
    }
    Plotly.react(div, traces, L, CFG);
  }
  function drawErrors() {
    errBars("fig-err-norm", D.errors.norms, "MAE (log10 units)");
  }

  function renderAll(animateSize) {
    drawSize(!!animateSize); if (HAS_FRONTIER) drawFrontier(); drawDistilled(); if (HAS_EFF) drawEffects(); if (HAS_PAIRS) drawPairs(); if (HAS_RFM) drawRFM(); if (HAS_OPT) { drawOptGap(); drawCurveGap(); }
    if (HAS_ACC) drawAccLoss();
    if (HAS_ACCRESID) drawAccResid();
    if (HAS_DYN) drawDynamics();
    if (HAS_ERR) drawErrors();
    if (HAS_STRATA) { drawStrata(); drawProgress(); drawTolerance(); }
    if (HAS_MLP) drawMLP();
    if (HAS_LAND) { drawLand(); drawLandCompass(); }
  }
  if (HAS_ACCRESID) fillAccResid();
  if (HAS_DYN) {
    dynRuns();
    select($("sel-dyn-run"), dyn.runs, dyn.run, (i) => { dyn.run = i; drawDynamics(); });
  }
  if (HAS_STRATA) select($("sel-strata"), STRATA_KNOBS, 0, (i) => { strataState.knob = i; drawStrata(); });

  if (HAS_LAND) {
    const sl = $("land-frac");
    sl.max = LAND.frames.length - 1; sl.value = land.frame;
    sl.oninput = () => { stopLand(); land.frame = +sl.value; drawLand(); };
    buttons($("ctl-land-view"), [{ label: "map" }, { label: "3D" }], 0, (i) => { land.view = i; Plotly.purge("fig-land"); drawLand(); });
    $("land-play").onclick = () => {
      if (land.timer) { stopLand(); return; }
      if (land.frame >= LAND.frames.length - 1) land.frame = 0;
      $("land-play").textContent = "Pause";
      drawLand();
      land.timer = setInterval(() => {
        if (land.frame >= LAND.frames.length - 1) { stopLand(); return; }
        land.frame += 1; drawLand();
      }, 900);
    };
  }

  if (HAS_FRONTIER) buttons($("ctl-frontier"), TASKS, 0, (i) => { frontier.task = i; drawFrontier(); });
  buttons($("ctl-distilled"), TASKS, 0, (i) => { distilled.task = i; drawDistilled(); });
  if (HAS_EFF) buttons($("ctl-effects"), CORPORA, 0, (i) => { eff.corpus = i; eff.input = 0; fillEffectSelect(); drawEffects(); });
  if (HAS_PAIRS) buttons($("ctl-pairs"), CORPORA, 0, (i) => { pr.corpus = i; pr.pair = 0; fillPairSelect(); drawPairs(); });
  if (HAS_RFM) buttons($("ctl-rfm"), CORPORA, 1, (i) => { rfm.corpus = i; drawRFM(); });
  if (HAS_RFM) buttons($("ctl-rfm-labels"), RFM_LABELS, 0, (i) => { rfm.labels = i; drawRFM(); });
  if (HAS_RFM) buttons($("ctl-rfm-dir"), [{ label: "direction 1" }, { label: "direction 2" }, { label: "direction 3" }], 0, (i) => { rfm.dir = i; drawRFM(); });
  if (HAS_OPT) {
    buttons($("ctl-optgap"), CHIN, 0, (i) => { og.chin = i; drawOptGap(); });
    select($("sel-curvecell"), cellsA.map((c) => ({ label: c.N + "M parameters, " + c.chin + "x Chinchilla tokens" })), cg.cell,
    (i) => { const prev = cg.opts[cg.opt]; cg.cell = i; fillCurveOpt(prev); drawCurveGap(); });
  }
  if (HAS_EFF) fillEffectSelect(); if (HAS_PAIRS) fillPairSelect(); if (HAS_OPT) fillCurveOpt("muon");
  renderAll(false);
  $("replay-size").onclick = () => drawSize(true);
  // animate Figure 1 when it first scrolls into view
  try {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { drawSize(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe($("fig-size"));
  } catch (e) { /* no observer: the static bars stay */ }
  // theme toggle
  const btn = $("theme-toggle");
  const current = () => root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const setLabel = () => { btn.textContent = current() === "dark" ? "Light mode" : "Dark mode"; };
  btn.onclick = () => {
    const n = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("blog-theme", n); } catch (e) { /* storage blocked */ }
    setLabel(); renderAll(false);
  };
  setLabel();
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { setLabel(); renderAll(false); }); } catch (e) { /* older browsers */ }
})();
