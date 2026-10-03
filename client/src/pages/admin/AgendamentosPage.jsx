import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminDateField, { AdminDateFieldProvider } from '../../components/admin/AdminDateField';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchPedidos } from '../../api/pedidos';
import { showToast } from '../../utils/toast';

function toIsoDate(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function addDays(isoDate, amount) {
    const [y, m, d] = String(isoDate).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + amount);
    return toIsoDate(date);
}

function formatDateBr(value) {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return String(value);
    const [y, m, d] = raw.split('-');
    return `${d}/${m}/${y}`;
}

function formatWeekday(isoDate) {
    const [y, m, d] = String(isoDate).split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCidadeEntrega(item) {
    const cidade = String(item.cidade_entrega || '').trim();
    const uf = String(item.uf_entrega || '').trim().toUpperCase();
    if (!cidade && !uf) return 'Cidade não informada';
    return [cidade, uf].filter(Boolean).join(' / ');
}

function statusTone(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'entregue') return 'success';
    if (
        normalized === 'aguardando entrega'
        || normalized === 'aguardando carregamento'
        || normalized === 'confirmado'
    ) {
        return 'info';
    }
    if (normalized === 'aguardando pagamento' || normalized === 'pendente' || normalized === 'rascunho') {
        return 'warning';
    }
    if (normalized === 'pagamento em atraso' || normalized === 'cancelado') return 'danger';
    return 'warning';
}

function buildWeekDays(centerIso) {
    return Array.from({ length: 7 }, (_, index) => {
        const iso = addDays(centerIso, index - 3);
        const [y, m, d] = iso.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return {
            iso,
            day: String(d).padStart(2, '0'),
            weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        };
    });
}

function resolveTipoEntrega(item) {
    const raw = String(item.tipo_entrega || '').toLowerCase();
    if (['frota', 'retirada', 'externo', 'a_definir'].includes(raw)) return raw;
    return item.veiculo_id ? 'frota' : 'a_definir';
}

function tipoEntregaMeta(item) {
    const tipo = resolveTipoEntrega(item);
    const map = {
        frota: { key: 'frota', label: 'Frota própria', icon: 'fa-truck' },
        retirada: { key: 'retirada', label: 'Retirada', icon: 'fa-store' },
        externo: { key: 'externo', label: 'Transporte externo', icon: 'fa-shipping-fast' },
        a_definir: { key: 'alerta', label: 'Sem definição', icon: 'fa-question-circle' },
    };
    return map[tipo] || map.a_definir;
}

const TIPO_FILTERS = [
    { key: 'todos', label: 'Todos', tone: 'neutral' },
    { key: 'frota', label: 'Frota própria', tone: 'frota' },
    { key: 'retirada', label: 'Retirada', tone: 'retirada' },
    { key: 'externo', label: 'Transporte externo', tone: 'externo' },
    { key: 'a_definir', label: 'Sem definição', tone: 'alerta' },
];

const MOVIMENTO_FILTERS = [
    { key: 'todos', label: 'Todos movimentos', tone: 'neutral' },
    { key: 'carregamento', label: 'Carregamento', tone: 'await-load' },
    { key: 'entrega', label: 'Entrega', tone: 'await-delivery' },
];

function toDateKey(value) {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return '';
}

function buildAgendaGroup(item) {
    const tipo = resolveTipoEntrega(item);

    if (tipo === 'retirada') {
        return {
            key: 'retirada',
            label: 'Retirada pelo cliente',
            icon: 'fa-store',
            tone: 'retirada',
            sort: 20,
        };
    }

    if (tipo === 'externo') {
        return {
            key: 'externo',
            label: 'Transporte externo',
            icon: 'fa-shipping-fast',
            tone: 'externo',
            sort: 30,
        };
    }

    if (tipo === 'frota' && item.veiculo_id) {
        return {
            key: `v-${item.veiculo_id}`,
            label: item.veiculo_placa
                ? `${item.veiculo_placa}${item.veiculo_motorista ? ` · ${item.veiculo_motorista}` : ''}`
                : `Veículo #${item.veiculo_id}`,
            icon: 'fa-truck',
            tone: 'frota',
            sort: 10,
        };
    }

    if (tipo === 'frota') {
        return {
            key: 'frota-sem-veiculo',
            label: 'Frota · veículo a definir',
            icon: 'fa-truck',
            tone: 'alerta',
            sort: 15,
        };
    }

    return {
        key: 'a-definir',
        label: 'Sem transporte definido',
        icon: 'fa-exclamation-circle',
        tone: 'alerta',
        sort: 40,
    };
}

export default function AgendamentosPage() {
    const navigate = useNavigate();
    const todayIso = toIsoDate(new Date());
    const [selectedDate, setSelectedDate] = useState(todayIso);
    const [pedidos, setPedidos] = useState([]);
    const [weekCounts, setWeekCounts] = useState({});
    const [loading, setLoading] = useState(true);
    const [tipoFilter, setTipoFilter] = useState('todos');
    const [movimentoFilter, setMovimentoFilter] = useState('todos');

    const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);

    const loadDay = useCallback(async (isoDate) => {
        setLoading(true);
        try {
            const data = await fetchPedidos({
                data: isoDate,
                somente_ativos: 1,
            });
            setPedidos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar agendamentos.');
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadWeekCounts = useCallback(async (centerIso) => {
        try {
            const de = addDays(centerIso, -3);
            const ate = addDays(centerIso, 3);
            const data = await fetchPedidos({ de, ate, somente_ativos: 1, incluir_carregamento: 1 });
            const next = {};
            (Array.isArray(data) ? data : []).forEach((item) => {
                const entrega = String(item.data_entrega || '').slice(0, 10);
                const carregamento = String(item.data_carregamento || '').slice(0, 10);
                if (entrega) next[entrega] = (next[entrega] || 0) + 1;
                if (carregamento && carregamento !== entrega) {
                    next[carregamento] = (next[carregamento] || 0) + 1;
                }
            });
            setWeekCounts(next);
        } catch (_error) {
            setWeekCounts({});
        }
    }, []);

    useEffect(() => {
        loadDay(selectedDate);
        loadWeekCounts(selectedDate);
    }, [selectedDate, loadDay, loadWeekCounts]);

    const tipoCounts = useMemo(() => {
        const next = {
            todos: pedidos.length,
            frota: 0,
            retirada: 0,
            externo: 0,
            a_definir: 0,
        };
        pedidos.forEach((item) => {
            const tipo = resolveTipoEntrega(item);
            if (next[tipo] != null) next[tipo] += 1;
        });
        return next;
    }, [pedidos]);

    const movimentoCounts = useMemo(() => {
        const next = { todos: pedidos.length, carregamento: 0, entrega: 0 };
        pedidos.forEach((item) => {
            const carregamento = toDateKey(item.data_carregamento);
            const entrega = toDateKey(item.data_entrega);
            if (carregamento === selectedDate) next.carregamento += 1;
            if (entrega === selectedDate) next.entrega += 1;
        });
        return next;
    }, [pedidos, selectedDate]);

    const filteredPedidos = useMemo(() => {
        return pedidos.filter((item) => {
            if (tipoFilter !== 'todos' && resolveTipoEntrega(item) !== tipoFilter) return false;
            const carregamento = toDateKey(item.data_carregamento);
            const entrega = toDateKey(item.data_entrega);
            if (movimentoFilter === 'carregamento') return carregamento === selectedDate;
            if (movimentoFilter === 'entrega') return entrega === selectedDate;
            return true;
        });
    }, [pedidos, tipoFilter, movimentoFilter, selectedDate]);

    const groups = useMemo(() => {
        const map = new Map();
        const sorted = [...filteredPedidos].sort((a, b) => {
            const aLoad = toDateKey(a.data_carregamento) === selectedDate ? 0 : 1;
            const bLoad = toDateKey(b.data_carregamento) === selectedDate ? 0 : 1;
            if (aLoad !== bLoad) return aLoad - bLoad;
            return String(a.numero || '').localeCompare(String(b.numero || ''), 'pt-BR');
        });
        sorted.forEach((item) => {
            const meta = buildAgendaGroup(item);
            if (!map.has(meta.key)) {
                map.set(meta.key, { ...meta, itens: [] });
            }
            map.get(meta.key).itens.push(item);
        });
        return Array.from(map.values()).sort((a, b) => (
            a.sort - b.sort || a.label.localeCompare(b.label, 'pt-BR')
        ));
    }, [filteredPedidos, selectedDate]);

    const summary = useMemo(() => {
        let frota = 0;
        let foraFrota = 0;
        let aDefinir = 0;

        filteredPedidos.forEach((item) => {
            const tipo = resolveTipoEntrega(item);
            if (tipo === 'frota') frota += 1;
            else if (tipo === 'a_definir') aDefinir += 1;
            else foraFrota += 1;
        });

        return {
            total: filteredPedidos.length,
            frota,
            foraFrota,
            aDefinir,
            totalValor: filteredPedidos.reduce((acc, item) => acc + (Number(item.total) || 0), 0),
        };
    }, [filteredPedidos]);

    const openPedido = (id) => {
        navigate(`/pedidos/${id}/editar`);
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-agenda-fill">
                <section className="admin-panel-card admin-page-card admin-agenda-page">
                    <div className="admin-agenda-top">
                        <AdminPageHeader
                            title="Agendamentos"
                            icon="fa-calendar-alt"
                            actionLabel="Novo Pedido"
                            actionIcon="fa-plus"
                            onAction={() => navigate('/pedidos/novo')}
                        />

                        <div className="admin-agenda-toolbar">
                            <div className="admin-agenda-nav">
                                <button
                                    type="button"
                                    className="admin-agenda-nav-btn"
                                    onClick={() => setSelectedDate((current) => addDays(current, -1))}
                                    aria-label="Dia anterior"
                                >
                                    <i className="fas fa-chevron-left" aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    className="admin-agenda-nav-btn is-today"
                                    onClick={() => setSelectedDate(todayIso)}
                                >
                                    Hoje
                                </button>
                                <button
                                    type="button"
                                    className="admin-agenda-nav-btn"
                                    onClick={() => setSelectedDate((current) => addDays(current, 1))}
                                    aria-label="Próximo dia"
                                >
                                    <i className="fas fa-chevron-right" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="admin-agenda-date-block">
                                <strong>{formatDateBr(selectedDate)}</strong>
                                <span>{formatWeekday(selectedDate)}</span>
                            </div>

                            <div className="admin-agenda-pick admin-funcionario-form">
                                <AdminDateField
                                    label="Data"
                                    name="agenda_data"
                                    value={selectedDate}
                                    onChange={(event) => {
                                        if (event.target.value) setSelectedDate(event.target.value);
                                    }}
                                />
                            </div>
                        </div>

                        <div className="admin-agenda-week" role="tablist" aria-label="Dias da semana">
                            {weekDays.map((day) => {
                                const count = weekCounts[day.iso] || 0;
                                const isSelected = day.iso === selectedDate;
                                const isToday = day.iso === todayIso;
                                return (
                                    <button
                                        key={day.iso}
                                        type="button"
                                        role="tab"
                                        aria-selected={isSelected}
                                        className={`admin-agenda-day${isSelected ? ' is-active' : ''}${isToday ? ' is-today' : ''}`}
                                        onClick={() => setSelectedDate(day.iso)}
                                    >
                                        <small>{day.weekday}</small>
                                        <strong>{day.day}</strong>
                                        <em>{count}</em>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="admin-agenda-filters is-single-line" role="tablist" aria-label="Filtrar movimentos e tipo">
                            {MOVIMENTO_FILTERS.map((item) => (
                                <button
                                    key={`mov-${item.key}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={movimentoFilter === item.key}
                                    className={`admin-chip is-${item.tone}${movimentoFilter === item.key ? ' is-active' : ''}`}
                                    onClick={() => setMovimentoFilter(item.key)}
                                >
                                    {item.key === 'carregamento' && selectedDate === todayIso
                                        ? 'Carregamento hoje'
                                        : item.label}
                                    <em>{movimentoCounts[item.key] ?? 0}</em>
                                </button>
                            ))}
                            <span className="admin-agenda-filters-sep" aria-hidden="true" />
                            {TIPO_FILTERS.map((item) => (
                                <button
                                    key={`tipo-${item.key}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={tipoFilter === item.key}
                                    className={`admin-chip is-${item.tone}${tipoFilter === item.key ? ' is-active' : ''}`}
                                    onClick={() => setTipoFilter(item.key)}
                                >
                                    {item.label}
                                    <em>{tipoCounts[item.key] ?? 0}</em>
                                </button>
                            ))}
                        </div>

                        <div className="admin-agenda-summary">
                            <article className="is-total">
                                <small>Movimentos do dia</small>
                                <strong>{summary.total}</strong>
                            </article>
                            <article className="is-frota">
                                <small>Frota própria</small>
                                <strong>{summary.frota}</strong>
                            </article>
                            <article className="is-fora">
                                <small>Fora da frota</small>
                                <strong>{summary.foraFrota}</strong>
                            </article>
                            <article className="is-alerta">
                                <small>Sem definição</small>
                                <strong>{summary.aDefinir}</strong>
                            </article>
                        </div>

                        {summary.total > 0 ? (
                            <p className="admin-agenda-total-hint">
                                Total do dia: <strong>{formatCurrency(summary.totalValor)}</strong>
                            </p>
                        ) : null}
                    </div>

                    <div className="admin-agenda-scroll">
                        {loading ? <p className="text-muted mb-0 mt-1">Carregando agendamentos...</p> : null}

                        {!loading && pedidos.length === 0 ? (
                            <div className="admin-agenda-empty">
                                <i className="fas fa-calendar-day" aria-hidden="true" />
                                <p>Nenhum carregamento ou entrega para {formatDateBr(selectedDate)}.</p>
                                <button
                                    type="button"
                                    className="admin-config-btn is-primary"
                                    onClick={() => navigate('/pedidos/novo')}
                                >
                                    Criar pedido
                                </button>
                            </div>
                        ) : null}

                        {!loading && pedidos.length > 0 && filteredPedidos.length === 0 ? (
                            <div className="admin-agenda-empty">
                                <i className="fas fa-filter" aria-hidden="true" />
                                <p>Nenhum agendamento neste tipo de entrega.</p>
                            </div>
                        ) : null}

                        {!loading && groups.length > 0 ? (
                            <div className="admin-agenda-groups">
                                {groups.map((group) => (
                                    <section className={`admin-agenda-group is-${group.tone}`} key={group.key}>
                                        <header className="admin-agenda-group-head">
                                            <div>
                                                <i className={`fas ${group.icon}`} aria-hidden="true" />
                                                <h3>{group.label}</h3>
                                            </div>
                                            <span>{group.itens.length}</span>
                                        </header>

                                        <div className="admin-agenda-list">
                                            {group.itens.map((item) => {
                                                const tone = statusTone(item.situacao || item.status);
                                                const tipoMeta = tipoEntregaMeta(item);
                                                const endereco = [
                                                    String(item.endereco_entrega || '').trim(),
                                                    formatCidadeEntrega(item),
                                                ].filter((part) => part && part !== 'Cidade não informada').join(' · ')
                                                    || formatCidadeEntrega(item);
                                                const carregamentoIso = toDateKey(item.data_carregamento);
                                                const entregaIso = toDateKey(item.data_entrega);
                                                const isCarregamentoDia = carregamentoIso === selectedDate;
                                                const isEntregaDia = entregaIso === selectedDate;
                                                const isHoje = selectedDate === todayIso;
                                                const carregamentoLabel = isHoje
                                                    ? 'Carregamento hoje'
                                                    : `Carregamento ${formatDateBr(carregamentoIso)}`;
                                                const entregaLabel = isHoje
                                                    ? 'Entrega hoje'
                                                    : `Entrega ${formatDateBr(entregaIso)}`;

                                                return (
                                                    <article
                                                        key={item.id}
                                                        className={`admin-agenda-card is-${tone} is-tipo-${tipoMeta.key}${isCarregamentoDia ? ' has-load' : ''}${isEntregaDia ? ' has-delivery' : ''}${isCarregamentoDia && isHoje ? ' is-load-today' : ''}`}
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
                                                        <div className="admin-agenda-card-top">
                                                            <strong className="admin-agenda-card-num">
                                                                {item.numero || `PED-${String(item.id).padStart(5, '0')}`}
                                                            </strong>
                                                            <StatusBadge status={item.situacao || item.status} />
                                                        </div>

                                                        <p className="admin-agenda-card-client">
                                                            <i className="fas fa-user" aria-hidden="true" />
                                                            <span>{item.cliente_nome || 'Cliente'}</span>
                                                        </p>

                                                        <div className="admin-agenda-card-flags">
                                                            {isCarregamentoDia ? (
                                                                <span className={`admin-agenda-flag ${isHoje ? 'is-load' : 'is-load-scheduled'}`}>
                                                                    <i className="fas fa-boxes" aria-hidden="true" />
                                                                    {carregamentoLabel}
                                                                </span>
                                                            ) : null}
                                                            {isEntregaDia ? (
                                                                <span className="admin-agenda-flag is-delivery">
                                                                    <i className="fas fa-truck" aria-hidden="true" />
                                                                    {entregaLabel}
                                                                </span>
                                                            ) : null}
                                                        </div>

                                                        <div className="admin-agenda-card-meta">
                                                            <span className={`admin-agenda-tipo-pill is-${tipoMeta.key}`}>
                                                                <i className={`fas ${tipoMeta.icon}`} aria-hidden="true" />
                                                                {tipoMeta.label}
                                                            </span>
                                                            <strong className="admin-agenda-card-value">
                                                                {formatCurrency(item.total)}
                                                            </strong>
                                                        </div>

                                                        <p className="admin-agenda-card-city" title={endereco}>
                                                            <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                                            <span>{endereco}</span>
                                                        </p>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </AdminDateFieldProvider>
    );
}
