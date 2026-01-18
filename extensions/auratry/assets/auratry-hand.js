(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const IS_EDITOR = !!(window.Shopify && Shopify.designMode);

  function openModal(root) {
    const overlay = $('[data-auratry-overlay]', root);
    if (!overlay) return;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(root) {
    const overlay = $('[data-auratry-overlay]', root);
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
  }

  function setError(root, msg) {
    const el = $('[data-auratry-error]', root);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
  }

  function setLoading(root, v) {
    const sp = $('[data-auratry-spinner]', root);
    if (!sp) return;
    sp.hidden = !v;
  }

  function wireRoot(root) {
    if (!root || root.__auratryInit) return;
    root.__auratryInit = true;

    const btn = $('[data-auratry]', root);
    const overlay = $('[data-auratry-overlay]', root);
    const closeBtn = $('[data-auratry-close]', root);
    const runBtn = $('[data-auratry-run]', root);
    const fileInput = $('[data-auratry-file]', root);
    const camInput = $('[data-auratry-camera]', root);

    const title1 = $('[data-auratry-product-title]', root);
    const title2 = $('[data-auratry-product-title-2]', root);
    const img = $('[data-auratry-product-img]', root);

    const selfiePreview = $('[data-auratry-selfie-preview]', root);
    const resultImg = $('[data-auratry-result]', root);

    let selfieFile = null;

    function reset() {
      setError(root, '');
      setLoading(root, false);
      selfieFile = null;
      if (runBtn) runBtn.disabled = true;

      if (selfiePreview) selfiePreview.removeAttribute('src');
      if (resultImg) resultImg.removeAttribute('src');

      if (fileInput) fileInput.value = '';
      if (camInput) camInput.value = '';
    }

    function populateProduct() {
      const pTitle = btn?.dataset.productTitle || '';
      const pImg = btn?.dataset.productImage || '';
      if (title1) title1.textContent = pTitle;
      if (title2) title2.textContent = pTitle;
      if (img && pImg) img.src = pImg;
    }

    function handleFile(file) {
      if (!file) return;

      if (!file.type || !file.type.startsWith('image/')) {
        return setError(root, 'Please choose an image.');
      }

      if (file.size > 8 * 1024 * 1024) {
        return setError(root, 'Image too large (max 8MB).');
      }

      selfieFile = file;

      if (selfiePreview) {
        selfiePreview.src = URL.createObjectURL(file);
      }

      if (runBtn) runBtn.disabled = false;
      setError(root, '');
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') cleanupClose();
    }

    function cleanupClose() {
      document.removeEventListener('keydown', onKeyDown);
      closeModal(root);
    }

    // open on click
    btn?.addEventListener('click', () => {
      populateProduct();
      reset();
      openModal(root);
      document.addEventListener('keydown', onKeyDown);
    });

    // close handlers
    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      cleanupClose();
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) cleanupClose();
    });

    fileInput?.addEventListener('change', (e) => handleFile(e.target?.files?.[0]));
    camInput?.addEventListener('change', (e) => handleFile(e.target?.files?.[0]));

    runBtn?.addEventListener('click', async () => {
      console.log("[AuraTry] Generate clicked", { hasSelfie: !!selfieFile });

      if (!selfieFile) return setError(root, 'Upload a selfie first.');

      setLoading(root, true);
      setError(root, '');

      try {
        const productTitle = btn?.dataset.productTitle || '';
        const productImageUrl = btn?.dataset.productImage || '';

        const fd = new FormData();
        fd.append('selfie', selfieFile);
        fd.append('productTitle', productTitle);
        fd.append('productImageUrl', productImageUrl);

        // ✅ Shopify App Proxy storefront path (NOT Render URL)
        // Works when App Proxy is:
        // Proxy URL: https://aura-try.onrender.com/proxy
        // Prefix: apps
        // Subpath: aura-try
        const url = '/apps/aura-try/tryon';

        console.log('[AuraTry] POST', url, { productTitle, productImageUrl });

        const res = await fetch(url, {
          method: 'POST',
          body: fd,
          headers: { 'Accept': 'application/json' },
        });

        const text = await res.text();
        console.log('[AuraTry] status', res.status, 'raw:', text);

        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Server did not return JSON. Check App Proxy path + Render endpoint.');
        }

        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `Request failed (${res.status})`);
        }

        const { mimeType, base64 } = data.result || {};
        if (!mimeType || !base64) throw new Error('Missing result image from server');

        if (resultImg) {
          resultImg.src = `data:${mimeType};base64,${base64}`;
        }
      } catch (e) {
        console.error(e);
        setError(root, String(e?.message || e));
      } finally {
        setLoading(root, false);
      }
    });
  }

  // ✅ initAll was missing in your code — fixed now
  function initAll() {
    document.querySelectorAll('.auratry-root').forEach(wireRoot);
  }

  // Initial init
  initAll();

  // Theme editor me observer issues: keep it off in editor
  if (!IS_EDITOR) {
    let t = null;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(initAll, 50);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
})();
