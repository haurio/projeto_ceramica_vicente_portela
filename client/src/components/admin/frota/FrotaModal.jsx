import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    createVeiculo,
    deleteVeiculo,
    fetchVeiculo,
    updateVeiculo,
    uploadFrotaImagem
} from '../../../api/frota';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import { applyFieldMask } from '../../../utils/inputMasks';
import AdminFloatField from '../AdminFloatField';
import AdminDateField from '../AdminDateField';
import AdminImageUpload from '../AdminImageUpload';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

const EMPTY_FORM = {
    placa: '',
    marca: '',
    modelo: '',
    tipo: 'Caminhão',
    ano: '',
    cor: '',
    combustivel: 'Diesel',
    capacidade: '',
    quilometragem: '0',
    motorista: '',
    motorista_telefone: '',
    motorista_cpf: '',
    motorista_cnh: '',
    motorista_cnh_categoria: '',
    motorista_cnh_validade: '',
    descricao: '',
    observacoes: '',
    imagem_url: '',
    status: 'Ativo'
};

const MARCAS = [
    'Volvo',
    'Scania',
    'Mercedes-Benz',
    'Volkswagen',
    'Ford',
    'Iveco',
    'MAN',
    'DAF',
    'Fiat',
    'Chevrolet',
    'Toyota',
    'Hyundai',
    'Agrale',
    'Outra'
];

const CORES = [
    'Branco',
    'Preto',
    'Prata',
    'Cinza',
    'Vermelho',
    'Azul',
    'Amarelo',
    'Verde',
    'Laranja',
    'Marrom',
    'Outra'
];

const TIPOS = ['Caminhão', 'Carreta', 'Utilitário', 'Pickup', 'Van', 'Outro'];
const COMBUSTIVEIS = ['Diesel', 'Gasolina', 'Etanol', 'Flex', 'GNV', 'Elétrico'];
const CNH_CATEGORIAS = ['B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

function normalizeDateValue(value) {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    return raw;
}

function normalizeFrotaForm(data = {}) {
    const marca = data.marca || '';
    const cor = data.cor || '';
    return {
        placa: applyFieldMask('placa', data.placa || ''),
        marca: MARCAS.includes(marca) ? marca : (marca ? 'Outra' : ''),
        modelo: data.modelo || '',
        tipo: data.tipo || 'Caminhão',
        ano: data.ano ?? '',
        cor: CORES.includes(cor) ? cor : (cor ? 'Outra' : ''),
        combustivel: data.combustivel || 'Diesel',
        capacidade: data.capacidade || '',
        quilometragem: data.quilometragem ?? '0',
        motorista: data.motorista || '',
        motorista_telefone: applyFieldMask('motorista_telefone', data.motorista_telefone || ''),
        motorista_cpf: applyFieldMask('cpf', data.motorista_cpf || ''),
        motorista_cnh: applyFieldMask('motorista_cnh', data.motorista_cnh || ''),
        motorista_cnh_categoria: data.motorista_cnh_categoria || '',
        motorista_cnh_validade: normalizeDateValue(data.motorista_cnh_validade),
        descricao: data.descricao || '',
        observacoes: data.observacoes || '',
        imagem_url: data.imagem_url || '',
        status: data.status || 'Ativo'
    };
}

export default function FrotaModal({ veiculoId, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const isEdit = Boolean(veiculoId);

    useEffect(() => {
        if (!veiculoId) {
            setForm(EMPTY_FORM);
            setInvalidFields({});
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);

        fetchVeiculo(veiculoId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeFrotaForm(data));
            })
            .catch((error) => showToast('error', error.message))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [veiculoId]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        const nextValue = name === 'motorista_cpf'
            ? applyFieldMask('cpf', value)
            : applyFieldMask(name, value);

        setForm((current) => ({
            ...current,
            [name]: nextValue
        }));
        if (String(nextValue || '').trim()) {
            setInvalidFields((current) => {
                if (!current[name]) return current;
                const next = { ...current };
                delete next[name];
                return next;
            });
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!form.placa.trim() || form.placa.replace(/[^A-Z0-9]/gi, '').length < 7) {
            nextInvalid.placa = true;
        }
        if (!form.modelo.trim()) nextInvalid.modelo = true;
        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);

        try {
            if (isEdit) {
                await updateVeiculo(veiculoId, form);
                showToast('success', 'Veículo atualizado com sucesso.');
            } else {
                await createVeiculo(form);
                showToast('success', 'Veículo criado com sucesso.');
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
            await deleteVeiculo(veiculoId);
            setShowDeleteConfirm(false);
            showToast('success', 'Veículo excluído com sucesso.');
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
                            <i className={`fas ${isEdit ? 'fa-truck' : 'fa-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Veículo' : 'Adicionar Veículo'}</h1>
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
                                    <FormSection title="Identificação">
                                        <div className="admin-product-identity-layout">
                                            <div className="admin-product-image-col">
                                                <AdminImageUpload
                                                    label="Imagem"
                                                    value={form.imagem_url}
                                                    onChange={handleChange}
                                                    disabled={saving || deleting || loading}
                                                    variant="side"
                                                    onUpload={uploadFrotaImagem}
                                                />
                                            </div>

                                            <div className="admin-product-identity-fields">
                                                <Row className="g-3 admin-product-identity-top">
                                                    <Col md={2}>
                                                        <AdminFloatField
                                                            label="Placa"
                                                            name="placa"
                                                            value={form.placa}
                                                            onChange={handleChange}
                                                            required
                                                            isInvalid={Boolean(invalidFields.placa)}
                                                            maxLength={8}
                                                            placeholder="ABC-1D23"
                                                        />
                                                    </Col>
                                                    <Col md={3}>
                                                        <AdminFloatField
                                                            as="select"
                                                            label="Marca"
                                                            name="marca"
                                                            value={form.marca}
                                                            onChange={handleChange}
                                                        >
                                                            <option value="">Selecione</option>
                                                            {MARCAS.map((item) => (
                                                                <option key={item} value={item}>{item}</option>
                                                            ))}
                                                        </AdminFloatField>
                                                    </Col>
                                                    <Col md={5}>
                                                        <AdminFloatField
                                                            label="Modelo"
                                                            name="modelo"
                                                            value={form.modelo}
                                                            onChange={handleChange}
                                                            required
                                                            isInvalid={Boolean(invalidFields.modelo)}
                                                            maxLength={120}
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

                                                <div className="admin-product-descricao-col">
                                                    <AdminFloatField
                                                        as="textarea"
                                                        label="Descrição"
                                                        name="descricao"
                                                        value={form.descricao}
                                                        onChange={handleChange}
                                                        rows={5}
                                                        className="admin-product-descricao-tall"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </FormSection>

                                    <FormSection title="Dados do Motorista">
                                        <div className="admin-frota-driver-row">
                                            <AdminFloatField
                                                label="Nome do motorista"
                                                name="motorista"
                                                value={form.motorista}
                                                onChange={handleChange}
                                                maxLength={150}
                                            />
                                            <AdminFloatField
                                                label="Telefone"
                                                name="motorista_telefone"
                                                value={form.motorista_telefone}
                                                onChange={handleChange}
                                                maxLength={16}
                                                inputMode="tel"
                                                placeholder="(00) 00000-0000"
                                            />
                                            <AdminFloatField
                                                label="CPF"
                                                name="motorista_cpf"
                                                value={form.motorista_cpf}
                                                onChange={handleChange}
                                                maxLength={14}
                                                inputMode="numeric"
                                                placeholder="000.000.000-00"
                                            />
                                            <AdminFloatField
                                                label="CNH"
                                                name="motorista_cnh"
                                                value={form.motorista_cnh}
                                                onChange={handleChange}
                                                maxLength={11}
                                                inputMode="numeric"
                                                placeholder="00000000000"
                                            />
                                            <AdminFloatField
                                                as="select"
                                                label="Categoria CNH"
                                                name="motorista_cnh_categoria"
                                                value={form.motorista_cnh_categoria}
                                                onChange={handleChange}
                                            >
                                                <option value="">Selecione</option>
                                                {CNH_CATEGORIAS.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </AdminFloatField>
                                            <AdminDateField
                                                label="Validade CNH"
                                                name="motorista_cnh_validade"
                                                value={form.motorista_cnh_validade}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </FormSection>

                                    <FormSection title="Dados do Veículo">
                                        <div className="admin-frota-vehicle-row">
                                            <AdminFloatField
                                                as="select"
                                                label="Tipo"
                                                name="tipo"
                                                value={form.tipo}
                                                onChange={handleChange}
                                            >
                                                {TIPOS.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </AdminFloatField>
                                            <AdminFloatField
                                                label="Ano"
                                                name="ano"
                                                type="number"
                                                min="1950"
                                                max="2100"
                                                value={form.ano}
                                                onChange={handleChange}
                                            />
                                            <AdminFloatField
                                                as="select"
                                                label="Cor"
                                                name="cor"
                                                value={form.cor}
                                                onChange={handleChange}
                                            >
                                                <option value="">Selecione</option>
                                                {CORES.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </AdminFloatField>
                                            <AdminFloatField
                                                as="select"
                                                label="Combustível"
                                                name="combustivel"
                                                value={form.combustivel}
                                                onChange={handleChange}
                                            >
                                                {COMBUSTIVEIS.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </AdminFloatField>
                                            <AdminFloatField
                                                label="Capacidade"
                                                name="capacidade"
                                                value={form.capacidade}
                                                onChange={handleChange}
                                                placeholder="12 t / 20 m³"
                                            />
                                            <AdminFloatField
                                                label="Quilometragem"
                                                name="quilometragem"
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                value={form.quilometragem}
                                                onChange={handleChange}
                                            />
                                        </div>
                                        <Row className="g-3 mt-1">
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
                        Deseja realmente excluir o veículo{' '}
                        <strong>{form.placa?.trim() || form.modelo?.trim() || 'selecionado'}</strong>?
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
