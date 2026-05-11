const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'cardapio.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT DEFAULT '',
        price REAL NOT NULL,
        category TEXT NOT NULL,
        image TEXT DEFAULT '',
        available INTEGER DEFAULT 1,
        createdAt TEXT DEFAULT (datetime('now'))
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    const userCount = db.exec('SELECT COUNT(*) as count FROM users');
    if (!userCount.length || !userCount[0].values.length || userCount[0].values[0][0] === 0) {
        const hash = bcrypt.hashSync('admin123', 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
        console.log('Usuário admin criado (senha: admin123)');
    }

    const catCount = db.exec('SELECT COUNT(*) as count FROM categories');
    if (!catCount.length || !catCount[0].values.length || catCount[0].values[0][0] === 0) {
        db.run('INSERT INTO categories (name) VALUES (?)', ['bebidas']);
        db.run('INSERT INTO categories (name) VALUES (?)', ['lanches']);
        db.run('INSERT INTO categories (name) VALUES (?)', ['pizzas']);
        db.run('INSERT INTO categories (name) VALUES (?)', ['sobremesas']);
    }

    const prodCount = db.exec('SELECT COUNT(*) as count FROM products');
    if (!prodCount.length || !prodCount[0].values.length || prodCount[0].values[0][0] === 0) {
        db.run(`INSERT INTO products (id, name, description, price, category, image, available, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`, ['1', 'Hambúrguer Artesanal', 'Pão brioche, hambúrguer 180g, queijo cheddar, alface, tomate, cebola roxa e molho especial.', 32.90, 'lanches', '']);
        db.run(`INSERT INTO products (id, name, description, price, category, image, available, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`, ['2', 'Pizza Margherita', 'Molho de tomate, mussarela, manjericão fresco e azeite extra virgem.', 45.90, 'pizzas', '']);
        db.run(`INSERT INTO products (id, name, description, price, category, image, available, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`, ['3', 'Coca-Cola Lata', 'Coca-Cola lata 350ml gelada.', 5.90, 'bebidas', '']);
        db.run(`INSERT INTO products (id, name, description, price, category, image, available, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))`, ['4', 'Petit Gateau', 'Bolo de chocolate com recheio cremoso, acompanhado de sorvete de creme.', 24.90, 'sobremesas', '']);
    }

    saveDb();
    console.log('Banco de dados inicializado com sucesso.');
}

function saveDb() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function getDb() {
    return db;
}

function queryAll(sql, params = []) {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function queryOne(sql, params = []) {
    const results = queryAll(sql, params);
    return results.length > 0 ? results[0] : null;
}

function run(sql, params = []) {
    db.run(sql, params);
    saveDb();
}

module.exports = { initDatabase, getDb, queryAll, queryOne, run, saveDb };
