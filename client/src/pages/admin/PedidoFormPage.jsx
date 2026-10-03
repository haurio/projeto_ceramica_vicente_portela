import { useNavigate, useParams } from 'react-router-dom';
import PedidoModal from '../../components/admin/pedidos/PedidoModal';

export default function PedidoFormPage() {
    const navigate = useNavigate();
    const { pedidoId } = useParams();
    const parsedId = pedidoId && pedidoId !== 'novo' ? pedidoId : null;

    const handleClose = () => {
        navigate('/pedidos');
    };

    return (
        <PedidoModal
            pedidoId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
