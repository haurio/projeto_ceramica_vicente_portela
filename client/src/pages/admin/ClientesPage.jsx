import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchClientes } from '../../api/clientes';
import { formatCnpj, formatCpf, formatPhone } from '../../utils/inputMasks';
import { onClienteUpdated } from '../../utils/syncChannel';
import { showToast } from '../../utils/toast';

function formatCurrency(value) {
    const amount = Number(value) || 0;
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDocumentoLista(item) {
    if (!item?.cpf_cnpj) return '—';
    return item.tipo_pessoa === 'Jurídica'
        ? formatCnpj(item.cpf_cnpj)
        : formatCpf(item.cpf_cnpj);
}

export default function ClientesPage() {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadClientes = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);

        try {
            const data = await fetchClientes();
            setClientes(Array.isArray(data) ? data : []);
        } catch (error) {
            if (!silent) {
                showToast('error', error.message || 'Erro ao carregar clientes.');
                setClientes([]);
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClientes();
        const intervalId = setInterval(() => loadClientes(true), 4000);
        const unsubscribe = onClienteUpdated(() => loadClientes(true));
        return () => {
            clearInterval(intervalId);
            unsubscribe();
        };
    }, [loadClientes]);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card">
                <AdminPageHeader
                    title="Gerenciamento de Clientes"
                    icon="fa-user-friends"
                    actionLabel="Adicionar Cliente"
                    actionIcon="fa-user-plus"
                    onAction={() => navigate('/clientes/novo')}
                />

                <div className="admin-table-scroll">
                    <Table bordered hover className="mb-0 align-middle">
                        <thead>
                            <tr>
                                <th>Nome / Razão Social</th>
                                <th>Tipo</th>
                                <th>CPF / CNPJ</th>
                                <th>Telefone</th>
                                <th>Cidade</th>
                                <th>Crédito</th>
                                <th>Status Crédito</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={8} className="text-muted">Carregando clientes...</td>
                                </tr>
                            )}

                            {!loading && clientes.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-muted">Nenhum cliente cadastrado.</td>
                                </tr>
                            )}

                            {!loading && clientes.map((item) => (
                                <tr
                                    key={item.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => navigate(`/clientes/${item.id}/editar`)}
                                >
                                    <td>{item.nome_razao_social}</td>
                                    <td>{item.tipo_pessoa}</td>
                                    <td>{formatDocumentoLista(item)}</td>
                                    <td>{formatPhone(item.telefone_principal) || '—'}</td>
                                    <td>{item.cidade || '—'}</td>
                                    <td>{formatCurrency(item.limite_credito)}</td>
                                    <td><StatusBadge status={item.status_credito || 'Pendente'} /></td>
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
                                <td colSpan={8} className="admin-table-footer">
                                    Total de clientes:{' '}
                                    <strong>{loading ? '—' : clientes.length}</strong>
                                </td>
                            </tr>
                        </tfoot>
                    </Table>
                </div>
            </section>
        </div>
    );
}
