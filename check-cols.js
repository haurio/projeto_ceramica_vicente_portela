const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Brazil_2026@localhost:5432/portela' });
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='clientes'").then(res => {
    console.log(res.rows.map(r => r.column_name).join(', '));
    pool.end();
});
