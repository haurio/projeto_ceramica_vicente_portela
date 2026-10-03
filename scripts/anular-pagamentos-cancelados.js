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
    const result = await pool.query(`
        UPDATE pedido_pagamentos pg
        SET status = 'Anulado',
            observacao = COALESCE(
                NULLIF(TRIM(pg.observacao), ''),
                'Anulado automaticamente pelo cancelamento do pedido'
            )
        FROM pedidos p
        WHERE pg.pedido_id = p.id
          AND p.status = 'Cancelado'
          AND LOWER(COALESCE(pg.status, '')) <> 'anulado'
        RETURNING pg.id, pg.pedido_id, pg.status
    `);
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
