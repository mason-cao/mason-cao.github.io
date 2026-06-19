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
  const coreGroup = new THREE.Group();
  group.rotation.x = 0.5;
  scene.add(group);
  group.add(coreGroup);
  const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
  // pulled back so the full sphere + atmosphere sit inside the frustum with
  // margin so it never clips on the sides
  const BASE_CAMERA_Z = 5.2;
  camera.position.set(0, 0, BASE_CAMERA_Z);

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
  const srcPos = icoGeo.attributes.position;
  const nodeKey = (x, y, z) => x.toFixed(3) + "," + y.toFixed(3) + "," + z.toFixed(3);
  const nodeKeyToIndex = new Map();
  const nodeList = [];
  for (let i = 0; i < srcPos.count; i++) {
    const x = srcPos.getX(i), y = srcPos.getY(i), z = srcPos.getZ(i);
    const key = nodeKey(x, y, z);
    if (!nodeKeyToIndex.has(key)) {
      nodeKeyToIndex.set(key, nodeList.length / 3);
      nodeList.push(x, y, z);
    }
  }
  const NN = nodeList.length / 3;
  const nPos = new Float32Array(nodeList);
  const LAYER_COUNT = 7;
  const nodeLayer = new Int8Array(NN);
  const biases = new Float32Array(NN);
  const deterministicUnit = (seed) => {
    const value = Math.sin(seed) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let i = 0; i < NN; i++) {
    const x = nPos[i * 3];
    const y = nPos[i * 3 + 1];
    const z = nPos[i * 3 + 2];
    const depth = Math.max(0, Math.min(0.999, (x / R + 1) * 0.5));
    nodeLayer[i] = Math.min(LAYER_COUNT - 1, Math.floor(depth * LAYER_COUNT));
    biases[i] = (deterministicUnit((i + 1) * 17.17 + x * 23.31 + y * 31.73 + z * 43.91) - 0.5) * 0.42;
  }

  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const segVerts = wireGeo.attributes.position.count; // 2 per edge
  const edgeCount = segVerts / 2;
  const aEdgeT = new Float32Array(segVerts);
  const aPhase = new Float32Array(segVerts);
  const aPath = new Float32Array(segVerts);
  const edgeSource = new Int32Array(edgeCount);
  const edgeTarget = new Int32Array(edgeCount);
  const edgeWeight = new Float32Array(edgeCount);
  const edgeContribution = new Float32Array(edgeCount);
  const edgeSignal = new Float32Array(edgeCount);
  for (let s = 0; s < edgeCount; s++) {
    const i0 = s * 2;
    const i1 = i0 + 1;
    aEdgeT[i0] = 0; aEdgeT[i1] = 1;
    const ph = ((s * 37) % 997) / 997;
    aPhase[i0] = ph; aPhase[i1] = ph;

    const ax = wireGeo.attributes.position.getX(i0);
    const ay = wireGeo.attributes.position.getY(i0);
    const az = wireGeo.attributes.position.getZ(i0);
    const bx = wireGeo.attributes.position.getX(i1);
    const by = wireGeo.attributes.position.getY(i1);
    const bz = wireGeo.attributes.position.getZ(i1);
    const a = nodeKeyToIndex.get(nodeKey(ax, ay, az));
    const b = nodeKeyToIndex.get(nodeKey(bx, by, bz));
    const aIsEarlier = nodeLayer[a] < nodeLayer[b] || (nodeLayer[a] === nodeLayer[b] && ax < bx);
    const source = aIsEarlier ? a : b;
    const target = aIsEarlier ? b : a;
    const isFeedForward = nodeLayer[target] > nodeLayer[source];
    const weightSeed = deterministicUnit((source + 1) * 19.19 + (target + 1) * 73.07);
    const signSeed = deterministicUnit((source + 1) * 41.3 + (target + 1) * 11.7);
    edgeSource[s] = source;
    edgeTarget[s] = target;
    edgeWeight[s] = isFeedForward ? (signSeed > 0.28 ? 1 : -1) * (0.45 + weightSeed * 1.15) : 0;
  }
  wireGeo.setAttribute("aEdgeT", new THREE.BufferAttribute(aEdgeT, 1));
  wireGeo.setAttribute("aPhase", new THREE.BufferAttribute(aPhase, 1));
  wireGeo.setAttribute("aPath", new THREE.BufferAttribute(aPath, 1));
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const activations = new Float32Array(NN);
  const sums = new Float32Array(NN);
  const nAct = new Float32Array(NN);
  const runForwardPass = (time) => {
    sums.set(biases);
    for (let i = 0; i < NN; i++) {
      if (nodeLayer[i] === 0) {
        const y = nPos[i * 3 + 1];
        const z = nPos[i * 3 + 2];
        activations[i] = sigmoid(1.45 * Math.sin(time * 0.72 + y * 2.1 + z * 1.35) + biases[i]);
      } else {
        activations[i] = 0;
      }
    }

    for (let layer = 1; layer < LAYER_COUNT; layer++) {
      for (let e = 0; e < edgeCount; e++) {
        const target = edgeTarget[e];
        if (nodeLayer[target] !== layer || edgeWeight[e] === 0) continue;
        const source = edgeSource[e];
        sums[target] += edgeWeight[e] * activations[source];
      }
      for (let i = 0; i < NN; i++) {
        if (nodeLayer[i] === layer) activations[i] = sigmoid(sums[i]);
      }
    }

    let maxContribution = 0;
    for (let e = 0; e < edgeCount; e++) {
      const source = edgeSource[e];
      const target = edgeTarget[e];
      const contribution = Math.abs(edgeWeight[e] * activations[source]);
      const gatedContribution = edgeWeight[e] === 0 ? 0 : contribution * (0.5 + activations[target] * 0.5);
      edgeContribution[e] = gatedContribution;
      maxContribution = Math.max(maxContribution, gatedContribution);
    }

    const threshold = maxContribution * 0.42;
    for (let e = 0; e < edgeCount; e++) {
      const normalized = maxContribution > 0 ? Math.min(edgeContribution[e] / maxContribution, 1) : 0;
      const targetSignal = edgeContribution[e] >= threshold ? Math.pow(normalized, 0.92) : 0;
      edgeSignal[e] += (targetSignal - edgeSignal[e]) * 0.28;
      const i0 = e * 2;
      const i1 = i0 + 1;
      aPath[i0] = edgeSignal[e];
      aPath[i1] = edgeSignal[e];
    }
    for (let i = 0; i < NN; i++) nAct[i] = activations[i];
    wireGeo.attributes.aPath.needsUpdate = true;
    nGeo.attributes.aActivation.needsUpdate = true;
  };
  const wireUniforms = {
    uTime: { value: 0 },
    uColor: { value: CYAN },
    uColor2: { value: CYAN_HI },
    uCamZ: { value: CAMZ },
    uR: { value: R },
    uFocus: { value: 0 },
  };
  const wire = new THREE.LineSegments(
    wireGeo,
    new THREE.ShaderMaterial({
      uniforms: wireUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aEdgeT; attribute float aPhase; attribute float aPath;
        uniform float uTime; uniform float uCamZ; uniform float uR;
        varying float vEdgeT; varying float vPhase; varying float vPath; varying float vAct; varying float vDepth;
        void main(){
          vEdgeT = aEdgeT; vPhase = aPhase; vPath = aPath;
          float ny = normalize(position).y;
          float sweep = sin(uTime * 0.55);
          vAct = smoothstep(0.42, 0.0, abs(ny - sweep));
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = smoothstep(-(uCamZ + uR), -(uCamZ - uR), mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uFocus; uniform vec3 uColor; uniform vec3 uColor2;
        varying float vEdgeT; varying float vPhase; varying float vPath; varying float vAct; varying float vDepth;
        void main(){
          // a bright signal travelling along the synapse, node → node
          float p = fract(uTime * 0.3 + vPhase);
          float d = abs(vEdgeT - p); d = min(d, 1.0 - d);
          float pulse = smoothstep(0.105, 0.0, d);
          float pathSignal = min(vPath * (0.68 + uFocus * 0.82), 1.0);
          float movingSignal = pulse * pathSignal;
          float lit = clamp(vAct * 0.16 + pulse * 0.22 + pathSignal * 0.46 + movingSignal * 1.95, 0.0, 1.0);
          float depthMul = 0.22 + 0.78 * vDepth;
          vec3 col = mix(mix(uColor, uColor2, lit), vec3(0.96, 0.99, 1.0), min(pathSignal * 0.7 + movingSignal * 0.55, 1.0));
          float a = min((0.07 + lit * 0.58 + pathSignal * 0.48 + movingSignal * 0.75) * depthMul * (1.0 + movingSignal * 1.9), 1.0);
          gl_FragColor = vec4(col, a);
        }
      `,
    })
  );
  coreGroup.add(wire);

  // ── neurons: a glowing node on every geodesic vertex. Node brightness now
  // comes from the same forward-pass activations that choose the visible paths.
  const nSeed = new Float32Array(NN);
  for (let i = 0; i < NN; i++) nSeed[i] = deterministicUnit((i + 1) * 97.13);
  const nGeo = new THREE.BufferGeometry();
  nGeo.setAttribute("position", new THREE.BufferAttribute(nPos, 3));
  nGeo.setAttribute("aSeed", new THREE.BufferAttribute(nSeed, 1));
  nGeo.setAttribute("aActivation", new THREE.BufferAttribute(nAct, 1));
  const pUniforms = {
    uTime: { value: 0 },
    uSize: { value: 5.4 * DPR },
    uColor: { value: CYAN },
    uColor2: { value: CYAN_HI },
    uCamZ: { value: CAMZ },
    uR: { value: R },
    uFocus: { value: 0 },
  };
  const points = new THREE.Points(
    nGeo,
    new THREE.ShaderMaterial({
      uniforms: pUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aSeed; attribute float aActivation;
        uniform float uTime; uniform float uSize; uniform float uCamZ; uniform float uR; uniform float uFocus;
        varying float vAct; varying float vDepth;
        void main(){
          float tw = 0.45 + 0.55 * sin(uTime * 1.5 + aSeed * 6.2831);
          vAct = clamp(max(tw * 0.3, aActivation), 0.0, 1.0);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = smoothstep(-(uCamZ + uR), -(uCamZ - uR), mv.z);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.0 + uFocus * 0.75) * (0.4 + vAct * 1.7) * (0.5 + 0.7 * vDepth) * (3.0 / max(-mv.z, 1.0));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uFocus; uniform vec3 uColor; uniform vec3 uColor2;
        varying float vAct; varying float vDepth;
        void main(){
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float soft = smoothstep(0.5, 0.0, d);
          float halo = smoothstep(0.5, 0.18, d) * 0.4;
          float depthMul = 0.3 + 0.7 * vDepth;
          vec3 col = mix(mix(uColor, uColor2, vAct), vec3(0.92, 0.98, 1.0), uFocus * 0.48);
          float alpha = ((soft * (0.48 + vAct * 0.62)) + halo * (vAct + uFocus * 0.45)) * depthMul;
          gl_FragColor = vec4(col, min(alpha * (1.0 + uFocus * 1.05), 1.0));
        }
      `,
    })
  );
  points.frustumCulled = false;
  coreGroup.add(points);

  // ── atmosphere rim (Fresnel, back side) ──
  const atmoUniforms = {
    uColor: { value: CYAN },
    uFocus: { value: 0 },
  };
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.22, 48, 48),
    new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: atmoUniforms,
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
        uniform float uFocus; uniform vec3 uColor; varying vec3 vN; varying vec3 vView;
        void main(){
          float f = pow(1.0 - abs(dot(vN, vView)), 2.6);
          gl_FragColor = vec4(uColor, f * 1.15 * (1.0 - uFocus * 0.88));
        }
      `,
    })
  );
  group.add(atmo);

  // ── drag to spin (inertia), like the Lorenz centerpiece ──
  const globeShell = canvas.closest(".hud-scene");
  const ambientAudio = document.getElementById("ambient-audio");
  const PULSE_ENVELOPE_SRC = "audio/dreiton-envelope.json?v=20260619a";
  let focusMix = 0, hoverMix = 0;
  let focusTarget = 0, hoverTarget = 0;
  let audioPulseEnvelope = null;
  let audioPulseMix = 0;
  let audioEnergy = 0;
  let audioPulseReady = false;
  let audioPulseLoading = false;
  let audioActivationTimer = null;
  let rotX = 0.5, rotY = 0.2, velX = 0, velY = 0.0016;
  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener("pointerenter", () => { hoverTarget = 1; });
  canvas.addEventListener("pointerleave", () => { hoverTarget = 0; });
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    const dy = e.clientY - lastY; lastY = e.clientY;
    rotY += dx * 0.008; velY = dx * 0.0009;
    rotX += dy * 0.008; velX = dy * 0.0009;
  });
  const release = () => { dragging = false; };
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  const loadAudioPulseEnvelope = async () => {
    if (!ambientAudio) return false;
    if (audioPulseReady || audioPulseLoading) return audioPulseReady;
    audioPulseLoading = true;
    try {
      const response = await fetch(PULSE_ENVELOPE_SRC);
      if (!response.ok) return false;
      const data = await response.json();
      if (!Array.isArray(data.values) || !data.values.length || !data.frameRate) return false;
      audioPulseEnvelope = data;
      audioPulseReady = true;
      return audioPulseReady;
    } catch (_) {
      return false;
    } finally {
      audioPulseLoading = false;
    }
  };

  const scheduleAudioPulseActivation = () => {
    if (audioActivationTimer != null) window.clearTimeout(audioActivationTimer);
    audioActivationTimer = window.setTimeout(() => {
      audioActivationTimer = null;
      loadAudioPulseEnvelope();
    }, 900);
  };
  ambientAudio?.addEventListener("playing", scheduleAudioPulseActivation);
  window.setTimeout(() => {
    loadAudioPulseEnvelope();
  }, 1800);

  const sampleAudioPulse = () => {
    const shouldDriveAudioPulse =
      ambientAudio &&
      !ambientAudio.paused &&
      hoverTarget === 0 &&
      focusTarget === 0 &&
      !reduce;
    if (!shouldDriveAudioPulse || !audioPulseReady) return 0;
    const values = audioPulseEnvelope.values;
    if (!values?.length) return 0;

    const frameRate = audioPulseEnvelope.frameRate || 60;
    const currentTime = Number.isFinite(ambientAudio.currentTime) ? ambientAudio.currentTime : 0;
    const position = (currentTime * frameRate) % values.length;
    const index = Math.floor(position);
    const nextIndex = (index + 1) % values.length;
    const blend = position - index;
    const rawLevel = (((values[index] || 0) * (1 - blend)) + ((values[nextIndex] || 0) * blend)) / 1000;
    const level = Math.min(rawLevel * 1.45, 1);
    const lowerBeat = Math.pow(level, 0.95) * 0.62;
    const transient = Math.max(0, level - audioEnergy);
    const bigBeat = Math.pow(Math.min(transient * 6.0, 1), 1.08) * 1.45;
    audioEnergy += (level - audioEnergy) * (level > audioEnergy ? 0.045 : 0.025);
    return Math.min(lowerBeat + bigBeat, 1);
  };

  const resize = () => {
    const s = sizeOf(); w = s.w; h = s.h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  runForwardPass(0);

  const render = () => renderer.render(scene, camera);
  let raf = null;
  const t0 = performance.now();
  let lastFrameTime = t0;
  const frame = (now = performance.now()) => {
    const dt = Math.min(Math.max((now - lastFrameTime) / 1000, 0), 0.05);
    const frameRatio = dt * 60;
    lastFrameTime = now;
    const t = (now - t0) / 1000;
    pUniforms.uTime.value = t;
    wireUniforms.uTime.value = t;
    runForwardPass(t);
    focusTarget = globeShell?.classList.contains("is-globe-expanded") ? 1 : 0;
    focusMix += (focusTarget - focusMix) * (1 - Math.pow(0.84, frameRatio));
    hoverMix += (hoverTarget - hoverMix) * (1 - Math.pow(0.82, frameRatio));
    const targetAudioPulse = sampleAudioPulse();
    const pulseEase = targetAudioPulse > audioPulseMix ? 1 - Math.pow(0.91, frameRatio) : 1 - Math.pow(0.965, frameRatio);
    audioPulseMix += (targetAudioPulse - audioPulseMix) * pulseEase;
    wireUniforms.uFocus.value = focusMix;
    pUniforms.uFocus.value = focusMix;
    atmoUniforms.uFocus.value = focusMix;
    coreGroup.scale.setScalar(1 + focusMix * 0.45 + hoverMix * 0.08 + audioPulseMix * 0.18);
    camera.position.z = BASE_CAMERA_Z + focusMix * 1.25;
    if (!dragging) {
      rotY += velY * frameRatio;
      velY += (0.0016 - velY) * (1 - Math.pow(0.98, frameRatio));
      rotX += velX * frameRatio;
      velX *= Math.pow(0.94, frameRatio);
    }
    group.rotation.x = rotX;
    group.rotation.y = rotY;
    render();
    raf = requestAnimationFrame(frame);
  };
  const start = () => {
    if (raf == null && !reduce) {
      lastFrameTime = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
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
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      resize();
      if (raf == null) render();
    }).observe(canvas);
  }

  sync();
})();
