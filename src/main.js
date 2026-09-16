import "./styles/tailwind.css";
import "./styles/style.css";

import { initApp } from "./app.js";
import { initHero } from "./hero.js";
import { initReveal } from "./reveal.js";
import { initCountUp } from "./countup.js";
import { initIntro } from "./intro.js";

// Each piece is independent, so one failing must not take the rest of the
// page with it.
for (const init of [initApp, initHero, initReveal, initCountUp, initIntro]) {
  try {
    init();
  } catch (err) {
    console.error(`${init.name} failed`, err);
  }
}
