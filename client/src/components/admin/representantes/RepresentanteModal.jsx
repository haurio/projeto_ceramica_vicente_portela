import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row, Tab, Tabs } from 'react-bootstrap';
import { BRAZILIAN_STATES } from '../../../data/landingData';
import { useViaCep } from '../../../hooks/useViaCep';
import { fetchClientes } from '../../../api/clientes';
import {
    createRepresentante,
    deleteRepresentante,
    fetchRepresentante,
    updateRepresentante,
} from '../../../api/representantes';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import {
    formatCep,
    formatCnpj,
    formatCpf,
    formatPhone,
    onlyDigits,
} from '../../../utils/inputMasks';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

const EMPTY_FORM = {
    nome: '',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    comissao_percent: '0',
    status: 'Ativo',
    observacoes: '',
    cliente_ids: [],
};

function formatDocumento(value) {
    const digits = onlyDigits(value);
    if (digits.length > 11) return formatCnpj(value);
    return formatCpf(value);
}

function normalizeForm(data = {}) {
    return {
        nome: data.nome || '',
        cpf_cnpj: formatDocumento(data.cpf_cnpj || ''),
        email: String(data.email || '').trim().toLowerCase(),
        telefone: formatPhone(data.telefone || ''),
        cep: formatCep(data.cep || ''),
        endereco: data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        comissao_percent: String(
            data.comissao_percent === null || data.comissao_percent === undefined
                ? '0'
                : data.comissao_percent
        ).replace('.', ','),
        status: data.status || 'Ativo',
        observacoes: data.observacoes || '',
        cliente_ids: Array.isArray(data.cliente_ids)
            ? data.cliente_ids.map((id) => Number(id)).filter((id) => id > 0)
            : [],
    };
}

export default function RepresentanteModal({ representanteId, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [clientes, setClientes] = useState([]);
    const [carteiraBusca, setCarteiraBusca] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const [activeTab, setActiveTab] = useState('dados');
    const isEdit = Boolean(representanteId);

    const { handleCepBlur, lookupCep, loading: cepLoading } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => ({
                ...current,
                cidade: address.city,
                estado: address.state,
                endereco: address.street,
                bairro: address.neighborhood,
            }));
        },
        onError: (message) => showToast('warning', message),
    });

    useEffect(() => {
        fetchClientes()
            .then((data) => setClientes(Array.isArray(data) ? data : []))
            .catch(() => setClientes([]));
    }, []);

    useEffect(() => {
        if (!representanteId) {
            setForm(EMPTY_FORM);
            setInvalidFields({});
            setLoading(false);
            setActiveTab('dados');
            return undefined;
        }

        let active = true;
        setLoading(true);
        setActiveTab('dados');

        fetchRepresentante(representanteId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeForm(data));
            })
            .catch((error) => showToast('error', error.message))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [representanteId]);

    const clientesFiltrados = useMemo(() => {
        const q = carteiraBusca.trim().toLowerCase();
        const list = Array.isArray(clientes) ? clientes : [];
        if (!q) return list;
        return list.filter((item) => {
            const blob = [
                item.nome_razao_social,
                item.cpf_cnpj,
                item.cidade,
                item.estado,
            ].join(' ').toLowerCase();
            return blob.includes(q);
        });
    }, [clientes, carteiraBusca]);

    const updateField = (field, value) => {
        let nextValue = value;
        if (field === 'cpf_cnpj') nextValue = formatDocumento(value);
        if (field === 'telefone') nextValue = formatPhone(value);
        if (field === 'cep') nextValue = formatCep(value);
        if (field === 'email') {
            nextValue = String(value || '').replace(/\s/g, '').toLowerCase();
        }
        if (field === 'comissao_percent') {
            nextValue = String(value || '')
                .replace(/[^\d,.]/g, '')
                .replace('.', ',');
        }

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
        const { name, value, type, checked } = event.target;
        updateField(name, type === 'checkbox' ? checked : value);
    };

    const toggleCliente = (clienteId) => {
        const id = Number(clienteId);
        setForm((current) => {
            const has = current.cliente_ids.includes(id);
            return {
                ...current,
                cliente_ids: has
                    ? current.cliente_ids.filter((item) => item !== id)
                    : [...current.cliente_ids, id],
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!form.nome.trim()) nextInvalid.nome = true;

        setInvalidFields(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            setActiveTab('dados');
            return;
        }

        setSaving(true);
        try {
            const comissao = Number(String(form.comissao_percent || '0').replace(',', '.')) || 0;
            const payload = {
                nome: form.nome.trim(),
                cpf_cnpj: form.cpf_cnpj || null,
                email: form.email || null,
                telefone: form.telefone || null,
                cep: form.cep || null,
                endereco: form.endereco || null,
                numero: form.numero || null,
                complemento: form.complemento || null,
                bairro: form.bairro || null,
                cidade: form.cidade || null,
                estado: form.estado || null,
                comissao_percent: comissao,
                status: form.status || 'Ativo',
                observacoes: form.observacoes || null,
                cliente_ids: form.cliente_ids,
            };

            if (isEdit) {
                await updateRepresentante(representanteId, payload);
                showToast('success', 'Representante atualizado com sucesso.');
            } else {
                await createRepresentante(payload);
                showToast('success', 'Representante criado com sucesso.');
            }
            onSaved?.();
        } catch (error) {
            showToast('error', error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-page-fill admin-funcionario-page">
            <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                    <div className="admin-funcionario-page-title">
                        <i className={`fas ${isEdit ? 'fa-user-edit' : 'fa-handshake'}`} aria-hidden="true" />
                        <h1>{isEdit ? 'Editar Representante' : 'Adicionar Representante'}</h1>
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
                                            <Col md={6}>
                                                <AdminFloatField
                                                    label="Nome"
                                                    name="nome"
                                                    value={form.nome}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.nome)}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="CPF / CNPJ"
                                                    name="cpf_cnpj"
                                                    value={form.cpf_cnpj}
                                                    onChange={handleChange}
                                                    inputMode="numeric"
                                                    maxLength={18}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Telefone"
                                                    name="telefone"
                                                    value={form.telefone}
                                                    onChange={handleChange}
                                                    inputMode="tel"
                                                    maxLength={15}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="E-mail"
                                                    name="email"
                                                    type="email"
                                                    value={form.email}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={3}>
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

                                    <FormSection title="Endereço">
                                        <Row className="g-3">
                                            <Col md={2}>
                                                <AdminFloatField
                                                    label="CEP"
                                                    name="cep"
                                                    value={form.cep}
                                                    onChange={handleChange}
                                                    onBlur={handleCepBlur}
                                                    inputMode="numeric"
                                                    maxLength={9}
                                                    disabled={cepLoading}
                                                />
                                            </Col>
                                            <Col md={5}>
                                                <AdminFloatField
                                                    label="Endereço"
                                                    name="endereco"
                                                    value={form.endereco}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={2}>
                                                <AdminFloatField
                                                    label="Número"
                                                    name="numero"
                                                    value={form.numero}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Complemento"
                                                    name="complemento"
                                                    value={form.complemento}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Bairro"
                                                    name="bairro"
                                                    value={form.bairro}
                                                    onChange={handleChange}
                                                />
                                            </Col>
                                            <Col md={5}>
                                                <AdminFloatField
                                                    label="Cidade"
                                                    name="cidade"
                                                    value={form.cidade}
                                                    onChange={handleChange}
                                                    disabled
                                                    placeholder="Preenchida pelo CEP"
                                                />
                                            </Col>
                                            <Col md={3}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="UF"
                                                    name="estado"
                                                    value={form.estado}
                                                    onChange={handleChange}
                                                    disabled
                                                >
                                                    <option value="">CEP</option>
                                                    {BRAZILIAN_STATES.map((uf) => (
                                                        <option key={uf} value={uf}>{uf}</option>
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
                                </Tab>

                                <Tab eventKey="acesso" title="Comissão">
                                    <FormSection title="Comissão">
                                        <Row className="g-3">
                                            <Col md={3}>
                                                <AdminFloatField
                                                    label="Comissão (%)"
                                                    name="comissao_percent"
                                                    value={form.comissao_percent}
                                                    onChange={handleChange}
                                                    inputMode="decimal"
                                                    placeholder="0,00"
                                                />
                                                <p className="admin-rep-field-hint">
                                                    % sobre o valor final da venda, após confirmar o pedido.
                                                </p>
                                            </Col>
                                        </Row>
                                    </FormSection>
                                </Tab>

                                <Tab eventKey="carteira" title={`Carteira (${form.cliente_ids.length})`}>
                                    <FormSection title="Clientes da carteira">
                                        <div className="admin-rep-carteira-toolbar">
                                            <div className="admin-rep-carteira-search">
                                                <AdminFloatField
                                                    label="Buscar cliente"
                                                    name="carteira_busca"
                                                    value={carteiraBusca}
                                                    onChange={(event) => setCarteiraBusca(event.target.value)}
                                                    placeholder="Nome, documento ou cidade"
                                                />
                                            </div>
                                            <div className="admin-usuarios-perm-actions">
                                                <button
                                                    type="button"
                                                    className="admin-usuarios-text-action"
                                                    onClick={() => setForm((current) => ({
                                                        ...current,
                                                        cliente_ids: clientesFiltrados.map((item) => Number(item.id)),
                                                    }))}
                                                    disabled={saving || deleting || !clientesFiltrados.length}
                                                >
                                                    Marcar todos
                                                </button>
                                                <span aria-hidden="true">·</span>
                                                <button
                                                    type="button"
                                                    className="admin-usuarios-text-action"
                                                    onClick={() => setForm((current) => ({ ...current, cliente_ids: [] }))}
                                                    disabled={saving || deleting || !form.cliente_ids.length}
                                                >
                                                    Limpar
                                                </button>
                                            </div>
                                        </div>

                                        <div className="admin-rep-carteira-grid">
                                            {clientesFiltrados.length === 0 ? (
                                                <p className="text-muted mb-0">Nenhum cliente encontrado.</p>
                                            ) : (
                                                clientesFiltrados.map((item) => {
                                                    const checked = form.cliente_ids.includes(Number(item.id));
                                                    return (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            className={`admin-rep-carteira-card${checked ? ' is-on' : ''}`}
                                                            onClick={() => toggleCliente(item.id)}
                                                            disabled={saving || deleting}
                                                            aria-pressed={checked}
                                                        >
                                                            <span
                                                                className={`admin-usuarios-mini-switch${checked ? ' is-on' : ''}`}
                                                                aria-hidden="true"
                                                            >
                                                                <span className="admin-usuarios-mini-switch-knob" />
                                                            </span>
                                                            <span className="admin-rep-carteira-card-body">
                                                                <strong>{item.nome_razao_social}</strong>
                                                                <small>
                                                                    {[item.cpf_cnpj, item.cidade, item.estado]
                                                                        .filter(Boolean)
                                                                        .join(' · ') || 'Sem detalhes'}
                                                                </small>
                                                            </span>
                                                            <i className="fas fa-user-friends" aria-hidden="true" />
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </FormSection>
                                </Tab>
                            </Tabs>
                        )}
                    </div>

                    <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                        {isEdit ? (
                            <Button
                                type="button"
                                variant="danger"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={deleting || saving || loading}
                            >
                                Excluir
                            </Button>
                        ) : null}
                        <Button type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary" disabled={saving || deleting || loading}>
                            {saving ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </footer>
                </Form>
            </section>

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
                        Deseja realmente excluir o representante
                        {' '}
                        <strong>{form.nome?.trim() || 'selecionado'}</strong>
                        ?
                    </p>
                    <p className="admin-delete-confirm-note">Essa ação não poderá ser desfeita.</p>
                </Modal.Body>
                <Modal.Footer className="admin-delete-confirm-footer">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        disabled={deleting}
                        onClick={async () => {
                            if (!isEdit) return;
                            setDeleting(true);
                            try {
                                await deleteRepresentante(representanteId);
                                setShowDeleteConfirm(false);
                                showToast('success', 'Representante excluído com sucesso.');
                                onSaved?.();
                            } catch (error) {
                                showToast('error', error.message);
                            } finally {
                                setDeleting(false);
                            }
                        }}
                    >
                        {deleting ? 'Excluindo...' : 'Sim, excluir'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
