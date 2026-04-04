document.addEventListener("DOMContentLoaded", () => {
  // 1. Real-Time Clock Logic (Set to Eastern Time for Georgia)
  const timeElement = document.getElementById("live-time");

  function updateTime() {
    const now = new Date();

    // Format the time to Eastern Time (EST/EDT)
    const timeString = now.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZoneName: "short" // Will output EST or EDT depending on daylight saving
    });

    timeElement.textContent = timeString;
  }

  // Run immediately, then update every second
  updateTime();
  setInterval(updateTime, 1000);

  // 2. Scroll Animation Logic (Intersection Observer)
  const fadeElements = document.querySelectorAll(".fade-element");

  const observerOptions = {
    root: null, // Viewport
    rootMargin: "0px",
    threshold: 0.15 // Triggers when 15% of the element is visible
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        // Add the 'visible' class to trigger the CSS transition
        entry.target.classList.add("visible");
        // Unobserve once it's visible so it doesn't animate out/in again
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Attach observer to all elements with the 'fade-element' class
  fadeElements.forEach((element) => {
    observer.observe(element);
  });
});
