const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

const STATUSES = [
    { status: 'Pendente', payStatus: 'Pendente', baixa: false },
    { status: 'Aguardando pagamento', payStatus: 'Pendente', baixa: false },
    { status: 'Aguardando entrega', payStatus: 'Pago', baixa: true },
    { status: 'Confirmado', payStatus: 'Pago', baixa: true },
    { status: 'Entregue', payStatus: 'Pago', baixa: true },
    { status: 'Cancelado', payStatus: 'Pendente', baixa: false },
    { status: 'Rascunho', payStatus: 'Pendente', baixa: false },
];

async function main() {
    const clientes = await pool.query('SELECT id, nome_razao_social FROM clientes ORDER BY id ASC LIMIT 5');
    const produtos = await pool.query('SELECT * FROM produtos ORDER BY id ASC LIMIT 5');
    const frota = await pool.query('SELECT id, placa FROM frota ORDER BY id ASC LIMIT 3');

    if (!clientes.rows.length) throw new Error('Nenhum cliente cadastrado.');
    if (!produtos.rows.length) throw new Error('Nenhum produto cadastrado.');

    const product = produtos.rows[0];
    const price = Number(
        product.preco
        ?? product.valor
        ?? product.preco_unitario
        ?? product.preco_venda
        ?? product.valor_unitario
        ?? 120
    ) || 120;
    const unidade = product.unidade || 'un';
    const veiculoId = frota.rows[0]?.id || null;

    console.log('Produto base:', {
        id: product.id,
        keys: Object.keys(product),
        price,
    });

    const created = [];

    for (let i = 0; i < STATUSES.length; i += 1) {
        const cfg = STATUSES[i];
        const cliente = clientes.rows[i % clientes.rows.length];
        const qty = 10 + i;
        const subtotal = Number((qty * price).toFixed(2));
        const frete = i % 2 === 0 ? 50 : 0;
        const desconto = i === 1 ? 20 : 0;
        const total = Number((subtotal - desconto + frete).toFixed(2));
        const dataPedido = new Date();
        dataPedido.setDate(dataPedido.getDate() - i);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const pedidoRes = await client.query(
                `INSERT INTO pedidos (
                    cliente_id, data_pedido, data_entrega, status, forma_pagamento,
                    desconto, frete, observacoes, estoque_baixado, created_by,
                    veiculo_id, nfe_status
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING id, numero, status`,
                [
                    cliente.id,
                    dataPedido.toISOString().slice(0, 10),
                    cfg.status === 'Entregue' || cfg.status === 'Aguardando entrega'
                        ? dataPedido.toISOString().slice(0, 10)
                        : null,
                    cfg.status,
                    'PIX',
                    desconto,
                    frete,
                    `Pedido demo status: ${cfg.status}`,
                    cfg.baixa,
                    'seed-script',
                    veiculoId,
                    'Sem NF',
                ]
            );

            const pedido = pedidoRes.rows[0];
            const numero = `PED-${String(pedido.id).padStart(5, '0')}`;
            await client.query('UPDATE pedidos SET numero = $1 WHERE id = $2', [numero, pedido.id]);

            await client.query(
                `INSERT INTO pedido_itens (
                    pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal
                ) VALUES ($1,$2,$3,$4,$5,$6)`,
                [pedido.id, product.id, qty, price, unidade, subtotal]
            );

            await client.query(
                `INSERT INTO pedido_pagamentos (
                    pedido_id, forma, valor, status, observacao
                ) VALUES ($1,$2,$3,$4,$5)`,
                [
                    pedido.id,
                    cfg.status === 'Aguardando pagamento' ? 'A prazo' : 'PIX',
                    total,
                    cfg.payStatus,
                    cfg.payStatus === 'Pendente' ? 'Pagamento demo pendente' : 'Pagamento demo pago',
                ]
            );

            await client.query('COMMIT');
            created.push({
                id: pedido.id,
                numero,
                status: cfg.status,
                payStatus: cfg.payStatus,
                cliente: cliente.nome_razao_social,
                total,
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    console.log(JSON.stringify(created, null, 2));
    await pool.end();
}

main().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
