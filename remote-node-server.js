const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabase, getDb, queryAll, queryOne, run } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const FRONTEND_PATH = path.join(__dirname, '..', 'public_html');

app.get('/', (req, res) => {
    res.redirect('/admin.html');
});

app.use(express.static(FRONTEND_PATH));

function requireAuth(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    try {
        const decoded = Buffer.from(auth.slice(6), 'base64').toString();
        const [username, password] = decoded.split(':');
        const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        req.user = user;
        next();
    } catch {
        return res.status(401).json({ error: 'Erro de autenticação' });
    }
}

// ===== LOGIN =====
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha obrigatórios' });
    }
    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    res.json({ token, username: user.username });
});

// ===== PRODUCTS =====
app.get('/api/products', (req, res) => {
    const products = queryAll('SELECT * FROM products ORDER BY createdAt DESC');
    res.json(products.map(p => ({ ...p, available: !!p.available })));
});

app.get('/api/products/:id', (req, res) => {
    const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    product.available = !!product.available;
    res.json(product);
});

app.post('/api/products', requireAuth, (req, res) => {
    const { id, name, description, price, category, image, available } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Nome e preço são obrigatórios' });
    }
    const productId = id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    run(
        `INSERT INTO products (id, name, description, price, category, image, available, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [productId, name, description || '', price, category || '', image || '', available ? 1 : 0]
    );
    const product = queryOne('SELECT * FROM products WHERE id = ?', [productId]);
    product.available = !!product.available;
    res.status(201).json(product);
});

app.put('/api/products/:id', requireAuth, (req, res) => {
    const { name, description, price, category, image, available } = req.body;
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });

    run(
        `UPDATE products SET name=?, description=?, price=?, category=?, image=?, available=? WHERE id=?`,
        [
            name !== undefined ? name : existing.name,
            description !== undefined ? description : existing.description,
            price !== undefined ? price : existing.price,
            category !== undefined ? category : existing.category,
            image !== undefined ? image : existing.image,
            available !== undefined ? (available ? 1 : 0) : existing.available,
            req.params.id
        ]
    );
    const product = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    product.available = !!product.available;
    res.json(product);
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
    const existing = queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Produto não encontrado' });
    run('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produto excluído' });
});

// ===== CATEGORIES =====
app.get('/api/categories', (req, res) => {
    const categories = queryAll('SELECT * FROM categories ORDER BY id');
    res.json(categories);
});

app.post('/api/categories', requireAuth, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });

    const existing = queryOne('SELECT * FROM categories WHERE name = ?', [name.toLowerCase()]);
    if (existing) return res.status(409).json({ error: 'Categoria já existe' });

    run('INSERT INTO categories (name) VALUES (?)', [name.toLowerCase()]);
    const cat = queryOne('SELECT * FROM categories WHERE name = ?', [name.toLowerCase()]);
    res.status(201).json(cat);
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome da categoria é obrigatório' });

    const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });

    const oldName = existing.name;
    run('UPDATE categories SET name = ? WHERE id = ?', [name.toLowerCase(), parseInt(req.params.id)]);
    run('UPDATE products SET category = ? WHERE category = ?', [name.toLowerCase(), oldName]);
    const cat = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat);
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
    const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Categoria não encontrada' });

    run('UPDATE products SET category = ? WHERE category = ?', ['outros', existing.name]);
    run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Categoria excluída' });
});

initDatabase().then(() => {
    console.log('Banco de dados pronto.');
    app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
        console.log(`📋 Cardápio: http://localhost:${PORT}`);
        console.log(`🔧 Admin: http://localhost:${PORT}/admin.html`);
    });
}).catch(err => {
    console.error('Erro ao iniciar banco:', err);
    process.exit(1);
});
