import { useEffect, useMemo, useState } from 'react';
import { Button, Table } from 'react-bootstrap';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import AdminDateField, { AdminDateFieldProvider } from '../../components/admin/AdminDateField';
import AdminFloatField from '../../components/admin/AdminFloatField';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminSearchSelect from '../../components/admin/AdminSearchSelect';
import { fetchClientes } from '../../api/clientes';
import { fetchEmployees } from '../../api/funcionarios';
import { fetchFornecedores } from '../../api/fornecedores';
import { fetchProdutos } from '../../api/produtos';
import { fetchRelatorio, fetchRelatoriosCatalogo } from '../../api/relatorios';
import { showToast } from '../../utils/toast';

const LOGO_URL = `/image/Logotipos/${encodeURIComponent('Logótipo Cerâmica Vicente Portela.png')}`;
const WATERMARK_URL = '/image/Logotipos/ico.png';
const PIE_COLORS = ['#9b1c1c', '#b45309', '#1a7a3f', '#0f766e', '#7c3aed', '#1d4ed8', '#be123c', '#854d0e'];

function monthBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const month = reference.getMonth();
    const toIso = (d) => d.toISOString().slice(0, 10);
    return {
        inicio: toIso(new Date(year, month, 1)),
        fim: toIso(new Date(year, month + 1, 0)),
    };
}

function yearBounds(reference = new Date()) {
    const year = reference.getFullYear();
    const toIso = (d) => d.toISOString().slice(0, 10);
    return {
        inicio: toIso(new Date(year, 0, 1)),
        fim: toIso(new Date(year, 11, 31)),
    };
}

function periodForReport(item, reference = new Date()) {
    if (item?.defaultPeriod === 'year') return yearBounds(reference);
    return monthBounds(reference);
}

function formatDate(value) {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMonthLabel(value) {
    const raw = String(value || '');
    const match = raw.match(/^(\d{4})-(\d{2})$/);
    if (!match) return raw;
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[Number(match[2]) - 1]}/${match[1].slice(2)}`;
}

function formatCell(value, type) {
    if (type === 'money') return formatMoney(value);
    if (type === 'date') return formatDate(value);
    if (value == null || value === '') return '—';
    return String(value);
}

function downloadCsv(filename, columns, rows) {
    const escape = (value) => {
        const text = String(value ?? '');
        if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
        return text;
    };
    const header = columns.map((col) => escape(col.label)).join(';');
    const body = rows.map((row) => columns.map((col) => {
        const raw = row[col.key];
        if (col.type === 'money') return escape(Number(raw || 0).toFixed(2).replace('.', ','));
        if (col.type === 'date') return escape(formatDate(raw));
        return escape(raw);
    }).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${header}\n${body}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function findLabel(options, value) {
    if (!value) return '';
    const found = options.find((item) => String(item.id) === String(value));
    return found?.label || '';
}

function MoneyTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="admin-dash-tooltip">
            <strong>{label}</strong>
            {payload.map((item) => (
                <span key={item.dataKey}>
                    {item.name}: {formatMoney(item.value)}
                </span>
            ))}
        </div>
    );
}

function RelatorioChart({ reportId, rows }) {
    const chartRows = Array.isArray(rows) ? rows : [];
    if (!chartRows.length) return null;

    if (reportId === 'vendas-mensal') {
        const data = chartRows.map((row) => ({
            ...row,
            label: formatMonthLabel(row.mes),
            total: Number(row.total || 0),
        }));
        return (
            <div className="admin-relatorios-chart">
                <h3>Vendas por mês</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="rgba(26,18,16,0.1)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            width={52}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                        />
                        <Tooltip content={<MoneyTooltip />} />
                        <Line
                            type="linear"
                            dataKey="total"
                            name="Total"
                            stroke="#9b1c1c"
                            strokeWidth={2.2}
                            dot={false}
                            activeDot={{ r: 4, fill: '#9b1c1c', strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (reportId === 'lucros-periodo') {
        const data = chartRows.map((row) => ({
            ...row,
            label: formatMonthLabel(row.mes),
            lucro: Number(row.lucro || 0),
            recebido: Number(row.recebido || 0),
            pago: Number(row.pago || 0),
        }));
        return (
            <div className="admin-relatorios-chart">
                <h3>Lucro mensal</h3>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="rgba(26,18,16,0.1)" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            width={52}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                        />
                        <Tooltip content={<MoneyTooltip />} />
                        <Line type="linear" dataKey="recebido" name="Recebido" stroke="#1d4ed8" strokeWidth={2} dot={false} />
                        <Line type="linear" dataKey="pago" name="Pago" stroke="#b45309" strokeWidth={2} dot={false} />
                        <Line type="linear" dataKey="lucro" name="Lucro" stroke="#1a7a3f" strokeWidth={2.2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }

    if (reportId === 'top-produtos') {
        const data = chartRows.slice(0, 8).map((row) => ({
            ...row,
            quantidade: Number(row.quantidade || 0),
            total: Number(row.total || 0),
        }));
        return (
            <div className="admin-relatorios-chart admin-relatorios-chart-pie">
                <h3>Participação por quantidade</h3>
                <div className="admin-relatorios-pie-layout">
                    <div className="admin-relatorios-pie-chart">
                        <ResponsiveContainer width="100%" height={170}>
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="quantidade"
                                    nameKey="nome"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={42}
                                    outerRadius={64}
                                    paddingAngle={2}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`${entry.nome}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, _name, item) => [
                                        `${value} un · ${formatMoney(item?.payload?.total)}`,
                                        item?.payload?.nome || 'Produto',
                                    ]}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <ul className="admin-relatorios-pie-legend">
                        {data.map((item, index) => (
                            <li key={`${item.nome}-${index}`}>
                                <span
                                    className="admin-dash-pie-swatch"
                                    style={{ background: PIE_COLORS[index % PIE_COLORS.length] }}
                                />
                                <div>
                                    <strong>{item.nome}</strong>
                                    <small>{item.quantidade} un · {formatMoney(item.total)}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    if (reportId === 'top-clientes') {
        const data = chartRows.slice(0, 8).map((row) => ({
            ...row,
            label: String(row.cliente_nome || 'Cliente').slice(0, 22),
            total: Number(row.total || 0),
        }));
        const chartHeight = Math.max(140, data.length * 28);
        return (
            <div className="admin-relatorios-chart admin-relatorios-chart--compact">
                <h3>Top clientes por valor</h3>
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,18,16,0.08)" horizontal={false} />
                        <XAxis
                            type="number"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => Number(v).toLocaleString('pt-BR', { notation: 'compact' })}
                        />
                        <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip content={<MoneyTooltip />} />
                        <Bar dataKey="total" name="Total" fill="#9b1c1c" radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }

    return null;
}

export default function RelatoriosPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { reportId: routeReportId } = useParams();
    const defaults = useMemo(() => monthBounds(), []);
    const [catalogo, setCatalogo] = useState([]);
    const [loadingCatalogo, setLoadingCatalogo] = useState(true);
    const [groupFilter, setGroupFilter] = useState('Todos');
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [inicio, setInicio] = useState(defaults.inicio);
    const [fim, setFim] = useState(defaults.fim);
    const [clienteId, setClienteId] = useState('');
    const [fornecedorId, setFornecedorId] = useState('');
    const [funcionarioId, setFuncionarioId] = useState('');
    const [produtoId, setProdutoId] = useState('');
    const [busca, setBusca] = useState('');
    const [status, setStatus] = useState('');
    const [clientes, setClientes] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [loadingReport, setLoadingReport] = useState(false);
    const [report, setReport] = useState(null);

    useEffect(() => {
        let active = true;
        Promise.all([
            fetchRelatoriosCatalogo(),
            fetchClientes(),
            fetchFornecedores(),
            fetchEmployees(),
            fetchProdutos(),
        ])
            .then(([catalogData, clientesData, fornecedoresData, funcionariosData, produtosData]) => {
                if (!active) return;
                setCatalogo(Array.isArray(catalogData) ? catalogData : []);
                setClientes(Array.isArray(clientesData) ? clientesData : []);
                setFornecedores(Array.isArray(fornecedoresData) ? fornecedoresData : []);
                setFuncionarios(Array.isArray(funcionariosData) ? funcionariosData : []);
                setProdutos(Array.isArray(produtosData) ? produtosData : []);
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar relatórios.'))
            .finally(() => {
                if (active) setLoadingCatalogo(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (location.state?.openReportId) {
            navigate(`/relatorios/${location.state.openReportId}`, { replace: true, state: {} });
            return;
        }
        if (location.state?.resetView) {
            setGroupFilter('Todos');
            setQuery('');
            navigate('/relatorios', { replace: true, state: {} });
        }
    }, [location.state, navigate]);

    useEffect(() => {
        if (!catalogo.length) return;

        if (!routeReportId) {
            setSelected(null);
            setReport(null);
            setClienteId('');
            setFornecedorId('');
            setFuncionarioId('');
            setProdutoId('');
            setBusca('');
            setStatus('');
            setInicio(defaults.inicio);
            setFim(defaults.fim);
            return;
        }

        const item = catalogo.find((entry) => entry.id === routeReportId);
        if (!item) {
            navigate('/relatorios', { replace: true });
            return;
        }

        const period = periodForReport(item);
        setSelected(item);
        setReport(null);
        setClienteId('');
        setFornecedorId('');
        setFuncionarioId('');
        setProdutoId('');
        setBusca('');
        setStatus('');
        setInicio(period.inicio);
        setFim(period.fim);
    }, [routeReportId, catalogo, defaults, navigate]);

    const groups = useMemo(() => {
        const set = new Set(catalogo.map((item) => item.group));
        return ['Todos', ...Array.from(set)];
    }, [catalogo]);

    const clienteOptions = useMemo(() => (
        clientes.map((item) => ({
            id: item.id,
            label: item.nome_razao_social || item.nome || `Cliente #${item.id}`,
            search: `${item.nome_razao_social || ''} ${item.cpf_cnpj || ''}`,
        }))
    ), [clientes]);

    const fornecedorOptions = useMemo(() => (
        fornecedores.map((item) => ({
            id: item.id,
            label: item.razao_social || item.nome_fantasia || `Fornecedor #${item.id}`,
            search: `${item.razao_social || ''} ${item.nome_fantasia || ''} ${item.cnpj || ''}`,
        }))
    ), [fornecedores]);

    const funcionarioOptions = useMemo(() => (
        funcionarios.map((item) => ({
            id: item.id,
            label: item.name || item.nome || item.full_name || `Funcionário #${item.id}`,
            search: `${item.name || item.nome || ''} ${item.cpf || ''} ${item.position || ''}`,
        }))
    ), [funcionarios]);

    const produtoOptions = useMemo(() => (
        produtos.map((item) => ({
            id: item.id,
            label: `${item.codigo ? `${item.codigo} — ` : ''}${item.nome || `Produto #${item.id}`}`,
            search: `${item.codigo || ''} ${item.nome || ''} ${item.categoria || ''}`,
        }))
    ), [produtos]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        return catalogo.filter((item) => {
            if (groupFilter !== 'Todos' && item.group !== groupFilter) return false;
            if (!term) return true;
            return [item.title, item.description, item.group]
                .some((value) => String(value || '').toLowerCase().includes(term));
        });
    }, [catalogo, groupFilter, query]);

    const showClienteFilter = Boolean(selected?.clienteFilter);
    const showFornecedorFilter = Boolean(selected?.fornecedorFilter);
    const showFuncionarioFilter = Boolean(selected?.funcionarioFilter);
    const showProdutoFilter = Boolean(selected?.produtoFilter);
    const showBuscaFilter = Boolean(selected?.buscaFilter);
    const statusOptions = Array.isArray(selected?.statusOptions) ? selected.statusOptions : [];
    const showStatusFilter = statusOptions.length > 0;
    const statusLabels = selected?.statusLabels || {};
    const showPeriodo = selected?.id !== 'estoque-atual'
        && selected?.id !== 'frota-status'
        && selected?.id !== 'rh-funcionarios'
        && selected?.id !== 'cadastros-clientes'
        && selected?.id !== 'cadastros-fornecedores';

    const selectedClienteLabel = findLabel(clienteOptions, clienteId);
    const selectedFornecedorLabel = findLabel(fornecedorOptions, fornecedorId);
    const selectedFuncionarioLabel = findLabel(funcionarioOptions, funcionarioId);
    const selectedProdutoLabel = findLabel(produtoOptions, produtoId);
    const selectedStatusLabel = status
        ? (statusLabels[status] || status)
        : '';

    const filterCount = [
        showClienteFilter,
        showFornecedorFilter,
        showFuncionarioFilter,
        showProdutoFilter,
        showBuscaFilter,
        showStatusFilter,
    ].filter(Boolean).length;

    useEffect(() => {
        if (!selected?.id) return undefined;

        let active = true;
        const timer = setTimeout(async () => {
            setLoadingReport(true);
            try {
                const params = {};
                if (showPeriodo) {
                    params.inicio = inicio;
                    params.fim = fim;
                }
                if (showClienteFilter && clienteId) params.cliente_id = clienteId;
                if (showFornecedorFilter && fornecedorId) params.fornecedor_id = fornecedorId;
                if (showFuncionarioFilter && funcionarioId) params.funcionario_id = funcionarioId;
                if (showProdutoFilter && produtoId) params.produto_id = produtoId;
                if (showBuscaFilter && busca.trim()) params.busca = busca.trim();
                if (showStatusFilter && status) params.status = status;

                const data = await fetchRelatorio(selected.id, params);
                if (!active) return;
                setReport(data);
            } catch (error) {
                if (!active) return;
                showToast('error', error.message || 'Erro ao gerar relatório.');
            } finally {
                if (active) setLoadingReport(false);
            }
        }, 280);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [
        selected,
        inicio,
        fim,
        clienteId,
        fornecedorId,
        funcionarioId,
        produtoId,
        busca,
        status,
        showPeriodo,
        showClienteFilter,
        showFornecedorFilter,
        showFuncionarioFilter,
        showProdutoFilter,
        showBuscaFilter,
        showStatusFilter,
    ]);

    const resetEntityFilters = () => {
        setClienteId('');
        setFornecedorId('');
        setFuncionarioId('');
        setProdutoId('');
        setBusca('');
        setStatus('');
    };

    const openReport = (item) => {
        navigate(`/relatorios/${item.id}`);
    };

    const closeReport = () => {
        navigate('/relatorios');
    };

    const clearFilters = () => {
        const period = periodForReport(selected);
        setInicio(period.inicio);
        setFim(period.fim);
        resetEntityFilters();
    };

    const handleExport = () => {
        if (!report?.columns?.length || !report?.rows) {
            showToast('warning', 'Não há dados para exportar.');
            return;
        }
        const slug = String(selected?.id || 'relatorio');
        downloadCsv(`relatorio-${slug}-${inicio}_${fim}.csv`, report.columns, report.rows);
        showToast('success', 'CSV gerado.');
    };

    const viewingReport = Boolean(selected);
    const selectedPeriodDefaults = useMemo(() => periodForReport(selected), [selected]);
    const hasCustomFilters = (showPeriodo && (inicio !== selectedPeriodDefaults.inicio || fim !== selectedPeriodDefaults.fim))
        || Boolean(clienteId)
        || Boolean(fornecedorId)
        || Boolean(funcionarioId)
        || Boolean(produtoId)
        || Boolean(busca.trim())
        || Boolean(status);

    const printMetaParts = [
        showPeriodo ? `Período: ${formatDate(inicio)} — ${formatDate(fim)}` : null,
        selectedClienteLabel ? `Cliente: ${selectedClienteLabel}` : null,
        selectedFornecedorLabel ? `Fornecedor: ${selectedFornecedorLabel}` : null,
        selectedFuncionarioLabel ? `Funcionário: ${selectedFuncionarioLabel}` : null,
        selectedProdutoLabel ? `Produto: ${selectedProdutoLabel}` : null,
        selectedStatusLabel ? `Status: ${selectedStatusLabel}` : null,
        busca.trim() ? `Busca: ${busca.trim()}` : null,
        `Gerado em ${new Date().toLocaleString('pt-BR')}`,
    ].filter(Boolean);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card admin-relatorios-page">
                <AdminPageHeader
                    title={viewingReport ? (selected?.title || 'Relatório') : 'Relatórios'}
                    icon={viewingReport ? null : 'fa-chart-bar'}
                    actions={(
                        <div className="admin-relatorios-toolbar no-print">
                            {viewingReport ? (
                                <>
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        onClick={closeReport}
                                        disabled={loadingReport}
                                    >
                                        <i className="fas fa-arrow-left me-2" aria-hidden="true" />
                                        Voltar
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline-secondary"
                                        onClick={() => window.print()}
                                        disabled={loadingReport || !report}
                                    >
                                        <i className="fas fa-print me-2" aria-hidden="true" />
                                        Imprimir
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={handleExport}
                                        disabled={loadingReport || !report}
                                    >
                                        <i className="fas fa-file-csv me-2" aria-hidden="true" />
                                        Exportar CSV
                                    </Button>
                                </>
                            ) : (
                                <div className={`admin-nfe-search-expand admin-cipa-search${query ? ' is-open' : ''}`}>
                                    <i className="fas fa-search" aria-hidden="true" />
                                    <input
                                        type="search"
                                        className="admin-nfe-search-input"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder="Buscar relatório..."
                                        aria-label="Buscar relatório"
                                    />
                                </div>
                            )}
                        </div>
                    )}
                />

                {!viewingReport ? (
                    <>
                        <p className="admin-config-section-hint">
                            Relatórios operacionais do sistema. Escolha um relatório, ajuste o período e exporte quando precisar.
                        </p>

                        <div className="admin-relatorios-filters" role="group" aria-label="Filtro por área">
                            {groups.map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    className={`admin-relatorios-filter-btn${groupFilter === group ? ' is-active' : ''}`}
                                    onClick={() => setGroupFilter(group)}
                                >
                                    {group}
                                </button>
                            ))}
                        </div>

                        {loadingCatalogo ? <p className="text-muted">Carregando relatórios...</p> : null}

                        {!loadingCatalogo && filtered.length === 0 ? (
                            <p className="text-muted">Nenhum relatório encontrado.</p>
                        ) : null}

                        <div className="admin-relatorios-grid">
                            {filtered.map((item) => (
                                <article key={item.id} className="admin-relatorios-card" data-tone={item.tone || 'in'}>
                                    <div className="admin-relatorios-card-icon">
                                        <i className={`fas ${item.icon}`} aria-hidden="true" />
                                    </div>
                                    <div className="admin-relatorios-card-body">
                                        <span className="admin-relatorios-card-group">{item.group}</span>
                                        <strong>{item.title}</strong>
                                        <p>{item.description}</p>
                                    </div>
                                    <Button type="button" variant="primary" onClick={() => openReport(item)}>
                                        Abrir
                                    </Button>
                                </article>
                            ))}
                        </div>
                    </>
                ) : (
                    <AdminDateFieldProvider>
                        <div className="admin-relatorios-view admin-estoque-panel">
                            <img
                                src={WATERMARK_URL}
                                alt=""
                                aria-hidden="true"
                                className="admin-relatorios-watermark print-only"
                            />
                            <div className="admin-relatorios-print-header print-only">
                                <img src={LOGO_URL} alt="Cerâmica Vicente Portela" />
                                <div className="admin-relatorios-print-meta">
                                    <span className="admin-relatorios-print-title">{selected?.title || 'Relatório'}</span>
                                    <small>{printMetaParts.join(' · ')}</small>
                                </div>
                            </div>
                            <div className="admin-relatorios-print-footer print-only" aria-hidden="true">
                                Relatório emitido automaticamente pelo sistema
                            </div>

                            {selected?.description ? (
                                <p className="admin-config-section-hint no-print">{selected.description}</p>
                            ) : null}

                            <div
                                className={[
                                    'admin-relatorios-view-filters',
                                    'no-print',
                                    showPeriodo ? 'has-periodo' : '',
                                    filterCount > 0 ? 'has-entity' : '',
                                    `entities-${filterCount}`,
                                ].filter(Boolean).join(' ')}
                            >
                                {showPeriodo ? (
                                    <>
                                        <AdminDateField
                                            label="Início"
                                            name="relatorio_inicio"
                                            value={inicio}
                                            onChange={(event) => setInicio(event.target.value)}
                                        />
                                        <AdminDateField
                                            label="Fim"
                                            name="relatorio_fim"
                                            value={fim}
                                            onChange={(event) => setFim(event.target.value)}
                                        />
                                    </>
                                ) : null}

                                {showClienteFilter ? (
                                    <AdminSearchSelect
                                        label="Cliente"
                                        name="cliente_id"
                                        value={clienteId}
                                        options={clienteOptions}
                                        onChange={(event) => setClienteId(event.target.value)}
                                        placeholder="Digite o nome, CPF ou CNPJ..."
                                        emptyLabel="Nenhum cliente encontrado"
                                    />
                                ) : null}

                                {showFornecedorFilter ? (
                                    <AdminSearchSelect
                                        label="Fornecedor"
                                        name="fornecedor_id"
                                        value={fornecedorId}
                                        options={fornecedorOptions}
                                        onChange={(event) => setFornecedorId(event.target.value)}
                                        placeholder="Digite a razão social ou CNPJ..."
                                        emptyLabel="Nenhum fornecedor encontrado"
                                    />
                                ) : null}

                                {showFuncionarioFilter ? (
                                    <AdminSearchSelect
                                        label="Funcionário"
                                        name="funcionario_id"
                                        value={funcionarioId}
                                        options={funcionarioOptions}
                                        onChange={(event) => setFuncionarioId(event.target.value)}
                                        placeholder="Digite o nome do funcionário..."
                                        emptyLabel="Nenhum funcionário encontrado"
                                    />
                                ) : null}

                                {showProdutoFilter ? (
                                    <AdminSearchSelect
                                        label="Produto"
                                        name="produto_id"
                                        value={produtoId}
                                        options={produtoOptions}
                                        onChange={(event) => setProdutoId(event.target.value)}
                                        placeholder="Digite código ou nome..."
                                        emptyLabel="Nenhum produto encontrado"
                                    />
                                ) : null}

                                {showBuscaFilter ? (
                                    <AdminFloatField
                                        label={selected?.buscaLabel || 'Buscar'}
                                        name="busca"
                                        value={busca}
                                        onChange={(event) => setBusca(event.target.value)}
                                        placeholder={selected?.buscaPlaceholder || 'Digite para buscar...'}
                                    />
                                ) : null}

                                {showStatusFilter ? (
                                    <AdminFloatField
                                        as="select"
                                        label="Status"
                                        name="status"
                                        value={status}
                                        onChange={(event) => setStatus(event.target.value)}
                                    >
                                        <option value="">Todos</option>
                                        {statusOptions.map((item) => (
                                            <option key={item} value={item}>
                                                {statusLabels[item] || item}
                                            </option>
                                        ))}
                                    </AdminFloatField>
                                ) : null}

                                <div className="admin-relatorios-filter-actions">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="admin-estoque-hist-clear-btn"
                                        disabled={!hasCustomFilters || loadingReport}
                                        onClick={clearFilters}
                                    >
                                        Limpar
                                    </Button>
                                </div>
                            </div>

                            {loadingReport && !report ? (
                                <p className="text-muted mb-0">Gerando relatório...</p>
                            ) : null}

                            {report ? (
                                <div className={`admin-relatorios-result${loadingReport ? ' is-loading' : ''}`}>
                                    <div className="admin-relatorios-summary no-print">
                                        {showPeriodo ? (
                                            <span>
                                                Período: <strong>{formatDate(report.periodo?.inicio)}</strong>
                                                {' — '}
                                                <strong>{formatDate(report.periodo?.fim)}</strong>
                                            </span>
                                        ) : null}
                                        {selectedClienteLabel ? (
                                            <span>Cliente: <strong>{selectedClienteLabel}</strong></span>
                                        ) : null}
                                        {selectedFornecedorLabel ? (
                                            <span>Fornecedor: <strong>{selectedFornecedorLabel}</strong></span>
                                        ) : null}
                                        {selectedFuncionarioLabel ? (
                                            <span>Funcionário: <strong>{selectedFuncionarioLabel}</strong></span>
                                        ) : null}
                                        {selectedProdutoLabel ? (
                                            <span>Produto: <strong>{selectedProdutoLabel}</strong></span>
                                        ) : null}
                                        {selectedStatusLabel ? (
                                            <span>Status: <strong>{selectedStatusLabel}</strong></span>
                                        ) : null}
                                        {busca.trim() ? (
                                            <span>Busca: <strong>{busca.trim()}</strong></span>
                                        ) : null}
                                        <span>
                                            Registros: <strong>{report.summary?.total ?? report.rows?.length ?? 0}</strong>
                                        </span>
                                        {report.summary?.valor != null ? (
                                            <span>Total: <strong>{formatMoney(report.summary.valor)}</strong></span>
                                        ) : null}
                                        {report.summary?.comissao != null ? (
                                            <span>Comissões: <strong>{formatMoney(report.summary.comissao)}</strong></span>
                                        ) : null}
                                        {report.summary?.ativos != null ? (
                                            <span>Ativos: <strong>{report.summary.ativos}</strong></span>
                                        ) : null}
                                        {report.summary?.baixo != null ? (
                                            <span>Estoque baixo: <strong>{report.summary.baixo}</strong></span>
                                        ) : null}
                                        {loadingReport ? <span className="text-muted">Atualizando...</span> : null}
                                    </div>

                                    <div className="admin-table-scroll admin-relatorios-table-wrap">
                                        <Table bordered hover className="mb-0 align-middle admin-relatorios-table">
                                            <thead>
                                                <tr>
                                                    {(report.columns || []).map((col) => (
                                                        <th key={col.key} data-type={col.type || 'text'}>{col.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(report.rows || []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={(report.columns || []).length || 1} className="text-muted">
                                                            Nenhum registro encontrado.
                                                        </td>
                                                    </tr>
                                                ) : null}
                                                {(report.rows || []).map((row, index) => (
                                                    <tr key={`${selected?.id}-${index}`}>
                                                        {(report.columns || []).map((col) => (
                                                            <td key={col.key} data-type={col.type || 'text'} title={formatCell(row[col.key], col.type)}>
                                                                {formatCell(row[col.key], col.type)}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>

                                    <RelatorioChart reportId={selected?.id} rows={report.rows} />
                                </div>
                            ) : null}
                        </div>
                    </AdminDateFieldProvider>
                )}
            </section>
        </div>
    );
}
