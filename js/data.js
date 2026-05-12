const API_BASE = '/api';

const AppData = {
    async request(method, path, body = null) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };
        const token = sessionStorage.getItem('cardapio_admin_token');
        if (token) {
            opts.headers['Authorization'] = 'Basic ' + token;
        }
        if (body) opts.body = JSON.stringify(body);

        const res = await fetch(`${API_BASE}${path}`, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na requisição');
        return data;
    },

    // Products
    async getProducts() {
        return this.request('GET', '/products');
    },

    async getProduct(id) {
        return this.request('GET', `/products/${id}`);
    },

    async saveProduct(product) {
        if (product.id) {
            return this.request('PUT', `/products/${product.id}`, product);
        }
        return this.request('POST', '/products', product);
    },

    async deleteProduct(id) {
        return this.request('DELETE', `/products/${id}`);
    },

    // Categories
    async getCategories() {
        const cats = await this.request('GET', '/categories');
        return cats.map(c => c.name);
    },

    async saveCategory(name) {
        return this.request('POST', '/categories', { name });
    },

    async updateCategory(id, name) {
        return this.request('PUT', `/categories/${id}`, { name });
    },

    async deleteCategory(id) {
        return this.request('DELETE', `/categories/${id}`);
    },

    // Cadastros
    async getCadastros() {
        return this.request('GET', '/cadastros');
    },

    // Utils
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    formatPrice(value) {
        return 'R$ ' + value.toFixed(2).replace('.', ',');
    },

    parsePrice(value) {
        return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    },

    // Legacy sync methods for cart (still uses localStorage)
    STORAGE_KEY: 'cardapio_digital_data',

    getLocalData() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return null;
    },

    saveLocalData(products, categories) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify({ products, categories }));
        } catch {}
    }
};
