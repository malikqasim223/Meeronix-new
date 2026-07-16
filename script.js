/* ============================================================
   MEERONIX – COMPLETE JAVASCRIPT
   ============================================================ */

const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbyFnPHyC9MxhTuFxtdH1FeFsFqwG7IK99tMfh8ZPJXWAK9aIN4evGmI4QotQJE1aAkiug/exec';

const CACHE_KEY = 'meeronix_products';
const CACHE_TIMESTAMP_KEY = 'meeronix_products_time';
const CACHE_DURATION = 10 * 60 * 1000;

let products = [];
window.contentData = {};

// ============================================================
// FORMAT PRICE
// ============================================================
function formatPrice(value) {
    if (value === null || value === undefined || value === '') return '0.00';
    const cleanValue = String(value).replace(/[^0-9.]/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? '0.00' : number.toFixed(2);
}

// ============================================================
// GROUP BY CATEGORY
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
// LOAD PRODUCTS
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
            } catch (e) { products = []; }
        }
        return [];
    }
}

// ============================================================
// RENDER: HOME CATEGORIES (Carousel)
// ============================================================
function renderHomeCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `<div class="category-block"><div class="scroll-wrapper"><div class="carousel-track">Loading...</div></div></div>`;
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
        const original = items.map(p => buildTile(p, false)).join('');
        const duplicate = items.map(p => buildTile(p, true)).join('');

        return `
            <div class="category-block">
                <div class="category-header">
                    <span class="category-tag">${category}</span>
                </div>
                <div class="scroll-wrapper">
                    <div class="carousel-track">${original}${duplicate}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// RENDER: PRODUCTS CATEGORIES (Grid)
// ============================================================
function renderProductsCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = `<div class="category-block"><div class="product-grid">Loading...</div></div>`;
        return;
    }

    const groups = groupByCategory(products);

    container.innerHTML = Object.keys(groups).map(category => {
        const items = groups[category];
        const cards = items.map(product => `
            <a href="product-detail.html?id=${product.id}" style="text-decoration:none;color:inherit;display:block;height:100%;">
                <div class="product-card" style="--i: ${product.id}">
                    <img src="${product.image}" alt="${product.name}" loading="lazy"
                         onerror="this.onerror=null; this.src='images/placeholder.jpg';" />
                    <h3>${product.name}</h3>
                    <p class="desc">${product.description}</p>
                    <div class="price">Rs ${formatPrice(product.price)}</div>
                </div>
            </a>
        `).join('');

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
// RENDER: ABOUT PAGE
// ============================================================
function renderAboutPage() {
    const container = document.getElementById('aboutContent');
    if (!container) return;

    const about = window.contentData?.about || {};

    const story = about.story || {};
    const storyTitle = story.title || 'Our Story';
    const storyText = story.text || 'Founded in 2020, Meeronix was born from a simple idea: <strong>everyone deserves access to premium electronics without the premium price tag.</strong>';

    const mission = about.mission || {};
    const missionTitle = mission.title || 'Our Mission';
    const missionText = mission.text || 'To bridge the gap between cutting-edge technology and everyday accessibility.';

    const features = [
        about.feature1 || { icon: '🔒', title: 'Trusted Quality', text: 'Every product is vetted for excellence' },
        about.feature2 || { icon: '📦', title: 'Fast Shipping', text: 'Delivered to your door in days' },
        about.feature3 || { icon: '💬', title: '24/7 Support', text: 'We\'re here when you need us' }
    ];

    container.innerHTML = `
        <h2 class="about-heading">${storyTitle}</h2>
        <p class="about-text">${storyText}</p>
        <hr class="about-divider" />
        <h2 class="about-heading">${missionTitle}</h2>
        <p class="about-text">${missionText}</p>
        <div class="about-grid">
            ${features.map(f => `
                <div class="about-feature">
                    <div class="about-feature-icon">${f.icon}</div>
                    <h4>${f.title}</h4>
                    <p>${f.text}</p>
                </div>
            `).join('')}
        </div>
    `;
}

// ============================================================
// RENDER: CONTACT PAGE
// ============================================================
function renderContactPage() {
    const container = document.getElementById('contactContent');
    if (!container) return;

    const contact = window.contentData?.contact || {};

    const email = contact.email?.value || 'support@meeronix.com';
    const phone = contact.phone?.value || '+1 (555) 123-4567';
    const address = contact.address?.value || '123 Tech Street, Silicon Valley, CA 94025';
    const hours = contact.hours?.value || 'Mon–Fri, 9:00 AM – 6:00 PM EST';
    const whatsapp = contact.whatsapp?.value || '15551234567';

    container.innerHTML = `
        <div class="contact-info">
            <h3>Get in Touch</h3>
            <p>📧 <strong>Email:</strong> ${email}</p>
            <p>📞 <strong>Phone:</strong> ${phone}</p>
            <p>📍 <strong>Address:</strong> ${address}</p>
            <p>🕐 <strong>Hours:</strong> ${hours}</p>
            <a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer" class="whatsapp-float-contact" style="margin-top: 1.5rem;">
                💬 Chat with us on WhatsApp
            </a>
        </div>
        <div class="contact-form">
            <h3>Send a Message</h3>
            <form id="contactForm" novalidate>
                <input type="text" id="contactName" placeholder="Your Name" required />
                <input type="email" id="contactEmail" placeholder="Your Email" required />
                <input type="text" id="contactSubject" placeholder="Subject" required />
                <textarea id="contactMessage" rows="5" placeholder="Your Message..." required></textarea>
                <button type="submit" class="btn-primary" id="contactSubmitBtn" style="width: 100%;">Send Message</button>
            </form>
            <div id="contactFormMessage" class="form-message" role="status" aria-live="polite"></div>
        </div>
    `;

    // Re-initialize contact form
    setupContactForm();
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
// PRODUCT DETAIL PAGE
// ============================================================
function renderProductDetail() {
    const container = document.getElementById('productDetailContent');
    if (!container) return;

    const urlParams = new URLSearchParams(window.location.search);
    const productId = parseInt(urlParams.get('id'));

    if (!productId) {
        container.innerHTML = `
            <div class="product-detail-empty">
                <h2>No Product Selected</h2>
                <p>Please go back to the <a href="products.html" style="color:var(--accent);">Products page</a>.</p>
            </div>
        `;
        return;
    }

    const product = products.find(p => p.id === productId);

    if (!product) {
        container.innerHTML = `
            <div class="product-detail-notfound">
                <h2>Product Not Found</h2>
                <p>Sorry, we couldn't find this product.</p>
                <a href="products.html" class="btn-primary">Back to Products</a>
            </div>
        `;
        return;
    }

    const details = product.details || product.description || 'No additional details available.';

    container.innerHTML = `
        <div class="product-detail-wrapper">
            <div class="product-detail-image">
                <img src="${product.image}" alt="${product.name}" />
            </div>
            <div class="product-detail-info">
                <h1>${product.name}</h1>
                <div class="product-detail-price">Rs ${formatPrice(product.price)}</div>
                <div class="product-detail-description">${product.description}</div>
                <div class="product-detail-details">
                    <h3>📋 Product Details</h3>
                    <p>${details}</p>
                </div>
                ${product.specs ? `
                    <div class="product-detail-specs">
                        <h3>📐 Specifications</h3>
                        <div><p>${product.specs}</p></div>
                    </div>
                ` : ''}
                <div class="product-detail-buttons">
                    <a href="products.html" class="btn-secondary">← Back to Products</a>
                    <a href="contact.html" class="btn-primary">📩 Contact Us</a>
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async function () {
    // Show loading state
    const homeContainer = document.getElementById('homeCategories');
    const productsContainer = document.getElementById('productsCategories');
    const aboutContainer = document.getElementById('aboutContent');
    const contactContainer = document.getElementById('contactContent');

    if (homeContainer) homeContainer.innerHTML = '<div class="category-block"><div class="scroll-wrapper"><div class="carousel-track">Loading products...</div></div></div>';
    if (productsContainer) productsContainer.innerHTML = '<div class="category-block"><div class="product-grid">Loading products...</div></div>';
    if (aboutContainer) aboutContainer.innerHTML = '<p style="text-align:center;padding:2rem;">Loading about us...</p>';
    if (contactContainer) contactContainer.innerHTML = '<p style="text-align:center;padding:2rem;">Loading contact information...</p>';

    await loadProducts();

    renderHomeCategories('homeCategories');
    renderProductsCategories('productsCategories');

    if (document.getElementById('aboutContent')) renderAboutPage();
    if (document.getElementById('contactContent')) renderContactPage();
    if (document.getElementById('productDetailContent')) renderProductDetail();

    setupHamburger();
    setupContactForm();
    setupNavbarScroll();
    setupCarouselMotion();

    console.log('🚀 Meeronix is ready!');
});