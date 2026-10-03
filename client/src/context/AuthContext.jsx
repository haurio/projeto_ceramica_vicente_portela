import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [authenticated, setAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loginPasswordHint, setLoginPasswordHint] = useState('');

    const applySession = useCallback((session) => {
        setAuthenticated(Boolean(session.authenticated));
        setUser(session.user ?? null);
        return Boolean(session.authenticated);
    }, []);

    const clearLoginPasswordHint = useCallback(() => {
        setLoginPasswordHint('');
    }, []);

    const refreshSession = useCallback(async () => {
        try {
            const session = await authApi.checkSession();
            if (session.authenticated) {
                setAuthenticated(true);
                if (session.user) {
                    setUser(session.user);
                }
                if (!session.user?.must_change_password) {
                    setLoginPasswordHint('');
                }
                return true;
            }

            applySession({ authenticated: false, user: null });
            setLoginPasswordHint('');
            return false;
        } catch {
            return false;
        }
    }, [applySession]);

    useEffect(() => {
        refreshSession().finally(() => setLoading(false));
    }, [refreshSession]);

    const finishLogin = useCallback(async (data, password) => {
        if (!data?.user) {
            throw new Error('Login inválido. Tente novamente.');
        }

        applySession({ authenticated: true, user: data.user });
        if (data.user.must_change_password) {
            setLoginPasswordHint(String(password || ''));
        } else {
            setLoginPasswordHint('');
        }

        try {
            await refreshSession();
        } catch (_error) {
            // Cookie já foi gravado no POST de login; não desloga por falha transitória do check-session.
        }

        return data;
    }, [applySession, refreshSession]);

    const login = useCallback(async (username, password) => {
        const data = await authApi.login(username, password);
        return finishLogin(data, password);
    }, [finishLogin]);

    const loginMobile = useCallback(async (email, password) => {
        const data = await authApi.loginMobile(email, password);
        return finishLogin(data, password);
    }, [finishLogin]);

    const logout = useCallback(async () => {
        await authApi.logout();
        applySession({ authenticated: false, user: null });
        setLoginPasswordHint('');
    }, [applySession]);

    const value = useMemo(() => ({
        user,
        loading,
        isAuthenticated: authenticated,
        login,
        loginMobile,
        logout,
        refreshSession,
        loginPasswordHint,
        clearLoginPasswordHint,
    }), [
        user,
        loading,
        authenticated,
        login,
        loginMobile,
        logout,
        refreshSession,
        loginPasswordHint,
        clearLoginPasswordHint,
    ]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }

    return context;
}
