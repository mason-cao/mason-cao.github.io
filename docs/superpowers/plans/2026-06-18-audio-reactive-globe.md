# Audio Reactive Globe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subtle live audio-reactive pulsing to the inner globe while Dreiton plays.

**Architecture:** Keep the behavior in `globe.js`, where the Three.js render loop and inner `coreGroup` scale already live. Lazily connect `#ambient-audio` to a Web Audio analyser, compute smoothed RMS energy, and add that value to the existing scale expression only when playback is active and the globe is not hovered or focused.

**Tech Stack:** Vanilla JavaScript, Three.js, Web Audio API, Node assertion tests.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `tests/app-interactions.test.mjs`
- Inspect: `globe.js`

- [ ] **Step 1: Write the failing test**

Add assertions that require audio analysis, playback gating, hover/focus suppression, and scale-only application:

```js
assert.match(
  globeSource,
  /const ambientAudio = document\.getElementById\("ambient-audio"\)/,
  "globe should read the ambient Dreiton audio element"
);

assert.match(
  globeSource,
  /createMediaElementSource\(ambientAudio\)[\s\S]*getByteTimeDomainData\(audioTimeData\)/,
  "globe pulse should use live Web Audio data from the Dreiton element"
);

assert.match(
  globeSource,
  /ambientAudio\.paused[\s\S]*hoverTarget === 0[\s\S]*focusTarget === 0[\s\S]*!reduce/,
  "audio pulse should run only while playing and stop under hover, focus, or reduced motion"
);

assert.match(
  globeSource,
  /coreGroup\.scale\.setScalar\(1 \+ focusMix \* 0\.45 \+ hoverMix \* 0\.08 \+ audioPulseMix \* 0\.035\)/,
  "audio pulse should scale only the inner globe core, not the outer canvas or ring"
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/app-interactions.test.mjs`

Expected: FAIL on the new missing audio-reactive globe assertion.

### Task 2: Implement Audio-Reactive Scale

**Files:**
- Modify: `globe.js`
- Modify: `index.html`
- Test: `tests/app-interactions.test.mjs`

- [ ] **Step 1: Add Web Audio state**

Near the existing hover/focus state in `globe.js`, define `ambientAudio`, analyser state, and smoothed values:

```js
const ambientAudio = document.getElementById("ambient-audio");
let audioContext = null;
let audioAnalyser = null;
let audioTimeData = null;
let audioConnected = false;
let audioPulseMix = 0;
let audioFloor = 0.015;
```

- [ ] **Step 2: Add lazy analyser setup and sampling**

Create helpers that connect the media element once, resume the audio context when possible, compute RMS from `getByteTimeDomainData`, subtract a rolling floor, and return `0` whenever playback should not drive the globe.

- [ ] **Step 3: Apply the pulse to the inner globe scale**

Update the existing scale call to:

```js
coreGroup.scale.setScalar(1 + focusMix * 0.45 + hoverMix * 0.08 + audioPulseMix * 0.035);
```

- [ ] **Step 4: Run test to verify it passes**

Update the module version in `index.html`:

```html
<script type="module" src="globe.js?v=20260618a"></script>
```

Run: `node tests/app-interactions.test.mjs`

Expected: PASS with `app interaction tests passed`.

### Task 3: Verify Integration

**Files:**
- Inspect: `globe.js`
- Inspect: `tests/app-interactions.test.mjs`

- [ ] **Step 1: Run all available tests**

Run: `node tests/app-interactions.test.mjs` and `node tests/deck-mode.test.mjs`

Expected: both commands exit 0.

- [ ] **Step 2: Inspect git diff**

Run: `git diff -- docs/superpowers/specs/2026-06-18-audio-reactive-globe-design.md docs/superpowers/plans/2026-06-18-audio-reactive-globe.md tests/app-interactions.test.mjs globe.js`

Expected: only the planned audio-reactive globe changes are present.
