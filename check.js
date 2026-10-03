const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Brazil_2026@localhost:5432/portela' });
pool.query('SELECT id, nome_razao_social, status, status_credito FROM clientes').then(res => {
    console.log(res.rows.filter(c => c.status === 'Pendente' || c.status_credito === 'Pendente'));
    pool.end();
});
