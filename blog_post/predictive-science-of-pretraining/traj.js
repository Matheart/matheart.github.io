// Figures for the trajectory sections. Data: window.TRAJ_DATA from data/traj_data.js (built by code/cl_blog_traj_data.py).
(function () {
  const D = window.TRAJ_DATA;
  if (!D) return;
  const root = document.documentElement;
  const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const CFG = { displayModeBar: false, responsive: true };
  const $ = (id) => document.getElementById(id);
  const TG = D.targets;
  const rgba = (hex, a) => { const h = hex.replace("#", ""); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

  function base(yTitle) {
    const grid = css("--rule"), fg = css("--fg");
    return {
      margin: { l: 64, r: 16, t: 8, b: 56 }, paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: css("--font-small"), size: 12, color: fg },
      xaxis: { title: { text: "training fraction" }, range: [0, 1.01], tickvals: [0, 0.25, 0.5, 0.75, 1], gridcolor: grid, linecolor: grid, zeroline: false },
      yaxis: { title: { text: yTitle }, gridcolor: grid, linecolor: grid, zeroline: false },
      legend: { orientation: "h", x: 0, y: -0.2, font: { size: 11 } }, hovermode: "x unified",
      hoverlabel: { font: { family: css("--font-small") } },
    };
  }
  function buttons(el, opts, init, onChange) {
    el.innerHTML = "";
    opts.forEach((o, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = o.label; b.setAttribute("aria-pressed", i === init ? "true" : "false");
      b.onclick = () => { el.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); onChange(i); };
      el.appendChild(b);
    });
  }
  // one line per knob with a shaded interval
  function knobTraces(d, fmtY, withBand = true) {
    const tr = [];
    d.knobs.forEach((k) => {
      if (withBand && k.lo) {
        tr.push({ x: d.grid, y: k.hi, mode: "lines", line: { width: 0 }, hoverinfo: "skip", showlegend: false, legendgroup: k.name });
        tr.push({ x: d.grid, y: k.lo, mode: "lines", line: { width: 0 }, fill: "tonexty", fillcolor: rgba(k.color, 0.2), hoverinfo: "skip", showlegend: false, legendgroup: k.name });
      }
      tr.push({ x: d.grid, y: k.y, mode: "lines", name: k.name, legendgroup: k.name, line: { color: k.color, width: 2 }, hovertemplate: k.name + ": %{y:" + fmtY + "}<extra></extra>" });
    });
    return tr;
  }
  const xFmt = (L) => { L.xaxis.hoverformat = ".2f"; return L; };

  // ---------------------------------------------------------------- TabPFN SHAP shares
  const st = { tab: 0, mlp: 0, mlpView: 0, terms: 1, agop: 1 };
  function drawShares(div, d) {
    const tr = knobTraces(d, ".2f");
    tr.push({ x: d.grid, y: d.others, mode: "lines", name: "all other inputs", line: { color: css("--muted"), width: 1.3, dash: "dash" }, hovertemplate: "other inputs: %{y:.2f}<extra></extra>" });
    const L = xFmt(base("share of the prediction"));
    L.yaxis.rangemode = "tozero";
    Plotly.react(div, tr, L, CFG);
  }
  function drawTab() { drawShares("fig-tab-shap", D.shap_tabpfn[TG[st.tab].key]); }

  // ---------------------------------------------------------------- MLP: SHAP shares or LIME slopes
  function drawMLP() { drawShares("fig-mlp", D.shap_mlp[TG[st.mlp].key]); }

  // ---------------------------------------------------------------- spline interaction terms
  function drawTerms() {
    const tg = TG[st.terms], d = D.terms[tg.key], k = tg.unit === "accuracy" ? 4 : 3, sc = 10 ** k;
    const tr = [], yaxes = {}, ann = [];
    const rows = [["1", "one knob (its own term)"], ["2", "two knobs"], ["3", "three knobs"], ["4", "four knobs"]];
    const gap = 0.055, h = (1 - 3 * gap) / 4;
    rows.forEach(([o, lab], r) => {
      const yk = r === 0 ? "y" : "y" + (r + 1), lk = r === 0 ? "yaxis" : "yaxis" + (r + 1);
      const items = d[o];
      tr.push({
        x: items.map((q) => q.v * sc), y: items.map((q) => q.name), yaxis: yk, mode: "markers", type: "scatter", showlegend: false,
        marker: { color: "#0F4D92", size: 8 },
        error_x: { type: "data", symmetric: false, array: items.map((q) => (q.hi - q.v) * sc), arrayminus: items.map((q) => (q.v - q.lo) * sc), color: "#0F4D92", thickness: 1.4, width: 3 },
        hovertemplate: "%{y}<br>change %{x:.2f} × 10<sup>−" + k + "</sup><extra></extra>",
      });
      const top = 1 - r * (h + gap);
      yaxes[lk] = { domain: [top - h, top], autorange: "reversed", type: "category", gridcolor: "rgba(0,0,0,0)", linecolor: css("--rule"), tickfont: { size: 11 }, automargin: true };
      ann.push({ xref: "paper", yref: "paper", x: 0, y: top + 0.005, xanchor: "left", yanchor: "bottom", showarrow: false, text: "<b>" + lab + "</b>", font: { size: 12 } });
    });
    const L = base("");
    Object.assign(L, yaxes);
    L.xaxis = { anchor: "y4", exponentformat: "none", title: { text: "change in held-out error over the curve (" + tg.unit + ", × 10<sup>−" + k + "</sup>)   ← lower is better" }, gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: true, zerolinecolor: css("--fg"), zerolinewidth: 1 };
    ["yaxis", "yaxis2", "yaxis3", "yaxis4"].forEach((key) => { L[key].anchor = "x"; });
    L.annotations = ann; L.hovermode = "closest"; L.margin = { l: 16, r: 16, t: 24, b: 56 };
    Plotly.react("fig-terms", tr, L, CFG);
  }

  // ---------------------------------------------------------------- RFM main direction
  function drawAgop() {
    const d = D.agop_rfm[TG[st.agop].key];
    const tr = knobTraces(d, ".2f");
    const L = xFmt(base("weight in the main direction"));
    L.shapes = [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: 0, y1: 0, line: { color: css("--fg"), width: 1 } }];
    Plotly.react("fig-agop", tr, L, CFG);
  }

  // ---------------------------------------------------------------- boosted trees: navigator and one tree
  const TR = D.trees;
  const CLS = {
    "mean curve over training": "#7D8796", "learning rate and weight decay": "#B64342", "tokens and model size": "#2F6DB5",
    "optimizer type and its settings": "#9A4D8E", "warmup and schedule": "#2E8B8F",
  };
  const OPTS = { adamw: "AdamW", cautious: "Cautious", kron: "Kron", lion: "Lion", mars: "MARS", mini: "Mini", muon: "Muon", nadamw: "NAdamW", scion: "Scion", soap: "SOAP", sophia: "Sophia" };
  const OPTL = ["AdamW", "Cautious", "Kron", "Lion", "MARS", "Mini", "Muon", "NAdamW", "Scion", "SOAP", "Sophia"];
  const LAB = { lr: "peak LR", lr2: "second LR", wd: "weight decay", beta1: "beta1", beta2: "beta2", eps: "−log10 epsilon", warmup_frac: "warmup fraction",
    min_lr_ratio: "final/peak LR", batch: "batch size", seq_len: "sequence length", hidden: "hidden size", heads: "heads", N: "model size", D: "tokens" };
  const big = (x) => (x >= 1e9 ? (x / 1e9).toFixed(1) + "B" : (x / 1e6).toFixed(0) + "M");
  const sci = (x) => { const e = Math.floor(Math.log10(x)); return (x / 10 ** e).toFixed(1) + "e" + e; };
  function rule(n) {
    const f = n.f, t = n.t;
    if (f.endsWith("_na")) return [LAB[f.slice(0, -3)] || f.slice(0, -3), "is set?"];
    if (f === "logf") return ["training fraction", "≤ " + (10 ** t).toFixed(2) + "?"];
    if (f === "lr" || f === "lr2") return [LAB[f], "≤ " + sci(10 ** t) + "?"];
    if (f === "D" || f === "N") return [LAB[f], "≤ " + big(10 ** t) + "?"];
    if (f === "batch") return ["batch size", "≤ " + Math.round(10 ** t) + "?"];
    if (f === "opt_code") { const L = OPTL.filter((_, k) => k <= t), R = OPTL.filter((_, k) => k > t); return L.length <= R.length ? ["optimizer is", L.join(", ") + "?"] : ["optimizer is not", R.join(", ") + "?"]; }
    if (f === "sched_code") return ["schedule", "is cosine?"];
    return [LAB[f] || f, "≤ " + (Math.abs(t) < 1 ? t.toFixed(2) : t.toFixed(1)) + "?"];
  }
  function inputValue(f, cfg, logf) {
    if (f.endsWith("_na")) return cfg[f.slice(0, -3)] == null ? 1 : 0;
    if (f === "logf") return Math.min(Math.max(logf, TR.lo.logf), TR.hi.logf);
    const v = cfg[f];
    return v == null ? TR.mu[f] : Math.min(Math.max(v, TR.lo[f]), TR.hi[f]);
  }
  function walk(tree, cfg, logf) {
    let i = 0; const path = [0];
    while (!tree.nodes[i].l) { const n = tree.nodes[i]; i = inputValue(n.f, cfg, logf) <= n.t + 1e-9 * Math.max(1, Math.abs(n.t)) ? n.a : n.b; path.push(i); }
    return path;
  }
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag); let s = "";
    for (const k in attrs) { const v = attrs[k]; if (typeof v === "string" && v.startsWith("var(")) s += `;${k}:${v}`; else e.setAttribute(k, v); }
    if (s) e.setAttribute("style", s);
    if (parent) parent.appendChild(e); return e;
  }
  const ts = { tree: 38, run: 0, pt: 0 };
  function drawNav() {
    const svg = $("tree-nav"); svg.innerHTML = "";
    const W = 900, H = 150, L = 62, B = 24, top = 8, bw = (W - L - 4) / 100, mx = Math.max(...TR.trees.map((t) => t.avg));
    const yl = el("text", { x: 12, y: (H - B + top) / 2, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)", transform: `rotate(-90 12 ${(H - B + top) / 2})` }, svg); yl.textContent = "average correction (loss)";
    const y = (v) => H - B - (v / mx) * (H - B - top);
    [0, 0.005, 0.01, 0.015].forEach((v) => { el("line", { x1: L, x2: W, y1: y(v), y2: y(v), stroke: "var(--rule)" }, svg); const tx = el("text", { x: L - 5, y: y(v) + 4, "text-anchor": "end", "font-size": 10, fill: "var(--muted)" }, svg); tx.textContent = v.toFixed(3); });
    [1, 25, 50, 75, 100].forEach((k) => { const tx = el("text", { x: L + (k - 0.5) * bw, y: H - 7, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)" }, svg); tx.textContent = k; });
    TR.trees.forEach((t, k) => {
      const r = el("rect", { x: L + k * bw + 0.5, y: y(t.avg), width: bw - 1, height: H - B - y(t.avg), fill: CLS[t.cls], opacity: k === ts.tree ? 1 : 0.75, tabindex: 0, style: "cursor:pointer" }, svg);
      const tl = el("title", {}, r); tl.textContent = `tree ${k + 1}: ${t.cls}`;
      r.onclick = () => { ts.tree = k; drawTreeFig(); };
      r.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ts.tree = k; drawTreeFig(); } };
    });
    el("rect", { x: L + ts.tree * bw - 0.5, y: y(TR.trees[ts.tree].avg) - 3, width: bw + 1, height: H - B - y(TR.trees[ts.tree].avg) + 3, fill: "none", stroke: "var(--fg)", "stroke-width": 1.3 }, svg);
  }
  function drawTree() {
    const t = TR.trees[ts.tree], svg = $("tree-one"); svg.innerHTML = "";
    const run = TR.runs[ts.run], logf = Math.log10(run.frac[ts.pt]);
    const path = new Set(walk(t, run.cfg, logf)), pos = {}, leaves = [];
    (function lay(i, d) { const n = t.nodes[i]; pos[i] = { d }; if (n.l) leaves.push(i); else { lay(n.a, d + 1); lay(n.b, d + 1); } })(0, 0);
    const maxd = Math.max(...Object.values(pos).map((p) => p.d)), W = 900, rowH = 58, H = 40 + maxd * rowH + 30;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    leaves.forEach((i, k) => (pos[i].x = 55 + (k + 0.5) * (W - 110) / leaves.length));
    (function sx(i) { const n = t.nodes[i]; if (n.l) return pos[i].x; pos[i].x = (sx(n.a) + sx(n.b)) / 2; return pos[i].x; })(0);
    Object.values(pos).forEach((p) => (p.y = 26 + p.d * rowH));
    t.nodes.forEach((n, i) => { if (!n.l) [n.a, n.b].forEach((c) => { const on = path.has(i) && path.has(c); el("line", { x1: pos[i].x, y1: pos[i].y, x2: pos[c].x, y2: pos[c].y, stroke: on ? "#B64342" : "var(--rule)", "stroke-width": on ? 2.6 : 1.3 }, svg); }); });
    t.nodes.forEach((n, i) => {
      const on = path.has(i), lines = n.l ? [(n.v >= 0 ? "+" : "−") + Math.abs(n.v).toFixed(3), n.n + " rows"] : rule(n);
      const w = Math.max(...lines.map((s) => s.length)) * 6.4 + 14;
      el("rect", { x: pos[i].x - w / 2, y: pos[i].y - 16, width: w, height: 32, rx: 4, fill: n.l ? "var(--leaf-bg)" : "var(--bg)", stroke: on ? "#B64342" : n.l ? "#C9A100" : "var(--muted)", "stroke-width": on ? 2 : 1 }, svg);
      lines.forEach((s, k) => { const tx = el("text", { x: pos[i].x, y: pos[i].y - 3 + k * 13, "text-anchor": "middle", "font-size": k === 0 ? 11.5 : 10.5, fill: "var(--fg)" }, svg); tx.textContent = s; });
    });
    $("tree-title").textContent = `Tree ${ts.tree + 1} of 100: ${t.cls}`;
    $("tree-pt").textContent = `${(100 * run.frac[ts.pt]).toFixed(0)}% of training`;
  }
  function drawTreeFig() { drawNav(); drawTree(); }
  function initTrees() {
    const sel = $("tree-run");
    TR.runs.forEach((r, k) => { const o = document.createElement("option"); o.value = k; o.textContent = `${OPTS[r.opt] || r.opt}, ${big(r.N)} parameters, ${big(r.D)} tokens, LR ${sci(10 ** r.cfg.lr)}, weight decay ${r.cfg.wd}`; sel.appendChild(o); });
    const sl = $("tree-slider");
    const setRun = () => { const r = TR.runs[ts.run]; sl.max = r.frac.length - 1; ts.pt = r.frac.reduce((b, f, k) => (Math.abs(f - 0.5) < Math.abs(r.frac[b] - 0.5) ? k : b), 0); sl.value = ts.pt; };
    ts.run = Math.max(0, TR.runs.findIndex((r) => r.opt === "adamw")); sel.value = ts.run; setRun();
    sel.onchange = () => { ts.run = +sel.value; setRun(); drawTree(); };
    sl.oninput = () => { ts.pt = +sl.value; drawTree(); };
    $("tree-prev").onclick = () => { ts.tree = (ts.tree + 99) % 100; drawTreeFig(); };
    $("tree-next").onclick = () => { ts.tree = (ts.tree + 1) % 100; drawTreeFig(); };
    $("tree-legend").innerHTML = Object.entries(CLS).map(([c, col]) => `<span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${col}"></i>${c} (${TR.trees.filter((t) => t.cls === c).length})</span>`).join("");
  }

  // ---------------------------------------------------------------- spline illustration: read three curves, then add
  const SI = D.spline_illus, SIN = { lr: "peak LR (log10)", wd: "weight decay", warmup_frac: "warmup fraction" };
  const SIF = { lr: "f<sub>LR</sub>", wd: "f<sub>WD</sub>", warmup_frac: "f<sub>warmup</sub>" };
  const siState = { frame: 1 };
  function drawSplineIllus() {
    const fr = SI.frames[siState.frame], run = { lr: SI.run.lr, wd: SI.run.wd, warmup_frac: SI.run.warmup };
    let lo = Infinity, hi = -Infinity;
    SI.frames.forEach((f) => SI.knobs.forEach((k) => f.curves[k].forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); })));
    const pad = 0.08 * (hi - lo);
    SI.knobs.forEach((k, i) => {
      const L = base("");
      L.xaxis = { title: { text: SIN[k] }, gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
      L.yaxis = { title: { text: i === 0 ? "reading (loss)" : "" }, range: [lo - pad, hi + pad], gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: true, zerolinecolor: css("--muted") };
      L.margin = { l: i === 0 ? 56 : 34, r: 8, t: 30, b: 46 }; L.showlegend = false; L.hovermode = "closest";
      L.title = { text: SIF[k], font: { size: 14 }, x: 0.5 };
      Plotly.react("si-" + i, [
        SI.cat[k] ? { x: SI.x[k], y: fr.curves[k], mode: "lines+markers", line: { color: "#1b9e77", width: 1.2, dash: "dot" }, marker: { color: "#1b9e77", size: 8 }, hovertemplate: "%{x:.3f}: %{y:+.3f}<extra></extra>" }
          : { x: SI.x[k], y: fr.curves[k], mode: "lines", line: { color: "#1b9e77", width: 2.2 }, hovertemplate: "%{x:.3f}: %{y:+.3f}<extra></extra>" },
        { x: [run[k]], y: [fr.read[k]], mode: "markers", marker: { color: "#B64342", size: 10 }, hovertemplate: "this run: %{y:+.3f}<extra></extra>" },
      ], L, CFG);
    });
    // running sum: start at b(t), add the three readings and the rest
    const steps = [["start: mean residual", fr.base], ["+ learning rate", fr.read.lr], ["+ weight decay", fr.read.wd], ["+ warmup", fr.read.warmup_frac], [`+ ${SI.n_other} other knobs`, fr.others]];
    let cum = 0; const bars = [];
    steps.forEach(([lab, v], i) => { const b0 = i === 0 ? v : cum; const e = i === 0 ? v : cum + v; bars.push({ lab, b0, e }); cum = e; });
    const ys = bars.map((b) => b.lab).concat(["= prediction"]);
    const pts = bars.flatMap((b) => [b.b0, b.e]); const xlo = Math.min(...pts), xhi = Math.max(...pts), xp = 0.12 * (xhi - xlo || 0.01);
    const L = base("");
    L.xaxis = { title: { text: "residual (loss)" }, nticks: 4, range: [xlo - xp, xhi + xp], gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
    L.yaxis = { type: "category", categoryorder: "array", categoryarray: ys, autorange: "reversed", gridcolor: "rgba(0,0,0,0)", linecolor: css("--rule"), automargin: true, tickfont: { size: 11 } };
    L.margin = { l: 8, r: 14, t: 30, b: 46 }; L.showlegend = false; L.hovermode = "closest";
    L.title = { text: "add the readings", font: { size: 13 }, x: 0.5 };
    Plotly.react("si-3", [
      { y: bars.slice(1).map((b) => b.lab), x: bars.slice(1).map((b) => b.e - b.b0), base: bars.slice(1).map((b) => b.b0), type: "bar", orientation: "h",
        marker: { color: bars.slice(1).map((b, i) => (i < 3 ? "#1b9e77" : "#9aa4b0")) }, hovertemplate: "%{y}: %{x:+.3f}<extra></extra>" },
      { y: [ys[0], "= prediction"], x: [fr.base, fr.pred], mode: "markers", type: "scatter", marker: { color: [css("--muted"), "#B64342"], size: 11, symbol: ["line-ns-open", "diamond"], line: { width: 2.5, color: [css("--muted"), "#B64342"] } },
        hovertemplate: "%{y}: %{x:.3f}<extra></extra>" },
    ], L, CFG);
  }

  // ---------------------------------------------------------------- RFM metric: distance around one centre
  function drawRfmMetric() {
    const R = D.rfm_metric;
    [["rfm-eye", R.eye, "before learning: M = I"], ["rfm-learned", R.learned, "after learning: M from the AGOP"]].forEach(([div, Z, title], i) => {
      const tr = [
        { x: R.points.map((p) => p[0]), y: R.points.map((p) => p[1]), mode: "markers", type: "scatter", marker: { color: "#C9A100", size: 4, opacity: 0.6 }, name: "other centres", hoverinfo: "skip", showlegend: i === 0 },
        { x: R.grid, y: R.grid, z: Z, type: "contour", contours: { coloring: "lines", start: 0.5, end: 2, size: 0.5, showlabels: true, labelfont: { size: 10, color: css("--fg") } },
          line: { color: "#0F4D92", width: 1.6 }, colorscale: [[0, "#0F4D92"], [1, "#0F4D92"]], showscale: false, hoverinfo: "skip", name: "distance d" },
        { x: [0], y: [0], mode: "markers", type: "scatter", marker: { symbol: "star", size: 14, color: "#B64342" }, name: "one centre", hoverinfo: "skip", showlegend: i === 0 },
      ];
      const L = base("");
      L.xaxis = { title: { text: "peak LR (standardized log10)" }, range: [-2.6, 2.6], gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
      L.yaxis = { title: { text: i === 0 ? "batch size (standardized log10)" : "" }, range: [-2.6, 2.6], scaleanchor: "x", gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
      L.title = { text: title, font: { size: 13 }, x: 0.5 }; L.margin = { l: i === 0 ? 56 : 30, r: 8, t: 34, b: 50 }; L.hovermode = false;
      L.legend = { orientation: "h", x: 0, y: -0.22, font: { size: 11 } };
      if (i === 1) {
        const big = R.eig[0] > R.eig[1] ? 0 : 1, small = 1 - big;
        const v1 = R.vecs[big], v2 = R.vecs[small];
        L.annotations = [
          { x: v1[0] * 0.9, y: v1[1] * 0.9, ax: 0, ay: 0, xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 2, arrowwidth: 1.8, arrowcolor: "#B64342", text: "" },
          { x: v2[0] * 2.2, y: v2[1] * 2.2, ax: 0, ay: 0, xref: "x", yref: "y", axref: "x", ayref: "y", showarrow: true, arrowhead: 2, arrowwidth: 1.8, arrowcolor: "#2E8B8F", text: "" },
          { x: v1[0] * 0.9, y: v1[1] * 0.9, xref: "x", yref: "y", text: "weighted most", showarrow: false, xanchor: "left", xshift: 6, font: { size: 11, color: "#B64342" }, bgcolor: css("--bg") },
          { x: v2[0] * 2.2, y: v2[1] * 2.2, xref: "x", yref: "y", text: "weighted least", showarrow: false, yshift: -12, font: { size: 11, color: "#2E8B8F" }, bgcolor: css("--bg") },
        ];
      }
      Plotly.react(div, tr, L, CFG);
    });
  }

  // ---------------------------------------------------------------- appendix: three more sets of runs
  const AP = D.appendix, APSETS = [{ key: "porian", label: "Porian et al." }, { key: "datadecide", label: "DataDecide" }, { key: "misfitting", label: "(Mis)Fitting" }];
  const APFAM = [["mlp", "MLP", "#c51b7d"], ["trees", "boosted trees", "#a6761d"], ["rfm", "RFM", "#d95f02"], ["spline", "splines that change with training fraction", "#1b9e77"]];
  const apState = { set: 0, metric: 0 };
  function drawAppendix() {
    const d = AP[APSETS[apState.set].key], m = apState.metric === 0 ? "curve" : "final";
    const tr = APFAM.filter(([k]) => d.families[k]).map(([k, lab, col]) => ({
      x: d.families[k].map((p) => p.n), y: d.families[k].map((p) => p[m]), mode: "lines+markers", type: "scatter", name: lab,
      line: { color: col, width: 1.6 }, marker: { color: col, size: 8 }, hovertemplate: lab + "<br>%{x:,} parameters<br>MAE %{y:.4f}<extra></extra>" }));
    const L = base("OOD MAE");
    L.xaxis = { type: "log", title: { text: "number of parameters" }, tickvals: [10, 100, 1e3, 1e4, 1e5], ticktext: ["10", "100", "1k", "10k", "100k"], gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
    const YT = [0.01, 0.02, 0.03, 0.05, 0.07, 0.1, 0.15, 0.2, 0.3, 0.5];
    L.yaxis = { type: "log", title: { text: "OOD MAE (loss)" }, tickvals: YT, ticktext: YT.map(String), gridcolor: css("--rule"), linecolor: css("--rule"), zeroline: false };
    L.hovermode = "closest"; L.legend = { orientation: "h", x: 0, y: -0.22, font: { size: 11 } }; L.margin.b = 90;
    const tp = d.families.tabpfn && d.families.tabpfn[0];
    if (tp) {
      L.shapes = [{ type: "line", xref: "paper", x0: 0, x1: 1, y0: tp[m], y1: tp[m], line: { color: css("--muted"), width: 1.2, dash: "dash" } }];
      L.annotations = [{ xref: "paper", x: 0.01, y: Math.log10(tp[m]), yref: "y", text: "TabPFN v3", showarrow: false, yshift: 9, xanchor: "left", font: { size: 10, color: css("--muted") } }];
    }
    Plotly.react("fig-appendix", tr, L, CFG);
  }

  const TOPT = TG.map((t) => ({ label: t.label }));
  function renderAll() {
    if ($("si-0")) drawSplineIllus();
    if ($("rfm-eye")) drawRfmMetric();
    if ($("fig-appendix")) drawAppendix();
    if ($("fig-tab-shap")) drawTab();
    if ($("fig-mlp")) drawMLP();
    if ($("fig-terms")) drawTerms();
    if ($("fig-agop")) drawAgop();
  }
  if ($("fig-tab-shap")) buttons($("ctl-tab-shap"), TOPT, st.tab, (i) => { st.tab = i; drawTab(); });
  if ($("fig-mlp")) {
    buttons($("ctl-mlp"), TOPT, st.mlp, (i) => { st.mlp = i; drawMLP(); });
  }
  if ($("fig-terms")) buttons($("ctl-terms"), TOPT, st.terms, (i) => { st.terms = i; drawTerms(); });
  if ($("fig-agop")) buttons($("ctl-agop"), TOPT.slice(0, 3), st.agop, (i) => { st.agop = i; drawAgop(); });
  if ($("tree-one")) { initTrees(); drawTreeFig(); }
  if ($("si-0")) buttons($("ctl-si"), SI.frames.map((f) => ({ label: `${Math.round(100 * f.t)}% of training` })), siState.frame, (i) => { siState.frame = i; drawSplineIllus(); });
  if ($("fig-appendix")) {
    buttons($("ctl-appendix"), APSETS, 0, (i) => { apState.set = i; drawAppendix(); });
    buttons($("ctl-appendix-metric"), [{ label: "whole curve" }, { label: "final loss" }], 0, (i) => { apState.metric = i; drawAppendix(); });
  }
  renderAll();
  // redraw the Plotly figures when the theme changes (the tree figure uses CSS variables and follows by itself)
  try { new MutationObserver(renderAll).observe(root, { attributes: true, attributeFilter: ["data-theme"] }); } catch (e) { /* no observer */ }
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderAll); } catch (e) { /* older browsers */ }
})();
