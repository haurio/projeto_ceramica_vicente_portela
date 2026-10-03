import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row, Tab, Tabs } from 'react-bootstrap';
import { BRAZILIAN_STATES } from '../../../data/landingData';
import { useViaCep } from '../../../hooks/useViaCep';
import {
    createCliente,
    deleteCliente,
    fetchCliente,
    updateCliente
} from '../../../api/clientes';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import { emitClienteUpdated } from '../../../utils/syncChannel';
import {
    formatCep,
    formatCnpj,
    formatCpf,
    formatInscricaoEstadual,
    formatPhone,
    formatRg,
    onlyDigits
} from '../../../utils/inputMasks';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminMultiCheckDropdown from '../AdminMultiCheckDropdown';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

const EMPTY_FORM = {
    tipo_pessoa: 'Física',
    nome_razao_social: '',
    cpf_cnpj: '',
    rg_ie: '',
    telefone_principal: '',
    email_contato: '',
    data_cadastro: new Date().toISOString().slice(0, 10),
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    limite_credito: 0,
    status_credito: 'Pendente',
    formas_pagamento_aceitas: 'Boleto,Cartão Crédito,PIX',
    status: 'Ativo',
    observacoes: ''
};

function formatDocumento(tipoPessoa, value) {
    return tipoPessoa === 'Jurídica' ? formatCnpj(value) : formatCpf(value);
}

function formatRgIe(tipoPessoa, value) {
    if (tipoPessoa === 'Jurídica') {
        return formatInscricaoEstadual(value);
    }

    return formatRg(value);
}

function formatDateForInput(value) {
    if (!value) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const sliced = String(value).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return sliced;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
    return date.toISOString().slice(0, 10);
}

function normalizeClienteForm(data = {}) {
    const tipo = data.tipo_pessoa || 'Física';

    return {
        tipo_pessoa: tipo,
        nome_razao_social: data.nome_razao_social || '',
        cpf_cnpj: formatDocumento(tipo, data.cpf_cnpj || ''),
        rg_ie: formatRgIe(tipo, data.rg_ie || ''),
        telefone_principal: formatPhone(data.telefone_principal || ''),
        email_contato: String(data.email_contato || '').trim().toLowerCase(),
        data_cadastro: formatDateForInput(data.data_cadastro),
        cep: formatCep(data.cep || ''),
        endereco: data.endereco || '',
        numero: data.numero || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        complemento: data.complemento || '',
        limite_credito: Number(data.limite_credito) || 0,
        status_credito: data.status_credito || 'Pendente',
        formas_pagamento_aceitas: data.formas_pagamento_aceitas || 'Boleto,Cartão Crédito,PIX',
        status: data.status || 'Ativo',
        observacoes: data.observacoes || ''
    };
}

export default function ClienteModal({ clienteId, onClose, onSaved }) {
    const [form, setForm] = useState({
        ...EMPTY_FORM,
        data_cadastro: new Date().toISOString().slice(0, 10)
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const [activeTab, setActiveTab] = useState('dados');
    const isEdit = Boolean(clienteId);
    const isJuridica = form.tipo_pessoa === 'Jurídica';

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
        if (!clienteId) {
            setForm({
                ...EMPTY_FORM,
                data_cadastro: new Date().toISOString().slice(0, 10)
            });
            setInvalidFields({});
            setLoading(false);
            setActiveTab('dados');
            return undefined;
        }

        let active = true;
        setLoading(true);
        setActiveTab('dados');

        fetchCliente(clienteId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeClienteForm(data));
            })
            .catch((error) => showToast('error', error.message))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [clienteId]);

    const updateField = (field, value) => {
        if (field === 'tipo_pessoa') {
            setForm((current) => ({
                ...current,
                tipo_pessoa: value,
                cpf_cnpj: formatDocumento(value, current.cpf_cnpj),
                rg_ie: formatRgIe(value, current.rg_ie)
            }));
            return;
        }

        let nextValue = value;

        if (field === 'cpf_cnpj') nextValue = formatDocumento(form.tipo_pessoa, value);
        if (field === 'rg_ie') nextValue = formatRgIe(form.tipo_pessoa, value);
        if (field === 'telefone_principal') nextValue = formatPhone(value);
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
        if (!form.tipo_pessoa) nextInvalid.tipo_pessoa = true;
        if (!form.nome_razao_social.trim()) nextInvalid.nome_razao_social = true;
        if (!form.cpf_cnpj.trim()) nextInvalid.cpf_cnpj = true;
        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);

        try {
            const payload = {
                ...form,
                limite_credito: Number(form.limite_credito) || 0
            };

            if (isEdit) {
                await updateCliente(clienteId, payload);
                emitClienteUpdated(clienteId, {
                    status_credito: payload.status_credito,
                    status: payload.status,
                });
                showToast('success', 'Cliente atualizado com sucesso.');
            } else {
                const created = await createCliente(payload);
                emitClienteUpdated(created?.id, {
                    status_credito: payload.status_credito,
                    status: payload.status,
                });
                showToast('success', 'Cliente criado com sucesso.');
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
            await deleteCliente(clienteId);
            setShowDeleteConfirm(false);
            showToast('success', 'Cliente excluído com sucesso.');
            onSaved?.();
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-funcionario-page">
                <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                    <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                        <div className="admin-funcionario-page-title">
                            <i className={`fas ${isEdit ? 'fa-user-edit' : 'fa-user-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Cliente' : 'Adicionar Cliente'}</h1>
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
                                <Tabs
                                    activeKey={activeTab}
                                    onSelect={(key) => setActiveTab(key || 'dados')}
                                    className="admin-funcionario-tabs admin-modal-tabs mb-3"
                                >
                                    <Tab eventKey="dados" title="Dados">
                                        <FormSection title="Identificação">
                                            <Row className="g-3">
                                                <Col md={3}>
                                                    <AdminFloatField
                                                        as="select"
                                                        label="Tipo"
                                                        name="tipo_pessoa"
                                                        value={form.tipo_pessoa}
                                                        onChange={handleChange}
                                                        required
                                                        isInvalid={Boolean(invalidFields.tipo_pessoa)}
                                                    >
                                                        <option value="Física">Pessoa Física</option>
                                                        <option value="Jurídica">Pessoa Jurídica</option>
                                                    </AdminFloatField>
                                                </Col>
                                                <Col md={6}>
                                                    <AdminFloatField
                                                        label={isJuridica ? 'Razão Social' : 'Nome'}
                                                        name="nome_razao_social"
                                                        value={form.nome_razao_social}
                                                        onChange={handleChange}
                                                        required
                                                        isInvalid={Boolean(invalidFields.nome_razao_social)}
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <AdminFloatField
                                                        label={isJuridica ? 'CNPJ' : 'CPF'}
                                                        name="cpf_cnpj"
                                                        value={form.cpf_cnpj}
                                                        onChange={handleChange}
                                                        inputMode="numeric"
                                                        placeholder={isJuridica ? '00.000.000/0000-00' : '000.000.000-00'}
                                                        maxLength={isJuridica ? 18 : 14}
                                                        required
                                                        isInvalid={Boolean(invalidFields.cpf_cnpj)}
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <AdminFloatField
                                                        label={isJuridica ? 'Inscrição Estadual' : 'RG'}
                                                        name="rg_ie"
                                                        value={form.rg_ie}
                                                        onChange={handleChange}
                                                        inputMode={isJuridica ? 'text' : 'numeric'}
                                                        placeholder={isJuridica ? '000.000.000.000-00 ou ISENTO' : '00.000.000-0'}
                                                        maxLength={isJuridica ? 18 : 12}
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <AdminFloatField
                                                        label="Telefone"
                                                        name="telefone_principal"
                                                        value={form.telefone_principal}
                                                        onChange={handleChange}
                                                        inputMode="tel"
                                                        placeholder="(00) 00000-0000"
                                                        maxLength={15}
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <AdminFloatField
                                                        label="E-mail"
                                                        name="email_contato"
                                                        type="email"
                                                        value={form.email_contato}
                                                        onChange={handleChange}
                                                        placeholder="contato@email.com"
                                                        autoComplete="email"
                                                    />
                                                </Col>
                                                <Col md={3}>
                                                    <AdminDateField
                                                        label="Data de Cadastro"
                                                        name="data_cadastro"
                                                        value={form.data_cadastro}
                                                        onChange={(e) => updateField('data_cadastro', e.target.value)}
                                                    />
                                                </Col>
                                                <Col md={2}>
                                                    <AdminStatusToggle
                                                        label="Status"
                                                        name="status"
                                                        checked={form.status === 'Ativo'}
                                                        onChange={(event) => {
                                                            handleChange({
                                                                target: {
                                                                    name: 'status',
                                                                    value: event.target.checked ? 'Ativo' : 'Inativo',
                                                                },
                                                            });
                                                        }}
                                                    />
                                                </Col>
                                            </Row>
                                        </FormSection>
                                    </Tab>

                                    <Tab eventKey="endereco" title="Endereço">
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
                                            </Row>
                                        </FormSection>
                                    </Tab>

                                    <Tab eventKey="credito" title="Crédito">
                                        <FormSection title="Crédito e Observações">
                                            <Row className="g-3">
                                                <Col md={4}>
                                                    <AdminFloatField
                                                        label="Limite de Crédito"
                                                        name="limite_credito"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={form.limite_credito}
                                                        onChange={handleChange}
                                                    />
                                                </Col>
                                                <Col md={4}>
                                                    <AdminFloatField
                                                        as="select"
                                                        label="Status de Crédito"
                                                        name="status_credito"
                                                        value={form.status_credito}
                                                        onChange={handleChange}
                                                    >
                                                        <option value="Pendente">Pendente</option>
                                                        <option value="Em análise">Em análise</option>
                                                        <option value="Aprovado">Aprovado</option>
                                                        <option value="Reprovado">Reprovado</option>
                                                        <option value="Bloqueado">Bloqueado</option>
                                                    </AdminFloatField>
                                                </Col>
                                                <Col md={4}>
                                                    <AdminMultiCheckDropdown
                                                        label="Formas de Pagamento"
                                                        name="formas_pagamento_aceitas"
                                                        value={form.formas_pagamento_aceitas}
                                                        onChange={handleChange}
                                                    />
                                                </Col>
                                                <Col md={12}>
                                                    <AdminFloatField
                                                        as="textarea"
                                                        label="Observações"
                                                        name="observacoes"
                                                        value={form.observacoes}
                                                        onChange={handleChange}
                                                        rows={4}
                                                    />
                                                </Col>
                                            </Row>
                                        </FormSection>
                                    </Tab>
                                </Tabs>
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
                        Deseja realmente excluir o cliente{' '}
                        <strong>{form.nome_razao_social?.trim() || 'selecionado'}</strong>?
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
        </AdminDateFieldProvider>
    );
}

