import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { fetchEmpresas } from '../../api/empresa';
import { formatCnpj, formatPhone } from '../../utils/inputMasks';
import { showToast } from '../../utils/toast';

export default function EmpresaPage() {
    const navigate = useNavigate();
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadEmpresas = useCallback(async () => {
        setLoading(true);

        try {
            const data = await fetchEmpresas();
            setEmpresas(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar empresas.');
            setEmpresas([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEmpresas();
    }, [loadEmpresas]);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card">
                <AdminPageHeader
                    title="Gerenciamento da Empresa"
                    icon="fa-building"
                    actionLabel="Adicionar Empresa"
                    actionIcon="fa-plus"
                    onAction={() => navigate('/empresa/novo')}
                />

                <div className="admin-table-scroll">
                    <Table bordered hover className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Razão Social</th>
                                <th>CNPJ</th>
                                <th>Inscrição Municipal</th>
                                <th>Email</th>
                                <th>Telefone</th>
                                <th>Cidade</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="text-muted">Carregando empresas...</td>
                                </tr>
                            )}

                            {!loading && empresas.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted">Nenhuma empresa cadastrada.</td>
                                </tr>
                            )}

                            {!loading && empresas.map((item) => (
                                <tr
                                    key={item.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/empresa/${item.id}/editar`)}
                                >
                                    <td>{item.razao_social}</td>
                                    <td>{formatCnpj(item.cnpj)}</td>
                                    <td>{item.inscricao_municipal || '—'}</td>
                                    <td>{item.email || '—'}</td>
                                    <td>{formatPhone(item.telefone) || '—'}</td>
                                    <td>{item.cidade || '—'}</td>
                                    <td>{item.estado || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={7} className="admin-table-footer">
                                    Total de empresas:{' '}
                                    <strong>{loading ? '—' : empresas.length}</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            </section>
        </div>
    );
}
