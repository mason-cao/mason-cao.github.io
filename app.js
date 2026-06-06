document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // ─────────────────────────────────────────────
  // 1. Map (Leaflet): observatory background
  // ─────────────────────────────────────────────
  const mapContainer = document.getElementById("background-map");
  const mapWrapper = document.getElementById("map-wrapper");

  if (mapContainer && typeof L !== "undefined") {
    const homeCoordinates = [34.0515, -84.0714];

    // Start already centered on home at a mid zoom so tiles for the final
    // view begin loading immediately. The old version flew from zoom 5 to
    // ~12 with tile updates suspended, so the map blanked to the dark
    // container ("black screen") until idle fired at the end.
    const map = L.map("background-map", {
      center: homeCoordinates,
      zoom: 10,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true
    });

    const tiles = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        keepBuffer: 8,
        updateWhenZooming: true,
        updateWhenIdle: false
      }
    ).addTo(map);

    const revealMap = () => {
      if (!mapWrapper || mapWrapper.dataset.revealed === "1") return;
      mapWrapper.dataset.revealed = "1";
      mapWrapper.classList.remove("opacity-0");
      mapWrapper.classList.add("opacity-100");
    };

    map.whenReady(() => map.invalidateSize());

    // Only fade the map in once the first screen of tiles has painted, so
    // the empty container is never visible. Safety timeout covers a missed
    // load event.
    tiles.once("load", revealMap);
    setTimeout(revealMap, 1400);

    if (prefersReducedMotion) {
      map.setView(homeCoordinates, 12);
    } else {
      // Gentle, short settle (zoom 10 -> 12). The small delta plus live
      // tile updates means the basemap stays painted the whole way.
      setTimeout(() => {
        map.invalidateSize();
        map.flyTo(homeCoordinates, 12, {
          animate: true,
          duration: 3.4,
          easeLinearity: 0.25
        });
        setTimeout(() => {
          if (mapWrapper) mapWrapper.classList.add("animate-map-zoom");
        }, 3800);
      }, 700);
    }
  }

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
  // 3. Hero typewriter
  // ─────────────────────────────────────────────
  const heroTitle = document.getElementById("hero-title");
  const heroTitleText = heroTitle?.dataset.typewriterText;

  if (heroTitle && heroTitleText) {
    heroTitle.textContent = heroTitleText;

    if (!prefersReducedMotion) {
      const characters = Array.from(heroTitleText);
      let index = 0;
      heroTitle.textContent = "";
      heroTitle.classList.add("is-typing");

      const typeNext = () => {
        heroTitle.textContent = characters.slice(0, index).join("");
        index += 1;
        if (index <= characters.length) {
          window.setTimeout(typeNext, index === 1 ? 260 : 52);
        } else {
          heroTitle.textContent = heroTitleText;
          window.setTimeout(() => heroTitle.classList.remove("is-typing"), 850);
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
  // 8. Scroll progress (top hairline)
  // ─────────────────────────────────────────────
  const progressBar = document.getElementById("scroll-progress-bar");
  if (progressBar) {
    let progressTicking = false;

    const updateProgress = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      progressBar.style.transform = `scaleX(${p})`;
      progressTicking = false;
    };

    const requestProgress = () => {
      if (progressTicking) return;
      progressTicking = true;
      requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", requestProgress, { passive: true });
    window.addEventListener("resize", requestProgress);
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

  // The tech stack is now a 3D constellation; see constellation3d.js.

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
        ["repo", "freshtrack", "live"],
        ["repo", "detox", "preview"]
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
          .slice(0, 6);

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
    const renderCo2 = (value, approx) => {
      co2El.removeAttribute("data-pending");
      co2El.innerHTML =
        (approx ? "~" : "") + value + '<span class="unit">ppm</span>';
    };
    fetch("https://global-warming.org/api/co2-api")
      .then((res) => {
        if (!res.ok) throw new Error("co2 request failed");
        return res.json();
      })
      .then((data) => {
        const series = data && Array.isArray(data.co2) ? data.co2 : [];
        const latest = series[series.length - 1] || {};
        const ppm = parseFloat(latest.trend || latest.cycle);
        if (Number.isNaN(ppm)) throw new Error("no co2 value");
        renderCo2(ppm.toFixed(1), false);
      })
      .catch(() => renderCo2("428", true));
  }

  // ─────────────────────────────────────────────
  // Command palette (⌘K)
  // ─────────────────────────────────────────────
  const palette = document.getElementById("command-palette");
  const cmdkInput = document.getElementById("cmdk-input");
  const cmdkList = document.getElementById("cmdk-list");
  const cmdkEmpty = document.getElementById("cmdk-empty");

  if (palette && cmdkInput && cmdkList) {
    const reduce = prefersReducedMotion;
    const svg = (d, vb) =>
      `<svg viewBox="${vb || "0 0 20 20"}" fill="currentColor" aria-hidden="true">${d}</svg>`;
    const navGlyph = svg(
      '<path d="M10 3.2 2.8 9v6.3A1.5 1.5 0 0 0 4.3 16.8H7.6v-3.6h4.8v3.6h3.3a1.5 1.5 0 0 0 1.5-1.5V9L10 3.2Z"/>'
    );
    const repoGlyph = svg(
      '<path fill-rule="evenodd" d="M10 1.6a8.4 8.4 0 0 0-2.66 16.37c.42.08.57-.18.57-.4v-1.42c-2.34.5-2.83-1.13-2.83-1.13-.38-.97-.93-1.23-.93-1.23-.76-.52.06-.51.06-.51.84.06 1.29.87 1.29.87.75 1.29 1.96.92 2.44.7.07-.55.29-.92.53-1.12-1.87-.21-3.83-.93-3.83-4.15 0-.92.33-1.66.86-2.25-.09-.21-.37-1.06.08-2.2 0 0 .7-.23 2.28.85a7.8 7.8 0 0 1 4.15 0c1.58-1.08 2.27-.85 2.27-.85.46 1.14.17 2 .09 2.2.54.59.86 1.33.86 2.25 0 3.23-1.97 3.94-3.84 4.14.3.26.57.78.57 1.57v2.31c0 .22.15.49.58.4A8.4 8.4 0 0 0 10 1.6Z" clip-rule="evenodd"/>'
    );
    const mailGlyph = svg(
      '<path d="M3 4.4h14a1 1 0 0 1 1 1v.3l-8 4.55-8-4.55v-.3a1 1 0 0 1 1-1Zm15 2.95v7.25a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.35l8 4.55 8-4.55Z"/>'
    );

    const scrollToId = (id) => () => {
      const el = document.querySelector(id);
      if (el)
        el.scrollIntoView({
          behavior: reduce ? "auto" : "smooth",
          block: "start"
        });
    };
    const openUrl = (url) => () => window.open(url, "_blank", "noopener,noreferrer");
    const copyEmail = () => {
      if (navigator.clipboard)
        navigator.clipboard.writeText("masoncao7@gmail.com").catch(() => {});
    };
    const openContact = () => {
      if (contactModal) contactModal.open();
    };

    const commands = [
      { group: "Navigate", title: "Now", hint: "Research and what I'm building", icon: navGlyph, keys: "now current research tess aeris", run: scrollToId("#now") },
      { group: "Navigate", title: "Selected work", hint: "Projects", icon: navGlyph, keys: "work projects portfolio selected", run: scrollToId("#projects") },
      { group: "Navigate", title: "Signal log", hint: "Live GitHub activity", icon: navGlyph, keys: "signal github activity log live", run: scrollToId("#signal") },
      { group: "Navigate", title: "Stack & credentials", hint: "Tools and coursework", icon: navGlyph, keys: "stack skills tech tools credentials coursework", run: scrollToId("#stack") },
      { group: "Navigate", title: "Life so far", hint: "A timeline of moments", icon: navGlyph, keys: "life timeline history journey moments story", run: scrollToId("#life") },
      { group: "Navigate", title: "Off the clock", hint: "Games and the rest", icon: navGlyph, keys: "play games off the clock fun", run: scrollToId("#play") },
      { group: "Projects", title: "AERIS", hint: "Environmental intelligence platform", icon: repoGlyph, keys: "aeris climate anomaly", run: openUrl("https://github.com/mason-cao/aeris") },
      { group: "Projects", title: "Multi-Agent Intelligence", hint: "Explainable ML dashboard", icon: repoGlyph, keys: "multi agent nova core dashboard shap", run: openUrl("https://github.com/mason-cao/multi-agent-customer-intelligence-dashboard") },
      { group: "Projects", title: "FreshTrack", hint: "Food-waste tracker", icon: repoGlyph, keys: "freshtrack food waste pantry", run: openUrl("https://github.com/mason-cao/freshtrack") },
      { group: "Projects", title: "deTox", hint: "Focus and screen-time app", icon: repoGlyph, keys: "detox focus screen time mac", run: openUrl("https://github.com/mason-cao/detox") },
      { group: "Actions", title: "Copy email", hint: "masoncao7@gmail.com", icon: mailGlyph, keys: "email copy contact reach", run: copyEmail },
      { group: "Actions", title: "Open GitHub", hint: "@mason-cao", icon: repoGlyph, keys: "github profile open", run: openUrl("https://github.com/mason-cao") },
      { group: "Actions", title: "Contact card", hint: "Email and links", icon: mailGlyph, keys: "contact email links reach", run: openContact }
    ];

    let filtered = commands.slice();
    let selected = 0;
    let lastFocused = null;

    const sync = () => {
      const items = cmdkList.querySelectorAll(".cmdk-item");
      items.forEach((el, i) => {
        const active = i === selected;
        el.setAttribute("aria-selected", active ? "true" : "false");
        if (active) {
          cmdkInput.setAttribute("aria-activedescendant", el.id);
          el.scrollIntoView({ block: "nearest" });
        }
      });
    };

    const render = () => {
      cmdkList.innerHTML = "";
      if (!filtered.length) {
        cmdkEmpty.hidden = false;
        cmdkInput.removeAttribute("aria-activedescendant");
        return;
      }
      cmdkEmpty.hidden = true;
      let lastGroup = null;
      filtered.forEach((cmd, i) => {
        if (cmd.group !== lastGroup) {
          const lab = document.createElement("li");
          lab.className = "cmdk-group-label";
          lab.setAttribute("role", "presentation");
          lab.textContent = cmd.group;
          cmdkList.appendChild(lab);
          lastGroup = cmd.group;
        }
        const li = document.createElement("li");
        li.className = "cmdk-item";
        li.id = "cmdk-item-" + i;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === selected ? "true" : "false");
        li.innerHTML =
          '<span class="cmdk-item-icon">' + cmd.icon + "</span>" +
          '<span class="cmdk-item-body"><span class="cmdk-item-title">' +
          cmd.title +
          "</span>" +
          (cmd.hint ? '<span class="cmdk-item-hint">' + cmd.hint + "</span>" : "") +
          "</span>";
        li.addEventListener("mousemove", () => {
          if (selected !== i) {
            selected = i;
            sync();
          }
        });
        li.addEventListener("click", () => execute(i));
        cmdkList.appendChild(li);
      });
      sync();
    };

    const filter = (q) => {
      const query = q.trim().toLowerCase();
      filtered = query
        ? commands.filter((c) =>
            (c.title + " " + c.hint + " " + c.keys + " " + c.group)
              .toLowerCase()
              .includes(query)
          )
        : commands.slice();
      selected = 0;
      render();
    };

    const move = (delta) => {
      if (!filtered.length) return;
      selected = (selected + delta + filtered.length) % filtered.length;
      sync();
    };

    const isOpen = () => palette.classList.contains("is-open");

    const execute = (i) => {
      const cmd = filtered[i];
      if (!cmd) return;
      close();
      window.setTimeout(cmd.run, reduce ? 0 : 120);
    };

    const open = () => {
      if (isOpen()) return;
      lastFocused = document.activeElement;
      palette.hidden = false;
      void palette.offsetWidth;
      palette.classList.add("is-open");
      document.body.style.overflow = "hidden";
      cmdkInput.value = "";
      filter("");
      cmdkInput.focus();
    };

    const close = () => {
      if (!isOpen()) return;
      palette.classList.remove("is-open");
      document.body.style.overflow = "";
      if (reduce) palette.hidden = true;
      else
        window.setTimeout(() => {
          if (!isOpen()) palette.hidden = true;
        }, 260);
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    };

    cmdkInput.addEventListener("input", (e) => filter(e.target.value));
    cmdkInput.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        execute(selected);
      } else if (e.key === "Home") {
        e.preventDefault();
        selected = 0;
        sync();
      } else if (e.key === "End") {
        e.preventDefault();
        selected = filtered.length - 1;
        sync();
      }
    });
    palette.addEventListener("click", (e) => {
      if (e.target.closest("[data-cmdk-close]")) close();
    });

    const triggerBtn = document.getElementById("open-cmdk-btn");
    if (triggerBtn) triggerBtn.addEventListener("click", open);

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        isOpen() ? close() : open();
      } else if (e.key === "Escape" && isOpen()) {
        e.preventDefault();
        close();
      } else if (e.key === "/" && !isOpen()) {
        const t = e.target;
        const typing =
          t &&
          (t.tagName === "INPUT" ||
            t.tagName === "TEXTAREA" ||
            t.isContentEditable);
        if (!typing) {
          e.preventDefault();
          open();
        }
      }
    });
  }

  // ─────────────────────────────────────────────
  // Cursor spotlight + 3D parallax tilt on cards
  // ─────────────────────────────────────────────
  const TILT_MAX = 6; // degrees
  document.querySelectorAll(".now-card, .dossier").forEach((card) => {
    const isDossier = card.classList.contains("dossier");
    card.addEventListener(
      "pointermove",
      (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", px * 100 + "%");
        card.style.setProperty("--my", py * 100 + "%");
        if (e.pointerType && e.pointerType !== "mouse") return;
        // expanded dossiers stay flat (too tall to tilt nicely)
        if (
          prefersReducedMotion ||
          (isDossier && card.classList.contains("is-open"))
        ) {
          return;
        }
        const ry = (px - 0.5) * 2 * TILT_MAX;
        const rx = -(py - 0.5) * 2 * TILT_MAX;
        card.style.transform =
          "perspective(1100px) rotateX(" +
          rx.toFixed(2) +
          "deg) rotateY(" +
          ry.toFixed(2) +
          "deg) translateY(-4px)";
      },
      { passive: true }
    );
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });

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

  // The atmospheric flow field is a WebGL scene; it lives in flow3d.js
  // (loaded as a Three.js module) so it can render true 3D depth.

  // ─────────────────────────────────────────────
  // Console greeting for fellow developers
  // ─────────────────────────────────────────────
  try {
    const t = "color:#69e0c0;font:700 20px 'Space Grotesk',system-ui,sans-serif";
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
    console.log("%cTip: press ⌘K (or /) to jump around.", d);
  } catch (err) {
    /* console styling unsupported */
  }
});
