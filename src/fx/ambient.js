// ─────────────────────────────────────────────────────────────
// ambient.js — the cockpit never sits still.
//
//   · viewport chrome: corner brackets + live telemetry (clock, FPS,
//     uptime, coordinates) + REBOOT / SND controls
//   · radar sweep arm rotating around the reactor
//   · random holographic flicker on panels
//   · a slow full-screen scanline pass every ~20s
//   · drifting dust motes on a fixed canvas between field and glass
//   · a tiny equalizer beside the music player, alive while playing
//
// Float cockpit + motion only. Everything pauses when the tab hides.
// ─────────────────────────────────────────────────────────────
import { sfx } from "./sfx.js";

const html = document.documentElement;

const buildChrome = () => {
  const chrome = document.createElement("div");
  chrome.className = "mc-chrome";
  chrome.innerHTML = `
    <i class="mc-corner mc-corner--tl" aria-hidden="true"></i>
    <i class="mc-corner mc-corner--tr" aria-hidden="true"></i>
    <i class="mc-corner mc-corner--bl" aria-hidden="true"></i>
    <i class="mc-corner mc-corner--br" aria-hidden="true"></i>
    <div class="mc-tel mc-tel--tl font-mono" aria-hidden="true">
      <span class="mc-tel-dot"></span>SYS·NOMINAL&ensp;<span data-mc-clock>--:--:--</span>
    </div>
    <div class="mc-tel mc-tel--tr font-mono" aria-hidden="true">
      <span data-mc-fps>--</span>FPS&ensp;·&ensp;UPTIME <span data-mc-up>00:00</span>
    </div>
    <div class="mc-tel mc-tel--bl font-mono">
      <button type="button" data-mc-reboot aria-label="Replay boot sequence">⟲ REBOOT</button>
      <button type="button" data-mc-snd aria-label="Toggle interface sound">SND·ON</button>
    </div>
    <div class="mc-tel mc-tel--br font-mono" aria-hidden="true">
      34.05°N 84.07°W&ensp;·&ensp;MC.OS v5.2
    </div>`;
  return chrome;
};

const initChrome = () => {
  const chrome = buildChrome();
  document.body.appendChild(chrome);

  // clock + uptime
  const clockEl = chrome.querySelector("[data-mc-clock]");
  const upEl = chrome.querySelector("[data-mc-up]");
  const t0 = Date.now();
  const tickClock = () => {
    clockEl.textContent = new Date().toLocaleTimeString("en-US", { hour12: false });
    const s = Math.floor((Date.now() - t0) / 1000);
    upEl.textContent =
      String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  tickClock();
  setInterval(tickClock, 1000);

  // FPS meter (sampled twice a second off the shared rAF heartbeat)
  const fpsEl = chrome.querySelector("[data-mc-fps]");
  let frames = 0;
  let last = performance.now();
  const fpsLoop = (now) => {
    frames += 1;
    if (now - last >= 500) {
      fpsEl.textContent = String(Math.round((frames * 1000) / (now - last)));
      frames = 0;
      last = now;
    }
    requestAnimationFrame(fpsLoop);
  };
  requestAnimationFrame(fpsLoop);

  // controls
  const sndBtn = chrome.querySelector("[data-mc-snd]");
  const syncSnd = () => {
    sndBtn.textContent = sfx.muted ? "SND·OFF" : "SND·ON";
    sndBtn.classList.toggle("is-off", sfx.muted);
  };
  syncSnd();
  sndBtn.addEventListener("click", () => {
    sfx.setMuted(!sfx.muted);
    syncSnd();
    sfx.tick();
  });
  chrome.querySelector("[data-mc-reboot]").addEventListener("click", () => {
    sfx.tick();
    document.dispatchEvent(new CustomEvent("mc:reboot"));
  });

  return chrome;
};

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
    if (!document.hidden && !html.classList.contains("mc-booting")) pass();
  }, 21000);
  window.setTimeout(pass, 6000);
};

const initFlicker = () => {
  const schedule = () => {
    window.setTimeout(() => {
      if (!document.hidden && !html.classList.contains("mc-booting")) {
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

const initEq = () => {
  const player = document.querySelector(".music-player");
  if (!player) return;
  const eq = document.createElement("span");
  eq.className = "mc-eq";
  eq.setAttribute("aria-hidden", "true");
  eq.innerHTML = "<i></i><i></i><i></i><i></i><i></i>";
  player.insertBefore(eq, player.querySelector(".music-player-track"));
};

export function initAmbient({ reduced = false } = {}) {
  const chrome = initChrome();
  const radar = reduced ? null : initRadar();
  if (!reduced) {
    initSweep();
    initMotes();
    initEq();
  }

  // chrome + radar come online with the boot sequence and step back during
  // a reboot
  const on = () => {
    chrome.classList.add("is-on");
    radar?.classList.add("is-on");
  };
  const off = () => {
    chrome.classList.remove("is-on");
    radar?.classList.remove("is-on");
  };
  document.addEventListener("mc:boot:done", on);
  document.addEventListener("mc:boot:reset", off);

  if (!reduced) initFlicker();
}
