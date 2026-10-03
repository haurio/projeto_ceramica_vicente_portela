const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

function toIsoDate(value = new Date()) {
    const d = value instanceof Date ? value : new Date(value);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function normalizeDate(value) {
    if (!value) return null;
    const raw = String(value).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function monthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    return {
        inicio: toIsoDate(new Date(year, month, 1)),
        fim: toIsoDate(new Date(year, month + 1, 0)),
    };
}

function previousMonthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    return {
        inicio: toIsoDate(new Date(year, month - 1, 1)),
        fim: toIsoDate(new Date(year, month, 0)),
    };
}

function addDays(iso, days) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + days);
    return toIsoDate(d);
}

function daysBetween(inicio, fim) {
    const start = new Date(`${inicio}T12:00:00`);
    const end = new Date(`${fim}T12:00:00`);
    const diff = Math.round((end - start) / 86400000);
    return Math.max(0, diff);
}

function slugKey(value, index) {
    const base = String(value || `produto_${index}`)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 28);
    return `p_${base || index}`;
}

async function safeQuery(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        if (error.code === '42P01' || error.code === '42703') return [];
        throw error;
    }
}

async function countFromTable(tableName) {
    const rows = await safeQuery(`SELECT COUNT(*)::int AS total FROM ${tableName}`);
    return rows[0]?.total ?? 0;
}

const pedidoTotalSql = `
    COALESCE((
        SELECT SUM(i.subtotal)
        FROM pedido_itens i
        WHERE i.pedido_id = p.id
    ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
`;

router.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
        const [funcionarios, fornecedores, clientes, ferias, frota, pedidos] = await Promise.all([
            countFromTable('funcionarios'),
            countFromTable('fornecedores'),
            countFromTable('clientes'),
            safeQuery(`
                SELECT COUNT(*)::int AS total
                FROM ferias
                WHERE status IS NULL OR status <> 'Cancelada'
            `).then((rows) => rows[0]?.total ?? 0),
            countFromTable('frota'),
            safeQuery(`
                SELECT COUNT(*)::int AS total
                FROM pedidos
                WHERE status IS NULL OR status <> 'Cancelado'
            `).then((rows) => rows[0]?.total ?? 0),
        ]);

        res.json({
            funcionarios,
            fornecedores,
            clientes,
            ferias,
            frota,
            pedidos,
            pagamentos: pedidos,
        });
    } catch (error) {
        logger.error('Erro ao obter estatísticas do dashboard', {
            module: 'dashboardRoutes',
            stack: error.stack,
            message: error.message,
        });
        res.status(500).json({ message: 'Erro ao carregar estatísticas do painel.' });
    }
});

router.get('/api/dashboard/overview', isAuthenticated, async (req, res) => {
    try {
        const today = toIsoDate();
        const currentMonth = monthBounds();
        const lastMonth = previousMonthBounds();

        let inicio = normalizeDate(req.query.inicio) || currentMonth.inicio;
        let fim = normalizeDate(req.query.fim) || today;
        if (inicio > fim) {
            const tmp = inicio;
            inicio = fim;
            fim = tmp;
        }

        const spanDays = daysBetween(inicio, fim) + 1;
        const cappedSpan = Math.min(spanDays, 366);

        const [
            financeiroOpen,
            financeiroPeriodo,
            vendasPeriodo,
            vendasMesPassado,
            vendasSerie,
            topProdutos,
            agendaHoje,
            lucroSerie,
            vendasMesPassadoSerie,
        ] = await Promise.all([
            safeQuery(`
                SELECT
                    COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido')
                        THEN valor - COALESCE(valor_recebido, 0) ELSE 0 END), 0)::float AS a_receber,
                    COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido') THEN 1 ELSE 0 END), 0)::int AS a_receber_qtd
                FROM financeiro_contas_receber
            `).then(async (recvRows) => {
                const payRows = await safeQuery(`
                    SELECT
                        COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido')
                            THEN valor - COALESCE(valor_pago, 0) ELSE 0 END), 0)::float AS a_pagar,
                        COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido') THEN 1 ELSE 0 END), 0)::int AS a_pagar_qtd
                    FROM financeiro_contas_pagar
                `);
                return {
                    a_receber: Number(recvRows[0]?.a_receber || 0),
                    a_receber_qtd: Number(recvRows[0]?.a_receber_qtd || 0),
                    a_pagar: Number(payRows[0]?.a_pagar || 0),
                    a_pagar_qtd: Number(payRows[0]?.a_pagar_qtd || 0),
                };
            }),
            safeQuery(`
                SELECT
                    COALESCE(SUM(CASE
                        WHEN status = 'Recebido'
                         AND COALESCE(data_recebimento, data_vencimento) BETWEEN ? AND ?
                        THEN COALESCE(valor_recebido, valor, 0)
                        ELSE 0
                    END), 0)::float AS recebido
                FROM financeiro_contas_receber
            `, [inicio, fim]).then(async (recvRows) => {
                const payRows = await safeQuery(`
                    SELECT
                        COALESCE(SUM(CASE
                            WHEN status = 'Pago'
                             AND COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ?
                            THEN COALESCE(valor_pago, valor, 0)
                            ELSE 0
                        END), 0)::float AS pago
                    FROM financeiro_contas_pagar
                `, [inicio, fim]);
                return {
                    recebido: Number(recvRows[0]?.recebido || 0),
                    pago: Number(payRows[0]?.pago || 0),
                };
            }),
            safeQuery(`
                SELECT
                    COUNT(*)::int AS qtd,
                    COALESCE(SUM(${pedidoTotalSql}), 0)::float AS total
                FROM pedidos p
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
            `, [inicio, fim]).then((rows) => ({
                qtd: Number(rows[0]?.qtd || 0),
                total: Number(rows[0]?.total || 0),
            })),
            safeQuery(`
                SELECT
                    COUNT(*)::int AS qtd,
                    COALESCE(SUM(${pedidoTotalSql}), 0)::float AS total
                FROM pedidos p
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
            `, [lastMonth.inicio, lastMonth.fim]).then((rows) => ({
                qtd: Number(rows[0]?.qtd || 0),
                total: Number(rows[0]?.total || 0),
            })),
            safeQuery(`
                SELECT
                    p.data_pedido::text AS dia,
                    COUNT(*)::int AS pedidos,
                    COALESCE(SUM(${pedidoTotalSql}), 0)::float AS total
                FROM pedidos p
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                GROUP BY p.data_pedido
                ORDER BY p.data_pedido
            `, [inicio, fim]),
            safeQuery(`
                SELECT
                    COALESCE(pr.id, 0)::int AS produto_id,
                    COALESCE(pr.nome, 'Produto') AS nome,
                    COALESCE(pr.codigo, '') AS codigo,
                    COALESCE(SUM(i.quantidade), 0)::float AS quantidade,
                    COALESCE(SUM(i.subtotal), 0)::float AS total
                FROM pedido_itens i
                JOIN pedidos p ON p.id = i.pedido_id
                LEFT JOIN produtos pr ON pr.id = i.produto_id
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                GROUP BY pr.id, pr.nome, pr.codigo
                ORDER BY quantidade DESC, total DESC
                LIMIT 5
            `, [inicio, fim]),
            safeQuery(`
                SELECT
                    p.id,
                    COALESCE(p.numero, p.id::text) AS numero,
                    c.nome_razao_social AS cliente_nome,
                    TO_CHAR(p.data_entrega, 'YYYY-MM-DD') AS data_entrega,
                    TO_CHAR(p.data_carregamento, 'YYYY-MM-DD') AS data_carregamento,
                    p.status,
                    p.tipo_entrega,
                    f.placa AS veiculo_placa,
                    f.motorista AS veiculo_motorista,
                    p.endereco_entrega,
                    p.cidade_entrega,
                    ${pedidoTotalSql} AS total,
                    CASE
                        WHEN TO_CHAR(p.data_carregamento, 'YYYY-MM-DD') = ? THEN TRUE
                        ELSE FALSE
                    END AS is_carregamento_hoje,
                    CASE
                        WHEN TO_CHAR(p.data_entrega, 'YYYY-MM-DD') = ? THEN TRUE
                        ELSE FALSE
                    END AS is_entrega_hoje
                FROM pedidos p
                LEFT JOIN clientes c ON c.id = p.cliente_id
                LEFT JOIN frota f ON f.id = p.veiculo_id
                WHERE (p.status IS NULL OR p.status <> 'Cancelado')
                  AND (
                    TO_CHAR(p.data_entrega, 'YYYY-MM-DD') = ?
                    OR TO_CHAR(p.data_carregamento, 'YYYY-MM-DD') = ?
                  )
                ORDER BY
                    CASE WHEN TO_CHAR(p.data_carregamento, 'YYYY-MM-DD') = ? THEN 0 ELSE 1 END,
                    CASE WHEN TO_CHAR(p.data_entrega, 'YYYY-MM-DD') = ? THEN 0 ELSE 1 END,
                    p.id DESC
                LIMIT 20
            `, [today, today, today, today, today, today]),
            safeQuery(`
                SELECT dia, SUM(recebido)::float AS recebido, SUM(pago)::float AS pago
                FROM (
                    SELECT
                        COALESCE(data_recebimento, data_vencimento)::text AS dia,
                        COALESCE(valor_recebido, valor, 0) AS recebido,
                        0::numeric AS pago
                    FROM financeiro_contas_receber
                    WHERE status = 'Recebido'
                      AND COALESCE(data_recebimento, data_vencimento) BETWEEN ? AND ?
                    UNION ALL
                    SELECT
                        COALESCE(data_pagamento, data_vencimento)::text AS dia,
                        0::numeric AS recebido,
                        COALESCE(valor_pago, valor, 0) AS pago
                    FROM financeiro_contas_pagar
                    WHERE status = 'Pago'
                      AND COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ?
                ) mov
                WHERE dia IS NOT NULL
                GROUP BY dia
                ORDER BY dia
            `, [inicio, fim, inicio, fim]),
            safeQuery(`
                SELECT
                    p.data_pedido::text AS dia,
                    COUNT(*)::int AS pedidos,
                    COALESCE(SUM(${pedidoTotalSql}), 0)::float AS total
                FROM pedidos p
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                GROUP BY p.data_pedido
                ORDER BY p.data_pedido
            `, [lastMonth.inicio, lastMonth.fim]),
        ]);

        const topList = (topProdutos || []).map((row, index) => ({
            produto_id: Number(row.produto_id || 0),
            key: slugKey(row.nome, index),
            nome: row.nome || 'Produto',
            codigo: row.codigo || '',
            quantidade: Number(row.quantidade || 0),
            total: Number(row.total || 0),
        }));

        let produtosDailyRows = [];
        if (topList.length) {
            const ids = topList.map((item) => item.produto_id).filter((id) => id > 0);
            if (ids.length) {
                const placeholders = ids.map(() => '?').join(', ');
                produtosDailyRows = await safeQuery(`
                    SELECT
                        p.data_pedido::text AS dia,
                        i.produto_id,
                        COALESCE(SUM(i.quantidade), 0)::float AS quantidade,
                        COALESCE(SUM(i.subtotal), 0)::float AS total
                    FROM pedido_itens i
                    JOIN pedidos p ON p.id = i.pedido_id
                    WHERE p.data_pedido BETWEEN ? AND ?
                      AND (p.status IS NULL OR p.status <> 'Cancelado')
                      AND i.produto_id IN (${placeholders})
                    GROUP BY p.data_pedido, i.produto_id
                    ORDER BY p.data_pedido
                `, [inicio, fim, ...ids]);
            }
        }

        const aReceber = Number(financeiroOpen.a_receber || 0);
        const aPagar = Number(financeiroOpen.a_pagar || 0);
        const recebidoPeriodo = Number(financeiroPeriodo.recebido || 0);
        const pagoPeriodo = Number(financeiroPeriodo.pago || 0);

        const fillSeries = (rows, mapRow) => {
            const byDay = new Map(rows.map((row) => [String(row.dia).slice(0, 10), row]));
            const series = [];
            for (let i = 0; i < cappedSpan; i += 1) {
                const day = addDays(inicio, i);
                if (day > fim) break;
                series.push(mapRow(day, byDay.get(day)));
            }
            return series;
        };

        const produtosByDay = new Map();
        (produtosDailyRows || []).forEach((row) => {
            const day = String(row.dia).slice(0, 10);
            const product = topList.find((item) => item.produto_id === Number(row.produto_id));
            if (!product) return;
            if (!produtosByDay.has(day)) produtosByDay.set(day, {});
            produtosByDay.get(day)[product.key] = Number(row.quantidade || 0);
        });

        const produtosSerie = fillSeries([], (dia) => {
            const values = produtosByDay.get(dia) || {};
            const point = { dia };
            topList.forEach((product) => {
                point[product.key] = Number(values[product.key] || 0);
            });
            return point;
        });

        const prevByDayNum = new Map();
        (vendasMesPassadoSerie || []).forEach((row) => {
            const day = String(row.dia).slice(0, 10);
            const dayNum = Number(day.slice(8, 10));
            prevByDayNum.set(dayNum, Number(row.total || 0));
        });

        const lucroSerieFilled = fillSeries(lucroSerie, (dia, found) => {
            const recebido = Number(found?.recebido || 0);
            const pago = Number(found?.pago || 0);
            return {
                dia,
                recebido,
                pago,
                lucro: recebido - pago,
            };
        });

        res.json({
            gerado_em: today,
            periodo: {
                inicio,
                fim,
                mes_inicio: currentMonth.inicio,
                mes_fim: currentMonth.fim,
                mes_passado_inicio: lastMonth.inicio,
                mes_passado_fim: lastMonth.fim,
                dias: cappedSpan,
            },
            kpis: {
                a_receber: aReceber,
                a_receber_qtd: Number(financeiroOpen.a_receber_qtd || 0),
                a_pagar: aPagar,
                a_pagar_qtd: Number(financeiroOpen.a_pagar_qtd || 0),
                recebido_periodo: recebidoPeriodo,
                pago_periodo: pagoPeriodo,
                lucro_previsto: aReceber - aPagar,
                lucro_realizado: recebidoPeriodo - pagoPeriodo,
                vendas_periodo_qtd: Number(vendasPeriodo.qtd || 0),
                vendas_periodo_total: Number(vendasPeriodo.total || 0),
                vendas_mes_passado_qtd: Number(vendasMesPassado.qtd || 0),
                vendas_mes_passado_total: Number(vendasMesPassado.total || 0),
                agenda_hoje_qtd: agendaHoje.length,
            },
            vendas_serie: fillSeries(vendasSerie, (dia, found) => {
                const dayNum = Number(String(dia).slice(8, 10));
                return {
                    dia,
                    pedidos: Number(found?.pedidos || 0),
                    total: Number(found?.total || 0),
                    mes_passado: Number(prevByDayNum.get(dayNum) || 0),
                };
            }),
            lucro_serie: lucroSerieFilled,
            top_produtos: topList,
            produtos_serie: produtosSerie,
            agenda_hoje: (agendaHoje || []).map((row) => ({
                id: row.id,
                numero: row.numero,
                cliente_nome: row.cliente_nome || '—',
                data_entrega: row.data_entrega || null,
                data_carregamento: row.data_carregamento || null,
                is_carregamento_hoje: Boolean(row.is_carregamento_hoje),
                is_entrega_hoje: Boolean(row.is_entrega_hoje),
                status: row.status || 'Pendente',
                tipo_entrega: row.tipo_entrega || 'a_definir',
                veiculo_placa: row.veiculo_placa || '',
                veiculo_motorista: row.veiculo_motorista || '',
                endereco_entrega: row.endereco_entrega || '',
                cidade_entrega: row.cidade_entrega || '',
                total: Number(row.total || 0),
            })),
        });
    } catch (error) {
        logger.error('Erro ao obter overview do dashboard', {
            module: 'dashboardRoutes',
            stack: error.stack,
            message: error.message,
        });
        res.status(500).json({ message: 'Erro ao carregar o painel.' });
    }
});

module.exports = router;
