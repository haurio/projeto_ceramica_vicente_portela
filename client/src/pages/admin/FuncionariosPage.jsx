import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { Table } from 'react-bootstrap';

import AdminPageHeader from '../../components/admin/AdminPageHeader';

import StatusBadge from '../../components/admin/StatusBadge';

import { fetchEmployees } from '../../api/funcionarios';

import { showToast } from '../../utils/toast';



export default function FuncionariosPage() {

    const navigate = useNavigate();

    const [employees, setEmployees] = useState([]);

    const [loading, setLoading] = useState(true);



    const loadEmployees = useCallback(async () => {

        setLoading(true);



        try {

            const data = await fetchEmployees();

            setEmployees(Array.isArray(data) ? data : []);

        } catch (error) {

            showToast('error', error.message || 'Erro ao carregar funcionários.');

            setEmployees([]);

        } finally {

            setLoading(false);

        }

    }, []);



    useEffect(() => {

        loadEmployees();

    }, [loadEmployees]);



    return (

        <div className="admin-page-fill">

            <section className="admin-panel-card admin-page-card">

                <AdminPageHeader

                    title="Gerenciamento de Funcionários"

                    icon="fa-users"

                    actionLabel="Adicionar Funcionário"

                    actionIcon="fa-user-plus"

                    onAction={() => navigate('/funcionarios/novo')}

                />



                <div className="admin-table-scroll">

                    <Table bordered hover className="mb-0 align-middle">

                    <thead>

                        <tr>

                            <th>Nome</th>

                            <th>CPF</th>

                            <th>Cargo</th>

                            <th>Email</th>

                            <th>Departamento</th>

                            <th>Status</th>

                        </tr>

                    </thead>

                    <tbody>

                        {loading && (

                            <tr>

                                <td colSpan={6} className="text-muted">Carregando funcionários...</td>

                            </tr>

                        )}



                        {!loading && employees.length === 0 && (

                            <tr>

                                <td colSpan={6} className="text-muted">Nenhum funcionário cadastrado.</td>

                            </tr>

                        )}



                        {!loading && employees.map((employee) => (

                            <tr

                                key={employee.id}

                                style={{ cursor: 'pointer' }}

                                onClick={() => navigate(`/funcionarios/${employee.id}/editar`)}

                            >

                                <td>{employee.name || ''}</td>

                                <td>{employee.cpf || ''}</td>

                                <td>{employee.position || ''}</td>

                                <td>{employee.email || ''}</td>

                                <td>{employee.department || ''}</td>

                                <td><StatusBadge status={employee.status} /></td>

                            </tr>

                        ))}

                    </tbody>

                    <tfoot>
                        <tr>
                            <td colSpan={6} className="admin-table-footer">
                                Total de funcionários:{' '}
                                <strong>{loading ? '—' : employees.length}</strong>
                            </td>
                        </tr>
                    </tfoot>

                    </Table>

                </div>

            </section>

        </div>

    );

}

