const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
});

const prazos = Array.from({ length: 12 }, (_, index) => ({
    dias: index + 1,
    juros_percent: 0,
    ativo: index < 6,
}));

(async () => {
    const result = await pool.query(
        `UPDATE formas_pagamento
         SET tipo = 'cartao',
             tem_juros = TRUE,
             juros_percent = 0,
             prazos_json = $1::jsonb,
             atualizado_em = CURRENT_TIMESTAMP
         WHERE tipo = 'avista'
           AND (
             LOWER(nome) = 'cartão de crédito'
             OR LOWER(nome) = 'cartao de credito'
             OR LOWER(nome) LIKE '%cart%cr_dito%'
           )
         RETURNING id, nome, tipo`,
        [JSON.stringify(prazos)]
    );
    console.log('migrated', result.rows);
    const all = await pool.query('SELECT id, nome, tipo FROM formas_pagamento ORDER BY ordem');
    console.log(all.rows);
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
