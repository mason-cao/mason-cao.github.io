// ─────────────────────────────────────────────────────────────
// Jarvis HUD runtime — the boot power-on sequence + a cursor reticle.
// The scanline veil/sweep and corner-bracket frames are pure CSS; this
// file only drives the one-time boot and the pointer crosshair.
// Degrades cleanly: under prefers-reduced-motion the boot is skipped and
// no reticle is shown. Plays once per session (sessionStorage).
// ─────────────────────────────────────────────────────────────
(function initHud() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─────────────── boot sequence ───────────────
  const boot = document.getElementById("boot");
  if (boot) {
    let booted = false;
    try {
      booted = sessionStorage.getItem("booted") === "1";
    } catch (_) {}

    if (reduce || booted) {
      boot.remove(); // never let it intercept once we've seen it
    } else {
      document.body.style.overflow = "hidden"; // lock scroll during boot
      const release = () => {
        document.body.style.overflow = "";
      };

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          sessionStorage.setItem("booted", "1");
        } catch (_) {}
        release();
        boot.classList.add("is-done"); // CSS power-down flash
        setTimeout(() => boot.remove(), 680);
      };

      const lines = Array.from(boot.querySelectorAll(".boot-line"));
      const title = document.getElementById("boot-title");
      lines.forEach((ln, i) =>
        setTimeout(() => ln.classList.add("in"), 180 + i * 250)
      );
      const titleAt = 180 + lines.length * 250 + 150;
      if (title) setTimeout(() => title.classList.add("in"), titleAt);

      const auto = setTimeout(finish, titleAt + 520);

      // skip on any interaction (let Tab through for keyboard users)
      const skip = (e) => {
        if (e.type === "keydown" && (e.key === "Tab" || e.shiftKey)) return;
        clearTimeout(auto);
        finish();
        teardown();
      };
      const teardown = () => {
        window.removeEventListener("pointerdown", skip);
        window.removeEventListener("keydown", skip);
        window.removeEventListener("wheel", skip);
        window.removeEventListener("touchstart", skip);
      };
      window.addEventListener("pointerdown", skip);
      window.addEventListener("keydown", skip);
      window.addEventListener("wheel", skip, { passive: true });
      window.addEventListener("touchstart", skip, { passive: true });
      setTimeout(teardown, titleAt + 900);
    }
  }

  // ─────────────── cursor reticle ───────────────
  // a targeting halo that trails the pointer (fine pointers only)
  const reticle = document.querySelector(".hud-reticle");
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (reticle && finePointer && !reduce) {
    reticle.innerHTML =
      '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1">' +
      '<circle cx="24" cy="24" r="8.5" opacity="0.85"/>' +
      '<path d="M24 1 V11 M24 37 V47 M1 24 H11 M37 24 H47" opacity="0.6"/>' +
      '<circle cx="24" cy="24" r="1.4" fill="currentColor" stroke="none"/>' +
      "</svg>";

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let tx = x;
    let ty = y;
    let raf = null;
    let shown = false;

    const loop = () => {
      x += (tx - x) * 0.25;
      y += (ty - y) * 0.25;
      reticle.style.transform = `translate(${x}px, ${y}px)`;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.1) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    };

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType && e.pointerType !== "mouse") return;
        tx = e.clientX;
        ty = e.clientY;
        if (!shown) {
          shown = true;
          reticle.classList.add("is-on");
        }
        if (raf == null) raf = requestAnimationFrame(loop);
      },
      { passive: true }
    );
    document.addEventListener("mouseleave", () =>
      reticle.classList.remove("is-on")
    );
    document.addEventListener("mouseenter", () => {
      if (shown) reticle.classList.add("is-on");
    });
  }
})();
