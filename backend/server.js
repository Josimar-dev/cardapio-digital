const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { initDatabase, getDb, queryAll, queryOne, run } = require('./database');

let XLSX = null;
try {
    XLSX = require('xlsx');
} catch {
    XLSX = null;
}

const HOSTINGER_PUBLIC_PATH = path.join(__dirname, '..', 'public_html');
const HAS_HOSTINGER_PUBLIC_PATH = fs.existsSync(HOSTINGER_PUBLIC_PATH);
const PLANILHAS_DIR = HAS_HOSTINGER_PUBLIC_PATH
    ? path.join(HOSTINGER_PUBLIC_PATH, 'planilhas')
    : path.join(__dirname, '..', 'planilhas');
const CADASTROS_PATH = path.join(PLANILHAS_DIR, 'cadastros.xlsx');

function saveToExcel(nome, whatsapp, email) {
    if (!XLSX) return;

    if (!fs.existsSync(PLANILHAS_DIR)) {
        fs.mkdirSync(PLANILHAS_DIR, { recursive: true });
    }

    let workbook;
    let data = [];

    if (fs.existsSync(CADASTROS_PATH)) {
        workbook = XLSX.readFile(CADASTROS_PATH);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(sheet);
    } else {
        workbook = XLSX.utils.book_new();
    }

    data.push({
        Nome: nome,
        WhatsApp: whatsapp,
        'E-mail': email,
        'Data do Cadastro': new Date().toLocaleString('pt-BR')
    });

    const newSheet = XLSX.utils.json_to_sheet(data);
    if (workbook.SheetNames.length > 0) {
        workbook.Sheets[workbook.SheetNames[0]] = newSheet;
    } else {
        XLSX.utils.book_append_sheet(workbook, newSheet, 'Cadastros');
    }
    XLSX.writeFile(workbook, CADASTROS_PATH);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});
app.use(express.json({ limit: '10mb' }));

const FRONTEND_PATH = HAS_HOSTINGER_PUBLIC_PATH ? HOSTINGER_PUBLIC_PATH : path.join(__dirname, '..');
app.get('/', (req, res) => {
    res.redirect('/admin.html');
});
app.use(express.static(FRONTEND_PATH));

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
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

// ===== REGISTER =====
app.post('/api/register', (req, res) => {
    const { username, password, nomeCompleto, whatsapp, email } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }
    if (password.length < 4) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres' });
    }
    const existing = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (existing) {
        return res.status(409).json({ error: 'Usuário já existe' });
    }
    const hash = bcrypt.hashSync(password, 10);
    run('INSERT INTO users (username, password, nome_completo, whatsapp, email, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\'))',
        [username, hash, nomeCompleto || '', whatsapp || '', email || '']);
    saveToExcel(nomeCompleto || username, whatsapp || '', email || '');
    res.status(201).json({ message: 'Conta criada com sucesso' });
});

app.get('/api/cadastros', requireAuth, (req, res) => {
    const cadastros = queryAll(`
        SELECT id, username, nome_completo AS nomeCompleto, whatsapp, email, created_at AS dataCadastro
        FROM users
        WHERE username <> 'admin'
        ORDER BY id DESC
    `);
    res.json(cadastros);
});

app.get('/api/cadastros/export', requireAuth, (req, res) => {
    const cadastros = queryAll(`
        SELECT nome_completo AS Nome, whatsapp AS WhatsApp, email AS "E-mail", created_at AS "Data do Cadastro"
        FROM users
        WHERE username <> 'admin'
        ORDER BY id DESC
    `);
    if (cadastros.length === 0) {
        return res.status(404).json({ error: 'Nenhum cadastro encontrado' });
    }

    if (!XLSX) {
        const csv = [
            'Nome,WhatsApp,E-mail,Data do Cadastro',
            ...cadastros.map(c => [
                c.Nome || '',
                c.WhatsApp || '',
                c['E-mail'] || '',
                c['Data do Cadastro'] || ''
            ].map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        res.setHeader('Content-Disposition', 'attachment; filename="cadastros.csv"');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send(csv);
    }

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(cadastros);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Cadastros');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=\"cadastros.xlsx\"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

app.post('/api/cadastros', (req, res) => {
    const { nome, whatsapp, email } = req.body;
    if (!nome || !whatsapp || !email) {
        return res.status(400).json({ error: 'Nome, WhatsApp e e-mail são obrigatórios' });
    }
    try {
        saveToExcel(nome, whatsapp, email);
        res.status(201).json({ message: 'Cadastro salvo na planilha com sucesso' });
    } catch (err) {
        console.error('Erro ao salvar na planilha:', err);
        res.status(500).json({ error: 'Erro ao salvar na planilha' });
    }
});

// ===== FORGOT / RESET PASSWORD =====
app.post('/api/forgot-password', (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Usuário é obrigatório' });
    }
    const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const token = Date.now().toString(36) + Math.random().toString(36).substr(2, 16);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    run('INSERT INTO reset_tokens (username, token, expires_at) VALUES (?, ?, ?)',
        [username, token, expiresAt]);

    res.json({ message: 'Token gerado com sucesso', token });
});

app.post('/api/reset-password', (req, res) => {
    const { username, token, newPassword } = req.body;
    if (!username || !token || !newPassword) {
        return res.status(400).json({ error: 'Usuário, token e nova senha são obrigatórios' });
    }
    if (newPassword.length < 4) {
        return res.status(400).json({ error: 'A senha deve ter no mínimo 4 caracteres' });
    }

    const resetToken = queryOne(
        'SELECT * FROM reset_tokens WHERE username = ? AND token = ? AND used = 0 AND expires_at > datetime(\'now\')',
        [username, token]
    );
    if (!resetToken) {
        return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    run('UPDATE users SET password = ? WHERE username = ?', [hash, username]);
    run('UPDATE reset_tokens SET used = 1 WHERE id = ?', [resetToken.id]);

    res.json({ message: 'Senha alterada com sucesso' });
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

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
});
