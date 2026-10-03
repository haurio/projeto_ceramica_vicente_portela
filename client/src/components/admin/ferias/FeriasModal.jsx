import { useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row } from 'react-bootstrap';
import {
    createFerias,
    fetchFeriasById,
    fetchSaldoFerias,
    updateFerias,
} from '../../../api/ferias';
import { fetchEmployees } from '../../../api/funcionarios';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import {
    daysBetweenInclusive,
    formatPeriodoOption,
    toIsoDate,
} from '../../../utils/feriasUtils';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminSearchSelect from '../AdminSearchSelect';
import FormSection from '../FormSection';

const STATUS_OPTIONS = [
    { value: 'Planejada', label: 'Planejada (agendada)' },
    { value: 'Em Andamento', label: 'Em andamento' },
    { value: 'Concluída', label: 'Já tirada / concluída' },
    { value: 'Cancelada', label: 'Cancelada' },
];

const EMPTY_FORM = {
    funcionario_id: '',
    periodo_aquisitivo_inicio: '',
    data_inicio: '',
    data_fim: '',
    dias_concedidos: '30',
    status: 'Planejada',
    motivo: '',
};

function normalizeForm(data = {}) {
    return {
        funcionario_id: data.funcionario_id ? String(data.funcionario_id) : '',
        periodo_aquisitivo_inicio: toIsoDate(data.periodo_aquisitivo_inicio),
        data_inicio: toIsoDate(data.data_inicio),
        data_fim: toIsoDate(data.data_fim),
        dias_concedidos: String(data.dias_concedidos ?? 30),
        status: data.status || 'Planejada',
        motivo: data.motivo || '',
    };
}

export default function FeriasModal({
    feriasId,
    initialFuncionarioId = '',
    initialPeriodo = '',
    onClose,
    onSaved,
}) {
    const [form, setForm] = useState({
        ...EMPTY_FORM,
        funcionario_id: initialFuncionarioId ? String(initialFuncionarioId) : '',
        periodo_aquisitivo_inicio: initialPeriodo || '',
    });
    const [employees, setEmployees] = useState([]);
    const [periodos, setPeriodos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingSaldo, setLoadingSaldo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [funcionarioNome, setFuncionarioNome] = useState('');
    const [invalidFields, setInvalidFields] = useState({});
    const isEdit = Boolean(feriasId);

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
        if (feriasId) return undefined;
        if (!initialFuncionarioId) return undefined;

        let active = true;
        setForm((current) => ({
            ...current,
            funcionario_id: String(initialFuncionarioId),
            periodo_aquisitivo_inicio: initialPeriodo || current.periodo_aquisitivo_inicio,
        }));

        setLoadingSaldo(true);
        fetchSaldoFerias(initialFuncionarioId)
            .then((saldo) => {
                if (!active) return;
                const periodosDisponiveis = saldo?.[0]?.periodos_disponiveis || [];
                if (initialPeriodo && !periodosDisponiveis.some((item) => item.periodo_aquisitivo_inicio === initialPeriodo)) {
                    periodosDisponiveis.unshift({
                        periodo_aquisitivo_inicio: initialPeriodo,
                        periodo_aquisitivo_fim: '',
                        dias_restantes: 30,
                        status: 'Pendente',
                    });
                }
                setPeriodos(periodosDisponiveis);
                setForm((current) => ({
                    ...current,
                    funcionario_id: String(initialFuncionarioId),
                    periodo_aquisitivo_inicio: initialPeriodo || periodosDisponiveis[0]?.periodo_aquisitivo_inicio || '',
                }));
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar saldo de férias.'))
            .finally(() => {
                if (active) setLoadingSaldo(false);
            });

        return () => {
            active = false;
        };
    }, [feriasId, initialFuncionarioId, initialPeriodo]);

    useEffect(() => {
        if (!feriasId) {
            if (!initialFuncionarioId) {
                setForm(EMPTY_FORM);
                setPeriodos([]);
            }
            setFuncionarioNome('');
            setInvalidFields({});
            setLoading(false);
            return undefined;
        }

        let active = true;
        setLoading(true);

        fetchFeriasById(feriasId)
            .then(async (data) => {
                if (!active) return;
                const normalized = normalizeForm(data);
                setForm(normalized);
                setFuncionarioNome(data.funcionario_nome || '');

                if (normalized.funcionario_id) {
                    try {
                        const saldo = await fetchSaldoFerias(normalized.funcionario_id);
                        if (!active) return;
                        const periodosDisponiveis = saldo?.[0]?.periodos_disponiveis || [];
                        const currentPeriod = {
                            periodo_aquisitivo_inicio: normalized.periodo_aquisitivo_inicio,
                            periodo_aquisitivo_fim: toIsoDate(data.periodo_aquisitivo_fim),
                            dias_restantes: Number(normalized.dias_concedidos) || 30,
                            status: normalized.status,
                        };
                        const hasCurrent = periodosDisponiveis.some(
                            (item) => item.periodo_aquisitivo_inicio === currentPeriod.periodo_aquisitivo_inicio
                        );
                        setPeriodos(hasCurrent ? periodosDisponiveis : [currentPeriod, ...periodosDisponiveis]);
                    } catch {
                        setPeriodos([{
                            periodo_aquisitivo_inicio: normalized.periodo_aquisitivo_inicio,
                            periodo_aquisitivo_fim: toIsoDate(data.periodo_aquisitivo_fim),
                            dias_restantes: Number(normalized.dias_concedidos) || 30,
                            status: normalized.status,
                        }]);
                    }
                }
            })
            .catch((error) => showToast('error', error.message || 'Erro ao carregar férias.'))
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [feriasId]);

    const loadSaldo = async (funcionarioId) => {
        if (!funcionarioId) {
            setPeriodos([]);
            return;
        }

        setLoadingSaldo(true);

        try {
            const saldo = await fetchSaldoFerias(funcionarioId);
            const periodosDisponiveis = saldo?.[0]?.periodos_disponiveis || [];
            setPeriodos(periodosDisponiveis);

            if (periodosDisponiveis.length) {
                setForm((current) => ({
                    ...current,
                    periodo_aquisitivo_inicio: periodosDisponiveis[0].periodo_aquisitivo_inicio,
                    dias_concedidos: current.data_inicio && current.data_fim
                        ? current.dias_concedidos
                        : String(Math.min(30, Math.max(15, periodosDisponiveis[0].dias_restantes || 30))),
                }));
            } else {
                setForm((current) => ({
                    ...current,
                    periodo_aquisitivo_inicio: '',
                }));
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar saldo de férias.');
            setPeriodos([]);
        } finally {
            setLoadingSaldo(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        if (value) clearInvalid(name);
        if (name === 'funcionario_id') clearInvalid('periodo_aquisitivo_inicio');

        setForm((current) => {
            const next = { ...current, [name]: value };

            if (name === 'funcionario_id') {
                next.periodo_aquisitivo_inicio = '';
            }

            return next;
        });

        if (name === 'funcionario_id') {
            loadSaldo(value);
        }
    };

    useEffect(() => {
        if (!form.data_inicio || !form.data_fim) return;

        const days = daysBetweenInclusive(form.data_inicio, form.data_fim);
        if (days <= 0) return;

        const nextDays = String(Math.min(30, Math.max(1, days)));
        setForm((current) => (
            current.dias_concedidos === nextDays
                ? current
                : { ...current, dias_concedidos: nextDays }
        ));
    }, [form.data_inicio, form.data_fim]);

    const selectedEmployeeLabel = useMemo(() => {
        if (funcionarioNome) return funcionarioNome;
        const found = employees.find((item) => String(item.id) === String(form.funcionario_id));
        return found?.name || found?.nome || '';
    }, [employees, form.funcionario_id, funcionarioNome]);

    const selectedPeriodo = useMemo(
        () => periodos.find((item) => item.periodo_aquisitivo_inicio === form.periodo_aquisitivo_inicio) || null,
        [periodos, form.periodo_aquisitivo_inicio]
    );

    const employeeOptions = useMemo(
        () => employees.map((item) => ({
            id: item.id,
            label: item.name || item.nome || `Funcionário #${item.id}`,
        })),
        [employees]
    );

    const handleSubmit = async (event) => {
        event.preventDefault();

        const nextInvalid = {};
        if (!form.funcionario_id) nextInvalid.funcionario_id = true;
        if (!form.periodo_aquisitivo_inicio) nextInvalid.periodo_aquisitivo_inicio = true;
        if (!form.data_inicio) nextInvalid.data_inicio = true;
        if (!form.data_fim) nextInvalid.data_fim = true;

        const dias = Number(form.dias_concedidos);
        if (!Number.isFinite(dias) || dias < 15 || dias > 30) {
            nextInvalid.dias_concedidos = true;
        }

        if (form.status === 'Cancelada' && !form.motivo.trim()) {
            nextInvalid.motivo = true;
        }

        setInvalidFields(nextInvalid);

        if (Object.keys(nextInvalid).length > 0) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);

        const payload = {
            funcionario_id: Number(form.funcionario_id),
            periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio,
            data_inicio: form.data_inicio,
            data_fim: form.data_fim,
            dias_concedidos: dias,
            status: form.status,
            motivo: form.motivo.trim() || null,
        };

        try {
            if (isEdit) {
                await updateFerias(feriasId, payload);
                showToast('success', 'Férias atualizadas com sucesso.');
            } else {
                await createFerias(payload);
                showToast('success', 'Férias registradas com sucesso.');
            }
            onSaved?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar férias.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancelConfirm = async () => {
        if (!isEdit) return;

        if (!form.motivo.trim()) {
            setInvalidFields((current) => ({ ...current, motivo: true }));
            showRequiredFieldsToast();
            return;
        }

        setCancelling(true);

        try {
            await updateFerias(feriasId, {
                funcionario_id: Number(form.funcionario_id),
                periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio,
                data_inicio: form.data_inicio,
                data_fim: form.data_fim,
                dias_concedidos: Number(form.dias_concedidos) || 30,
                status: 'Cancelada',
                motivo: form.motivo.trim(),
            });
            setShowCancelConfirm(false);
            showToast('success', 'Férias canceladas com sucesso.');
            onSaved?.();
        } catch (error) {
            showToast('error', error.message || 'Erro ao cancelar férias.');
        } finally {
            setCancelling(false);
        }
    };

    return (
        <AdminDateFieldProvider>
            <div className="admin-page-fill admin-funcionario-page">
                <section className="admin-panel-card admin-page-card admin-funcionario-form admin-funcionario-modal">
                    <header className="admin-funcionario-modal-header admin-funcionario-page-header">
                        <div className="admin-funcionario-page-title">
                            <i className={`fas ${isEdit ? 'fa-umbrella-beach' : 'fa-plus'}`} aria-hidden="true" />
                            <h1>{isEdit ? 'Editar Férias' : 'Adicionar Férias'}</h1>
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
                                    <FormSection title="1. Quem vai tirar férias">
                                        <p className="admin-ferias-form-hint">
                                            Digite o nome do funcionário. Só aparecem períodos aquisitivos
                                            que ainda não foram tirados nem agendados.
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
                                                        placeholder="Digite o nome..."
                                                        emptyLabel="Nenhum funcionário encontrado"
                                                    />
                                                )}
                                            </Col>
                                            <Col md={6}>
                                                <AdminFloatField
                                                    as="select"
                                                    label={loadingSaldo ? 'Período aquisitivo (carregando...)' : 'Período aquisitivo disponível'}
                                                    name="periodo_aquisitivo_inicio"
                                                    value={form.periodo_aquisitivo_inicio}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.periodo_aquisitivo_inicio)}
                                                    disabled={!form.funcionario_id || loadingSaldo}
                                                >
                                                    <option value="">
                                                        {!form.funcionario_id
                                                            ? 'Selecione o funcionário primeiro'
                                                            : loadingSaldo
                                                                ? 'Carregando...'
                                                                : periodos.length
                                                                    ? 'Selecione o período'
                                                                    : 'Nenhum período disponível'}
                                                    </option>
                                                    {periodos.map((item) => (
                                                        <option
                                                            key={item.periodo_aquisitivo_inicio}
                                                            value={item.periodo_aquisitivo_inicio}
                                                        >
                                                            {formatPeriodoOption(item)}
                                                        </option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                        </Row>
                                        {form.funcionario_id && !loadingSaldo && periodos.length === 0 && (
                                            <p className="admin-ferias-form-note">
                                                Este funcionário não tem período aquisitivo pendente.
                                                Períodos já tirados ou já agendados não aparecem aqui.
                                            </p>
                                        )}
                                        {selectedPeriodo && (
                                            <p className="admin-ferias-form-hint mb-0 mt-2">
                                                Saldo deste período: <strong>{selectedPeriodo.dias_restantes || 30} dias</strong>
                                            </p>
                                        )}
                                    </FormSection>

                                    <FormSection title="2. Quando vai gozar">
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
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminDateField
                                                    label="Data de retorno"
                                                    name="data_fim"
                                                    value={form.data_fim}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.data_fim)}
                                                />
                                            </Col>
                                            <Col md={4}>
                                                <AdminFloatField
                                                    label="Total de dias"
                                                    name="dias_concedidos"
                                                    type="number"
                                                    value={form.dias_concedidos}
                                                    readOnly
                                                    required
                                                    isInvalid={Boolean(invalidFields.dias_concedidos)}
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>

                                    <FormSection title="3. Situação">
                                        <Row className="g-3">
                                            <Col md={4}>
                                                <AdminFloatField
                                                    as="select"
                                                    label="Status"
                                                    name="status"
                                                    value={form.status}
                                                    onChange={handleChange}
                                                    required
                                                >
                                                    {STATUS_OPTIONS.map((item) => (
                                                        <option key={item.value} value={item.value}>{item.label}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </Col>
                                            <Col md={8}>
                                                <AdminFloatField
                                                    as="textarea"
                                                    label={form.status === 'Cancelada' ? 'Motivo do cancelamento' : 'Observação (opcional)'}
                                                    name="motivo"
                                                    value={form.motivo}
                                                    onChange={handleChange}
                                                    rows={3}
                                                    required={form.status === 'Cancelada'}
                                                    isInvalid={Boolean(invalidFields.motivo)}
                                                />
                                            </Col>
                                        </Row>
                                    </FormSection>
                                </>
                            )}
                        </div>

                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                            {isEdit && form.status !== 'Cancelada' && (
                                <Button
                                    type="button"
                                    variant="danger"
                                    onClick={() => setShowCancelConfirm(true)}
                                    disabled={saving || cancelling || loading}
                                >
                                    Cancelar férias
                                </Button>
                            )}
                            <Button type="submit" variant="primary" disabled={saving || cancelling || loading}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </footer>
                    </Form>
                </section>
            </div>

            <Modal
                show={showCancelConfirm}
                onHide={() => !cancelling && setShowCancelConfirm(false)}
                centered
                backdrop="static"
                className="admin-delete-confirm-modal"
            >
                <Modal.Header className="admin-delete-confirm-header">
                    <Modal.Title>
                        <i className="fas fa-exclamation-triangle me-2" aria-hidden="true" />
                        Confirmar cancelamento
                    </Modal.Title>
                    <AdminModalClose onClick={() => setShowCancelConfirm(false)} disabled={cancelling} />
                </Modal.Header>
                <Modal.Body className="admin-delete-confirm-body">
                    <p>
                        Deseja cancelar as férias de{' '}
                        <strong>{selectedEmployeeLabel || 'funcionário selecionado'}</strong>?
                    </p>
                    <AdminFloatField
                        as="textarea"
                        label="Motivo do cancelamento"
                        name="motivo"
                        value={form.motivo}
                        onChange={handleChange}
                        rows={3}
                        required
                    />
                </Modal.Body>
                <Modal.Footer className="admin-delete-confirm-footer">
                    <Button type="button" variant="secondary" onClick={() => setShowCancelConfirm(false)} disabled={cancelling}>
                        Fechar
                    </Button>
                    <Button type="button" variant="danger" onClick={handleCancelConfirm} disabled={cancelling}>
                        {cancelling ? 'Cancelando...' : 'Sim, cancelar'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </AdminDateFieldProvider>
    );
}
