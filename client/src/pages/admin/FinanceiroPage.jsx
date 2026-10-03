import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Tab, Table, Tabs } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import {
    ContaPagarModal,
    ContaReceberModal,
    NotaXmlModal,
} from '../../components/admin/financeiro/FinanceiroModals';
import {
    fetchContasPagar,
    fetchContasReceber,
    fetchFinanceiroResumo,
    updateContaPagar,
    updateContaReceber,
} from '../../api/financeiro';
import { showToast } from '../../utils/toast';

const TABS = ['painel', 'receber', 'pagar', 'notas'];

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

function matchesQuery(values, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return values.some((value) => String(value || '').toLowerCase().includes(q));
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function SummaryCard({ tone, icon, title, value, hint }) {
    return (
        <article className="admin-financeiro-summary-card" data-tone={tone}>
            <i className={`fas ${icon}`} aria-hidden="true" />
            <div>
                <span>{title}</span>
                <strong>{value}</strong>
                {hint ? <small>{hint}</small> : null}
            </div>
        </article>
    );
}

export default function FinanceiroPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'painel';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState(null);
    const [receber, setReceber] = useState([]);
    const [pagar, setPagar] = useState([]);
    const [receberModal, setReceberModal] = useState({ open: false, item: null });
    const [pagarModal, setPagarModal] = useState({ open: false, item: null });
    const [xmlModal, setXmlModal] = useState(false);
    const [busyId, setBusyId] = useState(null);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const [resumoData, receberData, pagarData] = await Promise.all([
                fetchFinanceiroResumo(),
                fetchContasReceber(),
                fetchContasPagar(),
            ]);
            setResumo(resumoData || null);
            setReceber(Array.isArray(receberData) ? receberData : []);
            setPagar(Array.isArray(pagarData) ? pagarData : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar financeiro.');
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
            painel: {
                title: 'Financeiro · Painel',
                action: null,
                searchPlaceholder: '',
            },
            receber: {
                title: 'Financeiro · Contas a receber',
                action: () => setReceberModal({ open: true, item: null }),
                label: 'Novo lançamento',
                searchPlaceholder: 'Cliente, descrição, status, documento...',
            },
            pagar: {
                title: 'Financeiro · Contas a pagar',
                action: () => setPagarModal({ open: true, item: null }),
                label: 'Novo lançamento',
                searchPlaceholder: 'Fornecedor, descrição, status, documento...',
            },
            notas: {
                title: 'Financeiro · Notas fiscais',
                action: () => setXmlModal(true),
                label: 'Importar XML',
                searchPlaceholder: '',
            },
        };
        return map[activeTab] || map.painel;
    }, [activeTab]);

    const filteredReceber = useMemo(() => receber.filter((item) => matchesQuery([
        item.descricao, item.cliente_nome, item.categoria, item.status, item.documento, item.forma_pagamento,
    ], query)), [receber, query]);

    const filteredPagar = useMemo(() => pagar.filter((item) => matchesQuery([
        item.descricao, item.fornecedor_nome, item.categoria, item.status, item.documento, item.forma_pagamento,
    ], query)), [pagar, query]);

    const showSearch = activeTab === 'receber' || activeTab === 'pagar';
    const lucroTone = Number(resumo?.lucro_realizado || 0) >= 0 ? 'profit' : 'loss';

    const marcarRecebidoRapido = async (item, event) => {
        event.stopPropagation();
        if (!item?.id || busyId) return;
        setBusyId(`r-${item.id}`);
        try {
            await updateContaReceber(item.id, {
                ...item,
                valor_recebido: item.valor,
                data_recebimento: todayIso(),
                status: 'Recebido',
            });
            showToast('success', 'Conta marcada como recebida.');
            await loadAll();
        } catch (error) {
            showToast('error', error.message || 'Erro ao marcar recebimento.');
        } finally {
            setBusyId(null);
        }
    };

    const recusarReceberRapido = async (item, event) => {
        event.stopPropagation();
        if (!item?.id || busyId) return;
        setBusyId(`rr-${item.id}`);
        try {
            await updateContaReceber(item.id, {
                ...item,
                status: 'Cancelado',
                observacoes: item.observacoes || 'Recebimento recusado.',
            });
            showToast('success', 'Recebimento recusado.');
            await loadAll();
        } catch (error) {
            showToast('error', error.message || 'Erro ao recusar.');
        } finally {
            setBusyId(null);
        }
    };

    const marcarPagoRapido = async (item, event) => {
        event.stopPropagation();
        if (!item?.id || busyId) return;
        setBusyId(`p-${item.id}`);
        try {
            await updateContaPagar(item.id, {
                ...item,
                valor_pago: item.valor,
                data_pagamento: todayIso(),
                status: 'Pago',
            });
            showToast('success', 'Conta marcada como paga.');
            await loadAll();
        } catch (error) {
            showToast('error', error.message || 'Erro ao marcar pagamento.');
        } finally {
            setBusyId(null);
        }
    };

    const recusarPagarRapido = async (item, event) => {
        event.stopPropagation();
        if (!item?.id || busyId) return;
        setBusyId(`rp-${item.id}`);
        try {
            await updateContaPagar(item.id, {
                ...item,
                status: 'Cancelado',
                observacoes: item.observacoes || 'Pagamento recusado.',
            });
            showToast('success', 'Pagamento recusado.');
            await loadAll();
        } catch (error) {
            showToast('error', error.message || 'Erro ao recusar.');
        } finally {
            setBusyId(null);
        }
    };

    const handleXmlSaved = async (result) => {
        await loadAll();
        if (result?.tipo_conta === 'receber') setSearchParams({ tab: 'receber' });
        else if (result?.tipo_conta === 'pagar' || result?.conta) setSearchParams({ tab: 'pagar' });
    };

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card admin-financeiro-page">
                <AdminPageHeader
                    title={headerMeta.title}
                    icon="fa-wallet"
                    actionLabel={headerMeta.label}
                    actionIcon={activeTab === 'notas' ? 'fa-file-code' : 'fa-plus'}
                    onAction={headerMeta.action || undefined}
                    actions={showSearch ? (
                        <div className="admin-financeiro-toolbar">
                            <div className={`admin-nfe-search-expand admin-cipa-search${query ? ' is-open' : ''}`}>
                                <i className="fas fa-search" aria-hidden="true" />
                                <input
                                    type="search"
                                    className="admin-nfe-search-input"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder={headerMeta.searchPlaceholder}
                                    aria-label="Pesquisar no financeiro"
                                />
                            </div>
                        </div>
                    ) : null}
                />

                <div className="admin-financeiro-summary-grid admin-financeiro-summary-top">
                    <SummaryCard
                        tone="receive"
                        icon="fa-arrow-down"
                        title="A receber"
                        value={loading ? '—' : formatMoney(resumo?.a_receber)}
                        hint={`${resumo?.a_receber_qtd || 0} em aberto`}
                    />
                    <SummaryCard
                        tone="pay"
                        icon="fa-arrow-up"
                        title="A pagar"
                        value={loading ? '—' : formatMoney(resumo?.a_pagar)}
                        hint={`${resumo?.a_pagar_qtd || 0} em aberto`}
                    />
                    <SummaryCard
                        tone="in"
                        icon="fa-coins"
                        title="Recebido no mês"
                        value={loading ? '—' : formatMoney(resumo?.recebido_mes)}
                    />
                    <SummaryCard
                        tone="out"
                        icon="fa-money-bill-wave"
                        title="Pago no mês"
                        value={loading ? '—' : formatMoney(resumo?.pago_mes)}
                    />
                    <SummaryCard
                        tone="forecast"
                        icon="fa-balance-scale"
                        title="Lucro previsto"
                        value={loading ? '—' : formatMoney(resumo?.lucro_previsto)}
                        hint="A receber − a pagar"
                    />
                    <SummaryCard
                        tone={lucroTone}
                        icon="fa-chart-line"
                        title="Lucro realizado"
                        value={loading ? '—' : formatMoney(resumo?.lucro_realizado)}
                        hint="Recebido − pago no mês"
                    />
                </div>

                <Tabs
                    activeKey={activeTab}
                    onSelect={handleTabSelect}
                    className="admin-funcionario-tabs admin-financeiro-tabs mb-3"
                >
                    <Tab eventKey="painel" title="Painel / Lucros" />
                    <Tab eventKey="receber" title="Contas a receber" />
                    <Tab eventKey="pagar" title="Contas a pagar" />
                    <Tab eventKey="notas" title="Notas / XML" />
                </Tabs>

                {activeTab === 'painel' && (
                    <div className="admin-financeiro-painel">
                        <p className="admin-config-section-hint">
                            Visão do mês: entradas, saídas e lucro. Use as abas para lançar contas, marcar utilidades como pagas e importar NF-e.
                        </p>
                        {loading && <p className="text-muted">Carregando painel...</p>}
                        {!loading && (
                            <div className="admin-financeiro-lists-grid">
                                <article className="admin-financeiro-list-card" data-tone="receive">
                                    <header>
                                        <strong>A receber (próx. 15 dias)</strong>
                                        <span>{(resumo?.vencendo_receber || []).length} item(ns)</span>
                                    </header>
                                    <ul>
                                        {(resumo?.vencendo_receber || []).length === 0 && (
                                            <li className="is-empty">Nada a vencer no período.</li>
                                        )}
                                        {(resumo?.vencendo_receber || []).map((item) => (
                                            <li key={`r-${item.id}`}>
                                                <div className="admin-financeiro-list-head">
                                                    <strong>{item.descricao}</strong>
                                                    <StatusBadge status={item.status} />
                                                </div>
                                                <span>{item.cliente_nome || 'Sem cliente'}</span>
                                                <div className="admin-financeiro-list-meta">
                                                    <span>{formatMoney(item.valor)}</span>
                                                    <span>{formatDate(item.data_vencimento)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </article>

                                <article className="admin-financeiro-list-card" data-tone="pay">
                                    <header>
                                        <strong>A pagar (próx. 15 dias)</strong>
                                        <span>{(resumo?.vencendo_pagar || []).length} item(ns)</span>
                                    </header>
                                    <ul>
                                        {(resumo?.vencendo_pagar || []).length === 0 && (
                                            <li className="is-empty">Nada a vencer no período.</li>
                                        )}
                                        {(resumo?.vencendo_pagar || []).map((item) => (
                                            <li key={`p-${item.id}`}>
                                                <div className="admin-financeiro-list-head">
                                                    <strong>{item.descricao}</strong>
                                                    <StatusBadge status={item.status} />
                                                </div>
                                                <span>{item.fornecedor_nome || 'Sem fornecedor'}</span>
                                                <div className="admin-financeiro-list-meta">
                                                    <span>{formatMoney(item.valor)}</span>
                                                    <span>{formatDate(item.data_vencimento)}</span>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'receber' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Cliente</th>
                                    <th>Valor</th>
                                    <th>Recebido</th>
                                    <th>Vencimento</th>
                                    <th>Forma</th>
                                    <th>Status</th>
                                    <th style={{ width: 118 }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={8} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredReceber.length === 0 && (
                                    <tr><td colSpan={8} className="text-muted">Nenhuma conta a receber encontrada.</td></tr>
                                )}
                                {!loading && filteredReceber.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setReceberModal({ open: true, item })}>
                                        <td>{item.descricao}</td>
                                        <td>{item.cliente_nome || '—'}</td>
                                        <td>{formatMoney(item.valor)}</td>
                                        <td>{formatMoney(item.valor_recebido)}</td>
                                        <td>{formatDate(item.data_vencimento)}</td>
                                        <td>{item.forma_pagamento || '—'}</td>
                                        <td><StatusBadge status={item.status} /></td>
                                        <td onClick={(event) => event.stopPropagation()}>
                                            {item.status !== 'Recebido' && item.status !== 'Cancelado' ? (
                                                <div className="admin-financeiro-row-actions">
                                                    <button
                                                        type="button"
                                                        className="admin-financeiro-action-btn is-pay"
                                                        title="Marcar recebido"
                                                        disabled={busyId === `r-${item.id}`}
                                                        onClick={(event) => marcarRecebidoRapido(item, event)}
                                                    >
                                                        <i className="fas fa-dollar-sign" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-financeiro-action-btn is-refuse"
                                                        title="Recusar recebimento"
                                                        disabled={busyId === `rr-${item.id}`}
                                                        onClick={(event) => recusarReceberRapido(item, event)}
                                                    >
                                                        <i className="fas fa-ban" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={8} className="admin-table-footer">
                                        Total: <strong>{loading ? '—' : filteredReceber.length}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'pagar' && (
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Descrição</th>
                                    <th>Fornecedor</th>
                                    <th>Valor</th>
                                    <th>Pago</th>
                                    <th>Vencimento</th>
                                    <th>Forma</th>
                                    <th>Status</th>
                                    <th style={{ width: 118 }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan={8} className="text-muted">Carregando...</td></tr>}
                                {!loading && filteredPagar.length === 0 && (
                                    <tr><td colSpan={8} className="text-muted">Nenhuma conta a pagar encontrada.</td></tr>
                                )}
                                {!loading && filteredPagar.map((item) => (
                                    <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => setPagarModal({ open: true, item })}>
                                        <td>{item.descricao}</td>
                                        <td>{item.fornecedor_nome || '—'}</td>
                                        <td>{formatMoney(item.valor)}</td>
                                        <td>{formatMoney(item.valor_pago)}</td>
                                        <td>{formatDate(item.data_vencimento)}</td>
                                        <td>{item.forma_pagamento || '—'}</td>
                                        <td><StatusBadge status={item.status} /></td>
                                        <td onClick={(event) => event.stopPropagation()}>
                                            {item.status !== 'Pago' && item.status !== 'Cancelado' ? (
                                                <div className="admin-financeiro-row-actions">
                                                    <button
                                                        type="button"
                                                        className="admin-financeiro-action-btn is-pay"
                                                        title="Marcar como pago"
                                                        disabled={busyId === `p-${item.id}`}
                                                        onClick={(event) => marcarPagoRapido(item, event)}
                                                    >
                                                        <i className="fas fa-dollar-sign" aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="admin-financeiro-action-btn is-refuse"
                                                        title="Recusar pagamento"
                                                        disabled={busyId === `rp-${item.id}`}
                                                        onClick={(event) => recusarPagarRapido(item, event)}
                                                    >
                                                        <i className="fas fa-ban" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={8} className="admin-table-footer">
                                        Total: <strong>{loading ? '—' : filteredPagar.length}</strong>
                                    </td>
                                </tr>
                            </tfoot>
                        </Table>
                    </div>
                )}

                {activeTab === 'notas' && (
                    <div className="admin-financeiro-notas">
                        <p className="admin-config-section-hint">
                            Importe o XML e escolha o destino: <strong>Contas a pagar</strong>, <strong>Contas a receber</strong> e/ou <strong>Estoque</strong>.
                        </p>
                        <div className="admin-financeiro-notas-card">
                            <i className="fas fa-file-invoice" aria-hidden="true" />
                            <div>
                                <strong>Importar nota fiscal (XML)</strong>
                                <p>
                                    Clique no campo do modal para selecionar o XML. Depois defina se a conta vai para pagar ou receber.
                                </p>
                            </div>
                            <Button type="button" variant="primary" onClick={() => setXmlModal(true)}>
                                <i className="fas fa-upload me-2" aria-hidden="true" />
                                Carregar XML
                            </Button>
                        </div>
                        <div className="admin-financeiro-notas-steps">
                            <article>
                                <span>1</span>
                                <div>
                                    <strong>Conta financeira</strong>
                                    <p>Escolha Contas a pagar (compra) ou Contas a receber (venda).</p>
                                </div>
                            </article>
                            <article>
                                <span>2</span>
                                <div>
                                    <strong>Estoque (opcional)</strong>
                                    <p>Se marcar, vincule os itens da NF aos produtos do sistema.</p>
                                </div>
                            </article>
                        </div>
                    </div>
                )}
            </section>

            <ContaReceberModal
                show={receberModal.open}
                item={receberModal.item}
                onHide={() => setReceberModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <ContaPagarModal
                show={pagarModal.open}
                item={pagarModal.item}
                onHide={() => setPagarModal({ open: false, item: null })}
                onSaved={loadAll}
            />
            <NotaXmlModal
                show={xmlModal}
                onHide={() => setXmlModal(false)}
                onSaved={handleXmlSaved}
            />
        </div>
    );
}
