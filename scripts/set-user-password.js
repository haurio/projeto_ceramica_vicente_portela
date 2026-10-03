require('dotenv').config({ debug: false });

const bcrypt = require('bcrypt');
const { Client } = require('pg');
const { getDbConfig } = require('../config/dbConfig');

async function main() {
    const userId = Number(process.argv[2] || 1);
    const plain = process.argv[3] || 'Brazil_2026';

    const client = new Client(getDbConfig());
    await client.connect();

    try {
        const before = await client.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [userId]
        );

        if (!before.rowCount) {
            console.error(`Usuário id=${userId} não encontrado.`);
            process.exit(1);
        }

        const hash = await bcrypt.hash(plain, 10);
        await client.query(
            'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hash, userId]
        );

        const valid = await bcrypt.compare(plain, hash);
        const user = before.rows[0];
        console.log(`✅ Senha atualizada: id=${user.id} | username=${user.username} | email=${user.email}`);
        console.log(`   Verificação bcrypt: ${valid ? 'OK' : 'FALHOU'}`);
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error('❌', err.message);
    process.exit(1);
});
