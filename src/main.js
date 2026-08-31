// ════════════════════════════════════════════════════════════════════
// main.js — single Vite entry. Import order matters:
//   styles first (tailwind preflight → site css → fx css),
//   then the existing modules in their old script order,
//   then the ambient and interaction FX layer.
// ════════════════════════════════════════════════════════════════════
import "./styles/tailwind.css";
import "./styles/style.css";
import "./styles/fx.css";

import "./app.js";
import "./constellation.js";
import "./globe.js";
import "./motifs.js";
import "./deck.js";
import "./fx/index.js";
