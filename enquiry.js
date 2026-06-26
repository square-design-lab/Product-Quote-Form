/* SDL Product Enquiry v1.0 | square-design-lab */
(function () {
  if (window.__SDL_ENQUIRY_LOADED) return;
  window.__SDL_ENQUIRY_LOADED = true;

  var C = window.SDL_ENQUIRY_CONFIG || {};

  /* ── defaults ─────────────────────────────────────────────────────────── */
  var D = {
    mode: "quote-cart",                    // "quote-cart" | "single-product" | "both"
    cartIconType: "cart",                  // "cart" | "heart"
    fieldName: "Cart",                     // label of hidden textarea in lightbox form

    // button labels
    addToCartLabel: "Add to Quote",
    quoteBtnLabel: "Request Quote",
    singleEnquiryLabel: "Enquire Now",
    cartPageTitle: "Quote List",

    // button visibility
    showAddToCart: false,                  // show native Add to Cart alongside enquire
    showCheckout: false,                   // show native Checkout alongside enquire
    hidePrice: false,                      // hide prices on product pages

    // per-product tag filtering
    filterByTag: false,
    enquiryTag: "enquiry",                 // products with this tag get enquiry button
    excludeTag: "",                        // products with this tag keep normal buy flow

    // empty cart
    emptyCartMessage: "Your quote list is empty.",
    returnToShopLabel: "Continue browsing",
    returnToShopLink: "/products",

    // email formatting
    includePrices: false,
    includeProductUrl: true,
    labelItem: "Item",
    labelTitle: "Title",
    labelVariant: "Variant(s)",
    labelSku: "SKU",
    labelQty: "Qty",
    labelPrice: "Price",
    labelTotal: "Total",
    summaryText: "Quote contains",

    // button styling
    btnBg: "",
    btnColor: "",
    btnRadius: "",
    btnFontSize: "",

    // behaviour
    executionDelay: 500,
    debugMode: false
  };

  function cfg(k) { return C[k] !== undefined ? C[k] : D[k]; }

  /* ── selectors ────────────────────────────────────────────────────────── */
  var S = {
    addToCartBtn: ".sqs-add-to-cart-button",
    addToCartInner: "div.sqs-add-to-cart-button .sqs-add-to-cart-button-inner:not(button.join-button .sqs-add-to-cart-button-inner)",
    cartCheckoutBtn: ".cart-checkout-button",
    cartFooter: ".cart-checkout",
    cartRow: ".cart-row",
    cartTitle: ".cart-row-title",
    cartVariant: ".cart-row-variants .cart-row-variant",
    cartQty: ".cart-row-qty-input",
    cartPrice: ".cart-row-price",
    cartSubtotal: ".cart-subtotal-price",
    cartPageTitle: ".cart-title",
    emptyMessage: ".empty-message",
    emptyContinueBtn: ".cart-continue-button",
    footerLightbox: "footer .lightbox-handle",
    formLabel: ".lightbox-inner label.title",
    formTextarea: "textarea",
    quickViewBtn: ".sqs-product-quick-view-button",
    quickViewLightbox: ".sqs-product-quick-view-lightbox",
    productPrice: ".product-price",
    productItem: ".products .grid-item, .ProductList-item, .product-list--item"
  };

  /* ── helpers ──────────────────────────────────────────────────────────── */
  function log() {
    if (cfg("debugMode")) console.log.apply(console, ["[SDL Enquiry]"].concat(Array.prototype.slice.call(arguments)));
  }

  function waitFor(sel, cb) {
    if (document.querySelector(sel)) { cb(); return; }
    var obs = new MutationObserver(function (_, o) {
      if (document.querySelector(sel)) { o.disconnect(); cb(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function triggerReact(el, val) {
    var desc = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
    desc.set.call(el, val);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function isProductPage() {
    return !!document.querySelector(".ProductItem") || !!document.querySelector("[data-product-type]");
  }

  function getProductTags() {
    var meta = document.querySelector("[data-product-tags]");
    if (meta) return meta.getAttribute("data-product-tags").toLowerCase().split(",").map(function (t) { return t.trim(); });
    var json = document.querySelector("script[type='application/ld+json']");
    if (json) {
      try {
        var d = JSON.parse(json.textContent);
        if (d.keywords) return d.keywords.toLowerCase().split(",").map(function (t) { return t.trim(); });
      } catch (e) { /* ignore */ }
    }
    return [];
  }

  function shouldApplyEnquiry() {
    if (!cfg("filterByTag")) return true;
    var tags = getProductTags();
    if (cfg("excludeTag") && tags.indexOf(cfg("excludeTag").toLowerCase()) !== -1) return false;
    return tags.indexOf(cfg("enquiryTag").toLowerCase()) !== -1;
  }

  function applyBtnStyle(btn) {
    if (cfg("btnBg")) btn.style.backgroundColor = cfg("btnBg");
    if (cfg("btnColor")) btn.style.color = cfg("btnColor");
    if (cfg("btnRadius")) btn.style.borderRadius = cfg("btnRadius");
    if (cfg("btnFontSize")) btn.style.fontSize = cfg("btnFontSize");
  }

  function getProductTitle() {
    var el = document.querySelector(".ProductItem-details-title, .product-title, h1.pdp-product-title");
    return el ? el.innerText.trim() : "";
  }

  function getProductUrl() {
    return window.location.pathname;
  }

  function getSelectedVariants() {
    var out = [];
    document.querySelectorAll(".product-variants .variant-option.variant-option--selected, .ProductItem-details .variant-select-wrapper select").forEach(function (el) {
      if (el.tagName === "SELECT") {
        if (el.value) out.push(el.value);
      } else {
        out.push(el.innerText.trim());
      }
    });
    return out.join(", ");
  }

  function getSelectedQty() {
    var inp = document.querySelector(".product-quantity-input input, .quantity-input input[type='number']");
    return inp ? inp.value : "1";
  }

  function getCurrentPrice() {
    var el = document.querySelector(".product-price, .ProductItem-details .sqs-money-native");
    return el ? el.innerText.trim() : "";
  }

  /* ── heart icon replacement ───────────────────────────────────────────── */
  function replaceCartIcons() {
    var heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
    document.querySelectorAll("svg.icon--cart, svg.Icon--cart").forEach(function (icon) {
      icon.classList.add("sdl-wishlist-icon");
      while (icon.firstChild) icon.removeChild(icon.firstChild);
      var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", heartPath);
      var c = "currentColor";
      var qty = icon.parentElement && icon.parentElement.querySelector(".icon-cart-quantity");
      if (qty) c = window.getComputedStyle(qty).color;
      p.setAttribute("fill", c);
      icon.appendChild(p);
      icon.setAttribute("viewBox", "0 0 24 24");
    });
  }

  /* ── single-product enquiry ───────────────────────────────────────────── */
  function setupSingleProductEnquiry() {
    if (!isProductPage()) return;
    if (cfg("filterByTag") && !shouldApplyEnquiry()) return;

    var btns = document.querySelectorAll(S.addToCartInner);
    if (!btns.length) return;

    btns.forEach(function (btn) {
      var parent = btn.closest(S.addToCartBtn);
      if (!parent || parent.querySelector(".sdl-enquiry-single-btn")) return;

      var enquiryBtn = document.createElement("button");
      enquiryBtn.className = "sqs-editable-button sqs-button-element--primary sdl-enquiry-single-btn";
      enquiryBtn.type = "button";
      enquiryBtn.innerText = cfg("singleEnquiryLabel");
      applyBtnStyle(enquiryBtn);

      enquiryBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSingleEnquiryForm();
      });

      if (cfg("showAddToCart") && cfg("mode") !== "quote-cart") {
        parent.parentNode.insertBefore(enquiryBtn, parent.nextSibling);
      } else {
        parent.style.display = "none";
        parent.parentNode.insertBefore(enquiryBtn, parent.nextSibling);
      }
    });

    if (cfg("hidePrice")) {
      document.querySelectorAll(S.productPrice).forEach(function (el) {
        el.style.display = "none";
      });
    }
  }

  function openSingleEnquiryForm() {
    var trigger = document.querySelector(S.footerLightbox);
    if (!trigger) { log("Footer lightbox handle not found"); return; }
    trigger.click();
    setTimeout(function () { fillSingleProductData(); }, cfg("executionDelay"));
  }

  function fillSingleProductData() {
    var area = findFormTextarea();
    if (!area) return;
    var data = "";
    data += cfg("labelTitle") + ": " + getProductTitle() + "\n";
    var variants = getSelectedVariants();
    if (variants) data += cfg("labelVariant") + ": " + variants + "\n";
    var qty = getSelectedQty();
    data += cfg("labelQty") + ": " + qty + "\n";
    if (cfg("includePrices")) {
      var price = getCurrentPrice();
      if (price) data += cfg("labelPrice") + ": " + price + "\n";
    }
    if (cfg("includeProductUrl")) data += "URL: " + window.location.origin + getProductUrl() + "\n";
    triggerReact(area, data);
  }

  /* ── quote-cart mode (product page label changes) ─────────────────────── */
  function setupQuoteCartProductPage() {
    var addBtns = document.querySelectorAll(S.addToCartInner);
    addBtns.forEach(function (btn) {
      btn.innerText = cfg("addToCartLabel");
    });

    if (cfg("hidePrice") && isProductPage()) {
      if (!cfg("filterByTag") || shouldApplyEnquiry()) {
        document.querySelectorAll(S.productPrice).forEach(function (el) {
          el.style.display = "none";
        });
      }
    }

    if (!cfg("showAddToCart") && isProductPage() && cfg("mode") === "both") {
      // in "both" mode with showAddToCart=false on product page, handled by setupSingleProductEnquiry
    }
  }

  /* ── quick-view support ───────────────────────────────────────────────── */
  function handleQuickView() {
    var obs = new MutationObserver(function (_, o) {
      var qv = document.querySelector(S.quickViewLightbox + " .sqs-add-to-cart-button-inner");
      if (qv) {
        var mode = cfg("mode");
        if (mode === "quote-cart" || mode === "both") {
          qv.innerText = cfg("addToCartLabel");
        }
        o.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  /* ── cart page ────────────────────────────────────────────────────────── */
  function setupCartPage() {
    if (!document.querySelector("#sqs-cart-container")) return;

    waitFor(S.cartPageTitle, function () {
      var t = document.querySelector(S.cartPageTitle);
      if (t) t.innerText = cfg("cartPageTitle");
    });

    waitFor(S.emptyMessage, function () {
      var msg = document.querySelector(S.emptyMessage);
      if (msg) msg.innerText = cfg("emptyCartMessage");
      var cont = document.querySelector(S.emptyContinueBtn);
      if (cont) {
        cont.innerText = cfg("returnToShopLabel");
        cont.href = cfg("returnToShopLink");
      }
      var chk = document.querySelector(S.cartCheckoutBtn);
      if (chk && !cfg("showCheckout")) chk.style.display = "none";
    });

    waitFor(S.cartFooter, function () {
      var footer = document.querySelector(S.cartFooter);
      if (footer.querySelector(".sdl-quote-btn")) return;

      if (!cfg("showCheckout")) {
        var existing = document.querySelector(S.cartCheckoutBtn);
        if (existing) existing.style.display = "none";
      }

      var btn = document.createElement("button");
      btn.className = "sqs-editable-button sqs-button-element--primary cart-checkout-button sdl-quote-btn";
      btn.type = "button";
      btn.innerText = cfg("quoteBtnLabel");
      applyBtnStyle(btn);

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openCartQuoteForm();
      });

      footer.appendChild(btn);
    });
  }

  function openCartQuoteForm() {
    var trigger = document.querySelector(S.footerLightbox);
    if (!trigger) { log("Footer lightbox handle not found"); return; }
    trigger.click();
    setTimeout(function () { fillCartData(); }, cfg("executionDelay"));
  }

  function fillCartData() {
    var area = findFormTextarea();
    if (!area) return;

    var rows = document.querySelectorAll(S.cartRow);
    var data = "";
    var total = 0;

    rows.forEach(function (row, i) {
      var title = (row.querySelector(S.cartTitle) || {}).innerText || "Unknown";
      var qty = (row.querySelector(S.cartQty) || {}).value || "1";
      var variants = Array.from(row.querySelectorAll(S.cartVariant)).map(function (v) { return v.innerText; }).join(", ");
      var price = (row.querySelector(S.cartPrice) || {}).innerText || "";
      var skuEl = row.querySelector(".cart-row-sku");
      var sku = skuEl ? skuEl.innerText : "";

      total += parseInt(qty, 10);

      data += cfg("labelItem") + " " + (i + 1) + ": " + title + "\n";
      if (sku) data += cfg("labelSku") + ": " + sku + "\n";
      if (variants) data += cfg("labelVariant") + ": " + variants + "\n";
      data += cfg("labelQty") + ": " + qty + "\n";
      if (cfg("includePrices") && price) data += cfg("labelPrice") + ": " + price + "\n";
      data += "----------------------\n";
    });

    data += "\n" + cfg("summaryText") + ": " + total + " item" + (total !== 1 ? "s" : "") + ".\n";
    triggerReact(area, data);
  }

  function findFormTextarea() {
    var labels = document.querySelectorAll(S.formLabel);
    var area = null;
    labels.forEach(function (lbl) {
      if (lbl.innerText.trim().indexOf(cfg("fieldName")) !== -1) {
        var id = lbl.getAttribute("for");
        if (id) area = document.getElementById(id);
      }
    });
    if (!area) log("Form field \"" + cfg("fieldName") + "\" not found");
    return area;
  }

  /* ── nav label + icon ─────────────────────────────────────────────────── */
  function updateNavLabels() {
    document.querySelectorAll(".Header .Cart .Cart-label, .Mobile-bar .Cart .Cart-label").forEach(function (el) {
      el.innerText = cfg("cartPageTitle");
    });
  }

  /* ── inject CSS overrides ─────────────────────────────────────────────── */
  function injectStyles() {
    var css = "";
    css += "footer .lightbox-handle.sdl-hidden{display:none!important}";
    css += ".sdl-enquiry-single-btn{margin-top:10px;cursor:pointer;width:100%;padding:14px 20px;border:none;font-family:inherit;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}";
    css += ".sdl-quote-btn{cursor:pointer;margin-top:8px;}";
    if (cfg("hidePrice") && !cfg("filterByTag")) {
      css += ".product-price,.ProductItem-details .product-price{display:none!important}";
    }
    var style = document.createElement("style");
    style.id = "sdl-enquiry-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── init ──────────────────────────────────────────────────────────────── */
  function init() {
    if (window.frameElement) return;
    log("Initialising — mode:", cfg("mode"));

    injectStyles();

    var trigger = document.querySelector(S.footerLightbox);
    if (trigger) trigger.classList.add("sdl-hidden");

    if (cfg("cartIconType") === "heart") replaceCartIcons();

    var mode = cfg("mode");

    if (mode === "quote-cart" || mode === "both") {
      updateNavLabels();
      setupQuoteCartProductPage();
      setupCartPage();
      document.querySelectorAll(S.quickViewBtn).forEach(function (btn) {
        btn.addEventListener("click", handleQuickView);
      });
    }

    if (mode === "single-product" || mode === "both") {
      setupSingleProductEnquiry();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  window.addEventListener("mercury:load", init);
})();
