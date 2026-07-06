// ─────────────────────────────────────────────────────────────
// Per-project signature motifs — lightweight 2D canvas (no extra WebGL
// contexts). Each animation is tied to what the project actually does:
//   aeris  → climate anomaly stream with flagged detections
//   nova   → 8-agent dependency pipeline with a travelling data pulse
//   fresh  → freshness decay particles (mint → amber → faded)
//   detox  → focus-session orb (sweeping depletion ring)
// Runs only while on-screen; reduced motion draws a single static frame.
// Shares the site's mint/ink palette.
// ─────────────────────────────────────────────────────────────
(function initMotifs() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MINT = "56, 208, 255"; // cyan — matches the HUD palette
  const AMBER = "255, 184, 77";
  const INK = "238, 241, 246";

  document.querySelectorAll(".motif[data-motif]").forEach((fig) => {
    const canvas = fig.querySelector("canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const kind = fig.dataset.motif;
    let w = 0;
    let h = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = fig.clientWidth || 600;
      h = fig.clientHeight || 150;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = makeDraw(kind, ctx, () => ({ w, h }));

    let raf = null;
    const t0 = performance.now();
    const frame = () => {
      draw((performance.now() - t0) / 1000);
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (raf == null && !reduce) {
        resize();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf != null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    };

    // motifs live in always-visible project panels: run purely on visibility
    let onScreen = false;
    const update = () => {
      if (!onScreen) return stop();
      if (reduce) { resize(); draw(0); } // single static frame under reduced motion
      else start();
    };

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => (onScreen = e.isIntersecting));
          update();
        },
        { threshold: 0.01 }
      ).observe(fig);
    } else {
      onScreen = true;
      update();
    }

    window.addEventListener("resize", () => {
      if (raf != null) resize();
    });
  });

  // ── per-kind draw functions ──
  function makeDraw(kind, ctx, dims) {
    const line = (a) => `rgba(${INK}, ${a})`;
    const mint = (a) => `rgba(${MINT}, ${a})`;
    const grid = () => {
      const { w, h } = dims();
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = line(0.05);
      ctx.lineWidth = 1;
      for (let i = 1; i < 11; i++) {
        const x = (i / 11) * w;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    };

    if (kind === "aeris") {
      const anom = [0.27, 0.58, 0.84];
      return (t) => {
        const { w, h } = dims();
        grid();
        const midY = h * 0.6;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 2) {
          const u = x / w;
          const y =
            midY +
            Math.sin(u * 9 + t * 0.8) * 10 +
            Math.sin(u * 23 - t * 1.3) * 5 +
            Math.sin(u * 51 + t * 0.6) * 2.2;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = mint(0.5);
        ctx.lineWidth = 1.6;
        ctx.stroke();
        anom.forEach((a, i) => {
          const x = a * w;
          const y = midY - 26 - Math.sin(t * 1.6 + i) * 3;
          const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
          ctx.strokeStyle = mint(0.22);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y + 6);
          ctx.lineTo(x, midY);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 7 + pulse * 8, 0, Math.PI * 2);
          ctx.strokeStyle = mint(0.5 * (1 - pulse));
          ctx.lineWidth = 1.4;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 3.4, 0, Math.PI * 2);
          ctx.fillStyle = mint(0.95);
          ctx.fill();
        });
      };
    }

    if (kind === "nova") {
      const N = 8;
      return (t) => {
        const { w, h } = dims();
        ctx.clearRect(0, 0, w, h);
        const pos = [];
        for (let i = 0; i < N; i++) {
          const u = i / (N - 1);
          pos.push({
            x: (0.08 + 0.84 * u) * w,
            y: h * 0.5 + Math.sin(u * 6.0) * h * 0.22
          });
        }
        for (let i = 0; i < N - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(pos[i].x, pos[i].y);
          ctx.lineTo(pos[i + 1].x, pos[i + 1].y);
          ctx.strokeStyle = mint(0.18);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        const prog = ((t * 0.32) % 1) * (N - 1);
        const seg = Math.min(Math.floor(prog), N - 2);
        const f = prog - seg;
        const px = pos[seg].x + (pos[seg + 1].x - pos[seg].x) * f;
        const py = pos[seg].y + (pos[seg + 1].y - pos[seg].y) * f;
        pos.forEach((n, i) => {
          const lit = i <= prog + 0.5;
          ctx.beginPath();
          ctx.arc(n.x, n.y, lit ? 5 : 3.4, 0, Math.PI * 2);
          ctx.fillStyle = lit ? mint(0.95) : line(0.28);
          ctx.fill();
          if (lit) {
            ctx.beginPath();
            ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
            ctx.strokeStyle = mint(0.22);
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });
        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${INK}, 0.95)`;
        ctx.shadowColor = mint(0.9);
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
      };
    }

    if (kind === "fresh") {
      const P = [];
      for (let i = 0; i < 30; i++) {
        P.push({
          x: Math.random(),
          y: Math.random(),
          v: 0.02 + Math.random() * 0.05,
          life: Math.random(),
          r: 1.6 + Math.random() * 2.6
        });
      }
      return (t) => {
        const { w, h } = dims();
        ctx.clearRect(0, 0, w, h);
        P.forEach((p) => {
          p.y -= p.v * 0.016;
          p.life -= 0.0016;
          if (p.y < -0.05 || p.life <= 0) {
            p.x = Math.random();
            p.y = 1.05;
            p.life = 1;
            p.v = 0.02 + Math.random() * 0.05;
          }
          const fresh = Math.max(0, Math.min(1, p.life));
          const col = fresh > 0.45 ? MINT : AMBER;
          const a = Math.min(fresh * 1.4, 0.85) * (fresh < 0.15 ? fresh / 0.15 : 1);
          const x = p.x * w;
          const y = p.y * h;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col}, ${a})`;
          ctx.fill();
        });
      };
    }

    // detox — focus orb
    return (t) => {
      const { w, h } = dims();
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const R = Math.min(w, h) * 0.32;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = line(0.1);
      ctx.lineWidth = 2;
      ctx.stroke();
      const sweep = (t * 0.22) % 1;
      ctx.beginPath();
      ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + sweep * Math.PI * 2);
      ctx.strokeStyle = mint(0.75);
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const ang = (i / 24) * Math.PI * 2;
        const r1 = R + 7;
        const r2 = R + (i % 6 === 0 ? 14 : 10);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
        ctx.strokeStyle = line(0.12);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + pulse * 4, 0, Math.PI * 2);
      ctx.fillStyle = mint(0.5 + pulse * 0.45);
      ctx.shadowColor = mint(0.9);
      ctx.shadowBlur = 14;
      ctx.fill();
      ctx.shadowBlur = 0;
    };
  }
})();
