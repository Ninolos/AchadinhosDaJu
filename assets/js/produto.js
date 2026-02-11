(async function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const storeParam = params.get("store") || "ml"; // ?store=ml|shopee|amazon...

  if (!id) {
    document.title = "Produto não encontrado | Achadinhos da Ju";
    document.getElementById("productName").textContent = "Produto não encontrado";
    return;
  }

  const res = await fetch("../assets/data/produtos.json", { cache: "no-store" });
  const products = await res.json();

  const product = products.find(p => p.id === id);
  if (!product) {
    document.title = "Produto não encontrado | Achadinhos da Ju";
    document.getElementById("productName").textContent = "Produto não encontrado";
    return;
  }

  const storeKey = String(storeParam || "ml").toLowerCase();
  const storeInfo =
    (product.stores || []).find(s => String(s.store || "").toLowerCase() === storeKey) ||
    product.stores?.[0];

  const affiliateUrl = storeInfo?.affiliateUrl;

  if (!affiliateUrl) {
    document.title = "Link indisponível | Achadinhos da Ju";
    document.getElementById("productName").textContent = product.title;
    document.getElementById("productDesc").textContent = "Link indisponível no momento.";
    return;
  }

  // ========= UI =========
  document.title = `${product.title} | Achadinhos da Ju`;
  document.getElementById("productName").textContent = product.title;

  const img = document.getElementById("productImg");
  img.src = product.imageUrl;
  img.alt = product.title;

  document.getElementById("productDesc").textContent = product.description;

  const ctaEl = document.getElementById("cta");
  ctaEl.href = affiliateUrl;
  ctaEl.textContent = `Abrir ${storeInfo.storeLabel || "na loja"} agora`;

  // ========= TRACKING (GA4) =========
  function safeGtagEvent(eventName, paramsObj) {
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName, paramsObj || {});
      }
    } catch {}
  }

  // 1) Evento específico: "product_view" (fica perfeito pra relatórios)
  safeGtagEvent("product_view", {
    product_id: product.id,
    product_name: product.title,
    store: String(storeInfo.store || storeKey || ""),
    page_type: "product_redirect"
  });

  // 2) Pageview "virtual" com page_path único por produto
  // Isso faz o GA separar como se fosse /p/produto/<id>
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("id", product.id);
    url.searchParams.set("store", storeKey);

    safeGtagEvent("page_view", {
      page_title: document.title,
      page_location: url.toString(),
      page_path: `/p/produto/${product.id}` // 👈 chave para separar bonitinho
    });
  } catch {}

  // 3) Cliques/redirects com parâmetros por produto
  function trackOutbound(type) {
    safeGtagEvent(type, {
      event_category: "affiliate",
      product_id: product.id,
      product_name: product.title,
      store: String(storeInfo.store || storeKey || ""),
      outbound_url: affiliateUrl,
      transport_type: "beacon"
    });
  }

  // clique manual (fallback)
  ctaEl.addEventListener("click", () => trackOutbound("manual_click"));

  // ========= REDIRECT =========
  let seconds = 5;
  const countEl = document.getElementById("count");
  countEl.textContent = seconds;

  const timer = setInterval(() => {
    seconds--;
    countEl.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(timer);

      trackOutbound("auto_redirect");

      // respiro pro beacon sair
      setTimeout(() => {
        window.location.href = affiliateUrl;
      }, 180);
    }
  }, 1000);
})();
