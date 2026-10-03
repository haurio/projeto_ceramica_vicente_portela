const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Brazil_2026@localhost:5432/portela' });
pool.query("ALTER TABLE clientes ADD COLUMN IF NOT EXISTS complemento VARCHAR(100)").then(res => {
    console.log('added column');
    pool.end();
}).catch(e => {
    console.error(e);
    pool.end();
});
