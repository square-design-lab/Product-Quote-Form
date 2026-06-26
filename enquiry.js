/* SDL Product Enquiry v1.0 | square-design-lab */
(function () {
  if (window.__SDL_ENQUIRY_LOADED) return;
  window.__SDL_ENQUIRY_LOADED = true;

  var C = window.SDL_ENQUIRY_CONFIG || {};

  /* ── defaults ─────────────────────────────────────────────────────────── */
  var D = {
    mode: "quote-cart",
    cartIconType: "cart",
    fieldName: "Cart",

    addToCartLabel: "Add to Quote",
    quoteBtnLabel: "Request Quote",
    singleEnquiryLabel: "Enquire Now",
    cartPageTitle: "Quote List",

    showAddToCart: false,
    showCheckout: false,
    hidePrice: false,

    filterByTag: false,
    enquiryTag: "enquiry",
    excludeTag: "",

    emptyCartMessage: "Your quote list is empty.",
    returnToShopLabel: "Continue browsing",
    returnToShopLink: "/products",

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

    btnBg: "",
    btnColor: "",
    btnRadius: "",
    btnFontSize: "",

    executionDelay: 500,
    debugMode: false
  };

  function cfg(k) { return C[k] !== undefined ? C[k] : D[k]; }

  /* ── selectors ────────────────────────────────────────────────────────── */
  var S = {
    addToCartBtn: ".sqs-add-to-cart-button",
    addToCartText: ".sqs-add-to-cart-button .add-to-cart-text",
    addToCartInner: ".sqs-add-to-cart-button .sqs-add-to-cart-button-inner",
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
    quickViewBtn: ".sqs-product-quick-view-button",
    quickViewLightbox: ".sqs-product-quick-view-lightbox",
    productPrice: ".product-price, .product-list-item-price",
    productListItem: ".product-list-item"
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
    var path = window.location.pathname;
    return /\/p\//.test(path) || !!document.querySelector(".ProductItem");
  }

  function isStorePage() {
    return !!document.querySelector(S.productListItem);
  }

  function slugify(tag) {
    return tag.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function itemHasTag(el, tag) {
    var listItem = el.closest(S.productListItem);
    if (!listItem) return false;
    return listItem.classList.contains("tag-" + slugify(tag));
  }

  function itemHasExcludeTag(el) {
    var exTag = cfg("excludeTag");
    if (!exTag) return false;
    var listItem = el.closest(S.productListItem);
    if (!listItem) return false;
    return listItem.classList.contains("tag-" + slugify(exTag));
  }

  function shouldApplyToItem(el) {
    if (!cfg("filterByTag")) return true;
    if (itemHasExcludeTag(el)) return false;
    return itemHasTag(el, cfg("enquiryTag"));
  }

  function productPageHasTag() {
    if (!cfg("filterByTag")) return true;
    var tag = slugify(cfg("enquiryTag"));
    var cls = "tag-" + tag;
    if (document.querySelector(".product-detail." + cls)) return true;
    if ((document.body.className || "").indexOf(cls) !== -1) return true;
    return false;
  }

  /* ── quote-item tracking (localStorage) ────────────────────────────── */
  var STORE_KEY = "sdl_quote_items";

  function getTrackedItems() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); } catch (e) { return {}; }
  }

  function trackQuoteItem(productId, title) {
    if (!productId && !title) return;
    var items = getTrackedItems();
    var key = productId || ("title:" + title);
    items[key] = title || "";
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
    log("Tracked quote item:", key, title);
  }

  function isTrackedQuoteItem(productId, title) {
    if (!cfg("filterByTag")) return true;
    var items = getTrackedItems();
    if (productId && items[productId] !== undefined) return true;
    if (title) {
      var tracked = Object.values(items);
      for (var i = 0; i < tracked.length; i++) {
        if (tracked[i] && tracked[i].toLowerCase() === title.toLowerCase()) return true;
      }
    }
    return false;
  }

  function applyBtnStyle(btn) {
    if (cfg("btnBg")) btn.style.backgroundColor = cfg("btnBg");
    if (cfg("btnColor")) btn.style.color = cfg("btnColor");
    if (cfg("btnRadius")) btn.style.borderRadius = cfg("btnRadius");
    if (cfg("btnFontSize")) btn.style.fontSize = cfg("btnFontSize");
  }

  function getProductTitle() {
    var el = document.querySelector(".ProductItem-details-title, .product-title, h1.pdp-product-title, [data-test='product-title']");
    return el ? el.innerText.trim() : "";
  }

  function getSelectedVariants() {
    var out = [];
    document.querySelectorAll(".product-variants .variant-option.variant-option--selected, .variant-select-wrapper select").forEach(function (el) {
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
    var el = document.querySelector(".product-price, .sqs-money-native");
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

  /* ── rename add-to-cart on store/listing pages ────────────────────────── */
  function setupStorePageButtons() {
    var btns = document.querySelectorAll(S.addToCartBtn);
    log("Store page: found", btns.length, "add-to-cart buttons");

    btns.forEach(function (btn) {
      if (btn.closest(".sqs-product-quick-view-lightbox")) return;

      if (cfg("filterByTag")) {
        if (!shouldApplyToItem(btn)) {
          log("Skipping button — product not tagged");
          return;
        }
      }

      var textSpan = btn.querySelector(".add-to-cart-text");
      if (textSpan) {
        textSpan.innerText = cfg("addToCartLabel");
        log("Renamed button to:", cfg("addToCartLabel"));
      } else {
        var inner = btn.querySelector(".sqs-add-to-cart-button-inner");
        if (inner) inner.innerText = cfg("addToCartLabel");
      }

      if (cfg("filterByTag")) {
        var listItem = btn.closest(S.productListItem);
        if (listItem) {
          var itemId = listItem.getAttribute("data-product-id") || listItem.getAttribute("data-item-id") || "";
          var titleEl = listItem.querySelector(".product-list-item-title, .product-list-title");
          var title = titleEl ? titleEl.textContent.trim() : "";
          btn.addEventListener("click", function () { trackQuoteItem(itemId, title); });
        }
      }
    });

    if (cfg("hidePrice") && cfg("filterByTag")) {
      document.querySelectorAll(S.productListItem).forEach(function (item) {
        if (item.classList.contains("tag-" + slugify(cfg("enquiryTag")))) {
          var prices = item.querySelectorAll(".product-price, .product-list-item-price");
          prices.forEach(function (p) { p.style.display = "none"; });
        }
      });
    } else if (cfg("hidePrice")) {
      document.querySelectorAll(".product-price, .product-list-item-price").forEach(function (p) {
        p.style.display = "none";
      });
    }
  }

  /* ── rename add-to-cart on individual product page ────────────────────── */
  function setupProductPageButtons() {
    if (!isProductPage()) return;
    if (cfg("filterByTag") && !productPageHasTag()) {
      log("Product page: tag not found, keeping normal flow");
      return;
    }

    var btns = document.querySelectorAll(S.addToCartBtn);
    btns.forEach(function (btn) {
      var textSpan = btn.querySelector(".add-to-cart-text");
      if (textSpan) {
        textSpan.innerText = cfg("addToCartLabel");
      } else {
        var inner = btn.querySelector(".sqs-add-to-cart-button-inner");
        if (inner) inner.innerText = cfg("addToCartLabel");
      }

      if (cfg("filterByTag")) {
        var detail = document.querySelector(".product-detail");
        var itemId = detail ? (detail.getAttribute("data-product-id") || detail.getAttribute("data-item-id") || "") : "";
        var title = getProductTitle();
        btn.addEventListener("click", function () { trackQuoteItem(itemId, title); });
      }
    });

    if (cfg("hidePrice")) {
      document.querySelectorAll(S.productPrice).forEach(function (el) {
        el.style.display = "none";
      });
    }
  }

  /* ── single-product enquiry ───────────────────────────────────────────── */
  function setupSingleProductEnquiry() {
    if (!isProductPage()) return;
    if (cfg("filterByTag") && !productPageHasTag()) return;

    var btns = document.querySelectorAll(S.addToCartBtn);
    if (!btns.length) return;

    btns.forEach(function (btn) {
      if (btn.closest(".sqs-product-quick-view-lightbox")) return;
      var wrapper = btn.closest(".sqs-add-to-cart-button-wrapper") || btn.parentElement;
      var controlsRow = wrapper.closest(".product-purchase-controls-wrapper") || wrapper.parentElement;
      if (controlsRow.parentElement && controlsRow.parentElement.querySelector(".sdl-enquiry-single-btn")) return;

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

      if (!cfg("showAddToCart")) {
        btn.style.display = "none";
      }

      var insertTarget = controlsRow.parentElement || controlsRow;
      insertTarget.insertBefore(enquiryBtn, controlsRow.nextSibling);
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
    if (cfg("includeProductUrl")) data += "URL: " + window.location.origin + window.location.pathname + "\n";
    triggerReact(area, data);
  }

  /* ── quick-view support ───────────────────────────────────────────────── */
  function handleQuickView() {
    var obs = new MutationObserver(function (_, o) {
      var qv = document.querySelector(S.quickViewLightbox + " .add-to-cart-text");
      if (!qv) qv = document.querySelector(S.quickViewLightbox + " .sqs-add-to-cart-button-inner");
      if (qv) {
        qv.innerText = cfg("addToCartLabel");
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

    if (cfg("filterByTag")) {
      fillCartDataFiltered(area);
    } else {
      fillCartDataAll(area);
    }
  }

  function fillCartDataAll(area) {
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

  function fillCartDataFiltered(area) {
    var rows = document.querySelectorAll(S.cartRow);
    var data = "";
    var total = 0;
    var itemNum = 0;

    rows.forEach(function (row) {
      var title = (row.querySelector(S.cartTitle) || {}).innerText || "Unknown";

      if (!isTrackedQuoteItem("", title)) {
        log("Cart: skipping non-quote item:", title);
        return;
      }

      var qty = (row.querySelector(S.cartQty) || {}).value || "1";
      var variants = Array.from(row.querySelectorAll(S.cartVariant)).map(function (v) { return v.innerText; }).join(", ");
      var price = (row.querySelector(S.cartPrice) || {}).innerText || "";
      var skuEl = row.querySelector(".cart-row-sku");
      var sku = skuEl ? skuEl.innerText : "";

      total += parseInt(qty, 10);
      itemNum++;

      data += cfg("labelItem") + " " + itemNum + ": " + title + "\n";
      if (sku) data += cfg("labelSku") + ": " + sku + "\n";
      if (variants) data += cfg("labelVariant") + ": " + variants + "\n";
      data += cfg("labelQty") + ": " + qty + "\n";
      if (cfg("includePrices") && price) data += cfg("labelPrice") + ": " + price + "\n";
      data += "----------------------\n";
    });

    if (itemNum === 0) {
      data = "No quote items in cart.\n";
    } else {
      data += "\n" + cfg("summaryText") + ": " + total + " item" + (total !== 1 ? "s" : "") + ".\n";
    }
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
    if (document.getElementById("sdl-enquiry-styles")) return;
    var css = "";
    css += "footer .lightbox-handle.sdl-hidden{display:none!important}";
    css += ".sdl-enquiry-single-btn{margin-top:10px;cursor:pointer;width:100%;padding:14px 20px;border:none;font-family:inherit;font-weight:600;letter-spacing:.04em;text-transform:uppercase;}";
    css += ".sdl-quote-btn{cursor:pointer;margin-top:8px;}";
    var style = document.createElement("style");
    style.id = "sdl-enquiry-styles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ── init ──────────────────────────────────────────────────────────────── */
  function init() {
    if (window.frameElement) return;
    log("Initialising — mode:", cfg("mode"), "filterByTag:", cfg("filterByTag"), "enquiryTag:", cfg("enquiryTag"));

    injectStyles();

    var trigger = document.querySelector(S.footerLightbox);
    if (trigger) trigger.classList.add("sdl-hidden");

    if (cfg("cartIconType") === "heart") replaceCartIcons();

    var mode = cfg("mode");

    if (mode === "quote-cart" || mode === "both") {
      updateNavLabels();
      if (isStorePage()) setupStorePageButtons();
      if (isProductPage()) setupProductPageButtons();
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
