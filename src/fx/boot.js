// ─────────────────────────────────────────────────────────────
// boot.js — the "clap moment". A cinematic JARVIS power-on:
//
//   gate ("INITIALIZE") → boot log types itself → flash-collapse →
//   globe ignites with a bloom flare → holograms materialize radially
//   outward with scan-wipe edges → chrome + telemetry come online →
//   the name types itself.
//
// The gate doubles as the audio unlock: its click both arms the synth
// SFX engine and (via app.js's existing autoplay unlock) starts the
// ambient track. Float cockpit only — the stacked/mobile page keeps its
// scroll reveal and just ignites the globe immediately.
// ─────────────────────────────────────────────────────────────
import { gsap } from "gsap";
import { sfx } from "./sfx.js";

const html = document.documentElement;

const BOOT_LINES = [
  "MC.OS v5.2 — PERSONAL INTERFACE",
  "> KERNEL ................ OK",
  "> NEURAL CORE ........... ONLINE",
  "> HOLOGRAPHIC ARRAY ..... CALIBRATED",
  "> TELEMETRY LINK ........ SYNCED",
  "> AMBIENT AUDIO ......... ARMED",
  "> ALL SYSTEMS NOMINAL",
];

const emit = (name) => document.dispatchEvent(new CustomEvent(name));

/** panels sorted radially: centre-most materializes first */
const panelsByDistance = () => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  return Array.from(document.querySelectorAll("[data-panel]"))
    .map((el) => {
      const r = el.getBoundingClientRect();
      const dx = r.left + r.width / 2 - cx;
      const dy = r.top + r.height / 2 - cy;
      return { el, d: Math.hypot(dx, dy) };
    })
    .sort((a, b) => a.d - b.d)
    .map((p) => p.el);
};

const buildGate = () => {
  const gate = document.createElement("div");
  gate.className = "mc-gate";
  gate.setAttribute("role", "button");
  gate.setAttribute("tabindex", "0");
  gate.setAttribute("aria-label", "Initialize interface");
  gate.innerHTML = `
    <div class="mc-gate-core" aria-hidden="true">
      <i class="mc-gate-ring"></i>
      <i class="mc-gate-ring mc-gate-ring--2"></i>
      <i class="mc-gate-dot"></i>
    </div>
    <p class="mc-gate-label">INITIALIZE INTERFACE</p>
    <p class="mc-gate-sub">click anywhere · audio on</p>`;
  return gate;
};

const buildBootScreen = () => {
  const boot = document.createElement("div");
  boot.className = "mc-boot";
  boot.setAttribute("aria-hidden", "true");
  boot.innerHTML = `
    <i class="mc-boot-scanline" aria-hidden="true"></i>
    <div class="mc-boot-log">
      <pre class="mc-boot-lines"></pre>
      <div class="mc-boot-bar"><span></span></div>
      <p class="mc-boot-pct font-mono">000%</p>
    </div>
    <i class="mc-boot-flash" aria-hidden="true"></i>`;
  return boot;
};

/** type `text` into pre as an appended line, ~character burst speed */
const typeLine = (pre, text, dur) => {
  const state = { n: 0 };
  let start = "";
  return gsap.to(state, {
    n: text.length,
    duration: dur,
    ease: "none",
    snap: { n: 1 },
    onStart() {
      start = pre.textContent; // capture at play time, not build time
    },
    onUpdate() {
      pre.textContent = start + text.slice(0, state.n);
      if (state.n % 3 === 0) sfx.key();
    },
    onComplete() {
      pre.textContent = start + text + "\n";
    },
  });
};

export function initBoot({ float }) {
  // Stacked / mobile: no overlay cinema — light the globe, type the name,
  // hand reveal back to the scroll observer.
  if (!float) {
    window.__mcBootTakeover = false;
    window.__mcGlobe?.ignite();
    emit("mc:hero:start");
    emit("mc:boot:done");
    return;
  }

  const devSkip = /[?&]noboot=1/.test(location.search);
  html.classList.add("mc-preboot");

  const finishInstantly = () => {
    html.classList.remove("mc-preboot", "mc-booting");
    window.__mcBootTakeover = false;
    window.__mcGlobe?.ignite();
    document.querySelectorAll("[data-panel]").forEach((el) => el.classList.add("is-revealed"));
    emit("mc:hero:start");
    emit("mc:boot:done");
  };

  if (devSkip) {
    finishInstantly();
    return;
  }

  /** the cinematic body — runs after a user gesture (gate or reboot) */
  const runSequence = () => {
    html.classList.add("mc-booting");
    const boot = buildBootScreen();
    document.body.appendChild(boot);
    const pre = boot.querySelector(".mc-boot-lines");
    const bar = boot.querySelector(".mc-boot-bar span");
    const pct = boot.querySelector(".mc-boot-pct");
    const flash = boot.querySelector(".mc-boot-flash");

    const progress = { v: 0 };
    const tl = gsap.timeline({
      onComplete() {
        boot.remove();
        window.__mcBootTakeover = false;
      },
    });

    // overlay in
    tl.fromTo(boot, { opacity: 0 }, { opacity: 1, duration: 0.16, ease: "none" }, 0);

    // boot log types itself; progress bar surges in steps
    let t = 0.2;
    BOOT_LINES.forEach((line, i) => {
      const dur = 0.05 + line.length * 0.006;
      tl.add(typeLine(pre, line, dur), t);
      t += dur + (i === 0 ? 0.12 : 0.05);
    });
    tl.to(
      progress,
      {
        v: 100,
        duration: t - 0.1,
        ease: "steps(17)",
        onUpdate() {
          const p = Math.round(progress.v);
          bar.style.width = p + "%";
          pct.textContent = String(p).padStart(3, "0") + "%";
        },
      },
      0.2
    );

    // flash → collapse the overlay to a horizontal light line
    tl.call(() => sfx.chime(), null, t + 0.08);
    tl.fromTo(flash, { opacity: 0 }, { opacity: 1, duration: 0.07, ease: "none" }, t + 0.1);
    tl.to(flash, { opacity: 0, duration: 0.18 }, t + 0.18);
    tl.to(
      boot,
      {
        clipPath: "inset(49.7% 0 49.7% 0)",
        opacity: 0.9,
        duration: 0.3,
        ease: "power3.inOut",
      },
      t + 0.16
    );
    tl.to(boot, { opacity: 0, duration: 0.14, ease: "none" }, t + 0.44);

    const tIgnite = t + 0.5;

    // globe ignition
    tl.call(
      () => {
        html.classList.remove("mc-preboot", "mc-booting");
        sfx.ignite();
        window.__mcGlobe?.ignite();
        document.querySelector(".globe-rings")?.classList.add("mc-rings-ignite");
        emit("mc:boot:globe");
      },
      null,
      tIgnite
    );

    // holograms materialize, centre → rim
    tl.call(
      () => {
        panelsByDistance().forEach((el, i) => {
          gsap.delayedCall(i * 0.085, () => {
            el.classList.add("is-revealed", "mc-mat");
            sfx.blip(i);
            window.setTimeout(() => el.classList.remove("mc-mat"), 760);
          });
        });
      },
      null,
      tIgnite + 0.22
    );

    // chrome + telemetry online, then the name types itself
    tl.call(() => emit("mc:boot:done"), null, tIgnite + 1.15);
    tl.call(() => emit("mc:hero:start"), null, tIgnite + 1.3);
    tl.to({}, { duration: tIgnite + 1.4 }, 0); // pad timeline length

    // any click / Esc skips straight to the end state
    const skip = (e) => {
      if (e.type === "keydown" && e.key !== "Escape") return;
      tl.progress(1);
      cleanupSkip();
    };
    const cleanupSkip = () => {
      boot.removeEventListener("pointerdown", skip);
      document.removeEventListener("keydown", skip);
    };
    boot.addEventListener("pointerdown", skip);
    document.addEventListener("keydown", skip);
    tl.eventCallback("onComplete", () => {
      cleanupSkip();
      boot.remove();
      window.__mcBootTakeover = false;
      html.classList.remove("mc-preboot", "mc-booting");
      // ensure end-state invariants even after a skip
      window.__mcGlobe?.ignite();
      document.querySelector(".globe-rings")?.classList.add("mc-rings-ignite");
      document
        .querySelectorAll("[data-panel]")
        .forEach((el) => el.classList.add("is-revealed"));
      emit("mc:boot:done");
      emit("mc:hero:start");
    });
  };

  // ── reboot hook for the chrome button ──
  document.addEventListener("mc:reboot", () => {
    if (html.classList.contains("mc-booting")) return;
    window.__mcBootTakeover = true;
    html.classList.add("mc-preboot");
    window.__mcGlobe?.dim?.();
    document.querySelector(".globe-rings")?.classList.remove("mc-rings-ignite");
    document
      .querySelectorAll("[data-panel]")
      .forEach((el) => el.classList.remove("is-revealed"));
    emit("mc:boot:reset");
    window.setTimeout(runSequence, 480);
  });

  // dev hook: ?autoboot=1 skips the gate and runs the cinematic directly
  if (/[?&]autoboot=1/.test(location.search)) {
    runSequence();
    return;
  }

  // ── the gate: one click = audio unlocked + the show begins ──
  const gate = buildGate();
  document.body.appendChild(gate);
  const openGate = (e) => {
    if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
    gate.removeEventListener("pointerdown", openGate);
    gate.removeEventListener("keydown", openGate);
    sfx.unlock();
    sfx.whoosh();
    // if the globe's safety fallback lit it while the gate sat open,
    // power it back down so ignition still flares
    window.__mcGlobe?.dim?.();
    gsap.to(gate.querySelector(".mc-gate-core"), {
      scale: 2.4,
      opacity: 0,
      duration: 0.55,
      ease: "power3.out",
    });
    gsap.to(gate, {
      opacity: 0,
      duration: 0.4,
      delay: 0.12,
      ease: "none",
      onComplete() {
        gate.remove();
        runSequence();
      },
    });
  };
  gate.addEventListener("pointerdown", openGate);
  gate.addEventListener("keydown", openGate);
}
