import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tab, Table, Tabs } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import EstoquePanel from '../../components/admin/estoque/EstoquePanel';
import { fetchProdutos } from '../../api/produtos';
import { showToast } from '../../utils/toast';

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatMedidas(item) {
    const parts = [item.altura_cm, item.largura_cm, item.comprimento_cm]
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map((value) => Number(value));

    if (!parts.length) return '—';
    return `${parts.join('x')} cm`;
}

function resolveTab(value) {
    if (value === 'estoque' || value === 'movimentacoes') return value;
    return 'produtos';
}

export default function ProdutosPage() {
    const navigate = useNavigate();
    const estoqueRef = useRef(null);
    const movimentacoesRef = useRef(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => resolveTab(searchParams.get('tab')));
    const [produtos, setProdutos] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadProdutos = useCallback(async () => {
        setLoading(true);

        try {
            const data = await fetchProdutos();
            setProdutos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar produtos.');
            setProdutos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProdutos();
    }, [loadProdutos]);

    useEffect(() => {
        setActiveTab(resolveTab(searchParams.get('tab')));
    }, [searchParams]);

    const handleTabSelect = (key) => {
        const next = resolveTab(key);
        setActiveTab(next);
        if (next === 'estoque' || next === 'movimentacoes') {
            setSearchParams({ tab: next });
        } else {
            setSearchParams({});
        }
    };

    const isEstoqueLike = activeTab === 'estoque' || activeTab === 'movimentacoes';
    const activeRef = activeTab === 'movimentacoes' ? movimentacoesRef : estoqueRef;

    const headerTitle = {
        produtos: 'Produtos',
        estoque: 'Estoque',
        movimentacoes: 'Movimentações',
    }[activeTab] || 'Produtos';

    const headerIcon = {
        produtos: 'fa-box',
        estoque: 'fa-warehouse',
        movimentacoes: 'fa-exchange-alt',
    }[activeTab] || 'fa-box';

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card">
                <AdminPageHeader
                    title={headerTitle}
                    icon={headerIcon}
                    actionLabel={activeTab === 'produtos' ? 'Adicionar Produto' : undefined}
                    actionIcon="fa-plus"
                    onAction={activeTab === 'produtos' ? () => navigate('/produtos/novo') : undefined}
                    actions={isEstoqueLike ? (
                        <>
                            <Button
                                variant="primary"
                                className="admin-estoque-header-btn is-producao"
                                onClick={() => activeRef.current?.openProducao()}
                            >
                                <i className="fas fa-industry me-2" aria-hidden="true" />
                                Entrada / Produção
                            </Button>
                            <Button
                                variant="danger"
                                className="admin-estoque-header-btn is-saida"
                                onClick={() => activeRef.current?.openSaida()}
                            >
                                <i className="fas fa-minus-circle me-2" aria-hidden="true" />
                                Saída manual
                            </Button>
                        </>
                    ) : null}
                />

                <Tabs
                    activeKey={activeTab}
                    onSelect={handleTabSelect}
                    className="admin-funcionario-tabs admin-modal-tabs mb-3"
                >
                    <Tab
                        eventKey="produtos"
                        title={(
                            <span>
                                <i className="fas fa-box me-2" aria-hidden="true" />
                                Produtos
                            </span>
                        )}
                    >
                        <div className="admin-table-wrap">
                            <Table responsive hover className="admin-table mb-0">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nome</th>
                                        <th>Categoria</th>
                                        <th>Medidas</th>
                                        <th>Peso</th>
                                        <th>Preço / milheiro</th>
                                        <th>Preço / m²</th>
                                        <th>Estoque</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4">
                                                Carregando produtos...
                                            </td>
                                        </tr>
                                    ) : produtos.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4">
                                                Nenhum produto cadastrado.
                                            </td>
                                        </tr>
                                    ) : produtos.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="admin-table-row-clickable"
                                            onClick={() => navigate(`/produtos/${item.id}`)}
                                        >
                                            <td>{item.codigo || '—'}</td>
                                            <td>{item.nome}</td>
                                            <td>{item.categoria || '—'}</td>
                                            <td>{formatMedidas(item)}</td>
                                            <td>
                                                {item.peso_kg != null && item.peso_kg !== ''
                                                    ? `${Number(item.peso_kg).toLocaleString('pt-BR')} kg`
                                                    : '—'}
                                            </td>
                                            <td>{formatCurrency(item.preco_milheiro)}</td>
                                            <td>{formatCurrency(item.preco_m2)}</td>
                                            <td>{`${Number(item.estoque) || 0} ${item.unidade || 'un'}`}</td>
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
                                        <td colSpan={9} className="admin-table-footer">
                                            Total de produtos:{' '}
                                            <strong>{loading ? '—' : produtos.length}</strong>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </Tab>

                    <Tab
                        eventKey="estoque"
                        title={(
                            <span>
                                <i className="fas fa-warehouse me-2" aria-hidden="true" />
                                Estoque
                            </span>
                        )}
                    >
                        <EstoquePanel ref={estoqueRef} active={activeTab === 'estoque'} mode="estoque" />
                    </Tab>

                    <Tab
                        eventKey="movimentacoes"
                        title={(
                            <span>
                                <i className="fas fa-exchange-alt me-2" aria-hidden="true" />
                                Movimentações
                            </span>
                        )}
                    >
                        <EstoquePanel
                            ref={movimentacoesRef}
                            active={activeTab === 'movimentacoes'}
                            mode="movimentacoes"
                        />
                    </Tab>
                </Tabs>
            </section>
        </div>
    );
}
