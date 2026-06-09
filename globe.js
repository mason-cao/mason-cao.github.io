// ─────────────────────────────────────────────────────────────
// globe.js — the holographic neural-globe centerpiece.
//
// A geodesic sphere rendered as a neural network: edges are synapses that
// carry travelling signal pulses and brighten under a firing sweep, and the
// vertices are glowing neurons. A Fresnel atmosphere rim and front/back depth
// fade give it 3D volume. Drag to spin.
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
  // pulled back so the full sphere + atmosphere sit inside the frustum with
  // margin so it never clips on the sides
  camera.position.set(0, 0, 5.2);

  const R = 1.18;
  const CYAN = new THREE.Color(0x38d0ff);
  const CYAN_HI = new THREE.Color(0xcdf3ff);

  // depth-fade bounds: object points sit at radius ≈ R, so their view-space z
  // runs from -(camZ+R) (far side) to -(camZ-R) (near side). Shaders fade the
  // far hemisphere so the sphere reads as a solid 3D volume, not a flat web.
  const CAMZ = camera.position.z;

  // ── geodesic mesh → neural network: edges are SYNAPSES that carry travelling
  // signal pulses and brighten under the firing sweep; the geodesic vertices
  // become glowing NEURONS (added below). One shared icosahedron feeds both. ──
  const icoGeo = new THREE.IcosahedronGeometry(R, 3);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const segVerts = wireGeo.attributes.position.count; // 2 per edge
  const aEdgeT = new Float32Array(segVerts);
  const aPhase = new Float32Array(segVerts);
  for (let s = 0; s < segVerts / 2; s++) {
    aEdgeT[s * 2] = 0; aEdgeT[s * 2 + 1] = 1;
    const ph = Math.random();
    aPhase[s * 2] = ph; aPhase[s * 2 + 1] = ph;
  }
  wireGeo.setAttribute("aEdgeT", new THREE.BufferAttribute(aEdgeT, 1));
  wireGeo.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  const wireUniforms = {
    uTime: { value: 0 },
    uColor: { value: CYAN },
    uColor2: { value: CYAN_HI },
    uCamZ: { value: CAMZ },
    uR: { value: R },
  };
  const wire = new THREE.LineSegments(
    wireGeo,
    new THREE.ShaderMaterial({
      uniforms: wireUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aEdgeT; attribute float aPhase;
        uniform float uTime; uniform float uCamZ; uniform float uR;
        varying float vEdgeT; varying float vPhase; varying float vAct; varying float vDepth;
        void main(){
          vEdgeT = aEdgeT; vPhase = aPhase;
          float ny = normalize(position).y;
          float sweep = sin(uTime * 0.55);
          vAct = smoothstep(0.42, 0.0, abs(ny - sweep));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = smoothstep(-(uCamZ + uR), -(uCamZ - uR), mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform vec3 uColor; uniform vec3 uColor2;
        varying float vEdgeT; varying float vPhase; varying float vAct; varying float vDepth;
        void main(){
          // a bright signal travelling along the synapse, node → node
          float p = fract(uTime * 0.3 + vPhase);
          float d = abs(vEdgeT - p); d = min(d, 1.0 - d);
          float pulse = smoothstep(0.13, 0.0, d);
          float lit = clamp(vAct * 0.5 + pulse * 0.95, 0.0, 1.0);
          float depthMul = 0.22 + 0.78 * vDepth;
          vec3 col = mix(uColor, uColor2, lit);
          float a = (0.1 + lit) * depthMul;
          gl_FragColor = vec4(col, a);
        }
      `,
    })
  );
  group.add(wire);

  // ── neurons: a glowing node on every geodesic vertex. Each twinkles on its
  // own seed, and a brightness wave sweeps vertically (object-space y) so the
  // sphere fires in bands like a forward pass through a network. ──
  const srcPos = icoGeo.attributes.position;
  const seen = new Set();
  const nodeList = [];
  for (let i = 0; i < srcPos.count; i++) {
    const x = srcPos.getX(i), y = srcPos.getY(i), z = srcPos.getZ(i);
    const key = x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3);
    if (!seen.has(key)) { seen.add(key); nodeList.push(x, y, z); }
  }
  const NN = nodeList.length / 3;
  const nPos = new Float32Array(nodeList);
  const nSeed = new Float32Array(NN);
  for (let i = 0; i < NN; i++) nSeed[i] = Math.random();
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute("aSeed", new THREE.BufferAttribute(nSeed, 1));
  const pUniforms = {
    uTime: { value: 0 },
    uSize: { value: 5.4 * DPR },
    uColor: { value: CYAN },
    uColor2: { value: CYAN_HI },
    uCamZ: { value: CAMZ },
    uR: { value: R },
  };
  const points = new THREE.Points(
    nGeo,
    new THREE.ShaderMaterial({
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime; uniform float uSize; uniform float uCamZ; uniform float uR;
        varying float vAct; varying float vDepth;
        void main(){
          float tw = 0.45 + 0.55 * sin(uTime * 1.5 + aSeed * 6.2831);
          // firing wave: a bright band sweeping up/down across the sphere
          float ny = normalize(position).y;
          float sweep = sin(uTime * 0.55);
          float fire = smoothstep(0.32, 0.0, abs(ny - sweep));
          vAct = clamp(max(tw * 0.45, fire), 0.0, 1.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = smoothstep(-(uCamZ + uR), -(uCamZ - uR), mv.z);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (0.4 + vAct * 1.7) * (0.5 + 0.7 * vDepth) * (3.0 / max(-mv.z, 1.0));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; uniform vec3 uColor2;
        varying float vAct; varying float vDepth;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.18, d) * 0.4;
          float depthMul = 0.3 + 0.7 * vDepth;
          vec3 col = mix(uColor, uColor2, vAct);
          gl_FragColor = vec4(col, ((soft * (0.45 + vAct * 0.55)) + halo * vAct) * depthMul);
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
          float f = pow(1.0 - abs(dot(vN, vView)), 2.6);
          gl_FragColor = vec4(uColor, f * 1.15);
        }
      `,
    })
  );
  group.add(atmo);

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
    wireUniforms.uTime.value = t;
    if (!dragging) { rotY += vel; vel += (0.0016 - vel) * 0.02; }
    group.rotation.y = rotY;
    render();
    raf = requestAnimationFrame(frame);
  };
  const start = () => { if (raf == null && !reduce) raf = requestAnimationFrame(frame); };
  const stop = () => { if (raf != null) { cancelAnimationFrame(raf); raf = null; } };

  render(); // one frame so it shows immediately / under reduced motion

  // The globe is the hero centerpiece of a single scrolling page: animate it
  // only while it is actually on screen (and the tab is visible), so it costs
  // nothing once you scroll past the hero.
  let onScreen = true;
  const sync = () => {
    resize();
    if (onScreen && !document.hidden) start();
    else { stop(); render(); }
  };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => { onScreen = entries[0].isIntersecting; sync(); },
      { threshold: 0.05 }
    ).observe(canvas);
  }
  document.addEventListener("visibilitychange", sync);
  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); if (raf == null) render(); }, 150);
  });

  sync();
})();
