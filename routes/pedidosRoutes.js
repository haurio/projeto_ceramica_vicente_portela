const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');
const { resolveRepresentanteContext } = require('../utils/representanteAccess');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

const STATUS_VALIDOS = [
    'Rascunho',
    'Pré-venda',
    'Em análise',
    'Pendente',
    'Aguardando pagamento',
    'Aguardando carregamento',
    'Aguardando entrega',
    'Confirmado',
    'Entregue',
    'Cancelado',
];
const STATUS_BAIXA_ESTOQUE = new Set([
    'Confirmado',
    'Aguardando carregamento',
    'Aguardando entrega',
    'Entregue',
]);
const FORMAS_PAGAMENTO = [
    'Dinheiro',
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Boleto',
    'Transferência',
    'A prazo',
    'Outro',
];
const NFE_STATUS = ['Sem NF', 'Emitida', 'Cancelada'];
const PAGAMENTO_STATUS = ['Pendente', 'Pago', 'Anulado'];
const TIPOS_ENTREGA = ['frota', 'retirada', 'externo', 'a_definir'];

let tableReadyPromise = null;

async function ensurePedidosTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedidos (
                    id SERIAL PRIMARY KEY,
                    numero VARCHAR(30),
                    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
                    data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
                    data_entrega DATE,
                    status VARCHAR(30) NOT NULL DEFAULT 'Rascunho',
                    forma_pagamento VARCHAR(60),
                    desconto NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    observacoes TEXT,
                    estoque_baixado BOOLEAN NOT NULL DEFAULT FALSE,
                    created_by VARCHAR(120),
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                ALTER TABLE pedidos
                    ADD COLUMN IF NOT EXISTS veiculo_id INTEGER,
                    ADD COLUMN IF NOT EXISTS tipo_entrega VARCHAR(20) NOT NULL DEFAULT 'a_definir',
                    ADD COLUMN IF NOT EXISTS endereco_entrega TEXT,
                    ADD COLUMN IF NOT EXISTS cidade_entrega VARCHAR(120),
                    ADD COLUMN IF NOT EXISTS uf_entrega VARCHAR(2),
                    ADD COLUMN IF NOT EXISTS cep_entrega VARCHAR(12),
                    ADD COLUMN IF NOT EXISTS contato_entrega VARCHAR(150),
                    ADD COLUMN IF NOT EXISTS telefone_entrega VARCHAR(30),
                    ADD COLUMN IF NOT EXISTS nfe_numero VARCHAR(40),
                    ADD COLUMN IF NOT EXISTS nfe_chave VARCHAR(60),
                    ADD COLUMN IF NOT EXISTS nfe_status VARCHAR(20) DEFAULT 'Sem NF',
                    ADD COLUMN IF NOT EXISTS nfe_data DATE,
                    ADD COLUMN IF NOT EXISTS frete NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS data_carregamento DATE,
                    ADD COLUMN IF NOT EXISTS representante_id INTEGER,
                    ADD COLUMN IF NOT EXISTS origem VARCHAR(20) NOT NULL DEFAULT 'admin',
                    ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT
            `);

            await pool.query(`
                UPDATE pedidos
                SET tipo_entrega = 'frota'
                WHERE veiculo_id IS NOT NULL
                  AND (tipo_entrega IS NULL OR tipo_entrega = 'a_definir')
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_itens (
                    id SERIAL PRIMARY KEY,
                    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                    produto_id INTEGER NOT NULL REFERENCES produtos(id),
                    quantidade NUMERIC(12, 2) NOT NULL,
                    preco_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    unidade VARCHAR(20) DEFAULT 'un',
                    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS pedido_pagamentos (
                    id SERIAL PRIMARY KEY,
                    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                    forma VARCHAR(60) NOT NULL,
                    valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
                    status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
                    observacao TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                ALTER TABLE pedido_pagamentos
                    ADD COLUMN IF NOT EXISTS forma_id INTEGER,
                    ADD COLUMN IF NOT EXISTS prazo_dias INTEGER,
                    ADD COLUMN IF NOT EXISTS juros_percent NUMERIC(8, 2) NOT NULL DEFAULT 0
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS pedidos_cliente_idx ON pedidos (cliente_id)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS pedidos_data_idx ON pedidos (data_pedido DESC, id DESC)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS pedido_itens_pedido_idx ON pedido_itens (pedido_id)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS pedido_pagamentos_pedido_idx ON pedido_pagamentos (pedido_id)
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
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value) {
    const raw = String(value || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return null;
}

function toDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getUTCFullYear();
        const m = String(value.getUTCMonth() + 1).padStart(2, '0');
        const d = String(value.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return null;
}

function getActor(req) {
    return req.session?.user?.username
        || req.session?.user?.full_name
        || req.session?.username
        || null;
}

function parseItens(body) {
    const source = Array.isArray(body?.itens) ? body.itens : [];
    return source
        .map((item) => ({
            produto_id: Number(item.produto_id),
            quantidade: toNumber(item.quantidade, 0),
            preco_unitario: toNumber(item.preco_unitario, 0),
            unidade: String(item.unidade || 'un').trim() || 'un',
        }))
        .filter((item) => (
            Number.isInteger(item.produto_id)
            && item.produto_id > 0
            && item.quantidade > 0
        ))
        .map((item) => ({
            ...item,
            subtotal: Number((item.quantidade * item.preco_unitario).toFixed(2)),
        }));
}

function parsePagamentos(body) {
    const source = Array.isArray(body?.pagamentos) ? body.pagamentos : [];
    return source
        .map((item) => {
            const forma = FORMAS_PAGAMENTO.includes(item.forma)
                ? item.forma
                : String(item.forma || '').trim();
            const prazoNum = Number(item.prazo_dias);
            const prazoDias = Number.isInteger(prazoNum) && prazoNum > 0 ? prazoNum : null;
            return {
                forma,
                forma_id: item.forma_id ? Number(item.forma_id) : null,
                valor: toNumber(item.valor, 0),
                status: PAGAMENTO_STATUS.includes(item.status) ? item.status : 'Pendente',
                observacao: String(item.observacao || '').trim() || null,
                prazo_dias: prazoDias,
                juros_percent: Math.max(0, toNumber(item.juros_percent, 0)),
            };
        })
        .filter((item) => item.forma && item.valor > 0);
}

function calcTotais(itens, desconto, frete = 0) {
    const subtotal = itens.reduce((acc, item) => acc + toNumber(item.subtotal, 0), 0);
    const desc = Math.max(0, Math.min(toNumber(desconto, 0), subtotal));
    const freteValor = Math.max(0, toNumber(frete, 0));
    const total = Number((subtotal - desc + freteValor).toFixed(2));
    return {
        subtotal: Number(subtotal.toFixed(2)),
        desconto: Number(desc.toFixed(2)),
        frete: Number(freteValor.toFixed(2)),
        total,
    };
}

function validatePagamentos(pagamentos, total) {
    if (!pagamentos.length) {
        throw Object.assign(new Error('Informe ao menos uma forma de pagamento.'), { status: 400 });
    }
    const soma = Number(pagamentos.reduce((acc, item) => acc + item.valor, 0).toFixed(2));
    if (Math.abs(soma - total) > 0.01) {
        throw Object.assign(
            new Error(`A soma dos pagamentos (R$ ${soma.toFixed(2)}) deve fechar o total do pedido (R$ ${total.toFixed(2)}).`),
            { status: 400 }
        );
    }
}

function parseHeaderFields(body) {
    const veiculoRaw = body.veiculo_id;
    const veiculoId = veiculoRaw === '' || veiculoRaw === null || veiculoRaw === undefined
        ? null
        : Number(veiculoRaw);

    let tipoEntrega = String(body.tipo_entrega || '').trim().toLowerCase();
    if (!TIPOS_ENTREGA.includes(tipoEntrega)) {
        tipoEntrega = Number.isInteger(veiculoId) && veiculoId > 0 ? 'frota' : 'a_definir';
    }

    const usaFrota = tipoEntrega === 'frota';

    return {
        tipo_entrega: tipoEntrega,
        veiculo_id: usaFrota && Number.isInteger(veiculoId) && veiculoId > 0 ? veiculoId : null,
        endereco_entrega: String(body.endereco_entrega || '').trim() || null,
        cidade_entrega: String(body.cidade_entrega || '').trim() || null,
        uf_entrega: String(body.uf_entrega || '').trim().toUpperCase().slice(0, 2) || null,
        cep_entrega: String(body.cep_entrega || '').trim() || null,
        contato_entrega: String(body.contato_entrega || '').trim() || null,
        telefone_entrega: String(body.telefone_entrega || '').trim() || null,
        nfe_numero: String(body.nfe_numero || '').trim() || null,
        nfe_chave: String(body.nfe_chave || '').trim() || null,
        nfe_status: NFE_STATUS.includes(body.nfe_status) ? body.nfe_status : 'Sem NF',
        nfe_data: normalizeDate(body.nfe_data),
    };
}

async function pedidoTemNfeDoSistema(pedidoId, client = pool) {
    try {
        const [rows] = await client.query(
            'SELECT id FROM nfe_emissoes WHERE pedido_id = ? ORDER BY id DESC LIMIT 1',
            [pedidoId]
        );
        return rows.length > 0;
    } catch (_error) {
        return false;
    }
}

async function fetchPedidoCompleto(id) {
    const [pedidos] = await pool.query(`
        SELECT
            p.*,
            c.nome_razao_social AS cliente_nome,
            c.cpf_cnpj AS cliente_documento,
            c.telefone_principal AS cliente_telefone,
            c.email_contato AS cliente_email,
            c.endereco AS cliente_endereco,
            c.numero AS cliente_numero,
            c.bairro AS cliente_bairro,
            c.cidade AS cliente_cidade,
            c.estado AS cliente_uf,
            c.cep AS cliente_cep,
            f.placa AS veiculo_placa,
            f.modelo AS veiculo_modelo,
            f.marca AS veiculo_marca,
            f.motorista AS veiculo_motorista
        FROM pedidos p
        INNER JOIN clientes c ON c.id = p.cliente_id
        LEFT JOIN frota f ON f.id = p.veiculo_id
        WHERE p.id = ?
    `, [id]);

    if (!pedidos.length) return null;

    const pedido = pedidos[0];
    const [itens] = await pool.query(`
        SELECT
            i.*,
            pr.nome AS produto_nome,
            pr.codigo AS produto_codigo,
            pr.estoque AS estoque_atual
        FROM pedido_itens i
        INNER JOIN produtos pr ON pr.id = i.produto_id
        WHERE i.pedido_id = ?
        ORDER BY i.id
    `, [id]);

    const [pagamentos] = await pool.query(`
        SELECT id, forma, forma_id, valor, status, observacao, prazo_dias, juros_percent, criado_em
        FROM pedido_pagamentos
        WHERE pedido_id = ?
        ORDER BY id
    `, [id]);

    const pedidoCancelado = pedido.status === 'Cancelado';
    if (pedidoCancelado) {
        if (pagamentos.length > 0) {
            pagamentos.forEach(p => { p.status = 'Anulado'; });
        } else {
            pagamentos.push({
                id: 0,
                forma: pedido.forma_pagamento || 'Dinheiro',
                valor: 0,
                status: 'Anulado',
                observacao: 'Pedido cancelado',
            });
        }
    }

    const totais = calcTotais(itens, pedido.desconto, pedido.frete);
    const pagamentoSoma = Number(pagamentos.reduce((acc, item) => acc + toNumber(item.valor, 0), 0).toFixed(2));
    const nfeDoSistema = await pedidoTemNfeDoSistema(id);

    return {
        ...pedido,
        data_pedido: toDateOnly(pedido.data_pedido),
        data_entrega: toDateOnly(pedido.data_entrega),
        data_carregamento: toDateOnly(pedido.data_carregamento),
        nfe_data: toDateOnly(pedido.nfe_data),
        estoque_baixado: Boolean(pedido.estoque_baixado),
        nfe_do_sistema: nfeDoSistema,
        itens,
        pagamentos,
        pagamento_soma: pagamentoSoma,
        situacao: pedido.status,
        ...totais,
    };
}

async function applyEstoqueSaida(client, itens, { dataMovimento, observacao, actor, pedidoId = null }) {
    for (const item of itens) {
        const quantidade = toNumber(item.quantidade, 0);
        if (quantidade <= 0) continue;

        const [produtos] = await client.query(
            'SELECT id, nome, estoque FROM produtos WHERE id = ? FOR UPDATE',
            [item.produto_id]
        );
        if (!produtos.length) {
            throw Object.assign(new Error(`Produto #${item.produto_id} não encontrado.`), { status: 404 });
        }

        const produto = produtos[0];
        const estoqueAtual = toNumber(produto.estoque, 0);
        const saldoApos = Number((estoqueAtual - quantidade).toFixed(2));
        await client.query(
            'UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
            [saldoApos, item.produto_id]
        );
        await client.query(`
            INSERT INTO estoque_movimentos (
                produto_id, tipo, motivo, quantidade, data_movimento,
                observacao, saldo_apos, created_by, pedido_id
            ) VALUES (?, 'saida', 'pedido', ?, ?, ?, ?, ?, ?)
        `, [
            item.produto_id,
            quantidade,
            dataMovimento,
            observacao,
            saldoApos,
            actor,
            pedidoId || null,
        ]);
    }
}

async function applyEstoqueEntrada(client, itens, { dataMovimento, observacao, actor }) {
    for (const item of itens) {
        const quantidade = toNumber(item.quantidade, 0);
        if (quantidade <= 0) continue;

        const [produtos] = await client.query(
            'SELECT id, nome, estoque FROM produtos WHERE id = ? FOR UPDATE',
            [item.produto_id]
        );
        if (!produtos.length) {
            throw Object.assign(new Error(`Produto #${item.produto_id} não encontrado.`), { status: 404 });
        }

        const produto = produtos[0];
        const estoqueAtual = toNumber(produto.estoque, 0);
        const saldoApos = Number((estoqueAtual + quantidade).toFixed(2));

        await client.query(
            'UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
            [saldoApos, item.produto_id]
        );
        await client.query(`
            INSERT INTO estoque_movimentos (
                produto_id, tipo, motivo, quantidade, data_movimento,
                observacao, saldo_apos, created_by
            ) VALUES (?, 'entrada', 'outro', ?, ?, ?, ?, ?)
        `, [
            item.produto_id,
            quantidade,
            dataMovimento,
            observacao,
            saldoApos,
            actor,
        ]);
    }
}

async function replaceItens(client, pedidoId, itens) {
    await client.query('DELETE FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
    for (const item of itens) {
        await client.query(`
            INSERT INTO pedido_itens (
                pedido_id, produto_id, quantidade, preco_unitario, unidade, subtotal
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
            pedidoId,
            item.produto_id,
            item.quantidade,
            item.preco_unitario,
            item.unidade,
            item.subtotal,
        ]);
    }
}

async function replacePagamentos(client, pedidoId, pagamentos) {
    await client.query('DELETE FROM pedido_pagamentos WHERE pedido_id = ?', [pedidoId]);
    for (const item of pagamentos) {
        await client.query(`
            INSERT INTO pedido_pagamentos (
                pedido_id, forma, forma_id, valor, status, observacao, prazo_dias, juros_percent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            pedidoId,
            item.forma,
            item.forma_id || null,
            item.valor,
            item.status,
            item.observacao,
            item.prazo_dias || null,
            item.juros_percent || 0,
        ]);
    }
}

router.use(isAuthenticated);

router.get('/', async (req, res) => {
    try {
        await ensurePedidosTables();

        const dataEntrega = normalizeDate(req.query.data_entrega);
        const dataLogistica = normalizeDate(req.query.data);
        const dataDe = normalizeDate(req.query.de);
        const dataAte = normalizeDate(req.query.ate);
        const incluirCarregamento = String(req.query.incluir_carregamento || '') === '1'
            || String(req.query.incluir_carregamento || '') === 'true'
            || Boolean(dataLogistica);
        const filters = [];
        const params = [];

        if (dataLogistica) {
            filters.push('(p.data_entrega = ? OR p.data_carregamento = ?)');
            params.push(dataLogistica, dataLogistica);
        } else if (dataEntrega) {
            if (incluirCarregamento) {
                filters.push('(p.data_entrega = ? OR p.data_carregamento = ?)');
                params.push(dataEntrega, dataEntrega);
            } else {
                filters.push('p.data_entrega = ?');
                params.push(dataEntrega);
            }
        } else if (dataDe || dataAte) {
            if (incluirCarregamento) {
                const parts = [];
                if (dataDe && dataAte) {
                    parts.push('(p.data_entrega >= ? AND p.data_entrega <= ?)');
                    params.push(dataDe, dataAte);
                    parts.push('(p.data_carregamento >= ? AND p.data_carregamento <= ?)');
                    params.push(dataDe, dataAte);
                } else if (dataDe) {
                    parts.push('p.data_entrega >= ?');
                    params.push(dataDe);
                    parts.push('p.data_carregamento >= ?');
                    params.push(dataDe);
                } else {
                    parts.push('p.data_entrega <= ?');
                    params.push(dataAte);
                    parts.push('p.data_carregamento <= ?');
                    params.push(dataAte);
                }
                filters.push(`(${parts.join(' OR ')})`);
            } else {
                if (dataDe) {
                    filters.push('p.data_entrega >= ?');
                    params.push(dataDe);
                }
                if (dataAte) {
                    filters.push('p.data_entrega <= ?');
                    params.push(dataAte);
                }
            }
        }

        if (String(req.query.somente_ativos || '') === '1' || String(req.query.somente_ativos || '') === 'true') {
            filters.push("p.status <> 'Cancelado'");
        }

        const { ensureRepresentanteSupport } = require('../utils/representanteAccess');
        await ensureRepresentanteSupport(pool);
        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.isRepresentante) {
            if (!ctx.representanteId) {
                return res.status(403).json({ message: 'Representante sem cadastro vinculado.' });
            }
            filters.push('p.representante_id = ?');
            params.push(ctx.representanteId);
        }

        const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

        const [rows] = await pool.query(`
            SELECT
                p.id,
                p.numero,
                p.cliente_id,
                c.nome_razao_social AS cliente_nome,
                TO_CHAR(p.data_pedido, 'YYYY-MM-DD') AS data_pedido,
                TO_CHAR(p.data_entrega, 'YYYY-MM-DD') AS data_entrega,
                TO_CHAR(p.data_carregamento, 'YYYY-MM-DD') AS data_carregamento,
                p.status,
                p.motivo_cancelamento,
                p.forma_pagamento,
                p.desconto,
                p.frete,
                p.estoque_baixado,
                p.nfe_numero,
                p.nfe_status,
                p.veiculo_id,
                p.tipo_entrega,
                p.origem,
                p.representante_id,
                r.nome AS representante_nome,
                f.placa AS veiculo_placa,
                f.motorista AS veiculo_motorista,
                f.modelo AS veiculo_modelo,
                p.endereco_entrega,
                p.cidade_entrega,
                p.uf_entrega,
                p.cep_entrega,
                p.contato_entrega,
                p.telefone_entrega,
                p.criado_em,
                COALESCE((
                    SELECT SUM(i.subtotal)
                    FROM pedido_itens i
                    WHERE i.pedido_id = p.id
                ), 0) AS subtotal,
                COALESCE((
                    SELECT SUM(pg.valor)
                    FROM pedido_pagamentos pg
                    WHERE pg.pedido_id = p.id
                ), 0) AS pagamento_soma,
                COALESCE((
                    SELECT STRING_AGG(DISTINCT pg.forma, ', ')
                    FROM pedido_pagamentos pg
                    WHERE pg.pedido_id = p.id
                ), p.forma_pagamento) AS pagamentos_resumo,
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM pedido_pagamentos pg
                    WHERE pg.pedido_id = p.id
                      AND LOWER(COALESCE(pg.status, 'Pendente')) = 'pendente'
                ), 0) AS pagamentos_pendentes,
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM pedido_pagamentos pg
                    WHERE pg.pedido_id = p.id
                      AND LOWER(COALESCE(pg.status, 'Pendente')) = 'pendente'
                      AND pg.prazo_dias IS NOT NULL
                      AND pg.prazo_dias > 0
                      AND (
                          CASE
                              WHEN LOWER(COALESCE(pg.forma, '')) LIKE '%cart%'
                                   AND pg.prazo_dias BETWEEN 1 AND 12
                                  THEN (p.data_pedido + (pg.prazo_dias * INTERVAL '1 month'))::date
                              ELSE (p.data_pedido + (pg.prazo_dias * INTERVAL '1 day'))::date
                          END
                      ) < CURRENT_DATE
                ), 0) AS pagamentos_atrasados,
                COALESCE((
                    SELECT COUNT(*)::int
                    FROM pedido_pagamentos pg
                    WHERE pg.pedido_id = p.id
                      AND LOWER(COALESCE(pg.status, '')) = 'anulado'
                ), 0) AS pagamentos_anulados
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            LEFT JOIN frota f ON f.id = p.veiculo_id
            LEFT JOIN representantes r ON p.representante_id = r.id
            ${whereSql}
            ORDER BY
                CASE WHEN p.data_entrega IS NULL THEN 1 ELSE 0 END,
                p.data_entrega ASC,
                f.placa ASC NULLS LAST,
                p.id DESC
        `, params);

        const data = rows.map((row) => {
            const subtotal = toNumber(row.subtotal, 0);
            const desconto = toNumber(row.desconto, 0);
            const frete = toNumber(row.frete, 0);
            const pagamentosPendentes = Number(row.pagamentos_pendentes) || 0;
            const pagamentosAtrasados = Number(row.pagamentos_atrasados) || 0;
            const pagamentosAnulados = Number(row.pagamentos_anulados) || 0;
            const status = row.status || 'Rascunho';
            const pedidoCancelado = status === 'Cancelado';
            const temPagamentoAnulado = pedidoCancelado || pagamentosAnulados > 0;
            const temPagamentoPendente = !temPagamentoAnulado && pagamentosPendentes > 0;
            const temPagamentoAtrasado = !temPagamentoAnulado && pagamentosAtrasados > 0;
            let situacao = status;

            if (status === 'Cancelado') situacao = 'Cancelado';
            else if (status === 'Entregue') situacao = 'Entregue';
            else if (status === 'Pré-venda') situacao = 'Pré-venda';
            else if (status === 'Em análise') situacao = 'Em análise';
            else if (status === 'Confirmado') situacao = 'Confirmado';
            else if (status === 'Aguardando carregamento') situacao = 'Aguardando carregamento';
            else if (status === 'Aguardando entrega') situacao = 'Aguardando entrega';
            else if (status === 'Aguardando pagamento') situacao = 'Aguardando pagamento';
            else if (temPagamentoAtrasado) situacao = 'Pagamento em atraso';
            else if (status === 'Rascunho' || status === 'Pendente') situacao = 'Pendente';
            else if (temPagamentoPendente) situacao = 'Aguardando pagamento';

            return {
                ...row,
                motivo_cancelamento: row.motivo_cancelamento || null,
                estoque_baixado: Boolean(row.estoque_baixado),
                subtotal,
                frete,
                total: Number((subtotal - desconto + frete).toFixed(2)),
                pagamento_soma: toNumber(row.pagamento_soma, 0),
                pagamentos_pendentes: temPagamentoAnulado ? 0 : pagamentosPendentes,
                pagamentos_atrasados: temPagamentoAnulado ? 0 : pagamentosAtrasados,
                pagamentos_anulados: pagamentosAnulados,
                tem_pagamento_pendente: temPagamentoPendente,
                tem_pagamento_atrasado: temPagamentoAtrasado,
                tem_pagamento_anulado: temPagamentoAnulado,
                situacao,
            };
        });

        res.json(data);
    } catch (error) {
        logger.error('Erro ao listar pedidos', { module: 'pedidosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar pedidos.' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        await ensurePedidosTables();
        const pedido = await fetchPedidoCompleto(Number(req.params.id));
        if (!pedido) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }
        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.representanteId && Number(pedido.representante_id) !== ctx.representanteId) {
            return res.status(403).json({ message: 'Pedido fora da sua carteira.' });
        }
        res.json(pedido);
    } catch (error) {
        logger.error('Erro ao buscar pedido', { module: 'pedidosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao buscar pedido.' });
    }
});

router.post('/', async (req, res) => {
    const client = await pool.getConnection();

    try {
        await ensurePedidosTables();

        const clienteId = Number(req.body.cliente_id);
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return res.status(400).json({ message: 'Selecione um cliente.' });
        }

        const itens = parseItens(req.body);
        if (!itens.length) {
            return res.status(400).json({ message: 'Informe ao menos um produto com quantidade.' });
        }

        const ctx = await resolveRepresentanteContext(pool, req);
        if (ctx.isRepresentante && !ctx.representanteId) {
            return res.status(403).json({ message: 'Representante sem cadastro vinculado.' });
        }

        let status = STATUS_VALIDOS.includes(req.body.status) ? req.body.status : 'Rascunho';
        // Pré-venda mobile: representante envia como pré-venda para a fábrica confirmar
        if (ctx.isRepresentante) {
            status = 'Pré-venda';
        }
        if (status === 'Cancelado') {
            return res.status(400).json({ message: 'Não é possível criar um pedido já cancelado.' });
        }

        const dataPedido = normalizeDate(req.body.data_pedido) || todayIso();
        const dataEntrega = normalizeDate(req.body.data_entrega);
        const dataCarregamento = normalizeDate(req.body.data_carregamento);
        const desconto = Math.max(0, toNumber(req.body.desconto, 0));
        const frete = Math.max(0, toNumber(req.body.frete, 0));
        const observacoes = String(req.body.observacoes || '').trim() || null;
        const header = parseHeaderFields(req.body);
        const pagamentos = parsePagamentos(req.body);
        const totais = calcTotais(itens, desconto, frete);
        // Representante (mobile) envia pré-venda sem pagamento; fábrica define depois
        if (!ctx.isRepresentante) {
            validatePagamentos(pagamentos, totais.total);
        }

        const formaPagamento = pagamentos[0]?.forma
            || (FORMAS_PAGAMENTO.includes(req.body.forma_pagamento) ? req.body.forma_pagamento : null);
        const actor = getActor(req);
        const deveBaixar = ctx.isRepresentante ? false : STATUS_BAIXA_ESTOQUE.has(status);
        const origem = ctx.isRepresentante
            ? 'mobile'
            : (String(req.body.origem || 'admin').trim() || 'admin');
        const representanteId = ctx.representanteId
            || (req.body.representante_id ? Number(req.body.representante_id) : null);

        await client.beginTransaction();

        const [clienteRows] = await client.query(
            'SELECT id, representante_id, status_credito FROM clientes WHERE id = ?',
            [clienteId]
        );
        if (!clienteRows.length) {
            throw Object.assign(new Error('Cliente não encontrado.'), { status: 404 });
        }
        if (ctx.representanteId) {
            const credito = String(clienteRows[0].status_credito || '').trim().toLowerCase();
            if (credito === 'bloqueado') {
                throw Object.assign(new Error('Crédito bloqueado. Não é possível criar pedido para este cliente.'), { status: 403 });
            }
            const carteiraId = Number(clienteRows[0].representante_id) || null;
            if (carteiraId && carteiraId !== ctx.representanteId) {
                throw Object.assign(new Error('Cliente fora da sua carteira.'), { status: 403 });
            }
            if (!carteiraId) {
                await client.query(
                    `UPDATE clientes
                     SET representante_id = ?, atualizado_em = CURRENT_TIMESTAMP
                     WHERE id = ? AND representante_id IS NULL`,
                    [ctx.representanteId, clienteId]
                );
            }
        }

        if (header.veiculo_id) {
            const [veiculos] = await client.query(
                'SELECT id FROM frota WHERE id = ?',
                [header.veiculo_id]
            );
            if (!veiculos.length) {
                throw Object.assign(new Error('Veículo não encontrado.'), { status: 404 });
            }
        }

        const [insertResult] = await client.query(`
            INSERT INTO pedidos (
                cliente_id, data_pedido, data_entrega, data_carregamento, status, forma_pagamento,
                desconto, frete, observacoes, estoque_baixado, created_by,
                tipo_entrega, veiculo_id, endereco_entrega, cidade_entrega, uf_entrega, cep_entrega,
                contato_entrega, telefone_entrega, nfe_numero, nfe_chave, nfe_status, nfe_data,
                representante_id, origem
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            clienteId,
            dataPedido,
            dataEntrega,
            dataCarregamento,
            status,
            formaPagamento,
            desconto,
            frete,
            observacoes,
            false,
            actor,
            header.tipo_entrega,
            header.veiculo_id,
            header.endereco_entrega,
            header.cidade_entrega,
            header.uf_entrega,
            header.cep_entrega,
            header.contato_entrega,
            header.telefone_entrega,
            header.nfe_numero,
            header.nfe_chave,
            header.nfe_status,
            header.nfe_data,
            representanteId || null,
            origem,
        ]);

        const pedidoId = insertResult.insertId;
        const numero = `PED-${String(pedidoId).padStart(5, '0')}`;
        await client.query('UPDATE pedidos SET numero = ? WHERE id = ?', [numero, pedidoId]);
        await replaceItens(client, pedidoId, itens);
        await replacePagamentos(client, pedidoId, pagamentos);

        if (deveBaixar) {
            await applyEstoqueSaida(client, itens, {
                dataMovimento: dataPedido,
                observacao: `Pedido ${numero}`,
                actor,
                pedidoId,
            });
            await client.query(
                'UPDATE pedidos SET estoque_baixado = TRUE, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [pedidoId]
            );
        }

        await client.commit();
        const pedido = await fetchPedidoCompleto(pedidoId);
        await logAuditoria(req, {
            modulo: 'pedidos',
            acao: STATUS_BAIXA_ESTOQUE.has(status) && status !== 'Entregue' ? 'confirmar' : 'criar',
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `Criou pedido ${numero} (${status}) — total R$ ${Number(totais.total).toFixed(2)}`,
            dados: { status, total: totais.total, cliente_id: clienteId },
        });
        res.status(201).json({
            message: 'Pedido criado com sucesso.',
            pedido,
        });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        logger.error('Erro ao criar pedido', { module: 'pedidosRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao criar pedido.',
        });
    } finally {
        client.release();
    }
});

router.put('/:id', async (req, res) => {
    const client = await pool.getConnection();

    try {
        await ensurePedidosTables();
        const pedidoId = Number(req.params.id);

        const [atuais] = await client.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
        if (!atuais.length) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const atual = atuais[0];
        if (atual.status === 'Cancelado') {
            return res.status(400).json({ message: 'Pedido cancelado não pode ser editado.' });
        }

        const clienteId = Number(req.body.cliente_id);
        if (!Number.isInteger(clienteId) || clienteId <= 0) {
            return res.status(400).json({ message: 'Selecione um cliente.' });
        }

        const itens = parseItens(req.body);
        if (!itens.length) {
            return res.status(400).json({ message: 'Informe ao menos um produto com quantidade.' });
        }

        const status = STATUS_VALIDOS.includes(req.body.status) ? req.body.status : atual.status;
        const dataPedido = normalizeDate(req.body.data_pedido) || String(atual.data_pedido).slice(0, 10);
        const dataEntrega = normalizeDate(req.body.data_entrega);
        const dataCarregamento = normalizeDate(req.body.data_carregamento);
        const desconto = Math.max(0, toNumber(req.body.desconto, 0));
        const frete = Math.max(0, toNumber(req.body.frete, 0));
        const nfeDoSistema = await pedidoTemNfeDoSistema(pedidoId, client);
        const observacoes = String(req.body.observacoes || '').trim() || null;
        const header = parseHeaderFields(req.body);
        if (nfeDoSistema) {
            // NF-e emitida pelo módulo do sistema: campos fiscais não são editáveis no pedido
            header.nfe_numero = atual.nfe_numero || null;
            header.nfe_chave = atual.nfe_chave || null;
            header.nfe_status = atual.nfe_status || 'Sem NF';
            header.nfe_data = atual.nfe_data
                ? String(atual.nfe_data).slice(0, 10)
                : null;
        }
        let pagamentos = parsePagamentos(req.body);
        const totais = calcTotais(itens, desconto, frete);

        // Cancelamento: pagamento anulado — pedido não avançou
        const motivoCancelamento = String(req.body.motivo_cancelamento || '').trim()
            || String(atual.motivo_cancelamento || '').trim();
        if (status === 'Cancelado') {
            if (!motivoCancelamento) {
                return res.status(400).json({ message: 'Informe o motivo do cancelamento.' });
            }
            pagamentos = pagamentos.map((item) => ({
                ...item,
                status: 'Anulado',
                observacao: item.observacao
                    || 'Anulado automaticamente pelo cancelamento do pedido',
            }));
        }

        validatePagamentos(pagamentos, totais.total);

        const formaPagamento = pagamentos[0]?.forma
            || (FORMAS_PAGAMENTO.includes(req.body.forma_pagamento) ? req.body.forma_pagamento : null);
        const actor = getActor(req);
        const numero = atual.numero || `PED-${String(pedidoId).padStart(5, '0')}`;
        const jaBaixado = Boolean(atual.estoque_baixado);

        await client.beginTransaction();

        if (header.veiculo_id) {
            const [veiculos] = await client.query(
                'SELECT id FROM frota WHERE id = ?',
                [header.veiculo_id]
            );
            if (!veiculos.length) {
                throw Object.assign(new Error('Veículo não encontrado.'), { status: 404 });
            }
        }

        const [itensAntigos] = await client.query(
            'SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ?',
            [pedidoId]
        );

        if (jaBaixado && status !== 'Cancelado') {
            await applyEstoqueEntrada(client, itensAntigos, {
                dataMovimento: dataPedido,
                observacao: `Ajuste pedido ${numero} (edição)`,
                actor,
            });
        }

        if (status === 'Cancelado' && jaBaixado) {
            await applyEstoqueEntrada(client, itensAntigos, {
                dataMovimento: todayIso(),
                observacao: `Estorno pedido ${numero} (cancelamento)`,
                actor,
            });
        }

        await client.query(`
            UPDATE pedidos SET
                cliente_id = ?,
                data_pedido = ?,
                data_entrega = ?,
                data_carregamento = ?,
                status = ?,
                forma_pagamento = ?,
                desconto = ?,
                frete = ?,
                observacoes = ?,
                motivo_cancelamento = ?,
                tipo_entrega = ?,
                veiculo_id = ?,
                endereco_entrega = ?,
                cidade_entrega = ?,
                uf_entrega = ?,
                cep_entrega = ?,
                contato_entrega = ?,
                telefone_entrega = ?,
                nfe_numero = ?,
                nfe_chave = ?,
                nfe_status = ?,
                nfe_data = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            clienteId,
            dataPedido,
            dataEntrega,
            dataCarregamento,
            status,
            formaPagamento,
            desconto,
            frete,
            observacoes,
            status === 'Cancelado' ? motivoCancelamento : null,
            header.tipo_entrega,
            header.veiculo_id,
            header.endereco_entrega,
            header.cidade_entrega,
            header.uf_entrega,
            header.cep_entrega,
            header.contato_entrega,
            header.telefone_entrega,
            header.nfe_numero,
            header.nfe_chave,
            header.nfe_status,
            header.nfe_data,
            pedidoId,
        ]);

        await replaceItens(client, pedidoId, itens);
        await replacePagamentos(client, pedidoId, pagamentos);

        let estoqueBaixado = jaBaixado;
        if (status === 'Cancelado') {
            estoqueBaixado = false;
        } else if (STATUS_BAIXA_ESTOQUE.has(status)) {
            await applyEstoqueSaida(client, itens, {
                dataMovimento: dataPedido,
                observacao: `Pedido ${numero}`,
                actor,
                pedidoId,
            });
            estoqueBaixado = true;
        } else if (status === 'Rascunho' || status === 'Pendente' || status === 'Aguardando pagamento') {
            estoqueBaixado = false;
        }

        await client.query(
            'UPDATE pedidos SET estoque_baixado = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
            [estoqueBaixado, pedidoId]
        );

        await client.commit();
        const pedido = await fetchPedidoCompleto(pedidoId);

        let acao = 'editar';
        if (status !== atual.status) {
            if (status === 'Confirmado' || status === 'Aguardando entrega' || status === 'Aguardando carregamento') {
                acao = 'confirmar';
            } else if (status === 'Entregue') acao = 'entregar';
            else if (status === 'Cancelado') acao = 'cancelar';
            else if (status === 'Aguardando pagamento') acao = 'editar';
            else if (status === 'Rascunho' || status === 'Pendente') acao = 'editar';
        }

        const motivoDesc = (status === 'Cancelado' && motivoCancelamento)
            ? ` (Motivo: ${motivoCancelamento})`
            : '';
        await logAuditoria(req, {
            modulo: 'pedidos',
            acao,
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: status !== atual.status
                ? `Alterou pedido ${numero}: ${atual.status} → ${status}${motivoDesc}`
                : `Alterou pedido ${numero}`,
            dados: {
                status_anterior: atual.status,
                status,
                motivo_cancelamento: status === 'Cancelado' ? motivoCancelamento : null,
                total: totais.total,
            },
        });

        res.json({
            message: 'Pedido atualizado com sucesso.',
            pedido,
        });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        logger.error('Erro ao atualizar pedido', { module: 'pedidosRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao atualizar pedido.',
        });
    } finally {
        client.release();
    }
});

router.patch('/:id/status', async (req, res) => {
    const client = await pool.getConnection();
    try {
        await ensurePedidosTables();
        const pedidoId = Number(req.params.id);
        let { status, motivo_cancelamento } = req.body;
        motivo_cancelamento = String(motivo_cancelamento || '').trim() || null;
        
        const norm = String(status || '').trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (norm === 'prevenda' || norm === 'pre-venda' || norm === 'pre venda') {
            status = 'Pré-venda';
        } else if (norm === 'em analise' || norm === 'em-analise') {
            status = 'Em análise';
        }

        if (!STATUS_VALIDOS.includes(status)) {
            return res.status(400).json({ message: 'Status inválido.' });
        }

        await client.beginTransaction();

        const [pedidos] = await client.query(
            'SELECT id, numero, status, estoque_baixado, data_pedido, motivo_cancelamento FROM pedidos WHERE id = ? FOR UPDATE',
            [pedidoId]
        );
        if (!pedidos.length) {
            await client.rollback();
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const atual = pedidos[0];
        const anterior = atual.status;
        const numero = atual.numero || `PED-${String(pedidoId).padStart(5, '0')}`;
        const jaBaixado = Boolean(atual.estoque_baixado);
        const actor = getActor(req);

        if (status === 'Cancelado') {
            const motivoFinal = motivo_cancelamento || String(atual.motivo_cancelamento || '').trim() || null;
            if (!motivoFinal) {
                await client.rollback();
                return res.status(400).json({ message: 'Informe o motivo do cancelamento.' });
            }
            motivo_cancelamento = motivoFinal;
        }

        let novoEstoqueBaixado = jaBaixado;
        if (jaBaixado && (status === 'Cancelado' || status === 'Rascunho' || status === 'Pendente' || status === 'Em análise' || status === 'Pré-venda' || status === 'Aguardando pagamento')) {
            const [itens] = await client.query('SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
            await applyEstoqueEntrada(client, itens, {
                dataMovimento: todayIso(),
                observacao: `Estorno pedido ${numero} (status: ${status})`,
                actor,
            });
            novoEstoqueBaixado = false;
        } else if (!jaBaixado && STATUS_BAIXA_ESTOQUE.has(status)) {
            const [itens] = await client.query('SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ?', [pedidoId]);
            await applyEstoqueSaida(client, itens, {
                dataMovimento: toDateOnly(atual.data_pedido) || todayIso(),
                observacao: `Pedido ${numero} (status: ${status})`,
                actor,
                pedidoId,
            });
            novoEstoqueBaixado = true;
        }

        if (status === 'Cancelado') {
            await client.query(
                'UPDATE pedidos SET status = ?, estoque_baixado = ?, motivo_cancelamento = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [status, novoEstoqueBaixado, motivo_cancelamento, pedidoId]
            );
        } else {
            await client.query(
                'UPDATE pedidos SET status = ?, estoque_baixado = ?, motivo_cancelamento = NULL, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
                [status, novoEstoqueBaixado, pedidoId]
            );
        }

        if (status === 'Cancelado') {
            const [pagRows] = await client.query('SELECT id FROM pedido_pagamentos WHERE pedido_id = ?', [pedidoId]);
            if (pagRows.length > 0) {
                await client.query('UPDATE pedido_pagamentos SET status = ? WHERE pedido_id = ?', ['Anulado', pedidoId]);
            } else {
                await client.query(`
                    INSERT INTO pedido_pagamentos (pedido_id, forma, valor, status, observacao, prazo_dias, juros_percent)
                    VALUES (?, ?, 0, 'Anulado', 'Pedido cancelado', 0, 0)
                `, [pedidoId, atual.forma_pagamento || 'Dinheiro']);
            }
        }

        await client.commit();

        let acao = 'alterar_status';
        if (status === 'Confirmado' || status === 'Aguardando carregamento' || status === 'Aguardando entrega') {
            acao = 'confirmar';
        } else if (status === 'Entregue') {
            acao = 'entregar';
        } else if (status === 'Cancelado') {
            acao = 'cancelar';
        } else if (status === 'Em análise') {
            acao = 'analisar';
        }

        const motivoDesc = (status === 'Cancelado' && (motivo_cancelamento || atual.motivo_cancelamento))
            ? ` (Motivo: ${motivo_cancelamento || atual.motivo_cancelamento})`
            : '';
        await logAuditoria(req, {
            modulo: 'pedidos',
            acao,
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `Alterou status do pedido ${numero}: ${anterior} → ${status}${motivoDesc}`,
            dados: {
                status_anterior: anterior,
                status_novo: status,
                motivo_cancelamento: motivo_cancelamento || null,
                pedido_id: pedidoId,
                numero,
            },
        });

        res.json({ message: 'Status atualizado com sucesso.', status, motivo_cancelamento });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        console.error('Erro ao atualizar status do pedido:', error);
        res.status(error.status || 500).json({ message: error.message || 'Erro ao atualizar status do pedido.' });
    } finally {
        client.release();
    }
});

router.patch('/:id/pagamentos/status', async (req, res) => {
    try {
        await ensurePedidosTables();
        const pedidoId = Number(req.params.id);
        const { status } = req.body;
        if (!['Pendente', 'Pago', 'Anulado'].includes(status)) {
            return res.status(400).json({ message: 'Status de pagamento inválido.' });
        }

        const [pedidos] = await pool.query('SELECT id, numero FROM pedidos WHERE id = ?', [pedidoId]);
        const numero = pedidos[0]?.numero || `PED-${String(pedidoId).padStart(5, '0')}`;

        const [result] = await pool.query('UPDATE pedido_pagamentos SET status = ? WHERE pedido_id = ?', [status, pedidoId]);
        if (result.affectedRows === 0) {
            const [orders] = await pool.query(`
                SELECT p.forma_pagamento, 
                    (SELECT COALESCE(SUM(i.quantidade * i.preco_unitario), 0) FROM pedido_itens i WHERE i.pedido_id = p.id) - COALESCE(p.desconto, 0) + COALESCE(p.frete, 0) AS total
                FROM pedidos p WHERE p.id = ?
            `, [pedidoId]);
            
            if (orders.length > 0) {
                await pool.query(`
                    INSERT INTO pedido_pagamentos (pedido_id, forma, valor, status, observacao, prazo_dias, juros_percent)
                    VALUES (?, ?, ?, ?, '', 0, 0)
                `, [pedidoId, orders[0].forma_pagamento || 'Dinheiro', orders[0].total, status]);
            }
        }

        await logAuditoria(req, {
            modulo: 'pedidos',
            acao: 'alterar_pagamento',
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `Alterou status do pagamento do pedido ${numero} para ${status}`,
            dados: {
                status_pagamento: status,
                pedido_id: pedidoId,
                numero,
            },
        });

        res.json({ message: 'Status de pagamento atualizado com sucesso.' });
    } catch (error) {
        console.error('Erro ao atualizar status de pagamento:', error);
        res.status(500).json({ message: 'Erro ao atualizar status de pagamento.' });
    }
});

router.delete('/:id', async (req, res) => {
    const client = await pool.getConnection();

    try {
        await ensurePedidosTables();
        const pedidoId = Number(req.params.id);

        const [atuais] = await client.query('SELECT * FROM pedidos WHERE id = ?', [pedidoId]);
        if (!atuais.length) {
            return res.status(404).json({ message: 'Pedido não encontrado.' });
        }

        const atual = atuais[0];
        const actor = getActor(req);
        const numero = atual.numero || `PED-${String(pedidoId).padStart(5, '0')}`;

        await client.beginTransaction();

        if (Boolean(atual.estoque_baixado)) {
            const [itens] = await client.query(
                'SELECT produto_id, quantidade FROM pedido_itens WHERE pedido_id = ?',
                [pedidoId]
            );
            await applyEstoqueEntrada(client, itens, {
                dataMovimento: todayIso(),
                observacao: `Estorno pedido ${numero} (exclusão)`,
                actor,
            });
        }

        await client.query('DELETE FROM pedidos WHERE id = ?', [pedidoId]);
        await client.commit();

        await logAuditoria(req, {
            modulo: 'pedidos',
            acao: 'excluir',
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `Excluiu pedido ${numero}`,
            dados: { status: atual.status },
        });

        res.json({ message: 'Pedido excluído com sucesso.' });
    } catch (error) {
        try {
            await client.rollback();
        } catch {
            // ignore
        }
        logger.error('Erro ao excluir pedido', { module: 'pedidosRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir pedido.' });
    } finally {
        client.release();
    }
});

module.exports = router;
