import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { AdminDateFieldProvider, AdminDateRangeField } from '../../components/admin/AdminDateField';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchDashboardOverview } from '../../api/dashboard';
import { showToast } from '../../utils/toast';

const PERIOD_DAYS = [30, 45, 60, 90];
const PRODUCT_COLORS = ['#5B9BD5', '#ED7D31', '#A5A5A5', '#70AD47', '#4472C4'];

function toIso(d) {
    return d.toISOString().slice(0, 10);
}

function todayIso() {
    return toIso(new Date());
}

function daysAgoIso(days) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return toIso(d);
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatShortDay(iso) {
    if (!iso) return '';
    const raw = String(iso).slice(0, 10);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    return `${match[3]}/${match[2]}`;
}

function tipoEntregaLabel(value) {
    const map = {
        frota: 'Frota',
        retirada: 'Retirada',
        externo: 'Externo',
        a_definir: 'A definir',
    };
    return map[value] || value || 'A definir';
}

function diffDaysInclusive(inicio, fim) {
    const a = new Date(`${inicio}T12:00:00`);
    const b = new Date(`${fim}T12:00:00`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
    return Math.round((b - a) / 86400000) + 1;
}

function KpiCard({ tone, icon, label, value, hint, to }) {
    const content = (
        <>
            <div className="admin-dash-kpi-icon">
                <i className={`fas ${icon}`} aria-hidden="true" />
            </div>
            <div className="admin-dash-kpi-body">
                <span>{label}</span>
                <strong>{value}</strong>
                {hint ? <small>{hint}</small> : null}
            </div>
        </>
    );

    if (to) {
        return (
            <Link to={to} className="admin-dash-kpi" data-tone={tone}>
                {content}
            </Link>
        );
    }

    return (
        <article className="admin-dash-kpi" data-tone={tone}>
            {content}
        </article>
    );
}

function ChartTooltip({ active, payload, label, money = false }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="admin-dash-tooltip">
            <strong>{label}</strong>
            {payload.map((item) => (
                <span key={item.dataKey} style={{ color: item.color || undefined }}>
                    {item.name}: {money ? formatMoney(item.value) : item.value}
                </span>
            ))}
        </div>
    );
}

function LucroTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload || {};
    return (
        <div className="admin-dash-tooltip">
            <strong>{label}</strong>
            <span style={{ color: '#1a7a3f' }}>Recebido: {formatMoney(row.recebido)}</span>
            <span style={{ color: '#b45309' }}>Pago: {formatMoney(row.pago)}</span>
            <span style={{ color: Number(row.lucro) >= 0 ? '#1a7a3f' : '#9b1c1c' }}>
                Lucro: {formatMoney(row.lucro)}
            </span>
        </div>
    );
}

export default function DashboardPage() {
    const navigate = useNavigate();
    const defaults = useMemo(() => ({
        inicio: daysAgoIso(30),
        fim: todayIso(),
    }), []);
    const [inicio, setInicio] = useState(defaults.inicio);
    const [fim, setFim] = useState(defaults.fim);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const activePeriod = useMemo(() => {
        if (fim !== todayIso()) return null;
        const days = diffDaysInclusive(inicio, fim);
        return PERIOD_DAYS.includes(days) ? days : null;
    }, [inicio, fim]);

    const setPeriodDays = (days) => {
        setInicio(daysAgoIso(days));
        setFim(todayIso());
    };

    useEffect(() => {
        let active = true;
        setLoading(true);
        fetchDashboardOverview({ inicio, fim })
            .then((payload) => {
                if (active) setData(payload);
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar o dashboard.'))
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => { active = false; };
    }, [inicio, fim]);

    const openRelatorio = (reportId) => {
        navigate(`/relatorios/${reportId}`);
    };

    const kpis = data?.kpis || {};
    const lucroTone = Number(kpis.lucro_realizado || 0) >= 0 ? 'profit' : 'loss';
    const topProdutos = data?.top_produtos || [];
    const agenda = data?.agenda_hoje || [];

    const vendasSerie = useMemo(
        () => (data?.vendas_serie || []).map((row) => ({
            ...row,
            label: formatShortDay(row.dia),
        })),
        [data]
    );

    const lucroSerie = useMemo(
        () => (data?.lucro_serie || []).map((row) => ({
            ...row,
            label: formatShortDay(row.dia),
        })),
        [data]
    );

    const produtosSerie = useMemo(
        () => (data?.produtos_serie || []).map((row) => ({
            ...row,
            label: formatShortDay(row.dia),
        })),
        [data]
    );

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card admin-dash-page">
                <AdminDateFieldProvider>
                    <AdminPageHeader
                        title="Dashboard"
                        icon="fa-tachometer-alt"
                        actions={(
                            <div className="admin-dash-header-filters">
                                <AdminDateRangeField
                                    label="Período"
                                    name="dash_periodo"
                                    inicio={inicio}
                                    fim={fim}
                                    onChange={({ inicio: nextInicio, fim: nextFim }) => {
                                        setInicio(nextInicio);
                                        setFim(nextFim);
                                    }}
                                />
                            </div>
                        )}
                    />
                </AdminDateFieldProvider>

                <div className="admin-dash-kpi-scroll">
                        <KpiCard
                            tone="profit"
                            icon="fa-chart-line"
                            label="Lucro realizado"
                            value={loading ? '—' : formatMoney(kpis.lucro_realizado)}
                            hint="Recebido − pago no período"
                            to="/financeiro"
                        />
                        <KpiCard
                            tone="forecast"
                            icon="fa-balance-scale"
                            label="Lucro previsto"
                            value={loading ? '—' : formatMoney(kpis.lucro_previsto)}
                            hint="A receber − a pagar"
                            to="/financeiro"
                        />
                        <KpiCard
                            tone="receive"
                            icon="fa-hand-holding-usd"
                            label="A receber"
                            value={loading ? '—' : formatMoney(kpis.a_receber)}
                            hint={`${kpis.a_receber_qtd || 0} em aberto`}
                            to="/financeiro?tab=receber"
                        />
                        <KpiCard
                            tone="pay"
                            icon="fa-file-invoice-dollar"
                            label="A pagar"
                            value={loading ? '—' : formatMoney(kpis.a_pagar)}
                            hint={`${kpis.a_pagar_qtd || 0} em aberto`}
                            to="/financeiro?tab=pagar"
                        />
                        <KpiCard
                            tone="in"
                            icon="fa-shopping-bag"
                            label="Vendas no período"
                            value={loading ? '—' : formatMoney(kpis.vendas_periodo_total)}
                            hint={`${kpis.vendas_periodo_qtd || 0} pedido(s)`}
                            to="/pedidos"
                        />
                        <KpiCard
                            tone="out"
                            icon="fa-calendar-alt"
                            label="Vendas mês passado"
                            value={loading ? '—' : formatMoney(kpis.vendas_mes_passado_total)}
                            hint={`${kpis.vendas_mes_passado_qtd || 0} pedido(s)`}
                            to="/pedidos"
                        />
                        <KpiCard
                            tone="forecast"
                            icon="fa-truck"
                            label="Agenda hoje"
                            value={loading ? '—' : String(kpis.agenda_hoje_qtd || 0)}
                            hint="Carregamentos e entregas"
                            to="/agendamentos"
                        />
                </div>

                <section className="admin-dash-charts-grid">
                    <article className="admin-dash-chart-card">
                        <header>
                            <div>
                                <h2>Vendas diárias</h2>
                                <p>Total vendido por dia no período.</p>
                            </div>
                            <div className="admin-dash-chart-actions">
                                <div className="admin-dash-period" role="group" aria-label="Período rápido de vendas">
                                    {PERIOD_DAYS.map((days) => (
                                        <button
                                            key={days}
                                            type="button"
                                            className={`admin-dash-period-btn${activePeriod === days ? ' is-active' : ''}`}
                                            onClick={() => setPeriodDays(days)}
                                        >
                                            {days}d
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="admin-dash-link-btn"
                                    onClick={() => openRelatorio('vendas-mensal')}
                                >
                                    Ver relatório
                                </button>
                            </div>
                        </header>
                        <div className="admin-dash-chart">
                            {loading ? (
                                <p className="text-muted mb-0">Carregando gráfico...</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart
                                        data={vendasSerie}
                                        margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                                        barCategoryGap="22%"
                                    >
                                        <defs>
                                            <linearGradient id="dashVendasPeriodo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#c62828" stopOpacity={1} />
                                                <stop offset="100%" stopColor="#9b1c1c" stopOpacity={1} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,18,16,0.08)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }}
                                            width={48}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                                        />
                                        <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(155,28,28,0.06)' }} />
                                        <Bar dataKey="total" name="Vendas" fill="url(#dashVendasPeriodo)" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </article>

                    <article className="admin-dash-chart-card">
                        <header>
                            <div>
                                <h2>Lucro diário</h2>
                                <p>Recebido menos pago por dia (barras).</p>
                            </div>
                            <div className="admin-dash-chart-actions">
                                <span className={`admin-dash-chip is-${lucroTone}`}>
                                    Período: {loading ? '—' : formatMoney(kpis.lucro_realizado)}
                                </span>
                                <button
                                    type="button"
                                    className="admin-dash-link-btn"
                                    onClick={() => openRelatorio('lucros-periodo')}
                                >
                                    Ver relatório
                                </button>
                            </div>
                        </header>
                        <div className="admin-dash-chart">
                            {loading ? (
                                <p className="text-muted mb-0">Carregando gráfico...</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart
                                        data={lucroSerie}
                                        margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                                        barCategoryGap="22%"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,18,16,0.08)" vertical={false} />
                                        <XAxis
                                            dataKey="label"
                                            tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }}
                                            interval="preserveStartEnd"
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }}
                                            width={48}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                                        />
                                        <Tooltip content={<LucroTooltip />} cursor={{ fill: 'rgba(26,18,16,0.04)' }} />
                                        <Bar dataKey="lucro" name="Lucro" radius={[4, 4, 0, 0]} maxBarSize={28}>
                                            {lucroSerie.map((row, index) => (
                                                <Cell
                                                    key={`lucro-${row.dia || index}`}
                                                    fill={Number(row.lucro) >= 0 ? '#1a7a3f' : '#9b1c1c'}
                                                />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </article>
                </section>

                <section className="admin-dash-bottom-grid">
                    <article className="admin-dash-chart-card admin-dash-chart-card--produtos">
                        <header>
                            <div>
                                <h2>Produtos mais vendidos</h2>
                                <p>Quantidade diária dos top produtos.</p>
                            </div>
                            <div className="admin-dash-chart-actions">
                                <div className="admin-dash-period" role="group" aria-label="Período rápido de produtos">
                                    {PERIOD_DAYS.map((days) => (
                                        <button
                                            key={days}
                                            type="button"
                                            className={`admin-dash-period-btn${activePeriod === days ? ' is-active' : ''}`}
                                            onClick={() => setPeriodDays(days)}
                                        >
                                            {days}d
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="admin-dash-link-btn"
                                    onClick={() => openRelatorio('top-produtos')}
                                >
                                    Ver relatório
                                </button>
                            </div>
                        </header>
                        <div className="admin-dash-chart admin-dash-chart--produtos">
                            {loading ? (
                                <p className="text-muted mb-0">Carregando...</p>
                            ) : topProdutos.length === 0 ? (
                                <p className="text-muted mb-0">Sem vendas no período.</p>
                            ) : (
                                <>
                                    <div className="admin-dash-chart-canvas">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={produtosSerie} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                                                <CartesianGrid stroke="rgba(26,18,16,0.1)" vertical={false} />
                                                <XAxis
                                                    dataKey="label"
                                                    tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }}
                                                    interval="preserveStartEnd"
                                                    tickLine={false}
                                                    axisLine={false}
                                                />
                                                <YAxis
                                                    tick={{ fontSize: 11, fill: 'rgba(26,18,16,0.55)' }}
                                                    width={40}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                                                />
                                                <Tooltip content={<ChartTooltip />} />
                                                {topProdutos.slice(0, 5).map((product, index) => {
                                                    const color = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
                                                    return (
                                                        <Line
                                                            key={product.key}
                                                            type="linear"
                                                            dataKey={product.key}
                                                            name={product.key}
                                                            stroke={color}
                                                            strokeWidth={2}
                                                            dot={false}
                                                            activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                                                        />
                                                    );
                                                })}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <ul className="admin-dash-line-legend">
                                        {topProdutos.slice(0, 5).map((product, index) => (
                                            <li key={product.key}>
                                                <i style={{ background: PRODUCT_COLORS[index % PRODUCT_COLORS.length] }} aria-hidden="true" />
                                                {product.nome || product.key}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    </article>

                    <article className="admin-dash-agenda-card">
                        <header>
                            <div>
                                <h2>Agendamentos de hoje</h2>
                                <p>{loading ? '—' : `${agenda.length} movimento(s) do dia`}</p>
                            </div>
                            <Link to="/agendamentos">Abrir agenda</Link>
                        </header>

                        {loading ? (
                            <p className="text-muted mb-0">Carregando agenda...</p>
                        ) : agenda.length === 0 ? (
                            <div className="admin-dash-empty">
                                <i className="fas fa-calendar-check" aria-hidden="true" style={{ marginRight: '8px' }} />
                                <span>Nenhum carregamento ou entrega para hoje.</span>
                            </div>
                        ) : (
                            <ul className="admin-dash-agenda-list">
                                {agenda.map((item) => {
                                    const tipo = item.tipo_entrega || 'a_definir';
                                    const endereco = [item.endereco_entrega, item.cidade_entrega]
                                        .map((part) => String(part || '').trim())
                                        .filter(Boolean)
                                        .join(' · ') || 'Sem endereço';
                                    return (
                                        <li key={item.id}>
                                            <Link
                                                to={`/pedidos/${item.id}/editar`}
                                                className={`admin-dash-agenda-item is-${tipo}${item.is_carregamento_hoje ? ' has-load' : ''}${item.is_entrega_hoje ? ' has-delivery' : ''}`}
                                            >
                                                <div className="admin-dash-agenda-top">
                                                    <strong className="admin-dash-agenda-num">
                                                        #{item.numero || item.id}
                                                    </strong>
                                                    <span className="admin-dash-agenda-client" title={item.cliente_nome || 'Cliente'}>
                                                        <i className="fas fa-user" aria-hidden="true" />
                                                        {item.cliente_nome || 'Cliente'}
                                                    </span>
                                                    <StatusBadge status={item.status || 'Pendente'} />
                                                </div>
                                                <div className="admin-dash-agenda-meta">
                                                    {item.is_carregamento_hoje ? (
                                                        <span className="admin-dash-agenda-flag is-load">
                                                            <i className="fas fa-boxes" aria-hidden="true" />
                                                            Carregamento
                                                        </span>
                                                    ) : null}
                                                    {item.is_entrega_hoje ? (
                                                        <span className="admin-dash-agenda-flag is-delivery">
                                                            <i className="fas fa-truck" aria-hidden="true" />
                                                            Entrega
                                                        </span>
                                                    ) : null}
                                                    <em className={`admin-dash-agenda-tipo is-${tipo}`}>
                                                        {tipoEntregaLabel(tipo)}
                                                    </em>
                                                    <span className="admin-dash-agenda-city" title={endereco}>
                                                        <i className="fas fa-map-marker-alt" aria-hidden="true" />
                                                        {endereco}
                                                    </span>
                                                    <strong className="admin-dash-agenda-value">
                                                        {formatMoney(item.total)}
                                                    </strong>
                                                </div>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </article>
                </section>
            </section>
        </div>
    );
}
