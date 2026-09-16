// Counts a number up to its final value once it scrolls into view.
// Markup carries the real value in data-count so the page is correct
// before, during and after the animation:
//   <span data-count="300" data-suffix="+">300+</span>
import { prefersReducedMotion } from "./motion.js";

const render = (el, value) =>
  (el.textContent =
    (el.dataset.prefix || "") +
    Math.round(value).toLocaleString("en-US") +
    (el.dataset.suffix || ""));

function run(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;

  const duration = 900;
  const start = performance.now();

  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    // ease-out cubic; lands softly rather than stopping dead
    render(el, target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
}

export function initCountUp() {
  const els = document.querySelectorAll("[data-count]");

  // Under reduced motion the final values are simply rendered.
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => render(el, Number(el.dataset.count)));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );

  els.forEach((el) => io.observe(el));
}
