const express = require('express');
const router = express.Router();
const pool = require('../db');
const logger = require('../utils/logger');

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
                DATEDIFF(f.periodo_aquisitivo_fim, CURDATE()) AS dias_restantes_concessivo,
                CASE 
                    WHEN f.status = 'Concluída' THEN 0
                    WHEN f.periodo_aquisitivo_fim < CURDATE() THEN 
                        DATEDIFF(CURDATE(), f.periodo_aquisitivo_fim)
                    ELSE 0
                END AS dias_atrasados,
                CASE 
                    WHEN f.periodo_aquisitivo_fim >= CURDATE() AND f.status = 'Planejada' THEN DATEDIFF(f.data_inicio, CURDATE())
                    ELSE 0
                END AS dias_restantes
            FROM ferias f
            JOIN funcionarios fn ON f.funcionario_id = fn.id
            WHERE fn.status = 'Ativo' AND f.status != 'Cancelada'
        `);

        res.json(ferias);
    } catch (error) {
        logger.error('Erro ao obter férias', { module: 'feriasRoutes', error: error.message });
        res.status(500).json({ message: 'Erro ao obter férias', error: error.message });
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
            WHERE id = ? AND status = 'Ativo'
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

            let status = 'Planejada';
            let diasRestantes = 30;
            if (periodoExistente) {
                status = periodoExistente.status;
                const diasUsados = periodoExistente.data_fim && periodoExistente.data_inicio 
                    ? Math.ceil((new Date(periodoExistente.data_fim) - new Date(periodoExistente.data_inicio)) / (1000 * 60 * 60 * 24) + 1) 
                    : 0;
                diasRestantes = periodoExistente.dias_concedidos - diasUsados;
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
                status: 'Planejada',
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
    const { funcionario_id, periodo_aquisitivo_inicio, data_inicio, data_fim, dias_concedidos, status, motivo } = req.body;
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

        if (dias_concedidos < 15 || dias_concedidos > 30) {
            await client.rollback();
            return res.status(400).json({ message: 'Os dias concedidos devem estar entre 15 e 30 conforme a CLT' });
        }

        const [result] = await client.query(
            'INSERT INTO ferias (funcionario_id, periodo_aquisitivo_inicio, periodo_aquisitivo_fim, data_inicio, data_fim, dias_concedidos, status, motivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [funcionario_id, periodo_aquisitivo_inicio, periodoAquisitivoFim.toISOString().split('T')[0], data_inicio, data_fim, dias_concedidos, status || 'Planejada', motivo || null]
        );

        await client.commit();
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
    const { funcionario_id, periodo_aquisitivo_inicio, data_inicio, data_fim, dias_concedidos, status, motivo } = req.body;
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

        if (dias_concedidos < 15 || dias_concedidos > 30) {
            await client.rollback();
            return res.status(400).json({ message: 'Os dias concedidos devem estar entre 15 e 30 conforme a CLT' });
        }

        await client.query(
            'UPDATE ferias SET funcionario_id = ?, periodo_aquisitivo_inicio = ?, periodo_aquisitivo_fim = ?, data_inicio = ?, data_fim = ?, dias_concedidos = ?, status = ?, motivo = ? WHERE id = ?',
            [funcionario_id, periodo_aquisitivo_inicio, periodoAquisitivoFim.toISOString().split('T')[0], data_inicio, data_fim, dias_concedidos, status, motivo || null, id]
        );

        await client.commit();
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