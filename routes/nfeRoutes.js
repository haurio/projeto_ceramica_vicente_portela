const express = require('express');
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const net = require('net');
const multer = require('multer');
const forge = require('node-forge');
const pool = require('../db');
const logger = require('../utils/logger');
const { logAuditoria } = require('../utils/auditoria');
const { buildNfeXml, saveEmissaoArquivos, resolveNfeStoredPath, nfeRoot } = require('../utils/nfeArquivos');

const router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session?.authenticated) return next();
    return res.status(401).json({ message: 'Não autorizado. Faça login para acessar.' });
};

const UF_PADRAO = 'MG';
const AMBIENTES = ['homologacao', 'producao'];
const OBSERVACOES_PADRAO = [
    'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI. PERMITE O APROVEITAMENTO DO CRÉDITO DE ICMS CORRESPONDENTE À ALÍQUOTA APLICÁVEL ÀS AQUISIÇÕES, NOS TERMOS DO ART. 23 DA LC 123/2006, QUANDO CABÍVEL.',
    'Ref. Pedido: {{pedido}}.',
    'Frete: {{frete}}.',
    'Local de Entrega/Descarga: {{local_entrega}}.',
    'Valor aprox. dos tributos calculados automaticamente pelo sistema (Fonte: IBPT).',
].join('\n');
const SEFAZ_HOSTS = {
    homologacao: 'hnfe.fazenda.mg.gov.br',
    producao: 'nfe.fazenda.mg.gov.br',
};

const certDir = path.join(__dirname, '..', 'storage', 'nfe', 'certs');
const logoDir = path.join(__dirname, '..', 'storage', 'nfe', 'logos');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}
if (!fs.existsSync(logoDir)) {
    fs.mkdirSync(logoDir, { recursive: true });
}

const certStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, certDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.pfx';
        cb(null, `certificado-a1-${Date.now()}${ext}`);
    },
});

const uploadCert = multer({
    storage: certStorage,
    limits: { fileSize: 8 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const ok = ['.pfx', '.p12'].includes(ext)
            || file.mimetype === 'application/x-pkcs12'
            || file.mimetype === 'application/octet-stream';
        if (!ok) {
            cb(new Error('Envie um certificado A1 em formato .pfx ou .p12.'));
            return;
        }
        cb(null, true);
    },
});

const logoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        try {
            fs.mkdirSync(logoDir, { recursive: true });
            cb(null, logoDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
        const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
        cb(null, `logo-nfe-${Date.now()}${safeExt}`);
    },
});

const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 3 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const ok = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext)
            || String(file.mimetype || '').startsWith('image/');
        if (!ok) {
            cb(new Error('Envie a logo em PNG, JPG ou WEBP.'));
            return;
        }
        cb(null, true);
    },
});

let tableReadyPromise = null;

async function ensureNfeTables() {
    if (!tableReadyPromise) {
        tableReadyPromise = (async () => {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS nfe_config (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    uf VARCHAR(2) NOT NULL DEFAULT 'MG',
                    ambiente VARCHAR(20) NOT NULL DEFAULT 'homologacao',
                    serie INTEGER NOT NULL DEFAULT 1,
                    proximo_numero INTEGER NOT NULL DEFAULT 1,
                    csc_id VARCHAR(20),
                    csc_token VARCHAR(120),
                    certificado_nome VARCHAR(180),
                    certificado_path TEXT,
                    certificado_senha TEXT,
                    certificado_validade DATE,
                    certificado_cnpj VARCHAR(20),
                    certificado_titular VARCHAR(180),
                    ativo BOOLEAN NOT NULL DEFAULT TRUE,
                    sefaz_status VARCHAR(40) DEFAULT 'nao_verificado',
                    sefaz_mensagem TEXT,
                    sefaz_verificado_em TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE TABLE IF NOT EXISTS nfe_emissoes (
                    id SERIAL PRIMARY KEY,
                    pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
                    ambiente VARCHAR(20) NOT NULL,
                    numero INTEGER,
                    serie INTEGER,
                    chave VARCHAR(60),
                    protocolo VARCHAR(60),
                    status VARCHAR(40) NOT NULL DEFAULT 'pendente',
                    mensagem TEXT,
                    xml_path TEXT,
                    criado_por VARCHAR(120),
                    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS nfe_emissoes_pedido_idx ON nfe_emissoes (pedido_id)
            `);

            await pool.query(`
                ALTER TABLE nfe_config
                    ADD COLUMN IF NOT EXISTS logo_nome VARCHAR(180),
                    ADD COLUMN IF NOT EXISTS logo_path TEXT,
                    ADD COLUMN IF NOT EXISTS observacoes_texto TEXT
            `);

            await pool.query(`
                ALTER TABLE nfe_emissoes
                    ADD COLUMN IF NOT EXISTS xml_path TEXT,
                    ADD COLUMN IF NOT EXISTS nota_path TEXT,
                    ADD COLUMN IF NOT EXISTS payload_json TEXT,
                    ADD COLUMN IF NOT EXISTS cancelamento_motivo TEXT,
                    ADD COLUMN IF NOT EXISTS cancelamento_em TIMESTAMP,
                    ADD COLUMN IF NOT EXISTS cancelamento_por VARCHAR(120)
            `);

            await pool.query(`
                ALTER TABLE produtos
                    ADD COLUMN IF NOT EXISTS ncm VARCHAR(8),
                    ADD COLUMN IF NOT EXISTS cfop_padrao VARCHAR(4) DEFAULT '5102',
                    ADD COLUMN IF NOT EXISTS cst_csosn VARCHAR(4) DEFAULT '102',
                    ADD COLUMN IF NOT EXISTS aliq_icms NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_ipi NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_pis NUMERIC(7, 2) DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS aliq_cofins NUMERIC(7, 2) DEFAULT 0
            `).catch(() => null);

            const [rows] = await pool.query('SELECT id, observacoes_texto FROM nfe_config WHERE id = 1');
            if (!rows.length) {
                await pool.query(`
                    INSERT INTO nfe_config (id, uf, ambiente, serie, proximo_numero, ativo, observacoes_texto)
                    VALUES (1, 'MG', 'homologacao', 1, 1, TRUE, ?)
                `, [OBSERVACOES_PADRAO]);
            } else if (!String(rows[0].observacoes_texto || '').trim()
                || String(rows[0].observacoes_texto).includes('tributos_valor')
                || String(rows[0].observacoes_texto).includes('R$ {{tributos')) {
                await pool.query(`
                    UPDATE nfe_config SET observacoes_texto = ? WHERE id = 1
                `, [OBSERVACOES_PADRAO]);
            }
        })().catch((error) => {
            tableReadyPromise = null;
            throw error;
        });
    }
    return tableReadyPromise;
}

function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value) {
    const raw = String(value || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function extractCnpjFromText(...parts) {
    const joined = parts.filter(Boolean).join(' ');
    const match14 = joined.replace(/[^\d]/g, ' ').match(/\d{14}/);
    if (match14) return match14[0];
    const matchFormatted = joined.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (matchFormatted) return matchFormatted[0].replace(/\D/g, '').slice(0, 14);
    return '';
}

function getAttrValue(attrs, shortName) {
    const found = (attrs || []).find((item) => item.shortName === shortName || item.name === shortName);
    return found?.value ? String(found.value).trim() : '';
}

function formatCertDate(value) {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
        return value.trim().slice(0, 10);
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    // DATE do Postgres chega como Date em meia-noite local
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatNotAfterUtc(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function parsePfxCertificate(filePath, password) {
    const buffer = fs.readFileSync(filePath);
    const der = forge.util.createBuffer(buffer.toString('binary'));
    const asn1 = forge.asn1.fromDer(der);

    let p12;
    try {
        p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password || '');
    } catch (error) {
        const err = new Error('Senha do certificado inválida ou arquivo .pfx/.p12 corrompido.');
        err.code = 'CERT_PASSWORD';
        err.cause = error;
        throw err;
    }

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] || [];
    if (!bags.length) {
        const err = new Error('Nenhum certificado encontrado no arquivo .pfx/.p12.');
        err.code = 'CERT_EMPTY';
        throw err;
    }

    const cert = bags[0].cert;
    if (!cert) {
        const err = new Error('Não foi possível ler o certificado do arquivo.');
        err.code = 'CERT_READ';
        throw err;
    }

    const subjectAttrs = cert.subject?.attributes || [];
    const cn = getAttrValue(subjectAttrs, 'CN');
    const o = getAttrValue(subjectAttrs, 'O');
    const ou = getAttrValue(subjectAttrs, 'OU');
    const serialNumber = getAttrValue(subjectAttrs, 'serialNumber');

    let cnpj = extractCnpjFromText(serialNumber, cn, o, ou);
    try {
        const ext = (cert.extensions || []).find((item) => item.name === 'subjectAltName' || item.id === '2.5.29.17');
        if (ext?.altNames) {
            for (const alt of ext.altNames) {
                const value = typeof alt.value === 'string' ? alt.value : String(alt.value || '');
                const found = extractCnpjFromText(value);
                if (found) {
                    cnpj = found;
                    break;
                }
            }
        }
    } catch (_extError) {
        // ignore extension parse issues
    }

    return {
        validade: formatNotAfterUtc(cert.validity?.notAfter),
        cnpj: cnpj || '',
        titular: cn || o || 'Certificado A1',
        notBefore: cert.validity?.notBefore || null,
        notAfter: cert.validity?.notAfter || null,
    };
}

async function syncCertMetadataFromFile(row) {
    if (!row?.certificado_path || !fs.existsSync(row.certificado_path) || !row.certificado_senha) {
        return row;
    }

    const needsSync = !row.certificado_validade || !row.certificado_titular;
    if (!needsSync) return row;

    try {
        const parsed = parsePfxCertificate(row.certificado_path, row.certificado_senha);
        const validade = parsed.validade || row.certificado_validade || null;
        const cnpj = String(parsed.cnpj || '').replace(/\D/g, '').slice(0, 14) || row.certificado_cnpj || null;
        const titular = String(parsed.titular || '').trim().slice(0, 180) || row.certificado_titular || null;

        await pool.query(`
            UPDATE nfe_config SET
                certificado_validade = COALESCE(?, certificado_validade),
                certificado_cnpj = COALESCE(?, certificado_cnpj),
                certificado_titular = COALESCE(?, certificado_titular),
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [validade, cnpj, titular]);

        return {
            ...row,
            certificado_validade: validade || row.certificado_validade,
            certificado_cnpj: cnpj || row.certificado_cnpj,
            certificado_titular: titular || row.certificado_titular,
        };
    } catch (error) {
        logger.warn('Não foi possível sincronizar metadados do certificado NF-e', {
            module: 'nfeRoutes',
            error: error.message,
        });
        return row;
    }
}

function getActor(req) {
    return req.session?.user?.username
        || req.session?.user?.full_name
        || req.session?.username
        || null;
}

function mimeFromPath(filePath = '') {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    return 'image/jpeg';
}

/** Corrige nomes de arquivo com acentuação quebrada (UTF-8 lido como Latin-1). */
function decodeUploadFilename(name = '') {
    const raw = String(name || '');
    if (!raw) return '';
    if (!raw.includes('Ã') && !raw.includes('Â')) return raw.slice(0, 180);
    try {
        const fixed = Buffer.from(raw, 'latin1').toString('utf8');
        if (fixed && !fixed.includes('\uFFFD') && fixed !== raw) return fixed.slice(0, 180);
    } catch (_error) {
        // ignore
    }
    return raw.slice(0, 180);
}

function logoDataUrlFromRow(row = {}) {
    const logoPath = row.logo_path ? path.resolve(row.logo_path) : '';
    if (!logoPath || !fs.existsSync(logoPath)) return '';
    try {
        const buffer = fs.readFileSync(logoPath);
        return `data:${mimeFromPath(logoPath)};base64,${buffer.toString('base64')}`;
    } catch (_error) {
        return '';
    }
}

function buildNfeObservacoesPadrao({
    template = '',
    pedido = null,
    ambiente = 'homologacao',
    observacaoExtra = '',
    modFrete = '9',
    destinatario = {},
    totais = {},
} = {}) {
    const pedidoRef = pedido?.numero || pedido?.pedido_numero
        || (pedido?.id ? `PED-${String(pedido.id).padStart(5, '0')}` : '—');

    const mod = String(modFrete ?? '9');
    let freteLabel = 'Conforme combinado entre as partes';
    if (mod === '0') freteLabel = 'CIF - por conta do emitente';
    else if (mod === '1') freteLabel = 'FOB - por conta do cliente';
    else if (mod === '2') freteLabel = 'Por conta de terceiros';
    else if (mod === '3') freteLabel = 'Transporte próprio por conta do remetente';
    else if (mod === '4') freteLabel = 'Transporte próprio por conta do destinatário';
    else if (mod === '9') freteLabel = 'Sem ocorrência de transporte (Retirada no local)';

    const localEndereco = [
        pedido?.endereco_entrega
            || destinatario.endereco
            || [
                pedido?.cliente_endereco,
                pedido?.cliente_numero ? `nº ${pedido.cliente_numero}` : '',
                pedido?.cliente_bairro,
            ].filter(Boolean).join(', '),
    ].filter(Boolean)[0] || '';
    const localParts = [
        localEndereco,
        destinatario.cidade || pedido?.cidade_entrega || pedido?.cliente_cidade || '',
        destinatario.uf || pedido?.uf_entrega || pedido?.cliente_uf || '',
        destinatario.cep || pedido?.cep_entrega || pedido?.cliente_cep || '',
    ].filter(Boolean);
    const localEntrega = localParts.length ? localParts.join(' - ') : 'Conforme cadastro do destinatário';

    const totalNota = Number(totais.total) || 0;
    const trib = Number(totais.total_impostos) || 0;
    const pct = totalNota > 0 ? (trib / totalNota) * 100 : 0;
    const money = (value) => (Number(value) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    let texto = String(template || OBSERVACOES_PADRAO);
    const replacements = {
        pedido: pedidoRef,
        frete: freteLabel,
        local_entrega: localEntrega,
        tributos_valor: money(trib),
        tributos_pct: money(pct),
    };
    Object.entries(replacements).forEach(([key, value]) => {
        texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), String(value));
    });

    const extra = String(observacaoExtra || '').trim();
    if (extra && !texto.includes(extra)) {
        texto = `${texto.trim()}\n${extra}`;
    }

    if (String(ambiente || '').toLowerCase() !== 'producao'
        && !/homologação|homologacao/i.test(texto)) {
        texto = `${texto.trim()}\nNF-e EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL.`;
    }

    return texto.trim();
}

function sanitizeConfig(row = {}) {
    const certPath = row.certificado_path ? path.resolve(row.certificado_path) : '';
    const logoPath = row.logo_path ? path.resolve(row.logo_path) : '';
    const hasCert = Boolean(certPath && fs.existsSync(certPath));
    const hasLogo = Boolean(logoPath && fs.existsSync(logoPath));
    const validade = formatCertDate(row.certificado_validade);
    const validadeOk = validade ? validade >= new Date().toISOString().slice(0, 10) : false;
    const logoDataUrl = hasLogo ? logoDataUrlFromRow({ ...row, logo_path: logoPath }) : '';

    return {
        id: 1,
        uf: row.uf || UF_PADRAO,
        ambiente: AMBIENTES.includes(row.ambiente) ? row.ambiente : 'homologacao',
        serie: toInt(row.serie, 1),
        proximo_numero: toInt(row.proximo_numero, 1),
        csc_id: row.csc_id || '',
        csc_token: row.csc_token ? '********' : '',
        has_csc_token: Boolean(row.csc_token),
        certificado_nome: row.certificado_nome || '',
        has_certificado: hasCert,
        has_certificado_senha: Boolean(row.certificado_senha),
        certificado_validade: validade,
        certificado_cnpj: row.certificado_cnpj || '',
        certificado_titular: row.certificado_titular || '',
        certificado_valido: hasCert && Boolean(row.certificado_senha) && validadeOk,
        logo_nome: decodeUploadFilename(row.logo_nome || ''),
        has_logo: hasLogo,
        logo_url: hasLogo ? `/api/nfe/logo?t=${Date.parse(row.atualizado_em || '') || Date.now()}` : '',
        logo_data_url: logoDataUrl,
        observacoes_texto: String(row.observacoes_texto || OBSERVACOES_PADRAO),
        ativo: row.ativo !== false,
        sefaz_status: row.sefaz_status || 'nao_verificado',
        sefaz_mensagem: row.sefaz_mensagem || '',
        sefaz_verificado_em: row.sefaz_verificado_em || null,
        atualizado_em: row.atualizado_em || null,
        pronto_para_emissao: hasCert
            && Boolean(row.certificado_senha)
            && validadeOk
            && row.ativo !== false
            && (row.uf || UF_PADRAO) === 'MG',
    };
}

async function getConfigRow() {
    await ensureNfeTables();
    const [rows] = await pool.query('SELECT * FROM nfe_config WHERE id = 1');
    return rows[0] || null;
}

function checkHostReachable(host, timeoutMs = 6000) {
    return new Promise((resolve) => {
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            try { socket.destroy(); } catch (_e) { /* ignore */ }
            resolve(result);
        };

        const socket = tls.connect({
            host,
            port: 443,
            servername: host,
            rejectUnauthorized: false,
            timeout: timeoutMs,
        });

        socket.once('secureConnect', () => {
            finish({
                ok: true,
                statusCode: 0,
                message: `Host ${host} alcançável na porta 443 (TLS).`,
            });
        });

        socket.once('timeout', () => {
            finish({
                ok: false,
                statusCode: 0,
                message: `Tempo esgotado ao conectar em ${host}:443.`,
            });
        });

        socket.once('error', (error) => {
            const msg = String(error.message || '');
            // A SEFAZ costuma exigir certificado cliente no handshake.
            // EPROTO/handshake failure indica que o host está ativo.
            if (
                error.code === 'EPROTO'
                || /handshake failure/i.test(msg)
                || /ssl\/tls alert/i.test(msg)
                || /certificate required/i.test(msg)
            ) {
                finish({
                    ok: true,
                    statusCode: 0,
                    message: `Host ${host} alcançável. Handshake completo exige o A1 na emissão SOAP.`,
                });
                return;
            }

            // Fallback: porta TCP aberta?
            const probe = net.connect({ host, port: 443 }, () => {
                probe.end();
                finish({
                    ok: true,
                    statusCode: 0,
                    message: `Host ${host} alcançável na porta 443.`,
                });
            });
            probe.setTimeout(timeoutMs);
            probe.on('timeout', () => {
                probe.destroy();
                finish({
                    ok: false,
                    statusCode: 0,
                    message: `Falha ao alcançar ${host}: ${msg}`,
                });
            });
            probe.on('error', (netError) => {
                finish({
                    ok: false,
                    statusCode: 0,
                    message: `Falha ao alcançar ${host}: ${netError.message || msg}`,
                });
            });
        });
    });
}

function buildChaveSimulada({ cnpj, serie, numero, ambiente }) {
    const now = new Date();
    const aamm = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cnpjDigits = String(cnpj || '').replace(/\D/g, '').padStart(14, '0').slice(0, 14);
    const serieStr = String(serie || 1).padStart(3, '0');
    const numeroStr = String(numero || 1).padStart(9, '0');
    const tpEmis = '1';
    const cNF = String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
    const base = `31${aamm}${cnpjDigits}55${serieStr}${numeroStr}${tpEmis}${cNF}`;
    // dígito verificador simplificado (módulo 11) só para demo visual
    let weight = 2;
    let sum = 0;
    for (let i = base.length - 1; i >= 0; i -= 1) {
        sum += Number(base[i]) * weight;
        weight = weight === 9 ? 2 : weight + 1;
    }
    const mod = sum % 11;
    const dv = mod === 0 || mod === 1 ? 0 : 11 - mod;
    return `${base}${dv}${ambiente === 'homologacao' ? '' : ''}`.slice(0, 44);
}

function toMoneyNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function parsePayloadJson(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (_error) {
        return null;
    }
}

function normalizeEmitPayload(body = {}, produtosById = new Map()) {
    const fiscal = body.fiscal && typeof body.fiscal === 'object' ? body.fiscal : {};
    const rawItens = Array.isArray(body.itens) ? body.itens : [];
    const itens = rawItens
        .filter((item) => item && item.produto_id && toMoneyNumber(item.quantidade) > 0)
        .map((item) => {
            const produto = produtosById.get(Number(item.produto_id)) || {};
            const quantidade = toMoneyNumber(item.quantidade);
            const preco = toMoneyNumber(item.preco_unitario ?? produto.preco_unitario);
            const subtotal = toMoneyNumber(quantidade * preco);
            const aliqIcms = toMoneyNumber(item.aliq_icms ?? produto.aliq_icms);
            const aliqIpi = toMoneyNumber(item.aliq_ipi ?? produto.aliq_ipi);
            const aliqPis = toMoneyNumber(item.aliq_pis ?? produto.aliq_pis);
            const aliqCofins = toMoneyNumber(item.aliq_cofins ?? produto.aliq_cofins);
            const valorIcms = toMoneyNumber((subtotal * aliqIcms) / 100);
            const valorIpi = toMoneyNumber((subtotal * aliqIpi) / 100);
            const valorPis = toMoneyNumber((subtotal * aliqPis) / 100);
            const valorCofins = toMoneyNumber((subtotal * aliqCofins) / 100);
            return {
                produto_id: Number(item.produto_id),
                produto_codigo: produto.codigo || item.produto_codigo || '',
                produto_nome: produto.nome || item.produto_nome || '',
                quantidade,
                preco_unitario: preco,
                unidade: item.unidade || produto.unidade || 'un',
                subtotal,
                ncm: String(item.ncm || produto.ncm || '').replace(/\D/g, '').slice(0, 8),
                cfop: String(item.cfop || produto.cfop_padrao || fiscal.cfop || '5102').replace(/\D/g, '').slice(0, 4),
                cst_csosn: String(item.cst_csosn || produto.cst_csosn || '102').replace(/\D/g, '').slice(0, 4),
                aliq_icms: aliqIcms,
                aliq_ipi: aliqIpi,
                aliq_pis: aliqPis,
                aliq_cofins: aliqCofins,
                valor_icms: valorIcms,
                valor_ipi: valorIpi,
                valor_pis: valorPis,
                valor_cofins: valorCofins,
                base_icms: aliqIcms > 0 ? subtotal : 0,
            };
        });

    const subtotal = toMoneyNumber(itens.reduce((acc, item) => acc + item.subtotal, 0));
    const frete = toMoneyNumber(body.totais?.frete ?? fiscal.frete);
    const desconto = toMoneyNumber(body.totais?.desconto ?? fiscal.desconto);
    const outras = toMoneyNumber(body.totais?.outras ?? fiscal.outras_despesas);
    const seguro = toMoneyNumber(body.totais?.seguro ?? fiscal.seguro);
    const baseIcms = toMoneyNumber(itens.reduce((acc, item) => acc + item.base_icms, 0));
    const valorIcms = toMoneyNumber(itens.reduce((acc, item) => acc + item.valor_icms, 0));
    const valorIpi = toMoneyNumber(itens.reduce((acc, item) => acc + item.valor_ipi, 0));
    const valorPis = toMoneyNumber(itens.reduce((acc, item) => acc + item.valor_pis, 0));
    const valorCofins = toMoneyNumber(itens.reduce((acc, item) => acc + item.valor_cofins, 0));
    const totalImpostos = toMoneyNumber(valorIcms + valorIpi + valorPis + valorCofins);
    const total = toMoneyNumber(Math.max(0, subtotal - desconto + frete + outras + seguro + valorIpi));

    return {
        fiscal: {
            natureza: fiscal.natureza || 'Venda de mercadoria',
            cfop: String(fiscal.cfop || '5102').replace(/\D/g, '').slice(0, 4),
            tipo_operacao: String(fiscal.tipo_operacao || '1'),
            finalidade: String(fiscal.finalidade || '1'),
            consumidor_final: String(fiscal.consumidor_final || '1'),
            presenca: String(fiscal.presenca || '1'),
            mod_frete: String(fiscal.mod_frete || '9'),
        },
        destinatario: body.destinatario && typeof body.destinatario === 'object' ? body.destinatario : {},
        observacoes: String(body.observacoes || '').trim(),
        itens,
        totais: {
            subtotal,
            frete,
            desconto,
            outras,
            seguro,
            base_icms: baseIcms,
            valor_icms: valorIcms,
            valor_ipi: valorIpi,
            valor_pis: valorPis,
            valor_cofins: valorCofins,
            total_impostos: totalImpostos,
            total,
        },
    };
}

router.use(isAuthenticated);

router.get('/config', async (_req, res) => {
    try {
        let row = await getConfigRow();
        row = await syncCertMetadataFromFile(row || {});
        return res.json(sanitizeConfig(row || {}));
    } catch (error) {
        logger.error('Erro ao carregar config NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao carregar configuração NF-e.' });
    }
});

router.put('/config', async (req, res) => {
    try {
        const current = await getConfigRow();
        const ambiente = AMBIENTES.includes(String(req.body.ambiente || '').toLowerCase())
            ? String(req.body.ambiente).toLowerCase()
            : (current?.ambiente || 'homologacao');
        const serie = Math.max(1, toInt(req.body.serie, current?.serie || 1));
        const proximoNumero = Math.max(1, toInt(req.body.proximo_numero, current?.proximo_numero || 1));
        const cscId = String(req.body.csc_id || '').trim() || null;
        let cscToken = String(req.body.csc_token || '').trim();
        if (!cscToken || cscToken === '********') {
            cscToken = current?.csc_token || null;
        }
        const certificadoValidade = normalizeDate(req.body.certificado_validade) || current?.certificado_validade || null;
        const certificadoCnpj = String(req.body.certificado_cnpj || '').replace(/\D/g, '').slice(0, 14)
            || current?.certificado_cnpj
            || null;
        const certificadoTitular = String(req.body.certificado_titular || '').trim()
            || current?.certificado_titular
            || null;
        const ativo = req.body.ativo === undefined ? current?.ativo !== false : Boolean(req.body.ativo);
        const observacoesTexto = Object.prototype.hasOwnProperty.call(req.body, 'observacoes_texto')
            ? String(req.body.observacoes_texto || '').trim() || OBSERVACOES_PADRAO
            : (current?.observacoes_texto || OBSERVACOES_PADRAO);

        let certificadoSenha = current?.certificado_senha || null;
        if (Object.prototype.hasOwnProperty.call(req.body, 'certificado_senha')) {
            const incoming = String(req.body.certificado_senha || '');
            if (incoming && incoming !== '********') certificadoSenha = incoming;
            if (incoming === '') certificadoSenha = null;
        }

        await pool.query(`
            UPDATE nfe_config SET
                uf = 'MG',
                ambiente = ?,
                serie = ?,
                proximo_numero = ?,
                csc_id = ?,
                csc_token = ?,
                certificado_senha = ?,
                certificado_validade = ?,
                certificado_cnpj = ?,
                certificado_titular = ?,
                observacoes_texto = ?,
                ativo = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [
            ambiente,
            serie,
            proximoNumero,
            cscId,
            cscToken,
            certificadoSenha,
            certificadoValidade,
            certificadoCnpj,
            certificadoTitular,
            observacoesTexto,
            ativo,
        ]);

        await logAuditoria(req, {
            modulo: 'nfe',
            acao: 'configurar',
            entidade: 'nfe_config',
            entidadeId: 1,
            descricao: `Configuração NF-e MG atualizada (${ambiente}).`,
        });

        const row = await getConfigRow();
        return res.json(sanitizeConfig(row || {}));
    } catch (error) {
        logger.error('Erro ao salvar config NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao salvar configuração NF-e.' });
    }
});

router.post('/config/certificado', (req, res) => {
    uploadCert.single('certificado')(req, res, async (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'Falha no upload do certificado.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Selecione o arquivo do certificado A1 (.pfx/.p12).' });
        }

        try {
            const current = await getConfigRow();
            const senha = String(req.body.certificado_senha || '').trim() || current?.certificado_senha || null;

            if (!senha) {
                try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
                return res.status(400).json({
                    message: 'Informe a senha do certificado para ler validade, CNPJ e titular automaticamente.',
                });
            }

            let parsed;
            try {
                parsed = parsePfxCertificate(req.file.path, senha);
            } catch (parseError) {
                try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
                return res.status(400).json({
                    message: parseError.message || 'Não foi possível ler o certificado.',
                });
            }

            if (current?.certificado_path && current.certificado_path !== req.file.path) {
                try {
                    if (fs.existsSync(current.certificado_path)) fs.unlinkSync(current.certificado_path);
                } catch (_unlinkError) {
                    // ignore cleanup errors
                }
            }

            const validade = parsed.validade || null;
            const cnpj = String(parsed.cnpj || '').replace(/\D/g, '').slice(0, 14) || null;
            const titular = String(parsed.titular || '').trim().slice(0, 180) || null;

            await pool.query(`
                UPDATE nfe_config SET
                    certificado_nome = ?,
                    certificado_path = ?,
                    certificado_senha = ?,
                    certificado_validade = ?,
                    certificado_cnpj = ?,
                    certificado_titular = ?,
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE id = 1
            `, [
                req.file.originalname,
                req.file.path,
                senha,
                validade,
                cnpj,
                titular,
            ]);

            await logAuditoria(req, {
                modulo: 'nfe',
                acao: 'upload_certificado',
                entidade: 'nfe_config',
                entidadeId: 1,
                descricao: `Certificado A1 enviado: ${req.file.originalname}`,
            });

            const row = await getConfigRow();
            return res.json(sanitizeConfig(row || {}));
        } catch (err) {
            logger.error('Erro ao salvar certificado NF-e', { module: 'nfeRoutes', stack: err.stack });
            return res.status(500).json({ message: 'Erro ao salvar certificado.' });
        }
    });
});

router.post('/config/logo', (req, res) => {
    uploadLogo.single('logo')(req, res, async (error) => {
        if (error) {
            return res.status(400).json({ message: error.message || 'Falha no upload da logo.' });
        }
        if (!req.file) {
            return res.status(400).json({ message: 'Selecione a imagem da logo.' });
        }

        try {
            await ensureNfeTables();
            fs.mkdirSync(logoDir, { recursive: true });

            const ext = path.extname(req.file.originalname || req.file.filename || '').toLowerCase()
                || path.extname(req.file.path || '').toLowerCase()
                || '.png';
            const safeExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png';
            const savedPath = path.resolve(logoDir, `logo-nfe-${Date.now()}${safeExt}`);

            // Garante gravação em caminho absoluto conhecido
            if (path.resolve(req.file.path) !== savedPath) {
                fs.copyFileSync(req.file.path, savedPath);
                try { fs.unlinkSync(req.file.path); } catch (_e) { /* ignore */ }
            }

            if (!fs.existsSync(savedPath) || fs.statSync(savedPath).size <= 0) {
                return res.status(500).json({ message: 'Arquivo da logo não foi gravado no disco.' });
            }

            const current = await getConfigRow();
            if (current?.logo_path) {
                const oldPath = path.resolve(current.logo_path);
                if (oldPath !== savedPath) {
                    try {
                        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
                    } catch (_unlinkError) {
                        // ignore
                    }
                }
            }

            const logoNome = decodeUploadFilename(req.file.originalname || path.basename(savedPath));
            const [updateResult] = await pool.query(`
                UPDATE nfe_config SET
                    logo_nome = ?,
                    logo_path = ?,
                    atualizado_em = CURRENT_TIMESTAMP
                WHERE id = 1
            `, [logoNome, savedPath]);

            if (!updateResult || (updateResult.affectedRows !== undefined && updateResult.affectedRows < 1)) {
                await pool.query(`
                    INSERT INTO nfe_config (id, uf, ambiente, serie, proximo_numero, ativo, logo_nome, logo_path)
                    VALUES (1, 'MG', 'homologacao', 1, 1, TRUE, ?, ?)
                    ON CONFLICT (id) DO UPDATE SET
                        logo_nome = EXCLUDED.logo_nome,
                        logo_path = EXCLUDED.logo_path,
                        atualizado_em = CURRENT_TIMESTAMP
                `, [logoNome, savedPath]);
            }

            await logAuditoria(req, {
                modulo: 'nfe',
                acao: 'upload_logo',
                entidade: 'nfe_config',
                entidadeId: 1,
                descricao: `Logo NF-e enviada: ${logoNome}`,
            });

            const row = await getConfigRow();
            const sanitized = sanitizeConfig(row || {});
            if (!sanitized.has_logo) {
                logger.error('Logo gravada no disco mas não detectada após salvar', {
                    module: 'nfeRoutes',
                    savedPath,
                    dbPath: row?.logo_path,
                });
                return res.status(500).json({ message: 'Logo gravada, mas não foi possível validar o arquivo.' });
            }
            return res.json(sanitized);
        } catch (err) {
            logger.error('Erro ao salvar logo NF-e', { module: 'nfeRoutes', stack: err.stack });
            return res.status(500).json({ message: err.message || 'Erro ao salvar logo.' });
        }
    });
});

router.get('/logo', async (_req, res) => {
    try {
        await ensureNfeTables();
        const row = await getConfigRow();
        const logoPath = row?.logo_path ? path.resolve(row.logo_path) : '';
        if (!logoPath || !fs.existsSync(logoPath)) {
            return res.status(404).json({ message: 'Logo não configurada.' });
        }
        res.setHeader('Cache-Control', 'private, max-age=60');
        return res.sendFile(logoPath);
    } catch (error) {
        logger.error('Erro ao servir logo NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao carregar logo.' });
    }
});

router.post('/config/sefaz-status', async (_req, res) => {
    try {
        let row = await getConfigRow();
        row = await syncCertMetadataFromFile(row || {});
        const config = sanitizeConfig(row || {});
        const ambiente = config.ambiente;
        const host = SEFAZ_HOSTS[ambiente] || SEFAZ_HOSTS.homologacao;

        const checks = [];
        if (config.uf !== 'MG') {
            checks.push('UF deve ser Minas Gerais (MG).');
        }
        if (!config.has_certificado) {
            checks.push('Certificado A1 não enviado.');
        }
        if (!config.has_certificado_senha) {
            checks.push('Senha do certificado não informada.');
        }
        if (!config.certificado_validade) {
            checks.push('Validade do certificado não informada.');
        } else if (!config.certificado_valido) {
            checks.push('Certificado vencido.');
        }
        if (!config.ativo) {
            checks.push('Emissão NF-e está desativada.');
        }

        const reach = await checkHostReachable(host);
        let sefazStatus = 'indisponivel';
        let sefazMensagem = reach.message;

        if (checks.length) {
            sefazStatus = 'config_incompleta';
            sefazMensagem = `${checks.join(' ')} Host SEFAZ MG (${ambiente}): ${reach.message}`;
        } else if (reach.ok) {
            sefazStatus = 'online';
            sefazMensagem = `SEFAZ MG (${ambiente}) alcançável em ${host}. Comunicação SOAP assinada será usada na emissão real.`;
        } else {
            sefazStatus = 'offline';
            sefazMensagem = `SEFAZ MG (${ambiente}) inacessível: ${reach.message}`;
        }

        await pool.query(`
            UPDATE nfe_config SET
                sefaz_status = ?,
                sefaz_mensagem = ?,
                sefaz_verificado_em = CURRENT_TIMESTAMP,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [sefazStatus, sefazMensagem]);

        const updated = await getConfigRow();
        return res.json({
            ...sanitizeConfig(updated || {}),
            host,
            reach,
            pendencias: checks,
        });
    } catch (error) {
        logger.error('Erro ao consultar status SEFAZ', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao consultar status da SEFAZ.' });
    }
});

router.get('/pedidos', async (req, res) => {
    try {
        await ensureNfeTables();
        const somentePendentes = String(req.query.pendentes || '') === '1';
        const clienteId = Number(req.query.cliente_id);

        const filters = ["p.status <> 'Cancelado'", "p.status <> 'Rascunho'"];
        const params = [];
        if (somentePendentes) {
            filters.push("(p.nfe_status IS NULL OR p.nfe_status = '' OR p.nfe_status = 'Sem NF' OR p.nfe_status = 'Rejeitada')");
        }
        if (Number.isInteger(clienteId) && clienteId > 0) {
            filters.push('p.cliente_id = ?');
            params.push(clienteId);
        }

        const [rows] = await pool.query(`
            SELECT
                p.id,
                p.numero,
                p.cliente_id,
                p.status,
                p.data_pedido,
                p.data_entrega,
                p.nfe_numero,
                p.nfe_chave,
                p.nfe_status,
                p.nfe_data,
                p.endereco_entrega,
                p.cidade_entrega,
                p.uf_entrega,
                p.cep_entrega,
                p.contato_entrega,
                p.telefone_entrega,
                p.observacoes,
                c.nome_razao_social AS cliente_nome,
                c.cpf_cnpj AS cliente_documento,
                c.email_contato AS cliente_email,
                c.telefone_principal AS cliente_telefone,
                c.endereco AS cliente_endereco,
                c.numero AS cliente_numero,
                c.bairro AS cliente_bairro,
                c.cidade AS cliente_cidade,
                c.estado AS cliente_uf,
                c.cep AS cliente_cep,
                COALESCE((
                    SELECT SUM(i.subtotal) FROM pedido_itens i WHERE i.pedido_id = p.id
                ), 0) AS subtotal,
                p.desconto,
                p.frete
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            WHERE ${filters.join(' AND ')}
            ORDER BY p.data_pedido DESC, p.id DESC
            LIMIT 200
        `, params);

        const data = rows.map((row) => {
            const total = Number((
                toInt(row.subtotal, 0) - Math.max(0, Number(row.desconto) || 0) + Math.max(0, Number(row.frete) || 0)
            ).toFixed(2));
            return {
                ...row,
                total,
                pode_emitir: !row.nfe_status || ['Sem NF', 'Rejeitada', ''].includes(row.nfe_status),
            };
        });

        return res.json(data);
    } catch (error) {
        logger.error('Erro ao listar pedidos NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao listar pedidos para NF-e.' });
    }
});

router.get('/emissoes', async (_req, res) => {
    try {
        await ensureNfeTables();
        const [rows] = await pool.query(`
            SELECT
                e.id, e.pedido_id, e.ambiente, e.numero, e.serie, e.chave, e.protocolo,
                e.status, e.mensagem, e.xml_path, e.nota_path, e.payload_json, e.criado_em,
                e.cancelamento_motivo, e.cancelamento_em,
                p.numero AS pedido_numero,
                c.nome_razao_social AS cliente_nome
            FROM nfe_emissoes e
            INNER JOIN pedidos p ON p.id = e.pedido_id
            INNER JOIN clientes c ON c.id = p.cliente_id
            ORDER BY e.id DESC
            LIMIT 100
        `);
        return res.json(rows.map((row) => {
            const { payload_json: payloadJson, xml_path: xmlPath, nota_path: notaPath, ...safe } = row;
            const payload = parsePayloadJson(payloadJson);
            const resolvedXml = resolveNfeStoredPath(xmlPath)
                || resolveNfeStoredPath(payload?.arquivos?.xml);
            const resolvedNota = resolveNfeStoredPath(notaPath)
                || resolveNfeStoredPath(payload?.arquivos?.nota);
            return {
                ...safe,
                has_xml: Boolean(resolvedXml || payloadJson),
                has_nota: Boolean(resolvedNota),
                pode_cancelar: !String(row.status || '').toLowerCase().includes('cancel'),
            };
        }));
    } catch (error) {
        logger.error('Erro ao listar emissões NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao listar emissões.' });
    }
});

router.get('/emissoes/:id/xml', async (req, res) => {
    try {
        await ensureNfeTables();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Emissão inválida.' });
        }
        const [rows] = await pool.query(`
            SELECT id, chave, xml_path, payload_json, numero, serie, protocolo, ambiente
            FROM nfe_emissoes WHERE id = ?
        `, [id]);
        if (!rows.length) return res.status(404).json({ message: 'Emissão não encontrada.' });
        const row = rows[0];
        const fileName = `${String(row.chave || `nfe-${id}`).replace(/\D/g, '') || `nfe-${id}`}-nfe.xml`;
        const payload = parsePayloadJson(row.payload_json);

        let xmlPath = resolveNfeStoredPath(row.xml_path)
            || resolveNfeStoredPath(payload?.arquivos?.xml);

        // Tenta localizar pelo padrão storage/nfe/AAAA/MM/xml/{chave}-nfe.xml
        if (!xmlPath && row.chave) {
            const chave = String(row.chave).replace(/\D/g, '');
            const yearDirs = fs.existsSync(nfeRoot)
                ? fs.readdirSync(nfeRoot).filter((name) => /^\d{4}$/.test(name))
                : [];
            for (const year of yearDirs) {
                const yearPath = path.join(nfeRoot, year);
                const months = fs.readdirSync(yearPath).filter((name) => /^\d{2}$/.test(name));
                for (const month of months) {
                    const candidate = path.join(yearPath, month, 'xml', `${chave}-nfe.xml`);
                    if (fs.existsSync(candidate)) {
                        xmlPath = candidate;
                        break;
                    }
                }
                if (xmlPath) break;
            }
        }

        if (xmlPath && fs.existsSync(xmlPath)) {
            // Corrige caminho no banco se estava relativo/quebrado
            if (row.xml_path !== xmlPath) {
                await pool.query('UPDATE nfe_emissoes SET xml_path = ? WHERE id = ?', [xmlPath, id]).catch(() => null);
            }
            res.setHeader('Content-Type', 'application/xml; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            return res.send(fs.readFileSync(xmlPath, 'utf8'));
        }

        if (!payload) {
            return res.status(404).json({ message: 'XML desta NF-e não foi encontrado no armazenamento.' });
        }

        const [empresas] = await pool.query(`
            SELECT id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                   email, telefone, cep, cidade, estado, rua, numero, bairro, complemento
            FROM empresa ORDER BY id LIMIT 1
        `);

        const xmlData = {
            chave: row.chave,
            numero: row.numero,
            serie: row.serie,
            protocolo: row.protocolo,
            ambiente: row.ambiente,
            emitente: payload.emitente || empresas[0] || {},
            destinatario: payload.destinatario || {},
            fiscal: payload.fiscal || {},
            itens: payload.itens || [],
            totais: payload.totais || {},
            observacoes: payload.observacoes || '',
        };
        const xml = buildNfeXml(xmlData);

        // Regrava o arquivo para próximas consultas
        try {
            const saved = saveEmissaoArquivos(xmlData);
            await pool.query(
                'UPDATE nfe_emissoes SET xml_path = ?, nota_path = COALESCE(nota_path, ?) WHERE id = ?',
                [saved.xml_path, saved.nota_path, id]
            );
        } catch (_saveError) {
            // ainda devolve o XML gerado
        }

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.send(xml);
    } catch (error) {
        logger.error('Erro ao baixar XML NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao baixar XML da NF-e.' });
    }
});

router.post('/emissoes/:id/cancelar', async (req, res) => {
    const client = await pool.getConnection();
    try {
        await ensureNfeTables();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Emissão inválida.' });
        }

        const motivo = String(req.body?.motivo || '').trim().replace(/\s+/g, ' ');
        if (motivo.length < 15) {
            return res.status(400).json({
                message: 'Informe o motivo do cancelamento com no mínimo 15 caracteres (exigência SEFAZ).',
            });
        }
        if (motivo.length > 255) {
            return res.status(400).json({
                message: 'O motivo do cancelamento deve ter no máximo 255 caracteres.',
            });
        }

        await client.beginTransaction();
        const [rows] = await client.query(`
            SELECT e.*, p.numero AS pedido_numero
            FROM nfe_emissoes e
            INNER JOIN pedidos p ON p.id = e.pedido_id
            WHERE e.id = ?
            FOR UPDATE
        `, [id]);

        if (!rows.length) {
            throw Object.assign(new Error('Emissão não encontrada.'), { status: 404 });
        }

        const emissao = rows[0];
        const statusAtual = String(emissao.status || '').toLowerCase();
        if (statusAtual.includes('cancel')) {
            throw Object.assign(new Error('Esta NF-e já está cancelada.'), { status: 400 });
        }

        const actor = getActor(req);
        await client.query(`
            UPDATE nfe_emissoes SET
                status = 'cancelada',
                mensagem = ?,
                cancelamento_motivo = ?,
                cancelamento_em = CURRENT_TIMESTAMP,
                cancelamento_por = ?,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            `NF-e cancelada. Motivo: ${motivo}`,
            motivo,
            actor,
            id,
        ]);

        await client.query(`
            UPDATE pedidos SET
                nfe_status = 'Cancelada',
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [emissao.pedido_id]);

        await client.commit();

        await logAuditoria(req, {
            modulo: 'nfe',
            acao: 'cancelar',
            entidade: 'nfe_emissao',
            entidadeId: id,
            descricao: `Cancelou NF-e ${emissao.numero}/${emissao.serie}. Motivo: ${motivo}`,
        });

        return res.json({
            id,
            status: 'cancelada',
            cancelamento_motivo: motivo,
            message: 'NF-e cancelada com sucesso.',
        });
    } catch (error) {
        await client.rollback();
        const status = error.status || 500;
        if (status >= 500) {
            logger.error('Erro ao cancelar NF-e', { module: 'nfeRoutes', stack: error.stack });
        }
        return res.status(status).json({ message: error.message || 'Erro ao cancelar NF-e.' });
    } finally {
        client.release();
    }
});

router.get('/emissoes/:id', async (req, res) => {
    try {
        await ensureNfeTables();
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: 'Emissão inválida.' });
        }

        const [emissoes] = await pool.query(`
            SELECT
                e.*,
                p.numero AS pedido_numero,
                p.data_pedido,
                p.data_entrega,
                p.desconto,
                p.frete,
                p.observacoes AS pedido_observacoes,
                p.endereco_entrega,
                p.cidade_entrega,
                p.uf_entrega,
                p.cep_entrega,
                p.contato_entrega,
                p.telefone_entrega,
                c.nome_razao_social AS cliente_nome,
                c.cpf_cnpj AS cliente_documento,
                c.email_contato AS cliente_email,
                c.telefone_principal AS cliente_telefone,
                c.endereco AS cliente_endereco,
                c.numero AS cliente_numero,
                c.bairro AS cliente_bairro,
                c.cidade AS cliente_cidade,
                c.estado AS cliente_uf,
                c.cep AS cliente_cep,
                c.rg_ie AS cliente_ie
            FROM nfe_emissoes e
            INNER JOIN pedidos p ON p.id = e.pedido_id
            INNER JOIN clientes c ON c.id = p.cliente_id
            WHERE e.id = ?
        `, [id]);

        if (!emissoes.length) {
            return res.status(404).json({ message: 'Emissão não encontrada.' });
        }

        const emissao = emissoes[0];
        const payload = parsePayloadJson(emissao.payload_json);

        let itens = [];
        if (payload?.itens?.length) {
            itens = payload.itens;
        } else {
            const [dbItens] = await pool.query(`
                SELECT
                    i.*,
                    pr.nome AS produto_nome,
                    pr.codigo AS produto_codigo,
                    pr.ncm,
                    pr.cfop_padrao,
                    pr.cst_csosn,
                    pr.aliq_icms,
                    pr.aliq_ipi,
                    pr.aliq_pis,
                    pr.aliq_cofins
                FROM pedido_itens i
                INNER JOIN produtos pr ON pr.id = i.produto_id
                WHERE i.pedido_id = ?
                ORDER BY i.id
            `, [emissao.pedido_id]);
            itens = dbItens.map((item) => {
                const subtotal = toMoneyNumber(item.subtotal || (Number(item.quantidade) * Number(item.preco_unitario)));
                const aliqIcms = toMoneyNumber(item.aliq_icms);
                const aliqIpi = toMoneyNumber(item.aliq_ipi);
                return {
                    ...item,
                    ncm: item.ncm || '',
                    cfop: item.cfop_padrao || '5102',
                    cst_csosn: item.cst_csosn || '102',
                    aliq_icms: aliqIcms,
                    aliq_ipi: aliqIpi,
                    aliq_pis: toMoneyNumber(item.aliq_pis),
                    aliq_cofins: toMoneyNumber(item.aliq_cofins),
                    base_icms: aliqIcms > 0 ? subtotal : 0,
                    valor_icms: toMoneyNumber((subtotal * aliqIcms) / 100),
                    valor_ipi: toMoneyNumber((subtotal * aliqIpi) / 100),
                    subtotal,
                };
            });
        }

        const [empresas] = await pool.query(`
            SELECT
                id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                regime_tributario, email, telefone, cep, cidade, estado, rua, numero, bairro, complemento
            FROM empresa
            ORDER BY id
            LIMIT 1
        `);

        const config = sanitizeConfig((await getConfigRow()) || {});
        const totais = payload?.totais || {
            subtotal: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.subtotal) || 0), 0)),
            desconto: toMoneyNumber(emissao.desconto),
            frete: toMoneyNumber(emissao.frete),
            outras: 0,
            seguro: 0,
            base_icms: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.base_icms) || 0), 0)),
            valor_icms: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.valor_icms) || 0), 0)),
            valor_ipi: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.valor_ipi) || 0), 0)),
            valor_pis: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.valor_pis) || 0), 0)),
            valor_cofins: toMoneyNumber(itens.reduce((acc, item) => acc + (Number(item.valor_cofins) || 0), 0)),
            total_impostos: 0,
            total: 0,
        };
        if (!payload?.totais) {
            totais.total_impostos = toMoneyNumber(
                (totais.valor_icms || 0) + (totais.valor_ipi || 0) + (totais.valor_pis || 0) + (totais.valor_cofins || 0)
            );
            totais.total = toMoneyNumber(
                Math.max(0, (totais.subtotal || 0) - (totais.desconto || 0) + (totais.frete || 0) + (totais.valor_ipi || 0))
            );
        }

        const { payload_json: _payloadJson, xml_path: _xmlPath, nota_path: _notaPath, ...safeEmissao } = emissao;

        return res.json({
            ...safeEmissao,
            has_xml: Boolean(
                resolveNfeStoredPath(emissao.xml_path)
                || resolveNfeStoredPath(payload?.arquivos?.xml)
                || payload
            ),
            has_nota: Boolean(
                resolveNfeStoredPath(emissao.nota_path)
                || resolveNfeStoredPath(payload?.arquivos?.nota)
            ),
            fiscal: payload?.fiscal || null,
            observacoes: (() => {
                const pedidoCtx = {
                    id: emissao.pedido_id,
                    numero: emissao.pedido_numero,
                    observacoes: emissao.pedido_observacoes,
                    endereco_entrega: emissao.endereco_entrega,
                    cidade_entrega: emissao.cidade_entrega,
                    uf_entrega: emissao.uf_entrega,
                    cep_entrega: emissao.cep_entrega,
                    cliente_endereco: emissao.cliente_endereco,
                    cliente_numero: emissao.cliente_numero,
                    cliente_bairro: emissao.cliente_bairro,
                    cliente_cidade: emissao.cliente_cidade,
                    cliente_uf: emissao.cliente_uf,
                    cliente_cep: emissao.cliente_cep,
                };
                const destCtx = {
                    endereco: emissao.endereco_entrega
                        || [
                            emissao.cliente_endereco,
                            emissao.cliente_numero ? `nº ${emissao.cliente_numero}` : '',
                            emissao.cliente_bairro,
                        ].filter(Boolean).join(', '),
                    cidade: emissao.cidade_entrega || emissao.cliente_cidade,
                    uf: emissao.uf_entrega || emissao.cliente_uf,
                    cep: emissao.cep_entrega || emissao.cliente_cep,
                };
                const built = buildNfeObservacoesPadrao({
                    template: config.observacoes_texto || OBSERVACOES_PADRAO,
                    pedido: pedidoCtx,
                    ambiente: emissao.ambiente || config.ambiente,
                    observacaoExtra: emissao.pedido_observacoes || '',
                    destinatario: destCtx,
                    totais,
                });
                let stored = String(payload?.observacoes || '').trim();
                if (!stored) return built;
                if (/Conforme cadastro do destinatário/i.test(stored)) {
                    const localMatch = built.match(/Local de Entrega\/Descarga:\s*(.+?)(?:\.|$)/i);
                    const localReal = localMatch?.[1]?.trim();
                    if (localReal && !/Conforme cadastro/i.test(localReal)) {
                        stored = stored.replace(
                            /Local de Entrega\/Descarga:\s*Conforme cadastro do destinatário\.?/gi,
                            `Local de Entrega/Descarga: ${localReal}.`
                        );
                    }
                }
                return stored;
            })(),
            itens,
            emitente: empresas[0] || null,
            config: {
                uf: config.uf,
                ambiente: config.ambiente,
                serie: config.serie,
                logo_url: config.logo_url || '',
                logo_data_url: config.logo_data_url || '',
                has_logo: config.has_logo,
            },
            totais,
            pode_cancelar: !String(emissao.status || '').toLowerCase().includes('cancel'),
        });
    } catch (error) {
        logger.error('Erro ao carregar emissão NF-e', { module: 'nfeRoutes', stack: error.stack });
        return res.status(500).json({ message: 'Erro ao carregar emissão NF-e.' });
    }
});

router.post('/emitir/:pedidoId', async (req, res) => {
    const client = await pool.getConnection();
    try {
        await ensureNfeTables();
        const pedidoId = Number(req.params.pedidoId);
        if (!Number.isInteger(pedidoId) || pedidoId <= 0) {
            return res.status(400).json({ message: 'Pedido inválido.' });
        }

        const configRow = await getConfigRow();
        const config = sanitizeConfig(configRow || {});
        if (!config.pronto_para_emissao) {
            return res.status(400).json({
                message: 'Configure o certificado A1 e a SEFAZ MG em Configurações → NF-e antes de emitir.',
            });
        }

        await client.beginTransaction();

        const [pedidos] = await client.query(`
            SELECT
                p.*,
                c.cpf_cnpj AS cliente_documento,
                c.nome_razao_social AS cliente_nome,
                c.endereco AS cliente_endereco,
                c.numero AS cliente_numero,
                c.bairro AS cliente_bairro,
                c.cidade AS cliente_cidade,
                c.estado AS cliente_uf,
                c.cep AS cliente_cep
            FROM pedidos p
            INNER JOIN clientes c ON c.id = p.cliente_id
            WHERE p.id = ?
            FOR UPDATE
        `, [pedidoId]);

        if (!pedidos.length) {
            throw Object.assign(new Error('Pedido não encontrado.'), { status: 404 });
        }

        const pedido = pedidos[0];
        if (pedido.status === 'Cancelado' || pedido.status === 'Rascunho') {
            throw Object.assign(new Error('Este pedido não pode emitir NF-e no status atual.'), { status: 400 });
        }
        if (pedido.nfe_status === 'Emitida' || pedido.nfe_status === 'Autorizada') {
            throw Object.assign(new Error('Este pedido já possui NF-e emitida.'), { status: 400 });
        }

        const [pedidoItens] = await client.query(`
            SELECT
                i.produto_id, i.quantidade, i.preco_unitario, i.unidade, i.subtotal,
                pr.codigo, pr.nome, pr.ncm, pr.cfop_padrao, pr.cst_csosn,
                pr.aliq_icms, pr.aliq_ipi, pr.aliq_pis, pr.aliq_cofins, pr.unidade AS produto_unidade
            FROM pedido_itens i
            INNER JOIN produtos pr ON pr.id = i.produto_id
            WHERE i.pedido_id = ?
            ORDER BY i.id
        `, [pedidoId]);

        const produtosById = new Map(pedidoItens.map((item) => [Number(item.produto_id), item]));
        const bodyItens = Array.isArray(req.body?.itens) && req.body.itens.length
            ? req.body.itens
            : pedidoItens.map((item) => ({
                produto_id: item.produto_id,
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario,
                unidade: item.unidade || item.produto_unidade || 'un',
                ncm: item.ncm,
                cfop: item.cfop_padrao,
                cst_csosn: item.cst_csosn,
                aliq_icms: item.aliq_icms,
                aliq_ipi: item.aliq_ipi,
                aliq_pis: item.aliq_pis,
                aliq_cofins: item.aliq_cofins,
            }));

        const normalized = normalizeEmitPayload({
            ...req.body,
            itens: bodyItens,
            destinatario: req.body?.destinatario || {
                nome: pedido.contato_entrega || pedido.cliente_nome,
                documento: pedido.cliente_documento,
                endereco: pedido.endereco_entrega
                    || [
                        pedido.cliente_endereco,
                        pedido.cliente_numero ? `nº ${pedido.cliente_numero}` : '',
                        pedido.cliente_bairro,
                    ].filter(Boolean).join(', '),
                bairro: pedido.cliente_bairro,
                cidade: pedido.cidade_entrega || pedido.cliente_cidade,
                uf: pedido.uf_entrega || pedido.cliente_uf,
                cep: pedido.cep_entrega || pedido.cliente_cep,
            },
            observacoes: req.body?.observacoes || pedido.observacoes || '',
            totais: req.body?.totais || {
                frete: pedido.frete,
                desconto: pedido.desconto,
            },
        }, produtosById);

        if (!normalized.itens.length) {
            throw Object.assign(new Error('O pedido não possui itens para emitir a NF-e.'), { status: 400 });
        }

        const [empresas] = await client.query(`
            SELECT
                id, razao_social, nome_fantasia, cnpj, inscricao_estadual, inscricao_municipal,
                regime_tributario, email, telefone, cep, cidade, estado, rua, numero, bairro, complemento
            FROM empresa
            ORDER BY id
            LIMIT 1
        `);

        const [cfgLocked] = await client.query('SELECT * FROM nfe_config WHERE id = 1 FOR UPDATE');
        const cfg = cfgLocked[0];
        const numero = toInt(cfg.proximo_numero, 1);
        const serie = toInt(cfg.serie, 1);
        const ambiente = cfg.ambiente || 'homologacao';

        const observacoesFinais = buildNfeObservacoesPadrao({
            template: cfg.observacoes_texto || OBSERVACOES_PADRAO,
            pedido,
            ambiente,
            observacaoExtra: pedido.observacoes || '',
            modFrete: normalized.fiscal?.mod_frete || req.body?.fiscal?.mod_frete || '9',
            destinatario: normalized.destinatario || {},
            totais: normalized.totais || {},
        });
        // Se o usuário editou o texto no formulário, preserva a edição
        const obsCliente = String(req.body?.observacoes || '').trim();
        normalized.observacoes = obsCliente || observacoesFinais;
        const chave = buildChaveSimulada({
            cnpj: cfg.certificado_cnpj || empresas[0]?.cnpj,
            serie,
            numero,
            ambiente,
        });
        const protocolo = `SIM${Date.now().toString().slice(-10)}`;
        const statusEmissao = ambiente === 'homologacao' ? 'autorizada_homologacao' : 'autorizada';
        const mensagem = ambiente === 'homologacao'
            ? 'NF-e autorizada em homologação (simulação local). XML e DANFE salvos em storage/nfe/AAAA/MM.'
            : 'NF-e marcada como autorizada. XML e DANFE salvos em storage/nfe/AAAA/MM.';

        const arquivoData = {
            chave,
            numero,
            serie,
            protocolo,
            ambiente,
            dh_emi: new Date().toISOString(),
            emitente: empresas[0] || {},
            destinatario: normalized.destinatario,
            fiscal: normalized.fiscal,
            itens: normalized.itens,
            totais: normalized.totais,
            observacoes: normalized.observacoes,
        };
        const savedFiles = saveEmissaoArquivos(arquivoData);
        const payloadJson = JSON.stringify({
            emitente: empresas[0] || {},
            fiscal: normalized.fiscal,
            destinatario: normalized.destinatario,
            observacoes: normalized.observacoes,
            itens: normalized.itens,
            totais: normalized.totais,
            arquivos: savedFiles.relative,
        });

        const [insertResult] = await client.query(`
            INSERT INTO nfe_emissoes (
                pedido_id, ambiente, numero, serie, chave, protocolo, status, mensagem,
                xml_path, nota_path, payload_json, criado_por
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            pedidoId,
            ambiente,
            numero,
            serie,
            chave,
            protocolo,
            statusEmissao,
            mensagem,
            savedFiles.xml_path,
            savedFiles.nota_path,
            payloadJson,
            getActor(req),
        ]);

        await client.query(`
            UPDATE nfe_config
            SET proximo_numero = ?, atualizado_em = CURRENT_TIMESTAMP
            WHERE id = 1
        `, [numero + 1]);

        await client.query(`
            UPDATE pedidos SET
                nfe_numero = ?,
                nfe_chave = ?,
                nfe_status = 'Emitida',
                nfe_data = CURRENT_DATE,
                atualizado_em = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [String(numero), chave, pedidoId]);

        await client.commit();

        await logAuditoria(req, {
            modulo: 'nfe',
            acao: 'emitir',
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `NF-e ${numero}/${serie} gerada para pedido ${pedido.numero || pedidoId}.`,
        });

        return res.status(201).json({
            id: insertResult.insertId,
            pedido_id: pedidoId,
            numero,
            serie,
            chave,
            protocolo,
            status: statusEmissao,
            mensagem,
            ambiente,
            xml_path: savedFiles.relative.xml,
            nota_path: savedFiles.relative.nota,
            has_xml: true,
        });
    } catch (error) {
        await client.rollback();
        const status = error.status || 500;
        if (status >= 500) {
            logger.error('Erro ao emitir NF-e', { module: 'nfeRoutes', stack: error.stack });
        }
        return res.status(status).json({ message: error.message || 'Erro ao emitir NF-e.' });
    } finally {
        client.release();
    }
});

module.exports = router;
module.exports.ensureNfeTables = ensureNfeTables;
