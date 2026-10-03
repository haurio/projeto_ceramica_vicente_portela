const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

router.use('/api/relatorios', isAuthenticated);

function normalizeDate(value) {
    if (!value) return null;
    const raw = String(value).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function monthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const toIso = (d) => d.toISOString().slice(0, 10);
    return { inicio: toIso(start), fim: toIso(end) };
}

function periodFromQuery(query) {
    const defaults = monthBounds();
    return {
        inicio: normalizeDate(query.inicio) || defaults.inicio,
        fim: normalizeDate(query.fim) || defaults.fim,
    };
}

async function safeQuery(sql, params = []) {
    try {
        const [rows] = await pool.query(sql, params);
        return Array.isArray(rows) ? rows : [];
    } catch (error) {
        if (error.code === '42P01') return [];
        throw error;
    }
}

const REPORT_CATALOG = [
    {
        id: 'financeiro-receber',
        group: 'Financeiro',
        title: 'Contas a receber',
        description: 'Lançamentos a receber no período, com status e valores.',
        icon: 'fa-hand-holding-usd',
        tone: 'receive',
        clienteFilter: true,
        statusOptions: ['Pendente', 'Parcial', 'Recebido', 'Vencido', 'Cancelado'],
    },
    {
        id: 'financeiro-pagar',
        group: 'Financeiro',
        title: 'Contas a pagar',
        description: 'Despesas e obrigações a pagar no período.',
        icon: 'fa-file-invoice-dollar',
        tone: 'pay',
        fornecedorFilter: true,
        statusOptions: ['Pendente', 'Parcial', 'Pago', 'Vencido', 'Cancelado'],
    },
    {
        id: 'financeiro-resumo',
        group: 'Financeiro',
        title: 'Resumo financeiro',
        description: 'Totais de entradas, saídas e saldo do período.',
        icon: 'fa-chart-pie',
        tone: 'forecast',
    },
    {
        id: 'vendas-mensal',
        group: 'Vendas',
        title: 'Vendas mensais',
        description: 'Totais de pedidos por mês. Ideal para analisar o ano inteiro.',
        icon: 'fa-chart-line',
        tone: 'in',
        defaultPeriod: 'year',
        clienteFilter: true,
    },
    {
        id: 'lucros-periodo',
        group: 'Vendas',
        title: 'Lucros do período',
        description: 'Recebido, pago e lucro realizado mês a mês.',
        icon: 'fa-balance-scale',
        tone: 'profit',
        defaultPeriod: 'year',
    },
    {
        id: 'top-produtos',
        group: 'Vendas',
        title: 'Produtos mais vendidos',
        description: 'Ranking de produtos por quantidade e valor no período.',
        icon: 'fa-box-open',
        tone: 'out',
        defaultPeriod: 'year',
        produtoFilter: true,
    },
    {
        id: 'top-clientes',
        group: 'Vendas',
        title: 'Clientes que mais compraram',
        description: 'Ranking de clientes por valor e quantidade de pedidos.',
        icon: 'fa-user-friends',
        tone: 'receive',
        defaultPeriod: 'year',
        clienteFilter: true,
    },
    {
        id: 'pedidos-periodo',
        group: 'Operacional',
        title: 'Pedidos do período',
        description: 'Pedidos por data, cliente, valor e status.',
        icon: 'fa-clipboard-list',
        tone: 'in',
        clienteFilter: true,
        statusOptions: ['Pendente', 'Aguardando pagamento', 'Aguardando carregamento', 'Aguardando entrega', 'Entregue', 'Confirmado', 'Rascunho', 'Cancelado'],
    },
    {
        id: 'comissoes-periodo',
        group: 'Vendas',
        title: 'Comissões de representantes',
        description: 'Comissões geradas por pedido confirmado no período. Busque por representante.',
        icon: 'fa-percent',
        tone: 'profit',
        buscaFilter: true,
        buscaLabel: 'Representante',
        buscaPlaceholder: 'Nome do representante...',
        statusOptions: ['Confirmado', 'Aguardando carregamento', 'Aguardando entrega', 'Entregue'],
    },
    {
        id: 'estoque-atual',
        group: 'Operacional',
        title: 'Estoque atual',
        description: 'Saldo de produtos e itens com estoque baixo.',
        icon: 'fa-boxes',
        tone: 'out',
        produtoFilter: true,
        statusOptions: ['Ativo', 'Inativo'],
    },
    {
        id: 'frota-status',
        group: 'Operacional',
        title: 'Frota',
        description: 'Veículos cadastrados com status e motorista.',
        icon: 'fa-truck',
        tone: 'pay',
        buscaFilter: true,
        buscaLabel: 'Placa / motorista',
        buscaPlaceholder: 'Digite placa ou motorista...',
        statusOptions: ['Ativo', 'Inativo'],
    },
    {
        id: 'rh-funcionarios',
        group: 'RH',
        title: 'Funcionários',
        description: 'Quadro de funcionários por status e setor.',
        icon: 'fa-users',
        tone: 'receive',
        funcionarioFilter: true,
        statusOptions: ['Ativo', 'Inativo', 'Afastado', 'Demitido'],
    },
    {
        id: 'rh-ferias',
        group: 'RH',
        title: 'Férias',
        description: 'Férias planejadas, em andamento e concluídas no período.',
        icon: 'fa-umbrella-beach',
        tone: 'forecast',
        funcionarioFilter: true,
        statusOptions: ['Planejada', 'Em Andamento', 'Concluída', 'Cancelada'],
    },
    {
        id: 'rh-ausencias',
        group: 'RH',
        title: 'Ausências',
        description: 'Afastamentos e faltas registradas no período.',
        icon: 'fa-calendar-times',
        tone: 'loss',
        funcionarioFilter: true,
        statusOptions: ['Registrada', 'Justificada', 'Não Justificada', 'Cancelada'],
    },
    {
        id: 'cipa-ca-vencendo',
        group: 'CIPA',
        title: 'CA / EPI a vencer',
        description: 'CAs de EPI cadastrados com validade no período selecionado.',
        icon: 'fa-hard-hat',
        tone: 'loss',
        buscaFilter: true,
        buscaLabel: 'Buscar',
        buscaPlaceholder: 'Nome do EPI ou CA...',
        statusOptions: ['Ativo', 'Inativo'],
    },
    {
        id: 'cipa-entregas-vencendo',
        group: 'CIPA',
        title: 'Entregas de EPI a vencer',
        description: 'EPIs já entregues aos funcionários com validade no período.',
        icon: 'fa-user-shield',
        tone: 'pay',
        funcionarioFilter: true,
        statusOptions: ['Em uso', 'Expirado', 'Devolvido', 'Extraviado', 'Trocado'],
    },
    {
        id: 'cipa-equipamentos-prazo',
        group: 'CIPA',
        title: 'Equipamentos a vencer',
        description: 'Equipamentos com próxima manutenção no período selecionado.',
        icon: 'fa-cogs',
        tone: 'forecast',
        buscaFilter: true,
        buscaLabel: 'Buscar',
        buscaPlaceholder: 'Nome, tag ou setor...',
        statusOptions: ['Operacional', 'Em manutenção', 'Inativo'],
    },
    {
        id: 'cipa-manutencoes',
        group: 'CIPA',
        title: 'Equipamentos em manutenção',
        description: 'Manutenções agendadas, em andamento e realizadas no período.',
        icon: 'fa-wrench',
        tone: 'out',
        buscaFilter: true,
        buscaLabel: 'Buscar',
        buscaPlaceholder: 'Equipamento ou responsável...',
        statusOptions: ['Agendada', 'Em andamento', 'Concluída', 'Atrasada'],
    },
    {
        id: 'cadastros-clientes',
        group: 'Cadastros',
        title: 'Clientes',
        description: 'Base de clientes com contato e status.',
        icon: 'fa-user-friends',
        tone: 'in',
        clienteFilter: true,
        statusOptions: ['Ativo', 'Inativo'],
    },
    {
        id: 'cadastros-fornecedores',
        group: 'Cadastros',
        title: 'Fornecedores',
        description: 'Fornecedores cadastrados com documento e cidade.',
        icon: 'fa-user-tie',
        tone: 'out',
        fornecedorFilter: true,
        statusOptions: ['sim', 'nao'],
        statusLabels: { sim: 'Ativo', nao: 'Inativo' },
    },
];

function clienteIdFromQuery(query) {
    const raw = Number(query.cliente_id);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function fornecedorIdFromQuery(query) {
    const raw = Number(query.fornecedor_id);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function funcionarioIdFromQuery(query) {
    const raw = Number(query.funcionario_id);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function produtoIdFromQuery(query) {
    const raw = Number(query.produto_id);
    return Number.isFinite(raw) && raw > 0 ? raw : null;
}

function buscaFromQuery(query) {
    const raw = String(query.busca || '').trim();
    return raw ? raw.slice(0, 120) : '';
}

function statusFromQuery(query, allowed = []) {
    const raw = String(query.status || '').trim();
    if (!raw) return null;
    if (Array.isArray(allowed) && allowed.length && !allowed.includes(raw)) return null;
    return raw.slice(0, 60);
}

router.get('/api/relatorios/catalogo', (_req, res) => {
    res.json(REPORT_CATALOG);
});

router.get('/api/relatorios/:id', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        const meta = REPORT_CATALOG.find((item) => item.id === id);
        if (!meta) return res.status(404).json({ message: 'Relatório não encontrado.' });

        const { inicio, fim } = periodFromQuery(req.query);
        const clienteId = clienteIdFromQuery(req.query);
        const fornecedorId = fornecedorIdFromQuery(req.query);
        const funcionarioId = funcionarioIdFromQuery(req.query);
        const produtoId = produtoIdFromQuery(req.query);
        const busca = buscaFromQuery(req.query);
        const status = statusFromQuery(req.query, meta.statusOptions || []);
        let columns = [];
        let rows = [];
        let summary = null;

        if (id === 'financeiro-receber') {
            columns = [
                { key: 'descricao', label: 'Descrição' },
                { key: 'cliente_nome', label: 'Cliente' },
                { key: 'valor', label: 'Valor', type: 'money' },
                { key: 'valor_recebido', label: 'Recebido', type: 'money' },
                { key: 'data_vencimento', label: 'Vencimento', type: 'date' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (clienteId) {
                extraSql += ' AND cliente_id = ?';
                params.push(clienteId);
            }
            if (status) {
                extraSql += ' AND status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT descricao, cliente_nome, valor, valor_recebido, data_vencimento, status
                FROM financeiro_contas_receber
                WHERE COALESCE(data_vencimento, data_emissao) BETWEEN ? AND ?
                ${extraSql}
                ORDER BY COALESCE(data_vencimento, data_emissao) DESC, id DESC
            `, params);
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.valor || 0), 0),
            };
        }

        if (id === 'financeiro-pagar') {
            columns = [
                { key: 'descricao', label: 'Descrição' },
                { key: 'fornecedor_nome', label: 'Fornecedor' },
                { key: 'categoria', label: 'Categoria' },
                { key: 'valor', label: 'Valor', type: 'money' },
                { key: 'valor_pago', label: 'Pago', type: 'money' },
                { key: 'data_vencimento', label: 'Vencimento', type: 'date' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (fornecedorId) {
                extraSql += ' AND fornecedor_id = ?';
                params.push(fornecedorId);
            }
            if (status) {
                extraSql += ' AND status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT descricao, fornecedor_nome, categoria, valor, valor_pago, data_vencimento, status
                FROM financeiro_contas_pagar
                WHERE COALESCE(data_vencimento, data_emissao) BETWEEN ? AND ?
                ${extraSql}
                ORDER BY COALESCE(data_vencimento, data_emissao) DESC, id DESC
            `, params);
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.valor || 0), 0),
            };
        }

        if (id === 'financeiro-resumo') {
            columns = [
                { key: 'indicador', label: 'Indicador' },
                { key: 'valor', label: 'Valor', type: 'money' },
                { key: 'detalhe', label: 'Detalhe' },
            ];
            const [recv] = await safeQuery(`
                SELECT
                    COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido') THEN valor - COALESCE(valor_recebido,0) ELSE 0 END), 0) AS a_receber,
                    COALESCE(SUM(CASE WHEN status = 'Recebido' AND COALESCE(data_recebimento, data_vencimento) BETWEEN ? AND ? THEN valor_recebido ELSE 0 END), 0) AS recebido
                FROM financeiro_contas_receber
            `, [inicio, fim]);
            const [pay] = await safeQuery(`
                SELECT
                    COALESCE(SUM(CASE WHEN status IN ('Pendente','Parcial','Vencido') THEN valor - COALESCE(valor_pago,0) ELSE 0 END), 0) AS a_pagar,
                    COALESCE(SUM(CASE WHEN status = 'Pago' AND COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ? THEN valor_pago ELSE 0 END), 0) AS pago
                FROM financeiro_contas_pagar
            `, [inicio, fim]);
            const aReceber = Number(recv?.a_receber || 0);
            const recebido = Number(recv?.recebido || 0);
            const aPagar = Number(pay?.a_pagar || 0);
            const pago = Number(pay?.pago || 0);
            rows = [
                { indicador: 'A receber (em aberto)', valor: aReceber, detalhe: 'Saldo pendente' },
                { indicador: 'Recebido no período', valor: recebido, detalhe: `${inicio} a ${fim}` },
                { indicador: 'A pagar (em aberto)', valor: aPagar, detalhe: 'Saldo pendente' },
                { indicador: 'Pago no período', valor: pago, detalhe: `${inicio} a ${fim}` },
                { indicador: 'Lucro previsto', valor: aReceber - aPagar, detalhe: 'A receber − a pagar' },
                { indicador: 'Lucro realizado', valor: recebido - pago, detalhe: 'Recebido − pago' },
            ];
            summary = { total: rows.length };
        }

        if (id === 'vendas-mensal') {
            columns = [
                { key: 'mes', label: 'Mês' },
                { key: 'pedidos', label: 'Pedidos' },
                { key: 'total', label: 'Total', type: 'money' },
                { key: 'ticket_medio', label: 'Ticket médio', type: 'money' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (clienteId) {
                extraSql += ' AND p.cliente_id = ?';
                params.push(clienteId);
            }
            rows = await safeQuery(`
                SELECT
                    to_char(date_trunc('month', p.data_pedido), 'YYYY-MM') AS mes,
                    COUNT(*)::int AS pedidos,
                    COALESCE(SUM(
                        COALESCE((
                            SELECT SUM(i.subtotal)
                            FROM pedido_itens i
                            WHERE i.pedido_id = p.id
                        ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                    ), 0)::float AS total
                FROM pedidos p
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                  ${extraSql}
                GROUP BY date_trunc('month', p.data_pedido)
                ORDER BY date_trunc('month', p.data_pedido)
            `, params);
            rows = rows.map((row) => {
                const pedidos = Number(row.pedidos || 0);
                const total = Number(row.total || 0);
                return {
                    ...row,
                    pedidos,
                    total,
                    ticket_medio: pedidos > 0 ? total / pedidos : 0,
                };
            });
            summary = {
                total: rows.reduce((acc, row) => acc + Number(row.pedidos || 0), 0),
                valor: rows.reduce((acc, row) => acc + Number(row.total || 0), 0),
            };
        }

        if (id === 'lucros-periodo') {
            columns = [
                { key: 'mes', label: 'Mês' },
                { key: 'recebido', label: 'Recebido', type: 'money' },
                { key: 'pago', label: 'Pago', type: 'money' },
                { key: 'lucro', label: 'Lucro', type: 'money' },
            ];
            rows = await safeQuery(`
                SELECT
                    mes,
                    SUM(recebido)::float AS recebido,
                    SUM(pago)::float AS pago
                FROM (
                    SELECT
                        to_char(date_trunc('month', COALESCE(data_recebimento, data_vencimento)), 'YYYY-MM') AS mes,
                        COALESCE(valor_recebido, valor, 0) AS recebido,
                        0::numeric AS pago
                    FROM financeiro_contas_receber
                    WHERE status = 'Recebido'
                      AND COALESCE(data_recebimento, data_vencimento) BETWEEN ? AND ?
                    UNION ALL
                    SELECT
                        to_char(date_trunc('month', COALESCE(data_pagamento, data_vencimento)), 'YYYY-MM') AS mes,
                        0::numeric AS recebido,
                        COALESCE(valor_pago, valor, 0) AS pago
                    FROM financeiro_contas_pagar
                    WHERE status = 'Pago'
                      AND COALESCE(data_pagamento, data_vencimento) BETWEEN ? AND ?
                ) mov
                WHERE mes IS NOT NULL
                GROUP BY mes
                ORDER BY mes
            `, [inicio, fim, inicio, fim]);
            rows = rows.map((row) => {
                const recebido = Number(row.recebido || 0);
                const pago = Number(row.pago || 0);
                return {
                    mes: row.mes,
                    recebido,
                    pago,
                    lucro: recebido - pago,
                };
            });
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.lucro || 0), 0),
            };
        }

        if (id === 'top-produtos') {
            columns = [
                { key: 'codigo', label: 'Código' },
                { key: 'nome', label: 'Produto' },
                { key: 'quantidade', label: 'Quantidade' },
                { key: 'total', label: 'Total', type: 'money' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (produtoId) {
                extraSql += ' AND i.produto_id = ?';
                params.push(produtoId);
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(pr.codigo, '') AS codigo,
                    COALESCE(pr.nome, 'Produto') AS nome,
                    COALESCE(SUM(i.quantidade), 0)::float AS quantidade,
                    COALESCE(SUM(i.subtotal), 0)::float AS total
                FROM pedido_itens i
                JOIN pedidos p ON p.id = i.pedido_id
                LEFT JOIN produtos pr ON pr.id = i.produto_id
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                  ${extraSql}
                GROUP BY pr.codigo, pr.nome
                ORDER BY quantidade DESC, total DESC
                LIMIT 50
            `, params);
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.total || 0), 0),
            };
        }

        if (id === 'top-clientes') {
            columns = [
                { key: 'cliente_nome', label: 'Cliente' },
                { key: 'pedidos', label: 'Pedidos' },
                { key: 'total', label: 'Total', type: 'money' },
                { key: 'ticket_medio', label: 'Ticket médio', type: 'money' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (clienteId) {
                extraSql += ' AND p.cliente_id = ?';
                params.push(clienteId);
            }
            rows = await safeQuery(`
                SELECT
                    c.nome_razao_social AS cliente_nome,
                    COUNT(*)::int AS pedidos,
                    COALESCE(SUM(
                        COALESCE((
                            SELECT SUM(i.subtotal)
                            FROM pedido_itens i
                            WHERE i.pedido_id = p.id
                        ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                    ), 0)::float AS total
                FROM pedidos p
                INNER JOIN clientes c ON c.id = p.cliente_id
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND (p.status IS NULL OR p.status <> 'Cancelado')
                  ${extraSql}
                GROUP BY c.id, c.nome_razao_social
                ORDER BY total DESC, pedidos DESC
                LIMIT 50
            `, params);
            rows = rows.map((row) => {
                const pedidos = Number(row.pedidos || 0);
                const total = Number(row.total || 0);
                return {
                    ...row,
                    pedidos,
                    total,
                    ticket_medio: pedidos > 0 ? total / pedidos : 0,
                };
            });
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.total || 0), 0),
            };
        }

        if (id === 'pedidos-periodo') {
            columns = [
                { key: 'numero', label: 'Nº' },
                { key: 'cliente_nome', label: 'Cliente' },
                { key: 'data_pedido', label: 'Data', type: 'date' },
                { key: 'status', label: 'Status' },
                { key: 'forma_pagamento', label: 'Pagamento' },
                { key: 'valor_total', label: 'Valor', type: 'money' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (clienteId) {
                extraSql += ' AND p.cliente_id = ?';
                params.push(clienteId);
            }
            if (status) {
                extraSql += ' AND p.status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(p.numero, p.id::text) AS numero,
                    c.nome_razao_social AS cliente_nome,
                    p.data_pedido,
                    p.status,
                    p.forma_pagamento,
                    COALESCE((
                        SELECT SUM(i.subtotal)
                        FROM pedido_itens i
                        WHERE i.pedido_id = p.id
                    ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0) AS valor_total
                FROM pedidos p
                INNER JOIN clientes c ON c.id = p.cliente_id
                WHERE p.data_pedido BETWEEN ? AND ?
                ${extraSql}
                ORDER BY p.data_pedido DESC, p.id DESC
            `, params);
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.valor_total || 0), 0),
            };
        }

        if (id === 'comissoes-periodo') {
            columns = [
                { key: 'numero', label: 'Pedido' },
                { key: 'representante_nome', label: 'Representante' },
                { key: 'cliente_nome', label: 'Cliente' },
                { key: 'data_pedido', label: 'Data', type: 'date' },
                { key: 'status', label: 'Status' },
                { key: 'valor_total', label: 'Venda', type: 'money' },
                { key: 'comissao_percent', label: 'Comissão %' },
                { key: 'comissao_valor', label: 'Comissão', type: 'money' },
            ];
            const comissaoStatuses = ['Confirmado', 'Aguardando carregamento', 'Aguardando entrega', 'Entregue'];
            const params = [inicio, fim];
            let extraSql = '';
            if (status) {
                extraSql += ' AND p.status = ?';
                params.push(status);
            } else {
                extraSql += ` AND p.status IN (${comissaoStatuses.map(() => '?').join(', ')})`;
                params.push(...comissaoStatuses);
            }
            if (busca) {
                extraSql += ' AND LOWER(r.nome) LIKE ?';
                params.push(`%${busca.toLowerCase()}%`);
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(p.numero, p.id::text) AS numero,
                    r.nome AS representante_nome,
                    c.nome_razao_social AS cliente_nome,
                    p.data_pedido,
                    p.status,
                    COALESCE((
                        SELECT SUM(i.subtotal)
                        FROM pedido_itens i
                        WHERE i.pedido_id = p.id
                    ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0) AS valor_total,
                    COALESCE(r.comissao_percent, 0) AS comissao_percent,
                    (
                        COALESCE((
                            SELECT SUM(i.subtotal)
                            FROM pedido_itens i
                            WHERE i.pedido_id = p.id
                        ), 0) + COALESCE(p.frete, 0) - COALESCE(p.desconto, 0)
                    ) * COALESCE(r.comissao_percent, 0) / 100.0 AS comissao_valor
                FROM pedidos p
                INNER JOIN representantes r ON r.id = p.representante_id
                INNER JOIN clientes c ON c.id = p.cliente_id
                WHERE p.data_pedido BETWEEN ? AND ?
                  AND p.representante_id IS NOT NULL
                  ${extraSql}
                ORDER BY p.data_pedido DESC, p.id DESC
            `, params);
            rows = rows.map((row) => ({
                ...row,
                valor_total: Number(Number(row.valor_total || 0).toFixed(2)),
                comissao_percent: Number(Number(row.comissao_percent || 0).toFixed(2)),
                comissao_valor: Number(Number(row.comissao_valor || 0).toFixed(2)),
            }));
            summary = {
                total: rows.length,
                valor: rows.reduce((acc, row) => acc + Number(row.valor_total || 0), 0),
                comissao: rows.reduce((acc, row) => acc + Number(row.comissao_valor || 0), 0),
            };
        }

        if (id === 'estoque-atual') {
            columns = [
                { key: 'codigo', label: 'Código' },
                { key: 'nome', label: 'Produto' },
                { key: 'categoria', label: 'Categoria' },
                { key: 'estoque', label: 'Saldo' },
                { key: 'unidade', label: 'Unidade' },
                { key: 'status', label: 'Status' },
            ];
            const clauses = [];
            const params = [];
            if (produtoId) {
                clauses.push('id = ?');
                params.push(produtoId);
            }
            if (status) {
                clauses.push('status = ?');
                params.push(status);
            }
            const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
            rows = await safeQuery(`
                SELECT codigo, nome, categoria, estoque, unidade, status
                FROM produtos
                ${whereSql}
                ORDER BY nome
            `, params);
            summary = {
                total: rows.length,
                baixo: rows.filter((row) => Number(row.estoque || 0) <= 10).length,
            };
        }

        if (id === 'frota-status') {
            columns = [
                { key: 'placa', label: 'Placa' },
                { key: 'modelo', label: 'Modelo' },
                { key: 'motorista', label: 'Motorista' },
                { key: 'status', label: 'Status' },
                { key: 'ano', label: 'Ano' },
            ];
            const clauses = [];
            const params = [];
            if (busca) {
                clauses.push('(placa ILIKE ? OR COALESCE(motorista, \'\') ILIKE ? OR COALESCE(modelo, \'\') ILIKE ?)');
                const term = `%${busca}%`;
                params.push(term, term, term);
            }
            if (status) {
                clauses.push('status = ?');
                params.push(status);
            }
            const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
            rows = await safeQuery(`
                SELECT placa, modelo, motorista, status, ano
                FROM frota
                ${whereSql}
                ORDER BY placa
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'rh-funcionarios') {
            columns = [
                { key: 'nome', label: 'Nome' },
                { key: 'cargo', label: 'Cargo' },
                { key: 'departamento', label: 'Departamento' },
                { key: 'status', label: 'Status' },
                { key: 'data_admissao', label: 'Admissão', type: 'date' },
            ];
            const clauses = [];
            const params = [];
            if (funcionarioId) {
                clauses.push('f.id = ?');
                params.push(funcionarioId);
            }
            if (status) {
                clauses.push('f.status = ?');
                params.push(status);
            }
            const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
            rows = await safeQuery(`
                SELECT
                    f.nome,
                    COALESCE(c.nome, '—') AS cargo,
                    COALESCE(d.nome, '—') AS departamento,
                    f.status,
                    f.data_admissao
                FROM funcionarios f
                LEFT JOIN cargos c ON c.id = f.cargo_id
                LEFT JOIN departamentos d ON d.id = f.departamento_id
                ${whereSql}
                ORDER BY f.nome
            `, params);
            summary = {
                total: rows.length,
                ativos: rows.filter((row) => String(row.status || '').toLowerCase() === 'ativo').length,
            };
        }

        if (id === 'rh-ferias') {
            columns = [
                { key: 'funcionario_nome', label: 'Funcionário' },
                { key: 'data_inicio', label: 'Início', type: 'date' },
                { key: 'data_fim', label: 'Fim', type: 'date' },
                { key: 'status', label: 'Status' },
                { key: 'dias_concedidos', label: 'Dias' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (funcionarioId) {
                extraSql += ' AND fe.funcionario_id = ?';
                params.push(funcionarioId);
            }
            if (status) {
                extraSql += ' AND fe.status = ?';
                params.push(status);
            } else {
                extraSql += " AND (fe.status IS NULL OR fe.status <> 'Cancelada')";
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(fn.nome, '—') AS funcionario_nome,
                    fe.data_inicio,
                    fe.data_fim,
                    fe.status,
                    fe.dias_concedidos
                FROM ferias fe
                LEFT JOIN funcionarios fn ON fn.id = fe.funcionario_id
                WHERE COALESCE(fe.data_inicio, fe.data_fim) BETWEEN ? AND ?
                  ${extraSql}
                ORDER BY fe.data_inicio DESC NULLS LAST
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'rh-ausencias') {
            columns = [
                { key: 'funcionario_nome', label: 'Funcionário' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'data_inicio', label: 'Início', type: 'date' },
                { key: 'data_fim', label: 'Fim', type: 'date' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (funcionarioId) {
                extraSql += ' AND a.funcionario_id = ?';
                params.push(funcionarioId);
            }
            if (status) {
                extraSql += ' AND a.status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(fn.nome, '—') AS funcionario_nome,
                    a.tipo,
                    a.data_inicio,
                    a.data_fim,
                    a.status
                FROM ausencias a
                LEFT JOIN funcionarios fn ON fn.id = a.funcionario_id
                WHERE COALESCE(a.data_inicio, a.data_fim) BETWEEN ? AND ?
                ${extraSql}
                ORDER BY a.data_inicio DESC NULLS LAST
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cipa-ca-vencendo') {
            columns = [
                { key: 'nome', label: 'EPI' },
                { key: 'ca_numero', label: 'CA' },
                { key: 'categoria', label: 'Categoria' },
                { key: 'validade_ca', label: 'Validade CA', type: 'date' },
                { key: 'estoque_atual', label: 'Estoque' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (busca) {
                extraSql += ' AND (nome ILIKE ? OR COALESCE(ca_numero, \'\') ILIKE ? OR COALESCE(categoria, \'\') ILIKE ?)';
                const term = `%${busca}%`;
                params.push(term, term, term);
            }
            if (status) {
                extraSql += ' AND status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT nome, ca_numero, categoria, validade_ca, estoque_atual, status
                FROM cipa_epis
                WHERE validade_ca IS NOT NULL
                  AND validade_ca BETWEEN ? AND ?
                  ${extraSql}
                ORDER BY validade_ca ASC
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cipa-entregas-vencendo') {
            columns = [
                { key: 'funcionario_nome', label: 'Funcionário' },
                { key: 'epi_nome', label: 'EPI' },
                { key: 'ca_numero', label: 'CA' },
                { key: 'data_entrega', label: 'Entrega', type: 'date' },
                { key: 'data_validade', label: 'Validade', type: 'date' },
                { key: 'quantidade', label: 'Qtd' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (funcionarioId) {
                extraSql += ' AND e.funcionario_id = ?';
                params.push(funcionarioId);
            }
            if (status) {
                extraSql += ' AND e.status = ?';
                params.push(status);
            } else {
                extraSql += " AND e.status IN ('Em uso', 'Expirado')";
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(e.funcionario_nome, '—') AS funcionario_nome,
                    COALESCE(p.nome, '—') AS epi_nome,
                    p.ca_numero,
                    e.data_entrega,
                    e.data_validade,
                    e.quantidade,
                    e.status
                FROM cipa_epi_entregas e
                LEFT JOIN cipa_epis p ON p.id = e.epi_id
                WHERE e.data_validade IS NOT NULL
                  AND e.data_validade BETWEEN ? AND ?
                  ${extraSql}
                ORDER BY e.data_validade ASC, e.data_entrega DESC
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cipa-equipamentos-prazo') {
            columns = [
                { key: 'nome', label: 'Equipamento' },
                { key: 'tag_patrimonio', label: 'Tag' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'setor', label: 'Setor' },
                { key: 'proxima_manutencao', label: 'Próx. manutenção', type: 'date' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (busca) {
                extraSql += ` AND (
                    nome ILIKE ?
                    OR COALESCE(tag_patrimonio, '') ILIKE ?
                    OR COALESCE(setor, '') ILIKE ?
                    OR COALESCE(tipo, '') ILIKE ?
                )`;
                const term = `%${busca}%`;
                params.push(term, term, term, term);
            }
            if (status) {
                extraSql += ' AND status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT nome, tag_patrimonio, tipo, setor, proxima_manutencao, status
                FROM cipa_equipamentos
                WHERE proxima_manutencao IS NOT NULL
                  AND proxima_manutencao BETWEEN ? AND ?
                  ${extraSql}
                ORDER BY proxima_manutencao ASC, nome
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cipa-manutencoes') {
            columns = [
                { key: 'equipamento_nome', label: 'Equipamento' },
                { key: 'tag_patrimonio', label: 'Tag' },
                { key: 'tipo', label: 'Tipo' },
                { key: 'data_agendada', label: 'Agendada', type: 'date' },
                { key: 'data_realizada', label: 'Realizada', type: 'date' },
                { key: 'responsavel', label: 'Responsável' },
                { key: 'status', label: 'Status' },
            ];
            const params = [inicio, fim];
            let extraSql = '';
            if (busca) {
                extraSql += ` AND (
                    COALESCE(eq.nome, '') ILIKE ?
                    OR COALESCE(eq.tag_patrimonio, '') ILIKE ?
                    OR COALESCE(m.responsavel, '') ILIKE ?
                    OR COALESCE(m.tipo, '') ILIKE ?
                )`;
                const term = `%${busca}%`;
                params.push(term, term, term, term);
            }
            if (status) {
                extraSql += ' AND m.status = ?';
                params.push(status);
            }
            rows = await safeQuery(`
                SELECT
                    COALESCE(eq.nome, '—') AS equipamento_nome,
                    eq.tag_patrimonio,
                    m.tipo,
                    m.data_agendada,
                    m.data_realizada,
                    m.responsavel,
                    m.status
                FROM cipa_manutencoes m
                JOIN cipa_equipamentos eq ON eq.id = m.equipamento_id
                WHERE COALESCE(m.data_agendada, m.data_realizada) BETWEEN ? AND ?
                ${extraSql}
                ORDER BY COALESCE(m.data_agendada, m.data_realizada) DESC NULLS LAST, m.id DESC
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cadastros-clientes') {
            columns = [
                { key: 'nome_razao_social', label: 'Nome / Razão social' },
                { key: 'cpf_cnpj', label: 'CPF/CNPJ' },
                { key: 'telefone_principal', label: 'Telefone' },
                { key: 'cidade', label: 'Cidade' },
                { key: 'status', label: 'Status' },
            ];
            const clauses = [];
            const params = [];
            if (clienteId) {
                clauses.push('id = ?');
                params.push(clienteId);
            }
            if (status) {
                clauses.push('status = ?');
                params.push(status);
            }
            const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
            rows = await safeQuery(`
                SELECT nome_razao_social, cpf_cnpj, telefone_principal, cidade, status
                FROM clientes
                ${whereSql}
                ORDER BY nome_razao_social
            `, params);
            summary = { total: rows.length };
        }

        if (id === 'cadastros-fornecedores') {
            columns = [
                { key: 'razao_social', label: 'Razão social' },
                { key: 'cnpj', label: 'CNPJ' },
                { key: 'telefone_contato', label: 'Telefone' },
                { key: 'cidade', label: 'Cidade' },
                { key: 'ativo', label: 'Ativo' },
            ];
            const clauses = [];
            const params = [];
            if (fornecedorId) {
                clauses.push('id = ?');
                params.push(fornecedorId);
            }
            if (status) {
                clauses.push('ativo = ?');
                params.push(status);
            }
            const whereSql = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
            rows = await safeQuery(`
                SELECT razao_social, cnpj, telefone_contato, cidade, ativo
                FROM fornecedores
                ${whereSql}
                ORDER BY razao_social
            `, params);
            summary = { total: rows.length };
        }

        res.json({
            meta,
            periodo: { inicio, fim, gerado_em: todayIso() },
            columns,
            rows,
            summary,
        });
    } catch (error) {
        logger.error('Erro ao gerar relatório', {
            module: 'relatoriosRoutes',
            stack: error.stack,
            id: req.params.id,
        });
        res.status(500).json({ message: 'Erro ao gerar relatório.' });
    }
});

module.exports = router;
