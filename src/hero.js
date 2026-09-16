// Hero: the live AQI chip and the lazily-loaded Atlanta map.
//
// Both degrade to LESS CONTENT, never to a broken or loading state. A
// school network that blocks both still renders a complete hero: the
// static still stays, the chip stays hidden.
const HOME = { lat: 34.0515, lon: -84.0713 }; // Suwanee, GA
const ZOOM = 8.3;

/* ── Live AQI ──────────────────────────────────────────────────────── */

// EPA breakpoints. The dot's colour is the page's only non-monochrome
// element that isn't derived from a screenshot.
const BANDS = [
  [50, "Good", "var(--color-aqi-good)"],
  [100, "Moderate", "var(--color-aqi-moderate)"],
  [150, "Unhealthy for some", "var(--color-aqi-usg)"],
  [200, "Unhealthy", "var(--color-aqi-unhealthy)"],
  [300, "Very unhealthy", "var(--color-aqi-very)"],
  [Infinity, "Hazardous", "var(--color-aqi-hazardous)"],
];

const band = (aqi) => BANDS.find(([max]) => aqi <= max);

async function initAqi() {
  const chip = document.querySelector("[data-aqi]");
  if (!chip) return;

  const url =
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${HOME.lat}&longitude=${HOME.lon}` +
    "&current=us_aqi&timezone=America%2FNew_York";

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return;

    const aqi = (await res.json())?.current?.us_aqi;
    if (!Number.isFinite(aqi)) return;

    const [, label, color] = band(aqi);
    chip.querySelector("[data-aqi-dot]").style.background = color;
    chip.querySelector("[data-aqi-value]").textContent = String(Math.round(aqi));
    chip.querySelector("[data-aqi-label]").textContent = label;
    chip.setAttribute(
      "aria-label",
      `Air quality index ${Math.round(aqi)}, ${label}, metro Atlanta, live`
    );
    chip.hidden = false;
  } catch {
    /* chip stays hidden : no spinner, no error text */
  }
}

/* ── Map ───────────────────────────────────────────────────────────── */

// Our own style against OpenFreeMap's vector tiles, rather than one of
// their prebuilt styles: total control over the look, and no dependency
// on a third party's styling staying put.
const STYLE = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    ofm: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
    home: {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [HOME.lon, HOME.lat] },
        properties: {},
      },
    },
  },
  layers: [
    { id: "bg", type: "background", paint: { "background-color": "#202024" } },
    {
      id: "water",
      type: "fill",
      source: "ofm",
      "source-layer": "water",
      paint: { "fill-color": "#1b2a36" },
    },
    {
      id: "roads",
      type: "line",
      source: "ofm",
      "source-layer": "transportation",
      filter: ["in", "class", "motorway", "trunk", "primary", "secondary"],
      paint: {
        "line-color": "rgba(255,255,255,0.22)",
        "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 12, 1.8],
      },
    },
    {
      id: "places",
      type: "symbol",
      source: "ofm",
      "source-layer": "place",
      filter: ["in", "class", "city", "town"],
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 7, 10.5, 11, 13],
        "text-max-width": 8,
      },
      paint: {
        "text-color": "rgba(255,255,255,0.66)",
        "text-halo-color": "rgba(0,0,0,0.8)",
        "text-halo-width": 1,
      },
    },
    {
      id: "home-glow",
      type: "circle",
      source: "home",
      paint: {
        "circle-radius": 13,
        "circle-color": "#38bdf8",
        "circle-opacity": 0.14,
      },
    },
    {
      id: "home-dot",
      type: "circle",
      source: "home",
      paint: {
        "circle-radius": 4,
        "circle-color": "#38bdf8",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(0,0,0,0.6)",
      },
    },
  ],
};

async function initMap() {
  const mount = document.getElementById("hero-map");
  if (!mount) return;

  // Not worth ~250KB on a phone, where the still tells the whole story.
  if (window.matchMedia("(max-width: 640px)").matches) return;
  if (!window.matchMedia("(hover: hover)").matches) return;

  // The hero is the first thing on the page and is always in view on load,
  // so there is nothing to observe for. Waiting on an IntersectionObserver
  // here deadlocked in dev, where Vite injects CSS after the module runs
  // and the container is briefly 0x0 : a zero-area element never reports
  // as intersecting. Yielding past first paint is all that is wanted.
  await new Promise((resolve) =>
    ("requestIdleCallback" in window
      ? requestIdleCallback(resolve, { timeout: 1200 })
      : setTimeout(resolve, 200))
  );

  try {
    // Dynamic import keeps maplibre off the critical path entirely.
    const { Map } = await import("maplibre-gl");
    await import("maplibre-gl/dist/maplibre-gl.css");

    const map = new Map({
      container: mount,
      style: STYLE,
      center: [-84.1, 33.98],
      // starts pulled back and eases in on load; see reveal() below
      zoom: ZOOM - 1.15,
      attributionControl: false,
      interactive: false, // decorative; the page scrolls over it
      // WebGL discards its drawing buffer after each frame, so the canvas
      // reads back black. Only scripts/capture-map-still.mjs needs a
      // readable buffer, and it costs performance, so it is opt-in.
      preserveDrawingBuffer: new URLSearchParams(location.search).has("still"),
    });

    // exposed only for scripts/capture-map-still.mjs
    if (new URLSearchParams(location.search).has("still")) window.__mcMap = map;

    let zoomed = false;
    const reveal = () => {
      mount.classList.add("is-ready");
      if (zoomed) return;
      zoomed = true;
      // the map arrives pulled back and eases in, so the hero has motion
      // without anything looping
      map.easeTo({ zoom: ZOOM, duration: 2800, essential: false });
    };

    // "load" is the ideal signal, but it waits on a first complete render
    // and does not fire under software GL (headless Chromium/SwiftShader).
    // "idle" covers the normal case; the timer is a floor so a slow tile
    // never strands the hero on the still. All three are idempotent, and
    // the still underneath is rendered from this same style, so revealing
    // slightly early is invisible.
    map.on("load", reveal);
    map.once("idle", reveal);
    map.once("styledata", () => setTimeout(reveal, 1500));

    // Tile hiccups are expected on flaky networks and must stay silent.
    map.on("error", () => {});
  } catch {
    /* the still simply stays */
  }
}

export function initHero() {
  initAqi();
  initMap();
}
