document.addEventListener("DOMContentLoaded", () => {
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

  // 2. Sophisticated Staggered Fade-In Effect (Mixed Font Weights)
  const fadeTextElement = document.getElementById("typewriter");
  if (fadeTextElement) {
    fadeTextElement.textContent = "";

    // Part 1: "Hello," block
    const helloSpan = document.createElement("span");
    helloSpan.textContent = "Hello,";
    helloSpan.className =
      "inline-block opacity-0 translate-y-3 transition-all duration-[1200ms] ease-out";
    fadeTextElement.appendChild(helloSpan);

    // Part 2: " I'm Mason Cao." cascade
    const nameText = " I'm Mason Cao.";
    const chars = nameText.split("").map((char) => {
      const span = document.createElement("span");
      span.textContent = char === " " ? "\u00A0" : char;
      span.className =
        "font-normal text-slate-200 opacity-0 transition-opacity duration-1000 ease-out";
      fadeTextElement.appendChild(span);
      return span;
    });

    setTimeout(() => {
      helloSpan.classList.remove("opacity-0", "translate-y-3");
      helloSpan.classList.add("opacity-100", "translate-y-0");

      setTimeout(() => {
        let i = 0;
        function fadeInNextChar() {
          if (i < chars.length) {
            chars[i].classList.remove("opacity-0");
            chars[i].classList.add("opacity-100");
            i++;
            setTimeout(fadeInNextChar, 80);
          }
        }
        fadeInNextChar();
      }, 800);
    }, 400);
  }

  // 3. Real-Time Clock Logic
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

  // 4. Scroll Animation Logic
  const fadeElements = document.querySelectorAll(".fade-element");
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.15 };

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

  // 5. Contact Modal Logic
  const openContactBtn = document.getElementById("open-contact-btn");
  const contactModal = document.getElementById("contact-modal");
  const contactBackdrop = document.getElementById("contact-backdrop");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const contactBox = document.getElementById("contact-box");

  function openModal(e) {
    e.preventDefault();
    contactModal.classList.remove("opacity-0", "pointer-events-none");
    contactBox.classList.remove("scale-95");
    contactBox.classList.add("scale-100");
  }

  function closeModal() {
    contactModal.classList.add("opacity-0", "pointer-events-none");
    contactBox.classList.remove("scale-100");
    contactBox.classList.add("scale-95");
  }

  if (openContactBtn) openContactBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (contactBackdrop) contactBackdrop.addEventListener("click", closeModal);

  // 6. 3D Tilt Effect for Project Cards
  if (typeof VanillaTilt !== "undefined") {
    VanillaTilt.init(document.querySelectorAll(".project-card"), {
      max: 5, // Maximum tilt rotation
      speed: 400, // Speed of transition
      glare: true, // Glass reflection effect
      "max-glare": 0.15 // Reflection opacity
    });
  }
});
