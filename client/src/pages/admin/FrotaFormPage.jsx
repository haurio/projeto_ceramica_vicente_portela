import { useNavigate, useParams } from 'react-router-dom';
import FrotaModal from '../../components/admin/frota/FrotaModal';

export default function FrotaFormPage() {
    const navigate = useNavigate();
    const { veiculoId } = useParams();
    const parsedId = veiculoId && veiculoId !== 'novo' ? veiculoId : null;

    const handleClose = () => {
        navigate('/frota');
    };

    return (
        <FrotaModal
            veiculoId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
