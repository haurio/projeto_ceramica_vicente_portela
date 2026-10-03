require('dotenv').config();
const pool = require('../db');

async function main() {
    await pool.query(`
        UPDATE produtos SET
            preco_unitario = CASE id
                WHEN 1 THEN 1.20
                WHEN 2 THEN 0.95
                WHEN 3 THEN 1.10
                WHEN 4 THEN 1.35
                ELSE COALESCE(preco_unitario, 1)
            END,
            preco_milheiro = CASE id
                WHEN 1 THEN 980
                WHEN 2 THEN 850
                WHEN 3 THEN 920
                WHEN 4 THEN 1050
                ELSE COALESCE(preco_milheiro, 900)
            END,
            preco_m2 = CASE id
                WHEN 1 THEN 42
                WHEN 2 THEN 38
                WHEN 3 THEN 40
                WHEN 4 THEN 45
                ELSE COALESCE(preco_m2, 40)
            END
        WHERE id IN (1,2,3,4)
    `);

    const [itens] = await pool.query('SELECT id, produto_id, quantidade, unidade FROM pedido_itens');
    for (const item of itens) {
        const [prod] = await pool.query(
            'SELECT preco_unitario, preco_milheiro, preco_m2 FROM produtos WHERE id = ?',
            [item.produto_id]
        );
        if (!prod.length) continue;
        const p = prod[0];
        let price = Number(p.preco_unitario) || 0;
        if (item.unidade === 'milheiro') price = Number(p.preco_milheiro) || price;
        if (item.unidade === 'm²') price = Number(p.preco_m2) || price;
        const subtotal = Number((Number(item.quantidade) * price).toFixed(2));
        await pool.query(
            'UPDATE pedido_itens SET preco_unitario = ?, subtotal = ? WHERE id = ?',
            [price, subtotal, item.id]
        );
    }

    const [pedidos] = await pool.query('SELECT id, desconto FROM pedidos');
    for (const pedido of pedidos) {
        const [tot] = await pool.query(
            'SELECT COALESCE(SUM(subtotal),0) AS s FROM pedido_itens WHERE pedido_id = ?',
            [pedido.id]
        );
        const total = Math.max(0, Number(tot[0].s) - Number(pedido.desconto || 0));
        const [pays] = await pool.query(
            'SELECT id FROM pedido_pagamentos WHERE pedido_id = ? ORDER BY id',
            [pedido.id]
        );
        if (pays.length === 1) {
            await pool.query('UPDATE pedido_pagamentos SET valor = ? WHERE id = ?', [total, pays[0].id]);
        } else if (pays.length > 1) {
            const half = Number((total / 2).toFixed(2));
            await pool.query('UPDATE pedido_pagamentos SET valor = ? WHERE id = ?', [half, pays[0].id]);
            await pool.query('UPDATE pedido_pagamentos SET valor = ? WHERE id = ?', [Number((total - half).toFixed(2)), pays[1].id]);
        }
    }

    // pedido 1 com duas formas
    const [p1] = await pool.query(
        `SELECT COALESCE(SUM(i.subtotal),0) - COALESCE(p.desconto,0) AS total
         FROM pedidos p
         LEFT JOIN pedido_itens i ON i.pedido_id = p.id
         WHERE p.id = 1
         GROUP BY p.desconto`
    );
    if (p1.length) {
        const total = Math.max(0, Number(p1[0].total));
        await pool.query('DELETE FROM pedido_pagamentos WHERE pedido_id = 1');
        const pix = Number((total * 0.6).toFixed(2));
        const boleto = Number((total - pix).toFixed(2));
        await pool.query(
            `INSERT INTO pedido_pagamentos (pedido_id, forma, valor, status) VALUES
             (1, 'PIX', ?, 'Pago'),
             (1, 'Boleto', ?, 'Pendente')`,
            [pix, boleto]
        );
        console.log('Pedido 1 split:', pix, '+', boleto);
    }

    console.log('Preços e pagamentos atualizados.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
