import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const styleSource = fs.readFileSync(new URL("../style.css", import.meta.url), "utf8");
const indexSource = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const globeSource = fs.readFileSync(new URL("../globe.js", import.meta.url), "utf8");

function createClassList(initial = []) {
  const classes = new Set(initial);
  return {
    add: (...items) => items.forEach((item) => classes.add(item)),
    remove: (...items) => items.forEach((item) => classes.delete(item)),
    contains: (item) => classes.has(item),
    toggle(item, force) {
      if (force === true) {
        classes.add(item);
        return true;
      }
      if (force === false) {
        classes.delete(item);
        return false;
      }
      if (classes.has(item)) {
        classes.delete(item);
        return false;
      }
      classes.add(item);
      return true;
    },
  };
}

function createElement({ classNames = [], rect = {} } = {}) {
  const listeners = new Map();
  const attrs = new Map();
  const element = {
    classList: createClassList(classNames),
    style: { overflow: "" },
    disabled: false,
    tabIndex: -1,
    clientWidth: rect.width ?? 0,
    clientHeight: rect.height ?? 0,
    offsetLeft: rect.left ?? 0,
    scrollLeft: 0,
    scrollWidth: 0,
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = listeners.get(type) ?? [];
      listeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
    dispatch(type, event = {}) {
      const evt = {
        type,
        target: element,
        currentTarget: element,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.propagationStopped = true;
        },
        ...event,
      };
      for (const handler of listeners.get(type) ?? []) handler(evt);
      return evt;
    },
    click() {
      return element.dispatch("click");
    },
    focus() {
      element.focused = true;
    },
    setAttribute(name, value) {
      attrs.set(name, String(value));
      if (name === "tabindex") element.tabIndex = Number(value);
      if (name === "role") element.role = String(value);
    },
    getAttribute(name) {
      return attrs.has(name) ? attrs.get(name) : null;
    },
    removeAttribute(name) {
      attrs.delete(name);
    },
    hasAttribute(name) {
      return attrs.has(name);
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return {
        left: rect.left ?? 0,
        top: rect.top ?? 0,
        width: rect.width ?? element.clientWidth,
        height: rect.height ?? element.clientHeight,
        right: (rect.left ?? 0) + (rect.width ?? element.clientWidth),
        bottom: (rect.top ?? 0) + (rect.height ?? element.clientHeight),
      };
    },
  };
  return element;
}

function createTimelineHarness({ delayedScrollTo = false } = {}) {
  const offsets = [0, 180, 410, 650];
  const nodes = offsets.map((left) =>
    createElement({ rect: { left, width: 160, height: 80 } })
  );
  const track = createElement({ rect: { left: 0, width: 220, height: 120 } });
  track.clientWidth = 220;
  track.scrollWidth = 870;
  track.querySelectorAll = (selector) =>
    selector === ".timeline-node" ? nodes : [];
  track.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: track.clientWidth,
    height: 120,
    right: track.clientWidth,
    bottom: 120,
  });
  track.scrollBy = ({ left }) => {
    track.scrollLeft = Math.max(
      0,
      Math.min(track.scrollLeft + left, track.scrollWidth - track.clientWidth)
    );
  };
  track.scrollTo = ({ left }) => {
    const nextLeft = Math.max(
      0,
      Math.min(left, track.scrollWidth - track.clientWidth)
    );
    if (delayedScrollTo) {
      track.pendingScrollLeft = nextLeft;
      return;
    }
    track.scrollLeft = nextLeft;
  };
  nodes.forEach((node, index) => {
    node.offsetLeft = offsets[index];
    node.getBoundingClientRect = () => ({
      left: offsets[index] - track.scrollLeft,
      top: 0,
      width: 160,
      height: 80,
      right: offsets[index] - track.scrollLeft + 160,
      bottom: 80,
    });
  });

  const prev = createElement();
  const next = createElement();
  const progressFill = createElement();
  const root = createElement();
  root.querySelector = (selector) => {
    if (selector === "[data-timeline-track]") return track;
    if (selector === "[data-timeline-prev]") return prev;
    if (selector === "[data-timeline-next]") return next;
    if (selector === "[data-timeline-progress]") return progressFill;
    return null;
  };

  return { root, track, nodes, prev, next, progressFill };
}

function createGlobeHarness() {
  const scene = createElement({ classNames: ["hud-scene"] });
  const canvas = createElement({ classNames: ["scene-layer", "scene-globe"] });
  scene.querySelector = (selector) => {
    if (selector === "#globe-canvas") return canvas;
    return null;
  };
  return { scene, canvas };
}

function runApp({ timeline = createTimelineHarness(), globe = createGlobeHarness() } = {}) {
  const html = createElement();
  const body = createElement();
  const deck = createElement();
  const documentListeners = new Map();
  const windowListeners = new Map();

  const document = {
    documentElement: html,
    body,
    activeElement: body,
    getElementById(id) {
      if (id === "deck") return deck;
      if (id === "globe-canvas") return globe.canvas;
      return null;
    },
    querySelector(selector) {
      if (selector === ".hud-scene") return globe.scene;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "[data-timeline]") return [timeline.root];
      return [];
    },
    addEventListener(type, handler) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(handler);
    },
    removeEventListener(type, handler) {
      const handlers = documentListeners.get(type) ?? [];
      documentListeners.set(
        type,
        handlers.filter((item) => item !== handler)
      );
    },
    dispatch(type, event = {}) {
      const evt = {
        type,
        target: document,
        currentTarget: document,
        preventDefault() {
          this.defaultPrevented = true;
        },
        ...event,
      };
      for (const handler of documentListeners.get(type) ?? []) handler(evt);
      return evt;
    },
  };

  const context = {
    document,
    window: {
      matchMedia(query) {
        return {
          matches: query.includes("prefers-reduced-motion") ? false : true,
          addEventListener() {},
          addListener() {},
        };
      },
      addEventListener(type, handler) {
        if (!windowListeners.has(type)) windowListeners.set(type, []);
        windowListeners.get(type).push(handler);
      },
      removeEventListener(type, handler) {
        const handlers = windowListeners.get(type) ?? [];
        windowListeners.set(
          type,
          handlers.filter((item) => item !== handler)
        );
      },
      dispatchEvent(event) {
        for (const handler of windowListeners.get(event.type) ?? []) handler(event);
      },
      setTimeout(fn) {
        fn();
        return 1;
      },
      clearTimeout() {},
    },
    requestAnimationFrame(fn) {
      fn();
      return 1;
    },
    cancelAnimationFrame() {},
    setTimeout(fn) {
      fn();
      return 1;
    },
    clearTimeout() {},
    fetch() {
      throw new Error("fetch should not run in app interaction tests");
    },
  };
  context.window.document = document;
  context.window.requestAnimationFrame = context.requestAnimationFrame;
  context.window.cancelAnimationFrame = context.cancelAnimationFrame;

  vm.runInNewContext(appSource, context, { filename: "app.js" });
  document.dispatch("DOMContentLoaded");
  return { timeline, globe, document, html, body, deck };
}

{
  const { timeline } = runApp();
  timeline.next.click();
  assert.equal(
    timeline.track.scrollLeft,
    timeline.nodes[1].offsetLeft,
    "next arrow should land on the next timeline node"
  );
}

{
  const timeline = createTimelineHarness({ delayedScrollTo: true });
  runApp({ timeline });
  assert.equal(timeline.prev.disabled, true);
  timeline.next.click();
  assert.equal(
    timeline.prev.disabled,
    false,
    "previous arrow should enable immediately after moving to the next timeline node"
  );
}

{
  const { timeline } = runApp();
  timeline.track.scrollLeft = timeline.nodes[2].offsetLeft;
  timeline.track.dispatch("scroll");
  timeline.prev.click();
  assert.equal(
    timeline.track.scrollLeft,
    timeline.nodes[1].offsetLeft,
    "previous arrow should land on the previous timeline node"
  );
}

{
  const { timeline } = runApp();
  timeline.track.dispatch("keydown", { key: "ArrowRight" });
  assert.equal(
    timeline.track.scrollLeft,
    timeline.nodes[1].offsetLeft,
    "keyboard right should land on the next timeline node"
  );
}

{
  const { globe, document, html, body, deck } = runApp();
  assert.equal(globe.canvas.getAttribute("role"), "button");
  assert.equal(globe.canvas.getAttribute("aria-expanded"), "false");

  globe.canvas.click();
  assert.equal(
    globe.scene.classList.contains("is-globe-expanded"),
    true,
    "clicking the globe should focus the globe scene"
  );
  assert.equal(html.classList.contains("globe-focus"), true);
  assert.equal(body.style.overflow, "");
  assert.equal(deck.hasAttribute("inert"), false);
  assert.equal(globe.canvas.getAttribute("aria-expanded"), "true");

  globe.canvas.click();
  assert.equal(globe.scene.classList.contains("is-globe-expanded"), false);
  assert.equal(html.classList.contains("globe-focus"), false);
  assert.equal(globe.canvas.getAttribute("aria-expanded"), "false");

  globe.canvas.click();
  assert.equal(globe.scene.classList.contains("is-globe-expanded"), true);

  document.dispatch("pointerdown", { target: deck });
  assert.equal(
    globe.scene.classList.contains("is-globe-expanded"),
    false,
    "clicking outside the focused globe should return it to normal"
  );

  globe.canvas.click();
  assert.equal(globe.scene.classList.contains("is-globe-expanded"), true);

  document.dispatch("keydown", { key: "Escape" });
  assert.equal(globe.scene.classList.contains("is-globe-expanded"), false);
  assert.equal(html.classList.contains("globe-focus"), false);
  assert.equal(body.style.overflow, "");
  assert.equal(deck.hasAttribute("inert"), false);
  assert.equal(globe.canvas.getAttribute("aria-expanded"), "false");
}

assert.match(
  styleSource,
  /html\.deck-float\s+\.deck,\s*html\.deck-float\s+\.deck-stage\s*{[^}]*pointer-events:\s*none/s,
  "cockpit deck shell should not block pointer events from reaching the central globe"
);

assert.match(
  styleSource,
  /html\.deck-float\s+\[data-panel\]\s*{[^}]*pointer-events:\s*auto/s,
  "cockpit panels should remain interactive after deck shell hit-testing is disabled"
);

assert.doesNotMatch(
  indexSource,
  /data-globe-close|class="globe-close"/,
  "expanded globe focus should not render a separate close button"
);

assert.match(
  globeSource,
  /rotX[\s\S]*dy[\s\S]*group\.rotation\.x\s*=\s*rotX/,
  "globe drag should rotate on the vertical axis as well as horizontally"
);

assert.match(
  styleSource,
  /\.hud-scene\.is-globe-expanded canvas\.scene-globe\s*{[^}]*width:\s*min\(82vmin,\s*52rem\)[^}]*height:\s*min\(82vmin,\s*52rem\)/s,
  "focused globe should keep the outer canvas frame at its normal size"
);

assert.match(
  styleSource,
  /\.hud-scene\.is-globe-expanded \.globe-rings\s*{[^}]*width:\s*min\(78vmin,\s*50rem\)[^}]*transform:\s*translate\(-50%,\s*-50%\)/s,
  "outer globe rings should stay pinned at their normal size while the canvas enlarges"
);

assert.match(
  styleSource,
  /\.hud-scene\.is-globe-expanded \.globe-rings\s*{[^}]*opacity:\s*0\.05/s,
  "outer globe rings should fade far back while the inner globe is focused"
);

assert.match(
  globeSource,
  /const coreGroup = new THREE\.Group\(\)[\s\S]*coreGroup\.scale\.setScalar\(1 \+ focusMix \* 0\.45 \+ hoverMix \* 0\.08\)/,
  "focused globe should enlarge the internal Three.js globe core instead of the outer ring frame"
);

assert.match(
  globeSource,
  /uFocus:\s*{ value: 0 }[\s\S]*wireUniforms\.uFocus\.value = focusMix[\s\S]*pUniforms\.uFocus\.value = focusMix/,
  "focused globe should brighten the internal WebGL lines and nodes"
);

assert.match(
  globeSource,
  /const aPath = new Float32Array\(segVerts\)[\s\S]*wireGeo\.setAttribute\("aPath", new THREE\.BufferAttribute\(aPath, 1\)\)/,
  "globe wire shader should mark specific neural-network signal paths"
);

assert.match(
  globeSource,
  /attribute float aEdgeT; attribute float aPhase; attribute float aPath;[\s\S]*varying float vPath;[\s\S]*vPath = aPath;[\s\S]*float pathSignal = min\(vPath \* \(0\.68 \+ uFocus \* 0\.82\), 1\.0\)/,
  "focused globe should clarify selected neural-network paths without brightening every line equally"
);

assert.match(
  globeSource,
  /const threshold = maxContribution \* 0\.42[\s\S]*const targetSignal = edgeContribution\[e\] >= threshold \? Math\.pow\(normalized, 0\.92\) : 0/,
  "equation-selected neural paths should be visibly promoted, not barely above the base mesh"
);

assert.match(
  globeSource,
  /float pulse = smoothstep\(0\.105, 0\.0, d\);[\s\S]*float movingSignal = pulse \* pathSignal;[\s\S]*movingSignal \* 1\.95[\s\S]*movingSignal \* 0\.75/,
  "traveling pulses should get extra brightness only on the moving segment of selected paths"
);

assert.doesNotMatch(
  globeSource,
  /routeA|routeB|Math\.sin\(lon/,
  "neural paths should not be arbitrary longitude/latitude sine masks"
);

assert.match(
  globeSource,
  /const sigmoid = \(x\) => 1 \/ \(1 \+ Math\.exp\(-x\)\);[\s\S]*const runForwardPass = \(time\) =>/,
  "globe should run a deterministic forward-pass simulation"
);

assert.match(
  globeSource,
  /const contribution = Math\.abs\(edgeWeight\[e\] \* activations\[source\]\)/,
  "highlighted paths should be based on |w_ij * a_i| contribution"
);

assert.match(
  globeSource,
  /wireGeo\.attributes\.aPath\.needsUpdate = true/,
  "path highlights should update from the forward pass each frame"
);

assert.match(
  globeSource,
  /camera\.position\.z = BASE_CAMERA_Z \+ focusMix \* 1\.25;/,
  "focused globe should move the camera back only in focused mode, not on hover"
);

assert.match(
  globeSource,
  /atmoUniforms = \{[\s\S]*uFocus:\s*\{ value: 0 \}[\s\S]*atmoUniforms\.uFocus\.value = focusMix/,
  "focused globe should fade the WebGL atmosphere rim along with the CSS ring"
);

assert.doesNotMatch(
  styleSource,
  /canvas\.scene-globe:hover[\s\S]*scale\(1\.035\)/,
  "hover should not scale the outer canvas frame"
);

console.log("app interaction tests passed");
