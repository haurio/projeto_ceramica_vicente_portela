require('dotenv').config();
const pool = require('../db');

async function ensure() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS pedido_pagamentos (
            id SERIAL PRIMARY KEY,
            pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
            forma VARCHAR(60) NOT NULL,
            valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
            status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
            observacao TEXT,
            criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        ALTER TABLE pedidos
            ADD COLUMN IF NOT EXISTS veiculo_id INTEGER,
            ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
            ADD COLUMN IF NOT EXISTS cidade_entrega VARCHAR(120),
            ADD COLUMN IF NOT EXISTS uf_entrega VARCHAR(2),
            ADD COLUMN IF NOT EXISTS cep_entrega VARCHAR(12),
            ADD COLUMN IF NOT EXISTS contato_entrega VARCHAR(150),
            ADD COLUMN IF NOT EXISTS telefone_entrega VARCHAR(30),
            ADD COLUMN IF NOT EXISTS nfe_numero VARCHAR(40),
            ADD COLUMN IF NOT EXISTS nfe_chave VARCHAR(60),
            ADD COLUMN IF NOT EXISTS nfe_status VARCHAR(20) DEFAULT 'Sem NF',
            ADD COLUMN IF NOT EXISTS nfe_data DATE,
            ADD COLUMN IF NOT EXISTS frete NUMERIC(12, 2) NOT NULL DEFAULT 0
    `);
}

async function main() {
    await ensure();

    // frete demo nos pedidos existentes sem frete
    await pool.query(`
        UPDATE pedidos
        SET frete = CASE
            WHEN status = 'Entregue' THEN 180
            WHEN status = 'Confirmado' THEN 120
            WHEN status = 'Rascunho' THEN 90
            ELSE 0
        END
        WHERE COALESCE(frete, 0) = 0
    `);
    console.log('Frete aplicado aos pedidos existentes.');

    const [pedidos] = await pool.query('SELECT id, numero, desconto, frete, forma_pagamento FROM pedidos ORDER BY id');
    for (const row of pedidos) {
        const [tot] = await pool.query(
            'SELECT COALESCE(SUM(subtotal), 0) AS s FROM pedido_itens WHERE pedido_id = ?',
            [row.id]
        );
        const total = Math.max(
            0,
            Number(tot[0].s) - Number(row.desconto || 0) + Number(row.frete || 0)
        );

        const [pays] = await pool.query(
            'SELECT id, valor FROM pedido_pagamentos WHERE pedido_id = ? ORDER BY id',
            [row.id]
        );

        if (!pays.length) {
            await pool.query(
                `INSERT INTO pedido_pagamentos (pedido_id, forma, valor, status)
                 VALUES (?, ?, ?, ?)`,
                [row.id, row.forma_pagamento || 'PIX', total || 0.01, 'Pendente']
            );
            console.log('Pagamento seed:', row.numero, total);
            continue;
        }

        // atualiza pagamentos para fechar o total (subtotal - desconto + frete)
        if (pays.length === 1) {
            await pool.query(
                'UPDATE pedido_pagamentos SET valor = ? WHERE id = ?',
                [total || 0.01, pays[0].id]
            );
            console.log('Pagamento atualizado:', row.numero, total);
        } else {
            const somaAtual = pays.reduce((acc, item) => acc + Number(item.valor || 0), 0);
            const diff = Number((total - somaAtual).toFixed(2));
            if (Math.abs(diff) > 0.01) {
                const last = pays[pays.length - 1];
                const novoValor = Math.max(0.01, Number((Number(last.valor) + diff).toFixed(2)));
                await pool.query(
                    'UPDATE pedido_pagamentos SET valor = ? WHERE id = ?',
                    [novoValor, last.id]
                );
                console.log('Pagamento multi ajustado:', row.numero, total);
            }
        }
    }

    // vincula um veiculo se houver
    const [frota] = await pool.query(
        `SELECT id FROM frota WHERE LOWER(COALESCE(status, 'ativo')) = 'ativo' ORDER BY id LIMIT 1`
    );
    if (frota.length) {
        await pool.query(
            `UPDATE pedidos
             SET veiculo_id = COALESCE(veiculo_id, ?),
                 nfe_status = COALESCE(NULLIF(nfe_status, ''), 'Sem NF')
             WHERE status IN ('Confirmado', 'Entregue')`,
            [frota[0].id]
        );
        await pool.query(
            `UPDATE pedidos
             SET nfe_status = 'Emitida',
                 nfe_numero = COALESCE(nfe_numero, '000' || id::text),
                 nfe_data = COALESCE(nfe_data, data_pedido)
             WHERE status = 'Entregue'`
        );
        console.log('Veiculo/NF demo aplicados.');
    }

    console.log('OK');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
