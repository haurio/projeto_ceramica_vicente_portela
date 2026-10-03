require('dotenv').config();
const pool = require('../db');

async function main() {
    const [produtos] = await pool.query(`
        SELECT id, codigo, nome, COALESCE(estoque, 0) AS estoque, unidade
        FROM produtos
        WHERE LOWER(COALESCE(status, 'ativo')) = 'ativo'
        ORDER BY id
        LIMIT 10
    `);

    if (!produtos.length) {
        throw new Error('Nenhum produto ativo encontrado.');
    }

    console.log('Produtos:', produtos.map((p) => `${p.id}:${p.codigo || p.nome}`).join(', '));

    const client = await pool.getConnection();
    try {
        await client.beginTransaction();

        // zera e monta um histórico realista
        for (const p of produtos) {
            await client.query(
                'UPDATE produtos SET estoque = 0, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [p.id]
            );
        }

        await client.query('DELETE FROM estoque_movimentos');

        const samples = [];
        const today = new Date();
        const iso = (offsetDays) => {
            const d = new Date(today);
            d.setDate(d.getDate() - offsetDays);
            return d.toISOString().slice(0, 10);
        };

        // Produções (entradas)
        const entradas = [
            { days: 7, produto: produtos[0], qty: 1200, obs: 'Produção do turno manhã' },
            { days: 6, produto: produtos[1] || produtos[0], qty: 800, obs: 'Produção do turno tarde' },
            { days: 5, produto: produtos[2] || produtos[0], qty: 950, obs: null },
            { days: 4, produto: produtos[0], qty: 1500, obs: 'Produção do dia' },
            { days: 3, produto: produtos[3] || produtos[1] || produtos[0], qty: 600, obs: 'Forno 2' },
            { days: 2, produto: produtos[1] || produtos[0], qty: 1100, obs: null },
            { days: 1, produto: produtos[0], qty: 700, obs: 'Produção parcial' },
            { days: 0, produto: produtos[2] || produtos[0], qty: 400, obs: 'Produção de hoje' },
        ];

        const saldos = Object.fromEntries(produtos.map((p) => [p.id, 0]));

        for (const item of entradas) {
            const pid = item.produto.id;
            saldos[pid] += item.qty;
            samples.push({
                produto_id: pid,
                tipo: 'entrada',
                motivo: 'producao',
                quantidade: item.qty,
                data_movimento: iso(item.days),
                observacao: item.obs,
                saldo_apos: saldos[pid],
                created_by: 'seed',
            });
        }

        // Saídas
        const saidas = [
            { days: 5, produto: produtos[0], qty: 200, motivo: 'perda', obs: 'Quebra no transporte interno' },
            { days: 3, produto: produtos[1] || produtos[0], qty: 150, motivo: 'ajuste_manual', obs: 'Ajuste de inventário' },
            { days: 2, produto: produtos[0], qty: 300, motivo: 'outro', obs: 'Amostra comercial' },
            { days: 1, produto: produtos[2] || produtos[0], qty: 100, motivo: 'perda', obs: 'Peças com defeito' },
            { days: 0, produto: produtos[0], qty: 250, motivo: 'outro', obs: 'Retirada para obra' },
        ];

        for (const item of saidas) {
            const pid = item.produto.id;
            if (saldos[pid] < item.qty) continue;
            saldos[pid] -= item.qty;
            samples.push({
                produto_id: pid,
                tipo: 'saida',
                motivo: item.motivo,
                quantidade: item.qty,
                data_movimento: iso(item.days),
                observacao: item.obs,
                saldo_apos: saldos[pid],
                created_by: 'seed',
            });
        }

        // Um ajuste
        if (produtos[3]) {
            const pid = produtos[3].id;
            const novo = 180;
            samples.push({
                produto_id: pid,
                tipo: 'ajuste',
                motivo: 'ajuste_manual',
                quantidade: Math.abs(novo - saldos[pid]),
                data_movimento: iso(0),
                observacao: 'Contagem física',
                saldo_apos: novo,
                created_by: 'seed',
            });
            saldos[pid] = novo;
        }

        samples.sort((a, b) => {
            if (a.data_movimento === b.data_movimento) return 0;
            return a.data_movimento < b.data_movimento ? -1 : 1;
        });

        for (const row of samples) {
            await client.query(`
                INSERT INTO estoque_movimentos (
                    produto_id, tipo, motivo, quantidade, data_movimento,
                    observacao, saldo_apos, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                row.produto_id,
                row.tipo,
                row.motivo,
                row.quantidade,
                row.data_movimento,
                row.observacao,
                row.saldo_apos,
                row.created_by,
            ]);
        }

        for (const [produtoId, saldo] of Object.entries(saldos)) {
            await client.query(
                'UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [saldo, Number(produtoId)]
            );
        }

        await client.commit();
        console.log(`OK: ${samples.length} movimentações inseridas.`);
        console.log('Saldos finais:', saldos);
    } catch (error) {
        await client.rollback();
        throw error;
    } finally {
        client.release();
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
