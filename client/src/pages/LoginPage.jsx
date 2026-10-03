import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { showRequiredFieldsToast, showToast } from '../utils/toast';
import AuthFooter from '../components/auth/AuthFooter';
import AuthFloatField from '../components/auth/AuthFloatField';

export default function LoginPage() {
    const { isAuthenticated, loading, login, user } = useAuth();
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    const redirectTo = '/dashboard';

    if (!loading && isAuthenticated) {
        return <Navigate to={redirectTo} replace />;
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        if (!trimmedUsername || !trimmedPassword) {
            showRequiredFieldsToast();
            return;
        }

        setSubmitting(true);

        try {
            await login(trimmedUsername, trimmedPassword);
            showToast('success', 'Login realizado com sucesso.');
            navigate(redirectTo, { replace: true });
        } catch (error) {
            const message = String(error?.message || '').trim()
                || 'Usuário ou senha inválidos.';
            showToast('error', message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-shell">
                <div className="auth-card">
                    <div className="auth-logo-wrap">
                        <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" className="auth-logo" />
                    </div>
                    <h1>Sistema de Gestão</h1>

                    <form className="auth-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                        <AuthFloatField
                            id="login-username"
                            name="username"
                            label="Usuário"
                            icon="fa-user"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="off"
                            required
                        />

                        <AuthFloatField
                            id="login-password"
                            name="password"
                            label="Senha"
                            icon="fa-lock"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="off"
                            required
                            showToggle
                            showPassword={showPassword}
                            onTogglePassword={() => setShowPassword((current) => !current)}
                        />

                        <button type="submit" className="auth-submit" disabled={submitting || loading}>
                            {submitting ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="auth-meta auth-meta-inline auth-meta-center">
                        <button
                            type="button"
                            className="auth-link-button"
                            onClick={() => setShowSupport(true)}
                        >
                            Esqueceu a senha?
                        </button>
                    </div>
                </div>
            </div>

            {showSupport && (
                <button
                    type="button"
                    className="auth-support-backdrop"
                    aria-label="Fechar suporte"
                    onClick={() => setShowSupport(false)}
                />
            )}

            {showSupport && (
                <div className="auth-support-balloon" role="dialog" aria-labelledby="support-title">
                    <button
                        type="button"
                        className="auth-support-close"
                        onClick={() => setShowSupport(false)}
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                    <i className="fas fa-headset auth-support-icon" aria-hidden="true" />
                    <h3 id="support-title">Suporte Técnico</h3>
                    <p>
                        Para recuperar sua senha, entre em contato com o suporte via WhatsApp:{' '}
                        <a href="https://wa.me/+351910800056" target="_blank" rel="noreferrer">
                            +351 910 800 056
                        </a>
                    </p>
                    <button
                        type="button"
                        className="auth-support-btn"
                        onClick={() => setShowSupport(false)}
                    >
                        Fechar
                    </button>
                </div>
            )}

            <AuthFooter />
        </div>
    );
}
