// ─────────────────────────────────────────────────────────────
// fx/index.js — wires the FX layer to the current mode.
//   float cockpit  → boot cinema + ambient life + interaction fireworks
//   stacked/mobile → globe ignites immediately, scroll reveal untouched
//   reduced motion → nothing (main.js already cleared the takeover flag)
// deck.js has already run, so html.deck-float is authoritative here.
// ─────────────────────────────────────────────────────────────
import { initBoot } from "./boot.js";
import { initAmbient } from "./ambient.js";
import { initInteract } from "./interact.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const float = document.documentElement.classList.contains("deck-float");
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (reduce) {
  window.__mcBootTakeover = false;
  window.__mcGlobe?.ignite();
} else {
  // ambient/interact first: they subscribe to the boot lifecycle events
  // that initBoot may emit synchronously (e.g. the ?noboot=1 dev path)
  if (float) {
    initAmbient();
    if (finePointer) initInteract();
  }
  initBoot({ float });
}
