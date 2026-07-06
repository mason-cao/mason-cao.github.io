// ─────────────────────────────────────────────────────────────
// sfx.js — zero-asset JARVIS sound design, fully synthesized with the
// Web Audio API. No samples, no network. Everything routes through one
// master gain so the mute toggle is instant. The context unlocks on the
// first user gesture (the boot gate click).
// ─────────────────────────────────────────────────────────────

let ctx = null;
let master = null;
let muted = false;
try {
  muted = localStorage.getItem("mc:snd") === "0";
} catch (_) {}

const ensure = () => {
  if (ctx) return ctx.state === "suspended" ? (ctx.resume(), ctx) : ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  return ctx;
};

/** oscillator helper: freq sweep + exponential decay envelope */
const tone = ({
  type = "sine",
  from = 880,
  to = from,
  dur = 0.08,
  gain = 0.06,
  delay = 0,
  curve = "exp",
}) => {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) {
    if (curve === "exp") osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
};

/** filtered-noise helper for whooshes and ticks */
const noise = ({ dur = 0.4, gain = 0.05, delay = 0, from = 300, to = 2200, q = 1.2 }) => {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(from, t0);
  bp.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.0004, t0 + dur);
  src.connect(bp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
};

export const sfx = {
  /** call from a real user gesture to create/resume the context */
  unlock() {
    ensure();
  },
  get muted() {
    return muted;
  },
  setMuted(next) {
    muted = !!next;
    try {
      localStorage.setItem("mc:snd", muted ? "0" : "1");
    } catch (_) {}
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : 0.5, ctx.currentTime, 0.02);
    }
  },
  /** tiny UI hover blip */
  hover() {
    if (!ensure()) return;
    tone({ from: 1480, to: 1720, dur: 0.045, gain: 0.028 });
  },
  /** click / confirm tick */
  tick() {
    if (!ensure()) return;
    tone({ type: "triangle", from: 340, to: 300, dur: 0.06, gain: 0.05 });
    noise({ dur: 0.05, gain: 0.02, from: 1800, to: 2600, q: 2.2 });
  },
  /** hologram materialize blip — pitch rises with panel index */
  blip(i = 0) {
    if (!ensure()) return;
    tone({ from: 560 * (1 + i * 0.07), to: 880 * (1 + i * 0.07), dur: 0.1, gain: 0.038 });
  },
  /** boot log line tick */
  key() {
    if (!ensure()) return;
    tone({ type: "square", from: 2100, dur: 0.014, gain: 0.012 });
  },
  /** the power-on whoosh under the boot sequence */
  whoosh() {
    if (!ensure()) return;
    noise({ dur: 1.15, gain: 0.075, from: 160, to: 2600, q: 0.9 });
    tone({ from: 52, to: 176, dur: 1.2, gain: 0.07, curve: "exp" });
  },
  /** globe ignition flare */
  ignite() {
    if (!ensure()) return;
    noise({ dur: 0.7, gain: 0.09, from: 500, to: 5200, q: 0.7 });
    tone({ from: 196, to: 392, dur: 0.6, gain: 0.075 });
    tone({ from: 784, to: 1568, dur: 0.5, gain: 0.03, delay: 0.05 });
  },
  /** all-systems-nominal chime */
  chime() {
    if (!ensure()) return;
    tone({ from: 880, dur: 0.34, gain: 0.05 });
    tone({ from: 1318.5, dur: 0.42, gain: 0.04, delay: 0.09 });
    tone({ from: 1760, dur: 0.5, gain: 0.024, delay: 0.17 });
  },
};
