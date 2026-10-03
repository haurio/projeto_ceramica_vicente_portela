import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table } from 'react-bootstrap';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import StatusBadge from '../../components/admin/StatusBadge';
import { fetchFrota } from '../../api/frota';
import { showToast } from '../../utils/toast';

function formatKm(value) {
    const amount = Number(value) || 0;
    return `${amount.toLocaleString('pt-BR')} km`;
}

export default function FrotaPage() {
    const navigate = useNavigate();
    const [veiculos, setVeiculos] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadFrota = useCallback(async () => {
        setLoading(true);

        try {
            const data = await fetchFrota();
            setVeiculos(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar frota.');
            setVeiculos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadFrota();
    }, [loadFrota]);

    return (
        <div className="admin-page-fill">
            <section className="admin-panel-card admin-page-card admin-frota-page">
                <AdminPageHeader
                    title="Gerenciamento de Frota"
                    icon="fa-truck"
                    actionLabel="Adicionar Veículo"
                    actionIcon="fa-plus"
                    onAction={() => navigate('/frota/novo')}
                />

                <div className="admin-frota-table-block">
                    <div className="admin-table-scroll">
                        <Table bordered hover className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th>Placa</th>
                                    <th>Marca</th>
                                    <th>Modelo</th>
                                    <th>Tipo</th>
                                    <th>Ano</th>
                                    <th>Motorista</th>
                                    <th>CNH</th>
                                    <th>Telefone</th>
                                    <th>KM</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={10} className="text-muted">Carregando frota...</td>
                                    </tr>
                                )}

                                {!loading && veiculos.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-muted">Nenhum veículo cadastrado.</td>
                                    </tr>
                                )}

                                {!loading && veiculos.map((item) => (
                                    <tr
                                        key={item.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => navigate(`/frota/${item.id}/editar`)}
                                    >
                                        <td>{item.placa || '—'}</td>
                                        <td>{item.marca || '—'}</td>
                                        <td>{item.modelo}</td>
                                        <td>{item.tipo || '—'}</td>
                                        <td>{item.ano || '—'}</td>
                                        <td>{item.motorista || '—'}</td>
                                        <td>
                                            {item.motorista_cnh_categoria
                                                ? `Cat. ${item.motorista_cnh_categoria}`
                                                : '—'}
                                        </td>
                                        <td>{item.motorista_telefone || '—'}</td>
                                        <td>{formatKm(item.quilometragem)}</td>
                                        <td>
                                            <StatusBadge
                                                status={String(item.status || '').toLowerCase() === 'ativo' ? 'Ativo' : 'Inativo'}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    <div className="admin-table-footer-bar">
                        Total de veículos:{' '}
                        <strong>{loading ? '—' : veiculos.length}</strong>
                    </div>
                </div>
            </section>
        </div>
    );
}
