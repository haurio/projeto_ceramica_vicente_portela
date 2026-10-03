import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Nav, Row, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSearchSelect from '../../components/admin/AdminSearchSelect';
import AdminFloatField from '../../components/admin/AdminFloatField';
import AdminDateField, { AdminDateFieldProvider } from '../../components/admin/AdminDateField';
import AdminModalClose from '../../components/admin/AdminModalClose';
import StatusBadge from '../../components/admin/StatusBadge';
import NfeDanfeModal from '../../components/admin/nfe/NfeDanfeModal';
import { fetchClientes } from '../../api/clientes';
import { fetchEmpresas, fetchEmpresa } from '../../api/empresa';
import { fetchPedido, updatePedido } from '../../api/pedidos';
import { fetchProdutos } from '../../api/produtos';
import {
    cancelarNfeEmissao,
    downloadNfeXml,
    emitirNfePedido,
    fetchNfeConfig,
    fetchNfeEmissoes,
    fetchNfePedidos,
} from '../../api/nfe';
import { fetchNfeNaturezas } from '../../api/config';
import { showToast } from '../../utils/toast';
import {
    NFE_NATUREZAS,
    NFE_FINALIDADES,
    NFE_TIPOS_OPERACAO,
    NFE_CONSUMIDOR_FINAL,
    NFE_PRESENCA,
    NFE_MOD_FRETE,
    NFE_CST_CSOSN,
    naturezaPorCfop,
    cfopPadraoPorUf,
} from '../../data/nfeNaturezas';

function emptyEmitente() {
    return {
        id: '',
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        regime_tributario: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        uf: '',
        cep: '',
    };
}

function formatCurrency(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(value) {
    if (!value) return '';
    try {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            return date.toLocaleDateString('pt-BR');
        }
    } catch (_e) {
        // fallback abaixo
    }
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value);
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function formatDateTimeBr(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleString('pt-BR');
    } catch (_e) {
        return formatDateBr(value);
    }
}

function formatDoc(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11) {
        return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    if (digits.length === 14) {
        return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value || '';
}

function formatCep(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length !== 8) return value || '';
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatPedidoRef(pedido) {
    if (!pedido) return '';
    if (pedido.numero || pedido.pedido_numero) return String(pedido.numero || pedido.pedido_numero);
    if (pedido.id) return `PED-${String(pedido.id).padStart(5, '0')}`;
    return '';
}

function labelFreteObs(modFrete) {
    const mod = String(modFrete ?? '9');
    if (mod === '0') return 'CIF - por conta do emitente';
    if (mod === '1') return 'FOB - por conta do cliente';
    if (mod === '2') return 'Por conta de terceiros';
    if (mod === '3') return 'Transporte próprio por conta do remetente';
    if (mod === '4') return 'Transporte próprio por conta do destinatário';
    if (mod === '9') return 'Sem ocorrência de transporte (Retirada no local)';
    return 'Conforme combinado entre as partes';
}

function formatMoneyBrObs(value) {
    return (Number(value) || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function buildLocalEntregaObs({ pedido = null, destinatario = {} } = {}) {
    const endereco = [
        pedido?.endereco_entrega
            || destinatario.endereco
            || [
                pedido?.cliente_endereco,
                pedido?.cliente_numero ? `nº ${pedido.cliente_numero}` : '',
                pedido?.cliente_bairro,
            ].filter(Boolean).join(', '),
        destinatario.bairro && !(pedido?.endereco_entrega || destinatario.endereco)
            ? destinatario.bairro
            : '',
    ].filter(Boolean).join(', ');

    const cidade = destinatario.cidade || pedido?.cidade_entrega || pedido?.cliente_cidade || '';
    const uf = destinatario.uf || pedido?.uf_entrega || pedido?.cliente_uf || '';
    const cepRaw = destinatario.cep || pedido?.cep_entrega || pedido?.cliente_cep || '';
    const cepDigits = String(cepRaw).replace(/\D/g, '');
    const cep = cepDigits.length === 8
        ? `${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`
        : (cepRaw || '');

    const parts = [endereco, cidade, uf, cep].filter(Boolean);
    if (parts.length) return parts.join(' - ');
    return 'Conforme cadastro do destinatário';
}

const OBS_TEMPLATE_FALLBACK = [
    'DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL. NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI. PERMITE O APROVEITAMENTO DO CRÉDITO DE ICMS CORRESPONDENTE À ALÍQUOTA APLICÁVEL ÀS AQUISIÇÕES, NOS TERMOS DO ART. 23 DA LC 123/2006, QUANDO CABÍVEL.',
    'Ref. Pedido: {{pedido}}.',
    'Frete: {{frete}}.',
    'Local de Entrega/Descarga: {{local_entrega}}.',
    'Valor aprox. dos tributos calculados automaticamente pelo sistema (Fonte: IBPT).',
].join('\n');

function applyObservacoesTemplate(template, {
    pedido = null,
    ambiente = 'homologacao',
    observacaoPedido = '',
    modFrete = '9',
    destinatario = {},
    totais = {},
} = {}) {
    const totalNota = Number(totais.total) || 0;
    const trib = Number(totais.total_impostos) || 0;
    const pct = totalNota > 0 ? (trib / totalNota) * 100 : 0;
    const replacements = {
        pedido: formatPedidoRef(pedido) || '—',
        frete: labelFreteObs(modFrete),
        local_entrega: buildLocalEntregaObs({ pedido, destinatario }),
        tributos_valor: formatMoneyBrObs(trib),
        tributos_pct: formatMoneyBrObs(pct),
    };

    let texto = String(template || OBS_TEMPLATE_FALLBACK);
    Object.entries(replacements).forEach(([key, value]) => {
        texto = texto.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), String(value));
    });

    const obsPedido = String(observacaoPedido || pedido?.observacoes || '').trim();
    if (obsPedido && !texto.includes(obsPedido)) {
        texto = `${texto.trim()}\n${obsPedido}`;
    }

    if (ambiente !== 'producao' && !/homologação|homologacao/i.test(texto)) {
        texto = `${texto.trim()}\nNF-e EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL.`;
    }

    return texto.trim();
}

function toNumber(value) {
    const parsed = Number(String(value ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
}

function priceForUnidade(produto, unidade) {
    if (!produto) return 0;
    if (unidade === 'milheiro') {
        return toNumber(produto.preco_milheiro) || toNumber(produto.preco_unitario);
    }
    if (unidade === 'm²') {
        return toNumber(produto.preco_m2) || toNumber(produto.preco_unitario);
    }
    return toNumber(produto.preco_unitario);
}

function emptyDestinatario() {
    return {
        nome: '',
        documento: '',
        email: '',
        telefone: '',
        endereco: '',
        cidade: '',
        uf: '',
        cep: '',
    };
}

function formatAliqField(value) {
    const n = Number(String(value ?? 0).replace(',', '.'));
    if (!Number.isFinite(n)) return '0,00';
    return n.toFixed(2).replace('.', ',');
}

function emptyLine() {
    return {
        produto_id: '',
        quantidade: '',
        preco_unitario: '',
        unidade: 'un',
        ncm: '',
        cfop: '',
        cst_csosn: '',
        aliq_icms: '',
        aliq_ipi: '',
        aliq_pis: '',
        aliq_cofins: '',
    };
}

function emptyFiscal() {
    return {
        natureza_id: '5102',
        natureza: 'Venda de mercadoria adquirida ou recebida de terceiros',
        cfop: '5102',
        tipo_operacao: '1',
        finalidade: '1',
        consumidor_final: '1',
        presenca: '1',
        mod_frete: '9',
        frete: '0',
        desconto: '0',
        outras_despesas: '0',
        seguro: '0',
    };
}

const UNIDADE_OPTIONS = [
    { value: 'un', label: 'un' },
    { value: 'milheiro', label: 'milheiro' },
    { value: 'm²', label: 'm²' },
    { value: 'cx', label: 'cx' },
];

export default function EmitirNfePage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('emitir');
    const [config, setConfig] = useState(null);
    const [emitente, setEmitente] = useState(emptyEmitente());
    const [clientes, setClientes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [pedidosCliente, setPedidosCliente] = useState([]);
    const [emissoes, setEmissoes] = useState([]);
    const [buscaNotas, setBuscaNotas] = useState('');
    const [previewEmissaoId, setPreviewEmissaoId] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);
    const [cancelMotivo, setCancelMotivo] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [emitting, setEmitting] = useState(false);
    const [clienteId, setClienteId] = useState('');
    const [pedidoId, setPedidoId] = useState('');
    const [pedidoFull, setPedidoFull] = useState(null);
    const [itens, setItens] = useState([emptyLine()]);
    const [fiscal, setFiscal] = useState(emptyFiscal());
    const [naturezas, setNaturezas] = useState(NFE_NATUREZAS);
    const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
    const [observacoes, setObservacoes] = useState('');
    const [destinatario, setDestinatario] = useState(emptyDestinatario());

    const naturezasAtivas = useMemo(
        () => (naturezas || []).filter((item) => item.ativo !== false),
        [naturezas]
    );
    const produtoMap = useMemo(() => {
        const map = new Map();
        produtos.forEach((item) => map.set(String(item.id), item));
        return map;
    }, [produtos]);

    const produtoOptions = useMemo(
        () => produtos.map((item) => ({
            id: String(item.id),
            label: `${item.codigo ? `${item.codigo} - ` : ''}${item.nome}`,
            search: `${item.codigo || ''} ${item.nome || ''}`,
        })),
        [produtos]
    );

    const clienteOptions = useMemo(
        () => clientes.map((item) => ({
            id: String(item.id),
            label: `${item.nome_razao_social || 'Cliente'}${item.cpf_cnpj ? ` · ${formatDoc(item.cpf_cnpj)}` : ''}`,
            search: `${item.nome_razao_social || ''} ${item.cpf_cnpj || ''} ${item.email || ''}`,
        })),
        [clientes]
    );

    const pedidoOptions = useMemo(
        () => pedidosCliente.map((item) => ({
            id: String(item.id),
            label: `${item.numero || `PED-${String(item.id).padStart(5, '0')}`} · ${formatCurrency(item.total)} · ${item.nfe_status || 'Sem NF'}`,
            search: `${item.numero || ''} ${item.status || ''}`,
        })),
        [pedidosCliente]
    );

    const selectedPedido = useMemo(
        () => pedidosCliente.find((item) => String(item.id) === String(pedidoId)) || null,
        [pedidosCliente, pedidoId]
    );

    const totais = useMemo(() => {
        const subtotal = itens.reduce(
            (acc, linha) => acc + (toNumber(linha.quantidade) * toNumber(linha.preco_unitario)),
            0
        );
        const frete = toNumber(fiscal.frete);
        const desconto = toNumber(fiscal.desconto);
        const outras = toNumber(fiscal.outras_despesas);
        const seguro = toNumber(fiscal.seguro);

        let baseIcms = 0;
        let valorIcms = 0;
        let valorIpi = 0;
        let valorPis = 0;
        let valorCofins = 0;

        itens.forEach((linha) => {
            const bruto = toNumber(linha.quantidade) * toNumber(linha.preco_unitario);
            if (bruto <= 0) return;
            const aliqIcms = toNumber(linha.aliq_icms);
            const aliqIpi = toNumber(linha.aliq_ipi);
            const aliqPis = toNumber(linha.aliq_pis);
            const aliqCofins = toNumber(linha.aliq_cofins);
            if (aliqIcms > 0) {
                baseIcms += bruto;
                valorIcms += (bruto * aliqIcms) / 100;
            }
            valorIpi += (bruto * aliqIpi) / 100;
            valorPis += (bruto * aliqPis) / 100;
            valorCofins += (bruto * aliqCofins) / 100;
        });

        const totalImpostos = valorIcms + valorIpi + valorPis + valorCofins;
        const totalNfe = Math.max(0, subtotal - desconto + frete + outras + seguro + valorIpi);

        return {
            subtotal: Number(subtotal.toFixed(2)),
            frete: Number(frete.toFixed(2)),
            desconto: Number(desconto.toFixed(2)),
            outras: Number(outras.toFixed(2)),
            seguro: Number(seguro.toFixed(2)),
            base_icms: Number(baseIcms.toFixed(2)),
            valor_icms: Number(valorIcms.toFixed(2)),
            valor_ipi: Number(valorIpi.toFixed(2)),
            valor_pis: Number(valorPis.toFixed(2)),
            valor_cofins: Number(valorCofins.toFixed(2)),
            total_impostos: Number(totalImpostos.toFixed(2)),
            total: Number(totalNfe.toFixed(2)),
        };
    }, [itens, fiscal]);

    const applyNatureza = useCallback((naturezaId, { syncLinhas = true } = {}) => {
        const key = String(naturezaId || '');
        const item = naturezasAtivas.find((row) => String(row.cfop) === key || String(row.id) === key)
            || naturezaPorCfop(key)
            || NFE_NATUREZAS.find((row) => row.id === key);
        if (!item) return;
        const cfop = String(item.cfop || key);
        setFiscal((current) => ({
            ...current,
            natureza_id: cfop,
            natureza: item.natureza,
            cfop,
            tipo_operacao: item.ambito === 'entrada' ? '0' : '1',
            finalidade: item.ambito === 'entrada' ? '4' : current.finalidade === '4' ? '1' : current.finalidade,
        }));
        if (syncLinhas) {
            setItens((current) => current.map((linha) => (
                linha.produto_id ? { ...linha, cfop } : linha
            )));
        }
    }, [naturezasAtivas]);

    const syncCfopPorUf = useCallback((ufDestino) => {
        const cfop = cfopPadraoPorUf(ufDestino, 'MG');
        const atual = fiscal.natureza_id;
        const atualInfo = naturezasAtivas.find((row) => String(row.cfop) === String(atual))
            || naturezaPorCfop(atual);
        // Só troca automaticamente entre 5102/6102 padrão de venda
        if (!atualInfo || ['5102', '6102'].includes(String(atualInfo.cfop))) {
            applyNatureza(cfop);
        }
    }, [applyNatureza, fiscal.natureza_id, naturezasAtivas]);

    const emissoesFiltradas = useMemo(() => {
        const term = String(buscaNotas || '').trim().toLowerCase();
        if (!term) return emissoes;
        return emissoes.filter((item) => {
            const blob = [
                item.pedido_numero,
                item.pedido_id,
                item.cliente_nome,
                item.numero,
                item.serie,
                item.chave,
                item.status,
                item.protocolo,
            ].join(' ').toLowerCase();
            return blob.includes(term);
        });
    }, [emissoes, buscaNotas]);

    const loadBase = useCallback(async () => {
        setLoading(true);
        try {
            const [cfg, clientesData, produtosData, hist, empresas, naturezasData] = await Promise.all([
                fetchNfeConfig(),
                fetchClientes(),
                fetchProdutos(),
                fetchNfeEmissoes(),
                fetchEmpresas(),
                fetchNfeNaturezas().catch(() => null),
            ]);
            setConfig(cfg);
            setClientes(Array.isArray(clientesData) ? clientesData : []);
            setProdutos(Array.isArray(produtosData) ? produtosData : []);
            setEmissoes(Array.isArray(hist) ? hist : []);
            if (Array.isArray(naturezasData) && naturezasData.length) {
                setNaturezas(naturezasData.map((row) => ({
                    ...row,
                    id: String(row.cfop),
                    label: row.label || `${row.cfop} - ${row.natureza}`,
                })));
            }
            const listaEmpresas = Array.isArray(empresas) ? empresas : [];
            if (listaEmpresas.length) {
                const detalhe = await fetchEmpresa(listaEmpresas[0].id);
                const rua = [detalhe.rua || detalhe.endereco, detalhe.numero ? `nº ${detalhe.numero}` : '', detalhe.bairro]
                    .filter(Boolean)
                    .join(', ');
                setEmitente({
                    id: detalhe.id || '',
                    razao_social: detalhe.razao_social || '',
                    nome_fantasia: detalhe.nome_fantasia || '',
                    cnpj: formatDoc(detalhe.cnpj || ''),
                    inscricao_estadual: detalhe.inscricao_estadual || '',
                    regime_tributario: detalhe.regime_tributario || '',
                    email: detalhe.email || '',
                    telefone: detalhe.telefone || '',
                    endereco: rua,
                    cidade: detalhe.cidade || '',
                    uf: detalhe.estado || 'MG',
                    cep: formatCep(detalhe.cep || ''),
                });
            } else {
                setEmitente(emptyEmitente());
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar NF-e.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBase();
    }, [loadBase]);

    useEffect(() => {
        if (!pedidoId) return;
        const pedidoBase = pedidoFull || selectedPedido;
        if (!pedidoBase) return;
        setObservacoes(applyObservacoesTemplate(config?.observacoes_texto, {
            pedido: pedidoBase,
            ambiente: config?.ambiente || 'homologacao',
            observacaoPedido: pedidoBase.observacoes || '',
            modFrete: fiscal.mod_frete || '9',
            destinatario,
            totais,
        }));
    }, [
        pedidoId,
        pedidoFull,
        selectedPedido,
        config?.observacoes_texto,
        config?.ambiente,
        fiscal.mod_frete,
        destinatario.endereco,
        destinatario.cidade,
        destinatario.uf,
        destinatario.cep,
        totais.total,
        totais.total_impostos,
    ]);

    const fillFromCliente = useCallback((cliente) => {
        if (!cliente) {
            setDestinatario(emptyDestinatario());
            return;
        }
        setDestinatario({
            nome: cliente.nome_razao_social || '',
            documento: formatDoc(cliente.cpf_cnpj || ''),
            email: cliente.email_contato || cliente.email || '',
            telefone: cliente.telefone_principal || '',
            endereco: [cliente.endereco, cliente.numero ? `nº ${cliente.numero}` : '', cliente.bairro]
                .filter(Boolean)
                .join(', '),
            cidade: cliente.cidade || '',
            uf: cliente.estado || '',
            cep: formatCep(cliente.cep || ''),
        });
        if (cliente.estado) {
            const cfop = cfopPadraoPorUf(cliente.estado, 'MG');
            applyNatureza(cfop);
        }
    }, [applyNatureza]);

    const fillFromPedido = useCallback((pedido) => {
        if (!pedido) {
            setDestinatario(emptyDestinatario());
            setObservacoes('');
            setItens([emptyLine()]);
            setFiscal((current) => ({
                ...current,
                frete: '0',
                desconto: '0',
                outras_despesas: '0',
                seguro: '0',
            }));
            return;
        }

        const endereco = pedido.endereco_entrega
            || [pedido.cliente_endereco, pedido.cliente_numero ? `nº ${pedido.cliente_numero}` : '', pedido.cliente_bairro]
                .filter(Boolean)
                .join(', ');

        setDestinatario({
            nome: pedido.cliente_nome || '',
            documento: formatDoc(pedido.cliente_documento || ''),
            email: pedido.cliente_email || '',
            telefone: pedido.telefone_entrega || pedido.cliente_telefone || '',
            endereco: endereco || '',
            cidade: pedido.cidade_entrega || pedido.cliente_cidade || '',
            uf: pedido.uf_entrega || pedido.cliente_uf || '',
            cep: formatCep(pedido.cep_entrega || pedido.cliente_cep || ''),
        });
        setObservacoes(applyObservacoesTemplate(config?.observacoes_texto, {
            pedido,
            ambiente: config?.ambiente || 'homologacao',
            observacaoPedido: pedido.observacoes || '',
            modFrete: fiscal.mod_frete || '9',
            destinatario: {
                endereco: endereco || '',
                cidade: pedido.cidade_entrega || pedido.cliente_cidade || '',
                uf: pedido.uf_entrega || pedido.cliente_uf || '',
                cep: formatCep(pedido.cep_entrega || pedido.cliente_cep || ''),
            },
            totais: {},
        }));
        setDataEmissao(String(pedido.data_pedido || new Date().toISOString().slice(0, 10)).slice(0, 10));
        setFiscal((current) => ({
            ...current,
            frete: pedido.frete != null ? String(pedido.frete) : current.frete,
            desconto: pedido.desconto != null ? String(pedido.desconto) : current.desconto,
        }));
        const uf = pedido.uf_entrega || pedido.cliente_uf || '';
        if (uf) {
            const cfop = cfopPadraoPorUf(uf, 'MG');
            applyNatureza(cfop, { syncLinhas: false });
        }
    }, [applyNatureza, config?.ambiente, config?.observacoes_texto, fiscal.mod_frete]);

    const loadPedidoDetalhe = useCallback(async (id, clienteRef = null) => {
        if (!id) {
            setPedidoFull(null);
            setItens([emptyLine()]);
            return;
        }
        try {
            const data = await fetchPedido(id);
            setPedidoFull(data);
            const cfopAtual = cfopPadraoPorUf(
                data.uf_entrega || clienteRef?.estado || '',
                'MG'
            );
            const linhas = Array.isArray(data?.itens) && data.itens.length
                ? data.itens.map((item) => {
                    const produto = produtoMap.get(String(item.produto_id)) || {};
                    const cfopLinha = item.cfop || produto.cfop_padrao || cfopAtual;
                    return {
                        ...emptyLine(),
                        produto_id: item.produto_id ? String(item.produto_id) : '',
                        quantidade: item.quantidade ?? '',
                        preco_unitario: item.preco_unitario ?? '',
                        unidade: item.unidade || produto.unidade || 'un',
                        ncm: item.ncm || produto.ncm || '',
                        cfop: item.produto_id ? (item.cfop || produto.cfop_padrao || cfopLinha) : '',
                        aliq_icms: item.produto_id
                            ? formatAliqField(item.aliq_icms ?? produto.aliq_icms ?? 0)
                            : '',
                        aliq_ipi: item.produto_id
                            ? formatAliqField(item.aliq_ipi ?? produto.aliq_ipi ?? 0)
                            : '',
                        aliq_pis: item.produto_id
                            ? formatAliqField(item.aliq_pis ?? produto.aliq_pis ?? 0)
                            : '',
                        aliq_cofins: item.produto_id
                            ? formatAliqField(item.aliq_cofins ?? produto.aliq_cofins ?? 0)
                            : '',
                        cst_csosn: item.produto_id ? (item.cst_csosn || produto.cst_csosn || '102') : '',
                    };
                })
                : [emptyLine()];
            setItens(linhas);

            const cliente = clienteRef
                || clientes.find((item) => String(item.id) === String(data.cliente_id || clienteId));

            fillFromPedido({
                ...data,
                cliente_nome: data.cliente_nome || cliente?.nome_razao_social,
                cliente_documento: data.cliente_documento || cliente?.cpf_cnpj,
                cliente_telefone: data.cliente_telefone || cliente?.telefone_principal,
                cliente_email: cliente?.email_contato || cliente?.email || '',
                cliente_endereco: cliente?.endereco || '',
                cliente_numero: cliente?.numero || '',
                cliente_bairro: cliente?.bairro || '',
                cliente_cidade: cliente?.cidade || '',
                cliente_uf: cliente?.estado || '',
                cliente_cep: cliente?.cep || '',
            });
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar itens do pedido.');
            setItens([emptyLine()]);
        }
    }, [clientes, clienteId, fillFromPedido, produtoMap]);

    const loadPedidosCliente = useCallback(async (id) => {
        if (!id) {
            setPedidosCliente([]);
            setPedidoId('');
            setPedidoFull(null);
            setItens([emptyLine()]);
            setDestinatario(emptyDestinatario());
            return;
        }

        setLoadingPedidos(true);
        try {
            const lista = await fetchNfePedidos({ cliente_id: id, pendentes: true });
            const rows = Array.isArray(lista) ? lista : [];
            setPedidosCliente(rows);
            const cliente = clientes.find((item) => String(item.id) === String(id));
            fillFromCliente(cliente);

            if (rows.length === 1) {
                setPedidoId(String(rows[0].id));
                await loadPedidoDetalhe(rows[0].id, cliente);
            } else {
                setPedidoId('');
                setPedidoFull(null);
                setItens([emptyLine()]);
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar pedidos do cliente.');
            setPedidosCliente([]);
        } finally {
            setLoadingPedidos(false);
        }
    }, [clientes, fillFromCliente, loadPedidoDetalhe]);

    const handleClienteChange = (event) => {
        const nextId = event.target.value;
        setClienteId(nextId);
        loadPedidosCliente(nextId);
    };

    const handlePedidoChange = (event) => {
        const nextId = event.target.value;
        setPedidoId(nextId);
        const pedido = pedidosCliente.find((item) => String(item.id) === String(nextId));
        if (pedido) fillFromPedido(pedido);
        loadPedidoDetalhe(nextId);
    };

    const updateLinha = (index, field, value) => {
        setItens((current) => current.map((linha, i) => {
            if (i !== index) return linha;
            const next = { ...linha, [field]: value };
            if (field === 'produto_id') {
                const produto = produtoMap.get(String(value));
                if (produto) {
                    next.unidade = produto.unidade || next.unidade || 'un';
                    next.preco_unitario = priceForUnidade(produto, next.unidade);
                    next.ncm = produto.ncm || '69041000';
                    next.cfop = produto.cfop_padrao || fiscal.cfop || next.cfop || '5102';
                    next.cst_csosn = produto.cst_csosn || '102';
                    next.aliq_icms = formatAliqField(produto.aliq_icms ?? 0);
                    next.aliq_ipi = formatAliqField(produto.aliq_ipi ?? 0);
                    next.aliq_pis = formatAliqField(produto.aliq_pis ?? 0);
                    next.aliq_cofins = formatAliqField(produto.aliq_cofins ?? 0);
                } else {
                    next.ncm = '';
                    next.cfop = '';
                    next.cst_csosn = '';
                    next.aliq_icms = '';
                    next.aliq_ipi = '';
                    next.aliq_pis = '';
                    next.aliq_cofins = '';
                }
            }
            if (field === 'unidade') {
                const produto = produtoMap.get(String(next.produto_id));
                if (produto) {
                    next.preco_unitario = priceForUnidade(produto, value);
                }
            }
            return next;
        }));
    };

    const addLinha = () => setItens((current) => [...current, emptyLine()]);
    const removeLinha = (index) => {
        setItens((current) => (current.length <= 1 ? [emptyLine()] : current.filter((_, i) => i !== index)));
    };

    const resetForm = () => {
        setClienteId('');
        setPedidoId('');
        setPedidosCliente([]);
        setPedidoFull(null);
        setFiscal(emptyFiscal());
        setItens([emptyLine()]);
        setDestinatario(emptyDestinatario());
        setObservacoes('');
        setDataEmissao(new Date().toISOString().slice(0, 10));
    };

    const handleEmitir = async (event) => {
        event.preventDefault();

        if (!config?.pronto_para_emissao) {
            showToast('error', 'Configure o certificado e a SEFAZ MG em Configurações → NF-e.');
            navigate('/configuracoes/nfe');
            return;
        }
        if (!clienteId) {
            showToast('error', 'Selecione o cliente.');
            return;
        }
        if (!pedidoId) {
            showToast('error', 'Selecione o pedido para emitir a NF-e.');
            return;
        }
        if (selectedPedido && !selectedPedido.pode_emitir) {
            showToast('error', 'Este pedido já possui NF-e emitida.');
            return;
        }

        const itensValidos = itens
            .filter((linha) => linha.produto_id && toNumber(linha.quantidade) > 0)
            .map((linha) => ({
                produto_id: Number(linha.produto_id),
                quantidade: toNumber(linha.quantidade),
                preco_unitario: toNumber(linha.preco_unitario),
                unidade: linha.unidade || 'un',
            }));

        const itensFiscais = itens
            .filter((linha) => linha.produto_id && toNumber(linha.quantidade) > 0)
            .map((linha) => {
                const produto = produtoMap.get(String(linha.produto_id)) || {};
                return {
                    produto_id: Number(linha.produto_id),
                    produto_codigo: produto.codigo || '',
                    produto_nome: produto.nome || '',
                    quantidade: toNumber(linha.quantidade),
                    preco_unitario: toNumber(linha.preco_unitario),
                    unidade: linha.unidade || 'un',
                    ncm: linha.ncm || produto.ncm || '',
                    cfop: linha.cfop || fiscal.cfop || produto.cfop_padrao || '5102',
                    cst_csosn: linha.cst_csosn || produto.cst_csosn || '102',
                    aliq_icms: toNumber(linha.aliq_icms),
                    aliq_ipi: toNumber(linha.aliq_ipi),
                    aliq_pis: toNumber(linha.aliq_pis),
                    aliq_cofins: toNumber(linha.aliq_cofins),
                };
            });

        if (!itensValidos.length) {
            showToast('error', 'Adicione ao menos um produto na nota.');
            return;
        }

        setEmitting(true);
        try {
            const base = pedidoFull || await fetchPedido(pedidoId);
            await updatePedido(pedidoId, {
                cliente_id: Number(clienteId),
                data_pedido: dataEmissao || base.data_pedido,
                data_entrega: base.data_entrega || null,
                status: base.status || 'Confirmado',
                desconto: totais.desconto || base.desconto || 0,
                frete: totais.frete || base.frete || 0,
                observacoes: observacoes || null,
                tipo_entrega: base.tipo_entrega || 'a_definir',
                veiculo_id: base.veiculo_id || null,
                endereco_entrega: destinatario.endereco || base.endereco_entrega || null,
                cidade_entrega: destinatario.cidade || base.cidade_entrega || null,
                uf_entrega: destinatario.uf || base.uf_entrega || null,
                cep_entrega: String(destinatario.cep || '').replace(/\D/g, '') || null,
                contato_entrega: destinatario.nome || base.contato_entrega || null,
                telefone_entrega: destinatario.telefone || base.telefone_entrega || null,
                nfe_numero: base.nfe_numero || null,
                nfe_chave: base.nfe_chave || null,
                nfe_status: base.nfe_status || 'Sem NF',
                nfe_data: base.nfe_data || null,
                itens: itensValidos,
                pagamentos: Array.isArray(base.pagamentos) && base.pagamentos.length
                    ? base.pagamentos.map((item) => ({
                        forma: item.forma,
                        forma_id: item.forma_id || null,
                        valor: item.valor,
                        status: item.status || 'Pendente',
                        observacao: item.observacao || null,
                        prazo_dias: item.prazo_dias || null,
                        juros_percent: item.juros_percent || 0,
                    }))
                    : [{
                        forma: base.forma_pagamento || 'PIX',
                        valor: totais.total,
                        status: 'Pendente',
                    }],
            });

            const result = await emitirNfePedido(pedidoId, {
                fiscal,
                itens: itensFiscais,
                totais,
                destinatario,
                observacoes,
            });
            showToast('success', result.mensagem || 'NF-e emitida.');
            resetForm();
            await loadBase();
            setActiveTab('notas');
        } catch (error) {
            showToast('error', error.message || 'Erro ao emitir NF-e.');
        } finally {
            setEmitting(false);
        }
    };

    const handleCopyChave = async (chave) => {
        const digits = String(chave || '').replace(/\D/g, '');
        if (!digits) {
            showToast('error', 'Chave indisponível para copiar.');
            return;
        }
        try {
            await navigator.clipboard.writeText(digits);
            showToast('success', 'Chave de acesso copiada.');
        } catch (_error) {
            showToast('error', 'Não foi possível copiar a chave.');
        }
    };

    const handleDownloadXml = async (emissaoId) => {
        try {
            await downloadNfeXml(emissaoId);
            showToast('success', 'Download do XML iniciado.');
        } catch (error) {
            showToast('error', error.message || 'Erro ao baixar XML.');
        }
    };

    const openCancelModal = (item) => {
        setCancelTarget(item);
        setCancelMotivo('');
    };

    const closeCancelModal = () => {
        if (cancelling) return;
        setCancelTarget(null);
        setCancelMotivo('');
    };

    const handleConfirmCancel = async () => {
        if (!cancelTarget?.id) return;
        const motivo = String(cancelMotivo || '').trim().replace(/\s+/g, ' ');
        if (motivo.length < 15) {
            showToast('error', 'Informe o motivo com no mínimo 15 caracteres (SEFAZ).');
            return;
        }
        setCancelling(true);
        try {
            await cancelarNfeEmissao(cancelTarget.id, motivo);
            showToast('success', 'NF-e cancelada com sucesso.');
            setCancelTarget(null);
            setCancelMotivo('');
            await loadBase();
        } catch (error) {
            showToast('error', error.message || 'Erro ao cancelar NF-e.');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-nfe-fill">
                <section className="admin-panel-card admin-page-card admin-nfe-page">
                    <div className="admin-nfe-top">
                        <AdminPageHeader
                            title="Emitir NFe"
                            icon="fa-file-invoice-dollar"
                        />
                    <div className="admin-nfe-tabs-row">
                        <Nav
                            variant="tabs"
                            activeKey={activeTab}
                            onSelect={(key) => setActiveTab(key || 'emitir')}
                            className="admin-funcionario-tabs admin-modal-tabs mb-0"
                        >
                            <Nav.Item>
                                <Nav.Link eventKey="emitir">
                                    <i className="fas fa-file-invoice me-2" aria-hidden="true" />
                                    Emitir
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="notas">
                                    <i className="fas fa-list me-2" aria-hidden="true" />
                                    Notas emitidas
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                        <div className={`admin-nfe-search-expand${buscaNotas ? ' is-open' : ''}`}>
                            <i className="fas fa-search" aria-hidden="true" />
                            <input
                                type="search"
                                className="admin-nfe-search-input"
                                value={buscaNotas}
                                onChange={(event) => {
                                    setBuscaNotas(event.target.value);
                                    if (activeTab !== 'notas') setActiveTab('notas');
                                }}
                                onFocus={() => {
                                    if (activeTab !== 'notas') setActiveTab('notas');
                                }}
                                placeholder="Pedido, cliente, número, chave..."
                                aria-label="Buscar notas emitidas"
                            />
                        </div>
                    </div>
                    </div>

                    <div className="admin-nfe-scroll">
                        {loading ? <p className="text-muted mb-0">Carregando...</p> : null}

                        {!loading && activeTab === 'emitir' ? (
                            <Form className="admin-funcionario-form admin-nfe-emit-form is-borderless" onSubmit={handleEmitir}>
                                <div className="admin-nfe-block">
                                    <div className="admin-nfe-block-head">
                                        <h3 className="admin-nfe-block-title">Emitente</h3>
                                        {emitente.id ? (
                                            <button
                                                type="button"
                                                className="admin-config-btn is-soft"
                                                onClick={() => navigate(`/empresa/${emitente.id}/editar`)}
                                            >
                                                <i className="fas fa-pen" aria-hidden="true" />
                                                Editar empresa
                                            </button>
                                        ) : null}
                                    </div>
                                    {!emitente.razao_social ? (
                                        <p className="text-muted mb-0">
                                            Cadastre a empresa em Empresa para preencher o emitente automaticamente.
                                        </p>
                                    ) : (
                                        <div className="admin-nfe-field-stack">
                                            <div className="admin-nfe-row-4">
                                                <AdminFloatField
                                                    label="Razão social"
                                                    name="emit_razao"
                                                    value={emitente.razao_social}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="Nome fantasia"
                                                    name="emit_fantasia"
                                                    value={emitente.nome_fantasia || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="CNPJ"
                                                    name="emit_cnpj"
                                                    value={emitente.cnpj}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="IE"
                                                    name="emit_ie"
                                                    value={emitente.inscricao_estadual || '—'}
                                                    disabled
                                                />
                                            </div>
                                            <div className="admin-nfe-row-6">
                                                <AdminFloatField
                                                    label="Regime tributário"
                                                    name="emit_regime"
                                                    value={emitente.regime_tributario || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="Telefone"
                                                    name="emit_tel"
                                                    value={emitente.telefone || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="Endereço"
                                                    name="emit_end"
                                                    value={emitente.endereco || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="Cidade"
                                                    name="emit_cidade"
                                                    value={emitente.cidade || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="UF"
                                                    name="emit_uf"
                                                    value={emitente.uf || '—'}
                                                    disabled
                                                />
                                                <AdminFloatField
                                                    label="CEP"
                                                    name="emit_cep"
                                                    value={emitente.cep || '—'}
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="admin-nfe-block">
                                    <h3 className="admin-nfe-block-title">Cliente e pedido</h3>
                                    <div className="admin-nfe-row-2">
                                        <AdminSearchSelect
                                            label="Buscar cliente"
                                            name="cliente_id"
                                            value={clienteId}
                                            options={clienteOptions}
                                            onChange={handleClienteChange}
                                            disabled={emitting}
                                            placeholder="Nome, CPF ou CNPJ..."
                                            emptyLabel="Nenhum cliente encontrado"
                                            required
                                        />
                                        <AdminSearchSelect
                                            label="Pedido"
                                            name="pedido_id"
                                            value={pedidoId}
                                            options={pedidoOptions}
                                            onChange={handlePedidoChange}
                                            disabled={emitting || !clienteId || loadingPedidos}
                                            placeholder={loadingPedidos ? 'Carregando...' : 'Selecione o pedido...'}
                                            emptyLabel={clienteId ? 'Nenhum pedido pendente de NF-e' : 'Selecione um cliente'}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="admin-nfe-block">
                                    <h3 className="admin-nfe-block-title">Destinatário</h3>
                                    <div className="admin-nfe-field-stack">
                                        <div className="admin-nfe-row-4">
                                            <AdminFloatField
                                                label="Nome / Razão social"
                                                name="dest_nome"
                                                value={destinatario.nome}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    nome: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                            <AdminFloatField
                                                label="CPF / CNPJ"
                                                name="dest_documento"
                                                value={destinatario.documento}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    documento: formatDoc(event.target.value),
                                                }))}
                                                disabled={emitting}
                                            />
                                            <AdminFloatField
                                                label="Telefone"
                                                name="dest_telefone"
                                                value={destinatario.telefone}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    telefone: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                            <AdminFloatField
                                                label="E-mail"
                                                name="dest_email"
                                                value={destinatario.email}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    email: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                        </div>
                                        <div className="admin-nfe-row-4">
                                            <AdminFloatField
                                                label="Endereço"
                                                name="dest_endereco"
                                                value={destinatario.endereco}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    endereco: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                            <AdminFloatField
                                                label="Cidade"
                                                name="dest_cidade"
                                                value={destinatario.cidade}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    cidade: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                            <AdminFloatField
                                                label="UF"
                                                name="dest_uf"
                                                value={destinatario.uf}
                                                onChange={(event) => {
                                                    const uf = event.target.value.toUpperCase().slice(0, 2);
                                                    setDestinatario((current) => ({ ...current, uf }));
                                                    if (uf.length === 2) syncCfopPorUf(uf);
                                                }}
                                                disabled={emitting}
                                                maxLength={2}
                                            />
                                            <AdminFloatField
                                                label="CEP"
                                                name="dest_cep"
                                                value={destinatario.cep}
                                                onChange={(event) => setDestinatario((current) => ({
                                                    ...current,
                                                    cep: formatCep(event.target.value),
                                                }))}
                                                disabled={emitting}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-nfe-block">
                                    <div className="admin-nfe-block-head">
                                        <h3 className="admin-nfe-block-title">Produtos</h3>
                                        <button
                                            type="button"
                                            className="admin-config-btn is-soft"
                                            onClick={addLinha}
                                            disabled={emitting}
                                        >
                                            <i className="fas fa-plus" aria-hidden="true" />
                                            Adicionar produto
                                        </button>
                                    </div>

                                    <div className="admin-estoque-prod-lines">
                                        {itens.map((linha, index) => {
                                            const lineTotal = toNumber(linha.quantidade) * toNumber(linha.preco_unitario);
                                            const lineIcms = (lineTotal * toNumber(linha.aliq_icms)) / 100;
                                            return (
                                                <div className="admin-estoque-prod-line admin-pedido-line admin-nfe-item-line" key={`nfe-line-${index}`}>
                                                    <span className="admin-estoque-prod-line-index">{index + 1}</span>
                                                    <div className="admin-nfe-item-body">
                                                        <div className="admin-pedido-line-fields">
                                                            <AdminSearchSelect
                                                                label="Produto"
                                                                name={`produto_${index}`}
                                                                value={linha.produto_id}
                                                                options={produtoOptions}
                                                                onChange={(event) => updateLinha(index, 'produto_id', event.target.value)}
                                                                disabled={emitting}
                                                                placeholder="Buscar produto..."
                                                                emptyLabel="Nenhum produto"
                                                            />
                                                            <AdminFloatField
                                                                as="select"
                                                                label="Unidade"
                                                                name={`unidade_${index}`}
                                                                value={linha.unidade || 'un'}
                                                                onChange={(event) => updateLinha(index, 'unidade', event.target.value)}
                                                                disabled={emitting}
                                                            >
                                                                {UNIDADE_OPTIONS.map((item) => (
                                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                                ))}
                                                            </AdminFloatField>
                                                            <AdminFloatField
                                                                label="Qtd"
                                                                name={`quantidade_${index}`}
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={linha.quantidade}
                                                                onChange={(event) => updateLinha(index, 'quantidade', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                label="Preço"
                                                                name={`preco_${index}`}
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={linha.preco_unitario}
                                                                onChange={(event) => updateLinha(index, 'preco_unitario', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <div className="admin-pedido-line-total">
                                                                <small>{linha.unidade || 'un'}</small>
                                                                <strong>{formatCurrency(lineTotal)}</strong>
                                                            </div>
                                                        </div>
                                                        <div className="admin-nfe-item-tax-fields">
                                                            <AdminFloatField
                                                                label="NCM"
                                                                name={`ncm_${index}`}
                                                                value={linha.ncm}
                                                                onChange={(event) => updateLinha(index, 'ncm', event.target.value.replace(/\D/g, '').slice(0, 8))}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                label="CFOP"
                                                                name={`cfop_item_${index}`}
                                                                value={linha.cfop}
                                                                onChange={(event) => updateLinha(index, 'cfop', event.target.value.replace(/\D/g, '').slice(0, 4))}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                as="select"
                                                                label="CST / CSOSN"
                                                                name={`cst_${index}`}
                                                                value={linha.cst_csosn}
                                                                onChange={(event) => updateLinha(index, 'cst_csosn', event.target.value)}
                                                                disabled={emitting}
                                                            >
                                                                {NFE_CST_CSOSN.map((item) => (
                                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                                ))}
                                                            </AdminFloatField>
                                                            <AdminFloatField
                                                                label="Alíq. ICMS %"
                                                                name={`aliq_icms_${index}`}
                                                                inputMode="decimal"
                                                                value={linha.aliq_icms}
                                                                onChange={(event) => updateLinha(index, 'aliq_icms', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                label="Alíq. IPI %"
                                                                name={`aliq_ipi_${index}`}
                                                                inputMode="decimal"
                                                                value={linha.aliq_ipi}
                                                                onChange={(event) => updateLinha(index, 'aliq_ipi', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                label="Alíq. PIS %"
                                                                name={`aliq_pis_${index}`}
                                                                inputMode="decimal"
                                                                value={linha.aliq_pis}
                                                                onChange={(event) => updateLinha(index, 'aliq_pis', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <AdminFloatField
                                                                label="Alíq. COFINS %"
                                                                name={`aliq_cofins_${index}`}
                                                                inputMode="decimal"
                                                                value={linha.aliq_cofins}
                                                                onChange={(event) => updateLinha(index, 'aliq_cofins', event.target.value)}
                                                                disabled={emitting}
                                                            />
                                                            <div className="admin-pedido-line-total">
                                                                <small>ICMS</small>
                                                                <strong>{formatCurrency(lineIcms)}</strong>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="admin-estoque-prod-line-remove"
                                                        onClick={() => removeLinha(index)}
                                                        disabled={emitting || itens.length <= 1}
                                                        aria-label="Remover produto"
                                                        title="Remover"
                                                    >
                                                        <i className="fas fa-trash-alt" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="admin-nfe-block">
                                    <h3 className="admin-nfe-block-title">Dados da nota</h3>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <AdminFloatField
                                                as="select"
                                                label="Natureza da operação"
                                                name="natureza_id"
                                                value={fiscal.natureza_id}
                                                onChange={(event) => applyNatureza(event.target.value)}
                                                disabled={emitting}
                                            >
                                                {naturezasAtivas.map((item) => (
                                                    <option key={item.cfop || item.id} value={item.cfop || item.id}>
                                                        {item.label || `${item.cfop} - ${item.natureza}`}
                                                    </option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="CFOP"
                                                name="cfop"
                                                value={fiscal.cfop}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                as="select"
                                                label="Tipo"
                                                name="tipo_operacao"
                                                value={fiscal.tipo_operacao}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    tipo_operacao: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            >
                                                {NFE_TIPOS_OPERACAO.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                as="select"
                                                label="Finalidade"
                                                name="finalidade"
                                                value={fiscal.finalidade}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    finalidade: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            >
                                                {NFE_FINALIDADES.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={3}>
                                            <AdminDateField
                                                label="Data de emissão"
                                                name="data_emissao"
                                                value={dataEmissao}
                                                onChange={(event) => setDataEmissao(event.target.value)}
                                                disabled={emitting}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Série"
                                                name="serie"
                                                value={config?.serie || 1}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Número"
                                                name="proximo_numero"
                                                value={config?.proximo_numero || 1}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                as="select"
                                                label="Consumidor final"
                                                name="consumidor_final"
                                                value={fiscal.consumidor_final}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    consumidor_final: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            >
                                                {NFE_CONSUMIDOR_FINAL.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={3}>
                                            <AdminFloatField
                                                as="select"
                                                label="Presença do comprador"
                                                name="presenca"
                                                value={fiscal.presenca}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    presenca: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            >
                                                {NFE_PRESENCA.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={4}>
                                            <AdminFloatField
                                                as="select"
                                                label="Modalidade do frete"
                                                name="mod_frete"
                                                value={fiscal.mod_frete}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    mod_frete: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            >
                                                {NFE_MOD_FRETE.map((item) => (
                                                    <option key={item.value} value={item.value}>{item.label}</option>
                                                ))}
                                            </AdminFloatField>
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Status NF-e"
                                                name="nfe_status"
                                                value={selectedPedido?.nfe_status || 'Sem NF'}
                                                disabled
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                <div className="admin-nfe-block">
                                    <h3 className="admin-nfe-block-title">Impostos e totais</h3>
                                    <Row className="g-3">
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Frete"
                                                name="frete"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={fiscal.frete}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    frete: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Seguro"
                                                name="seguro"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={fiscal.seguro}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    seguro: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Desconto"
                                                name="desconto"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={fiscal.desconto}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    desconto: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Outras despesas"
                                                name="outras_despesas"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={fiscal.outras_despesas}
                                                onChange={(event) => setFiscal((current) => ({
                                                    ...current,
                                                    outras_despesas: event.target.value,
                                                }))}
                                                disabled={emitting}
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Base ICMS"
                                                name="base_icms"
                                                value={formatCurrency(totais.base_icms)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Valor ICMS"
                                                name="valor_icms"
                                                value={formatCurrency(totais.valor_icms)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Valor IPI"
                                                name="valor_ipi"
                                                value={formatCurrency(totais.valor_ipi)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Valor PIS"
                                                name="valor_pis"
                                                value={formatCurrency(totais.valor_pis)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Valor COFINS"
                                                name="valor_cofins"
                                                value={formatCurrency(totais.valor_cofins)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Total impostos"
                                                name="total_impostos"
                                                value={formatCurrency(totais.total_impostos)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Total produtos"
                                                name="total_produtos"
                                                value={formatCurrency(totais.subtotal)}
                                                disabled
                                            />
                                        </Col>
                                        <Col md={2}>
                                            <AdminFloatField
                                                label="Total da NF-e"
                                                name="total_nfe"
                                                value={formatCurrency(totais.total)}
                                                disabled
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                <div className="admin-nfe-block">
                                    <h3 className="admin-nfe-block-title">Observações</h3>
                                    <Row className="g-3">
                                        <Col xs={12}>
                                            <AdminFloatField
                                                as="textarea"
                                                label="Informações complementares (infCpl)"
                                                name="observacoes"
                                                value={observacoes}
                                                onChange={(event) => setObservacoes(event.target.value)}
                                                disabled={emitting}
                                                rows={5}
                                            />
                                        </Col>
                                    </Row>
                                </div>

                                <div className="admin-nfe-emit-actions">
                                    <Button
                                        type="button"
                                        className="admin-config-btn is-muted"
                                        disabled={emitting}
                                        onClick={resetForm}
                                    >
                                        Limpar
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="admin-config-btn is-primary"
                                        disabled={emitting || !pedidoId}
                                    >
                                        {emitting ? 'Emitindo...' : 'Emitir NFe'}
                                    </Button>
                                </div>
                            </Form>
                        ) : null}

                        {!loading && activeTab === 'notas' ? (
                            <div className="admin-nfe-history-table">
                                <div className="admin-table-scroll">
                                    <Table responsive hover className="mb-0 align-middle">
                                        <thead>
                                            <tr>
                                                <th>Pedido</th>
                                                <th>Cliente</th>
                                                <th>Número</th>
                                                <th>Status</th>
                                                <th>Chave</th>
                                                <th>Data / hora</th>
                                                <th className="text-center">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {emissoesFiltradas.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-muted">
                                                        {emissoes.length === 0
                                                            ? 'Nenhuma NF-e emitida ainda.'
                                                            : 'Nenhuma nota encontrada para a busca.'}
                                                    </td>
                                                </tr>
                                            ) : null}
                                            {emissoesFiltradas.map((item) => {
                                                const podeCancelar = item.pode_cancelar !== false
                                                    && !String(item.status || '').toLowerCase().includes('cancel');
                                                return (
                                                    <tr key={item.id}>
                                                        <td>{item.pedido_numero || item.pedido_id}</td>
                                                        <td>{item.cliente_nome}</td>
                                                        <td>
                                                            {item.numero}
                                                            /
                                                            {item.serie}
                                                        </td>
                                                        <td>
                                                            <StatusBadge status={item.status} />
                                                        </td>
                                                        <td className="admin-nfe-chave-cell">
                                                            {item.chave ? (
                                                                <div className="admin-nfe-chave-row">
                                                                    <span>{item.chave}</span>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-nfe-copy-btn"
                                                                        title="Copiar chave de acesso"
                                                                        aria-label={`Copiar chave da NF-e ${item.numero}`}
                                                                        onClick={() => handleCopyChave(item.chave)}
                                                                    >
                                                                        <i className="fas fa-clone" aria-hidden="true" />
                                                                    </button>
                                                                </div>
                                                            ) : '—'}
                                                        </td>
                                                        <td>{formatDateTimeBr(item.criado_em)}</td>
                                                        <td className="text-center">
                                                            <div className="admin-nfe-file-actions">
                                                                <button
                                                                    type="button"
                                                                    className="admin-nfe-pdf-btn"
                                                                    title="Visualizar DANFE / PDF"
                                                                    aria-label={`Visualizar NF-e ${item.numero}`}
                                                                    onClick={() => setPreviewEmissaoId(item.id)}
                                                                >
                                                                    <i className="fas fa-file-pdf" aria-hidden="true" />
                                                                    <span>PDF</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-nfe-xml-btn"
                                                                    title="Baixar XML"
                                                                    aria-label={`Baixar XML da NF-e ${item.numero}`}
                                                                    onClick={() => handleDownloadXml(item.id)}
                                                                >
                                                                    <i className="fas fa-file-alt" aria-hidden="true" />
                                                                    <span>XML</span>
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="admin-nfe-cancel-btn"
                                                                    title={podeCancelar ? 'Cancelar NF-e' : 'NF-e já cancelada'}
                                                                    aria-label={`Cancelar NF-e ${item.numero}`}
                                                                    disabled={!podeCancelar}
                                                                    onClick={() => openCancelModal(item)}
                                                                >
                                                                    <i className="fas fa-ban" aria-hidden="true" />
                                                                    <span>Anular</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </section>

                {previewEmissaoId ? (
                    <NfeDanfeModal
                        emissaoId={previewEmissaoId}
                        onClose={() => setPreviewEmissaoId(null)}
                    />
                ) : null}

                <Modal
                    show={Boolean(cancelTarget)}
                    onHide={closeCancelModal}
                    centered
                    backdrop="static"
                    className="admin-delete-confirm-modal"
                >
                    <Modal.Header className="admin-delete-confirm-header">
                        <Modal.Title>
                            <i className="fas fa-ban me-2" aria-hidden="true" />
                            Cancelar NF-e
                        </Modal.Title>
                        <AdminModalClose onClick={closeCancelModal} disabled={cancelling} />
                    </Modal.Header>
                    <Modal.Body className="admin-delete-confirm-body">
                        <p>
                            Informe o motivo do cancelamento da NF-e{' '}
                            <strong>
                                {cancelTarget?.numero}
                                /
                                {cancelTarget?.serie}
                            </strong>
                            {' '}conforme exigência da SEFAZ (mínimo 15 caracteres).
                        </p>
                        <AdminFloatField
                            as="textarea"
                            label="Motivo do cancelamento"
                            name="cancelamento_motivo"
                            value={cancelMotivo}
                            onChange={(event) => setCancelMotivo(event.target.value)}
                            rows={4}
                            maxLength={255}
                            disabled={cancelling}
                            placeholder="Descreva o motivo do cancelamento..."
                        />
                        <p className="admin-ferias-form-hint mb-0 mt-2">
                            {String(cancelMotivo || '').trim().length}
                            /255 caracteres
                            {String(cancelMotivo || '').trim().length < 15
                                ? ' · faltam caracteres para o mínimo SEFAZ'
                                : ''}
                        </p>
                    </Modal.Body>
                    <Modal.Footer className="admin-delete-confirm-footer">
                        <Button type="button" variant="secondary" onClick={closeCancelModal} disabled={cancelling}>
                            Voltar
                        </Button>
                        <Button type="button" variant="danger" onClick={handleConfirmCancel} disabled={cancelling}>
                            {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        </AdminDateFieldProvider>
    );
}
