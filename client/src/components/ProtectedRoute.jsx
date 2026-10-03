import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading, user } = useAuth();

    if (loading) {
        return (
            <div className="auth-loading-screen">
                <div className="auth-loading-spinner" aria-hidden="true" />
                <p>Verificando acesso...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }



    return children;
}
