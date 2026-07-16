/* ============================================================
   MEERONIX – COMPLETE JAVASCRIPT (Google Sheets + Content)
   Now with CATEGORY support (e.g. AC, Fridge, TV...)
   ============================================================ */

const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbyFnPHyC9MxhTuFxtdH1FeFsFqwG7IK99tMfh8ZPJXWAK9aIN4evGmI4QotQJE1aAkiug/exec';

const CACHE_KEY = 'meeronix_products';
const CACHE_TIMESTAMP_KEY = 'meeronix_products_time';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

let products = [];
window.contentData = {};

// ============================================================
// HELPER: FORMAT PRICE (Removes Rs, $, commas, etc.)
// ============================================================
function formatPrice(value) {
    if (value === null || value === undefined || value === '') {
        return '0.00';
    }
    const cleanValue = String(value).replace(/[^0-9.]/g, '');
    const number = parseFloat(cleanValue);
    if (isNaN(number)) {
        return '0.00';
    }
    return number.toFixed(2);
}

// ============================================================
// HELPER: GROUP PRODUCTS BY CATEGORY
// ============================================================
function groupByCategory(list) {
    const groups = {};
    list.forEach(p => {
        const cat = (p.category && String(p.category).trim()) ? String(p.category).trim() : 'Other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(p);
    });
    return groups;
}

function slugify(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ============================================================
// LOAD PRODUCTS WITH CACHING
// ============================================================
async function loadProducts() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedData && cachedTime && (now - parseInt(cachedTime) < CACHE_DURATION)) {
        try {
            products = JSON.parse(cachedData);
            console.log(`📦 Loaded ${products.length} products from cache`);
            return products;
        } catch (e) {
            console.warn('Cache corrupted, fetching fresh data...');
        }
    }

    try {
        console.log('🔄 Fetching products from Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_API);

        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        if (data && data.error) throw new Error(data.error);

        if (data.products && Array.isArray(data.products)) {
            products = data.products;
        } else if (Array.isArray(data)) {
            products = data;
        } else {
            throw new Error('Unexpected data format');
        }

        if (data.content) {
            window.contentData = data.content;
            console.log('📄 Content loaded successfully');
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(products));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, String(now));

        console.log(`✅ Loaded ${products.length} products from Google Sheets`);
        return products;
    } catch (error) {
        console.error('❌ Error loading products:', error);

        if (cachedData) {
            try {
                products = JSON.parse(cachedData);
                console.log(`📦 Using cached products as fallback (${products.length} items)`);
                return products;
            } catch (e) {
                products = [];
            }
        }
        return [];
    }
}

// ============================================================
// RENDER: HOME PAGE — ONE AUTO-SCROLL CAROUSEL PER CATEGORY
// ============================================================
function renderHomeCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        const skeletonTiles = Array.from({ length: 6 }, () => `
            <div class="carousel-link" style="flex:0 0 260px;width:260px;height:260px;border-radius:16px;background:#e0e0e0;animation:shimmer 1.5s infinite;"></div>
        `).join('');
        container.innerHTML = `
            <div class="category-block">
                <div class="scroll-wrapper">
                    <div class="carousel-track">${skeletonTiles}${skeletonTiles}</div>
                </div>
            </div>
        `;
        return;
    }

    const groups = groupByCategory(products);

    const buildTile = (product, hidden = false) => `
        <a href="product-detail.html?id=${product.id}" class="carousel-link" ${hidden ? 'aria-hidden="true"' : ''}>
            <div class="image-tile">
                <img src="${product.image}" alt="${product.name}" loading="lazy"
                     onerror="this.onerror=null; this.src='images/placeholder.jpg';" />
            </div>
        </a>
    `;

    container.innerHTML = Object.keys(groups).map(category => {
        const items = groups[category];
        const trackId = `carousel-${slugify(category)}`;
        const original = items.map(p => buildTile(p, false)).join('');
        const duplicate = items.map(p => buildTile(p, true)).join('');

        return `
            <div class="category-block">
                <div class="category-header">
                    <span class="category-tag">${category}</span>
                </div>
                <div class="scroll-wrapper">
                    <div class="carousel-track" id="${trackId}">${original}${duplicate}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// RENDER: PRODUCTS PAGE — SECTION PER CATEGORY (EQUAL HEIGHT CARDS)
// ============================================================
function renderProductsCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        const skeletons = Array.from({ length: 10 }, (_, i) => `
            <div class="product-card skeleton-card" style="--i: ${i}">
                <div class="skeleton-img" style="height:200px;background:#e0e0e0;border-radius:var(--radius-sm);"></div>
                <div class="skeleton-text skeleton-title" style="height:14px;width:70%;background:#e0e0e0;border-radius:6px;margin:0.3rem auto;"></div>
                <div class="skeleton-text skeleton-desc" style="height:14px;width:90%;background:#e0e0e0;border-radius:6px;margin:0.3rem auto;"></div>
                <div class="skeleton-text skeleton-price" style="height:14px;width:40%;background:#e0e0e0;border-radius:6px;margin:0.3rem auto;"></div>
            </div>
        `).join('');
        container.innerHTML = `<div class="category-block"><div class="product-grid">${skeletons}</div></div>`;
        return;
    }

    const groups = groupByCategory(products);

    container.innerHTML = Object.keys(groups).map(category => {
        const items = groups[category];
        const cards = items.map(product => {
            const formattedPrice = formatPrice(product.price);
            return `
                <a href="product-detail.html?id=${product.id}" style="text-decoration:none;color:inherit;display:block;height:100%;">
                    <div class="product-card" style="--i: ${product.id}">
                        <img src="${product.image}" alt="${product.name}" loading="lazy"
                             onerror="this.onerror=null; this.src='images/placeholder.jpg';" />
                        <h3>${product.name}</h3>
                        <p class="desc">${product.description}</p>
                        <div class="price">Rs ${formattedPrice}</div>
                    </div>
                </a>
            `;
        }).join('');

        return `
            <div class="category-block">
                <div class="category-header">
                    <span class="category-tag">${category}</span>
                </div>
                <div class="product-grid">${cards}</div>
            </div>
        `;
    }).join('');
}

// ============================================================
// SETUP FUNCTIONS
// ============================================================
function setupHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');
    if (!hamburger || !navLinks) return;

    function closeMenu() {
        navLinks.classList.remove('open');
        hamburger.textContent = '☰';
        hamburger.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
        const isOpen = navLinks.classList.toggle('open');
        hamburger.textContent = isOpen ? '✕' : '☰';
        hamburger.setAttribute('aria-expanded', String(isOpen));
    }

    hamburger.addEventListener('click', toggleMenu);
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1100) closeMenu();
    });
}

function setupContactForm() {
    const form = document.getElementById('contactForm');
    const msg = document.getElementById('contactFormMessage');
    if (!form) return;

    const fields = ['contactName', 'contactEmail', 'contactSubject', 'contactMessage'];

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        let hasError = false;
        fields.forEach(id => {
            const el = document.getElementById(id);
            const value = el.value.trim();
            const isInvalid = (value === '' || (id === 'contactEmail' && !isValidEmail(value)));
            el.classList.toggle('field-error', isInvalid);
            if (isInvalid) hasError = true;
        });

        if (hasError) {
            msg.style.color = '#dc3545';
            msg.textContent = 'Please fill in all fields with a valid email.';
            return;
        }

        msg.style.color = '#28a745';
        msg.textContent = '✅ Thank you! Your message has been sent.';
        form.reset();
        fields.forEach(id => document.getElementById(id).classList.remove('field-error'));
    });
}

function setupNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', function () {
        navbar.classList.toggle('navbar-scrolled', window.pageYOffset > 50);
    }, { passive: true });
}

// Now handles MULTIPLE carousels (one per category)
function setupCarouselMotion() {
    const wrappers = document.querySelectorAll('.scroll-wrapper');
    if (!wrappers.length) return;

    wrappers.forEach(wrapper => {
        const track = wrapper.querySelector('.carousel-track');
        if (!track) return;

        let isVisible = true;
        let isPaused = false;

        function applyState() {
            track.style.animationPlayState = (isVisible && !isPaused) ? 'running' : 'paused';
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                isVisible = entry.isIntersecting;
                applyState();
            });
        }, { threshold: 0.15 });
        observer.observe(wrapper);

        wrapper.addEventListener('mouseenter', () => { isPaused = true; applyState(); });
        wrapper.addEventListener('mouseleave', () => { isPaused = false; applyState(); });
        wrapper.addEventListener('focusin', () => { isPaused = true; applyState(); });
        wrapper.addEventListener('focusout', () => { isPaused = false; applyState(); });
    });
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    renderHomeCategories('homeCategories');
    renderProductsCategories('productsCategories');

    await loadProducts();

    renderHomeCategories('homeCategories');
    renderProductsCategories('productsCategories');

    setupHamburger();
    setupContactForm();
    setupNavbarScroll();
    setupCarouselMotion();

    console.log('🚀 Meeronix is ready!');
});