const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');

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

function daysBetween(start, end) {
    const a = toDateOnly(start);
    const b = toDateOnly(end);
    if (!a || !b) return 0;
    return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function sameIsoDay(a, b) {
    return toIsoDate(a) === toIsoDate(b);
}

let examplesReadyPromise = null;

async function ensureFeriasExamples(client) {
    if (!examplesReadyPromise) {
        examplesReadyPromise = (async () => {
            await client.query(`
                INSERT INTO ferias (
                    funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
                    data_inicio, data_fim, dias_concedidos, status, motivo
                )
                SELECT 4, '2025-03-01', '2026-02-28', '2026-10-15', '2026-11-13', 30, 'Planejada', 'Exemplo: férias próximas'
                WHERE EXISTS (SELECT 1 FROM funcionarios WHERE id = 4)
                  AND NOT EXISTS (
                    SELECT 1 FROM ferias
                    WHERE funcionario_id = 4
                      AND periodo_aquisitivo_inicio = '2025-03-01'
                      AND status != 'Cancelada'
                  )
            `);

            await client.query(`
                INSERT INTO ferias (
                    funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
                    data_inicio, data_fim, dias_concedidos, status, motivo
                )
                SELECT 5, '2024-01-20', '2025-01-19', '2025-06-02', '2025-07-01', 30, 'Concluída', 'Exemplo: férias já tiradas'
                WHERE EXISTS (SELECT 1 FROM funcionarios WHERE id = 5)
                  AND NOT EXISTS (
                    SELECT 1 FROM ferias
                    WHERE funcionario_id = 5
                      AND periodo_aquisitivo_inicio = '2024-01-20'
                      AND status != 'Cancelada'
                  )
            `);

            await client.query(`
                INSERT INTO ferias (
                    funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim,
                    data_inicio, data_fim, dias_concedidos, status, motivo
                )
                SELECT 6, '2025-04-05', '2026-04-04', '2026-09-20', '2026-10-19', 30, 'Em Andamento', 'Exemplo: férias em andamento'
                WHERE EXISTS (SELECT 1 FROM funcionarios WHERE id = 6)
                  AND NOT EXISTS (
                    SELECT 1 FROM ferias
                    WHERE funcionario_id = 6
                      AND periodo_aquisitivo_inicio = '2025-04-05'
                      AND status != 'Cancelada'
                  )
            `);
        })().catch((error) => {
            examplesReadyPromise = null;
            throw error;
        });
    }

    return examplesReadyPromise;
}

function buildPendingPeriods(funcionario, feriasDoFuncionario, today) {
    const admission = toDateOnly(funcionario.data_admissao);
    if (!admission) return [];

    const items = [];
    let currentInicio = admission;
    const safetyLimit = 40;
    let loops = 0;

    while (loops < safetyLimit) {
        loops += 1;
        const aquisitivoInicio = currentInicio;
        const aquisitivoFim = addDays(addYears(aquisitivoInicio, 1), -1);
        const concessivoInicio = addDays(aquisitivoFim, 1);
        const concessivoFim = addDays(addYears(concessivoInicio, 1), -1);

        if (aquisitivoFim >= today) {
            break;
        }

        const registro = feriasDoFuncionario.find((item) => (
            sameIsoDay(item.periodo_aquisitivo_inicio, aquisitivoInicio)
            && item.status !== 'Cancelada'
        ));

        if (!registro) {
            const atrasado = today > concessivoFim;
            const diasAtrasados = atrasado ? Math.max(0, daysBetween(concessivoFim, today)) : 0;
            const diasParaVencer = atrasado ? 0 : Math.max(0, daysBetween(today, concessivoFim));

            items.push({
                virtual: true,
                ferias_id: null,
                funcionario_id: funcionario.id,
                funcionario_nome: funcionario.nome,
                periodo_aquisitivo_inicio: toIsoDate(aquisitivoInicio),
                periodo_aquisitivo_fim: toIsoDate(aquisitivoFim),
                concessivo_inicio: toIsoDate(concessivoInicio),
                concessivo_fim: toIsoDate(concessivoFim),
                data_inicio: null,
                data_fim: null,
                dias_concedidos: 30,
                status: atrasado ? 'Vencida' : 'Pendente',
                motivo: atrasado
                    ? 'Período concessivo encerrado e férias ainda não tiradas'
                    : 'Funcionário já pode / deve tirar férias neste período',
                dias_atrasados: diasAtrasados,
                dias_restantes: diasParaVencer,
                origem: 'automatico',
                grupo: atrasado ? 'vencidas' : 'pendentes',
            });
        }

        currentInicio = addDays(aquisitivoFim, 1);
    }

    return items;
}

function classifyRegistered(item, today) {
    const status = item.status;
    const inicio = toDateOnly(item.data_inicio);
    const fimAquisitivo = toDateOnly(item.periodo_aquisitivo_fim);
    const diasAtrasados = Number(item.dias_atrasados) || 0;

    if (status === 'Concluída') {
        return { ...item, grupo: 'tiradas', origem: 'registro' };
    }

    if (status === 'Em Andamento') {
        return { ...item, grupo: 'andamento', origem: 'registro' };
    }

    if (status === 'Atrasada' || status === 'Vencida' || (fimAquisitivo && fimAquisitivo < today && !['Concluída', 'Cancelada'].includes(status) && diasAtrasados > 0 && !inicio)) {
        return {
            ...item,
            status: status === 'Atrasada' ? 'Vencida' : status,
            grupo: 'vencidas',
            origem: 'registro',
        };
    }

    if (status === 'Planejada' && inicio) {
        const diasParaInicio = daysBetween(today, inicio);
        if (diasParaInicio >= 0 && diasParaInicio <= 30) {
            return {
                ...item,
                dias_restantes: diasParaInicio,
                grupo: 'proximas',
                origem: 'registro',
            };
        }
    }

    if (['Planejada', 'Abono Pecuniário'].includes(status)) {
        return { ...item, grupo: 'agendadas', origem: 'registro' };
    }

    if (fimAquisitivo && fimAquisitivo < today && !['Concluída', 'Cancelada'].includes(status)) {
        return {
            ...item,
            status: 'Vencida',
            dias_atrasados: Math.max(diasAtrasados, daysBetween(fimAquisitivo, today)),
            grupo: 'vencidas',
            origem: 'registro',
        };
    }

    return { ...item, grupo: 'agendadas', origem: 'registro' };
}

router.get('/', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        logger.info('Executando consulta para listar férias', { module: 'feriasRoutes' });

        const [ferias] = await client.query(`
            SELECT 
                f.id AS ferias_id,
                f.funcionario_id,
                f.periodo_aquisitivo_inicio,
                f.periodo_aquisitivo_fim,
                f.data_inicio,
                f.data_fim,
                f.dias_concedidos,
                f.status,
                f.motivo,
                f.criado_em,
                f.atualizado_em,
                fn.nome AS funcionario_nome,
                (f.periodo_aquisitivo_fim - CURRENT_DATE) AS dias_restantes_concessivo,
                CASE 
                    WHEN f.status = 'Concluída' THEN 0
                    WHEN f.periodo_aquisitivo_fim < CURRENT_DATE THEN 
                        (CURRENT_DATE - f.periodo_aquisitivo_fim)
                    ELSE 0
                END AS dias_atrasados,
                CASE 
                    WHEN f.periodo_aquisitivo_fim >= CURRENT_DATE AND f.status = 'Planejada' THEN (f.data_inicio - CURRENT_DATE)
                    ELSE 0
                END AS dias_restantes
            FROM ferias f
            JOIN funcionarios fn ON f.funcionario_id = fn.id
            WHERE LOWER(fn.status) = 'ativo' AND f.status != 'Cancelada'
        `);

        res.json(ferias);
    } catch (error) {
        logger.error('Erro ao obter férias', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao obter férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.get('/panorama', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        await ensureFeriasExamples(client);

        const today = toDateOnly(new Date());
        const yearFilter = req.query.ano ? Number(req.query.ano) : today.getFullYear();

        const [funcionarios] = await client.query(`
            SELECT id, nome, data_admissao
            FROM funcionarios
            WHERE LOWER(status) = 'ativo'
              AND data_admissao IS NOT NULL
            ORDER BY nome
        `);

        const [ferias] = await client.query(`
            SELECT 
                f.id AS ferias_id,
                f.funcionario_id,
                f.periodo_aquisitivo_inicio,
                f.periodo_aquisitivo_fim,
                f.data_inicio,
                f.data_fim,
                f.dias_concedidos,
                f.status,
                f.motivo,
                fn.nome AS funcionario_nome,
                CASE 
                    WHEN f.status IN ('Concluída') THEN 0
                    WHEN f.periodo_aquisitivo_fim < CURRENT_DATE THEN (CURRENT_DATE - f.periodo_aquisitivo_fim)
                    ELSE 0
                END AS dias_atrasados,
                CASE 
                    WHEN f.status = 'Planejada' AND f.data_inicio IS NOT NULL THEN (f.data_inicio - CURRENT_DATE)
                    ELSE 0
                END AS dias_restantes
            FROM ferias f
            JOIN funcionarios fn ON f.funcionario_id = fn.id
            WHERE LOWER(fn.status) = 'ativo'
              AND f.status != 'Cancelada'
            ORDER BY fn.nome, f.periodo_aquisitivo_inicio
        `);

        const feriasByEmployee = new Map();
        ferias.forEach((item) => {
            const list = feriasByEmployee.get(item.funcionario_id) || [];
            list.push({
                ...item,
                periodo_aquisitivo_inicio: toIsoDate(item.periodo_aquisitivo_inicio),
                periodo_aquisitivo_fim: toIsoDate(item.periodo_aquisitivo_fim),
                data_inicio: toIsoDate(item.data_inicio),
                data_fim: toIsoDate(item.data_fim),
                dias_atrasados: Number(item.dias_atrasados) || 0,
                dias_restantes: Number(item.dias_restantes) || 0,
            });
            feriasByEmployee.set(item.funcionario_id, list);
        });

        const automaticos = [];
        funcionarios.forEach((funcionario) => {
            const pending = buildPendingPeriods(
                funcionario,
                feriasByEmployee.get(funcionario.id) || [],
                today
            );
            automaticos.push(...pending);
        });

        const registrados = ferias.map((item) => classifyRegistered({
            ...item,
            periodo_aquisitivo_inicio: toIsoDate(item.periodo_aquisitivo_inicio),
            periodo_aquisitivo_fim: toIsoDate(item.periodo_aquisitivo_fim),
            data_inicio: toIsoDate(item.data_inicio),
            data_fim: toIsoDate(item.data_fim),
            dias_atrasados: Number(item.dias_atrasados) || 0,
            dias_restantes: Number(item.dias_restantes) || 0,
            virtual: false,
        }, today));

        const all = [...automaticos, ...registrados];

        const matchesYear = (item) => {
            if (!yearFilter) return true;
            const ref = toDateOnly(item.data_inicio)
                || toDateOnly(item.concessivo_fim)
                || toDateOnly(item.periodo_aquisitivo_fim)
                || toDateOnly(item.periodo_aquisitivo_inicio);
            return ref ? ref.getFullYear() === yearFilter : true;
        };

        const filtered = all.filter(matchesYear);

        const vencidas = filtered
            .filter((item) => item.grupo === 'vencidas')
            .sort((a, b) => (b.dias_atrasados || 0) - (a.dias_atrasados || 0));

        const pendentes = filtered
            .filter((item) => item.grupo === 'pendentes')
            .sort((a, b) => (a.dias_restantes || 0) - (b.dias_restantes || 0));

        const proximas = filtered
            .filter((item) => item.grupo === 'proximas')
            .sort((a, b) => (a.dias_restantes || 0) - (b.dias_restantes || 0));

        const andamento = filtered.filter((item) => item.grupo === 'andamento');
        const tiradas = filtered.filter((item) => item.grupo === 'tiradas');
        const agendadas = filtered.filter((item) => item.grupo === 'agendadas');

        const years = new Set([today.getFullYear()]);
        all.forEach((item) => {
            const ref = toDateOnly(item.data_inicio)
                || toDateOnly(item.concessivo_fim)
                || toDateOnly(item.periodo_aquisitivo_fim)
                || toDateOnly(item.periodo_aquisitivo_inicio);
            if (ref) years.add(ref.getFullYear());
        });

        res.json({
            ano: yearFilter,
            anos: [...years].sort((a, b) => b - a),
            summary: {
                vencidas: vencidas.length,
                pendentes: pendentes.length,
                proximas: proximas.length,
                andamento: andamento.length,
                tiradas: tiradas.length,
            },
            vencidas,
            pendentes,
            proximas,
            andamento,
            tiradas,
            agendadas,
        });
    } catch (error) {
        logger.error('Erro ao montar panorama de férias', { module: 'feriasRoutes', error: error.message, stack: error.stack });
        res.status(500).json({ message: 'Erro ao montar panorama de férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.get('/saldo', async (req, res) => {
    let client;
    try {
        const funcionarioId = req.query.funcionario_id;
        if (!funcionarioId) {
            return res.status(400).json({ message: 'funcionario_id é obrigatório' });
        }

        client = await pool.getConnection();
        logger.info('Executando consulta para saldo de férias', { module: 'feriasRoutes', funcionarioId });

        const [funcionario] = await client.query(`
            SELECT data_admissao 
            FROM funcionarios 
            WHERE id = ? AND LOWER(status) = 'ativo'
        `, [funcionarioId]);

        if (!funcionario.length) {
            return res.status(404).json({ message: 'Funcionário não encontrado ou inativo' });
        }

        const dataAdmissao = new Date(funcionario[0].data_admissao);
        const [feriasExistentes] = await client.query(`
            SELECT 
                periodo_aquisitivo_inicio,
                periodo_aquisitivo_fim,
                data_inicio,
                data_fim,
                dias_concedidos,
                status,
                motivo
            FROM ferias 
            WHERE funcionario_id = ? AND status != 'Cancelada'
            ORDER BY periodo_aquisitivo_inicio ASC
        `, [funcionarioId]);

        const periodosDisponiveis = [];
        const today = new Date();
        let currentInicio = new Date(dataAdmissao);

        // Gerar períodos aquisitivos sequenciais a partir da admissão
        while (currentInicio < today) {
            const currentFim = new Date(currentInicio);
            currentFim.setFullYear(currentFim.getFullYear() + 1);
            currentFim.setDate(currentFim.getDate() - 1);

            const periodoExistente = feriasExistentes.find(f => 
                new Date(f.periodo_aquisitivo_inicio).getTime() === currentInicio.getTime()
            );

            let status = 'Disponível';
            let diasRestantes = 30;
            if (periodoExistente) {
                status = periodoExistente.status;
                // Período já tirado ou já agendado não entra no dropdown de novos agendamentos
                if (['Concluída', 'Em Andamento', 'Planejada', 'Abono Pecuniário'].includes(status)) {
                    currentInicio = new Date(currentFim);
                    currentInicio.setDate(currentInicio.getDate() + 1);
                    continue;
                }
                const diasUsados = periodoExistente.data_fim && periodoExistente.data_inicio
                    ? Math.ceil((new Date(periodoExistente.data_fim) - new Date(periodoExistente.data_inicio)) / (1000 * 60 * 60 * 24) + 1)
                    : 0;
                diasRestantes = Math.max(0, Number(periodoExistente.dias_concedidos || 30) - diasUsados);
                if (currentFim < today && status !== 'Concluída') {
                    status = 'Atrasada';
                }
            }

            if (diasRestantes > 0) {
                periodosDisponiveis.push({
                    periodo_aquisitivo_inicio: currentInicio.toISOString().split('T')[0],
                    periodo_aquisitivo_fim: currentFim.toISOString().split('T')[0],
                    status,
                    dias_restantes: diasRestantes
                });
            }

            currentInicio = new Date(currentFim);
            currentInicio.setDate(currentInicio.getDate() + 1);
        }

        // Adicionar próximo período futuro se aplicável
        if (periodosDisponiveis.length === 0 || new Date(periodosDisponiveis[periodosDisponiveis.length - 1].periodo_aquisitivo_fim) < today) {
            const nextFim = new Date(currentInicio);
            nextFim.setFullYear(nextFim.getFullYear() + 1);
            nextFim.setDate(nextFim.getDate() - 1);
            periodosDisponiveis.push({
                periodo_aquisitivo_inicio: currentInicio.toISOString().split('T')[0],
                periodo_aquisitivo_fim: nextFim.toISOString().split('T')[0],
                status: 'Disponível',
                dias_restantes: 30
            });
        }

        res.json([{ funcionario_id: funcionarioId, periodos_disponiveis: periodosDisponiveis }]);
    } catch (error) {
        logger.error('Erro ao obter saldo de férias', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao obter saldo de férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.get('/:id', async (req, res) => {
    let client;
    try {
        client = await pool.getConnection();
        logger.info('Executando consulta para obter férias por ID', { module: 'feriasRoutes', id: req.params.id });
        const [rows] = await client.query(`
            SELECT f.*, fn.nome AS funcionario_nome 
            FROM ferias f 
            JOIN funcionarios fn ON f.funcionario_id = fn.id 
            WHERE f.id = ?
        `, [req.params.id]);
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ message: 'Férias não encontradas' });
        }
    } catch (error) {
        logger.error('Erro ao obter férias por ID', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao obter férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.post('/', async (req, res) => {
    const { funcionario_id, periodo_aquisitivo_inicio, data_inicio, data_fim, status, motivo } = req.body;
    let { dias_concedidos } = req.body;
    let client;
    try {
        client = await pool.getConnection();
        await client.beginTransaction();

        if (data_fim && new Date(data_fim) < new Date(data_inicio)) {
            await client.rollback();
            return res.status(400).json({ message: 'A data de fim deve ser posterior ou igual à data de início' });
        }

        const periodoAquisitivoFim = new Date(periodo_aquisitivo_inicio);
        periodoAquisitivoFim.setFullYear(periodoAquisitivoFim.getFullYear() + 1);
        periodoAquisitivoFim.setDate(periodoAquisitivoFim.getDate() - 1);

        if ((!dias_concedidos || Number(dias_concedidos) <= 0) && data_inicio && data_fim) {
            const start = new Date(data_inicio);
            const end = new Date(data_fim);
            dias_concedidos = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        dias_concedidos = Number(dias_concedidos) || 30;

        if (dias_concedidos < 15 || dias_concedidos > 30) {
            await client.rollback();
            return res.status(400).json({ message: 'Os dias concedidos devem estar entre 15 e 30 conforme a CLT' });
        }

        const [result] = await client.query(
            'INSERT INTO ferias (funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim, data_inicio, data_fim, dias_concedidos, status, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [funcionario_id, periodo_aquisitivo_inicio, periodoAquisitivoFim.toISOString().split('T')[0], data_inicio, data_fim, dias_concedidos, status || 'Planejada', motivo || null]
        );

        await client.commit();
        await logAuditoria(req, {
            modulo: 'ferias',
            acao: 'criar',
            entidade: 'ferias',
            entidadeId: result.insertId,
            descricao: `Registrou férias do funcionário #${funcionario_id}`,
        });
        res.json({ message: 'Férias registradas com sucesso', id: result.insertId });
    } catch (error) {
        if (client) await client.rollback();
        logger.error('Erro ao registrar férias', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao registrar férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { funcionario_id, periodo_aquisitivo_inicio, data_inicio, data_fim, status, motivo } = req.body;
    let { dias_concedidos } = req.body;
    let client;
    try {
        client = await pool.getConnection();
        await client.beginTransaction();

        if (data_fim && new Date(data_fim) < new Date(data_inicio)) {
            await client.rollback();
            return res.status(400).json({ message: 'A data de fim deve ser posterior ou igual à data de início' });
        }

        const periodoAquisitivoFim = new Date(periodo_aquisitivo_inicio);
        periodoAquisitivoFim.setFullYear(periodoAquisitivoFim.getFullYear() + 1);
        periodoAquisitivoFim.setDate(periodoAquisitivoFim.getDate() - 1);

        if ((!dias_concedidos || Number(dias_concedidos) <= 0) && data_inicio && data_fim) {
            const start = new Date(data_inicio);
            const end = new Date(data_fim);
            dias_concedidos = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        dias_concedidos = Number(dias_concedidos) || 30;

        if (dias_concedidos < 15 || dias_concedidos > 30) {
            await client.rollback();
            return res.status(400).json({ message: 'Os dias concedidos devem estar entre 15 e 30 conforme a CLT' });
        }

        await client.query(
            'UPDATE ferias SET funcionario_id = ?, periodo_aquisitivo_inicio = ?, periodo_aquisitivo_fim = ?, data_inicio = ?, data_fim = ?, dias_concedidos = ?, status = ?, motivo = ? WHERE id = ?',
            [funcionario_id, periodo_aquisitivo_inicio, periodoAquisitivoFim.toISOString().split('T')[0], data_inicio, data_fim, dias_concedidos, status, motivo || null, id]
        );

        await client.commit();
        await logAuditoria(req, {
            modulo: 'ferias',
            acao: 'editar',
            entidade: 'ferias',
            entidadeId: id,
            descricao: `Alterou férias #${id}`,
        });
        res.json({ message: 'Férias atualizadas com sucesso' });
    } catch (error) {
        if (client) await client.rollback();
        logger.error('Erro ao atualizar férias', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao atualizar férias', error: error.message });
    } finally {
        if (client) client.release();
    }
});

router.delete('/:id', async (req, res) => {
    res.status(405).json({ message: 'Método DELETE não permitido. Use PUT para cancelar férias.' });
});

module.exports = router;