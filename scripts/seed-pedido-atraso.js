const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

(async () => {
    const clientes = await pool.query('SELECT id, nome_razao_social FROM clientes ORDER BY id ASC LIMIT 1');
    const produtos = await pool.query('SELECT id, preco_unitario, unidade FROM produtos ORDER BY id ASC LIMIT 1');
    const frota = await pool.query('SELECT id FROM frota ORDER BY id ASC LIMIT 1');

    if (!clientes.rows.length || !produtos.rows.length) {
        throw new Error('Precisa de cliente e produto cadastrados.');
    }

    const cliente = clientes.rows[0];
    const product = produtos.rows[0];
    const price = Number(product.preco_unitario) || 1.2;
    const qty = 1500;
    const subtotal = Number((qty * price).toFixed(2));
    const frete = 90;
    const total = Number((subtotal + frete).toFixed(2));

    // Pedido com boleto 30 dias, data há 45 dias → vencido há ~15 dias
    const dataPedido = new Date();
    dataPedido.setDate(dataPedido.getDate() - 45);
    const dataIso = dataPedido.toISOString().slice(0, 10);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const pedidoRes = await client.query(
            `INSERT INTO pedidos (
                cliente_id, data_pedido, data_entrega, status, forma_pagamento,
                desconto, frete, observacoes, estoque_baixado, created_by,
                veiculo_id, nfe_status
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
            RETURNING id`,
            [
                cliente.id,
                dataIso,
                null,
                'Aguardando pagamento',
                'Boleto',
                0,
                frete,
                'Pedido demo: pagamento em atraso (boleto 30 dias vencido)',
                false,
                'seed-atraso',
                frota.rows[0]?.id || null,
                'Sem NF',
            ]
        );

        const pedidoId = pedidoRes.rows[0].id;
        const numero = `PED-${String(pedidoId).padStart(5, '0')}`;
        await client.query('UPDATE pedidos SET numero = $1 WHERE id = $2', [numero, pedidoId]);

        await client.query(
            `INSERT INTO pedido_itens (
                pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal
            ) VALUES ($1,$2,$3,$4,$5,$6)`,
            [pedidoId, product.id, qty, price, product.unidade || 'un', subtotal]
        );

        await client.query(
            `INSERT INTO pedido_pagamentos (
                pedido_id, forma, valor, status, observacao, prazo_dias, juros_percent
            ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
                pedidoId,
                'Boleto',
                total,
                'Pendente',
                'Boleto vencido — demo atraso',
                30,
                1,
            ]
        );

        await client.query('COMMIT');
        console.log(JSON.stringify({
            id: pedidoId,
            numero,
            cliente: cliente.nome_razao_social,
            data_pedido: dataIso,
            vencimento: 'data_pedido + 30 dias',
            total,
            status: 'Aguardando pagamento → situacao: Pagamento em atraso',
        }, null, 2));
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
})().catch(async (error) => {
    console.error(error);
    try { await pool.end(); } catch (_) { /* ignore */ }
    process.exit(1);
});
