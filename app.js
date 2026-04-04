document.addEventListener("DOMContentLoaded", () => {
  // 1. Map Initialization (Leaflet.js)
  // Coordinates for Suwanee, GA
  const mapContainer = document.getElementById("background-map");
  if (mapContainer && typeof L !== "undefined") {
    const map = L.map("background-map", {
      center: [34.0515, -84.0714],
      zoom: 12,
      zoomControl: false, // Hide zoom controls
      dragging: false, // Prevent panning
      scrollWheelZoom: false, // Prevent scroll zoom
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: false // Hide attribution for aesthetic purposes
    });

    // Use CartoDB Dark Matter tiles for the dark aesthetic
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19
      }
    ).addTo(map);

    // Trigger fade-in and CSS zoom animation shortly after load
    setTimeout(() => {
      mapContainer.classList.remove("opacity-0");
      mapContainer.classList.add("opacity-40"); // Keep it slightly transparent
      mapContainer.classList.add("animate-map-zoom");
    }, 500);
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
});
