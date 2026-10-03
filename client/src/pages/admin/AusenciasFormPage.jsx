import { useNavigate, useParams } from 'react-router-dom';
import AusenciaModal from '../../components/admin/ausencias/AusenciaModal';

export default function AusenciasFormPage() {
    const navigate = useNavigate();
    const { ausenciaId } = useParams();
    const parsedId = ausenciaId && ausenciaId !== 'novo' ? ausenciaId : null;

    const handleClose = () => {
        navigate('/ausencias');
    };

    return (
        <AusenciaModal
            ausenciaId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
