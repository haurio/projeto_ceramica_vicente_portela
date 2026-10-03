import { useEffect, useState } from 'react';
import { Button, Form, Modal, Table } from 'react-bootstrap';
import {
    createBanco,
    deleteBanco,
    fetchBancosConfig,
    updateBanco,
} from '../../../api/config';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminPageHeader from '../AdminPageHeader';
import FormSection from '../FormSection';

const EMPTY = { nome: '', codigo: '' };

export default function BancosPanel() {
    const [itens, setItens] = useState([]);
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
            const data = await fetchBancosConfig();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar bancos.');
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
        setForm(EMPTY);
        setShowDeleteConfirm(false);
        setMode('create');
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm({
            nome: item.nome || '',
            codigo: item.codigo || '',
        });
        setShowDeleteConfirm(false);
        setMode('edit');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!form.nome.trim() || !form.codigo.trim()) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            if (editingId) await updateBanco(editingId, form);
            else await createBanco(form);
            showToast('success', editingId ? 'Banco atualizado.' : 'Banco criado.');
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
            await deleteBanco(editingId);
            showToast('success', 'Banco excluído.');
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
                    <FormSection title={mode === 'edit' ? 'Editar banco' : 'Novo banco'}>
                        <div className="admin-config-editor-grid">
                            <AdminFloatField
                                label="Código (3 dígitos)"
                                name="codigo"
                                value={form.codigo}
                                onChange={(e) => setForm((c) => ({ ...c, codigo: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Nome do banco"
                                name="nome"
                                value={form.nome}
                                onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))}
                                required
                                disabled={saving || deleting}
                            />
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
                        <p>
                            Deseja realmente excluir o banco{' '}
                            <strong>{[form.codigo, form.nome].filter(Boolean).join(' - ') || 'selecionado'}</strong>?
                        </p>
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
                title="Bancos"
                icon="fa-university"
                actionLabel="Adicionar Banco"
                actionIcon="fa-plus"
                onAction={openCreate}
            />

            <div className="admin-table-scroll">
                <Table bordered hover className="mb-0 align-middle admin-config-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Banco</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={2} className="text-muted">Carregando bancos...</td></tr>
                        ) : itens.length === 0 ? (
                            <tr><td colSpan={2} className="text-muted">Nenhum banco cadastrado.</td></tr>
                        ) : itens.map((item) => (
                            <tr
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEdit(item)}
                            >
                                <td><strong>{item.codigo}</strong></td>
                                <td>{item.nome}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={2} className="admin-table-footer">
                                Total de bancos: <strong>{loading ? '—' : itens.length}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </div>
    );
}
