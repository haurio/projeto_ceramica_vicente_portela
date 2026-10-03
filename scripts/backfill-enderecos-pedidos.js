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
    // Preenche endereço de entrega a partir do cliente quando estiver vazio
    const result = await pool.query(`
        UPDATE pedidos p
        SET
            endereco_entrega = COALESCE(
                NULLIF(TRIM(p.endereco_entrega), ''),
                NULLIF(TRIM(CONCAT_WS(', ',
                    NULLIF(TRIM(c.endereco), ''),
                    NULLIF(TRIM(c.numero), ''),
                    NULLIF(TRIM(c.bairro), '')
                )), '')
            ),
            cidade_entrega = COALESCE(NULLIF(TRIM(p.cidade_entrega), ''), NULLIF(TRIM(c.cidade), '')),
            uf_entrega = COALESCE(NULLIF(TRIM(p.uf_entrega), ''), NULLIF(TRIM(c.estado), '')),
            cep_entrega = COALESCE(NULLIF(TRIM(p.cep_entrega), ''), NULLIF(TRIM(c.cep), '')),
            contato_entrega = COALESCE(NULLIF(TRIM(p.contato_entrega), ''), NULLIF(TRIM(c.nome_razao_social), '')),
            telefone_entrega = COALESCE(NULLIF(TRIM(p.telefone_entrega), ''), NULLIF(TRIM(c.telefone_principal), '')),
            atualizado_em = CURRENT_TIMESTAMP
        FROM clientes c
        WHERE c.id = p.cliente_id
          AND (
            NULLIF(TRIM(p.endereco_entrega), '') IS NULL
            OR NULLIF(TRIM(p.cidade_entrega), '') IS NULL
          )
        RETURNING p.id, p.numero, p.endereco_entrega, p.cidade_entrega, p.uf_entrega, p.cep_entrega
    `);

    console.log(JSON.stringify(result.rows, null, 2));
    await pool.end();
})().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
