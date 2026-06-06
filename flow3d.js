// ─────────────────────────────────────────────────────────────
// Atmospheric flow field — WebGL (Three.js)
// A volumetric cloud of GPU-animated points advected through a 3D
// curl-noise field. Depth fog, additive mint glow, slow rotation,
// and cursor-driven parallax + field warp. Rendered behind the page.
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
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (err) {
    return; // no WebGL: leave the plain dark background in place
  }

  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);
  camera.position.set(0, 0, 120);

  // ── geometry: points in a normalized [-1,1] box, stretched to the
  //    visible frustum by uScale so the cloud always fills the viewport.
  const COUNT = window.innerWidth < 760 ? 6500 : 12000;
  const positions = new Float32Array(COUNT * 3);
  const seeds = new Float32Array(COUNT);
  const scales = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = Math.random() * 2 - 1;
    positions[i * 3 + 1] = Math.random() * 2 - 1;
    positions[i * 3 + 2] = Math.random() * 2 - 1;
    seeds[i] = Math.random();
    scales[i] = 0.35 + Math.random() * Math.random(); // skew toward small
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

  const uniforms = {
    uTime: { value: 0 },
    uScale: { value: new THREE.Vector3(90, 55, 90) },
    uAmp: { value: 13.0 },
    uFreq: { value: 0.016 },
    uSize: { value: 6.5 * DPR },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColor: { value: new THREE.Color(0x4fd6b6) },
    uColor2: { value: new THREE.Color(0xbdf3e7) },
    uFogNear: { value: 55 },
    uFogFar: { value: 240 }
  };

  const VERT = /* glsl */ `
    uniform float uTime;
    uniform vec3  uScale;
    uniform float uAmp;
    uniform float uFreq;
    uniform float uSize;
    uniform vec2  uMouse;
    attribute float aSeed;
    attribute float aScale;
    varying float vDepth;
    varying float vMix;

    // Ashima 3D simplex noise
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

    void main(){
      vec3 base = position * uScale;
      vec3 sp = base * uFreq
              + vec3(uMouse * 1.4, 0.0)
              + vec3(0.0, uTime * 0.06, uTime * 0.03);
      vec3 flow = curlNoise(sp);
      vec3 displaced = base + flow * uAmp;
      displaced.y += sin(uTime * 0.3 + aSeed * 6.2831) * 1.6;

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
    varying float vDepth;
    varying float vMix;

    void main(){
      vec2 uv = gl_PointCoord - 0.5;
      float d = length(uv);
      if (d > 0.5) discard;
      float soft = smoothstep(0.5, 0.0, d);
      float fog = 1.0 - clamp((vDepth - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
      vec3 col = mix(uColor, uColor2, vMix * 0.7);
      float a = soft * fog * (0.16 + vMix * 0.5) * 0.42;
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

  const resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const visW = visH * camera.aspect;
    uniforms.uScale.value.set(visW * 0.62, visH * 0.64, 95);
  };
  resize();

  const targetM = new THREE.Vector2(0, 0);
  const easedM = new THREE.Vector2(0, 0);
  window.addEventListener(
    "pointermove",
    (e) => {
      targetM.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetM.y = -((e.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true }
  );

  const t0 = performance.now();
  let raf = null;
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    easedM.x += (targetM.x - easedM.x) * 0.045;
    easedM.y += (targetM.y - easedM.y) * 0.045;
    uniforms.uTime.value = t;
    uniforms.uMouse.value.set(easedM.x, easedM.y);

    points.rotation.y = t * 0.02 + easedM.x * 0.28;
    points.rotation.x = easedM.y * -0.2;
    camera.position.x = easedM.x * 14;
    camera.position.y = easedM.y * 9;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
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
