// PayPal frontend-only integration for GitHub Pages
// - Loads PayPal JS SDK in the browser
// - Renders Smart Buttons in a provided container
// - Uses localStorage cart to compute totals
// - Captures order client-side and redirects to payment-complete.html
//
// NOTE:
// - For client-side only, NEVER expose your PayPal secret. Only the Client ID is used in the browser.
// - PayPal does not support KES for direct charging. We charge in USD and convert from KES using a configurable rate.
// - You can override defaults via:
//     window.PAYPAL_CLIENT_ID = 'YOUR_CLIENT_ID';
//     window.PAYPAL_CURRENCY = 'USD';
//     window.PAYPAL_EXCHANGE_RATE = 0.0077; // 1 KES -> USD

(function(){
  const DEFAULT_CLIENT_ID = 'AboJoLEQGx05S567a54KT2SvQik4bFNU2OViaLUsD5Bc-rXMu7PSMksIHZLvBKS1FCJfB6BfrAGIixGH';
  const CLIENT_ID = (typeof window !== 'undefined' && window.PAYPAL_CLIENT_ID) || DEFAULT_CLIENT_ID;
  const CURRENCY = (typeof window !== 'undefined' && window.PAYPAL_CURRENCY) || 'USD';
  // Rough default: 1 KES ~ 0.0077 USD (≈ 1 USD ~ 130 KES). Update as needed.
  const EXCHANGE_RATE_KES_TO_USD = Number((typeof window !== 'undefined' && window.PAYPAL_EXCHANGE_RATE) || 0.0077);

  function getCart(){
    try { return JSON.parse(localStorage.getItem('cart') || '[]') || []; } catch { return []; }
  }
  function cartTotalKES(){
    const base = getCart().reduce((sum, item) => sum + Number(item?.new_price || 0), 0);
    const extra = Number((typeof window !== 'undefined' && window.PAYPAL_EXTRA_KES) || 0);
    return base + (isFinite(extra) ? extra : 0);
  }
  function formatKES(n){ return 'KES ' + Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }); }
  function toUSD(kes){
    if (!EXCHANGE_RATE_KES_TO_USD || EXCHANGE_RATE_KES_TO_USD <= 0) return 0;
    const usd = kes * EXCHANGE_RATE_KES_TO_USD;
    return Math.round((usd + Number.EPSILON) * 100) / 100; // 2dp
  }

  async function loadPaypalSdk(){
    if (typeof window === 'undefined') return false;
    if (window.paypal) return true;
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(CLIENT_ID)}&currency=${encodeURIComponent(CURRENCY)}&intent=capture&components=buttons`;
      s.crossOrigin = 'anonymous';
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Failed to load PayPal SDK'));
      document.head.appendChild(s);
    });
  }

  async function renderPayPalButtons(containerSelector = '#paypal-button-container'){
    const container = document.querySelector(containerSelector);
    if (!container) return;

    try {
      await loadPaypalSdk();
      // Clear previous render (if any)
      container.innerHTML = '';

      window.paypal.Buttons({
        style: { layout: 'horizontal', color: 'gold', shape: 'rect', label: 'paypal' },

        onInit: function(data, actions){
          // Disable if cart empty
          if ((getCart() || []).length === 0) actions.disable();
        },

        createOrder: function(data, actions){
          const totalKES = cartTotalKES();
          const totalUSD = toUSD(totalKES);
          if (!totalUSD || totalUSD <= 0) {
            alert('Your cart total must be greater than zero to pay with PayPal.');
            throw new Error('Invalid amount');
          }
          return actions.order.create({
            purchase_units: [{
              amount: {
                currency_code: CURRENCY,
                value: totalUSD.toFixed(2)
              },
              description: 'Tewa Blooms order'
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              brand_name: 'Tewa Blooms'
            }
          });
        },

        onApprove: async function(data, actions){
          try {
            const details = await actions.order.capture();
            // Clear cart
            localStorage.removeItem('cart');
            try {
              // Attempt to update any visible cart UI without errors if missing
              const countEls = document.querySelectorAll('#cart-count, #mf-count');
              countEls.forEach(el => el.textContent = '0');
              const totalEls = document.querySelectorAll('#cart-total');
              totalEls.forEach(el => el.textContent = 'KES 0.00');
              const itemsDiv = document.getElementById('cart-items');
              if (itemsDiv) itemsDiv.innerHTML = '';
            } catch {}
            const orderId = details?.id || '';
            window.location.href = `payment-complete.html?provider=paypal&orderId=${encodeURIComponent(orderId)}`;
          } catch (err) {
            console.error('PayPal capture error', err);
            alert('Could not complete PayPal payment. Please try again or use WhatsApp ordering.');
          }
        },

        onError: function(err){
          console.error('PayPal error', err);
          alert('PayPal error. Please try again later.');
        },

        onCancel: function(){ /* no-op */ }
      }).render(container);

      // Optional helper note below the buttons
      const noteId = 'paypal-currency-note';
      let note = document.getElementById(noteId);
      if (!note) {
        note = document.createElement('div');
        note.id = noteId;
        note.className = 'mt-2 text-xs text-gray-500';
        container.parentElement && container.parentElement.appendChild(note);
      }
      const kes = cartTotalKES();
      const usd = toUSD(kes);
      note.textContent = `Charged via PayPal in ${CURRENCY}. Approx amount: ${CURRENCY} ${usd.toFixed(2)} (from ${formatKES(kes)}).`;

    } catch (e) {
      console.error('Failed to render PayPal Buttons:', e);
    }
  }

  // Expose and auto-init if container is present
  if (typeof window !== 'undefined') {
    window.PayPalCheckout = { render: renderPayPalButtons };
    document.addEventListener('DOMContentLoaded', function(){
      if (document.querySelector('#paypal-button-container')) {
        renderPayPalButtons('#paypal-button-container');
      }
    });
  }
})();
