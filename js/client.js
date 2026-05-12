const Client = {
    products: [],
    categories: [],
    activeCategory: 'todos',
    searchTerm: '',

    async init() {
        this.products = await AppData.getProducts();
        this.categories = await AppData.getCategories();

        const params = new URLSearchParams(window.location.search);
        const requestedCategory = (params.get('category') || window.location.hash.slice(1) || '').toLowerCase();
        if (requestedCategory === 'todos' || this.categories.includes(requestedCategory)) {
            this.activeCategory = requestedCategory || 'todos';
        }

        Cart.init();
        this.renderCategories();
        this.renderProducts();
        this.setupEventListeners();
        Cart.updateUI();
    },

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase().trim();
                this.renderProducts();
            });
        }

        document.getElementById('cartClose')?.addEventListener('click', () => Cart.closeDrawer());
        document.getElementById('cartOverlay')?.addEventListener('click', () => Cart.closeDrawer());

        const sendBtn = document.getElementById('sendWhatsApp');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                const phone = sendBtn.dataset.phone || '5511999999999';
                Cart.sendWhatsApp(phone);
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') Cart.closeDrawer();
        });
    },

    renderCategories() {
        const container = document.getElementById('categoryTabs');
        if (!container) return;

        const order = ['bebidas', 'lanches', 'pizzas', 'sobremesas'];
        const sortedCategories = [...new Set(this.categories)].sort((a, b) => {
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);
            if (indexA !== -1 || indexB !== -1) {
                return (indexA === -1 ? order.length : indexA) - (indexB === -1 ? order.length : indexB);
            }
            return a.localeCompare(b, 'pt-BR');
        });

        let html = `<button class="category-tab ${this.activeCategory === 'todos' ? 'active' : ''}" onclick="Client.filterByCategory('todos')">Todos</button>`;

        sortedCategories.forEach(cat => {
            const label = cat.charAt(0).toUpperCase() + cat.slice(1);
            html += `<button class="category-tab ${this.activeCategory === cat ? 'active' : ''}" onclick="Client.filterByCategory('${cat}')">${label}</button>`;
        });

        container.innerHTML = html;
    },

    filterByCategory(category) {
        this.activeCategory = category;
        this.renderCategories();
        this.renderProducts();
    },

    renderProducts() {
        const container = document.getElementById('productsGrid');
        const emptyEl = document.getElementById('productsEmpty');
        if (!container) return;

        let filtered = this.products.filter(p => p.available);

        if (this.activeCategory !== 'todos') {
            filtered = filtered.filter(p => p.category === this.activeCategory);
        }

        if (this.searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(this.searchTerm) ||
                p.description.toLowerCase().includes(this.searchTerm)
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '';
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        container.innerHTML = filtered.map(product => {
            const cartItem = Cart.items.find(i => i.id === product.id);
            const qty = cartItem ? cartItem.quantity : 0;
            const safeId = product.id.replace(/'/g, "\\'");
            const safeName = product.name.replace(/"/g, '&quot;');

            return `
                <div class="product-card">
                    ${product.image
                        ? `<img class="product-card-image" src="${product.image}" alt="${safeName}" loading="lazy">`
                        : `<div class="product-card-image-placeholder">🍽️</div>`
                    }
                    <div class="product-card-body">
                        <div class="product-card-header">
                            <span class="product-card-name">${product.name}</span>
                            <span class="product-card-price">${AppData.formatPrice(product.price)}</span>
                        </div>
                        <p class="product-card-desc">${product.description}</p>
                        <div class="product-card-footer">
                            ${product.available
                                ? `<div class="qty-controls">
                                    <button class="qty-btn minus" onclick="Cart.decrease('${safeId}'); Client.updateQty('${safeId}')">−</button>
                                    <span class="qty-value" id="qty_${safeId}">${qty}</span>
                                    <button class="qty-btn plus" onclick="Client.addToCart('${safeId}')">+</button>
                                </div>`
                                : `<span class="unavailable-badge">Indisponível</span>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            Cart.add(product);
            this.updateQty(productId);
        }
    },

    updateQty(productId) {
        const span = document.getElementById(`qty_${productId}`);
        if (span) {
            const item = Cart.items.find(i => i.id === productId);
            span.textContent = item ? item.quantity : 0;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Client.init());
