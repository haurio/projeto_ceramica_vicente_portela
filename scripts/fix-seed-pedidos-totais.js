const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

const fixes = [
    { id: 5, qty: 1000, price: 1.2, desconto: 0, frete: 80 },
    { id: 6, qty: 2000, price: 1.2, desconto: 50, frete: 120 },
    { id: 7, qty: 1500, price: 1.2, desconto: 0, frete: 100 },
    { id: 8, qty: 800, price: 1.2, desconto: 0, frete: 60 },
    { id: 9, qty: 2500, price: 1.2, desconto: 100, frete: 150 },
    { id: 10, qty: 500, price: 1.2, desconto: 0, frete: 40 },
    { id: 11, qty: 300, price: 1.2, desconto: 0, frete: 0 },
];

(async () => {
    for (const f of fixes) {
        const sub = Number((f.qty * f.price).toFixed(2));
        const total = Number((sub - f.desconto + f.frete).toFixed(2));
        await pool.query(
            'UPDATE pedidos SET desconto = $1, frete = $2 WHERE id = $3',
            [f.desconto, f.frete, f.id]
        );
        await pool.query(
            'UPDATE pedido_itens SET quantidade = $1, preco_unitario = $2, subtotal = $3 WHERE pedido_id = $4',
            [f.qty, f.price, sub, f.id]
        );
        await pool.query(
            'UPDATE pedido_pagamentos SET valor = $1 WHERE pedido_id = $2',
            [total, f.id]
        );
        console.log(`PED-${String(f.id).padStart(5, '0')} total=${total}`);
    }
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
