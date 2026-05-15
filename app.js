document.addEventListener("DOMContentLoaded", () => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // 1. Map Initialization (Leaflet.js)
  const mapContainer = document.getElementById("background-map");
  const mapWrapper = document.getElementById("map-wrapper");

  if (mapContainer && typeof L !== "undefined") {
    const map = L.map("background-map", {
      center: [39.8283, -98.5795],
      zoom: 4,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false,
      fadeAnimation: false // Stops tile fading bugs
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19
      }
    ).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
      if (mapWrapper) {
        mapWrapper.classList.remove("opacity-0");
        mapWrapper.classList.add("opacity-100");
      }

      if (prefersReducedMotion) {
        map.setView([34.0515, -84.0714], 12);
        return;
      }

      setTimeout(() => {
        map.flyTo([34.0515, -84.0714], 12, {
          animate: true,
          duration: 3.5
        });

        setTimeout(() => {
          if (mapWrapper) {
            mapWrapper.classList.add("animate-map-zoom");
          }
        }, 3500);
      }, 800);
    }, 250);
  }

  // 2. Real-Time Clock Logic
  const timeElement = document.getElementById("live-time");
  if (timeElement) {
    function updateTime() {
      const now = new Date();
      timeElement.textContent = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // 3. Hero Typewriter
  const heroTitle = document.getElementById("hero-title");
  const heroTitleText = heroTitle?.dataset.typewriterText;

  if (heroTitle && heroTitleText) {
    heroTitle.textContent = heroTitleText;

    if (!prefersReducedMotion) {
      const characters = Array.from(heroTitleText);
      let index = 0;

      heroTitle.textContent = "";
      heroTitle.classList.add("is-typing");

      function typeNextCharacter() {
        heroTitle.textContent = characters.slice(0, index).join("");
        index += 1;

        if (index <= characters.length) {
          window.setTimeout(typeNextCharacter, index === 1 ? 260 : 52);
        } else {
          heroTitle.textContent = heroTitleText;
          window.setTimeout(() => {
            heroTitle.classList.remove("is-typing");
          }, 850);
        }
      }

      window.setTimeout(typeNextCharacter, 360);
    }
  }

  // 4. Active Navigation
  const navLinks = document.querySelectorAll("[data-nav-link]");
  const sectionTargets = {
    projects: document.getElementById("projects"),
    about: document.getElementById("about")
  };
  let scrollTicking = false;

  function setActiveNav(activeId) {
    navLinks.forEach((link) => {
      const isActive = link.dataset.navLink === activeId;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateScrollState() {
    const readingLine = window.scrollY + window.innerHeight * 0.36;
    let activeId = "home";
    if (
      sectionTargets.projects &&
      readingLine >= sectionTargets.projects.offsetTop
    ) {
      activeId = "projects";
    }
    if (sectionTargets.about && readingLine >= sectionTargets.about.offsetTop) {
      activeId = "about";
    }
    setActiveNav(activeId);
    scrollTicking = false;
  }

  function requestScrollState() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollState);
  }

  updateScrollState();
  window.addEventListener("scroll", requestScrollState, { passive: true });
  window.addEventListener("resize", requestScrollState);

  // 5. Scroll Animation Logic
  const fadeElements = document.querySelectorAll(".fade-element");
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.15 };

  if (prefersReducedMotion) {
    fadeElements.forEach((element) => element.classList.add("visible"));
  } else {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    fadeElements.forEach((element) => {
      observer.observe(element);
    });
  }

  // 6. Modal Logic (shared by contact + achievements)
  const modalFocusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function setupModal({ openBtnId, modalId, boxId, backdropId, closeBtnId }) {
    const openBtn = document.getElementById(openBtnId);
    const modal = document.getElementById(modalId);
    const box = document.getElementById(boxId);
    const backdrop = document.getElementById(backdropId);
    const closeBtn = document.getElementById(closeBtnId);

    if (!openBtn || !modal || !box) return;

    let lastFocusedElement = null;

    function open(e) {
      e.preventDefault();
      lastFocusedElement = document.activeElement;
      modal.setAttribute("aria-hidden", "false");
      modal.removeAttribute("inert");
      modal.classList.remove("opacity-0", "pointer-events-none");
      box.classList.remove("scale-95");
      box.classList.add("scale-100");
      document.body.style.overflow = "hidden";
      openBtn.classList.add("active");
      requestAnimationFrame(() => {
        if (closeBtn) closeBtn.focus();
      });
    }

    function close() {
      modal.setAttribute("aria-hidden", "true");
      modal.setAttribute("inert", "");
      modal.classList.add("opacity-0", "pointer-events-none");
      box.classList.remove("scale-100");
      box.classList.add("scale-95");
      document.body.style.overflow = "";
      openBtn.classList.remove("active");
      if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
      }
    }

    function trapFocus(e) {
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
    }

    function handleKeydown(e) {
      if (modal.getAttribute("aria-hidden") === "true") return;
      if (e.key === "Escape") {
        close();
      } else if (e.key === "Tab") {
        trapFocus(e);
      }
    }

    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    if (backdrop) backdrop.addEventListener("click", close);
    document.addEventListener("keydown", handleKeydown);
  }

  setupModal({
    openBtnId: "open-contact-btn",
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

  // 7. 3D Tilt Effect for Project Cards
  if (!prefersReducedMotion && typeof VanillaTilt !== "undefined") {
    VanillaTilt.init(document.querySelectorAll(".project-card"), {
      max: 5, // Maximum tilt rotation
      speed: 400, // Speed of transition
      glare: true, // Glass reflection effect
      "max-glare": 0.15 // Reflection opacity
    });
  }
});
