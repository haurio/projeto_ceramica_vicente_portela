import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tab, Table, Tabs } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { AdminDateFieldProvider, AdminDateRangeField } from '../../components/admin/AdminDateField';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchRepresentantes, fetchRepresentantesComissoes } from '../../api/representantes';
import { formatCnpj, formatCpf, formatPhone, onlyDigits } from '../../utils/inputMasks';
import { showToast } from '../../utils/toast';

function formatDocumento(value) {
    const digits = onlyDigits(value);
    if (!digits) return '—';
    if (digits.length > 11) return formatCnpj(value);
    return formatCpf(value);
}

function formatComissao(value) {
    const amount = Number(value) || 0;
    return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function formatMoney(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currentMonthBounds() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return {
        inicio: `${y}-${m}-01`,
        fim: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
    };
}

export default function RepresentantesPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('cadastro');
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const defaults = currentMonthBounds();
    const [periodoInicio, setPeriodoInicio] = useState(defaults.inicio);
    const [periodoFim, setPeriodoFim] = useState(defaults.fim);
    const [comissoes, setComissoes] = useState([]);
    const [comissaoSummary, setComissaoSummary] = useState(null);
    const [loadingComissoes, setLoadingComissoes] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchRepresentantes();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar representantes.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadComissoes = useCallback(async () => {
        if (!periodoInicio || !periodoFim) return;
        setLoadingComissoes(true);
        try {
            const data = await fetchRepresentantesComissoes({
                inicio: periodoInicio,
                fim: periodoFim,
            });
            setComissoes(Array.isArray(data?.itens) ? data.itens : []);
            setComissaoSummary(data?.summary || null);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar comissões.');
            setComissoes([]);
            setComissaoSummary(null);
        } finally {
            setLoadingComissoes(false);
        }
    }, [periodoInicio, periodoFim]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (activeTab === 'comissoes') {
            loadComissoes();
        }
    }, [activeTab, loadComissoes]);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card">
                <AdminPageHeader
                    title="Representantes"
                    icon="fa-handshake"
                    actionLabel="Adicionar Representante"
                    actionIcon="fa-plus"
                    onAction={() => navigate('/representantes/novo')}
                />

                <Tabs
                    activeKey={activeTab}
                    onSelect={(key) => setActiveTab(key || 'cadastro')}
                    className="admin-funcionario-tabs admin-cipa-tabs mt-3"
                >
                    <Tab eventKey="cadastro" title="Cadastro">
                        <div className="admin-table-scroll mt-3">
                            <Table bordered hover className="mb-0 align-middle">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>CPF / CNPJ</th>
                                        <th>Telefone</th>
                                        <th>Cidade</th>
                                        <th>Comissão</th>
                                        <th>Carteira</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && (
                                        <tr>
                                            <td colSpan={7} className="text-muted">Carregando representantes...</td>
                                        </tr>
                                    )}

                                    {!loading && itens.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-muted">Nenhum representante cadastrado.</td>
                                        </tr>
                                    )}

                                    {!loading && itens.map((item) => (
                                        <tr
                                            key={item.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => navigate(`/representantes/${item.id}/editar`)}
                                        >
                                            <td>{item.nome}</td>
                                            <td>{formatDocumento(item.cpf_cnpj)}</td>
                                            <td>{formatPhone(item.telefone) || '—'}</td>
                                            <td>
                                                {item.cidade
                                                    ? `${item.cidade}${item.estado ? `/${item.estado}` : ''}`
                                                    : '—'}
                                            </td>
                                            <td>{formatComissao(item.comissao_percent)}</td>
                                            <td>{Number(item.clientes_qtd) || 0}</td>
                                            <td>
                                                <StatusBadge
                                                    status={String(item.status || '').toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo'}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={7} className="admin-table-footer">
                                            Total de representantes:{' '}
                                            <strong>{loading ? '—' : itens.length}</strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </Tab>

                    <Tab eventKey="comissoes" title="Comissões do mês">
                        <div className="admin-rep-comissoes mt-3">
                            <AdminDateFieldProvider>
                                <div className="admin-rep-comissoes-toolbar">
                                    <AdminDateRangeField
                                        label="Período"
                                        name="rep_comissoes_periodo"
                                        inicio={periodoInicio}
                                        fim={periodoFim}
                                        onChange={({ inicio: nextInicio, fim: nextFim }) => {
                                            setPeriodoInicio(nextInicio || '');
                                            setPeriodoFim(nextFim || '');
                                        }}
                                    />
                                </div>
                            </AdminDateFieldProvider>

                            <div className="admin-rep-comissoes-summary">
                                <article>
                                    <small>Pedidos</small>
                                    <strong>{loadingComissoes ? '—' : (comissaoSummary?.pedidos_qtd ?? 0)}</strong>
                                </article>
                                <article>
                                    <small>Vendas</small>
                                    <strong>{loadingComissoes ? '—' : formatMoney(comissaoSummary?.vendas_total)}</strong>
                                </article>
                                <article className="is-highlight">
                                    <small>Comissões</small>
                                    <strong>{loadingComissoes ? '—' : formatMoney(comissaoSummary?.comissao_total)}</strong>
                                </article>
                            </div>

                            <div className="admin-table-scroll">
                                <Table bordered hover className="mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Representante</th>
                                            <th>Status</th>
                                            <th>%</th>
                                            <th>Pedidos</th>
                                            <th>Vendas</th>
                                            <th>Comissão</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingComissoes && (
                                            <tr>
                                                <td colSpan={6} className="text-muted">Carregando comissões...</td>
                                            </tr>
                                        )}

                                        {!loadingComissoes && comissoes.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-muted">Nenhum representante cadastrado.</td>
                                            </tr>
                                        )}

                                        {!loadingComissoes && comissoes.map((item) => (
                                            <tr
                                                key={item.representante_id}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => navigate(`/representantes/${item.representante_id}/editar`)}
                                            >
                                                <td>{item.nome}</td>
                                                <td>
                                                    <StatusBadge
                                                        status={String(item.status || '').toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo'}
                                                    />
                                                </td>
                                                <td>{formatComissao(item.comissao_percent)}</td>
                                                <td>{item.pedidos_qtd}</td>
                                                <td>{formatMoney(item.vendas_total)}</td>
                                                <td>
                                                    <strong>{formatMoney(item.comissao_total)}</strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Tab>
                </Tabs>
            </section>
        </div>
    );
}
