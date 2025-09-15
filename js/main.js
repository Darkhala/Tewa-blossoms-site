import { createClient } from "https://esm.sh/@supabase/supabase-js";

const SUPABASE_URL = "https://arcyvagzgpciljoxjago.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyY3l2YWd6Z3BjaWxqb3hqYWdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3MDQ3NjIsImV4cCI6MjA3MjI4MDc2Mn0.RL3fgUAaNm6fLq3BROOMOLio-Wjzc6--XGn8qax3mWw";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLE_PRODUCTS = "products";

// Local cart
let cart = JSON.parse(localStorage.getItem("cart") || "[]");

// DOM elements
const featuredGrid = document.getElementById("featured-grid");
const shopGrid = document.getElementById("shop-grid");
const cartCount = document.getElementById("cart-count");
const cartItemsDiv = document.getElementById("cart-items");
const cartTotal = document.querySelectorAll("#cart-total");
const categoriesBar = document.getElementById("categories-bar").querySelector("div");
const headerCatBtn = document.getElementById('header-categories-btn');
const headerCatMenu = document.getElementById('header-categories-menu');

// WhatsApp helpers
const WHATSAPP_PHONE = "254757399339"; // no +, no spaces
const isMobile = () => /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
function buildWhatsAppUrl(message) {
  const text = encodeURIComponent(message);
  if (isMobile()) {
    // wa.me is very reliable on mobile apps
    return `https://wa.me/${WHATSAPP_PHONE}?text=${text}`;
  }
  // Use WhatsApp Web on desktop directly
  return `https://web.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${text}`;
}
function openWhatsApp(message) {
  const urlPrimary = buildWhatsAppUrl(message);
  let opened = window.open(urlPrimary, '_blank');
  if (!opened) {
    // Fallback to api endpoint if popup blocked or primary fails
    const urlFallback = `https://api.whatsapp.com/send?phone=${WHATSAPP_PHONE}&text=${encodeURIComponent(message)}`;
    opened = window.open(urlFallback, '_blank');
    if (!opened) {
      window.location.href = urlFallback;
    }
  }
}

// Helper: Update cart display
function updateCartUI() {
  cartCount.textContent = cart.length;
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
        <div class="text-xs text-gray-500">KES ${item.new_price}</div>
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
  cartTotal.forEach(el => el.textContent = `KES ${total.toFixed(2)}`);
}
updateCartUI();

// Cart modal
const cartModal = document.getElementById("cart-modal");
document.getElementById("cart-btn").addEventListener("click", () => cartModal.classList.remove("hidden"));
window.closeCart = () => cartModal.classList.add("hidden");

// Product modal refs and helpers
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
  pm.price.textContent = `KES ${p.new_price}`;
  if (p.original_price) {
    pm.original.textContent = `KES ${p.original_price}`;
    const disc = Math.round(100 - (p.new_price / p.original_price) * 100);
    if (disc > 0) {
      pm.discount.textContent = `${disc}% OFF`;
      pm.discount.classList.remove('hidden');
    } else {
      pm.discount.classList.add('hidden');
    }
  } else {
    pm.original.textContent = '';
    pm.discount.classList.add('hidden');
  }
  pm.desc.textContent = p.description || '';
  const msg = `Hello Tewa, I want '${p.name}' for KES ${p.new_price}`;
  pm.waBtn.onclick = (e) => { e.preventDefault(); openWhatsApp(msg); };
  pm.root.classList.remove('hidden');
}
if (pm.root) {
  pm.closeBtn.addEventListener('click', () => pm.root.classList.add('hidden'));
  pm.root.addEventListener('click', (e) => {
    if (e.target === pm.root) pm.root.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') pm.root.classList.add('hidden');
  });
}

// Checkout -> WhatsApp
const checkoutBtn = document.querySelector('#cart-modal .border-t button');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', () => {
    if (!cart || cart.length === 0) {
      alert('Your cart is empty.');
      return;
    }
    const lines = cart.map((item, i) => `${i + 1}. ${item.name} - KES ${item.new_price}`);
    const total = cart.reduce((sum, item) => sum + Number(item.new_price || 0), 0);
    const message = `Hello Tewa,\nI'd like to order:\n\n${lines.join('\n')}\n\nTotal: KES ${total.toFixed(2)}\n\nPlease advise on payment and delivery.`;
    openWhatsApp(message);
  });
}

// Fetch products
async function fetchProducts() {
  const { data, error } = await supabase.from(TABLE_PRODUCTS).select("*").order("id", { ascending: false });
  if (error) console.error(error);
  return data || [];
}

// Render featured collections (static layout, no buttons)
function renderFeaturedCollections() {
  const grid = document.getElementById('featured-cards-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const items = [
    {
      image_url: 'assets/featured/premium rose collection.jpg',
      name: 'Premium Rose Collection',
      description: 'Exquisite hand-selected roses in elegant arrangements',
      priceLine: 'From $89'
    },
    {
      image_url: 'assets/featured/luxe mixed arrangements.jpg',
      name: 'Luxury Mixed Arrangements',
      description: 'Sophisticated combinations of seasonal premium blooms',
      priceLine: 'From $125'
    },
    {
      image_url: 'assets/featured/wedding elegance.jpg',
      name: 'Wedding Elegance',
      description: 'Bespoke bridal bouquets and ceremony arrangements',
      priceLine: 'From $199'
    }
  ];
  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-3xl shadow-md overflow-hidden';
    card.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}" class="w-full h-56 md:h-60 object-cover" />
      <div class="p-5">
        <h3 class="text-lg font-semibold text-gray-800">${item.name}</h3>
        <p class="text-sm text-gray-600 mt-1">${item.description}</p>
        <div class="mt-4 text-sm font-semibold text-brand">${item.priceLine}</div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Render products
function renderProducts(grid, products) {
  grid.innerHTML = "";
  products.forEach(p => {
    const discount = p.original_price ? Math.round(100 - (p.new_price / p.original_price) * 100) : 0;
    const div = document.createElement("div");

    // WhatsApp quick link for single product
    const waMessage = `Hello Tewa, I want '${p.name}' for KES ${p.new_price}`;
    const waUrl = buildWhatsAppUrl(waMessage);

    div.className = "border p-2 rounded-md shadow-sm hover:shadow flex flex-col text-xs max-w-[10rem] cursor-pointer"; 
    div.innerHTML = `
      <img src="${p.image_url}" class="w-full h-32 object-cover rounded-md" />
      <div class="mt-1 flex justify-between items-center">
        <div class="font-medium text-gray-800 truncate">${p.name}</div>
        ${discount > 0 ? `<span class="text-[10px] bg-green-100 text-green-600 px-1 py-0.5 rounded">${discount}% OFF</span>` : ''}
      </div>
      <p class="text-[11px] text-gray-600 mt-0.5 line-clamp-2">${p.description || "No description available."}</p>
      <div class="mt-0.5 text-xs">
        ${p.original_price ? `<span class="line-through text-gray-400">KES ${p.original_price}</span>` : ""}
        <span class="font-semibold text-brand">KES ${p.new_price}</span>
      </div>
      <div class="mt-2 flex gap-1">
        <button class="flex-1 btn-brand text-white py-0.5 rounded flex items-center justify-center gap-1 text-xs">
          🛒
        </button>
        <a href="${waUrl}" data-wa="1" target="_blank" rel="noopener noreferrer"
           class="flex-1 btn-brand text-white py-0.5 rounded flex items-center justify-center gap-1 text-xs">
          <img src="https://img.icons8.com/ios-filled/14/ffffff/whatsapp.png" alt="WhatsApp"/>
        </a>
      </div>
    `;

    // Bind WhatsApp click to ensure message is carried with fallbacks
    const waLink = div.querySelector('a[data-wa="1"]');
    if (waLink) {
      waLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openWhatsApp(waMessage);
      });
    }

    // Cart button logic
    div.querySelector("button").addEventListener("click", (e) => {
      e.stopPropagation();
      cart.push(p);
      localStorage.setItem("cart", JSON.stringify(cart));
      updateCartUI();
    });

    // Open product detail modal on card click
    div.addEventListener('click', () => openProductModal(p));

    grid.appendChild(div);
  });
}


// Create dynamic category buttons
function filterAndScroll(products, cat) {
  const filtered = cat === 'All' ? products : products.filter(p => p.category === cat);
  renderProducts(shopGrid, filtered);
  document.getElementById('shop').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCategories(products) {
  const categories = [...new Set(products.map(p => p.category))];
  categoriesBar.innerHTML = '';

  // 🔒 Make the menu static at the top
  const categoriesBarContainer = document.getElementById("categories-bar");
  categoriesBarContainer.style.position = "sticky";
  categoriesBarContainer.style.top = "0";
  categoriesBarContainer.style.zIndex = "50";

  ['All', ...categories].forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.className = "px-3 py-1 bg-white border rounded hover:bg-rose-700 hover:text-white";
    btn.addEventListener("click", () => filterAndScroll(products, cat));
    categoriesBar.appendChild(btn);
  });

  // Header dropdown population
  if (headerCatMenu && headerCatBtn) {
    headerCatMenu.innerHTML = '';
    ['All', ...categories].forEach(cat => {
      const item = document.createElement('button');
      item.className = 'w-full text-left px-3 py-2 hover:bg-gray-100';
      item.textContent = cat;
      item.addEventListener('click', () => {
        headerCatMenu.classList.add('hidden');
        filterAndScroll(products, cat);
      });
      headerCatMenu.appendChild(item);
    });

    // Toggle dropdown
    headerCatBtn.onclick = (e) => {
      e.preventDefault();
      headerCatMenu.classList.toggle('hidden');
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!headerCatMenu.contains(e.target) && !headerCatBtn.contains(e.target)) {
        headerCatMenu.classList.add('hidden');
      }
    });
  }
}

function ensureShopByCategorySection() {
  if (document.getElementById('shop-by-category')) return;
  const shopSection = document.getElementById('shop');
  if (!shopSection) return;
  const section = document.createElement('section');
  section.id = 'shop-by-category';
  section.className = 'bg-white py-12';
  section.innerHTML = `
    <div class="max-w-7xl mx-auto px-6">
      <div class="text-center mb-8">
        <h2 class="heading-script text-2xl md:text-3xl">Shop by Category</h2>
        <p class="text-sm text-gray-600">Explore our carefully curated categories</p>
      </div>
      <div id="category-cards-grid" class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"></div>
    </div>
  `;
  shopSection.parentNode.insertBefore(section, shopSection);
}

function renderCategoryShowcase(products) {
  const grid = document.getElementById('category-cards-grid');
  if (!grid) return;
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  grid.innerHTML = '';
  categories.forEach(cat => {
    const rep = products.find(p => p.category === cat && p.image_url) || products.find(p => p.category === cat);
    const image = rep && rep.image_url ? rep.image_url : 'assets/hero.jpg';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'relative h-52 rounded-2xl overflow-hidden shadow hover:shadow-lg transition group text-left';
    card.innerHTML = `
      <img src="${image}" alt="${cat}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent"></div>
      <div class="absolute bottom-3 left-3 right-3 text-white drop-shadow">
        <div class="text-lg font-semibold">${cat}</div>
        <div class="text-xs opacity-90">Browse ${cat} items</div>
      </div>
    `;
    card.addEventListener('click', () => filterAndScroll(products, cat));
    grid.appendChild(card);
  });
}

function updateFeaturedIndicators() {
  const featuredGrid = document.getElementById("featured-grid");
  const indicators = document.getElementById("featured-indicators");
  const scrollWidth = featuredGrid.scrollWidth - featuredGrid.clientWidth;
  const activeIndex = Math.round((featuredGrid.scrollLeft / scrollWidth) * 4); // adjust 4 based on how many dots you want

  indicators.innerHTML = '';
  for (let i = 0; i < 5; i++) { // 5 dots for example
    const dot = document.createElement("div");
    dot.className = `w-2 h-2 rounded-full ${i === activeIndex ? "bg-brand" : "bg-gray-300"}`;
    indicators.appendChild(dot);
  }
}

// Featured scroller removed

// Load initial products
async function loadProducts() {
  const products = await fetchProducts();
  renderFeaturedCollections();
  renderProducts(shopGrid, products); // all products in shop
  renderCategories(products);
  ensureShopByCategorySection();
  renderCategoryShowcase(products);

    document.getElementById("shop-see-more").addEventListener("click", () => renderProducts(shopGrid, products));
}
loadProducts();
