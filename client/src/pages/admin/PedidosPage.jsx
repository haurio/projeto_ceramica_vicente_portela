import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminModalClose from '../../components/admin/AdminModalClose';
import { AdminDateFieldProvider, AdminDateRangeField } from '../../components/admin/AdminDateField';
import AdminMultiCheckDropdown from '../../components/admin/AdminMultiCheckDropdown';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchPedidos, patchPedidoStatus, patchPedidoPagamentosStatus } from '../../api/pedidos';
import { emitPedidoUpdated, onPedidoUpdated } from '../../utils/syncChannel';
import { showToast } from '../../utils/toast';

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBr(value) {
    if (!value) return '—';
    const raw = toDateKey(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value);
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function toDateKey(value) {
    if (!value) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return '';
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function todayIsoLocal() {
    return toDateKey(new Date());
}

function formatCepBr(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
    if (digits.length !== 8) return String(value || '').trim();
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function formatEnderecoEntrega(item) {
    const parts = [];
    const rua = String(item.endereco_entrega || '').trim();
    const cidade = String(item.cidade_entrega || '').trim();
    const uf = String(item.uf_entrega || '').trim().toUpperCase();
    const cep = formatCepBr(item.cep_entrega);

    if (rua) parts.push(rua);
    if (cidade || uf) {
        parts.push([cidade, uf].filter(Boolean).join(' / '));
    }
    if (cep) parts.push(`CEP ${cep}`);
    return parts.length ? parts.join(' · ') : 'Sem endereço de entrega';
}

function formatTipoEntrega(item) {
    const tipo = String(item.tipo_entrega || '').toLowerCase();
    if (tipo === 'retirada') return 'Retirada pelo cliente';
    if (tipo === 'externo') return 'Transporte externo';
    if (tipo === 'frota' || item.veiculo_id) {
        return item.veiculo_placa || 'Frota · veículo a definir';
    }
    return 'Sem transporte definido';
}

function statusTone(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'entregue') return 'success';
    if (
        normalized === 'aguardando entrega'
        || normalized === 'aguardando carregamento'
        || normalized === 'confirmado'
        || normalized === 'pré-venda'
        || normalized === 'pre-venda'
        || normalized === 'prevenda'
    ) {
        return 'info';
    }
    if (normalized === 'aguardando pagamento' || normalized === 'pendente' || normalized === 'rascunho' || normalized === 'em análise' || normalized === 'em analise') {
        return 'warning';
    }
    if (normalized === 'pagamento em atraso' || normalized === 'cancelado') return 'danger';
    return 'warning';
}

const STATUS_FILTERS = [
    { key: 'todos', label: 'Todos', tone: 'neutral' },
    { key: 'carregamento_hoje', label: 'Carregamento hoje', tone: 'await-load' },
    { key: 'Pré-venda', label: 'Pré-venda', tone: 'info' },
    { key: 'Em análise', label: 'Em análise', tone: 'pending' },
    { key: 'Pendente', label: 'Pendente', tone: 'pending' },
    { key: 'Aguardando pagamento', label: 'Aguardando pagamento', tone: 'await-pay' },
    { key: 'Pagamento em atraso', label: 'Pagamento em atraso', tone: 'overdue' },
    { key: 'Aguardando carregamento', label: 'Aguardando carregamento', tone: 'await-load' },
    { key: 'Aguardando entrega', label: 'Aguardando entrega', tone: 'await-delivery' },
    { key: 'Entregue', label: 'Entregue', tone: 'delivered' },
    { key: 'Cancelado', label: 'Cancelado', tone: 'cancelled' },
];

const PAY_FILTER_OPTIONS = [
    'Todos',
    'Pagamento confirmado',
    'Pagamento pendente',
    'Pagamento em atraso',
    'Pagamento anulado',
];

const PAY_FILTER_KIND = {
    'Todos': 'todos',
    'Pagamento confirmado': 'confirmado',
    'Pagamento pendente': 'pendente',
    'Pagamento em atraso': 'atrasado',
    'Pagamento anulado': 'anulado',
};

function pedidoDateKey(item) {
    return toDateKey(item.data_pedido);
}

function pagamentoKind(item) {
    const situacao = item.situacao || item.status || 'Pendente';
    const anulado = situacao === 'Cancelado' || Boolean(item.tem_pagamento_anulado);
    if (anulado) return 'anulado';
    if (item.tem_pagamento_atrasado || situacao === 'Pagamento em atraso') return 'atrasado';
    if (item.tem_pagamento_pendente || !item.pagamento_soma || Number(item.pagamento_soma) <= 0) return 'pendente';
    return 'confirmado';
}

export default function PedidosPage() {
    const navigate = useNavigate();
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [payFilter, setPayFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const STATUS_OPTIONS = [
        'Todos',
        'Carregamentos de Hoje',
        'Pré-venda',
        'Em análise',
        'Rascunho',
        'Pendente',
        'Aguardando pagamento',
        'Aguardando carregamento',
        'Aguardando entrega',
        'Confirmado',
        'Entregue',
        'Cancelado',
    ];
    const [periodoInicio, setPeriodoInicio] = useState('');
    const [periodoFim, setPeriodoFim] = useState('');

    const loadPedidos = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await fetchPedidos();
            setPedidos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar pedidos.');
            if (!silent) setPedidos([]);
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPedidos();
        const intervalId = setInterval(() => {
            loadPedidos(true);
        }, 4000);
        const unsubscribe = onPedidoUpdated(() => {
            loadPedidos(true);
        });
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        };
    }, [loadPedidos]);

    const hojeIso = todayIsoLocal();

    const counts = useMemo(() => {
        const next = {
            todos: pedidos.length,
            carregamento_hoje: 0,
            'Pré-venda': 0,
            'Em análise': 0,
            Pendente: 0,
            'Aguardando pagamento': 0,
            'Pagamento em atraso': 0,
            'Aguardando carregamento': 0,
            'Aguardando entrega': 0,
            Entregue: 0,
            Cancelado: 0,
        };
        pedidos.forEach((item) => {
            const situacao = item.status || item.situacao || 'Pendente';
            if (next[situacao] != null) next[situacao] += 1;
            const carregamentoIso = toDateKey(item.data_carregamento);
            if (
                carregamentoIso
                && carregamentoIso === hojeIso
                && situacao !== 'Cancelado'
                && situacao !== 'Entregue'
            ) {
                next.carregamento_hoje += 1;
            }
        });
        return next;
    }, [pedidos, hojeIso]);

    const selectedPayKinds = useMemo(() => (
        String(payFilter || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => PAY_FILTER_KIND[item])
            .filter(Boolean)
    ), [payFilter]);

    const selectedStatuses = useMemo(() => (
        String(statusFilter || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
    ), [statusFilter]);

    const filtered = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return pedidos.filter((item) => {
            const situacao = item.status || item.situacao || 'Pendente';
            
            if (query) {
                const numeroClean = String(item.numero || '').toLowerCase();
                const idClean = String(item.id || '');
                const clienteClean = String(item.cliente_nome || '').toLowerCase();
                const repClean = String(item.representante_nome || '').toLowerCase();
                const cidadeClean = String(item.cidade_entrega || '').toLowerCase();
                const matches = numeroClean.includes(query)
                    || idClean === query
                    || clienteClean.includes(query)
                    || repClean.includes(query)
                    || cidadeClean.includes(query);
                if (!matches) return false;
            }

            if (selectedStatuses.length > 0 && !selectedStatuses.includes('Todos')) {
                const isCarregamentoHoje = selectedStatuses.includes('Carregamentos de Hoje');
                const carriesToday = (
                    toDateKey(item.data_carregamento) === hojeIso 
                    && situacao !== 'Cancelado' 
                    && situacao !== 'Entregue'
                );
                
                const matchesNormalStatus = selectedStatuses.includes(situacao);
                
                if (!matchesNormalStatus && !(isCarregamentoHoje && carriesToday)) {
                    return false;
                }
            }

            if (selectedPayKinds.length > 0 && !selectedPayKinds.includes('todos')) {
                const kind = pagamentoKind(item);
                if (!selectedPayKinds.includes(kind)) return false;
            }

            if (periodoInicio && periodoFim) {
                const dateKey = pedidoDateKey(item);
                if (!dateKey || dateKey < periodoInicio || dateKey > periodoFim) return false;
            }

            return true;
        });
    }, [pedidos, searchTerm, selectedStatuses, selectedPayKinds, periodoInicio, periodoFim, hojeIso]);

    const openPedido = (id) => {
        navigate(`/pedidos/${id}/editar`);
    };

    const [cancelModal, setCancelModal] = useState({ open: false, pedidoId: null, numero: '', motivo: '' });

    const handleStatusChange = async (id, status) => {
        if (status === 'Cancelado') {
            const pedido = pedidos.find(p => p.id === id);
            setCancelModal({
                open: true,
                pedidoId: id,
                numero: pedido?.numero || `PED-${String(id).padStart(5, '0')}`,
                motivo: ''
            });
            return;
        }
        await updateStatus(id, status);
    };

    const updateStatus = async (id, status, motivo = null) => {
        const pedidoId = Number(id);
        setPedidos((current) => current.map((p) => (
            Number(p.id) === pedidoId
                ? {
                    ...p,
                    status,
                    situacao: status,
                    motivo_cancelamento: status === 'Cancelado' ? motivo : null,
                    tem_pagamento_anulado: status === 'Cancelado' ? true : p.tem_pagamento_anulado,
                }
                : p
        )));
        try {
            const result = await patchPedidoStatus(pedidoId, status, motivo);
            const motivoSalvo = result?.motivo_cancelamento || motivo;
            setPedidos((current) => current.map((p) => (
                Number(p.id) === pedidoId
                    ? {
                        ...p,
                        status,
                        situacao: status,
                        motivo_cancelamento: status === 'Cancelado' ? motivoSalvo : null,
                        tem_pagamento_anulado: status === 'Cancelado' ? true : p.tem_pagamento_anulado,
                    }
                    : p
            )));
            emitPedidoUpdated(pedidoId, { status, motivo_cancelamento: motivoSalvo });
            showToast('success', status === 'Cancelado' ? 'Pedido cancelado!' : 'Status atualizado!');
            loadPedidos(true);
        } catch (err) {
            loadPedidos(true);
            showToast('error', err.message || 'Erro ao atualizar status.');
        }
    };

    const handleConfirmCancel = async () => {
        const motivo = cancelModal.motivo.trim();
        if (!motivo) {
            showToast('warning', 'Informe o motivo do cancelamento.');
            return;
        }
        const id = cancelModal.pedidoId;
        setCancelModal({ open: false, pedidoId: null, numero: '', motivo: '' });
        await updateStatus(id, 'Cancelado', motivo);
    };

    const handlePaymentStatusChange = async (id, status) => {
        setPedidos(current => current.map(p => p.id === id ? { ...p, pagamento_status: status } : p));
        try {
            await patchPedidoPagamentosStatus(id, status);
            emitPedidoUpdated(id, { paymentStatus: status });
            showToast('success', 'Status do pagamento atualizado!');
            loadPedidos(true);
        } catch (err) {
            loadPedidos(true);
            showToast('error', 'Erro ao atualizar pagamento.');
        }
    };

    const hasActiveFilters = Boolean(
        searchTerm.trim()
        || statusFilter
        || payFilter
        || periodoInicio
        || periodoFim
    );

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('');
        setPayFilter('');
        setPeriodoInicio('');
        setPeriodoFim('');
    };

    return (
        <div className="admin-page-fill admin-pedidos-fill">
            <section className="admin-panel-card admin-page-card admin-pedidos-page">
                <div className="admin-pedidos-top">
                    <AdminPageHeader
                        title="Pedidos"
                        icon="fa-shopping-cart"
                        actionLabel="Novo Pedido"
                        actionIcon="fa-plus"
                        onAction={() => navigate('/pedidos/novo')}
                    />

                    <div className="admin-pedidos-filters-row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
                        <AdminDateFieldProvider>
                            <div className="admin-pedidos-periodo">
                                <div className="admin-field admin-pedidos-search">
                                    <div className="admin-field-control">
                                        <i className="fas fa-search" aria-hidden="true" />
                                        <input
                                            id="pedidos_search_input"
                                            type="search"
                                            value={searchTerm}
                                            onChange={(event) => setSearchTerm(event.target.value)}
                                            placeholder="Nº ou cliente..."
                                            className="admin-field-input form-control"
                                            aria-label="Pesquisar pedido ou cliente"
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={() => setSearchTerm('')}
                                                className="admin-pedidos-search-clear"
                                                title="Limpar pesquisa"
                                            >
                                                <i className="fas fa-times" aria-hidden="true" />
                                            </button>
                                        )}
                                        <label htmlFor="pedidos_search_input" className="admin-field-label">
                                            Pesquisar
                                        </label>
                                    </div>
                                </div>
                                <AdminMultiCheckDropdown
                                    label="Status"
                                    name="pedidos_status"
                                    value={statusFilter}
                                    options={STATUS_OPTIONS}
                                    onChange={(event) => setStatusFilter(event.target.value)}
                                />
                                <AdminMultiCheckDropdown
                                    label="Pagamento"
                                    name="pedidos_pagamento"
                                    value={payFilter}
                                    options={PAY_FILTER_OPTIONS}
                                    onChange={(event) => setPayFilter(event.target.value)}
                                />
                                <AdminDateRangeField
                                    label="Período"
                                    name="pedidos_periodo"
                                    inicio={periodoInicio}
                                    fim={periodoFim}
                                    onChange={({ inicio: nextInicio, fim: nextFim }) => {
                                        setPeriodoInicio(nextInicio || '');
                                        setPeriodoFim(nextFim || '');
                                    }}
                                />
                                {periodoInicio && periodoFim ? (
                                    <button
                                        type="button"
                                        className="admin-pedidos-periodo-clear"
                                        title="Limpar período"
                                        aria-label="Limpar período"
                                        onClick={() => {
                                            setPeriodoInicio('');
                                            setPeriodoFim('');
                                        }}
                                    >
                                        <i className="fas fa-times" aria-hidden="true" />
                                    </button>
                                ) : null}
                                <button
                                    type="button"
                                    className="admin-pedidos-clear-filters"
                                    title="Limpar filtros"
                                    aria-label="Limpar filtros"
                                    disabled={!hasActiveFilters}
                                    onClick={clearFilters}
                                >
                                    <i className="fas fa-eraser" aria-hidden="true" />
                                    Limpar filtros
                                </button>
                            </div>
                        </AdminDateFieldProvider>
                    </div>
                </div>

                <div className="admin-pedidos-scroll">
                    {loading ? <p className="text-muted mb-0 mt-1">Carregando pedidos...</p> : null}

                    {!loading && filtered.length === 0 ? (
                        <p className="text-muted mb-0 mt-1">
                            {searchTerm
                                ? `Nenhum pedido encontrado para "${searchTerm}".`
                                : pedidos.length === 0
                                    ? 'Nenhum pedido cadastrado.'
                                    : 'Nenhum pedido com os filtros selecionados.'}
                        </p>
                    ) : null}

                    {!loading && filtered.length > 0 ? (
                        <>
                            <div className="admin-pedidos-grid">
                                {filtered.map((item) => {
                                    const situacao = item.situacao || item.status || 'Pendente';
                                    const tone = statusTone(situacao);
                                    const pagamentoAnulado = situacao === 'Cancelado' || Boolean(item.tem_pagamento_anulado);
                                    const pagamentoAtrasado = !pagamentoAnulado && Boolean(item.tem_pagamento_atrasado);
                                    const pagamentoPendente = !pagamentoAnulado && (Boolean(item.tem_pagamento_pendente) || !item.pagamento_soma || Number(item.pagamento_soma) <= 0) && !pagamentoAtrasado;
                                    const carregamentoIso = toDateKey(item.data_carregamento);
                                    const entregaIso = toDateKey(item.data_entrega);
                                    const carregamentoHoje = Boolean(
                                        carregamentoIso
                                        && carregamentoIso === hojeIso
                                        && situacao !== 'Cancelado'
                                        && situacao !== 'Entregue'
                                    );
                                    const entregaHoje = Boolean(
                                        entregaIso
                                        && entregaIso === hojeIso
                                        && situacao !== 'Cancelado'
                                        && situacao !== 'Entregue'
                                    );

                                    return (
                                        <article
                                            key={item.id}
                                            className={`admin-pedido-card is-compact is-${tone}${pagamentoAtrasado ? ' has-pay-overdue' : ''}${pagamentoPendente ? ' has-pay-pending' : ''}${carregamentoHoje ? ' has-carregamento-hoje' : ''}`}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => openPedido(item.id)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter' || event.key === ' ') {
                                                    event.preventDefault();
                                                    openPedido(item.id);
                                                }
                                            }}
                                        >
                                            <div className="admin-pedido-card-head">
                                                <div>
                                                    <strong>{item.numero || `PED-${String(item.id).padStart(5, '0')}`}</strong>
                                                    <span>{formatDateBr(item.data_pedido)}</span>
                                                </div>
                                                <span
                                                    style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, maxWidth: '100%', justifyContent: 'center' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    <StatusBadge status={item.status || situacao} />
                                                    <select
                                                        value={item.status || situacao || 'Pendente'}
                                                        onChange={(e) => handleStatusChange(item.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        style={{
                                                            position: 'absolute', top: 0, left: 0,
                                                            width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="Rascunho">Rascunho</option>
                                                        <option value="Pendente">Pendente</option>
                                                        <option value="Pré-venda">Pré-venda</option>
                                                        <option value="Em análise">Em análise</option>
                                                        <option value="Aguardando pagamento">Aguardando pagamento</option>
                                                        <option value="Aguardando carregamento">Aguardando carregamento</option>
                                                        <option value="Aguardando entrega">Aguardando entrega</option>
                                                        <option value="Confirmado">Confirmado</option>
                                                        <option value="Entregue">Entregue</option>
                                                        <option value="Cancelado">Cancelado</option>
                                                    </select>
                                                </span>
                                            </div>

                                            <h3 className="admin-pedido-card-client">{item.cliente_nome || 'Cliente'}</h3>

                                            {(carregamentoIso || entregaHoje) ? (
                                                <div className="admin-pedido-card-alerts">
                                                    {carregamentoIso && situacao !== 'Cancelado' && situacao !== 'Entregue' ? (
                                                        <span className={`admin-pedido-card-alert ${carregamentoHoje ? 'is-load' : 'is-load-scheduled'}`}>
                                                            <i className="fas fa-boxes" aria-hidden="true" />
                                                            {carregamentoHoje
                                                                ? 'Carregamento hoje'
                                                                : `Carregamento ${formatDateBr(carregamentoIso)}`}
                                                        </span>
                                                    ) : null}
                                                    {entregaHoje ? (
                                                        <span className="admin-pedido-card-alert is-delivery">
                                                            <i className="fas fa-truck" aria-hidden="true" />
                                                            Entrega hoje
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}

                                            <div className="admin-pedido-card-meta">
                                                <span className="admin-pedido-card-address" title={formatEnderecoEntrega(item)}>
                                                    <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                                    {formatEnderecoEntrega(item)}
                                                </span>
                                                <span>
                                                    <i className="fas fa-truck" aria-hidden="true" />
                                                    {formatTipoEntrega(item)}
                                                </span>
                                                {carregamentoIso ? (
                                                    <span className={carregamentoHoje ? 'is-emphasis' : ''}>
                                                        <i className="fas fa-boxes" aria-hidden="true" />
                                                        {carregamentoHoje
                                                            ? `Carregamento hoje · ${formatDateBr(carregamentoIso)}`
                                                            : `Carregamento ${formatDateBr(carregamentoIso)}`}
                                                    </span>
                                                ) : null}
                                                {entregaIso ? (
                                                    <span className={entregaHoje ? 'is-emphasis' : ''}>
                                                        <i className="fas fa-calendar-check" aria-hidden="true" />
                                                        Entrega {formatDateBr(entregaIso)}
                                                    </span>
                                                ) : null}
                                                <span>
                                                    <i className="fas fa-credit-card" aria-hidden="true" />
                                                    {item.pagamentos_resumo || item.forma_pagamento || 'Pagamento pendente'}
                                                </span>
                                                {item.representante_nome ? (
                                                    <span className="is-emphasis">
                                                        <i className="fas fa-user-tie" aria-hidden="true" />
                                                        Rep: {item.representante_nome}
                                                    </span>
                                                ) : null}
                                            </div>

                                            {(situacao === 'Cancelado' || item.status === 'Cancelado') ? (
                                                <div className="admin-pedido-card-motivo">
                                                    <i className="fas fa-ban" aria-hidden="true" />
                                                    <span>
                                                        <strong>Motivo:</strong>
                                                        {' '}
                                                        {String(item.motivo_cancelamento || '').trim() || 'Não informado'}
                                                    </span>
                                                </div>
                                            ) : null}

                                            <div className="admin-pedido-card-footer">
                                                <div>
                                                    <small>Total</small>
                                                    <strong>{formatCurrency(item.total)}</strong>
                                                </div>
                                                <span
                                                    style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, maxWidth: '100%', justifyContent: 'flex-end' }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    onMouseDown={(e) => e.stopPropagation()}
                                                    onKeyDown={(e) => e.stopPropagation()}
                                                >
                                                    {pagamentoAnulado ? (
                                                        <span className="admin-pedido-card-flag is-danger">
                                                            Pagamento anulado
                                                        </span>
                                                    ) : pagamentoAtrasado ? (
                                                        <span className="admin-pedido-card-flag is-danger is-blink">
                                                            Pagamento em atraso
                                                        </span>
                                                    ) : pagamentoPendente ? (
                                                        <span className="admin-pedido-card-flag is-pay is-blink">
                                                            Pagamento pendente
                                                        </span>
                                                    ) : (
                                                        <span className="admin-pedido-card-flag is-success">
                                                            Pagamento confirmado
                                                        </span>
                                                    )}
                                                    
                                                    <select
                                                        value={pagamentoAnulado ? 'Anulado' : (pagamentoPendente || pagamentoAtrasado) ? 'Pendente' : 'Pago'}
                                                        onChange={(e) => handlePaymentStatusChange(item.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        onMouseDown={(e) => e.stopPropagation()}
                                                        style={{
                                                            position: 'absolute', top: 0, left: 0,
                                                            width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                                                        }}
                                                    >
                                                        <option value="Pendente">Marcar como Pendente</option>
                                                        <option value="Pago">Marcar como Pago</option>
                                                        <option value="Anulado">Anular Pagamento</option>
                                                    </select>
                                                </span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                            <p className="admin-table-footer mt-3 mb-0">
                                Exibindo: <strong>{filtered.length}</strong>
                                {' '}
                                de
                                {' '}
                                <strong>{pedidos.length}</strong>
                            </p>
                        </>
                    ) : null}
                </div>
            </section>

            <Modal
                show={cancelModal.open}
                onHide={() => setCancelModal({ open: false, pedidoId: null, numero: '', motivo: '' })}
                centered
                backdrop="static"
                className="admin-delete-confirm-modal"
            >
                <Modal.Header className="admin-delete-confirm-header">
                    <Modal.Title>
                        <i className="fas fa-ban me-2" aria-hidden="true" />
                        Cancelar pedido {cancelModal.numero}
                    </Modal.Title>
                    <AdminModalClose onClick={() => setCancelModal({ open: false, pedidoId: null, numero: '', motivo: '' })} />
                </Modal.Header>
                <Modal.Body className="admin-delete-confirm-body">
                    <p>
                        Informe o motivo do cancelamento de{' '}
                        <strong>{cancelModal.numero}</strong>.
                    </p>
                    <p className="admin-delete-confirm-note">
                        Esta justificativa é obrigatória e ficará registrada na auditoria.
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
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setCancelModal({ open: false, pedidoId: null, numero: '', motivo: '' })}
                    >
                        Voltar
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={handleConfirmCancel}
                        disabled={!cancelModal.motivo.trim()}
                    >
                        Confirmar cancelamento
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
