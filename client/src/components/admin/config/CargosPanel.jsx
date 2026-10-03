import { useEffect, useState } from 'react';
import { Button, Form, Modal, Table } from 'react-bootstrap';
import {
    createCargo,
    deleteCargo,
    fetchCargosConfig,
    fetchDepartamentos,
    updateCargo,
} from '../../../api/config';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminPageHeader from '../AdminPageHeader';
import FormSection from '../FormSection';

const EMPTY = { nome: '', departamento_id: '' };

export default function CargosPanel() {
    const [itens, setItens] = useState([]);
    const [departamentos, setDepartamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mode, setMode] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);

    const load = async () => {
        setLoading(true);
        try {
            const [cargos, deps] = await Promise.all([fetchCargosConfig(), fetchDepartamentos()]);
            setItens(Array.isArray(cargos) ? cargos : []);
            setDepartamentos(Array.isArray(deps) ? deps : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar cargos.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const closeEditor = () => {
        setMode('list');
        setEditingId(null);
        setForm(EMPTY);
        setShowDeleteConfirm(false);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm({
            nome: '',
            departamento_id: departamentos[0]?.id ? String(departamentos[0].id) : '',
        });
        setShowDeleteConfirm(false);
        setMode('create');
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm({
            nome: item.nome || '',
            departamento_id: String(item.departamento_id || ''),
        });
        setShowDeleteConfirm(false);
        setMode('edit');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!form.nome.trim() || !form.departamento_id) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = {
                nome: form.nome.trim(),
                departamento_id: Number(form.departamento_id),
            };
            if (editingId) await updateCargo(editingId, payload);
            else await createCargo(payload);
            showToast('success', editingId ? 'Cargo atualizado.' : 'Cargo criado.');
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) return;
        setDeleting(true);
        try {
            await deleteCargo(editingId);
            showToast('success', 'Cargo excluído.');
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
        }
    };

    if (mode === 'create' || mode === 'edit') {
        return (
            <>
                <Form className="admin-funcionario-form admin-config-forma-editor" onSubmit={handleSave}>
                    <FormSection title={mode === 'edit' ? 'Editar cargo' : 'Novo cargo'}>
                        <div className="admin-config-editor-grid">
                            <AdminFloatField
                                label="Nome do cargo"
                                name="nome"
                                value={form.nome}
                                onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Departamento"
                                name="departamento_id"
                                as="select"
                                value={form.departamento_id}
                                onChange={(e) => setForm((c) => ({ ...c, departamento_id: e.target.value }))}
                                required
                                disabled={saving || deleting}
                            >
                                <option value="">Selecione</option>
                                {departamentos.map((d) => (
                                    <option key={d.id} value={String(d.id)}>{d.nome}</option>
                                ))}
                            </AdminFloatField>
                        </div>
                    </FormSection>

                    <div className="admin-config-forma-actions">
                        <div className="admin-config-forma-actions-right">
                            <Button type="button" className="admin-config-btn is-ghost" disabled={saving || deleting} onClick={closeEditor}>
                                <i className="fas fa-arrow-left" aria-hidden="true" />
                                Voltar
                            </Button>
                            {mode === 'edit' ? (
                                <Button type="button" className="admin-config-btn is-danger" disabled={saving || deleting} onClick={() => setShowDeleteConfirm(true)}>
                                    Excluir
                                </Button>
                            ) : null}
                            <Button type="button" className="admin-config-btn is-muted" disabled={saving || deleting} onClick={closeEditor}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="admin-config-btn is-primary" disabled={saving || deleting}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </div>
                    </div>
                </Form>

                <Modal
                    show={showDeleteConfirm}
                    onHide={() => (deleting ? null : setShowDeleteConfirm(false))}
                    centered
                    backdrop="static"
                    className="admin-delete-confirm-modal"
                >
                    <Modal.Header className="admin-delete-confirm-header">
                        <Modal.Title>
                            <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                            Confirmar exclusão
                        </Modal.Title>
                        <AdminModalClose onClick={() => setShowDeleteConfirm(false)} disabled={deleting} />
                    </Modal.Header>
                    <Modal.Body className="admin-delete-confirm-body">
                        <p>Deseja realmente excluir o cargo <strong>{form.nome?.trim() || 'selecionado'}</strong>?</p>
                        <p className="admin-delete-confirm-note">Essa ação não poderá ser desfeita.</p>
                    </Modal.Body>
                    <Modal.Footer className="admin-delete-confirm-footer">
                        <Button type="button" variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                            Cancelar
                        </Button>
                        <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Excluindo...' : 'Sim, excluir'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }

    return (
        <div className="admin-config-panel">
            <AdminPageHeader
                title="Cargos"
                icon="fa-id-badge"
                actionLabel="Adicionar Cargo"
                actionIcon="fa-plus"
                onAction={openCreate}
            />

            <div className="admin-table-scroll">
                <Table bordered hover className="mb-0 align-middle admin-config-table">
                    <thead>
                        <tr>
                            <th>Cargo</th>
                            <th>Departamento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="text-muted">Carregando cargos...</td></tr>
                        ) : itens.length === 0 ? (
                            <tr><td colSpan={2} className="text-muted">Nenhum cargo cadastrado.</td></tr>
                        ) : itens.map((item) => (
                            <tr
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEdit(item)}
                            >
                                <td><strong>{item.nome}</strong></td>
                                <td>{item.departamento_nome || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="admin-table-footer">
                                Total de cargos: <strong>{loading ? '—' : itens.length}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </div>
    );
}
