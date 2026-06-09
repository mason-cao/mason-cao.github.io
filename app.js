document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ─────────────────────────────────────────────
  // 2. Live clock (Eastern time)
  // ─────────────────────────────────────────────
  const timeElement = document.getElementById("live-time");
  if (timeElement) {
    const updateTime = () => {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

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
  // 4. Number counters (count up)
  // ─────────────────────────────────────────────
  const animateCounter = (el) => {
    if (el.dataset.counted === "1") return;
    el.dataset.counted = "1";
    const target = parseFloat(el.dataset.to);
    if (Number.isNaN(target)) return;

    if (prefersReducedMotion) {
      el.textContent = target.toLocaleString();
      return;
    }

    const duration = 1100;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target.toLocaleString();
    };
    requestAnimationFrame(step);
  };

  // ─────────────────────────────────────────────
  // 5. Decode/scramble headings
  // ─────────────────────────────────────────────
  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>*+=";

  const prepareDecode = (el) => {
    // collapse the source indentation/newlines so multi-line headings
    // don't scramble in their leading whitespace as visible spaces
    const text = el.textContent.replace(/\s+/g, " ").trim();
    el.textContent = "";
    const spans = [];
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "decode-char";
      s.textContent = ch === " " ? " " : ch;
      el.appendChild(s);
      spans.push({ node: s, final: ch });
    }
    el._decodeSpans = spans;
  };

  const runDecode = (el) => {
    const spans = el._decodeSpans;
    if (!spans || el.dataset.decoded === "1") return;
    el.dataset.decoded = "1";
    if (prefersReducedMotion) return;

    el.classList.add("is-decoding");
    let settled = 0;
    spans.forEach((sp, i) => {
      if (sp.final === " ") {
        settled += 1;
        return;
      }
      let frames = 0;
      const max = 5 + Math.floor(i * 0.8);
      const iv = setInterval(() => {
        frames += 1;
        if (frames >= max) {
          clearInterval(iv);
          sp.node.textContent = sp.final;
          settled += 1;
          if (settled >= spans.length) el.classList.remove("is-decoding");
        } else {
          sp.node.textContent =
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }, 38);
    });
  };

  const decodeHeadings = document.querySelectorAll("[data-decode]");
  decodeHeadings.forEach(prepareDecode);

  // ─────────────────────────────────────────────
  // 6. Scroll reveal + trigger counters/decode
  // ─────────────────────────────────────────────
  const fadeElements = document.querySelectorAll(".fade-element");

  // run / reset decode on whichever decode headings live inside a target
  const runDecodeWithin = (el) => {
    el.querySelectorAll?.("[data-decode]").forEach?.(runDecode);
    if (el.matches?.("[data-decode]")) runDecode(el);
  };
  const resetDecodeWithin = (el) => {
    const reset = (d) => {
      if (d._decodeSpans) d.dataset.decoded = "";
    };
    el.querySelectorAll?.("[data-decode]").forEach?.(reset);
    if (el.matches?.("[data-decode]")) reset(el);
  };

  if (prefersReducedMotion) {
    fadeElements.forEach((el) => el.classList.add("visible"));
    decodeHeadings.forEach((el) => {
      el.textContent = el._decodeSpans
        ? el._decodeSpans.map((s) => s.final).join("")
        : el.textContent;
    });
  } else {
    // Bidirectional reveal: elements fade/scramble in on the way down AND
    // fade back out + re-arm on the way up, so scrolling either direction
    // feels alive ("unscroll").
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            runDecodeWithin(entry.target);
          } else {
            entry.target.classList.remove("visible");
            resetDecodeWithin(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -6% 0px", threshold: 0.12 }
    );
    fadeElements.forEach((el) => revealObserver.observe(el));
  }

  // ─────────────────────────────────────────────
  // 7. Project dossiers (accordion)
  // ─────────────────────────────────────────────
  document.querySelectorAll(".dossier").forEach((dossier) => {
    const head = dossier.querySelector(".dossier-head");
    const panel = dossier.querySelector(".dossier-body");
    if (!head || !panel) return;

    panel.removeAttribute("hidden");
    panel.setAttribute("inert", "");

    head.addEventListener("click", () => {
      const isOpen = dossier.classList.toggle("is-open");
      head.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        panel.removeAttribute("inert");
        panel
          .querySelectorAll("[data-counter]")
          .forEach(animateCounter);
      } else {
        panel.setAttribute("inert", "");
      }
    });
  });

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

  // ─────────────────────────────────────────────
  // Live atmospheric CO2 (Mauna Loa trend)
  // ─────────────────────────────────────────────
  const co2El = document.getElementById("co2-live");
  if (co2El) {
    const sparkEl = document.getElementById("co2-spark");
    const deltaEl = document.getElementById("co2-delta");
    let sparkVals = null;
    let latestText = null; // { value, approx } of the most recent reading
    let latestYoy = null;
    let hoverIdx = null; // scrubbed index, or null = show latest

    const renderCo2 = (value, approx) => {
      co2El.removeAttribute("data-pending");
      co2El.innerHTML =
        (approx ? "~" : "") + value + '<span class="unit">ppm</span>';
    };
    const renderDelta = (yoy) => {
      if (!deltaEl) return;
      const sign = yoy >= 0 ? "+" : "";
      deltaEl.innerHTML =
        '<span class="up" aria-hidden="true">▲</span>' +
        sign +
        yoy.toFixed(1) +
        ' ppm <span class="sub">vs last year</span>';
    };
    // weekly cadence → approximate calendar label for a scrubbed point
    const labelFor = (idx) => {
      const weeksAgo = sparkVals.length - 1 - idx;
      const d = new Date(Date.now() - weeksAgo * 7 * 86400000);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    };
    const renderScrub = (idx) => {
      renderCo2(sparkVals[idx].toFixed(1), false);
      if (deltaEl) {
        deltaEl.innerHTML =
          '<span class="co2-scrub-date">' + labelFor(idx) + "</span>";
      }
    };
    const restoreLatest = () => {
      if (latestText) renderCo2(latestText.value, latestText.approx);
      if (latestYoy != null) renderDelta(latestYoy);
    };
    const drawSpark = () => {
      if (!sparkEl || !sparkVals || sparkVals.length < 2) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = sparkEl.clientWidth || 220;
      const h = sparkEl.clientHeight || 42;
      sparkEl.width = Math.round(w * dpr);
      sparkEl.height = Math.round(h * dpr);
      const ctx = sparkEl.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const min = Math.min(...sparkVals);
      const max = Math.max(...sparkVals);
      const range = max - min || 1;
      const pad = 4;
      const X = (i) => pad + (i / (sparkVals.length - 1)) * (w - 2 * pad);
      const Y = (v) => h - pad - ((v - min) / range) * (h - 2 * pad);
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(56, 208, 255, 0.26)");
      grad.addColorStop(1, "rgba(56, 208, 255, 0)");
      ctx.beginPath();
      sparkVals.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
      ctx.lineTo(X(sparkVals.length - 1), h);
      ctx.lineTo(X(0), h);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      sparkVals.forEach((v, i) => (i ? ctx.lineTo(X(i), Y(v)) : ctx.moveTo(X(i), Y(v))));
      ctx.strokeStyle = "#38d0ff";
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.stroke();
      // marker rides the latest point, or the scrubbed point while hovering
      const mi = hoverIdx == null ? sparkVals.length - 1 : hoverIdx;
      const mx = X(mi);
      const my = Y(sparkVals[mi]);
      if (hoverIdx != null) {
        ctx.strokeStyle = "rgba(56, 208, 255, 0.34)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx, 0);
        ctx.lineTo(mx, h);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(mx, my, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd089";
      ctx.shadowColor = "#38d0ff";
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    fetch("https://global-warming.org/api/co2-api")
      .then((res) => {
        if (!res.ok) throw new Error("co2 request failed");
        return res.json();
      })
      .then((data) => {
        const series = data && Array.isArray(data.co2) ? data.co2 : [];
        const trend = series
          .map((d) => parseFloat(d.trend))
          .filter((n) => !Number.isNaN(n));
        if (!trend.length) throw new Error("no co2 value");
        const latest = trend[trend.length - 1];
        const yoy = latest - trend[Math.max(0, trend.length - 53)]; // ~52 weeks
        latestText = { value: latest.toFixed(1), approx: false };
        latestYoy = yoy;
        renderCo2(latestText.value, false);
        renderDelta(yoy);
        // feed the holographic globe's CO₂ gauge ring
        window.dispatchEvent(new CustomEvent("co2:update", { detail: { ppm: latest } }));
        sparkVals = trend.slice(-104); // ~2 years of weekly trend
        drawSpark();
      })
      .catch(() => {
        latestText = { value: "428", approx: true };
        latestYoy = 2.4;
        renderCo2("428", true);
        renderDelta(2.4);
        window.dispatchEvent(new CustomEvent("co2:update", { detail: { ppm: 428 } }));
        // synthetic gentle rise so the panel still reads as a trend offline
        sparkVals = Array.from(
          { length: 60 },
          (_, i) => 410 + i * 0.3 + Math.sin(i / 4) * 0.8
        );
        drawSpark();
      });

    // scrub the sparkline to read the trend at any week (mouse only; touch keeps
    // native scroll). The big readout + date label track the pointer.
    if (sparkEl) {
      const idxFromX = (clientX) => {
        const r = sparkEl.getBoundingClientRect();
        const pad = 4;
        const p = (clientX - r.left - pad) / Math.max(r.width - 2 * pad, 1);
        const n = sparkVals.length - 1;
        return Math.max(0, Math.min(n, Math.round(p * n)));
      };
      const onMove = (e) => {
        if (!sparkVals || (e.pointerType && e.pointerType !== "mouse")) return;
        hoverIdx = idxFromX(e.clientX);
        renderScrub(hoverIdx);
        drawSpark();
      };
      const onLeave = () => {
        if (hoverIdx == null) return;
        hoverIdx = null;
        restoreLatest();
        drawSpark();
      };
      sparkEl.addEventListener("pointermove", onMove);
      sparkEl.addEventListener("pointerdown", onMove);
      sparkEl.addEventListener("pointerleave", onLeave);
      sparkEl.addEventListener("pointercancel", onLeave);
    }

    let co2ResizeT = null;
    window.addEventListener("resize", () => {
      clearTimeout(co2ResizeT);
      co2ResizeT = setTimeout(drawSpark, 150);
    });
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
