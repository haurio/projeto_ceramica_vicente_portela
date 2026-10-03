import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchFornecedores } from '../../api/fornecedores';
import { showToast } from '../../utils/toast';

export default function FornecedoresPage() {
    const navigate = useNavigate();
    const [fornecedores, setFornecedores] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFornecedores = useCallback(async () => {
        setLoading(true);

        try {
            const data = await fetchFornecedores();
            setFornecedores(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar fornecedores.');
            setFornecedores([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFornecedores();
    }, [loadFornecedores]);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card">
                <AdminPageHeader
                    title="Gerenciamento de Fornecedores"
                    icon="fa-user-tie"
                    actionLabel="Adicionar Fornecedor"
                    actionIcon="fa-plus"
                    onAction={() => navigate('/fornecedores/novo')}
                />

                <div className="admin-table-scroll">
                    <Table bordered hover className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Razão Social</th>
                                <th>CNPJ</th>
                                <th>Contato</th>
                                <th>Telefone</th>
                                <th>Cidade</th>
                                <th>Estado</th>
                                <th>Ativo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="text-muted">Carregando fornecedores...</td>
                                </tr>
                            )}

                            {!loading && fornecedores.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted">Nenhum fornecedor cadastrado.</td>
                                </tr>
                            )}

                            {!loading && fornecedores.map((item) => (
                                <tr
                                    key={item.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/fornecedores/${item.id}/editar`)}
                                >
                                    <td>{item.razao_social}</td>
                                    <td>{item.cnpj}</td>
                                    <td>{item.nome_contato || item.email_contato || '—'}</td>
                                    <td>{item.telefone_contato || '—'}</td>
                                    <td>{item.cidade || '—'}</td>
                                    <td>{item.estado || '—'}</td>
                                    <td>
                                        <StatusBadge status={item.ativo === 'sim' ? 'Sim' : 'Não'} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} className="admin-table-footer">
                                    Total de fornecedores:{' '}
                                    <strong>{loading ? '—' : fornecedores.length}</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            </section>
        </div>
    );
}
