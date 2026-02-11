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
  const searchInput = document.getElementById("searchInput");
  if (!grid) return;

  const pageSize = 20;
  let currentPage = 1;
  let products = [];
  let filtered = [];

  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function applyFilter() {
    const q = normalize(searchInput?.value || "");

    if (!q) {
      filtered = products.slice();
    } else {
      filtered = products.filter(p => {
        const name = normalize(p.title);
        return name.includes(q);
        // Se quiser buscar também na descrição/categoria:
        // return name.includes(q) || normalize(p.description).includes(q) || normalize(p.category).includes(q);
      });
    }

    currentPage = 1;
    renderPage();
  }

  function renderPage() {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);

    const start = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize);

    grid.innerHTML = pageItems.map(renderProductCard).join("");

    if (pager) {
      pager.innerHTML = `
        <button class="pageBtn" id="prevPage" ${currentPage === 1 ? "disabled" : ""}>Anterior</button>
        <span class="pageInfo">Página ${currentPage} de ${totalPages}</span>
        <button class="pageBtn" id="nextPage" ${currentPage === totalPages ? "disabled" : ""}>Próxima</button>
      `;

      const prev = document.getElementById("prevPage");
      const next = document.getElementById("nextPage");

      if (prev) prev.onclick = () => { currentPage--; renderPage(); smoothScrollTo(grid.offsetTop - 20, 900); };
      if (next) next.onclick = () => { currentPage++; renderPage(); smoothScrollTo(grid.offsetTop - 20, 900); };
    }
  }

  try {
    const res = await fetch("./assets/data/produtos.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Não foi possível carregar products.json");

    products = await res.json();
    filtered = products.slice();

    renderPage();

    if (searchInput) {
      searchInput.addEventListener("input", applyFilter);
    }

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

function getStoreMeta(storeKey) {
  const key = String(storeKey || "").toLowerCase();

  if (key === "ml") {
    return {
      key: "ml",
      label: "Mercado Livre",
      btnClass: "btnML",
      icon: "./assets/svg/ml.svg",
      text: "Comprar no Mercado Livre"
    };
  }

  if (key === "sp") {
    return {
      key: "sp",
      label: "Shopee",
      btnClass: "btnSP",
      icon: "./assets/svg/shopee.svg",
      text: "Comprar na Shopee"
    };
  }

  if (key === "amz") {
    return {
      key: "amz",
      label: "Amazon",
      btnClass: "btnAMZ", // crie esse no CSS
      icon: "./assets/svg/amazon.svg",
      text: "Comprar na Amazon"
    };
  }

  // fallback
  return {
    key,
    label: "Loja",
    btnClass: "btnML",
    icon: "./assets/svg/ml.svg",
    text: "Comprar"
  };
}

function renderStoreButton(storeKey, storeLabel, productId) {
  const meta = getStoreMeta(storeKey);

  const label = escapeHtml(storeLabel || meta.label);
  const redirectUrl = `./p/produto.html?id=${encodeURIComponent(productId)}&store=${encodeURIComponent(meta.key)}`;

  return `
    <a class="btnSmall ${meta.btnClass}"
       href="${redirectUrl}"
       data-product-id="${escapeHtml(productId)}"
       data-product-name="${escapeHtml(storeLabel || "")}"
       data-product-store="${label}">
      <img class="storeIcon" src="${meta.icon}" alt="${label}">
      ${meta.text}
    </a>
  `;
}

function renderProductCard(p) {
  const title = escapeHtml(p.title);
  const desc = escapeHtml(p.description);
  const category = escapeHtml(p.category || "");
  const badge = escapeHtml(p.badge || "");

  const thumbStyle = p.imageUrl
    ? `style="background-image:url('${escapeHtml(p.imageUrl)}')"`
    : "";

  // ✅ usa sempre p.stores
  const stores = Array.isArray(p.stores) ? p.stores : [];

  // ✅ ordena na ordem: ML, Shopee, Amazon (se existir)
  const order = { ml: 1, sp: 2, amz: 3 };
  const storesSorted = stores
    .filter(s => s && s.store && s.affiliateUrl) // só as válidas
    .sort((a, b) => (order[(a.store || "").toLowerCase()] || 99) - (order[(b.store || "").toLowerCase()] || 99));

  const actionsHtml = storesSorted.map(s => {
    const storeKey = (s.store || "").toLowerCase();
    return renderStoreButton(storeKey, s.storeLabel, p.id);
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


function getDayKey() {
  // dia no fuso do usuário (suficiente para seu caso)
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function hashToIndex(str, max) {
  // hash simples e estável
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return max ? (h % max) : 0;
}



async function loadDailyProduct() {
  const nameEl = document.getElementById("dailyName");
  const descEl = document.getElementById("dailyDesc");
  const imgEl  = document.getElementById("dailyImg");
  const actionsEl = document.getElementById("dailyActions");
  if (!nameEl || !descEl || !imgEl || !actionsEl) return;

  try {
    const res = await fetch("./assets/data/produtos.json", { cache: "no-store" });
    if (!res.ok) throw new Error("Falha ao carregar produtos.json");

    const products = await res.json();
    if (!Array.isArray(products) || products.length === 0) return;

    // ✅ escolhe 1 produto fixo por dia (determinístico)
    const dayKey = getDayKey();
    const idx = hashToIndex(dayKey, products.length);
    const p = products[idx];

    nameEl.textContent = p.title || "Produto do dia";
    descEl.textContent = p.description || "Confira a oferta selecionada de hoje.";

    // imagem
    if (p.imageUrl) {
      imgEl.style.backgroundImage = `url('${p.imageUrl}')`;
    } else {
      imgEl.style.backgroundImage = ""; // mantém o visual padrão
    }

    // botões (suporta p.stores ou o modelo antigo)
    const stores = Array.isArray(p.stores) && p.stores.length
      ? p.stores
      : [{
          store: p.store,
          storeLabel: p.storeLabel,
          redirectUrl: p.redirectUrl
        }];

    const storesArr = Array.isArray(p.stores) ? p.stores : [];

    const order = { ml: 1, sp: 2, amz: 3 };
    const buttonsHtml = storesArr
      .filter(s => s && s.store && s.affiliateUrl)
      .sort((a, b) => (order[(a.store || "").toLowerCase()] || 99) - (order[(b.store || "").toLowerCase()] || 99))
      .slice(0, 3) // pode mostrar os 3
      .map(s => renderStoreButton((s.store || "").toLowerCase(), s.storeLabel, p.id))
      .join("");

    actionsEl.innerHTML = buttonsHtml || "";

    // (opcional) evento no GA quando renderiza o produto do dia
    if (typeof gtag === "function") {
      gtag("event", "daily_product_show", {
        product_name: p.title || "",
        day: dayKey
      });
    }

  } catch (err) {
    console.error("Daily product error:", err);
  }
}



// chama ao carregar
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadDailyProduct();

  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});

