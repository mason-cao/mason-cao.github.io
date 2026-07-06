// ════════════════════════════════════════════════════════════════════
// main.js — single Vite entry. Import order matters:
//   styles first (tailwind preflight → site css → fx css),
//   then the boot takeover flag (must precede deck.js, which reveals panels),
//   then the existing modules in their old script order,
//   then the FX layer (boot cinematics, ambient, interactions).
// ════════════════════════════════════════════════════════════════════
import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/fx.css";

// NOTE: window.__mcBootTakeover is set by the inline script in index.html —
// import hoisting means nothing set *here* would precede the imports below.

import "./app.js";
import "./constellation.js";
import "./globe.js";
import "./motifs.js";
import "./deck.js";
import "./fx/index.js";
