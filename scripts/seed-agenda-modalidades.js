const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

function toIso(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

(async () => {
    await pool.query(`
        ALTER TABLE pedidos
            ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'a_definir'
    `);

    const today = toIso(new Date());

    const frota = await pool.query('SELECT id, placa, motorista FROM frota ORDER BY id ASC LIMIT 3');
    const veiculoIds = frota.rows.map((row) => row.id);

    const pedidos = await pool.query(`
        SELECT id, status, veiculo_id
        FROM pedidos
        WHERE status <> 'Cancelado'
        ORDER BY id ASC
        LIMIT 8
    `);

    if (!pedidos.rows.length) {
        console.log('Nenhum pedido ativo para atualizar.');
        await pool.end();
        return;
    }

    const modalidades = [
        { tipo_entrega: 'frota', clearVeiculo: false },
        { tipo_entrega: 'frota', clearVeiculo: false },
        { tipo_entrega: 'retirada', clearVeiculo: true },
        { tipo_entrega: 'externo', clearVeiculo: true },
        { tipo_entrega: 'a_definir', clearVeiculo: true },
        { tipo_entrega: 'externo', clearVeiculo: true },
        { tipo_entrega: 'retirada', clearVeiculo: true },
        { tipo_entrega: 'frota', clearVeiculo: true }, // frota sem veículo definido
    ];

    for (let i = 0; i < pedidos.rows.length; i += 1) {
        const pedido = pedidos.rows[i];
        const modalidade = modalidades[i % modalidades.length];
        const nextStatus = ['Entregue', 'Cancelado'].includes(pedido.status)
            ? pedido.status
            : 'Aguardando entrega';

        let veiculoId = null;
        if (modalidade.tipo_entrega === 'frota' && !modalidade.clearVeiculo && veiculoIds.length) {
            veiculoId = veiculoIds[i % veiculoIds.length];
        }

        await pool.query(
            `UPDATE pedidos
             SET data_entrega = $1,
                 tipo_entrega = $2,
                 veiculo_id = $3,
                 status = $4,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [today, modalidade.tipo_entrega, veiculoId, nextStatus, pedido.id]
        );

        console.log(
            `PED-${String(pedido.id).padStart(5, '0')} -> ${today} | ${modalidade.tipo_entrega}`
            + (veiculoId ? ` | veiculo ${veiculoId}` : ' | sem veiculo')
        );
    }

    console.log(`\nPronto. Abra Agendamentos em ${today} para ver as modalidades.`);
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
