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

  // 4. Scroll Progress and Active Navigation
  const scrollProgress = document.getElementById("scroll-progress");
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
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
    if (scrollProgress) {
      scrollProgress.style.transform = `scaleX(${Math.min(progress, 100) / 100})`;
    }

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

  // 6. Contact Modal Logic
  const openContactBtn = document.getElementById("open-contact-btn");
  const heroContactBtn = document.getElementById("hero-contact-btn");
  const contactModal = document.getElementById("contact-modal");
  const contactBackdrop = document.getElementById("contact-backdrop");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const contactBox = document.getElementById("contact-box");
  const modalFocusableSelector =
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let lastFocusedElement = null;

  function getModalFocusableElements() {
    if (!contactModal) return [];
    return Array.from(contactModal.querySelectorAll(modalFocusableSelector));
  }

  function openModal(e) {
    e.preventDefault();
    if (!contactModal || !contactBox) return;
    lastFocusedElement = document.activeElement;
    contactModal.setAttribute("aria-hidden", "false");
    contactModal.removeAttribute("inert");
    contactModal.classList.remove("opacity-0", "pointer-events-none");
    contactBox.classList.remove("scale-95");
    contactBox.classList.add("scale-100");
    document.body.style.overflow = "hidden";
    if (openContactBtn) openContactBtn.classList.add("active");
    requestAnimationFrame(() => {
      if (closeModalBtn) closeModalBtn.focus();
    });
  }

  function closeModal() {
    if (!contactModal || !contactBox) return;
    contactModal.setAttribute("aria-hidden", "true");
    contactModal.setAttribute("inert", "");
    contactModal.classList.add("opacity-0", "pointer-events-none");
    contactBox.classList.remove("scale-100");
    contactBox.classList.add("scale-95");
    document.body.style.overflow = "";
    if (openContactBtn) openContactBtn.classList.remove("active");
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  function trapModalFocus(e) {
    const focusable = getModalFocusableElements();
    if (focusable.length === 0) return;

    const firstElement = focusable[0];
    const lastElement = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }

  function handleModalKeydown(e) {
    if (!contactModal || contactModal.getAttribute("aria-hidden") === "true") {
      return;
    }

    if (e.key === "Escape") {
      closeModal();
    } else if (e.key === "Tab") {
      trapModalFocus(e);
    }
  }

  if (openContactBtn) openContactBtn.addEventListener("click", openModal);
  if (heroContactBtn) heroContactBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (contactBackdrop) contactBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", handleModalKeydown);

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
