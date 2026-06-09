// ─────────────────────────────────────────────────────────────
// Jarvis HUD runtime — the boot power-on sequence.
// The scanline veil/sweep and corner-bracket frames are pure CSS; this
// file only drives the one-time boot animation.
// Degrades cleanly: under prefers-reduced-motion the boot is skipped.
// Plays once per session (sessionStorage).
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

})();
