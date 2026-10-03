import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Modal, Table } from 'react-bootstrap';
import {
    createFreteCidade,
    deleteFreteCidade,
    fetchFreteCidades,
    updateFreteCidade,
} from '../../../api/config';
import { useViaCep } from '../../../hooks/useViaCep';
import {
    formatCep,
    formatMoneyBr,
    formatMoneyBrFromNumber,
    parseMoneyBr,
} from '../../../utils/inputMasks';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminPageHeader from '../AdminPageHeader';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';
import StatusBadge from '../StatusBadge';
import FreteDestinoMap from '../frota/FreteDestinoMap';
import FrotaRotasMap from '../frota/FrotaRotasMap';

const EMPTY = {
    cep: '',
    cidade: '',
    uf: '',
    valor_frete: '',
    ativo: true,
    observacao: '',
};

function formatMoney(value) {
    return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

export default function FreteCidadesPanel() {
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mode, setMode] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [showRotasModal, setShowRotasModal] = useState(false);
    const [filtroUf, setFiltroUf] = useState('');
    const [buscaCidade, setBuscaCidade] = useState('');

    const { handleCepBlur, loading: cepLoading } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => ({
                ...current,
                cidade: address.city || '',
                uf: address.state || '',
                observacao: current.observacao?.trim()
                    ? current.observacao
                    : [address.street, address.neighborhood].filter(Boolean).join(', '),
            }));
        },
        onError: (message) => showToast('warning', message),
    });

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchFreteCidades();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar custos de frete.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const ufsDisponiveis = useMemo(() => (
        [...new Set(itens.map((item) => String(item.uf || '').toUpperCase()).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    ), [itens]);

    const itensFiltrados = useMemo(() => {
        const termo = normalizeText(buscaCidade);
        const uf = String(filtroUf || '').toUpperCase();
        return itens.filter((item) => {
            if (uf && String(item.uf || '').toUpperCase() !== uf) return false;
            if (!termo) return true;
            return normalizeText(item.cidade).includes(termo)
                || normalizeText(item.cep).includes(termo);
        });
    }, [itens, filtroUf, buscaCidade]);

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
            cep: item.cep ? formatCep(item.cep) : '',
            cidade: item.cidade || '',
            uf: item.uf || '',
            valor_frete: formatMoneyBrFromNumber(item.valor_frete ?? 0),
            ativo: item.ativo !== false,
            observacao: item.observacao || '',
        });
        setShowDeleteConfirm(false);
        setMode('edit');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if (!form.cidade.trim() || !form.uf.trim()) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = {
                cep: form.cep || '',
                cidade: form.cidade.trim(),
                uf: form.uf.trim().toUpperCase(),
                valor_frete: parseMoneyBr(form.valor_frete),
                ativo: form.ativo !== false,
                observacao: form.observacao || '',
            };
            if (editingId) await updateFreteCidade(editingId, payload);
            else await createFreteCidade(payload);
            showToast('success', editingId ? 'Custo de frete atualizado.' : 'Custo de frete cadastrado.');
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
            await deleteFreteCidade(editingId);
            showToast('success', 'Custo de frete excluído.');
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
        }
    };

    if (mode === 'create' || mode === 'edit') {
        const canShowMap = Boolean(form.cidade.trim() && form.uf.trim());

        return (
            <>
                <Form className="admin-funcionario-form admin-config-forma-editor" onSubmit={handleSave}>
                    <FormSection title={mode === 'edit' ? 'Editar custo de frete' : 'Novo custo de frete'}>
                        <div className="admin-config-editor-grid admin-config-editor-grid-frete">
                            <AdminFloatField
                                label="CEP"
                                name="cep"
                                value={form.cep}
                                onChange={(e) => setForm((c) => ({ ...c, cep: formatCep(e.target.value) }))}
                                onBlur={(e) => handleCepBlur(e.target.value)}
                                placeholder="00000-000"
                                disabled={saving || deleting || cepLoading}
                            />
                            <AdminFloatField
                                label="Cidade"
                                name="cidade"
                                value={form.cidade}
                                readOnly
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="UF"
                                name="uf"
                                value={form.uf}
                                readOnly
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Valor do frete (R$)"
                                name="valor_frete"
                                value={form.valor_frete}
                                onChange={(e) => setForm((c) => ({ ...c, valor_frete: formatMoneyBr(e.target.value) }))}
                                required
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                label="Observação"
                                name="observacao"
                                value={form.observacao}
                                onChange={(e) => setForm((c) => ({ ...c, observacao: e.target.value }))}
                                disabled={saving || deleting}
                            />
                            <AdminStatusToggle
                                checked={form.ativo}
                                onChange={(event) => setForm((c) => ({ ...c, ativo: Boolean(event.target.checked) }))}
                                label="Status"
                                onLabel="Ativo"
                                offLabel="Inativo"
                                disabled={saving || deleting}
                            />
                        </div>
                        {cepLoading ? (
                            <p className="admin-config-section-hint mb-0">Buscando CEP...</p>
                        ) : null}
                    </FormSection>

                    {canShowMap ? (
                        <FreteDestinoMap
                            freteId={editingId}
                            cidade={form.cidade}
                            uf={form.uf}
                        />
                    ) : null}

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
                            Deseja realmente excluir o custo de frete de{' '}
                            <strong>{form.cidade && form.uf ? `${form.cidade}/${form.uf}` : 'esta cidade'}</strong>?
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
                title="Custo de frete"
                icon="fa-truck-loading"
            />

            <div className="admin-frete-toolbar">
                <div className="admin-frete-toolbar-filters">
                    <select
                        className="admin-frete-filter-uf"
                        value={filtroUf}
                        onChange={(event) => setFiltroUf(event.target.value)}
                        aria-label="Filtrar por estado"
                    >
                        <option value="">Todos</option>
                        {ufsDisponiveis.map((uf) => (
                            <option key={uf} value={uf}>{uf}</option>
                        ))}
                    </select>
                    <label className="admin-frete-search">
                        <i className="fas fa-search" aria-hidden="true" />
                        <input
                            type="search"
                            value={buscaCidade}
                            onChange={(event) => setBuscaCidade(event.target.value)}
                            placeholder="Pesquisar cidade..."
                        />
                    </label>
                </div>
                <div className="admin-frete-toolbar-actions">
                    <Button
                        type="button"
                        variant="primary"
                        className="admin-frete-header-btn"
                        onClick={() => setShowRotasModal(true)}
                    >
                        <i className="fas fa-route me-2" aria-hidden="true" />
                        Calcular distâncias
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        className="admin-frete-header-btn"
                        onClick={openCreate}
                    >
                        <i className="fas fa-plus me-2" aria-hidden="true" />
                        Adicionar Cidade
                    </Button>
                </div>
            </div>

            <div className="admin-table-scroll">
                <Table bordered hover className="mb-0 align-middle admin-config-table">
                    <thead>
                        <tr>
                            <th>Cidade</th>
                            <th>UF</th>
                            <th>CEP</th>
                            <th>Valor frete</th>
                            <th>Distância</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-muted">Carregando custos de frete...</td></tr>
                        ) : itensFiltrados.length === 0 ? (
                            <tr><td colSpan={6} className="text-muted">Nenhuma cidade encontrada.</td></tr>
                        ) : itensFiltrados.map((item) => (
                            <tr
                                key={item.id}
                                style={{ cursor: 'pointer' }}
                                onClick={() => openEdit(item)}
                            >
                                <td><strong>{item.cidade}</strong></td>
                                <td>{item.uf}</td>
                                <td>{item.cep || '—'}</td>
                                <td>{formatMoney(item.valor_frete)}</td>
                                <td>{item.distancia_km != null ? `${Number(item.distancia_km).toLocaleString('pt-BR')} km` : '—'}</td>
                                <td><StatusBadge status={item.ativo ? 'Ativo' : 'Inativo'} /></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={6} className="admin-table-footer">
                                Total de cidades: <strong>{loading ? '—' : itensFiltrados.length}</strong>
                                {!loading && itensFiltrados.length !== itens.length
                                    ? ` (de ${itens.length})`
                                    : ''}
                            </td>
                        </tr>
                    </tfoot>
                </Table>
            </div>

            <FrotaRotasMap
                show={showRotasModal}
                onHide={() => setShowRotasModal(false)}
                onDone={load}
            />
        </div>
    );
}
