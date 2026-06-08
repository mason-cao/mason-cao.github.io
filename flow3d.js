// ─────────────────────────────────────────────────────────────
// Atmospheric flow field + hero name — WebGL (Three.js)
//
// A calm volumetric cloud of GPU points advected through a 3D curl-noise
// field. The cursor carves a lingering *path* through the cloud (a wake of
// recent positions parts the particles); there is no global mouse parallax
// and no cursor glow.
//
// A second, non-rotating group gathers out of the field to spell "Mason Cao"
// in the hero (soft organic particles, the pure-particle wordmark), and
// disperses back into the atmosphere as you scroll.
//
// Degrades cleanly: reduced-motion / no-WebGL → the DOM <h1> stays visible
// and this whole module is skipped.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

(function initFlowField() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("flow-field");
  if (reduce || !canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      // soft additive points need no MSAA; turning it off is a big win on a
      // full-screen transparent canvas and keeps the field buttery
      antialias: false,
      powerPreference: "high-performance"
    });
  } catch (err) {
    return; // no WebGL: leave the plain dark background + DOM <h1> in place
  }

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (v) => v * v * (3 - 2 * v);

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const MOBILE = window.innerWidth < 760;
  const TRAIL = 6; // length of the cursor path/wake

  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  canvas.style.opacity = "0.85";
  // hide DOM section titles up front so they can be revealed by their particle
  // animation (skipped on mobile / when WebGL is unavailable → crisp text)
  if (!MOBILE) document.documentElement.classList.add("particle-headers");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.set(0, 0, 120);
  camera.lookAt(0, 0, 0); // fixed — no mouse parallax

  // hero name: own scene + fixed camera so the wordmark stays anchored
  const nameScene = new THREE.Scene();
  const nameCamera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  nameCamera.position.set(0, 0, 120);
  nameCamera.lookAt(0, 0, 0);

  // ── shared 3D simplex + curl-noise GLSL ──
  const NOISE_GLSL = /* glsl */ `
    vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v){
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    vec3 snoiseVec3(vec3 x){
      float s  = snoise(x);
      float s1 = snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2));
      float s2 = snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4));
      return vec3(s, s1, s2);
    }
    vec3 curlNoise(vec3 p){
      const float e = 0.1;
      vec3 dx = vec3(e, 0.0, 0.0);
      vec3 dy = vec3(0.0, e, 0.0);
      vec3 dz = vec3(0.0, 0.0, e);
      vec3 px0 = snoiseVec3(p - dx), px1 = snoiseVec3(p + dx);
      vec3 py0 = snoiseVec3(p - dy), py1 = snoiseVec3(p + dy);
      vec3 pz0 = snoiseVec3(p - dz), pz1 = snoiseVec3(p + dz);
      float x = py1.z - py0.z - pz1.y + pz0.y;
      float y = pz1.x - pz0.x - px1.z + px0.z;
      float z = px1.y - px0.y - py1.x + py0.x;
      return normalize(vec3(x, y, z) / (2.0 * e));
    }
  `;

  // ─────────────── ambient atmosphere ───────────────
  const COUNT = MOBILE ? 2600 : 5000;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const scales = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = Math.random() * 2 - 1;
    positions[i * 3 + 1] = Math.random() * 2 - 1;
    positions[i * 3 + 2] = Math.random() * 2 - 1;
    seeds[i] = Math.random();
    scales[i] = 0.35 + Math.random() * Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const trail = [];
  for (let i = 0; i < TRAIL; i++) trail.push(new THREE.Vector2(99999, 99999));

  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: new THREE.Vector3(90, 55, 90) },
    uAmp: { value: 8.0 }, // calmer displacement
    uFreq: { value: 0.011 }, // lower freq → larger, smoother-flowing swirls
    uSize: { value: 4.6 * DPR },
    uScroll: { value: 0 },
    uTrail: { value: trail },
    uPush: { value: 0 },
    uColor: { value: new THREE.Color(0x38d0ff) },
    uColor2: { value: new THREE.Color(0xa9e9ff) },
    uFogNear: { value: 55 },
    uFogFar: { value: 240 },
    uDim: { value: 1 }
  };

  const VERT = /* glsl */ `
    uniform float uTime;
    uniform vec3  uScale;
    uniform float uAmp;
    uniform float uFreq;
    uniform float uSize;
    uniform float uScroll;
    uniform vec2  uTrail[${TRAIL}];
    uniform float uPush;
    attribute float aSeed;
    attribute float aScale;
    varying float vDepth;
    varying float vMix;
    ${NOISE_GLSL}
    void main(){
      vec3 base = position * uScale;
      vec3 sp = base * uFreq
              + vec3(0.0, uTime * 0.03, uTime * 0.015)
              + vec3(uScroll * 0.4, uScroll * 0.6, uScroll * 0.25);
      vec3 flow = curlNoise(sp);
      vec3 displaced = base + flow * uAmp;
      displaced.y += sin(uTime * 0.3 + aSeed * 6.2831) * 0.8;

      // cursor carves a path: the wake of recent positions parts the cloud.
      // skipped entirely when the pointer is idle (uniform branch → cheap).
      // cheap polynomial falloff + inversesqrt direction (no exp, no normalize
      // branch) so dragging stays smooth even over the whole field.
      if (uPush > 0.001) {
        vec2 push = vec2(0.0);
        const float R2 = 30.0 * 30.0;
        for (int i = 0; i < ${TRAIL}; i++) {
          vec2 d = displaced.xy - uTrail[i];
          float dist2 = dot(d, d);
          float f = max(0.0, 1.0 - dist2 / R2);
          float infl = f * f * (1.0 - float(i) / float(${TRAIL}));
          push += d * inversesqrt(dist2 + 1.0) * infl;
        }
        displaced.xy += push * uPush;
      }

      vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * mv;
      vDepth = -mv.z;
      vMix = aScale;
      gl_PointSize = uSize * (0.5 + aScale) * (150.0 / max(-mv.z, 1.0));
    }
  `;

  const FRAG = /* glsl */ `
    uniform vec3  uColor;
    uniform vec3  uColor2;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uDim;
    varying float vDepth;
    varying float vMix;
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;
      float soft = smoothstep(0.5, 0.0, d);
      float fog = 1.0 - clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      vec3 col = mix(uColor, uColor2, vMix * 0.7);
      // a touch more present so the field reads as one continuous atmosphere
      // the whole page lives inside, not occasional background dust
      float a = soft * fog * (0.14 + vMix * 0.46) * 0.30 * uDim;
      gl_FragColor = vec4(col, a);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ─────────────── hero name (pure-particle wordmark) ───────────────
  const nameUniforms = {
    uTime: { value: 0 },
    uScale: { value: uniforms.uScale.value.clone() },
    uAmp: { value: 8.0 },
    uFreq: { value: 0.016 },
    uSize: { value: 5.5 * DPR },
    uMorph: { value: 0 },
    uReveal: { value: 0 }, // hero stays 0 (pure particles); headers crystallize
    uNameCenter: { value: new THREE.Vector3(0, 30, 0) },
    uNameScale: { value: 60 },
    uColor: { value: new THREE.Color(0xcdf3ff) }, // formed → bright mint (crisp)
    uColor2: { value: new THREE.Color(0x1f7fb0) }, // drifting → softer mint
    uFogNear: { value: 55 },
    uFogFar: { value: 240 }
  };

  const VERT_NAME = /* glsl */ `
    uniform float uTime;
    uniform vec3  uScale;
    uniform float uAmp;
    uniform float uFreq;
    uniform float uSize;
    uniform float uMorph;
    uniform vec3  uNameCenter;
    uniform float uNameScale;
    attribute float aSeed;
    attribute float aScale;
    attribute vec3  aTarget;
    varying float vDepth;
    varying float vMix;
    varying float vForm;
    ${NOISE_GLSL}
    void main(){
      vec3 base = position * uScale;
      vec3 sp = base * uFreq + vec3(0.0, uTime * 0.04, uTime * 0.02);
      vec3 drift = base + curlNoise(sp) * uAmp;

      float st = clamp((uMorph - aSeed * 0.4) / 0.6, 0.0, 1.0);
      st = st * st * (3.0 - 2.0 * st);
      vForm = st;

      vec3 target = uNameCenter + aTarget * uNameScale;
      // organic shimmer that quiets as the glyph resolves: drifting particles
      // breathe, but a formed letter holds nearly still so it reads crisply
      float shimmer = 0.5 * (1.0 - st * 0.86);
      target.xy += vec2(
        sin(uTime * 0.8 + aSeed * 6.2831),
        cos(uTime * 0.7 + aSeed * 6.2831)
      ) * shimmer;

      vec3 displaced = mix(drift, target, st);

      vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
      gl_Position = projectionMatrix * mv;
      vDepth = -mv.z;
      vMix = aScale;
      // formed dots stay larger (0.6 vs old 0.42) so neighbouring grains tile
      // into continuous strokes instead of a sparse, illegible scatter
      float sz = uSize * (0.5 + aScale) * mix(1.0, 0.6, st);
      gl_PointSize = sz * (150.0 / max(-mv.z, 1.0));
    }
  `;

  const FRAG_NAME = /* glsl */ `
    uniform vec3  uColor;
    uniform vec3  uColor2;
    uniform float uFogNear;
    uniform float uFogFar;
    uniform float uReveal;
    varying float vDepth;
    varying float vMix;
    varying float vForm;
    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;
      float fog = 1.0 - clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      vec3 col = mix(uColor2, uColor, clamp(vForm * 1.3, 0.0, 1.0));
      // drifting grains stay soft + faint; formed grains get a hard edge and
      // near-full opacity so the wordmark resolves as crisp particle type
      float soft = smoothstep(0.5, 0.32, d);
      float drifting = smoothstep(0.5, 0.0, d) * fog * (0.16 + vMix * 0.5) * 0.42;
      float formed = soft * 0.98;
      float a = mix(drifting, formed, vForm);
      a *= (1.0 - uReveal); // legacy crystallize path; hero + headers keep 0
      gl_FragColor = vec4(col, a);
    }
  `;

  let nameMesh = null;
  let introStart = null;
  const heroEl = document.querySelector(".hero-shell");
  const heroTitleEl = document.getElementById("hero-title");
  const headerInsts = []; // particle instances for each .section-title

  // map any DOM element's box → world center/scale on the z≈0 plane
  const placeText = (el, u) => {
    const r = el.getBoundingClientRect();
    if (r.width < 1) return false;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visH = 2 * Math.tan((nameCamera.fov * Math.PI) / 360) * nameCamera.position.z;
    const visW = visH * (vw / vh);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    u.uNameCenter.value.set(
      ((cx / vw) * 2 - 1) * (visW / 2),
      (-(cy / vh) * 2 + 1) * (visH / 2),
      0
    );
    u.uNameScale.value = (r.width / vw) * visW;
    return true;
  };
  const computeNamePlacement = () => {
    const h1 = document.getElementById("hero-title");
    return h1 ? placeText(h1, nameUniforms) : false;
  };

  const sampleText = (str) => {
    const c = document.createElement("canvas");
    let ctx = c.getContext("2d");
    const FS = MOBILE ? 150 : 230;
    const fontStr = `800 ${FS}px "Space Grotesk","Chivo",system-ui,sans-serif`;
    ctx.font = fontStr;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.02 * FS}px`;
    const m = ctx.measureText(str);
    const asc = m.actualBoundingBoxAscent || FS * 0.72;
    const desc = m.actualBoundingBoxDescent || FS * 0.2;
    const pad = Math.ceil(FS * 0.06);
    const tw = Math.ceil(m.width) + pad * 2;
    const th = Math.ceil(asc + desc) + pad * 2;
    c.width = tw;
    c.height = th;
    ctx = c.getContext("2d");
    ctx.font = fontStr;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${-0.02 * FS}px`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(str, pad, pad + asc);

    const data = ctx.getImageData(0, 0, tw, th).data;
    const pts = [];
    const stride = MOBILE ? 3 : 2;
    const aspect = th / tw;
    for (let y = 0; y < th; y += stride) {
      for (let x = 0; x < tw; x += stride) {
        if (data[(y * tw + x) * 4 + 3] > 130) {
          pts.push([x / tw - 0.5, -(y / th - 0.5) * aspect]);
        }
      }
    }
    return pts;
  };

  const buildName = (pts) => {
    const N = pts.length;
    const pos = new Float32Array(N * 3);
    const tgt = new Float32Array(N * 3);
    const sd = new Float32Array(N);
    const sc = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = Math.random() * 2 - 1;
      tgt[i * 3] = pts[i][0];
      tgt[i * 3 + 1] = pts[i][1];
      tgt[i * 3 + 2] = (Math.random() * 2 - 1) * 0.04;
      sd[i] = Math.random();
      sc[i] = 0.35 + Math.random() * Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(tgt, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(sc, 1));
    nameMesh = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: nameUniforms,
        vertexShader: VERT_NAME,
        fragmentShader: FRAG_NAME,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        // normal blending so soft dots form the name without blowing out white
        blending: THREE.NormalBlending
      })
    );
    nameMesh.frustumCulled = false;
    nameMesh.visible = false;
    nameScene.add(nameMesh);

    nameUniforms.uScale.value.copy(uniforms.uScale.value);
    computeNamePlacement();
    document.documentElement.classList.add("hero-3d-name");
    introStart = performance.now();
  };

  const startBuild = () => {
    if (nameMesh) return;
    let pts = sampleText("Mason Cao");
    if (pts.length < 60) return; // sampling failed → keep the DOM <h1>
    const MAX = MOBILE ? 5200 : 12000;
    if (pts.length > MAX) {
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = pts[i];
        pts[i] = pts[j];
        pts[j] = tmp;
      }
      pts = pts.slice(0, MAX);
    }
    buildName(pts);
  };

  // ── section-header particle text (assemble → crystallize to crisp text) ──
  const makeTextUniforms = () => ({
    uTime: { value: 0 },
    uScale: { value: uniforms.uScale.value.clone() },
    uAmp: { value: 8.0 },
    uFreq: { value: 0.016 },
    uSize: { value: 4.4 * DPR },
    uMorph: { value: 0 },
    uReveal: { value: 0 },
    uNameCenter: { value: new THREE.Vector3() },
    uNameScale: { value: 60 },
    uColor: { value: new THREE.Color(0xcdf3ff) },
    uColor2: { value: new THREE.Color(0x1f7fb0) },
    uFogNear: { value: 55 },
    uFogFar: { value: 240 }
  });

  const buildHeader = (el) => {
    const str = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!str) return null;
    const r = el.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(el).fontSize) || 30;
    if (r.height > fs * 1.7) return null; // wrapped heading → leave as crisp text
    let pts = sampleText(str);
    if (pts.length < 30) return null;
    const MAX = 9000;
    if (pts.length > MAX) {
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = pts[i];
        pts[i] = pts[j];
        pts[j] = tmp;
      }
      pts = pts.slice(0, MAX);
    }
    const N = pts.length;
    const pos = new Float32Array(N * 3);
    const tgt = new Float32Array(N * 3);
    const sd = new Float32Array(N);
    const sc = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = Math.random() * 2 - 1;
      pos[i * 3 + 1] = Math.random() * 2 - 1;
      pos[i * 3 + 2] = Math.random() * 2 - 1;
      tgt[i * 3] = pts[i][0];
      tgt[i * 3 + 1] = pts[i][1];
      tgt[i * 3 + 2] = (Math.random() * 2 - 1) * 0.04;
      sd[i] = Math.random();
      sc[i] = 0.35 + Math.random() * Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(tgt, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(sd, 1));
    g.setAttribute("aScale", new THREE.BufferAttribute(sc, 1));
    const u = makeTextUniforms();
    const mesh = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: u,
        vertexShader: VERT_NAME,
        fragmentShader: FRAG_NAME,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending
      })
    );
    mesh.frustumCulled = false;
    nameScene.add(mesh);
    placeText(el, u);
    return { el, u, mesh, introStart: performance.now(), done: false };
  };

  let headersInit = false;
  const initHeaders = () => {
    if (headersInit || MOBILE || !("IntersectionObserver" in window)) return;
    headersInit = true;
    const hio = new IntersectionObserver(
      (ents) => {
        ents.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          hio.unobserve(el);
          let inst = null;
          try {
            inst = buildHeader(el);
          } catch (_) {}
          if (inst) headerInsts.push(inst);
          else el.style.opacity = "1"; // couldn't particle-ize → show crisp text
        });
      },
      { threshold: 0.25, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll(".section-title").forEach((el) => hio.observe(el));
  };

  const initText = () => {
    startBuild();
    initHeaders();
  };
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 1em "Space Grotesk"').then(initText).catch(initText);
    setTimeout(initText, 2500);
  } else {
    setTimeout(initText, 400);
  }

  // scroll → how "formed" the name is (1 at top, 0 once past the hero)
  const scrollForm = () => {
    const end = (heroEl ? heroEl.offsetHeight : window.innerHeight) * 0.72;
    const y = window.scrollY || window.pageYOffset || 0;
    return 1 - clamp01(y / Math.max(end, 1));
  };

  // ─────────────── sizing ───────────────
  let halfVisW = 100;
  let halfVisH = 62;
  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    nameCamera.aspect = w / h;
    nameCamera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    halfVisW = visW / 2;
    halfVisH = visH / 2;
    uniforms.uScale.value.set(visW * 0.62, visH * 0.64, 95);
    nameUniforms.uScale.value.copy(uniforms.uScale.value);
    computeNamePlacement();
    headerInsts.forEach((it) => {
      it.u.uScale.value.copy(uniforms.uScale.value);
      placeText(it.el, it.u);
    });
  };
  resize();

  // ─────────────── cursor path/wake ───────────────
  const targetM = new THREE.Vector2(0, 0);
  let lastMoveT = -1e9;
  let easedPush = 0;
  const MIN_STEP2 = 8 * 8; // min world distance before recording a trail point
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType && e.pointerType !== "mouse") return; // skip touch
      targetM.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetM.y = -((e.clientY / window.innerHeight) * 2 - 1);
      lastMoveT = performance.now();
      const wx = targetM.x * halfVisW;
      const wy = targetM.y * halfVisH;
      const head = trail[0];
      const dx = wx - head.x;
      const dy = wy - head.y;
      if (dx * dx + dy * dy > MIN_STEP2 || head.x > 9000) {
        for (let i = trail.length - 1; i > 0; i--) trail[i].copy(trail[i - 1]);
        trail[0].set(wx, wy);
      }
    },
    { passive: true }
  );

  // scroll → page fraction (subtle palette + field drift)
  let targetScroll = 0;
  let easedScroll = 0;
  const onScroll = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    targetScroll = clamp01((window.scrollY || window.pageYOffset || 0) / max);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // palette drifts mint → cooler teal as you descend
  const cA0 = new THREE.Color(0x38d0ff);
  const cA1 = new THREE.Color(0x4aa9e6);
  const cB0 = new THREE.Color(0xa9e9ff);
  const cB1 = new THREE.Color(0xaad6f5);

  const t0 = performance.now();
  let raf = null;

  // auto lite-mode: drop pixel ratio if a weak GPU can't keep up
  let fpsFrames = 0;
  let fpsT0 = performance.now();
  let slowStrikes = 0;
  let lite = false;
  const goLite = () => {
    lite = true;
    renderer.setPixelRatio(1);
    resize();
  };

  const frame = () => {
    const now = performance.now();
    const t = (now - t0) / 1000;

    if (!lite && now - t0 > 2500) {
      fpsFrames++;
      if (now - fpsT0 >= 1000) {
        const fps = (fpsFrames * 1000) / (now - fpsT0);
        fpsFrames = 0;
        fpsT0 = now;
        if (fps < 40) {
          if (++slowStrikes >= 2) goLite();
        } else {
          slowStrikes = 0;
        }
      }
    }

    easedScroll += (targetScroll - easedScroll) * 0.06;

    uniforms.uTime.value = t;
    uniforms.uScroll.value = easedScroll;
    uniforms.uColor.value.copy(cA0).lerp(cA1, easedScroll);
    uniforms.uColor2.value.copy(cB0).lerp(cB1, easedScroll);

    // cursor push strength fades when the pointer goes idle
    const active = now - lastMoveT < 1400;
    const pushTarget = active ? 7.5 : 0;
    easedPush += (pushTarget - easedPush) * 0.06;
    uniforms.uPush.value = easedPush;

    // calm, slow auto-rotation — no mouse parallax
    points.rotation.y = t * 0.006;

    if (nameMesh) {
      const intro = introStart == null ? 0 : clamp01((now - introStart) / 1800);
      const form = smooth(scrollForm());
      const morph = smooth(intro) * form;
      // once the grains finish assembling (intro near done) at the top of the
      // page (form high), hand the wordmark off to the crisp DOM <h1>: the
      // grains fade out as the real text fades in, so the name is always sharp
      // and legible at rest. Scrolling drops `form`, reversing it — the crisp
      // text dissolves back into the dispersing particle field.
      const cryst =
        smooth(clamp01((intro - 0.62) / 0.32)) *
        smooth(clamp01((form - 0.55) / 0.4));
      nameUniforms.uTime.value = t;
      nameUniforms.uMorph.value = morph;
      nameUniforms.uReveal.value = cryst; // grain alpha *= (1 - uReveal)
      if (heroTitleEl) heroTitleEl.style.opacity = cryst.toFixed(3);
      uniforms.uDim.value = 1.0 - 0.45 * morph; // calm the field behind the name
      const showGrains = form > 0.002 && cryst < 0.999;
      nameMesh.visible = showGrains;
      if (showGrains) computeNamePlacement();
    }

    // section headers: assemble out of the field, then crystallize into the
    // crisp DOM <h2>. The grains hand their alpha to the real .section-title
    // (which stays put, sharp and legible) once the heading has formed; meshes
    // are viewport-culled so off-screen headers cost nothing.
    for (let k = 0; k < headerInsts.length; k++) {
      const it = headerInsts[k];
      const r = it.el.getBoundingClientRect();
      const onScreen = r.bottom > -140 && r.top < window.innerHeight + 140;
      const tt = clamp01((now - it.introStart) / 1600);
      const cryst = smooth(clamp01((tt - 0.6) / 0.34));
      it.el.style.opacity = cryst.toFixed(3);
      it.u.uReveal.value = cryst;
      const showGrains = onScreen && cryst < 0.999;
      it.mesh.visible = showGrains;
      if (!showGrains) continue;
      it.u.uTime.value = t;
      it.u.uMorph.value = smooth(clamp01(tt / 0.7));
      placeText(it.el, it.u);
    }

    renderer.clear();
    renderer.render(scene, camera);
    renderer.render(nameScene, nameCamera);
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf == null) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  let resizeT = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(resize, 150);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  start();
})();
