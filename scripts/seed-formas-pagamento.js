require('dotenv').config();
const pool = require('../db');

async function main() {
    // force create via route helper
    const { ensureFormasPagamentoTable } = require('../routes/configRoutes');
    await ensureFormasPagamentoTable();
    const [rows] = await pool.query('SELECT id, nome, tipo, tem_juros, prazos_json FROM formas_pagamento ORDER BY ordem');
    console.table(rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        tipo: r.tipo,
        tem_juros: r.tem_juros,
        prazos: typeof r.prazos_json === 'string' ? r.prazos_json : JSON.stringify(r.prazos_json),
    })));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
