document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ─────────────────────────────────────────────
  // 3. Hero intro typewriter
  //    The greeting and name resolve as one deliberate HUD boot sequence.
  // ─────────────────────────────────────────────
  const HERO_START_DELAY_MS = 420;
  const HERO_BETWEEN_LINES_MS = 280;
  const HERO_KICKER_TYPE_MS = 92;
  const HERO_TITLE_TYPE_MS = 115;
  const HERO_TYPE_HOLD_MS = 1100;
  const HERO_TYPE_FADE_MS = 420;
  const heroKicker = document.getElementById("hero-kicker");
  const heroTitle = document.getElementById("hero-title");
  const heroKickerText = heroKicker?.dataset.typewriterText;
  const heroTitleText = heroTitle?.dataset.typewriterText;

  const typeHeroLine = (element, text, characterDelay) =>
    new Promise((resolve) => {
      const characters = Array.from(text);
      let index = 0;
      element.textContent = "";
      element.classList.add("is-typing");

      const typeNext = () => {
        element.textContent = characters.slice(0, index).join("");
        index += 1;

        if (index <= characters.length) {
          window.setTimeout(typeNext, index === 1 ? 180 : characterDelay);
          return;
        }

        element.textContent = text;
        resolve();
      };

      typeNext();
    });

  if (heroKicker && heroKickerText) {
    heroKicker.textContent = heroKickerText;
  }

  if (heroTitle && heroTitleText) {
    heroTitle.textContent = heroTitleText;
  }

  if (!prefersReducedMotion && heroKicker && heroKickerText) {
    heroKicker.setAttribute("aria-label", heroKickerText);
    heroKicker.textContent = "";
    if (heroTitle && heroTitleText) {
      heroTitle.setAttribute("aria-label", heroTitleText);
      heroTitle.textContent = "";
    }

    window.setTimeout(async () => {
      await typeHeroLine(heroKicker, heroKickerText, HERO_KICKER_TYPE_MS);
      heroKicker.classList.remove("is-typing");

      if (heroTitle && heroTitleText) {
        window.setTimeout(async () => {
          heroTitle.classList.add("is-typing");
          await typeHeroLine(heroTitle, heroTitleText, HERO_TITLE_TYPE_MS);
          heroTitle.classList.add("is-type-complete");
          window.setTimeout(() => {
            heroTitle.classList.add("is-type-settling");
            window.setTimeout(() => {
              heroTitle.classList.remove("is-typing");
              heroTitle.classList.remove("is-type-settling");
            }, HERO_TYPE_FADE_MS);
          }, HERO_TYPE_HOLD_MS);
        }, HERO_BETWEEN_LINES_MS);
      }
    }, HERO_START_DELAY_MS);
  } else if (heroTitle) {
    heroTitle.classList.add("is-type-complete");
    if (heroTitle && heroTitleText) {
      heroTitle.textContent = heroTitleText;
    }
  }

  // ─────────────────────────────────────────────
  // 4. Ambient music player
  // ─────────────────────────────────────────────
  const musicPlayer = document.querySelector(".music-player");
  const audio = document.getElementById("ambient-audio");
  const playBtn = document.querySelector("[data-audio-play]");
  const playLabel = document.querySelector("[data-audio-play-label]");
  const audioStatus = document.querySelector("[data-audio-status]");

  if (musicPlayer && audio && playBtn) {
    const trackName = "Dreiton by C418";
    const missingAudioMessage = "Drop the track file to enable";
    const blockedAutoplayMessage = "Tap play to start";
    const playbackRate = 1;
    const startAtSeconds = 4 * 60;
    let hasAudioError = false;
    let hasStartedPlayback = false;
    let hasManualPlaybackStarted = false;
    let autoplayUnlockArmed = false;
    let unlockAutoplay = null;
    let playbackFadeTimer = null;

    const syncPlaybackRate = () => {
      audio.playbackRate = playbackRate;
      audio.defaultPlaybackRate = playbackRate;
    };

    const stopPlaybackFade = () => {
      if (playbackFadeTimer != null) {
        window.clearTimeout(playbackFadeTimer);
        playbackFadeTimer = null;
      }
    };

    const beginPlaybackFade = () => {
      stopPlaybackFade();
      audio.volume = 0;
      const fadeStart = Date.now();
      const fadeMs = 420;
      const step = () => {
        const progress = Math.min((Date.now() - fadeStart) / fadeMs, 1);
        audio.volume = progress;
        if (progress < 1) {
          playbackFadeTimer = window.setTimeout(step, 45);
          return;
        }
        audio.volume = 1;
        playbackFadeTimer = null;
      };
      playbackFadeTimer = window.setTimeout(step, 45);
    };

    const ensureAudible = ({ fadeIn = false } = {}) => {
      audio.muted = false;
      stopPlaybackFade();
      audio.volume = fadeIn ? 0 : 1;
    };

    const syncStartPoint = ({ force = false } = {}) => {
      if (hasStartedPlayback && !force) return;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const startTime =
        duration > 0 ? Math.min(startAtSeconds, Math.max(duration - 0.25, 0)) : startAtSeconds;
      try {
        if (force || Math.abs((audio.currentTime || 0) - startTime) > 0.2) {
          audio.currentTime = startTime;
        }
      } catch (_) {}
    };

    const syncPlaybackConfig = ({ forceStart = false, skipStart = false } = {}) => {
      audio.autoplay = false;
      audio.removeAttribute?.("autoplay");
      audio.loop = true;
      audio.preload = "auto";
      syncPlaybackRate();
      if (!skipStart) syncStartPoint({ force: forceStart || !hasStartedPlayback });
    };

    const syncPlayState = () => {
      const isPlaying = !audio.paused;
      musicPlayer.classList.toggle("is-playing", isPlaying);
      playBtn.setAttribute(
        "aria-label",
        `${isPlaying ? "Pause" : "Play"} ${trackName}`
      );
      if (playLabel) playLabel.textContent = isPlaying ? "Pause" : "Play";
      if (audioStatus) {
        audioStatus.textContent = hasAudioError
          ? missingAudioMessage
          : isPlaying
          ? "Playing local audio"
          : blockedAutoplayMessage;
      }
    };

    const restartFromBeginning = () => {
      try {
        audio.currentTime = 0;
      } catch (_) {}
    };

    const cleanupAutoplayUnlock = () => {
      if (!unlockAutoplay) return;
      document.removeEventListener("click", unlockAutoplay);
      document.removeEventListener("keydown", unlockAutoplay);
      document.removeEventListener("touchend", unlockAutoplay);
      unlockAutoplay = null;
      autoplayUnlockArmed = false;
    };

    const armAutoplayUnlock = () => {
      if (autoplayUnlockArmed) return;
      autoplayUnlockArmed = true;
      unlockAutoplay = (event) => {
        if (event?.target?.closest?.("[data-audio-play]")) return;
        cleanupAutoplayUnlock();
        syncPlaybackConfig({ forceStart: true });
        const shouldFadeIn = !hasManualPlaybackStarted;
        attemptPlay({
          forceStart: shouldFadeIn,
          fadeIn: shouldFadeIn,
          markManualStart: true,
        });
      };
      document.addEventListener("click", unlockAutoplay);
      document.addEventListener("keydown", unlockAutoplay);
      document.addEventListener("touchend", unlockAutoplay, { passive: true });
    };

    const attemptPlay = ({
      forceStart = !hasStartedPlayback,
      skipStart = false,
      fadeIn = false,
      markManualStart = false,
    } = {}) => {
      syncPlaybackConfig({ forceStart, skipStart });
      ensureAudible({ fadeIn });
      const playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.then === "function") {
        playAttempt
          .then(() => {
            cleanupAutoplayUnlock();
            hasStartedPlayback = true;
            if (markManualStart) hasManualPlaybackStarted = true;
            hasAudioError = false;
            if (fadeIn) beginPlaybackFade();
            syncPlayState();
          })
          .catch((err) => {
            stopPlaybackFade();
            hasAudioError = err?.name !== "NotAllowedError";
            if (!hasAudioError) armAutoplayUnlock();
            syncPlayState();
          });
      } else {
        hasStartedPlayback = true;
        if (markManualStart) hasManualPlaybackStarted = true;
        if (fadeIn) beginPlaybackFade();
        syncPlayState();
      }
    };

    playBtn.addEventListener("click", () => {
      if (audio.paused) {
        const shouldFadeIn = !hasManualPlaybackStarted;
        attemptPlay({
          forceStart: shouldFadeIn,
          fadeIn: shouldFadeIn,
          markManualStart: true,
        });
      } else {
        stopPlaybackFade();
        audio.pause();
        syncPlayState();
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      hasAudioError = false;
      syncPlaybackConfig({ forceStart: !hasStartedPlayback });
      syncPlayState();
    });
    audio.addEventListener("ended", () => {
      hasStartedPlayback = false;
      restartFromBeginning();
      attemptPlay({ forceStart: false, skipStart: true });
    });
    audio.addEventListener("play", () => {
      syncPlayState();
    });
    audio.addEventListener("timeupdate", () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (!hasStartedPlayback || audio.paused || duration <= startAtSeconds + 1) return;
      if (duration - audio.currentTime <= 0.35) {
        restartFromBeginning();
      }
    });
    audio.addEventListener("pause", () => {
      stopPlaybackFade();
      syncPlayState();
    });
    audio.addEventListener("error", () => {
      stopPlaybackFade();
      hasAudioError = true;
      syncPlayState();
    });

    audio.load?.();
    syncPlaybackConfig();
    syncPlayState();
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
  // Neural globe focus mode
  // ─────────────────────────────────────────────
  const globeScene = document.querySelector(".hud-scene");
  const globeCanvas = document.getElementById("globe-canvas");

  if (globeScene && globeCanvas) {
    let globePressX = 0;
    let globePressY = 0;
    let globePointerMoved = false;

    const isGlobeExpanded = () =>
      globeScene.classList.contains("is-globe-expanded");

    const syncGlobeLabel = () => {
      const expanded = isGlobeExpanded();
      globeCanvas.setAttribute("aria-expanded", expanded ? "true" : "false");
      globeCanvas.setAttribute(
        "aria-label",
        expanded ? "Interactive neural globe, focused" : "Focus interactive neural globe"
      );
    };

    const requestGlobeResize = () => {
      requestAnimationFrame(() => {
        if (typeof window.dispatchEvent === "function") {
          const resizeEvent =
            typeof Event === "function" ? new Event("resize") : { type: "resize" };
          window.dispatchEvent(resizeEvent);
        }
      });
    };

    const openGlobe = () => {
      if (isGlobeExpanded()) return;
      globeScene.classList.add("is-globe-expanded");
      document.documentElement.classList.add("globe-focus");
      syncGlobeLabel();
      requestGlobeResize();
    };

    const closeGlobe = () => {
      if (!isGlobeExpanded()) return;
      globeScene.classList.remove("is-globe-expanded");
      document.documentElement.classList.remove("globe-focus");
      syncGlobeLabel();
      requestGlobeResize();
    };

    const toggleGlobe = () => {
      if (isGlobeExpanded()) closeGlobe();
      else openGlobe();
    };

    globeScene.removeAttribute("aria-hidden");
    globeCanvas.setAttribute("role", "button");
    globeCanvas.setAttribute("tabindex", "0");
    syncGlobeLabel();

    globeCanvas.addEventListener("pointerdown", (e) => {
      globePressX = e.clientX;
      globePressY = e.clientY;
      globePointerMoved = false;
    });
    globeCanvas.addEventListener("pointermove", (e) => {
      if (Math.hypot(e.clientX - globePressX, e.clientY - globePressY) > 6) {
        globePointerMoved = true;
      }
    });
    globeCanvas.addEventListener("click", () => {
      if (globePointerMoved) {
        globePointerMoved = false;
        return;
      }
      toggleGlobe();
    });
    globeCanvas.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleGlobe();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGlobe();
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (isGlobeExpanded() && e.target !== globeCanvas) {
          closeGlobe();
        }
      },
      true
    );
  }

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
    const behavior = prefersReducedMotion ? "auto" : "smooth";

    const maxScroll = () => Math.max(0, track.scrollWidth - track.clientWidth);
    const clampIndex = (index) => Math.max(0, Math.min(index, nodes.length - 1));
    const nodeTargets = () => {
      const max = maxScroll();
      return nodes.map((node) => Math.max(0, Math.min(node.offsetLeft, max)));
    };
    const nearestNodeIndex = () => {
      const targets = nodeTargets();
      if (!targets.length) return 0;
      let closest = 0;
      let closestDistance = Infinity;
      targets.forEach((target, index) => {
        const distance = Math.abs(target - track.scrollLeft);
        if (distance < closestDistance) {
          closest = index;
          closestDistance = distance;
        }
      });
      return closest;
    };
    let activeNodeIndex = nearestNodeIndex();
    const updateArrowState = () => {
      if (prevBtn) prevBtn.disabled = activeNodeIndex <= 0;
      if (nextBtn) nextBtn.disabled = activeNodeIndex >= nodes.length - 1;
    };
    const updateProgress = (left = track.scrollLeft) => {
      const max = maxScroll();
      const p = max > 0 ? left / max : 0;
      if (progress) progress.style.width = (p * 100).toFixed(1) + "%";
    };
    const scrollToNode = (index) => {
      const targets = nodeTargets();
      if (!targets.length) return;
      const safeIndex = clampIndex(index);
      const left = targets[safeIndex];
      activeNodeIndex = safeIndex;
      updateProgress(left);
      updateArrowState();
      if (typeof track.scrollTo === "function") {
        track.scrollTo({ left, behavior });
      } else {
        track.scrollLeft = left;
      }
    };
    const moveByNode = (direction) => {
      if (!nodes.length) return;
      scrollToNode(activeNodeIndex + direction);
    };

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
      activeNodeIndex = nearestNodeIndex();
      updateProgress();
      updateArrowState();
      applyDepth();
      ticking = false;
    };
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    if (prevBtn)
      prevBtn.addEventListener("click", () => moveByNode(-1));
    if (nextBtn)
      nextBtn.addEventListener("click", () => moveByNode(1));

    track.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    track.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveByNode(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveByNode(1);
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
