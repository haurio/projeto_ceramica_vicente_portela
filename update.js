const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Brazil_2026@localhost:5432/portela' });
pool.query("UPDATE clientes SET status = 'Ativo' WHERE status = 'Pendente'").then(res => {
    console.log(`Updated ${res.rowCount} rows`);
    pool.end();
});
