const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

function toIso(date) {
    return date.toISOString().slice(0, 10);
}

(async () => {
    const today = new Date();
    const offsets = [0, 0, 1, 1, -1, 2, 3];

    const pedidos = await pool.query(`
        SELECT id, status
        FROM pedidos
        WHERE status <> 'Cancelado'
        ORDER BY id ASC
        LIMIT 7
    `);

    const frota = await pool.query('SELECT id FROM frota ORDER BY id ASC LIMIT 3');
    const veiculoIds = frota.rows.map((row) => row.id);

    for (let i = 0; i < pedidos.rows.length; i += 1) {
        const pedido = pedidos.rows[i];
        const date = new Date(today);
        date.setDate(date.getDate() + offsets[i]);
        const dataEntrega = toIso(date);
        const veiculoId = veiculoIds.length ? veiculoIds[i % veiculoIds.length] : null;
        const nextStatus = ['Entregue', 'Cancelado'].includes(pedido.status)
            ? pedido.status
            : 'Aguardando entrega';

        await pool.query(
            `UPDATE pedidos
             SET data_entrega = $1,
                 veiculo_id = COALESCE(veiculo_id, $2),
                 status = $3,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [dataEntrega, veiculoId, nextStatus, pedido.id]
        );

        console.log(`PED-${String(pedido.id).padStart(5, '0')} -> ${dataEntrega} (${nextStatus})`);
    }

    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
