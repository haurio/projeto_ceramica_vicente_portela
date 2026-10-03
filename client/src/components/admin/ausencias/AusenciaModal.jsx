import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Col, Form, Row } from 'react-bootstrap';
import {
    createAusencia,
    fetchAusenciaById,
    updateAusencia,
    uploadAusenciaComprovacao,
} from '../../../api/ausencias';
import { fetchEmployees } from '../../../api/funcionarios';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import { daysBetweenInclusive, toIsoDate } from '../../../utils/feriasUtils';
import {
    AUSENCIA_STATUS,
    AUSENCIA_TIPOS,
    exigeComprovacao,
} from '../../../utils/ausenciasUtils';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminSearchSelect from '../AdminSearchSelect';
import FormSection from '../FormSection';

const EMPTY_FORM = {
    funcionario_id: '',
    tipo: '',
    data_inicio: '',
    data_fim: '',
    dias: '1',
    justificativa: '',
    status: 'Registrada',
    comprovacao_url: '',
    ferias_id: null,
};

function normalizeForm(data = {}) {
    const dataInicio = toIsoDate(data.data_inicio);
    const dataFim = toIsoDate(data.data_fim) || dataInicio;
    const dias = daysBetweenInclusive(dataInicio, dataFim) || Number(data.dias) || 1;

    return {
        funcionario_id: data.funcionario_id ? String(data.funcionario_id) : '',
        tipo: data.tipo || '',
        data_inicio: dataInicio || '',
        data_fim: dataFim || '',
        dias: String(dias),
        justificativa: data.justificativa || '',
        status: data.status || 'Registrada',
        comprovacao_url: data.comprovacao_url || '',
        ferias_id: data.ferias_id || null,
    };
}

function fileLabel(url) {
    if (!url) return '';
    const parts = String(url).split('/');
    return parts[parts.length - 1] || url;
}

function isImageUrl(url) {
    return /\.(png|jpe?g|webp|gif)$/i.test(String(url || ''));
}

function isPdfUrl(url) {
    return /\.pdf$/i.test(String(url || ''));
}

export default function AusenciaModal({
    ausenciaId,
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [invalidFields, setInvalidFields] = useState({});
    const [funcionarioNome, setFuncionarioNome] = useState('');
    const fileRef = useRef(null);
    const isEdit = Boolean(ausenciaId);
    const needsComprovacao = exigeComprovacao(form.tipo);
    const isFeriasTipo = form.tipo === 'Férias';

    const clearInvalid = (fieldName) => {
        setInvalidFields((current) => {
            if (!current[fieldName]) return current;
            const next = { ...current };
            delete next[fieldName];
            return next;
        });
    };

    useEffect(() => {
        let active = true;

        fetchEmployees()
            .then((data) => {
                if (!active) return;
                const list = Array.isArray(data) ? data : [];
                setEmployees(list.filter((item) => String(item.status || '').toLowerCase() === 'ativo'));
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar funcionários.'));

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!ausenciaId) {
            setForm(EMPTY_FORM);
            setFuncionarioNome('');
            setInvalidFields({});
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);

        fetchAusenciaById(ausenciaId)
            .then((data) => {
                if (!active) return;
                setForm(normalizeForm(data));
                setFuncionarioNome(data.funcionario_nome || '');
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar ausência.'))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [ausenciaId]);

    useEffect(() => {
        if (!form.data_inicio || !form.data_fim) return;

        const days = daysBetweenInclusive(form.data_inicio, form.data_fim);
        if (days <= 0) return;

        const nextDays = String(days);
        setForm((current) => (
            current.dias === nextDays
                ? current
                : { ...current, dias: nextDays }
        ));
    }, [form.data_inicio, form.data_fim]);

    const employeeOptions = useMemo(
        () => employees.map((item) => ({
            id: item.id,
            label: item.name || item.nome || `Funcionário #${item.id}`,
        })),
        [employees]
    );

    const selectedEmployeeLabel = useMemo(() => {
        if (funcionarioNome) return funcionarioNome;
        const found = employees.find((item) => String(item.id) === String(form.funcionario_id));
        return found?.name || found?.nome || '';
    }, [employees, form.funcionario_id, funcionarioNome]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (value) clearInvalid(name);
        if (name === 'tipo' && !exigeComprovacao(value)) {
            clearInvalid('comprovacao_url');
        }
        setForm((current) => ({ ...current, [name]: value }));
    };

    const uploadFile = async (file) => {
        if (!file || uploading || saving) return;

        const allowed = [
            'application/pdf',
            'image/png',
            'image/jpeg',
            'image/jpg',
            'image/webp',
        ];
        if (file.type && !allowed.includes(file.type)) {
            showToast('error', 'Use PDF, JPG, PNG ou WEBP.');
            return;
        }

        if (file.size > 8 * 1024 * 1024) {
            showToast('error', 'O arquivo deve ter no máximo 8 MB.');
            return;
        }

        setUploading(true);
        try {
            const data = await uploadAusenciaComprovacao(file);
            setForm((current) => ({
                ...current,
                comprovacao_url: data.comprovacao_url || '',
            }));
            clearInvalid('comprovacao_url');
            showToast('success', 'Comprovação anexada com sucesso.');
        } catch (error) {
            showToast('error', error.message || 'Erro ao anexar comprovação.');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleUpload = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        uploadFile(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragOver(false);
        const file = event.dataTransfer?.files?.[0];
        if (file) uploadFile(file);
    };

    const clearComprovacao = (event) => {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        setForm((current) => ({ ...current, comprovacao_url: '' }));
    };

    const validateForm = () => {
        const nextInvalid = {};

        if (!isEdit && !form.funcionario_id) nextInvalid.funcionario_id = true;
        if (!form.tipo) nextInvalid.tipo = true;
        if (!form.data_inicio) nextInvalid.data_inicio = true;
        if (!form.status) nextInvalid.status = true;

        const dataFim = form.data_fim || form.data_inicio;
        const dias = form.data_inicio ? daysBetweenInclusive(form.data_inicio, dataFim) : 0;
        if (form.data_inicio && dias <= 0) nextInvalid.data_fim = true;

        if (needsComprovacao && !form.comprovacao_url && form.status !== 'Cancelada') {
            nextInvalid.comprovacao_url = true;
        }

        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return false;
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        const dataFim = form.data_fim || form.data_inicio;

        setSaving(true);

        const payload = {
            funcionario_id: Number(form.funcionario_id),
            tipo: form.tipo,
            data_inicio: form.data_inicio,
            data_fim: dataFim,
            justificativa: form.justificativa.trim() || null,
            status: form.status || 'Registrada',
            comprovacao_url: form.comprovacao_url || null,
        };

        try {
            if (isEdit) {
                await updateAusencia(ausenciaId, payload);
                showToast(
                    'success',
                    isFeriasTipo
                        ? 'Ausência e férias atualizadas com sucesso.'
                        : 'Ausência atualizada com sucesso.'
                );
            } else {
                await createAusencia(payload);
                showToast(
                    'success',
                    isFeriasTipo
                        ? 'Ausência registrada e também lançada em Férias.'
                        : 'Ausência registrada com sucesso.'
                );
            }
            onSaved?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar ausência.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-funcionario-page">
                <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                    <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                        <div className="admin-funcionario-page-title">
                            <i className={`fas ${isEdit ? 'fa-calendar-times' : 'fa-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Ausência' : 'Registrar Ausência'}</h1>
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
                                    <FormSection title="1. Funcionário e tipo">
                                        <p className="admin-ferias-form-hint">
                                            Selecione quem faltou e o motivo da ausência.
                                            {isFeriasTipo ? ' Este tipo também será lançado no módulo de Férias.' : ''}
                                        </p>
                                        <Row className="g-3">
                                            <Col md={6}>
                                                {isEdit ? (
                                                    <AdminFloatField
                                                        label="Funcionário"
                                                        name="funcionario_nome"
                                                        value={selectedEmployeeLabel}
                                                        readOnly
                                                    />
                                                ) : (
                                                    <AdminSearchSelect
                                                        label="Funcionário"
                                                        name="funcionario_id"
                                                        value={form.funcionario_id}
                                                        onChange={handleChange}
                                                        options={employeeOptions}
                                                        required
                                                        isInvalid={Boolean(invalidFields.funcionario_id)}
                                                        invalidFeedback="Selecione o funcionário."
                                                        placeholder="Digite o nome..."
                                                        emptyLabel="Nenhum funcionário encontrado"
                                                    />
                                                )}
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Tipo de ausência"
                                                    name="tipo"
                                                    value={form.tipo}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.tipo)}
                                                    invalidFeedback="Selecione o tipo de ausência."
                                                >
                                                    <option value="">Selecione</option>
                                                    {AUSENCIA_TIPOS.map((tipo) => (
                                                        <option key={tipo} value={tipo}>{tipo}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                        </Row>
                                        {isFeriasTipo ? (
                                            <p className="admin-ferias-form-note">
                                                Ao salvar, o sistema cria/atualiza automaticamente o registro correspondente em Controle de Férias.
                                            </p>
                                        ) : null}
                                    </FormSection>

                                    <FormSection title="2. Quando esteve ausente">
                                        <p className="admin-ferias-form-hint">
                                            Informe o início e o retorno. O total de dias é preenchido automaticamente.
                                        </p>
                                        <Row className="g-3">
                                            <Col md={4}>
                                                <AdminDateField
                                                    label="Data de início"
                                                    name="data_inicio"
                                                    value={form.data_inicio}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.data_inicio)}
                                                    invalidFeedback="Informe a data de início."
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminDateField
                                                    label="Data de retorno"
                                                    name="data_fim"
                                                    value={form.data_fim}
                                                    onChange={handleChange}
                                                    isInvalid={Boolean(invalidFields.data_fim)}
                                                    invalidFeedback="Intervalo de datas inválido."
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Total de dias"
                                                    name="dias"
                                                    type="number"
                                                    value={form.dias}
                                                    readOnly
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>

                                    <FormSection title="3. Situação e comprovação">
                                        <Row className="g-3">
                                            <Col md={4}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Status"
                                                    name="status"
                                                    value={form.status}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.status)}
                                                    invalidFeedback="Selecione o status."
                                                >
                                                    {AUSENCIA_STATUS.map((status) => (
                                                        <option key={status} value={status}>{status}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={8}>
                                                <AdminFloatField
                                                    as="textarea"
                                                    label="Justificativa / descrição"
                                                    name="justificativa"
                                                    value={form.justificativa}
                                                    onChange={handleChange}
                                                    rows={3}
                                                />
                                            </Col>
                                        </Row>

                                        {needsComprovacao ? (
                                            <div className={`admin-ausencias-dropzone-wrap mt-3${invalidFields.comprovacao_url ? ' is-invalid' : ''}`}>
                                                <div className="admin-ausencias-dropzone-head">
                                                    <span className="admin-ausencias-dropzone-badge">Obrigatório</span>
                                                    <p className="admin-ausencias-dropzone-title">Comprovação</p>
                                                    <p className="admin-ausencias-dropzone-sub">
                                                        Atestado, certidão ou documento — PDF, JPG ou PNG · máx. 8 MB
                                                    </p>
                                                </div>

                                                <input
                                                    ref={fileRef}
                                                    type="file"
                                                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                                                    className="admin-ausencias-dropzone-input"
                                                    onChange={handleUpload}
                                                    disabled={uploading || saving}
                                                />

                                                {form.comprovacao_url ? (
                                                    <div className="admin-ausencias-dropzone is-filled">
                                                        <div className="admin-ausencias-dropzone-preview">
                                                            {isImageUrl(form.comprovacao_url) ? (
                                                                <img
                                                                    src={form.comprovacao_url}
                                                                    alt="Comprovação anexada"
                                                                    className="admin-ausencias-dropzone-thumb"
                                                                />
                                                            ) : (
                                                                <div className={`admin-ausencias-dropzone-file-icon${isPdfUrl(form.comprovacao_url) ? ' is-pdf' : ''}`}>
                                                                    <i className={`fas ${isPdfUrl(form.comprovacao_url) ? 'fa-file-pdf' : 'fa-file-alt'}`} aria-hidden="true" />
                                                                </div>
                                                            )}
                                                            <div className="admin-ausencias-dropzone-meta">
                                                                <strong>Documento anexado</strong>
                                                                <span title={fileLabel(form.comprovacao_url)}>
                                                                    {fileLabel(form.comprovacao_url)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="admin-ausencias-dropzone-actions">
                                                            <a
                                                                href={form.comprovacao_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="admin-ausencias-dropzone-btn is-view"
                                                            >
                                                                <i className="fas fa-eye" aria-hidden="true" />
                                                                Ver
                                                            </a>
                                                            <button
                                                                type="button"
                                                                className="admin-ausencias-dropzone-btn is-replace"
                                                                disabled={uploading || saving}
                                                                onClick={() => fileRef.current?.click()}
                                                            >
                                                                <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} aria-hidden="true" />
                                                                {uploading ? 'Enviando...' : 'Trocar'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="admin-ausencias-dropzone-btn is-remove"
                                                                disabled={uploading || saving}
                                                                onClick={clearComprovacao}
                                                            >
                                                                <i className="fas fa-trash-alt" aria-hidden="true" />
                                                                Remover
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`admin-ausencias-dropzone${dragOver ? ' is-dragover' : ''}${uploading ? ' is-uploading' : ''}${invalidFields.comprovacao_url ? ' is-invalid' : ''}`}
                                                        onDragEnter={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setDragOver(true);
                                                        }}
                                                        onDragOver={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setDragOver(true);
                                                        }}
                                                        onDragLeave={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setDragOver(false);
                                                        }}
                                                        onDrop={handleDrop}
                                                        onClick={() => {
                                                            if (!uploading && !saving) fileRef.current?.click();
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(event) => {
                                                            if (event.key === 'Enter' || event.key === ' ') {
                                                                event.preventDefault();
                                                                if (!uploading && !saving) fileRef.current?.click();
                                                            }
                                                        }}
                                                    >
                                                        <div className="admin-ausencias-dropzone-icon" aria-hidden="true">
                                                            <i className={`fas ${uploading ? 'fa-spinner fa-spin' : 'fa-cloud-upload-alt'}`} />
                                                        </div>
                                                        <div className="admin-ausencias-dropzone-copy">
                                                            <strong>
                                                                {uploading
                                                                    ? 'Enviando comprovação...'
                                                                    : dragOver
                                                                        ? 'Solte o arquivo aqui'
                                                                        : 'Arraste o arquivo ou clique para anexar'}
                                                            </strong>
                                                            <span>PDF · JPG · PNG · WEBP</span>
                                                        </div>
                                                        {!uploading ? (
                                                            <span className="admin-ausencias-dropzone-cta">Escolher arquivo</span>
                                                        ) : null}
                                                    </div>
                                                )}
                                                {invalidFields.comprovacao_url ? (
                                                    <p className="admin-field-error mb-0">Anexe o comprovante para este tipo de ausência.</p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </FormSection>
                                </>
                            )}
                        </div>

                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                            <Button type="submit" variant="primary" disabled={saving || loading || uploading}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </footer>
                    </Form>
                </section>
            </div>
        </AdminDateFieldProvider>
    );
}
