import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Col, Form, Modal, Row, Tab, Tabs } from 'react-bootstrap';
import {
    createEmployee,
    deleteEmployee,
    fetchEmployee,
    fetchEmployeeOptions,
    updateEmployee
} from '../../../api/funcionarios';
import { BRAZILIAN_STATES } from '../../../data/landingData';
import { useViaCep } from '../../../hooks/useViaCep';
import { applyFieldMask, formatMaskedFields, onlyDigits } from '../../../utils/inputMasks';
import { showRequiredFieldsToast, showToast } from '../../../utils/toast';
import WorkScheduleBlock from './WorkScheduleBlock';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminModalClose from '../AdminModalClose';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

const EDUCATION_LEVELS = [
    'Ensino Fundamental Completo',
    'Ensino Fundamental Incompleto',
    'Ensino Médio Completo',
    'Ensino Médio Incompleto',
    'Ensino Superior Completo',
    'Ensino Superior Incompleto',
    'Pós-graduação Completo',
    'Pós-graduação Incompleto',
    'Técnico'
];

function normalizeEmployeeStatus(status) {
    const normalized = String(status || '').trim().toLowerCase();

    if (normalized === 'ativo') return 'Ativo';
    if (normalized === 'afastado') return 'Afastado';
    if (normalized === 'demitido') return 'Demitido';

    return 'Ativo';
}

const MARITAL_STATUS = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável'];

const PARENTESCO_OPTIONS = ['Filho(a)', 'Cônjuge', 'Pai/Mãe', 'Irmão(ã)', 'Outro'];

const FIELD_TABS = {
    name: 'personal',
    cpf: 'personal',
    birth_date: 'personal',
    birth_city: 'personal',
    birth_state: 'personal',
    nationality: 'personal',
    education_level: 'personal',
    phone: 'personal',
    marital_status: 'personal',
    email: 'personal',
    identity_number: 'personal',
    identity_issue_date: 'personal',
    identity_issuer: 'personal',
    identity_state: 'personal',
    father_name: 'personal',
    mother_name: 'personal',
    has_children: 'personal',
    cep: 'address',
    city: 'address',
    state: 'address',
    street: 'address',
    number: 'address',
    neighborhood: 'address',
    ctps: 'professional',
    ctps_state: 'professional',
    ctps_issue_date: 'professional',
    pis: 'professional',
    admission_date: 'professional',
    salary: 'professional',
    cargo_id: 'professional',
    departamento_id: 'professional',
    monthly_hours: 'professional',
    weekly_hours: 'professional',
    trial_period: 'professional',
    status: 'professional',
    weekday_start: 'professional',
    weekday_end: 'professional',
    leave_reason: 'professional',
    dismissal_date: 'professional',
    days_off: 'professional',
    payment_method: 'bank',
    pix_key: 'bank',
    bank: 'bank',
    agency: 'bank',
    account: 'bank',
    account_type: 'bank'
};

const REQUIRED_FIELDS = [
    'name', 'cpf', 'birth_date', 'birth_city', 'birth_state', 'nationality',
    'education_level', 'phone', 'marital_status', 'email', 'identity_number',
    'identity_issue_date', 'identity_issuer', 'identity_state', 'father_name',
    'mother_name', 'has_children', 'cep', 'city', 'state', 'street', 'number',
    'neighborhood', 'ctps', 'ctps_state', 'ctps_issue_date', 'pis', 'admission_date',
    'salary', 'cargo_id', 'departamento_id', 'monthly_hours', 'weekly_hours',
    'trial_period', 'status', 'payment_method', 'weekday_start', 'weekday_end'
];

function createEmptyForm() {
    return {
        name: '',
        cpf: '',
        birth_date: '',
        birth_city: '',
        birth_state: '',
        nationality: '',
        education_level: '',
        phone: '',
        marital_status: '',
        email: '',
        voter_id: '',
        voter_zone: '',
        voter_section: '',
        military_id: '',
        military_category: '',
        identity_number: '',
        identity_issue_date: '',
        identity_issuer: '',
        identity_state: '',
        father_name: '',
        mother_name: '',
        spouse: '',
        has_children: '',
        cep: '',
        city: '',
        state: '',
        street: '',
        number: '',
        neighborhood: '',
        complement: '',
        ctps: '',
        ctps_state: '',
        ctps_issue_date: '',
        pis: '',
        admission_date: '',
        salary: '',
        cargo_id: '',
        departamento_id: '',
        monthly_hours: '',
        weekly_hours: '',
        trial_period: '',
        night_shift_percentage: '',
        first_job: '',
        status: 'Ativo',
        leave_reason: '',
        dismissal_date: '',
        weekday_start: '',
        weekday_end: '',
        saturday_start: '',
        saturday_end: '',
        sunday_start: '',
        sunday_end: '',
        payment_method: '',
        pix_key: '',
        bank: '',
        agency: '',
        account: '',
        account_type: '',
        days_off: [],
        dependents: []
    };
}

function formatDateForInput(value) {
    if (!value) {
        return '';
    }

    const stringValue = String(value);

    if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
        return stringValue.slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return date.toISOString().slice(0, 10);
}

function formatTimeForInput(value) {
    if (!value) {
        return '';
    }

    const stringValue = String(value);
    return stringValue.length >= 5 ? stringValue.slice(0, 5) : stringValue;
}

function mapEmployeeToForm(employee) {
    const base = createEmptyForm();

    if (!employee) {
        return base;
    }

    return formatMaskedFields({
        ...base,
        name: employee.name || '',
        cpf: employee.cpf || '',
        birth_date: formatDateForInput(employee.birth_date),
        birth_city: employee.birth_city || '',
        birth_state: employee.birth_state || '',
        nationality: employee.nationality || '',
        education_level: employee.education_level || '',
        phone: employee.phone || '',
        marital_status: employee.marital_status || '',
        email: employee.email || '',
        voter_id: employee.voter_id || '',
        voter_zone: employee.voter_zone || '',
        voter_section: employee.voter_section || '',
        military_id: employee.military_id || '',
        military_category: employee.military_category || '',
        identity_number: employee.identity_number || '',
        identity_issue_date: formatDateForInput(employee.identity_issue_date),
        identity_issuer: employee.identity_issuer || '',
        identity_state: employee.identity_state || '',
        father_name: employee.father_name || '',
        mother_name: employee.mother_name || '',
        spouse: employee.spouse || '',
        has_children: employee.has_children || '',
        cep: employee.cep || '',
        city: employee.city || '',
        state: employee.state || '',
        street: employee.street || '',
        number: employee.number || '',
        neighborhood: employee.neighborhood || '',
        complement: employee.complement || '',
        ctps: employee.ctps || '',
        ctps_state: employee.ctps_state || '',
        ctps_issue_date: formatDateForInput(employee.ctps_issue_date),
        pis: employee.pis || '',
        admission_date: formatDateForInput(employee.admission_date),
        salary: employee.salary ?? '',
        cargo_id: employee.cargo_id != null ? String(employee.cargo_id) : '',
        departamento_id: employee.departamento_id != null ? String(employee.departamento_id) : '',
        monthly_hours: employee.monthly_hours ?? '',
        weekly_hours: employee.weekly_hours ?? '',
        trial_period: employee.trial_period ?? '',
        night_shift_percentage: employee.night_shift_percentage ?? '',
        first_job: employee.first_job || '',
        status: normalizeEmployeeStatus(employee.status),
        leave_reason: employee.leave_reason || '',
        dismissal_date: formatDateForInput(employee.dismissal_date),
        weekday_start: formatTimeForInput(employee.weekday_start),
        weekday_end: formatTimeForInput(employee.weekday_end),
        saturday_start: formatTimeForInput(employee.saturday_start),
        saturday_end: formatTimeForInput(employee.saturday_end),
        sunday_start: formatTimeForInput(employee.sunday_start),
        sunday_end: formatTimeForInput(employee.sunday_end),
        payment_method: employee.payment_method || '',
        pix_key: employee.pix_key || '',
        bank: employee.bank != null ? String(employee.bank) : '',
        agency: employee.agency || '',
        account: employee.account || '',
        account_type: employee.account_type || '',
        days_off: Array.isArray(employee.days_off) ? employee.days_off : [],
        dependents: Array.isArray(employee.dependents)
            ? employee.dependents.map((dep) => ({
                id: dep.id || null,
                name: dep.name || '',
                birth_date: formatDateForInput(dep.birth_date),
                parentesco: dep.parentesco || ''
            }))
            : []
    });
}

function validateCPF(cpf) {
    const digits = String(cpf || '').replace(/\D/g, '');

    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
        return false;
    }

    let sum = 0;

    for (let index = 0; index < 9; index += 1) {
        sum += parseInt(digits.charAt(index), 10) * (10 - index);
    }

    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(digits.charAt(9), 10)) return false;

    sum = 0;
    for (let index = 0; index < 10; index += 1) {
        sum += parseInt(digits.charAt(index), 10) * (11 - index);
    }

    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;

    return digit === parseInt(digits.charAt(10), 10);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function buildPayload(form) {
    const paymentMethod = form.payment_method;
    let bank = null;
    let agency = null;
    let account = null;
    let accountType = null;
    let pixKey = null;

    if (paymentMethod === 'PIX') {
        bank = form.bank || null;
        pixKey = form.pix_key || null;
    } else if (paymentMethod === 'Transferência') {
        bank = form.bank || null;
        agency = form.agency || null;
        account = form.account || null;
        accountType = form.account_type || null;
    }

    return {
        name: form.name,
        cpf: form.cpf,
        birth_date: form.birth_date,
        birth_city: form.birth_city,
        birth_state: form.birth_state,
        nationality: form.nationality,
        education_level: form.education_level,
        phone: form.phone,
        marital_status: form.marital_status,
        email: form.email,
        voter_id: form.voter_id || null,
        voter_zone: form.voter_zone || null,
        voter_section: form.voter_section || null,
        military_id: form.military_id || null,
        military_category: form.military_category || null,
        identity_number: form.identity_number,
        identity_issue_date: form.identity_issue_date,
        identity_issuer: form.identity_issuer,
        identity_state: form.identity_state,
        father_name: form.father_name,
        mother_name: form.mother_name,
        spouse: form.spouse || null,
        has_children: form.has_children,
        cep: form.cep,
        city: form.city,
        state: form.state,
        street: form.street,
        number: form.number,
        neighborhood: form.neighborhood,
        complement: form.complement || null,
        ctps: form.ctps,
        ctps_state: form.ctps_state,
        ctps_issue_date: form.ctps_issue_date,
        pis: form.pis,
        admission_date: form.admission_date,
        salary: form.salary,
        cargo_id: form.cargo_id,
        departamento_id: form.departamento_id,
        monthly_hours: form.monthly_hours,
        weekly_hours: form.weekly_hours,
        trial_period: form.trial_period,
        night_shift_percentage: form.night_shift_percentage || null,
        first_job: form.first_job || null,
        status: form.status,
        payment_method: paymentMethod,
        pix_key: pixKey,
        bank,
        agency,
        account,
        account_type: accountType,
        leave_reason: form.leave_reason || null,
        dismissal_date: form.dismissal_date || null,
        weekday_start: form.weekday_start || null,
        weekday_end: form.weekday_end || null,
        saturday_start: form.saturday_start || null,
        saturday_end: form.saturday_end || null,
        sunday_start: form.sunday_start || null,
        sunday_end: form.sunday_end || null,
        days_off: form.days_off,
        dependents: form.dependents.map((dep) => ({
            id: dep.id || null,
            name: dep.name || null,
            birth_date: dep.birth_date || null,
            parentesco: dep.parentesco || null
        }))
    };
}

function StateSelect({ name, value, onChange, label = 'UF', required = false, isInvalid = false }) {
    return (
        <AdminFloatField
            as="select"
            label={label}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            isInvalid={isInvalid}
        >
            <option value="">Selecione</option>
            {BRAZILIAN_STATES.map(([uf]) => (
                <option key={uf} value={uf}>{uf}</option>
            ))}
        </AdminFloatField>
    );
}

export default function FuncionarioModal({ employeeId, onClose, onSaved }) {
    const isEditing = Boolean(employeeId);
    const [form, setForm] = useState(createEmptyForm);
    const [options, setOptions] = useState({ departments: [], positions: [], banks: [] });
    const [activeTab, setActiveTab] = useState('personal');
    const [invalidFields, setInvalidFields] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const filteredPositions = useMemo(() => {
        if (!form.departamento_id) {
            return options.positions;
        }

        return options.positions.filter(
            (position) => String(position.department_id) === String(form.departamento_id)
        );
    }, [form.departamento_id, options.positions]);

    const { handleCepBlur, lookupCep, loading: cepLoading } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => ({
                ...current,
                city: address.city,
                state: address.state,
                street: address.street || current.street,
                neighborhood: address.neighborhood || current.neighborhood
            }));
        },
        onError: (message) => showToast('error', message)
    });

    const updateField = useCallback((field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
        setInvalidFields((current) => {
            if (!current[field]) {
                return current;
            }

            const next = { ...current };
            delete next[field];
            return next;
        });
    }, []);

    const handleChange = (event) => {
        const { name, value } = event.target;
        const nextValue = applyFieldMask(name, value);
        updateField(name, nextValue);

        if (name === 'cep' && onlyDigits(nextValue).length === 8) {
            lookupCep(nextValue);
        }
    };

    const handleDepartmentChange = (event) => {
        const departamentoId = event.target.value;

        setForm((current) => {
            const positionsForDepartment = options.positions.filter(
                (position) => !departamentoId || String(position.department_id) === String(departamentoId)
            );
            const cargoStillValid = positionsForDepartment.some(
                (position) => String(position.value) === current.cargo_id
            );

            return {
                ...current,
                departamento_id: departamentoId,
                cargo_id: cargoStillValid ? current.cargo_id : ''
            };
        });

        setInvalidFields((current) => {
            const next = { ...current };
            delete next.departamento_id;
            delete next.cargo_id;
            return next;
        });
    };

    const handlePaymentMethodChange = (event) => {
        const paymentMethod = event.target.value;

        setForm((current) => ({
            ...current,
            payment_method: paymentMethod,
            bank: '',
            agency: '',
            account: '',
            account_type: '',
            pix_key: ''
        }));
    };

    const toggleDayOff = (day) => {
        setForm((current) => ({
            ...current,
            days_off: current.days_off.includes(day)
                ? current.days_off.filter((item) => item !== day)
                : [...current.days_off, day]
        }));

        setInvalidFields((current) => {
            if (!current.days_off) {
                return current;
            }

            const next = { ...current };
            delete next.days_off;
            return next;
        });
    };

    const addDependent = () => {
        setForm((current) => ({
            ...current,
            dependents: [
                ...current.dependents,
                { id: null, name: '', birth_date: '', parentesco: '' }
            ]
        }));
    };

    const updateDependent = (index, field, value) => {
        setForm((current) => ({
            ...current,
            dependents: current.dependents.map((dependent, dependentIndex) => (
                dependentIndex === index ? { ...dependent, [field]: value } : dependent
            ))
        }));
    };

    const removeDependent = (index) => {
        setForm((current) => ({
            ...current,
            dependents: current.dependents.filter((_, dependentIndex) => dependentIndex !== index)
        }));
    };

    const loadModalData = useCallback(async () => {
        setLoading(true);
        setInvalidFields({});
        setActiveTab('personal');

        try {
            const loadedOptions = await fetchEmployeeOptions();
            setOptions({
                departments: loadedOptions.departments || [],
                positions: loadedOptions.positions || [],
                banks: loadedOptions.banks || []
            });

            if (employeeId) {
                const employee = await fetchEmployee(employeeId);
                setForm(mapEmployeeToForm(employee));
            } else {
                setForm(createEmptyForm());
            }
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar dados do formulário.');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [employeeId, onClose]);

    useEffect(() => {
        loadModalData();
    }, [loadModalData]);

    const validateForm = () => {
        const nextInvalidFields = {};
        let firstInvalidTab = null;

        const markInvalid = (field) => {
            nextInvalidFields[field] = true;

            if (!firstInvalidTab && FIELD_TABS[field]) {
                firstInvalidTab = FIELD_TABS[field];
            }
        };

        for (const field of REQUIRED_FIELDS) {
            const value = form[field];

            if (value === '' || value == null) {
                markInvalid(field);
            }
        }

        if (form.cpf && !validateCPF(form.cpf)) {
            markInvalid('cpf');
        }

        if (form.email && !validateEmail(form.email)) {
            markInvalid('email');
        }

        if (form.payment_method === 'PIX') {
            if (!form.pix_key) markInvalid('pix_key');
            if (!form.bank) markInvalid('bank');
        }

        if (form.payment_method === 'Transferência') {
            ['bank', 'agency', 'account', 'account_type'].forEach((field) => {
                if (!form[field]) markInvalid(field);
            });
        }

        if (form.status === 'Afastado' && !form.leave_reason) {
            markInvalid('leave_reason');
        }

        if (form.status === 'Demitido' && !form.dismissal_date) {
            markInvalid('dismissal_date');
        }

        if (!Array.isArray(form.days_off) || form.days_off.length === 0) {
            markInvalid('days_off');
        }

        setInvalidFields(nextInvalidFields);

        const invalidCount = Object.keys(nextInvalidFields).length;

        if (invalidCount > 0) {
            if (firstInvalidTab) {
                setActiveTab(firstInvalidTab);
            }

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

        setSaving(true);

        try {
            const payload = buildPayload(form);

            if (isEditing) {
                await updateEmployee(employeeId, payload);
                showToast('success', 'Funcionário atualizado com sucesso!');
            } else {
                await createEmployee(payload);
                showToast('success', 'Funcionário adicionado com sucesso!');
            }

            onSaved();
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar funcionário.');
        } finally {
            setSaving(false);
        }
    };

    const openDeleteConfirm = () => {
        if (!isEditing || deleting || saving || loading) {
            return;
        }

        setShowDeleteConfirm(true);
    };

    const closeDeleteConfirm = () => {
        if (deleting) {
            return;
        }

        setShowDeleteConfirm(false);
    };

    const handleDelete = async () => {
        if (!isEditing) {
            return;
        }

        setDeleting(true);

        try {
            await deleteEmployee(employeeId);
            setShowDeleteConfirm(false);
            showToast('success', 'Funcionário excluído com sucesso!');
            onSaved();
        } catch (error) {
            showToast('error', error.message || 'Erro ao excluir funcionário.');
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
                            <i className={`fas ${isEditing ? 'fa-user-edit' : 'fa-user-plus'}`} aria-hidden="true" />
                            <h1>{isEditing ? 'Editar Funcionário' : 'Adicionar Funcionário'}</h1>
                        </div>
                        <Button type="button" variant="link" className="admin-funcionario-back-btn" onClick={onClose}>
                            <i className="fas fa-arrow-left me-2" aria-hidden="true" />
                            Voltar
                        </Button>
                    </header>

                    <Form noValidate onSubmit={handleSubmit} className="admin-funcionario-form-shell">
                        <div className="admin-funcionario-modal-body admin-funcionario-form-body">
                    {loading ? (
                        <p className="text-muted mb-0">Carregando formulário...</p>
                    ) : (
                        <Tabs
                            activeKey={activeTab}
                            onSelect={(key) => setActiveTab(key || 'personal')}
                            className="admin-modal-tabs admin-funcionario-tabs"
                        >
                            <Tab eventKey="personal" title="Dados Pessoais">
                                <div className="admin-tab-panel">
                                <FormSection title="Dados Pessoais">
                                <div className="admin-form-personal-grid">
                                    <div className="admin-form-personal-item admin-form-personal-item--nome">
                                        <AdminFloatField
                                            label="Nome Completo"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.name)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--cpf">
                                        <AdminFloatField
                                            label="CPF"
                                            name="cpf"
                                            value={form.cpf}
                                            onChange={handleChange}
                                            maxLength={14}
                                            required
                                            isInvalid={Boolean(invalidFields.cpf)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--birth-date">
                                        <AdminDateField
                                            label="Data de Nascimento"
                                            name="birth_date"
                                            value={form.birth_date}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.birth_date)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--birth-city">
                                        <AdminFloatField
                                            label="Local de Nascimento"
                                            name="birth_city"
                                            value={form.birth_city}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.birth_city)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--birth-uf">
                                        <StateSelect
                                            label="UF de Nascimento"
                                            name="birth_state"
                                            value={form.birth_state}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.birth_state)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--nationality">
                                        <AdminFloatField
                                            label="Nacionalidade"
                                            name="nationality"
                                            value={form.nationality}
                                            onChange={handleChange}
                                            maxLength={50}
                                            required
                                            isInvalid={Boolean(invalidFields.nationality)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--education">
                                        <AdminFloatField
                                            as="select"
                                            label="Grau de Instrução"
                                            name="education_level"
                                            value={form.education_level}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.education_level)}
                                        >
                                            <option value="">Selecione</option>
                                            {EDUCATION_LEVELS.map((level) => (
                                                <option key={level} value={level}>{level}</option>
                                            ))}
                                        </AdminFloatField>
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--marital">
                                        <AdminFloatField
                                            as="select"
                                            label="Estado Civil"
                                            name="marital_status"
                                            value={form.marital_status}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.marital_status)}
                                        >
                                            <option value="">Selecione</option>
                                            {MARITAL_STATUS.map((status) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </AdminFloatField>
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--phone">
                                        <AdminFloatField
                                            label="Telefone"
                                            name="phone"
                                            value={form.phone}
                                            onChange={handleChange}
                                            maxLength={15}
                                            required
                                            isInvalid={Boolean(invalidFields.phone)}
                                        />
                                    </div>
                                    <div className="admin-form-personal-item admin-form-personal-item--email">
                                        <AdminFloatField
                                            type="email"
                                            label="Email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.email)}
                                        />
                                    </div>
                                </div>
                                </FormSection>

                                <FormSection title="Documentos">
                                <Row className="g-3 admin-form-row-voter">
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminFloatField
                                            label="Título de Eleitor"
                                            name="voter_id"
                                            value={form.voter_id}
                                            onChange={handleChange}
                                            maxLength={20}
                                        />
                                    </Col>
                                    <Col xs={12} md={6} lg={2}>
                                        <AdminFloatField
                                            label="Carteira de Reservista"
                                            name="military_id"
                                            value={form.military_id}
                                            onChange={handleChange}
                                            maxLength={20}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} lg={2}>
                                        <AdminFloatField
                                            label="Zona"
                                            name="voter_zone"
                                            value={form.voter_zone}
                                            onChange={handleChange}
                                            maxLength={10}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} lg={2}>
                                        <AdminFloatField
                                            label="Seção"
                                            name="voter_section"
                                            value={form.voter_section}
                                            onChange={handleChange}
                                            maxLength={10}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} lg={3}>
                                        <AdminFloatField
                                            label="Cat. reservista"
                                            name="military_category"
                                            value={form.military_category}
                                            onChange={handleChange}
                                            maxLength={20}
                                        />
                                    </Col>
                                </Row>

                                <Row className="g-3 admin-form-row-identity">
                                    <Col xs={12} md={6} lg={2}>
                                        <AdminFloatField
                                            label="Identidade"
                                            name="identity_number"
                                            value={form.identity_number}
                                            onChange={handleChange}
                                            maxLength={20}
                                            required
                                            isInvalid={Boolean(invalidFields.identity_number)}
                                        />
                                    </Col>
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminDateField
                                            label="Data de Emissão"
                                            name="identity_issue_date"
                                            value={form.identity_issue_date}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.identity_issue_date)}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} lg={3}>
                                        <AdminFloatField
                                            label="Órgão Emissor"
                                            name="identity_issuer"
                                            value={form.identity_issuer}
                                            onChange={handleChange}
                                            maxLength={10}
                                            required
                                            isInvalid={Boolean(invalidFields.identity_issuer)}
                                        />
                                    </Col>
                                    <Col xs={12} sm={6} lg={2}>
                                        <StateSelect
                                            label="UF"
                                            name="identity_state"
                                            value={form.identity_state}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.identity_state)}
                                        />
                                    </Col>
                                </Row>
                                </FormSection>

                                <FormSection title="Filiação">
                                <Row className="g-3 admin-form-grid">
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminFloatField
                                            label="Nome do Pai"
                                            name="father_name"
                                            value={form.father_name}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.father_name)}
                                        />
                                    </Col>
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminFloatField
                                            label="Nome da Mãe"
                                            name="mother_name"
                                            value={form.mother_name}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.mother_name)}
                                        />
                                    </Col>
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminFloatField
                                            label="Cônjuge"
                                            name="spouse"
                                            value={form.spouse}
                                            onChange={handleChange}
                                            maxLength={100}
                                        />
                                    </Col>
                                    <Col xs={12} md={6} lg={3}>
                                        <AdminFloatField
                                            as="select"
                                            label="Tem filhos?"
                                            name="has_children"
                                            value={form.has_children}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.has_children)}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="sim">Sim</option>
                                            <option value="nao">Não</option>
                                        </AdminFloatField>
                                    </Col>
                                </Row>
                                </FormSection>
                                </div>
                            </Tab>

                            <Tab eventKey="address" title="Endereço">
                                <div className="admin-tab-panel">
                                <FormSection title="Endereço">
                                <div className="admin-form-address-grid">
                                    <div className="admin-form-address-item admin-form-address-item--cep">
                                        <AdminFloatField
                                            label="CEP"
                                            name="cep"
                                            value={form.cep}
                                            onChange={handleChange}
                                            onBlur={(event) => handleCepBlur(event.target.value)}
                                            maxLength={9}
                                            inputMode="numeric"
                                            required
                                            isInvalid={Boolean(invalidFields.cep)}
                                        />
                                        {cepLoading && <p className="admin-field-hint mb-0">Consultando CEP...</p>}
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--city">
                                        <AdminFloatField
                                            label="Cidade"
                                            name="city"
                                            value={form.city}
                                            readOnly
                                            disabled
                                            required
                                            isInvalid={Boolean(invalidFields.city)}
                                        />
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--state">
                                        <AdminFloatField
                                            label="Estado"
                                            name="state"
                                            value={form.state}
                                            readOnly
                                            disabled
                                            required
                                            isInvalid={Boolean(invalidFields.state)}
                                        />
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--street">
                                        <AdminFloatField
                                            label="Rua"
                                            name="street"
                                            value={form.street}
                                            onChange={handleChange}
                                            maxLength={100}
                                            required
                                            isInvalid={Boolean(invalidFields.street)}
                                        />
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--number">
                                        <AdminFloatField
                                            label="Número"
                                            name="number"
                                            value={form.number}
                                            onChange={handleChange}
                                            maxLength={10}
                                            required
                                            isInvalid={Boolean(invalidFields.number)}
                                        />
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--neighborhood">
                                        <AdminFloatField
                                            label="Bairro"
                                            name="neighborhood"
                                            value={form.neighborhood}
                                            onChange={handleChange}
                                            maxLength={50}
                                            required
                                            isInvalid={Boolean(invalidFields.neighborhood)}
                                        />
                                    </div>
                                    <div className="admin-form-address-item admin-form-address-item--complement">
                                        <AdminFloatField
                                            label="Complemento"
                                            name="complement"
                                            value={form.complement}
                                            onChange={handleChange}
                                            maxLength={100}
                                        />
                                    </div>
                                </div>
                                </FormSection>
                                </div>
                            </Tab>

                            <Tab eventKey="professional" title="Dados Profissionais">
                                <div className="admin-tab-panel">
                                <FormSection title="Registro trabalhista">
                                <div className="admin-form-row-6">
                                    <div className="admin-form-row-6-item admin-form-row-6-item--ctps">
                                        <AdminFloatField
                                            label="CTPS (Número/Série)"
                                            name="ctps"
                                            value={form.ctps}
                                            onChange={handleChange}
                                            maxLength={20}
                                            required
                                            isInvalid={Boolean(invalidFields.ctps)}
                                        />
                                    </div>
                                    <div className="admin-form-row-6-item admin-form-row-6-item--uf">
                                        <StateSelect
                                            label="UF"
                                            name="ctps_state"
                                            value={form.ctps_state}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.ctps_state)}
                                        />
                                    </div>
                                    <div className="admin-form-row-6-item admin-form-row-6-item--issue">
                                        <AdminDateField
                                            label="Data de Emissão"
                                            name="ctps_issue_date"
                                            value={form.ctps_issue_date}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.ctps_issue_date)}
                                        />
                                    </div>
                                    <div className="admin-form-row-6-item admin-form-row-6-item--pis">
                                        <AdminFloatField
                                            label="PIS/PASEP"
                                            name="pis"
                                            value={form.pis}
                                            onChange={handleChange}
                                            maxLength={14}
                                            required
                                            isInvalid={Boolean(invalidFields.pis)}
                                        />
                                    </div>
                                    <div className="admin-form-row-6-item admin-form-row-6-item--first-job">
                                        <AdminFloatField
                                            as="select"
                                            label="Primeiro Emprego"
                                            name="first_job"
                                            value={form.first_job}
                                            onChange={handleChange}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="sim">Sim</option>
                                            <option value="nao">Não</option>
                                        </AdminFloatField>
                                    </div>
                                    <div className="admin-form-row-6-item admin-form-row-6-item--status">
                                        <AdminStatusToggle
                                            label="Status"
                                            name="status"
                                            checked={form.status === 'Ativo'}
                                            required
                                            isInvalid={Boolean(invalidFields.status)}
                                            onChange={(event) => {
                                                handleChange({
                                                    target: {
                                                        name: 'status',
                                                        value: event.target.checked
                                                            ? 'Ativo'
                                                            : (form.status === 'Demitido' ? 'Demitido' : 'Afastado'),
                                                    },
                                                });
                                            }}
                                        />
                                    </div>
                                </div>
                                {(form.status === 'Afastado' || form.status === 'Demitido') && (
                                <div className="admin-form-status-extra-row">
                                    <div className="admin-form-status-extra-item admin-form-status-extra-item--situacao">
                                        <AdminFloatField
                                            as="select"
                                            label="Situação"
                                            name="status"
                                            value={form.status === 'Demitido' ? 'Demitido' : 'Afastado'}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.status)}
                                        >
                                            <option value="Afastado">Afastado</option>
                                            <option value="Demitido">Demitido</option>
                                        </AdminFloatField>
                                    </div>
                                    {form.status === 'Afastado' && (
                                        <div className="admin-form-status-extra-item admin-form-status-extra-item--motivo">
                                            <AdminFloatField
                                                label="Motivo de Afastamento"
                                                name="leave_reason"
                                                value={form.leave_reason}
                                                onChange={handleChange}
                                                maxLength={100}
                                                required
                                                isInvalid={Boolean(invalidFields.leave_reason)}
                                            />
                                        </div>
                                    )}
                                    {form.status === 'Demitido' && (
                                        <div className="admin-form-status-extra-item admin-form-status-extra-item--motivo">
                                            <AdminDateField
                                                label="Data de Demissão"
                                                name="dismissal_date"
                                                value={form.dismissal_date}
                                                onChange={handleChange}
                                                required
                                                isInvalid={Boolean(invalidFields.dismissal_date)}
                                            />
                                        </div>
                                    )}
                                </div>
                                )}
                                </FormSection>

                                <FormSection title="Contrato e função">
                                <div className="admin-form-row-4">
                                    <div className="admin-form-row-4-item">
                                        <AdminDateField
                                            label="Data de Admissão"
                                            name="admission_date"
                                            value={form.admission_date}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.admission_date)}
                                        />
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            type="number"
                                            label="Salário (R$)"
                                            name="salary"
                                            value={form.salary}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            required
                                            isInvalid={Boolean(invalidFields.salary)}
                                        />
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            as="select"
                                            label="Departamento"
                                            name="departamento_id"
                                            value={form.departamento_id}
                                            onChange={handleDepartmentChange}
                                            required
                                            isInvalid={Boolean(invalidFields.departamento_id)}
                                        >
                                            <option value="">Selecione</option>
                                            {options.departments.map((department) => (
                                                <option key={department.value} value={String(department.value)}>
                                                    {department.text}
                                                </option>
                                            ))}
                                        </AdminFloatField>
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            as="select"
                                            label="Função"
                                            name="cargo_id"
                                            value={form.cargo_id}
                                            onChange={handleChange}
                                            required
                                            isInvalid={Boolean(invalidFields.cargo_id)}
                                        >
                                            <option value="">Selecione</option>
                                            {filteredPositions.map((position) => (
                                                <option key={position.value} value={String(position.value)}>
                                                    {position.text}
                                                </option>
                                            ))}
                                        </AdminFloatField>
                                    </div>
                                </div>
                                </FormSection>

                                <FormSection title="Carga horária">
                                <div className="admin-form-row-4">
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            type="number"
                                            label="Carga Horária Mensal"
                                            name="monthly_hours"
                                            value={form.monthly_hours}
                                            onChange={handleChange}
                                            min="0"
                                            required
                                            isInvalid={Boolean(invalidFields.monthly_hours)}
                                        />
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            type="number"
                                            label="Carga Horária Semanal"
                                            name="weekly_hours"
                                            value={form.weekly_hours}
                                            onChange={handleChange}
                                            min="0"
                                            required
                                            isInvalid={Boolean(invalidFields.weekly_hours)}
                                        />
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            type="number"
                                            label="Contrato de Experiência (dias)"
                                            name="trial_period"
                                            value={form.trial_period}
                                            onChange={handleChange}
                                            min="0"
                                            max="90"
                                            required
                                            isInvalid={Boolean(invalidFields.trial_period)}
                                        />
                                    </div>
                                    <div className="admin-form-row-4-item">
                                        <AdminFloatField
                                            type="number"
                                            label="Adicional Noturno (%)"
                                            name="night_shift_percentage"
                                            value={form.night_shift_percentage}
                                            onChange={handleChange}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                    </div>
                                </div>
                                </FormSection>

                                <FormSection title="Calendário semanal">
                                <WorkScheduleBlock
                                    form={form}
                                    invalidFields={invalidFields}
                                    onToggleDayOff={toggleDayOff}
                                    onChange={handleChange}
                                />
                                </FormSection>
                                </div>
                            </Tab>

                            <Tab eventKey="bank" title="Dados Bancários">
                                <div className="admin-tab-panel">
                                <FormSection title="Forma de pagamento">
                                <div className={`admin-form-row-payment${form.payment_method === 'PIX' ? '' : ' is-compact'}`}>
                                    <div className="admin-form-row-payment-item">
                                        <AdminFloatField
                                            as="select"
                                            label="Forma de Pagamento"
                                            name="payment_method"
                                            value={form.payment_method}
                                            onChange={handlePaymentMethodChange}
                                            required
                                            isInvalid={Boolean(invalidFields.payment_method)}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="PIX">PIX</option>
                                            <option value="Transferência">Transferência</option>
                                            <option value="Dinheiro">Dinheiro</option>
                                        </AdminFloatField>
                                    </div>

                                    {form.payment_method === 'PIX' && (
                                        <>
                                            <div className="admin-form-row-payment-item">
                                                <AdminFloatField
                                                    as="select"
                                                    label="Banco"
                                                    name="bank"
                                                    value={form.bank}
                                                    onChange={handleChange}
                                                    required
                                                    isInvalid={Boolean(invalidFields.bank)}
                                                >
                                                    <option value="">Selecione</option>
                                                    {options.banks.map((bank) => (
                                                        <option key={bank.value} value={String(bank.value)}>
                                                            {bank.text}
                                                        </option>
                                                    ))}
                                                </AdminFloatField>
                                            </div>
                                            <div className="admin-form-row-payment-item">
                                                <AdminFloatField
                                                    label="Chave PIX"
                                                    name="pix_key"
                                                    value={form.pix_key}
                                                    onChange={handleChange}
                                                    maxLength={50}
                                                    required
                                                    isInvalid={Boolean(invalidFields.pix_key)}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                                </FormSection>

                                {form.payment_method === 'Transferência' && (
                                    <FormSection title="Conta bancária">
                                    <div className="admin-form-row-4">
                                        <div className="admin-form-row-4-item">
                                            <AdminFloatField
                                                as="select"
                                                label="Banco"
                                                name="bank"
                                                value={form.bank}
                                                onChange={handleChange}
                                                required
                                                isInvalid={Boolean(invalidFields.bank)}
                                            >
                                                <option value="">Selecione</option>
                                                {options.banks.map((bank) => (
                                                    <option key={bank.value} value={String(bank.value)}>
                                                        {bank.text}
                                                    </option>
                                                ))}
                                            </AdminFloatField>
                                        </div>
                                        <div className="admin-form-row-4-item">
                                            <AdminFloatField
                                                label="Agência"
                                                name="agency"
                                                value={form.agency}
                                                onChange={handleChange}
                                                maxLength={10}
                                                required
                                                isInvalid={Boolean(invalidFields.agency)}
                                            />
                                        </div>
                                        <div className="admin-form-row-4-item">
                                            <AdminFloatField
                                                label="Conta"
                                                name="account"
                                                value={form.account}
                                                onChange={handleChange}
                                                maxLength={20}
                                                required
                                                isInvalid={Boolean(invalidFields.account)}
                                            />
                                        </div>
                                        <div className="admin-form-row-4-item">
                                            <AdminFloatField
                                                as="select"
                                                label="Tipo de Conta"
                                                name="account_type"
                                                value={form.account_type}
                                                onChange={handleChange}
                                                required
                                                isInvalid={Boolean(invalidFields.account_type)}
                                            >
                                                <option value="">Selecione</option>
                                                <option value="Corrente">Corrente</option>
                                                <option value="Poupança">Poupança</option>
                                            </AdminFloatField>
                                        </div>
                                    </div>
                                    </FormSection>
                                )}
                                </div>
                            </Tab>

                            <Tab eventKey="dependents" title="Dependentes">
                                <div className="admin-tab-panel">
                                <FormSection title="Dependentes">
                                <div className="mb-3">
                                    <Button
                                        type="button"
                                        variant="primary"
                                        className="admin-dependent-add-btn"
                                        onClick={addDependent}
                                    >
                                        <i className="fas fa-plus me-2" aria-hidden="true" />
                                        Adicionar Dependente
                                    </Button>
                                </div>

                                {form.dependents.length === 0 && (
                                    <p className="text-muted mb-0">Nenhum dependente cadastrado.</p>
                                )}

                                {form.dependents.map((dependent, index) => (
                                    <div key={`dependent-${dependent.id || index}`} className="admin-dependent-card">
                                        <div className="admin-form-dependent-row">
                                            <div className="admin-form-dependent-item admin-form-dependent-item--name">
                                                <AdminFloatField
                                                    label="Nome do Dependente"
                                                    value={dependent.name}
                                                    onChange={(event) => updateDependent(index, 'name', event.target.value)}
                                                    maxLength={100}
                                                />
                                            </div>
                                            <div className="admin-form-dependent-item admin-form-dependent-item--birth">
                                                <AdminDateField
                                                    label="Data de Nascimento"
                                                    value={dependent.birth_date}
                                                    onChange={(event) => updateDependent(index, 'birth_date', event.target.value)}
                                                />
                                            </div>
                                            <div className="admin-form-dependent-item admin-form-dependent-item--relation">
                                                <AdminFloatField
                                                    as="select"
                                                    label="Parentesco"
                                                    value={dependent.parentesco}
                                                    onChange={(event) => updateDependent(index, 'parentesco', event.target.value)}
                                                >
                                                    <option value="">Selecione</option>
                                                    {PARENTESCO_OPTIONS.map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </AdminFloatField>
                                            </div>
                                            <div className="admin-form-dependent-item admin-form-dependent-item--action">
                                                <Button
                                                    type="button"
                                                    variant="danger"
                                                    className="admin-dependent-remove-btn"
                                                    onClick={() => removeDependent(index)}
                                                    aria-label="Remover dependente"
                                                >
                                                    <i className="fas fa-trash" aria-hidden="true" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                </FormSection>
                                </div>
                            </Tab>
                        </Tabs>
                    )}
                        </div>

                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">
                    {isEditing && (
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
                        Deseja realmente excluir o funcionário{' '}
                        <strong>{form.full_name?.trim() || 'selecionado'}</strong>?
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
