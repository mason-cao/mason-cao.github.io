import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const deckSource = fs.readFileSync(new URL("../deck.js", import.meta.url), "utf8");

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => classes.add(item)),
    remove: (...items) => items.forEach((item) => classes.delete(item)),
    contains: (item) => classes.has(item),
  };
}

function createElement(classNames = []) {
  return {
    classList: createClassList(classNames),
    style: {},
    clientWidth: 0,
    clientHeight: 0,
    addEventListener() {},
    removeEventListener() {},
    closest() {
      return null;
    },
  };
}

function runDeck({ width, height, finePointer = true, reducedMotion = false, search = "" }) {
  const html = createElement();
  const stage = createElement();
  stage.clientWidth = width;
  stage.clientHeight = height;

  const panels = Array.from({ length: 10 }, (_, index) =>
    createElement(index === 6 ? ["hud-panel--sphere"] : [])
  );
  const heads = Array.from({ length: 6 }, () => createElement());
  const scene = createElement();
  const globeEq = createElement();

  const document = {
    documentElement: html,
    getElementById(id) {
      return id === "main-content" ? stage : null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-panel]") return panels;
      if (selector === ".sec-head") return heads;
      return [];
    },
    querySelector(selector) {
      if (selector === ".hud-scene") return scene;
      if (selector === ".globe-eq") return globeEq;
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
  };

  const context = {
    document,
    location: { search },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    matchMedia(query) {
      let matches = false;
      if (query.includes("prefers-reduced-motion")) {
        matches = reducedMotion;
      } else if (query.includes("any-pointer") || query.includes("pointer")) {
        matches = finePointer;
      } else {
        const minWidth = query.match(/min-width:\s*(\d+)px/);
        const minHeight = query.match(/min-height:\s*(\d+)px/);
        if (minWidth) matches = width >= Number(minWidth[1]);
        if (minHeight) matches = height >= Number(minHeight[1]);
      }
      return {
        matches,
        addEventListener() {},
        addListener() {},
      };
    },
    requestAnimationFrame() {
      return 1;
    },
    cancelAnimationFrame() {},
    setTimeout(fn) {
      fn();
      return 1;
    },
    clearTimeout() {},
    performance: {
      now() {
        return 0;
      },
    },
    window: {
      innerWidth: width,
      innerHeight: height,
      addEventListener() {},
      removeEventListener() {},
    },
  };

  vm.runInNewContext(deckSource, context, { filename: "deck.js" });
  return html.classList.contains("deck-float");
}

assert.equal(
  runDeck({ width: 1200, height: 900 }),
  true,
  "cockpit mode should activate on sufficiently wide and tall desktop viewports"
);

assert.equal(
  runDeck({ width: 1200, height: 880 }),
  false,
  "cockpit mode should stay off when the viewport is wide but too short"
);

assert.equal(
  runDeck({ width: 1199, height: 900 }),
  false,
  "cockpit mode should stay off below the minimum width"
);

assert.equal(
  runDeck({ width: 1200, height: 900, reducedMotion: true }),
  false,
  "cockpit mode should respect reduced-motion preferences"
);

console.log("deck mode gate tests passed");
