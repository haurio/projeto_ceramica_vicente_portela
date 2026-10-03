const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

const prazos = [
    { dias: 15, juros_percent: 0, ativo: true },
    { dias: 30, juros_percent: 0, ativo: true },
];

(async () => {
    const result = await pool.query(
        `UPDATE formas_pagamento
         SET tipo = 'boleto',
             tem_juros = TRUE,
             juros_percent = CASE
                 WHEN COALESCE(juros_percent, 0) > 0 THEN juros_percent
                 ELSE 1
             END,
             prazos_json = $1::jsonb,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE LOWER(nome) = 'boleto'
           AND tipo IN ('avista', 'boleto')
         RETURNING id, nome, tipo, tem_juros, juros_percent, prazos_json`,
        [JSON.stringify(prazos)]
    );
    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
