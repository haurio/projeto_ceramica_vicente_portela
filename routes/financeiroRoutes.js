const express = require('express');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');
const { requirePageAccess } = require('../utils/apiAccess');

const router = express.Router();

// Só nas rotas financeiras — nunca em /check-session nem outras rotas do app
router.use('/api/financeiro', requirePageAccess('/financeiro'));

const STATUS_RECEBER = ['Pendente', 'Parcial', 'Recebido', 'Vencido', 'Cancelado'];
const STATUS_PAGAR = ['Pendente', 'Parcial', 'Pago', 'Vencido', 'Cancelado'];

let tableReadyPromise = null;

function toInt(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function toMoney(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : fallback;
}

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

async function ensureFinanceiroTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS financeiro_contas_receber (
                    id SERIAL PRIMARY KEY,
                    descricao VARCHAR(200) NOT NULL,
                    cliente_nome VARCHAR(150),
                    cliente_id INTEGER,
                    categoria VARCHAR(80),
                    valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
                    valor_recebido NUMERIC(14, 2) NOT NULL DEFAULT 0,
                    data_emissao DATE,
                    data_vencimento DATE,
                    data_recebimento DATE,
                    forma_pagamento VARCHAR(80),
                    documento VARCHAR(80),
                    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS financeiro_contas_pagar (
                    id SERIAL PRIMARY KEY,
                    descricao VARCHAR(200) NOT NULL,
                    fornecedor_nome VARCHAR(150),
                    fornecedor_id INTEGER,
                    categoria VARCHAR(80),
                    valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
                    valor_pago NUMERIC(14, 2) NOT NULL DEFAULT 0,
                    data_emissao DATE,
                    data_vencimento DATE,
                    data_pagamento DATE,
                    forma_pagamento VARCHAR(80),
                    documento VARCHAR(80),
                    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',
                    observacoes TEXT,
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_fin_receber_venc ON financeiro_contas_receber (data_vencimento)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_fin_receber_status ON financeiro_contas_receber (status)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_fin_pagar_venc ON financeiro_contas_pagar (data_vencimento)
            `);
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_fin_pagar_status ON financeiro_contas_pagar (status)
            `);

            await seedFinanceiroIfEmpty();
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }
    return tableReadyPromise;
}

async function seedFinanceiroIfEmpty() {
    const [recvCount] = await pool.query('SELECT COUNT(*)::int AS total FROM financeiro_contas_receber');
    if (!recvCount[0]?.total) {
        await pool.query(`
            INSERT INTO financeiro_contas_receber (
                descricao, cliente_nome, categoria, valor, valor_recebido,
                data_emissao, data_vencimento, data_recebimento, forma_pagamento, documento, status, observacoes
            ) VALUES
            ('Venda de tijolos 6 furos', 'Construtora Horizonte', 'Vendas', 4850.00, 0,
             CURRENT_DATE - 5, CURRENT_DATE + 10, NULL, 'Boleto', 'NF-1042', 'Pendente', 'Pedido #184'),
            ('Venda de telhas cerâmicas', 'Materiais São José', 'Vendas', 3120.50, 3120.50,
             CURRENT_DATE - 20, CURRENT_DATE - 5, CURRENT_DATE - 4, 'PIX', 'NF-1038', 'Recebido', NULL),
            ('Serviço de entrega especial', 'Obra Residencial Alfa', 'Serviços', 890.00, 300.00,
             CURRENT_DATE - 2, CURRENT_DATE + 3, NULL, 'Transferência', 'REC-221', 'Parcial', 'Restante até o vencimento'),
            ('Venda de blocos estruturais', 'Construtora Horizonte', 'Vendas', 1560.00, 0,
             CURRENT_DATE - 25, CURRENT_DATE - 5, NULL, 'Boleto', 'NF-1029', 'Vencido', 'Em atraso')
        `);
    }

    const [payCount] = await pool.query('SELECT COUNT(*)::int AS total FROM financeiro_contas_pagar');
    if (!payCount[0]?.total) {
        await pool.query(`
            INSERT INTO financeiro_contas_pagar (
                descricao, fornecedor_nome, categoria, valor, valor_pago,
                data_emissao, data_vencimento, data_pagamento, forma_pagamento, documento, status, observacoes
            ) VALUES
            ('Compra de argila', 'Mineração Vale Norte', 'Insumos', 2200.00, 0,
             CURRENT_DATE - 8, CURRENT_DATE + 7, NULL, 'Boleto', 'NF-F-881', 'Pendente', NULL),
            ('Manutenção empilhadeira', 'Oficina Portela', 'Manutenção', 640.00, 640.00,
             CURRENT_DATE - 15, CURRENT_DATE - 8, CURRENT_DATE - 8, 'PIX', 'OS-55', 'Pago', NULL),
            ('Energia elétrica — fábrica', 'Companhia Elétrica Regional', 'Utilidades', 1875.30, 0,
             CURRENT_DATE - 3, CURRENT_DATE + 2, NULL, 'Débito automático', 'UC-3391', 'Pendente', 'Conta do mês'),
            ('Água e esgoto — fábrica', 'Saneamento Municipal', 'Utilidades', 420.00, 0,
             CURRENT_DATE - 18, CURRENT_DATE - 4, NULL, 'Boleto', 'AG-778', 'Vencido', 'Conta vencida'),
            ('Internet — escritório', 'Provedor NetLocal', 'Utilidades', 189.90, 0,
             CURRENT_DATE - 10, CURRENT_DATE + 5, NULL, 'Débito automático', 'NET-12', 'Pendente', NULL)
        `);
    }
}

function resolveReceberStatus(payload, atual = {}) {
    const valor = toMoney(payload.valor ?? atual.valor, 0);
    const recebido = toMoney(payload.valor_recebido ?? atual.valor_recebido, 0);
    let status = String(payload.status || atual.status || 'Pendente').trim();
    if (!STATUS_RECEBER.includes(status)) status = 'Pendente';

    if (status === 'Cancelado') return status;
    if (recebido <= 0) {
        const venc = normalizeDate(payload.data_vencimento ?? atual.data_vencimento);
        if (venc && venc < todayIso() && status !== 'Recebido') return 'Vencido';
        return status === 'Recebido' ? 'Pendente' : status;
    }
    if (recebido + 0.001 >= valor) return 'Recebido';
    return 'Parcial';
}

function resolvePagarStatus(payload, atual = {}) {
    const valor = toMoney(payload.valor ?? atual.valor, 0);
    const pago = toMoney(payload.valor_pago ?? atual.valor_pago, 0);
    let status = String(payload.status || atual.status || 'Pendente').trim();
    if (!STATUS_PAGAR.includes(status)) status = 'Pendente';

    if (status === 'Cancelado') return status;
    if (pago <= 0) {
        const venc = normalizeDate(payload.data_vencimento ?? atual.data_vencimento);
        if (venc && venc < todayIso() && status !== 'Pago') return 'Vencido';
        return status === 'Pago' ? 'Pendente' : status;
    }
    if (pago + 0.001 >= valor) return 'Pago';
    return 'Parcial';
}

async function syncOverdueStatuses() {
    const today = todayIso();
    await pool.query(`
        UPDATE financeiro_contas_receber
        SET status = 'Vencido', atualizado_em = CURRENT_TIMESTAMP
        WHERE status IN ('Pendente', 'Parcial', 'Vencido')
          AND data_vencimento IS NOT NULL
          AND data_vencimento < ?
          AND COALESCE(valor_recebido, 0) + 0.001 < COALESCE(valor, 0)
    `, [today]);

    await pool.query(`
        UPDATE financeiro_contas_pagar
        SET status = 'Vencido', atualizado_em = CURRENT_TIMESTAMP
        WHERE status IN ('Pendente', 'Parcial', 'Vencido')
          AND data_vencimento IS NOT NULL
          AND data_vencimento < ?
          AND COALESCE(valor_pago, 0) + 0.001 < COALESCE(valor, 0)
    `, [today]);
}

function xmlTag(xml, tag) {
    const re = new RegExp(`<(?:[\\w.-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`, 'i');
    const match = String(xml || '').match(re);
    return match ? String(match[1]).trim() : '';
}

function xmlTagAll(xml, tag) {
    const re = new RegExp(`<(?:[\\w.-]+:)?${tag}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`, 'gi');
    return [...String(xml || '').matchAll(re)].map((match) => match[1]);
}

function parseNfeXml(xmlRaw) {
    const xml = String(xmlRaw || '');
    if (!xml.includes('infNFe') && !xml.includes('NFe')) {
        throw Object.assign(new Error('Arquivo XML não parece ser uma NF-e válida.'), { status: 400 });
    }

    const ide = xmlTag(xml, 'ide') || xml;
    const emit = xmlTag(xml, 'emit') || '';
    const dest = xmlTag(xml, 'dest') || '';
    const total = xmlTag(xml, 'total') || '';
    const icmsTot = xmlTag(total, 'ICMSTot') || total;

    const numero = xmlTag(ide, 'nNF') || xmlTag(xml, 'nNF');
    const serie = xmlTag(ide, 'serie') || xmlTag(xml, 'serie');
    const dataEmissaoRaw = xmlTag(ide, 'dhEmi') || xmlTag(ide, 'dEmi') || xmlTag(xml, 'dhEmi');
    const dataEmissao = dataEmissaoRaw ? String(dataEmissaoRaw).slice(0, 10) : todayIso();
    const chaveMatch = xml.match(/Id\s*=\s*["']NFe(\d{44})["']/i) || xml.match(/\b(\d{44})\b/);
    const chave = chaveMatch ? chaveMatch[1] : '';

    const enderEmit = xmlTag(emit, 'enderEmit') || '';
    const enderDest = xmlTag(dest, 'enderDest') || '';
    const fornecedorNome = xmlTag(emit, 'xNome') || '';
    const fornecedorDoc = xmlTag(emit, 'CNPJ') || xmlTag(emit, 'CPF') || '';
    const clienteNome = xmlTag(dest, 'xNome') || '';
    const clienteDoc = xmlTag(dest, 'CNPJ') || xmlTag(dest, 'CPF') || '';
    const valorTotal = toMoney(xmlTag(icmsTot, 'vNF') || xmlTag(xml, 'vNF'), 0);

    const itens = xmlTagAll(xml, 'det').map((det, index) => {
        const prod = xmlTag(det, 'prod') || det;
        return {
            nItem: index + 1,
            codigo: xmlTag(prod, 'cProd') || '',
            ean: xmlTag(prod, 'cEAN') || '',
            descricao: xmlTag(prod, 'xProd') || '',
            ncm: xmlTag(prod, 'NCM') || '',
            unidade: xmlTag(prod, 'uCom') || xmlTag(prod, 'uTrib') || 'UN',
            quantidade: toMoney(xmlTag(prod, 'qCom') || xmlTag(prod, 'qTrib') || 0, 0),
            valor_unitario: toMoney(xmlTag(prod, 'vUnCom') || xmlTag(prod, 'vUnTrib') || 0, 0),
            valor_total: toMoney(xmlTag(prod, 'vProd') || 0, 0),
        };
    }).filter((item) => item.descricao || item.codigo);

    return {
        numero,
        serie,
        chave,
        data_emissao: normalizeDate(dataEmissao) || todayIso(),
        fornecedor_nome: fornecedorNome,
        fornecedor_fantasia: xmlTag(emit, 'xFant') || '',
        fornecedor_doc: fornecedorDoc,
        fornecedor_ie: xmlTag(emit, 'IE') || '',
        fornecedor_fone: xmlTag(enderEmit, 'fone') || xmlTag(emit, 'fone') || '',
        fornecedor_email: xmlTag(emit, 'email') || '',
        fornecedor_cep: xmlTag(enderEmit, 'CEP') || '',
        fornecedor_endereco: xmlTag(enderEmit, 'xLgr') || '',
        fornecedor_numero: xmlTag(enderEmit, 'nro') || '',
        fornecedor_complemento: xmlTag(enderEmit, 'xCpl') || '',
        fornecedor_bairro: xmlTag(enderEmit, 'xBairro') || '',
        fornecedor_cidade: xmlTag(enderEmit, 'xMun') || '',
        fornecedor_uf: xmlTag(enderEmit, 'UF') || '',
        cliente_nome: clienteNome,
        cliente_doc: clienteDoc,
        cliente_fone: xmlTag(enderDest, 'fone') || xmlTag(dest, 'fone') || '',
        cliente_email: xmlTag(dest, 'email') || '',
        cliente_cep: xmlTag(enderDest, 'CEP') || '',
        cliente_endereco: xmlTag(enderDest, 'xLgr') || '',
        cliente_numero: xmlTag(enderDest, 'nro') || '',
        cliente_complemento: xmlTag(enderDest, 'xCpl') || '',
        cliente_bairro: xmlTag(enderDest, 'xBairro') || '',
        cliente_cidade: xmlTag(enderDest, 'xMun') || '',
        cliente_uf: xmlTag(enderDest, 'UF') || '',
        cliente_ie: xmlTag(dest, 'IE') || '',
        valor_total: valorTotal,
        documento: numero ? `NF-${numero}${serie ? `/${serie}` : ''}` : (chave ? `Chave ${chave.slice(-8)}` : 'NF-e'),
        itens,
    };
}

function formatDocBr(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 14) {
        return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    if (digits.length === 11) {
        return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }
    return digits || null;
}

function formatCep(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 8) return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
    return digits || null;
}

async function ensureFornecedorFromNfe(parsed) {
    const nome = String(parsed.fornecedor_nome || '').trim();
    const docDigits = String(parsed.fornecedor_doc || '').replace(/\D/g, '');
    if (!nome && !docDigits) return null;

    if (docDigits) {
        const [rows] = await pool.query(
            `SELECT id FROM fornecedores
             WHERE regexp_replace(COALESCE(cnpj, ''), '\\D', '', 'g') = ?
             LIMIT 1`,
            [docDigits]
        );
        if (rows?.[0]?.id) return rows[0].id;
    }

    if (nome) {
        const [rows] = await pool.query(
            'SELECT id FROM fornecedores WHERE LOWER(razao_social) = LOWER(?) LIMIT 1',
            [nome]
        );
        if (rows?.[0]?.id) return rows[0].id;
    }

    try {
        const cnpj = formatDocBr(docDigits)
            || `IMPORT-${String(parsed.chave || Date.now()).replace(/\D/g, '').slice(-14).padStart(14, '0')}`;
        const [result] = await pool.query(`
        INSERT INTO fornecedores (
            razao_social, nome_fantasia, cnpj, telefone_contato, email_contato, nome_contato,
            cep, endereco, numero, complemento, bairro, cidade, estado, ativo, observacoes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        nome || `Fornecedor NF-e ${parsed.documento || ''}`.trim(),
        String(parsed.fornecedor_fantasia || '').trim() || null,
        cnpj,
        String(parsed.fornecedor_fone || '').trim() || null,
        String(parsed.fornecedor_email || '').trim() || null,
        null,
        formatCep(parsed.fornecedor_cep),
        String(parsed.fornecedor_endereco || '').trim() || null,
        String(parsed.fornecedor_numero || '').trim() || null,
        String(parsed.fornecedor_complemento || '').trim() || null,
        String(parsed.fornecedor_bairro || '').trim() || null,
        String(parsed.fornecedor_cidade || '').trim() || null,
        String(parsed.fornecedor_uf || '').trim().slice(0, 2) || null,
        'sim',
        parsed.chave ? `Cadastrado automaticamente via XML (chave ${parsed.chave}).` : 'Cadastrado automaticamente via XML.',
    ]);
        return result.insertId || null;
    } catch (error) {
        logger.error('Erro ao cadastrar fornecedor via XML', { module: 'financeiroRoutes', stack: error.stack });
        return null;
    }
}

async function ensureClienteFromNfe(parsed) {
    const nome = String(parsed.cliente_nome || '').trim();
    const docDigits = String(parsed.cliente_doc || '').replace(/\D/g, '');
    if (!nome && !docDigits) return null;

    if (docDigits) {
        const [rows] = await pool.query(
            `SELECT id FROM clientes
             WHERE regexp_replace(COALESCE(cpf_cnpj, ''), '\\D', '', 'g') = ?
             LIMIT 1`,
            [docDigits]
        );
        if (rows?.[0]?.id) return rows[0].id;
    }

    if (nome) {
        const [rows] = await pool.query(
            'SELECT id FROM clientes WHERE LOWER(nome_razao_social) = LOWER(?) LIMIT 1',
            [nome]
        );
        if (rows?.[0]?.id) return rows[0].id;
    }

    const doc = formatDocBr(docDigits) || `IMPORT-${String(parsed.chave || Date.now()).replace(/\D/g, '').slice(-14).padStart(14, '0')}`;
    const tipoPessoa = docDigits.length === 11 ? 'Física' : 'Jurídica';
    try {
        const [result] = await pool.query(`
            INSERT INTO clientes (
                tipo_pessoa, nome_razao_social, cpf_cnpj, rg_ie, telefone_principal, email_contato,
                data_cadastro, cep, endereco, numero, bairro, cidade, estado, complemento,
                limite_credito, status_credito, formas_pagamento_aceitas, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tipoPessoa,
            nome || `Cliente NF-e ${parsed.documento || ''}`.trim(),
            doc,
            String(parsed.cliente_ie || '').trim() || null,
            String(parsed.cliente_fone || '').trim() || null,
            String(parsed.cliente_email || '').trim() || null,
            todayIso(),
            formatCep(parsed.cliente_cep),
            String(parsed.cliente_endereco || '').trim() || null,
            String(parsed.cliente_numero || '').trim() || null,
            String(parsed.cliente_bairro || '').trim() || null,
            String(parsed.cliente_cidade || '').trim() || null,
            String(parsed.cliente_uf || '').trim().slice(0, 2) || null,
            String(parsed.cliente_complemento || '').trim() || null,
            0,
            'Pendente',
            'Boleto,Cartão Crédito,PIX',
            'Ativo',
            parsed.chave ? `Cadastrado automaticamente via XML (chave ${parsed.chave}).` : 'Cadastrado automaticamente via XML.',
        ]);
        return result.insertId || null;
    } catch (error) {
        logger.error('Erro ao cadastrar cliente via XML', { module: 'financeiroRoutes', stack: error.stack });
        return null;
    }
}

async function matchProdutosFromItens(itens) {
    const [produtos] = await pool.query('SELECT id, codigo, nome, estoque, unidade FROM produtos ORDER BY nome');
    const list = Array.isArray(produtos) ? produtos : [];

    return (itens || []).map((item) => {
        const codigo = String(item.codigo || '').trim().toLowerCase();
        const nome = String(item.descricao || '').trim().toLowerCase();
        let match = null;
        if (codigo) {
            match = list.find((p) => String(p.codigo || '').trim().toLowerCase() === codigo) || null;
        }
        if (!match && nome) {
            match = list.find((p) => String(p.nome || '').trim().toLowerCase() === nome) || null;
        }
        if (!match && nome) {
            match = list.find((p) => {
                const pn = String(p.nome || '').trim().toLowerCase();
                return pn.includes(nome) || nome.includes(pn);
            }) || null;
        }
        return {
            ...item,
            produto_id: match?.id || null,
            produto_nome: match?.nome || null,
            produto_estoque: match?.estoque ?? null,
        };
    });
}

router.get('/api/financeiro/resumo', async (_req, res) => {
    try {
        await ensureFinanceiroTables();
        await syncOverdueStatuses();
        const { inicio, fim } = monthBounds();
        const today = todayIso();

        const [receberAberto] = await pool.query(`
            SELECT
                COALESCE(SUM(GREATEST(valor - valor_recebido, 0)), 0)::float AS total,
                COUNT(*)::int AS qtd
            FROM financeiro_contas_receber
            WHERE status IN ('Pendente', 'Parcial', 'Vencido')
        `);

        const [pagarAberto] = await pool.query(`
            SELECT
                COALESCE(SUM(GREATEST(valor - valor_pago, 0)), 0)::float AS total,
                COUNT(*)::int AS qtd
            FROM financeiro_contas_pagar
            WHERE status IN ('Pendente', 'Parcial', 'Vencido')
        `);

        const [recebidoMes] = await pool.query(`
            SELECT COALESCE(SUM(valor_recebido), 0)::float AS total
            FROM financeiro_contas_receber
            WHERE data_recebimento BETWEEN ? AND ?
               OR (status = 'Recebido' AND data_recebimento IS NULL AND atualizado_em::date BETWEEN ? AND ?)
        `, [inicio, fim, inicio, fim]);

        const [pagoMes] = await pool.query(`
            SELECT COALESCE(SUM(valor_pago), 0)::float AS total
            FROM financeiro_contas_pagar
            WHERE data_pagamento BETWEEN ? AND ?
               OR (status = 'Pago' AND data_pagamento IS NULL AND atualizado_em::date BETWEEN ? AND ?)
        `, [inicio, fim, inicio, fim]);

        const [vencendoReceber] = await pool.query(`
            SELECT id, descricao, cliente_nome, valor, valor_recebido, data_vencimento, status
            FROM financeiro_contas_receber
            WHERE status IN ('Pendente', 'Parcial', 'Vencido')
              AND data_vencimento IS NOT NULL
              AND data_vencimento <= (?::date + INTERVAL '15 days')
            ORDER BY data_vencimento ASC
            LIMIT 8
        `, [today]);

        const [vencendoPagar] = await pool.query(`
            SELECT id, descricao, fornecedor_nome, valor, valor_pago, data_vencimento, status
            FROM financeiro_contas_pagar
            WHERE status IN ('Pendente', 'Parcial', 'Vencido')
              AND data_vencimento IS NOT NULL
              AND data_vencimento <= (?::date + INTERVAL '15 days')
            ORDER BY data_vencimento ASC
            LIMIT 8
        `, [today]);

        const aReceber = Number(receberAberto[0]?.total || 0);
        const aPagar = Number(pagarAberto[0]?.total || 0);
        const recebido = Number(recebidoMes[0]?.total || 0);
        const pago = Number(pagoMes[0]?.total || 0);

        res.json({
            periodo: { inicio, fim },
            a_receber: aReceber,
            a_receber_qtd: receberAberto[0]?.qtd || 0,
            a_pagar: aPagar,
            a_pagar_qtd: pagarAberto[0]?.qtd || 0,
            recebido_mes: recebido,
            pago_mes: pago,
            lucro_previsto: Math.round((aReceber - aPagar) * 100) / 100,
            lucro_realizado: Math.round((recebido - pago) * 100) / 100,
            vencendo_receber: vencendoReceber,
            vencendo_pagar: vencendoPagar,
        });
    } catch (error) {
        logger.error('Erro ao carregar resumo financeiro', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao carregar resumo financeiro.' });
    }
});

/* ---------- Contas a receber ---------- */
router.get('/api/financeiro/receber', async (_req, res) => {
    try {
        await ensureFinanceiroTables();
        await syncOverdueStatuses();
        const [rows] = await pool.query(`
            SELECT * FROM financeiro_contas_receber
            ORDER BY COALESCE(data_vencimento, data_emissao) DESC NULLS LAST, id DESC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar contas a receber', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar contas a receber.' });
    }
});

router.post('/api/financeiro/receber', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const descricao = String(req.body.descricao || '').trim();
        if (!descricao) return res.status(400).json({ message: 'Informe a descrição.' });

        const status = resolveReceberStatus(req.body);
        const [result] = await pool.query(`
            INSERT INTO financeiro_contas_receber (
                descricao, cliente_nome, cliente_id, categoria, valor, valor_recebido,
                data_emissao, data_vencimento, data_recebimento, forma_pagamento, documento, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            descricao,
            String(req.body.cliente_nome || '').trim() || null,
            req.body.cliente_id ? toInt(req.body.cliente_id, null) : null,
            String(req.body.categoria || '').trim() || null,
            toMoney(req.body.valor, 0),
            toMoney(req.body.valor_recebido, 0),
            normalizeDate(req.body.data_emissao) || todayIso(),
            normalizeDate(req.body.data_vencimento),
            normalizeDate(req.body.data_recebimento),
            String(req.body.forma_pagamento || '').trim() || null,
            String(req.body.documento || '').trim() || null,
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        const [rows] = await pool.query('SELECT * FROM financeiro_contas_receber WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'criar',
            entidade: 'conta_receber',
            entidadeId: result.insertId,
            descricao: `Criou conta a receber "${descricao}"`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar conta a receber', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao registrar conta a receber.' });
    }
});

router.put('/api/financeiro/receber/:id', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT * FROM financeiro_contas_receber WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Conta a receber não encontrada.' });

        const atual = atuais[0];
        const descricao = String(req.body.descricao || '').trim();
        if (!descricao) return res.status(400).json({ message: 'Informe a descrição.' });

        const status = resolveReceberStatus(req.body, atual);
        await pool.query(`
            UPDATE financeiro_contas_receber SET
                descricao = ?, cliente_nome = ?, cliente_id = ?, categoria = ?,
                valor = ?, valor_recebido = ?, data_emissao = ?, data_vencimento = ?,
                data_recebimento = ?, forma_pagamento = ?, documento = ?, status = ?,
                observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            descricao,
            String(req.body.cliente_nome || '').trim() || null,
            req.body.cliente_id ? toInt(req.body.cliente_id, null) : null,
            String(req.body.categoria || '').trim() || null,
            toMoney(req.body.valor, atual.valor),
            toMoney(req.body.valor_recebido, atual.valor_recebido),
            normalizeDate(req.body.data_emissao) || atual.data_emissao,
            normalizeDate(req.body.data_vencimento),
            normalizeDate(req.body.data_recebimento),
            String(req.body.forma_pagamento || '').trim() || null,
            String(req.body.documento || '').trim() || null,
            status,
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        const [rows] = await pool.query('SELECT * FROM financeiro_contas_receber WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'editar',
            entidade: 'conta_receber',
            entidadeId: id,
            descricao: `Alterou conta a receber "${descricao}"`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar conta a receber', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar conta a receber.' });
    }
});

router.delete('/api/financeiro/receber/:id', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        await pool.query('DELETE FROM financeiro_contas_receber WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'excluir',
            entidade: 'conta_receber',
            entidadeId: req.params.id,
            descricao: `Excluiu conta a receber #${req.params.id}`,
        });
        res.json({ message: 'Conta a receber excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir conta a receber', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir conta a receber.' });
    }
});

/* ---------- Contas a pagar ---------- */
router.get('/api/financeiro/pagar', async (_req, res) => {
    try {
        await ensureFinanceiroTables();
        await syncOverdueStatuses();
        const [rows] = await pool.query(`
            SELECT * FROM financeiro_contas_pagar
            ORDER BY COALESCE(data_vencimento, data_emissao) DESC NULLS LAST, id DESC
        `);
        res.json(rows);
    } catch (error) {
        logger.error('Erro ao listar contas a pagar', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao listar contas a pagar.' });
    }
});

router.post('/api/financeiro/pagar', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const descricao = String(req.body.descricao || '').trim();
        if (!descricao) return res.status(400).json({ message: 'Informe a descrição.' });

        const status = resolvePagarStatus(req.body);
        const [result] = await pool.query(`
            INSERT INTO financeiro_contas_pagar (
                descricao, fornecedor_nome, fornecedor_id, categoria, valor, valor_pago,
                data_emissao, data_vencimento, data_pagamento, forma_pagamento, documento, status, observacoes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            descricao,
            String(req.body.fornecedor_nome || '').trim() || null,
            req.body.fornecedor_id ? toInt(req.body.fornecedor_id, null) : null,
            String(req.body.categoria || '').trim() || null,
            toMoney(req.body.valor, 0),
            toMoney(req.body.valor_pago, 0),
            normalizeDate(req.body.data_emissao) || todayIso(),
            normalizeDate(req.body.data_vencimento),
            normalizeDate(req.body.data_pagamento),
            String(req.body.forma_pagamento || '').trim() || null,
            String(req.body.documento || '').trim() || null,
            status,
            String(req.body.observacoes || '').trim() || null,
        ]);

        const [rows] = await pool.query('SELECT * FROM financeiro_contas_pagar WHERE id = ?', [result.insertId]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'criar',
            entidade: 'conta_pagar',
            entidadeId: result.insertId,
            descricao: `Criou conta a pagar "${descricao}"`,
        });
        res.status(201).json(rows[0]);
    } catch (error) {
        logger.error('Erro ao criar conta a pagar', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao registrar conta a pagar.' });
    }
});

router.put('/api/financeiro/pagar/:id', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const id = Number(req.params.id);
        const [atuais] = await pool.query('SELECT * FROM financeiro_contas_pagar WHERE id = ?', [id]);
        if (!atuais.length) return res.status(404).json({ message: 'Conta a pagar não encontrada.' });

        const atual = atuais[0];
        const descricao = String(req.body.descricao || '').trim();
        if (!descricao) return res.status(400).json({ message: 'Informe a descrição.' });

        const status = resolvePagarStatus(req.body, atual);
        await pool.query(`
            UPDATE financeiro_contas_pagar SET
                descricao = ?, fornecedor_nome = ?, fornecedor_id = ?, categoria = ?,
                valor = ?, valor_pago = ?, data_emissao = ?, data_vencimento = ?,
                data_pagamento = ?, forma_pagamento = ?, documento = ?, status = ?,
                observacoes = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            descricao,
            String(req.body.fornecedor_nome || '').trim() || null,
            req.body.fornecedor_id ? toInt(req.body.fornecedor_id, null) : null,
            String(req.body.categoria || '').trim() || null,
            toMoney(req.body.valor, atual.valor),
            toMoney(req.body.valor_pago, atual.valor_pago),
            normalizeDate(req.body.data_emissao) || atual.data_emissao,
            normalizeDate(req.body.data_vencimento),
            normalizeDate(req.body.data_pagamento),
            String(req.body.forma_pagamento || '').trim() || null,
            String(req.body.documento || '').trim() || null,
            status,
            String(req.body.observacoes || '').trim() || null,
            id,
        ]);

        const [rows] = await pool.query('SELECT * FROM financeiro_contas_pagar WHERE id = ?', [id]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'editar',
            entidade: 'conta_pagar',
            entidadeId: id,
            descricao: `Alterou conta a pagar "${descricao}"`,
        });
        res.json(rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar conta a pagar', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao atualizar conta a pagar.' });
    }
});

router.delete('/api/financeiro/pagar/:id', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        await pool.query('DELETE FROM financeiro_contas_pagar WHERE id = ?', [req.params.id]);
        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'excluir',
            entidade: 'conta_pagar',
            entidadeId: req.params.id,
            descricao: `Excluiu conta a pagar #${req.params.id}`,
        });
        res.json({ message: 'Conta a pagar excluída.' });
    } catch (error) {
        logger.error('Erro ao excluir conta a pagar', { module: 'financeiroRoutes', stack: error.stack });
        res.status(500).json({ message: 'Erro ao excluir conta a pagar.' });
    }
});

/* ---------- Importar NF-e XML ---------- */
router.post('/api/financeiro/importar-xml', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const xml = String(req.body.xml || req.body.content || '').trim();
        if (!xml) return res.status(400).json({ message: 'Envie o conteúdo XML da nota fiscal.' });

        const parsed = parseNfeXml(xml);
        const itens = await matchProdutosFromItens(parsed.itens);
        const tipoConta = ['pagar', 'receber', 'nenhuma'].includes(String(req.body.tipo_conta || '').trim())
            ? String(req.body.tipo_conta).trim()
            : 'pagar';

        let fornecedorId = null;
        let clienteId = null;
        if (tipoConta === 'pagar' || req.body.alimentar_estoque) {
            fornecedorId = await ensureFornecedorFromNfe(parsed);
        }
        if (tipoConta === 'receber') {
            clienteId = await ensureClienteFromNfe(parsed);
        }

        let conta = null;
        let tipoContaCriada = null;

        if (tipoConta === 'pagar') {
            const descricao = parsed.documento
                ? `NF-e ${parsed.documento}${parsed.fornecedor_nome ? ` — ${parsed.fornecedor_nome}` : ''}`
                : `Compra NF-e${parsed.fornecedor_nome ? ` — ${parsed.fornecedor_nome}` : ''}`;
            const status = resolvePagarStatus({
                valor: parsed.valor_total,
                valor_pago: 0,
                data_vencimento: parsed.data_emissao,
                status: 'Pendente',
            });
            const [result] = await pool.query(`
                INSERT INTO financeiro_contas_pagar (
                    descricao, fornecedor_nome, fornecedor_id, categoria, valor, valor_pago,
                    data_emissao, data_vencimento, data_pagamento, forma_pagamento, documento, status, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                descricao.slice(0, 200),
                parsed.fornecedor_nome || null,
                fornecedorId,
                'Insumos',
                parsed.valor_total,
                0,
                parsed.data_emissao,
                parsed.data_emissao,
                null,
                'Boleto',
                parsed.documento || null,
                status,
                parsed.chave ? `Chave NF-e: ${parsed.chave}` : 'Importada via XML',
            ]);
            const [rows] = await pool.query('SELECT * FROM financeiro_contas_pagar WHERE id = ?', [result.insertId]);
            conta = rows[0] || null;
            tipoContaCriada = 'pagar';
        }

        if (tipoConta === 'receber') {
            const parceiro = parsed.cliente_nome || parsed.fornecedor_nome || '';
            const descricao = parsed.documento
                ? `NF-e ${parsed.documento}${parceiro ? ` — ${parceiro}` : ''}`
                : `Venda NF-e${parceiro ? ` — ${parceiro}` : ''}`;
            const status = resolveReceberStatus({
                valor: parsed.valor_total,
                valor_recebido: 0,
                data_vencimento: parsed.data_emissao,
                status: 'Pendente',
            });
            const [result] = await pool.query(`
                INSERT INTO financeiro_contas_receber (
                    descricao, cliente_nome, cliente_id, categoria, valor, valor_recebido,
                    data_emissao, data_vencimento, data_recebimento, forma_pagamento, documento, status, observacoes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                descricao.slice(0, 200),
                parceiro || null,
                clienteId,
                'Vendas',
                parsed.valor_total,
                0,
                parsed.data_emissao,
                parsed.data_emissao,
                null,
                'Boleto',
                parsed.documento || null,
                status,
                parsed.chave ? `Chave NF-e: ${parsed.chave}` : 'Importada via XML',
            ]);
            const [rows] = await pool.query('SELECT * FROM financeiro_contas_receber WHERE id = ?', [result.insertId]);
            conta = rows[0] || null;
            tipoContaCriada = 'receber';
        }

        let estoque = null;
        const alimentarEstoque = Boolean(req.body.alimentar_estoque);
        const itensEstoque = Array.isArray(req.body.itens_estoque) ? req.body.itens_estoque : [];
        if (alimentarEstoque && itensEstoque.length) {
            const validos = itensEstoque
                .map((item) => ({
                    produto_id: toInt(item.produto_id, 0),
                    quantidade: toMoney(item.quantidade, 0),
                }))
                .filter((item) => item.produto_id > 0 && item.quantidade > 0);

            if (!validos.length) {
                return res.status(400).json({ message: 'Selecione produtos com quantidade para alimentar o estoque.' });
            }

            const movimentos = [];
            for (const item of validos) {
                const [prodRows] = await pool.query('SELECT id, estoque, nome FROM produtos WHERE id = ?', [item.produto_id]);
                if (!prodRows.length) continue;
                const atual = toMoney(prodRows[0].estoque, 0);
                const saldoApos = Number((atual + item.quantidade).toFixed(2));
                await pool.query('UPDATE produtos SET estoque = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?', [
                    saldoApos, item.produto_id,
                ]);
                await pool.query(`
                    INSERT INTO estoque_movimentos (
                        produto_id, tipo, motivo, quantidade, data_movimento, observacao, saldo_apos, created_by
                    ) VALUES (?, 'entrada', 'compra', ?, ?, ?, ?, ?)
                `, [
                    item.produto_id,
                    item.quantidade,
                    parsed.data_emissao,
                    `Entrada via NF-e ${parsed.documento || ''}`.trim(),
                    saldoApos,
                    req.session?.user?.nome || req.session?.username || 'sistema',
                ]).catch(async () => {});
                movimentos.push({
                    produto_id: item.produto_id,
                    produto_nome: prodRows[0].nome,
                    quantidade: item.quantidade,
                    saldo_apos: saldoApos,
                });
            }
            estoque = { movimentos };
        }

        await logAuditoria(req, {
            modulo: 'financeiro',
            acao: 'criar',
            entidade: 'importacao_xml',
            entidadeId: conta?.id || parsed.documento || null,
            descricao: `Importou XML NF-e ${parsed.documento || ''}`.trim(),
        });
        res.status(201).json({
            message: 'XML processado com sucesso.',
            nota: { ...parsed, itens },
            conta,
            tipo_conta: tipoContaCriada,
            estoque,
        });
    } catch (error) {
        logger.error('Erro ao importar XML financeiro', { module: 'financeiroRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao importar XML da nota fiscal.',
        });
    }
});

router.post('/api/financeiro/parse-xml', async (req, res) => {
    try {
        await ensureFinanceiroTables();
        const xml = String(req.body.xml || req.body.content || '').trim();
        if (!xml) return res.status(400).json({ message: 'Envie o conteúdo XML da nota fiscal.' });
        const parsed = parseNfeXml(xml);
        const itens = await matchProdutosFromItens(parsed.itens);
        res.json({ ...parsed, itens });
    } catch (error) {
        logger.error('Erro ao ler XML financeiro', { module: 'financeiroRoutes', stack: error.stack });
        res.status(error.status || 500).json({
            message: error.status ? error.message : 'Erro ao ler XML da nota fiscal.',
        });
    }
});

module.exports = router;
