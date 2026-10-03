import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { showRequiredFieldsToast, showToast } from '../../utils/toast';
import AuthFloatField from '../../components/auth/AuthFloatField';

export default function MobileLoginPage() {
    const { isAuthenticated, loading, loginMobile } = useAuth();
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSupport, setShowSupport] = useState(false);

    if (!loading && isAuthenticated) {
        return <Navigate to="/mobile" replace />;
    }

    if (loading) {
        return (
            <div className="auth-loading-screen">
                <div className="auth-loading-spinner" aria-hidden="true" />
                <p>Preparando acesso mobile...</p>
            </div>
        );
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedId = loginId.trim();
        const trimmedPassword = password.trim();

        if (!trimmedId || !trimmedPassword) {
            showRequiredFieldsToast();
            return;
        }

        setSubmitting(true);

        try {
            await loginMobile(trimmedId, trimmedPassword);
            showToast('success', 'Login realizado com sucesso.');
            navigate('/mobile', { replace: true });
        } catch (error) {
            const message = String(error?.message || '').trim()
                || 'E-mail ou senha inválidos.';
            showToast('error', message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="auth-page mobile-auth-page">
            <div className="auth-shell">
                <div className="auth-card">
                    <div className="auth-logo-wrap">
                        <img src="/image/Logotipos/Logo.png" alt="Cerâmica Vicente Portela" className="auth-logo" />
                    </div>
                    <h1 style={{ fontFamily: '"Playfair Display", serif', letterSpacing: '0.5px' }}>Portal do Representante</h1>
                    <p className="mobile-auth-sub">Acesse sua carteira de clientes e pré-vendas de forma rápida e segura.</p>

                    <form className="auth-form" onSubmit={handleSubmit} autoComplete="off" noValidate>
                        <AuthFloatField
                            id="mobile-login-id"
                            name="loginId"
                            label="E-mail ou Usuário"
                            icon="fa-user"
                            type="text"
                            value={loginId}
                            onChange={(event) => setLoginId(event.target.value)}
                            autoComplete="username"
                            required
                        />

                        <AuthFloatField
                            id="mobile-login-password"
                            name="password"
                            label="Senha"
                            icon="fa-lock"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                            showToggle
                            showPassword={showPassword}
                            onTogglePassword={() => setShowPassword((current) => !current)}
                        />

                        <button type="submit" className="auth-submit" disabled={submitting || loading}>
                            {submitting ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>

                    <div className="auth-meta auth-meta-inline">
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
                <div className="auth-support-balloon" role="dialog" aria-labelledby="mobile-support-title">
                    <button
                        type="button"
                        className="auth-support-close"
                        onClick={() => setShowSupport(false)}
                        aria-label="Fechar"
                    >
                        ×
                    </button>
                    <i className="fas fa-headset auth-support-icon" aria-hidden="true" />
                    <h3 id="mobile-support-title">Suporte Técnico</h3>
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

        </div>
    );
}
