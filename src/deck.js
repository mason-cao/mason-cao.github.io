/* ════════════════════════════════════════════════════════════════════
   deck.js — the Jarvis cockpit controller

   Every laptop/desktop gets the same fixed, non-scrolling HUD. Panel sizing
   is authored against a canonical 1200 × 900 reference, while the logical
   stage expands to fill the viewport so the original wide outer spacing is
   preserved. That keeps the central globe open and the side holograms close
   to the viewport edges across display resolutions and browser zoom levels.

   Genuinely narrow phone viewports keep the readable stacked page. Reduced
   motion changes only the animation, never the selected layout.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  const html = document.documentElement;
  const FALLBACK_FLOAT_MIN_WIDTH = 700;
  const COMPUTER_MIN_SHORT_EDGE = 600;
  const STAGE_WIDTH = 1200;
  const STAGE_HEIGHT = 900;
  const MAX_STAGE_SCALE = 1.2;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const forceFloat = /[?&]float=1/.test(location.search); // dev / screenshot override
  const widthMQ = matchMedia(`(min-width: ${FALLBACK_FLOAT_MIN_WIDTH}px)`);
  const hasComputerSizedScreen = () => {
    const screenWidth = Number(window.screen?.width) || 0;
    const screenHeight = Number(window.screen?.height) || 0;
    if (!screenWidth || !screenHeight) return widthMQ.matches;
    return Math.min(screenWidth, screenHeight) >= COMPUTER_MIN_SHORT_EDGE;
  };
  const canFloat = () => forceFloat || hasComputerSizedScreen();
  const DRAGGABLE = false; // holograms are fixed; flip to true to re-enable drag

  const stage = document.getElementById("main-content");
  const panels = Array.from(document.querySelectorAll("[data-panel]"));
  const heads = Array.from(document.querySelectorAll(".sec-head"));
  const scene = document.querySelector(".hud-scene");
  const globeEq = document.querySelector(".globe-eq");
  if (!stage || !panels.length) return;

  // Cockpit layout, indexed by DOM order of [data-panel]:
  // x/y = centre as a fraction of the stage, w = width in rem, d = parallax depth.
  // 10 holograms ring the central neural globe: hero centred at the top,
  // timeline centred at the bottom, four panels down each side. The two
  // columns are balanced by content height — right side carries the three
  // project cards + comms, left side carries signal + horizon + tech +
  // off-clock — so neither column overflows. Inner edges sit just outside the
  // glowing sphere. Centre column kept clear so the reactor reads as the
  // centrepiece. Tuned with headless measurement (Chrome @ 1200×900) so
  // no two panels overlap.
  const LAYOUT = [
    { x: 0.5,   y: 0.074, w: 24, d: 2 }, // 0  hero name (top-centre)
    { x: 0.84,  y: 0.149, w: 21, d: 2, ax: "right" }, // 1  Nova Core
    { x: 0.84,  y: 0.411, w: 21, d: 3, ax: "right" }, // 2  AERIS
    { x: 0.84,  y: 0.686, w: 21, d: 2, ax: "right" }, // 3  FreshTrack
    { x: 0.16,  y: 0.446, w: 20, d: 1, ax: "left" }, // 4  horizon
    { x: 0.16,  y: 0.158, w: 20, d: 2, ax: "left" }, // 5  signal
    { x: 0.16,  y: 0.703, w: 20, d: 1, ax: "left" }, // 6  tech stack
    { x: 0.5,   y: 0.855, w: 28, d: 1, ay: "bottom" }, // 7  timeline
    { x: 0.16,  y: 0.901, w: 20, d: 1, ax: "left", ay: "bottom" }, // 8  off-clock
    { x: 0.84,  y: 0.912, w: 21, d: 1, ax: "right", ay: "bottom" }, // 9  comms
  ];

  const P = panels.map((el, i) => {
    const cfg = LAYOUT[i] || { x: 0.5, y: 0.5, w: 24, d: 2 };
    return {
      el, i, w: cfg.w, fx: cfg.x, fy: cfg.y, d: cfg.d,
      ax: cfg.ax, ay: cfg.ay,
      flat: el.classList.contains("hud-panel--sphere"),
      grabbed: false, vx: 0, vy: 0,
    };
  });

  const W = () => stage.clientWidth || window.innerWidth;
  const H = () => stage.clientHeight || window.innerHeight;
  const MARGIN = 34;

  const key = (p) => "deckf:" + p.i;
  const save = (p) => { try { localStorage.setItem(key(p), JSON.stringify({ x: p.fx, y: p.fy })); } catch (_) {} };
  const load = (p) => {
    try {
      const s = localStorage.getItem(key(p));
      if (s) { const o = JSON.parse(s); if (typeof o.x === "number") { p.fx = o.x; p.fy = o.y; } }
    } catch (_) {}
  };

  function place(p) {
    p.el.style.width = p.w + "rem";
    const stageWidth = W();
    const stageHeight = H();
    const halfWidth = p.el.offsetWidth / 2;
    const halfHeight = p.el.offsetHeight / 2;
    let x = p.fx * stageWidth;
    let y = p.fy * stageHeight;

    if (p.ax === "left") x = MARGIN + halfWidth;
    if (p.ax === "right") x = stageWidth - MARGIN - halfWidth;
    if (p.ay === "bottom") y = stageHeight - MARGIN - halfHeight;

    // Final containment protects against font-metric and async-content
    // differences between computers without changing the intended anchors.
    const minX = halfWidth + MARGIN;
    const maxX = stageWidth - halfWidth - MARGIN;
    const minY = halfHeight + MARGIN;
    const maxY = stageHeight - halfHeight - MARGIN;
    x = minX <= maxX ? Math.max(minX, Math.min(maxX, x)) : stageWidth / 2;
    y = minY <= maxY ? Math.max(minY, Math.min(maxY, y)) : stageHeight / 2;

    p.el.style.left = x + "px";
    p.el.style.top = y + "px";
    if (!p.grabbed) p.el.style.transform = "translate(-50%,-50%)";
  }
  function applyTransform(p) {
    if (p.grabbed) return;
    const px = parX * p.d * 8, py = parY * p.d * 8;
    if (p.flat) {
      p.el.style.transform = `translate(-50%,-50%) translate(${px}px,${py}px)`;
    } else {
      const ry = parX * 3.5, rx = -parY * 3.5;
      p.el.style.transform =
        `translate(-50%,-50%) translate(${px}px,${py}px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  }

  /* ── float state + parallax/inertia loop ── */
  let floating = false, raf = 0;
  let stageScale = 1;
  let parX = 0, parY = 0, tParX = 0, tParY = 0;
  let drag = null, dragOff = { x: 0, y: 0 }, lastX = 0, lastY = 0, lastT = 0;

  function syncStageScale() {
    const viewportWidth = html.clientWidth || window.innerWidth;
    const viewportHeight = html.clientHeight || window.innerHeight;
    stageScale = Math.min(
      viewportWidth / STAGE_WIDTH,
      viewportHeight / STAGE_HEIGHT,
      MAX_STAGE_SCALE
    );
    stageScale = Math.max(stageScale, 0.01);
    html.style.setProperty("--deck-scale", String(stageScale));
    // The parent transform scales panel dimensions uniformly. Expanding the
    // logical stage by the inverse scale keeps its visible bounds flush with
    // the viewport, restoring the original 16% / 84% panel positions.
    html.style.setProperty("--deck-stage-width", `${viewportWidth / stageScale}px`);
    html.style.setProperty("--deck-stage-height", `${viewportHeight / stageScale}px`);
  }

  function frame() {
    parX += (tParX - parX) * 0.08;
    parY += (tParY - parY) * 0.08;
    if (scene) {
      scene.style.transform =
        `translate(${parX * -14 * stageScale}px, ${parY * -10 * stageScale}px)`;
    }
    if (globeEq) {
      globeEq.style.transform =
        `translateX(-50%) translate(${parX * 5 * stageScale}px,${parY * 4 * stageScale}px)`;
    }
    const mx = MARGIN / W(), my = MARGIN / H();
    P.forEach((p) => {
      if (!p.grabbed && (Math.abs(p.vx) > 0.0002 || Math.abs(p.vy) > 0.0002)) {
        p.fx += p.vx; p.fy += p.vy;
        p.vx *= 0.9; p.vy *= 0.9;
        p.fx = Math.max(mx, Math.min(1 - mx, p.fx));
        p.fy = Math.max(my, Math.min(1 - my, p.fy));
        place(p);
        if (Math.abs(p.vx) < 0.0003 && Math.abs(p.vy) < 0.0003) { p.vx = p.vy = 0; save(p); }
      }
      applyTransform(p);
    });
    raf = requestAnimationFrame(frame);
  }

  function onDown(e) {
    // Panels are fixed floating holograms — dragging is disabled. Parallax
    // (onMove) still gives them gentle depth; inner widgets (globe, tech
    // sphere, timeline) keep their own pointer interactions.
    if (!DRAGGABLE) return;
    if (!floating) return;
    const bar = e.target.closest(".hud-panel-bar");
    const panelEl = bar ? bar.closest("[data-panel]") : e.target.closest(".hero-copy[data-panel]");
    if (!panelEl) return;
    const p = P.find((pp) => pp.el === panelEl);
    if (!p) return;
    drag = p; p.grabbed = true; p.vx = p.vy = 0;
    panelEl.classList.add("is-grabbed");
    try { panelEl.setPointerCapture(e.pointerId); } catch (_) {}
    const b = stage.getBoundingClientRect();
    dragOff.x = e.clientX - b.left - p.fx * W();
    dragOff.y = e.clientY - b.top - p.fy * H();
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    panelEl.style.transform = "translate(-50%,-50%)";
    e.preventDefault();
  }
  function onMove(e) {
    if (drag) {
      const b = stage.getBoundingClientRect();
      let x = Math.max(MARGIN, Math.min(W() - MARGIN, e.clientX - b.left - dragOff.x));
      let y = Math.max(MARGIN, Math.min(H() - MARGIN, e.clientY - b.top - dragOff.y));
      drag.fx = x / W(); drag.fy = y / H();
      drag.el.style.left = x + "px"; drag.el.style.top = y + "px";
      const now = performance.now(), dt = Math.max(now - lastT, 8);
      drag.vx = ((e.clientX - lastX) / W()) / dt * 16;
      drag.vy = ((e.clientY - lastY) / H()) / dt * 16;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      return;
    }
    if (!floating) return;
    const b = stage.getBoundingClientRect();
    tParX = Math.max(-1, Math.min(1, ((e.clientX - b.left) / b.width - 0.5) * 2));
    tParY = Math.max(-1, Math.min(1, ((e.clientY - b.top) / b.height - 0.5) * 2));
  }
  function onUp() {
    if (!drag) return;
    const p = drag; drag = null;
    p.el.classList.remove("is-grabbed");
    p.grabbed = false;
    const cap = 0.05;
    p.vx = reduceMotion ? 0 : Math.max(-cap, Math.min(cap, p.vx));
    p.vy = reduceMotion ? 0 : Math.max(-cap, Math.min(cap, p.vy));
    save(p);
  }
  function onLeave() { tParX = 0; tParY = 0; }

  function enterFloat() {
    if (floating) return;
    floating = true;
    html.classList.add("deck-float");
    syncStageScale();
    // always use the designed no-overlap layout (ignore any old dragged state)
    P.forEach((p) => { if (DRAGGABLE) load(p); place(p); });
    // the FX boot sequence choreographs the reveal itself; this plain
    // stagger is the fallback when no boot takeover is active (reduced
    // motion, boot already finished, or boot failure).
    const reveal = () =>
      P.forEach((p, idx) =>
        setTimeout(() => p.el.classList.add("is-revealed"), reduceMotion ? 0 : 140 + idx * 55)
      );
    if (window.__mcBootTakeover) window.__mcBootReveal = reveal;
    else reveal();
    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.addEventListener("pointerleave", onLeave);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function exitFloat() {
    if (!floating) return;
    floating = false;
    stageScale = 1;
    html.classList.remove("deck-float");
    html.style.removeProperty("--deck-scale");
    html.style.removeProperty("--deck-stage-width");
    html.style.removeProperty("--deck-stage-height");
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    stage.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    document.removeEventListener("pointerleave", onLeave);
    P.forEach((p) => {
      p.el.style.left = p.el.style.top = p.el.style.width = p.el.style.transform = "";
      p.el.classList.remove("is-revealed", "is-grabbed");
    });
    if (scene) scene.style.transform = "";
    if (globeEq) globeEq.style.transform = "";
  }

  /* ── stacked fallback: scroll reveal ── */
  let io = null;
  function enterStacked() {
    html.classList.add("reveal-ready");
    const targets = panels.concat(heads);
    if (reduceMotion || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    io = new IntersectionObserver(
      (entries, obs) => entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-revealed"); obs.unobserve(en.target); }
      }),
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );
    targets.forEach((el) => io.observe(el));
  }
  function exitStacked() {
    if (io) { io.disconnect(); io = null; }
  }

  /* ── mode select + responsive switching ── */
  function setMode() {
    if (canFloat()) { exitStacked(); enterFloat(); }
    else { exitFloat(); enterStacked(); }
  }
  setMode();
  document.fonts?.ready.then(() => {
    if (floating) P.forEach(place);
  });

  let rt = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (canFloat() !== floating) setMode();
      else if (floating) {
        syncStageScale();
        P.forEach(place);
      }
    }, 150);
  });
  [widthMQ].forEach((mq) => {
    if (mq.addEventListener) mq.addEventListener("change", setMode);
    else if (mq.addListener) mq.addListener(setMode);
  });
  window.visualViewport?.addEventListener("resize", () => {
    if (floating) {
      syncStageScale();
      P.forEach(place);
    }
  });

  // small dev handle for resetting thrown-around panels
  window.deck = {
    reset() {
      P.forEach((p) => { try { localStorage.removeItem(key(p)); } catch (_) {}
        const c = LAYOUT[p.i] || { x: 0.5, y: 0.5 }; p.fx = c.x; p.fy = c.y; if (floating) place(p); });
    },
  };
})();
