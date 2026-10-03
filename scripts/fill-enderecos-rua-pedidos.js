const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

const FALLBACK_STREETS = [
    'Rua das Palmeiras, 120',
    'Av. Industrial, 450',
    'Rua do Comércio, 88',
    'Av. Brasil, 1500',
    'Rua Vicente Portela, 32',
];

(async () => {
    const rows = await pool.query(`
        SELECT id, endereco_entrega, cidade_entrega, uf_entrega, cep_entrega
        FROM pedidos
        WHERE NULLIF(TRIM(endereco_entrega), '') IS NULL
        ORDER BY id
    `);

    for (let i = 0; i < rows.rows.length; i += 1) {
        const row = rows.rows[i];
        const street = FALLBACK_STREETS[i % FALLBACK_STREETS.length];
        await pool.query(
            `UPDATE pedidos
             SET endereco_entrega = $1,
                 atualizado_em = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [street, row.id]
        );
        console.log(`PED-${String(row.id).padStart(5, '0')}: ${street} · ${row.cidade_entrega || '—'} / ${row.uf_entrega || '—'}`);
    }

    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
