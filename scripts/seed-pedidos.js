require('dotenv').config();
const pool = require('../db');

async function ensureTables() {
    // força criação via mesma lógica mínima
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            numero VARCHAR(30),
            cliente_id INTEGER NOT NULL REFERENCES clientes(id),
            data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
            data_entrega DATE,
            status VARCHAR(30) NOT NULL DEFAULT 'Rascunho',
            forma_pagamento VARCHAR(60),
            desconto NUMERIC(12, 2) NOT NULL DEFAULT 0,
            frete NUMERIC(12, 2) NOT NULL DEFAULT 0,
            observacoes TEXT,
            estoque_baixado BOOLEAN NOT NULL DEFAULT FALSE,
            created_by VARCHAR(120),
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await pool.query(`
        ALTER TABLE pedidos
            ADD COLUMN IF NOT EXISTS frete NUMERIC(12, 2) NOT NULL DEFAULT 0
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedido_itens (
            id SERIAL PRIMARY KEY,
            pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
            produto_id INTEGER NOT NULL REFERENCES produtos(id),
            quantidade NUMERIC(12, 2) NOT NULL,
            preco_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
            unidade VARCHAR(20) DEFAULT 'un',
            subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
        )
    `);
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isoDaysAgo(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

async function main() {
    await ensureTables();

    const [clientes] = await pool.query(`
        SELECT id, nome_razao_social
        FROM clientes
        WHERE LOWER(COALESCE(status, 'ativo')) = 'ativo'
        ORDER BY id
        LIMIT 5
    `);
    const [produtos] = await pool.query(`
        SELECT id, codigo, nome, preco_unitario, preco_milheiro, preco_m2, unidade, estoque
        FROM produtos
        WHERE LOWER(COALESCE(status, 'ativo')) = 'ativo'
        ORDER BY id
    `);

    if (!clientes.length) throw new Error('Cadastre ao menos 1 cliente ativo.');
    if (!produtos.length) throw new Error('Cadastre ao menos 1 produto ativo.');

    console.log('Clientes:', clientes.map((c) => `${c.id}:${c.nome_razao_social}`).join(' | '));
    console.log('Produtos:', produtos.map((p) => `${p.id}:${p.codigo || p.nome}`).join(' | '));

    // limpa seeds anteriores
    await pool.query(`DELETE FROM pedidos WHERE created_by = 'seed'`);

    const samples = [
        {
            cliente: clientes[0],
            days: 2,
            entregaIn: 5,
            status: 'Confirmado',
            forma: 'PIX',
            desconto: 50,
            frete: 120,
            obs: 'Entrega no canteiro',
            itens: [
                { produto: produtos[0], qty: 2, unidade: 'milheiro', priceKey: 'preco_milheiro' },
                { produto: produtos[1] || produtos[0], qty: 30, unidade: 'm²', priceKey: 'preco_m2' },
            ],
            baixar: true,
        },
        {
            cliente: clientes[1] || clientes[0],
            days: 1,
            entregaIn: 3,
            status: 'Rascunho',
            forma: 'Boleto',
            desconto: 0,
            frete: 90,
            obs: 'Aguardando confirmação',
            itens: [
                { produto: produtos[2] || produtos[0], qty: 150, unidade: 'un', priceKey: 'preco_unitario' },
            ],
            baixar: false,
        },
        {
            cliente: clientes[2] || clientes[0],
            days: 0,
            entregaIn: 7,
            status: 'Entregue',
            forma: 'A prazo',
            desconto: 100,
            frete: 180,
            obs: 'Pedido entregue na obra',
            itens: [
                { produto: produtos[0], qty: 1, unidade: 'milheiro', priceKey: 'preco_milheiro' },
                { produto: produtos[3] || produtos[1] || produtos[0], qty: 80, unidade: 'un', priceKey: 'preco_unitario' },
            ],
            baixar: true,
        },
        {
            cliente: clientes[0],
            days: 4,
            entregaIn: null,
            status: 'Cancelado',
            forma: 'Dinheiro',
            desconto: 0,
            frete: 0,
            obs: 'Cliente cancelou',
            itens: [
                { produto: produtos[1] || produtos[0], qty: 20, unidade: 'm²', priceKey: 'preco_m2' },
            ],
            baixar: false,
        },
    ];

    for (const sample of samples) {
        const dataPedido = isoDaysAgo(sample.days);
        const dataEntrega = sample.entregaIn == null ? null : isoDaysAgo(-sample.entregaIn);

        const [insertResult] = await pool.query(`
            INSERT INTO pedidos (
                cliente_id, data_pedido, data_entrega, status, forma_pagamento,
                desconto, frete, observacoes, estoque_baixado, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed')
        `, [
            sample.cliente.id,
            dataPedido,
            dataEntrega,
            sample.status,
            sample.forma,
            sample.desconto,
            sample.frete || 0,
            sample.obs,
            false,
        ]);

        const pedidoId = insertResult.insertId;
        const numero = `PED-${String(pedidoId).padStart(5, '0')}`;
        await pool.query('UPDATE pedidos SET numero = ? WHERE id = ?', [numero, pedidoId]);

        for (const item of sample.itens) {
            const produto = item.produto;
            let price = toNumber(produto[item.priceKey], 0);
            if (price <= 0) price = toNumber(produto.preco_unitario, 0);
            const subtotal = Number((item.qty * price).toFixed(2));

            await pool.query(`
                INSERT INTO pedido_itens (
                    pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [pedidoId, produto.id, item.qty, price, item.unidade, subtotal]);

            if (sample.baixar) {
                const [rows] = await pool.query(
                    'SELECT estoque FROM produtos WHERE id = ?',
                    [produto.id]
                );
                const atual = toNumber(rows[0]?.estoque, 0);
                // qty em milheiro/m2 no seed é comercial; para estoque usamos a quantidade informada
                const novo = Math.max(0, atual - item.qty);
                await pool.query(
                    'UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                    [novo, produto.id]
                );
                await pool.query(`
                    INSERT INTO estoque_movimentos (
                        produto_id, tipo, motivo, quantidade, data_movimento,
                        observacao, saldo_apos, created_by
                    ) VALUES (?, 'saida', 'pedido', ?, ?, ?, ?, 'seed')
                `, [
                    produto.id,
                    item.qty,
                    dataPedido,
                    `Pedido ${numero}`,
                    novo,
                ]);
            }
        }

        if (sample.baixar) {
            await pool.query(
                'UPDATE pedidos SET estoque_baixado = TRUE WHERE id = ?',
                [pedidoId]
            );
        }

        console.log(`Criado ${numero} (${sample.status})`);
    }

    console.log('Seed de pedidos concluído.');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
