import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import { BRAZILIAN_STATES } from '../../../data/landingData';
import { useViaCep } from '../../../hooks/useViaCep';
import {
    createFornecedor,
    deleteFornecedor,
    fetchFornecedor,
    updateFornecedor
} from '../../../api/fornecedores';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import { formatCep, formatCnpj, formatPhone, onlyDigits } from '../../../utils/inputMasks';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import FormSection from '../FormSection';
import AdminStatusToggle from '../AdminStatusToggle';

const EMPTY_FORM = {
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    telefone_contato: '',
    email_contato: '',
    nome_contato: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    ativo: 'sim',
    observacoes: ''
};

function normalizeFornecedorForm(data = {}) {
    return {
        razao_social: data.razao_social || '',
        nome_fantasia: data.nome_fantasia || '',
        cnpj: formatCnpj(data.cnpj || ''),
        telefone_contato: formatPhone(data.telefone_contato || ''),
        email_contato: String(data.email_contato || '').trim().toLowerCase(),
        nome_contato: data.nome_contato || '',
        cep: formatCep(data.cep || ''),
        endereco: data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        ativo: data.ativo || 'sim',
        observacoes: data.observacoes || ''
    };
}

export default function FornecedorModal({ fornecedorId, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const isEdit = Boolean(fornecedorId);

    const { handleCepBlur, lookupCep, loading: cepLoading } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => ({
                ...current,
                cidade: address.city,
                estado: address.state,
                endereco: address.street,
                bairro: address.neighborhood
            }));
        },
        onError: (message) => showToast('warning', message)
    });

    useEffect(() => {
        if (!fornecedorId) {
            setForm(EMPTY_FORM);
            setInvalidFields({});
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);

        fetchFornecedor(fornecedorId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeFornecedorForm(data));
            })
            .catch((error) => showToast('error', error.message))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [fornecedorId]);

    const updateField = (field, value) => {
        let nextValue = value;

        if (field === 'cnpj') nextValue = formatCnpj(value);
        if (field === 'telefone_contato') nextValue = formatPhone(value);
        if (field === 'cep') nextValue = formatCep(value);
        if (field === 'email_contato') nextValue = String(value || '').replace(/\s/g, '').toLowerCase();

        setForm((current) => ({ ...current, [field]: nextValue }));
        if (String(nextValue || '').trim()) {
            setInvalidFields((current) => {
                if (!current[field]) return current;
                const next = { ...current };
                delete next[field];
                return next;
            });
        }

        if (field === 'cep' && onlyDigits(nextValue).length === 8) {
            lookupCep(nextValue);
        }
    };

    const handleChange = (event) => {
        updateField(event.target.name, event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!form.razao_social.trim()) nextInvalid.razao_social = true;
        if (!form.cnpj.trim()) nextInvalid.cnpj = true;
        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);

        try {
            if (isEdit) {
                await updateFornecedor(fornecedorId, form);
                showToast('success', 'Fornecedor atualizado com sucesso.');
            } else {
                await createFornecedor(form);
                showToast('success', 'Fornecedor criado com sucesso.');
            }
            onSaved?.();
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setSaving(false);
        }
    };

    const openDeleteConfirm = () => {
        if (!isEdit || deleting || saving || loading) return;
        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleting) return;
        setShowDeleteConfirm(false);
    };

    const handleDelete = async () => {
        if (!isEdit) return;

        setDeleting(true);

        try {
            await deleteFornecedor(fornecedorId);
            setShowDeleteConfirm(false);
            showToast('success', 'Fornecedor excluído com sucesso.');
            onSaved?.();
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            <div className="admin-page-fill admin-funcionario-page">
                <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                    <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                        <div className="admin-funcionario-page-title">
                            <i className={`fas ${isEdit ? 'fa-user-edit' : 'fa-user-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}</h1>
                        </div>
                        <Button type="button" variant="link" className="admin-funcionario-back-btn" onClick={onClose}>
                            <i className="fas fa-arrow-left me-2" aria-hidden="true" />
                            Voltar
                        </Button>
                    </header>

                    <Form noValidate onSubmit={handleSubmit} className="admin-funcionario-form-shell">
                        <div className="admin-funcionario-modal-body admin-funcionario-form-body">
                            {loading ? (
                                <p className="text-muted mb-0">Carregando dados...</p>
                            ) : (
                                <>
                                    <FormSection title="Dados do Fornecedor">
                                        <Row className="g-3">
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="Razão Social"
                                                    name="razao_social"
                                                    value={form.razao_social}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.razao_social)}
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="Nome Fantasia"
                                                    name="nome_fantasia"
                                                    value={form.nome_fantasia}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="CNPJ"
                                                    name="cnpj"
                                                    value={form.cnpj}
                                                    onChange={handleChange}
                                                    inputMode="numeric"
                                                    placeholder="00.000.000/0000-00"
                                                    maxLength={18}
                                                    required
                                                    isInvalid={Boolean(invalidFields.cnpj)}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Telefone"
                                                    name="telefone_contato"
                                                    value={form.telefone_contato}
                                                    onChange={handleChange}
                                                    inputMode="tel"
                                                    placeholder="(00) 00000-0000"
                                                    maxLength={15}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminStatusToggle
                                                    label="Ativo"
                                                    name="ativo"
                                                    checked={form.ativo === 'sim'}
                                                    onLabel="Sim"
                                                    offLabel="Não"
                                                    onChange={(event) => {
                                                        handleChange({
                                                            target: {
                                                                name: 'ativo',
                                                                value: event.target.checked ? 'sim' : 'nao',
                                                            },
                                                        });
                                                    }}
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="E-mail de Contato"
                                                    name="email_contato"
                                                    type="email"
                                                    value={form.email_contato}
                                                    onChange={handleChange}
                                                    placeholder="contato@empresa.com"
                                                    autoComplete="email"
                                                />
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="Nome do Contato"
                                                    name="nome_contato"
                                                    value={form.nome_contato}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>

                                    <FormSection title="Endereço">
                                        <Row className="g-3">
                                            <Col md="auto" style={{ width: '9.5rem', maxWidth: '9.5rem' }}>
                                                <AdminFloatField
                                                    label="CEP"
                                                    name="cep"
                                                    value={form.cep}
                                                    onChange={handleChange}
                                                    onBlur={(e) => handleCepBlur(e.target.value)}
                                                    inputMode="numeric"
                                                    placeholder="00000-000"
                                                    maxLength={9}
                                                    disabled={cepLoading}
                                                />
                                                {cepLoading && (
                                                    <p className="admin-field-hint mb-0 mt-1">Consultando CEP...</p>
                                                )}
                                            </Col>
                                            <Col md>
                                                <AdminFloatField
                                                    label="Endereço"
                                                    name="endereco"
                                                    value={form.endereco}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md="auto" style={{ width: '6.5rem', maxWidth: '6.5rem' }}>
                                                <AdminFloatField
                                                    label="Número"
                                                    name="numero"
                                                    value={form.numero}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={5}>
                                                <AdminFloatField
                                                    label="Complemento"
                                                    name="complemento"
                                                    value={form.complemento}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                        </Row>
                                        <Row className="g-3 mt-0">
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Bairro"
                                                    name="bairro"
                                                    value={form.bairro}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Cidade"
                                                    name="cidade"
                                                    value={form.cidade}
                                                    readOnly
                                                    disabled
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Estado"
                                                    name="estado"
                                                    value={form.estado}
                                                    disabled
                                                    readOnly
                                                >
                                                    <option value="">Selecione</option>
                                                    {BRAZILIAN_STATES.map(([uf, name]) => (
                                                        <option key={uf} value={uf}>{uf} - {name}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={12}>
                                                <AdminFloatField
                                                    as="textarea"
                                                    label="Observações"
                                                    name="observacoes"
                                                    value={form.observacoes}
                                                    onChange={handleChange}
                                                    rows={3}
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>
                                </>
                            )}
                        </div>

                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                            {isEdit && (
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={openDeleteConfirm}
                                    disabled={deleting || saving || loading}
                                >
                                    Excluir
                                </Button>
                            )}
                            <Button type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" disabled={saving || deleting || loading}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </footer>
                    </Form>
                </section>
            </div>

            <Modal
                show={showDeleteConfirm}
                onHide={closeDeleteConfirm}
                centered
                backdrop="static"
                className="admin-delete-confirm-modal"
            >
                <Modal.Header className="admin-delete-confirm-header">
                    <Modal.Title>
                        <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                        Confirmar exclusão
                    </Modal.Title>
                    <AdminModalClose onClick={closeDeleteConfirm} disabled={deleting} />
                </Modal.Header>
                <Modal.Body className="admin-delete-confirm-body">
                    <p>
                        Deseja realmente excluir o fornecedor{' '}
                        <strong>{form.razao_social?.trim() || 'selecionado'}</strong>?
                    </p>
                    <p className="admin-delete-confirm-note">Essa ação não poderá ser desfeita.</p>
                </Modal.Body>
                <Modal.Footer className="admin-delete-confirm-footer">
                    <Button type="button" variant="secondary" onClick={closeDeleteConfirm} disabled={deleting}>
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
