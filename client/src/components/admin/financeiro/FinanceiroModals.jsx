import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    createContaPagar,
    createContaReceber,
    deleteContaPagar,
    deleteContaReceber,
    importarFinanceiroXml,
    parseFinanceiroXml,
    updateContaPagar,
    updateContaReceber,
} from '../../../api/financeiro';
import { fetchClientes } from '../../../api/clientes';
import { fetchFornecedores } from '../../../api/fornecedores';
import { fetchProdutos } from '../../../api/produtos';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminSearchSelect from '../AdminSearchSelect';

const CATEGORIAS_PAGAR = [
    'Insumos',
    'Água',
    'Energia elétrica',
    'Internet',
    'Telefone',
    'Gás',
    'Utilidades',
    'Manutenção',
    'Folha',
    'Impostos',
    'Outros',
];

function dateOnly(value) {
    if (!value) return '';
    return String(value).slice(0, 10);
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 'R$ 0,00';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
                    Deseja realmente excluir {title}{' '}
                    <strong>{name || 'selecionado(a)'}</strong>?
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

export function ContaReceberModal({ show, item, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [clientes, setClientes] = useState([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return undefined;
        let active = true;
        fetchClientes()
            .then((data) => {
                if (!active) return;
                setClientes(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (active) setClientes([]);
            });
        return () => { active = false; };
    }, [show]);

    useEffect(() => {
        if (!show) return;
        setForm({
            descricao: item?.descricao || '',
            cliente_nome: item?.cliente_nome || '',
            cliente_id: item?.cliente_id ? String(item.cliente_id) : '',
            categoria: item?.categoria || 'Vendas',
            valor: item?.valor ?? '',
            valor_recebido: item?.valor_recebido ?? 0,
            data_emissao: dateOnly(item?.data_emissao) || todayIso(),
            data_vencimento: dateOnly(item?.data_vencimento),
            data_recebimento: dateOnly(item?.data_recebimento),
            forma_pagamento: item?.forma_pagamento || 'PIX',
            documento: item?.documento || '',
            status: item?.status || 'Pendente',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const clienteOptions = useMemo(
        () => clientes
            .filter((c) => String(c.status || 'ativo').toLowerCase() !== 'inativo')
            .map((c) => ({
                id: String(c.id),
                label: c.nome_razao_social,
                search: `${c.nome_razao_social || ''} ${c.cpf_cnpj || ''} ${c.telefone_principal || ''}`,
            })),
        [clientes]
    );

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleClienteChange = (event) => {
        const id = event.target.value;
        const selected = clientes.find((c) => String(c.id) === String(id));
        setForm((current) => ({
            ...current,
            cliente_id: id,
            cliente_nome: selected?.nome_razao_social || '',
        }));
    };

    const marcarRecebido = () => {
        const valor = Number(form.valor) || 0;
        setForm((current) => ({
            ...current,
            valor_recebido: valor,
            data_recebimento: current.data_recebimento || todayIso(),
            status: 'Recebido',
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!String(form.descricao || '').trim()) nextInvalid.descricao = true;
        if (form.valor === '' || form.valor == null) nextInvalid.valor = true;
        setInvalid(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                cliente_id: form.cliente_id || null,
            };
            if (isEdit) await updateContaReceber(item.id, payload);
            else await createContaReceber(payload);
            showToast('success', isEdit ? 'Conta a receber atualizada.' : 'Conta a receber lançada.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteContaReceber(item.id);
            showToast('success', 'Conta a receber excluída.');
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
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-financeiro-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-hand-holding-usd' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar conta a receber' : 'Nova conta a receber'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={8}>
                                <AdminFloatField
                                    label="Descrição"
                                    name="descricao"
                                    value={form.descricao}
                                    onChange={(e) => setField('descricao', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.descricao)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Categoria" name="categoria" value={form.categoria} onChange={(e) => setField('categoria', e.target.value)}>
                                    <option value="Vendas">Vendas</option>
                                    <option value="Serviços">Serviços</option>
                                    <option value="Outros">Outros</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={8}>
                                <AdminSearchSelect
                                    label="Cliente"
                                    name="cliente_id"
                                    value={form.cliente_id}
                                    options={clienteOptions}
                                    onChange={handleClienteChange}
                                    placeholder="Buscar cliente na base..."
                                    emptyLabel="Nenhum cliente encontrado"
                                />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField
                                    label="Valor"
                                    name="valor"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.valor}
                                    onChange={(e) => setField('valor', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.valor)}
                                />
                            </Col>
                            <Col md={3}>
                                <AdminFloatField
                                    label="Valor recebido"
                                    name="valor_recebido"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.valor_recebido}
                                    onChange={(e) => setField('valor_recebido', e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Emissão" name="data_emissao" value={form.data_emissao} onChange={(e) => setField('data_emissao', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Vencimento" name="data_vencimento" value={form.data_vencimento} onChange={(e) => setField('data_vencimento', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Recebimento" name="data_recebimento" value={form.data_recebimento} onChange={(e) => setField('data_recebimento', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Forma pagamento" name="forma_pagamento" value={form.forma_pagamento} onChange={(e) => setField('forma_pagamento', e.target.value)}>
                                    <option value="PIX">PIX</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Cartão">Cartão</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Documento" name="documento" value={form.documento} onChange={(e) => setField('documento', e.target.value)} placeholder="NF / recibo" />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Status" name="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Parcial">Parcial</option>
                                    <option value="Recebido">Recebido</option>
                                    <option value="Vencido">Vencido</option>
                                    <option value="Cancelado">Cancelado</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Observações" name="observacoes" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} rows={2} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="admin-financeiro-modal-footer">
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {form.status !== 'Recebido' && form.status !== 'Cancelado' ? (
                            <>
                                <Button type="button" className="admin-financeiro-btn-pay" onClick={marcarRecebido} disabled={saving || deleting}>
                                    <i className="fas fa-dollar-sign me-1" aria-hidden="true" />
                                    Marcar recebido
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline-secondary"
                                    onClick={() => setField('status', 'Cancelado')}
                                    disabled={saving || deleting}
                                >
                                    <i className="fas fa-ban me-1" aria-hidden="true" />
                                    Recusar
                                </Button>
                            </>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                                Excluir
                            </Button>
                        ) : null}
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm
                show={confirmDelete}
                title="a conta a receber"
                name={form.descricao}
                deleting={deleting}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
            />
        </AdminDateFieldProvider>
    );
}

export function ContaPagarModal({ show, item, onHide, onSaved }) {
    const isEdit = Boolean(item?.id);
    const [form, setForm] = useState({});
    const [fornecedores, setFornecedores] = useState([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!show) return undefined;
        let active = true;
        fetchFornecedores()
            .then((data) => {
                if (!active) return;
                setFornecedores(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (active) setFornecedores([]);
            });
        return () => { active = false; };
    }, [show]);

    useEffect(() => {
        if (!show) return;
        setForm({
            descricao: item?.descricao || '',
            fornecedor_nome: item?.fornecedor_nome || '',
            fornecedor_id: item?.fornecedor_id ? String(item.fornecedor_id) : '',
            categoria: item?.categoria || 'Insumos',
            valor: item?.valor ?? '',
            valor_pago: item?.valor_pago ?? 0,
            data_emissao: dateOnly(item?.data_emissao) || todayIso(),
            data_vencimento: dateOnly(item?.data_vencimento),
            data_pagamento: dateOnly(item?.data_pagamento),
            forma_pagamento: item?.forma_pagamento || 'PIX',
            documento: item?.documento || '',
            status: item?.status || 'Pendente',
            observacoes: item?.observacoes || '',
        });
        setInvalid({});
        setConfirmDelete(false);
    }, [show, item]);

    const fornecedorOptions = useMemo(
        () => fornecedores
            .filter((f) => String(f.status || 'ativo').toLowerCase() !== 'inativo')
            .map((f) => ({
                id: String(f.id),
                label: f.razao_social || f.nome_fantasia || `Fornecedor #${f.id}`,
                search: `${f.razao_social || ''} ${f.nome_fantasia || ''} ${f.cnpj || ''}`,
            })),
        [fornecedores]
    );

    const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

    const handleFornecedorChange = (event) => {
        const id = event.target.value;
        const selected = fornecedores.find((f) => String(f.id) === String(id));
        setForm((current) => ({
            ...current,
            fornecedor_id: id,
            fornecedor_nome: selected?.razao_social || selected?.nome_fantasia || '',
        }));
    };

    const handleCategoriaChange = (event) => {
        const categoria = event.target.value;
        setForm((current) => {
            const next = { ...current, categoria };
            const utilidades = ['Água', 'Energia elétrica', 'Internet', 'Telefone', 'Gás'];
            if (utilidades.includes(categoria) && !String(current.descricao || '').trim()) {
                next.descricao = categoria;
                next.forma_pagamento = current.forma_pagamento || 'Débito automático';
            }
            return next;
        });
    };

    const marcarPago = () => {
        const valor = Number(form.valor) || 0;
        setForm((current) => ({
            ...current,
            valor_pago: valor,
            data_pagamento: current.data_pagamento || todayIso(),
            status: 'Pago',
        }));
    };

    const recusarPagamento = () => {
        setForm((current) => ({
            ...current,
            status: 'Cancelado',
            observacoes: current.observacoes?.trim()
                ? current.observacoes
                : 'Pagamento recusado.',
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!String(form.descricao || '').trim()) nextInvalid.descricao = true;
        if (form.valor === '' || form.valor == null) nextInvalid.valor = true;
        setInvalid(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                fornecedor_id: form.fornecedor_id || null,
            };
            if (isEdit) await updateContaPagar(item.id, payload);
            else await createContaPagar(payload);
            showToast('success', isEdit ? 'Conta a pagar atualizada.' : 'Conta a pagar lançada.');
            onSaved?.();
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteContaPagar(item.id);
            showToast('success', 'Conta a pagar excluída.');
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
            <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-financeiro-modal">
                <Modal.Header>
                    <Modal.Title>
                        <i className={`fas ${isEdit ? 'fa-file-invoice-dollar' : 'fa-plus-circle'} me-2`} aria-hidden="true" />
                        {isEdit ? 'Editar conta a pagar' : 'Nova conta a pagar'}
                    </Modal.Title>
                    <AdminModalClose onClick={onHide} disabled={saving || deleting} />
                </Modal.Header>
                <Form className="admin-funcionario-form" onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={8}>
                                <AdminFloatField
                                    label="Descrição"
                                    name="descricao"
                                    value={form.descricao}
                                    onChange={(e) => setField('descricao', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.descricao)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Categoria" name="categoria" value={form.categoria} onChange={handleCategoriaChange}>
                                    {CATEGORIAS_PAGAR.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </AdminFloatField>
                            </Col>
                            <Col md={8}>
                                <AdminSearchSelect
                                    label="Fornecedor"
                                    name="fornecedor_id"
                                    value={form.fornecedor_id}
                                    options={fornecedorOptions}
                                    onChange={handleFornecedorChange}
                                    placeholder="Buscar fornecedor na base..."
                                    emptyLabel="Nenhum fornecedor encontrado"
                                />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField
                                    label="Valor"
                                    name="valor"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.valor}
                                    onChange={(e) => setField('valor', e.target.value)}
                                    required
                                    isInvalid={Boolean(invalid.valor)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField
                                    label="Valor pago"
                                    name="valor_pago"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={form.valor_pago}
                                    onChange={(e) => setField('valor_pago', e.target.value)}
                                />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Emissão" name="data_emissao" value={form.data_emissao} onChange={(e) => setField('data_emissao', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Vencimento" name="data_vencimento" value={form.data_vencimento} onChange={(e) => setField('data_vencimento', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminDateField label="Pagamento" name="data_pagamento" value={form.data_pagamento} onChange={(e) => setField('data_pagamento', e.target.value)} />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Forma pagamento" name="forma_pagamento" value={form.forma_pagamento} onChange={(e) => setField('forma_pagamento', e.target.value)}>
                                    <option value="PIX">PIX</option>
                                    <option value="Boleto">Boleto</option>
                                    <option value="Transferência">Transferência</option>
                                    <option value="Dinheiro">Dinheiro</option>
                                    <option value="Cartão">Cartão</option>
                                    <option value="Débito automático">Débito automático</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={4}>
                                <AdminFloatField label="Documento" name="documento" value={form.documento} onChange={(e) => setField('documento', e.target.value)} placeholder="NF / OS" />
                            </Col>
                            <Col md={4}>
                                <AdminFloatField as="select" label="Status" name="status" value={form.status} onChange={(e) => setField('status', e.target.value)}>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Parcial">Parcial</option>
                                    <option value="Pago">Pago</option>
                                    <option value="Vencido">Vencido</option>
                                    <option value="Cancelado">Cancelado</option>
                                </AdminFloatField>
                            </Col>
                            <Col md={12}>
                                <AdminFloatField as="textarea" label="Observações" name="observacoes" value={form.observacoes} onChange={(e) => setField('observacoes', e.target.value)} rows={2} />
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer className="admin-financeiro-modal-footer">
                        <Button type="button" variant="secondary" onClick={onHide} disabled={saving || deleting}>Cancelar</Button>
                        {form.status !== 'Pago' && form.status !== 'Cancelado' ? (
                            <>
                                <Button type="button" className="admin-financeiro-btn-pay" onClick={marcarPago} disabled={saving || deleting}>
                                    <i className="fas fa-dollar-sign me-1" aria-hidden="true" />
                                    Marcar pago
                                </Button>
                                <Button type="button" variant="outline-secondary" onClick={recusarPagamento} disabled={saving || deleting}>
                                    <i className="fas fa-ban me-1" aria-hidden="true" />
                                    Recusar
                                </Button>
                            </>
                        ) : null}
                        <Button type="submit" variant="primary" disabled={saving || deleting}>{saving ? 'Salvando...' : 'Salvar'}</Button>
                        {isEdit ? (
                            <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={saving || deleting}>
                                Excluir
                            </Button>
                        ) : null}
                    </Modal.Footer>
                </Form>
            </Modal>
            <DeleteConfirm
                show={confirmDelete}
                title="a conta a pagar"
                name={form.descricao}
                deleting={deleting}
                onCancel={() => setConfirmDelete(false)}
                onConfirm={handleDelete}
            />
        </AdminDateFieldProvider>
    );
}

export function NotaXmlModal({ show, onHide, onSaved }) {
    const fileInputRef = useRef(null);
    const [xmlText, setXmlText] = useState('');
    const [fileName, setFileName] = useState('');
    const [nota, setNota] = useState(null);
    const [produtos, setProdutos] = useState([]);
    const [itensMap, setItensMap] = useState({});
    const [tipoConta, setTipoConta] = useState('pagar');
    const [alimentarEstoque, setAlimentarEstoque] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        if (!show) return undefined;
        let active = true;
        fetchProdutos()
            .then((data) => {
                if (!active) return;
                setProdutos(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (active) setProdutos([]);
            });
        return () => { active = false; };
    }, [show]);

    useEffect(() => {
        if (!show) {
            setXmlText('');
            setFileName('');
            setNota(null);
            setItensMap({});
            setTipoConta('pagar');
            setAlimentarEstoque(false);
            setParsing(false);
            setSaving(false);
            setDragOver(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [show]);

    const produtoOptions = useMemo(
        () => produtos
            .filter((p) => String(p.status || 'ativo').toLowerCase() === 'ativo')
            .map((p) => ({
                id: String(p.id),
                label: `${p.codigo ? `${p.codigo} — ` : ''}${p.nome}`,
            })),
        [produtos]
    );

    const handleParse = async (content) => {
        const xml = String(content || '').trim();
        if (!xml) {
            showToast('warning', 'Selecione um arquivo XML da nota fiscal.');
            return;
        }
        setParsing(true);
        try {
            const data = await parseFinanceiroXml(xml);
            setNota(data);
            const map = {};
            (data.itens || []).forEach((item, index) => {
                map[index] = {
                    produto_id: item.produto_id ? String(item.produto_id) : '',
                    quantidade: item.quantidade || 0,
                    include: Boolean(item.produto_id),
                };
            });
            setItensMap(map);
            showToast('success', 'XML lido com sucesso.');
        } catch (error) {
            setNota(null);
            showToast('error', error.message || 'Não foi possível ler o XML.');
        } finally {
            setParsing(false);
        }
    };

    const readFile = async (file) => {
        if (!file) return;
        const name = file.name || 'nota.xml';
        if (!/\.xml$/i.test(name) && file.type && !file.type.includes('xml')) {
            showToast('warning', 'Selecione um arquivo XML da NF-e.');
            return;
        }
        const text = await file.text();
        setFileName(name);
        setXmlText(text);
        await handleParse(text);
    };

    const openFilePicker = () => {
        if (parsing || saving) return;
        fileInputRef.current?.click();
    };

    const handleImport = async () => {
        if (!xmlText.trim() || !nota) {
            showToast('warning', 'Selecione um XML antes de importar.');
            return;
        }
        if (tipoConta === 'nenhuma' && !alimentarEstoque) {
            showToast('warning', 'Escolha o destino: conta a pagar, conta a receber ou estoque.');
            return;
        }
        setSaving(true);
        try {
            const itensEstoque = Object.entries(itensMap)
                .filter(([, row]) => row.include && row.produto_id && Number(row.quantidade) > 0)
                .map(([, row]) => ({
                    produto_id: Number(row.produto_id),
                    quantidade: Number(row.quantidade),
                }));

            if (alimentarEstoque && !itensEstoque.length) {
                showToast('warning', 'Marque ao menos um produto para alimentar o estoque.');
                setSaving(false);
                return;
            }

            const result = await importarFinanceiroXml({
                xml: xmlText,
                tipo_conta: tipoConta,
                alimentar_estoque: alimentarEstoque && itensEstoque.length > 0,
                itens_estoque: itensEstoque,
            });

            const destinos = [];
            if (result.tipo_conta === 'pagar') destinos.push('Contas a pagar');
            if (result.tipo_conta === 'receber') destinos.push('Contas a receber');
            if (result.estoque?.movimentos?.length) destinos.push('Estoque');
            showToast(
                'success',
                destinos.length
                    ? `Importação ok. Veja em: ${destinos.join(' e ')}.`
                    : 'XML processado.'
            );
            onSaved?.(result);
            onHide?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao importar XML.');
        } finally {
            setSaving(false);
        }
    };

    const parceiroLabel = tipoConta === 'receber' ? 'Cliente' : 'Fornecedor / Emitente';
    const parceiroValor = tipoConta === 'receber'
        ? (nota?.cliente_nome || nota?.fornecedor_nome || '—')
        : (nota?.fornecedor_nome || '—');

    return (
        <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" className="admin-estoque-modal admin-financeiro-modal">
            <Modal.Header>
                <Modal.Title>
                    <i className="fas fa-file-invoice me-2" aria-hidden="true" />
                    Importar nota fiscal (XML)
                </Modal.Title>
                <AdminModalClose onClick={onHide} disabled={saving} />
            </Modal.Header>
            <Modal.Body>
                <div className="admin-financeiro-xml-destino-block">
                    <span className="admin-financeiro-xml-destino-label">Destino da conta</span>
                    <div className="admin-financeiro-xml-destino-options" role="radiogroup" aria-label="Destino da conta">
                        <button
                            type="button"
                            className={`admin-financeiro-xml-option${tipoConta === 'pagar' ? ' is-active' : ''}`}
                            onClick={() => setTipoConta('pagar')}
                        >
                            <i className="fas fa-arrow-up" aria-hidden="true" />
                            Contas a pagar
                        </button>
                        <button
                            type="button"
                            className={`admin-financeiro-xml-option${tipoConta === 'receber' ? ' is-active' : ''}`}
                            onClick={() => setTipoConta('receber')}
                        >
                            <i className="fas fa-arrow-down" aria-hidden="true" />
                            Contas a receber
                        </button>
                        <button
                            type="button"
                            className={`admin-financeiro-xml-option${tipoConta === 'nenhuma' ? ' is-active' : ''}`}
                            onClick={() => setTipoConta('nenhuma')}
                        >
                            <i className="fas fa-ban" aria-hidden="true" />
                            Só estoque
                        </button>
                    </div>
                    <button
                        type="button"
                        className={`admin-financeiro-xml-estoque-toggle${alimentarEstoque ? ' is-active' : ''}`}
                        onClick={() => setAlimentarEstoque((current) => !current)}
                    >
                        <i className={`fas ${alimentarEstoque ? 'fa-check-square' : 'fa-square'}`} aria-hidden="true" />
                        Também alimentar estoque com os itens da NF
                    </button>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xml,application/xml,text/xml"
                    className="admin-financeiro-xml-input"
                    onChange={(event) => {
                        readFile(event.target.files?.[0]);
                        event.target.value = '';
                    }}
                />

                <button
                    type="button"
                    className={`admin-financeiro-xml-drop${dragOver ? ' is-dragover' : ''}${fileName ? ' has-file' : ''}`}
                    onClick={openFilePicker}
                    onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setDragOver(false);
                        readFile(event.dataTransfer.files?.[0]);
                    }}
                    disabled={parsing || saving}
                >
                    <i className={`fas ${parsing ? 'fa-spinner fa-spin' : 'fa-file-code'}`} aria-hidden="true" />
                    <strong>
                        {parsing
                            ? 'Lendo XML...'
                            : (fileName || 'Clique para selecionar o XML')}
                    </strong>
                    <span>{fileName ? 'Clique novamente para trocar o arquivo' : 'Ou arraste o arquivo .xml para este campo'}</span>
                </button>

                {nota ? (
                    <div className="admin-financeiro-xml-preview">
                        <div className="admin-financeiro-xml-meta">
                            <div className="is-parceiro">
                                <span>{parceiroLabel}</span>
                                <strong title={parceiroValor}>{parceiroValor}</strong>
                            </div>
                            <div className="is-compact">
                                <span>Documento</span>
                                <strong>{nota.documento || '—'}</strong>
                            </div>
                            <div className="is-compact">
                                <span>Emissão</span>
                                <strong>{nota.data_emissao || '—'}</strong>
                            </div>
                            <div className="is-compact">
                                <span>Valor</span>
                                <strong>{formatMoney(nota.valor_total)}</strong>
                            </div>
                        </div>

                        {alimentarEstoque ? (
                            <div className="admin-financeiro-xml-itens">
                                <div className="admin-financeiro-xml-itens-head">
                                    <strong>Itens para estoque</strong>
                                    <span>{(nota.itens || []).length} item(ns) · dados da NF (somente leitura)</span>
                                </div>
                                {(nota.itens || []).length === 0 ? (
                                    <p className="admin-financeiro-xml-itens-empty">Nenhum item encontrado no XML.</p>
                                ) : (
                                    <ul className="admin-financeiro-xml-itens-list">
                                        {(nota.itens || []).map((item, index) => (
                                            <li key={`${item.codigo}-${index}`}>
                                                <label className="admin-financeiro-xml-item-check">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(itensMap[index]?.include)}
                                                        onChange={(e) => setItensMap((current) => ({
                                                            ...current,
                                                            [index]: { ...current[index], include: e.target.checked },
                                                        }))}
                                                    />
                                                    <span />
                                                </label>
                                                <div className="admin-financeiro-xml-item-info">
                                                    <strong>{item.descricao || item.codigo || `Item ${index + 1}`}</strong>
                                                    <small>
                                                        Cód: {item.codigo || '—'}
                                                        {' · '}
                                                        Qtd: {itensMap[index]?.quantidade ?? item.quantidade}
                                                        {' · '}
                                                        {formatMoney(item.valor_total)}
                                                    </small>
                                                </div>
                                                <select
                                                    className="admin-financeiro-xml-item-product"
                                                    value={itensMap[index]?.produto_id || ''}
                                                    onChange={(e) => setItensMap((current) => ({
                                                        ...current,
                                                        [index]: {
                                                            ...current[index],
                                                            produto_id: e.target.value,
                                                            include: Boolean(e.target.value),
                                                        },
                                                    }))}
                                                    aria-label="Produto no sistema"
                                                >
                                                    <option value="">Vincular produto...</option>
                                                    {produtoOptions.map((opt) => (
                                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                                    ))}
                                                </select>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </Modal.Body>
            <Modal.Footer>
                <Button type="button" variant="secondary" onClick={onHide} disabled={saving}>Cancelar</Button>
                <Button type="button" variant="primary" onClick={handleImport} disabled={saving || !nota || parsing}>
                    {saving ? 'Importando...' : 'Confirmar importação'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
