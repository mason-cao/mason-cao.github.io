// ─────────────────────────────────────────────────────────────
// neuralnet.js — the signature hologram (centerpiece for the NOW module).
//
// A small multilayer network: faint weighted edges, glowing nodes, and a
// "forward pass" that sweeps left→right — pulses race along the edges,
// each layer lights as the wavefront reaches it, and one output node
// fires to a label. Auto-fires; hover/click injects a fresh pass.
// Pure Canvas2D (no extra WebGL context). Pauses when its module is
// hidden; reduced motion draws a single static frame.
// ─────────────────────────────────────────────────────────────
(function initNeuralNet() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("neural-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const CYAN = "56, 208, 255";
  const HI = "205, 243, 255";
  const LAYERS = [4, 6, 6, 3];
  const LABELS = ["PLANET", "SIGNAL", "ANOMALY", "AGENT", "NOMINAL", "OUTLIER"];
  const PASS_MS = 1900;
  const GAP_MS = 1100;

  // edges between consecutive layers, with random signed weights
  const edges = [];
  for (let L = 0; L < LAYERS.length - 1; L++) {
    for (let i = 0; i < LAYERS[L]; i++)
      for (let j = 0; j < LAYERS[L + 1]; j++)
        edges.push({ L, i, j, w: Math.random() * 2 - 1 });
  }
  let inputs = LAYERS[0] ? Array.from({ length: LAYERS[0] }, () => Math.random()) : [];

  let w = 0, h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth || 600;
    h = canvas.clientHeight || 480;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // centered drawing box so the net reads as a hologram, not full-bleed
  function box() {
    const bw = Math.min(w * 0.66, 700);
    const bh = Math.min(h * 0.56, 420);
    return { bw, bh, ox: (w - bw) / 2, oy: (h - bh) / 2 };
  }
  function pos(L, i) {
    const { bw, bh, ox, oy } = box();
    const n = LAYERS[L];
    const x = ox + (LAYERS.length > 1 ? L / (LAYERS.length - 1) : 0.5) * bw;
    const y = oy + (n > 1 ? (i / (n - 1)) * bh : 0.5) * (n > 1 ? 1 : 0) + (n > 1 ? 0 : bh / 2);
    return { x, y };
  }

  // a forward pass
  let pass = { t0: -GAP_MS, outIdx: 0, label: LABELS[0] };
  function fire(now) {
    inputs = inputs.map(() => Math.random());
    pass = {
      t0: now,
      outIdx: (Math.random() * LAYERS[LAYERS.length - 1]) | 0,
      label: LABELS[(Math.random() * LABELS.length) | 0],
    };
  }

  const cyan = (a) => `rgba(${CYAN}, ${a})`;
  const hi = (a) => `rgba(${HI}, ${a})`;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const elapsed = now - pass.t0;
    if (elapsed > PASS_MS + GAP_MS && !reduce) fire(now);
    const prog = reduce ? 0.6 : clamp01(elapsed / PASS_MS);
    const wave = prog * (LAYERS.length - 1);

    // edges + travelling pulses
    edges.forEach((e) => {
      const a = pos(e.L, e.i);
      const b = pos(e.L + 1, e.j);
      const act = clamp01(wave - e.L); // 0→1 as the front crosses this gap
      const base = 0.07 + Math.abs(e.w) * 0.09;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = cyan(base + act * 0.22 * Math.abs(e.w));
      ctx.lineWidth = 0.6 + Math.abs(e.w) * 0.7;
      ctx.stroke();
      if (act > 0 && act < 1) {
        const px = a.x + (b.x - a.x) * act;
        const py = a.y + (b.y - a.y) * act;
        ctx.beginPath();
        ctx.arc(px, py, 1.7, 0, Math.PI * 2);
        ctx.fillStyle = hi(0.5 + 0.5 * Math.abs(e.w));
        ctx.fill();
      }
    });

    // nodes
    for (let L = 0; L < LAYERS.length; L++) {
      for (let i = 0; i < LAYERS[L]; i++) {
        const p = pos(L, i);
        let lit = clamp01(wave - L + 0.6);
        if (L === 0) lit = Math.max(lit, inputs[i] || 0);
        const last = L === LAYERS.length - 1;
        const isOut = last && i === pass.outIdx && prog > 0.92;
        const r = 3.2 + lit * 2 + (isOut ? 2.4 : 0);
        if (lit > 0.05 || isOut) {
          ctx.shadowColor = cyan(0.8);
          ctx.shadowBlur = 8 + lit * 14 + (isOut ? 12 : 0);
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isOut ? hi(0.98) : `rgba(${CYAN}, ${0.42 + lit * 0.55})`;
        ctx.fill();
        ctx.shadowBlur = 0;
        // ring on lit nodes
        if (lit > 0.4) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, r + 3.5, 0, Math.PI * 2);
          ctx.strokeStyle = cyan(0.25 * lit);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // output label
    if (prog > 0.9) {
      const p = pos(LAYERS.length - 1, pass.outIdx);
      const a = clamp01((prog - 0.9) / 0.1) * (reduce ? 1 : clamp01((PASS_MS + GAP_MS - elapsed) / 320));
      ctx.font = "600 12px 'JetBrains Mono', monospace";
      ctx.textBaseline = "middle";
      ctx.fillStyle = hi(a);
      ctx.fillText(`▸ ${pass.label}`, p.x + 16, p.y);
      ctx.beginPath();
      ctx.moveTo(p.x + 7, p.y);
      ctx.lineTo(p.x + 13, p.y);
      ctx.strokeStyle = cyan(a);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  let raf = null;
  const frame = () => { draw(performance.now()); raf = requestAnimationFrame(frame); };
  const start = () => { if (raf == null && !reduce) { resize(); raf = requestAnimationFrame(frame); } };
  const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

  // inject a pass on interaction
  canvas.addEventListener("pointerdown", () => fire(performance.now()));
  let hoverThrottle = 0;
  canvas.addEventListener("pointermove", () => {
    const now = performance.now();
    if (now - hoverThrottle > 900) { hoverThrottle = now; fire(now); }
  });

  const isVisible = () => canvas.classList.contains("is-active");
  const sync = () => {
    if (isVisible() && !document.hidden) start();
    else { stop(); resize(); draw(performance.now()); }
  };
  window.addEventListener("deck:module", sync);
  window.addEventListener("deck:ready", sync);
  document.addEventListener("visibilitychange", sync);
  window.addEventListener("resize", () => { if (raf != null) resize(); });

  resize();
  draw(performance.now());
  setTimeout(sync, 60);
})();
