import { useEffect, useState } from 'react';
import { Button, Form, Modal, Table } from 'react-bootstrap';
import {
    createNfeNatureza,
    deleteNfeNatureza,
    fetchNfeNaturezas,
    updateNfeNatureza,
} from '../../../api/config';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminPageHeader from '../AdminPageHeader';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';
import StatusBadge from '../StatusBadge';

const EMPTY = { cfop: '', natureza: '', ambito: 'interno', ativo: true };

const AMBITO_LABEL = {
    interno: 'Interno',
    interestadual: 'Interestadual',
    entrada: 'Entrada',
};

export default function NaturezasNfePanel() {
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
            const data = await fetchNfeNaturezas();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar naturezas.');
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
            cfop: item.cfop || '',
            natureza: item.natureza || '',
            ambito: item.ambito || 'interno',
            ativo: item.ativo !== false,
        });
        setShowDeleteConfirm(false);
        setMode('edit');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!form.cfop.trim() || !form.natureza.trim()) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            if (editingId) await updateNfeNatureza(editingId, form);
            else await createNfeNatureza(form);
            showToast('success', editingId ? 'Natureza atualizada.' : 'Natureza criada.');
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
            await deleteNfeNatureza(editingId);
            showToast('success', 'Natureza excluída.');
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
                    <FormSection title={mode === 'edit' ? 'Editar natureza' : 'Nova natureza'}>
                        <div className="admin-config-editor-grid admin-config-editor-grid-nfe">
                            <AdminFloatField
                                label="CFOP"
                                name="cfop"
                                value={form.cfop}
                                onChange={(e) => setForm((c) => ({ ...c, cfop: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Natureza da operação"
                                name="natureza"
                                value={form.natureza}
                                onChange={(e) => setForm((c) => ({ ...c, natureza: e.target.value }))}
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Âmbito"
                                name="ambito"
                                as="select"
                                value={form.ambito}
                                onChange={(e) => setForm((c) => ({ ...c, ambito: e.target.value }))}
                                disabled={saving || deleting}
                            >
                                <option value="interno">Interno (mesma UF)</option>
                                <option value="interestadual">Interestadual</option>
                                <option value="entrada">Entrada / devolução</option>
                            </AdminFloatField>
                            <AdminStatusToggle
                                checked={form.ativo}
                                onChange={(event) => setForm((c) => ({ ...c, ativo: Boolean(event.target.checked) }))}
                                label="Status"
                                onLabel="Ativa"
                                offLabel="Inativa"
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
                        <p>Deseja realmente excluir o CFOP <strong>{form.cfop || 'selecionado'}</strong>?</p>
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
                title="Naturezas NF-e"
                icon="fa-file-alt"
                actionLabel="Adicionar Natureza"
                actionIcon="fa-plus"
                onAction={openCreate}
            />

            <div className="admin-table-scroll">
                <Table bordered hover className="mb-0 align-middle admin-config-table">
                    <thead>
                        <tr>
                            <th>CFOP</th>
                            <th>Natureza</th>
                            <th>Âmbito</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={4} className="text-muted">Carregando naturezas...</td></tr>
                        ) : itens.length === 0 ? (
                            <tr><td colSpan={4} className="text-muted">Nenhuma natureza cadastrada.</td></tr>
                        ) : itens.map((item) => (
                            <tr
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEdit(item)}
                            >
                                <td><strong>{item.cfop}</strong></td>
                                <td>{item.natureza}</td>
                                <td>{AMBITO_LABEL[item.ambito] || item.ambito}</td>
                                <td><StatusBadge status={item.ativo ? 'Ativo' : 'Inativo'} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={4} className="admin-table-footer">
                                Total de naturezas: <strong>{loading ? '—' : itens.length}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>
        </div>
    );
}
