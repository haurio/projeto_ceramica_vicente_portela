import { useCallback, useEffect, useState } from 'react';

import {

    Button,

    Col,

    Form,

    Row,

    Tab,

    Tabs

} from 'react-bootstrap';

import { createEmpresa, fetchCnae, fetchEmpresa, updateEmpresa } from '../../../api/empresa';

import { useViaCep } from '../../../hooks/useViaCep';

import { showRequiredFieldsToast, showToast } from '../../../utils/toast';

import {

    formatCep,

    formatCnae,

    formatCnpj,

    formatInscricaoEstadual,

    formatInscricaoMunicipal,

    formatPhone,

    onlyDigits

} from '../../../utils/inputMasks';

import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';

import AdminFloatField from '../AdminFloatField';

import FormSection from '../FormSection';



const EMPTY_FORM = {

    razao_social: '',

    nome_fantasia: '',

    cnpj: '',

    porte: '',

    inscricao_estadual: '',

    inscricao_municipal: '',

    id_cnae: '',

    cnae: '',

    descricao_cnae: '',

    regime_tributario: '',

    data_fundacao: '',

    natureza_juridica: '',

    cep: '',

    cidade: '',

    estado: '',

    rua: '',

    numero: '',

    bairro: '',

    complemento: '',

    email: '',

    telefone: '',

    site: '',

    pessoa_contato: '',

    situacao_cadastral: 'Ativa',

    atividades_secundarias: []

};



function formatDateForInput(value) {

    if (!value) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toISOString().slice(0, 10);

}



function normalizeEmpresaForm(data = {}) {

    return {

        razao_social: data.razao_social || '',

        nome_fantasia: data.nome_fantasia || '',

        cnpj: formatCnpj(data.cnpj || ''),

        porte: data.porte || '',

        inscricao_estadual: formatInscricaoEstadual(data.inscricao_estadual || ''),

        inscricao_municipal: formatInscricaoMunicipal(data.inscricao_municipal || ''),

        id_cnae: String(data.id_cnae || data.id_cnae_principal || ''),

        cnae: formatCnae(data.cnae || ''),

        descricao_cnae: data.descricao_cnae || '',

        regime_tributario: data.regime_tributario || '',

        data_fundacao: formatDateForInput(data.data_fundacao),

        natureza_juridica: data.natureza_juridica || '',

        cep: formatCep(data.cep || ''),

        cidade: data.cidade || '',

        estado: data.estado || '',

        rua: data.rua || '',

        numero: data.numero || '',

        bairro: data.bairro || '',

        complemento: data.complemento || '',

        email: String(data.email || '').trim().toLowerCase(),

        telefone: formatPhone(data.telefone || ''),

        site: data.site || '',

        pessoa_contato: data.pessoa_contato || '',

        situacao_cadastral: data.situacao_cadastral || 'Ativa',

        atividades_secundarias: Array.isArray(data.atividades_secundarias)

            ? data.atividades_secundarias.map((item) => ({

                cnae: formatCnae(item.cnae || ''),

                id_cnae: String(item.id_cnae || ''),

                descricao_cnae: item.descricao_cnae || ''

            }))

            : []

    };

}



export default function EmpresaModal({ empresaId, onClose, onSaved }) {

    const [form, setForm] = useState(EMPTY_FORM);

    const [invalidFields, setInvalidFields] = useState({});

    const [loading, setLoading] = useState(false);

    const [saving, setSaving] = useState(false);

    const [activeTab, setActiveTab] = useState('basic');

    const isEdit = Boolean(empresaId);



    const { handleCepBlur, lookupCep, loading: cepLoading } = useViaCep({

        onAddressFound: (address) => {

            setForm((current) => ({

                ...current,

                cidade: address.city,

                estado: address.state,

                rua: address.street,

                bairro: address.neighborhood

            }));

        },

        onError: (message) => showToast('warning', message)

    });



    const loadEmpresa = useCallback(async () => {

        if (!empresaId) {

            setForm(EMPTY_FORM);

            setInvalidFields({});

            setLoading(false);

            return;

        }



        setLoading(true);



        try {

            const data = await fetchEmpresa(empresaId);

            setForm(normalizeEmpresaForm(data));

        } catch (error) {

            showToast('error', error.message);

        } finally {

            setLoading(false);

        }

    }, [empresaId]);



    useEffect(() => {

        loadEmpresa();

        setActiveTab('basic');

    }, [loadEmpresa]);



    const updateField = (field, value) => {

        let nextValue = value;



        if (field === 'cnpj') nextValue = formatCnpj(value);

        if (field === 'inscricao_estadual') nextValue = formatInscricaoEstadual(value);

        if (field === 'inscricao_municipal') nextValue = formatInscricaoMunicipal(value);

        if (field === 'telefone') nextValue = formatPhone(value);

        if (field === 'cep') nextValue = formatCep(value);

        if (field === 'email') nextValue = String(value || '').replace(/\s/g, '').toLowerCase();



        setForm((current) => ({ ...current, [field]: nextValue }));

        if (String(nextValue || '').trim()) {

            setInvalidFields((current) => {

                if (!current[field] && !(field === 'cnae' && current.id_cnae)) return current;

                const next = { ...current };

                delete next[field];

                if (field === 'cnae') delete next.id_cnae;

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



    const lookupCnae = async (codigo) => {

        const digits = String(codigo || '').replace(/\D/g, '');

        if (digits.length !== 7) {

            return { id_cnae: '', descricao_cnae: '' };

        }



        try {

            const data = await fetchCnae(codigo);

            return {

                id_cnae: String(data.id || ''),

                descricao_cnae: data.descricao || ''

            };

        } catch (error) {

            showToast('warning', error.message || 'CNAE não encontrado.');

            return { id_cnae: '', descricao_cnae: '' };

        }

    };



    const handleCnaeChange = async (value) => {

        const formatted = formatCnae(value);



        if (onlyDigits(formatted).length === 7) {

            const result = await lookupCnae(formatted);

            setForm((current) => ({

                ...current,

                cnae: formatted,

                id_cnae: result.id_cnae,

                descricao_cnae: result.descricao_cnae

            }));

        } else {

            setForm((current) => ({

                ...current,

                cnae: formatted,

                id_cnae: '',

                descricao_cnae: ''

            }));

        }

    };



    const addSecondaryActivity = () => {

        setForm((current) => ({

            ...current,

            atividades_secundarias: [

                ...current.atividades_secundarias,

                { cnae: '', id_cnae: '', descricao_cnae: '' }

            ]

        }));

    };



    const updateSecondaryActivity = async (index, field, value) => {

        const nextActivities = [...form.atividades_secundarias];

        const current = { ...nextActivities[index], [field]: value };



        if (field === 'cnae') {

            current.cnae = formatCnae(value);

            if (onlyDigits(current.cnae).length === 7) {

                const result = await lookupCnae(current.cnae);

                current.id_cnae = result.id_cnae;

                current.descricao_cnae = result.descricao_cnae;

            } else {

                current.id_cnae = '';

                current.descricao_cnae = '';

            }

        }



        nextActivities[index] = current;

        setForm((prev) => ({ ...prev, atividades_secundarias: nextActivities }));

    };



    const removeSecondaryActivity = (index) => {

        setForm((current) => ({

            ...current,

            atividades_secundarias: current.atividades_secundarias.filter((_, i) => i !== index)

        }));

    };



    const validateForm = () => {

        const required = [

            ['razao_social', 'Razão Social'],

            ['cnpj', 'CNPJ'],

            ['inscricao_municipal', 'Inscrição Municipal'],

            ['id_cnae', 'CNAE'],

            ['regime_tributario', 'Regime Tributário'],

            ['data_fundacao', 'Data de Fundação'],

            ['cep', 'CEP'],

            ['cidade', 'Cidade'],

            ['estado', 'Estado'],

            ['rua', 'Rua'],

            ['numero', 'Número'],

            ['bairro', 'Bairro'],

            ['email', 'E-mail'],

            ['telefone', 'Telefone']

        ];



        const nextInvalid = {};

        let firstInvalidTab = null;

        const fieldTabs = {

            razao_social: 'basic',

            cnpj: 'basic',

            inscricao_municipal: 'basic',

            id_cnae: 'basic',

            cnae: 'basic',

            regime_tributario: 'basic',

            data_fundacao: 'basic',

            cep: 'address',

            cidade: 'address',

            estado: 'address',

            rua: 'address',

            numero: 'address',

            bairro: 'address',

            email: 'contact',

            telefone: 'contact'

        };



        for (const [field] of required) {

            if (!String(form[field] || '').trim()) {

                nextInvalid[field] = true;

                if (field === 'id_cnae') nextInvalid.cnae = true;

                if (!firstInvalidTab) firstInvalidTab = fieldTabs[field];

            }

        }



        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {

            nextInvalid.email = true;

            if (!firstInvalidTab) firstInvalidTab = 'contact';

        }



        setInvalidFields(nextInvalid);



        if (Object.keys(nextInvalid).length > 0) {

            if (firstInvalidTab) setActiveTab(firstInvalidTab);

            showRequiredFieldsToast();

            return false;

        }



        return true;

    };



    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!validateForm()) return;



        const payload = {

            ...form,

            id_cnae: Number(form.id_cnae),

            atividades_secundarias: form.atividades_secundarias.filter((item) => item.id_cnae)

        };



        setSaving(true);



        try {

            if (isEdit) {

                await updateEmpresa(empresaId, payload);

                showToast('success', 'Empresa atualizada com sucesso.');

            } else {

                await createEmpresa(payload);

                showToast('success', 'Empresa criada com sucesso.');

            }

            onSaved?.();

        } catch (error) {

            showToast('error', error.message);

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

                            <i className={`fas ${isEdit ? 'fa-building' : 'fa-plus'}`} aria-hidden="true" />

                            <h1>{isEdit ? 'Editar Empresa' : 'Adicionar Empresa'}</h1>

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

                                    onSelect={(key) => setActiveTab(key || 'basic')}

                                    className="admin-funcionario-tabs admin-modal-tabs mb-3"

                                >

                                    <Tab eventKey="basic" title="Dados Básicos">

                                        <FormSection title="Identificação">

                                            <Row className="g-3">

                                                <Col md={5}>

                                                    <AdminFloatField

                                                        label="Razão Social"

                                                        name="razao_social"

                                                        value={form.razao_social}

                                                        onChange={handleChange}

                                                        required

                                                        isInvalid={Boolean(invalidFields.razao_social)}

                                                    />

                                                </Col>

                                                <Col md={5}>

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

                                                <Col md={2}>

                                                    <AdminFloatField

                                                        as="select"

                                                        label="Porte"

                                                        name="porte"

                                                        value={form.porte}

                                                        onChange={handleChange}

                                                    >

                                                        <option value="">Selecione</option>

                                                        <option value="ME">ME</option>

                                                        <option value="EPP">EPP</option>

                                                        <option value="DEMAIS">Demais</option>

                                                    </AdminFloatField>

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Nome Fantasia"

                                                        name="nome_fantasia"

                                                        value={form.nome_fantasia}

                                                        onChange={handleChange}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Inscrição Estadual"

                                                        name="inscricao_estadual"

                                                        value={form.inscricao_estadual}

                                                        onChange={handleChange}

                                                        placeholder="000.000.000.000-00 ou ISENTO"

                                                        maxLength={18}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Inscrição Municipal"

                                                        name="inscricao_municipal"

                                                        value={form.inscricao_municipal}

                                                        onChange={handleChange}

                                                        inputMode="numeric"

                                                        maxLength={15}

                                                        required

                                                        isInvalid={Boolean(invalidFields.inscricao_municipal)}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="CNAE Principal"

                                                        name="cnae"

                                                        value={form.cnae}

                                                        onChange={(e) => handleCnaeChange(e.target.value)}

                                                        inputMode="numeric"

                                                        placeholder="0000-0/00"

                                                        maxLength={9}

                                                        required

                                                        isInvalid={Boolean(invalidFields.cnae || invalidFields.id_cnae)}

                                                    />

                                                </Col>

                                                <Col md={12}>

                                                    <AdminFloatField

                                                        label="Descrição do CNAE"

                                                        name="descricao_cnae"

                                                        value={form.descricao_cnae}

                                                        readOnly

                                                        disabled

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        as="select"

                                                        label="Regime Tributário"

                                                        name="regime_tributario"

                                                        value={form.regime_tributario}

                                                        onChange={handleChange}

                                                        required

                                                        isInvalid={Boolean(invalidFields.regime_tributario)}

                                                    >

                                                        <option value="">Selecione</option>

                                                        <option value="Simples Nacional">Simples Nacional</option>

                                                        <option value="Lucro Presumido">Lucro Presumido</option>

                                                        <option value="Lucro Real">Lucro Real</option>

                                                    </AdminFloatField>

                                                </Col>

                                                <Col md={6}>

                                                    <AdminDateField

                                                        label="Data de Fundação"

                                                        name="data_fundacao"

                                                        value={form.data_fundacao}

                                                        required

                                                        isInvalid={Boolean(invalidFields.data_fundacao)}

                                                        onChange={(e) => updateField('data_fundacao', e.target.value)}

                                                    />

                                                </Col>

                                                <Col md={12}>

                                                    <AdminFloatField

                                                        label="Natureza Jurídica"

                                                        name="natureza_juridica"

                                                        value={form.natureza_juridica}

                                                        onChange={handleChange}

                                                    />

                                                </Col>

                                            </Row>

                                        </FormSection>

                                    </Tab>



                                    <Tab eventKey="address" title="Endereço">

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

                                                        required

                                                        isInvalid={Boolean(invalidFields.cep)}

                                                    />

                                                    {cepLoading && (

                                                        <p className="admin-field-hint mb-0 mt-1">Consultando CEP...</p>

                                                    )}

                                                </Col>

                                                <Col md>

                                                    <AdminFloatField

                                                        label="Rua"

                                                        name="rua"

                                                        value={form.rua}

                                                        onChange={handleChange}

                                                        required

                                                        isInvalid={Boolean(invalidFields.rua)}

                                                    />

                                                </Col>

                                                <Col md="auto" style={{ width: '6.5rem', maxWidth: '6.5rem' }}>

                                                    <AdminFloatField

                                                        label="Número"

                                                        name="numero"

                                                        value={form.numero}

                                                        onChange={handleChange}

                                                        required

                                                        isInvalid={Boolean(invalidFields.numero)}

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

                                                        required

                                                        isInvalid={Boolean(invalidFields.bairro)}

                                                    />

                                                </Col>

                                                <Col md={4}>

                                                    <AdminFloatField

                                                        label="Cidade"

                                                        name="cidade"

                                                        value={form.cidade}

                                                        readOnly

                                                        disabled

                                                        required

                                                        isInvalid={Boolean(invalidFields.cidade)}

                                                    />

                                                </Col>

                                                <Col md={4}>

                                                    <AdminFloatField

                                                        label="Estado"

                                                        name="estado"

                                                        value={form.estado}

                                                        readOnly

                                                        disabled

                                                        required

                                                        isInvalid={Boolean(invalidFields.estado)}

                                                    />

                                                </Col>

                                            </Row>

                                        </FormSection>

                                    </Tab>



                                    <Tab eventKey="contact" title="Contato">

                                        <FormSection title="Contato">

                                            <Row className="g-3">

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="E-mail"

                                                        name="email"

                                                        type="email"

                                                        value={form.email}

                                                        onChange={handleChange}

                                                        placeholder="contato@empresa.com"

                                                        autoComplete="email"

                                                        required

                                                        isInvalid={Boolean(invalidFields.email)}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Telefone"

                                                        name="telefone"

                                                        value={form.telefone}

                                                        onChange={handleChange}

                                                        inputMode="tel"

                                                        placeholder="(00) 00000-0000"

                                                        maxLength={15}

                                                        required

                                                        isInvalid={Boolean(invalidFields.telefone)}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Website"

                                                        name="site"

                                                        value={form.site}

                                                        onChange={handleChange}

                                                    />

                                                </Col>

                                                <Col md={6}>

                                                    <AdminFloatField

                                                        label="Pessoa de Contato"

                                                        name="pessoa_contato"

                                                        value={form.pessoa_contato}

                                                        onChange={handleChange}

                                                    />

                                                </Col>

                                            </Row>

                                        </FormSection>

                                    </Tab>



                                    <Tab eventKey="additional" title="Dados Adicionais">

                                        <FormSection title="Situação e Atividades">

                                            <Form.Group className="mb-3">

                                                <Form.Label>Situação Cadastral *</Form.Label>

                                                <div className="d-flex gap-3 admin-situacao-radio">

                                                    <Form.Check

                                                        type="radio"

                                                        label="Ativa"

                                                        name="situacao_cadastral"

                                                        id="situacao-ativa"

                                                        checked={form.situacao_cadastral === 'Ativa'}

                                                        onChange={() => updateField('situacao_cadastral', 'Ativa')}

                                                    />

                                                    <Form.Check

                                                        type="radio"

                                                        label="Inativa"

                                                        name="situacao_cadastral"

                                                        id="situacao-inativa"

                                                        checked={form.situacao_cadastral === 'Inativa'}

                                                        onChange={() => updateField('situacao_cadastral', 'Inativa')}

                                                    />

                                                </div>

                                            </Form.Group>



                                            <Form.Label>Atividades Econômicas Secundárias</Form.Label>

                                            {form.atividades_secundarias.map((activity, index) => (

                                                <div key={`secondary-${index}`} className="admin-secondary-activity-row">

                                                    <AdminFloatField

                                                        label="CNAE"

                                                        value={activity.cnae}

                                                        onChange={(e) => updateSecondaryActivity(index, 'cnae', e.target.value)}

                                                        inputMode="numeric"

                                                        placeholder="0000-0/00"

                                                        maxLength={9}

                                                    />

                                                    <AdminFloatField

                                                        label="Descrição da atividade"

                                                        value={activity.descricao_cnae}

                                                        readOnly

                                                        disabled

                                                    />

                                                    <Button

                                                        type="button"

                                                        variant="danger"

                                                        className="admin-dependent-remove-btn"

                                                        onClick={() => removeSecondaryActivity(index)}

                                                        aria-label="Remover atividade"

                                                    >

                                                        <i className="fas fa-trash" aria-hidden="true" />

                                                    </Button>

                                                </div>

                                            ))}

                                            <Button

                                                type="button"

                                                variant="primary"

                                                className="admin-dependent-add-btn mt-2"

                                                onClick={addSecondaryActivity}

                                            >

                                                <i className="fas fa-plus me-2" aria-hidden="true" />

                                                Adicionar Atividade

                                            </Button>

                                        </FormSection>

                                    </Tab>

                                </Tabs>

                            )}

                        </div>



                        <footer className="admin-funcionario-form-footer d-flex justify-content-end gap-2 flex-wrap">

                            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>

                                Cancelar

                            </Button>

                            <Button type="submit" variant="primary" disabled={saving || loading}>

                                {saving ? 'Salvando...' : 'Salvar'}

                            </Button>

                        </footer>

                    </Form>

                </section>

            </div>

        </AdminDateFieldProvider>

    );

}


