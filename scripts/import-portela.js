const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { getDbConfig, validateDbConfig } = require('../config/dbConfig');

const SOURCE = path.join(__dirname, '..', 'documentação', 'portela.sql');
const OUTPUT = path.join(__dirname, '..', 'documentação', 'portela_postgresql.sql');

const TABLE_ORDER = [
    'users',
    'departamentos',
    'cargos',
    'bancos',
    'cnae',
    'empresa',
    'clientes',
    'fornecedores',
    'funcionarios',
    'funcionarios_dados_pessoais',
    'funcionarios_enderecos',
    'funcionarios_dados_profissionais',
    'funcionarios_dados_bancarios',
    'funcionarios_dias_folga',
    'funcionarios_dependentes',
    'ferias',
    'ausencias'
];

const SERIAL_TABLES = [
    'ausencias', 'bancos', 'cargos', 'clientes', 'cnae', 'departamentos',
    'empresa', 'ferias', 'fornecedores', 'funcionarios',
    'funcionarios_dependentes', 'funcionarios_dias_folga', 'users'
];

function replaceBalancedType(definition, typeName, replacement) {
    let result = definition;
    const pattern = new RegExp(`\\b${typeName}\\s*\\(`, 'i');

    while (true) {
        const match = result.match(pattern);
        if (!match) break;

        const start = match.index;
        const openIndex = result.indexOf('(', start);
        let depth = 0;
        let end = openIndex;

        for (let i = openIndex; i < result.length; i++) {
            if (result[i] === '(') depth++;
            if (result[i] === ')') {
                depth--;
                if (depth === 0) {
                    end = i;
                    break;
                }
            }
        }

        result = result.slice(0, start) + replacement + result.slice(end + 1);
    }

    return result;
}

function convertColumnDefinition(line) {
    let converted = line.replace(/`/g, '');

    converted = replaceBalancedType(converted, 'enum', 'VARCHAR(100)');
    converted = replaceBalancedType(converted, 'set', 'TEXT');

    return converted
        .replace(/\bint\(\d+\)/gi, 'INTEGER')
        .replace(/\bsmallint\(\d+\)/gi, 'SMALLINT')
        .replace(/\btinyint\(\d+\)\s*(UNSIGNED\s+)?/gi, 'SMALLINT ')
        .replace(/\bdatetime\b/gi, 'TIMESTAMP')
        .replace(/current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP')
        .replace(/\s+ON UPDATE CURRENT_TIMESTAMP/gi, '')
        .replace(/\s+COMMENT\s+'(?:[^'\\]|\\.)*'/gi, '');
}

function convertCreateTable(block) {
    const tableMatch = block.match(/CREATE TABLE `([^`]+)`\s*\(([\s\S]*?)\)\s*ENGINE=/i);
    if (!tableMatch) return null;

    const tableName = tableMatch[1];
    const body = tableMatch[2];
    const lines = body.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('--')) return null;

        const colMatch = line.match(/^(\s*)`([^`]+)`\s+(.+?)(,?)\s*$/);
        if (!colMatch) return null;

        const [, indent, column, definition, comma] = colMatch;
        let converted = convertColumnDefinition(definition).replace(/,$/, '');

        if (column === 'id' && SERIAL_TABLES.includes(tableName)) {
            converted = converted.replace(/^INTEGER NOT NULL$/i, 'SERIAL PRIMARY KEY');
            converted = converted.replace(/^INTEGER NOT NULL DEFAULT NULL$/i, 'SERIAL PRIMARY KEY');
        }

        return `${indent}${column} ${converted}${comma || ''}`;
    }).filter(Boolean);

    return `CREATE TABLE ${tableName} (\n${lines.join('\n')}\n);`;
}

function extractCreateTables(content) {
    const regex = /CREATE TABLE `[^`]+`[\s\S]*?\)\s*ENGINE=InnoDB[^;]*;/gi;
    const blocks = content.match(regex) || [];
    const map = new Map();

    for (const block of blocks) {
        const converted = convertCreateTable(block);
        const nameMatch = converted && converted.match(/^CREATE TABLE (\w+)/);
        if (nameMatch) map.set(nameMatch[1], converted);
    }

    return map;
}

function extractInserts(content) {
    const inserts = [];
    let index = 0;

    while (index < content.length) {
        const start = content.indexOf('INSERT INTO', index);
        if (start === -1) break;

        let end = start;
        let inString = false;

        for (let i = start; i < content.length; i++) {
            const char = content[i];

            if (inString) {
                if (char === "'" && content[i - 1] !== '\\') {
                    inString = false;
                }
                continue;
            }

            if (char === "'") {
                inString = true;
                continue;
            }

            if (char === ';') {
                end = i;
                break;
            }
        }

        inserts.push(content.slice(start, end + 1));
        index = end + 1;
    }

    return inserts.map((statement) => {
        let sql = statement.replace(/`/g, '');

        if (sql.includes("INSERT INTO ferias") && sql.includes(", 0, '', 'Atrasadas'")) {
            sql = sql.replace(", 0, '', 'Atrasadas'", ", 0, 'Atrasada', 'Atrasadas'");
        }

        if (sql.includes("INSERT INTO ausencias") && sql.includes("'Ferias', ''")) {
            sql = sql.replace("'Ferias', ''", "'Ferias', 'Pendente'");
        }

        if (SERIAL_TABLES.some((table) => sql.startsWith(`INSERT INTO ${table} `))) {
            sql = sql.replace(/^INSERT INTO (\w+) \(([^)]+)\) VALUES/i, 'INSERT INTO $1 ($2) OVERRIDING SYSTEM VALUE VALUES');
        }

        return sql;
    });
}

function extractAlterConstraints(content) {
    const constraints = [];
    const fkRegex = /ALTER TABLE `([^`]+)`\s+ADD CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)([^;]*);/gi;
    let match;

    while ((match = fkRegex.exec(content)) !== null) {
        const [, table, name, column, refTable, refColumn, options] = match;
        constraints.push(
            `ALTER TABLE ${table} ADD CONSTRAINT ${name} FOREIGN KEY (${column}) REFERENCES ${refTable} (${refColumn})${options.replace(/`/g, '')};`
        );
    }

    const pkRegex = /ALTER TABLE `([^`]+)`\s+ADD PRIMARY KEY \(`([^`]+)`\);/gi;
    while ((match = pkRegex.exec(content)) !== null) {
        const [, table, column] = match;
        if (column !== 'id' || !SERIAL_TABLES.includes(table)) {
            constraints.push(`ALTER TABLE ${table} ADD PRIMARY KEY (${column});`);
        }
    }

    const uniqueRegex = /ALTER TABLE `([^`]+)`\s+ADD UNIQUE KEY `([^`]+)` \(([^)]+)\)(?: COMMENT '[^']*')?;/gi;
    while ((match = uniqueRegex.exec(content)) !== null) {
        const [, table, name, columns] = match;
        const cols = columns.replace(/`/g, '');
        constraints.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${name} ON ${table} (${cols});`);
    }

    const indexRegex = /ALTER TABLE `([^`]+)`\s+ADD KEY `([^`]+)` \(`([^`]+)`\);/gi;
    while ((match = indexRegex.exec(content)) !== null) {
        const [, table, name, column] = match;
        constraints.push(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${column});`);
    }

    const compositeIndexRegex = /ALTER TABLE `([^`]+)`\s+ADD KEY `([^`]+)` \(`([^`]+)`,`([^`]+)`\)(?: COMMENT '[^']*')?;/gi;
    while ((match = compositeIndexRegex.exec(content)) !== null) {
        const [, table, name, col1, col2] = match;
        constraints.push(`CREATE INDEX IF NOT EXISTS ${name} ON ${table} (${col1}, ${col2});`);
    }

    return constraints;
}

function buildSql(content) {
    const createMap = extractCreateTables(content);
    const inserts = extractInserts(content);
    const constraints = extractAlterConstraints(content);

    const parts = [
        'BEGIN;',
        'DROP SCHEMA public CASCADE;',
        'CREATE SCHEMA public;',
        'GRANT ALL ON SCHEMA public TO public;'
    ];

    for (const table of TABLE_ORDER) {
        if (createMap.has(table)) parts.push(createMap.get(table));
    }

    parts.push(...constraints);

    const insertOrder = TABLE_ORDER.filter((table) =>
        inserts.some((sql) => sql.includes(`INSERT INTO ${table} `))
    );

    for (const table of insertOrder) {
        inserts.filter((sql) => sql.includes(`INSERT INTO ${table} `)).forEach((sql) => parts.push(sql));
    }

    for (const table of SERIAL_TABLES) {
        parts.push(
            `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true);`
        );
    }

    parts.push('COMMIT;');
    return parts.join('\n\n');
}

async function importPortela() {
    const configError = validateDbConfig(getDbConfig());
    if (configError) {
        console.error('❌', configError);
        process.exit(1);
    }

    const content = fs.readFileSync(SOURCE, 'utf8');
    const sql = buildSql(content);
    fs.writeFileSync(OUTPUT, sql, 'utf8');

    const client = new Client(getDbConfig());
    try {
        await client.connect();
        console.log('Importando portela.sql para PostgreSQL...');
        await client.query(sql);
        console.log('✅ Schema e dados importados com sucesso!');
        console.log(`Arquivo gerado: ${OUTPUT}`);

        const { rows } = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);

        console.log('\nTabelas:');
        for (const row of rows) {
            const count = await client.query(`SELECT COUNT(*)::int AS total FROM ${row.table_name}`);
            console.log(`  - ${row.table_name}: ${count.rows[0].total} registros`);
        }
    } catch (err) {
        console.error('❌ Erro na importação:', err.message);
        if (err.detail) console.error('Detalhe:', err.detail);
        if (err.position) console.error('Posição SQL:', err.position);
        process.exit(1);
    } finally {
        await client.end();
    }
}

importPortela();
