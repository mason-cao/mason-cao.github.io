// ─────────────────────────────────────────────────────────────
// Lorenz attractor — the strange attractor Edward Lorenz found in a
// stripped-down model of atmospheric convection (1963). It's why weather
// is intrinsically unpredictable: trajectories that start a hair apart
// diverge. Rendered as a mint particle comet tracing the trajectory, in
// the same particle language as the rest of the site. Drag to rotate.
// Pauses off-screen; falls back silently with no WebGL.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

(function initLorenz() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mount = document.querySelector("[data-mathgraph]");
  if (!mount) return;
  const canvas = mount.querySelector("canvas");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (e) {
    return;
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  const sizeOf = () => ({
    w: mount.clientWidth || 320,
    h: mount.clientHeight || 240
  });
  let { w, h } = sizeOf();

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(0, -3.7, 1.25);
  camera.lookAt(0, 0, -0.05);

  // ── integrate the Lorenz system into a particle trajectory ──
  const N = reduce ? 2000 : 3800;
  const positions = new Float32Array(N * 3);
  const aT = new Float32Array(N);
  const sigma = 10;
  const rho = 28;
  const beta = 8 / 3;
  const dt = 0.006;
  const SCALE = 0.055;
  let x = 0.1;
  let y = 0;
  let z = 0;
  for (let i = 0; i < N; i++) {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x += dx * dt;
    y += dy * dt;
    z += dz * dt;
    positions[i * 3] = x * SCALE;
    positions[i * 3 + 1] = y * SCALE;
    positions[i * 3 + 2] = (z - 25) * SCALE; // centre the attractor on origin
    aT[i] = i / (N - 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aT", new THREE.BufferAttribute(aT, 1));

  const uniforms = {
    uHead: { value: 0 },
    uSize: { value: 2.1 * DPR },
    uColor: { value: new THREE.Color(0x1f6f9b) }, // faint trail
    uColor2: { value: new THREE.Color(0xcdf3ff) } // bright comet head
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aT;
      uniform float uHead;
      uniform float uSize;
      varying float vB;
      void main(){
        float d = fract(uHead - aT + 1.0); // 0 just behind the head → 1 ahead
        float b = exp(-d * 7.0) + 0.1;     // bright comet trailing the head
        vB = b;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (0.5 + b * 1.5) * (2.8 / max(-mv.z, 1.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform vec3 uColor2;
      varying float vB;
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float dd = length(uv);
        if (dd > 0.5) discard;
        float soft = smoothstep(0.5, 0.0, dd);
        vec3 col = mix(uColor, uColor2, clamp(vB, 0.0, 1.0));
        gl_FragColor = vec4(col, soft * (0.06 + vB * 0.5));
      }
    `
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  group.add(points);

  // ── drag to rotate (around the attractor's vertical axis), with inertia ──
  let rotZ = -0.4;
  let vel = 0.0022;
  let dragging = false;
  let lastX = 0;
  mount.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    mount.classList.add("is-dragging");
    try {
      mount.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    rotZ += dx * 0.01;
    vel = dx * 0.0012;
  });
  const release = () => {
    dragging = false;
    mount.classList.remove("is-dragging");
  };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  const resize = () => {
    const s = sizeOf();
    w = s.w;
    h = s.h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();

  const render = () => renderer.render(scene, camera);
  let raf = null;
  const t0 = performance.now();
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    uniforms.uHead.value = (t * 0.05) % 1; // comet travels the trajectory
    if (!dragging) {
      rotZ += vel;
      vel += (0.0022 - vel) * 0.02;
    }
    group.rotation.z = rotZ;
    group.rotation.x = -0.32; // slight tilt for depth
    render();
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

  group.rotation.z = rotZ;
  group.rotation.x = -0.32;
  uniforms.uHead.value = 0.5;
  render(); // one frame so it shows under reduced motion / before observing

  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      resize();
      if (raf == null) render();
    }, 150);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });
  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    ).observe(mount);
  } else if (!reduce) {
    start();
  }
})();
