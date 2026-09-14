
(function () {
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const toastEl = $("[data-toast]");
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = msg;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }

  // Mobile nav
  const toggle = $("[data-nav-toggle]");
  const nav = $("[data-nav]");
  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
    $$("a", nav).forEach((a) => a.addEventListener("click", () => nav.classList.remove("open")));
  }

  // Open / closed badge (simple weekday heuristic)
  $$("[data-open-badge]").forEach((badge) => {
    const d = new Date().getDay(); // 0 Sun
    const hour = new Date().getHours();
    let open = hour >= 9 && hour < 18 && d >= 1 && d <= 5;
    if (d === 0 || d === 6) open = hour >= 10 && hour < 17;
    badge.textContent = open ? "Open now" : "Likely closed";
    badge.classList.add(open ? "" : "closed");
    if (!open) badge.classList.add("closed");
  });

  // Copy email
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const val = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(val);
        showToast("Copied " + val);
      } catch {
        showToast(val);
      }
    });
  });

  // Booking modal
  const modal = $("[data-book-modal]");
  const prefField = () => {
    let el = modal && modal.querySelector("[name='message']");
    return el;
  };
  function openBook(pref) {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const msg = prefField();
    if (msg && pref) {
      const cur = msg.value.trim();
      msg.value = cur ? cur + "\\nInterested in: " + pref : "Interested in: " + pref;
    }
  }
  function closeBook() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  $$("[data-open-book]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openBook(btn.getAttribute("data-pref") || "");
    });
  });
  const closeBtn = $("[data-close-book]");
  if (closeBtn) closeBtn.addEventListener("click", closeBook);
  if (modal) {
    modal.addEventListener("click", (e) => { if (e.target === modal) closeBook(); });
  }

  function saveInbox(payload) {
    try {
      const key = "biz_support_inbox";
      const box = JSON.parse(localStorage.getItem(key) || "[]");
      box.unshift(payload);
      localStorage.setItem(key, JSON.stringify(box.slice(0, 50)));
    } catch (_) {}
  }

  // Contact form
  const contact = $("[data-contact]");
  const success = $("[data-success]");
  const again = $("[data-again]");
  if (contact) {
    contact.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(contact);
      saveInbox({
        to: contact.getAttribute("data-support") || "support",
        name: fd.get("name") || "",
        email: fd.get("email") || "",
        phone: fd.get("phone") || "",
        topic: fd.get("topic") || "",
        when: fd.get("when") || "",
        message: fd.get("message") || "",
        at: new Date().toISOString(),
      });
      contact.reset();
      contact.hidden = true;
      if (success) success.hidden = false;
      showToast("Message sent to support");
    });
  }
  if (again && contact && success) {
    again.addEventListener("click", () => {
      success.hidden = true;
      contact.hidden = false;
    });
  }

  // Quick book form
  const quick = $("[data-quick-book]");
  if (quick) {
    quick.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(quick);
      saveInbox({
        to: quick.getAttribute("data-support") || "support",
        topic: "Quick book",
        name: fd.get("name") || "",
        email: fd.get("email") || "",
        when: fd.get("when") || "",
        message: fd.get("message") || "",
        at: new Date().toISOString(),
      });
      quick.reset();
      closeBook();
      showToast("Booking request sent");
    });
  }

  // Newsletter
  const news = $("[data-newsletter]");
  if (news) {
    news.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = (new FormData(news).get("email") || "").toString();
      try {
        const key = "biz_newsletter";
        const list = JSON.parse(localStorage.getItem(key) || "[]");
        if (email && !list.includes(email)) list.push(email);
        localStorage.setItem(key, JSON.stringify(list));
      } catch (_) {}
      showToast("You're on the list");
      news.reset();
    });
  }

  // Save / filter offerings
  const SAVE_KEY = "biz_saved_items";
  function getSaved() {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY) || "[]"); } catch { return []; }
  }
  function setSaved(arr) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(arr));
    renderSaved();
  }
  function renderSaved() {
    const tray = $("[data-saved-tray]");
    const list = $("[data-saved-list]");
    if (!tray || !list) return;
    const items = getSaved();
    tray.hidden = items.length === 0;
    list.innerHTML = items.map((x) => "<li>" + x + "</li>").join("");
    $$("[data-item]").forEach((card) => {
      card.classList.toggle("is-saved", items.includes(card.getAttribute("data-item")));
    });
  }
  $$("[data-save-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-name") || "";
      let items = getSaved();
      if (items.includes(name)) items = items.filter((x) => x !== name);
      else items.push(name);
      setSaved(items);
      showToast(items.includes(name) ? "Saved: " + name : "Removed");
    });
  });
  const clearSaved = $("[data-clear-saved]");
  if (clearSaved) clearSaved.addEventListener("click", () => setSaved([]));
  const fromList = $("[data-pref-from-list]");
  if (fromList) {
    fromList.addEventListener("click", (e) => {
      e.preventDefault();
      openBook(getSaved().join(", "));
    });
  }
  const filter = $("[data-filter-offer]");
  if (filter) {
    filter.addEventListener("input", () => {
      const q = filter.value.toLowerCase().trim();
      $$("[data-item]").forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.classList.toggle("is-hidden", q && !text.includes(q));
      });
    });
  }
  renderSaved();

  // Gallery lightbox
  const lb = $("[data-lightbox]");
  const lbImg = $("[data-lightbox-img]");
  let gallery = [];
  let idx = 0;
  const galRoot = $("[data-gallery-list]");
  if (galRoot) gallery = (galRoot.getAttribute("data-gallery-list") || "").split(",").filter(Boolean);
  function showLb(i) {
    if (!lb || !lbImg || !gallery.length) return;
    idx = (i + gallery.length) % gallery.length;
    lbImg.src = gallery[idx];
    lb.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function hideLb() {
    if (!lb) return;
    lb.hidden = true;
    document.body.style.overflow = "";
  }
  $$("[data-gallery-open]").forEach((btn) => {
    btn.addEventListener("click", () => showLb(Number(btn.getAttribute("data-index") || 0)));
  });
  const lbClose = $("[data-lightbox-close]");
  if (lbClose) lbClose.addEventListener("click", hideLb);
  const lbPrev = $("[data-lightbox-prev]");
  const lbNext = $("[data-lightbox-next]");
  if (lbPrev) lbPrev.addEventListener("click", () => showLb(idx - 1));
  if (lbNext) lbNext.addEventListener("click", () => showLb(idx + 1));
  if (lb) lb.addEventListener("click", (e) => { if (e.target === lb) hideLb(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeBook(); hideLb(); }
    if (!lb || lb.hidden) return;
    if (e.key === "ArrowLeft") showLb(idx - 1);
    if (e.key === "ArrowRight") showLb(idx + 1);
  });
})();
