const { Client } = require('pg');
const { getDbConfig, validateDbConfig } = require('../config/dbConfig');

async function testConnection() {
    const configError = validateDbConfig(getDbConfig());
    if (configError) {
        console.error('❌', configError);
        process.exit(1);
    }

    const config = getDbConfig();
    const client = new Client(config);

    try {
        await client.connect();
        const { rows } = await client.query('SELECT current_database() AS database, current_user AS user, version()');
        console.log('✅ Conexão OK');
        console.log(`   Banco: ${rows[0].database}`);
        console.log(`   Usuário: ${rows[0].user}`);
        console.log(`   Host: ${config.host || 'via DATABASE_URL'}`);
    } catch (err) {
        console.error('❌ Falha na conexão:', err.message);
        if (err.message.includes('password authentication failed')) {
            console.error('   A senha em DB_PASSWORD está incorreta.');
        } else if (err.message.includes('does not exist')) {
            console.error(`   O banco "${config.database}" não existe. Crie com: CREATE DATABASE portela;`);
        }
        process.exit(1);
    } finally {
        await client.end();
    }
}

testConnection();
