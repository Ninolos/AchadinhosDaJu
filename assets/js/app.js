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

async function loadProducts() {
  const grid = document.getElementById("productsGrid");
  const pager = document.getElementById("pagination");
  if (!grid) return;

  const pageSize = 20;
  let currentPage = 1;
  let products = [];

  try {
    const res = await fetch("./assets/data/produtos.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar products.json");

    products = await res.json();

    function renderPage() {
      const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
      currentPage = Math.min(Math.max(1, currentPage), totalPages);

      const start = (currentPage - 1) * pageSize;
      const pageItems = products.slice(start, start + pageSize);

      grid.innerHTML = pageItems.map(renderProductCard).join("");

      if (pager) {
        pager.innerHTML = `
          <button class="pageBtn" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
          <span class="pageInfo">Página ${currentPage} de ${totalPages}</span>
          <button class="pageBtn" id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>Próxima</button>
        `;

        const prev = document.getElementById("prevPage");
        const next = document.getElementById("nextPage");

        if (prev) prev.onclick = () => { currentPage--; renderPage(); window.scrollTo({ top: grid.offsetTop - 20, behavior: "smooth" }); };
        if (next) next.onclick = () => { currentPage++; renderPage(); window.scrollTo({ top: grid.offsetTop - 20, behavior: "smooth" }); };
      }
    }

    renderPage();

  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="note">
        <strong>Ops:</strong> não consegui carregar os produtos agora. Tente novamente.
      </div>`;
    if (pager) pager.innerHTML = "";
  }
}


function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProductCard(p) {
  const title = escapeHtml(p.title);
  const desc = escapeHtml(p.description);
  const category = escapeHtml(p.category || "");
  const badge = escapeHtml(p.badge || "");

  // thumb: se tiver imageUrl usa imagem; se não, usa o gradient atual
  const thumbStyle = p.imageUrl
    ? `style="background-image:url('${escapeHtml(p.imageUrl)}')"`
    : "";

  // ✅ Suporta p.stores (array) OU o modelo antigo p.store/p.redirectUrl
  const stores = Array.isArray(p.stores) && p.stores.length
    ? p.stores
    : [{
        store: p.store,
        storeLabel: p.storeLabel,
        redirectUrl: p.redirectUrl
      }];

  const actionsHtml = stores.map(s => {
    const storeKey = (s.store || "").toLowerCase(); // 'ml' ou 'sp'
    const isML = storeKey === "ml";

    const storeClass = isML ? "btnML" : "btnSP";

    // ✅ Ajuste aqui o caminho real do svg:
    const storeIcon = isML ? "./assets/svg/ml.svg" : "./assets/svg/shopee.svg";

    const storeLabel = escapeHtml(s.storeLabel || (isML ? "Mercado Livre" : "Shopee"));
    const redirectUrl = escapeHtml(s.redirectUrl || "#");
    const storeText = isML ? "Comprar no Mercado Livre" : "Comprar na Shopee";

    return `
      <a class="btnSmall ${storeClass}"
         href="${redirectUrl}"
         data-product-id="${escapeHtml(p.id)}"
         data-product-name="${title}"
         data-product-store="${storeLabel}">
        <img class="storeIcon" src="${storeIcon}" alt="${storeLabel}">
        ${storeText}
      </a>
    `;
  }).join("");

  return `
    <article class="card">
      <div class="thumb ${p.imageUrl ? "thumbImg" : ""}" ${thumbStyle} role="img" aria-label="Imagem do produto"></div>

      <div class="cardBody">
        <div class="tagRow">
          ${badge ? `<span class="tag hot">${badge}</span>` : ""}
          ${category ? `<span class="tag">${category}</span>` : ""}
        </div>

        <h4>${title}</h4>
        <p>${desc}</p>

        <div class="cardActions">
          ${actionsHtml}
        </div>
      </div>
    </article>
  `;
}


// chama ao carregar
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});

