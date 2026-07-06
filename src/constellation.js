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
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    "Interactive rotating tech stack; hover or click icons to reveal names."
  );
  const ctx = canvas.getContext("2d");
  if (!ctx) return; // keep the static fallback logos

  const readout = mount.parentElement?.querySelector("[data-tech-readout]");

  // Load each logo fresh (no crossOrigin: we only draw, never read pixels,
  // so a tainted canvas is harmless and we avoid CORS load failures).
  const nodes = imgEls.map((im) => {
    const img = new Image();
    img.decoding = "async";
    img.src = im.src;
    const label = im.title || im.alt || "Unknown";
    const node = {
      img,
      ready: false,
      label,
      short: label.slice(0, 2).toUpperCase()
    };
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
  let hitTargets = [];
  let activeNode = null;
  let moved = false;

  const setActiveNode = (node) => {
    const nextNode = node ? node.i : null;
    if (activeNode === nextNode) return;
    activeNode = nextNode;
    if (readout) {
      readout.textContent = node
        ? nodes[node.i].label
        : "";
      readout.classList.toggle("is-active", Boolean(node));
    }
    draw();
  };

  const pickNode = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    for (let i = hitTargets.length - 1; i >= 0; i--) {
      const target = hitTargets[i];
      const dx = x - target.x;
      const dy = y - target.y;
      if (Math.hypot(dx, dy) <= target.hitRadius) return target;
    }
    return null;
  };

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
    moved = false;
    mount.classList.add("is-dragging");
    try { mount.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) {
      if (e.pointerType === "mouse") setActiveNode(pickNode(e.clientX, e.clientY));
      return;
    }
    const dx = e.clientX - lx, dy = e.clientY - ly;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
    lx = e.clientX; ly = e.clientY;
    rotY += dx * 0.006;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.004));
    velY = dx * 0.0006; velX = dy * 0.0004;
  });
  const release = () => { dragging = false; mount.classList.remove("is-dragging"); };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  mount.addEventListener("pointerleave", () => {
    if (!dragging) setActiveNode(null);
  });
  mount.addEventListener("click", (e) => {
    if (moved) {
      moved = false;
      return;
    }
    setActiveNode(pickNode(e.clientX, e.clientY));
  });

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

    hitTargets = [];

    for (const p of pts) {
      const depth = (p.z + 1) / 2; // 0 far .. 1 near
      const px = cx + p.x * R;
      const py = cy + p.y * R;
      const size = base * (0.62 + depth * 0.62);
      const n = nodes[p.i];
      const selected = p.i === activeNode;
      const hitRadius = size * 0.62;
      hitTargets.push({ x: px, y: py, hitRadius, depth, i: p.i });

      if (selected) {
        ctx.globalAlpha = 0.34 + depth * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, hitRadius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(238, 242, 248, 0.9)";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, hitRadius + 13, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(56, 208, 255, 0.22)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalAlpha = 0.2 + depth * 0.8;
      if (n.ready) {
        try { ctx.drawImage(n.img, px - size / 2, py - size / 2, size, size); }
        catch (_) { n.ready = false; }
      } else {
        ctx.beginPath();
        ctx.arc(px, py, size * 0.16, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(143,230,255,0.85)";
        ctx.fill();
        ctx.fillStyle = "rgba(6,9,15,0.9)";
        ctx.font = "700 10px JetBrains Mono, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.short, px, py);
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
