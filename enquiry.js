/* SDL Product Enquiry v1.1 | square-design-lab */
(function () {
  if (window.__SDL_ENQUIRY_LOADED) return;
  window.__SDL_ENQUIRY_LOADED = true;

  var C = window.SDL_ENQUIRY_CONFIG || {};

  /* ── defaults ─────────────────────────────────────────────────────────── */
  var D = {
    mode: "quote-cart",
    fieldName: "Cart",
    formPageUrl: "",

    addToCartLabel: "Add to Quote",
    quoteBtnLabel: "Request Quote",
    singleEnquiryLabel: "Enquire Now",
    cartPageTitle: "Quote List",

    hidePrice: false,

    filterByTag: false,
    enquiryTag: "enquiry",
    excludeTag: "",

    emptyCartMessage: "Your quote list is empty.",

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

  var _nativeBtnStyles = null;

  function captureNativeButtonStyles() {
    if (_nativeBtnStyles) return;
    var nativeBtn = document.querySelector(S.addToCartBtn);
    if (!nativeBtn) return;
    var cs = window.getComputedStyle(nativeBtn);
    _nativeBtnStyles = {
      backgroundColor: cs.backgroundColor,
      color: cs.color,
      borderRadius: cs.borderRadius,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      letterSpacing: cs.letterSpacing,
      textTransform: cs.textTransform,
      padding: cs.padding,
      border: cs.border
    };
  }

  function applyNativeStyle(btn) {
    if (!_nativeBtnStyles) return;
    var s = _nativeBtnStyles;
    btn.style.backgroundColor = s.backgroundColor;
    btn.style.color = s.color;
    btn.style.borderRadius = s.borderRadius;
    btn.style.fontSize = s.fontSize;
    btn.style.fontFamily = s.fontFamily;
    btn.style.fontWeight = s.fontWeight;
    btn.style.letterSpacing = s.letterSpacing;
    btn.style.textTransform = s.textTransform;
    btn.style.padding = s.padding;
    btn.style.border = s.border;
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

  /* ── rename store-page buttons for single-product mode ────────────────── */
  function setupStorePageEnquiryLinks() {
    var btns = document.querySelectorAll(S.addToCartBtn);
    log("Store page (single): found", btns.length, "add-to-cart buttons");

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
        textSpan.innerText = cfg("singleEnquiryLabel");
      } else {
        var inner = btn.querySelector(".sqs-add-to-cart-button-inner");
        if (inner) inner.innerText = cfg("singleEnquiryLabel");
      }

      var listItem = btn.closest(S.productListItem);
      if (listItem) {
        var link = listItem.querySelector("a[href*='/p/']");
        if (link) {
          btn.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = link.href;
          }, true);
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

  /* ── bundled sdl$ content-pulling utilities ────────────────────────────── */
  var sdl = (function () {
    function safe(fn) { try { return fn(); } catch (e) { console.warn("[SDL]", e); } }

    function getFragment(url) {
      var fetchUrl = url + (url.indexOf("?") !== -1 ? "&" : "?") + "format=html";
      return fetch(fetchUrl, { credentials: "same-origin", cache: "no-store" })
        .then(function (res) {
          if (!res.ok) throw new Error("Fetch failed: " + res.status);
          return res.text();
        })
        .then(function (html) {
          var doc = new DOMParser().parseFromString(html, "text/html");
          var found = doc.querySelector("#sections") ||
            doc.querySelector('[data-content-field="main-content"]') ||
            doc.querySelector("#page") || doc.body;
          if (!found) throw new Error("No content found at " + url);
          var node = document.importNode(found, true);
          var themeStyles = doc.querySelector("#sectionThemesStyles");
          if (themeStyles) {
            var clone = document.importNode(themeStyles, true);
            clone.removeAttribute("id");
            clone.className = "sdl-section-themes";
            node.appendChild(clone);
          }
          return node;
        });
    }

    function executeScripts(container) {
      if (!container) return Promise.resolve();
      var scripts = [];
      container.querySelectorAll("script:not([data-sdl-ran])").forEach(function (s) {
        var t = s.getAttribute("type");
        if (!t || t === "text/javascript" || t === "application/javascript") scripts.push(s);
      });
      return scripts.reduce(function (chain, old) {
        return chain.then(function () {
          return new Promise(function (resolve) {
            var script = document.createElement("script");
            Array.from(old.attributes).forEach(function (a) { script.setAttribute(a.name, a.value); });
            script.setAttribute("data-sdl-ran", "");
            if (old.src) {
              var done = false;
              var finish = function () { if (!done) { done = true; resolve(); } };
              script.onload = script.onerror = finish;
              setTimeout(finish, 5000);
              script.src = old.src;
              old.parentNode.replaceChild(script, old);
            } else {
              script.textContent = old.textContent || "";
              old.parentNode.replaceChild(script, old);
              resolve();
            }
          });
        });
      }, Promise.resolve());
    }

    function loadImages(el) {
      var loader = window.ImageLoader || (window.Squarespace && window.Squarespace.ImageLoader);
      if (!loader || typeof loader.load !== "function") return;
      (el || document).querySelectorAll("img[data-src], img:not([src])").forEach(function (img) {
        safe(function () { loader.load(img, { load: true }); });
        img.classList.add("loaded");
      });
    }

    function reinitializeForms(scope) {
      if (!scope) return;
      var Y = window.Y;
      var Sqs = window.Squarespace;
      if (!Y || !Sqs) return;
      if (typeof Sqs.initializeWebsiteComponent === "function") {
        safe(function () { Sqs.initializeWebsiteComponent(Y); });
      }
      if (typeof Sqs.initializeFormBlocks === "function") {
        safe(function () { Sqs.initializeFormBlocks(Y, Y); });
      }
    }

    return { getFragment: getFragment, executeScripts: executeScripts, loadImages: loadImages, reinitializeForms: reinitializeForms };
  })();

  /* ── form popup (page-pulling approach) ──────────────────────────────── */
  function findTextareaByLabel(scope, fieldName) {
    var labels = scope.querySelectorAll("label.title");
    var i, parent, ta;
    for (i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim().toLowerCase() === fieldName.toLowerCase()) {
        parent = labels[i].parentElement;
        ta = parent ? parent.querySelector("textarea") : null;
        if (ta) return ta;
      }
    }
    labels = scope.querySelectorAll("label");
    for (i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim().toLowerCase().indexOf(fieldName.toLowerCase()) !== -1) {
        var forId = labels[i].getAttribute("for");
        if (forId) {
          var byId = scope.querySelector("#" + CSS.escape(forId));
          if (byId && byId.tagName === "TEXTAREA") return byId;
        }
        parent = labels[i].closest(".form-item, .field-element, .form-field");
        ta = parent ? parent.querySelector("textarea") : null;
        if (ta) return ta;
      }
    }
    return null;
  }

  function openFormPopup(fillCallback) {
    var formUrl = cfg("formPageUrl");

    if (!formUrl) {
      var trigger = document.querySelector(S.footerLightbox);
      if (!trigger) { log("Footer lightbox handle not found"); return; }
      trigger.click();
      setTimeout(function () {
        var area = findFormTextarea();
        if (area) fillCallback(area);
      }, cfg("executionDelay"));
      return;
    }

    var existing = document.querySelector(".sdl-form-overlay");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.className = "sdl-form-overlay";

    var popup = document.createElement("div");
    popup.className = "sdl-form-popup";

    var closeBtn = document.createElement("button");
    closeBtn.className = "sdl-form-close";
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", function () { overlay.remove(); });

    var content = document.createElement("div");
    content.className = "sdl-form-content";
    content.innerHTML = '<p style="text-align:center;color:#999;padding:40px 0">Loading form…</p>';

    popup.appendChild(closeBtn);
    popup.appendChild(content);
    overlay.appendChild(popup);

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });

    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") { overlay.remove(); document.removeEventListener("keydown", onEsc); }
    });

    document.body.appendChild(overlay);

    sdl.getFragment(formUrl).then(function (node) {
      content.innerHTML = "";
      content.appendChild(node);
      return sdl.executeScripts(content);
    }).then(function () {
      sdl.loadImages(content);
      sdl.reinitializeForms(content);
      setTimeout(function () {
        var ta = findTextareaByLabel(content, cfg("fieldName"));
        if (ta) fillCallback(ta);
      }, 800);
    }).catch(function (err) {
      content.innerHTML = '<p style="padding:20px;color:#c00">Failed to load form. Please try again.</p>';
      console.error("[SDL Enquiry] Form load error:", err);
    });
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
      applyNativeStyle(enquiryBtn);

      enquiryBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openSingleEnquiryForm();
      });

      btn.style.display = "none";

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
    openFormPopup(function (area) {
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
    });
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
      var chk = document.querySelector(S.cartCheckoutBtn);
      if (chk) chk.style.display = "none";
    });

    waitFor(S.cartFooter, function () {
      var footer = document.querySelector(S.cartFooter);
      if (footer.querySelector(".sdl-quote-btn")) return;

      var existing = document.querySelector(S.cartCheckoutBtn);
      if (existing) existing.style.display = "none";

      var btn = document.createElement("button");
      btn.className = "sqs-editable-button sqs-button-element--primary cart-checkout-button sdl-quote-btn";
      btn.type = "button";
      btn.innerText = cfg("quoteBtnLabel");
      applyNativeStyle(btn);

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openCartQuoteForm();
      });

      footer.appendChild(btn);
    });
  }

  function openCartQuoteForm() {
    openFormPopup(function (area) {
      if (cfg("filterByTag")) {
        fillCartDataFiltered(area);
      } else {
        fillCartDataAll(area);
      }
    });
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

    captureNativeButtonStyles();

    var trigger = document.querySelector(S.footerLightbox);
    if (trigger) trigger.classList.add("sdl-hidden");

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

    if (mode === "single-product") {
      if (isStorePage()) setupStorePageEnquiryLinks();
      setupSingleProductEnquiry();
    }

    if (mode === "both") {
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
