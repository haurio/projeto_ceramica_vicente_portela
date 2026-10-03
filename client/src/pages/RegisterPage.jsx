import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import { showRequiredFieldsToast, showToast } from '../utils/toast';
import AuthFooter from '../components/auth/AuthFooter';
import AuthFloatField from '../components/auth/AuthFloatField';

const initialForm = {
    username: '',
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
};

export default function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const updateField = (field) => (event) => {
        setForm((current) => ({ ...current, [field]: event.target.value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.username.trim() || !form.full_name.trim() || !form.email.trim() || !form.password || !form.confirm_password) {
            showRequiredFieldsToast();
            return;
        }

        if (form.password !== form.confirm_password) {
            showToast('warning', 'As senhas não coincidem.', 'Aviso');
            return;
        }

        setSubmitting(true);

        try {
            await registerUser({
                username: form.username.trim(),
                full_name: form.full_name.trim(),
                email: form.email.trim(),
                password: form.password,
                status: 'Ativo',
            });

            showToast('success', 'Usuário criado com sucesso. Faça login para continuar.', 'Registro');
            navigate('/login');
        } catch (error) {
            showToast('error', error.message || 'Não foi possível registrar.', 'Erro');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-shell auth-shell-wide">
                <div className="auth-card">
                    <div className="auth-logo-wrap">
                        <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" className="auth-logo" />
                    </div>
                    <h1>Criar Acesso ao Sistema</h1>
                    <p className="auth-lead">Cadastre um usuário para acessar o painel administrativo.</p>

                    <form className="auth-form auth-form-register" onSubmit={handleSubmit} noValidate>
                        <AuthFloatField
                            id="register-username"
                            name="username"
                            label="Usuário"
                            icon="fa-user"
                            value={form.username}
                            onChange={updateField('username')}
                            required
                        />

                        <AuthFloatField
                            id="register-full-name"
                            name="full_name"
                            label="Nome completo"
                            icon="fa-id-card"
                            value={form.full_name}
                            onChange={updateField('full_name')}
                            required
                        />

                        <AuthFloatField
                            id="register-email"
                            name="email"
                            label="E-mail"
                            icon="fa-envelope"
                            type="email"
                            value={form.email}
                            onChange={updateField('email')}
                            required
                        />

                        <AuthFloatField
                            id="register-password"
                            name="password"
                            label="Senha"
                            icon="fa-lock"
                            value={form.password}
                            onChange={updateField('password')}
                            minLength={8}
                            required
                            showToggle
                            showPassword={showPassword}
                            onTogglePassword={() => setShowPassword((current) => !current)}
                        />

                        <AuthFloatField
                            id="register-confirm-password"
                            name="confirm_password"
                            label="Confirmar senha"
                            icon="fa-lock"
                            value={form.confirm_password}
                            onChange={updateField('confirm_password')}
                            minLength={8}
                            required
                            showToggle
                            showPassword={showConfirmPassword}
                            onTogglePassword={() => setShowConfirmPassword((current) => !current)}
                        />

                        <button type="submit" className="auth-submit" disabled={submitting}>
                            {submitting ? 'Registrando...' : 'Registrar'}
                        </button>
                    </form>

                    <div className="auth-meta">
                        <Link to="/login" className="auth-back-link">
                            <i className="fas fa-arrow-left" aria-hidden="true" />
                            Voltar ao login
                        </Link>
                    </div>
                </div>
            </div>

            <AuthFooter />
        </div>
    );
}
