// script.js
// Complete, integrated JS for portfolio:
// - Smooth scrolling
// - Feather icons replacement
// - Contact form submission
// - Generic modals (keeps original behavior)
// - Filters (software / certificates)
// - Gallery modal (loads assets/gallery.json) — works for all categories
// - Certificate modal (thumbnail -> modal + download)
// - Image error handling, loading animations
// - Nav highlighting on scroll
// - Keyboard navigation for gallery

document.addEventListener("DOMContentLoaded", () => {
  replaceFeatherIcons();
  initSmoothScrolling();
  initContactFormSubmission();
  initModals();
  initFilters("#certificates .filter-buttons .btn", "#certificates .projects-grid .project-card");
  initFilters("#software .filter-buttons .btn", "#software .projects-grid .project-card");
  initGalleryModal();        // gallery.json driven modal for cards with data-project/data-gallery
  initCertificateModal();    // certificate thumbnail modal + download
  addGlobalImageErrorHandlers();
  addImageLoadingAnimation();
  initNavHighlighting();
});

/* ============================
   Smooth Scrolling
   ============================ */
function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", e => {
      // If target exists on the page, smooth scroll. Otherwise let normal anchor behavior occur.
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        // Prefer scrollIntoView for simpler behavior; header offset is small so this is fine.
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/* ============================
   Feather Icons Replacement
   ============================ */
function replaceFeatherIcons() {
  if (typeof feather !== "undefined" && feather.replace) {
    feather.replace();
  }
}

/* ============================
   Contact Form Submission
   ============================ */
function initContactFormSubmission() {
  const contactForm = document.querySelector(".contact-form");
  if (!contactForm) return;

  contactForm.addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    const dataObj = Object.fromEntries(formData.entries());

    // Add basic UI feedback
    form.classList.add("loading");
    const endpoint = form.getAttribute("action") || "#";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataObj),
      });

      if (res.ok) {
        alert("Your message has been sent successfully!");
        form.reset();
      } else {
        // try to parse JSON error message
        let msg = "Error sending message. Please try again later.";
        try {
          const json = await res.json();
          if (json && json.message) msg = json.message;
        } catch (_) {}
        alert(msg);
      }
    } catch (err) {
      console.error("Contact form error:", err);
      alert("An error occurred while sending your message. Please try again.");
    } finally {
      form.classList.remove("loading");
    }
  });
}

/* ============================
   Generic Modal Triggers (keeps existing behavior)
   - data-modal-target attribute to open modal by id
   - .close-btn elements close their nearest modal
   - clicking outside modal content closes modal (for elements with class 'modal')
   ============================ */
function initModals() {
  const modalTriggers = document.querySelectorAll("[data-modal-target]");
  const closeButtons = document.querySelectorAll(".close-btn");

  modalTriggers.forEach(trigger => {
    trigger.addEventListener("click", e => {
      e.preventDefault();
      const modalId = trigger.getAttribute("data-modal-target");
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    });
  });

  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const modal = btn.closest(".modal");
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
      }
    });
  });

  // Note: many of your modals (certificate-modal, gallery-modal) are not class="modal",
  // they have specific classes. We handle their outside-click closing in their own init functions.
}

/* ============================
   Filtering system for sections
   Usage: initFilters(filterSelector, itemSelector)
   ============================ */
function initFilters(filterSelector, itemSelector) {
  const filterBtns = document.querySelectorAll(filterSelector);
  const items = document.querySelectorAll(itemSelector);

  if (!filterBtns.length || !items.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.getAttribute("data-filter");

      items.forEach(item => {
        // use dataset.category if present
        const cat = item.dataset.category || item.dataset.project || item.dataset.gallery || "";
        if (filter === "all" || cat === filter) {
          item.style.display = ""; // restore (uses CSS/display default)
          item.classList.add("fade-in");
        } else {
          item.style.display = "none";
          item.classList.remove("fade-in");
        }
      });
    });
  });
}

/* ============================
   Gallery Modal (loads assets/gallery.json)
   - Works for all categories (matching keys in gallery.json)
   - Clickable triggers: .project-card[data-project] or .project-card[data-gallery]
   ============================ */
function initGalleryModal() {
  const galleryModal = document.getElementById("gallery-modal");
  const galleryItemsContainer = document.getElementById("gallery-items");
  const galleryClose = document.getElementById("gallery-close");
  const galleryPrev = document.getElementById("gallery-prev");
  const galleryNext = document.getElementById("gallery-next");

  if (!galleryModal || !galleryItemsContainer) return;

  let allGalleries = {};
  let currentGallery = [];
  let currentIndex = 0;
  let currentCategory = "";

  // Load gallery.json (placed under assets/gallery.json as in your original code)
  fetch("gallery.json")
    .then(res => res.json())
    .then(data => {
      allGalleries = data || {};
    })
    .catch(err => {
      console.error("Failed to load gallery.json", err);
      allGalleries = {};
    });

  // Bind click on project cards that opt-in for gallery via data-project or data-gallery
  document.querySelectorAll(".project-card[data-project], .project-card[data-gallery]").forEach(card => {
    card.addEventListener("click", (e) => {
      // prevent certificate-thumbnail child clicks from bubbling here
      if (e.target.classList && e.target.classList.contains("certificate-thumbnail")) return;

      const category = card.dataset.project || card.dataset.gallery;
      if (!category) return;
      currentCategory = category;
      currentGallery = allGalleries[category] || [];
      if (!currentGallery.length) {
        // If no items found, show a short message inside modal
        galleryItemsContainer.innerHTML = `<div class="image-placeholder" style="padding:2rem;">No gallery items found for "${category}"</div>`;
        galleryModal.style.display = "flex";
        document.body.style.overflow = "hidden";
        return;
      }
      currentIndex = 0;
      showGalleryItem();
      galleryModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    });
  });

  function showGalleryItem() {
    galleryItemsContainer.innerHTML = "";
    if (!currentGallery.length) return;

    const item = currentGallery[currentIndex];
    let el;

    if (item.type === "image") {
      el = document.createElement("img");
      el.src = item.src;
      el.alt = item.alt || (currentCategory + " image");
      el.loading = "lazy";
      el.style.maxWidth = "100%";
      el.style.maxHeight = "70vh";
      el.style.display = "block";
      el.style.margin = "0 auto";
      el.onerror = () => handleImageError(el);
    } else if (item.type === "video") {
      el = document.createElement("video");
      el.src = item.src;
      el.controls = true;
      el.style.maxWidth = "100%";
      el.style.maxHeight = "70vh";
      el.style.display = "block";
      el.style.margin = "0 auto";
    } else if (item.type === "application" || item.type === "pdf") {
      el = document.createElement("a");
      el.href = item.src;
      el.target = "_blank";
      el.rel = "noopener noreferrer";
      el.textContent = item.caption || "View Document";
      el.style.fontSize = "1.2rem";
      el.style.color = "white";
      el.style.textDecoration = "underline";
      el.style.display = "inline-block";
    } else {
      el = document.createElement("div");
      el.textContent = "Unsupported media type";
      el.className = "image-placeholder";
      el.style.padding = "1rem";
    }

    // optional caption
    const wrapper = document.createElement("div");
    wrapper.style.textAlign = "center";
    wrapper.style.width = "100%";
    wrapper.appendChild(el);

    if (item.caption) {
      const captionEl = document.createElement("p");
      captionEl.textContent = item.caption;
      captionEl.style.color = "white";
      captionEl.style.marginTop = "0.5rem";
      wrapper.appendChild(captionEl);
    }

    galleryItemsContainer.appendChild(wrapper);
  }

  function closeGallery() {
    // Pause any playing video
    const video = galleryItemsContainer.querySelector("video");
    if (video) {
      try { video.pause(); } catch (_) {}
    }

    galleryModal.style.display = "none";
    document.body.style.overflow = "auto";
    galleryItemsContainer.innerHTML = "";
    currentGallery = [];
    currentIndex = 0;
    currentCategory = "";
  }

  galleryPrev?.addEventListener("click", () => {
    if (!currentGallery.length) return;
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    showGalleryItem();
  });

  galleryNext?.addEventListener("click", () => {
    if (!currentGallery.length) return;
    currentIndex = (currentIndex + 1) % currentGallery.length;
    showGalleryItem();
  });

  galleryClose?.addEventListener("click", closeGallery);

  // Close modal when clicking outside content
  galleryModal.addEventListener("click", (e) => {
    if (e.target === galleryModal) closeGallery();
  });

  // Keyboard navigation (when gallery is visible)
  document.addEventListener("keydown", (e) => {
    if (galleryModal.style.display === "flex") {
      if (e.key === "Escape") closeGallery();
      else if (e.key === "ArrowRight") galleryNext?.click();
      else if (e.key === "ArrowLeft") galleryPrev?.click();
    }
  });
}

/* ============================
   Certificate Modal (thumbnail click -> modal + download)
   - Keeps the behavior you had previously
   ============================ */
function initCertificateModal() {
  const certModal = document.getElementById("certificate-modal");
  const certImg = document.getElementById("certificate-modal-img");
  const certTitle = document.getElementById("certificate-modal-title");
  const certClose = document.getElementById("certificate-close");
  const downloadBtn = document.getElementById("download-certificate");

  if (!certModal || !certImg) return;

  let currentCertificateUrl = "";
  let currentCertificateTitle = "";

  // Open modal on certificate thumbnail click
  document.querySelectorAll(".certificate-thumbnail").forEach(img => {
    img.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent bubbling to potential parent card click

      const card = img.closest(".project-card");
      const titleElement = card ? card.querySelector(".card-text-right h3") : null;

      currentCertificateUrl = img.src;
      currentCertificateTitle = titleElement ? titleElement.textContent.trim() : "Certificate";

      // Set modal content
      certImg.src = currentCertificateUrl;
      certTitle.textContent = currentCertificateTitle;

      // Show modal
      certModal.style.display = "block";
      document.body.style.overflow = "hidden";

      // Fade-in effect (CSS handles opacity transition if present)
      setTimeout(() => {
        certModal.style.opacity = "1";
      }, 10);
    });
  });

  function closeCertificateModal() {
    certModal.style.opacity = "0";
    setTimeout(() => {
      certModal.style.display = "none";
      document.body.style.overflow = "auto";
      certImg.src = "";
      currentCertificateUrl = "";
      currentCertificateTitle = "";
    }, 300);
  }

  certClose?.addEventListener("click", closeCertificateModal);

  certModal.addEventListener("click", (e) => {
    if (e.target === certModal) closeCertificateModal();
  });

  downloadBtn?.addEventListener("click", () => {
    if (currentCertificateUrl) {
      const link = document.createElement("a");
      link.href = currentCertificateUrl;
      // sanitize title for filename
      const safeTitle = (currentCertificateTitle || "certificate").replace(/\s+/g, "_").replace(/[^\w\-_.]/g, "");
      link.download = `${safeTitle}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && certModal.style.display === "block") {
      closeCertificateModal();
    }
  });

  // initialize opacity and transition (if CSS is present it will match)
  certModal.style.opacity = "0";
  certModal.style.transition = "opacity 0.3s ease";
}

/* ============================
   Image Error Handling (placeholder)
   ============================ */
function handleImageError(img) {
  // If already replaced, return
  if (!img || !img.parentNode) return;
  img.style.display = "none";

  // Create placeholder (reuses your CSS class .image-placeholder)
  const placeholder = document.createElement("div");
  placeholder.className = "image-placeholder";
  placeholder.textContent = "Image not available";
  placeholder.style.cssText = `
    width: 100%;
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0f0f0;
    color: #666;
    font-size: 14px;
  `;
  if (img.nextSibling) img.parentNode.insertBefore(placeholder, img.nextSibling);
  else img.parentNode.appendChild(placeholder);
}

function addGlobalImageErrorHandlers() {
  document.querySelectorAll("img").forEach(img => {
    img.addEventListener("error", () => handleImageError(img));
  });
}

/* ============================
   Image Loading Animation
   ============================ */
function addImageLoadingAnimation() {
  document.querySelectorAll("img").forEach(img => {
    if (!img.complete) {
      img.style.opacity = "0";
      img.addEventListener("load", () => {
        img.style.transition = "opacity 0.3s ease";
        img.style.opacity = "1";
      });
    }
  });
}

/* ============================
   Navigation Highlighting on Scroll
   ============================ */
function initNavHighlighting() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a");

  function highlightNavOnScroll() {
    let current = "";
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      if (pageYOffset >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  window.addEventListener("scroll", highlightNavOnScroll);
  // run once on load
  highlightNavOnScroll();
}

/* ============================
   Optional: smoothScrollTo function (kept for compatibility)
   ============================ */
function smoothScrollTo(targetSelector) {
  const element = document.querySelector(targetSelector);
  if (!element) return;
  const headerOffset = 80;
  const elementPosition = element.offsetTop;
  const offsetPosition = elementPosition - headerOffset;
  window.scrollTo({ top: offsetPosition, behavior: "smooth" });
}
