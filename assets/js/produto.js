(async function () {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const store = params.get("store") || "ml"; // opcional: ?store=shopee

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

  const storeKey = String(store || "ml").toLowerCase();
  const storeInfo = (product.stores || []).find(s => String(s.store || "").toLowerCase() === storeKey) || product.stores?.[0];
  const affiliateUrl = storeInfo?.affiliateUrl;

  if (!affiliateUrl) {
    document.title = "Link indisponível | Achadinhos da Ju";
    document.getElementById("productName").textContent = product.title;
    document.getElementById("productDesc").textContent = "Link indisponível no momento.";
    return;
  }

  // UI
  document.title = `${product.title} | Achadinhos da Ju`;
  document.getElementById("productName").textContent = product.title;

  const img = document.getElementById("productImg");
  img.src = product.imageUrl;
  img.alt = product.title;

  document.getElementById("productDesc").textContent = product.description;

  const ctaEl = document.getElementById("cta");
  ctaEl.href = affiliateUrl;
  ctaEl.textContent = `Abrir ${storeInfo.storeLabel || "site"} agora`;

  // Tracking
  function trackOutbound(type) {
    try {
      gtag("event", type, {
        event_category: "affiliate",
        event_label: `${product.id}:${String(storeInfo.store || "").toLowerCase()}`,
        transport_type: "beacon"
      });
    } catch {}
  }

  ctaEl.addEventListener("click", () => trackOutbound("manual_click"));

  // Redirect
  let seconds = 5;
  const countEl = document.getElementById("count");
  countEl.textContent = seconds;

  const timer = setInterval(() => {
    seconds--;
    countEl.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(timer);
      trackOutbound("auto_redirect");
      setTimeout(() => {
        window.location.href = affiliateUrl;
      }, 120);
    }
  }, 1000);
})();
