const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { getDbConfig, validateDbConfig } = require('../config/dbConfig');

function getPasswordFromArgs() {
    const arg = process.argv.find((item) => item.startsWith('--password='));
    if (!arg) return null;
    return arg.split('=').slice(1).join('=');
}

async function migrate() {
    const argPassword = getPasswordFromArgs();
    if (argPassword) {
        process.env.DB_PASSWORD = argPassword;
    }

    const configError = validateDbConfig(getDbConfig());
    if (configError) {
        console.error('❌', configError);
        console.error('\nDefina DB_PASSWORD no .env ou execute: npm run migrate -- --password=SUA_SENHA');
        process.exit(1);
    }

    const client = new Client(getDbConfig());
    const sqlPath = path.join(__dirname, '..', 'documentação', 'BD_postgresql.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        await client.connect();
        console.log('Conectado ao PostgreSQL. Executando migração...');
        await client.query(sql);
        console.log('✅ Tabelas criadas com sucesso!');

        const { rows } = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('\nTabelas no banco:');
        rows.forEach((row) => console.log(`  - ${row.table_name}`));
    } catch (err) {
        console.error('❌ Erro na migração:', err.message);
        if (err.detail) console.error('Detalhe:', err.detail);
        if (err.message.includes('password authentication failed')) {
            console.error('Senha incorreta. Atualize DB_PASSWORD no .env.');
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

migrate();
