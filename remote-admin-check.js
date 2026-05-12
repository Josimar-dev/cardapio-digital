const Admin = {
    products: [],
    categories: [],
    categoriesFull: [],
    cadastros: [],
    editingId: null,
    currentPanel: 'dashboard',

    async init() {
        this.products = await AppData.getProducts();
        this.categories = await AppData.getCategories();
        this.categoriesFull = await AppData.request('GET', '/categories');

        const params = new URLSearchParams(window.location.search);
        this.currentPanel = params.get('panel') || 'dashboard';

        this.setupEventListeners();
        this.navigateTo(this.currentPanel);
    },

    setupEventListeners() {
        document.getElementById('productForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProductSave();
        });

        document.getElementById('productImage')?.addEventListener('change', (e) => {
            this.handleImagePreview(e);
        });

        document.getElementById('modalClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        document.getElementById('cancelProduct')?.addEventListener('click', () => this.closeModal());
        document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
        document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openForgotPassword();
        });
        document.getElementById('forgotClose')?.addEventListener('click', () => this.closeForgotPassword());
        document.getElementById('forgotCancel')?.addEventListener('click', () => this.closeForgotPassword());
        document.getElementById('forgotOverlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeForgotPassword();
        });
        document.getElementById('forgotRequestBtn')?.addEventListener('click', () => this.handleForgotRequest());
        document.getElementById('forgotUser')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleForgotRequest();
        });
        document.getElementById('resetBackBtn')?.addEventListener('click', () => this.backForgotStep1());
        document.getElementById('resetConfirmBtn')?.addEventListener('click', () => this.handleResetPassword());
        document.getElementById('resetConfirmPass')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleResetPassword();
        });

        document.getElementById('shareWhatsAppBtn')?.addEventListener('click', () => {
            window.open('https://cardapio.sbs/ver-cardapio.html', '_blank');
        });

        document.querySelectorAll('.admin-sidebar-nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const panel = link.dataset.panel;
                if (panel) this.navigateTo(panel);
            });
        });

        document.getElementById('menuToggle')?.addEventListener('click', () => {
            document.getElementById('adminSidebar')?.classList.toggle('open');
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    },

    handleLogin() {
        const username = document.getElementById('loginUser').value.trim();
        const password = document.getElementById('loginPass').value.trim();
        const errorEl = document.getElementById('loginError');

        Auth.login(username, password).then(success => {
            if (success) {
                window.location.href = 'admin.html?panel=dashboard';
            } else {
                if (errorEl) {
                    errorEl.textContent = 'Usuário ou senha inválidos!';
                    errorEl.classList.add('show');
                }
            }
        });
    },

    navigateTo(panel) {
        this.currentPanel = panel;

        document.querySelectorAll('.panel').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-sidebar-nav a').forEach(el => el.classList.remove('active'));

        const targetPanel = document.getElementById(`panel-${panel}`);
        if (targetPanel) targetPanel.style.display = 'block';

        const activeLink = document.querySelector(`.admin-sidebar-nav a[data-panel="${panel}"]`);
        if (activeLink) activeLink.classList.add('active');

        document.getElementById('adminSidebar')?.classList.remove('open');

        if (panel === 'dashboard') this.renderDashboard();
        else if (panel === 'products') this.renderProductList();
        else if (panel === 'categories') this.renderCategories();
        else if (panel === 'cadastros') this.renderCadastros();
    },

    async renderDashboard() {
        this.products = await AppData.getProducts();
        this.categories = await AppData.getCategories();
        this.cadastros = await AppData.getCadastros();

        const totalProducts = this.products.length;
        const availableProducts = this.products.filter(p => p.available).length;
        const totalCategories = this.categories.length;
        const totalCadastros = this.cadastros.length;

        document.getElementById('statTotalProducts').textContent = totalProducts;
        document.getElementById('statAvailable').textContent = availableProducts;
        document.getElementById('statCategories').textContent = totalCategories;
        document.getElementById('statCadastros').textContent = totalCadastros;

        const recentProducts = [...this.products]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 5);

        const tableBody = document.getElementById('recentProducts');
        if (tableBody) {
            if (recentProducts.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px;">Nenhum produto cadastrado</td></tr>';
            } else {
                tableBody.innerHTML = recentProducts.map(p => `
                    <tr>
                        <td>
                            ${p.image
                                ? `<img class="product-thumb" src="${p.image}" alt="${p.name}">`
                                : `<div class="product-thumb-placeholder">🍽️</div>`
                            }
                        </td>
                        <td data-label="Nome">${p.name}</td>
                        <td data-label="Preço">${AppData.formatPrice(p.price)}</td>
                        <td data-label="Categoria">${p.category}</td>
                        <td data-label="Status">
                            <span class="status-badge ${p.available ? 'available' : 'unavailable'}">
                                ${p.available ? 'Disponível' : 'Indisponível'}
                            </span>
                        </td>
                    </tr>
                `).join('');
            }
        }
    },

    async renderProductList() {
        this.products = await AppData.getProducts();
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (this.products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;">Nenhum produto cadastrado. Clique em "Novo Produto" para adicionar.</td></tr>';
            return;
        }

        tbody.innerHTML = this.products.map(p => `
            <tr>
                <td data-label="Foto">
                    ${p.image
                        ? `<img class="product-thumb" src="${p.image}" alt="${p.name}">`
                        : `<div class="product-thumb-placeholder">🍽️</div>`
                    }
                </td>
                <td data-label="Nome">${p.name}</td>
                <td data-label="Preço">${AppData.formatPrice(p.price)}</td>
                <td data-label="Categoria">${p.category}</td>
                <td data-label="Status">
                    <span class="status-badge ${p.available ? 'available' : 'unavailable'}">
                        ${p.available ? 'Disponível' : 'Indisponível'}
                    </span>
                </td>
                <td class="actions" data-label="Ações">
                    <button class="btn-icon" onclick="Admin.editProduct('${p.id}')" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="Admin.duplicateProduct('${p.id}')" title="Duplicar">📋</button>
                    <button class="btn-icon" onclick="Admin.deleteProduct('${p.id}')" title="Excluir" style="color:var(--accent-primary)">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    async renderCategories() {
        this.categoriesFull = await AppData.request('GET', '/categories');
        this.categories = this.categoriesFull.map(c => c.name);
        this.products = await AppData.getProducts();

        const container = document.getElementById('categoriesList');
        if (!container) return;

        container.innerHTML = this.categoriesFull.map(cat => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--bg-card);border-radius:var(--radius-md);border:1px solid var(--border-color);margin-bottom:8px;">
                <span style="font-weight:600;">${cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}</span>
                <div style="display:flex;gap:4px;">
                    <span style="font-size:0.85rem;color:var(--text-muted);margin-right:8px;">${this.products.filter(p => p.category === cat.name).length} produtos</span>
                    <button class="btn-icon" onclick="Admin.editCategory(${cat.id})" title="Editar">✏️</button>
                    <button class="btn-icon" onclick="Admin.deleteCategory(${cat.id})" title="Excluir" style="color:var(--accent-primary)">🗑️</button>
                </div>
            </div>
        `).join('');
    },

    async renderCadastros() {
        this.cadastros = await AppData.getCadastros();
        const tbody = document.getElementById('cadastrosTableBody');
        if (!tbody) return;

        if (this.cadastros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">Nenhum cadastro encontrado.</td></tr>';
            return;
        }

        tbody.innerHTML = this.cadastros.map(c => `
            <tr>
                <td data-label="Nome">${c.nomeCompleto || c.username || '-'}</td>
                <td data-label="Usuario">${c.username || '-'}</td>
                <td data-label="WhatsApp">${c.whatsapp || '-'}</td>
                <td data-label="E-mail">${c.email || '-'}</td>
                <td data-label="Data">${this.formatDate(c.dataCadastro)}</td>
            </tr>
        `).join('');
    },

    formatDate(value) {
        if (!value) return '-';
        const date = new Date(String(value).replace(' ', 'T'));
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleString('pt-BR');
    },

    async exportCadastros() {
        try {
            const token = sessionStorage.getItem('cardapio_admin_token');
            const res = await fetch('/api/cadastros/export', {
                headers: { Authorization: 'Basic ' + token }
            });
            if (!res.ok) throw new Error('Erro ao exportar cadastros.');

            const blob = await res.blob();
            const disposition = res.headers.get('Content-Disposition') || '';
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
            const filename = filenameMatch ? filenameMatch[1] : 'cadastros.xlsx';
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            this.showToast(e.message, 'error');
        }
    },

    openNewProduct() {
        this.editingId = null;
        document.getElementById('modalTitle').textContent = 'Novo Produto';
        document.getElementById('productForm').reset();
        document.getElementById('productId').value = '';
        document.getElementById('productAvailable').checked = true;
        document.getElementById('imagePreview').classList.remove('show');
        document.getElementById('imagePreview').src = '';

        this.populateCategorySelect();
        this.openModal();
    },

    editProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        this.editingId = id;
        document.getElementById('modalTitle').textContent = 'Editar Produto';
        document.getElementById('productId').value = id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productDesc').value = product.description;
        document.getElementById('productPrice').value = product.price.toFixed(2).replace('.', ',');
        document.getElementById('productAvailable').checked = product.available;

        this.populateCategorySelect(product.category);

        if (product.image) {
            const preview = document.getElementById('imagePreview');
            preview.src = product.image;
            preview.classList.add('show');
        } else {
            document.getElementById('imagePreview').classList.remove('show');
        }

        this.openModal();
    },

    async duplicateProduct(id) {
        const product = this.products.find(p => p.id === id);
        if (!product) return;

        try {
            await AppData.saveProduct({
                ...product,
                id: undefined,
                name: product.name + ' (cópia)'
            });
            this.products = await AppData.getProducts();
            this.renderProductList();
            this.showToast('Produto duplicado com sucesso!', 'success');
        } catch (e) {
            this.showToast('Erro ao duplicar produto.', 'error');
        }
    },

    async deleteProduct(id) {
        if (!confirm('Tem certeza que deseja excluir este produto?')) return;
        try {
            await AppData.deleteProduct(id);
            this.products = this.products.filter(p => p.id !== id);
            this.renderProductList();
            this.showToast('Produto excluído com sucesso!', 'success');
        } catch (e) {
            this.showToast('Erro ao excluir produto.', 'error');
        }
    },

    async handleProductSave() {
        const name = document.getElementById('productName').value.trim();
        const description = document.getElementById('productDesc').value.trim();
        const priceRaw = document.getElementById('productPrice').value.trim();
        const category = document.getElementById('productCategory').value;
        const available = document.getElementById('productAvailable').checked;
        const imagePreview = document.getElementById('imagePreview');

        if (!name) { this.showToast('Informe o nome do produto.', 'error'); return; }
        if (!description) { this.showToast('Informe a descrição do produto.', 'error'); return; }
        if (!priceRaw) { this.showToast('Informe o preço do produto.', 'error'); return; }

        const price = AppData.parsePrice(priceRaw);
        if (price <= 0) { this.showToast('Preço inválido.', 'error'); return; }
        if (!category) { this.showToast('Selecione uma categoria.', 'error'); return; }

        const productData = {
            name,
            description,
            price,
            category,
            available,
            image: imagePreview.classList.contains('show') ? imagePreview.src : ''
        };

        if (this.editingId) {
            productData.id = this.editingId;
        }

        try {
            await AppData.saveProduct(productData);
            this.products = await AppData.getProducts();
            this.closeModal();
            this.renderProductList();
            this.showToast(
                this.editingId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!',
                'success'
            );
        } catch (e) {
            this.showToast('Erro ao salvar produto: ' + e.message, 'error');
        }
    },

    handleImagePreview(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showToast('Selecione uma imagem válida.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showToast('A imagem deve ter no máximo 5MB.', 'error');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const preview = document.getElementById('imagePreview');
            preview.src = event.target.result;
            preview.classList.add('show');
        };
        reader.readAsDataURL(file);
    },

    populateCategorySelect(selected) {
        const select = document.getElementById('productCategory');
        if (!select) return;
        select.innerHTML = '<option value="">Selecione...</option>';
        this.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
            if (cat === selected) opt.selected = true;
            select.appendChild(opt);
        });
    },

    async openNewCategory() {
        const name = prompt('Nome da nova categoria:');
        if (!name || !name.trim()) return;
        const cat = name.trim().toLowerCase();
        try {
            await AppData.saveCategory(cat);
            this.categoriesFull = await AppData.request('GET', '/categories');
            this.categories = this.categoriesFull.map(c => c.name);
            this.renderCategories();
            this.showToast('Categoria adicionada!', 'success');
        } catch (e) {
            this.showToast(e.message.includes('já existe') ? 'Categoria já existe.' : 'Erro ao adicionar.', 'error');
        }
    },

    async editCategory(id) {
        const cat = this.categoriesFull.find(c => c.id === id);
        if (!cat) return;
        const name = prompt('Editar nome da categoria:', cat.name);
        if (!name || !name.trim()) return;
        try {
            await AppData.updateCategory(id, name.trim().toLowerCase());
            this.categoriesFull = await AppData.request('GET', '/categories');
            this.categories = this.categoriesFull.map(c => c.name);
            this.products = await AppData.getProducts();
            this.renderCategories();
            this.showToast('Categoria atualizada!', 'success');
        } catch (e) {
            this.showToast('Erro ao atualizar.', 'error');
        }
    },

    async deleteCategory(id) {
        const cat = this.categoriesFull.find(c => c.id === id);
        if (!cat) return;
        const count = this.products.filter(p => p.category === cat.name).length;
        const msg = count > 0
            ? `Existem ${count} produto(s) nesta categoria. Deseja realmente excluí-la?`
            : `Excluir categoria "${cat.name}"?`;
        if (!confirm(msg)) return;

        try {
            await AppData.deleteCategory(id);
            this.categoriesFull = await AppData.request('GET', '/categories');
            this.categories = this.categoriesFull.map(c => c.name);
            this.products = await AppData.getProducts();
            this.renderCategories();
            this.showToast('Categoria excluída!', 'success');
        } catch (e) {
            this.showToast('Erro ao excluir.', 'error');
        }
    },

    openModal() {
        document.getElementById('modalOverlay').classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('open');
        document.body.style.overflow = '';
    },

    openForgotPassword() {
        document.getElementById('forgotStep1').style.display = '';
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotUser').value = '';
        document.getElementById('forgotError').textContent = '';
        document.getElementById('forgotError').classList.remove('show');
        document.getElementById('forgotOverlay').classList.add('open');
        document.getElementById('forgotUser').focus();
    },

    closeForgotPassword() {
        document.getElementById('forgotOverlay').classList.remove('open');
    },

    backForgotStep1() {
        document.getElementById('forgotStep1').style.display = '';
        document.getElementById('forgotStep2').style.display = 'none';
        document.getElementById('forgotError').textContent = '';
        document.getElementById('forgotError').classList.remove('show');
    },

    async handleForgotRequest() {
        const username = document.getElementById('forgotUser').value.trim();
        const errorEl = document.getElementById('forgotError');

        if (!username) {
            errorEl.textContent = 'Digite seu usuário.';
            errorEl.classList.add('show');
            return;
        }

        try {
            const data = await Auth.forgotPassword(username);
            document.getElementById('forgotStep1').style.display = 'none';
            document.getElementById('forgotStep2').style.display = '';
            document.getElementById('resetToken').value = '';
            document.getElementById('resetNewPass').value = '';
            document.getElementById('resetConfirmPass').value = '';
            const infoEl = document.getElementById('forgotSuccessInfo');
            infoEl.innerHTML = `✅ Token gerado!<br><br>
                <strong style="font-size:1.2rem;letter-spacing:2px;font-family:monospace;">${data.token}</strong><br><br>
                Copie este token e use no campo abaixo. Ele expira em 30 minutos.`;
            document.getElementById('resetToken').focus();
        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.classList.add('show');
        }
    },

    async handleResetPassword() {
        const username = document.getElementById('forgotUser').value.trim();
        const token = document.getElementById('resetToken').value.trim();
        const newPass = document.getElementById('resetNewPass').value;
        const confirmPass = document.getElementById('resetConfirmPass').value;
        const errorEl = document.getElementById('forgotError');

        if (!token) {
            errorEl.textContent = 'Digite o token de recuperação.';
            errorEl.classList.add('show');
            return;
        }
        if (!newPass) {
            errorEl.textContent = 'Digite a nova senha.';
            errorEl.classList.add('show');
            return;
        }
        if (newPass.length < 4) {
            errorEl.textContent = 'A senha deve ter no mínimo 4 caracteres.';
            errorEl.classList.add('show');
            return;
        }
        if (newPass !== confirmPass) {
            errorEl.textContent = 'As senhas não conferem.';
            errorEl.classList.add('show');
            return;
        }

        try {
            await Auth.resetPassword(username, token, newPass);
            this.closeForgotPassword();
            this.showToast('Senha alterada com sucesso!', 'success');
        } catch (e) {
            errorEl.textContent = e.message;
            errorEl.classList.add('show');
        }
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = { success: '✅', error: '❌', info: 'ℹ️' };
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span> ${message}`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            toast.style.transition = '0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                Admin.handleLogin();
            });
        }

        const params = new URLSearchParams(window.location.search);

        if (params.get('panel')) {
            Auth.requireAuth();
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('adminPanel').style.display = '';
            Admin.init();
        } else {
            if (Auth.isAuthenticated()) {
                window.location.href = 'admin.html?panel=dashboard';
            }
            if (params.get('registered') === '1') {
                const successEl = document.getElementById('registerSuccess');
                if (successEl) {
                    successEl.textContent = '✅ Conta criada com sucesso! Faça o login.';
                    successEl.classList.add('show');
                }
            }
        }
    }
});
