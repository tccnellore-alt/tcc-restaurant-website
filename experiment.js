(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.add("xp-js");

  // Readable, lightweight scroll progress and glass-header response.
  const updateScroll = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty("--xp-scroll", String(Math.min(1, Math.max(0, window.scrollY / max))));
    document.querySelector(".xp-header")?.classList.toggle("is-scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll, { passive: true });
  updateScroll();

  // Reveal only after the observer exists; content remains visible if unsupported.
  const revealEls = [...document.querySelectorAll("[data-reveal]")];
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add("is-visible"));
  }

  // Gentle pointer tilt on desktop portal cards. Disabled for touch and reduced motion.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reducedMotion && finePointer) {
    document.querySelectorAll(".xp-portal.xp-tilt").forEach(card => {
      card.addEventListener("pointermove", event => {
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--xp-tilt-x", (y * -3.5).toFixed(2) + "deg");
        card.style.setProperty("--xp-tilt-y", (x * 3.5).toFixed(2) + "deg");
      });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--xp-tilt-x", "0deg");
        card.style.setProperty("--xp-tilt-y", "0deg");
      });
    });
  }

  // Allow the existing menu UI to load directly into a category portal.
  // The menu's own script handles #coffee, #food, #signatures and #refreshers-and-tea.
  document.querySelectorAll('a[href^="menu.html#"]').forEach(link => {
    link.addEventListener("click", () => {
      try { sessionStorage.setItem("tccLastPortal", link.getAttribute("href").split("#")[1]); } catch (_) {}
    });
  });
})();