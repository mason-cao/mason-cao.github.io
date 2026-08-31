// ─────────────────────────────────────────────────────────────
// fx/index.js — wires the FX layer to the current mode.
//   float cockpit  → ambient life + interaction effects
//   stacked/mobile → scroll reveal remains untouched
// The OS reduce-motion setting is deliberately ignored; `reduce` reads from
// motion.js (hardcoded false) and is kept only as the one switch to flip if
// that choice is ever revisited.
// deck.js has already run, so html.deck-float is authoritative here.
// ─────────────────────────────────────────────────────────────
import { initAmbient } from "./ambient.js";
import { initInteract } from "./interact.js";
import { prefersReducedMotion } from "../motion.js";

const reduce = prefersReducedMotion;
const float = document.documentElement.classList.contains("deck-float");
const finePointer = window.matchMedia("(pointer: fine)").matches;

if (float) {
  initAmbient({ reduced: reduce });
  if (finePointer && !reduce) initInteract();
}
