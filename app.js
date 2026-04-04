document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("site-search");
  const nav = document.getElementById("section-nav");
  const navButtons = nav.querySelectorAll("button[data-section]");
  const sections = document.querySelectorAll("main section");
  const searchStatus = document.getElementById("search-status");

  const setActivePill = (sectionId) => {
    navButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.section === sectionId);
    });
  };

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.section);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePill(btn.dataset.section);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActivePill(entry.target.id);
        }
      });
    },
    { threshold: 0.35 },
  );

  sections.forEach((section) => observer.observe(section));

  const clearHighlights = () => {
    document.querySelectorAll("mark").forEach((markNode) => {
      const parent = markNode.parentNode;
      parent.replaceChild(document.createTextNode(markNode.textContent), markNode);
      parent.normalize();
    });
  };

  const highlightMatches = (query) => {
    clearHighlights();
    searchStatus.classList.add("hidden");

    if (query.length < 2) {
      sections.forEach((s) => s.classList.remove("dimmed"));
      return;
    }

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    let matches = 0;

    sections.forEach((section) => {
      const nodes = section.querySelectorAll("p, li, h2, h3, h4, span");
      let sectionHasMatch = false;

      nodes.forEach((node) => {
        if (node.closest("a")) return;
        if (node.children.length > 0) return;

        if (regex.test(node.textContent)) {
          sectionHasMatch = true;
          matches += (node.textContent.match(regex) || []).length;
          node.innerHTML = node.textContent.replace(regex, "<mark>$1</mark>");
        }
      });

      section.classList.toggle("dimmed", !sectionHasMatch);
    });

    if (matches > 0) {
      const firstMatch = document.querySelector("mark");
      if (firstMatch) {
        const parentSection = firstMatch.closest("section");
        if (parentSection) {
          parentSection.scrollIntoView({ behavior: "smooth", block: "center" });
          setActivePill(parentSection.id);
        }
      }

      searchStatus.textContent = `${matches} match${matches === 1 ? "" : "es"} found for “${query}”.`;
    } else {
      sections.forEach((s) => s.classList.remove("dimmed"));
      searchStatus.textContent = `No matches found for “${query}”. Try a broader keyword.`;
    }

    searchStatus.classList.remove("hidden");
  };

  searchInput.addEventListener("input", (event) => {
    highlightMatches(event.target.value.trim());
  });
});
