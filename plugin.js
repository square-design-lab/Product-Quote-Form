/**
 * SDL PRODUCT ENQUIRY CONFIGURATION
 * Settings for the Quote Request functionality.
 */
const sdlProductEnquiry = {
    // FORM SETTINGS
    fieldName: "Cart",                 // Must match the Label of the Field in your Footer Form
    targetFormPage: "Cart",            // The title you want for the Cart Page (e.g., "Quote List")

    // VISUAL SETTINGS
    cartIconType: "cart",              // Options: 'heart' or 'cart'
    quoteBtnLabel: "Request Quote",    // Label for the button in the Cart Footer
    addToCartLabel: "Add to Quote",    // Label for "Add to Cart" buttons on product pages

    // BEHAVIOR
    primaryDomain: "https://www.vivaformainnovations.com",
    emptyCartMessage: "Your quote list is empty.",
    returnToShopLabel: "Continue browsing",
    returnToShopLink: "/products",
    underlineLinks: true,
    includePrices: false,              // Set to true if you want prices in the quote email

    // EMAIL FORMATTING LABELS
    labelItem: "Item",
    labelTitle: "Title",
    labelVariant: "Variant(s)",
    labelSku: "SKU",
    labelQty: "Qty",
    labelPrice: "Price",
    labelTotal: "Total",
    summaryText: "Quote contains",     // "Quote contains X items..."

    // DEBUGGING
    debugMode: false,                  // Set to true to see logs in browser console
    executionDelay: 500,               // Delay in ms to ensure elements are loaded

    // DOM SELECTORS (Standard Squarespace 7.0/7.1 Selectors)
    selectors: {
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
        footerLightboxHandle: "footer .lightbox-handle", // The hidden form trigger
        formLabelTitle: ".lightbox-inner label.title",
        formTextarea: "textarea",
        quickViewBtn: ".sqs-product-quick-view-button",
        quickViewLightbox: ".sqs-product-quick-view-lightbox"
    }
};

/**
 * UTILITY: TRIGGER REACT CHANGE
 * Forces Squarespace/React to recognize when we programmatically change a form field.
 */
function sdlTriggerReactChange(element, value) {
    const descriptor = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
    descriptor.set.call(element, value);
    const event = new Event("input", { bubbles: true });
    element.dispatchEvent(event);
}

/**
 * UTILITY: WAIT FOR ELEMENT
 * Watches the DOM until a specific element exists.
 */
function sdlWaitForElement(selector, callback) {
    if (document.querySelector(selector)) {
        callback();
        return;
    }

    const observer = new MutationObserver((mutations, obs) => {
        if (document.querySelector(selector)) {
            obs.disconnect();
            callback();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * INITIALIZATION
 * Main entry point for the script.
 */
function initSdlProductEnquiry() {
    const config = sdlProductEnquiry;
    if (config.debugMode) console.log("SDL Product Enquiry: Script Initialized.");

    // 1. Prevent running in Config Mode (Editing mode)
    if (window.frameElement) return;

    // 2. Hide the Footer Form Trigger (it should only be clicked via code)
    const footerTrigger = document.querySelector(config.selectors.footerLightboxHandle);
    if (footerTrigger) footerTrigger.style.display = "none";

    // 3. Rename Header/Nav Cart Labels
    const cartLabels = document.querySelectorAll(".Header .Cart .Cart-label, .Mobile-bar .Cart .Cart-label");
    cartLabels.forEach(el => el.innerText = config.targetFormPage);

    // 4. Update "Add to Cart" Buttons on Product Pages
    const addBtns = document.querySelectorAll(config.selectors.addToCartInner);
    addBtns.forEach(btn => btn.innerText = config.addToCartLabel);

    // 5. Update Quick View Buttons
    const qvBtns = document.querySelectorAll(config.selectors.quickViewBtn);
    qvBtns.forEach(btn => btn.addEventListener("click", sdlHandleQuickView));

    // 6. Handle Icon Replacement (Heart vs Cart)
    if (config.cartIconType === "heart") {
        sdlReplaceIconsWithHearts();
    }

    // 7. Cart Page Logic
    if (document.querySelector("#sqs-cart-container")) {
        sdlModifyCartPage();
    }
}

/**
 * HANDLE CART PAGE MODIFICATIONS
 */
function sdlModifyCartPage() {
    const config = sdlProductEnquiry;
    const sels = config.selectors;

    // Rename "Shopping Cart" title
    sdlWaitForElement(sels.cartPageTitle, () => {
        const title = document.querySelector(sels.cartPageTitle);
        if (title) title.innerText = config.targetFormPage;
    });

    // Handle Empty Cart Message
    sdlWaitForElement(sels.emptyMessage, () => {
        const msg = document.querySelector(sels.emptyMessage);
        if (msg) msg.innerText = config.emptyCartMessage;

        const contBtn = document.querySelector(sels.emptyContinueBtn);
        if (contBtn) {
            contBtn.innerText = config.returnToShopLabel;
            contBtn.href = config.returnToShopLink;
        }

        // Hide default checkout button if empty
        const defaultCheckout = document.querySelector(sels.cartCheckoutBtn);
        if (defaultCheckout) defaultCheckout.style.display = "none";
    });

    // Inject "Request Quote" Button
    sdlWaitForElement(sels.cartFooter, () => {
        const footer = document.querySelector(sels.cartFooter);

        // Create new button
        const btn = document.createElement("button");
        btn.className = "sqs-editable-button sqs-button-element--primary cart-checkout-button sdl-quote-btn";
        btn.innerText = config.quoteBtnLabel;

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            sdlOpenQuoteForm();
        });

        footer.appendChild(btn);
    });
}

/**
 * OPEN FORM & SCRAPE DATA
 */
function sdlOpenQuoteForm() {
    const config = sdlProductEnquiry;
    const trigger = document.querySelector(config.selectors.footerLightboxHandle);

    if (trigger) {
        trigger.click(); // Open the Lightbox

        // Wait a moment for the lightbox to render, then fill data
        setTimeout(() => {
            sdlFillFormWithData();
        }, config.executionDelay);
    } else {
        console.error("SDL Error: Footer Form Lightbox Handle not found.");
    }
}

/**
 * FILL FORM DATA
 * Scrapes the cart and puts text into the textarea.
 */
function sdlFillFormWithData() {
    const config = sdlProductEnquiry;

    // 1. Find the correct textarea based on Label Name
    const labels = document.querySelectorAll(config.selectors.formLabelTitle);
    let targetArea = null;

    labels.forEach(label => {
        if (label.innerText.trim().includes(config.fieldName)) {
            const fieldId = label.getAttribute("for");
            targetArea = document.querySelector(`#${fieldId}`);
        }
    });

    if (!targetArea) {
        if (config.debugMode) console.warn(`SDL: Could not find form field with label "${config.fieldName}"`);
        return;
    }

    // 2. Build the Quote String
    let quoteData = "";
    const rows = document.querySelectorAll(config.selectors.cartRow);
    let totalItems = 0;

    rows.forEach((row, index) => {
        // Scrape Item Details
        const title = row.querySelector(config.selectors.cartTitle)?.innerText || "Unknown";
        const qty = row.querySelector(config.selectors.cartQty)?.value || "1";
        const variants = Array.from(row.querySelectorAll(config.selectors.cartVariant)).map(v => v.innerText).join(", ");
        const price = row.querySelector(config.selectors.cartPrice)?.innerText || "";

        // Look for SKU (Standard or Custom)
        let sku = "";
        if (row.querySelector(".cart-row-sku")) sku = row.querySelector(".cart-row-sku").innerText;

        totalItems += parseInt(qty);

        // Format String
        quoteData += `${config.labelItem} ${index + 1}: ${title}\n`;
        if (sku) quoteData += `${config.labelSku}: ${sku}\n`;
        if (variants) quoteData += `${config.labelVariant}: ${variants}\n`;
        quoteData += `${config.labelQty}: ${qty}\n`;
        if (config.includePrices) quoteData += `${config.labelPrice}: ${price}\n`;
        quoteData += "----------------------\n";
    });

    // Add Summary
    quoteData += `\n${config.summaryText}: ${totalItems} items.\n`;

    // 3. Inject into Form
    sdlTriggerReactChange(targetArea, quoteData);
}

/**
 * HANDLE QUICK VIEW
 * Renames buttons inside the popup modal.
 */
function sdlHandleQuickView() {
    const config = sdlProductEnquiry;
    // Observer to wait for the modal to pop up
    const observer = new MutationObserver((mutations, obs) => {
        const qvBtn = document.querySelector(`${config.selectors.quickViewLightbox} .sqs-add-to-cart-button-inner`);
        if (qvBtn) {
            qvBtn.innerText = config.addToCartLabel;
            obs.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * REPLACE ICONS (Cart -> Heart)
 * SVG Path manipulation.
 */
function sdlReplaceIconsWithHearts() {
    const icons = document.querySelectorAll("svg.icon--cart, svg.Icon--cart");
    const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

    icons.forEach(icon => {
        icon.classList.add("sdl-wishlist-icon");
        // Clear existing paths
        while (icon.firstChild) { icon.removeChild(icon.firstChild); }

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", heartPath);

        // Match existing color styles
        let color = "currentColor";
        const qtyObj = icon.parentElement.querySelector(".icon-cart-quantity");
        if(qtyObj) color = window.getComputedStyle(qtyObj).color;

        path.setAttribute("fill", color);
        icon.appendChild(path);
        icon.setAttribute("viewBox", "0 0 24 24"); // Adjust viewbox for standard heart
    });
}

// EXECUTE ON LOAD
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSdlProductEnquiry);
} else {
    initSdlProductEnquiry();
}
window.addEventListener("mercury:load", initSdlProductEnquiry); // Squarespace Ajax Load Support