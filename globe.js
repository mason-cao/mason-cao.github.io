// ─────────────────────────────────────────────────────────────
// globe.js — the holographic Earth centerpiece.
//
// A wireframe geodesic sphere + surface glow points + a Fresnel
// atmosphere rim, ringed by a live CO₂ gauge that fills proportional to
// the Mauna Loa reading (fed from app.js via the `co2:update` event).
// This is the deck's idle/home centerpiece; deck.js toggles `.is-active`
// (visible) and `.is-receded` (shrinks to a corner) via CSS. Drag to spin.
// Pauses when hidden; falls back silently with no WebGL / reduced motion.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

(function initGlobe() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("globe-canvas");
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
    w: canvas.clientWidth || 600,
    h: canvas.clientHeight || 480,
  });
  let { w, h } = sizeOf();

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  group.rotation.x = 0.5;
  scene.add(group);
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  camera.position.set(0, 0, 4.2);

  const R = 1.18;
  const CYAN = new THREE.Color(0x38d0ff);
  const CYAN_HI = new THREE.Color(0xcdf3ff);

  // ── geodesic wireframe ──
  const wire = new THREE.LineSegments(
    new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 3)),
    new THREE.LineBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  group.add(wire);

  // ── surface glow points (fibonacci sphere) ──
  const PN = reduce ? 320 : 720;
  const pPos = new Float32Array(PN * 3);
  const pSeed = new Float32Array(PN);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < PN; i++) {
    const y = 1 - (i / (PN - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    pPos[i * 3] = Math.cos(th) * r * R;
    pPos[i * 3 + 1] = y * R;
    pPos[i * 3 + 2] = Math.sin(th) * r * R;
    pSeed[i] = Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aSeed", new THREE.BufferAttribute(pSeed, 1));
  const pUniforms = {
    uTime: { value: 0 },
    uSize: { value: 2.4 * DPR },
    uColor: { value: CYAN },
    uColor2: { value: CYAN_HI },
  };
  const points = new THREE.Points(
    pGeo,
    new THREE.ShaderMaterial({
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime; uniform float uSize;
        varying float vTw;
        void main(){
          float tw = 0.55 + 0.45 * sin(uTime * 1.6 + aSeed * 6.28);
          vTw = tw;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.6 + tw) * (3.0 / max(-mv.z, 1.0));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uColor2;
        varying float vTw;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          vec3 col = mix(uColor, uColor2, vTw);
          gl_FragColor = vec4(col, soft * (0.25 + vTw * 0.55));
        }
      `,
    })
  );
  points.frustumCulled = false;
  group.add(points);

  // ── atmosphere rim (Fresnel, back side) ──
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.22, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: CYAN } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vView;
        void main(){
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying vec3 vN; varying vec3 vView;
        void main(){
          float f = pow(1.0 - abs(dot(vN, vView)), 3.0);
          gl_FragColor = vec4(uColor, f * 0.85);
        }
      `,
    })
  );
  group.add(atmo);

  // ── CO₂ gauge ring ──
  const ringUniforms = {
    uFill: { value: (420 - 350) / 100 }, // mapped ppm, updated live
    uTime: { value: 0 },
    uCool: { value: CYAN },
    uWarm: { value: new THREE.Color(0xffb84d) }, // rising CO₂ → repulsor gold
  };
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(R * 1.42, 0.012, 8, 260),
    new THREE.ShaderMaterial({
      uniforms: ringUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying float vA;
        void main(){
          vA = (atan(position.y, position.x) + 3.14159265) / 6.2831853;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uFill; uniform float uTime; uniform vec3 uCool; uniform vec3 uWarm;
        varying float vA;
        void main(){
          float lit = step(vA, uFill);
          float pulse = 0.7 + 0.3 * sin(uTime * 2.0);
          vec3 col = mix(uCool * 0.5, uWarm, lit);
          float a = mix(0.18, 0.95 * pulse, lit);
          gl_FragColor = vec4(col, a);
        }
      `,
    })
  );
  ring.rotation.x = Math.PI / 2.1;
  group.add(ring);

  // ── live CO₂ feed ──
  window.addEventListener("co2:update", (e) => {
    const ppm = e.detail && e.detail.ppm;
    if (typeof ppm === "number" && isFinite(ppm)) {
      ringUniforms.uFill.value = Math.max(0.05, Math.min(0.98, (ppm - 350) / 100));
    }
  });

  // ── drag to spin (inertia), like the Lorenz centerpiece ──
  let rotY = 0.2, vel = 0.0016, dragging = false, lastX = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    rotY += dx * 0.008; vel = dx * 0.0009;
  });
  const release = () => { dragging = false; };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  const resize = () => {
    const s = sizeOf(); w = s.w; h = s.h;
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
    pUniforms.uTime.value = t;
    ringUniforms.uTime.value = t;
    if (!dragging) { rotY += vel; vel += (0.0016 - vel) * 0.02; }
    group.rotation.y = rotY;
    ring.rotation.z = t * 0.08;
    render();
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (raf == null && !reduce) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

  render(); // one frame so it shows immediately / under reduced motion

  // render only while the globe is the visible centerpiece
  const isVisible = () => canvas.classList.contains("is-active");
  const sync = () => { resize(); if (isVisible() && !document.hidden) start(); else { stop(); render(); } };
  window.addEventListener("deck:module", sync);
  document.addEventListener("visibilitychange", sync);
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); if (raf == null) render(); }, 150);
  });

  // home is the default active module, so kick off once deck has set classes
  window.addEventListener("deck:ready", sync);
  setTimeout(sync, 60);
})();
