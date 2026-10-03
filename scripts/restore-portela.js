require('dotenv').config({ debug: false });

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { getDbConfig, validateDbConfig } = require('../config/dbConfig');

async function ensureDatabase(cfg) {
    const admin = new Client({ ...cfg, database: 'postgres' });
    await admin.connect();

    try {
        const exists = await admin.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [cfg.database]
        );

        if (!exists.rowCount) {
            await admin.query(`CREATE DATABASE "${cfg.database.replace(/"/g, '')}"`);
            console.log('Banco criado:', cfg.database);
        } else {
            console.log('Banco já existe:', cfg.database);
        }
    } finally {
        await admin.end();
    }
}

async function restore() {
    const cfg = getDbConfig();
    const configError = validateDbConfig(cfg);
    if (configError) {
        console.error(configError);
        process.exit(1);
    }

    await ensureDatabase(cfg);

    const sqlPath = path.join(__dirname, '..', 'documentação', 'portela_postgresql.sql');
    if (!fs.existsSync(sqlPath)) {
        console.error('Dump não encontrado:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const client = new Client(cfg);
    await client.connect();

    try {
        console.log('Restaurando dump portela_postgresql.sql ...');
        await client.query(sql);

        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('\nTabelas:');
        const counts = {};
        for (const row of tables.rows) {
            const name = row.table_name;
            const count = await client.query(`SELECT COUNT(*)::int AS n FROM "${name}"`);
            counts[name] = count.rows[0].n;
            console.log(`  - ${name}: ${counts[name]} registro(s)`);
        }

        console.log('\n✅ Restauração concluída.');
    } finally {
        await client.end();
    }
}

restore().catch((err) => {
    console.error('❌ Falha na restauração:', err.message);
    if (err.detail) console.error('Detalhe:', err.detail);
    if (err.hint) console.error('Dica:', err.hint);
    process.exit(1);
});
