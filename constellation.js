// ─────────────────────────────────────────────────────────────
// Tech constellation — a draggable sphere of stack logos rendered in
// pure Canvas2D. Logos sit on a Fibonacci sphere, project to 2D with
// depth-based scale + opacity, and spin with drag inertia.
//
// Canvas2D (not the old CSS3DRenderer) on purpose: the panel it lives in
// uses backdrop-filter, which silently flattens any CSS 3D transform
// context inside it — so the CSS3D logos collapsed to nothing. A canvas
// is immune to that, needs no CDN module, and falls back to labelled dots
// if a logo image fails to load.
// ─────────────────────────────────────────────────────────────
(function initConstellation() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = document.querySelector("[data-tech-sphere]");
  if (!mount) return;
  const imgEls = Array.from(mount.querySelectorAll("img"));
  if (!imgEls.length) return;

  const canvas = document.createElement("canvas");
  canvas.className = "tech-sphere-canvas";
  const ctx = canvas.getContext("2d");
  if (!ctx) return; // keep the static fallback logos

  // Load each logo fresh (no crossOrigin: we only draw, never read pixels,
  // so a tainted canvas is harmless and we avoid CORS load failures).
  const nodes = imgEls.map((im) => {
    const img = new Image();
    img.decoding = "async";
    img.src = im.src;
    const node = { img, ready: false, label: (im.title || im.alt || "").slice(0, 2) };
    const mark = () => { node.ready = !!(img.naturalWidth > 0); };
    if (img.complete) mark();
    img.addEventListener("load", mark);
    img.addEventListener("error", () => { node.ready = false; });
    return node;
  });

  mount.innerHTML = "";
  mount.appendChild(canvas);

  // fibonacci sphere unit directions
  const N = nodes.length;
  const dirs = nodes.map((_, i) => {
    const y = 1 - (2 * (i + 0.5)) / N;
    const rr = Math.sqrt(Math.max(0, 1 - y * y));
    const th = Math.PI * (1 + Math.sqrt(5)) * i;
    return { x: Math.cos(th) * rr, y, z: Math.sin(th) * rr };
  });

  let w = 0, h = 0, dpr = 1, R = 1, base = 26;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = mount.clientWidth || 300;
    h = mount.clientHeight || 220;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // sphere radius + logo size fill most of the box while leaving just a hair
    // of margin so logos riding the rim never clip top, bottom, or sides
    const m = Math.min(w, h);
    R = m * 0.4;
    base = m * 0.13;
  };

  // drag to spin, with inertia
  let rotX = 0.35, rotY = 0, velX = 0, velY = 0.003, dragging = false, lx = 0, ly = 0;
  mount.addEventListener("pointerdown", (e) => {
    dragging = true; lx = e.clientX; ly = e.clientY;
    mount.classList.add("is-dragging");
    try { mount.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lx, dy = e.clientY - ly;
    lx = e.clientX; ly = e.clientY;
    rotY += dx * 0.006;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.004));
    velY = dx * 0.0006; velX = dy * 0.0004;
  });
  const release = () => { dragging = false; mount.classList.remove("is-dragging"); };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.5;
    const cX = Math.cos(rotX), sX = Math.sin(rotX);
    const cY = Math.cos(rotY), sY = Math.sin(rotY);

    const pts = dirs.map((d, i) => {
      // rotate around Y, then X
      let x = d.x * cY + d.z * sY;
      let z = -d.x * sY + d.z * cY;
      const y = d.y * cX - z * sX;
      z = d.y * sX + z * cX;
      return { x, y, z, i };
    }).sort((a, b) => a.z - b.z); // painter's order: back → front

    for (const p of pts) {
      const depth = (p.z + 1) / 2; // 0 far .. 1 near
      const px = cx + p.x * R;
      const py = cy + p.y * R;
      const size = base * (0.62 + depth * 0.62);
      const n = nodes[p.i];
      ctx.globalAlpha = 0.2 + depth * 0.8;
      if (n.ready) {
        try { ctx.drawImage(n.img, px - size / 2, py - size / 2, size, size); }
        catch (_) { n.ready = false; }
      } else {
        ctx.beginPath();
        ctx.arc(px, py, size * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(143,230,255,0.85)";
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  let raf = null;
  const frame = () => {
    if (!dragging) {
      rotY += velY;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + velX));
      velY += (0.003 - velY) * 0.02; // ease back to idle spin
      velX += (0 - velX) * 0.05;
    }
    draw();
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (raf == null && !reduce) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

  resize();
  draw(); // one correct frame immediately / under reduced motion

  // The cockpit (deck.js) sets the card's final height AFTER this script runs,
  // so the canvas would otherwise stay sized to the wrong height and the sphere
  // would be clipped at the bottom. A ResizeObserver re-fits the canvas to the
  // card whenever its size changes, keeping the sphere centred and uncut.
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => { resize(); draw(); }).observe(mount);
  }

  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); draw(); }, 150);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop(); else start();
  });
  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((en) => (en.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    ).observe(mount);
  } else if (!reduce) {
    start();
  }
})();
