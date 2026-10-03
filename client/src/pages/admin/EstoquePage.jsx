import { Navigate } from 'react-router-dom';

export default function EstoquePage() {
    return <Navigate to="/produtos?tab=estoque" replace />;
}
