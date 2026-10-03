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

const uploadDir = path.join(__dirname, '..', 'public', 'image', 'Frota', 'uploads');

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
        cb(null, `frota-${stamp}-${random}${safeExt}`);
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

async function ensureFrotaTable() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS frota (
                    id SERIAL PRIMARY KEY,
                    placa VARCHAR(10) NOT NULL,
                    marca VARCHAR(80),
                    modelo VARCHAR(120) NOT NULL,
                    tipo VARCHAR(40) DEFAULT 'Caminhão',
                    ano INTEGER,
                    cor VARCHAR(40),
                    combustivel VARCHAR(40) DEFAULT 'Diesel',
                    capacidade VARCHAR(60),
                    quilometragem NUMERIC(12, 1) DEFAULT 0,
                    motorista VARCHAR(150),
                    descricao TEXT,
                    observacoes TEXT,
                    imagem_url TEXT,
                    status VARCHAR(20) DEFAULT 'Ativo',
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS frota_placa_unique
                ON frota (placa)
            `);

            await pool.query(`
                ALTER TABLE frota
                    ADD COLUMN IF NOT EXISTS motorista_telefone VARCHAR(20),
                    ADD COLUMN IF NOT EXISTS motorista_cpf VARCHAR(20),
                    ADD COLUMN IF NOT EXISTS motorista_cnh VARCHAR(30),
                    ADD COLUMN IF NOT EXISTS motorista_cnh_categoria VARCHAR(10),
                    ADD COLUMN IF NOT EXISTS motorista_cnh_validade DATE
            `);

            await pool.query(`
                INSERT INTO frota (
                    placa, marca, modelo, tipo, ano, cor, combustivel, capacidade, quilometragem,
                    motorista, motorista_telefone, motorista_cpf, motorista_cnh,
                    motorista_cnh_categoria, motorista_cnh_validade,
                    descricao, observacoes, status
                ) VALUES
                (
                    'RBA-1A23', 'Volvo', 'FH 460 6x2', 'Caminhão', 2021, 'Branco', 'Diesel', '28 t', 84500.0,
                    'Carlos Eduardo Silva', '(32) 98811-2233', '123.456.789-00', '01234567890',
                    'E', '2027-08-15',
                    'Caminhão principal para entrega de tijolos e lajotas.', 'Revisão em dia.', 'Ativo'
                ),
                (
                    'QWE-4B56', 'Mercedes-Benz', 'Actros 2651', 'Caminhão', 2019, 'Vermelho', 'Diesel', '32 t', 152300.0,
                    'José Antônio Pereira', '(32) 99122-3344', '987.654.321-00', '09876543210',
                    'E', '2026-11-20',
                    'Usado em rotas longas e cargas pesadas.', NULL, 'Ativo'
                ),
                (
                    'MGT-7C89', 'Volkswagen', 'Delivery Express', 'Utilitário', 2022, 'Prata', 'Diesel', '3,5 t', 41200.0,
                    'Ana Paula Souza', '(32) 98455-6677', '456.789.123-00', '45678912300',
                    'C', '2028-03-10',
                    'Utilitário para entregas menores e suporte operacional.', NULL, 'Ativo'
                )
                ON CONFLICT (placa) DO NOTHING
            `);
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }

    return tableReadyPromise;
}

function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePlaca(value) {
    return String(value || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/^([A-Z]{3})([A-Z0-9]{0,4})$/, (_, letters, rest) => (rest ? `${letters}-${rest}` : letters))
        .slice(0, 8);
}

function normalizeDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
        return raw.slice(0, 10);
    }

    const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
        return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
    }

    return null;
}

function normalizePayload(body = {}) {
    const anoRaw = body.ano;
    const ano = anoRaw === '' || anoRaw === null || anoRaw === undefined
        ? null
        : toNumber(anoRaw, null);

    return {
        placa: normalizePlaca(body.placa),
        marca: String(body.marca || '').trim() || null,
        modelo: String(body.modelo || '').trim(),
        tipo: String(body.tipo || 'Caminhão').trim() || 'Caminhão',
        ano: ano && ano >= 1950 && ano <= 2100 ? ano : null,
        cor: String(body.cor || '').trim() || null,
        combustivel: String(body.combustivel || 'Diesel').trim() || 'Diesel',
        capacidade: String(body.capacidade || '').trim() || null,
        quilometragem: toNumber(body.quilometragem, 0),
        motorista: String(body.motorista || '').trim() || null,
        motorista_telefone: String(body.motorista_telefone || '').trim() || null,
        motorista_cpf: String(body.motorista_cpf || '').trim() || null,
        motorista_cnh: String(body.motorista_cnh || '').replace(/\D/g, '').slice(0, 11) || null,
        motorista_cnh_categoria: String(body.motorista_cnh_categoria || '').trim().toUpperCase() || null,
        motorista_cnh_validade: normalizeDate(body.motorista_cnh_validade),
        descricao: String(body.descricao || '').trim() || null,
        observacoes: String(body.observacoes || '').trim() || null,
        imagem_url: String(body.imagem_url || '').trim() || null,
        status: body.status === 'Inativo' ? 'Inativo' : 'Ativo'
    };
}

router.get('/api/frota', isAuthenticated, async (req, res) => {
    try {
        await ensureFrotaTable();
        const [rows] = await pool.query(`
            SELECT id, placa, marca, modelo, tipo, ano, cor, combustivel,
                   capacidade, quilometragem, motorista, motorista_telefone,
                   motorista_cpf, motorista_cnh, motorista_cnh_categoria,
                   motorista_cnh_validade, imagem_url, status
            FROM frota
            ORDER BY modelo
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar frota', { module: 'frotaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar frota.' });
    }
});

router.post('/api/frota/upload-imagem', isAuthenticated, (req, res) => {
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

        const relativePath = `/image/Frota/uploads/${req.file.filename}`;
        return res.status(201).json({
            imagem_url: relativePath,
            message: 'Imagem enviada com sucesso.'
        });
    });
});

router.get('/api/frota/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureFrotaTable();
        const [rows] = await pool.query('SELECT * FROM frota WHERE id = ?', [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'Veículo não encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao obter veículo', { module: 'frotaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter veículo.' });
    }
});

router.post('/api/frota', isAuthenticated, async (req, res) => {
    const payload = normalizePayload(req.body);

    if (!payload.placa || payload.placa.replace(/[^A-Z0-9]/g, '').length < 7) {
        return res.status(400).json({ message: 'Placa do veículo é obrigatória.' });
    }

    if (!payload.modelo) {
        return res.status(400).json({ message: 'Modelo do veículo é obrigatório.' });
    }

    try {
        await ensureFrotaTable();
        const [result] = await pool.query(`
            INSERT INTO frota (
                placa, marca, modelo, tipo, ano, cor, combustivel,
                capacidade, quilometragem, motorista, motorista_telefone,
                motorista_cpf, motorista_cnh, motorista_cnh_categoria, motorista_cnh_validade,
                descricao, observacoes, imagem_url, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payload.placa, payload.marca, payload.modelo, payload.tipo, payload.ano,
            payload.cor, payload.combustivel, payload.capacidade, payload.quilometragem,
            payload.motorista, payload.motorista_telefone, payload.motorista_cpf,
            payload.motorista_cnh, payload.motorista_cnh_categoria, payload.motorista_cnh_validade,
            payload.descricao, payload.observacoes, payload.imagem_url,
            payload.status
        ]);

        await logAuditoria(req, {
            modulo: 'frota',
            acao: 'criar',
            entidade: 'veiculo',
            entidadeId: result.insertId,
            descricao: `Criou veículo "${payload.placa}"`,
        });
        res.status(201).json({ id: result.insertId, message: 'Veículo criado com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe um veículo com esta placa.' });
        }
        logger.error('Erro ao criar veículo', { module: 'frotaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar veículo.' });
    }
});

router.put('/api/frota/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const payload = normalizePayload(req.body);

    if (!payload.placa || payload.placa.replace(/[^A-Z0-9]/g, '').length < 7) {
        return res.status(400).json({ message: 'Placa do veículo é obrigatória.' });
    }

    if (!payload.modelo) {
        return res.status(400).json({ message: 'Modelo do veículo é obrigatório.' });
    }

    try {
        await ensureFrotaTable();
        const [existing] = await pool.query('SELECT id FROM frota WHERE id = ?', [id]);
        if (!existing.length) return res.status(404).json({ message: 'Veículo não encontrado.' });

        await pool.query(`
            UPDATE frota SET
                placa = ?, marca = ?, modelo = ?, tipo = ?, ano = ?, cor = ?,
                combustivel = ?, capacidade = ?, quilometragem = ?, motorista = ?,
                motorista_telefone = ?, motorista_cpf = ?, motorista_cnh = ?,
                motorista_cnh_categoria = ?, motorista_cnh_validade = ?,
                descricao = ?, observacoes = ?, imagem_url = ?, status = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            payload.placa, payload.marca, payload.modelo, payload.tipo, payload.ano,
            payload.cor, payload.combustivel, payload.capacidade, payload.quilometragem,
            payload.motorista, payload.motorista_telefone, payload.motorista_cpf,
            payload.motorista_cnh, payload.motorista_cnh_categoria, payload.motorista_cnh_validade,
            payload.descricao, payload.observacoes, payload.imagem_url,
            payload.status, id
        ]);

        await logAuditoria(req, {
            modulo: 'frota',
            acao: 'editar',
            entidade: 'veiculo',
            entidadeId: id,
            descricao: `Alterou veículo "${payload.placa}"`,
        });
        res.json({ message: 'Veículo atualizado com sucesso.' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Já existe um veículo com esta placa.' });
        }
        logger.error('Erro ao atualizar veículo', { module: 'frotaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar veículo.' });
    }
});

router.delete('/api/frota/:id', isAuthenticated, async (req, res) => {
    try {
        await ensureFrotaTable();
        const [existing] = await pool.query('SELECT id FROM frota WHERE id = ?', [req.params.id]);
        if (!existing.length) return res.status(404).json({ message: 'Veículo não encontrado.' });

        await pool.query('DELETE FROM frota WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'frota',
            acao: 'excluir',
            entidade: 'veiculo',
            entidadeId: req.params.id,
            descricao: `Excluiu veículo #${req.params.id}`,
        });
        res.json({ message: 'Veículo excluído com sucesso.' });
    } catch (error) {
        logger.error('Erro ao excluir veículo', { module: 'frotaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir veículo.' });
    }
});

module.exports = router;
