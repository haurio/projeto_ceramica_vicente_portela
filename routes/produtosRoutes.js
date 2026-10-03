const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

const uploadDir = path.join(__dirname, '..', 'public', 'image', 'Produtos', 'uploads');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
        const stamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        cb(null, `produto-${stamp}-${random}${safeExt}`);
    }
});

const uploadImagem = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
            cb(new Error('Envie apenas arquivos de imagem.'));
            return;
        }
        cb(null, true);
    }
});

let tableReadyPromise = null;

async function ensureProdutosTable() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS produtos (
                    id SERIAL PRIMARY KEY,
                    codigo VARCHAR(40),
                    nome VARCHAR(150) NOT NULL,
                    categoria VARCHAR(80) DEFAULT 'Geral',
                    descricao TEXT,
                    altura_cm NUMERIC(10, 2),
                    largura_cm NUMERIC(10, 2),
                    comprimento_cm NUMERIC(10, 2),
                    peso VARCHAR(60),
                    preco_unitario NUMERIC(12, 2) DEFAULT 0,
                    unidade VARCHAR(20) DEFAULT 'un',
                    estoque NUMERIC(12, 2) DEFAULT 0,
                    imagem_url TEXT,
                    status VARCHAR(20) DEFAULT 'Ativo',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS produtos_codigo_unique
                ON produtos (codigo)
                WHERE codigo IS NOT NULL AND codigo <> ''
            `);

            await pool.query(`
                ALTER TABLE produtos
                    ADD COLUMN IF NOT EXISTS preco_milheiro NUMERIC(12, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS preco_m2 NUMERIC(12, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS desconto_percentual NUMERIC(5, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS desconto_acima_de NUMERIC(12, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS ncm VARCHAR(8),
                    ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4) DEFAULT '5102',
                    ADD COLUMN IF NOT EXISTS cst_csosn VARCHAR(4) DEFAULT '102',
                    ADD COLUMN IF NOT EXISTS aliq_icms NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_ipi NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_pis NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_cofins NUMERIC(7, 2) DEFAULT 0
            `);

            // Defaults fiscais MG (cerâmica) + alíquotas zeradas no cadastro
            await pool.query(`
                UPDATE produtos SET
                    ncm = COALESCE(NULLIF(TRIM(ncm), ''), '69041000'),
                    cfop_padrao = COALESCE(NULLIF(TRIM(cfop_padrao), ''), '5102'),
                    cst_csosn = COALESCE(NULLIF(TRIM(cst_csosn), ''), '102'),
                    aliq_icms = 0,
                    aliq_ipi = 0,
                    aliq_pis = 0,
                    aliq_cofins = 0
                WHERE ncm IS NULL OR TRIM(ncm) = ''
                   OR COALESCE(aliq_icms, 0) <> 0
                   OR COALESCE(aliq_pis, 0) <> 0
                   OR COALESCE(aliq_cofins, 0) <> 0
            `);

            const [rows] = await pool.query('SELECT COUNT(*)::int AS total FROM produtos');
            if ((rows[0]?.total || 0) === 0) {
                await pool.query(`
                    INSERT INTO produtos (
                        codigo, nome, categoria, descricao,
                        altura_cm, largura_cm, comprimento_cm, peso,
                        preco_unitario, unidade, estoque, imagem_url, status
                    ) VALUES
                    ('LAJ-07', 'Lajota 07x19x32cm', 'Lajota', 'Lajota cerâmica para laje', 7, 19, 32, '4kg / peça', 0, 'un', 0, '/image/Produtos/tijolo_laje_07x19x32.png', 'Ativo'),
                    ('VED-09', 'Vedação 09x19x29cm', 'Vedação', 'Tijolo de vedação', 9, 19, 29, '3kg / peça', 0, 'un', 0, '/image/Produtos/tijolo_vedacao_09x19x29.png', 'Ativo'),
                    ('VED-11', 'Vedação 11x19x29cm', 'Vedação', 'Tijolo de vedação', 11, 19, 29, '6kg / peça', 0, 'un', 0, '/image/Produtos/tijolo_vedacao_11x19x29.png', 'Ativo'),
                    ('VED-14', 'Vedação 14x19x29cm', 'Vedação', 'Tijolo de vedação', 14, 19, 29, '7kg / peça', 0, 'un', 0, '/image/Produtos/tijolo_vedacao_14x19x29.png', 'Ativo')
                `);
            }
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }

    return tableReadyPromise;
}

function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

    let cleaned = String(value)
        .replace(/R\$\s?/gi, '')
        .replace(/\s/g, '')
        .trim();

    if (!cleaned) return fallback;

    if (cleaned.includes(',') && cleaned.includes('.')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        cleaned = cleaned.replace(',', '.');
    }

    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePayload(body = {}) {
    return {
        codigo: String(body.codigo || '').trim() || null,
        nome: String(body.nome || '').trim(),
        categoria: String(body.categoria || 'Geral').trim() || 'Geral',
        descricao: String(body.descricao || '').trim() || null,
        altura_cm: body.altura_cm === '' || body.altura_cm === null || body.altura_cm === undefined
            ? null
            : toNumber(body.altura_cm, null),
        largura_cm: body.largura_cm === '' || body.largura_cm === null || body.largura_cm === undefined
            ? null
            : toNumber(body.largura_cm, null),
        comprimento_cm: body.comprimento_cm === '' || body.comprimento_cm === null || body.comprimento_cm === undefined
            ? null
            : toNumber(body.comprimento_cm, null),
        peso: String(body.peso || '').trim() || null,
        preco_unitario: toNumber(body.preco_unitario, 0),
        preco_milheiro: toNumber(body.preco_milheiro, 0),
        preco_m2: toNumber(body.preco_m2, 0),
        desconto_percentual: Math.min(100, Math.max(0, toNumber(body.desconto_percentual, 0))),
        desconto_acima_de: toNumber(body.desconto_acima_de, 0),
        unidade: String(body.unidade || 'un').trim() || 'un',
        estoque: toNumber(body.estoque, 0),
        imagem_url: String(body.imagem_url || '').trim() || null,
        status: body.status === 'Inativo' ? 'Inativo' : 'Ativo',
        observacoes: String(body.observacoes || '').trim() || null,
        ncm: String(body.ncm || '69041000').replace(/\D/g, '').slice(0, 8) || '69041000',
        cfop_padrao: String(body.cfop_padrao || '5102').replace(/\D/g, '').slice(0, 4) || '5102',
        cst_csosn: String(body.cst_csosn || '102').replace(/\D/g, '').slice(0, 4) || '102',
        aliq_icms: Math.min(100, Math.max(0, toNumber(body.aliq_icms, 0))),
        aliq_ipi: Math.min(100, Math.max(0, toNumber(body.aliq_ipi, 0))),
        aliq_pis: Math.min(100, Math.max(0, toNumber(body.aliq_pis, 0))),
        aliq_cofins: Math.min(100, Math.max(0, toNumber(body.aliq_cofins, 0))),
    };
}

router.get('/api/produtos', isAuthenticated, async (req, res) => {
    try {
        await ensureProdutosTable();
        const [rows] = await pool.query(`
            SELECT id, codigo, nome, categoria, altura_cm, largura_cm, comprimento_cm,
                   peso, preco_unitario, preco_milheiro, preco_m2,
                   desconto_percentual, desconto_acima_de, unidade, estoque, imagem_url, status,
                   ncm, cfop_padrao, cst_csosn, aliq_icms, aliq_ipi, aliq_pis, aliq_cofins
            FROM produtos
            ORDER BY nome
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar produtos', { module: 'produtosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar produtos.' });
    }
});

router.post('/api/produtos/upload-imagem', isAuthenticated, (req, res) => {
    uploadImagem.single('imagem')(req, res, (error) => {
        if (error) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'A imagem deve ter no máximo 5 MB.'
                : (error.message || 'Erro ao enviar imagem.');
            return res.status(400).json({ message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma imagem enviada.' });
        }

        const relativePath = `/image/Produtos/uploads/${req.file.filename}`;
        return res.status(201).json({
            imagem_url: relativePath,
            message: 'Imagem enviada com sucesso.'
        });
    });
});

router.get('/api/produtos/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureProdutosTable();
        const [rows] = await pool.query('SELECT * FROM produtos WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Produto não encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao obter produto', { module: 'produtosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter produto.' });
    }
});

router.post('/api/produtos', isAuthenticated, async (req, res) => {
    const payload = normalizePayload(req.body);
    payload.estoque = 0;

    if (!payload.nome) {
        return res.status(400).json({ message: 'Nome do produto é obrigatório.' });
    }

    try {
        await ensureProdutosTable();
        const [result] = await pool.query(`
            INSERT INTO produtos (
                codigo, nome, categoria, descricao,
                altura_cm, largura_cm, comprimento_cm, peso,
                preco_unitario, preco_milheiro, preco_m2, desconto_percentual, desconto_acima_de,
                unidade, estoque, imagem_url, status, observacoes,
                ncm, cfop_padrao, cst_csosn, aliq_icms, aliq_ipi, aliq_pis, aliq_cofins
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payload.codigo, payload.nome, payload.categoria, payload.descricao,
            payload.altura_cm, payload.largura_cm, payload.comprimento_cm, payload.peso,
            payload.preco_unitario, payload.preco_milheiro, payload.preco_m2,
            payload.desconto_percentual, payload.desconto_acima_de,
            payload.unidade, payload.estoque, payload.imagem_url,
            payload.status, payload.observacoes,
            payload.ncm, payload.cfop_padrao, payload.cst_csosn,
            payload.aliq_icms, payload.aliq_ipi, payload.aliq_pis, payload.aliq_cofins,
        ]);

        res.status(201).json({ id: result.insertId, message: 'Produto criado com sucesso.' });
        await logAuditoria(req, {
            modulo: 'produtos',
            acao: 'criar',
            entidade: 'produto',
            entidadeId: result.insertId,
            descricao: `Criou produto "${payload.nome}"`,
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe um produto com este código.' });
        }
        logger.error('Erro ao criar produto', { module: 'produtosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar produto.' });
    }
});

router.put('/api/produtos/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const payload = normalizePayload(req.body);

    if (!payload.nome) {
        return res.status(400).json({ message: 'Nome do produto é obrigatório.' });
    }

    try {
        await ensureProdutosTable();
        const [existing] = await pool.query('SELECT id, estoque FROM produtos WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Produto não encontrado.' });

        // Estoque é controlado pelo módulo de Estoque (movimentações)
        payload.estoque = toNumber(existing[0].estoque, 0);

        await pool.query(`
            UPDATE produtos SET
                codigo = ?, nome = ?, categoria = ?, descricao = ?,
                altura_cm = ?, largura_cm = ?, comprimento_cm = ?, peso = ?,
                preco_unitario = ?, preco_milheiro = ?, preco_m2 = ?,
                desconto_percentual = ?, desconto_acima_de = ?,
                unidade = ?, estoque = ?, imagem_url = ?,
                status = ?, observacoes = ?,
                ncm = ?, cfop_padrao = ?, cst_csosn = ?,
                aliq_icms = ?, aliq_ipi = ?, aliq_pis = ?, aliq_cofins = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            payload.codigo, payload.nome, payload.categoria, payload.descricao,
            payload.altura_cm, payload.largura_cm, payload.comprimento_cm, payload.peso,
            payload.preco_unitario, payload.preco_milheiro, payload.preco_m2,
            payload.desconto_percentual, payload.desconto_acima_de,
            payload.unidade, payload.estoque, payload.imagem_url,
            payload.status, payload.observacoes,
            payload.ncm, payload.cfop_padrao, payload.cst_csosn,
            payload.aliq_icms, payload.aliq_ipi, payload.aliq_pis, payload.aliq_cofins,
            id,
        ]);

        res.json({ message: 'Produto atualizado com sucesso.' });
        await logAuditoria(req, {
            modulo: 'produtos',
            acao: 'editar',
            entidade: 'produto',
            entidadeId: id,
            descricao: `Alterou produto "${payload.nome}"`,
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe um produto com este código.' });
        }
        logger.error('Erro ao atualizar produto', { module: 'produtosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar produto.' });
    }
});

router.delete('/api/produtos/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureProdutosTable();
        const [existing] = await pool.query('SELECT id, nome FROM produtos WHERE id = ?', [req.params.id]);
        if (!existing.length) return res.status(404).json({ message: 'Produto não encontrado.' });

        await pool.query('DELETE FROM produtos WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'produtos',
            acao: 'excluir',
            entidade: 'produto',
            entidadeId: req.params.id,
            descricao: `Excluiu produto "${existing[0].nome || req.params.id}"`,
        });
        res.json({ message: 'Produto excluído com sucesso.' });
    } catch (error) {
        logger.error('Erro ao excluir produto', { module: 'produtosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir produto.' });
    }
});

module.exports = router;
