import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function MobileProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="auth-loading-screen">
                <div className="auth-loading-spinner" aria-hidden="true" />
                <p>Verificando acesso...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/mobile/login" replace />;
    }

    return children;
}
