/* ════════════════════════════════════════════════════════════════════
   deck.js — the command-deck controller

   Turns the page into a Jarvis HUD: a persistent frame around a central
   stage that shows one "module" at a time as a cluster of floating,
   draggable HUD panels. Two capability tiers:

     deck-on     — JS present: single-module switching (works everywhere,
                   incl. mobile where panels just stack).
     deck-float  — capable desktop (fine pointer, motion ok): the full
                   cockpit — fixed viewport, absolutely-positioned panels
                   you can grab and throw, mouse parallax, centerpiece swap.

   No build step, no imports. Talks to globe/neuralnet via the
   `deck:module` event + CSS classes on the centerpiece elements.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const html = document.documentElement;
  const deck = document.getElementById("deck");
  if (!deck) return;
  const stage = document.getElementById("main-content");
  const groups = Array.from(deck.querySelectorAll(".module-group"));
  const railBtns = Array.from(deck.querySelectorAll("[data-module-btn]"));
  const modIdx = deck.querySelector("[data-modline-idx]");
  const modName = deck.querySelector("[data-modline-name]");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const floatMQ = matchMedia("(min-width: 761px) and (pointer: fine)");
  const forceFloat = /[?&]float=1/.test(location.search); // dev / screenshot override
  const canFloat = () => forceFloat || floatMQ.matches;

  const MODULES = ["home", "now", "signal", "stack", "timeline", "play", "comms"];
  const NAMES = {
    home: "HOME", now: "NOW", signal: "SIGNAL", stack: "STACK",
    timeline: "TIMELINE", play: "OFF-CLOCK", comms: "COMMS",
  };

  /* ── centerpiece elements ── */
  const cpGlobe = deck.querySelector(".cp-globe");
  const cpLorenz = deck.querySelector(".cp-lorenz");
  const cpNeural = deck.querySelector(".cp-neural");
  if (cpGlobe) cpGlobe.classList.add("cp-interactive");
  if (cpLorenz) cpLorenz.classList.add("cp-interactive");

  // per-module centerpiece plan
  const CP = {
    home: { primary: "globe", recede: false },
    now: { primary: "neural", globeLinger: true },
    signal: { primary: "globe", recede: true },
    stack: { primary: "lorenz", globeLinger: false },
    timeline: { primary: "globe", recede: true },
    play: { primary: "globe", recede: true },
    comms: { primary: "globe", recede: true },
  };
  const CP_EL = { globe: cpGlobe, lorenz: cpLorenz, neural: cpNeural };

  function setCenterpiece(id) {
    const cfg = CP[id] || { primary: "globe", recede: true };
    [cpGlobe, cpLorenz, cpNeural].forEach((el) => {
      if (el) el.classList.remove("is-active", "is-receded");
    });
    const prim = CP_EL[cfg.primary];
    if (prim) {
      prim.classList.add("is-active");
      if (cfg.primary === "globe" && cfg.recede) prim.classList.add("is-receded");
    }
    if (cfg.primary !== "globe" && cfg.globeLinger && cpGlobe) {
      cpGlobe.classList.add("is-active", "is-receded");
    }
  }

  /* ── panel model ── */
  // center fractions (0..1 of the stage) + width in rem, per module, DOM order
  const LAYOUTS = {
    home: [{ x: 0.34, y: 0.42, w: 30 }, { x: 0.83, y: 0.29, w: 16 }, { x: 0.2, y: 0.75, w: 21 }, { x: 0.75, y: 0.74, w: 22 }],
    now: [{ x: 0.27, y: 0.34, w: 22 }, { x: 0.74, y: 0.31, w: 22 }, { x: 0.3, y: 0.73, w: 22 }, { x: 0.74, y: 0.73, w: 23 }],
    signal: [{ x: 0.5, y: 0.5, w: 38 }],
    stack: [{ x: 0.27, y: 0.5, w: 24 }, { x: 0.74, y: 0.5, w: 23 }],
    timeline: [{ x: 0.5, y: 0.55, w: 52 }],
    play: [{ x: 0.5, y: 0.5, w: 30 }],
    comms: [{ x: 0.5, y: 0.5, w: 34 }],
  };

  const panels = [];
  groups.forEach((g) => {
    const mod = g.dataset.module;
    Array.from(g.querySelectorAll("[data-panel]")).forEach((el, i) => {
      const cfg = (LAYOUTS[mod] || [])[i] || { x: 0.5, y: 0.5, w: 22 };
      const p = {
        el, module: mod, idx: i,
        depth: parseFloat(el.dataset.depth || "2"),
        flat: el.hasAttribute("data-flat"),
        w: cfg.w, fx: cfg.x, fy: cfg.y, grabbed: false,
      };
      const saved = loadPos(p);
      if (saved) { p.fx = saved.x; p.fy = saved.y; }
      panels.push(p);
    });
  });

  function saveKey(p) { return `deck:${p.module}:${p.idx}`; }
  function loadPos(p) {
    try {
      const s = localStorage.getItem(saveKey(p));
      if (s) { const o = JSON.parse(s); if (typeof o.x === "number") return o; }
    } catch (e) {}
    return null;
  }
  function savePos(p) {
    try { localStorage.setItem(saveKey(p), JSON.stringify({ x: p.fx, y: p.fy })); } catch (e) {}
  }

  /* ── layout + parallax ── */
  let current = "home";
  let floating = false;
  let raf = 0;
  let parX = 0, parY = 0, tParX = 0, tParY = 0;

  const stageBox = () => stage.getBoundingClientRect();
  const activePanels = () => panels.filter((p) => p.module === current);

  function positionPanel(p) {
    const b = stageBox();
    p.el.style.width = p.w + "rem";
    p.el.style.left = p.fx * b.width + "px";
    p.el.style.top = p.fy * b.height + "px";
  }
  function transformPanel(p) {
    if (p.grabbed) return;
    const d = p.depth;
    const px = parX * d * 9, py = parY * d * 9;
    if (p.flat) {
      // CSS3D content (tech sphere) breaks under nested 3D rotation — keep it 2D
      p.el.style.transform = `translate(-50%,-50%) translate(${px}px,${py}px)`;
      return;
    }
    const ry = parX * 4, rx = -parY * 4;
    p.el.style.transform =
      `translate(-50%,-50%) translate(${px}px,${py}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  }
  function layout() {
    if (!floating) return;
    activePanels().forEach(positionPanel);
  }

  function frame() {
    parX += (tParX - parX) * 0.09;
    parY += (tParY - parY) * 0.09;
    if (floating) activePanels().forEach(transformPanel);
    raf = requestAnimationFrame(frame);
  }

  function setFloat(on) {
    const next = on && !reduceMotion && canFloat();
    if (next === floating) return;
    floating = next;
    html.classList.toggle("deck-float", floating);
    if (floating) {
      layout();
      if (!raf) raf = requestAnimationFrame(frame);
    } else {
      // hand layout back to the stacked CSS fallback
      panels.forEach((p) => {
        p.el.style.left = p.el.style.top = p.el.style.width = p.el.style.transform = "";
      });
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  }

  /* ── module switching ── */
  function setModule(id, opts) {
    if (!MODULES.includes(id)) return;
    current = id;
    deck.dataset.activeModule = id;
    groups.forEach((g) => g.classList.toggle("is-active", g.dataset.module === id));
    railBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.moduleBtn === id));
    if (modIdx) modIdx.textContent = String(MODULES.indexOf(id)).padStart(2, "0");
    if (modName) modName.textContent = NAMES[id] || id.toUpperCase();
    setCenterpiece(id);
    if (floating) layout();
    if (opts && opts.focus) {
      const g = groups.find((gr) => gr.dataset.module === id);
      if (g) { g.setAttribute("tabindex", "-1"); try { g.focus({ preventScroll: true }); } catch (e) { g.focus(); } }
    }
    try {
      history.replaceState(null, "", id === "home" ? location.pathname + location.search : "#" + id);
    } catch (e) {}
    window.dispatchEvent(new CustomEvent("deck:module", { detail: { module: id } }));
    // let canvas widgets in the newly-shown module re-measure their box
    setTimeout(() => window.dispatchEvent(new Event("resize")), 60);
  }

  function step(dir) {
    const i = MODULES.indexOf(current);
    setModule(MODULES[Math.max(0, Math.min(MODULES.length - 1, i + dir))], { focus: true });
  }
  function resetLayout() {
    panels.forEach((p) => {
      try { localStorage.removeItem(saveKey(p)); } catch (e) {}
      const cfg = (LAYOUTS[p.module] || [])[p.idx] || { x: 0.5, y: 0.5, w: 22 };
      p.fx = cfg.x; p.fy = cfg.y;
    });
    layout();
  }

  /* ── grab / drag + parallax (single pointer handler set) ── */
  let drag = null, dragOff = { x: 0, y: 0 };

  stage.addEventListener("pointerdown", (e) => {
    if (!floating) return;
    const bar = e.target.closest(".hud-panel-bar");
    if (!bar) return;
    const el = bar.closest("[data-panel]");
    const p = activePanels().find((pp) => pp.el === el);
    if (!p) return;
    drag = p; p.grabbed = true;
    el.classList.add("is-grabbed");
    try { el.setPointerCapture(e.pointerId); } catch (err) {}
    const b = stageBox();
    dragOff.x = e.clientX - b.left - p.fx * b.width;
    dragOff.y = e.clientY - b.top - p.fy * b.height;
    el.style.transform = "translate(-50%,-50%)";
    e.preventDefault();
  });

  stage.addEventListener("pointermove", (e) => {
    if (drag) {
      const b = stageBox();
      const m = 44;
      let x = e.clientX - b.left - dragOff.x;
      let y = e.clientY - b.top - dragOff.y;
      x = Math.max(m, Math.min(b.width - m, x));
      y = Math.max(m, Math.min(b.height - m, y));
      drag.fx = x / b.width; drag.fy = y / b.height;
      drag.el.style.left = x + "px";
      drag.el.style.top = y + "px";
      return;
    }
    if (!floating) return;
    const b = stageBox();
    tParX = ((e.clientX - b.left) / b.width - 0.5) * 2;
    tParY = ((e.clientY - b.top) / b.height - 0.5) * 2;
  });

  function endDrag() {
    if (!drag) return;
    drag.el.classList.remove("is-grabbed");
    drag.grabbed = false;
    savePos(drag);
    drag = null;
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", () => { tParX = 0; tParY = 0; });

  /* ── chrome wiring ── */
  railBtns.forEach((b) => {
    b.addEventListener("click", (e) => { e.preventDefault(); setModule(b.dataset.moduleBtn, { focus: true }); });
  });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target.closest("input, textarea, [contenteditable]")) return;
    if (e.key >= "0" && e.key <= "6") {
      const id = MODULES[+e.key];
      if (id) { setModule(id, { focus: true }); e.preventDefault(); }
      return;
    }
    if (!floating) return; // arrows only hijacked in the cockpit
    if (e.target.closest("[data-timeline-track]")) return; // timeline owns arrows
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { step(1); e.preventDefault(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { step(-1); e.preventDefault(); }
  });

  /* ── responsive ── */
  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { setFloat(canFloat()); layout(); }, 120);
  });
  if (floatMQ.addEventListener) floatMQ.addEventListener("change", () => setFloat(canFloat()));

  // deep-link / back-forward between modules
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").replace(/^#/, "");
    if (MODULES.includes(h) && h !== current) setModule(h, { focus: true });
  });

  /* ── boot ── */
  html.classList.add("deck-on");
  const startHash = (location.hash || "").replace(/^#/, "");
  setModule(MODULES.includes(startHash) ? startHash : "home");
  setFloat(canFloat());

  window.deck = {
    setModule,
    next: () => step(1),
    prev: () => step(-1),
    resetLayout,
    get current() { return current; },
    modules: MODULES.slice(),
  };
  window.dispatchEvent(new CustomEvent("deck:ready"));
})();
