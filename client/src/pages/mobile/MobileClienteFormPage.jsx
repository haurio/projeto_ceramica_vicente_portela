import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createCliente, fetchCliente, updateCliente } from '../../api/clientes';
import { emitClienteUpdated } from '../../utils/syncChannel';
import MobileFloatField from '../../components/mobile/MobileFloatField';
import { useViaCep } from '../../hooks/useViaCep';
import {
    formatCep,
    formatCnpj,
    formatCpf,
    formatPhone,
    onlyDigits,
} from '../../utils/inputMasks';
import { showRequiredFieldsToast, showToast } from '../../utils/toast';
import { isCreditBlocked } from '../../utils/mobileStatus';

const EMPTY = {
    tipo_pessoa: 'Física',
    nome_razao_social: '',
    cpf_cnpj: '',
    telefone_principal: '',
    email_contato: '',
    cep: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    complemento: '',
    observacoes: '',
    status: 'Ativo',
};

function text(value) {
    return value == null ? '' : String(value);
}

export default function MobileClienteFormPage() {
    const { clienteId } = useParams();
    const isEdit = Boolean(clienteId);
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);

    const { handleCepBlur } = useViaCep({
        onAddressFound: (address) => {
            setForm((current) => ({
                ...current,
                cidade: address.city || '',
                estado: address.state || '',
                endereco: address.street || current.endereco,
                bairro: address.neighborhood || current.bairro,
            }));
        },
    });

    useEffect(() => {
        if (!isEdit) return undefined;
        let active = true;
        fetchCliente(clienteId)
            .then((data) => {
                if (!active) return;
                if (isCreditBlocked(data.status_credito)) {
                    showToast('warning', 'Crédito bloqueado. Não é possível abrir o cadastro nem criar pedido.');
                    navigate('/mobile/clientes', { replace: true });
                    return;
                }
                const tipo = data.tipo_pessoa || 'Física';
                setForm({
                    ...EMPTY,
                    tipo_pessoa: tipo,
                    nome_razao_social: text(data.nome_razao_social),
                    cpf_cnpj: tipo === 'Jurídica'
                        ? formatCnpj(data.cpf_cnpj || '')
                        : formatCpf(data.cpf_cnpj || ''),
                    telefone_principal: formatPhone(data.telefone_principal || ''),
                    email_contato: text(data.email_contato).trim().toLowerCase(),
                    cep: formatCep(data.cep || ''),
                    endereco: text(data.endereco),
                    numero: text(data.numero),
                    bairro: text(data.bairro),
                    cidade: text(data.cidade),
                    estado: text(data.estado),
                    complemento: text(data.complemento),
                    observacoes: text(data.observacoes),
                    status: data.status || 'Ativo',
                    data_cadastro: data.data_cadastro,
                    limite_credito: data.limite_credito,
                    status_credito: data.status_credito,
                    formas_pagamento_aceitas: data.formas_pagamento_aceitas,
                });
            })
            .catch((error) => {
                showToast('error', error.message || 'Erro ao carregar cliente.');
                navigate('/mobile/clientes', { replace: true });
            })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [clienteId, isEdit, navigate]);

    const setField = (name, value) => {
        setForm((current) => ({ ...current, [name]: value ?? '' }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!form.nome_razao_social.trim() || !form.cpf_cnpj.trim()) {
            showRequiredFieldsToast();
            return;
        }

        setSaving(true);
        const payload = {
            ...form,
            nome_razao_social: form.nome_razao_social.trim(),
            cpf_cnpj: onlyDigits(form.cpf_cnpj),
            telefone_principal: form.telefone_principal || null,
            email_contato: form.email_contato || null,
        };

        if (!isEdit) {
            payload.data_cadastro = new Date().toISOString().slice(0, 10);
            payload.limite_credito = 0;
            payload.status_credito = 'Em análise';
            payload.formas_pagamento_aceitas = 'Boleto,Cartão Crédito,PIX';
            payload.status = 'Ativo';
        }

        try {
            if (isEdit) {
                await updateCliente(clienteId, payload);
                emitClienteUpdated(clienteId, { status_credito: payload.status_credito });
                showToast('success', 'Cliente atualizado.');
            } else {
                const created = await createCliente(payload);
                emitClienteUpdated(created?.id, { status_credito: payload.status_credito });
                showToast('success', 'Cliente cadastrado.');
            }
            navigate('/mobile/clientes');
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar cliente.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <p className="mobile-empty">Carregando...</p>;
    }

    return (
        <div className="mobile-page is-form-page">
            <div className="mobile-page-scroll">
                <form className="mobile-form" onSubmit={handleSubmit}>
                    <MobileFloatField
                        label="Tipo"
                        name="tipo_pessoa"
                        as="select"
                        value={form.tipo_pessoa}
                        onChange={(e) => {
                            const tipo = e.target.value;
                            setForm((current) => ({
                                ...current,
                                tipo_pessoa: tipo,
                                cpf_cnpj: '',
                            }));
                        }}
                    >
                        <option value="Física">Pessoa Física</option>
                        <option value="Jurídica">Pessoa Jurídica</option>
                    </MobileFloatField>

                    <MobileFloatField
                        label={form.tipo_pessoa === 'Jurídica' ? 'Razão social' : 'Nome'}
                        name="nome_razao_social"
                        value={form.nome_razao_social}
                        onChange={(e) => setField('nome_razao_social', e.target.value)}
                        required
                    />

                    <MobileFloatField
                        label={form.tipo_pessoa === 'Jurídica' ? 'CNPJ' : 'CPF'}
                        name="cpf_cnpj"
                        value={form.cpf_cnpj}
                        onChange={(e) => setField(
                            'cpf_cnpj',
                            form.tipo_pessoa === 'Jurídica'
                                ? formatCnpj(e.target.value)
                                : formatCpf(e.target.value)
                        )}
                        inputMode="numeric"
                        required
                    />

                    <MobileFloatField
                        label="Telefone"
                        name="telefone_principal"
                        value={form.telefone_principal}
                        onChange={(e) => setField('telefone_principal', formatPhone(e.target.value))}
                        inputMode="tel"
                    />

                    <MobileFloatField
                        label="E-mail"
                        name="email_contato"
                        type="email"
                        value={form.email_contato}
                        onChange={(e) => setField('email_contato', e.target.value.toLowerCase())}
                    />

                    <MobileFloatField
                        label="CEP"
                        name="cep"
                        value={form.cep}
                        onChange={(e) => setField('cep', formatCep(e.target.value))}
                        onBlur={() => handleCepBlur(form.cep)}
                        inputMode="numeric"
                    />

                    <MobileFloatField
                        label="Endereço"
                        name="endereco"
                        value={form.endereco}
                        onChange={(e) => setField('endereco', e.target.value)}
                    />

                    <div className="mobile-form-row">
                        <MobileFloatField
                            label="Número"
                            name="numero"
                            value={form.numero}
                            onChange={(e) => setField('numero', e.target.value)}
                        />
                        <MobileFloatField
                            label="Bairro"
                            name="bairro"
                            value={form.bairro}
                            onChange={(e) => setField('bairro', e.target.value)}
                        />
                    </div>

                    <div className="mobile-form-row">
                        <MobileFloatField
                            label="Cidade"
                            name="cidade"
                            value={form.cidade}
                            readOnly
                            disabled
                        />
                        <MobileFloatField
                            label="UF"
                            name="estado"
                            value={form.estado}
                            readOnly
                            disabled
                        />
                    </div>

                    <MobileFloatField
                        label="Observações"
                        name="observacoes"
                        as="textarea"
                        rows={3}
                        value={form.observacoes}
                        onChange={(e) => setField('observacoes', e.target.value)}
                    />

                    <button type="submit" className="mobile-submit" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar cliente'}
                    </button>
                </form>
            </div>
        </div>
    );
}
