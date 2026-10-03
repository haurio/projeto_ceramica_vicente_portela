const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

const AUSENCIA_TIPOS = [
    'Férias',
    'Acidente De Trabalho',
    'Aleitamento',
    'Baixa médica',
    'Casamento',
    'Outro Assuntos Pessoais- Dia',
    'Ausências justificadas- Dias',
    'Dia aniversário',
    'Falecimento Familiar',
    'Falta Injustificada- Dias',
    'Falta injustificada - Horas',
    'Gravidez De Risco',
    'Ausência Justificada- Horas',
    'Outros Assuntos Pessoais- Horas',
    'Ida ao médico',
    'Isolamento Profilático',
    'Licença parental',
    'Maternidade',
    'Paternidade',
    'Tolerância de Ponto',
];

const AUSENCIA_STATUS = ['Registrada', 'Justificada', 'Não Justificada', 'Cancelada'];

const TIPOS_COM_COMPROVACAO = [
    'Acidente De Trabalho',
    'Aleitamento',
    'Baixa médica',
    'Casamento',
    'Ausências justificadas- Dias',
    'Falecimento Familiar',
    'Gravidez De Risco',
    'Ausência Justificada- Horas',
    'Ida ao médico',
    'Isolamento Profilático',
    'Licença parental',
    'Maternidade',
    'Paternidade',
];

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'ausencias');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.pdf';
        const safeExt = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.pdf';
        const stamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        cb(null, `ausencia-${stamp}-${random}${safeExt}`);
    },
});

const uploadComprovacao = multer({
    storage: fileStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
        ];
        if (!allowed.includes(file.mimetype)) {
            cb(new Error('Envie PDF ou imagem (JPG, PNG, WEBP).'));
            return;
        }
        cb(null, true);
    },
});

let schemaReady = false;

function pad2(value) {
    return String(value).padStart(2, '0');
}

function toDateOnly(value) {
    if (!value) return null;

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        return new Date(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
    }

    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return new Date(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
}

function toIsoDate(value) {
    const date = toDateOnly(value);
    if (!date) return null;
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function daysBetweenInclusive(start, end) {
    const startDate = toDateOnly(start);
    const endDate = toDateOnly(end);
    if (!startDate || !endDate || endDate < startDate) return 0;
    return Math.floor((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1;
}

function addYears(date, years) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setFullYear(next.getFullYear() + years);
    return next;
}

function addDays(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
}

function sameIsoDay(a, b) {
    return toIsoDate(a) === toIsoDate(b);
}

async function ensureAusenciasSchema(client) {
    if (schemaReady) return;

    try {
        await client.query(`ALTER TABLE ausencias ADD COLUMN IF NOT EXISTS comprovacao_url TEXT`);
    } catch (error) {
        logger.warn('Coluna comprovacao_url', { module: 'ausenciasRoutes', error: error.message });
    }

    try {
        await client.query(`ALTER TABLE ausencias ADD COLUMN IF NOT EXISTS ferias_id INT`);
    } catch (error) {
        logger.warn('Coluna ferias_id', { module: 'ausenciasRoutes', error: error.message });
    }

    try {
        await client.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ausencias_ferias_id'
                ) THEN
                    ALTER TABLE ausencias
                        ADD CONSTRAINT fk_ausencias_ferias_id
                        FOREIGN KEY (ferias_id) REFERENCES ferias(id)
                        ON DELETE SET NULL ON UPDATE CASCADE;
                END IF;
            END $$;
        `);
    } catch (error) {
        logger.warn('Constraint ferias_id em ausências não aplicada', {
            module: 'ausenciasRoutes',
            error: error.message,
        });
    }

    schemaReady = true;
}

function normalizeRow(row) {
    if (!row) return row;
    const dataInicio = toIsoDate(row.data_inicio);
    const dataFim = toIsoDate(row.data_fim) || dataInicio;
    return {
        ...row,
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias: daysBetweenInclusive(dataInicio, dataFim),
        exige_comprovacao: TIPOS_COM_COMPROVACAO.includes(row.tipo),
    };
}

function validatePayload(body) {
    const funcionarioId = Number(body.funcionario_id);
    const tipo = String(body.tipo || '').trim();
    const dataInicio = toIsoDate(body.data_inicio);
    const dataFim = toIsoDate(body.data_fim) || dataInicio;
    const status = String(body.status || 'Registrada').trim();
    const justificativa = body.justificativa ? String(body.justificativa).trim() : null;
    const comprovacaoUrl = body.comprovacao_url ? String(body.comprovacao_url).trim() : null;

    if (!funcionarioId) {
        return { error: 'Funcionário é obrigatório.' };
    }
    if (!tipo || !AUSENCIA_TIPOS.includes(tipo)) {
        return { error: 'Tipo de ausência inválido.' };
    }
    if (!dataInicio) {
        return { error: 'Data de início é obrigatória.' };
    }
    if (!dataFim || toDateOnly(dataFim) < toDateOnly(dataInicio)) {
        return { error: 'A data de fim deve ser posterior ou igual à data de início.' };
    }
    if (!AUSENCIA_STATUS.includes(status)) {
        return { error: 'Status de ausência inválido.' };
    }
    if (TIPOS_COM_COMPROVACAO.includes(tipo) && !comprovacaoUrl && status !== 'Cancelada') {
        return { error: 'Este tipo de ausência exige anexo de comprovação.' };
    }

    return {
        payload: {
            funcionario_id: funcionarioId,
            tipo,
            data_inicio: dataInicio,
            data_fim: dataFim,
            justificativa,
            status,
            comprovacao_url: comprovacaoUrl,
        },
    };
}

function resolveFeriasStatus(dataInicio, dataFim, ausenciaStatus) {
    if (ausenciaStatus === 'Cancelada') return 'Cancelada';

    const today = toDateOnly(new Date());
    const start = toDateOnly(dataInicio);
    const end = toDateOnly(dataFim) || start;

    if (start && end && start <= today && end >= today) return 'Em Andamento';
    if (end && end < today) return 'Concluída';
    return 'Planejada';
}

async function resolvePeriodoAquisitivo(client, funcionarioId, dataInicio) {
    const [funcionarioRows] = await client.query(
        `SELECT data_admissao FROM funcionarios WHERE id = ?`,
        [funcionarioId]
    );

    if (!funcionarioRows.length || !funcionarioRows[0].data_admissao) {
        throw new Error('Funcionário sem data de admissão para gerar férias.');
    }

    const [feriasExistentes] = await client.query(
        `SELECT periodo_aquisitivo_inicio, status
         FROM ferias
         WHERE funcionario_id = ? AND status != 'Cancelada'
         ORDER BY periodo_aquisitivo_inicio ASC`,
        [funcionarioId]
    );

    const admission = toDateOnly(funcionarioRows[0].data_admissao);
    const target = toDateOnly(dataInicio) || toDateOnly(new Date());
    let cursor = new Date(admission.getFullYear(), admission.getMonth(), admission.getDate());

    while (addYears(cursor, 1) <= target) {
        const periodoInicio = new Date(cursor);
        const periodoFim = addDays(addYears(periodoInicio, 1), -1);
        const used = (feriasExistentes || []).some((item) => (
            sameIsoDay(item.periodo_aquisitivo_inicio, periodoInicio)
            && item.status !== 'Cancelada'
        ));

        if (!used && periodoFim < target) {
            return {
                periodo_aquisitivo_inicio: toIsoDate(periodoInicio),
                periodo_aquisitivo_fim: toIsoDate(periodoFim),
            };
        }

        cursor = addDays(periodoFim, 1);
    }

    const periodoInicio = new Date(cursor);
    const periodoFim = addDays(addYears(periodoInicio, 1), -1);
    return {
        periodo_aquisitivo_inicio: toIsoDate(periodoInicio),
        periodo_aquisitivo_fim: toIsoDate(periodoFim),
    };
}

async function syncFeriasFromAusencia(client, payload, existingFeriasId = null) {
    if (payload.tipo !== 'Férias') {
        if (existingFeriasId && payload.status === 'Cancelada') {
            await client.query(
                `UPDATE ferias SET status = 'Cancelada', motivo = ? WHERE id = ?`,
                [payload.justificativa || 'Cancelada via ausência', existingFeriasId]
            );
        }
        return existingFeriasId;
    }

    const periodo = await resolvePeriodoAquisitivo(client, payload.funcionario_id, payload.data_inicio);
    const dias = Math.max(15, Math.min(30, daysBetweenInclusive(payload.data_inicio, payload.data_fim) || 30));
    const status = resolveFeriasStatus(payload.data_inicio, payload.data_fim, payload.status);
    const motivo = payload.justificativa || 'Registrada automaticamente via Ausências';

    if (existingFeriasId) {
        await client.query(
            `UPDATE ferias
             SET funcionario_id = ?, periodo_aquisitivo_inicio = ?, periodo_aquisitivo_fim = ?,
                 data_inicio = ?, data_fim = ?, dias_concedidos = ?, status = ?, motivo = ?
             WHERE id = ?`,
            [
                payload.funcionario_id,
                periodo.periodo_aquisitivo_inicio,
                periodo.periodo_aquisitivo_fim,
                payload.data_inicio,
                payload.data_fim,
                dias,
                status,
                motivo,
                existingFeriasId,
            ]
        );
        return existingFeriasId;
    }

    const [result] = await client.query(
        `INSERT INTO ferias
            (funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim, data_inicio, data_fim, dias_concedidos, status, motivo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            payload.funcionario_id,
            periodo.periodo_aquisitivo_inicio,
            periodo.periodo_aquisitivo_fim,
            payload.data_inicio,
            payload.data_fim,
            dias,
            status,
            motivo,
        ]
    );

    return result.insertId;
}

router.post('/upload-comprovacao', (req, res) => {
    uploadComprovacao.single('arquivo')(req, res, (error) => {
        if (error) {
            const message = error.code === 'LIMIT_FILE_SIZE'
                ? 'O arquivo deve ter no máximo 8 MB.'
                : (error.message || 'Erro ao enviar comprovação.');
            return res.status(400).json({ message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
        }

        const relativePath = `/uploads/ausencias/${req.file.filename}`;
        return res.status(201).json({
            comprovacao_url: relativePath,
            message: 'Comprovação enviada com sucesso.',
        });
    });
});

router.get('/meta', (req, res) => {
    res.json({
        tipos: AUSENCIA_TIPOS,
        status: AUSENCIA_STATUS,
        tipos_com_comprovacao: TIPOS_COM_COMPROVACAO,
    });
});

router.get('/', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await ensureAusenciasSchema(client);

        const [rows] = await client.query(`
            SELECT
                a.id,
                a.funcionario_id,
                a.tipo,
                a.data_inicio,
                a.data_fim,
                a.justificativa,
                a.status,
                a.comprovacao_url,
                a.ferias_id,
                a.created_at,
                a.updated_at,
                a.created_by,
                fn.nome AS funcionario_nome
            FROM ausencias a
            JOIN funcionarios fn ON a.funcionario_id = fn.id
            ORDER BY a.data_inicio DESC, fn.nome ASC
        `);

        res.json((rows || []).map(normalizeRow));
    } catch (error) {
        logger.error('Erro ao listar ausências', { module: 'ausenciasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao listar ausências', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.get('/:id', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await ensureAusenciasSchema(client);

        const [rows] = await client.query(`
            SELECT
                a.id,
                a.funcionario_id,
                a.tipo,
                a.data_inicio,
                a.data_fim,
                a.justificativa,
                a.status,
                a.comprovacao_url,
                a.ferias_id,
                a.created_at,
                a.updated_at,
                a.created_by,
                fn.nome AS funcionario_nome
            FROM ausencias a
            JOIN funcionarios fn ON a.funcionario_id = fn.id
            WHERE a.id = ?
        `, [req.params.id]);

        if (!rows.length) {
            return res.status(404).json({ message: 'Ausência não encontrada' });
        }

        res.json(normalizeRow(rows[0]));
    } catch (error) {
        logger.error('Erro ao obter ausência', { module: 'ausenciasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao obter ausência', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.post('/', async (req, res) => {
    const validated = validatePayload(req.body);
    if (validated.error) {
        return res.status(400).json({ message: validated.error });
    }

    let client;
    try {
        client = await pool.getConnection();
        await ensureAusenciasSchema(client);
        await client.beginTransaction();

        const createdBy = req.session?.user?.id || null;
        const { payload } = validated;
        const feriasId = await syncFeriasFromAusencia(client, payload, null);

        const [result] = await client.query(
            `INSERT INTO ausencias
                (funcionario_id, tipo, data_inicio, data_fim, justificativa, status, created_by, comprovacao_url, ferias_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                payload.funcionario_id,
                payload.tipo,
                payload.data_inicio,
                payload.data_fim,
                payload.justificativa,
                payload.status,
                createdBy,
                payload.comprovacao_url,
                feriasId || null,
            ]
        );

        await client.commit();
        await logAuditoria(req, {
            modulo: 'ausencias',
            acao: 'criar',
            entidade: 'ausencia',
            entidadeId: result.insertId,
            descricao: `Registrou ausência (${payload.tipo})`,
        });
        res.status(201).json({
            message: payload.tipo === 'Férias'
                ? 'Ausência e férias registradas com sucesso'
                : 'Ausência registrada com sucesso',
            id: result.insertId,
            ferias_id: feriasId || null,
        });
    } catch (error) {
        if (client) await client.rollback();
        logger.error('Erro ao registrar ausência', { module: 'ausenciasRoutes', error: error.message });
        res.status(500).json({ message: error.message || 'Erro ao registrar ausência' });
    } finally {
        if (client) client.release();
    }
});

router.put('/:id', async (req, res) => {
    const validated = validatePayload(req.body);
    if (validated.error) {
        return res.status(400).json({ message: validated.error });
    }

    let client;
    try {
        client = await pool.getConnection();
        await ensureAusenciasSchema(client);
        await client.beginTransaction();

        const { payload } = validated;
        const [existing] = await client.query(
            'SELECT id, ferias_id, comprovacao_url FROM ausencias WHERE id = ?',
            [req.params.id]
        );

        if (!existing.length) {
            await client.rollback();
            return res.status(404).json({ message: 'Ausência não encontrada' });
        }

        const comprovacaoUrl = payload.comprovacao_url || existing[0].comprovacao_url || null;
        if (TIPOS_COM_COMPROVACAO.includes(payload.tipo) && !comprovacaoUrl && payload.status !== 'Cancelada') {
            await client.rollback();
            return res.status(400).json({ message: 'Este tipo de ausência exige anexo de comprovação.' });
        }

        const feriasId = await syncFeriasFromAusencia(client, {
            ...payload,
            comprovacao_url: comprovacaoUrl,
        }, existing[0].ferias_id || null);

        await client.query(
            `UPDATE ausencias
             SET funcionario_id = ?, tipo = ?, data_inicio = ?, data_fim = ?, justificativa = ?,
                 status = ?, comprovacao_url = ?, ferias_id = ?
             WHERE id = ?`,
            [
                payload.funcionario_id,
                payload.tipo,
                payload.data_inicio,
                payload.data_fim,
                payload.justificativa,
                payload.status,
                comprovacaoUrl,
                feriasId || null,
                req.params.id,
            ]
        );

        await client.commit();
        await logAuditoria(req, {
            modulo: 'ausencias',
            acao: 'editar',
            entidade: 'ausencia',
            entidadeId: req.params.id,
            descricao: `Alterou ausência #${req.params.id}`,
        });
        res.json({
            message: payload.tipo === 'Férias'
                ? 'Ausência e férias atualizadas com sucesso'
                : 'Ausência atualizada com sucesso',
            ferias_id: feriasId || null,
        });
    } catch (error) {
        if (client) await client.rollback();
        logger.error('Erro ao atualizar ausência', { module: 'ausenciasRoutes', error: error.message });
        res.status(500).json({ message: error.message || 'Erro ao atualizar ausência' });
    } finally {
        if (client) client.release();
    }
});

router.delete('/:id', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await ensureAusenciasSchema(client);

        const [existing] = await client.query(
            'SELECT id, ferias_id FROM ausencias WHERE id = ?',
            [req.params.id]
        );
        if (!existing.length) {
            return res.status(404).json({ message: 'Ausência não encontrada' });
        }

        await client.beginTransaction();

        if (existing[0].ferias_id) {
            await client.query(
                `UPDATE ferias SET status = 'Cancelada', motivo = 'Ausência excluída' WHERE id = ?`,
                [existing[0].ferias_id]
            );
        }

        await client.query('DELETE FROM ausencias WHERE id = ?', [req.params.id]);
        await client.commit();
        await logAuditoria(req, {
            modulo: 'ausencias',
            acao: 'excluir',
            entidade: 'ausencia',
            entidadeId: req.params.id,
            descricao: `Excluiu ausência #${req.params.id}`,
        });
        res.json({ message: 'Ausência excluída com sucesso' });
    } catch (error) {
        if (client) await client.rollback();
        logger.error('Erro ao excluir ausência', { module: 'ausenciasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao excluir ausência', error: error.message });
    } finally {
        if (client) client.release();
    }
});

module.exports = router;
