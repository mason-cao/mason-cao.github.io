document.addEventListener("DOMContentLoaded", () => {
  // 1. Map Initialization (Leaflet.js)
  const mapContainer = document.getElementById("background-map");
  const mapWrapper = document.getElementById("map-wrapper");

  if (mapContainer && typeof L !== "undefined") {
    // Start zoomed out over the entire United States
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

    // Using the light map for the high-contrast dark CSS trick
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19
      }
    ).addTo(map);

    setTimeout(() => {
      // Fix the size and fade the WRAPPER in (not the map)
      map.invalidateSize();
      if (mapWrapper) {
        mapWrapper.classList.remove("opacity-0");
        mapWrapper.classList.add("opacity-100");
      }

      // Wait slightly, then execute the cinematic zoom to Suwanee
      setTimeout(() => {
        map.flyTo([34.0515, -84.0714], 12, {
          animate: true,
          duration: 3.5 // Duration of the zoom in seconds
        });

        // Wait for the flight to finish, then start the infinite CSS pulse on the wrapper
        setTimeout(() => {
          if (mapWrapper) {
            mapWrapper.classList.add("animate-map-zoom");
          }
        }, 3500);
      }, 800); // 800ms delay before the flight starts
    }, 250);
  }

  // 2. Smooth Character Fade-In Effect
  const fadeTextElement = document.getElementById("typewriter");
  if (fadeTextElement) {
    const textToType = "Hello, I'm Mason Cao.";
    fadeTextElement.textContent = ""; // Clear initial text

    // Create individual spans for each character
    const chars = textToType.split("").map((char) => {
      const span = document.createElement("span");
      // Preserve spaces, otherwise they collapse
      span.textContent = char === " " ? "\u00A0" : char;

      // Add Tailwind classes for a smooth opacity transition
      span.className = "opacity-0 transition-opacity duration-700 ease-out";
      fadeTextElement.appendChild(span);
      return span;
    });

    let i = 0;
    function fadeInNextChar() {
      if (i < chars.length) {
        chars[i].classList.remove("opacity-0");
        chars[i].classList.add("opacity-100");
        i++;

        // 40ms delay between each letter starting its fade-in
        setTimeout(fadeInNextChar, 40);
      }
    }

    // Start effect after a short delay so the page's main fade-in finishes first
    setTimeout(fadeInNextChar, 500);
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
});
