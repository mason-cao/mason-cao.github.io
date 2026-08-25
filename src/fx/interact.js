// ─────────────────────────────────────────────────────────────
// interact.js — the page erupts when touched.
//
//   · click shockwaves: expanding ring + globe pulse + chromatic jolt
//   · panel hover: scan-sweep + label scramble-decode + blip
//   · magnetic CTAs that lean toward the cursor
//
// Float cockpit + fine pointer + motion only.
// ─────────────────────────────────────────────────────────────
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { sfx } from "./sfx.js";

gsap.registerPlugin(ScrambleTextPlugin);

const html = document.documentElement;
const initShockwaves = () => {
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    if (html.classList.contains("mc-booting") || html.classList.contains("mc-preboot")) return;
    const ring = document.createElement("i");
    ring.className = "mc-shock";
    ring.style.left = e.clientX + "px";
    ring.style.top = e.clientY + "px";
    document.body.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove());
    window.setTimeout(() => ring.remove(), 900); // safety
    sfx.tick();
    window.__mcGlobe?.pulse(0.55);
    window.__mcGlobe?.jolt(0.4);
  });
};

const initPanelHover = () => {
  document.addEventListener("mouseover", (e) => {
    const panel = e.target.closest?.(".hud-panel");
    if (!panel || panel.contains(e.relatedTarget)) return;

    const now = performance.now();
    const lastScan = Number(panel.dataset.mcScan || 0);
    if (now - lastScan < 1200) return;
    panel.dataset.mcScan = String(now);

    panel.classList.add("is-scanning");
    window.setTimeout(() => panel.classList.remove("is-scanning"), 700);
    sfx.hover();

    const label = panel.querySelector(".hud-panel-label");
    if (label && !label.dataset.mcScrambling) {
      label.dataset.mcScrambling = "1";
      const text = label.dataset.mcText || label.textContent;
      label.dataset.mcText = text;
      gsap.to(label, {
        duration: 0.55,
        scrambleText: { text, chars: "upperCase", speed: 1.4 },
        onComplete() {
          delete label.dataset.mcScrambling;
        },
      });
    }
  });
};

const initMagnetic = () => {
  const strength = 7;
  document.querySelectorAll(".hud-cta").forEach((el) => {
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width - 0.5) * strength * 2);
      yTo(((e.clientY - r.top) / r.height - 0.5) * strength);
    });
    el.addEventListener("pointerleave", () => {
      xTo(0);
      yTo(0);
    });
  });
};

export function initInteract() {
  initShockwaves();
  initPanelHover();
  initMagnetic();
}
