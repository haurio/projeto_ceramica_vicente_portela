require('dotenv').config({ debug: false });

const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { getDbConfig, validateDbConfig } = require('../config/dbConfig');

async function main() {
    const cfg = getDbConfig();
    console.log('Config DB:', {
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        database: cfg.database,
        passwordLength: cfg.password ? cfg.password.length : 0
    });

    const err = validateDbConfig(cfg);
    if (err) {
        console.error(err);
        process.exit(1);
    }

    const client = new Client(cfg);
    await client.connect();
    console.log('Conexao OK');

    const result = await client.query(
        'SELECT id, username, password FROM users WHERE username = $1',
        ['hauriovieira']
    );

    if (!result.rowCount) {
        console.error('Usuario hauriovieira nao encontrado');
        process.exit(1);
    }

    const user = result.rows[0];
    const plain = 'Brazil_2026';
    let ok = await bcrypt.compare(plain, user.password);
    console.log('bcrypt.compare atual:', ok);

    if (!ok) {
        const hash = await bcrypt.hash(plain, 10);
        await client.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hash, user.id]
        );
        ok = await bcrypt.compare(plain, hash);
        console.log('Senha regravada. bcrypt.compare:', ok);
    }

    await client.end();
}

main().catch((e) => {
    console.error('FALHA:', e.message);
    process.exit(1);
});
