// ─────────────────────────────────────────────────────────────
// Exoplanet transit — WebGL star + orbiting planet (Three.js) above
// a live 2D light curve. The same orbital geometry drives the 3D
// scene, the curve, and the flux/phase HUD. Drag to scrub the orbit.
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";

(function initTransit() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sceneCanvas = document.getElementById("transit-canvas");
  const curveCanvas = document.getElementById("transit-curve");
  const stage = document.querySelector(".transit-stage");
  if (!sceneCanvas || !curveCanvas || !stage) return;

  const fluxEl = document.getElementById("transit-flux");
  const phaseEl = document.getElementById("transit-phase");
  const stateEl = document.getElementById("transit-state");

  const RSTAR = 1.0;
  const RPLANET = 0.13;
  const ORBIT = 2.35;
  const TILT = 0.1; // radians → impact parameter
  const DEPTH = 0.013; // displayed fractional dip at full overlap
  const PERIOD = 9000; // ms per orbit

  // ── shared orbital geometry ──
  const lensArea = (d, R, r) => {
    if (d >= R + r) return 0;
    if (d <= Math.abs(R - r)) return Math.PI * Math.min(R, r) ** 2;
    const a1 = Math.acos((d * d + r * r - R * R) / (2 * d * r));
    const a2 = Math.acos((d * d + R * R - r * r) / (2 * d * R));
    const tri = 0.5 * Math.sqrt((-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R));
    return r * r * a1 + R * R * a2 - tri;
  };
  const planetPos = (phase) => {
    const th = (phase + 0.5) * Math.PI * 2; // transit centered at phase 0.5
    const x = ORBIT * Math.sin(th);
    const z0 = ORBIT * Math.cos(th);
    return { x, y: -z0 * Math.sin(TILT), z: z0 * Math.cos(TILT) };
  };
  const dipAtPhase = (phase) => {
    const p = planetPos(phase);
    if (p.z <= 0) return 0; // behind the star
    const overlap = lensArea(Math.hypot(p.x, p.y), RSTAR, RPLANET);
    return overlap / (Math.PI * RPLANET * RPLANET);
  };

  // ─────────────── WebGL star scene ───────────────
  let webgl = true;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: sceneCanvas,
      alpha: true,
      antialias: true
    });
  } catch (e) {
    webgl = false;
  }

  let scene, camera, starMesh, planetMesh, glowSprite, starUniforms;
  if (webgl) {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    starUniforms = {
      uTime: { value: 0 },
      uCore: { value: new THREE.Color(0xf2fbff) },
      uEdge: { value: new THREE.Color(0x69e0c0) }
    };
    const starMat = new THREE.ShaderMaterial({
      uniforms: starUniforms,
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
        varying vec3 vN; varying vec3 vView;
        uniform float uTime; uniform vec3 uCore; uniform vec3 uEdge;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
        void main(){
          float mu = clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0);
          float limb = pow(mu, 0.6);
          vec3 col = mix(uEdge, uCore, limb);
          float shimmer = 0.94 + 0.06 * hash(floor(vN * 36.0) + floor(uTime * 1.5));
          gl_FragColor = vec4(col * limb * shimmer, 1.0);
        }
      `
    });
    starMesh = new THREE.Mesh(new THREE.SphereGeometry(RSTAR, 64, 64), starMat);
    scene.add(starMesh);

    // corona glow billboard (additive radial gradient)
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const gc = glowCanvas.getContext("2d");
    const grad = gc.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, "rgba(170,245,228,0.65)");
    grad.addColorStop(0.22, "rgba(105,224,192,0.4)");
    grad.addColorStop(0.5, "rgba(105,224,192,0.12)");
    grad.addColorStop(1.0, "rgba(105,224,192,0.0)");
    gc.fillStyle = grad;
    gc.fillRect(0, 0, 256, 256);
    glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        depthTest: false
      })
    );
    glowSprite.scale.set(RSTAR * 4.3, RSTAR * 4.3, 1);
    scene.add(glowSprite);

    // planet: dark sphere with mint fresnel rim
    const planetMat = new THREE.ShaderMaterial({
      uniforms: { uRim: { value: new THREE.Color(0x69e0c0) } },
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
        varying vec3 vN; varying vec3 vView; uniform vec3 uRim;
        void main(){
          float f = pow(1.0 - clamp(dot(normalize(vN), normalize(vView)), 0.0, 1.0), 2.5);
          vec3 col = mix(vec3(0.02,0.03,0.045), uRim, f * 0.9);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    planetMesh = new THREE.Mesh(new THREE.SphereGeometry(RPLANET, 32, 32), planetMat);
    scene.add(planetMesh);

    // faint starfield
    const sfGeo = new THREE.BufferGeometry();
    const SF = 260;
    const sfPos = new Float32Array(SF * 3);
    for (let i = 0; i < SF; i++) {
      sfPos[i * 3] = (Math.random() * 2 - 1) * 9;
      sfPos[i * 3 + 1] = (Math.random() * 2 - 1) * 6;
      sfPos[i * 3 + 2] = -4 - Math.random() * 9;
    }
    sfGeo.setAttribute("position", new THREE.BufferAttribute(sfPos, 3));
    scene.add(
      new THREE.Points(
        sfGeo,
        new THREE.PointsMaterial({
          color: 0x9fb0c0,
          size: 0.022,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.5
        })
      )
    );
  }

  // ─────────────── 2D light curve ───────────────
  const cctx = curveCanvas.getContext("2d");
  let cw = 0;
  let ch = 0;
  let curvePts = [];
  const sizeCurve = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = curveCanvas.clientWidth || 600;
    ch = curveCanvas.clientHeight || 150;
    curveCanvas.width = Math.round(cw * dpr);
    curveCanvas.height = Math.round(ch * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const baseY = ch * 0.3;
    const botY = ch * 0.78;
    curvePts = [];
    for (let x = 0; x <= cw; x += 2) {
      curvePts.push({ x, y: baseY + dipAtPhase(x / cw) * (botY - baseY) });
    }
  };
  const monoFont = (px) => `600 ${px}px "JetBrains Mono", ui-monospace, monospace`;
  const drawCurve = (phase) => {
    const baseY = ch * 0.3;
    const botY = ch * 0.78;
    const cutoff = phase * cw;
    cctx.clearRect(0, 0, cw, ch);

    cctx.strokeStyle = "rgba(238,241,246,0.04)";
    cctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const x = (i / 8) * cw;
      cctx.beginPath();
      cctx.moveTo(x, 0);
      cctx.lineTo(x, ch);
      cctx.stroke();
    }

    cctx.strokeStyle = "rgba(238,241,246,0.08)";
    cctx.setLineDash([3, 5]);
    [baseY, botY].forEach((y) => {
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(cw, y);
      cctx.stroke();
    });
    cctx.setLineDash([]);

    cctx.fillStyle = "rgba(110,120,134,0.85)";
    cctx.font = monoFont(9.5);
    cctx.textAlign = "left";
    cctx.fillText("1.0000", 8, baseY - 5);
    cctx.fillText((1 - DEPTH).toFixed(4), 8, botY + 12);

    cctx.strokeStyle = "rgba(105,224,192,0.22)";
    cctx.setLineDash([2, 4]);
    cctx.beginPath();
    cctx.moveTo(cutoff, 0);
    cctx.lineTo(cutoff, ch);
    cctx.stroke();
    cctx.setLineDash([]);

    cctx.strokeStyle = "rgba(105,224,192,0.18)";
    cctx.lineWidth = 1.5;
    cctx.beginPath();
    curvePts.forEach((p, i) => (i ? cctx.lineTo(p.x, p.y) : cctx.moveTo(p.x, p.y)));
    cctx.stroke();

    cctx.strokeStyle = "#69e0c0";
    cctx.lineWidth = 2;
    cctx.beginPath();
    let started = false;
    for (let i = 0; i < curvePts.length && curvePts[i].x <= cutoff; i++) {
      const p = curvePts[i];
      if (started) cctx.lineTo(p.x, p.y);
      else {
        cctx.moveTo(p.x, p.y);
        started = true;
      }
    }
    cctx.stroke();

    const my = baseY + dipAtPhase(phase) * (botY - baseY);
    cctx.fillStyle = "#69e0c0";
    cctx.shadowColor = "#69e0c0";
    cctx.shadowBlur = 10;
    cctx.beginPath();
    cctx.arc(cutoff, my, 3, 0, Math.PI * 2);
    cctx.fill();
    cctx.shadowBlur = 0;
  };

  // ─────────────── HUD ───────────────
  let prevDip = 0;
  const updateHud = (dip, phase) => {
    if (fluxEl) fluxEl.textContent = (1 - dip * DEPTH).toFixed(4);
    if (phaseEl) phaseEl.textContent = phase.toFixed(2);
    if (stateEl) {
      let s;
      if (dip < 0.012) s = "baseline";
      else if (dip > 0.97) s = "in transit";
      else s = dip >= prevDip ? "ingress" : "egress";
      stateEl.textContent = s;
    }
    prevDip = dip;
  };

  const resize = () => {
    if (webgl) {
      const w = sceneCanvas.clientWidth || 600;
      const h = sceneCanvas.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    sizeCurve();
  };

  // ─────────────── animation ───────────────
  let raf = null;
  let running = false;
  let startT = null;
  let scrubbing = false;
  let scrubPhase = 0;
  let hudc = 0;

  const renderScene = (ph) => {
    if (!webgl) return;
    const p = planetPos(ph);
    planetMesh.position.set(p.x, p.y, p.z);
    starUniforms.uTime.value = performance.now() / 1000;
    starMesh.rotation.y += 0.0009;
    renderer.render(scene, camera);
  };
  const renderAll = (ph) => {
    renderScene(ph);
    drawCurve(ph);
    if (hudc++ % 2 === 0) updateHud(dipAtPhase(ph), ph);
  };
  const tick = (t) => {
    if (startT === null) startT = t;
    let phase;
    if (scrubbing) {
      phase = scrubPhase;
      startT = t - phase * PERIOD;
    } else {
      phase = ((((t - startT) % PERIOD) + PERIOD) % PERIOD) / PERIOD;
    }
    renderAll(phase);
    raf = requestAnimationFrame(tick);
  };
  const start = () => {
    if (running || reduce) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    running = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  // drag-to-scrub (mouse)
  const phaseFromEvent = (e) => {
    const r = stage.getBoundingClientRect();
    return Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
  };
  const onScrub = (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    scrubbing = true;
    scrubPhase = phaseFromEvent(e);
    stage.classList.add("is-scrubbing");
    if (!running) renderAll(scrubPhase);
  };
  const endScrub = () => {
    scrubbing = false;
    stage.classList.remove("is-scrubbing");
  };
  stage.addEventListener("pointerenter", onScrub);
  stage.addEventListener("pointerdown", onScrub);
  stage.addEventListener("pointermove", (e) => {
    if (scrubbing) onScrub(e);
  });
  stage.addEventListener("pointerleave", endScrub);
  stage.addEventListener("pointerup", endScrub);

  resize();
  renderAll(reduce ? 0.5 : 0);

  if (!reduce && "IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => (en.isIntersecting ? start() : stop())),
      { threshold: 0.05 }
    ).observe(stage);
  } else if (!reduce) {
    start();
  }

  let rt = null;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      resize();
      if (!running) renderAll(reduce ? 0.5 : scrubPhase);
    }, 150);
  });
})();
