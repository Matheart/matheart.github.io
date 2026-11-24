// Plots for the hyperparameter-effects literature check. Data: window.FIG45 from data/fig45_data.js (code/cl_fig45_data.py).
(function () {
  const F = window.FIG45;
  const root = document.documentElement;
  const css = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const CFG = { displayModeBar: false, responsive: true };

  function layout(xTitle, yTitle) {
    const grid = css("--rule"), fg = css("--fg");
    return {
      margin: { l: 60, r: 12, t: 8, b: 52 },
      paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: css("--font-small"), size: 12, color: fg },
      xaxis: { title: { text: xTitle }, gridcolor: grid, linecolor: grid, zeroline: false },
      yaxis: { title: { text: yTitle }, gridcolor: grid, linecolor: grid, zeroline: false },
      legend: { orientation: "h", x: 0, y: -0.26, font: { size: 11 } },
      hovermode: "closest",
      hoverlabel: { font: { family: css("--font-small") } },
    };
  }

  // ------------------------------------------------------------ one knob at a time (measured strata, no model)
  const SIZE_COL = { 60: "#c6dbef", 120: "#9ecae1", 134: "#9ecae1", 215: "#6baed6", 268: "#4292c6", 302: "#4292c6", 429: "#08519c", 537: "#f16913", 1074: "#a63603", 1208: "#a63603" };
  const sizeColor = (n) => SIZE_COL[n] || (n > 430 ? "#d94801" : "#6baed6");
  const STRATA_AXIS = { lr: "peak learning rate (log10)", decay_frac: "fraction of training in learning-rate decay", beta2: "Adam beta2",
    eps: "Adam epsilon (log10)", grad_clip: "gradient clipping threshold (0 means none)", beta1: "Adam beta1", wd: "weight decay (log10)",
    batch_tokens: "batch size in tokens (log10)" };
  const median = (v) => { const a = v.slice().sort((x, y) => x - y); const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  function strataSlices(key) {
    const [corpus, knob] = key.split("|");
    if (corpus === "steplaw") return F.steplaw.map((r) => ({ x: r.lr, loss: r.loss, N: r.N, ood: r.ood, label: `${r.N}M parameters, ${r.D}B tokens` }));
    return F.marin.filter((r) => r.knob === knob).map((r) => ({ x: r.x, loss: r.loss, N: r.N, ood: r.ood, label: `${r.opt}, ${r.N}M parameters, ${r.D}B tokens` }));
  }
  function drawStrata(el, key) {
    const knob = key.split("|")[1];
    const sl = strataSlices(key);
    const shown = new Set();
    const traces = sl.sort((a, b) => a.N - b.N).map((r) => {
      const m = Math.min(...r.loss.filter(Number.isFinite)), grp = r.N + "M" + (r.ood ? " (held out)" : "");
      const first = !shown.has(grp); shown.add(grp);
      return { x: r.x, y: r.loss.map((v) => (Number.isFinite(v) ? v - m : null)), type: "scatter", mode: "lines+markers", name: grp, legendgroup: grp, showlegend: first,
        line: { color: sizeColor(r.N), width: r.ood ? 2.2 : 1.4 }, marker: { size: 5, color: sizeColor(r.N) }, opacity: 0.85,
        hovertemplate: r.label + "<br>%{x:.3f}: %{y:.3f} nats above the line's best<extra></extra>" };
    });
    const spans = sl.map((r) => { const v = r.loss.filter(Number.isFinite); return v.map((q) => q - Math.min(...v)); });
    const ymax = Math.min(0.2, Math.max(0.02, ...spans.map((v) => median(v) * 3)));
    const L = layout(STRATA_AXIS[knob], "final loss above the line's best (nats)");
    L.yaxis.range = [-0.004, ymax];
    L.margin.b = 96;
    Plotly.react(el, traces, L, CFG);
  }

  // ------------------------------------------------------------ two knobs at a time (pairwise spline maps) with measured optima
  const NAMES = { lr: "peak learning rate", wd: "weight decay", batch_tokens: "batch size in tokens", D: "training tokens", warmup_frac: "warmup fraction",
    N_body: "non-embedding parameters", d_lr: "learning rate relative to reference", d_batch: "batch size relative to reference" };
  const LOG = new Set(["lr", "wd", "batch_tokens", "D", "N_body", "d_lr", "d_batch"]);
  const axisName = (k) => (NAMES[k] || k) + (LOG.has(k) ? " (log10)" : "");
  function measured(corpus, x, y) {
    const S = F.direct.steplaw_slices.filter((r) => !r.ood);
    const M = F.direct.marin_best;
    let xs = [], ys = [], tx = [];
    if (corpus === "steplaw" && x === "lr" && y === "batch_tokens") S.forEach((r) => { xs.push(r.lr); ys.push(r.b); tx.push(`${r.N}M, ${r.D}B tokens`); });
    else if (corpus === "steplaw" && x === "lr" && y === "N_body") S.filter((r) => r.at_best).forEach((r) => { xs.push(r.lr); ys.push(r.lN); tx.push(`${r.N}M, ${r.D}B tokens, best batch`); });
    else if (corpus === "steplaw" && x === "lr" && y === "D") S.forEach((r) => { xs.push(r.lr); ys.push(r.lD); tx.push(`${r.N}M, batch 10^${r.b.toFixed(2)} tokens`); });
    else if (corpus === "steplaw" && x === "batch_tokens" && y === "D") F.direct.steplaw_cell_best_batch.filter((r) => r.N < 430).forEach((r) => { xs.push(r.b); ys.push(r.lD); tx.push(`${r.N}M, ${r.D}B tokens${r.edge ? ", edge of grid" : ""}`); });
    else if (corpus === "marin" && x === "lr" && y === "D") M.filter((r) => r.knob === "lr").forEach((r) => { xs.push(r.best); ys.push(r.lD); tx.push(`${r.opt}, ${r.N}M, ${r.D}B tokens`); });
    else if (corpus === "marin" && x === "lr" && y === "wd") {
      const cell = {};
      M.forEach((r) => { const k = `${r.opt}|${r.N}|${r.D}`; (cell[k] = cell[k] || { opt: r.opt, N: r.N, D: r.D })[r.knob] = r.best; });
      Object.values(cell).filter((c) => c.lr !== undefined && c.wd !== undefined).forEach((c) => { xs.push(c.lr); ys.push(c.wd); tx.push(`${c.opt}, ${c.N}M, ${c.D}B tokens`); });
    } else return null;
    return { x: xs, y: ys, text: tx, type: "scatter", mode: "markers", name: "measured best",
      marker: { symbol: "diamond", size: 8, color: css("--direct"), line: { color: "#ffffff", width: 1 } },
      hovertemplate: "%{text}<br>measured best: x %{x:.2f}, y %{y:.2f}<extra></extra>" };
  }
  function drawPair(el, corpus, x, y) {
    const p = F.pairs[corpus].find((q) => q.x === x && q.y === y);
    const Z = p.z_true;
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
        line: { color: "rgba(255,255,255,0.35)", width: 0.6 }, colorbar: { title: { text: "nats above<br>minimum", side: "right" }, thickness: 10 },
        hovertemplate: "x %{x:.2f}, y %{y:.2f}<br>%{z:.4f} nats above minimum<extra></extra>", showlegend: false },
      { x: bx, y: p.gy, type: "scatter", mode: "lines", line: { color: "#ffffff", width: 2.5 }, name: "map's lowest loss", hovertemplate: "map's best x %{x:.2f} at y %{y:.2f}<extra></extra>" },
      { x: p.px, y: p.py, type: "scatter", mode: "markers", name: "training runs", marker: { size: p.pn.map((n) => 4 + 7 * Math.sqrt(n / maxn)), color: "rgba(0,0,0,0)", line: { color: "#ffffff", width: 1 } },
        customdata: p.pn, hovertemplate: "%{customdata} training runs<extra></extra>" },
    ];
    const m = measured(corpus, x, y);
    if (m) traces.push(m);
    const L = layout(axisName(x), axisName(y));
    L.xaxis.range = [Math.min(...p.gx), Math.max(...p.gx)];
    L.yaxis.range = [Math.min(...p.gy), Math.max(...p.gy)];
    L.margin.b = 96;
    Plotly.react(el, traces, L, CFG);
  }

  function renderAll() {
    document.querySelectorAll("[data-strata]").forEach((el) => drawStrata(el, el.dataset.strata));
    document.querySelectorAll("[data-pair]").forEach((el) => { const [c, x, y] = el.dataset.pair.split("|"); drawPair(el, c, x, y); });
  }
  renderAll();

  // theme toggle, as in the post
  const btn = document.getElementById("theme-toggle");
  const current = () => root.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const setLabel = () => { btn.textContent = current() === "dark" ? "Light mode" : "Dark mode"; };
  btn.onclick = () => {
    const n = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", n);
    try { localStorage.setItem("fig45-theme", n); } catch (e) { /* storage blocked */ }
    setLabel(); renderAll();
  };
  setLabel();
  try { window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { setLabel(); renderAll(); }); } catch (e) { /* older browsers */ }
})();
