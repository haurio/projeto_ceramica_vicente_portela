import { useNavigate, useParams } from 'react-router-dom';
import EmpresaModal from '../../components/admin/empresa/EmpresaModal';

export default function EmpresaFormPage() {
    const navigate = useNavigate();
    const { empresaId } = useParams();
    const parsedId = empresaId && empresaId !== 'novo' ? empresaId : null;

    const handleClose = () => {
        navigate('/empresa');
    };

    return (
        <EmpresaModal
            empresaId={parsedId}
            onClose={handleClose}
            onSaved={handleClose}
        />
    );
}
