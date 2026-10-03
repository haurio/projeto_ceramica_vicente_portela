const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

router.use(isAuthenticated);

const DEFAULT_NATUREZAS = [
    { cfop: '5101', natureza: 'Venda de produção do estabelecimento', ambito: 'interno' },
    { cfop: '5102', natureza: 'Venda de mercadoria adquirida ou recebida de terceiros', ambito: 'interno' },
    { cfop: '5118', natureza: 'Venda de produção entregue por conta e ordem', ambito: 'interno' },
    { cfop: '5405', natureza: 'Venda de mercadoria sujeita a ST (já retido)', ambito: 'interno' },
    { cfop: '5910', natureza: 'Remessa em bonificação, doação ou brinde', ambito: 'interno' },
    { cfop: '5915', natureza: 'Remessa de mercadoria para exposição ou feira', ambito: 'interno' },
    { cfop: '5922', natureza: 'Simples faturamento (entrega futura)', ambito: 'interno' },
    { cfop: '5929', natureza: 'Lançamento complementar / ajuste', ambito: 'interno' },
    { cfop: '6101', natureza: 'Venda de produção do estabelecimento', ambito: 'interestadual' },
    { cfop: '6102', natureza: 'Venda de mercadoria adquirida ou recebida de terceiros', ambito: 'interestadual' },
    { cfop: '6404', natureza: 'Venda de mercadoria sujeita a ST (já retido)', ambito: 'interestadual' },
    { cfop: '6910', natureza: 'Remessa em bonificação, doação ou brinde', ambito: 'interestadual' },
    { cfop: '1202', natureza: 'Devolução de venda de mercadoria', ambito: 'entrada' },
    { cfop: '2202', natureza: 'Devolução de venda de mercadoria', ambito: 'entrada' },
];

let naturezasReady = null;
let freteReady = null;
let cargosReady = null;
let bancosReady = null;

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function geocodeNominatim(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'CeramicaVicentePortela/1.0 (sistema-gestao)',
            Accept: 'application/json',
        },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || !data[0]) return null;
    return {
        lat: Number(data[0].lat),
        lon: Number(data[0].lon),
        display: data[0].display_name || query,
    };
}

async function routeOsrm(origem, destino) {
    if (!origem || !destino) return null;
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.lon},${origem.lat};${destino.lon},${destino.lat}?overview=full&geometries=geojson`;
    const response = await fetch(url, {
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    const coords = Array.isArray(route.geometry?.coordinates)
        ? route.geometry.coordinates.map(([lon, lat]) => [lat, lon])
        : [];
    return {
        distancia_km: Number(((route.distance || 0) / 1000).toFixed(1)),
        // OSRM é carro; caminhão ~25% mais lento
        duracao_min: Math.round(((route.duration || 0) / 60) * 1.25),
        geometry: coords,
    };
}

async function getEmpresaOrigem() {
    const [empresas] = await pool.query(`
        SELECT id, nome_fantasia, razao_social, rua, numero, bairro, cidade, estado, cep
        FROM empresa
        ORDER BY id ASC
        LIMIT 1
    `);
    const empresa = empresas[0] || null;
    if (!empresa) return null;

    const origemQuery = [
        empresa.rua,
        empresa.numero,
        empresa.bairro,
        empresa.cidade,
        empresa.estado,
        'Brasil',
    ].filter(Boolean).join(', ');

    let origemGeo = await geocodeNominatim(origemQuery);
    if (!origemGeo && empresa.cidade) {
        origemGeo = await geocodeNominatim(`${empresa.cidade}, ${empresa.estado || ''}, Brasil`);
    }

    return {
        label: empresa.nome_fantasia || empresa.razao_social || 'Cerâmica',
        cidade: empresa.cidade,
        uf: empresa.estado,
        endereco: origemQuery,
        latitude: origemGeo?.lat ?? null,
        longitude: origemGeo?.lon ?? null,
        geo: origemGeo,
    };
}

async function ensureNaturezasTable() {
    if (!naturezasReady) {
        naturezasReady = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS nfe_naturezas (
                    id SERIAL PRIMARY KEY,
                    cfop VARCHAR(10) NOT NULL UNIQUE,
                    natureza VARCHAR(255) NOT NULL,
                    ambito VARCHAR(30) NOT NULL DEFAULT 'interno',
                    ativo BOOLEAN NOT NULL DEFAULT TRUE,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const [countRows] = await pool.query('SELECT COUNT(*)::int AS total FROM nfe_naturezas');
            if (!(countRows[0]?.total > 0)) {
                for (const item of DEFAULT_NATUREZAS) {
                    await pool.query(
                        `INSERT INTO nfe_naturezas (cfop, natureza, ambito, ativo)
                         VALUES (?, ?, ?, TRUE)
                         ON CONFLICT (cfop) DO NOTHING`,
                        [item.cfop, item.natureza, item.ambito]
                    );
                }
            }
        })().catch((error) => {
            naturezasReady = null;
            throw error;
        });
    }
    return naturezasReady;
}

async function ensureFreteTable() {
    if (!freteReady) {
        freteReady = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS frete_cidades (
                    id SERIAL PRIMARY KEY,
                    cidade VARCHAR(120) NOT NULL,
                    uf CHAR(2) NOT NULL,
                    cep VARCHAR(9),
                    valor_frete NUMERIC(12,2) NOT NULL DEFAULT 0,
                    distancia_km NUMERIC(10,2),
                    latitude NUMERIC(10,7),
                    longitude NUMERIC(10,7),
                    ativo BOOLEAN NOT NULL DEFAULT TRUE,
                    observacao TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (cidade, uf)
                )
            `);
            await pool.query(`ALTER TABLE frete_cidades ADD COLUMN IF NOT EXISTS cep VARCHAR(9)`);

            const defaults = [
                // Minas Gerais / região
                { cidade: 'Belo Horizonte', uf: 'MG', cep: '30130-000', valor: 480 },
                { cidade: 'Contagem', uf: 'MG', cep: '32010-000', valor: 490 },
                { cidade: 'Betim', uf: 'MG', cep: '32510-000', valor: 500 },
                { cidade: 'Nova Lima', uf: 'MG', cep: '34000-000', valor: 510 },
                { cidade: 'Sabará', uf: 'MG', cep: '34505-000', valor: 500 },
                { cidade: 'Ipatinga', uf: 'MG', cep: '35160-000', valor: 280 },
                { cidade: 'Coronel Fabriciano', uf: 'MG', cep: '35170-000', valor: 290 },
                { cidade: 'Timóteo', uf: 'MG', cep: '35180-000', valor: 300 },
                { cidade: 'Governador Valadares', uf: 'MG', cep: '35010-000', valor: 220 },
                { cidade: 'Teófilo Otoni', uf: 'MG', cep: '39800-000', valor: 180 },
                { cidade: 'Caratinga', uf: 'MG', cep: '35300-000', valor: 260 },
                { cidade: 'Ubá', uf: 'MG', cep: '36500-000', valor: 380 },
                { cidade: 'Juiz de Fora', uf: 'MG', cep: '36010-000', valor: 520 },
                { cidade: 'Montes Claros', uf: 'MG', cep: '39400-000', valor: 420 },
                { cidade: 'Uberlândia', uf: 'MG', cep: '38400-000', valor: 680 },
                { cidade: 'Uberaba', uf: 'MG', cep: '38010-000', valor: 700 },
                // Bahia
                { cidade: 'Salvador', uf: 'BA', cep: '40020-000', valor: 920 },
                { cidade: 'Feira de Santana', uf: 'BA', cep: '44001-000', valor: 780 },
                { cidade: 'Vitória da Conquista', uf: 'BA', cep: '45000-000', valor: 620 },
                { cidade: 'Teixeira de Freitas', uf: 'BA', cep: '45995-000', valor: 480 },
                { cidade: 'Porto Seguro', uf: 'BA', cep: '45810-000', valor: 640 },
                { cidade: 'Ilhéus', uf: 'BA', cep: '45650-000', valor: 700 },
                { cidade: 'Itabuna', uf: 'BA', cep: '45600-000', valor: 690 },
                // Espírito Santo
                { cidade: 'Vitória', uf: 'ES', cep: '29010-000', valor: 560 },
                { cidade: 'Vila Velha', uf: 'ES', cep: '29100-000', valor: 570 },
                { cidade: 'Serra', uf: 'ES', cep: '29160-000', valor: 580 },
                { cidade: 'Cariacica', uf: 'ES', cep: '29140-000', valor: 575 },
                { cidade: 'Linhares', uf: 'ES', cep: '29900-000', valor: 450 },
                { cidade: 'Cachoeiro de Itapemirim', uf: 'ES', cep: '29300-000', valor: 620 },
                { cidade: 'Colatina', uf: 'ES', cep: '29700-000', valor: 500 },
                // Rio de Janeiro
                { cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040-000', valor: 780 },
                { cidade: 'Niterói', uf: 'RJ', cep: '24020-000', valor: 800 },
                { cidade: 'Duque de Caxias', uf: 'RJ', cep: '25010-000', valor: 790 },
                { cidade: 'São Gonçalo', uf: 'RJ', cep: '24420-000', valor: 810 },
                { cidade: 'Campos dos Goytacazes', uf: 'RJ', cep: '28010-000', valor: 620 },
                { cidade: 'Volta Redonda', uf: 'RJ', cep: '27210-000', valor: 720 },
                { cidade: 'Petrópolis', uf: 'RJ', cep: '25610-000', valor: 760 },
                // São Paulo
                { cidade: 'São Paulo', uf: 'SP', cep: '01001-000', valor: 980 },
                { cidade: 'Guarulhos', uf: 'SP', cep: '07010-000', valor: 1000 },
                { cidade: 'Campinas', uf: 'SP', cep: '13010-000', valor: 1050 },
                { cidade: 'Santos', uf: 'SP', cep: '11010-000', valor: 1100 },
                { cidade: 'São José dos Campos', uf: 'SP', cep: '12209-000', valor: 980 },
                { cidade: 'Ribeirão Preto', uf: 'SP', cep: '14010-000', valor: 1120 },
            ];

            for (const item of defaults) {
                await pool.query(
                    `INSERT INTO frete_cidades (cidade, uf, cep, valor_frete, ativo, observacao)
                     VALUES (?, ?, ?, ?, TRUE, ?)
                     ON CONFLICT (cidade, uf) DO NOTHING`,
                    [item.cidade, item.uf, item.cep, item.valor, 'Cidade próxima (pré-cadastro)']
                );
            }
        })().catch((error) => {
            freteReady = null;
            throw error;
        });
    }
    return freteReady;
}

async function ensureCargosTables() {
    if (!cargosReady) {
        cargosReady = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS departamentos (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL UNIQUE
                )
            `);
            await pool.query(`
                CREATE TABLE IF NOT EXISTS cargos (
                    id SERIAL PRIMARY KEY,
                    departamento_id INT NOT NULL REFERENCES departamentos(id),
                    nome VARCHAR(100) NOT NULL
                )
            `);
            const [countRows] = await pool.query('SELECT COUNT(*)::int AS total FROM departamentos');
            if (!(countRows[0]?.total > 0)) {
                await pool.query(`
                    INSERT INTO departamentos (nome) VALUES
                    ('Produção'), ('Administrativo'), ('Comercial'), ('Logística'), ('Manutenção')
                    ON CONFLICT (nome) DO NOTHING
                `);
            }
        })().catch((error) => {
            cargosReady = null;
            throw error;
        });
    }
    return cargosReady;
}

async function ensureBancosTable() {
    if (!bancosReady) {
        bancosReady = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS bancos (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL,
                    codigo CHAR(3) NOT NULL UNIQUE
                )
            `);
            const [countRows] = await pool.query('SELECT COUNT(*)::int AS total FROM bancos');
            if (!(countRows[0]?.total > 0)) {
                const defaults = [
                    ['001', 'Banco do Brasil'],
                    ['033', 'Santander'],
                    ['104', 'Caixa Econômica'],
                    ['237', 'Bradesco'],
                    ['341', 'Itaú'],
                    ['260', 'Nubank'],
                    ['077', 'Inter'],
                    ['756', 'Sicoob'],
                ];
                for (const [codigo, nome] of defaults) {
                    await pool.query(
                        `INSERT INTO bancos (codigo, nome) VALUES (?, ?) ON CONFLICT (codigo) DO NOTHING`,
                        [codigo, nome]
                    );
                }
            }
        })().catch((error) => {
            bancosReady = null;
            throw error;
        });
    }
    return bancosReady;
}

/* ===== Naturezas NF-e ===== */
router.get('/nfe-naturezas', async (_req, res) => {
    try {
        await ensureNaturezasTable();
        const [rows] = await pool.query(`
            SELECT id, cfop, natureza, ambito, ativo
            FROM nfe_naturezas
            ORDER BY ambito ASC, cfop ASC
        `);
        res.json(rows.map((row) => ({
            ...row,
            ativo: Boolean(row.ativo),
            label: `${row.cfop} - ${row.natureza}`,
        })));
    } catch (error) {
        logger.error('Erro ao listar naturezas', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar naturezas.' });
    }
});

router.post('/nfe-naturezas', async (req, res) => {
    try {
        await ensureNaturezasTable();
        const cfop = String(req.body.cfop || '').replace(/\D/g, '').slice(0, 4);
        const natureza = String(req.body.natureza || '').trim();
        const ambito = ['interno', 'interestadual', 'entrada'].includes(req.body.ambito)
            ? req.body.ambito
            : 'interno';
        const ativo = req.body.ativo !== false;
        if (!cfop || cfop.length < 4 || !natureza) {
            return res.status(400).json({ message: 'Informe CFOP (4 dígitos) e natureza.' });
        }
        const result = await pool.query(
            `INSERT INTO nfe_naturezas (cfop, natureza, ambito, ativo) VALUES (?, ?, ?, ?)`,
            [cfop, natureza, ambito, ativo]
        );
        const [rows] = await pool.query('SELECT * FROM nfe_naturezas WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'nfe_naturezas',
            acao: 'criar',
            entidade: 'nfe_natureza',
            entidadeId: result.insertId,
            descricao: `Criou natureza CFOP ${cfop}`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        if (String(error.message || '').includes('unique') || error.code === '23505') {
            return res.status(400).json({ message: 'Já existe natureza com este CFOP.' });
        }
        logger.error('Erro ao criar natureza', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar natureza.' });
    }
});

router.put('/nfe-naturezas/:id', async (req, res) => {
    try {
        await ensureNaturezasTable();
        const id = Number(req.params.id);
        const cfop = String(req.body.cfop || '').replace(/\D/g, '').slice(0, 4);
        const natureza = String(req.body.natureza || '').trim();
        const ambito = ['interno', 'interestadual', 'entrada'].includes(req.body.ambito)
            ? req.body.ambito
            : 'interno';
        const ativo = req.body.ativo !== false;
        if (!cfop || !natureza) {
            return res.status(400).json({ message: 'Informe CFOP e natureza.' });
        }
        await pool.query(
            `UPDATE nfe_naturezas
             SET cfop = ?, natureza = ?, ambito = ?, ativo = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [cfop, natureza, ambito, ativo, id]
        );
        const [rows] = await pool.query('SELECT * FROM nfe_naturezas WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Natureza não encontrada.' });
        await logAuditoria(req, {
            modulo: 'nfe_naturezas',
            acao: 'editar',
            entidade: 'nfe_natureza',
            entidadeId: id,
            descricao: `Atualizou natureza CFOP ${cfop}`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar natureza', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar natureza.' });
    }
});

router.delete('/nfe-naturezas/:id', async (req, res) => {
    try {
        await ensureNaturezasTable();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id, cfop FROM nfe_naturezas WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Natureza não encontrada.' });
        await pool.query('DELETE FROM nfe_naturezas WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'nfe_naturezas',
            acao: 'excluir',
            entidade: 'nfe_natureza',
            entidadeId: id,
            descricao: `Excluiu natureza CFOP ${atuais[0].cfop}`,
        });
        res.json({ message: 'Natureza excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir natureza', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir natureza.' });
    }
});

/* ===== Frete por cidade ===== */
router.get('/frete-cidades', async (_req, res) => {
    try {
        await ensureFreteTable();
        const [rows] = await pool.query(`
            SELECT id, cidade, uf, cep, valor_frete, distancia_km, latitude, longitude, ativo, observacao
            FROM frete_cidades
            ORDER BY uf ASC, cidade ASC
        `);
        res.json(rows.map((row) => ({
            ...row,
            valor_frete: toNumber(row.valor_frete),
            distancia_km: row.distancia_km == null ? null : toNumber(row.distancia_km),
            ativo: Boolean(row.ativo),
        })));
    } catch (error) {
        logger.error('Erro ao listar fretes', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar fretes por cidade.' });
    }
});

router.post('/frete-cidades', async (req, res) => {
    try {
        await ensureFreteTable();
        const cidade = String(req.body.cidade || '').trim();
        const uf = String(req.body.uf || '').trim().toUpperCase().slice(0, 2);
        const cep = String(req.body.cep || '').replace(/\D/g, '').slice(0, 8);
        const cepFmt = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : (cep || null);
        const valor = Math.max(0, toNumber(req.body.valor_frete, 0));
        const ativo = req.body.ativo !== false;
        const observacao = String(req.body.observacao || '').trim() || null;
        if (!cidade || uf.length !== 2) {
            return res.status(400).json({ message: 'Informe cidade e UF.' });
        }
        const result = await pool.query(
            `INSERT INTO frete_cidades (cidade, uf, cep, valor_frete, ativo, observacao)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [cidade, uf, cepFmt, valor, ativo, observacao]
        );
        const [rows] = await pool.query('SELECT * FROM frete_cidades WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'frete_cidades',
            acao: 'criar',
            entidade: 'frete_cidade',
            entidadeId: result.insertId,
            descricao: `Cadastrou frete ${cidade}/${uf}`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        if (String(error.message || '').includes('unique') || error.code === '23505') {
            return res.status(400).json({ message: 'Já existe frete para esta cidade/UF.' });
        }
        logger.error('Erro ao criar frete', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar frete.' });
    }
});

router.put('/frete-cidades/:id', async (req, res) => {
    try {
        await ensureFreteTable();
        const id = Number(req.params.id);
        const cidade = String(req.body.cidade || '').trim();
        const uf = String(req.body.uf || '').trim().toUpperCase().slice(0, 2);
        const cep = String(req.body.cep || '').replace(/\D/g, '').slice(0, 8);
        const cepFmt = cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : (cep || null);
        const valor = Math.max(0, toNumber(req.body.valor_frete, 0));
        const ativo = req.body.ativo !== false;
        const observacao = String(req.body.observacao || '').trim() || null;
        if (!cidade || uf.length !== 2) {
            return res.status(400).json({ message: 'Informe cidade e UF.' });
        }
        await pool.query(
            `UPDATE frete_cidades
             SET cidade = ?, uf = ?, cep = ?, valor_frete = ?, ativo = ?, observacao = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [cidade, uf, cepFmt, valor, ativo, observacao, id]
        );
        const [rows] = await pool.query('SELECT * FROM frete_cidades WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Registro não encontrado.' });
        await logAuditoria(req, {
            modulo: 'frete_cidades',
            acao: 'editar',
            entidade: 'frete_cidade',
            entidadeId: id,
            descricao: `Atualizou frete ${cidade}/${uf}`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar frete', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar frete.' });
    }
});

router.delete('/frete-cidades/:id', async (req, res) => {
    try {
        await ensureFreteTable();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id, cidade, uf FROM frete_cidades WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Registro não encontrado.' });
        await pool.query('DELETE FROM frete_cidades WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'frete_cidades',
            acao: 'excluir',
            entidade: 'frete_cidade',
            entidadeId: id,
            descricao: `Excluiu frete ${atuais[0].cidade}/${atuais[0].uf}`,
        });
        res.json({ message: 'Frete excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir frete', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir frete.' });
    }
});

/* ===== Cargos ===== */
router.get('/departamentos', async (_req, res) => {
    try {
        await ensureCargosTables();
        const [rows] = await pool.query('SELECT id, nome FROM departamentos ORDER BY nome ASC');
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar departamentos', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar departamentos.' });
    }
});

router.get('/cargos', async (_req, res) => {
    try {
        await ensureCargosTables();
        const [rows] = await pool.query(`
            SELECT c.id, c.nome, c.departamento_id, d.nome AS departamento_nome
            FROM cargos c
            LEFT JOIN departamentos d ON d.id = c.departamento_id
            ORDER BY d.nome ASC, c.nome ASC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar cargos', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar cargos.' });
    }
});

router.post('/cargos', async (req, res) => {
    try {
        await ensureCargosTables();
        const nome = String(req.body.nome || '').trim();
        const departamentoId = Number(req.body.departamento_id);
        if (!nome || !departamentoId) {
            return res.status(400).json({ message: 'Informe nome e departamento.' });
        }
        const result = await pool.query(
            'INSERT INTO cargos (nome, departamento_id) VALUES (?, ?)',
            [nome, departamentoId]
        );
        const [rows] = await pool.query(`
            SELECT c.id, c.nome, c.departamento_id, d.nome AS departamento_nome
            FROM cargos c
            LEFT JOIN departamentos d ON d.id = c.departamento_id
            WHERE c.id = ?
        `, [result.insertId]);
        await logAuditoria(req, {
            modulo: 'cargos',
            acao: 'criar',
            entidade: 'cargo',
            entidadeId: result.insertId,
            descricao: `Criou cargo "${nome}"`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar cargo', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar cargo.' });
    }
});

router.put('/cargos/:id', async (req, res) => {
    try {
        await ensureCargosTables();
        const id = Number(req.params.id);
        const nome = String(req.body.nome || '').trim();
        const departamentoId = Number(req.body.departamento_id);
        if (!nome || !departamentoId) {
            return res.status(400).json({ message: 'Informe nome e departamento.' });
        }
        await pool.query(
            'UPDATE cargos SET nome = ?, departamento_id = ? WHERE id = ?',
            [nome, departamentoId, id]
        );
        const [rows] = await pool.query(`
            SELECT c.id, c.nome, c.departamento_id, d.nome AS departamento_nome
            FROM cargos c
            LEFT JOIN departamentos d ON d.id = c.departamento_id
            WHERE c.id = ?
        `, [id]);
        if (!rows.length) return res.status(404).json({ message: 'Cargo não encontrado.' });
        await logAuditoria(req, {
            modulo: 'cargos',
            acao: 'editar',
            entidade: 'cargo',
            entidadeId: id,
            descricao: `Atualizou cargo "${nome}"`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar cargo', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar cargo.' });
    }
});

router.delete('/cargos/:id', async (req, res) => {
    try {
        await ensureCargosTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id, nome FROM cargos WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Cargo não encontrado.' });
        try {
            await pool.query('DELETE FROM cargos WHERE id = ?', [id]);
        } catch (error) {
            if (error.code === '23503') {
                return res.status(400).json({ message: 'Cargo em uso por funcionários. Não é possível excluir.' });
            }
            throw error;
        }
        await logAuditoria(req, {
            modulo: 'cargos',
            acao: 'excluir',
            entidade: 'cargo',
            entidadeId: id,
            descricao: `Excluiu cargo "${atuais[0].nome}"`,
        });
        res.json({ message: 'Cargo excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir cargo', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir cargo.' });
    }
});

/* ===== Bancos ===== */
router.get('/bancos', async (_req, res) => {
    try {
        await ensureBancosTable();
        const [rows] = await pool.query('SELECT id, nome, codigo FROM bancos ORDER BY nome ASC');
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar bancos', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar bancos.' });
    }
});

router.post('/bancos', async (req, res) => {
    try {
        await ensureBancosTable();
        const nome = String(req.body.nome || '').trim();
        const codigo = String(req.body.codigo || '').replace(/\D/g, '').padStart(3, '0').slice(0, 3);
        if (!nome || codigo.length !== 3) {
            return res.status(400).json({ message: 'Informe nome e código com 3 dígitos.' });
        }
        const result = await pool.query(
            'INSERT INTO bancos (nome, codigo) VALUES (?, ?)',
            [nome, codigo]
        );
        const [rows] = await pool.query('SELECT * FROM bancos WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'bancos',
            acao: 'criar',
            entidade: 'banco',
            entidadeId: result.insertId,
            descricao: `Criou banco ${codigo} - ${nome}`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe banco com este código.' });
        }
        logger.error('Erro ao criar banco', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar banco.' });
    }
});

router.put('/bancos/:id', async (req, res) => {
    try {
        await ensureBancosTable();
        const id = Number(req.params.id);
        const nome = String(req.body.nome || '').trim();
        const codigo = String(req.body.codigo || '').replace(/\D/g, '').padStart(3, '0').slice(0, 3);
        if (!nome || codigo.length !== 3) {
            return res.status(400).json({ message: 'Informe nome e código com 3 dígitos.' });
        }
        await pool.query('UPDATE bancos SET nome = ?, codigo = ? WHERE id = ?', [nome, codigo, id]);
        const [rows] = await pool.query('SELECT * FROM bancos WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ message: 'Banco não encontrado.' });
        await logAuditoria(req, {
            modulo: 'bancos',
            acao: 'editar',
            entidade: 'banco',
            entidadeId: id,
            descricao: `Atualizou banco ${codigo} - ${nome}`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar banco', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar banco.' });
    }
});

router.delete('/bancos/:id', async (req, res) => {
    try {
        await ensureBancosTable();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id, nome, codigo FROM bancos WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Banco não encontrado.' });
        try {
            await pool.query('DELETE FROM bancos WHERE id = ?', [id]);
        } catch (error) {
            if (error.code === '23503') {
                return res.status(400).json({ message: 'Banco em uso. Não é possível excluir.' });
            }
            throw error;
        }
        await logAuditoria(req, {
            modulo: 'bancos',
            acao: 'excluir',
            entidade: 'banco',
            entidadeId: id,
            descricao: `Excluiu banco ${atuais[0].codigo} - ${atuais[0].nome}`,
        });
        res.json({ message: 'Banco excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir banco', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir banco.' });
    }
});

/* ===== Rotas / distâncias (cidades cadastradas em custo de frete) ===== */
router.get('/rotas-entrega', async (_req, res) => {
    try {
        await ensureFreteTable();

        const origem = await getEmpresaOrigem();
        if (!origem) {
            return res.json({
                origem: null,
                destinos: [],
                message: 'Cadastre a empresa para calcular as rotas.',
            });
        }

        const [cidades] = await pool.query(`
            SELECT id, cidade, uf, valor_frete, distancia_km, latitude, longitude, ativo
            FROM frete_cidades
            WHERE ativo = TRUE
            ORDER BY uf ASC, cidade ASC
            LIMIT 40
        `);

        const destinos = [];
        for (const item of cidades) {
            const cidade = item.cidade;
            const uf = item.uf || origem.uf || 'MG';

            let geo = null;
            if (item.latitude != null && item.longitude != null) {
                geo = { lat: Number(item.latitude), lon: Number(item.longitude) };
            } else {
                // Nominatim: ~1 req/s
                // eslint-disable-next-line no-await-in-loop
                await new Promise((resolve) => setTimeout(resolve, 1000));
                try {
                    // eslint-disable-next-line no-await-in-loop
                    geo = await geocodeNominatim(`${cidade}, ${uf}, Brasil`);
                } catch (_error) {
                    geo = null;
                }
            }

            let rota = null;
            let distanciaKm = item.distancia_km != null ? toNumber(item.distancia_km) : null;
            if (origem.geo && geo) {
                // eslint-disable-next-line no-await-in-loop
                rota = await routeOsrm(origem.geo, geo);
                if (rota?.distancia_km != null) {
                    distanciaKm = rota.distancia_km;
                } else if (distanciaKm == null) {
                    distanciaKm = Number(haversineKm(origem.geo.lat, origem.geo.lon, geo.lat, geo.lon).toFixed(1));
                }
            }

            if (geo && distanciaKm != null) {
                await pool.query(
                    `UPDATE frete_cidades
                     SET distancia_km = ?, latitude = ?, longitude = ?, atualizado_em = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [distanciaKm, geo.lat, geo.lon, item.id]
                );
            }

            destinos.push({
                id: item.id,
                cidade,
                uf,
                pedidos: null,
                distancia_km: distanciaKm,
                duracao_min: rota?.duracao_min ?? null,
                latitude: geo?.lat ?? null,
                longitude: geo?.lon ?? null,
                valor_frete: toNumber(item.valor_frete),
                geometry: rota?.geometry || null,
            });
        }

        res.json({
            origem: {
                label: origem.label,
                cidade: origem.cidade,
                uf: origem.uf,
                endereco: origem.endereco,
                latitude: origem.latitude,
                longitude: origem.longitude,
            },
            destinos,
        });
    } catch (error) {
        logger.error('Erro ao calcular rotas', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao calcular distâncias de entrega.' });
    }
});

router.get('/frete-cidades/:id/rota', async (req, res) => {
    try {
        await ensureFreteTable();
        const id = Number(req.params.id);
        const [rows] = await pool.query(
            `SELECT id, cidade, uf, valor_frete, distancia_km, latitude, longitude
             FROM frete_cidades WHERE id = ?`,
            [id]
        );
        if (!rows.length) {
            return res.status(404).json({ message: 'Cidade de frete não encontrada.' });
        }

        const item = rows[0];
        const origem = await getEmpresaOrigem();
        if (!origem?.geo) {
            return res.status(400).json({ message: 'Não foi possível localizar o endereço da cerâmica.' });
        }

        let geo = null;
        if (item.latitude != null && item.longitude != null) {
            geo = { lat: Number(item.latitude), lon: Number(item.longitude) };
        } else {
            geo = await geocodeNominatim(`${item.cidade}, ${item.uf}, Brasil`);
        }
        if (!geo) {
            return res.status(400).json({ message: 'Não foi possível localizar a cidade de destino.' });
        }

        const rota = await routeOsrm(origem.geo, geo);
        const distanciaKm = rota?.distancia_km
            ?? Number(haversineKm(origem.geo.lat, origem.geo.lon, geo.lat, geo.lon).toFixed(1));

        await pool.query(
            `UPDATE frete_cidades
             SET distancia_km = ?, latitude = ?, longitude = ?, atualizado_em = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [distanciaKm, geo.lat, geo.lon, id]
        );

        res.json({
            origem: {
                label: origem.label,
                cidade: origem.cidade,
                uf: origem.uf,
                latitude: origem.latitude,
                longitude: origem.longitude,
            },
            destino: {
                id: item.id,
                cidade: item.cidade,
                uf: item.uf,
                valor_frete: toNumber(item.valor_frete),
                distancia_km: distanciaKm,
                latitude: geo.lat,
                longitude: geo.lon,
                duracao_min: rota?.duracao_min ?? null,
            },
            geometry: rota?.geometry || [
                [origem.latitude, origem.longitude],
                [geo.lat, geo.lon],
            ],
        });
    } catch (error) {
        logger.error('Erro ao calcular rota do frete', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao calcular rota até a cidade.' });
    }
});

router.get('/rota-cidade', async (req, res) => {
    try {
        const cidade = String(req.query.cidade || '').trim();
        const uf = String(req.query.uf || '').trim().toUpperCase();
        if (!cidade || !uf) {
            return res.status(400).json({ message: 'Informe cidade e UF.' });
        }

        const origem = await getEmpresaOrigem();
        if (!origem?.geo) {
            return res.status(400).json({ message: 'Não foi possível localizar o endereço da cerâmica.' });
        }

        const geo = await geocodeNominatim(`${cidade}, ${uf}, Brasil`);
        if (!geo) {
            return res.status(400).json({ message: 'Não foi possível localizar a cidade de destino.' });
        }

        const rota = await routeOsrm(origem.geo, geo);
        const distanciaKm = rota?.distancia_km
            ?? Number(haversineKm(origem.geo.lat, origem.geo.lon, geo.lat, geo.lon).toFixed(1));

        res.json({
            origem: {
                label: origem.label,
                cidade: origem.cidade,
                uf: origem.uf,
                latitude: origem.latitude,
                longitude: origem.longitude,
            },
            destino: {
                cidade,
                uf,
                distancia_km: distanciaKm,
                latitude: geo.lat,
                longitude: geo.lon,
                duracao_min: rota?.duracao_min ?? null,
            },
            geometry: rota?.geometry || [
                [origem.latitude, origem.longitude],
                [geo.lat, geo.lon],
            ],
        });
    } catch (error) {
        logger.error('Erro ao calcular rota por cidade', { module: 'configCadastros', stack: error.stack });
        res.status(500).json({ message: 'Erro ao calcular rota até a cidade.' });
    }
});

module.exports = router;
