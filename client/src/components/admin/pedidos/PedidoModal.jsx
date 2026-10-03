import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Form, Modal, Row, Tab, Tabs } from 'react-bootstrap';
import { fetchCliente, fetchClientes } from '../../../api/clientes';
import { fetchFrota } from '../../../api/frota';
import {
    createPedido,
    deletePedido,
    fetchPedido,
    patchPedidoStatus,
    updatePedido,
} from '../../../api/pedidos';
import { fetchProdutos } from '../../../api/produtos';
import { fetchFormasPagamento, fetchFreteCidades, fetchRotaCidade } from '../../../api/config';
import { emitPedidoUpdated } from '../../../utils/syncChannel';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import { formatCep, formatMoneyBr, formatMoneyBrFromNumber, onlyDigits, parseMoneyBr } from '../../../utils/inputMasks';
import { useViaCep } from '../../../hooks/useViaCep';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminSearchSelect from '../AdminSearchSelect';
import FormSection from '../FormSection';

function normalizeCity(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function lookupFreteValor(tabela, cidade, uf) {
    const city = normalizeCity(cidade);
    const state = String(uf || '').trim().toUpperCase();
    if (!city || !state || !Array.isArray(tabela)) return null;
    const match = tabela.find((item) => (
        item.ativo !== false
        && normalizeCity(item.cidade) === city
        && String(item.uf || '').trim().toUpperCase() === state
    ));
    if (!match) return null;
    const value = Number(match.valor_frete);
    return Number.isFinite(value) ? value : null;
}

function lookupFreteDestino(tabela, cidade, uf) {
    const city = normalizeCity(cidade);
    const state = String(uf || '').trim().toUpperCase();
    if (!city || !state || !Array.isArray(tabela)) return null;
    return tabela.find((item) => (
        item.ativo !== false
        && normalizeCity(item.cidade) === city
        && String(item.uf || '').trim().toUpperCase() === state
    )) || null;
}

function formatDuracaoMinutos(minutos) {
    const total = Math.max(0, Math.round(Number(minutos) || 0));
    if (!total) return '';
    const horas = Math.floor(total / 60);
    const mins = total % 60;
    if (horas <= 0) return `${mins} min`;
    return `${horas}h ${String(mins).padStart(2, '0')}min`;
}

function estimativaDuracaoPorKm(distanciaKm) {
    const km = Number(distanciaKm);
    if (!Number.isFinite(km) || km <= 0) return null;
    // ~50 km/h médio de caminhão + margem 25%
    return Math.round((km / 50) * 60 * 1.25);
}
const STATUS_OPTIONS = [
    'Pendente',
    'Aguardando pagamento',
    'Aguardando carregamento',
    'Aguardando entrega',
    'Entregue',
    'Cancelado',
    'Rascunho',
    'Confirmado',
];
const FALLBACK_FORMAS = [
    'Dinheiro',
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Boleto',
    'Transferência',
    'A prazo',
    'Outro',
];
const UNIDADE_OPTIONS = [
    { value: 'un', label: 'Unidade (un)' },
    { value: 'milheiro', label: 'Milheiro' },
    { value: 'm²', label: 'Metro quadrado (m²)' },
    { value: 'cx', label: 'Caixa (cx)' },
];
const NFE_STATUS = ['Sem NF', 'Emitida', 'Cancelada'];
const PAGAMENTO_STATUS = ['Pendente', 'Pago', 'Anulado'];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function emptyLine() {
    return {
        produto_id: '',
        quantidade: '',
        preco_unitario: '',
        unidade: 'un',
    };
}

function emptyPagamento() {
    return {
        forma: 'PIX',
        forma_id: '',
        valor: '',
        status: 'Pendente',
        observacao: '',
        prazo_dias: '',
        juros_percent: 0,
    };
}

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toNumber(value) {
    return parseMoneyBr(value);
}

function formatMoneyValue(value) {
    if (value === '' || value === null || value === undefined) return '';
    return formatMoneyBrFromNumber(value);
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

function defaultUnidade(produto) {
    const raw = String(produto?.unidade || 'un').trim().toLowerCase();
    if (raw === 'milheiro' || raw === 'milheiros') return 'milheiro';
    if (raw === 'm2' || raw === 'm²' || raw === 'metro' || raw === 'metro quadrado') return 'm²';
    if (raw === 'cx' || raw === 'caixa') return 'cx';
    return 'un';
}

function buildEnderecoCliente(cliente = {}) {
    const parts = [
        cliente.endereco,
        cliente.numero ? `nº ${cliente.numero}` : '',
        cliente.bairro,
        cliente.complemento,
    ].filter(Boolean);
    return parts.join(', ');
}

function normalizePedidoForm(data = {}) {
    const pagamentos = Array.isArray(data.pagamentos) && data.pagamentos.length
        ? data.pagamentos.map((item) => ({
            forma: item.forma || 'PIX',
            forma_id: item.forma_id ? String(item.forma_id) : '',
            valor: formatMoneyValue(item.valor ?? 0),
            status: item.status || 'Pendente',
            observacao: item.observacao || '',
            prazo_dias: item.prazo_dias ? String(item.prazo_dias) : '',
            juros_percent: item.juros_percent ?? 0,
        }))
        : [{
            ...emptyPagamento(),
            forma: data.forma_pagamento || 'PIX',
            valor: data.total != null ? formatMoneyValue(data.total) : '',
        }];

    return {
        cliente_id: data.cliente_id ? String(data.cliente_id) : '',
        data_pedido: String(data.data_pedido || todayIso()).slice(0, 10),
        data_entrega: data.data_entrega ? String(data.data_entrega).slice(0, 10) : '',
        data_carregamento: data.data_carregamento ? String(data.data_carregamento).slice(0, 10) : '',
        status: data.status || 'Rascunho',
        motivo_cancelamento: data.motivo_cancelamento || '',
        desconto: formatMoneyValue(data.desconto ?? 0),
        frete: formatMoneyValue(data.frete ?? 0),
        observacoes: data.observacoes || '',
        numero: data.numero || '',
        tipo_entrega: (() => {
            const raw = String(data.tipo_entrega || '').toLowerCase();
            if (['frota', 'retirada', 'externo', 'a_definir'].includes(raw)) return raw;
            if (data?.veiculo_id) return 'frota';
            return '';
        })(),
        veiculo_id: data.veiculo_id ? String(data.veiculo_id) : '',
        endereco_entrega: data.endereco_entrega || '',
        cidade_entrega: data.cidade_entrega || '',
        uf_entrega: data.uf_entrega || '',
        cep_entrega: formatCep(data.cep_entrega || ''),
        contato_entrega: data.contato_entrega || '',
        telefone_entrega: data.telefone_entrega || '',
        nfe_numero: data.nfe_numero || '',
        nfe_chave: data.nfe_chave || '',
        nfe_status: data.nfe_status || 'Sem NF',
        nfe_data: data.nfe_data ? String(data.nfe_data).slice(0, 10) : '',
        itens: Array.isArray(data.itens) && data.itens.length
            ? data.itens.map((item) => ({
                produto_id: item.produto_id ? String(item.produto_id) : '',
                quantidade: item.quantidade ?? '',
                preco_unitario: formatMoneyValue(item.preco_unitario ?? 0),
                unidade: item.unidade || 'un',
            }))
            : [emptyLine()],
        pagamentos,
    };
}

const EMPTY_FORM = normalizePedidoForm();

export default function PedidoModal({ pedidoId, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [clientes, setClientes] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [veiculos, setVeiculos] = useState([]);
    const [formasPagamento, setFormasPagamento] = useState([]);
    const [freteTabela, setFreteTabela] = useState([]);
    const freteTabelaRef = useRef([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const [nfeDoSistema, setNfeDoSistema] = useState(false);
    const [activeTab, setActiveTab] = useState('dados');
    const [rotaInfo, setRotaInfo] = useState(null);
    const [rotaLoading, setRotaLoading] = useState(false);
    const [savedStatus, setSavedStatus] = useState('');
    const [cancelModal, setCancelModal] = useState({ open: false, motivo: '', previousStatus: '' });
    const [cancelling, setCancelling] = useState(false);
    const isEdit = Boolean(pedidoId);

    useEffect(() => {
        freteTabelaRef.current = freteTabela;
    }, [freteTabela]);

    useEffect(() => {
        setForm((current) => {
            if (current.tipo_entrega !== 'frota') {
                if (String(current.frete || '0') === '0' || parseMoneyBr(current.frete) === 0) return current;
                return { ...current, frete: formatMoneyValue(0) };
            }
            if (!current.cidade_entrega || !current.uf_entrega || !freteTabela.length) return current;
            const freteValor = lookupFreteValor(freteTabela, current.cidade_entrega, current.uf_entrega);
            if (freteValor == null) return current;
            if (Math.abs(parseMoneyBr(current.frete) - freteValor) < 0.01) return current;
            const atual = parseMoneyBr(current.frete);
            const semFrete = !Number.isFinite(atual) || atual === 0;
            if (!semFrete) return current;
            return { ...current, frete: formatMoneyValue(freteValor) };
        });
    }, [form.cidade_entrega, form.uf_entrega, form.tipo_entrega, freteTabela]);

    useEffect(() => {
        const cidade = String(form.cidade_entrega || '').trim();
        const uf = String(form.uf_entrega || '').trim().toUpperCase();
        const precisaRota = form.tipo_entrega === 'frota' || form.tipo_entrega === 'externo';
        if (!precisaRota || !cidade || !uf) {
            setRotaInfo(null);
            setRotaLoading(false);
            return undefined;
        }

        const cached = lookupFreteDestino(freteTabela, cidade, uf);
        const cachedKm = cached?.distancia_km != null ? Number(cached.distancia_km) : null;
        if (cachedKm != null && Number.isFinite(cachedKm)) {
            setRotaInfo({
                distancia_km: cachedKm,
                duracao_min: estimativaDuracaoPorKm(cachedKm),
                source: 'cadastro',
            });
        }

        let active = true;
        const timer = setTimeout(() => {
            setRotaLoading(true);
            fetchRotaCidade({ cidade, uf })
                .then((payload) => {
                    if (!active) return;
                    const destino = payload?.destino || {};
                    setRotaInfo({
                        distancia_km: destino.distancia_km != null ? Number(destino.distancia_km) : cachedKm,
                        duracao_min: destino.duracao_min != null
                            ? Number(destino.duracao_min)
                            : estimativaDuracaoPorKm(destino.distancia_km ?? cachedKm),
                        source: 'rota',
                    });
                })
                .catch(() => {
                    if (!active) return;
                    if (cachedKm == null) setRotaInfo(null);
                })
                .finally(() => {
                    if (active) setRotaLoading(false);
                });
        }, 350);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [form.cidade_entrega, form.uf_entrega, form.tipo_entrega, freteTabela]);

    const { handleCepBlur, loading: cepLoading } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => {
                const freteValor = current.tipo_entrega === 'frota'
                    ? lookupFreteValor(freteTabelaRef.current, address.city, address.state)
                    : null;
                return {
                    ...current,
                    cidade_entrega: address.city,
                    uf_entrega: address.state,
                    endereco_entrega: current.endereco_entrega?.trim()
                        ? current.endereco_entrega
                        : [address.street, address.neighborhood].filter(Boolean).join(', '),
                    frete: freteValor != null
                        ? formatMoneyValue(freteValor)
                        : (current.tipo_entrega === 'frota' ? current.frete : formatMoneyValue(0)),
                };
            });
        },
        onError: (message) => showToast('warning', message),
    });
    useEffect(() => {
        let active = true;

        Promise.all([
            fetchClientes(),
            fetchProdutos(),
            fetchFrota(),
            fetchFormasPagamento({ ativo: true }),
            fetchFreteCidades().catch(() => []),
        ])
            .then(([clientesData, produtosData, frotaData, formasData, freteData]) => {
                if (!active) return;
                setClientes(Array.isArray(clientesData) ? clientesData : []);
                setProdutos(Array.isArray(produtosData)
                    ? produtosData.filter((item) => String(item.status || '').toLowerCase() === 'ativo')
                    : []);
                setVeiculos(Array.isArray(frotaData)
                    ? frotaData.filter((item) => String(item.status || '').toLowerCase() === 'ativo')
                    : []);
                setFormasPagamento(Array.isArray(formasData) ? formasData : []);
                setFreteTabela(Array.isArray(freteData) ? freteData : []);
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar dados.'));

        return () => {
            active = false;
        };
    }, []);
    useEffect(() => {
        prevTotalRef.current = null;
        if (!pedidoId) {
            setForm(EMPTY_FORM);
            setInvalidFields({});
            setNfeDoSistema(false);
            setSavedStatus('');
            setActiveTab('dados');
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);
        setActiveTab('dados');

        fetchPedido(pedidoId)
            .then((data) => {
                if (!active) return;
                setForm(normalizePedidoForm(data));
                setSavedStatus(data?.status || '');
                setNfeDoSistema(Boolean(data?.nfe_do_sistema));
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar pedido.'))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [pedidoId]);

    const clienteOptions = useMemo(
        () => clientes
            .filter((item) => String(item.status || '').toLowerCase() === 'ativo')
            .map((item) => ({
                id: String(item.id),
                label: item.nome_razao_social,
            })),
        [clientes]
    );

    const veiculoOptions = useMemo(
        () => veiculos.map((item) => ({
            id: String(item.id),
            label: `${item.placa} - ${item.modelo || 'Veículo'}${item.motorista ? ` (${item.motorista})` : ''}`,
            motorista: item.motorista || '',
            placa: item.placa || '',
        })),
        [veiculos]
    );

    const produtoMap = useMemo(() => {
        const map = new Map();
        produtos.forEach((item) => map.set(String(item.id), item));
        return map;
    }, [produtos]);

    const formaOptions = useMemo(() => {
        const base = formasPagamento.length
            ? formasPagamento
            : FALLBACK_FORMAS.map((nome, index) => ({
                id: `fallback-${index}`,
                nome,
                tipo: nome.toLowerCase() === 'a prazo' ? 'prazo' : 'avista',
                tem_juros: false,
                juros_percent: 0,
                prazos: [
                    { dias: 30, juros_percent: 0, ativo: true },
                    { dias: 60, juros_percent: 0, ativo: true },
                    { dias: 90, juros_percent: 0, ativo: true },
                ],
            }));

        const known = new Set(base.map((item) => String(item.nome || '').toLowerCase()));
        const extras = [];
        form.pagamentos.forEach((item, index) => {
            const nome = String(item.forma || '').trim();
            if (!nome || known.has(nome.toLowerCase())) return;
            known.add(nome.toLowerCase());
            extras.push({
                id: item.forma_id || `extra-${index}`,
                nome,
                tipo: 'avista',
                tem_juros: false,
                juros_percent: 0,
                prazos: [],
            });
        });

        return extras.length ? [...base, ...extras] : base;
    }, [formasPagamento, form.pagamentos]);

    const formaByNome = useMemo(() => {
        const map = new Map();
        formaOptions.forEach((item) => map.set(String(item.nome).toLowerCase(), item));
        return map;
    }, [formaOptions]);

    const totais = useMemo(() => {
        const subtotal = form.itens.reduce((acc, linha) => {
            const qty = toNumber(linha.quantidade);
            const price = toNumber(linha.preco_unitario);
            return acc + (qty * price);
        }, 0);
        const desconto = Math.max(0, Math.min(toNumber(form.desconto), subtotal));
        const frete = Math.max(0, toNumber(form.frete));
        const total = Number((subtotal - desconto + frete).toFixed(2));
        const pagamentoSoma = Number(form.pagamentos.reduce((acc, item) => acc + toNumber(item.valor), 0).toFixed(2));
        return {
            subtotal,
            desconto,
            frete,
            total,
            pagamentoSoma,
            restante: Number((total - pagamentoSoma).toFixed(2)),
        };
    }, [form.itens, form.desconto, form.frete, form.pagamentos]);

    const prevTotalRef = useRef(null);

    useEffect(() => {
        if (form.status === 'Cancelado') return;
        const total = totais.total;
        const prevTotal = prevTotalRef.current;
        prevTotalRef.current = total;

        setForm((current) => {
            if (current.pagamentos.length !== 1) return current;
            const pay = current.pagamentos[0];
            const valor = toNumber(pay.valor);
            const wasEmpty = !String(pay.valor ?? '').trim() || valor === 0;
            const wasSynced = prevTotal == null || Math.abs(valor - prevTotal) < 0.02;
            if (!wasEmpty && !wasSynced) return current;
            if (Math.abs(valor - total) < 0.01) return current;
            return {
                ...current,
                pagamentos: [{
                    ...pay,
                    valor: total > 0 ? formatMoneyValue(total) : '',
                }],
            };
        });
    }, [totais.total, form.status]);

    const clearInvalid = (keys = []) => {
        setInvalidFields((current) => {
            const next = { ...current };
            keys.forEach((key) => delete next[key]);
            return next;
        });
    };

    const applyClienteEndereco = async (clienteId) => {
        if (!clienteId) return;
        try {
            const cliente = await fetchCliente(clienteId);
            setForm((current) => {
                const cidade = current.cidade_entrega || cliente.cidade || '';
                const uf = current.uf_entrega || cliente.estado || '';
                const freteValor = current.tipo_entrega === 'frota'
                    ? lookupFreteValor(freteTabelaRef.current, cidade, uf)
                    : null;
                const nextCep = current.cep_entrega || formatCep(cliente.cep || '');
                return {
                    ...current,
                    cliente_id: String(clienteId),
                    endereco_entrega: current.endereco_entrega || buildEnderecoCliente(cliente),
                    cidade_entrega: cidade,
                    uf_entrega: uf,
                    cep_entrega: nextCep,
                    contato_entrega: current.contato_entrega || cliente.nome_razao_social || '',
                    telefone_entrega: current.telefone_entrega || cliente.telefone_principal || '',
                    frete: freteValor != null
                        ? formatMoneyValue(freteValor)
                        : (current.tipo_entrega === 'frota' ? current.frete : formatMoneyValue(0)),
                };
            });
        } catch {
            setForm((current) => ({ ...current, cliente_id: String(clienteId) }));
        }
    };

    const updateLinha = (index, field, value) => {
        setForm((current) => {
            const itens = current.itens.map((linha, i) => {
                if (i !== index) return linha;
                const next = { ...linha, [field]: value };

                if (field === 'produto_id') {
                    const produto = produtoMap.get(String(value));
                    if (produto) {
                        next.unidade = defaultUnidade(produto);
                        next.preco_unitario = formatMoneyValue(priceForUnidade(produto, next.unidade));
                    }
                }

                if (field === 'unidade') {
                    const produto = produtoMap.get(String(next.produto_id));
                    if (produto) {
                        next.preco_unitario = formatMoneyValue(priceForUnidade(produto, value));
                    }
                }

                if (field === 'preco_unitario') {
                    next.preco_unitario = formatMoneyBr(value);
                }

                return next;
            });
            return { ...current, itens };
        });
        clearInvalid([`linha_${index}_${field}`, 'itens']);
    };

    const addLinha = () => {
        setForm((current) => ({
            ...current,
            itens: [...current.itens, emptyLine()],
        }));
    };

    const removeLinha = (index) => {
        setForm((current) => ({
            ...current,
            itens: current.itens.length <= 1
                ? [emptyLine()]
                : current.itens.filter((_, i) => i !== index),
        }));
    };

    const resolveFormaConfig = (pagamento = {}) => {
        if (pagamento.forma_id) {
            const byId = formaOptions.find((item) => String(item.id) === String(pagamento.forma_id));
            if (byId) return byId;
        }
        return formaByNome.get(String(pagamento.forma || '').toLowerCase()) || null;
    };

    const applyFormaToPagamento = (pagamento, formaNome) => {
        const config = formaByNome.get(String(formaNome || '').toLowerCase()) || null;
        const next = {
            ...pagamento,
            forma: formaNome,
            forma_id: config?.id && !String(config.id).startsWith('fallback-') ? String(config.id) : '',
            juros_percent: 0,
            prazo_dias: '',
        };

        if (config?.tipo === 'prazo' || config?.tipo === 'cartao' || config?.tipo === 'boleto') {
            const primeiro = (config.prazos || []).find((item) => item.ativo) || null;
            if (primeiro) {
                next.prazo_dias = String(primeiro.dias);
                if (config.tipo === 'boleto') {
                    next.juros_percent = config.tem_juros ? Number(config.juros_percent) || 0 : 0;
                } else {
                    next.juros_percent = config.tem_juros ? Number(primeiro.juros_percent) || 0 : 0;
                }
            }
        } else if (config?.tem_juros) {
            next.juros_percent = Number(config.juros_percent) || 0;
        }

        return next;
    };

    const updatePagamento = (index, field, value) => {
        setForm((current) => {
            const pagamentos = current.pagamentos.map((item, i) => {
                if (i !== index) return item;

                if (field === 'forma') {
                    return applyFormaToPagamento(item, value);
                }

                if (field === 'prazo_dias') {
                    const config = resolveFormaConfig(item);
                    const prazo = (config?.prazos || []).find((p) => String(p.dias) === String(value));
                    const juros = config?.tipo === 'boleto'
                        ? (config?.tem_juros ? Number(config.juros_percent) || 0 : 0)
                        : (config?.tem_juros ? Number(prazo?.juros_percent) || 0 : 0);
                    return {
                        ...item,
                        prazo_dias: value,
                        juros_percent: juros,
                    };
                }

                if (field === 'valor') {
                    return { ...item, valor: formatMoneyBr(value) };
                }

                return { ...item, [field]: value };
            });
            return { ...current, pagamentos };
        });
        clearInvalid([`pagamento_${index}_${field}`, `pagamento_${index}_prazo_dias`, 'pagamentos']);
    };

    const addPagamento = () => {
        setForm((current) => {
            const restante = Math.max(0, Number((
                totais.total - current.pagamentos.reduce((acc, item) => acc + toNumber(item.valor), 0)
            ).toFixed(2)));
            return {
                ...current,
                pagamentos: [
                    ...current.pagamentos,
                    {
                        ...emptyPagamento(),
                        valor: restante > 0 ? formatMoneyValue(restante) : '',
                    },
                ],
            };
        });
    };

    const removePagamento = (index) => {
        setForm((current) => {
            if (current.pagamentos.length <= 1) {
                return {
                    ...current,
                    pagamentos: [{
                        ...emptyPagamento(),
                        valor: totais.total > 0 ? formatMoneyValue(totais.total) : '',
                    }],
                };
            }
            return {
                ...current,
                pagamentos: current.pagamentos.filter((_, i) => i !== index),
            };
        });
        clearInvalid(['pagamentos']);
    };

    const ajustarPagamentosAoTotal = () => {
        setForm((current) => {
            if (!current.pagamentos.length) {
                return {
                    ...current,
                    pagamentos: [{
                        ...emptyPagamento(),
                        valor: totais.total > 0 ? formatMoneyValue(totais.total) : '',
                    }],
                };
            }

            if (current.pagamentos.length === 1) {
                return {
                    ...current,
                    pagamentos: [{
                        ...current.pagamentos[0],
                        valor: formatMoneyValue(totais.total),
                    }],
                };
            }

            const others = current.pagamentos.slice(0, -1);
            const somaOutros = others.reduce((acc, item) => acc + toNumber(item.valor), 0);
            const last = current.pagamentos[current.pagamentos.length - 1];
            return {
                ...current,
                pagamentos: [
                    ...others,
                    {
                        ...last,
                        valor: formatMoneyValue(Math.max(0, totais.total - somaOutros)),
                    },
                ],
            };
        });
        clearInvalid(['pagamentos']);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!form.cliente_id) nextInvalid.cliente_id = true;
        if (!form.data_pedido) nextInvalid.data_pedido = true;
        if (!form.status) nextInvalid.status = true;

        const itens = [];
        form.itens.forEach((linha, index) => {
            if (!linha.produto_id) nextInvalid[`linha_${index}_produto_id`] = true;
            if (!linha.quantidade || toNumber(linha.quantidade) <= 0) {
                nextInvalid[`linha_${index}_quantidade`] = true;
            }
            if (linha.preco_unitario === '' || toNumber(linha.preco_unitario) < 0) {
                nextInvalid[`linha_${index}_preco_unitario`] = true;
            }
            if (linha.produto_id && toNumber(linha.quantidade) > 0) {
                itens.push({
                    produto_id: Number(linha.produto_id),
                    quantidade: toNumber(linha.quantidade),
                    preco_unitario: toNumber(linha.preco_unitario),
                    unidade: linha.unidade || 'un',
                });
            }
        });

        if (!itens.length) nextInvalid.itens = true;

        const pagamentos = [];
        form.pagamentos.forEach((item, index) => {
            const config = resolveFormaConfig(item);
            if (!item.forma) nextInvalid[`pagamento_${index}_forma`] = true;
            if (!item.valor || toNumber(item.valor) <= 0) nextInvalid[`pagamento_${index}_valor`] = true;
            if ((config?.tipo === 'prazo' || config?.tipo === 'cartao' || config?.tipo === 'boleto') && !item.prazo_dias) {
                nextInvalid[`pagamento_${index}_prazo_dias`] = true;
            }
            if (item.forma && toNumber(item.valor) > 0) {
                pagamentos.push({
                    forma: item.forma,
                    forma_id: item.forma_id ? Number(item.forma_id) : null,
                    valor: toNumber(item.valor),
                    status: form.status === 'Cancelado'
                        ? 'Anulado'
                        : (item.status || 'Pendente'),
                    observacao: form.status === 'Cancelado'
                        ? (item.observacao?.trim() || 'Anulado automaticamente pelo cancelamento do pedido')
                        : (item.observacao?.trim() || null),
                    prazo_dias: item.prazo_dias ? Number(item.prazo_dias) : null,
                    juros_percent: toNumber(item.juros_percent),
                });
            }
        });

        if (!pagamentos.length) nextInvalid.pagamentos = true;

        if (form.status === 'Cancelado' && !String(form.motivo_cancelamento || '').trim()) {
            nextInvalid.motivo_cancelamento = true;
        }

        const subtotalCalc = itens.reduce((acc, item) => acc + (item.quantidade * item.preco_unitario), 0);
        const descontoCalc = Math.max(0, Math.min(toNumber(form.desconto), subtotalCalc));
        const freteCalc = Math.max(0, toNumber(form.frete));
        const totalCalc = Number((subtotalCalc - descontoCalc + freteCalc).toFixed(2));
        const somaPagamentos = Number(pagamentos.reduce((acc, item) => acc + item.valor, 0).toFixed(2));
        if (pagamentos.length && Math.abs(somaPagamentos - totalCalc) > 0.01) {
            nextInvalid.pagamentos = true;
        }

        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            const keys = Object.keys(nextInvalid);
            if (keys.some((key) => key.startsWith('pagamento') || key === 'pagamentos')) {
                setActiveTab('pagamento');
            } else if (keys.some((key) => key.startsWith('linha_') || key === 'itens')) {
                setActiveTab('produtos');
            } else {
                setActiveTab('dados');
            }

            if (nextInvalid.pagamentos && pagamentos.length && Math.abs(somaPagamentos - totalCalc) > 0.01) {
                showToast('error', `A soma dos pagamentos deve fechar o total (${formatCurrency(totalCalc)}).`);
            } else {
                showRequiredFieldsToast();
            }
            return;
        }

        const payload = {
            cliente_id: Number(form.cliente_id),
            data_pedido: form.data_pedido,
            data_entrega: form.data_entrega || null,
            data_carregamento: form.data_carregamento || null,
            status: form.status,
            motivo_cancelamento: form.status === 'Cancelado'
                ? String(form.motivo_cancelamento || '').trim()
                : null,
            desconto: toNumber(form.desconto),
            frete: form.tipo_entrega === 'frota' ? freteCalc : 0,
            observacoes: form.observacoes.trim() || null,
            veiculo_id: form.tipo_entrega === 'frota' ? (form.veiculo_id || null) : null,
            tipo_entrega: form.tipo_entrega || 'a_definir',
            endereco_entrega: form.endereco_entrega.trim() || null,
            cidade_entrega: form.cidade_entrega.trim() || null,
            uf_entrega: form.uf_entrega.trim() || null,
            cep_entrega: onlyDigits(form.cep_entrega) || null,
            contato_entrega: form.contato_entrega.trim() || null,
            telefone_entrega: form.telefone_entrega.trim() || null,
            nfe_numero: form.nfe_numero.trim() || null,
            nfe_chave: form.nfe_chave.trim() || null,
            nfe_status: form.nfe_status || 'Sem NF',
            nfe_data: form.nfe_data || null,
            itens,
            pagamentos,
        };

        setSaving(true);
        try {
            if (isEdit) {
                await updatePedido(pedidoId, payload);
                showToast('success', 'Pedido atualizado com sucesso.');
            } else {
                await createPedido(payload);
                showToast('success', 'Pedido criado com sucesso.');
            }
            onSaved?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar pedido.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!isEdit) return;
        setDeleting(true);
        try {
            await deletePedido(pedidoId);
            setShowDeleteConfirm(false);
            showToast('success', 'Pedido excluído com sucesso.');
            onSaved?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir pedido.');
        } finally {
            setDeleting(false);
        }
    };

    const isLocked = savedStatus === 'Cancelado';
    const nfeLocked = nfeDoSistema || isLocked;
    const entregaSimplificada = form.tipo_entrega === 'retirada' || form.tipo_entrega === 'a_definir';
    const mostraDetalheEntrega = form.tipo_entrega === 'frota' || form.tipo_entrega === 'externo';
    const mostraRotaEntrega = mostraDetalheEntrega;

    const applyCanceladoStatus = (motivo) => {
        setForm((current) => ({
            ...current,
            status: 'Cancelado',
            motivo_cancelamento: motivo,
            pagamentos: current.pagamentos.map((item) => ({
                ...item,
                status: 'Anulado',
                observacao: item.observacao?.trim()
                    || 'Anulado automaticamente pelo cancelamento do pedido',
            })),
        }));
        clearInvalid(['status', 'motivo_cancelamento']);
    };

    const handleStatusSelect = (nextStatus) => {
        if (nextStatus === 'Cancelado') {
            setCancelModal({
                open: true,
                motivo: form.motivo_cancelamento || '',
                previousStatus: form.status,
            });
            return;
        }
        setForm((current) => ({
            ...current,
            status: nextStatus,
            motivo_cancelamento: '',
        }));
        clearInvalid(['status', 'motivo_cancelamento']);
    };

    const handleConfirmCancelStatus = async () => {
        const motivo = cancelModal.motivo.trim();
        if (!motivo) {
            showToast('warning', 'Informe o motivo do cancelamento.');
            return;
        }

        applyCanceladoStatus(motivo);

        if (isEdit && pedidoId) {
            setCancelling(true);
            try {
                await patchPedidoStatus(pedidoId, 'Cancelado', motivo);
                setSavedStatus('Cancelado');
                emitPedidoUpdated(pedidoId, { status: 'Cancelado', motivo_cancelamento: motivo });
                setCancelModal({ open: false, motivo: '', previousStatus: '' });
                showToast('success', 'Pedido cancelado com sucesso.');
                onSaved?.();
            } catch (error) {
                showToast('error', error.message || 'Erro ao cancelar pedido.');
            } finally {
                setCancelling(false);
            }
            return;
        }

        setCancelModal({ open: false, motivo: '', previousStatus: '' });
    };

    const handleDismissCancelModal = () => {
        if (cancelling) return;
        setCancelModal({ open: false, motivo: '', previousStatus: '' });
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-funcionario-page">
                <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                    <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                        <div className="admin-funcionario-page-title">
                            <i className={`fas ${isEdit ? 'fa-shopping-cart' : 'fa-plus'}`} aria-hidden="true" />
                            <h1>
                                {isEdit
                                    ? `Pedido ${form.numero || `#${pedidoId}`}`
                                    : 'Novo Pedido'}
                            </h1>
                        </div>
                        <Button type="button" variant="link" className="admin-funcionario-back-btn" onClick={onClose}>
                            <i className="fas fa-arrow-left me-2" aria-hidden="true" />
                            Voltar
                        </Button>
                    </header>

                    <Form noValidate onSubmit={handleSubmit} className="admin-funcionario-form-shell">
                        <div className="admin-funcionario-modal-body admin-funcionario-form-body">
                            {loading ? (
                                <p className="text-muted mb-0">Carregando pedido...</p>
                            ) : (
                                <Tabs
                                    activeKey={activeTab}
                                    onSelect={(key) => setActiveTab(key || 'dados')}
                                    className="admin-modal-tabs admin-funcionario-tabs"
                                >
                                    <Tab eventKey="dados" title="Dados do pedido">
                                        <div className="admin-tab-panel">
                                    <FormSection title="Dados do pedido">
                                        <Row className="g-3 align-items-start">
                                            <Col md={4}>
                                                <AdminSearchSelect
                                                    label="Cliente"
                                                    name="cliente_id"
                                                    value={form.cliente_id}
                                                    options={clienteOptions}
                                                    onChange={(event) => {
                                                        clearInvalid(['cliente_id']);
                                                        applyClienteEndereco(event.target.value);
                                                    }}
                                                    required
                                                    isInvalid={Boolean(invalidFields.cliente_id)}
                                                    disabled={saving || deleting || isLocked}
                                                    placeholder="Buscar cliente..."
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <AdminDateField
                                                    label="Data do pedido"
                                                    name="data_pedido"
                                                    value={form.data_pedido}
                                                    onChange={(event) => {
                                                        setForm((current) => ({
                                                            ...current,
                                                            data_pedido: event.target.value,
                                                        }));
                                                        clearInvalid(['data_pedido']);
                                                    }}
                                                    required
                                                    isInvalid={Boolean(invalidFields.data_pedido)}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <AdminDateField
                                                    label="Data de entrega"
                                                    name="data_entrega"
                                                    value={form.data_entrega}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        data_entrega: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Status"
                                                    name="status"
                                                    value={form.status}
                                                    onChange={(event) => handleStatusSelect(event.target.value)}
                                                    required
                                                    isInvalid={Boolean(invalidFields.status)}
                                                    disabled={saving || deleting || isLocked}
                                                >
                                                    {STATUS_OPTIONS.map((item) => (
                                                        <option key={item} value={item}>{item}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Desconto (R$)"
                                                    name="desconto"
                                                    value={form.desconto}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        desconto: formatMoneyBr(event.target.value),
                                                    }))}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Frete (R$)"
                                                    name="frete"
                                                    value={form.frete}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        frete: formatMoneyBr(event.target.value),
                                                    }))}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="Observações"
                                                    name="observacoes"
                                                    value={form.observacoes}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        observacoes: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            {form.status === 'Cancelado' && form.motivo_cancelamento ? (
                                                <Col md={12}>
                                                    <AdminFloatField
                                                        as="textarea"
                                                        label="Motivo do cancelamento"
                                                        name="motivo_cancelamento"
                                                        value={form.motivo_cancelamento}
                                                        onChange={(event) => {
                                                            setForm((current) => ({
                                                                ...current,
                                                                motivo_cancelamento: event.target.value,
                                                            }));
                                                            clearInvalid(['motivo_cancelamento']);
                                                        }}
                                                        rows={3}
                                                        required
                                                        isInvalid={Boolean(invalidFields.motivo_cancelamento)}
                                                        disabled={saving || deleting || isLocked}
                                                    />
                                                </Col>
                                            ) : null}
                                        </Row>
                                        <p className="admin-ferias-form-hint mb-0 mt-2">
                                            Ao marcar como Aguardando carregamento, Aguardando entrega ou Entregue, o estoque é baixado automaticamente.
                                            Cancelar ou excluir devolve o estoque, se já tiver sido baixado.
                                        </p>
                                    </FormSection>

                                    <FormSection title="Entrega">
                                        {mostraDetalheEntrega && (form.endereco_entrega || form.cidade_entrega || form.cep_entrega) ? (
                                            <div className="admin-pedido-entrega-resumo">
                                                <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                                <div className="admin-pedido-entrega-resumo-body">
                                                    <p className="admin-pedido-entrega-resumo-text mb-0">
                                                        {[
                                                            form.endereco_entrega?.trim(),
                                                            [form.cidade_entrega?.trim(), form.uf_entrega?.trim()].filter(Boolean).join(' / '),
                                                            form.cep_entrega?.trim() ? `CEP ${form.cep_entrega.trim()}` : '',
                                                        ].filter(Boolean).join(' · ')}
                                                    </p>
                                                    {mostraRotaEntrega ? (
                                                        <div className="admin-pedido-entrega-resumo-meta">
                                                            {rotaLoading ? (
                                                                <span className="admin-pedido-entrega-chip is-muted">
                                                                    <i className="fas fa-spinner fa-spin" aria-hidden="true" />
                                                                    Calculando tempo...
                                                                </span>
                                                            ) : null}
                                                            {!rotaLoading && rotaInfo?.duracao_min ? (
                                                                <span className="admin-pedido-entrega-chip">
                                                                    <i className="fas fa-truck" aria-hidden="true" />
                                                                    Tempo até a cidade: {formatDuracaoMinutos(rotaInfo.duracao_min)}
                                                                </span>
                                                            ) : null}
                                                            {!rotaLoading && rotaInfo?.distancia_km != null ? (
                                                                <span className="admin-pedido-entrega-chip is-soft">
                                                                    <i className="fas fa-route" aria-hidden="true" />
                                                                    {Number(rotaInfo.distancia_km).toLocaleString('pt-BR')} km
                                                                </span>
                                                            ) : null}
                                                            {!rotaLoading && form.cidade_entrega && form.uf_entrega && !rotaInfo?.duracao_min ? (
                                                                <span className="admin-pedido-entrega-chip is-muted">
                                                                    Tempo indisponível para esta cidade
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        ) : null}
                                        <Row className="g-3">
                                            <Col md={entregaSimplificada ? 6 : 4}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Como será a entrega?"
                                                    name="tipo_entrega"
                                                    value={form.tipo_entrega}
                                                    onChange={(event) => {
                                                        const tipo = event.target.value;
                                                        setForm((current) => {
                                                            let frete = formatMoneyValue(0);
                                                            if (tipo === 'frota') {
                                                                const freteValor = lookupFreteValor(
                                                                    freteTabelaRef.current,
                                                                    current.cidade_entrega,
                                                                    current.uf_entrega
                                                                );
                                                                frete = freteValor != null
                                                                    ? formatMoneyValue(freteValor)
                                                                    : current.frete;
                                                            }
                                                            return {
                                                                ...current,
                                                                tipo_entrega: tipo,
                                                                veiculo_id: tipo === 'frota' ? current.veiculo_id : '',
                                                                frete,
                                                            };
                                                        });
                                                    }}
                                                    disabled={saving || deleting || isLocked}
                                                >
                                                    <option value="">Selecione</option>
                                                    <option value="frota">Frota própria</option>
                                                    <option value="retirada">Retirada pelo cliente</option>
                                                    <option value="externo">Transporte externo</option>
                                                    <option value="a_definir">Ainda sem definição</option>
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={entregaSimplificada ? 6 : 4}>
                                                <AdminDateField
                                                    label="Data do carregamento"
                                                    name="data_carregamento"
                                                    value={form.data_carregamento}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        data_carregamento: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || isLocked}
                                                />
                                            </Col>
                                            {form.tipo_entrega === 'frota' ? (
                                                <Col md={4}>
                                                    <AdminSearchSelect
                                                        label="Caminhão / veículo"
                                                        name="veiculo_id"
                                                        value={form.veiculo_id}
                                                        options={veiculoOptions}
                                                        onChange={(event) => setForm((current) => ({
                                                            ...current,
                                                            veiculo_id: event.target.value,
                                                            tipo_entrega: 'frota',
                                                        }))}
                                                        disabled={saving || deleting || isLocked}
                                                        placeholder="Buscar placa ou modelo..."
                                                        emptyLabel="Nenhum veículo ativo"
                                                    />
                                                </Col>
                                            ) : null}
                                            {mostraDetalheEntrega ? (
                                                <>
                                                    <Col md={3}>
                                                        <AdminFloatField
                                                            label="Contato na entrega"
                                                            name="contato_entrega"
                                                            value={form.contato_entrega}
                                                            onChange={(event) => setForm((current) => ({
                                                                ...current,
                                                                contato_entrega: event.target.value,
                                                            }))}
                                                            disabled={saving || deleting || isLocked}
                                                        />
                                                    </Col>
                                                    <Col md={3}>
                                                        <AdminFloatField
                                                            label="Telefone"
                                                            name="telefone_entrega"
                                                            value={form.telefone_entrega}
                                                            onChange={(event) => setForm((current) => ({
                                                                ...current,
                                                                telefone_entrega: event.target.value,
                                                            }))}
                                                            disabled={saving || deleting || isLocked}
                                                        />
                                                    </Col>
                                                    <Col md={6}>
                                                        <AdminFloatField
                                                            label="Endereço de entrega"
                                                            name="endereco_entrega"
                                                            value={form.endereco_entrega}
                                                            onChange={(event) => setForm((current) => ({
                                                                ...current,
                                                                endereco_entrega: event.target.value,
                                                            }))}
                                                            disabled={saving || deleting || isLocked}
                                                        />
                                                    </Col>
                                                    <Col md={2}>
                                                        <AdminFloatField
                                                            label="CEP"
                                                            name="cep_entrega"
                                                            value={form.cep_entrega}
                                                            onChange={(event) => setForm((current) => ({
                                                                ...current,
                                                                cep_entrega: formatCep(event.target.value),
                                                            }))}
                                                            onBlur={(event) => handleCepBlur(event.target.value)}
                                                            disabled={saving || deleting || isLocked || cepLoading}
                                                            placeholder="00000-000"
                                                        />
                                                        {cepLoading ? (
                                                            <p className="admin-ferias-form-hint mb-0 mt-1">Buscando CEP...</p>
                                                        ) : null}
                                                    </Col>
                                                    <Col md={3}>
                                                        <AdminFloatField
                                                            label="Cidade"
                                                            name="cidade_entrega"
                                                            value={form.cidade_entrega}
                                                            readOnly
                                                            disabled={saving || deleting || isLocked}
                                                        />
                                                    </Col>
                                                    <Col md={1}>
                                                        <AdminFloatField
                                                            label="UF"
                                                            name="uf_entrega"
                                                            value={form.uf_entrega}
                                                            maxLength={2}
                                                            readOnly
                                                            disabled={saving || deleting || isLocked}
                                                        />
                                                    </Col>
                                                </>
                                            ) : null}
                                        </Row>
                                    </FormSection>

                                    <FormSection title="Nota fiscal">
                                        {nfeDoSistema ? (
                                            <p className="text-muted small mb-2">
                                                NF-e emitida pelo sistema — campos bloqueados para edição.
                                            </p>
                                        ) : null}
                                        <Row className="g-3">
                                            <Col md={3}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Status NF-e"
                                                    name="nfe_status"
                                                    value={form.nfe_status}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        nfe_status: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || nfeLocked}
                                                    readOnly={nfeDoSistema}
                                                >
                                                    {NFE_STATUS.map((item) => (
                                                        <option key={item} value={item}>{item}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Número NF-e"
                                                    name="nfe_numero"
                                                    value={form.nfe_numero}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        nfe_numero: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || nfeLocked}
                                                    readOnly={nfeDoSistema}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Chave de acesso"
                                                    name="nfe_chave"
                                                    value={form.nfe_chave}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        nfe_chave: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || nfeLocked}
                                                    readOnly={nfeDoSistema}
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <AdminDateField
                                                    label="Data emissão"
                                                    name="nfe_data"
                                                    value={form.nfe_data}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        nfe_data: event.target.value,
                                                    }))}
                                                    disabled={saving || deleting || nfeLocked}
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>
                                        </div>
                                    </Tab>

                                    <Tab eventKey="produtos" title="Produtos">
                                        <div className="admin-tab-panel">
                                    <FormSection title="Itens do pedido">
                                        <div className="admin-estoque-modal-section-head mb-3">
                                            <h4 className="mb-0" style={{ fontSize: '0.9rem' }}>Produtos</h4>
                                            <button
                                                type="button"
                                                className="admin-estoque-link-btn"
                                                onClick={addLinha}
                                                disabled={saving || deleting || isLocked}
                                            >
                                                <i className="fas fa-plus" aria-hidden="true" />
                                                Adicionar produto
                                            </button>
                                        </div>

                                        <div className="admin-estoque-prod-lines">
                                            {form.itens.map((linha, index) => {
                                                const lineTotal = toNumber(linha.quantidade) * toNumber(linha.preco_unitario);

                                                return (
                                                    <div className="admin-estoque-prod-line admin-pedido-line" key={`pedido-line-${index}`}>
                                                        <span className="admin-estoque-prod-line-index">{index + 1}</span>
                                                        <div className="admin-pedido-line-fields">
                                                            <AdminFloatField
                                                                as="select"
                                                                label="Produto"
                                                                name={`produto_${index}`}
                                                                value={linha.produto_id}
                                                                onChange={(event) => updateLinha(index, 'produto_id', event.target.value)}
                                                                required
                                                                isInvalid={Boolean(invalidFields[`linha_${index}_produto_id`])}
                                                                disabled={saving || deleting || isLocked}
                                                            >
                                                                <option value="">Selecione</option>
                                                                {produtos.map((item) => (
                                                                    <option key={item.id} value={item.id}>
                                                                        {item.codigo ? `${item.codigo} - ` : ''}
                                                                        {item.nome}
                                                                        {' '}
                                                                        (estoque: {Number(item.estoque) || 0} {item.unidade || 'un'})
                                                                    </option>
                                                                ))}
                                                            </AdminFloatField>
                                                            <AdminFloatField
                                                                as="select"
                                                                label="Unidade"
                                                                name={`unidade_${index}`}
                                                                value={linha.unidade || 'un'}
                                                                onChange={(event) => updateLinha(index, 'unidade', event.target.value)}
                                                                disabled={saving || deleting || isLocked}
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
                                                                required
                                                                isInvalid={Boolean(invalidFields[`linha_${index}_quantidade`])}
                                                                disabled={saving || deleting || isLocked}
                                                            />
                                                            <AdminFloatField
                                                                label="Preço"
                                                                name={`preco_${index}`}
                                                                value={linha.preco_unitario}
                                                                onChange={(event) => updateLinha(index, 'preco_unitario', event.target.value)}
                                                                required
                                                                isInvalid={Boolean(invalidFields[`linha_${index}_preco_unitario`])}
                                                                disabled={saving || deleting || isLocked}
                                                            />
                                                            <div className="admin-pedido-line-total">
                                                                <small>{linha.unidade || 'un'}</small>
                                                                <strong>{formatCurrency(lineTotal)}</strong>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="admin-estoque-prod-line-remove"
                                                            disabled={saving || deleting || isLocked || form.itens.length <= 1}
                                                            onClick={() => removeLinha(index)}
                                                            aria-label="Remover item"
                                                            title="Remover"
                                                        >
                                                            <i className="fas fa-trash-alt" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="admin-pedido-totals">
                                            <div>
                                                <span>Subtotal</span>
                                                <strong>{formatCurrency(totais.subtotal)}</strong>
                                            </div>
                                            <div>
                                                <span>Desconto</span>
                                                <strong>{formatCurrency(totais.desconto)}</strong>
                                            </div>
                                            <div>
                                                <span>Frete</span>
                                                <strong>{formatCurrency(totais.frete)}</strong>
                                            </div>
                                            <div className="is-total">
                                                <span>Total do pedido</span>
                                                <strong>{formatCurrency(totais.total)}</strong>
                                            </div>
                                        </div>
                                    </FormSection>
                                        </div>
                                    </Tab>

                                    <Tab eventKey="pagamento" title="Pagamento">
                                        <div className="admin-tab-panel">
                                    <FormSection title="Pagamentos">
                                        <div className="admin-estoque-modal-section-head mb-3">
                                            <h4 className="mb-0" style={{ fontSize: '0.9rem' }}>Formas de pagamento</h4>
                                            <div className="admin-pedido-pay-actions">
                                                {Math.abs(totais.restante) >= 0.01 ? (
                                                    <button
                                                        type="button"
                                                        className="admin-estoque-link-btn"
                                                        onClick={ajustarPagamentosAoTotal}
                                                        disabled={saving || deleting || isLocked}
                                                    >
                                                        <i className="fas fa-balance-scale" aria-hidden="true" />
                                                        Ajustar ao total
                                                    </button>
                                                ) : null}
                                                <button
                                                    type="button"
                                                    className="admin-estoque-link-btn"
                                                    onClick={addPagamento}
                                                    disabled={saving || deleting || isLocked}
                                                >
                                                    <i className="fas fa-plus" aria-hidden="true" />
                                                    Adicionar pagamento
                                                </button>
                                            </div>
                                        </div>

                                        <div className="admin-pedido-pay-lines">
                                            {form.pagamentos.map((item, index) => {
                                                const formaConfig = resolveFormaConfig(item);
                                                const isPrazo = formaConfig?.tipo === 'prazo'
                                                    || formaConfig?.tipo === 'cartao'
                                                    || formaConfig?.tipo === 'boleto';
                                                const prazosAtivos = (formaConfig?.prazos || []).filter((p) => p.ativo);
                                                const jurosInfo = Number(item.juros_percent) || 0;
                                                const valorComJuros = jurosInfo > 0
                                                    ? Number((toNumber(item.valor) * (1 + (jurosInfo / 100))).toFixed(2))
                                                    : toNumber(item.valor);
                                                const prazoFieldLabel = formaConfig?.tipo === 'cartao'
                                                    ? 'Parcelas'
                                                    : (formaConfig?.tipo === 'boleto' ? 'Vencimento' : 'Prazo');

                                                return (
                                                    <div className="admin-pedido-pay-line" key={`pay-line-${index}`}>
                                                        <span className="admin-estoque-prod-line-index">{index + 1}</span>
                                                        <div className="admin-pedido-pay-main">
                                                            <div className={`admin-pedido-pay-fields${isPrazo ? ' has-prazo' : ''}`}>
                                                                <AdminFloatField
                                                                    as="select"
                                                                    label="Forma"
                                                                    name={`pagamento_forma_${index}`}
                                                                    value={item.forma}
                                                                    onChange={(event) => updatePagamento(index, 'forma', event.target.value)}
                                                                    required
                                                                    isInvalid={Boolean(invalidFields[`pagamento_${index}_forma`])}
                                                                    disabled={saving || deleting || isLocked}
                                                                >
                                                                    <option value="">Selecione</option>
                                                                    {formaOptions.map((forma) => (
                                                                        <option key={forma.id} value={forma.nome}>{forma.nome}</option>
                                                                    ))}
                                                                </AdminFloatField>
                                                                {isPrazo ? (
                                                                    <AdminFloatField
                                                                        as="select"
                                                                        label={prazoFieldLabel}
                                                                        name={`pagamento_prazo_${index}`}
                                                                        value={item.prazo_dias}
                                                                        onChange={(event) => updatePagamento(index, 'prazo_dias', event.target.value)}
                                                                        required
                                                                        isInvalid={Boolean(invalidFields[`pagamento_${index}_prazo_dias`])}
                                                                        disabled={saving || deleting || isLocked}
                                                                    >
                                                                        <option value="">Selecione</option>
                                                                        {prazosAtivos.map((prazo) => (
                                                                            <option key={prazo.dias} value={prazo.dias}>
                                                                                {formaConfig?.tipo === 'cartao'
                                                                                    ? `${prazo.dias}x${prazo.dias > 1 ? ` (${prazo.dias} meses)` : ''}`
                                                                                    : `${prazo.dias} dias`}
                                                                                {formaConfig?.tipo !== 'boleto' && formaConfig.tem_juros
                                                                                    ? ` (${Number(prazo.juros_percent) || 0}% juros)`
                                                                                    : ''}
                                                                            </option>
                                                                        ))}
                                                                    </AdminFloatField>
                                                                ) : null}
                                                                <AdminFloatField
                                                                    label="Valor (R$)"
                                                                    name={`pagamento_valor_${index}`}
                                                                    value={item.valor}
                                                                    onChange={(event) => updatePagamento(index, 'valor', event.target.value)}
                                                                    required
                                                                    isInvalid={Boolean(invalidFields[`pagamento_${index}_valor`])}
                                                                    disabled={saving || deleting || isLocked}
                                                                />
                                                                <AdminFloatField
                                                                    as="select"
                                                                    label="Status"
                                                                    name={`pagamento_status_${index}`}
                                                                    value={item.status}
                                                                    onChange={(event) => updatePagamento(index, 'status', event.target.value)}
                                                                    disabled={saving || deleting || isLocked}
                                                                >
                                                                    {PAGAMENTO_STATUS.map((status) => (
                                                                        <option key={status} value={status}>{status}</option>
                                                                    ))}
                                                                </AdminFloatField>
                                                                <AdminFloatField
                                                                    label="Obs."
                                                                    name={`pagamento_obs_${index}`}
                                                                    value={item.observacao}
                                                                    onChange={(event) => updatePagamento(index, 'observacao', event.target.value)}
                                                                    disabled={saving || deleting || isLocked}
                                                                />
                                                            </div>
                                                            {jurosInfo > 0 && toNumber(item.valor) > 0 ? (
                                                                <p className="admin-pedido-pay-juros-hint mb-0">
                                                                    {formaConfig?.tipo === 'boleto'
                                                                        ? `Juros após vencimento ${jurosInfo}%: se atrasar, valor estimado ${formatCurrency(valorComJuros)}`
                                                                        : `Juros ${jurosInfo}%: cliente paga ${formatCurrency(valorComJuros)}`}
                                                                    {' '}
                                                                    (no pedido conta {formatCurrency(toNumber(item.valor))})
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="admin-estoque-prod-line-remove"
                                                            disabled={saving || deleting || isLocked}
                                                            onClick={() => removePagamento(index)}
                                                            aria-label={form.pagamentos.length <= 1 ? 'Limpar pagamento' : 'Remover pagamento'}
                                                            title={form.pagamentos.length <= 1 ? 'Limpar' : 'Remover'}
                                                        >
                                                            <i className="fas fa-trash-alt" aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {Math.abs(totais.restante) < 0.01 ? (
                                            <p className="admin-pedido-pay-status is-ok mb-0">
                                                Pagamentos batem com o total ({formatCurrency(totais.total)}).
                                            </p>
                                        ) : (
                                            <p className={`admin-pedido-pay-status is-warn mb-0${invalidFields.pagamentos ? ' is-invalid' : ''}`}>
                                                {totais.restante > 0
                                                    ? `Falta ${formatCurrency(totais.restante)} nos pagamentos para fechar o total de ${formatCurrency(totais.total)}.`
                                                    : `Pagamentos passam ${formatCurrency(Math.abs(totais.restante))} do total (${formatCurrency(totais.total)}).`}
                                            </p>
                                        )}
                                    </FormSection>
                                        </div>
                                    </Tab>
                                </Tabs>
                            )}
                        </div>

                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                            {isEdit && !isLocked ? (
                                <Button
                                    type="button"
                                    variant="outline-danger"
                                    disabled={saving || deleting || loading}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    <i className="fas fa-trash-alt me-2" aria-hidden="true" />
                                    Excluir
                                </Button>
                            ) : null}
                            <Button type="button" variant="outline-secondary" disabled={saving || deleting} onClick={onClose}>
                                Cancelar
                            </Button>
                            {!isLocked ? (
                                <Button type="submit" variant="primary" disabled={saving || deleting || loading}>
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </Button>
                            ) : null}
                        </footer>
                    </Form>
                </section>
            </div>

            <Modal
                show={showDeleteConfirm}
                onHide={() => !deleting && setShowDeleteConfirm(false)}
                centered
                className="admin-delete-confirm-modal"
            >
                <Modal.Header className="admin-delete-confirm-header">
                    <Modal.Title>
                        <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                        Excluir pedido
                    </Modal.Title>
                    <AdminModalClose onClick={() => setShowDeleteConfirm(false)} disabled={deleting} />
                </Modal.Header>
                <Modal.Body className="admin-delete-confirm-body">
                    <p>
                        Deseja excluir o pedido
                        {' '}
                        <strong>{form.numero || `#${pedidoId}`}</strong>
                        ?
                    </p>
                    <p className="admin-delete-confirm-note">
                        Se o estoque já tiver sido baixado, ele será devolvido automaticamente.
                    </p>
                </Modal.Body>
                <Modal.Footer className="admin-delete-confirm-footer">
                    <Button variant="secondary" disabled={deleting} onClick={() => setShowDeleteConfirm(false)}>
                        Cancelar
                    </Button>
                    <Button variant="danger" disabled={deleting} onClick={handleDelete}>
                        {deleting ? 'Excluindo...' : 'Excluir'}
                    </Button>
                </Modal.Footer>
            </Modal>

            <Modal
                show={cancelModal.open}
                onHide={handleDismissCancelModal}
                centered
                backdrop="static"
                className="admin-delete-confirm-modal"
            >
                <Modal.Header className="admin-delete-confirm-header">
                    <Modal.Title>
                        <i className="fas fa-ban me-2" aria-hidden="true" />
                        Cancelar pedido {form.numero || (pedidoId ? `#${pedidoId}` : '')}
                    </Modal.Title>
                    <AdminModalClose onClick={handleDismissCancelModal} />
                </Modal.Header>
                <Modal.Body className="admin-delete-confirm-body">
                    <p>
                        Informe o motivo do cancelamento de{' '}
                        <strong>{form.numero || (pedidoId ? `#${pedidoId}` : 'pedido')}</strong>.
                    </p>
                    <p className="admin-delete-confirm-note">
                        O motivo é obrigatório. Ao confirmar, os pagamentos serão anulados.
                    </p>
                    <div style={{ marginTop: '0.85rem' }}>
                        <textarea
                            rows={3}
                            value={cancelModal.motivo}
                            onChange={(e) => setCancelModal((prev) => ({ ...prev, motivo: e.target.value }))}
                            placeholder="Ex: Cliente desistiu da compra, alteração nas quantidades..."
                            className="form-control"
                            autoFocus
                            required
                        />
                    </div>
                </Modal.Body>
                <Modal.Footer className="admin-delete-confirm-footer">
                    <Button type="button" variant="secondary" onClick={handleDismissCancelModal} disabled={cancelling}>
                        Voltar
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={handleConfirmCancelStatus}
                        disabled={cancelling || !cancelModal.motivo.trim()}
                    >
                        {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </AdminDateFieldProvider>
    );
}
