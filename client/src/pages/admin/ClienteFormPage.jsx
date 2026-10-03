import { useNavigate, useParams } from 'react-router-dom';
import ClienteModal from '../../components/admin/clientes/ClienteModal';

export default function ClienteFormPage() {
    const navigate = useNavigate();
    const { clienteId } = useParams();
    const parsedId = clienteId && clienteId !== 'novo' ? clienteId : null;

    const handleClose = () => {
        navigate('/clientes');
    };

    return (
        <ClienteModal
            clienteId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
