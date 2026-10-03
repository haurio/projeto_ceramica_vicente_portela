import { useEffect, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    createProduto,
    deleteProduto,
    fetchProduto,
    updateProduto
} from '../../../api/produtos';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import {
    applyFieldMask,
    formatDecimalBr,
    formatMoneyBrFromNumber,
} from '../../../utils/inputMasks';
import AdminFloatField from '../AdminFloatField';
import AdminImageUpload from '../AdminImageUpload';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

const EMPTY_FORM = {
    codigo: '',
    nome: '',
    categoria: 'Vedação',
    descricao: '',
    altura_cm: '',
    largura_cm: '',
    comprimento_cm: '',
    peso: '',
    preco_unitario: formatMoneyBrFromNumber(0),
    preco_milheiro: formatMoneyBrFromNumber(0),
    preco_m2: formatMoneyBrFromNumber(0),
    desconto_percentual: '0',
    desconto_acima_de: '0',
    unidade: 'un',
    estoque: '0',
    imagem_url: '',
    status: 'Ativo',
    observacoes: '',
    ncm: '69041000',
    cfop_padrao: '5102',
    cst_csosn: '102',
    aliq_icms: '0',
    aliq_ipi: '0',
    aliq_pis: '0',
    aliq_cofins: '0',
};

const CATEGORIAS = ['Lajota', 'Vedação', 'Telha', 'Geral'];
const UNIDADES = ['un', 'm²', 'milheiro', 'cx'];

function normalizeProdutoForm(data = {}) {
    return {
        codigo: data.codigo || '',
        nome: data.nome || '',
        categoria: data.categoria || 'Geral',
        descricao: data.descricao || '',
        altura_cm: data.altura_cm ?? '',
        largura_cm: data.largura_cm ?? '',
        comprimento_cm: data.comprimento_cm ?? '',
        peso: data.peso || '',
        preco_unitario: formatMoneyBrFromNumber(data.preco_unitario ?? 0),
        preco_milheiro: formatMoneyBrFromNumber(data.preco_milheiro ?? 0),
        preco_m2: formatMoneyBrFromNumber(data.preco_m2 ?? 0),
        desconto_percentual: formatDecimalBr(String(data.desconto_percentual ?? 0).replace('.', ','), 2) || '0',
        desconto_acima_de: formatDecimalBr(String(data.desconto_acima_de ?? 0).replace('.', ','), 2) || '0',
        unidade: data.unidade || 'un',
        estoque: data.estoque ?? '0',
        imagem_url: data.imagem_url || '',
        status: data.status || 'Ativo',
        observacoes: data.observacoes || '',
        ncm: String(data.ncm || '69041000').replace(/\D/g, '').slice(0, 8) || '69041000',
        cfop_padrao: String(data.cfop_padrao || '5102').replace(/\D/g, '').slice(0, 4) || '5102',
        cst_csosn: String(data.cst_csosn || '102').replace(/\D/g, '').slice(0, 4) || '102',
        aliq_icms: formatDecimalBr(String(data.aliq_icms ?? 0).replace('.', ','), 2) || '0',
        aliq_ipi: formatDecimalBr(String(data.aliq_ipi ?? 0).replace('.', ','), 2) || '0',
        aliq_pis: formatDecimalBr(String(data.aliq_pis ?? 0).replace('.', ','), 2) || '0',
        aliq_cofins: formatDecimalBr(String(data.aliq_cofins ?? 0).replace('.', ','), 2) || '0',
    };
}

export default function ProdutoModal({ produtoId, onClose, onSaved }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const isEdit = Boolean(produtoId);

    useEffect(() => {
        if (!produtoId) {
            setForm(EMPTY_FORM);
            setInvalidFields({});
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);

        fetchProduto(produtoId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeProdutoForm(data));
            })
            .catch((error) => showToast('error', error.message))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [produtoId]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: applyFieldMask(name, value) }));
        if (String(value || '').trim()) {
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
        if (!form.nome.trim()) nextInvalid.nome = true;
        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);

        try {
            if (isEdit) {
                await updateProduto(produtoId, form);
                showToast('success', 'Produto atualizado com sucesso.');
            } else {
                await createProduto(form);
                showToast('success', 'Produto criado com sucesso.');
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
            await deleteProduto(produtoId);
            setShowDeleteConfirm(false);
            showToast('success', 'Produto excluído com sucesso.');
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
                            <i className={`fas ${isEdit ? 'fa-box-open' : 'fa-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Produto' : 'Adicionar Produto'}</h1>
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
                                                />
                                            </div>

                                            <div className="admin-product-identity-fields">
                                                <Row className="g-3 admin-product-identity-top">
                                                    <Col md={2}>
                                                        <AdminFloatField
                                                            label="Código"
                                                            name="codigo"
                                                            value={form.codigo}
                                                            onChange={handleChange}
                                                            maxLength={40}
                                                        />
                                                    </Col>
                                                    <Col md={5}>
                                                        <AdminFloatField
                                                            label="Nome"
                                                            name="nome"
                                                            value={form.nome}
                                                            onChange={handleChange}
                                                            required
                                                            isInvalid={Boolean(invalidFields.nome)}
                                                            maxLength={150}
                                                        />
                                                    </Col>
                                                    <Col md={3}>
                                                        <AdminFloatField
                                                            as="select"
                                                            label="Categoria"
                                                            name="categoria"
                                                            value={form.categoria}
                                                            onChange={handleChange}
                                                        >
                                                            {CATEGORIAS.map((item) => (
                                                                <option key={item} value={item}>{item}</option>
                                                            ))}
                                                        </AdminFloatField>
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

                                    <FormSection title="Medidas e Estoque">
                                        <div className="admin-product-stock-row">
                                            <AdminFloatField
                                                label="Altura (cm)"
                                                name="altura_cm"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.altura_cm}
                                                onChange={handleChange}
                                            />
                                            <AdminFloatField
                                                label="Largura (cm)"
                                                name="largura_cm"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.largura_cm}
                                                onChange={handleChange}
                                            />
                                            <AdminFloatField
                                                label="Comprimento (cm)"
                                                name="comprimento_cm"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.comprimento_cm}
                                                onChange={handleChange}
                                            />
                                            <AdminFloatField
                                                label="Peso"
                                                name="peso"
                                                value={form.peso}
                                                onChange={handleChange}
                                                placeholder="4kg / peça"
                                            />
                                            <AdminFloatField
                                                as="select"
                                                label="Unidade"
                                                name="unidade"
                                                value={form.unidade}
                                                onChange={handleChange}
                                            >
                                                {UNIDADES.map((item) => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </AdminFloatField>
                                            <AdminFloatField
                                                label="Estoque"
                                                name="estoque"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={form.estoque}
                                                readOnly
                                            />
                                        </div>
                                        <p className="admin-ferias-form-hint mb-0 mt-2">
                                            O estoque é controlado na aba <strong>Estoque</strong> em Produtos (produção do dia e saídas).
                                        </p>
                                    </FormSection>

                                    <FormSection title="Dados fiscais (NF-e)">
                                        <div className="admin-product-fiscal-row">
                                            <AdminFloatField
                                                label="NCM"
                                                name="ncm"
                                                value={form.ncm}
                                                onChange={handleChange}
                                                maxLength={8}
                                                inputMode="numeric"
                                                placeholder="69041000"
                                            />
                                            <AdminFloatField
                                                label="CFOP padrão"
                                                name="cfop_padrao"
                                                value={form.cfop_padrao}
                                                onChange={handleChange}
                                                maxLength={4}
                                                inputMode="numeric"
                                            />
                                            <AdminFloatField
                                                label="CST / CSOSN"
                                                name="cst_csosn"
                                                value={form.cst_csosn}
                                                onChange={handleChange}
                                                maxLength={4}
                                                inputMode="numeric"
                                            />
                                            <AdminFloatField
                                                label="Alíq. ICMS %"
                                                name="aliq_icms"
                                                value={form.aliq_icms}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                            <AdminFloatField
                                                label="Alíq. IPI %"
                                                name="aliq_ipi"
                                                value={form.aliq_ipi}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                            <AdminFloatField
                                                label="Alíq. PIS %"
                                                name="aliq_pis"
                                                value={form.aliq_pis}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                            <AdminFloatField
                                                label="Alíq. COFINS %"
                                                name="aliq_cofins"
                                                value={form.aliq_cofins}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </FormSection>

                                    <FormSection title="Preços e Desconto">
                                        <div className="admin-product-prices-row">
                                            <AdminFloatField
                                                label="Preço unitário"
                                                name="preco_unitario"
                                                value={form.preco_unitario}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="R$ 0,00"
                                            />
                                            <AdminFloatField
                                                label="Preço milheiro"
                                                name="preco_milheiro"
                                                value={form.preco_milheiro}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="R$ 0,00"
                                            />
                                            <AdminFloatField
                                                label="Preço m²"
                                                name="preco_m2"
                                                value={form.preco_m2}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="R$ 0,00"
                                            />
                                            <AdminFloatField
                                                label="Desconto (%)"
                                                name="desconto_percentual"
                                                value={form.desconto_percentual}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                            <AdminFloatField
                                                label="Desconto acima de"
                                                name="desconto_acima_de"
                                                value={form.desconto_acima_de}
                                                onChange={handleChange}
                                                inputMode="decimal"
                                                placeholder="0,00"
                                            />
                                        </div>
                                    </FormSection>

                                    <FormSection title="Observações">
                                        <Row className="g-3">
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
                        Deseja realmente excluir o produto{' '}
                        <strong>{form.nome?.trim() || 'selecionado'}</strong>?
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
