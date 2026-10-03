import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import {
    checkNfeSefazStatus,
    fetchNfeConfig,
    updateNfeConfig,
    uploadNfeCertificado,
    uploadNfeLogo,
} from '../../../api/nfe';
import { showToast } from '../../../utils/toast';
import AdminDateField, { AdminDateFieldProvider } from '../AdminDateField';
import AdminFloatField from '../AdminFloatField';
import AdminStatusToggle from '../AdminStatusToggle';
import FormSection from '../FormSection';

function formatCnpj(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) {
        return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function statusTone(status) {
    if (status === 'online') return 'online';
    if (status === 'offline' || status === 'indisponivel') return 'offline';
    if (status === 'config_incompleta') return 'warn';
    return 'idle';
}

function statusLabel(status) {
    if (status === 'online') return 'SEFAZ disponível';
    if (status === 'offline') return 'SEFAZ offline';
    if (status === 'indisponivel') return 'SEFAZ indisponível';
    if (status === 'config_incompleta') return 'Configuração incompleta';
    return 'Não verificado';
}

function statusHint(status) {
    if (status === 'online') return 'Homologação MG pronta para emissão.';
    if (status === 'offline' || status === 'indisponivel') return 'Sem conexão com a SEFAZ MG no momento.';
    if (status === 'config_incompleta') return 'Revise certificado, senha e validade.';
    return 'Clique em verificar para consultar a SEFAZ MG.';
}

export default function NfeConfigPanel() {
    const fileRef = useRef(null);
    const logoRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [checking, setChecking] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [logoDragOver, setLogoDragOver] = useState(false);
    const [showCertPassword, setShowCertPassword] = useState(false);
    const [showCscToken, setShowCscToken] = useState(false);
    const [config, setConfig] = useState(null);
    const [certFile, setCertFile] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [form, setForm] = useState({
        ambiente: 'homologacao',
        serie: 1,
        proximo_numero: 1,
        csc_id: '',
        csc_token: '',
        certificado_senha: '',
        certificado_validade: '',
        certificado_cnpj: '',
        certificado_titular: '',
        observacoes_texto: '',
        ativo: true,
    });

    const applyConfig = useCallback((data) => {
        setConfig(data);
        setForm({
            ambiente: data.ambiente || 'homologacao',
            serie: data.serie || 1,
            proximo_numero: data.proximo_numero || 1,
            csc_id: data.csc_id || '',
            csc_token: data.has_csc_token ? '********' : '',
            certificado_senha: data.has_certificado_senha ? '********' : '',
            certificado_validade: data.certificado_validade || '',
            certificado_cnpj: formatCnpj(data.certificado_cnpj || ''),
            certificado_titular: data.certificado_titular || '',
            observacoes_texto: data.observacoes_texto || '',
            ativo: data.ativo !== false,
        });
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchNfeConfig();
            applyConfig(data);
        } catch (error) {
            showToast('error', error.message || 'Erro ao carregar NF-e.');
        } finally {
            setLoading(false);
        }
    }, [applyConfig]);

    useEffect(() => {
        load();
    }, [load]);

    const pickCertFile = (file) => {
        if (!file) return;
        const name = String(file.name || '').toLowerCase();
        if (!name.endsWith('.pfx') && !name.endsWith('.p12')) {
            showToast('error', 'Selecione um certificado .pfx ou .p12.');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            showToast('error', 'O certificado deve ter no máximo 8 MB.');
            return;
        }
        setCertFile(file);
    };

    const pickLogoFile = (file) => {
        if (!file) return;
        if (!String(file.type || '').startsWith('image/')) {
            showToast('error', 'Selecione uma imagem (PNG, JPG ou WEBP).');
            return;
        }
        if (file.size > 3 * 1024 * 1024) {
            showToast('error', 'A logo deve ter no máximo 3 MB.');
            return;
        }
        setLogoFile(file);
    };

    const handleUploadLogo = async (fileOverride = null) => {
        const file = fileOverride || logoFile;
        if (!file) {
            showToast('error', 'Selecione a imagem da logo.');
            return null;
        }
        if (!String(file.type || '').startsWith('image/')) {
            showToast('error', 'Selecione uma imagem (PNG, JPG ou WEBP).');
            return null;
        }
        if (file.size > 3 * 1024 * 1024) {
            showToast('error', 'A logo deve ter no máximo 3 MB.');
            return null;
        }
        setUploadingLogo(true);
        try {
            const body = new FormData();
            body.append('logo', file, file.name || 'logo-nfe.png');
            const data = await uploadNfeLogo(body);
            applyConfig(data);
            setLogoFile(null);
            if (logoRef.current) logoRef.current.value = '';
            showToast('success', 'Logo salva para a NF-e.');
            return data;
        } catch (error) {
            showToast('error', error.message || 'Erro ao enviar logo.');
            return null;
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleSave = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            if (logoFile) {
                const logoOk = await handleUploadLogo(logoFile);
                if (!logoOk) {
                    setSaving(false);
                    return;
                }
            }
            const data = await updateNfeConfig({
                ...form,
                certificado_cnpj: String(form.certificado_cnpj || '').replace(/\D/g, ''),
            });
            applyConfig(data);
            showToast('success', 'Configuração NF-e salva.');
        } catch (error) {
            showToast('error', error.message || 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    const handleUploadCert = async () => {
        if (!certFile) {
            showToast('error', 'Selecione o arquivo do certificado A1.');
            return;
        }
        const senha = form.certificado_senha && form.certificado_senha !== '********'
            ? form.certificado_senha
            : '';
        if (!senha) {
            showToast('error', 'Digite a senha do certificado para ler os dados automaticamente.');
            return;
        }
        setUploading(true);
        try {
            const body = new FormData();
            body.append('certificado', certFile);
            body.append('certificado_senha', senha);

            const data = await uploadNfeCertificado(body);
            applyConfig(data);
            setCertFile(null);
            if (fileRef.current) fileRef.current.value = '';
            showToast('success', 'Certificado enviado. Dados lidos automaticamente.');
        } catch (error) {
            showToast('error', error.message || 'Erro ao enviar certificado.');
        } finally {
            setUploading(false);
        }
    };

    const handleCheckSefaz = async () => {
        setChecking(true);
        try {
            const data = await checkNfeSefazStatus();
            applyConfig(data);
            const tone = statusTone(data.sefaz_status);
            showToast(
                tone === 'online' ? 'success' : (tone === 'warn' ? 'error' : 'error'),
                statusLabel(data.sefaz_status)
            );
        } catch (error) {
            showToast('error', error.message || 'Erro ao consultar SEFAZ.');
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return <p className="text-muted mb-0">Carregando configuração NF-e...</p>;
    }

    const tone = statusTone(config?.sefaz_status);

    return (
        <AdminDateFieldProvider>
            <Form className="admin-funcionario-form admin-config-formas" onSubmit={handleSave}>
                <div className={`admin-nfe-status-card is-${tone}`}>
                    <div className="admin-nfe-status-main">
                        <span className={`admin-nfe-status-dot is-${tone}`} aria-hidden="true" />
                        <div>
                            <strong>{statusLabel(config?.sefaz_status)}</strong>
                            <p>{statusHint(config?.sefaz_status)}</p>
                            {config?.sefaz_verificado_em ? (
                                <small>
                                    Última verificação:
                                    {' '}
                                    {new Date(config.sefaz_verificado_em).toLocaleString('pt-BR')}
                                </small>
                            ) : null}
                        </div>
                    </div>
                    <Button
                        type="button"
                        className="admin-config-btn is-primary"
                        disabled={checking || saving || uploading}
                        onClick={handleCheckSefaz}
                    >
                        {checking ? 'Verificando...' : 'Verificar SEFAZ MG'}
                    </Button>
                </div>

                <FormSection title="Ambiente fiscal (Minas Gerais)">
                    <p className="admin-config-section-hint">
                        Emissão configurada para a SEFAZ de Minas Gerais (UF MG).
                    </p>
                    <div className="admin-nfe-grid">
                        <AdminFloatField
                            as="select"
                            label="Ambiente"
                            name="ambiente"
                            value={form.ambiente}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                ambiente: event.target.value,
                            }))}
                            disabled={saving}
                        >
                            <option value="homologacao">Homologação</option>
                            <option value="producao">Produção</option>
                        </AdminFloatField>
                        <AdminFloatField label="UF" name="uf" value="MG" disabled />
                        <AdminFloatField
                            label="Série"
                            name="serie"
                            type="number"
                            min="1"
                            value={form.serie}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                serie: event.target.value,
                            }))}
                            disabled={saving}
                        />
                        <AdminFloatField
                            label="Próximo número"
                            name="proximo_numero"
                            type="number"
                            min="1"
                            value={form.proximo_numero}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                proximo_numero: event.target.value,
                            }))}
                            disabled={saving}
                        />
                        <AdminStatusToggle
                            label="Emissão ativa"
                            name="ativo"
                            checked={form.ativo}
                            onLabel="Ativa"
                            offLabel="Pausada"
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                ativo: Boolean(event.target.checked),
                            }))}
                            disabled={saving}
                        />
                    </div>
                </FormSection>

                <FormSection title="Logo e certificado A1">
                    <p className="admin-config-section-hint">
                        Anexe a logo do DANFE e o certificado .pfx/.p12 na mesma linha. Validade, CNPJ e titular são lidos do certificado.
                    </p>

                    <div className="admin-nfe-attach-row">
                        <div className="admin-nfe-attach-col">
                            <div className="admin-nfe-attach-label">Logo da NF-e</div>
                            <div
                                className={`admin-nfe-cert-drop admin-nfe-logo-drop${logoDragOver ? ' is-dragover' : ''}${logoFile || config?.has_logo ? ' has-file' : ''}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (!uploadingLogo && !saving) setLogoDragOver(true);
                                }}
                                onDragLeave={() => setLogoDragOver(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setLogoDragOver(false);
                                    if (uploadingLogo || saving) return;
                                    const file = event.dataTransfer.files?.[0];
                                    if (!file) return;
                                    pickLogoFile(file);
                                    handleUploadLogo(file);
                                }}
                                onClick={() => {
                                    if (!uploadingLogo && !saving) logoRef.current?.click();
                                }}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        if (!uploadingLogo && !saving) logoRef.current?.click();
                                    }
                                }}
                            >
                                <input
                                    ref={logoRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                                    className="admin-nfe-cert-input"
                                    disabled={uploadingLogo || saving}
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (!file) return;
                                        pickLogoFile(file);
                                        handleUploadLogo(file);
                                    }}
                                />
                                <div className="admin-nfe-logo-preview" aria-hidden="true">
                                    {logoFile || config?.has_logo || config?.logo_data_url ? (
                                        <img
                                            src={
                                                logoFile
                                                    ? URL.createObjectURL(logoFile)
                                                    : (config.logo_data_url || config.logo_url)
                                            }
                                            alt=""
                                        />
                                    ) : (
                                        <i className="fas fa-image" />
                                    )}
                                </div>
                                <div className="admin-nfe-cert-copy">
                                    <strong>
                                        {logoFile
                                            ? logoFile.name
                                            : (config?.logo_nome || 'Selecionar logo')}
                                    </strong>
                                    <span>
                                        {uploadingLogo
                                            ? 'Enviando...'
                                            : logoFile
                                                ? 'Pronto para enviar'
                                                : config?.has_logo
                                                    ? 'Logo salva no DANFE'
                                                    : 'PNG, JPG ou WEBP — salva ao selecionar'}
                                    </span>
                                </div>
                            </div>
                            <div className="admin-nfe-actions">
                                <Button
                                    type="button"
                                    className="admin-config-btn is-primary"
                                    disabled={uploadingLogo || saving || !logoFile}
                                    onClick={handleUploadLogo}
                                >
                                    {uploadingLogo ? 'Enviando...' : 'Salvar logo'}
                                </Button>
                            </div>
                        </div>

                        <div className="admin-nfe-attach-col">
                            <div className="admin-nfe-attach-label">Certificado digital A1</div>
                            <div
                                className={`admin-nfe-cert-drop${dragOver ? ' is-dragover' : ''}${certFile || config?.has_certificado ? ' has-file' : ''}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    if (!uploading && !saving) setDragOver(true);
                                }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setDragOver(false);
                                    if (uploading || saving) return;
                                    pickCertFile(event.dataTransfer.files?.[0]);
                                }}
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
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pfx,.p12,application/x-pkcs12"
                                    className="admin-nfe-cert-input"
                                    disabled={uploading || saving}
                                    onChange={(event) => pickCertFile(event.target.files?.[0])}
                                />
                                <div className="admin-nfe-cert-icon" aria-hidden="true">
                                    <i className={`fas ${certFile || config?.has_certificado ? 'fa-certificate' : 'fa-cloud-upload-alt'}`} />
                                </div>
                                <div className="admin-nfe-cert-copy">
                                    <strong>
                                        {certFile
                                            ? certFile.name
                                            : (config?.certificado_nome || 'Selecionar certificado')}
                                    </strong>
                                    <span>
                                        {certFile
                                            ? 'Pronto para enviar'
                                            : 'Arquivo .pfx ou .p12'}
                                    </span>
                                </div>
                            </div>
                            <div className="admin-nfe-actions">
                                <Button
                                    type="button"
                                    className="admin-config-btn is-primary"
                                    disabled={uploading || saving || !certFile}
                                    onClick={handleUploadCert}
                                >
                                    {uploading ? 'Enviando...' : 'Enviar certificado'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="admin-nfe-grid">
                        <AdminFloatField
                            label="Senha do certificado"
                            name="certificado_senha"
                            value={form.certificado_senha}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                certificado_senha: event.target.value,
                            }))}
                            disabled={saving || uploading}
                            showPasswordToggle
                            showPassword={showCertPassword}
                            onTogglePassword={() => setShowCertPassword((current) => !current)}
                            autoComplete="new-password"
                        />
                        <AdminDateField
                            label="Validade (automático)"
                            name="certificado_validade"
                            value={form.certificado_validade}
                            onChange={() => {}}
                            disabled
                        />
                        <AdminFloatField
                            label="CNPJ do certificado (automático)"
                            name="certificado_cnpj"
                            value={form.certificado_cnpj}
                            onChange={() => {}}
                            disabled
                            placeholder="Lido do .pfx"
                        />
                        <AdminFloatField
                            label="Titular (automático)"
                            name="certificado_titular"
                            value={form.certificado_titular}
                            onChange={() => {}}
                            disabled
                            placeholder="Lido do .pfx"
                        />
                    </div>
                </FormSection>

                <FormSection title="Observações da NF-e">
                    <p className="admin-config-section-hint">
                        Texto das informações complementares (infCpl). Pedido, frete e local são preenchidos em cada nota com
                        {' '}
                        <code>{'{{pedido}}'}</code>
                        ,
                        {' '}
                        <code>{'{{frete}}'}</code>
                        {' '}
                        e
                        {' '}
                        <code>{'{{local_entrega}}'}</code>
                        .
                    </p>
                    <AdminFloatField
                        as="textarea"
                        label="Informações complementares"
                        name="observacoes_texto"
                        value={form.observacoes_texto}
                        onChange={(event) => setForm((current) => ({
                            ...current,
                            observacoes_texto: event.target.value,
                        }))}
                        disabled={saving}
                        rows={8}
                    />
                </FormSection>

                <FormSection title="CSC (opcional / NFC-e)">
                    <div className="admin-nfe-grid is-two">
                        <AdminFloatField
                            label="CSC ID"
                            name="csc_id"
                            value={form.csc_id}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                csc_id: event.target.value,
                            }))}
                            disabled={saving}
                        />
                        <AdminFloatField
                            label="CSC Token"
                            name="csc_token"
                            value={form.csc_token}
                            onChange={(event) => setForm((current) => ({
                                ...current,
                                csc_token: event.target.value,
                            }))}
                            disabled={saving}
                            showPasswordToggle
                            showPassword={showCscToken}
                            onTogglePassword={() => setShowCscToken((current) => !current)}
                            autoComplete="new-password"
                        />
                    </div>
                </FormSection>

                <div className="admin-config-forma-actions">
                    <Button type="submit" className="admin-config-btn is-primary" disabled={saving || uploading}>
                        {saving ? 'Salvando...' : 'Salvar configuração'}
                    </Button>
                </div>
            </Form>
        </AdminDateFieldProvider>
    );
}
