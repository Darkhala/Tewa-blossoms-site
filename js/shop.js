// js/shop.js
// Full shop logic extracted from your HTML inline <script type="module"> block.
// - Supabase product fetch
// - Filters, price ranges, sort
// - Cart (localStorage) + UI updates
// - Product modal
// - WhatsApp checkout
// - PesaPal starter hook (dynamic import)

import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://arcyvagzgpciljoxjago.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY3l2YWd6Z3BjaWxqb3hqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDQ3NjIsImV4cCI6MjA3MjI4MDc2Mn0.RL3fgUAaNm6fLq3BROOMOLio-Wjzc6--XGn8qax3mWw";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE_PRODUCTS = "products";

// DOM refs
const cartCount = document.getElementById("cart-count");
const mfCount = document.getElementById('mf-count');
const cartItemsDiv = document.getElementById("cart-items");
const cartTotalEls = document.querySelectorAll("#cart-total");

let cart = JSON.parse(localStorage.getItem("cart") || "[]");

const WHATSAPP_PHONE = "254757399339";
const isMobile = () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
function buildWhatsAppUrl(message) {
  const text = encodeURIComponent(message);
  return isMobile()
    ? `https://wa.me/${WHATSAPP_PHONE}?text=${text}`
    : `https://web.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${text}`;
}
function openWhatsApp(message) {
  const urlPrimary = buildWhatsAppUrl(message);
  let opened = window.open(urlPrimary, '_blank');
  if (!opened) {
    const fallback = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
    opened = window.open(fallback, '_blank');
    if (!opened) window.location.href = fallback;
  }
}

// -- Cart UI --
function updateCartUI() {
  cartCount.textContent = cart.length;
  if(mfCount){ mfCount.textContent = cart.length; }
  cartItemsDiv.innerHTML = "";
  let total = 0;
  cart.forEach((item, idx) => {
    total += Number(item.new_price || 0);
    const div = document.createElement("div");
    div.className = "flex items-center border-b p-2 gap-2";
    div.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}" class="w-12 h-12 object-cover rounded" />
      <div class="flex-1">
        <div class="font-semibold text-sm line-clamp-1">${item.name}</div>
        <div class="text-xs text-gray-500">KES ${Number(item.new_price).toLocaleString('en-KE')}</div>
      </div>
      <button class="text-red-600 font-bold text-lg leading-none">&times;</button>
    `;
    div.querySelector("button").addEventListener("click", () => {
      cart.splice(idx, 1);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartUI();
    });
    cartItemsDiv.appendChild(div);
  });
  cartTotalEls.forEach(el => el.textContent = `KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`);
}
updateCartUI();

// Cart modal open/close
const cartModal = document.getElementById('cart-modal');
document.getElementById("cart-btn").addEventListener("click", () => cartModal.classList.remove("hidden"));
const mfCart = document.getElementById('mf-cart');
if(mfCart){ mfCart.addEventListener('click', ()=> cartModal.classList.remove('hidden')); }
window.closeCart = () => cartModal.classList.add("hidden");

// Checkout buttons
const waCheckoutBtn = document.getElementById('wa-checkout-btn');
if (waCheckoutBtn) {
  waCheckoutBtn.addEventListener('click', () => {
    if (!cart || cart.length === 0) { alert('Your cart is empty.'); return; }
    const lines = cart.map((item, i) => `${i + 1}. ${item.name} - KES ${Number(item.new_price).toLocaleString('en-KE')}`);
    const total = cart.reduce((s, it) => s + Number(it.new_price || 0), 0);
    const message = `Hello Tewa,\nI'd like to order:\n\n${lines.join('\n')}\n\nTotal: KES ${total.toLocaleString('en-KE', { minimumFractionDigits: 2 })}\n\nPlease advise on payment and delivery.`;
    openWhatsApp(message);
  });
}

const pesapalPayBtn = document.getElementById('pesapal-pay-btn');
if (pesapalPayBtn) {
  pesapalPayBtn.addEventListener('click', async () => {
    if (!cart || cart.length === 0) { alert('Your cart is empty.'); return; }
    const total = cart.reduce((s, it) => s + Number(it.new_price || 0), 0);
    try {
      const mod = await import('./js/pesapal.js');
      const customer = {};
      await mod.startPesapalCheckout(total, cart, customer);
    } catch (e) {
      console.error('Failed to start Pesapal checkout:', e);
      alert('Failed to start Pesapal checkout. Please try again.');
    }
  });
}

// Product modal logic
const pm = {
  root: document.getElementById('product-modal'),
  img: document.getElementById('pm-img'),
  name: document.getElementById('pm-name'),
  price: document.getElementById('pm-price'),
  original: document.getElementById('pm-original'),
  discount: document.getElementById('pm-discount'),
  desc: document.getElementById('pm-desc'),
  waBtn: document.getElementById('pm-wa-btn'),
  closeBtn: document.getElementById('pm-close'),
};
function openProductModal(p) {
  if (!pm.root) return;
  pm.img.src = p.image_url;
  pm.img.alt = p.name || '';
  pm.name.textContent = p.name || '';
  pm.price.textContent = `KES ${Number(p.new_price).toLocaleString('en-KE')}`;
  if (p.original_price) {
    pm.original.textContent = `KES ${Number(p.original_price).toLocaleString('en-KE')}`;
    const disc = Math.round(100 - (p.new_price / p.original_price) * 100);
    if (disc > 0) { pm.discount.textContent = `${disc}% OFF`; pm.discount.classList.remove('hidden'); }
    else { pm.discount.classList.add('hidden'); }
  } else { pm.original.textContent = ''; pm.discount.classList.add('hidden'); }
  pm.desc.textContent = p.description || '';
  const msg = `Hello Tewa, I want '${p.name}' for KES ${Number(p.new_price).toLocaleString('en-KE')}`;
  pm.waBtn.onclick = (e) => { e.preventDefault(); openWhatsApp(msg); };
  pm.root.classList.remove('hidden');
}
if (pm.root) {
  pm.closeBtn.addEventListener('click', () => pm.root.classList.add('hidden'));
  pm.root.addEventListener('click', (e) => { if (e.target === pm.root) pm.root.classList.add('hidden'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') pm.root.classList.add('hidden'); });
}

// Fetch products from Supabase
async function fetchProducts() {
  const { data, error } = await supabase.from(TABLE_PRODUCTS).select("*").order("id", { ascending: false });
  if (error) console.error(error);
  return data || [];
}

// Filters state
let allProducts = [];
let selectedCategory = 'All';
let searchQuery = '';
let selectedPrice = null; // {min, max}
let sortBy = '';

const priceRanges = [
  { label: '0 - 1k', min: 0, max: 1000 },
  { label: '1k - 3k', min: 1000, max: 3000 },
  { label: '3k - 5k', min: 3000, max: 5000 },
  { label: '5k - 10k', min: 5000, max: 10000 },
  { label: '10k - 20k', min: 10000, max: 20000 },
  { label: '20k+', min: 20000, max: Infinity },
];

function populateFilters(products) {
  const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  const sel = document.getElementById('f-category');
  sel.innerHTML = '<option value="All">All</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

  const pricesDiv = document.getElementById('f-prices');
  pricesDiv.innerHTML = '';
  priceRanges.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.className = 'border rounded-md px-2 py-2 hover:bg-gray-50';
    btn.textContent = r.label;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      selectedPrice = r; // select
      Array.from(pricesDiv.children).forEach(ch => ch.classList.remove('ring-2','ring-brand'));
      btn.classList.add('ring-2','ring-brand');
      // auto-apply
      const filtered = applyFilters();
      renderSections(filtered);
    });
    pricesDiv.appendChild(btn);
  });
}

function applyFilters() {
  let list = [...allProducts];
  if (selectedCategory !== 'All') list = list.filter(p => p.category === selectedCategory);
  if (selectedPrice) list = list.filter(p => Number(p.new_price) >= selectedPrice.min && Number(p.new_price) <= selectedPrice.max);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }
  if (sortBy === 'price-asc') list.sort((a,b)=>Number(a.new_price)-Number(b.new_price));
  if (sortBy === 'price-desc') list.sort((a,b)=>Number(b.new_price)-Number(a.new_price));
  if (sortBy === 'name-asc') list.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  return list;
}

function renderSections(products) {
  const container = document.getElementById('shop-sections');
  container.innerHTML = '';
  const cats = Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  cats.forEach(cat => {
    const catItems = products.filter(p => p.category === cat);
    if (catItems.length === 0) return;

    const section = document.createElement('section');
    section.className = 'bg-white rounded-xl shadow p-4';
    section.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="heading-script text-2xl">${cat}</h3>
        <span class="text-sm text-gray-500">${catItems.length} item(s)</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3"></div>
    `;
    const grid = section.querySelector('div.grid');

    catItems.forEach(p => {
      const div = document.createElement('div');
      div.className = 'border p-2 rounded-md shadow-sm hover:shadow flex flex-col text-xs cursor-pointer bg-[#F5EEE6]';
      const waMessage = `Hello Tewa, I want '${p.name}' for KES ${Number(p.new_price).toLocaleString('en-KE')}`;
      const waUrl = buildWhatsAppUrl(waMessage);
      const discount = p.original_price ? Math.round(100 - (p.new_price / p.original_price) * 100) : 0;
      div.innerHTML = `
        <img src="${p.image_url}" class="w-full h-36 object-cover rounded-md" />
        <div class="mt-1 flex justify-between items-center">
          <div class="font-medium text-gray-800 truncate">${p.name}</div>
          ${discount > 0 ? `<span class="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded">${discount}% OFF</span>` : ''}
        </div>
        <p class="text-[11px] text-gray-600 mt-0.5 line-clamp-2">${p.description || 'No description.'}</p>
        <div class="mt-0.5 text-xs">
          ${p.original_price ? `<span class="line-through text-gray-400">KES ${Number(p.original_price).toLocaleString('en-KE')}</span>` : ''}
          <span class="font-semibold text-brand">KES ${Number(p.new_price).toLocaleString('en-KE')}</span>
        </div>
        <div class="mt-2 flex gap-1">
          <button class="flex-1 btn-brand text-white py-0.5 rounded flex items-center justify-center gap-1 text-xs">🛒</button>
          <a href="${waUrl}" data-wa="1" target="_blank" rel="noopener noreferrer" class="flex-1 btn-brand text-white py-0.5 rounded flex items-center justify-center gap-1 text-xs">
            <img src="https://img.icons8.com/ios-filled/14/ffffff/whatsapp.png" alt="WhatsApp"/>
          </a>
        </div>
      `;

      // bindings
      div.querySelector('a[data-wa="1"]').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation(); openWhatsApp(waMessage);
      });
      div.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation(); cart.push(p); localStorage.setItem('cart', JSON.stringify(cart)); updateCartUI();
      });
      div.addEventListener('click', () => { window.location.href = `product.html?id=${p.id}`; });

      grid.appendChild(div);
    });

    container.appendChild(section);
  });

  if (cats.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-500">No items match your filters.</div>';
  }
}

// Wire filters
const applyBtn = document.getElementById('f-apply');
if (applyBtn) applyBtn.addEventListener('click', () => {
  selectedCategory = document.getElementById('f-category').value;
  searchQuery = document.getElementById('f-search').value.trim();
  sortBy = document.getElementById('f-sort').value;
  const filtered = applyFilters();
  renderSections(filtered);
});
const clearBtn = document.getElementById('f-clear');
if (clearBtn) clearBtn.addEventListener('click', () => {
  selectedCategory = 'All'; searchQuery = ''; selectedPrice = null; sortBy='';
  document.getElementById('f-category').value = 'All';
  document.getElementById('f-search').value = '';
  document.getElementById('f-sort').value = '';
  const pricesDiv = document.getElementById('f-prices');
  Array.from(pricesDiv.children).forEach(ch => ch.classList.remove('ring-2','ring-brand'));
  renderSections(allProducts);
});

// Live search on Enter + debounced input
const searchInput = document.getElementById('f-search');
if (searchInput) {
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('f-apply').click();
  });
  const debounce = (fn, delay=300) => { let t; return (...args) => { clearTimeout(t); t = setTimeout(()=>fn(...args), delay); }; };
  searchInput.addEventListener('input', debounce((e)=>{
    searchQuery = e.target.value.trim();
    const filtered = applyFilters();
    renderSections(filtered);
  }, 300));
}

// Auto-apply on category and sort changes
const catSel = document.getElementById('f-category');
if (catSel) catSel.addEventListener('change', () => {
  selectedCategory = document.getElementById('f-category').value;
  renderSections(applyFilters());
});
const sortSel = document.getElementById('f-sort');
if (sortSel) sortSel.addEventListener('change', () => {
  sortBy = document.getElementById('f-sort').value;
  renderSections(applyFilters());
});

// Mobile filters toggle
const mfToggle = document.getElementById('mf-toggle');
const filtersPanel = document.getElementById('filters-panel');
if(mfToggle && filtersPanel){
  mfToggle.addEventListener('click', ()=> filtersPanel.classList.toggle('hidden'));
}

// Init
(async function init() {
  allProducts = await fetchProducts();
  populateFilters(allProducts);
  renderSections(allProducts);
})();

// Expose helper (optional) for PayPal script to access cart totals
window.ShopHelpers = {
  getCart: () => JSON.parse(localStorage.getItem('cart') || '[]'),
  cartTotalKES: () => (JSON.parse(localStorage.getItem('cart') || '[]').reduce((s,i)=>s+Number(i.new_price||0),0)),
  clearCart: () => { localStorage.removeItem('cart'); cart = []; updateCartUI(); }
};
