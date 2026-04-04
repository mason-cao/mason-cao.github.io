document.addEventListener("DOMContentLoaded", () => {
  // 1. Map Initialization (Leaflet.js)
  const mapContainer = document.getElementById("background-map");

  if (mapContainer && typeof L !== "undefined") {
    const map = L.map("background-map", {
      center: [34.0515, -84.0714], // Suwanee, GA
      zoom: 12,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19
      }
    ).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
      mapContainer.classList.remove("opacity-0");
      mapContainer.classList.add("opacity-100");
      mapContainer.classList.add("animate-map-zoom");
    }, 250);
  } else {
    console.warn("Leaflet library failed to load or map container is missing.");
  }

  // 2. Real-Time Clock Logic
  const timeElement = document.getElementById("live-time");
  if (timeElement) {
    function updateTime() {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });
      timeElement.textContent = timeString;
    }
    updateTime();
    setInterval(updateTime, 1000);
  }

  // 3. Scroll Animation Logic
  const fadeElements = document.querySelectorAll(".fade-element");
  const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  fadeElements.forEach((element) => {
    observer.observe(element);
  });

  // 4. Contact Modal Logic - Fully Bound in JS
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

  // Bind the events safely
  if (openContactBtn) openContactBtn.addEventListener("click", openModal);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (contactBackdrop) contactBackdrop.addEventListener("click", closeModal);
});
