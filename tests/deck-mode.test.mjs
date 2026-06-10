import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const deckSource = readFileSync(new URL("../deck.js", import.meta.url), "utf8");

function classList(initial = []) {
  const names = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => names.add(item)),
    remove: (...items) => items.forEach((item) => names.delete(item)),
    contains: (item) => names.has(item),
    toArray: () => Array.from(names),
  };
}

function element({ width = 0, height = 0, classes = [] } = {}) {
  return {
    clientWidth: width,
    clientHeight: height,
    style: {},
    classList: classList(classes),
    addEventListener() {},
    removeEventListener() {},
    closest() {
      return null;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width, height };
    },
  };
}

function mediaMatches(query, env) {
  const checks = [];
  const minWidth = query.match(/min-width:\s*(\d+)px/);
  const maxWidth = query.match(/max-width:\s*(\d+)px/);

  if (minWidth) checks.push(env.width >= Number(minWidth[1]));
  if (maxWidth) checks.push(env.width <= Number(maxWidth[1]));
  if (query.includes("any-pointer: fine")) {
    checks.push(env.anyPointerFine);
  } else if (query.includes("pointer: fine")) {
    checks.push(env.pointerFine);
  }
  if (query.includes("pointer: coarse")) checks.push(env.pointerCoarse);
  if (query.includes("prefers-reduced-motion: reduce")) {
    checks.push(env.reducedMotion);
  }

  return checks.length > 0 && checks.every(Boolean);
}

function runDeck(env) {
  const html = { classList: classList() };
  const stage = element({ width: env.width, height: env.height });
  const panels = Array.from({ length: 10 }, (_, index) =>
    element({ classes: index === 6 ? ["hud-panel--sphere"] : [] })
  );
  const heads = [element(), element(), element()];

  const context = {
    console,
    document: {
      documentElement: html,
      getElementById: (id) => (id === "main-content" ? stage : null),
      querySelector: () => null,
      querySelectorAll: (selector) => {
        if (selector === "[data-panel]") return panels;
        if (selector === ".sec-head") return heads;
        return [];
      },
      addEventListener() {},
      removeEventListener() {},
    },
    window: {
      innerWidth: env.width,
      innerHeight: env.height,
      addEventListener() {},
      removeEventListener() {},
    },
    location: { search: env.search || "" },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    matchMedia: (query) => ({
      matches: mediaMatches(query, env),
      addEventListener() {},
    }),
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    setTimeout: (callback) => {
      callback();
      return 1;
    },
    clearTimeout() {},
    performance: { now: () => 0 },
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  };

  context.window.deck = null;
  vm.runInNewContext(deckSource, context);

  return {
    deckFloat: html.classList.contains("deck-float"),
    panelWidths: panels.map((panel) => panel.style.width),
  };
}

const cases = [
  {
    name: "MacBook-sized desktop enters cockpit mode",
    env: {
      width: 1440,
      height: 900,
      pointerFine: true,
      anyPointerFine: true,
      pointerCoarse: false,
      reducedMotion: false,
    },
    expectedDeckFloat: true,
  },
  {
    name: "Windows touch laptop with a fine pointer enters cockpit mode",
    env: {
      width: 1366,
      height: 768,
      pointerFine: false,
      anyPointerFine: true,
      pointerCoarse: true,
      reducedMotion: false,
    },
    expectedDeckFloat: true,
  },
  {
    name: "narrow desktop viewport stays stacked instead of cramped",
    env: {
      width: 1000,
      height: 768,
      pointerFine: true,
      anyPointerFine: true,
      pointerCoarse: false,
      reducedMotion: false,
    },
    expectedDeckFloat: false,
  },
  {
    name: "phone remains stacked",
    env: {
      width: 390,
      height: 844,
      pointerFine: false,
      anyPointerFine: false,
      pointerCoarse: true,
      reducedMotion: false,
    },
    expectedDeckFloat: false,
  },
];

for (const testCase of cases) {
  const result = runDeck(testCase.env);
  assert.equal(
    result.deckFloat,
    testCase.expectedDeckFloat,
    testCase.name
  );
}

console.log(`${cases.length} deck mode cases passed`);
