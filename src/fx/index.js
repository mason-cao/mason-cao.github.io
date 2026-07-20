// ─────────────────────────────────────────────────────────────
// fx/index.js — wires the FX layer to the current mode.
//   float cockpit  → boot cinema + ambient life + interaction fireworks
//   stacked/mobile → globe ignites immediately, scroll reveal untouched
//   reduced motion → cockpit chrome stays; high-motion cinema is bypassed
// deck.js has already run, so html.deck-float is authoritative here.
// ─────────────────────────────────────────────────────────────
import { initBoot } from "./boot.js";
import { initAmbient } from "./ambient.js";
import { initInteract } from "./interact.js";

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const float = document.documentElement.classList.contains("deck-float");
const finePointer = window.matchMedia("(pointer: fine)").matches;

// Ambient first: the cockpit chrome subscribes to boot lifecycle events that
// initBoot may emit synchronously. Reduced motion keeps the useful telemetry,
// sound toggle, and reboot control while omitting ambient animation layers.
if (float) {
  initAmbient({ reduced: reduce });
  if (finePointer && !reduce) initInteract();
}

initBoot({ float, reduced: reduce });
