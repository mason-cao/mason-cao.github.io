// ─────────────────────────────────────────────────────────────
// Tech constellation — a draggable 3D sphere of stack logos using
// Three.js CSS3DRenderer. Logos sit on a Fibonacci sphere, billboard
// toward the camera, fade by depth, and spin with inertia.
// Falls back to the static logo row if WebGL/CDN is unavailable.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { CSS3DRenderer, CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";

(function initConstellation() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = document.querySelector("[data-tech-sphere]");
  if (!mount) return;
  const imgs = Array.from(mount.querySelectorAll("img"));
  if (!imgs.length) return;

  let renderer;
  try {
    renderer = new CSS3DRenderer();
  } catch (e) {
    return; // keep the static fallback logos
  }

  const sizeOf = () => ({
    w: mount.clientWidth || 600,
    h: mount.clientHeight || 360
  });
  let { w, h } = sizeOf();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, w / h, 1, 5000);
  const radius = () => Math.min(w, h) * 0.45;
  let curR = radius();

  const N = imgs.length;
  const items = imgs.map((img, i) => {
    const el = document.createElement("div");
    el.className = "tech-node";
    img.classList.remove("tech-logo");
    el.appendChild(img);
    const obj = new CSS3DObject(el);
    // fibonacci sphere unit direction
    const y = 1 - (2 * (i + 0.5)) / N;
    const rxy = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    const base = new THREE.Vector3(Math.cos(theta) * rxy, y, Math.sin(theta) * rxy);
    scene.add(obj);
    return { obj, el, base };
  });

  renderer.setSize(w, h);
  Object.assign(renderer.domElement.style, { position: "absolute", inset: "0" });
  mount.innerHTML = "";
  mount.appendChild(renderer.domElement);

  const applyCamera = () => {
    camera.aspect = w / h;
    camera.position.z = radius() * 3.2;
    camera.updateProjectionMatrix();
  };
  applyCamera();

  // ── interaction (drag to spin, with inertia) ──
  let rotX = 0.3;
  let rotY = 0;
  let velX = 0;
  let velY = 0.0016;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  mount.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    mount.classList.add("is-dragging");
    try {
      mount.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    rotY += dx * 0.006;
    rotX = Math.max(-1.2, Math.min(1.2, rotX + dy * 0.004));
    velY = dx * 0.0006;
    velX = dy * 0.0004;
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    mount.classList.remove("is-dragging");
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  const tmp = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const xAxis = new THREE.Vector3(1, 0, 0);
  const qy = new THREE.Quaternion();
  const qx = new THREE.Quaternion();

  let raf = null;
  const layout = () => {
    qy.setFromAxisAngle(yAxis, rotY);
    qx.setFromAxisAngle(xAxis, rotX);
    const q = qx.multiply(qy);
    for (const it of items) {
      tmp.copy(it.base).applyQuaternion(q).multiplyScalar(curR);
      it.obj.position.copy(tmp);
      it.obj.quaternion.copy(camera.quaternion); // billboard
      const dn = (tmp.z / curR + 1) / 2; // 0 back .. 1 front
      it.el.style.opacity = (0.22 + dn * 0.78).toFixed(3);
      it.el.style.setProperty("--s", (0.66 + dn * 0.5).toFixed(3));
      it.el.style.zIndex = String(Math.round(dn * 100));
    }
    renderer.render(scene, camera);
  };
  const frame = () => {
    if (!dragging) {
      rotY += velY;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + velX));
      velY += (0.0016 - velY) * 0.02; // ease back to idle spin
      velX += (0 - velX) * 0.05;
    }
    layout();
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf == null && !reduce) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const s = sizeOf();
      w = s.w;
      h = s.h;
      curR = radius();
      renderer.setSize(w, h);
      applyCamera();
      layout();
    }, 150);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  layout(); // one frame so it's correct before animating / under reduced motion
  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => (en.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    ).observe(mount);
  } else if (!reduce) {
    start();
  }
})();
