// Entrance animations and lazy image fade-in, both driven by one observer.
// CSS owns the animation; this only adds the class that fires it.
import { prefersReducedMotion } from "./motion.js";

const mark = (el) => el.classList.add("is-in");

export function initReveal() {
  const targets = document.querySelectorAll(".reveal, .card-shot");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach(mark);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        mark(entry.target);
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
  );

  targets.forEach((el) => io.observe(el));
}
