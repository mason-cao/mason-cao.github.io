document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ─────────────────────────────────────────────
  // 3. Hero kicker typewriter ("Hi, I'm")
  //    The name renders as plain styled text; this just types the small
  //    kicker line above it. The living 3D background (globe + neural net +
  //    Lorenz) lives in the holographic scene, not in the hero.
  // ─────────────────────────────────────────────
  const heroKicker = document.getElementById("hero-kicker");
  const heroKickerText = heroKicker?.dataset.typewriterText;

  if (heroKicker && heroKickerText) {
    heroKicker.textContent = heroKickerText;

    if (!prefersReducedMotion) {
      const characters = Array.from(heroKickerText);
      let index = 0;
      heroKicker.textContent = "";

      const typeNext = () => {
        heroKicker.textContent = characters.slice(0, index).join("");
        index += 1;
        if (index <= characters.length) {
          window.setTimeout(typeNext, index === 1 ? 260 : 70);
        } else {
          heroKicker.textContent = heroKickerText;
        }
      };
      window.setTimeout(typeNext, 360);
    }
  }

  // ─────────────────────────────────────────────
  // 9. Modals (contact + play log)
  // ─────────────────────────────────────────────
  const modalFocusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const setupModal = ({ openBtnId, modalId, boxId, backdropId, closeBtnId }) => {
    const openBtn = openBtnId ? document.getElementById(openBtnId) : null;
    const modal = document.getElementById(modalId);
    const box = document.getElementById(boxId);
    const backdrop = document.getElementById(backdropId);
    const closeBtn = document.getElementById(closeBtnId);
    if (!modal || !box) return null;

    let lastFocusedElement = null;

    const open = (e) => {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      lastFocusedElement = document.activeElement;
      modal.setAttribute("aria-hidden", "false");
      modal.removeAttribute("inert");
      modal.classList.remove("opacity-0", "pointer-events-none");
      box.classList.remove("scale-95");
      box.classList.add("scale-100");
      document.body.style.overflow = "hidden";
      if (openBtn) openBtn.classList.add("active");
      requestAnimationFrame(() => {
        if (closeBtn) closeBtn.focus();
      });
    };

    const close = () => {
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("inert", "");
      modal.classList.add("opacity-0", "pointer-events-none");
      box.classList.remove("scale-100");
      box.classList.add("scale-95");
      document.body.style.overflow = "";
      if (openBtn) openBtn.classList.remove("active");
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    };

    const trapFocus = (e) => {
      const focusable = Array.from(
        modal.querySelectorAll(modalFocusableSelector)
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    const handleKeydown = (e) => {
      if (modal.getAttribute("aria-hidden") === "true") return;
      if (e.key === "Escape") close();
      else if (e.key === "Tab") trapFocus(e);
    };

    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", handleKeydown);

    return { open, close };
  };

  // Contact has no on-page trigger anymore; it is opened from the menu.
  const contactModal = setupModal({
    modalId: "contact-modal",
    boxId: "contact-box",
    backdropId: "contact-backdrop",
    closeBtnId: "close-modal-btn"
  });

  setupModal({
    openBtnId: "open-achievements-btn",
    modalId: "achievements-modal",
    boxId: "achievements-box",
    backdropId: "achievements-backdrop",
    closeBtnId: "close-achievements-btn"
  });

  // The tech stack is now a draggable logo sphere; see constellation.js.

  // ─────────────────────────────────────────────
  // 11. Live GitHub signal log
  // ─────────────────────────────────────────────
  const ghFeed = document.getElementById("gh-feed");
  const ghFoot = document.getElementById("gh-foot");

  if (ghFeed) {
    const USER = "mason-cao";

    const relTime = (iso) => {
      const diff = (Date.now() - new Date(iso).getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
      return `${Math.floor(diff / 604800)}w ago`;
    };

    const shortRepo = (full) => (full || "").split("/").slice(1).join("/");

    const describe = (ev) => {
      const repo = shortRepo(ev.repo?.name);
      switch (ev.type) {
        case "PushEvent": {
          const n = ev.payload?.commits?.length || ev.payload?.size || 1;
          return { action: "push", repo, detail: `${n} commit${n > 1 ? "s" : ""}` };
        }
        case "CreateEvent":
          return { action: "create", repo, detail: ev.payload?.ref_type || "" };
        case "PullRequestEvent":
          return { action: "PR", repo, detail: ev.payload?.action || "" };
        case "IssuesEvent":
          return { action: "issue", repo, detail: ev.payload?.action || "" };
        case "ReleaseEvent":
          return { action: "release", repo, detail: ev.payload?.release?.tag_name || "" };
        case "WatchEvent":
          return { action: "star", repo, detail: "" };
        case "ForkEvent":
          return { action: "fork", repo, detail: "" };
        case "DeleteEvent":
          return { action: "delete", repo, detail: ev.payload?.ref_type || "" };
        default:
          return { action: (ev.type || "event").replace("Event", "").toLowerCase(), repo, detail: "" };
      }
    };

    const escapeHtml = (s) =>
      String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
      );

    const rowHtml = (action, repo, when, detail) => `
      <li class="signal-row">
        <span class="signal-action">${escapeHtml(action)}</span>
        <span class="signal-repo"><b>${USER}/</b>${escapeHtml(repo)}${
      detail ? ` <span style="color:var(--accent-deep)">· ${escapeHtml(detail)}</span>` : ""
    }</span>
        <span class="signal-when">${escapeHtml(when)}</span>
      </li>`;

    const renderFallback = () => {
      const repos = [
        ["repo", "aeris", "active"],
        ["repo", "multi-agent-customer-intelligence-dashboard", "live"],
        ["repo", "freshtrack", "live"]
      ];
      ghFeed.innerHTML = repos
        .map(([a, r, w]) => rowHtml(a, r, w, ""))
        .join("");
      if (ghFoot) {
        ghFoot.innerHTML =
          'live feed rate-limited, browse on <a href="https://github.com/mason-cao" target="_blank" rel="noopener noreferrer">github.com/mason-cao</a>';
      }
    };

    const load = async () => {
      try {
        const [userRes, eventsRes] = await Promise.all([
          fetch(`https://api.github.com/users/${USER}`),
          fetch(`https://api.github.com/users/${USER}/events/public?per_page=30`)
        ]);
        if (!userRes.ok || !eventsRes.ok) throw new Error("github request failed");

        const user = await userRes.json();
        const events = await eventsRes.json();

        const repoEl = document.getElementById("gh-repos");
        const followEl = document.getElementById("gh-followers");
        if (repoEl) repoEl.textContent = user.public_repos ?? "…";
        if (followEl) followEl.textContent = user.followers ?? "…";

        const rows = (Array.isArray(events) ? events : [])
          .map((ev) => ({ ...describe(ev), when: relTime(ev.created_at) }))
          .filter((r) => r.repo)
          .slice(0, 3);

        if (!rows.length) throw new Error("no events");

        ghFeed.innerHTML = rows
          .map((r) => rowHtml(r.action, r.repo, r.when, r.detail))
          .join("");
        if (ghFoot) {
          ghFoot.innerHTML =
            'live from the GitHub API · <a href="https://github.com/mason-cao" target="_blank" rel="noopener noreferrer">github.com/mason-cao</a>';
        }
      } catch (err) {
        renderFallback();
      }
    };

    load();
  }

  // Card tilt + cursor spotlight removed: Now/Projects are no longer cards but
  // open rows suspended in the field, so per-item 3D tilt no longer applies.

  // ─────────────────────────────────────────────
  // Life timeline (drag / arrows / keyboard)
  // ─────────────────────────────────────────────
  document.querySelectorAll("[data-timeline]").forEach((tl) => {
    const track = tl.querySelector("[data-timeline-track]");
    if (!track) return;
    const prevBtn = tl.querySelector("[data-timeline-prev]");
    const nextBtn = tl.querySelector("[data-timeline-next]");
    const progress = tl.querySelector("[data-timeline-progress]");
    const nodes = Array.from(track.querySelectorAll(".timeline-node"));
    const firstNode = nodes[0];
    const stepWidth = firstNode
      ? firstNode.getBoundingClientRect().width
      : 240;
    const behavior = prefersReducedMotion ? "auto" : "smooth";

    // coverflow-style depth: nodes recede + rotate as they leave centre
    const applyDepth = () => {
      if (prefersReducedMotion) return;
      const tr = track.getBoundingClientRect();
      const cx = tr.left + tr.width / 2;
      for (const node of nodes) {
        const r = node.getBoundingClientRect();
        const d = Math.max(-1, Math.min(1, ((r.left + r.width / 2) - cx) / (tr.width * 0.62)));
        const ry = -d * 22;
        const scale = 1 - Math.min(Math.abs(d) * 0.16, 0.2);
        node.style.transform =
          "perspective(1100px) rotateY(" + ry.toFixed(2) + "deg) scale(" + scale.toFixed(3) + ")";
        node.style.opacity = (1 - Math.min(Math.abs(d) * 0.55, 0.55)).toFixed(3);
      }
    };

    let ticking = false;
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      if (progress) progress.style.width = (p * 100).toFixed(1) + "%";
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 2;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= max - 2;
      applyDepth();
      ticking = false;
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    if (prevBtn)
      prevBtn.addEventListener("click", () =>
        track.scrollBy({ left: -stepWidth * 1.5, behavior })
      );
    if (nextBtn)
      nextBtn.addEventListener("click", () =>
        track.scrollBy({ left: stepWidth * 1.5, behavior })
      );

    track.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        track.scrollBy({ left: -stepWidth, behavior });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        track.scrollBy({ left: stepWidth, behavior });
      }
    });

    // drag-to-scroll (mouse)
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let moved = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add("is-dragging");
      try {
        track.setPointerCapture(e.pointerId);
      } catch (_) {}
    });
    track.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startLeft - dx;
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove("is-dragging");
      try {
        track.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    // swallow the click that ends a drag so it doesn't select/jump
    track.addEventListener(
      "click",
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true
    );

    update();
  });

  // The atmospheric depth is carried by the fixed holographic scene behind
  // the cockpit — the neural globe (globe.js) — plus the static CSS nebula
  // in style.css.

  // ─────────────────────────────────────────────
  // Console greeting for fellow developers
  // ─────────────────────────────────────────────
  try {
    const t = "color:#38d0ff;font:700 20px 'Space Grotesk',system-ui,sans-serif";
    const b = "color:#c4cdda;font:400 13px/1.6 ui-monospace,monospace";
    const d = "color:#6e7886;font:400 12px ui-monospace,monospace";
    console.log("%cMason Cao", t);
    console.log(
      "%cI build environmental-intelligence systems, multi-agent AI, and full-stack tools.",
      b
    );
    console.log(
      "%cPoking around the source? Reach me at masoncao7@gmail.com · github.com/mason-cao",
      d
    );
  } catch (err) {
    /* console styling unsupported */
  }
});
