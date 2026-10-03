import { useEffect, useState } from 'react';
import { Button, Form, Modal } from 'react-bootstrap';
import { changeOwnPassword } from '../../api/config';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toast';
import AdminFloatField from './AdminFloatField';

function passwordRules(value) {
    const password = String(value || '');
    return {
        minLength: password.length >= 8,
        upper: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
    };
}

export default function ForcePasswordChangeModal() {
    const { user, loginPasswordHint, clearLoginPasswordHint, refreshSession } = useAuth();
    const mustChange = Boolean(user?.must_change_password);
    const [senhaAtual, setSenhaAtual] = useState('');
    const [senhaNova, setSenhaNova] = useState('');
    const [senhaConfirmacao, setSenhaConfirmacao] = useState('');
    const [showAtual, setShowAtual] = useState(false);
    const [showNova, setShowNova] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [invalid, setInvalid] = useState({});

    useEffect(() => {
        if (!mustChange) return;
        setSenhaAtual(loginPasswordHint || '');
        setSenhaNova('');
        setSenhaConfirmacao('');
        setInvalid({});
    }, [mustChange, loginPasswordHint, user?.id]);

    if (!mustChange) return null;

    const rules = passwordRules(senhaNova);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInvalid = {};
        if (!senhaAtual) nextInvalid.senha_atual = true;
        if (!rules.minLength || !rules.upper || !rules.number || !rules.special) {
            nextInvalid.senha_nova = true;
        }
        if (!senhaConfirmacao || senhaConfirmacao !== senhaNova) {
            nextInvalid.senha_confirmacao = true;
        }
        setInvalid(nextInvalid);
        if (Object.keys(nextInvalid).length) {
            showToast('warning', 'Revise os campos da nova senha.');
            return;
        }

        setSaving(true);
        try {
            await changeOwnPassword({
                senha_atual: senhaAtual,
                senha_nova: senhaNova,
                senha_confirmacao: senhaConfirmacao,
            });
            clearLoginPasswordHint?.();
            await refreshSession();
            showToast('success', 'Senha atualizada. Pode usar o sistema normalmente.');
        } catch (error) {
            showToast('error', error.message || 'Não foi possível alterar a senha.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            show
            centered
            backdrop="static"
            keyboard={false}
            className="admin-force-password-modal"
            contentClassName="admin-force-password-content"
        >
            <Modal.Header className="admin-force-password-header">
                <Modal.Title>
                    <i className="fas fa-key me-2" aria-hidden="true" />
                    Troca de senha obrigatória
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body className="admin-force-password-body">
                    <p className="admin-force-password-note">
                        Por segurança, defina uma nova senha antes de continuar.
                        A senha atual foi preenchida automaticamente com a que você usou no login.
                    </p>

                    <div className="admin-force-password-fields">
                        <AdminFloatField
                            label="Senha atual"
                            name="senha_atual"
                            type="password"
                            value={senhaAtual}
                            onChange={(event) => setSenhaAtual(event.target.value)}
                            required
                            isInvalid={Boolean(invalid.senha_atual)}
                            disabled={saving}
                            showPasswordToggle
                            showPassword={showAtual}
                            onTogglePassword={() => setShowAtual((current) => !current)}
                            autoComplete="current-password"
                        />
                        <AdminFloatField
                            label="Nova senha"
                            name="senha_nova"
                            type="password"
                            value={senhaNova}
                            onChange={(event) => setSenhaNova(event.target.value)}
                            required
                            isInvalid={Boolean(invalid.senha_nova)}
                            disabled={saving}
                            showPasswordToggle
                            showPassword={showNova}
                            onTogglePassword={() => setShowNova((current) => !current)}
                            autoComplete="new-password"
                        />
                        <AdminFloatField
                            label="Confirmar nova senha"
                            name="senha_confirmacao"
                            type="password"
                            value={senhaConfirmacao}
                            onChange={(event) => setSenhaConfirmacao(event.target.value)}
                            required
                            isInvalid={Boolean(invalid.senha_confirmacao)}
                            disabled={saving}
                            showPasswordToggle
                            showPassword={showConfirm}
                            onTogglePassword={() => setShowConfirm((current) => !current)}
                            autoComplete="new-password"
                        />
                    </div>

                    <ul className="admin-force-password-rules">
                        <li className={rules.minLength ? 'is-ok' : ''}>Mínimo de 8 caracteres</li>
                        <li className={rules.upper ? 'is-ok' : ''}>Pelo menos 1 letra maiúscula</li>
                        <li className={rules.number ? 'is-ok' : ''}>Pelo menos 1 número</li>
                        <li className={rules.special ? 'is-ok' : ''}>Pelo menos 1 caractere especial</li>
                    </ul>
                </Modal.Body>
                <Modal.Footer className="admin-force-password-footer">
                    <Button type="submit" variant="primary" disabled={saving}>
                        {saving ? 'Salvando...' : 'Salvar nova senha'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
