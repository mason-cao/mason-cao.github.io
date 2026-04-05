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

    // Change 'dark_all' to 'light_all'
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
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
  }
  // Typewriter Effect
  const typewriterElement = document.getElementById("typewriter");
  if (typewriterElement) {
    const textToType = "Hello, I'm Mason Cao.";

    // Instantly clear the text so it can be typed out
    typewriterElement.textContent = "";
    typewriterElement.classList.add("typing-cursor");

    let i = 0;
    function typeWriter() {
      if (i < textToType.length) {
        typewriterElement.textContent += textToType.charAt(i);
        i++;

        // Randomize typing speed slightly (between 40ms and 90ms) for a human feel
        const typingSpeed = Math.random() * 50 + 40;
        setTimeout(typeWriter, typingSpeed);
      } else {
        // Stop the cursor from blinking 3 seconds after it finishes typing
        setTimeout(() => {
          typewriterElement.classList.remove("typing-cursor");
        }, 3000);
      }
    }

    // Wait 500ms before typing so the page's fade-in animation finishes first
    setTimeout(typeWriter, 500);
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

  // 3. Scroll Animation Logic
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

  // 4. Contact Modal Logic
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
