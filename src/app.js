// Credential proof viewer and the live GitHub numbers.
//
// The proof viewer is a single native <dialog> reused by every credential
// row. Native <dialog> gives focus trapping, Escape-to-close, inerting of
// the background and focus restoration for free : v2 hand-rolled all four
// in ~70 lines.

/* ── Proof viewer ──────────────────────────────────────────────────── */

function initProofViewer() {
  const dialog = document.getElementById("proof");
  if (!dialog) return;

  const field = (name) => dialog.querySelector(`[data-proof-${name}]`);
  const title = field("title");
  const meta = field("meta");
  const img = field("img");
  const gallery = field("gallery");
  const caption = field("caption");
  const doc = field("doc");

  document.querySelectorAll("[data-cred]").forEach((row) => {
    row.addEventListener("click", () => {
      const d = row.dataset;

      title.textContent = d.credTitle || "";
      meta.textContent = d.credMeta || "";
      caption.textContent = d.credCaption || "";
      img.src = d.credImg || "";
      img.alt = d.credAlt || "";

      const slides = document.getElementById(d.credGallery || "");
      const hasSlides = slides instanceof HTMLTemplateElement;
      gallery.replaceChildren();
      if (hasSlides) gallery.append(slides.content.cloneNode(true));
      gallery.hidden = !hasSlides;
      img.hidden = hasSlides;
      dialog.classList.toggle("has-slides", hasSlides);

      if (d.credDoc) {
        doc.href = d.credDoc;
        doc.textContent = d.credDocLabel || "Open the document";
        doc.hidden = false;
      } else {
        doc.hidden = true;
        doc.removeAttribute("href");
      }

      dialog.showModal();
      dialog.scrollTop = 0;
    });
  });

  dialog
    .querySelector("[data-proof-close]")
    ?.addEventListener("click", () => dialog.close());

  // Click outside the content to dismiss.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
}

/* ── Live GitHub numbers ───────────────────────────────────────────── */

// Unauthenticated, 60 requests/hour per IP. On any failure the sentence
// still reads : it just loses its numbers.
async function initGithub() {
  const slots = document.querySelectorAll("[data-gh]");
  if (!slots.length) return;

  try {
    const res = await fetch("https://api.github.com/users/mason-cao", {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return;

    const data = await res.json();
    const values = {
      repos: data.public_repos,
      followers: data.followers,
    };

    slots.forEach((el) => {
      const value = values[el.dataset.gh];
      if (!Number.isFinite(value)) return;
      el.dataset.count = String(value);
      el.textContent = String(value);
      el.closest("[data-gh-wrap]")?.removeAttribute("hidden");
    });
  } catch {
    /* numbers omitted; prose unchanged */
  }
}

/* ── Project row ───────────────────────────────────────────────────── */

// The row stays inside the text column and is moved by the arrows, so the
// section never overflows its boundary.
function initProjectRow() {
  const row = document.querySelector("[data-project-row]");
  const arrows = document.querySelectorAll("[data-row-scroll]");
  if (!row || !arrows.length) return;

  const sync = () => {
    const max = row.scrollWidth - row.clientWidth - 1;
    arrows.forEach((b) => {
      const back = Number(b.dataset.rowScroll) < 0;
      b.disabled = back ? row.scrollLeft <= 0 : row.scrollLeft >= max;
    });
  };

  arrows.forEach((b) =>
    b.addEventListener("click", () => {
      const card = row.querySelector(".card");
      const step = card ? card.offsetWidth + 14 : row.clientWidth * 0.8;
      row.scrollBy({ left: step * Number(b.dataset.rowScroll), behavior: "smooth" });
    })
  );

  row.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  sync();
}

/* ── Section nav ───────────────────────────────────────────────────── */

function initSectionNav() {
  const nav = document.querySelector(".secnav");
  const links = Array.from(document.querySelectorAll(".secnav a"));
  if (!nav || !links.length) return;

  // The bar appears while scrolling and retires on its own once you stop.
  let hideTimer;
  const show = () => {
    if (window.scrollY > 40) nav.classList.add("is-visible");
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => nav.classList.remove("is-visible"), 1600);
  };
  window.addEventListener("scroll", show, { passive: true });
  nav.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
  nav.addEventListener("pointerleave", show);

  const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const mark = (id) => {
    links.forEach((a) => a.removeAttribute("aria-current"));
    byId.get(id)?.setAttribute("aria-current", "true");
  };

  // Position-based rather than an IntersectionObserver band: the last
  // sections are short and sit at the end of the document, so a band in the
  // middle of the viewport never reached them and they never lit up.
  // A click pins its target until the reader scrolls themselves. Without
  // this, clicking a section near the end of the page bottoms out the
  // scroll and the "at end" rule below immediately steals the highlight.
  let pinned = null;

  const update = () => {
    if (pinned) return;
    const line = window.scrollY + window.innerHeight * 0.36;
    let current = sections[0];
    for (const sec of sections) if (sec.offsetTop <= line) current = sec;
    // once the page bottoms out, the final section is the one being read
    const atEnd =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 4;
    if (atEnd) current = sections[sections.length - 1];
    if (current) mark(current.id);
  };

  // Clicking should light the target immediately, not wait for the scroll.
  links.forEach((a) =>
    a.addEventListener("click", () => {
      pinned = a.getAttribute("href").slice(1);
      mark(pinned);
      show();
    })
  );

  const unpin = () => {
    pinned = null;
  };
  window.addEventListener("wheel", unpin, { passive: true });
  window.addEventListener("touchmove", unpin, { passive: true });
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) unpin();
  });

  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
}

export function initApp() {
  initProofViewer();
  initGithub();
  initProjectRow();
  initSectionNav();
}
