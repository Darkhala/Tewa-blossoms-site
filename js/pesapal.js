// PesaPal integration module - Frontend wrapper calling our backend
// This file intentionally does NOT contain your PesaPal keys. All sensitive calls
// are handled by the backend at backend/server.js.

// Optionally override at runtime: window.PESAPAL_BACKEND_BASE = 'https://your-domain/api';
const BACKEND_BASE = (typeof window !== 'undefined' && window.PESAPAL_BACKEND_BASE)
  ? window.PESAPAL_BACKEND_BASE
  : 'http://localhost:3001';

function formatKES(n) { return Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 }); }

export async function startPesapalCheckout(totalAmount, items = [], customer = {}) {
  try {
    if (!totalAmount || totalAmount <= 0) {
      alert('Cart total must be greater than zero.');
      return;
    }

    const res = await fetch(`${BACKEND_BASE}/api/pesapal/submit-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(Number(totalAmount) * 100) / 100,
        items,
        customer,
        callback_url: `${location.origin}/payment-complete.html`
      })
    });

    if (!res.ok) {
      const text = await res.text().catch(()=>'');
      throw new Error(`Backend error (${res.status}): ${text}`);
    }

    const data = await res.json();
    if (data && data.redirect_url) {
      window.location.href = data.redirect_url; // redirect to hosted checkout
      return;
    }

    throw new Error('No redirect_url from backend');
  } catch (err) {
    console.error('PesaPal checkout error:', err);
    alert('Unable to initiate PesaPal checkout. Please try again later or order via WhatsApp.');
  }
}

// Also expose to window for non-module consumers
if (typeof window !== 'undefined') {
  window.PesapalCheckout = { start: startPesapalCheckout };
}
