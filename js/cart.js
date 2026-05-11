const Cart = {
    STORAGE_KEY: 'cardapio_cart',
    items: [],

    init() {
        this.load();
    },

    load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            this.items = raw ? JSON.parse(raw) : [];
        } catch {
            this.items = [];
        }
    },

    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.items));
    },

    add(product) {
        const existing = this.items.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image || '',
                quantity: 1
            });
        }
        this.save();
        this.updateUI();
    },

    remove(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateUI();
    },

    increase(productId) {
        const item = this.items.find(i => i.id === productId);
        if (item) {
            item.quantity += 1;
            this.save();
            this.updateUI();
        }
    },

    decrease(productId) {
        const item = this.items.find(i => i.id === productId);
        if (item) {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                this.remove(productId);
            } else {
                this.save();
                this.updateUI();
            }
        }
    },

    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    },

    getTotalItems() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },

    clear() {
        this.items = [];
        this.save();
        this.updateUI();
    },

    getWhatsAppMessage(phone) {
        if (this.items.length === 0) return '';

        let message = 'Olá! Gostaria de fazer o seguinte pedido:\n\n';
        this.items.forEach(item => {
            message += `${item.quantity}x ${item.name} - ${AppData.formatPrice(item.price * item.quantity)}\n`;
        });
        message += `\nTotal: ${AppData.formatPrice(this.getTotal())}`;

        return encodeURIComponent(message);
    },

    sendWhatsApp(phone) {
        const message = this.getWhatsAppMessage(phone);
        if (!message) return;
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
    },

    updateUI() {
        const badge = document.getElementById('cartBadge');
        if (badge) {
            const total = this.getTotalItems();
            badge.textContent = total;
            badge.classList.toggle('show', total > 0);
        }
        this.renderCartDrawer();
    },

    renderCartDrawer() {
        const container = document.getElementById('cartItems');
        const footer = document.getElementById('cartFooter');
        const empty = document.getElementById('cartEmpty');
        const totalEl = document.getElementById('cartTotal');

        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = '';
            if (empty) empty.style.display = 'block';
            if (footer) footer.style.display = 'none';
            if (totalEl) totalEl.textContent = AppData.formatPrice(0);
            return;
        }

        if (empty) empty.style.display = 'none';
        if (footer) footer.style.display = 'block';

        container.innerHTML = this.items.map(item => `
            <div class="cart-item" data-id="${item.id}">
                ${item.image
                    ? `<img class="cart-item-image" src="${item.image}" alt="${item.name}">`
                    : `<div class="cart-item-image" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--text-muted)">🍽️</div>`
                }
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${AppData.formatPrice(item.price)}</div>
                </div>
                <div class="cart-item-right">
                    <div class="cart-item-subtotal">${AppData.formatPrice(item.price * item.quantity)}</div>
                    <div class="qty-controls">
                        <button class="qty-btn minus" onclick="Cart.decrease('${item.id}')">−</button>
                        <span class="qty-value">${item.quantity}</span>
                        <button class="qty-btn plus" onclick="Cart.increase('${item.id}')">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        if (totalEl) totalEl.textContent = AppData.formatPrice(this.getTotal());

        const sendBtn = document.getElementById('sendWhatsApp');
        if (sendBtn) {
            sendBtn.disabled = false;
        }
    },

    openDrawer() {
        document.getElementById('cartOverlay')?.classList.add('open');
        document.getElementById('cartDrawer')?.classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    closeDrawer() {
        document.getElementById('cartOverlay')?.classList.remove('open');
        document.getElementById('cartDrawer')?.classList.remove('open');
        document.body.style.overflow = '';
    }
};
