/* global gtag */
(function () {
  // Ano no footer
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Track navegação (chips e footer)
  document.addEventListener("click", function (e) {
    var link = e.target.closest("a");
    if (!link) return;

    // Navegação interna
    var nav = link.getAttribute("data-nav");
    if (nav) {
      safeEvent("nav_click", { section: nav });
      return;
    }

    // CTAs
    var cta = link.getAttribute("data-cta");
    if (cta) {
      safeEvent("cta_click", { action: cta });
      return;
    }

    // Produto
    var productName = link.getAttribute("data-product-name");
    if (productName) {
      safeEvent("product_click", {
        product_name: productName,
        store: link.getAttribute("data-product-store") || "",
        redirect_path: link.getAttribute("data-product-path") || link.getAttribute("href") || ""
      });
      return;
    }
  });

  function safeEvent(eventName, params) {
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName, params || {});
      }
    } catch (err) {
      // silencioso
    }
  }
})();
