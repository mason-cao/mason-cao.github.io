// ─────────────────────────────────────────────────────────────
// Live field — an interactive atmospheric scalar field rendered as
// animated isolines over a soft mint elevation wash. Pure 2D canvas
// (no extra WebGL context): a handful of drifting lobes breathe the
// field, marching squares trace the contours, and the cursor presses
// a bump into it so the isolines bend around your pointer. Echoes the
// environmental-intelligence work — reading structure out of a moving
// atmospheric field. Pauses off-screen; one static frame under reduced
// motion.
// ─────────────────────────────────────────────────────────────
(function initField() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fig = document.querySelector("[data-field]");
  if (!fig) return;
  const canvas = fig.querySelector("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const readEl = document.getElementById("field-read");

  const CELL = 18; // px between field samples
  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let grid = new Float32Array(0);

  // low-res offscreen for the smooth elevation wash (scaled up with smoothing)
  const off = document.createElement("canvas");
  const offctx = off.getContext("2d");
  let img = null;

  // pointer state
  let px = -9999;
  let py = -9999;
  let press = 0;
  let pressTarget = 0;
  let hasPointer = false;

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = fig.clientWidth || 600;
    h = fig.clientHeight || 360;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / CELL) + 1;
    rows = Math.ceil(h / CELL) + 1;
    grid = new Float32Array(cols * rows);
    off.width = cols;
    off.height = rows;
    img = offctx.createImageData(cols, rows);
  };

  // scalar field at canvas pixel (x, y), time t (seconds)
  const field = (x, y, t) => {
    const nx = x / w;
    const ny = y / h;
    let v =
      Math.sin(nx * 3.1 + t * 0.18) * Math.cos(ny * 2.3 - t * 0.12) +
      0.6 * Math.sin(nx * 5.7 - ny * 4.1 + t * 0.26) +
      0.4 * Math.cos(nx * 2.2 + ny * 6.3 - t * 0.16) +
      0.5 * Math.sin(Math.hypot(nx - 0.5, ny - 0.5) * 7.0 - t * 0.4);
    if (hasPointer) {
      const dx = x - px;
      const dy = y - py;
      const R = 150 + press * 130;
      v += (2.0 + press * 2.6) * Math.exp(-(dx * dx + dy * dy) / (R * R));
    }
    return v;
  };

  const LEVELS = [
    -1.8, -1.4, -1.0, -0.6, -0.2, 0.2, 0.6, 1.0, 1.4, 1.9, 2.5, 3.2
  ];

  // elevation → wash color (deep navy → cyan → bright cyan), a radar/sonar
  // scan read, written into the low-res ImageData then stretched with smoothing
  const paintWash = () => {
    const d = img.data;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = grid[j * cols + i];
        const tt = Math.max(0, Math.min(1, (v + 2.2) / 5.2));
        let r, g, b;
        if (tt < 0.5) {
          const k = tt / 0.5;
          r = 6 + (24 - 6) * k;
          g = 18 + (120 - 18) * k;
          b = 30 + (190 - 30) * k;
        } else {
          const k = (tt - 0.5) / 0.5;
          r = 24 + (143 - 24) * k;
          g = 120 + (230 - 120) * k;
          b = 190 + (255 - 190) * k;
        }
        const o = (j * cols + i) * 4;
        d[o] = r;
        d[o + 1] = g;
        d[o + 2] = b;
        d[o + 3] = Math.round((0.06 + tt * 0.4) * 255);
      }
    }
    offctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, 0, 0, cols, rows, 0, 0, w, h);
  };

  // marching squares for one iso-level, batched into a single path
  const isoline = (level) => {
    ctx.beginPath();
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const x0 = i * CELL;
        const y0 = j * CELL;
        const x1 = x0 + CELL;
        const y1 = y0 + CELL;
        const tl = grid[j * cols + i];
        const tr = grid[j * cols + i + 1];
        const br = grid[(j + 1) * cols + i + 1];
        const bl = grid[(j + 1) * cols + i];
        let idx = 0;
        if (tl > level) idx |= 8;
        if (tr > level) idx |= 4;
        if (br > level) idx |= 2;
        if (bl > level) idx |= 1;
        if (idx === 0 || idx === 15) continue;
        // edge-crossing points (only the ones a given case needs are used)
        const A = [x0 + ((level - tl) / (tr - tl)) * CELL, y0]; // top
        const B = [x1, y0 + ((level - tr) / (br - tr)) * CELL]; // right
        const C = [x0 + ((level - bl) / (br - bl)) * CELL, y1]; // bottom
        const D = [x0, y0 + ((level - tl) / (bl - tl)) * CELL]; // left
        const seg = (p, q) => {
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q[0], q[1]);
        };
        switch (idx) {
          case 1: seg(D, C); break;
          case 2: seg(C, B); break;
          case 3: seg(D, B); break;
          case 4: seg(A, B); break;
          case 5: seg(A, D); seg(C, B); break;
          case 6: seg(A, C); break;
          case 7: seg(A, D); break;
          case 8: seg(A, D); break;
          case 9: seg(A, C); break;
          case 10: seg(A, B); seg(C, D); break;
          case 11: seg(A, B); break;
          case 12: seg(D, B); break;
          case 13: seg(C, B); break;
          case 14: seg(D, C); break;
        }
      }
    }
  };

  const draw = (t) => {
    // sample the field onto the grid
    for (let j = 0; j < rows; j++) {
      const yy = j * CELL;
      for (let i = 0; i < cols; i++) {
        grid[j * cols + i] = field(i * CELL, yy, t);
      }
    }

    ctx.clearRect(0, 0, w, h);
    paintWash();

    // isolines, brighter near sea level (0), fading toward the extremes
    ctx.lineJoin = "round";
    for (let l = 0; l < LEVELS.length; l++) {
      const level = LEVELS[l];
      const emphasis = 1 - Math.min(Math.abs(level) / 3.2, 1);
      ctx.lineWidth = level === 0.2 || level === -0.2 ? 1.5 : 1;
      isoline(level);
      ctx.strokeStyle = `rgba(56, 208, 255, ${0.15 + emphasis * 0.35})`;
      ctx.stroke();
    }

    // cursor press: a ring riding the field
    if (hasPointer) {
      ctx.beginPath();
      ctx.arc(px, py, 8 + press * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(143, 230, 255, ${0.35 + press * 0.45})`;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(234, 255, 248, 0.95)";
      ctx.fill();
    }

    if (readEl) {
      const sample = hasPointer
        ? field(px, py, t)
        : grid[(rows >> 1) * cols + (cols >> 1)];
      readEl.textContent = (1013 + sample * 3.4).toFixed(1);
    }
  };

  // ── animation lifecycle ──
  let raf = null;
  const t0 = performance.now();
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    press += (pressTarget - press) * 0.12;
    draw(t);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf == null && !reduce) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  // ── pointer interaction (mouse only; touch keeps native scroll) ──
  const setPointer = (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    px = e.clientX - r.left;
    py = e.clientY - r.top;
    hasPointer = true;
    if (raf == null && !reduce) draw((performance.now() - t0) / 1000);
  };
  fig.addEventListener("pointermove", setPointer);
  fig.addEventListener("pointerdown", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    pressTarget = 1;
    setPointer(e);
  });
  const releasePress = () => {
    pressTarget = 0;
  };
  fig.addEventListener("pointerup", releasePress);
  fig.addEventListener("pointercancel", releasePress);
  fig.addEventListener("pointerleave", () => {
    hasPointer = false;
    pressTarget = 0;
  });

  size();
  draw(reduce ? 2.2 : 0);

  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      size();
      if (raf == null) draw(reduce ? 2.2 : (performance.now() - t0) / 1000);
    }, 150);
  });

  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.04 }
    ).observe(fig);
  } else if (!reduce) {
    start();
  }
})();
