import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import {
    createFormaPagamento,
    deleteFormaPagamento,
    fetchFormasPagamento,
    updateFormaPagamento,
} from '../../../api/config';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';
import StatusBadge from '../StatusBadge';

const PRAZO_DIAS = [30, 60, 90];
const BOLETO_DIAS = [15, 30];
const CARTAO_PARCELAS = Array.from({ length: 12 }, (_, index) => index + 1);

function hasOpcoesPrazo(tipo) {
    return tipo === 'prazo' || tipo === 'cartao' || tipo === 'boleto';
}

function buildPrazos(tipo, source = []) {
    const defaults = tipo === 'cartao'
        ? CARTAO_PARCELAS
        : (tipo === 'boleto' ? BOLETO_DIAS : PRAZO_DIAS);
    return defaults.map((dias) => {
        const found = source.find((item) => Number(item.dias) === dias);
        return {
            dias,
            juros_percent: found?.juros_percent ?? 0,
            ativo: found
                ? found.ativo !== false
                : (tipo === 'cartao' ? dias <= 6 : true),
        };
    });
}

function emptyForm() {
    return {
        nome: '',
        ativo: true,
        ordem: 10,
        tipo: 'avista',
        tem_juros: false,
        juros_percent: 0,
        prazos: buildPrazos('prazo'),
    };
}

function normalizeForm(data = {}) {
    const tipo = hasOpcoesPrazo(data.tipo) ? data.tipo : 'avista';
    return {
        nome: data.nome || '',
        ativo: data.ativo !== false,
        ordem: data.ordem ?? 10,
        tipo,
        tem_juros: Boolean(data.tem_juros),
        juros_percent: data.juros_percent ?? 0,
        prazos: buildPrazos(tipo === 'avista' ? 'prazo' : tipo, data.prazos),
    };
}

function tipoLabel(tipo) {
    if (tipo === 'prazo') return 'A prazo';
    if (tipo === 'cartao') return 'Cartão (parcelado)';
    if (tipo === 'boleto') return 'Boleto (15/30 dias)';
    return 'À vista';
}

function prazoLabel(tipo, dias) {
    if (tipo === 'cartao') {
        return `${dias}x${dias === 1 ? ' (à vista)' : ` (${dias} meses)`}`;
    }
    return `${dias} dias`;
}

export default function FormasPagamentoPanel() {
    const [itens, setItens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [mode, setMode] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [invalidFields, setInvalidFields] = useState({});

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchFormasPagamento();
            setItens(Array.isArray(data) ? data : []);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar formas de pagamento.');
            setItens([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openCreate = () => {
        const nextOrdem = itens.reduce((max, item) => Math.max(max, Number(item.ordem) || 0), 0) + 1;
        setEditingId(null);
        setForm({ ...emptyForm(), ordem: nextOrdem });
        setInvalidFields({});
        setShowDeleteConfirm(false);
        setMode('create');
    };

    const openEdit = (item) => {
        setEditingId(item.id);
        setForm(normalizeForm(item));
        setInvalidFields({});
        setShowDeleteConfirm(false);
        setMode('edit');
    };

    const closeEditor = () => {
        setMode('list');
        setEditingId(null);
        setForm(emptyForm());
        setInvalidFields({});
        setShowDeleteConfirm(false);
    };

    const updatePrazo = (dias, field, value) => {
        setForm((current) => ({
            ...current,
            prazos: current.prazos.map((item) => (
                item.dias === dias ? { ...item, [field]: value } : item
            )),
        }));
    };

    const handleTipoChange = (value) => {
        setForm((current) => {
            const tipo = hasOpcoesPrazo(value) ? value : 'avista';
            return {
                ...current,
                tipo,
                prazos: buildPrazos(tipo === 'avista' ? 'prazo' : tipo, current.prazos),
            };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!form.nome.trim()) nextInvalid.nome = true;
        if (hasOpcoesPrazo(form.tipo) && !form.prazos.some((item) => item.ativo)) {
            nextInvalid.prazos = true;
        }
        setInvalidFields(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showRequiredFieldsToast();
            return;
        }

        const payload = {
            nome: form.nome.trim(),
            ativo: form.ativo,
            ordem: Number(form.ordem) || 10,
            tipo: form.tipo,
            tem_juros: form.tem_juros,
            juros_percent: (form.tipo === 'avista' || form.tipo === 'boleto') && form.tem_juros
                ? Number(form.juros_percent) || 0
                : 0,
            prazos: hasOpcoesPrazo(form.tipo)
                ? form.prazos.map((item) => ({
                    dias: item.dias,
                    ativo: Boolean(item.ativo),
                    juros_percent: form.tipo !== 'boleto' && form.tem_juros
                        ? Number(item.juros_percent) || 0
                        : 0,
                }))
                : [],
        };

        setSaving(true);
        try {
            if (editingId) {
                await updateFormaPagamento(editingId, payload);
                showToast('success', 'Forma de pagamento atualizada.');
            } else {
                await createFormaPagamento(payload);
                showToast('success', 'Forma de pagamento criada.');
            }
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar forma de pagamento.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!editingId) return;

        setDeleting(true);
        try {
            await deleteFormaPagamento(editingId);
            showToast('success', 'Forma de pagamento excluída.');
            closeEditor();
            await load();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir.');
        } finally {
            setDeleting(false);
        }
    };

    if (mode === 'create' || mode === 'edit') {
        const prazosTipo = form.tipo === 'cartao'
            ? 'cartao'
            : (form.tipo === 'boleto' ? 'boleto' : 'prazo');
        const showPrazos = hasOpcoesPrazo(form.tipo);
        const showJurosForma = (form.tipo === 'avista' || form.tipo === 'boleto') && form.tem_juros;

        return (
            <>
                <Form
                    className="admin-funcionario-form admin-config-forma-editor"
                    onSubmit={handleSubmit}
                >
                    <FormSection title={mode === 'edit' ? 'Editar forma' : 'Nova forma'}>
                        <p className="admin-config-section-hint">
                            Nome, tipo e juros usados automaticamente no pedido.
                        </p>

                        <div className="admin-config-editor-grid">
                            <AdminFloatField
                                label="Nome"
                                name="nome"
                                value={form.nome}
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    nome: event.target.value,
                                }))}
                                required
                                isInvalid={Boolean(invalidFields.nome)}
                                disabled={saving || deleting}
                            />
                            <AdminFloatField
                                as="select"
                                label="Tipo"
                                name="tipo"
                                value={form.tipo}
                                onChange={(event) => handleTipoChange(event.target.value)}
                                disabled={saving || deleting}
                            >
                                <option value="avista">À vista</option>
                                <option value="prazo">A prazo (30/60/90 dias)</option>
                                <option value="cartao">Cartão (parcelas 1x a 12x)</option>
                                <option value="boleto">Boleto (15/30 dias)</option>
                            </AdminFloatField>
                        </div>

                        <div className="admin-config-editor-toggles">
                            <AdminStatusToggle
                                label="Status"
                                name="ativo"
                                checked={form.ativo}
                                onLabel="Ativo"
                                offLabel="Inativo"
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    ativo: Boolean(event.target.checked),
                                }))}
                                disabled={saving || deleting}
                            />
                            <AdminStatusToggle
                                label={form.tipo === 'boleto' ? 'Juros após venc.' : 'Juros'}
                                name="tem_juros"
                                checked={form.tem_juros}
                                onLabel="Sim"
                                offLabel="Não"
                                onChange={(event) => setForm((current) => ({
                                    ...current,
                                    tem_juros: Boolean(event.target.checked),
                                }))}
                                disabled={saving || deleting}
                            />
                        </div>

                        {showJurosForma ? (
                            <div className="admin-config-editor-juros">
                                <AdminFloatField
                                    label={form.tipo === 'boleto' ? 'Juros após vencimento (%)' : 'Juros (%)'}
                                    name="juros_percent"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.juros_percent}
                                    onChange={(event) => setForm((current) => ({
                                        ...current,
                                        juros_percent: event.target.value,
                                    }))}
                                    disabled={saving || deleting}
                                />
                            </div>
                        ) : null}

                        {showPrazos ? (
                            <div className={`admin-config-prazos${invalidFields.prazos ? ' is-invalid' : ''}`}>
                                <div className="admin-config-prazos-title">
                                    <h5>
                                        {form.tipo === 'cartao'
                                            ? 'Parcelas / meses'
                                            : (form.tipo === 'boleto' ? 'Vencimento do boleto' : 'Prazos')}
                                    </h5>
                                    <p>
                                        {form.tipo === 'cartao'
                                            ? 'Ative as parcelas (1x a 12x). Se juros = Sim, informe o % em cada parcela.'
                                            : form.tipo === 'boleto'
                                                ? 'Ative 15 e/ou 30 dias. O juros após vencimento é informado acima.'
                                                : 'Ative 30, 60 e/ou 90 dias. Se juros = Sim, informe o % em cada prazo.'}
                                    </p>
                                </div>
                                <div className={`admin-config-prazos-grid${form.tipo === 'cartao' ? ' is-cartao' : ''}`}>
                                    {form.prazos.map((prazo) => (
                                        <div
                                            className={`admin-config-prazo-card${!prazo.ativo ? ' is-off' : ''}`}
                                            key={prazo.dias}
                                        >
                                            <div className="admin-config-prazo-head">
                                                <strong>{prazoLabel(prazosTipo, prazo.dias)}</strong>
                                                <AdminStatusToggle
                                                    label="Ativo"
                                                    name={`prazo_ativo_${prazo.dias}`}
                                                    checked={prazo.ativo}
                                                    onLabel="Ativo"
                                                    offLabel="Off"
                                                    onChange={(event) => updatePrazo(
                                                        prazo.dias,
                                                        'ativo',
                                                        Boolean(event.target.checked)
                                                    )}
                                                    disabled={saving || deleting}
                                                />
                                            </div>
                                            {form.tipo !== 'boleto' ? (
                                                <AdminFloatField
                                                    label="Juros (%)"
                                                    name={`juros_${prazo.dias}`}
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={prazo.juros_percent}
                                                    onChange={(event) => updatePrazo(
                                                        prazo.dias,
                                                        'juros_percent',
                                                        event.target.value
                                                    )}
                                                    disabled={saving || deleting || !form.tem_juros || !prazo.ativo}
                                                />
                                            ) : (
                                                <p className="admin-config-boleto-prazo-note mb-0">
                                                    Vencimento em {prazo.dias} dias
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </FormSection>

                    <div className="admin-config-forma-actions">
                        <div className="admin-config-forma-actions-right">
                            <Button
                                type="button"
                                className="admin-config-btn is-ghost"
                                disabled={saving || deleting}
                                onClick={closeEditor}
                            >
                                <i className="fas fa-arrow-left" aria-hidden="true" />
                                Voltar
                            </Button>
                            {mode === 'edit' ? (
                                <Button
                                    type="button"
                                    className="admin-config-btn is-danger"
                                    disabled={saving || deleting}
                                    onClick={() => setShowDeleteConfirm(true)}
                                >
                                    Excluir
                                </Button>
                            ) : null}
                            <Button
                                type="button"
                                className="admin-config-btn is-muted"
                                disabled={saving || deleting}
                                onClick={closeEditor}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="admin-config-btn is-primary"
                                disabled={saving || deleting}
                            >
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
                            Deseja realmente excluir a forma de pagamento{' '}
                            <strong>{form.nome?.trim() || 'selecionada'}</strong>?
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
                        <Button type="button" variant="danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? 'Excluindo...' : 'Sim, excluir'}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }

    return (
        <div className="admin-config-formas admin-funcionario-form">
            <FormSection title="Formas cadastradas">
                <div className="admin-config-editor-head">
                    <p className="admin-config-section-hint mb-0">
                        Configure juros, prazos e parcelas usados automaticamente no pedido.
                    </p>
                    <button type="button" className="admin-config-btn is-primary" onClick={openCreate}>
                        <i className="fas fa-plus" aria-hidden="true" />
                        Nova forma
                    </button>
                </div>

                {loading ? <p className="text-muted mb-0">Carregando...</p> : null}
                {!loading && itens.length === 0 ? (
                    <p className="text-muted mb-0">Nenhuma forma cadastrada.</p>
                ) : null}

                {!loading && itens.length > 0 ? (
                    <div className="admin-config-formas-grid">
                        {itens.map((item) => {
                            const prazosAtivos = (item.prazos || [])
                                .filter((prazo) => prazo.ativo)
                                .map((prazo) => {
                                    const base = item.tipo === 'cartao'
                                        ? `${prazo.dias}x`
                                        : `${prazo.dias}d`;
                                    if (item.tipo === 'boleto') return base;
                                    return item.tem_juros
                                        ? `${base} (${Number(prazo.juros_percent) || 0}%)`
                                        : base;
                                })
                                .join(' · ');

                            return (
                                <article className="admin-config-forma-card" key={item.id}>
                                    <div className="admin-config-forma-card-top">
                                        <div>
                                            <strong>{item.nome}</strong>
                                            <span>{tipoLabel(item.tipo)}</span>
                                        </div>
                                        <StatusBadge status={item.ativo ? 'Ativo' : 'Inativo'} />
                                    </div>
                                    <div className="admin-config-forma-card-meta">
                                        <span>
                                            {item.tipo === 'boleto' ? 'Juros após venc.: ' : 'Juros: '}
                                            {item.tem_juros
                                                ? (item.tipo === 'boleto' || item.tipo === 'avista'
                                                    ? `${Number(item.juros_percent) || 0}%`
                                                    : (item.tipo === 'prazo' || item.tipo === 'cartao'
                                                        ? 'por opção'
                                                        : `${Number(item.juros_percent) || 0}%`))
                                                : 'não'}
                                        </span>
                                        {hasOpcoesPrazo(item.tipo) ? (
                                            <span>
                                                {item.tipo === 'cartao'
                                                    ? 'Parcelas'
                                                    : (item.tipo === 'boleto' ? 'Vencimento' : 'Prazos')}
                                                :
                                                {' '}
                                                {prazosAtivos || '—'}
                                            </span>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-config-btn is-soft"
                                        onClick={() => openEdit(item)}
                                    >
                                        Configurar
                                        <i className="fas fa-arrow-right" aria-hidden="true" />
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </FormSection>
        </div>
    );
}
