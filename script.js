(() => {
  const body = document.body;
  const toggle = document.querySelector("[data-toggle]");
  const close = document.querySelector("[data-close]");
  const overlay = document.querySelector("[data-overlay]");
  const drawer = document.querySelector(".drawer");

  if (!toggle || !drawer) return;

  const focusableInDrawer = () => Array.from(
    drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
  ).filter(element => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true");

  let returnFocusTo = null;

  function setOpen(open) {
    body.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    drawer.setAttribute("aria-hidden", String(!open));
    drawer.inert = !open;

    if (open) {
      returnFocusTo = document.activeElement;
      requestAnimationFrame(() => (focusableInDrawer()[0] || drawer).focus());
      return;
    }

    if (returnFocusTo && returnFocusTo.isConnected) {
      returnFocusTo.focus();
    } else {
      toggle.focus();
    }
    returnFocusTo = null;
  }

  toggle.setAttribute("aria-controls", drawer.id || "site-navigation");
  if (!drawer.id) drawer.id = "site-navigation";
  drawer.setAttribute("aria-hidden", "true");
  drawer.inert = true;

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });
  close?.addEventListener("click", () => setOpen(false));
  overlay?.addEventListener("click", () => setOpen(false));
  drawer.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("keydown", event => {
    if (!body.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = focusableInDrawer();
    if (!focusable.length) {
      event.preventDefault();
      drawer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
