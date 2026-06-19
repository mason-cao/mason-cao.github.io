# Audio Reactive Globe Design

## Goal

Make the inner Three.js globe pulse with Dreiton by C418 when the local track is playing, without moving the decorative blue ring or canvas frame.

## Behavior

- The pulse reads live audio energy from `#ambient-audio`.
- The effect contributes only to `coreGroup.scale`, beside the existing focus and hover scale terms.
- Hover and focused globe mode suppress the audio pulse so the existing enlarge interaction stays primary.
- Paused, errored, missing, reduced-motion, or suspended audio produces no pulse.
- The pulse is smoothed so Dreiton's rhythm reads as breathing movement, not jitter.

## Architecture

`globe.js` owns the effect because it already owns the render loop and inner globe scale. It will lazily connect the page audio element to a Web Audio `AnalyserNode`, sample time-domain data each frame, estimate RMS energy, subtract a rolling noise floor, and ease the result into an `audioPulseMix`.

No CSS changes are needed. The ring remains untouched because the existing CSS frame scale is left alone.

## Testing

Static interaction tests will assert that `globe.js`:

- Finds `#ambient-audio`.
- Uses Web Audio analysis, including `createMediaElementSource`, `AnalyserNode`, and `getByteTimeDomainData`.
- Gates the pulse with `audio.paused`, hover, focus, and reduced motion.
- Adds the pulse only to `coreGroup.scale.setScalar(...)`.
