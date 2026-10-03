import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    createAcidente,
    createEntrega,
    createEpi,
    createEquipamento,
    createManutencao,
    deleteAcidente,
    deleteEntrega,
    deleteEpi,
    deleteEquipamento,
    deleteManutencao,
    updateAcidente,
    updateEntrega,
    updateEpi,
    updateEquipamento,
    updateManutencao,
    uploadAcidenteFoto,
} from '../../../api/cipa';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminImageUpload from '../AdminImageUpload';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

function dateOnly(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

function parseFotosList(raw) {
    if (Array.isArray(raw)) return raw.map((item) => String(item || '').trim()).filter(Boolean);
    if (typeof raw === 'string' && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim()).filter(Boolean);
        } catch (_error) {
            return raw.split(',').map((item) => item.trim()).filter(Boolean);
        }
    }
    return [];
}

function DeleteConfirm({ show, title, name, deleting, onCancel, onConfirm }) {
    return (
        <Modal
            show={show}
            onHide={() => (deleting ? null : onCancel())}
            centered
            backdrop="static"
            className="admin-delete-confirm-modal"
        >
            <Modal.Header className="admin-delete-confirm-header">
                <Modal.Title>
                    <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                    Confirmar exclusão
                </Modal.Title>
                <AdminModalClose onClick={onCancel} disabled={deleting} />
            </Modal.Header>
            <Modal.Body className="admin-delete-confirm-body">
                <p>
                    Deseja realmente excluir
                    {' '}
                    <strong>{name || title}</strong>
                    ?
                </p>
                <p className="admin-delete-confirm-note">Essa ação não poderá ser desfeita.</p>
            </Modal.Body>
            <Modal.Footer className="admin-delete-confirm-footer">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={deleting}>
                    Cancelar
                </Button>
                <Button type="button" variant="danger" onClick={onConfirm} disabled={deleting}>
                    {deleting ? 'Excluindo...' : 'Sim, excluir'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}

export function EpiModal({ show, item, fornecedores = [], onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return;
        setForm({
            nome: item?.nome || '',
            ca_numero: item?.ca_numero || '',
            categoria: item?.categoria || '',
            fabricante: item?.fabricante || '',
            validade_ca: dateOnly(item?.validade_ca),
            estoque_atual: item?.estoque_atual ?? 0,
            estoque_minimo: item?.estoque_minimo ?? 0,
            vida_util_dias: item?.vida_util_dias ?? '',
            fornecedor_id: item?.fornecedor_id || '',
            nota_produto: item?.nota_produto || '',
            status: item?.status === 'Inativo' ? 'Inativo' : 'Ativo',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!String(form.nome || '').trim()) {
            setInvalid({ nome: true });
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                nome: form.nome.trim(),
                fornecedor_id: form.fornecedor_id || null,
            };
            if (isEdit) await updateEpi(item.id, payload);
            else await createEpi(payload);
            showToast('success', isEdit ? 'EPI atualizado.' : 'EPI cadastrado.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar EPI.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteEpi(item.id);
            showToast('success', 'EPI excluído.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir EPI.');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-cipa-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-hard-hat' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar EPI' : 'Novo EPI'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <FormSection title="Identificação e estoque">
                            <Row className="g-3">
                                <Col md={6}>
                                    <AdminFloatField
                                        label="Nome do EPI"
                                        name="nome"
                                        value={form.nome}
                                        onChange={(e) => setField('nome', e.target.value)}
                                        required
                                        isInvalid={Boolean(invalid.nome)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <AdminFloatField
                                        label="Nº CA"
                                        name="ca_numero"
                                        value={form.ca_numero}
                                        onChange={(e) => setField('ca_numero', e.target.value)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <AdminFloatField
                                        label="Categoria"
                                        name="categoria"
                                        value={form.categoria}
                                        onChange={(e) => setField('categoria', e.target.value)}
                                        placeholder="Capacete, luva..."
                                    />
                                </Col>
                                <Col md={4}>
                                    <AdminFloatField
                                        as="select"
                                        label="Fornecedor"
                                        name="fornecedor_id"
                                        value={form.fornecedor_id}
                                        onChange={(e) => setField('fornecedor_id', e.target.value)}
                                    >
                                        <option value="">Selecione o fornecedor</option>
                                        {fornecedores.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.nome_fantasia || f.razao_social}
                                            </option>
                                        ))}
                                    </AdminFloatField>
                                </Col>
                                <Col md={4}>
                                    <AdminFloatField
                                        label="Nota do produto"
                                        name="nota_produto"
                                        value={form.nota_produto}
                                        onChange={(e) => setField('nota_produto', e.target.value)}
                                        placeholder="NF / pedido de compra"
                                    />
                                </Col>
                                <Col md={4}>
                                    <AdminFloatField
                                        label="Fabricante"
                                        name="fabricante"
                                        value={form.fabricante}
                                        onChange={(e) => setField('fabricante', e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <AdminFloatField
                                        label="Qtd. estoque"
                                        name="estoque_atual"
                                        type="number"
                                        min={0}
                                        value={form.estoque_atual}
                                        onChange={(e) => setField('estoque_atual', e.target.value)}
                                        required
                                    />
                                </Col>
                                <Col md={2}>
                                    <AdminFloatField
                                        label="Estoque mín."
                                        name="estoque_minimo"
                                        type="number"
                                        min={0}
                                        value={form.estoque_minimo}
                                        onChange={(e) => setField('estoque_minimo', e.target.value)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <AdminDateField
                                        label="Validade do CA"
                                        name="validade_ca"
                                        value={form.validade_ca}
                                        onChange={(e) => setField('validade_ca', e.target.value)}
                                    />
                                </Col>
                                <Col md={2}>
                                    <AdminFloatField
                                        label="Vida útil (dias)"
                                        name="vida_util_dias"
                                        type="number"
                                        min={1}
                                        value={form.vida_util_dias}
                                        onChange={(e) => setField('vida_util_dias', e.target.value)}
                                    />
                                </Col>
                                <Col md={3}>
                                    <AdminStatusToggle
                                        label="Status"
                                        name="status"
                                        checked={form.status === 'Ativo'}
                                        onLabel="Ativo"
                                        offLabel="Inativo"
                                        onChange={(e) => setField('status', e.target.checked ? 'Ativo' : 'Inativo')}
                                    />
                                </Col>
                                <Col md={12}>
                                    <AdminFloatField
                                        as="textarea"
                                        label="Observações"
                                        name="observacoes"
                                        value={form.observacoes}
                                        onChange={(e) => setField('observacoes', e.target.value)}
                                        rows={2}
                                    />
                                </Col>
                            </Row>
                        </FormSection>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                                Excluir
                            </Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm
                show={confirmDelete}
                title="EPI"
                name={form.nome}
                deleting={deleting}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
            />
        </AdminDateFieldProvider>
    );
}

export function EntregaModal({ show, item, epis, funcionarios, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return;
        setForm({
            epi_id: item?.epi_id || '',
            funcionario_id: item?.funcionario_id || '',
            funcionario_nome: item?.funcionario_nome || '',
            quantidade: item?.quantidade ?? 1,
            data_entrega: dateOnly(item?.data_entrega) || new Date().toISOString().slice(0, 10),
            data_validade: dateOnly(item?.data_validade),
            data_devolucao: dateOnly(item?.data_devolucao),
            motivo: item?.motivo || 'Entrega',
            status: item?.status || 'Em uso',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleFuncionario = (id) => {
        const found = funcionarios.find((f) => String(f.id) === String(id));
        setForm((current) => ({
            ...current,
            funcionario_id: id,
            funcionario_nome: found?.name || found?.full_name || found?.nome || current.funcionario_nome,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!form.epi_id) nextInvalid.epi_id = true;
        if (!form.data_entrega) nextInvalid.data_entrega = true;
        setInvalid(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const isExchange = form.motivo === 'Troca' || form.motivo === 'Reposição';
            const podeArquivar = isEdit && ['Em uso', 'Expirado'].includes(String(item?.status || ''));

            if (isExchange && (podeArquivar || !isEdit)) {
                await createEntrega({
                    ...form,
                    status: 'Em uso',
                    data_devolucao: '',
                    substitui_entrega_id: podeArquivar ? item.id : undefined,
                });
                showToast('success', form.motivo === 'Troca'
                    ? 'Troca registrada. A entrega anterior ficou no histórico.'
                    : 'Reposição registrada. A entrega anterior ficou no histórico.');
            } else if (isEdit) {
                await updateEntrega(item.id, form);
                showToast('success', 'Entrega atualizada.');
            } else {
                await createEntrega(form);
                showToast('success', 'Entrega registrada.');
            }
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar entrega.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteEntrega(item.id);
            showToast('success', 'Entrega excluída.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir entrega.');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-cipa-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-hand-holding-medical' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar entrega de EPI' : 'Nova entrega de EPI'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <AdminFloatField
                                    as="select"
                                    label="EPI"
                                    name="epi_id"
                                    value={form.epi_id}
                                    onChange={(e) => setField('epi_id', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.epi_id)}
                                    disabled={isEdit}
                                >
                                    <option value="">Selecione</option>
                                    {epis.map((epi) => (
                                        <option key={epi.id} value={epi.id}>
                                            {epi.nome}
                                            {epi.ca_numero ? ` (CA ${epi.ca_numero})` : ''}
                                            {` — estoque ${epi.estoque_atual}`}
                                        </option>
                                    ))}
                                </AdminFloatField>
                            </Col>
                            <Col md={6}>
                                <AdminFloatField
                                    as="select"
                                    label="Funcionário"
                                    name="funcionario_id"
                                    value={form.funcionario_id}
                                    onChange={(e) => handleFuncionario(e.target.value)}
                                >
                                    <option value="">Selecione</option>
                                    {funcionarios.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name || f.full_name || f.nome}</option>
                                    ))}
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField
                                    label="Quantidade"
                                    name="quantidade"
                                    type="number"
                                    min={1}
                                    value={form.quantidade}
                                    onChange={(e) => setField('quantidade', e.target.value)}
                                    disabled={isEdit && form.motivo !== 'Troca' && form.motivo !== 'Reposição'}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminDateField
                                    label="Data entrega"
                                    name="data_entrega"
                                    value={form.data_entrega}
                                    onChange={(e) => setField('data_entrega', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.data_entrega)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminDateField
                                    label="Validade uso"
                                    name="data_validade"
                                    value={form.data_validade}
                                    onChange={(e) => setField('data_validade', e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminDateField
                                    label="Devolução"
                                    name="data_devolucao"
                                    value={form.data_devolucao}
                                    onChange={(e) => setField('data_devolucao', e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField
                                    as="select"
                                    label="Motivo"
                                    name="motivo"
                                    value={form.motivo}
                                    onChange={(e) => {
                                        const motivo = e.target.value;
                                        setForm((current) => ({
                                            ...current,
                                            motivo,
                                            status: (motivo === 'Troca' || motivo === 'Reposição')
                                                ? 'Em uso'
                                                : current.status,
                                            data_entrega: (motivo === 'Troca' || motivo === 'Reposição')
                                                ? (current.data_entrega || new Date().toISOString().slice(0, 10))
                                                : current.data_entrega,
                                            data_devolucao: (motivo === 'Troca' || motivo === 'Reposição')
                                                ? ''
                                                : current.data_devolucao,
                                        }));
                                    }}
                                >
                                    <option value="Entrega">Entrega</option>
                                    <option value="Reposição">Reposição</option>
                                    <option value="Troca">Troca</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField
                                    as="select"
                                    label="Status"
                                    name="status"
                                    value={form.status}
                                    onChange={(e) => setField('status', e.target.value)}
                                    disabled={form.motivo === 'Troca' || form.motivo === 'Reposição'}
                                >
                                    <option value="Em uso">Em uso</option>
                                    <option value="Devolvido">Devolvido</option>
                                    <option value="Expirado">Expirado</option>
                                    <option value="Extraviado">Extraviado</option>
                                    <option value="Trocado">Trocado</option>
                                </AdminFloatField>
                            </Col>
                            {(form.motivo === 'Troca' || form.motivo === 'Reposição') ? (
                                <Col md={12}>
                                    <p className="admin-config-section-hint mb-0">
                                        {form.motivo === 'Troca' ? 'Troca' : 'Reposição'} cria uma nova entrega e mantém a anterior no histórico (status Trocado) para pesquisa.
                                    </p>
                                </Col>
                            ) : null}
                            <Col md={12}>
                                <AdminFloatField
                                    as="textarea"
                                    label="Observações"
                                    name="observacoes"
                                    value={form.observacoes}
                                    onChange={(e) => setField('observacoes', e.target.value)}
                                    rows={2}
                                />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                                Excluir
                            </Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm
                show={confirmDelete}
                title="entrega"
                name={item?.epi_nome || 'selecionada'}
                deleting={deleting}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
            />
        </AdminDateFieldProvider>
    );
}

export function EquipamentoModal({ show, item, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return;
        setForm({
            nome: item?.nome || '',
            tag_patrimonio: item?.tag_patrimonio || '',
            tipo: item?.tipo || '',
            setor: item?.setor || '',
            local_uso: item?.local_uso || '',
            fabricante: item?.fabricante || '',
            modelo: item?.modelo || '',
            data_aquisicao: dateOnly(item?.data_aquisicao),
            proxima_manutencao: dateOnly(item?.proxima_manutencao),
            status: item?.status || 'Operacional',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!String(form.nome || '').trim()) {
            setInvalid({ nome: true });
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = { ...form, nome: form.nome.trim() };
            if (isEdit) await updateEquipamento(item.id, payload);
            else await createEquipamento(payload);
            showToast('success', isEdit ? 'Equipamento atualizado.' : 'Equipamento cadastrado.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar equipamento.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteEquipamento(item.id);
            showToast('success', 'Equipamento excluído.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-cipa-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-cogs' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar equipamento' : 'Novo equipamento'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <AdminFloatField label="Nome" name="nome" value={form.nome} onChange={(e) => setField('nome', e.target.value)} required isInvalid={Boolean(invalid.nome)} />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField label="Tag / Patrimônio" name="tag_patrimonio" value={form.tag_patrimonio} onChange={(e) => setField('tag_patrimonio', e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField label="Tipo" name="tipo" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)} placeholder="Prensa, forno..." />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Setor" name="setor" value={form.setor} onChange={(e) => setField('setor', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Local" name="local_uso" value={form.local_uso} onChange={(e) => setField('local_uso', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Status" name="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                    <option value="Operacional">Operacional</option>
                                    <option value="Em manutenção">Em manutenção</option>
                                    <option value="Inativo">Inativo</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={6}>
                                <AdminFloatField label="Fabricante" name="fabricante" value={form.fabricante} onChange={(e) => setField('fabricante', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminFloatField label="Modelo" name="modelo" value={form.modelo} onChange={(e) => setField('modelo', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminDateField label="Aquisição" name="data_aquisicao" value={form.data_aquisicao} onChange={(e) => setField('data_aquisicao', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminDateField label="Próxima manutenção" name="proxima_manutencao" value={form.proxima_manutencao} onChange={(e) => setField('proxima_manutencao', e.target.value)} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Observações" name="observacoes" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} rows={2} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>Excluir</Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm show={confirmDelete} title="equipamento" name={form.nome} deleting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
        </AdminDateFieldProvider>
    );
}

export function ManutencaoModal({ show, item, equipamentos, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return;
        setForm({
            equipamento_id: item?.equipamento_id || '',
            tipo: item?.tipo || 'Preventiva',
            data_agendada: dateOnly(item?.data_agendada),
            data_realizada: dateOnly(item?.data_realizada),
            responsavel: item?.responsavel || '',
            custo: item?.custo ?? 0,
            descricao: item?.descricao || '',
            proximo_prazo: dateOnly(item?.proximo_prazo),
            status: item?.status || 'Agendada',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.equipamento_id) {
            setInvalid({ equipamento_id: true });
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            if (isEdit) await updateManutencao(item.id, form);
            else await createManutencao(form);
            showToast('success', isEdit ? 'Manutenção atualizada.' : 'Manutenção registrada.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar manutenção.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteManutencao(item.id);
            showToast('success', 'Manutenção excluída.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-cipa-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-wrench' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar manutenção' : 'Nova manutenção'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <AdminFloatField as="select" label="Equipamento" name="equipamento_id" value={form.equipamento_id} onChange={(e) => setField('equipamento_id', e.target.value)} required isInvalid={Boolean(invalid.equipamento_id)}>
                                    <option value="">Selecione</option>
                                    {equipamentos.map((eq) => (
                                        <option key={eq.id} value={eq.id}>
                                            {eq.nome}
                                            {eq.tag_patrimonio ? ` (${eq.tag_patrimonio})` : ''}
                                        </option>
                                    ))}
                                </AdminFloatField>
                            </Col>
                            <Col md={3}>
                                <AdminFloatField as="select" label="Tipo" name="tipo" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)}>
                                    <option value="Preventiva">Preventiva</option>
                                    <option value="Corretiva">Corretiva</option>
                                    <option value="Inspeção">Inspeção</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={3}>
                                <AdminFloatField as="select" label="Status" name="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                    <option value="Agendada">Agendada</option>
                                    <option value="Concluída">Concluída</option>
                                    <option value="Atrasada">Atrasada</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={6}>
                                <AdminDateField label="Agendada" name="data_agendada" value={form.data_agendada} onChange={(e) => setField('data_agendada', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminDateField label="Realizada" name="data_realizada" value={form.data_realizada} onChange={(e) => setField('data_realizada', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminFloatField label="Responsável" name="responsavel" value={form.responsavel} onChange={(e) => setField('responsavel', e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField label="Custo (R$)" name="custo" type="number" min={0} step="0.01" value={form.custo} onChange={(e) => setField('custo', e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <AdminDateField label="Próximo prazo" name="proximo_prazo" value={form.proximo_prazo} onChange={(e) => setField('proximo_prazo', e.target.value)} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Descrição" name="descricao" value={form.descricao} onChange={(e) => setField('descricao', e.target.value)} rows={2} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Observações" name="observacoes" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} rows={2} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>Excluir</Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm show={confirmDelete} title="manutenção" name={item?.equipamento_nome || 'selecionada'} deleting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
        </AdminDateFieldProvider>
    );
}

export function AcidenteModal({ show, item, funcionarios, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return;
        setForm({
            funcionario_id: item?.funcionario_id || '',
            funcionario_nome: item?.funcionario_nome || '',
            data_ocorrencia: dateOnly(item?.data_ocorrencia) || new Date().toISOString().slice(0, 10),
            hora_ocorrencia: item?.hora_ocorrencia || '',
            setor: item?.setor || '',
            local_ocorrencia: item?.local_ocorrencia || '',
            tipo: item?.tipo || 'Típico',
            gravidade: item?.gravidade || 'Leve',
            descricao: item?.descricao || '',
            partes_corpo: item?.partes_corpo || '',
            testemunhas: item?.testemunhas || '',
            cat_emitida: Boolean(item?.cat_emitida),
            numero_cat: item?.numero_cat || '',
            dias_afastamento: item?.dias_afastamento ?? 0,
            status: item?.status || 'Aberto',
            medidas_corretivas: item?.medidas_corretivas || '',
            observacoes: item?.observacoes || '',
            fotos: parseFotosList(item?.fotos),
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleAddFoto = (event) => {
        const url = String(event?.target?.value || '').trim();
        if (!url) return;
        setForm((current) => {
            const list = Array.isArray(current.fotos) ? current.fotos : [];
            if (list.includes(url)) return current;
            return { ...current, fotos: [...list, url] };
        });
    };

    const handleAddFotos = (urls = []) => {
        const next = (Array.isArray(urls) ? urls : [])
            .map((url) => String(url || '').trim())
            .filter(Boolean);
        if (!next.length) return;
        setForm((current) => {
            const list = Array.isArray(current.fotos) ? current.fotos : [];
            const merged = [...list];
            next.forEach((url) => {
                if (!merged.includes(url)) merged.push(url);
            });
            return { ...current, fotos: merged };
        });
    };

    const handleRemoveFoto = (url) => {
        setForm((current) => ({
            ...current,
            fotos: (current.fotos || []).filter((item) => item !== url),
        }));
    };

    const handleFuncionario = (id) => {
        const found = funcionarios.find((f) => String(f.id) === String(id));
        setForm((current) => ({
            ...current,
            funcionario_id: id,
            funcionario_nome: found?.name || found?.full_name || found?.nome || current.funcionario_nome,
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.data_ocorrencia) {
            setInvalid({ data_ocorrencia: true });
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            if (isEdit) await updateAcidente(item.id, form);
            else await createAcidente(form);
            showToast('success', isEdit ? 'Acidente atualizado.' : 'Acidente registrado.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar acidente.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteAcidente(item.id);
            showToast('success', 'Acidente excluído.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-cipa-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-exclamation-triangle' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar acidente' : 'Registrar acidente de trabalho'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <AdminFloatField as="select" label="Funcionário" name="funcionario_id" value={form.funcionario_id} onChange={(e) => handleFuncionario(e.target.value)}>
                                    <option value="">Selecione</option>
                                    {funcionarios.map((f) => (
                                        <option key={f.id} value={f.id}>{f.name || f.full_name || f.nome}</option>
                                    ))}
                                </AdminFloatField>
                            </Col>
                            <Col md={3}>
                                <AdminDateField label="Data" name="data_ocorrencia" value={form.data_ocorrencia} onChange={(e) => setField('data_ocorrencia', e.target.value)} required isInvalid={Boolean(invalid.data_ocorrencia)} />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField label="Hora" name="hora_ocorrencia" value={form.hora_ocorrencia} onChange={(e) => setField('hora_ocorrencia', e.target.value)} placeholder="14:30" />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Setor" name="setor" value={form.setor} onChange={(e) => setField('setor', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Local" name="local_ocorrencia" value={form.local_ocorrencia} onChange={(e) => setField('local_ocorrencia', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Tipo" name="tipo" value={form.tipo} onChange={(e) => setField('tipo', e.target.value)}>
                                    <option value="Típico">Típico</option>
                                    <option value="Trajeto">Trajeto</option>
                                    <option value="Doença">Doença ocupacional</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Gravidade" name="gravidade" value={form.gravidade} onChange={(e) => setField('gravidade', e.target.value)}>
                                    <option value="Leve">Leve</option>
                                    <option value="Moderada">Moderada</option>
                                    <option value="Grave">Grave</option>
                                    <option value="Fatal">Fatal</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Status" name="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                    <option value="Aberto">Aberto</option>
                                    <option value="Em análise">Em análise</option>
                                    <option value="Encerrado">Encerrado</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Dias afastamento" name="dias_afastamento" type="number" min={0} value={form.dias_afastamento} onChange={(e) => setField('dias_afastamento', e.target.value)} />
                            </Col>
                            <Col md={6}>
                                <AdminFloatField label="Partes do corpo" name="partes_corpo" value={form.partes_corpo} onChange={(e) => setField('partes_corpo', e.target.value)} />
                            </Col>
                            <Col md={3}>
                                <AdminStatusToggle
                                    label="CAT emitida"
                                    name="cat_emitida"
                                    checked={Boolean(form.cat_emitida)}
                                    onLabel="Sim"
                                    offLabel="Não"
                                    onChange={(e) => setField('cat_emitida', e.target.checked)}
                                />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField label="Nº CAT" name="numero_cat" value={form.numero_cat} onChange={(e) => setField('numero_cat', e.target.value)} disabled={!form.cat_emitida} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Descrição" name="descricao" value={form.descricao} onChange={(e) => setField('descricao', e.target.value)} rows={2} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Testemunhas" name="testemunhas" value={form.testemunhas} onChange={(e) => setField('testemunhas', e.target.value)} rows={2} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Medidas corretivas" name="medidas_corretivas" value={form.medidas_corretivas} onChange={(e) => setField('medidas_corretivas', e.target.value)} rows={2} />
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Observações" name="observacoes" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} rows={2} />
                            </Col>
                            <Col md={12}>
                                <div className="admin-cipa-fotos-block">
                                    <p className="admin-config-section-hint mb-2">
                                        Fotos do acidente (opcional). Selecione várias de uma vez ou adicione mais depois.
                                    </p>
                                    <AdminImageUpload
                                        label="Adicionar fotos"
                                        value=""
                                        multiple
                                        onChange={handleAddFoto}
                                        onUploaded={handleAddFotos}
                                        onUpload={uploadAcidenteFoto}
                                        disabled={saving || deleting}
                                    />
                                    {Array.isArray(form.fotos) && form.fotos.length > 0 ? (
                                        <div className="admin-cipa-fotos-grid">
                                            {form.fotos.map((foto) => (
                                                <div className="admin-cipa-foto-item" key={foto}>
                                                    <img src={foto} alt="Foto do acidente" />
                                                    <button
                                                        type="button"
                                                        className="admin-cipa-foto-remove"
                                                        onClick={() => handleRemoveFoto(foto)}
                                                        disabled={saving || deleting}
                                                        aria-label="Remover foto"
                                                    >
                                                        <i className="fas fa-times" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>Excluir</Button>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm show={confirmDelete} title="acidente" name={form.funcionario_nome || form.data_ocorrencia} deleting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />
        </AdminDateFieldProvider>
    );
}
