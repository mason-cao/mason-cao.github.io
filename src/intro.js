// Hero intro: "Hi," types in, then the name fades up.
// Slow on purpose, so it reads as a sequence rather than a flicker.

const TYPE_MS = 155; // per character
const START_MS = 500; // before the first character
const HOLD_MS = 500; // pause after typing, before the name

export function initIntro() {
  const hi = document.querySelector("[data-typed]");
  const name = document.querySelector(".hero-name");
  if (!hi || !name) return;

  const text = hi.dataset.typed || hi.textContent.trim();
  hi.textContent = "";
  hi.classList.add("is-typing");

  let i = 0;
  const step = () => {
    hi.textContent = text.slice(0, ++i);
    if (i < text.length) return window.setTimeout(step, TYPE_MS);
    window.setTimeout(() => {
      hi.classList.remove("is-typing");
      name.classList.add("is-in");
    }, HOLD_MS);
  };

  window.setTimeout(step, START_MS);
}
