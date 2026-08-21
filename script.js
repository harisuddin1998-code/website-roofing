(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- mobile nav ---------- */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  if (burger && mobileMenu) {
    burger.addEventListener("click", () => {
      const open = mobileMenu.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    mobileMenu.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        mobileMenu.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- nav shadow on scroll ---------- */
  const nav = document.getElementById("nav");
  const onNavScroll = () => {
    if (!nav) return;
    nav.style.boxShadow = window.scrollY > 8 ? "0 12px 30px -20px rgba(0,0,0,0.8)" : "none";
  };
  window.addEventListener("scroll", onNavScroll, { passive: true });
  onNavScroll();

  /* ---------- scroll reveal ---------- */
  const revealEls = Array.from(document.querySelectorAll(".reveal"));
  if (reduced || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  } else {
    revealEls.forEach((el, i) => {
      el.style.transitionDelay = Math.min(i % 6, 5) * 70 + "ms";
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- before / after slider ---------- */
  const ba = document.getElementById("ba");
  const baBefore = document.getElementById("baBefore");
  const baHandle = document.getElementById("baHandle");
  if (ba && baBefore && baHandle) {
    let dragging = false;
    const setPos = (clientX) => {
      const r = ba.getBoundingClientRect();
      const pct = Math.max(3, Math.min(97, ((clientX - r.left) / r.width) * 100));
      baBefore.style.width = pct + "%";
      baHandle.style.left = pct + "%";
    };
    ba.addEventListener("pointerdown", (e) => { dragging = true; setPos(e.clientX); });
    window.addEventListener("pointerup", () => { dragging = false; });
    window.addEventListener("pointermove", (e) => { if (dragging) setPos(e.clientX); }, { passive: true });
    ba.addEventListener(
      "keydown",
      (e) => {
        const r = ba.getBoundingClientRect();
        const current = parseFloat(baBefore.style.width) || 50;
        if (e.key === "ArrowLeft") setPos(r.left + (r.width * (current - 5)) / 100);
        if (e.key === "ArrowRight") setPos(r.left + (r.width * (current + 5)) / 100);
      }
    );
    ba.setAttribute("tabindex", "0");
    ba.setAttribute("role", "slider");
    ba.setAttribute("aria-label", "Before and after roof comparison slider");
  }

  /* ---------- roof-anatomy active card on scroll ---------- */
  const anatomyCards = Array.from(document.querySelectorAll(".anatomy__card"));
  if (anatomyCards.length && "IntersectionObserver" in window) {
    const io2 = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            anatomyCards.forEach((c) => c.classList.remove("anatomy__card--active"));
            entry.target.classList.add("anatomy__card--active");
          }
        });
      },
      { threshold: 0.6 }
    );
    anatomyCards.forEach((c) => io2.observe(c));
  }

  /* ---------- process progress line ---------- */
  const processTrack = document.querySelector(".process__track");
  const processFill = document.getElementById("processFill");
  if (processTrack && processFill && "IntersectionObserver" in window) {
    const io3 = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          processFill.style.width = "100%";
          io3.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    io3.observe(processTrack);
  }

  /* ---------- estimate form ---------- */
  const form = document.getElementById("estimateForm");
  const success = document.getElementById("estimateSuccess");
  if (form && success) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      form.hidden = true;
      success.hidden = false;
      success.setAttribute("tabindex", "-1");
      success.focus();
    });
  }
})();
