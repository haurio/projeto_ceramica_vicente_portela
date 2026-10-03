import { useCallback, useEffect, useMemo, useState } from 'react';
import { Tab, Table, Tabs } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import {
    AcidenteModal,
    EntregaModal,
    EpiModal,
    EquipamentoModal,
    ManutencaoModal,
} from '../../components/admin/cipa/CipaModals';
import {
    fetchAcidentes,
    fetchCipaAlertas,
    fetchEntregas,
    fetchEpis,
    fetchEquipamentos,
    fetchManutencoes,
} from '../../api/cipa';
import { fetchEmployees } from '../../api/funcionarios';
import { fetchFornecedores } from '../../api/fornecedores';
import { showToast } from '../../utils/toast';

const TABS = ['painel', 'epis', 'entregas', 'equipamentos', 'manutencoes', 'acidentes'];

function formatDate(value) {
    if (!value) return '—';
    const raw = String(value).slice(0, 10);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return raw;
    return `${match[3]}/${match[2]}/${match[1]}`;
}

function daysLabel(days) {
    if (days == null) return '';
    if (days < 0) return `vencido há ${Math.abs(days)}d`;
    if (days === 0) return 'vence hoje';
    return `em ${days}d`;
}

function matchesQuery(values, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return values.some((value) => String(value || '').toLowerCase().includes(q));
}

function AlertCard({ title, icon, tone, items, emptyText, renderItem }) {
    return (
        <article className="admin-cipa-alert-card" data-tone={tone || 'ca'}>
            <header>
                <i className={`fas ${icon}`} aria-hidden="true" />
                <div>
                    <strong>{title}</strong>
                    <span>{items.length} registro(s)</span>
                </div>
            </header>
            <ul>
                {items.length === 0 && <li className="is-empty">{emptyText}</li>}
                {items.map((item) => (
                    <li
                        key={item.id || `${title}-${item.nome || item.funcionario_nome}-${item.data_validade || item.data_ocorrencia || ''}`}
                        className="admin-cipa-alert-result"
                    >
                        {renderItem(item)}
                    </li>
                ))}
            </ul>
        </article>
    );
}

function DayChip({ days, vencido }) {
    if (days == null) return null;
    const className = vencido || days < 0
        ? 'admin-cipa-alert-chip is-late'
        : days <= 15
            ? 'admin-cipa-alert-chip is-warn'
            : 'admin-cipa-alert-chip is-ok';
    return <span className={className}>{daysLabel(days)}</span>;
}

function tipoChipClass(tipo) {
    const value = String(tipo || '').trim().toLowerCase();
    if (value.includes('prevent')) return 'admin-cipa-alert-chip is-tipo is-preventiva';
    if (value.includes('corret')) return 'admin-cipa-alert-chip is-tipo is-corretiva';
    if (value.includes('trajeto')) return 'admin-cipa-alert-chip is-tipo is-trajeto';
    if (value.includes('doen')) return 'admin-cipa-alert-chip is-tipo is-doenca';
    if (value.includes('típ') || value.includes('tip')) return 'admin-cipa-alert-chip is-tipo is-tipico';
    return 'admin-cipa-alert-chip is-tipo';
}

function qtdChipClass(quantidade) {
    const qtd = Number(quantidade);
    if (!Number.isFinite(qtd) || qtd <= 0) return 'admin-cipa-alert-chip is-qtd is-late';
    if (qtd === 1) return 'admin-cipa-alert-chip is-qtd is-warn';
    return 'admin-cipa-alert-chip is-qtd is-ok';
}

function gravidadeChipClass(gravidade) {
    const value = String(gravidade || '').trim().toLowerCase();
    if (value.includes('fatal') || value.includes('grave')) return 'admin-cipa-alert-chip is-late';
    if (value.includes('moder')) return 'admin-cipa-alert-chip is-warn';
    return 'admin-cipa-alert-chip is-ok';
}

function entregaDisplayStatus(item) {
    const status = String(item?.status || '').trim();
    if (status === 'Em uso' && item?.data_validade) {
        const raw = String(item.data_validade).slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        if (raw && raw < today) return 'Expirado';
    }
    return status || '—';
}

function isEntregaAtual(item) {
    const status = entregaDisplayStatus(item);
    return status === 'Em uso' || status === 'Expirado';
}

export default function CipaPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'painel';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [alertas, setAlertas] = useState(null);
    const [epis, setEpis] = useState([]);
    const [entregas, setEntregas] = useState([]);
    const [equipamentos, setEquipamentos] = useState([]);
    const [manutencoes, setManutencoes] = useState([]);
    const [acidentes, setAcidentes] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [fornecedores, setFornecedores] = useState([]);

    const [epiModal, setEpiModal] = useState({ open: false, item: null });
    const [entregaModal, setEntregaModal] = useState({ open: false, item: null });
    const [equipModal, setEquipModal] = useState({ open: false, item: null });
    const [manutModal, setManutModal] = useState({ open: false, item: null });
    const [acidModal, setAcidModal] = useState({ open: false, item: null });
    const [entregaView, setEntregaView] = useState('atuais');

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [alertasData, episData, entregasData, equipData, manutData, acidData, funcs, forn] = await Promise.all([
                fetchCipaAlertas(30),
                fetchEpis(),
                fetchEntregas(),
                fetchEquipamentos(),
                fetchManutencoes(),
                fetchAcidentes(),
                fetchEmployees().catch(() => []),
                fetchFornecedores().catch(() => []),
            ]);
            setAlertas(alertasData || null);
            setEpis(Array.isArray(episData) ? episData : []);
            setEntregas(Array.isArray(entregasData) ? entregasData : []);
            setEquipamentos(Array.isArray(equipData) ? equipData : []);
            setManutencoes(Array.isArray(manutData) ? manutData : []);
            setAcidentes(Array.isArray(acidData) ? acidData : []);
            setFuncionarios(Array.isArray(funcs) ? funcs : []);
            setFornecedores(
                (Array.isArray(forn) ? forn : []).filter((item) => {
                    const ativo = item.ativo;
                    return ativo !== false && ativo !== 0 && ativo !== 'nao' && ativo !== 'Não';
                })
            );
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar CIPA.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    useEffect(() => {
        const tab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'painel';
        setActiveTab(tab);
        setQuery('');
        setEntregaView('atuais');
    }, [searchParams]);

    const handleTabSelect = (key) => {
        const next = TABS.includes(key) ? key : 'painel';
        setActiveTab(next);
        setQuery('');
        if (next === 'painel') setSearchParams({});
        else setSearchParams({ tab: next });
    };

    const headerMeta = useMemo(() => {
        const map = {
            painel: { title: 'CIPA · Painel', action: null, searchPlaceholder: '' },
            epis: {
                title: 'CIPA · EPIs',
                action: () => setEpiModal({ open: true, item: null }),
                label: 'Novo EPI',
                searchPlaceholder: 'Nome, CA, fornecedor, nota...',
            },
            entregas: {
                title: 'CIPA · Entregas',
                action: () => setEntregaModal({ open: true, item: null }),
                label: 'Nova entrega',
                searchPlaceholder: 'Buscar EPI, funcionário, motivo, status...',
            },
            equipamentos: {
                title: 'CIPA · Equipamentos',
                action: () => setEquipModal({ open: true, item: null }),
                label: 'Novo equipamento',
                searchPlaceholder: 'Nome, patrimônio, setor...',
            },
            manutencoes: {
                title: 'CIPA · Manutenções',
                action: () => setManutModal({ open: true, item: null }),
                label: 'Nova manutenção',
                searchPlaceholder: 'Equipamento, tipo, responsável...',
            },
            acidentes: {
                title: 'CIPA · Acidentes',
                action: () => setAcidModal({ open: true, item: null }),
                label: 'Registrar acidente',
                searchPlaceholder: 'Funcionário, tipo, setor, CAT...',
            },
        };
        return map[activeTab] || map.painel;
    }, [activeTab]);

    const filteredEpis = useMemo(() => epis.filter((item) => matchesQuery([
        item.nome, item.ca_numero, item.categoria, item.fornecedor_nome, item.nota_produto, item.fabricante,
    ], query)), [epis, query]);

    const filteredEntregas = useMemo(() => {
        const searched = entregas.filter((item) => matchesQuery([
            item.epi_nome, item.funcionario_nome, item.motivo, item.status, item.ca_numero,
            entregaDisplayStatus(item),
        ], query));

        // Com pesquisa: busca em todo o histórico. Sem pesquisa: respeita o filtro da aba.
        if (query.trim()) return searched;

        if (entregaView === 'historico') {
            return searched.filter((item) => !isEntregaAtual(item));
        }
        if (entregaView === 'todos') return searched;
        return searched.filter((item) => isEntregaAtual(item));
    }, [entregas, query, entregaView]);

    const filteredEquipamentos = useMemo(() => equipamentos.filter((item) => matchesQuery([
        item.nome, item.tag_patrimonio, item.tipo, item.setor, item.local_uso, item.status,
    ], query)), [equipamentos, query]);

    const filteredManutencoes = useMemo(() => manutencoes.filter((item) => matchesQuery([
        item.equipamento_nome, item.tipo, item.responsavel, item.status, item.tag_patrimonio,
    ], query)), [manutencoes, query]);

    const filteredAcidentes = useMemo(() => acidentes.filter((item) => matchesQuery([
        item.funcionario_nome, item.tipo, item.gravidade, item.setor, item.status, item.numero_cat,
    ], query)), [acidentes, query]);

    const totais = alertas?.totais || {};
    const alertaCount = Object.values(totais).reduce((sum, n) => sum + (Number(n) || 0), 0);
    const showSearch = activeTab !== 'painel';

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card admin-cipa-page">
                <AdminPageHeader
                    title={headerMeta.title}
                    icon="fa-hard-hat"
                    actionLabel={headerMeta.label}
                    actionIcon="fa-plus"
                    onAction={headerMeta.action || undefined}
                    actions={showSearch ? (
                        <div className="admin-cipa-toolbar">
                            {activeTab === 'entregas' ? (
                                <div className="admin-cipa-entrega-filters" role="group" aria-label="Filtro de entregas">
                                    <button
                                        type="button"
                                        className={`admin-cipa-filter-btn${entregaView === 'atuais' && !query ? ' is-active' : ''}`}
                                        onClick={() => { setEntregaView('atuais'); setQuery(''); }}
                                    >
                                        Atuais
                                    </button>
                                    <button
                                        type="button"
                                        className={`admin-cipa-filter-btn${entregaView === 'historico' && !query ? ' is-active' : ''}`}
                                        onClick={() => { setEntregaView('historico'); setQuery(''); }}
                                    >
                                        Histórico
                                    </button>
                                    <button
                                        type="button"
                                        className={`admin-cipa-filter-btn${entregaView === 'todos' || query ? ' is-active' : ''}`}
                                        onClick={() => { setEntregaView('todos'); }}
                                    >
                                        Todos
                                    </button>
                                </div>
                            ) : null}
                            <div className={`admin-nfe-search-expand admin-cipa-search${query ? ' is-open' : ''}`}>
                                <i className="fas fa-search" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="admin-nfe-search-input"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={headerMeta.searchPlaceholder}
                                    aria-label="Pesquisar na CIPA"
                                />
                            </div>
                        </div>
                    ) : null}
                />

                <Tabs
                    activeKey={activeTab}
                    onSelect={handleTabSelect}
                    className="admin-funcionario-tabs admin-cipa-tabs mb-3"
                >
                    <Tab eventKey="painel" title={`Painel${alertaCount ? ` (${alertaCount})` : ''}`} />
                    <Tab eventKey="epis" title="EPIs" />
                    <Tab eventKey="entregas" title="Entregas" />
                    <Tab eventKey="equipamentos" title="Equipamentos" />
                    <Tab eventKey="manutencoes" title="Manutenções" />
                    <Tab eventKey="acidentes" title="Acidentes" />
                </Tabs>

                {activeTab === 'painel' && (
                    <div className="admin-cipa-painel">
                        <p className="admin-config-section-hint">
                            Alertas dos próximos 30 dias: CA de EPI, estoque baixo, validade de entregas,
                            manutenção de equipamentos e acidentes em aberto.
                        </p>
                        {loading && <p className="text-muted">Carregando painel...</p>}
                        {!loading && (
                            <div className="admin-cipa-alert-grid">
                                <AlertCard
                                    title="CA de EPI vencendo"
                                    icon="fa-certificate"
                                    tone="ca"
                                    items={alertas?.epis_ca || []}
                                    emptyText="Nenhum CA próximo do vencimento."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">{item.nome}</strong>
                                                <DayChip days={item.dias_restantes} vencido={item.vencido} />
                                            </div>
                                            <div className="admin-cipa-alert-meta">
                                                <span className="admin-cipa-alert-chip is-ca">CA {item.ca_numero || '—'}</span>
                                                <span className="admin-cipa-alert-chip">{formatDate(item.validade_ca)}</span>
                                            </div>
                                        </>
                                    )}
                                />
                                <AlertCard
                                    title="Estoque baixo"
                                    icon="fa-boxes"
                                    tone="stock"
                                    items={alertas?.estoque_baixo || []}
                                    emptyText="Estoques dentro do mínimo."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">{item.nome}</strong>
                                                <span className={qtdChipClass(item.estoque_atual)}>
                                                    Qtd {item.estoque_atual}
                                                </span>
                                            </div>
                                            <div className="admin-cipa-alert-meta">
                                                <span className="admin-cipa-alert-chip">Mín. {item.estoque_minimo}</span>
                                                {item.ca_numero ? (
                                                    <span className="admin-cipa-alert-chip is-ca">CA {item.ca_numero}</span>
                                                ) : null}
                                            </div>
                                        </>
                                    )}
                                />
                                <AlertCard
                                    title="EPIs em uso vencendo"
                                    icon="fa-user-shield"
                                    tone="delivery"
                                    items={alertas?.entregas_vencendo || []}
                                    emptyText="Nenhuma entrega próxima do vencimento."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">{item.epi_nome}</strong>
                                                <DayChip days={item.dias_restantes} vencido={item.vencido} />
                                            </div>
                                            <span className="admin-cipa-alert-item-sub">
                                                {item.funcionario_nome || 'Funcionário não informado'}
                                            </span>
                                            <div className="admin-cipa-alert-meta">
                                                <span className="admin-cipa-alert-chip">{formatDate(item.data_validade)}</span>
                                                <span className={qtdChipClass(item.quantidade)}>Qtd {item.quantidade}</span>
                                            </div>
                                        </>
                                    )}
                                />
                                <AlertCard
                                    title="Equipamentos p/ manutenção"
                                    icon="fa-cogs"
                                    tone="equip"
                                    items={alertas?.equipamentos_manutencao || []}
                                    emptyText="Nenhum equipamento com prazo próximo."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">{item.nome}</strong>
                                                <DayChip days={item.dias_restantes} vencido={item.vencido} />
                                            </div>
                                            <span className="admin-cipa-alert-item-sub">
                                                {item.setor || item.tipo || 'Sem setor'}
                                            </span>
                                            <div className="admin-cipa-alert-meta">
                                                <span className="admin-cipa-alert-chip">{item.tag_patrimonio || 'Sem tag'}</span>
                                                <span className="admin-cipa-alert-chip">{formatDate(item.proxima_manutencao)}</span>
                                            </div>
                                        </>
                                    )}
                                />
                                <AlertCard
                                    title="Manutenções agendadas"
                                    icon="fa-wrench"
                                    tone="maint"
                                    items={alertas?.manutencoes_agendadas || []}
                                    emptyText="Sem manutenções no período."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">{item.equipamento_nome}</strong>
                                                <DayChip days={item.dias_restantes} vencido={item.vencido} />
                                            </div>
                                            <span className="admin-cipa-alert-item-sub">
                                                {item.responsavel || 'Sem responsável'}
                                            </span>
                                            <div className="admin-cipa-alert-meta">
                                                <span className={tipoChipClass(item.tipo)}>{item.tipo || '—'}</span>
                                                <span className="admin-cipa-alert-chip">{formatDate(item.data_agendada)}</span>
                                            </div>
                                        </>
                                    )}
                                />
                                <AlertCard
                                    title="Acidentes em aberto"
                                    icon="fa-exclamation-triangle"
                                    tone="accident"
                                    items={alertas?.acidentes_abertos || []}
                                    emptyText="Nenhum acidente em aberto."
                                    renderItem={(item) => (
                                        <>
                                            <div className="admin-cipa-alert-item-head">
                                                <strong className="admin-cipa-alert-item-title">
                                                    {item.funcionario_nome || 'Sem nome'}
                                                </strong>
                                                <StatusBadge status={item.status || 'Aberto'} />
                                            </div>
                                            <span className="admin-cipa-alert-item-sub">
                                                {item.setor || item.local_ocorrencia || 'Local não informado'}
                                            </span>
                                            <div className="admin-cipa-alert-meta">
                                                <span className={tipoChipClass(item.tipo)}>{item.tipo || '—'}</span>
                                                <span className={gravidadeChipClass(item.gravidade)}>{item.gravidade || '—'}</span>
                                                <span className="admin-cipa-alert-chip">{formatDate(item.data_ocorrencia)}</span>
                                            </div>
                                        </>
                                    )}
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'epis' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>CA</th>
                                    <th>Fornecedor</th>
                                    <th>Nota</th>
                                    <th>Validade CA</th>
                                    <th>Qtd.</th>
                                    <th>Mínimo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={8} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredEpis.length === 0 && <tr><td colSpan={8} className="text-muted">Nenhum EPI encontrado.</td></tr>}
                                {!loading && filteredEpis.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setEpiModal({ open: true, item })}>
                                        <td>{item.nome}</td>
                                        <td>{item.ca_numero || '—'}</td>
                                        <td>{item.fornecedor_nome || '—'}</td>
                                        <td>{item.nota_produto || '—'}</td>
                                        <td>{formatDate(item.validade_ca)}</td>
                                        <td>{item.estoque_atual}</td>
                                        <td>{item.estoque_minimo}</td>
                                        <td><StatusBadge status={item.status === 'Ativo' ? 'Ativo' : 'Inativo'} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr><td colSpan={8} className="admin-table-footer">Total: <strong>{loading ? '—' : filteredEpis.length}</strong></td></tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'entregas' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>EPI</th>
                                    <th>Funcionário</th>
                                    <th>Qtd</th>
                                    <th>Entrega</th>
                                    <th>Validade</th>
                                    <th>Motivo</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredEntregas.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="text-muted">
                                            {query
                                                ? 'Nenhuma entrega encontrada na pesquisa.'
                                                : entregaView === 'historico'
                                                    ? 'Nenhum histórico de entrega ainda.'
                                                    : 'Nenhuma entrega atual encontrada.'}
                                        </td>
                                    </tr>
                                )}
                                {!loading && filteredEntregas.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setEntregaModal({ open: true, item })}>
                                        <td>{item.epi_nome || '—'}</td>
                                        <td>{item.funcionario_nome || '—'}</td>
                                        <td>{item.quantidade}</td>
                                        <td>{formatDate(item.data_entrega)}</td>
                                        <td>{formatDate(item.data_validade)}</td>
                                        <td>{item.motivo || '—'}</td>
                                        <td><StatusBadge status={entregaDisplayStatus(item)} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr><td colSpan={7} className="admin-table-footer">Total: <strong>{loading ? '—' : filteredEntregas.length}</strong></td></tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'equipamentos' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Patrimônio</th>
                                    <th>Tipo</th>
                                    <th>Setor</th>
                                    <th>Próx. manutenção</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredEquipamentos.length === 0 && <tr><td colSpan={6} className="text-muted">Nenhum equipamento encontrado.</td></tr>}
                                {!loading && filteredEquipamentos.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setEquipModal({ open: true, item })}>
                                        <td>{item.nome}</td>
                                        <td>{item.tag_patrimonio || '—'}</td>
                                        <td>{item.tipo || '—'}</td>
                                        <td>{item.setor || '—'}</td>
                                        <td>{formatDate(item.proxima_manutencao)}</td>
                                        <td>{item.status || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr><td colSpan={6} className="admin-table-footer">Total: <strong>{loading ? '—' : filteredEquipamentos.length}</strong></td></tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'manutencoes' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Equipamento</th>
                                    <th>Tipo</th>
                                    <th>Agendada</th>
                                    <th>Realizada</th>
                                    <th>Responsável</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={6} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredManutencoes.length === 0 && <tr><td colSpan={6} className="text-muted">Nenhuma manutenção encontrada.</td></tr>}
                                {!loading && filteredManutencoes.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setManutModal({ open: true, item })}>
                                        <td>{item.equipamento_nome || '—'}</td>
                                        <td><span className={tipoChipClass(item.tipo)}>{item.tipo || '—'}</span></td>
                                        <td>{formatDate(item.data_agendada)}</td>
                                        <td>{formatDate(item.data_realizada)}</td>
                                        <td>{item.responsavel || '—'}</td>
                                        <td><StatusBadge status={item.status || '—'} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr><td colSpan={6} className="admin-table-footer">Total: <strong>{loading ? '—' : filteredManutencoes.length}</strong></td></tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'acidentes' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Funcionário</th>
                                    <th>Data</th>
                                    <th>Tipo</th>
                                    <th>Gravidade</th>
                                    <th>Setor</th>
                                    <th>CAT</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={7} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredAcidentes.length === 0 && <tr><td colSpan={7} className="text-muted">Nenhum acidente encontrado.</td></tr>}
                                {!loading && filteredAcidentes.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setAcidModal({ open: true, item })}>
                                        <td>{item.funcionario_nome || '—'}</td>
                                        <td>{formatDate(item.data_ocorrencia)}</td>
                                        <td><span className={tipoChipClass(item.tipo)}>{item.tipo || '—'}</span></td>
                                        <td><span className={gravidadeChipClass(item.gravidade)}>{item.gravidade || '—'}</span></td>
                                        <td>{item.setor || '—'}</td>
                                        <td>{item.cat_emitida ? (item.numero_cat || 'Sim') : 'Não'}</td>
                                        <td><StatusBadge status={item.status || '—'} /></td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr><td colSpan={7} className="admin-table-footer">Total: <strong>{loading ? '—' : filteredAcidentes.length}</strong></td></tr>
                            </tfoot>
                        </Table>
                    </div>
                )}
            </section>

            <EpiModal
                show={epiModal.open}
                item={epiModal.item}
                fornecedores={fornecedores}
                onHide={() => setEpiModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <EntregaModal
                show={entregaModal.open}
                item={entregaModal.item}
                epis={epis.filter((e) => e.status === 'Ativo' || e.id === entregaModal.item?.epi_id)}
                funcionarios={funcionarios}
                onHide={() => setEntregaModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <EquipamentoModal
                show={equipModal.open}
                item={equipModal.item}
                onHide={() => setEquipModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <ManutencaoModal
                show={manutModal.open}
                item={manutModal.item}
                equipamentos={equipamentos}
                onHide={() => setManutModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <AcidenteModal
                show={acidModal.open}
                item={acidModal.item}
                funcionarios={funcionarios}
                onHide={() => setAcidModal({ open: false, item: null })}
                onSaved={loadAll}
            />
        </div>
    );
}
