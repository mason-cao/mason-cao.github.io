// ─────────────────────────────────────────────────────────────
// ambient.js — the cockpit never sits still.
//
//   · radar sweep arm rotating around the reactor
//   · random holographic flicker on panels
//   · a slow full-screen scanline pass every ~20s
//   · drifting dust motes on a fixed canvas between field and glass
//
// Float cockpit + motion only. Everything pauses when the tab hides.
// ─────────────────────────────────────────────────────────────
const initRadar = () => {
  const radar = document.createElement("div");
  radar.className = "mc-radar";
  radar.setAttribute("aria-hidden", "true");
  document.body.appendChild(radar);
  return radar;
};

const initSweep = () => {
  const sweep = document.createElement("i");
  sweep.className = "mc-sweep";
  sweep.setAttribute("aria-hidden", "true");
  document.body.appendChild(sweep);
  const pass = () => {
    sweep.classList.add("is-running");
  };
  sweep.addEventListener("animationend", () => sweep.classList.remove("is-running"));
  setInterval(() => {
    if (!document.hidden) pass();
  }, 21000);
  window.setTimeout(pass, 6000);
};

const initFlicker = () => {
  const schedule = () => {
    window.setTimeout(() => {
      if (!document.hidden) {
        const panels = Array.from(document.querySelectorAll(".hud-panel.is-revealed"));
        const target = panels[Math.floor(Math.random() * panels.length)];
        if (target) {
          target.classList.add("mc-flicker");
          window.setTimeout(() => target.classList.remove("mc-flicker"), 340);
        }
      }
      schedule();
    }, 4200 + Math.random() * 4800);
  };
  schedule();
};

const initMotes = () => {
  const canvas = document.createElement("canvas");
  canvas.className = "mc-motes";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const N = 64;
  const motes = Array.from({ length: N }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: 0.5 + Math.random() * 1.1,
    vx: (Math.random() - 0.35) * 0.012,
    vy: -(0.004 + Math.random() * 0.014),
    ph: Math.random() * Math.PI * 2,
  }));

  let raf = null;
  const frame = (now) => {
    ctx.clearRect(0, 0, w, h);
    const t = now / 1000;
    for (const m of motes) {
      m.x += m.vx * 0.016;
      m.y += m.vy * 0.016;
      if (m.y < -0.02 || m.x < -0.02 || m.x > 1.02) {
        m.x = Math.random();
        m.y = 1.02;
      }
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7 + m.ph));
      ctx.beginPath();
      ctx.arc(m.x * w, m.y * h, m.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(143, 230, 255, ${0.28 * tw})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf == null) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
};

export function initAmbient({ reduced = false } = {}) {
  const radar = reduced ? null : initRadar();
  radar?.classList.add("is-on");
  if (!reduced) {
    initSweep();
    initMotes();
  }

  if (!reduced) initFlicker();
}
