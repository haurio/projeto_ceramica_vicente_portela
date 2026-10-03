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

const uploadDir = path.join(__dirname, '..', 'public', 'image', 'Cipa', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadFoto = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadDir),
        filename: (_req, file, cb) => {
            const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
            const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
            cb(null, `cipa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype?.startsWith('image/')) {
            cb(new Error('Envie apenas arquivos de imagem.'));
            return;
        }
        cb(null, true);
    },
});

function parseFotos(raw) {
    if (Array.isArray(raw)) {
        return raw.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => String(item || '').trim()).filter(Boolean);
            }
        } catch (_error) {
            // ignore
        }
        return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
}

let tableReadyPromise = null;

async function ensureCipaTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS cipa_epis (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(150) NOT NULL,
                    ca_numero VARCHAR(40),
                    categoria VARCHAR(80),
                    fabricante VARCHAR(120),
                    validade_ca DATE,
                    estoque_atual INTEGER NOT NULL DEFAULT 0,
                    estoque_minimo INTEGER NOT NULL DEFAULT 0,
                    vida_util_dias INTEGER,
                    fornecedor_id INTEGER,
                    nota_produto VARCHAR(80),
                    status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                ALTER TABLE cipa_epis
                    ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER,
                    ADD COLUMN IF NOT EXISTS nota_produto VARCHAR(80)
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS cipa_equipamentos (
                    id SERIAL PRIMARY KEY,
                    nome VARCHAR(150) NOT NULL,
                    tag_patrimonio VARCHAR(60),
                    tipo VARCHAR(80),
                    setor VARCHAR(120),
                    local_uso VARCHAR(150),
                    fabricante VARCHAR(120),
                    modelo VARCHAR(120),
                    data_aquisicao DATE,
                    proxima_manutencao DATE,
                    status VARCHAR(30) NOT NULL DEFAULT 'Operacional',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS cipa_epi_entregas (
                    id SERIAL PRIMARY KEY,
                    epi_id INTEGER NOT NULL REFERENCES cipa_epis(id) ON DELETE RESTRICT,
                    funcionario_id INTEGER,
                    funcionario_nome VARCHAR(150),
                    quantidade INTEGER NOT NULL DEFAULT 1,
                    data_entrega DATE NOT NULL,
                    data_validade DATE,
                    data_devolucao DATE,
                    motivo VARCHAR(40) NOT NULL DEFAULT 'Entrega',
                    status VARCHAR(30) NOT NULL DEFAULT 'Em uso',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS cipa_manutencoes (
                    id SERIAL PRIMARY KEY,
                    equipamento_id INTEGER NOT NULL REFERENCES cipa_equipamentos(id) ON DELETE RESTRICT,
                    tipo VARCHAR(40) NOT NULL DEFAULT 'Preventiva',
                    data_agendada DATE,
                    data_realizada DATE,
                    responsavel VARCHAR(150),
                    custo NUMERIC(12, 2) DEFAULT 0,
                    descricao TEXT,
                    proximo_prazo DATE,
                    status VARCHAR(30) NOT NULL DEFAULT 'Agendada',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS cipa_acidentes (
                    id SERIAL PRIMARY KEY,
                    funcionario_id INTEGER,
                    funcionario_nome VARCHAR(150),
                    data_ocorrencia DATE NOT NULL,
                    hora_ocorrencia VARCHAR(10),
                    setor VARCHAR(120),
                    local_ocorrencia VARCHAR(150),
                    tipo VARCHAR(40) NOT NULL DEFAULT 'Típico',
                    gravidade VARCHAR(40) NOT NULL DEFAULT 'Leve',
                    descricao TEXT,
                    partes_corpo VARCHAR(200),
                    testemunhas TEXT,
                    cat_emitida BOOLEAN NOT NULL DEFAULT FALSE,
                    numero_cat VARCHAR(60),
                    dias_afastamento INTEGER DEFAULT 0,
                    status VARCHAR(30) NOT NULL DEFAULT 'Aberto',
                    medidas_corretivas TEXT,
                    observacoes TEXT,
                    fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                ALTER TABLE cipa_acidentes
                    ADD COLUMN IF NOT EXISTS fotos JSONB NOT NULL DEFAULT '[]'::jsonb
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cipa_entregas_epi ON cipa_epi_entregas (epi_id)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cipa_entregas_validade ON cipa_epi_entregas (data_validade)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cipa_manut_equip ON cipa_manutencoes (equipamento_id)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cipa_equip_proxima ON cipa_equipamentos (proxima_manutencao)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_cipa_acidentes_data ON cipa_acidentes (data_ocorrencia)
            `);

            await seedCipaExamples();
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }
    return tableReadyPromise;
}

async function seedCipaExamples() {
    // Fornecedores fictícios de EPI (se ainda não existirem)
    const ficticios = [
        {
            razao_social: 'Segurança Total EPIs Ltda',
            nome_fantasia: 'Segurança Total',
            cnpj: '11.222.333/0001-44',
            telefone_contato: '(32) 3333-1001',
            email_contato: 'vendas@segurancatotal.exemplo',
            nome_contato: 'Roberto Mendes',
            cidade: 'Cataguases',
            estado: 'MG',
        },
        {
            razao_social: 'Proteção Industrial Comércio Ltda',
            nome_fantasia: 'Proteção Industrial',
            cnpj: '22.333.444/0001-55',
            telefone_contato: '(32) 3333-2002',
            email_contato: 'contato@protecaoindustrial.exemplo',
            nome_contato: 'Fernanda Alves',
            cidade: 'Leopoldina',
            estado: 'MG',
        },
        {
            razao_social: 'WorkSafe Equipamentos de Proteção Ltda',
            nome_fantasia: 'WorkSafe',
            cnpj: '33.444.555/0001-66',
            telefone_contato: '(32) 3333-3003',
            email_contato: 'pedidos@worksafe.exemplo',
            nome_contato: 'Lucas Ferreira',
            cidade: 'Juiz de Fora',
            estado: 'MG',
        },
    ];

    try {
        for (const item of ficticios) {
            const [exists] = await pool.query(
                'SELECT id FROM fornecedores WHERE cnpj = ? LIMIT 1',
                [item.cnpj]
            );
            if (exists.length) continue;
            await pool.query(`
                INSERT INTO fornecedores (
                    razao_social, nome_fantasia, cnpj, telefone_contato, email_contato,
                    nome_contato, cidade, estado, ativo, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item.razao_social,
                item.nome_fantasia,
                item.cnpj,
                item.telefone_contato,
                item.email_contato,
                item.nome_contato,
                item.cidade,
                item.estado,
                'sim',
                'Fornecedor fictício para demonstração CIPA/EPI.',
            ]);
        }
    } catch (error) {
        logger.warn('Não foi possível semear fornecedores CIPA', {
            module: 'cipaRoutes',
            message: error.message,
        });
    }

    const [epiCount] = await pool.query('SELECT COUNT(*)::int AS total FROM cipa_epis');

    let fornecedorIds = [];
    try {
        const [fornecedores] = await pool.query(`
            SELECT id FROM fornecedores
            WHERE cnpj IN (?, ?, ?)
               OR COALESCE(ativo, 'sim') IN ('sim', 'true', '1')
            ORDER BY id ASC
            LIMIT 5
        `, [ficticios[0].cnpj, ficticios[1].cnpj, ficticios[2].cnpj]);
        fornecedorIds = fornecedores.map((row) => row.id);
    } catch (_error) {
        fornecedorIds = [];
    }

    const forn = (index) => fornecedorIds[index % Math.max(fornecedorIds.length, 1)] || null;

    if (!epiCount[0]?.total) {
        await pool.query(`
            INSERT INTO cipa_epis (
                nome, ca_numero, categoria, fabricante, validade_ca,
                estoque_atual, estoque_minimo, vida_util_dias,
                fornecedor_id, nota_produto, status, observacoes
            ) VALUES
            (
                'Capacete de Segurança Classe B', '45892', 'Capacete', 'MSA',
                CURRENT_DATE + INTERVAL '120 days', 24, 8, 730,
                ?, 'NF-EPI-1001', 'Ativo', 'Uso obrigatório na área de produção.'
            ),
            (
                'Luva de Raspa Couro', '31210', 'Luva', 'Danny',
                CURRENT_DATE + INTERVAL '45 days', 6, 10, 180,
                ?, 'NF-EPI-1002', 'Ativo', 'Estoque baixo — repor urgente.'
            ),
            (
                'Botina de Segurança com Biqueira', '28991', 'Calçado', 'Marluvas',
                CURRENT_DATE + INTERVAL '200 days', 18, 6, 365,
                ?, 'NF-EPI-1003', 'Ativo', 'Numeração mista (38 a 44).'
            ),
            (
                'Óculos de Proteção Ampla Visão', '50112', 'Óculos', '3M',
                CURRENT_DATE - INTERVAL '5 days', 12, 5, 365,
                ?, 'NF-EPI-1004', 'Ativo', 'CA vencido — bloquear novas entregas.'
            ),
            (
                'Protetor Auricular Tipo Plug', '19440', 'Audição', '3M',
                CURRENT_DATE + INTERVAL '300 days', 80, 20, 90,
                ?, 'NF-EPI-1005', 'Ativo', 'Descartável — reposição mensal.'
            )
        `, [forn(0), forn(1), forn(2), forn(0), forn(1)]);
    }

    const [equipCount] = await pool.query('SELECT COUNT(*)::int AS total FROM cipa_equipamentos');
    if (!equipCount[0]?.total) {
        await pool.query(`
            INSERT INTO cipa_equipamentos (
                nome, tag_patrimonio, tipo, setor, local_uso, fabricante, modelo,
                data_aquisicao, proxima_manutencao, status, observacoes
            ) VALUES
            (
                'Prensa Hidráulica 120 t', 'EQ-001', 'Prensa', 'Produção', 'Galpão A',
                'Hidramax', 'PH-120', CURRENT_DATE - INTERVAL '800 days',
                CURRENT_DATE + INTERVAL '12 days', 'Operacional', 'Manutenção preventiva próxima.'
            ),
            (
                'Empilhadeira Elétrica', 'EQ-014', 'Empilhadeira', 'Expedição', 'Pátio',
                'Toyota', '8FBE15', CURRENT_DATE - INTERVAL '400 days',
                CURRENT_DATE - INTERVAL '2 days', 'Em manutenção', 'Prazo de manutenção vencido.'
            ),
            (
                'Compressor de Ar 20 HP', 'EQ-022', 'Compressor', 'Manutenção', 'Casa de máquinas',
                'Schulz', 'SRPV 20', CURRENT_DATE - INTERVAL '1100 days',
                CURRENT_DATE + INTERVAL '60 days', 'Operacional', NULL
            )
        `);
    }

    const [entregaCount] = await pool.query('SELECT COUNT(*)::int AS total FROM cipa_epi_entregas');
    if (!entregaCount[0]?.total) {
        const [epis] = await pool.query('SELECT id FROM cipa_epis ORDER BY id ASC LIMIT 3');
        if (epis.length) {
            await pool.query(`
                INSERT INTO cipa_epi_entregas (
                    epi_id, funcionario_nome, quantidade, data_entrega, data_validade,
                    motivo, status, observacoes
                ) VALUES
                (?, 'Carlos Eduardo Silva', 1, CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE + INTERVAL '10 days', 'Entrega', 'Em uso', 'Entrega padrão de admissão.'),
                (?, 'Ana Paula Souza', 2, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'Reposição', 'Em uso', NULL),
                (?, 'José Antônio Pereira', 1, CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '3 days', 'Troca', 'Expirado', 'Aguardando devolução.')
            `, [epis[0].id, epis[1]?.id || epis[0].id, epis[2]?.id || epis[0].id]);
        }
    }

    const [manutCount] = await pool.query('SELECT COUNT(*)::int AS total FROM cipa_manutencoes');
    if (!manutCount[0]?.total) {
        const [equips] = await pool.query('SELECT id FROM cipa_equipamentos ORDER BY id ASC LIMIT 2');
        if (equips.length) {
            await pool.query(`
                INSERT INTO cipa_manutencoes (
                    equipamento_id, tipo, data_agendada, data_realizada, responsavel,
                    custo, descricao, proximo_prazo, status, observacoes
                ) VALUES
                (?, 'Preventiva', CURRENT_DATE + INTERVAL '12 days', NULL, 'Equipe Manutenção',
                 450.00, 'Troca de óleo e inspeção de válvulas.', CURRENT_DATE + INTERVAL '180 days', 'Agendada', NULL),
                (?, 'Corretiva', CURRENT_DATE - INTERVAL '2 days', NULL, 'Oficina externa',
                 1200.00, 'Revisão do sistema elétrico da empilhadeira.', CURRENT_DATE + INTERVAL '90 days', 'Atrasada', 'Aguardando peça.')
            `, [equips[0].id, equips[1]?.id || equips[0].id]);
        }
    }

    const [acidCount] = await pool.query('SELECT COUNT(*)::int AS total FROM cipa_acidentes');
    if (!acidCount[0]?.total) {
        await pool.query(`
            INSERT INTO cipa_acidentes (
                funcionario_nome, data_ocorrencia, hora_ocorrencia, setor, local_ocorrencia,
                tipo, gravidade, descricao, partes_corpo, cat_emitida, numero_cat,
                dias_afastamento, status, medidas_corretivas
            ) VALUES
            (
                'Pedro Henrique Costa', CURRENT_DATE - INTERVAL '8 days', '10:40', 'Produção', 'Linha de corte',
                'Típico', 'Leve', 'Corte superficial ao manusear chapa sem luva adequada.',
                'Mão esquerda', TRUE, 'CAT-2026-0012', 2, 'Em análise',
                'Reforço de entrega de luvas e treinamento de NR-12.'
            ),
            (
                'Mariana Lopes', CURRENT_DATE - INTERVAL '40 days', '07:15', 'Expedição', 'Pátio de carga',
                'Trajeto', 'Moderada', 'Queda no pátio molhado ao descer da empilhadeira.',
                'Tornozelo direito', TRUE, 'CAT-2026-0007', 5, 'Encerrado',
                'Sinalização e piso antiderrapante instalados.'
            )
        `);
    }
}

function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toMoney(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (br) return `${br[3]}-${br[2]}-${br[1]}`;
    return null;
}

function daysBetween(from, to) {
    const a = new Date(`${from}T00:00:00`);
    const b = new Date(`${to}T00:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000);
}

router.use('/api/cipa', isAuthenticated);

router.get('/api/cipa/alertas', async (req, res) => {
    try {
        await ensureCipaTables();
        const dias = Math.min(Math.max(toInt(req.query.dias, 30), 1), 365);
        const hoje = new Date().toISOString().slice(0, 10);

        const [episCa] = await pool.query(`
            SELECT id, nome, ca_numero, validade_ca, estoque_atual, estoque_minimo, status
            FROM cipa_epis
            WHERE status = 'Ativo'
              AND validade_ca IS NOT NULL
              AND validade_ca <= CURRENT_DATE + (? * INTERVAL '1 day')
            ORDER BY validade_ca ASC
        `, [dias]);

        const [estoqueBaixo] = await pool.query(`
            SELECT id, nome, ca_numero, estoque_atual, estoque_minimo, status
            FROM cipa_epis
            WHERE status = 'Ativo' AND estoque_atual <= estoque_minimo
            ORDER BY estoque_atual ASC, nome ASC
        `);

        const [entregas] = await pool.query(`
            SELECT e.id, e.epi_id, e.funcionario_nome, e.quantidade, e.data_entrega,
                   e.data_validade, e.status, p.nome AS epi_nome, p.ca_numero
            FROM cipa_epi_entregas e
            JOIN cipa_epis p ON p.id = e.epi_id
            WHERE e.status = 'Em uso'
              AND e.data_validade IS NOT NULL
              AND e.data_validade <= CURRENT_DATE + (? * INTERVAL '1 day')
            ORDER BY e.data_validade ASC
        `, [dias]);

        const [equipamentos] = await pool.query(`
            SELECT id, nome, tag_patrimonio, tipo, setor, proxima_manutencao, status
            FROM cipa_equipamentos
            WHERE status <> 'Inativo'
              AND proxima_manutencao IS NOT NULL
              AND proxima_manutencao <= CURRENT_DATE + (? * INTERVAL '1 day')
            ORDER BY proxima_manutencao ASC
        `, [dias]);

        const [manutencoes] = await pool.query(`
            SELECT m.id, m.equipamento_id, m.tipo, m.data_agendada, m.status, m.responsavel,
                   eq.nome AS equipamento_nome, eq.tag_patrimonio
            FROM cipa_manutencoes m
            JOIN cipa_equipamentos eq ON eq.id = m.equipamento_id
            WHERE m.status IN ('Agendada', 'Atrasada')
              AND m.data_agendada IS NOT NULL
              AND m.data_agendada <= CURRENT_DATE + (? * INTERVAL '1 day')
            ORDER BY m.data_agendada ASC
        `, [dias]);

        const [acidentesAbertos] = await pool.query(`
            SELECT id, funcionario_nome, data_ocorrencia, tipo, gravidade, status, setor
            FROM cipa_acidentes
            WHERE status IN ('Aberto', 'Em análise')
            ORDER BY data_ocorrencia DESC
            LIMIT 20
        `);

        const mapWithDays = (rows, dateField) => rows.map((row) => ({
            ...row,
            dias_restantes: row[dateField] ? daysBetween(hoje, String(row[dateField]).slice(0, 10)) : null,
            vencido: row[dateField]
                ? daysBetween(hoje, String(row[dateField]).slice(0, 10)) < 0
                : false,
        }));

        res.json({
            dias_janela: dias,
            epis_ca: mapWithDays(episCa, 'validade_ca'),
            estoque_baixo: estoqueBaixo,
            entregas_vencendo: mapWithDays(entregas, 'data_validade'),
            equipamentos_manutencao: mapWithDays(equipamentos, 'proxima_manutencao'),
            manutencoes_agendadas: mapWithDays(manutencoes, 'data_agendada'),
            acidentes_abertos: acidentesAbertos,
            totais: {
                epis_ca: episCa.length,
                estoque_baixo: estoqueBaixo.length,
                entregas_vencendo: entregas.length,
                equipamentos_manutencao: equipamentos.length,
                manutencoes_agendadas: manutencoes.length,
                acidentes_abertos: acidentesAbertos.length,
            },
        });
    } catch (error) {
        logger.error('Erro ao listar alertas CIPA', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao carregar alertas da CIPA.' });
    }
});

/* ---------- EPIs ---------- */
router.get('/api/cipa/epis', async (_req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT e.*,
                   COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
            FROM cipa_epis e
            LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
            ORDER BY e.nome ASC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar EPIs', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar EPIs.' });
    }
});

router.get('/api/cipa/epis/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT e.*,
                   COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
            FROM cipa_epis e
            LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
            WHERE e.id = ?
        `, [req.params.id]);
        if (!rows.length) return res.status(404).json({ message: 'EPI não encontrado.' });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao obter EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao obter EPI.' });
    }
});

router.post('/api/cipa/epis', async (req, res) => {
    try {
        await ensureCipaTables();
        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome do EPI.' });

        const fornecedorId = req.body.fornecedor_id ? toInt(req.body.fornecedor_id, null) : null;
        const payload = {
            nome,
            ca_numero: String(req.body.ca_numero || '').trim() || null,
            categoria: String(req.body.categoria || '').trim() || null,
            fabricante: String(req.body.fabricante || '').trim() || null,
            validade_ca: normalizeDate(req.body.validade_ca),
            estoque_atual: Math.max(0, toInt(req.body.estoque_atual, 0)),
            estoque_minimo: Math.max(0, toInt(req.body.estoque_minimo, 0)),
            vida_util_dias: req.body.vida_util_dias === '' || req.body.vida_util_dias == null
                ? null
                : Math.max(1, toInt(req.body.vida_util_dias, 1)),
            fornecedor_id: fornecedorId && fornecedorId > 0 ? fornecedorId : null,
            nota_produto: String(req.body.nota_produto || '').trim() || null,
            status: req.body.status === 'Inativo' ? 'Inativo' : 'Ativo',
            observacoes: String(req.body.observacoes || '').trim() || null,
        };

        const [result] = await pool.query(`
            INSERT INTO cipa_epis (
                nome, ca_numero, categoria, fabricante, validade_ca,
                estoque_atual, estoque_minimo, vida_util_dias,
                fornecedor_id, nota_produto, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            payload.nome, payload.ca_numero, payload.categoria, payload.fabricante, payload.validade_ca,
            payload.estoque_atual, payload.estoque_minimo, payload.vida_util_dias,
            payload.fornecedor_id, payload.nota_produto, payload.status, payload.observacoes,
        ]);

        const [rows] = await pool.query(`
            SELECT e.*,
                   COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
            FROM cipa_epis e
            LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
            WHERE e.id = ?
        `, [result.insertId]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'criar',
            entidade: 'epi',
            entidadeId: result.insertId,
            descricao: `Criou EPI "${payload.nome}"`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar EPI.' });
    }
});

router.put('/api/cipa/epis/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id FROM cipa_epis WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'EPI não encontrado.' });

        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome do EPI.' });

        const fornecedorId = req.body.fornecedor_id ? toInt(req.body.fornecedor_id, null) : null;

        await pool.query(`
            UPDATE cipa_epis SET
                nome = ?, ca_numero = ?, categoria = ?, fabricante = ?, validade_ca = ?,
                estoque_atual = ?, estoque_minimo = ?, vida_util_dias = ?,
                fornecedor_id = ?, nota_produto = ?, status = ?, observacoes = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nome,
            String(req.body.ca_numero || '').trim() || null,
            String(req.body.categoria || '').trim() || null,
            String(req.body.fabricante || '').trim() || null,
            normalizeDate(req.body.validade_ca),
            Math.max(0, toInt(req.body.estoque_atual, 0)),
            Math.max(0, toInt(req.body.estoque_minimo, 0)),
            req.body.vida_util_dias === '' || req.body.vida_util_dias == null
                ? null
                : Math.max(1, toInt(req.body.vida_util_dias, 1)),
            fornecedorId && fornecedorId > 0 ? fornecedorId : null,
            String(req.body.nota_produto || '').trim() || null,
            req.body.status === 'Inativo' ? 'Inativo' : 'Ativo',
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        const [rows] = await pool.query(`
            SELECT e.*,
                   COALESCE(f.nome_fantasia, f.razao_social) AS fornecedor_nome
            FROM cipa_epis e
            LEFT JOIN fornecedores f ON f.id = e.fornecedor_id
            WHERE e.id = ?
        `, [id]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'editar',
            entidade: 'epi',
            entidadeId: id,
            descricao: `Alterou EPI "${nome}"`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar EPI.' });
    }
});

router.delete('/api/cipa/epis/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const [used] = await pool.query(
            'SELECT id FROM cipa_epi_entregas WHERE epi_id = ? LIMIT 1',
            [req.params.id]
        );
        if (used.length) {
            return res.status(400).json({ message: 'EPI possui entregas vinculadas. Inative-o em vez de excluir.' });
        }
        const [result] = await pool.query('DELETE FROM cipa_epis WHERE id = ?', [req.params.id]);
        if (!result?.affectedRows && result?.rowCount === 0) {
            // pg wrapper may not return affectedRows on DELETE
        }
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'excluir',
            entidade: 'epi',
            entidadeId: req.params.id,
            descricao: `Excluiu EPI #${req.params.id}`,
        });
        res.json({ message: 'EPI excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir EPI.' });
    }
});

/* ---------- Entregas ---------- */
router.get('/api/cipa/entregas', async (_req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT e.*, p.nome AS epi_nome, p.ca_numero
            FROM cipa_epi_entregas e
            JOIN cipa_epis p ON p.id = e.epi_id
            ORDER BY e.data_entrega DESC, e.id DESC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar entregas EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar entregas de EPI.' });
    }
});

router.post('/api/cipa/entregas', async (req, res) => {
    try {
        await ensureCipaTables();
        const epiId = toInt(req.body.epi_id, 0);
        const dataEntrega = normalizeDate(req.body.data_entrega);
        const quantidade = Math.max(1, toInt(req.body.quantidade, 1));
        if (!epiId) return res.status(400).json({ message: 'Selecione o EPI.' });
        if (!dataEntrega) return res.status(400).json({ message: 'Informe a data de entrega.' });

        const [epis] = await pool.query('SELECT * FROM cipa_epis WHERE id = ?', [epiId]);
        if (!epis.length) return res.status(404).json({ message: 'EPI não encontrado.' });
        if (epis[0].estoque_atual < quantidade) {
            return res.status(400).json({ message: 'Estoque insuficiente para esta entrega.' });
        }

        const funcionarioId = req.body.funcionario_id ? toInt(req.body.funcionario_id, null) : null;
        const funcionarioNome = String(req.body.funcionario_nome || '').trim() || null;
        const motivo = String(req.body.motivo || 'Entrega').trim() || 'Entrega';
        const status = String(req.body.status || 'Em uso').trim() || 'Em uso';
        const today = new Date().toISOString().slice(0, 10);
        const replacePreviousId = toInt(req.body.substitui_entrega_id, 0);

        // Troca/Reposição: arquiva entregas anteriores em uso (mantém histórico pesquisável)
        if ((motivo === 'Troca' || motivo === 'Reposição') && status === 'Em uso') {
            if (replacePreviousId > 0) {
                await pool.query(`
                    UPDATE cipa_epi_entregas
                    SET status = 'Trocado',
                        data_devolucao = COALESCE(data_devolucao, ?),
                        atualizado_em = CURRENT_TIMESTAMP
                    WHERE id = ?
                      AND epi_id = ?
                      AND status IN ('Em uso', 'Expirado')
                `, [today, replacePreviousId, epiId]);
            }

            const closeParams = [today, epiId];
            let closeSql = `
                UPDATE cipa_epi_entregas
                SET status = 'Trocado',
                    data_devolucao = COALESCE(data_devolucao, ?),
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE epi_id = ?
                  AND status IN ('Em uso', 'Expirado')
            `;
            if (funcionarioId) {
                closeSql += ' AND funcionario_id = ?';
                closeParams.push(funcionarioId);
            } else if (funcionarioNome) {
                closeSql += ' AND LOWER(COALESCE(funcionario_nome, \'\')) = LOWER(?)';
                closeParams.push(funcionarioNome);
            } else {
                closeSql = null;
            }
            if (closeSql) {
                await pool.query(closeSql, closeParams);
            }
        }

        const [result] = await pool.query(`
            INSERT INTO cipa_epi_entregas (
                epi_id, funcionario_id, funcionario_nome, quantidade,
                data_entrega, data_validade, data_devolucao, motivo, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            epiId,
            funcionarioId,
            funcionarioNome,
            quantidade,
            dataEntrega,
            normalizeDate(req.body.data_validade),
            normalizeDate(req.body.data_devolucao),
            motivo,
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        await pool.query(`
            UPDATE cipa_epis
            SET estoque_atual = GREATEST(estoque_atual - ?, 0),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [quantidade, epiId]);

        const [rows] = await pool.query(`
            SELECT e.*, p.nome AS epi_nome, p.ca_numero
            FROM cipa_epi_entregas e
            JOIN cipa_epis p ON p.id = e.epi_id
            WHERE e.id = ?
        `, [result.insertId]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'criar',
            entidade: 'epi_entrega',
            entidadeId: result.insertId,
            descricao: `Registrou entrega de EPI #${epiId}`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar entrega EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao registrar entrega.' });
    }
});

router.put('/api/cipa/entregas/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT * FROM cipa_epi_entregas WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Entrega não encontrada.' });
        const atual = atuais[0];

        const status = String(req.body.status || atual.status).trim() || 'Em uso';
        const dataDevolucao = normalizeDate(req.body.data_devolucao);

        await pool.query(`
            UPDATE cipa_epi_entregas SET
                funcionario_id = ?, funcionario_nome = ?, quantidade = ?,
                data_entrega = ?, data_validade = ?, data_devolucao = ?,
                motivo = ?, status = ?, observacoes = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            req.body.funcionario_id ? toInt(req.body.funcionario_id, null) : null,
            String(req.body.funcionario_nome || '').trim() || null,
            Math.max(1, toInt(req.body.quantidade, atual.quantidade || 1)),
            normalizeDate(req.body.data_entrega) || atual.data_entrega,
            normalizeDate(req.body.data_validade),
            dataDevolucao,
            String(req.body.motivo || atual.motivo || 'Entrega').trim(),
            status,
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        // Devolve ao estoque se mudou para Devolvido
        if (atual.status === 'Em uso' && status === 'Devolvido') {
            await pool.query(`
                UPDATE cipa_epis
                SET estoque_atual = estoque_atual + ?,
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [atual.quantidade || 1, atual.epi_id]);
        }

        const [rows] = await pool.query(`
            SELECT e.*, p.nome AS epi_nome, p.ca_numero
            FROM cipa_epi_entregas e
            JOIN cipa_epis p ON p.id = e.epi_id
            WHERE e.id = ?
        `, [id]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'editar',
            entidade: 'epi_entrega',
            entidadeId: id,
            descricao: `Alterou entrega de EPI #${id}`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar entrega EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar entrega.' });
    }
});

router.delete('/api/cipa/entregas/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        await pool.query('DELETE FROM cipa_epi_entregas WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'excluir',
            entidade: 'epi_entrega',
            entidadeId: req.params.id,
            descricao: `Excluiu entrega de EPI #${req.params.id}`,
        });
        res.json({ message: 'Entrega excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir entrega EPI', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir entrega.' });
    }
});

/* ---------- Equipamentos ---------- */
router.get('/api/cipa/equipamentos', async (_req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT * FROM cipa_equipamentos
            ORDER BY nome ASC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar equipamentos', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar equipamentos.' });
    }
});

router.post('/api/cipa/equipamentos', async (req, res) => {
    try {
        await ensureCipaTables();
        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome do equipamento.' });

        const statusAllowed = ['Operacional', 'Em manutenção', 'Inativo'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : 'Operacional';

        const [result] = await pool.query(`
            INSERT INTO cipa_equipamentos (
                nome, tag_patrimonio, tipo, setor, local_uso, fabricante, modelo,
                data_aquisicao, proxima_manutencao, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            nome,
            String(req.body.tag_patrimonio || '').trim() || null,
            String(req.body.tipo || '').trim() || null,
            String(req.body.setor || '').trim() || null,
            String(req.body.local_uso || '').trim() || null,
            String(req.body.fabricante || '').trim() || null,
            String(req.body.modelo || '').trim() || null,
            normalizeDate(req.body.data_aquisicao),
            normalizeDate(req.body.proxima_manutencao),
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        const [rows] = await pool.query('SELECT * FROM cipa_equipamentos WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'criar',
            entidade: 'equipamento',
            entidadeId: result.insertId,
            descricao: `Criou equipamento "${nome}"`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar equipamento', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao criar equipamento.' });
    }
});

router.put('/api/cipa/equipamentos/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id FROM cipa_equipamentos WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Equipamento não encontrado.' });

        const nome = String(req.body.nome || '').trim();
        if (!nome) return res.status(400).json({ message: 'Informe o nome do equipamento.' });

        const statusAllowed = ['Operacional', 'Em manutenção', 'Inativo'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : 'Operacional';

        await pool.query(`
            UPDATE cipa_equipamentos SET
                nome = ?, tag_patrimonio = ?, tipo = ?, setor = ?, local_uso = ?,
                fabricante = ?, modelo = ?, data_aquisicao = ?, proxima_manutencao = ?,
                status = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            nome,
            String(req.body.tag_patrimonio || '').trim() || null,
            String(req.body.tipo || '').trim() || null,
            String(req.body.setor || '').trim() || null,
            String(req.body.local_uso || '').trim() || null,
            String(req.body.fabricante || '').trim() || null,
            String(req.body.modelo || '').trim() || null,
            normalizeDate(req.body.data_aquisicao),
            normalizeDate(req.body.proxima_manutencao),
            status,
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        const [rows] = await pool.query('SELECT * FROM cipa_equipamentos WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'editar',
            entidade: 'equipamento',
            entidadeId: id,
            descricao: `Alterou equipamento "${nome}"`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar equipamento', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar equipamento.' });
    }
});

router.delete('/api/cipa/equipamentos/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const [used] = await pool.query(
            'SELECT id FROM cipa_manutencoes WHERE equipamento_id = ? LIMIT 1',
            [req.params.id]
        );
        if (used.length) {
            return res.status(400).json({ message: 'Equipamento possui manutenções. Inative-o em vez de excluir.' });
        }
        await pool.query('DELETE FROM cipa_equipamentos WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'cipa',
            acao: 'excluir',
            entidade: 'equipamento',
            entidadeId: req.params.id,
            descricao: `Excluiu equipamento #${req.params.id}`,
        });
        res.json({ message: 'Equipamento excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir equipamento', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir equipamento.' });
    }
});

/* ---------- Manutenções ---------- */
router.get('/api/cipa/manutencoes', async (_req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT m.*, eq.nome AS equipamento_nome, eq.tag_patrimonio
            FROM cipa_manutencoes m
            JOIN cipa_equipamentos eq ON eq.id = m.equipamento_id
            ORDER BY COALESCE(m.data_agendada, m.data_realizada) DESC, m.id DESC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar manutenções', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar manutenções.' });
    }
});

router.post('/api/cipa/manutencoes', async (req, res) => {
    try {
        await ensureCipaTables();
        const equipamentoId = toInt(req.body.equipamento_id, 0);
        if (!equipamentoId) return res.status(400).json({ message: 'Selecione o equipamento.' });

        const [eq] = await pool.query('SELECT id FROM cipa_equipamentos WHERE id = ?', [equipamentoId]);
        if (!eq.length) return res.status(404).json({ message: 'Equipamento não encontrado.' });

        const statusAllowed = ['Agendada', 'Concluída', 'Atrasada'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : 'Agendada';
        const proximoPrazo = normalizeDate(req.body.proximo_prazo);

        const [result] = await pool.query(`
            INSERT INTO cipa_manutencoes (
                equipamento_id, tipo, data_agendada, data_realizada, responsavel,
                custo, descricao, proximo_prazo, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            equipamentoId,
            String(req.body.tipo || 'Preventiva').trim() || 'Preventiva',
            normalizeDate(req.body.data_agendada),
            normalizeDate(req.body.data_realizada),
            String(req.body.responsavel || '').trim() || null,
            toMoney(req.body.custo, 0),
            String(req.body.descricao || '').trim() || null,
            proximoPrazo,
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        if (proximoPrazo) {
            await pool.query(`
                UPDATE cipa_equipamentos
                SET proxima_manutencao = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [proximoPrazo, equipamentoId]);
        }
        if (status === 'Concluída') {
            await pool.query(`
                UPDATE cipa_equipamentos
                SET status = 'Operacional', atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [equipamentoId]);
        } else if (status === 'Agendada' || status === 'Atrasada') {
            await pool.query(`
                UPDATE cipa_equipamentos
                SET status = 'Em manutenção', atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ? AND status = 'Operacional'
            `, [equipamentoId]);
        }

        const [rows] = await pool.query(`
            SELECT m.*, eq.nome AS equipamento_nome, eq.tag_patrimonio
            FROM cipa_manutencoes m
            JOIN cipa_equipamentos eq ON eq.id = m.equipamento_id
            WHERE m.id = ?
        `, [result.insertId]);
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar manutenção', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao registrar manutenção.' });
    }
});

router.put('/api/cipa/manutencoes/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT * FROM cipa_manutencoes WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Manutenção não encontrada.' });

        const statusAllowed = ['Agendada', 'Concluída', 'Atrasada'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : atuais[0].status;
        const proximoPrazo = normalizeDate(req.body.proximo_prazo);
        const equipamentoId = toInt(req.body.equipamento_id, atuais[0].equipamento_id);

        await pool.query(`
            UPDATE cipa_manutencoes SET
                equipamento_id = ?, tipo = ?, data_agendada = ?, data_realizada = ?,
                responsavel = ?, custo = ?, descricao = ?, proximo_prazo = ?,
                status = ?, observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            equipamentoId,
            String(req.body.tipo || atuais[0].tipo || 'Preventiva').trim(),
            normalizeDate(req.body.data_agendada),
            normalizeDate(req.body.data_realizada),
            String(req.body.responsavel || '').trim() || null,
            toMoney(req.body.custo, atuais[0].custo || 0),
            String(req.body.descricao || '').trim() || null,
            proximoPrazo,
            status,
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        if (proximoPrazo) {
            await pool.query(`
                UPDATE cipa_equipamentos
                SET proxima_manutencao = ?, atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [proximoPrazo, equipamentoId]);
        }
        if (status === 'Concluída') {
            await pool.query(`
                UPDATE cipa_equipamentos
                SET status = 'Operacional', atualizado_em = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [equipamentoId]);
        }

        const [rows] = await pool.query(`
            SELECT m.*, eq.nome AS equipamento_nome, eq.tag_patrimonio
            FROM cipa_manutencoes m
            JOIN cipa_equipamentos eq ON eq.id = m.equipamento_id
            WHERE m.id = ?
        `, [id]);
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar manutenção', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar manutenção.' });
    }
});

router.delete('/api/cipa/manutencoes/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        await pool.query('DELETE FROM cipa_manutencoes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Manutenção excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir manutenção', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir manutenção.' });
    }
});

/* ---------- Acidentes ---------- */
router.post('/api/cipa/acidentes/upload-foto', (req, res) => {
    uploadFoto.single('imagem')(req, res, (error) => {
        if (error) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'A imagem deve ter no máximo 5 MB.'
                : (error.message || 'Erro ao enviar imagem.');
            return res.status(400).json({ message });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhuma imagem enviada.' });
        }
        return res.status(201).json({
            imagem_url: `/image/Cipa/uploads/${req.file.filename}`,
            message: 'Foto enviada com sucesso.',
        });
    });
});

router.get('/api/cipa/acidentes', async (_req, res) => {
    try {
        await ensureCipaTables();
        const [rows] = await pool.query(`
            SELECT * FROM cipa_acidentes
            ORDER BY data_ocorrencia DESC, id DESC
        `);
        res.json(rows.map((row) => ({ ...row, fotos: parseFotos(row.fotos) })));
    } catch (error) {
        logger.error('Erro ao listar acidentes', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar acidentes.' });
    }
});

router.post('/api/cipa/acidentes', async (req, res) => {
    try {
        await ensureCipaTables();
        const dataOcorrencia = normalizeDate(req.body.data_ocorrencia);
        if (!dataOcorrencia) return res.status(400).json({ message: 'Informe a data da ocorrência.' });

        const statusAllowed = ['Aberto', 'Em análise', 'Encerrado'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : 'Aberto';
        const fotos = parseFotos(req.body.fotos);

        const [result] = await pool.query(`
            INSERT INTO cipa_acidentes (
                funcionario_id, funcionario_nome, data_ocorrencia, hora_ocorrencia,
                setor, local_ocorrencia, tipo, gravidade, descricao, partes_corpo,
                testemunhas, cat_emitida, numero_cat, dias_afastamento, status,
                medidas_corretivas, observacoes, fotos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb)
        `, [
            req.body.funcionario_id ? toInt(req.body.funcionario_id, null) : null,
            String(req.body.funcionario_nome || '').trim() || null,
            dataOcorrencia,
            String(req.body.hora_ocorrencia || '').trim() || null,
            String(req.body.setor || '').trim() || null,
            String(req.body.local_ocorrencia || '').trim() || null,
            String(req.body.tipo || 'Típico').trim() || 'Típico',
            String(req.body.gravidade || 'Leve').trim() || 'Leve',
            String(req.body.descricao || '').trim() || null,
            String(req.body.partes_corpo || '').trim() || null,
            String(req.body.testemunhas || '').trim() || null,
            Boolean(req.body.cat_emitida),
            String(req.body.numero_cat || '').trim() || null,
            Math.max(0, toInt(req.body.dias_afastamento, 0)),
            status,
            String(req.body.medidas_corretivas || '').trim() || null,
            String(req.body.observacoes || '').trim() || null,
            JSON.stringify(fotos),
        ]);

        const [rows] = await pool.query('SELECT * FROM cipa_acidentes WHERE id = ?', [result.insertId]);
        res.status(201).json({ ...rows[0], fotos: parseFotos(rows[0].fotos) });
    } catch (error) {
        logger.error('Erro ao criar acidente', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao registrar acidente.' });
    }
});

router.put('/api/cipa/acidentes/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT id FROM cipa_acidentes WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Acidente não encontrado.' });

        const dataOcorrencia = normalizeDate(req.body.data_ocorrencia);
        if (!dataOcorrencia) return res.status(400).json({ message: 'Informe a data da ocorrência.' });

        const statusAllowed = ['Aberto', 'Em análise', 'Encerrado'];
        const status = statusAllowed.includes(req.body.status) ? req.body.status : 'Aberto';
        const fotos = parseFotos(req.body.fotos);

        await pool.query(`
            UPDATE cipa_acidentes SET
                funcionario_id = ?, funcionario_nome = ?, data_ocorrencia = ?, hora_ocorrencia = ?,
                setor = ?, local_ocorrencia = ?, tipo = ?, gravidade = ?, descricao = ?,
                partes_corpo = ?, testemunhas = ?, cat_emitida = ?, numero_cat = ?,
                dias_afastamento = ?, status = ?, medidas_corretivas = ?, observacoes = ?,
                fotos = ?::jsonb,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            req.body.funcionario_id ? toInt(req.body.funcionario_id, null) : null,
            String(req.body.funcionario_nome || '').trim() || null,
            dataOcorrencia,
            String(req.body.hora_ocorrencia || '').trim() || null,
            String(req.body.setor || '').trim() || null,
            String(req.body.local_ocorrencia || '').trim() || null,
            String(req.body.tipo || 'Típico').trim() || 'Típico',
            String(req.body.gravidade || 'Leve').trim() || 'Leve',
            String(req.body.descricao || '').trim() || null,
            String(req.body.partes_corpo || '').trim() || null,
            String(req.body.testemunhas || '').trim() || null,
            Boolean(req.body.cat_emitida),
            String(req.body.numero_cat || '').trim() || null,
            Math.max(0, toInt(req.body.dias_afastamento, 0)),
            status,
            String(req.body.medidas_corretivas || '').trim() || null,
            String(req.body.observacoes || '').trim() || null,
            JSON.stringify(fotos),
            id,
        ]);

        const [rows] = await pool.query('SELECT * FROM cipa_acidentes WHERE id = ?', [id]);
        res.json({ ...rows[0], fotos: parseFotos(rows[0].fotos) });
    } catch (error) {
        logger.error('Erro ao atualizar acidente', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar acidente.' });
    }
});

router.delete('/api/cipa/acidentes/:id', async (req, res) => {
    try {
        await ensureCipaTables();
        await pool.query('DELETE FROM cipa_acidentes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Acidente excluído.' });
    } catch (error) {
        logger.error('Erro ao excluir acidente', { module: 'cipaRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir acidente.' });
    }
});

module.exports = router;
