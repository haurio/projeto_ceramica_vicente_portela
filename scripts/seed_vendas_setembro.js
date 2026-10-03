/**
 * Gera vendas (pedidos) em todos os dias de setembro/2026
 * para popular o gráfico do dashboard.
 *
 * Uso: node scripts/seed_vendas_setembro.js
 * Idempotente: remove seeds anteriores marcados com [SEED-SET-2026]
 */
const pool = require('../db');

const SEED_TAG = '[SEED-SET-2026]';
const YEAR = 2026;
const MONTH = 9; // setembro
const DAYS = 30;

const CIDADES = [
    { cidade: 'Cataguases', uf: 'MG' },
    { cidade: 'Leopoldina', uf: 'MG' },
    { cidade: 'Engenheiro Caldas', uf: 'MG' },
    { cidade: 'Muriaé', uf: 'MG' },
    { cidade: 'Ubá', uf: 'MG' },
    { cidade: 'Visconde do Rio Branco', uf: 'MG' },
];

const TIPOS = ['frota', 'retirada', 'externo'];
const STATUS = ['Confirmado', 'Entregue', 'Aguardando entrega', 'Entregue'];

function dayIso(day) {
    return `${YEAR}-${String(MONTH).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function hash(n) {
    let x = (n * 1103515245 + 12345) >>> 0;
    return x / 0xffffffff;
}

async function main() {
    const client = await pool.getConnection();
    try {
        await client.query('BEGIN');

        const [clientes] = await client.query('SELECT id FROM clientes ORDER BY id');
        const [produtos] = await client.query(`
            SELECT id, nome,
                   COALESCE(NULLIF(preco_unitario, 0), NULLIF(preco_milheiro, 0), NULLIF(preco_m2, 0), 1.2) AS preco,
                   COALESCE(unidade, 'un') AS unidade
            FROM produtos
            ORDER BY id
        `);

        if (!clientes.length) {
            throw new Error('Não há clientes cadastrados. Cadastre ao menos 1 cliente.');
        }
        if (!produtos.length) {
            throw new Error('Não há produtos cadastrados. Cadastre ao menos 1 produto.');
        }

        const [old] = await client.query(`
            SELECT id FROM pedidos WHERE observacoes LIKE ?
        `, [`%${SEED_TAG}%`]);

        if (old.length) {
            const ids = old.map((r) => r.id);
            const placeholders = ids.map(() => '?').join(', ');
            await client.query(`DELETE FROM pedido_itens WHERE pedido_id IN (${placeholders})`, ids);
            await client.query(`DELETE FROM pedido_pagamentos WHERE pedido_id IN (${placeholders})`, ids);
            await client.query(`DELETE FROM pedidos WHERE id IN (${placeholders})`, ids);
            console.log(`Removidos ${ids.length} pedido(s) seed anteriores.`);
        }

        let created = 0;
        let totalGeral = 0;

        for (let day = 1; day <= DAYS; day += 1) {
            const iso = dayIso(day);
            const ordersToday = 1 + Math.floor(hash(day * 17) * 2); // 1 ou 2

            for (let o = 0; o < ordersToday; o += 1) {
                const seed = day * 100 + o;
                const cliente = clientes[Math.floor(hash(seed + 1) * clientes.length)];
                const produtoA = produtos[Math.floor(hash(seed + 2) * produtos.length)];
                const produtoB = produtos[Math.floor(hash(seed + 3) * produtos.length)];
                const cidade = CIDADES[Math.floor(hash(seed + 4) * CIDADES.length)];
                const tipo = TIPOS[Math.floor(hash(seed + 5) * TIPOS.length)];
                const status = STATUS[Math.floor(hash(seed + 6) * STATUS.length)];

                const qtdA = 800 + Math.floor(hash(seed + 7) * 4200); // 800–5000
                const qtdB = hash(seed + 8) > 0.45 ? 500 + Math.floor(hash(seed + 9) * 2500) : 0;
                const precoA = Number(produtoA.preco) || 1.2;
                const precoB = Number(produtoB.preco) || 1.2;
                const subA = Math.round(qtdA * precoA * 100) / 100;
                const subB = qtdB ? Math.round(qtdB * precoB * 100) / 100 : 0;
                const frete = tipo === 'retirada' ? 0 : Math.round((80 + hash(seed + 10) * 220) * 100) / 100;
                const desconto = hash(seed + 11) > 0.75 ? Math.round((subA + subB) * 0.03 * 100) / 100 : 0;
                const total = Math.round((subA + subB + frete - desconto) * 100) / 100;
                totalGeral += total;

                const [ins] = await client.query(`
                    INSERT INTO pedidos (
                        numero, cliente_id, data_pedido, data_entrega, status,
                        desconto, frete, observacoes, tipo_entrega,
                        cidade_entrega, uf_entrega, endereco_entrega,
                        estoque_baixado, created_by
                    ) VALUES (?, ?, ?::date, ?::date, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
                    RETURNING id
                `, [
                    null,
                    cliente.id,
                    iso,
                    iso,
                    status,
                    desconto,
                    frete,
                    `${SEED_TAG} Venda demonstrativa ${iso}`,
                    tipo,
                    cidade.cidade,
                    cidade.uf,
                    `Rua Exemplar, ${100 + day}`,
                    'seed-setembro',
                ]);

                const pedidoId = ins.insertId || ins[0]?.id;
                if (!pedidoId) throw new Error('Falha ao obter id do pedido');

                await client.query(`
                    UPDATE pedidos SET numero = ? WHERE id = ?
                `, [`PED-S${String(pedidoId).padStart(5, '0')}`, pedidoId]);

                await client.query(`
                    INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [pedidoId, produtoA.id, qtdA, precoA, produtoA.unidade || 'un', subA]);

                if (qtdB > 0 && produtoB.id !== produtoA.id) {
                    await client.query(`
                        INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal)
                        VALUES (?, ?, ?, ?, ?, ?)
                    `, [pedidoId, produtoB.id, qtdB, precoB, produtoB.unidade || 'un', subB]);
                } else if (qtdB > 0) {
                    // mesmo produto: só reforça quantidade no primeiro item
                    await client.query(`
                        UPDATE pedido_itens
                        SET quantidade = quantidade + ?, subtotal = subtotal + ?
                        WHERE pedido_id = ? AND produto_id = ?
                    `, [qtdB, subB, pedidoId, produtoA.id]);
                }

                await client.query(`
                    INSERT INTO pedido_pagamentos (pedido_id, forma, valor, status)
                    VALUES (?, 'Pix', ?, 'Recebido')
                `, [pedidoId, total]);

                created += 1;
            }
        }

        await client.query(`DELETE FROM financeiro_contas_receber WHERE observacoes LIKE ?`, [`%${SEED_TAG}%`]);
        await client.query(`DELETE FROM financeiro_contas_pagar WHERE observacoes LIKE ?`, [`%${SEED_TAG}%`]);

        const [totaisDia] = await client.query(`
            SELECT
                p.data_pedido::text AS dia,
                COALESCE(SUM(
                    COALESCE((SELECT SUM(i.subtotal) FROM pedido_itens i WHERE i.pedido_id = p.id), 0)
                    + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                ), 0)::float AS total
            FROM pedidos p
            WHERE p.observacoes LIKE ?
            GROUP BY p.data_pedido
            ORDER BY p.data_pedido
        `, [`%${SEED_TAG}%`]);

        for (const row of totaisDia) {
            const iso = String(row.dia).slice(0, 10);
            const recebido = Math.round(Number(row.total || 0) * 100) / 100;
            const pago = Math.round(recebido * (0.22 + hash(Number(iso.slice(-2)) * 13) * 0.28) * 100) / 100;

            await client.query(`
                INSERT INTO financeiro_contas_receber (
                    descricao, cliente_nome, valor, valor_recebido,
                    data_emissao, data_vencimento, data_recebimento,
                    forma_pagamento, status, observacoes
                ) VALUES (?, ?, ?, ?, ?::date, ?::date, ?::date, 'Pix', 'Recebido', ?)
            `, [
                `Recebimento vendas ${iso}`,
                'Clientes (seed setembro)',
                recebido,
                recebido,
                iso,
                iso,
                iso,
                `${SEED_TAG} Recebido ${iso}`,
            ]);

            await client.query(`
                INSERT INTO financeiro_contas_pagar (
                    descricao, fornecedor_nome, valor, valor_pago,
                    data_emissao, data_vencimento, data_pagamento,
                    forma_pagamento, status, observacoes
                ) VALUES (?, ?, ?, ?, ?::date, ?::date, ?::date, 'Pix', 'Pago', ?)
            `, [
                `Custos operacionais ${iso}`,
                'Fornecedores (seed setembro)',
                pago,
                pago,
                iso,
                iso,
                iso,
                `${SEED_TAG} Pago ${iso}`,
            ]);
        }

        await client.query('COMMIT');
        console.log(`OK: ${created} pedidos criados em setembro/${YEAR}.`);
        console.log(`Total aproximado: R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
        console.log('No dashboard, filtre o período: 01/09/2026 — 30/09/2026');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
